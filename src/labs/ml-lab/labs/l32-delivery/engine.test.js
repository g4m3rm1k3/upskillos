import { describe, it, expect } from 'vitest'
import { recentDays, buildCandidates, evaluateGates, canary } from './engine.js'

describe('lab 32 delivery', () => {
  const train = recentDays(0, 6), hold = recentDays(10, 12), gold = recentDays(20, 21).slice(0, 60), C = buildCandidates(train)
  const fails = k => evaluateGates(k, C, hold, gold).results.filter(r => !r.pass).map(r => r.gate.split(' ')[0].replace(':', ''))
  it('each flawed candidate is blocked by the right gate', () => {
    expect(fails('bugged')).toContain('Serving'); expect(fails('minutes')).toContain('Prediction'); expect(fails('leaky')).toContain('Sanity'); expect(fails('bigger')).toEqual(['p95'])
    expect(evaluateGates('bigger', C, hold, gold, { minImprovement: 0.05, maxSliceRegression: 0.1, latencyBudget: 35, ratioRange: [0.5, 2] }).promote).toBe(true)
  })
  it('canary rolls back bad candidates and completes good ones', () => {
    expect(canary('minutes', C).at(-1).rolledBack).toBe(true)
    expect(canary('bigger', C).at(-1).rolledBack).toBe(false)
  })
})
