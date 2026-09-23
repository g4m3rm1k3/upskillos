import { describe, it, expect } from 'vitest'
import { gini, entropy, splitScan, bestSplit, buildTree, accuracy, toRows, depthOf, predict } from './engine.js'
import { classification, split } from '../../kit/datasets.js'

describe('lab 12 trees', () => {
  it('impurities and incremental scan match direct computation', () => {
    expect(gini([0, 0, 1, 1])).toBe(0.5); expect(entropy([0, 0, 1, 1])).toBe(1)
    const rows = [[1, 0], [2, 0], [3, 1], [4, 1]].map(([x, y]) => ({ x: [x], y }))
    const s = bestSplit(rows); expect(s.threshold).toBe(2.5); expect(s.gain).toBeCloseTo(0.5, 12)
    const scan = splitScan(rows, 0, 'mse'); expect(scan.parent).toBeCloseTo(0.25, 12)
  })
  it('deep trees memorize; limited trees generalize', () => {
    const { train, validation } = split(classification('overlap', { seed: 2, n: 300 }), 0.7, 2)
    const tr = toRows(train), va = toRows(validation)
    const deep = buildTree(tr, { maxDepth: 30 }), shallow = buildTree(tr, { maxDepth: 3, minLeaf: 5 })
    expect(accuracy(deep, tr)).toBe(1); expect(accuracy(shallow, va)).toBeGreaterThanOrEqual(accuracy(deep, va))
    expect(depthOf(shallow)).toBeLessThanOrEqual(3)
  })
  it('regression trees predict leaf means', () => {
    const rows = [1, 2, 3, 10, 11, 12].map((x, i) => ({ x: [x], y: i < 3 ? 5 : 20 }))
    const t = buildTree(rows, { maxDepth: 1, criterion: 'mse' })
    expect(predict(t, [2])).toBe(5); expect(predict(t, [11])).toBe(20)
  })
})
