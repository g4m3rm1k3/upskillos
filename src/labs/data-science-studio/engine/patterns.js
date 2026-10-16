// Part 5's engine: python/patterns.py in JavaScript, every loop in the same order so the floats agree
// (parity.test.js holds it to the Python; agree.test.js holds CORREL, RANK.AVG, SLOPE… to it).
import { Rng, noise } from './data.js'
import { mean, std, total } from './summary.js'

export function covariance(xs, ys) {
  const mx = mean(xs), my = mean(ys)
  return total(xs.map((x, k) => (x - mx) * (ys[k] - my))) / (xs.length - 1)
}
export const correlation = (xs, ys) => covariance(xs, ys) / (std(xs) * std(ys))
export const centred = values => { const m = mean(values); return values.map(x => x - m) }
export function cosine(a, b) {
  const dot = total(a.map((x, k) => x * b[k]))
  return dot / (Math.sqrt(total(a.map(x => x * x))) * Math.sqrt(total(b.map(y => y * y))))
}

export function rank(values) {
  const order = values.map((_, k) => k).sort((a, b) => (values[a] < values[b] ? -1 : values[a] > values[b] ? 1 : 0))
  const ranks = Array(values.length).fill(0)
  let i = 0
  while (i < order.length) {
    let j = i
    while (j + 1 < order.length && values[order[j + 1]] === values[order[i]]) j++
    const shared = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) ranks[order[k]] = shared
    i = j + 1
  }
  return ranks
}
export const spearman = (xs, ys) => correlation(rank(xs), rank(ys))

export function fitLine(xs, ys) {
  const slope = (correlation(xs, ys) * std(ys)) / std(xs)
  return [slope, mean(ys) - slope * mean(xs)]
}
export function residuals(xs, ys) { const [slope, intercept] = fitLine(xs, ys); return ys.map((y, k) => y - (intercept + slope * xs[k])) }

export const ANSCOMBE = {
  I: [[10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5], [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68]],
  II: [[10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5], [9.14, 8.14, 8.74, 8.77, 9.26, 8.10, 6.13, 3.10, 9.13, 7.26, 4.74]],
  III: [[10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5], [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73]],
  IV: [[8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8], [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.50, 5.56, 7.91, 6.89]],
}
export function describePair(xs, ys) {
  const [slope, intercept] = fitLine(xs, ys)
  return [mean(xs), mean(ys), std(xs) ** 2, std(ys) ** 2, correlation(xs, ys), slope, intercept]
}
export const growthPerUnit = (xs, ys) => Math.exp(fitLine(xs, ys.map(y => Math.log(y)))[0]) - 1

export function jitter(values, amount, seed) { const rng = new Rng(seed); return values.map(x => x + amount * (2 * rng.random() - 1)) }
export const correlationMatrix = columns => columns.map(a => columns.map(b => correlation(a, b)))

export function rateBy(rows, key, column, yes) {
  const counts = {}
  for (const row of rows) { const [hits, n] = counts[row[key]] ?? [0, 0]; counts[row[key]] = [hits + (row[column] === yes ? 1 : 0), n + 1] }
  return counts
}

export function simulate(kind, n, seed) {
  const rng = new Rng(seed), rows = []
  for (let k = 0; k < n; k++) {
    let x, y, z
    if (kind === 'confounder') { z = noise(rng); x = z + noise(rng); y = z + noise(rng) }
    else if (kind === 'collider') { x = noise(rng); y = noise(rng); z = x + y + 0.5 * noise(rng) }
    else { x = noise(rng); y = noise(rng); z = noise(rng) }
    rows.push([x, y, z])
  }
  return rows
}
export const partialCorrelation = (xs, ys, zs) => correlation(residuals(zs, xs), residuals(zs, ys))

// ── For the lessons and figures ──────────────────────────────────────
// The days table with numbers, and the same without the news day (lesson 5.3 finds it).
export const NEWS_DATE = '2025-02-11'
export function numberDays(rows) { return rows.map(r => ({ ...r, high_c: Number(r.high_c), rain_mm: Number(r.rain_mm), riders: Number(r.riders), visits: Number(r.visits) })) }
