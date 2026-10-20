// Part 12's engine: python/story.py in JavaScript (parity.test.js holds it to the Python).
import { fnv1a } from './mlData.js'
import { mean, quantile, std } from './summary.js'

export function groupIntervals(keys, values, z = 1.96) {
  const groups = new Map()
  keys.forEach((k, i) => { if (!groups.has(k)) groups.set(k, []); groups.get(k).push(values[i]) })
  return [...groups.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).map(k => {
    const g = groups.get(k), m = mean(g), se = std(g) / Math.sqrt(g.length)
    return [k, g.length, m, m - z * se, m + z * se]
  })
}
export const errorBand = (errors, level) => [quantile(errors, (1 - level) / 2), quantile(errors, (1 + level) / 2)]
export function coverage(actuals, forecasts, [lo, hi]) {
  let inside = 0
  actuals.forEach((y, i) => { if (forecasts[i] + lo <= y && y <= forecasts[i] + hi) inside++ })
  return inside / actuals.length
}
export function riskSummary(hitsA, nA, hitsB, nB) {
  const a = hitsA / nA, b = hitsB / nB, diff = b - a
  return [a, b, diff, diff / a, diff ? 1 / diff : null]
}
export function passes(row, filters, skip = null) {
  for (const [column, rule] of Object.entries(filters)) {
    if (column === skip) continue
    const value = row[column]
    if (Array.isArray(rule)) { if (!rule.includes(value)) return false } else if (!(rule.low <= value && value <= rule.high)) return false
  }
  return true
}
export function linkedCounts(rows, filters, key) {
  const counts = new Map()
  for (const row of rows) if (passes(row, filters, key)) counts.set(row[key], (counts.get(row[key]) ?? 0) + 1)
  return [...counts.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).map(k => [k, counts.get(k)])
}
export const fingerprint = text => fnv1a(text).toString(16).padStart(8, '0')
