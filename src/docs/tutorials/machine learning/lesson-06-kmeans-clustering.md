# Lesson 6 — Finding Groups Nobody Labeled: k-Means Clustering

## What you'll learn
- Every algorithm so far needed a "correct answer" column to learn from. This one doesn't — it finds structure in raw measurements alone.
- A third completely different learning mechanism: no gradients (Lessons 1, 2, 5), no recursive splitting (Lessons 3, 4) — just alternating between "assign" and "average" until nothing changes.
- A trap that is arguably *the* most common real-world k-means mistake, and one that will matter again in future distance-based lessons.

## What you'll build
A k-means clusterer, built from scratch, that groups monitored calls into natural categories using only `n` and `threads` — with zero labels supplied anywhere.

---

## The question

You've been logging `n` and `threads` for twelve calls, but this time — unlike every previous lesson — **nobody recorded whether each call was slow, fast, or anything else.** You just have the raw numbers:

| n | threads |
|---|---|
| 1,000  | 1  |
| 1,500  | 2  |
| 2,000  | 1  |
| 1,200  | 2  |
| 6,000  | 10 |
| 7,000  | 9  |
| 5,500  | 11 |
| 8,000  | 10 |
| 28,000 | 2  |
| 30,000 | 1  |
| 32,000 | 3  |
| 27,000 | 2  |

You suspect there are naturally different *kinds* of calls here — maybe small quick lookups, contention-heavy calls, and large batch jobs — but nobody tagged which is which. You want the data to reveal its own groups.

---

## 1. Predict

Looking only at the `n` column, sorted, do you see three natural groups? Now look only at `threads` — do you see the *same* three groups, or a different split? What does it tell you if the two columns disagree about where the natural boundaries are?

---

## 2. Try it: measuring "nearest," not "correct"

Every previous lesson measured wrongness against a known right answer. Clustering has no right answer to check against — its only tool is **distance**.

```python
import numpy as np

points = np.array([
    [1000, 1], [1500, 2], [2000, 1], [1200, 2],
    [6000, 10], [7000, 9], [5500, 11], [8000, 10],
    [28000, 2], [30000, 1], [32000, 3], [27000, 2],
], dtype=float)

def euclidean_distance(a, b):
    return np.sqrt(np.sum((a - b) ** 2))

guess_centroids = np.array([
    [1500, 1.5],
    [6500, 10],
    [29000, 2],
])

def assign_clusters(points, centroids):
    assignments = []
    for point in points:
        distances = [euclidean_distance(point, c) for c in centroids]
        assignments.append(np.argmin(distances))
    return np.array(assignments)

print(assign_clusters(points, guess_centroids))
```

### What this code does

- **`points = np.array([[1000, 1], [1500, 2], ...])`** — a **2D** NumPy array this time, not the 1D arrays from every previous lesson. Each *row* is one data point (`[n, threads]`); the array's shape is `(12, 2)` — 12 rows, 2 columns.

- **`euclidean_distance(a, b)`**: **`a - b`** on two same-length arrays (here, two 2-element points) is elementwise subtraction — `[n1 - n2, threads1 - threads2]`. **`** 2`** squares each of those two differences. **`np.sum(...)`** adds the squared differences together into one number. **`np.sqrt(...)`** takes the square root. This is the ordinary geometric distance formula (Pythagorean theorem, generalized to any number of dimensions) — "how far apart are these two points."

- **`guess_centroids = np.array([[1500, 1.5], [6500, 10], [29000, 2]])`** — three hand-picked guesses at where the "center" of each of the three suspected groups might be, chosen just by eyeballing the table above. Also a `(3, 2)` array — three centroids, each with 2 coordinates.

- **`for point in points:`** — iterating over a 2D array's rows: each `point` is one `[n, threads]` pair, exactly like iterating over a list of pairs.

- **`distances = [euclidean_distance(point, c) for c in centroids]`** — a list comprehension computing the distance from this one `point` to *each* of the three centroids, producing a 3-element list like `[420.1, 5200.3, 27600.8]`.

- **`np.argmin(distances)`** — returns the *index* of the smallest value in the list (not the value itself). If the smallest distance is at position `0`, this point gets assigned to cluster `0`.

### What happens

Running this against the hand-picked `guess_centroids` should assign the first four points to cluster `0`, the next four to cluster `1`, and the last four to cluster `2` — matching your eyeballed groups from Section 1, because the guessed centroids happen to sit close to each true group's center. But you had to guess those centroids by hand. The real algorithm needs to find them automatically.

---

## 3. Why: assign, then average, repeat

**The mechanism** has no calculus and no recursion — just two steps, alternated:

1. Assign every point to its nearest centroid (exactly what Section 2 just did).
2. Move each centroid to the **average position** of all points currently assigned to it.

Repeat both steps until assignments stop changing.

```python
def update_centroids(points, assignments, k):
    new_centroids = []
    for cluster_id in range(k):
        cluster_points = points[assignments == cluster_id]
        new_centroids.append(cluster_points.mean(axis=0))
    return np.array(new_centroids)

def kmeans(points, k, num_iterations=10, initial_centroids=None):
    if initial_centroids is None:
        random_rows = np.random.choice(len(points), size=k, replace=False)
        centroids = points[random_rows]
    else:
        centroids = initial_centroids

    for _ in range(num_iterations):
        assignments = assign_clusters(points, centroids)
        centroids = update_centroids(points, assignments, k)

    return centroids, assignments

centroids, assignments = kmeans(points, k=3)
```

### Code mechanics

- **`assignments == cluster_id`** — `assignments` is a 1D array of cluster indices (like `[0, 0, 0, 0, 1, 1, ...]`); comparing it to a single number produces a boolean mask, `True` wherever that point currently belongs to `cluster_id` — the same boolean-mask-indexing idea from Lessons 3–5, now applied to select entire *rows* of a 2D array.

- **`points[assignments == cluster_id]`** — filters `points` down to only the rows currently assigned to this cluster: a smaller 2D array, e.g. `(4, 2)` if 4 points are currently in this cluster.

- **`cluster_points.mean(axis=0)`** — `.mean()` on a 2D array needs to know *which direction* to average across. `axis=0` means "average down each column" — producing one average `n` and one average `threads`, i.e. a new 2-element centroid. (`axis=1` would instead average *across* each row, collapsing the two columns into one number per point — not what's wanted here; getting this backwards is a common, silent mistake.)

- **`if initial_centroids is None: ... random_rows = np.random.choice(len(points), size=k, replace=False) ... centroids = points[random_rows]`** — when no starting centroids are supplied, pick `k` distinct **actual data points** at random to serve as the initial guesses, rather than inventing arbitrary coordinates. `replace=False` (seen before in Lesson 4, applied here to row indices instead of feature names) ensures the same data point isn't chosen as two different centroids.

- **`for _ in range(num_iterations): assignments = assign_clusters(...); centroids = update_centroids(...)`** — the alternation, repeated a fixed number of times. Note there's no gradient anywhere in this loop — each step is a hard reassignment followed by a plain average, not a small nudge in a calculated direction.

### Execution trace (two iterations)

```
iteration 0:
  assign_clusters using the random starting centroids
      → some points may be misassigned, since starting centroids are just random data points
  update_centroids: each cluster's centroid moves to the AVERAGE of whatever
      points happened to land in it this round

iteration 1:
  assign_clusters AGAIN, using the newly moved centroids
      → assignments may shift, since the centroids are now in better positions
  update_centroids AGAIN: centroids move again, usually by a smaller amount than
      the previous round

... continues until assignments stop changing between iterations (convergence),
    or num_iterations is exhausted
```

### Mental model

```
pick k starting points to act as centroids
        ↓
assign every point to its nearest centroid
        ↓
move each centroid to the mean of the points now assigned to it
        ↓
repeat
        ↓
stop once assignments no longer change
```

Worth noticing explicitly: k-means *is* minimizing something — the total squared distance from every point to its assigned centroid — but it gets there through alternating hard assignment and averaging, not through computing a derivative and stepping along it. That's a third distinct mechanism for "learning" in this series, after gradient-based (Lessons 1, 2, 5) and recursive-splitting (Lessons 3, 4).

---

## 4. Change one thing

Here's a smaller but real design choice, isolated as a diff — how initial centroids get picked:

```diff
- random_rows = np.random.choice(len(points), size=k, replace=False)
- centroids = points[random_rows]
+ mins = points.min(axis=0)
+ maxs = points.max(axis=0)
+ centroids = np.random.uniform(mins, maxs, size=(k, points.shape[1]))
```

**What changed:** centroids now start as fully random coordinates anywhere within the data's overall bounding box (`np.random.uniform(mins, maxs, ...)` picks values between the observed minimum and maximum of each column), instead of starting *at* three actual, real data points.

**What did not change:** `assign_clusters` and `update_centroids` are untouched — the assign/average loop doesn't know or care how the starting centroids were chosen.

**Why this matters:** with the first version, every starting centroid begins exactly where at least one real point already is, so it's guaranteed to have at least that one point assigned to it on the very first round. With the second version, a randomly generated centroid could land in an empty region of the space — for this dataset, imagine a random centroid landing near `n=15000, threads=6`, far from all three real clusters. If it's still the closest centroid to *zero* points after the first assignment step, `points[assignments == that_cluster_id]` is an **empty array**, and `cluster_points.mean(axis=0)` on an empty array returns `nan` for both coordinates. That centroid is now permanently broken — every future distance calculation against a `nan` centroid also produces `nan`, and `np.argmin` on a list containing `nan` behaves unpredictably. This is exactly the kind of numerically-silent failure Lesson 2's `np.clip` guarded against — here, the practical fix is the *first* version's choice: always start centroids at real data points, which structurally guarantees no centroid starts with zero assigned points.

---

## 5. Put it in the project

```python
labels = {0: "small quick lookups", 1: "contention-heavy calls", 2: "large batch jobs"}

centroids, assignments = kmeans(points, k=3)
order = np.argsort(centroids[:, 0])  # sort cluster IDs by average n, smallest first

for rank, cluster_id in enumerate(order):
    center = centroids[cluster_id]
    count = np.sum(assignments == cluster_id)
    print(f"cluster {cluster_id} ({labels[rank]}): "
          f"center n={center[0]:.0f}, threads={center[1]:.1f}, {count} calls")
```

### Code walkthrough

- **`centroids[:, 0]`** — `:` selects *all rows*, `0` selects *column index 0* — this pulls out just the `n` coordinate of every centroid, ignoring `threads`, purely so the clusters can be reported in a sensible left-to-right order (by average input size) rather than whatever arbitrary order `kmeans` happened to produce them in.
- **`np.argsort(...)`** — returns the indices that *would* sort the array, not the sorted values themselves — e.g., if the smallest-`n` centroid is currently at index `2`, `order[0]` will be `2`.
- **`enumerate(order)`** — pairs each element of `order` with its position (`0`, `1`, `2`, ...), used here just to look up a human-readable label for "the cluster with the smallest average n," "the next," and so on.

### Why this design: choosing k

**Problem:** `kmeans(points, k=3)` assumes exactly 3 natural groups exist. Nothing in the algorithm itself tells you what `k` should be — you have to supply it.

**Available choices:** pick `k` from domain knowledge (you hypothesized 3 kinds of calls based on how the service is designed), or pick `k` more rigorously by running k-means for several values of `k` (2, 3, 4, 5...) and measuring the total within-cluster distance for each, looking for the point where adding another cluster stops meaningfully reducing that total — commonly called the "elbow method."

**Selected choice (here):** domain knowledge — `k=3`, because the calling pattern is genuinely believed to have three categories.

**Cost:** if the real structure actually has 2 or 4 natural groups, forcing `k=3` will produce clusters that are either artificially merged or artificially split, and k-means will confidently report *some* answer either way — it has no built-in way to tell you "3 was the wrong choice."

**Revisit condition:** if you're clustering data where you genuinely don't know how many natural groups to expect, run the elbow-method comparison across several `k` values before trusting any single clustering.

---

## 6. The trap

**Normal rule:** Euclidean distance treats every coordinate as equally important — the formula has no built-in notion of "this feature matters more" or "this feature matters less."

**Apparently equivalent, perfectly ordinary-looking code** — running k-means exactly as already written, directly on the raw `n` and `threads` values:

```python
raw_centroids, raw_assignments = kmeans(points, k=3)
print(raw_assignments)
```

**Surprising result:** the cluster assignments end up almost entirely determined by `n` alone — the four points with `n` around 5,500–8,000 (the contention-heavy group, with `threads` between 9 and 11) may get split apart or merged with a neighboring `n`-range group, essentially ignoring how strikingly different their `threads` values are from everything else. It *looks* like clustering worked (three groups came out), but the boundary the algorithm found barely resembles the grouping a human would draw by eye using both columns.

**Exact reason:** look at the actual numeric scale of each column. `n` ranges from `1,000` to `32,000` — differences of *thousands*. `threads` ranges from `1` to `11` — differences of *single digits*. In `euclidean_distance`, both differences get **squared** before being summed: a typical `n`-difference might contribute something like `(5000)^2 = 25,000,000` to the sum, while even the largest plausible `threads`-difference contributes something like `(10)^2 = 100`. The `threads` column's entire contribution to every distance calculation is utterly swamped by `n`'s — it's mathematically present in the formula, but numerically irrelevant. K-means, faithfully following the distance formula exactly as written, ends up clustering almost entirely on `n` and effectively ignoring `threads`, without printing any warning that this happened.

**Project consequence:** the fix is to **standardize** each feature before computing any distance — typically by subtracting each column's mean and dividing by its standard deviation, so every feature contributes on a comparable scale:

```python
def standardize(points):
    means = points.mean(axis=0)
    stds = points.std(axis=0)
    return (points - means) / stds, means, stds

scaled_points, means, stds = standardize(points)
scaled_centroids, scaled_assignments = kmeans(scaled_points, k=3)
```

After standardizing, `threads` contributes to distance on equal footing with `n`, and the resulting clusters match the three groups you'd draw by eye. **This is not specific to k-means** — any algorithm whose core mechanism is a distance calculation between raw feature values has this exact same vulnerability, which matters immediately in the next lesson.

---

## 7. Under the hood

*(Optional — not required to use k-means correctly.)*

K-means is provably guaranteed to never *increase* its total within-cluster squared distance from one full iteration to the next — each of the two steps (reassigning points, then recentering) can only hold that total steady or reduce it, which is why the loop reliably settles down instead of oscillating forever. What it does **not** guarantee is finding the *best possible* clustering — depending on where the random initial centroids happen to land, it can settle into a locally stable but globally worse grouping than a different random start would have found. Real libraries commonly use a smarter initialization scheme called **k-means++**, which deliberately spreads out the initial centroids (rather than picking them uniformly at random) specifically to reduce this local-optimum risk — a refinement of the random-data-point initialization from Section 3, not a different core algorithm.

---

## 8. Exercises

- **Predict:** before running the standardized version in Section 6, guess whether the four contention-heavy points (`n` around 5,500–8,000, `threads` 9–11) will now form their own clean cluster, separate from the small-`n` group despite having somewhat similar `n` values to it. Reason from what standardizing does to each column's relative influence.
- **Modify:** change `k` from `3` to `2` and inspect which two of the three "true" groups get merged together. Does the merge match what you'd predict from the raw table in Section 1?
- **Break:** replace the initial centroid selection with the bounding-box version from Section 4's diff, and run it several times without fixing a random seed. See if you can reproduce an empty-cluster `nan` failure; if you can't on the first few tries, consider why it's possible but not guaranteed on every run.
- **Trace:** for the point `[6000, 10]`, using the *unscaled* centroids from Section 6's trap demonstration, compute by hand (or on paper) which centroid it's closest to, and compare that to which centroid it's closest to after standardization — show the specific numbers that flip the decision.

---

## What to remember

- Clustering learns from raw structure alone — no label column exists to check against, so "wrongness" is redefined entirely in terms of distance, not correctness against a known answer.
- K-means learns through alternating hard assignment and averaging, not gradients or recursive splitting — a third distinct mechanism, and it's only guaranteed to stop, not guaranteed to find the best possible grouping.
- Any algorithm built on raw distance between features is silently dominated by whichever feature happens to have the largest numeric scale — standardizing features first isn't optional polish, it's usually required for the algorithm to reflect what you actually meant to measure.

## Next lesson

You just learned to group points using nothing but distance, with no labels at all. What if you *do* have labels, but instead of fitting parameters or building a tree, you classify a brand-new point just by asking "what are its nearest already-labeled neighbors?" That's k-nearest neighbors — and the feature-scaling trap you just uncovered applies immediately and just as severely.
