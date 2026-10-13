// The JavaScript engine against the real Python programs (engine/parity.json, recorded by
// tools/make_parity.py): the same laps state by state with the same observations, the same rule
// drivers' results, seeded Q-learning, SARSA, Double Q and linear runs that end with the same
// numbers, the same maximisation-bias curves, and the same race and tournament. No sines or
// exponentials anywhere, so everything agrees to the last digit.
import { describe, expect, it } from 'vitest'
import parity from './parity.json'
import { SUNLIT, HARBOUR, reset, step, scriptedTraffic, hazardMask, observe, sensors, sensorKey, careful, flatOut, randomDriver, measure } from './kart.js'
import { train, evaluate, trainLinear, evaluateLinear, features, policyOf } from './tabular.js'
import { leftRate } from './maxbias.js'
import { runRace, rankRace, tournament } from './race.js'

const TRACK = { 'Sunlit Circuit': SUNLIT, 'Harbour Loop': HARBOUR }
const snake = s => s && Object.fromEntries(Object.entries(s).map(([k, v]) => [k, k === 'last' && v ? { action: v.action, reward: v.reward, parts: v.parts, hit: v.hit } : v]))
const policies = { 1: careful, 7: randomDriver(3), 11: careful, 5: flatOut }

describe('the JavaScript engine reproduces the Python programs', () => {
  for (const lap of parity.laps) {
    it(`a lap on ${lap.track} (seed ${lap.seed}): every state, observation and sensor reading the same`, () => {
      const track = TRACK[lap.track], policy = policies[lap.seed]
      let state = reset(lap.seed)
      for (const rec of lap.steps) {
        expect(snake(state)).toEqual(rec.state)
        if (!rec.action && rec.action !== 0) break
        const cars = scriptedTraffic(state.ticks, lap.seed, track)
        expect(policy(state, cars, track)).toBe(rec.action)
        expect(hazardMask(state, cars, track)).toBe(rec.mask)
        expect(observe(state, cars, track)).toBe(rec.key)
        expect(sensors(state, cars, track)).toEqual(rec.near)
        expect(sensorKey(state, cars, track)).toBe(rec.sensor)
        expect(features(state, cars, track)).toEqual(rec.x)
        state = step(state, rec.action, track, cars)
      }
    })
  }
  it('the hand-written drivers score the same', () => {
    expect(measure(careful)).toEqual(parity.rules.careful)
    expect(measure(careful, 30, HARBOUR)).toEqual(parity.rules.careful_harbour)
    expect(measure(randomDriver(0))).toEqual(parity.rules.random)
    expect(measure(flatOut)).toEqual(parity.rules.flat)
  })
  for (const rec of parity.train) {
    it(`learns the same table: ${JSON.stringify(rec.config)}`, () => {
      const { tables, totals } = train(rec.config)
      expect(totals).toEqual(rec.totals)
      expect(tables.map(Q => [...Q.entries()])).toEqual(rec.tables)
      expect(evaluate(tables, rec.config, SUNLIT, 10)).toEqual(rec.eval)
    })
  }
  it('learns the same linear weights, and drives the same with them on both tracks', () => {
    const w = trainLinear({ episodes: 40, seed: 3 })
    expect(w).toEqual(parity.linear.weights)
    expect(evaluateLinear(w, SUNLIT, 10)).toEqual(parity.linear.eval)
    expect(evaluateLinear(w, HARBOUR, 10)).toEqual(parity.linear.harbour)
  })
  it('shows the same maximisation bias, and the same fix', () => {
    expect(leftRate('q', 40, 100)).toEqual(parity.maxbias.q)
    expect(leftRate('double', 40, 100)).toEqual(parity.maxbias.double)
  })
  it('runs the same race and the same tournament', () => {
    const q = train({ episodes: 200, seed: 19 }).tables, s = train({ episodes: 200, seed: 4, view: 'sensors' }).tables, w = trainLinear({ episodes: 40, seed: 3 })
    const pols = [policyOf({ kind: 'table', view: 'sector', tables: q }), policyOf({ kind: 'table', view: 'sensors', tables: s }), policyOf({ kind: 'linear', weights: w })]
    const race = runRace(pols)
    expect(race.cars.map(snake)).toEqual(parity.race.cars)
    expect(race.tick).toBe(parity.race.tick)
    expect(rankRace(race)).toEqual(parity.race.rank)
    const t = tournament(pols)
    expect([t.points, t.finishes]).toEqual(parity.race.tournament)
  })
})
