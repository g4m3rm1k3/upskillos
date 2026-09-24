// Uncertainty quantification: heteroscedastic networks and deep ensembles
// (aleatoric versus epistemic), quantile regression with the pinball loss,
// split conformal prediction (absolute, normalized and CQR scores), conformal
// prediction sets for classification, and what happens under distribution shift.
import { random, normal, range, mean, quantile } from '../../kit/math.js'
import { Dense, Tanh, ReLU, Sequential, softmaxCE, Adam } from '../../kit/nn.js'

// ---------- Data: noise grows with |x|, and no data between 0.4 and 1.8 ----------
export const truth = x => 1.5 * Math.sin(1.3 * x) + 0.3 * x
export const noiseSd = x => 0.1 + 0.25 * Math.abs(x)
export const GAP = [0.4, 1.8], RANGE = [-3, 3]
export function sampleX(rng, shift = 0) {
  for (;;) {
    // shift > 0 moves mass toward the noisy edges: draw |x| from a skewed distribution.
    const u = rng(), x = shift ? (rng() < 0.5 ? -1 : 1) * 3 * u ** (1 / (1 + 2 * shift)) : RANGE[0] + (RANGE[1] - RANGE[0]) * u
    if (x < GAP[0] || x > GAP[1]) return x
  }
}
export function makeData(n, seed, { shift = 0 } = {}) {
  const rng = random(seed)
  return range(n).map(() => { const x = sampleX(rng, shift); return { x, y: truth(x) + noiseSd(x) * normal(rng) } })
}
export const TRAIN = makeData(300, 60), CALIB = makeData(300, 61), TEST = makeData(2000, 62)

// ---------- Networks ----------
// ReLU networks extrapolate linearly, each with its own slope, so ensemble members disagree away from the data.
const mlp = (out, rng, hidden = 16) => new Sequential([new Dense(1, hidden, rng, { init: 'he' }), ReLU(), new Dense(hidden, hidden, rng, { init: 'he' }), ReLU(), new Dense(hidden, out, rng, { init: 'xavier' })])
const inputs = rows => rows.map(r => Float64Array.of(r.x / 3))
function minibatches(rows, steps, batch, rng, fn) {
  const X = inputs(rows)
  for (let t = 0; t < steps; t++) { const idx = range(batch).map(() => Math.floor(rng() * rows.length)); fn(t, idx.map(i => X[i]), idx.map(i => rows[i].y)) }
}

// Heteroscedastic regression: output mean μ and log-variance s; minimize the Gaussian
// negative log-likelihood ½[s + (y − μ)²·e^(−s)] (constant dropped).
export function trainGaussian(rows, { steps = 1500, lr = 0.01, seed = 1, batch = 64 } = {}) {
  const rng = random(seed), net = mlp(2, rng), opt = new Adam(net.params(), { lr })
  minibatches(rows, steps, batch, rng, (t, X, Y) => {
    net.zeroGrad()
    const out = net.forward(X)
    // Warm up on the mean alone so the variance head does not explain everything away early.
    const warm = t < steps / 5
    net.backward(out.map((o, i) => { const r = Y[i] - o[0], e = Math.exp(-o[1]); return warm ? Float64Array.of(-2 * r / batch, 0) : Float64Array.of(-r * e / batch, 0.5 * (1 - r * r * e) / batch) }))
    opt.step()
  })
  const predict = xs => net.forward(xs.map(x => Float64Array.of(x / 3))).map(o => ({ mu: o[0], var: Math.exp(Math.min(o[1], 10)) }))
  return { predict }
}
// A deep ensemble: M independently initialized networks. Mixture variance = mean σ² (aleatoric) + variance of μ (epistemic).
export function ensemble(M = 5, opts = {}) {
  const members = range(M).map(m => trainGaussian(TRAIN, { ...opts, seed: m + 1 }))
  const predict = xs => {
    const outs = members.map(m => m.predict(xs))
    return xs.map((_, i) => { const mus = outs.map(o => o[i].mu), mu = mean(mus); return { mu, mus, aleatoric: mean(outs.map(o => o[i].var)), epistemic: mean(mus.map(v => (v - mu) ** 2)) } })
  }
  return { members, predict }
}

// Quantile regression: one network with two outputs trained by the pinball loss.
export const pinball = (tau, y, q) => (y >= q ? tau * (y - q) : (1 - tau) * (q - y))
export function trainQuantiles(rows, { taus = [0.05, 0.95], steps = 2000, lr = 0.01, seed = 1, batch = 64 } = {}) {
  const rng = random(seed), net = mlp(taus.length, rng), opt = new Adam(net.params(), { lr })
  minibatches(rows, steps, batch, rng, (t, X, Y) => {
    net.zeroGrad()
    const out = net.forward(X)
    net.backward(out.map((o, i) => Float64Array.from(taus, (tau, k) => ((Y[i] < o[k] ? 1 : 0) - tau) / batch)))
    opt.step()
  })
  return { taus, predict: xs => net.forward(xs.map(x => Float64Array.of(x / 3))).map(o => Array.from(o)) }
}

// ---------- Split conformal prediction ----------
// The conformal quantile: the ⌈(n + 1)(1 − α)⌉-th smallest calibration score (∞ if that exceeds n).
export function conformalQuantile(scores, alpha) {
  const n = scores.length, k = Math.ceil((n + 1) * (1 - alpha))
  return k > n ? Infinity : [...scores].sort((a, b) => a - b)[k - 1]
}
// Three score functions. Each returns { score(row), interval(x, q) } given fitted models.
export function scorers({ point, quant }) {
  return {
    abs: { name: 'Absolute residual |y − μ(x)|', score: (r, p) => Math.abs(r.y - p.mu), interval: (p, q) => [p.mu - q, p.mu + q] },
    norm: { name: 'Normalized residual |y − μ(x)| / σ(x)', score: (r, p) => Math.abs(r.y - p.mu) / Math.sqrt(p.var), interval: (p, q) => [p.mu - q * Math.sqrt(p.var), p.mu + q * Math.sqrt(p.var)] },
    cqr: { name: 'Conformalized quantile regression (CQR)', score: (r, p) => Math.max(p.lo - r.y, r.y - p.hi), interval: (p, q) => [p.lo - q, p.hi + q] },
    predictAll: xs => { const a = point.predict(xs), b = quant.predict(xs); return xs.map((_, i) => ({ mu: a[i].mu, var: a[i].var, lo: b[i][0], hi: b[i][1] })) },
  }
}
export function conformalize(S, kind, calib, alpha) {
  const P = S.predictAll(calib.map(r => r.x)), scores = calib.map((r, i) => S[kind].score(r, P[i]))
  return { q: conformalQuantile(scores, alpha), scores }
}
export function evaluate(S, kind, q, rows) {
  const P = S.predictAll(rows.map(r => r.x))
  return rows.map((r, i) => { const [lo, hi] = S[kind].interval(P[i], q); return { x: r.x, lo, hi, covered: r.y >= lo && r.y <= hi } })
}
// Coverage over many random calibration/test splits of a pool: the distribution the guarantee is about.
export function coverageSpread(S, kind, alpha, { nCal = 100, nTest = 200, reps = 300, seed = 3 } = {}) {
  const rng = random(seed), pool = [...CALIB, ...TEST], P = S.predictAll(pool.map(r => r.x)), scores = pool.map((r, i) => S[kind].score(r, P[i]))
  return range(reps).map(() => {
    const idx = range(pool.length); for (let i = 0; i < nCal + nTest; i++) { const j = i + Math.floor(rng() * (idx.length - i)); [idx[i], idx[j]] = [idx[j], idx[i]] }
    const q = conformalQuantile(idx.slice(0, nCal).map(i => scores[i]), alpha)
    return mean(idx.slice(nCal, nCal + nTest).map(i => (scores[i] <= q ? 1 : 0)))
  })
}
// Coverage within bins of x (conditional coverage is not guaranteed).
export function binnedCoverage(evals, edges = [-3, -2, -1, 0, 1, 2, 3]) {
  return edges.slice(0, -1).map((a, k) => { const b = edges[k + 1], sel = evals.filter(e => e.x >= a && e.x < b); return { a, b, n: sel.length, coverage: sel.length ? mean(sel.map(e => (e.covered ? 1 : 0))) : NaN, width: sel.length ? mean(sel.map(e => e.hi - e.lo)) : NaN } })
}

// ---------- Conformal classification ----------
export const CENTERS = [[-1, -0.6], [1, -0.6], [0, 1]]
export function blobs(n, seed, spread = 0.75) {
  const rng = random(seed)
  return range(n).map(i => { const c = i % 3; return { x: [CENTERS[c][0] + spread * normal(rng), CENTERS[c][1] + spread * normal(rng)], y: c } })
}
export const CTRAIN = blobs(300, 63), CCALIB = blobs(300, 64), CTEST = blobs(1500, 65)
export function trainClassifier(rows = CTRAIN, { steps = 400, seed = 1 } = {}) {
  const rng = random(seed), net = new Sequential([new Dense(2, 16, rng, { init: 'xavier' }), Tanh(), new Dense(16, 3, rng, { init: 'xavier' })]), opt = new Adam(net.params(), { lr: 0.02 })
  const X = rows.map(r => Float64Array.from(r.x)), Y = rows.map(r => r.y)
  for (let t = 0; t < steps; t++) { net.zeroGrad(); net.backward(softmaxCE(net.forward(X), Y).grad); opt.step() }
  return pts => net.forward(pts.map(p => Float64Array.from(p))).map(z => { const m = Math.max(...z), e = Array.from(z, v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s) })
}
// Score = 1 − p̂(true class); the set keeps every class whose score is at most q.
export function predictionSets(probs, q) { return probs.map(p => p.map((v, k) => (1 - v <= q ? k : -1)).filter(k => k >= 0)) }
export function classConformal(model, alpha, { calib = CCALIB, test = CTEST } = {}) {
  const pc = model(calib.map(r => r.x)), q = conformalQuantile(calib.map((r, i) => 1 - pc[i][r.y]), alpha)
  const sets = predictionSets(model(test.map(r => r.x)), q)
  return { q, sets, coverage: mean(sets.map((s, i) => (s.includes(test[i].y) ? 1 : 0))), avgSize: mean(sets.map(s => s.length)), empty: mean(sets.map(s => (s.length ? 0 : 1))) }
}
// Naive sets: keep classes until their probabilities sum to 1 − α (no calibration step).
export function naiveSets(model, alpha, test = CTEST) {
  const P = model(test.map(r => r.x)), sets = P.map(p => { const order = [0, 1, 2].sort((a, b) => p[b] - p[a]), out = []; let s = 0; for (const k of order) { out.push(k); s += p[k]; if (s >= 1 - alpha) break } return out })
  return { sets, coverage: mean(sets.map((s, i) => (s.includes(test[i].y) ? 1 : 0))), avgSize: mean(sets.map(s => s.length)) }
}
export { quantile }
