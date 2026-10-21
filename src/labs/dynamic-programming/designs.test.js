import { expect, it } from 'vitest'
import { DESIGNS, KINDS, applyCell, displayOrder } from './lessons/designs.js'
import { ORACLES as CORE_ORACLES } from './lessons/core-oracles.js'
import { STRUCTURED_ORACLES } from './lessons/structured-oracles.js'
import { ADVANCED_ORACLES } from './lessons/advanced-oracles.js'
import { LESSONS } from './lessons/index.js'
import { LEVELS } from './curriculum.js'
import { TRACES } from './tables.js'

// What the hand-solved questions ask for, when it is not the whole challenge answer.
// Core lessons are checked against their challenges' oracles; Structured ones against enumeration only.
const ORACLES = { ...CORE_ORACLES, ...STRUCTURED_ORACLES, ...ADVANCED_ORACLES }
const PICK = { 'max-subarray': v => v[0], 'min-grid-path': v => v[0], 'bellman-ford-dp': v => v[v.length - 1], 'floyd-warshall': v => v[0][v.length - 1], ...Object.fromEntries(['tree-basics', 'tree-reroot', 'reroot-prefix', 'tree-distances', 'tree-small-large'].map(id => [id, v => v[1]])), 'subset-enumeration': v => v[v.length - 1], 'mask-language': v => Number(v) }
const oracle = (id, args) => (PICK[id] ?? (v => v))(ORACLES[id](args))
// The curriculum groups whose every lesson has a design.
const DESIGNED = ['linear', 'grids', 'knapsack', 'basic-counting', 'sequences', 'strings', 'intervals', 'scheduling', 'dag', 'trees', 'subsets', 'digits-automata']

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
  ['obstacle-paths', [[[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]], 10],
  ['obstacle-paths', [[[0, 0, 0], [0, 1, 0], [0, 0, 0]]], 2],
  ['min-grid-path', [[[3]]], 3],
  ['grid-resources', [[[1]], 0], 0],
  ['grid-resources', [[[0, 1, 0], [0, 0, 1], [1, 0, 0]], 2], 6],
  ['grid-direction', [[[0], [0]], 4], 0],
  ['max-square', [[[0, 1], [1, 1]]], 1],
  ['zero-one-knapsack', [[3, 4], [5, 7], 10], 12],
  ['zero-one-knapsack', [[4, 6, 8], [1, 2, 3], 10], 3],
  ['coin-combinations', [[1, 2], 4], 3],
  ['coin-permutations', [[1, 2, 5], 5], 9],
  ['coin-min', [[1, 3, 4], 6], 2],
  ['exact-capacity', [[2, 3], [5, 4], 5], 9],
  ['binomial', [6, 3], 20],
  ['catalan', [2], 2],
  ['inversion-counting', [3, 3], 1],
  ['lis', [[3, 4, 1, 2, 3]], 3],
  ['lis', [[2, 2]], 1],
  ['lcs', ['ab', 'ba'], 1],
  ['damerau', ['ca', 'abc'], 2],
  ['shortest-supersequence', ['ab', 'ba'], 3],
  ['edit-distance', ['ab', 'ba'], 2],
  ['palindrome-substring', ['abca'], 4],
  ['local-alignment', ['xabcy', 'zabcw', 2, 1, 1], 6],
  ['strange-printer', ['abab'], 3],
  ['optimal-bst', [[3, 1, 2]], 10],
  ['partition-max', [[7, 2, 5, 10, 8], 2], 18],
  ['stock-states', [[2, 5, 1, 4]], 6],
  ['stock-k', [[3, 3, 5, 0, 0, 3, 1, 4], 1], 4],
  ['batch-scheduling', [[2, 1, 1, 2], 0], 10],
]

it('gives every lesson in a designed group a design, and only lessons that exist', () => {
  const ids = LEVELS.flatMap(l => l.groups).filter(g => DESIGNED.includes(g.id)).flatMap(g => g.concepts.map(c => c.id))
  expect(ids.length).toBeGreaterThan(DESIGNED.length)
  for (const id of ids) expect(DESIGNS[id], id).toBeTruthy()
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
      rightAt.push(displayOrder(id, d.steps.indexOf(step), step.options).indexOf(step.options.findIndex(o => o.right)))
    }
    // As shown, the right answer is not always in the same place, so position gives nothing away.
    expect(new Set(rightAt).size, id).toBeGreaterThan(1)
  }
})

it('shows the right option in every position about equally often', () => {
  const steps = Object.entries(DESIGNS).flatMap(([id, d]) => d.steps.map((s, k) => ({ n: s.options.length, at: displayOrder(id, k, s.options).indexOf(s.options.findIndex(o => o.right)) })))
  for (const n of [2, 3]) {
    const group = steps.filter(s => s.n === n)
    for (let p = 0; p < n; p++) expect(group.filter(s => s.at === p).length / group.length, `${n} options, position ${p}`).toBeGreaterThan(0.6 / n)
  }
  // Every option is shown exactly once.
  for (const [id, d] of Object.entries(DESIGNS)) d.steps.forEach((s, k) => expect([...displayOrder(id, k, s.options)].sort(), id).toEqual(s.options.map((_, i) => i)))
})

it('checks every hand-solved answer against brute force, and every misconception is wrong', () => {
  for (const [id, d] of Object.entries(DESIGNS)) {
    const checks = [d.tryFirst, ...(d.apply.cell ? [] : [d.apply])]
    for (const c of checks) {
      expect(oracle(c.oracle ?? id, c.args), `${id}: ${c.prompt}`).toEqual(c.answer)
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
    for (const m of d.apply.misconceptions ?? []) expect(m.answer, `${id} apply misconception`).not.toEqual(a.step.value)
  }
})

it('quotes only numbers that brute force agrees with', () => {
  for (const [id, args, value] of CLAIMS) expect(oracle(id, args), `${id} ${JSON.stringify(args)}`).toEqual(value)
})
