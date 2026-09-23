import { describe, it, expect } from 'vitest'
import { PRESETS, evaluate, numericGrad } from './engine.js'

describe('lab 20 autodiff', () => {
  it('matches hand-derived gradients', () => {
    const { out, leaves } = evaluate('chain', PRESETS.chain.inputs)
    expect(out.data).toBe(16); expect(leaves.a.grad).toBe(-24); expect(leaves.b.grad).toBe(16); expect(leaves.c.grad).toBe(8)
    expect(evaluate('shared', { x: 3, y: 4 }).leaves.x.grad).toBe(5)
  })
  it('agrees with finite differences for every preset and input', () => {
    for (const [key, p] of Object.entries(PRESETS)) {
      const { leaves } = evaluate(key, p.inputs)
      for (const name of Object.keys(p.inputs)) expect(leaves[name].grad).toBeCloseTo(numericGrad(key, p.inputs, name), 5)
    }
  })
})
