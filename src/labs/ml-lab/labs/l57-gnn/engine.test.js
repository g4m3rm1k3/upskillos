import { describe, it, expect } from 'vitest'
import { makeGraph, train, smoothing } from './engine.js'
import { mean } from '../../kit/math.js'

describe('lab 57 graph neural networks', () => {
  const g = makeGraph()
  it('the GCN beats a features-only MLP with few labels', () => {
    const r = kind => mean([1, 2, 3].map(s => train(g, kind, { perClass: 2, labelSeed: s }).acc))
    expect(r('gcn')).toBeGreaterThan(r('mlp') + 0.3)
  })
  it('propagation helps then over-smooths', () => {
    const rows = smoothing(g), at = k => rows.find(r => r.k === k)
    expect(at(4).acc).toBeGreaterThan(at(0).acc + 0.3)
    expect(at(32).acc).toBeLessThan(at(4).acc - 0.2)
    expect(at(32).spread).toBeLessThan(0.01 * at(0).spread)
  })
})
