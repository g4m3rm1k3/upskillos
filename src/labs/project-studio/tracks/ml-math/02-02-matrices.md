---
title: 2.2 — A Dataset Is a Matrix
track: Mathematics Through Computation
runtime: none
concepts: matrices, numpy
revisits: vectors, dot-product, tabular-data
notebook: ml-matrices-as-transformations, ml-indexing-and-broadcasting
lab: 3
problem: A dot product prices one house. How do you price all 48 at once, or try several sets of weights at once, without writing a loop each time?
---

Last lesson, one dot product turned one house into one price estimate. A model has to estimate prices for every house, and to learn, it will do that thousands of times. Stack the house vectors as the rows of a table and you have a **matrix**; one operation, **matrix multiplication**, then prices every house at once. It's the operation that NumPy, scikit-learn and PyTorch spend most of their time doing.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_matrices.py provided
# Tests for matrices.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_matrices.py
import numpy as np
import pytest

import matrices

HOUSES = [
    [1540, 3, 54],
    [1350, 2, 28],
]
WEIGHTS = [140, 6000, -700]
A = [[1, 2], [3, 4]]
B = [[0, 1], [1, 0]]


def test_shape_counts_rows_then_columns():
    assert matrices.shape(HOUSES) == (2, 3)
    assert matrices.shape([[1], [2], [3]]) == (3, 1)


def test_transpose_turns_rows_into_columns():
    assert matrices.transpose(HOUSES) == [[1540, 1350], [3, 2], [54, 28]]
    assert matrices.transpose(matrices.transpose(HOUSES)) == HOUSES


def test_matvec_takes_a_dot_product_with_every_row():
    assert matrices.matvec(HOUSES, WEIGHTS) == [195800, 181400]


def test_matmul_small_example():
    assert matrices.matmul(A, B) == [[2, 1], [4, 3]]
    assert matrices.matmul(B, A) == [[3, 4], [1, 2]], "the order matters"


def test_matmul_shapes():
    tall = [[1], [2], [3]]           # 3 x 1
    wide = [[1, 2, 3]]               # 1 x 3
    assert matrices.shape(matrices.matmul(tall, wide)) == (3, 3)
    assert matrices.matmul(wide, tall) == [[14]]


def test_matmul_rejects_shapes_that_do_not_fit():
    with pytest.raises(ValueError, match=r"\(2, 3\).*\(2, 2\)"):
        matrices.matmul(HOUSES, A)


def test_matmul_identity_changes_nothing():
    assert matrices.matmul(A, matrices.identity(2)) == A
    assert matrices.matmul(matrices.identity(2), A) == A


def test_numpy_agrees_with_yours():
    rng = np.random.default_rng(0)
    left = rng.integers(-5, 5, size=(4, 3))
    right = rng.integers(-5, 5, size=(3, 2))
    assert matrices.matmul(left.tolist(), right.tolist()) == (left @ right).tolist()
```

The last test is the same idea as Chapter 1's pandas tests, reversed: random integer matrices, multiplied by your code and by NumPy, must agree exactly. `rng.integers(-5, 5, size=(4, 3))` makes a 4×3 matrix of random integers from −5 to 4, and `default_rng(0)` fixes the **seed**, so the "random" matrices are the same every run. A test that used different random numbers each time could pass today and fail tomorrow.

```check
file tests/test_matrices.py -- Click "Create provided tests/test_matrices.py" above.
```

## Shapes, rows and columns

> **Matrix**: a rectangle of numbers arranged in rows and columns. Its **shape** is (number of rows, number of columns). Entry $M_{ij}$ is the number in row $i$, column $j$.
>
> *Picture it as* a filled-in inspection sheet: one row per part, one column per measurement. A vector is one row of it (or one column); the matrix is the whole sheet.

A **matrix** is a rectangle of numbers. Its **shape** is (rows, columns): the two houses above form a 2×3 matrix (2 houses, 3 features). In Python, a list of row lists. Create `matrices.py`:

```python file=matrices.py
Matrix = list[list[float]]


def shape(m: Matrix) -> tuple[int, int]:
    return len(m), len(m[0])


def column(m: Matrix, j: int) -> list[float]:
    return [row[j] for row in m]


def transpose(m: Matrix) -> Matrix:
    return [column(m, j) for j in range(shape(m)[1])]
```

The **transpose** $M^\top$ swaps rows and columns: row $i$, column $j$ becomes row $j$, column $i$. The 2×3 houses matrix becomes 3×2: each **row** of the transpose is one **feature** across all houses (`[1540, 1350]` is the `sqft` column). Transposing twice gives back the original, which the second test checks.

In ML the convention is fixed: **one row per observation, one column per feature**. A dataset of $n$ observations with $k$ features is an $n \times k$ matrix, almost always called $X$. When you meet `X.shape` in someone's code, `(48, 3)` means 48 houses with 3 features each.

```check
run ".venv/Scripts/python -m pytest -q tests/test_matrices.py -k \"shape_counts or transpose\"" label="shape and transpose work"
```

## Every house at once

Multiplying a matrix by a vector takes the dot product of **each row** with the vector:

$$X\mathbf{w} = \begin{bmatrix} 1540 & 3 & 54 \\ 1350 & 2 & 28 \end{bmatrix} \begin{bmatrix} 140 \\ 6000 \\ -700 \end{bmatrix} = \begin{bmatrix} 195800 \\ 181400 \end{bmatrix}$$

One price estimate per house, with one set of weights. Add `matvec`, reusing last lesson's `dot`:

```python file=matrices.py
import vectors

Matrix = list[list[float]]


def shape(m: Matrix) -> tuple[int, int]:
    return len(m), len(m[0])


def column(m: Matrix, j: int) -> list[float]:
    return [row[j] for row in m]


def transpose(m: Matrix) -> Matrix:
    return [column(m, j) for j in range(shape(m)[1])]


def matvec(m: Matrix, v: list[float]) -> list[float]:
    return [vectors.dot(row, v) for row in m]
```

`import vectors` imports the module you wrote last lesson. Because `vectors.dot` uses `zip(..., strict=True)`, a weight vector of the wrong length fails here too, without `matvec` checking anything itself.

This is the whole of a linear model's prediction step, for any number of houses: $\hat{\mathbf{y}} = X\mathbf{w}$. The hat on $\hat{\mathbf{y}}$ ("y-hat") marks it as an *estimate* of $\mathbf{y}$, the true prices.

```check
run ".venv/Scripts/python -m pytest -q tests/test_matrices.py -k matvec" label="matvec prices every house" -- One dot product per row: [vectors.dot(row, v) for row in m]
```

## Matrix times matrix

Now suppose you have **three** candidate sets of weights and want every house priced by each of them. Put each weight vector in a **column** of a matrix $W$ (3 features × 3 candidates). Then $XW$ is a matrix whose entry in row $i$, column $j$ is house $i$ priced with candidate $j$:

$$(XW)_{ij} = \text{row } i \text{ of } X \;\cdot\; \text{column } j \text{ of } W$$

That's **matrix multiplication**: every row of the left matrix dotted with every column of the right.

*Picture it as* a pile of order forms and a stack of price lists from different suppliers. Each order (a row of quantities) totalled against each supplier's price list (a column of unit prices) gives one invoice total. The answer is a table of totals: one row per order, one column per supplier. Every order needs a price for every item on it, which is the shape rule below. The rows of $X$ have $k$ entries and the columns of $W$ have as many entries as $W$ has rows, so those must match. The shape rule:

```text
(n × k)  @  (k × m)  =  (n × m)
      └──must──┘
        match
```

Add `matmul` and `identity`:

```python file=matrices.py
import vectors

Matrix = list[list[float]]


def shape(m: Matrix) -> tuple[int, int]:
    return len(m), len(m[0])


def column(m: Matrix, j: int) -> list[float]:
    return [row[j] for row in m]


def transpose(m: Matrix) -> Matrix:
    return [column(m, j) for j in range(shape(m)[1])]


def matvec(m: Matrix, v: list[float]) -> list[float]:
    return [vectors.dot(row, v) for row in m]


def matmul(a: Matrix, b: Matrix) -> Matrix:
    if shape(a)[1] != shape(b)[0]:
        raise ValueError(f"cannot multiply {shape(a)} by {shape(b)}: inner sizes differ")
    columns = transpose(b)
    return [[vectors.dot(row, col) for col in columns] for row in a]


def identity(n: int) -> Matrix:
    return [[1 if i == j else 0 for j in range(n)] for i in range(n)]
```

The last line is a **nested list comprehension**: one comprehension inside another. Written as loops, it's:

```python
result = []
for row in a:                      # outer: one result row per row of a
    new_row = []
    for col in columns:            # inner: one entry per column of b
        new_row.append(vectors.dot(row, col))
    result.append(new_row)
return result
```

`transpose(b)` turns `b`'s columns into rows, so "each column of `b`" is a simple loop. It's computed once, outside the comprehension, rather than once per row of `a`.

Trace the small test: $A = \begin{bmatrix}1&2\\3&4\end{bmatrix}$, $B = \begin{bmatrix}0&1\\1&0\end{bmatrix}$. Row 1 of $A$, $[1, 2]$, dotted with column 1 of $B$, $[0, 1]$, is 2; with column 2, $[1, 0]$, is 1. So the first row of $AB$ is $[2, 1]$: $B$ swaps the columns of $A$.

```predict
question: AB swaps the columns of A. What does BA do to A?
choice: The same: matrix multiplication doesn't depend on order
choice: It swaps the rows of A
choice: It transposes A
answer: It swaps the rows of A
explain: BA = [[3, 4], [1, 2]]: A's rows, swapped. Multiplying by B on the right acts on columns; on the left, it acts on rows. So **AB ≠ BA** in general: matrix multiplication is not commutative, unlike multiplying numbers. When code computes `X @ W`, the order is a decision, and the shapes usually make the right one the only one that works: a 48×3 matrix times a 3×3 one is fine; 3×3 times 48×3 is an error.
```

The **identity** matrix $I$ (1s on the diagonal, 0s elsewhere) is the matrix version of the number 1: $AI = IA = A$.

```check
run ".venv/Scripts/python -m pytest -q tests/test_matrices.py" label="every matrix test passes, including NumPy agreeing with you" -- Check the shapes first; then dot every row of a with every column of b.
```

## Pricing the whole dataset with NumPy

Your `matmul` is three nested loops in Python: for 48 houses it's instant; for a neural network layer multiplying a 10,000×1,000 matrix by a 1,000×1,000 one, it's ten billion multiply-adds, and NumPy's compiled version is many thousands of times faster. From here on you'll use NumPy's `@`, knowing exactly what it computes.

Create `predict.py`, which prices all 48 houses with hand-picked weights:

```python file=predict.py
import csv

import numpy as np

with open("data/houses.csv", newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

X = np.array([[float(row["sqft"]), float(row["bedrooms"])] for row in rows])
y = np.array([float(row["price"]) for row in rows])

w = np.array([140.0, 6000.0])    # dollars per square foot, dollars per bedroom
b = 40000.0                      # a base price every house starts from

predictions = X @ w + b
errors = predictions - y

print("X has shape", X.shape, "and w has shape", w.shape)
print("first three predictions:", predictions[:3])
print("first three prices:     ", y[:3])
print(f"mean absolute error: {np.mean(np.abs(errors)):,.0f}")
print(f"always guessing the mean price is off by: {np.mean(np.abs(y - y.mean())):,.0f}")
```

What each NumPy operation is, in terms you've already built:

| NumPy | What it computes | Your version |
|---|---|---|
| `np.array(list_of_rows)` | a 48×2 matrix | a list of row lists |
| `X.shape` | `(48, 2)` | `shape(X)` |
| `X @ w` | one dot product per row: 48 estimates | `matvec(X, w)` |
| `X @ w + b` | adds `b` to **every** entry (broadcasting) | `[p + b for p in ...]` |
| `predictions - y` | 48 differences, entry by entry | `subtract` |
| `np.abs(errors)`, `np.mean(...)` | elementwise absolute value, then the mean | a loop and `mean` |
| `predictions[:3]` | the first three entries | slicing a list |

`+ b` is **broadcasting**: NumPy's rule for combining arrays of different shapes by repeating the smaller one across the larger, without actually copying it. Here it stretches the single number `b` across all 48 entries. *Picture it as* adding the same fixed setup charge to every invoice in the pile: you don't write it 48 times, you apply one charge to all of them. Here's the output:

```powershell
.venv\Scripts\python predict.py
```

```text
X has shape (48, 2) and w has shape (2,)
first three predictions: [273600. 241000. 243800.]
first three prices:      [199000. 285500. 266000.]
mean absolute error: 30,996
always guessing the mean price is off by: 57,396
```

The hand-picked weights are typically about 31,000 off. That's better than ignoring the houses and guessing the mean every time (57,000 off), so the weights capture something real. But they're guesses. Are there better weights? How would you even search for them? Trying random weights and keeping the best is hopeless with more than a few features.

What's needed is a way to tell, for the current weights, **which direction to change each one** to make the error smaller. That's what a derivative is, and it's the next lesson.

```check
run ".venv/Scripts/python predict.py" stdout="X has shape (48, 2)" label="predict.py builds a 48 × 2 matrix of features"
run ".venv/Scripts/python predict.py" stdout="mean absolute error: 30,996" label="and measures how far the hand-picked weights are off"
```
