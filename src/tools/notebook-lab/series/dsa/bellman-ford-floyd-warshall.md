# Bellman-Ford and Floyd-Warshall

Dijkstra's algorithm is fast, but it has two limits. It fails when an edge has a **negative** weight, and it answers shortest paths from **one** source. This lesson covers the two classic algorithms that remove those limits:

- **Bellman-Ford** finds shortest paths from one source even with negative edges, in O(V × E), and detects **negative cycles**, loops whose total weight is below zero, around which a "shortest" path could keep getting shorter for ever.
- **Floyd-Warshall** finds the shortest path between **every** pair of vertices at once, in O(V³), with three nested loops over a distance table.

Negative weights are less exotic than they sound. In finance, converting currencies around a loop and ending up with more than you started with (an **arbitrage**) is precisely a negative cycle once rates are turned into weights. In scheduling, constraints like "B must start at most 3 hours after A" become negative edges. And Floyd-Warshall is the simplest way to fill in a full table of travel times between every pair of cities.

## Bellman-Ford

Bellman-Ford does something very simple: **relax every edge**, over and over. Relaxing an edge u → v with weight w means: if the distance to u plus w is less than the current distance to v, lower v's distance. A shortest path visits each vertex at most once, so it has at most V − 1 edges, and after the k-th round of relaxing every edge, every shortest path with at most k edges has been found. So V − 1 rounds suffice: O(V × E). If a round changes nothing, everything is already final and the algorithm can stop early.

And if after V − 1 rounds some edge can **still** be relaxed, there must be a negative cycle reachable from the source, because no genuine shortest path needs more edges. Predict before running: what does Bellman-Ford find for the graph that fooled Dijkstra in the last lesson, and how many rounds does it need?

```python type
def bellman_ford(vertices, edges, source):
    distance = {v: float("inf") for v in vertices}
    parent = {v: None for v in vertices}
    distance[source] = 0
    round_number = 0
    for round_number in range(1, len(vertices)):
        changed = False
        for u, v, w in edges:
            if distance[u] + w < distance[v]:
                distance[v] = distance[u] + w
                parent[v] = u
                changed = True
        if not changed:
            break
    for u, v, w in edges:
        if distance[u] + w < distance[v]:
            raise ValueError("negative cycle reachable from the source")
    return distance, parent, round_number

tricky_edges = [("S", "A", 2), ("S", "B", 5), ("A", "C", 2), ("B", "A", -4)]
distance, parent, rounds = bellman_ford("SABC", tricky_edges, "S")
print(distance, f"after {rounds} rounds")
path, v = [], "C"
while v is not None:
    path.append(v)
    v = parent[v]
print("route to C:", path[::-1])

looping = [("S", "A", 1), ("A", "B", 2), ("B", "C", -6), ("C", "A", 2)]
try:
    bellman_ford("SABC", looping, "S")
except ValueError as error:
    print("ValueError:", error)
```

```output
{'S': 0, 'A': 1, 'B': 5, 'C': 3} after 3 rounds
route to C: ['S', 'B', 'A', 'C']
ValueError: negative cycle reachable from the source
```

The graph is given as an **edge list** of `(u, v, weight)` triples, the natural format here, since every round loops over all edges. The final loop is the V-th round, used only to test for changes.

Bellman-Ford finds the true distance to C, 3, along S → B → A → C, which Dijkstra missed. Here a third round was needed only to confirm that nothing more changed. In the second graph the loop A → B → C → A has total weight 2 − 6 + 2 = −2: going round it again and again makes the distances fall without limit, so "shortest path" has no meaning, and the algorithm reports it rather than returning nonsense.

## Currency arbitrage

Exchange rates multiply along a route: pounds to euros to dollars to pounds multiplies the three rates. An arbitrage exists if some loop's product is **greater than 1**. Taking logarithms turns products into sums, since log(a × b) = log a + log b. Using the weight **−log(rate)** for each conversion, a loop whose rates multiply to more than 1 has weights summing to **less than 0**: a negative cycle. So Bellman-Ford detects arbitrage. Predict before running: is there a profitable loop in these rates?

```python type
import math

rates = {
    ("GBP", "EUR"): 1.17, ("EUR", "GBP"): 0.85,
    ("EUR", "USD"): 1.09, ("USD", "EUR"): 0.92,
    ("USD", "GBP"): 0.79, ("GBP", "USD"): 1.26,
    ("USD", "JPY"): 151.0, ("JPY", "GBP"): 0.0054,
}
currencies = sorted({c for pair in rates for c in pair})
edges = [(a, b, -math.log(r)) for (a, b), r in rates.items()]
try:
    bellman_ford(currencies, edges, "GBP")
    print("no arbitrage")
except ValueError:
    print("arbitrage exists")

for loop in [["GBP", "EUR", "USD", "GBP"], ["GBP", "USD", "JPY", "GBP"], ["GBP", "EUR", "USD", "JPY", "GBP"]]:
    product = math.prod(rates[(a, b)] for a, b in zip(loop, loop[1:]))
    print(" -> ".join(loop), f": 1 pound becomes {product:.4f}")
```

```output
arbitrage exists
GBP -> EUR -> USD -> GBP : 1 pound becomes 1.0075
GBP -> USD -> JPY -> GBP : 1 pound becomes 1.0274
GBP -> EUR -> USD -> JPY -> GBP : 1 pound becomes 1.0399
```

`math.prod` multiplies all the numbers it is given.

There is an arbitrage, in fact several: even pounds to euros to dollars and back gains 0.75%, the loop through yen turns 1 pound into about 1.027, and going through euros, dollars and yen into about 1.040. Bellman-Ford spots this without trying every loop, which would be hopeless with many currencies. Real markets close such gaps within moments, which is why trading systems watch for them continuously.

## Floyd-Warshall: all pairs

To get shortest distances between **every** pair of vertices, one could run Dijkstra from every vertex. Floyd-Warshall is simpler, works with negative edges (though not negative cycles), and is the natural choice for small, dense graphs. It is a **dynamic programming** algorithm, the subject of later lessons, and it rests on one idea.

Number the vertices 0 to V − 1, and keep a table `dist[i][j]`. Initially it holds the direct edge weights (0 on the diagonal, infinity where there is no edge). Then consider each vertex k in turn as a possible **stepping stone**: for every pair i, j, check whether going i → k → j beats the best route found so far. After vertex k has been considered, `dist[i][j]` is the shortest path from i to j using only vertices 0 to k as stepping stones. After all V of them, it is the true shortest distance. Three nested loops: O(V³). Predict before running: what is the shortest distance from York to Hull, which have no direct road?

```python type
INF = float("inf")
cities = ["York", "Leeds", "Hull", "Sheffield", "Lincoln"]
road_list = [("York", "Leeds", 40), ("York", "Sheffield", 90), ("Leeds", "Sheffield", 55), ("Leeds", "Hull", 95),
             ("Sheffield", "Lincoln", 75), ("Hull", "Lincoln", 80), ("York", "Lincoln", 130)]
n = len(cities)
index = {c: i for i, c in enumerate(cities)}
dist = [[0 if i == j else INF for j in range(n)] for i in range(n)]
for a, b, km in road_list:
    dist[index[a]][index[b]] = dist[index[b]][index[a]] = km

for k in range(n):
    for i in range(n):
        for j in range(n):
            if dist[i][k] + dist[k][j] < dist[i][j]:
                dist[i][j] = dist[i][k] + dist[k][j]

print(" " * 10 + "".join(f"{c[:6]:>8}" for c in cities))
for c, row in zip(cities, dist):
    print(f"{c:<10}" + "".join(f"{d:>8}" for d in row))
```

```output
              York   Leeds    Hull  Sheffi  Lincol
York             0      40     135      90     130
Leeds           40       0      95      55     130
Hull           135      95       0     150      80
Sheffield       90      55     150       0      75
Lincoln        130     130      80      75       0
```

The loop over k must be the **outermost**: the table must be complete for stepping stones 0 to k − 1 before k is tried. Swapping the loop order is a classic bug that gives wrong answers on some graphs.

York to Hull comes out at 135 km, via Leeds: the table holds every pair at once, symmetric because the roads are two-way. With V = 5, the triple loop is 125 checks; with V = 1,000 it would be a billion, so Floyd-Warshall suits graphs of up to a few hundred vertices. For large sparse graphs, running Dijkstra from each vertex is faster.

## Choosing a shortest-path algorithm

- Unweighted edges: **BFS**, O(V + E).
- Non-negative weights, one source: **Dijkstra**, O((V + E) log V).
- Negative weights, or detecting negative cycles, one source: **Bellman-Ford**, O(V × E).
- All pairs on a small or dense graph: **Floyd-Warshall**, O(V³).
- A DAG, even with negative weights: relax edges in **topological order**, O(V + E), as the critical path calculation did.

::: challenge Spot a negative cycle [easy]
Write `has_negative_cycle(n, edges)` for vertices 0 to n − 1 and a list of `(u, v, weight)` edges, returning `True` if the graph contains a negative cycle **anywhere**, not just reachable from one vertex. A neat trick: start every vertex at distance 0 (as if an extra source had a zero-weight edge to each), run n − 1 rounds of relaxing every edge, then check whether one more round still improves something. Don't use the lesson's `bellman_ford`; write the loops yourself.

```python starter
def has_negative_cycle(n, edges):
    return False

print(has_negative_cycle(3, [(0, 1, 1), (1, 2, -1), (2, 0, -1)]), has_negative_cycle(3, [(0, 1, 1), (1, 2, -1), (2, 0, 1)]))
```

```python solution
def has_negative_cycle(n, edges):
    distance = [0] * n
    for _ in range(n - 1):
        for u, v, w in edges:
            if distance[u] + w < distance[v]:
                distance[v] = distance[u] + w
    return any(distance[u] + w < distance[v] for u, v, w in edges)

print(has_negative_cycle(3, [(0, 1, 1), (1, 2, -1), (2, 0, -1)]), has_negative_cycle(3, [(0, 1, 1), (1, 2, -1), (2, 0, 1)]))
```

```python test
import itertools as _it, random as _random
assert "has_negative_cycle" in dir(), "Keep the function's name as has_negative_cycle."
assert has_negative_cycle(3, [(0, 1, 1), (1, 2, -1), (2, 0, -1)]) is True, "The loop 0 → 1 → 2 → 0 totals -1."
assert has_negative_cycle(3, [(0, 1, 1), (1, 2, -1), (2, 0, 1)]) is False, "That loop totals +1: not negative."
assert has_negative_cycle(4, [(0, 1, 5), (2, 3, -2), (3, 2, 1)]) is True, "A negative cycle unreachable from vertex 0 still counts."
assert has_negative_cycle(1, [(0, 0, -1)]) is True and has_negative_cycle(2, []) is False, "A negative self-loop is a cycle; no edges, no cycle."
_r = _random.Random(3)
for _ in range(200):
    _n = _r.randint(1, 5); _es = [(_r.randrange(_n), _r.randrange(_n), _r.randint(-3, 6)) for _ in range(_r.randint(0, 8))]
    _w = {}
    for _u, _v, _x in _es:
        _w[(_u, _v)] = min(_x, _w.get((_u, _v), _x))
    _neg = False
    for _k in range(1, _n + 1):
        for _cyc in _it.permutations(range(_n), _k):
            _pairs = list(zip(_cyc, _cyc[1:] + _cyc[:1]))
            if all(_p in _w for _p in _pairs) and sum(_w[_p] for _p in _pairs) < 0:
                _neg = True
    assert has_negative_cycle(_n, _es) == _neg, f"Wrong answer for edges {_es}."
"SUCCESS: Starting everyone at 0 acts like a virtual source joined to every vertex, so any negative cycle anywhere keeps the distances falling."
```

Hint: `distance = [0] * n`; loop n − 1 times over all edges relaxing them; then return whether any edge can still be relaxed.
:::

::: challenge Floyd-Warshall with routes [medium]
Write `all_pairs(n, edges)` for directed edges `(u, v, weight)` on vertices 0 to n − 1, returning `(dist, nxt)` where `dist[i][j]` is the shortest distance (infinity if unreachable) and `nxt[i][j]` is the **next vertex** after i on a shortest route to j (None if unreachable, and `nxt[i][i] = i`). Initialise `nxt[u][v] = v` for each edge; whenever going through k improves i → j, set `nxt[i][j] = nxt[i][k]`. Then write `route(nxt, i, j)` returning the list of vertices on the route, or `[]` if there is none.

```python starter
def all_pairs(n, edges):
    return [], []

def route(nxt, i, j):
    return []

print(all_pairs(4, [(0, 1, 3), (1, 2, 1), (0, 2, 7), (2, 3, 2), (3, 0, 1)]))
```

```python solution
def all_pairs(n, edges):
    INF = float("inf")
    dist = [[0 if i == j else INF for j in range(n)] for i in range(n)]
    nxt = [[i if i == j else None for j in range(n)] for i in range(n)]
    for u, v, w in edges:
        if w < dist[u][v]:
            dist[u][v] = w
            nxt[u][v] = v
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
                    nxt[i][j] = nxt[i][k]
    return dist, nxt

def route(nxt, i, j):
    if nxt[i][j] is None:
        return []
    path = [i]
    while i != j:
        i = nxt[i][j]
        path.append(i)
    return path

d, nx = all_pairs(4, [(0, 1, 3), (1, 2, 1), (0, 2, 7), (2, 3, 2), (3, 0, 1)])
print(d[0][3], route(nx, 0, 3), route(nx, 3, 2))
```

```python test
import random as _random
assert "all_pairs" in dir() and "route" in dir(), "Keep both function names."
_d, _nx = all_pairs(4, [(0, 1, 3), (1, 2, 1), (0, 2, 7), (2, 3, 2), (3, 0, 1)])
assert _d[0][3] == 6 and route(_nx, 0, 3) == [0, 1, 2, 3], f"0 → 1 → 2 → 3 costs 6; got {_d[0][3]} via {route(_nx, 0, 3)}."
assert _d[3][2] == 5 and route(_nx, 3, 2) == [3, 0, 1, 2], "3 → 0 → 1 → 2 costs 5."
assert route(_nx, 2, 2) == [2] and _d[2][2] == 0, "A vertex's route to itself is just itself."
_d2, _nx2 = all_pairs(3, [(0, 1, 1)])
assert _d2[1][0] == float("inf") and route(_nx2, 1, 0) == [], "Unreachable pairs: infinite distance and an empty route."
_r = _random.Random(4)
for _ in range(60):
    _n = _r.randint(1, 6); _es = [(_r.randrange(_n), _r.randrange(_n), _r.randint(0, 9)) for _ in range(_r.randint(0, 12))]
    _dd, _nn = all_pairs(_n, _es)
    _w = {}
    for _u, _v, _x in _es:
        _w[(_u, _v)] = min(_x, _w.get((_u, _v), _x))
    for _s in range(_n):
        _ref = {_s: 0}
        for _ in range(_n):
            for (_u, _v), _x in _w.items():
                if _u in _ref and _ref[_u] + _x < _ref.get(_v, float("inf")):
                    _ref[_v] = _ref[_u] + _x
        for _t in range(_n):
            assert _dd[_s][_t] == _ref.get(_t, float("inf")), f"Wrong distance from {_s} to {_t} for edges {_es}."
            if _t in _ref:
                _hop, _steps = _s, 0
                while _hop != _t and _hop is not None and _steps <= _n:
                    _hop, _steps = _nn[_hop][_t], _steps + 1
                assert _hop == _t, f"Following nxt from {_s} never reaches {_t}: check how nxt is updated."
                _p = route(_nn, _s, _t)
                assert _p, f"{_t} is reachable from {_s}, but route returned an empty list."
                assert _p[0] == _s and _p[-1] == _t and sum(_w.get((a, b), float("inf")) if a != b else 0 for a, b in zip(_p, _p[1:])) == _ref[_t], f"The route from {_s} to {_t} doesn't have the shortest length."
"SUCCESS: One extra table of 'next hops' turns all-pairs distances into all-pairs routes, the same idea network routers use in their forwarding tables."
```

Hint: Initialise `dist` and `nxt` as described (keeping the cheaper edge if a pair repeats). In the triple loop, when `dist[i][k] + dist[k][j]` is smaller, update both tables. `route` follows `i = nxt[i][j]` until it reaches j.
:::

::: challenge Who can reach whom? [medium]
The **transitive closure** of a directed graph says, for every pair, whether j can be reached from i at all. Write `reachability(n, edges)` for directed edges `(u, v)` (no weights) returning an n × n table of `True`/`False`, using the Floyd-Warshall pattern with booleans: start with `True` on the diagonal and for each edge, then for each stepping stone k, `reach[i][j]` becomes true if `reach[i][k]` and `reach[k][j]` both are. Then set `everyone_reaches_everyone` to whether the lesson-style example graph `[(0, 1), (1, 2), (2, 0), (2, 3), (3, 4), (4, 3)]` on 5 vertices lets every vertex reach every other.

```python starter
def reachability(n, edges):
    return []

everyone_reaches_everyone = None
print(reachability(3, [(0, 1), (1, 2)]))
```

```python solution
def reachability(n, edges):
    reach = [[i == j for j in range(n)] for i in range(n)]
    for u, v in edges:
        reach[u][v] = True
    for k in range(n):
        for i in range(n):
            if reach[i][k]:
                for j in range(n):
                    if reach[k][j]:
                        reach[i][j] = True
    return reach

table = reachability(5, [(0, 1), (1, 2), (2, 0), (2, 3), (3, 4), (4, 3)])
everyone_reaches_everyone = all(all(row) for row in table)
print(reachability(3, [(0, 1), (1, 2)]))
```

```python test
import random as _random
assert "reachability" in dir(), "Keep the function's name as reachability."
assert reachability(3, [(0, 1), (1, 2)]) == [[True, True, True], [False, True, True], [False, False, True]], f"Got {reachability(3, [(0, 1), (1, 2)])}."
assert reachability(1, []) == [[True]] and reachability(2, []) == [[True, False], [False, True]], "Every vertex reaches itself."
_t = reachability(5, [(0, 1), (1, 2), (2, 0), (2, 3), (3, 4), (4, 3)])
assert _t[0][4] and not _t[3][0], "0 reaches 4, but nothing leads from {3, 4} back to {0, 1, 2}."
assert everyone_reaches_everyone is False, "3 and 4 cannot reach 0, 1 or 2, so not everyone reaches everyone."
_r = _random.Random(6)
for _ in range(100):
    _n = _r.randint(1, 7); _es = [(_r.randrange(_n), _r.randrange(_n)) for _ in range(_r.randint(0, 12))]
    _tab = reachability(_n, _es)
    for _s in range(_n):
        _seen, _stack = {_s}, [_s]
        while _stack:
            _v = _stack.pop()
            for _a, _b in _es:
                if _a == _v and _b not in _seen:
                    _seen.add(_b); _stack.append(_b)
        assert [_j in _seen for _j in range(_n)] == _tab[_s], f"Row {_s} is wrong for edges {_es}."
"SUCCESS: The same three loops answer 'can I get there at all?' with and and or in place of + and min: Floyd-Warshall is a pattern, not just a formula."
```

Hint: `reach = [[i == j for j in range(n)] for i in range(n)]`, set `reach[u][v] = True` for each edge, then the triple loop with k outermost. `all(all(row) for row in table)` checks every entry.
:::

## What you learned

- Bellman-Ford relaxes every edge V − 1 times, O(V × E): it handles negative edges, and an edge that still relaxes afterwards reveals a negative cycle. With −log(rate) weights, that detects currency arbitrage.
- Floyd-Warshall fills an all-pairs table by trying each vertex as a stepping stone, O(V³), with the stepping-stone loop outermost; a "next hop" table rebuilds routes, and booleans give reachability.
- Choose by the problem: BFS for unweighted, Dijkstra for non-negative weights, Bellman-Ford for negative weights, Floyd-Warshall for all pairs on small graphs, topological order for DAGs.

The next lesson introduces a small, fast structure for tracking which items are connected as connections are added: Union-Find.
