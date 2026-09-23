# Lesson 6 — Grouping Without Labels: K-Means Clustering

## Concept, in plain English

Every lesson so far had labels or target values to learn from — this is
"unsupervised learning": you're given only points, no answers, and the task is
"find `k` natural groups." K-means does this with a repeated two-step dance:
guess `k` group centers, assign every point to its nearest center, then move
each center to the average of the points now assigned to it. Repeat until the
centers stop moving.

## The math

Distance between two points (Euclidean distance — the ordinary
straight-line distance, generalized from the Pythagorean theorem to however
many features you have):

```
distance(point_a, point_b) = sqrt( sum( (a_i - b_i)^2 for each feature i ) )
```

Worked example, 2D points `(1, 2)` and `(4, 6)`:

```
distance = sqrt( (1-4)^2 + (2-6)^2 ) = sqrt(9 + 16) = sqrt(25) = 5
```

A centroid is just the average position of a group of points — one average
per feature, independently:

```
centroid_feature_i = average of feature_i across all points in the group
```

Worked example, points `(1, 2)` and `(3, 6)`:

```
centroid = ( (1+3)/2, (2+6)/2 ) = (2, 4)
```

## Type this — Cell 1 (new notebook)

```python
import math

def distance(point_a, point_b):
    total = 0
    for a_i, b_i in zip(point_a, point_b):
        total = total + (a_i - b_i) ** 2
    return math.sqrt(total)
```

Check against the hand example:

```python
distance([1, 2], [4, 6])
```

You should get `5.0`.

## Type this — Cell 2

```python
def compute_centroid(points):
    num_points = len(points)
    num_features = len(points[0])
    centroid = []
    for feature_index in range(num_features):
        feature_sum = sum(point[feature_index] for point in points)
        centroid.append(feature_sum / num_points)
    return centroid
```

Check against the hand example:

```python
compute_centroid([[1, 2], [3, 6]])
```

You should get `[2.0, 4.0]`.

## What just happened

Two small, honest functions — nothing about either one is specific to
clustering yet. `distance` measures "how far," `compute_centroid` measures
"the middle." K-means is just these two ideas taking turns.

## Type this — Cell 3

Data with two obvious visual clusters:

```python
cluster_data = [[1, 1], [1, 2], [2, 1], [2, 2], [8, 8], [8, 9], [9, 8], [9, 9]]
```

The "assign every point to its nearest centroid" step:

```python
def assign_to_nearest_centroid(points, centroids):
    assignments = []
    for point in points:
        distances_to_each_centroid = [distance(point, centroid) for centroid in centroids]
        nearest_centroid_index = distances_to_each_centroid.index(min(distances_to_each_centroid))
        assignments.append(nearest_centroid_index)
    return assignments
```

## Type this — Cell 4

Try it with two made-up starting centroids, one near each visual cluster:

```python
starting_centroids = [[1, 1], [9, 9]]
assign_to_nearest_centroid(cluster_data, starting_centroids)
```

Check the output by eye against `cluster_data` — the first four points should
be assigned to index `0`, the last four to index `1`.

## Type this — Cell 5

Recompute centroids from the current assignments — group points by their
assignment, then reuse `compute_centroid` on each group:

```python
def recompute_centroids(points, assignments, num_clusters):
    new_centroids = []
    for cluster_index in range(num_clusters):
        points_in_this_cluster = [point for point, assignment in zip(points, assignments) if assignment == cluster_index]
        new_centroids.append(compute_centroid(points_in_this_cluster))
    return new_centroids
```

## Type this — Cell 6

The full k-means loop — assign, recompute, repeat:

```python
def k_means(points, num_clusters, starting_centroids, num_steps):
    centroids = starting_centroids
    for step in range(num_steps):
        assignments = assign_to_nearest_centroid(points, centroids)
        centroids = recompute_centroids(points, assignments, num_clusters)
    return centroids, assignments
```

Run it:

```python
k_means(cluster_data, num_clusters=2, starting_centroids=[[1, 1], [9, 9]], num_steps=10)
```

## What just happened

You should see the centroids settle near `[1.5, 1.5]` and `[8.5, 8.5]` — the
true centers of your two visual clusters — with `assignments` cleanly split
`[0,0,0,0,1,1,1,1]`. No labels were ever given; the algorithm found the
grouping purely from distances.

## Checkpoint exercise

1. Deliberately start with two *bad* centroids, e.g. `[[1, 1], [2, 2]]` (both
   inside the same visual cluster), rerun `k_means`, and see where it ends
   up. K-means can get stuck in a bad grouping depending on starting
   position — this is a real, known limitation, not a bug in your code.
2. Add a third, clearly separate group of points to `cluster_data` and rerun
   with `num_clusters=3` and three starting centroids.
3. Add a `print(centroids)` inside the loop so you can watch the centroids
   walk toward the true centers step by step, the same way Lesson 2 let you
   watch gradient descent walk downhill.

Next lesson is the Phase A capstone — all four algorithms (linear regression,
gradient descent, logistic regression, decision trees, k-means) run
side-by-side on one small real dataset, then checked against scikit-learn's
versions as a correctness cross-check. Say "next lesson" when ready.
