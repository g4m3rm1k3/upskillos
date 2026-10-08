---
title: 3.4 — A New Maze
runtime: python
run: new_maze.py
---

The agent from lesson 3.3 knows its maze perfectly. Now give it a different one: the **same** maze, flipped over its diagonal, so every row becomes a column. Same number of free cells, same start corner, same cheese corner, and a route of exactly the same length. A person who had solved the first maze would find the second one easy, because they learned *how mazes work*.

The table learned something else entirely. This lesson measures what, and then looks at what the tutorial gives its agent to see instead of a cell number: the whole maze. That observation is what Chapter 5's network will read.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_new_maze.py** above.

```python file=tests/test_new_maze.py provided
# Tests for new_maze.py (lesson 3.4).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_new_maze.py
import numpy as np


def test_flipped_is_the_maze_turned_over_its_diagonal():
    from new_maze import FLIPPED
    from qmaze import MAZE
    assert all(FLIPPED[r, c] == MAZE[c, r] for r in range(10) for c in range(10))
    assert FLIPPED[0, 0] == 1.0 and FLIPPED[9, 9] == 1.0


def test_flipped_has_as_many_free_cells():
    from new_maze import FLIPPED
    from qmaze import QMaze
    assert len(QMaze(FLIPPED).free_cells) == 74


def test_flipped_defeats_the_table_trained_on_the_other_maze():
    from maze_tools import completion
    from new_maze import FLIPPED
    from rewards import train_maze
    wins, total = completion(train_maze(), FLIPPED)
    assert wins < 15, "the table's rows mean cells of the maze it was trained on"


def test_observe_is_one_number_per_cell():
    from new_maze import observe
    from qmaze import QMaze
    view = observe(QMaze())
    assert view.shape == (100,)
    assert set(np.unique(view)) == {0.0, 0.5, 1.0}


def test_observe_marks_the_rat_with_a_half():
    from new_maze import observe
    from qmaze import DOWN, QMaze
    env = QMaze()
    env.reset()
    env.step(DOWN)
    view = observe(env)
    assert view[env.state()] == 0.5 and list(view).count(0.5) == 1


def test_observe_leaves_the_maze_itself_alone():
    from new_maze import observe
    from qmaze import MAZE, QMaze
    env = QMaze()
    observe(env)
    assert np.array_equal(env.maze, MAZE)
```

`np.unique(view)` lists each distinct value once, so the second test says the observation contains walls (0), free cells (1) and the rat (0.5), and nothing else.

```check
file tests/test_new_maze.py -- Click "Create provided tests/test_new_maze.py" above.
```

## The same maze, flipped

Create `new_maze.py`:

```python file=new_maze.py
from maze_tools import completion
from qmaze import MAZE
from rewards import train_maze

FLIPPED = MAZE.T.copy()


if __name__ == "__main__":
    agent = train_maze()
    print("trained on MAZE,    judged on MAZE:   ", completion(agent, MAZE))
    print("trained on MAZE,    judged on FLIPPED:", completion(agent, FLIPPED))
    print("trained on FLIPPED, judged on FLIPPED:", completion(train_maze(maze=FLIPPED), FLIPPED))
```

**`MAZE.T`** is the **transpose**: the array with rows and columns swapped, so `MAZE.T[r, c]` is `MAZE[c, r]`. NumPy doesn't move any numbers to make it. It returns a view of the same memory that reads it in the other order, which is why `.copy()` makes a real, separate array. (0, 0) and (9, 9) are on the diagonal, so they stay where they are, and every route in the old maze becomes a route of the same length in the new one, with every LEFT turned into UP and every RIGHT into DOWN.

Predict before you run it:

```predict
question: The agent trained on MAZE solves all 74 of its starts. How many will it solve on FLIPPED?
choice: All 74: it's the same maze, turned over
choice: About half
choice: Hardly any
answer: Hardly any
explain: 3 of 74. And an agent trained on FLIPPED itself solves all 74, so the new maze isn't any harder. The table's rows aren't "a cell next to a wall on its left", they're "**cell number 23**". Row 23 holds what was learned about (2, 3) **in the first maze**: perhaps "go down, there's a corridor below". In the flipped maze, (2, 3) has different walls round it, and "down" may walk straight into one. The table has no way of knowing, because it never looked at the walls at all: only at which cell number it was in. Everything it knows is about one maze.
verify: .venv/Scripts/python -c "from maze_tools import completion; from new_maze import FLIPPED; from rewards import train_maze; w = completion(train_maze(), FLIPPED)[0]; print('Hardly any' if w < 10 else w)"
```

```text
trained on MAZE,    judged on MAZE:    (74, 74)
trained on MAZE,    judged on FLIPPED: (3, 74)
trained on FLIPPED, judged on FLIPPED: (74, 74)
```

This is the same failure as CartPole's big tables in lesson 2.6, seen from another side: **a table can't generalise.** In CartPole it couldn't carry what it learned in one row to the similar row next door. Here it can't carry what it learned in one maze to another. Both times, the reason is that each row is a separate box labelled with a number, and nothing about the number says what the situation is like.

```check
run ".venv/Scripts/python -m pytest -q tests/test_new_maze.py -k flipped" label="FLIPPED is MAZE transposed, and the MAZE-trained table fails on it"
```

## Your turn: what the tutorial's agent sees

**Build, on your own:** `observe(env)` in `new_maze.py`.

The tutorial's agent doesn't get a cell number. It gets a picture of the whole maze, as numbers: a copy of the maze (1 for free, 0 for wall) with the rat's cell set to **0.5**, flattened into one long list of 100 numbers. The tutorial calls it the `envstate`. With the whole maze in view, an agent at least *could* notice where the walls are, in any maze.

Write `observe(env)` returning that: a NumPy array of shape `(100,)` for the 10 × 10 maze. It must not change `env.maze` itself, so work on a copy (`env.maze.copy()`). Setting one cell of a 2D array by a (row, col) pair works directly: `canvas[env.cell] = 0.5`. And `array.reshape(-1)` lays a 2D array out as one row, row after row; `-1` means "however long it needs to be".

```hints
nudge: Three steps: copy the maze, mark the rat, flatten.
concept: `canvas = env.maze.copy()`, then `canvas[env.cell] = 0.5`, then `return canvas.reshape(-1)`. Because the copy is laid out row after row, the rat's 0.5 lands at position `row * 10 + col`, its state number.
answer: Add to `new_maze.py`, above the `if __name__` block:
~~~python
def observe(env):
    canvas = env.maze.copy()
    canvas[env.cell] = 0.5
    return canvas.reshape(-1)
~~~
The tutorial's `observe` returns `canvas.reshape((1, -1))`, shape `(1, 100)`: one row of 100. That extra dimension is for Keras, which always works on a **batch** of inputs at once, here a batch of one. Chapter 4 explains batches.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_new_maze.py -k observe" label="observe returns the maze as 100 numbers with the rat marked 0.5, without changing the maze" -- canvas = env.maze.copy(); canvas[env.cell] = 0.5; return canvas.reshape(-1).
run ".venv/Scripts/python -m pytest -q tests/test_new_maze.py" label="all lesson 3.4 tests pass"
```

## Too many rows

Could a **table** use this observation as its state? Count the rows it would need. For one maze, one row per place the rat can be, so 75 rows: no problem, and no better than cell numbers, because it's the same information. The point of the observation is to handle **many mazes**. A 10 × 10 maze with fixed corners has 98 cells that could each be wall or free: 2⁹⁸ possible mazes, about 3 × 10²⁹ (a 3 followed by 29 zeros). A table with a row for each would need more memory than every computer ever made, and it would still learn each maze separately, because its rows are still separate boxes.

What's needed is the thing lesson 2.6 ended on: not a table that **looks up** a row, but a **function** that **computes** the four action values from the 100 numbers. Two mazes that look alike then give similar values, because the same calculation runs on similar inputs. "A wall directly to my right" would produce the same effect wherever it appears, in any maze. And the function's size doesn't depend on how many mazes exist, only on how much calculation it does.

That function is a neural network. The tutorial's is small: 100 numbers in, two layers of 100 numbers in the middle, 4 action values out. Chapter 4 builds one, from a single straight line up, in NumPy, then in PyTorch, then in Keras. Chapter 5 trains it on QMaze, exactly as the tutorial does.

### What you have

A measurement of what a table can't do (3 of 74 on a flipped maze), the tutorial's observation (`observe`), and the reason the rest of this series uses networks. The last lesson of the chapter reads the tutorial's own code, finds where it differs from yours, and fixes a bug in it.
