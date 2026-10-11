---
title: 6.1 — A Network That Knows the Maze
track: Q-Arcade — Deep Q-learning on QMaze
trackOrder: 12.7
runtime: python
run: maze_net.py
---

**Starting a new chapter:** every Q-Arcade chapter uses the same `q-arcade` folder, so your files carry straight on. If the file tree is ever empty, click **Choose folder…** and select `q-arcade`.

### The story so far

- **Chapter 5** solved QMaze with a table. `train_maze()` (`rewards.py`) returns an agent whose table `agent.Q` has 100 rows, one per cell, and 4 columns, one per move. Lesson 5.4 found the table can't cope with a new maze, and built `observe(env)` (`new_maze.py`): the maze as 100 numbers with the rat as 0.5, a picture of the situation instead of a cell number.
- **Chapter 3** built networks, and lesson 3.5 wrote the QMaze tutorial's network in Keras: `build_model()` in `maze_net.py`, 100 numbers in, 4 out. `model.fit(inputs, targets, epochs=…, batch_size=…)` trains a Keras model on examples.

### What this lesson asks

This chapter trains that network by Q-learning, with no table at all. First, a simpler question that tests everything so far: can the network **learn the table**? Your Chapter 5 agent's Q-table holds four values for each of the 74 free cells. Each is an example: the input is that cell's observation (the maze with the rat there), and the target is the table's four values. That's ordinary **supervised learning**: examples with known answers, as with Chapter 3's curve.

### How the pieces fit

```text
maze_net.py
  build_model()          the tutorial's network (lesson 3.5): 100 numbers in, 4 values out
  table_examples(agent)  74 examples: (the maze seen from cell c,  the table's 4 values for cell c)
  model.fit(...)         learns to give the table's values from the picture
  NetworkAgent(model)    act(state): picture of that cell -> model -> biggest of the 4 -> an action
     └── judged by lesson 5.2's completion(), exactly like the table agent
```

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_maze_net.py** above.

```python file=tests/test_maze_net.py provided
# Tests for maze_net.py's examples and agent (lesson 6.1).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_maze_net.py
import numpy as np
import pytest

pytestmark = pytest.mark.filterwarnings("ignore::DeprecationWarning:keras")


def test_examples_pair_each_view_with_its_table_row():
    from maze_net import table_examples
    from rewards import train_maze
    agent = train_maze(episodes=50)
    inputs, targets = table_examples(agent)
    assert inputs.shape == (74, 100) and targets.shape == (74, 4)
    from qmaze import QMaze
    for i, (row, col) in enumerate(QMaze().free_cells):
        state = row * 10 + col
        assert inputs[i][state] == 0.5, f"example {i}: the rat is marked on its own cell, {state}"
        assert np.array_equal(targets[i], agent.Q[state]), f"example {i}: the table's row for cell {state}"


def test_agent_acts_from_a_state_number():
    from maze_net import NetworkAgent, build_model
    action = NetworkAgent(build_model()).act(0)
    assert type(action) is int and 0 <= action < 4
```

What each group protects:

| group | it makes sure that… | a bug it would catch |
|---|---|---|
| `examples` | there are 74 examples, each observation has the rat on its own cell, and each target is that cell's row of the table | inputs and targets out of step, so the network learned cell 12's values from cell 13's picture |
| `agent` | `NetworkAgent.act` returns a plain whole number from 0 to 3 | returning a NumPy number or a tensor, which `QMaze.step`'s `MOVES[action]` lookup can trip over |

The `pytestmark` line silences Keras's own NumPy warnings, as in lesson 3.5.

```check
file tests/test_maze_net.py -- Click "Create provided tests/test_maze_net.py" above.
```

## Examples from the table

Make `maze_net.py` this. `build_model` is lesson 3.5's; what's new is `table_examples` and the two imports from the maze chapter:

```python file=maze_net.py
import os

os.environ.setdefault("KERAS_BACKEND", "torch")

import keras
import numpy as np

from new_maze import observe
from qmaze import MAZE, QMaze


def build_model(size=100, actions=4):
    model = keras.Sequential([
        keras.Input((size,)),
        keras.layers.Dense(size),
        keras.layers.PReLU(),
        keras.layers.Dense(size),
        keras.layers.PReLU(),
        keras.layers.Dense(actions),
    ])
    model.compile(optimizer="adam", loss="mse")
    return model


def table_examples(agent, maze=MAZE):
    env = QMaze(maze)
    inputs, targets = [], []
    for cell in env.free_cells:
        env.cell = cell
        inputs.append(observe(env))
        targets.append(agent.Q[env.state()])
    return np.array(inputs), np.array(targets)
```

**One example, worked through**, for the first free cell, (0, 0):

```text
env.cell = (0, 0)
observe(env)          100 numbers: the maze, with position 0 set to 0.5     -> inputs[0]
env.state()           0 * 10 + 0 = 0
agent.Q[0]            row 0 of the table: the 4 values the agent learned at (0, 0)   -> targets[0]
```

So `inputs` ends up shape (74, 100), one picture per row, and `targets` (74, 4), one row of the table per row. Row i of each is about the same cell: that's what the `examples` test checks.

- **`table_examples`** builds the 74 examples. It moves a single environment's rat to each free cell in turn (`env.cell = cell`) and records `observe(env)` and the table's row for that cell. Moving the rat by setting `env.cell` is fine here: nothing is being played, the environment is only used to draw the picture.

```check
run ".venv/Scripts/python -m pytest -q tests/test_maze_net.py -k examples" label="table_examples pairs each free cell's observation with its row of the table"
```

## Your turn: an agent made of a network

**Build, on your own:** a class `NetworkAgent` in `maze_net.py`, so that lesson 5.2's `completion` can judge a trained network exactly as it judged the table agent.

`completion` needs an object with two things: an attribute `epsilon` (it sets it to 0 while judging, then puts it back), and a method `act(state)` that takes a **cell number** and returns an action. The network doesn't take cell numbers: it takes pictures. So `act` has to turn the number back into a picture first.

| piece | what it does |
|---|---|
| `__init__(self, model, maze=MAZE)` | keeps the model, makes a `QMaze(maze)` to draw pictures with, and sets `self.epsilon = 0.0` |
| `act(self, state)` | cell number → (row, column) with `divmod(state, cols)` (lesson 5.1) → put the rat there → `observe` → a batch of one with `.reshape(1, -1)` → `self.model(...)` → NumPy with `keras.ops.convert_to_numpy(...)` → row 0 → `np.argmax` → `int` |

The model always works on **batches**, so one picture goes in as shape (1, 100) and comes back as shape (1, 4): row 0 is this picture's four values.

```hints
nudge: The environment you made in __init__ can draw a picture of any cell: set its `cell`, then `observe` it.
concept: `self.env.cell = divmod(state, self.env.cols)`, then `values = self.model(observe(self.env).reshape(1, -1))`, then return `int(np.argmax(keras.ops.convert_to_numpy(values)[0]))`.
answer: Add to `maze_net.py`:
~~~python
class NetworkAgent:
    def __init__(self, model, maze=MAZE):
        self.model = model
        self.env = QMaze(maze)
        self.epsilon = 0.0

    def act(self, state):
        self.env.cell = divmod(state, self.env.cols)
        values = self.model(observe(self.env).reshape(1, -1))
        return int(np.argmax(keras.ops.convert_to_numpy(values)[0]))
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_maze_net.py -k agent" label="NetworkAgent acts from a state number" -- self.env.cell = divmod(state, self.env.cols); values = self.model(observe(self.env).reshape(1, -1)); return int(np.argmax(keras.ops.convert_to_numpy(values)[0])).
```

## Training it

Make `maze_net.py` this: your `NetworkAgent`, and a main block that trains the network on the table and judges it.

```python file=maze_net.py
import os

os.environ.setdefault("KERAS_BACKEND", "torch")

import keras
import numpy as np

from maze_tools import completion
from new_maze import observe
from qmaze import MAZE, QMaze
from rewards import train_maze


def build_model(size=100, actions=4):
    model = keras.Sequential([
        keras.Input((size,)),
        keras.layers.Dense(size),
        keras.layers.PReLU(),
        keras.layers.Dense(size),
        keras.layers.PReLU(),
        keras.layers.Dense(actions),
    ])
    model.compile(optimizer="adam", loss="mse")
    return model


def table_examples(agent, maze=MAZE):
    env = QMaze(maze)
    inputs, targets = [], []
    for cell in env.free_cells:
        env.cell = cell
        inputs.append(observe(env))
        targets.append(agent.Q[env.state()])
    return np.array(inputs), np.array(targets)


class NetworkAgent:
    def __init__(self, model, maze=MAZE):
        self.model = model
        self.env = QMaze(maze)
        self.epsilon = 0.0

    def act(self, state):
        self.env.cell = divmod(state, self.env.cols)
        values = self.model(observe(self.env).reshape(1, -1))
        return int(np.argmax(keras.ops.convert_to_numpy(values)[0]))


if __name__ == "__main__":
    keras.utils.set_random_seed(0)
    agent = train_maze()
    inputs, targets = table_examples(agent)
    model = build_model()
    history = model.fit(inputs, targets, epochs=800, batch_size=16, verbose=0)
    print("loss after 800 epochs:", round(history.history["loss"][-1], 6))
    print("the network's own greedy policy:", completion(NetworkAgent(model)))
```

**`NetworkAgent.act(state)`, step by step**, for state 23:

```text
divmod(23, 10)                    (2, 3)               the cell, back from its number (lesson 5.1)
observe(self.env)                 100 numbers          the maze with the rat at (2, 3)
.reshape(1, -1)                   shape (1, 100)       a batch of one picture
self.model(...)                   shape (1, 4)         4 Q-values for that one picture
convert_to_numpy(...)[0]          shape (4,)           the first (only) row, as NumPy
np.argmax(...)                    e.g. 3               the position of the biggest: DOWN
int(...)                          3                    a plain Python number
```

- **800 epochs**, batches of 16. It takes about twenty seconds.
- **`keras.utils.set_random_seed(0)`** makes the network's random starting knobs, and so the result, repeatable.

```predict
question: The network has learned to reproduce the table's values closely (a loss around 0.001). From how many of the 74 starts will ITS OWN greedy policy reach the cheese?
choice: All 74, or very nearly
choice: About half
choice: Hardly any: it only learned numbers, not a policy
answer: All 74, or very nearly
explain: 74 of 74 for this seed. Over five seeds, measured at 800 epochs: 74, 73, 74, 74 and 73. The values it reproduces are nearly perfect, so the biggest of each four is usually the same action as the table's. But it's not guaranteed: the network chose a different action from the table in up to 4 of the 74 cells, and still reached the cheese from almost all of them. At 400 epochs, with a loss around 0.01, it solved only 5 to 32 starts. Lesson 5.2 showed why the precision matters: near the start, the values that separate a good route from standing still differ by only 0.023.
verify: script maze_net_wins.py
```

```text
loss after 800 epochs: 0.001169
the network's own greedy policy: (74, 74)
```

This is a 20,804-knob function that has learned, from 74 examples, to do what the 400-number table does. On its own that's no improvement. But it reads the maze's walls, and that's what Chapter 5 builds on: training the network directly from experience, by Q-learning, without a table to copy.

```text
loss after 800 epochs: 0.001169
the network's own greedy policy: (74, 74)
```

This is a 20,804-knob function that has learned, from 74 examples, to do what the 400-number table does. On its own that's no improvement. But it reads the maze's walls, and that's what the rest of this chapter builds on: training the network directly from experience, by Q-learning, without a table to copy.

```check
run ".venv/Scripts/python -m pytest -q tests/test_maze_net.py" label="all lesson 6.1 tests pass"
```

### What you have

The tutorial's network, trained to reproduce a Q-table, and an agent wrapper that lets Chapter 5's tools judge it. Next lesson: no table at all.
