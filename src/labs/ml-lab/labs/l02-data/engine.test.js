import { describe, it, expect } from 'vitest'
import { generateLog, runPipeline, defaultDecisions, broadcastShape, fingerprint } from './engine.js'

describe('lab 02 data pipeline', () => {
  it('is reproducible for a seed and sensitive to decisions', () => {
    const a = runPipeline(generateLog({ seed: 7 }), defaultDecisions)
    const b = runPipeline(generateLog({ seed: 7 }), defaultDecisions)
    expect(a.fingerprint).toBe(b.fingerprint)
    expect(runPipeline(generateLog({ seed: 7 }), { ...defaultDecisions, strategy: 'mean' }).fingerprint).not.toBe(a.fingerprint)
    expect(runPipeline(generateLog({ seed: 8 }), { ...defaultDecisions, seed: 8 }).fingerprint).not.toBe(a.fingerprint)
  })
  it('removes duplicates, sentinels and unit errors and leaves no missing input', () => {
    const out = runPipeline(generateLog({ seed: 7 }), defaultDecisions)
    const rows = [...out.train, ...out.validation]
    expect(rows.every(r => r.duration_s !== -1 && r.size_mb !== null && r.size_mb < 1000)).toBe(true)
    expect(new Set(rows.map(r => r.id)).size).toBe(rows.length)
    expect(Number.isFinite(out.result.validationMSE)).toBe(true)
  })
  it('learns the fill value from training rows unless leakage is chosen', () => {
    const raw = generateLog({ seed: 7 })
    const honest = runPipeline(raw, defaultDecisions).log.find(s => s.step.startsWith('Impute')).detail
    const leaky = runPipeline(raw, { ...defaultDecisions, fitOn: 'all' }).log.find(s => s.step.startsWith('Impute')).detail
    expect(honest).toMatch(/training rows only/); expect(leaky).toMatch(/leaked/)
  })
  it('applies NumPy broadcasting rules', () => {
    expect(broadcastShape([5, 1], [5])).toEqual([5, 5])
    expect(broadcastShape([100, 3], [3])).toEqual([100, 3])
    expect(broadcastShape([4, 3], [4])).toBeNull()
    expect(broadcastShape([4, 1], [3])).toEqual([4, 3])
    expect(fingerprint({ a: 1 })).toBe(fingerprint({ a: 1 }))
  })
})
