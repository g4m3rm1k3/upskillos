import { describe, it, expect } from 'vitest'
import { Dense, ReLU, Tanh, Sigmoid, BatchNorm, LayerNorm, Dropout, Sequential, Residual, mse, softmaxCE, bceLogits, Adam } from './nn.js'
import { random, normal } from './math.js'

const batch = (n, d, rng) => Array.from({ length: n }, () => Array.from({ length: d }, () => normal(rng)))

// Compare analytic parameter and input gradients with centred finite differences.
function gradCheck(net, X, lossFn, ctx = { train: true }) {
  net.zeroGrad()
  const { grad } = lossFn(net.forward(X, ctx))
  const dX = net.backward(grad)
  const L = () => lossFn(net.forward(X, ctx)).loss
  let worst = 0
  net.params().forEach(p => { for (let i = 0; i < Math.min(p.w.length, 6); i++) { const o = p.w[i]; p.w[i] = o + 1e-5; const a = L(); p.w[i] = o - 1e-5; const b = L(); p.w[i] = o; worst = Math.max(worst, Math.abs((a - b) / 2e-5 - p.g[i])) } })
  for (let j = 0; j < X[0].length; j++) { const o = X[0][j]; X[0][j] = o + 1e-5; const a = L(); X[0][j] = o - 1e-5; const b = L(); X[0][j] = o; worst = Math.max(worst, Math.abs((a - b) / 2e-5 - dX[0][j])) }
  return worst
}

describe('neural-network toolkit', () => {
  it('backward passes match finite differences for every layer type', () => {
    const rng = random(1), X = batch(8, 4, rng), T = batch(8, 3, rng), labels = [0, 1, 2, 0, 1, 2, 1, 0]
    const nets = [
      new Sequential([new Dense(4, 6, rng), Tanh(), new Dense(6, 3, rng)]),
      new Sequential([new Dense(4, 6, rng), new BatchNorm(6), ReLU(), new Dense(6, 3, rng)]),
      new Sequential([new Dense(4, 6, rng), new LayerNorm(6), Sigmoid(), new Dense(6, 3, rng)]),
      new Sequential([new Dense(4, 4, rng), new Residual(new Sequential([new Dense(4, 4, rng), Tanh()])), new Dense(4, 3, rng)]),
    ]
    nets.forEach(n => expect(gradCheck(n, X, Y => mse(Y, T))).toBeLessThan(1e-6))
    expect(gradCheck(nets[0], X, Y => softmaxCE(Y, labels))).toBeLessThan(1e-6)
    expect(gradCheck(nets[0], X, Y => bceLogits(Y, T.map(t => t.map(v => (v > 0 ? 1 : 0)))))).toBeLessThan(1e-6)
  })
  it('dropout is the identity at evaluation and preserves the mean in training', () => {
    const rng = random(2), d = new Dropout(0.5), X = [Array(4000).fill(1)]
    expect(d.forward(X, { train: false })).toBe(X)
    const Y = d.forward(X, { train: true, rng }), m = Y[0].reduce((a, b) => a + b, 0) / 4000
    expect(m).toBeGreaterThan(0.93); expect(m).toBeLessThan(1.07)
  })
  it('Adam fits a small regression', () => {
    const rng = random(3), X = batch(64, 2, rng), T = X.map(x => [Math.sin(x[0]) + 0.5 * x[1]])
    const net = new Sequential([new Dense(2, 16, rng), Tanh(), new Dense(16, 1, rng)]), opt = new Adam(net.params(), { lr: 0.02 })
    let loss
    for (let i = 0; i < 400; i++) { net.zeroGrad(); const r = mse(net.forward(X), T); loss = r.loss; net.backward(r.grad); opt.step() }
    expect(loss).toBeLessThan(0.01)
  })
})
