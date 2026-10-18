// Live DP tables for the walkthrough stage. Each trace runs the lesson's recurrence on a small input,
// reading its own table as it fills it (so the values shown are the values a program would compute),
// and records every step: the cell written, the cells it read, and the arithmetic. TableTrace.jsx
// replays them; tables.test.js checks each final answer against the lesson's reference solution, on
// the default input and on random inputs.
//
// Every trace takes its input as one object ({ values: [...] }, { s: '...' }, …) with the lesson's
// example as the default. INPUTS says which fields the learner may change and their limits.

const INF = Infinity
export const show = v => (v === null || v === undefined ? '' : v === true ? 'T' : v === false ? 'F' : v === INF ? '∞' : v === -INF ? '−∞' : String(v))

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

// "A + B = 3 + 5", or `none` when nothing is added.
const sumRule = (names, values, none) => (names.length ? `${names.join(' + ')} = ${values.join(' + ')}` : none)

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
}

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
  'word-break': { fields: [text('s', 'Text', 'a-z', [1, 12]), { key: 'words', label: 'Words', kind: 'words', len: [1, 6] }] },
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
  lis: { fields: values(0, 99, [1, 12]) },
  'matrix-chain': { fields: [ints('dims', 'Sizes d₀, d₁, … (matrix i is dᵢ × dᵢ₊₁)', 1, 20, [3, 7])] },
  'burst-balloons': { fields: values(0, 9, [1, 6]) },
  'cut-stick': { fields: [int('n', 'Stick length', 10, 20), ints('cuts', 'Cut positions', 1, 9, [1, 5])], rule: i => (new Set(i.cuts).size === i.cuts.length ? null : 'Give each cut position once.') },
  'merge-stones': { fields: [ints('values', 'Pile sizes', 1, 9, [1, 6])] },
  'polygon-triangulation': { fields: [ints('values', 'Vertex weights, in order round the polygon', 1, 9, [3, 7])] },
  'palindrome-subsequence': { fields: [text('s', 'Text', 'a-z', [1, 9])] },
  'palindrome-substring': { fields: [text('s', 'Text', 'a-z', [1, 8])] },
}

// A trace's default input, read from its own parameter defaults by running it once with nothing.
export function defaultInput(id) {
  const args = TRACES[id]().args ?? []
  const fields = INPUTS[id]?.fields ?? []
  return Object.fromEntries(fields.map((f, i) => [f.key, structuredClone(args[i])]))
}
