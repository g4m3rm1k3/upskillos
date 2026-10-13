---
title: 3.4 — A Hundred Times Faster
runtime: python
support: tests/conftest.py
---

Last lesson's program was slow because it did the same work over and over, and remembering the answers fixed it. Plenty of slow programs don't repeat anything. They just do a lot of arithmetic, one number at a time, in a Python loop. A model is millions of numbers, multiplied and added on every step of training, so this is the kind of slow that matters most in this series.

In this lesson you write the same sum as a Python loop, then hand it to **NumPy** all at once, and measure. The first NumPy version is about twenty times faster; one more change makes it a few hundred times faster, and you'll see why, down to how the numbers are laid out in memory. NumPy gets its own chapter next; here you meet just enough of it to see what "vectorising" a loop means.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_fast.py**:

```python file=tests/test_fast.py provided
# Tests for frontier.fast (lesson 3.4): the same sums, one number at a time and all at once.
import math

import numpy as np


def test_loop_squares_and_adds():
    from frontier.fast import sum_of_squares_loop
    assert sum_of_squares_loop([1.0, 2.0, 3.0]) == 14.0
    assert sum_of_squares_loop([]) == 0.0


def test_numpy_gives_the_same_sum():
    from frontier.fast import sum_of_squares_numpy
    assert sum_of_squares_numpy(np.array([1.0, 2.0, 3.0])) == 14.0


def test_softmax_agrees_with_lesson_2_6():
    from frontier.fast import softmax_numpy
    from frontier.floats import softmax
    scores = [0.5, -2.0, 0.0, 4.0]
    for a, b in zip(softmax_numpy(np.array(scores)), softmax(scores)):
        assert math.isclose(a, b)


def test_softmax_survives_huge_scores():
    from frontier.fast import softmax_numpy
    assert softmax_numpy(np.array([1000.0, 1000.0])).tolist() == [0.5, 0.5]
```

- **`sum_of_squares_loop`** squares each number in a list and adds them up: 1 + 4 + 9 = 14.
- **`sum_of_squares_numpy`** does the same to a NumPy **array**, made here with `np.array([...])` from a list.
- **`softmax_numpy`**, your Your turn, is lesson 2.6's softmax for an array: the same answers as your `softmax`, and no overflow. `.tolist()` turns an array back into a list.

```check
file tests/test_fast.py -- Click "Create provided tests/test_fast.py" above.
```

## One number at a time

Start with the loop you'd write without thinking. A sum of squares is everywhere in machine learning: it's how far apart two lists of numbers are, and how wrong a model's guesses are on average, as Chapter 8 measures. Create `src/frontier/fast.py`:

```python file=src/frontier/fast.py
"""The same arithmetic in a Python loop and in NumPy, and how far apart their speeds are."""


def sum_of_squares_loop(xs: list[float]) -> float:
    """Each number squared, all added up, one number at a time."""
    total = 0.0
    for x in xs:
        total += x * x
    return total
```

`total` starts at `0.0`, a float, so an empty list gives `0.0` too. Each pass squares one number and adds it on.

```check
run ".venv/Scripts/python -m pytest -q tests/test_fast.py -k loop" label="the loop squares and adds" -- Start total at 0.0 and add x * x for each x.
run ".venv/Scripts/python -m mypy --strict src/frontier/fast.py" stdout="Success" label="mypy --strict passes" -- xs: list[float], and it returns float.
```

## Why a Python loop is slow

On a million numbers, that loop takes a few hundredths of a second. That sounds quick, but a computer can do a billion simple operations a second, and two million (a million multiplications and a million additions) should take about a thousandth of one. Where does the rest go?

Into Python's bookkeeping. A Python `float` isn't just its 8 bytes of number: it's an **object**, with a note of its type and a count of who's using it, and `sys.getsizeof(1.5)` says it takes 24 bytes. A list doesn't hold the floats themselves, only an 8-byte address for each, so a million of them are scattered around memory. Then, on every pass, `x * x` makes Python look up what kind of thing `x` is, find that type's multiplication, run it, and make a **new** float object for the answer; `total += ...` does it all again. The arithmetic is a tiny part of each pass.

A NumPy array works the other way round. It stores one type for the whole array and then the bare numbers, 8 bytes each, side by side in one block of memory. Its loops are written in C, so the type is checked once, not a million times.

```predict
question: How many bytes do the numbers in `np.zeros(1000000)`, a NumPy array of a million floats, take up?
choice: 8000000
choice: 24000000
choice: 32000000
answer: 8000000
explain: 8 bytes per float, side by side, and nothing else per number. The same million floats in a list take 32 MB: 24 bytes for each float object plus 8 for each address in the list. `np.zeros(n).nbytes` is the array's count.
verify: script array_bytes.py
```

```check
run ".venv/Scripts/python -c \"import sys; print(sys.getsizeof(1.5))\"" stdout="24" label="a Python float takes 24 bytes" -- Run the command exactly as written.
```

## All at once

NumPy is already in your project: you installed it in lesson 0.1, and lesson 0.3 used it. It's imported as `np`, by a convention every NumPy user follows. Arithmetic on an array happens to every number at once: if `xs` is an array, `xs * xs` is a new array of each number squared, and `xs - 1.0` subtracts 1 from every number. `np.sum(xs)` adds an array up. None of them loops in Python. This is **vectorising**: writing the whole job as operations on arrays, so the loop runs inside NumPy's C code.

The type hint for an array of floats is `npt.NDArray[np.float64]`, from `numpy.typing` (imported as `npt`): an array whose numbers are 64-bit floats. `np.sum` returns NumPy's own float type, so `float(...)` turns the answer into an ordinary Python float, as the hint promises. Add the imports at the top of `src/frontier/fast.py`, and the function at the end:

```python file=src/frontier/fast.py
"""The same arithmetic in a Python loop and in NumPy, and how far apart their speeds are."""
import numpy as np
import numpy.typing as npt


def sum_of_squares_loop(xs: list[float]) -> float:
    """Each number squared, all added up, one number at a time."""
    total = 0.0
    for x in xs:
        total += x * x
    return total


def sum_of_squares_numpy(xs: npt.NDArray[np.float64]) -> float:
    """The same sum, done by NumPy on the whole array at once."""
    return float(np.sum(xs * xs))
```

No loop, and no `x`: `xs * xs` squares the million numbers in one go, and `np.sum` adds them up in another.

```check
run ".venv/Scripts/python -m pytest -q tests/test_fast.py -k numpy" label="NumPy gives the same sum" -- Return float(np.sum(xs * xs)), with numpy imported as np.
run ".venv/Scripts/python -m mypy --strict src/frontier/fast.py" stdout="Success" label="mypy --strict still passes" -- xs: npt.NDArray[np.float64], with import numpy.typing as npt.
```

## Time them both

Now measure. The experiment makes a million numbers as a list, then converts them to an array **once**, before any timing, with `np.array(numbers)`. It times the loop on the list and your NumPy version on the array. It also times `array @ array`: the `@` from lesson 0.3, which multiplies two arrays number by number and adds up the products, so `xs @ xs` is the same sum of squares. Last, it times the conversion itself. Create `experiments/time_squares.py`:

```python file=experiments/time_squares.py
"""A sum of squares over a million numbers: a Python loop against NumPy."""
import numpy as np

from frontier.bench import best_of
from frontier.fast import sum_of_squares_loop, sum_of_squares_numpy

numbers = [i / 1000000 for i in range(1000000)]
array = np.array(numbers)

loop = best_of(lambda: sum_of_squares_loop(numbers))
vectorised = best_of(lambda: sum_of_squares_numpy(array))
one_pass = best_of(lambda: array @ array)
converting = best_of(lambda: np.array(numbers))
print(f"loop        {loop:.5f} s")
print(f"np.sum      {vectorised:.5f} s   {loop / vectorised:.0f} times faster")
print(f"@           {one_pass:.5f} s   {loop / one_pass:.0f} times faster")
print(f"converting  {converting:.5f} s")
```

Run it:

```powershell
.venv\Scripts\python experiments/time_squares.py
```

When this lesson was written, the loop took 0.057 s, `np.sum` was about 17 times faster, and `@` about 400 times faster. Your numbers will differ, but not by enough to change the story.

Why is `@` so much faster than `np.sum(xs * xs)`, when both are NumPy? Because `xs * xs` makes a whole new array: a million squares, 8 MB, written out to memory, then read back in by `np.sum`. Moving those 8 MB takes longer than the arithmetic. `@` multiplies and adds in one pass, keeping the running total close at hand, and never makes the middle array at all. Vectorising is the first step; choosing the one operation that does the whole job is the second.

The last line is the catch. Converting a million-number list into an array takes longer than the loop itself, because NumPy has to visit every float object one at a time to copy its 8 bytes out. Vectorising pays off when the numbers **live** in arrays, made once and kept there, not when a list is converted for every sum. That's why, from Chapter 4 on, data goes into arrays as soon as it's read, and stays there.

```check
run ".venv/Scripts/python experiments/time_squares.py" stdout="times faster" label="the experiment times both" -- Check the imports: numpy as np, best_of from frontier.bench, both functions from frontier.fast.
```

## Your turn: softmax, vectorised

**Build, on your own:** `softmax_numpy(scores)` at the end of `src/frontier/fast.py`. It takes an array of scores and returns an array of probabilities, with lesson 2.6's fix: subtract the largest score before taking the exp. Its hints are `scores: npt.NDArray[np.float64]` and `-> npt.NDArray[np.float64]`. No loop and no list comprehension: every step works on the whole array.

Three NumPy pieces you haven't used yet: `scores.max()` is the array's largest number, `np.exp(xs)` is *e* to the power of every number in `xs`, and dividing an array by a number divides every number in it.

One mypy detail. NumPy's type hints can't say what dividing an array by a number gives, so mypy treats the result as `Any`, and `--strict` won't let a function return an `Any` when it promised an array. Store the result in a variable annotated `npt.NDArray[np.float64]` first, and return that: the annotation tells mypy what it holds.

```hints
nudge: It's softmax from lesson 2.6 with each line made whole-array: subtract the max from the array, exp the array, divide the array by its sum.
concept: `shifted = scores - scores.max()` subtracts the largest from every score. `np.exp(shifted)` gives every exp at once, and `exps / np.sum(exps)` divides each one by the total; annotate that result before returning it.
answer: At the end of `src/frontier/fast.py`:
~~~python
def softmax_numpy(scores: npt.NDArray[np.float64]) -> npt.NDArray[np.float64]:
    """Lesson 2.6's softmax for a whole array: the largest score subtracted, then exp and divide."""
    exps = np.exp(scores - scores.max())
    probabilities: npt.NDArray[np.float64] = exps / np.sum(exps)
    return probabilities
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_fast.py -k softmax" label="softmax_numpy agrees, and survives huge scores" -- Subtract scores.max() from scores, take np.exp of that, and divide by its np.sum.
lacks src/frontier/fast.py "for score" label="no Python loop over the scores" -- Work on the whole array: scores - scores.max(), np.exp(...), and a division.
run ".venv/Scripts/python -m pytest -q tests/test_fast.py tests/test_floats.py" label="every fast and float test passes" -- Leave sum_of_squares_loop and sum_of_squares_numpy as they were.
run ".venv/Scripts/python -m mypy --strict src/frontier/fast.py" stdout="Success" label="mypy --strict still passes" -- scores: npt.NDArray[np.float64] and -> npt.NDArray[np.float64].
```

## Chapter 3 done, and onto GitHub

Commit and push:

```powershell
git add .
git commit -m "Vectorise a sum of squares and softmax with NumPy"
git push
```

```check
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  fast.py                sum_of_squares_loop, sum_of_squares_numpy, softmax_numpy
experiments/
  time_squares.py        a loop against np.sum and @ on a million numbers, and the cost of converting
tests/
  test_fast.py           -k loop, numpy, softmax
```

That's Chapter 3. You have a method for bugs (reproduce, narrow down, guess, test) and the debugger for the narrowing; logging for programs you can't pause; a profiler to find what's slow before changing anything; and two ways to fix slow code: do less work by remembering answers, or hand the work to NumPy all at once, in as few passes as possible. Chapter 4 starts the mathematics, with vectors and matrices, and NumPy properly.
