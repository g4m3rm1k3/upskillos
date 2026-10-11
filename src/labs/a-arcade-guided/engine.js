// A-Arcade Breakdown's executable teaching engine. Copied from A-Arcade, then changed so every
// intermediate value is returned, and `// piece: <id>` ... `// /piece` markers show which lines
// carry out each piece of the maths (pieces.js). The markers are stripped when lines are shown.
export function random(seed = 7) {
  let n = seed >>> 0
  return () => { n = (1664525 * n + 1013904223) >>> 0; return n / 4294967296 }
}
export const EDGES = [[0], [0], [-.12, -.06, -.02, 0, .02, .06, .12], [-1, -.5, -.2, 0, .2, .5, 1]]
export const MAZE = ['S....', '.##..', '...#.', '.#...', '...#G']
// CartPole's constants, with the names the physics uses.
export const PHYSICS = { gravity: 9.8, cartMass: 1, poleMass: .1, halfLength: .5, force: 10, tau: .02 }
export function resetWorld(world, rng) {
  // piece: start-state
  return world === 'maze' ? [0, 0] : Array.from({ length: 4 }, () => (rng() - .5) * .1)
  // /piece
}
// The rates of change of the four state numbers: the right-hand side f(s, u) of the state-space model.
export function cartpoleRates(state, action) {
  const { gravity, cartMass, poleMass, halfLength, force } = PHYSICS
  const totalMass = cartMass + poleMass
  // piece: cartpole-physics
  const [x, velocity, angle, spin] = state
  const push = action === 1 ? force : -force
  const sin = Math.sin(angle), cos = Math.cos(angle)
  const temp = (push + poleMass * halfLength * spin * spin * sin) / totalMass
  const angularAcceleration = (gravity * sin - cos * temp) / (halfLength * (4 / 3 - poleMass * cos * cos / totalMass))
  const acceleration = temp - poleMass * halfLength * angularAcceleration * cos / totalMass
  // /piece
  return { push, sin, cos, temp, rates: [velocity, acceleration, spin, angularAcceleration], acceleration, angularAcceleration }
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
  const physics = cartpoleRates(state, action)
  // piece: euler
  const next = state.map((value, i) => value + PHYSICS.tau * physics.rates[i])
  // /piece
  // piece: reward episode-end
  const reward = 1
  const terminated = Math.abs(next[0]) > 2.4 || Math.abs(next[2]) > Math.PI / 15
  const truncated = steps >= 500
  // /piece
  return { next, reward, terminated, truncated, physics }
}
export function encode(world, state) {
  if (world === 'maze') return { bins: [...state], index: state[0] * 5 + state[1] }
  // piece: discretise
  const bins = state.map((v, i) => EDGES[i].filter(edge => v >= edge).length)
  const index = bins.reduce((index, bin, i) => index * (EDGES[i].length + 1) + bin, 0)
  // /piece
  return { bins, index }
}
export function makeTable(world) {
  // piece: q-table
  return Array.from({ length: world === 'maze' ? 25 : 256 }, () => Array(world === 'maze' ? 4 : 2).fill(0))
  // /piece
}
export function chooseAction(row, epsilon, rng) {
  // piece: epsilon-greedy
  const explore = rng() < epsilon
  const action = explore ? Math.floor(rng() * row.length) : row.indexOf(Math.max(...row))
  // /piece
  return { action, explore }
}
export function qUpdate(row, action, reward, nextRow, terminated, alpha, gamma) {
  // piece: td-update
  const before = row[action]
  const bootstrap = terminated ? 0 : Math.max(...nextRow)
  const target = reward + gamma * bootstrap
  const error = target - before
  row[action] = before + alpha * error
  // /piece
  return { before, bootstrap, target, error, after: row[action] }
}
// piece: features
export const features = s => [s[0] / 2.4, s[1] / 2, s[2] / .21, s[3] / 2, 1]
// /piece
// piece: dot-product
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0)
// /piece
export const sigmoid = z => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))))
export function actor(state, weights) {
  // piece: actor
  const phi = features(state)
  const score = dot(phi, weights)
  const p = sigmoid(score)
  // /piece
  return { phi, score, probabilities: [1 - p, p] }
}
export function criticFeatures(s) {
  // piece: critic
  const [x, v, a, w] = features(s)
  return [1, x, v, a, w, x*x, v*v, a*a, w*w, a*w, x*v]
  // /piece
}
export const value = (s, weights) => dot(criticFeatures(s), weights)
export const makeNetwork = () => ({ actor: Array(5).fill(0), critic: Array(11).fill(0) })
// A synchronous n-step batch. Terminal states mask bootstrap; time limits do not.
export function a2cUpdate(network, rollouts, { gamma = .99, actorRate = .01, criticRate = .02, entropy = .01, criticEnabled = true } = {}) {
  const ga = Array(5).fill(0), gc = Array(11).fill(0), records = []
  const estimate = state => criticEnabled ? value(state, network.critic) : 0
  for (const trajectory of rollouts) {
    // piece: nstep
    let target = estimate(trajectory.at(-1).next)
    const reversed = []
    for (let i = trajectory.length - 1; i >= 0; i--) {
      const t = trajectory[i]
      if (t.terminated) target = 0
      else if (t.truncated) target = estimate(t.next)
      target = t.reward + gamma * target
      // /piece
      // piece: advantage
      const baseline = estimate(t.state)
      const advantage = target - baseline
      // /piece
      const { phi, probabilities } = actor(t.state, network.actor)
      const p = probabilities[1], psi = criticFeatures(t.state)
      // piece: policy-gradient entropy
      const logProbGradient = t.action - p
      const entropyGradient = -Math.log(Math.max(1e-12, p) / Math.max(1e-12, 1-p)) * p * (1-p)
      phi.forEach((f, j) => { ga[j] += (logProbGradient * advantage + entropy * entropyGradient) * f })
      // /piece
      // piece: critic-update
      psi.forEach((f, j) => { gc[j] += advantage * f })
      // /piece
      reversed.push({ ...t, target, baseline, advantage, probabilities, phi, psi, logProbGradient, entropyGradient,
        actorLoss: -Math.log(Math.max(1e-12, probabilities[t.action])) * advantage, criticLoss: .5 * advantage * advantage })
    }
    records.push(...reversed.reverse())
  }
  const count = records.length
  const apply = (weights, grad, rate) => {
    // piece: clipping
    const mean = grad.map(g => g / count)
    const norm = Math.hypot(...mean), scale = Math.min(1, 1 / (norm || 1))
    weights.forEach((w, i) => { weights[i] = w + rate * mean[i] * scale })
    // /piece
    return { mean, norm, scale, rate }
  }
  const before = { actor: [...network.actor], critic: [...network.critic] }
  const actorGradient = apply(network.actor, ga, actorRate)
  const criticGradient = apply(network.critic, gc, criticEnabled ? criticRate : 0)
  return { records, before, after: { actor: [...network.actor], critic: [...network.critic] }, count, actorGradient, criticGradient, gamma, entropy }
}
export function collectRollouts(network, rng, workers, horizon = 5) {
  return workers.map(worker => {
    const trajectory = []
    // piece: rollout
    for (let i = 0; i < horizon; i++) {
      const state = [...worker.state], { probabilities } = actor(state, network.actor)
      const action = rng() < probabilities[1] ? 1 : 0
      const transition = stepWorld('cartpole', state, action, ++worker.steps)
      trajectory.push({ state, action, ...transition })
      worker.state = transition.next
      if (transition.terminated || transition.truncated) { worker.state = resetWorld('cartpole', rng); worker.steps = 0 }
    }
    // /piece
    return trajectory
  })
}
export function evaluate(world, policy, seeds = [101, 102, 103, 104, 105]) {
  return seeds.map(seed => {
    // piece: evaluation
    const rng = random(seed); let state = resetWorld(world, rng), total = 0
    for (let steps = 1; steps <= (world === 'maze' ? 100 : 500); steps++) {
      const result = stepWorld(world, state, policy(state), steps)
      total += result.reward; state = result.next
      if (result.terminated || result.truncated) return { steps, total, success: world === 'maze' ? result.terminated : result.truncated && !result.terminated }
    }
    // /piece
  })
}

// The lines between `// piece: ... <id> ...` and `// /piece` in this file's source, markers removed
// and indentation trimmed. A piece can have several marked stretches; they are joined with "…".
export function linesFor(source, id) {
  const lines = source.split('\n'), parts = []
  let current = null
  for (const line of lines) {
    const open = /^\/\/ piece: ([\w\s-]+)$/.exec(line.trim())
    if (open) { current = open[1].split(/\s+/).includes(id) ? [] : null; continue }
    if (line.trim() === '// /piece') { if (current) parts.push(current); current = null; continue }
    if (current) current.push(line)
  }
  return parts.map(block => {
    const indent = Math.min(...block.filter(l => l.trim()).map(l => l.match(/^ */)[0].length))
    return block.map(l => l.slice(indent)).join('\n')
  }).join('\n…\n')
}

// The whole source without the piece markers, for showing the complete engine.
export function withoutMarkers(source) {
  return source.split('\n').filter(line => !/^\s*\/\/ (piece: [\w\s-]+|\/piece)$/.test(line)).join('\n')
}
