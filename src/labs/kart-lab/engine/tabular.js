// python/tabular.py and python/linear.py in JavaScript, exactly, plus what the arena needs: frozen
// drivers from tables or weights, and versioned checkpoints.
import { PyRandom, SUNLIT, TRACKS, reset, step, scriptedTraffic, observe, sensorKey, sensors } from './kart.js'

export const VERSION = 'kart-v3'
export const DEFAULTS = { method: 'q', view: 'sector', episodes: 2500, alpha: 0.18, gamma: 0.95, epsilon: 0.9, floor: 0.04, penalty: 6, traffic: true, seed: 42 }
export function row(Q, key) { let r = Q.get(key); if (!r) { r = [0, 0, 0, 0, 0]; Q.set(key, r) } return r }
export function argmax(values) { let best = 1; for (let a = 0; a < 5; a++) if (values[a] > values[best]) best = a; return best }
export function actionValues(tables, key) {
  const total = [0, 0, 0, 0, 0]
  for (const Q of tables) if (Q.has(key)) { const r = Q.get(key); for (let a = 0; a < 5; a++) total[a] += r[a] }
  return total
}
export const choose = (tables, key, epsilon, rng) => rng.random() < epsilon ? rng.randrange(5) : argmax(actionValues(tables, key))
export function update(tables, method, key, action, reward, nextKey, done, nextAction, alpha, gamma, rng) {
  let Q = tables[0], other = tables[0]
  if (method === 'double') { if (rng.random() < 0.5) { Q = tables[0]; other = tables[1] } else { Q = tables[1]; other = tables[0] } }
  const chosen = method === 'sarsa' ? nextAction : argmax(row(Q, nextKey))
  const future = done ? 0 : row(other, nextKey)[chosen]
  const target = reward + gamma * future, values = row(Q, key), before = values[action]
  values[action] = before + alpha * (target - before)
  return { before, target, after: values[action], future, chosen, table: method === 'double' ? (Q === tables[0] ? 'A' : 'B') : 'Q' }
}
export const keyOf = (view, state, cars, track) => view === 'sensors' ? sensorKey(state, cars, track) : observe(state, cars, track)
export const carsAt = (tick, seed, config, track) => config.traffic ? scriptedTraffic(tick, seed, track) : []
// onTransition, if given, sees every update with the values before it.
export function trainEpisode(tables, config, episode, rng, track = SUNLIT, onTransition) {
  const seed = rng.randrange(100000)
  let state = reset(seed)
  const epsilon = config.floor + (config.epsilon - config.floor) * Math.max(0, 1 - episode / Math.max(1, config.episodes * 0.8))
  let key = keyOf(config.view, state, carsAt(0, seed, config, track), track), action = choose(tables, key, epsilon, rng)
  while (!state.done) {
    const cars = carsAt(state.ticks, seed, config, track), qBefore = onTransition ? actionValues(tables, key) : null
    const next = step(state, action, track, cars, config.penalty)
    const nextKey = keyOf(config.view, next, carsAt(next.ticks, seed, config, track), track), nextAction = choose(tables, nextKey, epsilon, rng)
    const learning = update(tables, config.method, key, action, next.last.reward, nextKey, next.done, nextAction, config.alpha, config.gamma, rng)
    onTransition?.({ state, next, key, nextKey, action, nextAction, epsilon, cars, qBefore, learning })
    state = next; key = nextKey; action = nextAction
  }
  return state
}
export function train(config = DEFAULTS, track = SUNLIT, onEpisode) {
  config = { ...DEFAULTS, ...config }
  const rng = new PyRandom(config.seed), tables = config.method === 'double' ? [new Map(), new Map()] : [new Map()], totals = []
  for (let episode = 0; episode < config.episodes; episode++) {
    const s = trainEpisode(tables, config, episode, rng, track)
    totals.push(s.total)
    onEpisode?.(episode, s)
  }
  return { tables, totals }
}
export function evaluate(tables, config = DEFAULTS, track = SUNLIT, laps = 50) {
  config = { ...DEFAULTS, ...config }
  let finished = 0, hits = 0
  for (let i = 0; i < laps; i++) {
    const seed = 800001 + i * 97
    let state = reset(seed)
    while (!state.done) { const cars = carsAt(state.ticks, seed, config, track); state = step(state, argmax(actionValues(tables, keyOf(config.view, state, cars, track))), track, cars, config.penalty) }
    finished += state.finished ? 1 : 0; hits += state.crashes
  }
  return [finished / laps, hits / laps]
}

// linear.py
export function features(state, cars, track) {
  const near = sensors(state, cars, track), x = [1]
  for (let s = 0; s < 3; s++) x.push(state.speed === s ? 1 : 0)
  for (const side of [-1, 0, 1]) { const lane = state.lane + side; for (let level = 0; level < 3; level++) x.push(lane >= 0 && lane <= 2 && near[lane] === level ? 1 : 0) }
  x.push(state.lane === 0 ? 1 : 0, state.lane === 2 ? 1 : 0)
  return x
}
export const FEATURE_NAMES = ['bias', 'speed 1', 'speed 2', 'speed 3', 'left lane clear', 'left lane: hazard 4–6 ahead', 'left lane: hazard ≤ 3', 'this lane clear', 'this lane: hazard 4–6 ahead', 'this lane: hazard ≤ 3', 'right lane clear', 'right lane: hazard 4–6 ahead', 'right lane: hazard ≤ 3', 'in the left lane', 'in the right lane']
export function qValues(weights, x) {
  const values = []
  for (let a = 0; a < 5; a++) { let total = 0; for (let i = 0; i < x.length; i++) total += weights[a][i] * x[i]; values.push(total) }
  return values
}
export function trainLinear({ episodes = 2500, alpha = 0.02, gamma = 0.95, epsilon = 0.9, floor = 0.04, penalty = 6, seed = 42, track = SUNLIT, onEpisode } = {}) {
  const config = { ...DEFAULTS, traffic: true }, rng = new PyRandom(seed), weights = Array.from({ length: 5 }, () => Array(15).fill(0))
  for (let episode = 0; episode < episodes; episode++) {
    const lapSeed = rng.randrange(100000)
    let state = reset(lapSeed)
    const eps = floor + (epsilon - floor) * Math.max(0, 1 - episode / Math.max(1, episodes * 0.8))
    let x = features(state, carsAt(0, lapSeed, config, track), track)
    while (!state.done) {
      const action = rng.random() < eps ? rng.randrange(5) : argmax(qValues(weights, x))
      const next = step(state, action, track, carsAt(state.ticks, lapSeed, config, track), penalty)
      const nextX = features(next, carsAt(next.ticks, lapSeed, config, track), track)
      const future = next.done ? 0 : Math.max(...qValues(weights, nextX))
      const error = next.last.reward + gamma * future - qValues(weights, x)[action]
      for (let i = 0; i < 15; i++) weights[action][i] += alpha * error * x[i]
      state = next; x = nextX
    }
    onEpisode?.(episode, state, weights)
  }
  return weights
}
export function evaluateLinear(weights, track = SUNLIT, laps = 50, penalty = 6) {
  const config = { ...DEFAULTS, traffic: true }
  let finished = 0, hits = 0
  for (let i = 0; i < laps; i++) {
    const seed = 800001 + i * 97
    let state = reset(seed)
    while (!state.done) { const cars = carsAt(state.ticks, seed, config, track); state = step(state, argmax(qValues(weights, features(state, cars, track))), track, cars, penalty) }
    finished += state.finished ? 1 : 0; hits += state.crashes
  }
  return [finished / laps, hits / laps]
}

// A frozen driver, for races and figures: { kind: 'table', view, tables } or { kind: 'linear', weights }.
export const valuesFor = (model, state, cars, track) => model.kind === 'linear' ? qValues(model.weights, features(state, cars, track)) : actionValues(model.tables, keyOf(model.view, state, cars, track))
export const policyOf = model => (state, cars, track) => argmax(valuesFor(model, state, cars, track))

// Checkpoints: sparse, rounded, versioned JSON.
export function pack(model, config, episodes) {
  if (model.kind === 'linear') return { version: VERSION, kind: 'linear', config, episodes, weights: model.weights.map(w => w.map(v => Math.round(v * 1e6) / 1e6)) }
  return { version: VERSION, kind: 'table', config, episodes, tables: model.tables.map(Q => [...Q.entries()].filter(([, r]) => r.some(v => v !== 0)).map(([k, r]) => [k, r.map(v => Math.round(v * 1e5) / 1e5)])) }
}
export function unpack(data) {
  if (!data || data.version !== VERSION || !['table', 'linear'].includes(data.kind) || typeof data.config !== 'object' || !data.config) throw new Error('Incompatible driver checkpoint')
  const c = data.config
  if (!['q', 'sarsa', 'double', 'linear'].includes(c.method) || !['sector', 'sensors'].includes(c.view ?? 'sensors')) throw new Error('Invalid training setting: method or view')
  for (const [key, min, max] of [['alpha', 0, 1], ['gamma', 0, 1], ['penalty', 0, 100], ['episodes', 1, 1000000], ['seed', 0, 4294967295]]) if (!Number.isFinite(c[key]) || c[key] < min || c[key] > max) throw new Error(`Invalid training setting: ${key}`)
  if (c.track !== undefined && !TRACKS[c.track]) throw new Error('Unknown track')
  if (data.kind === 'linear') {
    if (!Array.isArray(data.weights) || data.weights.length !== 5 || !data.weights.every(w => Array.isArray(w) && w.length === 15 && w.every(v => Number.isFinite(v) && Math.abs(v) < 1e6))) throw new Error('Invalid model weights')
    return { kind: 'linear', weights: data.weights.map(w => [...w]), config: c }
  }
  const limit = c.view === 'sensors' ? 243 : 10368
  if (!Array.isArray(data.tables) || data.tables.length !== (c.method === 'double' ? 2 : 1)) throw new Error('Invalid model table')
  const tables = data.tables.map(entries => {
    if (!Array.isArray(entries) || entries.length > limit) throw new Error('Invalid model table')
    const Q = new Map()
    for (const e of entries) {
      if (!Array.isArray(e) || e.length !== 2 || !Number.isInteger(e[0]) || e[0] < 0 || e[0] >= limit || !Array.isArray(e[1]) || e[1].length !== 5 || !e[1].every(v => Number.isFinite(v) && Math.abs(v) < 1e6)) throw new Error('Invalid model entry')
      Q.set(e[0], [...e[1]])
    }
    return Q
  })
  return { kind: 'table', view: c.view, tables, config: c }
}
