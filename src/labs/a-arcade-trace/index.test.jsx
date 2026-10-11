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
  expect(container.querySelector('.at-line.current').textContent).toContain('data.state = resetCart(data)')
  expect(screen.getByText('▶ This line runs next')).toBeTruthy()
  step(); step()
  // Inside resetCart(): the call stack shows both functions.
  const stack = within(container.querySelector('.at-stack'))
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
    seen.add(container.querySelector('.at-line.current')?.textContent)
  }
  vi.useRealTimers()
  // Every line of the agent–environment loop came up, not just while (true).
  for (const line of ['const row = stateToRow', 'const action = chooseAction', 'const result = stepCart', 'learn(data, row, action, result)'])
    expect([...seen].some(t => t?.includes(line)), line).toBe(true)
  expect(container.querySelector('.at-explain pre').textContent).toBe(container.querySelector('.at-line.current code').textContent.trim())
})

it('Next action stops at the start of the next step, not on the loop header', () => {
  const { container } = render(<AArcadeTrace />)
  fireEvent.click(screen.getByRole('button', { name: 'Next action' }))
  expect(container.querySelector('.at-line.current').textContent).toContain('const row = stateToRow(data.state)')
})

it('Step back shows each earlier step exactly as it was, and stepping forward replays to the present', () => {
  const { container } = render(<AArcadeTrace />)
  const current = () => container.querySelector('.at-line.current')?.textContent
  const cart = () => container.querySelector('.at-cart svg').getAttribute('aria-label')
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
  const count = container.querySelector('.at-count').textContent
  for (let i = 1; i < seen.length; i++) { click('Step into'); expect([current(), cart()]).toEqual(seen[i]) }
  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.getByLabelText('α alpha').disabled).toBe(false)
  expect(container.querySelector('.at-count').textContent).not.toBe(count)
  // In the present, stepping runs the program again: more lines have run.
  const before = Number(container.querySelector('.at-count').textContent.replace(/\D/g, ''))
  click('Step into')
  expect(Number(container.querySelector('.at-count').textContent.replace(/\D/g, ''))).toBe(before + 1)
})

it('Next action moves the cart and highlights what changed', () => {
  const { container } = render(<AArcadeTrace />)
  fireEvent.click(screen.getByRole('button', { name: 'Next action' }))
  fireEvent.click(screen.getByRole('button', { name: 'Next action' }))
  expect(container.querySelector('.at-changes').textContent).toMatch(/state\[0\]/)
})
