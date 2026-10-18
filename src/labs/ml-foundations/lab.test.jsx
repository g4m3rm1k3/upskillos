// @vitest-environment happy-dom
// The lab used as a learner would: Try it gates the explanations, the step-through stops for
// predictions (a wrong one names the slip), the map editor refuses bad text with parse_map's own
// message, and a passed challenge shows everywhere and joins the toolbox.
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'

const calls = []
vi.mock('./runtime/runner.js', () => ({
  startAttempt: opts => {
    calls.push(opts)
    if (opts.mode === 'run') opts.onDone({ output: 'hello from print\n', called: true, returned: "{'right': (0, 1)}" })
    else opts.onDone({ passed: true, rows: opts.cases.map(() => ({ passed: true, actual: 'ok' })), output: '' })
    return () => {}
  },
}))
const { default: Lab } = await import('./index.jsx')
const { STORE } = await import('./progress.js')

afterEach(() => { cleanup(); localStorage.clear(); calls.length = 0 })

const openLesson = title => fireEvent.click(screen.getAllByRole('button').find(b => b.textContent.includes(title) && b.className.includes('mlf-nav')))
const stage = name => fireEvent.click(screen.getAllByRole('button').find(b => b.className.includes('mlf-stage') && b.textContent.includes(name)))

describe('the ML Foundations lab', () => {
  it('opens on lesson 0, with Try it first and the rest locked until it is done or skipped', () => {
    render(<Lab />)
    expect(screen.getByRole('heading', { name: 'The finish line' })).toBeTruthy()
    stage('Understand')
    expect(screen.getByText(/Try it first\./)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Skip: I've done this before/ }))
    expect(screen.getByText(/What "learning" means here/)).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(STORE)).finish.stages.try).toBe(true)
  })

  it('lesson 1 Try it: a swapped (column, row) click gets a named diagnosis', () => {
    render(<Lab />)
    openLesson('Maps from text')
    fireEvent.click(screen.getAllByRole('button', { name: /^row 3, column 1/ })[0])
    expect(screen.getByText(/the two numbers swapped/)).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: /^row 1, column 3/ })[0])
    expect(screen.getByText(/Programs write this as the pair/)).toBeTruthy()
  })

  it('the step-through stops to ask, names a wrong prediction, and moves on after a right one', () => {
    localStorage.setItem(STORE, JSON.stringify({ maps: { stages: { try: true }, checks: [], code: {} } }))
    render(<Lab />)
    openLesson('Maps from text')
    stage('Watch it run')
    const stepper = screen.getAllByRole('region', { name: /Step through parse_map/ })[0] ?? screen.getAllByLabelText(/Step through parse_map/)[0]
    const forward = within(stepper).getByRole('button', { name: 'Step forward' })
    for (let i = 0; i < 60 && !within(stepper).queryByText(/Predict before it runs/); i++) fireEvent.click(forward)
    expect(within(stepper).getByText(/Under which key/)).toBeTruthy()
    const input = within(stepper).getByLabelText('Your prediction')
    const prompt = within(stepper).getByText(/The loop is at r = /).textContent
    const [, r, c] = /r = (\d+), c = (\d+)/.exec(prompt)
    fireEvent.change(input, { target: { value: `(${c}, ${r})` } })
    fireEvent.click(within(stepper).getByRole('button', { name: 'Check' }))
    expect(within(stepper).getByText(/That is \(column, row\)/)).toBeTruthy()
    fireEvent.change(input, { target: { value: `(${r}, ${c})` } })
    fireEvent.click(within(stepper).getByRole('button', { name: 'Check' }))
    expect(within(stepper).getByText(/Right\./)).toBeTruthy()
    expect(within(stepper).getByText(/Predictions: 0 right first time, of 1/)).toBeTruthy()
  })

  it('the map editor shows parse_map\'s message for bad text', () => {
    localStorage.setItem(STORE, JSON.stringify({ maps: { stages: { try: true }, checks: [], code: {} } }))
    render(<Lab />)
    openLesson('Maps from text')
    stage('Watch it run')
    const box = screen.getAllByLabelText('The map as text')[0]
    fireEvent.change(box, { target: { value: 'S.#\n#.\n##G' } })
    expect(screen.getByRole('alert').textContent).toMatch(/row 1 has 2 squares, expected 3/)
  })

  it('Run shows prints and the value; a pass shows ✓ and joins the toolbox; later prelude uses it', () => {
    localStorage.setItem(STORE, JSON.stringify({ maps: { stages: { try: true }, checks: [], code: {} } }))
    render(<Lab />)
    openLesson('Maps from text')
    stage('Write it')
    const parse = screen.getByRole('region', { name: 'Write parse_map' }) ?? null
    const editor = within(parse).getByLabelText('Your Python for Write parse_map')
    fireEvent.change(editor, { target: { value: 'def parse_map(text):\n    return "mine"\n' } })
    fireEvent.click(within(parse).getByRole('button', { name: '▶ Run' }))
    expect(within(parse).getByText('hello from print')).toBeTruthy()
    fireEvent.click(within(parse).getByRole('button', { name: '✓ Run & check' }))
    expect(within(parse).getByText(/All 7 checks passed/)).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(STORE)).maps.code['maps-parse'].passed).toBe(true)
    expect(screen.getAllByText('✓ yours').length).toBeGreaterThan(0)
    const moves = screen.getByRole('region', { name: 'Write legal_moves' })
    fireEvent.click(within(moves).getByRole('button', { name: '▶ Run' }))
    expect(calls.at(-1).prelude).toContain('return "mine"')
  })
})
