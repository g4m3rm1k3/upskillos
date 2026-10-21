import { expect, it } from 'vitest'
import { CHECKS } from './lessons/checks.js'
import { displayOrder } from './lessons/designs.js'
import { ORACLES as CORE_ORACLES } from './lessons/core-oracles.js'
import { STRUCTURED_ORACLES } from './lessons/structured-oracles.js'
import { ADVANCED_ORACLES } from './lessons/advanced-oracles.js'
import { LESSONS } from './lessons/index.js'

const ORACLES = { ...CORE_ORACLES, ...STRUCTURED_ORACLES, ...ADVANCED_ORACLES }

// Answers that are not a lesson's challenge answer, computed without DP.
const EXTRA = {
  // The mask-language answer as a number (it fits for small positions).
  'mask-number': ([sets]) => Number(ADVANCED_ORACLES['mask-language']([sets])),
  // The shortest distance from the first vertex to the last.
  'floyd-first-last': ([n, edges]) => ADVANCED_ORACLES['floyd-warshall']([n, edges])[0][n - 1],
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
  ['grid-paths', [3, 3], 13],
  ['obstacle-paths', [[[0, 0, 0], [0, 0, 0], [0, 0, 0]]], 6],
  ['min-grid-path', [[[1, 1, 1], [1, 1, 1]]], [4, 3]],
  ['min-grid-path', [[[1, 3, 1], [1, 5, 1], [4, 2, 1]]], [7, 1]],
  ['triangle-path', [[[2], [9, 9]]], 11],
  ['triangle-path', [[[9], [9, 1]]], 10],
  ['grid-resources', [[[0, 1, 0], [1, 0, 1], [0, 1, 0]], 2], 6],
  ['grid-direction', [[[0, 1, 1], [1, 1, 1]], 3], 6],
  ['grid-multiagent', [[[1, 0, 1]]], 2],
  ['zero-one-knapsack', [[1, 2, 3], [6, 10, 12], 5], 22],
  ['unbounded-knapsack', [[1, 2, 3], [6, 10, 12], 5], 30],
  ['zero-one-knapsack', [[2, 3], [3, 5], 7], 8],
  ['unbounded-knapsack', [[3, 4], [4, 5], 4], 5],
  ['unbounded-knapsack', [[2, 3], [3, 5], 9], 15],
  ['zero-one-knapsack', [[2, 3], [3, 5], 9], 8],
  ['equal-partition', [[1, 2, 3]], 0],
  ['target-signs', [[1, 2, 3], 0], 2],
  ['coin-permutations', [[1, 2, 3], 4], 7],
  ['coin-combinations', [[1, 3], 5], 2],
  ['coin-permutations', [[1, 2], 5], 8],
  ['coin-combinations', [[1, 2], 5], 3],
  ['zero-one-knapsack', [[1, 2, 1, 3], [3, 5, 2, 6], 3], 8],
  ['zero-one-knapsack', [[2, 3, 4], [6, 1, 1], 7], 7],
  ['rod-cutting', [[2, 5, 7, 8, 10], 4], 10],
  ['binomial', [6, 2], 15],
  ['binomial', [5, 2], 10],
  ['binomial', [5, 3], 10],
  ['coin-combinations', [[1, 2, 3, 4, 5, 6], 6], 11],
  ['coin-permutations', [[1, 2, 3, 4, 5, 6], 6], 32],
  ['binomial', [8, 4], 70],
  ['catalan', [3], 5],
  ['catalan', [2], 2],
  ['derangements', [4], 9],
  ['derangements', [3], 2],
  ['stirling', [4, 1], 1],
  ['stirling', [4, 3], 6],
  ['stirling', [4, 4], 1],
  ['stirling', [3, 2], 3],
  ['inversion-counting', [3, 2], 2],
  ['inversion-counting', [4, 1], 3],
  ['inversion-counting', [4, 4], 5],
  ['lis-count', [[2, 2, 2]], 3],
  ['lis-count', [[1, 1, 2, 2, 3, 3]], 8],
  ['lis', [[1, 3, 5, 4, 2, 6]], 4],
  ['bitonic', [[1, 2, 3, 4]], 4],
  ['common-substring', ['xaybzc', 'abcxyz'], 1],
  ['lcs-reconstruct', ['aa', 'a'], 1],
  ['lcs-reconstruct', ['abxab', 'baxba'], 6],
  ['lcs-reconstruct', ['abxabyab', 'baxbayba'], 18],
  ['lcs', ['abxcd', 'abycd'], 4],
  ['edit-distance', ['abcd', 'acbd'], 2],
  ['edit-distance', ['ab', 'ba'], 2],
  ['damerau', ['ca', 'abc'], 2],
  ['regex', ['ab', '.*c'], false],
  ['binomial', [30, 15], 155117520],
  ['stock-cooldown', [[1, 5, 3, 6], 0, 2], 3],
  ['stock-states', [[1, 5, 3, 6]], 7],
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
