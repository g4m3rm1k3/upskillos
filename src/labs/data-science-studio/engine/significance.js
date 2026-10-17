// Part 7's engine: python/significance.py in JavaScript, every loop and every random draw in the same
// order (parity.test.js holds it to the Python; agree.test.js holds T.TEST, CHISQ.TEST… to it).
import { Rng, noise } from './data.js'
import { mean, total, variance } from './summary.js'

export function permutationDiffs(a, b, repeats, seed) {
  const rng = new Rng(seed), pooled = [...a, ...b], k = a.length, out = []
  for (let r = 0; r < repeats; r++) {
    for (let i = 0; i < k; i++) { const j = i + rng.below(pooled.length - i);[pooled[i], pooled[j]] = [pooled[j], pooled[i]] }
    out.push(mean(pooled.slice(0, k)) - mean(pooled.slice(k)))
  }
  return out
}
export function permutationP(diffs, observed) {
  let hits = 1
  for (const d of diffs) if (Math.abs(d) >= Math.abs(observed) - 1e-12) hits++
  return hits / (diffs.length + 1)
}

export function simpson(f, a, b, n = 1000) {
  const h = (b - a) / n
  let s = f(a) + f(b)
  for (let k = 1; k < n; k++) s += (k % 2 ? 4 : 2) * f(a + k * h)
  return (s * h) / 3
}
export function normalCdf(z) {
  const half = simpson(u => Math.exp((-u * u) / 2), 0, Math.abs(z)) / Math.sqrt(2 * Math.PI)
  return z >= 0 ? 0.5 + half : 0.5 - half
}
export function normalQuantile(p) {
  let lo = -10, hi = 10
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (normalCdf(mid) < p) lo = mid; else hi = mid }
  return (lo + hi) / 2
}
export function twoProportionZ(hitsA, nA, hitsB, nB) {
  const pooled = (hitsA + hitsB) / (nA + nB)
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB))
  if (se === 0) return 0
  return (hitsB / nB - hitsA / nA) / se
}
export const zPValue = z => 2 * (1 - normalCdf(Math.abs(z)))
export function simulatedPvalues(n, rateA, rateB, repeats, seed) {
  const rng = new Rng(seed), out = []
  for (let r = 0; r < repeats; r++) {
    let a = 0, b = 0
    for (let i = 0; i < n; i++) if (rng.random() < rateA) a++
    for (let i = 0; i < n; i++) if (rng.random() < rateB) b++
    out.push(zPValue(twoProportionZ(a, n, b, n)))
  }
  return out
}

export function welchT(a, b) {
  const va = variance(a) / a.length, vb = variance(b) / b.length
  const t = (mean(a) - mean(b)) / Math.sqrt(va + vb)
  const df = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1))
  return [t, df]
}
export function tTwoSided(t, df) {
  const top = Math.atan(Math.abs(t) / Math.sqrt(df))
  const curve = u => Math.cos(u) ** (df - 1)
  return 1 - simpson(curve, 0, top, 2000) / simpson(curve, 0, Math.PI / 2, 2000)
}
export function tCritical(df, level = 0.95) {
  let lo = 0, hi = 1000
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (tTwoSided(mid, df) > 1 - level) lo = mid; else hi = mid }
  return (lo + hi) / 2
}

export function cohensD(a, b) {
  const na = a.length, nb = b.length
  const pooled = ((na - 1) * variance(a) + (nb - 1) * variance(b)) / (na + nb - 2)
  return (mean(a) - mean(b)) / Math.sqrt(pooled)
}
export function simulatedPower(n, rateA, rateB, repeats, seed, alpha = 0.05) {
  return simulatedPvalues(n, rateA, rateB, repeats, seed).filter(p => p < alpha).length / repeats
}
export function sampleSize(rateA, rateB, alpha = 0.05, power = 0.8) {
  const za = normalQuantile(1 - alpha / 2), zb = normalQuantile(power)
  const spread = rateA * (1 - rateA) + rateB * (1 - rateB)
  return ((za + zb) ** 2 * spread) / (rateB - rateA) ** 2
}

export function chiSquared(table) {
  const rows = table.map(row => total(row))
  const cols = table[0].map((_, j) => total(table.map(row => row[j])))
  const grand = total(rows)
  let stat = 0
  for (let i = 0; i < table.length; i++) for (let j = 0; j < table[0].length; j++) {
    const expected = (rows[i] * cols[j]) / grand
    stat += (table[i][j] - expected) ** 2 / expected
  }
  return [stat, (table.length - 1) * (table[0].length - 1)]
}
export function chi2Tail(x, df) {
  let q, term, k
  if (df % 2 === 0) { q = 0; term = Math.exp(-x / 2); k = 0 }
  else { q = 2 * (1 - normalCdf(Math.sqrt(x))); term = (Math.sqrt(x / 2) * Math.exp(-x / 2)) / (Math.sqrt(Math.PI) / 2); k = 1 }
  while (k < df) { q += term; term *= x / 2 / (k / 2 + 1); k += 2 }
  return q
}
export function dispersion(counts) { const m = mean(counts); return [total(counts.map(c => (c - m) ** 2)) / m, counts.length - 1] }

export const bonferroni = (pvalues, alpha = 0.05) => pvalues.map(p => p <= alpha / pvalues.length)
export function benjaminiHochberg(pvalues, q = 0.05) {
  const m = pvalues.length, order = pvalues.map((_, i) => i).sort((i, j) => pvalues[i] - pvalues[j])
  let cutoff = 0
  order.forEach((i, k) => { if (pvalues[i] <= (q * (k + 1)) / m) cutoff = k + 1 })
  const found = Array(m).fill(false)
  for (const i of order.slice(0, cutoff)) found[i] = true
  return found
}
export function manyTests(m, real, n, effect, seed) {
  const rng = new Rng(seed), out = []
  for (let i = 0; i < m; i++) {
    const a = Array.from({ length: n }, () => noise(rng))
    const b = Array.from({ length: n }, () => noise(rng) + (i < real ? effect : 0))
    const [t, df] = welchT(a, b)
    out.push(tTwoSided(t, df))
  }
  return out
}

export function aaPeeking(visitors, rate, repeats, seed) {
  const rng = new Rng(seed)
  let ever = 0, last = 0
  for (let r = 0; r < repeats; r++) {
    const n = [0, 0], hits = [0, 0]
    let crossed = false, z = 0
    for (const today of visitors) {
      for (let v = 0; v < today; v++) { const page = rng.below(2); n[page]++; if (rng.random() < rate) hits[page]++ }
      z = twoProportionZ(hits[0], n[0], hits[1], n[1])
      if (Math.abs(z) > 1.96) crossed = true
    }
    if (crossed) ever++
    if (Math.abs(z) > 1.96) last++
  }
  return [ever / repeats, last / repeats]
}
export function splitCheck(nA, nB) { const n = nA + nB; return zPValue((nA - n / 2) / (Math.sqrt(n) / 2)) }
export function liftInterval(hitsA, nA, hitsB, nB, z = 1.96) {
  const pa = hitsA / nA, pb = hitsB / nB, se = Math.sqrt((pa * (1 - pa)) / nA + (pb * (1 - pb)) / nB)
  return [pb - pa - z * se, pb - pa + z * se]
}

// ── For the lessons and figures (not in the Python) ─────────────────
// The running z of a test day by day, from rows of [visitorsA, clicksA, visitorsB, clicksB] (7.9, 7.10).
export function runningZ(days) {
  const c = [0, 0, 0, 0]
  return days.map(d => { d.forEach((v, k) => { c[k] += v }); return twoProportionZ(c[1], c[0], c[3], c[2]) })
}
// How often a t interval (t_critical(n − 1) standard errors) or a z interval (1.96) holds the mean, over
// samples of n drawn with replacement, one generator for all (7.5, after 6.6's coverage).
export function intervalCoverage(values, n, repeats, seed, multiplier) {
  const rng = new Rng(seed), truth = mean(values)
  let hits = 0
  for (let r = 0; r < repeats; r++) {
    const sample = Array.from({ length: n }, () => values[rng.below(values.length)])
    const m = mean(sample), se = Math.sqrt(variance(sample) / n)
    if (m - multiplier * se <= truth && truth <= m + multiplier * se) hits++
  }
  return hits / repeats
}
// The t curve's height (for the figure that sets it against the normal): the cos form's constant found by
// the same Simpson's rule, so nothing here needs the gamma function.
export function tDensity(t, df) {
  const half = simpson(u => Math.cos(u) ** (df - 1), 0, Math.PI / 2, 2000) * Math.sqrt(df)
  return (1 + (t * t) / df) ** (-(df + 1) / 2) / (2 * half)
}
