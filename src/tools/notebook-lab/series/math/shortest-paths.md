# Shortest paths

A forklift must fetch a pallet from the far side of a warehouse, threading between racks; a delivery van chooses streets across a city; a network packet hops between routers. Each needs the shortest route through a network whose links have lengths, times or costs. The DSA series built Dijkstra's algorithm as a procedure. This lesson looks at the mathematics underneath: a shortest-path distance satisfies a simple equation, the **Bellman equation**, and every algorithm is a way of solving it. Seen this way, shortest paths turn out to be matrix powers in disguise, with "times" and "plus" swapped for "plus" and "min", which ties them back to the walk-counting of the previous lesson. The lesson ends on a warehouse grid, where a good estimate of the remaining distance lets the A* algorithm search far less of the floor.

This lesson covers:

- weighted graphs, and the Bellman equations that shortest distances satisfy;
- solving them by repeated relaxation (Bellman–Ford), and detecting negative cycles;
- min-plus matrix products: shortest paths as matrix "powers";
- all-pairs distance tables with Floyd–Warshall;
- searching a grid with A* and an admissible heuristic.

## The Bellman equations

::: math
\[ d(s) = 0, \qquad d(v) = \min_{(u, v) \in E} \big(d(u) + w(u, v)\big) \]
- $d(v)$: shortest distance from the source $s$; $w(u, v)$: edge length
- relaxation applies the equation to every edge, repeatedly; $n - 1$ rounds suffice
In code: `if d[u] + w < d[v]: d[v] = d[u] + w` inside the round loop
:::


In a **weighted graph** each edge has a length (or time, or cost). The distance d(v) from a source s to a vertex v is the length of the shortest path. Any shortest path to v arrives from some neighbour u, and its part up to u must itself be a shortest path to u (otherwise a shorter route to u would give a shorter route to v). This **principle of optimality** gives the **Bellman equations**:

\[ d(s) = 0, \qquad d(v) = \min_{u} \big( d(u) + w(u, v) \big) \]

over all edges (u, v). Distances are the solution. **Relaxation** solves them by iteration: start with d(s) = 0 and infinity elsewhere, then repeatedly apply the equation to every edge, lowering d(v) whenever d(u) + w(u, v) is smaller. After k rounds, d(v) is correct for every vertex whose shortest path uses at most k edges, so n − 1 rounds always suffice: the **Bellman–Ford** algorithm. Predict before running: in a small warehouse with 7 locations, how many rounds until the distances stop changing? (At most 6, but it can be fewer.)

```python type
import math
import heapq
import numpy as np
import matplotlib.pyplot as plt

places = ["Dock", "A1", "A2", "B1", "B2", "C1", "Pick"]
aisles = [(0, 1, 12), (0, 3, 25), (1, 2, 10), (1, 3, 9), (2, 4, 8), (3, 4, 14), (3, 5, 11), (4, 6, 7), (5, 6, 15), (2, 6, 22)]
n = len(places)
edges = aisles + [(b, a, w) for a, b, w in aisles]

d = [math.inf] * n
d[0] = 0
for rnd in range(1, n):
    changed = False
    for u, v, w in edges:
        if d[u] + w < d[v]:
            d[v] = d[u] + w
            changed = True
    print(f"round {rnd}: {[x if x < math.inf else '∞' for x in d]}")
    if not changed:
        break
for v in range(n):
    best = min((d[u] + w for u, x, w in edges if x == v), default=math.inf)
    assert v == 0 or d[v] == best
print("every distance satisfies the Bellman equation")
```

```output
round 1: [0, 12, 22, 21, 30, 32, 37]
round 2: [0, 12, 22, 21, 30, 32, 37]
every distance satisfies the Bellman equation
```

Each aisle can be driven both ways, so every undirected aisle becomes two directed edges. A round with no change means the equations are satisfied and the iteration can stop.

Here every distance is already correct after the first round, because the aisles happen to be listed roughly outward from the dock, so each relaxation builds on one done earlier in the same round; the second round confirms that nothing changes. Listed in an unlucky order it could take more: up to 4 rounds here, the most edges on any shortest path, and n − 1 in general. The shortest route from the dock to the picking station is 37 m (Dock–A1–A2–B2–Pick). The final check confirms every distance equals the minimum over its incoming edges, which is all a shortest-path solution means.

## Shortest paths as matrix powers

::: math
\[ (D \otimes W)_{ij} = \min_k \big(D_{ik} + W_{kj}\big), \qquad W^{\otimes k}_{ij} = \text{shortest } i \to j \text{ using at most } k \text{ edges} \]
- the matrix product with $\times \to +$ and $\sum \to \min$
- $W$: 0 on the diagonal, $\infty$ where there is no edge
In code: `min_plus(D, E)` is `(D[:, :, None] + E[None, :, :]).min(axis=1)`
:::


The previous lesson counted walks with powers of the adjacency matrix, where (A²)_ij = Σ_k A_ik A_kj. Replace multiplication with addition and the sum with a minimum, and the same formula computes shortest distances. In this **min-plus** product,

\[ (D \otimes W)_{ij} = \min_k \big( D_{ik} + W_{kj} \big) \]

and starting from the weight matrix W (0 on the diagonal, ∞ where there is no edge), the min-plus "power" W^⊗k holds the shortest distances using at most k edges. One **synchronous** relaxation round, in which every update uses the previous round's distances, is exactly one min-plus product; the in-place updates of the first demo can only be faster. Predict before running: after how many min-plus products does the distance table stop changing?

```python type
W = np.full((n, n), np.inf)
np.fill_diagonal(W, 0)
for a, b, w in aisles:
    W[a, b] = W[b, a] = w

def min_plus(D, E):
    return (D[:, :, None] + E[None, :, :]).min(axis=1)

D = W.copy()
for k in range(2, n):
    D_next = min_plus(D, W)
    print(f"at most {k} edges: Dock -> Pick = {D_next[0, 6]}, table changed: {not np.array_equal(D_next, D)}")
    if np.array_equal(D_next, D):
        break
    D = D_next
print("distance row from the dock:", D[0])
```

```output
at most 2 edges: Dock -> Pick = inf, table changed: True
at most 3 edges: Dock -> Pick = 44.0, table changed: True
at most 4 edges: Dock -> Pick = 37.0, table changed: True
at most 5 edges: Dock -> Pick = 37.0, table changed: False
distance row from the dock: [ 0. 12. 22. 21. 30. 32. 37.]
```

`D[:, :, None] + E[None, :, :]` forms every sum D_ik + E_kj at once in a 3-D array; taking the minimum over the middle axis (k) gives the min-plus product, the analogue of a matrix product's sum.

With at most 2 edges the dock cannot reach the picking station at all (∞); with 3 edges it is 44 m (Dock–A1–A2 and A2's direct aisle to Pick); with 4 edges it falls to 37 m; one more product changes nothing. The min-plus view is more than a curiosity: it lets all the tools of linear algebra (repeated squaring, for example) work on routing problems, and the same structure, the **tropical semiring**, appears in scheduling and in speech recognition.

## Dijkstra and all-pairs tables

::: math
\[ \text{Dijkstra: settle } \arg\min_{v \text{ unsettled}} d(v), \qquad \text{Floyd–Warshall: } D_{ij} \leftarrow \min(D_{ij},\, D_{ik} + D_{kj}) \]
- Dijkstra needs non-negative lengths; a priority queue picks the nearest vertex
- Floyd–Warshall tries each vertex $k$ in turn as a stopover, for all pairs
In code: `dijkstra(n, edges, source)` with `heapq`; a triple loop over `k`, `i`, `j`
:::


Bellman–Ford checks every edge in every round. When all lengths are non-negative, **Dijkstra's algorithm** is far faster: it settles vertices in order of distance, using a priority queue, so each edge is relaxed only once. It solves the same Bellman equations, in a clever order. For a table of distances between **every** pair of locations, the **Floyd–Warshall** algorithm lets each vertex in turn act as a possible stopover: D_ij ← min(D_ij, D_ik + D_kj) for k = 1, ..., n. Predict before running: do all three methods agree?

```python type
def dijkstra(n, edges, source):
    adj = {v: [] for v in range(n)}
    for u, v, w in edges:
        adj[u].append((v, w))
    dist = [math.inf] * n
    dist[source] = 0
    heap = [(0, source)]
    while heap:
        du, u = heapq.heappop(heap)
        if du > dist[u]:
            continue
        for v, w in adj[u]:
            if du + w < dist[v]:
                dist[v] = du + w
                heapq.heappush(heap, (dist[v], v))
    return dist

F = W.copy()
for k in range(n):
    F = np.minimum(F, F[:, k:k + 1] + F[k:k + 1, :])
print("Dijkstra from the dock:", dijkstra(n, edges, 0))
print("Floyd-Warshall row 0:  ", F[0].tolist())
print("all pairs agree with min-plus powers:", np.array_equal(F, D))
print("longest shortest trip in the warehouse:", F.max(), "m, between", places[int(np.argmax(F) // n)], "and", places[int(np.argmax(F) % n)])
```

```output
Dijkstra from the dock: [0, 12, 22, 21, 30, 32, 37]
Floyd-Warshall row 0:   [0.0, 12.0, 22.0, 21.0, 30.0, 32.0, 37.0]
all pairs agree with min-plus powers: True
longest shortest trip in the warehouse: 37.0 m, between Dock and Pick
```

`F[:, k:k+1] + F[k:k+1, :]` is the table of routes from every i to every j via k, built by broadcasting a column against a row.

All three agree. The full table also answers planning questions directly: the longest of all shortest trips (the network's **diameter**, here 37 m from the dock to the picking station) tells a planner where a new aisle would save the most driving.

## Negative lengths and negative cycles

::: math
\[ \text{negative cycle: } \sum_{e \in C} w(e) < 0 \;\Longrightarrow\; \text{no shortest path} \]
- after $n - 1$ rounds, if any edge still satisfies $d(u) + w < d(v)$, a negative cycle is reachable
- Bellman–Ford handles negative edges; textbook Dijkstra does not
In code: `bellman_ford_distances(n, edges, source)` checks one extra round
:::


Some problems have negative edge lengths: a downhill run that recovers energy for an electric vehicle, or a trade that makes money. Bellman–Ford still works. Textbook Dijkstra, which finalises each vertex when it is first taken from the queue, does not: a later negative edge can undercut a distance already finalised. (The version above re-processes a vertex whenever its distance improves, so it stays correct, but it can take exponentially long, and on a negative cycle it never stops: do not run it on one.) A **negative cycle**, a loop with negative total length, is worse: going round it again and again makes distances fall without limit, so no shortest path exists. Bellman–Ford detects it: if anything still improves in an n-th round, a negative cycle is reachable. Predict before running: an electric tug gains charge running downhill. Is the cycle Top → Mid → Bottom → Top a negative cycle?

```python type
def bellman_ford_distances(n, edges, source):
    dist = [math.inf] * n
    dist[source] = 0
    for _ in range(n - 1):
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    for u, v, w in edges:
        if dist[u] + w < dist[v]:
            return None
    return dist

energy = [(0, 1, -2.0), (1, 2, -3.0), (2, 0, 6.0), (2, 3, 1.0)]
print("energy (kWh) from Top:", bellman_ford_distances(4, energy, 0))
print("re-processing Dijkstra agrees here:", dijkstra(4, energy, 0))
steeper = [(0, 1, -2.0), (1, 2, -3.0), (2, 0, 4.0), (2, 3, 1.0)]
print("with a cheaper climb back:", bellman_ford_distances(4, steeper, 0), "(None means a negative cycle)")
```

```output
energy (kWh) from Top: [0, -2.0, -5.0, -4.0]
re-processing Dijkstra agrees here: [0, -2.0, -5.0, -4.0]
with a cheaper climb back: None (None means a negative cycle)
```

Energy use is positive, regeneration negative. Going round a negative-total loop would generate energy forever, which signals a modelling error rather than a free lunch.

With a 6 kWh climb back up, the loop costs +1 kWh in total, so there is no negative cycle, and Bellman–Ford finds the energy to reach each point (−5 kWh to the bottom, a net gain). The re-processing Dijkstra agrees here; a textbook Dijkstra that finalised vertices on first removal could get such graphs wrong. With a 4 kWh climb the loop totals −1 kWh: going round forever would produce unlimited energy, Bellman–Ford reports the negative cycle, and the model needs fixing (real regeneration is never that efficient).

## Searching a grid with A*

::: math
\[ \text{A*: expand } \arg\min_v \big(d(v) + h(v)\big), \qquad h(v) = |x_v - x_g| + |y_v - y_g| \]
- $h$: a guess of the remaining distance; admissible if it never overestimates
- Manhattan distance is admissible for up/down/left/right moves
In code: `grid_search(grid, start, goal, use_heuristic)` with the heuristic on and off
:::


A warehouse floor is naturally a **grid**: cells that are open floor or rack, with moves between neighbouring open cells. Dijkstra explores outwards in all directions equally. **A*** adds a guess h(v) of the remaining distance to the goal and expands cells in order of d(v) + h(v), heading towards the goal first. If the guess never overestimates (it is **admissible**), A* still finds a shortest path. On a grid with moves up, down, left and right, the Manhattan distance |Δx| + |Δy| from the coordinates lesson is admissible. Predict before running: how many fewer cells does A* expand than Dijkstra?

```python type
grid = ["....................",
        ".####.####.####.###.",
        ".####.####.####.###.",
        "....................",
        ".####.####.####.###.",
        ".####.####.####.###.",
        "....................",
        ".####.####.####.###.",
        "...................."]

def grid_search(grid, start, goal, use_heuristic):
    rows, cols = len(grid), len(grid[0])
    h = (lambda c: abs(c[0] - goal[0]) + abs(c[1] - goal[1])) if use_heuristic else (lambda c: 0)
    dist = {start: 0}
    heap = [(h(start), 0, start)]
    expanded = 0
    while heap:
        _, neg_d, cell = heapq.heappop(heap)
        du = -neg_d
        if du > dist[cell]:
            continue
        expanded += 1
        if cell == goal:
            return du, expanded
        r, c = cell
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "." and du + 1 < dist.get((nr, nc), math.inf):
                dist[(nr, nc)] = du + 1
                heapq.heappush(heap, (du + 1 + h((nr, nc)), -(du + 1), (nr, nc)))
    return None, expanded

start, goal = (0, 0), (8, 19)
for name, flag in [("Dijkstra", False), ("A* (Manhattan)", True)]:
    length, expanded = grid_search(grid, start, goal, flag)
    print(f"{name:<15} route length {length}, cells expanded {expanded}")
```

```output
Dijkstra        route length 27, cells expanded 105
A* (Manhattan)  route length 27, cells expanded 28
```

Each queue entry holds (priority, minus the distance so far, cell): when priorities tie, the cell already furthest along comes out first, which keeps A* pushing towards the goal instead of widening its search. Dijkstra is A* with a heuristic of zero.

Both find the same route length, 27 moves, the Manhattan distance itself, since open aisles allow a direct staircase route. Dijkstra expands all 105 open cells on the floor before reaching the far corner, while A* expands just 28, essentially the route itself. (The tie-break matters: with ties going to the smaller distance, A* would also expand all 105, because the Manhattan estimate is exact here and every cell on a staircase route ties.) On real warehouse maps with thousands of cells and a route planner running for dozens of vehicles, that difference decides whether planning is instant or sluggish.

::: challenge Min-plus products [easy]
Write `min_plus(A, B)`: the min-plus product of two NumPy matrices (n × m and m × p), entry (i, j) the minimum over k of A[i, k] + B[k, j], with `np.inf` meaning "no edge". Use array operations. Raise `ValueError` if the inner sizes do not match. Then write `weight_matrix(n, edges, directed=False)`: the n × n matrix with 0 on the diagonal, the edge length for each edge (both directions unless `directed`), the smallest length if an edge is repeated, and `np.inf` elsewhere. Finally write `distances_from(W, source)`: the shortest distances from `source` to every vertex as a NumPy array, by repeated min-plus multiplication of the row vector `W[source]` by W until it stops changing.

```python starter
def min_plus(A, B):
    return A + B

def weight_matrix(n, edges, directed=False):
    return np.zeros((n, n))

def distances_from(W, source):
    return W[source]

W = weight_matrix(3, [(0, 1, 4), (1, 2, 1), (0, 2, 7)])
print(distances_from(W, 0))
```

```python solution
def min_plus(A, B):
    A, B = np.asarray(A, dtype=float), np.asarray(B, dtype=float)
    if A.shape[1] != B.shape[0]:
        raise ValueError("inner dimensions must match")
    return (A[:, :, None] + B[None, :, :]).min(axis=1)

def weight_matrix(n, edges, directed=False):
    W = np.full((n, n), np.inf)
    np.fill_diagonal(W, 0.0)
    for a, b, w in edges:
        W[a, b] = min(W[a, b], w)
        if not directed:
            W[b, a] = min(W[b, a], w)
    return W

def distances_from(W, source):
    W = np.asarray(W, dtype=float)
    d = W[source:source + 1, :]
    while True:
        nxt = min_plus(d, W)
        if np.array_equal(nxt, d):
            return nxt[0]
        d = nxt

W = weight_matrix(3, [(0, 1, 4), (1, 2, 1), (0, 2, 7)])
print(distances_from(W, 0))
```

```python test
for _n in ["min_plus", "weight_matrix", "distances_from"]:
    assert _n in dir(), f"Define {_n}."
_A = np.array([[0, 3], [np.inf, 0]])
_B = np.array([[0, np.inf, 5], [2, 0, np.inf]])
assert np.array_equal(min_plus(_A, _B), [[0, 3, 5], [2, 0, np.inf]]), f"Got {min_plus(_A, _B)}."
try:
    min_plus(np.zeros((2, 3)), np.zeros((2, 2)))
    assert False, "Mismatched sizes should raise ValueError."
except ValueError:
    pass
_W = weight_matrix(3, [(0, 1, 4), (1, 2, 1), (0, 2, 7), (0, 1, 6)])
assert np.array_equal(_W, [[0, 4, 7], [4, 0, 1], [7, 1, 0]]), "Symmetric, keeping the shorter of repeated edges."
_Wd = weight_matrix(3, [(0, 1, 4)], directed=True)
assert _Wd[0, 1] == 4 and _Wd[1, 0] == np.inf, "Directed edges go one way."
assert np.array_equal(distances_from(_W, 0), [0, 4, 5]), "Via vertex 1 is shorter than the direct 7."
_aisles = [(0, 1, 12), (0, 3, 25), (1, 2, 10), (1, 3, 9), (2, 4, 8), (3, 4, 14), (3, 5, 11), (4, 6, 7), (5, 6, 15), (2, 6, 22)]
assert np.array_equal(distances_from(weight_matrix(7, _aisles), 0), [0, 12, 22, 21, 30, 32, 37]), f"The warehouse; got {distances_from(weight_matrix(7, _aisles), 0)}."
assert np.array_equal(distances_from(weight_matrix(4, [(0, 1, 2)]), 0), [0, 2, np.inf, np.inf]), "Unreachable vertices stay at infinity."
"SUCCESS: Swap times for plus and plus for min, and matrix powers compute shortest distances instead of walk counts."
```

Hint: Broadcast to a 3-D array `A[:, :, None] + B[None, :, :]` and take `.min(axis=1)`. For the distances, start from the source's row of W (as a 1 × n matrix) and multiply by W until nothing changes.
:::

::: challenge Bellman–Ford with routes [medium]
Write `bellman_ford(n, edges, source)` for **directed** edges `(u, v, w)` (weights may be negative): return `(dist, prev)`, a list of distances (`math.inf` for unreachable vertices) and a list of predecessors on a shortest path (`None` for the source and unreachable vertices). Run n − 1 rounds of relaxation over all edges in the given order, stopping early if a round changes nothing, then raise `ValueError` if any edge can still be relaxed (a negative cycle reachable from the source). Then write `route(prev, source, target)`: the list of vertices from `source` to `target` by following predecessors backwards from the target, or `[]` if the target is unreachable (the chain of predecessors does not lead back to the source). `route(prev, s, s)` is `[s]`.

```python starter
def bellman_ford(n, edges, source):
    return ([0.0] * n, [None] * n)

def route(prev, source, target):
    return [target]

print(bellman_ford(3, [(0, 1, 4), (1, 2, -2), (0, 2, 3)], 0))
```

```python solution
def bellman_ford(n, edges, source):
    dist = [math.inf] * n
    prev = [None] * n
    dist[source] = 0
    for _ in range(n - 1):
        changed = False
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                prev[v] = u
                changed = True
        if not changed:
            break
    for u, v, w in edges:
        if dist[u] + w < dist[v]:
            raise ValueError("a negative cycle is reachable from the source")
    return dist, prev

def route(prev, source, target):
    path = [target]
    while path[-1] != source and prev[path[-1]] is not None:
        path.append(prev[path[-1]])
        if len(path) > len(prev):
            raise ValueError("predecessor loop")
    return path[::-1] if path[-1] == source else []

print(bellman_ford(3, [(0, 1, 4), (1, 2, -2), (0, 2, 3)], 0))
```

```python test
for _n in ["bellman_ford", "route"]:
    assert _n in dir(), f"Define {_n}."
assert isinstance(bellman_ford(2, [(0, 1, 1)], 0), tuple), "bellman_ford must return the pair (dist, prev)."
_d, _p = bellman_ford(3, [(0, 1, 4), (1, 2, -2), (0, 2, 3)], 0)
assert _d == [0, 4, 2] and _p == [None, 0, 1], f"The negative edge makes 0-1-2 shortest; got {(_d, _p)}."
assert route(_p, 0, 2) == [0, 1, 2] and route(_p, 0, 0) == [0], "Routes by predecessors."
_aisles = [(0, 1, 12), (0, 3, 25), (1, 2, 10), (1, 3, 9), (2, 4, 8), (3, 4, 14), (3, 5, 11), (4, 6, 7), (5, 6, 15), (2, 6, 22)]
_both = _aisles + [(b, a, w) for a, b, w in _aisles]
_d, _p = bellman_ford(7, _both, 0)
assert _d[6] == 37 and route(_p, 0, 6) == [0, 1, 2, 4, 6], f"Dock to Pick: 37 m via A1, A2, B2; got {(_d[6], route(_p, 0, 6))}."
_d, _p = bellman_ford(4, [(0, 1, 1)], 0)
assert _d[2] == math.inf and _p[2] is None and route(_p, 0, 2) == [], "Unreachable vertices keep infinite distance and have no route."
for _bad in [[(0, 1, -2.0), (1, 2, -3.0), (2, 0, 4.0)], [(0, 1, 1), (1, 1, -1)]]:
    try:
        bellman_ford(3, _bad, 0)
        assert False, f"{_bad} contains a negative cycle: raise ValueError."
    except ValueError:
        pass
_d, _ = bellman_ford(4, [(0, 1, -2.0), (1, 2, -3.0), (2, 0, 6.0), (2, 3, 1.0)], 0)
assert _d == [0, -2.0, -5.0, -4.0], "Negative edges without a negative cycle are fine."
assert bellman_ford(3, [(1, 2, -5), (2, 1, -5), (0, 0, 1)], 0)[0][1] == math.inf, "A negative cycle the source cannot reach does not matter."
"SUCCESS: Relax every edge n − 1 times and the Bellman equations hold; if anything still improves, a negative cycle makes 'shortest' meaningless."
```

Hint: Record `prev[v] = u` whenever relaxing (u, v) lowers dist[v]. After the rounds, one more pass that finds any improvement means a reachable negative cycle. To build a route, follow `prev` from the target until reaching the source (or `None`, meaning unreachable), then reverse.
:::

::: challenge A* on a warehouse grid [hard]
Write `grid_route(grid, start, goal, use_heuristic=True)` for a grid given as a list of equal-length strings (`"."` open, `"#"` rack): find a shortest 4-connected route from `start` to `goal` (both `(row, col)` of open cells) with unit move costs, using a priority queue ordered by distance plus heuristic (Manhattan distance to the goal) or distance alone (Dijkstra) when `use_heuristic` is False. Return `(length, path, expanded)`: the number of moves, the list of cells from start to goal inclusive, and the number of cells taken from the queue and expanded (counting the goal); if the goal is unreachable return `(None, [], expanded)`. Raise `ValueError` if start or goal is outside the grid or on a rack. Break ties in priority by the **larger** distance first (store minus the distance in the queue tuple), then by cell, so the result is deterministic and A* heads towards the goal.

```python starter
def grid_route(grid, start, goal, use_heuristic=True):
    return (None, [], 0)

g = ["....", ".##.", "...."]
print(grid_route(g, (0, 0), (2, 3)))
```

```python solution
def grid_route(grid, start, goal, use_heuristic=True):
    rows, cols = len(grid), len(grid[0])
    for name, (r, c) in (("start", start), ("goal", goal)):
        if not (0 <= r < rows and 0 <= c < cols) or grid[r][c] != ".":
            raise ValueError(f"the {name} must be an open cell inside the grid")
    h = (lambda c: abs(c[0] - goal[0]) + abs(c[1] - goal[1])) if use_heuristic else (lambda c: 0)
    dist, prev = {start: 0}, {start: None}
    heap = [(h(start), 0, start)]
    expanded = 0
    while heap:
        _, neg_d, cell = heapq.heappop(heap)
        du = -neg_d
        if du > dist[cell]:
            continue
        expanded += 1
        if cell == goal:
            path = [cell]
            while prev[path[-1]] is not None:
                path.append(prev[path[-1]])
            return du, path[::-1], expanded
        r, c = cell
        for nb in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            nr, nc = nb
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "." and du + 1 < dist.get(nb, math.inf):
                dist[nb] = du + 1
                prev[nb] = cell
                heapq.heappush(heap, (du + 1 + h(nb), -(du + 1), nb))
    return None, [], expanded

g = ["....", ".##.", "...."]
print(grid_route(g, (0, 0), (2, 3)))
```

```python test
for _n in ["grid_route"]:
    assert _n in dir(), f"Define {_n}."
_g = ["....", ".##.", "...."]
_l, _path, _e = grid_route(_g, (0, 0), (2, 3))
assert _l == 5 and _path[0] == (0, 0) and _path[-1] == (2, 3) and len(_path) == 6, f"Got {(_l, _path)}."
assert all(abs(_a[0] - _b[0]) + abs(_a[1] - _b[1]) == 1 and _g[_b[0]][_b[1]] == "." for _a, _b in zip(_path, _path[1:])), "Each step moves to a neighbouring open cell."
_wh = ["....................", ".####.####.####.###.", ".####.####.####.###.", "....................", ".####.####.####.###.", ".####.####.####.###.", "....................", ".####.####.####.###.", "...................."]
_la, _pa, _ea = grid_route(_wh, (0, 0), (8, 19), True)
_ld, _pd, _ed = grid_route(_wh, (0, 0), (8, 19), False)
assert _la == _ld == 27, f"Both find the shortest route of 27 moves; got {_la} and {_ld}."
assert _ea < _ed / 2, f"A* should expand far fewer cells than Dijkstra; got {_ea} and {_ed}."
_maze = ["..#....", ".##.##.", "...#...", ".#...#.", "...#..."]
_l1, _, _ = grid_route(_maze, (0, 0), (4, 6), True)
_l2, _, _ = grid_route(_maze, (0, 0), (4, 6), False)
assert _l1 == _l2 and _l1 is not None, "An admissible heuristic never loses the shortest length."
assert grid_route([".#.", ".#.", ".#."], (0, 0), (0, 2))[:2] == (None, []), "A wall: unreachable."
for _bad in [((1, 1), (0, 0)), ((5, 0), (0, 0)), ((0, 0), (1, 2))]:
    try:
        grid_route(_g, *_bad)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: A Manhattan-distance estimate that never overestimates keeps the route shortest while A* searches a fraction of the floor."
```

Hint: Store `(priority, -distance, cell)` tuples in the heap, so ties fall to the larger distance. Keep `dist` and `prev` dictionaries; skip popped entries whose distance is out of date; rebuild the path from `prev` when the goal is popped.
:::

## What you learned

- Shortest distances satisfy the Bellman equations d(v) = min over incoming edges of d(u) + w(u, v), by the principle of optimality.
- Relaxation (Bellman–Ford) solves them in at most n − 1 rounds, and handles negative edges; an improvement in an extra round reveals a negative cycle.
- Min-plus matrix products compute distances using at most k edges: shortest paths are matrix powers with (min, +) in place of (+, ×).
- Dijkstra solves the same equations faster for non-negative lengths; Floyd–Warshall builds the all-pairs table.
- A* with an admissible heuristic, such as Manhattan distance on a grid, still finds shortest routes while expanding far fewer cells.

The next lesson counts possibilities: test cases, passwords and arrangements.
