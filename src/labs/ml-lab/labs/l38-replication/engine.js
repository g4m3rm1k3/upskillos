// Replicating a (fictional) paper's claim within a compute budget: exact
// reproduction, seed variation, paired comparison, ablations and a tuned
// baseline — then a report that separates what replicated from what did not.
import { random, normal, range, mean, std, sigmoid, quantile } from '../../kit/math.js'
import { classification } from '../../kit/datasets.js'

// Every training run: logistic regression by full-batch gradient descent.
// `features`: 'raw' (x1, x2) or 'cubic' (all monomials up to degree 3).
// `augment`: add 4 jittered copies of each training point ("JitterMix").
export const PAPER = { seed: 9, method: 0.934, baseline: 0.848 }
export const BASELINE = { features: 'raw', augment: false, lambda: 0 }
export const METHOD = { features: 'cubic', augment: true, lambda: 0.01 }

const expand = (p, features) => features === 'raw' ? [p.x1, p.x2] : [p.x1, p.x2, p.x1 * p.x1, p.x1 * p.x2, p.x2 * p.x2, p.x1 ** 3, p.x1 * p.x1 * p.x2, p.x1 * p.x2 * p.x2, p.x2 ** 3]
const TEST = classification('moons', { n: 1500, noise: 0.3, seed: 9999 })

export function trainData(seed, { nTrain = 40, labelNoise = 0 } = {}) {
  const rng = random(1000 + seed)
  return classification('moons', { n: nTrain, noise: 0.3, seed: 1 + seed }).map(p => rng() < labelNoise ? { ...p, label: 1 - p.label } : p)
}
export function run(config, seed, data = {}) {
  const { features, augment, lambda } = config, rng = random(5000 + seed)
  let train = trainData(seed, data)
  if (augment) train = train.flatMap(p => [p, ...range(4).map(() => ({ x1: p.x1 + 0.15 * normal(rng), x2: p.x2 + 0.15 * normal(rng), label: p.label }))])
  const X = train.map(p => expand(p, features)), d = X[0].length
  const mu = range(d).map(j => mean(X.map(x => x[j]))), sd = range(d).map(j => std(X.map(x => x[j])) || 1)
  const Z = X.map(x => x.map((v, j) => (v - mu[j]) / sd[j]))
  let w = range(d).map(() => 0.01 * normal(rng)), b = 0
  for (let step = 0; step < 300; step++) {
    const g = Array(d).fill(0); let gb = 0
    Z.forEach((z, i) => { const e = sigmoid(b + z.reduce((s, v, j) => s + v * w[j], 0)) - train[i].label; gb += e; z.forEach((v, j) => { g[j] += e * v }) })
    w = w.map((wj, j) => wj - 0.5 * (g[j] / Z.length + lambda * wj)); b -= 0.5 * gb / Z.length
  }
  const predict = p => sigmoid(b + expand(p, features).reduce((s, v, j) => s + (v - mu[j]) / sd[j] * w[j], 0))
  return TEST.filter(p => (predict(p) >= 0.5 ? 1 : 0) === p.label).length / TEST.length
}

// Paired comparison of two configurations over the same seeds (same data).
export function compare(a, b, seeds, data = {}) {
  const A = seeds.map(s => run(a, s, data)), B = seeds.map(s => run(b, s, data)), diff = A.map((v, i) => v - B[i])
  const se = std(diff, 1) / Math.sqrt(diff.length)
  return { A, B, diff, mean: mean(diff), lo: mean(diff) - 2.26 * se, hi: mean(diff) + 2.26 * se, meanA: mean(A), meanB: mean(B), sdA: std(A, 1) }
}
// Percentile bootstrap interval for a mean.
export function bootstrap(values, { reps = 2000, seed = 38 } = {}) {
  const rng = random(seed), means = range(reps).map(() => mean(values.map(() => values[Math.floor(rng() * values.length)])))
  return [quantile(means, 0.025), quantile(means, 0.975)]
}

// Experiments the learner can buy with the budget. `runs` = training runs used.
export const EXPERIMENTS = [
  { id: 'reproduce', name: 'Re-run the paper’s exact setup (seed 9)', runs: 2 },
  { id: 'seeds', name: 'Method vs baseline on 10 fresh seeds', runs: 20 },
  { id: 'ablation', name: 'Ablation: remove one component at a time (10 seeds)', runs: 40 },
  { id: 'tuned', name: 'Stronger baseline: cubic features, λ tuned on separate seeds', runs: 32 },
  { id: 'noise', name: 'Robustness claim: 20% of training labels flipped (10 seeds)', runs: 20 },
]
export const BUDGET = 100
// Fresh seeds: never the paper's seed 9, never the tuning seeds.
export const SEEDS = range(10).map(i => i + 10)

export function runExperiment(id) {
  if (id === 'reproduce') return { method: run(METHOD, PAPER.seed), baseline: run(BASELINE, PAPER.seed) }
  if (id === 'seeds') return compare(METHOD, BASELINE, SEEDS)
  if (id === 'ablation') return {
    full: SEEDS.map(s => run(METHOD, s)),
    rows: [['without JitterMix (augmentation)', { ...METHOD, augment: false }], ['without cubic features', { ...METHOD, features: 'raw' }], ['without weight decay', { ...METHOD, lambda: 0 }]].map(([name, cfg]) => ({ name, ...compare(METHOD, cfg, SEEDS) })),
  }
  if (id === 'tuned') {
    // Tune λ for the cubic baseline on seeds the final comparison does not use.
    const grid = [0, 0.001, 0.01, 0.1], tuneSeeds = [101, 102, 103]
    const scores = grid.map(l => mean(tuneSeeds.map(s => run({ features: 'cubic', augment: false, lambda: l }, s))))
    const lambda = grid[scores.indexOf(Math.max(...scores))]
    return { lambda, ...compare(METHOD, { features: 'cubic', augment: false, lambda }, SEEDS) }
  }
  if (id === 'noise') return compare(METHOD, BASELINE, SEEDS, { labelNoise: 0.2 })
}

export const CLAIMS = [
  { id: 'c1', text: 'The method reaches 93.4% test accuracy on two-moons with 40 training points.', needs: ['reproduce', 'seeds'] },
  { id: 'c2', text: 'The method beats logistic regression by 8.6 points.', needs: ['seeds'] },
  { id: 'c3', text: 'The gain comes from JitterMix augmentation, our contribution.', needs: ['ablation', 'tuned'] },
  { id: 'c4', text: 'The method is robust to label noise.', needs: ['noise'] },
]
export const VERDICTS = [['untested', 'Not tested'], ['replicated', 'Replicated'], ['partial', 'Partially replicated'], ['not', 'Not supported']]

// An evidence-based verdict for each claim, given the experiments run so far.
export function suggest(results) {
  const r = results, out = {}
  const pts = v => (Math.abs(v) < 0.0005 ? 0 : 100 * v).toFixed(1)
  if (r.seeds) {
    const s = r.seeds
    out.c1 = { verdict: s.meanA < PAPER.method - 0.02 ? 'partial' : 'replicated', why: `${r.reproduce ? `Seed 9 reproduces ${pts(r.reproduce.method)}% exactly, but ` : ''}on 10 fresh seeds the method averages ${pts(s.meanA)}% (sd ${pts(s.sdA)}).` }
    out.c2 = { verdict: s.lo > 0 ? (s.mean < PAPER.method - PAPER.baseline - 0.02 ? 'partial' : 'replicated') : 'not', why: `Paired gain on 10 fresh seeds: ${pts(s.mean)} points [${pts(s.lo)}, ${pts(s.hi)}] versus the claimed 8.6.` }
  } else if (r.reproduce) out.c1 = { verdict: 'untested', why: `Seed 9 reproduces ${pts(r.reproduce.method)}%, but one run cannot show how typical it is.` }
  if (r.ablation) {
    const aug = r.ablation.rows[0]
    out.c3 = { verdict: aug.lo <= 0 ? 'not' : 'partial', why: `Removing JitterMix changes accuracy by ${pts(-aug.mean)} points [${pts(-aug.hi)}, ${pts(-aug.lo)}]; removing cubic features costs ${pts(r.ablation.rows[1].mean)} points.${r.tuned ? ` A cubic baseline with tuned λ scores ${pts(r.tuned.meanB)}% versus the method’s ${pts(r.tuned.meanA)}%.` : ''}` }
  } else if (r.tuned) out.c3 = { verdict: r.tuned.hi < 0.01 ? 'not' : 'partial', why: `A cubic baseline with tuned λ scores ${pts(r.tuned.meanB)}% versus the method’s ${pts(r.tuned.meanA)}%: the gain does not need JitterMix.` }
  if (r.noise) out.c4 = { verdict: r.noise.lo > 0 ? 'replicated' : 'not', why: `With 20% flipped labels the gain is ${pts(r.noise.mean)} points [${pts(r.noise.lo)}, ${pts(r.noise.hi)}], and the method’s accuracy varies widely (sd ${pts(r.noise.sdA)}).` }
  return out
}
export function report(claims, verdicts, notes, results) {
  const lines = ['# Replication report', '', `Compute used: ${Object.keys(results).reduce((s, id) => s + EXPERIMENTS.find(e => e.id === id).runs, 0)} of ${BUDGET} training runs.`, '']
  claims.forEach((c, i) => { lines.push(`## Claim ${i + 1}: ${c.text}`, '', `**Verdict:** ${VERDICTS.find(v => v[0] === (verdicts[c.id] ?? 'untested'))[1]}`, '', notes[c.id]?.trim() || '_No evidence recorded._', '') })
  lines.push('## Deviations from the paper', '', notes.deviations?.trim() || '_None recorded._', '')
  return lines.join('\n')
}
