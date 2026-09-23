// Monitoring a deployed model: daily input drift (PSI), prediction drift, and
// performance that is only measurable after labels arrive.
import { random, normal, mean, range, quantile } from '../../kit/math.js'
import { trainArtifact, offlinePredict } from '../l29-serving/engine.js'
import { LANGS } from '../l16-capstone/engine.js'

// One day of traffic. Scenario knobs change the world after `start`.
export function day(d, rng, s, n = 400) {
  const after = d >= s.start
  return range(n).map(() => {
    const size = Math.exp(Math.log(40) + 0.9 * normal(rng)), files = Math.max(1, Math.round(size / 3 * Math.exp(0.4 * normal(rng))))
    const cache = rng() < 0.6 ? 1 : 0, shared = rng() < (s.kind === 'covariate' && after ? 0.85 : 0.5) ? 1 : 0, lang = LANGS[Math.floor(rng() * 3)], hour = Math.floor(rng() * 24), busy = hour >= 9 && hour <= 17 ? 1 : 0
    const cacheFactor = s.kind === 'concept' && after ? 0.05 : 0.25 // a new build cache makes cache hits far cheaper
    const work = (cache ? cacheFactor : 1) * 0.9 * size * (shared ? 1.6 : 1)
    const duration = Math.max(3, 20 + work + { go: 0, java: 25, python: 10 }[lang] + 0.05 * files + (shared && busy ? 15 : 0) + (5 + 0.08 * work) * normal(rng))
    const reported = s.kind === 'bug' && after ? size * 1024 : size // upstream starts sending KB
    return { req: { size_mb: reported, files, cache_hit: cache, runner: shared ? 'shared' : 'dedicated', language: lang, hour }, duration }
  })
}

// Population Stability Index against reference quantile bins.
export function psi(reference, current, bins = 10) {
  const edges = range(bins - 1).map(i => quantile(reference, (i + 1) / bins))
  const share = xs => { const c = Array(bins).fill(0); xs.forEach(x => { let k = 0; while (k < edges.length && x > edges[k]) k++; c[k]++ }); return c.map(v => Math.max(v / xs.length, 1e-4)) }
  const e = share(reference), a = share(current)
  return e.reduce((t, ei, i) => t + (a[i] - ei) * Math.log(a[i] / ei), 0)
}
// PSI for a categorical feature.
export function psiCategorical(reference, current, categories) {
  const share = xs => categories.map(c => Math.max(xs.filter(x => x === c).length / xs.length, 1e-4))
  const e = share(reference), a = share(current)
  return e.reduce((t, ei, i) => t + (a[i] - ei) * Math.log(a[i] / ei), 0)
}

export function simulate({ kind = 'none', start = 25, labelDelay = 7, days = 60, seed = 4 } = {}) {
  const A = trainArtifact(), rng = random(seed), ref = day(-1, random(99), { kind: 'none', start: 1e9 }, 3000)
  const refSize = ref.map(r => r.req.size_mb), refRunner = ref.map(r => r.req.runner), refPred = ref.map(r => offlinePredict(A, r.req)), refMAE = mean(ref.map(r => Math.abs(offlinePredict(A, r.req) - r.duration)))
  const log = range(days).map(d => {
    const rows = day(d, rng, { kind, start }), preds = rows.map(r => offlinePredict(A, r.req))
    return { day: d, psiSize: psi(refSize, rows.map(r => r.req.size_mb)), psiRunner: psiCategorical(refRunner, rows.map(r => r.req.runner), ['shared', 'dedicated']), psiPred: psi(refPred, preds), predMean: mean(preds), mae: mean(preds.map((p, i) => Math.abs(p - rows[i].duration))) }
  })
  return { log, refMAE, refPredMean: mean(refPred), labelDelay, start, kind }
}

// Alert when a metric exceeds its threshold for `persist` consecutive days.
export function alerts(series, threshold, persist = 2) {
  const out = []; let run = 0
  series.forEach((v, i) => { run = v > threshold ? run + 1 : 0; if (run === persist) out.push(i) })
  return out
}
