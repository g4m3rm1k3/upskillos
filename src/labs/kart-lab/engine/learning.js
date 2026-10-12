import { ACTIONS, STATES, VERSION, random, reset, observe, step, trainingTraffic } from './game.js'
export const DEFAULTS = { algorithm: 'q', episodes: 2500, alpha: 0.18, gamma: 0.95, epsilon: 0.9, floor: 0.04, penalty: 6, seed: 42, traffic: true }
export function argmax(values) {
  let best = 1 // coasting breaks ties consistently, including unseen states
  for (let i = 0; i < values.length; i++) if (values[i] > values[best]) best = i
  return best
}
export function values(model, key) { return Array.from({ length: 5 }, (_, a) => (model.q[key * 5 + a] || 0) + (model.b?.[key * 5 + a] || 0)) }
export function choose(model, key, epsilon = 0, rng = Math.random) { return rng() < epsilon ? Math.floor(rng() * 5) : argmax(values(model, key)) }
export function createModel(config = DEFAULTS) {
  return { version: VERSION, config: { ...DEFAULTS, ...config }, q: new Float32Array(STATES * 5), b: config.algorithm === 'double' ? new Float32Array(STATES * 5) : null, episodes: 0 }
}
export function update(model, { key, action, reward, nextKey, done, nextAction = 1 }, rng) {
  const { alpha, gamma, algorithm } = model.config
  let table = model.q, other = model.q
  if (algorithm === 'double') {
    table = rng() < 0.5 ? model.q : model.b
    other = table === model.q ? model.b : model.q
  }
  const nextValues = Array.from(table.subarray(nextKey * 5, nextKey * 5 + 5))
  const selected = algorithm === 'sarsa' ? nextAction : argmax(nextValues)
  const bootstrap = done ? 0 : other[nextKey * 5 + selected]
  const index = key * 5 + action, before = table[index], target = reward + gamma * bootstrap
  table[index] += alpha * (target - before)
  return { before, target, after: table[index], bootstrap, selected, table: algorithm === 'double' ? (table === model.q ? 'A' : 'B') : 'Q' }
}
export function trainEpisode(model, episode, rng, onTransition) {
  const c = model.config, seed = Math.floor(rng() * 100000)
  let state = reset(seed)
  const epsilon = c.floor + (c.epsilon - c.floor) * Math.max(0, 1 - episode / Math.max(1, c.episodes * 0.8))
  const traffic = t => c.traffic ? trainingTraffic(t, seed) : []
  let key = observe(state, traffic(0)).key, action = choose(model, key, epsilon, rng)
  while (!state.done) {
    const qBefore = onTransition ? values(model, key) : null
    const next = step(state, action, { traffic: traffic(state.ticks), penalty: c.penalty })
    const nextKey = observe(next, traffic(next.ticks)).key, nextAction = choose(model, nextKey, epsilon, rng)
    const learning = update(model, { key, action, reward: next.last.reward, nextKey, done: next.done, nextAction }, rng)
    onTransition?.({ state, next, key, nextKey, action, nextAction, epsilon, traffic: traffic(state.ticks), qBefore, learning })
    state = next; key = nextKey; action = nextAction
  }
  model.episodes++
  return { reward: state.total, crashes: state.crashes, finished: state.finished, ticks: state.ticks, epsilon }
}
export function train(config) {
  const model = createModel(config), rng = random(model.config.seed), history = []
  for (let i = 0; i < model.config.episodes; i++) history.push(trainEpisode(model, i, rng))
  return { model, history }
}
export function evaluate(model, seeds = Array.from({ length: 30 }, (_, i) => 800001 + i * 97)) {
  const results = seeds.map(seed => {
    let state = reset(seed)
    while (!state.done) {
      const traffic = model.config.traffic ? trainingTraffic(state.ticks, seed) : []
      const action = choose(model, observe(state, traffic).key, 0, () => 1)
      state = step(state, action, { traffic, penalty: model.config.penalty })
    }
    return { finished: state.finished, crashes: state.crashes, ticks: state.ticks, reward: state.total }
  })
  return { runs: results.length, finishRate: results.filter(r => r.finished).length / results.length, crashes: results.reduce((s, r) => s + r.crashes, 0) / results.length, ticks: results.reduce((s, r) => s + r.ticks, 0) / results.length, reward: results.reduce((s, r) => s + r.reward, 0) / results.length }
}
// Sparse, versioned checkpoints keep browser storage and bundled drivers small.
export function pack(model) {
  const sparse = q => q ? Array.from(q.entries()).filter(([, v]) => v !== 0).map(([i, v]) => [i, Math.round(v * 1e5) / 1e5]) : null
  return { version: VERSION, config: model.config, episodes: model.episodes, q: sparse(model.q), b: sparse(model.b) }
}
export function unpack(data) {
  if (!data || data.version !== VERSION || !Array.isArray(data.q) || !Number.isInteger(data.episodes) || data.episodes < 0 || !['q', 'sarsa', 'double'].includes(data.config?.algorithm)) throw new Error('Incompatible driver checkpoint')
  for (const [key, min, max] of [['alpha', 0, 1], ['gamma', 0, 1], ['epsilon', 0, 1], ['floor', 0, 1], ['penalty', 0, 100], ['episodes', 1, 1000000], ['seed', 0, 4294967295]]) {
    if (!Number.isFinite(data.config[key]) || data.config[key] < min || data.config[key] > max) throw new Error(`Invalid training setting: ${key}`)
  }
  if (typeof data.config.traffic !== 'boolean') throw new Error('Invalid traffic setting')
  const model = createModel(data.config)
  for (const field of ['q', 'b']) {
    if (!data[field]) { if (model[field]) throw new Error('Missing model table'); continue }
    if (!Array.isArray(data[field]) || data[field].length > STATES * 5 || !model[field]) throw new Error('Invalid model table')
    for (const entry of data[field]) {
      if (!Array.isArray(entry) || entry.length !== 2) throw new Error('Invalid model entry')
      const [i, v] = entry
      if (!Number.isInteger(i) || i < 0 || i >= STATES * ACTIONS.length || !Number.isFinite(v) || Math.abs(v) > 1e6) throw new Error('Invalid model value')
      model[field][i] = v
    }
  }
  model.episodes = data.episodes
  return model
}
