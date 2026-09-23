# Module 9: Graphs — Building a Graph Class with BFS/DFS

## Why this module matters

Trees (Module 7) are actually a restricted special case of graphs — a tree is a graph with no cycles, and exactly one path between any two nodes. Graphs drop those restrictions, which makes them more general but also means the "walk from the root" traversal strategies from Module 7 need to evolve to handle cycles (you can revisit the same node) and disconnected pieces (not everything is reachable from one starting point).

---

## 1. Graph representations

A graph is a set of **vertices** (nodes) and **edges** (connections between them). Two standard ways to represent one in code:

### Adjacency list

```cpp
// vertex i's neighbors are stored in adjList[i]
std::vector<std::vector<int>> adjList;
```

```
Graph:        0 -- 1
              |    |
              2 -- 3

adjList[0] = {1, 2}
adjList[1] = {0, 3}
adjList[2] = {0, 3}
adjList[3] = {1, 2}
```

### Adjacency matrix

```cpp
// matrix[i][j] == true means there's an edge between i and j
std::vector<std::vector<bool>> matrix;
```

```
      0  1  2  3
   0 [0, 1, 1, 0]
   1 [1, 0, 0, 1]
   2 [1, 0, 0, 1]
   3 [0, 1, 1, 0]
```

### Trade-off: adjacency list vs. adjacency matrix

| | Adjacency list | Adjacency matrix |
|---|---|---|
| Memory | O(V + E) — proportional to actual edges | O(V²) — always, regardless of edge count |
| "Are u and v connected?" check | O(degree of u) — must scan u's neighbor list | O(1) — direct index |
| "What are u's neighbors?" (iteration) | O(degree of u) — exactly the neighbors, nothing wasted | O(V) — must scan the whole row, even non-neighbors |
| Best for | Sparse graphs (relatively few edges vs. possible edges) — most real-world graphs (social networks, road networks, dependency graphs) | Dense graphs (many edges), or when O(1) edge-existence checks matter more than memory |

This mirrors Module 2's `bool flags[32]` vs. bitmask trade-off in spirit: the matrix is simple and gives O(1) lookups at the cost of guaranteed O(V²) space no matter how sparse the actual graph is; the list only pays for edges that actually exist. Real-world graphs (a social network with millions of users, each connected to a few hundred others — not millions) are almost always sparse, which is why adjacency lists are the default choice in practice. We'll build with adjacency lists.

---

## 2. The `Graph` class

```cpp
#pragma once
#include <vector>
#include <queue>
#include <stack>
#include <unordered_set>
#include <iostream>

class Graph {
private:
    int numVertices;
    std::vector<std::vector<int>> adjList;
    bool directed;

public:
    Graph(int n, bool isDirected = false)
        : numVertices(n), adjList(n), directed(isDirected) {}

    void addEdge(int u, int v) {
        adjList[u].push_back(v);
        if (!directed) {
            adjList[v].push_back(u);   // undirected: add both directions
        }
    }

    const std::vector<int>& neighbors(int v) const {
        return adjList[v];
    }

    int size() const { return numVertices; }
};
```

The `directed` flag controls whether `addEdge` adds one connection (u -> v only) or two (u <-> v) — the same underlying `adjList` structure represents both directed and undirected graphs; only `addEdge`'s behavior changes.

---

## 3. Breadth-First Search (BFS)

BFS explores level by level — everything 1 edge away, then everything 2 edges away, and so on. This makes it the right tool whenever you need the **shortest path in terms of number of edges** (unweighted shortest path).

```cpp
std::vector<int> bfs(const Graph& g, int start) {
    std::vector<bool> visited(g.size(), false);
    std::queue<int> toVisit;
    std::vector<int> order;   // records the order nodes were visited, for demonstration

    visited[start] = true;
    toVisit.push(start);

    while (!toVisit.empty()) {
        int current = toVisit.front();
        toVisit.pop();
        order.push_back(current);

        for (int neighbor : g.neighbors(current)) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;   // mark visited when ENQUEUED, not when dequeued —
                toVisit.push(neighbor);      // this avoids adding the same node twice
            }
        }
    }
    return order;
}
```

```
Graph:      0 -- 1 -- 3
            |
            2 -- 4

BFS from 0:  visit 0, enqueue [1, 2]
             visit 1, enqueue [3]        (0 already visited, skip)
             visit 2, enqueue [4]        (0 already visited, skip)
             visit 3
             visit 4
order: 0, 1, 2, 3, 4
```

Notice `bfs` reuses `std::queue`, the FIFO structure whose semantics you built yourself in Module 5's `Queue<T>` — BFS's "process oldest-discovered first" behavior is *exactly* what a queue is for. **`visited` is essential** — without it, a graph with a cycle would loop forever (this is the graph-specific problem Module 7's trees never had, since trees have no cycles by definition).

---

## 4. Depth-First Search (DFS)

DFS dives as deep as possible down one path before backtracking — structurally the same idea as Module 7's tree traversals, generalized to handle cycles via a `visited` set.

### Recursive DFS

```cpp
void dfsHelper(const Graph& g, int current, std::vector<bool>& visited, std::vector<int>& order) {
    visited[current] = true;
    order.push_back(current);
    for (int neighbor : g.neighbors(current)) {
        if (!visited[neighbor]) {
            dfsHelper(g, neighbor, visited, order);   // recurse — same shape as Module 7's tree recursion
        }
    }
}

std::vector<int> dfsRecursive(const Graph& g, int start) {
    std::vector<bool> visited(g.size(), false);
    std::vector<int> order;
    dfsHelper(g, start, visited, order);
    return order;
}
```

### Iterative DFS (using an explicit stack — Module 5's `Stack<T>` in spirit)

```cpp
std::vector<int> dfsIterative(const Graph& g, int start) {
    std::vector<bool> visited(g.size(), false);
    std::stack<int> toVisit;
    std::vector<int> order;

    toVisit.push(start);

    while (!toVisit.empty()) {
        int current = toVisit.top();
        toVisit.pop();

        if (visited[current]) continue;   // note: unlike BFS, we check AFTER popping here
        visited[current] = true;
        order.push_back(current);

        for (int neighbor : g.neighbors(current)) {
            if (!visited[neighbor]) {
                toVisit.push(neighbor);
            }
        }
    }
    return order;
}
```

This is the practical, concrete version of Module 7 practice problem 4 ("rewrite traversal iteratively using an explicit stack") — DFS on a graph *is* essentially that same technique, generalized. Comparing BFS and DFS's code side by side, the only structural difference is `std::queue` vs. `std::stack` — same overall algorithm shape, different order of exploration, entirely because of that one data structure swap. That's worth sitting with: it's a clean, concrete demonstration of how the *choice of underlying structure* changes an algorithm's behavior, which has been a theme across this whole series.

---

## 5. Weighted graphs (a brief extension)

Real-world graphs often have edges with costs (distances, times, weights):

```cpp
struct Edge {
    int to;
    int weight;
};

std::vector<std::vector<Edge>> weightedAdjList;
```

With weights, "shortest path" stops meaning "fewest edges" (BFS's specialty) and starts meaning "lowest total weight" — that requires a different algorithm (Dijkstra's, which uses a priority queue) that's out of scope for this series but is the natural next step if you want to keep going after this module.

---

## Practice Problems

1. **Build and test the full `Graph` class**: Implement it, build a small graph (6-8 vertices, a mix of connected components), and run both `bfs` and `dfsRecursive` from the same start vertex. Confirm the visitation *order* differs but both eventually visit every reachable vertex.

2. **Disconnected graph handling**: Build a graph with two separate, unconnected clusters of vertices. Run `bfs` starting in one cluster and confirm vertices in the other cluster are never visited. Then write a `findAllComponents` function that runs BFS/DFS repeatedly (from any unvisited vertex) until every vertex has been visited, returning each connected component as a separate list.

3. **Shortest path via BFS**: Modify `bfs` to also track, for each visited node, the node it was reached from (a `parent` array). Use this to reconstruct and print the actual shortest path (not just the visit order) from `start` to some target vertex.

4. **Cycle detection**: Using DFS, write `bool hasCycle(const Graph& g)` for an undirected graph (hint: during DFS, if you encounter an already-visited neighbor that ISN'T the node you just came from, you've found a cycle).

5. **Directed vs. undirected comparison**: Build the same set of vertices twice — once as a directed graph, once as undirected — with a directed edge set where reachability genuinely differs (e.g., 0->1->2 with no way back). Run BFS from vertex 2 on both and observe that the directed version reaches far fewer nodes.

6. **Adjacency matrix implementation for comparison**: Implement a second version of `Graph` backed by `std::vector<std::vector<bool>>` instead of adjacency lists, with the same `addEdge`/`neighbors` interface. Time `neighbors()` on a sparse graph (e.g., 1000 vertices, ~2000 edges) for both implementations and confirm the adjacency-list version is meaningfully faster, making section 1's trade-off table concrete.

---

**Next: Module 10 — Sorting & Complexity**, where you'll implement and benchmark quicksort and mergesort as templated functions, and formalize the Big-O intuition that's been running underneath every trade-off table so far. Say "next module" when ready.
