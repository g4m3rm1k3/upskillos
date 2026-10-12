// Part 6 in JavaScript: conv.py's convolution and pooling, and cnn.py's small network written out
// by hand: Conv2d(1, F, 3) → ReLU → MaxPool2d(2) → Flatten → Linear(F·13·13, 10), forward and
// backward for one 28 × 28 image, with Adam. parity.test.js checks the gradients against PyTorch's.
import { PyRandom } from '../../qmaze-lab/engine/mt.js'

// conv.py
export const KERNELS = {
  'vertical edges': [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
  'horizontal edges': [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
  blur: [[1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9]],
}
export function convolve(image, kernel) {
  const k = kernel.length, out = []
  for (let r = 0; r <= image.length - k; r++) {
    const row = []
    for (let c = 0; c <= image[0].length - k; c++) {
      let total = 0
      for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) total += image[r + i][c + j] * kernel[i][j]
      row.push(total)
    }
    out.push(row)
  }
  return out
}
export const reluMap = image => image.map(row => row.map(v => Math.max(0, v)))
export function maxPool(image, size = 2) {
  const out = []
  for (let r = 0; r + size <= image.length; r += size) {
    const row = []
    for (let c = 0; c + size <= image[0].length; c += size) {
      let m = -Infinity
      for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) m = Math.max(m, image[r + i][c + j])
      row.push(m)
    }
    out.push(row)
  }
  return out
}

// The CNN. Weights as PyTorch holds them: conv W[f][0..8] (3 × 3, row by row), conv b[f], dense
// D[10][F·169] (flattened filter by filter, then row by row), dense c[10]. Starting weights uniform
// in ±1/√(inputs), as PyTorch draws them.
export function makeCNN(filters = 8, seed = 0) {
  const rng = new PyRandom(seed), u = b => (rng.random() * 2 - 1) * b
  const n = filters * 169
  return {
    filters,
    W: Array.from({ length: filters }, () => Array.from({ length: 9 }, () => u(1 / 3))), b: Array.from({ length: filters }, () => u(1 / 3)),
    D: Array.from({ length: 10 }, () => Array.from({ length: n }, () => u(1 / Math.sqrt(n)))), c: Array.from({ length: 10 }, () => u(1 / Math.sqrt(n))),
  }
}

// Forward for one image (784 numbers, row by row), keeping what backward needs.
export function cnnForward(net, x) {
  const F = net.filters, conv = new Float64Array(F * 676), pooled = new Float64Array(F * 169), argmax = new Int32Array(F * 169)
  for (let f = 0; f < F; f++) {
    const w = net.W[f], bias = net.b[f]
    for (let r = 0; r < 26; r++) for (let c = 0; c < 26; c++) {
      let s = bias
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s += x[(r + i) * 28 + c + j] * w[i * 3 + j]
      conv[f * 676 + r * 26 + c] = s > 0 ? s : 0
    }
    for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) {
      let best = -Infinity, at = 0
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const k = f * 676 + (2 * r + i) * 26 + 2 * c + j; if (conv[k] > best) { best = conv[k]; at = k } }
      pooled[f * 169 + r * 13 + c] = best; argmax[f * 169 + r * 13 + c] = at
    }
  }
  const out = net.D.map((row, k) => { let s = net.c[k]; for (let i = 0; i < row.length; i++) s += row[i] * pooled[i]; return s })
  return { out, conv, pooled, argmax }
}
export const cnnPredict = (net, x) => cnnForward(net, x).out

// Cross-entropy over a batch (labels as digits) and the gradient of every weight.
export function cnnLossAndGradients(net, X, labels) {
  const F = net.filters, n = X.length
  const g = { W: net.W.map(r => r.map(() => 0)), b: net.b.map(() => 0), D: net.D.map(r => r.map(() => 0)), c: net.c.map(() => 0) }
  let loss = 0
  X.forEach((x, s) => {
    const { out, conv, pooled, argmax } = cnnForward(net, x)
    const top = Math.max(...out), powers = out.map(z => Math.exp(z - top)), total = powers.reduce((a, b) => a + b, 0)
    loss += -(out[labels[s]] - top - Math.log(total)) / n
    const dOut = powers.map((p, k) => (p / total - (k === labels[s] ? 1 : 0)) / n)
    const dPooled = new Float64Array(F * 169)
    dOut.forEach((d, k) => {
      g.c[k] += d
      const row = g.D[k], w = net.D[k]
      for (let i = 0; i < row.length; i++) { row[i] += d * pooled[i]; dPooled[i] += d * w[i] }
    })
    // Back through pooling (only the largest of each block gets the gradient), ReLU, and the filter.
    for (let i = 0; i < F * 169; i++) {
      const k = argmax[i]
      if (conv[k] <= 0 || dPooled[i] === 0) continue
      const f = Math.floor(k / 676), r = Math.floor((k % 676) / 26), c = k % 26, d = dPooled[i]
      g.b[f] += d
      for (let a = 0; a < 3; a++) for (let q = 0; q < 3; q++) g.W[f][a * 3 + q] += d * x[(r + a) * 28 + c + q]
    }
  })
  return { loss, grads: g }
}

export function makeAdam(net, rate = 0.001) {
  const z = a => a.map(r => Array.isArray(r) ? r.map(() => 0) : 0)
  return { rate, t: 0, m: { W: z(net.W), b: z(net.b), D: z(net.D), c: z(net.c) }, v: { W: z(net.W), b: z(net.b), D: z(net.D), c: z(net.c) } }
}
export function adamStep(net, opt, grads, beta1 = 0.9, beta2 = 0.999, eps = 1e-8) {
  opt.t += 1
  const c1 = 1 - beta1 ** opt.t, c2 = 1 - beta2 ** opt.t
  const update = (p, gr, m, v) => { for (let j = 0; j < p.length; j++) { m[j] = beta1 * m[j] + (1 - beta1) * gr[j]; v[j] = beta2 * v[j] + (1 - beta2) * gr[j] * gr[j]; p[j] -= opt.rate * (m[j] / c1) / (Math.sqrt(v[j] / c2) + eps) } }
  for (const key of ['W', 'D']) net[key].forEach((row, i) => update(row, grads[key][i], opt.m[key][i], opt.v[key][i]))
  update(net.b, grads.b, opt.m.b, opt.v.b); update(net.c, grads.c, opt.m.c, opt.v.c)
}
