---
title: 6.3 — SARSA: Learning to Act, on the Edge of a Cliff
track: Reinforcement Learning in pygame
runtime: python
run: watch_cliff.py
---

Lesson 6.2's TD learners only *predicted*: they estimated the values of a fixed random policy. Now TD learns to **act**. The idea is lesson 6.1's: keep Q-values, act ε-greedily on them, and improve both together. The only change is the target: instead of waiting for the episode's return, use the TD target, one reward plus the estimated value of what comes next.

The method is called **SARSA**, after the five things each update uses: **S**tate, **A**ction, **R**eward, next **S**tate, next **A**ction. That last one is the interesting part, and the cliff below shows why.

The world for this lesson is Sutton & Barto's **cliff walk**. Every step costs −1. The start and goal sit at either end of a cliff edge, and stepping onto the cliff costs −100 and sends you back to the start. The shortest route runs right along the edge. To build it, `grid.py` needs a new kind of tile, and you'll change working code that other code depends on. Your own tests from lesson 4.4 are about to earn their keep.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_ledge.py** above.

```python file=tests/test_ledge.py provided
# Tests for the cliff in grid.py and world_view.py, Sarsa in learners.py, and watch_cliff.py
# (lesson 6.3). Run them with:   .venv\Scripts\python -m pytest -q tests/test_ledge.py
import numpy as np
import pygame
from pytest import approx

from grid import MAPS, GridWorld


def test_cliff_costs_a_hundred_and_sends_you_back():
    env = GridWorld(["S.", "C."], max_steps=10)
    env.reset()
    env.cell = (0, 0)
    state, reward, terminated, truncated, _ = env.step(1)       # down, onto the cliff
    assert reward == -100.0
    assert state == env.state_of(env.start) and env.cell == env.start
    assert not terminated and not truncated, "the episode goes on from the start"
    assert env.steps == 1


def test_cliff_map_and_its_rewards():
    env = GridWorld(MAPS["cliff"], step_reward=-1.0, rewards={"G": 0.0, "C": -100.0})
    assert (env.rows, env.cols) == (4, 12)
    assert env.start == (3, 0) and env.find("G") == (3, 11)
    env.reset()
    total = 0.0
    for action in [0] + [3] * 11 + [1]:                          # up, along the row above, down
        _, reward, terminated, _, _ = env.step(action)
        total += reward
    assert terminated and total == -12.0, "13 steps: 12 cost 1 each, the last arrives on G for 0"


def test_cliff_old_maps_behave_as_before():
    env = GridWorld(MAPS["walls"])
    env.reset()
    env.cell = (2, 3)
    assert env.step(1)[1:3] == (-1.0, True), "the hole is unchanged"


def test_tile_new_tiles_are_drawn_in_their_colour():
    import world_view
    env = GridWorld(MAPS["cliff"])
    env.reset()
    screen = pygame.Surface(world_view.window_size(env))
    world_view.draw_world(screen, env)
    rect = world_view.cell_rect((3, 5))
    assert screen.get_at((rect.x + 5, rect.y + 5))[:3] == world_view.TILES["C"]


def test_sarsa_uses_the_action_it_will_really_take_next():
    from learners import Sarsa
    agent = Sarsa(3, 4, np.random.default_rng(0), epsilon=0.0, gamma=0.9, step=1.0)
    agent.Q[1] = [0.0, 0.0, 0.0, 5.0]
    agent.learn(0, 3, -1.0, 1, False, False)
    assert agent.next_action == 3
    assert agent.Q[0, 3] == approx(-1.0 + 0.9 * 5.0)
    assert agent.act(1) == 3, "act returns the action already chosen for the next step"
    assert agent.next_action is None


def test_sarsa_follows_exploration_into_its_target():
    from learners import Sarsa
    agent = Sarsa(3, 4, np.random.default_rng(0), epsilon=1.0, gamma=1.0, step=1.0)
    agent.Q[1] = [10.0, 20.0, 30.0, 40.0]
    agent.learn(0, 3, 0.0, 1, False, False)
    assert agent.Q[0, 3] == agent.Q[1, agent.next_action], "the target uses the random next action, not the best"


def test_sarsa_an_ending_has_no_next_action():
    from learners import Sarsa
    agent = Sarsa(3, 4, np.random.default_rng(0), step=1.0)
    agent.Q[2] = 50.0
    agent.learn(1, 3, 1.0, 2, True, False)
    assert agent.Q[1, 3] == approx(1.0) and agent.next_action is None


def test_sarsa_a_time_out_bootstraps_then_forgets_the_next_action():
    from learners import Sarsa
    agent = Sarsa(3, 4, np.random.default_rng(0), epsilon=0.0, gamma=1.0, step=1.0)
    agent.Q[1, 0] = 7.0
    agent.learn(0, 3, 0.0, 1, False, True)
    assert agent.Q[0, 3] == approx(7.0)
    assert agent.next_action is None, "a new episode starts from the start, not from next_state"


def test_route_follows_the_greedy_actions():
    from watch_cliff import greedy_route, make_cliff
    env = make_cliff()
    Q = np.zeros((env.n_states, 4))
    Q[env.state_of((3, 0)), 0] = 1.0                 # up from S
    for col in range(11):
        Q[env.state_of((2, col)), 3] = 1.0           # right along row 2
    Q[env.state_of((2, 11)), 1] = 1.0                # down into G
    route = greedy_route(env, Q)
    assert len(route) == 14 and route[-1] == (3, 11)


def test_route_none_when_the_greedy_actions_loop():
    from watch_cliff import greedy_route, make_cliff
    env = make_cliff()
    Q = np.zeros((env.n_states, 4))
    Q[:, 0] = 1.0                                    # up everywhere: stuck at the top
    assert greedy_route(env, Q) is None


def test_route_learning_stops_the_falls():
    from training import train
    from watch_cliff import make_cliff, make_sarsa
    env = make_cliff()
    totals = train(env, make_sarsa(env, 0), 300, seed=0)
    assert totals[-50:].mean() > totals[:20].mean() + 30
```

Two of these tests protect the past. `test_cliff_old_maps_behave_as_before` checks that the hole still works exactly as it did, and the step that changes `grid.py` also runs **your** `tests/test_my_grid.py` from lesson 4.4. A change that adds something new must not quietly break what already worked.

```check
file tests/test_ledge.py -- Click "Create provided tests/test_ledge.py" above.
```

## Cliffs in the grid world

Three additions to `grid.py`: a reward for `C`, the cliff map, and the rule that a cliff sends you back to the start:

```python file=grid.py
import numpy as np

from chance import sample, slip_distribution
from qtable import ACTIONS

# What arriving on a tile pays. Every other tile pays the step reward.
REWARDS = {"G": 1.0, "H": -1.0, "C": -100.0}
ENDS = "GH"          # tiles that end an episode
CLIFF = "C"          # pays its reward and sends you back to the start; the episode goes on

MAPS = {
    "open": ["S....",
             ".....",
             ".....",
             ".....",
             "....G"],
    "walls": ["S..#.",
              ".#.#.",
              ".#...",
              ".##H.",
              "....G"],
    "lake": ["S...",
             ".H.H",
             "...H",
             "H..G"],
    "cliff": ["............",
              "............",
              "............",
              "SCCCCCCCCCCG"],
}


class GridWorld:
    def __init__(self, layout, slip=0.0, max_steps=100, step_reward=0.0, rewards=None):
        if len({len(row) for row in layout}) != 1:
            raise ValueError("every row of the map must be the same length")
        self.layout = list(layout)
        self.rows, self.cols = len(layout), len(layout[0])
        self.slip = slip
        self.max_steps = max_steps
        self.step_reward = step_reward
        self.rewards = REWARDS if rewards is None else rewards
        self.start = self.find("S")
        self.rng = np.random.default_rng()
        self.cell = self.start
        self.steps = 0

    @property
    def n_states(self):
        return self.rows * self.cols

    @property
    def n_actions(self):
        return len(ACTIONS)

    def find(self, tile):
        for row, line in enumerate(self.layout):
            col = line.find(tile)
            if col >= 0:
                return (row, col)
        raise ValueError(f"the map has no {tile!r} tile")

    def tile(self, cell):
        return self.layout[cell[0]][cell[1]]

    def state_of(self, cell):
        return cell[0] * self.cols + cell[1]

    def cell_of(self, state):
        return divmod(state, self.cols)

    def next_cell(self, cell, action):
        row = cell[0] + ACTIONS[action][0]
        col = cell[1] + ACTIONS[action][1]
        if not (0 <= row < self.rows and 0 <= col < self.cols):
            return cell
        if self.tile((row, col)) == "#":
            return cell
        return (row, col)

    def reset(self, seed=None):
        if seed is not None:
            self.rng = np.random.default_rng(seed)
        self.cell = self.start
        self.steps = 0
        return self.state_of(self.cell), {}

    def step(self, action):
        actual = action
        if self.slip > 0:
            actual = sample(slip_distribution(action, self.slip), self.rng)
        self.cell = self.next_cell(self.cell, actual)
        self.steps += 1
        tile = self.tile(self.cell)
        reward = self.rewards.get(tile, self.step_reward)
        if tile == CLIFF:
            self.cell = self.start
        terminated = tile in ENDS
        truncated = not terminated and self.steps >= self.max_steps
        return self.state_of(self.cell), reward, terminated, truncated, {"slid": actual != action}
```

- `REWARDS` gains `"C": -100.0`, and `CLIFF = "C"` names the tile, so `step` says what it means instead of using a bare `"C"`.
- In `step`, after the reward is worked out from the tile you arrived on, a cliff moves you back to the start: `self.cell = self.start`. Then the state returned is the **start's**: from where you are now, after the fall, which is the state you'll act from next.
- `C` is **not** in `ENDS`: falling costs a lot, but the episode goes on. That makes falls repeatable within an episode, which is exactly what makes them expensive.

Run your own tests from lesson 4.4 before checking:

```text
.venv\Scripts\python -m pytest -q tests/test_my_grid.py
```

They still pass, and so does `mutants.py`. Nothing that worked before has changed. This is the payoff for writing them: one command, and you know the change didn't break anything they guard.

```check
run ".venv/Scripts/python -m pytest -q tests/test_ledge.py -k cliff" label="cliff tiles cost 100 and send you back to the start" -- After working out the reward, if the tile is CLIFF, move self.cell back to self.start before building the returned state.
run ".venv/Scripts/python -m pytest -q tests/test_my_grid.py tests/test_world.py" label="your own lesson 4.4 tests and lesson 4.1's still pass" -- A change for cliffs must not alter anything else: compare your step() with lesson 4.1's line by line.
```

## Show the cliff

Give cliff tiles a colour in `world_view.py`, a dark red:

```python file=world_view.py
import sys

import pygame

from grid import MAPS, GridWorld

CELL = 72
PANEL = 250
TILES = {".": (30, 41, 59), "S": (30, 41, 59), "#": (100, 116, 139), "H": (8, 12, 20), "G": (250, 204, 21),
         "C": (127, 29, 29)}
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

The dictionary entry is all it takes: `draw_world` looks up every tile's colour in `TILES`, so a new tile needs only a new entry. The statement continues onto a second line inside the braces, which Python allows anywhere inside brackets.

```check
run ".venv/Scripts/python -m pytest -q tests/test_ledge.py -k tile" label="cliff tiles are drawn in their own colour" -- Add a "C" entry to TILES.
```

## SARSA: TD control

```python file=learners.py
import numpy as np

from averages import update
from chance import bernoulli
from qtable import greedy_action


class TabularAgent:
    def __init__(self, n_states, n_actions, rng, epsilon=0.1, gamma=0.9, step=None):
        self.Q = np.zeros((n_states, n_actions))
        self.N = np.zeros((n_states, n_actions), dtype=int)
        self.rng = rng
        self.epsilon = epsilon
        self.gamma = gamma
        self.step = step

    def act(self, state):
        if bernoulli(self.epsilon, self.rng):
            return int(self.rng.integers(self.Q.shape[1]))
        return greedy_action(self.Q[state], self.rng)

    def nudge(self, state, action, target):
        self.N[state, action] += 1
        step = self.step if self.step is not None else 1 / self.N[state, action]
        self.Q[state, action] = update(self.Q[state, action], target, step)


class MonteCarlo(TabularAgent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.episode = []

    def learn(self, state, action, reward, next_state, terminated, truncated):
        self.episode.append((state, action, reward))
        if terminated or truncated:
            G = 0.0
            for s, a, r in reversed(self.episode):
                G = r + self.gamma * G
                self.nudge(s, a, G)
            self.episode = []


class TDPredictor:
    def __init__(self, n_states, n_actions, rng, step=0.1, gamma=1.0, initial=0.5):
        self.V = np.full(n_states, float(initial))
        self.n_actions = n_actions
        self.rng = rng
        self.step = step
        self.gamma = gamma

    def act(self, state):
        return int(self.rng.integers(self.n_actions))

    def learn(self, state, action, reward, next_state, terminated, truncated):
        target = reward if terminated else reward + self.gamma * self.V[next_state]
        self.V[state] = update(self.V[state], target, self.step)


class MCPredictor(TDPredictor):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.episode = []

    def learn(self, state, action, reward, next_state, terminated, truncated):
        self.episode.append((state, reward))
        if terminated or truncated:
            G = 0.0
            for s, r in reversed(self.episode):
                G = r + self.gamma * G
                self.V[s] = update(self.V[s], G, self.step)
            self.episode = []


class Sarsa(TabularAgent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.next_action = None

    def act(self, state):
        if self.next_action is not None:
            action, self.next_action = self.next_action, None
            return action
        return super().act(state)

    def learn(self, state, action, reward, next_state, terminated, truncated):
        if terminated:
            target = reward
        else:
            self.next_action = super().act(next_state)
            target = reward + self.gamma * self.Q[next_state, self.next_action]
        self.nudge(state, action, target)
        if terminated or truncated:
            self.next_action = None
```

How SARSA's `learn` works:

1. **Choose the next action now.** If the episode didn't end, it picks the action it will take in `next_state`, ε-greedily, exactly as it will act, and stores it in `self.next_action`.
2. **The target** is the reward plus γ times the value of **that** next action: `reward + gamma * Q[next_state, next_action]`. After an ending, the target is just the reward.
3. **Nudge** Q towards the target, the same `nudge` as Monte Carlo.
4. **Keep the promise.** The next call to `act` returns the stored action instead of choosing again, so the action the target assumed is the action really taken. After an ending or a time-out the stored action is cleared, because the next episode starts somewhere else.

`super().act(next_state)` calls `TabularAgent`'s ε-greedy `act`, not SARSA's own version, which would hand back the stored action. `action, self.next_action = self.next_action, None` swaps in one line: Python evaluates the right side completely, then assigns both names.

**Why "the action it will really take" matters.** SARSA's target includes the next action's value *including its exploration*: if that action was a random one, the target reflects a random move. So SARSA learns the value of the policy **it actually follows**, exploration and all. That's called **on-policy** learning. On a cliff, where one random step at the edge costs 100, that changes what "best" looks like.

```check
run ".venv/Scripts/python -m pytest -q tests/test_ledge.py -k sarsa" label="Sarsa learns from the action it will really take next" -- In learn: unless terminated, choose next_action with super().act(next_state) and use Q[next_state, next_action] in the target; clear next_action when the episode ends either way.
```

## Walk the cliff

```python file=watch_cliff.py
import sys

import numpy as np

from grid import MAPS, GridWorld
from learners import Sarsa
from training import train
from workbench import Workbench


def make_cliff():
    return GridWorld(MAPS["cliff"], step_reward=-1.0, rewards={"G": 0.0, "C": -100.0}, max_steps=500)


def make_sarsa(env, seed):
    return Sarsa(env.n_states, env.n_actions, np.random.default_rng(seed), epsilon=0.1, gamma=1.0, step=0.5)


def greedy_route(env, Q, limit=60):
    state, _ = env.reset()
    cells = [env.cell]
    for _ in range(limit):
        state, _, terminated, _, _ = env.step(int(Q[state].argmax()))
        cells.append(env.cell)
        if terminated:
            return cells
    return None


def report(seeds=10, episodes=500):
    for seed in range(seeds):
        env = make_cliff()
        agent = make_sarsa(env, seed)
        totals = train(env, agent, episodes, seed=seed)
        route = greedy_route(make_cliff(), agent.Q)
        shape = "loops, never reaching G" if route is None else f"{len(route) - 1} steps, highest row {min(r for r, _ in route)}"
        print(f"seed {seed}: last 100 episodes average {totals[-100:].mean():7.1f}; greedy route {shape}")


if __name__ == "__main__":
    if "report" in sys.argv:
        report()
    else:
        env = make_cliff()
        Workbench(env, make_sarsa(env, 0)).run("SARSA on the cliff")
```

- `make_cliff` sets up Sutton & Barto's version: −1 per step, 0 for reaching G, −100 for the cliff. `make_sarsa` uses their settings: ε = 0.1, γ = 1, step 0.5.
- `greedy_route` follows the learned table's best action from the start. It returns the cells visited, or `None` if it hasn't arrived after 60 steps, which means it's going round in a loop.

Run it at 240 steps a second, and watch the red row. Early episodes fall again and again. Gradually the agent stops.

```predict
question: Which route will SARSA's greedy policy take from S to G?
choice: Right along the cliff edge: the shortest, 13 steps
choice: Along the top row, as far from the cliff as it can get
choice: Through the middle rows
answer: Along the top row, as far from the cliff as it can get
explain: In 16 of 20 runs, the greedy route goes up to the very top row, across, and down: 17 steps instead of 13. SARSA learns the value of the policy it actually follows, which explores 10% of the time. Walking along the edge, every random step down is a 100-point fall. Walking along the top, a random step does no harm. So for an agent that keeps exploring, the long way round really is better. The shortest route is only best for an agent that never makes a random move.
verify: script sarsa_route.py
```

Then in the terminal: `.venv\Scripts\python watch_cliff.py report`.

```predict
question: The safe 17-step route earns −17 per episode. What does SARSA average over episodes 401–500?
choice: Exactly -17: it has learned the route
choice: About -25: still worse than -17
choice: About -13: it found the shortest route
answer: About -25: still worse than -17
explain: Around −22 to −30 depending on the seed (Sutton & Barto report about −25). The agent still explores 10% of the time: random steps add detours, and now and then one walks it off the cliff after all. That's the price of continuing to explore. The report scores the agent's *behaviour*, exploration included, not its greedy route. Separating the two is the subject of lesson 7.2.
verify: script sarsa_reward.py
```

**A loop in the greedy route.** In a few runs the report says the greedy route "loops, never reaching G". Those cells aren't unexplored: they've had over a hundred updates each. It's the step size. With a constant step of 0.5, each update moves an estimate halfway to its target, so an estimate mostly reflects its last few targets (lesson 2.3: 0.5, 0.25, 0.125 … weights). A snapshot of such noisy estimates can disagree with itself, with "right" best in one cell and "left" best in the next, while the ε-greedy behaviour still works well on average. A smaller step, or a step that shrinks over time, gives steadier estimates. Lesson 7.3 measures that trade-off.

In lesson 7.1, one change to SARSA's target produces **Q-learning**, and on this same cliff it learns the 13-step route along the edge. Why one method chooses safety and the other the edge is the most important difference between them.

```check
run ".venv/Scripts/python -m pytest -q tests/test_ledge.py" label="all lesson 6.3 tests pass" -- greedy_route: follow Q[state].argmax() from reset; return the cells visited when an episode terminates, or None after `limit` steps.
```
