// This headless environment is also the race's game engine. Rendering never changes physics.
export const VERSION = 'kart-lanes-v1'
export const LENGTH = 144
export const ACTIONS = ['Left', 'Coast', 'Right', 'Accelerate', 'Brake']
export const DT = 0.22
export const OBSTACLES = [
  [15, 1], [26, 0], [38, 2], [49, 1], [61, 0], [72, 2],
  [83, 1], [96, 2], [109, 0], [121, 1], [133, 2],
].map(([p, lane]) => ({ p, lane }))
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x))
export function random(seed = 1) {
  let x = seed >>> 0
  return () => { x = (Math.imul(1664525, x) + 1013904223) >>> 0; return x / 4294967296 }
}
export function reset(seed = 1, options = {}) {
  const rng = random(seed)
  return { p: 0, lane: Math.floor(rng() * 3), speed: 0, ticks: 0, crashes: 0, total: 0, done: false, finished: false, last: null, ...options }
}
export function ahead(p, other) { return ((other - p) % LENGTH + LENGTH) % LENGTH }
export function blockedMask(state, traffic = []) {
  let mask = 0
  for (const car of traffic) {
    const d = ahead(state.p, car.p)
    if (d > 0 && d <= 3) mask |= 1 << car.lane
  }
  return mask
}
export function observe(state, traffic = []) {
  const sector = Math.floor(state.p) % LENGTH, mask = blockedMask(state, traffic)
  return { sector, lane: state.lane, speed: state.speed, mask, key: ((sector * 3 + state.lane) * 3 + state.speed) * 8 + mask }
}
export const STATES = LENGTH * 3 * 3 * 8
export function step(state, action, { traffic = [], penalty = 6, laps = 1 } = {}) {
  if (state.done) return state
  if (!Number.isInteger(action) || action < 0 || action >= ACTIONS.length) throw new Error('Unknown driving action')
  const lane = clamp(state.lane + (action === 0 ? -1 : action === 2 ? 1 : 0), 0, 2)
  let speed = clamp(state.speed + (action === 3 ? 1 : action === 4 ? -1 : 0), 0, 2)
  const travel = speed + 1
  const hit = [...OBSTACLES, ...traffic].some(o => o.lane === lane && ahead(state.p, o.p) > 0 && ahead(state.p, o.p) <= travel)
  const progress = hit ? 1 : travel
  if (hit) speed = 0
  const p = Math.min(state.p + progress, LENGTH * laps)
  const crashes = state.crashes + Number(hit), ticks = state.ticks + 1
  const finished = p >= LENGTH * laps
  const done = finished || ticks >= 210 * laps || crashes >= 8 * laps
  const parts = { progress: (p - state.p) * 0.15, time: -0.2, collision: hit ? -penalty : 0, finish: finished ? 10 : 0 }
  const reward = Object.values(parts).reduce((a, b) => a + b, 0)
  return { p, lane, speed, crashes, ticks, finished, done, total: state.total + reward, last: { action, reward, parts, hit } }
}
// Training traffic moves at a fixed pace; race traffic instead comes from the other policies.
export function trainingTraffic(tick, seed) {
  return [0, 1, 2].map((lane) => ({ lane, p: (seed * (lane + 3) + lane * 43 + tick) % LENGTH }))
}
