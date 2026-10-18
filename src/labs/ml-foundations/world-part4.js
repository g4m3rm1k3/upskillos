// Part 4, from tables to formulas: the JavaScript twins of the Python pieces of lessons 12–15 and A3.
// sum() in Python is compensated, so every sum here goes through pySum (world.js).
import { ACTIONS, sampleOutcome, parseMap, buildTable, makeRng, pySum, unkey, openCells } from './world.js'
import { bestOf, choosePiece, greedyRoute } from './world-part3.js'

export const oneHot = (state, states) => states.map(s => (s === state ? 1 : 0))
export const predict = (w, f) => pySum(w.map((wi, i) => wi * f[i]))
export function nudge(w, f, target, alpha) {
  const error = target - predict(w, f)
  return w.map((wi, i) => wi + alpha * error * f[i])
}

export const slope = (f, x, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h)
export function descend(f, x, lr, steps) {
  const xs = [x]
  for (let k = 0; k < steps; k++) { x = x - lr * slope(f, x); xs.push(x) }
  return xs
}
export function fitStep(w, b, data, lr) {
  const n = data.length
  const dw = pySum(data.map(([x, y]) => 2 * (w * x + b - y) * x)) / n
  const db = pySum(data.map(([x, y]) => 2 * (w * x + b - y))) / n
  return [w - lr * dw, b - lr * db]
}
export const meanSquaredError = (w, b, data) => data.reduce((s, [x, y]) => s + (w * x + b - y) ** 2, 0) / data.length

export function forward(params, x) {
  const hidden = params.w1.map((w, i) => Math.tanh(w * x + params.b1[i]))
  const y = pySum(params.w2.map((v, i) => v * hidden[i])) + params.b2
  return [hidden, y]
}
export function gradients(params, x, target) {
  const [hidden, y] = forward(params, x)
  const dy = 2 * (y - target)
  const dz = params.w2.map((v, i) => dy * v * (1 - hidden[i] * hidden[i]))
  return { w1: dz.map(d => d * x), b1: dz, w2: hidden.map(h => dy * h), b2: dy }
}
export function stepNet(params, data, lr) {
  const acc = { w1: params.w1.map(() => 0), b1: params.b1.map(() => 0), w2: params.w2.map(() => 0), b2: 0 }
  for (const [x, t] of data) {
    const gr = gradients(params, x, t)
    for (const k of ['w1', 'b1', 'w2']) gr[k].forEach((v, i) => { acc[k][i] += v / data.length })
    acc.b2 += gr.b2 / data.length
  }
  return { w1: params.w1.map((v, i) => v - lr * acc.w1[i]), b1: params.b1.map((v, i) => v - lr * acc.b1[i]), w2: params.w2.map((v, i) => v - lr * acc.w2[i]), b2: params.b2 - lr * acc.b2 }
}
export function randomNet(hiddenSize, rng) {
  const r = () => (rng.random() * 2 - 1)
  return { w1: Array.from({ length: hiddenSize }, () => r() * 2), b1: Array.from({ length: hiddenSize }, () => r() * 2), w2: Array.from({ length: hiddenSize }, () => r() * 0.5), b2: 0 }
}

export class Replay {
  constructor(capacity) { this.capacity = capacity; this.items = [] }
  add(item) { this.items.push(item); if (this.items.length > this.capacity) this.items.shift() }
  sample(n, rng) { return Array.from({ length: n }, () => this.items[Math.floor(rng.random() * this.items.length)]) }
}
export function batchNudge(w, batch, alpha) {
  const total = w.map(() => 0)
  for (const [f, target] of batch) {
    const error = target - predict(w, f)
    f.forEach((fi, i) => { total[i] += error * fi })
  }
  return w.map((wi, i) => wi + alpha * total[i] / batch.length)
}

export const tableFeatures = text => { const squares = openCells(parseMap(text)); return s => oneHot(s, squares) }
export const coordFeatures = text => { const m = parseMap(text); return s => { const [r, c] = unkey(s); return [r / (m.rows - 1), c / (m.cols - 1), 1] } }

export function trainFormula(text, features, { episodes = 300, alpha = 0.1, g = 0.9, eps = 0.2, rng = makeRng(0), batch = 8, capacity = 1000, onEpisode } = {}) {
  const maze = parseMap(text), table = buildTable(maze, 0)
  const size = features(maze.start).length
  const w = Object.fromEntries(ACTIONS.map(a => [a, Array(size).fill(0)]))
  const memory = new Replay(capacity)
  const qRow = s => (Object.keys(table[s]).length ? Object.fromEntries(ACTIONS.map(a => [a, predict(w[a], features(s))])) : {})
  for (let e = 0; e < episodes; e++) {
    let state = maze.start, steps = 0
    for (let t = 0; t < 200; t++) {
      if (!Object.keys(table[state]).length) break
      const action = choosePiece(qRow(state), eps, rng)
      const [nxt, reward] = sampleOutcome(table[state][action], rng.random())
      memory.add([state, action, reward, nxt])
      const sample = memory.sample(batch, rng)
      for (const a of ACTIONS) {
        const items = sample.filter(([, a2]) => a2 === a).map(([s, , r, n]) => [features(s), r + g * bestOf(qRow(n))])
        if (items.length) w[a] = batchNudge(w[a], items, alpha)
      }
      state = nxt; steps++
    }
    onEpisode?.({ episode: e, steps, w })
  }
  return w
}

export function formulaRoute(w, features, text, cap = 100) {
  const maze = parseMap(text)
  const q = Object.fromEntries(openCells(maze).map(s => [s, Object.fromEntries(ACTIONS.map(a => [a, predict(w[a], features(s))]))]))
  return greedyRoute(q, text, cap)
}
