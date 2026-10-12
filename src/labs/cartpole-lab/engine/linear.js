// python/linear_policy.py (REINFORCE with a linear policy, no libraries) and python/neuron.py in
// JavaScript, same order of operations and the same random numbers. The trainer is a generator
// that yields after every game, with everything the update used, so a figure can show it.
import { PyRandom } from '../../qmaze-lab/engine/mt.js'
import { CartPole } from './cartpole.js'
import { allReturns } from './policies.js'

export function scoresOf(weights, state) {
  return weights.map(row => row.reduce((sum, w, i) => sum + w * state[i], 0))
}

export function softmax(scores) {
  const top = Math.max(...scores)
  const powers = scores.map(s => Math.exp(s - top))
  const total = powers.reduce((a, b) => a + b, 0)
  return powers.map(p => p / total)
}

export function reinforceStep(weights, states, actions, chances, returns, rate) {
  const baseline = returns.reduce((a, b) => a + b, 0) / returns.length
  for (let k = 0; k < states.length; k++) {
    const state = states[k], action = actions[k], probs = chances[k]
    const advantage = returns[k] - baseline
    for (let a = 0; a < weights.length; a++) {
      const slope = (a === action ? 1.0 : 0.0) - probs[a]
      for (let i = 0; i < state.length; i++) weights[a][i] += rate * advantage * slope * state[i] / states.length
    }
  }
  return baseline
}

export function* trainLinear({ episodes = 300, rate = 0.1, gamma = 0.99, seed = 0, physics = {} } = {}) {
  const rng = new PyRandom(seed)
  const env = new CartPole(physics)
  const weights = [[0, 0, 0, 0], [0, 0, 0, 0]]
  const lengths = []
  for (let episode = 0; episode < episodes; episode++) {
    let [state] = env.reset(episode === 0 ? seed : null)
    const states = [], actions = [], chances = [], rewards = []
    let done = false
    while (!done) {
      const probs = softmax(scoresOf(weights, state))
      const action = rng.random() < probs[0] ? 0 : 1
      const [next, reward, terminated, truncated] = env.step(action)
      states.push(state); actions.push(action); chances.push(probs); rewards.push(reward)
      state = next
      done = terminated || truncated
    }
    const before = weights.map(r => [...r])
    const returns = allReturns(rewards, gamma)
    const baseline = reinforceStep(weights, states, actions, chances, returns, rate)
    lengths.push(rewards.length)
    yield { episode, weights, before, lengths, states, actions, chances, returns, baseline, length: rewards.length }
  }
  return { weights, lengths }
}

// neuron.py
export const XS = [0.0, 1.0, 2.0, 3.0], YS = [1.0, 3.0, 5.0, 7.0]
export const predict = (w, b, x) => w * x + b
export function gradients(w, b) {
  let gradW = 0, gradB = 0
  XS.forEach((x, k) => {
    const error = predict(w, b, x) - YS[k]
    gradW += 2 * error * x / XS.length
    gradB += 2 * error / XS.length
  })
  return [gradW, gradB]
}
export const loss = (w, b) => XS.reduce((sum, x, k) => sum + (predict(w, b, x) - YS[k]) ** 2, 0) / XS.length

// gradient_noise.py: REINFORCE's gradient estimated from single games of a frozen policy.
export function playGame(weights, env, rng, seed = null, gamma = 0.99) {
  let [state] = env.reset(seed)
  const states = [], actions = [], chances = [], rewards = []
  let done = false
  while (!done) {
    const probs = softmax(scoresOf(weights, state))
    const action = rng.random() < probs[0] ? 0 : 1
    const [next, reward, terminated, truncated] = env.step(action)
    states.push(state); actions.push(action); chances.push(probs); rewards.push(reward)
    state = next
    done = terminated || truncated
  }
  return { states, actions, chances, returns: allReturns(rewards, gamma) }
}

export function gameGradient({ states, actions, chances, returns }, baseline) {
  const gradient = [0, 0, 0, 0]
  for (let k = 0; k < states.length; k++) {
    const slope = (actions[k] === 1 ? 1.0 : 0.0) - chances[k][1]
    for (let i = 0; i < 4; i++) gradient[i] += (returns[k] - baseline) * slope * states[k][i]
  }
  return gradient
}

export function summarise(gradients) {
  const n = gradients.length
  const mean = [0, 1, 2, 3].map(i => gradients.reduce((s, g) => s + g[i], 0) / n)
  const spread = [0, 1, 2, 3].map(i => (gradients.reduce((s, g) => s + (g[i] - mean[i]) ** 2, 0) / n) ** 0.5)
  let agree = 0
  for (const g of gradients) if (g.reduce((s, x, i) => s + x * mean[i], 0) > 0) agree += 1
  return { mean, spread, agree: agree / n }
}

// The frozen policy's games, played once; every baseline is then applied to the same games.
export function frozenGames({ trainingGames = 20, games = 2000, seed = 0 } = {}) {
  let weights = [[0, 0, 0, 0], [0, 0, 0, 0]]
  const trainer = trainLinear({ episodes: trainingGames, seed })
  for (let s = trainer.next(); !s.done; s = trainer.next()) weights = s.value.weights
  const env = new CartPole(), rng = new PyRandom(seed + 1)
  return { weights, games: Array.from({ length: games }, (_, g) => playGame(weights, env, rng, g === 0 ? seed + 1 : null)) }
}
