// Capstone: predict CI build duration from job metadata, compare models
// honestly with cross-validation, and open a locked test set once.
import { random, normal, mean, std, shuffle, range, solve } from '../../kit/math.js'
import { buildTree, predict } from '../l12-trees/engine.js'
import { fitForest, forestProb } from '../l13-forests/engine.js'
import { boost, predictAt } from '../l14-boosting/engine.js'

export const LANGS = ['go', 'java', 'python']
export function generateJobs(n = 600, seed = 16) {
  const rng = random(seed)
  return range(n).map(() => {
    const size = Math.exp(Math.log(40) + 0.9 * normal(rng)), files = Math.max(1, Math.round(size / 3 * Math.exp(0.4 * normal(rng))))
    const cache = rng() < 0.6 ? 1 : 0, shared = rng() < 0.5 ? 1 : 0, lang = LANGS[Math.floor(rng() * 3)], hour = Math.floor(rng() * 24)
    const busy = hour >= 9 && hour <= 17 ? 1 : 0
    const work = (cache ? 0.25 : 1) * 0.9 * size * (shared ? 1.6 : 1)
    const duration = 20 + work + { go: 0, java: 25, python: 10 }[lang] + 0.05 * files + (shared && busy ? 15 : 0) + (5 + 0.08 * work) * normal(rng)
    return { size, files, cache, shared, lang, hour, busy, duration: Math.max(3, duration) }
  })
}

export const defaultFeatures = { logSize: false, interactions: false, busy: false, oneHot: true }
// Build the numeric design (without intercept) and its column names.
export function design(jobs, f) {
  const names = ['size_mb', 'files', 'cache_hit', 'shared_runner', 'hour']
  if (f.oneHot) names.push('lang=java', 'lang=python')
  if (f.logSize) names.push('log_size')
  if (f.interactions) names.push('size×shared', 'size×(1−cache)')
  if (f.busy) names.push('shared×busy_hours')
  const X = jobs.map(j => {
    const r = [j.size, j.files, j.cache, j.shared, j.hour]
    if (f.oneHot) r.push(j.lang === 'java' ? 1 : 0, j.lang === 'python' ? 1 : 0)
    if (f.logSize) r.push(Math.log(j.size))
    if (f.interactions) r.push(j.size * j.shared, j.size * (1 - j.cache))
    if (f.busy) r.push(j.shared * j.busy)
    return r
  })
  return { X, y: jobs.map(j => j.duration), names }
}

// Development/test split: the test rows are set aside before anything else.
export function devTest(jobs, seed = 16) { const s = shuffle(jobs, random(seed + 1)), k = Math.floor(jobs.length * 0.8); return { dev: s.slice(0, k), test: s.slice(k) } }

function ridge(X, y, lambda = 1e-3) {
  const p = X[0].length, mu = range(p).map(j => mean(X.map(r => r[j]))), sd = range(p).map(j => std(X.map(r => r[j])) || 1), my = mean(y)
  const Z = X.map(r => r.map((v, j) => (v - mu[j]) / sd[j])), n = X.length
  const A = range(p).map(i => range(p).map(j => Z.reduce((t, r) => t + r[i] * r[j], 0) / n + (i === j ? lambda : 0)))
  const w = solve(A, range(p).map(i => Z.reduce((t, r, k) => t + r[i] * (y[k] - my), 0) / n))
  return x => my + x.reduce((t, v, j) => t + w[j] * (v - mu[j]) / sd[j], 0)
}
export const MODELS = {
  baseline: { label: 'Mean baseline', fit: (X, y) => { const m = mean(y); return () => m } },
  linear: { label: 'Linear regression (ridge λ=0.001)', fit: (X, y) => ridge(X, y) },
  tree: { label: 'Decision tree (depth 6, leaf ≥ 5)', fit: (X, y) => { const t = buildTree(X.map((x, i) => ({ x, y: y[i] })), { maxDepth: 6, minLeaf: 5, criterion: 'mse' }); return x => predict(t, x) } },
  forest: { label: 'Random forest (25 trees)', fit: (X, y) => { const f = fitForest(X.map((x, i) => ({ x, y: y[i] })), { trees: 25, maxDepth: 9, minLeaf: 3, criterion: 'mse', maxFeatures: Math.max(1, Math.ceil(X[0].length / 3)), seed: 5 }); return x => forestProb(f, x) } },
  boosting: { label: 'Gradient boosting (80 × depth 3, ν 0.15)', fit: (X, y) => { const m = boost(X.map((x, i) => ({ x, y: y[i] })), { stages: 80, rate: 0.15, depth: 3, minLeaf: 5 }); return x => predictAt(m, x) } },
}
export const mae = (pred, y) => mean(y.map((v, i) => Math.abs(pred[i] - v)))

// k-fold CV on the development set; also returns out-of-fold predictions.
export function crossValidate(dev, features, modelKey, k = 5, seed = 3) {
  const { X, y } = design(dev, features), order = shuffle(range(X.length), random(seed)), oof = Array(X.length), scores = []
  for (let f = 0; f < k; f++) {
    const val = order.filter((_, i) => i % k === f), vs = new Set(val), tr = order.filter(i => !vs.has(i))
    const model = MODELS[modelKey].fit(tr.map(i => X[i]), tr.map(i => y[i]))
    const pred = val.map(i => model(X[i])); val.forEach((i, q) => { oof[i] = pred[q] })
    scores.push(mae(pred, val.map(i => y[i])))
  }
  return { mean: mean(scores), sd: std(scores, 1), scores, oof }
}

// Fit on all development rows, evaluate once on the untouched test rows.
export function finalTest(dev, test, features, modelKey, seed = 9) {
  const d = design(dev, features), t = design(test, features)
  const model = MODELS[modelKey].fit(d.X, d.y), base = mean(d.y)
  const pred = t.X.map(x => model(x)), errM = t.y.map((v, i) => Math.abs(pred[i] - v)), errB = t.y.map(v => Math.abs(base - v))
  // Bootstrap the paired difference in absolute error (baseline − model).
  const rng = random(seed), diffs = range(1000).map(() => { let s = 0; for (let i = 0; i < errM.length; i++) { const j = Math.floor(rng() * errM.length); s += errB[j] - errM[j] } return s / errM.length }).sort((a, b) => a - b)
  return { modelMAE: mean(errM), baselineMAE: mean(errB), improvement: mean(errB) - mean(errM), ci: [diffs[25], diffs[974]] }
}

export function segmentErrors(dev, oof) {
  const segs = [['shared runner', j => j.shared === 1], ['dedicated runner', j => j.shared === 0], ['cache hit', j => j.cache === 1], ['cache miss', j => j.cache === 0], ...LANGS.map(l => [`lang = ${l}`, j => j.lang === l]), ['large (> 100 MB)', j => j.size > 100]]
  return segs.map(([label, test]) => { const idx = dev.map((j, i) => (test(j) ? i : -1)).filter(i => i >= 0); return { label, n: idx.length, mae: mean(idx.map(i => Math.abs(oof[i] - dev[i].duration))) } })
}
