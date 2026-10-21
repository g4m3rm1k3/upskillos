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

// Graphs (the DAG lessons): Kahn's topological order, always taking the smallest ready vertex, so a
// table's columns are the same every time. Vertices on a cycle never become ready and are left out.
function topoOrder(n, edges) {
  const indeg = Array(n).fill(0)
  for (const e of edges) indeg[e[1]]++
  const ready = range(0, n - 1).filter(v => indeg[v] === 0), order = []
  while (ready.length) {
    ready.sort((x, y) => x - y)
    const v = ready.shift()
    order.push(v)
    for (const e of edges) if (e[0] === v && --indeg[e[1]] === 0) ready.push(e[1])
  }
  return order
}
// Strongly connected components by mutual reachability: comps[c] lists its vertices, of[v] is v's component.
function components(n, edges) {
  const reach = range(0, n - 1).map(i => range(0, n - 1).map(j => i === j))
  for (const [a, b] of edges) reach[a][b] = true
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (reach[i][k] && reach[k][j]) reach[i][j] = true
  const comps = [], of = Array(n).fill(-1)
  for (let v = 0; v < n; v++) if (of[v] < 0) { const c = range(0, n - 1).filter(u => reach[v][u] && reach[u][v]); c.forEach(u => { of[u] = comps.length }); comps.push(c) }
  return { comps, of }
}
const sum = xs => xs.reduce((s, x) => s + x, 0)
const plus = w => (w < 0 ? ` − ${-w}` : ` + ${w}`)

// Trees (the tree lessons): rooted at 0. post lists the vertices children first (a breadth-first order
// reversed), which is the order the tables' columns use; kids[v] are v's children.
function rootTree(n, edges) {
  const adj = range(0, n - 1).map(() => [])
  for (const e of edges) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]) }
  const parent = Array(n).fill(-1), order = [0]
  for (let i = 0; i < order.length; i++) for (const u of adj[order[i]]) if (u !== parent[order[i]]) { parent[u] = order[i]; order.push(u) }
  const kids = range(0, n - 1).map(v => order.filter(u => parent[u] === v))
  return { parent, kids, post: [...order].reverse(), pre: order }
}
const product = xs => xs.reduce((p, x) => p * x, 1)

// Masks (the bitmask lessons): a mask in binary with item 0 on the right, and its number of 1 bits.
const bits = (m, n) => m.toString(2).padStart(Math.max(1, n), '0')
const popcount = m => { let c = 0; for (; m; m &= m - 1) c++; return c }
// The first cell holding the smallest value in row r: the answer when it is a minimum over a row.
function lowestInRow(t, r) {
  let c = 0
  t.cells[r].forEach((v, k) => { if (v < t.get(r, c)) c = k })
  return [r, c]
}

// Digits and automata (the digit lessons). digitCell fills a digit-DP cell from the next column:
// terms are [row, how many digits lead there, a note].
const digitsOfNumber = n => String(n).split('').map(Number)
function digitCell(t, r, p, terms) {
  const live = terms.filter(([, k]) => k > 0)
  const value = sum(live.map(([to, k]) => k * t.get(to, p + 1)))
  t.set(r, p, value, live.map(([to]) => [to, p + 1]), live.length ? `${live.map(([to, k]) => `${k} × ${t.name(to, p + 1)}`).join(' + ')} = ${live.map(([to, k]) => `${k} × ${t.get(to, p + 1)}`).join(' + ')}` : 'no digit is allowed: 0')
}
// The KMP automaton: step[q][c] is the matched length after reading c with q letters matched.
function kmpStep(pattern, alphabet) {
  const fail = Array(pattern.length + 1).fill(0)
  for (let i = 1; i < pattern.length; i++) { let k = fail[i]; while (k && pattern[i] !== pattern[k]) k = fail[k]; fail[i + 1] = pattern[i] === pattern[k] ? k + 1 : 0 }
  return range(0, pattern.length).map(q => Object.fromEntries([...alphabet].map(c => { let k = q; while (k && (k === pattern.length || pattern[k] !== c)) k = fail[k]; return [c, k < pattern.length && pattern[k] === c ? k + 1 : 0] })))
}
// The Aho–Corasick automaton: go[u][c], forbidden nodes, and the string each node stands for.
function ahoAutomaton(alphabet, patterns) {
  const go = [{}], fail = [0], bad = [false], word = ['']
  for (const p of patterns) { let u = 0; for (const c of p) { if (!(c in go[u])) { go.push({}); fail.push(0); bad.push(false); word.push(word[u] + c); go[u][c] = go.length - 1 } u = go[u][c] } bad[u] = true }
  const queue = []
  for (const c of alphabet) { if (c in go[0]) queue.push(go[0][c]); else go[0][c] = 0 }
  for (let i = 0; i < queue.length; i++) { const u = queue[i]; bad[u] = bad[u] || bad[fail[u]]; for (const c of alphabet) { if (c in go[u]) { const v = go[u][c]; fail[v] = go[fail[u]][c]; queue.push(v) } else go[u][c] = go[fail[u]][c] } }
  return { go, bad, word }
}

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
  // ── DAGs and graph recurrences (Advanced). Graphs are a vertex count n and edges [from, to, (weight)]. ──
  'dag-paths': ({ n = 5, edges = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [1, 4]], s = 0, t: goal = 4 } = {}) => {
    const order = topoOrder(n, edges)
    const t = table(['ways'], order.map(String), (r, c) => `ways(${order[c]})`)
    const col = v => order.indexOf(v)
    t.seed(0, col(s), 1, `ways(${s}) = 1: the empty path at the start`)
    for (const v of order) {
      if (v === s) continue
      const from = edges.filter(e => e[1] === v).map(e => e[0])
      t.set(0, col(v), from.reduce((sum, u) => sum + t.get(0, col(u)), 0), from.map(u => [0, col(u)]), sumRule(from.map(u => `ways(${u})`), from.map(u => t.get(0, col(u))), 'no edge comes in: 0'))
    }
    return { title: `Paths from ${s} to ${goal}`, setup: 'Columns are the vertices in topological order, so every edge points right. ways(v) adds ways(u) over the edges u → v: each path into v has exactly one last edge.', table: t, answer: [0, col(goal)], args: [n, edges, s, goal] }
  },
  'dag-longest': ({ n = 5, edges = [[0, 1, 5], [0, 2, 2], [2, 1, 1], [1, 3, -4], [2, 3, 6], [3, 4, 2], [1, 4, 9]], s = 0, t: goal = 4 } = {}) => {
    const order = topoOrder(n, edges)
    const t = table(['best'], order.map(String), (r, c) => `best(${order[c]})`)
    const col = v => order.indexOf(v)
    t.seed(0, col(s), 0, `best(${s}) = 0: the start costs nothing`)
    for (const v of order) {
      if (v === s) continue
      const into = edges.filter(e => e[1] === v)
      const live = into.filter(e => t.get(0, col(e[0])) !== INF)
      const value = live.length ? minOf(live.map(e => t.get(0, col(e[0])) + e[2])) : INF
      t.set(0, col(v), value, into.map(e => [0, col(e[0])]), live.length ? `min(${live.map(e => `best(${e[0]})${plus(e[2])}`).join(', ')}) = min(${live.map(e => t.get(0, col(e[0])) + e[2]).join(', ')})` : into.length ? 'every vertex leading here is unreached: ∞' : 'no edge comes in: ∞')
    }
    return { title: `Cheapest from ${s} to ${goal}`, setup: 'Columns are the vertices in topological order. best(v) is the smallest best(u) + w over edges u → v; ∞ means no path reaches v yet. Negative weights are safe because every best(u) is final before it is read.', table: t, answer: [0, col(goal)], args: [n, edges, s, goal], check: w => (w === null ? INF : w) }
  },
  'increasing-grid': ({ grid: g = [[9, 9, 4], [6, 6, 8], [2, 1, 1]] } = {}) => {
    const R = g.length, C = g[0].length
    const t = table(range(0, R - 1).map(String), range(0, C - 1).map(String), (r, c) => `L(${r},${c})`)
    const cells = range(0, R * C - 1).map(k => [Math.floor(k / C), k % C]).sort((x, y) => g[y[0]][y[1]] - g[x[0]][x[1]])
    for (const [i, j] of cells) {
      const up = [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < R && b < C && g[a][b] > g[i][j])
      t.set(i, j, 1 + maxOf([0, ...up.map(([a, b]) => t.get(a, b))]), up, up.length ? `1 + max(${up.map(([a, b]) => `L(${a},${b})`).join(', ')}) = 1 + max(${up.map(([a, b]) => t.get(a, b)).join(', ')})` : 'no larger neighbour: 1')
    }
    return { title: `Grid ${rowsOf(g)}`, setup: 'L(i,j) is the longest strictly increasing path starting at cell (i,j): 1 + the largest L of a strictly larger neighbour. Cells are filled from the largest value down, so every larger neighbour is ready. The answer is the largest cell.', table: t, answer: bestCell(t), args: [g] }
  },
  'critical-path': ({ durations: d = [2, 3, 1, 4, 2, 1], deps = [[0, 2], [1, 2], [1, 3], [2, 4], [3, 4], [4, 5], [0, 5]] } = {}) => {
    const n = d.length, order = topoOrder(n, deps)
    const t = table(['finish'], order.map(v => `${v} (${d[v]})`), (r, c) => `finish(${order[c]})`)
    const col = v => order.indexOf(v)
    for (const v of order) {
      const pre = deps.filter(e => e[1] === v).map(e => e[0])
      t.set(0, col(v), d[v] + maxOf([0, ...pre.map(u => t.get(0, col(u)))]), pre.map(u => [0, col(u)]), pre.length ? `${d[v]} + max(${pre.map(u => `finish(${u})`).join(', ')}) = ${d[v]} + max(${pre.map(u => t.get(0, col(u))).join(', ')})` : `no prerequisites: starts at 0, so ${d[v]}`)
    }
    return { title: `Tasks ${list(d)}`, setup: 'Columns are the tasks in an order that puts every prerequisite first; each is labelled with its duration. finish(v) = its duration + the latest finish among its prerequisites. Everything is done at the largest finish.', table: t, answer: bestCell(t), args: [d, deps] }
  },
  'bellman-ford-dp': ({ n = 4, edges = [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5]], s = 0, k = 3 } = {}) => {
    const t = table(range(0, k).map(r => `≤ ${r} edges`), range(0, n - 1).map(String), (r, c) => `D(${r},${c})`)
    for (let v = 0; v < n; v++) t.seed(0, v, v === s ? 0 : INF, v === s ? `D(0,${s}) = 0: the start, no edges` : `D(0,${v}) = ∞: not reached with no edges`)
    for (let r = 1; r <= k; r++) for (let v = 0; v < n; v++) {
      const into = edges.filter(e => e[1] === v)
      const opts = [{ text: `D(${r - 1},${v})`, value: t.get(r - 1, v) }, ...into.map(e => ({ text: `D(${r - 1},${e[0]})${plus(e[2])}`, value: t.get(r - 1, e[0]) + e[2] }))]
      t.set(r, v, minOf(opts.map(o => o.value)), [[r - 1, v], ...into.map(e => [r - 1, e[0]])], opts.length > 1 ? `min(${opts.map(o => o.text).join(', ')}) = min(${opts.map(o => show(o.value)).join(', ')})` : `no edge comes in: D(${r - 1},${v}) = ${show(t.get(r - 1, v))}`)
    }
    return { title: `From ${s}, at most ${k} edges`, setup: 'Row r is the cheapest walk to each vertex using at most r edges. Each cell keeps the row above, or extends a walk from the row above by one edge into its vertex. The answer cell is the last vertex; the whole last row is the challenge’s answer.', table: t, answer: [k, n - 1], args: [n, edges, s, k], check: w => (w[n - 1] === null ? INF : w[n - 1]) }
  },
  'floyd-warshall': ({ n = 4, edges = [[0, 1, 5], [1, 2, 3], [2, 3, 1], [3, 0, 2], [0, 2, 9], [1, 3, 10]] } = {}) => {
    const row = (k, i) => k * n + i
    const t = table(range(0, n).flatMap(k => range(0, n - 1).map(i => `${k ? `via ≤ ${k - 1}` : 'direct'}: ${i}`)), range(0, n - 1).map(String), (r, c) => `D${Math.floor(r / n)}(${r % n},${c})`)
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const direct = edges.filter(e => e[0] === i && e[1] === j)
      t.seed(row(0, i), j, i === j ? 0 : direct.length ? minOf(direct.map(e => e[2])) : INF, i === j ? 'a vertex to itself: 0' : direct.length ? `the edge ${i} → ${j}` : 'no direct edge: ∞')
    }
    for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const keep = t.get(row(k, i), j), via = t.get(row(k, i), k) + t.get(row(k, k), j)
      t.set(row(k + 1, i), j, Math.min(keep, via), [[row(k, i), j], [row(k, i), k], [row(k, k), j]], `min(D${k}(${i},${j}), D${k}(${i},${k}) + D${k}(${k},${j})) = min(${show(keep)}, ${show(via)})`)
    }
    return { title: `${n} vertices, all pairs`, setup: `Each block of ${n} rows is the distance matrix with one more vertex allowed in between: block k allows vertices 0 … k − 1. A cell keeps its value from the block above, or goes through the newly allowed vertex. The answer cell is the distance from 0 to ${n - 1}; the last block is the whole answer.`, table: t, answer: [row(n, 0), n - 1], args: [n, edges], check: w => (w[0][n - 1] === null ? INF : w[0][n - 1]) }
  },
  'scc-boundaries': ({ values: a = [1, 2, 3, 4, 5, 6], edges = [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 3], [1, 5]], s = 0 } = {}) => {
    const { comps, of } = components(a.length, edges)
    // Components in reverse topological order: a component's successors come first.
    const dagEdges = edges.filter(e => of[e[0]] !== of[e[1]]).map(e => [of[e[0]], of[e[1]]])
    const order = topoOrder(comps.length, dagEdges).reverse()
    const label = c => set(comps[c])
    const t = table(['best'], order.map(label), (r, c) => `best(${label(order[c])})`)
    const col = c => order.indexOf(c)
    for (const c of order) {
      const w = sum(comps[c].map(v => a[v])), next = [...new Set(dagEdges.filter(e => e[0] === c).map(e => e[1]))]
      t.set(0, col(c), w + maxOf([0, ...next.map(d => t.get(0, col(d)))]), next.map(d => [0, col(d)]), `${comps[c].map(v => a[v]).join(' + ')}${next.length ? ` + max(${next.map(d => `best(${label(d)})`).join(', ')}) = ${w} + max(${next.map(d => t.get(0, col(d))).join(', ')})` : ': nothing leads on'}`)
    }
    return { title: `Values ${list(a)}, start ${s}`, setup: 'Each column is a strongly connected component, worth the sum of its values, since a walk can visit all of it. Components that come later on a walk are filled first. best(c) = its worth + the best component it leads to.', table: t, answer: [0, col(of[s])], args: [a, edges, s] }
  },
  'dag-product': ({ n = 5, edges = [[0, 1, 2], [1, 4, 20], [0, 2, 8], [2, 3, 8], [3, 4, 1], [0, 4, 30]], s = 0, t: goal = 4 } = {}) => {
    const order = topoOrder(n, edges)
    const t = table(['held', 'spent'], [...order.map(String), 'answer'], (r, c) => (c === order.length ? 'answer' : `${r ? 'spent' : 'held'}(${order[c]})`))
    const col = v => order.indexOf(v)
    t.seed(0, col(s), 0, `held(${s}) = 0: the start, coupon unused`)
    t.seed(1, col(s), INF, `spent(${s}) = ∞: the coupon hasn’t been used yet`)
    for (const v of order) {
      if (v === s) continue
      const into = edges.filter(e => e[1] === v), held = into.filter(e => t.get(0, col(e[0])) !== INF), spent = into.filter(e => t.get(1, col(e[0])) !== INF)
      t.set(0, col(v), held.length ? minOf(held.map(e => t.get(0, col(e[0])) + e[2])) : INF, into.map(e => [0, col(e[0])]), held.length ? `min(${held.map(e => `held(${e[0]}) + ${e[2]}`).join(', ')}) = min(${held.map(e => t.get(0, col(e[0])) + e[2]).join(', ')})` : 'not reached with the coupon held: ∞')
      const opts = [...spent.map(e => ({ text: `spent(${e[0]}) + ${e[2]}`, value: t.get(1, col(e[0])) + e[2] })), ...held.map(e => ({ text: `held(${e[0]}) + ⌊${e[2]}/2⌋`, value: t.get(0, col(e[0])) + Math.floor(e[2] / 2) }))]
      t.set(1, col(v), opts.length ? minOf(opts.map(o => o.value)) : INF, into.flatMap(e => [[0, col(e[0])], [1, col(e[0])]]), opts.length ? `min(${opts.map(o => o.text).join(', ')}) = min(${opts.map(o => o.value).join(', ')})` : 'not reached: ∞')
    }
    const end = col(goal)
    t.set(0, order.length, Math.min(t.get(0, end), t.get(1, end)), [[0, end], [1, end]], `min(held(${goal}), spent(${goal})) = min(${show(t.get(0, end))}, ${show(t.get(1, end))})`)
    return { title: `${s} to ${goal}, one half-price coupon`, setup: 'Two rows per vertex, columns in topological order: arriving with the coupon still held, or after spending it. From a held vertex an edge is paid in full (stay held) or at half price (become spent). The last column takes the better way to arrive at the target.', table: t, answer: [0, order.length], args: [n, edges, s, goal], check: w => (w === null ? INF : w) }
  },
  // ── Tree DP (Advanced). A tree is n vertices and n − 1 edges, rooted at 0; columns list the vertices
  // children first, so every cell reads only cells to its left (rerooting passes read to the right). ──
  'tree-basics': ({ n = 7, edges = [[2, 5], [0, 2], [1, 0], [4, 1], [3, 1], [6, 2]] } = {}) => {
    const { kids, post } = rootTree(n, edges), col = v => post.indexOf(v)
    const t = table(['size'], post.map(String), (r, c) => `size(${post[c]})`)
    for (const v of post) t.set(0, col(v), 1 + sum(kids[v].map(c => t.get(0, col(c)))), kids[v].map(c => [0, col(c)]), kids[v].length ? `1 + ${kids[v].map(c => `size(${c})`).join(' + ')} = 1 + ${kids[v].map(c => t.get(0, col(c))).join(' + ')}` : 'a leaf: just itself, 1')
    return { title: `Tree on ${n} vertices`, setup: 'Rooted at 0. Columns list the vertices children first. size(v) is 1 for v itself plus its children’s sizes; children’s subtrees don’t overlap, so they add. The answer cell is the root, n; the whole row is the challenge’s answer.', table: t, answer: [0, col(0)], args: [n, edges], check: w => w[0] }
  },
  'tree-independent': ({ weights: w = [2, 9, 1, 3, 3, 8, 2], edges = [[2, 5], [0, 2], [1, 0], [4, 1], [3, 1], [6, 2]] } = {}) => {
    const n = w.length, { kids, post } = rootTree(n, edges), col = v => post.indexOf(v)
    const t = table(['take', 'skip'], [...post.map(v => `${v} (${w[v]})`), 'answer'], (r, c) => (c === n ? 'answer' : `${r ? 'skip' : 'take'}(${post[c]})`))
    for (const v of post) {
      const k = kids[v]
      t.set(0, col(v), w[v] + sum(k.map(c => t.get(1, col(c)))), k.map(c => [1, col(c)]), k.length ? `${w[v]} + ${k.map(c => `skip(${c})`).join(' + ')} = ${w[v]} + ${k.map(c => t.get(1, col(c))).join(' + ')}` : `a leaf taken: its weight, ${w[v]}`)
      t.set(1, col(v), sum(k.map(c => Math.max(t.get(0, col(c)), t.get(1, col(c))))), k.flatMap(c => [[0, col(c)], [1, col(c)]]), k.length ? k.map(c => `max(take(${c}), skip(${c}))`).join(' + ') + ` = ${k.map(c => Math.max(t.get(0, col(c)), t.get(1, col(c)))).join(' + ')}` : 'a leaf skipped: 0')
    }
    t.set(0, n, Math.max(t.get(0, col(0)), t.get(1, col(0))), [[0, col(0)], [1, col(0)]], `max(take(0), skip(0)) = max(${t.get(0, col(0))}, ${t.get(1, col(0))})`)
    return { title: `Weights ${list(w)}`, setup: 'Two rows per vertex: the best for its subtree with it taken, and with it skipped. Taken, every child must be skipped; skipped, each child takes its better state. The last column takes the root’s better state.', table: t, answer: [0, n], args: [w, edges] }
  },
  'tree-cover': ({ n = 7, edges = [[2, 5], [0, 2], [1, 0], [4, 1], [3, 1], [6, 2]] } = {}) => {
    const { kids, post } = rootTree(n, edges), col = v => post.indexOf(v)
    const t = table(['chosen', 'not chosen'], [...post.map(String), 'answer'], (r, c) => (c === n ? 'answer' : `${r ? 'U' : 'S'}(${post[c]})`))
    for (const v of post) {
      const k = kids[v]
      t.set(0, col(v), 1 + sum(k.map(c => Math.min(t.get(0, col(c)), t.get(1, col(c))))), k.flatMap(c => [[0, col(c)], [1, col(c)]]), k.length ? `1 + ${k.map(c => `min(S(${c}), U(${c}))`).join(' + ')} = 1 + ${k.map(c => Math.min(t.get(0, col(c)), t.get(1, col(c)))).join(' + ')}` : 'a leaf chosen: 1')
      t.set(1, col(v), sum(k.map(c => t.get(0, col(c)))), k.map(c => [0, col(c)]), k.length ? `${k.map(c => `S(${c})`).join(' + ')} = ${k.map(c => t.get(0, col(c))).join(' + ')}` : 'a leaf not chosen: 0')
    }
    t.set(0, n, Math.min(t.get(0, col(0)), t.get(1, col(0))), [[0, col(0)], [1, col(0)]], `min(S(0), U(0)) = min(${t.get(0, col(0))}, ${t.get(1, col(0))})`)
    return { title: `Vertex cover, ${n} vertices`, setup: 'S(v): the smallest cover of v’s subtree with v chosen; U(v): with v not chosen. A chosen vertex lets each child go either way; an unchosen one forces every child to be chosen, so each edge to a child is covered.', table: t, answer: [0, n], args: [n, edges] }
  },
  'tree-matching': ({ n = 7, edges = [[2, 5], [0, 2], [1, 0], [4, 1], [3, 1], [6, 2]] } = {}) => {
    const { kids, post } = rootTree(n, edges), col = v => post.indexOf(v)
    const t = table(['free', 'best'], post.map(String), (r, c) => `${r ? 'best' : 'free'}(${post[c]})`)
    for (const v of post) {
      const k = kids[v], f = sum(k.map(c => t.get(1, col(c))))
      t.set(0, col(v), f, k.map(c => [1, col(c)]), k.length ? `${k.map(c => `best(${c})`).join(' + ')} = ${k.map(c => t.get(1, col(c))).join(' + ')}` : 'a leaf: 0')
      const opts = k.map(c => ({ c, value: f - t.get(1, col(c)) + t.get(0, col(c)) + 1 }))
      t.set(1, col(v), Math.max(f, ...opts.map(o => o.value)), [[0, col(v)], ...k.flatMap(c => [[0, col(c)], [1, col(c)]])], k.length ? `max(free(${v}), ${opts.map(o => `match ${o.c}: free(${v}) − best(${o.c}) + free(${o.c}) + 1`).join(', ')}) = max(${f}, ${opts.map(o => o.value).join(', ')})` : 'a leaf: nothing to match, 0')
    }
    return { title: `Matching, ${n} vertices`, setup: 'free(v): the best matching in v’s subtree with v unmatched (each child does its best). best(v): also try matching v to one child c, which adds the edge but forces c to be free.', table: t, answer: [1, col(0)], args: [n, edges] }
  },
  'tree-diameter': ({ n = 7, edges = [[2, 5, 3], [0, 2, 1], [1, 0, 4], [4, 1, 1], [3, 1, 5], [6, 2, 9]] } = {}) => {
    const { parent, kids, post } = rootTree(n, edges), col = v => post.indexOf(v)
    const len = v => { const e = edges.find(x => (x[0] === v && x[1] === parent[v]) || (x[1] === v && x[0] === parent[v])); return e[2] }
    const t = table(['down', 'through'], post.map(String), (r, c) => `${r ? 'through' : 'down'}(${post[c]})`)
    for (const v of post) {
      const br = kids[v].map(c => ({ c, value: t.get(0, col(c)) + len(c) })).sort((a, b) => b.value - a.value)
      t.set(0, col(v), br.length ? br[0].value : 0, kids[v].map(c => [0, col(c)]), br.length ? `max(${br.map(b => `down(${b.c}) + ${len(b.c)}`).join(', ')}) = max(${br.map(b => b.value).join(', ')})` : 'a leaf: 0')
      const top = br.slice(0, 2)
      t.set(1, col(v), sum(top.map(b => b.value)), [[0, col(v)], ...kids[v].map(c => [0, col(c)])], top.length ? `the two longest branches: ${top.map(b => b.value).join(' + ')}` : 'a leaf: 0')
    }
    return { title: `Weighted tree, ${n} vertices`, setup: 'down(v): the longest path from v into its subtree. through(v): the longest path whose highest vertex is v, joining its two longest branches. The diameter is the largest through.', table: t, answer: bestInRow(t, 1), args: [n, edges] }
  },
  'tree-reroot': ({ n = 7, edges = [[2, 5], [0, 2], [1, 0], [4, 1], [3, 1], [6, 2]] } = {}) => {
    const { parent, kids, post, pre } = rootTree(n, edges), col = v => post.indexOf(v)
    const t = table(['down', 'second', 'up', 'farthest'], post.map(String), (r, c) => `${['down', 'second', 'up', 'far'][r]}(${post[c]})`)
    const via = Array(n).fill(-1)
    for (const v of post) {
      const br = kids[v].map(c => ({ c, value: t.get(0, col(c)) + 1 })).sort((a, b) => b.value - a.value)
      if (br.length) via[v] = br[0].c
      t.set(0, col(v), br.length ? br[0].value : 0, kids[v].map(c => [0, col(c)]), br.length ? `1 + max(${br.map(b => `down(${b.c})`).join(', ')}) = 1 + ${br[0].value - 1}` : 'a leaf: 0')
      t.set(1, col(v), br.length > 1 ? br[1].value : 0, kids[v].map(c => [0, col(c)]), br.length > 1 ? `the second deepest branch: 1 + down(${br[1].c}) = ${br[1].value}` : 'fewer than two branches: 0')
    }
    for (const v of pre) {
      const p = parent[v]
      if (p < 0) { t.set(2, col(v), 0, [], 'the root has nothing above it: 0'); continue }
      const other = via[p] === v ? t.get(1, col(p)) : t.get(0, col(p)), name = via[p] === v ? `second(${p})` : `down(${p})`
      t.set(2, col(v), 1 + Math.max(t.get(2, col(p)), other), [[2, col(p)], [0, col(p)], [1, col(p)]], `1 + max(up(${p}), ${name}) = 1 + max(${t.get(2, col(p))}, ${other})${via[p] === v ? `: ${p}’s deepest branch is ${v}’s own` : ''}`)
    }
    for (const v of post) t.set(3, col(v), Math.max(t.get(0, col(v)), t.get(2, col(v))), [[0, col(v)], [2, col(v)]], `max(down(${v}), up(${v})) = max(${t.get(0, col(v))}, ${t.get(2, col(v))})`)
    return { title: `Farthest distances, ${n} vertices`, setup: 'First pass, children first: each vertex’s deepest and second-deepest branch. Second pass, parents first: up(v) goes to the parent, then up again or down the parent’s best branch that isn’t v’s. The answer cell is the last vertex; the whole bottom row is the challenge’s answer.', table: t, answer: [3, col(n - 1)], args: [n, edges], check: w => w[n - 1] }
  },
  'reroot-prefix': ({ n = 7, edges = [[2, 5], [0, 2], [1, 0], [4, 1], [3, 1], [6, 2]] } = {}) => {
    const { parent, kids, post, pre } = rootTree(n, edges), col = v => post.indexOf(v)
    const t = table(['down', 'up', 'through v'], post.map(String), (r, c) => `${['down', 'up', 'sets'][r]}(${post[c]})`)
    for (const v of post) t.set(0, col(v), product(kids[v].map(c => 1 + t.get(0, col(c)))), kids[v].map(c => [0, col(c)]), kids[v].length ? `${kids[v].map(c => `(1 + down(${c}))`).join(' · ')} = ${kids[v].map(c => 1 + t.get(0, col(c))).join(' · ')}` : 'a leaf: just {v}, 1')
    for (const v of pre) {
      const p = parent[v]
      if (p < 0) { t.set(1, col(v), 0, [], 'the root has nothing above it: 0'); continue }
      const sibs = kids[p].filter(c => c !== v)
      t.set(1, col(v), product(sibs.map(c => 1 + t.get(0, col(c)))) * (1 + t.get(1, col(p))), [...sibs.map(c => [0, col(c)]), [1, col(p)]], `${[...sibs.map(c => `(1 + down(${c}))`), `(1 + up(${p}))`].join(' · ')} = ${[...sibs.map(c => 1 + t.get(0, col(c))), 1 + t.get(1, col(p))].join(' · ')}${sibs.length ? `: every sibling of ${v} but not ${v} (prefix · suffix)` : ''}`)
    }
    for (const v of post) t.set(2, col(v), t.get(0, col(v)) * (1 + t.get(1, col(v))), [[0, col(v)], [1, col(v)]], `down(${v}) · (1 + up(${v})) = ${t.get(0, col(v))} · ${1 + t.get(1, col(v))}`)
    return { title: `Connected sets, ${n} vertices`, setup: 'down(v): connected sets in v’s subtree whose top is v. up(v): sets above v that contain its parent but not v, built from its siblings (all but v: a prefix times a suffix, no division) and what is above the parent. The bottom row counts the sets through each vertex; the answer cell is the last vertex.', table: t, answer: [2, col(n - 1)], args: [n, edges], check: w => w[n - 1] }
  },
  'tree-distances': ({ n = 6, edges = [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5]] } = {}) => {
    const { parent, kids, post, pre } = rootTree(n, edges), col = v => post.indexOf(v)
    const t = table(['size', 'sum'], post.map(String), (r, c) => `${r ? 'S' : 'size'}(${post[c]})`)
    for (const v of post) t.set(0, col(v), 1 + sum(kids[v].map(c => t.get(0, col(c)))), kids[v].map(c => [0, col(c)]), kids[v].length ? `1 + ${kids[v].map(c => `size(${c})`).join(' + ')} = 1 + ${kids[v].map(c => t.get(0, col(c))).join(' + ')}` : 'a leaf: 1')
    for (const v of pre) {
      const p = parent[v]
      if (p < 0) { const rest = post.filter(u => u !== 0); t.set(1, col(0), sum(rest.map(u => t.get(0, col(u)))), rest.map(u => [0, col(u)]), `each edge is crossed by every path from the root into the subtree below it: ${rest.map(u => `size(${u})`).join(' + ')} = ${rest.map(u => t.get(0, col(u))).join(' + ')}`); continue }
      t.set(1, col(v), t.get(1, col(p)) + n - 2 * t.get(0, col(v)), [[1, col(p)], [0, col(v)]], `S(${p}) + ${n} − 2·size(${v}) = ${t.get(1, col(p))} + ${n} − ${2 * t.get(0, col(v))}`)
    }
    return { title: `Distance sums, ${n} vertices`, setup: 'Sizes first, children first. The root’s sum counts each edge once per vertex below it. Then, parents first, moving to a child v brings its size(v) vertices one closer and takes the other n − size(v) one farther. The answer cell is the last vertex; the whole sum row is the challenge’s answer.', table: t, answer: [1, col(n - 1)], args: [n, edges], check: w => w[n - 1] }
  },
  'tree-knapsack': ({ values: val = [2, 6, 1, 7, 3], costs: cost = [1, 3, 1, 2, 2], edges = [[3, 0], [1, 3], [2, 0], [4, 2]], budget: B = 5 } = {}) => {
    const n = val.length, { kids, post } = rootTree(n, edges), col = v => post.indexOf(v)
    const t = table(range(0, B).map(b => `b = ${b}`), [...post.map(v => `${v} (${val[v]}, ${cost[v]})`), 'answer'], (r, c) => (c === n ? 'answer' : `D(${post[c]},${r})`))
    for (const v of post) for (let b = 0; b <= B; b++) {
      if (cost[v] > b) { t.set(b, col(v), -INF, [], `cost ${cost[v]} doesn’t fit in ${b}: −∞`); continue }
      // Every way to share the rest of the budget among the children (0 = leave a child out).
      let best = { value: val[v], parts: [] }
      const go = (i, left, value, parts) => {
        if (i === kids[v].length) { if (value > best.value) best = { value, parts }; return }
        go(i + 1, left, value, parts)
        for (let x = 0; x <= left; x++) { const d = t.get(x, col(kids[v][i])); if (d > -INF) go(i + 1, left - x, value + d, [...parts, [kids[v][i], x, d]]) }
      }
      go(0, b - cost[v], val[v], [])
      t.set(b, col(v), best.value, kids[v].flatMap(c => range(0, b).map(x => [x, col(c)])), best.parts.length ? `${val[v]}${best.parts.map(([c, x]) => ` + D(${c},${x})`).join('')} = ${[val[v], ...best.parts.map(p => p[2])].join(' + ')}` : `${v} alone: its value ${val[v]}`)
    }
    t.set(B, n, Math.max(0, t.get(B, col(0))), [[B, col(0)]], `max(0, D(0,${B})) = max(0, ${show(t.get(B, col(0)))})`)
    return { title: `Budget ${B}`, setup: 'Each column is a vertex (value, cost); row b is a budget. D(v, b) is the best from v’s subtree with v chosen, spending at most b: v’s value plus the best way to share the rest of the budget among its children. A child can be used only because v is chosen. The answer takes the root, or nothing.', table: t, answer: [B, n], args: [val, cost, edges, B] }
  },
  'tree-coloring': ({ edges = [[3, 0], [1, 3], [2, 0], [4, 2]], colours: g = [[1, 0, 0], [1, 1, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1]] } = {}) => {
    const allowed = g.map(row => [1, 2, 3].filter((_, i) => row[i]))
    const n = allowed.length, { kids, post } = rootTree(n, edges), col = v => post.indexOf(v)
    const t = table(['colour 1', 'colour 2', 'colour 3'], [...post.map(v => `${v} {${allowed[v].join(',')}}`), 'answer'], (r, c) => (c === n ? 'answer' : `W(${post[c]},${r + 1})`))
    const total = c => sum([0, 1, 2].map(r => t.get(r, col(c))))
    for (const v of post) for (let r = 0; r < 3; r++) {
      if (!allowed[v].includes(r + 1)) { t.set(r, col(v), 0, [], `colour ${r + 1} isn’t allowed at ${v}: 0`); continue }
      const k = kids[v]
      t.set(r, col(v), product(k.map(c => total(c) - t.get(r, col(c)))), k.flatMap(c => [0, 1, 2].map(q => [q, col(c)])), k.length ? `${k.map(c => `(all(${c}) − W(${c},${r + 1}))`).join(' · ')} = ${k.map(c => `(${total(c)} − ${t.get(r, col(c))})`).join(' · ')}` : 'a leaf with an allowed colour: 1')
    }
    t.set(0, n, total(0), [0, 1, 2].map(q => [q, col(0)]), `W(0,1) + W(0,2) + W(0,3) = ${[0, 1, 2].map(q => t.get(q, col(0))).join(' + ')}`)
    return { title: `Allowed colours ${allowed.map(a => `{${a.join(',')}}`).join(' ')}`, setup: 'W(v, c): colourings of v’s subtree with v coloured c. Each child may take any colour but c: all(child), its colourings of every colour, minus those where it is c. The children are independent, so they multiply. The last column adds the root’s colours.', table: t, answer: [0, n], args: [edges, allowed], input: { edges, colours: g } }
  },
  'tree-path-count': ({ n = 7, edges = [[2, 5], [0, 2], [1, 0], [4, 1], [3, 1], [6, 2]], k = 3 } = {}) => {
    const { kids, post } = rootTree(n, edges), col = v => post.indexOf(v)
    const t = table([...range(0, k).map(d => `depth ${d}`), 'paths here'], [...post.map(String), 'answer'], (r, c) => (c === n ? 'answer' : r > k ? `here(${post[c]})` : `cnt(${post[c]},${r})`))
    for (const v of post) {
      for (let d = 0; d <= k; d++) t.set(d, col(v), d === 0 ? 1 : sum(kids[v].map(c => t.get(d - 1, col(c)))), d ? kids[v].map(c => [d - 1, col(c)]) : [], d === 0 ? `${v} itself` : kids[v].length ? sumRule(kids[v].map(c => `cnt(${c},${d - 1})`), kids[v].map(c => t.get(d - 1, col(c))), '0') : 'nothing below a leaf: 0')
      // Paths whose highest vertex is v: straight down k edges, or through two different children.
      let cross = 0
      kids[v].forEach((a, i) => kids[v].slice(i + 1).forEach(b => { for (let d = 0; d <= k - 2; d++) cross += t.get(d, col(a)) * t.get(k - 2 - d, col(b)) }))
      t.set(k + 1, col(v), t.get(k, col(v)) + cross, [[k, col(v)], ...kids[v].flatMap(c => range(0, k - 1).map(d => [d, col(c)]))], `straight down: cnt(${v},${k}) = ${t.get(k, col(v))}, plus ${cross} through two different children`)
    }
    t.set(k + 1, n, sum(post.map(v => t.get(k + 1, col(v)))), post.map(v => [k + 1, col(v)]), `every path has one highest vertex: ${post.map(v => t.get(k + 1, col(v))).join(' + ')}`)
    return { title: `Pairs at distance ${k}`, setup: `cnt(v, d) counts the vertices d edges below v. The last row counts the paths of length ${k} whose highest vertex is v: straight down from v, or joining depth d in one child to depth ${k} − 2 − d in another. Every path is counted at its highest vertex.`, table: t, answer: [k + 1, n], args: [n, edges, k] }
  },
  'tree-connected': ({ n = 7, edges = [[2, 5], [0, 2], [1, 0], [4, 1], [3, 1], [6, 2]] } = {}) => {
    const { kids, post } = rootTree(n, edges), col = v => post.indexOf(v)
    const t = table(['C'], [...post.map(String), 'answer'], (r, c) => (c === n ? 'answer' : `C(${post[c]})`))
    for (const v of post) t.set(0, col(v), product(kids[v].map(c => 1 + t.get(0, col(c)))), kids[v].map(c => [0, col(c)]), kids[v].length ? `${kids[v].map(c => `(1 + C(${c}))`).join(' · ')} = ${kids[v].map(c => 1 + t.get(0, col(c))).join(' · ')}` : 'a leaf: just {v}, 1')
    t.set(0, n, sum(post.map(v => t.get(0, col(v)))), post.map(v => [0, col(v)]), `each set has one highest vertex: ${post.map(v => t.get(0, col(v))).join(' + ')}`)
    return { title: `Connected sets, ${n} vertices`, setup: 'C(v) counts the connected sets whose highest vertex is v: each child adds nothing, or one of its sets. Adding C over every vertex counts each set once.', table: t, answer: [0, n], args: [n, edges] }
  },
  'tree-small-large': ({ colors = [4, 4, 1, 2, 1, 3, 2], edges = [[2, 5], [0, 2], [1, 0], [4, 1], [3, 1], [6, 2]] } = {}) => {
    const n = colors.length, { kids, post } = rootTree(n, edges), col = v => post.indexOf(v)
    const sets = Array(n)
    const t = table(['colours'], post.map(v => `${v} (${colors[v]})`), (r, c) => `distinct(${post[c]})`)
    for (const v of post) {
      sets[v] = new Set([colors[v], ...kids[v].flatMap(c => [...sets[c]])])
      t.set(0, col(v), sets[v].size, kids[v].map(c => [0, col(c)]), `${[`{${colors[v]}}`, ...kids[v].map(c => set([...sets[c]].sort((a, b) => a - b)))].join(' ∪ ')} = ${set([...sets[v]].sort((a, b) => a - b))}`)
    }
    return { title: `Colours ${list(colors)}`, setup: 'Each vertex’s set of colours is its own colour joined with its children’s sets; the cell shows how many there are. A program pours the smaller set into the larger, so each colour moves only a few times. The answer cell is the root; the whole row is the challenge’s answer.', table: t, answer: [0, col(0)], args: [colors, edges], check: w => w[0] }
  },
  // ── Bitmask and subset DP (Advanced). Columns are masks, written in binary with item 0 on the right. ──
  'bitmask-basics': ({ weights: w = [3, 5, 2], limit = 5 } = {}) => {
    const n = w.length, N = 1 << n
    const t = table(['total'], [...range(0, N - 1).map(m => bits(m, n)), 'answer'], (r, c) => (c === N ? 'answer' : `T(${bits(c, n)})`))
    t.seed(0, 0, 0, 'T(empty) = 0: the empty subset weighs nothing')
    for (let m = 1; m < N; m++) { const low = m & -m, i = 31 - Math.clz32(low); t.set(0, m, t.get(0, m ^ low) + w[i], [[0, m ^ low]], `T(${bits(m ^ low, n)}) + w${i} = ${t.get(0, m ^ low)} + ${w[i]}`) }
    const ok = range(0, N - 1).filter(m => t.get(0, m) <= limit)
    t.set(0, N, ok.length, range(0, N - 1).map(m => [0, m]), `subsets with total ≤ ${limit}: ${ok.map(m => bits(m, n)).join(', ')}`)
    return { title: `Weights ${list(w)}, limit ${limit}`, setup: 'One column per subset: bit i of the mask means item i is in. Each total is the total of the mask without its lowest item, plus that item’s weight. The last column counts the subsets within the limit.', table: t, answer: [0, N], args: [w, limit] }
  },
  'subset-enumeration': ({ values: v = [3, -1, 4, 1, -5, 9, 2, 6] } = {}) => {
    const N = v.length, n = Math.round(Math.log2(N))
    const t = table(['value', 'sum of submasks'], range(0, N - 1).map(m => bits(m, n)), (r, c) => `${r ? 'f' : 'v'}(${bits(c, n)})`)
    for (let m = 0; m < N; m++) t.seed(0, m, v[m], 'the input')
    for (let m = 0; m < N; m++) {
      const subs = []
      for (let s = m; ; s = (s - 1) & m) { subs.push(s); if (s === 0) break }
      t.set(1, m, sum(subs.map(s => v[s])), subs.map(s => [0, s]), `${subs.map(s => `v(${bits(s, n)})`).join(' + ')} = ${subs.map(s => v[s]).join(' + ')}`)
    }
    return { title: `Values ${list(v)}`, setup: 'For each mask, the walk s = mask, (s − 1) & mask, … visits every submask down to 0; the bottom row adds their values. The answer cell is the full mask; the whole row is the challenge’s answer.', table: t, answer: [1, N - 1], args: [v], check: w => w[N - 1] }
  },
  'assignment': ({ cost: C = [[4, 2, 8], [4, 3, 7], [3, 1, 6]] } = {}) => {
    const n = C.length, N = 1 << n
    const t = table(['D'], range(0, N - 1).map(m => bits(m, n)), (r, c) => `D(${bits(c, n)})`)
    t.seed(0, 0, 0, 'no jobs given out: 0')
    for (let m = 1; m < N; m++) {
      const w = popcount(m) - 1, opts = range(0, n - 1).filter(j => m & (1 << j)).map(j => ({ j, value: t.get(0, m ^ (1 << j)) + C[w][j] }))
      t.set(0, m, minOf(opts.map(o => o.value)), opts.map(o => [0, m ^ (1 << o.j)]), `worker ${w} takes the last job: min(${opts.map(o => `D(${bits(m ^ (1 << o.j), n)}) + c(${w},${o.j})`).join(', ')}) = min(${opts.map(o => o.value).join(', ')})`)
    }
    return { title: `Cost matrix ${rowsOf(C)}`, setup: 'D(mask): the cheapest way to give the jobs in mask to the first popcount(mask) workers. The last of those workers took one of mask’s jobs: try each.', table: t, answer: [0, N - 1], args: [C] }
  },
  'held-karp': ({ dist = [[0, 10, 15, 20], [10, 0, 35, 25], [15, 35, 0, 30], [20, 25, 30, 0]] } = {}) => {
    const n = dist.length, masks = range(0, (1 << n) - 1).filter(m => m & 1), full = (1 << n) - 1
    const col = m => masks.indexOf(m)
    const t = table(range(0, n - 1).map(v => `end ${v}`), [...masks.map(m => bits(m, n)), 'tour'], (r, c) => (c === masks.length ? 'tour' : `D(${bits(masks[c], n)},${r})`))
    for (const m of masks) for (let v = 0; v < n; v++) {
      if (m === 1) { t.seed(v, col(m), v === 0 ? 0 : INF, v === 0 ? 'at city 0, nothing travelled: 0' : 'only city 0 visited: ∞'); continue }
      if (!(m & (1 << v)) || v === 0) { t.set(v, col(m), INF, [], v === 0 ? 'only the start may end at 0, and it has moved on: ∞' : `${v} isn’t in this set: ∞`); continue }
      const prev = m ^ (1 << v), opts = range(0, n - 1).filter(u => prev & (1 << u)).map(u => ({ u, value: t.get(u, col(prev)) + dist[u][v] }))
      t.set(v, col(m), minOf(opts.map(o => o.value)), opts.map(o => [o.u, col(prev)]), `min(${opts.map(o => `D(${bits(prev, n)},${o.u}) + d(${o.u},${v})`).join(', ')}) = min(${opts.map(o => show(o.value)).join(', ')})`)
    }
    const ends = n > 1 ? range(1, n - 1) : [0]
    const tours = ends.map(v => t.get(v, col(full)) + (n > 1 ? dist[v][0] : 0))
    t.set(0, masks.length, minOf(tours), ends.map(v => [v, col(full)]), n > 1 ? `min(${ends.map(v => `D(all,${v}) + d(${v},0)`).join(', ')}) = min(${tours.map(show).join(', ')})` : 'one city: 0')
    return { title: `${n} cities`, setup: 'Columns: the sets of visited cities (always with city 0); rows: the city the path ends at. D(set, v) is the cheapest path from 0 through exactly that set ending at v: the best city u before v, plus the step from u. The last column closes the tour back to 0.', table: t, answer: [0, masks.length], args: [dist] }
  },
  'hamiltonian': ({ n = 4, edges = [[0, 1], [1, 2], [2, 3], [0, 2], [1, 3], [3, 1], [2, 1]] } = {}) => {
    const masks = range(0, (1 << n) - 1).filter(m => m & 1), full = (1 << n) - 1, col = m => masks.indexOf(m)
    const t = table(range(0, n - 1).map(v => `end ${v}`), [...masks.map(m => bits(m, n)), 'paths'], (r, c) => (c === masks.length ? 'paths' : `C(${bits(masks[c], n)},${r})`))
    for (const m of masks) for (let v = 0; v < n; v++) {
      if (m === 1) { t.seed(v, col(m), v === 0 ? 1 : 0, v === 0 ? 'the path that is just vertex 0: 1' : 'only vertex 0 visited: 0'); continue }
      if (!(m & (1 << v)) || v === 0) { t.set(v, col(m), 0, [], v === 0 ? 'a longer path doesn’t end back at 0: 0' : `${v} isn’t in this set: 0`); continue }
      const prev = m ^ (1 << v), from = edges.filter(([a, b]) => b === v && prev & (1 << a)).map(e => e[0])
      t.set(v, col(m), sum(from.map(u => t.get(u, col(prev)))), from.map(u => [u, col(prev)]), sumRule(from.map(u => `C(${bits(prev, n)},${u})`), from.map(u => t.get(u, col(prev))), `no edge into ${v} from this set: 0`))
    }
    t.set(0, masks.length, sum(range(0, n - 1).map(v => t.get(v, col(full)))), range(0, n - 1).map(v => [v, col(full)]), `every end: ${range(0, n - 1).map(v => t.get(v, col(full))).join(' + ')}`)
    return { title: `${n} vertices, ${edges.length} edges`, setup: 'C(set, v): how many paths from 0 visit exactly that set and end at v, split by the vertex u they came from (an edge u → v). The last column adds every end.', table: t, answer: [0, masks.length], args: [n, edges] }
  },
  'subset-partition': ({ values: v = [3, 3, 2, 2], cap = 6 } = {}) => {
    const n = v.length, N = 1 << n
    const t = table(['total', 'bins'], range(0, N - 1).map(m => bits(m, n)), (r, c) => `${r ? 'B' : 'T'}(${bits(c, n)})`)
    t.seed(0, 0, 0, 'the empty set weighs 0'); t.seed(1, 0, 0, 'no items, no bins')
    for (let m = 1; m < N; m++) { const low = m & -m; t.set(0, m, t.get(0, m ^ low) + v[31 - Math.clz32(low)], [[0, m ^ low]], `T(${bits(m ^ low, n)}) + ${v[31 - Math.clz32(low)]}`) }
    for (let m = 1; m < N; m++) {
      const low = m & -m, rest = m ^ low, opts = []
      for (let s = rest; ; s = (s - 1) & rest) { const b = s | low; if (t.get(0, b) <= cap) opts.push({ b, value: t.get(1, m ^ b) + 1 }); if (s === 0) break }
      t.set(1, m, minOf(opts.map(o => o.value)), opts.flatMap(o => [[0, o.b], [1, m ^ o.b]]), `the bin with item ${31 - Math.clz32(low)}: min(${opts.map(o => `B(${bits(m ^ o.b, n)}) + 1`).join(', ')}) = min(${opts.map(o => o.value).join(', ')})`)
    }
    return { title: `Items ${list(v)}, bins of ${cap}`, setup: 'Top row: each subset’s total. Bottom row: the fewest bins for that subset. Some bin holds its lowest item; try every such bin that fits (total ≤ cap), plus the best for what is left.', table: t, answer: [1, N - 1], args: [v, cap] }
  },
  'subset-cover': ({ n = 3, options: rows = [[1, 1, 0, 3], [0, 1, 1, 3], [1, 1, 1, 4]] } = {}) => {
    const N = 1 << n, opts = rows.map(r => ({ mask: r.slice(0, n).reduce((m, x, i) => m | (x ? 1 << i : 0), 0), cost: r[n] }))
    const t = table(['D'], range(0, N - 1).map(m => bits(m, n)), (r, c) => `D(${bits(c, n)})`)
    t.seed(0, 0, 0, 'nothing bought: 0')
    for (let m = 1; m < N; m++) {
      // Every earlier state p and option o with p | o = m: the last option bought.
      const cand = []
      for (const [k, o] of opts.entries()) if ((o.mask | m) === m && o.mask & m) for (let p = 0; p < m; p++) if ((p | o.mask) === m && t.get(0, p) !== INF) cand.push({ k, p, value: t.get(0, p) + o.cost })
      t.set(0, m, cand.length ? minOf(cand.map(c => c.value)) : INF, cand.map(c => [0, c.p]), cand.length ? `last option bought: min(${cand.map(c => `D(${bits(c.p, n)}) + option ${c.k}`).join(', ')}) = min(${cand.map(c => c.value).join(', ')})` : 'no purchase covers exactly this: ∞')
    }
    const items = opts.map(o => range(0, n - 1).filter(i => o.mask & (1 << i)))
    return { title: `${n} items, ${opts.length} options`, setup: 'D(mask): the cheapest purchase whose items together are exactly mask. Split by the last option bought: it took the covered set from some earlier p to p | option = mask.', table: t, answer: [0, N - 1], args: [n, opts.map((o, k) => [items[k], o.cost])], input: { n, options: rows }, check: w => (w === -1 ? INF : w) }
  },
  'steiner-tree': ({ n = 5, edges = [[0, 4, 1], [1, 4, 1], [2, 4, 1], [0, 1, 3], [1, 2, 3], [3, 2, 2]], terminals: T = [0, 1, 3] } = {}) => {
    const dist = range(0, n - 1).map(i => range(0, n - 1).map(j => (i === j ? 0 : INF)))
    for (const [a, b, w] of edges) { dist[a][b] = Math.min(dist[a][b], w); dist[b][a] = Math.min(dist[b][a], w) }
    for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j])
    const k = T.length, masks = range(1, (1 << k) - 1)
    const name = m => set(T.filter((_, i) => m & (1 << i)))
    const t = table(masks.map(name), range(0, n - 1).map(String), (r, c) => `D(${name(masks[r])},${c})`)
    for (const [r, m] of masks.entries()) for (let v = 0; v < n; v++) {
      if (!(m & (m - 1))) { const x = T[31 - Math.clz32(m)]; t.seed(r, v, dist[x][v], `terminal ${x} to ${v}: shortest distance ${show(dist[x][v])}`); continue }
      let best = { value: INF }
      for (let u = 0; u < n; u++) for (let s = (m - 1) & m; s; s = (s - 1) & m) { const value = t.get(masks.indexOf(s), u) + t.get(masks.indexOf(m ^ s), u) + dist[u][v]; if (value < best.value) best = { value, u, s } }
      t.set(r, v, best.value, range(0, n - 1).flatMap(u => masks.filter(s => (s & m) === s && s !== m).map(s => [masks.indexOf(s), u])), `branch at ${best.u}: D(${name(best.s)},${best.u}) + D(${name(m ^ best.s)},${best.u}) + dist(${best.u},${v}) = ${t.get(masks.indexOf(best.s), best.u)} + ${t.get(masks.indexOf(m ^ best.s), best.u)} + ${dist[best.u][v]}`)
    }
    return { title: `Terminals ${list(T)}`, setup: 'Rows: sets of terminals; columns: a vertex v. D(set, v) is the lightest tree joining those terminals and v. One terminal: its shortest distance to v. More: the tree branches at some vertex u into two smaller terminal sets, then a shortest path runs from u to v. The answer is the best cell in the bottom row.', table: t, answer: lowestInRow(t, masks.length - 1), args: [n, edges, T] }
  },
  'subset-topological': ({ n = 4, edges = [[0, 1], [0, 2], [1, 3]] } = {}) => {
    const N = 1 << n, need = range(0, n - 1).map(v => edges.filter(e => e[1] === v).reduce((m, e) => m | (1 << e[0]), 0))
    const t = table(['C'], range(0, N - 1).map(m => bits(m, n)), (r, c) => `C(${bits(c, n)})`)
    t.seed(0, 0, 1, 'one way to place nothing')
    for (let m = 1; m < N; m++) {
      const last = range(0, n - 1).filter(v => m & (1 << v) && (need[v] & (m ^ (1 << v))) === need[v])
      t.set(0, m, sum(last.map(v => t.get(0, m ^ (1 << v)))), last.map(v => [0, m ^ (1 << v)]), last.length ? `the last placed is ${last.join(' or ')}: ${sumRule(last.map(v => `C(${bits(m ^ (1 << v), n)})`), last.map(v => t.get(0, m ^ (1 << v))), '0')}` : 'no vertex here can come last: 0')
    }
    return { title: `${n} vertices, ${edges.length} rules`, setup: 'C(mask): how many valid orders place exactly the vertices in mask first. Split by the vertex placed last: it is in mask and all its prerequisites are in the rest.', table: t, answer: [0, N - 1], args: [n, edges] }
  },
  'subset-matching': ({ n = 4, edges = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]] } = {}) => {
    const N = 1 << n, adj = range(0, n - 1).map(v => edges.reduce((m, [a, b]) => (a === v ? m | (1 << b) : b === v ? m | (1 << a) : m), 0))
    const t = table(['D'], range(0, N - 1).map(m => bits(m, n)), (r, c) => `D(${bits(c, n)})`)
    t.seed(0, 0, 1, 'the empty set: one matching, no edges')
    for (let m = 1; m < N; m++) {
      const low = m & -m, v = 31 - Math.clz32(low), rest = m ^ low
      const us = range(0, n - 1).filter(u => rest & adj[v] & (1 << u))
      t.set(0, m, sum(us.map(u => t.get(0, rest ^ (1 << u)))), us.map(u => [0, rest ^ (1 << u)]), us.length ? `vertex ${v} pairs with ${us.join(' or ')}: ${sumRule(us.map(u => `D(${bits(rest ^ (1 << u), n)})`), us.map(u => t.get(0, rest ^ (1 << u))), '0')}` : `vertex ${v} has no partner here: 0`)
    }
    return { title: `${n} vertices, ${edges.length} edges`, setup: 'D(mask): the perfect matchings of the vertices in mask. Its lowest vertex must be paired with a neighbour in mask; then match the rest.', table: t, answer: [0, N - 1], args: [n, edges] }
  },
  'subset-coloring': ({ n = 4, edges = [[0, 1], [1, 2], [2, 3], [3, 0]] } = {}) => {
    const N = 1 << n, adj = range(0, n - 1).map(v => edges.reduce((m, [a, b]) => (a === v ? m | (1 << b) : b === v ? m | (1 << a) : m), 0))
    const t = table(['independent', 'colours'], range(0, N - 1).map(m => bits(m, n)), (r, c) => `${r ? 'χ' : 'I'}(${bits(c, n)})`)
    t.seed(0, 0, true, 'the empty set has no edge inside'); t.seed(1, 0, 0, 'no vertices, no colours')
    for (let m = 1; m < N; m++) { const low = m & -m, v = 31 - Math.clz32(low), ok = t.get(0, m ^ low) && !(adj[v] & m); t.set(0, m, ok, [[0, m ^ low]], `I(${bits(m ^ low, n)}) and ${v} has no neighbour in the set`) }
    for (let m = 1; m < N; m++) {
      const low = m & -m, rest = m ^ low, opts = []
      for (let s = rest; ; s = (s - 1) & rest) { if (t.get(0, s | low)) opts.push({ c: s | low, value: t.get(1, rest ^ s) + 1 }); if (s === 0) break }
      t.set(1, m, minOf(opts.map(o => o.value)), opts.flatMap(o => [[0, o.c], [1, m ^ o.c]]), `a colour class with vertex ${31 - Math.clz32(low)}: min(${opts.map(o => `χ(${bits(m ^ o.c, n)}) + 1`).join(', ')}) = min(${opts.map(o => o.value).join(', ')})`)
    }
    return { title: `${n} vertices, ${edges.length} edges`, setup: 'Top row: is the set independent (no edge inside)? Bottom row: the fewest colours for the set. One colour class contains its lowest vertex and must be independent; the rest is coloured as well as possible.', table: t, answer: [1, N - 1], args: [n, edges] }
  },
  'mask-language': ({ bits: B = [[1, 1, 0, 0, 0, 0, 0, 0], [0, 1, 1, 0, 0, 0, 0, 1]] } = {}) => {
    const sets = B.map(row => range(0, row.length - 1).filter(i => row[i])), W = B[0].length
    const t = table([...B.map((_, i) => `after set ${i}`), 'decimal'], range(0, W - 1).map(i => `bit ${i}`), (r, c) => (r === B.length ? 'decimal' : `x${r}[${c}]`))
    for (let r = 0; r < B.length; r++) for (let c = 0; c < W; c++) {
      if (r === 0) { t.set(0, c, B[0][c], [], `set 0 ${B[0][c] ? 'has' : 'doesn’t have'} bit ${c}`); continue }
      t.set(r, c, t.get(r - 1, c) ^ B[r][c], [[r - 1, c]], `${t.get(r - 1, c)} XOR ${B[r][c]} (set ${r} ${B[r][c] ? 'has' : 'doesn’t have'} bit ${c})`)
    }
    const last = B.length - 1, on = range(0, W - 1).filter(c => t.get(last, c))
    const value = on.reduce((x, c) => x + 2 ** c, 0)
    t.set(B.length, 0, value, range(0, W - 1).map(c => [last, c]), on.length ? `${on.map(c => `2^${c}`).join(' + ')} = ${value}` : 'no bit set: 0')
    return { title: `${B.length} sets of bits`, setup: 'Each row is the running XOR after one more set: a bit stays on when an odd number of the sets have it. The last row reads the final bits as a number. (Here masks have at most 8 bits; the challenge’s masks reach bit 99, which is why it uses BigInt and returns a string.)', table: t, answer: [B.length, 0], args: [sets], input: { bits: B }, check: w => Number(w) }
  },
  // ── Digit and automaton DP (Advanced). Digit tables: a column per digit position, filled from the end;
  // each cell counts the ways to finish from there. Automaton tables: a column per length so far. ──
  'digit-tight': ({ n = 444 } = {}) => {
    const d = digitsOfNumber(n), L = d.length
    const t = table(['tight', 'free'], [...d.map((x, i) => `${i}: ${x}`), 'end'], (r, c) => `${r ? 'F' : 'T'}(${c})`)
    t.seed(0, L, 1, 'every position filled: one number'); t.seed(1, L, 1, 'every position filled: one number')
    for (let p = L - 1; p >= 0; p--) {
      const below = range(0, d[p] - 1).filter(x => x !== 4).length
      digitCell(t, 0, p, [[1, below, `digits below ${d[p]}${d[p] > 4 ? ' except 4' : ''}`], ...(d[p] !== 4 ? [[0, 1, `the digit ${d[p]}`]] : [])])
      digitCell(t, 1, p, [[1, 9, 'any digit but 4']])
    }
    return { title: `0 to ${n}, no digit 4`, setup: 'T(p): ways to finish from position p while still equal to n’s prefix (tight); F(p): once already below n (free). A tight position may use digits up to n’s; below n’s digit it becomes free. 4 is never used.', table: t, answer: [0, 0], args: [n] }
  },
  'digit-leading': ({ n = 2023 } = {}) => {
    const d = digitsOfNumber(n), L = d.length
    const rows = [[1, 0], [1, 1], [0, 0], [0, 1]], row = (tg, st) => rows.findIndex(x => x[0] === tg && x[1] === st)
    const t = table(['tight, not started', 'tight, started', 'free, not started', 'free, started'], [...d.map((x, i) => `${i}: ${x}`), 'end'], (r, c) => `${['TN', 'TS', 'FN', 'FS'][r]}(${c})`)
    for (const [r, [, st]] of rows.entries()) t.seed(r, L, st ? 1 : 0, st ? 'a number that started: 1' : 'never started: the number 0, not counted')
    for (let p = L - 1; p >= 0; p--) for (const [r, [tg, st]] of rows.entries()) {
      const top = tg ? d[p] : 9, groups = new Map()
      for (let x = 0; x <= top; x++) { if (x === 0 && st) continue; const to = row(tg && x === top ? 1 : 0, st || x !== 0 ? 1 : 0); groups.set(to, (groups.get(to) ?? 0) + 1) }
      digitCell(t, r, p, [...groups].map(([to, k]) => [to, k, '']))
    }
    return { title: `1 to ${n}, no digit 0`, setup: 'Four states: tight or free, and whether the number has started. Before it starts, a 0 is padding and allowed; after, 0 is forbidden. Only numbers that started count at the end.', table: t, answer: [row(1, 0), 0], args: [n] }
  },
  'digit-range': ({ lo = 123, hi = 4567 } = {}) => {
    const blocks = [['hi', hi], ...(lo > 0 ? [['lo − 1', lo - 1]] : [])], L = String(hi).length
    const labels = blocks.flatMap(([b]) => [`${b}: tight, no 7`, `${b}: tight, 7`, `${b}: free, no 7`, `${b}: free, 7`])
    const t = table(labels, [...range(0, L - 1).map(i => `pos ${i}`), 'end', 'answer'], (r, c) => (c === L + 1 ? 'answer' : `${blocks[Math.floor(r / 4)][0]}·${['TN', 'T7', 'FN', 'F7'][r % 4]}(${c})`))
    for (const [b, [, x]] of blocks.entries()) {
      const d = String(x).padStart(L, '0').split('').map(Number), at = (tg, sn) => 4 * b + (tg ? 0 : 2) + (sn ? 1 : 0)
      for (let k = 0; k < 4; k++) t.seed(4 * b + k, L, k % 2, k % 2 ? 'has a 7: counted' : 'no 7: not counted')
      for (let p = L - 1; p >= 0; p--) for (const tg of [1, 0]) for (const sn of [0, 1]) {
        const top = tg ? d[p] : 9, groups = new Map()
        for (let y = 0; y <= top; y++) { const to = at(tg && y === top, sn || y === 7); groups.set(to, (groups.get(to) ?? 0) + 1) }
        digitCell(t, at(tg, sn), p, [...groups].map(([to, k]) => [to, k, '']))
      }
    }
    const F = t.get(0, 0), G = blocks.length > 1 ? t.get(4, 0) : 0
    t.set(0, L + 1, F - G, blocks.length > 1 ? [[0, 0], [4, 0]] : [[0, 0]], blocks.length > 1 ? `F(${hi}) − F(${lo - 1}) = ${F} − ${G}` : `F(${hi}) = ${F}`)
    return { title: `${lo} to ${hi}, containing a 7`, setup: `The top block counts F(${hi}), the numbers from 0 to ${hi} with a 7${blocks.length > 1 ? `; the bottom block counts F(${lo - 1}), padded to the same length` : ''}. Each block: tight or free, and whether a 7 has appeared. The answer subtracts.`, table: t, answer: [0, L + 1], args: [lo, hi] }
  },
  'digit-adjacency': ({ n = 1357 } = {}) => {
    const d = digitsOfNumber(n), L = d.length, lasts = [-1, ...range(0, 9)]
    const row = (tg, last) => (tg ? 0 : 11) + lasts.indexOf(last)
    const t = table([...lasts.map(x => `tight, last ${x < 0 ? '—' : x}`), ...lasts.map(x => `free, last ${x < 0 ? '—' : x}`)], [...d.map((x, i) => `${i}: ${x}`), 'end'], (r, c) => `${r < 11 ? 'T' : 'F'}${lasts[r % 11] < 0 ? '−' : lasts[r % 11]}(${c})`)
    for (let r = 0; r < 22; r++) t.seed(r, L, lasts[r % 11] >= 0 ? 1 : 0, lasts[r % 11] >= 0 ? 'a number that started: 1' : 'never started: 0, not counted')
    for (let p = L - 1; p >= 0; p--) for (const tg of [1, 0]) for (const last of lasts) {
      const top = tg ? d[p] : 9, groups = new Map()
      for (let x = 0; x <= top; x++) {
        let next
        if (last < 0 && x === 0) next = -1
        else if (last < 0 || Math.abs(x - last) >= 2) next = x
        else continue
        const to = row(tg && x === top ? 1 : 0, next); groups.set(to, (groups.get(to) ?? 0) + 1)
      }
      digitCell(t, row(tg, last), p, [...groups].map(([to, k]) => [to, k, '']))
    }
    return { title: `1 to ${n}, neighbours differ by 2 or more`, setup: 'Rows: tight or free, and the last real digit (— before the number starts). A digit may follow last only if they differ by at least 2; padding zeros keep —. Only numbers that started count.', table: t, answer: [row(1, -1), 0], args: [n] }
  },
  'digit-aggregate': ({ n = 82 } = {}) => {
    const d = digitsOfNumber(n), L = d.length, states = [[1, 0], [1, 1], [0, 0], [0, 1]]
    const name = ([tg, st]) => `${tg ? 'tight' : 'free'}${st ? '' : ', not started'}`
    const t = table(states.flatMap(s => [`${name(s)}: count`, `${name(s)}: total`]), [...range(0, L).map(k => `${k} digit${k === 1 ? '' : 's'}`), 'answer'], (r, c) => (c === L + 1 ? 'answer' : `${r % 2 ? 'total' : 'count'}${Math.floor(r / 2)}(${c})`))
    states.forEach((s, i) => { t.seed(2 * i, 0, i === 0 ? 1 : 0, i === 0 ? 'one empty prefix' : 'nothing yet'); t.seed(2 * i + 1, 0, 0, 'value 0') })
    for (let k = 1; k <= L; k++) states.forEach(([tg, st], i) => {
      // Every earlier state and digit that lands here.
      const from = []
      states.forEach(([pt, ps], j) => { const top = pt ? d[k - 1] : 9; for (let x = 0; x <= top; x++) { if (x % 2 === 0 && (ps || x !== 0)) continue; if ((pt && x === top ? 1 : 0) === tg && (ps || x !== 0 ? 1 : 0) === st) from.push({ j, x }) } })
      const c = sum(from.map(f => t.get(2 * f.j, k - 1))), tot = sum(from.map(f => 10 * t.get(2 * f.j + 1, k - 1) + f.x * t.get(2 * f.j, k - 1)))
      const reads = from.flatMap(f => [[2 * f.j, k - 1], [2 * f.j + 1, k - 1]])
      t.set(2 * i, k, c, reads, from.length ? `${from.map(f => `count${f.j}(${k - 1})`).join(' + ')} = ${c}` : 'nothing lands here: 0')
      t.set(2 * i + 1, k, tot, reads, from.length ? `Σ (10 · total + ${'digit'} · count) = ${from.map(f => `(10·${t.get(2 * f.j + 1, k - 1)} + ${f.x}·${t.get(2 * f.j, k - 1)})`).join(' + ')}` : 'nothing lands here: 0')
    })
    t.set(0, L + 1, t.get(3, L) + t.get(7, L), [[3, L], [7, L]], `the started totals: ${t.get(3, L)} + ${t.get(7, L)}`)
    return { title: `All-odd numbers up to ${n}`, setup: 'Forward, one digit at a time: each state carries how many valid prefixes reach it and the sum of their values. Appending digit d turns the sum into 10 · total + d · count. The answer adds the totals of the states that started.', table: t, answer: [0, L + 1], args: [n] }
  },
  'kmp-dp': ({ alphabet = 'ab', pattern = 'aba', length = 6 } = {}) => {
    const step = kmpStep(pattern, alphabet), P = pattern.length
    const t = table(range(0, P - 1).map(q => `“${pattern.slice(0, q)}” matched`), [...range(0, length).map(l => `length ${l}`), 'answer'], (r, c) => (c === length + 1 ? 'answer' : `W(${r},${c})`))
    for (let q = 0; q < P; q++) t.seed(q, 0, q === 0 ? 1 : 0, q === 0 ? 'the empty string: nothing matched' : 'the empty string matches nothing')
    for (let l = 1; l <= length; l++) for (let q = 0; q < P; q++) {
      const from = []
      for (let p = 0; p < P; p++) for (const ch of alphabet) if (step[p][ch] === q) from.push({ p, ch })
      t.set(q, l, sum(from.map(f => t.get(f.p, l - 1))), from.map(f => [f.p, l - 1]), from.length ? `${from.map(f => `W(${f.p},${l - 1}) + ${f.ch}`).join(', ')}: ${from.map(f => t.get(f.p, l - 1)).join(' + ')}` : 'no letter leads here: 0')
    }
    t.set(0, length + 1, sum(range(0, P - 1).map(q => t.get(q, length))), range(0, P - 1).map(q => [q, length]), `every state at length ${length}: ${range(0, P - 1).map(q => t.get(q, length)).join(' + ')}`)
    return { title: `Avoid “${pattern}”, length ${length}`, setup: 'Rows: how much of the pattern the string ends with. Each cell collects the strings one letter shorter whose next letter leads here (the KMP automaton’s step). Reaching the whole pattern is never allowed, so it has no row.', table: t, answer: [0, length + 1], args: [alphabet, pattern, length] }
  },
  'aho-dp': ({ alphabet = 'ab', patterns = ['aa', 'bb'], length = 5 } = {}) => {
    const { go, bad, word } = ahoAutomaton(alphabet, patterns), good = range(0, go.length - 1).filter(u => !bad[u])
    const t = table(good.map(u => `“${word[u]}”`), [...range(0, length).map(l => `length ${l}`), 'answer'], (r, c) => (c === length + 1 ? 'answer' : `W(${word[good[r]] || 'root'},${c})`))
    good.forEach((u, r) => t.seed(r, 0, u === 0 ? 1 : 0, u === 0 ? 'the empty string is at the root' : 'the empty string is only at the root'))
    for (let l = 1; l <= length; l++) good.forEach((v, r) => {
      const from = []
      good.forEach((u, q) => { for (const ch of alphabet) if (go[u][ch] === v) from.push({ q, u, ch }) })
      t.set(r, l, sum(from.map(f => t.get(f.q, l - 1))), from.map(f => [f.q, l - 1]), from.length ? `${from.map(f => `“${word[f.u]}” + ${f.ch}`).join(', ')}: ${from.map(f => t.get(f.q, l - 1)).join(' + ')}` : 'no letter leads here: 0')
    })
    t.set(0, length + 1, sum(good.map((_, r) => t.get(r, length))), good.map((_, r) => [r, length]), `every allowed node: ${good.map((_, r) => t.get(r, length)).join(' + ')}`)
    return { title: `Avoid ${patterns.map(p => `“${p}”`).join(', ')}`, setup: 'Rows: the allowed nodes of the Aho–Corasick automaton (the longest suffix of the string that starts a pattern). Forbidden nodes, where a pattern has just ended, have no row. Each cell collects the shorter strings whose next letter leads here.', table: t, answer: [0, length + 1], args: [alphabet, patterns, length] }
  },
  'automaton-product': ({ pattern = '12', m = 3, length = 3 } = {}) => {
    const step = kmpStep(pattern, '0123456789'), P = pattern.length
    const rows = range(0, P).flatMap(q => range(0, m - 1).map(r => [q, r])), at = (q, r) => q * m + r
    const t = table(rows.map(([q, r]) => `${q === P ? 'found' : `“${pattern.slice(0, q)}”`}, r ${r}`), range(0, length).map(l => `length ${l}`), (rr, c) => `W(${rows[rr][0]},${rows[rr][1]},${c})`)
    rows.forEach(([q, r], i) => t.seed(i, 0, q === 0 && r === 0 ? 1 : 0, q === 0 && r === 0 ? 'the empty string: nothing matched, value 0' : 'the empty string is elsewhere'))
    for (let l = 1; l <= length; l++) rows.forEach(([q, r], i) => {
      const from = []
      rows.forEach(([pq, pr], j) => { for (let x = 0; x <= 9; x++) { const to = pq === P ? P : step[pq][String(x)]; if (to === q && (pr * 10 + x) % m === r) from.push({ j, x }) } })
      t.set(i, l, sum(from.map(f => t.get(f.j, l - 1))), [...new Set(from.map(f => f.j))].map(j => [j, l - 1]), from.length ? `${from.length} (state, digit) pairs lead here: ${sum(from.map(f => t.get(f.j, l - 1)))}` : 'nothing leads here: 0')
    })
    return { title: `Contains “${pattern}”, divisible by ${m}`, setup: 'Rows pair the pattern state (how much is matched, or found) with the value modulo m. A digit advances both: the automaton steps, and r becomes (10r + d) mod m. Once found, always found. The answer is found with remainder 0.', table: t, answer: [at(P, 0), length], args: [pattern, m, length] }
  },
  // ── State and transition reduction (Expert). Each table shows every value a program computes; the
  // setup says which of them it actually keeps at once. ──
  'rolling-arrays': ({ grid: g = [[0, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1], [1, 0, 0, 0]] } = {}) => {
    const R = g.length, C = g[0].length
    const t = table(range(0, R - 1).map(r => `row after ${r}`), range(0, C - 1).map(String), (r, c) => `row${r}[${c}]`)
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (g[r][c]) { t.set(r, c, 0, [], 'blocked: 0'); continue }
      if (r === 0 && c === 0) { t.set(0, 0, 1, [], 'the start: 1'); continue }
      const reads = [...(r > 0 ? [[r - 1, c]] : []), ...(c > 0 ? [[r, c - 1]] : [])]
      t.set(r, c, sum(reads.map(([a, b]) => t.get(a, b))), reads, sumRule(reads.map(([a, b]) => (a < r ? `old row[${b}]` : `new row[${b}]`)), reads.map(([a, b]) => t.get(a, b)), '0'))
    }
    return { title: `Paths in a ${R} × ${C} grid`, setup: 'Each row of this table is the single array row after one more grid row. Updating row[c] in place: its old value is the cell above, and row[c − 1] is already the new cell to the left. Only the latest row is ever kept.', table: t, answer: [R - 1, C - 1], args: [g] }
  },
  'in-place': ({ items = [[3, 4, 0], [2, 3, 1]], cap = 7 } = {}) => {
    const t = table(['start', ...items.map(([w, v, many], i) => `after ${i} (${w}, ${v}${many ? ', many' : ''})`)], range(0, cap).map(String), (r, c) => `B${r}(${c})`)
    for (let c = 0; c <= cap; c++) t.seed(0, c, 0, 'no items: 0')
    items.forEach(([w, v, many], i) => {
      const r = i + 1
      for (let c = 0; c <= cap; c++) {
        if (c < w) { t.set(r, c, t.get(r - 1, c), [[r - 1, c]], `doesn’t fit: B${r - 1}(${c}) = ${t.get(r - 1, c)}`); continue }
        // An unlimited item reads this row (already updated), a once-only item the row before.
        const from = many ? r : r - 1
        const take = t.get(from, c - w) + v
        t.set(r, c, Math.max(t.get(r - 1, c), take), [[r - 1, c], [from, c - w]], `max(skip: B${r - 1}(${c}), take: ${v} + B${from}(${c - w})) = max(${t.get(r - 1, c)}, ${take})`)
      }
    })
    return { title: `Capacity ${cap}`, setup: 'Each row is the single array best after one more item. A once-only item reads the row before (in place, a downward scan keeps those values); an unlimited item reads its own row, already updated (an upward scan), so it can be taken again.', table: t, answer: [items.length, cap], args: [items, cap] }
  },
  'prefix-sum-dp': ({ n = 7, k = 3 } = {}) => {
    const t = table(['ways', 'prefix'], range(0, n).map(String), (r, c) => `${r ? 'P' : 'W'}(${c})`)
    t.seed(0, 0, 1, 'one way to stand at the bottom'); t.seed(1, 0, 1, 'P(1) = W(0) = 1 (shown under stair 0)')
    for (let i = 1; i <= n; i++) {
      const lo = Math.max(0, i - k), viaLo = lo > 0 ? t.get(1, lo - 1) : 0
      t.set(0, i, t.get(1, i - 1) - viaLo, lo > 0 ? [[1, i - 1], [1, lo - 1]] : [[1, i - 1]], lo > 0 ? `P up to ${i - 1} − P up to ${lo - 1} = ${t.get(1, i - 1)} − ${viaLo}` : `everything below: P up to ${i - 1} = ${t.get(1, i - 1)}`)
      t.set(1, i, t.get(1, i - 1) + t.get(0, i), [[1, i - 1], [0, i]], `${t.get(1, i - 1)} + ${t.get(0, i)}`)
    }
    return { title: `${n} stairs, steps 1 to ${k}`, setup: `Top row: ways to reach each stair. Bottom row: the running total of ways up to and including that stair. ways(i) adds the last ${k} stairs’ ways: one subtraction of running totals instead of ${k} additions.`, table: t, answer: [0, n], args: [n, k] }
  },
  'difference-dp': ({ limits = [1, 2, 3], total = 4 } = {}) => {
    const t = table(['start', ...limits.map((l, i) => `child ${i} (≤ ${l})`)], range(0, total).map(String), (r, c) => `W${r}(${c})`)
    for (let c = 0; c <= total; c++) t.seed(0, c, c === 0 ? 1 : 0, c === 0 ? 'no children: one way to give 0' : 'no children can’t give candies: 0')
    limits.forEach((lim, i) => {
      const r = i + 1
      for (let c = 0; c <= total; c++) {
        const from = range(Math.max(0, c - lim), c)
        t.set(r, c, sum(from.map(x => t.get(r - 1, x))), from.map(x => [r - 1, x]), `child ${i} takes 0 to ${Math.min(lim, c)}: ${from.map(x => t.get(r - 1, x)).join(' + ')}`)
      }
    })
    return { title: `Limits ${list(limits)}, total ${total}`, setup: 'Each row adds one child, who takes 0 to their limit. A cell adds a range of the row above. A program builds each row with a difference array (+ at the start of each range, − just after it) and one prefix sum, instead of adding every range term.', table: t, answer: [limits.length, total], args: [limits, total] }
  },
  'monotone-queue': ({ values: a = [1, -1, -2, 4, -7, 3], k = 2 } = {}) => {
    const t = table(['best'], a.map((v, i) => `${i} (${v})`), (r, c) => `B(${c})`)
    t.seed(0, 0, a[0], 'the start square')
    for (let i = 1; i < a.length; i++) {
      const win = range(Math.max(0, i - k), i - 1), j = win.reduce((b, x) => (t.get(0, x) > t.get(0, b) ? x : b), win[0])
      t.set(0, i, a[i] + t.get(0, j), win.map(x => [0, x]), `${a[i]} + max(${win.map(x => `B(${x})`).join(', ')}) = ${a[i]} + ${t.get(0, j)}`)
    }
    return { title: `Values ${list(a)}, jumps up to ${k}`, setup: `B(i): the best path sum landing on square i: its value plus the best of the last ${k} squares. A monotone queue keeps the window’s best at its front, so each maximum costs O(1).`, table: t, answer: [0, a.length - 1], args: [a, k] }
  },
  'fenwick-dp': ({ values: a = [1, 3, 2, 4] } = {}) => {
    const t = table(['ending here', 'total'], a.map((v, i) => `${i} (${v})`), (r, c) => `${r ? 'T' : 'E'}(${c})`)
    for (let i = 0; i < a.length; i++) {
      const from = range(0, i - 1).filter(j => a[j] < a[i])
      t.set(0, i, 1 + sum(from.map(j => t.get(0, j))), from.map(j => [0, j]), from.length ? `1 + ${from.map(j => `E(${j})`).join(' + ')} = 1 + ${from.map(j => t.get(0, j)).join(' + ')}` : 'nothing smaller before it: just itself, 1')
      t.set(1, i, (i ? t.get(1, i - 1) : 0) + t.get(0, i), i ? [[1, i - 1], [0, i]] : [[0, i]], i ? `${t.get(1, i - 1)} + ${t.get(0, i)}` : `${t.get(0, i)}`)
    }
    return { title: `Values ${list(a)}`, setup: 'E(i): increasing subsequences ending at position i: itself, plus every one ending at a smaller earlier value, extended. A Fenwick tree indexed by value rank gives that sum in O(log n). The bottom row is the running total.', table: t, answer: [1, a.length - 1], args: [a] }
  },
  'segment-tree-dp': ({ values: a = [1, 5, 2, 6, 3], d = 1 } = {}) => {
    const t = table(['longest'], a.map((v, i) => `${i} (${v})`), (r, c) => `L(${c})`)
    for (let i = 0; i < a.length; i++) {
      const from = range(0, i - 1).filter(j => Math.abs(a[j] - a[i]) <= d)
      t.set(0, i, 1 + maxOf([0, ...from.map(j => t.get(0, j))]), from.map(j => [0, j]), from.length ? `1 + max(${from.map(j => `L(${j})`).join(', ')})` : `no earlier value within ${d}: 1`)
    }
    return { title: `Values ${list(a)}, d = ${d}`, setup: `L(i): the longest valid subsequence ending at position i: 1 + the best ending at an earlier value within ${d} of a[i]. A segment tree over the values answers that range maximum in O(log n). The answer is the largest cell.`, table: t, answer: bestCell(t), args: [a, d] }
  },
  'coordinate-compression': ({ values: a = [5, 1, 6, 2, 7] } = {}) => {
    const ranks = [...new Set(a)].sort((x, y) => x - y)
    const t = table(['rank', 'best sum'], a.map((v, i) => `${i} (${v})`), (r, c) => `${r ? 'S' : 'rank'}(${c})`)
    a.forEach((v, i) => t.seed(0, i, ranks.indexOf(v) + 1, `${v} is number ${ranks.indexOf(v) + 1} among the distinct values`))
    for (let i = 0; i < a.length; i++) {
      const from = range(0, i - 1).filter(j => t.get(0, j) < t.get(0, i))
      t.set(1, i, a[i] + maxOf([0, ...from.map(j => t.get(1, j))]), [[0, i], ...from.flatMap(j => [[0, j], [1, j]])], from.length ? `${a[i]} + max(${from.map(j => `S(${j})`).join(', ')})` : `no smaller rank before it: ${a[i]}`)
    }
    return { title: `Values ${list(a)}`, setup: 'Top row: each value’s rank among the distinct values, the index a program stores it under. Bottom row: the best increasing sum ending here: the real value, plus the best sum at a smaller rank.', table: t, answer: bestInRow(t, 1), args: [a] }
  },
  'bitset-dp': ({ values: v = [2, 3, 5] } = {}) => {
    const S = sum(v)
    const t = table(['start', ...v.map(x => `after ${x}`), 'count'], range(0, S).map(String), (r, c) => (r > v.length ? 'count' : `R${r}(${c})`))
    for (let c = 0; c <= S; c++) t.seed(0, c, c === 0, c === 0 ? 'the empty choice makes 0' : 'nothing chosen yet')
    v.forEach((x, i) => {
      const r = i + 1
      for (let c = 0; c <= S; c++) {
        const reads = [[r - 1, c], ...(c >= x ? [[r - 1, c - x]] : [])]
        t.set(r, c, t.get(r - 1, c) || (c >= x && t.get(r - 1, c - x)), reads, c >= x ? `R${r - 1}(${c}) or R${r - 1}(${c - x})` : `too small for ${x}: R${r - 1}(${c})`)
      }
    })
    const last = v.length
    t.set(last + 1, 0, range(0, S).filter(c => t.get(last, c)).length, range(0, S).map(c => [last, c]), `the T cells in the last row: ${range(0, S).filter(c => t.get(last, c)).join(', ')}`)
    return { title: `Values ${list(v)}`, setup: 'Each row is one bitset after adding one value: bit t is T when total t is reachable. B | (B << v) is the whole row at once: the old bits, and every bit moved up by v. The last row counts the reachable totals.', table: t, answer: [last + 1, 0], args: [v] }
  },
  'bounded-binary': ({ weights: w = [2, 3], values: val = [3, 5], counts = [3, 1], cap = 8 } = {}) => {
    const bundles = []
    w.forEach((x, i) => { let m = Math.min(counts[i], Math.floor(cap / x)); for (let k = 1; m > 0; k *= 2) { const take = Math.min(k, m); bundles.push([i, take]); m -= take } })
    const t = table(['start', ...bundles.map(([i, k]) => `${k} × item ${i}`)], range(0, cap).map(String), (r, c) => `B${r}(${c})`)
    for (let c = 0; c <= cap; c++) t.seed(0, c, 0, 'no bundles: 0')
    bundles.forEach(([i, k], b) => {
      const r = b + 1, W = k * w[i], V = k * val[i]
      for (let c = 0; c <= cap; c++) {
        if (c < W) { t.set(r, c, t.get(r - 1, c), [[r - 1, c]], `bundle doesn’t fit: B${r - 1}(${c})`); continue }
        t.set(r, c, Math.max(t.get(r - 1, c), t.get(r - 1, c - W) + V), [[r - 1, c], [r - 1, c - W]], `max(B${r - 1}(${c}), ${V} + B${r - 1}(${c - W})) = max(${t.get(r - 1, c)}, ${t.get(r - 1, c - W) + V})`)
      }
    })
    return { title: `Counts ${list(counts)}, capacity ${cap}`, setup: 'Each count is split into bundles of 1, 2, 4, … copies plus a remainder; each row is one bundle, treated as a 0/1 item. Any number of copies up to the count is some set of bundles.', table: t, answer: [bundles.length, cap], args: [w, val, counts, cap] }
  },
  'bounded-queue': ({ weights: w = [1, 2, 3], counts = [2, 1, 1], target = 5 } = {}) => {
    const t = table(['start', ...w.map((x, i) => `item ${i} (w ${x}, ≤ ${counts[i]})`)], range(0, target).map(String), (r, c) => `W${r}(${c})`)
    for (let c = 0; c <= target; c++) t.seed(0, c, c === 0 ? 1 : 0, c === 0 ? 'one way to reach 0' : 'nothing reaches it yet')
    w.forEach((x, i) => {
      const r = i + 1
      for (let c = 0; c <= target; c++) {
        const from = range(0, counts[i]).map(q => c - q * x).filter(y => y >= 0)
        t.set(r, c, sum(from.map(y => t.get(r - 1, y))), from.map(y => [r - 1, y]), `0 to ${counts[i]} copies of weight ${x}: ${from.map(y => t.get(r - 1, y)).join(' + ')}`)
      }
    })
    return { title: `Target ${target}`, setup: 'Each row adds one item, taken 0 to its count times. A cell adds the row above at c, c − w, c − 2w, …: a window along its residue mod w. A program slides that window instead of adding every term.', table: t, answer: [w.length, target], args: [w, counts, target] }
  },
  // ── Optimizing split-point searches (Expert) ──
  'monge': ({ A = [[0, 1, 4], [1, 0, 1], [4, 1, 0]] } = {}) => {
    const R = A.length, C = A[0].length
    const t = table([...A.map((_, i) => `row ${i}`), ...range(0, R - 2).map(i => `square ${i}–${i + 1}`), 'Monge?'], range(0, C - 1).map(String), (r, c) => (r < R ? `A(${r},${c})` : r < 2 * R - 1 ? `s(${r - R},${c})` : 'Monge?'))
    A.forEach((row, i) => row.forEach((v, j) => t.seed(i, j, v, 'an entry of the matrix')))
    const squares = []
    for (let i = 0; i + 1 < R; i++) for (let j = 0; j + 1 < C; j++) {
      const s = A[i][j + 1] + A[i + 1][j] - A[i][j] - A[i + 1][j + 1]
      t.set(R + i, j, s, [[i, j + 1], [i + 1, j], [i, j], [i + 1, j + 1]], `crossed − diagonal: (${A[i][j + 1]} + ${A[i + 1][j]}) − (${A[i][j]} + ${A[i + 1][j + 1]})`)
      squares.push([R + i, j])
    }
    const bad = squares.filter(([r, c]) => t.get(r, c) < 0)
    t.set(2 * R - 1, 0, bad.length === 0, squares, squares.length ? (bad.length ? `${bad.length} square${bad.length > 1 ? 's' : ''} below 0: ${bad.map(([r, c]) => t.name(r, c)).join(', ')}` : 'every square is 0 or more') : 'no 2 × 2 squares: Monge')
    return { title: `${R} × ${C} matrix`, setup: 's(i, j) is the slack of the square of neighbouring cells at rows i, i + 1 and columns j, j + 1: the crossed pair minus the diagonal pair. The matrix is Monge when no slack is negative, because every larger rectangle’s slack is a sum of these.', table: t, answer: [2 * R - 1, 0], args: [A] }
  },
  'divide-conquer-opt': ({ values: a = [1, 2, 3, 4, 5, 6], g = 3 } = {}) => {
    const n = a.length, P = [0]
    a.forEach(x => P.push(P[P.length - 1] + x))
    const t = table(range(0, g).map(l => `${l} group${l === 1 ? '' : 's'}`), range(0, n).map(String), (r, c) => `D(${r},${c})`)
    for (let j = 0; j <= n; j++) t.seed(0, j, j === 0 ? 0 : INF, j === 0 ? 'nothing cut into 0 groups: 0' : 'numbers left over with no groups: impossible')
    for (let l = 1; l <= g; l++) {
      t.seed(l, 0, INF, 'no numbers can’t make a non-empty group')
      const fill = (lo, hi, klo, khi) => {
        if (lo > hi) return
        const mid = Math.floor((lo + hi) / 2), ks = range(klo, Math.min(mid - 1, khi))
        let best = INF, at = klo
        for (const k of ks) { const v = t.get(l - 1, k) + (P[mid] - P[k]) ** 2; if (v < best) { best = v; at = k } }
        t.set(l, mid, best, ks.map(k => [l - 1, k]), !ks.length ? `no cut in range ${klo} to ${Math.min(mid - 1, khi)}: impossible` : `cuts ${klo} to ${Math.min(mid - 1, khi)} only: min(${ks.map(k => `D(${l - 1},${k}) + ${P[mid] - P[k]}²`).join('; ')}) = min(${ks.map(k => show(t.get(l - 1, k) + (P[mid] - P[k]) ** 2)).join(', ')}); best cut ${at}`)
        fill(lo, mid - 1, klo, at)
        fill(mid + 1, hi, at, khi)
      }
      fill(1, n, 0, n - 1)
    }
    return { title: `Values ${list(a)}, ${g} groups`, setup: 'D(l, j): the cheapest way to cut the first j numbers into l groups, each costing its sum squared. Each row is filled middle first: the middle end tries the cuts in its range, and its best cut bounds the ends to its left from above and those to its right from below.', table: t, answer: [g, n], args: [a, g] }
  },
  'knuth': ({ values: a = [3, 1, 4, 1, 5] } = {}) => {
    const n = a.length
    const t = intervals(a.map((v, i) => `${i} (${v})`), 'D')
    const opt = Array.from({ length: n }, (_, i) => Array(n).fill(i))
    for (let i = 0; i < n; i++) t.seed(i, i, 0, 'D(i,i) = 0: already one pile')
    byLength(n, 1, (l, r) => {
      const s = a.slice(l, r + 1).reduce((x, y) => x + y, 0), ks = range(opt[l][r - 1], Math.min(opt[l + 1][r], r - 1)), sides = ks.map(k => t.get(l, k) + t.get(k + 1, r))
      const best = minOf(sides)
      opt[l][r] = ks[sides.indexOf(best)]
      t.set(l, r, s + best, ks.flatMap(k => [[l, k], [k + 1, r]]), `splits ${ks[0]} to ${ks[ks.length - 1]} only: ${s} + min(${ks.map(k => `D(${l},${k}) + D(${k + 1},${r})`).join('; ')}) = ${s} + min(${sides.join(', ')}); best split ${opt[l][r]}`)
    })
    return { title: `Piles ${list(a)}`, setup: 'D(l, r): the cheapest way to merge piles l to r into one. Knuth’s bound: the best split of l … r lies between the best splits of l … r − 1 and l + 1 … r, so each cell tries only the splits in that range.', table: t, answer: [0, n - 1], args: [a] }
  },
  'cht': ({ words: w = [3, 1, 2, 2], M = 4 } = {}) => {
    const P = [0]
    w.forEach(x => P.push(P[P.length - 1] + x))
    const t = line(w.length, 'D', t => t.seed(0, 0, 0, 'no words printed: 0'), (t, i) => {
      const js = range(0, i - 1), costs = js.map(j => t.get(0, j) + (P[i] - P[j]) ** 2 + M)
      return [minOf(costs), js, `min over the last line’s first word: ${js.map(j => `D(${j}) + ${P[i] - P[j]}² + ${M}`).join('; ')} = min(${costs.join(', ')})`]
    })
    return { title: `Words ${list(w)}, M = ${M}`, setup: `D(i): the cheapest way to print the first i words. The last line holds words j to i − 1. Each earlier j is the line y = −2P(j)·x + D(j) + P(j)², read at x = P(i); the hull finds the lowest without trying every j, as this table does.`, table: t, answer: [0, w.length], args: [w, M] }
  },
  'monotone-cht': ({ values: x = [2, 2, 3, 4], a = -1, b = 10, c = -20 } = {}) => {
    const P = [0]
    x.forEach(v => P.push(P[P.length - 1] + v))
    const worth = S => a * S * S + b * S + c
    const t = line(x.length, 'D', t => t.seed(0, 0, 0, 'no soldiers: 0'), (t, i) => {
      const js = range(0, i - 1), vals = js.map(j => t.get(0, j) + worth(P[i] - P[j]))
      return [maxOf(vals), js, `max over the last group’s start: ${js.map(j => `D(${j}) + f(${P[i] - P[j]})`).join('; ')} = max(${vals.join(', ')})`]
    })
    return { title: `Strengths ${list(x)}, f(S) = ${a}S² ${b < 0 ? '−' : '+'} ${Math.abs(b)}S ${c < 0 ? '−' : '+'} ${Math.abs(c)}`, setup: 'D(i): the best worth of the first i soldiers. The last group runs from j to i − 1, with sum S = P(i) − P(j). Each j is a line in x = P(i) whose slope −2a·P(j) rises, and the queries rise too, so a pointer finds the best line.', table: t, answer: [0, x.length], args: [x, a, b, c] }
  },
  'li-chao': ({ heights: h = [5, 1, 9, 2, 8], C = 4 } = {}) => {
    const t = line(h.length - 1, 'D', t => t.seed(0, 0, 0, 'the frog starts here: 0'), (t, i) => {
      const js = range(0, i - 1), costs = js.map(j => t.get(0, j) + (h[i] - h[j]) ** 2 + C)
      return [minOf(costs), js, `min over the stone it jumps from: ${js.map(j => `D(${j}) + (${h[i] - h[j]})² + ${C}`).join('; ')} = min(${costs.join(', ')})`]
    })
    return { title: `Heights ${list(h)}, C = ${C}`, setup: 'D(i): the cheapest way to reach stone i. Each earlier stone j is the line y = −2h(j)·x + D(j) + h(j)², read at x = h(i). The heights are in no order, so a Li Chao tree holds the lines; this table tries every j.', table: t, answer: [0, h.length - 1], args: [h, C] }
  },
  'slope-trick': ({ values: a = [3, 1, 2, 4, 2] } = {}) => {
    const vs = [...new Set(a)].sort((p, q) => p - q), n = a.length
    const t = table([...a.map((v, i) => `${i} (${v})`), 'best'], vs.map(String), (r, c) => (r < n ? `D(${r},${vs[c]})` : 'best'))
    a.forEach((x, i) => vs.forEach((v, c) => {
      const from = i ? range(0, c) : [], prev = from.map(u => t.get(i - 1, u))
      t.set(i, c, Math.abs(x - v) + (i ? minOf(prev) : 0), from.map(u => [i - 1, u]), i ? `|${x} − ${v}| + min(${from.map(u => t.get(i - 1, u)).join(', ')})` : `|${x} − ${v}|`)
    }))
    const last = range(0, vs.length - 1).map(c => t.get(n - 1, c))
    t.set(n, 0, minOf(last), range(0, vs.length - 1).map(c => [n - 1, c]), `min(${last.join(', ')})`)
    return { title: `Values ${list(a)}`, setup: 'D(i, v): the cheapest way to fix the first i + 1 values so that they never decrease and the last is v. It is |a(i) − v| plus the best of the row above at any value up to v. Each row is a convex function of v; slope trick keeps only its breakpoints.', table: t, answer: [n, 0], args: [a] }
  },
  'cdq': ({ x = [1, 3, 2, 4, 3], y = [2, 1, 3, 4, 2] } = {}) => {
    const t = line(x.length - 1, 'B', () => {}, (t, i) => {
      const js = range(0, i - 1).filter(j => x[j] < x[i] && y[j] < y[i])
      return [1 + maxOf([0, ...js.map(j => t.get(0, j))]), js, js.length ? `1 + max(${js.map(j => `B(${j})`).join(', ')}) = 1 + max(${js.map(j => t.get(0, j)).join(', ')})` : 'no earlier point below and left of it: 1']
    })
    t.colLabels = x.map((v, i) => `${i} (${v}, ${y[i]})`)
    return { title: `${x.length} points`, setup: 'B(i): the longest chain ending at point i, among earlier points with smaller x and smaller y. CDQ finds those earlier points half by half: the left half’s finished values are swept across to the right half by x, with a Fenwick tree over y.', table: t, answer: bestCell(t), args: [x, y] }
  },
  'online-convolution': ({ b = [0, 1, 1, 1], n = 6 } = {}) => {
    const t = line(n, 'a', t => t.seed(0, 0, 1, 'a(0) = 1'), (t, m) => {
      const is = range(0, m - 1).filter(i => m - i < b.length && b[m - i])
      return [is.reduce((s, i) => s + t.get(0, i) * b[m - i], 0), is, is.length ? `${is.map(i => `a(${i})·b(${m - i})`).join(' + ')} = ${is.map(i => `${t.get(0, i)}·${b[m - i]}`).join(' + ')}` : 'no earlier term reaches it: 0']
    })
    return { title: `b = ${list(b)}, n = ${n}`, setup: 'a(m) adds a(i)·b(m − i) over every earlier i: each term needs only finished earlier terms. Divide and conquer sends a finished left half’s terms to the right half in one convolution; the table shows every sum written out.', table: t, answer: [0, n], args: [b, n] }
  },
  // ── Algebraic acceleration and transforms (Expert) ──
  'matrix-power': ({ k = 3, edges = [[0, 1], [1, 2], [2, 0], [0, 2], [2, 2]], n = 4 } = {}) => {
    const t = table(range(0, n).map(s => `${s} edge${s === 1 ? '' : 's'}`), range(0, k - 1).map(v => `vertex ${v}`), (r, c) => `W(${r},${c})`)
    for (let v = 0; v < k; v++) t.seed(0, v, v === 0 ? 1 : 0, v === 0 ? 'the empty walk, at vertex 0' : 'no walk of 0 edges ends here')
    for (let s = 1; s <= n; s++) for (let v = 0; v < k; v++) {
      const into = edges.filter(([, w]) => w === v).map(([u]) => u)
      t.set(s, v, sum(into.map(u => t.get(s - 1, u))), [...new Set(into)].map(u => [s - 1, u]), into.length ? `${into.map(u => `W(${s - 1},${u})`).join(' + ')} = ${into.map(u => t.get(s - 1, u)).join(' + ')}` : 'no edge comes into it: 0')
    }
    return { title: `${k} vertices, walks of ${n} edges`, setup: 'W(s, v): the walks of s edges from vertex 0 that end at v. Every row is the row above times the adjacency matrix A, so row n is row 0 times Aⁿ, and Aⁿ takes about log₂ n squarings instead of n rows.', table: t, answer: [n, k - 1], args: [k, edges, n] }
  },
  'linear-recurrence': ({ c = [1, 1], a = [0, 1], n = 10 } = {}) => {
    const k = c.length, P = 998244353
    const t = line(n, 'a', t => a.slice(0, Math.min(k, n + 1)).forEach((x, i) => t.seed(0, i, x % P, 'given')), (t, i) => {
      const js = range(1, k)
      return [js.reduce((s, j) => (s + c[j - 1] * t.get(0, i - j)) % P, 0), js.map(j => i - j), js.map(j => `${c[j - 1]}·a(${i - j})`).join(' + ') + ` = ${js.map(j => `${c[j - 1]}·${t.get(0, i - j)}`).join(' + ')}`]
    })
    return { title: `a(i) = ${c.map((x, j) => `${x}·a(i − ${j + 1})`).join(' + ')}`, setup: 'Each term is a fixed combination of the k before it. Kitamasa’s method reaches a(n) without the terms in between: it reduces xⁿ modulo the recurrence, in about log₂ n squarings of polynomials of degree below k.', table: t, answer: [0, n], args: [c, a, n] }
  },
  'bostan-mori': ({ p = [1], r = [1, 1], n = 10 } = {}) => {
    const q = [1, ...r.map(x => -x)]
    const t = line(n, 'f', () => {}, (t, i) => {
      const js = range(1, r.length).filter(j => j <= i), top = p[i] ?? 0
      return [top + sum(js.map(j => r[j - 1] * t.get(0, i - j))), js.map(j => i - j), `P(${i}) + ${js.length ? js.map(j => `${r[j - 1]}·f(${i - j})`).join(' + ') : '0'} = ${top} + ${js.length ? js.map(j => `${r[j - 1]}·${t.get(0, i - j)}`).join(' + ') : '0'}`]
    })
    return { title: `P = ${list(p)}, Q = 1 − ${r.map((x, j) => `${x}x${j ? `^${j + 1}` : ''}`).join(' − ')}`, setup: 'f(i): the coefficient of xⁱ in P(x)/Q(x). Since Q·f = P, each f(i) is P(i) plus the r-weighted terms before it. Bostan–Mori finds f(n) without the terms in between, halving n at each step.', table: t, answer: [0, n], args: [p, q, n], input: { p, r, n } }
  },
  'generating-functions': ({ g = [1, 1, 1], m = 3, n = 4 } = {}) => {
    const t = line(n, 'f', t => t.seed(0, 0, 1, 'f(0) = 1, since g(0) = 1'), (t, k) => {
      const is = range(1, g.length - 1).filter(i => i <= k), terms = is.map(i => g[i] * t.get(0, k - i) * (m * i - (k - i)))
      return [sum(terms) / k, is.map(i => k - i), `(${is.length ? is.map(i => `${g[i]}·f(${k - i})·(${m}·${i} − ${k - i})`).join(' + ') : '0'}) / ${k} = ${sum(terms)} / ${k}`]
    })
    return { title: `(${g.map((x, i) => (i ? `${x}x${i > 1 ? `^${i}` : ''}` : x)).join(' + ')})^${m}`, setup: 'f(k): the coefficient of x^k in gᵐ. From g·f′ = m·g′·f, k·f(k) = Σ g(i)·f(k − i)·(m·i − (k − i)): each coefficient from the few before it, never multiplying g in m times.', table: t, answer: [0, n], args: [g, m, n] }
  },
  'fft-ntt': ({ a = [1, 2, 2], b = [0, 3] } = {}) => {
    const A = maxOf(a), B = maxOf(b), S = A + B
    const t = table(['count in a', 'count in b', 'c'], range(0, S).map(String), (r, c) => `${['A', 'B', 'c'][r]}(${c})`)
    for (let v = 0; v <= S; v++) { t.seed(0, v, a.filter(x => x === v).length, `values in a equal to ${v}`); t.seed(1, v, b.filter(x => x === v).length, `values in b equal to ${v}`) }
    for (let s = 0; s <= S; s++) {
      const is = range(0, s).filter(i => i <= A && s - i <= B)
      t.set(2, s, sum(is.map(i => t.get(0, i) * t.get(1, s - i))), is.flatMap(i => [[0, i], [1, s - i]]), `${is.map(i => `A(${i})·B(${s - i})`).join(' + ')} = ${is.map(i => `${t.get(0, i)}·${t.get(1, s - i)}`).join(' + ')}`)
    }
    return { title: `a = ${list(a)}, b = ${list(b)}`, setup: 'A and B count the values. c(s), the pairs adding up to s, is the coefficient of xˢ in A(x)·B(x): a convolution. An NTT computes the whole row at once in O(V log V); the table writes each sum out.', table: t, answer: [2, S], args: [a, b], check: want => want[want.length - 1] }
  },
  'sos': ({ values: a = [1, 2, 3, 4, 0, 1, 2, 3] } = {}) => {
    const N = a.length, n = Math.log2(N), bits = m => m.toString(2).padStart(Math.max(1, n), '0')
    const t = table(['a', ...range(0, n - 1).map(i => `after bit ${i}`)], range(0, N - 1).map(bits), (r, c) => `F${r}(${bits(c)})`)
    a.forEach((x, m) => t.seed(0, m, x, 'the value itself'))
    for (let i = 0; i < n; i++) for (let m = 0; m < N; m++) {
      const bit = 1 << i
      if (m & bit) t.set(i + 1, m, t.get(i, m) + t.get(i, m ^ bit), [[i, m], [i, m ^ bit]], `${t.name(i, m)} + ${t.name(i, m ^ bit)} = ${t.get(i, m)} + ${t.get(i, m ^ bit)}`)
      else t.set(i + 1, m, t.get(i, m), [[i, m]], `bit ${i} is not in ${bits(m)}: ${t.name(i, m)} = ${t.get(i, m)}`)
    }
    return { title: `a = ${list(a)}`, setup: 'One row per bit. After bit i, a mask holds the sum over its submasks that differ from it only in bits 0 … i: a mask with the bit adds in the mask without it. After the last bit, every submask is in: n · 2ⁿ additions instead of 3ⁿ.', table: t, answer: [n, N - 1], args: [a], check: want => want[N - 1] }
  },
  'mobius': ({ values: F = [1, 3, 4, 10, 1, 4, 6, 16] } = {}) => {
    const N = F.length, n = Math.log2(N), bits = m => m.toString(2).padStart(Math.max(1, n), '0')
    const t = table(['F', ...range(0, n - 1).map(i => `after bit ${i}`)], range(0, N - 1).map(bits), (r, c) => `a${r}(${bits(c)})`)
    F.forEach((x, m) => t.seed(0, m, x, 'the subset sum, given'))
    for (let i = 0; i < n; i++) for (let m = 0; m < N; m++) {
      const bit = 1 << i
      if (m & bit) t.set(i + 1, m, t.get(i, m) - t.get(i, m ^ bit), [[i, m], [i, m ^ bit]], `${t.name(i, m)} − ${t.name(i, m ^ bit)} = ${t.get(i, m)} − ${t.get(i, m ^ bit)}`)
      else t.set(i + 1, m, t.get(i, m), [[i, m]], `bit ${i} is not in ${bits(m)}: ${t.name(i, m)} = ${t.get(i, m)}`)
    }
    return { title: `F = ${list(F)}`, setup: 'One row per bit, undoing the subset sum: a mask with the bit takes away the mask without it, which removes everything that bit brought in. After the last bit, each value is back.', table: t, answer: [n, N - 1], args: [F], check: want => want[N - 1] }
  },
  'subset-convolution': ({ a = [1, 2, 0, 1], b = [3, 0, 1, 2] } = {}) => {
    const N = a.length, n = Math.log2(N), bits = m => m.toString(2).padStart(Math.max(1, n), '0')
    const t = table(['a', 'b', 'c'], range(0, N - 1).map(bits), (r, c) => `${['a', 'b', 'c'][r]}(${bits(c)})`)
    a.forEach((x, m) => { t.seed(0, m, x, 'given'); t.seed(1, m, b[m], 'given') })
    for (let S = 0; S < N; S++) {
      const Ts = range(0, N - 1).filter(T => (T & S) === T)
      t.set(2, S, sum(Ts.map(T => a[T] * b[S ^ T])), Ts.flatMap(T => [[0, T], [1, S ^ T]]), Ts.map(T => `a(${bits(T)})·b(${bits(S ^ T)})`).join(' + ') + ` = ${Ts.map(T => `${a[T]}·${b[S ^ T]}`).join(' + ')}`)
    }
    return { title: `a = ${list(a)}, b = ${list(b)}`, setup: 'c(S) adds a(T)·b(S without T) over every way to split S into two disjoint parts. The ranked transform gets every c at once in n² · 2ⁿ steps, by keeping only pairs whose sizes add up to |S|; the table lists every split.', table: t, answer: [2, N - 1], args: [a, b], check: want => want[N - 1] }
  },
  'walsh-hadamard': ({ a = [0, 1, 0, 2], b = [3, 0, 1, 0] } = {}) => {
    const N = a.length, n = Math.log2(N), bits = m => m.toString(2).padStart(Math.max(1, n), '0')
    const t = table(['a', 'b', 'c'], range(0, N - 1).map(bits), (r, c) => `${['a', 'b', 'c'][r]}(${bits(c)})`)
    a.forEach((x, m) => { t.seed(0, m, x, 'given'); t.seed(1, m, b[m], 'given') })
    for (let k = 0; k < N; k++) {
      const is = range(0, N - 1)
      t.set(2, k, sum(is.map(i => a[i] * b[i ^ k])), is.flatMap(i => [[0, i], [1, i ^ k]]), is.map(i => `a(${bits(i)})·b(${bits(i ^ k)})`).join(' + ') + ` = ${is.map(i => `${a[i]}·${b[i ^ k]}`).join(' + ')}`)
    }
    return { title: `a = ${list(a)}, b = ${list(b)}`, setup: 'c(k) adds a(i)·b(j) over every pair with i XOR j = k. The Walsh–Hadamard transform turns that into a pointwise product, so all of c costs n · 2ⁿ; the table lists every pair.', table: t, answer: [2, N - 1], args: [a, b], check: want => want[N - 1] }
  },
  'semirings': ({ k = 3, edges = [[0, 1, 2], [1, 2, 2], [0, 2, 7], [2, 2, 1]], n = 3 } = {}) => {
    const t = table(range(0, n).map(s => `${s} edge${s === 1 ? '' : 's'}`), range(0, k - 1).map(v => `vertex ${v}`), (r, c) => `C(${r},${c})`)
    for (let v = 0; v < k; v++) t.seed(0, v, v === 0 ? 0 : INF, v === 0 ? 'the empty walk costs 0' : 'no walk of 0 edges ends here: ∞')
    for (let s = 1; s <= n; s++) for (let v = 0; v < k; v++) {
      const into = edges.filter(([, w]) => w === v)
      const costs = into.map(([u, , w]) => t.get(s - 1, u) + w)
      t.set(s, v, minOf([INF, ...costs]), [...new Set(into.map(([u]) => u))].map(u => [s - 1, u]), into.length ? `min(${into.map(([u, , w]) => `C(${s - 1},${u}) + ${w}`).join('; ')}) = min(${costs.map(show).join(', ')})` : 'no edge comes into it: ∞')
    }
    return { title: `${k} vertices, walks of ${n} edges`, setup: 'C(s, v): the cheapest walk of s edges from vertex 0 to v. It is the walk-counting table with + replaced by min and × by +. That (min, +) product is associative, so the same repeated squaring reaches n edges in log₂ n steps.', table: t, answer: [n, k - 1], args: [k, edges, n], check: want => (want === -1 ? INF : want) }
  },
  'transfer-matrix': ({ w = 2, n = 4 } = {}) => {
    const S = 1 << w, bits = m => m.toString(2).padStart(w, '0')
    const T = Array.from({ length: S }, () => Array(S).fill(0))
    const fill = (r, covered, nxt, start) => {
      if (r === w) { T[start][nxt]++; return }
      if ((covered >> r) & 1) { fill(r + 1, covered, nxt, start); return }
      fill(r + 1, covered, nxt | (1 << r), start)
      if (r + 1 < w && !((covered >> (r + 1)) & 1)) fill(r + 2, covered, nxt, start)
    }
    for (let s = 0; s < S; s++) fill(0, s, 0, s)
    const t = table(range(0, n).map(c => `${c} column${c === 1 ? '' : 's'}`), range(0, S - 1).map(bits), (r, c) => `W(${r},${bits(c)})`)
    for (let s = 0; s < S; s++) t.seed(0, s, s === 0 ? 1 : 0, s === 0 ? 'nothing placed, nothing sticking out' : 'nothing can stick out before the first column')
    for (let c = 1; c <= n; c++) for (let s2 = 0; s2 < S; s2++) {
      const from = range(0, S - 1).filter(s => T[s][s2])
      t.set(c, s2, sum(from.map(s => T[s][s2] * t.get(c - 1, s))), from.map(s => [c - 1, s]), from.length ? `${from.map(s => `T(${bits(s)},${bits(s2)})·W(${c - 1},${bits(s)})`).join(' + ')} = ${from.map(s => `${T[s][s2]}·${t.get(c - 1, s)}`).join(' + ')}` : 'no column leaves this pattern: 0')
    }
    return { title: `A ${w} × ${n} board`, setup: `W(c, s): the ways to fill the first c columns with s the cells sticking into the next (1 = covered by a horizontal domino). T(s, s′) counts the ways to fill one column; each row is the row above times T, so Tⁿ by squaring reaches any n.`, table: t, answer: [n, 0], args: [w, n] }
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
// A graph typed as a vertex count and an edge list (the DAG lessons). graphRule checks the edges against
// the count (n, or one per duration or value), and, for a DAG lesson, that they make no cycle.
const graphFields = (weighted, min, max) => [int('n', 'Vertices', 1, 7), { key: 'edges', label: weighted ? 'Edges (from to weight, …)' : 'Edges (from to, …)', kind: 'edges', weighted, min, max, len: [0, 12] }]
const graphRule = ({ dag = false, ends = [] }) => i => {
  const n = i.n ?? (i.durations ?? i.values).length, edges = i.edges ?? i.deps
  if (edges.some(e => e[0] >= n || e[1] >= n)) return `Vertices are numbered 0 to ${n - 1}.`
  if (edges.some(e => e[0] === e[1])) return 'An edge must join two different vertices.'
  if (dag && topoOrder(n, edges).length < n) return 'The edges must not make a cycle.'
  if (ends.some(k => i[k] >= n)) return `Start${ends.length > 1 ? ' and target' : ''} must be vertices 0 to ${n - 1}.`
  return null
}
// Some walk can get cheaper forever: n rounds of relaxing every edge from every start still improve.
function negativeCycle(n, edges) {
  const d = Array(n).fill(0)
  for (let round = 0; round < n; round++) for (const [a, b, w] of edges) if (d[a] + w < d[b]) { if (round === n - 1) return true; d[b] = d[a] + w }
  return false
}
// Random graphs for "Surprise me" and the tests. A DAG keeps edges forward in a shuffled order, with the
// start and target at its ends; randomGraph allows cycles. weights: [lo, hi], or null for no weights.
function randomDag(r, weights = null) {
  const n = r(3, 6), perm = range(0, n - 1)
  for (let i = n - 1; i > 0; i--) { const j = r(0, i); [perm[i], perm[j]] = [perm[j], perm[i]] }
  const edges = []
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (edges.length < 12 && r(0, 9) < 4) edges.push(weights ? [perm[a], perm[b], r(...weights)] : [perm[a], perm[b]])
  return { n, edges, s: perm[0], t: perm[n - 1] }
}
function randomGraph(r, weights, most = 6) {
  const n = r(2, most), edges = []
  for (let k = r(1, 8); k > 0; k--) { const a = r(0, n - 1), b = r(0, n - 1); if (a !== b) edges.push(weights ? [a, b, r(...weights)] : [a, b]) }
  return { n, edges }
}
// A tree typed as a vertex count (or one entry per vertex in a list field) and n − 1 edges.
const treeEdges = (weighted = false) => ({ key: 'edges', label: weighted ? 'Edges (u v length, …)' : 'Edges (u v, …)', kind: 'edges', weighted, min: 1, max: 20, len: [0, 6] })
const treeFields = () => [int('n', 'Vertices', 1, 7), treeEdges()]
const treeRule = (perVertex = null) => i => {
  const n = perVertex ? i[perVertex].length : i.n, edges = i.edges
  if (edges.length !== n - 1) return `A tree on ${n} vertices has ${n - 1} edge${n === 2 ? '' : 's'}.`
  if (edges.some(e => e[0] >= n || e[1] >= n)) return `Vertices are numbered 0 to ${n - 1}.`
  if (edges.some(e => e[0] === e[1])) return 'An edge must join two different vertices.'
  if (rootTree(n, edges).pre.length < n) return 'The edges must connect every vertex (no cycle, nothing left out).'
  return null
}
// A random tree: each vertex hangs from an earlier one, with the labels (other than the root 0) shuffled.
function randomTreeInput(r, weights = null, most = 7) {
  const n = r(2, most), label = [0, ...range(1, n - 1)]
  for (let i = n - 1; i > 1; i--) { const j = r(1, i); [label[i], label[j]] = [label[j], label[i]] }
  const edges = range(1, n - 1).map(v => { const e = [label[r(0, v - 1)], label[v]]; return weights ? [...e, r(1, weights)] : e })
  return { n, edges }
}
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
  'dag-paths': { fields: [...graphFields(false), int('s', 'Start', 0, 6), int('t', 'Target', 0, 6)], rule: graphRule({ dag: true, ends: ['s', 't'] }), random: r => randomDag(r) },
  'dag-longest': { fields: [...graphFields(true, -9, 9), int('s', 'Start', 0, 6), int('t', 'Target', 0, 6)], rule: graphRule({ dag: true, ends: ['s', 't'] }), random: r => randomDag(r, [-6, 9]) },
  'increasing-grid': { fields: [{ key: 'grid', label: 'Values', kind: 'matrix', min: 0, max: 20, rows: [1, 4], cols: [1, 4] }] },
  'critical-path': {
    fields: [ints('durations', 'Durations', 1, 9, [1, 7]), { key: 'deps', label: 'Prerequisites (before after, …)', kind: 'edges', weighted: false, len: [0, 10] }],
    rule: graphRule({ dag: true }),
    random: r => { const g = randomDag(r); return { durations: range(0, g.n - 1).map(() => r(1, 9)), deps: g.edges } },
  },
  'bellman-ford-dp': {
    fields: [...graphFields(true, -5, 9), int('s', 'Start', 0, 6), int('k', 'Edge budget', 0, 5)],
    rule: graphRule({ ends: ['s'] }),
    random: r => { const g = randomGraph(r, [-2, 9]); return { ...g, s: r(0, g.n - 1), k: r(1, 4) } },
  },
  'floyd-warshall': {
    fields: [int('n', 'Vertices', 1, 5), { key: 'edges', label: 'Edges (from to weight, …)', kind: 'edges', weighted: true, min: -9, max: 20, len: [0, 12] }],
    rule: i => graphRule({})(i) ?? (negativeCycle(i.n, i.edges) ? 'These edges make a negative cycle, so some distances have no minimum.' : null),
    random: r => randomGraph(r, [0, 9], 4),
  },
  'scc-boundaries': {
    fields: [ints('values', 'Values', 0, 9, [1, 7]), { key: 'edges', label: 'Edges (from to, …)', kind: 'edges', weighted: false, len: [0, 12] }, int('s', 'Start', 0, 6)],
    rule: graphRule({ ends: ['s'] }),
    random: r => { const g = randomGraph(r, null); return { values: range(0, g.n - 1).map(() => r(0, 9)), edges: g.edges, s: r(0, g.n - 1) } },
  },
  'dag-product': { fields: [...graphFields(true, 0, 40), int('s', 'Start', 0, 6), int('t', 'Target', 0, 6)], rule: graphRule({ dag: true, ends: ['s', 't'] }), random: r => randomDag(r, [0, 20]) },
  'tree-basics': { fields: treeFields(), rule: treeRule(), random: r => randomTreeInput(r) },
  'tree-independent': { fields: [ints('weights', 'Weights', -9, 20, [1, 7]), treeEdges()], rule: treeRule('weights'), random: r => { const g = randomTreeInput(r); return { weights: range(0, g.n - 1).map(() => r(0, 9)), edges: g.edges } } },
  'tree-cover': { fields: treeFields(), rule: treeRule(), random: r => randomTreeInput(r) },
  'tree-matching': { fields: treeFields(), rule: treeRule(), random: r => randomTreeInput(r) },
  'tree-diameter': { fields: [int('n', 'Vertices', 1, 7), treeEdges(true)], rule: treeRule(), random: r => randomTreeInput(r, 9) },
  'tree-reroot': { fields: treeFields(), rule: treeRule(), random: r => randomTreeInput(r) },
  'reroot-prefix': { fields: treeFields(), rule: treeRule(), random: r => randomTreeInput(r) },
  'tree-distances': { fields: treeFields(), rule: treeRule(), random: r => randomTreeInput(r) },
  'tree-knapsack': {
    fields: [ints('values', 'Values', 0, 9, [1, 6]), ints('costs', 'Costs', 0, 4, [1, 6]), treeEdges(), int('budget', 'Budget', 0, 5)],
    rule: i => (i.costs.length !== i.values.length ? 'Give one cost for each value.' : treeRule('values')(i)),
    random: r => { const g = randomTreeInput(r, null, 6); return { values: range(0, g.n - 1).map(() => r(0, 9)), costs: range(0, g.n - 1).map(() => r(0, 3)), edges: g.edges, budget: r(2, 5) } },
  },
  'tree-coloring': {
    fields: [treeEdges(), { key: 'colours', label: 'Allowed colours (a row per vertex: 1 for colour 1, 2, 3)', kind: 'grid', rows: [1, 6], cols: [3, 3] }],
    rule: treeRule('colours'),
    random: r => { const g = randomTreeInput(r, null, 6); return { edges: g.edges, colours: range(0, g.n - 1).map(() => [0, 1, 2].map(() => (r(0, 9) < 7 ? 1 : 0))) } },
  },
  'tree-path-count': { fields: [...treeFields(), int('k', 'Distance k', 1, 3)], rule: treeRule(), random: r => ({ ...randomTreeInput(r), k: r(1, 3) }) },
  'tree-connected': { fields: treeFields(), rule: treeRule(), random: r => randomTreeInput(r) },
  'tree-small-large': { fields: [ints('colors', 'Colours', 1, 5, [1, 7]), treeEdges()], rule: treeRule('colors'), random: r => { const g = randomTreeInput(r); return { colors: range(0, g.n - 1).map(() => r(1, 4)), edges: g.edges } } },
  'bitmask-basics': { fields: [ints('weights', 'Weights', 0, 9, [0, 4]), int('limit', 'Limit', 0, 30)] },
  'subset-enumeration': {
    fields: [ints('values', 'Values (1, 2, 4 or 8: one per mask)', -9, 9, [1, 8])],
    rule: i => ([1, 2, 4, 8].includes(i.values.length) ? null : 'Give 1, 2, 4 or 8 values: one for each mask.'),
    random: r => ({ values: range(1, 2 ** r(1, 3)).map(() => r(-5, 9)) }),
  },
  'assignment': {
    fields: [{ key: 'cost', label: 'Costs (a row per worker, a column per job)', kind: 'matrix', min: 0, max: 20, rows: [1, 4], cols: [1, 4] }],
    rule: i => (i.cost.length === i.cost[0].length ? null : 'Give a square table: as many jobs as workers.'),
    random: r => { const n = r(2, 4); return { cost: range(1, n).map(() => range(1, n).map(() => r(1, 9))) } },
  },
  'held-karp': {
    fields: [{ key: 'dist', label: 'Distances (a row per city)', kind: 'matrix', min: 0, max: 50, rows: [1, 4], cols: [1, 4] }],
    rule: i => (i.dist.length === i.dist[0].length ? null : 'Give a square table: one row and one column per city.'),
    random: r => { const n = r(2, 4), d = range(1, n).map(() => Array(n).fill(0)); for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) d[a][b] = d[b][a] = r(1, 20); return { dist: d } },
  },
  'hamiltonian': {
    fields: [int('n', 'Vertices', 1, 4), { key: 'edges', label: 'Edges (from to, …)', kind: 'edges', weighted: false, len: [0, 12] }],
    rule: graphRule({}),
    random: r => { const n = r(2, 4), e = []; for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (a !== b && r(0, 9) < 5) e.push([a, b]); return { n, edges: e } },
  },
  'subset-partition': {
    fields: [ints('values', 'Items', 1, 9, [0, 4]), int('cap', 'Bin size', 1, 20)],
    rule: i => (i.values.every(x => x <= i.cap) ? null : 'Every item must fit in a bin on its own.'),
    random: r => { const cap = r(4, 10); return { values: range(1, r(2, 4)).map(() => r(1, cap)), cap } },
  },
  'subset-cover': {
    fields: [int('n', 'Items', 1, 3), { key: 'options', label: 'Options (a 1 for each item it covers, then its cost; …)', kind: 'matrix', min: 0, max: 20, rows: [1, 5], cols: [2, 4] }],
    rule: i => (i.options.every(row => row.length === i.n + 1 && row.slice(0, i.n).every(x => x === 0 || x === 1) && row[i.n] >= 1) ? null : `Each option is ${i.n} flags (0 or 1) and then a cost of at least 1.`),
    random: r => { const n = r(2, 3); return { n, options: range(1, r(2, 4)).map(() => [...range(1, n).map(() => r(0, 1)), r(1, 9)]) } },
  },
  'steiner-tree': {
    fields: [int('n', 'Vertices', 2, 5), { key: 'edges', label: 'Edges (u v weight, …)', kind: 'edges', weighted: true, min: 1, max: 9, len: [1, 10] }, ints('terminals', 'Terminals', 0, 4, [1, 3])],
    rule: i => graphRule({})(i) ?? (new Set(i.terminals).size !== i.terminals.length ? 'List each terminal once.' : i.terminals.some(x => x >= i.n) ? `Terminals are vertices 0 to ${i.n - 1}.` : components(i.n, [...i.edges, ...i.edges.map(([a, b, w]) => [b, a, w])]).comps.length > 1 ? 'The graph must be connected.' : null),
    random: r => { const g = randomTreeInput(r, 9, 5); for (let k = r(0, 2); k > 0; k--) { const a = r(0, g.n - 1), b = r(0, g.n - 1); if (a !== b) g.edges.push([a, b, r(1, 9)]) } const ts = range(0, g.n - 1).filter(() => r(0, 1)).slice(0, 3); return { ...g, terminals: ts.length ? ts : [0] } },
  },
  'subset-topological': {
    fields: [int('n', 'Vertices', 1, 4), { key: 'edges', label: 'Rules (before after, …)', kind: 'edges', weighted: false, len: [0, 8] }],
    rule: graphRule({ dag: true }),
    random: r => { const g = randomDag(r); const n = Math.min(g.n, 4); return { n, edges: g.edges.filter(e => e[0] < n && e[1] < n) } },
  },
  'subset-matching': {
    fields: [int('n', 'Vertices (even)', 2, 4), { key: 'edges', label: 'Edges (u v, …)', kind: 'edges', weighted: false, len: [0, 8] }],
    rule: i => (i.n % 2 ? 'Use an even number of vertices.' : graphRule({})(i)),
    random: r => { const n = 2 * r(1, 2), e = []; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (r(0, 9) < 6) e.push([a, b]); return { n, edges: e } },
  },
  'subset-coloring': {
    fields: [int('n', 'Vertices', 1, 4), { key: 'edges', label: 'Edges (u v, …)', kind: 'edges', weighted: false, len: [0, 8] }],
    rule: graphRule({}),
    random: r => { const n = r(2, 4), e = []; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (r(0, 9) < 5) e.push([a, b]); return { n, edges: e } },
  },
  'mask-language': {
    fields: [{ key: 'bits', label: 'Sets (a row of 0s and 1s per set, bit 0 first)', kind: 'grid', rows: [1, 4], cols: [1, 8] }],
    random: r => ({ bits: range(1, r(2, 4)).map(() => range(1, 8).map(() => (r(0, 9) < 4 ? 1 : 0))) }),
  },
  'digit-tight': { fields: [int('n', 'n', 0, 9999)] },
  'digit-leading': { fields: [int('n', 'n', 1, 9999)] },
  'digit-range': { fields: [int('lo', 'From', 0, 9999), int('hi', 'To', 0, 9999)], rule: i => (i.lo <= i.hi ? null : '“From” must not be larger than “To”.'), random: r => { const lo = r(0, 300); return { lo, hi: lo + r(0, 2000) } } },
  'digit-adjacency': { fields: [int('n', 'n', 1, 9999)] },
  'digit-aggregate': { fields: [int('n', 'n', 0, 9999)] },
  'kmp-dp': {
    fields: [text('alphabet', 'Alphabet', 'a-d', [1, 3]), text('pattern', 'Pattern', 'a-d', [1, 4]), int('length', 'Length', 0, 7)],
    rule: i => (new Set(i.alphabet).size !== i.alphabet.length ? 'List each letter of the alphabet once.' : [...i.pattern].some(c => !i.alphabet.includes(c)) ? 'The pattern must use letters from the alphabet.' : null),
    random: r => { const alphabet = 'abc'.slice(0, r(2, 3)); return { alphabet, pattern: range(1, r(2, 3)).map(() => alphabet[r(0, alphabet.length - 1)]).join(''), length: r(3, 6) } },
  },
  'aho-dp': {
    fields: [text('alphabet', 'Alphabet', 'a-d', [1, 3]), { key: 'patterns', label: 'Patterns', kind: 'words', len: [1, 3] }, int('length', 'Length', 0, 6)],
    rule: i => (new Set(i.alphabet).size !== i.alphabet.length ? 'List each letter of the alphabet once.' : i.patterns.some(p => [...p].some(c => !i.alphabet.includes(c))) ? 'Patterns must use letters from the alphabet.' : null),
    random: r => { const alphabet = 'ab'; return { alphabet, patterns: [...new Set(range(1, r(1, 2)).map(() => range(1, r(2, 3)).map(() => alphabet[r(0, 1)]).join('')))], length: r(3, 6) } },
  },
  'automaton-product': {
    fields: [text('pattern', 'Pattern (digits)', '0-9', [1, 2]), int('m', 'Divisor m', 1, 4), int('length', 'Length', 0, 4)],
    random: r => ({ pattern: range(1, r(1, 2)).map(() => String(r(0, 9))).join(''), m: r(1, 4), length: r(1, 4) }),
  },
  'rolling-arrays': { fields: [{ key: 'grid', label: 'Grid (1 = blocked)', kind: 'grid', rows: [1, 5], cols: [1, 6] }] },
  'in-place': {
    fields: [{ key: 'items', label: 'Items (weight value many; …), many = 1 for unlimited', kind: 'matrix', min: 0, max: 9, rows: [1, 3], cols: [3, 3] }, int('cap', 'Capacity', 0, 10)],
    rule: i => (i.items.every(([w, , m]) => w >= 1 && (m === 0 || m === 1)) ? null : 'Each item needs a weight of at least 1 and many = 0 or 1.'),
    random: r => ({ items: range(1, r(1, 3)).map(() => [r(1, 4), r(1, 9), r(0, 1)]), cap: r(4, 10) }),
  },
  'prefix-sum-dp': { fields: [int('n', 'Stairs', 1, 10), int('k', 'Largest step', 1, 5)] },
  'difference-dp': { fields: [ints('limits', 'Limits', 0, 5, [1, 4]), int('total', 'Total', 0, 8)] },
  'monotone-queue': { fields: [ints('values', 'Values', -9, 9, [1, 8]), int('k', 'Longest jump', 1, 4)] },
  'fenwick-dp': { fields: values(1, 9, [1, 7]) },
  'segment-tree-dp': { fields: [ints('values', 'Values', 0, 20, [1, 7]), int('d', 'd', 0, 5)] },
  'coordinate-compression': { fields: [ints('values', 'Values', 1, 99, [1, 7])] },
  'bitset-dp': { fields: [ints('values', 'Values', 0, 6, [1, 4])] },
  'bounded-binary': {
    fields: [ints('weights', 'Weights', 1, 5, [1, 2]), ints('values', 'Values', 0, 9, [1, 2]), ints('counts', 'Counts', 0, 9, [1, 2]), int('cap', 'Capacity', 0, 10)],
    rule: i => (i.values.length === i.weights.length && i.counts.length === i.weights.length ? null : 'Give a value and a count for each weight.'),
    random: r => { const n = r(1, 2); return { weights: range(1, n).map(() => r(1, 4)), values: range(1, n).map(() => r(1, 9)), counts: range(1, n).map(() => r(1, 7)), cap: r(4, 10) } },
  },
  'bounded-queue': {
    fields: [ints('weights', 'Weights', 1, 4, [1, 3]), ints('counts', 'Counts', 0, 4, [1, 3]), int('target', 'Target', 0, 10)],
    rule: i => (i.counts.length === i.weights.length ? null : 'Give a count for each weight.'),
    random: r => { const n = r(1, 3); return { weights: range(1, n).map(() => r(1, 3)), counts: range(1, n).map(() => r(0, 3)), target: r(2, 8) } },
  },
  'monge': { fields: [{ key: 'A', label: 'Matrix (rows separated by ;)', kind: 'matrix', min: 0, max: 9, rows: [1, 4], cols: [1, 4] }] },
  'divide-conquer-opt': {
    fields: [ints('values', 'Values', 0, 9, [1, 7]), int('g', 'Groups', 1, 4)],
    rule: i => (i.g <= i.values.length ? null : 'Groups can’t outnumber the values.'),
    random: r => { const n = r(2, 7); return { values: range(1, n).map(() => r(0, 9)), g: r(1, Math.min(4, n)) } },
  },
  'knuth': { fields: values(1, 9, [1, 6]) },
  'cht': { fields: [ints('words', 'Word lengths', 1, 5, [1, 7]), int('M', 'M (per line)', 0, 20)] },
  'monotone-cht': { fields: [ints('values', 'Strengths', 1, 5, [1, 6]), int('a', 'a (negative)', -3, -1), int('b', 'b', -10, 10), int('c', 'c', -20, 20)] },
  'li-chao': { fields: [ints('heights', 'Heights', 0, 20, [1, 7]), int('C', 'C (per jump)', 0, 20)] },
  'slope-trick': { fields: values(0, 9, [1, 6]) },
  'cdq': {
    fields: [ints('x', 'x', 0, 5, [1, 7]), ints('y', 'y', 0, 5, [1, 7])],
    rule: i => (i.x.length === i.y.length ? null : 'Give a y for each x.'),
    random: r => { const n = r(2, 7); return { x: range(1, n).map(() => r(0, 5)), y: range(1, n).map(() => r(0, 5)) } },
  },
  'online-convolution': { fields: [ints('b', 'Kernel b (b[0] is not used)', 0, 3, [2, 5]), int('n', 'n', 0, 8)] },
  'matrix-power': {
    fields: [int('k', 'Vertices', 1, 4), { key: 'edges', label: 'Edges (from to, …)', kind: 'edges', weighted: false, len: [0, 8] }, int('n', 'Edges per walk', 0, 6)],
    rule: i => (i.edges.every(([u, v]) => u < i.k && v < i.k) ? null : 'Every edge must join vertices 0 to k − 1.'),
    random: r => { const k = r(2, 4); return { k, edges: range(1, r(2, 7)).map(() => [r(0, k - 1), r(0, k - 1)]), n: r(2, 5) } },
  },
  'linear-recurrence': {
    fields: [ints('c', 'Weights c', 0, 3, [1, 3]), ints('a', 'First terms a', 0, 5, [1, 3]), int('n', 'n', 0, 12)],
    rule: i => (i.a.length === i.c.length ? null : 'Give as many first terms as weights.'),
    random: r => { const k = r(1, 3); return { c: range(1, k).map(() => r(0, 3)), a: range(1, k).map(() => r(0, 5)), n: r(3, 12) } },
  },
  'bostan-mori': { fields: [ints('p', 'P (top)', 0, 3, [1, 3]), ints('r', 'r: Q = 1 − r₁x − r₂x² − …', 0, 2, [1, 3]), int('n', 'n', 0, 10)] },
  'generating-functions': {
    fields: [ints('g', 'g (g[0] = 1)', 0, 3, [2, 4]), int('m', 'Power m', 0, 6), int('n', 'n', 0, 10)],
    rule: i => (i.g[0] === 1 ? null : 'g must start with 1.'),
    random: r => ({ g: [1, ...range(1, r(1, 3)).map(() => r(0, 3))], m: r(1, 6), n: r(2, 10) }),
  },
  'fft-ntt': { fields: [ints('a', 'a', 0, 6, [1, 5]), ints('b', 'b', 0, 6, [1, 5])] },
  'sos': {
    fields: [ints('values', 'Values (2ⁿ of them)', -5, 9, [1, 8])],
    rule: i => ([1, 2, 4, 8].includes(i.values.length) ? null : 'Give 1, 2, 4 or 8 values, one per mask.'),
    random: r => ({ values: range(1, 2 ** r(1, 3)).map(() => r(0, 9)) }),
  },
  'mobius': {
    fields: [ints('values', 'Subset sums F (2ⁿ of them)', -9, 30, [1, 8])],
    rule: i => ([1, 2, 4, 8].includes(i.values.length) ? null : 'Give 1, 2, 4 or 8 values, one per mask.'),
    random: r => ({ values: range(1, 2 ** r(1, 3)).map(() => r(0, 20)) }),
  },
  'subset-convolution': {
    fields: [ints('a', 'a (2ⁿ values)', 0, 5, [1, 8]), ints('b', 'b (2ⁿ values)', 0, 5, [1, 8])],
    rule: i => ([1, 2, 4, 8].includes(i.a.length) && i.b.length === i.a.length ? null : 'Give 1, 2, 4 or 8 values in each, the same number.'),
    random: r => { const N = 2 ** r(1, 3); return { a: range(1, N).map(() => r(0, 5)), b: range(1, N).map(() => r(0, 5)) } },
  },
  'walsh-hadamard': {
    fields: [ints('a', 'a (2ⁿ values)', 0, 3, [1, 8]), ints('b', 'b (2ⁿ values)', 0, 3, [1, 8])],
    rule: i => ([1, 2, 4, 8].includes(i.a.length) && i.b.length === i.a.length ? null : 'Give 1, 2, 4 or 8 values in each, the same number.'),
    random: r => { const N = 2 ** r(1, 3); return { a: range(1, N).map(() => r(0, 3)), b: range(1, N).map(() => r(0, 3)) } },
  },
  'semirings': {
    fields: [int('k', 'Vertices', 1, 4), { key: 'edges', label: 'Edges (from to weight, …)', kind: 'edges', weighted: true, min: 0, max: 9, len: [0, 8] }, int('n', 'Edges per walk', 0, 6)],
    rule: i => (i.edges.every(([u, v]) => u < i.k && v < i.k) ? null : 'Every edge must join vertices 0 to k − 1.'),
    random: r => { const k = r(2, 4); return { k, edges: range(1, r(2, 7)).map(() => [r(0, k - 1), r(0, k - 1), r(0, 9)]), n: r(2, 5) } },
  },
  'transfer-matrix': { fields: [int('w', 'Height w', 1, 3), int('n', 'Width n', 0, 6)] },
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
