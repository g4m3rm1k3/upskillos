// @vitest-environment happy-dom
// "Run" (not graded): prints and console.log output, solve's return value, errors with the learner's
// line number, in both languages; and the challenge panel that uses it, with "Open in CodeLens".
import React from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { loadPyodide } from 'pyodide'
import { runJavaScriptCases, runJavaScriptScratch, runPythonScratch } from './runtime/checks.js'
import { pyLiteral, traceProgram } from './codelens.js'

// The page's worker, replaced by the same functions run in place (JavaScript only).
vi.mock('./runtime/runner.js', () => ({
  startAttempt: ({ code, cases, mode, args, onDone }) => {
    onDone(mode === 'run' ? runJavaScriptScratch(code, args) : runJavaScriptCases(code, cases))
    return () => {}
  },
}))
const { Practice } = await import('./Lesson.jsx')
const { LESSONS } = await import('./lessons/index.js')

afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear() })

describe('Run in JavaScript', () => {
  it('captures console.log in order and shows what solve returned', () => {
    const r = runJavaScriptScratch('console.log("top")\nfunction solve(a, b) { console.log("a is", a, [b]); return a + b }', [2, 3])
    expect(r.output).toBe('top\na is 2 [3]\n')
    expect(r).toMatchObject({ called: true, returned: '5' })
  })
  it('names the line of an error in the learner’s own code', () => {
    const r = runJavaScriptScratch('function solve(n) {\n  let x = 1\n  return y\n}', [1])
    expect(r.error).toBe('ReferenceError: y is not defined (line 3)')
  })
  it('shows values a check would refuse, such as undefined', () => {
    expect(runJavaScriptScratch('function solve() {}', []).returned).toBe('undefined')
  })
  it('says so when there is no solve to call', () => {
    expect(runJavaScriptScratch('console.log(1)', [1]).error).toMatch(/no function named solve/)
  })
})

describe('Run in Python', () => {
  let py
  beforeAll(async () => { py = await loadPyodide() }, 120000)
  it('captures print output and shows repr of what solve returned', async () => {
    const r = await runPythonScratch(py, 'print("top")\ndef solve(a, b):\n    print("a is", a)\n    return [a, b]', [2, 'x'])
    expect(r.output).toBe('top\na is 2\n')
    expect(r).toMatchObject({ called: true, returned: "[2, 'x']" })
  })
  it('keeps the traceback lines that point into the learner’s code', async () => {
    const r = await runPythonScratch(py, 'def solve(n):\n    table = [0] * n\n    return table[n]', [3])
    expect(r.error).toMatch(/line 3, in solve/)
    expect(r.error).toMatch(/IndexError: list index out of range/)
    expect(r.output).toBe('')
  })
})

describe('handing a solution to CodeLens', () => {
  it('adds one call on the Run box input, written in the right language', () => {
    expect(pyLiteral([true, null, [1, 'a']])).toBe('[True, None, [1, "a"]]')
    expect(traceProgram('def solve(a):\n    return a\n\n', 'Python', [[1, 2]])).toBe('def solve(a):\n    return a\n\n\nprint(solve([1, 2]))\n')
    expect(traceProgram('function solve(s) { return s }', 'JavaScript', ['ab'])).toBe('function solve(s) { return s }\n\n\nconsole.log(solve("ab"));\n')
  })
})

describe('the challenge panel', () => {
  const lesson = LESSONS['house-robber']
  const type = code => fireEvent.change(screen.getByLabelText('Your JavaScript solution'), { target: { value: code } })
  it('runs without grading, on the chosen input, then checks separately', () => {
    render(<Practice lesson={lesson} language="JavaScript" setLanguage={() => {}} traceable />)
    type('function solve(values) {\n  console.log("houses:", values.length)\n  return 0\n}')
    expect(screen.getByLabelText('Arguments for solve').value).toBe('[3,2,6,4]')
    fireEvent.change(screen.getByLabelText('Arguments for solve'), { target: { value: '[5, 1, 1, 5]' } })
    fireEvent.click(screen.getByRole('button', { name: '▶ Run' }))
    const out = screen.getByRole('region', { name: 'Run output' })
    expect(out.textContent).toContain('houses: 4')
    expect(out.textContent).toContain('solve([5, 1, 1, 5]) returned 0')
    expect(screen.queryByText(/checks passed/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '✓ Run & check' }))
    expect(screen.getByText(/Not yet/)).toBeTruthy()
    // A failing case can be sent to the Run box to investigate with prints.
    fireEvent.click(screen.getAllByRole('button', { name: 'Put this input in the Run box' })[0])
    expect(screen.getByLabelText('Arguments for solve').value).toBe('[3,2,6,4]')
  })
  it('explains a badly written input instead of running', () => {
    render(<Practice lesson={lesson} language="JavaScript" setLanguage={() => {}} />)
    fireEvent.change(screen.getByLabelText('Arguments for solve'), { target: { value: '[1, 2' } })
    fireEvent.click(screen.getByRole('button', { name: '▶ Run' }))
    expect(screen.getByRole('region', { name: 'Run output' }).textContent).toMatch(/separated by commas/)
  })
  it('hands the code and the Run box input to CodeLens, with a way back', () => {
    render(<Practice lesson={lesson} language="JavaScript" setLanguage={() => {}} traceable />)
    type('function solve(values) { return values.length }')
    fireEvent.click(screen.getByRole('button', { name: '🔍 Open in CodeLens' }))
    const handoff = JSON.parse(localStorage.getItem('codelens-handoff'))
    expect(handoff.lang).toBe('js')
    expect(handoff.code).toContain('console.log(solve([3,2,6,4]));')
    expect(sessionStorage.getItem('codelens_return_path')).toBe('#/lab/dynamic-programming')
    expect(window.location.hash).toBe('#/codelens')
  })
  it('offers CodeLens only where the lesson asks for it', () => {
    render(<Practice lesson={lesson} language="JavaScript" setLanguage={() => {}} />)
    expect(screen.queryByRole('button', { name: '🔍 Open in CodeLens' })).toBeNull()
  })
})
