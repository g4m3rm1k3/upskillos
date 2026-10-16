// Part 4's engine: python/charts.py in JavaScript (parity.test.js holds it to the Python;
// charts.test.js holds the ticks to D3's own and the bin widths to the Spreadsheet Lab's).
import { quantile, std } from './summary.js'

export const linearScale = (d0, d1, r0, r1, x) => r0 + ((x - d0) / (d1 - d0)) * (r1 - r0)
export const invert = (d0, d1, r0, r1, y) => d0 + ((y - r0) / (r1 - r0)) * (d1 - d0)
export const logScale = (d0, d1, r0, r1, x) => linearScale(Math.log10(d0), Math.log10(d1), r0, r1, Math.log10(x))
export const radiusFor = (value, largest, maxRadius) => maxRadius * Math.sqrt(value / largest)

export function stepSize(lo, hi, count) {
  const raw = (hi - lo) / count, power = Math.floor(Math.log10(raw)), error = raw / 10 ** power
  return [power, error >= Math.sqrt(50) ? 10 : error >= Math.sqrt(10) ? 5 : error >= Math.sqrt(2) ? 2 : 1]
}
export function niceTicks(lo, hi, count) {
  const [power, factor] = stepSize(lo, hi, count), out = []
  if (power < 0) {
    const perUnit = 10 ** -power / factor
    let first = Math.round(lo * perUnit), last = Math.round(hi * perUnit)
    if (first / perUnit < lo) first++
    if (last / perUnit > hi) last--
    for (let i = 0; i <= last - first; i++) out.push((first + i) / perUnit) // as D3 does: -0 + 0 is +0
    return out
  }
  const step = 10 ** power * factor
  let first = Math.round(lo / step), last = Math.round(hi / step)
  if (first * step < lo) first++
  if (last * step > hi) last--
  for (let i = 0; i <= last - first; i++) out.push((first + i) * step)
  return out
}

export function histogram(values, start, width, count) {
  const counts = Array(count).fill(0)
  for (const x of values) {
    let k = Math.floor((x - start) / width)
    if (k === count && x === start + count * width) k = count - 1
    if (k >= 0 && k < count) counts[k]++
  }
  return counts
}
export const sturges = n => Math.ceil(Math.log2(n)) + 1
export const scottWidth = values => (3.5 * std(values)) / values.length ** (1 / 3)
export const freedmanDiaconisWidth = values => (2 * (quantile(values, 0.75) - quantile(values, 0.25))) / values.length ** (1 / 3)

export function kde(values, h, x) {
  let total = 0
  for (const v of values) { const u = (x - v) / h; total += Math.exp((-u * u) / 2) / Math.sqrt(2 * Math.PI) }
  return total / (values.length * h)
}
export const silverman = values => 1.06 * std(values) * values.length ** -0.2
export const mix = (c0, c1, t) => c0.map((a, k) => Math.round(a + t * (c1[k] - a)))
export const lieFactor = (dataA, dataB, shownA, shownB) => (shownB / shownA - 1) / (dataB / dataA - 1)

// The area under the density curve, added up in thin strips: it should be 1 (lesson 4.6).
export function kdeArea(values, h, steps = 2000) {
  const lo = Math.min(...values) - 6 * h, hi = Math.max(...values) + 6 * h, dx = (hi - lo) / steps
  let area = 0
  for (let k = 0; k < steps; k++) area += kde(values, h, lo + (k + 0.5) * dx) * dx
  return area
}

// python/frames.py's bin_counts (pandas' cut): a bin holds its left edge and not its right.
export function binCounts(values, edges) {
  const counts = Array(edges.length - 1).fill(0)
  for (const x of values) for (let k = 0; k < counts.length; k++) if (x >= edges[k] && x < edges[k + 1]) { counts[k]++; break }
  return counts
}
