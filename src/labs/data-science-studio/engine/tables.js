// Part 1's engine: python/tables.py and python/frames.py in JavaScript (parity.test.js holds them to
// the Python), plus the step-by-step traces the figures draw.

export const column = (rows, name) => rows.map(row => row[name])

export function countValues(values) {
  const counts = new Map()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return Object.fromEntries(counts)
}

export function splitCsvLine(line) {
  return splitCsvTrace(line).at(-1).fields
}

// Every step of split_csv_line: after each character, what it was and the state it left.
export function splitCsvTrace(line) {
  const chars = [...line], steps = []
  let fields = [], field = '', inQuotes = false, i = 0
  while (i < chars.length) {
    const ch = chars[i], at = i
    let did
    if (inQuotes) {
      if (ch === '"' && chars[i + 1] === '"') { field += '"'; i++; did = 'two quotes: one quote character' }
      else if (ch === '"') { inQuotes = false; did = 'closing quote' }
      else { field += ch; did = 'inside quotes: kept, even a comma' }
    } else if (ch === '"') { inQuotes = true; did = 'opening quote' }
    else if (ch === ',') { fields = [...fields, field]; field = ''; did = 'comma: the field ends' }
    else { field += ch; did = 'added to the field' }
    i++
    steps.push({ at, ch, did, fields, field, inQuotes })
  }
  steps.push({ at: chars.length, ch: null, did: 'end of line: the last field ends', fields: [...fields, field], field: '', inQuotes })
  return steps
}

export function readCsv(text) {
  const lines = text.split('\n').filter(line => line.trim() !== '')
  if (!lines.length) return []
  const header = splitCsvLine(lines[0])
  return lines.slice(1).map(line => { const f = splitCsvLine(line); return Object.fromEntries(header.slice(0, f.length).map((h, k) => [h, f[k]])) })
}

// Python's float(): what it accepts, as far as this lab's data goes (digits, a point, a sign, an exponent).
export function toNumber(text) {
  text = text.trim()
  if (text === '') return null
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(text)) throw new Error(`could not convert string to float: '${text}'`)
  return Number(text)
}
export function toPence(text) {
  text = text.trim()
  if (text === '') return null
  const at = text.indexOf('.')
  const pounds = at < 0 ? text : text.slice(0, at), pence = ((at < 0 ? '' : text.slice(at + 1)) + '00').slice(0, 2)
  return Number.parseInt(pounds, 10) * 100 + Number.parseInt(pence, 10)
}
export const withNumbers = (rows, names) => rows.map(row => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, names.includes(k) ? toNumber(v) : v])))

export function meanOf(values) {
  const present = values.filter(v => v !== null)
  if (!present.length) return [null, values.length]
  return [present.reduce((s, v) => s + v, 0) / present.length, values.length - present.length]
}

export const rowsWhere = (rows, name, value) => rows.filter(row => row[name] === value)

export const whereAll = (rows, conditions) => rows.filter(row => Object.entries(conditions).every(([k, v]) => row[k] === v))

export function sortBy(rows, name) {
  const out = []
  for (const row of rows) {
    let i = out.length
    while (i > 0 && out[i - 1][name] > row[name]) i--
    out.splice(i, 0, row)
  }
  return out
}

export function mergeSorted(left, right, name) {
  const out = []
  let i = 0, j = 0
  while (i < left.length && j < right.length) { if (right[j][name] < left[i][name]) out.push(right[j++]); else out.push(left[i++]) }
  return [...out, ...left.slice(i), ...right.slice(j)]
}
export function mergeSort(rows, name) {
  if (rows.length <= 1) return [...rows]
  const middle = Math.floor(rows.length / 2)
  return mergeSorted(mergeSort(rows.slice(0, middle), name), mergeSort(rows.slice(middle), name), name)
}

// How many comparisons each sort makes on the same list (for the race figure and the derivation).
export function insertionComparisons(values) {
  const out = []
  let compared = 0
  for (const x of values) {
    let i = out.length
    while (i > 0) { compared++; if (out[i - 1] > x) i--; else break }
    out.splice(i, 0, x)
  }
  return compared
}
export function mergeComparisons(values) {
  if (values.length <= 1) return { sorted: [...values], compared: 0 }
  const middle = Math.floor(values.length / 2)
  const a = mergeComparisons(values.slice(0, middle)), b = mergeComparisons(values.slice(middle))
  const out = []
  let i = 0, j = 0, compared = a.compared + b.compared
  while (i < a.sorted.length && j < b.sorted.length) { compared++; if (b.sorted[j] < a.sorted[i]) out.push(b.sorted[j++]); else out.push(a.sorted[i++]) }
  return { sorted: [...out, ...a.sorted.slice(i), ...b.sorted.slice(j)], compared }
}

// python/frames.py
export function bigOrders(rows, threshold) {
  return rows.filter(r => r.price * r.quantity >= threshold).map(r => r.order_id)
}
export const shareWhere = (rows, name, value) => rows.filter(r => r[name] === value).length / rows.length

// The orders with price and quantity as numbers, and only the rows whose price is present.
export const priced = rows => withNumbers(rows, ['price', 'quantity']).filter(r => r.price !== null)
