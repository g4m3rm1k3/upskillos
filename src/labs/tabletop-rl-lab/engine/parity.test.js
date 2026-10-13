// The JavaScript engine against the real Python programs (engine/parity.json, recorded by
// tools/make_parity.py): the same dice from the same seed, the same scores and chances, the same
// exact solution, and seeded Q-learning, SARSA, afterstate and whole-game runs that end with the
// same numbers. Dice games use no sines or exponentials, so most of it agrees to the last digit; the
// sums of chances are compared to 1e-12 and the standard deviations to 1e-9.
import { describe, expect, it } from 'vitest'
import parity from './parity.json'
import { HANDS, SCORES, PyRandom, roll, keyOf } from './dice.js'
import { ways, outcomes, chaseMatrix, chaseYahtzee, estimate } from './probability.js'
import { KEEPS, KEPT, solve, startValue } from './turn.js'
import { train, trainAfter, qRow } from './learn.js'
import { Chaser, Planner, playGames, trainValue, compare } from './game.js'

const handOf = key => HANDS.findIndex(h => keyOf(h) === key)
const keptOf = key => KEPT.findIndex(k => keyOf(k) === key)

describe('the JavaScript engine reproduces the Python programs', () => {
  it('rolls the same dice from the same seed', () => {
    for (const [seed, rolls] of Object.entries(parity.rolls)) {
      const rng = new PyRandom(Number(seed))
      expect(rolls.map(() => roll(5, rng))).toEqual(rolls)
    }
  })
  it('lists the same 252 hands, scores them the same in all 13 boxes, and counts their orderings the same', () => {
    expect(SCORES).toEqual(parity.scores)
    expect(HANDS.map(ways)).toEqual(parity.ways)
  })
  it('lists the same keeps for every hand, in the same order', () => {
    expect(KEEPS.map(ks => ks.map(k => keyOf(KEPT[k])))).toEqual(parity.keeps)
  })
  it('finds the same outcomes and chances for a reroll', () => {
    for (const [kept, list] of Object.entries(parity.outcomes)) {
      const js = outcomes(kept.split('').map(Number))
      expect(js.map(o => keyOf(o.hand))).toEqual(list.map(([h]) => h))
      js.forEach((o, i) => expect(o.chance).toBe(list[i][1]))
    }
  })
  it('builds the same Markov chain for chasing a Yahtzee', () => {
    expect(chaseMatrix()).toEqual(parity.chase.matrix)
    expect(chaseYahtzee()).toEqual(parity.chase.dist)
  })
  it('estimates the same chance from the same simulated turns', () => {
    expect([0, 1, 2, 3, 4].map(seed => estimate(2000, seed))).toEqual(parity.estimates)
  })
  it('solves every box exactly the same', () => {
    for (const [box, rec] of Object.entries(parity.exact)) {
      const { V } = solve(Number(box))
      expect(startValue(V[2])).toBe(rec.start)
      expect(Array.from(V[1])).toEqual(rec.V1)
      expect(Array.from(V[2])).toEqual(rec.V2)
    }
  })
  for (const rec of parity.learn) {
    it(`learns the same Q-table: ${JSON.stringify(rec.config)}`, () => {
      const { box, ...config } = rec.config
      const { Q, curve } = train(box, config)
      expect(curve).toEqual(rec.curve)
      const table = []
      for (const [key, row] of Q) {
        const h = Math.floor(key / 3), r = key % 3
        row.forEach((v, i) => { if (v !== 0) table.push([keyOf(HANDS[h]), r, keyOf(KEPT[KEEPS[h][i]]), v]) })
      }
      const sort = t => [...t].sort((a, b) => (a[0] + a[1] + a[2]).localeCompare(b[0] + b[1] + b[2]))
      expect(sort(table)).toEqual(sort(rec.table))
      expect(qRow(Q, handOf(rec.table[0][0]), rec.table[0][1]).length).toBe(KEEPS[handOf(rec.table[0][0])].length)
    })
  }
  for (const rec of parity.after) {
    it(`learns the same afterstate values: ${JSON.stringify(rec.config)}`, () => {
      const { box, ...config } = rec.config
      const { W, curve } = trainAfter(box, config)
      expect(curve).toEqual(rec.curve)
      expect(W.size).toBe(rec.W.length)
      for (const [r, kept, v] of rec.W) expect(W.get(r * 1000 + keptOf(kept))).toBe(v)
    })
  }
  it('plays the same whole games', () => {
    expect(playGames(new Chaser(), 30, 5)).toEqual(parity.games.chaser)
    expect(playGames(new Planner(), 12, 7)).toEqual(parity.games.planner)
  })
  for (const rec of parity.value) {
    it(`learns the same scorecard values by TD(0): ${JSON.stringify(rec.config)}`, () => {
      const { weights, history } = trainValue(rec.config)
      expect(weights).toEqual(rec.weights)
      expect(history.slice(0, 3)).toEqual(rec.history)
    })
  }
  it('compares two players the same way', () => {
    const c = compare(new Planner(), new Chaser(), 15, 11)
    expect(c.mean).toBe(parity.compare.mean)
    expect(c.se).toBeCloseTo(parity.compare.se, 9)
    expect(c.seA).toBeCloseTo(parity.compare.seA, 9)
  })
})
