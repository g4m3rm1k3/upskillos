import { describe, it, expect } from 'vitest'
import { trainDigits, accuracyUnder, inputGrad, DTEST, covariateExperiment, labelExperiment, adaptExperiment } from './engine.js'

describe('lab 61 robustness and shift', () => {
  it('targeted attacks beat random noise; PGD beats FGSM; adversarial training helps', { timeout: 60000 }, () => {
    const std = trainDigits(), robust = trainDigits({ advEps: 0.15, attack: 'pgd' })
    expect(accuracyUnder(std, 'fgsm', 0)).toBeGreaterThan(0.85)
    expect(accuracyUnder(std, 'random', 0.1)).toBeGreaterThan(0.85)
    expect(accuracyUnder(std, 'fgsm', 0.1)).toBeLessThan(0.4)
    expect(accuracyUnder(std, 'pgd', 0.1)).toBeLessThanOrEqual(accuracyUnder(std, 'fgsm', 0.1))
    expect(accuracyUnder(robust, 'pgd', 0.15)).toBeGreaterThan(accuracyUnder(std, 'pgd', 0.15) + 0.25)
    const l1 = net => DTEST.slice(0, 50).reduce((t, r) => t + inputGrad(net, [r.x], [r.d])[0].reduce((a, b) => a + Math.abs(b), 0), 0)
    expect(l1(robust)).toBeLessThan(0.5 * l1(std))
  })
  it('importance weighting fixes covariate shift; weights shrink the effective sample', () => {
    const r = covariateExperiment({ testMean: 1.5 })
    expect(r.testMse.trueW).toBeLessThan(0.3 * r.testMse.plain)
    expect(r.testMse.estW).toBeLessThan(0.3 * r.testMse.plain)
    expect(r.ess.estW).toBeLessThan(60)
    expect(r.auc).toBeGreaterThan(0.85)
  })
  it('BBSE recovers the new prior and the correction helps', () => {
    const r = labelExperiment(0.1)
    expect(Math.abs(r.est.pi1 - 0.1)).toBeLessThan(0.05)
    expect(r.estimated.acc).toBeGreaterThan(r.none.acc + 0.03)
    expect(r.estimated.logLoss).toBeLessThan(0.7 * r.none.logLoss)
  })
  it('CORAL fixes stretch and offset but not large rotations', () => {
    const a = adaptExperiment({ angle: 0 }), b = adaptExperiment({ angle: 1.4 })
    expect(a.acc.coral).toBeGreaterThan(a.acc.sourceOnly + 0.08)
    expect(a.acc.coral).toBeGreaterThan(a.acc.oracle - 0.02)
    expect(b.acc.coral).toBeLessThan(b.acc.oracle - 0.2)
  })
})
