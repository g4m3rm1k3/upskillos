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

// Every way to cut positions 0 … n − 1 into consecutive groups: the list of group lengths.
function compositions(n, visit, parts = []) {
  if (n === 0) { visit(parts); return }
  for (let s = 1; s <= n; s++) compositions(n - s, visit, [...parts, s])
}
const sumOf = xs => xs.reduce((t, x) => t + x, 0)
// Every path from the first stone to the last: each subset of the stones in between. cost(i, j) prices a jump.
function everyPath(n, cost) {
  let best = Infinity
  for (const s of subsetsOf(Math.max(0, n - 2))) {
    const stops = [0, ...s.map(i => i + 1), n - 1]
    let total = 0
    for (let k = 1; k < stops.length; k++) total += cost(stops[k - 1], stops[k])
    best = Math.min(best, total)
  }
  return n === 1 ? 0 : best
}

const SPLIT_ORACLES = {
  // Every pair of rows and every pair of columns.
  'monge': ([A]) => {
    const R = A.length, C = A[0].length
    if (R > 10 || C > 10) return undefined
    for (let i = 0; i < R; i++) for (let k = i + 1; k < R; k++) for (let j = 0; j < C; j++) for (let l = j + 1; l < C; l++) if (A[i][j] + A[k][l] > A[i][l] + A[k][j]) return false
    return true
  },
  // Every way to cut a into g consecutive non-empty groups.
  'divide-conquer-opt': ([a, g]) => {
    if (a.length > 14) return undefined
    let best = Infinity
    compositions(a.length, parts => {
      if (parts.length !== g) return
      let at = 0, cost = 0
      for (const p of parts) { cost += sumOf(a.slice(at, at + p)) ** 2; at += p }
      best = Math.min(best, cost)
    })
    return best
  },
  // Every order of merging neighbouring piles, one merge at a time.
  'knuth': ([piles]) => {
    if (piles.length > 8) return undefined
    let best = Infinity
    const go = (ps, cost) => {
      if (ps.length <= 1) { best = Math.min(best, cost); return }
      for (let i = 0; i + 1 < ps.length; i++) go([...ps.slice(0, i), ps[i] + ps[i + 1], ...ps.slice(i + 2)], cost + ps[i] + ps[i + 1])
    }
    go(piles, 0)
    return best
  },
  // Every house against every well.
  'smawk': ([x, y, w]) => (x.length * y.length > 100000 ? undefined : sumOf(x.map(xi => Math.min(...y.map((yj, j) => w[j] + (xi - yj) ** 2))))),
  // Every way to break the words into consecutive lines.
  'cht': ([words, M]) => {
    if (words.length > 14) return undefined
    let best = words.length ? Infinity : 0
    compositions(words.length, parts => {
      let at = 0, cost = 0
      for (const p of parts) { cost += sumOf(words.slice(at, at + p)) ** 2 + M; at += p }
      best = Math.min(best, cost)
    })
    return best
  },
  // Every way to split the soldiers into consecutive groups.
  'monotone-cht': ([x, a, b, c]) => {
    if (x.length > 14) return undefined
    let best = x.length ? -Infinity : 0
    compositions(x.length, parts => {
      let at = 0, value = 0
      for (const p of parts) { const S = sumOf(x.slice(at, at + p)); value += a * S * S + b * S + c; at += p }
      best = Math.max(best, value)
    })
    return best
  },
  'li-chao': ([h, C]) => (h.length > 16 ? undefined : everyPath(h.length, (i, j) => (h[j] - h[i]) ** 2 + C)),
  // The same, in exact integers, as a decimal string.
  'cht-numeric': ([h, C]) => {
    if (h.length > 16) return undefined
    const n = h.length
    if (n === 1) return '0'
    let best = null
    for (const s of subsetsOf(Math.max(0, n - 2))) {
      const stops = [0, ...s.map(i => i + 1), n - 1]
      let total = 0n
      for (let k = 1; k < stops.length; k++) total += (BigInt(h[stops[k]]) - BigInt(h[stops[k - 1]])) ** 2n + BigInt(C)
      if (best === null || total < best) best = total
    }
    return String(best)
  },
  // Every set of chosen positions: its runs can be cut into any number of pieces from runs to size.
  'lagrangian': ([a, k]) => {
    if (a.length > 16) return undefined
    let best = -Infinity
    for (const s of subsetsOf(a.length)) {
      const runs = s.filter((i, t) => t === 0 || s[t - 1] !== i - 1).length
      if (runs <= k && k <= s.length) best = Math.max(best, s.reduce((t, i) => t + a[i], 0))
    }
    return best
  },
  // Every non-decreasing sequence drawn from a’s own values (an optimal one always is).
  'slope-trick': ([a]) => {
    if (a.length > 8) return undefined
    const vals = [...new Set(a)].sort((p, q) => p - q)
    let best = Infinity
    const go = (i, from, cost) => { if (i === a.length) { best = Math.min(best, cost); return } for (let v = from; v < vals.length; v++) go(i + 1, v, cost + Math.abs(a[i] - vals[v])) }
    go(0, 0, 0)
    return a.length ? best : 0
  },
  // Every subset of the points, kept if x and y both rise along it.
  'cdq': ([x, y]) => (x.length > 16 ? undefined : Math.max(0, ...subsetsOf(x.length).filter(s => s.every((i, t) => t === 0 || (x[s[t - 1]] < x[i] && y[s[t - 1]] < y[i]))).map(s => s.length))),
  // a[n] is the sum, over every way to write n as an ordered sum of parts, of the product of b[part].
  'online-convolution': ([b, n]) => {
    if (n > 16) return undefined
    let total = 0n
    compositions(n, parts => { total += parts.reduce((p, s) => p * BigInt(b[s] ?? 0), 1n) })
    return Number(total % 998244353n)
  },
}

const P998 = 998244353, P107 = 1000000007
const popcount = m => { let c = 0; for (; m; m &= m - 1) c++; return c }
// Exact arithmetic modulo p, for the answer keys.
const mulB = (a, b, p) => Number((BigInt(a) * BigInt(b)) % BigInt(p))
const powB = (a, e, p) => { let r = 1n, x = BigInt(((a % p) + p) % p), E = BigInt(e), P = BigInt(p); while (E > 0n) { if (E & 1n) r = (r * x) % P; x = (x * x) % P; E >>= 1n } return Number(r) }

const ALGEBRA_ORACLES = {
  // Every walk of n edges from vertex 0, followed edge by edge.
  'matrix-power': ([k, edges, n]) => {
    if (n > 9 || edges.length ** Math.min(n, 9) > 2e6) return undefined
    const go = (v, left) => (left === 0 ? (v === k - 1 ? 1 : 0) : edges.reduce((t, [a, b]) => t + (a === v ? go(b, left - 1) : 0), 0))
    return go(0, n) % P107
  },
  // The recurrence applied term by term.
  'linear-recurrence': ([c, a, n]) => {
    if (n > 3000) return undefined
    const s = a.map(x => ((x % P998) + P998) % P998)
    while (s.length <= n) { let t = 0; for (let i = 0; i < c.length; i++) t = (t + mulB(c[i], s[s.length - 1 - i], P998)) % P998; s.push(((t % P998) + P998) % P998) }
    return s[n]
  },
  // The shortest recurrence by linear algebra: for each order L, solve for its coefficients from the
  // given terms by Gaussian elimination mod p, and keep the first L that fits every term.
  'berlekamp-massey': ([s]) => {
    const N = s.length
    if (N > 40) return undefined
    const v = s.map(x => ((x % P998) + P998) % P998)
    for (let L = 0; 2 * L <= N; L++) {
      // Equations v[i] = c1 v[i-1] + ... + cL v[i-L] for i = L … N − 1.
      const rows = []
      for (let i = L; i < N; i++) rows.push([...Array.from({ length: L }, (_, j) => v[i - 1 - j]), v[i]])
      const c = solveMod(rows, L)
      if (c) { let t = 0; for (let j = 0; j < L; j++) t = (t + mulB(c[j], v[N - 1 - j], P998)) % P998; return t }
    }
    return undefined
  },
  // The power series P / Q, one coefficient at a time.
  'bostan-mori': ([Pp, Q, n]) => {
    if (n > 2000) return undefined
    const p = Pp.map(x => ((x % P998) + P998) % P998), q = Q.map(x => ((x % P998) + P998) % P998)
    const f = []
    for (let i = 0; i <= n; i++) { let t = p[i] ?? 0; for (let j = 1; j <= Math.min(i, q.length - 1); j++) t = (t - mulB(q[j], f[i - j], P998) + P998) % P998; f.push(t) }
    return f[n]
  },
  // g multiplied by itself m times.
  'generating-functions': ([g, m, n]) => {
    if (m > 30) return undefined
    let f = [1]
    for (let t = 0; t < m; t++) { const h = Array(f.length + g.length - 1).fill(0); f.forEach((x, i) => g.forEach((y, j) => { h[i + j] = (h[i + j] + mulB(x, y, P998)) % P998 })); f = h }
    return f[n] ?? 0
  },
  // Every pair.
  'fft-ntt': ([a, b]) => {
    if (a.length * b.length > 1e6) return undefined
    if (!a.length || !b.length) return []
    const c = Array(Math.max(...a) + Math.max(...b) + 1).fill(0)
    for (const x of a) for (const y of b) c[x + y]++
    return c
  },
  // Every submask of every mask.
  'sos': ([a]) => (a.length > 1024 ? undefined : a.map((_, m) => { let t = 0; for (let s = m; ; s = (s - 1) & m) { t += a[s]; if (s === 0) break } return t })),
  // Inclusion–exclusion over every submask.
  'mobius': ([F]) => (F.length > 1024 ? undefined : F.map((_, m) => { let t = 0; for (let s = m; ; s = (s - 1) & m) { t += (popcount(m ^ s) % 2 ? -1 : 1) * F[s]; if (s === 0) break } return t })),
  // Every split of every mask into two disjoint parts.
  'subset-convolution': ([a, b]) => (a.length > 1024 ? undefined : a.map((_, m) => { let t = 0; for (let s = m; ; s = (s - 1) & m) { t += a[s] * b[m ^ s]; if (s === 0) break } return t })),
  // Every pair of indices.
  'walsh-hadamard': ([a, b]) => { if (a.length > 1024) return undefined; const c = Array(a.length).fill(0); a.forEach((x, i) => b.forEach((y, j) => { c[i ^ j] += x * y })); return c },
  // Every walk of exactly n edges: the cheapest.
  'semirings': ([k, edges, n]) => {
    if (n > 7 || edges.length ** Math.min(n, 7) > 2e6) return undefined
    let best = Infinity
    const go = (v, left, cost) => { if (left === 0) { if (v === k - 1) best = Math.min(best, cost); return } for (const [a, b, w] of edges) if (a === v) go(b, left - 1, cost + w) }
    go(0, n, 0)
    return best === Infinity ? -1 : best
  },
  // Every tiling, placing a domino on the first empty cell each time.
  'transfer-matrix': ([w, n]) => {
    if (w * n > 24) return undefined
    const full = Array(w * n).fill(false)
    const go = () => {
      const i = full.indexOf(false)
      if (i < 0) return 1
      const r = i % w, c = Math.floor(i / w)
      let t = 0
      full[i] = true
      if (r + 1 < w && !full[i + 1]) { full[i + 1] = true; t += go(); full[i + 1] = false }
      if (c + 1 < n && !full[i + w]) { full[i + w] = true; t += go(); full[i + w] = false }
      full[i] = false
      return t
    }
    return go() % P107
  },
}

// Solve rows [x1 … xL | rhs] mod p; return a solution if the system is consistent, else null.
function solveMod(rows, L) {
  const A = rows.map(r => [...r])
  let r = 0
  const where = Array(L).fill(-1)
  for (let col = 0; col < L && r < A.length; col++) {
    const piv = A.findIndex((row, i) => i >= r && row[col] !== 0)
    if (piv < 0) continue
    ;[A[r], A[piv]] = [A[piv], A[r]]
    const inv = powB(A[r][col], P998 - 2, P998)
    A[r] = A[r].map(x => mulB(x, inv, P998))
    for (let i = 0; i < A.length; i++) if (i !== r && A[i][col]) { const f = A[i][col]; A[i] = A[i].map((x, j) => (x - mulB(f, A[r][j], P998) + P998) % P998) }
    where[col] = r++
  }
  for (let i = r; i < A.length; i++) if (A[i][L] !== 0) return null
  return where.map(w => (w < 0 ? 0 : A[w][L]))
}

export const EXPERT_ORACLES = { ...SPACE_ORACLES, ...SPLIT_ORACLES, ...ALGEBRA_ORACLES }
