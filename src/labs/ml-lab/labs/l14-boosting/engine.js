// Gradient boosting for squared error: each small regression tree fits the
// residuals of the current ensemble, and is added with a shrinkage factor.
import { random, normal, mean, range } from '../../kit/math.js'
import { buildTree, predict } from '../l12-trees/engine.js'

export const truth = x => Math.sin(2.2 * x) + 0.35 * x + (x > 1.4 ? 0.8 : 0)
export function makeData(n, noise, seed) {
  const rng = random(seed)
  return range(n).map(() => { const x = -3 + 6 * rng(); return { x: [x], y: truth(x) + noise * normal(rng) } })
}

export function boost(train, { stages = 100, rate = 0.1, depth = 1, minLeaf = 3 } = {}) {
  const base = mean(train.map(r => r.y)), trees = []
  let current = train.map(() => base)
  for (let m = 0; m < stages; m++) {
    const residual = train.map((r, i) => ({ x: r.x, y: r.y - current[i] }))
    const tree = buildTree(residual, { maxDepth: depth, minLeaf, criterion: 'mse' })
    trees.push(tree)
    current = current.map((c, i) => c + rate * predict(tree, train[i].x))
  }
  return { base, rate, trees }
}
export const predictAt = (model, x, stages = model.trees.length) => model.trees.slice(0, stages).reduce((t, tree) => t + model.rate * predict(tree, x), model.base)
export const mse = (model, rows, stages) => mean(rows.map(r => (predictAt(model, r.x, stages) - r.y) ** 2))

// Train/validation error after each stage (incremental, so it is fast).
export function stageErrors(model, train, validation) {
  let tr = train.map(() => model.base), va = validation.map(() => model.base)
  const out = [{ stage: 0, train: mean(train.map((r, i) => (tr[i] - r.y) ** 2)), val: mean(validation.map((r, i) => (va[i] - r.y) ** 2)) }]
  model.trees.forEach((tree, m) => {
    tr = tr.map((v, i) => v + model.rate * predict(tree, train[i].x)); va = va.map((v, i) => v + model.rate * predict(tree, validation[i].x))
    out.push({ stage: m + 1, train: mean(train.map((r, i) => (tr[i] - r.y) ** 2)), val: mean(validation.map((r, i) => (va[i] - r.y) ** 2)) })
  })
  return out
}
// Early stopping: the stage with the lowest validation error.
export const bestStage = errors => errors.reduce((b, e) => e.val < b.val ? e : b).stage
