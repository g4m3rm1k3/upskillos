// worlds/reactor.js
// Season 0, level 2: once a tick the ship calls planPower(rooms, supply) with every room and
// how many lights the reactor can carry, and lights the rooms whose names come back. More
// names than supply trips the breaker. The reactor runs a cycle: full output, then cooling.
import {
  ROOMS, clamp, courseStat, crewIn, darkCount, grumble, newCrew, recentAdd, recentCount, say, stepAlarms, stepCourse, stepCrew,
} from './ship.js'

export const FULL = 6
export const COOLING = 3
const CYCLE = 60 // ticks: first half full output, second half cooling
const TRIP_TICKS = 6

export const supplyAt = tick => ((tick % CYCLE) < CYCLE / 2 ? FULL : COOLING)

export function create(rand = Math.random) {
  return {
    tick: 0,
    supply: FULL,
    course: 100,
    tripped: 0,
    trips: 0,
    recent: [],
    plan: undefined,
    error: null,
    rooms: ROOMS.map(r => ({ name: r.name, lit: false, alarm: 0, answer: undefined, error: null })),
    crew: newCrew(rand),
    log: [],
  }
}

// One call per tick: planPower(rooms, supply).
export function inputs(world) {
  const rooms = world.rooms.map(r => ({ name: r.name, crew: crewIn(world, r.name), emergency: r.alarm > 0 }))
  return [[rooms, world.supply]]
}

export function advance(world, results, rand = Math.random) {
  const tick = world.tick + 1
  const log = [...world.log]
  const res = results?.[0]
  let error = res && !res.ok ? res.error : null
  let plan = res?.ok ? res.value : undefined
  if (res?.ok && !Array.isArray(plan)) {
    error = `planPower must return an array of room names, but it returned ${JSON.stringify(plan) ?? 'undefined'}.`
    plan = undefined
  }
  const names = new Set(Array.isArray(plan) ? plan : [])

  let tripped = Math.max(0, world.tripped - 1)
  let trips = world.trips
  let recent = world.recent ?? []
  if (!tripped && names.size > world.supply) {
    tripped = TRIP_TICKS
    trips += 1
    recent = recentAdd(recent, tick, 'trip')
    say(log, tick, 'Reactor', `Breaker tripped: asked for ${names.size} lights, supply is ${world.supply}. Every light is out.`, 'bad')
  }

  let rooms = world.rooms.map(r => ({
    ...r,
    answer: plan === undefined ? undefined : names.has(r.name),
    error,
    lit: !tripped && names.has(r.name),
  }))

  const supply = supplyAt(tick)
  if (supply !== world.supply) {
    say(log, tick, 'Reactor', supply === COOLING ? `Cooling cycle: supply down to ${COOLING} lights.` : `Full output: supply back to ${FULL} lights.`, supply === COOLING ? 'warn' : 'good')
  }

  const course = stepCourse(world, rooms, tick, log)
  rooms = stepAlarms(world, rooms, tick, rand, log)
  const crew = stepCrew(world, rooms, tick, rand)
  const next = { ...world, tick, supply, course, tripped, trips, recent, plan, error, rooms, crew, log }
  grumble(next, tick, log)
  return next
}

export function stats(world) {
  const lit = world.rooms.filter(r => r.lit).length
  const darkAlarms = world.rooms.filter(r => r.alarm > 0 && !r.lit).length
  return [
    { id: 'supply', label: 'Lights / supply', value: `${lit}/${world.supply}`, tone: world.tripped ? 'bad' : world.supply === COOLING ? 'warn' : 'good', bar: clamp(lit / FULL, 0, 1) },
    { id: 'trips', label: 'Breaker trips · 30s', value: recentCount(world, 'trip'), tone: world.tripped ? 'bad' : recentCount(world, 'trip') ? 'warn' : 'good' },
    courseStat(world),
    { id: 'dark', label: 'Crew in the dark', value: darkCount(world), tone: darkCount(world) ? 'warn' : 'good' },
    { id: 'alarms', label: 'Dark alarms', value: darkAlarms, tone: darkAlarms ? 'bad' : 'good' },
  ]
}
