// Data contracts and reproducible training: validate incoming batches against
// explicit rules, and give every trained model a lineage (data, config, code).
import { range, mean } from '../../kit/math.js'
import { generateJobs, design } from '../l16-capstone/engine.js'
import { fingerprint } from '../l02-data/engine.js'

// A batch of incoming build jobs with realistic problems injected.
export function incomingBatch({ seed = 5, problems = true } = {}) {
  const rows = generateJobs(60, seed).map((j, i) => ({ job_id: 1000 + i, size_mb: +j.size.toFixed(1), files: j.files, cache_hit: j.cache, runner: j.shared ? 'shared' : 'dedicated', language: j.lang, hour: j.hour, duration_s: +j.duration.toFixed(1) }))
  if (!problems) return rows
  rows[3].size_mb = null                        // missing required value
  rows[7].size_mb = -12                         // impossible value
  rows[11].language = 'rust'                    // category never seen in training
  rows[15].hour = 25                            // out of range
  rows[19].files = '37'                         // wrong type (string from a CSV export)
  rows[23] = { ...rows[22] }                    // duplicate id
  rows[31].runner = 'Shared'                    // inconsistent casing
  for (const i of range(12)) rows[40 + i].duration_s = +(rows[40 + i].duration_s / 60).toFixed(2) // upstream now reports minutes: still positive, still passes every row rule
  rows[53].duration_s = null
  return rows
}

export const DEFAULT_CONTRACT = {
  job_id: { type: 'number', required: true, unique: true, on: true },
  size_mb: { type: 'number', required: true, min: 0, max: 2000, on: true },
  files: { type: 'number', required: true, min: 1, on: true },
  cache_hit: { type: 'number', allowed: [0, 1], on: true },
  runner: { type: 'string', allowed: ['shared', 'dedicated'], on: true },
  language: { type: 'string', allowed: ['go', 'java', 'python'], on: true },
  hour: { type: 'number', min: 0, max: 23, on: true },
  duration_s: { type: 'number', required: true, min: 0, on: true },
}

export function validate(rows, contract) {
  const violations = [], bad = new Set()
  const add = (i, column, rule, value) => { violations.push({ row: i, column, rule, value }); bad.add(i) }
  for (const [col, r] of Object.entries(contract)) {
    if (!r.on) continue
    const seen = new Map()
    rows.forEach((row, i) => {
      const v = row[col]
      if (v === null || v === undefined || v === '') { if (r.required) add(i, col, 'required', v); return }
      if (r.type && typeof v !== r.type) { add(i, col, `type ${r.type}`, v); return }
      if (r.min !== undefined && v < r.min) add(i, col, `≥ ${r.min}`, v)
      if (r.max !== undefined && v > r.max) add(i, col, `≤ ${r.max}`, v)
      if (r.allowed && !r.allowed.includes(v)) add(i, col, `in {${r.allowed.join(', ')}}`, v)
      if (r.unique) { if (seen.has(v)) add(i, col, 'unique', v); seen.set(v, i) }
    })
  }
  return { violations, badRows: [...bad].sort((a, b) => a - b) }
}

// Reference statistics from the training data the model was built on.
export const REFERENCE = (() => { const d = generateJobs(600, 16).map(j => j.duration), m = mean(d); return { duration_s: { mean: m, sd: Math.sqrt(mean(d.map(v => (v - m) ** 2))) } } })()
// Distribution check: compare a batch statistic with the training reference.
export function driftCheck(rows, column, reference) {
  const vals = rows.map(r => r[column]).filter(v => typeof v === 'number' && Number.isFinite(v))
  const m = mean(vals)
  return { mean: m, reference: reference.mean, z: (m - reference.mean) / (reference.sd / Math.sqrt(vals.length)) }
}

// Deterministic training of a ridge-free linear model on clean rows, so lineage can be checked exactly.
export function trainRun(rows, config) {
  const jobs = rows.map(r => ({ size: r.size_mb, files: r.files, cache: r.cache_hit, shared: r.runner === 'shared' ? 1 : 0, lang: r.language, hour: r.hour, busy: r.hour >= 9 && r.hour <= 17 ? 1 : 0, duration: r.duration_s }))
  const { X, y } = design(jobs, config.features)
  const p = X[0].length, lr = config.lr
  let w = Array(p).fill(0), b = mean(y)
  const mu = range(p).map(j => mean(X.map(r => r[j]))), sd = range(p).map(j => Math.sqrt(mean(X.map(r => (r[j] - mu[j]) ** 2))) || 1)
  const Z = X.map(r => r.map((v, j) => (v - mu[j]) / sd[j]))
  for (let s = 0; s < config.steps; s++) {
    const e = Z.map((r, i) => r.reduce((t, v, j) => t + v * w[j], b) - y[i])
    w = w.map((wj, j) => wj - lr * 2 * mean(e.map((ei, i) => ei * Z[i][j]))); b -= lr * 2 * mean(e)
  }
  const mae = mean(Z.map((r, i) => Math.abs(r.reduce((t, v, j) => t + v * w[j], b) - y[i])))
  return { mae, weightsHash: fingerprint(w.map(v => +v.toFixed(10))) }
}
export const dataVersion = rows => fingerprint(rows)
export const runId = (dataHash, config, code) => fingerprint({ dataHash, config, code })
