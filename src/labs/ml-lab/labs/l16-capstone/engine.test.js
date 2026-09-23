import { describe, it, expect } from 'vitest'
import { generateJobs, devTest, crossValidate, finalTest, defaultFeatures } from './engine.js'

describe('lab 16 capstone', () => {
  const { dev, test } = devTest(generateJobs())
  it('feature engineering transforms the linear model', () => {
    const raw = crossValidate(dev, defaultFeatures, 'linear').mean
    const eng = crossValidate(dev, { logSize: true, interactions: true, busy: true, oneHot: true }, 'linear').mean
    expect(eng).toBeLessThan(0.6 * raw)
    expect(crossValidate(dev, defaultFeatures, 'baseline').mean).toBeGreaterThan(2 * raw * 0.9)
  })
  it('final test reports an interval around the improvement', () => {
    const r = finalTest(dev, test, { logSize: true, interactions: true, busy: true, oneHot: true }, 'linear')
    expect(r.improvement).toBeGreaterThan(20); expect(r.ci[0]).toBeLessThan(r.improvement); expect(r.ci[1]).toBeGreaterThan(r.improvement)
  })
})
