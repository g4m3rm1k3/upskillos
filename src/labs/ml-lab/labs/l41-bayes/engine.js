// Bayesian inference: conjugate Beta–Binomial updating, Bayesian linear
// regression with a Gaussian prior, MAP as regularization, and the model
// evidence (marginal likelihood) as an automatic Occam's razor.
import { random, normal, range, mean } from '../../kit/math.js'

// ---------- Beta–Binomial ----------
export function logBeta(a, b) { return lgamma(a) + lgamma(b) - lgamma(a + b) }
// Lanczos approximation of log Γ(z).
export function lgamma(z) {
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z)
  z -= 1
  let x = c[0]
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i)
  const t = z + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}
export const betaPdf = (p, a, b) => p <= 0 || p >= 1 ? 0 : Math.exp((a - 1) * Math.log(p) + (b - 1) * Math.log(1 - p) - logBeta(a, b))
// Quantile by numerical integration on a fine grid (plenty for plotting and intervals).
export function betaQuantile(q, a, b, n = 4000) {
  let cdf = 0
  const h = 1 / n
  for (let i = 0; i < n; i++) { const p = (i + 0.5) * h; cdf += betaPdf(p, a, b) * h; if (cdf >= q) return p }
  return 1
}
export function coinPosterior(a, b, heads, tails) {
  const A = a + heads, B = b + tails
  return { A, B, mean: A / (A + B), map: A > 1 && B > 1 ? (A - 1) / (A + B - 2) : null, lo: betaQuantile(0.025, A, B), hi: betaQuantile(0.975, A, B), predictive: A / (A + B) }
}
export function flips(p, n, seed) { const rng = random(seed); return range(n).map(() => rng() < p ? 1 : 0) }
// Log evidence of a coin sequence under a Beta(a, b) prior versus a fair coin.
export const logEvidenceBeta = (a, b, h, t) => logBeta(a + h, b + t) - logBeta(a, b)

// ---------- Bayesian linear regression ----------
export const truth = x => Math.sin(2 * Math.PI * x)
export function curveData(n, seed = 41, noise = 0.25) {
  const rng = random(seed)
  return range(n).map(() => { const x = rng(); return { x, y: truth(x) + noise * normal(rng) } })
}
// Powers of t = 2x − 1 ∈ [−1, 1]: far better conditioned than powers of x ∈ [0, 1].
export const polyFeatures = (x, degree) => range(degree + 1).map(k => (2 * x - 1) ** k)
// Gaussian basis functions spread over [0, 1] (plus a constant).
export const gaussFeatures = (x, k = 9, s = 0.1) => [1, ...range(k).map(i => Math.exp(-((x - i / (k - 1)) ** 2) / (2 * s * s)))]

function cholesky(A) {
  const n = A.length, L = range(n).map(() => Array(n).fill(0))
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = A[i][j]
    for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]
    L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-300)) : s / L[j][j]
  }
  return L
}
function cholSolve(L, b) {
  const n = L.length, z = Array(n).fill(0), x = Array(n).fill(0)
  for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i][k] * z[k]; z[i] = s / L[i][i] }
  for (let i = n - 1; i >= 0; i--) { let s = z[i]; for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i] }
  return x
}
// Posterior over weights for prior N(0, α⁻¹I) and noise precision β:
// A = αI + βΦᵀΦ (precision), m = β A⁻¹ Φᵀy.
export function bayesLinReg(data, feat, alpha, beta) {
  const Phi = data.map(d => feat(d.x)), M = feat(0).length
  const A = range(M).map(i => range(M).map(j => (i === j ? alpha : 0) + beta * Phi.reduce((s, r) => s + r[i] * r[j], 0)))
  const L = cholesky(A)
  const m = cholSolve(L, range(M).map(i => beta * Phi.reduce((s, r, k) => s + r[i] * data[k].y, 0)))
  const logDetA = 2 * L.reduce((s, r, i) => s + Math.log(r[i]), 0)
  const predict = x => { const f = feat(x), v = cholSolve(L, f); return { mean: f.reduce((s, fi, i) => s + fi * m[i], 0), variance: 1 / beta + f.reduce((s, fi, i) => s + fi * v[i], 0), paramVariance: f.reduce((s, fi, i) => s + fi * v[i], 0) } }
  // Draws from the posterior: w = m + L⁻ᵀz has covariance A⁻¹.
  const sample = rng => { const z = range(M).map(() => normal(rng)), w = Array(M).fill(0); for (let i = M - 1; i >= 0; i--) { let s = z[i]; for (let k = i + 1; k < M; k++) s -= L[k][i] * w[k]; w[i] = s / L[i][i] } return w.map((v, i) => v + m[i]) }
  const N = data.length, fitErr = data.reduce((s, d, k) => s + (d.y - Phi[k].reduce((t, p, i) => t + p * m[i], 0)) ** 2, 0)
  const logEvidence = M / 2 * Math.log(alpha) + N / 2 * Math.log(beta) - (beta / 2 * fitErr + alpha / 2 * m.reduce((s, v) => s + v * v, 0)) - 0.5 * logDetA - N / 2 * Math.log(2 * Math.PI)
  return { m, predict, sample, logEvidence, feat }
}
export const evalFeat = (w, feat, x) => feat(x).reduce((s, f, i) => s + f * w[i], 0)
// Maximum likelihood (least squares with a tiny jitter) for comparison.
export const leastSquares = (data, feat) => bayesLinReg(data, feat, 1e-10, 1)
export const rmse = (model, data) => Math.sqrt(mean(data.map(d => (model.predict(d.x).mean - d.y) ** 2)))

// Evidence, training error and test error against polynomial degree.
export function evidenceCurve(n, { alpha = 5e-3, beta = 16, maxDegree = 9, seed = 41 } = {}) {
  const train = curveData(n, seed), test = curveData(500, 999)
  return range(maxDegree + 1).map(d => {
    const feat = x => polyFeatures(x, d), post = bayesLinReg(train, feat, alpha, beta), ml = leastSquares(train, feat)
    return { degree: d, logEvidence: post.logEvidence, trainRmse: rmse(ml, train), testRmse: rmse(ml, test) }
  })
}
