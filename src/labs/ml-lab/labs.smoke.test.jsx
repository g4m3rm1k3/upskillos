// @vitest-environment happy-dom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import MLLab from './index.jsx'
import { labs } from './labs/index.js'
import { roadmap } from './roadmap.js'

vi.mock('@monaco-editor/react', () => ({ default: ({ value, options }) => <textarea aria-label={options.ariaLabel} value={value} readOnly /> }))
afterEach(() => { cleanup(); localStorage.clear() })

describe('every registered lab renders', () => {
  it('registers labs in roadmap order with unique lesson ids', () => {
    const numbers = roadmap.flatMap(p => p.labs).map(l => l.number)
    expect(labs.map(l => l.number)).toEqual(numbers.slice(0, labs.length).filter(n => labs.some(l => l.number === n)))
    const ids = labs.flatMap(l => l.lessons.map(x => x.id))
    expect(new Set(ids).size).toBe(ids.length)
    for (const lab of labs) {
      expect(lab.lessons.length).toBeGreaterThanOrEqual(4)
      for (const l of lab.lessons) {
        expect(Number.isFinite(l.answer)).toBe(true)
        expect(l.paragraphs.length).toBe(l.sections.length)
        expect(l.prerequisite.length).toBeGreaterThan(5)
        expect(l.reflection.length).toBeGreaterThan(20)
      }
      for (const key of ['starter', 'solution', 'checks', 'filename', 'title', 'intro', 'solutionNote', 'checkSummary']) expect(lab.python[key], `lab ${lab.number} python.${key}`).toBeTruthy()
    }
  })
  for (const lab of labs) {
    it(`lab ${lab.number}: playground, every lesson and the code tab`, async () => {
      render(<MLLab />)
      await act(async () => { fireEvent.change(screen.getByLabelText('Choose lab'), { target: { value: String(lab.number) } }) })
      const n2 = String(lab.number).padStart(2, '0')
      const region = screen.getByRole('region', { name: `Lab ${n2} playground` })
      await vi.waitFor(() => expect(region.querySelector('.ml-panel-heading')).toBeTruthy(), { timeout: 4000 })
      for (const button of [...region.querySelectorAll('button')].filter(b => !/export|download/i.test(b.textContent))) {
        await act(async () => { if (!button.disabled && button.isConnected) fireEvent.click(button) })
      }
      expect(region.querySelector('.ml-panel-heading')).toBeTruthy()
      for (let i = 0; i < lab.lessons.length; i++) {
        const title = lab.lessons[i].title
        expect(screen.getByRole('heading', { name: title.slice(title.indexOf('·') + 2) })).toBeTruthy()
        if (i < lab.lessons.length - 1) fireEvent.click(screen.getByText('Next lesson →', { selector: 'button' }))
      }
      fireEvent.click(screen.getByText('Implement it →', { selector: 'button' }))
      expect(screen.getByLabelText('Editable Python / NumPy').value).toBe(lab.python.starter)
    })
  }
})
