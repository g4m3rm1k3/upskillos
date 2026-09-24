// Regularization and normalization for neural networks: dropout, weight decay,
// input augmentation and early stopping on a small, noisy dataset; and how
// depth, batch/layer normalization and residual connections affect gradients.
import { random, normal, range, mean } from '../../kit/math.js'
import { Dense, ReLU, Tanh, Dropout, BatchNorm, LayerNorm, Sequential, Residual, softmaxCE, Adam } from '../../kit/nn.js'

// Two interleaved spirals with 10% of training labels flipped.
export function spirals(n, seed, flip = 0) {
  const rng = random(seed)
  return range(n).map(i => { const c = i % 2, t = 0.25 + 2.4 * rng(), a = 2.6 * t + c * Math.PI, r = t
    return { x: [r * Math.cos(a) + 0.12 * normal(rng), r * Math.sin(a) + 0.12 * normal(rng)], y: rng() < flip ? 1 - c : c } })
}
export const TRAIN = spirals(80, 52, 0.1), VAL = spirals(600, 99)

export function buildNet({ hidden = 48, dropout = 0, seed = 1 } = {}) {
  const rng = random(seed)
  const layers = [new Dense(2, hidden, rng), ReLU()]
  if (dropout) layers.push(new Dropout(dropout))
  layers.push(new Dense(hidden, hidden, rng), ReLU())
  if (dropout) layers.push(new Dropout(dropout))
  layers.push(new Dense(hidden, 2, rng))
  return new Sequential(layers)
}
export const accuracy = (net, data) => mean(data.map(d => { const z = net.forward([d.x])[0]; return (z[1] > z[0] ? 1 : 0) === d.y ? 1 : 0 }))
export const lossOn = (net, data) => softmaxCE(net.forward(data.map(d => d.x)), data.map(d => d.y)).loss

// Full-batch training with optional dropout, weight decay and input jitter.
export function train({ epochs = 400, lr = 0.01, dropout = 0, weightDecay = 0, jitter = 0, seed = 1, every = 10 } = {}) {
  const net = buildNet({ dropout, seed }), opt = new Adam(net.params(), { lr, weightDecay }), rng = random(seed + 7)
  const log = []
  for (let e = 0; e <= epochs; e++) {
    if (e % every === 0) log.push({ epoch: e, train: lossOn(net, TRAIN), val: lossOn(net, VAL), valAcc: accuracy(net, VAL), trainAcc: accuracy(net, TRAIN) })
    if (e === epochs) break
    net.zeroGrad()
    const X = TRAIN.map(d => jitter ? [d.x[0] + jitter * normal(rng), d.x[1] + jitter * normal(rng)] : d.x)
    const r = softmaxCE(net.forward(X, { train: true, rng }), TRAIN.map(d => d.y))
    net.backward(r.grad); opt.step()
  }
  const best = log.reduce((b, l) => l.val < b.val ? l : b)
  return { net, log, best }
}

// ---------- Depth and gradient flow ----------
export function deepNet(depth, { width = 24, norm = 'none', residual = false, act = 'tanh', seed = 3 } = {}) {
  const rng = random(seed), A = () => (act === 'tanh' ? Tanh() : ReLU())
  const layers = [new Dense(2, width, rng, { init: act === 'tanh' ? 'xavier' : 'he' })]
  for (let i = 0; i < depth; i++) {
    const inner = [new Dense(width, width, rng, { init: act === 'tanh' ? 'xavier' : 'he' })]
    if (norm === 'batch') inner.push(new BatchNorm(width))
    if (norm === 'layer') inner.push(new LayerNorm(width))
    inner.push(A())
    layers.push(residual ? new Residual(new Sequential(inner)) : new Sequential(inner))
  }
  layers.push(new Dense(width, 2, rng))
  return new Sequential(layers)
}
// Gradient norm reaching each hidden block's weights at initialization.
export function layerGradNorms(net) {
  net.zeroGrad()
  const r = softmaxCE(net.forward(TRAIN.map(d => d.x), { train: true, rng: random(1) }), TRAIN.map(d => d.y))
  net.backward(r.grad)
  return net.layers.slice(1, -1).map(l => Math.sqrt(l.params().filter(q => q.decay).reduce((t, q) => t + q.g.reduce((u, g) => u + g * g, 0), 0)))
}
export function trainDeep(depth, opts, steps = 100) {
  const net = deepNet(depth, opts), opt = new Adam(net.params(), { lr: 0.003, clip: 1 }), X = TRAIN.map(d => d.x), Y = TRAIN.map(d => d.y), rng = random(5), curve = []
  for (let s = 0; s < steps; s++) { net.zeroGrad(); const r = softmaxCE(net.forward(X, { train: true, rng }), Y); curve.push(r.loss); net.backward(r.grad); opt.step() }
  return curve
}
export const ARCHS = {
  tanh: { name: 'Plain, tanh', opts: {} },
  relu: { name: 'Plain, ReLU', opts: { act: 'relu' } },
  bn: { name: 'tanh + batch norm', opts: { norm: 'batch' } },
  res: { name: 'tanh + residual connections', opts: { residual: true } },
  resln: { name: 'ReLU + layer norm + residual (transformer-style)', opts: { act: 'relu', norm: 'layer', residual: true } },
}
