// @vitest-environment happy-dom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import { labs } from './labs/index.js'
import LessonFlow from './LessonFlow.jsx'

vi.mock('@monaco-editor/react', () => ({ default: ({ value, options }) => <textarea aria-label={options.ariaLabel} value={value} readOnly /> }))
afterEach(() => { cleanup(); localStorage.clear() })

describe('ordered lesson blocks', () => {
  it('every block points at something that exists', async () => {
    for (const lab of labs) {
      const figures = lab.figures ? await lab.figures() : {}
      for (const lesson of lab.lessons.filter(l => l.blocks)) {
        const paras = new Set()
        for (const b of lesson.blocks) {
          if (b.p != null) { expect(b.p, lesson.id).toBeLessThan(lesson.paragraphs.length); expect(paras.has(b.p), `${lesson.id} paragraph ${b.p} twice`).toBe(false); paras.add(b.p) }
          if (b.cell != null) expect(b.cell, lesson.id).toBeLessThan(lesson.notebook.cells.length)
          if (b.figure) expect(typeof figures[b.figure], `${lesson.id}: figure ${b.figure}`).toBe('function')
          if (b.predict) { expect(Number.isFinite(b.predict.answer), lesson.id).toBe(true); expect(b.predict.explain.length).toBeGreaterThan(10) }
          if (b.derivation) expect(lesson.derivation, lesson.id).toBeTruthy()
          if (b.ladder) expect(lab.ladders?.[b.ladder], `${lesson.id}: ladder ${b.ladder}`).toBeTruthy()
        }
        expect(paras.size, `${lesson.id}: every paragraph placed`).toBe(lesson.paragraphs.length)
      }
    }
  })
  for (const lab of labs.filter(l => l.figures)) {
    it(`lab ${lab.number}: every figure its lessons use renders and survives its controls`, async () => {
      const figures = await lab.figures()
      const used = new Map()
      lab.lessons.forEach(l => (l.blocks ?? []).filter(b => b.figure).forEach(b => used.set(`${b.figure}|${JSON.stringify(b.props ?? {})}`, b)))
      for (const b of used.values()) {
        const Fig = figures[b.figure]
        const { container, unmount } = render(<Fig {...(b.props ?? {})} />)
        expect(container.textContent.length, `lab ${lab.number} ${b.figure}`).toBeGreaterThan(10)
        for (const button of [...container.querySelectorAll('button')].slice(0, 6)) await act(async () => { if (!button.disabled && button.isConnected) fireEvent.click(button) })
        for (const input of [...container.querySelectorAll('input[type=range]')].slice(0, 4)) await act(async () => { fireEvent.change(input, { target: { value: input.max } }) })
        expect(container.textContent, `lab ${lab.number} ${b.figure} computed NaN`).not.toMatch(/[=:×]\s*NaN|NaN\s*[×+−-]/)
        unmount()
      }
    }, 60000)
  }
  it('renders paragraphs, figures and predictions in order, and checks a prediction', async () => {
    const lab = labs.find(l => l.number === 37), lesson = lab.lessons[0], saved = {}
    const onSave = vi.fn()
    render(<LessonFlow lab={lab} lesson={lesson} saved={saved} onSave={onSave} renderMath={() => <p>math block</p>} renderDerivation={() => <p>derivation block</p>} />)
    await vi.waitFor(() => expect(screen.getByRole('img', { name: /Robot at state/ })).toBeTruthy(), { timeout: 4000 })
    const order = [...document.querySelectorAll('.ml-flow > *')].map(n => n.className.split(' ')[0])
    expect(order.slice(0, 4)).toEqual(['ml-reading-section', 'ml-reading-section', 'ml-inline-figure', 'ml-nb-cell'])
    fireEvent.click(screen.getByRole('button', { name: 'Move up' }))
    expect(screen.getByRole('table', { name: 'Transition log' }).textContent).toContain('up')
    const input = screen.getAllByLabelText('Your prediction')[0]
    fireEvent.change(input, { target: { value: '0.6' } })
    await act(async () => { fireEvent.submit(input.closest('form')) })
    expect(screen.getByText(/forgets that the random draw/)).toBeTruthy()
    fireEvent.change(input, { target: { value: '0.7' } })
    await act(async () => { fireEvent.submit(input.closest('form')) })
    expect(onSave).toHaveBeenCalledWith({ predicted: [6] })
    expect(screen.getByText('math block')).toBeTruthy()
  })
})
