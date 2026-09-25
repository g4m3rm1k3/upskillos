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

describe('figures', () => {
  it('the component view adds up to the engine series', async () => {
    const { parts } = await import('./figures.jsx')
    const y = usage(), p = parts()
    p.forEach((c, t) => expect(Math.max(0, c.trend + c.daily + c.weekly + c.noise + c.spike)).toBeCloseTo(y[t], 9))
  })
})
