// Reference solutions explained line by line for the DAG lessons (Advanced, dag group). Format:
// explained.js. explained.test.js runs each version against its challenge in JavaScript and real Python.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

// Kahn's algorithm, written out in each solution that needs a topological order.
const topoPy = `    indeg = [0] * n
    for e in edges:
        indeg[e[1]] += 1
    order = [v for v in range(n) if indeg[v] == 0]
    for v in order:
        for e in edges:
            if e[0] == v:
                indeg[e[1]] -= 1
                if indeg[e[1]] == 0:
                    order.append(e[1])
`
const topoJs = `  const indeg = Array(n).fill(0)
  for (const e of edges) indeg[e[1]]++
  const order = []
  for (let v = 0; v < n; v++) if (indeg[v] === 0) order.push(v)
  for (let i = 0; i < order.length; i++) {
    for (const e of edges) {
      if (e[0] === order[i] && --indeg[e[1]] === 0) order.push(e[1])
    }
  }
`
const topoNotes = [
  ['indeg = [0] * n', 'const indeg = Array(n).fill(0)', 'indeg[v] counts the edges into v that are not yet “used up”. A vertex is ready once it reaches 0.'],
  ['order = [v for v', 'const order = []', 'Start with every vertex that has no incoming edge. order grows as more vertices become ready, and ends as a topological order.'],
]

export const DAG_EXPLAINED = {
  'dag-paths': {
    code: pair(`def solve(n, edges, s, t):
${topoPy}    ways = [0] * n
    ways[s] = 1
    for v in order:
        for a, b in edges:
            if a == v:
                ways[b] += ways[v]
    return ways[t]
`, `function solve(n, edges, s, t) {
${topoJs}  const ways = Array(n).fill(0)
  ways[s] = 1
  for (const v of order) {
    for (const [a, b] of edges) {
      if (a === v) ways[b] += ways[v]
    }
  }
  return ways[t]
}
`),
    notes: [
      ...topoNotes,
      ['ways = [0] * n', 'const ways = Array(n).fill(0)', 'ways[v] will hold the number of paths from s that end at v.'],
      ['ways[s] = 1', 'ways[s] = 1', 'The empty path at s: the one path every other path extends.'],
      ['for v in order:', 'for (const v of order)', 'In topological order, every edge into v has already added its count, so ways[v] is final here.'],
      ['ways[b] += ways[v]', 'ways[b] += ways[v]', 'Each path to v extends along the edge (v, b) to one path to b. The last edge splits b’s paths into these groups, so they add.'],
      ['return ways[t]', 'return ways[t]', 'The paths from s that end at t.'],
    ],
    math: [
      ['ways(v)', 'ways[v]', 'ways[v]', 'the number of paths from s to v'],
      ['ways(b) = Σ ways(v) over edges (v, b)', 'ways[b] += ways[v]', 'ways[b] += ways[v]', 'paths split by their last edge'],
    ],
  },

  'dag-longest': {
    code: pair(`def solve(n, edges, s, t):
${topoPy}    best = [None] * n
    best[s] = 0
    for v in order:
        if best[v] is None:
            continue
        for a, b, w in edges:
            if a == v and (best[b] is None or best[v] + w < best[b]):
                best[b] = best[v] + w
    return best[t]
`, `function solve(n, edges, s, t) {
${topoJs}  const best = Array(n).fill(null)
  best[s] = 0
  for (const v of order) {
    if (best[v] === null) continue
    for (const [a, b, w] of edges) {
      if (a === v && (best[b] === null || best[v] + w < best[b])) best[b] = best[v] + w
    }
  }
  return best[t]
}
`),
    notes: [
      ...topoNotes,
      ['best = [None] * n', 'const best = Array(n).fill(null)', 'best[v] is the cheapest cost from s to v found so far; None means no path is known.'],
      ['best[s] = 0', 'best[s] = 0', 'Reaching s costs nothing.'],
      ['if best[v] is None:', 'if (best[v] === null) continue', 'An unreached vertex offers no candidates: there is no path through it.'],
      ['best[v] + w < best[b]', 'best[v] + w < best[b]', 'Relax the edge: a path to v plus this edge may be the cheapest way to b. Negative w needs no special case, because best[v] is already final.'],
      ['return best[t]', 'return best[t]', 'None if t was never reached.'],
    ],
    math: [
      ['best(v)', 'best[v]', 'best[v]', 'the cheapest cost from s to v'],
      ['best(b) = min(best(v) + w)', 'best[v] + w < best[b]', 'best[v] + w < best[b]', 'try every last edge (v, b)'],
    ],
  },

  'increasing-grid': {
    code: pair(`def solve(grid):
    r, c = len(grid), len(grid[0])
    memo = {}
    def longest(i, j):
        if (i, j) not in memo:
            best = 1
            for a, b in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                if 0 <= a < r and 0 <= b < c and grid[a][b] > grid[i][j]:
                    best = max(best, 1 + longest(a, b))
            memo[(i, j)] = best
        return memo[(i, j)]
    return max(longest(i, j) for i in range(r) for j in range(c))
`, `function solve(grid) {
  const r = grid.length, c = grid[0].length
  const memo = new Map()
  function longest(i, j) {
    const key = i * c + j
    if (!memo.has(key)) {
      let best = 1
      for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
        if (a >= 0 && b >= 0 && a < r && b < c && grid[a][b] > grid[i][j]) best = Math.max(best, 1 + longest(a, b))
      }
      memo.set(key, best)
    }
    return memo.get(key)
  }
  let answer = 0
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) answer = Math.max(answer, longest(i, j))
  return answer
}
`),
    notes: [
      ['memo = {}', 'const memo = new Map()', 'memo remembers L for each cell, so each is computed once.'],
      ['best = 1', 'let best = 1', 'The path of just this cell. If no neighbour is larger, that is the answer for this cell.'],
      ['grid[a][b] > grid[i][j]', 'grid[a][b] > grid[i][j]', 'Only strictly larger neighbours. Strictness is what makes the moves a DAG: no path can come back.'],
      ['1 + longest(a, b)', '1 + longest(a, b)', 'This cell, then the longest path from the neighbour.'],
      ['return max(longest', 'answer = Math.max(answer, longest(i, j))', 'The longest path may start at any cell.'],
    ],
    math: [
      ['L(i, j)', 'longest(i, j)', 'longest(i, j)', 'the longest increasing path starting at cell (i, j)'],
      ['1 + max L(neighbour)', '1 + longest(a, b)', '1 + longest(a, b)', 'over strictly larger neighbours'],
    ],
  },

  'critical-path': {
    code: pair(`def solve(durations, deps):
    n = len(durations)
    edges = deps
${topoPy}    finish = [0] * n
    for v in order:
        start = 0
        for a, b in deps:
            if b == v:
                start = max(start, finish[a])
        finish[v] = start + durations[v]
    return max(finish, default=0)
`, `function solve(durations, deps) {
  const n = durations.length
  const edges = deps
${topoJs}  const finish = Array(n).fill(0)
  for (const v of order) {
    let start = 0
    for (const [a, b] of deps) {
      if (b === v) start = Math.max(start, finish[a])
    }
    finish[v] = start + durations[v]
  }
  return Math.max(0, ...finish)
}
`),
    notes: [
      ['edges = deps', 'const edges = deps', 'The dependencies are the graph’s edges: [a, b] means a must finish before b starts.'],
      ...topoNotes,
      ['start = 0', 'let start = 0', 'A task with no prerequisites starts at time 0.'],
      ['start = max(start, finish[a])', 'start = Math.max(start, finish[a])', 'Wait for the slowest prerequisite: they run at the same time, so take the maximum, not the sum.'],
      ['finish[v] = start + durations[v]', 'finish[v] = start + durations[v]', 'The earliest v can finish.'],
      ['return max(finish', 'return Math.max(0, ...finish)', 'Everything is done when the last task finishes, wherever it is in the list.'],
    ],
    math: [
      ['finish(v)', 'finish[v]', 'finish[v]', 'the earliest finish time of task v'],
      ['dᵥ + max finish(a)', 'start + durations[v]', 'start + durations[v]', 'its duration after its slowest prerequisite'],
    ],
  },

  'bellman-ford-dp': {
    code: pair(`def solve(n, edges, s, k):
    best = [None] * n
    best[s] = 0
    for _ in range(k):
        prev = best[:]
        for a, b, w in edges:
            if prev[a] is not None and (best[b] is None or prev[a] + w < best[b]):
                best[b] = prev[a] + w
    return best
`, `function solve(n, edges, s, k) {
  let best = Array(n).fill(null)
  best[s] = 0
  for (let round = 0; round < k; round++) {
    const prev = best.slice()
    for (const [a, b, w] of edges) {
      if (prev[a] !== null && (best[b] === null || prev[a] + w < best[b])) best[b] = prev[a] + w
    }
  }
  return best
}
`),
    notes: [
      ['best[s] = 0', 'best[s] = 0', 'Round 0: with no edges, only s is reached.'],
      ['for _ in range(k):', 'for (let round = 0', 'Round r allows walks of at most r edges; k rounds give the budget.'],
      ['prev = best[:]', 'const prev = best.slice()', 'A copy of the previous round. Reading only prev means one round adds at most one edge.'],
      ['prev[a] + w < best[b]', 'prev[a] + w < best[b]', 'Extend a walk of at most r − 1 edges by the edge (a, b). best[b] already holds the shorter walks, so the minimum covers both.'],
      ['return best', 'return best', 'Entry v is D(k, v), or None if no walk of k edges reaches it.'],
    ],
    math: [
      ['D(r, b)', 'best[b]', 'best[b]', 'the cheapest walk to b with at most r edges, after round r'],
      ['D(r − 1, a) + w', 'prev[a] + w', 'prev[a] + w', 'extend a walk by one edge'],
    ],
  },

  'floyd-warshall': {
    code: pair(`def solve(n, edges):
    INF = float('inf')
    d = [[0 if i == j else INF for j in range(n)] for i in range(n)]
    for a, b, w in edges:
        d[a][b] = min(d[a][b], w)
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if d[i][k] + d[k][j] < d[i][j]:
                    d[i][j] = d[i][k] + d[k][j]
    return [[None if x == INF else x for x in row] for row in d]
`, `function solve(n, edges) {
  const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)))
  for (const [a, b, w] of edges) d[a][b] = Math.min(d[a][b], w)
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j]
      }
    }
  }
  return d.map(row => row.map(x => (x === Infinity ? null : x)))
}
`),
    notes: [
      ['d = [[0 if i == j', 'const d = Array.from', 'No intermediates yet: 0 from a vertex to itself, infinity everywhere else.'],
      ['d[a][b] = min(d[a][b], w)', 'd[a][b] = Math.min(d[a][b], w)', 'Direct edges; of two parallel edges keep the cheaper.'],
      ['for k in range(n):', 'for (let k = 0', 'k is outermost: after this round, vertex k may be used in between.'],
      ['d[i][k] + d[k][j] < d[i][j]', 'd[i][k] + d[k][j] < d[i][j]', 'Either the best path avoids k, or it splits at k into two paths that use only earlier vertices.'],
      ['None if x == INF', 'x === Infinity ? null : x', 'No path: report None rather than infinity.'],
    ],
    math: [
      ['D(i, j)', 'd[i][j]', 'd[i][j]', 'the shortest distance from i to j with the allowed intermediates'],
      ['min(D(i, j), D(i, k) + D(k, j))', 'd[i][k] + d[k][j]', 'd[i][k] + d[k][j]', 'avoid k, or go through it'],
    ],
  },

  'scc-boundaries': {
    code: pair(`def solve(values, edges, s):
    n = len(values)
    reach = [[i == j for j in range(n)] for i in range(n)]
    for a, b in edges:
        reach[a][b] = True
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if reach[i][k] and reach[k][j]:
                    reach[i][j] = True
    comp = [min(j for j in range(n) if reach[i][j] and reach[j][i]) for i in range(n)]
    weight = {}
    for v in range(n):
        weight[comp[v]] = weight.get(comp[v], 0) + values[v]
    memo = {}
    def best(c):
        if c not in memo:
            after = [best(comp[b]) for a, b in edges if comp[a] == c and comp[b] != c]
            memo[c] = weight[c] + max(after, default=0)
        return memo[c]
    return best(comp[s])
`, `function solve(values, edges, s) {
  const n = values.length
  const reach = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j))
  for (const [a, b] of edges) reach[a][b] = true
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (reach[i][k] && reach[k][j]) reach[i][j] = true
      }
    }
  }
  const comp = values.map((_, i) => values.findIndex((_, j) => reach[i][j] && reach[j][i]))
  const weight = {}
  values.forEach((x, v) => { weight[comp[v]] = (weight[comp[v]] ?? 0) + x })
  const memo = new Map()
  function best(c) {
    if (!memo.has(c)) {
      let after = 0
      for (const [a, b] of edges) {
        if (comp[a] === c && comp[b] !== c) after = Math.max(after, best(comp[b]))
      }
      memo.set(c, weight[c] + after)
    }
    return memo.get(c)
  }
  return best(comp[s])
}
`),
    notes: [
      ['reach = [[i == j', 'const reach = Array.from', 'reach[i][j]: can a walk get from i to j? This simple version uses Floyd–Warshall’s loops; Tarjan’s algorithm does it in linear time.'],
      ['comp = [min(j', 'const comp = values.map', 'Two vertices share a component when each reaches the other. The component is named by its smallest vertex.'],
      ['weight[comp[v]] =', 'weight[comp[v]] =', 'A walk can visit every vertex of a component, so a component is worth the sum of its values.'],
      ["comp[a] == c and comp[b] != c", 'comp[a] === c && comp[b] !== c', 'Edges that leave the component. The components form a DAG, so this recursion ends.'],
      ['memo[c] = weight[c] + max(after', 'memo.set(c, weight[c] + after)', 'Collect the whole component, then continue along the best branch: one branch, because the walk can’t come back.'],
      ['return best(comp[s])', 'return best(comp[s])', 'The walk starts in s’s component.'],
    ],
    math: [
      ['best(c)', 'best(c)', 'best(c)', 'the most a walk starting in component c can collect'],
      ['weight(c)', 'weight[c]', 'weight[c]', 'the sum of the values in component c'],
    ],
  },

  'dag-product': {
    code: pair(`def solve(n, edges, s, t):
${topoPy}    best = [[None, None] for _ in range(n)]
    best[s][1] = 0
    def improve(v, held, value):
        if best[v][held] is None or value < best[v][held]:
            best[v][held] = value
    for v in order:
        for a, b, w in edges:
            if a != v:
                continue
            if best[v][1] is not None:
                improve(b, 1, best[v][1] + w)
                improve(b, 0, best[v][1] + w // 2)
            if best[v][0] is not None:
                improve(b, 0, best[v][0] + w)
    options = [x for x in best[t] if x is not None]
    return min(options) if options else None
`, `function solve(n, edges, s, t) {
${topoJs}  const best = Array.from({ length: n }, () => [null, null])
  best[s][1] = 0
  function improve(v, held, value) {
    if (best[v][held] === null || value < best[v][held]) best[v][held] = value
  }
  for (const v of order) {
    for (const [a, b, w] of edges) {
      if (a !== v) continue
      if (best[v][1] !== null) {
        improve(b, 1, best[v][1] + w)
        improve(b, 0, best[v][1] + Math.floor(w / 2))
      }
      if (best[v][0] !== null) improve(b, 0, best[v][0] + w)
    }
  }
  const options = best[t].filter(x => x !== null)
  return options.length ? Math.min(...options) : null
}
`),
    notes: [
      ...topoNotes,
      ['best = [[None, None]', 'const best = Array.from', 'best[v][held]: index 1 means the coupon is still held, 0 that it is spent. Two values per vertex.'],
      ['best[s][1] = 0', 'best[s][1] = 0', 'At the start the coupon is held and nothing is paid.'],
      ['improve(b, 1, best[v][1] + w)', 'improve(b, 1, best[v][1] + w)', 'Pay the edge in full and keep the coupon.'],
      ['improve(b, 0, best[v][1] + w // 2)', 'Math.floor(w / 2)', 'Or spend the coupon on this edge.'],
      ['improve(b, 0, best[v][0] + w)', 'improve(b, 0, best[v][0] + w)', 'Once spent, every later edge is paid in full.'],
      ['options = [x for x', 'const options = best[t]', 'Arriving with or without the coupon: take the cheaper.'],
    ],
    math: [
      ['best(v, held)', 'best[v][1]', 'best[v][1]', 'the cheapest cost to v with the coupon still held'],
      ['best(v, spent)', 'best[v][0]', 'best[v][0]', 'the cheapest cost to v after spending it'],
      ['⌊w / 2⌋', 'w // 2', 'Math.floor(w / 2)', 'the edge at half price'],
    ],
  },
}
