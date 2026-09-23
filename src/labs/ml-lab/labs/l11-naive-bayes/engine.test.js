import { describe, it, expect } from 'vitest'
import { splitCorpus, fit, explain, accuracy, tokenize } from './engine.js'

describe('lab 11 naive bayes', () => {
  it('learns the corpus and generalizes', () => {
    const { train, validation } = splitCorpus(1)
    const m = fit(train, 1)
    expect(accuracy(m, train)).toBeGreaterThan(0.9); expect(accuracy(m, validation)).toBeGreaterThan(0.7)
    expect(tokenize('Disk FULL on agent-7!')).toEqual(['disk', 'full', 'on', 'agent', '7'])
  })
  it('explanations add up and repetition inflates confidence', () => {
    const m = fit(splitCorpus(1).train, 1), once = explain(m, 'error'), five = explain(m, 'error error error error error')
    expect(once.logOdds).toBeCloseTo(once.prior + once.rows[0].contribution, 12)
    expect(five.logOdds - five.prior).toBeCloseTo(5 * (once.logOdds - once.prior), 10)
    expect(explain(m, 'zzzz').rows[0].known).toBe(false)
  })
})
