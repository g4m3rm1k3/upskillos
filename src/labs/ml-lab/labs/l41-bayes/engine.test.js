import { describe, it, expect } from 'vitest'
import { lgamma, coinPosterior, logEvidenceBeta, curveData, bayesLinReg, gaussFeatures, evidenceCurve } from './engine.js'

describe('lab 41 Bayesian inference', () => {
  it('log-gamma, Beta updates and Bayes factors', () => {
    expect(lgamma(5)).toBeCloseTo(Math.log(24), 10)
    const p = coinPosterior(2, 2, 7, 3)
    expect(p.mean).toBeCloseTo(9 / 14, 12); expect(p.map).toBeCloseTo(2 / 3, 12)
    expect(p.lo).toBeLessThan(0.5); expect(p.hi).toBeGreaterThan(0.8)
    expect(Math.exp(logEvidenceBeta(1, 1, 10, 0) - 10 * Math.log(0.5))).toBeCloseTo(1024 / 11, 6)
  })
  it('predictive uncertainty is small near data and large far away', () => {
    const d = curveData(8), post = bayesLinReg(d, x => gaussFeatures(x), 2, 16)
    const near = Math.min(...d.map(q => post.predict(q.x).variance))
    expect(near).toBeGreaterThanOrEqual(1 / 16)
    expect(post.predict(0.45).variance).toBeGreaterThan(3 * near)
  })
  it('the evidence peaks at degree 3 while training error keeps falling', () => {
    for (const n of [10, 15, 30]) {
      const rows = evidenceCurve(n), best = rows.reduce((b, r) => r.logEvidence > b.logEvidence ? r : b)
      expect(best.degree).toBe(3)
      expect(rows[9].trainRmse).toBeLessThanOrEqual(rows[3].trainRmse + 1e-9)
    }
  })
})
