# Anomaly detection

A fraudulent card payment, a failing bearing in a turbine, a corrupted record in a database, a network intrusion: all are **anomalies**, examples that do not fit the pattern of the rest. Finding them is valuable, and hard in a particular way. Anomalies are rare, they take forms nobody anticipated (next month's fraud will not look like last month's), and there are seldom enough labelled examples to train a classifier. So **anomaly detection** usually works the other way round: learn what **normal** looks like, from data that is mostly normal, and flag whatever fits it badly.

This lesson works up from the simplest method, a z-score on one number, to four methods for many dimensions, each with a different idea of "fits badly": low probability density, distance from neighbours, density compared with neighbours, and ease of isolation. Along the way it shows why the obvious version of each idea can fail.

## One number: z-scores and masking

The simplest detector: flag values more than 3 standard deviations from the mean (a **z-score** above 3 in size). For a normal distribution, fewer than 0.3% of values lie that far out. Here are 200 normal readings around 50, with 20 faulty readings around 110 mixed in. Before running, predict: will the z-score rule catch all 20?

```python type
import numpy as np

rng = np.random.default_rng(0)
x = np.concatenate([rng.normal(50, 5, 200), rng.normal(110, 4, 20)])
faulty = np.r_[np.zeros(200, dtype=bool), np.ones(20, dtype=bool)]

z = (x - x.mean()) / x.std()
print(f"mean {x.mean():.1f}, standard deviation {x.std():.1f}")
print(f"z-score rule flags {(np.abs(z) > 3)[faulty].sum()} of 20 faulty readings")

median = np.median(x)
mad = np.median(np.abs(x - median))
robust_z = 0.6745 * (x - median) / mad
print(f"median {median:.1f}, MAD {mad:.2f}")
print(f"robust rule flags {(np.abs(robust_z) > 3.5)[faulty].sum()} of 20 faulty readings, "
      f"and {(np.abs(robust_z) > 3.5)[~faulty].sum()} normal ones")
```

```output
mean 55.6, standard deviation 18.0
z-score rule flags 10 of 20 faulty readings
median 50.9, MAD 3.80
robust rule flags 20 of 20 faulty readings, and 0 normal ones
```

The z-score rule catches only 10 of the 20. The anomalies have corrupted the very statistics used to find them: they drag the mean up to 56 and inflate the standard deviation from about 5 to 18, so the faulty readings no longer look extreme. This is called **masking**: enough outliers hide each other.

The fix is to measure the centre and spread with statistics that outliers cannot move much. The **median** ignores how extreme the extreme values are, and the **MAD** (median absolute deviation, the median distance from the median) does the same for spread. Scaled by 0.6745, so that it matches the standard deviation for normal data, this gives a **robust z-score**; the usual cut-off is 3.5. It catches all 20 faulty readings, with no false alarms. The lesson generalises: anomaly detectors should be built so that the anomalies themselves cannot distort what "normal" means.

## Many dimensions: four ideas

With many features, an anomaly may be unremarkable on every single feature and odd only in combination: a tall person who weighs very little, a large purchase at 4 a.m. from a new country. Four standard approaches, all in scikit-learn:

- **Density**: fit a probability model of the data, such as the Gaussian mixture from the mixtures lesson, and flag points where the density is low (`score_samples` gives the log density).
- **Distance**: flag points far from their nearest neighbours, for example by the distance to the k-th nearest neighbour.
- **Local density** (`LocalOutlierFactor`, LOF): compare each point's local density with the densities of its neighbours. A point in a sparse spot surrounded by dense spots scores high; a point in a uniformly sparse region does not.
- **Isolation** (`IsolationForest`): build random trees that split the data with random thresholds. Anomalies, being few and different, get **isolated** in very few splits; normal points, deep inside crowds, need many.

## A test with two kinds of normal

Here is data designed to separate these ideas. Normal points come in two clusters: a tight one (spread 0.3) and a loose one (spread 1.2). Six anomalies are planted: three just outside the tight cluster, and three in empty space.

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.ensemble import IsolationForest
from sklearn.metrics import average_precision_score
from sklearn.mixture import GaussianMixture
from sklearn.neighbors import LocalOutlierFactor, NearestNeighbors

rng = np.random.default_rng(0)
tight = rng.normal([0, 0], 0.3, (300, 2))
loose = rng.normal([4, 4], 1.2, (200, 2))
planted = np.array([[0, 1.5], [1.2, -1.0], [-1.3, 0.4], [6.5, 0.0], [-2, 5], [9, 9]])
X = np.vstack([tight, loose, planted])
is_anomaly = np.r_[np.zeros(500), np.ones(6)]

scores = {
    "Gaussian mixture density": -GaussianMixture(2, random_state=0).fit(X).score_samples(X),
    "distance to 5th neighbour": NearestNeighbors(n_neighbors=6).fit(X).kneighbors(X)[0][:, -1],
}
lof = LocalOutlierFactor(n_neighbors=20)
lof.fit_predict(X)
scores["local outlier factor"] = -lof.negative_outlier_factor_
scores["isolation forest"] = -IsolationForest(random_state=0).fit(X).score_samples(X)

for name, score in scores.items():
    top6 = np.argsort(score)[-6:]
    print(f"{name:<26} average precision {average_precision_score(is_anomaly, score):.2f}, "
          f"planted anomalies among its top 6: {int(is_anomaly[top6].sum())}")

fig, axes = plt.subplots(1, 2, figsize=(10, 4))
for ax, name in zip(axes, ["distance to 5th neighbour", "local outlier factor"]):
    points = ax.scatter(*X.T, c=scores[name], cmap="viridis", s=10)
    ax.scatter(*planted.T, facecolors="none", edgecolors="red", s=120)
    ax.set_title(name, fontsize=9)
    fig.colorbar(points, ax=ax)
plt.show()
```

```output
Gaussian mixture density   average precision 1.00, planted anomalies among its top 6: 6
distance to 5th neighbour  average precision 0.62, planted anomalies among its top 6: 3
local outlier factor       average precision 0.95, planted anomalies among its top 6: 5
isolation forest           average precision 0.70, planted anomalies among its top 6: 4
```

Each method returns a score, and the convention is made the same for all four: **higher means more anomalous** (scikit-learn's own scores point the other way, hence the minus signs). `kneighbors` returns distances to the 6 nearest points, the first being the point itself, so column −1 is the distance to the 5th real neighbour. Average precision, from the leakage lesson, summarises how well each score ranks the six anomalies above the 500 normal points.

The results split cleanly. The density model (1.00) ranks all six planted points above every normal one, and LOF (0.95) nearly does. The plain distance method (0.62) and the isolation forest (0.70) miss anomalies beside the tight cluster. For the distance method the reason is simple: those points are only about 1.2 to 1.5 units from the tight cluster's centre, which is closer than many perfectly normal points in the loose cluster are to **their** neighbours. The isolation forest fails differently: its random thresholds are drawn across the whole range of the data, so they rarely happen to cut the narrow gap beside the tight cluster. The left plot shows it: by raw distance, the edge of the loose cluster looks as odd as the planted points. LOF asks the right question for this data: not "is this point far from others?" but "is it much farther from its neighbours than they are from theirs?". The red circles mark the planted anomalies.

## A real test: rare malignant tumours

Now a higher-dimensional test where the answer is known. Take the breast cancer data, keep all 357 benign tumours as "normal", and mix in just 20 malignant ones as the anomalies to find, 5% of the data. No method gets to see the labels.

```python type
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import IsolationForest
from sklearn.metrics import average_precision_score
from sklearn.mixture import GaussianMixture
from sklearn.neighbors import LocalOutlierFactor, NearestNeighbors
from sklearn.preprocessing import StandardScaler

data = load_breast_cancer()
X_all = StandardScaler().fit_transform(data.data)
benign = np.flatnonzero(data.target == 1)
malignant = np.flatnonzero(data.target == 0)[:20]
X = X_all[np.r_[benign, malignant]]
is_anomaly = np.r_[np.zeros(len(benign)), np.ones(20)]

lof = LocalOutlierFactor(n_neighbors=20)
lof.fit_predict(X)
scores = {
    "Gaussian density": -GaussianMixture(1, random_state=0).fit(X).score_samples(X),
    "distance to 5th neighbour": NearestNeighbors(n_neighbors=6).fit(X).kneighbors(X)[0][:, -1],
    "local outlier factor": -lof.negative_outlier_factor_,
    "isolation forest": -IsolationForest(random_state=0).fit(X).score_samples(X),
}
print(f"fraction of anomalies: {is_anomaly.mean():.3f}")
for name, score in scores.items():
    top20 = np.argsort(score)[-20:]
    print(f"{name:<26} average precision {average_precision_score(is_anomaly, score):.2f}, "
          f"malignant among its 20 most anomalous: {int(is_anomaly[top20].sum())}")
```

```output
fraction of anomalies: 0.053
Gaussian density           average precision 0.41, malignant among its 20 most anomalous: 8
distance to 5th neighbour  average precision 0.35, malignant among its 20 most anomalous: 6
local outlier factor       average precision 0.35, malignant among its 20 most anomalous: 7
isolation forest           average precision 0.63, malignant among its 20 most anomalous: 12
```

A useless method would have an average precision near the base rate, 0.05, and find about 1 malignant tumour among its top 20. All four do far better; the isolation forest does best, with 12 of its 20 most suspicious tumours truly malignant, from a method that never saw a label. This time the plain distance and density methods trail. No method wins everywhere: the best detector depends on what the anomalies look like, which is why it pays to try several on whatever labelled examples you have.

## How isolation works

The isolation forest is worth understanding, because its idea is so different. Pick a random feature and a random threshold between that feature's smallest and largest values, and split the data in two. Keep splitting each part the same way. A point far from the crowd tends to end up alone after just a few splits, because almost any threshold separates it from the rest; a point in the middle of a crowd needs many splits before it is on its own. Repeat with many random trees and average the depth at which each point gets isolated: **shallow means anomalous**. The method never measures a distance or a density, so it is fast, works in high dimensions, and copes with features on different scales. You will isolate points yourself in the last challenge.

## Putting a detector to work

- **Thresholds.** Each detector produces a ranking. Where to cut it is a business decision: how many alerts can be investigated per day, and what a missed anomaly costs. scikit-learn's `contamination` setting simply cuts at a chosen fraction.
- **Evaluation.** If you have even a few labelled anomalies, use them to compare detectors, with average precision or "how many of the top k are real" (precision at k), never accuracy.
- **Training data.** Fit on data believed to be mostly normal. Too many anomalies in the training data teach the detector that they are normal: masking again.
- **Novelty versus outliers.** Finding odd points in the data you have (outlier detection) differs from judging new points against a model of normal (novelty detection). `LocalOutlierFactor(novelty=True)`, `IsolationForest` and density models can all score new points.

::: challenge Robust z-scores [easy]
Write `robust_z(x)` that returns the robust z-score of every value in a 1-D array: `0.6745 * (x − median) / MAD`, where the MAD is the median of the absolute differences from the median. Then write `flag_outliers(x, cutoff=3.5)` returning a boolean array marking values whose robust z-score exceeds the cut-off in size.

Apply it to the starter's sensor readings and store the flags in `flags`.

```python starter
import numpy as np

def robust_z(x):
    return (x - x.mean()) / x.std()

def flag_outliers(x, cutoff=3.5):
    return np.abs(robust_z(x)) > cutoff

rng = np.random.default_rng(7)
readings = np.concatenate([rng.normal(20, 2, 300), rng.normal(45, 3, 40)])
flags = flag_outliers(readings)
print(flags.sum())
```

```python solution
import numpy as np

def robust_z(x):
    median = np.median(x)
    mad = np.median(np.abs(x - median))
    return 0.6745 * (x - median) / mad

def flag_outliers(x, cutoff=3.5):
    return np.abs(robust_z(x)) > cutoff

rng = np.random.default_rng(7)
readings = np.concatenate([rng.normal(20, 2, 300), rng.normal(45, 3, 40)])
flags = flag_outliers(readings)
print(flags.sum())
```

```python test
import numpy as _np
assert "robust_z" in dir() and "flag_outliers" in dir(), "Keep both function names."
_x = _np.array([1.0, 2.0, 3.0, 4.0, 100.0])
assert _np.allclose(robust_z(_x), 0.6745 * (_x - 3.0) / 1.0), "For [1, 2, 3, 4, 100] the median is 3 and the MAD is 1, so robust_z should be 0.6745 × (x − 3). Use the median and MAD, not the mean and standard deviation."
assert list(flag_outliers(_x)) == [False, False, False, False, True], "Only 100 is an outlier in [1, 2, 3, 4, 100]."
assert list(flag_outliers(_np.array([1.0, 2.0, 3.0, 4.0, 9.0]), cutoff=2.0)) == [False, False, False, False, True], "flag_outliers should use the cutoff it is given."
_r = _np.random.default_rng(7)
_v = _np.concatenate([_r.normal(20, 2, 300), _r.normal(45, 3, 40)])
assert flags[300:].all(), f"All 40 faulty readings should be flagged, but only {flags[300:].sum()} are."
assert flags[:300].sum() <= 2, "Almost none of the normal readings should be flagged."
_z = _np.abs((_v - _v.mean()) / _v.std()) > 3
f"SUCCESS: The robust rule flags all 40 faulty readings; an ordinary z-score above 3 would have caught {_z[300:].sum()} of them."
```

Hint: `np.median(x)` gives the median; the MAD is `np.median(np.abs(x - median))`. The flags are `np.abs(robust_z(x)) > cutoff`.
:::

::: challenge Score by neighbours [medium]
Write `knn_scores(X, k)` that gives each point the distance to its `k`-th nearest **other** point, without scikit-learn: build the distance matrix with broadcasting, ignore each point's zero distance to itself, and sort. Then write `lof_lite(X, k)`, a simplified local outlier factor: each point's `knn_scores` value divided by the **average** `knn_scores` value of its `k` nearest neighbours. A point whose neighbours are much closer to their own neighbours than it is to them gets a large ratio.

On the starter's two-cluster data with planted anomalies, store the average precision of `knn_scores(X, 5)` in `ap_distance` and of `lof_lite(X, 5)` in `ap_local`.

```python starter
import numpy as np
from sklearn.metrics import average_precision_score

def knn_scores(X, k):
    return np.zeros(len(X))

def lof_lite(X, k):
    return np.zeros(len(X))

rng = np.random.default_rng(0)
X = np.vstack([rng.normal([0, 0], 0.3, (300, 2)), rng.normal([4, 4], 1.2, (200, 2)),
               np.array([[0, 1.5], [1.2, -1.0], [-1.3, 0.4], [6.5, 0.0], [-2, 5], [9, 9]])])
is_anomaly = np.r_[np.zeros(500), np.ones(6)]
ap_distance = average_precision_score(is_anomaly, knn_scores(X, 5))
ap_local = average_precision_score(is_anomaly, lof_lite(X, 5))
print(ap_distance, ap_local)
```

```python solution
import numpy as np
from sklearn.metrics import average_precision_score

def neighbours(X, k):
    distances = np.sqrt(((X[:, None, :] - X[None, :, :]) ** 2).sum(axis=2))
    np.fill_diagonal(distances, np.inf)
    order = np.argsort(distances, axis=1)[:, :k]
    return order, np.take_along_axis(distances, order, axis=1)

def knn_scores(X, k):
    _, nearest = neighbours(X, k)
    return nearest[:, -1]

def lof_lite(X, k):
    order, nearest = neighbours(X, k)
    own = nearest[:, -1]
    return own / own[order].mean(axis=1)

rng = np.random.default_rng(0)
X = np.vstack([rng.normal([0, 0], 0.3, (300, 2)), rng.normal([4, 4], 1.2, (200, 2)),
               np.array([[0, 1.5], [1.2, -1.0], [-1.3, 0.4], [6.5, 0.0], [-2, 5], [9, 9]])])
is_anomaly = np.r_[np.zeros(500), np.ones(6)]
ap_distance = average_precision_score(is_anomaly, knn_scores(X, 5))
ap_local = average_precision_score(is_anomaly, lof_lite(X, 5))
print(ap_distance, ap_local)
```

```python test
import numpy as _np
from sklearn.metrics import average_precision_score as _ap
from sklearn.neighbors import NearestNeighbors as _NN
assert "knn_scores" in dir() and "lof_lite" in dir(), "Keep both function names."
_line = _np.array([[0.0], [1.0], [3.0], [10.0]])
assert _np.allclose(knn_scores(_line, 1), [1.0, 1.0, 2.0, 7.0]), f"On the line 0, 1, 3, 10 with k = 1, each point's nearest other point is 1, 1, 2 and 7 away, but got {knn_scores(_line, 1)}. Don't count a point's distance to itself."
_r = _np.random.default_rng(5)
_P = _r.normal(size=(40, 3))
assert _np.allclose(knn_scores(_P, 4), _NN(n_neighbors=5).fit(_P).kneighbors(_P)[0][:, -1]), "knn_scores disagrees with scikit-learn's distance to the 4th nearest other point."
_d = _NN(n_neighbors=5).fit(_P).kneighbors(_P)
_own = _d[0][:, -1]
_want = _own / _own[_d[1][:, 1:]].mean(axis=1)
assert _np.allclose(lof_lite(_P, 4), _want), "lof_lite should divide each point's k-distance by the mean k-distance of its k nearest neighbours."
_rr = _np.random.default_rng(0)
_X = _np.vstack([_rr.normal([0, 0], 0.3, (300, 2)), _rr.normal([4, 4], 1.2, (200, 2)), _np.array([[0, 1.5], [1.2, -1.0], [-1.3, 0.4], [6.5, 0.0], [-2, 5], [9, 9]])])
_y = _np.r_[_np.zeros(500), _np.ones(6)]
assert _np.isclose(ap_distance, _ap(_y, knn_scores(_X, 5))) and _np.isclose(ap_local, _ap(_y, lof_lite(_X, 5))), "Compute both average precisions on the starter's data."
assert ap_local > ap_distance, "Comparing with the neighbours' own distances should do better here."
f"SUCCESS: Raw distance scores {ap_distance:.2f}; comparing each point with its neighbours scores {ap_local:.2f}. 'Far' only means something relative to how crowded the neighbourhood normally is."
```

Hint: Set the diagonal of the distance matrix to `np.inf` so a point is never its own neighbour. `np.argsort(..., axis=1)[:, :k]` gives each point's neighbours, and `np.take_along_axis(distances, order, axis=1)` their distances. For `lof_lite`, `own[order]` looks up each neighbour's own k-distance.
:::

::: challenge Isolate a point [medium]
Write `isolation_depth(X, index, rng)`: how many random splits it takes to isolate the point `X[index]`. Start with all rows. While more than one row remains and the depth is below 50: pick a feature with `rng.integers(X.shape[1])`; if that feature's values in the remaining rows are all equal, count the step and continue; otherwise pick a threshold with `rng.uniform(low, high)` between the remaining rows' minimum and maximum of that feature; keep only the remaining rows on the **same side** as the point (`<` threshold, or `>=`); and add 1 to the depth. Return the depth.

Then write `average_depth(X, index, trees, seed)`, which creates one generator from the seed and returns the mean depth over `trees` calls. On the starter's data, store the average depth over 200 trees of the obvious outlier (the last row) in `outlier_depth`, and of the most central point (row 0) in `central_depth`.

```python starter
import numpy as np

def isolation_depth(X, index, rng):
    return 0

def average_depth(X, index, trees, seed):
    return 0.0

rng = np.random.default_rng(1)
X = np.vstack([np.zeros((1, 2)), rng.normal(0, 1, (255, 2)), [[6.0, 6.0]]])
outlier_depth = average_depth(X, len(X) - 1, 200, 0)
central_depth = average_depth(X, 0, 200, 0)
print(outlier_depth, central_depth)
```

```python solution
import numpy as np

def isolation_depth(X, index, rng):
    rows = np.arange(len(X))
    depth = 0
    while len(rows) > 1 and depth < 50:
        feature = rng.integers(X.shape[1])
        values = X[rows, feature]
        low, high = values.min(), values.max()
        depth += 1
        if low == high:
            continue
        threshold = rng.uniform(low, high)
        if X[index, feature] < threshold:
            rows = rows[values < threshold]
        else:
            rows = rows[values >= threshold]
    return depth

def average_depth(X, index, trees, seed):
    rng = np.random.default_rng(seed)
    return float(np.mean([isolation_depth(X, index, rng) for _ in range(trees)]))

rng = np.random.default_rng(1)
X = np.vstack([np.zeros((1, 2)), rng.normal(0, 1, (255, 2)), [[6.0, 6.0]]])
outlier_depth = average_depth(X, len(X) - 1, 200, 0)
central_depth = average_depth(X, 0, 200, 0)
print(outlier_depth, central_depth)
```

```python test
import numpy as _np
assert "isolation_depth" in dir() and "average_depth" in dir(), "Keep both function names."
def _depth(X, index, rng):
    rows = _np.arange(len(X)); depth = 0
    while len(rows) > 1 and depth < 50:
        f = rng.integers(X.shape[1]); v = X[rows, f]; lo, hi = v.min(), v.max(); depth += 1
        if lo == hi:
            continue
        t = rng.uniform(lo, hi)
        rows = rows[v < t] if X[index, f] < t else rows[v >= t]
    return depth
assert isolation_depth(_np.array([[1.0, 2.0]]), 0, _np.random.default_rng(0)) == 0, "A single row is already isolated: depth 0."
assert isolation_depth(_np.array([[0.0], [5.0]]), 1, _np.random.default_rng(0)) == 1, "With two different values, one split always separates them: depth 1."
_r = _np.random.default_rng(1)
_X = _np.vstack([_np.zeros((1, 2)), _r.normal(0, 1, (255, 2)), [[6.0, 6.0]]])
for _i in (0, 10, 256):
    assert isolation_depth(_X, _i, _np.random.default_rng(3)) == _depth(_X, _i, _np.random.default_rng(3)), f"For row {_i}, your depth differs from the expected one. Draw the feature with rng.integers, then (if the values differ) the threshold with rng.uniform(low, high), and keep the rows on the point's side."
_g = _np.random.default_rng(0)
_od = _np.mean([_depth(_X, 256, _g) for _ in range(200)])
_g = _np.random.default_rng(0)
_cd = _np.mean([_depth(_X, 0, _g) for _ in range(200)])
assert _np.isclose(outlier_depth, _od) and _np.isclose(central_depth, _cd), f"outlier_depth should be {_od:.2f} and central_depth {_cd:.2f}. Create one generator in average_depth and reuse it for every tree."
f"SUCCESS: The outlier is isolated in about {_od:.1f} random splits on average; the central point needs about {_cd:.1f}. Shallow means anomalous: that is the core of the isolation forest (real implementations also train each tree on a random subsample and normalise the depths)."
```

Hint: Keep an array `rows` of the indices still in play. Each step: choose a feature, look at `X[rows, feature]`, and if its minimum and maximum differ, draw a threshold and keep `rows[values < threshold]` or `rows[values >= threshold]`, whichever side `X[index, feature]` is on.
:::

## What you learned

- Anomaly detection usually learns what normal looks like and flags poor fits, because anomalies are rare, varied and seldom labelled.
- Outliers distort the mean and standard deviation that z-scores rely on (masking: 10 of 20 caught). The median and MAD give a robust z-score that caught all 20.
- Four ideas for many dimensions: low density (`GaussianMixture.score_samples`), distance to the k-th neighbour, local density compared with neighbours (`LocalOutlierFactor`), and quick isolation by random splits (`IsolationForest`).
- Raw distance fails when clusters differ in density; LOF compares like with like. No method wins everywhere (isolation forest led on the tumour data with 12 of its top 20 malignant).
- Evaluate with average precision or precision at k on whatever labelled anomalies exist; choose thresholds from investigation capacity and costs; train on mostly normal data.

This completes the unsupervised part of the series. The next part starts from the perceptron again and builds, one layer at a time, the model behind modern AI: the neural network.
