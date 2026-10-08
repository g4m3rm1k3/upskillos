---
title: Graphs, paths, and the loops behind queries
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

A branching course or navigation map is a graph: named locations connected by permitted moves. We will solve an unweighted path problem, then inspect how a collection query represents ordinary iteration. These are guided transfer labs; the current game's single-loop waypoint driver remains unchanged.

## Represent neighbors and initialize a frontier

Nodes are integer location IDs. An edge permits travel from one node to another. The dictionary maps each node to its adjacent nodes. In the initializer, `[0] = new[] { 1, 2 }` associates key zero with an integer array of neighbors. Node zero connects to one and two; both routes can eventually reach three. This representation is an adjacency list; it stores actual edges instead of every possible pair.

The queue contains discovered nodes whose neighbors have not yet been examined: the frontier. The parent dictionary records how each new node was first reached and also serves as visited membership. Start maps to -1, a sentinel meaning it has no predecessor.

Type this first fragment now. The next step appends the traversal to the same file. Predict which branch reaches node three first given the listed neighbor order. Breadth-first search will find a shortest path in number of edges, but equally short alternatives depend on traversal order.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
Dictionary<int, int[]> neighbors = new()
{
    [0] = new[] { 1, 2 },
    [1] = new[] { 0, 3 },
    [2] = new[] { 0, 3 },
    [3] = new[] { 1, 2 }
};
Queue<int> frontier = new();
Dictionary<int, int> parent = new();
parent.Add(0, -1);
frontier.Enqueue(0);
```

## Visit once and reconstruct the path

Dequeue removes the oldest discovered node, so all nodes one edge from start are examined before nodes two edges away. Skip a neighbor already in parent. Otherwise record its predecessor **when enqueuing**, not when dequeuing. Waiting until later can enqueue the same node many times through different edges.

The second loop follows predecessors from goal three back to the start sentinel, collecting 3,1,0. Reverse makes the result start-to-goal. string.Join converts that ordered sequence to display text. Because every edge here has equal cost, the first discovered route is shortest by edge count. With different travel times, breadth-first search need not find the fastest route; Dijkstra's algorithm would use a priority queue and accumulated costs.

This graph is connected and we know three is reachable. In a general function, check `parent.ContainsKey(goal)` before reconstruction and return an explicit no-path result. The traversal is O(V+E) for V reachable vertices and E examined edges, with O(V) frontier/visited storage. It is not enumerating every possible path.

Append this fragment to the previous file, then run. Change the neighbor order temporarily to observe a different equally short route; restore it. The expected path is a test of this specified ordering, not a universal mathematical uniqueness claim.

```csharp edit=Scratch/Program.cs mode=append
while (frontier.Count > 0)
{
    int node = frontier.Dequeue();
    foreach (int next in neighbors[node])
    {
        if (parent.ContainsKey(next)) continue;
        parent.Add(next, node);
        frontier.Enqueue(next);
    }
}
List<int> route = new();
for (int node = 3; node != -1; node = parent[node]) route.Add(node);
route.Reverse();
if (string.Join(",", route) != "0,1,3") throw new Exception("Unexpected BFS path");
Console.WriteLine("BREADTH FIRST SEARCH PASSED");
```

## Materialize a query when you need a snapshot

Where and Select take functions, called lambdas here. `value => value >= 35` maps one energy value to a bool. `value => value - 35` maps one permitted energy to its post-spend value. Neither lambda is a string of source code; each is a typed callable passed to a library method.

The query below is deferred: creating it does not copy the current list. ToArray enumerates it and captures results immediately. After changing the list, later enumeration of query sees the changed element, while snapshot retains its old values. This is why the race creates all input decisions before advancing state.

You can rewrite Where/Select as a foreach with an if and an output list. LINQ makes that intent compact but does not remove the loop, allocation, or timing of execution. If you cannot explain the loop that a query implies, expand it before attempting to debug it.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
List<int> energy = new() { 20, 35, 80 };
var query = energy.Where(value => value >= 35).Select(value => value - 35);
int[] snapshot = query.ToArray();
energy[1] = 40;
if (snapshot[0] != 0 || query.First() != 5)
    throw new Exception("Snapshot and deferred query were confused");
Console.WriteLine("QUERY TIMING PASSED");
```

## Challenge — revisit without blocking the course

This challenge is optional and can be deferred. All implementation needed later is in the guided path.

Add a disconnected goal and return a no-path result without indexing a missing parent. Explain why “keep searching forever” is not a valid representation of absence.

