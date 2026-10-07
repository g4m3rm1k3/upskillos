# Graphs and networks

A factory's conveyor system, a city's delivery routes, a building's ventilation ducts, the electrical connections of a circuit board: each is a set of places joined by links. Strip away the distances and shapes and what remains is a **graph**: points (vertices) and connections (edges). Graph theory asks questions that geometry cannot: is every station reachable from every other? How many different routes are there? Can a maintenance engineer walk every conveyor exactly once without retracing? Remarkably, many of the answers come from simple counting and from linear algebra: the powers and eigenvalues of a matrix describe the whole network. The DSA series built graph algorithms such as breadth-first search and shortest paths. This lesson studies the mathematics underneath them.

This lesson covers:

- graphs, degrees, and the handshake lemma;
- the adjacency matrix, and counting walks with matrix powers;
- connectivity, and components from the Laplacian's eigenvalues;
- Euler trails: when a route can use every link exactly once;
- trees: the fewest links that keep a network connected.

## Vertices, edges and degrees

::: math
\[ \sum_{v \in V} \deg(v) = 2\,|E| \]
- $V$: the vertices; $E$: the edges; $\deg(v)$: edges meeting $v$
- every edge has two ends, so the number of odd-degree vertices is even
In code: `deg[a] += 1` and `deg[b] += 1` for each conveyor `(a, b)`
:::


A **graph** has a set of vertices and a set of edges, each edge joining two vertices. In an undirected graph an edge can be travelled either way, like a two-way conveyor or a cable. The **degree** of a vertex is the number of edges meeting it. Because each edge has two ends, adding up all the degrees counts every edge exactly twice:

\[ \sum_v \deg(v) = 2|E| \]

the **handshake lemma**. A consequence: the number of vertices with odd degree is always even. Predict before running: a packing hall has 7 stations joined by 8 conveyors. How many stations have an odd number of conveyors?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

stations = ["In", "Sort", "Wash", "Dry", "Pack", "QC", "Out"]
conveyors = [(0, 1), (1, 2), (1, 4), (2, 3), (3, 4), (5, 6), (3, 5), (1, 3)]
n = len(stations)
deg = [0] * n
for a, b in conveyors:
    deg[a] += 1
    deg[b] += 1
for name, d in zip(stations, deg):
    print(f"{name:<5} degree {d}")
print("sum of degrees", sum(deg), "= 2 ×", len(conveyors), "edges")
print("odd-degree stations:", [stations[i] for i in range(n) if deg[i] % 2])
```

```output
In    degree 1
Sort  degree 4
Wash  degree 2
Dry   degree 4
Pack  degree 2
QC    degree 2
Out   degree 1
sum of degrees 16 = 2 × 8 edges
odd-degree stations: ['In', 'Out']
```

Each conveyor adds 1 to the degree of both its ends.

The degrees sum to 16, twice the 8 conveyors, as the lemma demands. Two stations, In and Out, have odd degree (1 each), and every other station has even degree. That pattern decides, later in this lesson, whether an inspection walk can cover every conveyor exactly once.

## The adjacency matrix and counting walks

::: math
\[ A_{ij} = \begin{cases} 1 & i, j \text{ joined} \\ 0 & \text{otherwise} \end{cases}, \qquad (A^2)_{ij} = \sum_k A_{ik} A_{kj}, \qquad (A^k)_{ij} = \#\text{walks of length } k \]
- row sums of $A$ are the degrees
- each term $A_{ik}A_{kj}$ is 1 exactly when $i \to k \to j$ is a walk
In code: `np.linalg.matrix_power(A, 3)[1, 4]`
:::


A graph on n vertices is captured completely by its **adjacency matrix** A: an n × n matrix with A_ij = 1 if vertices i and j are joined, 0 otherwise. For an undirected graph it is symmetric, and each row sum is that vertex's degree.

Matrix multiplication then does something remarkable. The entry (A²)_ij = Σ_k A_ik A_kj counts the vertices k adjacent to both i and j, that is, the walks of length 2 from i to j. By the same argument, (Aᵏ)_ij counts the **walks** of length k (routes along k edges, allowed to revisit). Predict before running: how many 3-conveyor routes lead from Sort to Pack?

```python type
A = np.zeros((n, n), dtype=int)
for a, b in conveyors:
    A[a, b] = A[b, a] = 1
print("row sums = degrees:", A.sum(axis=1))
A3 = np.linalg.matrix_power(A, 3)
print("walks of length 3 from Sort to Pack:", A3[1, 4])

def walks(i, j, k):
    if k == 0:
        return 1 if i == j else 0
    return sum(walks(m, j, k - 1) for m in range(n) if A[i, m])

print("brute-force count:", walks(1, 4, 3))
print("walks of length 2 from each station back to itself:", np.diag(np.linalg.matrix_power(A, 2)))
```

```output
row sums = degrees: [1 4 2 4 2 2 1]
walks of length 3 from Sort to Pack: 6
brute-force count: 6
walks of length 2 from each station back to itself: [1 4 2 4 2 2 1]
```

`np.linalg.matrix_power(A, 3)` computes A·A·A. The brute-force count follows every edge out of i and counts the walks of length k − 1 from there to j.

There are 6 three-step routes from Sort to Pack (for example Sort–Wash–Dry–Pack, or Sort–Pack–Dry–Pack), and the brute-force enumeration agrees. The diagonal of A² is the degree of each vertex, since a 2-step walk back to the start goes out along an edge and returns. The same matrix powers count paths in chemistry, model random walks in the probability lessons, and underlie the PageRank method for ranking web pages.

## Connectivity and the Laplacian

::: math
\[ L = D - A, \qquad L\mathbf{1} = \mathbf{0}, \qquad \#\{\text{zero eigenvalues of } L\} = \#\text{components} \]
- $D$: the diagonal matrix of degrees
- every row of $L$ sums to zero, so 0 is always an eigenvalue
In code: `np.linalg.eigvalsh(laplacian(n, edges))`, compared with `components_bfs(n, edges)`
:::


A graph is **connected** if every vertex can reach every other. When it is not, it splits into **components**. Breadth-first search finds them, as in the DSA series. Linear algebra gives a second, striking method through the **Laplacian matrix** L = D − A, where D is the diagonal matrix of degrees. L always has eigenvalue 0 (each row sums to zero, so the all-ones vector satisfies L1 = 0), and the number of zero eigenvalues equals the number of connected components. Predict before running: if the Dry–QC conveyor is removed, how many separate groups remain, and what does L say?

```python type
def laplacian(n, edges):
    L = np.zeros((n, n))
    for a, b in edges:
        L[a, a] += 1
        L[b, b] += 1
        L[a, b] -= 1
        L[b, a] -= 1
    return L

def components_bfs(n, edges):
    nbrs = {v: [] for v in range(n)}
    for a, b in edges:
        nbrs[a].append(b)
        nbrs[b].append(a)
    seen, groups = set(), []
    for s in range(n):
        if s in seen:
            continue
        group, queue = [], [s]
        seen.add(s)
        while queue:
            v = queue.pop(0)
            group.append(v)
            for w in nbrs[v]:
                if w not in seen:
                    seen.add(w)
                    queue.append(w)
        groups.append(sorted(group))
    return groups

cut = [e for e in conveyors if e != (3, 5)]
for name, edges in [("full layout", conveyors), ("Dry–QC removed", cut)]:
    eig = np.linalg.eigvalsh(laplacian(n, edges))
    zeros = int(np.sum(np.abs(eig) < 1e-9))
    groups = [[stations[v] for v in g] for g in components_bfs(n, edges)]
    print(f"{name}: smallest eigenvalues {np.round(eig[:3], 4)}, zero eigenvalues {zeros}, components {groups}")
```

```output
full layout: smallest eigenvalues [-0.      0.4221  1.0738], zero eigenvalues 1, components [['In', 'Sort', 'Wash', 'Dry', 'Pack', 'QC', 'Out']]
Dry–QC removed: smallest eigenvalues [0. 0. 1.], zero eigenvalues 2, components [['In', 'Sort', 'Wash', 'Dry', 'Pack'], ['QC', 'Out']]
```

`np.linalg.eigvalsh` computes the eigenvalues of a symmetric matrix, in increasing order.

The full layout has exactly one zero eigenvalue: it is connected. With the Dry–QC conveyor removed, two eigenvalues are zero and the stations split into two groups: In, Sort, Wash, Dry and Pack on one side, QC and Out on the other. The second-smallest eigenvalue of the connected layout, about 0.42, is called the **algebraic connectivity**: it measures how well connected the network is, and is small when the network nearly falls apart, a quantity used in designing robust communication and power networks.

## Euler trails

::: math
\[ \text{Euler trail exists} \;\Longleftrightarrow\; \text{connected and } \#\{v : \deg(v) \text{ odd}\} \in \{0, 2\} \]
- each pass through a vertex uses one edge in and one out
- with 2 odd vertices the trail starts at one and ends at the other
In code: `euler_trail(n, edges)` (Hierholzer's algorithm)
:::


Can a maintenance engineer walk every conveyor exactly once, without retracing any? Leonhard Euler solved this in 1736 for the bridges of Königsberg, founding graph theory. Each time a route passes through a vertex it uses two of its edges, one in and one out, so every vertex except the start and the end must have **even** degree. Euler's theorem: a connected graph has an **Euler trail** (using every edge once) exactly when it has 0 or 2 odd-degree vertices; with 0 the trail can return to its start (an **Euler circuit**), with 2 it must start at one odd vertex and end at the other. **Hierholzer's algorithm** finds one: walk until stuck, then splice in detours from vertices on the route that still have unused edges. Predict before running: does the packing hall have an Euler trail, and where must it start?

```python type
def euler_trail(n, edges):
    adj = {v: [] for v in range(n)}
    for idx, (a, b) in enumerate(edges):
        adj[a].append((b, idx))
        adj[b].append((a, idx))
    odd = [v for v in range(n) if len(adj[v]) % 2]
    if len(odd) not in (0, 2):
        return None
    start = odd[0] if odd else next(v for v in range(n) if adj[v])
    used = [False] * len(edges)
    stack, trail = [start], []
    while stack:
        v = stack[-1]
        while adj[v] and used[adj[v][-1][1]]:
            adj[v].pop()
        if adj[v]:
            w, idx = adj[v].pop()
            used[idx] = True
            stack.append(w)
        else:
            trail.append(stack.pop())
    return trail[::-1] if all(used) else None

route = euler_trail(n, conveyors)
print("Euler trail:", " → ".join(stations[v] for v in route))
print("edges used:", len(route) - 1, "of", len(conveyors))
extra = conveyors + [(0, 6)]
print("with an extra In–Out conveyor, odd stations:", [stations[v] for v in range(n) if sum(v in e for e in extra) % 2], "-> circuit:", euler_trail(n, extra)[0] == euler_trail(n, extra)[-1])
```

```output
Euler trail: In → Sort → Dry → Pack → Sort → Wash → Dry → QC → Out
edges used: 8 of 8
with an extra In–Out conveyor, odd stations: [] -> circuit: True
```

The stack holds the current walk; when a vertex has no unused edges left it is moved to the trail, which builds the route backwards. The final check that every edge was used catches disconnected graphs.

The hall has exactly two odd stations, In and Out, so an Euler trail exists, starting at In and ending at Out, and the algorithm finds one using all 8 conveyors once each. Adding a conveyor from In to Out makes every degree even, and the trail becomes a circuit that returns to its start. Snow-ploughing, street sweeping and meter-reading routes are planned this way, adding the fewest repeated edges when odd vertices make a perfect trail impossible.

## Trees: the fewest links

::: math
\[ |E_\text{tree}| = n - 1, \qquad \text{MST} = \arg\min_{\text{spanning trees } T} \sum_{e \in T} w(e) \]
- a tree connects $n$ vertices with no cycles
- Kruskal: take edges cheapest first, skipping any that would close a cycle
In code: `sorted(cables)`, keeping an edge when `find(a) != find(b)`
:::


A connected graph with no cycles is a **tree**. Trees are the cheapest way to connect n points: every tree on n vertices has exactly n − 1 edges, removing any edge disconnects it, and adding any edge creates a cycle. A **spanning tree** of a network keeps all its vertices connected using only n − 1 of its links, and when links have costs, a **minimum spanning tree** is the cheapest such network: the least cable that still connects every machine. **Kruskal's algorithm** finds it greedily: consider links from cheapest up, and keep each one unless it would close a cycle. Predict before running: the 7 stations' possible cable runs have costs; how many runs does the cheapest connecting network use?

```python type
cables = [(4, 0, 1), (2, 1, 2), (5, 1, 4), (3, 2, 3), (6, 3, 4), (2, 4, 5), (1, 5, 6), (4, 3, 5), (7, 1, 3), (9, 0, 6), (3, 2, 4)]
parent = list(range(n))

def find(v):
    while parent[v] != v:
        parent[v] = parent[parent[v]]
        v = parent[v]
    return v

chosen = []
for cost, a, b in sorted(cables):
    ra, rb = find(a), find(b)
    if ra != rb:
        parent[ra] = rb
        chosen.append((cost, a, b))
print("cables chosen:", [(stations[a], stations[b], c) for c, a, b in chosen])
print(f"{len(chosen)} cables (n - 1 = {n - 1}), total cost {sum(c for c, _, _ in chosen)}, against {sum(c for c, _, _ in cables)} for all {len(cables)} runs")
```

```output
cables chosen: [('QC', 'Out', 1), ('Sort', 'Wash', 2), ('Pack', 'QC', 2), ('Wash', 'Dry', 3), ('Wash', 'Pack', 3), ('In', 'Sort', 4)]
6 cables (n - 1 = 6), total cost 15, against 46 for all 11 runs
```

Each cable is (cost, end, end). The `find` function tracks which group each station has joined, the union–find structure of the DSA series; two stations already in one group would form a cycle.

Kruskal's algorithm picks 6 cables, n − 1 for 7 stations, for a total cost of 15, against 46 for installing every possible run. Every minimum spanning tree of this network has the same total, though when costs tie the choice of cables can differ. Graph mathematics shows up wherever things are connected.

::: challenge Degrees and adjacency [easy]
Write `degrees(n, edges)` returning a list of the n vertex degrees for an undirected graph given as a list of `(a, b)` pairs (vertices numbered 0..n−1; a pair `(a, a)`, a loop, adds 2 to a's degree). Raise `ValueError` for a vertex number outside 0..n−1. Write `adjacency_matrix(n, edges)`, the n × n integer NumPy array of edge counts between vertices (repeated edges add up; a loop adds 2 on the diagonal, the usual convention so that row sums still equal degrees). Then write `odd_vertices(n, edges)`, the sorted list of vertices with odd degree.

```python starter
def degrees(n, edges):
    return [0] * n

def adjacency_matrix(n, edges):
    return np.zeros((n, n), dtype=int)

def odd_vertices(n, edges):
    return []

print(degrees(4, [(0, 1), (1, 2), (1, 3)]))
```

```python solution
def _check_edges(n, edges):
    for a, b in edges:
        if not (0 <= a < n and 0 <= b < n):
            raise ValueError(f"edge {(a, b)} has a vertex outside 0..{n - 1}")

def degrees(n, edges):
    _check_edges(n, edges)
    d = [0] * n
    for a, b in edges:
        d[a] += 1
        d[b] += 1
    return d

def adjacency_matrix(n, edges):
    _check_edges(n, edges)
    A = np.zeros((n, n), dtype=int)
    for a, b in edges:
        if a == b:
            A[a, a] += 2
        else:
            A[a, b] += 1
            A[b, a] += 1
    return A

def odd_vertices(n, edges):
    return [v for v, d in enumerate(degrees(n, edges)) if d % 2]

print(degrees(4, [(0, 1), (1, 2), (1, 3)]))
```

```python test
for _n in ["degrees", "adjacency_matrix", "odd_vertices"]:
    assert _n in dir(), f"Define {_n}."
_e = [(0, 1), (1, 2), (1, 4), (2, 3), (3, 4), (4, 5), (5, 6), (3, 5), (1, 3)]
assert degrees(7, _e) == [1, 4, 2, 4, 3, 3, 1] and sum(degrees(7, _e)) == 2 * len(_e), f"Got {degrees(7, _e)}."
assert degrees(3, [(0, 0), (0, 1), (0, 1)]) == [4, 2, 0], "A loop adds 2; repeated edges count twice."
_A = adjacency_matrix(3, [(0, 0), (0, 1), (0, 1)])
assert np.array_equal(_A, [[2, 2, 0], [2, 0, 0], [0, 0, 0]]) and np.array_equal(_A.sum(axis=1), [4, 2, 0]), "Row sums equal degrees."
assert np.array_equal(adjacency_matrix(7, _e), adjacency_matrix(7, _e).T), "Symmetric."
assert odd_vertices(7, _e) == [0, 4, 5, 6] and odd_vertices(3, [(0, 1), (1, 2), (2, 0)]) == [], f"Got {odd_vertices(7, _e)}."
assert len(odd_vertices(7, _e)) % 2 == 0, "Always an even number of odd vertices."
for _bad in [[(0, 5)], [(-1, 0)]]:
    try:
        degrees(3, _bad)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Every edge has two ends, so degrees sum to twice the edge count and odd vertices come in pairs."
```

Hint: Loop over the edges, adding 1 to the degree of both ends. In the matrix, a loop adds 2 to its diagonal entry; any other edge adds 1 to both symmetric entries.
:::

::: challenge Walks and components [medium]
Write `count_walks(A, i, j, k)`: the number of walks of length k from vertex i to vertex j, using a matrix power of the adjacency matrix, as a plain int (k = 0 gives 1 if i == j else 0). Write `components(n, edges)`: the connected components as a list of sorted vertex lists, ordered by their smallest vertex, using breadth-first or depth-first search. Then write `zero_eigenvalues(n, edges)`: the number of eigenvalues of the Laplacian L = D − A that are within 1e-9 of zero (use `np.linalg.eigvalsh`), which must equal the number of components.

```python starter
def count_walks(A, i, j, k):
    return 0

def components(n, edges):
    return [list(range(n))]

def zero_eigenvalues(n, edges):
    return 1

print(components(5, [(0, 1), (3, 4)]))
```

```python solution
def count_walks(A, i, j, k):
    return int(np.linalg.matrix_power(np.asarray(A, dtype=np.int64), k)[i, j])

def components(n, edges):
    nbrs = {v: [] for v in range(n)}
    for a, b in edges:
        nbrs[a].append(b)
        nbrs[b].append(a)
    seen, groups = set(), []
    for s in range(n):
        if s in seen:
            continue
        seen.add(s)
        group, stack = [], [s]
        while stack:
            v = stack.pop()
            group.append(v)
            for w in nbrs[v]:
                if w not in seen:
                    seen.add(w)
                    stack.append(w)
        groups.append(sorted(group))
    return groups

def zero_eigenvalues(n, edges):
    L = np.zeros((n, n))
    for a, b in edges:
        if a != b:
            L[a, a] += 1
            L[b, b] += 1
            L[a, b] -= 1
            L[b, a] -= 1
    return int(np.sum(np.abs(np.linalg.eigvalsh(L)) < 1e-9))

print(components(5, [(0, 1), (3, 4)]))
```

```python test
for _n in ["count_walks", "components", "zero_eigenvalues"]:
    assert _n in dir(), f"Define {_n}."
_e = [(0, 1), (1, 2), (1, 4), (2, 3), (3, 4), (5, 6), (3, 5), (1, 3)]
_A = np.zeros((7, 7), dtype=int)
for _a, _b in _e:
    _A[_a, _b] = _A[_b, _a] = 1
assert count_walks(_A, 1, 4, 3) == 6 and count_walks(_A, 1, 1, 2) == 4 and count_walks(_A, 0, 0, 0) == 1 and count_walks(_A, 0, 6, 0) == 0, "Walk counts."
assert type(count_walks(_A, 1, 4, 3)) is int, "Return a plain int."
_C4 = np.array([[0, 1, 0, 1], [1, 0, 1, 0], [0, 1, 0, 1], [1, 0, 1, 0]])
assert count_walks(_C4, 0, 0, 4) == 8 and count_walks(_C4, 0, 1, 4) == 0, "A square: closed 4-walks, and no odd-to-even walks of even length."
assert components(5, [(0, 1), (3, 4)]) == [[0, 1], [2], [3, 4]], "Isolated vertices are components too."
assert components(7, _e) == [list(range(7))], "The hall is connected."
_cut = [(0, 1), (1, 2), (1, 4), (2, 3), (4, 5), (5, 6)]
assert components(7, [(0, 1), (1, 2), (2, 3), (4, 5), (5, 6)]) == [[0, 1, 2, 3], [4, 5, 6]], "Two groups."
for _n2, _ed in [(5, [(0, 1), (3, 4)]), (7, _e), (7, [(0, 1), (1, 2), (2, 3), (4, 5), (5, 6)]), (4, [])]:
    assert zero_eigenvalues(_n2, _ed) == len(components(_n2, _ed)), f"Zero eigenvalues must match the component count for {_ed}."
"SUCCESS: Matrix powers count walks, and the Laplacian's zero eigenvalues count the pieces a network falls into."
```

Hint: `np.linalg.matrix_power(A, k)[i, j]` counts walks. For components, keep a set of visited vertices and explore from each unvisited one. The Laplacian has the degrees on the diagonal and −1 for each edge off it.
:::

::: challenge Inspection routes [hard]
Write `euler_trail(n, edges)` that returns a list of vertices describing a walk that uses every edge exactly once (repeated edges, multigraph style, each used once), or `None` if no such walk exists: the edges with at least one end must all lie in one connected component, and there must be 0 or 2 odd-degree vertices. With 2 odd vertices, start at the smaller one; with none, start at the smallest vertex that has an edge. Any valid trail is accepted. Return `[]` for a graph with no edges. Then write `trails_needed(n, edges)`: for a connected, non-empty edge set, the fewest separate trails (pen-on-paper strokes) that together use every edge exactly once, which is max(1, number of odd vertices / 2): each trail has at most two odd ends; raise `ValueError` if the edges are not all in one component.

```python starter
def euler_trail(n, edges):
    return None

def trails_needed(n, edges):
    return 0

print(euler_trail(4, [(0, 1), (1, 2), (2, 3), (3, 1)]))
```

```python solution
def _edge_component_ok(n, edges):
    if not edges:
        return True
    nbrs = {v: [] for v in range(n)}
    for a, b in edges:
        nbrs[a].append(b)
        nbrs[b].append(a)
    start = edges[0][0]
    seen, stack = {start}, [start]
    while stack:
        v = stack.pop()
        for w in nbrs[v]:
            if w not in seen:
                seen.add(w)
                stack.append(w)
    return all(a in seen and b in seen for a, b in edges)

def euler_trail(n, edges):
    if not edges:
        return []
    if not _edge_component_ok(n, edges):
        return None
    adj = {v: [] for v in range(n)}
    for idx, (a, b) in enumerate(edges):
        adj[a].append((b, idx))
        adj[b].append((a, idx))
    odd = sorted(v for v in range(n) if len(adj[v]) % 2)
    if len(odd) not in (0, 2):
        return None
    start = odd[0] if odd else min(v for v in range(n) if adj[v])
    used = [False] * len(edges)
    stack, trail = [start], []
    while stack:
        v = stack[-1]
        while adj[v] and used[adj[v][-1][1]]:
            adj[v].pop()
        if adj[v]:
            w, idx = adj[v].pop()
            used[idx] = True
            stack.append(w)
        else:
            trail.append(stack.pop())
    return trail[::-1]

def trails_needed(n, edges):
    if not _edge_component_ok(n, edges):
        raise ValueError("the edges are not all connected")
    deg = [0] * n
    for a, b in edges:
        deg[a] += 1
        deg[b] += 1
    odd = sum(d % 2 for d in deg)
    return max(1, odd // 2)

print(euler_trail(4, [(0, 1), (1, 2), (2, 3), (3, 1)]))
```

```python test
from collections import Counter as _Counter
for _n in ["euler_trail", "trails_needed"]:
    assert _n in dir(), f"Define {_n}."
def _valid(_n2, _edges, _trail):
    if _trail is None or len(_trail) != len(_edges) + 1:
        return False
    _need = _Counter(tuple(sorted(e)) for e in _edges)
    _got = _Counter(tuple(sorted((_trail[i], _trail[i + 1]))) for i in range(len(_trail) - 1))
    return _need == _got
_hall = [(0, 1), (1, 2), (1, 4), (2, 3), (3, 4), (5, 6), (3, 5), (1, 3)]
_t = euler_trail(7, _hall)
assert _valid(7, _hall, _t) and _t[0] == 0 and _t[-1] == 6, f"Start at the smaller odd vertex (In) and end at the other (Out); got {_t}."
_circ = _hall + [(0, 6)]
_tc = euler_trail(7, _circ)
assert _valid(7, _circ, _tc) and _tc[0] == _tc[-1] == 0, "All even: a circuit from the smallest vertex."
_k = [(0, 1), (0, 1), (0, 2), (0, 2), (0, 3), (1, 3), (2, 3)]
assert euler_trail(4, _k) is None, "Königsberg: four odd vertices, no trail."
assert euler_trail(5, [(0, 1), (1, 2), (2, 0), (3, 4)]) is None, "Edges in two separate pieces."
assert euler_trail(6, [(1, 2), (2, 3), (3, 1)]) in ([1, 2, 3, 1], [1, 3, 2, 1]) and euler_trail(3, []) == [], "Isolated vertices are fine; no edges gives []."
_multi = [(0, 1), (0, 1), (1, 2)]
assert _valid(3, _multi, euler_trail(3, _multi)), "Repeated edges are each used once."
assert trails_needed(4, _k) == 2 and trails_needed(7, _hall) == 1 and trails_needed(7, _circ) == 1, "Königsberg needs two separate walks."
assert trails_needed(4, [(0, 1), (0, 2), (0, 3)]) == 2 and trails_needed(6, [(0, 1), (0, 2), (0, 3), (0, 4), (0, 5)]) == 3, "Stars: four and six odd vertices."
try:
    trails_needed(4, [(0, 1), (2, 3)])
    assert False, "Disconnected edges should raise ValueError."
except ValueError:
    pass
"SUCCESS: Odd degrees decide everything: zero or two give a single route over every link, and every further pair of odd vertices needs one more separate trail."
```

Hint: Check that all edges are reachable from the first edge's end (a search over the edges' vertices), then count odd degrees. Hierholzer's method: keep a stack starting at the start vertex; while the top has an unused edge, follow it and push; when it has none, pop it onto the trail. The trail comes out reversed.
:::

## What you learned

- A graph is vertices joined by edges; degrees sum to twice the number of edges, so odd-degree vertices come in pairs.
- The adjacency matrix captures a graph completely, and (Aᵏ)ᵢⱼ counts the walks of length k from i to j.
- The Laplacian L = D − A has one zero eigenvalue per connected component; the next-smallest eigenvalue measures how well connected the network is.
- An Euler trail over every edge exists exactly when the edges are connected and 0 or 2 vertices have odd degree; Hierholzer's algorithm finds one.
- Trees connect n vertices with n − 1 edges; Kruskal's algorithm builds the cheapest connecting network greedily.

The next lesson finds the shortest route through a weighted network, to guide a forklift around a warehouse.
