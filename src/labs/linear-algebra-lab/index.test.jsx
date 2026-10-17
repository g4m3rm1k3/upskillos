// @vitest-environment happy-dom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { executeScript } from '../../engines/openmat/openmatEngine.js'
import { gradeWorkspace } from './grading.js'
import { LESSONS } from './curriculum.js'
import { STORE_KEY, readProgress } from './storage.js'
import { bellmanTrace, descentTrace, eigen2 } from './Explore.jsx'
import Lab from './index.jsx'

vi.mock('./runner.js', () => ({ startRun: vi.fn(payload => ({
  promise: Promise.resolve().then(() => {
    try {
      const result = executeScript(payload.source)
      return { result, checks: gradeWorkspace(result.workspace, payload.checks || []) }
    } catch (error) { return { error: error.message } }
  }), cancel: vi.fn(),
})) }))
vi.mock('@monaco-editor/react', () => ({ default: ({ value, onChange, options }) => <textarea aria-label={options.ariaLabel} value={value} onChange={e => onChange(e.target.value)} /> }))
vi.mock('../../components/notebooks/FigureRenderer.jsx', () => ({ default: () => <canvas aria-label="Rendered OpenMAT figure" /> }))

afterEach(() => { cleanup(); localStorage.clear() })
const practice = () => fireEvent.click(screen.getByRole('tab', { name: /Practice & challenge/ }))

describe('Linear Algebra Lab', () => {
  it('renders actual beginner teaching, runs its own example and exposes the syntax guide', async () => {
    render(<Lab />)
    expect(screen.getByText(/A delivery service charges 4 dollars/)).toBeTruthy()
    expect(screen.getByLabelText('Worked example code').value).toBe(LESSONS[0].demo.code)
    fireEvent.click(screen.getByRole('button', { name: 'Run example' }))
    await screen.findByLabelText('OpenMAT output')
    expect(screen.getByLabelText('Rendered OpenMAT figure')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Syntax guide' }))
    expect(screen.getByText(/OpenMAT counts from 1/)).toBeTruthy()
  })

  it('rejects the starter, saves edits and records a numerical pass that survives remount', async () => {
    const mounted = render(<Lab />)
    practice()
    fireEvent.click(screen.getByRole('button', { name: 'Run & check challenge' }))
    await screen.findByText('Keep experimenting')
    expect(readProgress().done?.[LESSONS[0].id]).toBeUndefined()
    fireEvent.change(screen.getByLabelText('Your challenge code'), { target: { value: LESSONS[0].challenge.solution } })
    fireEvent.click(screen.getByRole('button', { name: 'Run & check challenge' }))
    await screen.findByText('All checks passed')
    await waitFor(() => expect(readProgress().done[LESSONS[0].id]).toBeTruthy())
    expect(readProgress().drafts[LESSONS[0].id]).toBe(LESSONS[0].challenge.solution)
    mounted.unmount()
    render(<Lab />)
    practice()
    expect(screen.getByLabelText('Your challenge code').value).toBe(LESSONS[0].challenge.solution)
    expect(screen.getByText(/Challenge passed/)).toBeTruthy()
  })

  it('keeps drafts isolated across lessons and shows hints progressively', () => {
    render(<Lab />)
    practice()
    fireEvent.change(screen.getByLabelText('Your challenge code'), { target: { value: 'fare = 99;' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reveal first hint' }))
    expect(screen.getByText(LESSONS[0].challenge.hints[0])).toBeTruthy()
    expect(screen.queryByText(LESSONS[0].challenge.hints[1])).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Next lesson →' }))
    practice()
    expect(screen.getByLabelText('Your challenge code').value).toBe(LESSONS[1].challenge.starter)
    fireEvent.click(screen.getByRole('button', { name: '← Previous lesson' }))
    practice()
    expect(screen.getByLabelText('Your challenge code').value).toBe('fare = 99;')
  })

  it('recovers from corrupt storage and provides interactive, labelled visual experiments', () => {
    localStorage.setItem(STORE_KEY, '{bad json')
    render(<Lab />)
    fireEvent.click(screen.getByRole('tab', { name: /Visual playground/ }))
    expect(screen.getByRole('img', { name: /Coordinate plane/ })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Vector x'), { target: { value: '1.5' } })
    expect(screen.getByRole('img', { name: /v has length 2.92/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Matrix as a map' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reflect' }))
    expect(screen.getByRole('img', { name: /det\(A\) = -1.00/ })).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Drag column 1' }), { key: 'ArrowRight', shiftKey: true })
    expect(screen.getByRole('img', { name: /A = \[1.00 1.00; 1.00 0.00\]/ })).toBeTruthy()
  })

  it('finds real eigen-directions and reports rotations as complex', () => {
    expect(eigen2([[2, 1], [1, 2]]).values).toEqual([3, 1])
    expect(eigen2([[2, 1], [1, 2]]).vectors).toEqual([[1, 1], [1, -1]])
    expect(eigen2([[0, -1], [1, 0]]).complex).toBe(true)
    expect(eigen2([[2, 0], [0, 0.5]]).vectors).toEqual([[1, 0], [0, 1]])
  })

  it('uses synchronous Bellman backups and shows convergent and divergent descent', () => {
    expect(bellmanTrace(0.8, 1)).toEqual([[0, 0, 0], [1, 2, 0]])
    expect(bellmanTrace(0.8, 2).at(-1)).toEqual([1.8, 2, 0])
    expect(bellmanTrace(0, 20).at(-1)).toEqual([1, 2, 0])
    expect(Math.abs(descentTrace(0.2).at(-1) - 2)).toBeLessThan(0.01)
    expect(Math.abs(descentTrace(1.1).at(-1) - 2)).toBeGreaterThan(3)
  })
})
