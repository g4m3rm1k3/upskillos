// worlds/lights.js
// The Meridian, Season 0: six rooms, five crew who wander between them, random alarms, and a
// reactor that can't light everything at once. Pure functions only, so the tests can run it.
//
// A world module exports:
//   create(rand)            -> the starting world
//   inputs(world)           -> the args arrays the learner's function is called with, one per thing
//   advance(world, results, rand) -> the next world, given the learner's answers
//   stats(world)            -> [{ id, label, value, tone }] for the status bar

export const ROOMS = [
  { name: 'Engine', x: 78, y: 150, w: 150, h: 130 },
  { name: 'Cargo', x: 246, y: 96, w: 190, h: 110 },
  { name: 'Quarters', x: 246, y: 224, w: 190, h: 110 },
  { name: 'Galley', x: 454, y: 96, w: 160, h: 110 },
  { name: 'Med bay', x: 454, y: 224, w: 160, h: 110 },
  { name: 'Bridge', x: 632, y: 150, w: 170, h: 130 },
]

export const CREW = [
  { id: 'okafor', name: 'Okafor', role: 'Engineer', color: '#f59e0b', home: 'Engine' },
  { id: 'lin', name: 'Lin', role: 'Medic', color: '#34d399', home: 'Med bay' },
  { id: 'vasquez', name: 'Vasquez', role: 'Pilot', color: '#60a5fa', home: 'Quarters' },
  { id: 'haddad', name: 'Haddad', role: 'Quartermaster', color: '#f472b6', home: 'Cargo' },
  { id: 'brandt', name: 'Brandt', role: 'Cook', color: '#a78bfa', home: 'Galley' },
]

const GEN = 3.6 // power made per tick
const COST = 1 // power used per lit room per tick
const ALARM_TICKS = 16

const pick = (list, rand) => list[Math.floor(rand() * list.length) % list.length]

export function create(rand = Math.random) {
  return {
    tick: 0,
    power: 80,
    blackout: false,
    rooms: ROOMS.map(r => ({ name: r.name, lit: false, alarm: 0, answer: undefined })),
    crew: CREW.map(c => ({ id: c.id, room: c.home, slot: 0, wait: 4 + Math.floor(rand() * 10) })),
    log: [],
    totals: { darkCrewTicks: 0, wastedTicks: 0, darkAlarmTicks: 0 },
  }
}

export function crewIn(world, roomName) {
  return world.crew.filter(c => c.room === roomName).length
}

// What the ship hands to lightOn(room), for each room. A fresh object each time.
export function inputs(world) {
  return world.rooms.map(r => [{ name: r.name, crew: crewIn(world, r.name), emergency: r.alarm > 0 }])
}

function say(log, tick, who, text, tone = 'info') {
  log.push({ tick, who, text, tone })
  if (log.length > 40) log.shift()
}

export function advance(world, results, rand = Math.random) {
  const tick = world.tick + 1
  const log = [...world.log]
  const totals = { ...world.totals }

  // 1. The learner's answers switch lights, unless the reactor is in blackout.
  let rooms = world.rooms.map((r, i) => {
    const res = results?.[i]
    const answer = res?.ok ? res.value : undefined
    return { ...r, answer, error: res && !res.ok ? res.error : null, lit: !world.blackout && answer === true }
  })

  // 2. Power: the reactor makes GEN, every lit room costs COST.
  const lit = rooms.filter(r => r.lit).length
  let power = Math.max(0, Math.min(100, world.power + GEN - lit * COST))
  let blackout = world.blackout
  if (!blackout && power <= 0) {
    blackout = true
    say(log, tick, 'Reactor', 'Power exhausted. Emergency blackout: all lights forced off until reserves recover.', 'bad')
  } else if (blackout && power >= 30) {
    blackout = false
    say(log, tick, 'Reactor', 'Reserves at 30%. Lighting control returned to your code.', 'good')
  }
  if (blackout) rooms = rooms.map(r => ({ ...r, lit: false }))

  // 3. Alarms count down; sometimes a new one starts, usually in an empty room.
  rooms = rooms.map(r => ({ ...r, alarm: Math.max(0, r.alarm - 1) }))
  if (!rooms.some(r => r.alarm > 0) && rand() < 0.045) {
    const empty = rooms.filter(r => crewIn(world, r.name) === 0)
    const target = pick(empty.length ? empty : rooms, rand)
    rooms = rooms.map(r => (r.name === target.name ? { ...r, alarm: ALARM_TICKS } : r))
    say(log, tick, 'Ship', `Alarm in ${target.name}! Crew responding.`, 'warn')
  }
  const alarmRoom = rooms.find(r => r.alarm > 0)

  // 4. Crew move. A few ticks into an alarm (long enough to see an empty alarm room), one crew
  //    member runs there and stays until it's dealt with.
  const responder = alarmRoom && alarmRoom.alarm === ALARM_TICKS - 5 ? CREW[tick % CREW.length].id : null
  const crew = world.crew.map(c => {
    let { room, wait } = c
    wait -= 1
    if (c.id === responder && room !== alarmRoom.name) {
      return { ...c, room: alarmRoom.name, wait: ALARM_TICKS }
    }
    if (wait <= 0) {
      const others = ROOMS.filter(r => r.name !== room)
      room = rand() < 0.35 ? CREW.find(x => x.id === c.id).home : pick(others, rand).name
      wait = 8 + Math.floor(rand() * 16)
    }
    return { ...c, room, wait }
  })
  // Slots spread people out inside a room.
  const seen = {}
  const placed = crew.map(c => ({ ...c, slot: (seen[c.room] = (seen[c.room] ?? -1) + 1) }))

  // 5. Grumbles: crew notice when they're in the dark.
  const next = { ...world, tick, power, blackout, rooms, crew: placed, log, totals }
  for (const r of rooms) {
    const n = crewIn(next, r.name)
    if (n > 0 && !r.lit) totals.darkCrewTicks += n
    if (r.lit && n === 0 && r.alarm === 0 && r.name !== 'Bridge') totals.wastedTicks += 1
    if (r.alarm > 0 && !r.lit) totals.darkAlarmTicks += 1
  }
  if (tick % 12 === 0) {
    const dark = placed.find(c => !rooms.find(r => r.name === c.room).lit)
    if (dark) {
      const who = CREW.find(x => x.id === dark.id)
      say(log, tick, who.name, `It's pitch black in ${dark.room}. I can't see a thing.`, 'warn')
    }
  }
  return next
}

export function stats(world) {
  const darkCrew = world.crew.filter(c => !world.rooms.find(r => r.name === c.room).lit).length
  const wasted = world.rooms.filter(r => r.lit && crewIn(world, r.name) === 0 && r.alarm === 0 && r.name !== 'Bridge').length
  const darkAlarms = world.rooms.filter(r => r.alarm > 0 && !r.lit).length
  return [
    { id: 'power', label: 'Power', value: Math.round(world.power), unit: '%', tone: world.blackout ? 'bad' : world.power < 30 ? 'warn' : 'good', bar: world.power / 100 },
    { id: 'dark', label: 'Crew in the dark', value: darkCrew, tone: darkCrew ? 'warn' : 'good' },
    { id: 'wasted', label: 'Empty rooms lit', value: wasted, tone: wasted ? 'warn' : 'good' },
    { id: 'alarms', label: 'Dark alarms', value: darkAlarms, tone: darkAlarms ? 'bad' : 'good' },
  ]
}
