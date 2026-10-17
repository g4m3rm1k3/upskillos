import { expect, it } from 'vitest'
import { DESIGNS, KINDS, applyCell } from './lessons/designs.js'
import { ORACLES } from './lessons/core-oracles.js'
import { LESSONS } from './lessons/index.js'
import { LEVELS } from './curriculum.js'
import { TRACES } from './tables.js'

// What the hand-solved questions ask for, when it is not the whole challenge answer.
const PICK = { 'max-subarray': v => v[0] }
const oracle = (id, args) => (PICK[id] ?? (v => v))(ORACLES[id](args))

// Numbers quoted inside option explanations and answers, checked by brute force: [oracle, args, value].
const CLAIMS = [
  ['min-cost-stairs', [[5]], 5],
  ['min-cost-stairs', [[100, 1]], 1],
  ['house-robber', [[2, 7, 9, 3, 1]], 12],
  ['house-robber', [[1, 9, 1]], 9],
  ['house-robber', [[7, 3]], 7],
  ['house-robber', [[4, 1, 2, 7]], 11],
  ['house-robber', [[1, 2, 7]], 8],
  ['circular-selection', [[9, 1, 1]], 9],
  ['circular-selection', [[7]], 7],
  ['activity-selection', [[[4, 5], [1, 9], [2, 3]]], 15],
  ['max-subarray', [[-3]], -3],
  ['max-product', [[2, -3, -2, 4, 0, -1]], 48],
  ['max-product', [[0, 3]], 3],
  ['max-product', [[-5]], -5],
  ['decode-ways', ['106'], 1],
  ['decode-ways', ['10'], 1],
  ['word-break', ['xcat', ['cat']], false],
  ['word-break', ['catsdog', ['cat', 'cats', 'sdog']], true],
  ['word-break-count', ['aaa', ['a', 'aa']], 3],
]

it('gives every one-dimensional lesson a design, and only lessons that exist', () => {
  const linear = LEVELS.find(l => l.id === 'core').groups.find(g => g.id === 'linear').concepts.map(c => c.id)
  for (const id of linear) expect(DESIGNS[id], id).toBeTruthy()
  for (const id of Object.keys(DESIGNS)) expect(LESSONS[id], id).toBeTruthy()
})

it('asks six decisions in order, each with one right option and a reason for every option', () => {
  for (const [id, d] of Object.entries(DESIGNS)) {
    expect(d.problem.length, id).toBeGreaterThan(40)
    expect(d.steps.map(s => s.kind), id).toEqual(KINDS.map(([k]) => k))
    const rightAt = []
    for (const step of d.steps) {
      expect(step.ask.length, id).toBeGreaterThan(10)
      expect(step.options.length, `${id} ${step.kind}`).toBeGreaterThanOrEqual(2)
      expect(step.options.length, `${id} ${step.kind}`).toBeLessThanOrEqual(4)
      expect(step.options.filter(o => o.right).length, `${id} ${step.kind}`).toBe(1)
      expect(new Set(step.options.map(o => o.text)).size, `${id} ${step.kind}`).toBe(step.options.length)
      for (const o of step.options) expect(o.why.length, `${id} ${step.kind}: ${o.text}`).toBeGreaterThan(25)
      rightAt.push(step.options.findIndex(o => o.right))
    }
    // The right answer is not always in the same place, so position alone gives nothing away.
    expect(new Set(rightAt).size, id).toBeGreaterThan(1)
  }
})

it('checks every hand-solved answer against brute force, and every misconception is wrong', () => {
  for (const [id, d] of Object.entries(DESIGNS)) {
    const checks = [d.tryFirst, ...(d.apply.cell ? [] : [d.apply])]
    for (const c of checks) {
      expect(oracle(id, c.args), `${id}: ${c.prompt}`).toEqual(c.answer)
      expect(c.explain.length, id).toBeGreaterThan(20)
      for (const m of c.misconceptions ?? []) {
        expect(m.answer, `${id} misconception`).not.toEqual(c.answer)
        expect(m.feedback.length, id).toBeGreaterThan(20)
      }
      expect(new Set((c.misconceptions ?? []).map(m => m.answer)).size).toBe((c.misconceptions ?? []).length)
    }
  }
})

it('asks the apply question about a real, computed cell of the live table', () => {
  for (const [id, d] of Object.entries(DESIGNS)) {
    if (!d.apply.cell) { expect(TRACES[id], `${id} has a trace: use a cell`).toBeUndefined(); continue }
    const a = applyCell(id, d.apply)
    expect(a, id).toBeTruthy()
    // The cell is computed, not seeded, and every cell it reads is shown.
    const shown = new Set(a.known.map(([name]) => name))
    for (const r of a.step.reads) expect(shown.has(a.trace.table.name(...r)), `${id} reads ${r}`).toBe(true)
  }
})

it('quotes only numbers that brute force agrees with', () => {
  for (const [id, args, value] of CLAIMS) expect(oracle(id, args), `${id} ${JSON.stringify(args)}`).toEqual(value)
})
