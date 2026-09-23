import { describe, it, expect } from 'vitest'
import { maps, rbfMap, trainSVM, analyse } from './engine.js'
import { classification } from '../../kit/datasets.js'

describe('lab 15 SVM', () => {
  it('separates blobs; stronger regularization widens the margin', () => {
    const pts = classification('blobs', { seed: 1, n: 160 }), fm = maps.linear()
    const narrow = analyse(trainSVM(pts, fm, { lambda: 0.001 }), fm, pts, 0.001), wide = analyse(trainSVM(pts, fm, { lambda: 1 }), fm, pts, 1)
    expect(narrow.accuracy).toBeGreaterThan(0.97); expect(wide.width).toBeGreaterThan(narrow.width)
    expect(wide.supportVectors.size).toBeGreaterThan(narrow.supportVectors.size)
  })
  it('feature maps bend the boundary', () => {
    const pts = classification('circles', { seed: 2, n: 160 })
    const lin = maps.linear(), quad = maps.quadratic()
    expect(analyse(trainSVM(pts, quad, { lambda: 0.01 }), quad, pts, 0.01).accuracy).toBeGreaterThan(0.95)
    expect(analyse(trainSVM(pts, lin, { lambda: 0.01 }), lin, pts, 0.01).accuracy).toBeLessThan(0.8)
    const moons = classification('moons', { seed: 3, n: 160 }), rbf = rbfMap(1)
    expect(analyse(trainSVM(moons, rbf, { lambda: 0.001 }), rbf, moons, 0.001).accuracy).toBeGreaterThan(0.9)
  })
})
