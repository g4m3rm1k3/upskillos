// Part 1's Python programs in JavaScript, operation for operation, with Python's own random numbers
// (the Mersenne Twister from the QMaze lab): data.py, neuron.py, layer.py and tinynet.py.
// parity.test.js checks them against the real programs' output.
import { PyRandom } from '../../qmaze-lab/engine/mt.js'

// data.py
export function makeLine(n = 20, seed = 0) {
  const rng = new PyRandom(seed), xs = [], ys = []
  const u = (a, b) => a + (b - a) * rng.random()
  for (let i = 0; i < n; i++) { const x = u(0, 5); xs.push(x); ys.push(2 * x + 1 + u(-1, 1)) }
  return [xs, ys]
}
export function makeCurve(n = 40, seed = 0) {
  const rng = new PyRandom(seed), xs = [], ys = []
  const u = (a, b) => a + (b - a) * rng.random()
  for (let i = 0; i < n; i++) { const x = u(-3, 3); xs.push(x); ys.push(Math.sin(x) + u(-0.1, 0.1)) }
  return [xs, ys]
}

// neuron.py
export const predict = (w, b, x) => w * x + b
export function mse(w, b, xs, ys) {
  let total = 0
  xs.forEach((x, i) => { const e = predict(w, b, x) - ys[i]; total += e ** 2 })
  return total / xs.length
}
export function gradients(w, b, xs, ys) {
  let gw = 0, gb = 0
  xs.forEach((x, i) => { const e = predict(w, b, x) - ys[i]; gw += 2 * e * x / xs.length; gb += 2 * e / xs.length })
  return [gw, gb]
}
export function fitLine({ steps = 500, rate = 0.02, seed = 0, start = [0, 0] } = {}) {
  const [xs, ys] = makeLine(20, seed)
  let [w, b] = start
  const history = [], path = [[w, b]]
  for (let s = 0; s < steps; s++) {
    const [gw, gb] = gradients(w, b, xs, ys)
    w = w - rate * gw; b = b - rate * gb
    history.push(mse(w, b, xs, ys)); path.push([w, b])
  }
  return { w, b, history, path }
}

// layer.py
export function dense(inputs, weights, biases) {
  return weights.map((row, k) => { let total = biases[k]; row.forEach((w, i) => { total += w * inputs[i] }); return total })
}
export const ACTIVATIONS = {
  relu: { label: 'ReLU', f: v => Math.max(0, v), d: v => v > 0 ? 1 : 0, formula: '\\max(0, z)' },
  sigmoid: { label: 'sigmoid', f: v => 1 / (1 + Math.exp(-v)), d: v => { const s = 1 / (1 + Math.exp(-v)); return s * (1 - s) }, formula: '\\frac{1}{1 + e^{-z}}' },
  tanh: { label: 'tanh', f: v => Math.tanh(v), d: v => 1 - Math.tanh(v) ** 2, formula: '\\tanh z' },
  none: { label: 'none (linear)', f: v => v, d: () => 1, formula: 'z' },
}

// tinynet.py
export function initNet(hidden = 8, seed = 0) {
  const rng = new PyRandom(seed), u = (a, b) => a + (b - a) * rng.random()
  const w1 = Array.from({ length: hidden }, () => u(-1, 1))
  const b1 = Array.from({ length: hidden }, () => u(-1, 1))
  const bound = 1 / Math.sqrt(hidden)
  const w2 = Array.from({ length: hidden }, () => u(-bound, bound))
  const b2 = u(-bound, bound)
  return { w1, b1, w2, b2 }
}
export function forward(net, x) {
  const z = net.w1.map((w, j) => w * x + net.b1[j])
  const h = z.map(v => Math.max(0, v))
  let yHat = net.b2
  net.w2.forEach((w, j) => { yHat += w * h[j] })
  return { yHat, z, h }
}
export function backward(net, x, y, { yHat, z, h }) {
  const dYHat = 2 * (yHat - y)
  const g = { w1: [], b1: [], w2: [], b2: dYHat, dH: [], dZ: [] }
  h.forEach((hj, j) => {
    g.w2.push(dYHat * hj)
    const dH = dYHat * net.w2[j], dZ = z[j] > 0 ? dH : 0
    g.dH.push(dH); g.dZ.push(dZ)
    g.w1.push(dZ * x); g.b1.push(dZ)
  })
  return g
}
export function trainStep(net, xs, ys, rate) {
  const n = xs.length
  const total = { w1: net.w1.map(() => 0), b1: net.b1.map(() => 0), w2: net.w2.map(() => 0), b2: 0 }
  let loss = 0
  xs.forEach((x, i) => {
    const f = forward(net, x)
    loss += (f.yHat - ys[i]) ** 2 / n
    const g = backward(net, x, ys[i], f)
    for (const name of ['w1', 'b1', 'w2']) for (let j = 0; j < net[name].length; j++) total[name][j] += g[name][j] / n
    total.b2 += g.b2 / n
  })
  for (const name of ['w1', 'b1', 'w2']) for (let j = 0; j < net[name].length; j++) net[name][j] -= rate * total[name][j]
  net.b2 -= rate * total.b2
  return loss
}
export function trainNet({ hidden = 8, steps = 2000, rate = 0.05, seed = 0 } = {}) {
  const [xs, ys] = makeCurve(40, seed)
  const net = initNet(hidden, seed), history = []
  for (let s = 0; s < steps; s++) history.push(trainStep(net, xs, ys, rate))
  return { net, history }
}

// cars.py's split: random.Random(seed).shuffle, then the first fifth for testing.
export function shuffle(items, seed) {
  const rng = new PyRandom(seed), out = [...items]
  for (let i = out.length - 1; i > 0; i--) { const j = rng.randrange(i + 1);[out[i], out[j]] = [out[j], out[i]] }
  return out
}
