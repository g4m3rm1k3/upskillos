// @vitest-environment happy-dom
// Every lesson drawn and its buttons pressed, every figure drawn, the Table played, the Workshop
// opened, and the Python tab opened on every program and asked to explain every line of every file:
// none of it may throw.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import Lab from './index.jsx'
import Blocks from '../python-steps/Blocks.jsx'
import PythonTab from './PythonTab.jsx'
import { LESSONS } from './lessons/index.js'
import { FIGURES } from './figures/index.js'
import { PROGRAMS } from './programs.js'
import { SOURCES, codeLines } from './source.js'

vi.mock('./DiceScene.jsx', () => ({ default: () => <div>3D dice tray</div> }))
afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear() })
const NEWLINE = String.fromCharCode(10)
const PRESS = ['Roll again', 'Next →', 'First update that changes a value', 'New turn']

describe('the lab renders', () => {
  it('opens on the first lesson', () => {
    render(<Lab />)
    expect(screen.getAllByText('Five dice in Python').length).toBeGreaterThan(0)
  })

  for (const lesson of LESSONS) {
    it(`${lesson.number} ${lesson.title}: draws, and its buttons work`, () => {
      const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onPython={() => {}} FIGURES={FIGURES} codeLines={codeLines} />)
      expect(container.textContent.length).toBeGreaterThan(200)
      expect(container.textContent).not.toMatch(/Missing figure|NaN|undefined/)
      for (const label of PRESS) for (const button of screen.queryAllByText(label)) act(() => { fireEvent.click(button) })
    }, 60000)
  }

  it('the Table: you roll, keep a die, score; then a model takes its turn', () => {
    vi.useFakeTimers()
    render(<Lab />)
    fireEvent.click(screen.getByRole('tab', { name: '🎲 Table' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll the dice' }))
    act(() => vi.advanceTimersByTime(1100))
    fireEvent.click(screen.getByRole('button', { name: /Die 1:/ }))
    expect(screen.getByRole('button', { name: /Die 1:/ }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('tab', { name: '📖 Lessons' }))
    fireEvent.click(screen.getByRole('tab', { name: '🎲 Table' }))
    expect(screen.getByRole('button', { name: /Die 1:/ }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /Score \d+ in Chance/ }))
    expect(screen.getByText(/You wrote/)).toBeTruthy()
    for (let i = 0; i < 4; i++) { fireEvent.click(screen.getByRole('button', { name: 'Next model decision →' })); act(() => vi.advanceTimersByTime(1100)) }
    expect(screen.getAllByText(/Learner wrote|kept/).length).toBeGreaterThan(0)
  })

  it('the Workshop trains in a worker, which is stopped when cancelled or closed', () => {
    const instances = []
    class W { constructor() { this.terminate = vi.fn(); this.postMessage = vi.fn(); instances.push(this) } }
    vi.stubGlobal('Worker', W)
    try {
      const { unmount } = render(<Lab />)
      fireEvent.click(screen.getByRole('tab', { name: '🧪 Workshop' }))
      fireEvent.click(screen.getByRole('button', { name: 'Train a new player' }))
      expect(instances[0].postMessage).toHaveBeenCalledWith({ cmd: 'train', config: { games: 1000, alpha: 0.01, bonus: true, seed: 0 } })
      act(() => { instances[0].onmessage({ data: { type: 'progress', games: 25, weights: Array(19).fill(1) } }) })
      expect(screen.getByText(/25 \/ 1,000 games/)).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(instances[0].terminate).toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'Train a new player' }))
      act(() => { instances[1].onmessage({ data: { type: 'trained', weights: Array(19).fill(2) } }) })
      fireEvent.click(screen.getByRole('button', { name: 'Save to the library' }))
      expect(screen.getAllByText('My learner').length).toBeGreaterThan(0)
      fireEvent.click(screen.getByRole('button', { name: 'Train a new player' }))
      unmount()
      expect(instances[2].terminate).toHaveBeenCalled()
    } finally { vi.unstubAllGlobals() }
  })

  it('the Python tab opens on every program', () => {
    for (const id of Object.keys(PROGRAMS)) {
      const { unmount } = render(<PythonTab request={{ program: id }} />)
      expect(screen.getByText(/needs the UpSkillOS desktop app/)).toBeTruthy()
      unmount()
    }
  })

  it('the Python tab explains every line of every file in the browser', () => {
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
