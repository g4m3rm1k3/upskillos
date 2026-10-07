# Compressing with the SVD

A greyscale photograph is a matrix: 400 rows, 600 columns, 240,000 numbers. A thermal-camera recording is a matrix of pixels against time; a table of measurements is a matrix of parts against dimensions. Most such matrices have far less real information than their size suggests: neighbouring pixels are alike, measurements move together. The **singular value decomposition** (SVD) finds that hidden structure in any matrix, of any shape, by writing it as a sum of simple pieces ranked by importance. Keeping only the important pieces compresses images, removes noise, and computes least-squares solutions robustly. It is arguably the most useful factorisation in applied mathematics, and it unifies ideas from earlier lessons: the stretching of transformations, eigenvectors, PCA and least squares.

This lesson covers:

- the SVD, A = UΣVᵀ, and its picture: rotate, stretch, rotate;
- singular values as the semi-axes of an ellipse;
- writing a matrix as a sum of rank-one pieces, and the best rank-k approximation;
- compressing an image, and measuring the error and the storage saved;
- the link to PCA, and the condition number;
- the SVD in OpenMAT.

## Rotate, stretch, rotate

::: math
\[ A = U\Sigma V^\mathsf{T}, \qquad U^\mathsf{T} U = I, \quad V^\mathsf{T} V = I, \qquad \Sigma = \operatorname{diag}(\sigma_1, \sigma_2, \dots), \;\; \sigma_1 \ge \sigma_2 \ge \dots \ge 0 \]
- rotate ($V^\mathsf{T}$), stretch along the axes ($\Sigma$), rotate again ($U$)
- the unit circle maps to an ellipse with semi-axes $\sigma_1$ and $\sigma_2$
In code: `U, s, Vt = np.linalg.svd(A)`
:::


Every m × n matrix A can be factored as

\[ A = U \Sigma V^\mathsf{T} \]

where U (m × m) and V (n × n) are **orthogonal** (their columns are perpendicular unit vectors, so they rotate or reflect without stretching) and Σ is diagonal with non-negative entries σ₁ ≥ σ₂ ≥ ..., the **singular values**. So any linear transformation is: a rotation (Vᵀ), a stretch along the axes (Σ), and another rotation (U). The unit circle therefore always maps to an ellipse, whose semi-axes have lengths σ₁ and σ₂ and point along U's columns. Predict before running: for the shear matrix [[1, 1], [0, 1]], how long are the ellipse's axes?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

A = np.array([[1.0, 1.0], [0.0, 1.0]])
U, s, Vt = np.linalg.svd(A)
print("singular values:", s.round(4), " U orthogonal:", np.allclose(U.T @ U, np.eye(2)), " V orthogonal:", np.allclose(Vt @ Vt.T, np.eye(2)))
print("U Σ Vᵀ rebuilds A:", np.allclose(U @ np.diag(s) @ Vt, A))

theta = np.linspace(0, 2 * math.pi, 300)
circle = np.vstack([np.cos(theta), np.sin(theta)])
ellipse = A @ circle
radii = np.linalg.norm(ellipse, axis=0)
print(f"longest image of a unit vector {radii.max():.4f}, shortest {radii.min():.4f}")
fig, ax = plt.subplots(figsize=(4.5, 4.5))
ax.plot(*circle, color="grey", label="unit circle")
ax.plot(*ellipse, label="A × circle")
for k in range(2):
    ax.plot([0, s[k] * U[0, k]], [0, s[k] * U[1, k]], "r", linewidth=2)
ax.set_aspect("equal")
ax.legend(fontsize=8)
plt.show()
```

```output
singular values: [1.618 0.618]  U orthogonal: True  V orthogonal: True
U Σ Vᵀ rebuilds A: True
longest image of a unit vector 1.6180, shortest 0.6181
```

`np.linalg.svd` returns U, the singular values as a 1-D array, and Vᵀ (not V). The red lines are σₖ times U's columns, the ellipse's semi-axes.

The shear stretches the circle into an ellipse with semi-axes 1.618 and 0.618 (the golden ratio and its reciprocal), exactly the singular values, and the longest and shortest images of unit vectors confirm them. Their product, 1.0, is |det A|: the area scale factor from the transformations lesson is the product of the singular values.

## A sum of rank-one pieces

::: math
\[ A = \sum_i \sigma_i\,\mathbf{u}_i\mathbf{v}_i^\mathsf{T}, \qquad A_k = \sum_{i=1}^{k} \sigma_i\,\mathbf{u}_i\mathbf{v}_i^\mathsf{T}, \qquad \lVert A - A_k\rVert_F = \sqrt{\sigma_{k+1}^2 + \sigma_{k+2}^2 + \cdots} \]
- each $\mathbf{u}_i\mathbf{v}_i^\mathsf{T}$ is a rank-one outer product
- Eckart–Young: $A_k$ is the best rank-$k$ approximation
In code: `Tk = (U[:, :k] * s[:k]) @ Vt[:k]`
:::


Multiplying out UΣVᵀ column by column writes A as a sum of simple matrices:

\[ A = \sigma_1 \mathbf{u}_1 \mathbf{v}_1^\mathsf{T} + \sigma_2 \mathbf{u}_2 \mathbf{v}_2^\mathsf{T} + \cdots \]

Each term uᵢvᵢᵀ is an **outer product**, a matrix whose rows are all multiples of one row: **rank one**, the simplest possible matrix. The terms are ordered by importance, σ₁ ≥ σ₂ ≥ .... Keeping only the first k gives a rank-k matrix A_k, and the **Eckart–Young theorem** says it is the best rank-k approximation in the least-squares sense, with error

\[ \lVert A - A_k \rVert_F = \sqrt{\sigma_{k+1}^2 + \sigma_{k+2}^2 + \cdots} \]

where the **Frobenius norm** ‖·‖_F is the square root of the sum of all squared entries. Predict before running: a table of temperatures (rows: positions along a shaft; columns: times) produced by two decaying patterns (a slow one and a fast one) plus a little noise. How many singular values matter?

```python type
rng = np.random.default_rng(47)
x = np.linspace(0, 1, 40)[:, None]
t = np.linspace(0, 10, 60)[None, :]
T = 80 * np.sin(math.pi * x) * np.exp(-0.2 * t) + 15 * np.sin(3 * math.pi * x) * np.exp(-1.5 * t) + rng.normal(0, 0.2, (40, 60))
U, s, Vt = np.linalg.svd(T, full_matrices=False)
print("first six singular values:", s[:6].round(2))
for k in [1, 2, 3, 10]:
    Tk = (U[:, :k] * s[:k]) @ Vt[:k]
    err = np.linalg.norm(T - Tk)
    print(f"rank {k:>2}: error {err:7.3f}  (√Σ of the rest {math.sqrt((s[k:] ** 2).sum()):7.3f}), relative {err / np.linalg.norm(T):.4f}")
```

```output
first six singular values: [1369.65   79.44    2.55    2.47    2.35    2.33]
rank  1: error  79.983  (√Σ of the rest  79.983), relative 0.0583
rank  2: error   9.291  (√Σ of the rest   9.291), relative 0.0068
rank  3: error   8.934  (√Σ of the rest   8.934), relative 0.0065
rank 10: error   6.729  (√Σ of the rest   6.729), relative 0.0049
```

`full_matrices=False` returns only the columns of U and rows of Vᵀ that matter, the economical form. `(U[:, :k] * s[:k]) @ Vt[:k]` multiplies each kept column of U by its singular value and sums the outer products.

Two singular values stand far above the rest, one for each physical mode; the others are small and roughly equal, the noise floor. The rank-2 approximation has a relative error of about 0.7%, close to the level of the noise itself, and its error matches √(Σ of the remaining σ²) exactly, as Eckart–Young promises. The 2,400-number table really contains two patterns in space, each with its own decay in time.

## Compressing an image

::: math
\[ \text{storage} = k\,(m + n + 1) \;\text{ instead of }\; mn \]
- keep $k$ columns of $U$, $k$ singular values and $k$ rows of $V^\mathsf{T}$
- $300 \times 400$ at rank 20: 14,020 numbers instead of 120,000
In code: `approx = (U[:, :k] * s[:k]) @ Vt[:k]` for several ranks `k`
:::


An image works the same way. Store a rank-k approximation as k columns of U, k singular values and k rows of Vᵀ: k(m + n + 1) numbers instead of mn. For a 300 × 400 image, rank 20 needs 14,020 numbers instead of 120,000, about 12%. Images with large smooth regions compress well; fine texture needs more terms. Predict before running: at what rank does a synthetic test image become hard to tell from the original?

```python type
yy, xx = np.mgrid[0:300, 0:400]
img = (0.5 + 0.3 * np.sin(xx / 40) * np.cos(yy / 55)
       + 0.4 * (((xx - 250) ** 2 + (yy - 120) ** 2) < 60 ** 2)
       - 0.3 * ((abs(xx - 100) < 50) & (abs(yy - 200) < 70))
       + 0.05 * rng.normal(size=(300, 400)))
U, s, Vt = np.linalg.svd(img, full_matrices=False)
fig, axes = plt.subplots(1, 4, figsize=(13, 3))
for ax, k in zip(axes, [1, 5, 20, 300]):
    approx = (U[:, :k] * s[:k]) @ Vt[:k]
    rel = np.linalg.norm(img - approx) / np.linalg.norm(img)
    store = k * (300 + 400 + 1) / (300 * 400)
    ax.imshow(approx, cmap="gray", vmin=0, vmax=1.3)
    ax.set_title(f"rank {k}: {store:.0%} storage, error {rel:.1%}", fontsize=9)
    ax.axis("off")
    print(f"rank {k:>3}: storage {store:6.1%}, relative error {rel:.2%}")
plt.show()
energy = np.cumsum(s ** 2) / np.sum(s ** 2)
print("rank needed for 99% of the energy (sum of σ²):", int(np.argmax(energy >= 0.99)) + 1)
```

```output
rank   1: storage   0.6%, relative error 35.09%
rank   5: storage   2.9%, relative error 10.20%
rank  20: storage  11.7%, relative error 8.60%
rank 300: storage 175.2%, relative error 0.00%
rank needed for 99% of the energy (sum of σ²): 6
```

`np.mgrid` builds the pixel coordinates. The image combines a smooth wave pattern, a bright disc, a dark rectangle and fine noise. The **energy** captured by k terms is the fraction of Σσ² they hold.

Rank 1 already shows the overall brightness pattern; rank 5 shows the shapes, blurred; by rank 20 the image is hard to tell from the original at 12% of the storage, the remaining error being mostly the fine noise. The circle's curved edge needs more terms than the axis-aligned rectangle, because an axis-aligned rectangle on its own is exactly rank one (one row pattern times one column pattern). Real image formats (JPEG) use a related but cheaper idea: on small 8 × 8 blocks they use a fixed set of cosine patterns (the discrete cosine transform, a relative of the frequency analysis in the spectrum lessons) instead of computing a basis for each image.

## The SVD, PCA and conditioning

::: math
\[ X = U\Sigma V^\mathsf{T} \;\Longrightarrow\; X^\mathsf{T} X = V\Sigma^2 V^\mathsf{T}, \qquad \lambda_i = \frac{\sigma_i^2}{n - 1}, \qquad \kappa = \frac{\sigma_{\max}}{\sigma_{\min}} \]
- the columns of $V$ are the principal components of the centred data $X$
- $\lambda_i$: the PCA variances (eigenvalues of the covariance matrix); $n$: the number of data rows
- $\kappa$: the condition number
In code: `np.linalg.svd(Xc, full_matrices=False)` against `np.linalg.eigvalsh(np.cov(data, rowvar=False))`
:::


The SVD of a centred data matrix is PCA in disguise: if X = UΣVᵀ, then XᵀX = VΣ²Vᵀ, so V's columns are the principal components and σᵢ²/(n − 1) are their variances. Computing PCA through the SVD avoids forming XᵀX, which squares the condition number and loses accuracy. The ratio σ_max/σ_min is the **condition number** met in the two-equation lesson: it measures how close the matrix is to losing rank. Predict before running: do the SVD route and the covariance route give the same PCA variances?

```python type
data = rng.normal(size=(200, 3)) @ np.array([[3.0, 1.0, 0.5], [0.0, 1.0, 0.3], [0.0, 0.0, 0.1]])
Xc = data - data.mean(axis=0)
_, sv, Vt_d = np.linalg.svd(Xc, full_matrices=False)
cov_vals = np.sort(np.linalg.eigvalsh(np.cov(data, rowvar=False)))[::-1]
print("σ²/(n-1):", np.round(sv ** 2 / (len(data) - 1), 5).tolist())
print("covariance eigenvalues:", np.round(cov_vals, 5).tolist())
nearly = np.array([[1.0, 1.0], [1.0, 1.001]])
sn = np.linalg.svd(nearly, compute_uv=False)
print(f"nearly singular matrix: σ = {sn.round(6)}, condition number {sn[0] / sn[1]:.0f} (np.linalg.cond {np.linalg.cond(nearly):.0f})")
```

```output
σ²/(n-1): [11.62857, 1.1354, 0.00815]
covariance eigenvalues: [11.62857, 1.1354, 0.00815]
nearly singular matrix: σ = [2.0005e+00 5.0000e-04], condition number 4002 (np.linalg.cond 4002)
```

`compute_uv=False` returns only the singular values, which is all the condition number needs.

The two routes agree on the PCA variances. The nearly parallel lines of the two-equation lesson have singular values about 2 and 0.0005, a condition number of about 4,000, the same value `np.linalg.cond` gives, because it is computed this way.

## The SVD in OpenMAT

::: math
\[ A = USV^\mathsf{T}, \qquad A_1 = \sigma_1\,\mathbf{u}_1\mathbf{v}_1^\mathsf{T} \]
- OpenMAT returns $V$ itself, so $A$ is `U * S * V'`
- a nearly rank-one matrix is well approximated by its first term
In code: `[U, S, V] = svd(A)`, then `A1 = S(1, 1) * U(:, 1:1) * V(:, 1:1)'`
:::


MATLAB-style notation returns the three factors with `[U, S, V] = svd(A)`; note that it returns V itself, not its transpose, so A = U S V'. Keeping the first term gives the best rank-one approximation. The cell shares no variables with Python. Predict before running: how close is the rank-one approximation of this nearly rank-one matrix?

```openmat
A = [4 2 6; 2 1.1 3; 6 3 9.2];
[U, S, V] = svd(A);
sigmas = diag(S)
A1 = S(1, 1) * U(:, 1:1) * V(:, 1:1)'
difference = A - A1
```

`U(:, 1:1) * V(:, 1:1)'` is the outer product of the first left and right singular vectors. The range `1:1` keeps each one a column matrix; in OpenMAT a plain `U(:, 1)` becomes a flat vector whose transpose changes nothing, and the product would collapse to a single number.

The first singular value is about 14.1, the others below 0.12, so the matrix is very nearly rank one: every row is nearly a multiple of [2, 1, 3]. The rank-one approximation differs from A by under 0.1 in every entry. The same three-line recipe compresses any matrix in OpenMAT.

::: challenge Rank-k approximations [easy]
Write `rank_k(A, k)`: the best rank-k approximation of a matrix using `np.linalg.svd(..., full_matrices=False)`, raising `ValueError` unless 1 ≤ k ≤ min(m, n). Write `storage_fraction(m, n, k)`: k(m + n + 1)/(mn), the storage needed relative to the full matrix, rounded to 4 decimal places. Then write `relative_error(A, k)`: ‖A − A_k‖_F / ‖A‖_F computed from the singular values alone (√(Σ σ² beyond k) / √(Σ σ²)), as a plain float rounded to 6 decimal places.

```python starter
def rank_k(A, k):
    return np.asarray(A, dtype=float)

def storage_fraction(m, n, k):
    return 1.0

def relative_error(A, k):
    return 0.0

print(rank_k(np.array([[1.0, 1], [0, 1]]), 1))
```

```python solution
def rank_k(A, k):
    A = np.asarray(A, dtype=float)
    if not 1 <= k <= min(A.shape):
        raise ValueError("k must be between 1 and min(m, n)")
    U, s, Vt = np.linalg.svd(A, full_matrices=False)
    return (U[:, :k] * s[:k]) @ Vt[:k]

def storage_fraction(m, n, k):
    return round(k * (m + n + 1) / (m * n), 4)

def relative_error(A, k):
    s = np.linalg.svd(np.asarray(A, dtype=float), compute_uv=False)
    return round(float(math.sqrt((s[k:] ** 2).sum() / (s ** 2).sum())), 6)

print(rank_k(np.array([[1.0, 1], [0, 1]]), 1))
```

```python test
for _n in ["rank_k", "storage_fraction", "relative_error"]:
    assert _n in dir(), f"Define {_n}."
_A = np.array([[1.0, 1], [0, 1]])
_A1 = rank_k(_A, 1)
assert np.linalg.matrix_rank(_A1) == 1 and np.allclose(rank_k(_A, 2), _A), "Rank 1, and the full rank rebuilds A."
assert abs(np.linalg.norm(_A - _A1) - 0.618034) < 1e-6, "The error of the best rank-1 approximation is σ2."
_R = np.random.default_rng(471).normal(size=(30, 20))
for _k in (1, 5, 19):
    _Rk = rank_k(_R, _k)
    assert np.linalg.matrix_rank(_Rk) == _k, "Rank exactly k."
    assert abs(np.linalg.norm(_R - _Rk) / np.linalg.norm(_R) - relative_error(_R, _k)) < 1e-6, "Error from the singular values matches the direct error."
for _bad in [0, 21]:
    try:
        rank_k(_R, _bad)
        assert False, f"k = {_bad} should raise ValueError."
    except ValueError:
        pass
assert storage_fraction(300, 400, 20) == 0.1168 and storage_fraction(10, 10, 10) == 2.1, "k(m + n + 1)/(mn): compression only pays for small k."
assert relative_error(_R, 20) == 0.0 and type(relative_error(_R, 3)) is float, "Full rank: no error."
"SUCCESS: Keep the k largest singular terms: the best rank-k matrix, with an error you can read straight off the discarded singular values."
```

Hint: With U, s, Vt from the SVD, the rank-k matrix is `(U[:, :k] * s[:k]) @ Vt[:k]`. The relative error uses only s: the root of the sum of the discarded squares over the root of the total.
:::

::: challenge Choosing the rank [medium]
Write `rank_for_error(A, tol)`: the smallest k such that the relative error of the rank-k approximation is at most `tol` (0 < tol < 1, else `ValueError`). Write `energy(A, k)`: the fraction of Σσ² captured by the first k singular values, as a plain float rounded to 6 decimal places. Then write `compress(A, tol)` returning a dict with `"k"`, `"U"`, `"s"`, `"Vt"` (the truncated factors, with shapes m × k, k and k × n) and `"ratio"`, the storage fraction k(m + n + 1)/(mn) rounded to 4 decimal places; and `decompress(c)`, which rebuilds the approximation from such a dict.

```python starter
def rank_for_error(A, tol):
    return min(np.asarray(A).shape)

def energy(A, k):
    return 1.0

def compress(A, tol):
    return {"k": 0}

def decompress(c):
    return None

print(rank_for_error(np.random.default_rng(0).normal(size=(20, 10)), 0.5))
```

```python solution
def rank_for_error(A, tol):
    if not 0 < tol < 1:
        raise ValueError("tol must be between 0 and 1")
    s = np.linalg.svd(np.asarray(A, dtype=float), compute_uv=False)
    total = (s ** 2).sum()
    for k in range(len(s) + 1):
        if math.sqrt((s[k:] ** 2).sum() / total) <= tol:
            return max(k, 1)
    return len(s)

def energy(A, k):
    s = np.linalg.svd(np.asarray(A, dtype=float), compute_uv=False)
    return round(float((s[:k] ** 2).sum() / (s ** 2).sum()), 6)

def compress(A, tol):
    A = np.asarray(A, dtype=float)
    k = rank_for_error(A, tol)
    U, s, Vt = np.linalg.svd(A, full_matrices=False)
    m, n = A.shape
    return {"k": k, "U": U[:, :k], "s": s[:k], "Vt": Vt[:k], "ratio": round(k * (m + n + 1) / (m * n), 4)}

def decompress(c):
    return (c["U"] * c["s"]) @ c["Vt"]

print(rank_for_error(np.random.default_rng(0).normal(size=(20, 10)), 0.5))
```

```python test
for _n in ["rank_for_error", "energy", "compress", "decompress"]:
    assert _n in dir(), f"Define {_n}."
_rng = np.random.default_rng(472)
_L = _rng.normal(size=(60, 3)) @ _rng.normal(size=(3, 80))
_N = _L + 0.01 * _rng.normal(size=(60, 80))
assert rank_for_error(_N, 0.01) == 3 and rank_for_error(_N, 0.6) == 2 and rank_for_error(_N, 0.9) == 1, f"Three real patterns; got {rank_for_error(_N, 0.01)}, {rank_for_error(_N, 0.6)}, {rank_for_error(_N, 0.9)}."
_s = np.linalg.svd(_N, compute_uv=False)
for _tol in (0.2, 0.05, 0.002):
    _k = rank_for_error(_N, _tol)
    assert math.sqrt((_s[_k:] ** 2).sum() / (_s ** 2).sum()) <= _tol and (_k == 1 or math.sqrt((_s[_k - 1:] ** 2).sum() / (_s ** 2).sum()) > _tol), f"Smallest k for tol {_tol}."
for _bad in (0, 1, -0.1):
    try:
        rank_for_error(_N, _bad)
        assert False, f"tol = {_bad} should raise ValueError."
    except ValueError:
        pass
assert energy(_N, 3) > 0.9999 and energy(_N, 60) == 1.0 and type(energy(_N, 1)) is float, "Energy fractions."
_c = compress(_N, 0.01)
assert _c["k"] == 3 and _c["U"].shape == (60, 3) and _c["s"].shape == (3,) and _c["Vt"].shape == (3, 80), "Truncated factors."
assert _c["ratio"] == round(3 * 141 / 4800, 4), "Storage fraction."
assert np.linalg.norm(decompress(_c) - _N) / np.linalg.norm(_N) <= 0.01, "The decompressed matrix meets the tolerance."
"SUCCESS: The singular values say exactly how many terms a tolerance needs, and three small factors store what a big matrix held."
```

Hint: The relative error after keeping k terms is √(Σ_{i≥k} σᵢ² / Σ σᵢ²) (with 0-based i); increase k until it falls to the tolerance. Store `U[:, :k]`, `s[:k]` and `Vt[:k]`.
:::

::: challenge Removing noise [hard]
A measurement table that should be low-rank (a few physical patterns) arrives with noise added to every entry. Truncating the SVD keeps the patterns and discards most of the noise. Write `singular_gap_rank(s, max_rank=None)`: given singular values in decreasing order, the k (between 1 and max_rank, default len(s) − 1) that maximises the ratio s[k − 1] / s[k], the biggest drop between consecutive singular values; ties go to the smaller k; raise `ValueError` for fewer than 2 values. Then write `denoise(noisy, k=None)`: the rank-k approximation, choosing k with `singular_gap_rank` when k is None; return `(cleaned, k)`. Finally write `improvement(clean, noisy, cleaned)`: the ratio of the Frobenius error of `noisy` to that of `cleaned`, both measured against `clean`, rounded to 2 decimal places.

```python starter
def singular_gap_rank(s, max_rank=None):
    return 1

def denoise(noisy, k=None):
    return (np.asarray(noisy, dtype=float), min(np.asarray(noisy).shape))

def improvement(clean, noisy, cleaned):
    return 1.0

print(singular_gap_rank([10.0, 9.0, 0.5, 0.4]))
```

```python solution
def singular_gap_rank(s, max_rank=None):
    s = np.asarray(s, dtype=float)
    if len(s) < 2:
        raise ValueError("need at least two singular values")
    top = len(s) - 1 if max_rank is None else min(max_rank, len(s) - 1)
    ratios = [s[k - 1] / s[k] if s[k] > 0 else math.inf for k in range(1, top + 1)]
    return int(np.argmax(ratios)) + 1

def denoise(noisy, k=None):
    A = np.asarray(noisy, dtype=float)
    U, s, Vt = np.linalg.svd(A, full_matrices=False)
    if k is None:
        k = singular_gap_rank(s)
    return (U[:, :k] * s[:k]) @ Vt[:k], int(k)

def improvement(clean, noisy, cleaned):
    return round(float(np.linalg.norm(np.asarray(noisy) - clean) / np.linalg.norm(np.asarray(cleaned) - clean)), 2)

print(singular_gap_rank([10.0, 9.0, 0.5, 0.4]))
```

```python test
for _n in ["singular_gap_rank", "denoise", "improvement"]:
    assert _n in dir(), f"Define {_n}."
assert singular_gap_rank([10.0, 9.0, 0.5, 0.4]) == 2 and singular_gap_rank([5.0, 1.0, 0.9]) == 1, "The biggest relative drop."
assert singular_gap_rank([8.0, 4.0, 2.0, 1.0]) == 1 and singular_gap_rank([9.0, 3.0, 1.0, 0.1], max_rank=2) == 1, "Ties go to the smaller k; max_rank limits the search."
try:
    singular_gap_rank([3.0])
    assert False, "One value should raise ValueError."
except ValueError:
    pass
_rng = np.random.default_rng(473)
_x = np.linspace(0, 1, 50)[:, None]
_t = np.linspace(0, 5, 70)[None, :]
_clean = 10 * np.sin(np.pi * _x) * np.exp(-0.3 * _t) + 4 * np.sin(2 * np.pi * _x) * np.cos(2 * _t)
_noisy = _clean + _rng.normal(0, 0.5, _clean.shape)
_cleaned, _k = denoise(_noisy)
assert _k == 2, f"Two physical patterns; got k = {_k}."
_imp = improvement(_clean, _noisy, _cleaned)
assert _imp > 3, f"Truncation should remove most of the noise; got an improvement of {_imp}."
_c3, _k3 = denoise(_noisy, 3)
assert _k3 == 3 and np.linalg.matrix_rank(_c3) == 3, "An explicit k is used as given."
assert improvement(_clean, _noisy, _noisy) == 1.0, "No change, no improvement."
"SUCCESS: Signal piles into a few big singular values while noise spreads thinly over all of them, so cutting at the gap keeps the patterns and drops most of the noise."
```

Hint: Compute s[k − 1]/s[k] for each k and take the largest (np.argmax picks the first on ties). Denoising is the rank-k approximation. The improvement is ‖noisy − clean‖ / ‖cleaned − clean‖.
:::

## What you learned

- Every matrix factors as A = UΣVᵀ: rotate, stretch along axes by the singular values, rotate; the unit circle maps to an ellipse with semi-axes σᵢ.
- A is a sum of rank-one pieces σᵢuᵢvᵢᵀ; keeping the first k gives the best rank-k approximation, with error √(Σ of the discarded σ²).
- Images and data tables with structure compress to k(m + n + 1) numbers with little error; the energy Σσ² shows how many terms matter.
- The SVD of centred data gives PCA (variances σ²/(n − 1)) without forming XᵀX; σ_max/σ_min is the condition number.
- Signal concentrates in a few large singular values while noise spreads over all of them, so truncating at the gap removes noise.

The next lesson uses the chain rule to make a one-neuron model learn from data.
