// Every fact the lessons of Parts 2 and 3 state in words, measured again (the standard's rule 11:
// a claim typed into a lesson is checked by a test). Numbers inside the lessons are computed where
// they are shown; these tests cover the sentences around them.
import { describe, expect, it } from 'vitest'
import { SEVEN, SMALL, TINY, parseMap, buildTable, sweepValues, stepsToGoal, sealIslands, planIteration, optionValues, bestOption, makeRng } from './world.js'
import { trainQ, bestOf, runningMeans } from './world-part3.js'
import { traceCorridor } from './traces-part3.js'
import { EDGE_ROW } from './lessons/planner.jsx'
import { banditScore } from './lessons/explore.jsx'
import { ROUTES } from './lessons/learner.jsx'
import { ISLAND_AT } from './lessons/discount.jsx'

const ICY = '.#..\n.S..\n...G'

describe('Part 2 claims', () => {
  it('lesson 5: SEVEN start is 14 moves from the cheese, and bottom-first sweeping settles SMALL in one sweep', () => {
    expect(stepsToGoal(parseMap(SEVEN))['0,0']).toBe(14)
    const table = buildTable(parseMap(SMALL), 0)
    const values = Object.fromEntries(Object.keys(table).map(s => [s, 0]))
    for (const s of Object.keys(table).reverse()) if (Object.keys(table[s]).length) values[s] = bestOption(optionValues(table, s, values, 1))[1]
    const [exact] = sweepValues(table, 1)
    for (const s of Object.keys(values)) expect(values[s]).toBeCloseTo(exact[s], 9)
  })
  it('lesson 6: with g = 1 SEVEN never settles; the corner falls about 0.08 a sweep; with g = 0.9 it settles at -0.4', () => {
    const table = buildTable(parseMap(SEVEN), 0)
    expect(sweepValues(table, 1, 1e-9, 3000)[1]).toBe(3000)
    expect(ISLAND_AT(10) - ISLAND_AT(20)).toBeCloseTo(0.8, 6)
    const [v, n] = sweepValues(table, 0.9)
    expect(n).toBeLessThan(1000)
    expect(v['6,0']).toBeCloseTo(-0.4, 6)
  })
  it('A1: the edge map moves away from the edge on ice; value and policy iteration agree', () => {
    expect(EDGE_ROW(0)).toBe(0)
    expect(EDGE_ROW(0.4)).toBe(2)
    const table = buildTable(parseMap(sealIslands(SEVEN)), 0)
    const [v] = sweepValues(table, 0.9)
    const pi = planIteration(table, 0.9)
    for (const s of Object.keys(v)) expect(pi.values[s]).toBeCloseTo(v[s], 6)
  })
})

describe('Part 3 claims', () => {
  it('lesson 9: after the world changes, 1/n is stuck near 2 and a fixed alpha follows to near 3', () => {
    const rng = makeRng(5)
    const truth = Array.from({ length: 200 }, (_, i) => (i < 100 ? 1 : 3))
    const xs = truth.map(t => t + 2 * (rng.random() - 0.5) * 1.5)
    expect(Math.abs(runningMeans(xs).at(-1) - 2)).toBeLessThan(0.3)
    expect(Math.abs(runningMeans(xs, 0.1).at(-1) - 3)).toBeLessThan(0.6)
  })
  it('lesson 10: news reaches S, 5 moves away, in game 5', () => {
    const before = traceCorridor(6, 4, 1, 0.9).result['0,0'].right
    const after = traceCorridor(6, 5, 1, 0.9).result['0,0'].right
    expect(before).toBeLessThan(0)
    expect(after).toBeGreaterThan(0.5)
  })
  it('lesson 10: random behaviour learns the planner\'s worths exactly; eps 0.1 leaves squares unvisited', () => {
    const maze = parseMap(ICY)
    const [V] = sweepValues(buildTable(maze, 0), 0.9)
    const worst = eps => { const q = trainQ(ICY, { episodes: eps === 1 ? 50 : 300, alpha: 0.5, g: 0.9, eps, rng: makeRng(2) }); return Math.max(...Object.keys(q).filter(s => s !== maze.goal).map(s => Math.abs(bestOf(q[s]) - V[s]))) }
    expect(worst(1)).toBeLessThan(1e-3)
    expect(worst(0.1)).toBeGreaterThan(0.5)
  })
  it('lesson 11: greedy never settles on the best machine; eps 0.1 always does and beats eps 0.3 and random', () => {
    const s0 = banditScore(0), s1 = banditScore(0.1), s3 = banditScore(0.3), sr = banditScore(1)
    expect(s0.onBest).toBe(0)
    expect(s1.onBest).toBe(s1.runs)
    expect(s1.avg).toBeGreaterThan(s3.avg)
    expect(s3.avg).toBeGreaterThan(sr.avg)
    expect(sr.avg).toBeGreaterThan(s0.avg)
  })
  it('A2: 300 games learn the shortest route on SEVEN with every seed quoted (and Part 4 below)', () => {
    for (const r of ROUTES) expect(r).toBe(14)
    void TINY
  })
})

describe('Part 4 claims', () => {
  it('lesson 12: a table misses unseen squares badly; one good feature beats many weights', async () => {
    const { fit } = await import('./lessons/formulas.jsx')
    const t = fit('table', true), c = fit('coords', true), s = fit('steps', true)
    expect(t.seenErr).toBeLessThan(1e-3)
    expect(t.unseenErr).toBeGreaterThan(0.4)
    expect(c.unseenErr).toBeLessThan(t.unseenErr)
    expect(s.unseenErr).toBeLessThan(c.unseenErr)
    expect(s.seenErr).toBeLessThan(c.seenErr)
  })
  it('lesson 13: on (x - 3)^2, lr 0.5 lands in one step, lr 1 bounces, lr 1.1 diverges, below 1 converges', async () => {
    const { descend } = await import('./world-part4.js')
    const f = x => (x - 3) * (x - 3)
    expect(descend(f, 0, 0.5, 1)[1]).toBeCloseTo(3, 6)
    const b = descend(f, 0, 1, 4)
    expect(b[1]).toBeCloseTo(6, 4); expect(b[2]).toBeCloseTo(0, 4)
    expect(Math.abs(descend(f, 0, 1.1, 10).at(-1) - 3)).toBeGreaterThan(10)
    for (const lr of [0.1, 0.5, 0.9]) expect(Math.abs(descend(f, 0, lr, 200).at(-1) - 3)).toBeLessThan(1e-3)
  })
  it('lesson 14: a line and one unit fail on the hill; two units fit it', async () => {
    const { trainNet, HILL, LINE } = await import('./lessons/layers.jsx')
    const { forward, meanSquaredError } = await import('./world-part4.js')
    const mse = p => HILL.reduce((s, [x, t]) => s + (forward(p, x)[1] - t) ** 2, 0) / HILL.length
    expect(meanSquaredError(LINE[0], LINE[1], HILL)).toBeGreaterThan(0.1)
    expect(mse(trainNet(1, 1))).toBeGreaterThan(0.05)
    expect(mse(trainNet(2, 1))).toBeLessThan(0.01)
    expect(mse(trainNet(2, 2))).toBeLessThan(0.01)
  })
  it('lesson 15: learning in order forgets the left half; replay forgets much less', async () => {
    const { FORGET } = await import('./lessons/batches.jsx')
    for (const f of FORGET) {
      expect(f.inOrder.leftAfterLeft).toBeLessThan(0.01)
      expect(f.inOrder.left).toBeGreaterThan(0.15)
      expect(f.replay.left).toBeLessThan(f.inOrder.left)
    }
  })
  it('A3: one-hot learns every map; row and column win the open room and fail on SEVEN', async () => {
    const { RESULTS } = await import('./lessons/deepq.jsx')
    expect(RESULTS.SEVEN.table).toEqual([14, 14, 14])
    expect(RESULTS.SEVEN.coords).toEqual([null, null, null])
    expect(RESULTS['an open room'].coords).toEqual([4, 4, 4])
    expect(RESULTS.SMALL.table).toEqual([5, 5, 5])
  }, 60000)
})
