// Part 6's engine: python/samples.py in JavaScript, every random draw in the same order (parity.test.js
// holds it to the Python; agree.test.js holds BINOM.DIST, POISSON.DIST, SKEW… to it).
import { Rng } from './data.js'
import { groupBy, mean, median, quantile, std, total } from './summary.js'

export function sampleWithout(values, k, seed) {
  const rng = new Rng(seed), items = [...values]
  for (let i = 0; i < k; i++) { const j = i + rng.below(items.length - i);[items[i], items[j]] = [items[j], items[i]] }
  return items.slice(0, k)
}
export function sampleWith(values, k, seed) { const rng = new Rng(seed); return Array.from({ length: k }, () => values[rng.below(values.length)]) }

// Exact for the answers the lessons use; past 2^53 a JavaScript number can't hold every whole number
// (comb(400, 20) is about 2.8 × 10^33), so combBig gives those exactly.
export function comb(n, k) { let result = 1; for (let i = 1; i <= k; i++) result = Math.floor((result * (n - k + i)) / i); return result }
export function combBig(n, k) { let result = 1n; for (let i = 1n; i <= BigInt(k); i++) result = (result * (BigInt(n) - BigInt(k) + i)) / i; return result }
export const binomialPmf = (k, n, p) => comb(n, k) * p ** k * (1 - p) ** (n - k)
export function poissonPmf(k, lam) { let p = Math.exp(-lam); for (let i = 1; i <= k; i++) p *= lam / i; return p }

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
export function dayOfYear(date) { const month = Number(date.slice(5, 7)), day = Number(date.slice(8, 10)); return MONTH_DAYS.slice(0, month - 1).reduce((s, d) => s + d, 0) + day - 1 }
export function tally(counts) { const out = Array(Math.max(...counts) + 1).fill(0); for (const c of counts) out[c]++; return out }
export function ordersPerDay(dates) { const counts = Array(365).fill(0); for (const d of dates) counts[dayOfYear(d)]++; return counts }

export function sampleMeans(values, n, repeats, seed) {
  const rng = new Rng(seed), means = []
  for (let r = 0; r < repeats; r++) { let t = 0; for (let i = 0; i < n; i++) t += values[rng.below(values.length)]; means.push(t / n) }
  return means
}
export const standardError = values => std(values) / Math.sqrt(values.length)
export function normalPdf(x, mu, sigma) { const u = (x - mu) / sigma; return Math.exp((-u * u) / 2) / (sigma * Math.sqrt(2 * Math.PI)) }
export function skewness(values) {
  const n = values.length, m = mean(values), s = std(values)
  return (n / ((n - 1) * (n - 2))) * total(values.map(x => ((x - m) / s) ** 3))
}
export function heavyTailed(n, seed) { const rng = new Rng(seed); return Array.from({ length: n }, () => 1 / (1 - rng.random())) }

export function meanInterval(values, z = 1.96) { const m = mean(values), se = standardError(values); return [m - z * se, m + z * se] }
export function coverage(values, n, repeats, seed, z = 1.96) {
  const rng = new Rng(seed), truth = mean(values)
  let hits = 0
  for (let r = 0; r < repeats; r++) {
    const sample = Array.from({ length: n }, () => values[rng.below(values.length)])
    const [low, high] = meanInterval(sample, z)
    if (low <= truth && truth <= high) hits++
  }
  return hits / repeats
}

export const STATS = { mean, median }
export function bootstrap(values, stat, repeats, seed) {
  const rng = new Rng(seed), summary = STATS[stat], out = []
  for (let r = 0; r < repeats; r++) out.push(summary(Array.from({ length: values.length }, () => values[rng.below(values.length)])))
  return out
}
export const percentileInterval = (stats, level = 0.95) => [quantile(stats, (1 - level) / 2), quantile(stats, (1 + level) / 2)]
export function bootstrapDifference(a, b, repeats, seed) {
  const rng = new Rng(seed), out = []
  for (let r = 0; r < repeats; r++) {
    const ra = Array.from({ length: a.length }, () => a[rng.below(a.length)])
    const rb = Array.from({ length: b.length }, () => b[rng.below(b.length)])
    out.push(mean(ra) - mean(rb))
  }
  return out
}

export function reservoir(stream, k, seed) {
  const rng = new Rng(seed), kept = []
  let i = 0
  for (const item of stream) {
    i++
    if (i <= k) kept.push(item)
    else { const j = rng.below(i); if (j < k) kept[j] = item }
  }
  return kept
}

export function stratifiedSample(rows, key, k, seed) {
  const rng = new Rng(seed), out = []
  for (const members of groupBy(rows, key).values()) {
    const take = Math.floor((k * members.length) / rows.length + 0.5), items = [...members]
    for (let i = 0; i < take; i++) { const j = i + rng.below(items.length - i);[items[i], items[j]] = [items[j], items[i]] }
    out.push(...items.slice(0, take))
  }
  return out
}

// ── For the lessons and figures (not in the Python) ─────────────────
// The bootstrap of a statistic of two columns (a correlation, a slope): rows resampled as pairs (6.10).
export function bootstrapPairs(xs, ys, statistic, repeats, seed) {
  const rng = new Rng(seed), n = xs.length, out = []
  for (let r = 0; r < repeats; r++) {
    const pick = Array.from({ length: n }, () => rng.below(n))
    out.push(statistic(pick.map(i => xs[i]), pick.map(i => ys[i])))
  }
  return out
}
// How often item `which` (from 1) of a stream of n ends up in a reservoir of k, over many runs (6.8).
export function reservoirShare(n, k, which, runs, seed) {
  const rng = new Rng(seed), stream = Array.from({ length: n }, (_, i) => i + 1)
  let kept = 0
  for (let r = 0; r < runs; r++) if (reservoir(stream, k, rng.below(2 ** 31)).includes(which)) kept++
  return kept / runs
}
// The standard deviation of the sample means of k rows, simple random samples against stratified ones,
// both without replacement (6.9). Each sample's seed is drawn from one generator: never seeds 1, 2, 3…
export function spreadOfMeans(rows, column, key, k, repeats, seed) {
  const rng = new Rng(seed), simple = [], strata = []
  const values = rows.map(r => r[column])
  for (let r = 0; r < repeats; r++) {
    simple.push(mean(sampleWithout(values, k, rng.below(2 ** 31))))
    strata.push(mean(stratifiedSample(rows, key, k, rng.below(2 ** 31)).map(row => row[column])))
  }
  return [std(simple), std(strata)]
}
