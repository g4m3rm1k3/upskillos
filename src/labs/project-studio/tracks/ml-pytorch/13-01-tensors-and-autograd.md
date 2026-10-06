---
title: 13.1 — Gradients for Free: Tensors and Autograd
track: PyTorch — Reading Handwritten Digits
trackOrder: 33
runtime: none
support: holes.py, layers.py, network.py
concepts: pytorch
revisits: backpropagation, neural-networks, derivatives, numpy, testing
notebook: ml-autograd-engine
lab: 23
problem: Lesson 12.2's backward pass took careful algebra for a network with one hidden layer. A real network has dozens of layers of different kinds, and deriving every gradient by hand would take weeks and be wrong somewhere. Could the computer work out the backward pass itself, from nothing but the forward pass?
---

Backpropagation (lesson 12.2) followed a rule: every operation in the forward pass has its own small backward rule, and the chain rule strings them together in reverse. Nothing about that needs a human. If a program **records** each operation as the forward pass runs, it can play the recording backwards and apply each operation's rule automatically.

That's what **PyTorch** does, and it's why it (and libraries like it) made modern deep learning practical. You write only the forward pass, the part that's easy to think about. You don't write the gradients: autograd computes them, at roughly the cost of one more pass through the computation, and for differentiable operations they're exactly the ones you'd have derived.

This chapter teaches PyTorch by checking it against your own code first, then uses it for something too big to do by hand: reading handwritten digits.

## A new project

1. **Choose folder…** → in **Documents**, a **New folder** named `digit-reader`.
2. `python -m venv .venv`
3. `requirements.txt`:

```text file=requirements.txt
pytest==9.1.1
numpy==2.5.3
scikit-learn==1.9.1
torch==2.14.1
```

4. `.venv\Scripts\python -m pip install -r requirements.txt`

PyTorch is large: a download of a few hundred megabytes on Windows (it also runs on graphics cards, though nothing in this chapter needs one). Give it a few minutes.

```check
run ".venv/Scripts/python -c \"import torch, sklearn, numpy, pytest\"" label="PyTorch, NumPy, scikit-learn and pytest are installed in the project's Python" -- python -m venv .venv, then .venv\Scripts\python -m pip install -r requirements.txt
```

## Read the tests first

**This step: create the supplied files and read them. No code yet.** The button also creates `holes.py`, `layers.py` and `network.py`: your tolerance-zone network from Chapter 12, exactly as lesson 12.3 left it. This lesson checks PyTorch against it.

```python file=tests/test_autograd.py provided
# Tests for autograd_check.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_autograd.py
import numpy as np
import torch
from pytest import approx

import holes
import network

X, Y = holes.measure(1000, seed=0)
Z = X / holes.TOLERANCE


def test_a_tensor_is_an_array_that_can_remember_its_history():
    import autograd_check
    x = torch.tensor(3.0, requires_grad=True)
    assert autograd_check.slope_of_square_plus_double(x) == approx(8.0)


def test_numpy_and_torch_forward_passes_agree():
    import autograd_check
    params = network.init(2, 8, seed=0)
    p_numpy, _ = network.forward(params, Z[:50])
    p_torch = autograd_check.forward(autograd_check.to_tensors(params), torch.tensor(Z[:50]))
    assert p_torch.detach().numpy() == approx(p_numpy)


def test_autograd_gives_exactly_the_backpropagation_gradients():
    import autograd_check
    params = network.init(2, 8, seed=0)
    by_hand = network.gradients(params, Z[:50], Y[:50])
    automatic = autograd_check.gradients(params, Z[:50], Y[:50])
    for name in params:
        assert np.allclose(automatic[name], by_hand[name]), name
```

The key test is the last: for every weight in the network, PyTorch's automatically computed gradient must equal the one your hand-written backward pass produces.

```check
file tests/test_autograd.py -- Click "Create provided tests/test_autograd.py" above.
file network.py
```

## Tensors

> **Tensor**: PyTorch's array: a grid of numbers of any number of dimensions, like a NumPy array, with two extra powers. It can live on a graphics card, and, when created with `requires_grad=True`, it **records every operation** done with it, so the gradient can be computed later.
>
> *Picture it as* a part with a traveller (a route card) attached. As it passes through each operation, the operation is stamped on the card. At the end, reading the card backwards tells you exactly which operations the result came from, in order.

Try it at the Python prompt (`.venv\Scripts\python`):

```text
>>> import torch
>>> x = torch.tensor(3.0, requires_grad=True)
>>> y = x ** 2 + 2 * x
>>> y
tensor(15., grad_fn=<AddBackward0>)
>>> y.backward()
>>> x.grad
tensor(8.)
```

- **`torch.tensor(3.0, requires_grad=True)`**: a tensor holding 3.0 that records what's done with it.
- **`grad_fn=<AddBackward0>`**: the last stamp on the traveller. `y` knows it came from an addition, which knows it came from a power and a multiplication, which know they came from `x`.
- **`y.backward()`** plays the recording backwards, applying the chain rule, and stores $\frac{dy}{dx}$ in **`x.grad`**. By hand: $\frac{d}{dx}(x^2 + 2x) = 2x + 2 = 8$ at $x = 3$ (lesson 2.3).

Create `autograd_check.py` with that example as a function:

```python file=autograd_check.py
import torch


def slope_of_square_plus_double(x: torch.Tensor) -> float:
    """d/dx of x² + 2x, worked out by autograd."""
    y = x ** 2 + 2 * x
    y.backward()
    return float(x.grad)
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_autograd.py -k tensor" label="autograd finds the slope of x² + 2x at 3: 8"
```

## The network in PyTorch

Now lesson 12.2's forward pass, written with tensors. It reads almost exactly like the NumPy version: `@` is matrix multiplication, `torch.relu` and `torch.sigmoid` are the activations.

Then the backward pass, which in PyTorch is **one line**. Compute the loss as a tensor, call `.backward()`, and every parameter that had `requires_grad=True` now holds its gradient in `.grad`. Add to `autograd_check.py`:

```python file=autograd_check.py
import numpy as np
import torch


def slope_of_square_plus_double(x: torch.Tensor) -> float:
    """d/dx of x² + 2x, worked out by autograd."""
    y = x ** 2 + 2 * x
    y.backward()
    return float(x.grad)


def to_tensors(params: dict) -> dict:
    """Lesson 12.2's NumPy parameters as tensors that record their history."""
    return {name: torch.tensor(value, requires_grad=True) for name, value in params.items()}


def forward(params: dict, X: torch.Tensor) -> torch.Tensor:
    hidden = torch.relu(X @ params["W1"] + params["b1"])
    return torch.sigmoid(hidden @ params["W2"] + params["b2"])[:, 0]


def gradients(params: dict, X: np.ndarray, y: np.ndarray) -> dict:
    """The same gradients as network.gradients, but with no backward pass written by hand."""
    tensors = to_tensors(params)
    p = forward(tensors, torch.tensor(X))
    loss = torch.nn.functional.binary_cross_entropy(p, torch.tensor(y, dtype=p.dtype))
    loss.backward()
    return {name: tensor.grad.numpy() for name, tensor in tensors.items()}
```

- **`torch.tensor(value, requires_grad=True)`** copies a NumPy array into a tensor. It keeps NumPy's number type, 64-bit floats, so the comparison with NumPy is exact.
- **`binary_cross_entropy`** is PyTorch's name for lesson 8.4's log loss (cross-entropy for two classes). `dtype=p.dtype` converts the 0/1 labels to the same number type as `p`.
- **`tensor.grad.numpy()`** turns each gradient back into a NumPy array for comparing.
- In the test, **`.detach()`** before `.numpy()`: a tensor that's recording history can't be turned into a NumPy array directly (NumPy can't record it), so `.detach()` gives a copy with the recording stripped off.

Compare the amount of code. Lesson 12.2's `gradients` needed the four-step derivation, the shape-checking, and a numerical test to be sure. This needed `loss.backward()`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_autograd.py" label="PyTorch's automatic gradients equal your hand-written backpropagation, weight for weight"
```

> **Autograd** (automatic differentiation): computing exact derivatives by recording the operations of a calculation and applying each operation's derivative rule in reverse, the chain rule done by the computer. Not an approximation like lesson 2.3's nudging (which needs two evaluations per weight), and not algebra done symbolically: it's lesson 12.2's backward pass, generated.
>
> *Picture it as* reading the route card backwards to cost a rework: each station on the card knows its own contribution, so walking the card in reverse attributes the total to every step automatically.

```predict
question: A network has 1,000,000 weights. Roughly how many forward passes would it take to get all the gradients by lesson 2.3's nudging method, and how many with autograd?
choice: Both about one
choice: Nudging: about two million (two per weight); autograd: one forward and one backward pass
choice: Nudging: one; autograd: one million
answer: Nudging: about two million (two per weight); autograd: one forward and one backward pass
explain: Measuring a slope numerically means nudging one weight up and down and re-running the whole network, for every weight in turn. Backpropagation gets every gradient at once, in one backward sweep costing about as much as the forward pass. That difference, two million against two, is why training networks with millions or billions of weights is possible at all.
```

Everything from here on uses autograd. The next lesson rebuilds the whole tolerance-zone training in PyTorch's own vocabulary: layers, losses, optimisers and data loaders.
