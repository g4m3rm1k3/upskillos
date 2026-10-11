// A2C (advantage actor-critic) on CartPole: the whole program. Everything starts in run().
// `data` is everything the program remembers between lines: the actor's and critic's weights,
// 8 CartPoles (data.worlds, the first one is drawn), the settings and the random seed.

const GRAVITY = 9.8
const CART_MASS = 1
const POLE_MASS = 0.1
const TOTAL_MASS = CART_MASS + POLE_MASS
const HALF_LENGTH = 0.5
const FORCE = 10
const TAU = 0.02
const STEPS_PER_WORLD = 5

function run(data) {
  for (const world of data.worlds) {
    world.state = resetCart(data)
    world.steps = 0
  }
  while (true) {
    const batch = []
    for (const world of data.worlds) {
      const trajectory = playSteps(data, world)
      batch.push(trajectory)
    }
    if (data.learning) {
      updateWeights(data, batch)
    }
  }
}

function playSteps(data, world) {
  const trajectory = []
  for (let i = 0; i < STEPS_PER_WORLD; i++) {
    const probRight = actorProbability(data.actorWeights, world.state)
    const roll = random(data)
    let action = probRight >= 0.5 ? 1 : 0
    if (data.learning) {
      action = roll < probRight ? 1 : 0
    }
    const result = stepCart(world.state, action, world.steps + 1)
    trajectory.push({ state: world.state, action, reward: result.reward, nextState: result.nextState, terminated: result.terminated, truncated: result.truncated })
    world.steps = world.steps + 1
    if (result.terminated || result.truncated) {
      world.state = resetCart(data)
      world.steps = 0
    } else {
      world.state = result.nextState
    }
  }
  return trajectory
}

function features(state) {
  return [state[0] / 2.4, state[1] / 2, state[2] / 0.21, state[3] / 2, 1]
}

function dot(weights, values) {
  let sum = 0
  for (let j = 0; j < weights.length; j++) {
    sum = sum + weights[j] * values[j]
  }
  return sum
}

function sigmoid(z) {
  const clamped = Math.max(-30, Math.min(30, z))
  return 1 / (1 + Math.exp(-clamped))
}

function actorProbability(weights, state) {
  const phi = features(state)
  const score = dot(weights, phi)
  return sigmoid(score)
}

function criticFeatures(state) {
  const [x, v, a, w] = features(state)
  return [1, x, v, a, w, x * x, v * v, a * a, w * w, a * w, x * v]
}

function criticValue(weights, state) {
  const psi = criticFeatures(state)
  return dot(weights, psi)
}

function nStepTargets(data, trajectory) {
  const last = trajectory[trajectory.length - 1]
  let total = criticValue(data.criticWeights, last.nextState)
  const targets = []
  for (let i = trajectory.length - 1; i >= 0; i--) {
    const t = trajectory[i]
    if (t.terminated) {
      total = 0
    }
    if (t.truncated && !t.terminated) {
      total = criticValue(data.criticWeights, t.nextState)
    }
    total = t.reward + data.gamma * total
    targets[i] = total
  }
  return targets
}

function updateWeights(data, batch) {
  const actorSlope = [0, 0, 0, 0, 0]
  const criticSlope = new Array(11).fill(0)
  let count = 0
  for (const trajectory of batch) {
    const targets = nStepTargets(data, trajectory)
    for (let i = 0; i < trajectory.length; i++) {
      const t = trajectory[i]
      const value = criticValue(data.criticWeights, t.state)
      const advantage = targets[i] - value
      const probRight = actorProbability(data.actorWeights, t.state)
      const phi = features(t.state)
      const psi = criticFeatures(t.state)
      const logProbSlope = t.action - probRight
      const entropySlope = -Math.log(probRight / (1 - probRight)) * probRight * (1 - probRight)
      for (let j = 0; j < phi.length; j++) {
        actorSlope[j] = actorSlope[j] + (logProbSlope * advantage + data.entropyBonus * entropySlope) * phi[j]
      }
      for (let j = 0; j < psi.length; j++) {
        criticSlope[j] = criticSlope[j] + advantage * psi[j]
      }
      count = count + 1
    }
  }
  applyStep(data.actorWeights, actorSlope, count, data.actorRate)
  applyStep(data.criticWeights, criticSlope, count, data.criticRate)
}

function applyStep(weights, slope, count, rate) {
  const mean = slope.map(s => s / count)
  const length = Math.hypot(...mean)
  const scale = Math.min(1, 1 / length)
  for (let j = 0; j < weights.length; j++) {
    weights[j] = weights[j] + rate * mean[j] * scale
  }
}

function resetCart(data) {
  const x = random(data) * 0.1 - 0.05
  const velocity = random(data) * 0.1 - 0.05
  const angle = random(data) * 0.1 - 0.05
  const spin = random(data) * 0.1 - 0.05
  return [x, velocity, angle, spin]
}

function stepCart(state, action, steps) {
  const [x, velocity, angle, spin] = state
  const force = action === 1 ? FORCE : -FORCE
  const sin = Math.sin(angle)
  const cos = Math.cos(angle)
  const temp = (force + POLE_MASS * HALF_LENGTH * spin * spin * sin) / TOTAL_MASS
  const angularAcceleration = (GRAVITY * sin - cos * temp) / (HALF_LENGTH * (4 / 3 - POLE_MASS * cos * cos / TOTAL_MASS))
  const acceleration = temp - POLE_MASS * HALF_LENGTH * angularAcceleration * cos / TOTAL_MASS
  const nextX = x + TAU * velocity
  const nextVelocity = velocity + TAU * acceleration
  const nextAngle = angle + TAU * spin
  const nextSpin = spin + TAU * angularAcceleration
  const nextState = [nextX, nextVelocity, nextAngle, nextSpin]
  const terminated = Math.abs(nextX) > 2.4 || Math.abs(nextAngle) > Math.PI / 15
  const truncated = steps >= 500
  return { nextState, reward: 1, terminated, truncated }
}

function random(data) {
  data.seed = (1664525 * data.seed + 1013904223) % 4294967296
  return data.seed / 4294967296
}
