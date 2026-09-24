import { describe, it, expect } from 'vitest'
import { TRAIN, CALIB, TEST, truth, noiseSd, makeData, ensemble, trainQuantiles, scorers, conformalize, evaluate, coverageSpread, binnedCoverage, conformalQuantile, trainClassifier, classConformal, naiveSets, blobs } from './engine.js'
import { mean } from '../../kit/math.js'

describe('lab 60 uncertainty and conformal prediction', () => {
  const ens = ensemble(5), quant = trainQuantiles(TRAIN), S = scorers({ point: ens.members[0], quant })
  it('ensemble: aleatoric tracks noise; epistemic grows beyond the data', () => {
    const [far, near] = ens.predict([4.5, -1])
    expect(Math.abs(Math.sqrt(near.aleatoric) - noiseSd(-1))).toBeLessThan(0.1)
    expect(Math.sqrt(far.epistemic)).toBeGreaterThan(5 * Math.sqrt(near.epistemic))
    expect(Math.abs(far.mu - truth(4.5))).toBeGreaterThan(Math.sqrt(far.epistemic))
  })
  it('conformal quantile ranks', () => {
    expect(conformalQuantile(Array.from({ length: 99 }, (_, i) => i + 1), 0.1)).toBe(90)
    expect(conformalQuantile(Array.from({ length: 18 }, (_, i) => i), 0.05)).toBe(Infinity)
  })
  it('raw quantile regression under-covers; every conformal score reaches the target on average', () => {
    const P = quant.predict(TEST.map(r => r.x))
    expect(mean(TEST.map((r, i) => (r.y >= P[i][0] && r.y <= P[i][1] ? 1 : 0)))).toBeLessThan(0.88)
    for (const k of ['abs', 'norm', 'cqr']) {
      const m = mean(coverageSpread(S, k, 0.1, { reps: 200 }))
      expect(m).toBeGreaterThan(0.89); expect(m).toBeLessThan(0.92)
    }
  })
  it('constant width hides poor coverage at the edges and breaks under shift', () => {
    const c = conformalize(S, 'abs', CALIB, 0.1), bins = binnedCoverage(evaluate(S, 'abs', c.q, TEST))
    expect(Math.min(bins[0].coverage, bins[5].coverage)).toBeLessThan(0.85)
    expect(bins[3].coverage).toBeGreaterThan(0.97)
    const shifted = makeData(2000, 70, { shift: 2 }), cov = k => mean(evaluate(S, k, conformalize(S, k, CALIB, 0.1).q, shifted).map(e => (e.covered ? 1 : 0)))
    expect(cov('abs')).toBeLessThan(0.85)
    expect(cov('norm')).toBeGreaterThan(cov('abs') + 0.05)
  })
  it('prediction sets: calibrated coverage, naive sets miss, shift breaks the guarantee', () => {
    const clf = trainClassifier(), r = classConformal(clf, 0.1)
    expect(Math.abs(r.coverage - 0.9)).toBeLessThan(0.03)
    expect(r.avgSize).toBeGreaterThan(1)
    expect(Math.abs(naiveSets(clf, 0.1).coverage - 0.9)).toBeGreaterThan(0.04)
    expect(classConformal(clf, 0.1, { test: blobs(1500, 66, 1.1) }).coverage).toBeLessThan(0.82)
  })
})
