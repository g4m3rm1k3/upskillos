// @vitest-environment happy-dom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  openWindow: vi.fn(),
  openPin: vi.fn(),
  getLabEntry: vi.fn(),
  onClose: vi.fn(),
}))

vi.mock('./DesktopProvider.jsx', () => ({ useDesktop: () => ({ openWindow: mocks.openWindow }) }))
vi.mock('../../context/ThemeContext.jsx', () => ({ useGlobalTheme: () => ({ taskbarStyle: 'win11' }) }))
vi.mock('../../context/PinsContext.jsx', () => ({
  usePins: () => ({ pins: [], addPin: vi.fn(), removePin: vi.fn(), isPinned: () => false }),
}))
vi.mock('../../hooks/usePinLauncher.js', () => ({ usePinLauncher: () => ({ openPin: mocks.openPin }) }))
vi.mock('../../labs/labLoader.js', () => ({ getLabEntry: mocks.getLabEntry }))
vi.mock('../../games/gameLoader.js', () => ({ getGameEntry: vi.fn() }))
vi.mock('../../courses/index.js', () => ({
  COURSES: [{ key: 'calculus', label: 'Calculus', path: '/course/calculus' }],
}))

// Remove exit animations so an item from the previous tab cannot count as a
// successful search result while it is waiting to leave the DOM.
vi.mock('framer-motion', async () => {
  const { createElement, forwardRef } = await import('react')
  const element = tag => forwardRef(({
    children, initial, animate, exit, transition, variants, layout, layoutId,
    whileHover, whileTap, ...props
  }, ref) => createElement(tag, { ...props, ref }, children))
  return {
    AnimatePresence: ({ children }) => children,
    motion: { div: element('div'), section: element('section'), button: element('button') },
  }
})

import StartMenu from './StartMenu.jsx'
import { LABS } from '../../labs/labRegistryLoader.js'

function renderMenu() {
  render(<MemoryRouter><StartMenu onClose={mocks.onClose} /></MemoryRouter>)
  return screen.getByPlaceholderText('Search labs, games, tools…')
}

function buttonsFor(key) {
  const lab = LABS.find(item => item.key === key)
  const escapedLabel = lab.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return screen.queryAllByRole('button', { name: new RegExp(`${escapedLabel}$`) })
}

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

describe('Start Menu catalog search', () => {
  it.each(['Courses', '★ Favourites'])('finds labs as someone types after selecting %s', tab => {
    const search = renderMenu()
    fireEvent.click(screen.getByRole('button', { name: tab, exact: true }))
    expect(buttonsFor('ml-foundations')).toHaveLength(0)

    for (const [key, queries] of [
      ['ml-foundations', ['ml', 'ml found', 'machine learning foundations']],
      ['linear-algebra-lab', ['linear', 'linear alg', 'linear algebra lab']],
      ['dynamic-programming', ['dynamic', 'dynamic prog', 'dynamic programming lab']],
      ['game-studio', ['game st']],
      ['codelens', ['codel']],
      ['lesson-engine', ['lesson eng']],
    ]) {
      for (const query of queries) {
        fireEvent.change(search, { target: { value: query } })
        const lab = LABS.find(item => item.key === key)
        // Both the original and new dynamic programming labs share a name;
        // every registered item with that name should remain discoverable.
        expect(buttonsFor(key).length, `${tab}: ${query}`).toBe(
          LABS.filter(item => item.label === lab.label).length,
        )
      }
    }

    fireEvent.change(search, { target: { value: '' } })
    expect(screen.getByRole('button', { name: tab, exact: true })).toBeTruthy()
    expect(buttonsFor('ml-foundations')).toHaveLength(0)
  })

  it('searches descriptive metadata and lab keys', () => {
    const search = renderMenu()
    fireEvent.change(search, { target: { value: 'specialist optimizations' } })
    expect(buttonsFor('dynamic-programming')).toHaveLength(1)
    fireEvent.change(search, { target: { value: 'abstraction-viz' } })
    expect(buttonsFor('abstraction-viz')).toHaveLength(1)
  })

  it('treats whitespace as an empty query and trims typed lab names', () => {
    const search = renderMenu()
    fireEvent.click(screen.getByRole('button', { name: '★ Favourites', exact: true }))
    fireEvent.change(search, { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: '★ Favourites', exact: true })).toBeTruthy()
    expect(screen.getByText('No favourites yet')).toBeTruthy()
    fireEvent.change(search, { target: { value: '  ML   Foundations Lab  ' } })
    expect(buttonsFor('ml-foundations')).toHaveLength(1)
  })

  it('opens the lab selected from search results', async () => {
    const Component = () => <div>ML Foundations</div>
    mocks.getLabEntry.mockResolvedValue({ component: Component })
    const search = renderMenu()
    fireEvent.change(search, { target: { value: 'ml foundations' } })
    fireEvent.click(buttonsFor('ml-foundations')[0])

    expect(mocks.onClose).toHaveBeenCalledOnce()
    expect(mocks.getLabEntry).toHaveBeenCalledWith('ml-foundations')
    await waitFor(() => expect(mocks.openWindow).toHaveBeenCalledWith(expect.objectContaining({
      id: 'ml-foundations', label: 'ML Foundations Lab', Component,
    })))
  })
})
