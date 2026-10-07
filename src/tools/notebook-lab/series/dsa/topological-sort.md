# Topological sort

Getting dressed: socks before shoes, trousers before shoes, shirt before tie. Building software: each module after the modules it imports. A university degree: each course after its prerequisites. A spreadsheet: each cell after the cells its formula refers to. All of these are a set of tasks with "must come before" rules, which form a directed graph: an edge u → v means u must happen before v. A **topological order** lists every task so that every edge points forwards: each task comes after everything it depends on.

Such an order exists exactly when the graph has **no directed cycle** (a cycle would mean a task that must come before itself). A directed graph without cycles is called a **DAG**, a directed acyclic graph. This lesson covers:

- **Kahn's algorithm**: repeatedly take a task with no remaining prerequisites;
- the **DFS** method: reverse the order in which depth-first search finishes vertices;
- detecting that no order exists, and why orders are usually not unique;
- the **critical path**: the longest chain of dependencies, which decides how long a whole project takes.

## Kahn's algorithm

A task with no prerequisites, an in-degree of 0, can safely go first. Once it is done, remove it: the tasks that depended on it each have one fewer prerequisite, and some may now have none. So: compute every in-degree; put all vertices with in-degree 0 in a queue; repeatedly take one out, add it to the order, and reduce the in-degree of each of its successors, queueing any that reach 0. Each vertex and edge is handled once: O(V + E). Predict before running: what order does it give for getting dressed, and what must come first?

```python type
from collections import deque

dressing = {
    "underwear": ["trousers", "shoes"],
    "socks": ["shoes"],
    "trousers": ["belt", "shoes"],
    "shirt": ["belt", "tie"],
    "tie": ["jacket"],
    "belt": ["jacket"],
    "shoes": [],
    "jacket": [],
    "watch": [],
}

def kahn(graph):
    in_degree = {v: 0 for v in graph}
    for v in graph:
        for w in graph[v]:
            in_degree[w] += 1
    ready = deque(v for v in graph if in_degree[v] == 0)
    order = []
    while ready:
        v = ready.popleft()
        order.append(v)
        for w in graph[v]:
            in_degree[w] -= 1
            if in_degree[w] == 0:
                ready.append(w)
    if len(order) < len(graph):
        return None
    return order

order = kahn(dressing)
print(order)
position = {item: i for i, item in enumerate(order)}
print("every rule respected:", all(position[u] < position[v] for u in dressing for v in dressing[u]))
```

```output
['underwear', 'socks', 'shirt', 'watch', 'trousers', 'tie', 'belt', 'shoes', 'jacket']
every rule respected: True
```

The check at the end confirms the definition directly: for every edge u → v, u appears before v.

Underwear, socks, shirt and watch have no prerequisites and start the order; shoes wait until underwear, socks and trousers are done, and the jacket until the belt and tie. If the graph had a cycle, the vertices on it would never reach in-degree 0, so the order would come out **shorter** than the number of vertices: that is how Kahn's algorithm reports that no order exists, returning `None` here.

## The DFS method

The previous lesson noticed that depth-first search **finishes** each vertex only after everything reachable from it has finished. So in the finishing order, every vertex comes **after** all of its successors; reverse that order, and every vertex comes **before** them. That is a topological order. Predict before running: will the DFS method give the same order as Kahn's algorithm?

```python type
def dfs_topological(graph):
    WHITE, GREY, BLACK = 0, 1, 2
    colour = {v: WHITE for v in graph}
    finished = []

    def visit(v):
        colour[v] = GREY
        for w in graph[v]:
            if colour[w] == GREY:
                raise ValueError(f"cycle through {w}")
            if colour[w] == WHITE:
                visit(w)
        colour[v] = BLACK
        finished.append(v)

    for v in graph:
        if colour[v] == WHITE:
            visit(v)
    return finished[::-1]

dfs_order = dfs_topological(dressing)
print(dfs_order)
position = {item: i for i, item in enumerate(dfs_order)}
print("every rule respected:", all(position[u] < position[v] for u in dressing for v in dressing[u]))
try:
    dfs_topological({"a": ["b"], "b": ["c"], "c": ["a"]})
except ValueError as error:
    print("ValueError:", error)
```

```output
['watch', 'shirt', 'tie', 'socks', 'underwear', 'trousers', 'shoes', 'belt', 'jacket']
every rule respected: True
ValueError: cycle through a
```

The grey check from the three-colour cycle detection is kept, so a cycle raises an error instead of producing a bogus order.

Both orders are valid, but they are different. Topological orders are usually **not unique**: whether the watch goes on first or last does not matter, since nothing depends on it. An order is unique only when every pair of consecutive tasks is joined by an edge, so that there is no freedom at all. Kahn's algorithm makes it easy to choose among valid orders (for example, always the alphabetically first ready task, using a heap instead of a queue: the second challenge). The DFS method is shorter to write, but recursive, so very long dependency chains need an explicit stack.

## The critical path

If each task takes some time, and independent tasks can happen at the same time (several builders, several processor cores), how long does the whole project take? Not the total of all durations: tasks with no dependency between them run in parallel. The project takes as long as its **longest chain** of dependent tasks, the **critical path**. Any delay on that chain delays everything; tasks off it have some slack.

Computing it uses a topological order: process the tasks in that order, and give each task an **earliest finish time** equal to its own duration plus the latest finish time among its prerequisites. Since every prerequisite comes earlier in the order, its finish time is already known when needed. Predict before running: for the house-building plan below, how long does the project take, and which tasks are on the critical path?

```python type
durations = {"foundations": 5, "frame": 10, "roof": 6, "plumbing": 4, "wiring": 5,
             "walls": 7, "windows": 3, "painting": 4, "garden": 6}
needs = {
    "foundations": [],
    "frame": ["foundations"],
    "roof": ["frame"],
    "plumbing": ["frame"],
    "wiring": ["frame"],
    "walls": ["plumbing", "wiring"],
    "windows": ["frame"],
    "painting": ["walls", "roof", "windows"],
    "garden": ["foundations"],
}

successors = {task: [] for task in needs}
for task, prerequisites in needs.items():
    for p in prerequisites:
        successors[p].append(task)

finish, came_from = {}, {}
for task in kahn(successors):
    start = max((finish[p] for p in needs[task]), default=0)
    came_from[task] = max(needs[task], key=lambda p: finish[p], default=None)
    finish[task] = start + durations[task]

last = max(finish, key=finish.get)
path = []
while last is not None:
    path.append(last)
    last = came_from[last]
print("project length:", max(finish.values()), "days (total of all durations:", sum(durations.values()), ")")
print("critical path:", " -> ".join(reversed(path)))
```

```output
project length: 31 days (total of all durations: 50 )
critical path: foundations -> frame -> wiring -> walls -> painting
```

The plan is given as "needs" lists, the natural way to write prerequisites, so it is first turned round into "successors" lists for Kahn's algorithm. `came_from` remembers, for each task, the prerequisite that finished last, which is the one that held it up.

The house takes 31 days, though the durations total 50: the garden, for instance, can be done any time after the foundations. The critical path is foundations, frame, wiring, walls, painting. Shortening the garden or the windows would not finish the house sooner; shortening the wiring would. Project-planning software computes exactly this, and the same "longest path in a DAG" calculation, impossible to do efficiently in graphs with cycles, is easy here because the topological order lets each task be settled once.

::: challenge Check an order [easy]
Write `is_topological(graph, order)` returning `True` if `order` is a valid topological order of the directed graph `graph` (a dictionary from each vertex to the list of vertices it must come before): it must contain every vertex exactly once, and for every edge u → v, u must come before v.

```python starter
def is_topological(graph, order):
    return True

print(is_topological(dressing, kahn(dressing)), is_topological(dressing, ["shoes"] + [v for v in kahn(dressing) if v != "shoes"]))
```

```python solution
def is_topological(graph, order):
    if len(order) != len(graph) or set(order) != set(graph):
        return False
    position = {v: i for i, v in enumerate(order)}
    return all(position[u] < position[v] for u in graph for v in graph[u])

print(is_topological(dressing, kahn(dressing)), is_topological(dressing, ["shoes"] + [v for v in kahn(dressing) if v != "shoes"]))
```

```python test
assert "is_topological" in dir(), "Keep the function's name as is_topological."
_g = {"a": ["b", "c"], "b": ["d"], "c": ["d"], "d": []}
assert is_topological(_g, ["a", "b", "c", "d"]) and is_topological(_g, ["a", "c", "b", "d"]), "Both orders respect every edge."
assert not is_topological(_g, ["b", "a", "c", "d"]), "b before a breaks the edge a → b."
assert not is_topological(_g, ["a", "b", "c"]), "Every vertex must appear."
assert not is_topological(_g, ["a", "b", "c", "e"]), "e is not a vertex of the graph, and d is missing."
assert not is_topological(_g, ["a", "b", "b", "c", "d"]) and not is_topological(_g, ["a", "b", "c", "d", "e"]), "Each vertex exactly once, and no extra ones."
assert is_topological({}, []) is True, "The empty graph has the empty order."
assert is_topological(dressing, kahn(dressing)) and is_topological(dressing, dfs_topological(dressing)), "Both lesson orders are valid."
"SUCCESS: Checking an order is O(V + E): a position for each vertex, then one comparison per edge."
```

Hint: First check the order has the right length and the same set of vertices as the graph. Then build `position[v]` and check `position[u] < position[v]` for every edge.
:::

::: challenge The alphabetically first order [medium]
When several tasks are ready, a build tool may choose the alphabetically first, so that its output is predictable. Write `first_order(graph)` returning the topological order that, at every step, takes the **alphabetically smallest** ready vertex, or `None` if the graph has a cycle. Use Kahn's algorithm with a heap (`heapq`) instead of a queue.

```python starter
import heapq

def first_order(graph):
    return []

print(first_order(dressing))
```

```python solution
import heapq

def first_order(graph):
    in_degree = {v: 0 for v in graph}
    for v in graph:
        for w in graph[v]:
            in_degree[w] += 1
    ready = [v for v in graph if in_degree[v] == 0]
    heapq.heapify(ready)
    order = []
    while ready:
        v = heapq.heappop(ready)
        order.append(v)
        for w in graph[v]:
            in_degree[w] -= 1
            if in_degree[w] == 0:
                heapq.heappush(ready, w)
    return order if len(order) == len(graph) else None

print(first_order(dressing))
```

```python test
import itertools as _it, random as _random
assert "first_order" in dir(), "Keep the function's name as first_order."
assert first_order(dressing) == ["shirt", "socks", "tie", "underwear", "trousers", "belt", "jacket", "shoes", "watch"], f"Got {first_order(dressing)}."
assert first_order({"b": [], "a": [], "c": []}) == ["a", "b", "c"], "With no edges, the order is alphabetical."
assert first_order({"x": ["y"], "y": ["x"]}) is None, "A cycle means no order: return None."
_r = _random.Random(1)
for _ in range(100):
    _vs = list("abcdef")[:_r.randint(1, 6)]
    _g = {v: [] for v in _vs}
    for _ in range(_r.randint(0, 7)):
        _u, _w = sorted(_r.sample(_vs, 2)) if len(_vs) > 1 else (None, None)
        if _u and _w not in _g[_u]:
            if _r.random() < 0.5: _u, _w = _w, _u
            if _u not in _g[_w]:
                _g[_u].append(_w)
    _valid = [list(p) for p in _it.permutations(_vs) if all(p.index(u) < p.index(v) for u in _g for v in _g[u])]
    _res = first_order(_g)
    if not _valid:
        assert _res is None, f"The graph {_g} has a cycle: return None."
    else:
        assert _res in _valid and _res == min(_valid), f"For {_g} the expected order is {min(_valid)}, got {_res}."
"SUCCESS: A heap of ready tasks makes Kahn's algorithm choose the smallest at each step: O((V + E) log V), and a deterministic order every time."
```

Hint: Compute in-degrees, `heapify` the list of vertices with in-degree 0, and replace `popleft`/`append` with `heappop`/`heappush`. If fewer than all vertices come out, there was a cycle.
:::

::: challenge Slack [medium]
Tasks off the critical path have **slack**: how many days they could be delayed without delaying the project. A task's **latest finish** is the project length if nothing depends on it, and otherwise the smallest (latest finish − duration) among the tasks that need it; its slack is latest finish minus earliest finish. Write `slack(durations, needs)` returning a dictionary of every task's slack, computing earliest finishes in topological order (as in the lesson) and latest finishes in **reverse** topological order. Tasks on the critical path have slack 0.

```python starter
def slack(durations, needs):
    return {}

print(slack(durations, needs))
```

```python solution
def slack(durations, needs):
    successors = {t: [] for t in needs}
    for t, prerequisites in needs.items():
        for p in prerequisites:
            successors[p].append(t)
    order = kahn(successors)
    earliest = {}
    for t in order:
        earliest[t] = max((earliest[p] for p in needs[t]), default=0) + durations[t]
    project = max(earliest.values())
    latest = {}
    for t in reversed(order):
        latest[t] = min((latest[s] - durations[s] for s in successors[t]), default=project)
    return {t: latest[t] - earliest[t] for t in needs}

print(slack(durations, needs))
```

```python test
assert "slack" in dir(), "Keep the function's name as slack."
_s = slack(durations, needs)
assert _s == {"foundations": 0, "frame": 0, "roof": 6, "plumbing": 1, "wiring": 0, "walls": 0, "windows": 9, "painting": 0, "garden": 20}, f"Got {_s}."
_d = {"a": 3, "b": 2, "c": 4}
_n = {"a": [], "b": ["a"], "c": ["a"]}
assert slack(_d, _n) == {"a": 0, "b": 2, "c": 0}, "a then (b or c): c is critical, b can slip 2 days."
assert slack({"only": 5}, {"only": []}) == {"only": 0}, "A single task is critical."
_d2 = {"x": 1, "y": 1}
assert slack(_d2, {"x": [], "y": []}) == {"x": 0, "y": 0}, "Two independent equal tasks are both critical."
"SUCCESS: Forward pass for earliest finishes, backward pass for latest finishes: the difference shows exactly where a project has room to slip."
```

Hint: Build `successors` and a topological order with `kahn`. Forward: earliest finish as in the lesson. Backward (over the reversed order): latest finish is the project length if a task has no successors, otherwise `min(latest[s] - durations[s])` over its successors.
:::

## What you learned

- A topological order lists a directed graph's vertices so that every edge points forwards; one exists exactly when the graph is a DAG (no directed cycle).
- Kahn's algorithm repeatedly removes a vertex of in-degree 0, in O(V + E); if some vertices never reach in-degree 0, there is a cycle. A heap instead of a queue picks the smallest ready vertex each time.
- Reversing DFS's finishing order also gives a topological order. Orders are usually not unique.
- In a topological order, longest-path calculations become easy: the critical path decides a project's length, and slack shows which tasks can slip.

The next lesson finds shortest paths when edges have different lengths: Dijkstra's algorithm.
