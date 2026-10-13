// The game's rules and the learners' mechanics, checked directly: encoding, collisions, rewards,
// endings, updates, reproducibility, frozen tests, races, tournaments and checkpoints.
import { describe, it, expect } from 'vitest'
import { SUNLIT, HARBOUR, reset, step, intent, contact, sweepers, observe, decodeKey, sensorKey, N_KEYS, N_SENSOR_KEYS } from './kart.js'
import { DEFAULTS, train, evaluate, update, argmax, pack, unpack, policyOf, trainLinear } from './tabular.js'
import { createRace, stepRace, rankRace, runRace, tournament } from './race.js'
import { readCheckpoint, exportCheckpoint } from '../checkpoints.js'
import baselines from '../baselines.json'

const at = (p, lane, speed, ticks = 0) => ({ ...reset(1, lane), p, speed, ticks })

describe('the environment', () => {
  it('encodes every sector observation and sensor observation to a different key, and decodes it back', () => {
    const keys = new Set()
    for (let sector = 0; sector < 144; sector++) for (let lane = 0; lane < 3; lane++) for (let speed = 0; speed < 3; speed++) for (let mask = 0; mask < 8; mask++) {
      const key = ((sector * 3 + lane) * 3 + speed) * 8 + mask
      keys.add(key); expect(decodeKey(key)).toEqual({ sector, lane, speed, mask })
    }
    expect(keys.size).toBe(N_KEYS)
    expect(N_SENSOR_KEYS).toBe(243)
  })
  it('stops a kart that sweeps into a barrier, with the lesson\'s reward', () => {
    const track = { ...SUNLIT, sweepers: [] }, hit = step(at(12, 1, 1, 100), 3, track)
    expect(hit).toMatchObject({ p: 12, lane: 1, speed: 0, crashes: 1 })
    expect(hit.last.reward).toBeCloseTo(-6.2, 12)
    expect(hit.last.hit).toBe('barrier')
    const dodge = step(at(12, 1, 1, 100), 0, track)
    expect(dodge).toMatchObject({ p: 14, lane: 0, crashes: 0 })
    expect(dodge.last.reward).toBeCloseTo(0.1, 12)
  })
  it('keeps lanes and speed in range', () => {
    expect(intent(at(5, 0, 0), 0)).toMatchObject({ nextLane: 0, nextP: 6 })
    expect(intent(at(5, 2, 2), 2)).toMatchObject({ nextLane: 2, nextP: 8 })
    expect(intent(at(5, 1, 0), 4)).toMatchObject({ speed: 0, nextP: 6 })
  })
  it('sweeps contact: crossing paths touch; separated, parallel and receding karts don\'t; the loop wraps', () => {
    const me = { p: 10, lane: 0, nextP: 12, nextLane: 1 }
    expect(contact(me, { p: 11, lane: 1, nextP: 12, nextLane: 1 }, 144)).toBe(true)
    expect(contact({ p: 10, lane: 0, nextP: 13, nextLane: 0 }, { p: 10, lane: 2, nextP: 13, nextLane: 2 }, 144)).toBe(false)
    expect(contact({ p: 10, lane: 0, nextP: 11, nextLane: 0 }, { p: 12, lane: 0, nextP: 15, nextLane: 0 }, 144)).toBe(false)
    expect(contact({ p: 143, lane: 1, nextP: 146, nextLane: 1 }, { p: 1, lane: 1, nextP: 1, nextLane: 1 }, 144)).toBe(true)
  })
  it('moves sweepers on the simulation clock and shows them to both observations', () => {
    expect(sweepers(0, SUNLIT).map(s => s.lane)).toEqual([0, 13 / 12])
    expect(sweepers(48, SUNLIT)).toEqual(sweepers(0, SUNLIT))
    const near = at(30, 0, 0, 0)
    expect(observe(near, [], SUNLIT) % 8).toBe(1)
    expect(sensorKey(near, [], SUNLIT)).not.toBe(sensorKey(near, [], { ...SUNLIT, sweepers: [] }))
  })
  it('finishes exactly at the line, never steps a finished kart, and ends on 8 hits or 210 decisions', () => {
    const done = step(at(142, 0, 2, 50), 1, { ...SUNLIT, barriers: [], sweepers: [] })
    expect(done).toMatchObject({ p: 144, finished: true, done: true })
    expect(done.last.parts.finish).toBe(10)
    expect(step(done, 3)).toBe(done)
    let s = at(12, 1, 1, 100)
    for (let i = 0; i < 8; i++) s = step({ ...s, speed: 1 }, 3, { ...SUNLIT, sweepers: [] })
    expect(s).toMatchObject({ crashes: 8, done: true, finished: false })
    expect(step(at(60, 1, 0, 209), 1, { ...SUNLIT, barriers: [], sweepers: [] })).toMatchObject({ done: true, finished: false })
  })
  it('the second track is a different track', () => {
    expect(HARBOUR.barriers).not.toEqual(SUNLIT.barriers)
    expect(HARBOUR.length).toBe(SUNLIT.length)
  })
})

describe('learning', () => {
  it('breaks ties toward Coast and doesn\'t bootstrap at the end of a lap', () => {
    expect(argmax([0, 0, 0, 0, 0])).toBe(1)
    const tables = [new Map([[0, [0, 2, 0, 0, 0]], [1, [1, 4, 2, 3, 0]]])]
    expect(update(tables, 'q', 0, 1, -1, 1, true, 0, 0.2, 0.9, null)).toMatchObject({ future: 0, target: -1 })
  })
  it('Double Q-learning updates the table its coin picks, choosing with it and valuing with the other', () => {
    const make = () => [new Map([[1, [1, 4, 2, 3, 0]]]), new Map([[1, [3, 1, 2, 2, 0]]])]
    const a = make(), upA = update(a, 'double', 0, 1, -1, 1, false, 0, 0.5, 1, { random: () => 0.1 })
    expect(upA).toMatchObject({ table: 'A', chosen: 1, future: 1 })
    expect(a[0].get(0)[1]).toBe(0)
    const b = make(), upB = update(b, 'double', 0, 1, -1, 1, false, 0, 0.5, 1, { random: () => 0.9 })
    expect(upB).toMatchObject({ table: 'B', chosen: 0, future: 1 })
  })
  it('reproduces a run from its seed, and learns to beat an empty table on held-out laps', () => {
    const a = train({ episodes: 300, seed: 5 }), b = train({ episodes: 300, seed: 5 })
    expect([...a.tables[0].entries()]).toEqual([...b.tables[0].entries()])
    expect(evaluate(a.tables, DEFAULTS, SUNLIT, 20)[0]).toBeGreaterThan(evaluate([new Map()], DEFAULTS, SUNLIT, 20)[0])
  })
  it('keeps the frozen test frozen, and checkpoints round-trip their decisions', () => {
    const { tables } = train({ episodes: 200, seed: 9, method: 'double' }), before = tables.map(Q => JSON.stringify([...Q.entries()]))
    evaluate(tables, { method: 'double' })
    expect(tables.map(Q => JSON.stringify([...Q.entries()]))).toEqual(before)
    const model = unpack(pack({ kind: 'table', tables }, { ...DEFAULTS, method: 'double', episodes: 200, seed: 9 }, 200))
    const state = at(20, 1, 1)
    expect(policyOf(model)(state, [], SUNLIT)).toBe(policyOf({ kind: 'table', view: 'sector', tables })(state, [], SUNLIT))
    const w = trainLinear({ episodes: 20, seed: 1 }), lin = unpack(pack({ kind: 'linear', weights: w }, { ...DEFAULTS, method: 'linear', episodes: 20, seed: 1 }, 20))
    expect(policyOf(lin)(state, [], SUNLIT)).toBe(policyOf({ kind: 'linear', weights: w })(state, [], SUNLIT))
  })
  it('rejects corrupt, oversized or old checkpoints', () => {
    const good = baselines[0].checkpoint
    expect(() => unpack({ ...good, version: 'kart-lanes-v2' })).toThrow()
    expect(() => unpack({ ...good, config: { ...good.config, alpha: 7 } })).toThrow()
    expect(() => unpack({ ...good, tables: [[[99999, [0, 0, 0, 0, 0]]]] })).toThrow()
    expect(() => unpack({ ...good, tables: [[[1, [0, 0, 0, Infinity, 0]]]] })).toThrow()
    expect(() => readCheckpoint(JSON.stringify({ format: 'kartlab-driver-v1', name: 'x', checkpoint: good }))).toThrow()
    expect(readCheckpoint(exportCheckpoint({ name: ' Mine ', checkpoint: good })).name).toBe('Mine')
  })
})

describe('races and tournaments', () => {
  const policies = baselines.slice(0, 3).map(d => policyOf(unpack(d.checkpoint)))
  it('runs the supplied drivers to the end of three laps without changing them', () => {
    const models = baselines.map(d => unpack(d.checkpoint)), copies = models.map(m => JSON.stringify(m))
    const race = runRace(models.slice(0, 3).map(policyOf))
    expect(race.cars.every(c => c.done)).toBe(true)
    expect(stepRace(race, policies)).toBe(race)
    expect(models.map(m => JSON.stringify(m))).toEqual(copies)
  })
  it('takes the human action for a human seat and keeps old snapshots unchanged', () => {
    const old = createRace(), next = stepRace(old, [null, ...policies.slice(1)], 3)
    expect(next.cars[0].speed).toBe(1)
    expect(old.cars[0]).toMatchObject({ p: 0, speed: 0 })
  })
  it('bumps both karts of a merge, and the result doesn\'t depend on seat order', () => {
    const race = createRace()
    race.cars = [at(5, 0, 1), at(5, 1, 1), at(60, 2, 0)]
    const right = () => 2, left = () => 0, coast = () => 1
    const a = stepRace(race, [right, left, coast])
    expect(a.cars[0]).toMatchObject({ p: 5, lane: 0, crashes: 1 }); expect(a.cars[1]).toMatchObject({ p: 5, lane: 1, crashes: 1 })
    const swapped = { ...race, cars: [race.cars[1], race.cars[0], race.cars[2]] }
    const b = stepRace(swapped, [left, right, coast])
    expect([b.cars[1], b.cars[0]]).toEqual([a.cars[0], a.cars[1]])
  })
  it('ranks finishers by time before everyone else by distance', () => {
    const race = { cars: [{ finished: false, done: true, p: 300, ticks: 400 }, { finished: true, done: true, p: 432, ticks: 160 }, { finished: true, done: true, p: 432, ticks: 150 }], tick: 0 }
    expect(rankRace(race)).toEqual([2, 1, 0])
  })
  it('a tournament covers all six grids and is reproducible', () => {
    const t1 = tournament(policies), t2 = tournament(policies)
    expect(t1.races.map(r => r.order)).toHaveLength(6)
    expect(t1.points).toEqual(t2.points)
    expect(t1.points.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(36)
  })
})
