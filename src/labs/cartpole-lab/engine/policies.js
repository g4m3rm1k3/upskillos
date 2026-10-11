// python/policies.py and python/returns.py in JavaScript: the hand-written rules, one game with a
// rule, the average over many games, and returns.
import { PyRandom } from '../../qmaze-lab/engine/mt.js'
import { CartPole, LEFT, RIGHT } from './cartpole.js'

export const RULES = {
  always_left: { label: 'always left', run: () => LEFT, says: 'push left every time' },
  random_push: { label: 'random push', run: (state, rng) => rng.randrange(2), says: 'toss a coin' },
  lean: { label: 'lean', run: ([, , theta]) => theta > 0 ? RIGHT : LEFT, says: 'push the way the pole leans (θ > 0 → right)' },
  lean_ahead: { label: 'lean ahead', run: ([, , theta, thetaDot]) => theta + 0.25 * thetaDot > 0 ? RIGHT : LEFT, says: 'push the way it will lean: θ + 0.25 θ̇ > 0 → right' },
}

export function play(policy, seed = 0, env = new CartPole()) {
  const rng = new PyRandom(seed)
  let [state] = env.reset(seed)
  const trail = [state], actions = []
  let total = 0, done = false
  while (!done) {
    const action = policy(state, rng)
    const [next, reward, terminated, truncated] = env.step(action)
    actions.push(action)
    total += reward
    trail.push(next)
    state = next
    done = terminated || truncated
  }
  return { total, trail, actions }
}

export function averageLength(policy, games = 100) {
  const lengths = []
  for (let seed = 0; seed < games; seed++) lengths.push(play(policy, seed).total)
  return { mean: lengths.reduce((a, b) => a + b, 0) / lengths.length, lengths }
}

export function discountedReturn(rewards, gamma) {
  let G = 0
  rewards.forEach((r, k) => { G += gamma ** k * r })
  return G
}

export function allReturns(rewards, gamma) {
  let G = 0
  const out = []
  for (let k = rewards.length - 1; k >= 0; k--) { G = rewards[k] + gamma * G; out.unshift(G) }
  return out
}
