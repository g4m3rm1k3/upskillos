import { describe, it, expect } from 'vitest'
import { simulate } from './engine.js'

describe('lab 23 training-loop simulator', () => {
  const ok = { zeroGrad: true, evalMode: true, noGrad: true, saveOptimizer: true }
  it('the correct loop matches its reference exactly', () => { const r = simulate(ok); expect(r.drift).toBe(0); expect(r.log.at(-1).val).toBe(r.reference.at(-1).val) })
  it('each missing line has its own signature', () => {
    expect(simulate({ ...ok, zeroGrad: false }).log.at(-1).train).toBeGreaterThan(100)
    expect(simulate({ ...ok, evalMode: false }).log.at(-1).val).toBeGreaterThan(2 * simulate(ok).log.at(-1).val)
    expect(simulate({ ...ok, noGrad: false }).log.at(-1).retained).toBeGreaterThan(0)
    const s = simulate({ ...ok, saveOptimizer: false }); expect(s.drift).toBeGreaterThan(0.01)
  })
})
