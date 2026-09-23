import { describe, it, expect } from 'vitest'
import { usage, acf, walkForward } from './engine.js'

describe('lab 19 time series', () => {
  const y = usage()
  it('has daily and weekly autocorrelation', () => {
    const r = acf(y, 170)
    expect(r[1]).toBeGreaterThan(0.8); expect(r[24]).toBeGreaterThan(r[12]); expect(r[168]).toBeGreaterThan(r[12])
  })
  it('lag regression beats both baselines at 6 h; the leak is implausibly good', () => {
    const honest = walkForward(y, 6), leaky = walkForward(y, 6, { leaky: true })
    expect(honest.mae.regression).toBeLessThan(Math.min(honest.mae.persistence, honest.mae.seasonal))
    expect(leaky.mae.regression).toBeLessThan(0.5 * honest.mae.regression)
  })
})
