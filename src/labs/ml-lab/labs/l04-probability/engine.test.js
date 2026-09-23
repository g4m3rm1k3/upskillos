import { describe, it, expect } from 'vitest'
import { posterior, simulateAlarms, naturalFrequencies, standardError, diceExact, rollDice, expectation, varianceOf } from './engine.js'

describe('lab 04 probability', () => {
  it('applies Bayes rule and natural frequencies consistently', () => {
    expect(posterior(0.01, 0.9, 0.05)).toBeCloseTo(0.009 / 0.0585, 12)
    const f = naturalFrequencies(1000, 0.02, 0.9, 0.05)
    expect(f.tp / (f.tp + f.fp)).toBeCloseTo(posterior(0.02, 0.9, 0.05), 12)
  })
  it('simulation agrees with the exact posterior within 4 standard errors', () => {
    const { counts } = simulateAlarms({ n: 100000, prior: 0.05, sensitivity: 0.9, falseAlarm: 0.1, seed: 2 })
    const alarms = counts.tp + counts.fp, exact = posterior(0.05, 0.9, 0.1)
    expect(Math.abs(counts.tp / alarms - exact)).toBeLessThan(4 * standardError(exact, alarms))
    expect(counts.tp + counts.fn + counts.fp + counts.tn).toBe(100000)
  })
  it('has an exact dice distribution with mean 7 and variance 35/6', () => {
    expect(diceExact.reduce((t, d) => t + d.p, 0)).toBeCloseTo(1, 12)
    expect(expectation(diceExact.map(d => d.sum), diceExact.map(d => d.p))).toBeCloseTo(7, 12)
    expect(varianceOf(diceExact.map(d => d.sum), diceExact.map(d => d.p))).toBeCloseTo(35 / 6, 12)
    const r = rollDice(100000, 4)
    expect(Math.abs(r.mean - 7)).toBeLessThan(4 * Math.sqrt(35 / 6 / 100000))
  })
})
