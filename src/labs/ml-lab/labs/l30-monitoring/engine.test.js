import { describe, it, expect } from 'vitest'
import { simulate, alerts, psiCategorical } from './engine.js'

const avg = (log, f, a, b) => log.slice(a, b).reduce((t, x) => t + x[f], 0) / (b - a)
describe('lab 30 monitoring', () => {
  it('each scenario has its signature', () => {
    const none = simulate({ kind: 'none' }), cov = simulate({ kind: 'covariate' }), con = simulate({ kind: 'concept' }), bug = simulate({ kind: 'bug' })
    expect(Math.max(...none.log.map(l => Math.max(l.psiSize, l.psiRunner, l.psiPred)))).toBeLessThan(0.1)
    expect(avg(cov.log, 'psiRunner', 30, 60)).toBeGreaterThan(0.3); expect(avg(cov.log, 'mae', 30, 60)).toBeLessThan(1.2 * cov.refMAE)
    expect(avg(con.log, 'psiSize', 30, 60)).toBeLessThan(0.1); expect(avg(con.log, 'mae', 30, 60)).toBeGreaterThan(1.25 * con.refMAE)
    expect(avg(bug.log, 'psiSize', 30, 60)).toBeGreaterThan(2)
  })
  it('alerts respect persistence; categorical PSI matches hand calculation', () => {
    expect(alerts([0.1, 0.3, 0.1, 0.3, 0.3, 0.3], 0.25, 2)).toEqual([4])
    expect(psiCategorical([...Array(50).fill('a'), ...Array(50).fill('b')], [...Array(70).fill('a'), ...Array(30).fill('b')], ['a', 'b'])).toBeCloseTo(0.1695, 3)
  })
})
