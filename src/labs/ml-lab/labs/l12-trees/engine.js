// CART-style decision trees: greedy recursive binary splits on one feature at
// a time. Shared by random forests (Lab 13) and gradient boosting (Lab 14).
// Rows: { x: number[], y: number }. Classification uses y ∈ {0, 1}.
import { mean } from '../../kit/math.js'

export const gini = ys => { if (!ys.length) return 0; const p = mean(ys); return 2 * p * (1 - p) }
export const entropy = ys => { if (!ys.length) return 0; const p = mean(ys); return [p, 1 - p].reduce((t, q) => t - (q > 0 ? q * Math.log2(q) : 0), 0) }
export const mseImpurity = ys => { if (!ys.length) return 0; const m = mean(ys); return mean(ys.map(v => (v - m) ** 2)) }
export const IMPURITY = { gini, entropy, mse: mseImpurity }

// Every candidate threshold (midpoints between sorted distinct values) for one feature.
// Impurity from running sums (count, Σy, Σy²) so a whole scan is one pass.
function fromStats(criterion, n, s, s2) {
  if (!n) return 0
  const p = s / n
  if (criterion === 'mse') return Math.max(0, s2 / n - p * p)
  if (criterion === 'entropy') return [p, 1 - p].reduce((t, q) => t - (q > 0 ? q * Math.log2(q) : 0), 0)
  return 2 * p * (1 - p)
}
export function splitScan(rows, feature, criterion = 'gini') {
  const sorted = [...rows].sort((a, b) => a.x[feature] - b.x[feature]), n = rows.length, out = []
  const S = rows.reduce((t, r) => t + r.y, 0), S2 = rows.reduce((t, r) => t + r.y * r.y, 0)
  const parent = fromStats(criterion, n, S, S2)
  let ls = 0, ls2 = 0
  for (let i = 1; i < n; i++) {
    const y = sorted[i - 1].y; ls += y; ls2 += y * y
    const a = sorted[i - 1].x[feature], b = sorted[i].x[feature]
    if (a === b) continue
    const weighted = (i * fromStats(criterion, i, ls, ls2) + (n - i) * fromStats(criterion, n - i, S - ls, S2 - ls2)) / n
    out.push({ feature, threshold: (a + b) / 2, weighted, gain: parent - weighted, nLeft: i, nRight: n - i })
  }
  return { parent, candidates: out }
}

export function bestSplit(rows, { criterion = 'gini', minLeaf = 1, features } = {}) {
  const d = rows[0].x.length
  const pool = features ?? Array.from({ length: d }, (_, j) => j)
  let best = null
  for (const j of pool) for (const c of splitScan(rows, j, criterion).candidates) {
    if (c.nLeft < minLeaf || c.nRight < minLeaf) continue
    if (!best || c.gain > best.gain + 1e-12) best = c
  }
  return best
}

let nextId = 0
export function buildTree(rows, { maxDepth = 3, minLeaf = 1, criterion = 'gini', minGain = 1e-9, maxFeatures, rng } = {}, depth = 0) {
  const ys = rows.map(r => r.y), node = { id: nextId++, n: rows.length, value: mean(ys), impurity: IMPURITY[criterion](ys), depth }
  if (depth >= maxDepth || rows.length < 2 * minLeaf || node.impurity === 0) return node
  let features
  if (maxFeatures && rng) { const all = rows[0].x.map((_, j) => j); features = []; while (features.length < Math.min(maxFeatures, all.length)) { const j = all[Math.floor(rng() * all.length)]; if (!features.includes(j)) features.push(j) } }
  const split = bestSplit(rows, { criterion, minLeaf, features })
  if (!split || split.gain < minGain) return node
  const opts = { maxDepth, minLeaf, criterion, minGain, maxFeatures, rng }
  node.split = split
  node.left = buildTree(rows.filter(r => r.x[split.feature] <= split.threshold), opts, depth + 1)
  node.right = buildTree(rows.filter(r => r.x[split.feature] > split.threshold), opts, depth + 1)
  return node
}
export function predict(tree, x) { let n = tree; while (n.split) n = x[n.split.feature] <= n.split.threshold ? n.left : n.right; return n.value }
export function path(tree, x) { const out = []; let n = tree; while (n) { out.push(n); if (!n.split) break; n = x[n.split.feature] <= n.split.threshold ? n.left : n.right } return out }
export const leaves = tree => tree.split ? [...leaves(tree.left), ...leaves(tree.right)] : [tree]
export const depthOf = tree => tree.split ? 1 + Math.max(depthOf(tree.left), depthOf(tree.right)) : 0

// Axis-aligned rectangles for each leaf inside a bounding box (2D only).
export function regions(tree, box) {
  if (!tree.split) return [{ ...box, value: tree.value, node: tree }]
  const { feature, threshold } = tree.split
  const lo = feature === 0 ? { ...box, x1: threshold } : { ...box, y1: threshold }
  const hi = feature === 0 ? { ...box, x0: threshold } : { ...box, y0: threshold }
  return [...regions(tree.left, lo), ...regions(tree.right, hi)]
}
export const toRows = points => points.map(p => ({ x: [p.x1, p.x2], y: p.label }))
export const accuracy = (tree, rows) => mean(rows.map(r => ((predict(tree, r.x) >= 0.5 ? 1 : 0) === r.y ? 1 : 0)))
