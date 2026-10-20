// @vitest-environment happy-dom
import React from 'react'
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Checks from './Checks.jsx'
import Lesson from './Lesson.jsx'
import { CHECKS } from './lessons/checks.js'
import { LESSONS } from './lessons/index.js'
import { readProgress } from './progress.js'
import { mergeDpLab } from '../../context/progressMigration'

afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear() })
const literal = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

it('runs the house robbing checks one at a time, names a mistake, and saves the result', () => {
  const id = 'house-robber'
  const checks = CHECKS[id]
  render(<Checks id={id} checks={checks} revision={1} />)

  // A number check: the "every other house" guess is named, then the right answer is explained.
  expect(screen.getByText(checks[0].know)).toBeTruthy()
  const box = screen.getByRole('textbox', { name: 'Your answer' })
  fireEvent.change(box, { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: 'Check' }))
  expect(screen.getByRole('status').textContent).toContain('every other house')
  expect(screen.queryByRole('button', { name: 'Next check →' })).toBeNull()
  fireEvent.change(box, { target: { value: '4' } })
  fireEvent.click(screen.getByRole('button', { name: 'Check' }))
  expect(screen.getByRole('status').textContent).toContain('Right: 4')
  fireEvent.click(screen.getByRole('button', { name: 'Next check →' }))

  // Choice checks: the right option first time, each with its reason.
  for (const c of checks.slice(1)) {
    expect(screen.getByText(c.know)).toBeTruthy()
    const right = c.options.find(o => o.right)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${literal(right.text)}$`) }))
    expect(screen.getByRole('status').textContent).toContain(right.why)
    fireEvent.click(screen.getByRole('button', { name: /Next check →|Finish →/ }))
  }

  expect(screen.getByRole('status').textContent).toContain(`All ${checks.length} checks done`)
  expect(screen.getByRole('status').textContent).toContain(`${checks.length - 1} of ${checks.length} right the first time`)
  expect(readProgress(id, 1).checks).toEqual({ done: true, firstTry: checks.length - 1, total: checks.length })
})

it('is a stage of a lesson that has checks, marked once done, and merges without being undone', () => {
  render(<Lesson lesson={LESSONS.fibonacci} concepts={[]} onSelect={() => {}} language="JavaScript" />)
  fireEvent.click(screen.getByRole('button', { name: /Check yourself/ }))
  expect(screen.getByText(CHECKS.fibonacci[0].know)).toBeTruthy()
  cleanup()
  render(<Lesson lesson={LESSONS.induction} concepts={[]} onSelect={() => {}} language="JavaScript" />)
  expect(screen.queryByRole('button', { name: /Check yourself/ })).toBeNull()

  const phone = { fibonacci: { revision: 1, checks: { done: true, firstTry: 2, total: 3 } } }
  const laptop = { fibonacci: { revision: 1, JavaScript: { code: 'x', passed: false } } }
  expect(mergeDpLab(laptop, phone).fibonacci.checks.done).toBe(true)
})
