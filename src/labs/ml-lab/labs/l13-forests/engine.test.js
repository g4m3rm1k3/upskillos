import { describe, it, expect } from 'vitest'
import { fitForest, accuracy, oobAccuracy, treeCorrelation, averageVariance } from './engine.js'
import { toRows } from '../l12-trees/engine.js'
import { classification, split } from '../../kit/datasets.js'

describe('lab 13 forests', () => {
  const { train, validation } = split(classification('moons', { seed: 3, n: 300, noise: 0.35 }), 0.7, 3)
  const tr = toRows(train), va = toRows(validation)
  it('a forest beats one deep tree and OOB tracks validation', () => {
    const f = fitForest(tr, { trees: 60, maxDepth: 10, maxFeatures: 1, seed: 1 })
    expect(accuracy(f, va, 60)).toBeGreaterThan(accuracy(f, va, 1))
    expect(Math.abs(oobAccuracy(f, tr) - accuracy(f, va))).toBeLessThan(0.08)
  })
  it('without bootstrap and randomness all trees are identical', () => {
    const f = fitForest(tr, { trees: 5, maxDepth: 6, bootstrap: false })
    expect(treeCorrelation(f, va)).toBeCloseTo(1, 10)
    expect(averageVariance(1, 0.3, 10)).toBeCloseTo(0.37, 12)
  })
})
