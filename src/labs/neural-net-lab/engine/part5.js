// Part 5's Python programs in JavaScript: optimizers.py (the valley and the three optimisers, step
// by step) and overfit.py's data. parity.test.js checks them against Python.
import { PyRandom } from '../../qmaze-lab/engine/mt.js'

// optimizers.py
export const valley = w => 0.5 * (w[0] ** 2 + 100 * w[1] ** 2)
export const valleyGradient = w => [w[0], 100 * w[1]]
export const sgdStep = (w, grad, state, rate) => w.map((wi, i) => wi - rate * grad[i])
export function momentumStep(w, grad, state, rate, beta = 0.9) {
  state.velocity ??= w.map(() => 0)
  state.velocity = state.velocity.map((v, i) => beta * v + grad[i])
  return w.map((wi, i) => wi - rate * state.velocity[i])
}
export function adamStep(w, grad, state, rate, beta1 = 0.9, beta2 = 0.999, eps = 1e-8) {
  if (!state.m) { state.m = w.map(() => 0); state.v = w.map(() => 0); state.t = 0 }
  state.t += 1
  const t = state.t
  state.m = state.m.map((m, i) => beta1 * m + (1 - beta1) * grad[i])
  state.v = state.v.map((v, i) => beta2 * v + (1 - beta2) * grad[i] * grad[i])
  return w.map((wi, i) => {
    const mHat = state.m[i] / (1 - beta1 ** t), vHat = state.v[i] / (1 - beta2 ** t)
    return wi - rate * mHat / (Math.sqrt(vHat) + eps)
  })
}
export const STEPPERS = { sgd: sgdStep, momentum: momentumStep, adam: adamStep }
export const BEST_RATES = { sgd: 0.019, momentum: 0.004, adam: 0.5 }
export function race(kind, rate, steps = 60, start = [-9, 1.5]) {
  let w = [...start]
  const state = {}, path = [w], states = [{}]
  for (let i = 0; i < steps; i++) {
    w = STEPPERS[kind](w, valleyGradient(w), state, rate)
    path.push(w); states.push(JSON.parse(JSON.stringify(state)))
  }
  return { path, states, error: valley(w) }
}

// overfit.py's data: n points near sin(x), off by up to `noise`.
export function noisyPoints(n, seed, noise) {
  const rng = new PyRandom(seed), u = (a, b) => a + (b - a) * rng.random()
  const xs = Array.from({ length: n }, () => u(-3, 3))
  const ys = xs.map(x => Math.sin(x) + u(-noise, noise))
  return [xs, ys]
}
