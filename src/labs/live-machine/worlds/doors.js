// worlds/doors.js
// Season 0, level 3: every room has one door onto the central corridor. Each tick the ship
// calls nextDoorState(door) for every door and sets the door to "open", "closed" or "locked".
// Crew must pass through two doors to change rooms (out of one, into the next), spending two
// ticks in each doorway. Hull breaches happen in empty rooms; an open door to one leaks air.
// A door that goes straight from "locked" to "open" tears its seal.
import { ROOMS, ROOM, CREW, CREW_INFO, clamp, pick, recentAdd, recentCount, say } from './ship.js'

export const STATES = ['open', 'closed', 'locked']
const BREACH_TICKS = 24
const PASS_TICKS = 2

// Where each door is, and where people stand on either side of it.
export const DOORS = {
  Engine: { x: 228, y: 215, vertical: true, inside: { x: 206, y: 215 }, outside: { x: 252, y: 215 }, label: { x: 206, y: 190, anchor: 'middle' } },
  Cargo: { x: 341, y: 206, inside: { x: 341, y: 184 }, outside: { x: 341, y: 215 }, label: { x: 318, y: 196, anchor: 'end' } },
  Quarters: { x: 341, y: 224, inside: { x: 341, y: 246 }, outside: { x: 315, y: 215 }, label: { x: 366, y: 243, anchor: 'start' } },
  Galley: { x: 534, y: 206, inside: { x: 534, y: 184 }, outside: { x: 534, y: 215 }, label: { x: 511, y: 196, anchor: 'end' } },
  'Med bay': { x: 534, y: 224, inside: { x: 534, y: 246 }, outside: { x: 508, y: 215 }, label: { x: 559, y: 243, anchor: 'start' } },
  Bridge: { x: 632, y: 215, vertical: true, inside: { x: 654, y: 215 }, outside: { x: 608, y: 215 }, label: { x: 654, y: 190, anchor: 'middle' } },
}

export function create(rand = Math.random) {
  return {
    tick: 0,
    air: 100,
    slams: 0,
    closeCalls: 0,
    seals: 0,
    recent: [],
    rooms: ROOMS.map(r => ({ name: r.name, lit: true, alarm: 0, breach: 0 })),
    doors: ROOMS.map(r => ({ room: r.name, state: 'closed', answer: undefined, error: null })),
    crew: CREW.map(c => ({ id: c.id, room: c.home, phase: 'idle', door: null, dest: null, passing: 0, slot: 0, wait: 3 + Math.floor(rand() * 8) })),
    log: [],
  }
}

const at = (crew, door, phase) => crew.filter(c => c.door === door && c.phase === phase).length

// What nextDoorState(door) is given, for each door.
export function inputs(world) {
  return world.doors.map(d => [{
    room: d.room,
    state: d.state,
    waiting: at(world.crew, d.room, 'leaving') + at(world.crew, d.room, 'entering'),
    inDoorway: at(world.crew, d.room, 'doorway'),
    breach: (world.rooms.find(r => r.name === d.room)?.breach ?? 0) > 0,
  }])
}

export function advance(world, results, rand = Math.random) {
  const tick = world.tick + 1
  const log = [...world.log]
  let { slams, closeCalls, seals, air } = world
  let recent = world.recent ?? []

  // 1. Your answers set the doors.
  const doors = world.doors.map((d, i) => {
    const res = results?.[i]
    if (!res) return { ...d, answer: undefined, error: null }
    if (!res.ok) return { ...d, answer: undefined, error: res.error }
    const answer = res.value
    if (!STATES.includes(answer)) return { ...d, answer, error: `nextDoorState must return "open", "closed" or "locked", not ${JSON.stringify(answer) ?? 'undefined'}.` }
    if (d.state === 'locked' && answer === 'open') {
      seals += 1
      recent = recentAdd(recent, tick, 'seal')
      say(log, tick, 'Okafor', `The ${d.room} door went straight from locked to open and tore its seal. It has to go through "closed" first!`, 'bad')
    }
    return { ...d, state: answer, answer, error: null }
  })
  const door = Object.fromEntries(doors.map(d => [d.room, d]))

  // 2. Breaches count down; sometimes one starts in an empty room, and someone is sent to look.
  let rooms = world.rooms.map(r => ({ ...r, breach: Math.max(0, r.breach - 1) }))
  let investigator = null
  if (!rooms.some(r => r.breach > 0) && rand() < 0.04) {
    const empty = rooms.filter(r => r.name !== 'Bridge' && !world.crew.some(c => c.room === r.name || c.dest === r.name))
    if (empty.length) {
      const target = pick(empty, rand)
      rooms = rooms.map(r => (r.name === target.name ? { ...r, breach: BREACH_TICKS } : r))
      const idle = world.crew.filter(c => c.phase === 'idle')
      investigator = idle.length ? { id: pick(idle, rand).id, room: target.name } : null
      say(log, tick, 'Ship', `Hull breach in ${target.name}!${investigator ? ` ${CREW_INFO[investigator.id].name} is going to check on it.` : ''}`, 'bad')
    }
  }
  const breached = name => (rooms.find(r => r.name === name)?.breach ?? 0) > 0
  for (const r of rooms) if (r.breach > 0 && door[r.name].state === 'open') air -= 5
  air = clamp(air + 0.8, 0, 100)
  if (air < 70 && world.air >= 70) say(log, tick, 'Ship', 'Air pressure falling: a door is open onto a hull breach.', 'bad')

  // 3. Crew move.
  const crew = world.crew.map(c0 => {
    const c = { ...c0 }
    if (c.phase === 'doorway') {
      if (door[c.door].state !== 'open') {
        slams += 1
        recent = recentAdd(recent, tick, 'slam')
        say(log, tick, CREW_INFO[c.id].name, `Ow! The ${c.door} door closed on me while I was in the doorway!`, 'bad')
        if (c.room) { c.phase = 'leaving' } else { c.phase = 'entering' }
        return c
      }
      c.passing -= 1
      if (c.passing > 0) return c
      if (c.room) { // stepped out into the corridor; now head for the destination's door
        c.room = null
        c.phase = 'entering'
        c.door = c.dest
        return c
      }
      if (breached(c.door)) { // walked into a breach
        closeCalls += 1
        recent = recentAdd(recent, tick, 'call')
        say(log, tick, CREW_INFO[c.id].name, `The ${c.door} door opened onto a hull breach! My suit alarm pulled me back. Lock that door!`, 'bad')
        c.phase = 'entering'
        c.dest = CREW_INFO[c.id].home === c.door ? 'Galley' : CREW_INFO[c.id].home
        c.door = c.dest
        return c
      }
      c.room = c.door
      c.phase = 'idle'
      c.door = null
      c.dest = null
      c.wait = 8 + Math.floor(rand() * 14)
      return c
    }
    if (c.phase === 'leaving' || c.phase === 'entering') {
      if (door[c.door].state === 'open') { c.phase = 'doorway'; c.passing = PASS_TICKS }
      return c
    }
    // idle in a room
    c.wait -= 1
    if (investigator?.id === c.id && c.room !== investigator.room) {
      return { ...c, phase: 'leaving', door: c.room, dest: investigator.room }
    }
    if (c.wait <= 0) {
      const dest = rand() < 0.35 && CREW_INFO[c.id].home !== c.room ? CREW_INFO[c.id].home : pick(ROOMS.filter(r => r.name !== c.room), rand).name
      return { ...c, phase: 'leaving', door: c.room, dest }
    }
    return c
  })
  const seen = {}
  const placed = crew.map(c => {
    const key = c.phase === 'idle' ? `room:${c.room}` : `${c.phase}:${c.door}:${c.room ? 'in' : 'out'}`
    return { ...c, slot: (seen[key] = (seen[key] ?? -1) + 1) }
  })

  return { ...world, tick, air, slams, closeCalls, seals, recent, rooms, doors, crew: placed, log }
}

export function stats(world) {
  const waiting = world.crew.filter(c => c.phase === 'leaving' || c.phase === 'entering').length
  return [
    { id: 'air', label: 'Air', value: Math.round(world.air), unit: '%', tone: world.air < 50 ? 'bad' : world.air < 90 ? 'warn' : 'good', bar: world.air / 100 },
    { id: 'waiting', label: 'Crew waiting', value: waiting, tone: waiting > 2 ? 'bad' : waiting ? 'warn' : 'good' },
    { id: 'slams', label: 'Closed on crew · 30s', value: recentCount(world, 'slam'), tone: recentCount(world, 'slam') ? 'bad' : 'good' },
    { id: 'calls', label: 'Breach calls · 30s', value: recentCount(world, 'call'), tone: recentCount(world, 'call') ? 'bad' : 'good' },
    { id: 'seals', label: 'Seals torn · 30s', value: recentCount(world, 'seal'), tone: recentCount(world, 'seal') ? 'bad' : 'good' },
  ]
}

// Where to draw a crew member.
export function crewPoint(c) {
  if (c.phase === 'idle') {
    const r = ROOM[c.room]
    const cols = Math.max(1, Math.floor((r.w - 30) / 30))
    return { x: r.x + 24 + (c.slot % cols) * 30, y: r.y + r.h - 24 - Math.floor(c.slot / cols) * 30 }
  }
  const d = DOORS[c.door]
  const p = c.phase === 'doorway' ? { x: d.x, y: d.y } : c.room ? d.inside : d.outside
  return d.vertical && c.room ? { x: p.x, y: p.y + c.slot * 18 } : { x: p.x + c.slot * 18, y: p.y }
}
