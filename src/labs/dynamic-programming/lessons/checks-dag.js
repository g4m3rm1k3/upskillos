// "Check yourself" for the DAG and graph-recurrence lessons (Advanced, dag group). Format and checks:
// checks.js and checks.test.js; the numbers come from advanced-oracles.js, which lists every path or walk.

export const DAG_CHECKS = {
  'dag-paths': [
    {
      know: 'ways(v) adds ways(u) over every edge (u, v), with ways(s) = 1, processing vertices in topological order.',
      ask: 'Edges 0→1, 0→2, 0→3, 1→4, 2→4, 3→4, 1→2. How many paths go from 0 to 4?',
      args: [5, [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 4], [1, 2]], 0, 4], answer: 4,
      misconceptions: [
        { answer: 3, feedback: '3 counts the paths through 1, 2 and 3 once each. The edge 1→2 adds 0→1→2→4.' },
        { answer: 7, feedback: '7 is the number of edges.' },
      ],
      explain: 'ways: 1, 1, 2, 1, and ways(4) = 1 + 2 + 1 = 4: 0→1→4, 0→2→4, 0→1→2→4, 0→3→4.',
    },
    {
      know: 'Each vertex is processed once, and each edge passes one count along once.',
      ask: 'How much work does the count take?',
      options: [
        { text: 'O(V + E), linear in the size of the graph', right: true, why: 'A topological order is linear, and so is one pass over the edges, however many paths there are.' },
        { text: 'Proportional to the number of paths', why: 'There can be 2²⁰ paths in a graph of 61 vertices; the table never lists them.' },
        { text: 'O(V²) for every graph', why: 'Only the edges are read, so a sparse graph costs much less.' },
      ],
    },
    {
      know: 'The method needs a topological order, which exists only when there is no directed cycle.',
      ask: 'What goes wrong if the graph has a cycle on some path from s to t?',
      options: [
        { text: 'Nothing: the same sums still work', why: 'A vertex on the cycle would need its own count before that count is finished.' },
        { text: 'Walks can go round the cycle any number of times, so they are infinitely many; counting simple paths instead is a much harder problem', right: true, why: 'The DAG is what makes “each path has a unique last edge, and its prefix is finished first” work.' },
        { text: 'The count just doubles for each cycle', why: 'Each extra trip round the cycle gives a new walk, so there is no finite multiple.' },
      ],
    },
  ],

  'dag-longest': [
    {
      know: 'best(v) is the smallest best(u) + w over edges (u, v), filled in topological order; negative weights are fine.',
      ask: 'Edges 0→1 (3), 0→2 (1), 1→3 (−6), 2→3 (0). What is the cheapest cost from 0 to 3?',
      args: [4, [[0, 1, 3], [0, 2, 1], [1, 3, -6], [2, 3, 0]], 0, 3], answer: -3,
      misconceptions: [
        { answer: 1, feedback: '1 takes the cheaper first edge, 0→2. The dearer first edge leads to the −6.' },
        { answer: -6, feedback: '−6 is one edge; the path must start at 0: 3 + (−6).' },
      ],
      explain: '0→1→3 costs 3 − 6 = −3; 0→2→3 costs 1.',
    },
    {
      know: 'In a general graph, the longest simple path is a famously hard problem.',
      ask: 'How do you find the longest path in a DAG?',
      options: [
        { text: 'The same table with max instead of min (or with every weight negated)', right: true, why: 'With no cycles there is nothing to loop round, so the longest path has the same structure as the shortest.' },
        { text: 'It is hard in a DAG too', why: 'The hardness comes from cycles; a DAG has a topological order that makes it linear.' },
        { text: 'Dijkstra with max instead of min', why: 'Dijkstra’s greedy finalising fails for longest paths even on simple graphs; the topological order is what works.' },
      ],
    },
    {
      know: 'A vertex that no path from s reaches stays at ∞.',
      ask: 'Why must an unreached vertex not relax its outgoing edges?',
      options: [
        { text: 'Its ∞ plus a weight would still be ∞, so it does no harm either way', why: 'In code, ∞ is often a large number or None; adding to it can produce a bogus candidate or an error. Skip it.' },
        { text: 'A path through it doesn’t exist, so it must not offer any candidate', right: true, why: 'With a sentinel like a big number or None, relaxing it could invent a cost; skipping keeps answers to real paths only.' },
        { text: 'It must, so that every edge is used once', why: 'Using an edge from an unreachable vertex adds nothing real.' },
      ],
    },
  ],

  'increasing-grid': [
    {
      know: 'L(cell) = 1 + the largest L of a strictly larger neighbour; the answer is the largest L anywhere.',
      ask: 'grid = [[5, 4, 3], [6, 1, 2], [7, 8, 9]]. How long is the longest strictly increasing path?',
      args: [[[5, 4, 3], [6, 1, 2], [7, 8, 9]]], answer: 9,
      misconceptions: [
        { answer: 3, feedback: '3 is the bottom row 7 8 9. Starting at the centre 1, the values spiral up through every cell.' },
        { answer: 5, feedback: '5 stops at the top-left 5, but 6 is right below it.' },
      ],
      explain: '1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 spirals out from the centre.',
    },
    {
      know: 'Here a step must go to a strictly larger value.',
      ask: 'What breaks if steps to equal values are allowed?',
      options: [
        { text: 'Two equal neighbours form a cycle, so the moves are no longer a DAG and the recursion can loop', right: true, why: 'Strict increase is what guarantees no cell is revisited. With ≥ the problem becomes a longest path with cycles.' },
        { text: 'Nothing: the same recurrence works', why: 'L(a) would depend on L(b) and L(b) on L(a).' },
        { text: 'Only the answer changes by one', why: 'A flat region of equal values could be walked round in many ways; the recurrence has no order to follow.' },
      ],
    },
    {
      know: 'Each cell is computed once and looks at four neighbours.',
      ask: 'How much work does the memoized method take on an r × c grid?',
      options: [
        { text: 'O(r · c)', right: true, why: 'rc cells, constant work each. The recursion can go rc deep, so very large grids may need an explicit order instead.' },
        { text: 'O((r · c)²)', why: 'Each cell is solved once, not once per starting cell.' },
        { text: 'Exponential, like walking every path', why: 'Memoization stops repeated work; that is the difference.' },
      ],
    },
  ],

  'critical-path': [
    {
      know: 'finish(v) = durations[v] + the largest finish of v’s prerequisites; the answer is the largest finish.',
      ask: 'Durations [5, 1, 1, 1, 2]; task 1 before 2, 2 before 3, 3 before 4. When is everything finished?',
      args: [[5, 1, 1, 1, 2], [[1, 2], [2, 3], [3, 4]]], answer: 5,
      misconceptions: [
        { answer: 10, feedback: '10 adds every duration. Task 0 runs alongside the chain.' },
        { answer: 2, feedback: '2 is the last task’s duration. It waits for the chain before it, which ends at 3.' },
      ],
      explain: 'The chain 1 → 2 → 3 → 4 finishes at 1 + 1 + 1 + 2 = 5, and task 0 alone also takes 5.',
    },
    {
      know: 'A task is critical if delaying it delays the whole project.',
      ask: 'How are the critical tasks found?',
      options: [
        { text: 'They are the tasks with the longest durations', why: 'A long task off the slowest chain may have room to slip.' },
        { text: 'Compute latest start times backwards from the end; tasks whose earliest and latest starts are equal (zero slack) are critical', right: true, why: 'A second pass in reverse topological order gives each task’s latest finish; the difference is its slack.' },
        { text: 'Every task with a prerequisite', why: 'A dependent task may still finish early with time to spare.' },
      ],
    },
    {
      know: 'The method assumes unlimited workers, so every ready task starts at once.',
      ask: 'What changes with only two workers?',
      options: [
        { text: 'Only the answer, by at most a factor of two', why: 'The order in which tasks are given to workers matters, and finding the best order is a hard scheduling problem.' },
        { text: 'Nothing: the longest chain still decides', why: 'With few workers, independent tasks must wait for a free worker.' },
        { text: 'The problem becomes resource-constrained scheduling, which this simple DP doesn’t solve', right: true, why: 'The state would need which tasks are done and running, not just finish times along chains.' },
      ],
    },
  ],

  'bellman-ford-dp': [
    {
      know: 'Each round copies the previous round and relaxes every edge from the copy, adding at most one edge.',
      ask: 'Edges 0→1 (1), 1→2 (1), 0→2 (5), at most 1 edge. What is the cheapest cost from 0 to vertex 2?',
      args: [3, [[0, 1, 1], [1, 2, 1], [0, 2, 5]], 0, 1], part: 2, answer: 5,
      misconceptions: [
        { answer: 2, feedback: '2 uses two edges, 0→1→2. With an in-place update, the round can wrongly use both.' },
      ],
      explain: 'After one round only direct edges count: D(1, 2) = 5. A second round would give 2.',
    },
    {
      know: 'Without a negative cycle, a shortest walk never needs to repeat a vertex.',
      ask: 'How many rounds give the true shortest distances, with no edge limit?',
      options: [
        { text: 'n − 1 rounds, for n vertices', right: true, why: 'A simple path has at most n − 1 edges, so after n − 1 rounds nothing can improve.' },
        { text: 'As many rounds as there are edges', why: 'Paths are limited by vertices, not edges: n − 1 rounds suffice.' },
        { text: 'One round, if edges are relaxed in the right order', why: 'One round in a good order works only for a DAG; with cycles there may be no such order.' },
      ],
    },
    {
      know: 'If a round after n − 1 still improves some distance, a walk has found a way to get cheaper forever.',
      ask: 'What does an improvement in round n mean?',
      options: [
        { text: 'A rounding error', why: 'The weights are exact integers here.' },
        { text: 'The edge budget was too small', why: 'n − 1 edges are enough for every simple path; more means a cycle helps.' },
        { text: 'A negative cycle is reachable from s, so shortest walks have no minimum', right: true, why: 'Going round it once more always costs less. This is how Bellman–Ford detects negative cycles.' },
      ],
    },
  ],

  'floyd-warshall': [
    {
      know: 'For k outermost, D(i, j) = min(D(i, j), D(i, k) + D(k, j)); negative edges are fine without a negative cycle.',
      ask: 'Edges 0→1 (5), 1→2 (−3), 0→2 (4). What is the shortest distance from 0 to 2?',
      args: [3, [[0, 1, 5], [1, 2, -3], [0, 2, 4]]], oracle: 'floyd-first-last', answer: 2,
      misconceptions: [
        { answer: 4, feedback: '4 is the direct edge. Through 1: 5 + (−3) = 2.' },
        { answer: -3, feedback: '−3 is the edge from 1, but the path starts at 0.' },
      ],
      explain: 'When vertex 1 is allowed: D(0, 2) = min(4, 5 + (−3)) = 2.',
    },
    {
      know: 'D(i, i) starts at 0 and can only go down.',
      ask: 'How does the finished matrix reveal a negative cycle?',
      options: [
        { text: 'Some D(i, i) is negative', right: true, why: 'A path from i back to i with negative cost is a negative cycle through i.' },
        { text: 'Some entry is still ∞', why: 'That only means no path exists between that pair.' },
        { text: 'It can’t; Floyd–Warshall ignores cycles', why: 'The diagonal records the cheapest cycle through each vertex.' },
      ],
    },
    {
      know: 'Floyd–Warshall does n³ updates. Dijkstra from one source takes about E log V, but needs non-negative weights.',
      ask: 'When is Floyd–Warshall the natural choice?',
      options: [
        { text: 'Dense graphs, or negative edges, when every pair is needed and n is a few hundred', right: true, why: 'Three short loops, no priority queue, and negative edges allowed.' },
        { text: 'Huge sparse graphs such as road maps', why: 'n³ is far too slow for millions of vertices; run Dijkstra from the sources you need.' },
        { text: 'When only one pair is needed', why: 'One pair needs one shortest-path search, not the whole matrix.' },
      ],
    },
  ],

  'scc-boundaries': [
    {
      know: 'Collapse each strongly connected component (worth the sum of its values); best(c) = weight(c) + the best component it leads to.',
      ask: 'Values [1, 5, 1]; edges 0→1, 0→2, 2→0. Starting at 2, what is the largest total?',
      args: [[1, 5, 1], [[0, 1], [0, 2], [2, 0]], 2], answer: 7,
      misconceptions: [
        { answer: 2, feedback: '2 is the component {0, 2} alone; from 0 the walk can go on to 1, worth 5.' },
        { answer: 6, feedback: '6 goes 2 → 0 → 1 but forgets the start vertex 2 itself, worth 1.' },
      ],
      explain: '{0, 2} is worth 2; it leads to {1}, worth 5. 2 + 5 = 7.',
    },
    {
      know: 'A component counts as its total value because a walk can visit all of it.',
      ask: 'Why doesn’t collapsing components solve shortest paths in a cyclic graph the same way?',
      options: [
        { text: 'The cost of crossing a component depends on where you enter and leave it, which one number can’t express', right: true, why: 'Each component would need its entry-to-exit distances as its boundary information.' },
        { text: 'It does: give each component the sum of its edge weights', why: 'A shortest path uses only some edges of a component, entered and left at particular vertices.' },
        { text: 'Shortest paths never pass through cycles', why: 'They can pass through a component without going round a cycle; the problem is what one number can say about it.' },
      ],
    },
    {
      know: 'Tarjan’s and Kosaraju’s algorithms find all strongly connected components.',
      ask: 'How long do they take?',
      options: [
        { text: 'O(V + E), linear time', right: true, why: 'One or two depth-first searches. The reachability matrix in the reference solution is simpler but O(V³).' },
        { text: 'O(V³), like Floyd–Warshall', why: 'That is the transitive-closure way; a DFS-based method is linear.' },
        { text: 'Exponential, since cycles can be many', why: 'Components are found without listing cycles.' },
      ],
    },
  ],

  'dag-product': [
    {
      know: 'The state is (vertex, coupon held or spent); from a held state an edge can be paid in full or at half price.',
      ask: 'Edges 0→1 (9), 1→2 (1), 0→2 (9), one half-price coupon. What is the cheapest cost from 0 to 2?',
      args: [3, [[0, 1, 9], [1, 2, 1], [0, 2, 9]], 0, 2], answer: 4,
      misconceptions: [
        { answer: 5, feedback: '5 halves the 9 on the two-edge route: 4 + 1. The direct 9 halved is 4.' },
        { answer: 9, feedback: '9 doesn’t use the coupon.' },
      ],
      explain: 'Halve the direct edge: ⌊9 / 2⌋ = 4.',
    },
    {
      know: 'With one coupon the state has two modes per vertex.',
      ask: 'With up to k coupons, how many states are there?',
      options: [
        { text: 'V × (k + 1): each vertex with 0 to k coupons left', right: true, why: 'The product of the graph with a counter. Each mode layer still follows the topological order.' },
        { text: 'V × 2ᵏ: which coupons were used', why: 'The coupons are identical, so only how many are left matters.' },
        { text: 'V: the coupons just lower the costs', why: 'Arriving with different numbers of coupons left has different futures.' },
      ],
    },
    {
      know: 'Any finite extra condition (a mode, a counter, a remaining budget) can be paired with the vertex.',
      ask: 'What does this product construction cost in general?',
      options: [
        { text: 'The work multiplies by the number of modes', right: true, why: 'Each original edge becomes one transition per mode, so time and memory grow by that factor.' },
        { text: 'Nothing extra: the modes are free', why: 'Every vertex now has one value per mode.' },
        { text: 'It makes the problem exponential', why: 'Only if the number of modes is exponential, as with a set of visited vertices.' },
      ],
    },
  ],
}
