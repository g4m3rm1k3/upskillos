// @vitest-environment happy-dom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import DesignIt from './DesignIt.jsx'
import Lesson from './Lesson.jsx'
import { DESIGNS } from './lessons/designs.js'
import { LESSONS } from './lessons/index.js'
import { CONCEPTS } from './curriculum.js'
import { readProgress, saveProgress } from './progress.js'

afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear() })

const answer = (label, value) => {
  fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value: String(value) } })
  fireEvent.click(screen.getByRole('button', { name: 'Check' }))
}

it('walks house robbing from a hand-solved case to a computed cell, naming each mistake', () => {
  const finish = vi.fn()
  const d = DESIGNS['house-robber']
  render(<DesignIt id="house-robber" design={d} revision={1} onFinish={finish} />)

  // Try first: the alternating guess gets its own diagnosis.
  answer('Your answer to the small case', 6)
  expect(screen.getByRole('status').textContent).toContain('every other house')
  expect(screen.queryByRole('button', { name: 'Start designing →' })).toBeNull()
  answer('Your answer to the small case', 10)
  expect(screen.getByRole('status').textContent).toContain('Right: 10')
  fireEvent.click(screen.getByRole('button', { name: 'Start designing →' }))

  // Each decision: a wrong pick shows why it is wrong; the right one moves on and joins the design card.
  for (const [k, step] of d.steps.entries()) {
    const wrong = step.options.find(o => !o.right), right = step.options.find(o => o.right)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${literal(wrong.text)}$`) }))
    expect(screen.getByRole('status').textContent).toContain(wrong.why)
    expect(screen.queryByRole('button', { name: /Next decision|Finish/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${literal(right.text)}$`) }))
    expect(screen.getByRole('status').textContent).toContain(right.why)
    fireEvent.click(screen.getByRole('button', { name: 'Next decision →' }))
    expect(screen.getByLabelText('Your design so far').textContent).toContain(right.text)
    if (k < d.steps.length - 1) expect(screen.getByText(`DECISION ${k + 2} OF 6`, { exact: false })).toBeTruthy()
  }

  // Use it: B(4) of [3, 2, 6, 4, 5], with the cells it reads shown. Adding B(3) instead of B(2) is diagnosed.
  expect(screen.getByLabelText('Cells already filled').textContent).toContain('B(2) = 3')
  expect(screen.getByLabelText('Cells already filled').textContent).toContain('B(3) = 9')
  answer('Your value for the cell', 13)
  expect(screen.getByRole('status').textContent).toMatch(/Not that|adds every cell/)
  answer('Your value for the cell', 9)
  expect(screen.getByRole('status').textContent).toContain('max(skip: B(3), take: 4 + B(2))')
  fireEvent.click(screen.getByRole('button', { name: 'Finish the design →' }))

  // 1 try-first miss + 6 wrong picks + 1 apply miss, saved with the lesson.
  expect(screen.getByText(/8 wrong picks/)).toBeTruthy()
  expect(readProgress('house-robber', 1).design).toEqual({ done: true, misses: 8, assisted: false })
  fireEvent.click(screen.getByRole('button', { name: 'Watch it fill →' }))
  expect(finish).toHaveBeenCalledWith('walk')
})

it('records a shown answer as assisted, and asks yes or no for a yes-or-no table', () => {
  render(<DesignIt id="word-break" design={DESIGNS['word-break']} revision={1} onFinish={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
  expect(screen.getByRole('status').textContent).toContain('og')
  fireEvent.click(screen.getByRole('button', { name: 'No' }))
  expect(screen.getByRole('status').textContent).toContain('Right: no')

  cleanup()
  render(<DesignIt id="circular-selection" design={DESIGNS['circular-selection']} revision={1} onFinish={() => {}} />)
  answer('Your answer to the small case', 11)
  expect(screen.getByRole('status').textContent).toContain('neighbours')
  fireEvent.click(screen.getByRole('button', { name: 'Show me' }))
  expect(screen.getByRole('status').textContent).toContain('Answer: 8')
})

it('opens a designed lesson on the design stage, and others on Understand', () => {
  const concepts = CONCEPTS
  render(<Lesson lesson={LESSONS.stairs} concepts={concepts} onSelect={() => {}} />)
  expect(screen.getByRole('button', { name: '00 · Design it yourself' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('region', { name: 'Design it yourself' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '02 · Walk through' }))
  expect(screen.queryByRole('region', { name: 'Design it yourself' })).toBeNull()
  cleanup()
  render(<Lesson lesson={LESSONS['plug-dp']} concepts={concepts} onSelect={() => {}} />)
  expect(screen.queryByRole('button', { name: '00 · Design it yourself' })).toBeNull()
  expect(screen.getByRole('region', { name: 'Concept walkthrough' })).toBeTruthy()
})

it('keeps a finished design and a passed quiz when progress is read back', () => {
  saveProgress('stairs', { revision: 1, design: { done: true, misses: 2, assisted: true }, quiz: { answer: '3', passed: true } })
  expect(readProgress('stairs', 1)).toEqual({ revision: 1, design: { done: true, misses: 2, assisted: true }, quiz: { answer: '3', passed: true } })
  render(<DesignIt id="stairs" design={DESIGNS.stairs} revision={1} onFinish={() => {}} />)
  expect(screen.getByText(/You designed it \(with a shown answer\)/)).toBeTruthy()
})

function literal(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
