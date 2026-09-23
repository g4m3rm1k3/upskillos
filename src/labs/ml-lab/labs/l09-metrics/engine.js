// Metrics for a simulated alert system: each case has a true label and a model
// score in (0, 1). Everything below is computed from (label, score) pairs.
import { random, normal, sigmoid, mean, range } from '../../kit/math.js'

// Latent evidence ~ N(±separation/2, 1). A well-calibrated score is the true
// posterior P(y=1 | evidence); `distortion` makes it over/under-confident.
export function simulate({ n = 2000, prevalence = 0.1, separation = 2, distortion = 1, shift = 0, seed = 1 } = {}) {
  const rng = random(seed), logPrior = Math.log(prevalence / (1 - prevalence))
  return range(n).map(() => {
    const y = rng() < prevalence ? 1 : 0, e = (y ? separation / 2 : -separation / 2) + normal(rng)
    const trueLogit = separation * e + logPrior // log-odds from the likelihood ratio of the two normals
    return { y, p: sigmoid(distortion * trueLogit + shift) }
  })
}

export function confusion(rows, t) {
  const c = { tp: 0, fp: 0, fn: 0, tn: 0 }
  for (const r of rows) c[r.p >= t ? (r.y ? 'tp' : 'fp') : (r.y ? 'fn' : 'tn')]++
  return c
}
export function metrics(c) {
  const safe = (a, b) => b ? a / b : NaN
  const precision = safe(c.tp, c.tp + c.fp), recall = safe(c.tp, c.tp + c.fn)
  return { precision, recall, fpr: safe(c.fp, c.fp + c.tn), accuracy: safe(c.tp + c.tn, c.tp + c.fp + c.fn + c.tn), f1: safe(2 * precision * recall, precision + recall) }
}

// Sweep every distinct score as a threshold, from strictest to most lenient.
export function curves(rows) {
  const s = [...rows].sort((a, b) => b.p - a.p), P = rows.filter(r => r.y).length, N = rows.length - P
  let tp = 0, fp = 0
  const roc = [[0, 0]], pr = []
  for (let i = 0; i < s.length; i++) {
    s[i].y ? tp++ : fp++
    if (i === s.length - 1 || s[i + 1].p !== s[i].p) { roc.push([fp / N, tp / P]); pr.push([tp / P, tp / (tp + fp)]) }
  }
  let auc = 0
  for (let i = 1; i < roc.length; i++) auc += (roc[i][0] - roc[i - 1][0]) * (roc[i][1] + roc[i - 1][1]) / 2
  let ap = 0, prevRecall = 0
  for (const [r, p] of pr) { ap += (r - prevRecall) * p; prevRecall = r }
  return { roc, pr, auc, ap, prevalence: P / rows.length }
}

export const expectedCost = (c, costFP, costFN, n) => (c.fp * costFP + c.fn * costFN) / n
export function costCurve(rows, costFP, costFN, steps = 99) {
  return range(steps).map(i => { const t = (i + 1) / (steps + 1); return [t, expectedCost(confusion(rows, t), costFP, costFN, rows.length)] })
}

// Reliability diagram: bin by predicted probability, compare with observed frequency.
export function reliability(rows, bins = 10) {
  const out = range(bins).map(() => ({ sum: 0, pos: 0, count: 0 }))
  for (const r of rows) { const b = Math.min(bins - 1, Math.floor(r.p * bins)); out[b].sum += r.p; out[b].pos += r.y; out[b].count++ }
  const cells = out.map((b, i) => ({ bin: i, predicted: b.count ? b.sum / b.count : NaN, observed: b.count ? b.pos / b.count : NaN, count: b.count }))
  const ece = cells.reduce((t, c) => t + (c.count ? c.count * Math.abs(c.predicted - c.observed) : 0), 0) / rows.length
  return { cells, ece, brier: mean(rows.map(r => (r.p - r.y) ** 2)) }
}

// Platt scaling: fit p' = σ(a·logit(p) + b) on held-out rows by gradient descent.
export function plattFit(rows, steps = 800, rate = 0.5) {
  const z = rows.map(r => Math.log(Math.min(1 - 1e-12, Math.max(1e-12, r.p)) / (1 - Math.min(1 - 1e-12, Math.max(1e-12, r.p)))))
  let a = 1, b = 0
  for (let k = 0; k < steps; k++) {
    let ga = 0, gb = 0
    rows.forEach((r, i) => { const e = sigmoid(a * z[i] + b) - r.y; ga += e * z[i]; gb += e })
    a -= rate * ga / rows.length; b -= rate * gb / rows.length
  }
  return { a, b, apply: p => { const q = Math.min(1 - 1e-12, Math.max(1e-12, p)); return sigmoid(a * Math.log(q / (1 - q)) + b) } }
}
