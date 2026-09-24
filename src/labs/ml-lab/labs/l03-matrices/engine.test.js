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

describe('the four-build table of lessons 03.1–03.3', () => {
  it('reproduces the worked numbers in the lesson text', async () => {
    const { tableLoss, stableLimit, buildMatrix, matVec, transpose } = await import('./engine.js')
    const t = tableLoss([1, 2, 2])
    expect(t.pred).toEqual([5, 13, 11, 15])
    t.e.forEach((v, i) => expect(v).toBeCloseTo([-1.2, 0.9, -1.8, -2.1][i], 10))
    expect(t.mse).toBeCloseTo(2.475, 10)
    t.grad.forEach((v, i) => expect(v).toBeCloseTo([-2.1, -6.6, -3.75][i], 10))
    expect(tableLoss([1, 2.01, 2]).mse).toBeCloseTo(2.40975, 10)
    expect(tableLoss([1.042, 2.132, 2.075]).mse).toBeCloseTo(1.5861, 3)
    expect(matVec(transpose(buildMatrix()), [1, 1, 1, 1])).toEqual([4, 10, 10])
    expect(matVec(transpose(buildMatrix()), [1, 0, 0, 1])).toEqual([2, 5, 4])
    const limit = stableLimit(buildMatrix())
    expect(limit).toBeCloseTo(0.06607, 4)
    expect(limit).toBeGreaterThan(0.05)
    expect(limit).toBeLessThan(0.07)
  })
})
