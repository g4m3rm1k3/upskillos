import { describe, it, expect } from 'vitest'
import { makeData, boost, stageErrors, bestStage } from './engine.js'

describe('lab 14 boosting', () => {
  it('training error falls every stage; validation improves then can worsen', () => {
    const train = makeData(80, 0.4, 1), val = makeData(300, 0.4, 501)
    const e = stageErrors(boost(train, { stages: 300, rate: 1, depth: 2 }), train, val)
    for (let i = 1; i < e.length; i++) expect(e[i].train).toBeLessThanOrEqual(e[i - 1].train + 1e-9)
    const best = bestStage(e); expect(e[best].val).toBeLessThan(e[0].val / 2); expect(e.at(-1).val).toBeGreaterThan(e[best].val)
  })
  it('small learning rates reach a lower validation minimum', () => {
    const train = makeData(80, 0.4, 2), val = makeData(300, 0.4, 502)
    const best = r => { const e = stageErrors(boost(train, { stages: 400, rate: r, depth: 1 }), train, val); return e[bestStage(e)].val }
    expect(best(0.1)).toBeLessThanOrEqual(best(1) + 0.01)
  })
})
