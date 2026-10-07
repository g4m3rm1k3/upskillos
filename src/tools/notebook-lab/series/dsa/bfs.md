# Breadth-first search

How many introductions separate you from a stranger? What is the fewest moves to solve a puzzle, or the shortest route through a maze? Each of these asks for the **shortest path** in a graph where every edge counts as one step. **Breadth-first search** (BFS) answers all of them. It explores outward from a starting vertex in rings: first everything one step away, then everything two steps away, and so on, so the first time it reaches a vertex, it has found the shortest way there.

The tool that makes this work is the queue from earlier in the series: vertices are explored in the order they were discovered. This lesson covers:

- BFS itself, with a queue and a visited set, in O(V + E);
- distances and the BFS **layers**;
- recording **parents** to rebuild the actual shortest path, not just its length;
- BFS on grids, an implicit graph;
- **multi-source** BFS, starting from many vertices at once;
- why BFS fails when edges have different lengths.

## The algorithm

Start with the source in a queue, marked as **visited** at distance 0. Repeatedly take the vertex at the front of the queue and look at its neighbours; each neighbour not yet visited is marked visited, given a distance one more than the current vertex's, and added to the back of the queue. Each vertex enters the queue once and each edge is examined once (twice for undirected), so BFS runs in **O(V + E)**.

Marking a vertex visited **when it is discovered**, not when it is taken from the queue, matters: otherwise a vertex could be added many times by different neighbours before being processed. Predict before running: in the network below, how far is Ann from Hal, and which people are at distance 2?

```python type
from collections import deque

friends = {
    "Ann": ["Ben", "Cara"],
    "Ben": ["Ann", "Dev", "Eli"],
    "Cara": ["Ann", "Eli"],
    "Dev": ["Ben", "Fay"],
    "Eli": ["Ben", "Cara", "Gus"],
    "Fay": ["Dev", "Hal"],
    "Gus": ["Eli"],
    "Hal": ["Fay"],
    "Ivy": [],
}

def bfs_distances(graph, source):
    distance = {source: 0}
    queue = deque([source])
    while queue:
        vertex = queue.popleft()
        for neighbour in graph[vertex]:
            if neighbour not in distance:
                distance[neighbour] = distance[vertex] + 1
                queue.append(neighbour)
    return distance

dist = bfs_distances(friends, "Ann")
layers = {}
for person, d in dist.items():
    layers.setdefault(d, []).append(person)
for d in sorted(layers):
    print(f"distance {d}: {layers[d]}")
print("Ivy reachable?", "Ivy" in dist)
```

```output
distance 0: ['Ann']
distance 1: ['Ben', 'Cara']
distance 2: ['Dev', 'Eli']
distance 3: ['Fay', 'Gus']
distance 4: ['Hal']
Ivy reachable? False
```

The `distance` dictionary doubles as the visited set: a vertex is visited exactly when it has a distance.

The layers come out in rings: Ann; Ben and Cara; Dev and Eli; Fay and Gus; Hal at distance 4. The queue guarantees this order: every vertex at distance d is dequeued before any at distance d + 1, because they were all added earlier. So when a vertex is first discovered, it is discovered from a vertex in the nearest possible layer, and its distance is the shortest. Ivy has no connections, so she never appears: BFS also tells you what is **reachable** at all.

## Rebuilding the path

Distances say how far; often you need the route itself. Record, for each discovered vertex, its **parent**: the vertex it was discovered from. Following parents back from the target to the source traces a shortest path in reverse. Predict before running: what is a shortest chain of introductions from Ann to Hal?

```python type
def bfs_path(graph, source, target):
    parent = {source: None}
    queue = deque([source])
    while queue:
        vertex = queue.popleft()
        if vertex == target:
            break
        for neighbour in graph[vertex]:
            if neighbour not in parent:
                parent[neighbour] = vertex
                queue.append(neighbour)
    if target not in parent:
        return None
    path = []
    while target is not None:
        path.append(target)
        target = parent[target]
    return path[::-1]

print(bfs_path(friends, "Ann", "Hal"))
print(bfs_path(friends, "Gus", "Dev"))
print(bfs_path(friends, "Ann", "Ivy"))
```

```output
['Ann', 'Ben', 'Dev', 'Fay', 'Hal']
['Gus', 'Eli', 'Ben', 'Dev']
None
```

The search stops early once the target is taken from the queue: nothing later can improve on it. The `parent` dictionary again doubles as the visited set.

Ann → Ben → Dev → Fay → Hal: four introductions. Gus to Dev has only one shortest path, through Eli and Ben; in a denser network there can be ties, and BFS returns whichever its neighbour order found first. No path gives `None`. The parent pointers form a **BFS tree**: every reachable vertex hangs from the source by its shortest path.

## Grids

On a grid, BFS finds the shortest route through a maze. The graph is implicit: the neighbours of a cell are the open cells next to it. Predict before running: how many steps from S to E, and how many cells does BFS explore to find out?

```python type
maze = [
    "##########",
    "#S...#...#",
    "#.##.#.#.#",
    "#.#..#.#.#",
    "#.#.##.#.#",
    "#......#E#",
    "##########",
]

def find(ch):
    for r, row in enumerate(maze):
        if ch in row:
            return (r, row.index(ch))

def open_neighbours(cell):
    r, c = cell
    for nr, nc in [(r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)]:
        if maze[nr][nc] != "#":
            yield (nr, nc)

start, goal = find("S"), find("E")
parent, queue = {start: None}, deque([start])
while queue:
    cell = queue.popleft()
    if cell == goal:
        break
    for n in open_neighbours(cell):
        if n not in parent:
            parent[n] = cell
            queue.append(n)

path, cell = [], goal
while cell is not None:
    path.append(cell)
    cell = parent.get(cell)
drawing = [list(row) for row in maze]
for r, c in path[1:-1]:
    drawing[r][c] = "*"
print("\n".join("".join(row) for row in drawing))
print(f"shortest route: {len(path) - 1} steps; cells explored: {len(parent)}")
```

```output
##########
#S...#***#
#*##.#*#*#
#*#..#*#*#
#*#.##*#*#
#******#E#
##########
shortest route: 19 steps; cells explored: 27
```

The maze's outer wall means `open_neighbours` never steps outside the grid, so it needs no bounds check.

The route, drawn with `*`, goes down the left side; a second way, through the middle, joins the bottom row two steps later, so BFS never uses it. BFS explored all 27 open cells to be sure nothing shorter exists. In a large open area BFS spreads out like a ripple in all directions, exploring many cells that lead away from the goal. The A* lesson later in the series uses a sense of direction to explore far fewer.

## Many sources at once

Sometimes the question is "how far is each cell from the **nearest** of several places": the nearest hospital for every house, or how long a spreading fire takes to reach each cell. Running BFS from each source separately would repeat work. Instead, put **all** the sources in the queue at distance 0 to begin with. BFS then expands from all of them together, and each cell is claimed by whichever source reaches it first, which is its nearest. This is **multi-source BFS**, still O(V + E). The third challenge uses it.

## When edges have lengths

BFS counts edges. If edges have different lengths (road distances, travel times), the path with the fewest edges need not be the shortest: two long roads can be worse than three short ones. Predict before running: what does BFS say is the best route from A to D, and what is actually shortest?

```python type
roads = {"A": {"B": 10, "C": 1}, "B": {"D": 1}, "C": {"E": 1}, "E": {"D": 1}, "D": {}}
route = bfs_path({v: list(n) for v, n in roads.items()}, "A", "D")
length = sum(roads[a][b] for a, b in zip(route, route[1:]))
print("BFS route:", route, "total length", length)
print("but A -> C -> E -> D has length", roads["A"]["C"] + roads["C"]["E"] + roads["E"]["D"])
```

```output
BFS route: ['A', 'B', 'D'] total length 11
but A -> C -> E -> D has length 3
```

BFS picks A → B → D (2 edges, length 11) over A → C → E → D (3 edges, length 3). For weighted graphs, Dijkstra's algorithm replaces the queue with a priority queue ordered by distance, as a later lesson shows.

::: challenge Degrees of separation [easy]
Write `separation(graph, a, b)` returning the number of edges on a shortest path from a to b in an unweighted graph (0 if a is b), or -1 if b cannot be reached. Use BFS with a `deque`, and stop as soon as b is found.

```python starter
from collections import deque

def separation(graph, a, b):
    return -1

print(separation(friends, "Ann", "Hal"), separation(friends, "Gus", "Cara"), separation(friends, "Ann", "Ivy"))
```

```python solution
from collections import deque

def separation(graph, a, b):
    if a == b:
        return 0
    distance = {a: 0}
    queue = deque([a])
    while queue:
        v = queue.popleft()
        for n in graph[v]:
            if n not in distance:
                distance[n] = distance[v] + 1
                if n == b:
                    return distance[n]
                queue.append(n)
    return -1

print(separation(friends, "Ann", "Hal"), separation(friends, "Gus", "Cara"), separation(friends, "Ann", "Ivy"))
```

```python test
import random as _random
assert "separation" in dir(), "Keep the function's name as separation."
assert separation(friends, "Ann", "Hal") == 4 and separation(friends, "Gus", "Cara") == 2, "Ann-Hal is 4 steps and Gus-Cara 2."
assert separation(friends, "Ann", "Ivy") == -1 and separation(friends, "Ivy", "Ivy") == 0, "Unreachable gives -1; a person is 0 steps from themselves."
_r = _random.Random(1)
for _ in range(100):
    _n = _r.randint(1, 12); _g = {i: set() for i in range(_n)}
    for _ in range(_r.randint(0, 20)):
        _u, _v = _r.randrange(_n), _r.randrange(_n)
        if _u != _v:
            _g[_u].add(_v); _g[_v].add(_u)
    _a, _b = _r.randrange(_n), _r.randrange(_n)
    _d = bfs_distances(_g, _a)
    assert separation(_g, _a, _b) == _d.get(_b, -1), f"Wrong separation between {_a} and {_b}."
"SUCCESS: BFS reaches each layer before the next, so the first time b is discovered is along a shortest path."
```

Hint: Like `bfs_distances`, but check whether each newly discovered neighbour is b and return its distance at once. Handle a == b before searching.
:::

::: challenge Shortest path in a grid [medium]
Write `grid_path(grid, start, goal)` for a grid given as a list of strings, where `#` is a wall and anything else is open. Return the shortest path as a list of `(row, column)` cells from start to goal inclusive, moving up, down, left or right, or `None` if there is none. The grid has **no** outer wall, so check the bounds.

```python starter
from collections import deque

def grid_path(grid, start, goal):
    return None

field = ["....#",
         ".##.#",
         "...#.",
         "#....",]
print(grid_path(field, (0, 0), (2, 4)))
```

```python solution
from collections import deque

def grid_path(grid, start, goal):
    rows, cols = len(grid), len(grid[0])
    parent = {start: None}
    queue = deque([start])
    while queue:
        cell = queue.popleft()
        if cell == goal:
            path = []
            while cell is not None:
                path.append(cell)
                cell = parent[cell]
            return path[::-1]
        r, c = cell
        for nr, nc in [(r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)]:
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] != "#" and (nr, nc) not in parent:
                parent[(nr, nc)] = cell
                queue.append((nr, nc))
    return None

field = ["....#",
         ".##.#",
         "...#.",
         "#....",]
print(grid_path(field, (0, 0), (2, 4)))
```

```python test
assert "grid_path" in dir(), "Keep the function's name as grid_path."
_f = ["....#", ".##.#", "...#.", "#...."]
_p = grid_path(_f, (0, 0), (2, 4))
assert _p is not None and _p[0] == (0, 0) and _p[-1] == (2, 4) and len(_p) - 1 == 8, f"The shortest path from (0, 0) to (2, 4) has 8 steps (it must go round through the bottom row); got {_p}."
assert all(abs(a[0] - b[0]) + abs(a[1] - b[1]) == 1 for a, b in zip(_p, _p[1:])), "Each step must move to an adjacent cell."
assert all(_f[r][c] != "#" for r, c in _p), "The path must not go through walls."
assert grid_path(_f, (0, 0), (0, 0)) == [(0, 0)], "Start equal to goal: a one-cell path."
assert grid_path([".#.", ".#.", ".#."], (0, 0), (0, 2)) is None, "A wall all the way down: no path."
_open = ["." * 40 for _ in range(40)]
_q = grid_path(_open, (0, 0), (39, 39))
assert _q is not None and len(_q) - 1 == 78, "On an open 40 × 40 grid the corner-to-corner path has 78 steps."
"SUCCESS: The parent pointers of a BFS give a shortest route, and the bounds check lets the grid be any shape."
```

Hint: BFS from start with a `parent` dictionary. Generate the four neighbours, keep those inside `0 <= nr < rows` and `0 <= nc < cols` that are not walls and not yet in `parent`. When the goal is dequeued, follow parents back and reverse.
:::

::: challenge Distance to the nearest exit [medium]
In a building plan, `E` marks exits, `#` walls and `.` floor. Write `nearest_exit_distances(plan)` returning a list of lists of the same shape, holding for each floor or exit cell the number of steps to the **nearest** exit (0 on an exit), and `None` for walls and for floor cells that cannot reach any exit. Use **multi-source BFS**: start with every exit in the queue at distance 0. There is no outer wall, so check bounds.

```python starter
from collections import deque

def nearest_exit_distances(plan):
    return []

plan = ["E...#",
        ".#..#",
        "...#E",
        "##...",]
for row in nearest_exit_distances(plan):
    print(row)
```

```python solution
from collections import deque

def nearest_exit_distances(plan):
    rows, cols = len(plan), len(plan[0])
    dist = [[None] * cols for _ in range(rows)]
    queue = deque()
    for r in range(rows):
        for c in range(cols):
            if plan[r][c] == "E":
                dist[r][c] = 0
                queue.append((r, c))
    while queue:
        r, c = queue.popleft()
        for nr, nc in [(r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)]:
            if 0 <= nr < rows and 0 <= nc < cols and plan[nr][nc] != "#" and dist[nr][nc] is None:
                dist[nr][nc] = dist[r][c] + 1
                queue.append((nr, nc))
    return dist

plan = ["E...#",
        ".#..#",
        "...#E",
        "##...",]
for row in nearest_exit_distances(plan):
    print(row)
```

```python test
import random as _random, time as _time
assert "nearest_exit_distances" in dir(), "Keep the function's name as nearest_exit_distances."
_got = nearest_exit_distances(["E...#", ".#..#", "...#E", "##..."])
_want = [[0, 1, 2, 3, None], [1, None, 3, 4, None], [2, 3, 4, None, 0], [None, None, 3, 2, 1]]
assert _got == _want, f"Expected {_want}, got {_got}."
assert nearest_exit_distances(["..", ".."]) == [[None, None], [None, None]], "With no exits, every cell is None."
assert nearest_exit_distances(["E.#."]) == [[0, 1, None, None]], "A floor cell cut off by a wall cannot reach an exit."
_r = _random.Random(2)
_big = ["".join(_r.choice("....#") for _ in range(60)) for _ in range(60)]
_big[0] = "E" + _big[0][1:]; _big[59] = _big[59][:-1] + "E"
_start = _time.perf_counter(); nearest_exit_distances(_big); _el = _time.perf_counter() - _start
assert _el < 1.0, f"A 60 × 60 plan took {_el:.1f} s: start one BFS from all exits together, not one per cell or per exit."
"SUCCESS: Starting from all exits at once, each cell is claimed by the nearest one: one O(V + E) search instead of one per exit or per cell."
```

Hint: Create the `dist` grid of `None`. Put every exit in the queue with distance 0 first; then run ordinary BFS, setting each newly reached open cell to its neighbour's distance plus one.
:::

## What you learned

- BFS explores outward in layers using a queue, marking vertices visited when discovered: O(V + E).
- In an unweighted graph, the first time BFS reaches a vertex is along a shortest path; distances come in rings around the source, and unreached vertices are unreachable.
- Parent pointers rebuild the shortest path itself; on grids, BFS solves mazes over an implicit graph.
- Multi-source BFS starts from many vertices at once to find the distance to the nearest of them. BFS counts edges, so for weighted edges a different algorithm is needed.

The next lesson explores the other way, going as deep as possible before backing up: depth-first search.
