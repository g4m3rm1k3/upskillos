import { describe, expect, it } from 'vitest'
import { dueItems, INTERVAL_DAYS, RETRY_MS, retained, schedule, stages } from './review.js'

const lesson = { id: 'laml-x', quiz: [{ q: 'a' }, { q: 'b' }], proof: { steps: [] } }
const DAY = 86400000

describe('spaced review', () => {
  it('only reviews studied lessons, new items first', () => {
    expect(dueItems([lesson], {}, 0)).toEqual([])
    const due = dueItems([lesson], { ran: { 'laml-x': 'now' }, review: { 'laml-x#1': { box: 2, due: 0 } } }, 5)
    expect(due.map(d => d.key)).toEqual(['laml-x#0', 'laml-x#1'])
  })
  it('moves up a box on success and back to box 1 soon after a miss', () => {
    expect(schedule(undefined, true, 0)).toEqual({ box: 1, due: INTERVAL_DAYS[1] * DAY })
    expect(schedule({ box: 4 }, true, 0)).toEqual({ box: 5, due: 60 * DAY })
    expect(schedule({ box: 5 }, true, 0).box).toBe(5)
    expect(schedule({ box: 4 }, false, 0)).toEqual({ box: 1, due: RETRY_MS })
  })
  it('counts retention only from box 3 for every item, and marks missing stages', () => {
    const store = { review: { 'laml-x#0': { box: 3 }, 'laml-x#1': { box: 2 } } }
    expect(retained(lesson, store)).toBe(false)
    expect(retained(lesson, { review: { ...store.review, 'laml-x#1': { box: 3 } } })).toBe(true)
    expect(stages({ id: 'y' }, {})).toEqual({ explored: false, practiced: false, proved: null, retained: false })
  })
})
