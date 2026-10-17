// Test-only answer keys for the Core-pattern challenges, written WITHOUT dynamic programming:
// exhaustive enumeration, or a closed formula in BigInt. They check that every expected value
// in core-challenges.js is right independently of the reference solutions (which are DP, the
// very method being taught). An oracle returns undefined when an input is too big to enumerate;
// the test then relies on the two reference solutions agreeing, and requires at least three
// cases per challenge that the oracle did check.

const range = n => Array.from({ length: n }, (_, i) => i)
const subsets = n => range(2 ** n).map(mask => range(n).filter(i => mask & (1 << i)))
const sum = xs => xs.reduce((s, x) => s + x, 0)
const big = n => Number(n)
function binomBig(n, k) { if (k < 0 || k > n) return 0n; let r = 1n; for (let i = 1n; i <= BigInt(k); i++) r = (r * (BigInt(n) - BigInt(k) + i)) / i; return r }
// Every way to write `left` as an ordered list of allowed parts (stops counting past `cap`).
function compositions(left, parts, cap = 2e6) { let count = 0; const go = r => { if (count > cap) return; if (r === 0) { count++; return } for (const p of parts) if (p <= r) go(r - p) }; go(left); return count > cap ? undefined : count }
// Every right/down path through a rows × cols grid, as the list of cells it visits.
function gridPaths(rows, cols, diagonal = false) {
  const out = []
  const go = (r, c, path) => {
    if (r === rows - 1 && c === cols - 1) { out.push(path); return }
    if (r + 1 < rows) go(r + 1, c, [...path, [r + 1, c, 'D']])
    if (c + 1 < cols) go(r, c + 1, [...path, [r, c + 1, 'R']])
    if (diagonal && r + 1 < rows && c + 1 < cols) go(r + 1, c + 1, [...path, [r + 1, c + 1, 'X']])
  }
  if (rows > 0 && cols > 0) go(0, 0, [[0, 0, 'S']])
  return out
}
function permutations(n) { if (n === 0) return [[]]; return permutations(n - 1).flatMap(p => range(n).map(i => [...p.slice(0, i), n - 1, ...p.slice(i)])) }

export const ORACLES = {
  // Matrix powers in BigInt: [[1,1],[1,0]]^n holds F(n).
  fibonacci: ([n]) => { let a = 0n, b = 1n; const mul = (x, y) => [x[0] * y[0] + x[1] * y[2], x[0] * y[1] + x[1] * y[3], x[2] * y[0] + x[3] * y[2], x[2] * y[1] + x[3] * y[3]]; let r = [1n, 0n, 0n, 1n], m = [1n, 1n, 1n, 0n], e = n; while (e > 0) { if (e & 1) r = mul(r, m); m = mul(m, m); e >>= 1 } a = r[1]; void b; return big(a) },
  stairs: ([n, steps]) => compositions(n, steps),
  'min-cost-stairs': ([costs]) => {
    if (!costs.length) return 0
    let best = Infinity
    const go = (i, total) => { if (i === costs.length - 1) { best = Math.min(best, total); return } for (const j of [1, 2]) if (i + j < costs.length) go(i + j, total + costs[i + j]) }
    go(-1, 0); return best
  },
  'house-robber': ([values]) => (values.length > 18 ? undefined : Math.max(0, ...subsets(values.length).filter(s => s.every((v, k) => k === 0 || v - s[k - 1] > 1)).map(s => sum(s.map(i => values[i]))))),
  'circular-selection': ([values]) => {
    const n = values.length
    if (n > 18) return undefined
    return Math.max(0, ...subsets(n).filter(s => s.every((v, k) => k === 0 || v - s[k - 1] > 1) && !(n > 1 && s.includes(0) && s.includes(n - 1))).map(s => sum(s.map(i => values[i]))))
  },
  'activity-selection': ([rewards]) => {
    if (!rewards.length) return 0
    if (rewards.length > 9) return undefined
    let best = -Infinity
    const go = (day, last, total) => { if (day === rewards.length) { best = Math.max(best, total); return } rewards[day].forEach((r, a) => { if (a !== last) go(day + 1, a, total + r) }) }
    go(0, -1, 0); return best
  },
  'max-subarray': ([values]) => {
    let best = null
    for (let i = 0; i < values.length; i++) for (let j = i; j < values.length; j++) { const s = sum(values.slice(i, j + 1)); if (!best || s > best[0]) best = [s, i, j] }
    return best ?? [0, -1, -1]
  },
  'max-product': ([values]) => { let best = -Infinity; for (let i = 0; i < values.length; i++) { let p = 1; for (let j = i; j < values.length; j++) { p *= values[j]; best = Math.max(best, p) } } return best },
  'decode-ways': ([s]) => {
    if (s.length > 26) return undefined
    const go = i => (i === s.length ? 1 : (s[i] === '0' ? 0 : go(i + 1) + (i + 1 < s.length && Number(s.slice(i, i + 2)) <= 26 ? go(i + 2) : 0)))
    return go(0)
  },
  'word-break': ([s, words]) => { const go = i => i === s.length || words.some(w => w && s.startsWith(w, i) && go(i + w.length)); return s.length > 22 ? undefined : go(0) },
  'word-break-count': ([s, words]) => { const go = i => (i === s.length ? 1 : sum(words.filter(w => w && s.startsWith(w, i)).map(w => go(i + w.length)))); return s.length > 22 ? undefined : go(0) },
  // Delannoy numbers: Σ C(m, k) C(n, k) 2^k.
  'grid-paths': ([rows, cols]) => (rows === 0 || cols === 0 ? 0 : big(range(Math.min(rows, cols)).reduce((s, k) => s + binomBig(rows - 1, k) * binomBig(cols - 1, k) * 2n ** BigInt(k), 0n))),
  'obstacle-paths': ([grid]) => (grid.length * (grid[0]?.length ?? 0) > 49 ? undefined : gridPaths(grid.length, grid[0]?.length ?? 0).filter(p => p.every(([r, c]) => grid[r][c] === 0)).length),
  'min-grid-path': ([grid]) => {
    if (!grid.length || !grid[0].length) return [0, 0]
    if (grid.length + grid[0].length > 16) return undefined
    const sums = gridPaths(grid.length, grid[0].length).map(p => sum(p.map(([r, c]) => grid[r][c])))
    const low = Math.min(...sums)
    return [low, sums.filter(s => s === low).length]
  },
  'triangle-path': ([tri]) => { if (!tri.length) return 0; if (tri.length > 16) return undefined; const go = (r, c) => tri[r][c] + (r + 1 === tri.length ? 0 : Math.min(go(r + 1, c), go(r + 1, c + 1))); return go(0, 0) },
  'grid-resources': ([grid, budget]) => (grid.length * (grid[0]?.length ?? 0) > 49 ? undefined : gridPaths(grid.length, grid[0]?.length ?? 0).filter(p => sum(p.map(([r, c]) => grid[r][c])) <= budget).length),
  'grid-direction': ([grid, turn]) => {
    if (!grid.length || !grid[0].length) return 0
    if (grid.length + grid[0].length > 16) return undefined
    return Math.min(...gridPaths(grid.length, grid[0].length).map(p => sum(p.slice(1).map(([r, c]) => grid[r][c])) + turn * p.slice(2).filter((x, k) => x[2] !== p[k + 1][2]).length))
  },
  'max-square': ([grid]) => { let best = 0; for (let r = 0; r < grid.length; r++) for (let c = 0; c < (grid[0]?.length ?? 0); c++) for (let s = 1; r + s <= grid.length && c + s <= grid[0].length; s++) { let ok = true; for (let i = r; i < r + s && ok; i++) for (let j = c; j < c + s; j++) if (grid[i][j] !== 1) { ok = false; break } if (ok) best = Math.max(best, s) } return best },
  'grid-multiagent': ([grid]) => {
    const rows = grid.length, cols = grid[0]?.length ?? 0
    if (!rows || !cols) return 0
    if (rows > 6) return undefined
    let best = -Infinity
    const go = (r, a, b, total) => {
      total += a === b ? grid[r][a] : grid[r][a] + grid[r][b]
      if (r === rows - 1) { best = Math.max(best, total); return }
      for (const da of [-1, 0, 1]) for (const db of [-1, 0, 1]) { const na = a + da, nb = b + db; if (na >= 0 && na < cols && nb >= 0 && nb < cols) go(r + 1, na, nb, total) }
    }
    go(0, 0, cols - 1, 0); return best
  },
  'zero-one-knapsack': ([weights, values, cap]) => (weights.length > 18 ? undefined : Math.max(0, ...subsets(weights.length).filter(s => sum(s.map(i => weights[i])) <= cap).map(s => sum(s.map(i => values[i]))))),
  'unbounded-knapsack': ([weights, values, cap]) => {
    if (cap > 40) return undefined
    let best = 0
    const go = (i, left, total) => { if (i === weights.length) { best = Math.max(best, total); return } for (let q = 0; q * weights[i] <= left; q++) go(i + 1, left - q * weights[i], total + q * values[i]) }
    go(0, cap, 0); return best
  },
  'bounded-knapsack': ([weights, values, counts, cap]) => {
    let best = 0
    const go = (i, left, total) => { if (i === weights.length) { best = Math.max(best, total); return } for (let q = 0; q <= counts[i] && q * weights[i] <= left; q++) go(i + 1, left - q * weights[i], total + q * values[i]) }
    go(0, cap, 0); return best
  },
  'subset-sum': ([values, target]) => (values.length > 18 ? undefined : subsets(values.length).some(s => sum(s.map(i => values[i])) === target)),
  'equal-partition': ([values]) => { if (values.length > 18) return undefined; const total = sum(values); return Math.min(...subsets(values.length).map(s => Math.abs(total - 2 * sum(s.map(i => values[i]))))) },
  'target-signs': ([values, target]) => (values.length > 18 ? undefined : range(2 ** values.length).filter(mask => sum(values.map((v, i) => (mask & (1 << i) ? v : -v))) === target).length),
  'coin-min': ([coins, amount]) => {
    if (amount > 40) return undefined
    let best = Infinity
    const go = (i, left, used) => { if (left === 0) { best = Math.min(best, used); return } if (i === coins.length) return; for (let q = 0; q * coins[i] <= left; q++) go(i + 1, left - q * coins[i], used + q) }
    go(0, amount, 0); return best === Infinity ? -1 : best
  },
  'coin-combinations': ([coins, amount]) => { if (amount > 60) return undefined; const go = (i, left) => (left === 0 ? 1 : i === coins.length ? 0 : sum(range(Math.floor(left / coins[i]) + 1).map(q => go(i + 1, left - q * coins[i])))); return go(0, amount) },
  'coin-permutations': ([coins, amount]) => compositions(amount, coins),
  'value-knapsack': ([weights, values, cap]) => (weights.length > 18 ? undefined : Math.max(0, ...subsets(weights.length).filter(s => sum(s.map(i => weights[i])) <= cap).map(s => sum(s.map(i => values[i]))))),
  'multidimensional-knapsack': ([items, capWeight, capVolume]) => (items.length > 18 ? undefined : Math.max(0, ...subsets(items.length).filter(s => sum(s.map(i => items[i][0])) <= capWeight && sum(s.map(i => items[i][1])) <= capVolume).map(s => sum(s.map(i => items[i][2]))))),
  'group-knapsack': ([groups, cap]) => {
    let best = 0
    const go = (g, left, total) => { if (g === groups.length) { best = Math.max(best, total); return } go(g + 1, left, total); for (const [w, v] of groups[g]) if (w <= left) go(g + 1, left - w, total + v) }
    go(0, cap, 0); return best
  },
  'exact-capacity': ([weights, values, cap]) => { if (weights.length > 18) return undefined; const fits = subsets(weights.length).filter(s => sum(s.map(i => weights[i])) === cap); return fits.length ? Math.max(...fits.map(s => sum(s.map(i => values[i])))) : -1 },
  'rod-cutting': ([prices, n]) => {
    if (n > 25) return undefined
    let best = -Infinity
    const go = (left, total) => { if (left === 0) { best = Math.max(best, total); return } for (let k = 1; k <= Math.min(left, prices.length); k++) go(left - k, total + prices[k - 1]) }
    go(n, 0); return best
  },
  binomial: ([n, k]) => big(binomBig(n, k)),
  // Partitions counted by listing them: parts in non-increasing order.
  'integer-partitions': ([n]) => { if (n > 45) return undefined; const go = (left, most) => (left === 0 ? 1 : sum(range(Math.min(left, most)).map(i => go(left - (i + 1), i + 1)))); return go(n, n) },
  catalan: ([n]) => big(binomBig(2 * n, n) / BigInt(n + 1)),
  'balanced-parentheses': ([s]) => {
    const q = [...s].filter(ch => ch === '?').length
    if (q > 16) return undefined
    return range(2 ** q).filter(mask => { let k = 0, depth = 0; for (const ch of s) { const c = ch === '?' ? (mask & (1 << k++) ? '(' : ')') : ch; depth += c === '(' ? 1 : -1; if (depth < 0) return false } return depth === 0 }).length
  },
  // Inclusion–exclusion: D(n) = Σ (−1)^k n! / k!.
  derangements: ([n]) => { let fact = 1n; for (let i = 2n; i <= BigInt(n); i++) fact *= i; let total = 0n, term = fact; for (let k = 0; k <= n; k++) { if (k > 0) term /= BigInt(k); total += (k % 2 ? -1n : 1n) * term } return big(total) },
  // S(n, k) = (1/k!) Σ (−1)^j C(k, j) (k − j)^n.
  stirling: ([n, k]) => { if (k > n) return 0; if (k === 0) return n === 0 ? 1 : 0; let s = 0n, kf = 1n; for (let j = 0; j <= k; j++) s += (j % 2 ? -1n : 1n) * binomBig(k, j) * BigInt(k - j) ** BigInt(n); for (let i = 2n; i <= BigInt(k); i++) kf *= i; return big(s / kf) },
  'inversion-counting': ([n, k]) => (n > 8 ? undefined : permutations(n).filter(p => { let inv = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (p[i] > p[j]) inv++; return inv === k }).length),
}
