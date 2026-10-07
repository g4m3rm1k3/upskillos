# Matrices that move points

The previous lesson used a matrix to hold a system of equations. The same object has a second life that is just as important: a matrix **moves points**. Multiply every corner of a shape by a 2 × 2 matrix and the shape is rotated, stretched, flipped or sheared. Every CAD program, game engine, robot arm controller and camera calibration works this way. This lesson builds the standard transformation matrices, shows how to read any matrix from its columns, combines transformations by multiplying matrices (where order matters), adds translation with a clever third coordinate, and finds what the determinant means geometrically.

This lesson covers:

- scaling, rotation, reflection and shear as 2 × 2 matrices;
- reading a matrix from where it sends the two unit vectors;
- composing transformations by matrix multiplication, and why order matters;
- homogeneous coordinates: translation and rotation about any point;
- the determinant as an area scale factor, and inverse matrices.

## Transforming a shape

::: math
\[ R(\theta) = \begin{pmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{pmatrix}, \quad \begin{pmatrix} s_x & 0 \\ 0 & s_y \end{pmatrix}, \quad \begin{pmatrix} 1 & 0 \\ 0 & -1 \end{pmatrix}, \quad \begin{pmatrix} 1 & k \\ 0 & 1 \end{pmatrix} \]
- rotate, scale, reflect, shear; each column of $P$ is one corner $(x, y)$
- $AP$ transforms every corner at once
In code: `rotation(deg)` builds $R$; `M @ L` moves the whole letter
:::


Store a shape's corners as the **columns** of a 2 × n array P. Then A P multiplies every corner by A at once, and plotting the result shows what A does. Four basic matrices cover most needs:

\[ \text{scale } \begin{pmatrix} s_x & 0 \\ 0 & s_y \end{pmatrix}, \quad \text{rotate } \begin{pmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{pmatrix}, \quad \text{reflect in } x \text{ axis } \begin{pmatrix} 1 & 0 \\ 0 & -1 \end{pmatrix}, \quad \text{shear } \begin{pmatrix} 1 & k \\ 0 & 1 \end{pmatrix} \]

Rotation moves (x, y) to (x cos θ − y sin θ, x sin θ + y cos θ), anticlockwise by θ about the origin. Predict before running: what does the shear do to the letter L?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

L = np.array([[0, 3, 3, 1, 1, 0, 0],
              [0, 0, 1, 1, 3, 3, 0]], dtype=float)

def rotation(deg):
    t = math.radians(deg)
    return np.array([[math.cos(t), -math.sin(t)], [math.sin(t), math.cos(t)]])

transforms = {
    "scale (1.5, 0.5)": np.array([[1.5, 0], [0, 0.5]]),
    "rotate 30°": rotation(30),
    "reflect in x axis": np.array([[1, 0], [0, -1]]),
    "shear k = 0.5": np.array([[1, 0.5], [0, 1]]),
}
fig, axes = plt.subplots(1, 4, figsize=(13, 3.4))
for ax, (name, M) in zip(axes, transforms.items()):
    moved = M @ L
    ax.fill(L[0], L[1], alpha=0.25, color="grey")
    ax.fill(moved[0], moved[1], alpha=0.5)
    ax.set_title(name)
    ax.set_aspect("equal")
    ax.set_xlim(-2, 5)
    ax.set_ylim(-3.5, 4)
plt.show()
print("top corner (1, 3) after the shear:", transforms["shear k = 0.5"] @ np.array([1, 3]))
```

```output
top corner (1, 3) after the shear: [2.5 3. ]
```

The grey L is the original; the coloured one is the result. `ax.fill` draws a filled polygon through the points in order.

The shear slides each point sideways in proportion to its height: points on the x axis stay put, and the top corner (1, 3) moves to (2.5, 3), so the L leans right like a stack of cards pushed at the top. Rotation keeps sizes and angles; scaling and shear distort; reflection makes a mirror image.

## Reading a matrix from its columns

::: math
\[ A\mathbf{e}_1 = \text{column 1}, \qquad A\mathbf{e}_2 = \text{column 2}, \qquad A\begin{pmatrix} x \\ y \end{pmatrix} = x\,(\text{col } 1) + y\,(\text{col } 2) \]
- $\mathbf{e}_1 = (1, 0)$ and $\mathbf{e}_2 = (0, 1)$: the unit vectors
- the columns of a matrix are where the unit vectors land
In code: `np.column_stack([[2, 1], [1, 1]])`, then `M @ [3, -1]`
:::


Where does a matrix send the unit vectors e₁ = (1, 0) and e₂ = (0, 1)? A e₁ is A's first column and A e₂ its second. Every other point (x, y) = x e₁ + y e₂ goes to x (column 1) + y (column 2), the column view from the last lesson. So **the columns of a matrix are the images of the unit vectors**, and those two arrows determine everything the matrix does: the unit square becomes the parallelogram they span, and the whole grid of the plane follows.

This gives a way to build matrices by thinking, not memorising. A 90° anticlockwise rotation sends (1, 0) to (0, 1) and (0, 1) to (−1, 0), so its columns are those two vectors. Predict before running: what matrix sends e₁ to (2, 1) and e₂ to (1, 1), and where does it send the point (3, −1)?

```python type
R90 = np.column_stack([[0, 1], [-1, 0]])
print("rotate 90° built from columns:\n", R90, "\nformula:\n", rotation(90).round(12) + 0.0)
M = np.column_stack([[2, 1], [1, 1]])
print("M e1 =", M @ [1, 0], " M e2 =", M @ [0, 1])
print("M (3, -1) =", M @ [3, -1], "= 3 × column 1 − 1 × column 2 =", 3 * M[:, 0] - M[:, 1])
```

```output
rotate 90° built from columns:
 [[ 0 -1]
 [ 1  0]]
formula:
 [[ 0. -1.]
 [ 1.  0.]]
M e1 = [2 1]  M e2 = [1 1]
M (3, -1) = [5 2] = 3 × column 1 − 1 × column 2 = [5 2]
```

`np.column_stack` builds a matrix from the given vectors as its columns.

The matrix with columns (2, 1) and (1, 1) sends (3, −1) to 3(2, 1) − (1, 1) = (5, 2). The formula's rotation(90) has tiny rounding residues where the exact matrix has zeros, which `.round(12)` removes here. Reading columns is the quickest way to understand an unfamiliar matrix.

## Combining transformations

::: math
\[ A(B\mathbf{p}) = (AB)\,\mathbf{p}, \qquad AB \ne BA \text{ in general} \]
- "$B$ first, then $A$" is the single matrix $AB$: the first transformation sits on the right
- rotations combine by adding angles: $R(\alpha)R(\beta) = R(\alpha + \beta)$
In code: `R @ S` is scale then rotate; `S @ R` is rotate then scale
:::


Doing B first and then A sends p to A(B p). Matrix multiplication is defined so that this equals (AB) p: the product AB is the **single matrix** for "B, then A". Its columns are A applied to B's columns. Note the order: the transformation applied first is written on the **right**.

Matrix multiplication is not commutative: in general AB ≠ BA. Rotating then stretching sideways differs from stretching sideways then rotating. Predict before running: for the unit square, do "scale x by 2, then rotate 90°" and "rotate 90°, then scale x by 2" give the same shape?

```python type
S = np.array([[2, 0], [0, 1]])
R = rotation(90).round(12) + 0.0
square = np.array([[0, 1, 1, 0], [0, 0, 1, 1]], dtype=float)
print("scale then rotate, R @ S:\n", R @ S)
print("rotate then scale, S @ R:\n", S @ R)
print("corners, scale then rotate:\n", R @ S @ square)
print("corners, rotate then scale:\n", S @ R @ square)
print("rotating by 30° then 45° is rotating by 75°:", np.allclose(rotation(45) @ rotation(30), rotation(75)))
```

```output
scale then rotate, R @ S:
 [[ 0. -1.]
 [ 2.  0.]]
rotate then scale, S @ R:
 [[ 0. -2.]
 [ 1.  0.]]
corners, scale then rotate:
 [[ 0.  0. -1. -1.]
 [ 0.  2.  2.  0.]]
corners, rotate then scale:
 [[ 0.  0. -2. -2.]
 [ 0.  1.  1.  0.]]
rotating by 30° then 45° is rotating by 75°: True
```

`R @ S @ square` evaluates left to right as `(R @ S) @ square`, which equals R applied to (S applied to the square).

Scaling first stretches the square to 2 wide and 1 tall, and rotating stands it up: 1 wide and 2 tall. Rotating first and then stretching x widens the already rotated square: 2 wide and 1 tall. Different matrices, different shapes. Rotations about the same point do commute with each other, and their angles add: rotating by 30° then by 45° is rotating by 75°. That fact contains the angle-addition formulas of trigonometry.

## Translation and homogeneous coordinates

::: math
\[ \begin{pmatrix} x' \\ y' \\ 1 \end{pmatrix} = \begin{pmatrix} 1 & 0 & d_x \\ 0 & 1 & d_y \\ 0 & 0 & 1 \end{pmatrix} \begin{pmatrix} x \\ y \\ 1 \end{pmatrix}, \qquad \text{rotate about } \mathbf{c}: \; T(\mathbf{c})\,R\,T(-\mathbf{c}) \]
- homogeneous coordinates add a third entry 1 so that translation becomes a matrix
- the 2 × 2 transformation sits in the top-left corner
In code: `translate(dx, dy)` and `rotate_h(deg)`, combined with `@`
:::


Moving every point by a fixed offset, a **translation**, is the most common transformation of all, but no 2 × 2 matrix can do it: A times the origin is always the origin. The standard fix is **homogeneous coordinates**: write the point (x, y) as (x, y, 1) and use 3 × 3 matrices. A translation by (d_x, d_y) becomes

\[ T = \begin{pmatrix} 1 & 0 & d_x \\ 0 & 1 & d_y \\ 0 & 0 & 1 \end{pmatrix} \]

and the 2 × 2 transformations sit in the top-left corner. Now every move is a matrix, and any sequence of moves combines into one matrix by multiplication. Rotating about a point c instead of the origin is "translate c to the origin, rotate, translate back": T(c) R T(−c). Predict before running: rotating a part 90° about its own corner at (2, 1), where does the corner (3, 1) go?

```python type
def translate(dx, dy):
    return np.array([[1, 0, dx], [0, 1, dy], [0, 0, 1]], dtype=float)

def rotate_h(deg):
    H = np.eye(3)
    H[:2, :2] = rotation(deg)
    return H

about = translate(2, 1) @ rotate_h(90) @ translate(-2, -1)
corner = np.array([3, 1, 1])
print("(3, 1) rotated 90° about (2, 1):", (about @ corner).round(12)[:2] + 0.0)
print("the pivot (2, 1) stays put:", (about @ [2, 1, 1]).round(12)[:2] + 0.0)
print("combined matrix:\n", about.round(12) + 0.0)
```

```output
(3, 1) rotated 90° about (2, 1): [2. 2.]
the pivot (2, 1) stays put: [2. 1.]
combined matrix:
 [[ 0. -1.  3.]
 [ 1.  0. -1.]
 [ 0.  0.  1.]]
```

Read `translate(2, 1) @ rotate_h(90) @ translate(-2, -1)` from right to left: first move the pivot to the origin, then rotate, then move back.

The corner (3, 1), one unit to the right of the pivot, swings to (2, 2), one unit above it, and the pivot itself does not move. The three steps collapse into one 3 × 3 matrix whose last column, (3, −1), holds the combined translation. Graphics libraries, CAD kernels and robot kinematics store every pose as such a matrix (in 3D, 4 × 4).

## Areas, determinants and inverses

::: math
\[ \det\begin{pmatrix} a & b \\ c & d \end{pmatrix} = ad - bc, \qquad \begin{pmatrix} a & b \\ c & d \end{pmatrix}^{-1} = \frac{1}{ad - bc}\begin{pmatrix} d & -b \\ -c & a \end{pmatrix} \]
- every area is multiplied by $|\det A|$; a negative determinant flips orientation
- shoelace area: $\tfrac{1}{2}\sum_i (x_i y_{i+1} - x_{i+1} y_i)$
In code: `shoelace(M @ L)` against `np.linalg.det(M)` times the original area
:::


A 2 × 2 matrix turns the unit square into the parallelogram spanned by its columns, and every shape's area is multiplied by the same factor: the **absolute value of the determinant** ad − bc. A **negative** determinant means the transformation also flips orientation (a mirror image, the L turned backwards). A determinant of zero squashes the plane onto a line, which cannot be undone.

When det ≠ 0 the transformation can be reversed by the **inverse matrix** A⁻¹, with A⁻¹A = I, the identity. For 2 × 2 it has a formula:

\[ \begin{pmatrix} a & b \\ c & d \end{pmatrix}^{-1} = \frac{1}{ad - bc} \begin{pmatrix} d & -b \\ -c & a \end{pmatrix} \]

Predict before running: the L has area 5. What are its areas after each of the four transformations?

```python type
def shoelace(P):
    x, y = P[0], P[1]
    return 0.5 * (np.dot(x[:-1], y[1:]) - np.dot(x[1:], y[:-1]))

print(f"original L: signed area {shoelace(L):.3f}")
for name, M in transforms.items():
    print(f"{name:<18} det {np.linalg.det(M):+.3f}   area after {shoelace(M @ L):+.3f}")
A = np.array([[2.0, 1], [1, 1]])
Ainv = np.array([[1, -1], [-1, 2]]) / (2 * 1 - 1 * 1)
print("A⁻¹ by formula:\n", Ainv, "\nA⁻¹ A:\n", Ainv @ A, "\nmatches np.linalg.inv:", np.allclose(Ainv, np.linalg.inv(A)))
```

```output
original L: signed area 5.000
scale (1.5, 0.5)   det +0.750   area after +3.750
rotate 30°         det +1.000   area after +5.000
reflect in x axis  det -1.000   area after -5.000
shear k = 0.5      det +1.000   area after +5.000
A⁻¹ by formula:
 [[ 1. -1.]
 [-1.  2.]]
A⁻¹ A:
 [[1. 0.]
 [0. 1.]]
matches np.linalg.inv: True
```

The **shoelace formula** gives the area of a polygon from its corners listed in order, positive when they run anticlockwise and negative when clockwise; the L's corners repeat the first point at the end, as the formula needs.

The scale multiplies the area by 0.75 (1.5 × 0.5), rotation and shear keep it at 5 (determinant 1), and the reflection keeps the size but flips the sign: −5, a mirror image. Each area is exactly the original times the determinant. The inverse of the matrix with columns (2, 1) and (1, 1) is (1, −1; −1, 2), and multiplying gives the identity.

## The same moves in OpenMAT

::: math
\[ \det(RS) = \det R \cdot \det S = 1 \times 2 = 2 \]
- $RS$ and $SR$ differ as matrices but share a determinant
- `cosd` and `sind` take degrees
In code: `R * S` and `S * R` (in OpenMAT `*` is the matrix product), then `det`
:::


MATLAB-style notation keeps transformation code very compact: `cosd` and `sind` take degrees, `*` is the matrix product, and `P(1, :)` takes the first row (all x coordinates). This cell composes a scaling and a rotation both ways round and plots the unit square. Predict before running: which product has determinant 2?

```openmat
R = [cosd(90) -sind(90); sind(90) cosd(90)];
S = [2 0; 0 1];
square = [0 1 1 0 0; 0 0 1 1 0];
scale_then_rotate = R * S
rotate_then_scale = S * R
d1 = det(scale_then_rotate)
d2 = det(rotate_then_scale)
moved = scale_then_rotate * square;
plot(moved(1, :), moved(2, :))
```

The square's first corner is repeated at the end so the plotted outline closes.

The two products differ, matching the Python result, but both have determinant 2: either way, the area doubles, because determinants multiply, det(AB) = det(A) det(B), whatever the order. The plot shows the square after scaling then rotating, now 1 wide and 2 tall.

::: challenge Building transformations [easy]
Write `rotation(deg)` (anticlockwise, about the origin), `scaling(sx, sy)` and `shear(k)` (horizontal shear, as in the lesson), each returning a 2 × 2 NumPy array; round every entry of `rotation` to 12 decimal places and add `0.0` so that exact angles give exact zeros. Then write `apply(M, points)`, which takes points as an **N × 2** array or list (one point per row, the way they are usually stored) and returns the transformed points as an N × 2 NumPy array.

```python starter
def rotation(deg):
    return np.eye(2)

def scaling(sx, sy):
    return np.eye(2)

def shear(k):
    return np.eye(2)

def apply(M, points):
    return np.asarray(points, dtype=float)

print(apply(rotation(90), [[1, 0], [0, 1]]))
```

```python solution
def rotation(deg):
    t = math.radians(deg)
    return np.round(np.array([[math.cos(t), -math.sin(t)], [math.sin(t), math.cos(t)]]), 12) + 0.0

def scaling(sx, sy):
    return np.array([[sx, 0.0], [0.0, sy]])

def shear(k):
    return np.array([[1.0, k], [0.0, 1.0]])

def apply(M, points):
    P = np.asarray(points, dtype=float)
    return (np.asarray(M) @ P.T).T

print(apply(rotation(90), [[1, 0], [0, 1]]))
```

```python test
for _n in ["rotation", "scaling", "shear", "apply"]:
    assert _n in dir(), f"Define {_n}."
assert np.array_equal(rotation(90), [[0, -1], [1, 0]]) and np.array_equal(rotation(180), [[-1, 0], [0, -1]]), "Exact rotations."
assert np.allclose(rotation(30), [[math.sqrt(3) / 2, -0.5], [0.5, math.sqrt(3) / 2]]), "30° anticlockwise."
_pts = np.array([[1, 0], [0, 1], [3, 3]])
_out = apply(rotation(90), _pts)
assert isinstance(_out, np.ndarray) and _out.shape == (3, 2) and np.allclose(_out, [[0, 1], [-1, 0], [-3, 3]]), f"Points are rows; got {_out}."
assert np.allclose(apply(scaling(2, 3), [[1, 1], [-1, 2]]), [[2, 3], [-2, 6]]), "Scaling, with a list of points."
assert np.allclose(apply(shear(0.5), [[3, 3], [4, 0]]), [[4.5, 3], [4, 0]]), "Shear slides points sideways by k × y."
assert np.allclose(apply(rotation(45), apply(rotation(45), _pts)), apply(rotation(90), _pts)), "Two 45° rotations make 90°."
"SUCCESS: Four matrices and one multiplication cover rotating, stretching and leaning any set of points."
```

Hint: With points as rows (N × 2), transpose to columns, multiply, and transpose back: `(M @ P.T).T`, which is the same as `P @ M.T`.
:::

::: challenge Moves in homogeneous coordinates [medium]
Write `translate(dx, dy)`, `rotate_about(deg, cx, cy)` (anticlockwise by `deg` about the point (cx, cy)) and `scale_about(s, cx, cy)` (uniform scaling by s about (cx, cy)), each returning a 3 × 3 NumPy array in homogeneous coordinates. Round the entries of `rotate_about` to 12 decimal places and add `0.0`. Then write `transform(H, points)`, which applies a 3 × 3 matrix to an N × 2 array (or list) of points and returns N × 2, and `compose(*matrices)`, which returns the single matrix for applying the given matrices **in the order listed** (the first argument is applied first). `compose()` with no arguments returns the 3 × 3 identity.

```python starter
def translate(dx, dy):
    return np.eye(3)

def rotate_about(deg, cx, cy):
    return np.eye(3)

def scale_about(s, cx, cy):
    return np.eye(3)

def transform(H, points):
    return np.asarray(points, dtype=float)

def compose(*matrices):
    return np.eye(3)

print(transform(rotate_about(90, 2, 1), [[3, 1]]))
```

```python solution
def translate(dx, dy):
    return np.array([[1.0, 0, dx], [0, 1, dy], [0, 0, 1]])

def rotate_about(deg, cx, cy):
    t = math.radians(deg)
    R = np.array([[math.cos(t), -math.sin(t), 0], [math.sin(t), math.cos(t), 0], [0, 0, 1]])
    return np.round(translate(cx, cy) @ R @ translate(-cx, -cy), 12) + 0.0

def scale_about(s, cx, cy):
    S = np.diag([s, s, 1.0])
    return translate(cx, cy) @ S @ translate(-cx, -cy)

def transform(H, points):
    P = np.asarray(points, dtype=float)
    homog = np.column_stack([P, np.ones(len(P))])
    return (homog @ np.asarray(H, dtype=float).T)[:, :2]

def compose(*matrices):
    out = np.eye(3)
    for M in matrices:
        out = np.asarray(M, dtype=float) @ out
    return out

print(transform(rotate_about(90, 2, 1), [[3, 1]]))
```

```python test
for _n in ["translate", "rotate_about", "scale_about", "transform", "compose"]:
    assert _n in dir(), f"Define {_n}."
assert np.allclose(transform(translate(5, -2), [[0, 0], [1, 1]]), [[5, -2], [6, -1]]), "Translation."
assert np.allclose(transform(rotate_about(90, 2, 1), [[3, 1], [2, 1]]), [[2, 2], [2, 1]]), "The lesson's rotation about (2, 1); the pivot stays."
assert np.array_equal(rotate_about(90, 2, 1)[:, 2], [3, -1, 1]), "The combined translation column."
assert np.allclose(transform(scale_about(2, 1, 1), [[1, 1], [2, 1], [1, 3]]), [[1, 1], [3, 1], [1, 5]]), "Scaling about (1, 1)."
_t = transform(rotate_about(90, 0, 0), [[1, 0]])
assert isinstance(_t, np.ndarray) and _t.shape == (1, 2), "transform returns an N × 2 array."
assert np.allclose(compose(translate(1, 0), rotate_about(90, 0, 0)) @ [0, 0, 1], [0, 1, 1]), "First translate, then rotate: (0, 0) -> (1, 0) -> (0, 1)."
assert np.allclose(compose(rotate_about(90, 0, 0), translate(1, 0)) @ [0, 0, 1], [1, 0, 1]), "First rotate (no effect on the origin), then translate."
assert np.array_equal(compose(), np.eye(3)), "No matrices: the identity."
_H = compose(rotate_about(30, 4, 2), scale_about(0.5, 0, 0), translate(3, 3))
_p = np.array([[1.0, 2.0], [-3.0, 0.5]])
_step = transform(translate(3, 3), transform(scale_about(0.5, 0, 0), transform(rotate_about(30, 4, 2), _p)))
assert np.allclose(transform(_H, _p), _step), "compose must equal applying the matrices one after another."
"SUCCESS: With a third coordinate, translations become matrices too, and any sequence of moves collapses into one product."
```

Hint: Rotation about c is `translate(cx, cy) @ R @ translate(-cx, -cy)`. In `transform`, append a column of ones to the points before multiplying. In `compose`, each later matrix multiplies on the **left** of the running product.
:::

::: challenge Recovering a transformation [hard]
A camera inspects a part carrying three reference marks whose CAD positions are known. Their measured image positions are related to the CAD ones by an **affine** map (any 2 × 2 matrix plus a translation): u = a x + b y + e, v = c x + d y + f. Write `fit_affine(src, dst)`, where `src` and `dst` are three corresponding points each, returning the 3 × 3 homogeneous matrix [[a, b, e], [c, d, f], [0, 0, 1]]. Each point pair gives two linear equations, so three pairs give six equations in six unknowns; set them up as a 6 × 6 system and solve it with `np.linalg.solve`. Raise `ValueError` if there are not exactly three points in each, or if the three source points are collinear (then the system is singular; test this with the shoelace area of the triangle, below 1e-9). Then write `area_scale(H)`, the factor by which the map scales areas (never negative, as a plain float), and `is_mirrored(H)`, True when it flips orientation, as a plain `bool`; both use the 2 × 2 part of H.

```python starter
def fit_affine(src, dst):
    return np.eye(3)

def area_scale(H):
    return 1.0

def is_mirrored(H):
    return False

src = [[0, 0], [100, 0], [0, 50]]
dst = [[10, 20], [208, 37], [-15, 120]]
print(fit_affine(src, dst).round(3))
```

```python solution
def fit_affine(src, dst):
    src, dst = np.asarray(src, dtype=float), np.asarray(dst, dtype=float)
    if src.shape != (3, 2) or dst.shape != (3, 2):
        raise ValueError("need exactly three source and three destination points")
    (x1, y1), (x2, y2), (x3, y3) = src
    if abs((x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1)) / 2 < 1e-9:
        raise ValueError("the source points are collinear")
    M = np.zeros((6, 6))
    rhs = np.zeros(6)
    for i, ((x, y), (u, v)) in enumerate(zip(src, dst)):
        M[2 * i] = [x, y, 1, 0, 0, 0]
        M[2 * i + 1] = [0, 0, 0, x, y, 1]
        rhs[2 * i], rhs[2 * i + 1] = u, v
    a, b, e, c, d, f = np.linalg.solve(M, rhs)
    return np.array([[a, b, e], [c, d, f], [0, 0, 1]])

def area_scale(H):
    return float(abs(np.linalg.det(np.asarray(H)[:2, :2])))

def is_mirrored(H):
    return bool(np.linalg.det(np.asarray(H)[:2, :2]) < 0)

src = [[0, 0], [100, 0], [0, 50]]
dst = [[10, 20], [208, 37], [-15, 120]]
print(fit_affine(src, dst).round(3))
```

```python test
for _n in ["fit_affine", "area_scale", "is_mirrored"]:
    assert _n in dir(), f"Define {_n}."
_src = [[0, 0], [100, 0], [0, 50]]
_dst = [[10, 20], [208, 37], [-15, 120]]
_H = fit_affine(_src, _dst)
assert np.allclose(_H, [[1.98, -0.5, 10], [0.17, 2.0, 20], [0, 0, 1]]), f"Got {np.round(_H, 4)}."
_mapped = (np.column_stack([np.array(_src, float), np.ones(3)]) @ _H.T)[:, :2]
assert np.allclose(_mapped, _dst), "The fitted map must send each source point to its destination."
_rng = np.random.default_rng(43)
for _ in range(20):
    _A = np.eye(3); _A[:2, :2] = _rng.normal(size=(2, 2)); _A[:2, 2] = _rng.normal(size=2) * 10
    _s = _rng.normal(size=(3, 2)) * 50
    _d = (np.column_stack([_s, np.ones(3)]) @ _A.T)[:, :2]
    assert np.allclose(fit_affine(_s, _d), _A, atol=1e-7), "Random affine maps must be recovered."
for _bad in [([[0, 0], [1, 1], [2, 2]], _dst), ([[0, 0], [1, 0]], [[0, 0], [1, 0]]), (_src, _dst[:2])]:
    try:
        fit_affine(*_bad)
        assert False, "Collinear points or the wrong number of points should raise ValueError."
    except ValueError:
        pass
assert abs(area_scale(_H) - (1.98 * 2.0 + 0.5 * 0.17)) < 1e-9, "Area scale is |det| of the 2 × 2 part."
assert is_mirrored(_H) is False and is_mirrored(np.diag([1.0, -1.0, 1.0])) is True, "Mirroring means a negative determinant."
assert type(area_scale(_H)) is float, "Return a plain float."
assert abs(area_scale(np.diag([2.0, -3.0, 1.0])) - 6.0) < 1e-12, "An area scale is never negative: use the absolute value of the determinant."
"SUCCESS: Three reference marks give six equations for the six numbers of an affine map: the core of camera and fixture calibration."
```

Hint: For a pair (x, y) → (u, v), the equations are a x + b y + e = u and c x + d y + f = v; in terms of the unknowns (a, b, e, c, d, f) their coefficient rows are [x, y, 1, 0, 0, 0] and [0, 0, 0, x, y, 1]. Stack all six rows into a matrix and solve.
:::

## What you learned

- A 2 × 2 matrix transforms points: scaling, rotation, reflection and shear each have a standard matrix, applied to every corner at once with `M @ P`.
- A matrix's columns are the images of the unit vectors, which is the quickest way to build or read one.
- AB means "B first, then A"; matrix multiplication is not commutative, though rotations about one point are, with angles adding.
- Homogeneous coordinates (x, y, 1) turn translations into 3 × 3 matrices, so rotation about any point is T(c) R T(−c), and any sequence of moves is one matrix.
- |det A| is the area scale factor, a negative determinant means a mirror image, det(AB) = det(A) det(B), and A⁻¹ undoes A when det A ≠ 0.

The next lesson returns to rates of change and makes the instantaneous rate precise: the derivative.
