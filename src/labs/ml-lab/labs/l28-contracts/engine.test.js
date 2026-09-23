import { describe, it, expect } from 'vitest'
import { incomingBatch, DEFAULT_CONTRACT, validate, driftCheck, REFERENCE, trainRun, dataVersion } from './engine.js'

describe('lab 28 contracts', () => {
  it('finds every injected row problem and none in clean data', () => {
    const r = validate(incomingBatch(), DEFAULT_CONTRACT)
    const rules = new Set(r.violations.map(v => `${v.column}:${v.rule}`))
    for (const k of ['size_mb:required', 'size_mb:≥ 0', 'language:in {go, java, python}', 'hour:≤ 23', 'files:type number', 'job_id:unique', 'runner:in {shared, dedicated}', 'duration_s:required']) expect(rules.has(k)).toBe(true)
    expect(validate(incomingBatch({ problems: false }), DEFAULT_CONTRACT).violations).toHaveLength(0)
  })
  it('a unit change passes row rules but shows up as drift', () => {
    const b = incomingBatch(), r = validate(b, DEFAULT_CONTRACT)
    expect(Math.abs(driftCheck(b.filter((_, i) => !r.badRows.includes(i)), 'duration_s', REFERENCE.duration_s).z)).toBeGreaterThan(3)
  })
  it('training is exactly reproducible from data and config', () => {
    const d = incomingBatch({ problems: false }), cfg = { lr: 0.05, steps: 100, features: { logSize: true, interactions: false, busy: false, oneHot: true } }
    expect(trainRun(d, cfg).weightsHash).toBe(trainRun(d, cfg).weightsHash)
    const edited = d.map((r, i) => (i === 5 ? { ...r, duration_s: r.duration_s + 0.1 } : r))
    expect(dataVersion(edited)).not.toBe(dataVersion(d))
  })
})
