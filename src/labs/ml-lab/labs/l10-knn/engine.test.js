import { describe, it, expect } from 'vitest'
import { neighbours, accuracy, inUnits, standardizer, distanceContrast } from './engine.js'
import { classification, split } from '../../kit/datasets.js'

describe('lab 10 k-NN', () => {
  it('k = 1 memorizes and moderate k generalizes', () => {
    const { train, validation } = split(classification('moons', { seed: 1, n: 240, noise: 0.3 }), 0.7, 1)
    expect(accuracy(train, train, 1)).toBe(1)
    expect(accuracy(train, validation, 7)).toBeGreaterThan(0.85)
    expect(neighbours(train, [0, 0], 5).near).toHaveLength(5)
  })
  it('bad units hurt unless standardized', () => {
    const { train, validation } = split(classification('xor', { seed: 2, n: 240 }), 0.7, 2)
    const t = inUnits(train, 1000), v = inUnits(validation, 1000)
    const raw = accuracy(t, v, 5), scaled = accuracy(t, v, 5, 'euclidean', standardizer(t))
    expect(raw).toBeLessThan(0.7); expect(scaled).toBeGreaterThan(0.85)
  })
  it('distance contrast shrinks with dimension', () => {
    expect(distanceContrast(2).ratio).toBeGreaterThan(5 * distanceContrast(200).ratio / 2)
    expect(distanceContrast(300).ratio).toBeLessThan(2)
  })
})
