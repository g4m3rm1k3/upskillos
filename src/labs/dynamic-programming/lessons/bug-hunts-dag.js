// Bug hunts for the DAG lessons (Advanced, dag group). Format: bug-hunts.js. Each symptom is the
// smallest clear input a search found where the buggy code and advanced-oracles.js disagree.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const DAG_HUNTS = {
  'dag-paths': {
    know: 'ways[v] counts the paths from s to v. Pushing ways[v] along v’s edges is only right once ways[v] is final, that is, once every edge into v has already added its count. A topological order guarantees that; vertex numbers do not.',
    swap: pair(['    for v in order:\n        for a, b in edges:', '    for v in range(n):\n        for a, b in edges:'], ['  for (const v of order) {', '  for (let v = 0; v < n; v++) {']),
    symptom: { args: [3, [[1, 0], [0, 2]], 1, 2], expected: 1, buggy: 0 },
    bug: 'Filled out of dependency order',
    why: 'The loop visits vertices 0, 1, 2 by number. Vertex 0 is pushed along its edge to 2 while ways[0] is still 0, because the edge 1→0 has not been processed yet. When vertex 1 later adds its path to 0, vertex 0 has already been used. So {call} returned {got} instead of {want}.',
    fix: 'Loop over the topological order the code already built: for v in order. A vertex is then pushed along its edges only after all its incoming edges have added their counts.',
    clues: [
      'Print v and ways at each step of the main loop. Is any vertex pushed while its count can still grow?',
      'In the symptom the start is vertex 1, not 0. Which vertex does the loop visit first?',
      'The code computes order but does the main loop use it?',
    ],
    decoys: [
      [['ways[s] = 1', 'ways[s] = 1'], 'The empty path at s is the one path every other extends. Right.'],
      [['ways[b] += ways[v]', 'ways[b] += ways[v]'], 'Each path to v extends along (v, b) to one path to b, and the groups add. The rule is right.'],
      [['return ways[t]', 'return ways[t]'], 'The paths from s that end at t. Right.'],
    ],
  },

  'dag-longest': {
    know: 'best[v] is the cheapest known cost from s to v. A vertex no path has reached yet must be marked unknown (None or null), so that it never offers a candidate along its edges and t can be reported unreachable.',
    swap: pair(['    best = [None] * n', '    best = [0] * n'], ['  const best = Array(n).fill(null)', '  const best = Array(n).fill(0)']),
    symptom: { args: [3, [[0, 1, 2]], 0, 2], expected: null, buggy: 0 },
    bug: 'Unknown treated as zero',
    why: 'Every vertex starts at cost 0, as if it had already been reached for free. Vertex 2 has no path from 0 at all, yet it keeps its starting 0, so {call} returned {got} instead of {want}. With other edges, an unreached vertex would also offer cost 0 to its neighbours.',
    fix: 'Start every vertex as unknown, best = [None] * n (Array(n).fill(null)), and set only best[s] = 0. The check “if best[v] is None: continue” then skips vertices no path reaches.',
    clues: [
      'Which vertices has a path from s really reached in the symptom?',
      'What does best[2] hold before any edge is relaxed, and does anything change it?',
      'What should the function return when t can’t be reached?',
    ],
    decoys: [
      [['best[s] = 0', 'best[s] = 0'], 'Reaching s costs nothing. Right.'],
      [['best[v] + w < best[b]', 'best[v] + w < best[b]'], 'Relaxing an edge: a cheaper way to b through v. Right.'],
      [['return best[t]', 'return best[t]'], 'The cheapest cost to t, or unknown. Right, if unknown is kept as unknown.'],
    ],
  },

  'increasing-grid': {
    know: 'longest(i, j) is the longest strictly increasing path that starts at cell (i, j). The longest path in the whole grid can start at any cell, so the answer is the largest longest(i, j) over every cell.',
    swap: pair(['    return max(longest(i, j) for i in range(r) for j in range(c))', '    return longest(0, 0)'], ['  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) answer = Math.max(answer, longest(i, j))', '  answer = longest(0, 0)']),
    symptom: { args: [[[3, 1, 2]]], expected: 2, buggy: 1 },
    bug: 'The answer read from one start',
    why: 'The code returns the longest path from the top-left cell only. There the value is 3, and neither neighbour is larger, so its path is just 1 cell. The best path starts at the 1 and steps to the 3 or the 2: {call} returned {got} instead of {want}.',
    fix: 'Take the largest longest(i, j) over every cell: return max(longest(i, j) for i in range(r) for j in range(c)).',
    clues: [
      'Where does the longest path in the symptom start?',
      'Which cells does the code ask longest about before returning?',
      'Print longest(i, j) for all three cells.',
    ],
    decoys: [
      [['grid[a][b] > grid[i][j]', 'grid[a][b] > grid[i][j]'], 'Only strictly larger neighbours: that keeps the moves acyclic. Right.'],
      [['1 + longest(a, b)', '1 + longest(a, b)'], 'This cell, then the longest path from the neighbour. Right.'],
      [['best = 1', 'let best = 1'], 'A cell on its own is a path of length 1. Right.'],
    ],
  },

  'critical-path': {
    know: 'A task can start once all its prerequisites have finished. Prerequisites run at the same time, so the start is the latest of their finish times: a maximum, not a sum.',
    swap: pair(['                start = max(start, finish[a])', '                start = start + finish[a]'], ['      if (b === v) start = Math.max(start, finish[a])', '      if (b === v) start = start + finish[a]']),
    symptom: { args: [[1, 2, 3, 1], [[0, 1], [0, 2], [1, 3], [2, 3]]], expected: 5, buggy: 8 },
    bug: 'Parallel work added up',
    why: 'Task 3 waits for tasks 1 and 2, which finish at 3 and 4. It can start at 4, the later of the two. The code adds the two finish times, 3 + 4 = 7, as if each prerequisite only started when the other finished, so {call} returned {got} instead of {want}.',
    fix: 'start = max(start, finish[a]): wait for the slowest prerequisite only.',
    clues: [
      'Print finish after each task. Which is the first value that is too large?',
      'Task 3 has two prerequisites. Do they run one after the other or at the same time?',
      'On paper: tasks 1 and 2 both start at time 1. When are both done?',
    ],
    decoys: [
      [['finish[v] = start + durations[v]', 'finish[v] = start + durations[v]'], 'A task finishes its own duration after it starts. Right.'],
      [['start = 0', 'let start = 0'], 'With no prerequisites a task starts at 0. Right.'],
      [['return max(finish', 'return Math.max(0, ...finish)'], 'Everything is done when the last task finishes. Right.'],
    ],
  },

  'bellman-ford-dp': {
    know: 'After round r, best[v] must be the cheapest walk to v with at most r edges. A round may extend only walks from the previous round, so it reads a copy, prev, made before the round starts; reading the array being updated lets one round add several edges.',
    swap: pair(['        prev = best[:]', '        prev = best'], ['    const prev = best.slice()', '    const prev = best']),
    symptom: { args: [3, [[0, 1, 2], [1, 2, 1]], 0, 1], expected: [0, 2, null], buggy: [0, 2, 3] },
    bug: 'A round reads its own updates',
    why: 'prev = best makes prev another name for the same list, not a copy. In the one allowed round, the edge 0→1 sets best[1] = 2, and then the edge 1→2 reads that new value and sets best[2] = 3: two edges in one round. With a budget of 1 edge, vertex 2 is out of reach, so {call} returned {got} instead of {want}.',
    fix: 'Copy the previous round: prev = best[:] (best.slice() in JavaScript). Then every relaxation in a round reads only walks with one edge fewer.',
    clues: [
      'How many edges does the walk to vertex 2 use, and how many does the budget allow?',
      'After prev = best, if you change best[1], what is prev[1]?',
      'Swap the order of the two edges in the list. Does the answer change? Should it?',
    ],
    decoys: [
      [['best[s] = 0', 'best[s] = 0'], 'With no edges only s is reached. Right.'],
      [['prev[a] + w < best[b]', 'prev[a] + w < best[b]'], 'Extend a walk from the previous round by one edge, keeping the cheaper. Right, if prev really is the previous round.'],
      [['return best', 'return best'], 'Every vertex’s cheapest walk within the budget. Right.'],
    ],
  },

  'floyd-warshall': {
    know: 'After the round for k, d[i][j] is the shortest path that uses only vertices 0 … k in between. That only works with k as the outermost loop: every pair must finish the round for k − 1 before vertex k is allowed.',
    swap: pair(['    for k in range(n):\n        for i in range(n):\n            for j in range(n):', '    for i in range(n):\n        for j in range(n):\n            for k in range(n):'], ['  for (let k = 0; k < n; k++) {\n    for (let i = 0; i < n; i++) {\n      for (let j = 0; j < n; j++) {', '  for (let i = 0; i < n; i++) {\n    for (let j = 0; j < n; j++) {\n      for (let k = 0; k < n; k++) {']),
    symptom: { args: [4, [[1, 0, 1], [2, 3, 1], [3, 1, 1]]], expected: [[0, null, null, null], [1, 0, null, null], [3, 2, 0, 1], [2, 1, null, 0]], buggy: [[0, null, null, null], [1, 0, null, null], [null, 2, 0, 1], [2, 1, null, 0]] },
    bug: 'The k loop is innermost',
    why: 'With k innermost, d[2][0] is settled in one go, trying every k, before d[2][1] and d[3][0] have been improved. The only path, 2→3→1→0, needs both of those two-edge distances, which are still infinite at that moment. So the entry from 2 to 0 stays unreachable: {call} returned {got} instead of {want}.',
    fix: 'Make k the outermost loop, then i, then j. Each round allows one more intermediate vertex for every pair.',
    clues: [
      'Which entry of the matrix is wrong, and what is the path it should find?',
      'When d[2][0] is computed, have d[2][1] and d[3][0] been improved yet?',
      'In the invariant “only vertices 0 … k in between”, which loop has to change slowest?',
    ],
    decoys: [
      [['d[a][b] = min(d[a][b], w)', 'd[a][b] = Math.min(d[a][b], w)'], 'Direct edges, keeping the cheaper of two parallel ones. Right.'],
      [['d[i][k] + d[k][j] < d[i][j]', 'd[i][k] + d[k][j] < d[i][j]'], 'The update itself, avoid k or go through it, is right. The order around it matters.'],
      [['None if x == INF', 'x === Infinity ? null : x'], 'Unreachable pairs reported as None. Right.'],
    ],
  },

  'scc-boundaries': {
    know: 'A walk collects a whole component, then leaves it along one edge and can never come back. So best(c) is the component’s value plus the best of the components it leads to: a maximum over the branches, because only one can be taken.',
    swap: pair(['            memo[c] = weight[c] + max(after, default=0)', '            memo[c] = weight[c] + sum(after)'], ['        if (comp[a] === c && comp[b] !== c) after = Math.max(after, best(comp[b]))', '        if (comp[a] === c && comp[b] !== c) after = after + best(comp[b])']),
    symptom: { args: [[1, 5, 2], [[0, 1], [0, 2]], 0], expected: 6, buggy: 8 },
    bug: 'Both branches collected',
    why: 'From vertex 0 the walk can go to 1 or to 2, but not to both: nothing leads back. The code adds the two branches, 5 + 2, as if the walk could visit each, so {call} returned {got} instead of {want}.',
    fix: 'Take the best branch: weight[c] + max(after, default=0) (after = Math.max(after, …) in JavaScript).',
    clues: [
      'Can a walk from 0 visit both 1 and 2?',
      'Print best for each component. Which one is too large?',
      'Add a third branch. Should the answer grow with every branch?',
    ],
    decoys: [
      [['weight[comp[v]] =', 'weight[comp[v]] ='], 'A component is worth the sum of its values, since a walk can visit all of it. Right.'],
      [['comp = [min(j', 'const comp = values.map'], 'Vertices that reach each other share a component. Right.'],
      [['return best(comp[s])', 'return best(comp[s])'], 'The walk starts in s’s component. Right.'],
    ],
  },

  'dag-product': {
    know: 'best[v][1] is the cheapest cost to v with the coupon still held, best[v][0] after spending it. At the start the coupon has not been used, so only best[s][1] is 0; the spent states are reached only by using the coupon on some edge.',
    swap: pair(['    best[s][1] = 0', '    best[s][0] = 0'], ['  best[s][1] = 0', '  best[s][0] = 0']),
    symptom: { args: [3, [[0, 1, 4], [1, 2, 6]], 0, 2], expected: 7, buggy: 10 },
    bug: 'Started in the wrong mode',
    why: 'The code starts at s with the coupon already spent, so every edge is paid in full and the coupon is never used. The route 0→1→2 costs 4 + 6 = 10, while halving the 6 gives 4 + 3 = 7: {call} returned {got} instead of {want}.',
    fix: 'Start in the held mode: best[s][1] = 0. Then each edge from a held state can be paid in full or with the coupon.',
    clues: [
      'Does the answer ever use the coupon? Try a single edge of weight 9.',
      'Which of s’s two states is set at the start, and what does that index mean?',
      'Print best[v] for every vertex: which mode do the values live in?',
    ],
    decoys: [
      [['improve(b, 1, best[v][1] + w)', 'improve(b, 1, best[v][1] + w)'], 'Paying in full keeps the coupon held. Right.'],
      [['improve(b, 0, best[v][0] + w)', 'improve(b, 0, best[v][0] + w)'], 'Once spent, edges are paid in full. Right.'],
      [['options = [x for x', 'const options = best[t]'], 'Arriving with or without the coupon: the cheaper. Right.'],
    ],
  },
}
