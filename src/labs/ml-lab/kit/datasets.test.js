import { describe, it, expect } from 'vitest'
import { classification, DATASETS, split } from './datasets.js'

describe('shared datasets', () => {
  it('are deterministic, binary and finite for every kind', () => {
    for (const [kind] of DATASETS) {
      const a = classification(kind, { seed: 3 }), b = classification(kind, { seed: 3 })
      expect(a).toEqual(b)
      expect(a.every(p => Number.isFinite(p.x1) && Number.isFinite(p.x2) && (p.label === 0 || p.label === 1))).toBe(true)
      const ones = a.filter(p => p.label).length
      expect(ones).toBeGreaterThan(40); expect(ones).toBeLessThan(120)
    }
    const s = split(classification('blobs'), 0.7)
    expect(s.train.length + s.validation.length).toBe(160)
  })
})
import { symmetricEigen } from './math.js'
describe('symmetric eigen-decomposition', () => {
  it('recovers known eigenpairs and reconstructs the matrix', () => {
    const e = symmetricEigen([[2, 1], [1, 2]])
    expect(e.values[0]).toBeCloseTo(3, 10); expect(e.values[1]).toBeCloseTo(1, 10)
    expect(Math.abs(e.vectors[0][0])).toBeCloseTo(Math.SQRT1_2, 10)
    const S = [[4, 1, 0.5], [1, 3, 0.2], [0.5, 0.2, 1]], d = symmetricEigen(S)
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const r = d.values.reduce((t, l, k) => t + l * d.vectors[k][i] * d.vectors[k][j], 0)
      expect(r).toBeCloseTo(S[i][j], 9)
    }
  })
})
