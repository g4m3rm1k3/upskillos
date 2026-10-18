// Walking back the answer: from the answer cell, every step moves to a cell the value was really computed
// from, the steps' gains add up to the answer, and the solution read off the walk is a real solution
// (a common subsequence, items that fit, edits that make the target), on the example and random inputs.
import { describe, expect, it } from 'vitest'
import { TRACES, INPUTS } from './tables.js'
import { formatField, parseInput, randomInput } from './traceInputs.js'
import { WALKS, walkFrom, spell } from './walks.js'

const isSub = (small, big) => { let k = 0; for (const ch of big) if (ch === small[k]) k++; return k === small.length }
const pieces = (id, steps) => steps.map(s => s.option.adds).filter(x => x !== undefined)

// What makes each walk's result a real solution, beyond adding up to the answer.
const VALID = {
  lcs: (trace, steps) => { const s = spell('lcs', steps); return isSub(s, trace.args[0]) && isSub(s, trace.args[1]) },
  'lcs-reconstruct': (trace, steps) => { const s = spell('lcs-reconstruct', steps); return isSub(s, trace.args[0]) && isSub(s, trace.args[1]) },
  'edit-distance': (trace, steps) => spell('edit-distance', steps) === trace.args[1],
  'shortest-supersequence': (trace, steps) => { const s = spell('shortest-supersequence', steps); return isSub(trace.args[0], s) && isSub(trace.args[1], s) },
  'zero-one-knapsack': (trace, steps) => { const items = pieces('', steps).map(x => Number(x.split(' ')[1])); return new Set(items).size === items.length && items.reduce((s, i) => s + trace.args[0][i - 1], 0) <= trace.args[2] },
  'unbounded-knapsack': (trace, steps) => pieces('', steps).reduce((s, x) => s + trace.args[0][Number(x.split(' ')[1]) - 1], 0) <= trace.args[2],
  'coin-min': (trace, steps) => pieces('', steps).reduce((s, x) => s + Number(x), 0) === trace.args[1],
  'rod-cutting': (trace, steps) => pieces('', steps).reduce((s, x) => s + Number(x), 0) === trace.args[1],
  'house-robber': (trace, steps) => { const h = pieces('', steps).map(Number).sort((x, y) => x - y); return h.every((x, k) => k === 0 || x - h[k - 1] >= 2) },
  'min-grid-path': (trace, steps) => { const cells = spell('min-grid-path', steps).split(' → '); return cells[0] === '(0,0)' && cells.at(-1) === `(${trace.args[0].length - 1},${trace.args[0][0].length - 1})` },
  'triangle-path': (trace, steps) => spell('triangle-path', steps).split(' → ').length === trace.args[0].length,
  lis: (trace, steps) => { const v = spell('lis', steps).split(', ').map(Number); return v.every((x, k) => k === 0 || x > v[k - 1]) && isSub(v.map(String), trace.args[0].map(String)) },
  'weighted-intervals': (trace, steps) => { const iv = pieces('', steps).map(x => x.slice(1, -1).split(',').map(Number)); return iv.every(([s, e], k) => iv.every(([s2, e2], k2) => k === k2 || e <= s2 || e2 <= s)) },
}

function checkWalk(id, trace) {
  const t = trace.table, reads = new Map(t.steps.map(s => [s.at.join(), s.reads.map(r => r.join())]))
  const { steps, end } = walkFrom(id, trace, trace.answer)
  // Only an answer that is itself a base case (capacity 0, amount 0) has nothing to walk.
  if (!t.base.some(b => b.at.join() === trace.answer.join())) expect(steps.length, `${id}: the walk takes no step`).toBeGreaterThan(0)
  for (const { at, option } of steps) {
    expect(option.says.length, id).toBeGreaterThan(3)
    // A step goes to a cell this cell read, unless this cell is a base case (an edge walked along).
    if (option.from && reads.has(at.join())) expect(reads.get(at.join()), `${id}: ${t.name(...at)} → ${t.name(...option.from)}`).toContain(option.from.join())
  }
  const gained = steps.reduce((s, x) => s + x.option.gain, 0) + (end ? t.get(...end) : 0)
  expect(gained, `${id} ${JSON.stringify(trace.args)}: gains`).toBe(WALKS[id].total ? WALKS[id].total(trace) : t.get(...trace.answer))
  expect(VALID[id](trace, steps), `${id} ${JSON.stringify(trace.args)}: ${spell(id, steps)}`).toBe(true)
}

const rng = seed => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)

describe('walking back the answer', () => {
  it('has a check for every walk', () => {
    for (const id of Object.keys(WALKS)) { expect(TRACES[id], id).toBeTruthy(); expect(VALID[id], id).toBeTruthy() }
  })
  for (const id of Object.keys(WALKS)) {
    it(`${id}: walks from the answer to a base case and reads off a real solution`, () => {
      checkWalk(id, TRACES[id]())
      const random = rng(id.length * 104729), spec = INPUTS[id]
      let tried = 0
      for (let i = 0; i < 200 && tried < 25; i++) {
        const value = randomInput(spec, random, TRACES[id]().args)
        const parsed = parseInput(spec, Object.fromEntries(spec.fields.map(f => [f.key, formatField(f, value[f.key])])))
        if (parsed.error) continue
        const trace = TRACES[id](parsed.value)
        if (!Number.isFinite(trace.table.get(...trace.answer))) continue
        tried++
        checkWalk(id, trace)
      }
      expect(tried).toBeGreaterThanOrEqual(10)
    })
  }
})
