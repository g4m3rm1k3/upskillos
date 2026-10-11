// A small fully connected network in plain JavaScript, everything written out: layers of neurons with
// an activation each, forward on a batch, backpropagation by the chain rule, and SGD, momentum or
// Adam steps. It is what the Model Studio and the lessons' live trainers run. Weights start the way
// PyTorch's nn.Linear starts them: uniform in ±1/√(inputs), here from Python's random numbers.
import { PyRandom } from '../../qmaze-lab/engine/mt.js'
import { ACTIVATIONS } from './part1.js'

// layers: [{ units, activation }] after an input of `inputs` numbers.
export function makeMLP(inputs, layers, seed = 0) {
  const rng = new PyRandom(seed), u = (a, b) => a + (b - a) * rng.random()
  let fanIn = inputs
  const net = layers.map(({ units, activation = 'none' }) => {
    const bound = 1 / Math.sqrt(fanIn)
    const W = Array.from({ length: units }, () => Array.from({ length: fanIn }, () => u(-bound, bound)))
    const b = Array.from({ length: units }, () => u(-bound, bound))
    fanIn = units
    return { W, b, activation }
  })
  return { inputs, layers: net }
}

export const countWeights = net => net.layers.reduce((n, l) => n + l.W.length * (l.W[0]?.length ?? 0) + l.b.length, 0)

// One input row through the network; keeps every layer's z (before activation) and a (after).
export function forwardOne(net, x) {
  const zs = [], as = [x]
  let a = x
  for (const layer of net.layers) {
    const z = layer.W.map((row, k) => row.reduce((s, w, i) => s + w * a[i], layer.b[k]))
    a = z.map(ACTIVATIONS[layer.activation].f)
    zs.push(z); as.push(a)
  }
  return { out: a, zs, as }
}
export const predictOne = (net, x) => forwardOne(net, x).out

// The loss over a batch, and its gradient for every weight. lossKind: 'mse' (mean squared error) or
// 'bce' (binary cross-entropy on the last layer's raw output, the logit, as PyTorch's
// BCEWithLogitsLoss does it: p = sigmoid(z), and the slope with respect to z is simply p − y).
export function lossAndGradients(net, X, Y, lossKind = 'mse') {
  const grads = net.layers.map(l => ({ W: l.W.map(r => r.map(() => 0)), b: l.b.map(() => 0) }))
  let loss = 0
  const n = X.length
  X.forEach((x, i) => {
    const { out, zs, as } = forwardOne(net, x)
    let d
    if (lossKind === 'bce') {
      // −[y log p + (1 − y) log(1 − p)], written so a large |z| can't overflow (as PyTorch does)
      out.forEach((z, k) => { loss += (Math.max(z, 0) - z * Y[i][k] + Math.log1p(Math.exp(-Math.abs(z)))) / n })
      d = out.map((z, k) => (1 / (1 + Math.exp(-z)) - Y[i][k]) / n)
    } else {
      // dL/d(output): the mean squared error's slope, 2 (ŷ − y) / n
      d = out.map((o, k) => 2 * (o - Y[i][k]) / n)
      out.forEach((o, k) => { loss += (o - Y[i][k]) ** 2 / n })
    }
    for (let l = net.layers.length - 1; l >= 0; l--) {
      const layer = net.layers[l], act = ACTIVATIONS[layer.activation]
      const dz = d.map((g, k) => g * act.d(zs[l][k]))
      const aPrev = as[l]
      dz.forEach((g, k) => { grads[l].b[k] += g; aPrev.forEach((a, j) => { grads[l].W[k][j] += g * a }) })
      d = aPrev.map((_, j) => dz.reduce((s, g, k) => s + g * layer.W[k][j], 0))
    }
  })
  return { loss, grads }
}

export function makeOptimizer(net, { kind = 'sgd', rate = 0.01, momentum = 0.9, beta1 = 0.9, beta2 = 0.999, eps = 1e-8 } = {}) {
  const zero = () => net.layers.map(l => ({ W: l.W.map(r => r.map(() => 0)), b: l.b.map(() => 0) }))
  return { kind, rate, momentum, beta1, beta2, eps, t: 0, m: zero(), v: zero() }
}

// One step for every weight: plain SGD, momentum, or Adam (as torch.optim does them).
export function optimizerStep(net, opt, grads) {
  opt.t += 1
  const { kind, rate } = opt
  const c1 = 1 - opt.beta1 ** opt.t, c2 = 1 - opt.beta2 ** opt.t
  const update = (p, g, m, v, set, k, j) => {
    if (kind === 'sgd') return p - rate * g
    if (kind === 'momentum') { const buf = opt.momentum * m.get() + g; m.set(buf); return p - rate * buf }
    const mm = opt.beta1 * m.get() + (1 - opt.beta1) * g, vv = opt.beta2 * v.get() + (1 - opt.beta2) * g * g
    m.set(mm); v.set(vv)
    return p - rate * (mm / c1) / (Math.sqrt(vv / c2) + opt.eps)
  }
  net.layers.forEach((layer, l) => {
    layer.W.forEach((row, k) => row.forEach((w, j) => {
      row[j] = update(w, grads[l].W[k][j], { get: () => opt.m[l].W[k][j], set: x => { opt.m[l].W[k][j] = x } }, { get: () => opt.v[l].W[k][j], set: x => { opt.v[l].W[k][j] = x } })
    }))
    layer.b.forEach((b, k) => {
      layer.b[k] = update(b, grads[l].b[k], { get: () => opt.m[l].b[k], set: x => { opt.m[l].b[k] = x } }, { get: () => opt.v[l].b[k], set: x => { opt.v[l].b[k] = x } })
    })
  })
}

export function trainSteps(net, opt, X, Y, steps, lossKind = 'mse') {
  let loss = 0
  for (let s = 0; s < steps; s++) { const r = lossAndGradients(net, X, Y, lossKind); loss = r.loss; optimizerStep(net, opt, r.grads) }
  return loss
}

// The PyTorch and Keras code for a network made of these layers.
export function codeFor(inputs, layers, { kind = 'sgd', rate = 0.01 } = {}, lossKind = 'mse') {
  const torchAct = { relu: 'nn.ReLU()', sigmoid: 'nn.Sigmoid()', tanh: 'nn.Tanh()' }
  const parts = [], keras = []
  let fanIn = inputs
  layers.forEach(({ units, activation }, i) => {
    parts.push(`nn.Linear(${fanIn}, ${units})`)
    if (torchAct[activation]) parts.push(torchAct[activation])
    // Keras puts the yes/no output's sigmoid in the last layer; PyTorch puts it in the loss.
    const kerasAct = lossKind === 'bce' && i === layers.length - 1 ? 'sigmoid' : activation
    keras.push(`    layers.Dense(${units}${kerasAct !== 'none' ? `, activation="${kerasAct}"` : ''}${i === 0 ? `, input_shape=(${inputs},)` : ''}),`)
    fanIn = units
  })
  const torchOpt = { sgd: `torch.optim.SGD(model.parameters(), lr=${rate})`, momentum: `torch.optim.SGD(model.parameters(), lr=${rate}, momentum=0.9)`, adam: `torch.optim.Adam(model.parameters(), lr=${rate})` }[kind]
  const kerasOpt = { sgd: `keras.optimizers.SGD(learning_rate=${rate})`, momentum: `keras.optimizers.SGD(learning_rate=${rate}, momentum=0.9)`, adam: `keras.optimizers.Adam(learning_rate=${rate})` }[kind]
  const bce = lossKind === 'bce'
  const lossFn = bce ? 'loss_fn = nn.BCEWithLogitsLoss()   # sigmoid and cross-entropy together, on the raw output\n' : ''
  const lossLine = bce ? 'loss = loss_fn(model(x), y)' : 'loss = ((model(x) - y) ** 2).mean()'
  return {
    torch: `model = nn.Sequential(\n    ${parts.join(',\n    ')},\n)\n${lossFn}optimizer = ${torchOpt}\nfor step in range(steps):\n    ${lossLine}\n    optimizer.zero_grad()\n    loss.backward()\n    optimizer.step()`,
    keras: `model = keras.Sequential([\n${keras.join('\n')}\n])\nmodel.compile(optimizer=${kerasOpt}, loss="${bce ? 'binary_crossentropy' : 'mse'}")\nmodel.fit(x, y, epochs=steps, batch_size=len(x))`,
  }
}
