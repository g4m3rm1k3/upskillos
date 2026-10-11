// python/a2c.py's linear actor–critic in JavaScript, with every gradient written out by hand.
//
// With a one-hot state and no bias, PyTorch's network is two tables: the actor's weights W
// (n_actions × n_states; column s holds state s's four logits) and the critic's weights c
// (1 × n_states; c[s] is V(s)). One update, for a batch of N transitions (s_i, a_i, R_i):
//   advantage   A_i = R_i − V(s_i)
//   loss        L = −(1/N) Σ log π(a_i|s_i) · A_i   +  value_coef · (1/N) Σ A_i²   −  entropy_coef · (1/N) Σ H_i
//   ∂L/∂z_ij    = −(1/N) A_i (1[j = a_i] − π_ij)  +  entropy_coef · (1/N) π_ij (log π_ij + H_i)     (z = logits)
//   ∂L/∂V(s_i)  = −value_coef · (2/N) A_i        (R_i is a fixed target: it was computed without gradients)
// and Adam turns each weight's gradient into a step. a2c-parity.test.js replays a real PyTorch run
// (its starting weights, sampled actions and world results) through these formulas and checks
// that the weights after every update agree with PyTorch's.
import { GridWorld } from './gridworld.js'
import { PyRandom } from './mt.js'

export function softmax(z) {
  const top = Math.max(...z), e = z.map(x => Math.exp(x - top)), sum = e.reduce((a, b) => a + b, 0)
  return e.map(x => x / sum)
}

export function makeNet(nStates, nActions = 4, rng = new PyRandom(0)) {
  // PyTorch's default for nn.Linear: uniform in ±1/√(inputs).
  const bound = 1 / Math.sqrt(nStates), u = () => (rng.random() * 2 - 1) * bound
  return { nStates, nActions, W: Array.from({ length: nActions }, () => Array.from({ length: nStates }, u)), c: Array.from({ length: nStates }, u) }
}

export const logitsOf = (net, s) => net.W.map(row => row[s])
export const policyOf = (net, s) => softmax(logitsOf(net, s))
export const valueOf = (net, s) => net.c[s]

export function makeAdam(net, lr, betas = [0.9, 0.999], eps = 1e-8) {
  const zeroW = () => net.W.map(row => row.map(() => 0)), zeroC = () => net.c.map(() => 0)
  return { lr, betas, eps, t: 0, mW: zeroW(), vW: zeroW(), mC: zeroC(), vC: zeroC() }
}

// The gradient of the A2C loss for one batch: { gW, gC, parts } (parts: the loss terms, for showing).
export function a2cGradients(net, batch, { valueCoef = 0.5, entropyCoef = 0.01 } = {}) {
  const N = batch.length
  const gW = net.W.map(row => row.map(() => 0)), gC = net.c.map(() => 0)
  let actorLoss = 0, criticLoss = 0, entropy = 0
  for (const { s, a, R } of batch) {
    const pi = policyOf(net, s), logPi = pi.map(Math.log)
    const A = R - net.c[s]
    const H = -pi.reduce((sum, p, j) => sum + p * logPi[j], 0)
    actorLoss += -logPi[a] * A / N
    criticLoss += A * A / N
    entropy += H / N
    for (let j = 0; j < pi.length; j++) gW[j][s] += -A * ((j === a ? 1 : 0) - pi[j]) / N + entropyCoef * pi[j] * (logPi[j] + H) / N
    gC[s] += -valueCoef * 2 * A / N
  }
  return { gW, gC, parts: { actorLoss, criticLoss, entropy, loss: actorLoss + valueCoef * criticLoss - entropyCoef * entropy } }
}

export function adamStep(net, opt, { gW, gC }) {
  const [b1, b2] = opt.betas
  opt.t += 1
  const c1 = 1 - b1 ** opt.t, c2 = 1 - b2 ** opt.t
  const step = (p, g, m, v) => {
    m = b1 * m + (1 - b1) * g
    v = b2 * v + (1 - b2) * g * g
    return [p - opt.lr * (m / c1) / (Math.sqrt(v / c2) + opt.eps), m, v]
  }
  for (let j = 0; j < net.W.length; j++) for (let s = 0; s < net.nStates; s++) [net.W[j][s], opt.mW[j][s], opt.vW[j][s]] = step(net.W[j][s], gW[j][s], opt.mW[j][s], opt.vW[j][s])
  for (let s = 0; s < net.nStates; s++) [net.c[s], opt.mC[s], opt.vC[s]] = step(net.c[s], gC[s], opt.mC[s], opt.vC[s])
}

// One rollout's targets: R_t = r_t + γ · (end_value_t if that move ended the episode, else R_t+1),
// starting from V of the states the copies are in now.
export function rolloutReturns(net, steps, lastStates, gamma) {
  let R = lastStates.map(s => valueOf(net, s))
  const returns = []
  for (let t = steps.length - 1; t >= 0; t--) {
    R = steps[t].map((x, i) => x.reward + gamma * (x.ended ? x.endValue : R[i]))
    returns.unshift(R)
  }
  return returns
}

const DEFAULTS = { updates: 1500, nEnvs: 8, nSteps: 5, gamma: 0.95, lr: 0.05, valueCoef: 0.5, entropyCoef: 0.01, seed: 0 }

// A2C in the browser: same algorithm as python/a2c.py with hidden=0. Its random numbers are
// Python's `random`, not PyTorch's, so runs differ from Python's in detail; the maths is the same.
// Yields after every update.
export function* trainA2C(map, options = {}) {
  const o = { ...DEFAULTS, ...options }
  const rng = new PyRandom(o.seed)
  const envs = Array.from({ length: o.nEnvs }, () => new GridWorld(map))
  let states = envs.map((env, i) => env.reset(o.seed + i)[0])
  const net = makeNet(envs[0].nStates, 4, rng), opt = makeAdam(net, o.lr)
  const totals = [], running = new Array(o.nEnvs).fill(0)
  for (let update = 0; update < o.updates; update++) {
    const steps = [], batchStates = []
    for (let t = 0; t < o.nSteps; t++) {
      const row = []
      batchStates.push([...states])
      states = states.map((s, i) => {
        const pi = policyOf(net, s)
        let u = rng.random(), a = pi.length - 1
        for (let j = 0; j < pi.length; j++) { u -= pi[j]; if (u < 0) { a = j; break } }
        const [next, reward, terminated, truncated] = envs[i].step(a)
        running[i] += reward
        const ended = terminated || truncated
        row.push({ s, a, reward, ended, endValue: truncated && !terminated ? valueOf(net, next) : 0 })
        if (ended) { totals.push(running[i]); running[i] = 0; return envs[i].reset()[0] }
        return next
      })
      steps.push(row)
    }
    const returns = rolloutReturns(net, steps, states, o.gamma)
    const batch = steps.flatMap((row, t) => row.map((x, i) => ({ s: x.s, a: x.a, R: returns[t][i] })))
    const grads = a2cGradients(net, batch, o)
    adamStep(net, opt, grads)
    yield { net, update, totals, states, parts: grads.parts, batch }
  }
  return { net, totals }
}

// For figures: π(·|s) and V(s) for every state.
export function policyTable(net) {
  return { probs: Array.from({ length: net.nStates }, (_, s) => policyOf(net, s)), values: [...net.c] }
}
