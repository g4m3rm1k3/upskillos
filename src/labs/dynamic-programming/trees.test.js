// The recursion trees must agree with the live tables: same recurrence, same answers. And a memo must
// cut the tree to one full call per distinct state.
import { describe, expect, it } from 'vitest'
import { TREES, TREE_FOR, buildTree, countCalls, layout } from './trees.js'
import { TRACES, show } from './tables.js'
import { LESSONS } from './lessons/index.js'

// The live-table input that asks the same question as a tree's input.
const AS_TABLE = {
  fibonacci: ({ n }) => ['fibonacci', { n }],
  stairs: ({ n }) => ['stairs', { n, steps: [1, 2] }],
  'house-robber': ({ n }) => ['house-robber', { values: TREES['house-robber'].data.slice(0, n) }],
  'grid-paths': ({ rows, cols }) => ['grid-paths', { rows, cols }],
  binomial: ({ n, k }) => ['binomial', { n, k: Math.min(k, n) }],
  'coin-min': ({ amount }) => ['coin-min', { coins: [1, 3, 4], amount }],
  'zero-one-knapsack': ({ capacity }) => ['zero-one-knapsack', { weights: [2, 3, 4], values: [3, 5, 6], capacity }],
  'decode-ways': ({ n }) => ['decode-ways', { s: TREES['decode-ways'].s.slice(0, n) }],
  catalan: ({ n }) => ['catalan', { n }],
  lcs: ({ n }) => ['lcs', { a: TREES.lcs.a.slice(0, n), b: TREES.lcs.b.slice(0, n) }],
  'edit-distance': ({ n }) => ['edit-distance', { a: TREES['edit-distance'].a.slice(0, n), b: TREES['edit-distance'].b.slice(0, n) }],
}

// Every combination of a tree's parameters.
function inputs(spec) {
  return spec.params.reduce((all, p) => all.flatMap(o => Array.from({ length: p.max - p.min + 1 }, (_, i) => ({ ...o, [p.key]: p.min + i }))), [{}])
}

describe('recursion trees', () => {
  it('belong to real lessons', () => {
    for (const [lesson, tree] of Object.entries(TREE_FOR)) {
      expect(LESSONS[lesson], lesson).toBeTruthy()
      expect(TREES[tree], tree).toBeTruthy()
    }
    expect(Object.keys(AS_TABLE).sort()).toEqual(Object.keys(TREES).sort())
  })
  for (const [id, spec] of Object.entries(TREES)) {
    it(`${id}: matches its live table for every input, and the memo answers each state once`, () => {
      for (const input of inputs(spec)) {
        const memo = buildTree(spec, input, { memo: true, limit: 1e6 })
        const [traceId, tableInput] = AS_TABLE[id](input)
        const trace = TRACES[traceId](tableInput)
        expect(show(memo.value), `${id} ${JSON.stringify(input)}`).toBe(show(trace.table.get(...trace.answer)))
        // With a memo: each distinct state is expanded exactly once; every other call is a cached leaf.
        const expanded = memo.nodes.filter(n => !n.cached).map(n => n.label)
        expect(new Set(expanded).size).toBe(expanded.length)
        expect(memo.nodes.filter(n => n.cached).every(n => n.children.length === 0)).toBe(true)
        // Without: the same answer, never fewer calls, and the counter agrees with the drawn tree.
        const plain = buildTree(spec, input, { limit: 1e6 })
        expect(plain.value).toBe(memo.value)
        expect(countCalls(spec, input)).toBe(plain.nodes.length)
        expect(plain.nodes.length).toBeGreaterThanOrEqual(memo.nodes.length)
        expect(plain.events.length).toBe(2 * plain.nodes.length)
      }
    })
  }
  it('counts the Fibonacci calls the lessons quote', () => {
    // Plain fib(n) makes 2·F(n+1) − 1 calls.
    const F = n => (n < 2 ? n : F(n - 1) + F(n - 2))
    for (let n = 2; n <= 9; n++) expect(countCalls(TREES.fibonacci, { n })).toBe(2 * F(n + 1) - 1)
  })
  it('stops drawing a tree that is too big, and says so', () => {
    const big = buildTree(TREES.fibonacci, { n: 9 }, { limit: 40 })
    expect(big.tooBig).toBe(true)
  })
  it('lays leaves out left to right with each parent over its children', () => {
    const { nodes } = buildTree(TREES.fibonacci, { n: 4 })
    const { x, width } = layout(nodes)
    expect(width).toBe(nodes.filter(n => !n.children.length).length)
    for (const n of nodes) if (n.children.length) expect(x[n.id]).toBe((x[n.children[0]] + x[n.children.at(-1)]) / 2)
  })
})
