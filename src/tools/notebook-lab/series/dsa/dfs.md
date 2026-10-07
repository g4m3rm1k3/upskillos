# Depth-first search

Breadth-first search explores in rings, staying close to home. **Depth-first search** (DFS) does the opposite: it follows one path as far as it can go, and only when it reaches a dead end does it back up to the most recent junction with an unexplored branch. It is how you would explore a maze with a ball of string. DFS does not find shortest paths, but it is the right tool for a different family of questions about a graph's **structure**: which parts are connected, whether there is a cycle, whether the graph can be split into two sides, and (in the next lesson) in what order dependencies can be done.

Where BFS uses a queue, DFS uses a stack, either the call stack (recursion) or an explicit one. This lesson covers:

- DFS written recursively and with an explicit stack, both O(V + E);
- counting **connected components**, and flood fill on grids;
- detecting **cycles**, in undirected graphs and, with three colours, in directed ones;
- the order in which DFS **finishes** vertices, which the next lesson builds on.

## Recursive and iterative DFS

Recursively, DFS is very short: mark the vertex visited, then for each unvisited neighbour, run DFS from it. The call stack remembers where to come back to. Predict before running: in what order does DFS from A visit the vertices of the graph below, and how does that differ from BFS?

```python type
from collections import deque

graph = {
    "A": ["B", "C"],
    "B": ["D", "E"],
    "C": ["F"],
    "D": [],
    "E": ["F"],
    "F": [],
}

def dfs_recursive(graph, vertex, visited=None, order=None):
    if visited is None:
        visited, order = set(), []
    visited.add(vertex)
    order.append(vertex)
    for neighbour in graph[vertex]:
        if neighbour not in visited:
            dfs_recursive(graph, neighbour, visited, order)
    return order

def dfs_iterative(graph, start):
    visited, order = set(), []
    stack = [start]
    while stack:
        vertex = stack.pop()
        if vertex in visited:
            continue
        visited.add(vertex)
        order.append(vertex)
        for neighbour in reversed(graph[vertex]):
            if neighbour not in visited:
                stack.append(neighbour)
    return order

def bfs_order(graph, start):
    seen, order, queue = {start}, [], deque([start])
    while queue:
        v = queue.popleft()
        order.append(v)
        for n in graph[v]:
            if n not in seen:
                seen.add(n)
                queue.append(n)
    return order

print("DFS, recursive:", dfs_recursive(graph, "A"))
print("DFS, iterative:", dfs_iterative(graph, "A"))
print("BFS:           ", bfs_order(graph, "A"))
```

```output
DFS, recursive: ['A', 'B', 'D', 'E', 'F', 'C']
DFS, iterative: ['A', 'B', 'D', 'E', 'F', 'C']
BFS:            ['A', 'B', 'C', 'D', 'E', 'F']
```

The iterative version pushes neighbours in **reverse** so that the first neighbour is popped first, matching the recursive order. Unlike BFS, it marks a vertex visited when it is **popped**, since a vertex may be pushed several times before its turn; the `if vertex in visited: continue` skips the extra copies.

DFS goes A, B, D (dead end), back to B, then E, F, and finally C, whose only neighbour F is already visited. BFS visits A, B, C before going deeper. Both visit every reachable vertex once and look at every edge once: O(V + E). The recursive version is the clearest, but on a graph with long paths it can exceed Python's recursion limit of about 1,000; the iterative version has no such limit.

## Connected components

An undirected graph may fall into separate pieces, its **connected components**: within a component every vertex can reach every other, and there are no edges between components. To find them all, loop over the vertices; each time you meet one not yet visited, it starts a new component, and a DFS from it marks everything in that component. Every vertex and edge is still handled once: O(V + E). Predict before running: how many components does this friendship network have?

```python type
people = {
    "Ann": ["Ben"], "Ben": ["Ann", "Cara"], "Cara": ["Ben"],
    "Dev": ["Eli"], "Eli": ["Dev"],
    "Fay": [],
    "Gus": ["Hal", "Ivy"], "Hal": ["Gus", "Ivy"], "Ivy": ["Gus", "Hal"],
}

def components(graph):
    visited, groups = set(), []
    for start in graph:
        if start in visited:
            continue
        group, stack = [], [start]
        visited.add(start)
        while stack:
            v = stack.pop()
            group.append(v)
            for n in graph[v]:
                if n not in visited:
                    visited.add(n)
                    stack.append(n)
        groups.append(sorted(group))
    return groups

for i, group in enumerate(components(people), start=1):
    print(f"component {i}: {group}")
```

```output
component 1: ['Ann', 'Ben', 'Cara']
component 2: ['Dev', 'Eli']
component 3: ['Fay']
component 4: ['Gus', 'Hal', 'Ivy']
```

This version marks vertices when they are pushed, which is fine here because only membership matters, not the exact DFS order.

There are four components, including Fay alone. Component counting answers questions like "is this network connected?", "how many separate islands are on this map?" (the first challenge) and "which pixels belong to the same region?", which is the **flood fill** behind a paint program's bucket tool.

## Cycles in undirected graphs

A cycle is a path that returns to where it started. In an undirected graph, DFS finds one when it meets an already-visited vertex that is **not** the vertex it just came from (the parent: every undirected edge leads straight back to it, and that is not a cycle). Detecting cycles answers "is this network a tree?", since a connected graph with no cycles is a tree. Predict before running: which of the two graphs has a cycle?

```python type
def has_cycle_undirected(graph):
    visited = set()
    for start in graph:
        if start in visited:
            continue
        visited.add(start)
        stack = [(start, None)]
        while stack:
            v, parent = stack.pop()
            for n in graph[v]:
                if n == parent:
                    continue
                if n in visited:
                    return True
                visited.add(n)
                stack.append((n, v))
    return False

tree_like = {1: [2, 3], 2: [1, 4], 3: [1], 4: [2]}
with_loop = {1: [2, 3], 2: [1, 4], 3: [1, 4], 4: [2, 3]}
print("tree_like has a cycle:", has_cycle_undirected(tree_like))
print("with_loop has a cycle:", has_cycle_undirected(with_loop))
```

```output
tree_like has a cycle: False
with_loop has a cycle: True
```

Each stack entry carries the vertex it was reached from, so the edge back to the parent can be skipped. (This simple version assumes no two edges join the same pair of vertices.)

The first graph is a tree; the second has the loop 1–2–4–3–1, found when the search, having come 1 → 3 → 4, sees 4's neighbour 2, already visited and not 4's parent.

## Cycles in directed graphs: three colours

In a directed graph, meeting a visited vertex is not enough evidence: in A → B, A → C, C → B, the search reaches B twice, but there is no cycle, since you cannot get from B back to A. A cycle exists exactly when DFS finds an edge to a vertex that is **still on the current path**: an ancestor whose exploration has not finished. So DFS tracks three states:

- **white**: not yet visited;
- **grey**: visited, and still being explored (on the current path);
- **black**: finished, with everything reachable from it explored.

An edge to a grey vertex closes a cycle; an edge to a black one does not. Cycle detection in directed graphs is exactly the check that a set of dependencies is possible: a course that is, through a chain, its own prerequisite can never be taken. Predict before running: which of the two dependency graphs contains a cycle, and what does the finishing order look like?

```python type
WHITE, GREY, BLACK = 0, 1, 2

def find_cycle_directed(graph):
    colour = {v: WHITE for v in graph}
    finished = []

    def visit(v):
        colour[v] = GREY
        for n in graph[v]:
            if colour[n] == GREY:
                return True
            if colour[n] == WHITE and visit(n):
                return True
        colour[v] = BLACK
        finished.append(v)
        return False

    for v in graph:
        if colour[v] == WHITE and visit(v):
            return True, finished
    return False, finished

ok = {"shop": ["cook"], "cook": ["eat"], "eat": ["wash up"], "wash up": [], "invite": ["cook"]}
loop = {"a": ["b"], "b": ["c"], "c": ["a"], "d": ["a"]}
print("ok:  ", find_cycle_directed(ok))
print("loop:", find_cycle_directed(loop))
```

```output
ok:   (False, ['wash up', 'eat', 'cook', 'shop', 'invite'])
loop: (True, [])
```

`visit` is a function defined inside another function, so it can use `colour` and `finished` directly; it returns True as soon as a cycle is found, which passes straight back up through the recursive calls.

The dinner plan has no cycle, and its finishing order is wash up, eat, cook, shop, invite: every task finishes **after** all the tasks that depend on it. Reversed, that is an order in which every task comes before the tasks that need it. That observation is the whole of the next lesson's topological sort. The second graph has the cycle a → b → c → a, found when c's edge reaches a, which is still grey.

::: challenge Count the islands [easy]
A map is a list of strings: `#` is land and `.` is water. Land cells that touch up, down, left or right belong to the same island. Write `count_islands(grid)` returning the number of islands, using an **iterative** DFS (an explicit stack) to flood each new island (an empty list is an empty map with 0 islands), so that large islands cannot hit the recursion limit.

```python starter
def count_islands(grid):
    return 0

world = ["##...#",
         "#..###",
         "...#..",
         "##....",
         "##..##"]
print(count_islands(world))
```

```python solution
def count_islands(grid):
    rows, cols = len(grid), len(grid[0]) if grid else 0
    seen = set()
    islands = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "#" or (r, c) in seen:
                continue
            islands += 1
            seen.add((r, c))
            stack = [(r, c)]
            while stack:
                cr, cc = stack.pop()
                for nr, nc in [(cr - 1, cc), (cr + 1, cc), (cr, cc - 1), (cr, cc + 1)]:
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "#" and (nr, nc) not in seen:
                        seen.add((nr, nc))
                        stack.append((nr, nc))
    return islands

world = ["##...#",
         "#..###",
         "...#..",
         "##....",
         "##..##"]
print(count_islands(world))
```

```python test
import random as _random
assert "count_islands" in dir(), "Keep the function's name as count_islands."
assert count_islands(["##...#", "#..###", "...#..", "##....", "##..##"]) == 4, f"The example map has 4 islands; got {count_islands(['##...#', '#..###', '...#..', '##....', '##..##'])}."
assert count_islands(["...", "..."]) == 0 and count_islands(["#"]) == 1 and count_islands([]) == 0, "No land, one cell of land, and an empty map."
assert count_islands(["#.#", ".#.", "#.#"]) == 5, "Diagonal neighbours do not join islands."
try:
    _one = count_islands(["#" * 80] * 80)
except RecursionError:
    raise AssertionError("Recursion hit Python's limit of about 1,000 on a 6,400-cell island: use an explicit stack.")
assert _one == 1, "A single 80 × 80 island is one island."
_r = _random.Random(3)
for _ in range(100):
    _g = ["".join(_r.choice("#..") for _ in range(8)) for _ in range(6)]
    _adj = {}
    for _y in range(6):
        for _x in range(8):
            if _g[_y][_x] == "#":
                _adj[(_y, _x)] = [(_y + dy, _x + dx) for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)] if 0 <= _y + dy < 6 and 0 <= _x + dx < 8 and _g[_y + dy][_x + dx] == "#"]
    assert count_islands(_g) == len(components(_adj)), f"Wrong count for {_g}."
"SUCCESS: One flood per island: counting components on an implicit grid graph, in O(rows × columns)."
```

Hint: Scan every cell. When you find land not yet seen, add one to the count, then flood it: push it on a stack, and while the stack is not empty, pop a cell and push its unseen land neighbours (checking bounds), marking them seen as you push.
:::

::: challenge Can the courses be completed? [medium]
Write `can_finish(courses, prerequisites)` where `courses` is a list of course names and `prerequisites` a list of pairs `(a, b)` meaning "a must be taken before b". Return `True` if there is some order in which every course can be taken, which is exactly when the directed graph a → b has **no cycle**. Build the adjacency lists and use the lesson's three-colour idea; write it **iteratively** (with an explicit stack of `(vertex, iterator over its neighbours)` pairs), so long chains of prerequisites cannot hit the recursion limit.

```python starter
def can_finish(courses, prerequisites):
    return True

print(can_finish(["a", "b", "c"], [("a", "b"), ("b", "c")]), can_finish(["a", "b", "c"], [("a", "b"), ("b", "c"), ("c", "a")]))
```

```python solution
def can_finish(courses, prerequisites):
    graph = {c: [] for c in courses}
    for a, b in prerequisites:
        graph[a].append(b)
    colour = {c: 0 for c in courses}
    for start in courses:
        if colour[start] != 0:
            continue
        colour[start] = 1
        stack = [(start, iter(graph[start]))]
        while stack:
            v, neighbours = stack[-1]
            advanced = False
            for n in neighbours:
                if colour[n] == 1:
                    return False
                if colour[n] == 0:
                    colour[n] = 1
                    stack.append((n, iter(graph[n])))
                    advanced = True
                    break
            if not advanced:
                colour[v] = 2
                stack.pop()
    return True

print(can_finish(["a", "b", "c"], [("a", "b"), ("b", "c")]), can_finish(["a", "b", "c"], [("a", "b"), ("b", "c"), ("c", "a")]))
```

```python test
import random as _random
assert "can_finish" in dir(), "Keep the function's name as can_finish."
assert can_finish(["a", "b", "c"], [("a", "b"), ("b", "c")]) is True, "A chain a → b → c can be completed."
assert can_finish(["a", "b", "c"], [("a", "b"), ("b", "c"), ("c", "a")]) is False, "a → b → c → a is a cycle."
assert can_finish(["a", "b", "c"], [("a", "b"), ("a", "c"), ("c", "b")]) is True, "Reaching b twice by different routes is not a cycle."
assert can_finish(["x"], [("x", "x")]) is False, "A course that is its own prerequisite can never be taken."
assert can_finish([], []) is True and can_finish(["solo"], []) is True, "No courses, or no prerequisites, is always fine."
_chain = [f"c{i}" for i in range(3000)]
try:
    _ok_chain = can_finish(_chain, list(zip(_chain, _chain[1:])))
except RecursionError:
    raise AssertionError("Recursion hit Python's limit on a chain of 3,000 courses: use an explicit stack of (vertex, iterator) pairs.")
assert _ok_chain is True, "A chain of 3,000 courses can be completed."
assert can_finish(_chain, list(zip(_chain, _chain[1:])) + [("c2999", "c0")]) is False, "Closing that chain into a loop makes it impossible."
_r = _random.Random(5)
for _ in range(200):
    _n = _r.randint(1, 7); _cs = list(range(_n))
    _ps = [(_r.randrange(_n), _r.randrange(_n)) for _ in range(_r.randint(0, 9))]
    _g = {c: [b for a, b in _ps if a == c] for c in _cs}
    assert can_finish(_cs, _ps) == (not find_cycle_directed(_g)[0]), f"Wrong answer for prerequisites {_ps}."
"SUCCESS: A course plan is possible exactly when its dependency graph has no cycle; three colours tell a real cycle from two routes meeting."
```

Hint: Keep a stack of `(vertex, iterator)` pairs. Look at the top pair and take the next neighbour from its iterator: a grey neighbour means a cycle; a white one is coloured grey and pushed; if the iterator is used up, colour the vertex black and pop it.
:::

::: challenge Two teams [medium]
A graph is **bipartite** if its vertices can be split into two groups so that every edge joins the two groups: for example, people who must be in opposite teams because they argue. Write `two_teams(graph)` for an undirected graph that returns a dictionary from each vertex to `0` or `1` such that every edge joins different values, or `None` if that is impossible. Colour each component with DFS: give its first vertex 0 and each newly reached neighbour the opposite of its discoverer; an edge between two vertices of the same colour proves it impossible.

```python starter
def two_teams(graph):
    return None

rivals = {"Ann": ["Ben", "Dev"], "Ben": ["Ann", "Cara"], "Cara": ["Ben", "Dev"], "Dev": ["Ann", "Cara"], "Eli": []}
print(two_teams(rivals))
```

```python solution
def two_teams(graph):
    team = {}
    for start in graph:
        if start in team:
            continue
        team[start] = 0
        stack = [start]
        while stack:
            v = stack.pop()
            for n in graph[v]:
                if n not in team:
                    team[n] = 1 - team[v]
                    stack.append(n)
                elif team[n] == team[v]:
                    return None
    return team

rivals = {"Ann": ["Ben", "Dev"], "Ben": ["Ann", "Cara"], "Cara": ["Ben", "Dev"], "Dev": ["Ann", "Cara"], "Eli": []}
print(two_teams(rivals))
```

```python test
import itertools as _it, random as _random
assert "two_teams" in dir(), "Keep the function's name as two_teams."
def _valid(_g, _t):
    return _t is not None and set(_t) == set(_g) and all(_t[v] in (0, 1) for v in _g) and all(_t[u] != _t[v] for u in _g for v in _g[u])
_rv = {"Ann": ["Ben", "Dev"], "Ben": ["Ann", "Cara"], "Cara": ["Ben", "Dev"], "Dev": ["Ann", "Cara"], "Eli": []}
assert _valid(_rv, two_teams(_rv)), "A four-person ring plus a loner can be split into two teams."
_tri = {1: [2, 3], 2: [1, 3], 3: [1, 2]}
assert two_teams(_tri) is None, "A triangle cannot be split: one edge must join the same team."
assert two_teams({}) == {}, "An empty graph splits trivially."
_r = _random.Random(7)
for _ in range(200):
    _n = _r.randint(1, 7); _g = {i: set() for i in range(_n)}
    for _ in range(_r.randint(0, 9)):
        _u, _v = _r.randrange(_n), _r.randrange(_n)
        if _u != _v:
            _g[_u].add(_v); _g[_v].add(_u)
    _possible = any(all(_bits[u] != _bits[v] for u in _g for v in _g[u]) for _bits in _it.product((0, 1), repeat=_n))
    _res = two_teams(_g)
    assert (_res is not None) == _possible, f"For edges {[(u, v) for u in _g for v in _g[u] if u < v]} a split is {'possible' if _possible else 'impossible'}."
    if _res is not None:
        assert _valid(_g, _res), "Your teams put two connected people in the same team."
"SUCCESS: A graph splits into two sides exactly when it has no odd-length cycle; colouring as you search finds the split or the clash in O(V + E)."
```

Hint: Loop over the vertices; for each one without a team, give it team 0 and run a stack-based DFS. A neighbour without a team gets `1 - team[v]`; a neighbour already in the **same** team as v means return `None`.
:::

## What you learned

- DFS follows one path as deep as possible, then backs up; recursively it is a few lines, and with an explicit stack it avoids the recursion limit. Both are O(V + E).
- Looping over vertices and starting a DFS at each unvisited one finds connected components; flood fill is the same on a grid.
- In an undirected graph, reaching a visited vertex other than the parent means a cycle. In a directed graph, only an edge to a grey vertex (still on the current path) does: three colours tell them apart.
- DFS finishes each vertex after everything reachable from it, an order the next lesson turns into a topological sort.

The next lesson orders tasks so that every task comes after everything it depends on: topological sort.
