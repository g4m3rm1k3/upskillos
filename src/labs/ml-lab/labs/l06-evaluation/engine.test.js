import { describe, it, expect } from 'vitest'
import { kfold, groupKfold, forwardChain, selectionExperiment, groupExperiment, timeExperiment, winnersCurse, mean } from './engine.js'

describe('lab 06 evaluation', () => {
  it('splitters partition rows correctly', () => {
    const f = kfold(23, 5); expect(f.flatMap(x => x.val).sort((a, b) => a - b)).toEqual([...Array(23).keys()])
    const g = Array.from({ length: 40 }, (_, i) => Math.floor(i / 5))
    for (const s of groupKfold(g, 4)) expect(s.train.some(i => s.val.some(j => g[i] === g[j]))).toBe(false)
    for (const s of forwardChain(100, 5, 50)) expect(Math.max(...s.train)).toBeLessThan(Math.min(...s.val))
  })
  it('selection leak inflates noise accuracy; honest stays near chance', () => {
    const r = selectionExperiment({ seed: 1 })
    expect(mean(r.leaky)).toBeGreaterThan(0.7); expect(mean(r.honest)).toBeLessThan(0.65)
  })
  it('group and time splits reveal the optimism of random splits', () => {
    const g = groupExperiment({ seed: 2 }); expect(g.groupSplit.nn).toBeGreaterThan(2 * g.rowSplit.nn)
    const t = timeExperiment({ seed: 3 }); expect(t.forwardMSE).toBeGreaterThan(2 * t.random)
  })
  it('the winner of many equal models is optimistic', () => {
    const w = winnersCurse({ models: 100, seed: 4 })
    expect(w.test[w.best]).toBeGreaterThan(0.75)
  })
})
