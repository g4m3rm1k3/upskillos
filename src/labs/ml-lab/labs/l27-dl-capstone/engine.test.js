import { describe, it, expect } from 'vitest'
import { CONFIGS, runConfig, summarize, confusion } from './engine.js'

describe('lab 27 capstone', () => {
  it('conv features beat pixels at unseen positions; full pipeline beats baseline', () => {
    const s = k => summarize([1, 2].map(seed => runConfig(CONFIGS[k], seed))).mean
    const base = s('linear'), conv = s('conv'), full = s('full')
    expect(conv).toBeGreaterThan(base + 0.2); expect(full).toBeGreaterThan(base + 0.25)
    const r = runConfig(CONFIGS.conv, 1); expect(confusion(r.pred, r.test).flat().reduce((a, b) => a + b)).toBe(300)
  })
})
