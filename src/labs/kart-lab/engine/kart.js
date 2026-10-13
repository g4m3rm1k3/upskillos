// python/kart.py, python/observe.py and python/drivers.py in JavaScript, exactly: the same moves,
// contacts, rewards and observations, and the same random numbers (PyRandom is Python's
// random.Random). engine/parity.test.js checks it against recorded Python output.
import { PyRandom } from '../../qmaze-lab/engine/mt.js'
export { PyRandom }

export const ACTIONS = ['Left', 'Coast', 'Right', 'Accelerate', 'Brake']
export const SIZE = 0.65
export const DT = 0.22 // seconds of race time per decision, for the 3D arena only
export const SUNLIT = {
  id: 'sunlit', name: 'Sunlit Circuit', length: 144,
  barriers: [[15, 1], [26, 0], [38, 2], [49, 1], [61, 0], [72, 2], [83, 1], [96, 2], [109, 0], [121, 1], [133, 2]],
  sweepers: [[32, 0], [90, 13]],
}
export const HARBOUR = {
  id: 'harbour', name: 'Harbour Loop', length: 144,
  barriers: [[12, 2], [20, 0], [29, 1], [44, 0], [52, 2], [66, 1], [77, 0], [88, 2], [101, 1], [113, 2], [126, 0], [137, 1]],
  sweepers: [[58, 7], [118, 31]],
}
export const TRACKS = { sunlit: SUNLIT, harbour: HARBOUR }
export const LENGTH = SUNLIT.length
// Python's % on a positive modulus never gives a negative answer.
export const mod = (x, m) => ((x % m) + m) % m
export const clamp = (x, low, high) => Math.max(low, Math.min(high, x))

export function reset(seed = 1, lane = null) {
  if (lane === null || lane === undefined) lane = new PyRandom(seed).randrange(3)
  return { p: 0, lane, speed: 0, ticks: 0, crashes: 0, total: 0, done: false, finished: false, last: null }
}
export function sweeperLane(tick, offset) {
  const phase = mod(tick + offset, 48)
  return phase <= 24 ? phase / 12 : (48 - phase) / 12
}
export const sweepers = (tick, track = SUNLIT) => track.sweepers.map(([p, offset]) => ({ p, lane: sweeperLane(tick, offset), nextP: p, nextLane: sweeperLane(tick + 1, offset), kind: 'sweeper' }))
export const barriers = (track = SUNLIT) => track.barriers.map(([p, lane]) => ({ p, lane, nextP: p, nextLane: lane, kind: 'barrier' }))
export const movingObstacles = sweepers

export function intent(state, action) {
  let lane = state.lane, speed = state.speed
  if (action === 0) lane -= 1
  if (action === 2) lane += 1
  if (action === 3) speed += 1
  if (action === 4) speed -= 1
  lane = clamp(lane, 0, 2); speed = clamp(speed, 0, 2)
  return { p: state.p, lane: state.lane, nextP: state.p + speed + 1, nextLane: lane, speed }
}
export function contact(a, b, length) {
  const gap = mod(b.p - a.p + length / 2, length) - length / 2
  let enter = 0, leave = 1
  for (const [distance, velocity] of [[gap, (b.nextP - b.p) - (a.nextP - a.p)], [b.lane - a.lane, (b.nextLane - b.lane) - (a.nextLane - a.lane)]]) {
    if (Math.abs(velocity) < 1e-9) { if (Math.abs(distance) >= SIZE) return false; continue }
    const t1 = (-SIZE - distance) / velocity, t2 = (SIZE - distance) / velocity
    enter = Math.max(enter, Math.min(t1, t2)); leave = Math.min(leave, Math.max(t1, t2))
    if (enter >= leave) return false
  }
  return enter < leave
}
export function step(state, action, track = SUNLIT, traffic = [], penalty = 6, laps = 1, kartContact = false) {
  if (state.done) return state
  const length = track.length, planned = intent(state, action)
  let obstacle = null
  for (const o of [...barriers(track), ...sweepers(state.ticks, track)]) if (obstacle === null && contact(planned, o, length)) obstacle = o
  const hitKart = kartContact || traffic.some(car => contact(planned, car, length))
  const hit = obstacle !== null || hitKart
  const p = Math.min(hit ? state.p : planned.nextP, length * laps)
  const lane = hit ? state.lane : planned.nextLane, speed = hit ? 0 : planned.speed
  const crashes = state.crashes + (hit ? 1 : 0), ticks = state.ticks + 1
  const finished = p >= length * laps, done = finished || ticks >= 210 * laps || crashes >= 8 * laps
  const parts = { progress: (p - state.p) * 0.15, time: -0.2, collision: hit ? -penalty : 0, finish: finished ? 10 : 0 }
  const reward = parts.progress + parts.time + parts.collision + parts.finish
  const what = hitKart ? 'kart' : obstacle !== null ? obstacle.kind : null
  return { p, lane, speed, ticks, crashes, total: state.total + reward, done, finished, last: { action, reward, parts, hit: what, impactP: planned.nextP, impactLane: planned.nextLane } }
}
export function scriptedTraffic(tick, seed, track = SUNLIT) {
  return [0, 1, 2].map(lane => { const p = (seed * (lane + 3) + lane * 43 + tick) % track.length; return { p, lane, nextP: p + 1, nextLane: lane } })
}
export function drive(policy, seed = 1, track = SUNLIT, traffic = true, onStep) {
  let state = reset(seed)
  while (!state.done) {
    const cars = traffic ? scriptedTraffic(state.ticks, seed, track) : []
    const before = state
    state = step(state, policy(state, cars, track), track, cars)
    onStep?.({ before, state, cars })
  }
  return state
}

// observe.py
export const N_KEYS = 144 * 3 * 3 * 8, N_SENSOR_KEYS = 3 * 3 * 27, NEAR = 3, FAR = 6
export const ahead = (p, other, length) => mod(other - p, length)
export const touches = (thing, lane) => Math.abs(lane - thing.lane) <= SIZE || Math.abs(lane - thing.nextLane) <= SIZE
export function hazardMask(state, traffic, track = SUNLIT) {
  const length = track.length
  let mask = 0
  for (const thing of [...traffic, ...sweepers(state.ticks, track)]) {
    const d = ahead(state.p, thing.p, length)
    if (d <= 4 || d >= length - SIZE) for (let lane = 0; lane < 3; lane++) if (touches(thing, lane)) mask |= 1 << lane
  }
  return mask
}
export function observe(state, traffic = [], track = SUNLIT) {
  const sector = mod(state.p, track.length), mask = hazardMask(state, traffic, track)
  return ((sector * 3 + state.lane) * 3 + state.speed) * 8 + mask
}
export const decodeKey = key => ({ sector: Math.floor(key / 72), lane: Math.floor(key / 24) % 3, speed: Math.floor(key / 8) % 3, mask: key % 8 })
export function sensors(state, traffic = [], track = SUNLIT) {
  const length = track.length, near = [0, 0, 0]
  for (const thing of [...barriers(track), ...sweepers(state.ticks, track), ...traffic]) {
    let d = ahead(state.p, thing.p, length)
    if (d >= length - SIZE) d = 0
    const level = d <= NEAR ? 2 : d <= FAR ? 1 : 0
    for (let lane = 0; lane < 3; lane++) if (touches(thing, lane)) near[lane] = Math.max(near[lane], level)
  }
  return near
}
export function sensorKey(state, traffic = [], track = SUNLIT) {
  const near = sensors(state, traffic, track)
  return ((state.lane * 3 + state.speed) * 3 + near[0]) * 9 + near[1] * 3 + near[2]
}

// drivers.py
export function randomDriver(seed = 0) { const rng = new PyRandom(seed); return () => rng.randrange(5) }
export const flatOut = () => 3
export function careful(state, cars, track) {
  const near = sensors(state, cars, track), lane = state.lane
  if (near[lane] === 0) return 3
  let best = lane
  for (const side of [lane - 1, lane + 1]) if (side >= 0 && side <= 2 && near[side] < near[best]) best = side
  if (best < lane) return 0
  if (best > lane) return 2
  return state.speed > 0 ? 4 : 1
}
export function measure(driver, laps = 30, track = SUNLIT, seed = 800001) {
  let finished = 0, hits = 0
  for (let i = 0; i < laps; i++) { const s = drive(driver, seed + i * 97, track); finished += s.finished ? 1 : 0; hits += s.crashes }
  return [finished / laps, hits / laps]
}
