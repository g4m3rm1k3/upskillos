// @vitest-environment happy-dom
import React, { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, act, within } from '@testing-library/react'
import * as runtime from './notebook/runtime.js'
import { rng, buildCheck, parseCheck, grade, nextReview, dueReviews, MARKER, REVIEW_DAYS } from './kit/ladder.js'
import { prediction, generate, TEMPLATES, CASES, diagnosePredict, evaluateAgree, predictRow } from './labs/l03-matrices/ladder.js'
import { labs } from './labs/index.js'
import Ladder from './Ladder.jsx'

vi.mock('@monaco-editor/react', () => ({ default: ({ value, onChange, options }) => <textarea aria-label={options.ariaLabel} value={value} onChange={e => onChange?.(e.target.value)} /> }))

// Row-by-row dot products, written independently of the ladder module.
const loopPredict = (X, w) => X.map(row => { let s = 0; for (let j = 0; j < row.length; j++) s += row[j] * w[j]; return s })

describe('prediction ladder: expected values and generator', () => {
  it('every hand-computed case matches an explicit loop', () => {
    for (const c of CASES) expect(loopPredict(c.X, c.w)).toEqual(c.expected)
  })
  it('the cases cannot all be passed by hard-coding the lesson table', () => {
    expect(new Set(CASES.map(c => `${c.X.length}x${c.X[0].length}`)).size).toBeGreaterThanOrEqual(3)
    expect(CASES.some(c => c.w.some(v => v < 0))).toBe(true)
  })
  it('the same seed gives the same problem; different seeds vary', () => {
    for (const t of TEMPLATES) {
      expect(JSON.stringify(generate(t, 5))).toBe(JSON.stringify(generate(t, 5)))
      expect(new Set(Array.from({ length: 20 }, (_, s) => JSON.stringify(generate(t, s + 1).rows))).size).toBeGreaterThan(15)
    }
  })
  it('600 generated problems per kind are well posed and their answers check out independently', () => {
    for (let seed = 1; seed <= 600; seed++) {
      for (const t of TEMPLATES) {
        const p = generate(t, seed), m = p.model, rows = p.rows
        expect(new Set(rows.map(r => r.join())).size).toBe(rows.length)
        rows.flat().forEach(v => { expect(Number.isInteger(v)).toBe(true); expect(Math.abs(v)).toBeLessThanOrEqual(12) })
        const truth = loopPredict(rows.map(r => [1, ...r]), [m.b, m.w1, m.w2])
        if (t === 'forward') {
          expect(p.answer).toBeCloseTo(truth[p.target], 9)
          p.misconceptions.forEach(x => expect(Math.abs(x.answer - p.answer)).toBeGreaterThan(1e-9))
        }
        if (t === 'missing') {
          const r = rows[p.target]
          expect(r[1]).not.toBe(0)
          expect(m.b + m.w1 * r[0] + p.answer * r[1]).toBeCloseTo(p.yhat, 9)   // plug the answer back in
          p.misconceptions.forEach(x => expect(Math.abs(x.answer - p.answer)).toBeGreaterThan(1e-9))
        }
        if (t === 'debug') {
          const wrong = p.shown.map((v, i) => Math.abs(v - truth[i]) > 1e-9)
          expect(wrong.filter(Boolean)).toHaveLength(1)                          // exactly one wrong row
          expect(p.ctx.labels[wrong.indexOf(true)]).toBe(p.answer)
          expect(new Set(p.causes).size).toBe(3)
        }
      }
    }
  })
  it('the forward answer never coincides with a checked misconception, so feedback is unambiguous', () => {
    for (let seed = 1; seed <= 200; seed++) { const p = generate('forward', seed); expect(predictRow(p.model, p.rows[p.target])).toBe(p.answer) }
  })
})

describe('prediction ladder: diagnosis and grading', () => {
  const c = CASES[0]
  it('names plausible mistakes without giving the fix', () => {
    expect(diagnosePredict(c, { shape: [4], value: [4, 12, 10, 14] })).toMatch(/intercept never got in/)
    expect(diagnosePredict(c, { shape: [4], value: [6, 14, 12, 16] })).toMatch(/too large/)
    expect(diagnosePredict(c, { shape: [4, 3], value: [] })).toMatch(/never added up/)
    expect(diagnosePredict(c, { shape: [], value: 44 })).toMatch(/one number for the whole table/)
    expect(diagnosePredict(c, { shape: [3], value: [4, 10, 10] })).toMatch(/per column/)
    expect(diagnosePredict(c, { shape: [4, 1], value: [] })).toMatch(/\(n, 1\)/)
    for (const text of [diagnosePredict(c, { shape: [4], value: [4, 12, 10, 14] })]) expect(text).not.toMatch(/@|np\.dot|range\(/)
  })
  it('grades per case and reports mutation, None and errors', () => {
    const ok = { ok: true, cases: CASES.map(k => ({ shape: [k.expected.length], value: k.expected, mutated: false })) }
    expect(grade(ok, CASES, prediction.steps[2].check).passed).toBe(true)
    const bad = { ok: true, cases: [{ shape: [4], value: [4, 12, 10, 14] }, { none: true }, { error: 'NameError' }, { shape: [3], value: [2, 2.5, 3], mutated: true }] }
    const g = grade(bad, CASES, prediction.steps[2].check)
    expect(g.passed).toBe(false)
    expect(g.lines[0].text).toMatch(/expected \[5, 13, 11, 15\], got \[4, 12, 10, 14\]/)
    expect(g.lines[0].hint).toMatch(/intercept/)
    expect(g.lines[1].text).toMatch(/None/)
    expect(g.lines[2].error).toBe('NameError')
    expect(g.lines[3].text).toMatch(/changed one of its input arrays/)
    expect(grade({ ok: true, missing: 'predict' }, CASES).summary).toMatch(/No function called `predict`/)
    expect(grade(null, CASES).passed).toBe(false)
  })
  it('separates the learner’s prints from the report and survives NaN', () => {
    const { printed, report } = parseCheck(`hello\n${MARKER}{"ok": true, "cases": [{"shape": [1], "value": [NaN]}]}\n`)
    expect(printed).toBe('hello')
    expect(report.cases[0].value).toEqual([null])
  })
  it('never sends expected values to Python', () => {
    const code = buildCheck('def predict(X, w): pass', prediction.steps[2].check)
    expect(code).not.toMatch(/expected/)
    expect(code).not.toContain('[5,13,11,15]')
  })
  it('step 2 requires the prescribed change and an independent agreement', () => {
    const v = (value, shape) => ({ value, shape: shape ?? [value.length] })
    const X = v([[1, 1, 1], [1, 2, 4], [1, 3, 2], [1, 4, 3]], [4, 3])
    expect(evaluateAgree({ X, w: v([1, 2, 2]), loop_pred: v([5, 13, 11, 15]), matrix_pred: v([5, 13, 11, 15]) })).toMatchObject({ passed: false, message: expect.stringMatching(/Now change `w`/) })
    expect(evaluateAgree({ X, w: v([0.5, -1, 3]), loop_pred: v([2.5, 10.5, 3.5, 5.5]), matrix_pred: v([2.5, 10.5, 3.5, 5.5]) }).passed).toBe(true)
    expect(evaluateAgree({ X, w: v([0.5, -1, 3]), loop_pred: v([5, 13, 11, 15]), matrix_pred: v([2.5, 10.5, 3.5, 5.5]) }).passed).toBe(false)
    expect(evaluateAgree({ X, w: v([0.5, -1, 3]) }).passed).toBe(false)
  })
})

describe('returns after a gap', () => {
  const day = 86400000
  it('spaces correct returns further apart and brings a miss back to a day', () => {
    expect(nextReview([], 0)).toBe(REVIEW_DAYS[0] * day)
    expect(nextReview([{ correct: true }], 0)).toBe(REVIEW_DAYS[1] * day)
    expect(nextReview([{ correct: true }, { correct: true }], 0)).toBe(REVIEW_DAYS[2] * day)
    expect(nextReview([{ correct: true }, { correct: false }], 0)).toBe(day)
  })
  it('lists started ladders with their due dates', () => {
    const lab3 = labs.find(l => l.number === 3)
    const progress = { 'l03-matmul': { ladders: { prediction: { review: { due: 10, history: [] } } } } }
    expect(dueReviews(labs, progress, 20)).toEqual([expect.objectContaining({ lab: 3, lessonId: 'l03-matmul', isDue: true, title: lab3.ladders.prediction.title })])
    expect(dueReviews(labs, progress, 5)[0].isDue).toBe(false)
  })
  it('the seeded generator is deterministic', () => {
    const a = rng(42), b = rng(42)
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(Array.from({ length: 5 }, () => b.next()))
  })
})

// ---- The component, with a fake worker that answers the harness like Python would ----------------
class FakeWorker {
  static answer = () => ({ ok: true })
  constructor() { this.terminated = false }
  postMessage(msg) {
    if (msg.type !== 'run') return
    queueMicrotask(() => {
      if (this.terminated) return
      this.onmessage({ data: { type: 'status', state: 'running', job: msg.job } })
      if (/while True/.test(msg.code)) return
      this.onmessage({ data: { type: 'stream', job: msg.job, name: 'stdout', text: `\n${MARKER}${JSON.stringify(FakeWorker.answer(msg.code))}` } })
      this.onmessage({ data: { type: 'done', job: msg.job, ok: true, figures: [] } })
    })
  }
  terminate() { this.terminated = true }
}
const flush = () => act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve() })

function Harness({ initial = {} }) {
  const [saved, setSaved] = useState(initial)
  return <><Ladder name="prediction" spec={prediction} saved={saved} onUpdate={fn => setSaved(s => fn(s))} /><output data-testid="saved">{JSON.stringify(saved)}</output></>
}
const savedState = () => JSON.parse(screen.getByTestId('saved').textContent).ladders?.prediction

beforeEach(() => { runtime.setWorkerFactory(() => new FakeWorker()); window.confirm = () => true })
afterEach(() => { runtime.stop(); cleanup(); localStorage.clear(); vi.useRealTimers() })

describe('Ladder component', () => {
  it('traces a prediction field by field and records it as done without help', async () => {
    render(<Harness />)
    const inputs = [/^Intercept/, /^Size/, /^Files/, /^Prediction ŷ/].map(l => screen.getByLabelText(l))
    ;['0.5', '-4', '8', '5.5'].forEach((v, i) => fireEvent.change(inputs[i], { target: { value: v } }))
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(screen.getByText(/1 of 4 not yet right/)).toBeTruthy()
    fireEvent.change(inputs[2], { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(savedState().steps.trace).toMatchObject({ done: true, unassisted: true, attempts: 2 })
    expect(screen.getByText('✓ Done without help')).toBeTruthy()
  })
  it('checks code in a throwaway namespace, shows per-case feedback, and keeps edits made during a check', async () => {
    FakeWorker.answer = code => code.includes('X[i] @ w')
      ? { ok: true, cases: CASES.map(c => ({ shape: [c.expected.length], value: c.expected, mutated: false })) }
      : { ok: true, cases: CASES.map(c => ({ shape: [c.expected.length], value: c.X.map(r => r.slice(1).reduce((s, x, j) => s + x * c.w[j + 1], 0)), mutated: false })) }
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /3\. Fill in the missing expression/ }))
    const editor = screen.getByLabelText('Fill in the missing expression: your code')
    fireEvent.change(editor, { target: { value: editor.value.replace('___', 'X[i, 1:] @ w[1:]') } })
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    await flush()
    expect(screen.getByText(/4 of 4 cases disagree/)).toBeTruthy()
    expect(screen.getAllByText(/intercept never got in/).length).toBe(4)
    fireEvent.change(editor, { target: { value: editor.value.replace('X[i, 1:] @ w[1:]', 'X[i] @ w') } })
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    fireEvent.change(editor, { target: { value: editor.value + '\n# typed while checking' } })
    await flush()
    expect(screen.getByText(/All 4 cases agree/)).toBeTruthy()
    const s = savedState()
    expect(s.steps.fill).toMatchObject({ done: true, attempts: 2, failed: 1 })
    expect(s.code.fill).toMatch(/typed while checking/)
    // Show a solution appears only after two failed checks.
    expect(screen.queryByRole('button', { name: 'Show a solution' })).toBeNull()
  })
  it('a hint marks the step as done with help', async () => {
    FakeWorker.answer = () => ({ ok: true, cases: CASES.map(c => ({ shape: [c.expected.length], value: c.expected, mutated: false })) })
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /5\. Write predict/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }))
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    await flush()
    expect(savedState().steps.implement).toMatchObject({ done: true, unassisted: false, hinted: true })
  })
  it('the repair step is done only after the explanation is chosen', async () => {
    FakeWorker.answer = () => ({ ok: true, cases: CASES.map(c => ({ shape: [c.expected.length], value: c.expected, mutated: false })) })
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /4\. Repair a planted bug/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    await flush()
    expect(savedState().steps.repair.done).toBeUndefined()
    fireEvent.click(screen.getByLabelText(/Floating-point rounding/))
    expect(screen.getByText(/around 1e-16/)).toBeTruthy()
    fireEvent.click(screen.getByLabelText(/The loop started at column 1/))
    expect(savedState().steps.repair.done).toBe(true)
  })
  it('a check that never finishes is stopped after the time limit', async () => {
    vi.useFakeTimers()
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /5\. Write predict/ }))
    const editor = screen.getByLabelText(/Write `predict` from its contract: your code/)
    fireEvent.change(editor, { target: { value: 'while True: pass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(21000) })
    expect(screen.getByText(/Stopped after 20 seconds/)).toBeTruthy()
  })
  it('fresh problems record unassisted success per kind and schedule the first return', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /6\. Solve new tables/ }))
    for (const [t, label] of [['forward', 'Predict a row'], ['missing', 'Find a missing weight']]) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }))
      const p = generate(t, 1)
      const input = document.querySelector('.ml-ladder-problem input[inputmode]')
      fireEvent.change(input, { target: { value: String(p.answer) } })
      fireEvent.submit(input.closest('form'))
    }
    fireEvent.click(screen.getByRole('button', { name: /Find the wrong prediction/ }))
    const p = generate('debug', 1)
    fireEvent.click(screen.getByLabelText(p.answer))
    fireEvent.click(screen.getByLabelText(prediction.bugLabel(p.bug)))
    fireEvent.submit(document.querySelector('.ml-ladder-problem form'))
    await flush()
    const s = savedState()
    expect(s.transfer.map(a => [a.template, a.correct, a.assisted])).toEqual([['forward', true, false], ['missing', true, false], ['debug', true, false]])
    expect(s.review.due).toBeGreaterThan(Date.now())
    expect(within(screen.getByLabelText('Your evidence so far')).getByText(/3 of 3 kinds/)).toBeTruthy()
  })
  it('opening the worked answer is recorded as assisted, and a return done early is marked early', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /7\. Come back later/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Do it now' }))
    fireEvent.click(screen.getByRole('button', { name: 'Show the worked answer' }))
    await flush()
    expect(savedState().review.history[0]).toMatchObject({ assisted: true, correct: false, early: true })
  })
})

// ---- The gradient ladder ------------------------------------------------------------------------
import { gradient, gradientOf, generateGradient, GRADIENT_TEMPLATES, diagnoseGradient, diagnoseStep, evaluateGradientAgree } from './labs/l03-matrices/ladder.js'

describe('gradient ladder: values, generator and diagnosis', () => {
  const cases = gradient.steps.find(s => s.id === 'fill').check.cases
  it('every hand-computed gradient and step matches an explicit loop', () => {
    for (const c of cases) {
      const g = gradientOf(c.X, c.y, c.w)
      g.forEach((v, j) => expect(v).toBeCloseTo(c.grad[j], 9))
      c.step.forEach((v, j) => expect(v).toBeCloseTo(c.w[j] - c.alpha * g[j], 9))
    }
  })
  it('the trace step’s answers follow from the lesson’s table', () => {
    const X = [[1, 1, 1], [1, 2, 4], [1, 3, 2], [1, 4, 3]], y = [6.2, 12.1, 12.8, 17.1], w = [0.5, -1, 3]
    const g = gradientOf(X, y, w), fields = gradient.steps[0].fields.map(f => f.answer)
    expect(fields[0]).toBeCloseTo(3.5 - 12.8, 9)
    g.forEach((v, j) => expect(fields[j + 1]).toBeCloseTo(v, 9))
  })
  it('600 generated problems per kind are well posed and check out independently', () => {
    for (let seed = 1; seed <= 600; seed++) for (const t of GRADIENT_TEMPLATES) {
      const p = generateGradient(t, seed)
      const g = gradientOf(p.xs.map(x => [1, x]), p.ys, [p.b, p.w1])
      g.forEach((v, j) => expect(p.grad[j]).toBeCloseTo(v, 9))
      expect(g.every(v => v !== 0)).toBe(true)
      if (t === 'entry') { expect(p.answer).toBeCloseTo(g[1], 9); p.misconceptions.forEach(m => expect(Math.abs(m.answer - p.answer)).toBeGreaterThan(1e-9)) }
      if (t === 'step') expect(p.answer).toBeCloseTo(p.w1 - p.alpha * g[1], 9)
      if (t === 'debug') {
        const factor = { correct: 1, sign: -1, half: 0.5, sum: p.xs.length / 2 }[p.bug]
        p.shown.forEach((v, j) => expect(v).toBeCloseTo(factor * g[j], 9))
        expect(new Set(p.causes).size).toBe(4)
      }
    }
  })
  it('names plausible gradient mistakes without the fix', () => {
    const c = cases[0]
    expect(diagnoseGradient(c, { shape: [3], value: c.grad.map(v => -v) })).toMatch(/wrong sign/)
    expect(diagnoseGradient(c, { shape: [3], value: c.grad.map(v => v / 2) })).toMatch(/half/)
    expect(diagnoseGradient(c, { shape: [3], value: c.grad.map(v => v * 2) })).toMatch(/not multiplied by 2\/n/)
    expect(diagnoseGradient(c, { shape: [4], value: [0, 0, 0, 0] })).toMatch(/per \*\*row\*\*/)
    expect(diagnoseStep(c, { shape: [3], value: c.w.map((w, j) => w + c.alpha * c.grad[j]) })).toMatch(/uphill/)
    expect(diagnoseStep(c, { shape: [3], value: c.w.map((w, j) => w - c.grad[j]) })).toMatch(/learning rate/)
  })
  it('step 2 fails until the nudge is small enough', () => {
    const v = (value, shape) => ({ value, shape: shape ?? [value.length] })
    const X = v([[1, 1, 1], [1, 2, 4], [1, 3, 2], [1, 4, 3]], [4, 3]), y = v([6.2, 12.1, 12.8, 17.1]), w = v([1, 2, 2]), g = [-2.1, -6.6, -3.75]
    const base = { X, y, w, grad_loop: v(g), grad_matrix: v(g) }
    expect(evaluateGradientAgree({ ...base, eps: v(0.1, []), grad_numeric: v(g.map(x => x + 0.75)) })).toMatchObject({ passed: false, message: expect.stringMatching(/eps = 1e-4/) })
    expect(evaluateGradientAgree({ ...base, eps: v(1e-4, []), grad_numeric: v(g.map(x => x + 0.00075)) }).passed).toBe(true)
  })
})

// ---- Every lab's practice ladders: generic well-posedness checks ----------------------------------
describe('every practice ladder', () => {
  const all = labs.flatMap(lab => Object.entries(lab.ladders ?? {}).map(([name, spec]) => ({ lab: lab.number, name, spec })))
  it('is placed in a lesson of its own lab', () => {
    for (const { lab, name } of all) expect(labs.find(l => l.number === lab).lessons.some(l => (l.blocks ?? []).some(b => b.ladder === name)), `lab ${lab} ${name}`).toBe(true)
  })
  for (const { lab, name, spec } of all) {
    it(`lab ${lab} ${name}: steps are complete and 300 problems of each kind are well posed`, () => {
      expect(spec.steps.map(s => s.kind)).toEqual(expect.arrayContaining(['trace', 'function', 'transfer', 'review']))
      for (const step of spec.steps.filter(s => s.kind === 'function')) {
        expect(step.check.cases.length, step.id).toBeGreaterThanOrEqual(3)
        step.check.cases.forEach(c => expect(c.expected, step.id).toBeDefined())
        expect(step.starter.length).toBeGreaterThan(20)
      }
      for (const step of spec.steps.filter(s => s.kind === 'trace')) step.fields.forEach(f => expect(Number.isFinite(f.answer)).toBe(true))
      for (const t of spec.templates) {
        expect(spec.templateNames[t], t).toBeTruthy()
        for (let seed = 1; seed <= 300; seed++) {
          const p = spec.generate(t, seed), v = spec.view(p)
          expect(v.questions.length, `${t} ${seed}`).toBeGreaterThan(0)
          for (const q of v.questions) {
            if (q.type === 'number') {
              expect(Number.isFinite(q.answer), `${t} ${seed} ${q.id}`).toBe(true)
              ;(q.misconceptions ?? []).forEach(m => expect(Math.abs(m.answer - q.answer), `${t} ${seed} misconception equals answer`).toBeGreaterThan(q.tolerance ?? 1e-6))
            } else {
              const values = q.options.map(o => o.value)
              expect(new Set(values).size, `${t} ${seed} duplicate options`).toBe(values.length)
              expect(new Set(q.options.map(o => o.label)).size, `${t} ${seed} duplicate labels`).toBe(values.length)
              expect(values, `${t} ${seed} answer among options`).toContain(q.answer)
            }
          }
          expect(typeof spec.workedSolution(p)).toBe('string')
        }
      }
    })
  }
})

// ---- Lab 01: one prediction, one gradient step ------------------------------------------------------
import { update as lab01, gradsOf, stepOf, fitOf } from './labs/l01-foundations/ladder.js'
describe('Lab 01 ladder values', () => {
  const byId = id => lab01.steps.find(s => s.id === id)
  it('stored gradients, steps and fits match explicit loops', () => {
    for (const c of byId('fill').check.cases) gradsOf(c.x, c.y, c.w, c.b).forEach((v, j) => expect(c.expected[j]).toBeCloseTo(v, 9))
    for (const c of byId('repair').check.cases) stepOf(c.x, c.y, c.w, c.b, c.alpha).forEach((v, j) => expect(c.expected[j]).toBeCloseTo(v, 9))
    for (const c of byId('implement').check.cases) fitOf(c.x, c.y, c.alpha).forEach((v, j) => expect(c.expected[j]).toBeCloseTo(v, 8))
  })
  it('the trace follows from x = [1, 3], y = [4, 8], w = 1, b = 0, α = 0.05', () => {
    const [dw, db] = gradsOf([1, 3], [4, 8], 1, 0), f = byId('trace').fields.map(x => x.answer)
    expect(f).toEqual([3, 3 - 8, dw, db, 1 - 0.05 * dw])
  })
})

// ---- Lab 02: learn a fill value ---------------------------------------------------------------------
import { fill as lab02, fillOf, prepareOf } from './labs/l02-data/ladder.js'
describe('Lab 02 ladder values', () => {
  it('stored fills and prepared tables match the independent helpers, and the trace follows from the lesson', () => {
    for (const c of lab02.steps.find(s => s.id === 'implement').check.cases) {
      expect(c.fill).toBe(fillOf(c.train))
      expect(c.expected).toEqual(prepareOf(c.train, c.rows))
    }
    const f = lab02.steps[0].fields.map(x => x.answer)
    expect(f).toEqual([(2 + 9 + 4 + 100) / 4, fillOf([2, null, 9, 4, 100]), 6.5, fillOf([2, null, 9, 4, 100, null, 7, 3])])
  })
})

// ---- Lab 04: Bayes’ rule for an alarm ------------------------------------------------------------
import { bayes as lab04, countsOf, posteriorOf } from './labs/l04-probability/ladder.js'
describe('Lab 04 ladder values', () => {
  it('the trace follows from the natural-frequency table', () => {
    const [ta, fa] = countsOf(1000, 0.02, 0.9, 0.05), f = lab04.steps[0].fields
    expect([f[0].answer, f[1].answer, f[2].answer]).toEqual([1000 * 0.02, ta, fa].map(v => Math.round(v * 1e9) / 1e9))
    expect(Math.abs(f[3].answer - posteriorOf(0.02, 0.9, 0.05))).toBeLessThanOrEqual(f[3].tolerance)
    expect(ta / (ta + fa)).toBeCloseTo(posteriorOf(0.02, 0.9, 0.05), 12)
  })
})

// ---- Lab 05: a 95% interval --------------------------------------------------------------------------
import { interval as lab05, sdOf, intervalOf, coverageOf } from './labs/l05-statistics/ladder.js'
describe('Lab 05 ladder values', () => {
  it('the trace, the interval cases and the coverage cases follow from independent helpers', () => {
    const x = [30, 28, 35, 31, 26], f = lab05.steps[0].fields
    const vals = [30, sdOf(x), sdOf(x) / Math.sqrt(5), intervalOf(x)[0]]
    f.forEach((fl, i) => expect(Math.abs(fl.answer - vals[i])).toBeLessThanOrEqual(fl.tolerance ?? 1e-9))
    for (const c of lab05.steps.find(s => s.id === 'implement').check.cases) expect(c.expected).toBeCloseTo(coverageOf(c.ivs, c.mu), 12)
  })
})

// ---- Lab 06: honest splits ---------------------------------------------------------------------------
import { split as lab06, overlapOf, scaleOf, maskOf } from './labs/l06-evaluation/ladder.js'
describe('Lab 06 ladder values', () => {
  it('stored cases follow from independent helpers', () => {
    const byId = id => lab06.steps.find(s => s.id === id).check.cases
    for (const c of byId('fill')) expect(c.expected).toEqual(maskOf(c.groups, c.test))
    for (const c of byId('repair')) c.expected.forEach((v, i) => expect(v).toBeCloseTo(scaleOf(c.train, c.test)[i], 12))
    for (const c of byId('implement')) expect(c.expected).toBeCloseTo(overlapOf(c.trainG, c.testG), 12)
    expect(lab06.steps[0].fields.map(f => f.answer)).toEqual([100 / 5, 100 - 100 / 5, 100 / 5, 0])
  })
})

// ---- Lab 07: shrink, zero, choose λ ---------------------------------------------------------------------
import { shrink as lab07, ridge1dOf, softOf, ridgeOf } from './labs/l07-regularization/ladder.js'
describe('Lab 07 ladder values', () => {
  it('the trace follows from the helpers, and the ridge solver agrees with NumPy on the stored case', () => {
    const f = lab07.steps[0].fields
    const vals = [29, 14, ridge1dOf([1, 2, 3], [2, 3, 7], 1), softOf(-2.5, 1)]
    f.forEach((fl, i) => expect(Math.abs(fl.answer - vals[i])).toBeLessThanOrEqual(fl.tolerance ?? 1e-12))
    ridgeOf([[1, 2], [2, 1], [3, 4], [4, 3]], [5, 4, 11, 10], 0.1).forEach((v, j) => expect(v).toBeCloseTo([1.0730593607, 1.9063926941][j], 9))   // np.linalg.solve
  })
})

// ---- Lab 08: logistic regression ----------------------------------------------------------------------
import { logistic as lab08, sigma, lossOf, gradOf } from './labs/l08-logistic/ladder.js'
describe('Lab 08 ladder values', () => {
  it('the trace follows from the helpers, which agree with NumPy', () => {
    const p = sigma(0.5), f = lab08.steps[0].fields
    ;[0.5, p, -Math.log(p), (p - 1) * 2].forEach((v, i) => expect(Math.abs(f[i].answer - v)).toBeLessThanOrEqual(f[i].tolerance ?? 1e-12))
    expect(lossOf([[100, 0], [-100, 0]], [0, 1], [1, 0], 0)).toBeCloseTo(100, 9)
    gradOf([[1, 0], [0, 1], [1, 1]], [1, 0, 1], [1, -1], 0).forEach((v, j) => expect(v).toBeCloseTo([-0.2563138071, -0.0770195262, -0.1666666667][j], 9))
  })
})

// ---- Lab 09: thresholds -----------------------------------------------------------------------------
import { threshold as lab09, countsOf as counts09, bestOf } from './labs/l09-metrics/ladder.js'
describe('Lab 09 ladder values', () => {
  it('the trace follows from the confusion counts; the threshold cases match NumPy', () => {
    const y = [1, 0, 1, 1, 0, 0], a = [0.9, 0.8, 0.6, 0.4, 0.3, 0.1].map(s => (s >= 0.5 ? 1 : 0)), [tp, fp, fn] = counts09(y, a), f = lab09.steps[0].fields
    ;[tp, fp, tp / (tp + fp), tp / (tp + fn)].forEach((v, i) => expect(Math.abs(f[i].answer - v)).toBeLessThanOrEqual(f[i].tolerance ?? 0))
    expect(lab09.steps.find(s => s.id === 'implement').check.cases.map(c => c.expected)).toEqual([0.4, 0.9, 0.5, 0.3])    // np.unique + argmin
    expect(bestOf([1, 1, 0], [0.3, 0.6, 0.2], 1, 5)).toBe(0.3)
  })
})

// ---- Lab 10: k-NN --------------------------------------------------------------------------------------
import { knn as lab10, distOf, shareOf, TIE_CHECK } from './labs/l10-knn/ladder.js'
describe('Lab 10 ladder values', () => {
  it('no check case has a tie at the k-th neighbour, and the trace follows from the helpers', () => {
    for (const c of TIE_CHECK) {
      const d = c.X.map(x => distOf(x, c.q)).sort((a, b) => a - b)
      if (c.k < d.length) expect(d[c.k] - d[c.k - 1], `q ${c.q} k ${c.k}`).toBeGreaterThan(1e-9)
    }
    const f = lab10.steps[0].fields, q = [2, 2]
    ;[distOf([1, 1], q), distOf([3, 2], q), distOf([2, 2.5], q), shareOf([[1, 1], [2, 4], [3, 2], [2, 2.5]], [1, 0, 0, 1], q, 3)].forEach((v, i) => expect(Math.abs(f[i].answer - v)).toBeLessThanOrEqual(f[i].tolerance ?? 1e-12))
  })
})

// ---- Lab 11: Naive Bayes -------------------------------------------------------------------------------
import { nb as lab11, smoothOf, logOddsOf } from './labs/l11-naive-bayes/ladder.js'
describe('Lab 11 ladder values', () => {
  it('the trace follows from the helpers, and the log-odds cases match NumPy', () => {
    const p1 = 9 / 300, p0 = 3 / 400, f = lab11.steps[0].fields
    ;[p1, p0, Math.log(p1 / p0), 1 / (1 + p0 / p1)].forEach((v, i) => expect(Math.abs(f[i].answer - v)).toBeLessThanOrEqual(f[i].tolerance))
    expect(lab11.steps.find(s => s.id === 'implement').check.cases.map(c => Math.round(c.expected * 1e9) / 1e9)).toEqual([1.544899391, -1.098612289, -4.394449155, 2.197224577])
    expect(smoothOf([8, 0, 2], 1).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
  })
})

// ---- Lab 12: Decision trees ----------------------------------------------------------------------------
import { split as lab12, giniOf, splitsOf, SPLIT_CASES } from './labs/l12-trees/ladder.js'
describe('Lab 12 ladder values', () => {
  it('the trace and repair prompt follow from the helpers; every best split is unique and matches NumPy', () => {
    const f = lab12.steps[0].fields
    expect(f.map(x => x.answer)).toEqual([0.6, giniOf([0, 0, 1, 1, 1]), 0, giniOf([0, 0, 1, 1, 1])])
    expect(giniOf([0, 0, 1, 1, 1])).toBeCloseTo(0.48, 12)
    expect(SPLIT_CASES.map(c => c.expected.map(v => Math.round(v * 1e6) / 1e6))).toEqual([[2.5, 0.16875], [2.5, 0.5], [1.5, 0.444444], [45, 0.111111]])
    for (const c of SPLIT_CASES) {
      const g = splitsOf(c.x, c.y).map(s => s.gain).sort((a, b) => b - a)
      expect(g[0] - g[1]).toBeGreaterThan(0.05)
    }
    const P = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1], L = [0], R = [0, 0, 0, 0, 1, 1, 1, 1, 1]
    expect((giniOf(P) - (giniOf(L) + giniOf(R)) / 2).toFixed(3)).toBe('0.253')
    expect((giniOf(P) - (giniOf(L) + 9 * giniOf(R)) / 10).toFixed(3)).toBe('0.056')
  })
})

// ---- Lab 13: Bagging and random forests ----------------------------------------------------------------
import { bag as lab13, avgVarOf, leftOutOf, OOB_CASES } from './labs/l13-forests/ladder.js'
describe('Lab 13 ladder values', () => {
  it('the trace and repair prompt follow from the helpers; out-of-bag cases match NumPy', () => {
    const f = lab13.steps[0].fields
    expect(Math.abs(f[0].answer - avgVarOf(4, 0.25, 10))).toBeLessThan(1e-12)
    expect(f[1].answer).toBe(0.25 * 4)
    expect(Math.abs(f[2].answer - leftOutOf(3))).toBeLessThan(1e-12)
    expect(avgVarOf(2, 0.5, 4)).toBe(1.25)
    expect(OOB_CASES.map(c => c.expected)).toEqual([[4, 4, 3], [1, 3], [1, 2, 2, 1.5], [3.25, -0.5, -0.5]])
    for (const c of OOB_CASES) c.preds[0].forEach((_, i) => expect(c.inbag.some(r => r[i] === 0)).toBe(true))
  })
})

// ---- Lab 14: Boosting ----------------------------------------------------------------------------------
import { boost as lab14, boostOf, bestStageOf, firstBumpOf, BOOST_CASES } from './labs/l14-boosting/ladder.js'
describe('Lab 14 ladder values', () => {
  it('the trace and repair prompt follow from the helpers; boosting cases match NumPy', () => {
    expect(lab14.steps[0].fields.map(f => f.answer)).toEqual([6, -3, -2, boostOf([1, 2, 3], [3, 5, 10], 2.5, 0.5, 1)[0]])
    const e = [0.5, 0.45, 0.46, 0.40, 0.41]
    expect([firstBumpOf(e), bestStageOf(e)]).toEqual([2, 4])
    expect(BOOST_CASES.map(c => c.expected.map(v => Math.round(v * 1e6) / 1e6))).toEqual([
      [1.25, 1.25, 2.75, 2.75], [4.18098, 4.18098, 4.18098, 6.22853, 6.22853], [5, 0.5, 0.5],
      [0.773517, 0.773517, 3.559817, 0.773517, 3.559817, 3.559817]])
  })
})

// ---- Lab 15: Support vector machines -------------------------------------------------------------------
import { hinge as lab15, hingeOf, subgradOf, RBF_CASES } from './labs/l15-svm/ladder.js'
describe('Lab 15 ladder values', () => {
  it('the trace and repair prompt follow from the helpers; kernel cases match scikit-learn', () => {
    const w = [3, 4], b = -5
    expect(lab15.steps[0].fields.map(f => f.answer)).toEqual([8, 8 / 5, ...hingeOf([[3, 1], [1, 0.5]], [1, 1], w, b), 2 / 5])
    const c = [[1, 1], -1, [[1, 2], [2, 0], [0, 0]], [1, -1, 1], 0.1]
    expect(subgradOf(...c).map(v => Math.round(v * 1000) / 1000)).toEqual([0.767, 0.1])
    expect(subgradOf(...c, false).map(v => Math.round(v * 1000) / 1000)).toEqual([0.433, -0.567])
    expect(RBF_CASES.map(k => k.expected.map(r => r.map(v => Math.round(v * 1e6) / 1e6)))).toEqual([
      [[1, 0.606531, 0.018316], [0.367879, 0.606531, 0.367879]], [[1, 0.018316]], [[0.904837], [0.67032]],
      [[1, 0.018316], [0.000045, 0.000045], [0.018316, 1]]])
  })
})

// ---- Lab 16: Capstone (build durations) ----------------------------------------------------------------
import { oof as lab16, maeOf, rmseOf, oofOf, OOF_CASES, SEG_CASES } from './labs/l16-capstone/ladder.js'
describe('Lab 16 ladder values', () => {
  it('the trace and repair prompt follow from the helpers; out-of-fold cases match numpy.polyfit', () => {
    const f = lab16.steps[0].fields
    expect(f[0].answer).toBe(maeOf([80, 90, 70], [100, 90, 60]))
    expect(Math.abs(f[1].answer - rmseOf([80, 90, 70], [100, 90, 60]))).toBeLessThan(1e-12)
    expect([f[2].answer, f[3].answer]).toEqual([(2 + 4 + 6 + 8 + 30) / 5, (2 + 4 + 6 + 8) / 4])
    const c = OOF_CASES[1]
    expect([maeOf(c.y, oofOf(c.x, c.y, c.folds, false)), maeOf(c.y, c.expected)].map(v => Math.round(v * 1e6) / 1e6)).toEqual([1.65, 7.5])
    expect(OOF_CASES.map(k => k.expected.map(v => Math.round(v * 1e6) / 1e6))).toEqual([
      [1.45, 3.884615, 6.25, 7.75, 10.115385, 12.55], [-14, -6, 5, 7], [1, 5.75, 5, 14.25, 9], [1.75, 3.038462, 4.25, 6.25, 6.961538, 9.95]])
    expect(SEG_CASES.map(k => k.expected)).toEqual([[2, 5], [3, 0, 30], [0, 1], [0.5, 15, 3.5]])
  })
})

// ---- Lab 17: Clustering --------------------------------------------------------------------------------
import { kmeans as lab17, assignOf, updateOf, silhouetteOf, SIL_CASES } from './labs/l17-clustering/ladder.js'
describe('Lab 17 ladder values', () => {
  it('the trace and repair prompt follow from the helpers; silhouettes match scikit-learn', () => {
    const X = [[1], [2], [3], [10], [11], [12]], lab = assignOf(X, [[2], [6]]), C = updateOf(X, lab, 2)
    const inertia = X.reduce((s, x, i) => s + (x[0] - C[lab[i]][0]) ** 2, 0)
    expect(lab17.steps[0].fields.map(f => f.answer)).toEqual([lab.filter(l => l === 1).length, C[1][0], inertia, silhouetteOf(X, lab)[2]])
    expect(updateOf([[1, 2], [3, 4], [10, 0], [12, 2]], [0, 0, 1, 1], 2)).toEqual([[2, 3], [11, 1]])
    expect(SIL_CASES.map(c => c.expected.map(v => Math.round(v * 1e6) / 1e6))).toEqual([
      [0.85, 0.888889, 0.8125, 0.8125, 0.888889, 0.85], [0.858491, 0.852128, -0.33935, -0.189306, 0.237048],
      [0.834162, 0.773459, 0.777101, 0.808391, 0.832317], [0.833333, 0.8, -0.444444, 0.615385, 0.6]])
  })
})

// ---- Lab 18: PCA ---------------------------------------------------------------------------------------
import { pca as lab18, reconstructOf, REC_CASES, SHARE_CASES } from './labs/l18-pca/ladder.js'
describe('Lab 18 ladder values', () => {
  it('the trace and repair prompt follow from the definitions; reconstructions and shares match NumPy', () => {
    const u = [0.6, 0.8], x = [2, 4], z = u[0] * x[0] + u[1] * x[1]
    const f = lab18.steps[0].fields.map(v => v.answer)
    expect(f.map(v => Math.round(v * 1e9) / 1e9)).toEqual([z, z * u[0], x[0] ** 2 + x[1] ** 2 - z * z, 6 / 10].map(v => Math.round(v * 1e9) / 1e9))
    expect(reconstructOf(REC_CASES[0].X, 1, false)[0].map(v => Math.round(v * 100) / 100)).toEqual([-2.78, -3.19])
    expect(REC_CASES.map(c => c.expected.map(r => r.map(v => Math.round(v * 1e5) / 1e5)))).toEqual([
      [[2.21642, 0.81108], [4.07214, 2.93703], [5.43244, 4.49542], [8.27899, 7.75647]],
      [[4.7921, -0.25717], [2.60476, 1.5111], [1.88414, 2.09367], [-1.281, 4.65241]],
      [[10.98499, 11.55472], [11.15467, 11.93008], [12.62011, 15.17173], [12.03909, 13.88646], [13.20114, 16.457]],
      [[1, 2], [3, 1], [2, 5]]])
    expect(SHARE_CASES.map(c => c.expected.map(v => Math.round(v * 1e6) / 1e6))).toEqual([[0.982687, 0.017313], [0.941176, 0.058824], [0.953983, 0.046017], [0.84597, 0.15403]])
  })
})

// ---- Lab 19: Time series -------------------------------------------------------------------------------
import { forecast as lab19, acfOf, seasonalIndexOf, ROW_CASES } from './labs/l19-timeseries/ladder.js'
describe('Lab 19 ladder values', () => {
  it('the trace and repair prompt follow from the helpers; lag tables match NumPy', () => {
    expect(lab19.steps[0].fields.map(f => f.answer)).toEqual([200, seasonalIndexOf(200, 5, 24), 200 - 5, acfOf([1, 3, 2, 4], 1)])
    expect(acfOf([1, 3, 2, 4], 1)).toBeCloseTo(-0.35, 12)
    expect([seasonalIndexOf(50, 30, 24), 50 + 30 - 24]).toEqual([32, 56])
    expect(ROW_CASES.map(c => c.expected)).toEqual([
      [[11, 10, 12], [12, 11, 13], [13, 12, 14], [14, 13, 15]], [[8, 5, 9], [1, 3, 2], [9, 8, 7]], [[4, 3, 1, 7], [5, 4, 2, 8]], [[4, 6], [4, 6], [6, 8]]])
  })
  it('passes integer lists named in `ints` as integer arrays', () => {
    const code = buildCheck('def f(lags):\n    return lags.dtype.kind', { fn: 'f', args: ['lags'], ints: ['lags'], cases: [{ lags: [0, 2], expected: 0 }] })
    expect(code).toContain("_np.array(a, dtype=int) if isinstance(a, list) else int(a)")
  })
})

describe('prerequisite review link', () => {
  it('the prediction ladder offers Lab 01’s weighted-sum lesson and opens it', () => {
    const onReview = vi.fn()
    render(<Ladder name="prediction" spec={prediction} saved={{}} onUpdate={() => {}} onReview={onReview} />)
    fireEvent.click(screen.getByRole('button', { name: /Review weighted sums in Lab 01/ }))
    expect(onReview).toHaveBeenCalledWith(1, 0)
    cleanup()
    render(<Ladder name="prediction" spec={prediction} saved={{}} onUpdate={() => {}} />)
    expect(screen.queryByRole('button', { name: /Review weighted sums/ })).toBeNull()
  })
})

// ---- Lab 20: Backpropagation ---------------------------------------------------------------------------
import { backprop as lab20, chainOf, NEURON_CASES } from './labs/l20-backprop/ladder.js'
describe('Lab 20 ladder values', () => {
  it('the trace follows from the helper; neuron gradients match NumPy', () => {
    const ch = chainOf(1, 2, -4)
    expect(lab20.steps[0].fields.map(f => f.answer)).toEqual([ch.e, ch.L, ch.gE, ch.gA, ch.gC])
    expect(chainOf(2, -3, 10)).toMatchObject({ gA: -24, gB: 16, gC: 8 })
    expect(NEURON_CASES.map(c => c.expected.map(v => Math.round(v * 1e6) / 1e6))).toEqual([
      [1.415584, 0, 0.707792], [-2.299757, -4.599515, -2.299757], [0.690437, 2.301458], [-0.79271, 1.585421, -0.396355, -0.79271]])
  })
})

// ---- Lab 21: A neural network in NumPy ----------------------------------------------------------------
import { mlp as lab21, nParams, softmaxOf, DELTA_CASES } from './labs/l21-mlp/ladder.js'
describe('Lab 21 ladder values', () => {
  it('the trace follows from the helpers; hidden deltas match NumPy', () => {
    const p = [0.7, 0.2, 0.1]
    expect(lab21.steps[0].fields.map(f => f.answer)).toEqual([3 * 4, nParams([3, 4, 2]), 5 * 4, p[1] - 1, p[0]])
    expect(nParams([2, 8, 2])).toBe(42)
    expect(softmaxOf([2, 1, 0]).map(v => Math.round(v * 1000) / 1000)).toEqual([0.665, 0.245, 0.09])
    expect(DELTA_CASES.map(c => c.expected)).toEqual([[[-1, 0, -1]], [[0.1, 0], [0, -0.4]], [[1, -1, 0], [0, -0.5, 1], [-0.5, 0.5, -1]], [[6, 0]]])
  })
})

// ---- Lab 22: Optimization ------------------------------------------------------------------------------
import { optim as lab22, adamUpdateOf, clipOf, ADAM_CASES } from './labs/l22-optimization/ladder.js'
describe('Lab 22 ladder values', () => {
  it('the trace follows from the rules; Adam cases match NumPy', () => {
    let v = 0; const vs = [1, 1, -1].map(g => (v = 0.9 * v + g))
    const f = lab22.steps[0].fields.map(x => x.answer)
    expect(f.slice(0, 2).map(x => Math.round(x * 1e9) / 1e9)).toEqual(vs.slice(1).map(x => Math.round(x * 1e9) / 1e9))
    expect(Math.abs(f[2] - adamUpdateOf(5, 0, 0, 1, 0.01)[0])).toBeLessThan(1e-6)
    expect(f.slice(3)).toEqual([0.2 * 0.5 * (1 + Math.cos(Math.PI / 2)) > 0.0999 ? 0.1 : NaN, 1024 / 32])
    expect(clipOf([6, 8], 5)).toEqual([3, 4])
    expect(ADAM_CASES.map(c => c.expected.map(x => Math.round(x * 1e6) / 1e6))).toEqual([[0.1, 0.2, 0.004], [0.1, 0.38, 0.007996], [0.001197, 0.35, 0.2008], [-0.002709, -0.06, 0.05004]])
  })
})

// ---- Lab 23: PyTorch conventions -----------------------------------------------------------------------
import { torch as lab23, trainOf, TRAIN_CASES } from './labs/l23-pytorch/ladder.js'
describe('Lab 23 ladder values', () => {
  it('the trace and repair prompt follow from the helpers; training cases match NumPy', () => {
    expect(lab23.steps[0].fields.map(f => f.answer)).toEqual([2, 3 * 2 + 2, 2 * 8, 4 * 2, 1 / (1 - 0.25)])
    expect(trainOf([-1, 0, 1, 2], [-4, -1, 2, 5], 50, 0.05, false).map(v => Math.round(v * 1000) / 1000)).toEqual([3.714, 1.554])
    expect(TRAIN_CASES.map(c => c.expected.map(v => Math.round(v * 1e4) / 1e4))).toEqual([[2.9643, -0.9425], [0.0846, 0.8826], [-0.3941, 0], [1.7293, 0.6151]])
  })
})

// ---- Lab 24: Convolution -------------------------------------------------------------------------------
import { conv as lab24, xcorrOf, outSizeOf, XCORR_CASES } from './labs/l24-convolution/ladder.js'
describe('Lab 24 ladder values', () => {
  it('the trace and repair prompt follow from the helpers; cross-correlations match NumPy', () => {
    const o = xcorrOf([[1, 2, 0], [0, 1, 3], [2, 1, 0]], [[1, 0], [0, -1]])
    expect(lab24.steps[0].fields.map(f => f.answer)).toEqual([o[0][0], o[0][1], o[1][1], outSizeOf(9, 3, 2, 1), 3 * 3 * 3 * 8 + 8])
    expect(xcorrOf([[1, 2, 0], [0, 1, 3], [2, 1, 0]], [[1, 0], [0, -1]], true)).toEqual([[0, 1], [1, -1]])
    expect(XCORR_CASES.map(c => c.expected)).toEqual([[[0, -1], [-1, 1]], [[4, 4]], [[44, 54, 64], [84, 94, 104], [124, 134, 144]], [[2]]])
  })
})

// ---- Lab 25: Sequences ---------------------------------------------------------------------------------
import { rnn as lab25, rnnStatesOf, MASK_CASES } from './labs/l25-sequences/ladder.js'
describe('Lab 25 ladder values', () => {
  it('the trace follows from the recurrence; masked RNN cases match NumPy and ignore pads', () => {
    const f = lab25.steps[0].fields.map(x => x.answer)
    const h = rnnStatesOf([[1], [0], [2]].map((_, i) => i), [[1], [0], [2]], [[1]], [[0.5]]).map(v => v[0])
    expect(f.slice(0, 3).map(v => Math.round(v * 1e4) / 1e4)).toEqual(h.map(v => Math.round(v * 1e4) / 1e4))
    expect(f.slice(3)).toEqual([40, 4])
    expect(MASK_CASES.map(c => c.expected.map(v => Math.round(v * 1e6) / 1e6))).toEqual([[0.371254, 0.437793], [0.673781, -0.046897], [0.336376, 0.244919], [0.564213, 0.248907]])
  })
})

// ---- Lab 26: Attention ---------------------------------------------------------------------------------
import { attn as lab26, attentionOf, ATT_CASES } from './labs/l26-attention/ladder.js'
describe('Lab 26 ladder values', () => {
  it('the trace follows from attention; cases match NumPy', () => {
    const f = lab26.steps[0].fields.map(x => x.answer)
    const out = attentionOf([[1, 0]], [[1, 0], [0, 1]], [[4], [8]], { scale: false })[0][0]
    expect(Math.abs(f[1] - out)).toBeLessThan(1e-12)
    expect(Math.abs(f[2] - attentionOf([[1, 0, 0, 0]], [[1, 0, 0, 0], [0, 0, 0, 0]], [[1], [0]])[0][0])).toBeLessThan(1e-12)
    expect(f.slice(3)).toEqual([10, 64])
    expect(ATT_CASES.map(c => c.expected.map(r => r.map(v => Math.round(v * 1e6) / 1e6)))).toEqual([
      [[3, 4], [2.712068, 3.712068], [2.593327, 3.593327]], [[18.222059]], [[0.892958, 0.214084, 0.892958], [0.669762, 0.660477, 0.669762]], [[6]]])
  })
})

// ---- Lab 27: Deep-learning investigation ---------------------------------------------------------------
import { invest as lab27, ablationOf, convMacsOf, recallOf } from './labs/l27-dl-capstone/ladder.js'
describe('Lab 27 ladder values', () => {
  it('the trace and repair prompt follow from the helpers', () => {
    const [mean, lo] = ablationOf([0.84, 0.85, 0.83], [0.80, 0.83, 0.82])
    const f = lab27.steps[0].fields.map(x => x.answer)
    expect(Math.abs(f[0] - mean)).toBeLessThan(1e-12); expect(Math.abs(f[1] - lo)).toBeLessThan(1e-12)
    expect(f.slice(2)).toEqual([convMacsOf(3, 1, 8, 8, 8), 256 * 10 + 10, 18 / 20])
    expect(recallOf([[45, 5], [10, 40]])).toEqual([0.9, 0.8])
  })
})

// ---- Lab 28: Data contracts ----------------------------------------------------------------------------
import { contract as lab28, badShareOf, zOf, Q_CASES } from './labs/l28-contracts/ladder.js'
describe('Lab 28 ladder values', () => {
  it('the trace and repair prompt follow from the helpers; quantile cases match NumPy', () => {
    const share = badShareOf([4, 9, 9, 17, 30], 50)
    expect(lab28.steps[0].fields.map(f => f.answer)).toEqual([4, share, 50 - 4, zOf(Array(36).fill(45), 60, 30), 64])
    expect(zOf([35, 35, 35, 35], 50, 40)).toBe(-0.75)
    expect(Q_CASES.map(c => c.expected)).toEqual([0.4, 1 / 3, 1, 0.5])
  })
})

// ---- Lab 29: Serving -----------------------------------------------------------------------------------
import { serve as lab29, capacityOf, BATCH_CASES } from './labs/l29-serving/ladder.js'
import { SERVE } from './labs/l29-serving/serve.js'
describe('Lab 29 ladder values and the local service', () => {
  it('the trace follows from the capacity formula; batch choices are as checked', () => {
    expect(lab29.steps[0].fields.map(f => f.answer)).toEqual([capacityOf(1, 8, 2), capacityOf(4, 8, 2), 60 / capacityOf(1, 8, 2), 0.5])
    expect(BATCH_CASES.map(c => c.expected)).toEqual([1, 3, 0, 1])
  })
  it('serve.py serves /v1/predict with the standard library and has a self-check', () => {
    expect(SERVE).toMatch(/ThreadingHTTPServer/)
    expect(SERVE).toMatch(/"--check"/)
    expect(SERVE).toMatch(/Request body must be a JSON object/)
  })
})

// ---- Lab 30: Monitoring --------------------------------------------------------------------------------
import { monitor as lab30, psiOf, errorAlertDayOf, DELAY_CASES } from './labs/l30-monitoring/ladder.js'
describe('Lab 30 ladder values', () => {
  it('the trace follows from the helpers; delayed alert days are as checked', () => {
    const f = lab30.steps[0].fields
    expect(Math.abs(f[0].answer - psiOf([0.5, 0.5], [0.6, 0.4]))).toBeLessThan(1e-4)
    const bad = Array.from({ length: 60 }, (_, i) => (i >= 30 ? 1 : 0))
    expect([f[1].answer, f[2].answer]).toEqual([errorAlertDayOf(bad, 0.5, 3, 0), errorAlertDayOf(bad, 0.5, 3, 5)])
    expect(f[3].answer).toBeCloseTo(365 * 0.01, 9)
    expect(DELAY_CASES.map(c => c.expected)).toEqual([33, 26, 47, -1, 6])
    expect(Math.round(psiOf([0.5, 0.5], [0.7, 0.3]) * 1e4) / 1e4).toBe(0.1695)
  })
})

// ---- Lab 31: Responsible decisions ---------------------------------------------------------------------
import { audit as lab31, wilsonOf, WILSON_CASES } from './labs/l31-responsible/ladder.js'
describe('Lab 31 ladder values', () => {
  it('the trace follows from the counts; Wilson cases match the formula checked in Python', () => {
    expect(lab31.steps[0].fields.map(f => f.answer)).toEqual([45 / 60, 10 / 140, 45 / 55, 55 / 200])
    expect(wilsonOf(21, 30).map(v => Math.round(v * 1000) / 1000)).toEqual([0.521, 0.833])
    expect(WILSON_CASES).toHaveLength(4)
  })
})

// ---- Lab 32: Retraining & delivery ---------------------------------------------------------------------
import { release as lab32, ROLLBACK_CASES, rollbackDayOf } from './labs/l32-delivery/ladder.js'
describe('Lab 32 ladder values', () => {
  it('the trace follows from its numbers; rollback cases are as checked', () => {
    expect(lab32.steps[0].fields.map(f => f.answer)).toEqual([0.1, 0.125, 0, 5])
    expect(Math.abs(1 - 10.8 / 12 - 0.1)).toBeLessThan(1e-12)
    expect(ROLLBACK_CASES.map(c => c.expected)).toEqual([1, -1, 4, 0, -1])
    expect(rollbackDayOf([12.1, 11.5, 12.9, 14.6], [3.2, 8.8, 14.1, 7.1], 0.05, 1)).toBe(2)
  })
})

// ---- Lab 33: Final project -----------------------------------------------------------------------------
import { capstone as lab33, SPLIT_CASES as SPLITS33, decideOf } from './labs/l33-final/ladder.js'
import { APP } from './labs/l33-final/app.js'
describe('Lab 33 ladder values and the end-to-end application', () => {
  it('the trace follows from its numbers; splits match np.array_split', () => {
    const d = [4.1, 3.8, 5.0, -0.4, -0.6]
    expect(lab33.steps[0].fields.map(f => f.answer)).toEqual([2.38, 3, 2400, decideOf(0.9, 2.38, 2)])
    expect(Math.abs(d.reduce((a, b) => a + b, 0) / 5 - 2.38)).toBeLessThan(1e-12)
    expect(SPLITS33[2].expected).toEqual([[10, 20], [20, 30], [30, 39], [39, 48]])
    expect(decideOf(26.32, 29.86, 30)).toBe(3)
  })
  it('buildtime_app.py covers data, evidence, serving and monitoring, with a self-check', () => {
    for (const s of ['def train(', 'def serve(', 'def monitor(', 'def check(', 'MIN_IMPROVEMENT_S = 2.0', 'ThreadingHTTPServer', 'model_card.md']) expect(APP).toContain(s)
  })
})

// ---- Lab 34: Retrieval & LLM apps ----------------------------------------------------------------------
import { retrieval as lab34, RR_CASES, recallAtKOf } from './labs/l34-retrieval/ladder.js'
describe('Lab 34 ladder values', () => {
  it('the trace follows from the formulas; reciprocal ranks are as checked', () => {
    const f = lab34.steps[0].fields.map(x => x.answer)
    expect(f[0]).toBeCloseTo(Math.log(12 / 3), 12)
    expect(f[1]).toBeCloseTo(0.6 * 0.8, 12)
    expect(f[2]).toBe(recallAtKOf(['a', 'x', 'y'], ['a', 'b'], 3))
    expect(f[3]).toBeCloseTo((1 + 1 / 2 + 1 / 4) / 3, 12)
    expect(RR_CASES.map(c => c.expected)).toEqual([1 / 3, 1, 0, 0.5])
  })
})

// ---- Lab 35: Recommender systems -----------------------------------------------------------------------
import { recsys as lab35, NDCG_CASES, cosineOf } from './labs/l35-recsys/ladder.js'
describe('Lab 35 ladder values', () => {
  it('the trace follows from the formulas; NDCG cases are as checked', () => {
    expect(lab35.steps[0].fields.map(f => f.answer)).toEqual([3 / Math.sqrt(9 * 16), 0.5 + 0.3, 1 / Math.log2(4), 0.9])
    expect(cosineOf([1, 1, 0], [1, 0, 1])).toBeCloseTo(0.5, 12)
    expect(NDCG_CASES.map(c => c.expected)).toEqual([1, 0.5, 0, 0])
  })
})

// ---- Lab 36: Causal inference --------------------------------------------------------------------------
import { causal as lab36, sampleSizeOf, DIFF_CASES } from './labs/l36-causal/ladder.js'
import { sampleSize as engineSampleSize } from './labs/l36-causal/engine.js'
describe('Lab 36 ladder values', () => {
  it('the trace follows from the formulas; the sample size matches the engine; intervals are as checked', () => {
    expect(lab36.steps[0].fields.map(f => f.answer)).toEqual([2.1, 5, Math.ceil(2 * 2.8 ** 2 * 4 / 0.25), 1])
    expect(sampleSizeOf(2.5, 0.3)).toBe(engineSampleSize(2.5, 0.3))
    expect(DIFF_CASES[0].expected.map(v => Math.round(v * 1000) / 1000)).toEqual([3, 1.4, 4.6])
  })
})

// ---- Lab 38: Research replication ----------------------------------------------------------------------
import { replicate as lab38, PLAN_CASES, verdictOf } from './labs/l38-replication/ladder.js'
describe('Lab 38 ladder values', () => {
  it('the trace follows from its numbers; budget plans are as checked in Python', () => {
    const f = lab38.steps[0].fields.map(x => x.answer)
    expect(f[0]).toBe(2 + 20 + 40 + 32 + 20 - 100)
    expect(f[1]).toBeCloseTo(0.0447, 4)
    expect(f[2]).toBe(3.5)
    expect(f[3]).toBe(verdictOf(5, 2.1, 4.0))
    expect(PLAN_CASES.map(c => c.expected)).toEqual([[0, 1, 3, 4], [1, 2], [], [0, 1, 2]])
  })
})
