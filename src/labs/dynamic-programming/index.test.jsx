// @vitest-environment happy-dom
import React from 'react'
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Lab from './index.jsx'
import { LEVELS, CONCEPTS, filterCurriculum } from './curriculum.js'

afterEach(cleanup)

it('keeps stable unique concept and navigation IDs and scopes for every planned entry', () => {
  const ids = [...LEVELS.map(l => l.id), ...LEVELS.flatMap(l => l.groups.map(g => g.id)), ...CONCEPTS.map(c => c.id)]
  expect(new Set(ids).size).toBe(ids.length)
  for (const concept of CONCEPTS) {
    expect(concept.scope.length).toBeGreaterThan(30)
    expect(concept.status).toBe('coming-soon')
  }
})

it('finds specialist concepts by scope and intersects level filters', () => {
  expect(filterCurriculum('frontier endpoints')[0].groups[0].concepts.map(c => c.id)).toEqual(['plug-dp'])
  expect(filterCurriculum('frontier endpoints', 'foundations')).toEqual([])
  expect(filterCurriculum('   ')).toEqual(LEVELS)
})

it('opens filtered concepts even after collapsing the tree and previews both languages', () => {
  render(<Lab />)
  fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }))
  expect(screen.queryByRole('button', { name: /Plug DP and connectivity labels Coming soon/ })).toBeNull()
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'plug' } })
  fireEvent.click(screen.getByRole('button', { name: /Plug DP and connectivity labels Coming soon/ }))
  expect(screen.getByRole('heading', { name: 'Plug DP and connectivity labels' })).toBeTruthy()
  expect(screen.getByText('solution.py')).toBeTruthy()
  fireEvent.click(screen.getByRole('radio', { name: 'JavaScript' }))
  expect(screen.getByText('solution.js')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Run code · coming soon' }).disabled).toBe(true)
  expect(screen.getByRole('region', { name: 'Progressive hints' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'A small nudge hint coming soon' }).disabled).toBe(true)
  expect(screen.getByText(/They will not reveal the full recurrence/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '← Curriculum overview' }))
  expect(screen.getByRole('heading', { name: 'Coverage by level' })).toBeTruthy()
})

it('recovers from empty filters and navigates coverage families', () => {
  render(<Lab />)
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'no-such-concept' } })
  expect(screen.getByText('No concepts match your filters.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(screen.getByRole('status').textContent).toContain(`${CONCEPTS.length} of ${CONCEPTS.length}`)
  fireEvent.click(screen.getByRole('button', { name: /Profile, frontier, and connectivity DP.*↗/ }))
  expect(screen.getByRole('heading', { name: 'Broken-profile DP' })).toBeTruthy()
  expect(screen.getByRole('combobox').value).toBe('specialist')
})
