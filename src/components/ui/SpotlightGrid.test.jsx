// @vitest-environment happy-dom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const openPin = vi.fn()
vi.mock('../../hooks/usePinLauncher.js', () => ({ usePinLauncher: () => ({ openPin }) }))

import SpotlightGrid from './SpotlightGrid.jsx'
import { SPOTLIGHT } from '../../data/spotlight.js'
import { resolveEntry } from './TopicTable.jsx'
import { TOPICS, TOPIC_ORDER } from '../../data/topicGroups.js'

afterEach(cleanup)

describe('Spotlight', () => {
  it('every entry is a real app in its registry (a renamed key would silently vanish)', () => {
    for (const item of SPOTLIGHT) {
      expect(resolveEntry({ kind: item.kind, key: item.key }), `${item.kind}:${item.key}`).not.toBeNull()
      expect(item.highlights.length, item.key).toBeGreaterThan(0)
    }
  })

  it('leads with the apps chosen for it, in order', () => {
    expect(SPOTLIGHT.map(i => i.key)).toEqual(['lesson-engine', 'codelens', 'openmat', 'calculus', 'linear-algebra', 'html-lab', 'notebook-lab', 'ml-lab',
      'qmaze-lab', 'neural-net-lab', 'mesh-lab', 'code-typing', 'project-studio', 'dsa-patterns', 'game-studio', 'backend-lab'])
  })

  it('is the first category on the Home page', () => {
    expect(TOPIC_ORDER[0]).toBe('spotlight')
    expect(TOPICS.spotlight.subtopics.featured.items.map(i => i.key)).toEqual(SPOTLIGHT.map(i => i.key))
  })

  it('renders every app with its description and opens it', () => {
    render(<MemoryRouter><SpotlightGrid /></MemoryRouter>)
    for (const item of SPOTLIGHT) expect(screen.getByText(item.headline)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Open CodeLens/ }))
    expect(openPin).toHaveBeenCalledWith(expect.objectContaining({ id: 'codelens', labKey: 'codelens' }))
  })
})
