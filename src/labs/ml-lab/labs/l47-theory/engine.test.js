import { describe, it, expect } from 'vitest'
import { uniformExperiment, quantile, hoeffdingEps, shatter, POINT_SETS, doubleDescent, PS } from './engine.js'

describe('lab 47 learning theory', () => {
  it('the union bound holds with room to spare', () => {
    const r = uniformExperiment({ n: 100, K: 50, trials: 200 })
    expect(quantile(r.map(t => t.maxGap), 0.95)).toBeLessThan(hoeffdingEps(100, 0.05, 50))
  })
  it('half-planes shatter 3 points but not 4', () => {
    expect(shatter(POINT_SETS.three.pts).shattered).toBe(true)
    expect(shatter(POINT_SETS.collinear.pts).shattered).toBe(false)
    expect(shatter(POINT_SETS.four.pts).realizable).toBe(14)
    expect(shatter(POINT_SETS.inside.pts).shattered).toBe(false)
  })
  it('double descent: spike at p = n, recovery beyond', () => {
    const r = doubleDescent({ reps: 8 }), at = p => r[PS.indexOf(p)].test
    expect(at(40)).toBeGreaterThan(5 * at(20)); expect(at(400)).toBeLessThan(at(20))
  })
})
