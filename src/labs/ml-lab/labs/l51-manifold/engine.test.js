import { describe, it, expect } from 'vitest'
import { makeSignals, whiten, fastICA, recovery, swissRoll, geodesic, classicalMDS, pca2, rankCorr, tsneData, tsne, centroid, spread } from './engine.js'

describe('lab 51 nonlinear dimensionality reduction', () => {
  it('ICA recovers non-Gaussian sources where PCA cannot', () => {
    const d = makeSignals('signals'), w = whiten(d.X)
    expect(recovery(fastICA(w.Z).Y, d.S)).toBeGreaterThan(0.99); expect(recovery(w.Z, d.S)).toBeLessThan(0.8)
  })
  it('Isomap unrolls the swiss roll at small k; short circuits break it', () => {
    const R = swissRoll(), X = R.map(p => p.x), t = R.map(p => p.t)
    expect(Math.abs(rankCorr(classicalMDS(geodesic(X, 8)).map(p => p[0]), t))).toBeGreaterThan(0.98)
    expect(Math.abs(rankCorr(pca2(X).map(p => p[0]), t))).toBeLessThan(0.5)
    expect(Math.abs(rankCorr(classicalMDS(geodesic(X, 20)).map(p => p[0]), t))).toBeLessThan(0.5)
  })
  it('low-perplexity t-SNE equalizes cluster sizes', () => {
    const T = tsneData(), Y = tsne(T.map(p => p.x), { perplexity: 5, iters: 300 }), g = [0, 1].map(c => Y.filter((_, i) => T[i].c === c))
    expect(spread(g[1]) / spread(g[0])).toBeLessThan(2)
  })
})
