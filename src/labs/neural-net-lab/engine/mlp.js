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
// (Plain loops rather than map/reduce: the digit and handwriting figures train thousands of these.)
// masks (training with dropout only): masks[l] multiplies hidden layer l's outputs, 0 for a dropped
// neuron and 1/(1 − p) for a kept one, as nn.Dropout does.
export function forwardOne(net, x, masks = null) {
  const zs = [], as = [x]
  let a = x
  net.layers.forEach((layer, l) => {
    const { W, b } = layer, f = ACTIVATIONS[layer.activation].f, units = W.length, mask = masks?.[l]
    const z = new Array(units), out = new Array(units)
    for (let k = 0; k < units; k++) {
      const row = W[k]
      let s = b[k]
      for (let i = 0; i < row.length; i++) s += row[i] * a[i]
      z[k] = s; out[k] = mask ? f(s) * mask[k] : f(s)
    }
    a = out
    zs.push(z); as.push(a)
  })
  return { out: a, zs, as }
}
export const predictOne = (net, x) => forwardOne(net, x).out

// The loss over a batch, and its gradient for every weight. lossKind: 'mse' (mean squared error) or
// 'bce' (binary cross-entropy on the last layer's raw output, the logit, as PyTorch's
// BCEWithLogitsLoss does it: p = sigmoid(z), and the slope with respect to z is simply p − y).
// dropout: the probability of dropping each hidden neuron, for each example, while training; rng
// draws the drops (Python's generator, though not PyTorch's, so the drops differ from PyTorch's).
export function lossAndGradients(net, X, Y, lossKind = 'mse', { dropout = 0, rng = null } = {}) {
  const grads = net.layers.map(l => ({ W: l.W.map(r => r.map(() => 0)), b: l.b.map(() => 0) }))
  let loss = 0
  const n = X.length, last = net.layers.length - 1
  X.forEach((x, i) => {
    const masks = dropout > 0 ? net.layers.map((layer, l) => l === last ? null : layer.W.map(() => rng.random() < dropout ? 0 : 1 / (1 - dropout))) : null
    const { out, zs, as } = forwardOne(net, x, masks)
    let d
    if (lossKind === 'ce') {
      // Softmax over the outputs, then −log of the true class's probability (Y[i] is one-hot), as
      // PyTorch's CrossEntropyLoss does; its slope for each output is probability − target.
      const top = Math.max(...out), powers = out.map(z => Math.exp(z - top)), total = powers.reduce((a, b) => a + b, 0)
      const probs = powers.map(p => p / total), k = Y[i].indexOf(1)
      loss += -(out[k] - top - Math.log(total)) / n
      d = probs.map((p, c) => (p - Y[i][c]) / n)
    } else if (lossKind === 'bce') {
      // −[y log p + (1 − y) log(1 − p)], written so a large |z| can't overflow (as PyTorch does)
      out.forEach((z, k) => { loss += (Math.max(z, 0) - z * Y[i][k] + Math.log1p(Math.exp(-Math.abs(z)))) / n })
      d = out.map((z, k) => (1 / (1 + Math.exp(-z)) - Y[i][k]) / n)
    } else {
      // dL/d(output): the mean squared error's slope, 2 (ŷ − y) / n
      d = out.map((o, k) => 2 * (o - Y[i][k]) / n)
      out.forEach((o, k) => { loss += (o - Y[i][k]) ** 2 / n })
    }
    for (let l = net.layers.length - 1; l >= 0; l--) {
      const layer = net.layers[l], slope = ACTIVATIONS[layer.activation].d, W = layer.W, gW = grads[l].W, gb = grads[l].b
      const z = zs[l], aPrev = as[l], units = W.length, inputs = aPrev.length, mask = masks?.[l]
      const dz = new Array(units)
      for (let k = 0; k < units; k++) {
        const g = d[k] * (mask ? mask[k] : 1) * slope(z[k])
        dz[k] = g
        gb[k] += g
        const row = gW[k]
        for (let j = 0; j < inputs; j++) row[j] += g * aPrev[j]
      }
      if (l === 0) break
      const next = new Array(inputs)
      for (let j = 0; j < inputs; j++) { let s = 0; for (let k = 0; k < units; k++) s += dz[k] * W[k][j]; next[j] = s }
      d = next
    }
  })
  return { loss, grads }
}

export function makeOptimizer(net, { kind = 'sgd', rate = 0.01, momentum = 0.9, beta1 = 0.9, beta2 = 0.999, eps = 1e-8, weightDecay = 0 } = {}) {
  const zero = () => net.layers.map(l => ({ W: l.W.map(r => r.map(() => 0)), b: l.b.map(() => 0) }))
  return { kind, rate, momentum, beta1, beta2, eps, weightDecay, t: 0, m: zero(), v: zero() }
}

// One step for every weight: plain SGD, momentum, or Adam (as torch.optim does them). Weight decay,
// as torch.optim applies it: weight_decay × weight added to every gradient first.
export function optimizerStep(net, opt, grads) {
  opt.t += 1
  const { kind, rate } = opt, wd = opt.weightDecay ?? 0
  const c1 = 1 - opt.beta1 ** opt.t, c2 = 1 - opt.beta2 ** opt.t
  // Update one list of numbers p in place from its gradients g, with its momentum m and Adam's v.
  const update = (p, gs, m, v) => {
    for (let j = 0; j < p.length; j++) {
      const g = wd ? gs[j] + wd * p[j] : gs[j]
      if (kind === 'sgd') p[j] = p[j] - rate * g
      else if (kind === 'momentum') { const buf = opt.momentum * m[j] + g; m[j] = buf; p[j] = p[j] - rate * buf }
      else {
        const mm = opt.beta1 * m[j] + (1 - opt.beta1) * g, vv = opt.beta2 * v[j] + (1 - opt.beta2) * g * g
        m[j] = mm; v[j] = vv
        p[j] = p[j] - rate * (mm / c1) / (Math.sqrt(vv / c2) + opt.eps)
      }
    }
  }
  net.layers.forEach((layer, l) => {
    layer.W.forEach((row, k) => update(row, grads[l].W[k], opt.m[l].W[k], opt.v[l].W[k]))
    update(layer.b, grads[l].b, opt.m[l].b, opt.v[l].b)
  })
}

export function trainSteps(net, opt, X, Y, steps, lossKind = 'mse', options = {}) {
  let loss = 0
  for (let s = 0; s < steps; s++) { const r = lossAndGradients(net, X, Y, lossKind, options); loss = r.loss; optimizerStep(net, opt, r.grads) }
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
    // Keras puts the output's sigmoid or softmax in the last layer; PyTorch puts it in the loss.
    const last = i === layers.length - 1
    const kerasAct = last && lossKind === 'bce' ? 'sigmoid' : last && lossKind === 'ce' ? 'softmax' : activation
    keras.push(`    layers.Dense(${units}${kerasAct !== 'none' ? `, activation="${kerasAct}"` : ''}${i === 0 ? `, input_shape=(${inputs},)` : ''}),`)
    fanIn = units
  })
  const torchOpt = { sgd: `torch.optim.SGD(model.parameters(), lr=${rate})`, momentum: `torch.optim.SGD(model.parameters(), lr=${rate}, momentum=0.9)`, adam: `torch.optim.Adam(model.parameters(), lr=${rate})` }[kind]
  const kerasOpt = { sgd: `keras.optimizers.SGD(learning_rate=${rate})`, momentum: `keras.optimizers.SGD(learning_rate=${rate}, momentum=0.9)`, adam: `keras.optimizers.Adam(learning_rate=${rate})` }[kind]
  const lossFn = { bce: 'loss_fn = nn.BCEWithLogitsLoss()   # sigmoid and cross-entropy together, on the raw output\n', ce: 'loss_fn = nn.CrossEntropyLoss()     # softmax and cross-entropy together; y holds class numbers\n' }[lossKind] ?? ''
  const lossLine = lossFn ? 'loss = loss_fn(model(x), y)' : 'loss = ((model(x) - y) ** 2).mean()'
  const kerasLoss = { bce: 'binary_crossentropy', ce: 'sparse_categorical_crossentropy' }[lossKind] ?? 'mse'
  return {
    torch: `model = nn.Sequential(\n    ${parts.join(',\n    ')},\n)\n${lossFn}optimizer = ${torchOpt}\nfor step in range(steps):\n    ${lossLine}\n    optimizer.zero_grad()\n    loss.backward()\n    optimizer.step()`,
    keras: `model = keras.Sequential([\n${keras.join('\n')}\n])\nmodel.compile(optimizer=${kerasOpt}, loss="${kerasLoss}")\nmodel.fit(x, y, epochs=steps, batch_size=len(x))`,
  }
}
