# Graph representations

A **graph** is a set of things, called **vertices** (or nodes), and connections between pairs of them, called **edges**. That sounds abstract, and it is, which is exactly why graphs are so useful: road maps, social networks, web pages and links, airline routes, task dependencies, circuit boards, molecules, game states and their moves, and the words of a puzzle linked by one-letter changes are all graphs. Model a problem as a graph, and a whole toolbox of algorithms (shortest paths, connectivity, ordering, spanning trees) applies to it at once. The rest of this part of the series builds that toolbox.

This lesson is about the first step: getting a graph into the computer. It covers:

- the vocabulary: directed and undirected, weighted, degree, path, cycle, sparse and dense;
- three representations: the **edge list**, the **adjacency matrix** and the **adjacency list**, and what each costs;
- converting between them;
- **implicit** graphs, whose edges are computed on demand rather than stored, such as grids and word puzzles.

## Vocabulary

- In an **undirected** graph, an edge {u, v} connects both ways, like a two-way road or a friendship. In a **directed** graph, an edge (u, v) goes from u to v only, like a one-way street, a web link, or "task u must happen before task v".
- In a **weighted** graph, each edge carries a number: a distance, a cost, a capacity.
- The **neighbours** of a vertex are the vertices it has edges to; its **degree** is how many. In a directed graph, the **out-degree** counts edges leaving and the **in-degree** edges arriving.
- A **path** is a sequence of vertices each joined to the next by an edge; a **cycle** is a path that returns to its start.
- With V vertices, there can be up to about V² edges. A graph with far fewer, closer to V, is **sparse** (road maps, social networks: each person knows a tiny fraction of everyone); one near V² is **dense**.

## Three representations

An **edge list** is just the list of pairs. It is the simplest, and often how graphs arrive (from a file or database), but answering "who are v's neighbours?" means scanning every edge.

An **adjacency matrix** is a V × V table where entry [u][v] is 1 (or the weight) if there is an edge from u to v. Checking a particular edge is O(1), but the table takes V² space whatever the number of edges, and listing a vertex's neighbours means scanning its whole row, O(V).

An **adjacency list** maps each vertex to the list (or set) of its neighbours. It takes O(V + E) space, lists v's neighbours in O(degree), and checks an edge in O(degree), or O(1) on average with sets. Since most real graphs are sparse and most algorithms work by visiting neighbours, the adjacency list is the default. Predict before running: in the small network below, what are Cara's neighbours, and what is her degree?

```python type
edges = [("Ann", "Ben"), ("Ann", "Cara"), ("Ben", "Cara"), ("Cara", "Dev"), ("Dev", "Eli"), ("Fay", "Gus")]

graph = {}
for u, v in edges:
    graph.setdefault(u, set()).add(v)
    graph.setdefault(v, set()).add(u)

for person in sorted(graph):
    print(f"{person:<5} degree {len(graph[person])}: {sorted(graph[person])}")

names = sorted(graph)
index = {name: i for i, name in enumerate(names)}
matrix = [[0] * len(names) for _ in names]
for u, v in edges:
    matrix[index[u]][index[v]] = matrix[index[v]][index[u]] = 1
print("\n      " + " ".join(n[0] for n in names))
for name, row in zip(names, matrix):
    print(f"{name:<5} " + " ".join(str(x) for x in row))
print("are Ben and Dev connected directly?", "Dev" in graph["Ben"], "/", bool(matrix[index["Ben"]][index["Dev"]]))
```

```output
Ann   degree 2: ['Ben', 'Cara']
Ben   degree 2: ['Ann', 'Cara']
Cara  degree 3: ['Ann', 'Ben', 'Dev']
Dev   degree 2: ['Cara', 'Eli']
Eli   degree 1: ['Dev']
Fay   degree 1: ['Gus']
Gus   degree 1: ['Fay']

      A B C D E F G
Ann   0 1 1 0 0 0 0
Ben   1 0 1 0 0 0 0
Cara  1 1 0 1 0 0 0
Dev   0 0 1 0 1 0 0
Eli   0 0 0 1 0 0 0
Fay   0 0 0 0 0 0 1
Gus   0 0 0 0 0 1 0
are Ben and Dev connected directly? False / False
```

`setdefault(u, set())` returns the set for u, creating an empty one the first time; each undirected edge is added in both directions. The matrix needs the vertices numbered, so `index` maps each name to a row number.

Cara has degree 3 (Ann, Ben and Dev). Fay and Gus are connected to each other but not to anyone else: the graph has two separate pieces, which the depth-first search lesson will find automatically. The matrix of an undirected graph is symmetric, and it is mostly zeros: 12 of its 49 entries are ones. That waste is the matrix's problem on sparse graphs.

## Space, and what each representation is good at

How much the representation matters depends on the graph's size and density. Predict before running: for a social-network-like graph of 10,000 people with about 10 friends each, how many entries would an adjacency matrix have, compared with the adjacency list?

```python type
import random

random.seed(0)
V, friends_each = 10_000, 10
adjacency = {v: set() for v in range(V)}
E = 0
while E < V * friends_each // 2:
    u, v = random.randrange(V), random.randrange(V)
    if u != v and v not in adjacency[u]:
        adjacency[u].add(v)
        adjacency[v].add(u)
        E += 1

print(f"V = {V:,}, E = {E:,} undirected edges")
print(f"adjacency matrix entries:        {V * V:>12,}")
print(f"adjacency list entries (2 per edge): {2 * E:>8,}")
print(f"fraction of the matrix that would be ones: {2 * E / (V * V):.4%}")
```

```output
V = 10,000, E = 50,000 undirected edges
adjacency matrix entries:         100,000,000
adjacency list entries (2 per edge):  100,000
fraction of the matrix that would be ones: 0.1000%
```

`E` counts the friendships as they are added, skipping repeats. Each undirected edge appears twice in the adjacency list, once in each endpoint's set.

The matrix would have 100 million entries, of which a tenth of one per cent are ones; the adjacency list stores 100,000. For sparse graphs, adjacency lists win by orders of magnitude. Matrices make sense for small or dense graphs, or when an algorithm checks "is there an edge from u to v?" constantly (the Floyd-Warshall algorithm in a later lesson works on a matrix).

In Python, the adjacency list is usually a **dictionary from vertex to a list or set** of neighbours, as above. For weighted graphs, map each vertex to a dictionary from neighbour to weight: `roads["York"]["Leeds"] = 40`. Vertices can be any hashable values: names, numbers, coordinates, tuples describing game states.

## Directed graphs

In a directed graph each edge is stored once, under the vertex it leaves. Two derived quantities come up constantly: the in-degree of each vertex (how many edges arrive), and the **reverse** (or transpose) graph, with every edge flipped, which answers "who links **to** this page?". Predict before running: which course has the most prerequisites, and which is a prerequisite for the most others?

```python type
prerequisites = {
    "Python basics": ["Data structures", "Web development", "Statistics"],
    "Data structures": ["Algorithms", "Databases"],
    "Statistics": ["Machine learning"],
    "Algorithms": ["Machine learning"],
    "Databases": ["Web development"],
    "Web development": [],
    "Machine learning": [],
}

in_degree = {course: 0 for course in prerequisites}
for course, unlocks in prerequisites.items():
    for later in unlocks:
        in_degree[later] += 1

for course in prerequisites:
    print(f"{course:<17} unlocks {len(prerequisites[course])}, needs {in_degree[course]}")
```

```output
Python basics     unlocks 3, needs 0
Data structures   unlocks 2, needs 1
Statistics        unlocks 1, needs 1
Algorithms        unlocks 1, needs 1
Databases         unlocks 1, needs 1
Web development   unlocks 0, needs 2
Machine learning  unlocks 0, needs 2
```

Here an edge from A to B means "A must be taken before B". The in-degree of B counts its prerequisites.

Machine learning and Web development each need 2 courses, and Python basics unlocks the most (3). Python basics is the only course with in-degree 0: nothing needs to be taken before it, so it is where a study plan must start. The topological sort lesson turns this observation into an algorithm for ordering every course.

## Implicit graphs

Some graphs are too large, or too regular, to store. Instead, write a function that **computes** a vertex's neighbours when asked. A **grid** is the commonest example: the cells of a maze or a game board are vertices, and each open cell's neighbours are the open cells up, down, left and right. A word puzzle is another: the vertices are words, with an edge between two words that differ in one letter (cold → cord → card → ward → warm). Predict before running: how many open neighbours does the cell at row 1, column 1 have?

```python type
maze = [
    "#########",
    "#..#....#",
    "#.##.##.#",
    "#....#..#",
    "#########",
]

def grid_neighbours(cell):
    r, c = cell
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nr, nc = r + dr, c + dc
        if 0 <= nr < len(maze) and 0 <= nc < len(maze[0]) and maze[nr][nc] == ".":
            yield (nr, nc)

print("neighbours of (1, 1):", list(grid_neighbours((1, 1))))
print("neighbours of (3, 4):", list(grid_neighbours((3, 4))))
open_cells = [(r, c) for r in range(len(maze)) for c in range(len(maze[0])) if maze[r][c] == "."]
edge_count = sum(len(list(grid_neighbours(cell))) for cell in open_cells) // 2
print(f"{len(open_cells)} open cells, {edge_count} edges, none of them stored")
```

```output
neighbours of (1, 1): [(2, 1), (1, 2)]
neighbours of (3, 4): [(2, 4), (3, 3)]
15 open cells, 14 edges, none of them stored
```

`grid_neighbours` is a generator: it produces the neighbouring open cells one at a time, checking that each step stays inside the grid and lands on a "." cell.

Cell (1, 1) has two open neighbours, (1, 2) to its right and (2, 1) below. The graph exists only as a rule. Graph algorithms do not care: everything they need is "give me the neighbours of this vertex", and a function answers that as well as a dictionary does. A chess engine's game tree, with billions of positions, is an implicit graph of the same kind.

::: challenge Build a weighted graph [easy]
Write `build_weighted(edges)` that takes a list of `(u, v, weight)` triples for an **undirected** weighted graph and returns an adjacency dictionary of dictionaries, `graph[u][v] = weight` and `graph[v][u] = weight`, including every vertex. Then write `total_weight(graph)` returning the sum of all edge weights, counting each undirected edge once.

```python starter
def build_weighted(edges):
    return {}

def total_weight(graph):
    return 0

roads = build_weighted([("York", "Leeds", 40), ("Leeds", "Hull", 95), ("York", "Hull", 60)])
print(roads, total_weight(roads))
```

```python solution
def build_weighted(edges):
    graph = {}
    for u, v, w in edges:
        graph.setdefault(u, {})[v] = w
        graph.setdefault(v, {})[u] = w
    return graph

def total_weight(graph):
    return sum(w for u in graph for w in graph[u].values()) // 2

roads = build_weighted([("York", "Leeds", 40), ("Leeds", "Hull", 95), ("York", "Hull", 60)])
print(roads, total_weight(roads))
```

```python test
assert "build_weighted" in dir() and "total_weight" in dir(), "Keep both function names."
_g = build_weighted([("York", "Leeds", 40), ("Leeds", "Hull", 95), ("York", "Hull", 60)])
assert "York" in _g and "Leeds" in _g["York"], "graph[\"York\"][\"Leeds\"] should hold the weight of the York-Leeds road."
assert _g["York"]["Leeds"] == 40 and _g["Leeds"]["York"] == 40 and _g["Hull"]["Leeds"] == 95, "Each edge should appear in both directions with its weight."
assert sorted(_g) == ["Hull", "Leeds", "York"] and len(_g["Hull"]) == 2, "Every vertex should be a key, with its neighbours."
assert total_weight(_g) == 195, f"The three roads total 195; got {total_weight(_g)}."
assert build_weighted([]) == {} and total_weight({}) == 0, "No edges: an empty graph with total 0."
_h = build_weighted([("a", "b", 3), ("b", "c", 4), ("c", "d", 5), ("d", "a", 6), ("a", "c", 7)])
assert total_weight(_h) == 25 and len(_h["a"]) == 3, "On a five-edge graph the total should be 25 and a should have 3 neighbours."
"SUCCESS: A dictionary of dictionaries: neighbours and weights in O(1) on average, and the standard input for Dijkstra's algorithm."
```

Hint: For each `(u, v, w)`, use `graph.setdefault(u, {})[v] = w` and the same the other way round. For the total, sum every weight in every inner dictionary and halve it, since each edge was stored twice.
:::

::: challenge Reverse a directed graph [medium]
Write `reverse_graph(graph)` that takes a directed graph as a dictionary from each vertex to a list of the vertices it points to, and returns the reversed graph in the same format (every edge u → v becomes v → u), including every vertex as a key (with an empty list if nothing points to it), and with each list in the order the original edges were encountered when looping over `graph` and its lists. Then use it on the lesson's `prerequisites` to set `needed_for_ml` to the sorted list of courses that lead **directly** into "Machine learning".

```python starter
def reverse_graph(graph):
    return {}

needed_for_ml = []
print(reverse_graph({"a": ["b", "c"], "b": ["c"], "c": []}), needed_for_ml)
```

```python solution
def reverse_graph(graph):
    reversed_graph = {v: [] for v in graph}
    for u, targets in graph.items():
        for v in targets:
            reversed_graph.setdefault(v, []).append(u)
    return reversed_graph

needed_for_ml = sorted(reverse_graph(prerequisites)["Machine learning"])
print(reverse_graph({"a": ["b", "c"], "b": ["c"], "c": []}), needed_for_ml)
```

```python test
assert "reverse_graph" in dir(), "Keep the function's name as reverse_graph."
assert reverse_graph({"a": ["b", "c"], "b": ["c"], "c": []}) == {"a": [], "b": ["a"], "c": ["a", "b"]}, f"Got {reverse_graph({'a': ['b', 'c'], 'b': ['c'], 'c': []})}."
assert reverse_graph({}) == {}, "An empty graph reverses to an empty graph."
assert reverse_graph({"x": ["y"]}) == {"x": [], "y": ["x"]}, "A vertex that only appears as a target should still become a key."
_g = {1: [2, 3], 2: [3], 3: [1]}
assert reverse_graph(reverse_graph(_g)) == {1: [3, 2], 2: [1], 3: [1, 2]} or all(sorted(reverse_graph(reverse_graph(_g))[k]) == sorted(_g[k]) for k in _g), "Reversing twice should give back the original edges."
assert needed_for_ml == ["Algorithms", "Statistics"], f"Algorithms and Statistics lead directly into Machine learning; got {needed_for_ml}."
_orig = {"a": ["b"]}; reverse_graph(_orig)
assert _orig == {"a": ["b"]}, "Don't change the input graph."
"SUCCESS: Flipping every edge turns 'what does this unlock?' into 'what does this need?': one pass over the edges, O(V + E)."
```

Hint: Start with `{v: [] for v in graph}`. For every u and every v in `graph[u]`, append u to the reversed list of v (using `setdefault` in case v is not a key of the original).
:::

::: challenge A word-ladder graph [medium]
Build the implicit graph of a word puzzle explicitly. Write `word_graph(words)` returning an adjacency dictionary (word → sorted list of words) for words of equal length, joining two words when they differ in **exactly one** position. Comparing every pair is O(n²); instead, use **buckets**: for each word and each position, make a pattern with that letter replaced by `_` (so "cold" gives `_old`, `c_ld`, `co_d`, `col_`), and group words by pattern with a dictionary. Words sharing a bucket are neighbours.

```python starter
def word_graph(words):
    return {}

g = word_graph(["cold", "cord", "card", "ward", "warm", "worm", "word", "corm"])
print(g.get("cord"), g.get("warm"))
```

```python solution
from collections import defaultdict

def word_graph(words):
    buckets = defaultdict(list)
    for w in words:
        for i in range(len(w)):
            buckets[w[:i] + "_" + w[i + 1:]].append(w)
    graph = {w: set() for w in words}
    for group in buckets.values():
        for a in group:
            for b in group:
                if a != b:
                    graph[a].add(b)
    return {w: sorted(n) for w, n in graph.items()}

g = word_graph(["cold", "cord", "card", "ward", "warm", "worm", "word", "corm"])
print(g["cord"], g["warm"])
```

```python test
import random as _random, string as _string
assert "word_graph" in dir(), "Keep the function's name as word_graph."
_ws = ["cold", "cord", "card", "ward", "warm", "worm", "word", "corm"]
_g = word_graph(_ws)
assert _g["cord"] == ["card", "cold", "corm", "word"], f"cord's neighbours should be card, cold, corm, word; got {_g['cord']}."
assert _g["warm"] == ["ward", "worm"], f"warm's neighbours should be ward and worm; got {_g['warm']}."
assert set(_g) == set(_ws), "Every word should be a key, even one with no neighbours."
assert word_graph(["abc", "xyz"]) == {"abc": [], "xyz": []}, "Words with no one-letter neighbours get empty lists."
_r = _random.Random(1)
_big = list({"".join(_r.choice("abcd") for _ in range(3)) for _ in range(40)})
_gb = word_graph(_big)
for _a in _big:
    _want = sorted(b for b in _big if b != _a and sum(x != y for x, y in zip(_a, b)) == 1)
    assert _gb[_a] == _want, f"Neighbours of {_a!r} should be {_want}."
"SUCCESS: Buckets find all one-letter neighbours without comparing every pair: each word lands in L buckets, and only words sharing a bucket are compared."
```

Hint: Use a `defaultdict(list)` from pattern to words. Then every two different words in the same bucket are neighbours; collect them in sets (two words differing in one position share exactly one bucket, but building sets avoids any duplicates), and sort each set at the end.
:::

## What you learned

- A graph is vertices and edges, directed or undirected, possibly weighted; degree, paths, cycles and sparse versus dense describe its shape.
- An edge list is simple; an adjacency matrix gives O(1) edge checks for V² space; an adjacency list gives O(V + E) space and fast neighbour listing, and is the default for sparse graphs.
- In Python, a dictionary from vertex to a set, list or dictionary of neighbours represents almost any graph; in-degrees and the reversed graph each take one pass over the edges.
- Implicit graphs compute neighbours on demand, as for grids and word puzzles; algorithms only ever need "the neighbours of v".

The next lesson explores a graph outward from a starting vertex, level by level: breadth-first search, which finds shortest paths in unweighted graphs.
