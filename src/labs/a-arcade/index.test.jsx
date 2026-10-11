// @vitest-environment happy-dom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import AArcade from './index.jsx'
afterEach(() => { cleanup(); vi.useRealTimers() })
it('returns from a dismantled learner to the working supplied example', () => {
  vi.useFakeTimers()
  render(<AArcade />)
  fireEvent.click(screen.getByRole('button', { name: /05.*Build it back/ }))
  expect(screen.getByLabelText('State representation').checked).toBe(false)
  expect(screen.getByLabelText('Learning / parameter updates').checked).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: /01.*A working agent/ }))
  expect(screen.getByLabelText('State representation').checked).toBe(true)
  expect(screen.getByLabelText('Use the learned action policy').checked).toBe(true)
  expect(screen.getByLabelText('Learning / parameter updates').checked).toBe(false)
  expect(screen.getByRole('button', { name: /Q\[100\]\[1\]/ }).textContent).toContain('27.390')
  fireEvent.click(screen.getByRole('button', { name: 'One action', exact: true }))
  expect(screen.getByText('PREVIEW · MEMORY FROZEN')).toBeTruthy()
})
