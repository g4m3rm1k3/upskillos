import { describe, it, expect } from 'vitest'
import { METHODS, train, gradientSpread } from './engine.js'
import { mean } from '../../kit/math.js'

describe('lab 58 policy gradients', () => {
  it('baseline makes REINFORCE reliable; actor–critic learns fastest', { timeout: 60000 }, () => {
    const last = m => [1, 2, 3].map(s => mean(train(m, { ...METHODS[m].opts, seed: s }).returns.slice(-20)))
    expect(Math.min(...last('baseline'))).toBeGreaterThan(150)
    expect(Math.min(...last('ac'))).toBeGreaterThan(190)
    const early = mean([1, 2, 3].map(s => mean(train('ac', { ...METHODS.ac.opts, seed: s, episodes: 100 }).returns.slice(-20))))
    expect(early).toBeGreaterThan(150)
  })
  it('a baseline reduces gradient variance', () => {
    const g = gradientSpread([0, 0, 0, 0, 0])
    expect(g.baseline.sd[2]).toBeLessThan(g.plain.sd[2])
  })
})
