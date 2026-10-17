// Every live table: each step reads only cells already filled, writes a cell once, and ends on an answer
// that an independent solution agrees with, on the lesson's example and on random inputs the learner
// could type. The random inputs go through the same parser as the input box.
import { describe, expect, it } from 'vitest'
import { TRACES, INPUTS, show, defaultInput } from './tables.js'
import { formatField, parseInput, randomField } from './traceInputs.js'
import { LESSONS } from './lessons/index.js'
import { SOLUTIONS } from './lessons/reference-solutions.js'

// Answers for traces whose lessons have no reference solution, written without DP (plain recursion
// or enumeration), so they can't share a mistake with the table.
const lcsBrute = (a, b) => (!a || !b ? 0 : a.at(-1) === b.at(-1) ? 1 + lcsBrute(a.slice(0, -1), b.slice(0, -1)) : Math.max(lcsBrute(a.slice(0, -1), b), lcsBrute(a, b.slice(0, -1))))
const editBrute = (a, b) => (!a ? b.length : !b ? a.length : Math.min(editBrute(a.slice(0, -1), b) + 1, editBrute(a, b.slice(0, -1)) + 1, editBrute(a.slice(0, -1), b.slice(0, -1)) + (a.at(-1) === b.at(-1) ? 0 : 1)))
function lisBrute(a) {
  let best = 0
  for (let mask = 1; mask < 1 << a.length; mask++) {
    const pick = a.filter((_, i) => mask & (1 << i))
    if (pick.every((v, i) => i === 0 || v > pick[i - 1])) best = Math.max(best, pick.length)
  }
  return best
}
// The grid-paths challenge adds diagonal moves; the table (like the lesson) is right and down only.
const pathsBrute = (r, c) => (r === 1 || c === 1 ? 1 : pathsBrute(r - 1, c) + pathsBrute(r, c - 1))
const ORACLE = { lcs: lcsBrute, 'edit-distance': editBrute, lis: lisBrute, 'grid-paths': pathsBrute }

function expected(id, args) {
  if (ORACLE[id]) return ORACLE[id](...args)
  return new Function(`${SOLUTIONS[id].JavaScript}; return solve`)()(...structuredClone(args))
}

function checkTrace(id, trace) {
  const t = trace.table
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
  const want = expected(id, trace.args)
  expect(answer, `${id} ${JSON.stringify(trace.args)}`).toEqual(trace.check ? trace.check(want) : want)
}

// A small seeded generator, so a failure names an input that can be replayed.
const rng = seed => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)

describe('live DP tables', () => {
  it('cover the classic Core and Structured lessons, each with an input box', () => {
    expect(Object.keys(TRACES).length).toBeGreaterThanOrEqual(31)
    for (const id of Object.keys(TRACES)) {
      expect(LESSONS[id], id).toBeTruthy()
      expect(INPUTS[id], id).toBeTruthy()
      expect(SOLUTIONS[id] || ORACLE[id], `${id} needs an independent answer`).toBeTruthy()
    }
  })
  for (const id of Object.keys(TRACES)) {
    it(`${id}: fills in dependency order and ends on the right answer, for the example and random inputs`, () => {
      const example = TRACES[id]()
      expect(example.table.steps.length, 'steps').toBeGreaterThan(2)
      checkTrace(id, example)
      // The default input survives the input box: formatted, parsed back, same table.
      const spec = INPUTS[id], input = defaultInput(id)
      const texts = Object.fromEntries(spec.fields.map(f => [f.key, formatField(f, input[f.key])]))
      expect(parseInput(spec, texts)).toEqual({ value: input })
      const random = rng(id.length * 7919)
      let tried = 0
      for (let i = 0; i < 200 && tried < 25; i++) {
        const value = Object.fromEntries(spec.fields.map(f => [f.key, f.kind === 'words' ? input[f.key] : randomField(f, random)]))
        const parsed = parseInput(spec, Object.fromEntries(spec.fields.map(f => [f.key, formatField(f, value[f.key])])))
        if (parsed.error) continue
        if (id === 'edit-distance' && value.a.length + value.b.length > 9) continue
        tried++
        checkTrace(id, TRACES[id](parsed.value))
      }
      expect(tried, 'random inputs checked').toBeGreaterThanOrEqual(10)
    })
  }
})

describe('the input box', () => {
  const field = (id, key) => INPUTS[id].fields.find(f => f.key === key)
  it('explains what is wrong with an input instead of drawing a broken table', () => {
    expect(parseInput(INPUTS['house-robber'], { values: '3, x, 4' }).error).toMatch(/whole numbers/)
    expect(parseInput(INPUTS['house-robber'], { values: '' }).error).toMatch(/give 1 to 10/)
    expect(parseInput(INPUTS['house-robber'], { values: '3, 500' }).error).toMatch(/0 to 99/)
    expect(parseInput(INPUTS['zero-one-knapsack'], { weights: '2, 3', values: '4', capacity: '5' }).error).toMatch(/one value for each weight/)
    expect(parseInput(INPUTS['coin-min'], { coins: '1, 1', amount: '5' }).error).toMatch(/once/)
    expect(parseInput(INPUTS.binomial, { n: '3', k: '5' }).error).toMatch(/at most n/)
    expect(parseInput(INPUTS['triangle-path'], { triangle: '1; 2 3; 4 5' }).error).toMatch(/Row 2 needs 3/)
    expect(parseInput(INPUTS['obstacle-paths'], { grid: '000; 01' }).error).toMatch(/same number/)
    expect(parseInput(INPUTS['balanced-parentheses'], { s: '(a)' }).error).toMatch(/“\(”/)
  })
  it('reads grids typed with or without spaces', () => {
    expect(parseInput(INPUTS['obstacle-paths'], { grid: '010; 0 0 0' }).value.grid).toEqual([[0, 1, 0], [0, 0, 0]])
    expect(formatField(field('obstacle-paths', 'grid'), [[0, 1], [1, 0]])).toBe('01; 10')
  })
})
