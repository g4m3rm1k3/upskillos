---
title: 12.2 — Learning Every Layer: Backpropagation
track: Neural Networks — A Tolerance Zone
runtime: none
concepts: backpropagation
revisits: neural-networks, logistic-regression, gradient-descent, gradients, derivatives, matrices, numpy, testing
notebook: ml-backprop-by-hand
lab: 21
problem: Hand-picked hidden units made a diamond. To learn better ones from the inspected holes, gradient descent needs the slope of the loss with respect to every weight, including the ones in the hidden layer, which never touch the output directly. How do you work out how much a weight deep inside the network is to blame?
---

Gradient descent (lesson 3.2) needs one thing: for every parameter, the slope of the loss with respect to it. For logistic regression (lesson 8.4), the weights touch the output directly and the slope was one line. In a network, a first-layer weight changes a hidden unit, which changes the output's score, which changes the probability, which changes the loss. Its effect passes through a **chain** of steps.

The **chain rule** (lesson 2.3) says how slopes combine along a chain: multiply them. **Backpropagation** is the chain rule organised so that every slope in the network is computed in one backwards sweep, reusing the work for each layer in the layer before it.

> **Backpropagation**: computing the gradient of the loss with respect to every parameter by starting at the output, where the error is known, and passing it **backwards** layer by layer. Each layer receives "how much the loss would change if my output changed" and uses it to compute (a) the gradients of its own weights and (b) the same quantity for the layer before it.
>
> *Picture it as* tracing a defect back up a production line. Final inspection finds the part 0.3 mm long. The last station works out how much of that came through from the part it received and how much from its own setting, and passes "your share was this much" back to the station before, which does the same. Each station learns how to adjust its own setting from the share passed back to it.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_network.py provided
# Tests for network.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_network.py
import numpy as np
from pytest import approx
from sklearn.metrics import log_loss

import holes

X_TRAIN, Y_TRAIN = holes.measure(1000, seed=0)
X_TEST, Y_TEST = holes.measure(1000, seed=1)
Z_TRAIN, Z_TEST = X_TRAIN / holes.TOLERANCE, X_TEST / holes.TOLERANCE

DIAMOND = {
    "W1": np.array([[1.0, -1.0, 0.0, 0.0], [0.0, 0.0, 1.0, -1.0]]),
    "b1": np.zeros(4),
    "W2": np.full((4, 1), -1.0),
    "b2": np.array([1.2]),
}


def test_init_gives_random_weights_and_zero_biases():
    import network
    params = network.init(inputs=2, hidden=8, seed=0)
    assert params["W1"].shape == (2, 8) and params["W2"].shape == (8, 1)
    assert params["b1"].tolist() == [0] * 8 and params["b2"].tolist() == [0]
    assert len(set(params["W1"].ravel().tolist())) == 16


def test_forward_runs_the_diamond_as_a_network():
    import network
    p, _ = network.forward(DIAMOND, np.array([[0.0, 0.0], [2.0, 0.0]]))
    assert p == approx([1 / (1 + np.exp(-1.2)), 1 / (1 + np.exp(0.8))])


def test_loss_is_log_loss():
    import network
    params = network.init(2, 8, seed=0)
    assert network.loss(params, Z_TRAIN, Y_TRAIN) == approx(log_loss(Y_TRAIN, network.forward(params, Z_TRAIN)[0]))


def test_gradients_match_the_slopes_measured_numerically():
    import network
    params = network.init(2, 3, seed=4)
    X, y = Z_TRAIN[:20], Y_TRAIN[:20]
    grads = network.gradients(params, X, y)
    h = 1e-6
    for name, values in params.items():
        for index in np.ndindex(values.shape):
            up = {key: value.copy() for key, value in params.items()}
            down = {key: value.copy() for key, value in params.items()}
            up[name][index] += h
            down[name][index] -= h
            slope = (network.loss(up, X, y) - network.loss(down, X, y)) / (2 * h)
            assert grads[name][index] == approx(slope, rel=1e-4, abs=1e-8), f"{name}{index}"


def test_training_learns_the_tolerance_zone():
    import network
    params = network.init(2, 8, seed=0)
    history = network.train(params, Z_TRAIN, Y_TRAIN, rate=0.5, steps=3000)
    assert history[-1] < 0.06 < 0.6 < network.loss(network.init(2, 8, seed=0), Z_TRAIN, Y_TRAIN)
    p, _ = network.forward(params, Z_TEST)
    assert np.mean((p > 0.5) == Y_TEST) >= 0.96
```

- **`DIAMOND`** is lesson 12.1's hand-made network written as a network's parameters: the same four hidden units, then an output unit that adds them with weight −1 each plus 1.2, and squashes with the sigmoid. Right at the centre the score is 1.2 (P(pass) 0.77); at (2, 0) it's −2 + 1.2 = −0.8 (P(pass) 0.31).
- **The gradient test nudges every single parameter**, one at a time, each way, and compares your backpropagated gradient with the measured slope (lesson 8.4's check, for a whole network). **`np.ndindex(shape)`** produces every index of an array of that shape: `(0, 0), (0, 1), …`. The `f"{name}{index}"` after the comma is the message pytest shows if that assertion fails, so you'd see *which* weight is wrong.

```check
file tests/test_network.py -- Click "Create provided tests/test_network.py" above.
```

## The forward pass

The network for this lesson: 2 inputs, one hidden layer of 8 ReLU units, and one output unit with a sigmoid, which reports P(pass). Written out:

$$\mathbf{z}_1 = X W_1 + \mathbf{b}_1, \qquad H = \text{relu}(\mathbf{z}_1), \qquad z_2 = H W_2 + b_2, \qquad p = \sigma(z_2)$$

The parameters live in a dictionary: `W1` (2 × 8), `b1` (8), `W2` (8 × 1), `b2` (1).

**Starting values matter.** The weights start random, not zero. (Lesson 12.3 shows what goes wrong with zeros.) Their spread is $\sqrt{2 / \text{inputs}}$: with more inputs feeding a unit, its weighted sum adds up more terms, so each weight should be smaller to keep the sum a sensible size. This choice, made for ReLU networks, is called **He initialisation**.

Create `network.py` with the forward pass and the loss:

```python file=network.py
import numpy as np

from layers import relu


def sigmoid(z: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-z))


def init(inputs: int, hidden: int, seed: int) -> dict:
    """Random starting weights, scaled to the number of inputs each unit has; biases start at 0."""
    rng = np.random.default_rng(seed)
    return {
        "W1": rng.normal(0, np.sqrt(2 / inputs), (inputs, hidden)),
        "b1": np.zeros(hidden),
        "W2": rng.normal(0, np.sqrt(2 / hidden), (hidden, 1)),
        "b2": np.zeros(1),
    }


def forward(params: dict, X: np.ndarray) -> tuple[np.ndarray, dict]:
    """P(pass) for each row, and the in-between values that backward needs."""
    z1 = X @ params["W1"] + params["b1"]
    hidden = relu(z1)
    z2 = hidden @ params["W2"] + params["b2"]
    return sigmoid(z2[:, 0]), {"z1": z1, "hidden": hidden}


def loss(params: dict, X: np.ndarray, y: np.ndarray) -> float:
    p = np.clip(forward(params, X)[0], 1e-15, 1 - 1e-15)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
```

- **`from layers import relu`**: reuse lesson 12.1's function rather than writing it twice.
- **`z2[:, 0]`**: `z2` is a table with one column (one output unit); `[:, 0]` takes that column as a plain array, one number per hole.
- **`forward` returns the in-between values too**, `z1` and `hidden`. Backpropagation needs them, and saving them avoids computing them twice.
- **`loss`** is lesson 8.4's log loss.

```check
run ".venv/Scripts/python -m pytest -q tests/test_network.py -k \"init or forward or loss\"" label="random starting weights, the diamond run as a network, and log loss"
```

## The backward pass

Work backwards from the loss, one step at a time. Each line below is the chain rule: the slope arriving from later in the chain, times the slope of this step.

**1. The output's score.** For a sigmoid output with log loss, lesson 8.4 found that the slope of the loss with respect to the score $z_2$ is simply $p - y$ for each hole (divided by $n$, because the loss is a mean). Call that the output **error**:

$$\delta_2 = (p - y) / n$$

**2. The output weights.** $z_2 = H W_2 + b_2$, so changing $W_2$'s weight from hidden unit $j$ changes $z_2$ by that unit's value $h_j$. Multiply by the error arriving at $z_2$, and add up over all holes:

$$\frac{\partial L}{\partial W_2} = H^\top \delta_2, \qquad \frac{\partial L}{\partial b_2} = \textstyle\sum \delta_2$$

That's logistic regression's gradient (lesson 8.4), with the hidden units playing the part of the features.

**3. The hidden units.** Now pass the error back. Changing hidden unit $j$'s value changes $z_2$ by its outgoing weight $W_{2,j}$, so the error arriving at the hidden values is $\delta_2 W_2^\top$. Then step back through the ReLU: its slope is 1 where its input was positive (it passed the value straight through) and 0 where it was negative (nothing got through, so nothing flows back):

$$\delta_1 = (\delta_2 W_2^\top) \odot [\mathbf{z}_1 > 0]$$

($\odot$ means multiply element by element.)

**4. The first-layer weights.** Exactly as step 2, with the inputs in place of the hidden values:

$$\frac{\partial L}{\partial W_1} = X^\top \delta_1, \qquad \frac{\partial L}{\partial \mathbf{b}_1} = \textstyle\sum \delta_1$$

Notice the pattern: every layer's weight gradient is (what came *into* the layer)ᵀ × (the error at the layer's output). With more layers you'd just repeat steps 3 and 4.

Check the **shapes**, which catch most mistakes. With $n$ holes: $\delta_2$ is $n \times 1$; $H^\top$ is $8 \times n$, so $H^\top\delta_2$ is $8 \times 1$, the shape of $W_2$. $\delta_2 W_2^\top$ is $(n \times 1)(1 \times 8) = n \times 8$, one value per hole per hidden unit, the shape of $\mathbf{z}_1$. $X^\top\delta_1$ is $(2 \times n)(n \times 8) = 2 \times 8$, the shape of $W_1$. Every gradient has the shape of its parameter, as it must.

Add `gradients` to the end of `network.py`:

```python file=network.py
import numpy as np

from layers import relu


def sigmoid(z: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-z))


def init(inputs: int, hidden: int, seed: int) -> dict:
    """Random starting weights, scaled to the number of inputs each unit has; biases start at 0."""
    rng = np.random.default_rng(seed)
    return {
        "W1": rng.normal(0, np.sqrt(2 / inputs), (inputs, hidden)),
        "b1": np.zeros(hidden),
        "W2": rng.normal(0, np.sqrt(2 / hidden), (hidden, 1)),
        "b2": np.zeros(1),
    }


def forward(params: dict, X: np.ndarray) -> tuple[np.ndarray, dict]:
    """P(pass) for each row, and the in-between values that backward needs."""
    z1 = X @ params["W1"] + params["b1"]
    hidden = relu(z1)
    z2 = hidden @ params["W2"] + params["b2"]
    return sigmoid(z2[:, 0]), {"z1": z1, "hidden": hidden}


def loss(params: dict, X: np.ndarray, y: np.ndarray) -> float:
    p = np.clip(forward(params, X)[0], 1e-15, 1 - 1e-15)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def gradients(params: dict, X: np.ndarray, y: np.ndarray) -> dict:
    """The slope of the loss with respect to every weight and bias, by backpropagation."""
    p, saved = forward(params, X)
    error_out = (p - y)[:, None] / len(y)
    error_hidden = (error_out @ params["W2"].T) * (saved["z1"] > 0)
    return {
        "W2": saved["hidden"].T @ error_out,
        "b2": error_out.sum(axis=0),
        "W1": X.T @ error_hidden,
        "b1": error_hidden.sum(axis=0),
    }
```

- **`(p - y)[:, None]`**: `p - y` is a flat array of $n$ numbers. `[:, None]` adds a second axis, making it an $n \times 1$ column, so the matrix multiplications line up. (`None` used as an index means "insert an axis here".)
- **`saved["z1"] > 0`** is a table of `True`/`False`, which multiplies as 1 and 0: ReLU's slope, everywhere at once.
- **`.sum(axis=0)`**: a bias is added to every hole's sum, so its gradient adds up every hole's error for that unit.

```check
run ".venv/Scripts/python -m pytest -q tests/test_network.py -k gradients" label="every backpropagated gradient equals the slope measured by nudging that weight" -- error_out = (p - y)[:, None] / n; error_hidden = (error_out @ W2.T) * (z1 > 0); each weight's gradient = (layer input).T @ (error at its output)
```

## Training

With the gradients, training is lesson 3.2 again: step every parameter a little downhill, many times. Add `train`:

```python file=network.py
import numpy as np

from layers import relu


def sigmoid(z: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-z))


def init(inputs: int, hidden: int, seed: int) -> dict:
    """Random starting weights, scaled to the number of inputs each unit has; biases start at 0."""
    rng = np.random.default_rng(seed)
    return {
        "W1": rng.normal(0, np.sqrt(2 / inputs), (inputs, hidden)),
        "b1": np.zeros(hidden),
        "W2": rng.normal(0, np.sqrt(2 / hidden), (hidden, 1)),
        "b2": np.zeros(1),
    }


def forward(params: dict, X: np.ndarray) -> tuple[np.ndarray, dict]:
    """P(pass) for each row, and the in-between values that backward needs."""
    z1 = X @ params["W1"] + params["b1"]
    hidden = relu(z1)
    z2 = hidden @ params["W2"] + params["b2"]
    return sigmoid(z2[:, 0]), {"z1": z1, "hidden": hidden}


def loss(params: dict, X: np.ndarray, y: np.ndarray) -> float:
    p = np.clip(forward(params, X)[0], 1e-15, 1 - 1e-15)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def gradients(params: dict, X: np.ndarray, y: np.ndarray) -> dict:
    """The slope of the loss with respect to every weight and bias, by backpropagation."""
    p, saved = forward(params, X)
    error_out = (p - y)[:, None] / len(y)
    error_hidden = (error_out @ params["W2"].T) * (saved["z1"] > 0)
    return {
        "W2": saved["hidden"].T @ error_out,
        "b2": error_out.sum(axis=0),
        "W1": X.T @ error_hidden,
        "b1": error_hidden.sum(axis=0),
    }


def train(params: dict, X: np.ndarray, y: np.ndarray, rate: float, steps: int) -> list[float]:
    """Gradient descent on every parameter at once; returns the loss after each step."""
    history = []
    for _ in range(steps):
        grads = gradients(params, X, y)
        for name in params:
            params[name] = params[name] - rate * grads[name]
        history.append(loss(params, X, y))
    return history
```

**`train` changes `params` in place**: the dictionary passed in is the same object the caller holds, so after training, the caller's `params` has the learned weights. (That's why `train` returns only the loss history.) This is how dictionaries and lists behave whenever they're passed to a function: the function receives the object itself, not a copy.

```check
run ".venv/Scripts/python -m pytest -q tests/test_network.py" label="training takes the loss from 0.63 to under 0.06, and gets at least 96% of new holes right"
```

## Watching it learn

Create `learn.py`. Besides the numbers, it draws what the network learned: it asks the trained network about a grid of points and prints `#` where it says pass, with `o` marking the real zone's edge wherever the network says fail.

```python file=learn.py
import numpy as np

import holes
import network

X_train, y_train = holes.measure(1000, seed=0)
X_test, y_test = holes.measure(1000, seed=1)
Z_train, Z_test = X_train / holes.TOLERANCE, X_test / holes.TOLERANCE

params = network.init(inputs=2, hidden=8, seed=0)
print(f"loss before training: {network.loss(params, Z_train, y_train):.3f}")
history = network.train(params, Z_train, y_train, rate=0.5, steps=3000)
for step in [100, 500, 1000, 3000]:
    print(f"loss after {step:>4} steps: {history[step - 1]:.3f}")
p_pass, _ = network.forward(params, Z_test)
print(f"test accuracy: {np.mean((p_pass > 0.5) == y_test):.3f}")

print("\nwhat it learned (# = pass, o = the real zone's edge):")
for dy in np.linspace(1.6, -1.6, 17):
    row = ""
    for dx in np.linspace(-1.6, 1.6, 33):
        inside = network.forward(params, np.array([[dx, dy]]))[0][0] > 0.5
        edge = abs(np.hypot(dx, dy) - 1) < 0.07
        row += "#" if inside else ("o" if edge else ".")
    print(row)
```

- **`np.linspace(1.6, -1.6, 17)`**: 17 evenly spaced values from 1.6 down to −1.6, so the top row of the printout is the top of the zone. Twice as many columns as rows, because a character on screen is about twice as tall as it is wide.
- **`np.hypot(dx, dy)`** is $\sqrt{dx^2 + dy^2}$: the distance from true position.

```powershell
.venv\Scripts\python learn.py
```

```text
loss before training: 0.632
loss after  100 steps: 0.247
loss after  500 steps: 0.088
loss after 1000 steps: 0.069
loss after 3000 steps: 0.056
test accuracy: 0.967

what it learned (# = pass, o = the real zone's edge):
.................................
.................................
.................................
.............oooooo#.............
.........ooo###########o.........
........#################........
.......###################.......
......o###################o......
......####################o......
......####################o......
.......###################.......
........o################........
.........oo#############.........
.............####ooo.............
.................................
.................................
.................................
```

From 1,000 inspected holes and nothing else, the network has learned a round pass zone sitting almost exactly on the true tolerance circle, and gets 96.7% of new holes right. The few `o`s showing are where its edge falls just inside the circle. Its edges are made of eight straight pieces (one per hidden unit), but bent and blended so well that they look round at this scale.

How close is 96.7% to perfect? The labels come from the *true* position, but the network only sees the *measured* one, with 0.01 mm of gauge error. A hole measured right at the edge could truly be on either side, and no model can know which. Even the drawing's own rule, applied to the measured offsets, gets only 96.4% of these test holes right. The network, which was never told the rule, does as well as knowing it.

```predict
question: The network has 8 hidden units. What would you expect with 2?
choice: About the same: the zone is simple
choice: Much worse: two straight lines can't enclose a region, so it can do little better than rejecting everything
choice: Better, because it's simpler and overfits less
answer: Much worse: two straight lines can't enclose a region, so it can do little better than rejecting everything
explain: Each hidden unit contributes one straight edge. Two lines can make a strip or a wedge, but never a closed region with fails on every side. With 2 hidden units, training gets stuck at 79.6%, exactly the reject-everything score. With 4 (enough for a diamond) it reaches about 96.5%. That's how a network's size sets what shapes it can represent, its flexibility, and why too few units underfit just as too few polynomial degrees did in lesson 7.1.
```

```check
run ".venv/Scripts/python learn.py" stdout="test accuracy: 0.967" label="learn.py trains the network and draws the zone it learned"
```

Backpropagation is the whole engine of modern deep learning. Networks with hundreds of layers and billions of weights are trained with exactly the steps you just wrote: a forward pass that saves its in-between values, an error at the output, and a backward pass that hands each layer its share. The next lesson looks at making that training faster and more reliable.
