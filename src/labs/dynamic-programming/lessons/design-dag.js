// "Design it yourself" for the DAG and graph-recurrence lessons (Advanced, dag group). Format: designs.js.
// apply asks for a cell of each lesson's live table (tables.js), computed by the trace. Every other number
// was printed by advanced-oracles.js before it was typed. Bellman–Ford answers are lists and Floyd–Warshall answers
// are matrices; their questions ask for one entry (PICK in designs.test.js).

export const DAG_DESIGNS = {
  'dag-paths': {
    problem: 'Count the different paths from a start vertex s to a target t in a directed graph with no cycles.',
    tryFirst: {
      prompt: 'Edges 0→1, 0→2, 1→2, 1→3, 2→3. How many paths go from 0 to 3?',
      args: [4, [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3]], 0, 3], answer: 3,
      misconceptions: [
        { answer: 2, feedback: '2 counts the two-edge paths 0→1→3 and 0→2→3. The path 0→1→2→3 uses three edges and counts too.' },
        { answer: 5, feedback: '5 is the number of edges, not of paths.' },
      ],
      explain: '0→1→3, 0→2→3 and 0→1→2→3. Every path is fixed by its sequence of edges.',
    },
    steps: [
      { kind: 'state', ask: 'What should ways(v) hold?', options: [
        { text: 'The number of paths from s that end at v', right: true, why: 'Then the answer is ways(t), and each count can be built from counts of earlier vertices.' },
        { text: 'The number of edges into v', why: 'That is v’s in-degree. Two edges into v can each carry many paths.' },
      ] },
      { kind: 'split', ask: 'How are the paths that end at v divided?', options: [
        { text: 'By their last edge (u, v)', right: true, why: 'Every path into v has exactly one last edge, so the groups don’t overlap and cover every path.' },
        { text: 'By how many edges enter v', why: 'That is one number for v, not a way to sort paths; every path into v uses exactly one of those edges.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills ways(v)?', options: [
        { text: 'The largest ways(u) over edges (u, v)', why: 'The groups are disjoint, so their sizes add. A maximum would count only the biggest group.' },
        { text: 'ways(v) = the sum of ways(u) over edges (u, v)', right: true, why: 'Each path into u extends by the edge (u, v) to exactly one path into v.' },
      ] },
      { kind: 'base', ask: 'What starts the count?', options: [
        { text: 'ways(s) = 1 and every other vertex 0', right: true, why: 'The empty path at s is the one path every other path extends.' },
        { text: 'ways(v) = 1 for every vertex with no incoming edge', why: 'Only paths from s count. Another source’s paths would be added in.' },
      ] },
      { kind: 'order', ask: 'In what order are the vertices processed?', options: [
        { text: 'In order of vertex number', why: 'An edge may run from 5 to 2; vertex 2 would be finished before 5 adds to it.' },
        { text: 'Topological order: every edge goes from an earlier vertex to a later one', right: true, why: 'Then a vertex’s count is final before it is pushed along its outgoing edges.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'ways(t)', right: true, why: 'The paths from s that end at t.' },
        { text: 'The sum of ways over every vertex', why: 'That counts paths from s to every vertex, not just to t.' },
      ] },
    ],
    apply: { cell: [0, 4], misconceptions: [
      { answer: 2, feedback: '2 is ways(3) alone. The edge 1 → 4 brings ways(1) = 1 more.' },
      { answer: 1, feedback: 'Two edges come into 4, from 3 and from 1: add both counts, 2 + 1.' },
    ] },
  },

  'dag-longest': {
    problem: 'Find the cheapest path from s to t in a directed graph with no cycles, where edge weights may be negative.',
    tryFirst: {
      prompt: 'Edges 0→1 (2), 1→3 (2), 0→2 (5), 2→3 (−4). What is the cheapest cost from 0 to 3?',
      args: [4, [[0, 1, 2], [1, 3, 2], [0, 2, 5], [2, 3, -4]], 0, 3], answer: 1,
      misconceptions: [
        { answer: 4, feedback: '4 follows the cheapest first edge, 0→1. The expensive first edge leads to the −4.' },
        { answer: -4, feedback: '−4 is one edge. The path must start at 0: 5 + (−4).' },
      ],
      explain: '0→2→3 costs 5 − 4 = 1; 0→1→3 costs 4.',
    },
    steps: [
      { kind: 'state', ask: 'What should best(v) hold?', options: [
        { text: 'The cheapest cost of the cheapest edge into v', why: 'One edge says nothing about the path that reached its start.' },
        { text: 'The cheapest cost of a path from s to v', right: true, why: 'Then best(t) is the answer, and best(v) builds on best of earlier vertices.' },
      ] },
      { kind: 'split', ask: 'What is the last choice on a path to v?', options: [
        { text: 'Its last edge (u, v)', right: true, why: 'The cheapest path through that edge is the cheapest path to u plus the edge.' },
        { text: 'Whether it uses a negative edge', why: 'That doesn’t split the paths into smaller problems of the same kind.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills best(v)?', options: [
        { text: 'best(v) = the smallest best(u) + w over edges (u, v)', right: true, why: 'Try every last edge and keep the cheapest. Negative w is fine: nothing is assumed about signs.' },
        { text: 'best(v) = the smallest w over edges (u, v)', why: 'That ignores what it cost to reach u.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'best(s) = 0 and every other vertex unknown (∞)', right: true, why: 'An unknown vertex must never offer a candidate, or an unreachable vertex could look cheap.' },
        { text: 'Every vertex starts at 0', why: 'Then a vertex no path reaches would offer cost 0 to its neighbours.' },
      ] },
      { kind: 'order', ask: 'Why are negative edges safe here, unlike in Dijkstra’s method?', options: [
        { text: 'Topological order finishes every vertex before its edges are used, whatever the signs', right: true, why: 'Dijkstra finalises the cheapest unfinished vertex, which a later negative edge can undercut. A topological order never needs that guess.' },
        { text: 'They aren’t; negative edges need Bellman–Ford', why: 'Bellman–Ford handles cycles. With no cycles, one pass in topological order is exact.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'best(t), or “unreachable” if it is still ∞', right: true, why: 'An ∞ means no path from s reaches t.' },
        { text: 'The smallest value in the table', why: 'That may belong to a vertex other than t.' },
      ] },
    ],
    apply: { cell: [0, 3], misconceptions: [
      { answer: 1, feedback: '1 uses best(1) = 5 from the direct edge. Through 2, best(1) is 2 + 1 = 3, so 3 − 4 = −1.' },
      { answer: 8, feedback: '8 comes through 2. The edge from 1 is cheaper: 3 − 4.' },
    ] },
  },

  'increasing-grid': {
    problem: 'Find the longest path through a grid that moves to neighbouring cells (up, down, left, right) and only onto strictly larger values.',
    tryFirst: {
      prompt: 'grid = [[3, 1], [4, 2]]. How many cells does the longest strictly increasing path visit?',
      args: [[[3, 1], [4, 2]]], answer: 3,
      misconceptions: [
        { answer: 4, feedback: '4 visits 1, 2, 3, 4 in order, but 2 and 3 are diagonal, not neighbours.' },
        { answer: 2, feedback: '2 stops too soon: 1 → 3 → 4 continues upward.' },
      ],
      explain: '1 → 3 → 4, or 1 → 2 → 4: three cells.',
    },
    steps: [
      { kind: 'state', ask: 'What should L(cell) hold?', options: [
        { text: 'The longest increasing path that starts at this cell', right: true, why: 'Then it depends only on larger neighbours, which are “later” in value.' },
        { text: 'The longest increasing path anywhere in the grid that passes this cell', why: 'That mixes what comes before and after the cell; starting at it is enough.' },
      ] },
      { kind: 'split', ask: 'What is the first choice from a cell?', options: [
        { text: 'Which strictly larger neighbour to step to, or to stop', right: true, why: 'Each option leaves the same kind of problem from the next cell.' },
        { text: 'Which direction to keep moving in for the rest of the path', why: 'A path may turn at every step.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills L(cell)?', options: [
        { text: 'L = 1 + the largest L of a strictly larger neighbour, or 1 if none', right: true, why: 'Count this cell, then continue as far as possible.' },
        { text: 'L = 1 + the largest L of any neighbour', why: 'A smaller or equal neighbour can’t be stepped to, and equal values could loop forever.' },
      ] },
      { kind: 'base', ask: 'What ends the recursion?', options: [
        { text: 'A cell with no larger neighbour has L = 1', right: true, why: 'The path is just the cell itself.' },
        { text: 'The edge of the grid has L = 0', why: 'Edges just have fewer neighbours; a cell on the edge still counts as 1.' },
      ] },
      { kind: 'order', ask: 'Why does the memoized recursion always finish?', options: [
        { text: 'Values strictly increase along a path, so no cell can be revisited: the moves form a DAG', right: true, why: 'Equivalently, fill cells in decreasing order of value.' },
        { text: 'Because the grid is finite', why: 'A finite graph with a cycle could recurse forever. Strict increase rules cycles out.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest L over every cell', right: true, why: 'The longest path may start anywhere.' },
        { text: 'L of the smallest cell', why: 'The smallest cell may sit in a corner with a short way up.' },
      ] },
    ],
    apply: { cell: [2, 1], misconceptions: [
      { answer: 3, feedback: '3 is the best neighbour’s L. Add 1 for this cell itself.' },
      { answer: 6, feedback: 'Only one neighbour is followed: take the larger, 3, then add 1.' },
    ] },
  },

  'critical-path': {
    problem: 'Tasks have durations and prerequisites. With unlimited workers, find when the last task finishes.',
    tryFirst: {
      prompt: 'Task 0 takes 3, task 1 takes 2, task 2 takes 4 and waits for both 0 and 1. When is everything finished?',
      args: [[3, 2, 4], [[0, 2], [1, 2]]], answer: 7,
      misconceptions: [
        { answer: 9, feedback: '9 adds every duration. Tasks 0 and 1 run at the same time.' },
        { answer: 6, feedback: '6 starts task 2 after task 1, but it must also wait for task 0, which ends at 3.' },
      ],
      explain: 'Tasks 0 and 1 start at once; task 2 starts at 3, when the slower one ends, and finishes at 7.',
    },
    steps: [
      { kind: 'state', ask: 'What should finish(v) hold?', options: [
        { text: 'The earliest time task v can be finished', right: true, why: 'Then each task builds on its prerequisites’ finish times.' },
        { text: 'The total duration of every task before v in the list', why: 'The list order is not the dependency order, and parallel tasks don’t add.' },
      ] },
      { kind: 'split', ask: 'What decides when v can start?', options: [
        { text: 'The first of its prerequisites to finish', why: 'v needs all of them done, so it waits for the last.' },
        { text: 'The last of its prerequisites to finish', right: true, why: 'v starts once every prerequisite is done.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills finish(v)?', options: [
        { text: 'finish(v) = durations[v] + the largest finish of v’s prerequisites', right: true, why: 'The slowest chain into v sets its start.' },
        { text: 'finish(v) = durations[v] + the sum of its prerequisites’ finishes', why: 'Prerequisites run in parallel; their times overlap.' },
      ] },
      { kind: 'base', ask: 'What about a task with no prerequisites?', options: [
        { text: 'It starts at 0, so finish(v) = durations[v]', right: true, why: 'Nothing holds it back, so it starts at time 0.' },
        { text: 'It finishes at 0', why: 'It still takes its own duration.' },
      ] },
      { kind: 'order', ask: 'In what order are tasks processed?', options: [
        { text: 'Topological order of the dependencies', right: true, why: 'A task is processed only after all its prerequisites.' },
        { text: 'Shortest duration first', why: 'A short task may depend on a long one that isn’t finished yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest finish time over every task', right: true, why: 'Everything is done when the slowest chain is done, wherever it ends.' },
        { text: 'The finish time of the last task in the list', why: 'The list order means nothing; another task may finish later.' },
      ] },
    ],
    apply: { cell: [0, 4], misconceptions: [
      { answer: 13, feedback: '13 adds both prerequisites’ finishes. Task 4 waits only for the later one, 7.' },
      { answer: 6, feedback: '6 waits for the earlier prerequisite. It must wait for both, so for 7.' },
    ] },
  },

  'bellman-ford-dp': {
    problem: 'In a directed graph that may have cycles and negative edges, find the cheapest cost from s to each vertex using at most k edges.',
    tryFirst: {
      prompt: 'Edges 0→1 (4), 1→2 (5), 0→2 (12), at most 1 edge. What is the cheapest cost from 0 to vertex 2?',
      args: [3, [[0, 1, 4], [1, 2, 5], [0, 2, 12]], 0, 1], answer: 12,
      misconceptions: [
        { answer: 9, feedback: '9 goes through vertex 1, using two edges. The budget is one.' },
      ],
      explain: 'With one edge only the direct edge reaches 2: 12. With two, 4 + 5 = 9 would win.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(k, v) hold?', options: [
        { text: 'The cheapest walk from s to v with at most k edges', right: true, why: 'The edge count is part of the state, so cycles can’t make the recursion go round forever.' },
        { text: 'The cheapest walk from s to v', why: 'Without the edge count, a cycle makes D(v) depend on itself.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The last edge (u, v), or using fewer than k edges', right: true, why: 'Either the walk uses at most k − 1 edges, or it ends with an edge from a walk of k − 1.' },
        { text: 'Whether the walk repeats a vertex', why: 'That doesn’t leave smaller problems of the same kind; the edge budget does.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(k, v)?', options: [
        { text: 'min(D(k − 1, v), the smallest D(k − 1, u) + w over edges (u, v))', right: true, why: 'Keep the shorter walk, or extend a walk of k − 1 edges by one.' },
        { text: 'The smallest D(k, u) + w over edges (u, v)', why: 'Reading the same round lets one round add several edges.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0, s) = 0, every other D(0, v) = ∞', right: true, why: 'With no edges only s is reached.' },
        { text: 'D(0, v) = the edge weight from s to v', why: 'That is D(1, v). With zero edges, only s.' },
      ] },
      { kind: 'order', ask: 'How is each round filled?', options: [
        { text: 'Copy the previous round, then relax every edge from the copy', right: true, why: 'Reading only the previous round adds at most one edge per round.' },
        { text: 'Relax edges in place in one array', why: 'In place, an edge relaxed early in the round can feed another in the same round.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer for vertex v?', options: [
        { text: 'D(k, v), or “unreachable” if it is ∞', right: true, why: 'At most k edges, ending at v.' },
        { text: 'The smallest D(j, v) over every j, even past k', why: 'Rounds past k use more edges than allowed.' },
      ] },
    ],
    apply: { cell: [3, 3], misconceptions: [
      { answer: 5, feedback: '5 keeps the row above. With a third edge, D(2,1) + 1 = 4 is cheaper.' },
      { answer: 6, feedback: '6 comes through vertex 2. Through vertex 1 it is 3 + 1 = 4.' },
    ] },
  },

  'floyd-warshall': {
    problem: 'Find the shortest distance between every pair of vertices in a directed graph with no negative cycle.',
    tryFirst: {
      prompt: 'Edges 0→1 (4), 1→2 (1), 0→2 (7). What is the shortest distance from 0 to 2?',
      args: [3, [[0, 1, 4], [1, 2, 1], [0, 2, 7]]], answer: 5,
      misconceptions: [
        { answer: 7, feedback: '7 is the direct edge. Going through 1 costs 4 + 1.' },
      ],
      explain: '0→1→2 costs 5, less than the direct 7.',
    },
    steps: [
      { kind: 'state', ask: 'What should D_k(i, j) hold?', options: [
        { text: 'The shortest path from i to j using only vertices 0 … k − 1 in between', right: true, why: 'Adding one allowed intermediate at a time gives a clean recurrence.' },
        { text: 'The shortest path from i to j that passes through vertex k', why: 'Forcing k into every path gives wrong distances whenever avoiding k is shorter.' },
      ] },
      { kind: 'split', ask: 'What is the choice when vertex k becomes allowed?', options: [
        { text: 'The shortest path either goes through k or it doesn’t', right: true, why: 'If it does, it splits at k into two paths that use only earlier vertices.' },
        { text: 'Whether the path has more than k edges', why: 'The index here is which vertices may be used in between, not how many edges.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule updates D(i, j)?', options: [
        { text: 'min(D(i, j), D(i, k) + D(k, j))', right: true, why: 'Avoid k, or go i → k → j with each half using earlier vertices.' },
        { text: 'D(i, k) + D(k, j)', why: 'That forces every path through k, even when avoiding it is shorter.' },
      ] },
      { kind: 'base', ask: 'What starts the matrix?', options: [
        { text: '0 on the diagonal, the cheapest direct edge where there is one, ∞ elsewhere', right: true, why: 'With no intermediates allowed, only direct edges count.' },
        { text: '∞ everywhere, including the diagonal', why: 'Every vertex reaches itself at cost 0.' },
      ] },
      { kind: 'order', ask: 'Which loop must be outermost?', options: [
        { text: 'k, the newly allowed intermediate', right: true, why: 'Every pair must see the round for k − 1 finished before k is allowed.' },
        { text: 'i, the start vertex', why: 'With i outermost, a path through a later k is used before its halves are final.' },
      ] },
      { kind: 'answer', ask: 'Where are the answers?', options: [
        { text: 'The whole matrix after the last k', right: true, why: 'Every vertex is then allowed in between.' },
        { text: 'The row of the first vertex', why: 'That gives distances from vertex 0 only.' },
      ] },
    ],
    apply: { cell: [12, 3], misconceptions: [
      { answer: 15, feedback: '15 keeps the block above. Allowing vertex 2 gives D2(0,2) + D2(2,3) = 8 + 1.' },
      { answer: 10, feedback: '10 uses the direct 9 from 0 to 2, but D2(0,2) is already 8 through vertex 1.' },
    ] },
  },

  'scc-boundaries': {
    problem: 'Vertices of a directed graph (with cycles) carry values. A walk from s may revisit vertices; find the largest total of the different vertices it can visit.',
    tryFirst: {
      prompt: 'Values [3, 4, 5, 1]; edges 0→1, 1→0, 1→2, 0→3. Starting at 0, what is the largest total?',
      args: [[3, 4, 5, 1], [[0, 1], [1, 0], [1, 2], [0, 3]], 0], answer: 12,
      misconceptions: [
        { answer: 13, feedback: '13 visits everything, but after reaching 2 or 3 there is no way back, and they are on different branches.' },
        { answer: 8, feedback: '8 collects 0 and 1 and then heads to 3, worth 1. Heading to 2 instead is worth 5.' },
      ],
      explain: '0 and 1 reach each other (worth 7 together); then the walk goes to 2 (5) or 3 (1). 7 + 5 = 12.',
    },
    steps: [
      { kind: 'state', ask: 'What is the right unit of state?', options: [
        { text: 'A strongly connected component: a set of vertices that all reach each other', right: true, why: 'Inside one, a walk can collect every vertex, so the component acts as one vertex.' },
        { text: 'A single vertex, ignoring what was already visited', why: 'Then a walk round a cycle would collect the same values again and again.' },
      ] },
      { kind: 'split', ask: 'What does collapsing every component give?', options: [
        { text: 'A graph with no cycles, the condensation', right: true, why: 'A cycle between components would merge them into one.' },
        { text: 'A tree', why: 'It is a DAG; a component can be reached from several others.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills best(c) for a component c?', options: [
        { text: 'weight(c) + the largest best of a component c leads to (0 if none)', right: true, why: 'Collect the whole component, then continue along the best branch.' },
        { text: 'weight(c) + the sum of best over the components c leads to', why: 'Once the walk leaves along one branch it can’t come back for another.' },
      ] },
      { kind: 'base', ask: 'What is a component worth on its own?', options: [
        { text: 'The sum of its vertices’ values', right: true, why: 'The walk can visit all of them. That scalar is valid for this objective; for others (a shortest path) it isn’t.' },
        { text: 'Its largest value', why: 'Every vertex in it can be visited, so all their values count.' },
      ] },
      { kind: 'order', ask: 'In what order are components filled?', options: [
        { text: 'Reverse topological order (or memoized recursion)', right: true, why: 'best(c) reads the components after c.' },
        { text: 'By size', why: 'Size has nothing to do with dependencies.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'best of s’s component', right: true, why: 'The walk starts in s’s component.' },
        { text: 'The largest best over every component', why: 'The walk must start at s; another component may be unreachable from it.' },
      ] },
    ],
    apply: { cell: [0, 2], misconceptions: [
      { answer: 21, feedback: '21 collects both branches. The walk leaves along one of them and can’t come back.' },
      { answer: 6, feedback: '6 is the component alone. It leads on to {3, 4} or {5}.' },
    ] },
  },

  'dag-product': {
    problem: 'In a directed graph with no cycles, find the cheapest path from s to t when one edge of your choice may be paid at half price (⌊w / 2⌋).',
    tryFirst: {
      prompt: 'Edges 0→1 (6), 1→2 (6), 0→2 (20), one half-price coupon. What is the cheapest cost from 0 to 2?',
      args: [3, [[0, 1, 6], [1, 2, 6], [0, 2, 20]], 0, 2], answer: 9,
      misconceptions: [
        { answer: 10, feedback: '10 halves the most expensive edge, 20. The cheap route with one edge halved costs 6 + 3.' },
        { answer: 12, feedback: '12 is the cheapest path without the coupon. Use it: 6 + 3.' },
      ],
      explain: '0→1→2 with one 6 halved: 3 + 6 = 9. The direct edge halved costs 10.',
    },
    steps: [
      { kind: 'state', ask: 'What should a state hold?', options: [
        { text: 'best(v) = the cheapest cost to reach v, coupon used or not', why: 'Reaching v cheaply by spending the coupon may be worse than arriving a little dearer with it still in hand.' },
        { text: 'best(v, held) = the cheapest cost to reach v with the coupon still held (held = 1) or spent (held = 0)', right: true, why: 'The two situations have different futures, so each gets its own value: a product of the graph with the mode.' },
      ] },
      { kind: 'split', ask: 'What choices does an edge from a held state offer?', options: [
        { text: 'Pay it in full and keep the coupon, or pay half and spend it', right: true, why: 'Both lead to valid states at the next vertex.' },
        { text: 'Always use the coupon on the first edge', why: 'The best edge to halve may come later.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills best(v, 0)?', options: [
        { text: 'min over edges (u, v) of best(u, 0) + w and best(u, 1) + ⌊w / 2⌋', right: true, why: 'Arrive spent: either it was already spent, or it is spent on this edge.' },
        { text: 'min over edges (u, v) of best(u, 0) + ⌊w / 2⌋', why: 'Once spent, the coupon can’t halve another edge.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'best(s, 1) = 0; everything else ∞', right: true, why: 'At the start the coupon is unspent and nothing is paid.' },
        { text: 'best(s, 0) = 0 and best(s, 1) = ∞', why: 'That starts with the coupon already spent, so it is never used.' },
      ] },
      { kind: 'order', ask: 'In what order are states filled?', options: [
        { text: 'By vertex in topological order, both modes at each vertex', right: true, why: 'Every edge goes forward in the graph, so the product graph is acyclic in the same order.' },
        { text: 'All spent states first, then all held ones', why: 'A spent state reads held states (the edge where the coupon is used), so the held ones must be ready first.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'min(best(t, 0), best(t, 1))', right: true, why: 'The coupon may be spent or not on arrival.' },
        { text: 'best(t, 1)', why: 'That forbids using the coupon at all.' },
      ] },
    ],
    apply: { cell: [1, 4], misconceptions: [
      { answer: 13, feedback: '13 arrives already spent from 3. Spending the coupon on 1 → 4 is better: 2 + 10.' },
      { answer: 15, feedback: '15 halves the most expensive edge, the direct 30. Halving the 20 after 0 → 1 gives 2 + 10.' },
    ] },
  },
}
