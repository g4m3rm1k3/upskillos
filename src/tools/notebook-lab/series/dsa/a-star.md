# A* search

Dijkstra's algorithm settles vertices in order of distance from the start, spreading out in a circle. When there is a single destination, most of that circle is wasted effort: on a map, it explores just as far in the direction **away** from the goal as towards it. **A\*** (pronounced "A star") fixes this with a **heuristic**: an estimate of how far each vertex still is from the goal. It explores the vertex with the smallest **estimated total** route length, so it heads towards the goal and explores far less, while still guaranteeing the shortest path as long as the estimate is never too high.

A* is the standard path-finding algorithm in games, robotics and route planners, and it also solves puzzles whose states form an implicit graph. This lesson covers:

- the idea: f(v) = g(v) + h(v), distance so far plus estimated distance remaining;
- **admissible** heuristics, which never overestimate, and why they guarantee optimal paths;
- comparing Dijkstra, A* and greedy best-first search on a grid;
- what goes wrong with a heuristic that overestimates;
- A* on a puzzle.

## g + h

For each vertex v, A* tracks g(v), the length of the best route found from the start to v (exactly what Dijkstra tracks), and computes h(v), a heuristic estimate of the remaining distance from v to the goal. The priority queue is ordered by **f(v) = g(v) + h(v)**: the estimated length of the best complete route through v. With h = 0 everywhere, A* is exactly Dijkstra. With a good h, vertices pointing away from the goal get large f values and are explored late, or never.

On a grid where each move costs 1 and moves are up, down, left or right, the natural heuristic is the **Manhattan distance**, |r₁ − r₂| + |c₁ − c₂|: the number of moves needed if there were no walls. Walls can only make the real distance longer, so it never overestimates. The map has a cup-shaped wall open towards the start: a trap for anything that heads blindly towards the goal. Predict before running: how many cells will Dijkstra settle compared with A*, and will they find routes of the same length?

```python type
import heapq

grid = [
    "..............................",
    "..............................",
    "........#######...............",
    "..............#...............",
    "..............#...............",
    "..............#...............",
    "S.............#.............G.",
    "..............#...............",
    "..............#...............",
    "..............#...............",
    "........#######...............",
    "..............................",
    "..............................",
]
start, goal = (6, 0), (6, 28)

def neighbours(cell):
    r, c = cell
    for nr, nc in [(r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)]:
        if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]) and grid[nr][nc] != "#":
            yield (nr, nc)

def manhattan(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

def search(start, goal, h):
    g = {start: 0}
    parent = {start: None}
    heap = [(h(start), 0, start)]
    settled = set()
    while heap:
        f, negative_cost, cell = heapq.heappop(heap)
        cost = -negative_cost
        if cell in settled:
            continue
        settled.add(cell)
        if cell == goal:
            break
        for n in neighbours(cell):
            new = cost + 1
            if new < g.get(n, float("inf")):
                g[n], parent[n] = new, cell
                heapq.heappush(heap, (new + h(n), -new, n))
    path, cell = [], goal
    while cell is not None:
        path.append(cell)
        cell = parent[cell]
    return path[::-1], settled

def draw(path, settled):
    rows = [list(row) for row in grid]
    for r, c in settled:
        if rows[r][c] == ".":
            rows[r][c] = "-"
    for r, c in path[1:-1]:
        rows[r][c] = "*"
    print("\n".join("".join(row) for row in rows))

for name, h in [("Dijkstra (h = 0)", lambda cell: 0), ("A* (Manhattan)", lambda cell: manhattan(cell, goal))]:
    path, settled = search(start, goal, h)
    print(f"{name}: route of {len(path) - 1} steps, {len(settled)} cells settled")
    draw(path, settled)
```

```output
Dijkstra (h = 0): route of 38 steps, 367 cells settled
------------------------------
*****************************-
*-------#######-------------*-
*-------------#-------------*-
*-------------#-------------*-
*-------------#-------------*-
S-------------#-------------G.
--------------#--------------.
--------------#---------------
--------------#---------------
--------#######---------------
------------------------------
------------------------------
A* (Manhattan): route of 38 steps, 141 cells settled
..............................
.......**********************.
-------*#######.............*.
-------*------#.............*.
-------*------#.............*.
-------*------#.............*.
S*******------#.............G.
--------------#...............
--------------#...............
--------------#...............
--------#######...............
..............................
..............................
```

Settled cells are drawn as `-` and the route as `*`. Heap entries are `(f, -g, cell)`: when two entries have the same f, the one with the **larger** g, further along its route, is popped first. Many cells tie on f, and preferring the ones nearest the goal stops A* settling all of them; any tie-breaking keeps the result correct, but this one saves a lot of work.

Both find a route of the same, shortest, length: 38 steps. Dijkstra settles almost the whole grid, 367 cells, spreading out in every direction it can. A* settles 141: it ignores the far corners of the map, and although it does wander into the cup (the heuristic cannot see walls, so every cell inside looks promising), it gets out and round the wall with far less searching. The heuristic made the search **directed**.

## Admissible heuristics

Why is the route still the shortest? A heuristic is **admissible** if it never overestimates the true remaining distance. Then, when the goal is popped with total f = g(goal), every unexplored route's f is at least that, and since f never overestimates a route's real length, no unexplored route can be shorter. A* with an admissible heuristic returns an optimal path. (One fine print: the version here settles each vertex once and never revisits it, which additionally needs the heuristic to be **consistent**: h(u) ≤ cost(u, v) + h(v) for every edge, so the estimate never drops by more than the step taken. Manhattan distance, the 8-puzzle's tile distance and the scaled terrain heuristic below all are.)

The best admissible heuristic is the one closest to the truth: the closer h is to the real distance, the fewer vertices A* explores. h = 0 is admissible but useless (Dijkstra); the true distance itself would explore only the path, but computing it is the problem being solved. Good heuristics come from **relaxing** the problem: ignore the walls (Manhattan distance), allow flying (straight-line distance on a road map), or let puzzle pieces pass through each other.

What if the heuristic **overestimates**? Then A* may pop the goal through a route that looks better than it is, and stop with a non-optimal path. Overweighting the heuristic on purpose (f = g + w·h with w > 1, "weighted A*") is sometimes done deliberately to trade optimality for speed. **Greedy best-first search** goes all the way, ordering by h alone and ignoring g. Predict before running: how do the route lengths and the work compare?

```python type
for name, h in [("A*, h exact Manhattan", lambda cell: manhattan(cell, goal)),
                ("weighted A*, 3 × Manhattan", lambda cell: 3 * manhattan(cell, goal)),
                ("greedy, h only", None)]:
    if h is None:
        parent, heap, settled = {start: None}, [(manhattan(start, goal), start)], set()
        while heap:
            _, cell = heapq.heappop(heap)
            if cell in settled:
                continue
            settled.add(cell)
            if cell == goal:
                break
            for n in neighbours(cell):
                if n not in parent:
                    parent[n] = cell
                    heapq.heappush(heap, (manhattan(n, goal), n))
        path, cell = [], goal
        while cell is not None:
            path.append(cell)
            cell = parent[cell]
    else:
        path, settled = search(start, goal, h)
    print(f"{name:<28} route {len(path) - 1:>2} steps, settled {len(settled):>3} cells")
```

```output
A*, h exact Manhattan        route 38 steps, settled 141 cells
weighted A*, 3 × Manhattan   route 38 steps, settled 117 cells
greedy, h only               route 50 steps, settled  97 cells
```

Greedy search keeps no record of g at all: it simply heads for whatever looks closest to the goal and remembers the first way it reached each cell.

Weighted A* settles only 117 cells and here still finds a 38-step route, though it is no longer guaranteed to. Greedy search settles the fewest, 97, but returns a 50-step route: it charged into the cup, and the first way it found round the wall from there is 12 steps longer. Whether that matters depends on the application; a game character that walks a slightly odd route is fine, a delivery route that costs more fuel every day is not.

## A* on a puzzle

A* is not just for maps. In the **8-puzzle**, eight numbered tiles slide around a 3 × 3 frame with one gap; the goal is to arrange them in order. Each arrangement is a vertex and each slide an edge: an implicit graph of 181,440 reachable states. The heuristic is the sum of the Manhattan distances of every tile from its home square: every slide moves one tile by one square, so at least that many slides are needed, and it is admissible. Predict before running: how many states will A* examine to solve this scrambled puzzle, compared with BFS?

```python type
from collections import deque

goal_state = (1, 2, 3, 4, 5, 6, 7, 8, 0)

def slides(state):
    gap = state.index(0)
    r, c = divmod(gap, 3)
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nr, nc = r + dr, c + dc
        if 0 <= nr < 3 and 0 <= nc < 3:
            swap = nr * 3 + nc
            s = list(state)
            s[gap], s[swap] = s[swap], s[gap]
            yield tuple(s)

def tile_distance(state):
    total = 0
    for i, tile in enumerate(state):
        if tile:
            home = tile - 1
            total += abs(i // 3 - home // 3) + abs(i % 3 - home % 3)
    return total

def solve_astar(state):
    g, heap, seen = {state: 0}, [(tile_distance(state), 0, state)], set()
    while heap:
        f, cost, s = heapq.heappop(heap)
        if s in seen:
            continue
        seen.add(s)
        if s == goal_state:
            return cost, len(seen)
        for n in slides(s):
            if cost + 1 < g.get(n, float("inf")):
                g[n] = cost + 1
                heapq.heappush(heap, (cost + 1 + tile_distance(n), cost + 1, n))

def solve_bfs(state):
    depth, queue = {state: 0}, deque([state])
    while queue:
        s = queue.popleft()
        if s == goal_state:
            return depth[s], len(depth)
        for n in slides(s):
            if n not in depth:
                depth[n] = depth[s] + 1
                queue.append(n)

scrambled = (8, 6, 7, 2, 5, 4, 3, 0, 1)
print("A*:  moves, states examined =", solve_astar(scrambled))
print("BFS: moves, states discovered =", solve_bfs(scrambled))
```

```output
A*:  moves, states examined = (31, 21198)
BFS: moves, states discovered = (31, 181440)
```

States are tuples, so they can be dictionary keys; the gap is 0. `divmod(gap, 3)` gives the gap's row and column.

This arrangement is one of the hardest: it needs 31 moves, the maximum for the 8-puzzle. BFS has to discover every one of the 181,440 reachable states to prove that; A* examines a small fraction of them and finds a solution of the same length. For the 15-puzzle, with about 10¹³ states, BFS is hopeless, and A* with stronger heuristics is how it is solved.

::: challenge Heuristics for eight directions [easy]
When a grid allows **diagonal** moves as well, each costing 1, Manhattan distance overestimates (a diagonal move changes both coordinates at once). Write `chebyshev(a, b)`, the largest of the row difference and the column difference, which is the exact distance on an open grid with 8-direction moves of cost 1. Then write `is_admissible(h, true_distance)` that takes a heuristic function and a dictionary from cells to their true distances to the goal, and returns whether h never exceeds the true distance on any of those cells.

```python starter
def chebyshev(a, b):
    return 0

def is_admissible(h, true_distance):
    return True

print(chebyshev((0, 0), (3, 5)), chebyshev((2, 2), (2, 2)))
```

```python solution
def chebyshev(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]))

def is_admissible(h, true_distance):
    return all(h(cell) <= d for cell, d in true_distance.items())

print(chebyshev((0, 0), (3, 5)), chebyshev((2, 2), (2, 2)))
```

```python test
from collections import deque as _dq
assert "chebyshev" in dir() and "is_admissible" in dir(), "Keep both function names."
assert chebyshev((0, 0), (3, 5)) == 5 and chebyshev((2, 2), (2, 2)) == 0 and chebyshev((4, 1), (0, 3)) == 4, "Chebyshev distance is the larger of the two coordinate differences."
_goal = (0, 0); _true = {}
_q = _dq([_goal]); _true[_goal] = 0
while _q:
    _r, _c = _q.popleft()
    for _dr in (-1, 0, 1):
        for _dc in (-1, 0, 1):
            _n = (_r + _dr, _c + _dc)
            if (_dr or _dc) and 0 <= _n[0] < 6 and 0 <= _n[1] < 6 and _n not in _true:
                _true[_n] = _true[(_r, _c)] + 1; _q.append(_n)
assert is_admissible(lambda cell: chebyshev(cell, _goal), _true) is True, "Chebyshev distance never overestimates with diagonal moves."
assert is_admissible(lambda cell: manhattan(cell, _goal), _true) is False, "Manhattan distance overestimates when diagonal moves are allowed."
assert is_admissible(lambda cell: 0, _true) is True, "h = 0 is always admissible (it turns A* into Dijkstra)."
"SUCCESS: Match the heuristic to the moves allowed: Manhattan for 4 directions, Chebyshev for 8. An admissible heuristic keeps A* optimal."
```

Hint: Chebyshev is `max(abs(dr), abs(dc))`. For admissibility, check `h(cell) <= d` for every cell and distance in the dictionary.
:::

::: challenge A* on terrain [medium]
On a weighted grid, entering a cell costs `cost[grid[r][c]]` (as in the Dijkstra lesson). Write `astar_terrain(grid, cost, start, goal)` returning `(total_cost, cells_settled)`, using 4-direction moves and the heuristic **Manhattan distance × the cheapest cell cost**, which is admissible because every remaining move costs at least that much. Return `(None, cells_settled)` if the goal is unreachable. Cells whose cost is missing from `cost` (like `#`) are walls.

```python starter
import heapq

def astar_terrain(grid, cost, start, goal):
    return None, 0

land = ["S..ff....",
        ".f.ff.~~.",
        ".f.ff.~~.",
        ".f....~~.",
        "...fff..G"]
print(astar_terrain(land, {".": 1, "f": 5, "~": 10, "S": 1, "G": 1}, (0, 0), (4, 8)))
```

```python solution
import heapq

def astar_terrain(grid, cost, start, goal):
    cheapest = min(cost.values())
    h = lambda cell: cheapest * (abs(cell[0] - goal[0]) + abs(cell[1] - goal[1]))
    g, heap, settled = {start: 0}, [(h(start), 0, start)], set()
    while heap:
        f, d, cell = heapq.heappop(heap)
        if cell in settled:
            continue
        settled.add(cell)
        if cell == goal:
            return d, len(settled)
        r, c = cell
        for nr, nc in [(r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)]:
            if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]) and grid[nr][nc] in cost:
                nd = d + cost[grid[nr][nc]]
                if nd < g.get((nr, nc), float("inf")):
                    g[(nr, nc)] = nd
                    heapq.heappush(heap, (nd + h((nr, nc)), nd, (nr, nc)))
    return None, len(settled)

land = ["S..ff....",
        ".f.ff.~~.",
        ".f.ff.~~.",
        ".f....~~.",
        "...fff..G"]
print(astar_terrain(land, {".": 1, "f": 5, "~": 10, "S": 1, "G": 1}, (0, 0), (4, 8)))
```

```python test
import heapq as _hq, random as _random
assert "astar_terrain" in dir(), "Keep the function's name as astar_terrain."
_cost = {".": 1, "f": 5, "~": 10, "S": 1, "G": 1}
_land = ["S..ff....", ".f.ff.~~.", ".f.ff.~~.", ".f....~~.", "...fff..G"]
assert astar_terrain(_land, _cost, (0, 0), (4, 8))[0] == 16, "The cheapest route costs 16, as Dijkstra found in the Dijkstra lesson."
def _dij(_g, _c, _s, _t):
    _d, _h, _done = {_s: 0}, [(0, _s)], set()
    while _h:
        _x, _v = _hq.heappop(_h)
        if _v in _done: continue
        _done.add(_v)
        if _v == _t: return _x, len(_done)
        for _n in [(_v[0]-1,_v[1]),(_v[0]+1,_v[1]),(_v[0],_v[1]-1),(_v[0],_v[1]+1)]:
            if 0 <= _n[0] < len(_g) and 0 <= _n[1] < len(_g[0]) and _g[_n[0]][_n[1]] in _c:
                if _x + _c[_g[_n[0]][_n[1]]] < _d.get(_n, float("inf")):
                    _d[_n] = _x + _c[_g[_n[0]][_n[1]]]; _hq.heappush(_h, (_d[_n], _n))
    return None, len(_done)
_r = _random.Random(3)
_fewer = 0
for _ in range(40):
    _g = ["".join(_r.choice("....f~#") for _ in range(15)) for _ in range(10)]
    _g[0] = "." + _g[0][1:]; _g[9] = _g[9][:-1] + "."
    _c2 = {".": 2, "f": 4, "~": 9}
    _want, _dn = _dij(_g, _c2, (0, 0), (9, 14))
    _got, _an = astar_terrain(_g, _c2, (0, 0), (9, 14))
    assert _got == _want, f"Wrong cost on a random map: expected {_want}, got {_got}."
    if _want is not None:
        assert _an <= _dn, "A* with an admissible heuristic should never settle more cells than Dijkstra here."
        _fewer += _an < _dn
assert _fewer > 10, "A* should usually settle fewer cells than Dijkstra: check your heuristic is being used."
"SUCCESS: Scaling Manhattan distance by the cheapest terrain keeps the heuristic admissible on any map, so A* stays optimal while exploring less than Dijkstra."
```

Hint: Compute `cheapest = min(cost.values())` and `h(cell) = cheapest * manhattan(cell, goal)`. Push `(g + h, g, cell)`; skip settled cells; return `(g, len(settled))` when the goal is popped. Only step into cells whose character is in `cost`.
:::

::: challenge Solve the puzzle, with the moves [medium]
Extend the 8-puzzle solver: write `solve_moves(state)` returning the list of **states** from the given one to `goal_state` inclusive along a shortest solution, found with A* and the lesson's `tile_distance` heuristic and `slides` function (keep parent pointers). Return `None` for an unsolvable arrangement (half of all arrangements cannot be solved; A* then explores every reachable state and runs out).

```python starter
def solve_moves(state):
    return None

route = solve_moves((1, 2, 3, 4, 0, 6, 7, 5, 8))
print(len(route) - 1 if route else None, route)
```

```python solution
def solve_moves(state):
    parent, g = {state: None}, {state: 0}
    heap, seen = [(tile_distance(state), 0, state)], set()
    while heap:
        f, cost, s = heapq.heappop(heap)
        if s in seen:
            continue
        seen.add(s)
        if s == goal_state:
            path = []
            while s is not None:
                path.append(s)
                s = parent[s]
            return path[::-1]
        for n in slides(s):
            if cost + 1 < g.get(n, float("inf")):
                g[n], parent[n] = cost + 1, s
                heapq.heappush(heap, (cost + 1 + tile_distance(n), cost + 1, n))
    return None

route = solve_moves((1, 2, 3, 4, 0, 6, 7, 5, 8))
print(len(route) - 1 if route else None, route)
```

```python test
assert "solve_moves" in dir(), "Keep the function's name as solve_moves."
_p = solve_moves((1, 2, 3, 4, 0, 6, 7, 5, 8))
assert _p is not None and len(_p) - 1 == 2 and _p[0] == (1, 2, 3, 4, 0, 6, 7, 5, 8) and _p[-1] == goal_state, f"This position is 2 moves from solved; got {_p}."
assert solve_moves(goal_state) == [goal_state], "An already solved puzzle needs no moves."
for _a, _b in zip(_p, _p[1:]):
    assert _b in set(slides(_a)), "Each step in the route must be a single slide."
_hard = solve_moves((8, 6, 7, 2, 5, 4, 3, 0, 1))
assert _hard is not None and len(_hard) - 1 == 31, "The hardest arrangement needs 31 moves."
for _a, _b in zip(_hard, _hard[1:]):
    assert _b in set(slides(_a)), "Each step in the route must be a single slide."
assert solve_moves((2, 1, 3, 4, 5, 6, 7, 8, 0)) is None, "Swapping two tiles makes the puzzle unsolvable: return None."
"SUCCESS: Parent pointers turn A*'s answer into a sequence of slides: the hardest 8-puzzle, solved optimally in 31 moves."
```

Hint: Exactly `solve_astar` with a `parent` dictionary: record `parent[n] = s` whenever you improve `g[n]`. When the goal is popped, follow parents back and reverse. If the heap empties, return `None`.
:::

## What you learned

- A* orders its search by f = g + h: the distance so far plus a heuristic estimate of the distance remaining. With h = 0 it is Dijkstra.
- An admissible heuristic never overestimates, which guarantees an optimal path; the closer it is to the truth, the less A* explores. Good heuristics come from relaxing the problem (ignoring walls, allowing diagonal moves or flight).
- Overestimating heuristics, weighted A* and greedy best-first search explore less but can return longer routes.
- A* works on any graph with a heuristic, including the implicit state graphs of puzzles like the 8-puzzle.

That completes graphs. The next part of the series turns to problem-solving techniques, starting with two pointers.
