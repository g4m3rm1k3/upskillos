---
title: 0.3 — PyTorch, Checked Against NumPy
runtime: python
support: tests/conftest.py
---

**PyTorch** is the library most AI research is written in, and most of this series uses it. From Chapter 12 you'll build a small version of it yourself, to see that nothing inside it is magic. Before then, it's a fast calculator for big grids of numbers that can also run on a graphics card.

This lesson installs it, finds out whether this computer has a graphics card PyTorch can use, and does the first thing this series does with every library: checks its answer against an independent one before trusting it.

## Install PyTorch

Add PyTorch to `requirements.txt`:

```text file=requirements.txt
numpy==2.5.3
pytest==9.1.1
torch==2.14.1
```

The `frontier` package is about to import it too, so add it to the package's dependencies in `pyproject.toml` as well, as a range:

```toml
dependencies = ["numpy>=2", "torch>=2.6"]
```

Then install:

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

This one takes a while. On Windows, the PyTorch on pypi.org is the **CPU build**: about 125 MB to download, and several times that once unpacked. It runs everything on the processor.

### If you have an NVIDIA graphics card

PyTorch can also run on NVIDIA graphics cards through **CUDA**, NVIDIA's system for running general calculations on them. That build is much bigger (gigabytes, not megabytes), so it isn't on pypi.org. PyTorch serves it from its own package index. To use it:

1. Go to [pytorch.org/get-started](https://pytorch.org/get-started/locally/) and choose **Stable**, **Windows**, **Pip**, **Python** and the newest **CUDA** version.
2. It shows a command like `pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu…`. Run it as `.venv\Scripts\python -m pip install torch==2.14.1 --index-url <the URL it showed>`: through the environment's Python, with the same pinned version, and without `torchvision`, which this series doesn't use yet.

**No NVIDIA card? Nothing is lost.** Every check in this series runs on an ordinary processor in seconds. The bigger experiments have a small size that runs on a processor in minutes, and Chapter 15 shows you how to run the full size on a free graphics card in the cloud.

```check
contains requirements.txt "torch==2.14.1"
contains pyproject.toml "torch>=2.6" label="pyproject.toml lists torch as a dependency" -- dependencies = ["numpy>=2", "torch>=2.6"]
run ".venv/Scripts/python -c \"import torch; assert torch.__version__.startswith('2.14.1'), torch.__version__\"" label="PyTorch 2.14.1 imports in the project's Python" -- Run .venv\Scripts\python -m pip install -r requirements.txt and wait for "Successfully installed".
```

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_torch_info.py** above.

```python file=tests/test_torch_info.py provided
# Tests for lesson 0.3: PyTorch in src/frontier/info.py and src/frontier/selfcheck.py.
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_torch_info.py
import torch


def test_device_is_cuda_only_when_a_gpu_is_there():
    from frontier.info import device
    assert device() == ("cuda" if torch.cuda.is_available() else "cpu")


def test_versions_include_torch_and_where_it_runs():
    from frontier.info import device, environment
    env = environment()
    assert env["torch"] == torch.__version__
    assert env["device"] == device()


def test_agreement_with_numpy_is_within_rounding():
    from frontier.selfcheck import matmul_difference
    diff = matmul_difference(n=64, seed=0)
    assert 0 <= diff < 1e-10, f"PyTorch and NumPy differ by {diff}"
```

The last test is the important one. It doesn't ask whether PyTorch's answer is **exactly** NumPy's. It asks whether the two answers are within `1e-10` of each other (0.0000000001). The next steps show why "exactly" is the wrong question for computer arithmetic.

```check
file tests/test_torch_info.py -- Click "Create provided tests/test_torch_info.py" above.
```

## Which device?

PyTorch calls the place where numbers live and calculations run a **device**: `"cpu"` for the processor, `"cuda"` for an NVIDIA graphics card. Code written for one runs on the other only if it asks which one is there, rather than assuming.

Replace `src/frontier/info.py` with:

```python file=src/frontier/info.py
"""Facts about the machine and the packages a run used."""
import platform

import numpy
import torch


def device():
    return "cuda" if torch.cuda.is_available() else "cpu"


def environment():
    return {
        "python": platform.python_version(),
        "system": f"{platform.system()} {platform.release()}",
        "numpy": numpy.__version__,
        "torch": torch.__version__,
        "device": device(),
    }


def report():
    return "\n".join(f"{key}: {value}" for key, value in environment().items())


def main():
    print(report())
```

- **`torch.cuda.is_available()`** is `True` only if three things are all there: the CUDA build of PyTorch, an NVIDIA card, and a driver for it. The CPU build always says `False`.
- **`device()`** is a function, not a variable computed once, so a test can call it and compare it with the truth.
- **`environment()`** now records PyTorch's version and the device. A training run that took ten minutes on one machine and two hours on another usually differs in exactly this line.

`report()` and `main()` haven't changed, and `frontier-info` uses whatever `environment()` returns, so it now prints the two new lines without being installed again. That's the editable install from the last lesson at work. Try it:

```powershell
.venv\Scripts\frontier-info
```

```text
python: 3.13.14
system: Windows 11
numpy: 2.5.3
torch: 2.14.1+cpu
device: cpu
```

`+cpu` at the end of the version is how PyTorch marks the CPU build.

```check
run ".venv/Scripts/python -m pytest -q tests/test_torch_info.py -k device" label="device() says cuda only when PyTorch can use a graphics card" -- Return "cuda" if torch.cuda.is_available() else "cpu".
run ".venv/Scripts/python -m pytest -q tests/test_torch_info.py -k versions" label="environment() records PyTorch's version and the device" -- Add "torch": torch.__version__ and "device": device() to the dictionary.
```

## Tensors, and the float32 surprise

PyTorch's grid of numbers is a **tensor**: a single number, a list of numbers, a table, or a stack of tables, all one type. NumPy calls the same thing an **array**. You'll build both properly in Part 1. For now, five operations are enough, and you'll use all five in a moment.

Create a script `experiments/first_tensors.py`. It's an **experiment**: a script you run to find something out, kept in the project so you can run it again. It isn't part of the package.

```python file=experiments/first_tensors.py
import numpy as np
import torch

from frontier.info import device

a = np.array([[1.0, 2.0], [3.0, 4.0]])
t = torch.from_numpy(a)
print("from NumPy:", t.dtype)
print("typed in:  ", torch.tensor([1.0, 2.0]).dtype)

on_device = t.to(device())
product = on_device @ on_device
print("product on", product.device)
print(product.cpu().numpy())
```

Run it with **Run**, or `.venv\Scripts\python experiments/first_tensors.py`. The five operations:

1. **`torch.from_numpy(a)`** turns a NumPy array into a tensor without copying the numbers: both now look at the same memory.
2. **`.dtype`** is the type of every number inside, such as `float64`.
3. **`.to(device())`** gives the same numbers on that device. Calculations happen where the numbers are. On a graphics card, that means copying them into the card's own memory first.
4. **`@`** is matrix multiplication, in NumPy and in PyTorch alike. Chapter 4 explains what it computes. Here it's just a calculation both libraries can do.
5. **`.cpu().numpy()`** brings the result back to the processor and back into a NumPy array. NumPy can only see the processor's memory, so the `.cpu()` comes first.

Before you look at the output, one question about the second `print`:

```predict
question: NumPy stores `1.0` as `float64`. What dtype does `torch.tensor([1.0, 2.0])` have?
choice: torch.float64
choice: torch.float32
choice: torch.float16
answer: torch.float32
explain: PyTorch's default is `float32`: 32 bits per number, about 7 significant digits, where `float64` keeps about 16. A graphics card does far more `float32` arithmetic per second than `float64`, and a network needs half the memory. Learning doesn't need 16 digits. So the first line says `torch.float64` (it kept NumPy's numbers as they were) and the second says `torch.float32`. Mixing the two is a classic source of small mismatches.
verify: .venv/Scripts/python -c "import torch; print(torch.tensor([1.0, 2.0]).dtype)"
```

```check
run ".venv/Scripts/python experiments/first_tensors.py" stdout="from NumPy: torch.float64" label="the experiment runs and shows both dtypes" -- Run it from the project folder; it imports frontier, which the editable install makes possible.
```

## Your turn: does PyTorch agree with NumPy?

**Build, on your own:** `src/frontier/selfcheck.py` with a function `matmul_difference(n, seed)`. It multiplies two random `n × n` tables of numbers with NumPy, multiplies the same two with PyTorch on `device()`, and returns the largest difference between any pair of matching entries, as a plain Python `float`.

You need two things you haven't used yet, both one line each:

- `rng = np.random.default_rng(seed)` makes a random number generator. `rng.standard_normal((n, n))` gives an `n × n` array of random `float64` numbers. The same `seed` always gives the same numbers, which is what makes a test repeatable.
- `np.abs(x - y).max()` is the largest difference between two arrays of the same shape. Wrap it in `float(...)` to get a plain Python number.

The test allows a difference under `1e-10`. Multiplying 64 × 64 tables adds up 64 products for each entry. Two libraries can add them in a different order, and in floating point, `(a + b) + c` isn't always exactly `a + (b + c)`. So a tiny difference is normal. A big one means something is wrong.

```hints
nudge: Make `a` and `b` with the generator, compute `a @ b` with NumPy, then do the same with `torch.from_numpy` and `.to(device())`, and bring the answer back with `.cpu().numpy()`.
concept: Keep PyTorch's inputs as they come from NumPy, `float64`. If anything turns them into `float32` (`.float()`, or `torch.tensor` with `dtype=torch.float32`), the answers differ around the 7th digit and the test fails: that's the float32 surprise from the last step.
answer: Create `src/frontier/selfcheck.py`:
~~~python
"""Checks that the libraries this project relies on agree with each other."""
import numpy as np
import torch

from frontier.info import device


def matmul_difference(n, seed):
    rng = np.random.default_rng(seed)
    a = rng.standard_normal((n, n))
    b = rng.standard_normal((n, n))
    expected = a @ b
    where = device()
    got = (torch.from_numpy(a).to(where) @ torch.from_numpy(b).to(where)).cpu().numpy()
    return float(np.abs(expected - got).max())
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_torch_info.py -k agreement" label="PyTorch's product matches NumPy's within 1e-10" -- Keep both inputs float64, multiply on device(), bring the result back with .cpu().numpy(), and return float(np.abs(expected - got).max()).
```

Print the actual difference:

```powershell
.venv\Scripts\python -c "from frontier.selfcheck import matmul_difference; print(matmul_difference(64, 0))"
```

You'll see either `0.0` or something around `1e-14`, depending on how your two libraries order their additions. Either is agreement. Change `64` to `512` and the difference grows a little, because there are more additions to round. On the machine this lesson was written on, 64 gave `1.07e-14` and 512 gave `2.13e-13`.

That's the habit for the rest of the series. Every time you build something by hand, a test compares it with a trusted version, with a tolerance chosen for a reason.

### What you have

```text
frontier/
  pyproject.toml
  requirements.txt        now with torch
  experiments/
    first_tensors.py
  src/frontier/
    __init__.py
    info.py               device(), and torch in environment()
    selfcheck.py          matmul_difference()
  tests/
    conftest.py
    test_info.py
    test_torch_info.py
```

Chapter 1 starts from a messy script and turns it into software you can trust, with tests and Git.
