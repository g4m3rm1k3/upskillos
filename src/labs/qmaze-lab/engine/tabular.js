// python/choosing.py, qlearning.py and sarsa.py in JavaScript, making the same random draws in the
// same order, so a seeded run gives the same Q-table as Python, bit for bit (parity.test.js).
//
// The trainers are generators: they yield after every move with everything that move did, so a
// figure can show one update at a time, or run to the end with finish().
import { PyRandom } from './mt.js'

export function greedyAction(qRow, rng) {
  const best = Math.max(...qRow)
  const ties = []
  for (let a = 0; a < qRow.length; a++) if (qRow[a] === best) ties.push(a)
  return rng.choice(ties)
}

export function epsilonGreedy(qRow, epsilon, rng) {
  if (rng.random() < epsilon) return { action: rng.randrange(qRow.length), explored: true }
  return { action: greedyAction(qRow, rng), explored: false }
}

export function linear(start, end, progress) {
  progress = Math.min(progress, 1.0)
  return start + (end - start) * progress
}

export const zeros = (rows, cols, fill = 0) => Array.from({ length: rows }, () => new Array(cols).fill(fill))

export function qLearningUpdate(Q, s, a, r, next, terminated, alpha, gamma) {
  const old = Q[s][a]
  const nextBest = terminated ? null : Math.max(...Q[next])
  const target = terminated ? r : r + gamma * nextBest
  const tdError = target - Q[s][a]
  Q[s][a] += alpha * tdError
  return { old, target, tdError, nextBest, updated: Q[s][a] }
}

export function sarsaUpdate(Q, s, a, r, next, nextAction, terminated, alpha, gamma) {
  const old = Q[s][a]
  const nextQ = terminated ? null : Q[next][nextAction]
  const target = terminated ? r : r + gamma * nextQ
  const tdError = target - Q[s][a]
  Q[s][a] += alpha * tdError
  return { old, target, tdError, nextQ, updated: Q[s][a] }
}

const DEFAULTS = { episodes: 300, alpha: 0.5, gamma: 0.95, epsilonStart: 1.0, epsilonEnd: 0.05, initialQ: 0.0, seed: 0 }

export function* qLearning(env, options = {}) {
  const { episodes, alpha, gamma, epsilonStart, epsilonEnd, initialQ, seed } = { ...DEFAULTS, ...options }
  const rng = new PyRandom(seed)
  const Q = zeros(env.nStates, env.nActions, initialQ)
  const totals = []
  for (let episode = 0; episode < episodes; episode++) {
    const epsilon = linear(epsilonStart, epsilonEnd, episode / (0.8 * episodes))
    let [state] = env.reset(episode === 0 ? seed : null)
    let total = 0, done = false, t = 0
    while (!done) {
      const { action, explored } = epsilonGreedy(Q[state], epsilon, rng)
      const [next, reward, terminated, truncated] = env.step(action)
      const update = qLearningUpdate(Q, state, action, reward, next, terminated, alpha, gamma)
      total += reward
      done = terminated || truncated
      yield { Q, totals, episode, t: t++, epsilon, state, action, explored, slipped: env.last.slipped, reward, next, terminated, truncated, total, done, ...update }
      state = next
    }
    totals.push(total)
  }
  return { Q, totals }
}

export function* sarsa(env, options = {}) {
  const { episodes, alpha, gamma, epsilonStart, epsilonEnd, initialQ, seed } = { ...DEFAULTS, ...options }
  const rng = new PyRandom(seed)
  const Q = zeros(env.nStates, env.nActions, initialQ)
  const totals = []
  for (let episode = 0; episode < episodes; episode++) {
    const epsilon = linear(epsilonStart, epsilonEnd, episode / (0.8 * episodes))
    let [state] = env.reset(episode === 0 ? seed : null)
    let { action, explored } = epsilonGreedy(Q[state], epsilon, rng)
    let total = 0, done = false, t = 0
    while (!done) {
      const [next, reward, terminated, truncated] = env.step(action)
      const slipped = env.last.slipped
      const chosen = epsilonGreedy(Q[next], epsilon, rng)
      const update = sarsaUpdate(Q, state, action, reward, next, chosen.action, terminated, alpha, gamma)
      total += reward
      done = terminated || truncated
      yield { Q, totals, episode, t: t++, epsilon, state, action, explored, slipped, reward, next, nextAction: chosen.action, terminated, truncated, total, done, ...update }
      state = next; action = chosen.action; explored = chosen.explored
    }
    totals.push(total)
  }
  return { Q, totals }
}

// Runs a trainer to the end. onEpisode(Q, totals) after each episode, for learning curves.
export function finish(trainer, onEpisode) {
  let step = trainer.next()
  while (!step.done) {
    if (step.value.done && onEpisode) onEpisode(step.value.Q, step.value.totals.concat(step.value.total))
    step = trainer.next()
  }
  return step.value
}
