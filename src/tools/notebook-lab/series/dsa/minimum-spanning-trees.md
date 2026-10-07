# Minimum spanning trees

A council wants to connect seven villages with fibre cable. Every village must be reachable from every other, possibly through intermediate villages, and cable costs money by the kilometre. Which links should it lay? Laying a link that closes a loop is a waste (the villages were already connected), so the answer has no cycles: it is a **tree** that touches every vertex, a **spanning tree**. The cheapest one is the **minimum spanning tree** (MST). Power grids, water pipes, road networks and computer networks are all designed with it, and it turns up in less obvious places too, such as grouping data into clusters.

This lesson covers:

- spanning trees, and the **cut property** that makes greedy choices safe;
- **Kruskal's algorithm**: add edges cheapest first, skipping any that would close a loop, using Union-Find;
- **Prim's algorithm**: grow one tree outward, always adding the cheapest edge leaving it, using a heap;
- clustering by stopping Kruskal early.

## Spanning trees and the cut property

A connected graph with V vertices has spanning trees with exactly V − 1 edges: fewer cannot connect everything, and more would make a cycle. The question is which V − 1 edges to choose.

Both algorithms in this lesson are **greedy**: they repeatedly take the cheapest edge that seems safe, and never reconsider. Greedy choices are usually a gamble, but here they are provably right, because of the **cut property**. Split the vertices into any two groups (a **cut**). The cheapest edge crossing between the groups belongs to some minimum spanning tree. The reason: take a minimum spanning tree without that edge. Adding the edge creates a cycle, and that cycle must cross the cut a second time, through some other edge at least as expensive. Swapping that edge out for the cheap one gives a spanning tree costing no more, so it is also a minimum spanning tree, and it contains the cheap edge. So the cheapest crossing edge is always a safe choice.

## Kruskal's algorithm

Sort the edges by weight. Go through them cheapest first, adding each edge **unless** its two ends are already connected by the edges chosen so far (adding it would close a loop). Each accepted edge is the cheapest edge crossing the cut between its endpoint's component and the rest, so it is safe. "Are these already connected?" is exactly the Union-Find question from the previous lesson, answered in near-constant time. Sorting dominates: O(E log E). Predict before running: what is the total length of the cheapest network, and how many of the twelve possible links does it use?

```python type
class UnionFind:
    def __init__(self, items):
        self.parent = {x: x for x in items}
        self.size = {x: 1 for x in items}

    def find(self, x):
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:
            self.parent[x], x = root, self.parent[x]
        return root

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        if self.size[rx] < self.size[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        self.size[rx] += self.size[ry]
        return True

villages = ["Ash", "Birch", "Cedar", "Dale", "Elm", "Fern", "Glen"]
links = [
    (7, "Ash", "Birch"), (5, "Ash", "Dale"), (8, "Birch", "Cedar"), (9, "Birch", "Dale"),
    (7, "Birch", "Elm"), (5, "Cedar", "Elm"), (15, "Dale", "Elm"), (6, "Dale", "Fern"),
    (8, "Elm", "Fern"), (9, "Elm", "Glen"), (11, "Fern", "Glen"), (14, "Ash", "Glen"),
]

def kruskal(vertices, edges, trace=False):
    uf = UnionFind(vertices)
    tree, total = [], 0
    for weight, u, v in sorted(edges):
        if uf.union(u, v):
            tree.append((u, v, weight))
            total += weight
            if trace:
                print(f"  take   {u}-{v} ({weight})")
        elif trace:
            print(f"  skip   {u}-{v} ({weight}): would close a loop")
    return tree, total

tree, total = kruskal(villages, links, trace=True)
print(f"{len(tree)} links, total {total} km")
```

```output
  take   Ash-Dale (5)
  take   Cedar-Elm (5)
  take   Dale-Fern (6)
  take   Ash-Birch (7)
  take   Birch-Elm (7)
  skip   Birch-Cedar (8): would close a loop
  skip   Elm-Fern (8): would close a loop
  skip   Birch-Dale (9): would close a loop
  take   Elm-Glen (9)
  skip   Fern-Glen (11): would close a loop
  skip   Ash-Glen (14): would close a loop
  skip   Dale-Elm (15): would close a loop
6 links, total 39 km
```

The edges are stored as `(weight, u, v)` so that `sorted` orders them by weight first.

Kruskal takes the two 5 km links, then 6, then both 7s; both 8 km links (Birch-Cedar and Elm-Fern) would close loops, as would the 9 km Birch-Dale one; Elm-Glen (9) is taken, bringing Glen in, and the rest are skipped. Six links totalling 39 km connect all seven villages, from twelve candidates totalling 104 km. Notice that the algorithm never needed to look ahead: each decision was final the moment it was made.

## Prim's algorithm

Prim's algorithm grows a single tree from any starting vertex. At each step, it adds the cheapest edge with exactly one end in the tree (the cut property again, with the tree as one side of the cut). A heap of candidate edges makes "the cheapest edge leaving the tree" fast: when a vertex joins, push its edges to vertices outside the tree; pop the cheapest; if its far end is already in the tree, it is stale, so skip it. That is O(E log V), like Dijkstra, which it closely resembles; the difference is that the heap is ordered by the **edge's** weight, not by total distance from the start. Predict before running: will Prim's tree have the same total as Kruskal's?

```python type
import heapq

def prim(vertices, edges, start):
    adjacent = {v: [] for v in vertices}
    for w, u, v in edges:
        adjacent[u].append((w, v))
        adjacent[v].append((w, u))
    in_tree = {start}
    heap = [(w, start, v) for w, v in adjacent[start]]
    heapq.heapify(heap)
    tree, total = [], 0
    while heap and len(in_tree) < len(vertices):
        w, u, v = heapq.heappop(heap)
        if v in in_tree:
            continue
        in_tree.add(v)
        tree.append((u, v, w))
        total += w
        for w2, x in adjacent[v]:
            if x not in in_tree:
                heapq.heappush(heap, (w2, v, x))
    return tree, total

for start in ["Ash", "Glen"]:
    tree_p, total_p = prim(villages, links, start)
    print(f"from {start}: total {total_p} km, links in the order added: {[(u, v) for u, v, _ in tree_p]}")
```

```output
from Ash: total 39 km, links in the order added: [('Ash', 'Dale'), ('Dale', 'Fern'), ('Ash', 'Birch'), ('Birch', 'Elm'), ('Elm', 'Cedar'), ('Elm', 'Glen')]
from Glen: total 39 km, links in the order added: [('Glen', 'Elm'), ('Elm', 'Cedar'), ('Elm', 'Birch'), ('Birch', 'Ash'), ('Ash', 'Dale'), ('Dale', 'Fern')]
```

The loop stops once every vertex is in the tree; any remaining heap entries are left unused.

Prim's tree has the same total, 39 km, whichever village it starts from, though it adds the links in a different order. Here the minimum spanning tree is even the same set of links, because no two edge choices tie in a way that matters; in general, when weights repeat, there can be several different minimum spanning trees with the same total. Which to use? Kruskal is simple with an edge list and sparse graphs; Prim suits dense graphs and adjacency lists, and with an array instead of a heap runs in O(V²), ideal when almost every pair of vertices is joined.

## Clustering

Kruskal's algorithm merges components cheapest link first. **Stop it early**, when k components remain, and those components are a clustering of the vertices into k groups: points joined by short links end up together, and the groups are separated by the longest possible gaps. This is **single-linkage clustering**, and it finds clusters of any shape, following chains of nearby points. Predict before running: how will these twelve points split into 3 clusters?

```python type
import math
import random

random.seed(3)
centres = [(2, 2), (8, 3), (5, 8)]
points = [(round(cx + random.uniform(-1.2, 1.2), 1), round(cy + random.uniform(-1.2, 1.2), 1)) for cx, cy in centres for _ in range(4)]
edges = [(math.dist(p, q), p, q) for i, p in enumerate(points) for q in points[i + 1:]]

def clusters(points, edges, k):
    uf = UnionFind(points)
    groups = len(points)
    for w, p, q in sorted(edges):
        if groups == k:
            break
        if uf.union(p, q):
            groups -= 1
    found = {}
    for p in points:
        found.setdefault(uf.find(p), []).append(p)
    return list(found.values())

for group in clusters(points, edges, 3):
    print(sorted(group))
```

```output
[(0.8, 2.8), (1.4, 2.1), (1.7, 2.2), (2.3, 1.0)]
[(7.4, 2.4), (8.3, 2.2), (8.8, 2.9), (9.2, 2.9)]
[(5.1, 8.6), (5.3, 8.9), (5.4, 7.0), (5.6, 8.2)]
```

Every pair of points gets an edge weighted by its straight-line distance, so the graph is complete: 66 edges for 12 points.

The three groups come out as the three clumps around (2, 2), (8, 3) and (5, 8), found without telling the algorithm where the centres were. Unlike k-means, single linkage never assumes clusters are round, but a single chain of stray points between two clumps can wrongly join them. The third challenge measures how well separated the clusters are.

::: challenge Is the network connected? [easy]
Write `cheapest_network(vertices, edges)` that runs Kruskal's algorithm (using the lesson's `UnionFind`) on `(weight, u, v)` edges and returns the total weight of a minimum spanning tree, or `None` if the graph is **not connected** (Kruskal then accepts fewer than V − 1 edges, giving a spanning **forest**).

```python starter
def cheapest_network(vertices, edges):
    return None

print(cheapest_network(villages, links), cheapest_network(["a", "b", "c"], [(4, "a", "b")]))
```

```python solution
def cheapest_network(vertices, edges):
    uf = UnionFind(vertices)
    total, used = 0, 0
    for w, u, v in sorted(edges):
        if uf.union(u, v):
            total += w
            used += 1
    return total if used == len(vertices) - 1 else None

print(cheapest_network(villages, links), cheapest_network(["a", "b", "c"], [(4, "a", "b")]))
```

```python test
import itertools as _it, random as _random
assert "cheapest_network" in dir(), "Keep the function's name as cheapest_network."
assert cheapest_network(villages, links) == 39, "The villages' MST totals 39."
assert cheapest_network(["a", "b", "c"], [(4, "a", "b")]) is None, "c is not connected: return None."
assert cheapest_network(["solo"], []) == 0, "A single vertex needs no edges: total 0."
assert cheapest_network(["a", "b"], [(5, "a", "b"), (2, "a", "b")]) == 2, "With two links between the same pair, the cheaper one is used."
_r = _random.Random(1)
for _ in range(80):
    _vs = list(range(_r.randint(1, 6)))
    _es = [(_r.randint(1, 9), _r.choice(_vs), _r.choice(_vs)) for _ in range(_r.randint(0, 9))]
    _best = None
    for _k in range(len(_es) + 1):
        for _sub in _it.combinations(_es, _k):
            if _k != len(_vs) - 1:
                continue
            _uf = UnionFind(_vs)
            if all(_uf.union(u, v) for _, u, v in _sub):
                _tw = sum(w for w, _, _ in _sub)
                _best = _tw if _best is None else min(_best, _tw)
    assert cheapest_network(_vs, _es) == _best, f"Wrong answer for {_vs} with edges {_es}."
"SUCCESS: V − 1 accepted edges means a spanning tree; fewer means the graph falls into separate pieces that no cable list can join."
```

Hint: Kruskal as in the lesson, counting accepted edges. If the count is `len(vertices) - 1`, return the total; otherwise `None`.
:::

::: challenge Connect the points [medium]
Points on a grid must all be connected by cables running along grid lines, so a cable between two points costs their **Manhattan distance**, |x₁ − x₂| + |y₁ − y₂|. Every pair can be joined. Write `connect_points(points)` returning the minimum total cost using **Prim's algorithm in its O(V²) array form**, with no heap and without building the edge list: keep `best[i]`, the cheapest known link from point i to the tree; repeatedly add the point outside the tree with the smallest `best`, then update `best` for the remaining points using distances to the newly added point.

```python starter
def connect_points(points):
    return 0

print(connect_points([(0, 0), (2, 2), (3, 10), (5, 2), (7, 0)]))
```

```python solution
def connect_points(points):
    n = len(points)
    if n == 0:
        return 0
    in_tree = [False] * n
    best = [float("inf")] * n
    best[0] = 0
    total = 0
    for _ in range(n):
        i = min((j for j in range(n) if not in_tree[j]), key=lambda j: best[j])
        in_tree[i] = True
        total += best[i]
        xi, yi = points[i]
        for j in range(n):
            if not in_tree[j]:
                d = abs(xi - points[j][0]) + abs(yi - points[j][1])
                if d < best[j]:
                    best[j] = d
    return total

print(connect_points([(0, 0), (2, 2), (3, 10), (5, 2), (7, 0)]))
```

```python test
import random as _random, time as _time
assert "connect_points" in dir(), "Keep the function's name as connect_points."
assert connect_points([(0, 0), (2, 2), (3, 10), (5, 2), (7, 0)]) == 20, f"The five-point example costs 20; got {connect_points([(0, 0), (2, 2), (3, 10), (5, 2), (7, 0)])}."
assert connect_points([]) == 0 and connect_points([(4, 4)]) == 0, "Zero or one point costs nothing."
assert connect_points([(0, 0), (0, 0)]) == 0, "Two points at the same place cost 0."
_r = _random.Random(2)
for _ in range(80):
    _ps = [(_r.randint(0, 20), _r.randint(0, 20)) for _ in range(_r.randint(1, 9))]
    _es = [(abs(a[0] - b[0]) + abs(a[1] - b[1]), i, j) for i, a in enumerate(_ps) for j, b in enumerate(_ps) if i < j]
    _want = kruskal(range(len(_ps)), _es)[1]
    assert connect_points(_ps) == _want, f"Wrong total for {_ps}: expected {_want}."
_big = [(_r.randint(0, 10_000), _r.randint(0, 10_000)) for _ in range(400)]
_start = _time.perf_counter(); connect_points(_big); _el = _time.perf_counter() - _start
assert _el < 2.0, f"400 points took {_el:.1f} s: use the O(V²) array version."
assert "heapq" not in _source and "sorted(" not in _source, "Use the array form: no heap and no sorted edge list."
"SUCCESS: On a complete graph E ≈ V², so the O(V²) array version of Prim beats anything that builds and sorts all the edges."
```

Hint: `best = [inf] * n` with `best[0] = 0`. Repeat n times: pick the unused index with the smallest `best`, mark it, add `best[i]` to the total, then lower `best[j]` for every unused j using its Manhattan distance to point i.
:::

::: challenge Spacing between clusters [medium]
The **spacing** of a clustering is the smallest distance between two points in **different** clusters: larger is better separated. Single-linkage clustering into k groups gives the largest spacing possible, and that spacing is exactly the weight of the next edge Kruskal would have added. Write `cluster_spacing(points, k)` returning that spacing (as a float), by running Kruskal on all pairs until k clusters remain and then continuing through the sorted edges to the first one joining two different clusters. Assume `2 <= k <= len(points)`.

```python starter
import math

def cluster_spacing(points, k):
    return 0.0

print(round(cluster_spacing(points, 3), 3), round(cluster_spacing(points, 2), 3))
```

```python solution
import math

def cluster_spacing(points, k):
    edges = sorted((math.dist(p, q), p, q) for i, p in enumerate(points) for q in points[i + 1:])
    uf = UnionFind(points)
    groups = len(points)
    for w, p, q in edges:
        if uf.find(p) == uf.find(q):
            continue
        if groups == k:
            return w
        uf.union(p, q)
        groups -= 1

print(round(cluster_spacing(points, 3), 3), round(cluster_spacing(points, 2), 3))
```

```python test
import math as _math, random as _random
assert "cluster_spacing" in dir(), "Keep the function's name as cluster_spacing."
_line = [(0, 0), (1, 0), (2, 0), (10, 0), (11, 0), (30, 0)]
assert abs(cluster_spacing(_line, 3) - 8) < 1e-9, "On the line, three clusters {0,1,2}, {10,11}, {30} are 8 apart at their closest."
assert abs(cluster_spacing(_line, 2) - 19) < 1e-9, "Two clusters: {0..11} and {30}, spacing 19."
assert abs(cluster_spacing(_line, 6) - 1) < 1e-9, "Every point alone: the spacing is the closest pair, 1."
_r = _random.Random(4)
for _ in range(60):
    _ps = list({(_r.randint(0, 30), _r.randint(0, 30)) for _ in range(_r.randint(2, 9))})
    if len(_ps) < 2:
        continue
    _k = _r.randint(2, len(_ps))
    _groups = clusters(_ps, [(_math.dist(p, q), p, q) for i, p in enumerate(_ps) for q in _ps[i + 1:]], _k)
    _which = {p: g for g, members in enumerate(_groups) for p in members}
    _want = min(_math.dist(p, q) for p in _ps for q in _ps if _which[p] != _which[q])
    assert abs(cluster_spacing(_ps, _k) - _want) < 1e-9, f"Wrong spacing for {_ps} with k = {_k}."
"SUCCESS: The edge Kruskal stops just short of adding is the gap between the closest clusters: single linkage maximises it, which is why it is the natural way to cut a dataset into well-separated groups."
```

Hint: Sort all pairwise edges. Skip edges inside one cluster. For an edge joining two clusters: if k clusters remain, its weight is the spacing; otherwise union them and decrease the count.
:::

## What you learned

- A spanning tree connects all V vertices with V − 1 edges; a minimum spanning tree does so at the lowest total weight.
- The cut property (the cheapest edge across any split is safe) makes greedy algorithms correct here.
- Kruskal sorts edges and adds each one that joins two different components, checked with Union-Find: O(E log E). Prim grows one tree with a heap of leaving edges, O(E log V), or with arrays in O(V²) for dense graphs.
- Stopping Kruskal at k components gives single-linkage clustering, with the largest possible spacing between clusters.

The next lesson returns to shortest paths, adding a sense of direction to search: A*.
