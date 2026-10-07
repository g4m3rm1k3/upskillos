# Hierarchical clustering and DBSCAN

k-means has two awkward requirements: you must choose the number of clusters in advance, and every cluster must be a round blob around a centre. This lesson covers two families of methods that drop them.

**Hierarchical clustering** does not produce one clustering but a whole family of them, from "every point on its own" to "everything in one group", arranged as a tree called a **dendrogram**. You choose how many clusters you want after seeing the tree, by deciding where to cut it. **DBSCAN** takes a different view entirely: a cluster is a region where points are **dense**, separated from other clusters by sparse regions. It finds clusters of any shape, decides how many there are by itself, and labels points in sparse regions as **noise** instead of forcing them into a cluster.

## Agglomerative clustering

The common form of hierarchical clustering is **agglomerative** ("gathering together"). Start with every point as its own cluster, then repeat: find the two **closest clusters** and merge them, until one cluster remains. The only question is what "the distance between two clusters" means, and there are several answers, called **linkages**:

- **Single linkage**: the distance between their two **closest** points.
- **Complete linkage**: the distance between their two **farthest** points.
- **Average linkage**: the average distance over all pairs of points, one from each.
- **Ward's method**: the increase in total within-cluster squared distance (k-means' inertia) that merging would cause. It favours compact, similar-sized clusters, much like k-means.

Here is single linkage by hand, on six numbers on a line:

```python type
points = [1, 2, 4, 8, 9, 15]
clusters = [[p] for p in points]

def single_link(a, b):
    return min(abs(x - y) for x in a for y in b)

while len(clusters) > 1:
    best = None
    for i in range(len(clusters)):
        for j in range(i + 1, len(clusters)):
            d = single_link(clusters[i], clusters[j])
            if best is None or d < best[0]:
                best = (d, i, j)
    d, i, j = best
    print(f"merge {clusters[i]} and {clusters[j]} at distance {d}")
    clusters[i] = clusters[i] + clusters[j]
    del clusters[j]
```

```output
merge [1] and [2] at distance 1
merge [8] and [9] at distance 1
merge [1, 2] and [4] at distance 2
merge [1, 2, 4] and [8, 9] at distance 4
merge [1, 2, 4, 8, 9] and [15] at distance 6
```

The two loops compare every pair of current clusters and remember the closest pair; then that pair is merged into one list and the other entry deleted. First 1 and 2 merge (distance 1), then 8 and 9 (also 1), then 4 joins {1, 2} (its nearest member, 2, is 2 away), then {1, 2, 4} and {8, 9} merge at distance 4, and finally 15 joins at distance 6.

The **merge heights** are the useful part. Reading the record backwards: cut just below height 6 and you get 2 clusters, {1, 2, 4, 8, 9} and {15}; cut below height 4 and you get 3 clusters. Every possible number of clusters is available from one run.

SciPy computes the same record, efficiently, with `linkage`:

```python type
import numpy as np
from scipy.cluster.hierarchy import linkage

points = np.array([1.0, 2.0, 4.0, 8.0, 9.0, 15.0]).reshape(-1, 1)
print(linkage(points, method="single"))
```

```output
[[0. 1. 1. 2.]
 [3. 4. 1. 2.]
 [2. 6. 2. 3.]
 [7. 8. 4. 5.]
 [5. 9. 6. 6.]]
```

Each row is one merge: the two clusters merged, the distance, and the size of the new cluster. The original points are numbered 0 to 5, and each new cluster gets the next number, so cluster 6 is {1, 2} (points 0 and 1), cluster 7 is {8, 9}, and so on. The heights 1, 1, 2, 4, 6 are exactly the ones found by hand.

## The dendrogram

The merge record is usually drawn as a **dendrogram**: each merge is a horseshoe joining two branches at the height where they merged. Here it is with Ward's method for 30 points from three groups:

```python type
import matplotlib.pyplot as plt
from scipy.cluster.hierarchy import dendrogram, fcluster, linkage
from sklearn.datasets import make_blobs

X, true_groups = make_blobs(30, centers=3, cluster_std=0.8, random_state=4)
merges = linkage(X, method="ward")

fig, ax = plt.subplots(figsize=(8, 3.5))
dendrogram(merges, ax=ax, color_threshold=10)
ax.axhline(10, color="grey", linestyle="--")
ax.set_ylabel("merge height")
plt.show()

labels = fcluster(merges, t=10, criterion="distance")
print("clusters found by cutting at height 10:", labels)
print("the true groups:                       ", true_groups + 1)
```

```output
clusters found by cutting at height 10: [2 1 1 2 3 2 2 1 1 3 3 2 3 3 1 1 2 2 3 1 1 3 2 2 1 1 2 3 2 3]
the true groups:                        [1 3 3 1 2 1 1 3 3 2 2 1 2 2 3 3 2 1 2 3 3 2 1 1 3 3 1 2 1 2]
```

Every point starts at the bottom; branches join as you move up. Three groups join each other only at large heights, so the tall vertical lines near the top are the gaps between natural clusters. A horizontal cut through those tall lines (the dashed line at height 10) crosses three branches: three clusters. `fcluster(merges, t=10, criterion="distance")` performs the cut and returns a cluster number (from 1) for each point. Compare the two printed rows, remembering that cluster numbers are arbitrary: the cut's cluster 2 is the true group 1, its cluster 1 is group 3, and its cluster 3 is group 2. With that translation, all but one of the 30 points (the 17th) land in their true group.

The dendrogram shows at a glance how many clusters are plausible: look for a range of heights where cutting gives the same answer, that is, long vertical lines with nothing joining. It works well for up to a few hundred points; beyond that it becomes unreadable, and agglomerative clustering itself becomes slow, since each merge compares pairs of clusters.

## Linkage changes everything

The linkage choice decides which shapes the method can find. Before running the next cell, predict: which linkage will get the two moons right? To compare clusterings with the true groups, this lesson uses the **adjusted Rand index** (ARI, `adjusted_rand_score`): it measures how consistently two labellings put pairs of points together, ignoring the arbitrary cluster numbers. It is 1 for a perfect match and about 0 for a labelling no better than random.

```python type
import numpy as np
from sklearn.cluster import AgglomerativeClustering, KMeans
from sklearn.datasets import make_blobs, make_circles, make_moons
from sklearn.metrics import adjusted_rand_score

datasets = {
    "moons": make_moons(300, noise=0.06, random_state=0),
    "circles": make_circles(300, noise=0.05, factor=0.45, random_state=0),
    "uneven blobs": make_blobs(300, centers=3, cluster_std=[0.5, 1.0, 1.5], random_state=4),
}
for name, (X, y) in datasets.items():
    k = len(np.unique(y))
    scores = {"k-means": adjusted_rand_score(y, KMeans(k, n_init=10, random_state=0).fit_predict(X))}
    for linkage in ["single", "complete", "average", "ward"]:
        model = AgglomerativeClustering(n_clusters=k, linkage=linkage)
        scores[linkage] = adjusted_rand_score(y, model.fit_predict(X))
    print(f"{name:<13}", "  ".join(f"{method} {score:.2f}" for method, score in scores.items()))
```

```output
moons         k-means 0.23  single 1.00  complete 0.20  average 0.43  ward 0.30
circles       k-means -0.00  single 1.00  complete 0.00  average 0.00  ward -0.00
uneven blobs  k-means 0.94  single 0.55  complete 0.97  average 0.97  ward 0.97
```

scikit-learn's `AgglomerativeClustering` builds the tree and cuts it at `n_clusters`. The pattern is striking:

- **Single linkage** gets the moons and the circles **perfectly** (1.00), where every other method fails (k-means 0.23 on the moons, 0.00 on the circles). Joining clusters through their closest points lets it follow a curved chain of points of any shape.
- But on the blobs of different spreads, single linkage drops to 0.55, while complete, average and Ward score 0.97. The same chaining that follows curves also merges separate blobs as soon as a thin trail of points connects them.

Single linkage has a worse weakness still: **outliers**. A handful of stray points scattered around the moons each remain separate, faraway clusters until the very end, so cutting at two clusters splits off an outlier instead of separating the moons. With 15 random outliers added to the moons, single linkage's ARI on the moon points falls from 1.00 to 0.00. A good method for curved shapes must be able to set stray points aside. That is DBSCAN.

## DBSCAN: clusters are dense regions

**DBSCAN** (density-based spatial clustering of applications with noise) has two settings: a radius `eps` and a count `min_samples`. It classifies each point:

- A **core point** has at least `min_samples` points (counting itself) within distance `eps`: it sits in a dense region.
- A **border point** is not core, but lies within `eps` of a core point: on the edge of a dense region.
- A **noise point** is neither: alone in a sparse region.

Clusters are then formed by connecting core points that are within `eps` of each other, like joining up overlapping circles, and attaching each border point to a neighbouring core point's cluster. Noise points get the label −1. The number of clusters is whatever the density structure gives.

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.cluster import DBSCAN
from sklearn.datasets import make_moons
from sklearn.metrics import adjusted_rand_score

X, y = make_moons(300, noise=0.06, random_state=0)
outliers = np.random.default_rng(0).uniform(-1.5, 2.5, (15, 2))
X_all = np.vstack([X, outliers])

model = DBSCAN(eps=0.2, min_samples=5).fit(X_all)
labels = model.labels_
print("clusters found:", labels.max() + 1)
print("outliers marked as noise:", (labels[300:] == -1).sum(), "of 15")
print("moon points marked as noise:", (labels[:300] == -1).sum())
print("ARI on the moon points:", adjusted_rand_score(y, labels[:300]))

fig, ax = plt.subplots(figsize=(5.5, 4))
ax.scatter(*X_all[labels >= 0].T, c=labels[labels >= 0], cmap="coolwarm", s=10)
ax.scatter(*X_all[labels == -1].T, color="black", marker="x", s=30, label="noise")
ax.legend(fontsize=8)
plt.show()
```

```output
clusters found: 2
outliers marked as noise: 12 of 15
moon points marked as noise: 0
ARI on the moon points: 1.0
```

DBSCAN finds exactly the two moons, perfectly (ARI 1.0), and marks 12 of the 15 outliers as noise (black crosses). The other 3 happened to land close enough to a moon to count as part of it, which is reasonable: they are not outliers by any local measure. `model.core_sample_indices_` lists the core points, if you want to see them.

## Choosing eps

DBSCAN's results depend heavily on `eps`. Too small, and the dense regions break into fragments with many points labelled noise; too large, and separate clusters merge. On the moons (without outliers), sweeping `eps` with `min_samples=5` gives: at 0.1, 11 fragments; at 0.15, the two moons with 2 noise points; at 0.2, the two moons exactly; at 0.3, a single cluster, because the moons' tips are close enough to bridge.

A useful guide is the **k-distance plot**: for each point, find the distance to its `min_samples`-th nearest neighbour (counting itself), sort these distances, and plot them. Points inside clusters have small k-distances, and noise points large ones; a good `eps` sits around the bend where the curve shoots up:

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_moons
from sklearn.neighbors import NearestNeighbors

X, _ = make_moons(300, noise=0.06, random_state=0)
outliers = np.random.default_rng(0).uniform(-1.5, 2.5, (15, 2))
X_all = np.vstack([X, outliers])

distances, _ = NearestNeighbors(n_neighbors=5).fit(X_all).kneighbors(X_all)
k_distance = np.sort(distances[:, -1])
fig, ax = plt.subplots(figsize=(5.5, 3.2))
ax.plot(k_distance)
ax.set_xlabel("points, sorted")
ax.set_ylabel("distance to 5th nearest neighbour")
plt.show()
print("median k-distance:", np.median(k_distance).round(3), " largest:", k_distance[-5:].round(2))
```

```output
median k-distance: 0.08  largest: [1.14 1.17 1.27 1.54 1.84]
```

`NearestNeighbors(n_neighbors=5).kneighbors(X)` returns, for each point, the distances to its 5 nearest points, the first being the point itself at distance 0. The curve is flat and low for most points (median about 0.08) and rises sharply over the last few: the outliers. An `eps` around 0.15 to 0.2 sits just past the flat part.

## DBSCAN's weak spot, and HDBSCAN

One `eps` assumes all clusters have about the same density. On the three blobs with different spreads, any single `eps` that keeps the tight blob together breaks the loose one into noise, and any `eps` large enough for the loose blob merges things it should not: in a sweep of `eps` from 0.1 to 0.5, DBSCAN's ARI there never gets above about 0.6. **HDBSCAN** (`sklearn.cluster.HDBSCAN`) fixes this by, in effect, trying all values of `eps` and keeping the clusters that persist over the widest range of densities. It needs only a minimum cluster size; on the uneven blobs, `HDBSCAN(min_cluster_size=15)` finds the three blobs with an ARI of 0.86, labelling 33 straggling points as noise. It is often the best default when you know little about the data.

## Which method when

- Round, similar-sized clusters, and you know roughly how many: **k-means** (fast, scales to millions of points) or **Ward** linkage.
- You want to see the structure at every scale, with at most a few thousand points: **agglomerative clustering** and its dendrogram.
- Odd shapes, unknown number of clusters, outliers to set aside: **DBSCAN**, or **HDBSCAN** if densities vary.

And for all of them: scale the features first, and treat any clustering as a hypothesis to check, not a fact. Clustering algorithms will always return clusters, even in data with no real groups at all.

::: challenge Three linkages [easy]
Write `linkage_distance(A, B, method)` for two clusters given as 2-D arrays of points (one row per point). It should return the single-linkage distance (`"single"`, the smallest distance between a point of `A` and a point of `B`), complete linkage (`"complete"`, the largest), or average linkage (`"average"`, the mean over all pairs), using ordinary straight-line distance.

```python starter
import numpy as np

def linkage_distance(A, B, method):
    return 0.0

A = np.array([[0.0, 0.0], [0.0, 1.0]])
B = np.array([[3.0, 0.0], [4.0, 1.0]])
print([linkage_distance(A, B, m) for m in ["single", "complete", "average"]])
```

```python solution
import numpy as np

def linkage_distance(A, B, method):
    distances = np.sqrt(((A[:, None, :] - B[None, :, :]) ** 2).sum(axis=2))
    if method == "single":
        return float(distances.min())
    if method == "complete":
        return float(distances.max())
    return float(distances.mean())

A = np.array([[0.0, 0.0], [0.0, 1.0]])
B = np.array([[3.0, 0.0], [4.0, 1.0]])
print([linkage_distance(A, B, m) for m in ["single", "complete", "average"]])
```

```python test
import numpy as _np
assert "linkage_distance" in dir(), "Keep the function's name as linkage_distance."
_A = _np.array([[0.0, 0.0], [0.0, 1.0]])
_B = _np.array([[3.0, 0.0], [4.0, 1.0]])
_d = [3.0, _np.sqrt(17), _np.sqrt(10), 4.0]
assert _np.isclose(linkage_distance(_A, _B, "single"), 3.0), "Single linkage is the closest pair: (0, 0) to (3, 0), distance 3."
assert _np.isclose(linkage_distance(_A, _B, "complete"), _np.sqrt(17)), "Complete linkage is the farthest pair: (0, 0) to (4, 1), distance √17."
assert _np.isclose(linkage_distance(_A, _B, "average"), _np.mean(_d)), "Average linkage is the mean of all four pairwise distances."
_r = _np.random.default_rng(3)
_P, _Q = _r.normal(size=(5, 3)), _r.normal(size=(4, 3)) + 2
_all = _np.array([[_np.linalg.norm(p - q) for q in _Q] for p in _P])
for _m, _f in [("single", _all.min()), ("complete", _all.max()), ("average", _all.mean())]:
    assert _np.isclose(linkage_distance(_P, _Q, _m), _f), f"{_m} linkage is wrong for clusters of different sizes in 3 dimensions."
"SUCCESS: Three definitions of the distance between groups, and three very different clusterings they produce."
```

Hint: Build the table of distances between every point of `A` and every point of `B` with broadcasting, then take its `min`, `max` or `mean`.
:::

::: challenge Find the core points [medium]
Write `core_mask(X, eps, min_samples)` that returns a boolean array marking DBSCAN's **core points**: points with at least `min_samples` points within distance `eps` (inclusive), **counting the point itself**. Then write `noise_mask(X, eps, min_samples)`, marking points that are neither core nor within `eps` of any core point.

The check compares your answers with scikit-learn's `DBSCAN` (its `core_sample_indices_`, and the points it labels −1).

```python starter
import numpy as np

def core_mask(X, eps, min_samples):
    return np.zeros(len(X), dtype=bool)

def noise_mask(X, eps, min_samples):
    return np.zeros(len(X), dtype=bool)
```

```python solution
import numpy as np

def core_mask(X, eps, min_samples):
    distances = np.sqrt(((X[:, None, :] - X[None, :, :]) ** 2).sum(axis=2))
    return (distances <= eps).sum(axis=1) >= min_samples

def noise_mask(X, eps, min_samples):
    distances = np.sqrt(((X[:, None, :] - X[None, :, :]) ** 2).sum(axis=2))
    core = (distances <= eps).sum(axis=1) >= min_samples
    near_core = (distances[:, core] <= eps).any(axis=1)
    return ~core & ~near_core
```

```python test
import numpy as _np
from sklearn.cluster import DBSCAN as _DB
from sklearn.datasets import make_moons as _mm
assert "core_mask" in dir() and "noise_mask" in dir(), "Keep both function names."
_line = _np.array([[0.0, 0.0], [1.0, 0.0], [2.0, 0.0], [5.0, 0.0]])
assert list(core_mask(_line, 1.0, 3)) == [False, True, False, False], "On the line 0, 1, 2, 5 with eps 1 and min_samples 3, only the point at 1 has three points (itself, 0 and 2) within distance 1. Count the point itself, and include distances equal to eps."
assert list(noise_mask(_line, 1.0, 3)) == [False, False, False, True], "The points at 0 and 2 are border points (within eps of the core point at 1); only the point at 5 is noise."
_X, _ = _mm(200, noise=0.1, random_state=1)
_X = _np.vstack([_X, _np.random.default_rng(2).uniform(-1.5, 2.5, (10, 2))])
for _eps, _ms in [(0.15, 5), (0.2, 8), (0.1, 3)]:
    _db = _DB(eps=_eps, min_samples=_ms).fit(_X)
    _core = _np.zeros(len(_X), bool)
    _core[_db.core_sample_indices_] = True
    assert (_np.asarray(core_mask(_X, _eps, _ms)) == _core).all(), f"With eps = {_eps} and min_samples = {_ms}, your core points differ from DBSCAN's."
    assert (_np.asarray(noise_mask(_X, _eps, _ms)) == (_db.labels_ == -1)).all(), f"With eps = {_eps} and min_samples = {_ms}, your noise points differ from DBSCAN's. Noise means: not core, and not within eps of any core point."
"SUCCESS: Core, border and noise: the three kinds of point DBSCAN builds everything from."
```

Hint: Build the full distance matrix of `X` with itself. A point's neighbour count is `(distances <= eps).sum(axis=1)`, which includes itself (distance 0). For noise, `distances[:, core]` keeps only the columns of core points.
:::

::: challenge DBSCAN from scratch [hard]
Write `dbscan(X, eps, min_samples)` returning an array of cluster labels (0, 1, 2, … for clusters, −1 for noise). Use your idea of core points from the previous challenge, then grow clusters without recursion, using a list of points still to visit (the order they are taken out doesn't matter):

- Start every label at −1. Go through the points in order. When you reach a **core** point that has no cluster yet, start a new cluster with the next number, label it, and put it in the to-visit list.
- While the to-visit list is not empty, take a point from it. For each of its neighbours (within `eps`) that has no cluster yet, give it the current cluster's label; if that neighbour is itself a core point, add it to the list too (border points join the cluster but do not spread it).

The check compares your clustering with scikit-learn's DBSCAN: the same noise points and the same groups (cluster numbers may differ).

```python starter
import numpy as np

def dbscan(X, eps, min_samples):
    return np.full(len(X), -1)
```

```python solution
import numpy as np

def dbscan(X, eps, min_samples):
    distances = np.sqrt(((X[:, None, :] - X[None, :, :]) ** 2).sum(axis=2))
    neighbours = distances <= eps
    core = neighbours.sum(axis=1) >= min_samples
    labels = np.full(len(X), -1)
    cluster = 0
    for start in range(len(X)):
        if not core[start] or labels[start] != -1:
            continue
        labels[start] = cluster
        queue = [start]
        while queue:
            point = queue.pop()
            for other in np.flatnonzero(neighbours[point]):
                if labels[other] == -1:
                    labels[other] = cluster
                    if core[other]:
                        queue.append(other)
        cluster += 1
    return labels
```

```python test
import numpy as _np
from sklearn.cluster import DBSCAN as _DB
from sklearn.datasets import make_moons as _mm, make_blobs as _mb
from sklearn.metrics import adjusted_rand_score as _ari
assert "dbscan" in dir(), "Keep the function's name as dbscan."
_line = _np.array([[0.0], [1.0], [2.0], [5.0], [6.0], [7.0], [20.0]])
_got = _np.asarray(dbscan(_line, 1.0, 3))
assert _got[6] == -1 and (_got[:6] >= 0).all(), "On the line 0, 1, 2, 5, 6, 7, 20 (eps 1, min_samples 3), the point at 20 is noise and the others belong to clusters."
assert len(set(_got[:3])) == 1 and len(set(_got[3:6])) == 1 and _got[0] != _got[3], "0, 1, 2 form one cluster and 5, 6, 7 another."
_spread = _np.asarray(dbscan(_np.array([[0.0], [0.5], [1.0], [2.0], [3.0]]), 1.0, 4))
assert list(_spread) == [0, 0, 0, 0, -1], f"For points 0, 0.5, 1, 2, 3 (eps 1, min_samples 4) the answer is [0, 0, 0, 0, -1]: 2 is a border point and joins the cluster, but it must not spread it to 3. Got {list(_spread)}."
_X, _ = _mm(250, noise=0.08, random_state=3)
_X = _np.vstack([_X, _np.random.default_rng(5).uniform(-1.5, 2.5, (12, 2))])
_B, _ = _mb(200, centers=4, cluster_std=0.6, random_state=1)
for _data, _eps, _ms in [(_X, 0.2, 5), (_X, 0.12, 4), (_B, 0.5, 6)]:
    _ref = _DB(eps=_eps, min_samples=_ms).fit_predict(_data)
    _mine = _np.asarray(dbscan(_data, _eps, _ms))
    assert ((_mine == -1) == (_ref == -1)).all(), f"With eps = {_eps}, min_samples = {_ms}, your noise points differ from DBSCAN's."
    _keep = _ref != -1
    assert _ari(_ref[_keep], _mine[_keep]) > 0.99, f"With eps = {_eps}, min_samples = {_ms}, your clusters group the points differently from DBSCAN's. Only core points may add their neighbours to the queue."
    assert _mine.max() == _ref.max(), f"With eps = {_eps}, min_samples = {_ms}, you found {_mine.max() + 1} clusters; DBSCAN finds {_ref.max() + 1}."
"SUCCESS: Your DBSCAN agrees with scikit-learn's. Clusters grow outward through core points, border points join without spreading, and whatever is never reached is noise."
```

Hint: Precompute the boolean `neighbours` matrix (`distances <= eps`) and the `core` mask. `queue.pop()` takes a point out of the list; `np.flatnonzero(neighbours[point])` lists its neighbours. Label a neighbour only if it is still −1, and append it to the queue only if it is core.
:::

## What you learned

- Agglomerative clustering repeatedly merges the two closest clusters. The linkage defines cluster distance: single (closest pair), complete (farthest pair), average, or Ward (increase in inertia).
- The merge record (`scipy.cluster.hierarchy.linkage`) and its dendrogram contain every number of clusters at once; cut it with `fcluster` at a height where long vertical lines show real gaps.
- Single linkage follows curved, chained shapes (perfect on moons and circles) but merges blobs joined by trails of points and is wrecked by outliers; Ward and complete linkage prefer compact clusters.
- The adjusted Rand index (ARI) compares a clustering with known labels: 1 is perfect, about 0 is random.
- DBSCAN defines clusters as connected dense regions: core points have at least `min_samples` neighbours within `eps`, border points are near a core point, and the rest is noise (label −1). It finds any shape and the number of clusters, and sets outliers aside.
- Choose `eps` from the bend in a sorted k-distance plot. One `eps` cannot fit clusters of different densities; HDBSCAN handles that.
- Clustering always returns clusters, even when there are none: treat the result as a hypothesis.

Both k-means and these methods give each point exactly one cluster. The next lesson allows a point to belong partly to several clusters, with probabilities, by modelling the data as a mixture of bell curves, and introduces the EM algorithm that fits them.
