// Generalized linear models: one recipe (exponential family + linear natural
// parameter) gives linear, logistic and Poisson regression. Newton's method
// versus gradient descent on the same objective, softmax regression, and
// locally weighted regression.
import { random, normal, range, mean, solve } from '../../kit/math.js'

// Each family: a(η) (log-partition), its derivative (the mean) and second
// derivative (the variance). The mean negative log-likelihood per observation
// is a(η) − y·η (constants dropped).
export const FAMILIES = {
  gaussian: { name: 'Gaussian → linear regression', a: e => e * e / 2, mean: e => e, variance: () => 1, link: 'identity: μ = η' },
  bernoulli: { name: 'Bernoulli → logistic regression', a: e => e > 30 ? e : Math.log1p(Math.exp(e)), mean: e => 1 / (1 + Math.exp(-e)), variance: e => { const p = 1 / (1 + Math.exp(-e)); return p * (1 - p) }, link: 'logit: μ = σ(η)' },
  poisson: { name: 'Poisson → count regression', a: e => Math.exp(e), mean: e => Math.exp(e), variance: e => Math.exp(e), link: 'log: μ = exp(η)' },
}

// One-feature data on x ∈ [0, 10]. The raw scale makes the loss surface
// ill-conditioned, which is exactly when Newton's method shines.
export function makeData(family, { n = 80, seed = 39 } = {}) {
  const rng = random(seed)
  return range(n).map(() => {
    const x = 10 * rng()
    if (family === 'gaussian') return { x, y: 1 + 0.5 * x + normal(rng) }
    if (family === 'bernoulli') return { x, y: rng() < 1 / (1 + Math.exp(-(-4 + 0.8 * x))) ? 1 : 0 }
    const mu = Math.exp(0.2 + 0.25 * x); let k = 0, p = Math.exp(-mu), s = p; const u = rng()
    while (u > s && k < 200) { k++; p *= mu / k; s += p }
    return { x, y: k }
  })
}
export function standardizer(data, on) {
  const m = mean(data.map(d => d.x)), s = Math.sqrt(mean(data.map(d => (d.x - m) ** 2)))
  return on ? { f: x => (x - m) / s, m, s } : { f: x => x, m: 0, s: 1 }
}
// Mean negative log-likelihood, gradient and Hessian for θ = [intercept, slope].
export function objective(family, data, fx = x => x) {
  const F = FAMILIES[family], rows = data.map(d => ({ z: fx(d.x), y: d.y }))
  const nll = ([a, b]) => mean(rows.map(r => { const e = a + b * r.z; return F.a(e) - r.y * e }))
  const grad = ([a, b]) => { let g0 = 0, g1 = 0; rows.forEach(r => { const d = F.mean(a + b * r.z) - r.y; g0 += d; g1 += d * r.z }); return [g0 / rows.length, g1 / rows.length] }
  const hess = ([a, b]) => { let h00 = 0, h01 = 0, h11 = 0; rows.forEach(r => { const v = F.variance(a + b * r.z); h00 += v; h01 += v * r.z; h11 += v * r.z * r.z }); const n = rows.length; return [[h00 / n, h01 / n], [h01 / n, h11 / n]] }
  return { nll, grad, hess }
}

// Newton's method, damped only if a full step would increase the loss.
export function newton(obj, theta0 = [0, 0], iters = 12) {
  const path = [theta0]
  let th = theta0
  for (let i = 0; i < iters; i++) {
    const g = obj.grad(th), step = solve(obj.hess(th), g)
    let t = 1, next = [th[0] - step[0], th[1] - step[1]]
    while (obj.nll(next) > obj.nll(th) + 1e-12 && t > 1e-4) { t /= 2; next = [th[0] - t * step[0], th[1] - t * step[1]] }
    th = next; path.push(th)
  }
  return path
}
// Gradient descent with a backtracking (Armijo) line search, so it never diverges.
export function gradientDescent(obj, theta0 = [0, 0], iters = 200) {
  const path = [theta0]
  let th = theta0, lr = 1
  for (let i = 0; i < iters; i++) {
    const g = obj.grad(th), f0 = obj.nll(th), gg = g[0] * g[0] + g[1] * g[1]
    lr = Math.min(lr * 2, 50)
    let next = [th[0] - lr * g[0], th[1] - lr * g[1]]
    while (obj.nll(next) > f0 - 0.5 * lr * gg && lr > 1e-10) { lr /= 2; next = [th[0] - lr * g[0], th[1] - lr * g[1]] }
    th = next; path.push(th)
  }
  return path
}
export function optimum(obj) { return newton(obj, [0, 0], 60).at(-1) }
export const gaps = (obj, path, best) => { const f = obj.nll(best); return path.map(t => Math.max(obj.nll(t) - f, 1e-16)) }

// Softmax regression on three 2D classes, trained by full-batch gradient descent.
export function threeClasses({ n = 150, seed = 3 } = {}) {
  const rng = random(seed), centers = [[-1.6, -0.8], [1.6, -0.8], [0, 1.6]]
  return range(n).map(i => { const k = i % 3; return { x1: centers[k][0] + 0.85 * normal(rng), x2: centers[k][1] + 0.85 * normal(rng), label: k } })
}
export function softmax(z) { const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s) }
export function trainSoftmax(data, { steps = 200, lr = 0.5 } = {}) {
  let W = range(3).map(() => [0, 0, 0]) // per class: [bias, w1, w2]
  const snapshots = [W.map(r => [...r])]
  for (let s = 0; s < steps; s++) {
    const G = range(3).map(() => [0, 0, 0])
    data.forEach(d => { const x = [1, d.x1, d.x2], p = softmax(W.map(w => w[0] + w[1] * d.x1 + w[2] * d.x2)); p.forEach((pk, k) => { const r = pk - (d.label === k ? 1 : 0); x.forEach((xj, j) => { G[k][j] += r * xj }) }) })
    W = W.map((w, k) => w.map((v, j) => v - lr * G[k][j] / data.length))
    snapshots.push(W.map(r => [...r]))
  }
  return snapshots
}
export const probs = (W, x1, x2) => softmax(W.map(w => w[0] + w[1] * x1 + w[2] * x2))
export const crossEntropy = (W, data) => mean(data.map(d => -Math.log(probs(W, d.x1, d.x2)[d.label])))

// Locally weighted linear regression: a fresh weighted least-squares line per query.
export function lwrData({ n = 60, seed = 5 } = {}) {
  const rng = random(seed)
  return range(n).map(() => { const x = 10 * rng(); return { x, y: Math.sin(x) + 0.3 * x + 0.25 * normal(rng) } }).sort((a, b) => a.x - b.x)
}
export function lwrFit(data, x0, tau) {
  const w = data.map(d => Number.isFinite(tau) ? Math.exp(-((d.x - x0) ** 2) / (2 * tau * tau)) : 1)
  let s0 = 0, s1 = 0, s2 = 0, t0 = 0, t1 = 0
  data.forEach((d, i) => { s0 += w[i]; s1 += w[i] * d.x; s2 += w[i] * d.x * d.x; t0 += w[i] * d.y; t1 += w[i] * d.x * d.y })
  const [b, a] = solve([[s0, s1], [s1, s2]], [t0, t1])
  return { a, b, weights: w, predict: x => b + a * x }
}
// Leave-one-out error: predict each point from a fit that never saw it.
export function lwrLoo(data, tau) {
  return mean(data.map((d, i) => { const rest = data.filter((_, j) => j !== i); return (lwrFit(rest, d.x, tau).predict(d.x) - d.y) ** 2 }))
}
export const TAUS = [0.2, 0.3, 0.5, 0.8, 1.2, 2, 3, 5, Infinity]
