// python/race.py in JavaScript, exactly: three karts deciding from the same moment, moving together,
// and every bump stopping both karts, with chains of bumps resolved without favouring any seat.
import { SUNLIT, contact, reset, step } from './kart.js'

export const createRace = () => ({ cars: [0, 1, 2].map(lane => reset(1, lane)), tick: 0 })
export const asTraffic = car => ({ p: car.p, lane: car.lane, nextP: car.p, nextLane: car.lane })
const path = (before, after) => ({ p: before.p, lane: before.lane, nextP: after.p, nextLane: after.lane })
// policies[i](state, cars, track) → action, or null for the human seat, which takes humanAction.
export function stepRace(race, policies, humanAction = 1, track = SUNLIT, laps = 3) {
  const cars = race.cars
  if (cars.every(c => c.done)) return race
  const actions = cars.map((car, i) => policies[i] ? policies[i](car, cars.filter((c, j) => j !== i && !c.done).map(asTraffic), track) : humanAction)
  const moved = cars.map((car, i) => step(car, actions[i], track, [], 6, laps))
  const bumped = new Set()
  for (let pass = 0; pass < cars.length; pass++) {
    const added = new Set()
    for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
      if (cars[i].done || cars[j].done) continue
      if (contact(path(cars[i], moved[i]), path(cars[j], moved[j]), track.length)) { added.add(i); added.add(j) }
    }
    let changed = false
    for (const i of [...added].sort()) if (!bumped.has(i)) { bumped.add(i); changed = true; moved[i] = step(cars[i], actions[i], track, [], 6, laps, true) }
    if (!changed) break
  }
  return { cars: moved, tick: race.tick + 1, actions }
}
// Seat indices, best first: finishers by time, then the rest by distance.
export function rankRace(race) {
  const key = i => race.cars[i].finished ? [0, race.cars[i].ticks] : [1, -race.cars[i].p]
  return [0, 1, 2].sort((a, b) => key(a)[0] - key(b)[0] || key(a)[1] - key(b)[1])
}
export function runRace(policies, track = SUNLIT) {
  let race = createRace()
  while (!race.cars.every(c => c.done)) race = stepRace(race, policies, 1, track)
  return race
}
export const ORDERS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]
export function tournament(policies, track = SUNLIT) {
  const points = [0, 0, 0], finishes = [0, 0, 0], races = []
  for (const order of ORDERS) {
    const race = runRace(order.map(k => policies[k]), track)
    race.cars.forEach((car, seat) => {
      if (!car.finished) return
      const driver = order[seat]
      finishes[driver]++
      const better = race.cars.filter(c => c.finished && c.ticks < car.ticks).length, tied = race.cars.filter(c => c.finished && c.ticks === car.ticks).length
      let sum = 0
      for (let k = 0; k < tied; k++) sum += 3 - better - k
      points[driver] += sum / tied
    })
    races.push({ order, race })
  }
  return { points, finishes, races }
}
