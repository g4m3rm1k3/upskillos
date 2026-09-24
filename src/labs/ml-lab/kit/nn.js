// A small, inspectable neural-network toolkit for the deep-learning labs:
// layers with explicit forward and backward passes, common losses, and Adam.
// Batches are arrays of rows (plain arrays or Float64Arrays).
import { normal } from './math.js'

const zeros = n => new Float64Array(n)

export class Dense {
  constructor(nin, nout, rng, { init = 'he' } = {}) {
    const s = init === 'he' ? Math.sqrt(2 / nin) : init === 'xavier' ? Math.sqrt(1 / nin) : init
    this.nin = nin; this.nout = nout
    this.W = Array.from({ length: nin }, () => Float64Array.from({ length: nout }, () => s * normal(rng)))
    this.b = zeros(nout)
    this.gW = Array.from({ length: nin }, () => zeros(nout)); this.gb = zeros(nout)
  }
  forward(X) {
    this.X = X
    return X.map(x => { const y = Float64Array.from(this.b); for (let i = 0; i < this.nin; i++) { const xi = x[i]; if (xi) { const w = this.W[i]; for (let j = 0; j < this.nout; j++) y[j] += xi * w[j] } } return y })
  }
  backward(dY) {
    const X = this.X
    dY.forEach((d, r) => { const x = X[r]; for (let j = 0; j < this.nout; j++) this.gb[j] += d[j]; for (let i = 0; i < this.nin; i++) { const xi = x[i]; if (xi) { const g = this.gW[i]; for (let j = 0; j < this.nout; j++) g[j] += xi * d[j] } } })
    return dY.map(d => { const dx = zeros(this.nin); for (let i = 0; i < this.nin; i++) { const w = this.W[i]; let s = 0; for (let j = 0; j < this.nout; j++) s += w[j] * d[j]; dx[i] = s } return dx })
  }
  params() { return [...this.W.map((w, i) => ({ w, g: this.gW[i], decay: true })), { w: this.b, g: this.gb, decay: false }] }
}

class Elementwise {
  constructor(f, df) { this.f = f; this.df = df }
  forward(X) { this.X = X; this.Y = X.map(x => x.map(this.f)); return this.Y }
  backward(dY) { return dY.map((d, r) => d.map((v, j) => v * this.df(this.X[r][j], this.Y[r][j]))) }
  params() { return [] }
}
export const ReLU = () => new Elementwise(v => (v > 0 ? v : 0), v => (v > 0 ? 1 : 0))
export const LeakyReLU = (a = 0.1) => new Elementwise(v => (v > 0 ? v : a * v), v => (v > 0 ? 1 : a))
export const Tanh = () => new Elementwise(Math.tanh, (_, y) => 1 - y * y)
export const Sigmoid = () => new Elementwise(v => 1 / (1 + Math.exp(-v)), (_, y) => y * (1 - y))

// Inverted dropout: scale kept units by 1/(1 − p) during training.
export class Dropout {
  constructor(p) { this.p = p }
  forward(X, ctx = {}) {
    if (!ctx.train || !this.p) { this.mask = null; return X }
    this.mask = X.map(x => x.map(() => (ctx.rng() < this.p ? 0 : 1 / (1 - this.p))))
    return X.map((x, r) => x.map((v, j) => v * this.mask[r][j]))
  }
  backward(dY) { return this.mask ? dY.map((d, r) => d.map((v, j) => v * this.mask[r][j])) : dY }
  params() { return [] }
}

// Batch normalization over the batch dimension, with running statistics for evaluation.
export class BatchNorm {
  constructor(dim, momentum = 0.9) { this.dim = dim; this.gamma = Float64Array.from({ length: dim }, () => 1); this.beta = zeros(dim); this.gg = zeros(dim); this.gbeta = zeros(dim); this.rm = zeros(dim); this.rv = Float64Array.from({ length: dim }, () => 1); this.mom = momentum; this.eps = 1e-5 }
  forward(X, ctx = {}) {
    const n = X.length, d = this.dim
    let mu, v
    if (ctx.train) {
      mu = zeros(d); v = zeros(d)
      X.forEach(x => { for (let j = 0; j < d; j++) mu[j] += x[j] / n })
      X.forEach(x => { for (let j = 0; j < d; j++) v[j] += (x[j] - mu[j]) ** 2 / n })
      for (let j = 0; j < d; j++) { this.rm[j] = this.mom * this.rm[j] + (1 - this.mom) * mu[j]; this.rv[j] = this.mom * this.rv[j] + (1 - this.mom) * v[j] }
    } else { mu = this.rm; v = this.rv }
    this.std = Float64Array.from(v, x => Math.sqrt(x + this.eps)); this.train = !!ctx.train
    this.xhat = X.map(x => Float64Array.from({ length: d }, (_, j) => (x[j] - mu[j]) / this.std[j]))
    return this.xhat.map(h => Float64Array.from({ length: d }, (_, j) => this.gamma[j] * h[j] + this.beta[j]))
  }
  backward(dY) {
    const n = dY.length, d = this.dim, dh = dY.map(g => Float64Array.from({ length: d }, (_, j) => g[j] * this.gamma[j]))
    dY.forEach((g, r) => { for (let j = 0; j < d; j++) { this.gg[j] += g[j] * this.xhat[r][j]; this.gbeta[j] += g[j] } })
    if (!this.train) return dh.map(h => h.map((v, j) => v / this.std[j]))
    const s1 = zeros(d), s2 = zeros(d)
    dh.forEach((h, r) => { for (let j = 0; j < d; j++) { s1[j] += h[j]; s2[j] += h[j] * this.xhat[r][j] } })
    return dh.map((h, r) => Float64Array.from({ length: d }, (_, j) => (h[j] - s1[j] / n - this.xhat[r][j] * s2[j] / n) / this.std[j]))
  }
  params() { return [{ w: this.gamma, g: this.gg, decay: false }, { w: this.beta, g: this.gbeta, decay: false }] }
}

// Layer normalization: normalize each example across its features.
export class LayerNorm {
  constructor(dim) { this.dim = dim; this.gamma = Float64Array.from({ length: dim }, () => 1); this.beta = zeros(dim); this.gg = zeros(dim); this.gbeta = zeros(dim); this.eps = 1e-5 }
  forward(X) {
    const d = this.dim
    this.std = []; this.xhat = X.map(x => { let m = 0; for (let j = 0; j < d; j++) m += x[j] / d; let v = 0; for (let j = 0; j < d; j++) v += (x[j] - m) ** 2 / d; const s = Math.sqrt(v + this.eps); this.std.push(s); return Float64Array.from({ length: d }, (_, j) => (x[j] - m) / s) })
    return this.xhat.map(h => Float64Array.from({ length: d }, (_, j) => this.gamma[j] * h[j] + this.beta[j]))
  }
  backward(dY) {
    const d = this.dim
    return dY.map((g, r) => {
      const h = this.xhat[r], dh = Float64Array.from({ length: d }, (_, j) => g[j] * this.gamma[j])
      for (let j = 0; j < d; j++) { this.gg[j] += g[j] * h[j]; this.gbeta[j] += g[j] }
      let s1 = 0, s2 = 0; for (let j = 0; j < d; j++) { s1 += dh[j]; s2 += dh[j] * h[j] }
      return Float64Array.from({ length: d }, (_, j) => (dh[j] - s1 / d - h[j] * s2 / d) / this.std[r])
    })
  }
  params() { return [{ w: this.gamma, g: this.gg, decay: false }, { w: this.beta, g: this.gbeta, decay: false }] }
}

export class Sequential {
  constructor(layers) { this.layers = layers }
  forward(X, ctx = {}) { return this.layers.reduce((h, l) => l.forward(h, ctx), X) }
  backward(dY) { return this.layers.reduceRight((g, l) => l.backward(g), dY) }
  params() { return this.layers.flatMap(l => l.params()) }
  zeroGrad() { this.params().forEach(p => p.g.fill(0)) }
}
// y = x + f(x): the identity path carries gradients straight through.
export class Residual {
  constructor(inner) { this.inner = inner }
  forward(X, ctx) { const f = this.inner.forward(X, ctx); return X.map((x, r) => Float64Array.from(x, (v, j) => v + f[r][j])) }
  backward(dY) { const g = this.inner.backward(dY); return dY.map((d, r) => Float64Array.from(d, (v, j) => v + g[r][j])) }
  params() { return this.inner.params() }
}

// ---------- Losses (mean over the batch) ----------
export function mse(Y, T) {
  const n = Y.length
  let loss = 0
  const grad = Y.map((y, r) => Float64Array.from(y, (v, j) => { const e = v - T[r][j]; loss += e * e / n; return 2 * e / n }))
  return { loss, grad }
}
export function softmaxCE(logits, labels) {
  const n = logits.length
  let loss = 0
  const probs = logits.map(z => { const m = Math.max(...z), e = Array.from(z, v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s) })
  const grad = probs.map((p, r) => { loss -= Math.log(Math.max(p[labels[r]], 1e-300)) / n; return Float64Array.from(p, (v, j) => (v - (j === labels[r] ? 1 : 0)) / n) })
  return { loss, grad, probs }
}
// Binary cross-entropy on logits (numerically stable).
export function bceLogits(logits, targets) {
  const n = logits.length
  let loss = 0
  const grad = logits.map((z, r) => Float64Array.from(z, (v, j) => { const t = targets[r][j]; loss += (Math.max(v, 0) - v * t + Math.log1p(Math.exp(-Math.abs(v)))) / n; return (1 / (1 + Math.exp(-v)) - t) / n }))
  return { loss, grad }
}

// ---------- Optimizer ----------
// Adam with decoupled weight decay (AdamW) on parameters flagged `decay`.
export class Adam {
  constructor(params, { lr = 1e-2, b1 = 0.9, b2 = 0.999, eps = 1e-8, weightDecay = 0, clip = 0 } = {}) {
    this.params = params; this.lr = lr; this.b1 = b1; this.b2 = b2; this.eps = eps; this.wd = weightDecay; this.clip = clip; this.t = 0
    this.m = params.map(p => zeros(p.w.length)); this.v = params.map(p => zeros(p.w.length))
  }
  step() {
    this.t++
    let scale = 1
    if (this.clip) { let s = 0; this.params.forEach(p => p.g.forEach(g => { s += g * g })); const n = Math.sqrt(s); if (n > this.clip) scale = this.clip / n }
    const c1 = 1 - this.b1 ** this.t, c2 = 1 - this.b2 ** this.t
    this.params.forEach((p, k) => {
      const m = this.m[k], v = this.v[k]
      for (let i = 0; i < p.w.length; i++) {
        const g = p.g[i] * scale
        m[i] = this.b1 * m[i] + (1 - this.b1) * g; v[i] = this.b2 * v[i] + (1 - this.b2) * g * g
        p.w[i] -= this.lr * ((m[i] / c1) / (Math.sqrt(v[i] / c2) + this.eps) + (p.decay ? this.wd * p.w[i] : 0))
      }
    })
  }
}
export const paramCount = net => net.params().reduce((s, p) => s + p.w.length, 0)
export const gradNorm = net => Math.sqrt(net.params().reduce((s, p) => s + p.g.reduce((t, g) => t + g * g, 0), 0))
