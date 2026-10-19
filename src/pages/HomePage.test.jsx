// @vitest-environment happy-dom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../hooks/useProgress.js', () => ({
  useProgress: () => ({ getLessonProgress: () => ({ status: 'not-started' }) }),
}))
vi.mock('../hooks/usePinLauncher.js', () => ({ usePinLauncher: () => ({ openPin: vi.fn() }) }))
vi.mock('../data/labProgress.js', () => ({ getLabInProgressItems: () => [] }))
vi.mock('../components/backgrounds/UniverseBackground.jsx', () => ({ default: () => null }))

import HomePage from './HomePage.jsx'

afterEach(cleanup)

describe('Home catalog search', () => {
  it('shows matching labs as the user types, regardless of the selected topic', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Spotlight' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '⚛ Science', exact: true }))

    const input = screen.getByRole('textbox', { name: 'Search courses, labs and games' })
    for (const [query, name] of [
      ['ML Found', 'ML Foundations Lab'],
      ['machine learning foundations', 'ML Foundations Lab'],
      ['linear algebra lab', 'Linear Algebra Lab'],
      ['dynamic programming lab', 'Dynamic Programming Lab'],
      ['  KartLab  ', 'KartLab'],
    ]) {
      fireEvent.change(input, { target: { value: query } })
      expect(screen.getAllByRole('heading', { level: 4, name, exact: true }).length, query).toBeGreaterThan(0)
    }

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(input.value).toBe('')
    expect(screen.queryByRole('heading', { level: 4, name: 'ML Foundations Lab' })).toBeNull()
  })
})
