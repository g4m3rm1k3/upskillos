// Subgroup evaluation of an escalation model, human-review deferral, and a
// model card assembled from the measured results.
import { random, normal, sigmoid, mean, range } from '../../kit/math.js'

// Each ticket truly needs escalation (y = 1) or not. The model sees a noisy
// severity signal; noise differs by region because of how tickets are recorded.
export function simulate({ n = 3000, baseA = 0.2, baseB = 0.35, noiseA = 0.8, noiseB = 1.6, seed = 7 } = {}) {
  const rng = random(seed)
  return range(n).map(() => {
    const group = rng() < 0.6 ? 'A' : 'B', base = group === 'A' ? baseA : baseB, noise = group === 'A' ? noiseA : noiseB
    const y = rng() < base ? 1 : 0, signal = (y ? 1.5 : -1.5) + noise * normal(rng)
    // One scoring function for everyone, fitted on pooled data (a shared logistic calibration).
    return { group, y, signal }
  })
}
// Pooled logistic fit of P(y | signal) — the deployed model ignores group.
export function fitScorer(rows, steps = 400) {
  let a = 0, b = 0
  for (let s = 0; s < steps; s++) { let ga = 0, gb = 0; rows.forEach(r => { const e = sigmoid(a * r.signal + b) - r.y; ga += e * r.signal; gb += e }); a -= 0.5 * ga / rows.length; b -= 0.5 * gb / rows.length }
  return x => sigmoid(a * x + b)
}
export function groupMetrics(rows, score, threshold) {
  const out = {}
  for (const g of ['A', 'B', 'all']) {
    const rs = g === 'all' ? rows : rows.filter(r => r.group === g)
    const tp = rs.filter(r => r.y && score(r.signal) >= threshold).length, fp = rs.filter(r => !r.y && score(r.signal) >= threshold).length
    const pos = rs.filter(r => r.y).length, neg = rs.length - pos
    out[g] = { n: rs.length, base: pos / rs.length, selection: (tp + fp) / rs.length, tpr: tp / pos, fpr: fp / neg, ppv: tp + fp ? tp / (tp + fp) : NaN, meanScore: mean(rs.map(r => score(r.signal))) }
  }
  return out
}
export function calibration(rows, score, group, bins = 5) {
  const rs = rows.filter(r => r.group === group)
  return range(bins).map(b => { const inBin = rs.filter(r => { const p = score(r.signal); return p >= b / bins && (p < (b + 1) / bins || b === bins - 1) }); return { predicted: mean(inBin.map(r => score(r.signal))), observed: mean(inBin.map(r => r.y)), n: inBin.length } }).filter(c => c.n >= 15)
}
// Send predictions with scores inside [0.5 − w, 0.5 + w] to a human; automate the rest.
export function deferral(rows, score, width) {
  const auto = rows.filter(r => Math.abs(score(r.signal) - 0.5) > width)
  return { coverage: auto.length / rows.length, autoAccuracy: mean(auto.map(r => ((score(r.signal) >= 0.5 ? 1 : 0) === r.y ? 1 : 0))), reviewed: rows.length - auto.length }
}

export function modelCard(f, metrics) {
  const pct = v => `${(100 * v).toFixed(1)}%`
  return `# Model card: ${f.name || '(unnamed model)'}

**Version:** ${f.version || '—'} · **Owner:** ${f.owner || '—'} · **Date:** ${new Date().toISOString().slice(0, 10)}

## Intended use
${f.intended || '(required) What decision does this model support, for whom, and how are its outputs used?'}

## Out of scope
${f.outOfScope || '(required) Uses this model must not be put to.'}

## Data
${f.data || '(required) Sources, time period, permissions and known gaps.'}

## Evaluation (threshold ${f.threshold})
| group | tickets | base rate | flagged | recall (TPR) | false-positive rate | precision |
|---|---|---|---|---|---|---|
${['A', 'B', 'all'].map(g => { const m = metrics[g]; return `| ${g} | ${m.n} | ${pct(m.base)} | ${pct(m.selection)} | ${pct(m.tpr)} | ${pct(m.fpr)} | ${pct(m.ppv)} |` }).join('\n')}

## Limitations
${f.limitations || '(required) Where the model is known or expected to perform poorly.'}

## Human oversight
${f.oversight || 'Describe review, appeal and override procedures.'}

## Ethical considerations
${f.ethics || 'Who could be harmed by errors, and how is that monitored?'}
`
}
