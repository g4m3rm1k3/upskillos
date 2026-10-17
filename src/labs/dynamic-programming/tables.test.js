// Every live table: each step reads only cells already filled, writes a cell once, and ends on an answer
// that the lesson's reference solution agrees with (where the trace's input is a valid challenge input).
import { describe, expect, it } from 'vitest'
import { TRACES, show } from './tables.js'
import { LESSONS } from './lessons/index.js'
import { SOLUTIONS } from './lessons/reference-solutions.js'

describe('live DP tables', () => {
  it('cover the classic Core and Structured lessons', () => {
    expect(Object.keys(TRACES).length).toBeGreaterThanOrEqual(28)
    for (const id of Object.keys(TRACES)) expect(LESSONS[id], id).toBeTruthy()
  })
  for (const [id, make] of Object.entries(TRACES)) {
    it(`${id}: fills in dependency order and ends on the right answer`, () => {
      const trace = make(), t = trace.table
      expect(t.steps.length, 'steps').toBeGreaterThan(2)
      const filled = new Set(t.base.map(b => b.at.join()))
      for (const step of t.steps) {
        for (const r of step.reads) expect(filled.has(r.join()), `${id}: ${t.name(...step.at)} reads ${t.name(...r)} before it is filled`).toBe(true)
        expect(filled.has(step.at.join()), `${id}: ${t.name(...step.at)} written twice`).toBe(false)
        expect(step.rule.length, `${id}: ${t.name(...step.at)} has no arithmetic`).toBeGreaterThan(0)
        filled.add(step.at.join())
      }
      const answer = t.get(...trace.answer)
      expect(answer, 'answer cell').not.toBeNull()
      expect(show(answer)).not.toBe('')
      if (trace.args) {
        const solve = new Function(`${SOLUTIONS[id].JavaScript}; return solve`)()
        const expected = solve(...structuredClone(trace.args))
        expect(answer).toEqual(trace.check ? trace.check(expected) : expected)
      }
    })
  }
})
