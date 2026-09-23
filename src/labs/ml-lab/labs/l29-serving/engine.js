// Serving a trained model: preprocessing parity between training and serving,
// a queueing simulation of online versus micro-batched inference, and a JSON
// request/response contract.
import { random, mean, range, quantile, std } from '../../kit/math.js'
import { generateJobs, LANGS } from '../l16-capstone/engine.js'

// Offline pipeline: features, training statistics and ridge weights, all saved together.
export const FEATS = j => [Math.log(j.size), j.size * j.shared, j.size * (1 - j.cache), j.shared * j.busy, j.files, j.lang === 'java' ? 1 : 0, j.lang === 'python' ? 1 : 0]
export function trainArtifact(seed = 16) {
  const jobs = generateJobs(500, seed), X = jobs.map(FEATS), y = jobs.map(j => j.duration), p = X[0].length
  const mu = range(p).map(k => mean(X.map(r => r[k]))), sd = range(p).map(k => std(X.map(r => r[k])) || 1), Z = X.map(r => r.map((v, k) => (v - mu[k]) / sd[k]))
  let w = Array(p).fill(0), b = mean(y)
  for (let s = 0; s < 800; s++) { const e = Z.map((r, i) => r.reduce((t, v, k) => t + v * w[k], b) - y[i]); w = w.map((wk, k) => wk - 0.1 * 2 * mean(e.map((ei, i) => ei * Z[i][k]))); b -= 0.1 * 2 * mean(e) }
  return { version: 'build-duration-2026-09-23.1', features: ['log_size', 'size_x_shared', 'size_x_miss', 'shared_x_busy', 'files', 'lang=java', 'lang=python'], mu, sd, w, b, languages: LANGS }
}
export const toJob = r => ({ size: r.size_mb, files: r.files, cache: r.cache_hit, shared: r.runner === 'shared' ? 1 : 0, busy: r.hour >= 9 && r.hour <= 17 ? 1 : 0, lang: r.language, hour: r.hour })
export const offlinePredict = (A, req) => { const x = FEATS(toJob(req)); return x.reduce((t, v, k) => t + A.w[k] * (v - A.mu[k]) / A.sd[k], A.b) }

// Serving implementations: one shares the offline code; three re-implement it with realistic bugs.
export const SERVERS = {
  shared: { label: 'Imports the training pipeline (shared code + saved statistics)', predict: (A, reqs) => reqs.map(r => offlinePredict(A, r)) },
  log10: { label: 'Rewritten: uses log10 instead of the natural log', predict: (A, reqs) => reqs.map(r => { const x = FEATS(toJob(r)); x[0] = Math.log10(r.size_mb); return x.reduce((t, v, k) => t + A.w[k] * (v - A.mu[k]) / A.sd[k], A.b) }) },
  batchStats: { label: 'Rewritten: standardizes with statistics of the incoming batch', predict: (A, reqs) => { const X = reqs.map(r => FEATS(toJob(r))), mu = A.mu.map((_, k) => mean(X.map(x => x[k]))), sd = A.sd.map((_, k) => std(X.map(x => x[k])) || 1); return X.map(x => x.reduce((t, v, k) => t + A.w[k] * (v - mu[k]) / sd[k], A.b)) } },
  onehot: { label: 'Rewritten: one-hot columns in a different order (python, java)', predict: (A, reqs) => reqs.map(r => { const x = FEATS(toJob(r)); [x[5], x[6]] = [x[6], x[5]]; return x.reduce((t, v, k) => t + A.w[k] * (v - A.mu[k]) / A.sd[k], A.b) }) },
}
export function requests(n = 60, seed = 77) {
  return generateJobs(n, seed).map((j, i) => ({ request_id: `r${i}`, size_mb: +j.size.toFixed(1), files: j.files, cache_hit: j.cache, runner: j.shared ? 'shared' : 'dedicated', language: j.lang, hour: j.hour }))
}
export function parity(A, server, reqs, tol = 1e-6) {
  const off = reqs.map(r => offlinePredict(A, r)), srv = SERVERS[server].predict(A, reqs), diff = off.map((v, i) => Math.abs(v - srv[i]))
  return { off, srv, maxDiff: Math.max(...diff), meanDiff: mean(diff), passed: Math.max(...diff) <= tol }
}

// Discrete-event simulation of a single model server with optional micro-batching.
export function simulateQueue({ rate = 40, overhead = 8, perItem = 2, maxBatch = 1, maxWait = 0, seconds = 20, seed = 3 }) {
  const rng = random(seed), arrivals = []
  let t = 0
  while (t < seconds * 1000) { t += -Math.log(1 - rng()) * 1000 / rate; arrivals.push(t) }
  const latencies = []
  let free = 0, i = 0, batches = 0, busy = 0
  while (i < arrivals.length) {
    const first = arrivals[i], start0 = Math.max(free, first)
    const deadline = Math.max(start0, first + maxWait)
    let j = i
    while (j < arrivals.length && j - i < maxBatch && arrivals[j] <= deadline) j++
    const start = maxBatch > 1 ? Math.max(start0, Math.min(deadline, arrivals[j - 1])) : start0
    const service = overhead + perItem * (j - i), end = start + service
    for (let k = i; k < j; k++) latencies.push(end - arrivals[k])
    free = end; busy += service; batches++; i = j
  }
  const span = Math.max(free, seconds * 1000)
  return { p50: quantile(latencies, 0.5), p95: quantile(latencies, 0.95), p99: quantile(latencies, 0.99), throughput: arrivals.length / (span / 1000), utilization: busy / span, avgBatch: arrivals.length / batches, n: arrivals.length, backlog: free - seconds * 1000 }
}

export const REQUEST_SCHEMA = { size_mb: ['number', 0, 2000], files: ['number', 1, 1e6], cache_hit: ['number', 0, 1], runner: ['string', ['shared', 'dedicated']], language: ['string', LANGS], hour: ['number', 0, 23] }
export function handle(A, body) {
  let req
  try { req = JSON.parse(body) } catch (e) { return { status: 400, body: { error: 'Request body is not valid JSON', detail: e.message } } }
  const errors = Object.entries(REQUEST_SCHEMA).flatMap(([k, [type, a, b]]) => {
    const v = req[k]
    if (v === undefined || v === null) return [`${k}: required`]
    if (typeof v !== type) return [`${k}: expected ${type}, got ${typeof v}`]
    if (Array.isArray(a)) return a.includes(v) ? [] : [`${k}: must be one of ${a.join(', ')}`]
    return v < a || v > b ? [`${k}: must be between ${a} and ${b}`] : []
  })
  if (errors.length) return { status: 422, body: { error: 'Request does not match the contract', details: errors } }
  const pred = offlinePredict(A, req)
  return { status: 200, body: { model_version: A.version, predicted_duration_s: +pred.toFixed(1), request_id: req.request_id ?? null } }
}
