// LLM Lab's model: python/gpt.py in JavaScript, operation for operation in the same order, so
// that training gives exactly the same numbers (parity.test.js checks against recorded Python
// runs). It starts from NLP Studio's tiny GPT (nlp-studio/engine/tinygpt.js).

export class Rng {
  constructor(seed) { this.state = seed % 4294967296 }
  // state * 1664525 stays below 2^53, so this is exact in a JavaScript number.
  random() { this.state = (this.state * 1664525 + 1013904223) % 4294967296; return this.state / 4294967296 }
  below(n) { return Math.floor(this.random() * n) }
}

// Plain left-to-right adding, like python/gpt.py's total().
export const total = xs => { let s = 0; for (const x of xs) s += x; return s }

export const LN2 = 0.6931471805599453

// exp and log with only + - * /, so the bits match Python's (python/gpt.py explains why).
export function exp(x) {
  let k = Math.floor(x / LN2 + 0.5)
  const r = x - k * LN2
  let term = 1, series = 1
  for (let n = 1; n < 18; n++) { term = term * r / n; series += term }
  while (k > 0) { series *= 2; k -= 1 }
  while (k < 0) { series /= 2; k += 1 }
  return series
}
export function log(x) {
  let e = 0
  while (x >= 2) { x /= 2; e += 1 }
  while (x < 1) { x *= 2; e -= 1 }
  const s = (x - 1) / (x + 1)
  let term = s, series = 0
  for (let n = 0; n < 30; n++) { series += term / (2 * n + 1); term = term * s * s }
  return e * LN2 + 2 * series
}

export class Tensor {
  constructor(data, parents = [], backward = null) {
    this.data = data
    this.grad = data.map(row => row.map(() => 0))
    this.parents = parents
    this.backwardStep = backward
  }
  backward() {
    const order = [], seen = new Set()
    const visit = t => { if (seen.has(t)) return; seen.add(t); for (const p of t.parents) visit(p); order.push(t) }
    visit(this)
    this.grad = [[1]]
    for (let k = order.length - 1; k >= 0; k--) order[k].backwardStep?.()
  }
}
export const zeros = (rows, cols) => Array.from({ length: rows }, () => Array(cols).fill(0))

export function matmul(a, b) {
  const n = a.data.length, k = b.data.length, m = b.data[0].length
  const data = Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, j) => { let s = 0; for (let r = 0; r < k; r++) s += a.data[i][r] * b.data[r][j]; return s }))
  const out = new Tensor(data, [a, b])
  out.backwardStep = () => {
    for (let i = 0; i < n; i++) for (let r = 0; r < k; r++) for (let j = 0; j < m; j++) {
      const g = out.grad[i][j]
      a.grad[i][r] += g * b.data[r][j]
      b.grad[r][j] += g * a.data[i][r]
    }
  }
  return out
}
export function add(a, b) {
  const out = new Tensor(a.data.map((row, i) => row.map((x, j) => x + b.data[i][j])), [a, b])
  out.backwardStep = () => out.grad.forEach((row, i) => row.forEach((g, j) => { a.grad[i][j] += g; b.grad[i][j] += g }))
  return out
}
export function relu(a) {
  const out = new Tensor(a.data.map(row => row.map(x => Math.max(0, x))), [a])
  out.backwardStep = () => out.grad.forEach((row, i) => row.forEach((g, j) => { if (a.data[i][j] > 0) a.grad[i][j] += g }))
  return out
}
export function transpose(a) {
  const out = new Tensor(a.data[0].map((_, j) => a.data.map(row => row[j])), [a])
  out.backwardStep = () => out.grad.forEach((row, i) => row.forEach((g, j) => { a.grad[j][i] += g }))
  return out
}
export function scale(a, s) {
  const out = new Tensor(a.data.map(row => row.map(x => x * s)), [a])
  out.backwardStep = () => out.grad.forEach((row, i) => row.forEach((g, j) => { a.grad[i][j] += g * s }))
  return out
}
export function causalSoftmax(a) {
  const rows = a.data.map((row, i) => {
    const visible = row.slice(0, i + 1), top = Math.max(...visible)
    const exps = visible.map(x => exp(x - top)), total = exps.reduce((s, x) => s + x, 0)
    return [...exps.map(e => e / total), ...Array(row.length - i - 1).fill(0)]
  })
  const out = new Tensor(rows, [a])
  out.backwardStep = () => out.data.forEach((p, i) => {
    const g = out.grad[i]
    let inner = 0
    for (let j = 0; j <= i; j++) inner += p[j] * g[j]
    for (let j = 0; j <= i; j++) a.grad[i][j] += p[j] * (g[j] - inner)
  })
  return out
}
export function embed(table, ids) {
  const out = new Tensor(ids.map(t => [...table.data[t]]), [table])
  out.backwardStep = () => ids.forEach((t, i) => out.grad[i].forEach((g, j) => { table.grad[t][j] += g }))
  return out
}
export function crossEntropy(logits, targets, weights = null) {
  weights ??= targets.map(() => 1)
  const n = weights.reduce((s, w) => s + w, 0), probs = []
  let loss = 0
  logits.data.forEach((row, i) => {
    const top = Math.max(...row), exps = row.map(x => exp(x - top)), total = exps.reduce((s, x) => s + x, 0)
    const p = exps.map(e => e / total)
    probs.push(p)
    loss -= weights[i] * log(p[targets[i]])
  })
  const out = new Tensor([[loss / n]], [logits])
  out.backwardStep = () => {
    const g = out.grad[0][0] / n
    probs.forEach((p, i) => p.forEach((pj, j) => { logits.grad[i][j] += g * weights[i] * (pj - (j === targets[i] ? 1 : 0)) }))
  }
  return out
}

export const PARAMS = ['tok', 'pos', 'wq', 'wk', 'wv', 'wo', 'w1', 'w2', 'out']

export function initModel(vocabSize, dim = 16, context = 16, hidden = 64, seed = 1) {
  const rng = new Rng(seed)
  const shapes = { tok: [vocabSize, dim], pos: [context, dim], wq: [dim, dim], wk: [dim, dim], wv: [dim, dim], wo: [dim, dim], w1: [dim, hidden], w2: [hidden, dim], out: [dim, vocabSize] }
  const model = {}
  for (const name of PARAMS) {
    const [rows, cols] = shapes[name]
    const size = 1 / Math.sqrt(name !== 'tok' && name !== 'pos' ? rows : dim)
    model[name] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => (rng.random() * 2 - 1) * size))
  }
  return model
}

export function forward(model, ids) {
  const w = Object.fromEntries(PARAMS.map(n => [n, new Tensor(model[n])]))
  const dim = model.wq.length
  let x = add(embed(w.tok, ids), embed(w.pos, ids.map((_, i) => i)))
  const q = matmul(x, w.wq), k = matmul(x, w.wk), v = matmul(x, w.wv)
  const weights = causalSoftmax(scale(matmul(q, transpose(k)), 1 / Math.sqrt(dim)))
  x = add(x, matmul(matmul(weights, v), w.wo))
  x = add(x, matmul(relu(matmul(x, w.w1)), w.w2))
  return [matmul(x, w.out), w, weights]
}

export function newAdamState(model) {
  return { t: 0, b1t: 1, b2t: 1, m: Object.fromEntries(PARAMS.map(n => [n, zeros(model[n].length, model[n][0].length)])), v: Object.fromEntries(PARAMS.map(n => [n, zeros(model[n].length, model[n][0].length)])) }
}

export function adamStep(model, grads, state, lr = 0.01, b1 = 0.9, b2 = 0.99, eps = 1e-8) {
  state.t += 1
  state.b1t *= b1
  state.b2t *= b2
  for (const name of Object.keys(grads)) {
    const m = state.m[name], v = state.v[name], wt = model[name], g = grads[name]
    for (let i = 0; i < wt.length; i++) for (let j = 0; j < wt[0].length; j++) {
      m[i][j] = b1 * m[i][j] + (1 - b1) * g[i][j]
      v[i][j] = b2 * v[i][j] + (1 - b2) * g[i][j] * g[i][j]
      const mHat = m[i][j] / (1 - state.b1t), vHat = v[i][j] / (1 - state.b2t)
      wt[i][j] -= lr * mHat / (Math.sqrt(vHat) + eps)
    }
  }
}

export function trainStep(model, state, ids, targets, weights = null, lr = 0.01) {
  const [logits, w] = forward(model, ids)
  const loss = crossEntropy(logits, targets, weights)
  loss.backward()
  adamStep(model, Object.fromEntries(PARAMS.map(n => [n, w[n].grad])), state, lr)
  return loss.data[0][0]
}

export function nextLogits(model, ids) {
  const context = model.pos.length
  const [logits] = forward(model, ids.slice(-context))
  return logits.data.at(-1)
}

export function argmax(row) {
  let best = 0
  for (let j = 1; j < row.length; j++) if (row[j] > row[best]) best = j
  return best
}

export function greedy(model, ids, stop, limit) {
  const out = []
  for (let n = 0; n < limit; n++) {
    const t = argmax(nextLogits(model, [...ids, ...out]))
    if (t === stop) break
    out.push(t)
  }
  return out
}
