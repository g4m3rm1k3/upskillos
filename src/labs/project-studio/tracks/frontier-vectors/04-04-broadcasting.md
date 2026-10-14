---
title: 4.4 — Broadcasting
runtime: python
support: tests/conftest.py
---

Lesson 4.3's `text_matrix` scales its rows one at a time: `unit` is called once per text, from a Python loop. For five texts that costs nothing. For a million it's lesson 3.4's slow loop again. NumPy can divide every row of a matrix by that row's own length in a single operation, but only when the two arrays' shapes fit together in a particular way.

The rules for how arrays of different shapes combine are called **broadcasting**. They're behind nearly every line of NumPy and PyTorch in this series. They also cause one of the commonest bugs in it: arithmetic that runs without any error, on the wrong numbers. This lesson teaches the rules, shows that bug happening, and then uses broadcasting twice: to scale every row at once, and, in your Your turn, to take each column's average away.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_broadcasting.py**:

```python file=tests/test_broadcasting.py provided
# Tests for unit_rows and center in frontier.matrix (lesson 4.4): whole-matrix arithmetic.
import numpy as np
import pytest

M = np.array([[3.0, 4.0, 0.0], [0.0, 6.0, 8.0], [0.0, 0.0, 2.0]])


def test_scale_every_row_to_length_one():
    from frontier.matrix import unit_rows
    assert unit_rows(M).tolist() == [[0.6, 0.8, 0.0], [0.0, 0.6, 0.8], [0.0, 0.0, 1.0]]


def test_scale_matches_unit_row_by_row():
    from frontier.arrays import unit
    from frontier.matrix import unit_rows
    rng = np.random.default_rng(3)
    m = rng.random((4, 5))
    scaled = unit_rows(m)
    for i in range(4):
        assert np.allclose(scaled[i], unit(m[i]))


def test_scale_refuses_a_row_of_zeros():
    from frontier.matrix import unit_rows
    with pytest.raises(ValueError, match="zeros"):
        unit_rows(np.array([[1.0, 2.0], [0.0, 0.0]]))


def test_center_small_example():
    from frontier.matrix import center
    assert center(np.array([[1.0, 2.0], [3.0, 6.0]])).tolist() == [[-1.0, -2.0], [1.0, 2.0]]


def test_center_columns_average_zero():
    from frontier.matrix import center
    rng = np.random.default_rng(4)
    m = rng.random((6, 3))
    assert center(m).shape == (6, 3)
    assert np.allclose(center(m).mean(axis=0), 0.0)


def test_center_leaves_the_original_alone():
    from frontier.matrix import center
    m = np.array([[1.0, 2.0], [3.0, 6.0]])
    center(m)
    assert m.tolist() == [[1.0, 2.0], [3.0, 6.0]]
```

- **`unit_rows`** scales every row of a matrix to length 1, all at once. Row 0 of `M`, `[3, 4, 0]`, has length 5 (3² + 4² = 25), so it becomes `[0.6, 0.8, 0.0]`. On random numbers it must agree with 4.2's `unit` row by row, and a row of zeros must raise a `ValueError`.
- **`center`**, your Your turn, takes each column's average away from that column. `[[1, 2], [3, 6]]` has column averages 2 and 4, so it becomes `[[-1, -2], [1, 2]]`. Afterwards every column averages 0: `.mean(axis=0)` is one average per column, the way 4.3's `.sum(axis=0)` was one total per column. And the matrix it was given must be left as it was.

```check
file tests/test_broadcasting.py -- Click "Create provided tests/test_broadcasting.py" above.
```

## Different shapes, one operation

You've already broadcast without the name: in 3.4, `xs * xs` multiplied matching numbers, but `v / size` in 4.2 divided a whole vector by one number. The number was used again for every position. Broadcasting is the general rule for when one array can be reused like that across another. NumPy compares the two shapes, lining them up **from the right**:

1. Each pair of sizes must be **equal**, or **one of them must be 1**.
2. A size that's missing, because one shape is shorter, counts as 1.
3. Along a size of 1, the array is reused for every position of the other. Nothing is copied.

A `(2, 3)` matrix plus a vector of shape `(3,)`: line them up from the right, and the 3s match; the vector's missing size counts as 1, so the vector is reused for each of the 2 rows. A matrix plus a **column**, shape `(2, 1)`: the 2s match, and the 1 is reused across the 3 columns, so each row gets its own number. A single number has no sizes at all, so it's reused everywhere. This experiment tries all three, and one more that breaks the rule. Create `experiments/broadcasting.py`, using the matrix from 4.3's `matrix_basics.py`:

```python file=experiments/broadcasting.py
"""Arithmetic between arrays of different shapes: broadcasting."""
import numpy as np

m = np.array([
    [1.0, 2.0, 3.0],
    [4.0, 5.0, 6.0],
])
print("times a number:")
print(m * 10)
print("plus a row of 3:")
print(m + np.array([10.0, 20.0, 30.0]))
print("plus a column of 2:")
print(m + np.array([[100.0], [200.0]]))
try:
    print(m + np.array([10.0, 20.0]))
except ValueError as error:
    print("error:", error)
```

`np.array([[100.0], [200.0]])` is a list of two rows of one number each, so its shape is `(2, 1)`: a column. The last addition is in a `try` block, so its error is printed instead of stopping the script.

```predict
question: `m` has shape `(2, 3)`. What does `m + np.array([10.0, 20.0])` do?
choice: adds 10 to row 0 and 20 to row 1
choice: raises ValueError
answer: raises ValueError
explain: Lined up from the right, the shapes `(2, 3)` and `(2,)` pair 3 with 2. Those aren't equal and neither is 1, so NumPy refuses. Adding 10 to row 0 and 20 to row 1 needs the numbers as a column, `(2, 1)`, which is the line before it.
verify: script broadcast_error.py
```

```powershell
.venv\Scripts\python experiments/broadcasting.py
```

```text
times a number:
[[10. 20. 30.]
 [40. 50. 60.]]
plus a row of 3:
[[11. 22. 33.]
 [14. 25. 36.]]
plus a column of 2:
[[101. 102. 103.]
 [204. 205. 206.]]
error: operands could not be broadcast together with shapes (2,3) (2,)
```

The row of 3 was added to each row; the column of 2 was added across each row, 100 to the first and 200 to the second. A vector of 2 couldn't be placed either way, and the error names both shapes. When you meet that error, write the two shapes down, line them up from the right, and find the pair that breaks the rule.

```check
run ".venv/Scripts/python experiments/broadcasting.py" stdout="[204. 205. 206.]]" label="a column is added across each row" -- A column has shape (2, 1): np.array([[100.0], [200.0]]).
run ".venv/Scripts/python experiments/broadcasting.py" stdout="error: operands could not be broadcast together" label="a vector of 2 can't be added to a (2, 3) matrix" -- Add np.array([10.0, 20.0]) inside the try block, and print the ValueError.
```

## Lengths that keep their place

To scale every row to length 1, you need each row's length, and `np.linalg.norm` takes an `axis=` just as `sum` did in 4.3. `np.linalg.norm(m, axis=1)` works along each row, one length per row. But the axis it collapses is gone from the answer: for a 3-row matrix the lengths come out as a plain vector, shape `(3,)`.

That's the trouble. Dividing the matrix by that vector lines `(3,)` up with the matrix's **columns**, from the right, not its rows. For a square matrix the sizes match, so it runs without any error, and it divides column 0 by row 0's length, column 1 by row 1's, and so on. The fix is `keepdims=True`: it keeps the collapsed axis in the answer, with size 1.

This experiment divides a square matrix both ways and measures the rows' lengths afterwards, rounded to 3 places with 4.3's `np.round`. Create `experiments/keepdims.py`:

```python file=experiments/keepdims.py
"""Dividing every row by its own length: why keepdims matters."""
import numpy as np

m = np.array([
    [3.0, 4.0, 0.0],
    [0.0, 6.0, 8.0],
    [0.0, 0.0, 2.0],
])
flat = np.linalg.norm(m, axis=1)
kept = np.linalg.norm(m, axis=1, keepdims=True)
print("flat:", flat.shape, " kept:", kept.shape)
print("lengths after dividing by flat:", np.round(np.linalg.norm(m / flat, axis=1), 3))
print("lengths after dividing by kept:", np.round(np.linalg.norm(m / kept, axis=1), 3))
print(m / kept)
```

The rows' lengths are 5, 10 and 2. `flat` and `kept` hold the same three numbers; only their shapes differ.

```predict
question: What shape is `kept`, the lengths with `keepdims=True`?
choice: (3,)
choice: (3, 1)
choice: (1, 3)
answer: (3, 1)
explain: The lengths are worked out along axis 1, across each row, so axis 1 is the one collapsed. `keepdims=True` keeps it with size 1: 3 rows, 1 column. A column, which broadcasting reuses across each row, so each row is divided by its own length.
verify: script kept_shape.py
```

```powershell
.venv\Scripts\python experiments/keepdims.py
```

```text
flat: (3,)  kept: (3, 1)
lengths after dividing by flat: [0.721 4.045 1.   ]
lengths after dividing by kept: [1. 1. 1.]
[[0.6 0.8 0. ]
 [0.  0.6 0.8]
 [0.  0.  1. ]]
```

Dividing by `flat` ran without a word and gave rows of length 0.721 and 4.045: row 1, `[0, 6, 8]`, was divided as `[0 / 5, 6 / 10, 8 / 2]`. Only the last row came out right, by luck. Dividing by `kept` gave every row length 1. Whenever you collapse an axis and then combine the answer with the array it came from, use `keepdims=True`, or check the shapes. A square matrix won't warn you.

```check
run ".venv/Scripts/python experiments/keepdims.py" stdout="flat: (3,)  kept: (3, 1)" label="keepdims keeps the axis, with size 1" -- kept = np.linalg.norm(m, axis=1, keepdims=True).
run ".venv/Scripts/python experiments/keepdims.py" stdout="lengths after dividing by kept: [1. 1. 1.]" label="dividing by kept scales every row to length 1" -- Divide m by kept, the lengths with keepdims=True, not by flat.
```

## Every row at once

Now the real function. `unit_rows(m)` works out every row's length with `keepdims=True` and divides `m` by them, all in one operation.

It keeps 4.2's check for zeros, now for every row at once. `lengths == 0` compares every length with 0 and gives an array of `True` and `False`, one per row: comparisons broadcast just like arithmetic. `np.any(...)` is `True` if any of them is `True`. Add `unit_rows` at the end of `src/frontier/matrix.py`:

```python file=src/frontier/matrix.py
"""A collection of texts as a matrix: one row per text, one column per word."""
import numpy as np
import numpy.typing as npt

from frontier.arrays import Vector, unit
from frontier.text import split_words
from frontier.vectors import count_vector, vocabulary

Matrix = npt.NDArray[np.float64]


def text_vector(text: str, vocab: list[str]) -> Vector:
    """text's count vector over vocab, scaled to length 1. Words outside vocab are left out."""
    return unit(np.array(count_vector(split_words(text), vocab)))


def text_matrix(texts: list[str]) -> tuple[Matrix, list[str]]:
    """Every text as a row of length 1, and the vocabulary that names the columns."""
    vocab = vocabulary([split_words(text) for text in texts])
    return np.array([text_vector(text, vocab) for text in texts]), vocab


def times_vector(m: Matrix, v: Vector) -> Vector:
    """m @ v by hand: each row of m dotted with v."""
    return np.array([float(row @ v) for row in m])


def times(a: Matrix, b: Matrix) -> Matrix:
    """a @ b by hand: entry i, j is row i of a dotted with column j of b."""
    out = np.zeros((a.shape[0], b.shape[1]))
    for i in range(a.shape[0]):
        for j in range(b.shape[1]):
            out[i, j] = a[i] @ b[:, j]
    return out


def unit_rows(m: Matrix) -> Matrix:
    """Every row of m scaled to length 1, all at once."""
    lengths = np.linalg.norm(m, axis=1, keepdims=True)
    if np.any(lengths == 0):
        raise ValueError("a row of zeros has no direction")
    return m / lengths
```

`lengths` has shape `(rows, 1)`, so `m / lengths` divides each row by its own length. The check runs first because NumPy doesn't raise on a division by 0: a row of zeros divided by its length, 0, becomes a row of `nan` ("not a number") with only a warning, and `nan`s spread silently through every calculation after them.

```check
run ".venv/Scripts/python -m pytest -q tests/test_broadcasting.py -k scale" label="unit_rows scales every row, and refuses zeros" -- lengths = np.linalg.norm(m, axis=1, keepdims=True); raise if np.any(lengths == 0); return m / lengths.
run ".venv/Scripts/python -m mypy --strict src/frontier/matrix.py" stdout="Success" label="mypy --strict passes" -- unit_rows takes a Matrix and returns a Matrix.
```

## text_matrix, without the loop of units

Now `text_matrix` can use it. Instead of scaling each text's row on its own with `text_vector`, it makes a matrix of raw counts, one `count_vector` per text, and scales the whole matrix once with `unit_rows`. The counting stays a Python loop, since splitting and counting words is work on strings, not numbers; the arithmetic moves into NumPy. `text_vector` stays as it is, for questions.

This is a refactor: a change to how the code works that leaves what it does exactly the same. Chapter 1's rule for a refactor is to have tests that pin the behaviour down first, and 4.3's tests already do that for `text_matrix`. Change `text_matrix` in `src/frontier/matrix.py`:

```python file=src/frontier/matrix.py
"""A collection of texts as a matrix: one row per text, one column per word."""
import numpy as np
import numpy.typing as npt

from frontier.arrays import Vector, unit
from frontier.text import split_words
from frontier.vectors import count_vector, vocabulary

Matrix = npt.NDArray[np.float64]


def text_vector(text: str, vocab: list[str]) -> Vector:
    """text's count vector over vocab, scaled to length 1. Words outside vocab are left out."""
    return unit(np.array(count_vector(split_words(text), vocab)))


def text_matrix(texts: list[str]) -> tuple[Matrix, list[str]]:
    """Every text as a row of length 1, and the vocabulary that names the columns."""
    vocab = vocabulary([split_words(text) for text in texts])
    counts = np.array([count_vector(split_words(text), vocab) for text in texts])
    return unit_rows(counts), vocab


def times_vector(m: Matrix, v: Vector) -> Vector:
    """m @ v by hand: each row of m dotted with v."""
    return np.array([float(row @ v) for row in m])


def times(a: Matrix, b: Matrix) -> Matrix:
    """a @ b by hand: entry i, j is row i of a dotted with column j of b."""
    out = np.zeros((a.shape[0], b.shape[1]))
    for i in range(a.shape[0]):
        for j in range(b.shape[1]):
            out[i, j] = a[i] @ b[:, j]
    return out


def unit_rows(m: Matrix) -> Matrix:
    """Every row of m scaled to length 1, all at once."""
    lengths = np.linalg.norm(m, axis=1, keepdims=True)
    if np.any(lengths == 0):
        raise ValueError("a row of zeros has no direction")
    return m / lengths
```

`text_matrix` calls `unit_rows`, which is further down the file. That's fine: Python looks a name up when the line runs, not when the function is defined, and by the time anything calls `text_matrix`, the whole file has been read. Run 4.3's tests and its search again; neither should notice the change:

```powershell
.venv\Scripts\python -m pytest -q tests/test_matrix.py
.venv\Scripts\python experiments/search_texts.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_matrix.py" label="every 4.3 test still passes" -- counts = np.array([count_vector(split_words(text), vocab) for text in texts]), then return unit_rows(counts), vocab.
run ".venv/Scripts/python experiments/search_texts.py" stdout="0.714  a cat chased a dog" label="the search gives the same scores" -- text_matrix must still scale every row to length 1: return unit_rows(counts).
```

## Your turn: center the columns

A dataset's columns are usually measurements, such as a house's floor area in one column and its number of rooms in another, and each column has its own typical size. Taking each column's average away from it, **centering**, makes every column average 0, so each number says how far above or below average that row is. Chapter 8 does this, and more, to a dataset before training a model on it.

**Build, on your own:** `center(m)` at the end of `src/frontier/matrix.py`, taking a `Matrix` and returning a `Matrix`: `m` with each column's average subtracted from every number in that column. One line of arithmetic, no loops.

- `m.mean(axis=0)` is one average per column, shape `(columns,)`, the way 4.3's `m.sum(axis=0)` was one total per column.
- Line `(rows, columns)` up with `(columns,)` from the right and the rule above says the averages are reused for every row, which is what centering needs. No `keepdims` this time.
- Write `m - ...`, which makes a new array. `m -= ...` would subtract **in place**, changing the matrix the caller passed in, as changing 4.2's slice changed `v`; the tests check that the caller's matrix is left alone.

```hints
nudge: The column averages are m.mean(axis=0). Subtract them from m and return the result.
concept: return m - m.mean(axis=0). The averages have shape (columns,), which broadcasting reuses for every row. axis=1 would be one average per row instead, which is wrong here.
answer: At the end of `src/frontier/matrix.py`:
~~~python
def center(m: Matrix) -> Matrix:
    """m with each column's average taken away, so every column averages 0."""
    return m - m.mean(axis=0)
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_broadcasting.py -k center" label="every column averages 0, and m is left alone" -- Subtract m.mean(axis=0), the column averages, and return a new array: m - ..., not m -= ....
run ".venv/Scripts/python -m pytest -q tests/test_broadcasting.py tests/test_matrix.py tests/test_arrays.py tests/test_vectors.py" label="every vector and matrix test passes" -- Leave unit_rows and text_matrix as they were.
run ".venv/Scripts/python -m mypy --strict src/frontier/matrix.py" stdout="Success" label="mypy --strict still passes" -- center takes a Matrix and returns a Matrix.
```

## Onto GitHub

Commit and push:

```powershell
git add .
git commit -m "Broadcasting: every row scaled at once, and centered columns"
git push
```

```check
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  matrix.py              also unit_rows (keepdims) and center; text_matrix now scales with unit_rows
experiments/
  broadcasting.py        a number, a row and a column combined with a matrix, and a shape that doesn't fit
  keepdims.py            dividing rows by their lengths with and without keepdims
tests/
  test_broadcasting.py   -k scale, center
```

Next lesson: pictures. **Matplotlib** draws the similarity table from 4.3 as a grid of colours, and plots points, each saved to an image file.
