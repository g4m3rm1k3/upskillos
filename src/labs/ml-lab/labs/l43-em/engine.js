// Gaussian mixture models fitted by expectation–maximization, compared with
// k-means; log-likelihood monotonicity, local optima, collapse, and BIC.
import { random, normal, range, mean } from '../../kit/math.js'

const inv2 = S => { const d = S[0][0] * S[1][1] - S[0][1] * S[1][0]; return [[S[1][1] / d, -S[0][1] / d], [-S[1][0] / d, S[0][0] / d]] }
const det2 = S => S[0][0] * S[1][1] - S[0][1] * S[1][0]
export function logN(x, m, S) {
  const d0 = x[0] - m[0], d1 = x[1] - m[1], P = inv2(S), det = det2(S)
  if (!(det > 0)) return -Infinity
  return -0.5 * (d0 * (P[0][0] * d0 + P[0][1] * d1) + d1 * (P[1][0] * d0 + P[1][1] * d1)) - 0.5 * Math.log(det) - Math.log(2 * Math.PI)
}
const logSumExp = a => { const m = Math.max(...a); return m === -Infinity ? m : m + Math.log(a.reduce((s, v) => s + Math.exp(v - m), 0)) }
export const mahal2 = (x, m, S) => { const d0 = x[0] - m[0], d1 = x[1] - m[1], P = inv2(S); return d0 * (P[0][0] * d0 + P[0][1] * d1) + d1 * (P[1][0] * d0 + P[1][1] * d1) }

// Worlds with known structure.
const chol = S => { const a = Math.sqrt(S[0][0]), b = S[1][0] / a; return [[a, 0], [b, Math.sqrt(S[1][1] - b * b)]] }
export const WORLDS = {
  three: { name: 'Three Gaussian clusters of different shapes', comps: [{ w: 0.45, m: [-2, 0], S: [[0.6, 0.35], [0.35, 0.5]] }, { w: 0.35, m: [2, 1.2], S: [[1.4, -0.5], [-0.5, 0.45]] }, { w: 0.2, m: [0.6, -2.2], S: [[0.15, 0], [0, 0.15]] }] },
  stretched: { name: 'Two long, parallel clusters (hard for k-means)', comps: [{ w: 0.5, m: [0, 0.9], S: [[4, 0], [0, 0.08]] }, { w: 0.5, m: [0, -0.9], S: [[4, 0], [0, 0.08]] }] },
  unequal: { name: 'A big diffuse cluster next to a small tight one', comps: [{ w: 0.8, m: [-1, 0], S: [[2.2, 0], [0, 2.2]] }, { w: 0.2, m: [2.3, 0.3], S: [[0.08, 0], [0, 0.08]] }] },
}
export function sampleWorld(key, n = 300, seed = 43) {
  const rng = random(seed), comps = WORLDS[key].comps
  return range(n).map(() => { let u = rng(), k = 0; while (k < comps.length - 1 && u > comps[k].w) { u -= comps[k].w; k++ } const L = chol(comps[k].S), z = [normal(rng), normal(rng)]; return { x: [comps[k].m[0] + L[0][0] * z[0], comps[k].m[1] + L[1][0] * z[0] + L[1][1] * z[1]], z: k } })
}

// E-step: responsibilities r[i][k] = p(z = k | x_i).
export function eStep(X, model) {
  let ll = 0
  const R = X.map(x => { const l = model.map(c => Math.log(c.w) + logN(x, c.m, c.S)), s = logSumExp(l); ll += s; return l.map(v => Math.exp(v - s)) })
  return { R, ll }
}
// M-step: weighted maximum likelihood. `floor` is added to each variance.
export function mStep(X, R, floor = 1e-6) {
  const K = R[0].length, n = X.length
  return range(K).map(k => {
    const Nk = R.reduce((s, r) => s + r[k], 0) + 1e-12
    const m = [R.reduce((s, r, i) => s + r[k] * X[i][0], 0) / Nk, R.reduce((s, r, i) => s + r[k] * X[i][1], 0) / Nk]
    const S = [[floor, 0], [0, floor]]
    R.forEach((r, i) => { const d0 = X[i][0] - m[0], d1 = X[i][1] - m[1]; S[0][0] += r[k] * d0 * d0 / Nk; S[0][1] += r[k] * d0 * d1 / Nk; S[1][1] += r[k] * d1 * d1 / Nk })
    S[1][0] = S[0][1]
    return { w: Nk / n, m, S }
  })
}
// Initialize at K random data points with a broad covariance.
export function initModel(X, K, seed) {
  const rng = random(seed), picks = []
  while (picks.length < K) { const i = Math.floor(rng() * X.length); if (!picks.includes(i)) picks.push(i) }
  const v = mean(X.map(x => x[0] ** 2 + x[1] ** 2)) / 2
  return picks.map(i => ({ w: 1 / K, m: [...X[i]], S: [[v, 0], [0, v]] }))
}
export function runEM(X, K, { seed = 1, iters = 60, floor = 1e-6, init } = {}) {
  let model = init ?? initModel(X, K, seed)
  const history = []
  for (let t = 0; t <= iters; t++) {
    const { R, ll } = eStep(X, model)
    history.push({ model, R, ll })
    if (!Number.isFinite(ll)) break
    model = mStep(X, R, floor)
  }
  return history
}
// k-means (Lloyd) from the same starting centres.
export function kmeans(X, K, seed, iters = 50) {
  let C = initModel(X, K, seed).map(c => c.m), labels = []
  for (let t = 0; t < iters; t++) {
    labels = X.map(x => { let b = 0, bd = Infinity; C.forEach((c, k) => { const d = (x[0] - c[0]) ** 2 + (x[1] - c[1]) ** 2; if (d < bd) { bd = d; b = k } }); return b })
    C = C.map((c, k) => { const pts = X.filter((_, i) => labels[i] === k); return pts.length ? [mean(pts.map(p => p[0])), mean(pts.map(p => p[1]))] : c })
  }
  return { C, labels }
}
// Agreement with the true labels, maximized over label permutations.
export function agreement(labels, truth, K) {
  const perms = p => p.length <= 1 ? [p] : p.flatMap((v, i) => perms([...p.slice(0, i), ...p.slice(i + 1)]).map(q => [v, ...q]))
  return Math.max(...perms(range(K)).map(perm => mean(labels.map((l, i) => perm[l] === truth[i] ? 1 : 0))))
}
export const hardLabels = R => R.map(r => r.indexOf(Math.max(...r)))
export const paramCount = (K, d = 2) => (K - 1) + K * d + K * d * (d + 1) / 2
export const bic = (ll, K, n) => -2 * ll + paramCount(K) * Math.log(n)
// Best of several restarts for each K.
export function bicCurve(X, maxK = 6, restarts = 4) {
  return range(maxK).map(i => {
    const K = i + 1, ll = Math.max(...range(restarts).map(s => runEM(X, K, { seed: 11 + s, iters: 80, floor: 1e-3 }).at(-1).ll))
    return { K, ll, bic: bic(ll, K, X.length) }
  })
}
