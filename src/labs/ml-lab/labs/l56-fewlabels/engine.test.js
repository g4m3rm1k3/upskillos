import { describe, it, expect } from 'vitest'
import { POOL, TESTSET, pickLabels, fitLogistic, acc, labelPropagation, activeCurves, trainContrastive, linearProbe } from './engine.js'
import { mean } from '../../kit/math.js'

describe('lab 56 learning from few labels', () => {
  it('label propagation beats supervised learning with 1 label per class', () => {
    const r = [1, 2, 3].map(s => { const L = pickLabels(2, s); return [acc(labelPropagation(L).predict, TESTSET), acc(fitLogistic(L.map(i => POOL[i].x), L.map(i => POOL[i].y)), TESTSET)] })
    expect(mean(r.map(x => x[0]))).toBeGreaterThan(mean(r.map(x => x[1])) + 0.1)
  })
  it('uncertainty sampling learns faster than random', { timeout: 60000 }, () => {
    const c = activeCurves(3, 12)
    expect(c.uncertainty[8].acc).toBeGreaterThan(c.random[8].acc)
  })
  it('contrastive embeddings beat raw pixels with one label per digit', { timeout: 60000 }, () => {
    const m = trainContrastive({ epochs: 40 })
    expect(linearProbe(m.embed, 1)).toBeGreaterThan(linearProbe(x => Array.from(x), 1) + 0.15)
  })
})
