// @vitest-environment happy-dom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, act, within } from '@testing-library/react'
import * as runtime from './runtime.js'
import { DRAFT_KEY, loadDraft, saveDraft, rebaseDraft, fingerprint } from './drafts.js'
import { toIpynb, errorHint } from './LessonNotebook.jsx'
import MLLab from '../index.jsx'

// An editable stand-in for Monaco.
vi.mock('@monaco-editor/react', () => ({ default: ({ value, onChange, options }) => <textarea aria-label={options.ariaLabel} value={value} onChange={e => onChange?.(e.target.value)} /> }))

// A fake worker that answers like notebook.worker.js. Code containing "while True" never finishes.
class FakeWorker {
  static all = []
  constructor() { this.sent = []; this.terminated = false; FakeWorker.all.push(this) }
  postMessage(msg) {
    this.sent.push(msg)
    if (msg.type !== 'run' || /while True/.test(msg.code)) return
    queueMicrotask(() => {
      if (this.terminated) return
      this.onmessage({ data: { type: 'stream', job: msg.job, name: 'stdout', text: `ran: ${msg.code.split('\n')[0]}` } })
      this.onmessage({ data: { type: 'done', job: msg.job, ok: !/raise/.test(msg.code), ename: 'NameError', evalue: "name 'x' is not defined", traceback: "NameError: name 'x' is not defined", figures: [] } })
    })
  }
  terminate() { this.terminated = true }
}
const flush = () => act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve() })

beforeEach(() => { FakeWorker.all = []; runtime.setWorkerFactory(() => new FakeWorker()); window.open = vi.fn(); window.confirm = () => true })
afterEach(() => { runtime.stop(); cleanup(); localStorage.clear() })

describe('notebook runtime', () => {
  it('runs one cell at a time, in order, with output routed to the right run', async () => {
    const out = []
    const a = runtime.run('nb1', 'print(1)', { onStream: (_, t) => out.push(t) })
    const b = runtime.run('nb2', 'print(2)')
    expect(FakeWorker.all[0].sent.filter(m => m.type === 'run')).toHaveLength(1)   // the second waits
    expect(await a).toMatchObject({ ok: true })
    expect(out).toEqual(['ran: print(1)'])
    expect(await b).toMatchObject({ ok: true })
    expect(FakeWorker.all[0].sent.filter(m => m.type === 'run').map(m => m.ns)).toEqual(['nb1', 'nb2'])
  })
  it('stop ends an infinite loop, cancels queued runs, bumps the generation and starts a fresh worker next time', async () => {
    const gen = runtime.getGeneration()
    const loop = runtime.run('nb1', 'while True: pass'), queued = runtime.run('nb1', 'print(3)')
    runtime.stop()
    expect(await loop).toMatchObject({ ok: false, stopped: true, generation: gen + 1 })
    expect(await queued).toMatchObject({ stopped: true })
    expect(FakeWorker.all[0].terminated).toBe(true)
    expect(await runtime.run('nb1', 'print(4)')).toMatchObject({ ok: true })
    expect(FakeWorker.all).toHaveLength(2)
  })
  it('a worker that fails to start reports a runtime error and can be retried', async () => {
    runtime.setWorkerFactory(() => { const w = new FakeWorker(); w.postMessage = () => queueMicrotask(() => w.onerror({ message: 'network' })); return w })
    const gen = runtime.getGeneration()
    expect(await runtime.run('nb1', 'print(1)')).toMatchObject({ ok: false, runtimeError: true })
    expect(runtime.getGeneration()).toBe(gen + 1)   // every namespace died with the worker
    runtime.setWorkerFactory(() => new FakeWorker())
    expect(await runtime.run('nb1', 'print(1)')).toMatchObject({ ok: true })
  })
})

describe('notebook drafts', () => {
  const originals = ['a = 1', 'print(a)']
  it('saves only real edits and restores them', () => {
    saveDraft('n', originals, ['a = 2', 'print(a)'])
    expect(loadDraft('n', originals)).toEqual({ codes: ['a = 2', 'print(a)'], edited: true, outdated: false })
    saveDraft('n', originals, [...originals])
    expect(JSON.parse(localStorage.getItem(DRAFT_KEY)).n).toBeUndefined()
  })
  it('detects a course update and keeps the learner’s code until they choose', () => {
    saveDraft('n', originals, ['a = 2', 'print(a)'])
    const updated = ['a = 1', 'print(a * 10)', 'print("new")']
    const d = loadDraft('n', updated)
    expect(d).toMatchObject({ edited: true, outdated: true })
    expect(d.codes).toEqual(['a = 2', 'print(a)', 'print("new")'])
    rebaseDraft('n', updated, d.codes)
    expect(loadDraft('n', updated).outdated).toBe(false)
    expect(fingerprint(originals)).not.toBe(fingerprint(updated))
  })
})

describe('export and hints', () => {
  const exportCase = () => toIpynb(
    { title: 'T', intro: 'I', cells: [{ title: 'one', code: 'x' }, { code: 'y' }, { code: 'z' }, { code: 'w' }] },
    ['x = 5', 'print(x)\nx', 'plt.plot([1])', 'edited since it ran'],
    {
      outputs: [null, { text: '5\n', value: '5' }, { text: '', figures: ['iVBORw0KGgo='], error: { ename: 'NameError', evalue: "name 'plt' is not defined", traceback: 'Traceback\nNameError: name \'plt\' is not defined' } }, { text: 'old output\n' }],
      counts: [null, 3, 4, 5],
      ranCode: [null, 'print(x)\nx', 'plt.plot([1])', 'the code that produced it'],
    })
  it('exports the edited code in order, as nbformat 4, with every kind of output the app showed', () => {
    const nb = JSON.parse(exportCase())
    const code = nb.cells.filter(c => c.cell_type === 'code')
    expect(nb.nbformat).toBe(4)
    expect(code.map(c => c.source.join(''))).toEqual(['x = 5', 'print(x)\nx', 'plt.plot([1])', 'edited since it ran'])
    expect(code[1].outputs).toEqual([
      { output_type: 'stream', name: 'stdout', text: ['5\n'] },
      { output_type: 'execute_result', execution_count: 3, data: { 'text/plain': ['5'] }, metadata: {} },
    ])
    expect(code[1].execution_count).toBe(3)
    expect(code[2].outputs.map(o => o.output_type)).toEqual(['display_data', 'error'])
    expect(code[2].outputs[0].data['image/png']).toBe('iVBORw0KGgo=')
    expect(code[2].outputs[1]).toMatchObject({ ename: 'NameError', traceback: ['Traceback', "NameError: name 'plt' is not defined"] })
  })
  it('leaves out outputs of a cell edited since it ran, rather than attributing them to the new code', () => {
    const code = JSON.parse(exportCase()).cells.filter(c => c.cell_type === 'code')
    expect(code[3]).toMatchObject({ outputs: [], execution_count: null })
    expect(code[0]).toMatchObject({ outputs: [], execution_count: null })
  })
  it('explains reset variables for a NameError', () => {
    expect(errorHint({ ename: 'NameError', evalue: "name 'X' is not defined" })).toMatch(/X.*Run all/)
    expect(errorHint({ stopped: true })).toMatch(/code is kept/)
  })
})

describe('edits survive every transition on the lesson page', () => {
  // Lesson 00a shows its cells inline, beside the paragraphs they illustrate.
  const openNotebook = async () => await screen.findByLabelText('Notebook cell 2 code')
  const cell = () => screen.getByLabelText('Notebook cell 2 code')
  it('reflection, checkpoint, hide/show, lesson change and reload', async () => {
    render(<MLLab />)
    fireEvent.change(await openNotebook(), { target: { value: 'weights = np.array([4, 6])  # my edit' } })
    fireEvent.change(screen.getByPlaceholderText('Explain it in your own words. Saved on this device.'), { target: { value: 'A reflection' } })
    expect(cell().value).toMatch(/my edit/)
    fireEvent.change(screen.getByLabelText('Checkpoint answer'), { target: { value: '23' } })
    fireEvent.click(screen.getByText('Check answer', { selector: 'button' }))
    expect(cell().value).toMatch(/my edit/)
    fireEvent.click(screen.getByText('Show all 5 cells in order'))
    expect(screen.getAllByLabelText('Notebook cell 2 code').every(c => /my edit/.test(c.value))).toBe(true)
    fireEvent.click(screen.getByText('Hide the full list of cells'))
    expect(await openNotebook()).toHaveProperty('value', expect.stringMatching(/my edit/))
    fireEvent.click(screen.getByText('Next lesson →', { selector: 'button' }))
    fireEvent.click(screen.getByText('← Previous', { selector: 'button' }))
    expect((await openNotebook()).value).toMatch(/my edit/)
    cleanup(); render(<MLLab />)                                  // reload
    expect((await openNotebook()).value).toMatch(/my edit/)
  })
  it('copies and downloads the edited cells, and resets on request', async () => {
    render(<MLLab />)
    fireEvent.change(await openNotebook(), { target: { value: 'weights = np.array([9, 9])' } })
    fireEvent.click(screen.getByText(/Copy my version to Notebook Lab/))
    const saved = Object.values(JSON.parse(localStorage.getItem('oc-notebook-lab')))[0]
    expect(saved.cells[1].code).toBe('weights = np.array([9, 9])')
    expect(saved.cells.map(c => c.cellTitle)[0]).toBe('Same expression, two meanings')
    let blob
    URL.createObjectURL = vi.fn(b => { blob = b; return 'blob:x' }); URL.revokeObjectURL = vi.fn()
    fireEvent.click(screen.getByText(/Download my notebook/))
    expect(JSON.parse(await blob.text()).cells.filter(c => c.cell_type === 'code')[1].source.join('')).toBe('weights = np.array([9, 9])')
    fireEvent.click(screen.getByText('Reset to the original cells'))
    expect(cell().value).toMatch(/weights = np.array\(\[4, 5\]\)/)
  })
  it('runs a cell, stops an infinite loop without losing code, and says variables were reset', async () => {
    render(<MLLab />)
    await openNotebook()
    const first = within(screen.getByRole('region', { name: /Cell 1/ }))
    fireEvent.click(first.getByText('Run cell'))
    await flush()
    expect(first.getByText(/ran: import numpy as np/)).toBeTruthy()
    fireEvent.change(cell(), { target: { value: 'while True: pass' } })
    fireEvent.click(within(screen.getByRole('region', { name: /Cell 2/ })).getByText('Run cell'))
    await flush()
    fireEvent.click(screen.getByText('Stop', { selector: 'button' }))
    await flush()
    expect(cell().value).toBe('while True: pass')
    expect(screen.getByText(/Python was restarted since this notebook last ran/)).toBeTruthy()
    expect(screen.getAllByText(/variables from earlier cells are gone/).length).toBeGreaterThan(0)
  })
  it('reports a course update to an edited notebook instead of overwriting it', async () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ arrays: { base: 'old', cells: ['print("mine")'] } }))
    render(<MLLab />)
    await openNotebook()
    expect(screen.getByLabelText('Notebook cell 1 code').value).toBe('print("mine")')
    expect(screen.getByText(/has been updated since you edited it/)).toBeTruthy()
    fireEvent.click(screen.getByText('Keep my version'))
    expect(screen.queryByText(/has been updated since you edited it/)).toBeNull()
  })
})

// Writes one export to disk for `nbformat.validate` (see tools/verify-ipynb.py) when asked to.
if (process.env.ML_WRITE_IPYNB) {
  it('writes a sample export', async () => {
    const { writeFileSync } = await import('node:fs')
    writeFileSync(process.env.ML_WRITE_IPYNB, toIpynb(
      { title: 'T', intro: 'I', cells: [{ title: 'one', prose: 'p', code: 'x' }, { code: 'y' }, { code: 'z' }] },
      ['x = 5', 'print(x)\nx', 'plt.plot([1])'],
      { outputs: [null, { text: '5\n', value: '5' }, { text: '', figures: ['iVBORw0KGgo='], error: { ename: 'NameError', evalue: 'n', traceback: 'Traceback\nNameError: n' } }], counts: [null, 3, 4], ranCode: [null, 'print(x)\nx', 'plt.plot([1])'] }))
  })
}
