// python/averages.py and python/td.py in JavaScript (same random draws, so a seeded TD(0) run gives
// the same V as Python's; parity.test.js checks it).
import { PyRandom } from './mt.js'

export function runningMean(samples) {
  let mean = 0
  return samples.map((x, i) => (mean += (x - mean) / (i + 1)))
}

export function constantStep(samples, alpha) {
  let estimate = 0
  return samples.map(x => (estimate += alpha * (x - estimate)))
}

// Yields after every move, like the trainers in tabular.js.
export function* td0Evaluate(env, { episodes = 500, alpha = 0.1, gamma = 0.95, seed = 0 } = {}) {
  const rng = new PyRandom(seed)
  const V = new Array(env.nStates).fill(0)
  for (let episode = 0; episode < episodes; episode++) {
    let [state] = env.reset(episode === 0 ? seed : null), done = false
    while (!done) {
      const action = rng.randrange(env.nActions)
      const [next, reward, terminated, truncated] = env.step(action)
      const old = V[state]
      const target = terminated ? reward : reward + gamma * V[next]
      V[state] += alpha * (target - V[state])
      done = terminated || truncated
      yield { V, episode, state, action, next, reward, terminated, old, target, updated: V[state], done }
      state = next
    }
  }
  return { V }
}
