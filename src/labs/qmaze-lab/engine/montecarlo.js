// python/montecarlo.py in JavaScript, making the same random draws in the same order, so a seeded
// run gives the same V or Q-table as Python, bit for bit (parity.test.js).
//
// Monte Carlo learns only when an episode ends, so these generators yield once per episode, with
// the whole episode and every update its backward pass made (for the figures to write out).
import { PyRandom } from './mt.js'
import { epsilonGreedy, linear, zeros } from './tabular.js'

export function playEpisode(env, choose, seed = null) {
  const episode = []
  let [state] = env.reset(seed), done = false, ended = false
  while (!done) {
    const action = choose(state)
    const [next, reward, terminated, truncated] = env.step(action)
    episode.push([state, action, reward])
    state = next
    done = terminated || truncated
    ended = terminated
  }
  return { episode, terminated: ended }
}

// The backward pass shared by both: G for every t, and whether t is the first visit of its key.
function backward(episode, gamma, keyOf) {
  const first = new Map()
  episode.forEach(([s, a], t) => { const k = keyOf(s, a); if (!first.has(k)) first.set(k, t) })
  const rows = []
  let G = 0
  for (let t = episode.length - 1; t >= 0; t--) {
    const [s, a, r] = episode[t]
    G = r + gamma * G
    rows.push({ t, s, a, r, G, first: first.get(keyOf(s, a)) === t })
  }
  return rows
}

export function* mcEvaluate(env, { episodes = 500, gamma = 0.95, firstVisit = true, alpha = null, seed = 0 } = {}) {
  const rng = new PyRandom(seed)
  const V = new Array(env.nStates).fill(0), counts = new Array(env.nStates).fill(0)
  for (let e = 0; e < episodes; e++) {
    const { episode } = playEpisode(env, () => rng.randrange(env.nActions), e === 0 ? seed : null)
    const rows = backward(episode, gamma, s => s)
    for (const row of rows) {
      row.old = V[row.s]
      if (firstVisit && !row.first) continue
      counts[row.s] += 1
      row.step = alpha == null ? 1 / counts[row.s] : alpha
      V[row.s] += row.step * (row.G - V[row.s])
      row.updated = V[row.s]
    }
    yield { V, counts, e, episode, rows }
  }
  return { V }
}

export function* mcControl(env, { episodes = 300, gamma = 0.95, alpha = null, epsilonStart = 1.0, epsilonEnd = 0.05, seed = 0 } = {}) {
  const rng = new PyRandom(seed)
  const Q = zeros(env.nStates, env.nActions), counts = zeros(env.nStates, env.nActions)
  const totals = []
  for (let e = 0; e < episodes; e++) {
    const epsilon = linear(epsilonStart, epsilonEnd, e / (0.8 * episodes))
    const { episode, terminated } = playEpisode(env, s => epsilonGreedy(Q[s], epsilon, rng).action, e === 0 ? seed : null)
    const rows = backward(episode, gamma, (s, a) => s * env.nActions + a)
    for (const row of rows) {
      row.old = Q[row.s][row.a]
      if (!row.first) continue
      counts[row.s][row.a] += 1
      row.step = alpha == null ? 1 / counts[row.s][row.a] : alpha
      Q[row.s][row.a] += row.step * (row.G - Q[row.s][row.a])
      row.updated = Q[row.s][row.a]
    }
    totals.push(episode.reduce((sum, [, , r]) => sum + r, 0))
    yield { Q, counts, totals, e, epsilon, episode, rows, terminated }
  }
  return { Q, totals }
}

// Runs a Monte Carlo generator to the end and returns its result.
export function finishMC(gen) {
  let step = gen.next()
  while (!step.done) step = gen.next()
  return step.value
}
