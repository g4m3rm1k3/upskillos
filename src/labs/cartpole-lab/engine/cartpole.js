// python/cartpole.py in JavaScript, operation for operation, with Python's own random numbers
// (the Mersenne Twister from the QMaze lab), so a seeded game here is the Python program's game.
// parity.test.js checks it against the real program's output.
import { PyRandom } from '../../qmaze-lab/engine/mt.js'

export const LEFT = 0, RIGHT = 1
export const ACTION_NAMES = ['push left', 'push right']
export const ARROWS = ['←', '→']
export const NAMES = ['x', 'x_dot', 'theta', 'theta_dot']
export const SYMBOLS = ['x', 'ẋ', 'θ', 'θ̇']
export const UNITS = ['m', 'm/s', 'rad', 'rad/s']
export const MEANINGS = ['cart position', 'cart speed', 'pole angle', 'pole spin']

export class CartPole {
  constructor({ maxSteps = 500, force = 10.0, poleMass = 0.1, halfLength = 0.5 } = {}) {
    this.gravity = 9.8
    this.cartMass = 1.0
    this.poleMass = poleMass
    this.totalMass = this.cartMass + this.poleMass
    this.halfLength = halfLength
    this.poleMoment = this.poleMass * this.halfLength
    this.force = force
    this.tau = 0.02
    this.xLimit = 2.4
    this.angleLimit = 12 * 2 * Math.PI / 360
    this.maxSteps = maxSteps
    this.nActions = 2
    this.rng = new PyRandom(0)
    this.state = null
    this.steps = 0
  }

  // random.uniform(a, b) is a + (b - a) * random().
  uniform(a, b) { return a + (b - a) * this.rng.random() }

  reset(seed = null) {
    if (seed !== null && seed !== undefined) this.rng.seed(seed)
    const x = this.uniform(-0.05, 0.05), xDot = this.uniform(-0.05, 0.05)
    const theta = this.uniform(-0.05, 0.05), thetaDot = this.uniform(-0.05, 0.05)
    this.state = [x, xDot, theta, thetaDot]
    this.steps = 0
    return [this.state, {}]
  }

  // Every intermediate number of accelerations(), for figures that show the working.
  accelerationsWorking(theta, thetaDot, push) {
    const cosTheta = Math.cos(theta), sinTheta = Math.sin(theta)
    const temp = (push + this.poleMoment * thetaDot ** 2 * sinTheta) / this.totalMass
    const thetaAcc = (this.gravity * sinTheta - cosTheta * temp) / (this.halfLength * (4.0 / 3.0 - this.poleMass * cosTheta ** 2 / this.totalMass))
    const xAcc = temp - this.poleMoment * thetaAcc * cosTheta / this.totalMass
    return { cosTheta, sinTheta, temp, thetaAcc, xAcc }
  }

  accelerations(theta, thetaDot, push) {
    const { xAcc, thetaAcc } = this.accelerationsWorking(theta, thetaDot, push)
    return [xAcc, thetaAcc]
  }

  step(action) {
    let [x, xDot, theta, thetaDot] = this.state
    const push = action === RIGHT ? this.force : -this.force
    const [xAcc, thetaAcc] = this.accelerations(theta, thetaDot, push)
    x = x + this.tau * xDot
    xDot = xDot + this.tau * xAcc
    theta = theta + this.tau * thetaDot
    thetaDot = thetaDot + this.tau * thetaAcc
    this.state = [x, xDot, theta, thetaDot]
    this.steps += 1
    const terminated = x < -this.xLimit || x > this.xLimit || theta < -this.angleLimit || theta > this.angleLimit
    const truncated = this.steps >= this.maxSteps
    return [this.state, 1.0, terminated, truncated, {}]
  }
}

// One step written out: the state before, the push, every intermediate number, the state after.
export function stepWorking(env, state, action) {
  const [x, xDot, theta, thetaDot] = state
  const push = action === RIGHT ? env.force : -env.force
  const w = env.accelerationsWorking(theta, thetaDot, push)
  const after = [x + env.tau * xDot, xDot + env.tau * w.xAcc, theta + env.tau * thetaDot, thetaDot + env.tau * w.thetaAcc]
  return { before: state, action, push, ...w, after }
}
