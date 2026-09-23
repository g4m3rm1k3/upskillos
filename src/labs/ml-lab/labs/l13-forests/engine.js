// Bagging and random forests built on the Lab 12 tree engine.
import { random, mean, range } from '../../kit/math.js'
import { buildTree, predict } from '../l12-trees/engine.js'

export function bootstrapIndices(n, rng) { return range(n).map(() => Math.floor(rng() * n)) }

// Fit T trees, each on a bootstrap sample; record which rows each tree never saw.
export function fitForest(rows, { trees = 50, maxDepth = 8, minLeaf = 1, maxFeatures, bootstrap = true, seed = 1, criterion = 'gini' } = {}) {
  const rng = random(seed), out = []
  for (let t = 0; t < trees; t++) {
    const idx = bootstrap ? bootstrapIndices(rows.length, rng) : range(rows.length)
    const inBag = new Set(idx)
    out.push({ tree: buildTree(idx.map(i => rows[i]), { maxDepth, minLeaf, criterion, maxFeatures, rng: maxFeatures ? rng : undefined }), inBag })
  }
  return out
}
export const forestProb = (forest, x, upto = forest.length) => mean(forest.slice(0, upto).map(f => predict(f.tree, x)))
export const accuracy = (forest, rows, upto) => mean(rows.map(r => ((forestProb(forest, r.x, upto) >= 0.5 ? 1 : 0) === r.y ? 1 : 0)))

// Out-of-bag accuracy: each row is predicted only by trees that did not train on it.
export function oobAccuracy(forest, rows, upto = forest.length) {
  let hits = 0, counted = 0
  rows.forEach((r, i) => {
    const votes = forest.slice(0, upto).filter(f => !f.inBag.has(i)).map(f => predict(f.tree, r.x))
    if (votes.length) { counted++; hits += (mean(votes) >= 0.5 ? 1 : 0) === r.y ? 1 : 0 }
  })
  return counted ? hits / counted : NaN
}

// Accuracy curves as trees are added (validation and OOB).
export function growthCurve(forest, train, validation, steps = [1, 2, 3, 5, 8, 12, 20, 30, 50, 75, 100]) {
  return steps.filter(s => s <= forest.length).map(s => ({ trees: s, val: accuracy(forest, validation, s), oob: oobAccuracy(forest, train, s) }))
}

// Average pairwise correlation of individual trees' predictions on some rows.
export function treeCorrelation(forest, rows, maxTrees = 20) {
  const preds = forest.slice(0, maxTrees).map(f => rows.map(r => predict(f.tree, r.x)))
  const corr = (a, b) => { const ma = mean(a), mb = mean(b); let s = 0, sa = 0, sb = 0; a.forEach((v, i) => { s += (v - ma) * (b[i] - mb); sa += (v - ma) ** 2; sb += (b[i] - mb) ** 2 }); return sa && sb ? s / Math.sqrt(sa * sb) : 1 }
  const vals = []
  for (let i = 0; i < preds.length; i++) for (let j = i + 1; j < preds.length; j++) vals.push(corr(preds[i], preds[j]))
  return mean(vals)
}
// Variance of the average of T variables with variance σ² and pairwise correlation ρ.
export const averageVariance = (sigma2, rho, T) => rho * sigma2 + (1 - rho) * sigma2 / T
