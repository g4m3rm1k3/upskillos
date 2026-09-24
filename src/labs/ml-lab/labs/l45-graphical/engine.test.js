import { describe, it, expect } from 'vitest'
import { query, independent, makeHMM, simulate, forward, smooth, viterbi, accuracy, argmaxRows, baumWelchStep, randomHMM } from './engine.js'

describe('lab 45 graphical models', () => {
  it('explaining away and d-separation', () => {
    expect(query('bad', { fails: 1 })).toBeGreaterThan(0.6)
    expect(query('bad', { fails: 1, outage: 1 })).toBeLessThan(0.15)
    expect(independent('bad', 'outage')).toBe(true)
    expect(independent('bad', 'outage', { fails: 1 })).toBe(false)
    expect(independent('bad', 'pager', { fails: 1 })).toBe(true)
    expect(independent('bad', 'status', { fails: 1 })).toBe(false)
  })
  it('filtering beats raw readings; smoothing beats filtering', () => {
    const h = makeHMM(0.92, 0.7), d = simulate(h, 400, 7)
    const f = accuracy(argmaxRows(forward(h, d.obs).filtered), d.states), s = accuracy(argmaxRows(smooth(h, d.obs).smoothed), d.states)
    expect(f).toBeGreaterThan(accuracy(d.obs, d.states) + 0.05); expect(s).toBeGreaterThanOrEqual(f)
    expect(accuracy(viterbi(h, d.obs), d.states)).toBeGreaterThan(accuracy(d.obs, d.states))
  })
  it('Baum-Welch never decreases the likelihood', () => {
    const d = simulate(makeHMM(), 600, 3)
    let m = randomHMM(3, 3, 1), prev = -Infinity
    for (let i = 0; i < 25; i++) { const ll = forward(m, d.obs).loglik; expect(ll).toBeGreaterThanOrEqual(prev - 1e-6); prev = ll; m = baumWelchStep(m, d.obs) }
  })
})
