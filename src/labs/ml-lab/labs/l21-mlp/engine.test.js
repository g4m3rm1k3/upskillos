import { describe, it, expect } from 'vitest'
import { DATA, init, trainSteps, gradCheck, accuracy, softmax } from './engine.js'

describe('lab 21 MLP', () => {
  const pts = DATA.xor[1](1), X = pts.map(p => [p.x1, p.x2]), y = pts.map(p => p.label)
  it('gradients match finite differences', () => {
    for (const c of gradCheck(init([2, 5, 4, 2], 'he', 3), X, y, 'tanh')) expect(c.analytic).toBeCloseTo(c.numeric, 6)
  })
  it('solves XOR with random init but not with zero init', () => {
    expect(accuracy(trainSteps(init([2, 8, 2], 'he', 1), X, y, { act: 'tanh', rate: 0.5, steps: 600 }), X, y, 'tanh')).toBeGreaterThan(0.9)
    expect(accuracy(trainSteps(init([2, 8, 2], 'zero', 1), X, y, { act: 'tanh', rate: 0.5, steps: 300 }), X, y, 'tanh')).toBeLessThan(0.7)
    expect(softmax([1000, 1001]).every(Number.isFinite)).toBe(true)
  })
})
