// Generative classifiers: model p(x | y) and p(y), classify with Bayes' rule.
// Gaussian discriminant analysis with a shared covariance (LDA, linear
// boundary) or one covariance per class (QDA, quadratic boundary), compared
// with logistic regression as the training set grows.
import { random, normal, range, mean, sigmoid } from '../../kit/math.js'

// Worlds: the true class-conditional distributions.
export const SCENARIOS = {
  shared: { name: 'Gaussians, shared covariance (LDA is exactly right)', prior: 0.5, m0: [-0.9, -0.4], m1: [0.9, 0.5], S0: [[1.1, 0.6], [0.6, 0.9]], S1: [[1.1, 0.6], [0.6, 0.9]] },
  different: { name: 'Gaussians, different covariances (QDA is right)', prior: 0.5, m0: [0, 0], m1: [0.6, 0.4], S0: [[0.25, 0], [0, 0.25]], S1: [[2.2, 0.3], [0.3, 1.6]] },
  skewed: { name: 'Class 1 has a far-away subgroup (not Gaussian)', prior: 0.5, m0: [-0.9, -0.4], m1: [0.9, 0.5], S0: [[1.1, 0.6], [0.6, 0.9]], S1: [[1.1, 0.6], [0.6, 0.9]], skew: true },
}
const chol = S => { const a = Math.sqrt(S[0][0]), b = S[1][0] / a, c = Math.sqrt(S[1][1] - b * b); return [[a, 0], [b, c]] }
// In the skewed world 30% of class 1 sits in a distant subgroup: easy to
// classify, but it drags a Gaussian fit's mean and covariance.
export function sample(sc, n, rng) {
  const L0 = chol(sc.S0), L1 = chol(sc.S1)
  return range(n).map(() => {
    const y = rng() < sc.prior ? 1 : 0, z = [normal(rng), normal(rng)], L = y ? L1 : L0, m = y ? sc.m1 : sc.m0
    let x = [m[0] + L[0][0] * z[0], m[1] + L[1][0] * z[0] + L[1][1] * z[1]]
    if (sc.skew && y && rng() < 0.3) x = [x[0] + 5, x[1] + 3]
    return { x1: x[0], x2: x[1], label: y }
  })
}
export const makeSet = (key, n, seed) => sample(SCENARIOS[key], n, random(seed))

const inv2 = S => { const d = S[0][0] * S[1][1] - S[0][1] * S[1][0]; return [[S[1][1] / d, -S[0][1] / d], [-S[1][0] / d, S[0][0] / d]] }
const det2 = S => S[0][0] * S[1][1] - S[0][1] * S[1][0]
const cov = (pts, m) => { const c = [[0, 0], [0, 0]]; pts.forEach(p => { const d = [p.x1 - m[0], p.x2 - m[1]]; c[0][0] += d[0] * d[0]; c[0][1] += d[0] * d[1]; c[1][1] += d[1] * d[1] }); const n = Math.max(pts.length, 1); c[0][0] /= n; c[0][1] /= n; c[1][1] /= n; c[1][0] = c[0][1]; return c }
const ridge = (S, r) => [[S[0][0] + r, S[0][1]], [S[1][0], S[1][1] + r]]
export function logGauss(x, m, S) { const d = [x[0] - m[0], x[1] - m[1]], P = inv2(S); return -0.5 * (d[0] * (P[0][0] * d[0] + P[0][1] * d[1]) + d[1] * (P[1][0] * d[0] + P[1][1] * d[1])) - 0.5 * Math.log(det2(S)) - Math.log(2 * Math.PI) }
export const mahal2 = (x, m, S) => { const d = [x[0] - m[0], x[1] - m[1]], P = inv2(S); return d[0] * (P[0][0] * d[0] + P[0][1] * d[1]) + d[1] * (P[1][0] * d[0] + P[1][1] * d[1]) }

// Maximum-likelihood GDA. `shared` pools the within-class covariance (LDA).
// A tiny ridge keeps covariances invertible when a class has very few points.
export function fitGDA(data, shared) {
  const c1 = data.filter(p => p.label), c0 = data.filter(p => !p.label)
  const phi = c1.length / data.length
  const m = pts => pts.length ? [mean(pts.map(p => p.x1)), mean(pts.map(p => p.x2))] : [0, 0]
  const m0 = m(c0), m1 = m(c1)
  let S0 = cov(c0, m0), S1 = cov(c1, m1)
  if (shared) { const w0 = c0.length / data.length, w1 = c1.length / data.length, P = [[w0 * S0[0][0] + w1 * S1[0][0], w0 * S0[0][1] + w1 * S1[0][1]], [0, w0 * S0[1][1] + w1 * S1[1][1]]]; P[1][0] = P[0][1]; S0 = S1 = P }
  S0 = ridge(S0, 1e-3); S1 = ridge(S1, 1e-3)
  const prob = (x1, x2) => { const a = logGauss([x1, x2], m1, S1) + Math.log(Math.max(phi, 1e-9)), b = logGauss([x1, x2], m0, S0) + Math.log(Math.max(1 - phi, 1e-9)); return sigmoid(a - b) }
  return { phi, m0, m1, S0, S1, prob }
}
// For LDA the log-odds is linear: θᵀx + θ₀ with θ = Σ⁻¹(μ₁ − μ₀).
export function ldaLinear(model) {
  const P = inv2(model.S0), dm = [model.m1[0] - model.m0[0], model.m1[1] - model.m0[1]]
  const th = [P[0][0] * dm[0] + P[0][1] * dm[1], P[1][0] * dm[0] + P[1][1] * dm[1]]
  const q = m => m[0] * (P[0][0] * m[0] + P[0][1] * m[1]) + m[1] * (P[1][0] * m[0] + P[1][1] * m[1])
  return { th, th0: -0.5 * (q(model.m1) - q(model.m0)) + Math.log(model.phi / (1 - model.phi)) }
}
// Logistic regression by damped Newton with a small L2 penalty (so tiny or
// separable samples still have a finite answer).
export function fitLogistic(data, lambda = 1e-3) {
  let w = [0, 0, 0]
  const X = data.map(p => [1, p.x1, p.x2]), n = data.length
  const loss = w => mean(data.map((p, i) => { const z = X[i][0] * w[0] + X[i][1] * w[1] + X[i][2] * w[2]; return Math.log1p(Math.exp(-Math.abs(z))) + Math.max(z, 0) - p.label * z })) + lambda / 2 * (w[1] ** 2 + w[2] ** 2)
  for (let it = 0; it < 30; it++) {
    const g = [0, 0, 0], H = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    data.forEach((p, i) => { const s = sigmoid(X[i][0] * w[0] + X[i][1] * w[1] + X[i][2] * w[2]), r = s - p.label, v = s * (1 - s); for (let a = 0; a < 3; a++) { g[a] += r * X[i][a] / n; for (let b = 0; b < 3; b++) H[a][b] += v * X[i][a] * X[i][b] / n } })
    for (let a = 1; a < 3; a++) { g[a] += lambda * w[a]; H[a][a] += lambda }
    H[0][0] += 1e-9
    const step = solve3(H, g)
    let t = 1, next = w.map((v, a) => v - step[a])
    while (loss(next) > loss(w) && t > 1e-4) { t /= 2; next = w.map((v, a) => v - t * step[a]) }
    w = next
  }
  return { w, prob: (x1, x2) => sigmoid(w[0] + w[1] * x1 + w[2] * x2) }
}
function solve3(A, b) {
  const M = A.map((r, i) => [...r, b[i]])
  for (let c = 0; c < 3; c++) { let p = c; for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; for (let r = 0; r < 3; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let j = c; j < 4; j++) M[r][j] -= f * M[c][j] } }
  return M.map((r, i) => r[3] / r[i])
}
export function bayes(key) {
  const sc = SCENARIOS[key]
  if (sc.skew) return null
  return (x1, x2) => sigmoid(logGauss([x1, x2], sc.m1, sc.S1) + Math.log(sc.prior) - logGauss([x1, x2], sc.m0, sc.S0) - Math.log(1 - sc.prior))
}
export const errorRate = (prob, data) => mean(data.map(p => (prob(p.x1, p.x2) >= 0.5 ? 1 : 0) !== p.label ? 1 : 0))
export const MODELS = { lda: d => fitGDA(d, true), qda: d => fitGDA(d, false), logistic: d => fitLogistic(d) }

// Test error against training-set size, averaged over repeated draws.
export const SIZES = [8, 12, 20, 40, 80, 160, 400]
export function learningCurves(key, { reps = 40, testN = 2000 } = {}) {
  const test = makeSet(key, testN, 999)
  const curves = Object.fromEntries(Object.keys(MODELS).map(m => [m, SIZES.map(n => mean(range(reps).map(r => {
    let train = makeSet(key, n, 1000 * n + r)
    if (!train.some(p => p.label) || train.every(p => p.label)) train = [...train, ...makeSet(key, 4, 7 + r)]
    return errorRate(MODELS[m](train).prob, test)
  })))]))
  const b = bayes(key)
  return { curves, bayes: b ? errorRate(b, test) : null }
}

// The same comparison with d features (shared identity covariance, means
// ±0.35 in every direction): generative models need far fewer examples
// when their assumptions hold, and the advantage grows with d.
export function highDim(d, n, seed) {
  const rng = random(seed)
  return range(n).map(() => { const y = rng() < 0.5 ? 1 : 0; return { x: range(d).map(() => (y ? 0.35 : -0.35) + normal(rng)), label: y } })
}
function solveN(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]])
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j] } }
  return M.map((r, i) => r[n] / r[i])
}
export function ldaD(data) {
  const d = data[0].x.length, c = [0, 1].map(k => data.filter(p => p.label === k)), m = c.map(pts => range(d).map(j => pts.length ? mean(pts.map(p => p.x[j])) : 0))
  const S = range(d).map(i => range(d).map(j => (i === j ? 1e-2 : 0) + mean(data.map(p => (p.x[i] - m[p.label][i]) * (p.x[j] - m[p.label][j])))))
  const th = solveN(S, range(d).map(j => m[1][j] - m[0][j]))
  const phi = Math.min(Math.max(c[1].length / data.length, 1e-3), 1 - 1e-3)
  const th0 = -0.5 * (range(d).reduce((s, j) => s + th[j] * (m[1][j] + m[0][j]), 0)) + Math.log(phi / (1 - phi))
  return x => sigmoid(th0 + range(d).reduce((s, j) => s + th[j] * x[j], 0))
}
export function logisticD(data, lambda = 1e-3) {
  const d = data[0].x.length, n = data.length
  let w = Array(d + 1).fill(0)
  const X = data.map(p => [1, ...p.x])
  for (let it = 0; it < 25; it++) {
    const g = Array(d + 1).fill(0), H = range(d + 1).map(() => Array(d + 1).fill(0))
    data.forEach((p, i) => { const s = sigmoid(X[i].reduce((t, v, j) => t + v * w[j], 0)), r = s - p.label, v = s * (1 - s); for (let a = 0; a <= d; a++) { g[a] += r * X[i][a] / n; for (let b = 0; b <= d; b++) H[a][b] += v * X[i][a] * X[i][b] / n } })
    for (let a = 1; a <= d; a++) { g[a] += lambda * w[a]; H[a][a] += lambda }
    H[0][0] += 1e-9
    const step = solveN(H, g)
    w = w.map((v, a) => v - step[a])
  }
  return x => sigmoid(w[0] + x.reduce((t, v, j) => t + v * w[j + 1], 0))
}
// Gaussian naive Bayes: GDA with a shared *diagonal* covariance (2d + d
// parameters instead of d(d + 1)/2 for the covariance alone).
export function naiveBayesD(data) {
  const d = data[0].x.length, c = [0, 1].map(k => data.filter(p => p.label === k)), m = c.map(pts => range(d).map(j => pts.length ? mean(pts.map(p => p.x[j])) : 0))
  const v = range(d).map(j => 1e-3 + mean(data.map(p => (p.x[j] - m[p.label][j]) ** 2)))
  const phi = Math.min(Math.max(c[1].length / data.length, 1e-3), 1 - 1e-3)
  return x => sigmoid(Math.log(phi / (1 - phi)) + range(d).reduce((s, j) => s + ((x[j] - m[0][j]) ** 2 - (x[j] - m[1][j]) ** 2) / (2 * v[j]), 0))
}
export function learningCurvesD(d, { reps = 30 } = {}) {
  const test = highDim(d, 1500, 4242), err = f => mean(test.map(p => (f(p.x) >= 0.5 ? 1 : 0) !== p.label ? 1 : 0))
  const sizes = SIZES.filter(n => n >= 12)
  const run = fit => sizes.map(n => mean(range(reps).map(r => { let tr = highDim(d, n, 31 * n + r); if (!tr.some(p => p.label) || tr.every(p => p.label)) tr = [...tr, ...highDim(d, 4, 3 + r)]; return err(fit(tr)) })))
  // Bayes error: the classes differ by 0.7 in each of d directions (unit variance).
  const bayesErr = 1 - normalCdf(0.35 * Math.sqrt(d))
  return { sizes, curves: { naiveBayes: run(naiveBayesD), lda: run(ldaD), logistic: run(logisticD) }, bayes: bayesErr }
}
function normalCdf(z) { const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2), e = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2); return z >= 0 ? (1 + e) / 2 : (1 - e) / 2 }
