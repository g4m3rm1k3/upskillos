// @vitest-environment happy-dom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import AArcadeTrace from './index.jsx'
afterEach(cleanup)

it('starts at run(), steps into a function, and explains what is clicked in the middle', () => {
  const { container } = render(<AArcadeTrace />)
  // Before anything runs: how the pieces fit, starting from run().
  expect(screen.getByRole('heading', { name: /who calls whom/ })).toBeTruthy()
  const step = () => fireEvent.click(screen.getByRole('button', { name: 'Step into' }))
  step(); step()
  // Line 20 runs next and its explanation follows it.
  expect(container.querySelector('.ag-line.current').textContent).toContain('data.state = resetCart(data)')
  expect(screen.getByText('▶ This line runs next')).toBeTruthy()
  step(); step()
  // Inside resetCart(): the call stack shows both functions.
  const stack = within(container.querySelector('.ag-stack'))
  expect(stack.getByText('resetCart()')).toBeTruthy(); expect(stack.getByText('run()')).toBeTruthy()
  // Click the function name in the code: its inputs and outputs are explained.
  const name = [...container.querySelectorAll('.tk-fn')].find(el => el.textContent === 'stepCart')
  fireEvent.click(name)
  expect(screen.getByRole('heading', { name: 'stepCart(state, action, steps)' })).toBeTruthy()
  expect(screen.getByText(/\{ nextState, reward, terminated, truncated \}: the transition/)).toBeTruthy()
  // Click Math.max inside learn(): the JavaScript is explained.
  const max = [...container.querySelectorAll('.tk-name')].find(el => el.textContent === 'max')
  fireEvent.click(max)
  expect(screen.getByRole('heading', { name: 'Math.max' })).toBeTruthy()
})

it('Play walks through run()\'s lines one at a time, and the explanation follows', () => {
  vi.useFakeTimers()
  const { container } = render(<AArcadeTrace />)
  fireEvent.click(screen.getByRole('button', { name: '▶ Play' }))
  const seen = new Set()
  for (let i = 0; i < 12; i++) {
    act(() => { vi.advanceTimersByTime(450) })
    seen.add(container.querySelector('.ag-line.current')?.textContent)
  }
  vi.useRealTimers()
  // Every line of the agent–environment loop came up, not just while (true).
  for (const line of ['const row = stateToRow', 'const action = chooseAction', 'const result = stepCart', 'learn(data, row, action, result)'])
    expect([...seen].some(t => t?.includes(line)), line).toBe(true)
  expect(container.querySelector('.ag-explain pre').textContent).toBe(container.querySelector('.ag-line.current code').textContent.trim())
})

it('Next action stops at the start of the next step, not on the loop header', () => {
  const { container } = render(<AArcadeTrace />)
  fireEvent.click(screen.getByRole('button', { name: 'Next action' }))
  expect(container.querySelector('.ag-line.current').textContent).toContain('const row = stateToRow(data.state)')
})

it('Step back shows each earlier step exactly as it was, and stepping forward replays to the present', () => {
  const { container } = render(<AArcadeTrace />)
  const current = () => container.querySelector('.ag-line.current')?.textContent
  const cart = () => container.querySelector('.ag-cart svg').getAttribute('aria-label')
  const click = name => fireEvent.click(screen.getByRole('button', { name }))
  const seen = []
  for (let i = 0; i < 6; i++) { click('Step into'); seen.push([current(), cart()]) }
  click('Next action'); seen.push([current(), cart()])
  // Back through all of it: every line and cart position comes back in reverse order.
  for (let i = seen.length - 2; i >= 0; i--) {
    click('◀ Step back')
    expect([current(), cart()]).toEqual(seen[i])
  }
  expect(screen.getByRole('status').textContent).toMatch(/Looking back: step 2 of 8/)
  expect(screen.getByLabelText('α alpha').disabled).toBe(true)
  // Forward replays the record (nothing new runs) until the present.
  const count = container.querySelector('.ag-count').textContent
  for (let i = 1; i < seen.length; i++) { click('Step into'); expect([current(), cart()]).toEqual(seen[i]) }
  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.getByLabelText('α alpha').disabled).toBe(false)
  expect(container.querySelector('.ag-count').textContent).not.toBe(count)
  // In the present, stepping runs the program again: more lines have run.
  const before = Number(container.querySelector('.ag-count').textContent.replace(/\D/g, ''))
  click('Step into')
  expect(Number(container.querySelector('.ag-count').textContent.replace(/\D/g, ''))).toBe(before + 1)
})

it('a guided step: predict, check against the real run, then try again with the right answer', () => {
  render(<AArcadeTrace />)
  fireEvent.click(screen.getByRole('button', { name: /One number changes/ }))
  const card = within(screen.getByRole('region', { name: 'Guided step' }))
  expect(card.getByText(/What will Q\[\d+\]\[0\] become\?/)).toBeTruthy()
  // A wrong guess: the program's real value is shown, with the arithmetic.
  fireEvent.change(card.getByLabelText('Your prediction'), { target: { value: '7' } })
  fireEvent.click(card.getByRole('button', { name: 'Check against the real run' }))
  expect(card.getByText('Not quite.')).toBeTruthy()
  const actual = card.getByRole('status').querySelector('.mono').textContent
  expect(card.getByText(/Exactly one of the 512 numbers changed/)).toBeTruthy()
  // The same step again, answered with what the program does: accepted, and marked done.
  fireEvent.click(card.getByRole('button', { name: 'Try this step again' }))
  const again = within(screen.getByRole('region', { name: 'Guided step' }))
  fireEvent.change(again.getByLabelText('Your prediction'), { target: { value: actual } })
  fireEvent.click(again.getByRole('button', { name: 'Check against the real run' }))
  expect(again.getByText('Right.')).toBeTruthy()
  expect(screen.getByRole('button', { name: /✓ One number changes/ })).toBeTruthy()
})

it('an edit step: change the code, run your version, and the step uses it', () => {
  const { container } = render(<AArcadeTrace />)
  fireEvent.click(screen.getByRole('button', { name: /Change the program/ }))
  const editor = screen.getByLabelText('Program source')
  fireEvent.change(editor, { target: { value: editor.value.replace('reward: 1,', 'reward: 2,') } })
  fireEvent.click(screen.getByRole('button', { name: 'Run my version' }))
  expect(screen.getByText(/Every step now pays 2/)).toBeTruthy()
  expect(container.querySelector('.ag-line.edited').textContent).toContain('reward: 2')
  // An edit that can't be stepped through is refused with its line number.
  fireEvent.click(screen.getByRole('button', { name: '✎ Edit the program' }))
  const box = screen.getByLabelText('Program source')
  fireEvent.change(box, { target: { value: box.value.replace('const old = data.Q[row][action]', 'const old = 1 + stateToRow(result.nextState)') } })
  fireEvent.click(screen.getByRole('button', { name: 'Run my version' }))
  expect(screen.getByRole('alert').textContent).toMatch(/line \d+/)
})

it('the phase bar runs to a part of the loop, and the next line\'s arithmetic is worked out with real numbers', () => {
  const { container } = render(<AArcadeTrace />)
  fireEvent.click(within(screen.getByRole('toolbar', { name: 'Parts of the loop' })).getByRole('button', { name: /^Learn/ }))
  expect(container.querySelector('.ag-line.current').textContent).toContain('learn(data, row, action, result)')
  // Into learn(), to a line with arithmetic: shown in the code and in the explanation.
  const step = () => fireEvent.click(screen.getByRole('button', { name: 'Step into' }))
  for (let i = 0; i < 400 && !container.querySelector('.ag-line.current')?.textContent.includes('const target'); i++) step()
  expect(container.querySelector('.ag-calc-inline').textContent).toMatch(/this line will work out: 1 \+ 0\.99/)
  expect(screen.getByRole('heading', { name: 'With this step\'s numbers' })).toBeTruthy()
  // Where a value came from: its origin line is a link.
  expect(container.querySelector('.ag-vars .ag-origin')).toBeTruthy()
})

it('Next action moves the cart and highlights what changed', () => {
  const { container } = render(<AArcadeTrace />)
  fireEvent.click(screen.getByRole('button', { name: 'Next action' }))
  fireEvent.click(screen.getByRole('button', { name: 'Next action' }))
  expect(container.querySelector('.ag-changes').textContent).toMatch(/state\[0\]/)
})
