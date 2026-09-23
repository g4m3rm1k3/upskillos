import { describe, it, expect } from 'vitest'
import { population, estimates, diffInMeans, experiments, summarize, sampleSize, phi } from './engine.js'

describe('lab 36 causal inference', () => {
  it('confounding biases the naive estimate; good adjustment removes it; randomization avoids it', () => {
    const e = estimates(population({ confounding: 1.5, proxyNoise: 0 }))
    expect(e.naive).toBeGreaterThan(2.5)
    expect(Math.abs(e.regression - 1)).toBeLessThan(0.15)
    expect(Math.abs(e.ipw - 1)).toBeLessThan(0.2)
    expect(estimates(population({ confounding: 1.5, proxyNoise: 1.5 })).regression).toBeGreaterThan(2)
    const r = diffInMeans(population({ randomized: true }))
    expect(r.lo).toBeLessThan(1); expect(r.hi).toBeGreaterThan(1)
  })
  it('power, peeking and the winner’s curse', () => {
    expect(phi(1.96)).toBeCloseTo(0.975, 3)
    expect(sampleSize(2, 0.5)).toBe(252)
    const nullFixed = summarize(experiments({ effect: 0 }), 0), nullPeek = summarize(experiments({ effect: 0, peek: true }), 0)
    expect(nullFixed.significant).toBeLessThan(0.09)
    expect(nullPeek.significant).toBeGreaterThan(0.15)
    const small = summarize(experiments({ effect: 0.3, perArm: 200 }), 0.3)
    expect(small.meanSignificantEstimate).toBeGreaterThan(0.5)
  })
})
