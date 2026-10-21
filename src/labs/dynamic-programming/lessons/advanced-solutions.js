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

const DAG_SOLUTIONS = {
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

// Rooting a tree at 0: parent of each vertex, and an order with every parent before its children
// (breadth first), so reversed(order) visits children first.
const ROOT_PY = `def rooted(n, edges):
    adj = [[] for _ in range(n)]
    for e in edges:
        adj[e[0]].append(e[1])
        adj[e[1]].append(e[0])
    parent = [-1] * n
    order = [0]
    for v in order:
        for u in adj[v]:
            if u != parent[v]:
                parent[u] = v
                order.append(u)
    return parent, order
`
const ROOT_JS = `function rooted(n, edges) {
  const adj = Array.from({ length: n }, () => [])
  for (const e of edges) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]) }
  const parent = Array(n).fill(-1), order = [0]
  for (let i = 0; i < order.length; i++) for (const u of adj[order[i]]) if (u !== parent[order[i]]) { parent[u] = order[i]; order.push(u) }
  return [parent, order]
}
`

const TREE_SOLUTIONS = {
  'tree-basics': pair(`${ROOT_PY}
def solve(n, edges):
    parent, order = rooted(n, edges)
    size = [1] * n
    for v in reversed(order):
        if parent[v] >= 0:
            size[parent[v]] += size[v]
    return size
`, `${ROOT_JS}
function solve(n, edges) {
  const [parent, order] = rooted(n, edges), size = Array(n).fill(1)
  for (const v of [...order].reverse()) if (parent[v] >= 0) size[parent[v]] += size[v]
  return size
}`),

  'tree-independent': pair(`${ROOT_PY}
def solve(weights, edges):
    n = len(weights)
    parent, order = rooted(n, edges)
    take, skip = weights[:], [0] * n
    for v in reversed(order):
        p = parent[v]
        if p >= 0:
            take[p] += skip[v]
            skip[p] += max(take[v], skip[v])
    return max(take[0], skip[0])
`, `${ROOT_JS}
function solve(weights, edges) {
  const n = weights.length, [parent, order] = rooted(n, edges)
  const take = weights.slice(), skip = Array(n).fill(0)
  for (const v of [...order].reverse()) {
    const p = parent[v]
    if (p >= 0) { take[p] += skip[v]; skip[p] += Math.max(take[v], skip[v]) }
  }
  return Math.max(take[0], skip[0])
}`),

  'tree-cover': pair(`${ROOT_PY}
def solve(n, edges):
    parent, order = rooted(n, edges)
    chosen, unchosen = [1] * n, [0] * n
    for v in reversed(order):
        p = parent[v]
        if p >= 0:
            chosen[p] += min(chosen[v], unchosen[v])
            unchosen[p] += chosen[v]
    return min(chosen[0], unchosen[0])
`, `${ROOT_JS}
function solve(n, edges) {
  const [parent, order] = rooted(n, edges), chosen = Array(n).fill(1), unchosen = Array(n).fill(0)
  for (const v of [...order].reverse()) {
    const p = parent[v]
    if (p >= 0) { chosen[p] += Math.min(chosen[v], unchosen[v]); unchosen[p] += chosen[v] }
  }
  return Math.min(chosen[0], unchosen[0])
}`),

  // free[v]: best with v unmatched; best[v]: best either way; gain[v]: the most matching v to one child adds.
  'tree-matching': pair(`${ROOT_PY}
def solve(n, edges):
    parent, order = rooted(n, edges)
    free, best, gain = [0] * n, [0] * n, [None] * n
    for v in reversed(order):
        best[v] = free[v] if gain[v] is None else max(free[v], free[v] + gain[v])
        p = parent[v]
        if p >= 0:
            free[p] += best[v]
            g = free[v] + 1 - best[v]
            if gain[p] is None or g > gain[p]:
                gain[p] = g
    return best[0]
`, `${ROOT_JS}
function solve(n, edges) {
  const [parent, order] = rooted(n, edges), free = Array(n).fill(0), best = Array(n).fill(0), gain = Array(n).fill(null)
  for (const v of [...order].reverse()) {
    best[v] = gain[v] === null ? free[v] : Math.max(free[v], free[v] + gain[v])
    const p = parent[v]
    if (p >= 0) { free[p] += best[v]; const g = free[v] + 1 - best[v]; if (gain[p] === null || g > gain[p]) gain[p] = g }
  }
  return best[0]
}`),

  'tree-diameter': pair(`def solve(n, edges):
    adj = [[] for _ in range(n)]
    for a, b, w in edges:
        adj[a].append((b, w))
        adj[b].append((a, w))
    parent, up, order = [-1] * n, [0] * n, [0]
    for v in order:
        for u, w in adj[v]:
            if u != parent[v]:
                parent[u], up[u] = v, w
                order.append(u)
    down, best = [0] * n, 0
    for v in reversed(order):
        p = parent[v]
        if p >= 0:
            c = down[v] + up[v]
            best = max(best, down[p] + c)
            down[p] = max(down[p], c)
    return best
`, `function solve(n, edges) {
  const adj = Array.from({ length: n }, () => [])
  for (const [a, b, w] of edges) { adj[a].push([b, w]); adj[b].push([a, w]) }
  const parent = Array(n).fill(-1), up = Array(n).fill(0), order = [0]
  for (let i = 0; i < order.length; i++) for (const [u, w] of adj[order[i]]) if (u !== parent[order[i]]) { parent[u] = order[i]; up[u] = w; order.push(u) }
  const down = Array(n).fill(0)
  let best = 0
  for (const v of [...order].reverse()) {
    const p = parent[v]
    if (p >= 0) { const c = down[v] + up[v]; best = Math.max(best, down[p] + c); down[p] = Math.max(down[p], c) }
  }
  return best
}`),

  // Farthest distance from every vertex: the two deepest branches below, then the best route upward.
  'tree-reroot': pair(`${ROOT_PY}
def solve(n, edges):
    parent, order = rooted(n, edges)
    down1, down2, via = [0] * n, [0] * n, [-1] * n
    for v in reversed(order):
        p = parent[v]
        if p >= 0:
            c = down1[v] + 1
            if c > down1[p]:
                down2[p], down1[p], via[p] = down1[p], c, v
            elif c > down2[p]:
                down2[p] = c
    up = [0] * n
    for v in order:
        p = parent[v]
        if p >= 0:
            other = down2[p] if via[p] == v else down1[p]
            up[v] = 1 + max(up[p], other)
    return [max(down1[v], up[v]) for v in range(n)]
`, `${ROOT_JS}
function solve(n, edges) {
  const [parent, order] = rooted(n, edges), down1 = Array(n).fill(0), down2 = Array(n).fill(0), via = Array(n).fill(-1), up = Array(n).fill(0)
  for (const v of [...order].reverse()) {
    const p = parent[v]
    if (p < 0) continue
    const c = down1[v] + 1
    if (c > down1[p]) { down2[p] = down1[p]; down1[p] = c; via[p] = v } else if (c > down2[p]) down2[p] = c
  }
  for (const v of order) { const p = parent[v]; if (p >= 0) up[v] = 1 + Math.max(up[p], via[p] === v ? down2[p] : down1[p]) }
  return down1.map((d, v) => Math.max(d, up[v]))
}`),

  // Connected sets through each vertex, mod 1e9+7: products over children, and for each child the
  // product of its siblings from prefix and suffix products (a modulus allows no division).
  'reroot-prefix': pair(`${ROOT_PY}
def solve(n, edges):
    MOD = 1000000007
    parent, order = rooted(n, edges)
    children = [[] for _ in range(n)]
    for v in order[1:]:
        children[parent[v]].append(v)
    down = [1] * n
    for v in reversed(order):
        for c in children[v]:
            down[v] = down[v] * (1 + down[c]) % MOD
    up = [0] * n
    for v in order:
        ch = children[v]
        pre = [1] * (len(ch) + 1)
        for i, c in enumerate(ch):
            pre[i + 1] = pre[i] * (1 + down[c]) % MOD
        suf = [1] * (len(ch) + 1)
        for i in range(len(ch) - 1, -1, -1):
            suf[i] = suf[i + 1] * (1 + down[ch[i]]) % MOD
        for i, c in enumerate(ch):
            up[c] = pre[i] * suf[i + 1] % MOD * (1 + up[v]) % MOD
    return [down[v] * (1 + up[v]) % MOD for v in range(n)]
`, `${ROOT_JS}
function solve(n, edges) {
  const MOD = 1000000007n, [parent, order] = rooted(n, edges)
  const children = Array.from({ length: n }, () => [])
  for (const v of order.slice(1)) children[parent[v]].push(v)
  const down = Array(n).fill(1n), up = Array(n).fill(0n)
  for (const v of [...order].reverse()) for (const c of children[v]) down[v] = down[v] * (1n + down[c]) % MOD
  for (const v of order) {
    const ch = children[v], k = ch.length, pre = Array(k + 1).fill(1n), suf = Array(k + 1).fill(1n)
    for (let i = 0; i < k; i++) pre[i + 1] = pre[i] * (1n + down[ch[i]]) % MOD
    for (let i = k - 1; i >= 0; i--) suf[i] = suf[i + 1] * (1n + down[ch[i]]) % MOD
    ch.forEach((c, i) => { up[c] = pre[i] * suf[i + 1] % MOD * (1n + up[v]) % MOD })
  }
  return down.map((d, v) => Number(d * (1n + up[v]) % MOD))
}`),

  'tree-distances': pair(`${ROOT_PY}
def solve(n, edges):
    parent, order = rooted(n, edges)
    size, depth = [1] * n, [0] * n
    for v in order[1:]:
        depth[v] = depth[parent[v]] + 1
    for v in reversed(order):
        if parent[v] >= 0:
            size[parent[v]] += size[v]
    answer = [0] * n
    answer[0] = sum(depth)
    for v in order[1:]:
        answer[v] = answer[parent[v]] + n - 2 * size[v]
    return answer
`, `${ROOT_JS}
function solve(n, edges) {
  const [parent, order] = rooted(n, edges), size = Array(n).fill(1), depth = Array(n).fill(0), answer = Array(n).fill(0)
  for (const v of order.slice(1)) depth[v] = depth[parent[v]] + 1
  for (const v of [...order].reverse()) if (parent[v] >= 0) size[parent[v]] += size[v]
  answer[0] = depth.reduce((s, d) => s + d, 0)
  for (const v of order.slice(1)) answer[v] = answer[parent[v]] + n - 2 * size[v]
  return answer
}`),

  // D[v][b]: the best value from v's subtree with v chosen, cost at most b; children merged one by one.
  'tree-knapsack': pair(`${ROOT_PY}
def solve(values, costs, edges, budget):
    n = len(values)
    parent, order = rooted(n, edges)
    children = [[] for _ in range(n)]
    for v in order[1:]:
        children[parent[v]].append(v)
    NEG = float('-inf')
    D = [None] * n
    for v in reversed(order):
        d = [values[v] if b >= costs[v] else NEG for b in range(budget + 1)]
        for c in children[v]:
            merged = d[:]
            for b in range(budget + 1):
                for x in range(b + 1):
                    if d[b - x] != NEG and D[c][x] != NEG:
                        merged[b] = max(merged[b], d[b - x] + D[c][x])
            d = merged
        D[v] = d
    return max(0, D[0][budget])
`, `${ROOT_JS}
function solve(values, costs, edges, budget) {
  const n = values.length, [parent, order] = rooted(n, edges)
  const children = Array.from({ length: n }, () => [])
  for (const v of order.slice(1)) children[parent[v]].push(v)
  const D = Array(n)
  for (const v of [...order].reverse()) {
    let d = Array.from({ length: budget + 1 }, (_, b) => (b >= costs[v] ? values[v] : -Infinity))
    for (const c of children[v]) {
      const merged = d.slice()
      for (let b = 0; b <= budget; b++) for (let x = 0; x <= b; x++) merged[b] = Math.max(merged[b], d[b - x] + D[c][x])
      d = merged
    }
    D[v] = d
  }
  return Math.max(0, D[0][budget])
}`),

  'tree-coloring': pair(`${ROOT_PY}
def solve(edges, allowed):
    n = len(allowed)
    parent, order = rooted(n, edges)
    ways = [{c: 1 for c in allowed[v]} for v in range(n)]
    for v in reversed(order):
        p = parent[v]
        if p >= 0:
            total = sum(ways[v].values())
            for c in ways[p]:
                ways[p][c] *= total - ways[v].get(c, 0)
    return sum(ways[0].values())
`, `${ROOT_JS}
function solve(edges, allowed) {
  const n = allowed.length, [parent, order] = rooted(n, edges)
  const ways = allowed.map(cs => new Map(cs.map(c => [c, 1])))
  for (const v of [...order].reverse()) {
    const p = parent[v]
    if (p < 0) continue
    let total = 0
    for (const x of ways[v].values()) total += x
    for (const c of ways[p].keys()) ways[p].set(c, ways[p].get(c) * (total - (ways[v].get(c) ?? 0)))
  }
  let answer = 0
  for (const x of ways[0].values()) answer += x
  return answer
}`),

  // cnt[v][d]: vertices d edges below v among the children merged so far.
  'tree-path-count': pair(`${ROOT_PY}
def solve(n, edges, k):
    parent, order = rooted(n, edges)
    cnt = [[1] + [0] * k for _ in range(n)]
    pairs = 0
    for v in reversed(order):
        p = parent[v]
        if p >= 0:
            for d in range(k):
                pairs += cnt[p][d] * cnt[v][k - 1 - d]
            for d in range(k):
                cnt[p][d + 1] += cnt[v][d]
    return pairs
`, `${ROOT_JS}
function solve(n, edges, k) {
  const [parent, order] = rooted(n, edges), cnt = Array.from({ length: n }, () => [1, ...Array(k).fill(0)])
  let pairs = 0
  for (const v of [...order].reverse()) {
    const p = parent[v]
    if (p < 0) continue
    for (let d = 0; d < k; d++) pairs += cnt[p][d] * cnt[v][k - 1 - d]
    for (let d = 0; d < k; d++) cnt[p][d + 1] += cnt[v][d]
  }
  return pairs
}`),

  'tree-connected': pair(`${ROOT_PY}
def solve(n, edges):
    parent, order = rooted(n, edges)
    C = [1] * n
    for v in reversed(order):
        if parent[v] >= 0:
            C[parent[v]] *= 1 + C[v]
    return sum(C)
`, `${ROOT_JS}
function solve(n, edges) {
  const [parent, order] = rooted(n, edges), C = Array(n).fill(1)
  for (const v of [...order].reverse()) if (parent[v] >= 0) C[parent[v]] *= 1 + C[v]
  return C.reduce((s, x) => s + x, 0)
}`),

  'tree-small-large': pair(`${ROOT_PY}
def solve(colors, edges):
    n = len(colors)
    parent, order = rooted(n, edges)
    sets = [{colors[v]} for v in range(n)]
    answer = [0] * n
    for v in reversed(order):
        answer[v] = len(sets[v])
        p = parent[v]
        if p >= 0:
            big, small = sets[p], sets[v]
            if len(big) < len(small):
                big, small = small, big
            big |= small
            sets[p] = big
    return answer
`, `${ROOT_JS}
function solve(colors, edges) {
  const n = colors.length, [parent, order] = rooted(n, edges)
  const sets = colors.map(c => new Set([c])), answer = Array(n).fill(0)
  for (const v of [...order].reverse()) {
    answer[v] = sets[v].size
    const p = parent[v]
    if (p < 0) continue
    let big = sets[p], small = sets[v]
    if (big.size < small.size) [big, small] = [small, big]
    for (const c of small) big.add(c)
    sets[p] = big
  }
  return answer
}`),
}

const SUBSET_SOLUTIONS = {
  // Each mask's total from the mask without its lowest item.
  'bitmask-basics': pair(`def solve(weights, limit):
    n = len(weights)
    total = [0] * (1 << n)
    count = 1 if limit >= 0 else 0
    for mask in range(1, 1 << n):
        low = mask & -mask
        total[mask] = total[mask ^ low] + weights[low.bit_length() - 1]
        if total[mask] <= limit:
            count += 1
    return count
`, `function solve(weights, limit) {
  const n = weights.length, total = new Array(1 << n).fill(0)
  let count = limit >= 0 ? 1 : 0
  for (let mask = 1; mask < 1 << n; mask++) {
    const low = mask & -mask
    total[mask] = total[mask ^ low] + weights[31 - Math.clz32(low)]
    if (total[mask] <= limit) count++
  }
  return count
}`),

  'subset-enumeration': pair(`def solve(values):
    out = []
    for mask in range(len(values)):
        total, sub = 0, mask
        while True:
            total += values[sub]
            if sub == 0:
                break
            sub = (sub - 1) & mask
        out.append(total)
    return out
`, `function solve(values) {
  return values.map((_, mask) => {
    let total = 0
    for (let sub = mask; ; sub = (sub - 1) & mask) { total += values[sub]; if (sub === 0) break }
    return total
  })
}`),

  'assignment': pair(`def solve(cost):
    n = len(cost)
    INF = float('inf')
    D = [INF] * (1 << n)
    D[0] = 0
    for mask in range(1 << n):
        w = bin(mask).count('1')
        if D[mask] == INF or w == n:
            continue
        for j in range(n):
            if not mask & (1 << j):
                D[mask | 1 << j] = min(D[mask | 1 << j], D[mask] + cost[w][j])
    return D[(1 << n) - 1]
`, `function solve(cost) {
  const n = cost.length, D = new Array(1 << n).fill(Infinity)
  D[0] = 0
  for (let mask = 0; mask < 1 << n; mask++) {
    let w = 0
    for (let x = mask; x; x &= x - 1) w++
    if (D[mask] === Infinity || w === n) continue
    for (let j = 0; j < n; j++) if (!(mask & (1 << j))) D[mask | (1 << j)] = Math.min(D[mask | (1 << j)], D[mask] + cost[w][j])
  }
  return D[(1 << n) - 1]
}`),

  'held-karp': pair(`def solve(dist):
    n = len(dist)
    if n == 1:
        return 0
    INF = float('inf')
    D = [[INF] * n for _ in range(1 << n)]
    D[1][0] = 0
    for mask in range(1, 1 << n, 2):
        for v in range(n):
            if D[mask][v] == INF:
                continue
            for u in range(n):
                if not mask & (1 << u):
                    nxt = mask | 1 << u
                    D[nxt][u] = min(D[nxt][u], D[mask][v] + dist[v][u])
    full = (1 << n) - 1
    return min(D[full][v] + dist[v][0] for v in range(1, n))
`, `function solve(dist) {
  const n = dist.length
  if (n === 1) return 0
  const D = Array.from({ length: 1 << n }, () => new Array(n).fill(Infinity))
  D[1][0] = 0
  for (let mask = 1; mask < 1 << n; mask += 2) for (let v = 0; v < n; v++) {
    if (D[mask][v] === Infinity) continue
    for (let u = 0; u < n; u++) if (!(mask & (1 << u))) D[mask | (1 << u)][u] = Math.min(D[mask | (1 << u)][u], D[mask][v] + dist[v][u])
  }
  const full = (1 << n) - 1
  let best = Infinity
  for (let v = 1; v < n; v++) best = Math.min(best, D[full][v] + dist[v][0])
  return best
}`),

  'hamiltonian': pair(`def solve(n, edges):
    out = [[] for _ in range(n)]
    for a, b in edges:
        out[a].append(b)
    C = [[0] * n for _ in range(1 << n)]
    C[1][0] = 1
    for mask in range(1, 1 << n, 2):
        for v in range(n):
            if C[mask][v]:
                for u in out[v]:
                    if not mask & (1 << u):
                        C[mask | 1 << u][u] += C[mask][v]
    return sum(C[(1 << n) - 1])
`, `function solve(n, edges) {
  const out = Array.from({ length: n }, () => [])
  for (const [a, b] of edges) out[a].push(b)
  const C = Array.from({ length: 1 << n }, () => new Array(n).fill(0))
  C[1][0] = 1
  for (let mask = 1; mask < 1 << n; mask += 2) for (let v = 0; v < n; v++) {
    if (!C[mask][v]) continue
    for (const u of out[v]) if (!(mask & (1 << u))) C[mask | (1 << u)][u] += C[mask][v]
  }
  return C[(1 << n) - 1].reduce((s, x) => s + x, 0)
}`),

  // The block holding the lowest remaining item is chosen first, so each partition is built once.
  'subset-partition': pair(`def solve(values, cap):
    n = len(values)
    total = [0] * (1 << n)
    for mask in range(1, 1 << n):
        low = mask & -mask
        total[mask] = total[mask ^ low] + values[low.bit_length() - 1]
    INF = float('inf')
    D = [INF] * (1 << n)
    D[0] = 0
    for mask in range(1, 1 << n):
        low = mask & -mask
        rest = mask ^ low
        sub = rest
        while True:
            block = sub | low
            if total[block] <= cap:
                D[mask] = min(D[mask], D[mask ^ block] + 1)
            if sub == 0:
                break
            sub = (sub - 1) & rest
    return D[(1 << n) - 1]
`, `function solve(values, cap) {
  const n = values.length, total = new Array(1 << n).fill(0), D = new Array(1 << n).fill(Infinity)
  for (let mask = 1; mask < 1 << n; mask++) { const low = mask & -mask; total[mask] = total[mask ^ low] + values[31 - Math.clz32(low)] }
  D[0] = 0
  for (let mask = 1; mask < 1 << n; mask++) {
    const low = mask & -mask, rest = mask ^ low
    for (let sub = rest; ; sub = (sub - 1) & rest) {
      const block = sub | low
      if (total[block] <= cap) D[mask] = Math.min(D[mask], D[mask ^ block] + 1)
      if (sub === 0) break
    }
  }
  return D[(1 << n) - 1]
}`),

  'subset-cover': pair(`def solve(n, options):
    INF = float('inf')
    D = [INF] * (1 << n)
    D[0] = 0
    masks = [(sum(1 << i for i in items), c) for items, c in options]
    for mask in range(1 << n):
        if D[mask] == INF:
            continue
        for om, c in masks:
            D[mask | om] = min(D[mask | om], D[mask] + c)
    full = (1 << n) - 1
    return -1 if D[full] == INF else D[full]
`, `function solve(n, options) {
  const D = new Array(1 << n).fill(Infinity)
  D[0] = 0
  const masks = options.map(([items, c]) => [items.reduce((m, i) => m | (1 << i), 0), c])
  for (let mask = 0; mask < 1 << n; mask++) {
    if (D[mask] === Infinity) continue
    for (const [om, c] of masks) D[mask | om] = Math.min(D[mask | om], D[mask] + c)
  }
  const full = (1 << n) - 1
  return D[full] === Infinity ? -1 : D[full]
}`),

  // Dreyfus–Wagner: D[mask][v] joins the terminals in mask and vertex v.
  'steiner-tree': pair(`def solve(n, edges, terminals):
    INF = float('inf')
    dist = [[0 if i == j else INF for j in range(n)] for i in range(n)]
    for a, b, w in edges:
        dist[a][b] = dist[b][a] = min(dist[a][b], w)
    for k in range(n):
        for i in range(n):
            for j in range(n):
                dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
    t = len(terminals)
    D = [[INF] * n for _ in range(1 << t)]
    for i, x in enumerate(terminals):
        for v in range(n):
            D[1 << i][v] = dist[x][v]
    for mask in range(1, 1 << t):
        if mask & (mask - 1) == 0:
            continue
        for v in range(n):
            sub = (mask - 1) & mask
            while sub:
                D[mask][v] = min(D[mask][v], D[sub][v] + D[mask ^ sub][v])
                sub = (sub - 1) & mask
        for v in range(n):
            D[mask][v] = min(D[mask][u] + dist[u][v] for u in range(n))
    return min(D[(1 << t) - 1])
`, `function solve(n, edges, terminals) {
  const dist = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)))
  for (const [a, b, w] of edges) { dist[a][b] = dist[b][a] = Math.min(dist[a][b], w) }
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j])
  const t = terminals.length, D = Array.from({ length: 1 << t }, () => new Array(n).fill(Infinity))
  terminals.forEach((x, i) => { for (let v = 0; v < n; v++) D[1 << i][v] = dist[x][v] })
  for (let mask = 1; mask < 1 << t; mask++) {
    if ((mask & (mask - 1)) === 0) continue
    for (let v = 0; v < n; v++) for (let sub = (mask - 1) & mask; sub; sub = (sub - 1) & mask) D[mask][v] = Math.min(D[mask][v], D[sub][v] + D[mask ^ sub][v])
    const joined = D[mask].slice()
    for (let v = 0; v < n; v++) for (let u = 0; u < n; u++) D[mask][v] = Math.min(D[mask][v], joined[u] + dist[u][v])
  }
  return Math.min(...D[(1 << t) - 1])
}`),

  'subset-topological': pair(`def solve(n, edges):
    need = [0] * n
    for a, b in edges:
        need[b] |= 1 << a
    C = [0] * (1 << n)
    C[0] = 1
    for mask in range(1 << n):
        if C[mask]:
            for v in range(n):
                if not mask & (1 << v) and need[v] & mask == need[v]:
                    C[mask | 1 << v] += C[mask]
    return C[(1 << n) - 1]
`, `function solve(n, edges) {
  const need = new Array(n).fill(0)
  for (const [a, b] of edges) need[b] |= 1 << a
  const C = new Array(1 << n).fill(0)
  C[0] = 1
  for (let mask = 0; mask < 1 << n; mask++) {
    if (!C[mask]) continue
    for (let v = 0; v < n; v++) if (!(mask & (1 << v)) && (need[v] & mask) === need[v]) C[mask | (1 << v)] += C[mask]
  }
  return C[(1 << n) - 1]
}`),

  // D[mask]: perfect matchings of the vertex set mask; its lowest vertex must be paired with someone.
  'subset-matching': pair(`def solve(n, edges):
    adj = [0] * n
    for a, b in edges:
        adj[a] |= 1 << b
        adj[b] |= 1 << a
    D = [0] * (1 << n)
    D[0] = 1
    for mask in range(1, 1 << n):
        low = mask & -mask
        v = low.bit_length() - 1
        rest = mask ^ low
        for u in range(n):
            if rest & adj[v] & (1 << u):
                D[mask] += D[rest ^ (1 << u)]
    return D[(1 << n) - 1]
`, `function solve(n, edges) {
  const adj = new Array(n).fill(0)
  for (const [a, b] of edges) { adj[a] |= 1 << b; adj[b] |= 1 << a }
  const D = new Array(1 << n).fill(0)
  D[0] = 1
  for (let mask = 1; mask < 1 << n; mask++) {
    const low = mask & -mask, v = 31 - Math.clz32(low), rest = mask ^ low
    for (let u = 0; u < n; u++) if (rest & adj[v] & (1 << u)) D[mask] += D[rest ^ (1 << u)]
  }
  return D[(1 << n) - 1]
}`),

  // D[mask]: the fewest colours for the vertices in mask; a colour class holding the lowest vertex comes off first.
  'subset-coloring': pair(`def solve(n, edges):
    adj = [0] * n
    for a, b in edges:
        adj[a] |= 1 << b
        adj[b] |= 1 << a
    free = [True] * (1 << n)
    for mask in range(1, 1 << n):
        low = mask & -mask
        v = low.bit_length() - 1
        free[mask] = free[mask ^ low] and not adj[v] & mask
    D = [0] + [n] * ((1 << n) - 1)
    for mask in range(1, 1 << n):
        low = mask & -mask
        rest = mask ^ low
        sub = rest
        while True:
            if free[sub | low]:
                D[mask] = min(D[mask], D[rest ^ sub] + 1)
            if sub == 0:
                break
            sub = (sub - 1) & rest
    return D[(1 << n) - 1]
`, `function solve(n, edges) {
  const adj = new Array(n).fill(0)
  for (const [a, b] of edges) { adj[a] |= 1 << b; adj[b] |= 1 << a }
  const free = new Array(1 << n).fill(true), D = new Array(1 << n).fill(n)
  for (let mask = 1; mask < 1 << n; mask++) { const low = mask & -mask, v = 31 - Math.clz32(low); free[mask] = free[mask ^ low] && !(adj[v] & mask) }
  D[0] = 0
  for (let mask = 1; mask < 1 << n; mask++) {
    const low = mask & -mask, rest = mask ^ low
    for (let sub = rest; ; sub = (sub - 1) & rest) {
      if (free[sub | low]) D[mask] = Math.min(D[mask], D[rest ^ sub] + 1)
      if (sub === 0) break
    }
  }
  return D[(1 << n) - 1]
}`),

  'mask-language': pair(`def solve(sets):
    x = 0
    for s in sets:
        m = 0
        for p in s:
            m |= 1 << p
        x ^= m
    return str(x)
`, `function solve(sets) {
  let x = 0n
  for (const s of sets) {
    let m = 0n
    for (const p of s) m |= 1n << BigInt(p)
    x ^= m
  }
  return x.toString()
}`),
}

// The KMP automaton over an alphabet: step[state][symbol] = the matched-prefix length after reading it.
const KMP_PY = `def kmp(pattern, alphabet):
    fail = [0] * (len(pattern) + 1)
    for i in range(1, len(pattern)):
        k = fail[i]
        while k and pattern[i] != pattern[k]:
            k = fail[k]
        fail[i + 1] = k + 1 if pattern[i] == pattern[k] else 0
    step = []
    for state in range(len(pattern) + 1):
        row = {}
        for c in alphabet:
            k = state
            while k and (k == len(pattern) or pattern[k] != c):
                k = fail[k]
            row[c] = k + 1 if k < len(pattern) and pattern[k] == c else 0
        step.append(row)
    return step
`
const KMP_JS = `function kmp(pattern, alphabet) {
  const fail = new Array(pattern.length + 1).fill(0)
  for (let i = 1; i < pattern.length; i++) {
    let k = fail[i]
    while (k && pattern[i] !== pattern[k]) k = fail[k]
    fail[i + 1] = pattern[i] === pattern[k] ? k + 1 : 0
  }
  const step = []
  for (let state = 0; state <= pattern.length; state++) {
    const row = {}
    for (const c of alphabet) {
      let k = state
      while (k && (k === pattern.length || pattern[k] !== c)) k = fail[k]
      row[c] = k < pattern.length && pattern[k] === c ? k + 1 : 0
    }
    step.push(row)
  }
  return step
}
`

const DIGIT_SOLUTIONS = {
  'digit-tight': pair(`from functools import lru_cache
def solve(n):
    digits = list(map(int, str(n)))
    @lru_cache(None)
    def count(pos, tight):
        if pos == len(digits):
            return 1
        top = digits[pos] if tight else 9
        return sum(count(pos + 1, tight and d == top) for d in range(top + 1) if d != 4)
    return count(0, True)
`, `function solve(n) {
  const digits = String(n).split('').map(Number), memo = new Map()
  function count(pos, tight) {
    if (pos === digits.length) return 1
    const key = pos * 2 + (tight ? 1 : 0)
    if (memo.has(key)) return memo.get(key)
    const top = tight ? digits[pos] : 9
    let total = 0
    for (let d = 0; d <= top; d++) if (d !== 4) total += count(pos + 1, tight && d === top)
    memo.set(key, total)
    return total
  }
  return count(0, true)
}`),

  'digit-leading': pair(`from functools import lru_cache
def solve(n):
    digits = list(map(int, str(n)))
    @lru_cache(None)
    def count(pos, tight, started):
        if pos == len(digits):
            return 1 if started else 0
        top = digits[pos] if tight else 9
        total = 0
        for d in range(top + 1):
            if d == 0 and started:
                continue
            total += count(pos + 1, tight and d == top, started or d != 0)
        return total
    return count(0, True, False)
`, `function solve(n) {
  const digits = String(n).split('').map(Number), memo = new Map()
  function count(pos, tight, started) {
    if (pos === digits.length) return started ? 1 : 0
    const key = \`\${pos},\${tight},\${started}\`
    if (memo.has(key)) return memo.get(key)
    const top = tight ? digits[pos] : 9
    let total = 0
    for (let d = 0; d <= top; d++) {
      if (d === 0 && started) continue
      total += count(pos + 1, tight && d === top, started || d !== 0)
    }
    memo.set(key, total)
    return total
  }
  return count(0, true, false)
}`),

  'digit-range': pair(`from functools import lru_cache
def solve(lo, hi):
    def F(x):
        if x < 0:
            return 0
        digits = list(map(int, str(x)))
        @lru_cache(None)
        def count(pos, tight, seen):
            if pos == len(digits):
                return 1 if seen else 0
            top = digits[pos] if tight else 9
            return sum(count(pos + 1, tight and d == top, seen or d == 7) for d in range(top + 1))
        return count(0, True, False)
    return F(hi) - F(lo - 1)
`, `function solve(lo, hi) {
  function F(x) {
    if (x < 0) return 0
    const digits = String(x).split('').map(Number), memo = new Map()
    function count(pos, tight, seen) {
      if (pos === digits.length) return seen ? 1 : 0
      const key = \`\${pos},\${tight},\${seen}\`
      if (memo.has(key)) return memo.get(key)
      const top = tight ? digits[pos] : 9
      let total = 0
      for (let d = 0; d <= top; d++) total += count(pos + 1, tight && d === top, seen || d === 7)
      memo.set(key, total)
      return total
    }
    return count(0, true, false)
  }
  return F(hi) - F(lo - 1)
}`),

  'digit-sum': pair(`from functools import lru_cache
def solve(n, s, m):
    digits = list(map(int, str(n)))
    @lru_cache(None)
    def count(pos, tight, total, rem):
        if total > s:
            return 0
        if pos == len(digits):
            return 1 if total == s and rem == 0 else 0
        top = digits[pos] if tight else 9
        return sum(count(pos + 1, tight and d == top, total + d, (rem * 10 + d) % m) for d in range(top + 1))
    return count(0, True, 0, 0) - (1 if s == 0 else 0)
`, `function solve(n, s, m) {
  const digits = String(n).split('').map(Number), memo = new Map()
  function count(pos, tight, total, rem) {
    if (total > s) return 0
    if (pos === digits.length) return total === s && rem === 0 ? 1 : 0
    const key = \`\${pos},\${tight},\${total},\${rem}\`
    if (memo.has(key)) return memo.get(key)
    const top = tight ? digits[pos] : 9
    let out = 0
    for (let d = 0; d <= top; d++) out += count(pos + 1, tight && d === top, total + d, (rem * 10 + d) % m)
    memo.set(key, out)
    return out
  }
  return count(0, true, 0, 0) - (s === 0 ? 1 : 0)
}`),

  'digit-mask': pair(`from functools import lru_cache
def solve(n):
    digits = list(map(int, str(n)))
    @lru_cache(None)
    def count(pos, tight, mask, started):
        if pos == len(digits):
            return 1 if started else 0
        top = digits[pos] if tight else 9
        total = 0
        for d in range(top + 1):
            if not started and d == 0:
                total += count(pos + 1, tight and d == top, 0, False)
            elif not mask & (1 << d):
                total += count(pos + 1, tight and d == top, mask | 1 << d, True)
        return total
    return count(0, True, 0, False)
`, `function solve(n) {
  const digits = String(n).split('').map(Number), memo = new Map()
  function count(pos, tight, mask, started) {
    if (pos === digits.length) return started ? 1 : 0
    const key = \`\${pos},\${tight},\${mask},\${started}\`
    if (memo.has(key)) return memo.get(key)
    const top = tight ? digits[pos] : 9
    let total = 0
    for (let d = 0; d <= top; d++) {
      if (!started && d === 0) total += count(pos + 1, tight && d === top, 0, false)
      else if (!(mask & (1 << d))) total += count(pos + 1, tight && d === top, mask | (1 << d), true)
    }
    memo.set(key, total)
    return total
  }
  return count(0, true, 0, false)
}`),

  // last = −1 before the first meaningful digit (a sentinel that any digit may follow).
  'digit-adjacency': pair(`from functools import lru_cache
def solve(n):
    digits = list(map(int, str(n)))
    @lru_cache(None)
    def count(pos, tight, last):
        if pos == len(digits):
            return 1 if last >= 0 else 0
        top = digits[pos] if tight else 9
        total = 0
        for d in range(top + 1):
            if last < 0 and d == 0:
                total += count(pos + 1, tight and d == top, -1)
            elif last < 0 or abs(d - last) >= 2:
                total += count(pos + 1, tight and d == top, d)
        return total
    return count(0, True, -1)
`, `function solve(n) {
  const digits = String(n).split('').map(Number), memo = new Map()
  function count(pos, tight, last) {
    if (pos === digits.length) return last >= 0 ? 1 : 0
    const key = \`\${pos},\${tight},\${last}\`
    if (memo.has(key)) return memo.get(key)
    const top = tight ? digits[pos] : 9
    let total = 0
    for (let d = 0; d <= top; d++) {
      if (last < 0 && d === 0) total += count(pos + 1, tight && d === top, -1)
      else if (last < 0 || Math.abs(d - last) >= 2) total += count(pos + 1, tight && d === top, d)
    }
    memo.set(key, total)
    return total
  }
  return count(0, true, -1)
}`),

  // Forward over the digits, carrying (count, total) of the valid prefixes in each (tight, started) state.
  'digit-aggregate': pair(`def solve(n):
    M = 1000000007
    digits = list(map(int, str(n)))
    states = {(True, False): (1, 0)}
    for top_digit in digits:
        nxt = {}
        for (tight, started), (c, t) in states.items():
            top = top_digit if tight else 9
            for d in range(top + 1):
                if d % 2 == 0 and (started or d != 0):
                    continue
                key = (tight and d == top, started or d != 0)
                nt = (10 * t + d * c) % M
                pc, pt = nxt.get(key, (0, 0))
                nxt[key] = ((pc + c) % M, (pt + nt) % M)
        states = nxt
    return sum(t for (tight, started), (c, t) in states.items() if started) % M
`, `function solve(n) {
  const M = 1000000007, digits = String(n).split('').map(Number)
  let states = new Map([['1,0', [1, 0]]])
  for (const topDigit of digits) {
    const next = new Map()
    for (const [key, [c, t]] of states) {
      const [tight, started] = key.split(',').map(Number)
      const top = tight ? topDigit : 9
      for (let d = 0; d <= top; d++) {
        if (d % 2 === 0 && (started || d !== 0)) continue
        const k = \`\${tight && d === top ? 1 : 0},\${started || d !== 0 ? 1 : 0}\`
        const [pc, pt] = next.get(k) ?? [0, 0]
        next.set(k, [(pc + c) % M, (pt + (10 * t + d * c)) % M])
      }
    }
    states = next
  }
  let answer = 0
  for (const [key, [, t]] of states) if (key.endsWith(',1')) answer = (answer + t) % M
  return answer
}`),

  'kmp-dp': pair(`${KMP_PY}
def solve(alphabet, pattern, length):
    M = 1000000007
    step = kmp(pattern, alphabet)
    ways = [0] * (len(pattern) + 1)
    ways[0] = 1
    for _ in range(length):
        nxt = [0] * (len(pattern) + 1)
        for state, w in enumerate(ways):
            if w:
                for c in alphabet:
                    to = step[state][c]
                    if to < len(pattern):
                        nxt[to] = (nxt[to] + w) % M
        ways = nxt
    return sum(ways) % M
`, `${KMP_JS}
function solve(alphabet, pattern, length) {
  const M = 1000000007, step = kmp(pattern, alphabet)
  let ways = new Array(pattern.length + 1).fill(0)
  ways[0] = 1
  for (let i = 0; i < length; i++) {
    const next = new Array(pattern.length + 1).fill(0)
    ways.forEach((w, state) => { if (w) for (const c of alphabet) { const to = step[state][c]; if (to < pattern.length) next[to] = (next[to] + w) % M } })
    ways = next
  }
  return ways.reduce((s, w) => (s + w) % M, 0)
}`),

  'aho-dp': pair(`from collections import deque
def solve(alphabet, patterns, length):
    M = 1000000007
    goto, fail, bad = [{}], [0], [False]
    for p in patterns:
        node = 0
        for c in p:
            if c not in goto[node]:
                goto.append({})
                fail.append(0)
                bad.append(False)
                goto[node][c] = len(goto) - 1
            node = goto[node][c]
        bad[node] = True
    queue = deque()
    for c in alphabet:
        if c in goto[0]:
            queue.append(goto[0][c])
        else:
            goto[0][c] = 0
    while queue:
        u = queue.popleft()
        bad[u] = bad[u] or bad[fail[u]]
        for c in alphabet:
            if c in goto[u]:
                v = goto[u][c]
                fail[v] = goto[fail[u]][c]
                queue.append(v)
            else:
                goto[u][c] = goto[fail[u]][c]
    ways = [0] * len(goto)
    ways[0] = 1
    for _ in range(length):
        nxt = [0] * len(goto)
        for u, w in enumerate(ways):
            if w:
                for c in alphabet:
                    v = goto[u][c]
                    if not bad[v]:
                        nxt[v] = (nxt[v] + w) % M
        ways = nxt
    return sum(ways) % M
`, `function solve(alphabet, patterns, length) {
  const M = 1000000007, go = [{}], fail = [0], bad = [false]
  for (const p of patterns) {
    let node = 0
    for (const c of p) {
      if (!(c in go[node])) { go.push({}); fail.push(0); bad.push(false); go[node][c] = go.length - 1 }
      node = go[node][c]
    }
    bad[node] = true
  }
  const queue = []
  for (const c of alphabet) { if (c in go[0]) queue.push(go[0][c]); else go[0][c] = 0 }
  for (let i = 0; i < queue.length; i++) {
    const u = queue[i]
    bad[u] = bad[u] || bad[fail[u]]
    for (const c of alphabet) {
      if (c in go[u]) { const v = go[u][c]; fail[v] = go[fail[u]][c]; queue.push(v) } else go[u][c] = go[fail[u]][c]
    }
  }
  let ways = new Array(go.length).fill(0)
  ways[0] = 1
  for (let i = 0; i < length; i++) {
    const next = new Array(go.length).fill(0)
    ways.forEach((w, u) => { if (w) for (const c of alphabet) { const v = go[u][c]; if (!bad[v]) next[v] = (next[v] + w) % M } })
    ways = next
  }
  return ways.reduce((s, w) => (s + w) % M, 0)
}`),

  // State: (matched-prefix length, remainder). Matched length len(pattern) means “found” and stays found.
  'automaton-product': pair(`${KMP_PY}
def solve(pattern, m, length):
    M = 1000000007
    digits = '0123456789'
    step = kmp(pattern, digits)
    full = len(pattern)
    ways = [[0] * m for _ in range(full + 1)]
    ways[0][0] = 1
    for _ in range(length):
        nxt = [[0] * m for _ in range(full + 1)]
        for state in range(full + 1):
            for rem in range(m):
                w = ways[state][rem]
                if w:
                    for c in digits:
                        to = full if state == full else step[state][c]
                        r = (rem * 10 + int(c)) % m
                        nxt[to][r] = (nxt[to][r] + w) % M
        ways = nxt
    return ways[full][0]
`, `${KMP_JS}
function solve(pattern, m, length) {
  const M = 1000000007, digits = '0123456789', step = kmp(pattern, digits), full = pattern.length
  let ways = Array.from({ length: full + 1 }, () => new Array(m).fill(0))
  ways[0][0] = 1
  for (let i = 0; i < length; i++) {
    const next = Array.from({ length: full + 1 }, () => new Array(m).fill(0))
    for (let state = 0; state <= full; state++) for (let rem = 0; rem < m; rem++) {
      const w = ways[state][rem]
      if (!w) continue
      for (const c of digits) {
        const to = state === full ? full : step[state][c], r = (rem * 10 + Number(c)) % m
        next[to][r] = (next[to][r] + w) % M
      }
    }
    ways = next
  }
  return ways[full][0]
}`),

  // cnt[rest][state]: completions of rest more symbols from an automaton state, capped above any k asked.
  'ranking': pair(`${KMP_PY}
def solve(alphabet, pattern, length, k):
    alphabet = ''.join(sorted(alphabet))
    step = kmp(pattern, alphabet)
    full = len(pattern)
    cnt = [[1 if s < full else 0 for s in range(full + 1)]]
    for rest in range(1, length + 1):
        cnt.append([0 if s == full else sum(cnt[rest - 1][step[s][c]] for c in alphabet) for s in range(full + 1)])
    if k > cnt[length][0]:
        return ''
    out, state = [], 0
    for rest in range(length, 0, -1):
        for c in alphabet:
            nxt = step[state][c]
            if k <= cnt[rest - 1][nxt]:
                out.append(c)
                state = nxt
                break
            k -= cnt[rest - 1][nxt]
    return ''.join(out)
`, `${KMP_JS}
function solve(alphabet, pattern, length, k) {
  const abc = [...alphabet].sort().join(''), step = kmp(pattern, abc), full = pattern.length, CAP = 2 ** 53
  const cnt = [Array.from({ length: full + 1 }, (_, s) => (s < full ? 1 : 0))]
  for (let rest = 1; rest <= length; rest++) cnt.push(Array.from({ length: full + 1 }, (_, s) => (s === full ? 0 : Math.min(CAP, [...abc].reduce((t, c) => t + cnt[rest - 1][step[s][c]], 0)))))
  if (k > cnt[length][0]) return ''
  let out = '', state = 0
  for (let rest = length; rest > 0; rest--) {
    for (const c of abc) {
      const next = step[state][c]
      if (k <= cnt[rest - 1][next]) { out += c; state = next; break }
      k -= cnt[rest - 1][next]
    }
  }
  return out
}`),
}

export const ADVANCED_SOLUTIONS = { ...DAG_SOLUTIONS, ...TREE_SOLUTIONS, ...SUBSET_SOLUTIONS, ...DIGIT_SOLUTIONS }
