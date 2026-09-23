// Final capstone helpers: a quick, honest baseline-versus-model check on the
// learner's own CSV, and a readiness review of an end-to-end project plan.
import { random, shuffle, mean, std, range, solve } from '../../kit/math.js'

export function parseTable(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) throw new Error('Paste a header row and at least one data row.')
  const header = lines[0].split(',').map(h => h.trim())
  const rows = lines.slice(1).map((l, i) => {
    const cells = l.split(',').map(c => c.trim())
    if (cells.length !== header.length) throw new Error(`Row ${i + 1} has ${cells.length} values; the header has ${header.length}.`)
    return Object.fromEntries(header.map((h, j) => [h, cells[j] === '' ? null : Number.isFinite(Number(cells[j])) ? Number(cells[j]) : cells[j]]))
  })
  const numeric = header.filter(h => rows.every(r => r[h] === null || typeof r[h] === 'number'))
  return { header, rows, numeric }
}

function ridge(X, y, lambda = 1e-2) {
  const p = X[0].length, mu = range(p).map(j => mean(X.map(r => r[j]))), sd = range(p).map(j => std(X.map(r => r[j])) || 1), my = mean(y), n = X.length
  const Z = X.map(r => r.map((v, j) => (v - mu[j]) / sd[j]))
  const A = range(p).map(i => range(p).map(j => Z.reduce((t, r) => t + r[i] * r[j], 0) / n + (i === j ? lambda : 0)))
  const w = solve(A, range(p).map(i => Z.reduce((t, r, k) => t + r[i] * (y[k] - my), 0) / n))
  return x => my + x.reduce((t, v, j) => t + w[j] * (v - mu[j]) / sd[j], 0)
}

// k-fold CV (random, or ordered by row position for time-ordered data).
export function compare(rows, target, features, { k = 5, ordered = false, seed = 1 } = {}) {
  const usable = rows.filter(r => r[target] !== null && features.every(f => r[f] !== null))
  if (usable.length < 2 * k) throw new Error(`Only ${usable.length} complete rows — need at least ${2 * k} for ${k}-fold validation.`)
  if (!features.length) throw new Error('Choose at least one numeric feature.')
  const idx = ordered ? range(usable.length) : shuffle(range(usable.length), random(seed))
  const folds = range(k).map(f => idx.filter((_, i) => (ordered ? Math.floor(i * k / idx.length) === f : i % k === f)))
  const base = [], model = []
  folds.forEach((val, f) => {
    if (ordered && f === 0) return // forward chaining: the first block has no past to train on
    const vs = new Set(val), tr = ordered ? idx.filter(i => i < Math.min(...val)) : idx.filter(i => !vs.has(i))
    const y = tr.map(i => usable[i][target]), m = mean(y), fit = ridge(tr.map(i => features.map(f2 => usable[i][f2])), y)
    base.push(mean(val.map(i => Math.abs(m - usable[i][target]))))
    model.push(mean(val.map(i => Math.abs(fit(features.map(f2 => usable[i][f2])) - usable[i][target]))))
  })
  const s = a => ({ mean: mean(a), sd: a.length > 1 ? std(a, 1) : 0 })
  return { n: usable.length, dropped: rows.length - usable.length, folds: base.length, baseline: s(base), model: s(model), paired: model.map((v, i) => base[i] - v) }
}

export const SECTIONS = [
  ['frame', 'Problem framing', [['decision', 'Decision the prediction supports', 'Lab 16'], ['target', 'Target, unit and prediction moment', 'Lab 16'], ['metric', 'Metric, baseline and success threshold', 'Labs 06, 09']]],
  ['data', 'Data', [['sources', 'Sources, permissions and retention', 'Lab 31'], ['contract', 'Data contract (types, ranges, categories)', 'Lab 28'], ['split', 'Split that matches deployment (random, group or time)', 'Labs 06, 19']]],
  ['model', 'Modelling', [['baselines', 'Baseline results with uncertainty', 'Labs 05, 16'], ['candidates', 'Candidates compared on the same folds', 'Labs 16, 27'], ['errors', 'Error analysis by segment', 'Labs 16, 31']]],
  ['deploy', 'Deployment', [['serving', 'Batch or online; API contract; latency budget', 'Lab 29'], ['parity', 'Parity and golden tests', 'Lab 29'], ['card', 'Model card with limitations', 'Lab 31']]],
  ['operate', 'Operation', [['monitoring', 'Input, prediction and outcome monitoring', 'Lab 30'], ['alerts', 'Alerts, guards and a rollback runbook', 'Labs 30, 32'], ['retraining', 'Retraining trigger, gates and owner', 'Lab 32']]],
]
export function readiness(plan) {
  const items = SECTIONS.flatMap(([, , fields]) => fields.map(([key, label, lab]) => ({ key, label, lab, done: (plan[key] ?? '').trim().length >= 20 })))
  return { items, score: items.filter(i => i.done).length / items.length }
}
export function exportPlan(plan, title) {
  return `# ${title || 'ML project plan'}\n\n` + SECTIONS.map(([, name, fields]) => `## ${name}\n\n` + fields.map(([key, label]) => `**${label}.** ${(plan[key] ?? '').trim() || '_(not yet written)_'}`).join('\n\n')).join('\n\n') + '\n'
}
