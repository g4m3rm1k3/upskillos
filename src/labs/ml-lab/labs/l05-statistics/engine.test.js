import { describe, it, expect } from 'vitest'
import { trueMean, sample, samplingDistribution, bootstrap, percentileInterval, coverage, bernoulliLogLik, pearson, confounded, std } from './engine.js'
import { random } from '../../kit/math.js'
import { fitLine } from '../l02-data/engine.js'

describe('lab 05 estimation', () => {
  it('sampling distribution of the mean is centred on the truth with spread σ/√n', () => {
    const sd = samplingDistribution({ n: 50, reps: 3000, seed: 4 })
    const sigma = trueMean * Math.sqrt(Math.exp(0.25) - 1)
    expect(Math.abs(sd.reduce((a, b) => a + b) / sd.length - trueMean)).toBeLessThan(0.3)
    expect(std(sd)).toBeCloseTo(sigma / Math.sqrt(50), 0)
  })
  it('bootstrap spread approximates the true standard error for moderate n', () => {
    const x = sample(200, random(9)), b = bootstrap(x, { B: 2000 })
    const sigma = trueMean * Math.sqrt(Math.exp(0.25) - 1)
    expect(Math.abs(std(b) - sigma / Math.sqrt(200)) / (sigma / Math.sqrt(200))).toBeLessThan(0.25)
    const [lo, hi] = percentileInterval(b); expect(lo).toBeLessThan(hi)
  })
  it('coverage is near nominal at n=200', () => {
    expect(coverage({ n: 200, studies: 100, B: 300, seed: 5 }).rate).toBeGreaterThan(0.85)
  })
  it('likelihood peaks at k/n; pearson and confounding behave', () => {
    const at = p => bernoulliLogLik(p, 7, 10)
    expect(at(0.7)).toBeGreaterThan(at(0.69)); expect(at(0.7)).toBeGreaterThan(at(0.71))
    expect(pearson([1, 2, 3], [1, 3, 2])).toBeCloseTo(0.5, 12)
    const data = confounded({ n: 2000, seed: 3, effect: 0 })
    const pooled = fitLine(data.map(r => ({ size_mb: r.tests, duration_s: r.bugs }))).w
    const within = fitLine(data.filter(r => r.size === 0).map(r => ({ size_mb: r.tests, duration_s: r.bugs }))).w
    expect(pooled).toBeGreaterThan(0.2); expect(Math.abs(within)).toBeLessThan(0.05)
  })
})
