// The JavaScript engine against the real Python programs (engine/parity.json, recorded by
// tools/make_parity.py). Compared to 1e-12 relative: Python's sum() adds floats with compensated
// summation and its math library can round the last binary digit of exp, log and pow differently.
import { describe, expect, it } from 'vitest'
import P from './parity.json'
import * as E from './maths.js'

function close(a, b, path = '', tol = 1e-12) {
  if (Array.isArray(b)) { expect(a.length, path).toBe(b.length); b.forEach((x, i) => close(a[i], x, `${path}[${i}]`, tol)); return }
  if (typeof b === 'number') { expect(Math.abs(a - b), `${path}: ${a} vs ${b}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b))); return }
  expect(a, path).toEqual(b)
}
const flips = [1, 1, 0, 1, 0, 1, 1, 0, 1, 1], A = [[2, 1], [1, 3]]

describe('the JavaScript engine reproduces the Python programs', () => {
  it('symbols', () => {
    const s = P.symbols, xs = [2, 4, 9]
    close([E.predict(2, 1, 3), E.total(xs), E.mean(xs), E.product(xs)], [s.predict, s.total, s.mean, s.product])
    close([1, 2, 12, 365, 1000].map(E.compound), s.compound, 'compound')
    close([-2, 0, 1, 2.5].map(x => E.expSeries(x)), s.exp, 'exp')
    close([-4, -1, 0, 0.5, 3].map(E.sigmoid), s.sigmoid, 'sigmoid')
    close(E.logsOfTiny(Array(30).fill(0.1)), s.tiny, 'tiny')
    expect(E.argmin(x => (x - 3) ** 2, [0, 1, 2, 3, 4, 5, 6])).toBe(s.argmin)
  })
  it('calculus', () => {
    const c = P.calculus
    close(E.shrinking(E.height, 1), c.shrinking, 'shrinking')
    // A numerical derivative divides by 2h = 2e-5, magnifying exp's last-digit rounding about 10⁵ times.
    close([-1, 0, 0.5, 2].map(z => E.derivative(E.sigmoid, z)), c.derivative, 'derivative', 1e-9)
    close([-1, 0, 0.5, 2].map(E.sigmoidSlope), c.slope, 'slope')
    close(E.descend(x => 2 * (x - 3), 0, 0.1, 10), c.descend, 'descend')
    close(E.descend2d(0, 0), c.descend2d, 'descend2d')
    close([E.area(x => x * x, 0, 1), E.area(x => x * x, 0, 1, 10)], c.area, 'area')
  })
  it('linear algebra', () => {
    const l = P.linalg
    close([E.norm([3, 4]), E.dot([1, 2, 3], [4, -5, 6]), E.cosine([1, 2], [2, 1])], [l.norm, l.dot, l.cosine])
    close(E.matmul([[1, 2], [3, 4]], [[0, 1], [1, 0]]), l.matmul, 'matmul')
    close(E.inverse2(A), l.inverse, 'inverse'); close(E.solve2(A, [3, 5]), l.solve, 'solve')
    close(E.leastSquares([0, 1, 2], [1, 3, 4]), l.lsq, 'lsq'); close(E.eigen2(A), l.eigen, 'eigen'); close(E.eigenvector2(A, E.eigen2(A)[0]), l.eigvec, 'eigvec')
  })
  it('statistics', () => {
    const s = P.stats, dist = E.distribution(E.twoDice())
    close(E.probability(t => t === 7, E.twoDice()), s.p7)
    close([...dist.entries()], s.dist, 'dist')
    close([E.expectation(dist), E.variance(dist), E.bayes(0.01, 0.9, 0.05)], [s.E, s.Var, s.bayes])
    close([-1, 0, 1, 3].map(x => E.normalPdf(x, 1, 2)), s.pdf, 'pdf')
    close(E.sampleMeans(10, 50, 3), s.means, 'means')
    close([0.3, 0.5, 0.7].map(p => E.likelihood(p, flips)), s.L, 'L'); close([0.3, 0.5, 0.7].map(p => E.logLikelihood(p, flips)), s.logL, 'logL')
    close([E.covariance([1, 2, 3, 4, 5], [2, 3, 5, 4, 6]), E.correlation([1, 2, 3, 4, 5], [2, 3, 5, 4, 6])], [s.cov, s.rho])
    close(E.pca2([1, 2, 3, 4, 5], [2, 3, 5, 4, 6]), s.pca, 'pca')
  })
  it('the big equations', () => {
    const m = P.models
    close([E.mse(4, 48, E.HOURS, E.SCORES), ...E.mseGradient(0, 0, E.HOURS, E.SCORES)], [m.mse, ...m.grad])
    close(E.fitLine(E.HOURS, E.SCORES), m.fit, 'fit'); close(E.exactLine(E.HOURS, E.SCORES), m.exact, 'exact')
    close([0, 1, 10].map(l => E.ridgeLine(E.HOURS, E.SCORES, l)), m.ridge, 'ridge')
    close([E.bce(0.8, 1), E.bce(0.8, 0)], m.bce); close(E.fitLogistic(E.STUDY, E.PASSED), m.logistic, 'logistic')
    close(E.softmax([2, 1, 0]), m.softmax); close([E.crossEntropy(E.softmax([2, 1, 0]), 1), E.entropy([0.5, 0.25, 0.25]), E.kl([0.7, 0.3], [0.5, 0.5])], [m.ce, m.entropy, m.kl])
    close(E.backprop([[[0.5, -0.3], [0.2, 0.8]], [0.1, -0.1], [1, -1], 0.2], [1, 2], 1), m.backprop, 'backprop')
    close(E.adam(E.bowlGradient, 0, 0, 0.1, 50), m.adam, 'adam')
    close(E.attention([[1, 0], [1, 1]], [[1, 0], [0, 1], [1, 1]], [[10, 0], [0, 10], [5, 5]]), m.attention, 'attention')
  })
})
