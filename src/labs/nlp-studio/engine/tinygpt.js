// Part 5's tiny GPT: python/tinygpt.py in JavaScript, operation for operation in the same order,
// so that training gives the same numbers (parity5.test.js checks). Plus what the page needs: a
// trainer that runs a few steps at a time, attention weights for the figure, and saving and
// loading the model as a .safetensors file (the format PyTorch and Hugging Face use).
import { Rng } from './vectors.js'

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
    const exps = visible.map(x => Math.exp(x - top)), total = exps.reduce((s, x) => s + x, 0)
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
    const top = Math.max(...row), exps = row.map(x => Math.exp(x - top)), total = exps.reduce((s, x) => s + x, 0)
    const p = exps.map(e => e / total)
    probs.push(p)
    loss -= weights[i] * Math.log(p[targets[i]])
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

export function through(x, w, name, lora) {
  let out = matmul(x, w[name])
  if (lora && lora.targets.includes(name)) out = add(out, scale(matmul(matmul(x, w[name + '.a']), w[name + '.b']), lora.scale))
  return out
}

export function forward(model, ids, useAttention = true, lora = null) {
  const w = Object.fromEntries(PARAMS.map(n => [n, new Tensor(model[n])]))
  if (lora) for (const name of lora.targets) { w[name + '.a'] = new Tensor(lora.a[name]); w[name + '.b'] = new Tensor(lora.b[name]) }
  const dim = model.wq.length
  let x = add(embed(w.tok, ids), embed(w.pos, ids.map((_, i) => i)))
  let weights = null
  if (useAttention) {
    const q = through(x, w, 'wq', lora), k = through(x, w, 'wk', lora), v = through(x, w, 'wv', lora)
    weights = causalSoftmax(scale(matmul(q, transpose(k)), 1 / Math.sqrt(dim)))
    x = add(x, through(matmul(weights, v), w, 'wo', lora))
  }
  x = add(x, through(relu(through(x, w, 'w1', lora)), w, 'w2', lora))
  return [matmul(x, w.out), w, weights]
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

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
export const vocabOf = text => [...new Set([...text])].sort(byCodePoint)

// A trainer the page can run in slices: trainer.step(n) runs n steps and returns the latest losses.
export function makeTrainer(text, { dim = 16, context = 16, hidden = 64, lr = 0.01, seed = 1, useAttention = true, vocab = vocabOf(text), model = null } = {}) {
  const chars = [...text]
  const index = Object.fromEntries(vocab.map((c, k) => [c, k]))
  model ??= initModel(vocab.length, dim, context, hidden, seed)
  const ctx = model.pos.length
  const state = { t: 0, b1t: 1, b2t: 1, m: Object.fromEntries(PARAMS.map(n => [n, zeros(model[n].length, model[n][0].length)])), v: Object.fromEntries(PARAMS.map(n => [n, zeros(model[n].length, model[n][0].length)])) }
  const rng = new Rng(seed + 1)
  const losses = []
  return {
    vocab, model, losses, state,
    step(n = 1) {
      for (let s = 0; s < n; s++) {
        const start = rng.below(chars.length - ctx - 1)
        const ids = chars.slice(start, start + ctx).map(c => index[c]), targets = chars.slice(start + 1, start + ctx + 1).map(c => index[c])
        const [logits, weights] = forward(model, ids, useAttention)
        const loss = crossEntropy(logits, targets)
        loss.backward()
        adamStep(model, Object.fromEntries(PARAMS.map(p => [p, weights[p].grad])), state, lr)
        losses.push(loss.data[0][0])
      }
      return losses
    },
  }
}
export function train(text, steps, options) { const t = makeTrainer(text, options); t.step(steps); return [t.vocab, t.model, t.losses] }

export function generate(vocab, model, prompt, length, temperature, rng, useAttention = true) {
  const index = Object.fromEntries(vocab.map((c, k) => [c, k]))
  const context = model.pos.length
  const ids = [...prompt].filter(c => c in index).map(c => index[c])
  for (let n = 0; n < length; n++) {
    const [logits] = forward(model, ids.slice(-context), useAttention)
    const scaled = logits.data.at(-1).map(x => x / temperature), top = Math.max(...scaled)
    const exps = scaled.map(x => Math.exp(x - top)), total = exps.reduce((s, x) => s + x, 0)
    const r = rng.random()
    let acc = 0, choice = exps.length - 1
    for (let j = 0; j < exps.length; j++) { acc += exps[j] / total; if (r < acc) { choice = j; break } }
    ids.push(choice)
  }
  return ids.map(i => vocab[i]).join('')
}

// The attention weights of the last 16 characters of a text: who looks at whom.
export function attentionOf(vocab, model, text) {
  const index = Object.fromEntries(vocab.map((c, k) => [c, k]))
  const ids = [...text].filter(c => c in index).slice(-model.pos.length).map(c => index[c])
  const [, , weights] = forward(model, ids)
  return { chars: ids.map(i => vocab[i]), weights: weights.data }
}

// .safetensors: 8 bytes (the header's length, little-endian), a JSON header naming each tensor's
// type, shape and byte range, then the raw little-endian float32 numbers. Vocabulary and sizes
// go in the header's __metadata__ (whose values must be strings).
export function toSafetensors(vocab, model) {
  const header = { __metadata__: { format: 'upskillos-tiny-gpt', version: '1', vocab: JSON.stringify(vocab) } }
  let offset = 0
  for (const name of PARAMS) {
    const rows = model[name].length, cols = model[name][0].length, bytes = rows * cols * 4
    header[name] = { dtype: 'F32', shape: [rows, cols], data_offsets: [offset, offset + bytes] }
    offset += bytes
  }
  let json = JSON.stringify(header)
  while ((8 + new TextEncoder().encode(json).length) % 8) json += ' '   // the data starts 8-byte aligned
  const head = new TextEncoder().encode(json)
  const buffer = new ArrayBuffer(8 + head.length + offset), view = new DataView(buffer)
  view.setBigUint64(0, BigInt(head.length), true)
  new Uint8Array(buffer, 8, head.length).set(head)
  let at = 8 + head.length
  for (const name of PARAMS) for (const row of model[name]) for (const x of row) { view.setFloat32(at, x, true); at += 4 }
  return new Uint8Array(buffer)
}
// Read a file back, checking it before trusting it. Returns { vocab, model } or throws with a reason.
export function fromSafetensors(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 8) throw new Error('The file is too short to be a .safetensors file.')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const n = Number(view.getBigUint64(0, true))
  if (n <= 0 || 8 + n > bytes.length) throw new Error('The header length at the start of the file doesn’t fit the file.')
  let header
  try { header = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + n))) } catch { throw new Error('The header isn’t valid JSON.') }
  if (header.__metadata__?.format !== 'upskillos-tiny-gpt') throw new Error('This isn’t a tiny GPT saved by NLP Studio.')
  const vocab = JSON.parse(header.__metadata__.vocab)
  const model = {}
  for (const name of PARAMS) {
    const t = header[name]
    if (!t || t.dtype !== 'F32' || t.shape?.length !== 2) throw new Error(`The weight “${name}” is missing or not a float32 matrix.`)
    const [rows, cols] = t.shape, [start, end] = t.data_offsets
    if (end - start !== rows * cols * 4 || 8 + n + end > bytes.length) throw new Error(`The weight “${name}” has the wrong size.`)
    model[name] = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => view.getFloat32(8 + n + start + (i * cols + j) * 4, true)))
  }
  const dim = model.wq.length
  const expect = { tok: [vocab.length, dim], pos: [model.pos.length, dim], wk: [dim, dim], wv: [dim, dim], wo: [dim, dim], w1: [dim, model.w1[0].length], w2: [model.w1[0].length, dim], out: [dim, vocab.length] }
  for (const [name, [r, c]] of Object.entries(expect)) if (model[name].length !== r || model[name][0].length !== c) throw new Error(`The weight “${name}” has shape ${model[name].length}×${model[name][0].length}, expected ${r}×${c}.`)
  return { vocab, model }
}

export function averageLoss(vocab, model, text, useAttention = true) {
  const index = Object.fromEntries(vocab.map((c, k) => [c, k]))
  const chars = [...text].filter(c => c in index)
  const context = model.pos.length
  let total = 0, windows = 0
  for (let start = 0; start < chars.length - context; start += context) {
    const ids = chars.slice(start, start + context).map(c => index[c]), targets = chars.slice(start + 1, start + context + 1).map(c => index[c])
    total += crossEntropy(forward(model, ids, useAttention)[0], targets).data[0][0]
    windows++
  }
  return windows ? total / windows : NaN
}

// The split the trainer uses: the last fifth of the text is never trained on.
export function splitText(text) {
  const chars = [...text], cut = Math.floor(chars.length * 0.8)
  return [chars.slice(0, cut).join(''), chars.slice(cut).join('')]
}

// python/tinygpt.py's read_header: (the header, where the numbers begin).
export function readHeader(data) {
  const bytes = Uint8Array.from(data)
  let n = 0
  for (let i = 7; i >= 0; i--) n = n * 256 + bytes[i]
  return [JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + n))), 8 + n]
}
