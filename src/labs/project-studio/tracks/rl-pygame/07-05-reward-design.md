---
title: 7.5 — Reward Design: Getting What You Asked For
track: Reinforcement Learning in pygame
runtime: python
run: reward_lab.py
---

A reinforcement learning agent doesn't know what you *want*. It knows only the reward you wrote down, and it will maximise exactly that, by any means the world allows. When the reward and the intention differ, a good learner finds the difference and exploits it. This is called **reward hacking**, or **specification gaming**, and it's one of the most common ways reinforcement learning goes wrong in practice. A boat-racing agent once learned to circle forever collecting bonus items instead of finishing the race.

This lesson builds two hacks on purpose, so you can see them happen, and then a correct way to add guidance to a reward: **potential-based shaping**, which provably speeds learning without changing what the best behaviour is. The section on choosing a potential shows that "provably" covers less than you might hope.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_rewards.py** above.

```python file=tests/test_rewards.py provided
# Tests for the coin tile, shaping.py, shaping_race.py and reward_lab.py (lesson 7.5).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_rewards.py
import numpy as np
import pygame
from pytest import approx

from grid import GridWorld

GAMMA = 0.9


def test_coin_tiles_are_drawn_in_their_colour():
    import world_view
    env = GridWorld(["S.c", "..G"])
    env.reset()
    screen = pygame.Surface(world_view.window_size(env))
    world_view.draw_world(screen, env)
    rect = world_view.cell_rect((0, 2))
    assert screen.get_at((rect.x + 5, rect.y + 5))[:3] == world_view.TILES["c"]


def test_coin_farming_is_optimal_under_this_reward():
    from mdp import tables
    from planning import value_iteration
    env = GridWorld(["S.c...", "......", ".....G"], rewards={"G": 1.0, "c": 0.3}, max_steps=60)
    V, _ = value_iteration(*tables(env), GAMMA)
    assert V[env.state_of((0, 2))] > 1.0, "stepping on and off the coin is worth more than the goal's 1"


def test_shaped_passes_everything_else_through():
    from shaping import MAZE, Shaped
    base = GridWorld(MAZE)
    env = Shaped(base, np.zeros(base.n_states), GAMMA)
    assert env.n_states == base.n_states and env.find("G") == base.find("G")
    assert env.reset(seed=1) == (0, {})


def test_shaped_adds_gamma_next_potential_minus_this_one():
    from shaping import Shaped
    base = GridWorld(["S..G"])
    potential = np.array([0.1, 0.2, 0.5, 9.0])
    env = Shaped(base, potential, GAMMA)
    env.reset()
    assert env.step(3)[1] == approx(0.0 + GAMMA * 0.2 - 0.1)
    assert env.step(3)[1] == approx(0.0 + GAMMA * 0.5 - 0.2)


def test_shaped_an_ending_counts_as_potential_zero():
    from shaping import Shaped
    base = GridWorld(["S.G"])
    env = Shaped(base, np.array([0.3, 0.4, 9.0]), GAMMA)
    env.reset()
    env.step(3)
    _, reward, terminated, _, _ = env.step(3)
    assert terminated and reward == approx(1.0 + GAMMA * 0.0 - 0.4)


def test_shaped_rewards_add_up_to_minus_the_starting_potential():
    from agents import FixedPolicy
    from returns import discounted_return, run_episode
    from shaping import Shaped
    base = GridWorld(["S...G"])
    potential = np.array([-0.4, -0.3, -0.2, -0.1, 0.0])
    plain = discounted_return(run_episode(base, FixedPolicy([3] * 5)), GAMMA)
    shaped = discounted_return(run_episode(Shaped(base, potential, GAMMA), FixedPolicy([3] * 5)), GAMMA)
    assert shaped - plain == approx(0.4), "the extra terms telescope to gamma**T * 0 - potential(start)"


def test_shaped_distance_counts_steps_ignoring_walls():
    from shaping import distance_to_goal
    env = GridWorld(["S#.", "..G"])
    assert distance_to_goal(env).tolist() == [3.0, 2.0, 1.0, 2.0, 1.0, 0.0]


def test_bonus_paid_only_next_to_the_goal():
    from shaping import NearGoalBonus
    env = NearGoalBonus(GridWorld(["S..G"]), 0.2)
    env.reset()
    assert env.step(3)[1] == 0.0, "two cells away: no bonus"
    assert env.step(3)[1] == approx(0.2), "next to the goal: the bonus"
    assert env.step(2)[1] == 0.0
    assert env.step(3)[1] == approx(0.2), "back next to the goal: the bonus again"


def test_bonus_reaching_the_goal_pays_the_goal_only():
    from shaping import NearGoalBonus
    env = NearGoalBonus(GridWorld(["S.G"]), 0.2)
    env.reset()
    env.step(3)
    _, reward, terminated, _, _ = env.step(3)
    assert terminated and reward == 1.0


def test_race_curves_judge_the_true_value_with_no_extras():
    from shaping_race import CHECKPOINTS, curve
    values = curve(None, 0)
    assert values.shape == (CHECKPOINTS,)
    assert (values <= 0.2059 + 1e-9).all(), "never above the maze's optimum"


def test_race_window_opens_and_closes():
    from shaping_race import run
    assert run(max_frames=1) == 1


def test_lab_builds_each_scenario():
    from reward_lab import make_scenario
    from shaping import NearGoalBonus
    env, base = make_scenario("coin")
    assert env is base and env.rewards["c"] == 0.3
    env, base = make_scenario("bonus")
    assert isinstance(env, NearGoalBonus) and env.n_states == base.n_states


def test_lab_unknown_scenario_is_an_error():
    import pytest
    from reward_lab import make_scenario
    with pytest.raises(ValueError):
        make_scenario("lava")
```

`test_shaped_rewards_add_up_to_minus_the_starting_potential` is the theorem of this lesson, checked on one episode: however you walk, the extra rewards from shaping always add up to the same amount. Keep it in mind for the step "Shaping as a wrapper".

```check
file tests/test_rewards.py -- Click "Create provided tests/test_rewards.py" above.
```

## A coin that pays every time

Add a colour for a coin tile, `c`, to `world_view.py`:

```python file=world_view.py
import sys

import pygame

from grid import MAPS, GridWorld

CELL = 72
PANEL = 250
TILES = {".": (30, 41, 59), "S": (30, 41, 59), "#": (100, 116, 139), "H": (8, 12, 20), "G": (250, 204, 21),
         "C": (127, 29, 29), "c": (217, 119, 6)}
LINE = (51, 65, 85)
PLAYER = (94, 234, 212)
BACKGROUND = (24, 26, 33)
TEXT = (226, 232, 240)
HINT = (148, 163, 184)
KEY_ACTIONS = {pygame.K_UP: 0, pygame.K_DOWN: 1, pygame.K_LEFT: 2, pygame.K_RIGHT: 3}


def window_size(env):
    return (env.cols * CELL + PANEL, max(env.rows * CELL, 320))


def cell_rect(cell):
    return pygame.Rect(cell[1] * CELL, cell[0] * CELL, CELL, CELL)


def draw_world(screen, env):
    for row in range(env.rows):
        for col in range(env.cols):
            rect = cell_rect((row, col))
            pygame.draw.rect(screen, TILES.get(env.tile((row, col)), TILES["."]), rect)
            pygame.draw.rect(screen, LINE, rect, 1)
    pygame.draw.circle(screen, PLAYER, cell_rect(env.cell).center, CELL // 3)


def draw_panel(screen, font, env, lines):
    left = env.cols * CELL + 16
    for row, text in enumerate(lines):
        screen.blit(font.render(text, True, TEXT if text else HINT), (left, 16 + row * 24))


def ending(tile, truncated):
    if truncated:
        return "out of time"
    return {"G": "reached the goal", "H": "fell in a hole"}.get(tile)


def play(name="walls", slip=0.0, max_steps=50, max_frames=None, seed=0):
    env = GridWorld(MAPS[name], slip=slip, max_steps=max_steps)
    state, _ = env.reset(seed=seed)
    pygame.init()
    screen = pygame.display.set_mode(window_size(env))
    pygame.display.set_caption(f"Grid world: {name}")
    font = pygame.font.Font(None, 24)
    clock = pygame.time.Clock()
    total, last, message = 0.0, None, None
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key in KEY_ACTIONS and message is None:
                state, last, terminated, truncated, info = env.step(KEY_ACTIONS[event.key])
                total += last
                if terminated or truncated:
                    message = ending(env.tile(env.cell), truncated)
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_r:
                state, _ = env.reset()
                total, last, message = 0.0, None, None
        screen.fill(BACKGROUND)
        draw_world(screen, env)
        lines = [f"state {state}", f"step {env.steps} of {env.max_steps}",
                 f"last reward {last}", f"total reward {total:+.1f}", "",
                 message or "", "arrows move   R reset"]
        draw_panel(screen, font, env, lines)
        pygame.display.flip()
        clock.tick(60)
        frames += 1
        if max_frames is not None and frames >= max_frames:
            running = False
    pygame.quit()
    return frames


if __name__ == "__main__":
    play(sys.argv[1] if len(sys.argv) > 1 else "walls", slip=float(sys.argv[2]) if len(sys.argv) > 2 else 0.0)
```

A coin needs no new rule in `grid.py`. Lesson 4.1's `rewards` dictionary already pays for arriving on any tile, so `rewards={"G": 1.0, "c": 0.3}` makes every arrival on `c` pay 0.3. Someone writing this reward meant "collect the coin on the way". The reward actually says "every step that ends on this tile is worth 0.3". And look back at lesson 4.1's `next_cell`: walking into an edge leaves you where you are, and `step` then pays for the tile you're on. So standing on the coin and walking into the edge counts as arriving on it again, every step.

```predict
question: With γ = 0.9, standing on the coin, which is worth more: walking to the goal for its +1, or staying on the coin, pushing against the top edge for ever?
choice: The goal: it pays more than three coins
choice: Staying on the coin for ever
answer: Staying on the coin for ever
explain: Pushing against the edge earns 0.3 every step: 0.3 + 0.9 × 0.3 + 0.9² × 0.3 + … = 0.3 / (1 − 0.9) = 3.0, three times the goal's 1, which is discounted further still by the walk there. (Even stepping on and off would beat the goal: 0.3 every second step is worth 0.3 / (1 − 0.81) ≈ 1.58.) Under this reward, farming the coin **is** the optimal behaviour: value iteration says so (the test checks it). The agent isn't broken. The reward, and a detail of the physics nobody thought about, are.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_rewards.py -k coin" label="coins are drawn, and farming them is optimal under this reward" -- Add "c": (217, 119, 6) to TILES.
```

## Shaping as a wrapper

Sometimes you *want* to add guidance: in a big maze, a reward only at the goal gives a learner nothing to go on until it stumbles there. The safe way to add guidance was found by Ng, Harada and Russell (1999). Choose a **potential** Φ(s), a number for each state such as "how close to the goal", and add

```text
F = γ · Φ(next state) − Φ(state)
```

to every reward, with Φ counted as 0 once an episode has ended. Create `shaping.py`:

```python file=shaping.py
import numpy as np

COIN_MAP = ["S.c...",
            "......",
            ".....G"]
MAZE = ["S...#.....",
        ".##.#.###.",
        ".#..#...#.",
        ".#.###.#..",
        ".#.....#.#",
        "...#.#...G"]


def distance_to_goal(env):
    goal = env.find("G")
    cells = [env.cell_of(state) for state in range(env.n_states)]
    return np.array([abs(row - goal[0]) + abs(col - goal[1]) for row, col in cells], dtype=float)


class Shaped:
    """Wraps an environment, adding gamma * potential(next) - potential(state) to every reward."""

    def __init__(self, env, potential, gamma):
        self.env = env
        self.potential = potential
        self.gamma = gamma
        self.state = None

    def __getattr__(self, name):
        return getattr(self.env, name)

    def reset(self, seed=None):
        self.state, info = self.env.reset(seed=seed)
        return self.state, info

    def step(self, action):
        next_state, reward, terminated, truncated, info = self.env.step(action)
        after = 0.0 if terminated else self.potential[next_state]
        reward += self.gamma * after - self.potential[self.state]
        self.state = next_state
        return next_state, reward, terminated, truncated, info
```

**A wrapper.** `Shaped` holds an environment and looks like one: `reset` and `step` with the usual results, with the extra term added to the reward. It's a **wrapper**, the same pattern Gymnasium uses for all its modifications (time limits, reward changes, recording), which you'll meet in Chapter 8. `__getattr__` makes everything else pass straight through: Python calls `__getattr__` only when an attribute **isn't** found on the object itself, so `shaped.n_states` or `shaped.find("G")` quietly come from the wrapped `GridWorld`. Learners and the workbench can't tell the difference.

**Why it can't change the best behaviour.** Add up the extra terms along any episode, discounted as returns are:

```text
F₀ + γF₁ + γ²F₂ + …  =  (γΦ₁ − Φ₀) + γ(γΦ₂ − Φ₁) + γ²(γΦ₃ − Φ₂) + …
                     =  −Φ₀ + γᵀ · Φ(end)
                     =  −Φ(start)                       (since Φ is 0 at the end)
```

Every middle term cancels with its neighbour: the sum **telescopes**. So every route from a state collects exactly the same total extra reward, −Φ(that state), whichever way it goes. Adding the same amount to every option can't change which option is best. The optimal policy is untouched. Only the intermediate rewards, the hints, change. `distance_to_goal` counts grid steps to the goal while ignoring walls: a rough, optimistic idea of "how far".

```check
run ".venv/Scripts/python -m pytest -q tests/test_rewards.py -k shaped" label="Shaped adds gamma * next potential - this potential" -- In step: after = 0 if terminated else potential[next_state]; add gamma * after - potential[self.state] to the reward, then remember next_state.
```

## A tempting mistake

The obvious way to add guidance is a bonus for being near the goal:

```python file=shaping.py
import numpy as np

COIN_MAP = ["S.c...",
            "......",
            ".....G"]
MAZE = ["S...#.....",
        ".##.#.###.",
        ".#..#...#.",
        ".#.###.#..",
        ".#.....#.#",
        "...#.#...G"]


def distance_to_goal(env):
    goal = env.find("G")
    cells = [env.cell_of(state) for state in range(env.n_states)]
    return np.array([abs(row - goal[0]) + abs(col - goal[1]) for row, col in cells], dtype=float)


class Shaped:
    """Wraps an environment, adding gamma * potential(next) - potential(state) to every reward."""

    def __init__(self, env, potential, gamma):
        self.env = env
        self.potential = potential
        self.gamma = gamma
        self.state = None

    def __getattr__(self, name):
        return getattr(self.env, name)

    def reset(self, seed=None):
        self.state, info = self.env.reset(seed=seed)
        return self.state, info

    def step(self, action):
        next_state, reward, terminated, truncated, info = self.env.step(action)
        after = 0.0 if terminated else self.potential[next_state]
        reward += self.gamma * after - self.potential[self.state]
        self.state = next_state
        return next_state, reward, terminated, truncated, info


class NearGoalBonus:
    """A tempting mistake: pay a bonus on every step that lands next to the goal."""

    def __init__(self, env, bonus):
        self.env = env
        self.bonus = (distance_to_goal(env) == 1) * bonus

    def __getattr__(self, name):
        return getattr(self.env, name)

    def reset(self, seed=None):
        return self.env.reset(seed=seed)

    def step(self, action):
        next_state, reward, terminated, truncated, info = self.env.step(action)
        return next_state, reward + self.bonus[next_state], terminated, truncated, info
```

`NearGoalBonus` pays `bonus` every time a step lands next to the goal. It isn't of the form γΦ(s′) − Φ(s), so nothing cancels. It's just more reward, and the agent will maximise it. Standing beside the goal pays the bonus every step, for ever, and entering the goal ends the episode, which ends the bonuses.

```predict
question: With a bonus of 0.2 and γ = 0.9, which is worth more to an agent standing beside the goal: stepping into the goal (+1, then the episode ends), or shuffling beside it for ever?
choice: Stepping into the goal
choice: Shuffling beside it for ever
answer: Shuffling beside it for ever
explain: A bonus of 0.2 on every step, kept up for ever, is worth 0.2 / (1 − γ) = 2.0, twice the goal. Measured: of 20 learners trained for 500 episodes, 11 never enter the goal at all. With a bonus of 0.05, worth 0.5 for ever, which is less than the goal, all 20 finish. The bonus wasn't "a bit too big": any per-state reward can be farmed, and once it outweighs finishing, finishing stops being the goal.
verify: script bonus_hover.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_rewards.py -k bonus" label="NearGoalBonus pays its bonus beside the goal" -- In step, add self.bonus[next_state] to the reward; the bonus array is bonus where distance_to_goal is 1, and 0 elsewhere.
```

## Race the potentials

The theorem promises the best policy is unchanged. Does shaping make learning faster? It depends on the potential:

```python file=shaping_race.py
import numpy as np
import pygame

from chart import draw_frame, draw_series
from grid import GridWorld
from learners import QLearning
from mdp import tables
from planning import value_iteration
from shaping import MAZE, Shaped, distance_to_goal
from training import greedy_value, train

GAMMA = 0.9
CHECKPOINTS, EVERY, TARGET_SEEDS = 20, 10, 20
WIDTH, HEIGHT = 860, 440
PLOT = pygame.Rect(60, 50, 500, 300)
BACKGROUND = (24, 26, 33)
FRAME = (100, 116, 139)
TEXT = (226, 232, 240)
BEST = (250, 204, 21)
SHAPINGS = [
    ("no shaping", (148, 163, 184), None),
    ("potential gamma ** distance", (94, 234, 212), lambda d: GAMMA ** d),
    ("potential -0.1 * distance", (248, 113, 113), lambda d: -0.1 * d),
]


def make_maze():
    return GridWorld(MAZE, max_steps=200)


def curve(potential_of, seed):
    judge = make_maze()
    env = make_maze()
    if potential_of is not None:
        env = Shaped(env, potential_of(distance_to_goal(judge)), GAMMA)
    agent = QLearning(judge.n_states, judge.n_actions, np.random.default_rng(seed), epsilon=0.1, gamma=GAMMA)
    values = np.zeros(CHECKPOINTS)
    for i in range(CHECKPOINTS):
        train(env, agent, EVERY, seed=seed if i == 0 else None)
        values[i] = greedy_value(judge, agent.Q, GAMMA)[0]
    return values


def draw(screen, font, curves, best):
    screen.fill(BACKGROUND)
    draw_frame(screen, font, PLOT, 0.0, 0.25, FRAME, "true value of the greedy policy (no shaping in the score)")
    draw_series(screen, PLOT, np.full(CHECKPOINTS, best), BEST, 0.0, 0.25)
    for row, ((name, colour, _), runs) in enumerate(zip(SHAPINGS, curves)):
        label = name
        if runs:
            mean = np.mean(runs, axis=0)
            draw_series(screen, PLOT, mean, colour, 0.0, 0.25)
            label = f"{name}: {mean[2]:.3f} after {3 * EVERY} episodes"
        screen.blit(font.render(label, True, colour), (PLOT.right + 16, PLOT.top + row * 26))
    screen.blit(font.render(f"best possible {best:.3f}", True, BEST), (PLOT.right + 16, PLOT.top + 90))
    screen.blit(font.render(f"seeds {len(curves[0])} of {TARGET_SEEDS}, {EVERY} episodes per point", True, TEXT),
                (PLOT.left, PLOT.bottom + 24))


def run(max_frames=None):
    best, _ = value_iteration(*tables(make_maze()), GAMMA)
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Reward shaping on a maze")
    font = pygame.font.Font(None, 22)
    clock = pygame.time.Clock()
    curves = [[] for _ in SHAPINGS]
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
        if len(curves[0]) < TARGET_SEEDS:
            seed = len(curves[0])
            for runs, (_, _, potential_of) in zip(curves, SHAPINGS):
                runs.append(curve(potential_of, seed))
        draw(screen, font, curves, best[0])
        pygame.display.flip()
        clock.tick(60)
        frames += 1
        if max_frames is not None and frames >= max_frames:
            running = False
    pygame.quit()
    return frames


if __name__ == "__main__":
    run()
```

- Three learners on the maze: no shaping, shaping with Φ = γ^distance, and shaping with Φ = −0.1 × distance.
- **Every learner is judged by the true, unshaped value** of its greedy policy: `greedy_value` on the plain maze, `judge`. Shaping is a training aid. Judging a learner by the shaped reward would let the aid grade itself.
- One seed of each per frame, 20 seeds, a checkpoint every 10 episodes.

```predict
question: After 30 episodes, which has found the maze's optimal route most often?
choice: no shaping
choice: potential gamma ** distance
choice: potential -0.1 * distance
answer: potential gamma ** distance
explain: With Φ = γ^distance, 17 of 20 learners have the optimal route after 30 episodes, against 3 of 20 without shaping. By 500 episodes all 20 shaped learners are optimal, and the unshaped ones catch up too: same destination, sooner, as the theorem says.
verify: script shaping_speed.py
```

```predict
question: And Φ = −0.1 × distance, which also "rises towards the goal"?
choice: About as fast as γ ** distance
choice: Slower than no shaping, but it gets there
choice: Nothing is learned: standing still pays
answer: Nothing is learned: standing still pays
explain: Its greedy policy stays worth 0: it never reaches the goal. Work out F for standing still, bumping a wall: γΦ(s) − Φ(s) = (γ − 1)Φ(s) = −0.1 × (−0.1 × distance) = +0.01 × distance. With negative potentials, standing still is *paid*, +0.15 a step at the start, and the agent learns that first. The theorem still holds: the best policy is unchanged. But learning has to discover that through a fog of misleading hints. With Φ = γ^distance, staying put costs (γ − 1) × a positive number, a small charge. The best potential of all is the true value V* itself, which γ^distance roughly approximates. **The theorem guarantees what's optimal, not how fast you'll find it.**
verify: script shaping_bad_potential.py
```

## Watch the hacks

`reward_lab.py` puts a Q-learner into either broken reward, in the workbench:

```python file=reward_lab.py
import sys

import numpy as np

from grid import GridWorld
from learners import QLearning
from shaping import COIN_MAP, MAZE, NearGoalBonus
from workbench import Workbench

SCENARIOS = ["coin", "bonus"]


def make_scenario(name):
    if name == "coin":
        env = GridWorld(COIN_MAP, rewards={"G": 1.0, "c": 0.3}, max_steps=60)
        return env, env
    if name == "bonus":
        base = GridWorld(MAZE, max_steps=200)
        return NearGoalBonus(base, 0.2), base
    raise ValueError(f"no scenario {name!r}: choose from {SCENARIOS}")


if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "coin"
    env, base = make_scenario(name)
    agent = QLearning(base.n_states, base.n_actions, np.random.default_rng(0), epsilon=0.1, gamma=0.9)
    Workbench(env, agent).run(f"Reward design: {name}")
```

`make_scenario` returns the environment the agent learns in, plus the plain grid underneath, which supplies the table's size. The workbench draws a wrapped environment without any changes, thanks to `__getattr__`: `env.cell`, `env.tile` and `env.rows` come from the grid inside.

Run it (the coin map) at 240 steps a second, and watch the agent learn to walk to the coin and stay there. Then `.venv\Scripts\python reward_lab.py bonus`, and watch it learn to loiter beside a goal it never enters.

```predict
question: After 2000 episodes on the coin map, what does Q-learning's greedy policy do?
choice: Walks straight to the goal
choice: Collects the coin once, then goes to the goal
choice: Walks onto the coin and pushes against the edge until time runs out
answer: Walks onto the coin and pushes against the edge until time runs out
explain: Two steps to the coin, then "up" into the edge, for the rest of the episode, collecting 0.3 every step. It never reaches G: exactly what the reward pays for. In the workbench the average return is about 16 per episode, against the 1 that the goal could ever give. A rising learning curve tells you the agent is getting better at the *reward*. Whether that's the behaviour you wanted is a separate question, which only watching, or judging against a separate measure of success, can answer.
verify: script coin_farm.py
```

### How to write rewards that mean what you want

- **Reward outcomes, not the steps you imagine leading to them.** "Reach the goal" is hard to game. "Be near the goal" and "touch the coin" can be farmed.
- **If you add guidance, use a potential**, F = γΦ(s′) − Φ(s), with Φ an estimate of how good each state really is, and Φ = 0 once the episode has ended.
- **Judge by the true objective**, never by the shaped or proxy reward.
- **Watch the agent**, not only its numbers. Most reward hacks are obvious within seconds of watching, and invisible in a chart.

Further reading: Ng, Harada & Russell (1999), *Policy invariance under reward transformations*; Krakovna et al., *Specification gaming: the flip side of AI ingenuity* (DeepMind), with dozens of real examples; Sutton & Barto, section 17.4, "Designing reward signals".

```check
run ".venv/Scripts/python -m pytest -q tests/test_rewards.py" label="all lesson 7.5 tests pass" -- make_scenario("bonus") returns NearGoalBonus(maze, 0.2) and the plain maze; an unknown name raises ValueError.
```
