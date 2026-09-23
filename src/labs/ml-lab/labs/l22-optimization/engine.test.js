import { describe, it, expect } from 'vitest'
import { run, loss, update, minibatch, runScenario } from './engine.js'

describe('lab 22 optimization', () => {
  it('momentum and Adam beat plain GD on an ill-conditioned valley', () => {
    const f = k => loss('valley', run('valley', k, { lr: { sgd: 0.035, momentum: 0.01, adam: 0.1 }[k], steps: 120, kappa: 50 }).path.at(-1), 50)
    expect(f('momentum')).toBeLessThan(f('sgd')); expect(f('adam')).toBeLessThan(f('sgd'))
  })
  it('Adam bias correction makes the first step ≈ lr', () => {
    const [p] = update('adam', [0, 0], [1e-3, 40], {}, 0.01, 1)
    expect(Math.abs(p[0])).toBeCloseTo(0.01, 4); expect(Math.abs(p[1])).toBeCloseTo(0.01, 4)
  })
  it('minibatch learns and scenarios have their signatures', () => {
    expect(minibatch({ batch: 16, schedule: 'cosine' }).final).toBeLessThan(0.5)
    const sign = runScenario('sign'); expect(sign.at(-1)[1]).toBeGreaterThan(sign[0][1])
    const over = runScenario('overfit'); expect(over.at(-1)[1]).toBeLessThan(0.05); expect(over.at(-1)[2]).toBeGreaterThan(Math.min(...over.map(r => r[2])))
  })
})
