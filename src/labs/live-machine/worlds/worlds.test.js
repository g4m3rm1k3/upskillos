// Each step's lesson text points at a problem the learner can *see* on the ship. These run the
// worlds on the code a learner has after each step, and check that problem really shows up,
// and that the finished solution makes it go away.
import { describe, expect, it } from 'vitest'
import { WORLDS } from './index.js'
import { ALARM_TICKS } from './ship.js'

// An alarm is dark for the tick it starts in (lights were decided before it began).
const darkAlarm = w => w.rooms.some(r => r.alarm > 0 && r.alarm < ALARM_TICKS && !r.lit)

function seeded(seed) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

// Run a world for `ticks` with a plain JS function standing in for the learner's code.
function run(worldName, fn, ticks = 600, seed = 11) {
  const world = WORLDS[worldName]
  const rand = seeded(seed)
  let w = world.create(rand)
  const seen = []
  for (let i = 0; i < ticks; i++) {
    const results = world.inputs(w).map(args => {
      try { return { ok: true, value: fn(...structuredClone(args)) } } catch (e) { return { ok: false, error: e.message } }
    })
    w = world.advance(w, results, rand)
    seen.push(w)
  }
  return seen
}

const lightOn = room => room.emergency || room.name === 'Bridge' || room.crew > 0

describe('lights: the Bridge step has a visible reason', () => {
  it('every light on drains the reactor into a blackout', () => {
    expect(run('lights', () => true, 200).some(w => w.blackout)).toBe(true)
  })
  it('a dark Bridge sends the course down', () => {
    const seen = run('lights', room => room.emergency || room.crew > 0)
    expect(Math.min(...seen.map(w => w.course))).toBeLessThan(60)
  })
  it('the full rule keeps the course and never blacks out', () => {
    const seen = run('lights', lightOn)
    expect(seen.some(w => w.blackout)).toBe(false)
    expect(Math.min(...seen.slice(5).map(w => w.course))).toBeGreaterThanOrEqual(90)
  })
})

describe('reactor', () => {
  const step1 = rooms => rooms.filter(lightOn).map(r => r.name)
  const step2 = (rooms, supply) => rooms.filter(lightOn).map(r => r.name).slice(0, supply)
  const solution = (rooms, supply) => {
    const plan = []
    for (const r of rooms) if (r.emergency && plan.length < supply) plan.push(r.name)
    for (const r of rooms) if (r.name === 'Bridge' && !plan.includes(r.name) && plan.length < supply) plan.push(r.name)
    for (const r of rooms) if (!plan.includes(r.name) && lightOn(r) && plan.length < supply) plan.push(r.name)
    return plan
  }
  it('step 1 (every room that wants light) trips the breaker when cooling', () => {
    expect(run('reactor', step1).at(-1).trips).toBeGreaterThan(0)
  })
  it('step 2 (within supply) leaves an alarm dark at some point', () => {
    const seen = run('reactor', step2, 1500)
    expect(seen.at(-1).trips).toBe(0)
    expect(seen.some(darkAlarm)).toBe(true)
  })
  it('the solution never trips and never leaves an alarm dark', () => {
    const seen = run('reactor', solution, 1500)
    expect(seen.at(-1).trips).toBe(0)
    expect(seen.some(darkAlarm)).toBe(false)
  })
  it('a non-array answer is reported, not crashed on', () => {
    const [w] = run('reactor', () => 'Cargo', 1)
    expect(w.error).toMatch(/array/)
  })
})

describe('doors', () => {
  const step1 = d => (d.waiting > 0 ? 'open' : 'closed')
  const step2 = d => (d.waiting > 0 || d.inDoorway > 0 ? 'open' : 'closed')
  const step3 = d => (d.breach ? 'locked' : step2(d))
  const solution = d => (d.breach ? 'locked' : d.state === 'locked' ? 'closed' : step2(d))
  const moved = seen => seen[0].crew.some(c0 => seen.some(w => w.crew.find(c => c.id === c0.id).room !== c0.room))

  it('starting code: nobody gets anywhere', () => {
    const seen = run('doors', () => 'closed', 200)
    expect(seen.at(-1).crew.every(c => c.phase === 'leaving')).toBe(true)
  })
  it('step 1 closes doors on crew', () => {
    expect(run('doors', step1).at(-1).slams).toBeGreaterThan(0)
  })
  it('step 2 lets crew move but opens onto breaches', () => {
    const seen = run('doors', step2, 1500)
    expect(seen.at(-1).slams).toBe(0)
    expect(moved(seen)).toBe(true)
    expect(seen.at(-1).closeCalls).toBeGreaterThan(0)
  })
  it('step 3 tears seals when a breach ends', () => {
    const seen = run('doors', step3, 1500)
    expect(seen.at(-1).closeCalls).toBe(0)
    expect(seen.at(-1).seals).toBeGreaterThan(0)
  })
  it('the solution: no slams, no close calls, no torn seals, and everyone moves', () => {
    const seen = run('doors', solution, 1500)
    const last = seen.at(-1)
    expect([last.slams, last.closeCalls, last.seals]).toEqual([0, 0, 0])
    expect(moved(seen)).toBe(true)
    expect(Math.min(...seen.map(w => w.air))).toBeGreaterThan(90)
  })
  it('an unknown state is an error and the door keeps its state', () => {
    const [w] = run('doors', () => 'Open', 1)
    expect(w.doors.every(d => d.state === 'closed' && /must return/.test(d.error))).toBe(true)
  })
})
