import { describe, it, expect } from 'vitest'
import { TRAIN, TEST, f, mse, permutationImportance, gainImportance, dropColumn, iceCurves, shapley, BACKGROUND, lime, counterfactual } from './engine.js'
import { mean } from '../../kit/math.js'

describe('lab 59 interpretability', () => {
  it('importance: noise matters only on training data; gain importance flatters it; duplicates hide redundancy', { timeout: 60000 }, () => {
    const tr = permutationImportance(TRAIN), te = permutationImportance(TEST)
    expect(tr[5].rise).toBeGreaterThan(0.5)
    expect(Math.abs(te[5].rise)).toBeLessThan(0.2)
    expect(te[0].rise).toBeGreaterThan(100)
    const gain = gainImportance()
    expect(gain[5]).toBeGreaterThan(0.5 * gain[4])
    const noSize = dropColumn(0)
    expect(noSize.testMse).toBeLessThan(mse(TEST) + 5)
    expect(permutationImportance(TEST, { g: noSize.g })[1].rise).toBeGreaterThan(30)
  })
  it('centred ICE curves fan out by cache status', () => {
    const rows = TEST.slice(0, 40), c = iceCurves(0, rows, [0, 100])
    const rise = hit => mean(rows.map((r, i) => [r, c[i][1] - c[i][0]]).filter(([r]) => r.x[3] === hit).map(([, d]) => d))
    expect(rise(0)).toBeGreaterThan(1.5 * rise(1))
  })
  it('Shapley values are efficient and show the cache–size interaction', () => {
    const s = shapley(TEST[3].x, BACKGROUND)
    expect(s.base + s.phi.reduce((a, b) => a + b, 0)).toBeCloseTo(f(TEST[3].x), 8)
    const hits = TEST.slice(0, 40).filter(r => r.x[3] === 1), small = hits.filter(r => r.x[0] < 25), big = hits.filter(r => r.x[0] > 60)
    expect(mean(big.map(r => shapley(r.x, BACKGROUND).phi[3]))).toBeLessThan(mean(small.map(r => shapley(r.x, BACKGROUND).phi[3])))
  })
  it('narrow LIME kernels give less stable explanations', () => {
    const spread = w => { const c = [1, 2, 3, 4, 5].map(seed => lime(TEST[3].x, { width: w, seed }).coef[0].perSd); return Math.max(...c) - Math.min(...c) }
    expect(spread(0.25)).toBeGreaterThan(spread(1.5))
    expect(lime(TEST[3].x, { width: 0.25 }).effectiveN).toBeLessThan(lime(TEST[3].x, { width: 1.5 }).effectiveN)
  })
  it('counterfactuals: flipping the cache beats shrinking the change; size-only is less plausible', () => {
    const x = TEST[32].x, t = f(x) - 12
    const act = counterfactual(x, t), size = counterfactual(x, t, { allowed: [0] })
    expect(act.pred).toBeLessThanOrEqual(t + 1e-9)
    expect(act.changes.map(c => c.feature)).toEqual([3])
    expect(size.dist).toBeGreaterThan(act.dist)
  })
})
