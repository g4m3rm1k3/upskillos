// Test-only answer keys for the Structured lessons' "Design it yourself" numbers, written WITHOUT
// dynamic programming: every subsequence, split or schedule is enumerated. Like core-oracles.js,
// they check typed numbers independently of the method being taught. Inputs must be small.

const range = n => Array.from({ length: n }, (_, i) => i)
// Every subsequence of a, as lists of indexes, in increasing index order.
const subsequences = n => range(2 ** n).map(mask => range(n).filter(i => mask & (1 << i)))
const sum = xs => xs.reduce((s, x) => s + x, 0)
const increasing = xs => xs.every((x, k) => k === 0 || xs[k - 1] < x)
const decreasing = xs => xs.every((x, k) => k === 0 || xs[k - 1] > x)
const longest = (n, ok) => Math.max(0, ...subsequences(n).filter(ok).map(s => s.length))
// Strings: every subsequence of s as a string, with its positions.
const picks = s => subsequences(s.length).map(ix => ({ ix, str: ix.map(i => s[i]).join('') }))
const isSub = (small, big) => { let k = 0; for (const ch of big) if (ch === small[k]) k++; return k === small.length }
const isPal = s => s === [...s].reverse().join('')
// The cheapest way to turn a into b, by searching strings (Dijkstra). ops: [cost, s => next strings].
function cheapest(a, b, ops) {
  const limit = a.length + b.length + 1, best = new Map([[a, 0]]), queue = [[0, a]]
  while (queue.length) {
    queue.sort((x, y) => x[0] - y[0])
    const [d, s] = queue.shift()
    if (s === b) return d
    if (d > best.get(s)) continue
    for (const [cost, next] of ops) for (const t of next(s)) if (t.length <= limit && (!best.has(t) || d + cost < best.get(t))) { best.set(t, d + cost); queue.push([d + cost, t]) }
  }
  return Infinity
}
const letters = (a, b) => [...new Set(a + b)]
const editOps = (a, b, { ins = 1, del = 1, sub = 1, swap = null } = {}) => [
  [del, s => range(s.length).map(i => s.slice(0, i) + s.slice(i + 1))],
  [ins, s => range(s.length + 1).flatMap(i => letters(a, b).map(ch => s.slice(0, i) + ch + s.slice(i)))],
  [sub, s => range(s.length).flatMap(i => letters(a, b).filter(ch => ch !== s[i]).map(ch => s.slice(0, i) + ch + s.slice(i + 1)))],
  ...(swap === null ? [] : [[swap, s => range(s.length - 1).map(i => s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2))]]),
]
// Every global alignment of a and b, as columns [x, y] with null for a gap.
function alignments(a, b) {
  if (!a.length) return [[...b].map(y => [null, y])]
  if (!b.length) return [[...a].map(x => [x, null])]
  return [
    ...alignments(a.slice(1), b.slice(1)).map(r => [[a[0], b[0]], ...r]),
    ...alignments(a.slice(1), b).map(r => [[a[0], null], ...r]),
    ...alignments(a, b.slice(1)).map(r => [[null, b[0]], ...r]),
  ]
}
const pieces = s => range(s.length).flatMap(i => range(s.length - i).map(k => s.slice(i, i + k + 1)))
// Trading: try every action on every day (recursion over days, no memo).
function bestTrades(prices, maxTrades, cooldown, fee) {
  const go = (day, holding, trades, wait) => {
    if (day === prices.length) return 0
    const p = prices[day]
    let best = go(day + 1, holding, trades, Math.max(0, wait - 1))
    if (holding) best = Math.max(best, p - fee + go(day + 1, false, trades + 1, cooldown))
    else if (wait === 0 && trades < maxTrades) best = Math.max(best, -p + go(day + 1, true, trades, 0))
    return best
  }
  return go(0, false, 0, 0)
}
// Least-squares straight line through points [x, y]: the total squared error.
function fitError(pts) {
  const n = pts.length
  if (n < 3) return 0
  const mx = sum(pts.map(p => p[0])) / n, my = sum(pts.map(p => p[1])) / n
  const sxx = sum(pts.map(p => (p[0] - mx) ** 2)), sxy = sum(pts.map(p => (p[0] - mx) * (p[1] - my)))
  const slope = sxy / sxx
  return sum(pts.map(([x, y]) => (y - (my + slope * (x - mx))) ** 2))
}

export const STRUCTURED_ORACLES = {
  // Longest strictly increasing subsequence.
  lis: ([a]) => longest(a.length, s => increasing(s.map(i => a[i]))),
  // The number of increasing subsequences (as sets of positions) that have the longest length.
  'lis-count': ([a]) => {
    const inc = subsequences(a.length).filter(s => s.length && increasing(s.map(i => a[i])))
    const best = Math.max(0, ...inc.map(s => s.length))
    return inc.filter(s => s.length === best).length
  },
  // Largest total weight of a nonempty strictly increasing subsequence of keys.
  'weighted-lis': ([keys, weights]) => Math.max(...subsequences(keys.length).filter(s => s.length && increasing(s.map(i => keys[i]))).map(s => sum(s.map(i => weights[i])))),
  // Longest subsequence that strictly rises and then strictly falls (either part may be empty).
  bitonic: ([a]) => longest(a.length, s => {
    const v = s.map(i => a[i])
    return range(v.length + 1).some(p => increasing(v.slice(0, p + 1)) && decreasing(v.slice(p)))
  }),
  // Longest chain of envelopes [w, h], each strictly inside the next in both dimensions (any order).
  'multidimensional-chains': ([env]) => {
    const sorted = [...env].sort((x, y) => x[0] - y[0] || x[1] - y[1])
    return longest(sorted.length, s => s.every((i, k) => k === 0 || (sorted[s[k - 1]][0] < sorted[i][0] && sorted[s[k - 1]][1] < sorted[i][1])))
  },
  // Longest subsequence with one common difference between neighbours (any single value counts).
  'arithmetic-subsequence': ([a]) => longest(a.length, s => s.every((i, k) => k < 2 || a[i] - a[s[k - 1]] === a[s[1]] - a[s[0]])),
  // Longest subsequence whose differences are nonzero and alternate in sign.
  'alternating-subsequence': ([a]) => longest(a.length, s => s.every((i, k) => {
    if (k === 0) return true
    const d = a[i] - a[s[k - 1]]
    if (d === 0) return false
    return k === 1 || Math.sign(d) !== Math.sign(a[s[k - 1]] - a[s[k - 2]])
  })),
  // Largest subset of distinct positive values in which, for every pair, one divides the other.
  'divisible-subset': ([a]) => longest(a.length, s => s.every(i => s.every(j => a[i] % a[j] === 0 || a[j] % a[i] === 0))),

  // ── Strings ──
  lcs: ([a, b]) => Math.max(0, ...picks(a).filter(p => isSub(p.str, b)).map(p => p.str.length)),
  // The number of different strings that are longest common subsequences.
  'lcs-reconstruct': ([a, b]) => {
    const common = picks(a).map(p => p.str).filter(str => isSub(str, b))
    const best = Math.max(...common.map(x => x.length))
    return new Set(common.filter(x => x.length === best)).size
  },
  'common-substring': ([a, b]) => Math.max(0, ...pieces(a).filter(x => b.includes(x)).map(x => x.length)),
  'edit-distance': ([a, b]) => cheapest(a, b, editOps(a, b)),
  'weighted-edit': ([a, b, ins, del, sub]) => cheapest(a, b, editOps(a, b, { ins, del, sub })),
  // Edits plus swapping two neighbouring letters, all at cost 1.
  damerau: ([a, b]) => cheapest(a, b, editOps(a, b, { swap: 1 })),
  // The shortest string with both a and b as subsequences, trying strings in order of length.
  'shortest-supersequence': ([a, b]) => {
    const abc = letters(a, b)
    for (let len = 0; ; len++) {
      const words = range(abc.length ** len).map(n => range(len).map(k => abc[Math.floor(n / abc.length ** k) % abc.length]).join(''))
      if (words.some(w => isSub(a, w) && isSub(b, w))) return len
    }
  },
  // Sets of positions in s that spell t.
  'distinct-subsequences': ([s, t]) => picks(s).filter(p => p.str === t).length,
  // Different strings among all subsequences, the empty one included.
  'unique-subsequences': ([s]) => new Set(picks(s).map(p => p.str)).size,
  // c merges a and b, keeping the order of each: choose which positions of c belong to a.
  interleaving: ([a, b, c]) => c.length === a.length + b.length && subsequences(c.length).some(ix => ix.length === a.length && ix.map(i => c[i]).join('') === a && range(c.length).filter(i => !ix.includes(i)).map(i => c[i]).join('') === b),
  // ? is any one letter and * any run of letters (possibly none), checked by the regular-expression engine.
  wildcard: ([s, p]) => new RegExp(`^${[...p].map(ch => (ch === '?' ? '.' : ch === '*' ? '.*' : ch)).join('')}$`).test(s),
  // Letters, . for any one letter, x* for zero or more x: the regular-expression engine's own meaning.
  regex: ([s, p]) => new RegExp(`^(?:${p})$`).test(s),
  'palindrome-subsequence': ([s]) => Math.max(0, ...picks(s).filter(p => isPal(p.str)).map(p => p.str.length)),
  // Substrings, by position, that read the same both ways.
  'palindrome-substring': ([s]) => pieces(s).filter(isPal).length,
  // The fewest cuts so that every piece is a palindrome, trying every set of cut points.
  'palindrome-cuts': ([s]) => Math.min(...subsequences(Math.max(0, s.length - 1)).map(cuts => {
    const bounds = [0, ...cuts.map(c => c + 1), s.length]
    return bounds.slice(1).every((e, k) => isPal(s.slice(bounds[k], e))) ? cuts.length : Infinity
  })),
  // Nonempty subsequences, by position, that are palindromes.
  'palindrome-count': ([s]) => picks(s).filter(p => p.str.length && isPal(p.str)).length,
  // The cheapest alignment: a mismatch costs `mismatch`, a run of g gaps in one string open + extend · (g − 1).
  'affine-gap': ([a, b, mismatch, open, extend]) => Math.min(...alignments(a, b).map(cols => cols.reduce((cost, [x, y], k) => {
    if (x !== null && y !== null) return cost + (x === y ? 0 : mismatch)
    const prev = cols[k - 1], continues = prev && (x === null ? prev[0] === null : prev[1] === null)
    return cost + (continues ? extend : open)
  }, 0))),
  // The best score of aligning any piece of a with any piece of b: match +m, mismatch −x, gap −g; 0 for nothing.
  'local-alignment': ([a, b, m, x, g]) => {
    let best = 0
    for (const p of pieces(a)) for (const q of pieces(b)) for (const cols of alignments(p, q)) best = Math.max(best, cols.reduce((t, [u, v]) => t + (u === null || v === null ? -g : u === v ? m : -x), 0))
    return best
  },

  // ── Intervals: every split, order, tree or set of cuts, tried in full (no table, no memo) ──
  // Matrix i is dims[i] × dims[i + 1]. The cheapest way to multiply them all.
  'matrix-chain': ([dims]) => {
    const go = (l, r) => (l === r ? 0 : Math.min(...range(r - l).map(k => go(l, l + k) + go(l + k + 1, r) + dims[l] * dims[l + k + 1] * dims[r + 1])))
    return dims.length < 2 ? 0 : go(0, dims.length - 2)
  },
  // Burst the balloons one at a time, in every order; bursting x earns left · x · right (missing neighbours are 1).
  'burst-balloons': ([nums]) => {
    const go = list => (list.length ? Math.max(...list.map((x, i) => (list[i - 1] ?? 1) * x * (list[i + 1] ?? 1) + go([...list.slice(0, i), ...list.slice(i + 1)]))) : 0)
    return go(nums)
  },
  // Make the cuts in every order; a cut costs the length of the piece it cuts.
  'cut-stick': ([n, cuts]) => {
    const go = (lo, hi, left) => {
      const inside = left.filter(c => c > lo && c < hi)
      return inside.length ? Math.min(...inside.map(c => hi - lo + go(lo, c, inside) + go(c, hi, inside))) : 0
    }
    return go(0, n, cuts)
  },
  // Merge two neighbouring piles at a time, in every order; a merge costs the new pile's size.
  'merge-stones': ([piles]) => {
    const go = list => (list.length < 2 ? 0 : Math.min(...range(list.length - 1).map(i => list[i] + list[i + 1] + go([...list.slice(0, i), list[i] + list[i + 1], ...list.slice(i + 2)]))))
    return go(piles)
  },
  // Every triangulation of a convex polygon whose vertices have these weights; a triangle costs the product.
  'polygon-triangulation': ([w]) => {
    const go = (l, r) => (r - l < 2 ? 0 : Math.min(...range(r - l - 1).map(k => go(l, l + k + 1) + go(l + k + 1, r) + w[l] * w[l + k + 1] * w[r])))
    return go(0, w.length - 1)
  },
  // Every binary search tree on keys in order; a key's cost is its frequency times its depth (the root is 1).
  'optimal-bst': ([f]) => {
    const go = (l, r, depth) => (l > r ? 0 : Math.min(...range(r - l + 1).map(k => f[l + k] * depth + go(l, l + k - 1, depth + 1) + go(l + k + 1, r, depth + 1))))
    return go(0, f.length - 1, 1)
  },
  // Every way to parenthesize; symbols are true/false, ops are and / or / xor. How many come out true?
  'boolean-parenthesization': ([symbols, ops]) => {
    const apply = { and: (x, y) => x && y, or: (x, y) => x || y, xor: (x, y) => x !== y }
    const values = (l, r) => (l === r ? [symbols[l]] : range(r - l).flatMap(k => values(l, l + k).flatMap(x => values(l + k + 1, r).map(y => apply[ops[l + k]](x, y)))))
    return values(0, symbols.length - 1).filter(Boolean).length
  },
  // Every way to parenthesize numbers joined by + − ×: the largest value.
  'expression-extrema': ([nums, ops]) => {
    const apply = { '+': (x, y) => x + y, '-': (x, y) => x - y, '*': (x, y) => x * y }
    const values = (l, r) => (l === r ? [nums[l]] : range(r - l).flatMap(k => values(l, l + k).flatMap(x => values(l + k + 1, r).map(y => apply[ops[l + k]](x, y)))))
    return Math.max(...values(0, nums.length - 1))
  },
  // Each turn prints one letter over any stretch, covering what was there. Breadth-first over what is on the paper.
  'strange-printer': ([s]) => {
    const abc = [...new Set(s)]
    let frontier = new Set([' '.repeat(s.length)]), seen = new Set(frontier)
    for (let turns = 0; ; turns++) {
      if (frontier.has(s)) return turns
      const next = new Set()
      for (const paper of frontier) for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) for (const ch of abc) {
        const t = paper.slice(0, i) + ch.repeat(j - i + 1) + paper.slice(j + 1)
        if (!seen.has(t)) { seen.add(t); next.add(t) }
      }
      frontier = next
    }
  },
  // Remove a run of k equal neighbours for k² points, in every order: the most points.
  'remove-boxes': ([boxes]) => {
    const go = list => {
      let best = 0
      for (let i = 0; i < list.length; i++) {
        if (i > 0 && list[i - 1] === list[i]) continue
        let j = i; while (j < list.length && list[j] === list[i]) j++
        best = Math.max(best, (j - i) ** 2 + go([...list.slice(0, i), ...list.slice(j)]))
      }
      return best
    }
    return go(boxes)
  },
  // Cut a into exactly k nonempty segments, every way: the smallest sum of (segment total)².
  'k-partitions': ([a, k]) => Math.min(...subsequences(Math.max(0, a.length - 1)).filter(c => c.length === k - 1).map(cuts => {
    const b = [0, ...cuts.map(c => c + 1), a.length]
    return b.slice(1).reduce((t, e, i) => t + sum(a.slice(b[i], e)) ** 2, 0)
  })),
  // ── Scheduling and trading ──
  // Jobs [start, end, value]; a set is compatible when no two overlap (one may start when another ends).
  'weighted-intervals': ([jobs]) => Math.max(0, ...subsequences(jobs.length).filter(s => s.every(i => s.every(j => i === j || jobs[i][1] <= jobs[j][0] || jobs[j][1] <= jobs[i][0]))).map(s => sum(s.map(i => jobs[i][2])))),
  // Jobs [duration, reward, deadline], one machine from time 0: a set counts if SOME order meets every deadline.
  'deadline-scheduling': ([jobs]) => {
    const orders = ix => (ix.length <= 1 ? [ix] : ix.flatMap((x, k) => orders([...ix.slice(0, k), ...ix.slice(k + 1)]).map(o => [x, ...o])))
    const fits = order => { let t = 0; return order.every(i => (t += jobs[i][0]) <= jobs[i][2]) }
    return Math.max(0, ...subsequences(jobs.length).filter(s => orders(s).some(fits)).map(s => sum(s.map(i => jobs[i][1]))))
  },
  // Every sequence of buy / sell / wait, holding at most one share. maxTrades limits completed sales;
  // cooldown is the number of days after a sale before buying again; fee is paid on each sale.
  'stock-states': ([prices]) => bestTrades(prices, Infinity, 0, 0),
  'stock-k': ([prices, k]) => bestTrades(prices, k, 0, 0),
  'stock-cooldown': ([prices, cooldown, fee]) => bestTrades(prices, Infinity, cooldown, fee),
  // Jobs in a fixed order, cut into consecutive batches; a batch costs setup + (its total length)².
  'batch-scheduling': ([lengths, setup]) => Math.min(...subsequences(Math.max(0, lengths.length - 1)).map(cuts => {
    const b = [0, ...cuts.map(c => c + 1), lengths.length]
    return b.slice(1).reduce((t, e, i) => t + setup + sum(lengths.slice(b[i], e)) ** 2, 0)
  })),
  // Words (by length) in order, one space between words on a line, at most `width` per line. Every line
  // but the last pays (unused space)²; the last line is free.
  'text-justification': ([words, width]) => Math.min(...subsequences(Math.max(0, words.length - 1)).map(cuts => {
    const b = [0, ...cuts.map(c => c + 1), words.length]
    const lines = b.slice(1).map((e, i) => sum(words.slice(b[i], e)) + (e - b[i] - 1))
    return lines.every(len => len <= width) ? lines.slice(0, -1).reduce((t, len) => t + (width - len) ** 2, 0) : Infinity
  })),
  // Points (x = 0, 1, 2, … with the given y), cut into consecutive segments each fitted by least squares;
  // cost = total squared error + penalty per segment.
  'segmented-regression': ([ys, penalty]) => Math.min(...subsequences(Math.max(0, ys.length - 1)).map(cuts => {
    const b = [0, ...cuts.map(c => c + 1), ys.length]
    return Math.round(b.slice(1).reduce((t, e, i) => t + penalty + fitError(ys.slice(b[i], e).map((y, k) => [b[i] + k, y])), 0) * 1e9) / 1e9
  })),
  // Cut a into exactly k nonempty segments, every way: the smallest possible largest segment total.
  'partition-max': ([a, k]) => Math.min(...subsequences(Math.max(0, a.length - 1)).filter(c => c.length === k - 1).map(cuts => {
    const b = [0, ...cuts.map(c => c + 1), a.length]
    return Math.max(...b.slice(1).map((e, i) => sum(a.slice(b[i], e))))
  })),
}
