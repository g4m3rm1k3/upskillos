// Gaussian processes: priors over functions defined by kernels, exact
// regression by conditioning a joint Gaussian, and hyperparameters chosen by
// the log marginal likelihood.
import { random, normal, range } from '../../kit/math.js'
import { cholesky, cholSolve, forwardSolve, logDet, gaussianSample } from '../../kit/linalg.js'

export const KERNELS = {
  rbf: { name: 'Squared exponential (RBF) — very smooth', k: (a, b, h) => h.sf * h.sf * Math.exp(-((a - b) ** 2) / (2 * h.ell * h.ell)) },
  matern: { name: 'Matérn 3/2 — rougher', k: (a, b, h) => { const r = Math.sqrt(3) * Math.abs(a - b) / h.ell; return h.sf * h.sf * (1 + r) * Math.exp(-r) } },
  periodic: { name: 'Periodic (period 0.5)', k: (a, b, h) => h.sf * h.sf * Math.exp(-2 * Math.sin(Math.PI * Math.abs(a - b) / 0.5) ** 2 / (h.ell * h.ell)) },
  linear: { name: 'Linear — straight lines only', k: (a, b, h) => h.sf * h.sf * (a - 0.5) * (b - 0.5) + 0.05 },
  rbfPlusLinear: { name: 'RBF + linear (sum of kernels)', k: (a, b, h) => KERNELS.rbf.k(a, b, h) + 0.5 * (a - 0.5) * (b - 0.5) },
}
export const gramMatrix = (xs, ys, kern, h) => xs.map(a => ys.map(b => kern(a, b, h)))

// Functions drawn from the prior at the grid points.
export function priorSamples(kernelKey, h, grid, count, seed) {
  const L = cholesky(gramMatrix(grid, grid, KERNELS[kernelKey].k, h), 1e-8), rng = random(seed)
  return range(count).map(() => gaussianSample(grid.map(() => 0), L, rng))
}

// Posterior mean and variance at test inputs; noise variance sn².
export function gpPosterior(data, kernelKey, h, xs) {
  const kern = KERNELS[kernelKey].k, X = data.map(d => d.x), y = data.map(d => d.y)
  if (!X.length) return { mean: xs.map(() => 0), variance: xs.map(x => kern(x, x, h)), lml: 0 }
  const K = gramMatrix(X, X, kern, h).map((r, i) => r.map((v, j) => v + (i === j ? h.sn * h.sn : 0)))
  const L = cholesky(K, 1e-10), alpha = cholSolve(L, y)
  const mean = [], variance = []
  xs.forEach(x => { const ks = X.map(xi => kern(x, xi, h)), v = forwardSolve(L, ks); mean.push(ks.reduce((s, k, i) => s + k * alpha[i], 0)); variance.push(Math.max(kern(x, x, h) - v.reduce((s, t) => s + t * t, 0), 0)) })
  const lml = -0.5 * y.reduce((s, yi, i) => s + yi * alpha[i], 0) - 0.5 * logDet(L) - X.length / 2 * Math.log(2 * Math.PI)
  return { mean, variance, lml }
}
// Joint posterior samples on a grid (for drawing plausible functions).
export function posteriorSamples(data, kernelKey, h, grid, count, seed) {
  const kern = KERNELS[kernelKey].k, X = data.map(d => d.x)
  const K = gramMatrix(X, X, kern, h).map((r, i) => r.map((v, j) => v + (i === j ? h.sn * h.sn : 0)))
  const post = gpPosterior(data, kernelKey, h, grid)
  if (!X.length) return priorSamples(kernelKey, h, grid, count, seed)
  const L = cholesky(K, 1e-10), Ks = grid.map(g => X.map(xi => kern(g, xi, h))), V = Ks.map(k => forwardSolve(L, k))
  const C = grid.map((a, i) => grid.map((b, j) => kern(a, b, h) - V[i].reduce((s, t, k) => s + t * V[j][k], 0)))
  const Lc = cholesky(C, 1e-6), rng = random(seed)
  return range(count).map(() => gaussianSample(post.mean, Lc, rng))
}

export const target = x => Math.sin(2 * Math.PI * x) + 0.4 * Math.cos(6 * Math.PI * x) * x
// Observations with a deliberate gap between 0.45 and 0.7.
export function observations(n = 14, seed = 42, noise = 0.1) {
  const rng = random(seed), xs = range(n).map(() => { let x; do { x = rng() } while (x > 0.45 && x < 0.7); return x })
  return xs.map(x => ({ x, y: target(x) + noise * normal(rng) }))
}
export const ELLS = [0.02, 0.03, 0.05, 0.07, 0.1, 0.14, 0.2, 0.3, 0.5, 1]
export function lmlCurve(data, kernelKey, sf, sn) { return ELLS.map(ell => ({ ell, lml: gpPosterior(data, kernelKey, { ell, sf, sn }, []).lml })) }
export const grid = (n = 120, lo = -0.1, hi = 1.1) => range(n + 1).map(i => lo + (hi - lo) * i / n)
