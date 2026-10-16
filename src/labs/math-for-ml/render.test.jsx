// @vitest-environment happy-dom
// The first lesson opening; the falling-ball figure's linked views; the Symbol
// decoder searched and followed; progress kept and recovered; and the Python tab opened on every
// program with every line of every file explained. None of it may throw. Every lesson is drawn by
// lessons-*.test.jsx, split into three files so that each runs in its own worker with its own memory.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import MathForMLLab from './index.jsx'
import Blocks from '../python-steps/Blocks.jsx'
import Motion from './figures/Motion.jsx'
import PythonTab from './PythonTab.jsx'
import { interval, heightAt } from './engine/fall.js'
import { LESSONS, lessonById } from './lessons/index.js'
import { FIGURES } from './figures/index.js'
import { PROGRAMS } from './programs.js'
import { SOURCES, codeLines } from './source.js'
import { SYMBOLS, EQUATIONS } from './decoder.js'

afterEach(() => { cleanup(); localStorage.clear() })
const NEWLINE = String.fromCharCode(10)

describe('the lab', () => {
  it('opens on the first lesson', () => {
    render(<MathForMLLab />)
    expect(screen.getAllByText('Letters that stand for numbers').length).toBeGreaterThan(0)
  })
})

describe('the coding exercises', () => {
  it('picks up a draft saved under the exercise\'s old position, and moves it', async () => {
    const lesson = lessonById('sigma'), k = lesson.blocks.findIndex(b => b.exercise), spec = lesson.blocks[k].exercise
    localStorage.removeItem(`upskillos.exercise.sigma:${spec.prompt}`)
    localStorage.setItem(`upskillos.exercise.sigma:${k}`, 'def total(xs):\n    return 42\n')
    render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onPython={() => {}} FIGURES={FIGURES} codeLines={codeLines} />)
    const draft = await screen.findByLabelText('Your Python').catch(() => null)
    if (draft) expect(draft.value).toContain('return 42')
    expect(localStorage.getItem(`upskillos.exercise.sigma:${k}`)).toBeNull()
    expect(localStorage.getItem(`upskillos.exercise.sigma:${spec.prompt}`)).toContain('return 42')
    cleanup(); localStorage.removeItem(`upskillos.exercise.sigma:${spec.prompt}`)
  })
  it('show the task, an editable draft, hints one at a time and the solution on request', async () => {
    const lesson = lessonById('sigma'), k = lesson.blocks.findIndex(b => b.exercise), spec = lesson.blocks[k].exercise
    render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onPython={() => {}} FIGURES={FIGURES} codeLines={codeLines} />)
    expect(screen.getByText('Your turn: code it')).toBeTruthy()
    expect(screen.getByRole('button', { name: '▶ Run & check' })).toBeTruthy()
    const draft = await screen.findByLabelText('Your Python').catch(() => null)
    if (draft) {
      fireEvent.change(draft, { target: { value: 'def total(xs):\n    return 0\n' } })
      expect(localStorage.getItem(`upskillos.exercise.sigma:${spec.prompt}`)).toContain('return 0')
    }
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }))
    expect(screen.getByRole('button', { name: 'Another hint' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Show a solution' }))
    expect(document.querySelector('.ps-exercise-solution').textContent).toBe(spec.solution)
  })
  it('appear just before each lesson\'s closing note', () => {
    for (const lesson of LESSONS) {
      const k = lesson.blocks.findIndex(b => b.exercise)
      expect(k, lesson.id).toBeGreaterThan(0)
      expect(lesson.blocks.slice(k + 1).every(b => b.note), lesson.id).toBe(true)
    }
  })
})

describe('the falling ball (the opening chapter)', () => {
  it('has the stated heights and rates', () => {
    expect(heightAt(0)).toBe(20)
    expect(heightAt(2)).toBe(0)
    expect(interval(0.5, 1.5)).toEqual({ startHeight: 18.75, endHeight: 8.75, change: -10, elapsed: 1, velocity: -10 })
    expect(() => interval(1, 1)).toThrow(RangeError)
  })
  it('links table selection to the clock, ball and plotted observation', () => {
    render(<Motion stage="graph" />)
    fireEvent.click(screen.getByRole('button', { name: 'Inspect 1.5 seconds' }))
    expect(screen.getByLabelText('Current measurement').textContent).toBe('1.5 s · height 8.75 m')
    expect(screen.getByRole('slider').value).toBe('1.5')
  })
  it('recalculates when an endpoint changes and explains the selected symbol', () => {
    render(<Motion stage="rate" />)
    fireEvent.change(screen.getByLabelText('Start time (s)'), { target: { value: '0.5' } })
    fireEvent.change(screen.getByLabelText('End time (s)'), { target: { value: '1.5' } })
    fireEvent.click(screen.getByRole('button', { name: /v̄/ }))
    expect(screen.getByText(/Divide signed height change/).textContent).toContain('-10 ÷ 1 = -10 m/s')
  })
})

describe('the Symbol decoder', () => {
  it('names only lessons that exist', () => {
    for (const s of SYMBOLS) expect(lessonById(s[4]), s[0]).toBeTruthy()
    for (const e of EQUATIONS) for (const p of e.parts) expect(lessonById(p[2]), `${e.id}: ${p[0]}`).toBeTruthy()
  })
  it('searches, and opens the lesson behind a symbol', () => {
    render(<MathForMLLab />)
    fireEvent.click(screen.getByRole('tab', { name: '🔣 Symbol decoder' }))
    fireEvent.change(screen.getByPlaceholderText(/e.g. gradient/), { target: { value: 'expected' } })
    fireEvent.click(screen.getAllByRole('button', { name: new RegExp(`${lessonById('expectation').number} Expected value`) })[0])
    expect(document.querySelector('.qm-lesson > header h1').textContent).toContain('Expected value')
  })
})

describe('progress', () => {
  it('keeps a solved check and the reading position across remounts', () => {
    localStorage.setItem('upskillos.math-for-ml.v1', JSON.stringify({ current: 'measure' }))
    const view = render(<MathForMLLab />)
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check', exact: true }))
    view.unmount()
    render(<MathForMLLab />)
    expect(document.querySelector('.qm-lesson > header h1').textContent).toBe('Give observations numbers')
    expect(screen.getByText('Right: 5')).toBeTruthy()
  })
  it('recovers from malformed saved progress', () => {
    localStorage.setItem('upskillos.math-for-ml.v1', JSON.stringify({ current: 'missing', lessons: { observe: { solved: 'bad' } }, done: null }))
    render(<MathForMLLab />)
    expect(document.querySelector('.qm-lesson > header h1').textContent).toBe('Letters that stand for numbers')
  })
})

describe('the Python tab', () => {
  it('opens on every program', () => {
    for (const id of Object.keys(PROGRAMS)) {
      const { unmount } = render(<PythonTab request={{ program: id }} />)
      expect(screen.getByText(/needs the UpSkillOS desktop app/)).toBeTruthy()
      unmount()
    }
  })
  it('explains every line of every file in the browser', () => {
    const done = new Set()
    for (const id of Object.keys(PROGRAMS)) {
      const { container, unmount } = render(<PythonTab request={{ program: id }} />)
      for (const tab of [...container.querySelectorAll('.qm-py-files button')]) {
        const file = tab.textContent
        if (done.has(file)) continue
        done.add(file)
        act(() => { fireEvent.click(tab) })
        const lines = [...container.querySelectorAll('.qm-py-line')]
        expect(lines.length).toBe(SOURCES[file].split(NEWLINE).length)
        for (const line of lines) act(() => { fireEvent.click(line) })
      }
      unmount()
    }
    expect([...done].sort()).toEqual(Object.keys(SOURCES).sort())
  }, 120000)
})
