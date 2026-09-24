import { describe, it, expect } from 'vitest'
import { kkt, svmData, smo, lassoProblem, ista, subgradient } from './engine.js'

describe('lab 48 convex optimization', () => {
  it('KKT solution and shadow price', () => {
    const s = kkt([2, 1], 1); expect(s.x).toEqual([1, 0]); expect(s.lambda).toBe(2)
    expect((kkt([2, 1], 1.001).fStar - s.fStar) / 0.001).toBeCloseTo(-2, 2)
    expect(kkt([0, 0], 1).lambda).toBe(0)
  })
  it('SMO: weak duality, Σαy = 0, fewer support vectors as C grows', () => {
    const d = svmData(), lo = smo(d, 0.05), hi = smo(d, 5)
    for (const m of [lo, hi]) { expect(m.primal).toBeGreaterThanOrEqual(m.dual - 1e-9); expect(Math.abs(m.alpha.reduce((s, a, i) => s + a * d[i].y, 0))).toBeLessThan(1e-9) }
    expect(hi.alpha.filter(a => a > 1e-6).length).toBeLessThan(lo.alpha.filter(a => a > 1e-6).length)
  })
  it('proximal gradient beats subgradient and gives exact zeros', () => {
    const P = lassoProblem(), a = ista(P, 0.1, 200), s = subgradient(P, 0.1, 200), f = Math.min(...a.hist)
    expect(a.hist[150] - f).toBeLessThan(1e-9); expect(s.hist[200] - f).toBeGreaterThan(1e-4)
    expect(a.w.filter(v => v === 0).length).toBeGreaterThan(15)
  })
})
