// Test-only reference programs for the Advanced challenges: the DP each lesson teaches, in Python and
// JavaScript. Never imported by the learner UI or worker. lessons.test.js runs both against every
// case, and advanced-oracles.js checks the expected values without DP.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

// Kahn's topological order, shared text for the DAG solutions.
const TOPO_PY = `def topo(n, edges):
    indeg = [0] * n
    for e in edges:
        indeg[e[1]] += 1
    order = [v for v in range(n) if indeg[v] == 0]
    for v in order:
        for e in edges:
            if e[0] == v:
                indeg[e[1]] -= 1
                if indeg[e[1]] == 0:
                    order.append(e[1])
    return order
`
const TOPO_JS = `function topo(n, edges) {
  const indeg = Array(n).fill(0)
  for (const e of edges) indeg[e[1]]++
  const order = []
  for (let v = 0; v < n; v++) if (indeg[v] === 0) order.push(v)
  for (let i = 0; i < order.length; i++)
    for (const e of edges) if (e[0] === order[i] && --indeg[e[1]] === 0) order.push(e[1])
  return order
}
`

export const ADVANCED_SOLUTIONS = {
  'dag-paths': pair(`${TOPO_PY}
def solve(n, edges, s, t):
    ways = [0] * n
    ways[s] = 1
    for v in topo(n, edges):
        for a, b in edges:
            if a == v:
                ways[b] += ways[v]
    return ways[t]
`, `${TOPO_JS}
function solve(n, edges, s, t) {
  const ways = Array(n).fill(0)
  ways[s] = 1
  for (const v of topo(n, edges)) for (const [a, b] of edges) if (a === v) ways[b] += ways[v]
  return ways[t]
}`),

  'dag-longest': pair(`${TOPO_PY}
def solve(n, edges, s, t):
    best = [None] * n
    best[s] = 0
    for v in topo(n, edges):
        if best[v] is None:
            continue
        for a, b, w in edges:
            if a == v and (best[b] is None or best[v] + w < best[b]):
                best[b] = best[v] + w
    return best[t]
`, `${TOPO_JS}
function solve(n, edges, s, t) {
  const best = Array(n).fill(null)
  best[s] = 0
  for (const v of topo(n, edges)) {
    if (best[v] === null) continue
    for (const [a, b, w] of edges) if (a === v && (best[b] === null || best[v] + w < best[b])) best[b] = best[v] + w
  }
  return best[t]
}`),

  'increasing-grid': pair(`def solve(grid):
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
  const r = grid.length, c = grid[0].length, memo = new Map()
  function longest(i, j) {
    const key = i * c + j
    if (!memo.has(key)) {
      let best = 1
      for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]])
        if (a >= 0 && b >= 0 && a < r && b < c && grid[a][b] > grid[i][j]) best = Math.max(best, 1 + longest(a, b))
      memo.set(key, best)
    }
    return memo.get(key)
  }
  let best = 0
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) best = Math.max(best, longest(i, j))
  return best
}`),

  'critical-path': pair(`${TOPO_PY}
def solve(durations, deps):
    n = len(durations)
    finish = [0] * n
    for v in topo(n, deps):
        start = max([finish[a] for a, b in deps if b == v], default=0)
        finish[v] = start + durations[v]
    return max(finish, default=0)
`, `${TOPO_JS}
function solve(durations, deps) {
  const n = durations.length, finish = Array(n).fill(0)
  for (const v of topo(n, deps)) {
    let start = 0
    for (const [a, b] of deps) if (b === v) start = Math.max(start, finish[a])
    finish[v] = start + durations[v]
  }
  return Math.max(0, ...finish)
}`),

  'bellman-ford-dp': pair(`def solve(n, edges, s, k):
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
  for (let step = 0; step < k; step++) {
    const prev = best.slice()
    for (const [a, b, w] of edges) if (prev[a] !== null && (best[b] === null || prev[a] + w < best[b])) best[b] = prev[a] + w
  }
  return best
}`),

  'floyd-warshall': pair(`def solve(n, edges):
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
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
    if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j]
  return d.map(row => row.map(x => (x === Infinity ? null : x)))
}`),

  // Components by mutual reachability, then the best walk over the component DAG from s's component.
  'scc-boundaries': pair(`def solve(values, edges, s):
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
            nxt = {comp[b] for a, b in edges if comp[a] == c and comp[b] != c}
            memo[c] = weight[c] + max((best(d) for d in nxt), default=0)
        return memo[c]
    return best(comp[s])
`, `function solve(values, edges, s) {
  const n = values.length
  const reach = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j))
  for (const [a, b] of edges) reach[a][b] = true
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (reach[i][k] && reach[k][j]) reach[i][j] = true
  const comp = values.map((_, i) => values.findIndex((_, j) => reach[i][j] && reach[j][i]))
  const weight = {}
  values.forEach((x, v) => { weight[comp[v]] = (weight[comp[v]] ?? 0) + x })
  const memo = new Map()
  function best(c) {
    if (!memo.has(c)) {
      let more = 0
      for (const [a, b] of edges) if (comp[a] === c && comp[b] !== c) more = Math.max(more, best(comp[b]))
      memo.set(c, weight[c] + more)
    }
    return memo.get(c)
  }
  return best(comp[s])
}`),

  // State (vertex, coupon still held?): two layers, filled in topological order.
  'dag-product': pair(`${TOPO_PY}
def solve(n, edges, s, t):
    best = [[None, None] for _ in range(n)]
    best[s][1] = 0
    def improve(v, held, value):
        if best[v][held] is None or value < best[v][held]:
            best[v][held] = value
    for v in topo(n, edges):
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
`, `${TOPO_JS}
function solve(n, edges, s, t) {
  const best = Array.from({ length: n }, () => [null, null])
  best[s][1] = 0
  const improve = (v, held, value) => { if (best[v][held] === null || value < best[v][held]) best[v][held] = value }
  for (const v of topo(n, edges)) for (const [a, b, w] of edges) {
    if (a !== v) continue
    if (best[v][1] !== null) { improve(b, 1, best[v][1] + w); improve(b, 0, best[v][1] + Math.floor(w / 2)) }
    if (best[v][0] !== null) improve(b, 0, best[v][0] + w)
  }
  const options = best[t].filter(x => x !== null)
  return options.length ? Math.min(...options) : null
}`),
}
