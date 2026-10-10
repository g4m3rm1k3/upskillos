---
title: 3.1 — The Maze Game
track: Q-Arcade — QMaze with a Table
trackOrder: 12.4
runtime: python
run: play_qmaze.py
---

**Starting a new chapter:** every Q-Arcade chapter uses the same `q-arcade` folder, so your files carry straight on. If the file tree is ever empty, click **Choose folder…** and select `q-arcade`.

**QMaze** is the second school problem: a rat in a 10 × 10 maze has to find the cheese in the bottom-right corner. Most courses teach it from one public tutorial, Samy Zafrany's *Deep Reinforcement Learning for Maze Solving* (samyzaf.com/ML/rl/qmaze.html). This chapter builds the same maze, with the same rules and the same reward numbers, so that its code will look familiar when you meet your course's version. Lesson 3.5 then reads the tutorial's own code side by side with yours, including a bug in it.

### The story so far

Chapter 1 built a Q-learning agent on a five-square corridor. The corridor told the agent which square it was on as one whole number (its **state**), the agent kept a **table** of scores with one row per state and one column per move, and after every move it nudged one score towards a better guess. Chapter 2 put the same agent on CartPole, where the state was four decimals, and had to squash them into one row number first.

The agent never cared what the world looked like. It only needed the world to have two methods, copied from Gymnasium: `reset()`, which starts a game and returns the first state, and `step(action)`, which makes one move and returns five values, `(state, reward, terminated, truncated, info)`. Any world with those two methods, and states numbered 0, 1, 2…, can be learned by the same agent.

### What's new here

Two things are new compared with the corridor: the world is two-dimensional, and the rewards are designed to push the rat towards good behaviour on the way, not just at the end. This lesson builds the maze, with the same `reset` and `step` as before, and lets you play it.

### How the pieces fit

```text
qmaze.py          the rules: where the walls are, what each move does, what it pays
   │                (QMaze, with reset() and step(action), just like the corridor)
   ├── maze_view.py    draws a QMaze: walls, floor, cheese, rat
   └── play_qmaze.py   a window: your arrow keys call env.step, maze_view draws the result
```

Next lesson, the agent takes your place: instead of arrow keys choosing the actions, `agent.act(state)` will.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_qmaze.py** above.

```python file=tests/test_qmaze.py provided
# Tests for qmaze.py, maze_view.py and play_qmaze.py (lesson 3.1).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_qmaze.py
import pygame


def test_layout_of_the_classic_maze():
    from qmaze import MAZE, QMaze
    env = QMaze()
    assert MAZE.shape == (10, 10) and env.n_states == 100
    assert env.target == (9, 9) and len(env.free_cells) == 74
    assert (9, 9) not in env.free_cells, "the cheese's cell is not a place to start"


def test_layout_state_is_the_cell_number():
    from qmaze import QMaze
    env = QMaze(start=(2, 3))
    state, info = env.reset()
    assert state == 2 * 10 + 3 and info == {}


def test_moves_go_where_they_say():
    from qmaze import DOWN, RIGHT, QMaze
    env = QMaze()
    env.reset()
    assert env.step(DOWN)[0] == 10, "(0, 0) down to (1, 0)"
    assert env.step(RIGHT)[0] == 11, "(1, 0) right to (1, 1)"


def test_moves_cost_a_little():
    from qmaze import DOWN, QMaze
    env = QMaze()
    env.reset()
    _, reward, terminated, truncated, _ = env.step(DOWN)
    assert reward == -0.04 and terminated is False and truncated is False


def test_moves_onto_the_cheese_win():
    from qmaze import RIGHT, QMaze
    env = QMaze(start=(9, 8))
    env.reset()
    _, reward, terminated, _, _ = env.step(RIGHT)
    assert reward == 1.0 and terminated is True


def test_walls_block_and_cost_more():
    from qmaze import RIGHT, UP, QMaze
    env = QMaze()
    env.reset()
    state, reward, _, _, _ = env.step(RIGHT)
    assert state == 0 and reward == -0.75, "(0, 1) is a wall"
    state, reward, _, _, _ = env.step(UP)
    assert state == 0 and reward == -0.75, "and above (0, 0) is the edge"


def test_revisit_costs_more_than_a_new_cell():
    from qmaze import DOWN, UP, QMaze
    env = QMaze()
    env.reset()
    env.step(DOWN)
    _, reward, _, _, _ = env.step(UP)
    assert reward == -0.25, "back onto (0, 0), where the rat has been"


def test_revisit_memory_starts_empty_each_episode():
    from qmaze import DOWN, UP, QMaze
    env = QMaze()
    env.reset()
    env.step(DOWN)
    env.step(UP)
    env.reset()
    assert env.visited == set() and env.total == 0.0
    assert env.step(DOWN)[1] == -0.04


def test_limit_of_total_reward_ends_a_hopeless_episode():
    from qmaze import RIGHT, QMaze
    env = QMaze()
    env.reset()
    assert env.min_reward == -50.0
    for _ in range(66):
        assert env.step(RIGHT)[3] is False
    _, _, terminated, truncated, _ = env.step(RIGHT)
    assert truncated is True and terminated is False, "67 bumps: -50.25, below -50"


def test_view_puts_cells_on_a_grid():
    from maze_view import CELL, MARGIN, TOP, cell_rect
    assert cell_rect(0, 0).topleft == (MARGIN, TOP)
    assert cell_rect(2, 3).topleft == (MARGIN + 3 * CELL, TOP + 2 * CELL)


def test_play_keys_choose_actions():
    from play_qmaze import KEYS
    from qmaze import DOWN, LEFT, RIGHT, UP
    assert KEYS == {pygame.K_LEFT: LEFT, pygame.K_UP: UP, pygame.K_RIGHT: RIGHT, pygame.K_DOWN: DOWN}


def test_play_window_opens_and_closes():
    from play_qmaze import run
    assert run(max_frames=2) == 2
```

The test names are grouped by their first word, and each step below checks its own group with `pytest -k <word>`. What each group protects:

| group | it makes sure that… | a bug it would catch |
|---|---|---|
| `layout` | the maze is 10 × 10, the cheese is at (9, 9), there are 74 places to start, and a cell's state number is `row * 10 + col` | counting columns first, so (2, 3) became 32 and the agent's table rows pointed at the wrong cells |
| `moves` | each action goes the way its name says, an ordinary move costs −0.04, and stepping onto the cheese pays +1 and ends the game | UP and DOWN swapped, because rows count downwards |
| `walls` | walking into a wall, or off the edge, leaves the rat where it was and costs −0.75 | the rat walking off the top and appearing at the bottom (see `is_free` below) |
| `revisit` | moving back onto a cell already visited costs −0.25, and a new game forgets the old one's path | a `visited` set that was never emptied, so game 2 was charged for game 1's path |
| `limit` | a game that has lost more than 50 points is stopped, and it's reported as `truncated`, not `terminated` | the agent treating "gave up" as "the maze ended", which lesson 3.5 shows changes what it learns |
| `view`, `play` | cells are drawn in the right place, the arrow keys map to the right actions, and the window opens and closes | the maze drawn flipped over its diagonal |

Cells are named **(row, column)**, counting from 0 at the top-left: (0, 0) is the top-left corner, (9, 9) the bottom-right, and (1, 0) is one row down from (0, 0). Rows first is how NumPy indexes a 2D array (`maze[row, col]`), so it's used everywhere in this chapter. It's the opposite order from screen coordinates `(x, y)`, where the column (across) comes first.

The rewards in the tests are the tutorial's, and the reason for each one is next lesson's subject: +1 for the cheese, −0.04 for an ordinary move, −0.25 for moving back onto a cell already visited, −0.75 for walking into a wall, and the episode is lost once the total falls below −50.

```check
file tests/test_qmaze.py -- Click "Create provided tests/test_qmaze.py" above.
```

## The maze as an array

Create `qmaze.py`:

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

    def __init__(self, maze=MAZE, start=(0, 0), rewards=REWARDS):
        self.maze = np.array(maze, dtype=float)
        self.rows, self.cols = self.maze.shape
        self.n_states = self.rows * self.cols
        self.target = (self.rows - 1, self.cols - 1)
        self.free_cells = [(r, c) for r in range(self.rows) for c in range(self.cols)
                           if self.maze[r, c] == FREE and (r, c) != self.target]
        self.start = start
        self.rewards = rewards
        self.reset()

    def reset(self, seed=None):
        self.cell = self.start
        self.total = 0.0
        return self.state(), {}

    def state(self):
        row, col = self.cell
        return row * self.cols + col
```

- **The maze is numbers**: 1 is a free cell, 0 is a wall. That's the tutorial's convention, and it will matter in lesson 3.4, when the maze itself becomes the agent's input. `dtype=float` stores them as decimals (1.0, 0.0), as the tutorial does.
- **The four actions are 0 to 3**, in the tutorial's order: LEFT, UP, RIGHT, DOWN. **`MOVES`** turns each into a change of (row, column). UP is (−1, 0) because row numbers grow **downwards**, as on the screen: going up means a smaller row.
- **`REWARDS`** keeps every reward number in one dictionary, so next lesson can change them without touching the code that uses them.
**`QMaze`'s inputs**, each with a default so `QMaze()` gives the tutorial's game:

| input | what it is | why it's an input | default |
|---|---|---|---|
| `maze` | the grid of 1s and 0s | lesson 3.4 trains on a different maze; nothing else changes | `MAZE` |
| `start` | the (row, column) the rat starts on | the tests start the rat next to the cheese to check winning in one move; lesson 3.2 starts it anywhere | `(0, 0)` |
| `rewards` | the dictionary of reward numbers | lesson 3.2 breaks them on purpose to see what each one is for | `REWARDS` |

**What the object remembers** (its attributes, set in `__init__` and `reset`): `maze`, `rows` and `cols` (10 and 10), `n_states` (100), `target` (the cheese's cell), `free_cells` (the starting places), `cell` (where the rat is now, as a (row, column) tuple), and `total` (the rewards so far this game).

- **`np.array(maze, dtype=float)`** makes the environment its own copy of the maze. Arrays are shared, not copied, when passed around (lesson 1.2), so without this, anything that changed `env.maze` would change `MAZE` for everybody.
- **`self.maze.shape`** is `(10, 10)`, unpacked into `rows` and `cols`.
- **`free_cells`** is a **list comprehension** with two `for`s and an `if`: every (row, column) whose value is FREE, except the cheese's. It's the list of places the rat can start. The tutorial calls it the same.
- **The state is the cell's number.** Chapter 1's agent needs one whole number per state, and a grid has an easy one: count cells along the rows, so (row, col) is `row * cols + col`. (2, 3) is 23; (9, 9) is 99. It's lesson 2.3's mixed-radix idea again, with 10 columns. `n_states` is 100: one table row per cell, walls included (the agent just never visits those rows).

  The cell number works like reading a two-digit number: the row is the tens digit and the column is the units digit, because each row holds exactly 10 cells. Going back the other way uses whole-number division: `divmod(23, 10)` gives `(2, 3)`, the row and the remainder. See both directions with a loop in a scratch file:

  ```python
  cols = 10
  for row, col in [(0, 0), (0, 9), (1, 0), (2, 3), (9, 9)]:
      state = row * cols + col
      print((row, col), "->", state, "->", divmod(state, cols))
  ```

  (0, 9) is 9 and (1, 0) is 10: the last cell of one row and the first of the next are neighbours in the numbering, although they're at opposite ends of the maze. The agent doesn't mind. To it, a state number is just which table row to use.

```check
run ".venv/Scripts/python -m pytest -q tests/test_qmaze.py -k layout" label="QMaze knows the maze's size, cheese and free cells, and numbers its states" -- free_cells: every (r, c) with maze[r, c] == FREE except the target; state() returns row * cols + col.
```

## Moving

Add `is_free` and `step`:

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

    def __init__(self, maze=MAZE, start=(0, 0), rewards=REWARDS):
        self.maze = np.array(maze, dtype=float)
        self.rows, self.cols = self.maze.shape
        self.n_states = self.rows * self.cols
        self.target = (self.rows - 1, self.cols - 1)
        self.free_cells = [(r, c) for r in range(self.rows) for c in range(self.cols)
                           if self.maze[r, c] == FREE and (r, c) != self.target]
        self.start = start
        self.rewards = rewards
        self.reset()

    def reset(self, seed=None):
        self.cell = self.start
        self.total = 0.0
        return self.state(), {}

    def state(self):
        row, col = self.cell
        return row * self.cols + col

    def is_free(self, row, col):
        return 0 <= row < self.rows and 0 <= col < self.cols and self.maze[row, col] == FREE

    def step(self, action):
        row, col = self.cell
        d_row, d_col = MOVES[action]
        if self.is_free(row + d_row, col + d_col):
            self.cell = (row + d_row, col + d_col)
            if self.cell == self.target:
                reward = self.rewards["cheese"]
            else:
                reward = self.rewards["move"]
        else:
            reward = self.rewards["wall"]
        self.total += reward
        terminated = self.cell == self.target
        truncated = False
        return self.state(), reward, terminated, truncated, {}
```

- **`is_free(row, col)`** checks the edges *before* reading the maze. Python's `and` stops at the first false part, so for row −1 it never evaluates `self.maze[-1, col]`. That matters: NumPy reads index −1 as "the last row", so without the edge check, moving up from the top row would look at the bottom row and could walk straight through.
- **Walking into a wall or the edge doesn't move the rat.** It stays where it is and pays the wall penalty. There's no separate "do nothing" action, but a bump has the same effect, at a price.
- **`self.total`** adds up the episode's rewards. The game uses it for the losing rule, two steps from now.
- **Reaching the cheese** is `terminated`: the maze has ended.

**`step` worked through**, for the first test: the rat is on (0, 0) and the action is DOWN (3).

```text
row, col     = (0, 0)
d_row, d_col = MOVES[3]                 = (1, 0)
is_free(0 + 1, 0 + 0) = is_free(1, 0)   -> 0 <= 1 < 10, 0 <= 0 < 10, MAZE[1, 0] is 1.0 -> True
self.cell    = (1, 0), not the target   -> reward = -0.04
self.total   = 0.0 + -0.04              = -0.04
returns        (1 * 10 + 0, -0.04, False, False, {})  =  (10, -0.04, False, False, {})
```

Then RIGHT (2) from (0, 0) instead: `MOVES[2]` is (0, 1), `is_free(0, 1)` finds `MAZE[0, 1]` is 0.0, a wall, so the cell stays (0, 0) and the reward is −0.75.

```check
run ".venv/Scripts/python -m pytest -q tests/test_qmaze.py -k moves" label="step moves the rat, charges a move, and the cheese wins" -- Add MOVES[action] to the cell if is_free says the new cell is free; the reward is cheese on the target, otherwise move.
run ".venv/Scripts/python -m pytest -q tests/test_qmaze.py -k walls" label="walls and edges block the rat and cost the wall penalty" -- When is_free is False the cell doesn't change and the reward is self.rewards["wall"].
```

## Your turn: no coming back

**Build, on your own:** the revisit penalty.

Moving onto a cell the rat has **already been on, this episode,** costs −0.25 instead of −0.04. The environment has to remember where the rat has been:

1. In `reset`, start an empty set: `self.visited = set()`. A **set** holds each item at most once, and `cell in self.visited` is fast however big it gets: Python finds an item by a number computed from it (its hash) instead of searching through every item.
2. At the start of `step`, before moving, add the cell the rat is **leaving**: `self.visited.add(self.cell)`.
3. After a successful move that isn't onto the cheese: if the new cell is in `self.visited`, the reward is `self.rewards["revisit"]`; otherwise it's `self.rewards["move"]`.

Check yourself against the test: down from (0, 0) to (1, 0) costs −0.04, and (0, 0) has been recorded as visited. Then up, back onto (0, 0): −0.25.

```hints
nudge: Where does the rat's history live between steps, and when must it be emptied?
concept: An attribute, `self.visited`, set to `set()` in reset and added to at the start of every step. The reward choice gains one `elif` between the cheese and the ordinary move.
answer: In `reset`, add `self.visited = set()` after `self.cell = self.start`. In `step`, add `self.visited.add(self.cell)` as the first line, and make the reward choice for a successful move:
~~~python
            if self.cell == self.target:
                reward = self.rewards["cheese"]
            elif self.cell in self.visited:
                reward = self.rewards["revisit"]
            else:
                reward = self.rewards["move"]
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_qmaze.py -k revisit" label="moving back onto a visited cell costs the revisit penalty, and each episode starts with no history" -- reset: self.visited = set(). step: add the current cell first; after moving, a cell in self.visited costs self.rewards["revisit"].
```

## Giving up

Last rule: an episode is **lost** when its total reward falls below −0.5 × the number of cells, −50 here. A rat that has spent that much has wasted its chance. In `__init__`, before `self.reset()`, add:

```python
        self.min_reward = -0.5 * self.maze.size
```

and in `step`, replace `truncated = False` with:

```python
        truncated = not terminated and self.total < self.min_reward
```

The full file now:

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

    def __init__(self, maze=MAZE, start=(0, 0), rewards=REWARDS):
        self.maze = np.array(maze, dtype=float)
        self.rows, self.cols = self.maze.shape
        self.n_states = self.rows * self.cols
        self.target = (self.rows - 1, self.cols - 1)
        self.free_cells = [(r, c) for r in range(self.rows) for c in range(self.cols)
                           if self.maze[r, c] == FREE and (r, c) != self.target]
        self.start = start
        self.rewards = rewards
        self.min_reward = -0.5 * self.maze.size
        self.reset()

    def reset(self, seed=None):
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

**Truncated, not terminated.** The tutorial calls this ending "lose" and stops the game. But the maze didn't end: the rat could have carried on and found the cheese. The episode was cut short because it was going badly, which is exactly the corridor's time limit from lesson 1.1. So it's reported as `truncated`, and the agent's update will still count the value of where the rat was. (The tutorial treats it as a true ending; lesson 3.5 looks at what that changes.)

`self.maze.size` is the number of cells, 100. Bumping a wall costs 0.75, so 66 bumps total −49.5 and the 67th makes it −50.25, below the limit: that's the test. See it with a loop:

```python
total = 0.0
for bump in range(1, 69):
    total += -0.75
    if bump >= 65:
        print(bump, total, "lost" if total < -50 else "still playing")
```

**Why a limit at all?** The rat can't lose any other way. Without it, an agent that hadn't learned anything could wander for millions of steps, and in a game like this one, where every move costs, the total would just keep falling. The limit is half a point per cell: generous enough for a lot of wandering, tight enough that a hopeless game ends.

```check
run ".venv/Scripts/python -m pytest -q tests/test_qmaze.py -k limit" label="an episode is truncated once its total falls below -50" -- In __init__: self.min_reward = -0.5 * self.maze.size. In step: truncated = not terminated and self.total < self.min_reward.
```

## Drawing the maze

Create `maze_view.py`, which every QMaze window in this chapter shares:

```python file=maze_view.py
import pygame

CELL = 44
MARGIN = 20
TOP = 50
WALL_COLOUR = (30, 41, 59)
FLOOR = (148, 163, 184)
VISITED = (100, 116, 139)
CHEESE = (250, 204, 21)
RAT = (244, 114, 182)
TEXT = (226, 232, 240)
BACKGROUND = (15, 23, 42)


def cell_rect(row, col):
    return pygame.Rect(MARGIN + col * CELL, TOP + row * CELL, CELL - 2, CELL - 2)


def draw_maze(screen, env, visited=()):
    screen.fill(BACKGROUND)
    for row in range(env.rows):
        for col in range(env.cols):
            if env.maze[row, col] == 0:
                colour = WALL_COLOUR
            elif (row, col) in visited:
                colour = VISITED
            else:
                colour = FLOOR
            pygame.draw.rect(screen, colour, cell_rect(row, col))
    pygame.draw.circle(screen, CHEESE, cell_rect(*env.target).center, CELL // 3)


def draw_rat(screen, cell):
    pygame.draw.circle(screen, RAT, cell_rect(*cell).center, CELL // 3)
```

- **`cell_rect(row, col)`** is where the (row, column) and screen orders meet: the **column** decides x (`MARGIN + col * CELL`) and the **row** decides y (`TOP + row * CELL`). Getting those the wrong way round draws the maze flipped over its diagonal, which, oddly enough, is lesson 3.4's subject.
- **`CELL - 2`** leaves a 2-pixel gap between cells, so the grid is visible.
- **`visited=()`** is an empty tuple as the default: "nothing visited" unless told otherwise. A default must never be something that can be changed, like a list or set, because Python creates a default once and shares it between every call.
- **`cell_rect(*env.target)`**: the `*` unpacks the pair (9, 9) into two arguments, so it's `cell_rect(9, 9)`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_qmaze.py -k view" label="cell_rect puts each cell on the grid, columns across and rows down"
```

## Play it yourself

Create `play_qmaze.py`:

```python file=play_qmaze.py
import pygame

from maze_view import CELL, MARGIN, TEXT, TOP, draw_maze, draw_rat
from qmaze import DOWN, LEFT, RIGHT, UP, QMaze

KEYS = {pygame.K_LEFT: LEFT, pygame.K_UP: UP, pygame.K_RIGHT: RIGHT, pygame.K_DOWN: DOWN}


def run(max_frames=None):
    pygame.init()
    env = QMaze()
    width = 2 * MARGIN + env.cols * CELL
    height = TOP + env.rows * CELL + 60
    screen = pygame.display.set_mode((width, height))
    pygame.display.set_caption("QMaze")
    font = pygame.font.Font(None, 24)
    clock = pygame.time.Clock()
    env.reset()
    message = "Arrow keys move the rat. Find the cheese."
    done = False
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE and done:
                env.reset()
                done = False
                message = "Arrow keys move the rat. Find the cheese."
            elif event.type == pygame.KEYDOWN and not done and event.key in KEYS:
                _, reward, terminated, truncated, _ = env.step(KEYS[event.key])
                message = f"last reward {reward:+.2f}"
                if terminated or truncated:
                    done = True
                    message = f"{'Cheese!' if terminated else 'Out of reward: you lose.'} Total {env.total:+.2f}. Space starts again."
        draw_maze(screen, env, env.visited)
        draw_rat(screen, env.cell)
        screen.blit(font.render(f"total {env.total:+.2f}   (you lose below {env.min_reward:.0f})", True, TEXT), (MARGIN, 16))
        screen.blit(font.render(message, True, TEXT), (MARGIN, TOP + env.rows * CELL + 20))
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

The window's size is worked out from the maze (`env.cols * CELL` wide, plus margins), so a different maze gets a different window. **`KEYS`** maps each arrow key to the action of the same name; `event.key in KEYS` ignores every other key. Cells you've visited are drawn darker, using the environment's own `visited` set, so you can see the revisit penalty coming.

Press **Run** and find the cheese. Watch the total: walking into walls and retracing your steps is what costs.

```predict
question: What is the fewest number of moves from (0, 0) to the cheese?
answer: 40
tolerance: 0
explain: 40 moves. The cheese is 18 cells away as the crow flies, but the walls force a zig-zag through the whole maze: right along the top row to the far edge, down the right side to row 5, left along row 5 and down into row 6, left along row 6 all the way to the left edge, down to the bottom row, right along it, and up and round the last wall at (9, 7) to the cheese. Lesson 3.3 finds this number exactly, with a search, and then checks whether the trained agent finds the same route. A perfect run costs 39 × 0.04 = 1.56 in moves and earns 1 for the cheese: a total of −0.56.
verify: script shortest_from_start.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_qmaze.py -k play" label="the arrow keys map to actions and the window opens and closes"
run ".venv/Scripts/python -m pytest -q tests/test_qmaze.py" label="all lesson 3.1 tests pass"
```

### What you have

The tutorial's maze and rules, in the shape every environment in this series has: `reset` and `step`, cell numbers for states, and `terminated` and `truncated` kept apart. Next lesson trains Chapter 1's agent on it, and then breaks the rewards on purpose to find out what each one is for.
