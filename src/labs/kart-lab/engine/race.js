import { reset, observe, step } from './game.js'
import { choose } from './learning.js'

export function createRace() {
  return { cars: [0, 1, 2].map(lane => reset(1, { lane })), tick: 0 }
}
export function stepRace(race, models, humanAction = 1) {
  if (race.cars.every(c => c.done)) return race
  // All racers observe the same pre-decision snapshot; array order cannot give an advantage.
  const cars = race.cars.map((car, i) => {
    const traffic = race.cars.filter((c, j) => j !== i && !c.done)
    const action = models[i] ? choose(models[i], observe(car, traffic).key, 0, () => 1) : humanAction
    return step(car, action, { traffic, laps: 3, penalty: 6 })
  })
  return { cars, tick: race.tick + 1 }
}
export function rankRace(race) {
  return race.cars.map((c, i) => ({ ...c, i })).sort((a, b) =>
    Number(b.finished) - Number(a.finished) || (a.finished && b.finished ? a.ticks - b.ticks : b.p - a.p))
}
export function runRace(models) {
  let race = createRace()
  while (!race.cars.every(c => c.done)) race = stepRace(race, models)
  return race
}
// This game is deterministic. Cover all starting-position permutations instead of
// pretending that repeating one identical race produces independent evidence.
export function tournament(models) {
  const permutations = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]
  const totals = models.map((_, i) => ({ i, points: 0, finishes: 0, crashes: 0, ticks: 0 }))
  const races = permutations.map(order => {
    const race = runRace(order.map(i => models[i])), ranked = rankRace(race)
    for (const car of ranked) {
      const total = totals[order[car.i]]
      total.crashes += car.crashes
      if (!car.finished) continue
      total.finishes++; total.ticks += car.ticks
      const better = ranked.filter(c => c.finished && c.ticks < car.ticks).length
      const tied = ranked.filter(c => c.finished && c.ticks === car.ticks).length
      // 3 / 2 / 1 points, sharing the occupied places for an exact tie. DNF earns zero.
      total.points += Array.from({ length: tied }, (_, j) => 3 - better - j).reduce((a, b) => a + b, 0) / tied
    }
    return { order, race }
  })
  return { races, totals: totals.sort((a, b) => b.points - a.points) }
}
