// @vitest-environment happy-dom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import PyCade from './index.jsx'
import qTrace from './q-trace.json'
import a2cTrace from './a2c-trace.json'
import qSource from './python/q_learning.py?raw'
import a2cSource from './python/a2c.py?raw'
import { framesOf, parseKernelResult, kernelCode, valueAtPath } from './trace.js'

afterEach(() => { cleanup(); delete window.openCalcDesktop; vi.useRealTimers() })
describe('real Python recordings', () => {
  it('records the exact supplied source without errors and reconstructs immutable historical memory', () => {
    expect(qTrace.source).toBe(qSource); expect(a2cTrace.source).toBe(a2cSource)
    expect(qTrace.error).toBeNull(); expect(a2cTrace.error).toBeNull()
    const frames = framesOf(qTrace), firstTable = frames.find(f => f.changes.q)
    expect(firstTable.memory.q.value.flat().every(v => v === 0)).toBe(true)
    expect(valueAtPath(firstTable.memory, 'q[0][1]').value).toBe(0)
    const actorFrame = framesOf(a2cTrace).find(f => f.changes.actor)
    expect(valueAtPath(actorFrame.memory, 'actor.0.weight.weights[0][0]').value).toBeTypeOf('number')
    expect(frames.at(-1).memory.q.value.flat().some(v => v !== 0)).toBe(true)
    expect(firstTable.memory.q.value.flat().every(v => v === 0)).toBe(true)
  })
  it('parses split native streams and rejects kernel failures', () => {
    expect(parseKernelResult({ ok: true, messages: [{ type: 'stream', text: 'PYCADE_' }, { type: 'stream', text: `TRACE:${JSON.stringify(qTrace)}\n` }] })).toEqual(qTrace)
    expect(() => parseKernelResult({ ok: false, reason: 'No Python' })).toThrow('No Python')
    expect(() => parseKernelResult({ ok: true, messages: [{ type: 'error', text: 'Missing torch' }] })).toThrow('Missing torch')
    expect(kernelCode('print("hello")')).toContain('trace_program')
  })
})
it('keeps tuple explanation, nested prerequisites and original code together', () => {
  render(<PyCade />)
  fireEvent.click(screen.getByRole('button', { name: '2. Unpack a real return value' }))
  expect(screen.getByText('[1] reward · immediate feedback')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Tuple / fixed slots' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /Observation \/ the four measurements.*↗/ }))
  expect(screen.getByRole('heading', { name: 'Observation / the four measurements' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '← Back one explanation' }))
  expect(screen.getByRole('heading', { name: 'Tuple / fixed slots' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '3. Follow one learning update' }))
  expect(screen.getByText('Q(s,a) ← Q(s,a) + α × (target − Q(s,a))')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Run Python & capture trace' }).disabled).toBe(true)
})
it('runs edited Python through the native kernel and displays the returned source', async () => {
  const run = vi.fn(async () => ({ ok: true, messages: [{ type: 'stream', text: `PYCADE_TRACE:${JSON.stringify({ ...qTrace, source: qSource.replace('alpha = 0.12', 'alpha = 1.0') })}\n` }] }))
  window.openCalcDesktop = { kernel: { run } }
  render(<PyCade />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit Python' }))
  fireEvent.change(screen.getByLabelText('Python source editor'), { target: { value: qSource.replace('alpha = 0.12', 'alpha = 1.0') } })
  expect(screen.getByText(/Editor changed/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Run Python & capture trace' }))
  await waitFor(() => expect(screen.getByText(/Native Python run/)).toBeTruthy())
  expect(run.mock.calls[0][0]).toContain('alpha = 1.0')
  expect(screen.queryByText(/Editor changed/)).toBeNull()
})
