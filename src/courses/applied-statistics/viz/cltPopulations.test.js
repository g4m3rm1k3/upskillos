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

describe('the last sample and the ML Lab 05 reference run', () => {
  it('recording the last sample does not change the stream, and its mean is the last sample mean', () => {
    const plain = drawSampleMeans(POPULATIONS.skewed, 20, 50, makeRng(3))
    const last = [], withLast = drawSampleMeans(POPULATIONS.skewed, 20, 50, makeRng(3), last)
    expect(withLast).toEqual(plain)
    expect(last).toHaveLength(20)
    expect(last.reduce((a, b) => a + b, 0) / 20).toBeCloseTo(plain[49], 12)
  })
  it('seed 1, right-skewed, n = 20, +1000: the numbers ML Lab 05.2 quotes', () => {
    const m = drawSampleMeans(POPULATIONS.skewed, 20, 1000, makeRng(1))
    const mean = m.reduce((a, b) => a + b, 0) / m.length
    const sd = Math.sqrt(m.reduce((s, x) => s + (x - mean) ** 2, 0) / (m.length - 1))
    expect([mean.toFixed(3), sd.toFixed(3), (POPULATIONS.skewed.sigma / Math.sqrt(20)).toFixed(3)]).toEqual(['0.497', '0.077', '0.079'])
  })
})
