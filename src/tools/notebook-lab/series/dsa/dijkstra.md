# Dijkstra's algorithm

Breadth-first search finds the path with the fewest edges, which is the shortest path only when every edge has the same length. Real networks have **weights**: roads have distances, flights have prices, network links have delays. The breadth-first search lesson ended with an example where a three-road route was far shorter than a two-road one. **Dijkstra's algorithm** (Edsger Dijkstra, 1956) finds shortest paths when edges have **non-negative** weights. It is what route planners, network routing protocols and game path-finding are built on.

The idea is BFS with a priority queue in place of the plain queue: instead of exploring vertices in order of how many edges away they are, explore them in order of **distance**, always settling the closest unsettled vertex next. This lesson covers:

- the algorithm, with `heapq`, and why the closest unsettled vertex's distance is final;
- reconstructing the route with parent pointers;
- its running time, O((V + E) log V);
- weighted grids, where moving into each cell has a cost;
- why a single negative edge breaks it.

## The algorithm

Keep a tentative distance for each vertex: 0 for the source, infinity for the rest. Keep a priority queue of `(distance, vertex)` pairs, starting with the source. Repeatedly pop the pair with the smallest distance. If that vertex is already **settled** (finalised), skip it; otherwise settle it, and **relax** each outgoing edge: if going through this vertex gives a neighbour a shorter distance than it has, record the shorter distance and push the neighbour with it.

Why is the popped distance final? Every other route to that vertex must leave the settled region through some unsettled vertex, which is at least as far away as the popped one (it was not popped first), and then continue along edges that are never negative, so it cannot end up shorter. Predict before running: what is the shortest distance from A to F, and which vertices are settled in which order?

```python type
import heapq

roads = {
    "A": {"B": 7, "C": 9, "F": 14},
    "B": {"A": 7, "C": 10, "D": 15},
    "C": {"A": 9, "B": 10, "D": 11, "F": 2},
    "D": {"B": 15, "C": 11, "E": 6},
    "E": {"D": 6, "F": 9},
    "F": {"A": 14, "C": 2, "E": 9},
}

def dijkstra(graph, source, trace=False):
    distance = {source: 0}
    parent = {source: None}
    settled = set()
    heap = [(0, source)]
    while heap:
        d, v = heapq.heappop(heap)
        if v in settled:
            continue
        settled.add(v)
        if trace:
            print(f"  settle {v} at distance {d}")
        for w, weight in graph[v].items():
            new = d + weight
            if new < distance.get(w, float("inf")):
                distance[w] = new
                parent[w] = v
                heapq.heappush(heap, (new, w))
    return distance, parent

def route(parent, target):
    path = []
    while target is not None:
        path.append(target)
        target = parent[target]
    return path[::-1]

distance, parent = dijkstra(roads, "A", trace=True)
print("distances:", distance)
print("route to E:", route(parent, "E"), "length", distance["E"])
```

```output
  settle A at distance 0
  settle B at distance 7
  settle C at distance 9
  settle F at distance 11
  settle D at distance 20
  settle E at distance 20
distances: {'A': 0, 'B': 7, 'C': 9, 'F': 11, 'D': 20, 'E': 20}
route to E: ['A', 'C', 'F', 'E'] length 20
```

A vertex can be pushed several times if its distance improves more than once; the stale entries stay in the heap and are skipped when popped, because the vertex is already settled. This "lazy deletion" is simpler than updating entries inside the heap, which `heapq` cannot do.

The settling order is A (0), B (7), C (9), F (11), D (20), E (20): exactly the vertices in increasing order of distance. The direct road from A to F (14) loses to A → C → F (11), and E is reached as A → C → F → E with length 20, shorter than the route through D. Each vertex is settled once and each edge relaxed at most once per direction, with heap operations costing O(log V): O((V + E) log V) overall.

## Stopping early, and a bigger network

When only one destination matters, the search can stop as soon as that vertex is settled, since its distance is then final. On a large network, that can skip most of the work. Predict before running: on a random road network of 2,000 towns, roughly what fraction of the towns does Dijkstra settle to find a route between two of them?

```python type
import math
import random

random.seed(1)
towns = {i: (random.random() * 100, random.random() * 100) for i in range(2_000)}
network = {i: {} for i in towns}
for i, (x, y) in towns.items():
    nearest = sorted(towns, key=lambda j: (towns[j][0] - x) ** 2 + (towns[j][1] - y) ** 2)[1:5]
    for j in nearest:
        length = round(math.dist(towns[i], towns[j]), 2)
        network[i][j] = network[j][i] = length

def dijkstra_to(graph, source, target):
    distance, settled, heap = {source: 0}, set(), [(0, source)]
    while heap:
        d, v = heapq.heappop(heap)
        if v in settled:
            continue
        settled.add(v)
        if v == target:
            return d, len(settled)
        for w, weight in graph[v].items():
            if d + weight < distance.get(w, float("inf")):
                distance[w] = d + weight
                heapq.heappush(heap, (d + weight, w))
    return float("inf"), len(settled)

for target in [17, 512, 1999]:
    d, settled_count = dijkstra_to(network, 0, target)
    straight = math.dist(towns[0], towns[target])
    print(f"town 0 -> town {target:>4}: road distance {d:7.2f} (straight line {straight:6.2f}), settled {settled_count:>4} of 2,000 towns")
```

```output
town 0 -> town   17: road distance   96.29 (straight line  84.04), settled 1498 of 2,000 towns
town 0 -> town  512: road distance   70.24 (straight line  59.14), settled  881 of 2,000 towns
town 0 -> town 1999: road distance  116.79 (straight line  94.49), settled 1846 of 2,000 towns
```

Each town is joined to its four nearest neighbours, a rough model of a road network. `math.dist` is the straight-line distance between two points.

How much of the network is settled depends on how far away the target is: Dijkstra grows a "circle" of settled towns outward from the source, so the nearest of these targets needed 881 towns settled and the farthest 1,846, almost the whole network. The road distance is always somewhat longer than the straight line. The circle grows in every direction, including away from the target; A* search, later in this part of the series, adds a sense of direction to settle far fewer.

## Weighted grids

On a game map, moving into different terrain costs different amounts: road 1, grass 2, forest 5, swamp 10. The grid is an implicit weighted graph, where an edge's weight is the cost of the cell it enters. Predict before running: will the cheapest route go through the forest, or around it?

```python type
terrain = [
    "S..ff....",
    ".f.ff.~~.",
    ".f.ff.~~.",
    ".f....~~.",
    "...fff..G",
]
cost = {".": 1, "f": 5, "~": 10, "S": 1, "G": 1}

def grid_dijkstra(grid, start, goal):
    rows, cols = len(grid), len(grid[0])
    best, parent, heap = {start: 0}, {start: None}, [(0, start)]
    done = set()
    while heap:
        d, cell = heapq.heappop(heap)
        if cell in done:
            continue
        done.add(cell)
        if cell == goal:
            break
        r, c = cell
        for nr, nc in [(r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)]:
            if 0 <= nr < rows and 0 <= nc < cols:
                nd = d + cost[grid[nr][nc]]
                if nd < best.get((nr, nc), float("inf")):
                    best[(nr, nc)], parent[(nr, nc)] = nd, cell
                    heapq.heappush(heap, (nd, (nr, nc)))
    return best[goal], route(parent, goal)

total, path = grid_dijkstra(terrain, (0, 0), (4, 8))
drawing = [list(row) for row in terrain]
for r, c in path[1:-1]:
    drawing[r][c] = "*"
print("\n".join("".join(row) for row in drawing))
print("cost:", total, " steps:", len(path) - 1)
```

```output
S**ff....
.f*ff.~~.
.f*ff.~~.
.f****~~.
...ff***G
cost: 16  steps: 12
```

The same `route` function rebuilds the path from the parent pointers; only the neighbours and weights changed.

The route skirts the forest block and the swamp, crossing a single forest cell where every way round costs more: 12 steps for a total cost of 16. BFS, counting only steps, treats every 12-step route as equally good, including ones through far more forest or swamp.

## Negative edges break it

The proof that a settled distance is final relied on edges never being negative: going further can never make a route shorter. With a negative edge (a refund, an energy gain, a currency exchange that profits), it can. Predict before running: what does Dijkstra report as the distance from S to C, and what is the truth?

```python type
tricky = {"S": {"A": 2, "B": 5}, "A": {"C": 2}, "B": {"A": -4}, "C": {}}
dist, _ = dijkstra(tricky, "S")
print("Dijkstra says S -> C costs", dist["C"])
print("but S -> B -> A -> C costs", 5 - 4 + 2)
```

```output
Dijkstra says S -> C costs 4
but S -> B -> A -> C costs 3
```

Dijkstra settles A at distance 2 before discovering that the route through B reaches A at distance 1, and by then C has been computed from the wrong value. For graphs with negative edges, the Bellman-Ford algorithm of the next lesson is needed; it is slower, but correct, and it can even detect negative cycles, where a route could get cheaper for ever.

::: challenge How long until everyone hears? [easy]
A message is sent from one computer on a network; each directed link `(u, v, delay)` passes it on after `delay` milliseconds. Write `time_to_reach_all(n, links, source)` for computers numbered 0 to n − 1, returning how long until **every** computer has received the message (the largest shortest-path distance from the source), or -1 if some computer never receives it. Build the graph and use Dijkstra.

```python starter
import heapq

def time_to_reach_all(n, links, source):
    return -1

print(time_to_reach_all(4, [(0, 1, 1), (0, 2, 4), (1, 2, 2), (2, 3, 1)], 0))
```

```python solution
import heapq

def time_to_reach_all(n, links, source):
    graph = {i: {} for i in range(n)}
    for u, v, delay in links:
        graph[u][v] = min(delay, graph[u].get(v, float("inf")))
    distance, _ = dijkstra(graph, source)
    if len(distance) < n:
        return -1
    return max(distance.values())

print(time_to_reach_all(4, [(0, 1, 1), (0, 2, 4), (1, 2, 2), (2, 3, 1)], 0))
```

```python test
import random as _random
assert "time_to_reach_all" in dir(), "Keep the function's name as time_to_reach_all."
assert time_to_reach_all(4, [(0, 1, 1), (0, 2, 4), (1, 2, 2), (2, 3, 1)], 0) == 4, "0 → 1 → 2 → 3 takes 1 + 2 + 1 = 4."
assert time_to_reach_all(3, [(0, 1, 5)], 0) == -1, "Computer 2 never receives the message."
assert time_to_reach_all(1, [], 0) == 0, "With only the source, everyone has it immediately."
assert time_to_reach_all(2, [(1, 0, 3)], 0) == -1, "Links are one-way."
assert time_to_reach_all(2, [(0, 1, 9), (0, 1, 2)], 0) == 2, "With two links between the same computers, the faster one counts."
_r = _random.Random(1)
for _ in range(100):
    _n = _r.randint(1, 6); _ls = [(_r.randrange(_n), _r.randrange(_n), _r.randint(0, 9)) for _ in range(_r.randint(0, 12))]
    _d = {i: float("inf") for i in range(_n)}; _d[0] = 0
    for _ in range(_n):
        for _u, _v, _w in _ls:
            if _d[_u] + _w < _d[_v]:
                _d[_v] = _d[_u] + _w
    _want = -1 if float("inf") in _d.values() else max(_d.values())
    assert time_to_reach_all(_n, _ls, 0) == _want, f"Wrong answer for links {_ls}."
"SUCCESS: Shortest paths from one source to everywhere, then the slowest of them: the time for a broadcast to cover the network."
```

Hint: Build `graph = {i: {} for i in range(n)}` and add each link (keeping the smallest delay if a pair appears twice). Run the lesson's `dijkstra` from the source; if fewer than n computers have a distance, return -1, otherwise the largest distance.
:::

::: challenge Cheapest flights with a stop limit [medium]
Flights are `(from, to, price)` triples. Write `cheapest_within(flights, source, target, max_flights)` returning the lowest total price from source to target using **at most** `max_flights` flights, or `None` if impossible. Plain Dijkstra on cities is not enough, because a cheaper route with too many flights must not hide a dearer one with few. Run Dijkstra on **states** `(city, flights used)`: the heap holds `(price, city, flights used)`, a state is settled once, and only expand a state if it has used fewer than `max_flights` flights. The first time the target is popped, its price is the answer.

```python starter
import heapq

def cheapest_within(flights, source, target, max_flights):
    return None

flights = [("LON", "PAR", 60), ("PAR", "ROM", 50), ("LON", "ROM", 200), ("ROM", "ATH", 40), ("PAR", "ATH", 170), ("LON", "BER", 30), ("BER", "ATH", 210)]
print(cheapest_within(flights, "LON", "ATH", 3), cheapest_within(flights, "LON", "ATH", 2), cheapest_within(flights, "LON", "ATH", 1))
```

```python solution
import heapq

def cheapest_within(flights, source, target, max_flights):
    graph = {}
    for a, b, price in flights:
        graph.setdefault(a, []).append((b, price))
    heap = [(0, source, 0)]
    settled = set()
    while heap:
        price, city, used = heapq.heappop(heap)
        if city == target:
            return price
        if (city, used) in settled:
            continue
        settled.add((city, used))
        if used == max_flights:
            continue
        for nxt, cost in graph.get(city, []):
            if (nxt, used + 1) not in settled:
                heapq.heappush(heap, (price + cost, nxt, used + 1))
    return None

flights = [("LON", "PAR", 60), ("PAR", "ROM", 50), ("LON", "ROM", 200), ("ROM", "ATH", 40), ("PAR", "ATH", 170), ("LON", "BER", 30), ("BER", "ATH", 210)]
print(cheapest_within(flights, "LON", "ATH", 3), cheapest_within(flights, "LON", "ATH", 2), cheapest_within(flights, "LON", "ATH", 1))
```

```python test
import itertools as _it, random as _random
assert "cheapest_within" in dir(), "Keep the function's name as cheapest_within."
_f = [("LON", "PAR", 60), ("PAR", "ROM", 50), ("LON", "ROM", 200), ("ROM", "ATH", 40), ("PAR", "ATH", 170), ("LON", "BER", 30), ("BER", "ATH", 210)]
assert cheapest_within(_f, "LON", "ATH", 3) == 150, "With up to 3 flights: LON-PAR-ROM-ATH costs 150."
assert cheapest_within(_f, "LON", "ATH", 2) == 230, "With up to 2 flights: LON-PAR-ATH costs 230 (cheaper than via ROM or BER)."
assert cheapest_within(_f, "LON", "ATH", 1) is None, "There is no direct flight from LON to ATH."
assert cheapest_within(_f, "LON", "LON", 0) == 0, "Already there: price 0."
assert cheapest_within([("A", "X", 1), ("X", "M", 1), ("A", "M", 10), ("M", "T", 1)], "A", "T", 2) == 11, "A→X→M reaches M cheaply but uses up both flights; A→M→T (11) is the only route within 2. Settle (city, flights used) states, not cities."
_r = _random.Random(2)
for _ in range(150):
    _cities = list(range(5))
    _fs = [(_r.randrange(5), _r.randrange(5), _r.randint(1, 20)) for _ in range(_r.randint(0, 10))]
    _k = _r.randint(0, 4)
    _layer = {0: 0}
    for _step in range(_k):
        _new = {}
        for _c, _p in _layer.items():
            for _a, _b, _w in _fs:
                if _a == _c and _p + _w < _new.get(_b, float("inf")):
                    _new[_b] = _p + _w
        _layer = {**_layer}
        for _c, _p in _new.items():
            if _p < _layer.get(_c, float("inf")):
                _layer[_c] = _p
    _want = _layer.get(4)
    assert cheapest_within(_fs, 0, 4, _k) == _want, f"Wrong answer for flights {_fs} with at most {_k} flights."
"SUCCESS: Adding 'flights used' to the state lets Dijkstra respect the limit: the same algorithm on a bigger graph of (city, count) pairs."
```

Hint: Store states `(price, city, used)` in the heap. Pop; if the city is the target, return the price. Skip states already settled; settle the `(city, used)` pair; if `used` has reached the limit, don't expand it. Otherwise push each onward flight with `used + 1`.
:::

::: challenge How many shortest routes? [medium]
Write `count_shortest(graph, source, target)` for a weighted graph with **positive** weights (dictionary of dictionaries), returning a pair `(distance, count)`: the shortest distance and the **number of different shortest paths**, or `(None, 0)` if the target is unreachable. Extend Dijkstra with a `ways` dictionary: the source has 1 way; when relaxing an edge finds a **strictly shorter** distance to w, set `ways[w]` to `ways[v]`; when it finds an **equal** distance, add `ways[v]` to `ways[w]`. Because a vertex is only expanded once it is settled, `ways[v]` is final when it is used.

```python starter
import heapq

def count_shortest(graph, source, target):
    return None, 0

grid_city = {"A": {"B": 1, "C": 1}, "B": {"D": 1}, "C": {"D": 1}, "D": {"E": 2, "F": 1}, "F": {"E": 1}, "E": {}}
print(count_shortest(grid_city, "A", "E"))
```

```python solution
import heapq

def count_shortest(graph, source, target):
    distance, ways = {source: 0}, {source: 1}
    settled, heap = set(), [(0, source)]
    while heap:
        d, v = heapq.heappop(heap)
        if v in settled:
            continue
        settled.add(v)
        for w, weight in graph[v].items():
            new = d + weight
            old = distance.get(w, float("inf"))
            if new < old:
                distance[w], ways[w] = new, ways[v]
                heapq.heappush(heap, (new, w))
            elif new == old:
                ways[w] += ways[v]
    if target not in distance:
        return None, 0
    return distance[target], ways[target]

grid_city = {"A": {"B": 1, "C": 1}, "B": {"D": 1}, "C": {"D": 1}, "D": {"E": 2, "F": 1}, "F": {"E": 1}, "E": {}}
print(count_shortest(grid_city, "A", "E"))
```

```python test
import math as _math
assert "count_shortest" in dir(), "Keep the function's name as count_shortest."
_g = {"A": {"B": 1, "C": 1}, "B": {"D": 1}, "C": {"D": 1}, "D": {"E": 2, "F": 1}, "F": {"E": 1}, "E": {}}
assert count_shortest(_g, "A", "E") == (4, 4), f"Two ways to D, then two equally short ways on to E: (4, 4). Got {count_shortest(_g, 'A', 'E')}."
assert count_shortest(_g, "E", "A") == (None, 0), "E cannot reach A."
assert count_shortest(_g, "A", "A") == (0, 1), "The source has one (empty) shortest path to itself."
def _lattice(_n):
    _gr = {}
    for _x in range(_n + 1):
        for _y in range(_n + 1):
            _gr[(_x, _y)] = {}
            if _x < _n: _gr[(_x, _y)][(_x + 1, _y)] = 1
            if _y < _n: _gr[(_x, _y)][(_x, _y + 1)] = 1
    return _gr
for _n in [2, 5, 10]:
    assert count_shortest(_lattice(_n), (0, 0), (_n, _n)) == (2 * _n, _math.comb(2 * _n, _n)), f"On an {_n} × {_n} street grid there are C({2 * _n}, {_n}) shortest routes."
"SUCCESS: Shortest distances and the number of ways to achieve them in one Dijkstra pass: on a 10 × 10 street grid, 184,756 equally short routes."
```

Hint: Alongside `distance`, keep `ways`. On a strictly shorter distance, copy `ways[v]` and push; on an equal distance, add `ways[v]` to `ways[w]` (no push needed, since the distance did not change).
:::

## What you learned

- Dijkstra's algorithm finds shortest paths from a source in graphs with non-negative weights by always settling the closest unsettled vertex, using a heap: O((V + E) log V).
- Stale heap entries are simply skipped when popped ("lazy deletion"); parent pointers rebuild the route, and the search can stop once the target is settled.
- Weighted grids, flight networks and any problem where moves have costs fit the same pattern; extra conditions (like a limit on flights) go into the state.
- A negative edge breaks the proof that settled distances are final, and Dijkstra can return wrong answers; the next lesson's Bellman-Ford handles negative edges.

The next lesson covers shortest paths with negative edges, and between every pair of vertices at once.
