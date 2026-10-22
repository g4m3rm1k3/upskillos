// @vitest-environment happy-dom
import React from 'react'
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Lab from './index.jsx'
import { LEVELS, CONCEPTS, filterCurriculum } from './curriculum.js'

afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear() })

it('keeps stable unique concept and navigation IDs and scopes for every planned entry', () => {
  const ids = [...LEVELS.map(l => l.id), ...LEVELS.flatMap(l => l.groups.map(g => g.id)), ...CONCEPTS.map(c => c.id)]
  expect(new Set(ids).size).toBe(ids.length)
  for (const concept of CONCEPTS) {
    expect(concept.scope.length).toBeGreaterThan(30)
    expect(['walkthrough', 'ready', 'coming-soon']).toContain(concept.status)
  }
  expect(CONCEPTS.find(c => c.id === 'recursion').status).toBe('walkthrough')
  expect(CONCEPTS.every(c => c.status !== 'coming-soon')).toBe(true)
})

it('finds specialist concepts by scope and intersects level filters', () => {
  expect(filterCurriculum('frontier endpoints')[0].groups[0].concepts.map(c => c.id)).toEqual(['plug-dp'])
  expect(filterCurriculum('frontier endpoints', 'foundations')).toEqual([])
  expect(filterCurriculum('   ')).toEqual(LEVELS)
})

// Every Specialist lesson now has a challenge, so the walkthrough-and-quiz lesson is a Structured one.
it('opens a quiz lesson from a collapsed tree and supports its walkthrough and quiz', () => {
  render(<Lab />)
  fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }))
  expect(screen.queryByRole('button', { name: /Last-action interval DP Walkthrough available/ })).toBeNull()
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'last-action' } })
  fireEvent.click(screen.getByRole('button', { name: /Last-action interval DP Walkthrough available/ }))
  expect(screen.getByRole('heading', { name: 'Last-action interval DP' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '01 · Understand' }))
  expect(screen.getByRole('region', { name: 'Concept walkthrough' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '02 · Walk through' }))
  expect(screen.getAllByText(/removing 2 first gains 6/).length).toBeGreaterThan(0)
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
  expect(screen.getAllByText(/Removing remaining 3 gains 3/).length).toBeGreaterThan(0)
  fireEvent.click(screen.getByRole('button', { name: '03 · Check understanding' }))
  expect(screen.getByText(/single balloon \[5\]/)).toBeTruthy()
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


it('teaches recursion with reversible steps, boundary inputs, and checked predictions', () => {
  render(<Lab />)
  fireEvent.click(screen.getByRole('button', { name: /Recursion and the call stack Walkthrough available/ }))
  expect(screen.getByRole('heading', { name: 'A call is a promise to return an answer' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Previous step' }).disabled).toBe(true)
  fireEvent.click(screen.getByRole('radio', { name: 'JavaScript' }))
  expect(screen.getByText(/function sumTo/)).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox', { name: 'Example input' }), { target: { value: '0' } })
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
  expect(screen.getByRole('list', { name: 'Stack frames' }).children.length).toBe(1)
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
  expect(screen.getByText('Result: 0')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Next step' }).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Previous step' }))
  expect(screen.queryByText('Result: 0')).toBeNull()
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Maximum frames' }), { target: { value: '4' } })
  fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }))
  expect(screen.getByText(/Not yet/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Reveal next hint' }))
  expect(screen.getByText('A frame is still alive while it waits for a smaller call.')).toBeTruthy()
  expect(screen.queryByText('Does the call for zero need its own frame?')).toBeNull()
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Maximum frames' }), { target: { value: '5' } })
  expect(screen.queryByText(/Not yet/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }))
  expect(screen.getByText(/Correct. The live calls/)).toBeTruthy()
})
