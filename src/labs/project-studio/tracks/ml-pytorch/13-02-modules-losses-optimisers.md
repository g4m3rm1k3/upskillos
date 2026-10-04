---
title: 13.2 — The Training Loop, the PyTorch Way
track: PyTorch — Reading Handwritten Digits
runtime: none
concepts: pytorch
revisits: backpropagation, neural-networks, gradient-descent, classes, testing
notebook: ml-training-a-network
lab: 23
problem: Autograd removes the backward pass, but you still wrote the layers, the loss, the update rule and the batching yourself. PyTorch has a standard piece for each. What are they, how do they map onto what you built in Chapter 12, and what does every line of a PyTorch training loop actually do?
---

Every PyTorch training script, from this one to the ones behind large language models, is built from the same five pieces. Each one is something you've already written by hand:

| PyTorch | What it is | Where you built it |
|---|---|---|
| `torch.nn.Linear`, `torch.nn.ReLU`, `torch.nn.Sequential` | layers, and a model made of them | lesson 12.1's `layer`, 12.2's `forward` |
| `torch.nn.BCEWithLogitsLoss` | the loss | lesson 8.4's log loss |
| `loss.backward()` | the gradients | lesson 12.2's `gradients` |
| `torch.optim.SGD(..., momentum=0.9)` | the update rule | lesson 12.3's velocity update |
| `torch.utils.data.DataLoader` | shuffled mini-batches | lesson 12.3's `rng.choice` |

This lesson rebuilds the tolerance-zone network from those pieces and explains the training loop line by line.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_zone_torch.py provided
# Tests for zone_torch.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_zone_torch.py
import numpy as np
import torch
from pytest import approx

import holes

X_TRAIN, Y_TRAIN = holes.measure(1000, seed=0)
X_TEST, Y_TEST = holes.measure(1000, seed=1)
Z_TRAIN, Z_TEST = X_TRAIN / holes.TOLERANCE, X_TEST / holes.TOLERANCE


def test_the_model_has_chapter_12s_shape():
    import zone_torch
    shapes = [tuple(p.shape) for p in zone_torch.make_model().parameters()]
    assert shapes == [(8, 2), (8,), (1, 8), (1,)]


def test_the_same_seed_gives_the_same_starting_weights():
    import zone_torch
    first, again = zone_torch.make_model(seed=3), zone_torch.make_model(seed=3)
    assert all(torch.equal(a, b) for a, b in zip(first.parameters(), again.parameters()))


def test_the_loss_takes_scores_not_probabilities():
    scores, labels = torch.tensor([2.0, -1.0]), torch.tensor([1.0, 0.0])
    with_logits = torch.nn.BCEWithLogitsLoss()(scores, labels)
    by_hand = torch.nn.functional.binary_cross_entropy(torch.sigmoid(scores), labels)
    assert float(with_logits) == approx(float(by_hand))


def test_batches_cover_every_row_once_per_epoch():
    import zone_torch
    loader = zone_torch.batches(np.arange(2000.0).reshape(1000, 2), np.zeros(1000), size=32, seed=0)
    sizes = [len(X_batch) for X_batch, _ in loader]
    rows = sorted(int(X_batch[i, 0]) // 2 for X_batch, _ in loader for i in range(len(X_batch)))
    assert sizes == [32] * 31 + [8]
    assert rows == list(range(1000))


def test_training_learns_the_zone():
    import zone_torch
    model = zone_torch.make_model()
    history = zone_torch.train(model, Z_TRAIN, Y_TRAIN, epochs=100)
    assert history[-1] < history[0] / 2
    assert np.mean(zone_torch.predict(model, Z_TEST) == Y_TEST) >= 0.95
```

- **`torch.equal(a, b)`** is `True` when two tensors have the same shape and identical values.
- The batch test builds 1,000 rows whose first column is 0, 2, 4, …, 1998, so `// 2` recovers each row's number. Every row number must appear exactly once across the batches: one **epoch**.
- The training test asks for at least 95% (lesson 12.3 got 96.6%): PyTorch uses 32-bit numbers, and its random starting weights differ from `network.init`'s, so the exact result differs a little.

```check
file tests/test_zone_torch.py -- Click "Create provided tests/test_zone_torch.py" above.
```

## Layers and a model

> **`torch.nn.Module`**: PyTorch's base class for anything with learnable parameters: a single layer, or a whole model built from layers. A module is called like a function, `model(X)`, which runs its forward pass, and `model.parameters()` lists every tensor it will learn.
>
> *Picture it as* a standard fixture plate with dowel holes: every module fits the same way, so layers bolt together into bigger modules, and the optimiser can reach every adjustable part through one handle, `parameters()`.

Three standard modules rebuild Chapter 12's network:

- **`torch.nn.Linear(2, 8)`**: a layer of 8 units, each a weighted sum of 2 inputs plus a bias: `X @ W.T + b`. It creates its own weights, randomly, already scaled to its number of inputs (lesson 12.2's reason). One surprise: PyTorch stores the weights as **(outputs, inputs)**, 8 × 2, the transpose of `network.init`'s 2 × 8, and multiplies by `W.T`. Same numbers, other way round.
- **`torch.nn.ReLU()`**: the activation, as a module so it can sit in a list of layers.
- **`torch.nn.Sequential(a, b, c)`**: a module that runs its modules in order, each one's output feeding the next.

Create `zone_torch.py`:

```python file=zone_torch.py
import numpy as np
import torch


def make_model(hidden: int = 8, seed: int = 0) -> torch.nn.Module:
    """Chapter 12's network: 2 inputs, a hidden layer of ReLU units, 1 output score."""
    torch.manual_seed(seed)
    return torch.nn.Sequential(
        torch.nn.Linear(2, hidden),
        torch.nn.ReLU(),
        torch.nn.Linear(hidden, 1),
    )
```

**`torch.manual_seed(seed)`** seeds PyTorch's own random generator, which `Linear` uses for its starting weights. Without it, every run would start differently.

The model's last layer has **no sigmoid**. It outputs a raw score (a **logit**: lesson 8.4's $z$, the log odds), and the loss applies the sigmoid itself. That's the next step's point.

```check
run ".venv/Scripts/python -m pytest -q tests/test_zone_torch.py -k \"shape or seed\"" label="Linear(2, 8), ReLU, Linear(8, 1): Chapter 12's 33 parameters, repeatable from a seed"
```

## The loss, and why it wants scores

**`torch.nn.BCEWithLogitsLoss()`** is log loss ("binary cross-entropy") that takes **scores** and applies the sigmoid inside. The test checks it equals sigmoid-then-log-loss. Why not do it in two steps? Because, as lesson 8.3 found with Naive Bayes, the steps separately can lose precision: for a score of −40, the sigmoid rounds to almost exactly 0, and $\log 0$ is $-\infty$. Combined, the loss can be computed as $\log(1 + e^{-z})$-style expressions that never underflow. It's the same answer, computed safely, so use it whenever you can.

```check
run ".venv/Scripts/python -m pytest -q tests/test_zone_torch.py -k loss" label="BCEWithLogitsLoss equals sigmoid followed by log loss"
```

## Batches

Add `batches`:

```python file=zone_torch.py
import numpy as np
import torch


def make_model(hidden: int = 8, seed: int = 0) -> torch.nn.Module:
    """Chapter 12's network: 2 inputs, a hidden layer of ReLU units, 1 output score."""
    torch.manual_seed(seed)
    return torch.nn.Sequential(
        torch.nn.Linear(2, hidden),
        torch.nn.ReLU(),
        torch.nn.Linear(hidden, 1),
    )


def batches(X: np.ndarray, y: np.ndarray, size: int, seed: int) -> torch.utils.data.DataLoader:
    """Shuffled mini-batches of (inputs, labels), as 32-bit tensors; a new shuffle each pass."""
    data = torch.utils.data.TensorDataset(torch.tensor(X, dtype=torch.float32), torch.tensor(y, dtype=torch.float32))
    return torch.utils.data.DataLoader(data, batch_size=size, shuffle=True, generator=torch.Generator().manual_seed(seed))
```

- **`TensorDataset(X, y)`** pairs up row *i* of each tensor: item *i* is `(X[i], y[i])`.
- **`DataLoader`** hands out those items in batches. Each `for` loop over it is one epoch: `shuffle=True` reorders the rows each time, and the last batch is whatever's left (1,000 = 31 × 32 + 8).
- **`dtype=torch.float32`**: 32-bit numbers, half the memory of NumPy's default 64-bit, and what graphics cards are fastest at. Plenty of precision for training.
- **`generator=torch.Generator().manual_seed(seed)`**: a seeded random generator just for the shuffling, so the order of batches is repeatable.

```check
run ".venv/Scripts/python -m pytest -q tests/test_zone_torch.py -k batches" label="each epoch covers every row exactly once, in 31 batches of 32 and one of 8"
```

## The training loop, line by line

Add `train` and `predict`:

```python file=zone_torch.py
import numpy as np
import torch


def make_model(hidden: int = 8, seed: int = 0) -> torch.nn.Module:
    """Chapter 12's network: 2 inputs, a hidden layer of ReLU units, 1 output score."""
    torch.manual_seed(seed)
    return torch.nn.Sequential(
        torch.nn.Linear(2, hidden),
        torch.nn.ReLU(),
        torch.nn.Linear(hidden, 1),
    )


def batches(X: np.ndarray, y: np.ndarray, size: int, seed: int) -> torch.utils.data.DataLoader:
    """Shuffled mini-batches of (inputs, labels), as 32-bit tensors; a new shuffle each pass."""
    data = torch.utils.data.TensorDataset(torch.tensor(X, dtype=torch.float32), torch.tensor(y, dtype=torch.float32))
    return torch.utils.data.DataLoader(data, batch_size=size, shuffle=True, generator=torch.Generator().manual_seed(seed))


def train(model: torch.nn.Module, X: np.ndarray, y: np.ndarray, epochs: int,
          rate: float = 0.5, momentum: float = 0.9, batch: int = 32, seed: int = 0) -> list[float]:
    """Mini-batch gradient descent with momentum; returns the loss on all of X after each epoch."""
    optimiser = torch.optim.SGD(model.parameters(), lr=rate, momentum=momentum)
    loss_function = torch.nn.BCEWithLogitsLoss()
    loader = batches(X, y, batch, seed)
    history = []
    for _ in range(epochs):
        for X_batch, y_batch in loader:
            optimiser.zero_grad()
            loss = loss_function(model(X_batch)[:, 0], y_batch)
            loss.backward()
            optimiser.step()
        with torch.no_grad():
            everything = torch.tensor(X, dtype=torch.float32)
            history.append(float(loss_function(model(everything)[:, 0], torch.tensor(y, dtype=torch.float32))))
    return history


def predict(model: torch.nn.Module, X: np.ndarray) -> np.ndarray:
    """1 where the model's score is above 0 (P(pass) above 0.5), else 0."""
    with torch.no_grad():
        scores = model(torch.tensor(X, dtype=torch.float32))[:, 0]
    return (scores > 0).int().numpy()
```

The loop is the heart of every PyTorch program. Each line, and its Chapter 12 equivalent:

| line | what it does | lesson 12.3 |
|---|---|---|
| `optimiser = torch.optim.SGD(model.parameters(), lr=rate, momentum=momentum)` | holds the parameters and their velocities | `velocity = {...}` |
| `for X_batch, y_batch in loader:` | one shuffled mini-batch at a time | `rows = rng.choice(...)` |
| `optimiser.zero_grad()` | clear every parameter's `.grad` | (not needed: `gradients` returned fresh ones) |
| `loss = loss_function(model(X_batch)[:, 0], y_batch)` | forward pass and loss, recording history | `forward` and `loss` |
| `loss.backward()` | fill every parameter's `.grad` | `gradients(...)` |
| `optimiser.step()` | velocity = momentum × velocity − rate × grad; parameter += velocity | the update loop |

**`zero_grad()` is the line people forget.** `backward()` doesn't *replace* each `.grad`; it *adds* to it. That's useful in advanced tricks, but in a normal loop, forgetting to clear means every step uses the sum of all gradients so far, and training goes haywire. Once the tests pass, try commenting the line out and running `run_zone.py`: watch the loss.

**`with torch.no_grad():`** switches off history recording for the indented block. Measuring the loss for the history, or predicting, isn't training: recording it would waste memory and time.

**`predict`**: a score above 0 is the same as P(pass) above 0.5, since $\sigma(0) = 0.5$, so there's no need to apply the sigmoid at all. `.int().numpy()` turns `True`/`False` into 1/0 and the tensor into a NumPy array.

```check
run ".venv/Scripts/python -m pytest -q tests/test_zone_torch.py" label="the PyTorch network learns the tolerance zone to at least 95%" -- optimiser.zero_grad(); loss = loss_function(model(X_batch)[:, 0], y_batch); loss.backward(); optimiser.step()
```

## Run it

Create `run_zone.py`:

```python file=run_zone.py
import numpy as np

import holes
import zone_torch

X_train, y_train = holes.measure(1000, seed=0)
X_test, y_test = holes.measure(1000, seed=1)
Z_train, Z_test = X_train / holes.TOLERANCE, X_test / holes.TOLERANCE

model = zone_torch.make_model()
print(model)
print("parameters:", sum(p.numel() for p in model.parameters()))
history = zone_torch.train(model, Z_train, y_train, epochs=100)
print(f"loss after 1 epoch: {history[0]:.2f}, after 100: {history[-1]:.2f}")
print(f"test accuracy: {np.mean(zone_torch.predict(model, Z_test) == y_test):.2f}")
```

**`p.numel()`** is the number of elements in a tensor; summed over all the parameters, it's the size of the model.

```powershell
.venv\Scripts\python run_zone.py
```

```text
Sequential(
  (0): Linear(in_features=2, out_features=8, bias=True)
  (1): ReLU()
  (2): Linear(in_features=8, out_features=1, bias=True)
)
parameters: 33
loss after 1 epoch: 0.21, after 100: 0.07
test accuracy: 0.96
```

Printing a model shows its layers. 33 parameters: 2 × 8 weights + 8 biases in the hidden layer, 8 weights + 1 bias at the output, exactly Chapter 12's network. Same data, same result, and the only maths you wrote was the forward pass.

```check
run ".venv/Scripts/python run_zone.py" stdout="parameters: 33" label="run_zone.py trains the tolerance network in PyTorch"
```

```predict
question: You add a second hidden layer of 8 units to the model. What do you need to change in train?
choice: Write the new layer's backward pass and add its velocity
choice: Nothing: autograd and the optimiser find every parameter through model.parameters()
choice: Add a second optimiser for the new layer
answer: Nothing: autograd and the optimiser find every parameter through model.parameters()
explain: This is the payoff. `torch.nn.Sequential(Linear(2, 8), ReLU(), Linear(8, 8), ReLU(), Linear(8, 1))` is a deeper network, and `train` works on it unchanged: `loss.backward()` records and reverses whatever the forward pass did, and the optimiser updates whatever `parameters()` lists. In Chapter 12, the same change meant re-deriving the backward pass.
```

With the five pieces in place, the next lesson points them at a problem that's really too big for hand-written gradients: images.
