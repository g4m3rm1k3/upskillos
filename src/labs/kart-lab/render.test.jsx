// @vitest-environment happy-dom
// Every lesson drawn and its buttons pressed, the arena raced, joined and replayed, training run in
// a (stubbed) worker, old progress carried over, and the Python tab opened on every program with
// every line of every file explained: none of it may throw.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import KartLab from './index.jsx'
import Blocks from '../python-steps/Blocks.jsx'
import PythonTab from './PythonTab.jsx'
import { LESSONS } from './lessons/index.js'
import { FIGURES } from './figures/index.js'
import { PROGRAMS } from './programs.js'
import { SOURCES, codeLines } from './source.js'

vi.mock('./Scene.jsx', () => ({ default: () => <div>3D circuit</div> }))
afterEach(() => { cleanup(); localStorage.clear() })
const NEWLINE = String.fromCharCode(10)
const PRESS = ['→', 'Train and test', 'Run six races']

describe('the lessons', () => {
  it('open on the first lesson, with the welcome', () => {
    render(<KartLab />)
    expect(screen.getAllByText('A game becomes a learning environment').length).toBeGreaterThan(0)
    expect(screen.getByText('WELCOME TO SUNLIT CIRCUIT')).toBeTruthy()
  })
  for (const lesson of LESSONS) {
    it(`${lesson.number} ${lesson.title}: draws, and its buttons work`, () => {
      const { container } = render(<Blocks lesson={lesson} saved={{}} onSolved={() => {}} onPython={() => {}} FIGURES={FIGURES} codeLines={codeLines} />)
      expect(container.textContent.length).toBeGreaterThan(200)
      expect(container.textContent).not.toMatch(/Missing figure|NaN|undefined/)
      for (const label of PRESS) for (const button of screen.queryAllByText(label)) act(() => { fireEvent.click(button) })
      expect(container.textContent).not.toMatch(/NaN|undefined/)
    }, 60000)
  }
})

describe('the arena', () => {
  it('joins as a human, takes a decision, inspects it, and resets', () => {
    render(<KartLab />)
    fireEvent.click(screen.getByRole('tab', { name: '🏁 Race & watch' }))
    fireEvent.change(screen.getByLabelText('Seat 1'), { target: { value: 'human' } })
    expect(screen.getByRole('button', { name: 'Accelerate' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'One decision' }))
    expect(screen.getByText('Last transition')).toBeTruthy()
    expect(screen.getByLabelText('Seat 1').disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Reset grid' }))
    expect(screen.getByLabelText('Seat 1').disabled).toBe(false)
  })
  it('keeps a paused race across tabs and replays a step', () => {
    render(<KartLab />)
    fireEvent.click(screen.getByRole('tab', { name: '🏁 Race & watch' }))
    fireEvent.click(screen.getByRole('button', { name: 'One decision' }))
    fireEvent.change(screen.getByLabelText('Replay decision'), { target: { value: '0' } })
    expect(screen.getByText('REPLAY')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Return to live race' }))
    fireEvent.click(screen.getByRole('tab', { name: '📖 Lessons' }))
    fireEvent.click(screen.getByRole('tab', { name: '🏁 Race & watch' }))
    expect(screen.getByRole('button', { name: 'Resume race' })).toBeTruthy()
  })
  it('shows a kart bump when the human steers into the neighbouring driver', () => {
    render(<KartLab />)
    fireEvent.click(screen.getByRole('tab', { name: '🏁 Race & watch' }))
    fireEvent.change(screen.getByLabelText('Seat 1'), { target: { value: 'human' } })
    fireEvent.keyDown(screen.getByLabelText('Race controls'), { key: 'ArrowRight' })
    expect(screen.getByText(/BUMP · kart contact/)).toBeTruthy()
  })
  it('runs a six-race tournament with every seat a model, and shows the sensor view for a sensor driver', () => {
    render(<KartLab />)
    fireEvent.click(screen.getByRole('tab', { name: '🏁 Race & watch' }))
    fireEvent.change(screen.getByLabelText('Seat 1'), { target: { value: 'sky' } })
    expect(screen.getByText(/Danger by lane/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Run six-race tournament' }))
    expect(screen.getByText(/every starting position covered/)).toBeTruthy()
  })
})

describe('storage', () => {
  it('carries lesson progress over from the old engine and says why old drivers are gone', () => {
    localStorage.setItem('upskillos.kart-lab.v2', JSON.stringify({ done: { [LESSONS[0].id]: true }, drivers: [{ id: 'old', checkpoint: { version: 'kart-lanes-v2' } }] }))
    render(<KartLab />)
    expect(screen.getByText(/new engine/)).toBeTruthy()
    expect(screen.getAllByLabelText('done').length).toBe(1)
  })
  it('recovers from broken stored data', () => {
    localStorage.setItem('upskillos.kart-lab.v3', '{broken')
    render(<KartLab />)
    expect(screen.getAllByText(LESSONS[0].title).length).toBeGreaterThan(0)
  })
})

it('training runs in a worker that is stopped when cancelled or when the lab closes', () => {
  const instances = []
  class TestWorker { constructor() { this.terminate = vi.fn(); this.postMessage = vi.fn(); instances.push(this) } }
  vi.stubGlobal('Worker', TestWorker)
  try {
    const { unmount } = render(<KartLab />)
    fireEvent.click(screen.getByRole('tab', { name: '🧪 Train & compare' }))
    fireEvent.click(screen.getByRole('button', { name: 'Train new driver' }))
    expect(instances[0].postMessage).toHaveBeenCalledWith(expect.objectContaining({ method: 'q', view: 'sector' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel training' }))
    expect(instances[0].terminate).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Train new driver' }))
    fireEvent.click(screen.getByRole('tab', { name: '📖 Lessons' }))
    expect(instances[1].terminate).not.toHaveBeenCalled()
    unmount()
    expect(instances[1].terminate).toHaveBeenCalledOnce()
  } finally { vi.unstubAllGlobals() }
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
