// @vitest-environment happy-dom
import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import RubiksCube from './RubiksCube.jsx'

beforeEach(() => { vi.useFakeTimers(); render(<RubiksCube />); fireEvent.click(screen.getByText('Play Now →')) })
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers() })
const turn = (name) => { fireEvent.click(screen.getByRole('button', { name, exact: true })); act(() => vi.advanceTimersByTime(400)) }

it('turns, undoes, and keeps history beyond twenty moves', () => {
  for (let n = 0; n < 21; n++) turn(n % 2 ? 'U' : 'R')
  for (let n = 0; n < 21; n++) fireEvent.click(screen.getByRole('button', { name: '↩ Undo' }))
  expect(screen.getByText('SOLVED ✓')).toBeTruthy()
  expect(screen.getByRole('button', { name: '↩ Undo' }).disabled).toBe(true)
})
it('reset cancels a move and every pending sequence step', () => {
  fireEvent.click(screen.getByRole('button', { name: /Execute/ }))
  act(() => vi.advanceTimersByTime(400))
  fireEvent.click(screen.getByText('Reset / Solved'))
  act(() => vi.advanceTimersByTime(5000))
  expect(screen.getByText('SOLVED ✓')).toBeTruthy()
  expect(screen.getByText('No moves yet')).toBeTruthy()
})
it('reports order from a mixed state and counts half-turn cycles correctly', () => {
  turn('F'); turn('R2')
  fireEvent.click(screen.getByText('Show order of last move'))
  expect(screen.getByText('Order = 2')).toBeTruthy()
  expect(screen.getByText(/shifts 20 stickers in 10 cycles/)).toBeTruthy()
})
it('walks a beginner through a move and its inverse', () => {
  fireEvent.click(screen.getByRole('button', { name: /1\. A turn/ }))
  turn('R'); turn("R'")
  expect(screen.getByText('Observed: back to solved.')).toBeTruthy()
})
it('cleans up pending work when closed', () => {
  fireEvent.click(screen.getByRole('button', { name: /Execute/ }))
  cleanup()
  expect(vi.getTimerCount()).toBe(0)
})
