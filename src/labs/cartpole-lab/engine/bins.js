// python/bins.py in JavaScript: cut points, slots, slot numbers into one state number, and the
// binned CartPole the table learners play. qLearning and sarsa from the QMaze engine run on it
// unchanged (they need reset, step, nStates, nActions and last).
import { CartPole } from './cartpole.js'

export const COUNTS = [1, 1, 6, 12]
export const LIMITS = [2.4, 3.0, 0.21, 3.5]

export function makeEdges(limit, count) {
  const width = 2 * limit / count
  const edges = []
  for (let i = 1; i < count; i++) edges.push(-limit + width * i)
  return edges
}

export function slot(value, edges) {
  let n = 0
  for (const edge of edges) if (value >= edge) n += 1
  return n
}

export function toState(slots, counts) {
  let state = 0
  slots.forEach((s, i) => { state = state * counts[i] + s })
  return state
}

// The other way: a state number back into its slots (the last number varies fastest).
export function toSlots(state, counts) {
  const slots = new Array(counts.length)
  for (let i = counts.length - 1; i >= 0; i--) { slots[i] = state % counts[i]; state = Math.floor(state / counts[i]) }
  return slots
}

export class BinnedCartPole {
  constructor(counts = COUNTS, limits = LIMITS, physics = {}) {
    this.world = new CartPole(physics)
    this.counts = counts
    this.limits = limits
    this.edges = limits.map((limit, i) => makeEdges(limit, counts[i]))
    this.nStates = counts.reduce((a, b) => a * b, 1)
    this.nActions = 2
    this.last = { slipped: false }
  }

  slotsOf(observation) { return observation.map((v, i) => slot(v, this.edges[i])) }
  stateOf(observation) { return toState(this.slotsOf(observation), this.counts) }

  reset(seed = null) {
    const [observation, info] = this.world.reset(seed)
    return [this.stateOf(observation), info]
  }

  step(action) {
    const [observation, reward, terminated, truncated, info] = this.world.step(action)
    return [this.stateOf(observation), reward, terminated, truncated, info]
  }
}
