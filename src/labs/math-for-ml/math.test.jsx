// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import MathForMLLab from './index.jsx'
import Motion from './Motion.jsx'
import { interval, heightAt } from './engine.js'
import { LESSONS } from './lessons.js'

afterEach(() => { cleanup(); localStorage.clear() })

describe('falling-ball measurements', () => {
  it('asks for answers the model really gives, and no misconception equals the answer', () => {
    // Each check's answer recomputed from the engine: a mistyped answer would mark a right learner wrong.
    const expected = {
      measure: heightAt(0) - heightAt(1),
      record: heightAt(1) - heightAt(1.5),
      graph: heightAt(1.5),
      change: interval(0, 1).change,
      rate: interval(0.5, 1.5).velocity,
    }
    const checks = LESSONS.flatMap(l => l.blocks.filter(b => b.predict).map(b => [l.id, b.predict]))
    expect(checks.map(([id]) => id)).toEqual(Object.keys(expected))
    for (const [id, spec] of checks) {
      expect(spec.answer, id).toBeCloseTo(expected[id], 12)
      for (const m of spec.misconceptions ?? []) expect(m.answer, `${id}: misconception`).not.toBe(spec.answer)
    }
    for (const l of LESSONS) for (const b of l.blocks.filter(x => x.choice)) expect(b.choice.options[b.choice.answer], l.id).toBeTruthy()
  })

  it('has the stated boundary heights and independently computed interval rates', () => {
    expect(heightAt(0)).toBe(20)
    expect(heightAt(2)).toBe(0)
    expect(interval(.5, 1.5)).toEqual({ startHeight: 18.75, endHeight: 8.75, change: -10, elapsed: 1, velocity: -10 })
    expect(interval(1, 2).velocity).toBe(-15)
    expect(() => interval(1, 1)).toThrow(RangeError)
    expect(() => interval(2, 1)).toThrow(RangeError)
    expect(() => interval(0, 3)).toThrow(RangeError)
  })
  it('links table selection to the clock, ball, and plotted observation', () => {
    render(<Motion stage="graph" />)
    fireEvent.click(screen.getByRole('button', { name: 'Inspect 1.5 seconds' }))
    expect(screen.getByLabelText('Current measurement').textContent).toBe('1.5 s · height 8.75 m')
    expect(screen.getByRole('img', { name: /Ball at 8.75 meters/ })).toBeTruthy()
    expect(screen.getByRole('slider').value).toBe('1.5')
    fireEvent.click(screen.getByText('Reset time'))
    expect(screen.getByRole('slider').value).toBe('0')
  })
  it('recalculates quantities when either endpoint changes and explains the selected symbol', () => {
    render(<Motion stage="rate" />)
    fireEvent.change(screen.getByLabelText('Start time (s)'), { target: { value: '0.5' } })
    fireEvent.change(screen.getByLabelText('End time (s)'), { target: { value: '1.5' } })
    fireEvent.click(screen.getByRole('button', { name: /v̄/ }))
    expect(screen.getByText(/Divide signed height change/).textContent).toContain('-10 ÷ 1 = -10 m/s')
  })
})

describe('the learning journey', () => {
  it('renders every opening lesson with its interactive figure', () => {
    render(<MathForMLLab />)
    for (const [i, lesson] of LESSONS.entries()) {
      fireEvent.click(screen.getByRole('button', { name: `1.${i + 1} ${lesson.title}`, exact: true }))
      expect(screen.getByRole('heading', { name: lesson.title })).toBeTruthy()
      expect(screen.getByRole('slider', { name: 'Time in seconds' })).toBeTruthy()
      expect(screen.queryByText(/Missing figure/)).toBeNull()
    }
  })
  it('retains a solved check and reading position across remounts', () => {
    const view = render(<MathForMLLab />)
    fireEvent.click(screen.getByRole('button', { name: '1.2 Give observations numbers', exact: true }))
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }))
    view.unmount()
    render(<MathForMLLab />)
    expect(screen.getByRole('heading', { name: 'Give observations numbers' })).toBeTruthy()
    expect(screen.getByText('Right: 5')).toBeTruthy()
    expect(screen.getByRole('button', { name: '✓ Marked read' })).toBeTruthy()
  })
  it('recovers from malformed saved progress', () => {
    localStorage.setItem('upskillos.math-for-ml.v1', JSON.stringify({ current: 'missing', lessons: { observe: { solved: 'bad' } }, done: null }))
    render(<MathForMLLab />)
    expect(screen.getByRole('heading', { name: 'Watch before calculating' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'The journey' }))
    expect(screen.getByText(/future curriculum, not completed lessons/)).toBeTruthy()
  })
})
