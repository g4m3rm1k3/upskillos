// A release pipeline for model updates: candidates are retrained on recent
// data, pass (or fail) promotion gates, then roll out gradually with an
// automatic rollback rule.
import { random, mean, range, std, median } from '../../kit/math.js'
import { trainArtifact, offlinePredict, FEATS, toJob } from '../l29-serving/engine.js'
import { day } from '../l30-monitoring/engine.js'

// The world changed (a new build cache): recent traffic follows the new relationship.
export const recentDays = (from, to, seed = 21) => { const rng = random(seed + from); return range(to - from).flatMap(d => day(from + d, rng, { kind: 'concept', start: 0 }, 300)) }

function fit(rows, extra = x => []) {
  const X = rows.map(r => [...FEATS(toJob(r.req)), ...extra(r.req)]), y = rows.map(r => r.duration), p = X[0].length
  const mu = range(p).map(k => mean(X.map(r => r[k]))), sd = range(p).map(k => std(X.map(r => r[k])) || 1), Z = X.map(r => r.map((v, k) => (v - mu[k]) / sd[k]))
  let w = Array(p).fill(0), b = mean(y)
  for (let s = 0; s < 400; s++) { const e = Z.map((r, i) => r.reduce((t, v, k) => t + v * w[k], b) - y[i]); w = w.map((wk, k) => wk - 0.1 * 2 * mean(e.map((ei, i) => ei * Z[i][k]))); b -= 0.1 * 2 * mean(e) }
  return req => [...FEATS(toJob(req)), ...extra(req)].reduce((t, v, k) => t + w[k] * (v - mu[k]) / sd[k], b)
}

export function buildCandidates(train) {
  const retrained = fit(train)
  const extra = r => [r.size_mb * (1 - r.cache_hit) * (r.runner === 'shared' ? 1 : 0), r.size_mb * r.cache_hit]
  const bigger = fit(train, extra)
  const leakyTrain = train.map(r => ({ ...r, req: { ...r.req, leak: Math.round(r.duration / 10) * 10 } }))
  const leaky = fit(leakyTrain, r => [r.leak ?? 0]), A = trainArtifact()
  return {
    production: { label: 'Current production model (trained before the change)', offline: r => offlinePredict(A, r), latency: 9 },
    retrained: { label: 'Retrained on recent data, same code', offline: retrained, serve: retrained, latency: 9 },
    bugged: { label: 'Retrained — serving rewrote log(size) as log10(size)', offline: retrained, serve: r => retrained({ ...r, size_mb: Math.exp(Math.log10(r.size_mb)) }), latency: 9 },
    bigger: { label: 'Retrained with extra interaction features (slower)', offline: bigger, serve: bigger, latency: 31 },
    minutes: { label: 'Retrained — now outputs minutes instead of seconds', offline: r => retrained(r) / 60, serve: r => retrained(r) / 60, latency: 9 },
    leaky: { label: 'Retrained with a feature computed from the logged duration', offline: r => leaky({ ...r, leak: r.leak ?? 0 }), evalWithLeak: true, serve: r => leaky({ ...r, leak: 0 }), latency: 9 },
  }
}
const maeOn = (f, rows, leak = false) => mean(rows.map(r => Math.abs(f(leak ? { ...r.req, leak: Math.round(r.duration / 10) * 10 } : r.req) - r.duration)))

export const DEFAULT_GATES = { minImprovement: 0.05, maxSliceRegression: 0.1, latencyBudget: 25, ratioRange: [0.5, 2] }
export function evaluateGates(key, C, holdout, golden, gates = DEFAULT_GATES) {
  const cand = C[key], prod = C.production
  const prodMAE = maeOn(prod.offline, holdout), candMAE = maeOn(cand.offline, holdout, cand.evalWithLeak)
  const slices = [['shared runner', r => r.req.runner === 'shared'], ['dedicated runner', r => r.req.runner === 'dedicated'], ['cache hit', r => r.req.cache_hit === 1], ['cache miss', r => r.req.cache_hit === 0]]
    .map(([name, f]) => { const rs = holdout.filter(f); return { name, prod: maeOn(prod.offline, rs), cand: maeOn(cand.offline, rs, cand.evalWithLeak) } })
  const ratio = median(golden.map(r => cand.offline(r.req) / prod.offline(r.req)))
  const parityDiff = Math.max(...golden.map(r => Math.abs((cand.serve ?? cand.offline)(r.req) - cand.offline(cand.evalWithLeak ? { ...r.req, leak: 0 } : r.req))))
  const noiseFloor = 5 // irreducible error of the process, from repeated measurements
  const results = [
    { gate: 'Improves holdout MAE by at least ' + Math.round(gates.minImprovement * 100) + '%', pass: candMAE <= prodMAE * (1 - gates.minImprovement), detail: `${candMAE.toFixed(2)} s vs production ${prodMAE.toFixed(2)} s` },
    { gate: 'No slice more than ' + Math.round(gates.maxSliceRegression * 100) + '% worse than production', pass: slices.every(s => s.cand <= s.prod * (1 + gates.maxSliceRegression)), detail: slices.map(s => `${s.name} ${s.cand.toFixed(1)}/${s.prod.toFixed(1)}`).join(' · ') },
    { gate: 'Prediction contract: same unit (median ratio to production in [0.5, 2])', pass: ratio >= gates.ratioRange[0] && ratio <= gates.ratioRange[1], detail: `median ratio ${ratio.toFixed(3)}` },
    { gate: 'Serving parity with offline pipeline', pass: parityDiff < 1e-6, detail: `max difference ${parityDiff.toFixed(3)} s` },
    { gate: `p95 latency within ${gates.latencyBudget} ms`, pass: cand.latency <= gates.latencyBudget, detail: `${cand.latency} ms` },
    { gate: 'Sanity: not better than the process noise allows', pass: candMAE >= noiseFloor * 0.6, detail: `MAE ${candMAE.toFixed(2)} s vs noise floor ≈ ${noiseFloor} s` },
  ]
  return { prodMAE, candMAE, results, promote: results.every(r => r.pass) }
}

// Canary: route a growing share of traffic to the candidate; roll back if its
// error exceeds control by more than `tol` on two consecutive days.
export function canary(key, C, { schedule = [0.01, 0.05, 0.05, 0.25, 0.25, 0.5, 1], tol = 0.1, seed = 5 } = {}) {
  const cand = C[key], prod = C.production, log = []
  let bad = 0
  for (let d = 0; d < schedule.length; d++) {
    const traffic = recentDays(40 + d, 41 + d, seed), share = schedule[d]
    const nCanary = Math.max(3, Math.round(traffic.length * share)), canaryRows = traffic.slice(0, nCanary), controlRows = traffic.slice(nCanary)
    const cMAE = maeOn(cand.serve ?? cand.offline, canaryRows), pMAE = controlRows.length ? maeOn(prod.offline, controlRows) : maeOn(prod.offline, canaryRows)
    bad = cMAE > pMAE * (1 + tol) ? bad + 1 : 0
    log.push({ day: d + 1, share, nCanary, canary: cMAE, control: pMAE, rolledBack: bad >= 2 })
    if (bad >= 2) break
  }
  return log
}
