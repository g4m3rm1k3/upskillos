import { describe, it, expect } from 'vitest'
import { simulate, confusion, metrics, curves, costCurve, reliability, plattFit } from './engine.js'

describe('lab 09 metrics', () => {
  it('AUC equals the pairwise ranking probability and ignores prevalence', () => {
    const rows = [{ y: 1, p: 0.9 }, { y: 1, p: 0.4 }, { y: 0, p: 0.6 }, { y: 0, p: 0.2 }]
    expect(curves(rows).auc).toBeCloseTo(0.75, 12)
    const a = curves(simulate({ prevalence: 0.5, seed: 2 })).auc, b = curves(simulate({ prevalence: 0.02, n: 6000, seed: 2 })).auc
    expect(Math.abs(a - b)).toBeLessThan(0.03)
  })
  it('calibrated scores put the cost minimum near C_FP/(C_FP+C_FN)', () => {
    const rows = simulate({ n: 20000, prevalence: 0.1, seed: 3 })
    const cost = costCurve(rows, 1, 9), best = cost.reduce((b, p) => p[1] < b[1] ? p : b)
    expect(Math.abs(best[0] - 0.1)).toBeLessThan(0.05)
    expect(reliability(rows).ece).toBeLessThan(0.02)
  })
  it('Platt scaling repairs distorted probabilities without changing AUC', () => {
    const bad = simulate({ n: 5000, distortion: 2.5, shift: 0.8, seed: 4 })
    const fit = plattFit(simulate({ n: 5000, distortion: 2.5, shift: 0.8, seed: 5 }))
    const fixed = bad.map(r => ({ ...r, p: fit.apply(r.p) }))
    expect(reliability(fixed).ece).toBeLessThan(reliability(bad).ece / 2)
    expect(curves(fixed).auc).toBeCloseTo(curves(bad).auc, 6)
    const m = metrics(confusion(bad, 0.5)); expect(m.precision).toBeGreaterThan(0)
  })
})
