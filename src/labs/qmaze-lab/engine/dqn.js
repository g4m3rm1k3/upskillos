// python/dqn.py in JavaScript: the same picture, the same starting weights (drawn from Python's
// random numbers), the same exploring and replay draws, and the network's forward pass, gradients and
// Adam written out by hand. PyTorch runs dqn.py in 64-bit floats, as this does, so the two agree to
// within rounding (dqn-parity.test.js); the only difference is the order some sums are added in.
//
// The network: x (2 × n_states numbers) → h = relu(W1 x + b1) (hidden) → q = W2 h + b2 (4 moves).
// The picture is almost all zeros, so the first layer adds up only the columns of the cells that are 1.
import { GridWorld } from './gridworld.js'
import { PyRandom } from './mt.js'
import { linear } from './tabular.js'

export function picture(env, marks = true) {
  const visited = Array.from({ length: env.nStates }, (_, s) => marks && env.visited.has(s) ? 1.0 : 0.0)
  const here = Array.from({ length: env.nStates }, (_, s) => s === env.state ? 1.0 : 0.0)
  return visited.concat(here)
}

// The 1s of a picture: the columns of W1 that count.
const ones = x => { const out = []; for (let k = 0; k < x.length; k++) if (x[k] !== 0) out.push(k); return out }

export function makeQNet(nInputs, hidden = 64, rng = null) {
  // Weights stored flat, row after row (W1[j * nInputs + k] is row j, column k), for speed.
  const layer = (nIn, nOut) => {
    const bound = 1 / Math.sqrt(nIn), u = () => rng ? -bound + (bound - -bound) * rng.random() : 0
    const W = new Float64Array(nOut * nIn)
    for (let i = 0; i < W.length; i++) W[i] = u()
    const b = new Float64Array(nOut)
    for (let i = 0; i < nOut; i++) b[i] = u()
    return { W, b }
  }
  const l1 = layer(nInputs, hidden), l2 = layer(hidden, 4)
  return { nInputs, hidden, W1: l1.W, b1: l1.b, W2: l2.W, b2: l2.b }
}

export const copyNet = net => ({ ...net, W1: net.W1.slice(), b1: net.b1.slice(), W2: net.W2.slice(), b2: net.b2.slice() })
// The weights as rows, the way PyTorch prints them.
export const rowsOf = (W, cols) => Array.from({ length: W.length / cols }, (_, r) => Array.from(W.subarray(r * cols, (r + 1) * cols)))

// Forward pass for one picture: the hidden layer before and after ReLU, and the four Q values.
export function forward(net, x, idx = ones(x)) {
  const n = net.nInputs, H = net.hidden
  const pre = new Float64Array(H), h = new Float64Array(H), q = [0, 0, 0, 0]
  for (let j = 0; j < H; j++) {
    let sum = 0
    for (const k of idx) sum += x[k] * net.W1[j * n + k]
    pre[j] = sum + net.b1[j]
    h[j] = pre[j] > 0 ? pre[j] : 0
  }
  for (let a = 0; a < 4; a++) {
    let sum = 0
    for (let j = 0; j < H; j++) sum += h[j] * net.W2[a * H + j]
    q[a] = sum + net.b2[a]
  }
  return { pre, h, q, idx }
}

// torch's argmax: the first of the largest.
export const argmax = q => q.reduce((best, v, a) => v > q[best] ? a : best, 0)

// The gradient of loss = mean over the batch of (Q(s_i, a_i) − target_i)².
export function lossGradients(net, batch, g = zerosLike(net)) {
  const B = batch.length, n = net.nInputs, H = net.hidden
  for (const key of ['W1', 'b1', 'W2', 'b2']) g[key].fill(0)
  let loss = 0
  for (const { x, a, target } of batch) {
    const f = forward(net, x)
    const error = f.q[a] - target
    loss += error * error / B
    const dq = 2 * error / B                      // ∂loss/∂Q(s_i, a_i); the other three moves get 0
    g.b2[a] += dq
    for (let j = 0; j < H; j++) {
      g.W2[a * H + j] += dq * f.h[j]
      if (!(f.pre[j] > 0)) continue                // back through ReLU: no slope where it was off
      const dpre = dq * net.W2[a * H + j]
      g.b1[j] += dpre
      for (const k of f.idx) g.W1[j * n + k] += dpre * x[k]
    }
  }
  g.loss = loss
  return g
}
export const zerosLike = net => ({ W1: new Float64Array(net.W1.length), b1: new Float64Array(net.b1.length), W2: new Float64Array(net.W2.length), b2: new Float64Array(net.b2.length) })

// torch.optim.Adam, step by step as PyTorch writes it. Every weight moves, even with a zero gradient:
// its running average m still remembers earlier steps.
export function makeAdam(net, lr, betas = [0.9, 0.999], eps = 1e-8) {
  return { lr, betas, eps, t: 0, m: zerosLike(net), v: zerosLike(net) }
}
export function adamStep(net, opt, g) {
  const [b1, b2] = opt.betas
  opt.t += 1
  const c1 = 1 - b1 ** opt.t, c2 = Math.sqrt(1 - b2 ** opt.t), size = opt.lr / c1, eps = opt.eps
  for (const key of ['W1', 'b1', 'W2', 'b2']) {
    const P = net[key], G = g[key], M = opt.m[key], V = opt.v[key]
    for (let i = 0; i < P.length; i++) {
      M[i] += (G[i] - M[i]) * (1 - b1)
      V[i] = V[i] * b2 + (1 - b2) * G[i] * G[i]
      P[i] -= size * (M[i] / (Math.sqrt(V[i]) / c2 + eps))
    }
  }
}

export const DQN_DEFAULTS = { steps: 20000, hidden: 64, batchSize: 32, gamma: 0.95, lr: 0.001, bufferSize: 10000, startLearning: 500, syncEvery: 500, epsilonStart: 1.0, epsilonEnd: 0.05, exploreSteps: 10000, marks: true, seed: 0 }

// train_dqn, yielding after every move with what that move did.
export function* trainDQN(name, options = {}) {
  const o = { ...DQN_DEFAULTS, ...options }
  const rng = new PyRandom(o.seed)
  const env = new GridWorld(name)
  const net = makeQNet(2 * env.nStates, o.hidden, rng)
  let target = copyNet(net)
  const opt = makeAdam(net, o.lr), grads = zerosLike(net)
  // A deque(maxlen=bufferSize): when full, the oldest move is dropped. Kept as a ring, so dropping
  // costs nothing: memory item i (0 = oldest) is ring[(oldest + i) % bufferSize].
  const ring = [], memory = { length: 0, at: i => ring[(oldest + i) % o.bufferSize] }
  let oldest = 0
  env.reset(o.seed)
  let seen = picture(env, o.marks), total = 0, loss = null
  const totals = []
  for (let step = 0; step < o.steps; step++) {
    const epsilon = linear(o.epsilonStart, o.epsilonEnd, step / o.exploreSteps)
    let action, explored = false
    if (rng.random() < epsilon) { action = rng.randrange(4); explored = true }
    else action = argmax(forward(net, seen).q)
    const from = env.state
    const [next, reward, terminated, truncated] = env.step(action)
    total += reward
    const nextSeen = picture(env, o.marks)
    if (ring.length < o.bufferSize) ring.push([seen, action, reward, nextSeen, terminated])
    else { ring[oldest] = [seen, action, reward, nextSeen, terminated]; oldest = (oldest + 1) % o.bufferSize }
    memory.length = ring.length
    seen = nextSeen
    const done = terminated || truncated
    if (done) { totals.push(total); total = 0; env.reset(); seen = picture(env, o.marks) }
    if (memory.length >= o.startLearning) {
      const batch = []
      for (let i = 0; i < o.batchSize; i++) {
        const [x, a, r, x2, end] = memory.at(rng.randrange(memory.length))
        const bestNext = Math.max(...forward(target, x2).q)
        batch.push({ x, a, target: r + o.gamma * (1 - (end ? 1 : 0)) * bestNext })
      }
      const g = lossGradients(net, batch, grads)
      loss = g.loss
      adamStep(net, opt, g)
    }
    if (step % o.syncEvery === 0) target = copyNet(net)
    yield { net, step, epsilon, explored, from, action, next, reward, terminated, done, totals, loss, size: memory.length }
  }
  return { net, totals }
}

// greedy_game: no exploring; the return and the cells visited.
export function greedyGame(net, name, { marks = true, seed = 1000 } = {}) {
  const env = new GridWorld(name)
  env.reset(seed)
  const trail = [env.state]
  let total = 0, done = false
  while (!done) {
    const [next, reward, terminated, truncated] = env.step(argmax(forward(net, picture(env, marks)).q))
    total += reward; trail.push(next); done = terminated || truncated
  }
  return { total, trail }
}
