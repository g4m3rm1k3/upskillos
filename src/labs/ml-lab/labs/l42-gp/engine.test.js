import { describe, it, expect } from 'vitest'
import { observations, gpPosterior, lmlCurve, priorSamples, grid } from './engine.js'

describe('lab 42 Gaussian processes', () => {
  const d = observations(), h = { ell: 0.2, sf: 1, sn: 0.1 }
  it('variance is small at data, larger in the gap, prior far away', () => {
    const p = gpPosterior(d, 'rbf', h, [d[0].x, 0.575, 3])
    expect(p.variance[0]).toBeLessThan(0.02)
    expect(p.variance[1]).toBeGreaterThan(5 * p.variance[0])
    expect(p.variance[2]).toBeCloseTo(1, 6)
  })
  it('marginal likelihood prefers an intermediate length scale and rejects the wrong period', () => {
    const c = lmlCurve(d, 'rbf', 1, 0.1), best = c.reduce((b, r) => r.lml > b.lml ? r : b)
    expect(best.ell).toBe(0.2)
    const per = lmlCurve(d, 'periodic', 1, 0.1).reduce((b, r) => r.lml > b.lml ? r : b)
    expect(per.lml).toBeLessThan(best.lml - 10)
  })
  it('prior samples have the kernel variance', () => {
    const s = priorSamples('rbf', { ell: 0.1, sf: 2, sn: 0 }, grid(40), 200, 5), v = s.reduce((t, f) => t + f[20] ** 2, 0) / s.length
    expect(v).toBeGreaterThan(2.8); expect(v).toBeLessThan(5.5)
  })
})
