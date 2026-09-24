// Approximate inference: importance sampling, Metropolis–Hastings and Gibbs
// sampling with diagnostics (autocorrelation, effective sample size, R̂),
// and variational inference with its mode-seeking, variance-shrinking bias.
import { random, normal, range, mean } from '../../kit/math.js'

// ---------- 2D targets (unnormalized log densities) ----------
export const TARGETS = {
  corr: { name: 'Correlated Gaussian (ρ = 0.95)', logp: ([a, b]) => -(a * a - 1.9 * a * b + b * b) / (2 * (1 - 0.95 ** 2)), mean: [0, 0] },
  banana: { name: 'Banana-shaped posterior', logp: ([a, b]) => -a * a / 2 - 2 * (b - 0.5 * a * a + 1) ** 2, mean: [0, -0.5] },
  twoModes: { name: 'Two separated modes', logp: ([a, b]) => { const l1 = -((a + 2) ** 2 + (b + 2) ** 2) / (2 * 0.4), l2 = -((a - 2) ** 2 + (b - 2) ** 2) / (2 * 0.4), m = Math.max(l1, l2); return m + Math.log(Math.exp(l1 - m) + Math.exp(l2 - m)) }, mean: [0, 0] },
}

// Random-walk Metropolis: propose x' = x + step·z, accept with prob min(1, p(x')/p(x)).
export function metropolis(logp, start, step, n, seed) {
  const rng = random(seed), chain = [start]
  let x = start, lx = logp(x), accepted = 0
  for (let i = 1; i < n; i++) {
    const y = [x[0] + step * normal(rng), x[1] + step * normal(rng)], ly = logp(y)
    if (Math.log(rng()) < ly - lx) { x = y; lx = ly; accepted++ }
    chain.push(x)
  }
  return { chain, acceptance: accepted / (n - 1) }
}
// Gibbs sampling for a standard bivariate normal with correlation ρ:
// x₁ | x₂ ~ N(ρx₂, 1 − ρ²), and symmetrically. Records both half-steps.
export function gibbs(rho, start, n, seed) {
  const rng = random(seed), path = [start], chain = [start], s = Math.sqrt(1 - rho * rho)
  let [a, b] = start
  for (let i = 1; i < n; i++) { a = rho * b + s * normal(rng); path.push([a, b]); b = rho * a + s * normal(rng); path.push([a, b]); chain.push([a, b]) }
  return { chain, path }
}
export function autocorr(xs, maxLag = 60) {
  const m = mean(xs), v = mean(xs.map(x => (x - m) ** 2)) || 1e-12
  return range(maxLag + 1).map(k => mean(xs.slice(k).map((x, i) => (x - m) * (xs[i] - m))) * (xs.length - k) / xs.length / v)
}
// Effective sample size: n / (1 + 2 Σ ρₖ), summing until autocorrelation turns negative.
export function ess(xs) {
  const r = autocorr(xs, Math.min(200, Math.floor(xs.length / 3)))
  let s = 0
  for (let k = 1; k < r.length; k++) { if (r[k] < 0) break; s += r[k] }
  return xs.length / (1 + 2 * s)
}
// Potential scale reduction (R̂) from several chains of one coordinate.
export function rhat(chains) {
  const m = chains.length, n = chains[0].length, means = chains.map(c => mean(c)), grand = mean(means)
  const B = n / (m - 1) * means.reduce((s, v) => s + (v - grand) ** 2, 0)
  const W = mean(chains.map((c, j) => c.reduce((s, v) => s + (v - means[j]) ** 2, 0) / (n - 1)))
  return Math.sqrt(((n - 1) / n * W + B / n) / W)
}

// ---------- 1D target for importance sampling and VI ----------
const LOG_SQRT_2PI = 0.5 * Math.log(2 * Math.PI)
export const logNorm = (x, m, s) => -((x - m) ** 2) / (2 * s * s) - Math.log(s) - LOG_SQRT_2PI
export const target1d = x => Math.log(0.6 * Math.exp(logNorm(x, -2, 0.6)) + 0.4 * Math.exp(logNorm(x, 2, 0.8)))
export const TRUE_MEAN = 0.6 * -2 + 0.4 * 2
export const TRUE_VAR = 0.6 * (0.36 + 4) + 0.4 * (0.64 + 4) - TRUE_MEAN ** 2
export function importance(qm, qs, n, seed) {
  const rng = random(seed), xs = range(n).map(() => qm + qs * normal(rng))
  const lw = xs.map(x => target1d(x) - logNorm(x, qm, qs)), mx = Math.max(...lw), w = lw.map(l => Math.exp(l - mx)), sw = w.reduce((a, b) => a + b, 0)
  const nw = w.map(v => v / sw)
  return { xs, weights: nw, estimate: nw.reduce((s, v, i) => s + v * xs[i], 0), probPositive: nw.reduce((s, v, i) => s + (xs[i] > 0 ? v : 0), 0), ess: 1 / nw.reduce((s, v) => s + v * v, 0) }
}
// Reverse KL(q ‖ p) for Gaussian q against the 1D target, by numerical integration.
const XS = range(1201).map(i => -8 + 16 * i / 1200), DX = 16 / 1200
export function reverseKL(qm, qs) { return XS.reduce((s, x) => { const lq = logNorm(x, qm, qs); return s + Math.exp(lq) * (lq - target1d(x)) * DX }, 0) }
export function fitReverseKL() {
  let best = { kl: Infinity }
  for (let m = -3; m <= 3; m += 0.05) for (let s = 0.2; s <= 3; s += 0.05) { const kl = reverseKL(m, s); if (kl < best.kl) best = { m, s, kl } }
  return best
}
// Forward KL(p ‖ q) is minimized by matching the mean and variance.
export const fitForwardKL = () => ({ m: TRUE_MEAN, s: Math.sqrt(TRUE_VAR) })
// Mean-field Gaussian for a bivariate normal with correlation ρ (unit variances):
// each factor's variance is 1/Λᵢᵢ = 1 − ρ².
export const meanFieldVariance = rho => 1 - rho * rho
const cdf = z => { const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2), e = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2); return z >= 0 ? (1 + e) / 2 : (1 - e) / 2 }
export const TRUE_P_POS = 0.6 * (1 - cdf(2 / 0.6)) + 0.4 * (1 - cdf(-2 / 0.8))
export const STEPS = [0.1, 0.25, 0.5, 1, 1.5, 2.5, 4]
export const STARTS = [[3, -3], [-3, 3], [3, 3], [-3, -3]]
