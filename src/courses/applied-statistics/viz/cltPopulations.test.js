import { describe, expect, it } from 'vitest'
import { POPULATIONS, makeRng, drawSampleMeans } from './cltPopulations.js'

const moments = xs => {
  const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1)
  const skew = xs.reduce((s, x) => s + ((x - m) / Math.sqrt(v)) ** 3, 0) / n
  return { m, sd: Math.sqrt(v), skew }
}

describe('CLT simulator populations', () => {
  it('the same seed reproduces the same draws; a different seed does not', () => {
    const a = drawSampleMeans(POPULATIONS.exponential, 10, 50, makeRng(7))
    expect(drawSampleMeans(POPULATIONS.exponential, 10, 50, makeRng(7))).toEqual(a)
    expect(drawSampleMeans(POPULATIONS.exponential, 10, 50, makeRng(8))).not.toEqual(a)
  })

  for (const [key, pop] of Object.entries(POPULATIONS)) {
    it(`${key}: simulated mean and SD agree with the stated moments`, () => {
      const N = 200_000, rng = makeRng(12345)
      const { m, sd } = moments(Array.from({ length: N }, () => pop.sample(rng)))
      // Mean: within 4 standard errors. SD: within 2%, far wider than its sampling error at this N.
      expect(Math.abs(m - pop.mu)).toBeLessThan(4 * pop.sigma / Math.sqrt(N))
      expect(Math.abs(sd / pop.sigma - 1)).toBeLessThan(0.02)
    })
  }

  it('the right-skewed population is actually right-skewed (Gamma(2): skewness √2)', () => {
    const rng = makeRng(3)
    const { skew } = moments(Array.from({ length: 200_000 }, () => POPULATIONS.skewed.sample(rng)))
    expect(skew).toBeGreaterThan(1.3)
    expect(skew).toBeLessThan(1.55)
  })

  it('the bimodal SD includes the spread within each mode', () => {
    expect(POPULATIONS.bimodal.sigma).toBeCloseTo(Math.sqrt(0.25 ** 2 + 0.08 ** 2), 12)
    expect(POPULATIONS.bimodal.sigma).toBeCloseTo(0.26249, 4)
  })

  it('sample means have spread σ/√n', () => {
    for (const pop of Object.values(POPULATIONS)) {
      const means = drawSampleMeans(pop, 25, 20_000, makeRng(99))
      expect(Math.abs(moments(means).sd / (pop.sigma / 5) - 1)).toBeLessThan(0.03)
    }
  })
})
