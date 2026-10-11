// Q-learning on CartPole: the whole program. Everything starts in run().
// `data` is everything the program remembers between lines: the Q-table, the cart's state,
// the settings (the knobs on the right) and the seed of the random numbers.

const EDGES = [
  [0],
  [0],
  [-0.12, -0.06, -0.02, 0, 0.02, 0.06, 0.12],
  [-1, -0.5, -0.2, 0, 0.2, 0.5, 1],
]
const GRAVITY = 9.8
const CART_MASS = 1
const POLE_MASS = 0.1
const TOTAL_MASS = CART_MASS + POLE_MASS
const HALF_LENGTH = 0.5
const FORCE = 10
const TAU = 0.02

function run(data) {
  data.state = resetCart(data)
  while (true) {
    const row = stateToRow(data.state)
    const action = chooseAction(data, row)
    const result = stepCart(data.state, action, data.steps + 1)
    learn(data, row, action, result)
    data.steps = data.steps + 1
    data.total = data.total + result.reward
    if (result.terminated || result.truncated) {
      data.episode = data.episode + 1
      data.steps = 0
      data.total = 0
      data.state = resetCart(data)
    } else {
      data.state = result.nextState
    }
  }
}

function resetCart(data) {
  const x = random(data) * 0.1 - 0.05
  const velocity = random(data) * 0.1 - 0.05
  const angle = random(data) * 0.1 - 0.05
  const spin = random(data) * 0.1 - 0.05
  return [x, velocity, angle, spin]
}

function stateToRow(state) {
  let row = 0
  for (let i = 0; i < 4; i++) {
    const bin = countEdgesBelow(state[i], EDGES[i])
    row = row * (EDGES[i].length + 1) + bin
  }
  return row
}

function countEdgesBelow(value, edges) {
  let count = 0
  for (const edge of edges) {
    if (value >= edge) {
      count = count + 1
    }
  }
  return count
}

function chooseAction(data, row) {
  const values = data.Q[row]
  const roll = random(data)
  if (roll < data.epsilon) {
    const pick = random(data)
    return Math.floor(pick * values.length)
  }
  return argmax(values)
}

function argmax(values) {
  let best = 0
  for (let a = 1; a < values.length; a++) {
    if (values[a] > values[best]) {
      best = a
    }
  }
  return best
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

function learn(data, row, action, result) {
  const nextRow = stateToRow(result.nextState)
  const old = data.Q[row][action]
  const future = result.terminated ? 0 : Math.max(...data.Q[nextRow])
  const target = result.reward + data.gamma * future
  const error = target - old
  if (data.learning) {
    data.Q[row][action] = old + data.alpha * error
  }
}

function random(data) {
  data.seed = (1664525 * data.seed + 1013904223) % 4294967296
  return data.seed / 4294967296
}
