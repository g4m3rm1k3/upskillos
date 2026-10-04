---
title: 4.2 — The Workbench: Watching an Agent Act
track: Reinforcement Learning in pygame
runtime: python
run: workbench.py
---

In lesson 4.1 you were the agent. From now on, programs are. To understand what a learning agent is doing, you need to *watch* it: slowly enough to follow a single decision, quickly enough to see thousands of episodes go by, and paused, one step at a time, when something surprising happens. This lesson builds that viewer, the **workbench**, which every later chapter uses.

Two ideas from game engines make it work, and both carry over to any interactive program:

- **Separate input, simulation and drawing.** The workbench handles key presses, advances the world, and draws a picture, in three separate methods. Each can then change without disturbing the others. You can speed up the simulation without changing how it's drawn, or draw more without changing the rules.
- **Run the simulation at its own rate.** The screen redraws 60 times a second whatever happens. The world advances 1, 4, 15, 60 or 240 steps a second, whichever you choose. So the simulation's speed is a setting, not an accident of how fast the computer draws.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_viewer.py** above.

```python file=tests/test_viewer.py provided
# Tests for agents.py and workbench.py (lesson 4.2). Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_viewer.py
import numpy as np
import pygame

from grid import MAPS, GridWorld


def test_agents_random_acts_uniformly():
    from agents import RandomAgent
    agent = RandomAgent(4, np.random.default_rng(0))
    actions = [agent.act(0) for _ in range(8000)]
    assert all(type(a) is int for a in actions[:10])
    assert np.allclose(np.bincount(actions, minlength=4) / 8000, 0.25, atol=0.03)


def test_agents_fixed_policy_follows_its_table():
    from agents import FixedPolicy
    agent = FixedPolicy([3, 1, 1, 0])
    assert [agent.act(s) for s in range(4)] == [3, 1, 1, 0]
    assert type(agent.act(0)) is int


def test_agents_learn_accepts_a_transition_and_does_nothing():
    from agents import FixedPolicy, RandomAgent
    for agent in (RandomAgent(4, np.random.default_rng(0)), FixedPolicy([0])):
        assert agent.learn(0, 1, 0.0, 1, False, False) is None


class Recorder:
    """An agent that always moves right and remembers every transition it was shown."""

    def __init__(self):
        self.seen = []

    def act(self, state):
        return 3

    def learn(self, *transition):
        self.seen.append(transition)


def test_bench_step_once_runs_one_step_and_reports_it_to_the_agent():
    from workbench import Workbench
    agent = Recorder()
    bench = Workbench(GridWorld(["S.G"]), agent)
    bench.step_once()
    assert agent.seen == [(0, 3, 0.0, 1, False, False)]
    assert bench.state == 1 and bench.total == 0.0


def test_bench_finished_episode_is_recorded_then_restarted():
    from workbench import Workbench
    bench = Workbench(GridWorld(["S.G"]), Recorder())
    bench.step_once()
    bench.step_once()
    assert bench.returns == [1.0] and bench.over and bench.message == "reached the goal"
    bench.step_once()
    assert bench.state == 1 and not bench.over, "the next step begins a new episode from S"
    assert bench.env.steps == 1


def test_bench_paused_update_does_nothing_but_right_arrow_steps():
    from workbench import Workbench
    bench = Workbench(GridWorld(["S...G"]), Recorder())
    bench.handle(pygame.event.Event(pygame.KEYDOWN, key=pygame.K_SPACE))
    assert bench.paused
    bench.update(5000)
    assert bench.env.steps == 0
    bench.handle(pygame.event.Event(pygame.KEYDOWN, key=pygame.K_RIGHT))
    assert bench.env.steps == 1


def test_bench_update_runs_steps_at_the_chosen_speed():
    from workbench import SPEEDS, Workbench
    bench = Workbench(GridWorld(["S" + "." * 60 + "G"], max_steps=1000), Recorder())
    bench.set_speed(2)
    bench.update(1000)
    assert bench.env.steps == SPEEDS[2], "one second of frames runs SPEEDS[2] steps"
    bench.update(1000)
    assert bench.env.steps == 2 * SPEEDS[2], "the next second runs the same number again, not more"


def test_bench_speed_stays_in_range():
    from workbench import SPEEDS, Workbench
    bench = Workbench(GridWorld(["S.G"]), Recorder())
    bench.set_speed(99)
    assert bench.speed == len(SPEEDS) - 1
    bench.set_speed(-5)
    assert bench.speed == 0


def test_bench_draws_arrows_for_an_agent_with_a_q_table():
    from world_view import CELL, cell_rect, window_size
    from workbench import ARROW, Workbench

    class Knows:
        def __init__(self, n):
            self.Q = np.zeros((n, 4))
            self.Q[:, 3] = 1.0        # right is best everywhere

        def act(self, state):
            return 3

        def learn(self, *transition):
            pass

    env = GridWorld(["S..G"])
    bench = Workbench(env, Knows(env.n_states))
    pygame.font.init()
    screen = pygame.Surface(window_size(env))
    bench.draw(screen, pygame.font.Font(None, 24))
    centre = cell_rect((0, 1)).center
    assert screen.get_at((centre[0] + CELL // 4, centre[1]))[:3] == ARROW


def test_bench_window_opens_and_closes():
    from agents import RandomAgent
    from workbench import Workbench
    env = GridWorld(MAPS["walls"])
    assert Workbench(env, RandomAgent(4, np.random.default_rng(0))).run(max_frames=3) == 3
```

`Recorder` is a fake agent, like `ArmZero` in lesson 3.2. It always moves right and stores every transition the workbench reports to it. `test_bench_step_once_runs_one_step_and_reports_it_to_the_agent` then checks the exact report: `(0, 3, 0.0, 1, False, False)` means state 0, action 3, reward 0, next state 1, not terminated, not truncated. `*transition` in its `learn` collects all the arguments into one tuple, whatever their number.

`pygame.event.Event(pygame.KEYDOWN, key=pygame.K_SPACE)` builds a key-press event by hand, so a test can "press" keys without a keyboard.

```check
file tests/test_viewer.py -- Click "Create provided tests/test_viewer.py" above.
```

## Agents: an agreement

Every agent in this series, from the random one here to Q-learning in Chapter 7, will have the same two methods:

```text
act(state)                                                        → the action to take
learn(state, action, reward, next_state, terminated, truncated)   → update what it knows, if anything
```

That's the agreement, or **interface**, between agents and anything that runs them. The workbench only ever calls these two methods, so it can run any agent, including ones you haven't written yet. Python doesn't need the agents to share a parent class, just the method names (duck typing, lesson 2.1).

Create `agents.py`:

```python file=agents.py
import numpy as np


class RandomAgent:
    def __init__(self, n_actions, rng):
        self.n_actions = n_actions
        self.rng = rng

    def act(self, state):
        return int(self.rng.integers(self.n_actions))

    def learn(self, state, action, reward, next_state, terminated, truncated):
        pass


class FixedPolicy:
    def __init__(self, policy):
        self.policy = np.asarray(policy)

    def act(self, state):
        return int(self.policy[state])

    def learn(self, state, action, reward, next_state, terminated, truncated):
        pass
```

- `RandomAgent` picks uniformly among all actions. It's the **baseline**: any agent worth having must beat it. Its `learn` does nothing, but it exists, so the workbench can call `learn` on every agent without checking which kind it has.
- `FixedPolicy` follows a table: `policy[state]` is the action for that state. A table from states to actions is called a **policy**, and it's the thing reinforcement learning ultimately produces. `np.asarray(policy)` accepts a list or an array.
- `learn` takes exactly the six values a step produces. That's everything a learner could need: what it saw, what it did, what it got, where it landed, and how the episode ended.

```check
run ".venv/Scripts/python -m pytest -q tests/test_viewer.py -k agents" label="RandomAgent and FixedPolicy keep the agreement" -- act returns a plain int; learn takes state, action, reward, next_state, terminated, truncated and does nothing.
```

## The workbench

```python file=workbench.py
import sys

import numpy as np
import pygame

from agents import RandomAgent
from grid import ENDS, MAPS, GridWorld
from qtable import ACTIONS, advantages
from world_view import BACKGROUND, CELL, cell_rect, draw_panel, draw_world, ending, window_size

SPEEDS = [1, 4, 15, 60, 240]       # environment steps per second
ARROW = (241, 245, 249)


class Workbench:
    def __init__(self, env, agent, seed=0):
        self.env = env
        self.agent = agent
        self.speed = 1
        self.owed = 0.0
        self.paused = False
        self.returns = []
        self.state, _ = env.reset(seed=seed)
        self.total = 0.0
        self.over = False
        self.message = None

    def step_once(self):
        if self.over:
            self.state, _ = self.env.reset()
            self.total = 0.0
            self.over = False
            self.message = None
        action = self.agent.act(self.state)
        next_state, reward, terminated, truncated, _ = self.env.step(action)
        self.agent.learn(self.state, action, reward, next_state, terminated, truncated)
        self.state = next_state
        self.total += reward
        if terminated or truncated:
            self.returns.append(self.total)
            self.over = True
            self.message = ending(self.env.tile(self.env.cell), truncated)

    def set_speed(self, index):
        self.speed = min(max(index, 0), len(SPEEDS) - 1)

    def handle(self, event):
        if event.type != pygame.KEYDOWN:
            return
        if event.key == pygame.K_SPACE:
            self.paused = not self.paused
        elif event.key == pygame.K_RIGHT and self.paused:
            self.step_once()
        elif event.key == pygame.K_UP:
            self.set_speed(self.speed + 1)
        elif event.key == pygame.K_DOWN:
            self.set_speed(self.speed - 1)

    def update(self, dt):
        if self.paused:
            return
        self.owed += dt * SPEEDS[self.speed] / 1000
        steps = int(self.owed)
        self.owed -= steps
        for _ in range(steps):
            self.step_once()

    def draw_arrows(self, screen):
        Q = getattr(self.agent, "Q", None)
        if Q is None:
            return
        best = advantages(Q) == 0
        for state in range(self.env.n_states):
            cell = self.env.cell_of(state)
            if self.env.tile(cell) in ENDS + "#" or best[state].all():
                continue
            centre = cell_rect(cell).center
            for action in np.flatnonzero(best[state]):
                d_row, d_col = ACTIONS[action]
                tip = (centre[0] + d_col * CELL // 3, centre[1] + d_row * CELL // 3)
                pygame.draw.line(screen, ARROW, centre, tip, 2)

    def draw(self, screen, font):
        screen.fill(BACKGROUND)
        draw_world(screen, self.env)
        self.draw_arrows(screen)
        recent = self.returns[-100:]
        lines = [f"episode {len(self.returns) + 1}", f"step {self.env.steps}", f"return so far {self.total:+.2f}",
                 f"average of last {len(recent)}: {np.mean(recent):+.3f}" if recent else "no finished episodes",
                 self.message or "", "",
                 f"speed {SPEEDS[self.speed]} steps/s" + ("  (paused)" if self.paused else ""),
                 "space pause   right arrow step", "up / down speed"]
        draw_panel(screen, font, self.env, lines)

    def run(self, title="Workbench", max_frames=None):
        pygame.init()
        screen = pygame.display.set_mode(window_size(self.env))
        pygame.display.set_caption(title)
        font = pygame.font.Font(None, 24)
        clock = pygame.time.Clock()
        frames = 0
        running = True
        while running:
            dt = clock.tick(60)
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                else:
                    self.handle(event)
            self.update(dt)
            self.draw(screen, font)
            pygame.display.flip()
            frames += 1
            if max_frames is not None and frames >= max_frames:
                running = False
        pygame.quit()
        return frames


if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "walls"
    env = GridWorld(MAPS[name], max_steps=100)
    Workbench(env, RandomAgent(env.n_actions, np.random.default_rng(0))).run(f"Random agent on {name}")
```

**The three parts:**

- **`handle(event)`** is input. Space pauses, the right arrow steps once while paused, and up and down change the speed. `set_speed` clamps the index into `SPEEDS`, the same `min(max(…))` clamp as `move` in lesson 0.3.
- **`update(dt)`** is simulation. It runs however many environment steps are due.
- **`draw(screen, font)`** is drawing. It paints the current state and changes nothing.

`run` is the frame loop, and only calls them in order: events → `update` → `draw` → `flip`.

**How `update` keeps a fixed simulation rate.** At 15 steps a second, a 16.7 ms frame owes 16.7 × 15 / 1000 = 0.25 of a step. `self.owed` accumulates these fractions. Each frame it runs the whole steps that are owed (`int(self.owed)`) and keeps the rest:

```text
frame 1:  owed 0.25 → run 0, keep 0.25
frame 2:  owed 0.50 → run 0, keep 0.50
frame 3:  owed 0.75 → run 0, keep 0.75
frame 4:  owed 1.00 → run 1, keep 0.00
```

So at 15 steps a second the world moves on one frame in four, and at 240 steps a second it takes 4 steps every frame. It's the slot-room `Timer` from lesson 3.1, counted in steps instead of intervals. Counting this way has one advantage: an interval of 1000 / 15 ms is the endless decimal 66.666…, and adding 15 of them as floats gives 1000.0000000000001, just over a second, which would lose a step. Multiplying by the speed first gives exactly 15.0.

**`step_once`** is one turn of the agent–environment loop, in this order:

1. If the last episode is over, reset the environment and start a new one. Episodes run back to back without anyone pressing a key.
2. Ask the agent for an action: `act(state)`.
3. Step the environment.
4. Tell the agent what happened: `learn(...)`. This happens **before** `self.state` moves on, so the agent is told the state it actually acted in.
5. Add the reward to the episode's total, and if the episode ended, record its total (its **return**) and the reason it ended.

**Arrows for agents that keep a Q-table.** `getattr(self.agent, "Q", None)` reads the agent's `Q` attribute if it has one, and gives `None` if it doesn't, so the random agent simply gets no arrows. For an agent with a table, the arrows are lesson 1.2's: every action whose advantage is 0. They're skipped on walls and ending tiles, where no decision is made (`ENDS + "#"` joins the two strings into `"GH#"`, the tiles to skip). They're also skipped where all four actions tie (`best[state].all()`): an untrained agent's table is all zeros, and four arrows in every cell would say nothing.

Run it: a random agent on the `walls` map, 4 steps a second. Watch a few episodes, pause with Space, and step with the right arrow.

```predict
question: The random agent has 100 steps per episode. On the `walls` map, roughly what share of its episodes reach the goal?
choice: about 3 in 5
choice: about 1 in 5
choice: about 1 in 100
answer: about 1 in 5
explain: Over 2000 episodes: about 20% reach the goal, about 50% fall in the hole, and about 30% run out of time. Wandering at random, it's more likely to stumble into the hole, which is in the middle of the map, than to reach the goal in the far corner. On the `open` map, with no hole, about 61% reach the goal within 100 steps.
verify: script random_walls.py
```

```predict
question: Now the `lake` map, 4 × 4 with four holes: `.venv\Scripts\python workbench.py lake`. What share of random episodes reach the goal?
choice: about 1 in 5
choice: about 1 in 20
choice: about 1 in 100
answer: about 1 in 100
explain: About 1.2%. The holes sit right beside the paths, and the average random episode falls in after only 7.6 steps. This is why an agent can't learn on the lake by waiting for luck: it almost never sees the goal's reward. Chapter 5 computes the answer from the rules instead, and Chapters 6–7 learn from the rare successes.
verify: script random_lake.py
```

Try the speeds. At 240 steps a second, episodes flash by and the "average of last 100" settles. That number is the random agent's **baseline** score: about −0.3 on `walls`, where most endings are holes. Every agent from here on is measured against it.

```check
run ".venv/Scripts/python -m pytest -q tests/test_viewer.py -k bench" label="the Workbench steps, pauses, keeps its speed and draws" -- update: add dt * SPEEDS[speed] / 1000 to owed, run int(owed) steps, and subtract what you ran.
```
