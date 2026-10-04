---
title: 10.3 — Using the Segments: New Customers and Odd Ones Out
track: Clustering — Customer Segments
runtime: none
concepts: clustering
revisits: feature-scaling, cross-validation, classes, scikit-learn, testing
notebook: ml-k-means
lab: 17
problem: The four segments describe last year's customers. Tomorrow a new customer places their third order. Which segment are they in, using the same scaling and the same centres? And how do you notice a customer who doesn't really fit any segment at all?
---

Clustering so far has been analysis: run it, read the groups, name them. To *use* the segments, say to give each new customer the right account manager, you need a model object like scikit-learn's: `fit` once on the existing customers, then `predict` for anyone new. And because nothing forces a new customer to resemble any segment, it should also say when a customer is **unusual**.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_segments.py provided
# Tests for segments.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_segments.py
import numpy as np
from sklearn.cluster import KMeans
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

import customers

NAMES, X = customers.load("data/customers.csv")
NEW = np.array([[30, 250, 20], [3, 4000, 60], [2, 150, 400], [60, 90, 3]])


def test_fit_finds_four_segments_described_in_the_original_units():
    import segments
    model = segments.Segmenter().fit(X)
    assert sorted(np.bincount(model.labels_).tolist()) == [37, 72, 84, 107]
    regulars = model.labels_[NAMES.index("C002")]
    assert model.profile_[regulars][0] > 35


def test_predict_places_rows_with_the_scaling_learned_in_fit():
    import segments
    model = segments.Segmenter().fit(X)
    assert model.predict(X[:10]).tolist() == model.labels_[:10].tolist()
    assert model.predict(NEW[:1])[0] == model.labels_[NAMES.index("C002")]


def test_unusual_means_farther_out_than_any_existing_customer():
    import segments
    model = segments.Segmenter().fit(X)
    assert not model.unusual(X).any()
    assert model.unusual(NEW).tolist() == [False, True, True, False]


def test_scikit_learn_pipeline_finds_the_same_segments():
    import segments
    mine = segments.Segmenter().fit(X).labels_
    theirs = make_pipeline(StandardScaler(), KMeans(n_clusters=4, n_init=10, random_state=0)).fit(X).predict(X)
    assert len(set(zip(mine.tolist(), theirs.tolist()))) == 4
```

- `NAMES.index("C002")` finds customer C002's row. C002 orders 44 times a year at £174: a regular. The tests use it to find "the regulars' segment" without assuming which number k-means gave it. **Cluster numbers are arbitrary**: run k-means from a different start and the same four groups can come out numbered in any order.
- That's also why the last test can't compare labels directly. Instead, `set(zip(mine, theirs))` collects every (my segment, their segment) pair that occurs. If both find the same four groups, only 4 different pairs appear, however each numbered them.

```check
file tests/test_segments.py -- Click "Create provided tests/test_segments.py" above.
```

## A segmenter that remembers

The scaling is part of the model (lesson 7.4's rule): a new customer must be scaled with the **training** customers' mean and spread, not their own. So the class stores both, along with the centres. Create `segments.py`:

```python file=segments.py
import numpy as np

import kmeans


class Segmenter:
    """Standardise, then k-means: remembers the scaling and the centres, so new customers can be placed."""

    def __init__(self, k: int = 4, starts: int = 10, seed: int = 0):
        self.k, self.starts, self.seed = k, starts, seed

    def fit(self, X: np.ndarray) -> "Segmenter":
        self.mean_, self.std_ = X.mean(axis=0), X.std(axis=0)
        self.centres_, self.labels_, _ = kmeans.best_of(self.scale(X), self.k, self.starts, self.seed)
        self.profile_ = np.array([X[self.labels_ == cluster].mean(axis=0) for cluster in range(self.k)])
        return self

    def scale(self, X: np.ndarray) -> np.ndarray:
        return (X - self.mean_) / self.std_

    def predict(self, X: np.ndarray) -> np.ndarray:
        return kmeans.assign(self.scale(X), self.centres_)
```

- **`fit`** learns three things: the scaling (`mean_`, `std_`), the centres (in standardised units), and a **profile**: each segment's average customer in the *original* units (orders, pounds, days), because that's what people can read. The centres themselves, in standard deviations from the mean, mean nothing to a sales manager.
- **`scale`** uses the stored mean and spread, so `predict` scales a new customer exactly as the training customers were.
- **`predict`** is lesson 10.1's `assign`, after scaling: a new customer joins the nearest centre.

```check
run ".venv/Scripts/python -m pytest -q tests/test_segments.py -k \"fit_finds or predict\"" label="fit finds four segments with readable profiles; predict scales new customers the same way"
```

## Odd ones out

`predict` always returns *some* segment. A customer with 3 orders a year at £4,000 each is "nearest" the big accounts, but bigger than any big account seen so far. A customer who last ordered 400 days ago is nearest the lapsed segment, but further gone than any of them. Both deserve a human look rather than an automatic label.

A simple, explainable rule: measure each customer's distance from their segment's centre, and flag anyone **farther out than every customer the segments were made from**.

> **Anomaly** (or **outlier**): an example that doesn't resemble the data a model was built from. Distance from the nearest cluster centre is one of the simplest ways to score how unusual something is.
>
> *Picture it as* control limits on a chart. Readings inside the limits are ordinary variation; a reading outside them doesn't tell you what's wrong, only that it's different enough to investigate.

**Where the picture stops working:** control limits come from a stable process and a known distribution. Here the "limit" is just the farthest customer seen so far: with more customers, the limit moves out, and one odd customer in the training data widens it for everyone. It's a screening rule, not a statistical test.

Add `distance` and `unusual`:

```python file=segments.py
import numpy as np

import kmeans


class Segmenter:
    """Standardise, then k-means: remembers the scaling and the centres, so new customers can be placed."""

    def __init__(self, k: int = 4, starts: int = 10, seed: int = 0):
        self.k, self.starts, self.seed = k, starts, seed

    def fit(self, X: np.ndarray) -> "Segmenter":
        self.mean_, self.std_ = X.mean(axis=0), X.std(axis=0)
        self.centres_, self.labels_, _ = kmeans.best_of(self.scale(X), self.k, self.starts, self.seed)
        self.profile_ = np.array([X[self.labels_ == cluster].mean(axis=0) for cluster in range(self.k)])
        self.farthest_ = float(self.distance(X).max())
        return self

    def scale(self, X: np.ndarray) -> np.ndarray:
        return (X - self.mean_) / self.std_

    def predict(self, X: np.ndarray) -> np.ndarray:
        return kmeans.assign(self.scale(X), self.centres_)

    def distance(self, X: np.ndarray) -> np.ndarray:
        """How far each row is from the centre of the segment it's placed in (in standardised units)."""
        Z = self.scale(X)
        return np.sqrt(((Z - self.centres_[kmeans.assign(Z, self.centres_)]) ** 2).sum(axis=1))

    def unusual(self, X: np.ndarray) -> np.ndarray:
        """True for rows farther from their segment's centre than any customer the segments were made from."""
        return self.distance(X) > self.farthest_
```

- **`self.centres_[kmeans.assign(Z, self.centres_)]`**: each row's own centre, by fancy indexing, as in lesson 10.1's `inertia`. Subtract, square, sum across the columns, square root: each row's distance to its centre.
- **`self.farthest_`** is computed at the end of `fit`, from the training customers, after the centres exist. Methods can call each other through `self` (here `fit` calls `distance`), in any order they're defined in the class.
- **`> self.farthest_`**: strictly farther than any training customer, so no training customer is ever flagged. The test checks that too.

```check
run ".venv/Scripts/python -m pytest -q tests/test_segments.py" label="unusual flags customers farther out than any existing one; scikit-learn's pipeline finds the same four segments"
```

The last test confirms the professional version: `make_pipeline(StandardScaler(), KMeans(n_clusters=4, n_init=10, random_state=0))` finds the same four groups. A pipeline with a clusterer at the end has `predict` too, scaling new rows with the stored mean and spread exactly as your class does.

## The report

Create `report.py`:

```python file=report.py
import numpy as np

import customers
import segments

names, X = customers.load("data/customers.csv")
model = segments.Segmenter().fit(X)

print("segment  customers  orders/year  average order  days since last")
for cluster, (orders, value, days) in enumerate(model.profile_):
    print(f"{cluster:>7} {np.sum(model.labels_ == cluster):>10} {orders:>12.0f} {value:>14.0f} {days:>16.0f}")

new = np.array([[30, 250, 20], [3, 4000, 60], [2, 150, 400], [60, 90, 3]])
print("\nnew customer            segment  distance  unusual")
for row, segment, distance, odd in zip(new, model.predict(new), model.distance(new), model.unusual(new)):
    print(f"{str(row.tolist()):<23} {segment:>7} {distance:>9.2f}  {'yes' if odd else 'no'}")
print(f"(farthest existing customer: {model.farthest_:.2f})")
```

**`for cluster, (orders, value, days) in enumerate(model.profile_)`**: `enumerate` gives (number, row) pairs, and the brackets unpack each row's three values into names in the same step.

```powershell
.venv\Scripts\python report.py
```

```text
segment  customers  orders/year  average order  days since last
      0         84            5            219              213
      1         37            6           2708               36
      2        107           40            169               11
      3         72           13            611               33

new customer            segment  distance  unusual
[30, 250, 20]                 2      0.63  no
[3, 4000, 60]                 1      1.58  yes
[2, 150, 400]                 0      2.06  yes
[60, 90, 3]                   2      1.23  no
(farthest existing customer: 1.28)
```

- The first new customer is an ordinary regular (segment 2), close to its centre.
- £4,000 orders: placed with the big accounts, and flagged. Worth a call: either the best new account of the year, or a data-entry error with an extra zero.
- 400 days without an order: lapsed, and flagged as further gone than anyone. Perhaps a customer who has closed.
- 60 orders a year is far more than the typical regular's 40, but still within the spread of existing regulars, so not flagged. Whether that's the right call is a business decision, which is why the rule is simple enough to explain.

```check
run ".venv/Scripts/python report.py" stdout="[2, 150, 400]                 0      2.06  yes" label="report.py profiles the segments and places and screens new customers"
```

### What clustering can't tell you

- **The groups are a description, not a discovery of truth.** k-means looks for round, similar-sized groups by design. If the real groups are long and thin, or one is huge and one tiny, it will cut them up anyway.
- **Borders are hard lines through soft data.** Customer C004 orders £1,599 a time, five times a year: almost exactly between the mid-size (£611) and big-account (£2,708) segments. k-means puts it on one side, but it isn't really *in* either. Look at the customers nearest the borders before acting on their labels.
- **There's no held-out accuracy.** The checks are the ones in this chapter: does the result survive different starts, does the silhouette support *k*, do the profiles make sense to the people who know the customers, and does it hold up when the scaling or the columns change?

That's the chapter: groups from unlabelled data, how many and how stable, and how to put them to work. Next chapter: data with so many columns that no one can look at it, and a way to see the shape of it anyway.
