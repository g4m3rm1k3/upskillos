// Live DP tables for the walkthrough stage. Each trace runs the lesson's recurrence on a small input,
// reading its own table as it fills it (so the values shown are the values a program would compute),
// and records every step: the cell written, the cells it read, and the arithmetic. TableTrace.jsx
// replays them; tables.test.js checks each final answer against the lesson's reference solution, on
// the default input and on random inputs.
//
// Every trace takes its input as one object ({ values: [...] }, { s: '...' }, …) with the lesson's
// example as the default. INPUTS says which fields the learner may change and their limits.

const INF = Infinity
// Whole numbers as they are; real numbers (least-squares errors) to two decimals.
export const show = v => (v === null || v === undefined ? '' : v === true ? 'T' : v === false ? 'F' : v === INF ? '∞' : v === -INF ? '−∞' : typeof v === 'number' && !Number.isInteger(v) ? String(Math.round(v * 100) / 100) : String(v))

// A table being filled. name(r, c) is how a cell is written in the arithmetic, e.g. "F(7)".
function table(rowLabels, colLabels, name) {
  const t = { rowLabels, colLabels, cells: rowLabels.map(() => colLabels.map(() => null)), base: [], steps: [], name }
  t.get = (r, c) => t.cells[r][c]
  t.seed = (r, c, value, why) => { t.cells[r][c] = value; t.base.push({ at: [r, c], value, why }) }
  // rule: the arithmetic with the read values put in, without the result ("F(6) + F(5) = 8 + 5").
  t.set = (r, c, value, reads, rule) => { t.cells[r][c] = value; t.steps.push({ at: [r, c], value, reads, rule }) }
  return t
}
const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i)
const minOf = xs => Math.min(...xs), maxOf = xs => Math.max(...xs)
const list = a => `[${a.join(', ')}]`
const set = a => `{${a.join(', ')}}`
const rowsOf = g => g.map(list).join(', ')

// One row indexed 0..n: D(i) from earlier D values.
function line(n, name, base, rule) {
  const t = table([''], range(0, n), (r, c) => `${name}(${c})`)
  base(t)
  for (let i = 0; i <= n; i++) if (t.get(0, i) === null) { const [v, reads, text] = rule(t, i); t.set(0, i, v, reads.map(j => [0, j]), text) }
  return t
}

// The first cell holding the largest value: the answer when it is a maximum over all states.
function bestCell(t) {
  let at = null
  t.cells.forEach((row, r) => row.forEach((v, c) => { if (v !== null && (at === null || v > t.get(...at))) at = [r, c] }))
  return at
}

// The first cell holding the largest value in row r.
function bestInRow(t, r) {
  let c = 0
  t.cells[r].forEach((v, k) => { if (v > t.get(r, c)) c = k })
  return [r, c]
}

// "A + B = 3 + 5", or `none` when nothing is added.
const sumRule = (names, values, none) => (names.length ? `${names.join(' + ')} = ${values.join(' + ')}` : none)

// Two strings: rows are prefixes of a ("∅", then one row per letter), columns prefixes of b.
const pairs = (a, b, name) => table(['∅', ...a.split('').map((ch, i) => `${i + 1} ${ch}`)], ['∅', ...b.split('').map((ch, j) => `${j + 1} ${ch}`)], (r, c) => `${name}(${r},${c})`)
function seedEdges(t, a, b, row, col, why) {
  for (let i = 0; i <= a.length; i++) t.seed(i, 0, row(i), why)
  for (let j = 1; j <= b.length; j++) t.seed(0, j, col(j), why)
}
const eachPair = (a, b, visit) => { for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) visit(i, j) }
// An interval table: cell (l, r) is the piece from l to r, written name(l,r).
const intervals = (labels, name) => table(labels, labels, (l, r) => `${name}(${l},${r})`)
// Every piece l … r with r − l from `gap` up to n − 1, shortest first: the order interval DP fills in.
function byLength(n, gap, visit) { for (let len = gap; len < n; len++) for (let l = 0; l + len < n; l++) visit(l, l + len) }

export const TRACES = {
  fibonacci: ({ n = 8 } = {}) => {
    const t = line(n, 'F', t => { t.seed(0, 0, 0, 'F(0) = 0'); t.seed(0, 1, 1, 'F(1) = 1') }, (t, i) => [t.get(0, i - 1) + t.get(0, i - 2), [i - 1, i - 2], `F(${i - 1}) + F(${i - 2}) = ${t.get(0, i - 1)} + ${t.get(0, i - 2)}`])
    return { title: `F(0) to F(${n})`, setup: 'Each value reads the two before it. Only the last two are ever needed again.', table: t, answer: [0, n], args: [n] }
  },
  stairs: ({ n = 6, steps = [1, 3] } = {}) => {
    const t = line(n, 'W', t => t.seed(0, 0, 1, 'W(0) = 1: standing still is one way'), (t, h) => {
      const from = steps.filter(s => s <= h).map(s => h - s)
      return [from.reduce((a, j) => a + t.get(0, j), 0), from, sumRule(from.map(j => `W(${j})`), from.map(j => t.get(0, j)), 'no step fits: 0')]
    })
    return { title: `Stairs with steps ${set(steps)}, heights 0 to ${n}`, setup: 'W(h) adds W(h − s) for each step size s ≤ h: one term for each possible final step.', table: t, answer: [0, n], args: [n, steps] }
  },
  'min-cost-stairs': ({ costs = [4, 1, 7, 2, 5] } = {}) => {
    const t = table([''], ['start', ...costs.map((c, i) => `${i} (${c})`)], (r, c) => (c === 0 ? 'D(start)' : `D(${c - 1})`))
    t.seed(0, 0, 0, 'D(start) = 0: nothing paid yet')
    for (let i = 0; i < costs.length; i++) {
      const from = [i - 1, i - 2].filter(j => j >= -1).map(j => j + 1)
      const low = minOf(from.map(c => t.get(0, c)))
      t.set(0, i + 1, costs[i] + low, from.map(c => [0, c]), `${costs[i]} + min(${from.map(c => t.name(0, c)).join(', ')}) = ${costs[i]} + ${low}`)
    }
    return { title: `Costs ${list(costs)}`, setup: 'D(i) = cost of landing on i + the cheaper of the two positions a move can come from.', table: t, answer: [0, costs.length], args: [costs] }
  },
  'house-robber': ({ values: a = [3, 2, 6, 4, 5] } = {}) => {
    const t = line(a.length, 'B', t => t.seed(0, 0, 0, 'B(0) = 0: no houses, nothing taken'), (t, i) => {
      const skip = t.get(0, i - 1), take = a[i - 1] + (i >= 2 ? t.get(0, i - 2) : 0)
      return [Math.max(skip, take), i >= 2 ? [i - 1, i - 2] : [i - 1], `max(skip: B(${i - 1}), take: ${a[i - 1]} + ${i >= 2 ? `B(${i - 2})` : '0'}) = max(${skip}, ${take})`]
    })
    return { title: `Houses ${list(a)}`, setup: 'B(i) is the best from the first i houses: skip house i, or take it and add the best that stops two houses back.', table: t, answer: [0, a.length], args: [a] }
  },
  'max-subarray': ({ values: a = [2, -5, 4, 3, -1] } = {}) => {
    const t = table(['E(i)', 'best so far'], a.map((v, i) => `${i} (${v})`), (r, c) => (r ? `best(${c})` : `E(${c})`))
    t.seed(0, 0, a[0], `E(0) = ${a[0]}: the only run ending at 0`); t.seed(1, 0, a[0], `best(0) = ${a[0]}`)
    for (let i = 1; i < a.length; i++) {
      const e = Math.max(a[i], t.get(0, i - 1) + a[i])
      t.set(0, i, e, [[0, i - 1]], `max(start here: ${a[i]}, extend: E(${i - 1}) + ${a[i]} = ${t.get(0, i - 1) + a[i]})`)
      t.set(1, i, Math.max(t.get(1, i - 1), e), [[1, i - 1], [0, i]], `max(best(${i - 1}), E(${i})) = max(${t.get(1, i - 1)}, ${e})`)
    }
    return { title: `Values ${list(a)}`, setup: 'E(i): the best sum of a run that ends exactly at i. The answer is the best E seen.', table: t, answer: [1, a.length - 1], args: [a], check: v => v[0] }
  },
  'max-product': ({ values: a = [2, -3, -2, 4, 0, -1] } = {}) => {
    const t = table(['largest', 'smallest'], a.map((v, i) => `${i} (${v})`), (r, c) => `${r ? 'lo' : 'hi'}(${c})`)
    t.seed(0, 0, a[0], `hi(0) = ${a[0]}`); t.seed(1, 0, a[0], `lo(0) = ${a[0]}`)
    for (let i = 1; i < a.length; i++) {
      const hi = t.get(0, i - 1), lo = t.get(1, i - 1), opts = [a[i], hi * a[i], lo * a[i]]
      t.set(0, i, maxOf(opts), [[0, i - 1], [1, i - 1]], `max(${a[i]}, hi·${a[i]} = ${hi * a[i]}, lo·${a[i]} = ${lo * a[i]})`)
      t.set(1, i, minOf(opts), [[0, i - 1], [1, i - 1]], `min(${a[i]}, ${hi * a[i]}, ${lo * a[i]})`)
    }
    // The answer is the largest "hi" anywhere, not necessarily the last one.
    let at = [0, 0]
    for (let i = 1; i < a.length; i++) if (t.get(0, i) > t.get(...at)) at = [0, i]
    return { title: `Values ${list(a)}`, setup: 'Keep the largest and the smallest product of a run ending here: a negative number swaps them.', table: t, answer: at, args: [a] }
  },
  'decode-ways': ({ s = '11206' } = {}) => {
    const t = table([''], ['∅', ...s.split('').map((d, i) => `${i + 1} (${d})`)], (r, c) => `D(${c})`)
    t.seed(0, 0, 1, 'D(0) = 1: the empty string has one reading')
    for (let i = 1; i <= s.length; i++) {
      const parts = [], reads = [], nums = []
      if (s[i - 1] !== '0') { parts.push(`D(${i - 1})`); reads.push([0, i - 1]); nums.push(t.get(0, i - 1)) }
      const pair = i >= 2 ? Number(s.slice(i - 2, i)) : 0
      const pairOK = i >= 2 && s[i - 2] !== '0' && pair >= 10 && pair <= 26
      if (pairOK) { parts.push(`D(${i - 2})`); reads.push([0, i - 2]); nums.push(t.get(0, i - 2)) }
      t.set(0, i, nums.reduce((x, y) => x + y, 0), reads, parts.length ? `${parts.join(' + ')} = ${nums.join(' + ')}${i >= 2 ? ` (“${s[i - 1]}” ${s[i - 1] === '0' ? 'alone is no letter' : 'is a letter'}; “${s.slice(i - 2, i)}” ${pairOK ? 'is a letter' : 'is not'})` : ''}` : `“${s[i - 1]}” alone is no letter, and no pair ends here`)
    }
    return { title: `Digits “${s}”`, setup: 'D(i) counts readings of the first i digits: the last letter used one digit or two.', table: t, answer: [0, s.length], args: [s] }
  },
  'word-break': ({ s = 'catsand', words = ['cat', 'cats', 'and', 'sand'] } = {}) => {
    const t = table([''], ['∅', ...s.split('').map((ch, i) => `${i + 1} (${ch})`)], (r, c) => `B(${c})`)
    t.seed(0, 0, true, 'B(0) = T: the empty prefix needs no words')
    for (let i = 1; i <= s.length; i++) {
      const fits = words.filter(w => w.length <= i && s.slice(i - w.length, i) === w)
      const ok = fits.filter(w => t.get(0, i - w.length))
      t.set(0, i, ok.length > 0, fits.map(w => [0, i - w.length]), fits.length ? fits.map(w => `B(${i - w.length}) and “${w}”`).join(' or ') : 'no word ends here')
    }
    return { title: `“${s}” with ${set(words)}`, setup: 'B(i): the first i letters can be cut into words. Look back by the length of every word that ends at i.', table: t, answer: [0, s.length], args: [s, words] }
  },
  'word-break-count': ({ s = 'aaaa', words = ['a', 'aa'] } = {}) => {
    const t = line(s.length, 'C', t => t.seed(0, 0, 1, 'C(0) = 1'), (t, i) => {
      const from = words.filter(w => w.length <= i && s.slice(i - w.length, i) === w).map(w => i - w.length)
      return [from.reduce((x, j) => x + t.get(0, j), 0), from, sumRule(from.map(j => `C(${j})`), from.map(j => t.get(0, j)), 'no word ends here: 0')]
    })
    return { title: `“${s}” with ${set(words)}`, setup: 'C(i) adds C(i − len(w)) for every word w that ends at i: one term per possible last word.', table: t, answer: [0, s.length], args: [s, words] }
  },
  'grid-paths': ({ rows: R = 3, cols: C = 4 } = {}) => {
    const t = table(range(0, R - 1).map(r => `row ${r}`), range(0, C - 1).map(c => `col ${c}`), (r, c) => `P(${r},${c})`)
    t.seed(0, 0, 1, 'P(0,0) = 1: the empty path')
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (!r && !c) continue
      const reads = [...(r ? [[r - 1, c]] : []), ...(c ? [[r, c - 1]] : [])]
      t.set(r, c, reads.reduce((s, [a, b]) => s + t.get(a, b), 0), reads, reads.map(([a, b]) => `P(${a},${b})`).join(' + ') + ' = ' + reads.map(([a, b]) => t.get(a, b)).join(' + '))
    }
    return { title: `A ${R} × ${C} grid, right and down moves`, setup: 'Every path into a cell arrives from above or from the left, never both: add the two.', table: t, answer: [R - 1, C - 1], args: [R, C] }
  },
  'obstacle-paths': ({ grid: g = [[0, 0, 0], [0, 1, 0], [0, 0, 0]] } = {}) => {
    const R = g.length, C = g[0].length
    const t = table(g.map((_, r) => `row ${r}`), g[0].map((_, c) => `col ${c}`), (r, c) => `P(${r},${c})`)
    g.forEach((row, r) => row.forEach((x, c) => { if (x) t.seed(r, c, 0, `P(${r},${c}) = 0: blocked`) }))
    if (!g[0][0]) t.seed(0, 0, 1, 'P(0,0) = 1: the empty path')
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (t.get(r, c) !== null) continue
      const reads = [...(r ? [[r - 1, c]] : []), ...(c ? [[r, c - 1]] : [])]
      t.set(r, c, reads.reduce((s, [a, b]) => s + t.get(a, b), 0), reads, reads.map(([a, b]) => `P(${a},${b})`).join(' + ') + ' = ' + reads.map(([a, b]) => t.get(a, b)).join(' + '))
    }
    const blocked = g.flat().filter(Boolean).length
    return { title: `A ${R} × ${C} grid, ${blocked} cell${blocked === 1 ? '' : 's'} blocked`, setup: 'The same sum as the open grid, except a blocked cell is 0, so nothing flows through it.', table: t, answer: [R - 1, C - 1], args: [g] }
  },
  'min-grid-path': ({ grid: g = [[1, 3, 1], [1, 5, 1], [4, 2, 1]] } = {}) => {
    const R = g.length, C = g[0].length
    const t = table(g.map((_, r) => `row ${r}`), g[0].map((_, c) => `col ${c}`), (r, c) => `D(${r},${c})`)
    t.seed(0, 0, g[0][0], `D(0,0) = ${g[0][0]}: the start is paid`)
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (!r && !c) continue
      const reads = [...(r ? [[r - 1, c]] : []), ...(c ? [[r, c - 1]] : [])], low = minOf(reads.map(([a, b]) => t.get(a, b)))
      t.set(r, c, g[r][c] + low, reads, `${g[r][c]} + ${reads.length > 1 ? `min(${reads.map(([a, b]) => `D(${a},${b})`).join(', ')})` : `D(${reads[0].join(',')})`} = ${g[r][c]} + ${low}`)
    }
    return { title: `Costs ${rowsOf(g)}`, setup: 'D(r, c): the cheapest cost of reaching this cell, its own cost included.', table: t, answer: [R - 1, C - 1], args: [g], check: v => v[0] }
  },
  'triangle-path': ({ triangle: tri = [[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]] } = {}) => {
    const B = tri.length - 1
    const t = table(tri.map((_, r) => `row ${r}`), tri.at(-1).map((_, c) => `${c}`), (r, c) => `M(${r},${c})`)
    tri.at(-1).forEach((v, c) => t.seed(B, c, v, `bottom row: M(${B},${c}) = ${v}`))
    for (let r = B - 1; r >= 0; r--) for (let c = 0; c <= r; c++) {
      const low = Math.min(t.get(r + 1, c), t.get(r + 1, c + 1))
      t.set(r, c, tri[r][c] + low, [[r + 1, c], [r + 1, c + 1]], `${tri[r][c]} + min(M(${r + 1},${c}), M(${r + 1},${c + 1})) = ${tri[r][c]} + ${low}`)
    }
    return { title: `Triangle ${rowsOf(tri)}`, setup: 'Work upwards: M(r, c) is the cheapest path from this number to the bottom.', table: t, answer: [0, 0], args: [tri] }
  },
  'max-square': ({ grid: g = [[1, 0, 1, 1], [1, 1, 1, 1], [0, 1, 1, 1], [1, 1, 1, 0]] } = {}) => {
    const R = g.length, C = g[0].length
    const t = table(g.map((_, r) => `row ${r}`), g[0].map((_, c) => `col ${c}`), (r, c) => `S(${r},${c})`)
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (g[r][c] === 0) { t.set(r, c, 0, [], 'a 0 cell: no square ends here'); continue }
      if (!r || !c) { t.set(r, c, 1, [], 'a 1 on the edge: a square of side 1'); continue }
      const n = [[r - 1, c], [r, c - 1], [r - 1, c - 1]], low = minOf(n.map(([a, b]) => t.get(a, b)))
      t.set(r, c, 1 + low, n, `1 + min(above ${t.get(r - 1, c)}, left ${t.get(r, c - 1)}, diagonal ${t.get(r - 1, c - 1)}) = 1 + ${low}`)
    }
    return { title: `Grid ${rowsOf(g)}`, setup: 'S(r, c): the side of the biggest all-1 square whose bottom-right corner is here. The weakest neighbour limits it. The answer is the largest S anywhere.', table: t, answer: bestCell(t), args: [g] }
  },
  'zero-one-knapsack': ({ weights: w = [2, 3, 4], values: v = [3, 5, 6], capacity: cap = 6 } = {}) => {
    const t = table(['no items', ...w.map((x, i) => `item ${i + 1} (w${x}, v${v[i]})`)], range(0, cap).map(c => `cap ${c}`), (r, c) => `D(${r},${c})`)
    range(0, cap).forEach(c => t.seed(0, c, 0, `D(0,${c}) = 0: no items, no value`))
    for (let i = 1; i <= w.length; i++) for (let c = 0; c <= cap; c++) {
      const skip = t.get(i - 1, c)
      if (w[i - 1] > c) { t.set(i, c, skip, [[i - 1, c]], `item ${i} doesn’t fit: D(${i - 1},${c}) = ${skip}`); continue }
      const take = v[i - 1] + t.get(i - 1, c - w[i - 1])
      t.set(i, c, Math.max(skip, take), [[i - 1, c], [i - 1, c - w[i - 1]]], `max(skip: D(${i - 1},${c}) = ${skip}, take: ${v[i - 1]} + D(${i - 1},${c - w[i - 1]}) = ${take})`)
    }
    return { title: `Items ${w.map((x, i) => `(w${x}, v${v[i]})`).join(', ')}; capacity ${cap}`, setup: 'D(i, c): the best value from the first i items within capacity c. Each row reads only the row above.', table: t, answer: [w.length, cap], args: [w, v, cap] }
  },
  'unbounded-knapsack': ({ weights: w = [2, 3], values: v = [3, 5], capacity: cap = 7 } = {}) => {
    const t = line(cap, 'D', t => t.seed(0, 0, 0, 'D(0) = 0'), (t, c) => {
      const opts = w.map((x, i) => (x <= c ? [v[i] + t.get(0, c - x), c - x, `${v[i]} + D(${c - x})`] : null)).filter(Boolean)
      const all = [[t.get(0, c - 1), c - 1, `D(${c - 1}) (leave 1 unused)`], ...opts]
      return [maxOf(all.map(o => o[0])), all.map(o => o[1]), `max(${all.map(o => `${o[2]} = ${o[0]}`).join(', ')})`]
    })
    return { title: `Items ${w.map((x, i) => `(w${x}, v${v[i]})`).join(' and ')}, any number of each; capacity ${cap}`, setup: 'D(c): the best value within capacity c. The last item packed can be any that fits, again and again.', table: t, answer: [0, cap], args: [w, v, cap] }
  },
  'subset-sum': ({ values: a = [3, 5, 2], target = 8 } = {}) => {
    const t = table(['no values', ...a.map(x => `+ ${x}`)], range(0, target).map(s => `${s}`), (r, c) => `R(${r},${c})`)
    range(0, target).forEach(s => t.seed(0, s, s === 0, s === 0 ? 'R(0,0) = T: the empty choice' : `R(0,${s}) = F`))
    for (let i = 1; i <= a.length; i++) for (let s = 0; s <= target; s++) {
      const reads = [[i - 1, s], ...(s >= a[i - 1] ? [[i - 1, s - a[i - 1]]] : [])]
      t.set(i, s, reads.some(([r, c]) => t.get(r, c)), reads, `R(${i - 1},${s})${s >= a[i - 1] ? ` or R(${i - 1},${s - a[i - 1]}) (use ${a[i - 1]})` : ''}`)
    }
    return { title: `Values ${list(a)}, totals 0 to ${target}`, setup: 'R(i, s): some of the first i values add up to s. The last value is used or not.', table: t, answer: [a.length, target], args: [a, target] }
  },
  'coin-min': ({ coins = [1, 3, 4], amount = 6 } = {}) => {
    const t = line(amount, 'D', t => t.seed(0, 0, 0, 'D(0) = 0'), (t, a) => {
      const from = coins.filter(c => c <= a).map(c => a - c)
      return [1 + minOf(from.map(j => t.get(0, j))), from, from.length ? `1 + min(${from.map(j => `D(${j}) = ${show(t.get(0, j))}`).join(', ')})` : 'no coin fits: ∞ (impossible)']
    })
    return { title: `Coins ${set(coins)}, amounts 0 to ${amount}`, setup: 'D(a): the fewest coins for a. The last coin is any coin up to a. ∞ marks an amount no coins can make.', table: t, answer: [0, amount], args: [coins, amount], check: v => (v === -1 ? INF : v) }
  },
  'coin-combinations': ({ coins = [1, 2, 5], amount = 6 } = {}) => {
    const t = table(['no coins', ...coins.map(c => `up to ${c}`)], range(0, amount).map(a => `${a}`), (r, c) => `W(${r},${c})`)
    range(0, amount).forEach(a => t.seed(0, a, a === 0 ? 1 : 0, a === 0 ? 'W(0,0) = 1: no coins for 0' : `W(0,${a}) = 0`))
    for (let k = 1; k <= coins.length; k++) for (let a = 0; a <= amount; a++) {
      const c = coins[k - 1], reads = [[k - 1, a], ...(a >= c ? [[k, a - c]] : [])]
      t.set(k, a, reads.reduce((s, [r, x]) => s + t.get(r, x), 0), reads, `W(${k - 1},${a}) (no ${c}s)${a >= c ? ` + W(${k},${a - c}) (one more ${c})` : ''} = ${reads.map(([r, x]) => t.get(r, x)).join(' + ')}`)
    }
    return { title: `Coins ${set(coins)}, amounts 0 to ${amount}`, setup: 'W(k, a): collections for a using only the first k coin values. Use no coin of value k at all, or at least one more.', table: t, answer: [coins.length, amount], args: [coins, amount] }
  },
  'coin-permutations': ({ coins = [1, 2], amount = 5 } = {}) => {
    const t = line(amount, 'C', t => t.seed(0, 0, 1, 'C(0) = 1: the empty sequence'), (t, a) => {
      const from = coins.filter(c => c <= a).map(c => a - c)
      return [from.reduce((s, j) => s + t.get(0, j), 0), from, sumRule(from.map(j => `C(${j})`), from.map(j => t.get(0, j)), 'no coin fits: 0')]
    })
    return { title: `Coins ${set(coins)}, ordered sequences, amounts 0 to ${amount}`, setup: 'C(a) adds C(a − c) for each coin c: one term for each possible last coin.', table: t, answer: [0, amount], args: [coins, amount] }
  },
  'rod-cutting': ({ prices = [1, 5, 8, 9], n = 6 } = {}) => {
    const t = line(n, 'R', t => t.seed(0, 0, 0, 'R(0) = 0'), (t, len) => {
      const ks = range(1, Math.min(len, prices.length))
      return [maxOf(ks.map(k => prices[k - 1] + t.get(0, len - k))), ks.map(k => len - k), `max(${ks.map(k => `${prices[k - 1]} + R(${len - k}) = ${prices[k - 1] + t.get(0, len - k)}`).join(', ')})`]
    })
    return { title: `Prices ${prices.join(', ')} for lengths 1–${prices.length}; rods up to ${n}`, setup: 'R(n): the best revenue for length n. Try every first piece k; the rest is a smaller rod.', table: t, answer: [0, n], args: [prices, n] }
  },
  binomial: ({ n: N = 6, k: K = 3 } = {}) => {
    const t = table(range(0, N).map(n => `n = ${n}`), range(0, N).map(k => `k = ${k}`), (r, c) => `C(${r},${c})`)
    for (let n = 0; n <= N; n++) for (let k = 0; k <= n; k++) {
      if (k === 0 || k === n) { t.set(n, k, 1, [], k === 0 ? 'choose nothing: 1 way' : 'choose everything: 1 way'); continue }
      t.set(n, k, t.get(n - 1, k - 1) + t.get(n - 1, k), [[n - 1, k - 1], [n - 1, k]], `C(${n - 1},${k - 1}) + C(${n - 1},${k}) = ${t.get(n - 1, k - 1)} + ${t.get(n - 1, k)}`)
    }
    return { title: `Pascal’s triangle to n = ${N}`, setup: 'C(n, k): item n is chosen (k − 1 more from n − 1) or not (k from n − 1).', table: t, answer: [N, K], args: [N, K] }
  },
  'integer-partitions': ({ n = 6 } = {}) => {
    const t = table(['no parts', ...range(1, n).map(p => `parts ≤ ${p}`)], range(0, n).map(a => `${a}`), (r, c) => `P(${r},${c})`)
    range(0, n).forEach(a => t.seed(0, a, a === 0 ? 1 : 0, a === 0 ? 'P(0,0) = 1: the empty sum' : `P(0,${a}) = 0`))
    for (let p = 1; p <= n; p++) for (let a = 0; a <= n; a++) {
      const reads = [[p - 1, a], ...(a >= p ? [[p, a - p]] : [])]
      t.set(p, a, reads.reduce((s, [r, x]) => s + t.get(r, x), 0), reads, `P(${p - 1},${a})${a >= p ? ` + P(${p},${a - p})` : ''} = ${reads.map(([r, x]) => t.get(r, x)).join(' + ')}`)
    }
    return { title: `Partitions of 0 to ${n}`, setup: 'P(p, a): partitions of a into parts no bigger than p. Use no part equal to p, or one more of them.', table: t, answer: [n, n], args: [n] }
  },
  catalan: ({ n = 6 } = {}) => {
    const t = line(n, 'C', t => t.seed(0, 0, 1, 'C(0) = 1: the empty string'), (t, m) => {
      const ks = range(0, m - 1)
      return [ks.reduce((s, k) => s + t.get(0, k) * t.get(0, m - 1 - k), 0), ks, ks.map(k => `C(${k})·C(${m - 1 - k})`).join(' + ') + ' = ' + ks.map(k => `${t.get(0, k)}·${t.get(0, m - 1 - k)}`).join(' + ')]
    })
    return { title: `Balanced bracket strings for 0 to ${n} pairs`, setup: 'C(m): the first “(” closes around k pairs, and m − 1 − k pairs follow. Multiply, then add over k.', table: t, answer: [0, n], args: [n] }
  },
  'balanced-parentheses': ({ s = '(???)?' } = {}) => {
    const L = s.length
    const t = table(range(0, L).map(d => `depth ${d}`), ['∅', ...s.split('').map((ch, i) => `${i + 1} ${ch}`)], (r, c) => `D(${c},${r})`)
    range(0, L).forEach(d => t.seed(d, 0, d === 0 ? 1 : 0, d === 0 ? 'one empty prefix, at depth 0' : `D(0,${d}) = 0`))
    for (let i = 1; i <= L; i++) for (let d = 0; d <= L; d++) {
      const ch = s[i - 1], reads = []
      if (ch !== ')' && d >= 1) reads.push([d - 1, i - 1])
      if (ch !== '(' && d + 1 <= L) reads.push([d + 1, i - 1])
      t.set(d, i, reads.reduce((x, [r, c]) => x + t.get(r, c), 0), reads, reads.length ? reads.map(([r, c]) => `D(${c},${r})`).join(' + ') + ' = ' + reads.map(([r, c]) => t.get(r, c)).join(' + ') : 'no way to arrive here')
    }
    return { title: `Pattern “${s}”`, setup: 'D(i, depth): ways for the first i characters to end at that depth without going below 0. “(” goes up, “)” down, “?” either.', table: t, answer: [0, L], args: [s] }
  },
  derangements: ({ n = 7 } = {}) => {
    const t = line(n, 'D', t => { t.seed(0, 0, 1, 'D(0) = 1'); t.seed(0, 1, 0, 'D(1) = 0: one letter must be in its own envelope') }, (t, m) => [(m - 1) * (t.get(0, m - 1) + t.get(0, m - 2)), [m - 1, m - 2], `${m - 1} × (D(${m - 1}) + D(${m - 2})) = ${m - 1} × (${t.get(0, m - 1)} + ${t.get(0, m - 2)})`])
    return { title: `Derangements of 0 to ${n} letters`, setup: 'Letter 1 goes to one of n − 1 envelopes j; letter j either swaps back (n − 2 left) or doesn’t (n − 1 left).', table: t, answer: [0, n], args: [n] }
  },
  stirling: ({ n: N = 6, k: K = 3 } = {}) => {
    const t = table(range(0, N).map(n => `n = ${n}`), range(0, N).map(k => `k = ${k}`), (r, c) => `S(${r},${c})`)
    t.seed(0, 0, 1, 'S(0,0) = 1')
    range(1, N).forEach(k => t.seed(0, k, 0, `S(0,${k}) = 0`))
    for (let n = 1; n <= N; n++) for (let k = 0; k <= N; k++) {
      if (k === 0) { t.set(n, 0, 0, [], 'items left over and no groups: 0'); continue }
      t.set(n, k, t.get(n - 1, k - 1) + k * t.get(n - 1, k), [[n - 1, k - 1], [n - 1, k]], `S(${n - 1},${k - 1}) + ${k}·S(${n - 1},${k}) = ${t.get(n - 1, k - 1)} + ${k}·${t.get(n - 1, k)}`)
    }
    return { title: `S(n, k) up to n = ${N}`, setup: 'Item n starts a group of its own, or joins one of the k groups of the others.', table: t, answer: [N, K], args: [N, K] }
  },
  'inversion-counting': ({ n: N = 4, k: K = 3 } = {}) => {
    const M = (N * (N - 1)) / 2
    const t = table(range(0, N).map(n => `n = ${n}`), range(0, M).map(k => `k = ${k}`), (r, c) => `D(${r},${c})`)
    range(0, M).forEach(k => t.seed(0, k, k === 0 ? 1 : 0, k === 0 ? 'D(0,0) = 1: the empty permutation' : `D(0,${k}) = 0`))
    for (let n = 1; n <= N; n++) for (let k = 0; k <= M; k++) {
      const ts = range(0, n - 1).filter(x => x <= k)
      t.set(n, k, ts.reduce((s, x) => s + t.get(n - 1, k - x), 0), ts.map(x => [n - 1, k - x]), `${ts.map(x => `D(${n - 1},${k - x})`).join(' + ')} = ${ts.map(x => t.get(n - 1, k - x)).join(' + ')} (inserting ${n} adds 0 to ${n - 1})`)
    }
    return { title: `Permutations of 1..n by inversions, n ≤ ${N}`, setup: 'Insert the largest value n into one of n gaps: the gap decides how many inversions it adds (0 to n − 1).', table: t, answer: [N, K], args: [N, K] }
  },
  // A ring: one street without the last house, one without the first, then the better of the two.
  'circular-selection': ({ values: a = [4, 1, 2, 7] } = {}) => {
    const n = a.length
    const t = table(['skip the last house', 'skip the first house', 'answer'], a.map((v, i) => `${i} (${v})`), (r, c) => (r === 2 ? 'best' : `${r ? 'S' : 'L'}(${c})`))
    const street = (r, from, to) => {
      for (let i = from; i <= to; i++) {
        const prev = i - 1 >= from ? t.get(r, i - 1) : 0, prev2 = i - 2 >= from ? t.get(r, i - 2) : 0
        const reads = [i - 1, i - 2].filter(j => j >= from).map(j => [r, j])
        t.set(r, i, Math.max(prev, a[i] + prev2), reads, `max(skip: ${prev}, take: ${a[i]} + ${prev2})`)
      }
    }
    const title = `Houses ${list(a)} in a ring`, setup = 'The first and last houses are neighbours, so solve two streets: one leaving out the last house, one leaving out the first. The better of the two is the answer.'
    if (n === 1) { t.set(2, 0, a[0], [], 'one house has no neighbour: take it'); return { title, setup, table: t, answer: [2, 0], args: [a] } }
    street(0, 0, n - 2); street(1, 1, n - 1)
    t.set(2, n - 1, Math.max(t.get(0, n - 2), t.get(1, n - 1)), [[0, n - 2], [1, n - 1]], `max(L(${n - 2}), S(${n - 1})) = max(${t.get(0, n - 2)}, ${t.get(1, n - 1)})`)
    return { title, setup, table: t, answer: [2, n - 1], args: [a] }
  },
  // Days by activities; a day's cell reads yesterday's other activities. The last column picks the best ending.
  'activity-selection': ({ rewards: g = [[4, 5], [1, 9], [2, 3]] } = {}) => {
    const D = g.length, K = g[0].length
    const t = table(g.map((_, d) => `day ${d + 1}`), [...g[0].map((_, a) => `activity ${a + 1}`), 'best'], (r, c) => (c === K ? 'best' : `D(${r + 1},${c + 1})`))
    g[0].forEach((x, a) => t.seed(0, a, x, `D(1,${a + 1}) = ${x}: day 1 has no yesterday`))
    for (let d = 1; d < D; d++) for (let a = 0; a < K; a++) {
      const others = range(0, K - 1).filter(b => b !== a), best = maxOf(others.map(b => t.get(d - 1, b)))
      t.set(d, a, g[d][a] + best, others.map(b => [d - 1, b]), `${g[d][a]} + max(${others.map(b => t.name(d - 1, b)).join(', ')}) = ${g[d][a]} + ${best}`)
    }
    const last = range(0, K - 1).map(a => [D - 1, a])
    t.set(D - 1, K, maxOf(last.map(x => t.get(...x))), last, `max(${last.map(x => `${t.name(...x)} = ${t.get(...x)}`).join(', ')})`)
    return { title: `Rewards ${rowsOf(g)}`, setup: 'D(d, a): the best total for days 1 to d when day d does activity a. It adds today’s reward to the best of yesterday’s OTHER activities.', table: t, answer: [D - 1, K], args: [g] }
  },
  'bounded-knapsack': ({ weights: w = [2, 3], values: v = [3, 5], counts: k = [3, 1], capacity: cap = 8 } = {}) => {
    const t = table(['no items', ...w.map((x, i) => `item ${i + 1} (w${x}, v${v[i]}, ×${k[i]})`)], range(0, cap).map(c => `cap ${c}`), (r, c) => `D(${r},${c})`)
    range(0, cap).forEach(c => t.seed(0, c, 0, `D(0,${c}) = 0: no items, no value`))
    for (let i = 1; i <= w.length; i++) for (let c = 0; c <= cap; c++) {
      const qs = range(0, Math.min(k[i - 1], Math.floor(c / w[i - 1])))
      const opts = qs.map(q => q * v[i - 1] + t.get(i - 1, c - q * w[i - 1]))
      t.set(i, c, maxOf(opts), qs.map(q => [i - 1, c - q * w[i - 1]]), `max(${qs.map((q, j) => `${q} cop${q === 1 ? 'y' : 'ies'}: ${q * v[i - 1]} + D(${i - 1},${c - q * w[i - 1]}) = ${opts[j]}`).join(', ')})`)
    }
    return { title: `Items ${w.map((x, i) => `(w${x}, v${v[i]}, up to ${k[i]})`).join(', ')}; capacity ${cap}`, setup: 'D(i, c): the best value from the first i items within capacity c. Try every number of copies of item i, up to its count, on the row above.', table: t, answer: [w.length, cap], args: [w, v, k, cap] }
  },
  // Subset sum up to half the total, then one more cell: the total minus twice the best reachable half.
  'equal-partition': ({ values: a = [3, 1, 4, 2, 2] } = {}) => {
    const S = a.reduce((x, y) => x + y, 0), H = Math.floor(S / 2), n = a.length
    const t = table(['no values', ...a.map(x => `+ ${x}`), 'difference'], range(0, H).map(s => `${s}`), (r, c) => (r === n + 1 ? 'answer' : `R(${r},${c})`))
    range(0, H).forEach(s => t.seed(0, s, s === 0, s === 0 ? 'R(0,0) = T: the empty group' : `R(0,${s}) = F`))
    for (let i = 1; i <= n; i++) for (let s = 0; s <= H; s++) {
      const reads = [[i - 1, s], ...(s >= a[i - 1] ? [[i - 1, s - a[i - 1]]] : [])]
      t.set(i, s, reads.some(([r, c]) => t.get(r, c)), reads, `R(${i - 1},${s})${s >= a[i - 1] ? ` or R(${i - 1},${s - a[i - 1]}) (put ${a[i - 1]} in the group)` : ''}`)
    }
    const x = Math.max(...range(0, H).filter(s => t.get(n, s)))
    t.set(n + 1, x, S - 2 * x, range(0, H).map(s => [n, s]), `the largest reachable total up to ${H} is ${x}: ${S} − 2·${x}`)
    return { title: `Values ${list(a)}, total ${S}`, setup: `One group decides the other, so only one group’s total matters: which totals up to half (${H}) can a group reach? The difference is the total minus twice the best one.`, table: t, answer: [n + 1, x], args: [a] }
  },
  // Running totals from −sum to +sum: each value goes up or down by itself.
  'target-signs': ({ values: a = [1, 1, 1], target = 1 } = {}) => {
    const S = a.reduce((x, y) => x + y, 0), n = a.length
    const t = table(['no values', ...a.map(x => `± ${x}`)], range(-S, S).map(s => `${s}`), (r, c) => `C(${r},${c - S})`)
    range(-S, S).forEach(s => t.seed(0, s + S, s === 0 ? 1 : 0, s === 0 ? 'C(0,0) = 1: no signs yet, total 0' : `C(0,${s}) = 0`))
    for (let i = 1; i <= n; i++) for (let s = -S; s <= S; s++) {
      const x = a[i - 1], from = [s - x, s + x].filter(u => u >= -S && u <= S)
      t.set(i, s + S, from.reduce((sum, u) => sum + t.get(i - 1, u + S), 0), from.map(u => [i - 1, u + S]), from.length ? `${from.map(u => `C(${i - 1},${u})`).join(' + ')} = ${from.map(u => t.get(i - 1, u + S)).join(' + ')}` : 'out of reach: 0')
    }
    return { title: `Values ${list(a)}, target ${target}`, setup: 'C(i, t): sign choices for the first i values that total t. +x arrives from t − x, −x from t + x; for a 0 both come from the same cell, which counts it twice.', table: t, answer: [n, target + S], args: [a, target] }
  },
  // The 0/1 knapsack with −∞ for "no choice fills this exactly"; only the start differs.
  'exact-capacity': ({ weights: w = [2, 3, 4], values: v = [5, 4, 6], capacity: cap = 6 } = {}) => {
    const t = table(['no items', ...w.map((x, i) => `item ${i + 1} (w${x}, v${v[i]})`)], range(0, cap).map(c => `fill ${c}`), (r, c) => `D(${r},${c})`)
    range(0, cap).forEach(c => t.seed(0, c, c === 0 ? 0 : -INF, c === 0 ? 'D(0,0) = 0: nothing fills 0' : `D(0,${c}) = −∞: nothing fills ${c}`))
    for (let i = 1; i <= w.length; i++) for (let c = 0; c <= cap; c++) {
      const skip = t.get(i - 1, c)
      if (w[i - 1] > c) { t.set(i, c, skip, [[i - 1, c]], `item ${i} is too heavy: D(${i - 1},${c}) = ${show(skip)}`); continue }
      const take = v[i - 1] + t.get(i - 1, c - w[i - 1])
      t.set(i, c, Math.max(skip, take), [[i - 1, c], [i - 1, c - w[i - 1]]], `max(skip: ${show(skip)}, take: ${v[i - 1]} + D(${i - 1},${c - w[i - 1]}) = ${show(take)})`)
    }
    return { title: `Items ${w.map((x, i) => `(w${x}, v${v[i]})`).join(', ')}; fill exactly ${cap}`, setup: 'The 0/1 knapsack rule, but every capacity except 0 starts at −∞. A cell stays −∞ until some choice fills it exactly, so the answer is an exact fill (−∞ means −1: impossible).', table: t, answer: [w.length, cap], args: [w, v, cap], check: x => (x === -1 ? -INF : x) }
  },
  // Indexed by value, storing the least weight; the last row picks the largest value that fits.
  'value-knapsack': ({ weights: w = [4, 6, 8], values: v = [1, 2, 3], capacity: cap = 10 } = {}) => {
    const V = v.reduce((x, y) => x + y, 0), n = w.length
    const t = table(['no items', ...w.map((x, i) => `item ${i + 1} (w${x}, v${v[i]})`), 'answer'], range(0, V).map(x => `value ${x}`), (r, c) => (r === n + 1 ? 'answer' : `W(${r},${c})`))
    range(0, V).forEach(x => t.seed(0, x, x === 0 ? 0 : INF, x === 0 ? 'W(0,0) = 0' : `W(0,${x}) = ∞: no items make ${x}`))
    for (let i = 1; i <= n; i++) for (let x = 0; x <= V; x++) {
      const skip = t.get(i - 1, x)
      if (v[i - 1] > x) { t.set(i, x, skip, [[i - 1, x]], `item ${i} is worth more than ${x}: W(${i - 1},${x}) = ${show(skip)}`); continue }
      const take = w[i - 1] + t.get(i - 1, x - v[i - 1])
      t.set(i, x, Math.min(skip, take), [[i - 1, x], [i - 1, x - v[i - 1]]], `min(skip: ${show(skip)}, take: ${w[i - 1]} + W(${i - 1},${x - v[i - 1]}) = ${show(take)})`)
    }
    const best = Math.max(...range(0, V).filter(x => t.get(n, x) <= cap))
    t.set(n + 1, best, best, range(0, V).map(x => [n, x]), `the largest value whose least weight fits in ${cap}: W(${n},${best}) = ${t.get(n, best)}`)
    return { title: `Items ${w.map((x, i) => `(w${x}, v${v[i]})`).join(', ')}; capacity ${cap}`, setup: 'W(i, x): the least weight that makes exactly value x from the first i items. Values are few, so this table is small even when weights are huge.', table: t, answer: [n + 1, best], args: [w, v, cap] }
  },
  lcs: ({ a = 'abcb', b = 'bdcab' } = {}) => {
    const t = table(['∅', ...a.split('').map((ch, i) => `${i + 1} ${ch}`)], ['∅', ...b.split('').map((ch, j) => `${j + 1} ${ch}`)], (r, c) => `D(${r},${c})`)
    for (let i = 0; i <= a.length; i++) t.seed(i, 0, 0, 'an empty prefix: 0')
    for (let j = 1; j <= b.length; j++) t.seed(0, j, 0, 'an empty prefix: 0')
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) t.set(i, j, 1 + t.get(i - 1, j - 1), [[i - 1, j - 1]], `“${a[i - 1]}” = “${b[j - 1]}”: 1 + D(${i - 1},${j - 1}) = 1 + ${t.get(i - 1, j - 1)}`)
      else t.set(i, j, Math.max(t.get(i - 1, j), t.get(i, j - 1)), [[i - 1, j], [i, j - 1]], `“${a[i - 1]}” ≠ “${b[j - 1]}”: max(D(${i - 1},${j}), D(${i},${j - 1})) = max(${t.get(i - 1, j)}, ${t.get(i, j - 1)})`)
    }
    return { title: `“${a}” and “${b}”`, setup: 'D(i, j): the longest common subsequence of the first i and first j letters.', table: t, answer: [a.length, b.length], args: [a, b] }
  },
  'lcs-reconstruct': ({ a = 'abcbdab', b = 'bdcaba' } = {}) => {
    const t = pairs(a, b, 'D'), n = a.length, m = b.length
    t.rowLabels.push('strings'); t.cells.push(t.colLabels.map(() => null))
    const name = t.name
    t.name = (r, c) => (r === n + 1 ? 'strings' : name(r, c))
    seedEdges(t, a, b, () => 0, () => 0, 'an empty prefix: 0')
    eachPair(a, b, (i, j) => {
      if (a[i - 1] === b[j - 1]) t.set(i, j, 1 + t.get(i - 1, j - 1), [[i - 1, j - 1]], `“${a[i - 1]}” = “${b[j - 1]}”: 1 + D(${i - 1},${j - 1}) = 1 + ${t.get(i - 1, j - 1)}`)
      else t.set(i, j, Math.max(t.get(i - 1, j), t.get(i, j - 1)), [[i - 1, j], [i, j - 1]], `“${a[i - 1]}” ≠ “${b[j - 1]}”: max(D(${i - 1},${j}), D(${i},${j - 1})) = max(${t.get(i - 1, j)}, ${t.get(i, j - 1)})`)
    })
    // Walk back from the last cell along every move that keeps the length, collecting strings in a set.
    const memo = new Map()
    const strings = (i, j) => {
      const k = `${i},${j}`
      if (!memo.has(k)) {
        let out = new Set([''])
        if (i && j) {
          if (a[i - 1] === b[j - 1]) out = new Set([...strings(i - 1, j - 1)].map(x => x + a[i - 1]))
          else {
            out = new Set()
            if (t.get(i - 1, j) === t.get(i, j)) strings(i - 1, j).forEach(x => out.add(x))
            if (t.get(i, j - 1) === t.get(i, j)) strings(i, j - 1).forEach(x => out.add(x))
          }
        }
        memo.set(k, out)
      }
      return memo.get(k)
    }
    const found = [...strings(n, m)].sort()
    t.set(n + 1, m, found.length, [[n, m]], `walk back from D(${n},${m}) = ${t.get(n, m)}, following every tie: ${found.map(x => `“${x}”`).join(', ')}`)
    return { title: `“${a}” and “${b}”`, setup: 'First the LCS length table, D(i, j) for every pair of prefixes. Then walk back from the last cell: a match is in the subsequence; on a mismatch, go to a neighbour with the same length, and on a tie, follow both. The different strings collected are the answer.', table: t, answer: [n + 1, m], args: [a, b] }
  },
  'edit-distance': ({ a = 'horse', b = 'ros' } = {}) => {
    const t = table(['∅', ...a.split('').map((ch, i) => `${i + 1} ${ch}`)], ['∅', ...b.split('').map((ch, j) => `${j + 1} ${ch}`)], (r, c) => `E(${r},${c})`)
    for (let i = 0; i <= a.length; i++) t.seed(i, 0, i, `${i} deletions`)
    for (let j = 1; j <= b.length; j++) t.seed(0, j, j, `${j} insertions`)
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      const same = a[i - 1] === b[j - 1] ? 0 : 1, opts = [t.get(i - 1, j) + 1, t.get(i, j - 1) + 1, t.get(i - 1, j - 1) + same]
      t.set(i, j, minOf(opts), [[i - 1, j], [i, j - 1], [i - 1, j - 1]], `min(delete ${opts[0]}, insert ${opts[1]}, ${same ? 'substitute' : 'match'} ${opts[2]})`)
    }
    return { title: `“${a}” to “${b}”`, setup: 'E(i, j): the fewest edits turning the first i letters into the first j. The last edit was a delete, an insert, or a substitute/match.', table: t, answer: [a.length, b.length], args: [a, b] }
  },
  lis: ({ values: a = [3, 1, 4, 1, 5, 9, 2, 6] } = {}) => {
    const t = table([''], a.map((v, i) => `${i} (${v})`), (r, c) => `L(${c})`)
    for (let i = 0; i < a.length; i++) {
      const from = range(0, i - 1).filter(j => a[j] < a[i])
      const best = from.length ? maxOf(from.map(j => t.get(0, j))) : 0
      t.set(0, i, 1 + best, from.map(j => [0, j]), from.length ? `1 + max(${from.map(j => `L(${j})`).join(', ')}) = 1 + ${best}` : 'nothing smaller before it: 1')
    }
    return { title: `Values ${list(a)}`, setup: 'L(i): the longest strictly increasing subsequence ending at i. It extends the best earlier one with a smaller value. The answer is the largest L.', table: t, answer: bestCell(t), args: [a] }
  },

  // Interval tables: row l is where a piece starts, column r where it ends, so only the upper triangle is
  // used. Every cell reads shorter pieces inside it, which lie closer to the diagonal: the fill goes one
  // diagonal at a time, outward.
  'matrix-chain': ({ dims: d = [2, 3, 4, 5] } = {}) => {
    const n = d.length - 1
    const t = intervals(range(0, n - 1).map(i => `${i} (${d[i]}×${d[i + 1]})`), 'D')
    for (let i = 0; i < n; i++) t.seed(i, i, 0, 'D(i,i) = 0: one matrix, nothing to multiply')
    byLength(n, 1, (l, r) => {
      const ks = range(l, r - 1), costs = ks.map(k => t.get(l, k) + t.get(k + 1, r) + d[l] * d[k + 1] * d[r + 1])
      t.set(l, r, minOf(costs), ks.flatMap(k => [[l, k], [k + 1, r]]), `min(${ks.map(k => `split after ${k}: D(${l},${k}) + D(${k + 1},${r}) + ${d[l]}·${d[k + 1]}·${d[r + 1]}`).join('; ')}) = min(${costs.join(', ')})`)
    })
    return { title: `Sizes ${list(d)}: ${n} matrices`, setup: 'D(l, r): the cheapest way to multiply matrices l to r. The last multiplication splits them after some k: both sides, then d_l · d_{k+1} · d_{r+1} to join them. Row = first matrix, column = last.', table: t, answer: [0, n - 1], args: [d] }
  },
  'burst-balloons': ({ values: a = [3, 1, 5, 8] } = {}) => {
    const p = [1, ...a, 1], m = p.length
    const t = intervals(p.map((v, i) => (i === 0 || i === m - 1 ? `${i} (wall)` : `${i} (${v})`)), 'D')
    for (let i = 0; i + 1 < m; i++) t.seed(i, i + 1, 0, 'D(l,l+1) = 0: neighbours, no balloon between them')
    byLength(m, 2, (l, r) => {
      const ks = range(l + 1, r - 1), gains = ks.map(k => t.get(l, k) + t.get(k, r) + p[l] * p[k] * p[r])
      t.set(l, r, maxOf(gains), ks.flatMap(k => [[l, k], [k, r]]), `max(${ks.map(k => `${k} last: D(${l},${k}) + D(${k},${r}) + ${p[l]}·${p[k]}·${p[r]}`).join('; ')}) = max(${gains.join(', ')})`)
    })
    return { title: `Balloons ${list(a)}, with a 1 at each end`, setup: 'D(l, r): the most earned bursting every balloon strictly between l and r while l and r still stand. Balloon k burst last earns a_l · a_k · a_r, because by then l and r are its neighbours.', table: t, answer: [0, m - 1], args: [a] }
  },
  'cut-stick': ({ n = 10, cuts = [2, 4, 7] } = {}) => {
    const p = [0, ...[...cuts].sort((x, y) => x - y), n], m = p.length
    const t = intervals(p.map((v, i) => `${i} (at ${v})`), 'D')
    for (let i = 0; i + 1 < m; i++) t.seed(i, i + 1, 0, 'D(l,l+1) = 0: no cut inside the piece')
    byLength(m, 2, (l, r) => {
      const ks = range(l + 1, r - 1), rest = ks.map(k => t.get(l, k) + t.get(k, r)), best = minOf(rest)
      t.set(l, r, p[r] - p[l] + best, ks.flatMap(k => [[l, k], [k, r]]), `(${p[r]} − ${p[l]}) + min(${ks.map(k => `first at ${p[k]}: D(${l},${k}) + D(${k},${r})`).join('; ')}) = ${p[r] - p[l]} + min(${rest.join(', ')})`)
    })
    return { title: `A stick of length ${n}, cut at ${list([...cuts].sort((x, y) => x - y))}`, setup: 'The cut points are sorted, with 0 and the stick’s end added. D(l, r): the cheapest way to make every cut between points l and r. The first cut costs the piece’s length and leaves two pieces that are cut on their own.', table: t, answer: [0, m - 1], args: [n, cuts] }
  },
  'merge-stones': ({ values: a = [4, 3, 1, 4] } = {}) => {
    const n = a.length
    const t = intervals(a.map((v, i) => `${i} (${v})`), 'D')
    for (let i = 0; i < n; i++) t.seed(i, i, 0, 'D(i,i) = 0: already one pile')
    byLength(n, 1, (l, r) => {
      const s = a.slice(l, r + 1).reduce((x, y) => x + y, 0), ks = range(l, r - 1), sides = ks.map(k => t.get(l, k) + t.get(k + 1, r))
      t.set(l, r, s + minOf(sides), ks.flatMap(k => [[l, k], [k + 1, r]]), `${s} + min(${ks.map(k => `D(${l},${k}) + D(${k + 1},${r})`).join('; ')}) = ${s} + min(${sides.join(', ')})`)
    })
    return { title: `Piles ${list(a)}`, setup: 'D(l, r): the cheapest way to merge piles l to r into one. The last merge joins the left part’s pile to the right part’s and costs every stone in l … r, whichever split it was.', table: t, answer: [0, n - 1], args: [a] }
  },
  'polygon-triangulation': ({ values: w = [1, 2, 3, 4, 5] } = {}) => {
    const n = w.length
    const t = intervals(w.map((v, i) => `${i} (${v})`), 'D')
    for (let i = 0; i + 1 < n; i++) t.seed(i, i + 1, 0, 'D(l,l+1) = 0: an edge, not a polygon')
    byLength(n, 2, (l, r) => {
      const ks = range(l + 1, r - 1), costs = ks.map(k => t.get(l, k) + t.get(k, r) + w[l] * w[k] * w[r])
      t.set(l, r, minOf(costs), ks.flatMap(k => [[l, k], [k, r]]), `min(${ks.map(k => `triangle ${l}-${k}-${r}: D(${l},${k}) + D(${k},${r}) + ${w[l]}·${w[k]}·${w[r]}`).join('; ')}) = min(${costs.join(', ')})`)
    })
    return { title: `Vertex weights ${list(w)}`, setup: 'D(l, r): the cheapest triangulation of the polygon on vertices l … r, closed by the edge r–l. That edge is in exactly one triangle, l-k-r, which leaves the polygons l … k and k … r.', table: t, answer: [0, n - 1], args: [w] }
  },
  'palindrome-subsequence': ({ s = 'bbbab' } = {}) => {
    const n = s.length
    const t = intervals(s.split('').map((ch, i) => `${i} ${ch}`), 'P')
    for (let i = 0; i < n; i++) t.seed(i, i, 1, 'P(i,i) = 1: one letter reads the same both ways')
    byLength(n, 1, (i, j) => {
      if (s[i] === s[j]) {
        const inside = j - i > 1 ? t.get(i + 1, j - 1) : 0
        t.set(i, j, 2 + inside, j - i > 1 ? [[i + 1, j - 1]] : [], `“${s[i]}” = “${s[j]}”: 2 + ${j - i > 1 ? `P(${i + 1},${j - 1}) = 2 + ${inside}` : 'nothing inside = 2 + 0'}`)
      } else t.set(i, j, Math.max(t.get(i + 1, j), t.get(i, j - 1)), [[i + 1, j], [i, j - 1]], `“${s[i]}” ≠ “${s[j]}”: max(drop ${i}: P(${i + 1},${j}), drop ${j}: P(${i},${j - 1})) = max(${t.get(i + 1, j)}, ${t.get(i, j - 1)})`)
    })
    return { title: `“${s}”`, setup: 'P(i, j): the longest palindromic subsequence inside s[i..j]. Equal ends can be the outer pair; different ends mean one of them is not used.', table: t, answer: [0, n - 1], args: [s] }
  },
  'palindrome-substring': ({ s = 'abba' } = {}) => {
    const n = s.length
    const labels = s.split('').map((ch, i) => `${i} ${ch}`)
    const t = table([...labels, 'count'], labels, (r, c) => (r === n ? 'count' : `T(${r},${c})`))
    for (let i = 0; i < n; i++) t.seed(i, i, true, 'T(i,i) = T: one letter is a palindrome')
    byLength(n, 1, (i, j) => {
      if (s[i] !== s[j]) t.set(i, j, false, [], `“${s[i]}” ≠ “${s[j]}”: the ends differ`)
      else if (j - i === 1) t.set(i, j, true, [], `“${s[i]}” = “${s[j]}”, nothing inside`)
      else t.set(i, j, t.get(i + 1, j - 1), [[i + 1, j - 1]], `“${s[i]}” = “${s[j]}”, so it is the inside: T(${i + 1},${j - 1}) = ${show(t.get(i + 1, j - 1))}`)
    })
    const all = range(0, n - 1).flatMap(i => range(i, n - 1).map(j => [i, j])), yes = all.filter(at => t.get(...at))
    t.set(n, n - 1, yes.length, all, `the T cells: ${yes.map(at => `T(${at})`).join(', ')}, ${yes.length} of them`)
    return { title: `“${s}”`, setup: 'T(i, j): is s[i..j] a palindrome? Its ends must match and its inside must be a palindrome too. The answer is not one cell but how many cells are T, so it gets a row of its own.', table: t, answer: [n, n - 1], args: [s] }
  },
  'palindrome-cuts': ({ s = 'abaab' } = {}) => {
    const n = s.length
    const t = table([''], range(0, n).map(i => (i ? `${i} ${s[i - 1]}` : '0')), (r, c) => `C(${c})`)
    t.seed(0, 0, -1, 'C(0) = −1: the first piece needs no cut before it')
    for (let i = 1; i <= n; i++) {
      const js = range(0, i - 1).filter(j => isPal(s.slice(j, i))), costs = js.map(j => t.get(0, j) + 1)
      t.set(0, i, minOf(costs), js.map(j => [0, j]), `last piece a palindrome: min(${js.map(j => `“${s.slice(j, i)}”: C(${j}) + 1`).join('; ')}) = min(${costs.join(', ')})`)
    }
    return { title: `“${s}”`, setup: 'C(i): the fewest cuts that split the first i letters into palindromes. The last piece s[j..i) must be a palindrome; one cut goes before it. C(0) = −1 so that a single piece costs 0 cuts.', table: t, answer: [0, n], args: [s] }
  },
  'optimal-bst': ({ values: f = [3, 1, 2, 4] } = {}) => {
    const n = f.length
    const t = intervals(f.map((v, i) => `key ${i} (${v}×)`), 'D')
    for (let i = 0; i < n; i++) t.seed(i, i, f[i], 'D(i,i) = fᵢ: one key, the root, at depth 1')
    // An empty side (the root is an end key) costs 0 and reads no cell.
    const side = (l, r) => (l > r ? ['0', 0, []] : [`D(${l},${r})`, t.get(l, r), [[l, r]]])
    byLength(n, 1, (l, r) => {
      const s = f.slice(l, r + 1).reduce((x, y) => x + y, 0), ks = range(l, r)
      const parts = ks.map(k => [side(l, k - 1), side(k + 1, r)]), costs = parts.map(([a, b]) => a[1] + b[1])
      t.set(l, r, s + minOf(costs), parts.flatMap(([a, b]) => [...a[2], ...b[2]]), `${s} + min(${ks.map((k, i) => `root ${k}: ${parts[i][0][0]} + ${parts[i][1][0]}`).join('; ')}) = ${s} + min(${costs.join(', ')})`)
    })
    return { title: `Keys searched ${list(f)} times`, setup: 'D(l, r): the lowest search cost of a tree on keys l … r. Choose the root k; both subtrees hang one level lower, so every key in the range is paid once more: the sum of their frequencies. An empty subtree costs 0.', table: t, answer: [0, n - 1], args: [f] }
  },
  'strange-printer': ({ s = 'abcabc' } = {}) => {
    const n = s.length
    const t = intervals(s.split('').map((ch, i) => `${i} ${ch}`), 'D')
    for (let i = 0; i < n; i++) t.seed(i, i, 1, 'D(i,i) = 1: one letter, one turn')
    byLength(n, 1, (l, r) => {
      const opts = [{ text: `alone: 1 + D(${l + 1},${r})`, value: 1 + t.get(l + 1, r), reads: [[l + 1, r]] }]
      for (let k = l + 1; k <= r; k++) if (s[k] === s[l]) {
        const mid = k > l + 1 ? [`D(${l + 1},${k - 1})`, t.get(l + 1, k - 1), [[l + 1, k - 1]]] : ['0', 0, []]
        opts.push({ text: `with ${k}: ${mid[0]} + D(${k},${r})`, value: mid[1] + t.get(k, r), reads: [...mid[2], [k, r]] })
      }
      t.set(l, r, minOf(opts.map(o => o.value)), opts.flatMap(o => o.reads), `min(${opts.map(o => o.text).join('; ')}) = min(${opts.map(o => o.value).join(', ')})`)
    })
    return { title: `“${s}”`, setup: 'D(l, r): the fewest turns to print s[l..r]. Letter l is printed alone, or by the same stroke as a later equal letter k; then the letters between are printed on top, separately.', table: t, answer: [0, n - 1], args: [s] }
  },
  'k-partitions': ({ values: a = [1, 2, 3, 4], k = 2 } = {}) => {
    const n = a.length, prefix = [0]
    a.forEach(x => prefix.push(prefix.at(-1) + x))
    const t = table(range(0, k).map(g => `${g} seg.`), range(0, n).map(i => (i ? `${i} (${a[i - 1]})` : '0')), (g, i) => `D(${g},${i})`)
    t.seed(0, 0, 0, 'D(0,0) = 0: no items, no segments')
    for (let i = 1; i <= n; i++) t.seed(0, i, INF, 'D(0,i) = ∞: items left over with no segment')
    for (let g = 1; g <= k; g++) for (let i = 0; i <= n; i++) {
      const js = range(0, i - 1), costs = js.map(j => t.get(g - 1, j) + (prefix[i] - prefix[j]) ** 2)
      if (!js.length) { t.set(g, i, INF, [], `no items for ${g} segment${g > 1 ? 's' : ''}: ∞`); continue }
      t.set(g, i, minOf(costs), js.map(j => [g - 1, j]), `min(${js.map(j => `D(${g - 1},${j}) + ${prefix[i] - prefix[j]}²`).join('; ')}) = min(${costs.map(show).join(', ')})`)
    }
    return { title: `${list(a)} in ${k} segments`, setup: 'D(g, i): the cheapest way to cut the first i items into exactly g segments, a segment costing its sum squared. The last segment runs from some j to i; before it, g − 1 segments cover the first j items.', table: t, answer: [k, n], args: [a, k] }
  },
  'partition-max': ({ values: a = [7, 2, 5, 10, 8], k = 2 } = {}) => {
    const n = a.length, prefix = [0]
    a.forEach(x => prefix.push(prefix.at(-1) + x))
    const t = table(range(0, k).map(g => `${g} seg.`), range(0, n).map(i => (i ? `${i} (${a[i - 1]})` : '0')), (g, i) => `D(${g},${i})`)
    t.seed(0, 0, 0, 'D(0,0) = 0: no items, no segments')
    for (let i = 1; i <= n; i++) t.seed(0, i, INF, 'D(0,i) = ∞: items left over with no segment')
    for (let g = 1; g <= k; g++) for (let i = 0; i <= n; i++) {
      const js = range(0, i - 1), costs = js.map(j => Math.max(t.get(g - 1, j), prefix[i] - prefix[j]))
      if (!js.length) { t.set(g, i, INF, [], `no items for ${g} segment${g > 1 ? 's' : ''}: ∞`); continue }
      t.set(g, i, minOf(costs), js.map(j => [g - 1, j]), `min(${js.map(j => `max(D(${g - 1},${j}), ${prefix[i] - prefix[j]})`).join('; ')}) = min(${costs.map(show).join(', ')})`)
    }
    return { title: `${list(a)} in ${k} segments`, setup: 'D(g, i): the smallest possible largest segment sum when the first i items are cut into g segments. The largest segment is either among the first g − 1 or the last one, j … i.', table: t, answer: [k, n], args: [a, k] }
  },

  // Two values per piece, so each start l has two rows.
  'boolean-parenthesization': ({ expr = 'T|F&T^F' } = {}) => {
    const syms = [...expr].filter((_, i) => i % 2 === 0).map(c => c === 'T'), ops = [...expr].filter((_, i) => i % 2).map(c => OPS[c]), n = syms.length
    const t = table(range(0, n - 1).flatMap(l => [`T from ${l}`, `F from ${l}`]), syms.map((v, i) => `${i} ${v ? 'T' : 'F'}`), (r, c) => `${r % 2 ? 'F' : 'T'}(${r >> 1},${c})`)
    for (let i = 0; i < n; i++) { t.seed(2 * i, i, syms[i] ? 1 : 0, 'T(i,i), F(i,i): 1 and 0 for a T, 0 and 1 for an F'); t.seed(2 * i + 1, i, syms[i] ? 0 : 1, 'T(i,i), F(i,i): 1 and 0 for a T, 0 and 1 for an F') }
    byLength(n, 1, (l, r) => {
      for (const want of [true, false]) {
        const terms = range(l, r - 1).map(k => {
          const [tl, fl, tr, fr] = [t.get(2 * l, k), t.get(2 * l + 1, k), t.get(2 * (k + 1), r), t.get(2 * (k + 1) + 1, r)]
          const ways = { and: want ? [[tl, tr]] : [[tl, fr], [fl, tr], [fl, fr]], or: want ? [[tl, tr], [tl, fr], [fl, tr]] : [[fl, fr]], xor: want ? [[tl, fr], [fl, tr]] : [[tl, tr], [fl, fr]] }[ops[k]]
          return { text: `${ops[k]} at ${k}: ${ways.map(([x, y]) => `${x}·${y}`).join(' + ')}`, value: ways.reduce((s, [x, y]) => s + x * y, 0), reads: [[2 * l, k], [2 * l + 1, k], [2 * (k + 1), r], [2 * (k + 1) + 1, r]] }
        })
        t.set(2 * l + (want ? 0 : 1), r, terms.reduce((s, x) => s + x.value, 0), terms.flatMap(x => x.reads), `${terms.map(x => x.text).join('; ')} = ${terms.map(x => x.value).join(' + ')}`)
      }
    })
    return { title: `${syms.map((v, i) => `${v ? 'T' : 'F'}${ops[i] ? ` ${ops[i]}` : ''}`).join(' ')}`, setup: 'T(l, r) and F(l, r): how many ways symbols l … r can be bracketed to come out true, and false. The last operator applied, at k, splits them; each side’s true and false counts multiply. An “or” is false only when both sides are; an “and” true only when both are.', table: t, answer: [0, n - 1], args: [syms, ops], input: { expr } }
  },
  'expression-extrema': ({ expr = '1-3*2-4' } = {}) => {
    const nums = [...expr].filter((_, i) => i % 2 === 0).map(Number), ops = [...expr].filter((_, i) => i % 2), n = nums.length
    const sign = { '+': '+', '-': '−', '*': '×' }, o = v => (v < 0 ? `(−${-v})` : String(v))
    const t = table(range(0, n - 1).flatMap(l => [`max from ${l}`, `min from ${l}`]), nums.map((v, i) => `${i} (${v})`), (r, c) => `${r % 2 ? 'min' : 'max'}(${r >> 1},${c})`)
    for (let i = 0; i < n; i++) { t.seed(2 * i, i, nums[i], 'max(i,i) = min(i,i) = the number itself'); t.seed(2 * i + 1, i, nums[i], 'max(i,i) = min(i,i) = the number itself') }
    byLength(n, 1, (l, r) => {
      for (const big of [true, false]) {
        const pick = big ? maxOf : minOf, word = big ? 'max' : 'min'
        const parts = range(l, r - 1).map(k => {
          const L = [[2 * l, k], [2 * l + 1, k]], R = [[2 * (k + 1), r], [2 * (k + 1) + 1, r]]
          const [hiL, loL, hiR, loR] = [...L, ...R].map(at => t.get(...at))
          if (ops[k] === '+') return big ? { text: `${o(hiL)} + ${o(hiR)}`, value: hiL + hiR, reads: [L[0], R[0]] } : { text: `${o(loL)} + ${o(loR)}`, value: loL + loR, reads: [L[1], R[1]] }
          if (ops[k] === '-') return big ? { text: `${o(hiL)} − ${o(loR)}`, value: hiL - loR, reads: [L[0], R[1]] } : { text: `${o(loL)} − ${o(hiR)}`, value: loL - hiR, reads: [L[1], R[0]] }
          const products = [hiL * hiR, hiL * loR, loL * hiR, loL * loR]
          return { text: `${word}(${[...new Set([[hiL, hiR], [hiL, loR], [loL, hiR], [loL, loR]].map(([x, y]) => `${o(x)}·${o(y)}`))].join(', ')})`, value: pick(products), reads: [...L, ...R] }
        })
        t.set(2 * l + (big ? 0 : 1), r, pick(parts.map(p => p.value)), parts.flatMap(p => p.reads), `${word}(${parts.map((p, i) => `${sign[ops[l + i]]} at ${l + i}: ${p.text}`).join('; ')}) = ${word}(${parts.map(p => String(p.value).replace('-', '−')).join(', ')})`)
      }
    })
    return { title: nums.map((v, i) => `${v}${ops[i] ? ` ${sign[ops[i]]}` : ''}`).join(' '), setup: 'max(l, r) and min(l, r): the largest and smallest values numbers l … r can reach, however they are bracketed. The last operator, at k, splits them. A largest difference is a largest left minus a smallest right; a product’s extremes can come from two negatives, so × tries all four pairs.', table: t, answer: [0, n - 1], args: [nums, ops], input: { expr } }
  },
  // Two strings: row i is the first i letters of a, column j the first j of b.
  'common-substring': ({ a = 'abcde', b = 'abfde' } = {}) => {
    const t = pairs(a, b, 'S')
    seedEdges(t, a, b, () => 0, () => 0, 'nothing ends at an empty prefix: 0')
    eachPair(a, b, (i, j) => {
      if (a[i - 1] === b[j - 1]) t.set(i, j, 1 + t.get(i - 1, j - 1), [[i - 1, j - 1]], `“${a[i - 1]}” = “${b[j - 1]}”: 1 + S(${i - 1},${j - 1}) = 1 + ${t.get(i - 1, j - 1)}`)
      else t.set(i, j, 0, [], `“${a[i - 1]}” ≠ “${b[j - 1]}”: no common substring ends here`)
    })
    return { title: `“${a}” and “${b}”`, setup: 'S(i, j): the longest common substring ending exactly at a’s letter i and b’s letter j. It only grows along a diagonal of matches; a mismatch resets it to 0. The answer is the largest S anywhere.', table: t, answer: bestCell(t), args: [a, b] }
  },
  'weighted-edit': ({ a = 'abc', b = 'bca', ins = 1, del = 1, sub = 3 } = {}) => {
    const t = pairs(a, b, 'E')
    seedEdges(t, a, b, i => i * del, j => j * ins, `delete or insert everything: ${del} per deletion, ${ins} per insertion`)
    eachPair(a, b, (i, j) => {
      const same = a[i - 1] === b[j - 1], opts = [t.get(i - 1, j) + del, t.get(i, j - 1) + ins, t.get(i - 1, j - 1) + (same ? 0 : sub)]
      t.set(i, j, minOf(opts), [[i - 1, j], [i, j - 1], [i - 1, j - 1]], `min(delete ${t.get(i - 1, j)} + ${del}, insert ${t.get(i, j - 1)} + ${ins}, ${same ? `match ${t.get(i - 1, j - 1)} + 0` : `substitute ${t.get(i - 1, j - 1)} + ${sub}`}) = min(${opts.join(', ')})`)
    })
    return { title: `“${a}” to “${b}”: insert ${ins}, delete ${del}, substitute ${sub}`, setup: 'E(i, j): the cheapest way to turn the first i letters of a into the first j of b. The same three last edits as edit distance, each paying its own price. A substitution dearer than delete + insert is never used.', table: t, answer: [a.length, b.length], args: [a, b, ins, del, sub] }
  },
  damerau: ({ a = 'abcd', b = 'badc' } = {}) => {
    const t = pairs(a, b, 'E')
    seedEdges(t, a, b, i => i, j => j, 'delete or insert everything')
    eachPair(a, b, (i, j) => {
      const same = a[i - 1] === b[j - 1] ? 0 : 1, reads = [[i - 1, j], [i, j - 1], [i - 1, j - 1]]
      const opts = [[`delete ${t.get(i - 1, j) + 1}`, t.get(i - 1, j) + 1], [`insert ${t.get(i, j - 1) + 1}`, t.get(i, j - 1) + 1], [`${same ? 'substitute' : 'match'} ${t.get(i - 1, j - 1) + same}`, t.get(i - 1, j - 1) + same]]
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] && a[i - 1] !== a[i - 2]) { reads.push([i - 2, j - 2]); opts.push([`swap “${a[i - 2]}${a[i - 1]}”: E(${i - 2},${j - 2}) + 1 = ${t.get(i - 2, j - 2) + 1}`, t.get(i - 2, j - 2) + 1]) }
      t.set(i, j, minOf(opts.map(o => o[1])), reads, `min(${opts.map(o => o[0]).join(', ')})`)
    })
    return { title: `“${a}” to “${b}”`, setup: 'E(i, j): the fewest edits turning the first i letters of a into the first j of b. As edit distance, plus a fourth way: when a’s last two letters are b’s last two reversed, swap them for 1, reading two rows and columns back.', table: t, answer: [a.length, b.length], args: [a, b] }
  },
  'shortest-supersequence': ({ a = 'abac', b = 'cab' } = {}) => {
    const t = pairs(a, b, 'S')
    seedEdges(t, a, b, i => i, j => j, 'one string empty: the other is its own supersequence')
    eachPair(a, b, (i, j) => {
      if (a[i - 1] === b[j - 1]) t.set(i, j, 1 + t.get(i - 1, j - 1), [[i - 1, j - 1]], `“${a[i - 1]}” = “${b[j - 1]}”, written once: 1 + S(${i - 1},${j - 1}) = 1 + ${t.get(i - 1, j - 1)}`)
      else t.set(i, j, 1 + Math.min(t.get(i - 1, j), t.get(i, j - 1)), [[i - 1, j], [i, j - 1]], `“${a[i - 1]}” ≠ “${b[j - 1]}”: 1 + min(write “${a[i - 1]}”: S(${i - 1},${j}), write “${b[j - 1]}”: S(${i},${j - 1})) = 1 + min(${t.get(i - 1, j)}, ${t.get(i, j - 1)})`)
    })
    return { title: `“${a}” and “${b}”`, setup: 'S(i, j): the length of the shortest string containing the first i letters of a and the first j of b as subsequences. Its last letter is a shared last letter, or the last letter of one of them.', table: t, answer: [a.length, b.length], args: [a, b] }
  },
  'distinct-subsequences': ({ s = 'rabbbit', target = 'rabbit' } = {}) => {
    const t = pairs(s, target, 'N')
    seedEdges(t, s, target, () => 1, () => 0, 'N(i,0) = 1: the empty target, by using nothing; N(0,j) = 0: an empty source spells nothing else')
    eachPair(s, target, (i, j) => {
      if (s[i - 1] === target[j - 1]) t.set(i, j, t.get(i - 1, j) + t.get(i - 1, j - 1), [[i - 1, j], [i - 1, j - 1]], `skip “${s[i - 1]}”: N(${i - 1},${j}) + use it: N(${i - 1},${j - 1}) = ${t.get(i - 1, j)} + ${t.get(i - 1, j - 1)}`)
      else t.set(i, j, t.get(i - 1, j), [[i - 1, j]], `“${s[i - 1]}” ≠ “${target[j - 1]}”, so skip it: N(${i - 1},${j}) = ${t.get(i - 1, j)}`)
    })
    return { title: `“${target}” inside “${s}”`, setup: 'N(i, j): how many sets of positions in the first i letters of the source spell the first j letters of the target. The source’s letter i is skipped, or (when it matches) used as target letter j.', table: t, answer: [s.length, target.length], args: [s, target] }
  },
  'unique-subsequences': ({ s = 'abab' } = {}) => {
    const n = s.length
    const t = table([''], range(0, n).map(i => (i ? `${i} ${s[i - 1]}` : '0')), (r, c) => `U(${c})`)
    t.seed(0, 0, 1, 'U(0) = 1: the empty string')
    for (let i = 1; i <= n; i++) {
      const p = i > 1 ? s.lastIndexOf(s[i - 1], i - 2) + 1 : 0
      if (p) t.set(0, i, 2 * t.get(0, i - 1) - t.get(0, p - 1), [[0, i - 1], [0, p - 1]], `2 · U(${i - 1}) − U(${p - 1}), since “${s[i - 1]}” was last at ${p}: 2 · ${t.get(0, i - 1)} − ${t.get(0, p - 1)}`)
      else t.set(0, i, 2 * t.get(0, i - 1), [[0, i - 1]], `first “${s[i - 1]}”: every earlier string, with and without it: 2 · U(${i - 1}) = 2 · ${t.get(0, i - 1)}`)
    }
    return { title: `“${s}”`, setup: 'U(i): how many different strings are subsequences of the first i letters, the empty one included. Letter i doubles them, but if it appeared before at p, the strings made then ending in it are made again: subtract U(p − 1).', table: t, answer: [0, n], args: [s] }
  },
  interleaving: ({ a = 'aab', b = 'axy', c = 'aaxaby' } = {}) => {
    const t = pairs(a, b, 'I')
    t.seed(0, 0, true, 'I(0,0) = T: nothing used, nothing formed')
    for (let i = 1; i <= a.length; i++) t.set(i, 0, t.get(i - 1, 0) && a[i - 1] === c[i - 1], [[i - 1, 0]], `only a: I(${i - 1},0) = ${show(t.get(i - 1, 0))}, and a’s “${a[i - 1]}” ${a[i - 1] === c[i - 1] ? '=' : '≠'} c’s “${c[i - 1] ?? ' '}”`)
    for (let j = 1; j <= b.length; j++) t.set(0, j, t.get(0, j - 1) && b[j - 1] === c[j - 1], [[0, j - 1]], `only b: I(0,${j - 1}) = ${show(t.get(0, j - 1))}, and b’s “${b[j - 1]}” ${b[j - 1] === c[j - 1] ? '=' : '≠'} c’s “${c[j - 1] ?? ' '}”`)
    eachPair(a, b, (i, j) => {
      const ch = c[i + j - 1], fromA = a[i - 1] === ch, fromB = b[j - 1] === ch
      const reads = [...(fromA ? [[i - 1, j]] : []), ...(fromB ? [[i, j - 1]] : [])]
      const value = (fromA && t.get(i - 1, j)) || (fromB && t.get(i, j - 1))
      t.set(i, j, Boolean(value), reads, reads.length ? `c’s letter ${i + j} “${ch}”: ${[fromA && `from a: I(${i - 1},${j}) = ${show(t.get(i - 1, j))}`, fromB && `from b: I(${i},${j - 1}) = ${show(t.get(i, j - 1))}`].filter(Boolean).join(' or ')}` : `c’s letter ${i + j} “${ch ?? ' '}” is neither a’s “${a[i - 1]}” nor b’s “${b[j - 1]}”`)
    })
    return { title: `Is “${c}” an interleaving of “${a}” and “${b}”?`, setup: 'I(i, j): can the first i letters of a and the first j of b form the first i + j letters of c? c’s letter i + j came from a or from b, so check the cell that source leads back to.', table: t, answer: [a.length, b.length], args: [a, b, c] }
  },
  wildcard: ({ s = 'adceb', p = '*a*b' } = {}) => {
    const t = pairs(s, p, 'M')
    t.seed(0, 0, true, 'M(0,0) = T: an empty pattern matches the empty string')
    for (let i = 1; i <= s.length; i++) t.seed(i, 0, false, 'M(i,0) = F: an empty pattern matches only nothing')
    for (let j = 1; j <= p.length; j++) t.seed(0, j, p.slice(0, j).split('').every(ch => ch === '*'), 'M(0,j): T only while the pattern so far is all *')
    eachPair(s, p, (i, j) => {
      const sym = p[j - 1], ch = s[i - 1]
      if (sym === '*') t.set(i, j, t.get(i, j - 1) || t.get(i - 1, j), [[i, j - 1], [i - 1, j]], `* matches nothing: M(${i},${j - 1}) = ${show(t.get(i, j - 1))}, or takes “${ch}”: M(${i - 1},${j}) = ${show(t.get(i - 1, j))}`)
      else if (sym === '?' || sym === ch) t.set(i, j, t.get(i - 1, j - 1), [[i - 1, j - 1]], `“${sym}” matches “${ch}”: M(${i - 1},${j - 1}) = ${show(t.get(i - 1, j - 1))}`)
      else t.set(i, j, false, [], `“${sym}” does not match “${ch}”`)
    })
    return { title: `Does “${p}” match “${s}”?`, setup: 'M(i, j): do the first j pattern symbols match the first i letters? A letter or ? matches one letter and reads the diagonal. A * matches nothing (read left) or one more letter (read up, keeping the *).', table: t, answer: [s.length, p.length], args: [s, p] }
  },
  regex: ({ s = 'aab', p = 'c*a*b' } = {}) => {
    const t = pairs(s, p, 'M'), fits = (ch, x) => x === '.' || x === ch
    t.seed(0, 0, true, 'M(0,0) = T: an empty pattern matches the empty string')
    for (let i = 1; i <= s.length; i++) t.seed(i, 0, false, 'M(i,0) = F: an empty pattern matches only nothing')
    for (let j = 1; j <= p.length; j++) {
      if (p[j - 1] === '*') t.set(0, j, t.get(0, j - 2), [[0, j - 2]], `“${p[j - 2]}*” can match nothing: M(0,${j - 2}) = ${show(t.get(0, j - 2))}`)
      else t.set(0, j, false, [], `“${p[j - 1]}” needs a letter`)
    }
    eachPair(s, p, (i, j) => {
      const sym = p[j - 1], ch = s[i - 1]
      if (sym === '*') {
        const x = p[j - 2], more = fits(ch, x)
        t.set(i, j, t.get(i, j - 2) || (more && t.get(i - 1, j)), more ? [[i, j - 2], [i - 1, j]] : [[i, j - 2]], `zero “${x}”: M(${i},${j - 2}) = ${show(t.get(i, j - 2))}${more ? `, or one more “${x}” for “${ch}”: M(${i - 1},${j}) = ${show(t.get(i - 1, j))}` : `; “${x}” cannot take “${ch}”`}`)
      } else if (fits(ch, sym)) t.set(i, j, t.get(i - 1, j - 1), [[i - 1, j - 1]], `“${sym}” matches “${ch}”: M(${i - 1},${j - 1}) = ${show(t.get(i - 1, j - 1))}`)
      else t.set(i, j, false, [], `“${sym}” does not match “${ch}”`)
    })
    return { title: `Does “${p}” match “${s}”?`, setup: 'M(i, j): do the first j pattern symbols match the first i letters? A letter or “.” reads the diagonal. For “x*”: zero copies skips both symbols (two columns left); one more copy needs the letter to fit x and keeps x* (one row up).', table: t, answer: [s.length, p.length], args: [s, p] }
  },
  'palindrome-count': ({ s = 'abab' } = {}) => {
    const n = s.length
    const t = intervals(s.split('').map((ch, i) => `${i} ${ch}`), 'N')
    for (let i = 0; i < n; i++) t.seed(i, i, 1, 'N(i,i) = 1: one letter is one palindrome')
    byLength(n, 1, (i, j) => {
      const inner = j - i > 1, mid = inner ? t.get(i + 1, j - 1) : 0, base = t.get(i + 1, j) + t.get(i, j - 1) - mid
      const reads = [[i + 1, j], [i, j - 1], ...(inner ? [[i + 1, j - 1]] : [])], midName = inner ? `N(${i + 1},${j - 1})` : '0'
      const both = `N(${i + 1},${j}) + N(${i},${j - 1}) − ${midName}`
      if (s[i] === s[j]) t.set(i, j, base + mid + 1, reads, `${both} + “${s[i]}…${s[j]}” around each inside one, and alone: ${midName} + 1 = ${t.get(i + 1, j)} + ${t.get(i, j - 1)} − ${mid} + ${mid} + 1`)
      else t.set(i, j, base, reads, `“${s[i]}” ≠ “${s[j]}”: ${both} = ${t.get(i + 1, j)} + ${t.get(i, j - 1)} − ${mid}`)
    })
    return { title: `“${s}”`, setup: 'N(i, j): the palindromic subsequences inside s[i..j], counted by position. Those that skip an end: N(i+1, j) + N(i, j−1), minus the ones counted twice, N(i+1, j−1). Equal ends also wrap every inside palindrome, and form one of their own.', table: t, answer: [0, n - 1], args: [s] }
  },
  'local-alignment': ({ a = 'xabcy', b = 'zabcw', match: m = 2, mismatch: x = 1, gap: g = 1 } = {}) => {
    const t = pairs(a, b, 'H')
    seedEdges(t, a, b, () => 0, () => 0, 'an empty alignment scores 0')
    eachPair(a, b, (i, j) => {
      const same = a[i - 1] === b[j - 1], d = t.get(i - 1, j - 1) + (same ? m : -x), up = t.get(i - 1, j) - g, left = t.get(i, j - 1) - g
      t.set(i, j, Math.max(0, d, up, left), [[i - 1, j - 1], [i - 1, j], [i, j - 1]], `max(start here 0, ${same ? 'match' : 'mismatch'} ${t.get(i - 1, j - 1)} ${same ? `+ ${m}` : `− ${x}`}, gap ${t.get(i - 1, j)} − ${g}, gap ${t.get(i, j - 1)} − ${g}) = max(0, ${d}, ${up}, ${left})`)
    })
    return { title: `“${a}” and “${b}”: match +${m}, mismatch −${x}, gap −${g}`, setup: 'H(i, j): the best score of an alignment ending at a’s letter i and b’s letter j, starting anywhere. The 0 means “start a new alignment here”, so a bad beginning is dropped. The answer is the largest H anywhere.', table: t, answer: bestCell(t), args: [a, b, m, x, g] }
  },
  // Sequences: one column per position, as in LIS.
  'lis-count': ({ values: a = [1, 3, 5, 4, 7] } = {}) => {
    const n = a.length
    const t = table(['L(i)', 'N(i)'], [...a.map((v, i) => `${i} (${v})`), 'total'], (r, c) => (c === n ? 'total' : `${r ? 'N' : 'L'}(${c})`))
    for (let i = 0; i < n; i++) {
      const from = range(0, i - 1).filter(j => a[j] < a[i]), best = from.length ? maxOf(from.map(j => t.get(0, j))) : 0
      t.set(0, i, 1 + best, from.map(j => [0, j]), from.length ? `1 + max(${from.map(j => `L(${j})`).join(', ')}) = 1 + ${best}` : 'nothing smaller before it: 1')
      const win = from.filter(j => t.get(0, j) === best)
      t.set(1, i, win.length ? win.reduce((s, j) => s + t.get(1, j), 0) : 1, [[0, i], ...win.map(j => [1, j])], win.length ? `the ways into the j with L(j) = ${best}: ${win.map(j => `N(${j})`).join(' + ')} = ${win.map(j => t.get(1, j)).join(' + ')}` : 'the value alone: 1 way')
    }
    const top = maxOf(range(0, n - 1).map(i => t.get(0, i))), ends = range(0, n - 1).filter(i => t.get(0, i) === top)
    t.set(1, n, ends.reduce((s, i) => s + t.get(1, i), 0), [...range(0, n - 1).map(i => [0, i]), ...ends.map(i => [1, i])], `longest length ${top}, ending at ${ends.join(', ')}: ${ends.map(i => `N(${i})`).join(' + ')} = ${ends.map(i => t.get(1, i)).join(' + ')}`)
    return { title: `Values ${list(a)}`, setup: 'L(i): the longest increasing subsequence ending at i. N(i): how many reach that length. A predecessor with the best L(j) passes on its N(j); predecessors that tie add up. The total adds N over every position that reaches the longest length.', table: t, answer: [1, n], args: [a] }
  },
  'weighted-lis': ({ keys: k = [1, 5, 2, 3], weights: w = [2, 10, 3, 3] } = {}) => {
    const t = table([''], k.map((v, i) => `${i} (${v}, w${w[i]})`), (r, c) => `W(${c})`)
    for (let i = 0; i < k.length; i++) {
      const from = range(0, i - 1).filter(j => k[j] < k[i]), best = from.length ? maxOf(from.map(j => t.get(0, j))) : 0
      t.set(0, i, w[i] + Math.max(0, best), from.map(j => [0, j]), from.length ? `${w[i]} + max(0, ${from.map(j => `W(${j})`).join(', ')}) = ${w[i]} + max(0, ${best})` : `nothing smaller before it: its own weight, ${w[i]}`)
    }
    return { title: `Keys ${list(k)}, weights ${list(w)}`, setup: 'W(i): the heaviest increasing subsequence (by key) ending at i. Add i’s weight to the heaviest earlier one with a smaller key, or start at i when every one of those is negative. The answer is the largest W.', table: t, answer: bestCell(t), args: [k, w] }
  },
  bitonic: ({ values: a = [1, 11, 2, 10, 4, 5, 2, 1] } = {}) => {
    const n = a.length
    const t = table(['up(i)', 'down(i)', 'peak at i'], a.map((v, i) => `${i} (${v})`), (r, c) => `${['up', 'down', 'peak'][r]}(${c})`)
    for (let i = 0; i < n; i++) {
      const from = range(0, i - 1).filter(j => a[j] < a[i]), best = from.length ? maxOf(from.map(j => t.get(0, j))) : 0
      t.set(0, i, 1 + best, from.map(j => [0, j]), from.length ? `rise: 1 + max(${from.map(j => `up(${j})`).join(', ')}) = 1 + ${best}` : 'nothing smaller before it: 1')
    }
    for (let i = n - 1; i >= 0; i--) {
      const to = range(i + 1, n - 1).filter(j => a[j] < a[i]), best = to.length ? maxOf(to.map(j => t.get(1, j))) : 0
      t.set(1, i, 1 + best, to.map(j => [1, j]), to.length ? `fall: 1 + max(${to.map(j => `down(${j})`).join(', ')}) = 1 + ${best}` : 'nothing smaller after it: 1')
    }
    for (let i = 0; i < n; i++) t.set(2, i, t.get(0, i) + t.get(1, i) - 1, [[0, i], [1, i]], `up(${i}) + down(${i}) − 1 = ${t.get(0, i)} + ${t.get(1, i)} − 1: the peak is in both`)
    return { title: `Values ${list(a)}`, setup: 'up(i): the longest rise ending at i, filled left to right. down(i): the longest fall starting at i, filled right to left. A subsequence peaking at i joins the two, sharing the peak. The answer is the largest peak value.', table: t, answer: bestInRow(t, 2), args: [a] }
  },
  'multidimensional-chains': ({ envelopes: env = [[5, 4], [6, 4], [6, 7], [2, 3]] } = {}) => {
    const e = [...env].sort((x, y) => x[0] - y[0] || x[1] - y[1])
    const t = table([''], e.map(([w, h], i) => `${i} (${w}×${h})`), (r, c) => `L(${c})`)
    for (let i = 0; i < e.length; i++) {
      const from = range(0, i - 1).filter(j => e[j][0] < e[i][0] && e[j][1] < e[i][1]), best = from.length ? maxOf(from.map(j => t.get(0, j))) : 0
      t.set(0, i, 1 + best, from.map(j => [0, j]), from.length ? `fits inside: 1 + max(${from.map(j => `L(${j})`).join(', ')}) = 1 + ${best}` : 'nothing fits inside it: 1')
    }
    return { title: `Envelopes ${e.map(([w, h]) => `${w}×${h}`).join(', ')} (sorted by width)`, setup: 'Sorted by width, every envelope that can go inside i comes before it. L(i): the longest chain with i outermost. An earlier envelope fits only if it is strictly smaller in both width and height. The answer is the largest L.', table: t, answer: bestCell(t), args: [env] }
  },
  'arithmetic-subsequence': ({ values: a = [9, 4, 7, 2, 10] } = {}) => {
    const n = a.length, ds = [...new Set(range(0, n - 1).flatMap(i => range(0, i - 1).map(j => a[i] - a[j])))].sort((x, y) => x - y)
    const row = d => ds.indexOf(d)
    const t = table(ds.map(d => `d = ${d}`), a.map((v, i) => `${i} (${v})`), (r, c) => `A(${c},${ds[r]})`)
    for (let i = 0; i < n; i++) for (const d of ds) {
      const from = range(0, i - 1).filter(j => a[i] - a[j] === d)
      if (!from.length) continue
      const lens = from.map(j => (t.get(row(d), j) ?? 1) + 1)
      t.set(row(d), i, maxOf(lens), from.filter(j => t.get(row(d), j) !== null).map(j => [row(d), j]), (ways => (ways.length > 1 ? `max(${ways.join(', ')}) = max(${lens.join(', ')})` : t.get(row(d), from[0]) !== null ? `${ways[0]} = ${lens[0] - 1} + 1` : ways[0]))(from.map(j => (t.get(row(d), j) !== null ? `A(${j},${d}) + 1` : `the pair ${j}, ${i}: 2`))))
    }
    return { title: `Values ${list(a)}`, setup: 'A(i, d): the longest arithmetic subsequence ending at i with step d. Each earlier j with a[i] − a[j] = d continues j’s subsequence of step d, or starts the pair j, i (length 2). Empty cells: no subsequence ends there with that step. The answer is the largest A.', table: t, answer: bestCell(t), args: [a] }
  },
  'alternating-subsequence': ({ values: a = [1, 17, 5, 10, 13, 15, 10, 5, 16, 8] } = {}) => {
    const t = table(['up(i)', 'down(i)'], a.map((v, i) => `${i} (${v})`), (r, c) => `${r ? 'down' : 'up'}(${c})`)
    for (let i = 0; i < a.length; i++) {
      const lower = range(0, i - 1).filter(j => a[j] < a[i]), higher = range(0, i - 1).filter(j => a[j] > a[i])
      const u = lower.length ? maxOf(lower.map(j => t.get(1, j))) : 0, d = higher.length ? maxOf(higher.map(j => t.get(0, j))) : 0
      t.set(0, i, 1 + u, lower.map(j => [1, j]), lower.length ? `rise from a smaller value whose wiggle fell: 1 + max(${lower.map(j => `down(${j})`).join(', ')}) = 1 + ${u}` : 'nothing smaller before it: 1')
      t.set(1, i, 1 + d, higher.map(j => [0, j]), higher.length ? `fall from a larger value whose wiggle rose: 1 + max(${higher.map(j => `up(${j})`).join(', ')}) = 1 + ${d}` : 'nothing larger before it: 1')
    }
    return { title: `Values ${list(a)}`, setup: 'up(i): the longest wiggle ending at i with a rise; down(i): ending with a fall. A rise into i follows a wiggle that fell into a smaller value, and the other way round. The answer is the largest cell.', table: t, answer: bestCell(t), args: [a] }
  },
  'divisible-subset': ({ values: v = [3, 4, 16, 8] } = {}) => {
    const a = [...v].sort((x, y) => x - y)
    const t = table([''], a.map((x, i) => `${i} (${x})`), (r, c) => `D(${c})`)
    for (let i = 0; i < a.length; i++) {
      const from = range(0, i - 1).filter(j => a[i] % a[j] === 0), best = from.length ? maxOf(from.map(j => t.get(0, j))) : 0
      t.set(0, i, 1 + best, from.map(j => [0, j]), from.length ? `divides ${a[i]}: 1 + max(${from.map(j => `D(${j})`).join(', ')}) = 1 + ${best}` : `nothing smaller divides ${a[i]}: 1`)
    }
    return { title: `Values ${list(a)} (sorted)`, setup: 'Sorted, a subset where every pair divides is a chain, each value dividing the next. D(i): the largest chain topped by value i. If a[j] divides a[i], everything below a[j] in its chain does too. The answer is the largest D.', table: t, answer: bestCell(t), args: [v] }
  },
  // Scheduling and trading.
  'weighted-intervals': ({ jobs = [[0, 3, 4], [1, 4, 3], [3, 5, 5], [4, 7, 6], [5, 8, 2]] } = {}) => {
    const js = [...jobs].sort((x, y) => x[1] - y[1]), n = js.length
    const t = table([''], ['none', ...js.map(([s, e, v], i) => `${i + 1} [${s},${e}) ${v}`)], (r, c) => `D(${c})`)
    t.seed(0, 0, 0, 'D(0) = 0: no jobs, no value')
    for (let i = 1; i <= n; i++) {
      const [s, , v] = js[i - 1], p = js.slice(0, i - 1).filter(x => x[1] <= s).length
      const skip = t.get(0, i - 1), take = v + t.get(0, p)
      t.set(0, i, Math.max(skip, take), [[0, i - 1], [0, p]], `max(skip: D(${i - 1}), take: ${v} + D(${p})) = max(${skip}, ${take}), where ${p ? `jobs 1 … ${p} end by ${s}` : `no job ends by ${s}`}`)
    }
    return { title: `Jobs [start, end) value: ${js.map(([s, e, v]) => `[${s},${e}) ${v}`).join(', ')}`, setup: 'Sorted by end time. D(i): the best value from the first i jobs. Skip job i, or take it and add the best from the jobs that end by its start, which are the first p(i).', table: t, answer: [0, n], args: [jobs] }
  },
  'deadline-scheduling': ({ jobs = [[2, 5, 3], [1, 3, 2], [2, 4, 4]] } = {}) => {
    const js = [...jobs].sort((x, y) => x[2] - y[2]), n = js.length, T = Math.max(...js.map(j => j[2]))
    const t = table(['none', ...js.map(([d, r, dl], i) => `${i + 1} (${d}h, ${r}, by ${dl})`)], range(0, T).map(x => `t=${x}`), (r, c) => `D(${r},${c})`)
    t.seed(0, 0, 0, 'D(0,0) = 0: no jobs, no time used')
    for (let x = 1; x <= T; x++) t.seed(0, x, -INF, 'D(0,t) = −∞: no jobs cannot use time t > 0')
    for (let i = 1; i <= n; i++) for (let x = 0; x <= T; x++) {
      const [d, r, dl] = js[i - 1], skip = t.get(i - 1, x)
      if (x >= d && x <= dl) t.set(i, x, Math.max(skip, r + t.get(i - 1, x - d)), [[i - 1, x], [i - 1, x - d]], `max(skip: D(${i - 1},${x}), run it to finish at ${x}: ${r} + D(${i - 1},${x - d})) = max(${show(skip)}, ${show(r + t.get(i - 1, x - d))})`)
      else t.set(i, x, skip, [[i - 1, x]], `${x < d ? `it needs ${d}h` : `finishing at ${x} misses its deadline ${dl}`}, so skip it: D(${i - 1},${x}) = ${show(skip)}`)
    }
    return { title: `Jobs (hours, reward, deadline): ${js.map(([d, r, dl]) => `(${d}, ${r}, ${dl})`).join(', ')}`, setup: 'Sorted by deadline. D(i, t): the most reward from the first i jobs using exactly t hours. Job i is skipped, or run last so it finishes at t, which must be by its deadline. The answer is the best cell in the last row.', table: t, answer: bestInRow(t, n), args: [jobs] }
  },
  'stock-states': ({ prices: p = [7, 1, 5, 3, 6, 4] } = {}) => {
    const t = table(['cash', 'hold'], ['start', ...p.map((x, d) => `day ${d + 1} (${x})`)], (r, c) => `${r ? 'hold' : 'cash'}(${c})`)
    t.seed(0, 0, 0, 'cash(0) = 0: you start with no share'); t.seed(1, 0, -INF, 'hold(0) = −∞: no share can be held before any price')
    p.forEach((x, k) => {
      const d = k + 1, c = t.get(0, d - 1), h = t.get(1, d - 1)
      t.set(0, d, Math.max(c, h + x), [[0, d - 1], [1, d - 1]], `max(wait: cash(${d - 1}), sell: hold(${d - 1}) + ${x}) = max(${show(c)}, ${show(h + x)})`)
      t.set(1, d, Math.max(h, c - x), [[1, d - 1], [0, d - 1]], `max(wait: hold(${d - 1}), buy: cash(${d - 1}) − ${x}) = max(${show(h)}, ${show(c - x)})`)
    })
    return { title: `Prices ${list(p)}`, setup: 'Each day has two states: cash, the most money with no share held, and hold, the most with one share. Sell moves hold to cash (+ price); buy moves cash to hold (− price); both read yesterday. The answer is cash after the last day.', table: t, answer: [0, p.length], args: [p] }
  },
  'stock-k': ({ prices: p = [3, 3, 5, 0, 0, 3, 1, 4], k = 2 } = {}) => {
    const t = table(range(0, k).flatMap(x => [`cash, ${x} done`, `hold, ${x} done`]), ['start', ...p.map((x, d) => `day ${d + 1} (${x})`)], (r, c) => `${r % 2 ? 'hold' : 'cash'}[${r >> 1}](${c})`)
    for (let x = 0; x <= k; x++) { t.seed(2 * x, 0, x ? -INF : 0, 'cash[0](0) = 0; every other start = −∞: no share held, no trade done'); t.seed(2 * x + 1, 0, -INF, 'cash[0](0) = 0; every other start = −∞: no share held, no trade done') }
    p.forEach((v, i) => {
      const d = i + 1
      for (let x = 0; x <= k; x++) {
        const c = t.get(2 * x, d - 1), h = t.get(2 * x + 1, d - 1)
        if (x === 0) t.set(0, d, c, [[0, d - 1]], `no trade done means no sale: cash[0](${d - 1}) = 0`)
        else { const hp = t.get(2 * x - 1, d - 1); t.set(2 * x, d, Math.max(c, hp + v), [[2 * x, d - 1], [2 * x - 1, d - 1]], `max(wait: cash[${x}](${d - 1}), sell trade ${x}: hold[${x - 1}](${d - 1}) + ${v}) = max(${show(c)}, ${show(hp + v)})`) }
        t.set(2 * x + 1, d, Math.max(h, c - v), [[2 * x + 1, d - 1], [2 * x, d - 1]], `max(wait: hold[${x}](${d - 1}), buy: cash[${x}](${d - 1}) − ${v}) = max(${show(h)}, ${show(c - v)})`)
      }
    })
    let best = [0, p.length]
    for (let x = 1; x <= k; x++) if (t.get(2 * x, p.length) > t.get(...best)) best = [2 * x, p.length]
    return { title: `Prices ${list(p)}, at most ${k} trade${k > 1 ? 's' : ''}`, setup: 'cash[t] and hold[t]: the best money with t trades completed, holding no share or one. Buying keeps t; selling completes a trade and moves to t + 1. The answer is the best cash in the last column: fewer trades may be better.', table: t, answer: best, args: [p, k] }
  },
  'stock-cooldown': ({ prices: p = [1, 2, 3, 0, 2], fee = 0 } = {}) => {
    const t = table(['hold', 'sold', 'rest'], ['start', ...p.map((x, d) => `day ${d + 1} (${x})`)], (r, c) => `${['hold', 'sold', 'rest'][r]}(${c})`)
    t.seed(0, 0, -INF, 'hold(0) = sold(0) = −∞: nothing bought or sold yet'); t.seed(1, 0, -INF, 'hold(0) = sold(0) = −∞: nothing bought or sold yet'); t.seed(2, 0, 0, 'rest(0) = 0: free to buy')
    p.forEach((x, k) => {
      const d = k + 1, h = t.get(0, d - 1), s = t.get(1, d - 1), r = t.get(2, d - 1)
      t.set(0, d, Math.max(h, r - x), [[0, d - 1], [2, d - 1]], `max(keep: hold(${d - 1}), buy from rest: rest(${d - 1}) − ${x}) = max(${show(h)}, ${show(r - x)})`)
      t.set(1, d, h + x - fee, [[0, d - 1]], `sell what was held: hold(${d - 1}) + ${x}${fee ? ` − fee ${fee}` : ''} = ${show(h)} + ${x}${fee ? ` − ${fee}` : ''}`)
      t.set(2, d, Math.max(r, s), [[2, d - 1], [1, d - 1]], `max(keep resting: rest(${d - 1}), yesterday’s sale cools down: sold(${d - 1})) = max(${show(r)}, ${show(s)})`)
    })
    const n = p.length, answer = t.get(1, n) > t.get(2, n) ? [1, n] : [2, n]
    return { title: `Prices ${list(p)}, one day’s cooldown${fee ? `, fee ${fee}` : ''}`, setup: 'Three states a day: hold (a share), sold (sold today, so tomorrow you cannot buy), and rest (free to buy). Buying reads only yesterday’s rest, never yesterday’s sold: that is the cooldown. The answer is the better of sold and rest on the last day.', table: t, answer, args: [p, 1, fee], input: { prices: p, fee } }
  },
  'batch-scheduling': ({ lengths: a = [2, 1, 1, 2], setup = 4 } = {}) => {
    const n = a.length, prefix = [0]
    a.forEach(x => prefix.push(prefix.at(-1) + x))
    const t = table([''], range(0, n).map(i => (i ? `${i} (${a[i - 1]})` : '0')), (r, c) => `D(${c})`)
    t.seed(0, 0, 0, 'D(0) = 0: no jobs, no batch')
    for (let i = 1; i <= n; i++) {
      const js = range(0, i - 1), costs = js.map(j => t.get(0, j) + setup + (prefix[i] - prefix[j]) ** 2)
      t.set(0, i, minOf(costs), js.map(j => [0, j]), `min(${js.map(j => `D(${j}) + ${setup} + ${prefix[i] - prefix[j]}²`).join('; ')}) = min(${costs.join(', ')})`)
    }
    return { title: `Jobs ${list(a)}, setup ${setup}`, setup: `D(i): the cheapest way to run the first i jobs in batches. The last batch runs jobs j … i − 1 and costs the setup, ${setup}, plus its total length squared.`, table: t, answer: [0, n], args: [a, setup] }
  },
  'text-justification': ({ words: w = [3, 2, 2, 5], width = 6 } = {}) => {
    const n = w.length, len = (j, i) => w.slice(j, i).reduce((s, x) => s + x, 0) + (i - j - 1)
    const t = table([''], [...range(0, n).map(i => (i ? `${i} (${w[i - 1]})` : '0')), 'last line'], (r, c) => (c > n ? 'answer' : `D(${c})`))
    t.seed(0, 0, 0, 'D(0) = 0: no words, no lines')
    for (let i = 1; i <= n; i++) {
      const js = range(0, i - 1).filter(j => len(j, i) <= width), costs = js.map(j => t.get(0, j) + (width - len(j, i)) ** 2)
      t.set(0, i, minOf(costs), js.map(j => [0, j]), `min(${js.map(j => `words ${j + 1}–${i} (${len(j, i)} wide): D(${j}) + ${width - len(j, i)}²`).join('; ')}) = min(${costs.join(', ')})`)
    }
    const last = range(0, n - 1).filter(j => len(j, n) <= width)
    t.set(0, n + 1, minOf(last.map(j => t.get(0, j))), last.map(j => [0, j]), `the last line is free: min(${last.map(j => `D(${j})`).join(', ')}) = min(${last.map(j => t.get(0, j)).join(', ')})`)
    return { title: `Words of length ${list(w)}, width ${width}`, setup: 'D(i): the cheapest way to set the first i words when their lines are not the last. A line of words j … i − 1 is their lengths plus one space between each; it costs (width − that)². The last line is free, so the answer picks where it starts.', table: t, answer: [0, n + 1], args: [w, width] }
  },
  // Three tables in one: rows M, X and Y for each prefix of a. M ends with a letter pair, X with a's
  // letter against a gap, Y with b's letter against a gap. A gap run costs open, then extend per letter.
  'affine-gap': ({ a = 'acca', b = 'aa', mismatch = 3, open = 3, extend = 1 } = {}) => {
    const n = a.length, m = b.length, K = ['M', 'X', 'Y'], at = (k, i) => 3 * i + k
    const t = table([...range(0, n).flatMap(i => K.map(k => `${k} ${i ? `${i} ${a[i - 1]}` : '∅'}`)), 'best'], ['∅', ...b.split('').map((ch, j) => `${j + 1} ${ch}`)], (r, c) => (r === 3 * (n + 1) ? 'best' : `${K[r % 3]}(${Math.floor(r / 3)},${c})`))
    const why = 'M(0,0) = 0; along the edges one gap run, open + extend · (length − 1); everything else ∞'
    for (let i = 0; i <= n; i++) {
      t.seed(at(0, i), 0, i ? INF : 0, why); t.seed(at(1, i), 0, i ? open + extend * (i - 1) : INF, why); t.seed(at(2, i), 0, INF, why)
    }
    for (let j = 1; j <= m; j++) { t.seed(at(0, 0), j, INF, why); t.seed(at(1, 0), j, INF, why); t.seed(at(2, 0), j, open + extend * (j - 1), why) }
    const v = (k, i, j) => t.get(at(k, i), j)
    eachPair(a, b, (i, j) => {
      const pay = a[i - 1] === b[j - 1] ? 0 : mismatch, prev = [0, 1, 2].map(k => v(k, i - 1, j - 1))
      t.set(at(0, i), j, pay + minOf(prev), [0, 1, 2].map(k => [at(k, i - 1), j - 1]), `${a[i - 1] === b[j - 1] ? 'match 0' : `mismatch ${mismatch}`} + min(M, X, Y at (${i - 1},${j - 1})) = ${pay} + min(${prev.map(show).join(', ')})`)
      const x = [v(0, i - 1, j) + open, v(1, i - 1, j) + extend, v(2, i - 1, j) + open]
      t.set(at(1, i), j, minOf(x), [0, 1, 2].map(k => [at(k, i - 1), j]), `gap in b: min(open after M(${i - 1},${j}), extend X(${i - 1},${j}), open after Y(${i - 1},${j})) = min(${x.map(show).join(', ')})`)
      const y = [v(0, i, j - 1) + open, v(2, i, j - 1) + extend, v(1, i, j - 1) + open]
      t.set(at(2, i), j, minOf(y), [[at(0, i), j - 1], [at(2, i), j - 1], [at(1, i), j - 1]], `gap in a: min(open after M(${i},${j - 1}), extend Y(${i},${j - 1}), open after X(${i},${j - 1})) = min(${y.map(show).join(', ')})`)
    })
    const ends = [0, 1, 2].map(k => v(k, n, m))
    t.set(3 * (n + 1), m, minOf(ends), [0, 1, 2].map(k => [at(k, n), m]), `min(M(${n},${m}), X(${n},${m}), Y(${n},${m})) = min(${ends.map(show).join(', ')})`)
    return { title: `“${a}” and “${b}”: mismatch ${mismatch}, gap ${open} to open, ${extend} to extend`, setup: 'Three values per cell, by what the alignment’s last column is: M a letter pair, X a’s letter against a gap, Y b’s letter against a gap. A gap continues cheaply (extend) only from the same kind of column; from any other it opens. The answer is the best of the three at the end.', table: t, answer: [3 * (n + 1), m], args: [a, b, mismatch, open, extend] }
  },
  'segmented-regression': ({ ys = [0, 1, 2, 10, 11, 12], penalty = 3 } = {}) => {
    const n = ys.length, E = (j, i) => Math.round(lineError(ys.slice(j, i).map((y, k) => [j + k, y])) * 1e9) / 1e9
    const t = table([''], range(0, n).map(i => (i ? `${i} (y ${ys[i - 1]})` : '0')), (r, c) => `D(${c})`)
    t.seed(0, 0, 0, 'D(0) = 0: no points, no segments')
    for (let i = 1; i <= n; i++) {
      const js = range(0, i - 1), costs = js.map(j => Math.round((t.get(0, j) + E(j, i) + penalty) * 1e9) / 1e9)
      t.set(0, i, minOf(costs), js.map(j => [0, j]), `min over j of D(j) + E(j,${i}) + ${penalty}: ${js.map(j => `${t.get(0, j)} + ${show(E(j, i))} + ${penalty}`).join('; ')} = min(${costs.map(show).join(', ')})`)
    }
    return { title: `Points y = ${list(ys)} at x = 0, 1, 2, …; ${penalty} per segment`, setup: 'D(i): the cheapest fit of the first i points by straight segments. The last segment covers points j … i − 1 and costs its least-squares error E(j, i), worked out from the points alone, plus the penalty for one more segment. Two points or fewer fit a line exactly.', table: t, answer: [0, n], args: [ys, penalty] }
  },
  // Three indices: the third one stacks copies of a 2-D table (layers) one under another, so a cell's
  // arrows can reach into another layer.
  'grid-resources': ({ grid: g = [[0, 1, 0], [0, 0, 1], [1, 0, 0]], budget: B = 1 } = {}) => {
    const R = g.length, C = g[0].length, row = (b, r) => b * R + r
    const t = table([...range(0, B).flatMap(b => range(0, R - 1).map(r => `b=${b} · row ${r}`)), 'total'], range(0, C - 1).map(c => `col ${c}`), (x, c) => (x === R * (B + 1) ? 'total' : `N(${x % R},${c},${Math.floor(x / R)})`))
    for (let b = 0; b <= B; b++) t.seed(row(b, 0), 0, b === g[0][0] ? 1 : 0, `N(0,0,b) = 1 only for b = the start’s own toll, ${g[0][0]}`)
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (let b = 0; b <= B; b++) {
      if (!r && !c) continue
      const toll = g[r][c]
      if (b < toll) { t.set(row(b, r), c, 0, [], `entering costs ${toll}, more than b = ${b}: 0`); continue }
      const from = [...(r ? [[r - 1, c]] : []), ...(c ? [[r, c - 1]] : [])]
      t.set(row(b, r), c, from.reduce((s, [pr, pc]) => s + t.get(row(b - toll, pr), pc), 0), from.map(([pr, pc]) => [row(b - toll, pr), pc]), `${toll ? `toll 1, so the paths that had paid ${b - toll}: ` : 'no toll: '}${from.map(([pr, pc]) => `N(${pr},${pc},${b - toll})`).join(' + ')} = ${from.map(([pr, pc]) => t.get(row(b - toll, pr), pc)).join(' + ')}`)
    }
    const ends = range(0, B).map(b => [row(b, R - 1), C - 1])
    t.set(R * (B + 1), C - 1, ends.reduce((s, at) => s + t.get(...at), 0), ends, `every budget up to ${B}: ${ends.map(at => t.name(...at)).join(' + ')} = ${ends.map(at => t.get(...at)).join(' + ')}`)
    return { title: `Tolls ${rowsOf(g)}, budget ${B}`, setup: 'N(r, c, b): the number of paths to (r, c) that have paid exactly b tolls. One layer per b, stacked. Entering a cell with toll 1 moves a path up one layer, so its arrows come from the layer above. The answer adds the end cell over every layer.', table: t, answer: [R * (B + 1), C - 1], args: [g, B] }
  },
  'grid-direction': ({ grid: g = [[0, 1, 1], [3, 0, 0], [2, 1, 0]], turn = 2 } = {}) => {
    const R = g.length, C = g[0].length, row = (d, r) => 2 * r + d, D = ['→', '↓']
    const t = table([...range(0, R - 1).flatMap(r => [`row ${r} →`, `row ${r} ↓`]), 'best'], range(0, C - 1).map(c => `col ${c}`), (x, c) => (x === 2 * R ? 'best' : `D(${x >> 1},${c},${x % 2 ? 'down' : 'right'})`))
    for (let c = 1; c < C; c++) t.seed(row(1, 0), c, INF, 'D(0,c,down) = D(r,0,right) = ∞: no move arrives that way')
    for (let r = 1; r < R; r++) t.seed(row(0, r), 0, INF, 'D(0,c,down) = D(r,0,right) = ∞: no move arrives that way')
    if (C > 1) t.seed(row(0, 0), 1, g[0][1], 'the first move pays no turn: one step right costs g(0,1), one step down g(1,0)')
    if (R > 1) t.seed(row(1, 1), 0, g[1][0], 'the first move pays no turn: one step right costs g(0,1), one step down g(1,0)')
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const d of [0, 1]) {
      const [pr, pc] = d ? [r - 1, c] : [r, c - 1]
      if (pr < 0 || pc < 0 || (!pr && !pc) || t.get(row(d, r), c) !== null) continue
      const same = t.get(row(d, pr), pc), other = t.get(row(1 - d, pr), pc)
      t.set(row(d, r), c, g[r][c] + Math.min(same, other + turn), [[row(d, pr), pc], [row(1 - d, pr), pc]], `${g[r][c]} + min(straight ${D[d]}: ${t.name(row(d, pr), pc)}, turn: ${t.name(row(1 - d, pr), pc)} + ${turn}) = ${g[r][c]} + min(${show(same)}, ${show(other + turn)})`)
    }
    const ends = [row(0, R - 1), row(1, R - 1)].map(x => [x, C - 1])
    t.set(2 * R, C - 1, minOf(ends.map(at => t.get(...at))), ends, `arrive either way: min(${ends.map(at => t.name(...at)).join(', ')}) = min(${ends.map(at => show(t.get(...at))).join(', ')})`)
    return { title: `Costs ${rowsOf(g)}, turn fee ${turn}`, setup: 'D(r, c, d): the cheapest cost to reach (r, c) with the last move going d, right (→) or down (↓). Each grid row has a → row and a ↓ row. Going on in the same direction is free; switching pays the turn fee.', table: t, answer: [2 * R, C - 1], args: [g, turn] }
  },
  'grid-multiagent': ({ grid: g = [[1, 0, 1], [2, 9, 3], [4, 1, 5]] } = {}) => {
    const R = g.length, C = g[0].length, row = (r, a) => r * C + a
    const t = table(range(0, R - 1).flatMap(r => range(0, C - 1).map(a => `row ${r} · a=${a}`)), range(0, C - 1).map(b => `b=${b}`), (x, b) => `D(${Math.floor(x / C)},${x % C},${b})`)
    const here = (r, a, b) => (a === b ? g[r][a] : g[r][a] + g[r][b])
    for (let a = 0; a < C; a++) for (let b = 0; b < C; b++) t.seed(row(R - 1, a), b, here(R - 1, a, b), 'the bottom row: v(a) + v(b), or v(a) once when a = b')
    for (let r = R - 2; r >= 0; r--) for (let a = 0; a < C; a++) for (let b = 0; b < C; b++) {
      const moves = [a - 1, a, a + 1].filter(x => x >= 0 && x < C).flatMap(x => [b - 1, b, b + 1].filter(y => y >= 0 && y < C).map(y => [row(r + 1, x), y]))
      const best = maxOf(moves.map(at => t.get(...at)))
      t.set(row(r, a), b, here(r, a, b) + best, moves, `${a === b ? `one cell, counted once: ${g[r][a]}` : `${g[r][a]} + ${g[r][b]}`} + the best of ${moves.length} move pairs, ${best}`)
    }
    return { title: `Grid ${rowsOf(g)}`, setup: 'D(r, a, b): the best total from row r down, with one robot in column a and the other in column b. One a-by-b layer per grid row, filled from the bottom up. Each cell reads up to 9 cells in the layer below; a cell both robots share counts once.', table: t, answer: [0, C - 1], args: [g] }
  },
  'multidimensional-knapsack': ({ items = [[2, 1, 3], [3, 2, 4], [4, 3, 6]], weight: W = 5, volume: U = 3 } = {}) => {
    const n = items.length, row = (i, w) => i * (W + 1) + w
    const t = table(range(0, n).flatMap(i => range(0, W).map(w => `${i ? `item ${i}` : 'none'} · w≤${w}`)), range(0, U).map(u => `vol≤${u}`), (x, u) => `D(${Math.floor(x / (W + 1))},${x % (W + 1)},${u})`)
    for (let w = 0; w <= W; w++) for (let u = 0; u <= U; u++) t.seed(row(0, w), u, 0, 'D(0,w,u) = 0: no items, no value')
    for (let i = 1; i <= n; i++) for (let w = 0; w <= W; w++) for (let u = 0; u <= U; u++) {
      const [wi, ui, vi] = items[i - 1], skip = t.get(row(i - 1, w), u)
      if (wi <= w && ui <= u) t.set(row(i, w), u, Math.max(skip, vi + t.get(row(i - 1, w - wi), u - ui)), [[row(i - 1, w), u], [row(i - 1, w - wi), u - ui]], `max(out: D(${i - 1},${w},${u}), in: ${vi} + D(${i - 1},${w - wi},${u - ui})) = max(${skip}, ${vi + t.get(row(i - 1, w - wi), u - ui)})`)
      else t.set(row(i, w), u, skip, [[row(i - 1, w), u]], `item ${i} (weight ${wi}, volume ${ui}) does not fit: D(${i - 1},${w},${u}) = ${skip}`)
    }
    return { title: `Items (weight, volume, value) ${items.map(x => `(${x.join(', ')})`).join(', ')}; limits ${W} and ${U}`, setup: 'D(i, w, u): the best value from the first i items with weight at most w and volume at most u. One w-by-u layer per item, stacked. Taking item i reads the layer above, shifted by its weight and its volume.', table: t, answer: [row(n, W), U], args: [items, W, U] }
  },
  'group-knapsack': ({ groups: G = [[[2, 5], [3, 7]], [[1, 4]], [[2, 3], [1, 2]]], capacity: cap = 4 } = {}) => {
    const t = table(['none', ...G.map((g, i) => `group ${i + 1}: ${g.map(([w, v]) => `${w}/${v}`).join(', ')}`)], range(0, cap).map(c => `${c}`), (g, c) => `D(${g},${c})`)
    for (let c = 0; c <= cap; c++) t.seed(0, c, 0, 'D(0,c) = 0: no groups, no value')
    G.forEach((opts, k) => {
      const g = k + 1
      for (let c = 0; c <= cap; c++) {
        const fit = opts.filter(([w]) => w <= c), takes = fit.map(([w, v]) => v + t.get(g - 1, c - w))
        t.set(g, c, Math.max(t.get(g - 1, c), ...takes), [[g - 1, c], ...fit.map(([w]) => [g - 1, c - w])], `max(none: D(${g - 1},${c})${fit.map(([w, v]) => `, ${w}/${v}: ${v} + D(${g - 1},${c - w})`).join('')}) = max(${[t.get(g - 1, c), ...takes].join(', ')})`)
      }
    })
    return { title: `Groups (weight/value) and capacity ${cap}`, setup: 'D(g, c): the best value from the first g groups within capacity c, taking at most one option from each group. Every option of group g reads the row above only, so two options of one group can never both get in.', table: t, answer: [G.length, cap], args: [G, cap] }
  },
  'remove-boxes': ({ boxes: a = [2, 1, 2, 1, 2] } = {}) => {
    const n = a.length, row = (k, l) => k * n + l
    const t = table(range(0, n - 1).flatMap(k => range(0, n - 1).map(l => `k=${k} · ${l} (${a[l]})`)), a.map((v, r) => `${r} (${v})`), (x, r) => `D(${x % n},${r},${Math.floor(x / n)})`)
    const D = (l, r, k) => (l > r ? ['0', 0, []] : [`D(${l},${r},${k})`, t.get(row(k, l), r), [[row(k, l), r]]])
    for (let len = 0; len < n; len++) for (let l = 0; l + len < n; l++) {
      const r = l + len
      for (let k = 0; k <= n - 1 - r; k++) {
        const now = D(l, r - 1, 0), opts = [{ text: `remove ${k + 1} box${k ? 'es' : ''} now: ${(k + 1) ** 2} + ${now[0]}`, value: (k + 1) ** 2 + now[1], reads: now[2] }]
        for (let m = l; m < r; m++) if (a[m] === a[r]) {
          const mid = D(m + 1, r - 1, 0), keep = D(l, m, k + 1)
          opts.push({ text: `save them for box ${m}: ${mid[0]} + ${keep[0]}`, value: mid[1] + keep[1], reads: [...mid[2], ...keep[2]] })
        }
        t.set(row(k, l), r, maxOf(opts.map(o => o.value)), opts.flatMap(o => o.reads), opts.length > 1 ? `max(${opts.map(o => o.text).join('; ')}) = max(${opts.map(o => o.value).join(', ')})` : `${opts[0].text} = ${opts[0].value}`)
      }
    }
    return { title: `Boxes ${list(a)}`, setup: 'D(l, r, k): the most points from boxes l … r with k more boxes of box r’s colour waiting to its right. One interval table per k, stacked. Box r’s group (k + 1 boxes) is removed now, or saved: clear the boxes between it and an earlier box m of the same colour, and carry k + 1 to m.', table: t, answer: [0, n - 1], args: [a] }
  },
}

// The squared error of the least-squares straight line through points [x, y] (0 for two points or fewer).
function lineError(pts) {
  if (pts.length < 3) return 0
  const n = pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n
  const sxx = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0), sxy = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0)
  return pts.reduce((s, [x, y]) => s + (y - (my + (sxy / sxx) * (x - mx))) ** 2, 0)
}

const OPS = { '&': 'and', '|': 'or', '^': 'xor' }
const isPal = w => w === [...w].reverse().join('')
// An expression typed as text: symbols (or digits) at even places, operators between them.
const alternates = (syms, opChars) => i => ([...i.expr].every((c, k) => (k % 2 ? opChars : syms).includes(c)) && i.expr.length % 2 ? null : `Alternate ${syms === 'TF' ? 'T or F' : 'a digit'} and an operator (${[...opChars].join(' ')}), starting and ending with ${syms === 'TF' ? 'T or F' : 'a digit'}.`)
const expression = (syms, opChars, most) => r => Array.from({ length: 2 * r(2, most) - 1 }, (_, k) => (k % 2 ? opChars : syms)[r(0, (k % 2 ? opChars : syms).length - 1)]).join('')

// What the learner may change in each trace. Field kinds: int, ints (a list), text (letters matching
// `chars`), words, grid (rows of 0/1), matrix (rows of numbers), triangle (row r has r + 1 numbers).
// `rule` checks what the fields can't check alone and returns a message, or null when the input is fine.
const int = (key, label, min, max) => ({ key, label, kind: 'int', min, max })
const ints = (key, label, min, max, len) => ({ key, label, kind: 'ints', min, max, len })
const text = (key, label, chars, len) => ({ key, label, kind: 'text', chars, len })
const values = (min = 0, max = 99, len = [1, 10]) => [ints('values', 'Values', min, max, len)]
const sameLength = i => (i.weights.length === i.values.length ? null : 'Give one value for each weight.')
const distinct = key => i => (new Set(i[key]).size === i[key].length ? null : `Use each ${key === 'coins' ? 'coin' : 'step size'} once.`)
export const INPUTS = {
  fibonacci: { fields: [int('n', 'n', 2, 15)] },
  stairs: { fields: [int('n', 'Height', 1, 15), ints('steps', 'Step sizes', 1, 6, [1, 4])], rule: distinct('steps') },
  'min-cost-stairs': { fields: [ints('costs', 'Costs', 0, 99, [1, 10])] },
  'house-robber': { fields: values() },
  'max-subarray': { fields: values(-99, 99) },
  'max-product': { fields: values(-9, 9, [1, 8]) },
  'decode-ways': { fields: [text('s', 'Digits', '0-9', [1, 10])] },
  'word-break': {
    fields: [text('s', 'Text', 'a-z', [1, 12]), { key: 'words', label: 'Words', kind: 'words', len: [1, 6] }],
    // Text made of the words, with one letter changed half the time, so both answers come up.
    random: r => {
      const words = [['cat', 'cats', 'and', 'sand', 'dog'], ['a', 'ab', 'abc', 'cd', 'bcd'], ['go', 'goal', 'al', 'pal', 'pa']][r(0, 2)]
      let s = Array.from({ length: r(1, 3) }, () => words[r(0, words.length - 1)]).join('').slice(0, 12)
      if (r(0, 1)) { const k = r(0, s.length - 1); s = s.slice(0, k) + (s[k] === 'a' ? 'o' : 'a') + s.slice(k + 1) }
      return { s, words }
    },
  },
  'word-break-count': { fields: [text('s', 'Text', 'a-z', [1, 12]), { key: 'words', label: 'Words', kind: 'words', len: [1, 6] }] },
  'grid-paths': { fields: [int('rows', 'Rows', 1, 7), int('cols', 'Columns', 1, 8)] },
  'obstacle-paths': { fields: [{ key: 'grid', label: 'Grid (1 = blocked)', kind: 'grid', rows: [1, 7], cols: [1, 8] }] },
  'min-grid-path': { fields: [{ key: 'grid', label: 'Costs', kind: 'matrix', min: 0, max: 9, rows: [1, 6], cols: [1, 7] }] },
  'triangle-path': { fields: [{ key: 'triangle', label: 'Triangle', kind: 'triangle', min: 0, max: 9, rows: [1, 6] }] },
  'max-square': { fields: [{ key: 'grid', label: 'Grid of 0s and 1s', kind: 'grid', rows: [1, 7], cols: [1, 8] }] },
  'zero-one-knapsack': { fields: [ints('weights', 'Weights', 1, 9, [1, 5]), ints('values', 'Values', 0, 20, [1, 5]), int('capacity', 'Capacity', 0, 12)], rule: sameLength },
  'unbounded-knapsack': { fields: [ints('weights', 'Weights', 1, 9, [1, 4]), ints('values', 'Values', 0, 20, [1, 4]), int('capacity', 'Capacity', 0, 14)], rule: sameLength },
  'subset-sum': { fields: [ints('values', 'Values', 1, 9, [1, 6]), int('target', 'Target', 0, 14)] },
  'coin-min': { fields: [ints('coins', 'Coins', 1, 9, [1, 4]), int('amount', 'Amount', 0, 14)], rule: distinct('coins') },
  'coin-combinations': { fields: [ints('coins', 'Coins', 1, 9, [1, 4]), int('amount', 'Amount', 0, 14)], rule: distinct('coins') },
  'coin-permutations': { fields: [ints('coins', 'Coins', 1, 9, [1, 4]), int('amount', 'Amount', 0, 14)], rule: distinct('coins') },
  'rod-cutting': { fields: [ints('prices', 'Prices by length', 0, 30, [1, 6]), int('n', 'Rod length', 1, 14)] },
  binomial: { fields: [int('n', 'n', 1, 10), int('k', 'k', 0, 10)], rule: i => (i.k <= i.n ? null : 'k can be at most n.') },
  'integer-partitions': { fields: [int('n', 'n', 1, 10)] },
  catalan: { fields: [int('n', 'Pairs', 1, 12)] },
  'balanced-parentheses': { fields: [text('s', 'Pattern', '()?', [1, 10])] },
  derangements: { fields: [int('n', 'Letters', 2, 12)] },
  stirling: { fields: [int('n', 'n', 1, 8), int('k', 'k', 0, 8)], rule: i => (i.k <= i.n ? null : 'k can be at most n.') },
  'inversion-counting': { fields: [int('n', 'n', 1, 5), int('k', 'k', 0, 10)], rule: i => (i.k <= (i.n * (i.n - 1)) / 2 ? null : `With n = ${i.n} there are at most ${(i.n * (i.n - 1)) / 2} inversions.`) },
  'circular-selection': { fields: values(0, 99, [1, 9]) },
  'activity-selection': { fields: [{ key: 'rewards', label: 'Rewards (one row per day)', kind: 'matrix', min: -9, max: 20, rows: [1, 6], cols: [2, 4] }] },
  'bounded-knapsack': { fields: [ints('weights', 'Weights', 1, 6, [1, 4]), ints('values', 'Values', 0, 9, [1, 4]), ints('counts', 'Copies of each', 0, 3, [1, 4]), int('capacity', 'Capacity', 0, 12)], rule: i => (i.weights.length === i.values.length && i.values.length === i.counts.length ? null : 'Give one value and one count for each weight.') },
  'equal-partition': { fields: [ints('values', 'Values', 1, 8, [1, 5])] },
  'target-signs': { fields: [ints('values', 'Values', 0, 4, [1, 4]), int('target', 'Target', -16, 16)], rule: i => { const s = i.values.reduce((x, y) => x + y, 0); return Math.abs(i.target) <= s ? null : `With these values the total can only be from −${s} to ${s}.` } },
  'exact-capacity': { fields: [ints('weights', 'Weights', 1, 9, [1, 5]), ints('values', 'Values', 0, 20, [1, 5]), int('capacity', 'Capacity to fill', 0, 12)], rule: sameLength },
  'value-knapsack': { fields: [ints('weights', 'Weights', 1, 12, [1, 5]), ints('values', 'Values', 0, 4, [1, 5]), int('capacity', 'Capacity', 0, 30)], rule: sameLength },
  lcs: { fields: [text('a', 'First', 'a-z', [1, 8]), text('b', 'Second', 'a-z', [1, 10])] },
  'edit-distance': { fields: [text('a', 'From', 'a-z', [1, 8]), text('b', 'To', 'a-z', [1, 10])] },
  'lcs-reconstruct': { fields: [text('a', 'First', 'a-z', [1, 7]), text('b', 'Second', 'a-z', [1, 7])] },
  lis: { fields: values(0, 99, [1, 12]) },
  'matrix-chain': { fields: [ints('dims', 'Sizes d₀, d₁, … (matrix i is dᵢ × dᵢ₊₁)', 1, 20, [3, 7])] },
  'burst-balloons': { fields: values(0, 9, [1, 6]) },
  'cut-stick': { fields: [int('n', 'Stick length', 10, 20), ints('cuts', 'Cut positions', 1, 9, [1, 5])], rule: i => (new Set(i.cuts).size === i.cuts.length ? null : 'Give each cut position once.') },
  'merge-stones': { fields: [ints('values', 'Pile sizes', 1, 9, [1, 6])] },
  'polygon-triangulation': { fields: [ints('values', 'Vertex weights, in order round the polygon', 1, 9, [3, 7])] },
  'palindrome-subsequence': { fields: [text('s', 'Text', 'a-z', [1, 9])] },
  'palindrome-substring': { fields: [text('s', 'Text', 'a-z', [1, 8])] },
  'palindrome-cuts': { fields: [text('s', 'Text', 'a-z', [1, 10])] },
  'optimal-bst': { fields: [ints('values', 'How often each key is searched', 1, 9, [1, 6])] },
  'strange-printer': { fields: [text('s', 'Text', 'a-z', [1, 7])] },
  'k-partitions': { fields: [ints('values', 'Items', 1, 9, [1, 7]), int('k', 'Segments', 1, 4)], rule: i => (i.k <= i.values.length ? null : 'Use at most one segment per item.') },
  'partition-max': { fields: [ints('values', 'Items', 1, 20, [1, 7]), int('k', 'Segments', 1, 4)], rule: i => (i.k <= i.values.length ? null : 'Use at most one segment per item.') },
  'boolean-parenthesization': { fields: [text('expr', 'Expression (T, F; & and, | or, ^ xor)', 'TF&|^', [1, 11])], rule: alternates('TF', '&|^'), random: r => ({ expr: expression('TF', '&|^', 5)(r) }) },
  'expression-extrema': { fields: [text('expr', 'Expression (digits; + − *)', '0-9+*-', [1, 11])], rule: alternates('0123456789', '+-*'), random: r => ({ expr: expression('0123456789', '+-*', 5)(r) }) },
  'common-substring': { fields: [text('a', 'First', 'a-z', [1, 8]), text('b', 'Second', 'a-z', [1, 8])] },
  'weighted-edit': { fields: [text('a', 'From', 'a-z', [1, 5]), text('b', 'To', 'a-z', [1, 5]), int('ins', 'Insert costs', 1, 9), int('del', 'Delete costs', 1, 9), int('sub', 'Substitute costs', 1, 9)] },
  damerau: { fields: [text('a', 'From', 'a-z', [1, 6]), text('b', 'To', 'a-z', [1, 6])] },
  'shortest-supersequence': { fields: [text('a', 'First', 'a-z', [1, 5]), text('b', 'Second', 'a-z', [1, 5])] },
  'distinct-subsequences': { fields: [text('s', 'Source', 'a-z', [1, 9]), text('target', 'Target', 'a-z', [1, 6])] },
  'unique-subsequences': { fields: [text('s', 'Text', 'a-z', [1, 12])] },
  interleaving: {
    fields: [text('a', 'a', 'a-z', [1, 5]), text('b', 'b', 'a-z', [1, 5]), text('c', 'c (to form)', 'a-z', [2, 10])],
    rule: i => (i.c.length === i.a.length + i.b.length ? null : `c needs ${i.a.length + i.b.length} letters: all of a and all of b.`),
    // A real interleaving of two random strings, with one letter changed half the time.
    random: r => {
      const word = () => Array.from({ length: r(1, 4) }, () => 'ab'[r(0, 1)]).join(''), a = word(), b = word()
      let i = 0, j = 0, c = ''
      while (i < a.length || j < b.length) c += j >= b.length || (i < a.length && r(0, 1)) ? a[i++] : b[j++]
      if (r(0, 1)) { const k = r(0, c.length - 1); c = c.slice(0, k) + (c[k] === 'a' ? 'b' : 'a') + c.slice(k + 1) }
      return { a, b, c }
    },
  },
  wildcard: {
    fields: [text('s', 'Text', 'a-z', [1, 8]), text('p', 'Pattern (? one letter, * any run)', 'a-z?*', [1, 8])],
    random: r => ({ s: Array.from({ length: r(1, 6) }, () => 'ab'[r(0, 1)]).join(''), p: Array.from({ length: r(1, 5) }, () => 'ab?**'[r(0, 4)]).join('') }),
  },
  regex: {
    fields: [text('s', 'Text', 'a-z', [1, 8]), text('p', 'Pattern (. one letter, x* any number of x)', 'a-z.*', [1, 8])],
    rule: i => (/^([a-z.]\*?)+$/.test(i.p) ? null : 'Each * must follow a letter or “.”, never another *.'),
    random: r => ({ s: Array.from({ length: r(1, 6) }, () => 'ab'[r(0, 1)]).join(''), p: Array.from({ length: r(1, 4) }, () => 'ab.'[r(0, 2)] + (r(0, 1) ? '*' : '')).join('') }),
  },
  'palindrome-count': { fields: [text('s', 'Text', 'a-z', [1, 8])] },
  'local-alignment': { fields: [text('a', 'First', 'a-z', [1, 5]), text('b', 'Second', 'a-z', [1, 5]), int('match', 'Match scores', 1, 5), int('mismatch', 'Mismatch costs', 0, 5), int('gap', 'Gap costs', 0, 5)] },
  'lis-count': { fields: values(0, 20, [1, 8]) },
  'weighted-lis': { fields: [ints('keys', 'Keys', 0, 20, [1, 7]), ints('weights', 'Weights', -9, 20, [1, 7])], rule: i => (i.keys.length === i.weights.length ? null : 'Give one weight for each key.') },
  bitonic: { fields: values(0, 20, [1, 9]) },
  'multidimensional-chains': { fields: [{ key: 'envelopes', label: 'Envelopes (width height; …)', kind: 'matrix', min: 1, max: 20, rows: [1, 7], cols: [2, 2] }] },
  'arithmetic-subsequence': { fields: values(0, 12, [2, 6]) },
  'alternating-subsequence': { fields: values(0, 20, [1, 10]) },
  'divisible-subset': { fields: [ints('values', 'Values', 1, 64, [1, 8])], rule: i => (new Set(i.values).size === i.values.length ? null : 'Use each value once.') },
  'weighted-intervals': {
    fields: [{ key: 'jobs', label: 'Jobs (start end value; …)', kind: 'matrix', min: 0, max: 20, rows: [1, 6], cols: [3, 3] }],
    rule: i => (i.jobs.every(([s, e]) => e > s) ? null : 'Each job must end after it starts.'),
    random: r => ({ jobs: Array.from({ length: r(2, 5) }, () => { const s = r(0, 6); return [s, s + r(1, 4), r(1, 9)] }) }),
  },
  'deadline-scheduling': {
    fields: [{ key: 'jobs', label: 'Jobs (hours reward deadline; …)', kind: 'matrix', min: 1, max: 9, rows: [1, 5], cols: [3, 3] }],
    rule: i => (i.jobs.every(([d, , dl]) => d <= dl) ? null : 'A job longer than its deadline can never run.'),
    random: r => ({ jobs: Array.from({ length: r(2, 4) }, () => { const d = r(1, 3); return [d, r(1, 9), r(d, 8)] }) }),
  },
  'stock-states': { fields: [ints('prices', 'Prices', 0, 20, [1, 8])] },
  'stock-k': { fields: [ints('prices', 'Prices', 0, 9, [1, 8]), int('k', 'Most trades', 1, 3)] },
  'stock-cooldown': { fields: [ints('prices', 'Prices', 0, 9, [1, 8]), int('fee', 'Fee per sale', 0, 5)] },
  'batch-scheduling': { fields: [ints('lengths', 'Job lengths', 1, 5, [1, 7]), int('setup', 'Setup per batch', 0, 9)] },
  'text-justification': {
    fields: [ints('words', 'Word lengths', 1, 9, [1, 7]), int('width', 'Line width', 2, 15)],
    rule: i => (Math.max(...i.words) <= i.width ? null : 'Every word must fit on a line by itself.'),
    random: r => { const width = r(5, 12); return { words: Array.from({ length: r(2, 6) }, () => r(1, Math.min(6, width))), width } },
  },
  'affine-gap': { fields: [text('a', 'First', 'a-z', [1, 4]), text('b', 'Second', 'a-z', [1, 4]), int('mismatch', 'Mismatch costs', 0, 9), int('open', 'Opening a gap costs', 1, 9), int('extend', 'Extending it costs', 0, 9)] },
  'segmented-regression': { fields: [ints('ys', 'y values', 0, 20, [1, 8]), int('penalty', 'Penalty per segment', 0, 20)] },
  'grid-resources': { fields: [{ key: 'grid', label: 'Tolls (1 = pay one)', kind: 'grid', rows: [1, 4], cols: [1, 4] }, int('budget', 'Budget', 0, 3)] },
  'grid-direction': { fields: [{ key: 'grid', label: 'Costs', kind: 'matrix', min: 0, max: 9, rows: [1, 4], cols: [1, 5] }, int('turn', 'Turn fee', 0, 9)], rule: i => (i.grid.length + i.grid[0].length > 2 ? null : 'Use at least two cells.') },
  'grid-multiagent': { fields: [{ key: 'grid', label: 'Values', kind: 'matrix', min: 0, max: 20, rows: [1, 4], cols: [1, 4] }] },
  'multidimensional-knapsack': {
    fields: [{ key: 'items', label: 'Items (weight volume value; …)', kind: 'matrix', min: 0, max: 9, rows: [1, 3], cols: [3, 3] }, int('weight', 'Weight limit', 0, 5), int('volume', 'Volume limit', 0, 4)],
    random: r => ({ items: Array.from({ length: r(1, 3) }, () => [r(1, 3), r(1, 3), r(1, 9)]), weight: r(2, 5), volume: r(2, 4) }),
  },
  'group-knapsack': {
    fields: [{ key: 'groups', label: 'Groups (weight value, weight value; next group …)', kind: 'groups', min: 0, max: 9, len: [1, 4] }, int('capacity', 'Capacity', 0, 10)],
    random: r => ({ groups: Array.from({ length: r(1, 3) }, () => Array.from({ length: r(1, 3) }, () => [r(1, 4), r(1, 9)])), capacity: r(2, 8) }),
  },
  'remove-boxes': { fields: [ints('boxes', 'Box colours', 1, 3, [1, 5])] },
}

// A trace's default input, read from its own parameter defaults by running it once with nothing.
// A trace whose input is not its args (an expression typed as text, say) returns it as `input`.
export function defaultInput(id) {
  const trace = TRACES[id]()
  if (trace.input) return structuredClone(trace.input)
  const args = trace.args ?? []
  const fields = INPUTS[id]?.fields ?? []
  return Object.fromEntries(fields.map((f, i) => [f.key, structuredClone(args[i])]))
}
