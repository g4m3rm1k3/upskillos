// Soft-margin linear SVM trained in the primal with (batch) Pegasos:
// minimize λ/2·‖w‖² + mean(max(0, 1 − y·(w·φ(x)))), y ∈ {−1, +1}.
// A constant feature 1 in φ provides the intercept.
import { random, normal, mean, range } from '../../kit/math.js'

export const hinge = m => Math.max(0, 1 - m)
export const logistic = m => Math.log1p(Math.exp(-m)) / Math.LN2 // log loss in bits, same scale at m = 0

// Random Fourier features approximate the RBF kernel exp(−γ‖x − x′‖²).
export function rbfMap(gamma, D = 120, seed = 7) {
  const rng = random(seed), W = range(D).map(() => [normal(rng) * Math.sqrt(2 * gamma), normal(rng) * Math.sqrt(2 * gamma)]), b = range(D).map(() => 2 * Math.PI * rng())
  return (a, c) => [1, ...W.map((w, i) => Math.sqrt(2 / D) * Math.cos(w[0] * a + w[1] * c + b[i]))]
}
export const maps = {
  linear: () => (a, c) => [1, a, c],
  quadratic: () => (a, c) => [1, a, c, a * a, c * c, Math.SQRT2 * a * c],
}

export function trainSVM(points, featureFn, { lambda = 0.01, iterations = 1500 } = {}) {
  const X = points.map(p => featureFn(p.x1, p.x2)), y = points.map(p => (p.label ? 1 : -1)), d = X[0].length, n = X.length
  let w = Array(d).fill(0)
  const avg = Array(d).fill(0), start = Math.floor(iterations / 2)
  for (let t = 1; t <= iterations; t++) {
    const eta = 1 / (lambda * t), g = Array(d).fill(0)
    for (let i = 0; i < n; i++) { const m = y[i] * X[i].reduce((s, v, j) => s + v * w[j], 0); if (m < 1) for (let j = 0; j < d; j++) g[j] -= y[i] * X[i][j] / n }
    w = w.map((v, j) => (1 - eta * lambda) * v - eta * g[j])
    const norm = Math.hypot(...w), cap = 1 / Math.sqrt(lambda)
    if (norm > cap) w = w.map(v => v * cap / norm)
    if (t > start) for (let j = 0; j < d; j++) avg[j] += w[j] / (iterations - start)
  }
  return avg
}
export const score = (w, featureFn) => (a, c) => featureFn(a, c).reduce((s, v, j) => s + v * w[j], 0)
export function analyse(w, featureFn, points, lambda) {
  const f = score(w, featureFn), margins = points.map(p => (p.label ? 1 : -1) * f(p.x1, p.x2))
  const wNoBias = w.slice(1)
  return {
    margins,
    supportVectors: new Set(margins.map((m, i) => (m <= 1 + 1e-3 ? i : -1)).filter(i => i >= 0)),
    objective: lambda / 2 * w.reduce((s, v) => s + v * v, 0) + mean(margins.map(hinge)),
    accuracy: mean(margins.map(m => (m > 0 ? 1 : 0))),
    width: 2 / Math.hypot(...wNoBias),
  }
}
