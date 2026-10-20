import { expect, it } from 'vitest'
import { CHECKS } from './lessons/checks.js'
import { displayOrder } from './lessons/designs.js'
import { ORACLES } from './lessons/core-oracles.js'
import { LESSONS } from './lessons/index.js'

// Answers that are not a lesson's challenge answer, computed without DP.
const EXTRA = {
  // Every call of the plain Fibonacci recursion, the first one included.
  'fib-calls': ([n]) => { const calls = k => 1 + (k < 2 ? 0 : calls(k - 1) + calls(k - 2)); return calls(n) },
  // The greedy climb: always step onto the cheaper of the next two stairs (the first on a tie).
  'greedy-stairs': ([costs]) => {
    let at = -1, total = 0
    while (at < costs.length - 1) {
      const next = at + 2 < costs.length && costs[at + 2] < costs[at + 1] ? at + 2 : at + 1
      total += costs[next]
      at = next
    }
    return total
  },
}
const oracle = (id, args, part) => { const v = (EXTRA[id] ?? ORACLES[id])(structuredClone(args)); return part === undefined ? v : v[part] }

// Numbers quoted inside the checks' text, checked by brute force: [oracle, args, value].
const CLAIMS = [
  ['fib-calls', [4], 9],
  ['fib-calls', [3], 5],
  ['stairs', [5, [1, 2]], 8],
  ['coin-combinations', [[1, 2], 6], 4],
  ['greedy-stairs', [[1, 9, 9, 1, 9]], 20],
  ['min-cost-stairs', [[1, 9, 9, 1]], 10],
  ['house-robber', [[3, 2, 1]], 4],
  ['house-robber', [[5, 1, 1, 5]], 10],
  ['house-robber', [[5, 1, 1]], 6],
  ['house-robber', [[1, 1, 5]], 6],
  ['circular-selection', [[9]], 9],
  ['activity-selection', [[[1, 9], [1, 9]]], 10],
  ['max-subarray', [[3, -4, 5, -1, 2]], [6, 2, 4]],
  ['max-product', [[3, -4]], 3],
  ['max-product', [[-2, 3]], 3],
  ['decode-ways', ['12'], 2],
  ['word-break', ['abcd', ['abc', 'ab', 'cd']], true],
  ['word-break-count', ['aaaaaa', ['a', 'aa']], 13],
]

const entries = Object.entries(CHECKS).flatMap(([id, checks]) => checks.map((c, k) => [id, c, k]))

it('gives several checks to real lessons, each with what you need to know first', () => {
  expect(Object.keys(CHECKS).length).toBeGreaterThanOrEqual(11)
  for (const [id, checks] of Object.entries(CHECKS)) {
    expect(LESSONS[id], id).toBeTruthy()
    expect(checks.length, id).toBeGreaterThanOrEqual(3)
  }
  for (const [id, c] of entries) {
    expect(c.know.length, `${id}: ${c.ask}`).toBeGreaterThan(40)
    expect(c.ask.length, id).toBeGreaterThan(15)
  }
})

it('has exactly one right option per choice, a reason on every option, and the right one in no fixed place', () => {
  const at = []
  for (const [id, c, k] of entries.filter(([, c]) => c.options)) {
    expect(c.options.filter(o => o.right).length, `${id}: ${c.ask}`).toBe(1)
    for (const o of c.options) expect(o.why.length, `${id}: ${o.text}`).toBeGreaterThan(30)
    expect([...displayOrder(id, k, c.options)].sort(), id).toEqual(c.options.map((_, i) => i))
    at.push(displayOrder(id, k, c.options).indexOf(c.options.findIndex(o => o.right)))
  }
  for (let p = 0; p < 3; p++) expect(at.filter(x => x === p).length / at.length, `position ${p}`).toBeGreaterThan(0.15)
})

it('checks every number against brute force, and every misconception is a different number', () => {
  for (const [id, c] of entries.filter(([, c]) => !c.options)) {
    expect(oracle(c.oracle ?? id, c.args, c.part), `${id}: ${c.ask}`).toEqual(c.answer)
    expect(c.explain.length, id).toBeGreaterThan(20)
    expect(c.misconceptions.length, id).toBeGreaterThanOrEqual(1)
    for (const m of c.misconceptions) {
      expect(m.answer, `${id} misconception`).not.toEqual(c.answer)
      expect(m.feedback.length, id).toBeGreaterThan(20)
    }
  }
  for (const [id, args, value] of CLAIMS) expect(oracle(id, args), `${id} ${JSON.stringify(args)}`).toEqual(value)
})
