// @vitest-environment happy-dom
// The Special Characters reference: it draws every section, search narrows it, and a click
// copies the character and shows its details.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import SpecialCharactersPage from './SpecialCharactersPage.jsx'
import { SECTIONS } from '../reference/special-characters-data.js'

afterEach(cleanup)

describe('SpecialCharactersPage', () => {
  it('draws every section and the Alt code chart', () => {
    render(<SpecialCharactersPage />)
    for (const s of SECTIONS) expect(screen.getAllByText(s.title).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Alt code chart (Windows)').length).toBeGreaterThan(0)
  })

  it('finds a letter by its RL meaning', () => {
    render(<SpecialCharactersPage />)
    fireEvent.change(screen.getByLabelText('Search special characters'), { target: { value: 'discount factor' } })
    expect(screen.getByLabelText('Copy gamma')).toBeTruthy()
    expect(screen.queryByLabelText('Copy alpha')).toBeNull()
  })

  it('copies on click and shows the name, code point and keys', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<SpecialCharactersPage />)
    await act(async () => { fireEvent.click(screen.getByLabelText('Copy degree')) })
    expect(writeText).toHaveBeenCalledWith('°')
    const details = screen.getByRole('region', { name: 'Character details' })
    expect(details.textContent).toContain('DEGREE SIGN')
    expect(details.textContent).toContain('U+00B0')
    expect(details.textContent).toContain('Alt+0176')
    expect(details.textContent).toContain('Alt+248')
    expect(details.textContent).toContain('⌥⇧8')
  })
})
