// @vitest-environment happy-dom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import AArcadeBreakdown from './index.jsx'
afterEach(() => { cleanup(); vi.useRealTimers() })

it('opens on the MDP and goes down to the code, line by line, with this step\'s values', () => {
  vi.useFakeTimers()
  render(<AArcadeBreakdown />)
  expect(screen.getByRole('heading', { level: 2, name: 'The problem: a Markov decision process' })).toBeTruthy()
  // One full action, then the operation's piece shows its own code lines and values.
  fireEvent.click(screen.getByRole('button', { name: 'One action', exact: true }))
  fireEvent.click(screen.getAllByRole('button', { name: /The Q-learning update/ })[0])
  expect(screen.getByRole('heading', { level: 2, name: 'The Q-learning update' })).toBeTruthy()
  expect(screen.getByText('row[action] = before + alpha * error')).toBeTruthy()
  expect(screen.getAllByText(/^this step → /).length).toBeGreaterThan(3)
  // Going down: the update is made of the Bellman equations.
  fireEvent.click(screen.getAllByRole('button', { name: /The Bellman equations/ })[0])
  expect(screen.getByRole('heading', { level: 2, name: 'The Bellman equations' })).toBeTruthy()
})

it('returns from a dismantled learner to the working supplied example', () => {
  vi.useFakeTimers()
  render(<AArcadeBreakdown />)
  fireEvent.click(screen.getByRole('button', { name: /06.*Build it back/ }))
  expect(screen.getByLabelText('State representation').checked).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: /02.*A working agent/ }))
  expect(screen.getByLabelText('State representation').checked).toBe(true)
  expect(screen.getByLabelText('Learning / parameter updates').checked).toBe(false)
  fireEvent.click(screen.getByRole('tab', { name: 'Live memory' }))
  expect(screen.getByRole('button', { name: /Q\[100\]\[1\]/ }).textContent).toContain('27.390')
})
