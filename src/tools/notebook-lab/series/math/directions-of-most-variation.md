# Directions of most variation: PCA

A quality lab measures six dimensions on every casting: two lengths, two widths, a wall thickness and a hole spacing. Six numbers per part, thousands of parts. Yet most of the variation comes from just a couple of underlying causes, the mould's temperature and the wear of a pattern, which shift several dimensions together. **Principal component analysis** (PCA) finds those hidden directions: the combinations of measurements along which the data vary most. It turns six correlated numbers into one or two that carry nearly all the information, makes high-dimensional data plottable, and exposes parts that do not fit the usual pattern. Mathematically it is the eigenvector problem of the vibration lesson, applied to the covariance matrix of the data.

This lesson covers:

- covariance and correlation between measurements;
- the variance of the data along any direction, uᵀCu;
- principal components as eigenvectors of the covariance matrix;
- explained variance, and reducing many measurements to a few;
- standardising measurements in different units;
- spotting unusual parts by reconstruction error.

## Covariance

::: math
\[ \operatorname{cov}(x, y) = \frac{1}{n - 1}\sum_i (x_i - \bar{x})(y_i - \bar{y}), \qquad r = \frac{\operatorname{cov}(x, y)}{s_x s_y}, \qquad C = \frac{X^\mathsf{T} X}{n - 1} \]
- $X$: the centred data, one row per part, one column per measurement
- $C$ is symmetric with the variances on its diagonal; $-1 \le r \le 1$
In code: `C = Xc.T @ Xc / (n - 1)`, the same as `np.cov(X, rowvar=False)`
:::


Two measurements that rise and fall together are **correlated**. The **covariance** of x and y over n samples measures this:

\[ \text{cov}(x, y) = \frac{1}{n - 1} \sum_i (x_i - \bar{x})(y_i - \bar{y}) \]

positive when they move together, negative when one rises as the other falls, near zero when unrelated. The covariance of x with itself is its variance. Dividing by both standard deviations gives the **correlation coefficient** r, between −1 and 1. For several measurements, the covariances form the **covariance matrix** C: entry (i, j) is cov(xᵢ, xⱼ), so the diagonal holds the variances and the matrix is symmetric. With the data centred (each column's mean subtracted) in an n × p matrix X, C = XᵀX/(n − 1). Predict before running: for the lengths and widths of 300 stamped brackets, is the covariance positive or negative?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(46)
n = 300
heat = rng.normal(0, 1, n)
length = 120.0 + 0.08 * heat + rng.normal(0, 0.02, n)
width = 40.0 + 0.05 * heat + rng.normal(0, 0.02, n)
X = np.column_stack([length, width])
Xc = X - X.mean(axis=0)
C = Xc.T @ Xc / (n - 1)
print("covariance matrix (mm²):\n", C.round(6))
print("matches np.cov:", np.allclose(C, np.cov(X, rowvar=False)))
r = C[0, 1] / math.sqrt(C[0, 0] * C[1, 1])
print(f"correlation r = {r:.3f}")
```

```output
covariance matrix (mm²):
 [[0.006934 0.004104]
 [0.004104 0.002939]]
matches np.cov: True
correlation r = 0.909
```

The simulated brackets share a hidden "heat" factor that stretches both dimensions, plus independent measurement noise. `np.cov(X, rowvar=False)` treats each column as a variable.

The covariance is positive: brackets that come out long also come out wide, because the same heat factor drives both. The correlation of about 0.91 says the two measurements mostly move together; only a small part of each is independent noise. That shared movement is a direction in the data, and PCA finds it.

## Variance along a direction

::: math
\[ \operatorname{var}(\mathbf{u}) = \mathbf{u}^\mathsf{T} C\,\mathbf{u}, \qquad \mathbf{u} = (\cos\alpha, \sin\alpha) \]
- $\mathbf{u}^\mathsf{T}\mathbf{x}$: each part's coordinate along the unit vector $\mathbf{u}$
- the spread is largest in one direction and smallest at right angles to it
In code: `u @ C @ u` for every angle from 0° to 179°
:::


Project the centred data onto a unit vector u: each part becomes the single number uᵀx, its coordinate along u. The variance of these projections is

\[ \text{var}(u) = \mathbf{u}^\mathsf{T} C\, \mathbf{u} \]

a quadratic form in u. As u turns, this variance changes, and there is a direction where it is largest and a perpendicular one where it is smallest. Predict before running: scanning directions every degree, at what angle is the spread of the brackets largest?

```python type
angles = np.radians(np.arange(0, 180, 1))
var_along = [np.array([math.cos(a), math.sin(a)]) @ C @ np.array([math.cos(a), math.sin(a)]) for a in angles]
best = np.degrees(angles[int(np.argmax(var_along))])
print(f"largest spread {max(var_along):.6f} mm² at {best:.0f}°, smallest {min(var_along):.6f} mm² at {np.degrees(angles[int(np.argmin(var_along))]):.0f}°")

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 3.5))
ax1.plot(Xc[:, 0], Xc[:, 1], ".", markersize=3)
u = np.array([math.cos(math.radians(best)), math.sin(math.radians(best))])
ax1.plot([-0.25 * u[0], 0.25 * u[0]], [-0.25 * u[1], 0.25 * u[1]], "r", linewidth=2)
ax1.set_aspect("equal")
ax1.set_xlabel("length deviation (mm)")
ax1.set_ylabel("width deviation (mm)")
ax2.plot(np.degrees(angles), var_along)
ax2.set_xlabel("direction (degrees)")
ax2.set_ylabel("variance along it (mm²)")
plt.show()
```

```output
largest spread 0.009501 mm² at 32°, smallest 0.000372 mm² at 122°
```

The red line on the scatter plot is the direction of largest spread.

The spread is largest at about 32° and smallest at 122°, a right angle away. The largest variance is many times the smallest: the brackets scatter mainly along one tilted line, the direction in which length and width change together, and only thinly across it.

## Principal components

::: math
\[ C\mathbf{v}_k = \lambda_k\mathbf{v}_k, \qquad \lambda_1 \ge \lambda_2 \ge \dots \ge 0, \qquad \sum_k \lambda_k = \operatorname{tr} C \]
- the eigenvectors $\mathbf{v}_k$ are the principal components; $\lambda_k$ is the variance along each
- explained share: $\lambda_k / \sum_j \lambda_j$; the scores $X\mathbf{v}_k$ are uncorrelated
In code: `vals, vecs = np.linalg.eigh(C)`, sorted largest first; `scores = Xc @ vecs`
:::


Maximising uᵀCu over unit vectors u is an eigenvalue problem: the maximum is the largest eigenvalue of C, reached at its eigenvector. Because C is symmetric, its eigenvalues are real and its eigenvectors perpendicular; and because each eigenvalue is a variance (uᵀCu for its eigenvector), none is negative. The eigenvectors, ordered by eigenvalue, are the **principal components** (PCs); each eigenvalue is the variance along its component; and the eigenvalues add up to the total variance (the trace of C). `np.linalg.eigh` handles symmetric matrices and returns eigenvalues in increasing order. Predict before running: what share of the brackets' variation lies along the first component?

```python type
vals, vecs = np.linalg.eigh(C)
order = np.argsort(vals)[::-1]
vals, vecs = vals[order], vecs[:, order]
print("variances along the PCs:", vals.round(6), " total", vals.sum().round(6), "= trace", np.trace(C).round(6))
print("explained:", (100 * vals / vals.sum()).round(2), "%")
pc1 = vecs[:, 0] * np.sign(vecs[0, 0])
print(f"PC1 direction {pc1.round(4)}, angle {math.degrees(math.atan2(pc1[1], pc1[0])):.1f}°")
scores = Xc @ vecs
print("scores are uncorrelated:", np.round(np.cov(scores, rowvar=False), 8).tolist())
```

```output
variances along the PCs: [0.009501 0.000372]  total 0.009873 = trace 0.009873
explained: [96.23  3.77] %
PC1 direction [0.8478 0.5303], angle 32.0°
scores are uncorrelated: [[0.00950102, 0.0], [0.0, 0.00037192]]
```

The **scores**, the data's coordinates along the components, are uncorrelated: rotating to the principal axes removes the correlation entirely.

The first component carries about 96% of the variance and points at 32°, the direction the scan found. The scores have zero covariance between them. For these brackets, one number, the score on PC1, summarises the heat effect on both dimensions, and the second is essentially measurement noise.

## Many measurements, few factors

::: math
\[ \text{explained}_k = \frac{\lambda_k}{\sum_j \lambda_j}, \qquad \text{smallest } m \text{ with } \sum_{k \le m} \text{explained}_k \ge 0.95 \]
- a few large eigenvalues reveal a few hidden factors; the rest is noise
- a scree plot shows the sharp drop
In code: `np.cumsum(explained) >= 0.95` on `np.linalg.eigvalsh(Cc)`
:::


PCA earns its keep in higher dimensions. The castings have six measurements driven by two hidden factors, mould temperature and pattern wear, each affecting the six dimensions in its own proportions, plus independent noise. Looking at a 6 × 6 covariance matrix reveals little; its eigenvalues reveal the structure at once. A **scree plot** of the explained variance per component shows a sharp drop after the real factors. Predict before running: how many components are needed to explain 95% of the variation?

```python type
n = 500
temperature = rng.normal(0, 1, n)
wear = rng.normal(0, 1, n)
effect_t = np.array([0.30, 0.28, 0.12, 0.10, 0.02, 0.20])
effect_w = np.array([0.05, -0.04, 0.15, 0.16, -0.10, 0.02])
nominal = np.array([250, 248, 90, 92, 8, 160.0])
castings = nominal + np.outer(temperature, effect_t) + np.outer(wear, effect_w) + rng.normal(0, 0.02, (n, 6))
Cc = np.cov(castings, rowvar=False)
ev = np.sort(np.linalg.eigvalsh(Cc))[::-1]
explained = ev / ev.sum()
print("explained variance per component (%):", (100 * explained).round(2))
print("cumulative (%):", (100 * np.cumsum(explained)).round(2))
print("components for 95%:", int(np.argmax(np.cumsum(explained) >= 0.95)) + 1)

fig, ax = plt.subplots(figsize=(5, 3))
ax.bar(np.arange(1, 7), 100 * explained)
ax.set_xlabel("principal component")
ax.set_ylabel("variance explained (%)")
plt.show()
```

```output
explained variance per component (%): [81.65 17.78  0.16  0.15  0.14  0.13]
cumulative (%): [ 81.65  99.43  99.59  99.74  99.87 100.  ]
components for 95%: 2
```

`np.outer(temperature, effect_t)` gives each casting the temperature effect on every dimension: one row per part, one column per dimension.

Two components explain over 99% of the variation, and the last four are pure noise at a fraction of a percent each: the scree plot drops off a cliff after component 2, revealing the two hidden factors without being told about them. Six measurements per part reduce to two scores with almost no loss. One caution: PCA finds directions of variation, not causes; the components are mixtures that may need engineering knowledge to interpret.

## Units and unusual parts

::: math
\[ \hat{\mathbf{z}} = V_m V_m^\mathsf{T}\,\mathbf{z}, \qquad e = \lVert \mathbf{z} - \hat{\mathbf{z}} \rVert \]
- $V_m$: the top $m$ components as columns; $\mathbf{z}$: a centred part
- a large reconstruction error $e$ flags an unusual combination of dimensions
In code: `recon = Z @ top @ top.T`, then `np.sqrt(((Z - recon) ** 2).sum(axis=1))`
:::


PCA uses variances, so it depends on units: measure one dimension in micrometres and it will dominate every component. When measurements have different units or very different scales, **standardise** first: divide each centred column by its standard deviation, which is PCA on the correlation matrix. Once the main components are known, PCA also flags unusual parts: project each part onto the top components and back, and measure the **reconstruction error**, what the components cannot explain. A part with an unusual combination of dimensions (a casting with a cracked wall, say, thin where it should be normal) has a large error even if each dimension alone is within limits. Predict before running: one casting has a wall 0.15 mm too thin, inside its tolerance. Does PCA notice?

```python type
odd = castings.copy()
odd[123, 4] -= 0.15
mu = odd.mean(axis=0)
Z = odd - mu
w, V = np.linalg.eigh(np.cov(odd, rowvar=False))
top = V[:, np.argsort(w)[::-1][:2]]
recon = Z @ top @ top.T
err = np.sqrt(((Z - recon) ** 2).sum(axis=1))
print(f"wall thickness of part 123: {odd[123, 4]:.3f} mm (others range {np.delete(odd[:, 4], 123).min():.3f} to {np.delete(odd[:, 4], 123).max():.3f})")
print(f"reconstruction error: part 123 {err[123]:.4f} mm, median part {np.median(err):.4f} mm, rank of part 123: {int((err > err[123]).sum()) + 1}")
```

```output
wall thickness of part 123: 7.973 mm (others range 7.722 to 8.287)
reconstruction error: part 123 0.1395 mm, median part 0.0368 mm, rank of part 123: 1
```

Projecting onto the top two components and back, `Z @ top @ top.T`, keeps only the part of each row that the two main factors explain.

The thin wall is within the range seen in the other parts, so a simple tolerance check misses it. But its combination of dimensions does not fit the two-factor pattern, and its reconstruction error is several times the median, ranking it the most unusual of the 500 castings. This is how multivariate statistical process control catches problems that single-dimension charts cannot.

## PCA in OpenMAT

::: math
\[ C = \frac{X_c^\mathsf{T} X_c}{n - 1}, \qquad CV = VD, \qquad \text{share}_1 = \frac{\lambda_1}{\lambda_1 + \lambda_2} \]
- centre each column, form $C$, then decompose
- $n - 1 = 4$ for five parts
In code: `C = (Xc' * Xc) / 4`, then `[V, D] = eig(C)`
:::


The covariance matrix and its eigen-decomposition are a few lines in MATLAB-style notation: `X(:, 1)` is the first column, `X'` is the transpose, and `[V, D] = eig(C)` gives the components. The cell shares no variables with Python. Predict before running: for five parts with two measurements, how much of the variance is on the first component?

```openmat
X = [2 1; 3 2; 4 2; 5 4; 6 5];
x1 = X(:, 1) - mean(X(:, 1));
x2 = X(:, 2) - mean(X(:, 2));
Xc = [x1 x2];
C = (Xc' * Xc) / 4
[V, D] = eig(C);
variances = diag(D)
explained = variances / sum(variances)
```

Each column is centred separately. (In MATLAB, `X - mean(X)` would centre every column at once, but OpenMAT's `mean` of a matrix averages all its entries, so the columns are handled one at a time here.)

The covariance matrix is [[2.5, 2.5], [2.5, 2.7]], and its eigenvalues, about 0.098 and 5.10, show that about 98% of the variance lies on one component: these five parts lie almost on a line. OpenMAT lists the eigenvalues in increasing order here, so the larger one comes second; as always with eigenvectors, the order and sign conventions differ between tools, but the subspaces and variances agree.

::: challenge Covariance by hand [easy]
Write `covariance_matrix(X)` for an n × p NumPy array (rows are samples): the p × p sample covariance matrix, centring each column and dividing by n − 1, **without** `np.cov` or `np.corrcoef`. Raise `ValueError` for fewer than 2 rows. Write `correlation(C)`: the correlation matrix from a covariance matrix (each entry divided by the two standard deviations). Then write `variance_along(C, u)`: the variance of the data along direction u (normalise u to unit length first; raise `ValueError` for a zero vector), as a plain float.

```python starter
def covariance_matrix(X):
    return np.eye(np.asarray(X).shape[1])

def correlation(C):
    return np.asarray(C)

def variance_along(C, u):
    return 0.0

print(covariance_matrix(np.array([[1.0, 2], [2, 4], [3, 6]])))
```

```python solution
def covariance_matrix(X):
    X = np.asarray(X, dtype=float)
    if X.shape[0] < 2:
        raise ValueError("need at least 2 samples")
    Xc = X - X.mean(axis=0)
    return Xc.T @ Xc / (X.shape[0] - 1)

def correlation(C):
    C = np.asarray(C, dtype=float)
    sd = np.sqrt(np.diag(C))
    return C / np.outer(sd, sd)

def variance_along(C, u):
    u = np.asarray(u, dtype=float)
    norm = np.linalg.norm(u)
    if norm == 0:
        raise ValueError("the direction must be non-zero")
    u = u / norm
    return float(u @ np.asarray(C, dtype=float) @ u)

print(covariance_matrix(np.array([[1.0, 2], [2, 4], [3, 6]])))
```

```python test
import ast as _ast
for _n in ["covariance_matrix", "correlation", "variance_along"]:
    assert _n in dir(), f"Define {_n}."
_attrs = {_x.attr for _x in _ast.walk(_ast.parse(_source)) if isinstance(_x, _ast.Attribute)}
assert not (_attrs & {"cov", "corrcoef"}), "Compute the covariance yourself."
_X = np.array([[1.0, 2], [2, 4], [3, 6]])
assert np.allclose(covariance_matrix(_X), [[1, 2], [2, 4]]), "Perfectly correlated columns."
_R = np.random.default_rng(461).normal(size=(50, 4)) @ np.random.default_rng(462).normal(size=(4, 4))
assert np.allclose(covariance_matrix(_R), np.cov(_R, rowvar=False)), "Matches the library on random data."
assert np.allclose(correlation(covariance_matrix(_X)), [[1, 1], [1, 1]]) and np.allclose(np.diag(correlation(covariance_matrix(_R))), 1), "Correlations have 1 on the diagonal."
try:
    covariance_matrix(np.array([[1.0, 2.0]]))
    assert False, "One sample should raise ValueError."
except ValueError:
    pass
_C = np.array([[2.95, 2.05], [2.05, 3.15]])
assert abs(variance_along(_C, [1, 0]) - 2.95) < 1e-12 and abs(variance_along(_C, [3, 3]) - (2.95 + 2 * 2.05 + 3.15) / 2) < 1e-12 and type(variance_along(_C, [1, 1])) is float, "uᵀCu with u normalised."
try:
    variance_along(_C, [0, 0])
    assert False, "A zero direction should raise ValueError."
except ValueError:
    pass
"SUCCESS: Centre, multiply by the transpose, divide by n − 1: the covariance matrix, from which the spread in any direction is uᵀCu."
```

Hint: Subtract the column means, then `Xc.T @ Xc / (n - 1)`. Correlation divides each entry by the product of the two standard deviations, the square roots of the diagonal. The variance along u is `u @ C @ u` with u normalised.
:::

::: challenge A PCA routine [medium]
Write `pca(X, standardise=False)` for an n × p data array: centre the columns (and, if `standardise`, also divide each by its sample standard deviation), compute the sample covariance matrix, and return a dict with `"variances"` (the eigenvalues in **decreasing** order, as a NumPy array), `"components"` (a p × p array whose **columns** are the matching unit eigenvectors, each with its largest-magnitude entry made positive), `"explained"` (each variance divided by their total) and `"scores"` (the centred, possibly standardised, data multiplied by the components). Use `np.linalg.eigh`. Then write `components_for(X, fraction, standardise=False)`: the smallest number of components whose cumulative explained variance reaches `fraction`.

```python starter
def pca(X, standardise=False):
    X = np.asarray(X, dtype=float)
    p = X.shape[1]
    return {"variances": np.ones(p), "components": np.eye(p), "explained": np.full(p, 1 / p), "scores": X}

def components_for(X, fraction, standardise=False):
    return np.asarray(X).shape[1]

print(pca(np.array([[2.0, 1], [3, 2], [4, 2], [5, 4], [6, 5]]))["explained"])
```

```python solution
def pca(X, standardise=False):
    X = np.asarray(X, dtype=float)
    Z = X - X.mean(axis=0)
    if standardise:
        Z = Z / Z.std(axis=0, ddof=1)
    C = Z.T @ Z / (X.shape[0] - 1)
    vals, vecs = np.linalg.eigh(C)
    order = np.argsort(vals)[::-1]
    vals, vecs = vals[order], vecs[:, order]
    for j in range(vecs.shape[1]):
        if vecs[np.argmax(np.abs(vecs[:, j])), j] < 0:
            vecs[:, j] = -vecs[:, j]
    return {"variances": vals, "components": vecs, "explained": vals / vals.sum(), "scores": Z @ vecs}

def components_for(X, fraction, standardise=False):
    cum = np.cumsum(pca(X, standardise)["explained"])
    return int(np.argmax(cum >= fraction - 1e-12)) + 1

print(pca(np.array([[2.0, 1], [3, 2], [4, 2], [5, 4], [6, 5]]))["explained"])
```

```python test
for _n in ["pca", "components_for"]:
    assert _n in dir(), f"Define {_n}."
_X = np.array([[2.0, 1], [3, 2], [4, 2], [5, 4], [6, 5]])
_r = pca(_X)
assert np.allclose(_r["variances"], [5.1019992, 0.0980008], atol=1e-6) and np.all(np.diff(_r["variances"]) <= 0), f"Decreasing eigenvalues; got {_r['variances']}."
assert np.allclose(_r["components"][:, 0], [0.69283186, 0.72109917], atol=1e-6), "First component, largest entry positive."
assert np.allclose(_r["components"].T @ _r["components"], np.eye(2)), "Orthonormal components."
assert np.allclose(_r["explained"].sum(), 1) and abs(_r["explained"][0] - 5.1019992 / 5.2) < 1e-6, "Explained fractions."
assert np.allclose(np.cov(_r["scores"], rowvar=False), np.diag(_r["variances"]), atol=1e-10), "Scores are uncorrelated, with the eigenvalues as variances."
_rng = np.random.default_rng(463)
_f = _rng.normal(size=(400, 2))
_D = _f @ _rng.normal(size=(2, 6)) + 0.01 * _rng.normal(size=(400, 6))
assert components_for(_D, 0.99) == 2 and components_for(_D, 0.5) == 1, "Two hidden factors."
_scaled = _D.copy(); _scaled[:, 0] *= 1000
assert pca(_scaled)["explained"][0] > 0.99 and pca(_scaled, standardise=True)["explained"][0] < 0.95, "Unscaled PCA is dominated by the big column; standardising fixes it."
"SUCCESS: Eigenvectors of the covariance matrix, sorted by eigenvalue: the directions of most variation and how much each one carries."
```

Hint: `np.linalg.eigh` returns ascending eigenvalues, so reverse the order. For each component column, flip its sign if its largest-magnitude entry is negative. Scores are the (centred) data times the component matrix.
:::

::: challenge Unusual parts [hard]
Write `reconstruction_errors(X, k)`: centre the data, find the top-k principal components (by `np.linalg.eigh` of the sample covariance), project each centred row onto them and back, and return a NumPy array of the Euclidean distances between each centred row and its reconstruction. Raise `ValueError` unless 1 ≤ k ≤ p. Then write `flag_unusual(X, k, factor=4.0)`: the sorted list of row indices whose error exceeds `factor` times the median error. Finally write `best_k(X, fraction=0.99)`: the smallest k explaining at least `fraction` of the variance (as in the previous challenge, without standardising; reuse nothing from it, so this challenge stands alone).

```python starter
def reconstruction_errors(X, k):
    return np.zeros(len(X))

def flag_unusual(X, k, factor=4.0):
    return []

def best_k(X, fraction=0.99):
    return 1

print(best_k(np.random.default_rng(0).normal(size=(50, 3))))
```

```python solution
def _top_components(X):
    X = np.asarray(X, dtype=float)
    Z = X - X.mean(axis=0)
    vals, vecs = np.linalg.eigh(Z.T @ Z / (X.shape[0] - 1))
    order = np.argsort(vals)[::-1]
    return Z, vals[order], vecs[:, order]

def reconstruction_errors(X, k):
    Z, vals, vecs = _top_components(X)
    if not 1 <= k <= Z.shape[1]:
        raise ValueError("k must be between 1 and the number of columns")
    top = vecs[:, :k]
    return np.sqrt(((Z - Z @ top @ top.T) ** 2).sum(axis=1))

def flag_unusual(X, k, factor=4.0):
    err = reconstruction_errors(X, k)
    return [int(i) for i in np.flatnonzero(err > factor * np.median(err))]

def best_k(X, fraction=0.99):
    _, vals, _ = _top_components(X)
    cum = np.cumsum(vals) / vals.sum()
    return int(np.argmax(cum >= fraction - 1e-12)) + 1

print(best_k(np.random.default_rng(0).normal(size=(50, 3))))
```

```python test
for _n in ["reconstruction_errors", "flag_unusual", "best_k"]:
    assert _n in dir(), f"Define {_n}."
_rng = np.random.default_rng(464)
_f = _rng.normal(size=(300, 2))
_L = _rng.normal(size=(2, 6))
_D = 50 + _f @ _L + 0.02 * _rng.normal(size=(300, 6))
_odd = _D.copy()
_odd[17] += 0.3 * np.array([1, -1, 1, -1, 1, -1]) / math.sqrt(6) * 3
_odd[200, 3] -= 0.5
_e = reconstruction_errors(_odd, 2)
assert isinstance(_e, np.ndarray) and _e.shape == (300,), "One error per row."
assert set(flag_unusual(_odd, 2)) >= {17, 200} and len(flag_unusual(_odd, 2)) <= 6, f"The two planted parts must be flagged; got {flag_unusual(_odd, 2)}."
assert np.allclose(reconstruction_errors(_D, 6), 0, atol=1e-9), "With all components, reconstruction is exact."
assert best_k(_D) == 2 and best_k(_D, 0.5) == 1, "Two hidden factors."
_Z = _D - _D.mean(axis=0)
_w, _V = np.linalg.eigh(np.cov(_D, rowvar=False))
_t = _V[:, np.argsort(_w)[::-1][:2]]
assert np.allclose(reconstruction_errors(_D, 2), np.linalg.norm(_Z - _Z @ _t @ _t.T, axis=1)), "Distance between each centred row and its projection."
for _bad in [0, 7]:
    try:
        reconstruction_errors(_D, _bad)
        assert False, f"k = {_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: The main components describe normal parts; whatever they cannot reconstruct marks a part that breaks the usual pattern."
```

Hint: With the top-k eigenvectors as the columns of `top`, the reconstruction of the centred data is `Z @ top @ top.T`; the error of each row is the length of its difference. Compare errors with the median using `np.flatnonzero`.
:::

## What you learned

- The covariance matrix collects every pair's covariance; standardising it gives correlations between −1 and 1.
- The variance of the data along a unit direction u is uᵀCu; it is largest along C's top eigenvector.
- Principal components are the eigenvectors of C, ordered by eigenvalue (the variance along each); their scores are uncorrelated, and the eigenvalues sum to the total variance.
- A few components often explain nearly all the variation, revealing hidden factors; standardise first when units differ.
- Reconstruction error from the top components flags parts whose combination of measurements is unusual, even when each one is within tolerance.

The next lesson factors any matrix into rotations and stretches, the singular value decomposition, and uses it to compress an image.
