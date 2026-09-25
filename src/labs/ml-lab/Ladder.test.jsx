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
