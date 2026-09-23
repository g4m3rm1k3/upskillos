// Estimation from samples: sampling variation, the bootstrap, interval
// coverage, likelihood and confounding — all on synthetic data with a known truth.
import { random, normal, mean, std, quantile } from '../../kit/math.js'

// Build durations: right-skewed (lognormal), like most timing data.
// Median e^3.4 ≈ 30 s; mean = e^(μ + σ²/2).
export const POP = { mu: 3.4, sigma: 0.5 }
export const trueMean = Math.exp(POP.mu + POP.sigma ** 2 / 2)
export const draw = rng => Math.exp(POP.mu + POP.sigma * normal(rng))
export const sample = (n, rng) => Array.from({ length: n }, () => draw(rng))

export function samplingDistribution({ n = 20, reps = 1000, seed = 1, stat = 'mean' } = {}) {
  const rng = random(seed), f = stat === 'median' ? v => quantile(v, 0.5) : mean
  return Array.from({ length: reps }, () => f(sample(n, rng)))
}

export function bootstrap(x, { B = 1000, seed = 2, stat = mean } = {}) {
  const rng = random(seed), n = x.length
  return Array.from({ length: B }, () => stat(Array.from({ length: n }, () => x[Math.floor(rng() * n)])))
}
export const percentileInterval = (stats, level = 0.95) => [quantile(stats, (1 - level) / 2), quantile(stats, 1 - (1 - level) / 2)]

// Repeat the whole study many times: how often does the interval contain the truth?
export function coverage({ n = 20, studies = 100, B = 400, level = 0.95, seed = 3 } = {}) {
  const rng = random(seed), intervals = []
  for (let s = 0; s < studies; s++) {
    const x = sample(n, rng), [lo, hi] = percentileInterval(bootstrap(x, { B, seed: seed * 1000 + s }), level)
    intervals.push({ lo, hi, estimate: mean(x), hit: lo <= trueMean && trueMean <= hi })
  }
  return { intervals, rate: intervals.filter(i => i.hit).length / studies }
}

// Log-likelihood of a Bernoulli parameter after k successes in n trials.
export const bernoulliLogLik = (p, k, n) => p <= 0 || p >= 1 ? (k === 0 && p <= 0) || (k === n && p >= 1) ? 0 : -Infinity : k * Math.log(p) + (n - k) * Math.log(1 - p)
// Log-likelihood of a normal mean with known σ: −Σ(x−μ)²/(2σ²) + const.
export const normalLogLik = (mu, x, sigma) => -x.reduce((t, v) => t + (v - mu) ** 2, 0) / (2 * sigma * sigma)

export function pearson(x, y) {
  const mx = mean(x), my = mean(y)
  const sxy = x.reduce((t, v, i) => t + (v - mx) * (y[i] - my), 0)
  const sxx = x.reduce((t, v) => t + (v - mx) ** 2, 0), syy = y.reduce((t, v) => t + (v - my) ** 2, 0)
  return sxy / Math.sqrt(sxx * syy)
}

// Project size drives both the number of tests written and the bugs found.
// Tests have NO effect on bugs here (effect = 0) unless `effect` is changed.
export function confounded({ n = 150, seed = 5, effect = 0 } = {}) {
  const rng = random(seed)
  return Array.from({ length: n }, () => {
    const size = rng() < 0.5 ? 0 : 1
    const tests = 20 + 60 * size + 12 * normal(rng)
    const bugs = 5 + 25 * size + effect * tests + 5 * normal(rng)
    return { size, tests, bugs }
  })
}
export { mean, std }
