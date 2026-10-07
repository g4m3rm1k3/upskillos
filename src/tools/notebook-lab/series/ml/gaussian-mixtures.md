# Gaussian mixtures and EM

k-means makes a hard decision for every point: this cluster, not that one. Often the honest answer is softer. A person 171 cm tall, from a population mixing two groups with average heights 164 cm and 178 cm, could belong to either group; a sensible model should say something like "about 59% the first, 41% the second". k-means also insists clusters are round and similar in size. Real clusters are often stretched, tilted, or very different in spread.

A **Gaussian mixture model** fixes both. It describes the data as coming from several **normal distributions** (bell curves, also called Gaussians), each with its own centre, spread and shape, mixed in some proportions. Fitting it gives every point a **probability** of belonging to each cluster. The algorithm that fits it, **EM** (expectation–maximisation), is one of the most important ideas in statistics, and k-means turns out to be its stripped-down special case.

## A mixture of bell curves

Suppose heights come from two groups: 60% of people from a group with mean 164 cm and standard deviation 6, and 40% from a group with mean 178 cm and standard deviation 7. The density of the whole population is a weighted sum of the two bell curves:

\[
p(x) = \pi_1 \, \mathcal{N}(x \mid \mu_1, \sigma_1^2) + \pi_2 \, \mathcal{N}(x \mid \mu_2, \sigma_2^2)
\]

where 𝒩(x | μ, σ²) is the normal density from the Naive Bayes lesson, and the **mixing weights** π₁ = 0.6 and π₂ = 0.4 add up to 1. A mixture can be read as a recipe for generating data: for each person, first pick a group (the first with probability 0.6), then draw a height from that group's bell curve.

```python type
import numpy as np
import matplotlib.pyplot as plt

def normal_pdf(x, mean, variance):
    return np.exp(-(x - mean) ** 2 / (2 * variance)) / np.sqrt(2 * np.pi * variance)

rng = np.random.default_rng(0)
heights = np.concatenate([rng.normal(164, 6, 300), rng.normal(178, 7, 200)])

grid = np.linspace(140, 205, 300)
first = 0.6 * normal_pdf(grid, 164, 6 ** 2)
second = 0.4 * normal_pdf(grid, 178, 7 ** 2)
fig, ax = plt.subplots(figsize=(6, 3.5))
ax.hist(heights, bins=40, density=True, alpha=0.4, label="500 heights")
ax.plot(grid, first, "--", label="0.6 × group 1")
ax.plot(grid, second, "--", label="0.4 × group 2")
ax.plot(grid, first + second, "k", label="mixture")
ax.legend(fontsize=8)
plt.show()
```

The histogram of the 500 simulated heights shows no clear gap: the groups overlap so much that the combined shape is just a lopsided hump. The task is the reverse of this cell: given only the heights, recover the two groups, their weights, means and spreads, without knowing which group anyone came from.

## The chicken-and-egg problem

If you knew which group each person came from, fitting would be easy: each group's weight, mean and variance are just its share, average and variance. If you knew the groups' parameters, the membership would be easy too: Bayes' rule gives each person's probability of belonging to each group. EM breaks the circle by alternating between the two, starting from a guess:

- **E-step** (expectation): with the current parameters, compute each point's **responsibilities**: the probability that it came from each component, by Bayes' rule:

\[
r_{ik} = \frac{\pi_k \, \mathcal{N}(x_i \mid \mu_k, \sigma_k^2)}{\sum_j \pi_j \, \mathcal{N}(x_i \mid \mu_j, \sigma_j^2)}
\]

- **M-step** (maximisation): refit each component as if the responsibilities were fractional memberships. A point with responsibility 0.7 for component 1 counts as 0.7 of a point there. With N_k = Σᵢ r_ik, the effective number of points in component k:

\[
\pi_k = \frac{N_k}{n}, \qquad \mu_k = \frac{1}{N_k}\sum_i r_{ik}\, x_i, \qquad \sigma_k^2 = \frac{1}{N_k}\sum_i r_{ik}\,(x_i - \mu_k)^2
\]

These are just a weighted share, a weighted mean and a weighted variance.

## EM from scratch

Run it on the heights, starting from a deliberately poor guess (means 150 and 190, standard deviations 10), and watch the **log-likelihood**, the log of the probability density of all the data under the current mixture, which measures how well the mixture fits:

```python type
import numpy as np

def normal_pdf(x, mean, variance):
    return np.exp(-(x - mean) ** 2 / (2 * variance)) / np.sqrt(2 * np.pi * variance)

rng = np.random.default_rng(0)
x = np.concatenate([rng.normal(164, 6, 300), rng.normal(178, 7, 200)])

weights = np.array([0.5, 0.5])
means = np.array([150.0, 190.0])
variances = np.array([100.0, 100.0])
for step in range(1, 101):
    weighted = weights * normal_pdf(x[:, None], means, variances)
    log_likelihood = np.log(weighted.sum(axis=1)).sum()
    R = weighted / weighted.sum(axis=1, keepdims=True)

    N = R.sum(axis=0)
    weights = N / len(x)
    means = (R * x[:, None]).sum(axis=0) / N
    variances = (R * (x[:, None] - means) ** 2).sum(axis=0) / N
    if step in (1, 2, 5, 20, 100):
        print(f"step {step:>3}: log-likelihood {log_likelihood:9.2f}, weights {weights.round(3)}, "
              f"means {means.round(1)}, sds {np.sqrt(variances).round(1)}")

weighted_171 = weights * normal_pdf(171.0, means, variances)
print("responsibilities for a height of 171:", (weighted_171 / weighted_171.sum()).round(3))
```

```output
step   1: log-likelihood  -2322.54, weights [0.54 0.46], means [162.8 177.2], sds [5.7 6.7]
step   2: log-likelihood  -1823.46, weights [0.542 0.458], means [162.9 177.2], sds [5.8 6.8]
step   5: log-likelihood  -1823.04, weights [0.545 0.455], means [163.  177.1], sds [5.9 7. ]
step  20: log-likelihood  -1822.97, weights [0.552 0.448], means [163.2 177.2], sds [6. 7.]
step 100: log-likelihood  -1822.92, weights [0.58 0.42], means [163.5 177.7], sds [6.1 6.8]
responsibilities for a height of 171: [0.538 0.462]
```

`normal_pdf(x[:, None], means, variances)` broadcasts the 500 heights against the 2 components, giving a 500 × 2 table of densities; multiplying by `weights` and dividing each row by its sum gives the responsibilities `R`, whose rows add to 1. The M-step lines are the three formulas above, with `R` as the weights.

The log-likelihood jumps from −2,323 to −1,823 in the first step and then creeps upwards, never down: **each EM step can only increase the likelihood** (or leave it unchanged), the same guarantee k-means had for its inertia. After 100 steps the estimates are weights 0.58/0.42, means 163.5 and 177.7, and standard deviations 6.1 and 6.8, close to the truth (0.6/0.4, 164 and 178, 6 and 7). They are still drifting slowly: with groups this overlapped, the likelihood is very flat near its peak, so EM needs many small steps.

The last line shows the soft assignment: a person 171 cm tall gets responsibilities of about 0.54 and 0.46. Not a confident answer, and it shouldn't be.

## k-means is hard EM

Compare the two algorithms. k-means alternates "assign each point to its nearest centre" with "move each centre to the mean of its points". EM alternates "give each point a probability for each component" with "move each component to the weighted mean of its points". If every component had the same fixed weight and the same small, fixed, round spread (not re-estimated in the M-step), and the responsibilities were rounded to 0 or 1, EM would become exactly k-means. The mixture model is the general version: soft memberships, and each cluster with its own size, spread and orientation.

## Shaped clusters in two dimensions

In two or more dimensions, each component is a **multivariate normal**: a bell-shaped hill with a centre (mean vector) and a **covariance matrix** that sets its spread in every direction, including tilted ones. Its contours are ellipses. scikit-learn's `GaussianMixture` fits these with EM.

Here are two long, flat clusters lying one above the other, a shape k-means cannot handle. Predict before running: will the default `GaussianMixture`, which starts from the k-means answer, find them?

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans
from sklearn.metrics import adjusted_rand_score
from sklearn.mixture import GaussianMixture

rng = np.random.default_rng(0)
stretch = np.array([[3.0, 0.0], [0.0, 0.4]])
X = np.vstack([rng.normal(size=(200, 2)) @ stretch, rng.normal(size=(200, 2)) @ stretch + [0, 2.5]])
y = np.repeat([0, 1], 200)

kmeans = KMeans(2, n_init=10, random_state=0).fit(X)
default_gmm = GaussianMixture(2, random_state=0).fit(X)
random_gmm = GaussianMixture(2, init_params="random_from_data", n_init=10, random_state=0).fit(X)
for name, labels in [("k-means", kmeans.labels_), ("mixture, k-means start", default_gmm.predict(X)),
                     ("mixture, 10 random starts", random_gmm.predict(X))]:
    print(f"{name:<26} ARI {adjusted_rand_score(y, labels):.2f}")
print(f"average log-likelihood per point: k-means start {default_gmm.score(X):.3f}, random starts {random_gmm.score(X):.3f}")

fig, axes = plt.subplots(1, 2, figsize=(9, 3.2), sharey=True)
axes[0].scatter(*X.T, c=kmeans.labels_, cmap="coolwarm", s=8)
axes[0].set_title("k-means", fontsize=9)
axes[1].scatter(*X.T, c=random_gmm.predict_proba(X)[:, 0], cmap="coolwarm", s=8)
axes[1].set_title("mixture: colour = probability of component 0", fontsize=9)
plt.show()
```

```output
k-means                    ARI -0.00
mixture, k-means start     ARI -0.00
mixture, 10 random starts  ARI 1.00
average log-likelihood per point: k-means start -4.210, random starts -3.708
```

Multiplying random points by `stretch` makes clouds 3 units wide but only 0.4 tall. k-means splits the data into left and right halves (ARI 0.00): for round clusters, that is the cheapest split. The mixture fitted with default settings does the same, because by default `GaussianMixture` **starts from the k-means answer**, and EM, like k-means, only climbs to the nearest peak of the likelihood.

Started from 10 random choices of data points instead (`init_params="random_from_data", n_init=10`), the mixture finds the two flat clusters perfectly (ARI 1.00). `score(X)` reports the average log-likelihood per point, and it settles the question without any labels: −3.71 for the right answer against −4.21 for the left/right split. **Higher likelihood means a better fit**, so when runs disagree, keep the one with the highest likelihood; `n_init` does exactly that. The right-hand plot is coloured by `predict_proba`, the responsibilities: solid colours inside each cluster, shading only where they meet.

The `covariance_type` setting controls how flexible each component's shape is: `"full"` (any ellipse, the default), `"diag"` (ellipses aligned with the axes), `"spherical"` (circles, as in k-means) or `"tied"` (all components share one shape). Fewer shape parameters mean less data needed, and less risk of overfitting.

## Choosing the number of components

Because a mixture is a probability model, choosing `k` can use the likelihood, but the likelihood alone always prefers more components, just as inertia did. **Information criteria** add a penalty for the number of parameters. The **BIC** (Bayesian information criterion) is

\[
\text{BIC} = -2 \ln L + p \ln n
\]

where ln L is the total log-likelihood, `p` the number of parameters and `n` the number of points. Lower is better: the first term rewards fit, the second charges for complexity.

```python type
from sklearn.datasets import make_blobs
from sklearn.mixture import GaussianMixture

X, _ = make_blobs(500, centers=4, cluster_std=[0.6, 1.0, 1.2, 0.8], random_state=11)
for k in range(1, 8):
    model = GaussianMixture(k, random_state=0).fit(X)
    print(f"k = {k}: BIC {model.bic(X):8.1f}")
```

```output
k = 1: BIC   5747.7
k = 2: BIC   4794.8
k = 3: BIC   4162.5
k = 4: BIC   4053.8
k = 5: BIC   4080.5
k = 6: BIC   4109.4
k = 7: BIC   4146.4
```

The BIC drops steeply to `k = 4` (4,054) and rises after that: the extra components improve the fit too little to pay for their parameters. With full covariances in 2 dimensions, each component costs 2 numbers for its mean, 3 for its covariance and 1 for its weight (minus one overall, since the weights must add to 1), so `p` = 6k − 1. You will compute the BIC yourself in a challenge.

## More than clustering

A fitted mixture is a full **density model**: it can say how probable any point is. `score_samples(X)` returns each point's log density, and points with very low density are unusual, which makes mixtures a tool for **anomaly detection**, the subject of a later lesson. And because a mixture is a recipe for generating data, `sample(n)` draws new, realistic-looking points from it: a first taste of the generative models near the end of this series.

EM itself reaches far beyond mixtures. Whenever a model has **hidden** quantities (which component made each point, a missing measurement, an unobserved state), EM alternates between estimating the hidden parts given the parameters and the parameters given the hidden parts, with the same guarantee that the likelihood never falls.

::: challenge The E-step [easy]
Write `normal_pdf(x, mean, variance)`, the normal density, which must work with arrays (including broadcasting), and `responsibilities(x, weights, means, variances)` for 1-D data: given an array of `n` points and arrays of `k` weights, means and variances, return the `n × k` array of responsibilities, each row adding up to 1.

```python starter
import numpy as np

def normal_pdf(x, mean, variance):
    return np.zeros_like(x, dtype=float)

def responsibilities(x, weights, means, variances):
    return np.full((len(x), len(weights)), 1 / len(weights))

print(responsibilities(np.array([160.0, 171.0, 185.0]), np.array([0.6, 0.4]), np.array([164.0, 178.0]), np.array([36.0, 49.0])).round(3))
```

```python solution
import numpy as np

def normal_pdf(x, mean, variance):
    return np.exp(-(x - mean) ** 2 / (2 * variance)) / np.sqrt(2 * np.pi * variance)

def responsibilities(x, weights, means, variances):
    weighted = weights * normal_pdf(np.asarray(x)[:, None], means, variances)
    return weighted / weighted.sum(axis=1, keepdims=True)

print(responsibilities(np.array([160.0, 171.0, 185.0]), np.array([0.6, 0.4]), np.array([164.0, 178.0]), np.array([36.0, 49.0])).round(3))
```

```python test
import numpy as _np
from scipy.stats import norm as _norm
assert "normal_pdf" in dir() and "responsibilities" in dir(), "Keep both function names."
assert _np.isclose(normal_pdf(0.0, 0.0, 1.0), 1 / _np.sqrt(2 * _np.pi)), "normal_pdf(0, 0, 1) should be 1/√(2π) ≈ 0.399."
assert _np.allclose(normal_pdf(_np.array([1.0, 5.0]), 2.0, 4.0), _norm.pdf([1.0, 5.0], 2.0, 2.0)), "normal_pdf is wrong for variance 4: remember the formula uses the variance, and the standard deviation is its square root."
_x = _np.array([160.0, 171.0, 185.0])
_w, _m, _v = _np.array([0.6, 0.4]), _np.array([164.0, 178.0]), _np.array([36.0, 49.0])
_R = responsibilities(_x, _w, _m, _v)
_d = _w * _norm.pdf(_x[:, None], _m, _np.sqrt(_v))
_want = _d / _d.sum(axis=1, keepdims=True)
assert _np.shape(_R) == (3, 2), f"The result should have one row per point and one column per component: shape (3, 2), not {_np.shape(_R)}."
assert _np.allclose(_R.sum(axis=1), 1), "Each row of responsibilities should add up to 1."
assert _np.allclose(_R, _want), "The responsibilities are wrong. Multiply each component's density by its weight, then divide each row by its sum."
_R3 = responsibilities(_np.array([0.0, 4.0]), _np.array([0.2, 0.3, 0.5]), _np.array([0.0, 2.0, 4.0]), _np.array([1.0, 1.0, 4.0]))
_d3 = _np.array([0.2, 0.3, 0.5]) * _norm.pdf(_np.array([0.0, 4.0])[:, None], [0.0, 2.0, 4.0], [1.0, 1.0, 2.0])
assert _np.allclose(_R3, _d3 / _d3.sum(axis=1, keepdims=True)), "Make it work for any number of components."
"SUCCESS: Bayes' rule, once per point and component: the soft assignment at the heart of EM."
```

Hint: Broadcasting `x[:, None]` (shape `(n, 1)`) against the `k` means gives an `(n, k)` table of densities. Multiply by `weights`, then divide by the row sums with `keepdims=True`.
:::

::: challenge The M-step [easy]
Write `m_step(x, R)` for 1-D data `x` (length `n`) and responsibilities `R` (shape `n × k`). Return a tuple `(weights, means, variances)` of length-`k` arrays, using the weighted formulas: N_k is the sum of column `k` of `R`; the weight is N_k / n; the mean is the `R`-weighted mean of `x`; the variance is the `R`-weighted mean of the squared differences from the **new** mean.

Then run 50 full EM steps (your E-step from the previous challenge is provided in the starter as `responsibilities`) on the starter's data, from the starting guess given, and store the final parameters in `weights`, `means` and `variances`.

```python starter
import numpy as np

def normal_pdf(x, mean, variance):
    return np.exp(-(x - mean) ** 2 / (2 * variance)) / np.sqrt(2 * np.pi * variance)

def responsibilities(x, weights, means, variances):
    weighted = weights * normal_pdf(x[:, None], means, variances)
    return weighted / weighted.sum(axis=1, keepdims=True)

def m_step(x, R):
    k = R.shape[1]
    return np.full(k, 1 / k), np.zeros(k), np.ones(k)

rng = np.random.default_rng(1)
x = np.concatenate([rng.normal(2.0, 0.5, 150), rng.normal(5.0, 1.0, 250)])
weights, means, variances = np.array([0.5, 0.5]), np.array([1.0, 6.0]), np.array([1.0, 1.0])
print(weights, means, variances)
```

```python solution
import numpy as np

def normal_pdf(x, mean, variance):
    return np.exp(-(x - mean) ** 2 / (2 * variance)) / np.sqrt(2 * np.pi * variance)

def responsibilities(x, weights, means, variances):
    weighted = weights * normal_pdf(x[:, None], means, variances)
    return weighted / weighted.sum(axis=1, keepdims=True)

def m_step(x, R):
    N = R.sum(axis=0)
    weights = N / len(x)
    means = (R * x[:, None]).sum(axis=0) / N
    variances = (R * (x[:, None] - means) ** 2).sum(axis=0) / N
    return weights, means, variances

rng = np.random.default_rng(1)
x = np.concatenate([rng.normal(2.0, 0.5, 150), rng.normal(5.0, 1.0, 250)])
weights, means, variances = np.array([0.5, 0.5]), np.array([1.0, 6.0]), np.array([1.0, 1.0])
for _ in range(50):
    weights, means, variances = m_step(x, responsibilities(x, weights, means, variances))
print(weights, means, variances)
```

```python test
import numpy as _np
assert "m_step" in dir(), "Keep the function's name as m_step."
_x = _np.array([1.0, 2.0, 3.0, 10.0])
_R = _np.array([[1.0, 0.0], [1.0, 0.0], [0.5, 0.5], [0.0, 1.0]])
_w, _m, _v = m_step(_x, _R)
assert _np.allclose(_w, [2.5 / 4, 1.5 / 4]), f"The weights should be the column sums of R divided by n: [0.625, 0.375], but got {_np.round(_w, 3)}."
assert _np.allclose(_m, [(1 + 2 + 1.5) / 2.5, (1.5 + 10) / 1.5]), f"The means should be R-weighted means: [1.8, 7.667], but got {_np.round(_m, 3)}."
_vw = [((1 - 1.8) ** 2 + (2 - 1.8) ** 2 + 0.5 * (3 - 1.8) ** 2) / 2.5, (0.5 * (3 - 23 / 3) ** 2 + (10 - 23 / 3) ** 2) / 1.5]
assert _np.allclose(_v, _vw), f"The variances should be R-weighted mean squared differences from the NEW means, {_np.round(_vw, 3)}, but got {_np.round(_v, 3)}."
_r = _np.random.default_rng(1)
_xx = _np.concatenate([_r.normal(2.0, 0.5, 150), _r.normal(5.0, 1.0, 250)])
_pdf = lambda x, m, v: _np.exp(-(x - m) ** 2 / (2 * v)) / _np.sqrt(2 * _np.pi * v)
_W, _M, _V = _np.array([0.5, 0.5]), _np.array([1.0, 6.0]), _np.array([1.0, 1.0])
for _ in range(50):
    _d = _W * _pdf(_xx[:, None], _M, _V)
    _RR = _d / _d.sum(axis=1, keepdims=True)
    _N = _RR.sum(axis=0)
    _W, _M = _N / len(_xx), (_RR * _xx[:, None]).sum(axis=0) / _N
    _V = (_RR * (_xx[:, None] - _M) ** 2).sum(axis=0) / _N
assert _np.allclose(weights, _W) and _np.allclose(means, _M) and _np.allclose(variances, _V), f"After 50 EM steps the parameters should be weights {_W.round(3)}, means {_M.round(3)}, variances {_V.round(3)}."
f"SUCCESS: EM recovered the mixture: weights {_W.round(2)}, means {_M.round(2)}, standard deviations {_np.sqrt(_V).round(2)} (the truth: 0.375/0.625, 2 and 5, 0.5 and 1)."
```

Hint: `N = R.sum(axis=0)` gives one effective count per component. `(R * x[:, None]).sum(axis=0) / N` is the weighted mean; compute the means first, then use them for the variances.
:::

::: challenge BIC by hand [medium]
Compute the BIC of a fitted `GaussianMixture` yourself. For a mixture with full covariances, `k` components and `d` features, the number of parameters is

`p = k·d` (means) `+ k·d(d + 1)/2` (covariances) `+ (k − 1)` (weights).

The total log-likelihood is `model.score(X) * len(X)` (since `score` is the average per point). Write `bic(model, X)` returning `-2 * total_log_likelihood + p * ln(n)`, using `model.n_components` and `X.shape`.

Then, for the starter's data, fit `GaussianMixture(k, random_state=0)` for `k` from 1 to 6, store your BIC values in a list `bics`, and the `k` with the lowest BIC in `best_k`.

```python starter
import numpy as np
from sklearn.datasets import make_blobs
from sklearn.mixture import GaussianMixture

def bic(model, X):
    return 0.0

X, _ = make_blobs(400, n_features=3, centers=3, cluster_std=[0.5, 1.0, 1.5], random_state=2)
bics = []
best_k = None
print(bics, best_k)
```

```python solution
import numpy as np
from sklearn.datasets import make_blobs
from sklearn.mixture import GaussianMixture

def bic(model, X):
    n, d = X.shape
    k = model.n_components
    p = k * d + k * d * (d + 1) / 2 + (k - 1)
    return -2 * model.score(X) * n + p * np.log(n)

X, _ = make_blobs(400, n_features=3, centers=3, cluster_std=[0.5, 1.0, 1.5], random_state=2)
bics = [bic(GaussianMixture(k, random_state=0).fit(X), X) for k in range(1, 7)]
best_k = int(np.argmin(bics)) + 1
print(bics, best_k)
```

```python test
import numpy as _np
from sklearn.datasets import make_blobs as _mb
from sklearn.mixture import GaussianMixture as _GM
assert "bic" in dir(), "Keep the function's name as bic."
assert ".bic(" not in _source, "Compute the BIC yourself rather than calling model.bic."
_X2, _ = _mb(200, centers=2, random_state=0)
for _k in (1, 3):
    _g = _GM(_k, random_state=0).fit(_X2)
    assert _np.isclose(bic(_g, _X2), _g.bic(_X2)), f"For k = {_k} in 2 dimensions your BIC is {bic(_g, _X2):.2f} but scikit-learn's is {_g.bic(_X2):.2f}. With d = 2, each component has 2 mean values and 3 covariance values, plus k − 1 weights in total."
_X, _ = _mb(400, n_features=3, centers=3, cluster_std=[0.5, 1.0, 1.5], random_state=2)
_g3 = _GM(2, random_state=0).fit(_X)
assert _np.isclose(bic(_g3, _X), _g3.bic(_X)), "Your BIC is wrong in 3 dimensions: the covariance matrix has d(d + 1)/2 = 6 free values."
_want = [_GM(k, random_state=0).fit(_X).bic(_X) for k in range(1, 7)]
assert len(bics) == 6 and _np.allclose(bics, _want), "bics should hold your BIC for k = 1 to 6, in order."
assert best_k == int(_np.argmin(_want)) + 1, f"best_k should be {int(_np.argmin(_want)) + 1}."
f"SUCCESS: The BIC is lowest at k = {best_k}: fit rewarded, parameters charged for, and the right number of groups chosen without labels."
```

Hint: A symmetric `d × d` covariance matrix has `d(d + 1)/2` free values (the diagonal plus one triangle). `np.log` is the natural log. `np.argmin(bics)` is a position, so add 1 to get `k`.
:::

## What you learned

- A Gaussian mixture models the data as a weighted sum of normal distributions; it is also a recipe for generating data: pick a component by its weight, then draw from it.
- EM fits it by alternating the E-step (responsibilities by Bayes' rule: each point's probability of each component) and the M-step (weights, means and variances recomputed with the responsibilities as fractional counts). The log-likelihood never decreases.
- k-means is EM with hard assignments and equal round clusters; mixtures give soft memberships and clusters of any size, spread and orientation (`covariance_type`).
- EM finds a local optimum that depends on the start; `GaussianMixture` starts from k-means by default. Use several starts (`n_init`, random initialisation) and keep the highest likelihood.
- Choose the number of components with the BIC, −2 ln L + p ln n (lower is better).
- A fitted mixture is a density model: low-density points are anomalies (`score_samples`), and `sample` generates new data.

All the clustering so far has tried to group points. The next lesson asks a different unsupervised question: can data with many features be described with far fewer, without losing what matters? That is principal component analysis, built from the SVD you met earlier in the series.
