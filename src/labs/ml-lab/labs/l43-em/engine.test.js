import { describe, it, expect } from 'vitest'
import { sampleWorld, runEM, kmeans, agreement, hardLabels, bicCurve } from './engine.js'

describe('lab 43 mixtures and EM', () => {
  it('EM is monotone; restarts matter on parallel clusters where k-means fails', () => {
    const d = sampleWorld('stretched'), X = d.map(p => p.x), truth = d.map(p => p.z)
    const exact = [1, 2, 3, 4, 5].map(s => runEM(X, 2, { seed: s, floor: 0 }))
    exact.forEach(h => h.forEach((s, i) => { if (i) expect(s.ll).toBeGreaterThanOrEqual(h[i - 1].ll - 1e-8) }))
    const runs = [1, 2, 3, 4, 5].map(s => runEM(X, 2, { seed: s, floor: 1e-3 }))
    const best = runs.map(h => h.at(-1)).reduce((b, s) => s.ll > b.ll ? s : b)
    expect(agreement(hardLabels(best.R), truth, 2)).toBeGreaterThan(0.95)
    expect(Math.max(...[1, 2, 3, 4, 5].map(s => agreement(kmeans(X, 2, s).labels, truth, 2)))).toBeLessThan(0.7)
  })
  it('BIC recovers the true number of components', () => {
    for (const [w, K] of [['three', 3], ['stretched', 2], ['unequal', 2]]) {
      const rows = bicCurve(sampleWorld(w).map(p => p.x))
      expect(rows.reduce((b, r) => r.bic < b.bic ? r : b).K).toBe(K)
    }
  })
})
