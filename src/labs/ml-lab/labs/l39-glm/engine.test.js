import { describe, it, expect } from 'vitest'
import { makeData, standardizer, objective, newton, gradientDescent, optimum, gaps, threeClasses, trainSoftmax, crossEntropy, lwrData, lwrLoo, TAUS } from './engine.js'

describe('lab 39 GLMs and Newton’s method', () => {
  it('Newton converges in a few steps, GD crawls on raw inputs, and standardizing helps only GD', () => {
    for (const fam of ['gaussian', 'bernoulli', 'poisson']) {
      const data = makeData(fam)
      const raw = objective(fam, data), std = objective(fam, data, standardizer(data, true).f)
      const nRaw = gaps(raw, newton(raw), optimum(raw)), gRaw = gaps(raw, gradientDescent(raw), optimum(raw)), gStd = gaps(std, gradientDescent(std), optimum(std))
      expect(nRaw.findIndex(v => v < 1e-8)).toBeLessThanOrEqual(fam === 'gaussian' ? 1 : 6)
      expect(gRaw[200]).toBeGreaterThan(1e-6)
      expect(gStd.findIndex(v => v < 1e-8)).toBeLessThan(30)
    }
  })
  it('softmax training lowers cross-entropy from log 3', () => {
    const d = threeClasses(), s = trainSoftmax(d)
    expect(crossEntropy(s[0], d)).toBeCloseTo(Math.log(3), 6)
    expect(crossEntropy(s.at(-1), d)).toBeLessThan(0.3)
  })
  it('leave-one-out picks an intermediate bandwidth', () => {
    const d = lwrData(), loo = TAUS.map(t => lwrLoo(d, t)), best = loo.indexOf(Math.min(...loo))
    expect(best).toBeGreaterThan(0)
    expect(best).toBeLessThan(TAUS.length - 1)
  })
})
