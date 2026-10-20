// Part 10's engine: python/database.py in JavaScript, every loop in the same order (parity.test.js
// holds it to the Python, and to what SQLite itself answers). sqlRun.js puts the tables into SQLite.
export function columnType(values) {
  let kind = 'INTEGER'
  for (const v of values) {
    if (v === '') continue
    if (/^[+-]?\d+$/.test(v.trim())) continue
    if (v.trim() !== '' && Number.isFinite(Number(v))) kind = 'REAL'
    else return 'TEXT'
  }
  return kind
}
export const sqlValue = (text, kind) => (text === '' ? null : kind === 'INTEGER' ? Number.parseInt(text, 10) : kind === 'REAL' ? Number(text) : text)
export function createSql(name, header, rows) {
  const kinds = header.map((_, j) => columnType(rows.map(row => row[j])))
  return `CREATE TABLE ${name} (${header.map((h, j) => `${h} ${kinds[j]}`).join(', ')})`
}

export function project(rows, columns, distinct = false) {
  const out = [], seen = new Set()
  for (const row of rows) {
    const values = columns.map(c => row[c])
    if (distinct) { const key = JSON.stringify(values); if (seen.has(key)) continue; seen.add(key) }
    out.push(values)
  }
  return out
}
export function compare(value, op, target) {
  if (op === 'is null') return value === null || value === undefined
  if (value === null || value === undefined || target === null || target === undefined) return false
  switch (op) {
    case '=': return value === target
    case '!=': return value !== target
    case '<': return value < target
    case '>': return value > target
    case '<=': return value <= target
    default: return value >= target
  }
}
export const where = (rows, column, op, target = null) => rows.filter(row => compare(row[column], op, target))
export function aggregate(values, how) {
  if (how === 'count_all') return values.length
  const present = values.filter(v => v !== null && v !== undefined)
  if (how === 'count') return present.length
  if (!present.length) return null
  if (how === 'sum' || how === 'avg') { let s = 0; for (const v of present) s += v; return how === 'sum' ? s : s / present.length }
  return how === 'min' ? present.reduce((a, b) => (b < a ? b : a)) : present.reduce((a, b) => (b > a ? b : a))
}
const byKey = (a, b) => (a === null ? (b === null ? 0 : -1) : b === null ? 1 : a < b ? -1 : a > b ? 1 : 0)
export function groupAggregate(rows, key, column, how) {
  const groups = new Map()
  for (const row of rows) { const k = row[key] ?? null; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(row[column] ?? null) }
  return [...groups.keys()].sort(byKey).map(k => [k, aggregate(groups.get(k), how)])
}

export function buildIndex(rows, column) {
  const pairs = rows.flatMap((row, i) => (row[column] === null || row[column] === undefined ? [] : [[row[column], i]]))
  return pairs.sort((a, b) => byKey(a[0], b[0]) || a[1] - b[1])
}
// steps (optional): a list that receives [lo, mid, hi] for each comparison, for the figure (10.5).
export function binarySearch(index, value, steps = null) {
  let lo = 0, hi = index.length, count = 0
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    count++
    if (steps) steps.push([lo, mid, hi])
    if (index[mid][0] < value) lo = mid + 1
    else hi = mid
  }
  const found = []
  while (lo < index.length && index[lo][0] === value) { found.push(index[lo][1]); lo++ }
  return [found, count]
}
export function btreeLevels(n, fanout) { let levels = 1, reach = fanout; while (reach < n) { reach *= fanout; levels++ } return levels }

export function windowAverage(values, preceding) {
  return values.map((_, i) => { const start = Math.max(0, i - preceding); let s = 0; for (const v of values.slice(start, i + 1)) s += v; return s / (i + 1 - start) })
}
export function rankWithin(rows, partition, order) {
  return rows.map(row => { let better = 0; for (const other of rows) if (other[partition] === row[partition] && other[order] > row[order]) better++; return better + 1 })
}
export function determines(rows, a, b) {
  const seen = new Map()
  for (const row of rows) { if (seen.has(row[a]) && seen.get(row[a]) !== row[b]) return false; seen.set(row[a], row[b]) }
  return true
}
export function splitOut(rows, key, columns) {
  const lookup = [], seen = new Set()
  for (const row of rows) if (!seen.has(row[key])) { seen.add(row[key]); lookup.push(Object.fromEntries([key, ...columns].map(c => [c, row[c]]))) }
  return [lookup, rows.map(row => Object.fromEntries(Object.entries(row).filter(([c]) => !columns.includes(c))))]
}
// The transaction's outcome without SQLite: every order applied, or, if any would take the stock below
// 0, none. An item not in the stock matches no row, as an UPDATE … WHERE would.
export function placeOrders(stock, orders) {
  const after = { ...stock }
  for (const [item, quantity] of orders) {
    if (!(item in after)) continue
    after[item] -= quantity
    if (after[item] < 0) return [Object.fromEntries(Object.keys(stock).sort().map(k => [k, stock[k]])), false]
  }
  return [Object.fromEntries(Object.keys(after).sort().map(k => [k, after[k]])), true]
}
export function monthlyRevenue(rows, under = 1000) {
  const totals = new Map()
  for (const row of rows) {
    if (row.price === null || row.price >= under) continue
    const month = row.date.slice(0, 7)
    totals.set(month, (totals.get(month) ?? 0) + row.price * row.quantity)
  }
  return [...totals.keys()].sort().map(m => [m, totals.get(m)])
}
