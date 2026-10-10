---
title: 3.5 — Reading the Tutorial's Code
runtime: python
run: bug_matters.py
---

### The story so far

Your `QMaze` (`qmaze.py`, lesson 3.1) charges −0.04 for a move, −0.25 for moving back onto a cell visited this game, −0.75 for walking into a wall, and pays +1 for the cheese. Lesson 3.2 found out why the wall penalty matters: with a step cost and no wall penalty, the rat learns to stand still against a wall instead of walking to the cheese. `train_maze(rewards, seed=…)` (`rewards.py`) trains an agent with any rewards you choose, and `completion(agent)` (`maze_tools.py`) counts how many of the 74 starts it solves.

### What this lesson asks

You've built QMaze your own way. Your course almost certainly uses the tutorial's code, or something descended from it, and the most useful skill this chapter can end with is **reading** that code: knowing which part does what, where it differs from yours, and whether its differences matter.

This lesson types in the tutorial's environment exactly as published (Samy Zafrany, *Deep Reinforcement Learning for Maze Solving*, samyzaf.com/ML/rl/qmaze.html; the training code that goes with it is Chapter 5's subject). You'll find that one of its rewards can never happen, work out why from two small slips, fix them, and then measure whether fixing them changes anything.

### How the pieces fit

```text
classic.py
  Qmaze            the tutorial's code, exactly as published (the "published" tests record what it really does)
    └── FixedQmaze   a subclass: inherits everything, replaces update_state and get_reward ("fixed" tests)

bug_matters.py     trains YOUR QMaze twice: walls at -0.75 (intended) and -0.25 (what the tutorial really charges)
```

The tutorial's class is only read and tested here. The measuring uses your own `QMaze`, with the tutorial's real wall cost plugged into its `rewards` dictionary, because your agent already knows how to train on it.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_classic.py** above.

```python file=tests/test_classic.py provided
# Tests for classic.py (lesson 3.5).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_classic.py
from qmaze import MAZE

LEFT, UP, RIGHT, DOWN = 0, 1, 2, 3


def test_published_first_move_costs_a_little():
    from classic import Qmaze
    assert Qmaze(MAZE).act(DOWN)[1:] == (-0.04, "not_over")


def test_published_bump_costs_only_a_quarter():
    from classic import Qmaze
    assert Qmaze(MAZE).act(UP)[1:] == (-0.25, "not_over"), "not the -0.75 the code seems to say"


def test_published_bump_keeps_the_old_mode():
    from classic import Qmaze
    maze = Qmaze(MAZE)
    maze.act(DOWN)
    maze.act(UP)
    maze.act(RIGHT)
    assert maze.state == (0, 0, "valid"), "the bump never records 'invalid'"


def test_published_lose_after_two_hundred_and_one_bumps():
    from classic import Qmaze
    maze = Qmaze(MAZE)
    statuses = [maze.act(UP)[2] for _ in range(201)]
    assert statuses[-2] == "not_over" and statuses[-1] == "lose"


def test_fixed_bump_costs_three_quarters():
    from classic import FixedQmaze
    maze = FixedQmaze(MAZE)
    assert maze.act(UP)[1:] == (-0.75, "not_over")
    assert maze.state == (0, 0, "invalid")


def test_fixed_bump_after_moving_still_costs_three_quarters():
    from classic import FixedQmaze
    maze = FixedQmaze(MAZE)
    maze.act(DOWN)
    maze.act(UP)
    assert maze.act(RIGHT)[1:] == (-0.75, "not_over")


def test_fixed_revisit_still_costs_a_quarter():
    from classic import FixedQmaze
    maze = FixedQmaze(MAZE)
    maze.act(DOWN)
    assert maze.act(UP)[1:] == (-0.25, "not_over")


def test_published_observation_is_the_maze_with_the_rat():
    from classic import Qmaze
    envstate, _, _ = Qmaze(MAZE).act(DOWN)
    assert envstate.shape == (1, 100) and envstate[0, 10] == 0.5


def test_fixed_is_still_a_qmaze():
    from classic import FixedQmaze, Qmaze
    assert issubclass(FixedQmaze, Qmaze)
    assert FixedQmaze(MAZE).act(DOWN)[1:] == (-0.04, "not_over")


def test_measured_with_the_tutorials_real_wall_cost():
    from bug_matters import AS_PUBLISHED
    from qmaze import REWARDS
    assert AS_PUBLISHED == {**REWARDS, "wall": -0.25}
```

What each group protects:

| group | it makes sure that… | a bug it would catch |
|---|---|---|
| `published` | your copy of the tutorial's class behaves exactly as the tutorial's does, slips included: a bump costs −0.25, the mode never becomes 'invalid', the game is lost on the 201st bump, and the observation is the maze with the rat as 0.5 | "tidying" the copy while typing it, so it no longer shows what your course's code does |
| `fixed` | the subclass charges −0.75 for a bump, from the start and after moving, still charges −0.25 for a revisit, and inherits everything else from `Qmaze` | fixing one slip but not the other (the next steps show why either alone isn't enough) |
| `measured` | the experiment uses the wall cost the tutorial really gives, −0.25 | measuring the wrong thing: −0.75 against −0.75 |

**The losing test, worked out.** A published bump costs −0.25 and the limit is −50, so 200 bumps total exactly −50.0, which is not *below* −50, and the 201st makes it −50.25:

```python
total = 0
for bump in range(1, 202):
    total += -0.25
    if bump >= 199:
        print(bump, total, "lose" if total < -50 else "not_over")
```

```text
199 -49.75 not_over
200 -50.0 not_over
201 -50.25 lose
```

(Your `QMaze`'s bumps cost −0.75, so it loses after 67, lesson 3.1's test.)

Look at the message on `test_published_bump_costs_only_a_quarter`: *"not the −0.75 the code seems to say"*. The tests for the **published** code describe what it really does, which isn't always what it looks like it does. The `fixed` tests describe what it was meant to do.

```check
file tests/test_classic.py -- Click "Create provided tests/test_classic.py" above.
```

## The tutorial's rules, as published

Create `classic.py`, exactly as below. Its style differs from yours on purpose (names like `nrows`, a `state` that's a tuple, `object` in the class line): it's the tutorial's code, with only its comments and the drawing helpers it doesn't need here left out.

```python file=classic.py
import numpy as np

LEFT, UP, RIGHT, DOWN = 0, 1, 2, 3
rat_mark = 0.5


class Qmaze(object):
    def __init__(self, maze, rat=(0, 0)):
        self._maze = np.array(maze)
        nrows, ncols = self._maze.shape
        self.target = (nrows - 1, ncols - 1)
        self.free_cells = [(r, c) for r in range(nrows) for c in range(ncols) if self._maze[r, c] == 1.0]
        self.free_cells.remove(self.target)
        self.reset(rat)

    def reset(self, rat):
        self.rat = rat
        self.maze = np.copy(self._maze)
        row, col = rat
        self.maze[row, col] = rat_mark
        self.state = (row, col, 'start')
        self.min_reward = -0.5 * self.maze.size
        self.total_reward = 0
        self.visited = set()

    def update_state(self, action):
        nrows, ncols = self.maze.shape
        nrow, ncol, nmode = rat_row, rat_col, mode = self.state

        if self.maze[rat_row, rat_col] > 0.0:
            self.visited.add((rat_row, rat_col))

        valid_actions = self.valid_actions()

        if not valid_actions:
            nmode = 'blocked'
        elif action in valid_actions:
            nmode = 'valid'
            if action == LEFT:
                ncol -= 1
            elif action == UP:
                nrow -= 1
            if action == RIGHT:
                ncol += 1
            elif action == DOWN:
                nrow += 1
        else:
            mode = 'invalid'

        self.state = (nrow, ncol, nmode)

    def get_reward(self):
        rat_row, rat_col, mode = self.state
        nrows, ncols = self.maze.shape
        if rat_row == nrows - 1 and rat_col == ncols - 1:
            return 1.0
        if mode == 'blocked':
            return self.min_reward - 1
        if (rat_row, rat_col) in self.visited:
            return -0.25
        if mode == 'invalid':
            return -0.75
        if mode == 'valid':
            return -0.04

    def act(self, action):
        self.update_state(action)
        reward = self.get_reward()
        self.total_reward += reward
        status = self.game_status()
        envstate = self.observe()
        return envstate, reward, status

    def observe(self):
        canvas = self.draw_env()
        envstate = canvas.reshape((1, -1))
        return envstate

    def draw_env(self):
        canvas = np.copy(self.maze)
        nrows, ncols = self.maze.shape
        for r in range(nrows):
            for c in range(ncols):
                if canvas[r, c] > 0.0:
                    canvas[r, c] = 1.0
        row, col, valid = self.state
        canvas[row, col] = rat_mark
        return canvas

    def game_status(self):
        if self.total_reward < self.min_reward:
            return 'lose'
        rat_row, rat_col, mode = self.state
        nrows, ncols = self.maze.shape
        if rat_row == nrows - 1 and rat_col == ncols - 1:
            return 'win'
        return 'not_over'

    def valid_actions(self, cell=None):
        if cell is None:
            row, col, mode = self.state
        else:
            row, col = cell
        actions = [0, 1, 2, 3]
        nrows, ncols = self.maze.shape
        if row == 0:
            actions.remove(1)
        elif row == nrows - 1:
            actions.remove(3)
        if col == 0:
            actions.remove(0)
        elif col == ncols - 1:
            actions.remove(2)
        if row > 0 and self.maze[row - 1, col] == 0.0:
            actions.remove(1)
        if row < nrows - 1 and self.maze[row + 1, col] == 0.0:
            actions.remove(3)
        if col > 0 and self.maze[row, col - 1] == 0.0:
            actions.remove(0)
        if col < ncols - 1 and self.maze[row, col + 1] == 0.0:
            actions.remove(2)
        return actions

```

How it maps onto your `QMaze`:

| tutorial | yours | notes |
|---|---|---|
| `Qmaze(maze, rat=(0, 0))` | `QMaze(maze, start=(0, 0))` | |
| `reset(rat)` | `reset(seed)` | the tutorial's caller chooses the start; yours picks randomly from a seed |
| `self.state = (row, col, mode)` | `self.cell` | the tutorial also stores a **mode**: 'start', 'valid', 'invalid' or 'blocked' |
| `act(action)` → `envstate, reward, status` | `step(action)` → `state, reward, terminated, truncated, info` | |
| status `'win'` | `terminated` | |
| status `'lose'` | `truncated` | see the last step |
| `observe()`, shape `(1, 100)` | `observe(env)` from lesson 3.4, shape `(100,)` | |
| `valid_actions()` | nothing | the tutorial's training explores only valid moves; your agent may try any, and pays for walls |
| `self.maze` with the rat marked 0.5 | `self.maze` unchanged | the tutorial writes the rat into its maze copy; `draw_env` cleans it up for the observation |

**What each method is for**, in the order `act` uses them:

| method | its job | gives back |
|---|---|---|
| `update_state(action)` | moves the rat if the move is allowed, and records how it went in the **mode** | nothing; it changes `self.state` |
| `get_reward()` | looks at the new state and decides the reward | one number |
| `game_status()` | 'win', 'lose' or 'not_over' | a string |
| `observe()` | the maze as 100 numbers, rat as 0.5, in a batch of one | an array of shape `(1, 100)` |
| `valid_actions(cell)` | which of the four actions don't hit a wall or the edge | a list, e.g. `[3]` at (0, 0): only DOWN |

`get_reward` checks the rules **in order** and returns at the first that applies: the cheese, a blocked rat (no valid moves at all, which can't happen in this maze), a visited cell, an invalid move, and finally an ordinary valid move.

Before running the tests, predict:

```predict
question: The rat is at (0, 0) and the first action is UP, straight into the top edge. What reward does the published code give?
choice: -0.75, the invalid-move penalty
choice: -0.25, the revisit penalty
choice: -0.04, an ordinary move
answer: -0.25, the revisit penalty
explain: −0.25. Over a 2,000-step random walk, measured while this lesson was written, −0.25 was the **only** reward the published code ever gave for an invalid move: −0.75 never happened once. The next step explains the two slips that cause it.
verify: .venv/Scripts/python -c "from classic import Qmaze; from qmaze import MAZE; r = Qmaze(MAZE).act(1)[1]; print('-0.25, the revisit penalty' if r == -0.25 else r)"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_classic.py -k published" label="classic.py behaves exactly as the tutorial's code does" -- Copy the code exactly, including the line that reads mode = 'invalid'. These tests check what the published code really does.
```

## Two small slips

Trace `act(UP)` from (0, 0) at the start of an episode. `self.state` is `(0, 0, 'start')`.

**In `update_state`:**

1. `nrow, ncol, nmode = rat_row, rat_col, mode = self.state` is a **chained assignment**: it unpacks the same tuple into two sets of names. Now `rat_row`, `rat_col`, `mode` hold the old state, and `nrow`, `ncol`, `nmode` start as copies of it, ready to become the new state: (0, 0, 'start').
2. The rat's cell is free (1.0 > 0.0), so (0, 0) is **added to `visited`**, before any move happens.
3. `valid_actions()` is `[3]`: only DOWN. UP isn't in it, so the code reaches `else: mode = 'invalid'`.
4. **Slip 1:** that sets `mode`, the **old** state's name, which nothing reads after this line. The new state is built from `nmode`, still `'start'`. So `self.state` becomes `(0, 0, 'start')`: nothing records that the move was invalid.

   See slip 1 on its own, in a scratch file:

   ```python
   state = (0, 0, 'start')
   nrow, ncol, nmode = rat_row, rat_col, mode = state
   mode = 'invalid'
   print("old:", rat_row, rat_col, mode)
   print("new:", (nrow, ncol, nmode))
   ```

   ```text
   old: 0 0 invalid
   new: (0, 0, 'start')
   ```

   After the chained assignment, `mode` and `nmode` are two separate names. Changing one doesn't change the other, and only the "new" one is saved.

**In `get_reward`:** the rat is at (0, 0), and the mode is 'start'.

5. Not the cheese. Not blocked.
6. **Slip 2:** is (0, 0) in `visited`? **Yes**: step 2 put it there. So it returns **−0.25** and stops, before ever reaching the invalid check.

Either slip on its own is enough to hide the wall penalty. With slip 1 fixed, the mode would be 'invalid', but the visited check still comes first and still matches, because a rat that bumps a wall stays on its own cell, which `update_state` always adds to `visited` first. With slip 2 fixed (invalid checked first), the mode still isn't 'invalid', so the check never matches. **Both** must be fixed.

These are ordinary bugs: one variable name instead of another, two `if`s in the wrong order. Nothing crashes, and the agent still learns, which is why they survive. Your tests found them because they compare what the code **does** with what it **should** do, on one specific, hand-checked move.

## Your turn: fix it

**Build, on your own:** a class `FixedQmaze` in `classic.py` that fixes both slips.

Don't change `Qmaze`: the `published` tests must keep passing, as a record of what the tutorial does. Instead, write a **subclass**, `class FixedQmaze(Qmaze):`, below it. A subclass inherits every method of the class it names, and can **override** some of them by defining a method of the same name. `FixedQmaze` needs to override exactly two:

- `update_state`, identical to the original except that the invalid branch sets **`nmode`**;
- `get_reward`, identical except that the **invalid** check comes **before** the visited check.

Everything else (`reset`, `act`, `valid_actions`, `observe`…) is inherited unchanged, which is what `test_fixed_is_still_a_qmaze` checks.

```hints
nudge: Copy the two methods into the new class, and change one line in the first and swap two `if` blocks in the second.
concept: `class FixedQmaze(Qmaze):` then both methods. In `update_state`, `else: nmode = 'invalid'`. In `get_reward`, the order becomes: cheese, blocked, invalid, visited, valid.
answer: Add to the end of `classic.py`:
~~~python
class FixedQmaze(Qmaze):
    def update_state(self, action):
        nrows, ncols = self.maze.shape
        nrow, ncol, nmode = rat_row, rat_col, mode = self.state

        if self.maze[rat_row, rat_col] > 0.0:
            self.visited.add((rat_row, rat_col))

        valid_actions = self.valid_actions()

        if not valid_actions:
            nmode = 'blocked'
        elif action in valid_actions:
            nmode = 'valid'
            if action == LEFT:
                ncol -= 1
            elif action == UP:
                nrow -= 1
            if action == RIGHT:
                ncol += 1
            elif action == DOWN:
                nrow += 1
        else:
            nmode = 'invalid'

        self.state = (nrow, ncol, nmode)

    def get_reward(self):
        rat_row, rat_col, mode = self.state
        nrows, ncols = self.maze.shape
        if rat_row == nrows - 1 and rat_col == ncols - 1:
            return 1.0
        if mode == 'blocked':
            return self.min_reward - 1
        if mode == 'invalid':
            return -0.75
        if (rat_row, rat_col) in self.visited:
            return -0.25
        if mode == 'valid':
            return -0.04
~~~
`act` in `Qmaze` calls `self.update_state(action)` and `self.get_reward()`. For a `FixedQmaze`, `self` is a `FixedQmaze`, so Python finds the overriding versions first. That's how a subclass changes behaviour without editing the original.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_classic.py -k fixed" label="FixedQmaze charges -0.75 for a bump, keeps -0.25 for revisits, and inherits the rest" -- Subclass Qmaze; in update_state set nmode = 'invalid'; in get_reward test mode == 'invalid' before the visited check.
run ".venv/Scripts/python -m pytest -q tests/test_classic.py -k published" label="and the published Qmaze is unchanged"
```

## Does the bug matter?

A bug that never changes a result is still worth knowing about, but it's not worth panicking over. Measure it. Lesson 3.2 showed that **with** a step cost, the wall penalty is what stops the rat standing still. The published code effectively uses −0.25 for walls. Is that enough? Create `bug_matters.py`:

```python file=bug_matters.py
from maze_tools import completion
from qmaze import REWARDS
from rewards import train_maze

AS_PUBLISHED = {**REWARDS, "wall": -0.25}


if __name__ == "__main__":
    print("bumps cost -0.75, as intended: ", [completion(train_maze(seed=seed))[0] for seed in range(10)])
    print("bumps cost -0.25, as published:", [completion(train_maze(AS_PUBLISHED, seed=seed))[0] for seed in range(10)])
```

It trains your QMaze agent (lesson 3.2's `train_maze`) with walls costing −0.75, as intended, and with −0.25, as the tutorial really does, ten seeds each, and runs the completion check.

```predict
question: With bumps costing only -0.25, how many of the 10 agents will solve all 74 starts?
answer: 10
tolerance: 0
explain: All 10, exactly as with −0.75. So for this maze, with a table, the bug changes nothing you can measure. Lesson 3.2's arithmetic says why: standing still against a wall was only 0.023 worse than walking to the cheese when a bump cost −0.04. A bump costing −0.25 is more than ten times that margin, so it breaks the tie as well as −0.75 does. Removing the wall penalty altogether (lesson 3.2) mattered. Weakening it this much doesn't.
verify: .venv/Scripts/python -c "from bug_matters import AS_PUBLISHED; from maze_tools import completion; from rewards import train_maze; print(sum(completion(train_maze(AS_PUBLISHED, seed=s))[0] == 74 for s in range(10)))"
```

```text
bumps cost -0.75, as intended:  [74, 74, 74, 74, 74, 74, 74, 74, 74, 74]
bumps cost -0.25, as published: [74, 74, 74, 74, 74, 74, 74, 74, 74, 74]
```

That's a common, useful outcome: a real bug whose effect is too small to see in this setting. It could still matter elsewhere, in a bigger maze or for a network agent, and you now have a test that would show it.

```check
run ".venv/Scripts/python -m pytest -q tests/test_classic.py -k measured" label="bug_matters uses the wall cost the tutorial really gives"
run ".venv/Scripts/python -m pytest -q tests/test_classic.py" label="all lesson 3.5 tests pass"
```

## Losing is not an ending

One more difference, and this one isn't a slip in the environment, but a choice in the tutorial's training code, which you'll write in Chapter 5. When `act` returns the status 'lose', the training loop sets `game_over = True`, exactly as for 'win', and the learning target for that last step becomes **just the reward**, with no future value added.

In numbers, with γ = 0.9: the rat bumps a wall (reward −0.75) and that bump takes the total below −50. Say the best score in its cell's row is −0.3.

```text
the tutorial (treats 'lose' as an ending):   target = -0.75                       = -0.75
yours (truncated, so the future counts):     target = -0.75 + 0.9 × (-0.3)        = -1.02
```

That treats running out of reward as the maze **ending**, like reaching the cheese. It isn't: the rat was simply cut off. This is lesson 1.1's distinction between terminated and truncated, and lesson 1.3's reason for keeping them apart: after a true ending nothing more can come, but after a cut-off the future still had value. Your `QMaze` reports a loss as `truncated`, and your agent's update keeps the next cell's value.

In practice, for QMaze, treating a loss as an ending mostly gives the cells where the rat tends to give up slightly wrong values: in the example above, −0.75 instead of −1.02, a little better than they really are, because the costs still to come are left out. For QMaze that's harmless. In other problems it isn't. CartPole's 500-step limit is the classic case: an agent that treats "reached 500 steps" as "fell" learns that balancing perfectly leads to failure.

### What you've learned in this chapter

- QMaze as an environment, with the tutorial's maze, rewards and losing rule, and random starts;
- tools to judge a maze agent: greedy paths, the completion check, breadth-first search as an oracle, extra moves over the shortest route;
- what shaping rewards really do, measured: the step cost creates a stalling problem, and the wall and revisit penalties exist to fix it;
- the Markov property, and why a state is a design decision;
- that a table can't generalise to a new maze, and what the tutorial's agent sees instead: the whole maze as 100 numbers;
- the tutorial's own code: how it maps onto yours, two slips that hide its wall penalty, a fix by subclassing, and a measurement showing the slip doesn't matter here.

Both school problems are now solved with tables. Chapter 4 builds the function that replaces the table, a neural network, from a single straight line up to PyTorch and Keras, so that Chapter 5 can solve QMaze the way the tutorial does.
