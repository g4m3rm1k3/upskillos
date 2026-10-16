// Part 3's engine: python/cleaning.py and python/joins.py in JavaScript (parity.test.js holds them
// to the Python), plus the counted versions and traces the figures draw.
import { toPence, mergeComparisons } from './tables.js'
import { Rng, makeOrders, makeCatalogue, HEADER } from './data.js'

export const TOWNS = ['Leeds', 'York', 'Harrogate', 'Wakefield']

export const normalise = text => text.normalize('NFC').split(/\s+/).filter(Boolean).join(' ').toLowerCase()
// Python's str.title(): a capital at the start of each run of letters, the rest lower case.
export const title = text => text.replace(/(\p{L})(\p{L}*)/gu, (_, a, b) => a.toUpperCase() + b.toLowerCase())
export const cleanTown = text => title(normalise(text))

const digits = text => /^[0-9]+$/.test(text)
export const isOrderId = row => row.order_id.length === 5 && row.order_id[0] === 'A' && digits(row.order_id.slice(1))
export function priceWrittenRight(row) {
  const text = row.price
  if (text === '') return true
  const at = text.indexOf('.')
  if (at < 0) return false
  const pounds = text.slice(0, at), pence = text.slice(at + 1)
  return digits(pounds) && pence.length === 2 && digits(pence)
}
export const quantityInRange = row => digits(row.quantity) && Number(row.quantity) >= 1 && Number(row.quantity) <= 3
export const townAsWritten = row => TOWNS.includes(row.town)
export const RULES = [['order id', isOrderId], ['price written right', priceWrittenRight], ['quantity 1 to 3', quantityInRange], ['town as written', townAsWritten]]

export function checkRows(rows, rules = RULES) {
  const problems = []
  for (const row of rows) for (const [name, valid] of rules) if (!valid(row)) problems.push([row.order_id, name])
  return problems
}

export function fixPence(text, listPrice) {
  const pence = toPence(text)
  if (pence === null) return null
  return pence > 10 * listPrice ? Math.floor(pence / 100) : pence
}

export function dedupe(rows, key) {
  const seen = new Set(), kept = [], repeated = []
  for (const row of rows) {
    const k = row[key]
    if (seen.has(k)) repeated.push(k)
    else { seen.add(k); kept.push(row) }
  }
  return [kept, repeated]
}
// Checking every pair of rows instead: how many comparisons that takes, n(n − 1)/2.
export function pairwiseComparisons(n) { let c = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) c++; return c }

// The whole table of edit distances, for the figure: table[i][j] from the first i characters of a
// to the first j of b, and which of the three neighbours each cell came from.
export function editTable(a, b) {
  const A = [...a], B = [...b]
  const table = Array.from({ length: A.length + 1 }, (_, i) => Array.from({ length: B.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  const from = Array.from({ length: A.length + 1 }, (_, i) => Array.from({ length: B.length + 1 }, (_, j) => (i === 0 ? (j ? 'insert' : null) : j === 0 ? 'delete' : null)))
  for (let i = 1; i <= A.length; i++) {
    for (let j = 1; j <= B.length; j++) {
      const change = A[i - 1] === B[j - 1] ? 0 : 1
      const options = [[table[i - 1][j - 1] + change, change ? 'substitute' : 'keep'], [table[i - 1][j] + 1, 'delete'], [table[i][j - 1] + 1, 'insert']]
      const best = options.reduce((m, o) => (o[0] < m[0] ? o : m))
      table[i][j] = best[0]
      from[i][j] = best[1]
    }
  }
  return { a: A, b: B, table, from }
}
// The edits along one cheapest path, followed back from the bottom-right corner.
export function editPath({ a, b, from }) {
  const steps = []
  let i = a.length, j = b.length
  while (i > 0 || j > 0) {
    const how = from[i][j]
    steps.push({ i, j, how, a: a[i - 1], b: b[j - 1] })
    if (how === 'keep' || how === 'substitute') { i--; j-- } else if (how === 'delete') i--; else j--
  }
  return steps.reverse()
}
// python/cleaning.py's edit_distance takes the minimum in the order delete, insert, substitute; the
// distance is the same whichever neighbour wins a tie.
export const editDistance = (a, b) => { const { table } = editTable(a, b); return table.at(-1).at(-1) }

export function closest(text, choices, most = 0.34) {
  let best = null, bestD = null
  for (const choice of choices) {
    const d = editDistance(normalise(text), normalise(choice))
    if (bestD === null || d < bestD) { best = choice; bestD = d }
  }
  if (best === null || bestD > most * Math.max([...normalise(text)].length, [...normalise(best)].length)) return [null, bestD]
  return [best, bestD]
}

export const fillMissing = (values, value) => values.map(v => (v === null ? value : v))

export function fillByGroup(rows, column, key) {
  const sums = new Map(), counts = new Map()
  for (const row of rows) if (row[column] !== null) { sums.set(row[key], (sums.get(row[key]) ?? 0) + row[column]); counts.set(row[key], (counts.get(row[key]) ?? 0) + 1) }
  return rows.map(row => (row[column] === null && counts.get(row[key]) ? { ...row, [column]: sums.get(row[key]) / counts.get(row[key]) } : { ...row }))
}

export function cleanOrders(rows, listPrices) {
  const [kept] = dedupe(rows, 'order_id')
  return kept.map(row => ({ ...row, town: cleanTown(row.town), price: fixPence(row.price, listPrices[row.item]), quantity: Number.parseInt(row.quantity, 10) }))
}

// ── python/joins.py ───────────────────────────────────────────────
const merged = (a, b) => ({ ...a, ...b })

export function nestedLoopJoin(left, right, key) {
  const out = []
  for (const a of left) for (const b of right) if (a[key] === b[key]) out.push(merged(a, b))
  return out
}
function indexBy(rows, key) {
  const index = new Map()
  for (const b of rows) { if (!index.has(b[key])) index.set(b[key], []); index.get(b[key]).push(b) }
  return index
}
export function hashJoin(left, right, key) {
  const index = indexBy(right, key), out = []
  for (const a of left) for (const b of index.get(a[key]) ?? []) out.push(merged(a, b))
  return out
}
const byKey = key => (x, y) => (x[key] < y[key] ? -1 : x[key] > y[key] ? 1 : 0)
export function sortMergeJoin(left, right, key) {
  const lefts = [...left].sort(byKey(key)), rights = [...right].sort(byKey(key)), out = []
  let i = 0, j = 0
  while (i < lefts.length && j < rights.length) {
    if (lefts[i][key] < rights[j][key]) i++
    else if (lefts[i][key] > rights[j][key]) j++
    else {
      for (let k = j; k < rights.length && rights[k][key] === lefts[i][key]; k++) out.push(merged(lefts[i], rights[k]))
      i++
    }
  }
  return out
}
export function leftJoin(left, right, key) {
  const index = indexBy(right, key)
  const blank = {}
  for (const row of right) for (const name of Object.keys(row)) if (name !== key) blank[name] = null
  const out = []
  for (const a of left) for (const b of index.get(a[key]) ?? [blank]) out.push(merged(a, b))
  return out
}
export function antiJoin(left, right, key) {
  const keys = new Set(right.map(row => row[key]))
  return left.filter(row => !keys.has(row[key]))
}
export function joinSize(left, right, key) {
  const counts = new Map()
  for (const b of right) counts.set(b[key], (counts.get(b[key]) ?? 0) + 1)
  return left.reduce((s, a) => s + (counts.get(a[key]) ?? 0), 0)
}
export function toLong(rows, idColumn, name = 'column', value = 'value') {
  const out = []
  for (const row of rows) for (const [column, v] of Object.entries(row)) if (column !== idColumn) out.push({ [idColumn]: row[idColumn], [name]: column, [value]: v })
  return out
}

// The three joins counted, for the race figure: the key comparisons each makes (for the hash join,
// the dictionary steps). Sorting is counted with merge sort, the sort lesson 1.6 wrote.
export function joinCosts(left, right, key) {
  let nested = 0
  for (let i = 0; i < left.length; i++) for (let j = 0; j < right.length; j++) nested++
  const sortLeft = mergeComparisons(left.map(r => r[key])).compared, sortRight = mergeComparisons(right.map(r => r[key])).compared
  const lefts = [...left].sort(byKey(key)), rights = [...right].sort(byKey(key))
  let walk = 0, i = 0, j = 0
  while (i < lefts.length && j < rights.length) {
    walk++
    if (lefts[i][key] < rights[j][key]) i++
    else if (lefts[i][key] > rights[j][key]) j++
    else { for (let k = j; k < rights.length && rights[k][key] === lefts[i][key]; k++) walk++; i++ }
  }
  return { nested, hashBuild: right.length, hashProbe: left.length, hash: right.length + left.length, sortLeft, sortRight, walk, sortMerge: sortLeft + sortRight + walk }
}

// ── python/frames.py, Part 3 (pandas) ─────────────────────────────
export function townCounts(rows) {
  const counts = new Map()
  for (const row of rows) { const t = title(row.town.trim().toLowerCase()); counts.set(t, (counts.get(t) ?? 0) + 1) }
  return Object.fromEntries(counts)
}
export function filledPrices(rows) {
  return fillByGroup(rows, 'price', 'item').map(r => r.price)
}
export function revenueByCategory(orders, catalogue) {
  const out = {}
  for (const row of hashJoin(orders, catalogue, 'item')) out[row.category] = (out[row.category] ?? 0) + row.price * row.quantity
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)))
}
export const unmatched = (left, right, key) => antiJoin(left, right, key).map(row => row[key])
// pandas' melt goes column by column: every row's first value column, then every row's second.
export function melted(rows, idColumn) {
  const columns = rows.length ? Object.keys(rows[0]).filter(c => c !== idColumn) : []
  return columns.flatMap(column => rows.map(row => ({ [idColumn]: row[idColumn], column, value: row[column] })))
}

// ── Lesson 3.6: hiding prices on purpose, with the truth known ────────
// Every order's real price (the generator records the ones it blanked or typed in pence), as rows of
// { item, price } in pounds, duplicates left out.
export function trueRows() {
  const truth = {}
  const raw = makeOrders(400, 7, truth).slice(0, 400).map(r => Object.fromEntries(HEADER.map((h, k) => [h, r[k]])))
  return raw.map(r => ({ order_id: r.order_id, item: r.item, price: toPence(truth[r.order_id] ?? r.price) / 100 }))
}
export const LIST_PRICES = () => Object.fromEntries(makeCatalogue().map(([item, , price]) => [item, toPence(price) / 100]))

// The chance that a row's price goes missing, for a share s overall:
//   MCAR: the same for every row;  MAR: three times as likely for a bike (the item is seen, so the
//   gap depends only on what is seen);  MNAR: only prices above their list price (the gap depends
//   on the hidden value itself).
export const MECHANISMS = {
  mcar: { label: 'Completely at random (MCAR)', chance: (row, s) => s },
  mar: { label: 'At random, given the item (MAR)', chance: (row, s) => Math.min(1, row.item === 'Bike' ? 3 * s : s) },
  mnar: { label: 'Not at random (MNAR)', chance: (row, s, list) => (row.price > list[row.item] ? Math.min(1, 2 * s) : 0) },
}
// rng: a generator (data.js's Rng), or a seed for a new one.
export function hidePrices(rows, mechanism, share, rng) {
  if (typeof rng === 'number') rng = new Rng(rng)
  const list = LIST_PRICES()
  return rows.map(row => (rng.random() < MECHANISMS[mechanism].chance(row, share, list) ? { ...row, price: null } : row))
}
const meanOf = values => values.reduce((s, v) => s + v, 0) / values.length
const varOf = values => { const m = meanOf(values); return values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1) }
// Each way of handling the gaps, scored against the truth: the mean it gives, and its variance.
export function handleGaps(rows) {
  const seen = rows.filter(r => r.price !== null).map(r => r.price)
  const filled = fillMissing(rows.map(r => r.price), meanOf(seen))
  const byGroup = fillByGroup(rows, 'price', 'item').map(r => r.price).filter(v => v !== null)
  return { missing: rows.length - seen.length, drop: { mean: meanOf(seen), variance: varOf(seen) }, fill: { mean: meanOf(filled), variance: varOf(filled) }, group: { mean: meanOf(byGroup), variance: varOf(byGroup) } }
}
// The average over many repeats, so one lucky draw does not decide: how far each method's mean is
// from the true mean, and its variance as a share of the true variance. One generator runs on
// through every repeat: this generator's first draws for seeds 1, 2, 3… are almost the same, so a
// new seed per repeat would repeat nearly the same experiment.
export function missingnessExperiment(mechanism, share, repeats = 200, seed = 2025) {
  const rows = trueRows(), truth = { mean: meanOf(rows.map(r => r.price)), variance: varOf(rows.map(r => r.price)) }
  const sum = { drop: [0, 0], fill: [0, 0], group: [0, 0] }
  let missing = 0
  const rng = new Rng(seed)
  for (let k = 0; k < repeats; k++) {
    const r = handleGaps(hidePrices(rows, mechanism, share, rng))
    missing += r.missing
    for (const k of Object.keys(sum)) { sum[k][0] += r[k].mean - truth.mean; sum[k][1] += r[k].variance / truth.variance }
  }
  return { truth, missing: missing / repeats, ...Object.fromEntries(Object.entries(sum).map(([k, [e, v]]) => [k, { error: e / repeats, varianceShare: v / repeats }])) }
}
