# Matrices as transformations

A **matrix** is a rectangle of numbers, a 2D array. You have already met the most common one in machine learning: a dataset, with one row per example and one column per feature. But a matrix is more than a table. When you multiply a matrix by a vector, you get a new vector, so a matrix is also a **function** that turns vectors into other vectors. Seen in two dimensions, that function stretches, rotates, flips or flattens the whole plane.

This picture of a matrix as a transformation is what makes the rest of machine learning's mathematics make sense. A neural network layer is a matrix transforming its input. Principal component analysis finds the directions a matrix stretches most. Solving a system of equations asks which vector a matrix sends to a given target. This lesson builds the picture, and the arithmetic that goes with it.

## Multiplying a matrix by a vector

To multiply a matrix `M` by a vector `v`, take the dot product of **each row** of `M` with `v`. Each row gives one number of the result.

\[
\begin{pmatrix} 2 & 1 \\ 0 & 3 \end{pmatrix}
\begin{pmatrix} 4 \\ 5 \end{pmatrix}
=
\begin{pmatrix} 2 \cdot 4 + 1 \cdot 5 \\ 0 \cdot 4 + 3 \cdot 5 \end{pmatrix}
=
\begin{pmatrix} 13 \\ 15 \end{pmatrix}
\]

In NumPy the `@` operator does it:

```python type
import numpy as np

M = np.array([[2, 1],
              [0, 3]])
v = np.array([4, 5])
print(M @ v)
print(np.array([M[0] @ v, M[1] @ v]))
```

```output
[13 15]
[13 15]
```

The second line computes the same thing row by row, to show that `@` is nothing more than a dot product for each row. For a dataset `X` and a weight vector `w`, `X @ w` is therefore one weighted sum per example, which is exactly what the linear model at the end of the last lesson computed.

## The same product, read by columns

There is a second, equally correct way to read that multiplication, and it is the one that makes the geometry click. `M @ v` is a **weighted sum of the columns** of `M`, weighted by the components of `v`:

\[
\begin{pmatrix} 2 & 1 \\ 0 & 3 \end{pmatrix}
\begin{pmatrix} 4 \\ 5 \end{pmatrix}
= 4 \begin{pmatrix} 2 \\ 0 \end{pmatrix} + 5 \begin{pmatrix} 1 \\ 3 \end{pmatrix}
= \begin{pmatrix} 13 \\ 15 \end{pmatrix}
\]

```python type
import numpy as np

M = np.array([[2, 1],
              [0, 3]])
v = np.array([4, 5])
print(4 * M[:, 0] + 5 * M[:, 1])
```

```output
[13 15]
```

Both readings give `[13, 15]`. The row reading is how you compute it; the column reading is how you understand it, as the next section shows.

## Where the arrows land

Every 2D vector can be built from two special vectors: `e1 = (1, 0)`, one step along x, and `e2 = (0, 1)`, one step along y. The vector `(4, 5)` is just 4 of `e1` plus 5 of `e2`. These two are called the **standard basis** vectors.

Now apply the column reading to them. `M @ e1` is 1 × (first column) + 0 × (second column): the first column. And `M @ e2` is the second column. So:

**The columns of a matrix are where it sends the basis vectors.**

Because every vector is a mix of `e1` and `e2`, and a matrix keeps the same mix (4 of the new `e1`, 5 of the new `e2`), knowing where the two basis vectors land tells you where **everything** lands. That is why a whole transformation of the plane fits into four numbers.

To see a transformation, apply it to a recognisable shape. This helper draws a shape before and after:

```python type
import numpy as np
import matplotlib.pyplot as plt

# An "F" shape, as a list of points joined by lines, one point per row.
F = np.array([[0, 0], [0, 3], [2, 3], [0, 3], [0, 1.5], [1.5, 1.5]])

def show(M, title, ax):
    moved = F @ M.T
    ax.plot(F[:, 0], F[:, 1], color="lightgray", lw=3)
    ax.plot(moved[:, 0], moved[:, 1], color="tab:blue", lw=3)
    ax.annotate("", xy=M[:, 0], xytext=(0, 0), arrowprops=dict(arrowstyle="->", color="tab:red", lw=2))
    ax.annotate("", xy=M[:, 1], xytext=(0, 0), arrowprops=dict(arrowstyle="->", color="tab:green", lw=2))
    ax.set_title(title)
    ax.set_xlim(-4, 4)
    ax.set_ylim(-4, 4)
    ax.set_aspect("equal")
    ax.grid(True, alpha=0.3)

fig, axes = plt.subplots(1, 2, figsize=(8, 4))
show(np.array([[1, 0], [0, 1]]), "identity: nothing moves", axes[0])
show(np.array([[2, 0], [0, 1]]), "stretch x by 2", axes[1])
plt.show()
```

The grey F is the original and the blue F is the result. The red and green arrows are the matrix's two columns, the new positions of `e1` and `e2`.

A note on `F @ M.T`. The points are stored as **rows**, one point per row, which is how data is always stored. To transform every row `p` by `M @ p` at once, NumPy computes `F @ M.T` (`.T` is the transpose). For a single point you can check that the two agree:

```python type
import numpy as np

M = np.array([[2, 1], [0, 3]])
p = np.array([4, 5])
print(M @ p, p @ M.T)
```

```output
[13 15] [13 15]
```

The transpose rule near the end of this lesson explains why. You will see this "data times transposed matrix" pattern constantly.

## A gallery of transformations

Each of these is just a choice of where to send `e1` and `e2`. Before running the cell, look at each matrix's columns and predict what will happen to the F.

```python type
import numpy as np
import matplotlib.pyplot as plt

F = np.array([[0, 0], [0, 3], [2, 3], [0, 3], [0, 1.5], [1.5, 1.5]])

def show(M, title, ax):
    moved = F @ M.T
    ax.plot(F[:, 0], F[:, 1], color="lightgray", lw=3)
    ax.plot(moved[:, 0], moved[:, 1], color="tab:blue", lw=3)
    ax.annotate("", xy=M[:, 0], xytext=(0, 0), arrowprops=dict(arrowstyle="->", color="tab:red", lw=2))
    ax.annotate("", xy=M[:, 1], xytext=(0, 0), arrowprops=dict(arrowstyle="->", color="tab:green", lw=2))
    ax.set_title(title, fontsize=10)
    ax.set_xlim(-4, 6)
    ax.set_ylim(-4, 4)
    ax.set_aspect("equal")
    ax.grid(True, alpha=0.3)

angle = np.radians(90)
rotate = np.array([[np.cos(angle), -np.sin(angle)],
                   [np.sin(angle),  np.cos(angle)]])
matrices = {
    "rotate 90°": rotate,
    "shear": np.array([[1, 1], [0, 1]]),
    "reflect in y-axis": np.array([[-1, 0], [0, 1]]),
    "flatten onto x-axis": np.array([[1, 0], [0, 0]]),
}
fig, axes = plt.subplots(1, 4, figsize=(14, 3.8))
for ax, (title, M) in zip(axes, matrices.items()):
    show(M, title, ax)
plt.show()
```

- **Rotation** sends `e1` to `(cos θ, sin θ)` and `e2` to `(−sin θ, cos θ)`: both basis vectors turn by the same angle, so the whole shape turns without changing size.
- **Shear** keeps `e1` in place but tips `e2` over to `(1, 1)`, slanting the shape like a deck of cards pushed sideways.
- **Reflection** flips `e1` to `(−1, 0)`, mirroring the shape.
- **Projection** sends `e2` to `(0, 0)`. Every point is squashed flat onto the x-axis, and the vertical information is lost for good: two different points can land in the same place, so there is no way to undo it.

That last one matters for the next lesson. Some matrices can be undone, and some destroy information and cannot.

## Multiplying matrices: doing one transformation after another

If you transform a vector by `B` and then by `A`, you get `A @ (B @ v)`. The matrix product `A @ B` is the single matrix that does both at once: first `B`, then `A`.

\[
(AB)v = A(Bv)
\]

To compute `A @ B`, multiply `A` by each column of `B` in turn; the results are the columns of the product:

```python type
import numpy as np

A = np.array([[1, 2], [3, 4]])
B = np.array([[0, 1], [5, 2]])
by_columns = np.column_stack([A @ B[:, 0], A @ B[:, 1]])
print(by_columns)
print(A @ B)
v = np.array([1, -1])
print((A @ B) @ v, A @ (B @ v))
```

```output
[[10  5]
 [20 11]]
[[10  5]
 [20 11]]
[5 9] [5 9]
```

The column-by-column product matches `A @ B`, and applying the product to `v` gives the same as applying `B` then `A`. The order matters: `A @ B` means "do `B` first", reading right to left, like function composition. And in general `A @ B` and `B @ A` are **different**. Predict both results of the next cell before running it: what happens to `(1, 0)` if you rotate it by 90° and then stretch x by 2, or the other way round?

```python type
import numpy as np

angle = np.radians(90)
rotate = np.array([[np.cos(angle), -np.sin(angle)],
                   [np.sin(angle),  np.cos(angle)]]).round(10)
stretch_x = np.array([[2, 0], [0, 1]])

v = np.array([1, 0])
print("rotate then stretch:", stretch_x @ rotate @ v)
print("stretch then rotate:", rotate @ stretch_x @ v)
print(np.allclose(stretch_x @ rotate, rotate @ stretch_x))
```

```output
rotate then stretch: [0. 1.]
stretch then rotate: [0. 2.]
False
```

Rotating `(1, 0)` to point up and then stretching x leaves it pointing up with length 1, since it has no x part left to stretch. Stretching first makes it length 2, and then rotating points it up. Two different answers: matrix multiplication is not **commutative**, unlike ordinary multiplication of numbers. (`.round(10)` cleans up tiny floating-point leftovers like 6e-17, which `np.cos(90°)` produces instead of an exact 0.)

## Shapes must fit

Matrices do not have to be square. A matrix with shape `(m, n)` takes vectors of length `n` and produces vectors of length `m`. For `A @ B`, the number of **columns** of `A` must equal the number of **rows** of `B`, and the result has the rows of `A` and the columns of `B`:

\[
(m \times n) \; @ \; (n \times p) \;\to\; (m \times p)
\]

```python type
import numpy as np

X = np.ones((100, 3))
W = np.ones((3, 4))
print((X @ W).shape)
```

```output
(100, 4)
```

A dataset of 100 examples with 3 features, times a `(3, 4)` matrix, gives 100 examples with 4 new features each. This is exactly what one layer of a neural network does: it multiplies the data by a weight matrix to produce a new set of features, and learning means finding good numbers for that matrix. When the inner numbers do not match, NumPy tells you:

```python error ValueError
import numpy as np

X = np.ones((100, 3))
W = np.ones((4, 3))
print((X @ W).shape)
```

The message names the mismatch: the inner dimensions 3 and 4 do not agree. Shape errors like this are among the most common bugs in machine learning code, and the fix always starts with printing the shapes and checking the `(m × n) @ (n × p)` rule. Here `W.T`, with shape `(3, 4)`, would fit.

## The identity matrix and the transpose

The **identity matrix**, `np.eye(n)`, has 1s on its main diagonal and 0s everywhere else. It sends `e1` to `e1` and `e2` to `e2`, so it leaves every vector unchanged: it is the matrix version of multiplying by 1.

The **transpose** `M.T` swaps rows and columns. One rule about it is used often: transposing a product reverses the order, `(A @ B).T` equals `B.T @ A.T`.

```python type
import numpy as np

A = np.array([[1, 2], [3, 4], [5, 6]])
B = np.array([[1, 0, 2], [0, 1, 1]])
print(np.eye(3))
print(np.array_equal(np.eye(3) @ A, A))
print(np.array_equal((A @ B).T, B.T @ A.T))
```

```output
[[1. 0. 0.]
 [0. 1. 0.]
 [0. 0. 1.]]
True
True
```

## How much does a matrix stretch area?

A transformation changes areas by a fixed factor, the same everywhere. The unit square, with corners at 0, `e1`, `e2` and `e1 + e2`, becomes a parallelogram whose sides are the matrix's two columns, and the area of that parallelogram is the factor. Stretching x by 2 turns the unit square into a 2 by 1 rectangle, so it doubles every area. A shear slants the square into a parallelogram with the same base and the same height, so it keeps every area the same. For a 2 by 2 matrix the factor has a simple formula, called the **determinant**:

\[
\det \begin{pmatrix} a & b \\ c & d \end{pmatrix} = ad - bc
\]

Using the gallery above, predict the determinant of each of the five matrices below before running the cell.

```python type
import numpy as np

for name, M in [("stretch x by 2", [[2, 0], [0, 1]]), ("rotation", [[0, -1], [1, 0]]), ("shear", [[1, 1], [0, 1]]), ("reflection", [[-1, 0], [0, 1]]), ("projection", [[1, 0], [0, 0]])]:
    print(f"{name:15} det = {np.linalg.det(np.array(M, dtype=float)):.2f}")
```

```output
stretch x by 2  det = 2.00
rotation        det = 1.00
shear           det = 1.00
reflection      det = -1.00
projection      det = 0.00
```

Stretching doubles areas (det 2). Rotation and shear keep areas the same (det 1). Reflection keeps the area but flips the shape over, which the determinant records as a minus sign (det −1). And projection flattens everything onto a line, where every area is zero (det 0). A determinant of zero is the signal that a matrix destroys information and cannot be undone, which is the central question of the next lesson.

::: challenge A rotation matrix [easy]
Write a function `rotation(degrees)` that returns the 2 by 2 matrix that rotates the plane anticlockwise by the given angle. Use the columns from the lesson: `e1` goes to `(cos θ, sin θ)` and `e2` goes to `(−sin θ, cos θ)`. Remember that `np.cos` and `np.sin` expect radians; `np.radians` converts.

`rotation(90) @ np.array([1, 0])` should give (very nearly) `[0, 1]`.

```python starter
import numpy as np

def rotation(degrees):
    return np.eye(2)

print((rotation(90) @ np.array([1, 0])).round(6))
```

```python solution
import numpy as np

def rotation(degrees):
    theta = np.radians(degrees)
    return np.array([[np.cos(theta), -np.sin(theta)],
                     [np.sin(theta),  np.cos(theta)]])

print((rotation(90) @ np.array([1, 0])).round(6))
```

```python test
import numpy as _np
assert "rotation" in dir(), "Keep the function's name as rotation."
assert _np.allclose(rotation(90) @ _np.array([1, 0]), [0, 1]), "rotation(90) should turn (1, 0) into (0, 1)."
assert _np.allclose(rotation(90) @ _np.array([0, 1]), [-1, 0]), "rotation(90) should turn (0, 1) into (-1, 0)."
assert _np.allclose(rotation(45) @ _np.array([1, 0]), [_np.sqrt(0.5), _np.sqrt(0.5)]), "rotation(45) should turn (1, 0) to point diagonally up and right."
assert _np.allclose(rotation(30) @ rotation(60), rotation(90)), "Rotating by 60 then 30 should equal rotating by 90."
assert _np.isclose(_np.linalg.norm(rotation(123) @ _np.array([3.0, 4.0])), 5), "A rotation must not change a vector's length."
assert _np.isclose(_np.linalg.det(rotation(77)), 1), "A rotation should keep areas the same (determinant 1)."
"SUCCESS: Two columns, and you can rotate anything."
```

Hint: Convert with `theta = np.radians(degrees)`, then build the matrix row by row: the first row is `[cos θ, −sin θ]` and the second `[sin θ, cos θ]`. Its columns are then exactly the two images from the lesson.
:::

::: challenge Build a matrix from where it sends e1 and e2 [medium]
The key idea of this lesson, in code. Write a function `matrix_from_images(e1_image, e2_image)` that returns the 2 by 2 matrix that sends `e1` to `e1_image` and `e2` to `e2_image`. Then write `transform(points, M)` that applies `M` to every row of a `(n, 2)` array of points at once, without a loop.

```python starter
import numpy as np

def matrix_from_images(e1_image, e2_image):
    return np.eye(2)

def transform(points, M):
    return points

M = matrix_from_images(np.array([1, 1]), np.array([-1, 2]))
print(M)
print(transform(np.array([[1, 0], [0, 1], [2, 3]]), M))
```

```python solution
import numpy as np

def matrix_from_images(e1_image, e2_image):
    return np.column_stack([e1_image, e2_image])

def transform(points, M):
    return points @ M.T

M = matrix_from_images(np.array([1, 1]), np.array([-1, 2]))
print(M)
print(transform(np.array([[1, 0], [0, 1], [2, 3]]), M))
```

```python test
import numpy as _np
import ast as _ast
assert "matrix_from_images" in dir() and "transform" in dir(), "Keep both function names."
assert not any(isinstance(_n, (_ast.For, _ast.While, _ast.ListComp)) for _n in _ast.walk(_ast.parse(_source))), "Transform all the points at once, without a loop."
_rng = _np.random.default_rng(2)
for _ in range(3):
    _a, _b = _rng.normal(size=2), _rng.normal(size=2)
    _M = matrix_from_images(_a, _b)
    assert _np.allclose(_M @ _np.array([1, 0]), _a) and _np.allclose(_M @ _np.array([0, 1]), _b), "The matrix must send e1 to e1_image and e2 to e2_image: those are its columns."
    _P = _rng.normal(size=(6, 2))
    _got = transform(_P, _M)
    assert _np.shape(_got) == (6, 2), f"transform should return one transformed point per row, shape (6, 2), got {_np.shape(_got)}."
    assert _np.allclose(_got, _np.array([_M @ _p for _p in _P])), "transform must apply M to every point (row)."
"SUCCESS: Columns are images of the basis vectors, and data times the transposed matrix transforms every row."
```

Hint: The images of `e1` and `e2` are the matrix's **columns**; `np.column_stack` puts 1D arrays side by side as columns. To transform points stored as rows, use the pattern from the lesson: points times the transposed matrix.
:::

::: challenge Order matters [medium]
Write a function `combine(first, second)` that returns the single matrix equivalent to applying the matrix `first` and **then** the matrix `second`. Then use it to set two variables:

- `shear_then_rotate`: shear by `[[1, 1], [0, 1]]` first, then rotate 90° anticlockwise, `[[0, -1], [1, 0]]`;
- `rotate_then_shear`: the same two, in the other order.

Finally print whether they are equal, using `np.allclose`.

```python starter
import numpy as np

def combine(first, second):
    return None

shear = np.array([[1, 1], [0, 1]])
rotate = np.array([[0, -1], [1, 0]])
shear_then_rotate = None
rotate_then_shear = None
```

```python solution
import numpy as np

def combine(first, second):
    return second @ first

shear = np.array([[1, 1], [0, 1]])
rotate = np.array([[0, -1], [1, 0]])
shear_then_rotate = combine(shear, rotate)
rotate_then_shear = combine(rotate, shear)
print(np.allclose(shear_then_rotate, rotate_then_shear))
```

```python test
import numpy as _np
assert "combine" in dir(), "Keep the function's name as combine."
_rng = _np.random.default_rng(4)
_A, _B, _v = _rng.normal(size=(2, 2)), _rng.normal(size=(2, 2)), _rng.normal(size=2)
_c = combine(_A, _B)
assert _c is not None, "combine should return a matrix."
assert _np.allclose(_c @ _v, _B @ (_A @ _v)), "For any vector v, combine(A, B) @ v must equal B @ (A @ v): apply A first, then B. Your matrix does something else."
_s = _np.array([[1, 1], [0, 1]])
_r = _np.array([[0, -1], [1, 0]])
_e = _np.array([1.0, 2.0])
assert shear_then_rotate is not None and _np.allclose(shear_then_rotate @ _e, _r @ (_s @ _e)), "shear_then_rotate should shear a vector first, then rotate it."
assert rotate_then_shear is not None and _np.allclose(rotate_then_shear @ _e, _s @ (_r @ _e)), "rotate_then_shear should rotate a vector first, then shear it."
assert "False" in _stdout, "Print whether the two are equal (they are not)."
"SUCCESS: The same two transformations in a different order give a different result."
```

Hint: Applying `first` and then `second` to a vector `v` is `second @ (first @ v)`. The single matrix that does both is the product with `second` on the **left**.
:::

## What you learned

- A matrix times a vector takes the dot product of each row with the vector. Equivalently, it is a weighted sum of the matrix's columns.
- The columns of a matrix are where it sends the basis vectors `e1 = (1, 0)` and `e2 = (0, 1)`, and that determines where every vector goes.
- Matrices transform the plane: scaling, rotation, shear, reflection and projection. A projection destroys information.
- Points stored as rows are transformed together with `points @ M.T`.
- `A @ B` means "apply `B`, then `A`". Order matters: in general `A @ B` is not `B @ A`.
- For `@`, shapes must fit: `(m × n) @ (n × p)` gives `(m × p)`. A dataset times a weight matrix is what a neural network layer computes.
- `np.eye(n)` is the identity; `(A @ B).T` is `B.T @ A.T`.
- The determinant is the factor by which areas change: 0 means the space is flattened and the matrix cannot be undone; a negative sign means it is flipped.

Next you will turn the question round: given where a matrix sends a vector, can you find the vector it started from? That is solving a system of linear equations, and it leads to the matrix inverse, to rank, and to the question of when a problem has exactly one answer.
