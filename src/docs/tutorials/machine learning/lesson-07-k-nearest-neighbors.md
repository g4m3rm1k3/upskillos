# Lesson 7 — Judged by Your Neighbors: k-Nearest Neighbors

## What you'll learn
- A fourth learning mechanism, and the strangest one yet: no gradients, no recursive splitting, no centroids — just "look at whoever's closest, and copy them."
- What "lazy learning" means, mechanically: there is no training step that produces a compact model at all.
- A trap that isn't about correctness — it's about algorithmic complexity, and it connects directly back to Lesson 1's very first question about Big-O.

*(This lesson reuses `euclidean_distance` and `standardize` from Lesson 6 without re-explaining them — the feature-scaling lesson from last time applies immediately and is assumed, not re-derived, below.)*

## What you'll build
A k-nearest-neighbors classifier, built from scratch, that predicts "exceeds budget" for a brand-new call by finding the most similar *already-labeled* calls and copying their answer — with no fitted parameters, no tree, and no training step at all.

---

## The question

You're back to labeled data — the same twelve calls from Lesson 3, where `n` alone couldn't separate the classes, but `n` and `threads` together could:

| n | threads | exceeded? |
|---|---|---|
| 1,000  | 1  | no |
| 3,000  | 2  | no |
| 6,000  | 10 | yes |
| 8,000  | 1  | no |
| 10,000 | 9  | yes |
| 15,000 | 2  | no |
| 20,000 | 1  | no |
| 22,000 | 10 | yes |
| 27,000 | 1  | yes |
| 30,000 | 3  | yes |
| 35,000 | 12 | yes |
| 40,000 | 2  | yes |

Lesson 3 handled this by building a tree of yes/no questions. There's a completely different way to answer "will a new call at `n=9000, threads=8` exceed budget?" — don't build anything at all. Just find the labeled calls that are *most similar* to this new one, and see what they did.

---

## 1. Predict

For a new call at `n=9000, threads=8`, look at the table above and find the three rows that feel "closest" to it in both `n` and `threads` at once (not just closest in `n`). What do those three rows' labels suggest the new call's answer should be?

---

## 2. Try it: rank everyone by distance to one new point

```python
import numpy as np

n = np.array([1000, 3000, 6000, 8000, 10000, 15000, 20000, 22000, 27000, 30000, 35000, 40000], dtype=float)
threads = np.array([1, 2, 10, 1, 9, 2, 1, 10, 1, 3, 12, 2], dtype=float)
exceeded = np.array([0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1], dtype=float)

points = np.column_stack([n, threads])

def standardize(points):
    means = points.mean(axis=0)
    stds = points.std(axis=0)
    return (points - means) / stds, means, stds

def euclidean_distance(a, b):
    return np.sqrt(np.sum((a - b) ** 2))

scaled_points, means, stds = standardize(points)
query = np.array([9000, 8])
scaled_query = (query - means) / stds

distances = [euclidean_distance(scaled_query, p) for p in scaled_points]
ranking = np.argsort(distances)
print(ranking)
print(exceeded[ranking])
```

### What this code does

- **`points = np.column_stack([n, threads])`** — `np.column_stack` takes a list of 1D arrays and stacks them side-by-side as columns, producing one 2D array of shape `(12, 2)`. This is the tool that turns "two separate feature arrays" (the format every earlier lesson used) into "one array of points" (the format Lesson 6's distance-based functions expect).

- **`scaled_query = (query - means) / stds`** — the new point must be standardized using the **training data's** mean and standard deviation, not its own — there's only one query point, so it has no meaningful mean or spread of its own. Using the training set's `means`/`stds` (computed once, in Section 2) keeps the query point on the exact same numeric scale as everything it's being compared against.

- **`distances = [euclidean_distance(scaled_query, p) for p in scaled_points]`** — one distance computed per training point, reusing the exact same function from Lesson 6, applied here between one query point and each of the 12 stored points, rather than between pairs of centroids and points.

- **`ranking = np.argsort(distances)`** — as in Lesson 5's diagnostic exercises, `argsort` returns the *indices* that would sort `distances` from smallest to largest — `ranking[0]` is the index of the single closest training point, `ranking[1]` the second-closest, and so on.

- **`exceeded[ranking]`** — integer array indexing (seen repeatedly since Lesson 4): reorders the *labels* to match the distance ranking, so you can read off, in order, "closest point's label, second-closest point's label, ..." directly.

### What happens

The printed labels, in nearest-to-farthest order, should start with several `1`s — the rows with `n` in the 6,000–22,000 range *and* high `threads` (rows that share both characteristics with the query) rank closest, exactly the intuition from Section 1. This ranking, truncated to some small number `k`, is the entire mechanism — there's no model to fit, only this list to compute, fresh, every single time you want a prediction.

---

## 3. Why: no training step, just a stored dataset and a vote

**The mechanism**, stated completely: to classify a new point, compute its distance to *every* training point, take the `k` closest, and let them vote (majority label wins).

```python
def knn_predict(training_points, training_labels, query_point, k):
    distances = [euclidean_distance(query_point, p) for p in training_points]
    nearest_indices = np.argsort(distances)[:k]
    nearest_labels = training_labels[nearest_indices]
    return 1 if np.mean(nearest_labels) >= 0.5 else 0

prediction = knn_predict(scaled_points, exceeded, scaled_query, k=3)
print(f"predicted: {'EXCEEDS' if prediction else 'within budget'}")
```

### Code mechanics

- **`np.argsort(distances)[:k]`** — `np.argsort` sorts all 12 distances (as in Section 2), and `[:k]` slices off just the *first* `k` — the `k` smallest distances' indices, discarding the rest. If `k=3`, only the three nearest neighbors are kept; the other nine training points are computed but then simply ignored.

- **`training_labels[nearest_indices]`** — pulls out just the labels belonging to those `k` nearest points.

- **`1 if np.mean(nearest_labels) >= 0.5 else 0`** — the exact same majority-vote pattern from Lesson 4's random forest (`1 if np.mean(votes) >= 0.5 else 0`), just voting among *neighbors* instead of *trees*. If 2 of the 3 nearest neighbors are labeled `1`, the mean is `0.667`, and the prediction is `1`.

**What's conspicuously absent from this entire lesson so far: there is no `build_model`, no `fit`, no loop that adjusts anything, and nothing gets "learned" ahead of time.** `knn_predict` takes the *entire* training set as an argument, every single time it's called. This is called a **lazy learner** — all the work is deferred to prediction time; "training" k-NN literally just means storing the data.

### Execution trace (one prediction)

```
1. compute distance from the query point to ALL 12 stored training points
2. sort those 12 distances, keep only the 3 smallest (k=3)
3. look up the labels of those 3 nearest points
4. take the majority label among just those 3
5. that majority IS the prediction — nothing was fitted, nothing is reused
   from one prediction to the next except the raw stored data itself
```

### Mental model

```
new point arrives
        ↓
measure its distance to EVERY stored training point (all of it, every time)
        ↓
keep only the k closest
        ↓
let them vote
        ↓
majority wins — no parameters, no tree structure, no fitted anything
```

---

## 4. Change one thing

Here's a real, commonly-used refinement — instead of every one of the `k` neighbors getting an equal vote, closer neighbors get a *stronger* vote:

```diff
  def knn_predict(training_points, training_labels, query_point, k):
      distances = [euclidean_distance(query_point, p) for p in training_points]
      nearest_indices = np.argsort(distances)[:k]
      nearest_labels = training_labels[nearest_indices]
-     return 1 if np.mean(nearest_labels) >= 0.5 else 0
+     nearest_distances = np.array(distances)[nearest_indices]
+     weights = 1 / (nearest_distances + 1e-6)
+     weighted_vote = np.sum(weights * nearest_labels) / np.sum(weights)
+     return 1 if weighted_vote >= 0.5 else 0
```

**What changed:** every neighbor's vote is now scaled by `1 / distance` before being combined, instead of every neighbor within the top-`k` counting identically.

**What did not change:** which `k` neighbors get considered at all — `nearest_indices` is computed exactly the same way; only how their votes are *combined* differs.

**Why this is a genuine improvement, not just added complexity:** with plain majority voting, the 1st-nearest neighbor (distance `0.1`) and the `k`-th nearest neighbor (distance `4.9`, barely inside the cutoff) count *identically*. That's throwing away real information — the 1st-nearest neighbor's label is much stronger evidence about the query point than the `k`-th-nearest's, which might barely qualify as "nearby" at all. `1e-6` in the denominator is a small constant added purely to avoid a literal division by zero on the rare occasion a query point is numerically identical to a training point (distance exactly `0`).

---

## 5. Put it in the project

```python
test_cases = np.array([
    [9000, 8],
    [4000, 1],
    [24000, 5],
])
for case in test_cases:
    scaled_case = (case - means) / stds
    distances = [euclidean_distance(scaled_case, p) for p in scaled_points]
    nearest_indices = np.argsort(distances)[:3]
    votes = exceeded[nearest_indices]
    print(f"n={case[0]:>6} threads={case[1]:>2}  "
          f"nearest 3 labels: {votes}  → "
          f"{'EXCEEDS' if np.mean(votes) >= 0.5 else 'within budget'}")
```

Notice this printout — showing the actual `k` neighbor labels alongside the final vote — gives a form of transparency similar to Lesson 4's vote tally: you can see *exactly which* past examples informed this specific prediction, something Lessons 1, 2, and 5's models can't show you directly (a coefficient or a sum of trees doesn't point to specific past examples the way "these 3 similar calls" does).

### Why this design: choosing k

**Problem:** `k=3` was used throughout this lesson. Why not `k=1`, or `k=11` (nearly the whole dataset)?

**Available choices:** small `k` (as low as `1`), moderate `k` (`3` to `5` here, given only 12 training points), or large `k` (approaching the full dataset size).

**Selected choice:** a small, odd `k` like `3`.

**Reason:** `k=1` means a new point's prediction is decided entirely by whichever single training point happens to be nearest — if that one point happens to be mislabeled or unusual, the prediction inherits that mistake completely, with zero averaging to smooth it out (the k-NN equivalent of an unconstrained decision tree memorizing noise, from Lesson 3). At the opposite extreme, `k` approaching the full training set size means nearly every prediction just returns the overall majority label, regardless of the query point's actual position — you'd get k-NN degenerating into "always guess the more common class," discarding the entire point of measuring distance at all. An odd, moderate `k` also avoids exact ties in binary voting, which even `k` values can produce.

**Cost:** there's no formula that hands you the perfect `k` — it's typically chosen by trying several values and checking which one predicts best on data the model hasn't seen, the same validation-based tuning mentioned as a gap in Lesson 5.

**Revisit condition:** if predictions seem to flip unpredictably for very similar query points, `k` may be too small (too sensitive to individual neighbors); if predictions seem to ignore the query point's actual position entirely, `k` may be too large.

---

## 6. The trap

**Normal rule, true of every algorithm in this series so far:** once you've trained a model — fit `w` and `b` (Lessons 1, 2), grown a tree (Lesson 3), built a forest or boosted ensemble (Lessons 4, 5) — making a *new* prediction is cheap and doesn't get slower as your original training set grows. A trained decision tree with depth 3 takes at most 3 comparisons to predict, whether it was trained on 12 rows or 12 million.

**Apparently reasonable expectation** — since k-NN "worked instantly" on this lesson's 12-row dataset, assume it'll scale the same way to a much larger, more realistic training set:

```python
import time

np.random.seed(0)
big_n = np.random.uniform(1000, 40000, size=20000)
big_threads = np.random.uniform(1, 15, size=20000)
big_labels = ((big_n > 25000) | ((big_n > 5000) & (big_threads >= 8))).astype(float)
big_points = np.column_stack([big_n, big_threads])
scaled_big, big_means, big_stds = standardize(big_points)

query = np.array([9000, 8])
scaled_query_big = (query - big_means) / big_stds

start = time.perf_counter()
for _ in range(200):
    knn_predict(scaled_big, big_labels, scaled_query_big, k=5)
elapsed = time.perf_counter() - start
print(f"200 predictions against {len(scaled_big)} stored training points: {elapsed:.3f}s")
```

- **`(big_n > 25000) | ((big_n > 5000) & (big_threads >= 8))`** — the same rule from Lesson 3, now evaluated across a 20,000-element array at once. `|` and `&` here are the **elementwise** boolean operators for NumPy arrays — deliberately *not* Python's plain `or`/`and` keywords, which only know how to compare single `True`/`False` values, not compare every element of two arrays position-by-position. Using `or`/`and` here would raise an error.
- **`time.perf_counter()`** — a monotonic, high-resolution timer intended specifically for measuring short elapsed durations accurately; called once before and once after the loop, with the difference giving the elapsed wall-clock time.

**Surprising result:** this takes noticeably, measurably longer than the 12-row version — and if you re-run it with `size=200000` instead of `20000`, it takes roughly ten times longer still, scaling up in direct proportion to the training set size. Compare that to Lesson 3's `predict_one` on a trained tree: it would take *exactly the same time* whether the tree had been trained on 12 rows or 12 million, because prediction only ever walks down the tree's fixed depth.

**Exact reason:** `knn_predict` computes `euclidean_distance` against **every single training point**, every single time it's called — there is no compact, fitted structure standing in for the data. This is the direct, mechanical cost of being a "lazy learner": all the computation that other algorithms front-load into a one-time training phase, k-NN defers entirely to prediction time, and pays again, in full, on *every* prediction. This is quite literally a Big-O statement, connecting straight back to Lesson 1's opening question: predicting one point costs `O(m)` where `m` is the training set size, and predicting `q` new points costs `O(q × m)` — a cost every gradient-based or tree-based model in this series pays *once*, during training, and never again.

**Project consequence:** naive k-NN, exactly as built in this lesson, does not scale to large training sets or high-throughput, low-latency prediction demands the way the earlier lessons' models do. This isn't a flaw to "fix" so much as a fundamental tradeoff to know about *before* reaching for k-NN in a production setting with a large or fast-growing dataset.

---

## 7. Under the hood

*(Optional — not required to use k-NN correctly.)*

Real k-NN implementations rarely scan every training point by brute force for large datasets — they use spatial index structures like **KD-trees** or **ball trees**, which organize the training points so that "find the nearest neighbors" can skip over most of the data instead of checking every point, similar in spirit to how a sorted array lets you binary-search instead of scanning linearly. These structures help a great deal in low-dimensional spaces (like this lesson's 2 features) but become progressively less effective as the number of features grows — a well-known phenomenon called the **curse of dimensionality**, where in high-dimensional spaces, most points end up roughly equidistant from each other, and "nearest neighbor" starts to lose its intuitive meaning. Extremely large-scale systems often trade exactness for speed entirely, using **approximate** nearest-neighbor methods (like HNSW or LSH) that don't guarantee finding the *true* closest points, only points that are *probably* close enough, in exchange for far better speed at massive scale.

---

## 8. Exercises

- **Predict:** for the query `n=4000, threads=1`, which training rows do you expect to be the 3 nearest neighbors after standardization, and what would you predict the label to be? Check your reasoning against the code's output.
- **Modify:** implement the distance-weighted version from Section 4 as a real function, and compare its prediction against plain majority voting for a query point that sits almost exactly between two training points with different labels but very different distances (construct one if the existing data doesn't have a clean example).
- **Break:** call `knn_predict` with `k=4` (an even number) on a constructed query point where you can arrange exactly 2 of the 4 nearest neighbors to have each label. What does `1 if np.mean(nearest_labels) >= 0.5 else 0` do in that exact tie case, and why is that a hidden, easy-to-miss default behavior rather than a deliberate design choice?
- **Trace:** using the timing code from Section 6, estimate (using simple proportional reasoning, not by literally running it) roughly how long 200 predictions would take against 2,000,000 stored training points, given your measured time for 20,000. Then explain in one sentence why a trained decision tree wouldn't show this same scaling behavior at all.

---

## What to remember

- k-NN has no training phase at all in the usual sense — "training" just means storing the data, and every real computation happens at prediction time, against the full stored dataset, every single time.
- The feature-scaling requirement from Lesson 6 isn't a one-off quirk of clustering — any distance-based algorithm, k-NN included, needs standardized features or the largest-magnitude feature silently dominates every distance calculation.
- k-NN's prediction cost grows directly with training set size — `O(m)` per prediction — while every model built in earlier lessons pays its real cost once, during training, and predicts in roughly constant time afterward regardless of how much data it was trained on.

## Next lesson

k-NN draws no explicit boundary at all — it just asks "who's nearby?" every single time. The opposite philosophy is to draw one deliberate, explicit boundary between classes — not just any boundary that happens to separate them, but the one with the widest possible safety margin on both sides. That's the idea behind support vector machines.
