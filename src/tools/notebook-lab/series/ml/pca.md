# PCA

A table with 64 columns is hard to look at, slow to model, and often wasteful: many of the columns move together. The pixels of a handwritten digit are a good example. Neighbouring pixels are nearly always both inked or both blank, so the 64 numbers carry far fewer than 64 independent pieces of information. **Principal component analysis** (PCA) finds a small number of new features, each a combination of the originals, that keep as much of the data's variation as possible. With them you can plot high-dimensional data in two dimensions, compress it, remove noise, and speed up other models.

You have already met the machinery. The eigenvectors and SVD lesson ended with the remark that keeping the largest singular values of centred data **is** PCA. This lesson unpacks that remark: what the principal components are, why the SVD finds them, how to decide how many to keep, and the mistakes to avoid.

## The direction of greatest spread

Start in two dimensions, where everything can be seen. People's heights and arm spans are strongly related: tall people have long arms. Two numbers per person, but the points lie close to a line.

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(0)
n = 200
height = rng.normal(170, 9, n)
span = height + rng.normal(0, 4, n)
X = np.column_stack([height, span])
centred = X - X.mean(axis=0)

U, S, Vt = np.linalg.svd(centred, full_matrices=False)
print("principal directions (rows):")
print(Vt.round(3))
print("variance along each:", (S ** 2 / (n - 1)).round(1))

fig, ax = plt.subplots(figsize=(5, 5))
ax.scatter(*centred.T, s=8, alpha=0.6)
for direction, s, colour in zip(Vt, S, ["tab:red", "tab:green"]):
    length = 2 * s / np.sqrt(n - 1)
    ax.plot([0, length * direction[0]], [0, length * direction[1]], color=colour, linewidth=3)
ax.set_xlabel("height (centred)")
ax.set_ylabel("arm span (centred)")
ax.set_aspect("equal")
plt.show()
```

```output
principal directions (rows):
[[-0.677 -0.736]
 [-0.736  0.677]]
variance along each: [154.5   8.2]
```

PCA always works on **centred** data, each column minus its mean, so the cloud sits around the origin. The SVD of the centred data, `U Σ Vᵀ`, gives the answer in its rows of `Vᵀ`: these are the **principal directions** (or **principal components**), unit vectors at right angles to each other. The first (red) points along the cloud, about equal parts height and arm span; the second (green) points across it. (The SVD may return either sign for each direction; −v is the same line as v.)

The squared singular values divided by n − 1 give the **variance** of the data along each direction: 154.5 along the first and only 8.2 along the second. The first direction carries 95% of the total variation. Describing each person by one number, their position along the red line, loses only 5% of the variation between people.

Why the SVD? The principal directions are the directions of greatest variance: the first maximises the variance of the data projected onto it; the second does the same among directions at right angles to the first; and so on. Those turn out to be the eigenvectors of the **covariance matrix** (the matrix of variances and covariances of the columns, `np.cov`), with the variances as the eigenvalues. The SVD of the centred data gives exactly the same vectors, more accurately and without forming the covariance matrix. Both routes appear in practice; you can check they agree with `np.linalg.eigh(np.cov(centred.T))`.

## Projecting and reconstructing

The new coordinates of each example, its **scores**, come from projecting onto the directions: `centred @ Vt.T` (equivalently `U * S`). Keeping only the first `k` columns gives a `k`-dimensional version of the data. You can map back again: multiply the `k` scores by the first `k` directions and add the mean. This **reconstruction** is the closest you can get to the original using only `k` directions, the best rank-`k` approximation from the SVD lesson.

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(0)
n = 200
height = rng.normal(170, 9, n)
span = height + rng.normal(0, 4, n)
X = np.column_stack([height, span])
mean = X.mean(axis=0)
U, S, Vt = np.linalg.svd(X - mean, full_matrices=False)

scores = (X - mean) @ Vt[:1].T
reconstructed = scores @ Vt[:1] + mean
print("first person:", X[0].round(1), "-> score", scores[0].round(2), "-> reconstructed", reconstructed[0].round(1))
print("average squared error per value:", np.mean((X - reconstructed) ** 2).round(2))

fig, ax = plt.subplots(figsize=(5, 5))
ax.scatter(*X.T, s=8, alpha=0.5, label="original")
ax.scatter(*reconstructed.T, s=8, color="tab:red", label="kept: 1 number per person")
for a, b in zip(X[:40], reconstructed[:40]):
    ax.plot([a[0], b[0]], [a[1], b[1]], color="grey", linewidth=0.5)
ax.set_aspect("equal")
ax.legend(fontsize=8)
plt.show()
```

```output
first person: [171.1 168.5] -> score [0.29] -> reconstructed [169.9 169.6]
average squared error per value: 4.08
```

`Vt[:1]` keeps just the first direction (as a 1 × 2 array), so `scores` has one column. The reconstructed points all lie on the red line; the grey segments show what was thrown away, each one perpendicular to the line. PCA's line is the one that makes these perpendicular gaps as small as possible, which is different from least squares regression, which minimises the vertical gaps (and treats one variable as the thing to predict, whereas PCA treats both alike).

## Digits: 64 dimensions down to a few

Now real high-dimensional data. scikit-learn's `PCA` does the centring and the SVD. Its `explained_variance_ratio_` gives the fraction of total variance along each direction, and the cumulative sum shows how much is kept with the first `k`. Before running the cell, guess: how many of the 64 directions are needed to keep 90% of the variance of the digit images?

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_digits
from sklearn.decomposition import PCA

digits = load_digits()
pca = PCA().fit(digits.data)
kept = np.cumsum(pca.explained_variance_ratio_)
for k in [1, 2, 5, 10, 20, 30, 40]:
    print(f"{k:>2} components keep {kept[k - 1]:.1%} of the variance")
print("components needed for 90%:", np.argmax(kept >= 0.90) + 1, " for 95%:", np.argmax(kept >= 0.95) + 1)

scores = PCA(n_components=2).fit_transform(digits.data)
fig, axes = plt.subplots(1, 2, figsize=(10, 4))
axes[0].plot(range(1, 65), kept, marker=".")
axes[0].set_xlabel("number of components")
axes[0].set_ylabel("fraction of variance kept")
points = axes[1].scatter(scores[:, 0], scores[:, 1], c=digits.target, cmap="tab10", s=6)
fig.colorbar(points, ax=axes[1], label="digit")
axes[1].set_title("every digit, described by 2 numbers", fontsize=9)
plt.show()
```

```output
 1 components keep 14.9% of the variance
 2 components keep 28.5% of the variance
 5 components keep 54.5% of the variance
10 components keep 73.8% of the variance
20 components keep 89.4% of the variance
30 components keep 95.9% of the variance
40 components keep 98.8% of the variance
components needed for 90%: 21  for 95%: 29
```

`np.argmax(kept >= 0.90)` finds the first position where the cumulative fraction reaches 90%. The answer is 21 of the 64 directions for 90%, and 29 for 95%. The first two alone keep 28.5%, and the right-hand plot shows every digit placed by just those two numbers, coloured by its true label (which PCA never saw). Some digits already form clear groups, 0s in one region and 4s in another, while others overlap heavily: two numbers are not enough to separate them all, but they reveal real structure.

## What the components look like

Each principal direction has 64 entries, one per pixel, so it can be drawn as an image. And reconstructing a digit from its first `k` scores shows what those `k` numbers capture:

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_digits
from sklearn.decomposition import PCA

digits = load_digits()
fig, axes = plt.subplots(2, 5, figsize=(8, 3.4))
pca = PCA(n_components=5).fit(digits.data)
for i, ax in enumerate(axes[0]):
    ax.imshow(pca.components_[i].reshape(8, 8), cmap="RdBu_r")
    ax.set_title(f"component {i + 1}", fontsize=8)
    ax.axis("off")

example = digits.data[0]
for ax, k in zip(axes[1], [1, 5, 10, 20, 64]):
    model = PCA(n_components=k).fit(digits.data)
    rebuilt = model.inverse_transform(model.transform(example.reshape(1, -1)))
    ax.imshow(rebuilt.reshape(8, 8), cmap="gray_r")
    ax.set_title(f"{k} numbers", fontsize=8)
    ax.axis("off")
plt.show()
```

The top row shows the first five directions (`components_`, the rows of `Vᵀ`): red pixels are added, blue pixels subtracted, in proportion to the score. They are not digits, but patterns of variation. Component 1 contrasts a diagonal stroke through the middle (red) with ink along the top and bottom (blue), roughly "more like a 1 or 7, less like a 0"; component 2 contrasts a central vertical stroke with ink on the left; and so on. Every digit is approximately the average digit plus a weighted mix of these patterns.

The bottom row rebuilds the first digit (a 0) from its first `k` scores with `inverse_transform`. One number gives a blur; with 5 a ring is already emerging; by 10 or 20 the 0 is clearly recognisable; 64 numbers rebuild it exactly. Storing 20 numbers instead of 64 per image, plus the 20 shared patterns, is compression, and the discarded directions, being the ones with least variance, are often mostly noise, so the reconstruction can even be cleaner than the original.

## Scale first, and other cautions

PCA chases variance, so it is at the mercy of units, just like k-means and kNN. On the wine data, unscaled, the first component explains 99.8% of the variance, and it is almost entirely proline, the measurement in the hundreds. That says nothing about wine and everything about units. After `StandardScaler`, the first two components explain 36% and 19%, spread across many measurements. Standardise first unless the features share units and their scales are meaningful (like pixels).

Three more cautions:

- **High variance is not the same as useful.** PCA never looks at labels. A direction with little variance can be exactly the one that separates two classes, and PCA may discard it.
- **Components are combinations**, so they can be hard to interpret. Component 1 of a dataset is "0.3 of this, minus 0.5 of that, plus…".
- **PCA is linear.** It finds flat subspaces. Data lying on a curved surface needs non-linear methods: t-SNE (next lesson) for pictures, or the autoencoders near the end of the series for features.

## PCA before a model

Because it is a transformer (`fit` learns the mean and directions, `transform` projects), PCA fits straight into a pipeline, and is refitted on each training fold like any other learned step:

```python type
from sklearn.datasets import load_digits
from sklearn.decomposition import PCA
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline

digits = load_digits()
X, y = digits.data / 16, digits.target
for k in [2, 5, 10, 20, 64]:
    model = make_pipeline(PCA(n_components=k), LogisticRegression(max_iter=3000))
    print(f"{k:>2} components: accuracy {cross_val_score(model, X, y, cv=5).mean():.3f}")
```

```output
 2 components: accuracy 0.579
 5 components: accuracy 0.825
10 components: accuracy 0.891
20 components: accuracy 0.921
64 components: accuracy 0.928
```

Two components give 0.58, already far above the 0.10 of guessing; 10 give 0.89, and 20 give 0.92, nearly the 0.93 of all 64 pixels, with less than a third of the features. Whether that trade is worth it depends on the model: it matters for slow or distance-based models in high dimensions, and little for a fast linear model like this one.

::: challenge Variance explained [easy]
Write `variance_ratios(X)` that returns the fraction of the total variance along each principal direction, from the SVD of the centred data: the squared singular values divided by their sum. Then store, for the wine data, the ratios **without** scaling in `raw` and **after** standardising each column (subtract its mean, divide by its standard deviation) in `scaled`.

```python starter
import numpy as np
from sklearn.datasets import load_wine

def variance_ratios(X):
    return np.ones(X.shape[1]) / X.shape[1]

X = load_wine().data
raw = variance_ratios(X)
scaled = variance_ratios(X)
print(raw[:2], scaled[:2])
```

```python solution
import numpy as np
from sklearn.datasets import load_wine

def variance_ratios(X):
    centred = X - X.mean(axis=0)
    S = np.linalg.svd(centred, compute_uv=False)
    return S ** 2 / np.sum(S ** 2)

X = load_wine().data
raw = variance_ratios(X)
scaled = variance_ratios((X - X.mean(axis=0)) / X.std(axis=0))
print(raw[:2], scaled[:2])
```

```python test
import numpy as _np
from sklearn.datasets import load_wine as _lw
from sklearn.decomposition import PCA as _PCA
from sklearn.preprocessing import StandardScaler as _SS
assert "variance_ratios" in dir(), "Keep the function's name as variance_ratios."
_r = _np.random.default_rng(3)
_P = _r.normal(size=(50, 4)) @ _r.normal(size=(4, 4)) + 10
assert _np.allclose(variance_ratios(_P), _PCA().fit(_P).explained_variance_ratio_), "variance_ratios disagrees with PCA's explained_variance_ratio_. Centre the data first, then square the singular values and divide by their sum."
_X = _lw().data
assert _np.allclose(raw, _PCA().fit(_X).explained_variance_ratio_), "raw should be the ratios for the unscaled wine data."
assert _np.allclose(scaled, _PCA().fit(_SS().fit_transform(_X)).explained_variance_ratio_), "scaled should be the ratios after standardising each column."
"SUCCESS: Unscaled, one component takes 99.8% (it is just proline's large numbers); standardised, the variance spreads out: 36%, 19%, 11%, …"
```

Hint: `np.linalg.svd(centred, compute_uv=False)` returns only the singular values. Standardise with `(X - X.mean(axis=0)) / X.std(axis=0)`.
:::

::: challenge PCA from scratch [medium]
Write PCA yourself with three functions:

- `pca_fit(X, k)` returns a tuple `(mean, components)`: the column means, and the first `k` rows of `Vᵀ` from the SVD of the centred data (a `k × features` array).
- `pca_transform(X, mean, components)` returns the scores: centred data times the components' transpose.
- `pca_inverse(scores, mean, components)` maps scores back to the original space.

Then, on the digits, store in `errors` a dictionary mapping each `k` in `[5, 10, 20]` to the mean squared reconstruction error (the mean of `(X − reconstructed)²` over all values), and store in `discarded` a dictionary mapping the same `k` to the sum of the variances of the **discarded** directions divided by 64 (the variance along direction `i` is `S[i]² / n`, using the full SVD of the centred data; dividing by `n` rather than `n − 1` here matches `np.mean`, which divides by `n`). The two should match: reconstruction error is exactly the variance left out.

```python starter
import numpy as np
from sklearn.datasets import load_digits

def pca_fit(X, k):
    return X.mean(axis=0), np.zeros((k, X.shape[1]))

def pca_transform(X, mean, components):
    return np.zeros((len(X), len(components)))

def pca_inverse(scores, mean, components):
    return np.tile(mean, (len(scores), 1))

X = load_digits().data
errors = {}
discarded = {}
print(errors, discarded)
```

```python solution
import numpy as np
from sklearn.datasets import load_digits

def pca_fit(X, k):
    mean = X.mean(axis=0)
    _, _, Vt = np.linalg.svd(X - mean, full_matrices=False)
    return mean, Vt[:k]

def pca_transform(X, mean, components):
    return (X - mean) @ components.T

def pca_inverse(scores, mean, components):
    return scores @ components + mean

X = load_digits().data
S = np.linalg.svd(X - X.mean(axis=0), compute_uv=False)
errors, discarded = {}, {}
for k in [5, 10, 20]:
    mean, components = pca_fit(X, k)
    rebuilt = pca_inverse(pca_transform(X, mean, components), mean, components)
    errors[k] = float(np.mean((X - rebuilt) ** 2))
    discarded[k] = float(np.sum(S[k:] ** 2) / len(X) / X.shape[1])
print(errors, discarded)
```

```python test
import numpy as _np
from sklearn.datasets import load_digits as _ld
from sklearn.decomposition import PCA as _PCA
assert "pca_fit" in dir() and "pca_transform" in dir() and "pca_inverse" in dir(), "Keep all three function names."
_r = _np.random.default_rng(4)
_P = _r.normal(size=(40, 5)) @ _r.normal(size=(5, 5)) + 3
_m, _c = pca_fit(_P, 2)
_sk = _PCA(2).fit(_P)
assert _np.allclose(_m, _sk.mean_), "pca_fit's mean should be the column means."
assert _np.shape(_c) == (2, 5), f"components should have shape (k, features) = (2, 5), not {_np.shape(_c)}."
assert _np.allclose(_np.abs(_c), _np.abs(_sk.components_)), "Your components differ from PCA's (ignoring sign). Take the first k rows of Vt from the SVD of the centred data."
_s = pca_transform(_P, _m, _c)
assert _np.allclose(_np.abs(_s), _np.abs(_sk.transform(_P))), "pca_transform should return (X − mean) @ components.T."
assert _np.allclose(pca_inverse(_s, _m, _c), _sk.inverse_transform(_sk.transform(_P))), "pca_inverse should return scores @ components + mean."
_X = _ld().data
_S = _np.linalg.svd(_X - _X.mean(axis=0), compute_uv=False)
for _k in [5, 10, 20]:
    _p = _PCA(_k).fit(_X)
    _e = _np.mean((_X - _p.inverse_transform(_p.transform(_X))) ** 2)
    assert _np.isclose(errors[_k], _e), f"errors[{_k}] should be {_e:.4f}."
    assert _np.isclose(discarded[_k], _np.sum(_S[_k:] ** 2) / len(_X) / 64), f"discarded[{_k}] should be the sum of S[{_k}:]² divided by n and by 64."
    assert _np.isclose(errors[_k], discarded[_k]), "The two dictionaries should agree."
"SUCCESS: Reconstruction error is exactly the variance in the directions you dropped, which is why keeping the largest ones is the best possible choice."
```

Hint: In `pca_fit`, use `np.linalg.svd(X - mean, full_matrices=False)` and keep `Vt[:k]`. The variance along direction `i` uses `S[i] ** 2 / n`; sum the ones from `k` onwards and divide by the 64 features to compare with a mean over all values.
:::

::: challenge Enough components [medium]
Write `components_for(X, fraction)` **without** scikit-learn's `PCA`: from the singular values of the centred data (`np.linalg.svd(..., compute_uv=False)`), compute the explained variance ratios, and return the smallest number of components whose cumulative ratio is at least `fraction` (components are counted from 1).

Then use it on the wine data to see how much scaling changes the answer: store the number of components needed for 90% of the variance of the **raw** wine data in `k_raw`, and of the **standardised** data (each column minus its mean, divided by its standard deviation) in `k_scaled`.

```python starter
import numpy as np
from sklearn.datasets import load_wine

def components_for(X, fraction):
    return X.shape[1]

X = load_wine().data
k_raw = components_for(X, 0.9)
k_scaled = components_for(X, 0.9)
print(k_raw, k_scaled)
```

```python solution
import numpy as np
from sklearn.datasets import load_wine

def components_for(X, fraction):
    S = np.linalg.svd(X - X.mean(axis=0), compute_uv=False)
    kept = np.cumsum(S ** 2 / np.sum(S ** 2))
    return int(np.argmax(kept >= fraction)) + 1

X = load_wine().data
k_raw = components_for(X, 0.9)
k_scaled = components_for((X - X.mean(axis=0)) / X.std(axis=0), 0.9)
print(k_raw, k_scaled)
```

```python test
import numpy as _np
from sklearn.datasets import load_wine as _lw, load_digits as _ld
from sklearn.decomposition import PCA as _PCA
from sklearn.preprocessing import StandardScaler as _SS
assert "components_for" in dir(), "Keep the function's name as components_for."
assert "PCA" not in _source, "Work from the singular values with np.linalg.svd, without scikit-learn's PCA."
_line = _np.column_stack([_np.arange(20.0), 2 * _np.arange(20.0), _np.zeros(20)])
assert components_for(_line, 0.99) == 1, "Points on a line need just 1 component for 99% of the variance."
_D = _ld().data
for _f in (0.5, 0.9):
    _want = int(_np.argmax(_np.cumsum(_PCA().fit(_D).explained_variance_ratio_) >= _f)) + 1
    assert components_for(_D, _f) == _want, f"For {_f:.0%} of the digits' variance you need {_want} components, but got {components_for(_D, _f)}. Did you centre the data? Components count from 1, positions from 0."
_W = _lw().data
_kr = int(_np.argmax(_np.cumsum(_PCA().fit(_W).explained_variance_ratio_) >= 0.9)) + 1
_ks = int(_np.argmax(_np.cumsum(_PCA().fit(_SS().fit_transform(_W)).explained_variance_ratio_) >= 0.9)) + 1
assert k_raw == _kr and k_scaled == _ks, f"k_raw should be {_kr} and k_scaled {_ks}."
f"SUCCESS: Raw wine 'needs' {_kr} component for 90% of its variance, because proline's big numbers are almost all of it; standardised, it needs {_ks}. The answer to 'how many dimensions does this data have?' depends on the units you measured it in."
```

Hint: Centre with `X - X.mean(axis=0)`, take the singular values, and divide their squares by the sum of squares. `np.cumsum` then `np.argmax(kept >= fraction) + 1`.
:::

## What you learned

- PCA finds orthogonal directions of greatest variance in centred data: the rows of `Vᵀ` from the SVD (equivalently, eigenvectors of the covariance matrix). The variance along direction `i` is `S[i]²/(n − 1)`.
- Scores are projections onto the first `k` directions; `inverse_transform` reconstructs, and the reconstruction error equals the variance in the discarded directions. PCA minimises perpendicular distances, unlike regression.
- `explained_variance_ratio_` and its cumulative sum show how many components to keep: 21 of 64 for 90% of the digits' variance.
- Components can be drawn as patterns of variation; a few scores rebuild a recognisable digit.
- Standardise unless features share meaningful units (unscaled wine: 99.8% "proline"). High variance is not the same as usefulness for a label, and PCA is linear.
- PCA is a transformer: put it in a pipeline before a model (20 components gave 0.92 on the digits against 0.93 with all 64).

PCA's two-dimensional picture of the digits showed some groups but jumbled others, because a flat projection cannot untangle curved structure. The next lesson's method, t-SNE, draws far clearer pictures of high-dimensional data, and comes with important warnings about what those pictures do and do not mean.
