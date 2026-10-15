// Part 2's engine: python/summary.py in JavaScript, every loop in the same order so the floats
// agree (parity.test.js checks), plus the step counts and traces the figures draw.

export function total(values) { let t = 0; for (const x of values) t += x; return t }
export const mean = values => total(values) / values.length

export function runningMean(values) {
  const means = []
  let m = 0
  values.forEach((x, i) => { m += (x - m) / (i + 1); means.push(m) })
  return means
}
export const squaredError = (values, c) => total(values.map(x => (x - c) ** 2))
export const absoluteError = (values, c) => total(values.map(x => Math.abs(x - c)))

const byValue = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
export const sorted = values => [...values].sort(byValue)

export function median(values) {
  const s = sorted(values), middle = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[middle] : (s[middle - 1] + s[middle]) / 2
}

export function quantile(values, q) {
  const s = sorted(values), position = q * (s.length - 1)
  const below = Math.floor(position), above = Math.min(below + 1, s.length - 1)
  return s[below] + (position - below) * (s[above] - s[below])
}

// quickselect, with each round recorded: the list it looked at, the pivot, and how many values it compared.
export function quickselectTrace(values, k) {
  let items = [...values]
  const rounds = []
  for (;;) {
    const pivot = items[Math.floor(items.length / 2)]
    const smaller = items.filter(x => x < pivot), equal = items.filter(x => x === pivot)
    rounds.push({ items, pivot, k, smaller: smaller.length, equal: equal.length, compared: items.length })
    if (k < smaller.length) items = smaller
    else if (k < smaller.length + equal.length) return { value: pivot, rounds }
    else { k -= smaller.length + equal.length; items = items.filter(x => x > pivot) }
  }
}
export const quickselect = (values, k) => quickselectTrace(values, k).value

export function variance(values, sample = true) {
  const m = mean(values)
  return total(values.map(x => (x - m) ** 2)) / (sample ? values.length - 1 : values.length)
}
export const std = (values, sample = true) => Math.sqrt(variance(values, sample))

export function shortcutVariance(values) {
  let n = 0, s = 0, s2 = 0
  for (const x of values) { n++; s += x; s2 += x * x }
  return (s2 - s * s / n) / (n - 1)
}

export function welford(values) {
  let n = 0, m = 0, m2 = 0
  for (const x of values) { n++; const delta = x - m; m += delta / n; m2 += delta * (x - m) }
  return [m, n > 1 ? m2 / (n - 1) : 0]
}

export function zScores(values) { const m = mean(values), s = std(values); return values.map(x => (x - m) / s) }

export function iqrFences(values, k = 1.5) {
  const q1 = quantile(values, 0.25), q3 = quantile(values, 0.75)
  return { q1, q3, low: q1 - k * (q3 - q1), high: q3 + k * (q3 - q1) }
}
export function iqrOutliers(values, k = 1.5) {
  const { low, high } = iqrFences(values, k)
  return values.filter(x => x < low || x > high)
}
export function mad(values) { const m = median(values); return median(values.map(x => Math.abs(x - m))) }

// group_by returns a Map in JavaScript: a plain object would put keys that look like numbers first.
export function groupBy(rows, key) {
  const groups = new Map()
  for (const row of rows) { if (!groups.has(row[key])) groups.set(row[key], []); groups.get(row[key]).push(row) }
  return groups
}
export const SUMMARIES = { count: v => v.length, sum: total, mean, median, min: v => Math.min(...v), max: v => Math.max(...v) }
export function aggregate(groups, name, how) {
  const summary = SUMMARIES[how]
  return new Map([...groups].map(([k, rows]) => [k, summary(rows.map(r => r[name]))]))
}
export const plainGroups = groups => Object.fromEntries([...groups].map(([k, v]) => [k, v]))

export function pivot(rows, rowKey, colKey, name) {
  const rowValues = sorted([...new Set(rows.map(r => r[rowKey]))]), colValues = sorted([...new Set(rows.map(r => r[colKey]))])
  const table = Object.fromEntries(rowValues.map(r => [r, Object.fromEntries(colValues.map(c => [c, 0]))]))
  for (const row of rows) table[row[rowKey]][row[colKey]] += row[name]
  return table
}
