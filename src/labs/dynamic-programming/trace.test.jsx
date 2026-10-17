// @vitest-environment happy-dom
// The live table and the call tree, used the way a learner uses them.
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import TableTrace, { diagnose, parseCell } from './TableTrace.jsx'
import CallTree from './CallTree.jsx'
import { TRACES } from './tables.js'

afterEach(() => { cleanup(); localStorage.clear() })

const cell = name => screen.getByLabelText(new RegExp(`^${name.replace(/[()]/g, '\\$&')}( |$)`))

describe('live table: watch', () => {
  it('steps through the cells, naming what each one reads and how it is computed', () => {
    render(<TableTrace id="house-robber" />)
    expect(screen.getByText(/Base cases first/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next cell' }))
    expect(screen.getByText('B(1) = max(skip: B(0), take: 3 + 0) = max(0, 3) → 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next cell' }))
    expect(screen.getByText(/It reads B\(1\), B\(0\)/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Jump to the end' }))
    expect(screen.getByText('B(5) = 14')).toBeTruthy()
    expect(cell('B(5)').className).toContain('is-answer')
  })
})

describe('live table: you fill it', () => {
  it('checks each typed value, explains a likely slip, and records a clean run', () => {
    render(<TableTrace id="fibonacci" />)
    fireEvent.click(screen.getByRole('tab', { name: '✎ You fill it' }))
    const box = () => screen.getByLabelText(/^Value of F\(/)
    fireEvent.change(box(), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(screen.getByText(/0 is just F\(0\)/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Show the rule' })).toBeTruthy()
    // Fill the rest correctly.
    const fib = [0, 1, 1, 2, 3, 5, 8, 13, 21]
    for (let i = 2; i <= 8; i++) {
      fireEvent.change(box(), { target: { value: String(fib[i]) } })
      fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    }
    expect(screen.getByText(/Table complete/)).toBeTruthy()
    expect(screen.getByText(/1 mistake/)).toBeTruthy()
    // A run with a mistake but no reveals still counts as filled by the learner.
    expect(screen.getByText(/Filled by you/)).toBeTruthy()
  })
  it('accepts T/F and ∞ in yes-or-no and impossible cells', () => {
    expect(parseCell('t')).toBe(true)
    expect(parseCell('False')).toBe(false)
    expect(parseCell('inf')).toBe(Infinity)
    expect(parseCell('∞')).toBe(Infinity)
    expect(parseCell('x')).toBeUndefined()
    const t = TRACES['coin-min']({ coins: [2], amount: 3 }).table
    expect(t.steps[0].value).toBe(Infinity)
    expect(t.steps[0].rule).toMatch(/no coin fits/)
  })
  it('names an added-instead-of-maximised slip', () => {
    const t = TRACES['house-robber']().table
    const step = t.steps[2] // B(3) = max(B(2), 6 + B(1)) = max(3, 9) = 9
    expect(diagnose(step, t, 6)).toMatch(/adds every cell/) // B(2) + B(1) = 3 + 3
  })
  it('hard mode hides which cells are read', () => {
    render(<TableTrace id="grid-paths" />)
    fireEvent.click(screen.getByRole('tab', { name: '✎ You fill it' }))
    expect(cell('P(0,0)').className).toContain('is-read')
    fireEvent.click(screen.getByLabelText(/Show which cells it reads/))
    expect(cell('P(0,0)').className).not.toContain('is-read')
  })
})

describe('live table: fill order', () => {
  it('refuses a cell whose inputs are empty and names them, then fills a ready one', () => {
    render(<TableTrace id="grid-paths" />)
    fireEvent.click(screen.getByRole('tab', { name: '⇄ Fill order' }))
    fireEvent.click(cell('P(1,1)'))
    expect(screen.getByText(/P\(1,1\) can’t be filled yet/)).toBeTruthy()
    expect(cell('P(0,1)').className).toContain('is-missing')
    fireEvent.click(cell('P(0,1)'))
    expect(screen.getByText('P(0,1) = P(0,0) = 1 → 1')).toBeTruthy()
    fireEvent.click(cell('P(1,0)'))
    fireEvent.click(cell('P(1,1)'))
    expect(screen.getByText('P(1,1) = P(0,1) + P(1,0) = 1 + 1 → 2')).toBeTruthy()
    expect(screen.getByText(/3 of 11 filled · 1 blocked/)).toBeTruthy()
  })
})

describe('live table: change the input', () => {
  it('rebuilds the table from typed values, and explains a bad input', () => {
    render(<TableTrace id="house-robber" />)
    fireEvent.click(screen.getByText('Change the input and rebuild the table'))
    const values = screen.getByLabelText('Values')
    fireEvent.change(values, { target: { value: '5, 1, 1, 5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rebuild the table' }))
    expect(screen.getByRole('heading', { name: 'Houses [5, 1, 1, 5]' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Jump to the end' }))
    expect(screen.getByText('B(4) = 10')).toBeTruthy()
    fireEvent.change(values, { target: { value: '5, banana' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rebuild the table' }))
    expect(screen.getByRole('alert').textContent).toMatch(/whole numbers/)
    fireEvent.click(screen.getByRole('button', { name: 'Lesson example' }))
    expect(screen.getByRole('heading', { name: 'Houses [3, 2, 6, 4, 5]' })).toBeTruthy()
  })
})

describe('call tree', () => {
  it('asks for a prediction, catches the distinct-states slip, and shows what the memo saves', () => {
    render(<CallTree id="fibonacci" />)
    // Nothing on screen gives the count away before the prediction.
    expect(screen.queryByText('calls without memo')).toBeNull()
    expect(screen.queryByRole('button', { name: 'F(2) ×3' })).toBeNull()
    const guess = screen.getByLabelText('Predicted number of calls')
    fireEvent.change(guess, { target: { value: '6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(screen.getByText(/6 is how many different questions/)).toBeTruthy()
    fireEvent.change(guess, { target: { value: '15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(screen.getByText(/Yes: 15 calls, for only 6 different questions/)).toBeTruthy()
    const stats = screen.getByText('calls without memo').parentElement.parentElement
    expect(within(stats).getByText('15')).toBeTruthy()
    expect(within(stats).getByText('9')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'F(2) ×3' })).toBeTruthy()
  })
  it('plays the calls one at a time, with the stack and the returned values', () => {
    render(<CallTree id="fibonacci" />)
    fireEvent.click(screen.getByRole('button', { name: 'Next event' }))
    expect(screen.getByText(/it asks F\(4\) and F\(3\) first/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Show the whole tree' }))
    expect(screen.getByText(/F\(5\) returns 5/)).toBeTruthy()
    fireEvent.click(screen.getByLabelText(/Memo: remember answers/))
    fireEvent.click(screen.getByRole('button', { name: 'Show the whole tree' }))
    expect(screen.getByRole('img', { name: 'Call tree with 9 calls' })).toBeTruthy()
  })
  it('shows the order in which states return, which is a table order', () => {
    render(<CallTree id="grid-paths" />)
    const order = screen.getByText(/From tree to table/).closest('div').querySelectorAll('li span')
    expect([...order].map(s => s.textContent)).toEqual(['P(0,0)', 'P(0,1)', 'P(0,2)', 'P(1,0)', 'P(1,1)', 'P(1,2)', 'P(2,0)', 'P(2,1)', 'P(2,2)'])
  })
})
