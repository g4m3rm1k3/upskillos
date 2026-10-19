// @vitest-environment happy-dom
// A bug hunt used as a learner would: run the buggy code, click a right line and read why it is
// right, click the bug, fix it, pass Run & check; the result is saved, synced and shown.
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { runJavaScriptCases, runJavaScriptScratch } from './runtime/checks.js'
import { mergeDpLab } from '../../context/progressMigration.ts'

// The page's worker, replaced by the same functions run in place (JavaScript only).
vi.mock('./runtime/runner.js', () => ({
  startAttempt: ({ code, cases, mode, args, onDone }) => {
    onDone(mode === 'run' ? runJavaScriptScratch(code, args) : runJavaScriptCases(code, cases))
    return () => {}
  },
}))
const { default: Hunt } = await import('./Hunt.jsx')
const { default: Lesson } = await import('./Lesson.jsx')
const { LESSONS } = await import('./lessons/index.js')
const { BUG_HUNTS, bugLines } = await import('./hunt.js')
const { STORE, readProgress } = await import('./progress.js')

afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear() })

const id = 'zero-one-knapsack'
const lesson = LESSONS[id]
const hunt = BUG_HUNTS[id]
const open = (props = {}) => render(<Hunt lesson={lesson} hunt={hunt} language="JavaScript" setLanguage={() => {}} {...props} />)
const lineButton = n => screen.getByRole('button', { name: new RegExp(`^Line ${n}:`) })

describe('a bug hunt', () => {
  it('teaches the method before it asks, and runs the buggy code on the input that shows the bug', () => {
    open()
    expect(screen.getByText(hunt.know)).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: '▶ Run' })[0])
    const output = screen.getByRole('region', { name: 'Run output' })
    expect(output.textContent).toContain('returned 6')
    expect(output.textContent).toContain('the right answer is 5')
  })

  it('says why a right line is right, then explains the bug once it is found', () => {
    const onProgress = vi.fn()
    open({ onProgress })
    const recurrence = 1 + hunt.code.JavaScript.split('\n').findIndex(l => l.includes('best[c] = Math.max'))
    fireEvent.click(lineButton(recurrence))
    expect(screen.getByText(`Line ${recurrence} is right.`)).toBeTruthy()
    expect(screen.getByText(/this recurrence is right, if best\[c − w\] does not yet contain the item/)).toBeTruthy()

    fireEvent.click(lineButton(bugLines(hunt, 'JavaScript')[0]))
    expect(screen.getByText(/✓ Found it: The capacity loop runs the wrong way/)).toBeTruthy()
    expect(screen.getByText(/With solve\(\[2,3\], \[3,5\], 4\), two copies of the first item fill the knapsack: 6 instead of 5/)).toBeTruthy()
    expect(readProgress(id, lesson.revision).hunt).toMatchObject({ found: true, misses: 1, passed: false })
    expect(onProgress).toHaveBeenCalled()
  })

  it('fails Run & check until the fix, then shows Fixed, the fix, and keeps it after a reload', () => {
    open()
    fireEvent.click(lineButton(bugLines(hunt, 'JavaScript')[0]))
    fireEvent.click(screen.getByRole('button', { name: '✓ Run & check' }))
    // The symptom is already the challenge's first case, so it isn't checked twice.
    expect(screen.getByText(/Not yet: \d+ of 6 checks pass/)).toBeTruthy()

    const editor = screen.getByLabelText('The buggy JavaScript solution, to fix')
    fireEvent.change(editor, { target: { value: hunt.code.JavaScript } })
    fireEvent.click(screen.getByRole('button', { name: '✓ Run & check' }))
    expect(screen.getByText('🐞 Fixed: every check passes.')).toBeTruthy()
    expect(screen.getByText('🐞 Fixed', { selector: '.dp-passed-tag' })).toBeTruthy()
    expect(screen.getByText(/Loop c from capacity down to w/)).toBeTruthy()
    const saved = JSON.parse(localStorage.getItem(STORE))[id].hunt
    expect(saved).toMatchObject({ found: true, passed: true, shown: false, JavaScript: hunt.code.JavaScript })

    cleanup()
    open()
    expect(screen.getByText('🐞 Fixed', { selector: '.dp-passed-tag' })).toBeTruthy()
    expect(screen.getByLabelText('The buggy JavaScript solution, to fix').value).toBe(hunt.code.JavaScript)
  })

  it('gives clues one at a time, and only then offers to show the line', () => {
    open()
    expect(screen.queryByRole('button', { name: 'Show me the line' })).toBeNull()
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: /Ask for a clue|Next clue/ }))
    expect(screen.getAllByRole('listitem').filter(li => hunt.clues.includes(li.textContent))).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'Show me the line' }))
    expect(screen.getByText(/The bug: The capacity loop runs the wrong way/)).toBeTruthy()
    expect(readProgress(id, lesson.revision).hunt).toMatchObject({ found: true, shown: true, clues: 3 })
  })
})

describe('the reference solution, explained', () => {
  it('opens only after the learner’s own Run & check, with notes under the lines and the maths beside the code', async () => {
    const { Practice } = await import('./Lesson.jsx')
    render(<Practice lesson={lesson} language="Python" setLanguage={() => {}} />)
    expect(screen.getByText(/After your first/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Compare with the reference solution/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '✓ Run & check' }))
    fireEvent.click(screen.getByRole('button', { name: /Compare with the reference solution/ }))
    const panel = screen.getByRole('region', { name: 'Reference solution, explained' })
    expect(panel.textContent).toContain('for c in range(capacity, w - 1, -1):')
    expect(panel.textContent).toMatch(/Going down, best\[c − w\] is read before this item changes it/)
    expect(screen.getByRole('cell', { name: 'max(best[c], best[c - w] + v)' })).toBeTruthy()
  })
})

describe('the bug hunt in a lesson', () => {
  it('is a fourth stage on lessons that have one, and marked ✓ once fixed', () => {
    render(<Lesson lesson={lesson} concepts={[]} onSelect={() => {}} language="JavaScript" />)
    expect(screen.getByRole('button', { name: '04 · Bug hunt' })).toBeTruthy()
    cleanup()
    localStorage.setItem(STORE, JSON.stringify({ [id]: { revision: lesson.revision, hunt: { found: true, passed: true } } }))
    render(<Lesson lesson={lesson} concepts={[]} onSelect={() => {}} language="JavaScript" />)
    fireEvent.click(screen.getByRole('button', { name: '04 · Bug hunt ✓' }))
    expect(screen.getByRole('region', { name: 'Bug hunt' })).toBeTruthy()
  })

  it('is not offered on a lesson without a hunt', () => {
    render(<Lesson lesson={LESSONS['min-cost-stairs']} concepts={[]} onSelect={() => {}} language="JavaScript" />)
    expect(screen.queryByRole('button', { name: /Bug hunt/ })).toBeNull()
  })

  it('merges two devices without un-fixing a hunt', () => {
    const phone = { [id]: { revision: 1, hunt: { found: true, passed: true } } }
    const laptop = { [id]: { revision: 1, hunt: { found: true, passed: false, JavaScript: 'draft' } } }
    expect(mergeDpLab(laptop, phone)[id].hunt.passed).toBe(true)
  })
})
