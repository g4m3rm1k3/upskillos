---
title: 3.2 — Rewards That Shape Behaviour
runtime: python
run: rewards.py
---

### The story so far

Lesson 3.1 built `QMaze` (`qmaze.py`): a 10 × 10 maze where the rat's **state** is its cell number, `row * 10 + col`, and `step(action)` moves it LEFT, UP, RIGHT or DOWN (actions 0 to 3) and returns `(state, reward, terminated, truncated, info)`. Reaching the cheese at (9, 9) is `terminated`; losing more than 50 points in total is `truncated`.

From Chapter 1: `QAgent(n_states, n_actions, alpha, gamma, epsilon, seed)` (`agent.py`) keeps a table `agent.Q` with one row per state and one column per action. `agent.act(state)` picks the column with the highest score, except that with probability `epsilon` (ε) it picks at random, to explore. `train(env, agent, episodes, seed)` (`train.py`) plays that many games, updating the table after every move.

### What this lesson asks

The corridor paid only at its ends. QMaze pays something on **every** step: −0.04 for a move, −0.25 for going back, −0.75 for a wall. Rewards like these, given along the way to steer behaviour, are called **reward shaping**, and they're one of the most powerful and most dangerous tools in reinforcement learning. An agent maximises exactly what it's paid for, not what you meant.

This lesson trains Chapter 1's agent on the maze, then changes the rewards one at a time and watches what each rule is really for. The answer isn't what the rule names suggest.

### How the pieces fit

```text
rewards.py
  train_maze(rewards)  ──>  QMaze(rewards=…, random_start=True)  +  QAgent  ──>  train(...)  ──>  a trained agent
                                                                                                      │
maze_tools.py                                                                                         v
  completion(agent)    ──>  greedy_path(agent, maze, cell) for each of the 74 starts  ──>  how many reached the cheese
rewards.py
  endings(agent)       ──>  how_it_ends(path, reached) for each start  ──>  a count of each kind of ending
```

Training uses whichever rewards you're testing. Judging always uses the classic rules, so the four agents are compared fairly.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_rewards.py** above.

```python file=tests/test_rewards.py provided
# Tests for maze_tools.py, qmaze.py's random starts and rewards.py (lesson 3.2).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_rewards.py
import numpy as np


def corridor_maze():
    maze = np.zeros((3, 3))
    maze[2] = 1.0
    maze[0, 0] = maze[1, 0] = 1.0
    return maze


class RightAgent:
    epsilon = 0.0

    def act(self, state):
        return 2


def test_path_follows_the_agent_to_the_cheese():
    from maze_tools import greedy_path
    path, reached = greedy_path(RightAgent(), corridor_maze(), (2, 0))
    assert path == [(2, 0), (2, 1), (2, 2)] and reached is True


def test_path_stops_at_the_step_limit():
    from maze_tools import greedy_path
    path, reached = greedy_path(RightAgent(), corridor_maze(), (0, 0), limit=5)
    assert path == [(0, 0)] * 6 and reached is False


def test_path_puts_the_agents_epsilon_back():
    from maze_tools import greedy_path
    agent = RightAgent()
    agent.epsilon = 0.3
    greedy_path(agent, corridor_maze(), (2, 0))
    assert agent.epsilon == 0.3


def test_path_completion_counts_starts_that_win():
    from maze_tools import completion
    assert completion(RightAgent(), corridor_maze()) == (2, 4), "only the bottom row's starts reach the cheese"


def test_ending_names_each_kind():
    from rewards import how_it_ends
    assert how_it_ends([(0, 0), (0, 1)], True) == "reached the cheese"
    assert how_it_ends([(3, 3)] * 30, False) == "stands still against a wall"
    assert how_it_ends([(1, 1), (1, 2)] * 15, False) == "steps back and forth"
    assert how_it_ends([(0, c) for c in range(10)] * 3, False) == "wanders"


def test_ending_looks_only_at_the_last_twenty_cells():
    from rewards import how_it_ends
    path = [(0, c) for c in range(10)] + [(5, 5)] * 20
    assert how_it_ends(path, False) == "stands still against a wall"


def test_anywhere_starts_on_a_random_free_cell():
    from qmaze import QMaze
    env = QMaze(random_start=True)
    env.reset(seed=0)
    starts = {env.cell for _ in range(300) if env.reset() is not None}
    assert starts <= set(env.free_cells) and len(starts) > 50


def test_anywhere_is_repeatable_with_a_seed():
    from qmaze import QMaze
    a, b = QMaze(random_start=True), QMaze(random_start=True)
    a.reset(seed=4)
    b.reset(seed=4)
    assert a.cell == b.cell
    assert [a.reset()[0] for _ in range(10)] == [b.reset()[0] for _ in range(10)]


def test_anywhere_off_still_starts_at_the_start():
    from qmaze import QMaze
    env = QMaze(start=(5, 0))
    assert {env.reset()[0] for _ in range(20)} == {50}


def test_variants_change_one_reward_each():
    from qmaze import REWARDS
    from rewards import VARIANTS
    assert VARIANTS["classic"] == REWARDS
    assert VARIANTS["no wall penalty"] == {**REWARDS, "wall": -0.04}
    assert VARIANTS["no revisit penalty"] == {**REWARDS, "revisit": -0.04}
    assert VARIANTS["only the cheese"] == {"cheese": 1.0, "move": 0.0, "revisit": 0.0, "wall": 0.0}


def test_variants_train_an_agent_on_the_maze():
    from rewards import train_maze
    agent = train_maze(episodes=20)
    assert agent.Q.shape == (100, 4) and agent.Q.any()
```

The test names are grouped by their first word. What each group protects:

| group | it makes sure that… | a bug it would catch |
|---|---|---|
| `path` | `greedy_path` records every cell, including the start, stops at the cheese or the limit, and leaves the agent's ε as it found it; `completion` counts only the starts that win | a judged agent that kept ε = 0 afterwards, so it stopped exploring when training resumed |
| `ending` | `how_it_ends` names the four ways a game can finish, and looks only at the end of the path | calling a rat that wandered first and then got stuck a "wanderer" |
| `anywhere` | random starts land only on free cells, the same seed gives the same starts, and random starts are off unless asked for | the play window suddenly starting the rat in a random place |
| `variants` | each reward variant changes exactly one thing from the classic rules | a variant that changed two rewards, so you couldn't tell which one caused the result |

Two things to notice:

- **The tests use stand-ins.** `corridor_maze()` builds a tiny 3 × 3 maze where the answers are easy to work out by hand: the bottom row is free, and so is the left column. `RightAgent` is a fake agent that always steps right. With a known maze and a known agent, `greedy_path` and `completion` have exactly one correct answer each. A fake object that stands in for a real one in a test is often called a **stub**. It only needs the parts the code under test uses: here, `epsilon` and `act`.
- **`{**REWARDS, "wall": -0.04}`** makes a new dictionary: everything in `REWARDS`, then `"wall"` replaced by −0.04. `**` unpacks a dictionary into another, as it unpacked keyword arguments in lesson 2.5.

```check
file tests/test_rewards.py -- Click "Create provided tests/test_rewards.py" above.
```

## Following the agent's choices

To judge a maze agent, you need to see where it goes. Create `maze_tools.py`:

```python file=maze_tools.py
from qmaze import MAZE, QMaze


def greedy_path(agent, maze, start, limit=200):
    saved = agent.epsilon
    agent.epsilon = 0.0
    env = QMaze(maze, start=start)
    state, _ = env.reset()
    path = [env.cell]
    reached = False
    for _ in range(limit):
        state, _, terminated, truncated, _ = env.step(agent.act(state))
        path.append(env.cell)
        if terminated:
            reached = True
            break
        if truncated:
            break
    agent.epsilon = saved
    return path, reached


def completion(agent, maze=MAZE):
    env = QMaze(maze)
    wins = sum(greedy_path(agent, maze, cell)[1] for cell in env.free_cells)
    return wins, len(env.free_cells)
```

**`greedy_path`'s inputs, and what it gives back:**

| | what it is | why it's needed |
|---|---|---|
| input `agent` | any object with `epsilon` and `act(state)` | the agent being judged; the tests pass `RightAgent` |
| input `maze` | the grid to play on | lesson 3.4 judges on a different maze |
| input `start` | the (row, column) to start from | `completion` calls it once for each of the 74 starts |
| input `limit` | the most steps to play | stops an agent that never ends its game (200) |
| returns `path` | a list of (row, column) cells, start first | to see where the rat went, and how it failed |
| returns `reached` | `True` if it reached the cheese | what `completion` counts |

**Why ε is set to 0 and then put back.** `act` explores at random with probability ε. Judging should show what the agent has *learned*, so exploration is switched off. But the agent might be trained more afterwards, and training needs ε, so `saved` remembers it and the last line before `return` restores it. That's what the `path` test with `agent.epsilon = 0.3` checks.

- **`greedy_path`** plays one greedy episode from a chosen start and records every cell the rat stands on, including the start. It stops at the cheese, at the losing limit, or after `limit` steps (200, five times the longest route needed: no free cell is more than 40 moves from the cheese), whichever comes first. The step limit protects against an agent that loops forever without losing: on a free cell, stepping back and forth costs −0.25 a step, so it does lose eventually, but there's no need to wait.
- It uses a **fresh** `QMaze` with the default rewards, whatever the agent was trained with, so every agent is judged by the same rules.
- **`completion`** asks the question the tutorial calls its **completion check**: from how many of the 74 free cells does the greedy rat reach the cheese? `sum(...)` adds `True` as 1 and `False` as 0, so it counts the wins.

```check
run ".venv/Scripts/python -m pytest -q tests/test_rewards.py -k path" label="greedy_path records where a greedy agent goes, and completion counts the starts that win" -- Record env.cell after reset and after every step; stop on terminated (reached), truncated, or after limit steps; put epsilon back.
```

## Your turn: how did it end?

**Build, on your own:** `how_it_ends(path, reached)`, in a new file `rewards.py`.

When a greedy rat **doesn't** reach the cheese, *how* it fails says a lot about what it learned. Look at the last 20 cells of its path (`path[-20:]`), as a set, so repeats collapse:

| the last 20 cells | the rat… | return |
|---|---|---|
| it reached the cheese | (whatever its path) | `"reached the cheese"` |
| 1 distinct cell | is standing still: every action bumps a wall | `"stands still against a wall"` |
| 2 distinct cells | steps back and forth between two cells | `"steps back and forth"` |
| more | wanders in a bigger loop | `"wanders"` |

`path[-20:]` is the last 20 items (or the whole list, if it's shorter). `set(...)` keeps one of each, and `len` counts them.

```hints
nudge: Check `reached` first. Then how many different cells are in the last 20?
concept: `last = set(path[-20:])`, then `len(last)` decides: 1 means standing still, 2 means back and forth, anything more means wandering.
answer: Create `rewards.py`:
~~~python
def how_it_ends(path, reached):
    if reached:
        return "reached the cheese"
    last = set(path[-20:])
    if len(last) == 1:
        return "stands still against a wall"
    if len(last) == 2:
        return "steps back and forth"
    return "wanders"
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_rewards.py -k ending" label="how_it_ends tells a win from standing still, stepping back and forth, and wandering" -- reached → "reached the cheese"; otherwise count the distinct cells in path[-20:]: 1, 2 or more.
```

## Starting anywhere

One more change before training. If every episode starts at (0, 0), the agent learns that route well, and almost nothing about the rest of the maze: a cell off the route might be visited a few times by exploring, or never. The tutorial trains from a **random free cell** each episode, and so will you. Make `qmaze.py`'s class this (the constants and `MAZE` above it stay the same):

```python file=qmaze.py
import numpy as np

LEFT, UP, RIGHT, DOWN = 0, 1, 2, 3
MOVES = {LEFT: (0, -1), UP: (-1, 0), RIGHT: (0, 1), DOWN: (1, 0)}
FREE, WALL = 1.0, 0.0
REWARDS = {"cheese": 1.0, "move": -0.04, "revisit": -0.25, "wall": -0.75}

MAZE = np.array([
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
    [0, 0, 1, 0, 0, 1, 0, 1, 1, 1],
    [1, 1, 0, 1, 0, 1, 0, 0, 0, 1],
    [1, 1, 0, 1, 0, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 1],
], dtype=float)


class QMaze:
    n_actions = 4

    def __init__(self, maze=MAZE, start=(0, 0), rewards=REWARDS, random_start=False):
        self.maze = np.array(maze, dtype=float)
        self.rows, self.cols = self.maze.shape
        self.n_states = self.rows * self.cols
        self.target = (self.rows - 1, self.cols - 1)
        self.free_cells = [(r, c) for r in range(self.rows) for c in range(self.cols)
                           if self.maze[r, c] == FREE and (r, c) != self.target]
        self.start = start
        self.rewards = rewards
        self.random_start = random_start
        self.min_reward = -0.5 * self.maze.size
        self.rng = np.random.default_rng()
        self.reset()

    def reset(self, seed=None):
        if seed is not None:
            self.rng = np.random.default_rng(seed)
        if self.random_start:
            self.cell = self.free_cells[self.rng.integers(len(self.free_cells))]
        else:
            self.cell = self.start
        self.visited = set()
        self.total = 0.0
        return self.state(), {}

    def state(self):
        row, col = self.cell
        return row * self.cols + col

    def is_free(self, row, col):
        return 0 <= row < self.rows and 0 <= col < self.cols and self.maze[row, col] == FREE

    def step(self, action):
        self.visited.add(self.cell)
        row, col = self.cell
        d_row, d_col = MOVES[action]
        if self.is_free(row + d_row, col + d_col):
            self.cell = (row + d_row, col + d_col)
            if self.cell == self.target:
                reward = self.rewards["cheese"]
            elif self.cell in self.visited:
                reward = self.rewards["revisit"]
            else:
                reward = self.rewards["move"]
        else:
            reward = self.rewards["wall"]
        self.total += reward
        terminated = self.cell == self.target
        truncated = not terminated and self.total < self.min_reward
        return self.state(), reward, terminated, truncated, {}
```

This is now how Gymnasium environments handle randomness, done by hand:

- **The environment owns a random generator**, `self.rng`. `reset(seed=4)` replaces it with one made from seed 4, and `reset()` without a seed keeps using the current one. So seeding the **first** `reset` makes every later episode's start repeatable, which is what `train` does (lesson 1.4).
- **`self.free_cells[self.rng.integers(len(self.free_cells))]`** picks a random position in the list (0 to 73) and takes the cell there.
- **`random_start=False`** by default, so the windows and `greedy_path` still start where they're told.

```check
run ".venv/Scripts/python -m pytest -q tests/test_rewards.py -k anywhere" label="random starts land on free cells, repeatably with a seed, and only when asked for" -- reset(seed) remakes self.rng from the seed; with random_start, pick self.free_cells[self.rng.integers(len(self.free_cells))].
```

## Four sets of rewards

Now train, and break the rules on purpose. Make `rewards.py` this:

```python file=rewards.py
from collections import Counter

from agent import QAgent
from maze_tools import completion, greedy_path
from qmaze import MAZE, REWARDS, QMaze
from train import train

VARIANTS = {
    "classic": REWARDS,
    "only the cheese": {"cheese": 1.0, "move": 0.0, "revisit": 0.0, "wall": 0.0},
    "no revisit penalty": {**REWARDS, "revisit": REWARDS["move"]},
    "no wall penalty": {**REWARDS, "wall": REWARDS["move"]},
}


def train_maze(rewards=REWARDS, episodes=500, seed=0, maze=MAZE):
    env = QMaze(maze, rewards=rewards, random_start=True)
    agent = QAgent(env.n_states, env.n_actions, alpha=0.1, gamma=0.9, epsilon=0.1, seed=seed)
    train(env, agent, episodes, seed=seed)
    return agent


def how_it_ends(path, reached):
    if reached:
        return "reached the cheese"
    last = set(path[-20:])
    if len(last) == 1:
        return "stands still against a wall"
    if len(last) == 2:
        return "steps back and forth"
    return "wanders"


def endings(agent, maze=MAZE):
    return Counter(how_it_ends(*greedy_path(agent, maze, cell)) for cell in QMaze(maze).free_cells)


if __name__ == "__main__":
    for name, rewards in VARIANTS.items():
        wins = [completion(train_maze(rewards, seed=seed))[0] for seed in range(10)]
        print(f"{name:20} starts solved, of 74, for seeds 0-9: {wins}")
        print(f"{'':20} seed 0's endings: {dict(endings(train_maze(rewards)))}")
```

**`train_maze`'s inputs:** `rewards`, the reward dictionary to train with (the one thing each experiment changes); `episodes` (500); `seed`, so a run can be repeated exactly and ten different seeds give ten independent agents; and `maze`, for lesson 3.4. It returns the trained agent.

- **`train_maze`** is the whole recipe: a maze with random starts, Chapter 1's agent (α = 0.1, γ = 0.9, ε = 0.1, the tutorial's ε), and 500 episodes. With 100 states it takes about a fifth of a second.
- **Each variant changes one thing** compared with `classic`. "No wall penalty" makes a bump cost the same as a move, −0.04. "No revisit penalty" makes going back cost the same as a move. "Only the cheese" removes every penalty.
- **`Counter`** counts how many times each value appears: `Counter(["a", "b", "a"])` is `{"a": 2, "b": 1}`. `endings` counts how each of the 74 starts ends, and `how_it_ends(*greedy_path(...))` unpacks the `(path, reached)` pair into its two arguments.

It trains 44 agents, so it takes about half a minute. Predict first:

```predict
question: With ONLY the cheese rewarded (no penalties at all), how many of the 74 starts will the trained agent solve?
choice: Very few: without penalties it has no reason to hurry
choice: About half
choice: All 74, for every seed
answer: All 74, for every seed
explain: All 74, for all 10 seeds, and the routes are nearly as short as the classic agent's (0.32 moves longer than the shortest possible, on average, against 0.28). The penalties aren't needed to find the cheese, because γ already makes the agent hurry: the cheese is worth γ^k when it's k steps away, so a shorter route is always worth more (0.9⁴⁰ is 0.0148, while 0.9⁴² is 0.0120). Discounting alone is a pressure to be quick. Try it: `for k in (38, 40, 42): print(k, round(0.9 ** k, 4))`.
verify: .venv/Scripts/python -c "from maze_tools import completion; from rewards import VARIANTS, train_maze; w = [completion(train_maze(VARIANTS['only the cheese'], seed=s))[0] for s in range(10)]; print('All 74, for every seed' if w == [74] * 10 else w)"
```

```predict
question: With bumps costing only −0.04 (no wall penalty), how will most of the failing starts end?
choice: Standing still against a wall
choice: Stepping back and forth
choice: Wandering in a bigger loop
answer: Standing still against a wall
explain: Seed 0's agent stands still against a wall from 50 of the 74 starts, choosing to bump the same wall forever, and only 24 starts reach the cheese. Across ten seeds, between 19 and 31 starts are solved.
verify: script wall_endings.py
```

```text
classic              starts solved, of 74, for seeds 0-9: [74, 74, 74, 74, 74, 74, 74, 74, 74, 74]
                     seed 0's endings: {'reached the cheese': 74}
only the cheese      starts solved, of 74, for seeds 0-9: [74, 74, 74, 74, 74, 74, 74, 74, 74, 74]
                     seed 0's endings: {'reached the cheese': 74}
no revisit penalty   starts solved, of 74, for seeds 0-9: [58, 59, 60, 58, 57, 60, 66, 60, 53, 59]
                     seed 0's endings: {'steps back and forth': 16, 'reached the cheese': 58}
no wall penalty      starts solved, of 74, for seeds 0-9: [24, 26, 31, 23, 19, 25, 24, 25, 25, 27]
                     seed 0's endings: {'stands still against a wall': 50, 'reached the cheese': 24}
```

Read it carefully, because it's backwards from what the penalties' names suggest. With **no penalties at all**, the agent is perfect. It's **removing one penalty while keeping the step cost** that breaks it. So the wall and revisit penalties aren't there to guide the rat to the cheese. They're there to repair a side effect of the −0.04 **step cost**.

**The side effect: with a step cost, standing still is almost as good as getting there.** Work it out with γ = 0.9 for a rat 40 moves from the cheese:

```text
walk to the cheese:     39 moves at -0.04, then +1 at move 40
                        -0.04 x (1 + 0.9 + 0.9^2 + ... + 0.9^38)  +  0.9^39 x 1
                        = -0.393 + 0.016 = -0.377

bump a wall forever:    -0.04 every step, for ever
                        -0.04 x (1 + 0.9 + 0.9^2 + ...)  =  -0.04 / (1 - 0.9)  =  -0.400
```

Both lines are **geometric series**, from lesson 2.4: each term is γ times the one before. Bumping forever is the endless kind, whose sum is first term ÷ (1 − γ), so −0.04 ÷ 0.1 = −0.4. Walking stops after 39 costs, so its costs add up to a little less than −0.4, and then the cheese adds its discounted +1.

See how the gap depends on the distance with a loop, in a scratch file:

```python
gamma = 0.9
bump = -0.04 / (1 - gamma)
for k in (1, 5, 10, 20, 30, 40):
    walk = sum(-0.04 * gamma ** t for t in range(k - 1)) + gamma ** (k - 1) * 1.0
    print(f"{k:3} moves away: walk {walk:+.3f}   bump forever {bump:+.3f}   difference {walk - bump:.3f}")
```

`range(k - 1)` gives the k − 1 paid moves (t = 0, 1, … k − 2), and the cheese arrives on move k, discounted k − 1 times. The output:

```text
  1 moves away: walk +1.000   bump forever -0.400   difference 1.400
  5 moves away: walk +0.519   bump forever -0.400   difference 0.919
 10 moves away: walk +0.142   bump forever -0.400   difference 0.542
 20 moves away: walk -0.211   bump forever -0.400   difference 0.189
 30 moves away: walk -0.334   bump forever -0.400   difference 0.066
 40 moves away: walk -0.377   bump forever -0.400   difference 0.023
```

Next to the cheese, walking wins by a mile. Far away, the difference almost vanishes. So the agent stalls at the cells **farthest** from the cheese, and that's what happens: seed 0's "no wall penalty" agent reaches the cheese from every start within 15 moves of it, and stalls from every start more than 19 moves away.

Two things make these so close. The cheese's +1 arrives 40 steps from now, so it's discounted to 0.016. And the endless costs of bumping are discounted too: a cost far in the future counts for almost nothing, so even paying −0.04 forever adds up to only −0.4. The difference between succeeding and giving up is 0.023, smaller than the noise in values that are still being learned. So some cells settle on "bump this wall", and once a bump is the greedy choice there, the rat never leaves.

The −0.75 wall penalty breaks the tie: one bump now costs more than the whole difference. The −0.25 revisit penalty does the same for the other cheap way to stall, stepping back and forth. **With no step cost** there's nothing to tie with: standing still earns exactly 0 forever, and the cheese is worth more than 0 from everywhere, so the agent never stalls.

The general lesson, which you'll meet again in Pac-Man (Chapter 7): **every shaping reward changes the problem**, and you only find out how by measuring. "Discourage wasted moves" sounded harmless, and created a new way to fail that two more penalties then had to fix.

```check
run ".venv/Scripts/python -m pytest -q tests/test_rewards.py -k variants" label="the four variants each change one reward, and train_maze trains an agent on the maze"
run ".venv/Scripts/python -m pytest -q tests/test_rewards.py" label="all lesson 3.2 tests pass"
```

### What you have

Chapter 1's agent solving QMaze from all 74 starts, tools to see where an agent goes and how it fails, and a measured understanding of the tutorial's rewards: the step cost creates a stalling problem, and the wall and revisit penalties exist to fix it. Next lesson checks whether "solves" means "solves well": is each route the shortest one?
