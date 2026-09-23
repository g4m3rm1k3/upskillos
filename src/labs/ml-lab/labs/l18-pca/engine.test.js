import { describe, it, expect } from 'vitest'
import { cloud, pca, reconstructionError, projectedVariance, digits } from './engine.js'

describe('lab 18 PCA', () => {
  it('PC1 follows the cloud and error with k = 1 equals λ2', () => {
    const X = cloud({ angle: 30, ratio: 6, n: 400 }), m = pca(X)
    const deg = ((Math.atan2(m.components[0][1], m.components[0][0]) * 180 / Math.PI) + 180) % 180
    expect(Math.abs(deg - 30)).toBeLessThan(6)
    expect(reconstructionError(X, m, 1)).toBeCloseTo(m.variances[1], 8)
    expect(projectedVariance(X, deg)).toBeCloseTo(m.variances[0], 3)
  })
  it('digit images compress: a few components explain most variance', () => {
    const imgs = digits().map(d => d.pixels), m = pca(imgs)
    expect(m.ratio.slice(0, 10).reduce((a, b) => a + b)).toBeGreaterThan(0.6)
    expect(reconstructionError(imgs, m, 20)).toBeLessThan(reconstructionError(imgs, m, 5))
  })
})
