---
title: 4.4 — PyTorch
runtime: python
run: torch_net.py
---

Your NumPy network works, and every line of it is yours. It also has two problems that get worse with size. Every new kind of layer needs its own hand-derived `backward`, and one slip in it trains the network silently wrong (which is why you checked it against nudging). And everything runs on the CPU, one NumPy call at a time.

**PyTorch** solves both. It records every calculation you do on its arrays, and can then work out the slope of the result with respect to every input, automatically, by applying the chain rule to the record: that's **autograd**. And the same code can run on a graphics card. This lesson installs it, checks that its gradients equal yours to the last decimal, and rebuilds your network and training loop the PyTorch way.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_torch_net.py** above.

```python file=tests/test_torch_net.py provided
# Tests for torch_net.py (lesson 4.4).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_torch_net.py
import numpy as np
from pytest import approx


def test_installed_the_cpu_build():
    import torch
    assert torch.__version__.startswith("2.14.1")


def test_autograd_gives_the_gradients_you_derived():
    from tiny_net import backward, init, make_curve
    from torch_net import autograd_gradients
    x, y = make_curve()
    params = init()
    yours = backward(params, x, y)
    torchs = autograd_gradients(params, x, y)
    for name in params:
        assert np.abs(yours[name] - torchs[name]).max() < 1e-10, name


def test_autograd_leaves_your_weights_alone():
    from tiny_net import init, make_curve
    from torch_net import autograd_gradients
    params = init()
    before = {name: value.copy() for name, value in params.items()}
    autograd_gradients(params, *make_curve())
    assert all(np.array_equal(before[name], params[name]) for name in params)


def test_module_layers_and_their_shapes():
    from torch_net import make_net
    from torch import nn
    net = make_net(5)
    assert [type(layer) for layer in net] == [nn.Linear, nn.ReLU, nn.Linear], "Linear, the bend, Linear"
    shapes = [tuple(p.shape) for p in net.parameters()]
    assert shapes == [(5, 1), (5,), (1, 5), (1,)], "nn.Linear stores weights as (outputs, inputs)"


def test_train_fits_the_curve():
    from tiny_net import make_curve
    from torch_net import train_torch
    net, final = train_torch(*make_curve())
    assert final < 0.02


def test_train_is_repeatable_with_a_seed():
    from tiny_net import make_curve
    from torch_net import train_torch
    x, y = make_curve()
    assert train_torch(x, y, steps=50)[1] == approx(train_torch(x, y, steps=50)[1])
```

`test_autograd_gives_the_gradients_you_derived` demands agreement within 10⁻¹⁰, much tighter than the nudging check's 10⁻⁴. Nudging was always slightly off; autograd and your `backward` both compute the exact chain rule, so they should agree to the limits of floating-point arithmetic.

```check
file tests/test_torch_net.py -- Click "Create provided tests/test_torch_net.py" above.
```

## Install PyTorch

Add it to `requirements.txt`:

```text file=requirements.txt
numpy==2.5.3
pygame-ce==2.5.8
gymnasium==1.3.0
pytest==9.1.1
torch==2.14.1
```

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

This one is big: a 124 MB download that unpacks to several hundred megabytes, and it took about two minutes on the machine this series was written on. pip skips the four packages already installed, because their pinned versions are already there.

- **This is the CPU build.** On Windows, the `torch` on PyPI runs on the processor only. The builds that use an NVIDIA graphics card are much bigger (around 2.5 GB) and come from PyTorch's own package index. Everything up to Chapter 8 runs comfortably on a CPU: these networks are small. Chapter 8, learning from pixels, is where a graphics card starts to matter, and it explains how to install that build then.
- **If the install fails with `No such file or directory` and a very long path** ending in something like `…\torch\_inductor\…\dense_blockscaled_gemm_kernel.py`, your project folder's path is too long. Windows refuses paths longer than 260 characters unless "long paths" are switched on, and PyTorch has some very deeply nested files. This happened while this series was being written, in a folder with a long path. In `Documents\q-arcade` that file's path is 149 characters, which fits. Fix it by moving the project to a shorter path, or by enabling long paths in Windows (an administrator setting, `LongPathsEnabled` in the registry).

```check
run ".venv/Scripts/python -m pytest -q tests/test_torch_net.py -k installed" label="PyTorch 2.14.1 imports in the project's Python" -- Add torch==2.14.1 to requirements.txt and run .venv\Scripts\python -m pip install -r requirements.txt.
```

## Gradients for free

Create `torch_net.py`:

```python file=torch_net.py
import torch
from torch import nn

from tiny_net import make_curve


def autograd_gradients(params, x, y):
    tensors = {name: torch.tensor(value, requires_grad=True) for name, value in params.items()}
    X = torch.tensor(x).reshape(-1, 1)
    h = torch.relu(X @ tensors["W1"] + tensors["b1"])
    out = (h @ tensors["W2"] + tensors["b2"])[:, 0]
    loss = torch.mean((out - torch.tensor(y)) ** 2)
    loss.backward()
    return {name: tensor.grad.numpy() for name, tensor in tensors.items()}
```

Compare the middle three lines with your `forward` and `loss`: they're the same calculation, almost character for character. What's different is what PyTorch does while it runs them.

- **A tensor** is PyTorch's array, much like a NumPy array: `@`, `+`, `**`, `reshape` and slicing all work the same way. `torch.tensor(value)` makes one from a NumPy array, copying it, so your own `params` are never touched (the third test checks that).
- **`requires_grad=True`** tells PyTorch: "I'll want slopes with respect to this one." From then on, every calculation involving it is **recorded**: each result remembers what operation made it, and from which tensors. The record is a **computation graph**: here, from W1, b1, W2, b2 through `@`, `+`, `relu`, `@`, `+`, `-`, `**` and `mean`, down to `loss`.
- **`loss.backward()`** walks that graph backwards from `loss`, applying the chain rule at every step, exactly as your `backward` does by hand, and adds the result to each starting tensor's **`.grad`**. PyTorch knows the slope rule for every operation it has: `relu`'s is your `(z > 0)`, `@`'s is your transposed multiply.
- **`.grad.numpy()`** turns each slope back into a NumPy array, for comparing with yours.

```predict
question: How closely will PyTorch's gradients match your backward from lesson 4.3?
choice: Within about 0.0001, like the nudging check
choice: Within about 10 to the power -15, essentially identical
choice: They'll differ, because PyTorch uses a different method
answer: Within about 10 to the power -15, essentially identical
explain: The largest difference measured, over all 49 knobs, was 4 × 10⁻¹⁶. That's the size of the rounding in the last of the 16 or so digits a 64-bit float holds: the two calculations agree completely, and differ only in the order a few additions were done. That's the payoff of having written backward by hand: you now know what `loss.backward()` computes, and you've proved it.
verify: .venv/Scripts/python -c "import numpy as np; from tiny_net import backward, init, make_curve; from torch_net import autograd_gradients; x, y = make_curve(); p = init(); a = backward(p, x, y); b = autograd_gradients(p, x, y); d = max(np.abs(a[k] - b[k]).max() for k in p); print('Within about 10 to the power -15, essentially identical' if d < 1e-13 else d)"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_torch_net.py -k autograd" label="autograd's gradients equal your backpropagation's, and your weights are left alone" -- Make each parameter a tensor with requires_grad=True, repeat the forward pass and loss with torch operations, call loss.backward(), and read each tensor's .grad.
```

## Your turn: the network as layers

**Build, on your own:** `make_net(hidden=16)` in `torch_net.py`.

Writing the forward pass out by hand gets tedious for bigger networks, so PyTorch provides ready-made **layers**, in `torch.nn` (imported as `nn`):

- **`nn.Linear(inputs, outputs)`** is a layer of weighted sums: it holds a weight matrix and a bias, and computes `input @ weight.T + bias`. It's your `X @ W1 + b1`, packaged. It makes its own random starting weights.
- **`nn.ReLU()`** is the bend, as a layer with no knobs.
- **`nn.Sequential(layer, layer, …)`** chains layers: its output is the last layer's output, after each layer has fed the next.

Return a `Sequential` that does what your NumPy network does: one input, a hidden layer of `hidden` bent units, and one output.

Note the shapes test: `nn.Linear` stores its weight as **(outputs, inputs)**, so the first layer's weight is (5, 1), the transpose of your `W1`'s (1, 5). It computes `input @ weight.T` to make up for it. It's only a storage convention, but it matters when you copy weights between libraries.

```hints
nudge: Three layers, in the order the calculation happens.
concept: A Linear from 1 input to `hidden` outputs, a ReLU, and a Linear from `hidden` inputs to 1 output.
answer: Add to `torch_net.py`:
~~~python
def make_net(hidden=16):
    return nn.Sequential(nn.Linear(1, hidden), nn.ReLU(), nn.Linear(hidden, 1))
~~~
`make_net(5).parameters()` yields the four knob tensors in order: the first layer's weight and bias, then the second's.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_torch_net.py -k module" label="make_net chains Linear, ReLU and Linear with the right shapes" -- nn.Sequential(nn.Linear(1, hidden), nn.ReLU(), nn.Linear(hidden, 1)).
```

## The training loop

Make `torch_net.py` this:

```python file=torch_net.py
import torch
from torch import nn

from tiny_net import make_curve


def autograd_gradients(params, x, y):
    tensors = {name: torch.tensor(value, requires_grad=True) for name, value in params.items()}
    X = torch.tensor(x).reshape(-1, 1)
    h = torch.relu(X @ tensors["W1"] + tensors["b1"])
    out = (h @ tensors["W2"] + tensors["b2"])[:, 0]
    loss = torch.mean((out - torch.tensor(y)) ** 2)
    loss.backward()
    return {name: tensor.grad.numpy() for name, tensor in tensors.items()}


def make_net(hidden=16):
    return nn.Sequential(nn.Linear(1, hidden), nn.ReLU(), nn.Linear(hidden, 1))


def train_torch(x, y, hidden=16, rate=0.05, steps=3000, seed=0):
    torch.manual_seed(seed)
    net = make_net(hidden)
    optimiser = torch.optim.SGD(net.parameters(), lr=rate)
    loss_fn = nn.MSELoss()
    X = torch.tensor(x, dtype=torch.float32).reshape(-1, 1)
    Y = torch.tensor(y, dtype=torch.float32).reshape(-1, 1)
    for _ in range(steps):
        optimiser.zero_grad()
        loss = loss_fn(net(X), Y)
        loss.backward()
        optimiser.step()
    return net, loss.item()


if __name__ == "__main__":
    x, y = make_curve()
    net, final = train_torch(x, y)
    print(f"PyTorch, one hidden layer of 16: loss {final:.4f}")
```

This loop is the shape of every PyTorch training loop you'll ever read, so here it is line by line against your `train`:

| PyTorch | your NumPy `train` |
|---|---|
| `torch.manual_seed(seed)` | `init`'s `default_rng(seed)`: repeatable random starting weights |
| `net = make_net(hidden)` | `params = init(hidden, seed)` |
| `optimiser = torch.optim.SGD(net.parameters(), lr=rate)` | (nothing: the update was written out) |
| `loss = loss_fn(net(X), Y)` | `forward` and `loss`. `nn.MSELoss()` is your `mse`, and `net(X)` runs the layers in order |
| `loss.backward()` | `grads = backward(params, x, y)` |
| `optimiser.step()` | `params[name] -= rate * grads[name]` for every knob |
| `optimiser.zero_grad()` | (nothing: you made a fresh `grads` each time) |

- **The optimiser** does the update for you. **SGD** (stochastic gradient descent) is exactly yours: every knob moves `lr` times its slope downhill. Chapter 5 uses **Adam**, which adapts the step size for each knob separately.
- **`zero_grad()` must come first.** `backward` *adds* to `.grad` rather than replacing it. That's what you want when a slope has several contributions, but it means last step's slopes are still there. Forgetting `zero_grad` makes every step use the sum of all slopes so far, which is one of the most common PyTorch bugs.
- **`dtype=torch.float32`**: layers use 32-bit floats, about 7 significant digits instead of 64-bit's 16. They're half the memory and much faster on graphics cards, and plenty precise for learning. The data must match the layers' type.
- **`loss.item()`** turns a one-number tensor into a plain Python float.

Run it:

```text
PyTorch, one hidden layer of 16: loss 0.0060
```

Your NumPy network reached 0.0043. Same data, same size, same optimiser, same number of steps, but `nn.Linear` chooses its random starting weights differently from your `init` (it draws them from a range that depends on the layer's size). A different start means a different slide downhill. Both are fits within a factor of three of the noise.

```check
run ".venv/Scripts/python -m pytest -q tests/test_torch_net.py -k train" label="train_torch fits the curve, repeatably" -- Each step: optimiser.zero_grad(), loss = loss_fn(net(X), Y), loss.backward(), optimiser.step().
run ".venv/Scripts/python -m pytest -q tests/test_torch_net.py" label="all lesson 4.4 tests pass"
```

### What you have

PyTorch installed, proof that its autograd computes exactly your backpropagation, your network as `nn` layers, and the standard training loop: zero the slopes, compute the loss, `backward`, `step`. Next lesson: the same network in **Keras**, which hides even the loop, and then a network that learns the QMaze table.
