// @vitest-environment happy-dom
import React from 'react'
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Review, MasteryMap } from './Study.jsx'
import { dueItems, enterReview, INTERVAL_DAYS, marks, RETRY_MS, retained, schedule } from './review.js'
import { CHECKS } from './lessons/checks.js'
import { cleanRecord, readProgress, saveProgress } from './progress.js'
import { mergeDpLab } from '../../context/progressMigration'

afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear() })
const DAY = 86400000
const literal = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

it('schedules with Leitner boxes: right moves up a box, wrong goes back to box 1 for ten minutes', () => {
  const now = 1e12
  expect(schedule(undefined, true, now)).toEqual({ box: 1, due: now + INTERVAL_DAYS[1] * DAY, at: now })
  expect(schedule({ box: 2 }, true, now)).toEqual({ box: 3, due: now + 7 * DAY, at: now })
  expect(schedule({ box: 5 }, true, now).box).toBe(5)
  expect(schedule({ box: 4 }, false, now)).toEqual({ box: 1, due: now + RETRY_MS, at: now })
  // Finishing a lesson's checks enters each one, a day out, without resetting one already scheduled.
  expect(enterReview({ 1: { box: 4, due: 5, at: 5 } }, 3, now)).toEqual({ 0: { box: 1, due: now + DAY, at: now }, 1: { box: 4, due: 5, at: 5 }, 2: { box: 1, due: now + DAY, at: now } })
})

it('reviews only finished lessons, the weakest due check first, and marks retention at box 3', () => {
  const now = 1e12
  const progress = {
    'house-robber': { revision: 1, checks: { done: true }, review: { 0: { box: 2, due: now - 1, at: 0 }, 1: { box: 1, due: now + DAY, at: 0 }, 2: { box: 1, due: now - 1, at: 0 } } },
    fibonacci: { revision: 1, review: { 0: { box: 1, due: 0, at: 0 } } },
  }
  expect(dueItems(progress, now).map(d => `${d.id}#${d.k}`)).toEqual(['house-robber#2', 'house-robber#0'])
  expect(retained('house-robber', progress['house-robber'])).toBe(false)
  const strong = { revision: 1, checks: { done: true }, review: { 0: { box: 3, due: 0 }, 1: { box: 5, due: 0 }, 2: { box: 3, due: 0 } } }
  expect(retained('house-robber', strong)).toBe(true)
  expect(marks('house-robber', strong)).toEqual({ designed: false, solved: false, fixed: false, checked: true, retained: true })
  // A Structured lesson has no bug hunt yet, so that mark does not apply.
  expect(marks('lcs', {}).fixed).toBeNull()
  expect(Object.keys(CHECKS).every(id => marks(id, {}).checked === false)).toBe(true)
})

it('keeps clean review entries, and a merge keeps the latest answer of each check from either device', () => {
  expect(cleanRecord({ revision: 1, review: { 0: { box: 2, due: 9, at: 3 }, 1: { box: 9, due: 9 }, x: { box: 1, due: 1 } } }, 1).review).toEqual({ 0: { box: 2, due: 9, at: 3 } })
  const phone = { 'house-robber': { revision: 1, review: { 0: { box: 3, due: 50, at: 20 }, 1: { box: 1, due: 5, at: 1 } } } }
  const laptop = { 'house-robber': { revision: 1, checks: { done: true }, review: { 0: { box: 1, due: 30, at: 25 }, 2: { box: 2, due: 7, at: 2 } } } }
  const merged = mergeDpLab(phone, laptop)['house-robber']
  expect(merged.checks).toEqual({ done: true })
  expect(merged.review).toEqual({ 0: { box: 1, due: 30, at: 25 }, 1: { box: 1, due: 5, at: 1 }, 2: { box: 2, due: 7, at: 2 } })
})

it('runs a review session: the weakest check first, a miss comes back soon, a first-time answer moves up', () => {
  const id = 'house-robber', checks = CHECKS[id]
  const past = Date.now() - 1000
  const record = { revision: 1, checks: { done: true, firstTry: 3, total: 3 }, review: { 0: { box: 2, due: past, at: 0 }, 1: { box: 2, due: Date.now() + DAY, at: 0 }, 2: { box: 1, due: past, at: 0 } } }
  saveProgress(id, record)
  let finished = false
  render(<Review progress={{ [id]: record }} onOpen={() => {}} onFinish={() => { finished = true }} />)
  expect(screen.getByText('SPACED REVIEW · 1 OF 2')).toBeTruthy()

  // Check 2 (box 1) comes first: right the first time moves it to box 2, three days out.
  expect(screen.getByText(checks[2].know)).toBeTruthy()
  const right = checks[2].options.find(o => o.right)
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${literal(right.text)}$`) }))
  fireEvent.click(screen.getByRole('button', { name: 'Next question →' }))
  expect(readProgress(id, 1).review[2].box).toBe(2)

  // Check 0 (box 2), a number: a wrong answer first sends it back to box 1, due in ten minutes.
  const box = screen.getByRole('textbox', { name: 'Your answer' })
  fireEvent.change(box, { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: 'Check' }))
  fireEvent.change(box, { target: { value: String(checks[0].answer) } })
  fireEvent.click(screen.getByRole('button', { name: 'Check' }))
  fireEvent.click(screen.getByRole('button', { name: 'Finish review' }))
  const saved = readProgress(id, 1).review
  expect(saved[0].box).toBe(1)
  expect(saved[0].due - Date.now()).toBeLessThanOrEqual(RETRY_MS)
  expect(saved[1].box).toBe(2)
  expect(screen.getByRole('status').textContent).toContain('1 of 2 right the first time')
  expect(finished).toBe(true)
})

it('says when nothing is due, and the map shows each lesson’s marks and opens it', () => {
  render(<Review progress={{}} onOpen={() => {}} />)
  expect(screen.getByText(/Nothing is due/)).toBeTruthy()
  cleanup()
  let opened = null
  render(<MasteryMap progress={{ 'house-robber': { revision: 1, checks: { done: true }, JavaScript: { code: 'x', passed: true } } }} onOpen={id => { opened = id }} />)
  const tile = screen.getByRole('button', { name: /^Non-adjacent selection: Designed it not yet, Solved it yes, Fixed the bug not yet, Checked yourself yes, Retained in review not yet$/ })
  fireEvent.click(tile)
  expect(opened).toBe('house-robber')
  expect(screen.getAllByRole('button').length).toBe(Object.keys(CHECKS).length)
})
