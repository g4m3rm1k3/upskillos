// worlds/lights.js
// Season 0, level 1: the ship asks lightOn(room) for every room, every tick. A reactor that
// can't light everything at once, crew who wander, alarms, and a Bridge whose nav console
// goes down in the dark. Pure functions only, so the tests can run it. See ship.js.
import {
  ROOMS, courseStat, crewIn, darkCount, grumble, newCrew, say, stepAlarms, stepCourse, stepCrew,
} from './ship.js'

export { ROOMS, crewIn }

const GEN = 4.8 // power made per tick: enough for 4-5 lights, not all 6
const COST = 1 // power used per lit room per tick

export function create(rand = Math.random) {
  return {
    tick: 0,
    power: 80,
    course: 100,
    blackout: false,
    rooms: ROOMS.map(r => ({ name: r.name, lit: false, alarm: 0, answer: undefined, error: null })),
    crew: newCrew(rand),
    log: [],
  }
}

// What the ship hands to lightOn(room), for each room. A fresh object each time.
export function inputs(world) {
  return world.rooms.map(r => [{ name: r.name, crew: crewIn(world, r.name), emergency: r.alarm > 0 }])
}

export function advance(world, results, rand = Math.random) {
  const tick = world.tick + 1
  const log = [...world.log]

  // 1. The learner's answers switch lights, unless the reactor is in blackout.
  let rooms = world.rooms.map((r, i) => {
    const res = results?.[i]
    const answer = res?.ok ? res.value : undefined
    return { ...r, answer, error: res && !res.ok ? res.error : null, lit: !world.blackout && answer === true }
  })

  // 2. Power: the reactor makes GEN, every lit room costs COST.
  const lit = rooms.filter(r => r.lit).length
  const power = Math.max(0, Math.min(100, world.power + GEN - lit * COST))
  let blackout = world.blackout
  if (!blackout && power <= 0) {
    blackout = true
    say(log, tick, 'Reactor', 'Power exhausted. Emergency blackout: all lights forced off until reserves recover.', 'bad')
  } else if (blackout && power >= 30) {
    blackout = false
    say(log, tick, 'Reactor', 'Reserves at 30%. Lighting control returned to your code.', 'good')
  }
  if (blackout) rooms = rooms.map(r => ({ ...r, lit: false }))

  const course = stepCourse(world, rooms, tick, log)
  rooms = stepAlarms(world, rooms, tick, rand, log)
  const crew = stepCrew(world, rooms, tick, rand)
  const next = { ...world, tick, power, course, blackout, rooms, crew, log }
  grumble(next, tick, log)
  return next
}

export function stats(world) {
  const wasted = world.rooms.filter(r => r.lit && crewIn(world, r.name) === 0 && r.alarm === 0 && r.name !== 'Bridge').length
  const darkAlarms = world.rooms.filter(r => r.alarm > 0 && !r.lit).length
  return [
    { id: 'power', label: 'Power', value: Math.round(world.power), unit: '%', tone: world.blackout ? 'bad' : world.power < 30 ? 'warn' : 'good', bar: world.power / 100 },
    courseStat(world),
    { id: 'dark', label: 'Crew in the dark', value: darkCount(world), tone: darkCount(world) ? 'warn' : 'good' },
    { id: 'wasted', label: 'Empty rooms lit', value: wasted, tone: wasted ? 'warn' : 'good' },
    { id: 'alarms', label: 'Dark alarms', value: darkAlarms, tone: darkAlarms ? 'bad' : 'good' },
  ]
}
