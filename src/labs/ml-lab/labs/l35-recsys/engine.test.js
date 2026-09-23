import { describe, it, expect } from 'vitest'
import { makeWorld, evaluate, feedbackLoop, matrix, MODELS, recommend, ITEMS } from './engine.js'

describe('lab 35 recommender systems', () => {
  const w = makeWorld(), nU = w.users.length
  it('personalized methods beat popularity; random hold-out leaks', () => {
    const pop = evaluate(w.events, nU, 'popularity'), ii = evaluate(w.events, nU, 'itemItem'), mf = evaluate(w.events, nU, 'factorize')
    expect(ii.hit).toBeGreaterThan(pop.hit + 0.1)
    expect(mf.hit).toBeGreaterThan(pop.hit + 0.1)
    expect(pop.coverage).toBeLessThan(ii.coverage)
    for (const m of ['popularity', 'itemItem', 'factorize']) expect(evaluate(w.events, nU, m, { mode: 'random' }).hit).toBeGreaterThan(evaluate(w.events, nU, m).hit)
  })
  it('never recommends seen items; cold start gives tied zero scores', () => {
    const R = [...matrix(w.events, nU), Array(ITEMS.length).fill(0)]
    const ii = MODELS.itemItem(R)
    expect(recommend(ii, R, 3, 8).every(i => !R[3][i])).toBe(true)
    expect(recommend(ii, R, nU, 5).every(i => ii(nU)[i] === 0)).toBe(true)
  })
  it('moderate exploration discovers more than none or all', () => {
    const d = e => feedbackLoop(w, { method: 'itemItem', explore: e }).at(-1).discovered
    expect(d(0.3)).toBeGreaterThan(d(0))
    expect(d(0.3)).toBeGreaterThan(d(1))
    expect(feedbackLoop(w, { method: 'popularity' })[0].coverage).toBeLessThan(0.3)
  })
})
