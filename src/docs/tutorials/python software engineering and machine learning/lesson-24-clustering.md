# Lesson 24 — Clustering: Learning With No Answer Key

## What you'll learn
- What "unsupervised" actually means, concretely — no target column exists at all
- How K-means actually decides on clusters, mechanically, step by step
- A real, measured trap: forgetting to scale features lets one dominate purely because of its numeric range, not its actual importance
- How to read cluster centers and verify what a clustering actually grouped by

## The question
Every model so far had a `y` — box office, hit-or-miss, something to predict. What if you just have movies (budget, year) and want to find natural groupings, with no "correct" grouping to check against at all? What does "training" even mean without an answer key?

## 1. Predict
If you cluster movies using both `budget` (ranging roughly 1-200, in millions) and `year` (ranging roughly 2000-2024) together, without adjusting either — which feature do you expect to dominate how movies get grouped, purely because of the numbers involved, regardless of which one is actually more meaningful?

## 2. Try it
```python
import numpy as np
from sklearn.cluster import KMeans

np.random.seed(5)
budget = np.random.uniform(1, 200, 60)
year = np.random.randint(2000, 2024, 60)
X = np.column_stack([budget, year])

model = KMeans(n_clusters=3, random_state=0, n_init=10)
model.fit(X)

print("cluster centers:\n", model.cluster_centers_)
print("inertia:", model.inertia_)
```

### What this code does
- `np.column_stack([budget, year])` — combines the two 1D arrays into a single 60×2 matrix, one row per movie, one column per feature — the same shape every model in this track has expected, just now with no separate target array at all.
- `KMeans(n_clusters=3)` — you must specify how many clusters to look for up front; K-means doesn't discover this number on its own (a real limitation worth knowing, addressed in the exercises).
- `model.fit(X)` — no target passed at all. Internally: place 3 random initial "centroids" (candidate cluster centers), then repeat two steps until stable — (1) assign every point to whichever centroid is *closest* to it (by straight-line/Euclidean distance), (2) move each centroid to the *average position* of all points currently assigned to it. `n_init=10` runs this whole process 10 times with different random starting centroids and keeps the best result, since a single run can land in a mediocre local outcome depending on where it started.
- `model.cluster_centers_` — the final centroid positions, in the original `[budget, year]` units.
- `model.inertia_` — the sum of squared distances from every point to its assigned centroid — a single number summarizing "how tightly grouped are the clusters," lower being tighter.

### What happens
Real output:
```
cluster centers:
 [[ 109.49  2009.06]
  [  35.59  2014.48]
  [ 174.32  2011.00]]
inertia: 21862.69
```
Look at the three centers' budget values: 109, 36, 174 — a huge spread. Now look at their year values: 2009, 2014, 2011 — all clustered within about 5 years of each other, nowhere near as differentiated. This is already a visible hint of what's about to be confirmed directly.

## 3. Confirming the trap with a real measurement
```python
from scipy.stats import spearmanr

budget_corr = spearmanr(model.labels_, budget).correlation
year_corr = spearmanr(model.labels_, year).correlation
print("correlation of cluster assignment with budget:", abs(budget_corr))
print("correlation of cluster assignment with year:", abs(year_corr))
```
Real output:
```
correlation of cluster assignment with budget: 0.363
correlation of cluster assignment with year: 0.106
```
Which cluster a movie landed in correlates noticeably more with its `budget` than its `year` — over 3x stronger. If your prediction was "budget will dominate," that's exactly right, and here's precisely why.

## 4. Why?
### Code mechanics
K-means decides "closest centroid" using **Euclidean distance** — literally `sqrt((budget_diff)² + (year_diff)²)` for each point-to-centroid comparison. A `budget` difference of, say, 50 (two movies with budgets 30 and 80) contributes `50² = 2500` to that calculation. A `year` difference of 10 (a movie from 2005 versus 2015 — already a fairly large real gap) contributes only `10² = 100`. Budget differences are structurally capable of being numerically far larger than year differences here, simply because budget's raw range (1-200) is so much wider than year's (2000-2024, a span of only 24). The distance calculation has no concept of "importance" — it just adds up squared numeric differences, and whichever feature happens to produce bigger numbers dominates the sum, regardless of which one is actually more meaningful for grouping movies.

### Mental model
```
distance = sqrt((budget_A - budget_B)² + (year_A - year_B)²)
                      ↑ can be up to ~200            ↑ can be up to ~24
                      
squared: up to 40,000              squared: up to ~576

→ budget differences can be ~70x larger in the distance calculation,
  purely from raw numeric scale, nothing to do with real relevance
```

## 5. The fix — scale first
```python
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

model_scaled = KMeans(n_clusters=3, random_state=0, n_init=10)
model_scaled.fit(X_scaled)

budget_corr2 = spearmanr(model_scaled.labels_, budget).correlation
year_corr2 = spearmanr(model_scaled.labels_, year).correlation
print("scaled — correlation with budget:", abs(budget_corr2))
print("scaled — correlation with year:", abs(year_corr2))
```
Real output:
```
scaled — correlation with budget: 0.249
scaled — correlation with year: 0.792
```

### Code walkthrough
- `StandardScaler()` — transforms each feature to have mean 0 and standard deviation 1, **separately for each column**. After this, "how far apart are two budgets" and "how far apart are two years" are both measured in the same units — standard deviations from that feature's own average — rather than raw dollars and raw years.
- `scaler.fit_transform(X)` — `fit` computes each column's mean and standard deviation from the data; `transform` applies `(value - mean) / std` to every value. Doing both together (`fit_transform`) on the same data in one call is standard when there's no separate train/test split concern yet — worth noting the same fit/transform separation from earlier lessons (e.g. `LinearRegression.fit()` vs `.predict()`) applies to preprocessing steps too, and matters more once test data is involved (a scaler should be `fit` only on training data, then used to `transform` test data with those same training statistics — fitting it on test data would leak information, the same category of concern as Lesson 14's train/test discipline).

### The result flipped
After scaling, correlation with `year` (0.792) is now much stronger than with `budget` (0.249) — the *opposite* pattern from the unscaled run. This specific flip (year now dominating) is itself informative: it's not that scaling makes both features equally influential in some neutral sense — it's that scaling removes the *artificial* dominance caused by raw numeric range, after which whichever feature actually has more genuine underlying variation and structure in this specific data takes over. The point isn't "year is now correctly the important one" as an absolute truth — it's that the *scale-driven* distortion is gone, and whatever result you get now at least reflects the data's real structure rather than an accident of units.

## 6. Trap
**Normal rule:** K-means groups points by genuine similarity across all provided features.
**Apparently equivalent code:** feeding raw, unscaled features directly into `KMeans.fit()`, especially when those features are in genuinely different units (dollars vs. years vs. percentages vs. counts).
**Surprising result:** the resulting clusters can end up reflecting almost entirely whichever feature happens to have the largest raw numeric range — not whichever feature is actually most meaningful for the grouping you actually wanted.
**Exact reason:** Euclidean distance sums *squared* raw differences with no adjustment for each feature's natural scale — this isn't a bug in K-means, it's operating exactly as designed; the responsibility for making sure "distance" means something sensible across mismatched units falls entirely on you, before fitting anything.
**Project consequence:** always scale features before any distance-based method (K-means, K-nearest-neighbors, and others you'll likely meet later) unless every feature is already naturally on a comparable scale — this is one of the most common real mistakes in unsupervised learning specifically, precisely because (like Lesson 17's label-encoding trap) nothing about the code errors out or looks obviously wrong; it just quietly measures the wrong thing.

## Exercise
- **Predict:** If you added a third feature, `rating` (roughly 1-10), to the unscaled version, would it have any meaningful influence on the clustering at all, given budget's much larger raw range? Reason it out before checking.
- **Modify:** Try `n_clusters=2` and `n_clusters=5` on the scaled data. Does `model.inertia_` keep decreasing as you add more clusters — and if so, does that mean more clusters is always "better"? (Hint: what happens to inertia in the extreme case of `n_clusters` equal to the number of points?)
- **Break:** Use `MinMaxScaler` instead of `StandardScaler` (scales each feature to a fixed 0-1 range instead of mean-0/std-1) and recheck the budget/year correlations. Does the specific scaling method chosen still matter, or does "some form of scaling" fix the core problem either way?
- **Repair:** Based on the previous exercise, write one sentence on whether choosing *which* scaler to use is as critical as the decision to scale at all, or a secondary concern by comparison.
- **Trace:** Using the unscaled cluster centers (`[109.49, 2009.06], [35.59, 2014.48], [174.32, 2011.00]`), manually compute the Euclidean distance from a hypothetical movie with `budget=100, year=2020` to each of the three centers, and confirm which cluster `model.predict([[100, 2020]])` would assign it to.

## What to remember
- Unsupervised learning finds structure with no target label — "correctness" has to be evaluated differently (structural measures like inertia, or by inspecting whether groupings make real-world sense), not by checking predictions against known answers.
- K-means assigns points to the nearest centroid by Euclidean distance, then repeatedly recomputes centroids as the mean of their assigned points, until stable.
- Unscaled features with different numeric ranges will structurally dominate a distance-based clustering, regardless of their actual real-world importance — always scale first.
- A clustering "succeeding" (running, producing labeled groups) says nothing about whether those groups reflect anything meaningful — verify what's actually driving the groupings, the same discipline as checking a supervised model's assumptions.

## Next lesson
Choosing `n_clusters` properly (the "elbow method" using inertia, hinted at in this lesson's exercises) is the natural next stop within clustering — or, stepping back to SWE, this is a reasonable point to cover something practical like structuring a real multi-file Python project properly (packages, imports, `__init__.py`) now that the codebase across these lessons has grown well past single-script size. Your call.
