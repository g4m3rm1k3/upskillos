import { describe, it, expect } from 'vitest'
import { TARGETS, metropolis, ess, rhat, importance, fitReverseKL, meanFieldVariance, STARTS } from './engine.js'

describe('lab 44 sampling', () => {
  it('step size trades acceptance for mixing', () => {
    const small = metropolis(TARGETS.corr.logp, [3, -3], 0.1, 5000, 1), mid = metropolis(TARGETS.corr.logp, [3, -3], 1.5, 5000, 1)
    expect(small.acceptance).toBeGreaterThan(0.8); expect(mid.acceptance).toBeLessThan(0.3)
    expect(ess(mid.chain.slice(500).map(p => p[0]))).toBeGreaterThan(4 * ess(small.chain.slice(500).map(p => p[0])))
  })
  it('R-hat exposes chains stuck in separate modes', () => {
    const chains = STARTS.map((s, j) => metropolis(TARGETS.twoModes.logp, s, 0.5, 3000, 10 + j).chain.slice(500).map(p => p[0]))
    expect(rhat(chains)).toBeGreaterThan(1.5)
  })
  it('importance sampling fails silently with a one-mode proposal; VI is mode-seeking', () => {
    const r = importance(-2, 0.6, 1000, 3)
    expect(r.ess).toBeGreaterThan(400); expect(Math.abs(r.estimate - (-0.4))).toBeGreaterThan(1)
    const v = fitReverseKL()
    expect(Math.abs(v.m + 2)).toBeLessThan(0.1); expect(v.s).toBeLessThan(0.7)
    expect(meanFieldVariance(0.9)).toBeCloseTo(0.19, 12)
  })
})
