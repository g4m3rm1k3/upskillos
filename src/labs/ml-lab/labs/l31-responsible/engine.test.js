import { describe, it, expect } from 'vitest'
import { simulate, fitScorer, groupMetrics, deferral, modelCard } from './engine.js'

describe('lab 31 responsible evaluation', () => {
  const rows = simulate(), score = fitScorer(rows), m = groupMetrics(rows, score, 0.5)
  it('noisier group data lowers recall and precision', () => {
    expect(m.A.tpr).toBeGreaterThan(m.B.tpr + 0.1); expect(m.B.fpr).toBeGreaterThan(m.A.fpr)
    expect(Math.abs(m.all.meanScore - m.all.base)).toBeLessThan(0.02)
  })
  it('deferral trades coverage for accuracy; card renders groups', () => {
    const a = deferral(rows, score, 0), b = deferral(rows, score, 0.3)
    expect(b.coverage).toBeLessThan(a.coverage); expect(b.autoAccuracy).toBeGreaterThan(a.autoAccuracy)
    expect(modelCard({ name: 'x', threshold: 0.5 }, m)).toContain('| B |')
  })
})
