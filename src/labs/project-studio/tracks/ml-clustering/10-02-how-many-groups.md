---
title: 10.2 — How Many Groups, and Can You Trust Them?
track: Clustering — Customer Segments
runtime: none
concepts: clustering
revisits: distance, feature-scaling, regularization, numpy, scikit-learn, testing
notebook: ml-k-means
lab: 17
problem: k-means found four groups because you asked for four. Ask for seven and it finds seven. Start it somewhere else and it can find a worse answer and stop. With no labels to check against, how do you choose the number of groups, and know the groups aren't an accident?
---

Supervised models could be checked against the truth: held-out prices, held-out labels. Clustering has no truth to check. k-means will always return exactly *k* groups, whether or not the data has *k* groups in it. This lesson covers the three ways a clustering goes wrong, and what you can measure instead of accuracy.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_choosing.py provided
# Tests for kmeans.best_of and kmeans.silhouette. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_choosing.py
import numpy as np
from pytest import approx
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

import customers
import kmeans

_, X = customers.load("data/customers.csv")
Z = StandardScaler().fit_transform(X)


def test_an_unlucky_start_gets_stuck():
    start = Z[np.random.default_rng(71).choice(len(Z), size=4, replace=False)]
    centres, labels, _ = kmeans.kmeans(Z, start)
    assert kmeans.inertia(Z, centres, labels) == approx(192.0, abs=0.1)


def test_best_of_keeps_the_run_with_the_lowest_inertia():
    centres, labels, score = kmeans.best_of(Z, 4, starts=10, seed=71)
    assert score == approx(83.0, abs=0.1)
    assert score == approx(kmeans.inertia(Z, centres, labels))
    assert sorted(np.bincount(labels).tolist()) == [37, 72, 84, 107]


def test_silhouette_of_two_obvious_groups():
    points = np.array([[1.0], [2.0], [10.0], [11.0]])
    assert kmeans.silhouette(points, np.array([0, 0, 1, 1])) == approx(0.8885, abs=1e-4)


def test_silhouette_matches_scikit_learn():
    _, labels, _ = kmeans.best_of(Z, 4, starts=10, seed=0)
    assert kmeans.silhouette(Z, labels) == approx(silhouette_score(Z, labels))
```

The first test uses a starting point found by trying many seeds: seed 71 picks four starting customers from which k-means gets stuck. The second runs ten starts from that same seed and must find its way out.

```check
file tests/test_choosing.py -- Click "Create provided tests/test_choosing.py" above.
```

## Problem 1: the start matters

Each k-means step lowers the inertia, but only *locally*: it moves the centres downhill from wherever they started (lesson 2.4's picture). From a bad start, it can reach a place where no single step helps, even though a much better arrangement exists.

> **Local minimum**: a solution that no small change can improve, but that isn't the best solution overall. k-means always stops at one; whether it's the best one depends on where it started.
>
> *Picture it as* the depot problem from lesson 10.1, but starting with two depots in the same town. Each depot moves to the middle of its customers, and the customers stay with the nearest depot, so nothing changes. Everything is "settled", and it's still obviously wrong: one town has two depots and another has none.

Seed 71's start does exactly that. The 40 big accounts end up split into two clusters of 20, and the regulars and the steady mid-size customers are lumped into one cluster of 174: inertia **192**, against **83** for the good answer.

The fix is cheap: run k-means several times from different random starts and keep the run with the lowest inertia. Add `best_of` to the end of `kmeans.py` (everything above it stays):

```python file=kmeans.py
import numpy as np


def assign(X: np.ndarray, centres: np.ndarray) -> np.ndarray:
    """For each row, the number of its nearest centre."""
    distances = np.column_stack([np.sqrt(((X - centre) ** 2).sum(axis=1)) for centre in centres])
    return distances.argmin(axis=1)


def update(X: np.ndarray, labels: np.ndarray, k: int) -> np.ndarray:
    """Each centre moved to the mean of the rows assigned to it."""
    return np.array([X[labels == cluster].mean(axis=0) for cluster in range(k)])


def inertia(X: np.ndarray, centres: np.ndarray, labels: np.ndarray) -> float:
    """The total squared distance from each row to its own centre."""
    return float(((X - centres[labels]) ** 2).sum())


def kmeans(X: np.ndarray, centres: np.ndarray, max_steps: int = 100) -> tuple[np.ndarray, np.ndarray, int]:
    """(centres, labels, steps taken), repeating update and assign until no row changes cluster."""
    labels = assign(X, centres)
    for step in range(1, max_steps + 1):
        centres = update(X, labels, len(centres))
        new_labels = assign(X, centres)
        if np.array_equal(new_labels, labels):
            return centres, labels, step
        labels = new_labels
    return centres, labels, max_steps


def best_of(X: np.ndarray, k: int, starts: int, seed: int) -> tuple[np.ndarray, np.ndarray, float]:
    """(centres, labels, inertia) of the best of several runs, each starting from k random rows."""
    rng = np.random.default_rng(seed)
    best = None
    for _ in range(starts):
        centres, labels, _ = kmeans(X, X[rng.choice(len(X), size=k, replace=False)])
        score = inertia(X, centres, labels)
        if best is None or score < best[2]:
            best = (centres, labels, score)
    return best
```

- **`rng.choice(len(X), size=k, replace=False)`**: *k* different row numbers at random. **`replace=False`** means no row can be picked twice (unlike lesson 9.4's bootstrap), because two identical starting centres would make one of them useless.
- **`best is None or score < best[2]`**: the first run is always kept (there's nothing to compare with yet), and after that only a lower inertia replaces it. Python evaluates `or` left to right and stops at the first true part, so `best[2]` is never looked at while `best` is still `None`.

scikit-learn's `KMeans` does this for you with `n_init` (the number of starts), and it starts more cleverly, with **k-means++**: each new starting centre is picked from points *far* from the ones already chosen, which makes a bad start like seed 71's much rarer.

```check
run ".venv/Scripts/python -m pytest -q tests/test_choosing.py -k \"unlucky or best_of\"" label="one bad start gets stuck at inertia 192; the best of ten starts reaches 83" -- for each start: rows = rng.choice(len(X), size=k, replace=False); run kmeans from X[rows]; keep the lowest inertia
```

## Problem 2: the units decide the groups

Lesson 9.1's lesson applies with full force: distance treats every column alike, so the column with the biggest numbers dominates. Compare the groups found with and without scaling, described in the original units. At the Python prompt:

```text
>>> import numpy as np, customers, kmeans
>>> from sklearn.preprocessing import StandardScaler
>>> names, X = customers.load("data/customers.csv")
>>> _, raw, _ = kmeans.best_of(X, 4, starts=10, seed=0)
>>> [X[raw == c].mean(axis=0).round().tolist() for c in range(4)], np.bincount(raw)
([[14.0, 688.0, 30.0], [5.0, 3087.0, 32.0], [23.0, 197.0, 95.0], [7.0, 2232.0, 41.0]], array([ 53,  19, 208,  20]))
>>> _, scaled, _ = kmeans.best_of(StandardScaler().fit_transform(X), 4, starts=10, seed=0)
>>> [X[scaled == c].mean(axis=0).round().tolist() for c in range(4)], np.bincount(scaled)
([[5.0, 219.0, 213.0], [6.0, 2708.0, 36.0], [40.0, 169.0, 11.0], [13.0, 611.0, 33.0]], array([ 84,  37, 107,  72]))
```

Each list is a cluster's average customer: orders per year, average order (£), days since last order.

- **Unscaled**, the average order (hundreds to thousands of pounds) swamps everything. The clusters are four bands of order value: the big accounts get split into a £2,232 group and a £3,087 group, and 208 customers who all spend around £200 are one cluster, whether they order **40 times a year** or **haven't ordered in 7 months**.
- **Scaled**, the four groups are four different kinds of customer, and you can name them:

| average customer | name |
|---|---|
| 40 orders, £169, last order 11 days ago | **regulars** |
| 13 orders, £611, 33 days ago | **steady mid-size** |
| 6 orders, £2,708, 36 days ago | **big accounts** |
| 5 orders, £219, **213 days ago** | **lapsed**: worth a phone call |

For a business, the difference between a regular and a lapsed customer is the whole point. The unscaled clustering couldn't see it.

## Problem 3: how many groups?

Inertia can't choose *k*. More centres always means points are closer to a centre, so inertia keeps falling as *k* grows, down to 0 when every customer is their own cluster: lesson 7.1's training error in another form. You need a measure that rewards groups being **separate**, not just tight.

> **Silhouette** (of one point): with $a$ = its average distance to the *other* members of its own cluster, and $b$ = its average distance to the members of the *nearest other* cluster, $s = \dfrac{b - a}{\max(a, b)}$. Near 1: well inside its own cluster, far from the next. Near 0: on the border. Negative: probably in the wrong cluster. The **silhouette score** of a clustering is the average over all points.
>
> *Picture it as* asking each customer two questions: how far are you from the others in your own group, and how far from the next-nearest group? A customer who is close to their own group and far from any other is clearly placed.

Work the test's example: points 1, 2, 10, 11 in two clusters {1, 2} and {10, 11}. For point 1: $a$ = distance to 2 = 1; $b$ = average distance to 10 and 11 = 9.5. So $s = (9.5 - 1) / 9.5 = 0.895$. For point 2: $a$ = 1, $b$ = (8 + 9) / 2 = 8.5, $s = 0.882$. By symmetry 10 and 11 give 0.882 and 0.895. The mean is 0.8885.

Add `silhouette` to the end of `kmeans.py`:

```python file=kmeans.py
import numpy as np


def assign(X: np.ndarray, centres: np.ndarray) -> np.ndarray:
    """For each row, the number of its nearest centre."""
    distances = np.column_stack([np.sqrt(((X - centre) ** 2).sum(axis=1)) for centre in centres])
    return distances.argmin(axis=1)


def update(X: np.ndarray, labels: np.ndarray, k: int) -> np.ndarray:
    """Each centre moved to the mean of the rows assigned to it."""
    return np.array([X[labels == cluster].mean(axis=0) for cluster in range(k)])


def inertia(X: np.ndarray, centres: np.ndarray, labels: np.ndarray) -> float:
    """The total squared distance from each row to its own centre."""
    return float(((X - centres[labels]) ** 2).sum())


def kmeans(X: np.ndarray, centres: np.ndarray, max_steps: int = 100) -> tuple[np.ndarray, np.ndarray, int]:
    """(centres, labels, steps taken), repeating update and assign until no row changes cluster."""
    labels = assign(X, centres)
    for step in range(1, max_steps + 1):
        centres = update(X, labels, len(centres))
        new_labels = assign(X, centres)
        if np.array_equal(new_labels, labels):
            return centres, labels, step
        labels = new_labels
    return centres, labels, max_steps


def best_of(X: np.ndarray, k: int, starts: int, seed: int) -> tuple[np.ndarray, np.ndarray, float]:
    """(centres, labels, inertia) of the best of several runs, each starting from k random rows."""
    rng = np.random.default_rng(seed)
    best = None
    for _ in range(starts):
        centres, labels, _ = kmeans(X, X[rng.choice(len(X), size=k, replace=False)])
        score = inertia(X, centres, labels)
        if best is None or score < best[2]:
            best = (centres, labels, score)
    return best


def silhouette(X: np.ndarray, labels: np.ndarray) -> float:
    """The mean silhouette: for each row, how much nearer its own cluster is than the next nearest."""
    scores = []
    for i in range(len(X)):
        distances = np.sqrt(((X - X[i]) ** 2).sum(axis=1))
        own = labels == labels[i]
        if own.sum() == 1:
            scores.append(0.0)
            continue
        a = distances[own].sum() / (own.sum() - 1)
        b = min(distances[labels == other].mean() for other in set(labels.tolist()) if other != labels[i])
        scores.append((b - a) / max(a, b))
    return float(np.mean(scores))
```

- **`distances[own].sum() / (own.sum() - 1)`**: the distances to everyone in the same cluster, *including the point itself* (distance 0), so the sum is unchanged, but there's one fewer *other* member to divide by.
- **`own.sum() == 1`**: a point alone in its cluster has no $a$. By convention its silhouette is 0. **`continue`** skips straight to the next point.
- **`min(… for other in set(labels.tolist()) if other != labels[i])`**: for every *other* cluster, the average distance to its members; the smallest of those is $b$.

```check
run ".venv/Scripts/python -m pytest -q tests/test_choosing.py" label="your silhouette is 0.8885 on the small example, and equals scikit-learn's silhouette_score"
```

## Choosing k

Create `choose_k.py`:

```python file=choose_k.py
from sklearn.preprocessing import StandardScaler

import customers
import kmeans

names, X = customers.load("data/customers.csv")
Z = StandardScaler().fit_transform(X)

print(" k   inertia   silhouette")
for k in range(2, 8):
    centres, labels, score = kmeans.best_of(Z, k, starts=10, seed=0)
    print(f"{k:>2} {score:>9.1f} {kmeans.silhouette(Z, labels):>12.3f}")
```

```powershell
.venv\Scripts\python choose_k.py
```

```text
 k   inertia   silhouette
 2     506.3        0.453
 3     203.7        0.632
 4      83.0        0.657
 5      70.5        0.569
 6      50.3        0.532
 7      45.9        0.457
```

- **Inertia** falls at every *k*, as it must. But look at the size of each drop: 506 → 204 → 83 are big; after 4 the drops are small (83 → 70 → 50 → 46). The bend at *k* = 4 is called the **elbow**: the point after which more clusters stop buying much.
- **Silhouette** peaks at *k* = 4 (0.657) and falls after. Splitting a real group in two makes its halves close to each other, so their points' $b$ shrinks and their silhouettes drop.

Both point to four. That agrees with the naming exercise, which matters just as much: **a clustering is only useful if the groups mean something to the people who'll act on it**. If the silhouette said 4 but the four groups made no sense to the sales team, the right answer would be a different *k* or different columns, not the silhouette's verdict.

```predict
question: The data was generated from four kinds of customer. If it had been generated from four kinds but two of them were very similar (say regulars and slightly-less-regular regulars), what would the silhouette most likely pick?
choice: Still 4: k-means always finds the true number
choice: 3: the two similar kinds would look like one group, and splitting it would lower the silhouette
choice: 7
answer: 3: the two similar kinds would look like one group, and splitting it would lower the silhouette
explain: Clustering finds groups that are separated in the data, not groups that exist in the world. If two kinds of customer overlap in every measured column, nothing in the numbers can separate them, and the silhouette rewards treating them as one. To tell them apart you'd need a column that differs between them.
```

```check
run ".venv/Scripts/python choose_k.py" stdout=" 4      83.0        0.657" label="choose_k.py shows the elbow and the silhouette peak at k = 4"
```
