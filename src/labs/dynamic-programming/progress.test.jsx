// @vitest-environment happy-dom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { STORE, progressKey, readProgress, saveProgress, isSolved } from './progress.js'
import { mergeDpLab, SYNC_MERGE_STRATEGIES } from '../../context/progressMigration.ts'
import { LESSONS } from './lessons/index.js'

// Signed in: every new solve should be pushed to the account straight away.
const pushNow = vi.fn()
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ user: { uid: 'learner' }, pushNow }) }))
const { default: Lab } = await import('./index.jsx')

afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); pushNow.mockClear() })

it('keeps every lesson in one synced key, and moves the old per-lesson keys into it', () => {
  localStorage.setItem(progressKey('stairs'), JSON.stringify({ revision: 1, Python: { code: 'x', passed: true, hints: 1 } }))
  expect(readProgress('stairs', 1).Python.passed).toBe(true)
  expect(localStorage.getItem(progressKey('stairs'))).toBeNull()
  expect(JSON.parse(localStorage.getItem(STORE)).stairs.Python.code).toBe('x')
  saveProgress('fibonacci', { revision: 1, quiz: { answer: '21', passed: true } })
  expect(Object.keys(JSON.parse(localStorage.getItem(STORE))).sort()).toEqual(['fibonacci', 'stairs'])
  expect(isSolved(readProgress('fibonacci', 1))).toBe(true)
})

it('merges two devices without ever un-solving a lesson', () => {
  expect(SYNC_MERGE_STRATEGIES[STORE]).toBe(mergeDpLab)
  const phone = { stairs: { revision: 1, Python: { code: 'solved on phone', passed: true, hints: 0 } }, lis: { revision: 1, design: { done: true, misses: 0, assisted: false } } }
  const laptop = { stairs: { revision: 1, Python: { code: 'new draft', passed: false, hints: 2 }, JavaScript: { code: 'js', passed: true, hints: 0 } }, lcs: { revision: 1, quiz: { answer: '3', passed: true } } }
  const merged = mergeDpLab(laptop, phone)
  expect(merged.stairs.Python.passed).toBe(true)
  expect(merged.stairs.JavaScript.passed).toBe(true)
  expect(merged.lis.design.done).toBe(true)
  expect(merged.lcs.quiz.passed).toBe(true)
  // Neither side passed: this device's newer draft wins.
  expect(mergeDpLab({ a: { revision: 1, Python: { code: 'mine', passed: false } } }, { a: { revision: 1, Python: { code: 'old', passed: false } } }).a.Python.code).toBe('mine')
  // A newer lesson revision replaces the older record.
  expect(mergeDpLab({ a: { revision: 1, quiz: { answer: '1', passed: true } } }, { a: { revision: 2 } }).a).toEqual({ revision: 2 })
})

it('shows a solve everywhere at once and saves it to the account', () => {
  const id = 'plug-dp', quiz = LESSONS[id].quiz
  render(<Lab />)
  expect(screen.getByRole('group', { name: 'Your progress' }).textContent).toContain('0 of')
  expect(screen.getByRole('group', { name: 'Your progress' }).textContent).toContain('Saved to your account')
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'plug' } })
  fireEvent.click(screen.getByRole('button', { name: /Plug DP and connectivity labels/ }))
  fireEvent.click(screen.getByRole('button', { name: '03 · Check understanding' }))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: quiz.answer } })
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))

  expect(pushNow).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('group', { name: 'Your progress' }).textContent).toContain('1 of')
  const item = [...document.querySelectorAll('.dp-concept')].find(b => b.textContent.includes('Plug DP and connectivity labels'))
  expect(item.textContent).toContain('Solved · quiz passed')
  expect(item.className).toContain('is-solved')
  expect(item.querySelector('.dp-node').textContent).toBe('✓')
  expect(document.querySelector('.dp-concept-hero .dp-solved').textContent).toBe('✓ Solved · quiz passed')
  expect(screen.getAllByText('✓ 1/1').length).toBeGreaterThan(0)

  // Still there after a reload.
  cleanup()
  render(<Lab />)
  expect(screen.getByRole('group', { name: 'Your progress' }).textContent).toContain('1 of')
})
