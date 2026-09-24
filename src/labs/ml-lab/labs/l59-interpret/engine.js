// Interpretability for a black-box model of build durations: permutation and
// gain importance, partial dependence and ICE curves, exact Shapley values,
// LIME-style local surrogates, and counterfactual explanations.
import { random, normal, range, mean, solve } from '../../kit/math.js'
import { boost, predictAt } from '../l14-boosting/engine.js'

// Features of a CI build. `lines` is almost a copy of `size` (strongly correlated)
// but never used by the true process; `build_id` is pure noise with many distinct values.
export const FEATURES = [
  { key: 'size', name: 'change size (MB)', lo: 0, hi: 100, actionable: true },
  { key: 'lines', name: 'lines changed (thousands)', lo: 0, hi: 100, actionable: true },
  { key: 'files', name: 'files touched', lo: 0, hi: 60, actionable: true },
  { key: 'cache', name: 'cache hit (0 or 1)', lo: 0, hi: 1, actionable: true, binary: true },
  { key: 'hour', name: 'hour of day', lo: 0, hi: 23, actionable: false },
  { key: 'id', name: 'build id (random)', lo: 0, hi: 1, actionable: false },
]
export const D = FEATURES.length
// The true process: size and files add time, a cache hit saves time — and saves
// more on big changes (an interaction) — and daytime runners are busier.
export const truth = x => 5 + 0.2 * x[0] + 0.35 * x[2] + (x[3] ? 0 : 6 + 0.15 * x[0]) + (x[4] >= 9 && x[4] <= 17 ? 4 : 0)
export function makeData(n, seed, noise = 2) {
  const rng = random(seed)
  return range(n).map(() => {
    const size = 100 * rng() ** 1.3, lines = Math.min(100, Math.max(0, size + 6 * normal(rng))), files = Math.min(60, Math.max(0, 0.35 * size + 8 * rng() + 3 * normal(rng)))
    const x = [size, lines, files, rng() < 0.6 ? 1 : 0, Math.floor(24 * rng()), rng()]
    return { x, y: truth(x) + noise * normal(rng) }
  })
}
export const TRAIN = makeData(300, 59), TEST = makeData(300, 60)
export const MODEL_OPTS = { stages: 150, rate: 0.1, depth: 4, minLeaf: 2 }
let cached
export const model = () => cached ?? (cached = boost(TRAIN, MODEL_OPTS))
export const f = x => predictAt(model(), x)
export const mse = (rows, g = f) => mean(rows.map(r => (g(r.x) - r.y) ** 2))

// ---------- Global importance ----------
// Permutation importance: shuffle one column, measure how much the error rises. Averaged over `repeats` shuffles.
export function permutationImportance(rows, { repeats = 5, seed = 1, g = f } = {}) {
  const rng = random(seed), base = mse(rows, g)
  return range(D).map(j => {
    const rises = range(repeats).map(() => {
      const col = rows.map(r => r.x[j]); for (let i = col.length - 1; i > 0; i--) { const k = Math.floor(rng() * (i + 1)); [col[i], col[k]] = [col[k], col[i]] }
      return mean(rows.map((r, i) => { const x = [...r.x]; x[j] = col[i]; return (g(x) - r.y) ** 2 })) - base
    })
    return { feature: j, rise: mean(rises), spread: Math.max(...rises) - Math.min(...rises) }
  })
}
// Gain (impurity) importance: total squared-error reduction from splits on each feature, over all trees.
export function gainImportance(m = model()) {
  const tot = Array(D).fill(0)
  const walk = n => { if (!n.split) return; tot[n.split.feature] += n.n * n.split.gain; walk(n.left); walk(n.right) }
  m.trees.forEach(walk)
  const s = tot.reduce((a, b) => a + b, 0)
  return tot.map(v => v / s)
}
// Refit the model without some features (their columns set to a constant) and report test error.
export function dropColumn(j) {
  const strip = rows => rows.map(r => ({ x: r.x.map((v, k) => (k === j ? 0 : v)), y: r.y }))
  const m = boost(strip(TRAIN), MODEL_OPTS), g = x => predictAt(m, x.map((v, k) => (k === j ? 0 : v)))
  return { g, testMse: mse(TEST, g) }
}

// ---------- Partial dependence and ICE ----------
export function iceCurves(j, rows, grid) { return rows.map(r => grid.map(v => { const x = [...r.x]; x[j] = v; return f(x) })) }
export const pdp = curves => curves[0].map((_, k) => mean(curves.map(c => c[k])))
// How far a modified row is from anything in the training data (standardized nearest-neighbour distance).
const SCALE = range(D).map(j => { const v = TRAIN.map(r => r.x[j]), m = mean(v); return Math.sqrt(mean(v.map(u => (u - m) ** 2))) || 1 })
export const offManifold = x => Math.min(...TRAIN.map(r => Math.sqrt(r.x.reduce((s, v, k) => (k === 5 ? s : s + ((v - x[k]) / SCALE[k]) ** 2), 0))))

// ---------- Shapley values ----------
// Interventional value function: v(S) = average of f with features in S taken from x
// and the rest from each background row.
export function coalitionValue(x, S, background) { return mean(background.map(b => f(b.x.map((v, k) => (S & (1 << k) ? x[k] : v))))) }
const fact = n => (n <= 1 ? 1 : n * fact(n - 1))
export function shapley(x, background, { g } = {}) {
  const val = range(1 << D).map(S => coalitionValue(x, S, background)), bits = S => { let c = 0; for (; S; S &= S - 1) c++; return c }
  const phi = range(D).map(j => { let t = 0; for (let S = 0; S < 1 << D; S++) { if (S & (1 << j)) continue; const s = bits(S); t += (fact(s) * fact(D - s - 1) / fact(D)) * (val[S | (1 << j)] - val[S]) } return t })
  return { phi, base: val[0], full: val[(1 << D) - 1] }
}
export const BACKGROUND = TRAIN.filter((_, i) => i % 6 === 0)

// ---------- LIME-style local surrogate ----------
// Sample perturbations around x (in standardized units), weight by closeness, fit weighted linear regression.
export function lime(x, { width = 0.75, n = 400, seed = 1, features = [0, 1, 2, 3, 4] } = {}) {
  const rng = random(seed), pts = []
  for (let i = 0; i < n; i++) {
    const z = FEATURES.map((F, k) => { if (!features.includes(k)) return x[k]; if (F.binary) return rng() < 0.5 ? x[k] : 1 - x[k]; return Math.min(F.hi, Math.max(F.lo, x[k] + SCALE[k] * normal(rng))) })
    const d2 = features.reduce((s, k) => s + ((z[k] - x[k]) / SCALE[k]) ** 2, 0) / features.length
    pts.push({ z, y: f(z), w: Math.exp(-d2 / (width * width)) })
  }
  // Weighted least squares on standardized differences (so coefficients are per standard deviation).
  const p = features.length + 1, A = range(p).map(() => Array(p).fill(0)), b = Array(p).fill(0)
  pts.forEach(({ z, y, w }) => { const u = [1, ...features.map(k => (z[k] - x[k]) / SCALE[k])]; for (let a = 0; a < p; a++) { b[a] += w * u[a] * y; for (let c = 0; c < p; c++) A[a][c] += w * u[a] * u[c] } })
  for (let a = 1; a < p; a++) A[a][a] += 1e-6
  const coef = solve(A, b), W = pts.reduce((s, q) => s + q.w, 0)
  const fidelity = 1 - pts.reduce((s, q) => s + q.w * (q.y - (coef[0] + features.reduce((t, k, i) => t + coef[i + 1] * (q.z[k] - x[k]) / SCALE[k], 0))) ** 2, 0) / pts.reduce((s, q) => s + q.w * (q.y - pts.reduce((t, r) => t + r.w * r.y, 0) / W) ** 2, 0)
  return { intercept: coef[0], coef: features.map((k, i) => ({ feature: k, perSd: coef[i + 1] })), fidelity, effectiveN: W ** 2 / pts.reduce((s, q) => s + q.w * q.w, 0) }
}

// ---------- Counterfactuals ----------
// Smallest change (L1 distance: standard deviations for numeric features, 1 per flipped yes/no feature) to the allowed features that brings the prediction to `target` or below.
// Discrete features (cache, hour) are enumerated; for each combination the continuous ones are found by
// random search followed by pulling each change back toward x as far as the target allows (bisection).
const DISCRETE = [3, 4]
export function counterfactual(x, target, { allowed = [0, 2, 3], seed = 1, iters = 600 } = {}) {
  const rng = random(seed), dist = z => allowed.reduce((s, k) => s + Math.abs(z[k] - x[k]) / (FEATURES[k].binary ? 1 : SCALE[k]), 0), ok = z => f(z) <= target
  const cont = allowed.filter(k => !DISCRETE.includes(k)), disc = allowed.filter(k => DISCRETE.includes(k))
  let combos = [[...x]]
  disc.forEach(k => { const vals = k === 3 ? [0, 1] : range(24); combos = combos.flatMap(z => vals.map(v => { const c = [...z]; c[k] = v; return c })) })
  let best = null
  for (const start of combos) {
    if (best && dist(start) >= dist(best)) continue
    let cand = ok(start) ? start : null
    for (let i = 0; i < iters && cont.length; i++) {
      const scale = 2 * (1 - i / iters) + 0.05, z = [...(cand && rng() < 0.7 ? cand : start)]
      cont.forEach(k => { if (rng() < 0.7) z[k] = Math.min(FEATURES[k].hi, Math.max(FEATURES[k].lo, z[k] + scale * SCALE[k] * normal(rng))) })
      if (ok(z) && (!cand || dist(z) < dist(cand))) cand = z
    }
    if (!cand) continue
    for (const k of cont) {
      let lo = 0, hi = 1
      for (let t = 0; t < 30; t++) { const m = (lo + hi) / 2, z = [...cand]; z[k] = cand[k] + m * (x[k] - cand[k]); if (ok(z)) lo = m; else hi = m }
      cand = [...cand]; cand[k] += lo * (x[k] - cand[k])
    }
    if (!best || dist(cand) < dist(best)) best = cand
  }
  if (!best) return null
  return { x: best, pred: f(best), dist: dist(best), changes: allowed.filter(k => Math.abs(best[k] - x[k]) > 1e-9).map(k => ({ feature: k, from: x[k], to: best[k] })) }
}
