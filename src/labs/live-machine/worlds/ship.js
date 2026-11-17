// worlds/ship.js
// The Meridian's shared parts, used by every world: its rooms, its crew, alarms, the course
// (the navigation console on the Bridge needs light), and the ship log.
//
// A world module (lights.js, reactor.js, doors.js) exports:
//   create(rand)                  -> the starting world
//   inputs(world)                 -> the args arrays the learner's function is called with
//   advance(world, results, rand) -> the next world, given the learner's answers
//   stats(world)                  -> [{ id, label, value, unit?, tone, bar? }] for the status bar

export const ROOMS = [
  { name: 'Engine', x: 78, y: 150, w: 150, h: 130 },
  { name: 'Cargo', x: 246, y: 96, w: 190, h: 110 },
  { name: 'Quarters', x: 246, y: 224, w: 190, h: 110 },
  { name: 'Galley', x: 454, y: 96, w: 160, h: 110 },
  { name: 'Med bay', x: 454, y: 224, w: 160, h: 110 },
  { name: 'Bridge', x: 632, y: 150, w: 170, h: 130 },
]
export const ROOM = Object.fromEntries(ROOMS.map(r => [r.name, r]))

export const CREW = [
  { id: 'okafor', name: 'Okafor', role: 'Engineer', color: '#f59e0b', home: 'Engine' },
  { id: 'lin', name: 'Lin', role: 'Medic', color: '#34d399', home: 'Med bay' },
  { id: 'vasquez', name: 'Vasquez', role: 'Pilot', color: '#60a5fa', home: 'Quarters' },
  { id: 'haddad', name: 'Haddad', role: 'Quartermaster', color: '#f472b6', home: 'Cargo' },
  { id: 'brandt', name: 'Brandt', role: 'Cook', color: '#a78bfa', home: 'Galley' },
]
export const CREW_INFO = Object.fromEntries(CREW.map(c => [c.id, c]))

export const ALARM_TICKS = 16

export const pick = (list, rand) => list[Math.floor(rand() * list.length) % list.length]
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export function say(log, tick, who, text, tone = 'info') {
  log.push({ tick, who, text, tone })
  if (log.length > 40) log.shift()
}

// Things that went wrong, kept for the last RECENT ticks, so a gauge drops back to zero once
// the learner's fix is working (a running total would still show the old mistakes).
export const RECENT = 60
export const recentAdd = (list, tick, kind) => [...list.filter(e => e.tick > tick - RECENT), { tick, kind }]
export const recentCount = (world, kind) => (world.recent ?? []).filter(e => e.kind === kind && e.tick > world.tick - RECENT).length

export const crewIn = (world, roomName) => world.crew.filter(c => c.room === roomName).length

export function newCrew(rand) {
  return CREW.map(c => ({ id: c.id, room: c.home, slot: 0, wait: 4 + Math.floor(rand() * 10) }))
}

// Alarms count down; sometimes a new one starts, usually in an empty room.
export function stepAlarms(world, rooms, tick, rand, log) {
  let next = rooms.map(r => ({ ...r, alarm: Math.max(0, (r.alarm ?? 0) - 1) }))
  if (!next.some(r => r.alarm > 0) && rand() < 0.045) {
    const empty = next.filter(r => crewIn(world, r.name) === 0)
    const target = pick(empty.length ? empty : next, rand)
    next = next.map(r => (r.name === target.name ? { ...r, alarm: ALARM_TICKS } : r))
    say(log, tick, 'Ship', `Alarm in ${target.name}! Crew responding.`, 'warn')
  }
  return next
}

// Crew wander between rooms. A few ticks into an alarm (long enough to see an empty alarm
// room), one crew member runs there and stays until it's dealt with.
export function stepCrew(world, rooms, tick, rand) {
  const alarmRoom = rooms.find(r => r.alarm > 0)
  const responder = alarmRoom && alarmRoom.alarm === ALARM_TICKS - 5 ? CREW[tick % CREW.length].id : null
  const crew = world.crew.map(c => {
    let { room, wait } = c
    wait -= 1
    if (c.id === responder && room !== alarmRoom.name) return { ...c, room: alarmRoom.name, wait: ALARM_TICKS }
    if (wait <= 0) {
      room = rand() < 0.35 ? CREW_INFO[c.id].home : pick(ROOMS.filter(r => r.name !== room), rand).name
      wait = 8 + Math.floor(rand() * 16)
    }
    return { ...c, room, wait }
  })
  return placeCrew(crew)
}

// Slots spread people out inside a room.
export function placeCrew(crew) {
  const seen = {}
  return crew.map(c => (c.room ? { ...c, slot: (seen[c.room] = (seen[c.room] ?? -1) + 1) } : c))
}

// The navigation console is on the Bridge's lighting circuit. Dark Bridge: the ship drifts.
export function stepCourse(world, rooms, tick, log) {
  const bridgeLit = rooms.find(r => r.name === 'Bridge')?.lit
  const course = clamp((world.course ?? 100) + (bridgeLit ? 4 : -3), 0, 100)
  if (course < 60 && (world.course ?? 100) >= 60) {
    say(log, tick, 'Vasquez', 'The nav console on the Bridge has gone dark. We\'re drifting off course!', 'bad')
  }
  if (course >= 90 && (world.course ?? 100) < 90) say(log, tick, 'Vasquez', 'Nav console back. Correcting course.', 'good')
  return course
}

export function courseStat(world) {
  const c = Math.round(world.course ?? 100)
  return { id: 'course', label: 'Course', value: c, unit: '%', tone: c < 40 ? 'bad' : c < 80 ? 'warn' : 'good', bar: c / 100 }
}

// Crew notice when they're in the dark.
export function grumble(world, tick, log) {
  if (tick % 12 !== 0) return
  const dark = world.crew.find(c => c.room && !world.rooms.find(r => r.name === c.room).lit)
  if (dark) say(log, tick, CREW_INFO[dark.id].name, `It's pitch black in ${dark.room}. I can't see a thing.`, 'warn')
}

export function darkCount(world) {
  return world.crew.filter(c => c.room && !world.rooms.find(r => r.name === c.room).lit).length
}
