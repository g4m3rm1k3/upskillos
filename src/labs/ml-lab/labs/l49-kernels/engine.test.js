import { describe, it, expect } from 'vitest'
import { regData, krr, explicitPolyRidge, gram, eigenvalues, circles, kernelPCA, thresholdAccuracy } from './engine.js'

describe('lab 49 kernel methods', () => {
  it('kernel ridge equals explicit-feature ridge for the polynomial kernel', () => {
    const d = regData(), a = krr(d, 'poly', { degree: 5 }, 0.1), b = explicitPolyRidge(d, 5, 0.1)
    for (const x of [-1.7, -0.2, 0.9, 1.8]) expect(a.predict(x)).toBeCloseTo(b.predict(x), 6)
  })
  it('valid kernels are PSD; tanh is not', () => {
    const X = regData(12, 7).map(p => p.x)
    for (const k of ['linear', 'poly', 'rbf', 'laplace']) expect(Math.min(...eigenvalues(gram(X, k, { degree: 3, gamma: 1 })))).toBeGreaterThan(-1e-8)
    expect(Math.min(...eigenvalues(gram(X, 'tanh', {})))).toBeLessThan(-0.1)
  })
  it('RBF kernel PCA separates the rings; linear PCA does not', () => {
    const c = circles(), lab = c.map(p => p.ring), acc = r => Math.max(...[0, 1].map(k => thresholdAccuracy(r.proj.map(p => p[k]), lab)))
    expect(acc(kernelPCA(c, 'rbf', { gamma: 2 }))).toBeGreaterThan(0.97)
    expect(acc(kernelPCA(c, 'linear', {}))).toBeLessThan(0.8)
  })
})
