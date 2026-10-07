# Visualising high-dimensional data

The PCA lesson squashed the 64-dimensional digits onto a flat plane and found some structure, but most digits overlapped in a jumble. That is not because the digits lack structure; it is because a flat projection cannot untangle it. Pictures of high-dimensional data are enormously useful, for spotting groups, outliers, mislabelled examples and whether a problem is easy or hard, so methods that draw better pictures matter.

This lesson is about **t-SNE** (t-distributed stochastic neighbour embedding), the most widely used method for drawing high-dimensional data in two dimensions. It produces striking pictures, and it is also one of the most misread tools in data science. So the lesson has two halves: how t-SNE works and what it shows well, and then four experiments that show what its pictures do **not** mean.

## Keep the neighbours, not the distances

PCA tries to preserve **variance**: the big, global directions of spread. That is why it cannot untangle curved structure: a curled-up sheet projected flat lands on top of itself. t-SNE gives up on the global picture and preserves something else: **who is near whom**. If two points are close neighbours in 64 dimensions, they should be close in the picture; how far apart distant points end up hardly matters.

It works in three steps:

1. **Similarities in the original space.** For each point `i`, turn distances to the other points into probabilities with a bell curve centred on `i`: nearby points get high probability, far ones nearly zero. The width of each bell curve is chosen separately for each point, so that its **perplexity**, roughly the effective number of neighbours it considers, matches a setting you choose (typically 5 to 50). Points in dense regions get narrow curves, points in sparse regions wide ones. The probabilities are then made symmetric, p_ij = (p(j | i) + p(i | j)) / 2n, so that the similarity of `i` to `j` equals that of `j` to `i`.
2. **Similarities in the picture.** Place the points in 2-D (randomly at first) and measure their similarities with a **Student-t** curve, (1 + d²)⁻¹, normalised to sum to 1, giving q_ij. Its heavy tails let moderately distant points sit far apart in the picture, which leaves room for the clusters to separate (this solves the "crowding problem": there is not enough room in 2-D for every neighbourhood of a 64-D space).
3. **Make the two agree.** Move the 2-D points by gradient descent to minimise the **Kullback–Leibler divergence**, Σ p_ij log(p_ij / q_ij), a measure of how different two probability distributions are: 0 when they are identical, and positive otherwise.

That loss is lopsided, and it explains most of t-SNE's behaviour. If two points are neighbours in the original space (large p_ij) but far apart in the picture (small q_ij), the term p log(p/q) is large: heavily punished. If two points are far apart in the original space (p_ij near 0) but close in the picture, the term is near zero: hardly punished at all. So t-SNE works hard to keep neighbours together, and does not care much about anything else.

## t-SNE on the digits

Compare PCA and t-SNE on 600 digits. (t-SNE is slow, since every step involves all pairs of points; this cell takes several seconds.) Before running it, picture what you expect: will t-SNE separate all ten digits?

```python type
import matplotlib.pyplot as plt
from sklearn.datasets import load_digits
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE, trustworthiness

digits = load_digits()
X, y = digits.data[:600], digits.target[:600]
flat = PCA(n_components=2).fit_transform(X)
embedded = TSNE(n_components=2, perplexity=30, random_state=0).fit_transform(X)

fig, axes = plt.subplots(1, 2, figsize=(10, 4.5))
for ax, points, title in [(axes[0], flat, "PCA"), (axes[1], embedded, "t-SNE")]:
    ax.scatter(points[:, 0], points[:, 1], c=y, cmap="tab10", s=8)
    for digit in range(10):
        centre = points[y == digit].mean(axis=0)
        ax.text(centre[0], centre[1], str(digit), fontsize=14, weight="bold")
    ax.set_title(title)
plt.show()

print(f"trustworthiness: PCA {trustworthiness(X, flat, n_neighbors=10):.3f}, t-SNE {trustworthiness(X, embedded, n_neighbors=10):.3f}")
```

```output
trustworthiness: PCA 0.837, t-SNE 0.992
```

`TSNE(n_components=2, perplexity=30)` sets the output dimension and the effective number of neighbours; `fit_transform` returns the 2-D positions. The digits' labels are used only to colour the points: t-SNE, like PCA, never sees them.

The t-SNE picture separates the ten digits into ten distinct islands, with only a few points in the wrong place, where PCA's picture was a jumble. **Trustworthiness**, a score from 0 to 1, measures how far the picture can be trusted locally: it penalises points that appear among a point's 10 nearest neighbours in the picture but were not near it in the original data. PCA scores 0.837; t-SNE 0.992. For showing who is near whom, t-SNE is far better.

The few stray points are often the most interesting: a 1 sitting among the 7s may be a badly written 1, or a mislabelled one. Drawing a t-SNE map and looking at its strays is a quick way to find label errors in a dataset.

## Experiment 1: cluster sizes mean nothing

Make two clusters in 10 dimensions, one tight (standard deviation 0.3) and one ten times wider (standard deviation 3), and look at how big they appear:

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.manifold import TSNE

rng = np.random.default_rng(0)
tight = rng.normal(0, 0.3, (150, 10))
wide = rng.normal(0, 3.0, (150, 10)) + 20
embedded = TSNE(n_components=2, perplexity=30, random_state=0).fit_transform(np.vstack([tight, wide]))
print("spread in 10-D:  tight", tight.std().round(2), " wide", wide.std().round(2))
print("spread in t-SNE: tight", embedded[:150].std(axis=0).round(2), " wide", embedded[150:].std(axis=0).round(2))

fig, ax = plt.subplots(figsize=(5, 3.5))
ax.scatter(*embedded[:150].T, s=6, label="tight cluster")
ax.scatter(*embedded[150:].T, s=6, label="wide cluster")
ax.legend(fontsize=8)
plt.show()
```

```output
spread in 10-D:  tight 0.3  wide 3.0
spread in t-SNE: tight [3.53 3.5 ]  wide [3.49 3.57]
```

In the picture the two clusters are the **same size**: spreads of about 3.5 for both. This is the per-point bell-curve width at work: each point's neighbourhood is scaled to contain about `perplexity` neighbours, whatever the local density, so dense and sparse clusters are both expanded or shrunk to a similar size. In a t-SNE picture, a big cluster is not a spread-out one.

## Experiment 2: distances between clusters mean little

Now three clusters in 10 dimensions: A and B are 6 units apart, while C is 60 units from A, ten times farther:

```python type
import numpy as np
from sklearn.manifold import TSNE

rng = np.random.default_rng(0)
offset = lambda distance: np.array([distance] + [0] * 9)
A = rng.normal(0, 1, (100, 10))
B = rng.normal(0, 1, (100, 10)) + offset(6)
C = rng.normal(0, 1, (100, 10)) + offset(60)
embedded = TSNE(n_components=2, perplexity=30, random_state=0).fit_transform(np.vstack([A, B, C]))
centres = [embedded[i * 100:(i + 1) * 100].mean(axis=0) for i in range(3)]
print("distances between cluster centres in 10-D:  A–B 6, A–C 60, B–C 54")
print(f"distances in the t-SNE picture:             A–B {np.linalg.norm(centres[0] - centres[1]):.1f}, "
      f"A–C {np.linalg.norm(centres[0] - centres[2]):.1f}, B–C {np.linalg.norm(centres[1] - centres[2]):.1f}")
```

```output
distances between cluster centres in 10-D:  A–B 6, A–C 60, B–C 54
distances in the t-SNE picture:             A–B 24.6, A–C 36.5, B–C 61.0
```

In the original space, C is ten times farther from A than B is. In the picture the ratio is about 1.5: A–B 24.6 and A–C 36.5. The order happens to survive here, but the proportions do not, and on real data even the order often fails. Since the loss barely cares where unrelated points go, the gaps between islands carry little information. "These two clusters are close in the t-SNE plot, so they must be similar" is a conclusion t-SNE cannot support.

## Experiment 3: perplexity changes the picture, even for noise

Perplexity sets how many neighbours each point pays attention to. Here is pure random noise, 300 points from a single 10-D bell curve, drawn at four perplexities. There are no clusters in this data at all. Before running, guess: will any of the four pictures show clusters anyway?

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.manifold import TSNE

noise = np.random.default_rng(0).normal(size=(300, 10))
fig, axes = plt.subplots(1, 4, figsize=(12, 3))
for ax, perplexity in zip(axes, [2, 5, 30, 100]):
    embedded = TSNE(n_components=2, perplexity=perplexity, random_state=0).fit_transform(noise)
    ax.scatter(*embedded.T, s=5)
    ax.set_title(f"perplexity {perplexity}", fontsize=9)
plt.show()
```

At perplexity 2, each point only cares about its two nearest neighbours, and the picture breaks into many small clumps and strands: structure that **does not exist**, made from random noise. At perplexity 5 there are still strands. At 30 and 100 the picture is the honest featureless ball. Small clusters in a low-perplexity t-SNE plot may be nothing but noise; always check that a pattern persists across several perplexities.

## A fourth caution: every run differs

t-SNE starts from random positions and its loss has many local minima, so different `random_state` values give different pictures: islands appear in different places, rotated or mirrored, sometimes arranged differently. Treat the arrangement of islands as arbitrary, and if a conclusion depends on it, rerun with other seeds before believing it.

## Using t-SNE well

- Use it to **look**, not to measure: to see whether groups exist, which examples are odd, whether labels look consistent.
- Don't read cluster sizes or the distances between clusters, and confirm patterns across several perplexities and seeds.
- Don't feed t-SNE coordinates into another model as features: the map is distorted, and scikit-learn's `TSNE` has no `transform` for new points, because the embedding is computed for exactly these points. Use PCA, or the original features, for modelling.
- For more than a few thousand points, reduce first with PCA to around 50 dimensions; this removes noise and speeds t-SNE up a great deal.
- **UMAP**, a newer method (in the separate `umap-learn` package), draws similar maps faster, keeps somewhat more of the global layout, and can place new points; the same cautions apply.

::: challenge Similarities in the picture [easy]
Write `student_t_similarities(Y)` that computes t-SNE's similarities between all pairs of 2-D points: for each pair `i ≠ j`, the value (1 + ‖yᵢ − yⱼ‖²)⁻¹, with 0 on the diagonal, and the whole matrix divided by its total so that all entries add up to 1.

```python starter
import numpy as np

def student_t_similarities(Y):
    return np.zeros((len(Y), len(Y)))

Y = np.array([[0.0, 0.0], [1.0, 0.0], [0.0, 3.0]])
print(student_t_similarities(Y).round(3))
```

```python solution
import numpy as np

def student_t_similarities(Y):
    squared = ((Y[:, None, :] - Y[None, :, :]) ** 2).sum(axis=2)
    kernel = 1 / (1 + squared)
    np.fill_diagonal(kernel, 0)
    return kernel / kernel.sum()

Y = np.array([[0.0, 0.0], [1.0, 0.0], [0.0, 3.0]])
print(student_t_similarities(Y).round(3))
```

```python test
import numpy as _np
assert "student_t_similarities" in dir(), "Keep the function's name as student_t_similarities."
_Y = _np.array([[0.0, 0.0], [1.0, 0.0], [0.0, 3.0]])
_Q = _np.asarray(student_t_similarities(_Y))
assert _Q.shape == (3, 3), f"The result should be a 3 × 3 matrix, not shape {_Q.shape}."
assert _np.allclose(_np.diag(_Q), 0), "The diagonal (a point with itself) should be 0."
assert _np.isclose(_Q.sum(), 1.0), "All entries together should add up to 1."
_k = _np.array([[0, 1 / 2, 1 / 10], [1 / 2, 0, 1 / 11], [1 / 10, 1 / 11, 0]])
assert _np.allclose(_Q, _k / _k.sum()), "The values are wrong. Use (1 + squared distance)⁻¹: for points 1 apart that is 1/2, for points 3 apart 1/10."
assert _np.allclose(_Q, _Q.T), "The matrix should be symmetric."
_r = _np.random.default_rng(1).normal(size=(6, 2))
_d = ((_r[:, None] - _r[None]) ** 2).sum(axis=2)
_kk = 1 / (1 + _d)
_np.fill_diagonal(_kk, 0)
assert _np.allclose(student_t_similarities(_r), _kk / _kk.sum()), "Wrong for 6 random points."
"SUCCESS: The heavy-tailed similarity that gives t-SNE's clusters room to separate."
```

Hint: Compute all squared distances with broadcasting, take `1 / (1 + squared)`, set the diagonal to zero with `np.fill_diagonal`, then divide by the sum of everything.
:::

::: challenge Finding sigma for a perplexity [medium]
For point `i`, t-SNE's conditional probabilities are p(j | i) = exp(−‖xᵢ − xⱼ‖² / 2σ²) normalised over all `j ≠ i` (with p(i | i) = 0). The **perplexity** of these probabilities is 2 to the power of their entropy, 2^(−Σⱼ p log₂ p) (skipping zero entries); a wider σ spreads the probability over more neighbours, so the perplexity rises with σ.

Write:

- `conditional_p(X, i, sigma)`, returning the length-`n` array of p(j | i);
- `perplexity(p)`;
- `find_sigma(X, i, target)`, which finds σ by **binary search**: start with `low = 1e-3` and `high = 1e3`; 60 times, try `mid = (low + high) / 2`, and if the perplexity at `mid` is too large, set `high = mid`, otherwise `low = mid`. Return the final `mid`.

Then store σ for point 0 of the first 300 digits at perplexity 30 in `sigma_30`, and at perplexity 5 in `sigma_5`.

```python starter
import numpy as np
from sklearn.datasets import load_digits

def conditional_p(X, i, sigma):
    return np.full(len(X), 1 / len(X))

def perplexity(p):
    return 1.0

def find_sigma(X, i, target):
    return 1.0

X = load_digits().data[:300]
sigma_30 = find_sigma(X, 0, 30)
sigma_5 = find_sigma(X, 0, 5)
print(sigma_30, sigma_5)
```

```python solution
import numpy as np
from sklearn.datasets import load_digits

def conditional_p(X, i, sigma):
    squared = ((X - X[i]) ** 2).sum(axis=1)
    weights = np.exp(-(squared - squared[np.arange(len(X)) != i].min()) / (2 * sigma ** 2))
    weights[i] = 0.0
    return weights / weights.sum()

def perplexity(p):
    p = p[p > 0]
    return 2 ** (-np.sum(p * np.log2(p)))

def find_sigma(X, i, target):
    low, high = 1e-3, 1e3
    for _ in range(60):
        mid = (low + high) / 2
        if perplexity(conditional_p(X, i, mid)) > target:
            high = mid
        else:
            low = mid
    return mid

X = load_digits().data[:300]
sigma_30 = find_sigma(X, 0, 30)
sigma_5 = find_sigma(X, 0, 5)
print(sigma_30, sigma_5)
```

```python test
import numpy as _np
from sklearn.datasets import load_digits as _ld
assert "conditional_p" in dir() and "perplexity" in dir() and "find_sigma" in dir(), "Keep all three function names."
_X = _np.array([[0.0], [1.0], [2.0], [10.0]])
_p = _np.asarray(conditional_p(_X, 1, 1.0))
_w = _np.exp(-_np.array([1.0, 0.0, 1.0, 81.0]) / 2)
_w[1] = 0
assert _np.allclose(_p, _w / _w.sum()), f"For points 0, 1, 2, 10 and i = 1, sigma = 1, p(j | i) should be {_np.round(_w / _w.sum(), 4)}; got {_np.round(_p, 4)}. Use squared distances, exclude i itself, and normalise."
assert _np.isclose(perplexity(_np.array([0.25, 0.25, 0.25, 0.25, 0.0])), 4.0), "Four equally likely neighbours have perplexity exactly 4 (zeros are skipped)."
assert _np.isclose(perplexity(_np.array([0.5, 0.5])), 2.0), "Two equally likely neighbours have perplexity 2."
_D = _ld().data[:300]
for _target, _value in [(30, sigma_30), (5, sigma_5)]:
    assert abs(perplexity(conditional_p(_D, 0, _value)) - _target) < 0.01, f"With sigma = {_value:.4f}, the perplexity for point 0 should be {_target}, but it is {perplexity(conditional_p(_D, 0, _value)):.3f}."
assert sigma_5 < sigma_30, "A smaller perplexity needs a narrower bell curve, so sigma_5 should be smaller than sigma_30."
_s = find_sigma(_D, 7, 12)
assert abs(perplexity(conditional_p(_D, 7, _s)) - 12) < 0.01, "find_sigma should work for other points and targets too."
f"SUCCESS: For point 0, perplexity 30 needs sigma ≈ {sigma_30:.2f} and perplexity 5 only {sigma_5:.2f}: each point's bell curve is tuned to hold a set number of neighbours, which is why t-SNE forgets density."
```

Hint: Squared distances from point `i` are `((X - X[i]) ** 2).sum(axis=1)`. Very small σ can make every exponential underflow to 0; subtracting the smallest non-self squared distance before exponentiating avoids that without changing the normalised result. For the perplexity, keep only `p > 0` before taking `np.log2`.
:::

::: challenge Neighbours kept [medium]
Measure how well a picture keeps neighbourhoods. Write `neighbour_overlap(X_high, X_low, k)`: for each point, find its `k` nearest neighbours (excluding itself) in the original data and in the picture, and compute the fraction of the first set that also appears in the second. Return the average over all points. Use squared Euclidean distances and `np.argsort`.

The starter computes PCA and t-SNE pictures of 400 digits. Store the overlap with `k=10` for PCA in `overlap_pca`, and for t-SNE in `overlap_tsne`.

```python starter
import numpy as np
from sklearn.datasets import load_digits
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE

def neighbour_overlap(X_high, X_low, k):
    return 0.0

X = load_digits().data[:400]
flat = PCA(n_components=2).fit_transform(X)
embedded = TSNE(n_components=2, perplexity=30, random_state=0).fit_transform(X)
overlap_pca = neighbour_overlap(X, flat, 10)
overlap_tsne = neighbour_overlap(X, embedded, 10)
print(overlap_pca, overlap_tsne)
```

```python solution
import numpy as np
from sklearn.datasets import load_digits
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE

def nearest(Z, k):
    squared = ((Z[:, None, :] - Z[None, :, :]) ** 2).sum(axis=2)
    np.fill_diagonal(squared, np.inf)
    return np.argsort(squared, axis=1)[:, :k]

def neighbour_overlap(X_high, X_low, k):
    high, low = nearest(X_high, k), nearest(X_low, k)
    return float(np.mean([len(set(a) & set(b)) / k for a, b in zip(high, low)]))

X = load_digits().data[:400]
flat = PCA(n_components=2).fit_transform(X)
embedded = TSNE(n_components=2, perplexity=30, random_state=0).fit_transform(X)
overlap_pca = neighbour_overlap(X, flat, 10)
overlap_tsne = neighbour_overlap(X, embedded, 10)
print(overlap_pca, overlap_tsne)
```

```python test
import numpy as _np
assert "neighbour_overlap" in dir(), "Keep the function's name as neighbour_overlap."
_line = _np.arange(6.0).reshape(-1, 1)
assert _np.isclose(neighbour_overlap(_line, _line * 3, 2), 1.0), "Stretching a picture doesn't change anyone's neighbours, so the overlap should be 1."
_flip = _np.array([[0.0], [1.0], [10.0], [11.0]])
_scrambled = _np.array([[0.0], [10.0], [1.0], [11.0]])
assert _np.isclose(neighbour_overlap(_flip, _scrambled, 1), 0.0), "Here every point's nearest neighbour changes, so the overlap with k = 1 should be 0. Don't count a point as its own neighbour."
def _near(Z, k):
    d = ((Z[:, None] - Z[None]) ** 2).sum(axis=2)
    _np.fill_diagonal(d, _np.inf)
    return _np.argsort(d, axis=1)[:, :k]
def _ov(A, B, k):
    return _np.mean([len(set(a) & set(b)) / k for a, b in zip(_near(A, k), _near(B, k))])
_r = _np.random.default_rng(3)
_A, _B = _r.normal(size=(30, 5)), _r.normal(size=(30, 2))
assert _np.isclose(neighbour_overlap(_A, _B, 4), _ov(_A, _B, 4)), "Wrong overlap for random data with k = 4."
from sklearn.datasets import load_digits as _ld
from sklearn.decomposition import PCA as _PCA
_X = _ld().data[:400]
assert _np.isclose(overlap_pca, _ov(_X, _PCA(n_components=2).fit_transform(_X), 10)), "overlap_pca is wrong."
assert overlap_tsne > overlap_pca, "t-SNE should keep far more neighbours than PCA."
f"SUCCESS: PCA's flat projection keeps {overlap_pca:.0%} of each digit's 10 nearest neighbours; t-SNE keeps {overlap_tsne:.0%}. That is exactly what t-SNE is built for, and all it promises."
```

Hint: For each dataset, build the squared-distance matrix, set its diagonal to `np.inf` so a point is never its own neighbour, and take the first `k` columns of `np.argsort(..., axis=1)`. Python sets make the overlap easy: `len(set(a) & set(b))`.
:::

## What you learned

- t-SNE draws high-dimensional data in 2-D by preserving neighbourhoods: bell-curve similarities in the original space (widths set by the perplexity), heavy-tailed Student-t similarities in the picture, matched by minimising the KL divergence with gradient descent.
- Its loss punishes separating neighbours and barely cares about distant points, so local structure is kept and global structure is not. On the digits it separated all ten classes (trustworthiness 0.992 against PCA's 0.837).
- Cluster sizes mean nothing: each point's neighbourhood is scaled to hold about `perplexity` neighbours (a cluster 10 times wider looked the same size).
- Distances between clusters mean little (a 10× ratio became 1.5×).
- Low perplexity can make clusters out of pure noise; check patterns across perplexities and random seeds.
- Use t-SNE (or UMAP) for looking, not as features for models; reduce with PCA first for large data.

PCA and t-SNE both help reveal the ordinary structure of data. The next lesson turns to the opposite: the rare points that fit no structure at all. Anomaly detection finds fraud, faults and errors by learning what normal looks like.
