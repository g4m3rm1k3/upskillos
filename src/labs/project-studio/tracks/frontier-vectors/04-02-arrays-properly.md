---
title: 4.2 — Arrays, Properly
runtime: python
support: tests/conftest.py
---

Lesson 3.4 used NumPy for speed and promised it properly later. This is later. Every model in this series keeps its numbers in arrays, NumPy's first and then PyTorch's tensors, which work the same way. So it's worth knowing exactly what an array is: what it holds, how to read parts of it, and one behaviour that surprises nearly everyone the first time.

Then you rebuild lesson 4.1's cosine on arrays, and check it the way this series checks everything: against a version you already trust, to a tolerance you state. Your list version from 4.1 is that trusted version. Last, you take the length out of a vector altogether, which sets up the next lesson's trick: comparing one text with a whole collection at once.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_arrays.py**:

```python file=tests/test_arrays.py provided
# Tests for frontier.arrays (lesson 4.2): lesson 4.1's vector arithmetic, on NumPy arrays.
import math

import numpy as np
import pytest

CAT = np.array([1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 2.0])
DOG = np.array([0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 2.0])


def test_cosine_of_the_two_sentences():
    from frontier.arrays import cosine_array
    assert math.isclose(cosine_array(CAT, DOG), 0.75)


def test_cosine_refuses_zeros():
    from frontier.arrays import cosine_array
    with pytest.raises(ValueError, match="zeros"):
        cosine_array(np.zeros(7), DOG)


def test_sizes_must_match():
    from frontier.arrays import cosine_array
    with pytest.raises(ValueError):
        cosine_array(np.array([1.0, 2.0]), np.array([1.0, 2.0, 3.0]))


def test_agreement_with_the_list_version():
    from frontier.arrays import cosine_array
    from frontier.vectors import cosine
    rng = np.random.default_rng(0)
    for _ in range(100):
        a = rng.random(50)
        b = rng.random(50)
        assert math.isclose(cosine_array(a, b), cosine(a.tolist(), b.tolist()), rel_tol=1e-12)


def test_unit_has_length_one():
    from frontier.arrays import unit
    assert unit(np.array([3.0, 4.0])).tolist() == [0.6, 0.8]
    assert math.isclose(float(np.linalg.norm(unit(CAT))), 1.0)


def test_unit_refuses_zeros():
    from frontier.arrays import unit
    with pytest.raises(ValueError, match="zeros"):
        unit(np.zeros(3))


def test_unit_vectors_dotted_give_the_same_answer():
    from frontier.arrays import cosine_array, unit
    assert math.isclose(float(unit(CAT) @ unit(DOG)), cosine_array(CAT, DOG))
```

- **`cosine_array`** is 4.1's `cosine` for arrays. It must give 0.75 for the cat and dog sentences, refuse a vector of zeros, and refuse two vectors of different sizes.
- **The agreement test** makes 100 pairs of random vectors and checks that `cosine_array` and your list `cosine` give the same answer, to within a relative tolerance of `1e-12`. You'll see where that number comes from.
- **`unit`**, your Your turn, scales a vector to length 1.

```check
file tests/test_arrays.py -- Click "Create provided tests/test_arrays.py" above.
```

## An array, looked at

An array is one block of numbers, all of the same type, as lesson 3.4 showed. Two things describe it:

- **`shape`**: how many numbers it has along each direction, as a tuple. A vector's shape has one number, its length: `(7,)`, with the comma that makes a one-item tuple. Next lesson's tables have two.
- **`dtype`**: the type of every number in it. `float64` is the 64-bit float from lesson 2.6.

You read numbers out the way you read a list: `v[0]` is the first, `v[-1]` the last, and the slice `v[3:6]` is positions 3, 4 and 5. Arithmetic works on every number at once, as `xs * xs` did in 3.4, and `@` between two vectors is the dot product. This experiment prints each of these for the cat sentence's vector. Create `experiments/array_basics.py`:

```python file=experiments/array_basics.py
"""What a NumPy array is: its shape, its type, and its numbers."""
import numpy as np

v = np.array([1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 2.0])
print("shape:", v.shape)
print("dtype:", v.dtype)
print("first, last:", v[0], v[-1])
print("a slice:", v[3:6])
print("times 2:", v * 2)
print("dot with itself:", v @ v)
counts = np.array([1, 0, 2])
print("whole numbers:", counts.dtype)
```

The last two lines make an array from whole numbers, with no decimal points, and print its `dtype`. NumPy picks the dtype from what you give it.

```predict
question: What does the last line print for `np.array([1, 0, 2]).dtype`?
choice: float64
choice: int64
choice: int32
answer: int64
explain: Whole numbers make a whole-number array: `int64`, 64-bit integers, NumPy 2's default on every system (older NumPy used `int32` on Windows). An array keeps its dtype: write 2.7 into an `int64` array and it's cut down to 2. 4.1's count vectors already hold floats, so their arrays are `float64`.
verify: script whole_number_dtype.py
```

Run it:

```powershell
.venv\Scripts\python experiments/array_basics.py
```

```text
shape: (7,)
dtype: float64
first, last: 1.0 2.0
a slice: [1. 1. 1.]
times 2: [2. 0. 0. 2. 2. 2. 4.]
dot with itself: 8.0
whole numbers: int64
```

NumPy prints an array without commas, and a float that happens to be whole as `1.` rather than `1.0`. `v @ v` is 8.0, the same as `dot(v, v)` gave in 4.1.

```check
run ".venv/Scripts/python experiments/array_basics.py" stdout="dot with itself: 8.0" label="the array experiment runs" -- Make v with np.array([...]) and print v @ v.
```

## A slice shares its numbers

Here's the behaviour that surprises nearly everyone. Slicing a list makes a new list. Slicing an array doesn't copy anything: it makes a **view**, a new way of looking at the **same** block of memory. Change a number through the view and the original changes too. NumPy does this on purpose, since copying millions of numbers for every slice would be slow, and PyTorch's tensors do the same. When you need numbers of your own, `.copy()` makes a real copy.

Add six lines at the end of `experiments/array_basics.py`: one changes a number through a slice, the other through a copy, and each prints `v` afterwards:

```python file=experiments/array_basics.py
"""What a NumPy array is: its shape, its type, and its numbers."""
import numpy as np

v = np.array([1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 2.0])
print("shape:", v.shape)
print("dtype:", v.dtype)
print("first, last:", v[0], v[-1])
print("a slice:", v[3:6])
print("times 2:", v * 2)
print("dot with itself:", v @ v)
counts = np.array([1, 0, 2])
print("whole numbers:", counts.dtype)
part = v[3:6]
part[0] = 99.0
print("after changing the slice:", v)
safe = v[3:6].copy()
safe[0] = -1.0
print("after changing a copy:", v)
```

```predict
question: `part = v[3:6]` and then `part[0] = 99.0`. What is `v[3]` now?
choice: 1.0
choice: 99.0
answer: 99.0
explain: `part` is a view of positions 3 to 5 of `v`'s own memory, so `part[0]` is the very same number as `v[3]`. Changing one changes the other. With a list, `v[3:6]` would have been a new list and `v[3]` would still be 1.0.
verify: script slice_shares.py
```

```powershell
.venv\Scripts\python experiments/array_basics.py
```

The new lines print:

```text
after changing the slice: [ 1.  0.  0. 99.  1.  1.  2.]
after changing a copy: [ 1.  0.  0. 99.  1.  1.  2.]
```

The slice changed `v`; the copy didn't. NumPy pads the numbers to line them up now that one has two digits. A bug where some far-off part of a program changes your numbers often comes down to a view. When a function keeps or changes part of an array it was given, decide on purpose whether it should be a view or a copy.

```check
run ".venv/Scripts/python experiments/array_basics.py" stdout="after changing the slice: [ 1.  0.  0. 99.  1.  1.  2.]" label="the slice changed v" -- part = v[3:6], then part[0] = 99.0, then print v.
run ".venv/Scripts/python experiments/array_basics.py" stdout="after changing a copy: [ 1.  0.  0. 99.  1.  1.  2.]" label="the copy didn't" -- safe = v[3:6].copy(), then safe[0] = -1.0, then print v.
```

## Cosine on arrays

Now 4.1's cosine, with NumPy doing the arithmetic. `a @ b` is the dot product. `np.linalg.norm(v)` is a vector's length, ‖**v**‖: `linalg` is NumPy's linear algebra module, linear algebra being the name for the mathematics of vectors and matrices. `norm` is another word for length. It returns NumPy's own float type, so `float(...)` makes an ordinary one, as in 3.4.

There's no `strict=True` to remember this time: `@` checks the sizes itself, and raises a `ValueError` when two vectors don't match. The zeros check stays, written once for both vectors: if either length is 0, their product is 0. `Vector` is a type alias, like 3.1's `PairCounts`, so the long array type is written once. Create `src/frontier/arrays.py`:

```python file=src/frontier/arrays.py
"""Lesson 4.1's vector arithmetic on NumPy arrays."""
import numpy as np
import numpy.typing as npt

Vector = npt.NDArray[np.float64]


def cosine_array(a: Vector, b: Vector) -> float:
    """How alike two vectors' directions are, with NumPy doing the arithmetic."""
    lengths = float(np.linalg.norm(a) * np.linalg.norm(b))
    if lengths == 0:
        raise ValueError("a vector of zeros has no direction")
    return float(a @ b) / lengths
```

`lengths` is ‖**a**‖ ‖**b**‖, the bottom of 4.1's rule, and the last line divides the dot product by it. Two lines of arithmetic where 4.1 needed three functions: `@` and `norm` are 4.1's `dot` and `length`, written in C.

```check
run ".venv/Scripts/python -m pytest -q tests/test_arrays.py -k cosine" label="cosine_array gives 0.75, and refuses zeros" -- lengths = float(np.linalg.norm(a) * np.linalg.norm(b)); raise ValueError if it is 0; return float(a @ b) / lengths.
run ".venv/Scripts/python -m pytest -q tests/test_arrays.py -k sizes" label="different sizes raise ValueError" -- Use a @ b for the dot product: it raises ValueError itself when the sizes differ.
run ".venv/Scripts/python -m mypy --strict src/frontier/arrays.py" stdout="Success" label="mypy --strict passes" -- Vector = npt.NDArray[np.float64], with import numpy.typing as npt.
```

## Checked against your own

Two versions of the same calculation should agree, and checking that they do is how you catch a mistake in either. It's how this series checks every library against your hand-built version, and every hand-built version against a library.

You need test vectors you didn't choose, so they can't happen to dodge a bug, and you need the same ones every run, so a failure can be repeated. NumPy's random number generator gives both. `np.random.default_rng(0)` makes a generator from a **seed**, here 0: the same seed always produces the same numbers, in the same order. `rng.random(100)` is an array of 100 random floats between 0 and 1. This experiment compares the two cosines on 1000 random pairs and prints the largest difference. Create `experiments/check_arrays.py`:

```python file=experiments/check_arrays.py
"""How closely cosine_array agrees with lesson 4.1's cosine, on random vectors."""
import numpy as np

from frontier.arrays import cosine_array
from frontier.vectors import cosine

rng = np.random.default_rng(0)
worst = 0.0
for _ in range(1000):
    a = rng.random(100)
    b = rng.random(100)
    worst = max(worst, abs(cosine_array(a, b) - cosine(a.tolist(), b.tolist())))
print("largest difference:", worst)
```

Each pass makes two random vectors, works the cosine out both ways (`.tolist()` turns each array into the list your 4.1 version takes), and keeps the largest gap seen. Run it:

```powershell
.venv\Scripts\python experiments/check_arrays.py
```

When this lesson was written it printed `largest difference: 4.440892098500626e-16`. Yours may differ a little, or be `0.0`. Not zero, usually, because the two versions add up the same products in different ways. Lesson 2.6 showed that float addition rounds. NumPy adds in blocks, several at a time, and keeps each addition's rounding. Python's `sum` (since Python 3.12) keeps track of what each addition rounded off and adds it back at the end, so your list version is, if anything, the more exact of the two. Two ways of adding round differently, by a step or two in the last bit.

That's where the test's `rel_tol=1e-12` comes from. Rounding differences are around `1e-16`, ten thousand times smaller, so they pass. A real bug, a wrong number anywhere in the arithmetic, changes the answer far more than `1e-12`, so it fails. Choosing a tolerance always means that: well above the rounding, well below any mistake.

```check
run ".venv/Scripts/python experiments/check_arrays.py" stdout="largest difference:" label="the comparison runs" -- Import cosine_array from frontier.arrays and cosine from frontier.vectors, and compare them on rng.random(100) vectors.
run ".venv/Scripts/python -m pytest -q tests/test_arrays.py -k agreement" label="cosine_array agrees with your list version" -- The two cosines differ by more than rounding: check cosine_array against the rule dot / (length × length).
```

## Your turn: a unit vector

A vector of length 1 is a **unit vector**. Any vector except zeros can be made into one by dividing every number by the vector's length: same direction, length taken out. In symbols, **v** / ‖**v**‖.

Unit vectors make cosine simpler. Divide each vector by its length *first*, and the cosine is just their dot product, since both lengths are now 1: (**a** / ‖**a**‖) · (**b** / ‖**b**‖) = **a · b** / (‖**a**‖ ‖**b**‖), 4.1's rule. That's why it matters: next lesson turns a whole collection of texts into unit vectors once, and after that comparing with all of them is nothing but dot products.

**Build, on your own:** `unit(v)` at the end of `src/frontier/arrays.py`. It takes a `Vector` and returns a `Vector`: `v` divided by its length, every number at once, as dividing an array by a number did in 3.4. A vector of zeros raises a `ValueError` whose message contains `zeros`, checked before dividing.

Unlike 3.4's softmax, this one needs no annotated variable for mypy. That one divided the result of `np.exp`, whose number type NumPy's hints leave unknown, so mypy saw `Any`. Here `v` is known to hold `float64`, and a `float64` array divided by a `float` is a `float64` array, so `return v / size` passes `--strict`.

```hints
nudge: The length is float(np.linalg.norm(v)). If it's 0, raise; otherwise divide v by it.
concept: size = float(np.linalg.norm(v)), then if size == 0: raise ValueError("a vector of zeros has no direction"). Then return v / size: dividing an array by a number divides every number in it.
answer: At the end of `src/frontier/arrays.py`:
~~~python
def unit(v: Vector) -> Vector:
    """v scaled to length 1: the same direction, with the length taken out."""
    size = float(np.linalg.norm(v))
    if size == 0:
        raise ValueError("a vector of zeros has no direction")
    return v / size
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_arrays.py -k unit" label="unit vectors have length 1, and dot to the cosine" -- Divide v by float(np.linalg.norm(v)), after raising ValueError if that length is 0.
run ".venv/Scripts/python -m pytest -q tests/test_arrays.py tests/test_vectors.py" label="every vector and array test passes" -- Leave cosine_array as it was.
run ".venv/Scripts/python -m mypy --strict src/frontier/arrays.py" stdout="Success" label="mypy --strict still passes" -- unit takes a Vector and returns a Vector.
```

## Onto GitHub

Commit and push:

```powershell
git add .
git commit -m "Vectors as NumPy arrays, checked against the list versions"
git push
```

```check
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  arrays.py              Vector, cosine_array, unit (NumPy)
experiments/
  array_basics.py        shape, dtype, indexing, slicing, and a view changing the original
  check_arrays.py        cosine_array against 4.1's cosine on 1000 random pairs: the largest difference
tests/
  test_arrays.py         -k cosine, sizes, agreement, unit
```

Next lesson: a table of numbers, one text per row. A whole collection of texts becomes a **matrix**, and one matrix multiplication compares a question with every text in it.
