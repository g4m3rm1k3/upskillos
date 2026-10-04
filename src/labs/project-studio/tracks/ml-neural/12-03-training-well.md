---
title: 12.3 — Training Well: Starts, Steps, Batches and Momentum
track: Neural Networks — A Tolerance Zone
runtime: none
concepts: backpropagation
revisits: neural-networks, gradient-descent, scikit-learn, testing
notebook: ml-optimisers
lab: 22
problem: The network learned the zone, but it took 3,000 passes over every hole, and some settings make training stall or blow up. Real networks train on millions of examples. What makes training fail, and what makes it fast enough to use?
---

Lesson 12.2's training worked, but slowly: 3,000 steps, each looking at all 1,000 holes. That's fine for a toy and hopeless for a real network trained on a million images. And the settings were chosen to work; other reasonable-looking choices fail outright. This lesson breaks training on purpose in two ways, then speeds it up in two ways. Every one of these ideas is used in every modern network.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_training.py provided
# Tests for network.train's batches and momentum, and for how training fails. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_training.py
import numpy as np
from sklearn.neural_network import MLPClassifier

import holes
import network

X_TRAIN, Y_TRAIN = holes.measure(1000, seed=0)
X_TEST, Y_TEST = holes.measure(1000, seed=1)
Z_TRAIN, Z_TEST = X_TRAIN / holes.TOLERANCE, X_TEST / holes.TOLERANCE


def accuracy(params):
    return np.mean((network.forward(params, Z_TEST)[0] > 0.5) == Y_TEST)


def test_identical_starting_weights_give_identical_units():
    params = {name: np.full_like(value, 0.5) for name, value in network.init(2, 8, seed=0).items()}
    network.train(params, Z_TRAIN, Y_TRAIN, rate=0.5, steps=500)
    assert np.unique(params["W1"][0]).size == 1 and np.unique(params["W1"][1]).size == 1
    assert accuracy(params) == np.mean(Y_TEST == 0)


def test_a_zero_start_never_moves_the_weights():
    params = {name: np.zeros_like(value) for name, value in network.init(2, 8, seed=0).items()}
    network.train(params, Z_TRAIN, Y_TRAIN, rate=0.5, steps=100)
    assert not params["W1"].any() and not params["W2"].any()


def test_too_big_a_step_makes_the_loss_worse():
    params = network.init(2, 8, seed=0)
    history = network.train(params, Z_TRAIN, Y_TRAIN, rate=50, steps=1000)
    assert history[-1] > 1


def test_momentum_makes_faster_progress():
    plain = network.train(network.init(2, 8, seed=0), Z_TRAIN, Y_TRAIN, rate=0.5, steps=100)
    rolling = network.train(network.init(2, 8, seed=0), Z_TRAIN, Y_TRAIN, rate=0.5, steps=100, momentum=0.9)
    assert rolling[-1] < 0.1 < 0.2 < plain[-1]


def test_minibatches_get_further_in_the_same_number_of_passes():
    params = network.init(2, 8, seed=0)
    history = network.train(params, Z_TRAIN, Y_TRAIN, rate=0.5, steps=3125, batch=32)
    assert history[-1] < 0.08


def test_scikit_learn_mlp_learns_the_zone_too():
    model = MLPClassifier(hidden_layer_sizes=(8,), max_iter=2000, random_state=0).fit(Z_TRAIN, Y_TRAIN)
    assert np.mean(model.predict(Z_TEST) == Y_TEST) >= 0.96
```

**`np.full_like(value, 0.5)`** makes an array the same shape as `value`, every entry 0.5; `np.zeros_like` does the same with 0. **`.any()`** is `True` if any entry is non-zero, so `not params["W1"].any()` means "every weight is still exactly 0".

```check
file tests/test_training.py -- Click "Create provided tests/test_training.py" above.
```

## Breaking it: the start

Run the first two tests with lesson 12.2's `train`, which needs no changes for them:

```check
run ".venv/Scripts/python -m pytest -q tests/test_training.py -k \"starting or zero_start\"" label="identical starting weights stay identical; zero starting weights never move"
```

Both pass, and both describe networks that can't learn.

**Every weight 0.5.** All eight hidden units start with the same weights, so they compute the same value for every hole. In backpropagation, each unit's gradient depends only on its own value and its outgoing weight, which are also identical. So every unit gets the same gradient, takes the same step, and is identical again. Forever. Eight units behave as one, and one line can't enclose a zone: the network ends up rejecting everything.

> **Symmetry**: when hidden units start identical, gradient descent can never make them different. **Random initialisation** breaks the symmetry: each unit starts as a different line, and learns to become a different useful one.
>
> *Picture it as* eight new inspectors given identical training and the same checklist, who always stand together and see the same parts. They'll always agree, and you've paid for eight people to get one opinion.

**Every weight 0.** Worse still. With ReLU, every hidden value is 0, and the output weights are 0 too, so the error passed back to the hidden layer is multiplied by those zero weights: nothing reaches the first layer at all. Only the output bias learns, settling at the overall pass rate. This is why lesson 12.2's `init` uses random weights with a deliberate spread.

## Breaking it: the step size

```check
run ".venv/Scripts/python -m pytest -q tests/test_training.py -k too_big" label="a learning rate of 50 sends the loss up, not down"
```

Lesson 3.2's warning, in a network: each step overshoots the bottom of the valley and lands higher up the other side. With rate 50 the loss climbs to nearly 4, worse than guessing, and you'll see NumPy warn `overflow encountered in exp`: the scores have become so large that $e^{-z}$ no longer fits in a float. A loss that *rises* during training almost always means the learning rate is too big.

Measured on this network, after 100 and 1,000 steps:

| learning rate | loss after 100 | loss after 1,000 |
|---|---|---|
| 0.05 | 0.467 | 0.246 |
| 0.5 | 0.247 | 0.069 |
| 5 | 0.072 | 0.051 |
| 50 | (rises) | 3.933 |

Too small wastes time; too large never arrives. The best rate depends on the network and the data, and finding it is part of every project.

## Faster: momentum

Plain gradient descent forgets everything between steps: each step looks only at the slope right here. In a long, gently sloping valley it creeps; where the valley's walls are steep it zigzags from side to side.

> **Momentum**: keep a running **velocity** for each parameter, which each step's gradient adds to while the old velocity mostly carries on: velocity = 0.9 × old velocity − rate × gradient; parameter += velocity. Consistent slopes build up speed; slopes that keep reversing (the zigzag) cancel out.
>
> *Picture it as* a heavy ball rolling down the valley instead of a careful walker. It picks up speed on a long downhill, and its weight carries it straight through small bumps and side-to-side wobbles rather than reacting to each one.

## Faster: mini-batches

Each step of lesson 12.2 computed the gradient over all 1,000 holes. But the gradient from a random 32 of them points in nearly the same direction, at a thirtieth of the cost. Taking many cheap, slightly noisy steps beats taking a few exact ones.

> **Mini-batch gradient descent**: each step uses the gradient from a small random sample (a **batch**, often 32 to 512 examples) instead of the whole training set. One pass through as many examples as the training set holds is called an **epoch**. (With batches of 1, it's called **stochastic gradient descent**, SGD, a name now often used for mini-batches too.)
>
> *Picture it as* a process engineer adjusting a machine from a sample of 32 parts every few minutes, rather than waiting for the whole day's 1,000 to be measured before making one adjustment. Each sample gives a slightly rough reading, but thirty adjustments a day beat one.

Update `train` in `network.py` (the rest of the file is unchanged):

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


def train(params: dict, X: np.ndarray, y: np.ndarray, rate: float, steps: int,
          batch: int | None = None, momentum: float = 0.0, seed: int = 0) -> list[float]:
    """Gradient descent, on random mini-batches if batch is given, with optional momentum.
    Returns the loss on all of X after each step."""
    rng = np.random.default_rng(seed)
    velocity = {name: np.zeros_like(value) for name, value in params.items()}
    history = []
    for _ in range(steps):
        rows = rng.choice(len(y), size=batch, replace=False) if batch else np.arange(len(y))
        grads = gradients(params, X[rows], y[rows])
        for name in params:
            velocity[name] = momentum * velocity[name] - rate * grads[name]
            params[name] = params[name] + velocity[name]
        history.append(loss(params, X, y))
    return history
```

- **Default values keep the old behaviour**: with `batch=None` and `momentum=0.0`, `rows` is every row and the velocity is just `−rate × gradient`, so every step is exactly lesson 12.2's. Lesson 12.2's tests still pass unchanged.
- **`batch: int | None = None`**: the type says "a whole number, or nothing". `if batch` treats `None` as false.
- **`rng.choice(len(y), size=batch, replace=False)`**: a fresh random batch of different rows each step (lesson 10.2's call).
- **`velocity`** starts at zero, one array per parameter, the same shapes (`np.zeros_like`).
- The history still records the loss on **all** of `X`, so it's comparable between methods even though each step only sees a batch.

```check
run ".venv/Scripts/python -m pytest -q tests/test_training.py" label="momentum and mini-batches make far more progress per pass; scikit-learn's MLPClassifier learns the zone too"
```

## A fair race

To compare methods fairly, count **passes through the data**, not steps: a mini-batch step costs about a thirtieth of a full-batch one. Create `speed.py`:

```python file=speed.py
import numpy as np

import holes
import network

X_train, y_train = holes.measure(1000, seed=0)
X_test, y_test = holes.measure(1000, seed=1)
Z_train, Z_test = X_train / holes.TOLERANCE, X_test / holes.TOLERANCE

PASSES = 100
methods = {
    "full batch": dict(steps=PASSES),
    "full batch + momentum": dict(steps=PASSES, momentum=0.9),
    "batches of 32": dict(steps=PASSES * 1000 // 32, batch=32),
    "batches of 32 + momentum": dict(steps=PASSES * 1000 // 32, batch=32, momentum=0.9),
}
print(f"after {PASSES} passes through the 1,000 holes:")
print("method                      steps   loss   test accuracy")
for name, settings in methods.items():
    params = network.init(2, 8, seed=0)
    history = network.train(params, Z_train, y_train, rate=0.5, **settings)
    accuracy = np.mean((network.forward(params, Z_test)[0] > 0.5) == y_test)
    print(f"{name:<26} {settings['steps']:>6} {history[-1]:>6.3f} {accuracy:>15.3f}")
```

- **`dict(steps=PASSES)`** builds a dictionary from keyword arguments: `{"steps": 100}`.
- **`**settings`** in the call does the reverse: it unpacks the dictionary into keyword arguments, so `train(..., **{"steps": 100, "momentum": 0.9})` is `train(..., steps=100, momentum=0.9)`. One loop runs four differently-configured trainings.
- **`PASSES * 1000 // 32`**: 100 passes of 1,000 holes in batches of 32 is 3,125 steps.

```powershell
.venv\Scripts\python speed.py
```

```text
after 100 passes through the 1,000 holes:
method                      steps   loss   test accuracy
full batch                    100  0.247           0.917
full batch + momentum         100  0.071           0.965
batches of 32                3125  0.072           0.956
batches of 32 + momentum     3125  0.070           0.966
```

For the same amount of work, plain full-batch descent has barely started (loss 0.247, 91.7%). Momentum alone, or mini-batches alone, each get about as far in 100 passes as plain descent did in 1,000. Lesson 12.2 needed 3,000 passes to reach 96.7%; with both, 100 passes reach 96.6%.

```check
run ".venv/Scripts/python speed.py" stdout="batches of 32 + momentum     3125  0.070           0.966" label="speed.py races four training methods for the same amount of work"
```

## The professional version

scikit-learn's `MLPClassifier` (multilayer perceptron) is this network: `hidden_layer_sizes=(8,)` is one hidden layer of 8 ReLU units, trained with mini-batches of 200 and **Adam**, a refinement of momentum that also adapts each parameter's step size to how large its gradients have been. The last test shows it learns the zone too (96.5%). For bigger networks and real data, though, the standard tool isn't scikit-learn. It's a library built around backpropagation itself, where you write only the forward pass and the backward pass happens automatically. That's the next chapter: **PyTorch**.

```predict
question: With mini-batches the loss curve goes down in a noisy, jittery way, sometimes rising for a step. Is that a sign something's wrong?
choice: Yes: the loss should fall every step, as in lesson 12.2
choice: No: each step follows the gradient of a different random batch, which isn't exactly the full gradient, so single steps can make the full loss a little worse while the trend is still down
answer: No: each step follows the gradient of a different random batch, which isn't exactly the full gradient, so single steps can make the full loss a little worse while the trend is still down
explain: Lesson 12.2's full-batch steps always followed the exact downhill direction of the whole loss, so (with a small enough rate) it fell every step. A batch's gradient is an estimate: right on average, a bit off each time. The noise is the price of cheap steps, and it can even help, by jostling training out of poor flat regions. What you watch is the trend over many steps, or the loss on held-out data after each epoch.
```
