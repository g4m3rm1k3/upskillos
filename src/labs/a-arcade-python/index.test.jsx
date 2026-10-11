// @vitest-environment happy-dom
import React from 'react'
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AArcadePython from './index.jsx'
afterEach(cleanup)

it('in the browser, says it needs the desktop app and points to the JavaScript version', () => {
  render(<MemoryRouter><AArcadePython /></MemoryRouter>)
  expect(screen.getByText(/needs the UpSkillOS desktop app/)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'A-Arcade Guided' })).toBeTruthy()
})
