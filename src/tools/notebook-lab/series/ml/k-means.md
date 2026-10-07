# k-means

Every model so far has learned from **labelled** examples: tumours marked malignant or benign, flats with their prices. Much real data has no labels at all: customers with their purchase histories, documents, sensor readings, photos. **Unsupervised learning** looks for structure in such data on its own. The most common question is: do the examples fall into natural **groups**? Finding them is called **clustering**.

This lesson builds the most widely used clustering method, **k-means**, from scratch. It is short enough to write in ten lines and teaches several ideas that recur throughout unsupervised learning: an objective to minimise without labels, an algorithm that alternates between two easy steps, sensitivity to where it starts, and the hard question of how many clusters there "really" are.

## The idea

k-means describes the data with `k` points called **centres** (or centroids), and assigns every example to its nearest centre. A good set of centres is one where examples are close to their own centre. The quantity measured is the **inertia** (also called the within-cluster sum of squares): the sum, over all examples, of the squared distance to their assigned centre. k-means looks for centres and assignments with small inertia.

Finding the very best is a hard problem, but a simple algorithm (usually called **Lloyd's algorithm**) finds good answers quickly. Start with `k` centres, for instance `k` randomly chosen examples. Then repeat two steps until nothing changes:

1. **Assign**: put each example in the cluster of its nearest centre.
2. **Update**: move each centre to the **mean** of the examples assigned to it.

Each step can only lower the inertia, or leave it unchanged. (One practical snag: if a centre ends up with no points at all, its mean is undefined and NumPy gives `nan`. Real implementations move such a centre to a fresh point; the small examples here never hit it.) Assigning each point to its nearest centre obviously cannot increase its distance. And the mean of a group of points is the single point with the smallest total squared distance to them (the same fact behind least squares). Since the inertia keeps falling and there are only finitely many ways to assign the points, the algorithm must stop.

## k-means from scratch

Four groups of points, generated with `make_blobs` (which scatters points around randomly placed centres):

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_blobs

X, _ = make_blobs(300, centers=4, cluster_std=0.9, random_state=7)

def assign(X, centres):
    distances = ((X[:, None, :] - centres[None, :, :]) ** 2).sum(axis=2)
    return distances.argmin(axis=1)

def update(X, labels, k):
    return np.array([X[labels == j].mean(axis=0) for j in range(k)])

rng = np.random.default_rng(6)
centres = X[rng.choice(len(X), 4, replace=False)]

fig, axes = plt.subplots(1, 4, figsize=(12, 3), sharey=True)
for step, ax in enumerate(axes):
    labels = assign(X, centres)
    inertia = ((X - centres[labels]) ** 2).sum()
    ax.scatter(*X.T, c=labels, cmap="tab10", s=8)
    ax.scatter(*centres.T, c="black", marker="x", s=120)
    ax.set_title(f"step {step}: inertia {inertia:.0f}", fontsize=9)
    centres = update(X, labels, 4)
plt.show()
```

`rng.choice(len(X), 4, replace=False)` picks four different row numbers, so the starting centres are four of the data points. `assign` uses the broadcast distance table from the kNN lesson (squared distances are enough, since the nearest point is the same either way), and `centres[labels]` looks up each example's own centre.

At step 0, the random starting centres (black crosses) sit oddly, two of them in the same group, and the inertia is about 28,000. After one round of assign-and-update the centres have moved towards the middles of the groups (inertia about 3,000). By step 2 every point is in its right group (487), and one more update settles the centres in the middle of each blob at 463, where the algorithm stops.

## Where you start matters

Lloyd's algorithm always stops, but not necessarily at the best answer. It finds a **local minimum**: a set of centres that no single assign-or-update step can improve, even though a completely different arrangement would be better. Run it from eight different random starts. Predict first: how many of the eight will find the four blobs?

```python type
import numpy as np
from sklearn.datasets import make_blobs

X, _ = make_blobs(300, centers=4, cluster_std=0.9, random_state=7)

def kmeans(X, k, seed, max_iter=100):
    rng = np.random.default_rng(seed)
    centres = X[rng.choice(len(X), k, replace=False)]
    for iteration in range(1, max_iter + 1):
        labels = ((X[:, None, :] - centres[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
        new_centres = np.array([X[labels == j].mean(axis=0) for j in range(k)])
        if np.allclose(new_centres, centres):
            break
        centres = new_centres
    return centres, labels, ((X - centres[labels]) ** 2).sum(), iteration

for seed in range(8):
    centres, labels, inertia, iterations = kmeans(X, 4, seed)
    print(f"start {seed}: inertia {inertia:7.1f} after {iterations} rounds, cluster sizes {np.bincount(labels, minlength=4)}")
```

```output
start 0: inertia   462.8 after 3 rounds, cluster sizes [75 75 75 75]
start 1: inertia  2359.7 after 7 rounds, cluster sizes [150  35  75  40]
start 2: inertia  2360.2 after 8 rounds, cluster sizes [150  37  38  75]
start 3: inertia  2360.6 after 6 rounds, cluster sizes [150  43  32  75]
start 4: inertia  2359.7 after 5 rounds, cluster sizes [ 75 150  35  40]
start 5: inertia  6952.8 after 11 rounds, cluster sizes [ 75  38  37 150]
start 6: inertia   462.8 after 4 rounds, cluster sizes [75 75 75 75]
start 7: inertia  6952.8 after 4 rounds, cluster sizes [ 38 150  75  37]
```

`np.allclose` checks whether the centres stopped moving. Only two of the eight starts reach the good solution, with inertia 463 and four clusters of 75. The others get stuck: a common failure is two centres sharing one blob while a single centre straddles two others, giving inertia around 2,360; the worst gets 6,953. From inside such a solution, every small move makes things worse, so the algorithm cannot escape.

Two standard remedies, both on by default in scikit-learn:

- **Run it several times** from different starts and keep the result with the lowest inertia (`n_init`).
- **Start smarter**. **k-means++** picks the first centre at random from the data, and each next centre at random with probability proportional to the squared distance to the nearest centre already chosen. Far-away points are likely picks, so the starting centres spread out across the data. You will write it in a challenge.

## Choosing k

k-means needs `k` in advance, and the data rarely announces it. The inertia cannot choose it on its own: the best inertia achievable never rises as `k` grows, and with one centre per point it is zero. Two common aids:

- The **elbow method**: plot inertia against `k` and look for the point where adding centres stops helping much.
- The **silhouette score**. For each example, let `a` be its mean distance to the other members of its own cluster, and `b` its mean distance to the members of the **nearest other** cluster. Its silhouette is (b − a) / max(a, b): near 1 when it sits snugly in its cluster far from the others, near 0 on a border, negative if it is closer to another cluster. The average over all examples scores the whole clustering, and unlike inertia it does not automatically improve with more clusters.

```python type
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans
from sklearn.datasets import make_blobs
from sklearn.metrics import silhouette_score

X, _ = make_blobs(300, centers=4, cluster_std=0.9, random_state=7)
ks = range(1, 9)
inertias, silhouettes = [], []
for k in ks:
    model = KMeans(n_clusters=k, n_init=10, random_state=0).fit(X)
    inertias.append(model.inertia_)
    silhouettes.append(silhouette_score(X, model.labels_) if k > 1 else float("nan"))
    print(f"k = {k}: inertia {model.inertia_:8.1f}, silhouette {silhouettes[-1]:.3f}")

fig, axes = plt.subplots(1, 2, figsize=(9, 3.2))
axes[0].plot(ks, inertias, marker="o")
axes[0].set_title("inertia (look for the elbow)", fontsize=9)
axes[1].plot(ks, silhouettes, marker="o")
axes[1].set_title("silhouette (higher is better)", fontsize=9)
for ax in axes:
    ax.set_xlabel("k")
plt.show()
```

```output
k = 1: inertia  22193.5, silhouette nan
k = 2: inertia   8941.6, silhouette 0.599
k = 3: inertia   2402.8, silhouette 0.776
k = 4: inertia    462.8, silhouette 0.826
k = 5: inertia    414.0, silhouette 0.721
k = 6: inertia    370.8, silhouette 0.584
k = 7: inertia    326.5, silhouette 0.456
k = 8: inertia    282.6, silhouette 0.356
```

`KMeans(n_clusters=k, n_init=10)` runs 10 k-means++ starts and keeps the best; `inertia_` and `labels_` hold the result. The inertia drops steeply up to `k = 4` (from 22,194 to 463) and only slowly after (414, 371, …): a sharp elbow. The silhouette peaks at `k = 4` too, at 0.826. (The silhouette needs at least two clusters, hence the missing first value.)

On real data the elbow is usually much less clear, and different measures disagree. Often the honest answer is that there is no single correct `k`: customers can be usefully split into 3 segments or into 8. Choose a `k` that is useful for the purpose, and check the clusters make sense by looking at them.

## Clustering handwritten digits without labels

How much structure can k-means find on its own in real data? Cluster the 64-pixel digits into 10 groups, **ignoring the labels**, then look at the labels afterwards to see what each cluster contains:

```python type
import numpy as np
from sklearn.cluster import KMeans
from sklearn.datasets import load_digits

digits = load_digits()
model = KMeans(n_clusters=10, n_init=10, random_state=0).fit(digits.data)
for j in range(10):
    members = digits.target[model.labels_ == j]
    counts = np.bincount(members, minlength=10)
    print(f"cluster {j}: {len(members):>3} images, mostly {counts.argmax()}s ({counts.max() / len(members):.0%})")

purity = sum(np.bincount(digits.target[model.labels_ == j]).max() for j in range(10)) / len(digits.target)
print(f"purity: {purity:.3f}")
```

```output
cluster 0: 178 images, mostly 0s (99%)
cluster 1: 221 images, mostly 1s (45%)
cluster 2: 212 images, mostly 7s (83%)
cluster 3:  84 images, mostly 1s (64%)
cluster 4: 177 images, mostly 3s (87%)
cluster 5: 182 images, mostly 6s (97%)
cluster 6: 169 images, mostly 4s (98%)
cluster 7: 149 images, mostly 5s (91%)
cluster 8: 250 images, mostly 9s (56%)
cluster 9: 175 images, mostly 2s (85%)
purity: 0.794
```

Most clusters are dominated by one digit: one is almost entirely 0s, another 6s, another 4s. Overall, 79% of images sit in a cluster whose most common digit is their own (that fraction is called the **purity**). Some digits share: one cluster mixes 1s and 8s about evenly, and the 9s are split. Without ever being told what a digit is, k-means has rediscovered most of the categories. (Note that cluster numbers are arbitrary: cluster 0 is not "the zeros".)

## What k-means assumes

k-means implicitly assumes clusters are **round blobs of similar size**, because it assigns each point to the nearest centre: the boundary between two clusters is always the straight line halfway between their centres. When the real groups are long, curved or very different in size, it cuts them in the wrong places. On the two half-moons from earlier lessons, k-means slices straight across both moons, because no two centres can describe two interlocking curves; the next lesson shows this, and methods that handle such shapes.

And because it works with distances, k-means is as sensitive to feature **scale** as kNN: standardise first, or a feature in large units will decide the clusters on its own.

::: challenge Assign and measure [easy]
Write `assign(X, centres)`, which returns, for each row of `X`, the index of its nearest centre, and `inertia(X, centres, labels)`, the sum of squared distances from each row to its assigned centre. Use broadcasting, without loops.

```python starter
import numpy as np

def assign(X, centres):
    return np.zeros(len(X), dtype=int)

def inertia(X, centres, labels):
    return 0.0

X = np.array([[0.0, 0.0], [1.0, 0.0], [9.0, 9.0], [10.0, 9.0]])
centres = np.array([[0.5, 0.0], [9.5, 9.0]])
labels = assign(X, centres)
print(labels, inertia(X, centres, labels))
```

```python solution
import numpy as np

def assign(X, centres):
    return ((X[:, None, :] - centres[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)

def inertia(X, centres, labels):
    return float(((X - centres[labels]) ** 2).sum())

X = np.array([[0.0, 0.0], [1.0, 0.0], [9.0, 9.0], [10.0, 9.0]])
centres = np.array([[0.5, 0.0], [9.5, 9.0]])
labels = assign(X, centres)
print(labels, inertia(X, centres, labels))
```

```python test
import ast as _ast
import numpy as _np
from sklearn.cluster import KMeans as _KM
assert "assign" in dir() and "inertia" in dir(), "Keep both function names."
_X = _np.array([[0.0, 0.0], [1.0, 0.0], [9.0, 9.0], [10.0, 9.0]])
_C = _np.array([[0.5, 0.0], [9.5, 9.0]])
assert list(assign(_X, _C)) == [0, 0, 1, 1], f"The first two points are nearest centre 0 and the last two centre 1, but got {list(assign(_X, _C))}."
assert _np.isclose(inertia(_X, _C, _np.array([0, 0, 1, 1])), 1.0), "Each point is 0.5 from its centre, so the inertia is 4 × 0.25 = 1.0. Use squared distances."
_r = _np.random.default_rng(1)
_P = _r.normal(size=(50, 3))
_km = _KM(3, n_init=1, random_state=0).fit(_P)
assert (assign(_P, _km.cluster_centers_) == _km.labels_).all(), "assign disagrees with scikit-learn's assignments on a 3-D example."
assert _np.isclose(inertia(_P, _km.cluster_centers_, _km.labels_), _km.inertia_), "inertia disagrees with scikit-learn's inertia_ on a 3-D example."
_fns = [n for n in _ast.walk(_ast.parse(_source)) if isinstance(n, _ast.FunctionDef) and n.name in ("assign", "inertia")]
assert not any(isinstance(n, (_ast.For, _ast.While, _ast.ListComp)) for f in _fns for n in _ast.walk(f)), "Use broadcasting instead of loops."
"SUCCESS: The two measurements every k-means step relies on."
```

Hint: `X[:, None, :] - centres[None, :, :]` has shape `(points, centres, features)`; sum the squares over the last axis and take `argmin(axis=1)`. For the inertia, `centres[labels]` gives each point's own centre.
:::

::: challenge k-means++ [medium]
Write `kmeans_plus_plus(X, k, seed)` that chooses `k` starting centres the k-means++ way, using one generator `rng = np.random.default_rng(seed)`:

- the first centre is the row `rng.integers(len(X))`;
- each further centre is a row chosen with `rng.choice(len(X), p=probabilities)`, where each row's probability is its squared distance to the **nearest** centre chosen so far, divided by the total of those squared distances.

Return the centres as an array of shape `(k, features)`, in the order chosen. Then, on the starter's blobs, compare the inertia that plain Lloyd iterations reach from k-means++ starts with random starts: run the starter's `lloyd` function from `kmeans_plus_plus(X, 4, seed)` for seeds 0 to 19, and store the number of runs that reach an inertia below 500 in `good_plus_plus`. The starter already computes `good_random` for random starts.

```python starter
import numpy as np
from sklearn.datasets import make_blobs

def kmeans_plus_plus(X, k, seed):
    rng = np.random.default_rng(seed)
    return X[rng.choice(len(X), k, replace=False)]

def lloyd(X, centres, max_iter=100):
    for _ in range(max_iter):
        labels = ((X[:, None, :] - centres[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
        new_centres = np.array([X[labels == j].mean(axis=0) for j in range(len(centres))])
        if np.allclose(new_centres, centres):
            break
        centres = new_centres
    return ((X - centres[labels]) ** 2).sum()

X, _ = make_blobs(300, centers=4, cluster_std=0.9, random_state=7)
good_random = sum(lloyd(X, X[np.random.default_rng(s).choice(len(X), 4, replace=False)]) < 500 for s in range(20))
good_plus_plus = 0
print(good_random, good_plus_plus)
```

```python solution
import numpy as np
from sklearn.datasets import make_blobs

def kmeans_plus_plus(X, k, seed):
    rng = np.random.default_rng(seed)
    centres = [X[rng.integers(len(X))]]
    for _ in range(k - 1):
        squared = ((X[:, None, :] - np.array(centres)[None, :, :]) ** 2).sum(axis=2).min(axis=1)
        centres.append(X[rng.choice(len(X), p=squared / squared.sum())])
    return np.array(centres)

def lloyd(X, centres, max_iter=100):
    for _ in range(max_iter):
        labels = ((X[:, None, :] - centres[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
        new_centres = np.array([X[labels == j].mean(axis=0) for j in range(len(centres))])
        if np.allclose(new_centres, centres):
            break
        centres = new_centres
    return ((X - centres[labels]) ** 2).sum()

X, _ = make_blobs(300, centers=4, cluster_std=0.9, random_state=7)
good_random = sum(lloyd(X, X[np.random.default_rng(s).choice(len(X), 4, replace=False)]) < 500 for s in range(20))
good_plus_plus = sum(lloyd(X, kmeans_plus_plus(X, 4, s)) < 500 for s in range(20))
print(good_random, good_plus_plus)
```

```python test
import numpy as _np
from sklearn.datasets import make_blobs as _mb
assert "kmeans_plus_plus" in dir(), "Keep the function's name as kmeans_plus_plus."
def _kpp(X, k, seed):
    r = _np.random.default_rng(seed)
    c = [X[r.integers(len(X))]]
    for _ in range(k - 1):
        d = ((X[:, None, :] - _np.array(c)[None, :, :]) ** 2).sum(axis=2).min(axis=1)
        c.append(X[r.choice(len(X), p=d / d.sum())])
    return _np.array(c)
_X, _ = _mb(300, centers=4, cluster_std=0.9, random_state=7)
_got = _np.asarray(kmeans_plus_plus(_X, 4, 3))
assert _got.shape == (4, 2), f"Return a (k, features) array, here (4, 2), not {_got.shape}."
_want = _kpp(_X, 4, 3)
assert _np.allclose(_got[0], _want[0]), "The first centre should be X[rng.integers(len(X))], drawn first from the generator."
assert _np.allclose(_got, _want), "Later centres differ from the expected ones. Each row's probability is its squared distance to the NEAREST chosen centre, divided by the sum of those."
_line = _np.array([[0.0, 0.0], [0.1, 0.0], [10.0, 0.0]])
assert all(len({tuple(c) for c in kmeans_plus_plus(_line, 2, s)}) == 2 for s in range(10)), "A row that is already a centre has distance 0, so it can never be chosen again."
def _lloyd(X, C):
    for _ in range(100):
        L = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
        N = _np.array([X[L == j].mean(axis=0) for j in range(len(C))])
        if _np.allclose(N, C):
            break
        C = N
    return ((X - C[L]) ** 2).sum()
_gpp = sum(_lloyd(_X, _kpp(_X, 4, s)) < 500 for s in range(20))
_gr = sum(_lloyd(_X, _X[_np.random.default_rng(s).choice(len(_X), 4, replace=False)]) < 500 for s in range(20))
assert good_plus_plus == _gpp, f"good_plus_plus should be {_gpp}."
f"SUCCESS: From random starts, {_gr} of 20 runs find the good clustering; from k-means++ starts, {_gpp} of 20."
```

Hint: Keep the chosen centres in a list. For the next choice, compute every row's squared distance to each chosen centre with broadcasting, take the `min(axis=1)`, and divide by the sum to get probabilities for `rng.choice(len(X), p=...)`.
:::

::: challenge Silhouette from scratch [medium]
Write `silhouette(X, labels)` that returns the mean silhouette score. For each point `i`, compute `a`, its mean distance to the **other** points of its own cluster, and `b`, the smallest mean distance from `i` to the points of any **other** cluster; its silhouette is `(b - a) / max(a, b)`, or 0 if its cluster has only one point. Use ordinary (not squared) distances. Return the mean over all points. Clusters are numbered from 0.

The check compares your answer with scikit-learn's `silhouette_score`.

```python starter
import numpy as np

def silhouette(X, labels):
    return 0.0

X = np.array([[0.0, 0.0], [0.0, 1.0], [5.0, 5.0], [5.0, 6.0], [6.0, 5.0]])
print(silhouette(X, np.array([0, 0, 1, 1, 1])))
```

```python solution
import numpy as np

def silhouette(X, labels):
    distances = np.sqrt(((X[:, None, :] - X[None, :, :]) ** 2).sum(axis=2))
    clusters = np.unique(labels)
    scores = []
    for i in range(len(X)):
        own = labels == labels[i]
        if own.sum() == 1:
            scores.append(0.0)
            continue
        a = distances[i, own].sum() / (own.sum() - 1)
        b = min(distances[i, labels == c].mean() for c in clusters if c != labels[i])
        scores.append((b - a) / max(a, b))
    return float(np.mean(scores))

X = np.array([[0.0, 0.0], [0.0, 1.0], [5.0, 5.0], [5.0, 6.0], [6.0, 5.0]])
print(silhouette(X, np.array([0, 0, 1, 1, 1])))
```

```python test
import numpy as _np
from sklearn.metrics import silhouette_score as _ss
from sklearn.datasets import make_blobs as _mb
assert "silhouette" in dir(), "Keep the function's name as silhouette."
_X = _np.array([[0.0, 0.0], [0.0, 1.0], [5.0, 5.0], [5.0, 6.0], [6.0, 5.0]])
_l = _np.array([0, 0, 1, 1, 1])
assert _np.isclose(silhouette(_X, _l), _ss(_X, _l)), f"For the small example the silhouette should be {_ss(_X, _l):.4f}, but got {silhouette(_X, _l)}. Remember a excludes the point itself: divide by (cluster size − 1)."
_P, _ = _mb(80, centers=3, random_state=2)
for _seed in range(3):
    _lab = _np.random.default_rng(_seed).integers(0, 3, 80)
    assert _np.isclose(silhouette(_P, _lab), _ss(_P, _lab)), f"For a random labelling, the silhouette should be {_ss(_P, _lab):.4f}, but got {silhouette(_P, _lab):.4f}."
_single = _np.array([0, 0, 1, 1, 2])
assert _np.isclose(silhouette(_X, _single), _ss(_X, _single)), "A point alone in its cluster should get a silhouette of 0."
"SUCCESS: A clustering score that needs no labels: how much closer each point is to its own cluster than to the next nearest."
```

Hint: Build the full distance matrix once. For point `i`, `distances[i, own]` includes the zero distance to itself, so sum and divide by `own.sum() - 1` for `a`. For `b`, take the mean distance to each other cluster and keep the smallest.
:::

## What you learned

- Unsupervised learning finds structure without labels; clustering groups similar examples.
- k-means represents each cluster by a centre and minimises the inertia, the total squared distance from points to their centres. Lloyd's algorithm alternates assigning points to the nearest centre and moving centres to their cluster means; each step can only lower the inertia, so it always stops.
- It stops at a local minimum that depends on the start. Remedies: several starts (`n_init`), keeping the lowest inertia, and k-means++ starts spread out by squared distance.
- Inertia always falls as `k` grows; choose `k` with an elbow plot, the silhouette score ((b − a)/max(a, b), averaged), and above all usefulness.
- On the digits, k-means found clusters 79% pure without labels.
- k-means assumes round, similar-sized clusters with straight boundaries between them, and depends on feature scale.

k-means needs `k` in advance and can only make round clusters. The next lesson's methods do neither: hierarchical clustering builds a whole family of clusterings at once, and DBSCAN finds clusters of any shape by following regions where points are dense.
