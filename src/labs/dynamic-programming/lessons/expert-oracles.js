// Exhaustive answer keys for the Expert challenges (expert-challenges.js), written without DP: every
// path, subset, choice of counts or assignment is listed. They return undefined when an input is too
// large to enumerate. lessons.test.js checks every challenge case against them.
const M = 1000000007
const subsetsOf = n => Array.from({ length: 2 ** n }, (_, m) => Array.from({ length: n }, (_, i) => i).filter(i => m & (1 << i)))
// Every vector of counts with 0 ≤ q[i] ≤ limits[i].
function countVectors(limits, visit, i = 0, q = []) {
  if (i === limits.length) { visit(q); return }
  for (let x = 0; x <= limits[i]; x++) countVectors(limits, visit, i + 1, [...q, x])
}
const increasingSubs = a => subsetsOf(a.length).filter(s => s.length && s.every((i, k) => k === 0 || a[s[k - 1]] < a[i]))

const SPACE_ORACLES = {
  // Every right/down path, walked one step at a time.
  'rolling-arrays': ([grid]) => {
    const R = grid.length, C = grid[0].length
    if (R + C > 14) return undefined
    const go = (r, c) => (r >= R || c >= C || grid[r][c] ? 0 : r === R - 1 && c === C - 1 ? 1 : go(r + 1, c) + go(r, c + 1))
    return go(0, 0) % M
  },
  // Every number of copies: up to 1 for a 0/1 item, as many as fit for an unlimited one.
  'in-place': ([items, cap]) => {
    if (items.length > 6 || cap > 30) return undefined
    let best = 0
    countVectors(items.map(([w, , many]) => (many ? Math.floor(cap / Math.max(1, w)) : 1)), q => {
      const w = q.reduce((t, x, i) => t + x * items[i][0], 0)
      if (w <= cap) best = Math.max(best, q.reduce((t, x, i) => t + x * items[i][1], 0))
    })
    return best
  },
  // Every common subsequence: the longest, smallest in dictionary order.
  'hirschberg': ([a, b]) => {
    if (a.length > 12) return undefined
    let best = ''
    for (const s of subsetsOf(a.length)) {
      const w = s.map(i => a[i]).join('')
      let j = 0
      for (const ch of b) if (j < w.length && ch === w[j]) j++
      if (j === w.length && (w.length > best.length || (w.length === best.length && w < best))) best = w
    }
    return best
  },
  // Every sequence of steps of size 1 … k that adds up to n.
  'prefix-sum-dp': ([n, k]) => { if (n > 22) return undefined; const go = left => (left === 0 ? 1 : Array.from({ length: Math.min(k, left) }, (_, s) => go(left - s - 1)).reduce((t, x) => t + x, 0)); return go(n) % M },
  // Every way to give child i between 0 and limits[i] candies, adding up to total.
  'difference-dp': ([limits, total]) => {
    if (limits.reduce((p, x) => p * (x + 1), 1) > 300000) return undefined
    let count = 0
    countVectors(limits, q => { if (q.reduce((t, x) => t + x, 0) === total) count++ })
    return count % M
  },
  // Every sequence of jumps of 1 … k from the first square to the last.
  'monotone-queue': ([a, k]) => {
    if (a.length > 18) return undefined
    let best = -Infinity
    const go = (i, total) => { if (i === a.length - 1) { best = Math.max(best, total); return } for (let s = 1; s <= k && i + s < a.length; s++) go(i + s, total + a[i + s]) }
    go(0, a[0])
    return best
  },
  'fenwick-dp': ([a]) => (a.length > 16 ? undefined : increasingSubs(a).length % M),
  // Every subsequence whose neighbouring values differ by at most d: the longest.
  'segment-tree-dp': ([a, d]) => (a.length > 16 ? undefined : Math.max(0, ...subsetsOf(a.length).filter(s => s.every((i, k) => k === 0 || Math.abs(a[i] - a[s[k - 1]]) <= d)).map(s => s.length))),
  'coordinate-compression': ([a]) => (a.length > 16 ? undefined : Math.max(0, ...increasingSubs(a).map(s => s.reduce((t, i) => t + a[i], 0)))),
  'pareto-frontiers': ([weights, values, cap]) => (weights.length > 16 ? undefined : Math.max(0, ...subsetsOf(weights.length).filter(s => s.reduce((t, i) => t + weights[i], 0) <= cap).map(s => s.reduce((t, i) => t + values[i], 0)))),
  'bitset-dp': ([values]) => (values.length > 16 ? undefined : new Set(subsetsOf(values.length).map(s => s.reduce((t, i) => t + values[i], 0))).size),
  'bounded-binary': ([weights, values, counts, cap]) => {
    const limits = weights.map((w, i) => Math.min(counts[i], Math.floor(cap / Math.max(1, w))))
    if (limits.reduce((p, x) => p * (x + 1), 1) > 300000) return undefined
    let best = 0
    countVectors(limits, q => { if (q.reduce((t, x, i) => t + x * weights[i], 0) <= cap) best = Math.max(best, q.reduce((t, x, i) => t + x * values[i], 0)) })
    return best
  },
  // Every choice of counts that weighs exactly the target.
  'bounded-queue': ([weights, counts, target]) => {
    const limits = weights.map((w, i) => Math.min(counts[i], Math.floor(target / Math.max(1, w))))
    if (limits.reduce((p, x) => p * (x + 1), 1) > 300000) return undefined
    let count = 0
    countVectors(limits, q => { if (q.reduce((t, x, i) => t + x * weights[i], 0) === target) count++ })
    return count % M
  },
  // Every assignment of jobs to machines: the smallest largest load.
  'symmetry': ([jobs, k]) => {
    if (k ** jobs.length > 300000) return undefined
    let best = Infinity
    const go = (i, loads) => { if (i === jobs.length) { best = Math.min(best, Math.max(0, ...loads)); return } for (let m = 0; m < k; m++) { loads[m] += jobs[i]; go(i + 1, loads); loads[m] -= jobs[i] } }
    go(0, Array(k).fill(0))
    return best
  },
}

export const EXPERT_ORACLES = { ...SPACE_ORACLES }
