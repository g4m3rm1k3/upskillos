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
// Sets, logic, pieces and bounds (Part 1's additions). members returns the universe's members in order.
export function members(universe, condition) { return [...universe].filter(condition) }
export function inInterval(x, a, b, brackets = '[)') { const leftOk = brackets[0] === '[' ? a <= x : a < x, rightOk = brackets[1] === ']' ? x <= b : x < b; return leftOk && rightOk }
export function implies(p, q) { return !p || q }
export function forAll(xs, claim) { for (const x of xs) if (!claim(x)) return false; return true }
export function exists(xs, claim) { for (const x of xs) if (claim(x)) return true; return false }
export function relu(z) { return z > 0 ? z : 0 }
export function clip(x, low, high) { return x < low ? low : x > high ? high : x }
export function accuracy(predictions, labels) { let hits = 0; for (let i = 0; i < labels.length; i++) hits += predictions[i] === labels[i] ? 1 : 0; return hits / labels.length }
export function sumBounds(xs) { const n = xs.length; return [n * Math.min(...xs), total(xs), n * Math.max(...xs)] }

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

// Proof and counting (python/proof.py). Whole-number results stay exact while they are below 2⁵³.
export function firstCounterexample(claim, candidates) { for (const c of candidates) if (!claim(c)) return c; return null }
export function smallestFactor(n) { let d = 2; while (d * d <= n) { if (n % d === 0) return d; d += 1 } return n }
export function isPrime(n) { return n > 1 && smallestFactor(n) === n }
export function euclidStep(primes) { let q = 1; for (const p of primes) q *= p; q += 1; return [q, smallestFactor(q)] }
export function sumTo(n) { let s = 0; for (let i = 1; i <= n; i++) s += i; return s }
export function gauss(n) { return n * (n + 1) / 2 }
export function geometric(r, n) { let s = 0, term = 1; for (let i = 0; i < n; i++) { s += term; term *= r } return [s, (1 - r ** n) / (1 - r)] }
export function factorial(n) { let p = 1; for (let k = 2; k <= n; k++) p *= k; return p }
export function arrangements(n, k) { let p = 1; for (let j = 0; j < k; j++) p *= n - j; return p }
export function choose(n, k) { if (k < 0 || k > n) return 0; return Math.round(arrangements(n, k) / factorial(k)) }
export function pascal(rows) { const t = [[1]]; for (let n = 1; n < rows; n++) { const above = t[t.length - 1], row = [1]; for (let k = 1; k < n; k++) row.push(above[k - 1] + above[k]); row.push(1); t.push(row) } return t }
export function binomialPmf(k, n, p) { return choose(n, k) * p ** k * (1 - p) ** (n - k) }
export function collisionChance(k, m) { let allDifferent = 1; for (let i = 0; i < k; i++) allDifferent *= (m - i) / m; return 1 - allDifferent }

// Calculus additions (python/calculus.py).
export function deltaFor(f, a, limit, eps) { let delta = 1; while (delta > 1e-12) { const xs = []; for (let k = -50; k <= 50; k++) if (k !== 0) xs.push(a + delta * k / 50); if (xs.every(x => Math.abs(f(x) - limit) < eps)) return delta; delta /= 2 } return null }
export function tanh(z) { return (Math.exp(z) - Math.exp(-z)) / (Math.exp(z) + Math.exp(-z)) }
export function tanhSlope(z) { const t = tanh(z); return 1 - t * t }
export function logit(p) { return Math.log(p / (1 - p)) }
export function logitSlope(p) { return 1 / (p * (1 - p)) }
export function secondDerivative(f, x, h = 1e-4) { return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h) }
export function evalPoly(coeffs, x) { let t = 0; coeffs.forEach((a, n) => { t += a * x ** n }); return t }
export function integratePoly(coeffs) { return [0, ...coeffs.map((a, n) => a / (n + 1))] }
export function definitePoly(coeffs, a, b) { const F = integratePoly(coeffs); return evalPoly(F, b) - evalPoly(F, a) }
export function normalMoment(k, n = 4000) { return area(z => z ** k * Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI), -10, 10, n) }
export function taylor(derivatives, a, x) { let total = 0, factor = 1; derivatives.forEach((d, k) => { total += d * factor; factor *= (x - a) / (k + 1) }); return total }
export function taylorExp(x, n) { let total = 0, term = 1; for (let k = 0; k <= n; k++) { total += term; term *= x / (k + 1) } return [total, Math.exp(Math.abs(x)) * Math.abs(term)] }

// Many variables (python/linalg.py).
export function totalDerivative(grad, path, velocity, t) { return dot(grad(path(t)), velocity(t)) }
export function jacobian(f, x, h = 1e-6) { const columns = x.map((_, j) => { const up = [...x], down = [...x]; up[j] += h; down[j] -= h; const fu = f(up), fd = f(down); return fu.map((a, i) => (a - fd[i]) / (2 * h)) }); return transpose(columns) }
export function softmaxJacobian(p) { return p.map((pi, i) => p.map((pj, j) => pi * ((i === j ? 1 : 0) - pj))) }
export function hessian(f, x, h = 1e-4) { const grad = point => point.map((_, i) => { const up = [...point], down = [...point]; up[i] += h; down[i] -= h; return (f(up) - f(down)) / (2 * h) }); return jacobian(grad, x, h) }

// Areas and volumes (python/stats.py).
export function doubleIntegral(f, ax, bx, ay, by, n = 100) { const wx = (bx - ax) / n, wy = (by - ay) / n; let t = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) t += f(ax + (i + 0.5) * wx, ay + (j + 0.5) * wy) * wx * wy; return t }
export function ringSum(g, rMax, n = 2000) { const dr = rMax / n; let t = 0; for (let i = 0; i < n; i++) { const r = (i + 0.5) * dr; t += g(r) * 2 * Math.PI * r * dr } return t }

// More linear algebra (python/matrices.py), line for line. argmaxAbs breaks ties like Python's max: first wins.
const argmaxAbs = (M, from, to, c) => { let best = from; for (let i = from + 1; i < to; i++) if (Math.abs(M[i][c]) > Math.abs(M[best][c])) best = i; return best }
export function rowReduce(A, tol = 1e-12) {
  const M = A.map(r => [...r]), rows = M.length, cols = M[0].length, pivots = []; let r = 0
  for (let c = 0; c < cols; c++) {
    if (r === rows) break
    const best = argmaxAbs(M, r, rows, c)
    if (Math.abs(M[best][c]) < tol) continue;
    [M[r], M[best]] = [M[best], M[r]]
    for (let i = r + 1; i < rows; i++) { const factor = M[i][c] / M[r][c]; M[i] = M[i].map((a, k) => a - factor * M[r][k]) }
    pivots.push(c); r += 1
  }
  return [M, pivots]
}
export function solve(A, b) { const [M] = rowReduce(A.map((row, i) => [...row, b[i]])), n = A.length, x = Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = 0; for (let j = i + 1; j < n; j++) s += M[i][j] * x[j]; x[i] = (M[i][n] - s) / M[i][i] } return x }
export function coordinates(basis, v) { return solve(transpose(basis), v) }
export function eliminationCost(n) { let count = 0; for (let c = 0; c < n; c++) count += (n - c - 1) * (n - c); return count }
export function rank(A) { return rowReduce(A)[1].length }
export function determinant(A) {
  const M = A.map(r => [...r]), n = M.length; let d = 1
  for (let c = 0; c < n; c++) {
    const best = argmaxAbs(M, c, n, c)
    if (M[best][c] === 0) return 0
    if (best !== c) { [M[c], M[best]] = [M[best], M[c]]; d = -d }
    d *= M[c][c]
    for (let i = c + 1; i < n; i++) { const factor = M[i][c] / M[c][c]; M[i] = M[i].map((a, k) => a - factor * M[c][k]) }
  }
  return d
}
export function project(v, u) { const k = dot(v, u) / dot(u, u); return u.map(a => k * a) }
export function gramSchmidt(vectors) { const basis = []; for (const v of vectors) { let w = [...v]; for (const q of basis) { const shadow = project(w, q); w = w.map((a, i) => a - shadow[i]) } const length = norm(w); basis.push(w.map(a => a / length)) } return basis }
export function isOrthogonal(Q, tol = 1e-9) { const P = matmul(transpose(Q), Q); return P.every((row, i) => row.every((v, j) => Math.abs(v - (i === j ? 1 : 0)) < tol)) }
export function reflection(u) { return u.map((ui, i) => u.map((uj, j) => (i === j ? 1 : 0) - 2 * ui * uj)) }
export function symmetricEigen(S, sweeps = 30) {
  const n = S.length, A = S.map(r => [...r]), V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
  for (let sweep = 0; sweep < sweeps; sweep++) for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
    if (Math.abs(A[p][q]) < 1e-15) continue
    const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]), t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c
    for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq }
    for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk }
    for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq }
  }
  const pairs = transpose(V).map((vec, i) => [A[i][i], vec]).sort((a, b) => b[0] - a[0])
  return [pairs.map(p => p[0]), pairs.map(p => p[1])]
}
export function quadraticForm(S, v) { return dot(v, matvec(S, v)) }
export function cholesky(S) {
  const n = S.length, L = Array.from({ length: n }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = S[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]
    if (i === j) { if (s <= 0) return null; L[i][i] = Math.sqrt(s) } else L[i][j] = s / L[j][j]
  }
  return L
}
export function svd(A) {
  const [values, vectors] = symmetricEigen(matmul(transpose(A), A)), us = [], sigmas = [], vs = []
  values.forEach((lam, i) => { const sigma = Math.sqrt(Math.max(lam, 0)); if (sigma > 1e-10) { sigmas.push(sigma); vs.push(vectors[i]); us.push(matvec(A, vectors[i]).map(a => a / sigma)) } })
  return [us, sigmas, vs]
}
export function lowRank(A, k) { const [us, sigmas, vs] = svd(A), B = A.map(r => r.map(() => 0)); for (let t = 0; t < Math.min(k, sigmas.length); t++) for (let i = 0; i < A.length; i++) for (let j = 0; j < A[0].length; j++) B[i][j] += sigmas[t] * us[t][i] * vs[t][j]; return B }
export function trace(A) { let t = 0; for (let i = 0; i < A.length; i++) t += A[i][i]; return t }
export function frobenius(A) { let t = 0; for (const row of A) for (const a of row) t += a * a; return Math.sqrt(t) }
export function quadraticGradient(A, x) { const a = matvec(A, x), b = matvec(transpose(A), x); return a.map((v, i) => v + b[i]) }
export function shape(t) { const dims = []; while (Array.isArray(t)) { dims.push(t.length); t = t[0] } return dims }
export function addBias(rows, b) { return rows.map(row => row.map((x, i) => x + b[i])) }
export function batchMatmul(As, Bs) { return As.map((A, i) => matmul(A, Bs[i])) }

// Probability additions (python/chance.py). Random draws reproduce Python's exactly through PyRandom;
// shuffle is CPython's: for i from the end, swap with randrange(i + 1).
const fsum = xs => { let t = 0; for (const x of xs) t += x; return t }
const pyShuffle = (xs, rng) => { for (let i = xs.length - 1; i > 0; i--) { const j = rng.randrange(i + 1); [xs[i], xs[j]] = [xs[j], xs[i]] } }
const combos = (items, k) => k === 0 ? [[]] : items.flatMap((x, i) => combos(items.slice(i + 1), k - 1).map(c => [x, ...c]))
export function prob(event, outcomes) { let hits = 0; for (const o of outcomes) if (event(o)) hits += 1; return hits / outcomes.length }
export function inclusionExclusion(events, outcomes) { let total = 0; for (let size = 1; size <= events.length; size++) { const sign = size % 2 ? 1 : -1; for (const group of combos(events, size)) total += sign * prob(o => group.every(e => e(o)), outcomes) } return total }
export function independent(A, B, outcomes) { const n = outcomes.length; let a = 0, b = 0, ab = 0; for (const o of outcomes) { const x = A(o), y = B(o); a += x; b += y; ab += x && y } return ab * n === a * b }
export function poissonPmf(k, lam) { return Math.exp(-lam) * lam ** k / factorial(k) }
export function exponentialPdf(x, rate) { return x >= 0 ? rate * Math.exp(-rate * x) : 0 }
export function sampleExponential(rate, rng) { const u = 1 - rng.random(); return -Math.log(u) / rate }
export function sampleCategorical(ps, rng) { const u = rng.random(); let total = 0; for (let i = 0; i < ps.length; i++) { total += ps[i]; if (u < total) return i } return ps.length - 1 }
export function marginal(joint, axis) { const out = new Map(); for (const [xy, p] of joint) out.set(xy[axis], (out.get(xy[axis]) ?? 0) + p); return out }
export function conditionalGivenY(joint, y) { let py = 0; for (const [[, b], p] of joint) if (b === y) py += p; const out = new Map(); for (const [[a, b], p] of joint) if (b === y) out.set(a, p / py); return out }
export function variancePop(xs) { const m = mean(xs); return fsum(xs.map(x => (x - m) ** 2)) / xs.length }
export function chebyshevBound(sigma, n, eps) { return sigma * sigma / (n * eps * eps) }
export function runningMeans(n, seed = 0) { const rng = new PyRandom(seed); let total = 0; const out = []; for (let i = 1; i <= n; i++) { total += 1 + rng.randrange(6); out.push(total / i) } return out }
export function standardizedSums(n, trials, seed = 0) { const rng = new PyRandom(seed), mu = n / 2, sd = Math.sqrt(n / 12), out = []; for (let t = 0; t < trials; t++) { const xs = []; for (let i = 0; i < n; i++) xs.push(rng.random()); out.push((fsum(xs) - mu) / sd) } return out }
export function mvnPdf(x, mu, S) { const det = S[0][0] * S[1][1] - S[0][1] * S[1][0], inv = [[S[1][1] / det, -S[0][1] / det], [-S[1][0] / det, S[0][0] / det]], d = [x[0] - mu[0], x[1] - mu[1]]; const q = d[0] * (inv[0][0] * d[0] + inv[0][1] * d[1]) + d[1] * (inv[1][0] * d[0] + inv[1][1] * d[1]); return Math.exp(-q / 2) / (2 * Math.PI * Math.sqrt(det)) }
export function transformedDensity(p, gInverse, gInverseSlope, y) { return p(gInverse(y)) * Math.abs(gInverseSlope(y)) }
export function monteCarlo(f, sampler, n, seed = 0) { const rng = new PyRandom(seed), vals = []; for (let i = 0; i < n; i++) vals.push(f(sampler(rng))); return fsum(vals) / n }
export function importance(f, p, q, qSampler, n, seed = 0) { const rng = new PyRandom(seed); let total = 0; for (let i = 0; i < n; i++) { const x = qSampler(rng); total += f(x) * p(x) / q(x) } return total / n }
export function jensenGap(f, xs) { return mean(xs.map(f)) - f(mean(xs)) }
export function entropyBits(ps) { return -fsum(ps.filter(p => p > 0).map(p => p * Math.log2(p))) }
export function mutualInformation(joint) { const px = marginal(joint, 0), py = marginal(joint, 1), terms = []; for (const [[x, y], p] of joint) if (p > 0) terms.push(p * Math.log2(p / (px.get(x) * py.get(y)))); return fsum(terms) }
export function markovStep(P, dist) { return dist.map((_, j) => fsum(dist.map((d, i) => d * P[i][j]))) }
export function stationary(P, steps = 200) { let dist = P.map(() => 1 / P.length); for (let s = 0; s < steps; s++) dist = markovStep(P, dist); return dist }
export function bootstrapInterval(xs, stat, B = 2000, seed = 0) { const rng = new PyRandom(seed), values = []; for (let b = 0; b < B; b++) values.push(stat(xs.map(() => rng.choice(xs)))); values.sort((a, b) => a - b); return [values[Math.floor(0.025 * B)], values[Math.floor(0.975 * B) - 1]] }
export function permutationPValue(a, b, trials = 5000, seed = 0) { const rng = new PyRandom(seed), observed = Math.abs(mean(a) - mean(b)), pooled = [...a, ...b]; let hits = 0; for (let t = 0; t < trials; t++) { pyShuffle(pooled, rng); if (Math.abs(mean(pooled.slice(0, a.length)) - mean(pooled.slice(a.length))) >= observed) hits += 1 } return hits / trials }
export function betaBinomial(a, b, heads, tails) { const a2 = a + heads, b2 = b + tails; return [a2, b2, (a2 - 1) / (a2 + b2 - 2), a2 / (a2 + b2)] }

// Optimisation (python/optimise.py).
export function chordAbove(f, a, b, t) { return f(t * a + (1 - t) * b) <= t * f(a) + (1 - t) * f(b) + 1e-12 }
export function isConvexOn(f, lo, hi, n = 40) { const xs = Array.from({ length: n + 1 }, (_, i) => lo + (hi - lo) * i / n); for (const a of xs) for (const b of xs) for (const t of [0.25, 0.5, 0.75]) if (!chordAbove(f, a, b, t)) return false; return true }
export function descentStep(f, grad, x, eta, L) { const g = grad(x); return [f(x) - f(x - eta * g), eta * (1 - L * eta / 2) * g * g] }
export function newton(f1, f2, x, steps = 6) { const path = [x]; for (let i = 0; i < steps; i++) { x = x - f1(x) / f2(x); path.push(x) } return path }
export function fullGradient(w, xs, ys) { const terms = xs.map((x, i) => 2 * (w * x - ys[i]) * x); let s = 0; for (const t of terms) s += t; return s / xs.length }
export function sgd(xs, ys, eta, batch, epochs, seed = 0) {
  const rng = new PyRandom(seed), order = xs.map((_, i) => i), path = []; let w = 0; path.push(w)
  for (let e = 0; e < epochs; e++) {
    for (let i = order.length - 1; i > 0; i--) { const j = rng.randrange(i + 1); [order[i], order[j]] = [order[j], order[i]] }
    for (let start = 0; start < order.length; start += batch) { const idx = order.slice(start, start + batch); let g = 0; for (const i of idx) g += 2 * (w * xs[i] - ys[i]) * xs[i]; w = w - eta * (g / idx.length); path.push(w) }
  }
  return path
}
export function momentum(grad, x, eta, beta, steps) { let v = 0; const path = [x]; for (let i = 0; i < steps; i++) { v = beta * v + grad(x); x = x - eta * v; path.push(x) } return path }
export function cosineSchedule(t, total, lrMax, lrMin = 0, warmup = 0) { if (t < warmup) return lrMax * (t + 1) / warmup; const progress = (t - warmup) / Math.max(1, total - warmup); return lrMin + (lrMax - lrMin) * (1 + Math.cos(Math.PI * progress)) / 2 }
export function bestOnCircle(f, n = 3600) { let best = null; for (let i = 0; i < n; i++) { const t = 2 * Math.PI * i / n, p = [Math.cos(t), Math.sin(t)]; if (best === null || f(p) < f(best)) best = p } return best }
export function kktBounded(c, bound) { return c <= bound ? [c, 0] : [bound, 2 * (c - bound)] }
export function projectedGd(grad, project, x, eta, steps) { const path = [x]; for (let i = 0; i < steps; i++) { x = project(x - eta * grad(x)); path.push(x) } return path }
export function dualValue(lam) { const x = lam / 2; return x * x + lam * (1 - x) }

// Algorithms (python/algorithms.py). lcg uses BigInt: a·x exceeds 2⁵³, where doubles stop being exact.
export function growth(n) { return [Math.log2(n), n, n * Math.log2(n), n * n, 2 ** n] }
export function boundedBy(f, g, c, n0, upto = 10000) { for (let n = n0; n <= upto; n++) if (f(n) > c * g(n)) return false; return true }
export function matmulCost(n, m, p) { let count = 0; for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) for (let k = 0; k < m; k++) count += 1; return count }
export function attentionCost(T, d) { return matmulCost(T, d, T) + matmulCost(T, T, d) }
export function mergeSort(xs) {
  if (xs.length <= 1) return [[...xs], 0]
  const mid = Math.floor(xs.length / 2), [left, c1] = mergeSort(xs.slice(0, mid)), [right, c2] = mergeSort(xs.slice(mid)), merged = []
  let i = 0, j = 0, comparisons = c1 + c2
  while (i < left.length && j < right.length) { comparisons += 1; if (left[i] <= right[j]) merged.push(left[i++]); else merged.push(right[j++]) }
  return [[...merged, ...left.slice(i), ...right.slice(j)], comparisons]
}
export function binarySearch(xs, target) { let lo = 0, hi = xs.length - 1, steps = 0; while (lo <= hi) { steps += 1; const mid = Math.floor((lo + hi) / 2); if (xs[mid] === target) return [mid, steps]; if (xs[mid] < target) lo = mid + 1; else hi = mid - 1 } return [-1, steps] }
export function machineEpsilon() { let e = 1; while (1 + e / 2 > 1) e /= 2; return e }
export function floatParts(x) { if (x === 0) return [0, 0]; let e = Math.floor(Math.log2(Math.abs(x))) + 1, m = x / 2 ** e; if (Math.abs(m) >= 1) { m /= 2; e += 1 } if (Math.abs(m) < 0.5) { m *= 2; e -= 1 } return [m, e] }
export function naiveLogsumexp(zs) { let s = 0; for (const z of zs) s += Math.exp(z); return Math.log(s) }
export function logsumexp(zs) { const m = Math.max(...zs); let s = 0; for (const z of zs) s += Math.exp(z - m); return m + Math.log(s) }
export function onePassVariance(xs) { const n = xs.length; let s = 0, s2 = 0; for (const x of xs) { s += x; s2 += x * x } return s2 / n - (s / n) ** 2 }
export function lcg(seed, n, a = 1103515245n, c = 12345n, m = 2n ** 31n) { let x = BigInt(seed); const out = []; for (let i = 0; i < n; i++) { x = (a * x + c) % m; out.push(Number(x) / Number(m)) } return out }
export class Value {
  constructor(data, parents = [], localGrads = []) { this.data = data; this.grad = 0; this.parents = parents; this.localGrads = localGrads }
  add(other) { other = other instanceof Value ? other : new Value(other); return new Value(this.data + other.data, [this, other], [1, 1]) }
  mul(other) { other = other instanceof Value ? other : new Value(other); return new Value(this.data * other.data, [this, other], [other.data, this.data]) }
  exp() { const e = Math.exp(this.data); return new Value(e, [this], [e]) }
  backward() { const order = [], seen = new Set(); const visit = v => { if (!seen.has(v)) { seen.add(v); for (const p of v.parents) visit(p); order.push(v) } }; visit(this); this.grad = 1; for (const v of order.reverse()) v.parents.forEach((p, i) => { p.grad += v.grad * v.localGrads[i] }) }
}
export class Dual {
  constructor(value, slope = 0) { this.value = value; this.slope = slope }
  add(other) { other = other instanceof Dual ? other : new Dual(other); return new Dual(this.value + other.value, this.slope + other.slope) }
  mul(other) { other = other instanceof Dual ? other : new Dual(other); return new Dual(this.value * other.value, this.slope * other.value + this.value * other.slope) }
}
export function editDistance(a, b) { const D = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))); for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) { const cost = a[i - 1] === b[j - 1] ? 0 : 1; D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + cost) } return D[a.length][b.length] }
export function viterbi(observations, start, trans, emit) {
  const n = start.length, argmaxBy = f => { let best = 0; for (let r = 1; r < n; r++) if (f(r) > f(best)) best = r; return best }
  let best = start.map((p, s) => Math.log(p) + Math.log(emit[s][observations[0]])); const back = []
  for (const o of observations.slice(1)) { const step = [], choice = []; for (let s = 0; s < n; s++) { const prev = argmaxBy(r => best[r] + Math.log(trans[r][s])); step.push(best[prev] + Math.log(trans[prev][s]) + Math.log(emit[s][o])); choice.push(prev) } best = step; back.push(choice) }
  let state = argmaxBy(s => best[s]); const path = [state]
  for (const choice of [...back].reverse()) { state = choice[state]; path.push(state) }
  return path.reverse()
}
export function walks(A, k) { const n = A.length; let P = A.map((_, i) => A.map((__, j) => (i === j ? 1 : 0))); for (let t = 0; t < k; t++) P = P.map((_, i) => A.map((__, j) => { let s = 0; for (let m = 0; m < n; m++) s += P[i][m] * A[m][j]; return s })); return P }
export function pagerank(A, d = 0.85, iters = 100) { const n = A.length, out = A.map(row => row.reduce((s, v) => s + v, 0)); let r = Array(n).fill(1 / n); for (let t = 0; t < iters; t++) r = r.map((_, j) => { let s = 0; for (let i = 0; i < n; i++) if (out[i]) s += r[i] * A[i][j] / out[i]; return (1 - d) / n + d * s }); return r }
export function gnnLayer(A, H) { return A.map((row, i) => { const group = [i, ...row.flatMap((v, j) => (v ? [j] : []))]; return H[0].map((_, k) => group.reduce((s, j) => s + H[j][k], 0) / group.length) }) }
export function polyHash(s, m, base = 31) { let h = 0; for (const ch of s) h = (h * base + ch.charCodeAt(0)) % m; return h }
export function hashingTrick(words, m) { const v = Array(m).fill(0); for (const w of words) v[polyHash(w, m)] += 1; return v }

// Python's random.gauss exactly (Box–Muller, keeping the second value for the next call), on a PyRandom.
export function pyGauss(rng, mu = 0, sigma = 1) {
  let z = rng.gaussNext ?? null
  rng.gaussNext = null
  if (z === null) { const x2pi = rng.random() * 2 * Math.PI, g2rad = Math.sqrt(-2 * Math.log(1 - rng.random())); z = Math.cos(x2pi) * g2rad; rng.gaussNext = Math.sin(x2pi) * g2rad }
  return mu + z * sigma
}
const pyUniform = (rng, a, b) => a + (b - a) * rng.random()
const shuffleInPlace = (xs, rng) => { for (let i = xs.length - 1; i > 0; i--) { const j = rng.randrange(i + 1); [xs[i], xs[j]] = [xs[j], xs[i]] } }

// Classical learners (python/learners.py).
export function fitPoly(xs, ys, degree) { const X = xs.map(x => Array.from({ length: degree + 1 }, (_, p) => x ** p)); const XtX = Array.from({ length: degree + 1 }, (_, i) => Array.from({ length: degree + 1 }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0))); const Xty = Array.from({ length: degree + 1 }, (_, i) => X.reduce((s, r, k) => s + r[i] * ys[k], 0)); return solve(XtX, Xty) }
export function polyValue(coeffs, x) { return coeffs.reduce((s, c, p) => s + c * x ** p, 0) }
export function biasVariance(degree, trials = 200, n = 12, noise = 0.3, seed = 0) {
  const rng = new PyRandom(seed), truth = x => x * x - x, tests = Array.from({ length: 21 }, (_, i) => (i - 10) / 10), preds = tests.map(() => [])
  for (let t = 0; t < trials; t++) { const xs = Array.from({ length: n }, () => pyUniform(rng, -1, 1)), ys = xs.map(x => truth(x) + pyGauss(rng, 0, noise)), c = fitPoly(xs, ys, degree); tests.forEach((x, k) => preds[k].push(polyValue(c, x))) }
  const avg = v => v.reduce((s, a) => s + a, 0) / v.length
  return [avg(preds.map((p, k) => (avg(p) - truth(tests[k])) ** 2)), avg(preds.map(p => { const m = avg(p); return avg(p.map(v => (v - m) ** 2)) }))]
}
export function trainNaiveBayes(docs, labels) {
  const vocab = [...new Set(docs.flat())].sort(), classes = [...new Set(labels)].sort(), prior = {}, likelihood = {}
  for (const c of classes) { prior[c] = labels.filter(l => l === c).length / labels.length; const counts = Object.fromEntries(vocab.map(w => [w, 1])); docs.forEach((d, i) => { if (labels[i] === c) for (const w of d) counts[w] += 1 }); const total = Object.values(counts).reduce((s, v) => s + v, 0); likelihood[c] = Object.fromEntries(vocab.map(w => [w, counts[w] / total])) }
  return [prior, likelihood]
}
export function predictNaiveBayes([prior, likelihood], doc) { const scores = {}; for (const c of Object.keys(prior)) { let s = Math.log(prior[c]); for (const w of doc) if (w in likelihood[c]) s += Math.log(likelihood[c][w]); scores[c] = s } let best = null; for (const c of Object.keys(scores)) if (best === null || scores[c] > scores[best]) best = c; return [best, scores] }
export function kmeans(points, k, iters = 20, seed = 0) {
  const rng = new PyRandom(seed), order = points.map((_, i) => i); shuffleInPlace(order, rng)
  let centres = order.slice(0, k).map(i => [...points[i]]), labels = points.map(() => 0); const history = [], d2 = (p, c) => p.reduce((s, a, i) => s + (a - c[i]) ** 2, 0)
  for (let it = 0; it < iters; it++) {
    labels = points.map(p => { let best = 0; for (let c = 1; c < k; c++) if (d2(p, centres[c]) < d2(p, centres[best])) best = c; return best })
    centres = centres.map((cen, c) => { const members = points.filter((_, i) => labels[i] === c); return members.length ? cen.map((_, j) => members.reduce((s, m) => s + m[j], 0) / members.length) : cen })
    history.push(points.reduce((s, p, i) => s + d2(p, centres[labels[i]]), 0))
  }
  return [centres, labels, history]
}
export function normal1(x, mu, v) { return Math.exp(-((x - mu) ** 2) / (2 * v)) / Math.sqrt(2 * Math.PI * v) }
export function emGmm(xs, mus0, iters = 30) {
  const k = mus0.length, mus = [...mus0], vars = Array(k).fill(1), weights = Array(k).fill(1 / k), history = []
  for (let it = 0; it < iters; it++) {
    const resp = xs.map(x => { const p = mus.map((m, j) => weights[j] * normal1(x, m, vars[j])), s = p.reduce((a, b) => a + b, 0); return p.map(v => v / s) })
    for (let j = 0; j < k; j++) { const nj = resp.reduce((s, r) => s + r[j], 0); mus[j] = resp.reduce((s, r, i) => s + r[j] * xs[i], 0) / nj; vars[j] = Math.max(resp.reduce((s, r, i) => s + r[j] * (xs[i] - mus[j]) ** 2, 0) / nj, 1e-6); weights[j] = nj / xs.length }
    history.push(xs.reduce((s, x) => s + Math.log(mus.reduce((t, m, j) => t + weights[j] * normal1(x, m, vars[j]), 0)), 0))
  }
  return [mus, vars, weights, history]
}
export function hingeLoss(w, b, X, y, lam) { const margins = X.map((x, i) => y[i] * (dot(w, x) + b)); return lam / 2 * dot(w, w) + margins.reduce((s, m) => s + Math.max(0, 1 - m), 0) / X.length }
export function svmSgd(X, y, lam = 0.01, epochs = 200, seed = 0) {
  const rng = new PyRandom(seed), order = X.map((_, i) => i); let w = X[0].map(() => 0), b = 0, t = 0
  for (let e = 0; e < epochs; e++) { shuffleInPlace(order, rng); for (const i of order) { t += 1; const eta = 1 / (lam * t), margin = y[i] * (dot(w, X[i]) + b); w = w.map(v => v * (1 - eta * lam)); if (margin < 1) { w = w.map((v, j) => v + eta * y[i] * X[i][j]); b += eta * y[i] * 0.1 } } }
  return [w, b]
}
export function gini(labels) { const n = labels.length; return 1 - [...new Set(labels)].reduce((s, c) => s + (labels.filter(l => l === c).length / n) ** 2, 0) }
export function labelEntropy(labels) { const n = labels.length; return -[...new Set(labels)].reduce((s, c) => { const p = labels.filter(l => l === c).length / n; return s + p * Math.log2(p) }, 0) }
export function bestSplit(xs, ys) { const base = labelEntropy(ys); let best = [null, 0]; for (const t of [...new Set(xs)].sort((a, b) => a - b).slice(0, -1)) { const left = ys.filter((_, i) => xs[i] <= t), right = ys.filter((_, i) => xs[i] > t), after = (left.length * labelEntropy(left) + right.length * labelEntropy(right)) / ys.length; if (base - after > best[1]) best = [t, base - after] } return best }

// Deep learning and RL (python/deep.py).
export function conv1d(x, k) { return Array.from({ length: x.length - k.length + 1 }, (_, i) => k.reduce((s, kj, j) => s + kj * x[i + j], 0)) }
export function convMatrix(k, n) { return Array.from({ length: n - k.length + 1 }, (_, i) => Array.from({ length: n }, (_, j) => (j - i >= 0 && j - i < k.length ? k[j - i] : 0))) }
export function conv2d(img, k) { const h = img.length - k.length + 1, w = img[0].length - k[0].length + 1; return Array.from({ length: h }, (_, i) => Array.from({ length: w }, (_, j) => { let s = 0; for (let a = 0; a < k.length; a++) for (let b = 0; b < k[0].length; b++) s += k[a][b] * img[i + a][j + b]; return s })) }
export function activationSpread(depth, width, scale, seed = 0) { const rng = new PyRandom(seed); let h = Array.from({ length: width }, () => pyGauss(rng, 0, 1)); const spreads = []; for (let d = 0; d < depth; d++) { const W = Array.from({ length: width }, () => Array.from({ length: width }, () => pyGauss(rng, 0, scale / Math.sqrt(width)))); h = W.map(row => Math.max(0, dot(row, h))); spreads.push(Math.sqrt(h.reduce((s, v) => s + v * v, 0) / width)) } return spreads }
export function layerNorm(x, eps = 1e-5) { const m = x.reduce((s, a) => s + a, 0) / x.length, v = x.reduce((s, a) => s + (a - m) ** 2, 0) / x.length; return x.map(a => (a - m) / Math.sqrt(v + eps)) }
export function batchNorm(batch, eps = 1e-5) { return transpose(transpose(batch).map(col => layerNorm(col, eps))) }
export function dropout(x, p, rng) { return x.map(a => (rng.random() < p ? 0 : a / (1 - p))) }
export function rnnForward(w, u, xs, h0 = 0) { const hs = [h0]; for (const x of xs) hs.push(Math.tanh(w * hs[hs.length - 1] + u * x)); return hs }
export function bptt(w, u, xs, target) { const hs = rnnForward(w, u, xs); let dh = 2 * (hs[hs.length - 1] - target), gw = 0, gu = 0; const reach = []; for (let t = xs.length; t > 0; t--) { const dz = dh * (1 - hs[t] ** 2); gw += dz * hs[t - 1]; gu += dz * xs[t - 1]; reach.push(Math.abs(dh)); dh = dz * w } return [gw, gu, reach.reverse()] }
export function sinusoidalPosition(pos, d) { const out = []; for (let i = 0; i < Math.floor(d / 2); i++) { const freq = 1 / 10000 ** (2 * i / d); out.push(Math.sin(pos * freq), Math.cos(pos * freq)) } return out }
export function residualBlock(x, sublayer) { const y = sublayer(layerNorm(x)); return x.map((a, i) => a + y[i]) }
export function infoNce(sim, tau = 0.1) { let total = 0; sim.forEach((row, i) => { const logits = row.map(s => s / tau), m = Math.max(...logits); total += m + Math.log(logits.reduce((s, z) => s + Math.exp(z - m), 0)) - logits[i] }); return total / sim.length }
export function klToStandardNormal(mu, logvar) { return 0.5 * (Math.exp(logvar) + mu * mu - 1 - logvar) }
export function reparameterise(mu, logvar, eps) { return mu + Math.exp(0.5 * logvar) * eps }
export function ganValue(d, pData, pGen) { let v = 0; pData.forEach((p, i) => { if (p > 0) v += p * Math.log(d[i]) }); pGen.forEach((q, i) => { if (q > 0) v += q * Math.log(1 - d[i]) }); return v }
export function optimalDiscriminator(pData, pGen) { return pData.map((p, i) => (p + pGen[i] > 0 ? p / (p + pGen[i]) : 0.5)) }
export function alphaBar(betas, t) { let a = 1; for (const b of betas.slice(0, t)) a *= 1 - b; return a }
export function noisySample(x0, t, betas, eps) { const a = alphaBar(betas, t); return Math.sqrt(a) * x0 + Math.sqrt(1 - a) * eps }
export function valueIteration(P, R, gamma, iters = 200) { let V = P.map(() => 0); for (let it = 0; it < iters; it++) V = P.map((acts, s) => Math.max(...acts.map((outs, a) => R[s][a] + gamma * outs.reduce((t, [p, s2]) => t + p * V[s2], 0)))); return V }
export function scoreFunctionGradient(theta, rewards, n, seed = 0) { const rng = new PyRandom(seed), m = Math.max(...theta), e = theta.map(t => Math.exp(t - m)), z = e.reduce((s, v) => s + v, 0), pi = e.map(v => v / z), g = theta.map(() => 0); for (let it = 0; it < n; it++) { const u = rng.random(); let total = 0, a = pi.length - 1; for (let i = 0; i < pi.length; i++) { total += pi[i]; if (u < total) { a = i; break } } for (let k = 0; k < theta.length; k++) g[k] += rewards[a] * ((k === a ? 1 : 0) - pi[k]) / n } return g }
export function ppoClip(ratio, advantage, eps = 0.2) { const clipped = Math.min(Math.max(ratio, 1 - eps), 1 + eps); return Math.min(ratio * advantage, clipped * advantage) }

// ---- Learning theory (python/theory.py) ----
export function makeData(n, noise, rng) { const xs = Array.from({ length: n }, () => pyUniform(rng, -1, 1)); return [xs, xs.map(x => Math.sin(3 * x) + pyGauss(rng, 0, noise))] }
export function meanSquaredError(coeffs, xs, ys) { return xs.reduce((s, x, i) => s + (polyValue(coeffs, x) - ys[i]) ** 2, 0) / xs.length }
export function trainAndTest(degree, nTrain = 20, nTest = 200, noise = 0.2, seed = 1) { const rng = new PyRandom(seed), [xs, ys] = makeData(nTrain, noise, rng), [tx, ty] = makeData(nTest, noise, rng), coeffs = fitPoly(xs, ys, degree); return [meanSquaredError(coeffs, xs, ys), meanSquaredError(coeffs, tx, ty), coeffs, xs, ys] }
export function kFoldError(xs, ys, degree, k) { let total = 0; for (let fold = 0; fold < k; fold++) { const tr = xs.map((x, i) => [x, ys[i], i]).filter(([, , i]) => i % k !== fold), held = xs.map((x, i) => [x, ys[i], i]).filter(([, , i]) => i % k === fold); const coeffs = fitPoly(tr.map(r => r[0]), tr.map(r => r[1]), degree); total += meanSquaredError(coeffs, held.map(r => r[0]), held.map(r => r[1])) } return total / k }
export function chebyshevTail(n, eps) { return Math.min(1, 1 / (4 * n * eps * eps)) }
export function hoeffdingTail(n, eps) { return Math.min(1, 2 * Math.exp(-2 * n * eps * eps)) }
export function simulatedTail(n, eps, p = 0.5, trials = 2000, seed = 0) { const rng = new PyRandom(seed); let hits = 0; for (let t = 0; t < trials; t++) { let heads = 0; for (let i = 0; i < n; i++) if (rng.random() < p) heads++; if (Math.abs(heads - n * p) >= n * eps) hits++ } return hits / trials }
export function samplesNeeded(eps, delta) { return Math.ceil(Math.log(2 / delta) / (2 * eps * eps)) }
export function finiteClassGap(size, n, delta) { return Math.sqrt((Math.log(size) + Math.log(2 / delta)) / (2 * n)) }
export function thresholdTrueError(t, boundary = 0.3, flip = 0.1) { return flip + (1 - 2 * flip) * Math.abs(t - boundary) }
export function thresholdTrainError(t, xs, ys) { let wrong = 0; xs.forEach((x, i) => { if ((x > t ? 1 : 0) !== ys[i]) wrong++ }); return wrong / xs.length }
export function ermThresholds(n, size, trials = 200, seed = 0) {
  const rng = new PyRandom(seed), ts = Array.from({ length: size }, (_, i) => i / (size - 1)), eps = finiteClassGap(size, n, 0.05)
  let trainSum = 0, trueSum = 0, bad = 0
  for (let t = 0; t < trials; t++) {
    const xs = Array.from({ length: n }, () => rng.random()), ys = xs.map(x => (x > 0.3 ? 1 : 0) ^ (rng.random() < 0.1 ? 1 : 0))
    const errs = ts.map(th => thresholdTrainError(th, xs, ys))
    let best = 0; for (let i = 1; i < size; i++) if (errs[i] < errs[best]) best = i
    trainSum += errs[best]; trueSum += thresholdTrueError(ts[best])
    if (Math.max(...errs.map((e, i) => Math.abs(e - thresholdTrueError(ts[i])))) > eps) bad++
  }
  return [trainSum / trials, trueSum / trials, bad / trials]
}
const cutsOf = vals => { const s = [...vals].sort((a, b) => a - b); return [s[0] - 1, ...s.slice(1).map((v, i) => (s[i] + v) / 2), s.at(-1) + 1] }
export function thresholdPatterns(xs) { return new Set(cutsOf(xs).map(t => xs.map(x => (x > t ? 1 : 0)).join(''))) }
export function intervalPatterns(xs) { const c = cutsOf(xs), out = new Set(); for (const lo of c) for (const hi of c) out.add(xs.map(x => (lo < x && x < hi ? 1 : 0)).join('')); return out }
export function halfplanePatterns(points, directions = 360) { const found = new Set(); for (let k = 0; k < directions; k++) { const a = 2 * Math.PI * k / directions, proj = points.map(([x, y]) => x * Math.cos(a) + y * Math.sin(a)); for (const t of cutsOf(proj)) found.add(proj.map(v => (v > t ? 1 : 0)).join('')) } return found }
export function sauerBound(n, d) { let s = 0; for (let i = 0; i <= d; i++) s += choose(n, i); return s }
export function fitFirstP(X, ys, p) {
  const F = X.map(row => row.slice(0, p)), n = F.length
  if (p < n) { const G = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => F.reduce((s, f) => s + f[i] * f[j], 0))); return solve(G, Array.from({ length: p }, (_, i) => F.reduce((s, f, r) => s + f[i] * ys[r], 0))) }
  const G = F.map(a => F.map(b => a.reduce((s, v, k) => s + v * b[k], 0))), alpha = solve(G, ys)
  return Array.from({ length: p }, (_, k) => F.reduce((s, f, i) => s + alpha[i] * f[k], 0))
}
export function excessRisk(w, beta) { const p = w.length; return w.reduce((s, a, i) => s + (beta[i] - a) ** 2, 0) + beta.slice(p).reduce((s, b) => s + b * b, 0) }
export function doubleDescentBeta(D = 60) { const raw = Array.from({ length: D }, (_, j) => 0.95 ** j), size = Math.sqrt(raw.reduce((s, b) => s + b * b, 0)); return raw.map(b => b / size) }
export function doubleDescent(D = 60, n = 20, noise = 0.2, trials = 20, seed = 0) {
  const beta = doubleDescentBeta(D), rng = new PyRandom(seed), risks = Array(D).fill(0)
  for (let t = 0; t < trials; t++) {
    const X = Array.from({ length: n }, () => Array.from({ length: D }, () => pyGauss(rng, 0, 1)))
    const ys = X.map(row => row.reduce((s, a, i) => s + a * beta[i], 0) + pyGauss(rng, 0, noise))
    for (let p = 1; p <= D; p++) risks[p - 1] += excessRisk(fitFirstP(X, ys, p), beta) / trials
  }
  return risks
}
export function gdLeastSquares(F, ys, rate, steps) { const n = F.length, p = F[0].length; let w = Array(p).fill(0); for (let s = 0; s < steps; s++) { const r = F.map((f, i) => f.reduce((acc, a, k) => acc + a * w[k], 0) - ys[i]); w = w.map((wk, k) => wk - rate * 2 / n * r.reduce((acc, ri, i) => acc + ri * F[i][k], 0)) } return w }
