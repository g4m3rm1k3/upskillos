// A deliberately messy build log and a cleaning pipeline whose every decision
// is recorded. The same seed and the same decisions always give the same result.
import { random, normal, shuffle, mean, median } from '../../kit/math.js'

// Each row: one build. files and size_mb are known before the build starts;
// duration_s is measured afterwards and is the target.
export function generateLog({ seed = 7, count = 80 } = {}) {
  const rng = random(seed), rows = []
  for (let i = 0; i < count; i++) {
    const size = +(5 + 95 * rng()).toFixed(1)
    const files = Math.max(1, Math.round(size / 4 + 6 * rng()))
    let duration = +(12 + 0.9 * size + 0.4 * files + 4 * normal(rng)).toFixed(1)
    let sizeMb = size
    const issue = rng()
    if (issue < 0.10) sizeMb = null // size was not logged
    else if (issue < 0.16) duration = -1 // logger wrote the sentinel "-1" on timeout
    else if (issue < 0.19) sizeMb = +(size * 1024).toFixed(0) // logged in KB by an old script
    rows.push({ id: i + 1, files, size_mb: sizeMb, duration_s: duration })
  }
  // Duplicate rows appear when a log file is ingested twice.
  for (const k of [3, 17, 40].filter(k => k < count)) rows.push({ ...rows[k] })
  return shuffle(rows, random(seed + 1))
}

export const defaultDecisions = { sentinel: true, dedupe: true, units: true, strategy: 'median', fitOn: 'train', seed: 7 }

// Returns every intermediate so the UI can show exactly what each step did.
export function runPipeline(raw, decisions = defaultDecisions) {
  const log = []
  let rows = raw.map(r => ({ ...r, flags: [] }))
  log.push({ step: 'Load', detail: `${rows.length} rows read.` })
  if (decisions.dedupe) {
    const seen = new Set(), before = rows.length
    rows = rows.filter(r => { const key = `${r.id}|${r.files}|${r.size_mb}|${r.duration_s}`; if (seen.has(key)) return false; seen.add(key); return true })
    log.push({ step: 'Remove exact duplicates', detail: `${before - rows.length} duplicate rows removed (same build ingested twice).` })
  }
  if (decisions.sentinel) {
    const bad = rows.filter(r => r.duration_s === -1)
    rows = rows.filter(r => r.duration_s !== -1)
    log.push({ step: 'Drop target sentinel', detail: `${bad.length} rows had duration -1 (timeout marker, not a real time). A missing target cannot be imputed for training, so these rows are dropped.` })
  }
  if (decisions.units) {
    let fixed = 0
    rows = rows.map(r => r.size_mb !== null && r.size_mb > 1000 ? (fixed++, { ...r, size_mb: +(r.size_mb / 1024).toFixed(1), flags: [...r.flags, 'unit'] }) : r)
    log.push({ step: 'Repair units', detail: `${fixed} size value(s) above 1000 converted from KB to MB (documented rule: the old script logged KB).` })
  }
  // Split BEFORE learning any statistic from the data.
  const order = shuffle(rows.map((_, i) => i), random(decisions.seed))
  const cut = Math.floor(order.length * 0.75)
  const trainIdx = new Set(order.slice(0, cut))
  let train = rows.filter((_, i) => trainIdx.has(i)), validation = rows.filter((_, i) => !trainIdx.has(i))
  log.push({ step: 'Split', detail: `Seeded shuffle (seed ${decisions.seed}): ${train.length} training rows, ${validation.length} validation rows.` })
  const missing = rows => rows.filter(r => r.size_mb === null).length
  if (decisions.strategy === 'drop') {
    const a = missing(train), b = missing(validation)
    train = train.filter(r => r.size_mb !== null); validation = validation.filter(r => r.size_mb !== null)
    log.push({ step: 'Drop missing sizes', detail: `${a} training and ${b} validation rows dropped. Future builds with a missing size would get no prediction at all.` })
  } else {
    const source = decisions.fitOn === 'all' ? [...train, ...validation] : train
    const known = source.filter(r => r.size_mb !== null).map(r => r.size_mb)
    const fill = decisions.strategy === 'mean' ? mean(known) : median(known)
    const impute = r => r.size_mb === null ? { ...r, size_mb: fill, flags: [...r.flags, 'imputed'], was_missing: 1 } : { ...r, was_missing: 0 }
    const a = missing(train), b = missing(validation)
    train = train.map(impute); validation = validation.map(impute)
    log.push({ step: `Impute size with the ${decisions.strategy}`, detail: `Fill value ${fill.toFixed(2)} MB learned from ${decisions.fitOn === 'all' ? 'ALL rows — validation information leaked into preprocessing' : 'training rows only'}. ${a} training and ${b} validation cells filled.` })
  }
  const fit = fitLine(train)
  const mse = rows => mean(rows.map(r => (fit.w * r.size_mb + fit.b - r.duration_s) ** 2))
  const result = { w: fit.w, b: fit.b, trainMSE: mse(train), validationMSE: mse(validation), baselineMSE: mean(validation.map(r => (mean(train.map(t => t.duration_s)) - r.duration_s) ** 2)) }
  return { log, train, validation, result, fingerprint: fingerprint({ decisions, train, validation }) }
}

export function fitLine(rows) {
  const xs = rows.map(r => r.size_mb), ys = rows.map(r => r.duration_s), mx = mean(xs), my = mean(ys)
  const sxx = xs.reduce((t, x) => t + (x - mx) ** 2, 0)
  const w = sxx < 1e-12 ? 0 : xs.reduce((t, x, i) => t + (x - mx) * (ys[i] - my), 0) / sxx
  return { w, b: my - w * mx }
}

// FNV-1a over a canonical JSON string: identical inputs → identical ID.
export function fingerprint(value) {
  const text = JSON.stringify(value)
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return h.toString(16).padStart(8, '0')
}

// Broadcasting rule, as NumPy applies it: align shapes from the right; each
// pair of sizes must be equal or one of them must be 1.
export function broadcastShape(a, b) {
  const n = Math.max(a.length, b.length), out = []
  for (let i = 1; i <= n; i++) {
    const x = a[a.length - i] ?? 1, y = b[b.length - i] ?? 1
    if (x !== y && x !== 1 && y !== 1) return null
    out.unshift(Math.max(x, y))
  }
  return out
}
