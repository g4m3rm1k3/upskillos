// Model complexity on a known curve: polynomial features, ridge (L2) and
// lasso (L1), bias–variance by refitting on many training sets, learning curves.
import { random, normal, mean, range, linspace, solve } from '../../kit/math.js'

export const truth = x => Math.sin(Math.PI * x) + 0.4 * x // on x ∈ [−1, 1]
export function makeData(n, noise, seed) {
  const rng = random(seed)
  return range(n).map(() => { const x = -1 + 2 * rng(); return { x, y: truth(x) + noise * normal(rng) } })
}

// Legendre polynomials P1..Pd: the same functions as x, x², …, x^d spans, but
// numerically well-conditioned. Degree d means "any polynomial of degree ≤ d".
export function features(x, degree) {
  const P = [1, x]
  for (let k = 1; k < degree; k++) P.push(((2 * k + 1) * x * P[k] - k * P[k - 1]) / (k + 1))
  return P.slice(1, degree + 1)
}

// Ridge with an unpenalized intercept: center, solve (ΦᵀΦ/n + λI) w = Φᵀy/n.
export function fitRidge(data, degree, lambda) {
  if (degree === 0) return { w: [], b: mean(data.map(d => d.y)), degree }
  const Phi = data.map(d => features(d.x, degree)), y = data.map(d => d.y), n = data.length
  const mu = range(degree).map(j => mean(Phi.map(r => r[j]))), my = mean(y)
  const C = Phi.map(r => r.map((v, j) => v - mu[j]))
  const A = range(degree).map(i => range(degree).map(j => C.reduce((t, r) => t + r[i] * r[j], 0) / n + (i === j ? lambda + 1e-10 : 0)))
  const c = range(degree).map(i => C.reduce((t, r, k) => t + r[i] * (y[k] - my), 0) / n)
  const w = solve(A, c)
  return { w, b: my - w.reduce((t, v, j) => t + v * mu[j], 0), degree }
}

// Lasso by cyclic coordinate descent on centered features (unpenalized intercept).
export const softThreshold = (z, t) => Math.sign(z) * Math.max(Math.abs(z) - t, 0)
export function fitLasso(data, degree, lambda, sweeps = 300) {
  if (degree === 0) return { w: [], b: mean(data.map(d => d.y)), degree }
  const Phi = data.map(d => features(d.x, degree)), y = data.map(d => d.y), n = data.length
  const mu = range(degree).map(j => mean(Phi.map(r => r[j]))), my = mean(y)
  const C = Phi.map(r => r.map((v, j) => v - mu[j])), sq = range(degree).map(j => mean(C.map(r => r[j] ** 2)))
  const w = Array(degree).fill(0), resid = y.map(v => v - my)
  for (let s = 0; s < sweeps; s++) for (let j = 0; j < degree; j++) {
    const rho = mean(C.map((r, k) => r[j] * (resid[k] + r[j] * w[j])))
    const next = softThreshold(rho, lambda / 2) / sq[j]
    if (next !== w[j]) { C.forEach((r, k) => { resid[k] -= r[j] * (next - w[j]) }); w[j] = next }
  }
  return { w, b: my - w.reduce((t, v, j) => t + v * mu[j], 0), degree }
}

export const predict = (model, x) => model.b + features(x, model.degree).reduce((t, v, j) => t + v * model.w[j], 0)
export const mse = (model, data) => mean(data.map(d => (predict(model, d.x) - d.y) ** 2))
export const fit = (data, degree, lambda, penalty) => penalty === 'l1' ? fitLasso(data, degree, lambda) : fitRidge(data, degree, lambda)

export function validationCurve({ n, noise, seed, lambda, penalty, maxDegree = 15 }) {
  const train = makeData(n, noise, seed), val = makeData(400, noise, seed + 1000)
  return range(maxDegree + 1).map(d => { const m = fit(train, d, lambda, penalty); return { degree: d, train: mse(m, train), val: mse(m, val) } })
}

// Refit on `reps` independent training sets; decompose expected error on a grid.
export function biasVariance({ n, noise, degree, lambda, penalty, reps = 40, seed = 1 }) {
  const grid = linspace(-0.95, 0.95, 40)
  const preds = range(reps).map(r => { const m = fit(makeData(n, noise, seed * 97 + r), degree, lambda, penalty); return grid.map(x => predict(m, x)) })
  const avg = grid.map((_, i) => mean(preds.map(p => p[i])))
  // Unbiased estimates: the average of R fits still carries Var/R of noise, so
  // (avg − f)² overstates bias² by that amount; subtract it.
  const varAt = grid.map((_, i) => preds.reduce((t, p) => t + (p[i] - avg[i]) ** 2, 0) / (reps - 1))
  const bias2 = Math.max(0, mean(grid.map((x, i) => (avg[i] - truth(x)) ** 2 - varAt[i] / reps)))
  const variance = mean(varAt)
  return { grid, preds, avg, bias2, variance, noise: noise * noise }
}

export function learningCurve({ degree, lambda, penalty, noise, sizes = [10, 15, 20, 30, 45, 70, 100, 150, 220], reps = 8, seed = 3 }) {
  const val = makeData(400, noise, seed + 5000)
  return sizes.map(n => {
    const runs = range(reps).map(r => { const tr = makeData(n, noise, seed * 131 + n * 7 + r); const m = fit(tr, degree, lambda, penalty); return [mse(m, tr), mse(m, val)] })
    return { n, train: mean(runs.map(r => r[0])), val: mean(runs.map(r => r[1])) }
  })
}
