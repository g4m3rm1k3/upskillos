// The JavaScript engine against the real Python programs (engine/parity.json, recorded by
// tools/make_parity.py): same maps, same transition tables, same value iteration, and seeded
// Q-learning and SARSA runs that end with the same Q-table, bit for bit.
import { describe, expect, it } from 'vitest'
import parity from './parity.json'
import { MAPS } from './maps.js'
import { GridWorld } from './gridworld.js'
import { valueIteration } from './planning.js'
import { qLearning, sarsa, finish } from './tabular.js'
import { td0Evaluate, runningMean, constantStep } from './td.js'

const camel = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/_(\w)/g, (_, c) => c.toUpperCase()), v]))

describe('the JavaScript engine reproduces the Python programs', () => {
  it('has the same maps', () => { expect(MAPS).toEqual(parity.maps) })

  for (const name of Object.keys(parity.maps)) {
    it(`${name}: same transition table P`, () => { expect(new GridWorld(name).P).toEqual(parity.P[name]) })
    it(`${name}: same value iteration`, () => {
      const { V, Q, sweeps } = valueIteration(new GridWorld(name).P, 0.95)
      expect(sweeps).toBe(parity.planning[name].sweeps)
      V.forEach((v, s) => expect(v).toBeCloseTo(parity.planning[name].V[s], 12))
      Q.forEach((row, s) => row.forEach((q, a) => expect(q).toBeCloseTo(parity.planning[name].Q[s][a], 12)))
    })
  }

  for (const run of parity.runs) {
    it(`${run.algorithm} on ${run.map}, seed ${run.seed}: identical Q-table and episode totals`, () => {
      const { map, algorithm, Q: _q, totals: _t, ...options } = run
      const trainer = (algorithm === 'q_learning' ? qLearning : sarsa)(new GridWorld(map), camel(options))
      const { Q, totals } = finish(trainer)
      expect(totals).toEqual(run.totals)
      expect(Q).toEqual(run.Q)
    })
  }

  for (const run of parity.td) {
    it(`TD(0) on ${run.map}: identical V`, () => {
      expect(finish(td0Evaluate(new GridWorld(run.map), { episodes: run.episodes, alpha: run.alpha })).V).toEqual(run.V)
    })
  }
  it('running mean and constant-step average', () => {
    expect(runningMean(parity.averages.samples)).toEqual(parity.averages.mean)
    expect(constantStep(parity.averages.samples, 0.3)).toEqual(parity.averages.step)
  })
})
