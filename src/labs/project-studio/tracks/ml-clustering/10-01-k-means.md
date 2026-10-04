---
title: 10.1 — Groups Nobody Labelled: k-Means
track: Clustering — Customer Segments
trackOrder: 30
runtime: none
support: data/customers.csv
concepts: clustering
revisits: distance, descriptive-statistics, feature-scaling, numpy, testing
notebook: ml-k-means
lab: 17
problem: A parts supplier has 300 trade customers and treats them all the same. Nobody has ever sorted them into kinds. Are there natural groups in how they order, and how would a program find groups when nobody can tell it what the groups are?
---

Every model so far learned from **labelled** examples: each house came with its price, each message with *spam* or *ham*, each run with *defect* or not. That's **supervised** learning: the labels supervise.

This chapter has no labels. A parts supplier has 300 trade customers, and for each one, three numbers from last year's orders: how many orders, the average order value, and how many days since their last order. Nobody has said which customers are which kind, or even how many kinds there are. The question is whether the data *falls into groups by itself*.

> **Unsupervised learning**: finding structure in data that has no labels. **Clustering** is its most common form: dividing the examples into groups (**clusters**) so that members of a group are similar to each other and different from other groups.
>
> *Picture it as* tipping a mixed bin of fasteners onto the bench and sorting them into piles without a parts list. Nobody tells you the categories; you put things that look alike together, and the piles you end up with *are* the categories.

## A new project

1. **Choose folder…** → in **Documents**, a **New folder** named `customer-segments`.
2. `python -m venv .venv`
3. `requirements.txt`:

```text file=requirements.txt
pytest==9.1.1
numpy==2.5.3
scikit-learn==1.9.1
```

4. `.venv\Scripts\python -m pip install -r requirements.txt`

```check
run ".venv/Scripts/python -c \"import sklearn, numpy, pytest\"" label="NumPy, scikit-learn and pytest are installed in the project's Python" -- python -m venv .venv, then .venv\Scripts\python -m pip install -r requirements.txt
```

## Read the tests first

**This step: create the supplied files and read them. No code yet.** The button also creates `data/customers.csv`: one row per customer, with no label column.

```python file=tests/test_clusters.py provided
# Tests for customers.py and kmeans.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_clusters.py
import numpy as np
from pytest import approx
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

POINTS = np.array([[1.0], [2.0], [4.0], [10.0], [11.0], [12.0]])
START = np.array([[1.0], [2.0]])


def test_load_reads_every_customer():
    import customers
    names, X = customers.load("data/customers.csv")
    assert len(names) == 300 and X.shape == (300, 3)
    assert names[0] == "C001" and X[0].tolist() == [13, 559, 36]


def test_assign_picks_the_nearest_centre():
    import kmeans
    assert kmeans.assign(POINTS, START).tolist() == [0, 1, 1, 1, 1, 1]


def test_update_moves_each_centre_to_the_mean_of_its_points():
    import kmeans
    assert kmeans.update(POINTS, np.array([0, 1, 1, 1, 1, 1]), 2).ravel().tolist() == [1.0, 7.8]


def test_inertia_adds_up_squared_distances_to_the_centres():
    import kmeans
    centres = np.array([[7 / 3], [11.0]])
    assert kmeans.inertia(POINTS, centres, np.array([0, 0, 0, 1, 1, 1])) == approx(20 / 3)


def test_kmeans_stops_when_nothing_changes():
    import kmeans
    centres, labels, steps = kmeans.kmeans(POINTS, START)
    assert centres.ravel() == approx([7 / 3, 11.0])
    assert labels.tolist() == [0, 0, 0, 1, 1, 1]
    assert steps == 2


def test_kmeans_matches_scikit_learn_from_the_same_start():
    import customers, kmeans
    _, X = customers.load("data/customers.csv")
    Z = StandardScaler().fit_transform(X)
    centres, labels, _ = kmeans.kmeans(Z, Z[:4].copy())
    theirs = KMeans(n_clusters=4, init=Z[:4], n_init=1, algorithm="lloyd").fit(Z)
    assert labels.tolist() == theirs.labels_.tolist()
    assert np.allclose(centres, theirs.cluster_centers_)
```

- `POINTS` is six numbers on a line, small enough to follow by hand: three near 2 and three near 11. Two groups, obviously, and the tests check the algorithm finds them.
- **`.ravel()`** flattens an array into one dimension: the 2 × 1 table of centres becomes the list `[1.0, 7.8]`.
- The last test starts scikit-learn's `KMeans` from the same centres as yours (`init=Z[:4]`, the first four customers), so the two must agree exactly.

```check
file tests/test_clusters.py -- Click "Create provided tests/test_clusters.py" above.
file data/customers.csv
```

## Load the customers

Create `customers.py`:

```python file=customers.py
import csv

import numpy as np

COLUMNS = ["orders_per_year", "average_order", "days_since_last_order"]


def load(path: str) -> tuple[list[str], np.ndarray]:
    names, rows = [], []
    with open(path, newline="") as file:
        for row in csv.DictReader(file):
            names.append(row["customer"])
            rows.append([float(row[column]) for column in COLUMNS])
    return names, np.array(rows)
```

The customer's name is kept separately: it identifies a row but isn't something to measure similarity by.

```check
run ".venv/Scripts/python -m pytest -q tests/test_clusters.py -k load" label="300 customers, three numbers each"
```

## The k-means idea

Suppose you had to pick *k* points, one at the middle of each group: the **centres**. Two things would be easy:

1. **Given the centres**, each customer belongs with the **nearest** centre (distance, lesson 2.1).
2. **Given who belongs where**, each centre should sit at the **mean** of its members (the point with the smallest total squared distance to them, as the mean was in lesson 1.2).

You know neither. k-means solves it by guessing the centres and then simply alternating the two easy steps until nothing changes.

> **k-means**: a clustering method that places *k* centres, then repeats two steps: **assign** each point to its nearest centre; **update** each centre to the mean of its points. It stops when the assignments stop changing. *k*, the number of clusters, is chosen by you.
>
> *Picture it as* placing *k* depots for a delivery round. Each customer is served by the nearest depot; then each depot moves to the middle of the customers it serves; then some customers find a different depot is now nearer, and switch. Repeat until no customer switches.

## Assign and update

Create `kmeans.py`:

```python file=kmeans.py
import numpy as np


def assign(X: np.ndarray, centres: np.ndarray) -> np.ndarray:
    """For each row, the number of its nearest centre."""
    distances = np.column_stack([np.sqrt(((X - centre) ** 2).sum(axis=1)) for centre in centres])
    return distances.argmin(axis=1)


def update(X: np.ndarray, labels: np.ndarray, k: int) -> np.ndarray:
    """Each centre moved to the mean of the rows assigned to it."""
    return np.array([X[labels == cluster].mean(axis=0) for cluster in range(k)])
```

- **`assign`**: for each centre, `np.sqrt(((X - centre) ** 2).sum(axis=1))` is the distance from every row to it (lesson 9.1's k-NN line). **`np.column_stack`** puts those side by side: a table with one row per point and one column per centre. **`.argmin(axis=1)`** then gives, for each row, the *position* of its smallest distance: the number of its nearest centre.
- **`update`**: `X[labels == cluster]` keeps the rows assigned to that cluster (a mask, lesson 1.3), and `.mean(axis=0)` averages down the columns, giving the cluster's middle point.

Trace one round with the test's `POINTS` (1, 2, 4, 10, 11, 12) and `START` centres 1 and 2:

- **Assign.** 1 is nearest centre 0 (distance 0). Everything else is nearer 2 than 1, including 10, 11 and 12. Labels: `[0, 1, 1, 1, 1, 1]`.
- **Update.** Centre 0 = mean of {1} = 1. Centre 1 = mean of {2, 4, 10, 11, 12} = 39 / 5 = 7.8.

A terrible start (both centres in the left group), and after one round centre 1 has already moved most of the way to the right group.

```check
run ".venv/Scripts/python -m pytest -q tests/test_clusters.py -k \"assign or update\"" label="assign finds the nearest centre; update moves each centre to its members' mean" -- assign: a column of distances per centre, then argmin(axis=1); update: X[labels == cluster].mean(axis=0) for each cluster
```

## Repeat until nothing changes

How good is a clustering? A natural measure is how far points are from their own centre: add up the **squared** distances. That total is the **inertia** (also called the within-cluster sum of squares). Each k-means step can only lower it or leave it the same, which is why the loop must eventually stop.

Add `inertia` and the loop:

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
```

- **`centres[labels]`**: fancy indexing (lesson 7.3) with the label of every row gives, for each row, *its own* centre: a table the same shape as `X`. Subtract, square, add everything up.
- **The loop**: update the centres, re-assign, and if no label changed, the centres won't move again either, so stop. `max_steps` is a safety limit in case something goes wrong; it's rarely reached.
- **`range(1, max_steps + 1)`** counts steps from 1, so the returned `step` is how many updates happened.

Continue the trace. After round 1 the centres are 1 and 7.8. **Assign**: 1, 2 and 4 are nearer 1 (4 is 3 from 1, 3.8 from 7.8); 10, 11, 12 nearer 7.8. Labels `[0, 0, 0, 1, 1, 1]`. That's a change, so go on. **Round 2, update**: centres 7/3 ≈ 2.33 and 11. **Assign**: same labels. Nothing changed: stop after 2 steps. Inertia: (1−2.33)² + (2−2.33)² + (4−2.33)² + (10−11)² + 0 + (12−11)² = 20/3 ≈ 6.67.

```check
run ".venv/Scripts/python -m pytest -q tests/test_clusters.py" label="k-means stops when nothing changes, and matches scikit-learn's KMeans from the same start"
```

## The customers in four groups

Run it on the real data at the Python prompt. The three columns are on wildly different scales (orders per year in tens, average order in hundreds or thousands of pounds), so standardise first, exactly as k-NN needed in lesson 9.1:

```text
>>> import numpy as np, customers, kmeans
>>> from sklearn.preprocessing import StandardScaler
>>> names, X = customers.load("data/customers.csv")
>>> Z = StandardScaler().fit_transform(X)
>>> centres, labels, steps = kmeans.kmeans(Z, Z[:4].copy())
>>> steps
2
>>> np.bincount(labels)
array([ 71, 107,  84,  38])
>>> round(kmeans.inertia(Z, centres, labels), 1)
83.0
```

- **`StandardScaler().fit_transform(X)`** is `fit(X)` then `transform(X)` in one call: each column to mean 0, spread 1.
- **`Z[:4].copy()`**: the first four customers as starting centres. `.copy()` so that nothing that changes the centres could ever change `Z` itself.
- **`np.bincount(labels)`** counts how many times each label occurs: the size of each cluster.

Four groups of 71, 107, 84 and 38 customers, found in two steps, from data with no labels at all. But is four the right number? And would a different start give the same groups? Those are the next lesson's questions, and the answers are less automatic than they look.
