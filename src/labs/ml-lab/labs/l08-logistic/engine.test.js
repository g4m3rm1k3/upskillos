import { describe, it, expect } from 'vitest'
import { initial, step, evaluate, gradientCheck, bce } from './engine.js'
import { classification, split } from '../../kit/datasets.js'

describe('lab 08 logistic regression', () => {
  it('gradients match finite differences for both feature maps', () => {
    const d = classification('circles', { seed: 2 })
    for (const map of ['linear', 'quadratic']) {
      let m = initial(map); for (let i = 0; i < 20; i++) m = step(m, d, map, 0.5, 0.01)
      expect(gradientCheck(m, d, map, 0.01).passed).toBe(true)
    }
  })
  it('quadratic features solve circles, linear cannot', () => {
    const { train, validation } = split(classification('circles', { seed: 3 }), 0.7, 3)
    const run = map => { let m = initial(map); for (let i = 0; i < 1500; i++) m = step(m, train, map, 1, 0); return evaluate(m, validation, map).accuracy }
    expect(run('quadratic')).toBeGreaterThan(0.9); expect(run('linear')).toBeLessThan(0.75)
  })
  it('stable cross-entropy', () => {
    expect(bce(0, 1)).toBeCloseTo(Math.log(2), 12)
    expect(Number.isFinite(bce(1000, 0))).toBe(true); expect(bce(-1000, 0)).toBeCloseTo(0, 12)
  })
})
