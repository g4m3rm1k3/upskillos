import { describe, it, expect } from 'vitest'
import { separableStream, perceptronOnline, adversarialLosses, hedge, followLeader, hedgeEta, hedgeBound, ARM_SETS, averageRegret } from './engine.js'

describe('lab 50 online learning', () => {
  it('perceptron mistake bound; Hedge beats follow-the-leader adversarially', () => {
    const s = separableStream(2000, 0.3), p = perceptronOnline(s.data)
    expect(p.mistakes).toBeLessThanOrEqual((p.R / 0.3) ** 2)
    const L = adversarialLosses(2000)
    expect(hedge(L, hedgeEta(2000, 2)).regret).toBeLessThan(hedgeBound(2000, 2))
    expect(followLeader(L).regret).toBeGreaterThan(900)
  })
  it('bandits: Thompson best; ε-greedy linear; UCB flattens', () => {
    const m = ARM_SETS.easy.means, eps = averageRegret(m, 'eps', 20000, 6), ucb = averageRegret(m, 'ucb', 20000, 6), ts = averageRegret(m, 'ts', 20000, 6)
    expect(ts.curve.at(-1)).toBeLessThan(ucb.curve.at(-1)); expect(ucb.curve.at(-1)).toBeLessThan(eps.curve.at(-1))
    expect(eps.curve.at(-1) / eps.curve[50]).toBeGreaterThan(3); expect(ucb.curve.at(-1) / ucb.curve[50]).toBeLessThan(2)
  })
})
