// The JavaScript engine against the real Python programs (engine/parity.json, recorded by
// tools/make_parity.py). Compared to 1e-12 relative: Python's sum() adds floats with compensated
// summation and its math library can round the last binary digit of exp, log and pow differently.
import { describe, expect, it } from 'vitest'
import P from './parity.json'
import * as E from './maths.js'
import { PyRandom } from '../../qmaze-lab/engine/mt.js'

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
    const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i)
    expect(E.members(range(1, 31), x => x % 2 === 0 && x % 3 === 0)).toEqual(s.members)
    expect(['[]', '[)', '(]', '()'].flatMap(br => [-2, 0, 3, 3.5].map(x => E.inInterval(x, -2, 3, br)))).toEqual(s.interval)
    expect([true, false].flatMap(p => [true, false].map(q => E.implies(p, q)))).toEqual(s.implies)
    expect([E.forAll([2, 4, 6], x => x % 2 === 0), E.forAll([2, 5, 6], x => x % 2 === 0)]).toEqual(s.forall)
    expect([E.exists([1, 3, 4], x => x % 2 === 0), E.exists([1, 3, 5], x => x % 2 === 0)]).toEqual(s.exists)
    close([-2.5, 0, 0.5, 3].map(E.relu), s.relu, 'relu'); close([0.5, 0.8, 1, 1.37].map(r => E.clip(r, 0.8, 1.2)), s.clip, 'clip')
    close(E.accuracy([1, 0, 1, 1, 0], [1, 1, 1, 0, 0]), s.accuracy, 'accuracy'); close(E.sumBounds([0.2, 0.9, 0.4, 0.7]), s.bounds, 'bounds')
  })
  it('proof and counting', () => {
    const p = P.proof
    expect(E.firstCounterexample(n => E.isPrime(n * n + n + 41), Array.from({ length: 100 }, (_, i) => i))).toBe(p.counter)
    expect([2, 9, 91, 97, 30031].map(E.smallestFactor)).toEqual(p.factor)
    expect(E.euclidStep([2, 3, 5, 7, 11, 13])).toEqual(p.euclid)
    expect([0, 1, 10, 100].map(n => [E.sumTo(n), E.gauss(n)])).toEqual(p.sums)
    close([[0.9, 10], [0.5, 20], [2, 8]].map(([r, n]) => E.geometric(r, n)), p.geometric, 'geometric')
    expect([0, 1, 5, 10, 15].map(E.factorial)).toEqual(p.factorial)
    expect([0, 1, 2, 3, 4].map(k => E.arrangements(10, k))).toEqual(p.arrangements)
    expect(Array.from({ length: 13 }, (_, i) => E.choose(10, i - 1))).toEqual(p.choose)
    expect(E.pascal(8)).toEqual(p.pascal)
    close([0, 1, 2, 3, 4, 5].map(k => E.binomialPmf(k, 5, 0.3)), p.pmf, 'pmf')
    close([1, 10, 23, 50].map(k => E.collisionChance(k, 365)), p.collision, 'collision')
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
  it('calculus additions, many variables, areas', () => {
    const c = P.calc2, m = P.many, a = P.areas
    expect([0.5, 0.01].map(e => E.deltaFor(x => 3 * x + 1, 2, 7, e))).toEqual(c.delta)
    close([-2, 0, 0.5].map(z => [E.tanh(z), E.tanhSlope(z)]), c.tanh, 'tanh'); close([0.2, 0.5, 0.8].map(p => [E.logit(p), E.logitSlope(p)]), c.logit, 'logit')
    // Second differences divide by h² = 1e-8, magnifying rounding 10⁸ times.
    close(E.secondDerivative(x => x ** 3, 2), c.second, 'second', 1e-6)
    close([E.integratePoly([3, 2, 5]), E.definitePoly([0, 0, 1], 0, 1), E.evalPoly([1, -4, 0, 2], 1.5)], c.poly, 'poly')
    close([0, 1, 2].map(k => E.normalMoment(k)), c.moments, 'moments', 1e-10); close(E.taylor([1, 1, 1, 1], 0, 0.5), c.taylor, 'taylor')
    close([[1, 10], [-2, 6]].map(([x, n]) => E.taylorExp(x, n)), c.texp, 'texp')
    close(E.totalDerivative(p => [2 * p[0], 2 * p[1]], t => [t * t, 3 * t], t => [2 * t, 3], 1.5), m.total, 'total')
    close(E.jacobian(v => [v[0] * v[1], v[0] + v[1] ** 2], [1, 2]), m.jac, 'jac', 1e-7); close(E.softmaxJacobian([0.5, 0.3, 0.2]), m.smj, 'smj')
    close(E.hessian(v => v[0] ** 2 * v[1] + v[1] ** 3, [1, 2]), m.hess, 'hess', 1e-5)
    close(E.doubleIntegral((x, y) => x * y + 1, 0, 1, 0, 2, 50), a.double, 'double'); close(E.ringSum(r => Math.exp(-r * r / 2), 10), a.ring, 'ring', 1e-10)
  })
  it('more linear algebra', () => {
    const m = P.matrices, A3 = [[2, 1, -1], [-3, -1, 2], [-2, 1, 2]]
    close(E.solve(A3, [8, -11, -3]), m.solve, 'solve'); close(E.coordinates([[1, 1], [1, -1]], [5, 1]), m.coords, 'coords')
    expect([1, 2, 3, 10].map(E.eliminationCost)).toEqual(m.cost)
    expect([[[1, 2], [2, 4]], [[1, 2, 3], [4, 5, 6], [7, 8, 9]], [[1, 0], [0, 1], [1, 1]]].map(E.rank)).toEqual(m.rank)
    close([[[2, 1], [1, 3]], [[0, 1], [1, 0]], A3].map(E.determinant), m.det, 'det')
    close(E.gramSchmidt([[1, 1, 0], [1, 0, 1], [0, 1, 1]]), m.gs, 'gs'); close(E.reflection([0.6, 0.8]), m.refl, 'refl')
    close(E.symmetricEigen([[4, 1, 0], [1, 3, 1], [0, 1, 2]]), m.eigen, 'eigen', 1e-10); close(E.cholesky([[4, 2], [2, 3]]), m.chol, 'chol')
    close(E.svd([[3, 0], [4, 5]]), m.svd, 'svd', 1e-10); close(E.lowRank([[1, 2, 3], [2, 4.1, 6], [1, 1, 1]], 1), m.low, 'low', 1e-10)
    close([E.trace([[1, 2], [3, 4]]), E.frobenius([[1, 2], [3, 4]])], [m.trace, m.fro]); close(E.quadraticGradient([[1, 2], [0, 3]], [1, -1]), m.qgrad, 'qgrad')
    expect(E.shape(Array(4).fill([[1, 2, 3], [4, 5, 6]]))).toEqual(m.shape); close(E.addBias([[1, 2], [3, 4]], [10, 20]), m.bias, 'bias')
  })
  it('probability additions', () => {
    const c = P.chance, dice = []; for (let x = 1; x < 7; x++) for (let y = 1; y < 7; y++) dice.push([x, y])
    close(E.inclusionExclusion([o => o[0] === 6, o => o[1] === 6, o => o[0] + o[1] === 7], dice), c.ie, 'ie')
    expect([E.independent(o => o[0] % 2 === 0, o => o[0] + o[1] === 7, dice), E.independent(o => o[0] === 6, o => o[0] + o[1] === 12, dice)]).toEqual(c.indep)
    close([0, 1, 2, 3, 4, 5].map(k => E.poissonPmf(k, 3)), c.poisson, 'poisson'); close([-1, 0, 0.5, 2].map(x => E.exponentialPdf(x, 2)), c.exppdf, 'exppdf')
    const r4 = new PyRandom(4); close(Array.from({ length: 5 }, () => E.sampleExponential(2, r4)), c.expsamples, 'expsamples')
    const r5 = new PyRandom(5); expect(Array.from({ length: 12 }, () => E.sampleCategorical([0.2, 0.5, 0.3], r5))).toEqual(c.cat)
    const joint = new Map([[[0, 0], 0.1], [[0, 1], 0.3], [[1, 0], 0.2], [[1, 1], 0.4]])
    close([...E.marginal(joint, 0)].sort((a, b) => a[0] - b[0]), c.marg, 'marg'); close([...E.conditionalGivenY(joint, 1)].sort((a, b) => a[0] - b[0]), c.cond, 'cond')
    close(E.variancePop([1, 2, 4, 7]), c.var, 'var'); close(E.chebyshevBound(1.5, 100, 0.25), c.cheb, 'cheb'); close(E.runningMeans(20, 3), c.running, 'running'); close(E.standardizedSums(12, 10, 2), c.sums, 'sums')
    close([E.mvnPdf([0.5, -0.2], [0, 0], [[2, 0.6], [0.6, 1]]), E.mvnPdf([1, 1], [1, 0], [[1, 0], [0, 1]])], c.mvn, 'mvn')
    close(E.transformedDensity(x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI), Math.log, y => 1 / y, 2), c.trans, 'trans')
    close(E.monteCarlo(x => x * x, r => r.random(), 1000, 6), c.mc, 'mc'); close(E.importance(x => x, x => (x >= 0 && x <= 1 ? 2 * x : 0), () => 1, r => r.random(), 1000, 7), c.imp, 'imp')
    close(E.jensenGap(x => x * x, [1, 2, 6]), c.jensen, 'jensen'); close([E.entropyBits([0.5, 0.5]), E.entropyBits([0.7, 0.2, 0.1])], c.H, 'H')
    close(E.mutualInformation(new Map([[[0, 0], 0.4], [[0, 1], 0.1], [[1, 0], 0.1], [[1, 1], 0.4]])), c.mi, 'mi'); close(E.stationary([[0.9, 0.1], [0.5, 0.5]]), c.stat, 'stat')
    close(E.bootstrapInterval([3, 7, 1, 9, 4, 6, 2, 8], E.mean, 400, 1), c.boot, 'boot'); close(E.permutationPValue([1, 2, 3, 4], [3, 4, 5, 6, 7], 400, 2), c.perm, 'perm')
    close(E.betaBinomial(1, 1, 7, 3), c.beta, 'beta')
  })
  it('optimisation', () => {
    const o = P.optimise
    expect([E.isConvexOn(x => x * x, -3, 3), E.isConvexOn(Math.sin, -3, 3), E.isConvexOn(Math.abs, -2, 2)]).toEqual(o.convex)
    close([0.25, 0.5, 0.9].map(eta => E.descentStep(x => x * x, x => 2 * x, 3, eta, 2)), o.descent, 'descent')
    close(E.newton(x => 4 * (x - 2) ** 3 + 2 * x, x => 12 * (x - 2) ** 2 + 2, 0, 6), o.newton, 'newton')
    close(E.fullGradient(1, [1, 2, 3], [2, 4.1, 5.9]), o.fullgrad, 'fullgrad'); close(E.sgd([1, 2, 3, 4, 5], [2.1, 3.9, 6.2, 7.8, 10.1], 0.01, 2, 3, 1), o.sgd, 'sgd')
    close(E.momentum(x => 2 * (x - 3), 0, 0.05, 0.9, 20), o.mom, 'mom'); close([0, 5, 10, 55, 100].map(t => E.cosineSchedule(t, 100, 0.1, 0.001, 10)), o.sched, 'sched')
    close(E.bestOnCircle(p => (p[0] - 2) ** 2 + (p[1] - 1) ** 2, 360), o.circle, 'circle'); close([0.5, 3].map(c => E.kktBounded(c, 1)), o.kkt, 'kkt')
    close(E.projectedGd(x => 2 * (x - 3), x => Math.min(x, 1), 0, 0.2, 10), o.pgd, 'pgd'); close([0, 1, 2, 3].map(E.dualValue), o.dual, 'dual')
  })
  it('algorithms', () => {
    const a = P.algorithms
    close(E.growth(20), a.growth, 'growth')
    expect([E.boundedBy(n => 3 * n * n + 10 * n, n => n * n, 4, 10, 500), E.boundedBy(n => n * n, n => 100 * n, 1, 1, 500)]).toEqual(a.bounded)
    expect([E.matmulCost(3, 4, 5), E.attentionCost(6, 4)]).toEqual([a.matmul, a.attention]); expect(E.mergeSort([5, 2, 9, 1, 5, 6, 3, 8])).toEqual(a.merge)
    expect([0, 37, 99, 150].map(t => E.binarySearch(Array.from({ length: 100 }, (_, i) => i), t))).toEqual(a.search); expect(E.machineEpsilon()).toBe(a.eps)
    close([6, 0.1, 1024, -3.5].map(E.floatParts), a.frexp, 'frexp'); close([E.logsumexp([1, 2, 3]), E.logsumexp([1000, 1001]), E.naiveLogsumexp([1, 2, 3])], a.lse, 'lse')
    close(E.onePassVariance([1, 2, 4, 7]), a.onepass, 'onepass'); close(E.lcg(1, 5), a.lcg, 'lcg')
    expect([E.editDistance('kitten', 'sitting'), E.editDistance('', 'abc'), E.editDistance('flaw', 'lawn')]).toEqual(a.edit)
    expect(E.viterbi([0, 1, 1, 0], [0.6, 0.4], [[0.7, 0.3], [0.4, 0.6]], [[0.9, 0.1], [0.2, 0.8]])).toEqual(a.viterbi)
    expect(E.walks([[0, 1, 1], [1, 0, 0], [1, 1, 0]], 3)).toEqual(a.walks); close(E.pagerank([[0, 1, 1], [1, 0, 0], [1, 1, 0]]), a.pagerank, 'pagerank')
    close(E.gnnLayer([[0, 1, 0], [1, 0, 1], [0, 1, 0]], [[1, 0], [3, 2], [0, 4]]), a.gnn, 'gnn')
    expect(['cat', 'dog', 'transformer'].map(w => E.polyHash(w, 97))).toEqual(a.hash); expect(E.hashingTrick(['a', 'b', 'a', 'cat'], 5)).toEqual(a.trick)
    const x = new E.Value(2); const y = x.mul(x).add(x.exp()); y.backward(); close(x.grad, 4 + Math.exp(2), 'autodiff')
    close(new E.Dual(2, 1).mul(new E.Dual(2, 1)).slope, 4, 'dual')
  })
  it('learning theory', () => {
    const t = P.theory
    close([1, 3, 9].map(d => E.trainAndTest(d, 20, 60).slice(0, 2)), t.tt, 'train and test', 1e-9)
    close(E.kFoldError(...E.makeData(30, 0.2, new PyRandom(1)), 3, 5), t.kfold, 'k-fold')
    close([E.chebyshevTail(200, 0.1), E.hoeffdingTail(200, 0.1), E.simulatedTail(60, 0.1, 0.5, 300, 2)], t.tails, 'tails')
    close([E.samplesNeeded(0.05, 0.05), E.finiteClassGap(1000, 500, 0.05)], [t.need, t.gap], 'sizes')
    close(E.ermThresholds(40, 11, 30, 3), t.erm, 'erm')
    close([E.thresholdPatterns([3, 1, 2, 5]).size, E.intervalPatterns([3, 1, 2, 5]).size, E.halfplanePatterns([[0, 0], [1, 0], [1, 1], [0, 1]], 72).size, E.halfplanePatterns([[0, 0], [2, 0], [1, 2], [1, 0.5]], 72).size], t.patterns, 'patterns')
    close([[4, 3], [10, 2], [50, 5]].map(([n, d]) => E.sauerBound(n, d)), t.sauer, 'sauer')
    close(E.fitFirstP([[1, 2, 0.5], [0.3, -1, 2]], [1, -1], 3), t.fit, 'min-norm fit')
    close(E.fitFirstP([[1, 2], [0.3, -1], [2, 0.5]], [1, -1, 0.5], 1), t.fit2, 'least-squares fit')
    close(E.doubleDescent(12, 5, 0.2, 3, 4), t.dd, 'double descent', 1e-9)
    close(E.gdLeastSquares([[1, 2, 0.5], [0.3, -1, 2]], [1, -1], 0.1, 200), t.gd, 'gradient descent')
  })
  it('paper walkthroughs', () => {
    const p = P.papers, DX = [[1, 2], [2, 0.5], [3, 3]], DY = [5, 3, 9], PR = [0, 0, 1, 0, 0, 2], PV = [0.5, 0.6, 0.9, 0.4, 0.7, 1.5, 0.8], B50 = E.linearBetas(50, 1e-3, 0.05)
    close([E.dropoutLossSampled(DX, DY, [1, 1.5], 0.8, 300, 3), E.dropoutLossMarginal(DX, DY, [1, 1.5], 0.8)], p.drop, 'dropout'); close(E.dropoutRidge(DX, DY, 0.6), p.ridge, 'ridge', 1e-10)
    close([E.negativeSampling(1.2, [-0.5, 0.3, -2]), E.discardProbability(0.02), E.discardProbability(1e-6), E.pairObjective(0.7, 50, 10), E.bestPairScore(50, 1000, 2000, 1e6, 5)], p.w2v, 'word2vec')
    close(E.noiseDistribution([100, 10, 1]), p.noise, 'noise'); close(E.positivePosterior([2, 0.5, 0.5, 1]), p.post, 'posterior')
    close([E.toyElbo(1, 0.3, 0.9), E.estimatorA(1, 0.3, 0.9, -0.4), E.estimatorB(1, 0.3, 0.9, -0.4)], p.vae, 'vae')
    close([E.estimatorSpread(E.estimatorA, 1, 0.3, 0.9, 200, 1), E.estimatorSpread(E.estimatorB, 1, 0.3, 0.9, 200, 1)], p.spread, 'spread', 1e-10)
    close(E.gradientEstimates(1, 1, 200, 2).map(E.meanAndVariance), p.grads, 'gradient estimates', 1e-10)
    const g = [1, -0.5, 2, 0, 0.3]; close([E.adamSteps(g), E.adamStepsReordered(g), E.adamaxSteps(g)], p.adam, 'adam')
    const bx = [1, 2, 4, 7], bd = [0.5, -1, 2, 0.1]
    close([E.bnForward(bx, 1.5, -0.2), E.bnBackward(bx, bd, 1.5), E.bnBackwardCompact(bx, bd, 1.5), E.bnInference([0.9, 1.1, 1.3], [2, 2.5, 1.5], 8, 1.2, 0.1)], p.bn, 'batch norm', 1e-10)
    close([E.residualUnit([1, -0.5, 2], [[0.2, -0.1, 0.4], [0.3, 0.5, -0.2]], [[1, 0], [0.5, -1], [0, 0.3]]), [0.3, 1].flatMap(s => [false, true].map(res => E.gradientNorm(12, 6, s, res, 4)))], p.res, 'resnet', 1e-10)
    close([1, 100, 4000, 50000].map(s => E.transformerLrate(s)), p.lr, 'lrate'); close([E.smoothedTarget(4, 2), E.crossEntropyOf(E.smoothedTarget(4, 2), [0.1, 0.2, 0.6, 0.1])], p.smooth, 'smoothing')
    close([E.tdErrors(PR, PV, 0.99), E.gae(PR, PV, 0.99, 0.95), E.gaeSum(PR, PV, 0.99, 0.95, 2), E.segmentAdvantage(PR, PV, 0.99, 1), [0.001, 0.01, 0.1].map(d => E.adaptBeta(1, d, 0.01))], p.ppo, 'ppo')
    close([E.alphaBars(B50).at(-1), E.ddpmPosterior(0.8, 0.1, 20, B50), E.posteriorByBayes(0.8, 0.1, 20, B50), E.meanFromNoise(0.3, -1.1, 20, B50), E.lossWeight(20, B50, 0.02), E.priorKl(0.7, B50)], p.ddpm, 'ddpm', 1e-10)
    const LT = [[0.5, 0.5, 0.25], [0.5, 0.5, -0.25], [0, 0.25, 0]], LX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    close([E.loraForward([[1, 0], [0.5, 2]], [[0.3], [-0.2]], [[1, 0.5]], [2, -1], 4, 1), E.loraMerge([[1, 0], [0.5, 2]], [[0.3], [-0.2]], [[1, 0.5]], 4, 1), E.loraParamCount(4096, 4096, 8),
      E.loraGrads([[0.3], [-0.2]], [[1, 0.5]], [2, -1], [0.4, 1], 4, 1), E.loraTrain(LT, LX, 1, 0.5, 30, 1)], p.lora, 'lora', 1e-10)
  })
  it('learners and deep learning', () => {
    const l = P.learners, d = P.deep
    const g = new PyRandom(7), py = [0, 0, 0, 0].map(() => E.pyGauss(g)); expect(py.every(Number.isFinite)).toBe(true)
    close(E.fitPoly([0, 1, 2, 3], [1, 2, 5, 10], 2), l.poly, 'poly', 1e-9); close([1, 2, 5].map(deg => E.biasVariance(deg, 30, 10, 0.3, 1)), l.bv, 'bv', 1e-8)
    const nb = E.predictNaiveBayes(E.trainNaiveBayes([['free', 'money'], ['meeting', 'today'], ['free', 'offer'], ['project', 'today']], ['spam', 'ham', 'spam', 'ham']), ['free', 'money', 'today'])[1]
    close([nb.ham, nb.spam], [l.nb.ham, l.nb.spam], 'nb'); close(E.kmeans([[0, 0], [0, 1], [5, 5], [6, 5], [0.5, 0.2], [5.5, 6]], 2, 10, 3), l.kmeans, 'kmeans')
    close(E.emGmm([0.1, 0.3, -0.2, 4.9, 5.2, 5.1, 0, 4.8], [0, 1], 15), l.em, 'em', 1e-9); close(E.hingeLoss([0.5, -0.2], 0.1, [[1, 2], [-1, 0.5], [2, -1]], [1, -1, 1], 0.1), l.hinge, 'hinge')
    close([E.svmSgd([[1, 2], [2, 3], [-1, -1], [-2, -1]], [1, 1, -1, -1], 0.1, 30, 2)[0]], l.svm, 'svm', 1e-9)
    close([E.gini(['a', 'a', 'b']), E.labelEntropy(['a', 'a', 'b', 'b'])], l.gini, 'gini'); close(E.bestSplit([1, 2, 3, 4, 5, 6], [0, 0, 1, 0, 1, 1]), l.split, 'split')
    close(E.conv1d([1, 2, 3, 4, 5], [1, 0, -1]), d.conv1d, 'conv1d'); close(E.convMatrix([1, 0, -1], 5), d.convm, 'convm'); close(E.conv2d([[1, 2, 3], [4, 5, 6], [7, 8, 9]], [[1, 0], [0, -1]]), d.conv2d, 'conv2d')
    close(E.activationSpread(4, 20, Math.SQRT2, 5), d.spread, 'spread', 1e-9); close(E.layerNorm([1, 2, 4, 9]), d.ln, 'ln'); close(E.batchNorm([[1, 10], [2, 20], [6, 30]]), d.bn, 'bn')
    close(E.dropout([1, 2, 3, 4, 5], 0.4, new PyRandom(8)), d.drop, 'drop'); close(E.rnnForward(0.5, 1, [1, 0, -1]), d.rnn, 'rnn'); close(E.bptt(0.8, 1.2, [1, -0.5, 0.3, 0], 0.4), d.bptt, 'bptt')
    close(E.sinusoidalPosition(3, 8), d.pe, 'pe'); close(E.residualBlock([1, 2, 3], v => v.map(a => 2 * a)), d.res, 'res'); close(E.infoNce([[0.9, 0.1, 0], [0.2, 0.8, 0.3], [0.1, 0.4, 0.7]], 0.2), d.nce, 'nce')
    close([[0, 0], [0.5, -0.3], [-1, 0.7]].map(([m, lv]) => E.klToStandardNormal(m, lv)), d.kl, 'kl'); close(E.reparameterise(0.5, -0.3, 1.2), d.rep, 'rep')
    close([E.ganValue([0.7, 0.4, 0.2], [0.5, 0.5, 0], [0.2, 0.3, 0.5]), E.optimalDiscriminator([0.5, 0.5, 0], [0.2, 0.3, 0.5])], d.gan, 'gan')
    close([E.alphaBar(Array(50).fill(0.02), 30), E.noisySample(1.5, 30, Array(50).fill(0.02), -0.7)], d.diff, 'diff')
    close(E.valueIteration([[[[0.8, 1], [0.2, 0]], [[1, 0]]], [[[1, 1]], [[0.5, 0], [0.5, 1]]]], [[0, 1], [2, 0.5]], 0.9, 100), d.vi, 'vi', 1e-9)
    close(E.scoreFunctionGradient([0.2, -0.1, 0.4], [1, 3, -2], 500, 4), d.sfg, 'sfg', 1e-9); close([[1.5, 2], [0.5, 2], [1.5, -1], [0.5, -1], [1.1, 1]].map(([r, a]) => E.ppoClip(r, a)), d.ppo, 'ppo')
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
