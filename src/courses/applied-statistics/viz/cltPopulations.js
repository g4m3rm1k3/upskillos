// Populations for the CLT simulator. Every sampler draws from a seeded generator, and mu and
// sigma are the exact population moments (cltPopulations.test.js checks them by simulation).

// mulberry32: a small, fast, seedable 32-bit generator returning values in [0, 1).
export function makeRng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Box–Muller; 1 − u keeps the logarithm finite.
export function gaussSample(rng, mu = 0, sigma = 1) {
  const u = 1 - rng(), v = rng()
  return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
const exponentialSample = rng => -Math.log(1 - rng())

const MODE_SD = 0.08
export const POPULATIONS = {
  uniform: {
    label: 'Uniform(0, 1)',
    sample: rng => rng(),
    mu: 0.5,
    sigma: Math.sqrt(1 / 12),
    color: '#6366f1',
  },
  exponential: {
    label: 'Exponential(λ = 1)',
    sample: exponentialSample,
    mu: 1,
    sigma: 1,
    color: '#f59e0b',
  },
  bimodal: {
    // Equal mixture of N(0.25, 0.08²) and N(0.75, 0.08²):
    // Var = within-mode variance + between-mode variance = 0.08² + 0.25².
    label: 'Bimodal (two peaks)',
    sample: rng => gaussSample(rng, rng() < 0.5 ? 0.25 : 0.75, MODE_SD),
    mu: 0.5,
    sigma: Math.sqrt(MODE_SD ** 2 + 0.25 ** 2),
    color: '#10b981',
  },
  skewed: {
    // Gamma(shape 2, scale 0.25): the sum of two independent Exponential(mean 0.25) draws.
    // Mean kθ = 0.5, SD √k·θ = 0.25√2, skewness 2/√k ≈ 1.41 — right-skewed, milder than the exponential.
    label: 'Right-skewed · Gamma(2, 0.25)',
    sample: rng => 0.25 * (exponentialSample(rng) + exponentialSample(rng)),
    mu: 0.5,
    sigma: 0.25 * Math.SQRT2,
    color: '#ec4899',
  },
}

// Draw `count` sample means of size n, continuing the given generator's stream. `last`, if given,
// receives the n individual values of the final sample (same stream: it does not change the means).
export function drawSampleMeans(pop, n, count, rng, last) {
  const means = new Array(count)
  for (let i = 0; i < count; i++) {
    let sum = 0
    for (let j = 0; j < n; j++) {
      const x = pop.sample(rng)
      sum += x
      if (last && i === count - 1) last.push(x)
    }
    means[i] = sum / n
  }
  return means
}
