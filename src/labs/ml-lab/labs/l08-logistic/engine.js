// Logistic regression from scratch: linear score → sigmoid → cross-entropy,
// trained by batch gradient descent with an optional L2 penalty.
import { sigmoid, mean } from '../../kit/math.js'

export const featureMaps = {
  linear: { label: 'Linear: x1, x2', names: ['x1', 'x2'], map: (a, b) => [a, b] },
  quadratic: { label: 'Quadratic: + x1², x2², x1·x2', names: ['x1', 'x2', 'x1²', 'x2²', 'x1·x2'], map: (a, b) => [a, b, a * a, b * b, a * b] },
}
export const score = (model, f) => model.b + f.reduce((t, v, j) => t + v * model.w[j], 0)
export const prob = (model, f) => sigmoid(score(model, f))

// Binary cross-entropy, computed from the score z for numerical stability:
// −[y log σ(z) + (1−y) log(1−σ(z))] = log(1 + e^z) − y·z
export const bce = (z, y) => Math.max(z, 0) + Math.log1p(Math.exp(-Math.abs(z))) - y * z

export function evaluate(model, rows, mapName) {
  const fm = featureMaps[mapName].map
  const zs = rows.map(r => score(model, fm(r.x1, r.x2)))
  return { loss: mean(zs.map((z, i) => bce(z, rows[i].label))), accuracy: mean(zs.map((z, i) => ((z >= 0 ? 1 : 0) === rows[i].label ? 1 : 0))) }
}
export function gradient(model, rows, mapName, lambda = 0) {
  const fm = featureMaps[mapName].map, feats = rows.map(r => fm(r.x1, r.x2))
  const err = feats.map((f, i) => prob(model, f) - rows[i].label)
  return { w: model.w.map((w, j) => mean(err.map((e, i) => e * feats[i][j])) + 2 * lambda * w), b: mean(err) }
}
export function initial(mapName) { return { w: Array(featureMaps[mapName].names.length).fill(0), b: 0, step: 0 } }
export function step(model, rows, mapName, rate, lambda) {
  const g = gradient(model, rows, mapName, lambda)
  return { w: model.w.map((w, j) => w - rate * g.w[j]), b: model.b - rate * g.b, step: model.step + 1, last: g }
}
export function gradientCheck(model, rows, mapName, lambda = 0, eps = 1e-5) {
  const loss = m => evaluate(m, rows, mapName).loss + lambda * m.w.reduce((t, w) => t + w * w, 0)
  const g = gradient(model, rows, mapName, lambda)
  const numeric = model.w.map((_, j) => { const up = { ...model, w: model.w.map((w, k) => k === j ? w + eps : w) }, dn = { ...model, w: model.w.map((w, k) => k === j ? w - eps : w) }; return (loss(up) - loss(dn)) / (2 * eps) })
  const nb = (loss({ ...model, b: model.b + eps }) - loss({ ...model, b: model.b - eps })) / (2 * eps)
  const err = Math.max(...[...g.w.map((v, j) => Math.abs(v - numeric[j])), Math.abs(g.b - nb)])
  return { analytic: [...g.w, g.b], numeric: [...numeric, nb], error: err, passed: err < 1e-6 }
}
