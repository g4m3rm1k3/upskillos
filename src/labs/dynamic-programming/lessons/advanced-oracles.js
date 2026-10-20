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

export const ADVANCED_ORACLES = {
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
