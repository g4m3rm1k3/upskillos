import { describe, it, expect } from 'vitest'
import { conv2d, outputSize, stackedRF, maxPool, shiftExperiment } from './engine.js'

describe('lab 24 convolution', () => {
  it('computes sizes, values and receptive fields', () => {
    expect(outputSize(12, 3, 2, 1)).toBe(6)
    const x = Array.from({ length: 4 }, (_, i) => Array.from({ length: 4 }, (_, j) => 4 * i + j))
    expect(conv2d(x, [[1, 0], [0, -1]]).flat().every(v => v === -5)).toBe(true)
    expect(stackedRF(4, 3, 1)).toBe(9); expect(stackedRF(3, 3, 2)).toBe(15)
    expect(maxPool([[1, 2], [3, 4]])).toEqual([[4]])
  })
  it('conv + pool features generalize to unseen positions; raw pixels do not', () => {
    expect(shiftExperiment({ kind: 'pixels' }).shiftedAcc).toBeLessThan(0.5)
    expect(shiftExperiment({ kind: 'conv' }).shiftedAcc).toBeGreaterThan(0.9)
  })
})
