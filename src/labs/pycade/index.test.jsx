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
import { EXAMPLES } from './examples.js'

afterEach(() => { cleanup(); delete window.openCalcDesktop; vi.useRealTimers() })
describe('real Python recordings', () => {
  it('records the exact supplied source without errors and reconstructs immutable historical memory', () => {
    expect(qTrace.source).toBe(qSource); expect(a2cTrace.source).toBe(a2cSource)
    expect(qTrace.error).toBeNull(); expect(a2cTrace.error).toBeNull()
    for (const example of Object.values(EXAMPLES)) {
      expect(example.recording.source).toBe(example.source)
      expect(example.recording.error).toBeNull()
    }
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

it('offers new learning examples and treats custom code as general Python', () => {
  render(<PyCade />)
  fireEvent.change(screen.getByLabelText('Learning program'), { target: { value: 'regression' } })
  fireEvent.click(screen.getByRole('button', { name: '2. Inspect inputs and outputs' }))
  expect(screen.getByRole('img', { name: 'Known outputs in gold, current predictions in green' })).toBeTruthy()
  expect(screen.queryByLabelText('Explain the CartPole observation')).toBeNull()
  fireEvent.change(screen.getByLabelText('Learning program'), { target: { value: 'custom' } })
  expect(screen.getByLabelText('Python source editor').value).toContain('def predict_nearest')
  fireEvent.click(screen.getByRole('button', { name: '3. Follow a function call' }))
  expect(screen.getByText('Call path: program → predict_nearest')).toBeTruthy()
  expect(screen.queryByText(/reward · immediate feedback/)).toBeNull()
  const frames = framesOf(EXAMPLES.custom.recording)
  const returned = frames.findIndex(frame => frame.function === 'predict_nearest' && frame.returned)
  fireEvent.change(screen.getByLabelText('Trace position'), { target: { value: returned } })
  expect(screen.getAllByText('[0] item').length).toBeGreaterThan(0)
  expect(frames.at(-1).memory.nearest_index).toBeUndefined()
  expect(frames.at(-1).memory['return value']).toBeUndefined()
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
