import { describe, it, expect } from 'vitest'
import { createRace, stepRace, runRace, rankRace, tournament } from './race.js'
import { DEFAULTS, createModel, pack, unpack, trainEpisode } from './learning.js'
import { random } from './game.js'
import { readCheckpoint, exportCheckpoint } from '../checkpoints.js'
import baselines from '../baselines.json'

describe('a complete race and tournament', () => {
  it('runs all supplied models to a three-lap finish without changing their tables', () => {
    const models = baselines.map(d => unpack(d.checkpoint)), originals = models.map(m => m.q.slice())
    const race = runRace(models)
    expect(race.cars.every(c => c.finished && c.p === 432)).toBe(true)
    expect(race.tick).toBeLessThan(250)
    expect(stepRace(race, models)).toBe(race)
    models.forEach((m, i) => expect(m.q).toEqual(originals[i]))
  })
  it('uses the same human action interface and retains immutable replay snapshots', () => {
    const old = createRace(), models = [null, ...baselines.slice(0, 2).map(d => unpack(d.checkpoint))]
    const accelerate = stepRace(old, models, 3)
    expect(accelerate.cars[0].speed).toBe(1)
    const right = stepRace(accelerate, models, 2)
    expect(right.cars[0].lane).toBe(1)
    expect(old.cars[0].p).toBe(0); expect(accelerate.cars[0].lane).toBe(0)
  })
  it('ranks finishers before failures and earlier finish times first', () => {
    const race = createRace()
    race.cars = [
      { ...race.cars[0], done: true, p: 420, ticks: 200 },
      { ...race.cars[1], done: true, finished: true, p: 432, ticks: 170 },
      { ...race.cars[2], done: true, finished: true, p: 432, ticks: 160 },
    ]
    expect(rankRace(race).map(c => c.i)).toEqual([2, 1, 0])
  })
  it('covers all six grids with fair tie scoring and reproducible totals', () => {
    const models = baselines.map(d => unpack(d.checkpoint)), cup = tournament(models)
    expect(new Set(cup.races.map(r => r.order.join(','))).size).toBe(6)
    expect(cup.totals.every(t => t.finishes === 6)).toBe(true)
    expect(cup.totals.reduce((n, t) => n + t.points, 0)).toBe(36)
    expect(tournament(models).totals).toEqual(cup.totals)
    const untrained = createModel(DEFAULTS), tied = tournament([untrained, untrained, untrained])
    expect(new Set(tied.totals.map(t => t.points)).size).toBe(1)
  })
})

describe('training evidence and portable checkpoints', () => {
  it('records the actual target, selected action and resulting transition', () => {
    const model = createModel(DEFAULTS), trace = []
    const episode = trainEpisode(model, 0, random(42), t => trace.push(t))
    expect(trace.length).toBe(episode.ticks)
    expect(trace.at(-1).next.done).toBe(true)
    expect(trace.at(-1).learning.bootstrap).toBe(0)
    for (const t of trace) {
      expect(t.next.last.action).toBe(t.action)
      expect(t.learning.target).toBeCloseTo(t.next.last.reward + DEFAULTS.gamma * t.learning.bootstrap)
      expect(t.learning.after).toBeCloseTo(t.learning.before + DEFAULTS.alpha * (t.learning.target - t.learning.before))
      expect(t.qBefore).toHaveLength(5)
    }
  })
  it('round-trips an exported policy, preserving decisions and training settings', () => {
    const imported = readCheckpoint(exportCheckpoint(baselines[0]))
    expect(imported.name).toBe(baselines[0].name)
    expect(imported.checkpoint).toEqual(pack(unpack(baselines[0].checkpoint)))
  })
  it('rejects corrupt, oversized or incompatible checkpoint files', () => {
    expect(() => readCheckpoint('not json')).toThrow()
    expect(() => readCheckpoint(' '.repeat(5 * 1024 * 1024 + 1))).toThrow(/limit/)
    const file = JSON.parse(exportCheckpoint(baselines[0]))
    file.checkpoint.config.gamma = 'bad'
    expect(() => readCheckpoint(JSON.stringify(file))).toThrow(/setting/)
    file.checkpoint.config.gamma = 0.95; file.checkpoint.q = [[0, 1e300]]
    expect(() => readCheckpoint(JSON.stringify(file))).toThrow(/value/)
  })
})
