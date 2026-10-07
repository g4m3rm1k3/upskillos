# Eigenvectors and SVD

When a matrix transforms the plane, most vectors are knocked off their direction: they come out pointing somewhere new. But a matrix usually has a few special directions that it does **not** turn. Vectors along those directions come out pointing the same way (or exactly the opposite way), only stretched or shrunk. Those directions are the matrix's **eigenvectors**, and they reveal what the matrix really does, stripped of the arbitrary choice of x and y axes.

This lesson finds eigenvectors, shows why repeatedly applying a matrix pulls every vector towards one of them, and then introduces the **singular value decomposition** (SVD), which describes **any** matrix as a rotation, a stretch along perpendicular axes, and another rotation. The SVD is the engine behind principal component analysis, recommendation systems and image compression, and the lesson ends by compressing images of handwritten digits with it.

## Directions a matrix only stretches

A vector `v` (not the zero vector) is an **eigenvector** of a square matrix `A` if multiplying by `A` only scales it:

\[
A v = \lambda v
\]

The number λ (the Greek letter lambda) is the matching **eigenvalue**: the factor by which `A` stretches that direction. ("Eigen" is German for "own": these are the matrix's own directions.) An eigenvalue of 2 means that direction is doubled; 0.5 means it is halved; -1 means it is flipped round.

Here is a matrix applied to vectors pointing in many directions around a circle. Predict first: will the circle stay a circle?

```python type
import numpy as np
import matplotlib.pyplot as plt

A = np.array([[3.0, 1.0],
              [1.0, 2.0]])
angles = np.linspace(0, 2 * np.pi, 200)
circle = np.column_stack([np.cos(angles), np.sin(angles)])
moved = circle @ A.T
values, vectors = np.linalg.eig(A)

fig, ax = plt.subplots(figsize=(5, 5))
ax.plot(circle[:, 0], circle[:, 1], color="lightgray", lw=2, label="unit circle")
ax.plot(moved[:, 0], moved[:, 1], color="tab:blue", lw=2, label="after A")
test = np.array([1.0, 0.0])
ax.annotate("", xy=test, xytext=(0, 0), arrowprops=dict(arrowstyle="->", color="gray", lw=2))
ax.annotate("", xy=A @ test, xytext=(0, 0), arrowprops=dict(arrowstyle="->", color="black", lw=2))
for value, vector in zip(values, vectors.T):
    ax.annotate("", xy=vector, xytext=(0, 0), arrowprops=dict(arrowstyle="->", color="tab:orange", lw=2))
    ax.annotate("", xy=value * vector, xytext=(0, 0), arrowprops=dict(arrowstyle="->", color="tab:red", lw=1.5, ls="--"))
ax.set_xlim(-4, 4)
ax.set_ylim(-4, 4)
ax.set_aspect("equal")
ax.legend(loc="lower right", fontsize=8)
ax.set_title("orange: eigenvectors, red dashed: after A")
plt.show()
print("eigenvalues:", values.round(3))
```

```output
eigenvalues: [3.618 1.382]
```

The circle becomes an ellipse. The grey arrow `(1, 0)` is knocked off its direction: its image, in black, points somewhere new. But each orange eigenvector's image, the red dashed arrow, lies along the **same line**, only longer: those are the eigenvector directions, and the eigenvalues say how much each is stretched, about 3.6 along one and 1.4 along the other. Notice that the two eigenvector directions are the long and short axes of the ellipse.

`np.linalg.eig(A)` returns the eigenvalues and a matrix whose **columns** are the eigenvectors (that is why the loop uses `vectors.T`, to go through the columns). Each eigenvector is scaled to length 1, since any multiple of an eigenvector is also an eigenvector: only the direction matters.

Check the definition directly:

```python type
import numpy as np

A = np.array([[3.0, 1.0],
              [1.0, 2.0]])
values, vectors = np.linalg.eig(A)
v = vectors[:, 0]
print("A @ v      =", A @ v)
print("lambda * v =", values[0] * v)
```

```output
A @ v      = [3.07768354 1.90211303]
lambda * v = [3.07768354 1.90211303]
```

The two lines match: `A` acting on `v` is the same as multiplying `v` by the number λ.

## Why eigenvectors matter: repeated application

The real importance of eigenvectors shows when a matrix is applied **over and over**, as happens whenever something evolves step by step. Take any starting vector and keep multiplying it by `A`, rescaling to length 1 each time so the numbers do not grow out of control:

```python type
import numpy as np

A = np.array([[3.0, 1.0],
              [1.0, 2.0]])
v = np.array([1.0, -1.0])
for step in range(8):
    v = A @ v
    v = v / np.linalg.norm(v)
    print(step, v.round(4))
values, vectors = np.linalg.eig(A)
print("eigenvector with the largest eigenvalue:", vectors[:, np.argmax(values)].round(4))
```

```output
0 [ 0.8944 -0.4472]
1 [1. 0.]
2 [0.9487 0.3162]
3 [0.8944 0.4472]
4 [0.8682 0.4961]
5 [0.8575 0.5145]
6 [0.8533 0.5215]
7 [0.8517 0.5241]
eigenvector with the largest eigenvalue: [0.8507 0.5257]
```

Whatever direction you start from, repeated multiplication swings the vector round to the eigenvector with the **largest** eigenvalue. (There is one exception: a start pointing exactly along the other eigenvector never leaves it. With real numbers that essentially never happens.) The reason: any starting vector is a mix of the two eigenvectors, and each multiplication scales the first part by about 3.6 but the second part by only 1.4. After a few steps, the first part dominates completely. This procedure is called **power iteration**, and it is how the eigenvector of enormous matrices is found in practice. It is also the core of Google's original PageRank algorithm, which found the most important web pages as the dominant eigenvector of a matrix describing the links between billions of pages.

A small example of the same idea. Suppose tomorrow's weather depends only on today's: after a sunny day there is a 90% chance of sun, after a rainy day a 50% chance. Where does the chance of sun settle in the long run?

```python type
import numpy as np

# Column j: today's weather j -> tomorrow's probabilities (sun, rain).
P = np.array([[0.9, 0.5],
              [0.1, 0.5]])
today = np.array([0.0, 1.0])
for day in range(1, 11):
    today = P @ today
print("after 10 days:", today.round(4))

values, vectors = np.linalg.eig(P)
steady = vectors[:, np.argmax(values)]
print("eigenvalue:", values.max().round(4), " steady state:", (steady / steady.sum()).round(4))
```

```output
after 10 days: [0.8332 0.1668]
eigenvalue: 1.0  steady state: [0.8333 0.1667]
```

Starting from a certainly rainy day, the probabilities settle at about 83% sun, 17% rain, and stay there. That long-run distribution is an eigenvector with eigenvalue exactly 1: applying `P` to it leaves it unchanged. (It is rescaled to add up to 1 so that it reads as probabilities.) A system like this, where the next state depends only on the current one, is called a **Markov chain**, and you will meet it again in reinforcement learning.

## Symmetric matrices are especially nice

Not every matrix has real eigenvectors. A rotation turns **every** direction, so none is left pointing the same way; NumPy reports its eigenvalues as complex numbers, which describe the turning. But one important family always behaves perfectly. A matrix is **symmetric** if it equals its own transpose, `A == A.T`, a mirror image across its main diagonal. The matrix `[[3, 1], [1, 2]]` above is symmetric.

A symmetric matrix always has real eigenvalues, and its eigenvectors are **orthogonal**: at right angles to each other, like the axes of the ellipse. For symmetric matrices, use `np.linalg.eigh`, which is faster and returns the eigenvalues sorted from smallest to largest:

```python type
import numpy as np

S = np.array([[4.0, 2.0, 0.0],
              [2.0, 3.0, 1.0],
              [0.0, 1.0, 2.0]])
values, vectors = np.linalg.eigh(S)
print(values.round(3))
print((vectors.T @ vectors).round(10))
```

```output
[0.855 2.476 5.669]
[[ 1.  0. -0.]
 [ 0.  1. -0.]
 [-0. -0.  1.]]
```

`vectors.T @ vectors` computes every eigenvector's dot product with every other. The result is the identity matrix: each has length 1, and every pair has dot product 0, so they are orthogonal. Symmetric matrices appear all over machine learning, because the table of how every pair of features varies together, which you will build in the statistics lessons, is always symmetric. Its eigenvectors are the directions in which the data is most spread out, which is the idea behind principal component analysis.

## The singular value decomposition

Eigenvectors only exist for square matrices, and even then not always real ones. The **singular value decomposition** works for **every** matrix, of any shape, and it says:

\[
A = U \Sigma V^T
\]

Every matrix does three simple things in turn: a rotation (`Vᵀ`), then a stretch along perpendicular axes (`Σ`, a diagonal matrix of non-negative numbers called the **singular values**), then another rotation (`U`). Either rotation may also include a flip, a mirror image, which does not change the picture much: they still turn the plane without stretching it. In two dimensions this means **every** matrix turns the unit circle into an ellipse, and the singular values are the lengths of the ellipse's two half-axes.

```python type
import numpy as np

A = np.array([[2.0, 1.0],
              [0.5, 1.5]])
U, s, Vt = np.linalg.svd(A)
print("singular values:", s.round(4))
print("U:\n", U.round(4))
print("Vt:\n", Vt.round(4))
print("rebuilt:\n", (U @ np.diag(s) @ Vt).round(10))
```

```output
singular values: [2.5583 0.9772]
U:
 [[-0.8507 -0.5257]
 [-0.5257  0.8507]]
Vt:
 [[-0.7678 -0.6407]
 [-0.6407  0.7678]]
rebuilt:
 [[2.  1. ]
 [0.5 1.5]]
```

`np.linalg.svd` returns `U`, the singular values `s` as a 1D array (largest first), and `Vᵀ` directly. `np.diag(s)` turns them into the diagonal matrix `Σ`. The numbers inside `U` and `Vt` are not very meaningful to read by eye (their signs can even come out either way), but each has columns (or rows) of length 1 at right angles to each other, which is what makes it a rotation. The part to look at is the singular values, and the check that multiplying the three back together rebuilds `A` exactly.

The singular values rank the directions by importance: how much the matrix stretches each one. That ranking is what makes the SVD so useful, as the rest of this lesson shows.

## Keeping only the important part

Write the SVD out as a sum. Each singular value `sᵢ` pairs one column of `U` with one row of `Vᵀ`, and `A` is the sum of those pieces:

\[
A = s_1 u_1 v_1^T + s_2 u_2 v_2^T + \dots
\]

Each piece `uᵢ vᵢᵀ` is a column times a row, called an **outer product**: a whole matrix in which every entry is one number from the column times one number from the row. Every row of it is a multiple of the same row:

```python type
import numpy as np

u = np.array([1, 2, 3])
v = np.array([10, 20])
print(np.outer(u, v))
```

```output
[[10 20]
 [20 40]
 [30 60]]
```

The singular values say how much each piece contributes. Keeping only the first `k` pieces, the ones with the largest singular values, gives the best possible approximation of `A` built from `k` pieces, "best" meaning that the sum of the squared differences between the approximation and `A` is as small as it can be. This is called a **rank-k approximation**, because a sum of `k` such pieces has rank `k`.

Here it is on a synthetic 60 by 60 greyscale image, made from smooth patterns plus some random speckle, as real photos have:

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(0)
y, x = np.mgrid[0:60, 0:60]
image = (np.sin(x / 7) + np.cos(y / 9) + np.sin((x + y) / 5)
         + ((x - 30) ** 2 + (y - 30) ** 2 < 150) + rng.normal(0, 0.15, (60, 60)))

U, s, Vt = np.linalg.svd(image)
fig, axes = plt.subplots(1, 4, figsize=(11, 3))
axes[0].imshow(image, cmap="gray")
axes[0].set_title(f"original (rank {np.linalg.matrix_rank(image)})")
for ax, k in zip(axes[1:], [1, 5, 15]):
    approx = U[:, :k] @ np.diag(s[:k]) @ Vt[:k]
    ax.imshow(approx, cmap="gray")
    ax.set_title(f"rank {k}")
for ax in axes:
    ax.axis("off")
plt.show()
kept = (s[:15] ** 2).sum() / (s ** 2).sum()
print(f"the first 15 of 60 pieces keep {kept:.1%} of the image")
```

```output
the first 15 of 60 pieces keep 99.2% of the image
```

`np.mgrid` builds grids of row and column coordinates, used here to draw stripes, a diagonal wave and a disc. The random speckle makes the original full rank, 60. With rank 1 you see only a vague blur; by rank 15 the picture is clearly all there, with only some of the speckle lost, yet it is stored as 15 columns of `U`, 15 rows of `Vᵀ` and 15 numbers: 1,815 numbers instead of 3,600. (How much is "kept" is measured with **squared** singular values, the same measure the digits example below uses; the statistics lessons explain why squares are the natural choice.) Real photographs behave the same way: most of their structure is concentrated in the first few singular values.

## Compressing handwritten digits

The same idea applies to a whole dataset. The 1,797 handwritten digit images from scikit-learn, each flattened into a row of 64 pixel values, form a 1,797 by 64 matrix. Its SVD finds the directions in "pixel space" along which the images vary most, and keeping only a few of them reconstructs every digit from a handful of numbers:

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_digits

X = load_digits().data
mean_image = X.mean(axis=0)
U, s, Vt = np.linalg.svd(X - mean_image, full_matrices=False)

fig, axes = plt.subplots(3, 6, figsize=(9, 4.5))
for row, k in enumerate([2, 10, 64]):
    approx = U[:, :k] @ np.diag(s[:k]) @ Vt[:k] + mean_image
    for col in range(6):
        axes[row, col].imshow(approx[col].reshape(8, 8), cmap="gray_r")
        axes[row, col].axis("off")
    axes[row, 0].set_title(f"k = {k}", loc="left", fontsize=9)
plt.show()
kept = (s[:10] ** 2).sum() / (s ** 2).sum()
print(f"10 of 64 directions keep {kept:.0%} of the variation")
```

```output
10 of 64 directions keep 74% of the variation
```

Subtracting the mean image first means the SVD describes how the digits **differ** from an average digit, which is what matters. `full_matrices=False` asks for the compact form of the SVD, without columns of `U` that would be multiplied by zero anyway. With 2 directions the digits are smudges; with 10, most are clearly readable; with all 64, the reconstruction is exact. (The share of variation uses squared singular values, for reasons the statistics lessons will explain.) Describing each image by 10 numbers instead of 64, while keeping most of what makes it distinctive, is **dimensionality reduction**, and this exact calculation is principal component analysis, which has its own lesson later.

::: challenge Is it an eigenvector? [easy]
Write a function `eigen_check(A, v)` that returns a tuple `(is_eigen, value)`:

- `is_eigen` is `True` if `A @ v` points along `v` (a multiple of it), and `False` otherwise;
- `value` is the eigenvalue if it is, and `None` if not.

Find the candidate eigenvalue as `λ = (v · Av) / (v · v)`, then check with `np.allclose` whether `A @ v` really equals `λ v`. You can assume `v` is not the zero vector.

```python starter
import numpy as np

def eigen_check(A, v):
    return False, None

A = np.array([[2.0, 1.0], [1.0, 2.0]])
print(eigen_check(A, np.array([1.0, 1.0])))
print(eigen_check(A, np.array([1.0, 0.0])))
```

```python solution
import numpy as np

def eigen_check(A, v):
    Av = A @ v
    value = (v @ Av) / (v @ v)
    if np.allclose(Av, value * v):
        return True, float(value)
    return False, None

A = np.array([[2.0, 1.0], [1.0, 2.0]])
print(eigen_check(A, np.array([1.0, 1.0])))
print(eigen_check(A, np.array([1.0, 0.0])))
```

```python test
import numpy as _np
assert "eigen_check" in dir(), "Keep the function's name as eigen_check."
_A = _np.array([[2.0, 1.0], [1.0, 2.0]])
_r = eigen_check(_A, _np.array([1.0, 1.0]))
assert bool(_r[0]) and _np.isclose(_r[1], 3), f"(1, 1) is an eigenvector of this matrix with eigenvalue 3, but eigen_check returned {_r}."
_r = eigen_check(_A, _np.array([1.0, -1.0]))
assert bool(_r[0]) and _np.isclose(_r[1], 1), f"(1, -1) is an eigenvector with eigenvalue 1, but eigen_check returned {_r}."
_r = eigen_check(_A, _np.array([1.0, 0.0]))
assert not bool(_r[0]) and _r[1] is None, f"(1, 0) is not an eigenvector of this matrix, so eigen_check should return (False, None), but returned {_r}."
_B = _np.array([[0.0, -1.0], [1.0, 0.0]])
assert not bool(eigen_check(_B, _np.array([1.0, 2.0]))[0]), "A rotation by 90 degrees has no real eigenvectors."
_C = _np.array([[4.0, 0, 0], [0, -2.0, 0], [0, 0, 1.0]])
_r = eigen_check(_C, _np.array([0.0, 5.0, 0.0]))
assert bool(_r[0]) and _np.isclose(_r[1], -2), f"(0, 5, 0) is an eigenvector of that diagonal matrix with eigenvalue -2, but eigen_check returned {_r}."
"SUCCESS: You can recognise an eigenvector by what the matrix does to it."
```

Hint: Compute `Av = A @ v` once. The candidate λ is a ratio of two dot products. If `np.allclose(Av, λ * v)`, it is an eigenvector.
:::

::: challenge Power iteration [easy]
Write a function `dominant_eigenvector(A, steps=100)` that finds the eigenvector of a symmetric matrix `A` with the largest eigenvalue, by power iteration: start from `np.ones(len(A))`, and on every step multiply by `A` and rescale to length 1. Return a tuple `(vector, value)`, where `value` is the eigenvalue, computed at the end as `v · Av` (for a unit vector, that is λ).

Do not use `np.linalg.eig` or `eigh` inside your function; the check compares your answer with them.

```python starter
import numpy as np

def dominant_eigenvector(A, steps=100):
    v = np.ones(len(A))
    return v, 0.0

S = np.array([[4.0, 2.0, 0.0], [2.0, 3.0, 1.0], [0.0, 1.0, 2.0]])
print(dominant_eigenvector(S))
```

```python solution
import numpy as np

def dominant_eigenvector(A, steps=100):
    v = np.ones(len(A))
    for _ in range(steps):
        v = A @ v
        v = v / np.linalg.norm(v)
    return v, float(v @ A @ v)

S = np.array([[4.0, 2.0, 0.0], [2.0, 3.0, 1.0], [0.0, 1.0, 2.0]])
print(dominant_eigenvector(S))
```

```python test
import numpy as _np
assert "dominant_eigenvector" in dir(), "Keep the function's name as dominant_eigenvector."
assert "linalg.eig" not in _source and "import eig" not in _source, "Find it by power iteration, without np.linalg.eig or eigh."
for _S in [_np.array([[4.0, 2.0, 0.0], [2.0, 3.0, 1.0], [0.0, 1.0, 2.0]]), _np.array([[2.0, 1.0], [1.0, 2.0]])]:
    _vals, _vecs = _np.linalg.eigh(_S)
    _want_v, _want_l = _vecs[:, -1], _vals[-1]
    _v, _l = dominant_eigenvector(_S)
    assert _np.isclose(_np.linalg.norm(_v), 1), "Return a vector of length 1."
    assert _np.isclose(abs(_v @ _want_v), 1, atol=1e-6), f"The vector should point along the dominant eigenvector {_want_v.round(4)} (or exactly opposite), but got {_np.round(_v, 4)}."
    assert _np.isclose(_l, _want_l, atol=1e-6), f"The dominant eigenvalue is {_want_l:.4f}, but you returned {_l}."
"SUCCESS: Repeated multiplication found the matrix's most important direction."
```

Hint: Loop `steps` times: `v = A @ v`, then divide `v` by its norm. After the loop, `v @ A @ v` gives the eigenvalue.
:::

::: challenge Best rank-k approximation [medium]
Write a function `rank_k(M, k)` that returns the best rank-`k` approximation of any matrix `M`, using `np.linalg.svd(M, full_matrices=False)` and keeping the first `k` singular values. Then write `kept_energy(M, k)`, returning the fraction of the sum of **squared** singular values that the first `k` account for, a common way to decide how many to keep.

```python starter
import numpy as np

def rank_k(M, k):
    return M

def kept_energy(M, k):
    return 1.0

rng = np.random.default_rng(0)
M = rng.normal(size=(6, 4))
print(np.linalg.matrix_rank(rank_k(M, 2)), round(kept_energy(M, 2), 3))
```

```python solution
import numpy as np

def rank_k(M, k):
    U, s, Vt = np.linalg.svd(M, full_matrices=False)
    return U[:, :k] @ np.diag(s[:k]) @ Vt[:k]

def kept_energy(M, k):
    s = np.linalg.svd(M, compute_uv=False)
    return float((s[:k] ** 2).sum() / (s ** 2).sum())

rng = np.random.default_rng(0)
M = rng.normal(size=(6, 4))
print(np.linalg.matrix_rank(rank_k(M, 2)), round(kept_energy(M, 2), 3))
```

```python test
import numpy as _np
assert "rank_k" in dir() and "kept_energy" in dir(), "Keep both function names."
_rng = _np.random.default_rng(11)
for _shape in [(6, 4), (5, 8), (10, 10)]:
    _M = _rng.normal(size=_shape)
    _U, _s, _Vt = _np.linalg.svd(_M, full_matrices=False)
    for _k in [1, 2, min(_shape)]:
        _got = rank_k(_M, _k)
        assert _np.shape(_got) == _shape, f"rank_k should return a matrix the same shape as M, {_shape}, but got {_np.shape(_got)}."
        _want = _U[:, :_k] @ _np.diag(_s[:_k]) @ _Vt[:_k]
        assert _np.allclose(_got, _want), f"rank_k(M, {_k}) is not the best rank-{_k} approximation for a {_shape} matrix."
        assert _np.isclose(kept_energy(_M, _k), (_s[:_k] ** 2).sum() / (_s ** 2).sum()), f"kept_energy(M, {_k}) is wrong for a {_shape} matrix."
    assert _np.allclose(rank_k(_M, min(_shape)), _M), "Keeping every singular value must rebuild M exactly."
"SUCCESS: The SVD's best low-rank approximation, the idea behind compression and PCA."
```

Hint: Slice the three SVD outputs to their first `k` parts, as in the digits example: `U[:, :k]`, `s[:k]` and `Vt[:k]`. For the energy you only need the singular values; `np.linalg.svd(M, compute_uv=False)` returns just those.
:::

## What you learned

- An eigenvector of `A` is a direction the matrix only stretches: `A v = λ v`. The eigenvalue λ is the stretch factor. `np.linalg.eig` finds them; eigenvectors come back as columns, scaled to length 1.
- A matrix turns the unit circle into an ellipse; for a symmetric matrix, the eigenvectors are the ellipse's axes.
- Applying a matrix over and over swings almost any vector to the eigenvector with the largest eigenvalue: power iteration, the idea behind PageRank and long-run Markov chain behaviour.
- A symmetric matrix (`A == A.T`) has real eigenvalues and orthogonal eigenvectors; use `np.linalg.eigh`. Rotations have no real eigenvectors.
- The SVD writes any matrix as `U Σ Vᵀ`: rotate, stretch along perpendicular axes by the singular values, rotate again.
- Keeping only the largest `k` singular values gives the best rank-`k` approximation, which compresses images and datasets. On centred data, this is principal component analysis.

That completes the linear algebra this series needs for now. The next two lessons turn to calculus, which is how models learn: starting with the derivative, the rate at which one quantity changes as another does.
