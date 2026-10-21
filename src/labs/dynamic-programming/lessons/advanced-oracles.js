// Exhaustive answer keys for the Advanced challenges (advanced-challenges.js), written without DP: every
// path, walk or chain is listed. They return undefined when an input is too large to enumerate.
// lessons.test.js checks every challenge case against them.

// Every path from s to t in a graph given as [u, v, (w)] edges; cycles are never entered twice.
function simplePaths(n, edges, s, t) {
  const out = []
  const go = (v, seen, path) => {
    if (v === t) { out.push(path); return }
    for (const e of edges) if (e[0] === v && !seen.has(e[1])) go(e[1], new Set([...seen, e[1]]), [...path, e])
  }
  go(s, new Set([s]), [])
  return out
}
const cost = path => path.reduce((t, e) => t + e[2], 0)

const DAG_ORACLES = {
  // ── DAGs and graph recurrences ──
  'dag-paths': ([n, edges, s, t]) => (edges.length > 30 ? undefined : simplePaths(n, edges, s, t).length),
  'dag-longest': ([n, edges, s, t]) => {
    if (edges.length > 30) return undefined
    const paths = simplePaths(n, edges, s, t)
    return paths.length ? Math.min(...paths.map(cost)) : null
  },
  // Every strictly increasing path, walked from every cell.
  'increasing-grid': ([grid]) => {
    const r = grid.length, c = grid[0]?.length ?? 0
    if (r * c > 30) return undefined
    let best = 0
    const go = (i, j, len) => {
      best = Math.max(best, len)
      for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) if (a >= 0 && b >= 0 && a < r && b < c && grid[a][b] > grid[i][j]) go(a, b, len + 1)
    }
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) go(i, j, 1)
    return best
  },
  // The slowest chain of tasks, each chain followed from every task through its dependents.
  'critical-path': ([durations, deps]) => {
    if (durations.length > 14) return undefined
    let best = 0
    const go = (v, total) => {
      best = Math.max(best, total)
      for (const [a, b] of deps) if (a === v) go(b, total + durations[b])
    }
    durations.forEach((d, v) => go(v, d))
    return best
  },
  // Every walk of at most k edges from s (vertices may repeat).
  'bellman-ford-dp': ([n, edges, s, k]) => {
    if (k > 6 || edges.length > 12) return undefined
    const best = Array(n).fill(null)
    const go = (v, left, total) => {
      if (best[v] === null || total < best[v]) best[v] = total
      if (left === 0) return
      for (const [u, w, c] of edges) if (u === v) go(w, left - 1, total + c)
    }
    go(s, k, 0)
    return best
  },
  // Every simple path between every pair (there is no negative cycle, so a shortest path is simple).
  'floyd-warshall': ([n, edges]) => {
    if (n > 6) return undefined
    return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
      if (i === j) return 0
      const paths = simplePaths(n, edges, i, j)
      return paths.length ? Math.min(...paths.map(cost)) : null
    }))
  },
  // Every (vertex, set visited so far) state a walk from s can reach: the best set's total value.
  'scc-boundaries': ([values, edges, s]) => {
    const n = values.length
    if (n > 10) return undefined
    const seen = new Set(), stack = [[s, 1 << s]]
    let best = 0
    while (stack.length) {
      const [v, mask] = stack.pop()
      const key = `${v}:${mask}`
      if (seen.has(key)) continue
      seen.add(key)
      best = Math.max(best, values.reduce((t, x, i) => t + (mask & (1 << i) ? x : 0), 0))
      for (const [a, b] of edges) if (a === v) stack.push([b, mask | (1 << b)])
    }
    return best
  },
  // Every path from s to t, with the coupon (cost ⌊w / 2⌋) on its best edge, or on none.
  'dag-product': ([n, edges, s, t]) => {
    if (edges.length > 30) return undefined
    const paths = simplePaths(n, edges, s, t)
    if (!paths.length) return null
    return Math.min(...paths.map(p => cost(p) - Math.max(0, ...p.map(e => e[2] - Math.floor(e[2] / 2)))))
  },
}

// ── Trees: n vertices, edges [u, v] (or [u, v, w]), rooted at 0 where a root matters. Every subset,
// pair or colouring is listed, and distances come from a search from every vertex. ──
const neighbours = (n, edges) => { const adj = Array.from({ length: n }, () => []); for (const e of edges) { adj[e[0]].push([e[1], e[2] ?? 1]); adj[e[1]].push([e[0], e[2] ?? 1]) } return adj }
// Distances from s to every vertex (a tree has one path between any two).
function distancesFrom(adj, s) {
  const d = Array(adj.length).fill(-1); d[s] = 0
  const stack = [s]
  while (stack.length) { const v = stack.pop(); for (const [u, w] of adj[v]) if (d[u] < 0) { d[u] = d[v] + w; stack.push(u) } }
  return d
}
// The vertices on the path from v up to the root 0, v first.
function pathToRoot(adj, v) {
  const parent = Array(adj.length).fill(-1), seen = Array(adj.length).fill(false), stack = [0]; seen[0] = true
  while (stack.length) { const x = stack.pop(); for (const [u] of adj[x]) if (!seen[u]) { seen[u] = true; parent[u] = x; stack.push(u) } }
  const path = [v]; while (path.at(-1) !== 0) path.push(parent[path.at(-1)])
  return path
}
const subsetsOf = n => Array.from({ length: 2 ** n }, (_, m) => Array.from({ length: n }, (_, i) => i).filter(i => m & (1 << i)))
const connected = (adj, set) => {
  if (!set.length) return false
  const inSet = new Set(set), seen = new Set([set[0]]), stack = [set[0]]
  while (stack.length) { const v = stack.pop(); for (const [u] of adj[v]) if (inSet.has(u) && !seen.has(u)) { seen.add(u); stack.push(u) } }
  return seen.size === set.length
}
const MOD = 1000000007

const TREE_ORACLES = {
  // Subtree size of v: how many vertices have v on their path to the root.
  'tree-basics': ([n, edges]) => { if (n > 60) return undefined; const adj = neighbours(n, edges); const sizes = Array(n).fill(0); for (let x = 0; x < n; x++) for (const v of pathToRoot(adj, x)) sizes[v]++; return sizes },
  'tree-independent': ([weights, edges]) => { const n = weights.length; if (n > 16) return undefined; return Math.max(...subsetsOf(n).filter(s => edges.every(([a, b]) => !(s.includes(a) && s.includes(b)))).map(s => s.reduce((t, v) => t + weights[v], 0))) },
  'tree-cover': ([n, edges]) => (n > 16 ? undefined : Math.min(...subsetsOf(n).filter(s => edges.every(([a, b]) => s.includes(a) || s.includes(b))).map(s => s.length))),
  'tree-matching': ([n, edges]) => (edges.length > 15 ? undefined : Math.max(...subsetsOf(edges.length).filter(s => new Set(s.flatMap(i => edges[i].slice(0, 2))).size === 2 * s.length).map(s => s.length))),
  'tree-diameter': ([n, edges]) => { if (n > 80) return undefined; const adj = neighbours(n, edges); return Math.max(...Array.from({ length: n }, (_, s) => Math.max(...distancesFrom(adj, s)))) },
  'tree-reroot': ([n, edges]) => { if (n > 80) return undefined; const adj = neighbours(n, edges); return Array.from({ length: n }, (_, s) => Math.max(...distancesFrom(adj, s))) },
  // Connected vertex sets that contain each vertex, modulo 1 000 000 007.
  'reroot-prefix': ([n, edges]) => { if (n > 14) return undefined; const adj = neighbours(n, edges); const sets = subsetsOf(n).filter(s => connected(adj, s)); return Array.from({ length: n }, (_, v) => sets.filter(s => s.includes(v)).length % MOD) },
  'tree-distances': ([n, edges]) => { if (n > 80) return undefined; const adj = neighbours(n, edges); return Array.from({ length: n }, (_, s) => distancesFrom(adj, s).reduce((t, d) => t + d, 0)) },
  // Sets closed under taking the parent (so they hang from the root), within the budget.
  'tree-knapsack': ([values, costs, edges, budget]) => {
    const n = values.length; if (n > 16) return undefined
    const adj = neighbours(n, edges), parent = Array(n).fill(-1)
    for (let v = 1; v < n; v++) parent[v] = pathToRoot(adj, v)[1]
    return Math.max(0, ...subsetsOf(n).filter(s => s.every(v => v === 0 || s.includes(parent[v])) && s.reduce((t, v) => t + costs[v], 0) <= budget).map(s => s.reduce((t, v) => t + values[v], 0)))
  },
  // Every assignment of an allowed colour to each vertex, neighbours different.
  'tree-coloring': ([edges, allowed]) => {
    const n = allowed.length; if (allowed.reduce((p, a) => p * Math.max(1, a.length), 1) > 200000) return undefined
    let count = 0
    const go = (v, colour) => { if (v === n) { if (edges.every(([a, b]) => colour[a] !== colour[b])) count++; return } for (const c of allowed[v]) go(v + 1, [...colour, c]) }
    go(0, []); return count
  },
  'tree-path-count': ([n, edges, k]) => { if (n > 80) return undefined; const adj = neighbours(n, edges); let count = 0; for (let s = 0; s < n; s++) count += distancesFrom(adj, s).filter((d, u) => u > s && d === k).length; return count },
  'tree-connected': ([n, edges]) => { if (n > 16) return undefined; const adj = neighbours(n, edges); return subsetsOf(n).filter(s => connected(adj, s)).length },
  // Distinct colours among the vertices whose path to the root passes through v.
  'tree-small-large': ([colors, edges]) => {
    const n = colors.length; if (n > 60) return undefined
    const adj = neighbours(n, edges), seen = Array.from({ length: n }, () => new Set())
    for (let x = 0; x < n; x++) for (const v of pathToRoot(adj, x)) seen[v].add(colors[x])
    return seen.map(s => s.size)
  },
}

// ── Bitmask and subset DP: every subset, permutation, partition or colouring is listed. ──
function permutationsOf(items) {
  if (items.length <= 1) return [items]
  return items.flatMap((x, k) => permutationsOf([...items.slice(0, k), ...items.slice(k + 1)]).map(p => [x, ...p]))
}
// Every way to split items 0 … n − 1 into unlabelled groups.
function setPartitions(n) {
  if (n === 0) return [[]]
  return setPartitions(n - 1).flatMap(p => [...p.map((g, i) => p.map((h, j) => (i === j ? [...h, n - 1] : h))), [...p, [n - 1]]])
}
const SUBSET_ORACLES = {
  // Subsets (by including or leaving out each item) whose total weight is within the limit.
  'bitmask-basics': ([weights, limit]) => { if (weights.length > 16) return undefined; const go = (i, total) => (i === weights.length ? (total <= limit ? 1 : 0) : go(i + 1, total) + go(i + 1, total + weights[i])); return go(0, 0) },
  // For every mask, the sum of values over every mask that lies inside it (checked pair by pair).
  'subset-enumeration': ([values]) => { if (values.length > 64) return undefined; return values.map((_, mask) => values.reduce((t, v, sub) => t + ((sub & ~mask) === 0 ? v : 0), 0)) },
  'assignment': ([cost]) => { const n = cost.length; if (n > 7) return undefined; return n ? Math.min(...permutationsOf([...Array(n).keys()]).map(p => p.reduce((t, job, w) => t + cost[w][job], 0))) : 0 },
  // Every tour from 0 through the other cities and back.
  'held-karp': ([dist]) => { const n = dist.length; if (n > 8) return undefined; if (n === 1) return 0; return Math.min(...permutationsOf([...Array(n).keys()].slice(1)).map(p => [0, ...p, 0].reduce((t, v, i, a) => (i ? t + dist[a[i - 1]][v] : 0), 0))) },
  // Orders of all vertices starting at 0 in which each step follows a directed edge.
  'hamiltonian': ([n, edges]) => { if (n > 8) return undefined; const has = new Set(edges.map(([a, b]) => `${a},${b}`)); return permutationsOf([...Array(n).keys()].slice(1)).filter(p => [0, ...p].every((v, i, a) => i === 0 || has.has(`${a[i - 1]},${v}`))).length },
  // The fewest groups, each with total at most cap, over every partition of the items.
  'subset-partition': ([values, cap]) => { if (values.length > 9) return undefined; return Math.min(...setPartitions(values.length).filter(p => p.every(g => g.reduce((t, i) => t + values[i], 0) <= cap)).map(p => p.length)) },
  // The cheapest choice of options covering every item, or −1.
  'subset-cover': ([n, options]) => { if (options.length > 14) return undefined; let best = Infinity; for (let m = 0; m < 1 << options.length; m++) { const chosen = options.filter((_, i) => m & (1 << i)); const covered = new Set(chosen.flatMap(o => o[0])); if (covered.size === n) best = Math.min(best, chosen.reduce((t, o) => t + o[1], 0)) } return best === Infinity ? -1 : best },
  // The lightest set of edges whose graph connects all the terminals.
  'steiner-tree': ([n, edges, terminals]) => {
    if (edges.length > 14) return undefined
    let best = Infinity
    for (let m = 0; m < 1 << edges.length; m++) {
      const chosen = edges.filter((_, i) => m & (1 << i)), seen = new Set([terminals[0]]), stack = [terminals[0]]
      while (stack.length) { const v = stack.pop(); for (const [a, b] of chosen) for (const [x, y] of [[a, b], [b, a]]) if (x === v && !seen.has(y)) { seen.add(y); stack.push(y) } }
      if (terminals.every(t => seen.has(t))) best = Math.min(best, chosen.reduce((t, e) => t + e[2], 0))
    }
    return best
  },
  'subset-topological': ([n, edges]) => { if (n > 8) return undefined; return permutationsOf([...Array(n).keys()]).filter(p => edges.every(([a, b]) => p.indexOf(a) < p.indexOf(b))).length },
  // Sets of n / 2 edges that touch every vertex exactly once.
  'subset-matching': ([n, edges]) => { if (edges.length > 16) return undefined; let count = 0; for (let m = 0; m < 1 << edges.length; m++) { const chosen = edges.filter((_, i) => m & (1 << i)); if (chosen.length * 2 === n && new Set(chosen.flat()).size === n) count++ } return count },
  // The fewest colours k for which some colouring of the vertices with k colours is proper.
  'subset-coloring': ([n, edges]) => { if (n > 7) return undefined; if (n === 0) return 0; for (let k = 1; ; k++) { const go = (v, c) => (v === n ? edges.every(([a, b]) => c[a] !== c[b]) : [...Array(k).keys()].some(x => go(v + 1, [...c, x]))); if (go(0, [])) return k } },
  // Positions appearing in an odd number of the sets, as a decimal string of the mask.
  'mask-language': ([sets]) => { const count = new Map(); for (const s of sets) for (const p of s) count.set(p, (count.get(p) ?? 0) + 1); let total = 0n; for (const [p, c] of count) if (c % 2) total += 2n ** BigInt(p); return total.toString() },
}

// ── Digit and automaton DP: every number in the range, or every string, is checked one by one. ──
const digitsOf = x => String(x).split('').map(Number)
const countUpTo = (lo, hi, ok) => { if (hi - lo > 300000) return undefined; let c = 0; for (let x = lo; x <= hi; x++) if (ok(x)) c++; return c }
// Every string of the given length over the alphabet, in dictionary order.
function allStrings(alphabet, length) {
  let out = ['']
  for (let i = 0; i < length; i++) out = out.flatMap(s => [...alphabet].sort().map(c => s + c))
  return out
}
const DIGIT_ORACLES = {
  'digit-tight': ([n]) => countUpTo(0, n, x => !String(x).includes('4')),
  'digit-leading': ([n]) => countUpTo(1, n, x => !String(x).includes('0')),
  'digit-range': ([lo, hi]) => countUpTo(lo, hi, x => String(x).includes('7')),
  'digit-sum': ([n, s, m]) => countUpTo(1, n, x => digitsOf(x).reduce((t, d) => t + d, 0) === s && x % m === 0),
  'digit-mask': ([n]) => countUpTo(1, n, x => new Set(String(x)).size === String(x).length),
  'digit-adjacency': ([n]) => countUpTo(1, n, x => digitsOf(x).every((d, i, a) => i === 0 || Math.abs(d - a[i - 1]) >= 2)),
  'digit-aggregate': ([n]) => { if (n > 300000) return undefined; let t = 0; for (let x = 0; x <= n; x++) if (digitsOf(x).every(d => d % 2)) t += x; return t % 1000000007 },
  'kmp-dp': ([alphabet, pattern, length]) => (alphabet.length ** length > 300000 ? undefined : allStrings(alphabet, length).filter(s => !s.includes(pattern)).length % 1000000007),
  'aho-dp': ([alphabet, patterns, length]) => (alphabet.length ** length > 300000 ? undefined : allStrings(alphabet, length).filter(s => patterns.every(p => !s.includes(p))).length % 1000000007),
  // Digit strings of the length (leading zeros allowed) that contain the pattern and whose value is divisible by m.
  'automaton-product': ([pattern, m, length]) => (10 ** length > 300000 ? undefined : allStrings('0123456789', length).filter(s => s.includes(pattern) && Number(s) % m === 0).length % 1000000007),
  'ranking': ([alphabet, pattern, length, k]) => { if (alphabet.length ** length > 300000) return undefined; const ok = allStrings(alphabet, length).filter(s => !s.includes(pattern)); return k <= ok.length ? ok[k - 1] : '' },
}

export const ADVANCED_ORACLES = { ...DAG_ORACLES, ...TREE_ORACLES, ...SUBSET_ORACLES, ...DIGIT_ORACLES }
