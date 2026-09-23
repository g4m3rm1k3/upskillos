// A multilayer perceptron with dense layers, a choice of activation, softmax
// output and cross-entropy loss, trained by full-batch gradient descent.
// Matrices are arrays of rows; one row per example.
import { random, normal, range, mean } from '../../kit/math.js'
import { classification } from '../../kit/datasets.js'

export function spiral3(n = 240, seed = 1) {
  const rng = random(seed)
  return range(n).map(i => { const c = i % 3, r = rng(), t = c * 2.1 + r * 4 + 0.25 * normal(rng); return { x1: r * Math.cos(t) * 2, x2: r * Math.sin(t) * 2, label: c } })
}
export const DATA = {
  xor: ['XOR quadrants', s => classification('xor', { seed: s, n: 200 })],
  circles: ['Circle inside ring', s => classification('circles', { seed: s, n: 200 })],
  moons: ['Two moons', s => classification('moons', { seed: s, n: 200 })],
  spiral3: ['Three-arm spiral (3 classes)', s => spiral3(240, s)],
}

export const ACT = {
  tanh: { f: Math.tanh, d: (z, a) => 1 - a * a },
  relu: { f: z => Math.max(0, z), d: z => (z > 0 ? 1 : 0) },
  sigmoid: { f: z => 1 / (1 + Math.exp(-z)), d: (z, a) => a * (1 - a) },
}
const matmul = (A, W) => A.map(r => W[0].map((_, j) => r.reduce((t, v, k) => t + v * W[k][j], 0)))

export function init(sizes, scheme = 'he', seed = 1) {
  const rng = random(seed)
  return sizes.slice(1).map((out, l) => {
    const fanIn = sizes[l], scale = scheme === 'zero' ? 0 : scheme === 'xavier' ? Math.sqrt(1 / fanIn) : scheme === 'large' ? 3 : Math.sqrt(2 / fanIn)
    return { W: range(fanIn).map(() => range(out).map(() => scale * normal(rng))), b: Array(out).fill(0) }
  })
}
// Numerically stable softmax: subtract the row maximum before exponentiating.
export function softmax(z) { const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s) }

export function forward(layers, X, act = 'tanh') {
  const cache = [{ a: X }]
  let a = X
  layers.forEach((L, l) => {
    const z = matmul(a, L.W).map(r => r.map((v, j) => v + L.b[j]))
    a = l === layers.length - 1 ? z.map(softmax) : z.map(r => r.map(ACT[act].f))
    cache.push({ z, a })
  })
  return cache
}
export const loss = (probs, y) => mean(probs.map((p, i) => -Math.log(Math.max(p[y[i]], 1e-12))))

// Backward pass: for softmax + cross-entropy, ∂L/∂z_out = (p − onehot(y))/n.
export function backward(layers, cache, y, act = 'tanh') {
  const n = y.length, grads = []
  let delta = cache.at(-1).a.map((p, i) => p.map((v, k) => (v - (k === y[i] ? 1 : 0)) / n))
  for (let l = layers.length - 1; l >= 0; l--) {
    const aPrev = cache[l].a
    grads[l] = { W: layers[l].W.map((_, k) => layers[l].W[0].map((__, j) => aPrev.reduce((t, r, i) => t + r[k] * delta[i][j], 0))), b: layers[l].b.map((_, j) => delta.reduce((t, r) => t + r[j], 0)) }
    if (l > 0) delta = delta.map((d, i) => layers[l].W.map((wRow, k) => wRow.reduce((t, w, j) => t + w * d[j], 0) * ACT[act].d(cache[l].z[i][k], cache[l].a[i][k])))
  }
  return grads
}
export const step = (layers, grads, rate) => layers.map((L, l) => ({ W: L.W.map((r, k) => r.map((w, j) => w - rate * grads[l].W[k][j])), b: L.b.map((v, j) => v - rate * grads[l].b[j]) }))

export function trainSteps(layers, X, y, { act, rate, steps }) {
  let cur = layers
  for (let s = 0; s < steps; s++) { const c = forward(cur, X, act); cur = step(cur, backward(cur, c, y, act), rate) }
  return cur
}
export function gradCheck(layers, X, y, act, eps = 1e-5) {
  const g = backward(layers, forward(layers, X, act), y, act), checks = []
  layers.forEach((L, l) => [[0, 0], [L.W.length - 1, L.W[0].length - 1]].forEach(([k, j]) => {
    const bump = d => layers.map((M, m) => m !== l ? M : { ...M, W: M.W.map((r, kk) => r.map((w, jj) => (kk === k && jj === j ? w + d : w))) })
    const num = (loss(forward(bump(eps), X, act).at(-1).a, y) - loss(forward(bump(-eps), X, act).at(-1).a, y)) / (2 * eps)
    checks.push({ layer: l + 1, k, j, analytic: g[l].W[k][j], numeric: num })
  }))
  return checks
}
export const predictProbs = (layers, x, act) => forward(layers, [x], act).at(-1).a[0]
export const accuracy = (layers, X, y, act) => mean(forward(layers, X, act).at(-1).a.map((p, i) => (p.indexOf(Math.max(...p)) === y[i] ? 1 : 0)))
export const countParams = layers => layers.reduce((t, L) => t + L.W.length * L.W[0].length + L.b.length, 0)
