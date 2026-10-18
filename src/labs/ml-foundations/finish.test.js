// Every claim lesson 0 makes about the learner, measured over 40 seeds (the standard's rule 11:
// a number or fact typed into a lesson is checked by a test).
import { describe, expect, it } from 'vitest'
import { learn, SHORTEST, FIRST_GAME, FIRST_RANGE, FIRST_RANGES, EXPERIMENTS } from './lessons/finish.jsx'
import { SEVEN, parseMap, stepsToGoal } from './world.js'

const maze = parseMap(SEVEN)
const seeds = Array.from({ length: 40 }, (_, i) => i + 1)
const runs = opts => seeds.map(s => learn(maze, opts, 300, s))
const avg = xs => xs.reduce((a, b) => a + b, 0) / xs.length

describe('lesson 0 claims', () => {
  it('quotes the shortest route and a typical first game correctly', () => {
    expect(SHORTEST).toBe(stepsToGoal(maze)[maze.start])
    expect(FIRST_GAME).toBeGreaterThan(SHORTEST * 3)
    const [lo, hi] = FIRST_RANGES[FIRST_RANGE]
    expect(FIRST_GAME >= lo && FIRST_GAME < hi).toBe(true)
  })
  it('the default learner finds the route, and its late games are near the shortest', () => {
    const rs = runs({})
    expect(rs.filter(r => r.reached).length).toBeGreaterThanOrEqual(38)
    expect(avg(rs.map(r => avg(r.lens.slice(-20))))).toBeLessThan(SHORTEST * 1.3)
  })
  it('g = 0: no route is ever learned (experiment 1)', () => {
    expect(EXPERIMENTS[0].choice.answer).toBe(1)
    expect(runs({ g: 0 }).filter(r => r.reached).length).toBe(0)
  })
  it('eps = 0 still finds a good route on this maze (experiment 2)', () => {
    expect(EXPERIMENTS[1].choice.answer).toBe(1)
    const rs = runs({ eps: 0 })
    expect(rs.filter(r => r.reached).length).toBeGreaterThanOrEqual(38)
    expect(avg(rs.map(r => avg(r.lens.slice(-20))))).toBeLessThan(SHORTEST * 1.3)
  })
  it('slip 0.3: games stay much longer than the shortest route (experiment 3)', () => {
    const rs = runs({ slip: 0.3 })
    expect(avg(rs.map(r => avg(r.lens.slice(-20))))).toBeGreaterThan(SHORTEST * 2)
  })
  it('a small alpha learns more slowly (the knob description)', () => {
    const early = opts => avg(runs(opts).map(r => avg(r.lens.slice(20, 40))))
    expect(early({ alpha: 0.05 })).toBeGreaterThan(early({ alpha: 0.5 }) * 1.5)
  })
})
