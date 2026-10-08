---
title: 4.5 — Keras, and a Network That Knows the Maze
runtime: python
run: maze_net.py
---

**Keras** is the other library you'll meet in courses and tutorials, and the one the QMaze tutorial uses. Where PyTorch hands you the training loop to write yourself, Keras hides it inside one call, `fit`. That's convenient, and it's also why Keras code can be hard to understand if you've never seen the loop it hides. You have, so this lesson can show exactly what `fit` does.

Keras 3 runs on top of another library, its **backend**: TensorFlow, JAX or PyTorch. Here it runs on the PyTorch you installed last lesson, so there's nothing big to add. The lesson ends with the first network in this series that has to do with Q-learning: the tutorial's own QMaze network, trained to reproduce the table your agent learned in Chapter 3.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_keras_net.py** above.

```python file=tests/test_keras_net.py provided
# Tests for keras_net.py and maze_net.py (lesson 4.5).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_keras_net.py
import numpy as np
import pytest

pytestmark = pytest.mark.filterwarnings("ignore::DeprecationWarning:keras")


def test_backend_is_pytorch():
    import keras_net
    import keras
    assert keras.backend.backend() == "torch"


def test_layers_hold_weights_as_inputs_by_outputs():
    from keras_net import make_model
    shapes = [tuple(w.shape) for w in make_model(5).get_weights()]
    assert shapes == [(1, 5), (5,), (5, 1), (1,)], "Keras stores weights as (inputs, outputs), like your NumPy network"


def test_fit_learns_the_curve():
    from keras_net import train_keras
    from tiny_net import make_curve
    model, final = train_keras(*make_curve(), steps=1000)
    assert final < 0.02


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


def test_tutorial_model_has_the_published_shape():
    from maze_net import build_model
    model = build_model()
    assert [tuple(w.shape) for w in model.get_weights() if w.ndim == 2] == [(100, 100), (100, 100), (100, 4)]


def test_agent_acts_from_a_state_number():
    from maze_net import NetworkAgent, build_model
    action = NetworkAgent(build_model()).act(0)
    assert type(action) is int and 0 <= action < 4
```

**`pytestmark = pytest.mark.filterwarnings(...)`** is new. While this series was being written, every Keras test printed hundreds of copies of a `DeprecationWarning` like this:

```text
...\site-packages\keras\src\backend\torch\core.py:276: DeprecationWarning: __array__ implementation
doesn't accept a copy keyword, so passing copy=False failed. ...
```

Read where a warning comes from before deciding what to do about it. This one's path is inside `site-packages\keras`: it's Keras's own code using an older NumPy convention that NumPy 2 has started warning about. Your code isn't involved, and it doesn't change any result, so silencing it is right. But silence it **narrowly**: `"ignore::DeprecationWarning:keras"` ignores only deprecation warnings raised from modules whose names start with `keras`, and only in this file. Anything raised by your own code, or of any other kind, still shows.

```check
file tests/test_keras_net.py -- Click "Create provided tests/test_keras_net.py" above.
```

## Install Keras

Add it to `requirements.txt`:

```text file=requirements.txt
numpy==2.5.3
pygame-ce==2.5.8
gymnasium==1.3.0
pytest==9.1.1
torch==2.14.1
keras==3.15.1
```

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

The check below sets `KERAS_BACKEND` before importing Keras. Without it, `import keras` fails here, because Keras's default backend is TensorFlow, which isn't installed. The next step explains this. Keras itself is small. It brings a few helpers of its own: `h5py` for saving models, `rich` for its printed summaries, `optree` for handling nested structures, and `ml_dtypes` for extra number types.

```check
run ".venv/Scripts/python -c \"import os; os.environ['KERAS_BACKEND'] = 'torch'; import keras; assert keras.__version__ == '3.15.1', keras.__version__\"" label="Keras 3.15.1 imports in the project's Python, on the PyTorch backend" -- Add keras==3.15.1 to requirements.txt and install it.
```

## The same network, in Keras

Create `keras_net.py`:

```python file=keras_net.py
import os

os.environ.setdefault("KERAS_BACKEND", "torch")

import keras
import numpy as np

from tiny_net import make_curve


def make_model(hidden=16, rate=0.05):
    model = keras.Sequential([
        keras.Input((1,)),
        keras.layers.Dense(hidden, activation="relu"),
        keras.layers.Dense(1),
    ])
    model.compile(optimizer=keras.optimizers.SGD(learning_rate=rate), loss="mse")
    return model


def train_keras(x, y, hidden=16, steps=3000, seed=0):
    keras.utils.set_random_seed(seed)
    model = make_model(hidden)
    history = model.fit(x.reshape(-1, 1), y, epochs=steps, batch_size=len(x), verbose=0)
    return model, history.history["loss"][-1]


if __name__ == "__main__":
    x, y = make_curve()
    model, final = train_keras(x, y)
    print(f"Keras, one hidden layer of 16: loss {final:.4f}")
    print("prediction at x = 1.5:", float(model.predict(np.array([[1.5]]), verbose=0)[0, 0]), "(true 2.25)")
```

- **`os.environ.setdefault("KERAS_BACKEND", "torch")`, before `import keras`.** Keras picks its backend once, at the moment it's first imported, by reading this environment variable, and its default is TensorFlow, which isn't installed. So the variable must be set before the import line runs. That's why this file's imports aren't all at the top, which is normally the rule. `setdefault` leaves the variable alone if it's already set, so you could still choose another backend from outside.
- **`keras.Sequential([...])`** is `nn.Sequential`. **`keras.Input((1,))`** declares the input's shape: one number per example. **`keras.layers.Dense(hidden, activation="relu")`** is `nn.Linear` and `nn.ReLU` in one: a layer of weighted sums followed by the bend. Unlike `nn.Linear`, you don't give it the number of inputs: Keras works it out from the layer before.
- **`model.compile(optimizer=..., loss="mse")`** attaches the optimiser and the loss to the model, ready for training.
- **`keras.utils.set_random_seed(seed)`** seeds every random generator Keras uses, and the backend's.
- **`model.predict(...)`** runs the forward pass and returns NumPy arrays.

**What `model.fit(x, y, epochs=steps, batch_size=len(x))` does.** It's last lesson's loop:

```text
for each of `epochs` passes over the data:
    split the examples into batches of `batch_size`     (here one batch: all 64)
    for each batch:
        zero the slopes
        loss = loss function(model(batch inputs), batch targets)
        work out the slopes (the backend's autograd: here, PyTorch's)
        optimiser step
    record the loss in history
```

An **epoch** is one pass through all the examples. With `batch_size=len(x)` each epoch is exactly one step of the loop you wrote, so `epochs=3000` is 3,000 steps, as before. With smaller batches, each epoch takes several smaller steps, each using only some of the examples: that's what the "stochastic" in stochastic gradient descent really means, and the QMaze network below uses batches of 16. `fit` returns a **History** whose `.history["loss"]` lists the loss after each epoch.

Notice the shapes test: Keras stores a `Dense` layer's weights as **(inputs, outputs)**, the same way round as your NumPy `W1`, and the opposite of PyTorch's `nn.Linear`. That's the reason weights can't simply be copied from one library to the other.

Run it with `.venv\Scripts\python keras_net.py`:

```text
Keras, one hidden layer of 16: loss 0.0034
prediction at x = 1.5: 2.2791483402252197 (true 2.25)
```

Three libraries' worth of the same network (yours 0.0043, PyTorch 0.0060, Keras 0.0034), each a little different because each starts from different random weights.

```check
run ".venv/Scripts/python -m pytest -q tests/test_keras_net.py -k backend" label="Keras runs on the PyTorch backend"
run ".venv/Scripts/python -m pytest -q tests/test_keras_net.py -k layers" label="Dense layers hold weights as (inputs, outputs)"
run ".venv/Scripts/python -m pytest -q tests/test_keras_net.py -k fit" label="fit learns the curve"
```

## Your turn: the tutorial's network

**Build, on your own:** `build_model(size=100, actions=4)` in a new file, `maze_net.py`.

Here's the tutorial's QMaze network, as published. It's written for **Keras 2**, the version before Keras 3:

```python
def build_model(maze, lr=0.001):
    model = Sequential()
    model.add(Dense(maze.size, input_shape=(maze.size,)))
    model.add(PReLU())
    model.add(Dense(maze.size))
    model.add(PReLU())
    model.add(Dense(num_actions))
    model.compile(optimizer='adam', loss='mse')
    return model
```

Reading it:

- 100 inputs (the maze, as lesson 3.4's `observe` lays it out), two hidden layers of 100 units, and 4 outputs, one Q-value per action.
- **`PReLU`** is a ReLU whose slope on the negative side is a **learned** knob, one per unit, instead of always 0. A unit's output is never flat, so it can never get stuck at zero with no slope to learn from.
- **`'adam'`** is the **Adam** optimiser: it keeps a running average of each knob's recent slopes and their sizes, and scales each knob's step by them. Knobs with consistently large slopes take moderate steps, and ones with small, steady slopes take larger ones. It usually learns far faster than plain SGD and needs less tuning of the learning rate.
- Note that `lr=0.001` is passed in and then never used: `optimizer='adam'` uses Adam's default rate, which happens to be 0.001 too. That's another small slip in the tutorial, a harmless one this time.

Write it in Keras 3 style, as in `keras_net.py`: set `KERAS_BACKEND` before `import keras`, use `keras.Sequential([...])` with a list of layers, and declare the input with `keras.Input((size,))` instead of the old `input_shape=` argument. The layers are `keras.layers.Dense` and `keras.layers.PReLU`. Use `size` and `actions` instead of `maze.size` and `num_actions`. The test checks the three weight matrices are (100, 100), (100, 100) and (100, 4).

```hints
nudge: Start from `make_model` in keras_net.py. What changes is the list of layers, and the optimiser.
concept: The list is: Input((size,)), Dense(size), PReLU(), Dense(size), PReLU(), Dense(actions). Then compile with optimizer="adam" and loss="mse".
answer: Create `maze_net.py`:
~~~python
import os

os.environ.setdefault("KERAS_BACKEND", "torch")

import keras


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

~~~
The old `Sequential()` plus `model.add(...)` style still works in Keras 3. Passing `input_shape=` to the first layer works too, but prints a warning asking for an `Input` instead. Listing the layers, starting with an explicit `Input`, is the current style.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_keras_net.py -k tutorial" label="build_model has the tutorial's shape: 100 in, two hidden layers of 100, 4 out" -- keras.Sequential([keras.Input((size,)), Dense(size), PReLU(), Dense(size), PReLU(), Dense(actions)]), compiled with adam and mse.
```

## A network that knows the maze

Chapter 5 trains this network by Q-learning, with no table at all. First, a simpler question that tests everything this chapter built: can it **learn the table**? Your Chapter 3 agent's Q-table holds four values for each of the 74 free cells. Each is an example: the input is that cell's observation (the maze with the rat there), and the target is the table's four values. That's ordinary **supervised learning**: examples with known answers, as with the curve. Make `maze_net.py` this:

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

- **`table_examples`** builds the 74 examples. It moves a single environment's rat to each free cell in turn (`env.cell = cell`) and records `observe(env)` and the table's row for that cell.
- **`NetworkAgent`** wraps the trained model in the shape lesson 1.4's agents have (`act(state)` and an `epsilon`), so lesson 3.2's `completion` can judge it unchanged. Given a cell's number, it rebuilds that cell's observation (`divmod(state, 10)` turns 23 back into (2, 3)), asks the network for four values, and takes the biggest. `reshape(1, -1)` makes the observation a batch of one, because Keras always works on batches. `keras.ops.convert_to_numpy` turns the backend's tensor into a NumPy array, whatever the backend.
- **800 epochs**, batches of 16. It takes about twenty seconds.

```predict
question: The network has learned to reproduce the table's values closely (a loss around 0.001). From how many of the 74 starts will ITS OWN greedy policy reach the cheese?
choice: All 74, or very nearly
choice: About half
choice: Hardly any: it only learned numbers, not a policy
answer: All 74, or very nearly
explain: 74 of 74 for this seed. Over five seeds, measured at 800 epochs: 74, 73, 74, 74 and 73. The values it reproduces are nearly perfect, so the biggest of each four is usually the same action as the table's. But it's not guaranteed: the network chose a different action from the table in up to 4 of the 74 cells, and still reached the cheese from almost all of them. At 400 epochs, with a loss around 0.01, it solved only 5 to 32 starts. Lesson 3.2 showed why the precision matters: near the start, the values that separate a good route from standing still differ by only 0.023.
verify: script maze_net_wins.py
```

```text
loss after 800 epochs: 0.001169
the network's own greedy policy: (74, 74)
```

This is a 20,804-knob function that has learned, from 74 examples, to do what the 400-number table does. On its own that's no improvement. But it reads the maze's walls, and that's what Chapter 5 builds on: training the network directly from experience, by Q-learning, without a table to copy.

```check
run ".venv/Scripts/python -m pytest -q tests/test_keras_net.py -k examples" label="table_examples pairs each free cell's observation with its row of the table"
run ".venv/Scripts/python -m pytest -q tests/test_keras_net.py -k agent" label="NetworkAgent acts from a state number"
run ".venv/Scripts/python -m pytest -q tests/test_keras_net.py" label="all lesson 4.5 tests pass"
```

### What you've learned in this chapter

- a function with knobs, and learning as making a loss small;
- slopes, measured by nudging and computed by the chain rule, and gradient descent with a learning rate;
- a hidden layer of bent lines, the forward pass with matrices, and backpropagation, written by hand and checked;
- PyTorch: tensors, autograd (proved equal to yours), `nn` layers and the training loop;
- Keras: backends, `Sequential`, `compile` and `fit` (and the loop inside it), reading Keras 2 code, and the tutorial's QMaze network.

Next chapter: deep Q-learning. The network learns QMaze by itself, from rewards, the way the tutorial does it, in PyTorch and then in Keras.
