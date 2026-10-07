# Solving linear systems

The last lesson ran matrices forwards: given a vector `x`, find where the matrix `A` sends it, `A @ x`. This lesson runs them backwards. Given the result `b`, which vector `x` was sent there? Written as an equation, find `x` such that

\[
A x = b
\]

That one equation is a **system of linear equations**, and it appears all over science and engineering: currents in a circuit, forces in a bridge, prices hidden in a pile of receipts. In machine learning it appears in its most important form at the end of this lesson, when there are more equations than unknowns and no exact answer exists. Finding the **best** approximate answer to that problem is linear regression.

## From equations to a matrix

Three receipts from a shop, each for apples, bread and milk:

- 2 apples, 1 bread, 1 milk cost 5.60
- 1 apple, 2 bread, 0 milk cost 5.10
- 0 apples, 1 bread, 3 milk cost 6.20

What does each item cost? Call the unknown prices `x₁`, `x₂` and `x₃`. Each receipt is one equation, and each equation is one row of a matrix times the vector of prices:

\[
\begin{pmatrix} 2 & 1 & 1 \\ 1 & 2 & 0 \\ 0 & 1 & 3 \end{pmatrix}
\begin{pmatrix} x_1 \\ x_2 \\ x_3 \end{pmatrix}
=
\begin{pmatrix} 5.60 \\ 5.10 \\ 6.20 \end{pmatrix}
\]

The row reading of matrix multiplication from the last lesson is exactly this: the first row times `x` is `2x₁ + x₂ + x₃`, the first receipt's total. `np.linalg.solve` finds `x`:

```python type
import numpy as np

A = np.array([[2, 1, 1],
              [1, 2, 0],
              [0, 1, 3]], dtype=float)
b = np.array([5.60, 5.10, 6.20])
prices = np.linalg.solve(A, b)
print(prices.round(2))
print(A @ prices)
```

```output
[1.1 2.  1.4]
[5.6 5.1 6.2]
```

Apples cost 1.10, bread 2.00 and milk 1.40. The second line checks the answer the best way: multiply back, and see that it reproduces the receipts. Always check a solution like this; it costs one line.

## What solving means, geometrically

The column reading gives another way to see the same problem. `A @ x` is a weighted sum of the columns of `A`, so solving `A x = b` asks: **how much of each column do you need to add up to exactly `b`?**

In two dimensions you can draw it. The columns of `A` are two arrows, and `b` is a target point. Solving means finding how far to walk along each arrow to reach the target:

```python type
import numpy as np
import matplotlib.pyplot as plt

A = np.array([[2.0, 1.0],
              [1.0, 3.0]])
b = np.array([7.0, 11.0])
x = np.linalg.solve(A, b)
print("x =", x)

c1 = x[0] * A[:, 0]
fig, ax = plt.subplots(figsize=(4.5, 4.5))
ax.annotate("", xy=c1, xytext=(0, 0), arrowprops=dict(arrowstyle="->", color="tab:red", lw=2))
ax.annotate("", xy=c1 + x[1] * A[:, 1], xytext=c1, arrowprops=dict(arrowstyle="->", color="tab:green", lw=2))
ax.plot(*b, "ko", markersize=8)
ax.text(b[0] + 0.2, b[1], "b")
ax.set_xlim(-1, 12)
ax.set_ylim(-1, 12)
ax.set_aspect("equal")
ax.grid(True, alpha=0.3)
ax.set_title(f"{x[0]:.0f} × column 1 + {x[1]:.0f} × column 2 = b")
plt.show()
```

```output
x = [2. 3.]
```

Two steps of the first column (red) and three of the second (green) land exactly on `b`. (`ax.plot(*b, "ko")` unpacks `b` into its x and y and draws a black dot.)

## The inverse: undoing a transformation

If a matrix `A` can be undone, the matrix that undoes it is called its **inverse**, written `A⁻¹`. Applying `A` and then `A⁻¹` returns every vector to where it started, so their product is the identity matrix:

\[
A^{-1} A = I
\]

Then solving is one multiplication. Multiply both sides of `A x = b` by `A⁻¹`: the left side becomes `A⁻¹ A x = I x = x`, since the identity changes nothing, so `x = A⁻¹ b`.

```python type
import numpy as np

A = np.array([[2.0, 1.0],
              [1.0, 3.0]])
A_inv = np.linalg.inv(A)
print(A_inv)
print((A_inv @ A).round(10))
print(A_inv @ np.array([7.0, 11.0]))
```

```output
[[ 0.6 -0.2]
 [-0.2  0.4]]
[[ 1. -0.]
 [ 0.  1.]]
[2. 3.]
```

(A `-0.` in the output is just zero with a minus sign left over from rounding; it equals 0.) It is useful to know the inverse exists and what it means. In practice, though, prefer `np.linalg.solve(A, b)` to `np.linalg.inv(A) @ b`. `solve` goes straight to the answer without building the whole inverse, so it is faster, and it makes smaller rounding errors, which matters for large or delicate problems.

## When there is no unique answer

Not every matrix can be undone. Recall the projection from the last lesson, which flattened the whole plane onto a line: many different points landed in the same place, so given where a point landed there is no way to know where it started. For such a matrix, `A x = b` either has **no** solution (when `b` is not on that line) or **infinitely many** (when it is).

Here is the receipts problem with a flaw: the third customer bought exactly twice what the first did, so their receipt gives no new information.

```python type
import numpy as np

A = np.array([[2, 1, 1],
              [1, 2, 0],
              [4, 2, 2]], dtype=float)
b = np.array([5.60, 5.10, 11.20])
print(np.linalg.solve(A, b))
```

```output
[nan nan nan]
```

There is no **single** answer to give: the matrix is **singular**, the word for a square matrix that cannot be inverted. With only two genuinely different receipts for three unknown prices, there are infinitely many sets of prices that fit.

The third receipt could also **contradict** the first. If it said 11.00 instead of 11.20, no prices at all could fit, because a customer buying exactly twice as much must pay exactly twice as much:

```python type
import numpy as np

A = np.array([[2, 1, 1],
              [1, 2, 0],
              [4, 2, 2]], dtype=float)
print(np.linalg.solve(A, np.array([5.60, 5.10, 11.00])))
```

```output
[nan nan nan]
```

Same singular matrix, and this time there is no solution at all. Either way, a singular matrix means `A x = b` has no unique answer: infinitely many, or none, depending on `b`.

How this shows up depends on where NumPy is running. In this notebook, `solve` returns `nan` ("not a number") for every component. On a normal computer, NumPy raises an error instead, `LinAlgError: Singular matrix`. And with real, messy numbers, rounding can leave a singular matrix very slightly non-singular, so that `solve` returns huge, meaningless numbers with no warning at all. In every case the lesson is the same: do not trust a solution without checking it, and check whether the matrix can be inverted in the first place.

How can you tell in advance? A square matrix can be inverted exactly when its **determinant is not zero**. The last lesson defined the determinant for 2 by 2 matrices as the factor by which areas change; for a 3 by 3 matrix it is the factor by which **volumes** change, and `np.linalg.det` computes it for any square matrix. Either way, a determinant of zero means the matrix flattens space. A more informative measure is the **rank**: the number of genuinely independent directions among the columns (or, equivalently, the rows). The rows (or columns) are **linearly dependent** when one can be built from the others, as the third row here is twice the first.

```python type
import numpy as np

good = np.array([[2, 1, 1], [1, 2, 0], [0, 1, 3]], dtype=float)
bad = np.array([[2, 1, 1], [1, 2, 0], [4, 2, 2]], dtype=float)
for name, M in [("good", good), ("bad", bad)]:
    print(name, "rank", np.linalg.matrix_rank(M), " det", round(np.linalg.det(M), 6))
```

```output
good rank 3  det 10.0
bad rank 2  det 0.0
```

A 3 by 3 matrix of rank 3 is **full rank**: its three columns point in three genuinely different directions, it can be inverted, and every `A x = b` has exactly one answer. Rank 2 means everything is squashed into a plane: one direction's worth of information is lost.

In machine learning, the same thing happens when two features carry the same information, such as a height in centimetres and the same height in inches. The data matrix then loses rank, and methods that need to solve a system become unstable. It is a real problem, called **collinearity**, and you will meet it again in regression.

## Nearly singular: when small errors become large ones

Between "invertible" and "singular" lies a dangerous middle ground. A matrix can be invertible in principle, but so close to singular that tiny changes in `b`, like rounding or measurement errors, cause huge changes in the answer. Predict how much the answer moves when `b` changes by 0.001.

```python type
import numpy as np

A = np.array([[1.0, 1.0],
              [1.0, 1.001]])
x1 = np.linalg.solve(A, np.array([2.0, 2.0]))
x2 = np.linalg.solve(A, np.array([2.0, 2.001]))
print(x1)
print(x2)
print("condition number:", round(np.linalg.cond(A)))
```

```output
[2. 0.]
[1. 1.]
condition number: 4002
```

Changing one number in `b` by 0.001 swings the solution from `(2, 0)` to `(1, 1)`. The two rows of `A` are almost the same equation, so the answer is very poorly determined. The **condition number** measures this sensitivity: roughly, it is how many times small relative errors in `b` can be magnified in `x`. Around 1 is excellent; here it is about 4000; in the millions, answers computed with floats may be meaningless. Nearly duplicate features in a dataset produce exactly this situation.

## More equations than unknowns

Now the case that matters most in machine learning. Suppose you measure how a spring stretches under different weights, expecting a straight-line relationship `length = m × weight + c`. Each measurement gives one equation in the two unknowns `m` and `c`:

\[
\begin{pmatrix} w_1 & 1 \\ w_2 & 1 \\ \vdots & \vdots \\ w_n & 1 \end{pmatrix}
\begin{pmatrix} m \\ c \end{pmatrix}
\approx
\begin{pmatrix} \ell_1 \\ \ell_2 \\ \vdots \\ \ell_n \end{pmatrix}
\]

With ten measurements there are ten equations and only two unknowns, and because every measurement has a little error, no single line passes through all ten points. There is no exact solution. The sensible question becomes: which `m` and `c` make the equations **as nearly true as possible**?

The standard answer is the **least squares** solution: choose `m` and `c` to make the sum of the squared errors, the gaps between each predicted and measured length, as small as possible. The errors are squared so that positive and negative gaps cannot cancel each other out, and so that one big miss counts for much more than several small ones; a later lesson on loss functions looks at other choices. `np.linalg.lstsq` finds it:

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(0)
weights = np.linspace(0, 5, 10)
lengths = 3.0 * weights + 10 + rng.normal(0, 0.8, size=10)

A = np.column_stack([weights, np.ones(10)])
(m, c), *_ = np.linalg.lstsq(A, lengths)
print(f"best line: length = {m:.2f} × weight + {c:.2f}")

fig, ax = plt.subplots()
ax.scatter(weights, lengths, label="measurements")
ax.plot(weights, m * weights + c, color="tab:red", label="least squares line")
ax.set_xlabel("weight (kg)")
ax.set_ylabel("length (cm)")
ax.legend()
plt.show()
```

```output
best line: length = 2.91 × weight + 10.30
```

The data was simulated from the line `3 × weight + 10` plus random noise, and least squares recovers numbers close to 3 and 10 from the noisy measurements alone. The column of ones in `A` is what lets the line have an intercept `c`: each row says `m × w + c × 1`. (`lstsq` returns four things; `(m, c), *_ = ...` unpacks the first, the solution, and collects the rest, which this lesson does not need, into `_`.)

This is linear regression, the first real learning algorithm in this series. You will derive where the least squares answer comes from, and build it yourself from scratch, a dozen lessons from now. For now the point is the shape of the problem: a tall matrix, more equations than unknowns, and a best compromise instead of an exact answer. That describes almost every dataset.

::: challenge Hidden prices [easy]
A café has three menu items. Three customers' bills were:

- 1 coffee, 2 cakes, 1 sandwich: 13.50
- 2 coffees, 0 cakes, 1 sandwich: 10.00
- 3 coffees, 1 cake, 0 sandwiches: 10.50

Set up the matrix `A` and vector `b`, solve for the three prices, and store them in a NumPy array `prices` in the order coffee, cake, sandwich. Print them rounded to 2 decimal places.

```python starter
import numpy as np

prices = np.zeros(3)
print(prices)
```

```python solution
import numpy as np

A = np.array([[1, 2, 1],
              [2, 0, 1],
              [3, 1, 0]], dtype=float)
b = np.array([13.50, 10.00, 10.50])
prices = np.linalg.solve(A, b)
print(prices.round(2))
```

```python test
import numpy as _np
_A = _np.array([[1, 2, 1], [2, 0, 1], [3, 1, 0]], dtype=float)
_b = _np.array([13.50, 10.00, 10.50])
assert _np.shape(prices) == (3,), f"prices should be an array of 3 numbers, but it has shape {_np.shape(prices)}."
assert _np.allclose(_A @ prices, _b), f"Your prices {prices} do not reproduce the three bills. Check each row of A matches one bill, in the order coffee, cake, sandwich."
"SUCCESS: Three bills, three unknowns, one line to solve them."
```

Hint: Each bill is one row of `A`, with the quantities in the order coffee, cake, sandwich; the totals form `b`. Then `np.linalg.solve(A, b)`.
:::

::: challenge Solve if you can [medium]
Write a function `safe_solve(A, b)` that returns the solution of `A x = b` for a square matrix `A`, or `None` if `A` does not have full rank (so there is no unique solution). Decide using `np.linalg.matrix_rank`, before trying to solve.

```python starter
import numpy as np

def safe_solve(A, b):
    return np.linalg.solve(A, b)

print(safe_solve(np.array([[1.0, 2.0], [2.0, 4.0]]), np.array([3.0, 6.0])))
```

```python solution
import numpy as np

def safe_solve(A, b):
    if np.linalg.matrix_rank(A) < A.shape[0]:
        return None
    return np.linalg.solve(A, b)

print(safe_solve(np.array([[1.0, 2.0], [2.0, 4.0]]), np.array([3.0, 6.0])))
```

```python test
import numpy as _np
assert "safe_solve" in dir(), "Keep the function's name as safe_solve."
try:
    _r = safe_solve(_np.array([[1.0, 2.0], [2.0, 4.0]]), _np.array([3.0, 6.0]))
except _np.linalg.LinAlgError:
    raise AssertionError("safe_solve raised LinAlgError for a singular matrix. Check the rank first and return None.")
assert _r is None, f"[[1, 2], [2, 4]] has rank 1, so safe_solve should return None, but it returned {_r!r}."
_A = _np.array([[2.0, 1.0], [1.0, 3.0]])
assert _np.allclose(safe_solve(_A, _np.array([7.0, 11.0])), [2, 3]), "For an invertible matrix, safe_solve should return the solution."
_B = _np.array([[1.0, 2, 3], [4, 5, 6], [7, 8, 9]])
assert safe_solve(_B, _np.ones(3)) is None, "The 3 by 3 matrix with rows 1-2-3, 4-5-6, 7-8-9 has rank 2, so safe_solve should return None."
_C = _np.array([[1.0, 2, 0], [0, 1, 4], [5, 0, 1]])
assert _np.allclose(_C @ safe_solve(_C, _np.array([1.0, 2, 3])), [1, 2, 3]), "safe_solve should solve a full-rank 3 by 3 system."
"SUCCESS: Check the rank, then solve."
```

Hint: A square matrix with `n` rows has full rank when its rank is `n`; `A.shape[0]` is the number of rows. Return `None` early if the rank is smaller.
:::

::: challenge Fit a line [easy]
Write a function `fit_line(x, y)` that returns the slope `m` and intercept `c` of the least squares line `y ≈ m x + c` through the points, as a tuple `(m, c)` of floats. Build the tall matrix with a column of `x` values and a column of ones, as in the lesson, and use `np.linalg.lstsq`.

Then use it: the starter has the ages and heights of some children. Store the fitted slope, in centimetres per year, in `growth_per_year`.

```python starter
import numpy as np

def fit_line(x, y):
    return 0.0, 0.0

ages = np.array([2, 3, 4, 5, 6, 7, 8, 9])
heights = np.array([86, 95, 102, 109, 115, 121, 127, 133])
growth_per_year = 0.0
print(growth_per_year)
```

```python solution
import numpy as np

def fit_line(x, y):
    A = np.column_stack([x, np.ones(len(x))])
    (m, c), *_ = np.linalg.lstsq(A, y)
    return float(m), float(c)

ages = np.array([2, 3, 4, 5, 6, 7, 8, 9])
heights = np.array([86, 95, 102, 109, 115, 121, 127, 133])
growth_per_year, _ = fit_line(ages, heights)
print(growth_per_year)
```

```python test
import numpy as _np
assert "fit_line" in dir(), "Keep the function's name as fit_line."
_x = _np.array([0.0, 1, 2, 3])
_m, _c = fit_line(_x, 2 * _x + 1)
assert _np.isclose(_m, 2) and _np.isclose(_c, 1), f"For points exactly on y = 2x + 1, fit_line should return (2, 1), but returned ({_m}, {_c})."
_rng = _np.random.default_rng(8)
_xs = _rng.uniform(0, 10, 30)
_ys = -1.5 * _xs + 4 + _rng.normal(0, 0.5, 30)
_want = _np.polyfit(_xs, _ys, 1)
_got = fit_line(_xs, _ys)
assert _np.allclose(_got, _want), f"For noisy data the least squares line is m = {_want[0]:.4f}, c = {_want[1]:.4f}, but fit_line returned {_got}."
_ages = _np.array([2, 3, 4, 5, 6, 7, 8, 9])
_heights = _np.array([86, 95, 102, 109, 115, 121, 127, 133])
assert _np.isclose(growth_per_year, _np.polyfit(_ages, _heights, 1)[0]), f"growth_per_year should be the fitted slope for the children's data, about {_np.polyfit(_ages, _heights, 1)[0]:.2f}."
"SUCCESS: Your first model fitted to data: least squares linear regression."
```

Hint: `np.column_stack([x, np.ones(len(x))])` builds the matrix. `np.linalg.lstsq(A, y)` returns the solution first; unpack it as in the lesson. For the children, call `fit_line(ages, heights)` and keep the slope.
:::

## What you learned

- A system of linear equations is `A x = b`: each equation is a row. Solving asks which `x` the matrix sends to `b`, or, by columns, how much of each column adds up to `b`.
- `np.linalg.solve(A, b)` solves a square system. Always check by computing `A @ x`.
- The inverse `A⁻¹` undoes `A`; `A⁻¹ A = I`. Prefer `solve` to `inv` in practice: it is faster and more accurate.
- A singular matrix (determinant 0, rank below full) cannot be inverted, and `A x = b` then has no solution or infinitely many. Rank counts the independent directions; dependent columns (like duplicate features) lower it.
- A nearly singular matrix has a large condition number: tiny errors in `b` cause large errors in `x`.
- With more equations than unknowns there is usually no exact solution. The least squares solution, `np.linalg.lstsq`, minimises the sum of squared errors, and fitting a line this way is linear regression.

The last three lessons have looked at what matrices do to vectors in general. Next you will look for the special directions that a matrix only stretches, never turns, called eigenvectors, and the singular value decomposition, which breaks any matrix into a rotation, a stretch and another rotation.
