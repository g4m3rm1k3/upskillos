// A-Arcade's executable teaching engine. No dependency on another lab.
export function random(seed = 7) {
  let n = seed >>> 0
  return () => { n = (1664525 * n + 1013904223) >>> 0; return n / 4294967296 }
}
export const EDGES = [[0], [0], [-.12, -.06, -.02, 0, .02, .06, .12], [-1, -.5, -.2, 0, .2, .5, 1]]
export const MAZE = ['S....', '.##..', '...#.', '.#...', '...#G']
export function resetWorld(world, rng) {
  return world === 'maze' ? [0, 0] : Array.from({ length: 4 }, () => (rng() - .5) * .1)
}
// Same physical constants and explicit Euler integration as Gymnasium CartPole.
export function stepWorld(world, state, action, steps) {
  if (world === 'maze') {
    const [dr, dc] = [[-1, 0], [0, 1], [1, 0], [0, -1]][action]
    let [r, c] = [state[0] + dr, state[1] + dc]
    if (!MAZE[r]?.[c] || MAZE[r][c] === '#') [r, c] = state
    const terminated = MAZE[r][c] === 'G'
    return { next: [r, c], reward: terminated ? 1 : -.02, terminated, truncated: steps >= 100 }
  }
  const [x, v, angle, spin] = state
  const sin = Math.sin(angle), cos = Math.cos(angle)
  const temp = ((action === 1 ? 10 : -10) + .05 * spin * spin * sin) / 1.1
  const angularAcceleration = (9.8 * sin - cos * temp) / (.5 * (4 / 3 - .1 * cos * cos / 1.1))
  const acceleration = temp - .05 * angularAcceleration * cos / 1.1
  const next = [x + .02 * v, v + .02 * acceleration, angle + .02 * spin, spin + .02 * angularAcceleration]
  return { next, reward: 1, terminated: Math.abs(next[0]) > 2.4 || Math.abs(next[2]) > Math.PI / 15, truncated: steps >= 500 }
}
export function encode(world, state) {
  if (world === 'maze') return { bins: [...state], index: state[0] * 5 + state[1] }
  const bins = state.map((v, i) => EDGES[i].filter(edge => v >= edge).length)
  return { bins, index: bins.reduce((index, bin, i) => index * (EDGES[i].length + 1) + bin, 0) }
}
export function makeTable(world) {
  return Array.from({ length: world === 'maze' ? 25 : 256 }, () => Array(world === 'maze' ? 4 : 2).fill(0))
}
export function chooseAction(row, epsilon, rng) {
  const explore = rng() < epsilon
  const action = explore ? Math.floor(rng() * row.length) : row.indexOf(Math.max(...row))
  return { action, explore }
}
export function qUpdate(row, action, reward, nextRow, terminated, alpha, gamma) {
  const before = row[action]
  const bootstrap = terminated ? 0 : Math.max(...nextRow)
  const target = reward + gamma * bootstrap
  const error = target - before
  row[action] = before + alpha * error
  return { before, bootstrap, target, error, after: row[action] }
}
export const features = s => [s[0] / 2.4, s[1] / 2, s[2] / .21, s[3] / 2, 1]
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0)
export function actor(state, weights) {
  const phi = features(state)
  const p = 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, dot(phi, weights)))))
  return { phi, probabilities: [1 - p, p] }
}
export function criticFeatures(s) {
  const [x, v, a, w] = features(s)
  return [1, x, v, a, w, x*x, v*v, a*a, w*w, a*w, x*v]
}
export const value = (s, weights) => dot(criticFeatures(s), weights)
export const makeNetwork = () => ({ actor: Array(5).fill(0), critic: Array(11).fill(0) })
// A synchronous n-step batch. Terminal states mask bootstrap; time limits do not.
export function a2cUpdate(network, rollouts, { gamma = .99, actorRate = .01, criticRate = .02, entropy = .01, criticEnabled = true } = {}) {
  const ga = Array(5).fill(0), gc = Array(11).fill(0), records = []
  const estimate = state => criticEnabled ? value(state, network.critic) : 0
  for (const trajectory of rollouts) {
    let target = estimate(trajectory.at(-1).next)
    const reversed = []
    for (let i = trajectory.length - 1; i >= 0; i--) {
      const t = trajectory[i]
      if (t.terminated) target = 0
      else if (t.truncated) target = estimate(t.next)
      target = t.reward + gamma * target
      const baseline = estimate(t.state)
      const advantage = target - baseline
      const { phi, probabilities } = actor(t.state, network.actor)
      const p = probabilities[1], psi = criticFeatures(t.state)
      const entropyGradient = -Math.log(Math.max(1e-12, p) / Math.max(1e-12, 1-p)) * p * (1-p)
      phi.forEach((f, j) => { ga[j] += ((t.action - p) * advantage + entropy * entropyGradient) * f })
      psi.forEach((f, j) => { gc[j] += advantage * f })
      reversed.push({ ...t, target, baseline, advantage, probabilities,
        actorLoss: -Math.log(Math.max(1e-12, probabilities[t.action])) * advantage, criticLoss: .5 * advantage * advantage })
    }
    records.push(...reversed.reverse())
  }
  const count = records.length
  const apply = (weights, grad, rate) => {
    const mean = grad.map(g => g / count)
    const norm = Math.hypot(...mean), scale = Math.min(1, 1 / (norm || 1))
    weights.forEach((w, i) => { weights[i] = w + rate * mean[i] * scale })
    return { mean, norm, scale, rate }
  }
  const before = { actor: [...network.actor], critic: [...network.critic] }
  const actorGradient = apply(network.actor, ga, actorRate)
  const criticGradient = apply(network.critic, gc, criticEnabled ? criticRate : 0)
  return { records, before, after: { actor: [...network.actor], critic: [...network.critic] }, count, actorGradient, criticGradient }
}
export function collectRollouts(network, rng, workers, horizon = 5) {
  return workers.map(worker => {
    const trajectory = []
    for (let i = 0; i < horizon; i++) {
      const state = [...worker.state], { probabilities } = actor(state, network.actor)
      const action = rng() < probabilities[1] ? 1 : 0
      const transition = stepWorld('cartpole', state, action, ++worker.steps)
      trajectory.push({ state, action, ...transition })
      worker.state = transition.next
      if (transition.terminated || transition.truncated) { worker.state = resetWorld('cartpole', rng); worker.steps = 0 }
    }
    return trajectory
  })
}
export function evaluate(world, policy, seeds = [101, 102, 103, 104, 105]) {
  return seeds.map(seed => {
    const rng = random(seed); let state = resetWorld(world, rng), total = 0
    for (let steps = 1; steps <= (world === 'maze' ? 100 : 500); steps++) {
      const result = stepWorld(world, state, policy(state), steps)
      total += result.reward; state = result.next
      if (result.terminated || result.truncated) return { steps, total, success: world === 'maze' ? result.terminated : result.truncated && !result.terminated }
    }
  })
}
