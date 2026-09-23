import { describe, it, expect } from 'vitest'
import { makeData, fitRidge, fitLasso, mse, validationCurve, biasVariance, softThreshold } from './engine.js'

describe('lab 07 regularization', () => {
  it('training error never rises with degree; validation is U-shaped', () => {
    const c = validationCurve({ n: 25, noise: 0.25, seed: 1, lambda: 0, penalty: 'l2' })
    for (let d = 1; d < c.length; d++) expect(c[d].train).toBeLessThanOrEqual(c[d - 1].train + 1e-9)
    const best = c.reduce((b, x) => x.val < b.val ? x : b)
    expect(best.degree).toBeGreaterThan(1); expect(best.degree).toBeLessThan(12)
    expect(c[15].val).toBeGreaterThan(best.val)
  })
  it('ridge shrinks weights and lasso produces exact zeros', () => {
    const data = makeData(40, 0.2, 2)
    const norm = m => Math.hypot(...m.w)
    expect(norm(fitRidge(data, 10, 0.1))).toBeLessThan(norm(fitRidge(data, 10, 1e-6)))
    const lasso = fitLasso(data, 10, 0.05)
    expect(lasso.w.filter(w => w === 0).length).toBeGreaterThan(3)
    expect(softThreshold(3, 1)).toBe(2); expect(softThreshold(0.4, 1)).toBe(0)
  })
  it('bias-variance: high degree has more variance, low degree more bias', () => {
    const lo = biasVariance({ n: 20, noise: 0.25, degree: 1, lambda: 0, penalty: 'l2' })
    const hi = biasVariance({ n: 20, noise: 0.25, degree: 12, lambda: 0, penalty: 'l2' })
    expect(lo.bias2).toBeGreaterThan(hi.bias2); expect(hi.variance).toBeGreaterThan(lo.variance)
  })
})
