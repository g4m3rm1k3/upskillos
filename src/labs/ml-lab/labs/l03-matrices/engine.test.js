import { describe, it, expect } from 'vitest'
import { generate, prepare, curvature, leastSquares, descend, gradient, mse } from './engine.js'

describe('lab 03 multi-feature least squares', () => {
  it('recovers the generating weights and matches gradient descent', () => {
    const { X, y, stats } = prepare(generate({ seed: 3, n: 400, corr: 0.3, noise: 0.5 }), false)
    const ls = leastSquares(X, y)
    expect(ls.w[0] / stats.s1).toBeCloseTo(3, 0)
    expect(ls.w[1] / stats.s2).toBeCloseTo(2, 0)
    const gd = descend(X, y, 0.1, 2000).path.at(-1)
    expect(gd.w[0]).toBeCloseTo(ls.w[0], 6); expect(gd.w[1]).toBeCloseTo(ls.w[1], 6)
  })
  it('matches finite differences', () => {
    const { X, y } = prepare(generate({ seed: 1 }), true), w = [0.4, -0.7], b = 1.2, e = 1e-6
    const g = gradient(X, y, w, b)
    expect(g.w[0]).toBeCloseTo((mse(X, y, [w[0] + e, w[1]], b) - mse(X, y, [w[0] - e, w[1]], b)) / (2 * e), 5)
    expect(g.b).toBeCloseTo((mse(X, y, w, b + e) - mse(X, y, w, b - e)) / (2 * e), 5)
  })
  it('detects rank deficiency and conditioning', () => {
    expect(curvature(prepare(generate({ corr: 1 }), false).X).rank).toBe(1)
    const raw = curvature(prepare(generate({ scale: 1000 }), false).X).condition
    const std = curvature(prepare(generate({ scale: 1000 }), true).X).condition
    expect(raw).toBeGreaterThan(1e5); expect(std).toBeLessThan(3)
  })
  it('stops on divergence', () => {
    const { X, y } = prepare(generate({ scale: 100 }), false)
    expect(descend(X, y, 0.9, 200).diverged).toBe(true)
  })
})
