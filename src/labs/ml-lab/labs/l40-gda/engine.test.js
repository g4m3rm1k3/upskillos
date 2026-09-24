import { describe, it, expect } from 'vitest'
import { makeSet, fitGDA, ldaLinear, learningCurves, learningCurvesD } from './engine.js'

describe('lab 40 generative classifiers', () => {
  it('LDA log-odds is exactly linear', () => {
    const d = makeSet('shared', 200, 1), m = fitGDA(d, true), L = ldaLinear(m)
    d.slice(0, 20).forEach(p => expect(m.prob(p.x1, p.x2)).toBeCloseTo(1 / (1 + Math.exp(-(L.th[0] * p.x1 + L.th[1] * p.x2 + L.th0))), 10))
  })
  it('QDA wins with different covariances; logistic wins with a far subgroup', () => {
    const diff = learningCurves('different', { reps: 10 }), skew = learningCurves('skewed', { reps: 10 })
    expect(diff.curves.qda.at(-1)).toBeLessThan(diff.curves.lda.at(-1) - 0.1)
    expect(skew.curves.logistic.at(-1)).toBeLessThan(skew.curves.lda.at(-1) - 0.02)
  })
  it('naive Bayes learns fastest in 20 dimensions', () => {
    const r = learningCurvesD(20, { reps: 10 }), i = r.sizes.indexOf(40)
    expect(r.curves.naiveBayes[i]).toBeLessThan(r.curves.logistic[i])
    expect(r.curves.naiveBayes[i]).toBeLessThan(r.curves.lda[i])
  })
})
