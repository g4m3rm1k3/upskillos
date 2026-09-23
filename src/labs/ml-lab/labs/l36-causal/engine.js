// Causal inference on a product decision: does a weekly study-reminder email
// increase the number of lessons a learner completes in 30 days?
// Motivation drives both opting in to reminders and completing lessons.
import { random, normal, range, mean, variance, sigmoid, solve } from '../../kit/math.js'

// One population. `confounding` = how strongly motivation drives opting in;
// `proxyNoise` = how badly the recorded "past activity" measures motivation.
// With `randomized`, a coin flip assigns the reminder instead of the user.
export function population({ n = 2000, effect = 1, confounding = 1.5, proxyNoise = 0.5, randomized = false, seed = 36 } = {}) {
  const rng = random(seed)
  return range(n).map(() => {
    const motivation = normal(rng), past = motivation + proxyNoise * normal(rng)
    const p = randomized ? 0.5 : sigmoid(confounding * motivation)
    const t = rng() < p ? 1 : 0
    const y = 5 + 2 * motivation + effect * t + 1.5 * normal(rng)
    return { motivation, past, t, y, p }
  })
}

export function diffInMeans(rows) {
  const a = rows.filter(r => r.t).map(r => r.y), b = rows.filter(r => !r.t).map(r => r.y)
  const est = mean(a) - mean(b), se = Math.sqrt(variance(a, 1) / a.length + variance(b, 1) / b.length)
  return { est, se, lo: est - 1.96 * se, hi: est + 1.96 * se }
}
// Compare treated and untreated within strata of the covariate, then average
// the differences weighted by stratum size.
export function stratified(rows, key = 'past', bins = 5) {
  const sorted = [...rows].sort((a, b) => a[key] - b[key]), size = Math.ceil(sorted.length / bins)
  let total = 0, weight = 0
  range(bins).forEach(i => {
    const s = sorted.slice(i * size, (i + 1) * size), a = s.filter(r => r.t), b = s.filter(r => !r.t)
    if (a.length && b.length) { total += s.length * (mean(a.map(r => r.y)) - mean(b.map(r => r.y))); weight += s.length }
  })
  return { est: total / weight }
}
// Least squares y ~ 1 + t + covariate: the t coefficient.
export function regressionAdjust(rows, key = 'past') {
  const X = rows.map(r => [1, r.t, r[key]]), XtX = [0, 1, 2].map(i => [0, 1, 2].map(j => X.reduce((s, x) => s + x[i] * x[j], 0))), Xty = [0, 1, 2].map(i => X.reduce((s, x, k) => s + x[i] * rows[k].y, 0))
  return { est: solve(XtX, Xty)[1] }
}
// Logistic propensity model on the covariate, then inverse propensity weighting.
export function propensity(rows, key = 'past', steps = 300, lr = 0.5) {
  let w0 = 0, w1 = 0
  for (let s = 0; s < steps; s++) {
    let g0 = 0, g1 = 0
    rows.forEach(r => { const e = sigmoid(w0 + w1 * r[key]) - r.t; g0 += e; g1 += e * r[key] })
    w0 -= lr * g0 / rows.length; w1 -= lr * g1 / rows.length
  }
  return rows.map(r => Math.min(0.99, Math.max(0.01, sigmoid(w0 + w1 * r[key]))))
}
export function ipw(rows, key = 'past') {
  const e = propensity(rows, key)
  let a = 0, wa = 0, b = 0, wb = 0
  rows.forEach((r, i) => { if (r.t) { a += r.y / e[i]; wa += 1 / e[i] } else { b += r.y / (1 - e[i]); wb += 1 / (1 - e[i]) } })
  return { est: a / wa - b / wb }
}
export function estimates(rows, key = 'past') {
  return { naive: diffInMeans(rows).est, stratified: stratified(rows, key).est, regression: regressionAdjust(rows, key).est, ipw: ipw(rows, key).est }
}

// Standard normal CDF (Abramowitz–Stegun 7.1.26).
export function phi(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2), erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2)
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2
}
export const pValue = (est, se) => 2 * (1 - phi(Math.abs(est / se)))
// Users per arm to detect `mde` with a two-sided 5% test and 80% power.
export const sampleSize = (sd, mde, zAlpha = 1.959964, zBeta = 0.841621) => Math.ceil(2 * (zAlpha + zBeta) ** 2 * sd * sd / (mde * mde))

// Many repeated experiments. With `peek`, the analyst checks after every tenth
// of the sample and stops at the first p < 0.05.
export function experiments({ runs = 300, perArm = 200, effect = 0.3, peek = false, seed = 1 } = {}) {
  const rng = random(seed)
  return range(runs).map(() => {
    const draw = t => 5 + effect * t + 2.5 * normal(rng) // motivation is part of the noise now
    const a = range(perArm).map(() => draw(1)), b = range(perArm).map(() => draw(0))
    const test = m => { const aa = a.slice(0, m), bb = b.slice(0, m), est = mean(aa) - mean(bb), se = Math.sqrt(variance(aa, 1) / m + variance(bb, 1) / m); return { est, se, p: pValue(est, se) } }
    if (peek) for (let m = Math.ceil(perArm / 10); m < perArm; m += Math.ceil(perArm / 10)) { const r = test(m); if (r.p < 0.05) return { ...r, stopped: m } }
    return { ...test(perArm), stopped: perArm }
  })
}
export function summarize(runs, effect) {
  return {
    significant: mean(runs.map(r => r.p < 0.05 ? 1 : 0)),
    coverage: mean(runs.map(r => Math.abs(r.est - effect) <= 1.96 * r.se ? 1 : 0)),
    meanEstimate: mean(runs.map(r => r.est)),
    meanSignificantEstimate: mean(runs.filter(r => r.p < 0.05).map(r => r.est)),
  }
}
