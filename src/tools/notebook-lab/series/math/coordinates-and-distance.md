# Coordinates and distance

Every CAD drawing, CNC program and robot path rests on one idea: a point is a pair of numbers. Choose an origin and two perpendicular axes, and every position on a plate becomes coordinates (x, y), so geometry becomes arithmetic. A drawing that says "four holes at (20, 15), (80, 15), ..." can be checked by a program: are the holes far enough apart, far enough from the edges, and in what order should the drill visit them? This lesson builds that toolkit. Its central formula, the distance between two points, comes straight from Pythagoras, and the same formula works unchanged in three dimensions and beyond.

This lesson covers:

- points as coordinates, and plotting a part's features;
- the distance formula from Pythagoras, in 2D and 3D;
- midpoints and points part-way along a segment;
- all pairwise distances at once, for spacing checks;
- other ways to measure distance, and when a machine uses them.

## Points on a plate

::: math
\[ P = (x, y), \qquad \text{distance from a corner } C:\; \sqrt{(x - x_C)^2 + (y - y_C)^2} \]
- a point is an ordered pair: $(20, 15) \ne (15, 20)$
- $n$ points form an $n \times 2$ array: column 0 holds every $x$, column 1 every $y$
In code: `holes[:, 0]` is all the x coordinates; `np.hypot(*(holes - corner).T)` gives every distance to the corner
:::


A **coordinate system** fixes an origin and two perpendicular axes with a scale. Engineering drawings usually put the origin at a corner of the part (a **datum**), with x to the right and y up, in millimetres. A point is then an ordered pair (x, y): the order matters, since (20, 15) and (15, 20) are different holes.

In code a point is a tuple, and a set of points is naturally a 2-column NumPy array, one row per point, so `pts[:, 0]` is every x and `pts[:, 1]` every y. Predict before running: which hole is nearest the plate's top-right corner?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

plate_w, plate_h = 120, 80
holes = np.array([[20, 15], [100, 15], [100, 65], [20, 65], [60, 40], [48, 52]], dtype=float)

fig, ax = plt.subplots(figsize=(6, 4))
ax.add_patch(plt.Rectangle((0, 0), plate_w, plate_h, fill=False))
ax.plot(holes[:, 0], holes[:, 1], "o")
for i, (x, y) in enumerate(holes):
    ax.annotate(f"H{i}", (x, y), textcoords="offset points", xytext=(6, 4))
ax.set_aspect("equal")
ax.set_xlabel("x (mm)")
ax.set_ylabel("y (mm)")
ax.set_title("Mounting plate")
plt.show()
corner = np.array([plate_w, plate_h])
print("nearest hole to the top-right corner: H", np.argmin(np.hypot(*(holes - corner).T)), sep="")
```

```output
nearest hole to the top-right corner: H2
```

`ax.set_aspect("equal")` makes a millimetre the same length on both axes, so circles look round and distances look right. Without it, matplotlib stretches the plot to fill the figure.

H2 at (100, 65) is nearest the corner (120, 80). The last line used the distance formula before we derived it; that comes next.

## The distance formula

::: math
\[ d(P, Q) = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2} \qquad \text{(in 3D add } (z_2 - z_1)^2) \]
- Pythagoras on the right triangle with legs $\Delta x$ and $\Delta y$
- symmetric: $d(P, Q) = d(Q, P)$, because the differences are squared
In code: `math.sqrt(sum((b - a) ** 2 for a, b in zip(p, q)))`, or `math.dist(p, q)`
:::


Two points (x₁, y₁) and (x₂, y₂) are the ends of the hypotenuse of a right triangle whose legs run along the axes, with lengths Δx = x₂ − x₁ and Δy = y₂ − y₁. Pythagoras gives the distance:

\[ d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2} \]

The squares make the sign of each difference irrelevant, so the distance from A to B equals the distance from B to A. In three dimensions, the same argument applied twice adds a third term: d = √(Δx² + Δy² + Δz²). Python has it built in as `math.dist(p, q)` for any number of dimensions, and `np.hypot(dx, dy)` for arrays. Predict before running: how far does a robot gripper travel from (0, 0, 0) to (300, 400, 1200) mm?

```python type
def distance(p, q):
    return math.sqrt(sum((b - a) ** 2 for a, b in zip(p, q)))

print("H0 to H2:", distance(holes[0], holes[2]), "=", math.dist(holes[0], holes[2]))
print("a 3-4-5 triangle:", distance((0, 0), (3, 4)))
print("gripper move:", distance((0, 0, 0), (300, 400, 1200)), "mm")
print("symmetric:", distance(holes[1], holes[4]) == distance(holes[4], holes[1]))
```

```output
H0 to H2: 94.33981132056604 = 94.33981132056604
a 3-4-5 triangle: 5.0
gripper move: 1300.0 mm
symmetric: True
```

`zip(p, q)` pairs the matching coordinates, so this one function works in any number of dimensions.

H0 to H2 is the plate's diagonal between hole centres: √(80² + 50²) ≈ 94.34 mm. The gripper moves exactly 1300 mm, since 300, 400 and 1200 come from the Pythagorean triples 3-4-5 and 5-12-13: √(300² + 400²) = 500 and √(500² + 1200²) = 1300.

## Midpoints and points along a segment

::: math
\[ R(t) = P + t\,(Q - P), \qquad M = \frac{P + Q}{2} \;\;(t = \tfrac{1}{2}) \]
- $t = 0$ gives $P$, $t = 1$ gives $Q$; values in between lie on the segment
- the midpoint $M$ averages the coordinates
In code: `p + t * (q - p)` with NumPy arrays
:::


The **midpoint** of two points averages their coordinates: ((x₁ + x₂)/2, (y₁ + y₂)/2). More generally, the point a fraction t of the way from P to Q is

\[ P + t (Q - P) \]

which gives P at t = 0, Q at t = 1, the midpoint at t = 0.5, and points beyond the segment for t outside 0 to 1. This is **linear interpolation** again, now applied to positions; it is how a CNC controller generates the intermediate positions of a straight cut. Predict before running: where are the holes if five are spaced evenly from H0 to H1, including both ends?

```python type
def along(p, q, t):
    p, q = np.asarray(p, dtype=float), np.asarray(q, dtype=float)
    return p + t * (q - p)

print("midpoint of H0 and H2:", along(holes[0], holes[2], 0.5))
print("five evenly spaced from H0 to H1:")
for t in np.linspace(0, 1, 5):
    print("  t =", t, "->", along(holes[0], holes[1], t))
print("pitch:", math.dist(along(holes[0], holes[1], 0), along(holes[0], holes[1], 0.25)), "mm")
```

```output
midpoint of H0 and H2: [60. 40.]
five evenly spaced from H0 to H1:
  t = 0.0 -> [20. 15.]
  t = 0.25 -> [40. 15.]
  t = 0.5 -> [60. 15.]
  t = 0.75 -> [80. 15.]
  t = 1.0 -> [100.  15.]
pitch: 20.0 mm
```

`np.linspace(0, 1, 5)` gives the fractions 0, 0.25, 0.5, 0.75 and 1.

The midpoint of the diagonal is (60, 40), the plate's centre, where H4 sits. Five holes along the 80 mm bottom row are 20 mm apart (the **pitch**), at x = 20, 40, 60, 80 and 100.

## Every distance at once

::: math
\[ D_{ij} = \sqrt{(x_i - x_j)^2 + (y_i - y_j)^2}, \qquad D_{ij} = D_{ji}, \quad D_{ii} = 0 \]
- $D$: the $n \times n$ distance matrix, symmetric with zeros on its diagonal
- the closest pair minimises $D_{ij}$ over $i \ne j$
In code: `diff = pts[:, None, :] - pts[None, :, :]`, then `np.sqrt((diff ** 2).sum(axis=2))`
:::


Design rules often limit the spacing of features: holes closer than about two diameters weaken the plate between them. Checking every pair of n points means n(n − 1)/2 distances. NumPy computes them all with one subtraction: `pts[:, None, :] - pts[None, :, :]` subtracts every point from every other, producing an n × n × 2 array of differences (**broadcasting** in two dimensions), and the hypotenuse of each gives an n × n **distance matrix**. Predict before running: which pair of holes is closest, and does it break a 20 mm minimum spacing?

```python type
def distance_matrix(pts):
    diff = pts[:, None, :] - pts[None, :, :]
    return np.sqrt((diff ** 2).sum(axis=2))

D = distance_matrix(holes)
print(np.round(D, 1))
masked = D + np.diag([np.inf] * len(holes))
i, j = np.unravel_index(np.argmin(masked), masked.shape)
print(f"closest pair: H{i} and H{j}, {D[i, j]:.2f} mm apart ->", "too close" if D[i, j] < 20 else "ok")
```

```output
[[ 0.  80.  94.3 50.  47.2 46.4]
 [80.   0.  50.  94.3 47.2 63.8]
 [94.3 50.   0.  80.  47.2 53.6]
 [50.  94.3 80.   0.  47.2 30.9]
 [47.2 47.2 47.2 47.2  0.  17. ]
 [46.4 63.8 53.6 30.9 17.   0. ]]
closest pair: H4 and H5, 16.97 mm apart -> too close
```

The diagonal of the matrix is each hole's distance to itself, 0, so adding infinity there stops it being chosen as the minimum. `np.unravel_index` turns the position of the minimum in the flattened array back into a (row, column) pair.

The matrix is symmetric, because distance is. The closest pair is H4 and H5, 16.97 mm apart, which breaks a 20 mm spacing rule: H5 at (48, 52) needs to move. With 6 holes the matrix has 36 entries, which is nothing; with 10,000 points it would have 100 million, so large problems use cleverer search structures, such as spatial grids and k-d trees.

## Other ways to measure distance

::: math
\[ d_2 = \sqrt{\Delta x^2 + \Delta y^2}, \qquad d_1 = |\Delta x| + |\Delta y|, \qquad d_\infty = \max(|\Delta x|, |\Delta y|) \]
- $d_2$: straight line (Euclidean); $d_1$: one axis at a time (Manhattan); $d_\infty$: all axes together (Chebyshev)
- every one obeys the triangle inequality $d(P, R) \le d(P, Q) + d(Q, R)$
In code: `math.dist`, `sum(abs(b - a) ...)` and `max(abs(b - a) ...)`
:::


The straight-line (Euclidean) distance is not always the one that matters. A machine whose axes move **one at a time** travels the **Manhattan distance** |Δx| + |Δy|, named after a grid of city streets. A machine whose axes move **simultaneously at the same top speed** arrives when the axis with the longer move does, so its travel time follows the **Chebyshev distance** max(|Δx|, |Δy|). All three are legitimate distances: each is zero only for the same point, symmetric, and obeys the **triangle inequality** (going via a third point is never shorter). Predict before running: for a move of 60 mm in x and 25 mm in y at 100 mm/s per axis, how long do the two kinds of machine take?

```python type
def manhattan(p, q):
    return sum(abs(b - a) for a, b in zip(p, q))

def chebyshev(p, q):
    return max(abs(b - a) for a, b in zip(p, q))

p, q = (20, 15), (80, 40)
print("Euclidean", math.dist(p, q), " Manhattan", manhattan(p, q), " Chebyshev", chebyshev(p, q))
print("one axis at a time:", manhattan(p, q) / 100, "s   both axes together:", chebyshev(p, q) / 100, "s")
r = (50, 70)
for name, d in [("Euclidean", math.dist), ("Manhattan", manhattan), ("Chebyshev", chebyshev)]:
    print(f"{name:<10} direct {d(p, q):6.2f} <= via r {d(p, r) + d(r, q):6.2f}")
```

```output
Euclidean 65.0  Manhattan 85  Chebyshev 60
one axis at a time: 0.85 s   both axes together: 0.6 s
Euclidean  direct  65.00 <= via r 105.08
Manhattan  direct  85.00 <= via r 145.00
Chebyshev  direct  60.00 <= via r  85.00
```

The same move is 65 mm in a straight line, 85 mm of axis travel one at a time, and 0.6 s with both axes moving together, against 0.85 s one at a time. The Chebyshev time is set by the long x move; the y axis finishes early and waits. Which distance to use is a modelling decision, set by how the machine actually moves.

::: challenge Edge distances [easy]
Holes too near the edge of a plate tear out. Write `edge_distance(point, width, height)`, the shortest distance from a point to any of the four edges of a `width` × `height` rectangular plate with its corner at the origin. Raise `ValueError` if the point is not strictly inside the plate. Then write `near_edge(points, width, height, minimum)` returning the list of indices of points whose edge distance is less than `minimum`, in index order.

```python starter
def edge_distance(point, width, height):
    return 0

def near_edge(points, width, height, minimum):
    return []

print(edge_distance((20, 15), 120, 80))
```

```python solution
def edge_distance(point, width, height):
    x, y = point
    if not (0 < x < width and 0 < y < height):
        raise ValueError("the point must be strictly inside the plate")
    return min(x, width - x, y, height - y)

def near_edge(points, width, height, minimum):
    return [i for i, p in enumerate(points) if edge_distance(p, width, height) < minimum]

print(edge_distance((20, 15), 120, 80))
```

```python test
for _n in ["edge_distance", "near_edge"]:
    assert _n in dir(), f"Define {_n}."
assert edge_distance((20, 15), 120, 80) == 15, "H0 is 15 mm from the bottom edge."
assert edge_distance((100, 65), 120, 80) == 15 and edge_distance((60, 40), 120, 80) == 40, "Right/top edges and the centre."
assert edge_distance((115.5, 40), 120, 80) == 4.5, "Distance to the right edge is width - x."
for _bad in [(0, 10), (120, 10), (-5, 10), (10, 80), (10, 90)]:
    try:
        edge_distance(_bad, 120, 80)
        assert False, f"{_bad} is not strictly inside a 120 x 80 plate: raise ValueError."
    except ValueError:
        pass
assert near_edge([(20, 15), (100, 15), (60, 40), (110, 70)], 120, 80, 16) == [0, 1, 3], "Indices of points nearer than the minimum."
assert near_edge([(20, 15)], 120, 80, 15) == [], "Exactly the minimum is fine."
assert near_edge(np.array([[5.0, 40.0], [60.0, 40.0]]), 120, 80, 10) == [0], "Works with a NumPy array of points."
"SUCCESS: The nearest edge is the smallest of four simple distances: x, width − x, y and height − y."
```

Hint: Inside an axis-aligned rectangle, the distances to the edges are `x`, `width - x`, `y` and `height - y`; the shortest is their minimum.
:::

::: challenge Spacing violations [medium]
Write `spacing_violations(points, minimum)` that returns a list of every pair `(i, j)` with `i < j` whose points are closer than `minimum` (strictly less), sorted by distance (closest first; ties by `(i, j)`). Points may have any number of coordinates (2D or 3D). Then write `closest_pair(points)`, returning `(i, j, distance)` with `i < j` for the closest pair, distance rounded to 3 decimal places; raise `ValueError` for fewer than 2 points. For 1,500 points, both must finish within a few seconds, so compute the distances with array operations (the lesson's distance matrix): a Python double loop over 1,500 NumPy rows takes about 15 s in the browser.

```python starter
def spacing_violations(points, minimum):
    return []

def closest_pair(points):
    return (0, 1, 0.0)

print(spacing_violations(holes, 20), closest_pair(holes))
```

```python solution
def _pairwise(points):
    pts = np.asarray(points, dtype=float)
    diff = pts[:, None, :] - pts[None, :, :]
    return np.sqrt((diff ** 2).sum(axis=2))

def spacing_violations(points, minimum):
    D = _pairwise(points)
    i, j = np.nonzero(np.triu(D < minimum, k=1))
    pairs = sorted(zip(D[i, j].tolist(), i.tolist(), j.tolist()))
    return [(a, b) for _, a, b in pairs]

def closest_pair(points):
    if len(points) < 2:
        raise ValueError("need at least 2 points")
    D = _pairwise(points)
    D[np.tril_indices(len(D))] = np.inf
    i, j = np.unravel_index(np.argmin(D), D.shape)
    return (int(i), int(j), round(float(D[i, j]), 3))

print(spacing_violations(holes, 20), closest_pair(holes))
```

```python test
import time as _time
for _n in ["spacing_violations", "closest_pair"]:
    assert _n in dir(), f"Define {_n}."
_h = [(20, 15), (100, 15), (100, 65), (20, 65), (60, 40), (48, 52)]
assert spacing_violations(_h, 20) == [(4, 5)], f"Only H4 and H5 are closer than 20 mm; got {spacing_violations(_h, 20)}."
assert spacing_violations(_h, 50) == [(4, 5), (3, 5), (0, 5), (0, 4), (1, 4), (2, 4), (3, 4)], f"Sorted by distance, ties by (i, j); got {spacing_violations(_h, 50)}."
assert spacing_violations([(0, 0), (3, 4)], 5) == [], "Exactly the minimum is not a violation."
assert spacing_violations([(0, 0, 0), (1, 1, 1), (9, 9, 9)], 2) == [(0, 1)], "3D points."
assert closest_pair(_h) == (4, 5, 16.971), f"Got {closest_pair(_h)}."
assert closest_pair([(0, 0), (5, 5), (0.5, 0.5), (9, 0)])[:2] == (0, 2), "i < j."
try:
    closest_pair([(1, 2)])
    assert False, "One point should raise ValueError."
except ValueError:
    pass
_rng = np.random.default_rng(4)
_big = _rng.random((1500, 2)) * 1000
_start = _time.perf_counter()
_v = spacing_violations(_big, 5); _c = closest_pair(_big)
_el = _time.perf_counter() - _start
_d = np.sqrt(((_big[:, None] - _big[None]) ** 2).sum(axis=2))
assert len(_v) == int((np.triu(_d < 5, 1)).sum()), "Every violating pair must be found."
assert _el < 6, f"1,500 points took {_el:.1f} s; compute the distances with array operations."
"SUCCESS: One broadcast subtraction gives every pairwise distance; the upper triangle lists each pair once."
```

Hint: Build the distance matrix as in the lesson. `np.triu(mask, k=1)` keeps only entries above the diagonal (i < j), and `np.nonzero` gives their row and column indices. Sort `(distance, i, j)` tuples.
:::

::: challenge Planning a drilling route [hard]
A drill visits every hole once, starting from hole `start`, and the order changes the time. Write `route_length(points, order, metric="euclidean")`: the total distance of travelling through `points` in the given order (no return to the start), with `metric` one of `"euclidean"`, `"manhattan"` or `"chebyshev"` (any other raises `ValueError`). Raise `ValueError` if `order` is not a permutation of all the point indices. Then write `nearest_neighbour_route(points, start=0, metric="euclidean")`: starting at `start`, repeatedly move to the nearest unvisited point by that metric (ties go to the lowest index), and return the order as a list. Greedy routes are not always the shortest. Finally, write `improves(points, metric)`, which returns True when the nearest-neighbour route from index 0 is strictly shorter than visiting the points in their given order 0, 1, 2, ....

```python starter
def route_length(points, order, metric="euclidean"):
    return 0.0

def nearest_neighbour_route(points, start=0, metric="euclidean"):
    return list(range(len(points)))

def improves(points, metric):
    return False

print(nearest_neighbour_route(holes))
```

```python solution
_METRICS = {
    "euclidean": lambda d: float(np.sqrt((d ** 2).sum())),
    "manhattan": lambda d: float(np.abs(d).sum()),
    "chebyshev": lambda d: float(np.abs(d).max()),
}

def _metric(name):
    if name not in _METRICS:
        raise ValueError(f"unknown metric {name!r}")
    return _METRICS[name]

def route_length(points, order, metric="euclidean"):
    d = _metric(metric)
    pts = np.asarray(points, dtype=float)
    if sorted(order) != list(range(len(pts))):
        raise ValueError("order must visit every point exactly once")
    return sum(d(pts[b] - pts[a]) for a, b in zip(order, order[1:]))

def nearest_neighbour_route(points, start=0, metric="euclidean"):
    d = _metric(metric)
    pts = np.asarray(points, dtype=float)
    order = [start]
    left = set(range(len(pts))) - {start}
    while left:
        here = pts[order[-1]]
        nxt = min(sorted(left), key=lambda k: d(pts[k] - here))
        order.append(nxt)
        left.remove(nxt)
    return order

def improves(points, metric):
    n = len(points)
    return route_length(points, nearest_neighbour_route(points, 0, metric), metric) < route_length(points, list(range(n)), metric)

print(nearest_neighbour_route(holes))
```

```python test
for _n in ["route_length", "nearest_neighbour_route", "improves"]:
    assert _n in dir(), f"Define {_n}."
_h = [(20, 15), (100, 15), (100, 65), (20, 65), (60, 40), (48, 52)]
assert abs(route_length(_h, [0, 1, 2, 3, 4, 5]) - (80 + 50 + 80 + math.dist((20, 65), (60, 40)) + math.dist((60, 40), (48, 52)))) < 1e-9, "Sum of the legs, no return."
assert route_length([(0, 0), (3, 4)], [0, 1], "manhattan") == 7 and route_length([(0, 0), (3, 4)], [1, 0], "chebyshev") == 4, "Other metrics."
for _bad_order in [[0, 1, 2], [0, 1, 2, 3, 4, 4], [0, 1, 2, 3, 4, 6]]:
    try:
        route_length(_h, _bad_order)
        assert False, f"{_bad_order} is not a permutation of 0..5: raise ValueError."
    except ValueError:
        pass
try:
    route_length(_h, list(range(6)), "taxi")
    assert False, "An unknown metric should raise ValueError."
except ValueError:
    pass
assert nearest_neighbour_route(_h) == [0, 5, 4, 1, 2, 3], f"Got {nearest_neighbour_route(_h)}."
assert nearest_neighbour_route(_h, start=2) == [2, 4, 5, 3, 0, 1], f"Got {nearest_neighbour_route(_h, start=2)}."
assert nearest_neighbour_route([(0, 0), (1, 0), (-1, 0)]) == [0, 1, 2], "Ties go to the lowest index."
assert nearest_neighbour_route([(0, 0), (4, 4), (5, 0)], metric="chebyshev") == [0, 1, 2] and nearest_neighbour_route([(0, 0), (4, 0), (2, 3)], metric="manhattan") == [0, 1, 2], "Use the chosen metric."
assert improves(_h, "euclidean") == True and improves([(0, 0), (10, 0), (1, 0), (11, 0)], "euclidean") == True, "Greedy beats these drawing orders."
assert improves([(0, 0), (1, 0), (2, 0)], "manhattan") == False, "Not strictly shorter when the given order is already the greedy one."
_line = [(0, 0), (1, 0), (-1.5, 0), (3, 0)]
assert nearest_neighbour_route(_line) == [0, 1, 3, 2] and route_length(_line, [0, 2, 1, 3]) < route_length(_line, [0, 1, 3, 2]), "A case where greedy is beaten: going left first is shorter (6 against 7.5)."
"SUCCESS: Distances add up along a route, the metric is a modelling choice, and greedy routes are quick but not always the shortest."
```

Hint: Keep a set of unvisited indices. At each step, compute the metric from the current point to each candidate and take the minimum, checking candidates in increasing index order so ties go to the lowest. The three metrics are the square root of the summed squares, the summed absolute values and the largest absolute value of the difference.
:::

## What you learned

- A coordinate system turns positions into ordered pairs; a set of points is naturally a 2-column array. Use equal aspect ratios when plotting geometry.
- The distance d = √(Δx² + Δy²) is Pythagoras; adding Δz² extends it to 3D. `math.dist` handles any dimension.
- The point a fraction t of the way from P to Q is P + t(Q − P); t = 0.5 is the midpoint.
- Broadcasting gives all pairwise distances at once, a symmetric matrix with zeros on the diagonal.
- Manhattan and Chebyshev distances model machines that move one axis at a time or all axes together; all three satisfy the triangle inequality.

The next lesson draws straight lines through points, measures their slope, and uses them to calibrate a sensor.
