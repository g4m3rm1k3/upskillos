// Convex optimization: a constrained quadratic with KKT conditions and shadow
// prices, the SVM dual solved by SMO, and proximal gradient (ISTA/FISTA)
// versus subgradient descent for the lasso.
import { random, normal, range, mean } from '../../kit/math.js'

// ---------- KKT: minimize ‖x − a‖² subject to x₁ + x₂ ≤ b ----------
export function kkt(a, b) {
  const slack = a[0] + a[1] - b
  if (slack <= 0) return { x: [...a], lambda: 0, fStar: 0, active: false }
  const x = [a[0] - slack / 2, a[1] - slack / 2]
  return { x, lambda: slack, fStar: slack * slack / 2, active: true }
}
export const objectiveF = (x, a) => (x[0] - a[0]) ** 2 + (x[1] - a[1]) ** 2

// ---------- SVM dual by SMO ----------
export function svmData(seed = 48, n = 40, overlap = 0.6) {
  const rng = random(seed)
  return range(n).map(i => { const y = i % 2 ? 1 : -1; return { x: [y * 1.1 + overlap * normal(rng), y * 0.7 + overlap * normal(rng)], y } })
}
export const KERNELS = {
  linear: (a, b) => a[0] * b[0] + a[1] * b[1],
  rbf: (a, b) => Math.exp(-((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) / (2 * 0.8 * 0.8)),
}
// Simplified SMO (Platt 1998): repeatedly optimize pairs (αᵢ, αⱼ) analytically.
export function smo(data, C, kernel = 'linear', { tol = 1e-6, maxPasses = 60, seed = 1 } = {}) {
  const K = KERNELS[kernel], n = data.length, G = data.map(a => data.map(b => K(a.x, b.x)))
  const alpha = Array(n).fill(0), rng = random(seed)
  let b = 0, passes = 0, sweeps = 0
  const f = i => alpha.reduce((s, a, j) => s + a * data[j].y * G[j][i], 0) + b
  const history = []
  while (passes < maxPasses && sweeps < 1500) {
    let changed = 0
    for (let i = 0; i < n; i++) {
      const Ei = f(i) - data[i].y, yi = data[i].y
      if ((yi * Ei < -tol && alpha[i] < C) || (yi * Ei > tol && alpha[i] > 0)) {
        let j = Math.floor(rng() * (n - 1)); if (j >= i) j++
        const Ej = f(j) - data[j].y, yj = data[j].y, ai = alpha[i], aj = alpha[j]
        const L = yi !== yj ? Math.max(0, aj - ai) : Math.max(0, ai + aj - C), H = yi !== yj ? Math.min(C, C + aj - ai) : Math.min(C, ai + aj)
        if (L === H) continue
        const eta = 2 * G[i][j] - G[i][i] - G[j][j]
        if (eta >= 0) continue
        let nj = Math.min(H, Math.max(L, aj - yj * (Ei - Ej) / eta))
        if (Math.abs(nj - aj) < 1e-7) continue
        const ni = ai + yi * yj * (aj - nj)
        const b1 = b - Ei - yi * (ni - ai) * G[i][i] - yj * (nj - aj) * G[i][j], b2 = b - Ej - yi * (ni - ai) * G[i][j] - yj * (nj - aj) * G[j][j]
        b = ni > 0 && ni < C ? b1 : nj > 0 && nj < C ? b2 : (b1 + b2) / 2
        alpha[i] = ni; alpha[j] = nj; changed++
      }
    }
    sweeps++
    passes = changed === 0 ? passes + 1 : 0
    history.push(dualObjective(alpha, data, G))
  }
  const decision = x => alpha.reduce((s, a, j) => s + (a > 1e-9 ? a * data[j].y * K(data[j].x, x) : 0), 0) + b
  const w = kernel === 'linear' ? [0, 1].map(k => alpha.reduce((s, a, j) => s + a * data[j].y * data[j].x[k], 0)) : null
  return { alpha, b, decision, w, G, history, primal: primalObjective(alpha, b, data, C, G), dual: dualObjective(alpha, data, G) }
}
export function dualObjective(alpha, data, G) {
  let q = 0
  alpha.forEach((ai, i) => { if (ai) alpha.forEach((aj, j) => { if (aj) q += ai * aj * data[i].y * data[j].y * G[i][j] }) })
  return alpha.reduce((s, a) => s + a, 0) - q / 2
}
// Primal objective of the w implied by α, at the best intercept (when every α
// sits at a bound, the KKT conditions do not pin b down, so we minimize over it).
export function primalObjective(alpha, b, data, C, G) {
  let ww = 0
  alpha.forEach((ai, i) => alpha.forEach((aj, j) => { ww += ai * aj * data[i].y * data[j].y * G[i][j] }))
  const g = data.map((_, i) => alpha.reduce((s, a, j) => s + a * data[j].y * G[j][i], 0))
  const hinge = bb => data.reduce((s, d, i) => s + Math.max(0, 1 - d.y * (g[i] + bb)), 0)
  const best = Math.min(hinge(b), ...data.map((d, i) => hinge(d.y - g[i])))
  return ww / 2 + C * best
}

// ---------- Lasso: proximal gradient versus subgradient ----------
export function lassoProblem(seed = 7, n = 60, d = 30) {
  const rng = random(seed), beta = range(d).map(j => j < 3 ? [3, -2, 1.5][j] : 0)
  const X = range(n).map(() => range(d).map(() => normal(rng))), y = X.map(r => r.reduce((s, v, j) => s + v * beta[j], 0) + 0.5 * normal(rng))
  const L = (() => { let v = range(d).map(() => 1); for (let t = 0; t < 60; t++) { const Xv = X.map(r => r.reduce((s, x, j) => s + x * v[j], 0)), u = range(d).map(j => X.reduce((s, r, i) => s + r[j] * Xv[i], 0) / n), nrm = Math.hypot(...u); v = u.map(x => x / nrm) } const Xv = X.map(r => r.reduce((s, x, j) => s + x * v[j], 0)); return Xv.reduce((s, x) => s + x * x, 0) / n })()
  return { X, y, beta, n, d, L }
}
export const softThreshold = (v, t) => Math.sign(v) * Math.max(Math.abs(v) - t, 0)
export function lassoObjective(P, w, lam) { return P.X.reduce((s, r, i) => s + (r.reduce((t, x, j) => t + x * w[j], 0) - P.y[i]) ** 2, 0) / (2 * P.n) + lam * w.reduce((s, v) => s + Math.abs(v), 0) }
function gradSmooth(P, w) { const res = P.X.map((r, i) => r.reduce((t, x, j) => t + x * w[j], 0) - P.y[i]); return range(P.d).map(j => P.X.reduce((s, r, i) => s + r[j] * res[i], 0) / P.n) }
export function ista(P, lam, iters = 200, accelerate = false) {
  let w = Array(P.d).fill(0), z = [...w], t = 1
  const hist = [lassoObjective(P, w, lam)], step = 1 / P.L
  for (let k = 0; k < iters; k++) {
    const g = gradSmooth(P, z), next = z.map((v, j) => softThreshold(v - step * g[j], step * lam))
    if (accelerate) { const tn = (1 + Math.sqrt(1 + 4 * t * t)) / 2; z = next.map((v, j) => v + (t - 1) / tn * (v - w[j])); t = tn } else z = next
    w = next; hist.push(lassoObjective(P, w, lam))
  }
  return { w, hist }
}
export function subgradient(P, lam, iters = 200) {
  let w = Array(P.d).fill(0), best = Infinity
  const hist = [lassoObjective(P, w, lam)]
  for (let k = 0; k < iters; k++) {
    const g = gradSmooth(P, w).map((v, j) => v + lam * Math.sign(w[j])), step = 0.5 / P.L / Math.sqrt(k + 1)
    w = w.map((v, j) => v - step * g[j]); best = Math.min(best, lassoObjective(P, w, lam)); hist.push(best)
  }
  return { w, hist }
}
