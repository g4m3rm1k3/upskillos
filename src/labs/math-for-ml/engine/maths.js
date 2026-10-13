// python/symbols.py, calculus.py, linalg.py, stats.py and models.py in JavaScript, operation for
// operation, so every figure shows the numbers the Python programs print. engine/parity.test.js
// checks it against recorded Python output (to 1e-12: JavaScript's Math.exp, log and pow can round
// the last binary digit differently from the C library Python uses).
import { PyRandom } from '../../qmaze-lab/engine/mt.js'
export { PyRandom }

// symbols.py
export const predict = (w, b, x) => w * x + b
export function total(xs) { let s = 0; for (const x of xs) s += x; return s }
export const mean = xs => total(xs) / xs.length
export function product(xs) { let p = 1; for (const x of xs) p *= x; return p }
export const compound = n => (1 + 1 / n) ** n
export function expSeries(x, terms = 20) { let s = 0, term = 1; for (let k = 0; k < terms; k++) { s += term; term = term * x / (k + 1) } return s }
export const sigmoid = z => 1 / (1 + Math.exp(-z))
export const logsOfTiny = ps => [product(ps), total(ps.map(Math.log))]
export function argmin(f, candidates) { let best = candidates[0]; for (const c of candidates) if (f(c) < f(best)) best = c; return best }

// calculus.py
export const height = t => 20 - 5 * t * t
export const averageRate = (f, a, b) => (f(b) - f(a)) / (b - a)
export function shrinking(f, x, steps = 6) { const rates = []; let h = 1; for (let i = 0; i < steps; i++) { rates.push([h, averageRate(f, x, x + h)]); h = h / 10 } return rates }
export const derivative = (f, x, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h)
export const sigmoidSlope = z => { const s = sigmoid(z); return s * (1 - s) }
export function descend(slope, x, rate = 0.1, steps = 20) { const path = [x]; for (let i = 0; i < steps; i++) { x = x - rate * slope(x); path.push(x) } return path }
export const bowl = (x, y) => (x - 3) ** 2 + 2 * (y + 1) ** 2
export const bowlGradient = (x, y) => [2 * (x - 3), 4 * (y + 1)]
export function descend2d(x, y, rate = 0.1, steps = 30) { const path = [[x, y]]; for (let i = 0; i < steps; i++) { const [gx, gy] = bowlGradient(x, y); x = x - rate * gx; y = y - rate * gy; path.push([x, y]) } return path }
export function area(f, a, b, n = 100) { const width = (b - a) / n; let s = 0; for (let i = 0; i < n; i++) s += f(a + (i + 0.5) * width) * width; return s }

// linalg.py
export const add = (u, v) => u.map((a, i) => a + v[i])
export const scale = (c, v) => v.map(a => c * a)
export function norm(v) { let s = 0; for (const a of v) s += a * a; return Math.sqrt(s) }
export function dot(u, v) { let s = 0; for (let i = 0; i < u.length; i++) s += u[i] * v[i]; return s }
export const cosine = (u, v) => dot(u, v) / (norm(u) * norm(v))
export const matvec = (A, x) => A.map(row => dot(row, x))
export const transpose = A => A[0].map((_, j) => A.map(row => row[j]))
export const matmul = (A, B) => { const cols = transpose(B); return A.map(row => cols.map(col => dot(row, col))) }
export const det2 = A => A[0][0] * A[1][1] - A[0][1] * A[1][0]
export const inverse2 = A => { const d = det2(A); return [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]] }
export const solve2 = (A, b) => matvec(inverse2(A), b)
export function leastSquares(xs, ys) { const X = xs.map(x => [x, 1]), Xt = transpose(X); return solve2(matmul(Xt, X), matvec(Xt, ys)) }
export function eigen2(A) { const trace = A[0][0] + A[1][1], d = det2(A), root = Math.sqrt(trace * trace / 4 - d); return [trace / 2 + root, trace / 2 - root] }
export function eigenvector2(A, lam) {
  let v
  if (Math.abs(A[0][1]) > 1e-12) v = [A[0][1], lam - A[0][0]]
  else v = Math.abs(lam - A[0][0]) < 1e-12 ? [1, 0] : [0, 1]
  return scale(1 / norm(v), v)
}

// stats.py
export function twoDice() { const t = []; for (let a = 1; a < 7; a++) for (let b = 1; b < 7; b++) t.push(a + b); return t }
export function probability(event, outcomes) { let hits = 0; for (const o of outcomes) if (event(o)) hits++; return hits / outcomes.length }
export function distribution(outcomes) { const p = new Map(); for (const o of outcomes) p.set(o, (p.get(o) ?? 0) + 1 / outcomes.length); return p }
export function expectation(p) { let t = 0; for (const [x, px] of p) t += x * px; return t }
export function variance(p) { const mu = expectation(p); let t = 0; for (const [x, px] of p) t += (x - mu) ** 2 * px; return t }
export function bayes(prior, hitRate, falseAlarm) { const positive = hitRate * prior + falseAlarm * (1 - prior); return hitRate * prior / positive }
export function normalPdf(x, mu = 0, sigma = 1) { const z = (x - mu) / sigma; return Math.exp(-z * z / 2) / (sigma * Math.sqrt(2 * Math.PI)) }
export function sampleMeans(n, trials = 200, seed = 0) {
  const rng = new PyRandom(seed), means = []
  for (let t = 0; t < trials; t++) { const rolls = []; for (let i = 0; i < n; i++) rolls.push(1 + rng.randrange(6)); means.push(mean(rolls)) }
  return means
}
export function likelihood(p, flips) { let L = 1; for (const f of flips) L *= f === 1 ? p : 1 - p; return L }
export function logLikelihood(p, flips) { let t = 0; for (const f of flips) t += Math.log(f === 1 ? p : 1 - p); return t }
export function covariance(xs, ys) { const mx = mean(xs), my = mean(ys); let t = 0; for (let i = 0; i < xs.length; i++) t += (xs[i] - mx) * (ys[i] - my); return t / xs.length }
export const correlation = (xs, ys) => covariance(xs, ys) / Math.sqrt(covariance(xs, xs) * covariance(ys, ys))
export function pca2(xs, ys) { const C = [[covariance(xs, xs), covariance(xs, ys)], [covariance(xs, ys), covariance(ys, ys)]], [big, small] = eigen2(C); return [eigenvector2(C, big), big, small] }

// models.py
export const HOURS = [1, 2, 3, 4, 5, 6], SCORES = [52, 55, 61, 64, 70, 71]
export const STUDY = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5], PASSED = [0, 0, 0, 1, 0, 1, 0, 1, 1, 1]
export function mse(w, b, xs, ys) { let t = 0; for (let i = 0; i < xs.length; i++) t += (w * xs[i] + b - ys[i]) ** 2; return t / xs.length }
export function mseGradient(w, b, xs, ys) { let gw = 0, gb = 0; for (let i = 0; i < xs.length; i++) { const error = w * xs[i] + b - ys[i]; gw += 2 * error * xs[i] / xs.length; gb += 2 * error / xs.length } return [gw, gb] }
export function fitLine(xs, ys, rate = 0.02, steps = 2000, onStep) { let w = 0, b = 0; for (let s = 0; s < steps; s++) { const [gw, gb] = mseGradient(w, b, xs, ys); w = w - rate * gw; b = b - rate * gb; onStep?.(s, w, b) } return [w, b] }
export const exactLine = leastSquares
export function ridgeLine(xs, ys, lam) {
  const n = xs.length
  let sxx = 0, sx = 0, sxy = 0, sy = 0
  for (const x of xs) sxx += x * x
  for (const x of xs) sx += x
  for (let i = 0; i < n; i++) sxy += xs[i] * ys[i]
  for (const y of ys) sy += y
  const det = (sxx + n * lam) * n - sx * sx
  return [(n * sxy - sx * sy) / det, ((sxx + n * lam) * sy - sx * sxy) / det]
}
export const bce = (p, y) => -(y * Math.log(p) + (1 - y) * Math.log(1 - p))
export function fitLogistic(xs, ys, rate = 0.1, steps = 3000) {
  let w = 0, b = 0
  for (let s = 0; s < steps; s++) {
    let gw = 0, gb = 0
    for (let i = 0; i < xs.length; i++) { const p = sigmoid(w * xs[i] + b); gw += (p - ys[i]) * xs[i] / xs.length; gb += (p - ys[i]) / xs.length }
    w = w - rate * gw; b = b - rate * gb
  }
  return [w, b]
}
export function softmax(zs) { const top = Math.max(...zs), exps = zs.map(z => Math.exp(z - top)); let s = 0; for (const e of exps) s += e; return exps.map(e => e / s) }
export const crossEntropy = (p, target) => -Math.log(p[target])
export function entropy(p) { let s = 0; for (const pi of p) if (pi > 0) s += pi * Math.log(pi); return -s }
export function kl(p, q) { let s = 0; for (let i = 0; i < p.length; i++) if (p[i] > 0) s += p[i] * Math.log(p[i] / q[i]); return s }
export function layer(W, b, x) { const z = matvec(W, x).map((zi, i) => zi + b[i]); return z.map(sigmoid) }
export function tinyNet([W1, b1, w2, b2], x) { const h = layer(W1, b1, x); return [dot(w2, h) + b2, h] }
export function backprop(params, x, y) {
  const [, , w2] = params, [yHat, h] = tinyNet(params, x), dY = 2 * (yHat - y)
  const gW2 = h.map(hi => dY * hi), dH = w2.map(wi => dY * wi), dZ = dH.map((dh, i) => dh * h[i] * (1 - h[i]))
  return [dZ.map(dz => x.map(xj => dz * xj)), dZ, gW2, dY]
}
export function adam(grad, x, y, rate = 0.1, steps = 100, beta1 = 0.9, beta2 = 0.999, eps = 1e-8, onStep) {
  const m = [0, 0], v = [0, 0], theta = [x, y]
  for (let t = 1; t <= steps; t++) {
    const g = grad(theta[0], theta[1])
    for (let i = 0; i < 2; i++) {
      m[i] = beta1 * m[i] + (1 - beta1) * g[i]
      v[i] = beta2 * v[i] + (1 - beta2) * g[i] ** 2
      const mHat = m[i] / (1 - beta1 ** t), vHat = v[i] / (1 - beta2 ** t)
      theta[i] = theta[i] - rate * mHat / (Math.sqrt(vHat) + eps)
    }
    onStep?.(t, [...theta])
  }
  return theta
}
export function attention(Q, K, V) {
  const d = K[0].length
  return Q.map(q => {
    const weights = softmax(K.map(k => dot(q, k) / Math.sqrt(d)))
    return V[0].map((_, j) => { let s = 0; for (let i = 0; i < V.length; i++) s += weights[i] * V[i][j]; return s })
  })
}
