// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import KartLab from './index.jsx'
import { DecisionFigure, UpdateFigure } from './Figures.jsx'
import { LESSONS } from './lessons.js'
vi.mock('./Scene.jsx', () => ({ default: () => <div>3D circuit</div> }))
afterEach(() => { cleanup(); localStorage.clear() })
describe('KartLab learner flows', () => {
  it('renders every guided lesson, its visualizations and comprehension check', () => {
    render(<KartLab />)
    for (const lesson of LESSONS) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(lesson.title.replace(/[?]/g, '\\?')) }))
      expect(screen.getByRole('heading', { name: lesson.title })).toBeTruthy()
      const block = lesson.blocks.find(b => b.question)
      fireEvent.click(screen.getByLabelText(block.options[block.answer]))
      fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
      expect(screen.getByText(/^Correct\./)).toBeTruthy()
    }
    expect(Object.keys(JSON.parse(localStorage.getItem('upskillos.kart-lab.v1')).checks)).toHaveLength(LESSONS.length)
  })
  it('connects the visible action buttons to game collisions', () => {
    render(<DecisionFigure />)
    fireEvent.click(screen.getByRole('button', { name: 'Accelerate' }))
    expect(screen.getByRole('status').textContent).toContain('-6.05')
  })
  it('computes the update and clears stale results when controls change', () => {
    render(<UpdateFigure />)
    fireEvent.click(screen.getByText('Compute one update'))
    expect(screen.getByRole('status').textContent).toContain('2.12')
    fireEvent.click(screen.getByLabelText('Episode ended'))
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(screen.getByText('Compute one update'))
    expect(screen.getByRole('status').textContent).toContain('1.40')
  })
  it('can join two trained racers, step, reset, and inspect the actual code', () => {
    render(<KartLab />)
    fireEvent.click(screen.getByRole('tab', { name: 'Race & watch' }))
    fireEvent.change(screen.getByLabelText('Seat 1'), { target: { value: 'human' } })
    expect(screen.getByRole('button', { name: 'Accelerate' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'One decision' }))
    expect(screen.getByText('Last transition')).toBeTruthy()
    expect(screen.getByLabelText('Seat 1').disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Reset grid' }))
    expect(screen.getByLabelText('Seat 1').disabled).toBe(false)
    fireEvent.click(screen.getByRole('tab', { name: 'Code & maths' }))
    expect(screen.getByText(/function trainEpisode/)).toBeTruthy()
  })
  it('preserves a paused race across tabs and replays a single step', () => {
    render(<KartLab />)
    fireEvent.click(screen.getByRole('tab', { name: 'Race & watch' }))
    fireEvent.click(screen.getByRole('button', { name: 'One decision' }))
    expect(screen.getByLabelText('Replay decision').max).toBe('1')
    fireEvent.change(screen.getByLabelText('Replay decision'), { target: { value: '0' } })
    expect(screen.getByText('REPLAY')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Return to live race' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Lessons' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Race & watch' }))
    expect(screen.getByRole('button', { name: 'Resume race' })).toBeTruthy()
    expect(screen.getByLabelText('Replay decision').max).toBe('1')
  })

  it('takes human keyboard decisions and disables tournament for a human seat', () => {
    render(<KartLab />)
    fireEvent.click(screen.getByRole('tab', { name: 'Race & watch' }))
    fireEvent.change(screen.getByLabelText('Seat 1'), { target: { value: 'human' } })
    const arena = screen.getByLabelText('Race controls')
    fireEvent.keyDown(arena, { key: 'ArrowUp' })
    fireEvent.keyUp(arena, { key: 'ArrowUp' })
    expect(screen.getByLabelText('Replay decision').max).toBe('1')
    expect(screen.getByRole('button', { name: 'Run six-race tournament' }).disabled).toBe(true)
  })

  it('recovers from invalid stored data', () => {
    localStorage.setItem('upskillos.kart-lab.v1', '{broken')
    render(<KartLab />)
    expect(screen.getByRole('heading', { name: LESSONS[0].title })).toBeTruthy()
  })
})

it('cancels a worker and releases it when the lab closes', () => {
  const instances = []
  class TestWorker {
    constructor() { this.terminate = vi.fn(); this.postMessage = vi.fn(); instances.push(this) }
  }
  vi.stubGlobal('Worker', TestWorker)
  try {
    const { unmount } = render(<KartLab />)
    fireEvent.click(screen.getByRole('tab', { name: 'Train & compare' }))
    fireEvent.click(screen.getByRole('button', { name: 'Train new driver' }))
    expect(instances[0].postMessage).toHaveBeenCalledWith(expect.objectContaining({ algorithm: 'q' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel training' }))
    expect(instances[0].terminate).toHaveBeenCalledOnce()
    expect(screen.getByText(/Partial learning was discarded/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Train new driver' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Lessons' }))
    expect(instances[1].terminate).not.toHaveBeenCalled()
    unmount()
    expect(instances[1].terminate).toHaveBeenCalledOnce()
  } finally { vi.unstubAllGlobals() }
})
