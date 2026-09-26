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
  it('passes importsFrom to the worker, so code run from a string still gets its packages', async () => {
    await runtime.run('nb1', 'print(1)', { importsFrom: 'from sklearn.linear_model import Ridge' })
    expect(FakeWorker.all[0].sent.find(m => m.type === 'run').importsFrom).toBe('from sklearn.linear_model import Ridge')
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
  // Lesson 00a shows its cells inline, beside the paragraphs they illustrate. Cell 1 is the orientation
  // cell; cell 3 holds the weights.
  const openNotebook = async () => await screen.findByLabelText('Notebook cell 3 code')
  const cell = () => screen.getByLabelText('Notebook cell 3 code')
  it('reflection, checkpoint, hide/show, lesson change and reload', async () => {
    render(<MLLab />)
    fireEvent.change(await openNotebook(), { target: { value: 'weights = np.array([4, 6])  # my edit' } })
    fireEvent.change(screen.getByPlaceholderText('Explain it in your own words. Saved on this device.'), { target: { value: 'A reflection' } })
    expect(cell().value).toMatch(/my edit/)
    fireEvent.change(screen.getByLabelText('Checkpoint answer'), { target: { value: '23' } })
    fireEvent.click(screen.getByText('Check answer', { selector: 'button' }))
    expect(cell().value).toMatch(/my edit/)
    fireEvent.click(screen.getByText('Show all 6 cells in order'))
    expect(screen.getAllByLabelText('Notebook cell 3 code').every(c => /my edit/.test(c.value))).toBe(true)
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
    expect(saved.cells[2].code).toBe('weights = np.array([9, 9])')
    expect(saved.cells.map(c => c.cellTitle).slice(0, 2)).toEqual(['How the cells work', 'Same expression, two meanings'])
    let blob
    URL.createObjectURL = vi.fn(b => { blob = b; return 'blob:x' }); URL.revokeObjectURL = vi.fn()
    fireEvent.click(screen.getByText(/Download my notebook/))
    expect(JSON.parse(await blob.text()).cells.filter(c => c.cell_type === 'code')[2].source.join('')).toBe('weights = np.array([9, 9])')
    fireEvent.click(screen.getByText('Reset to the original cells'))
    expect(cell().value).toMatch(/weights = np.array\(\[4, 5\]\)/)
  })
  it('runs a cell, stops an infinite loop without losing code, and says variables were reset', async () => {
    render(<MLLab />)
    await openNotebook()
    const first = within(screen.getByRole('region', { name: /Cell 1/ }))
    fireEvent.click(first.getByText('Run cell'))
    await flush()
    expect(first.getByText(/ran: minutes = 42/)).toBeTruthy()
    fireEvent.change(cell(), { target: { value: 'while True: pass' } })
    fireEvent.click(within(screen.getByRole('region', { name: /Cell 3/ })).getByRole('button', { name: /^Run cell/ }))   // “Run cells 2 and this one”
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

import PythonStatus, { describeJob, SHOW_AFTER_MS } from './PythonStatus.jsx'
const wait = ms => act(() => new Promise(r => setTimeout(r, ms)))

describe('freeing Python and showing that it runs', () => {
  afterEach(() => runtime.setIdleLimit(runtime.IDLE_LIMIT_MS))
  it('shuts Python down after the idle limit, and the next run starts a fresh one', async () => {
    runtime.setIdleLimit(30)
    const gen = runtime.getGeneration()
    await runtime.run('nb1', 'print(1)')
    await wait(60)
    expect(FakeWorker.all[0].terminated).toBe(true)
    expect(runtime.getGeneration()).toBe(gen + 1)
    let status; const off = runtime.subscribe(s => { status = s }); off()
    expect(status).toMatchObject({ state: 'idle' })
    expect(status.text).toMatch(/without a run, to free memory/)
    expect(await runtime.run('nb1', 'print(2)')).toMatchObject({ ok: true })
    expect(FakeWorker.all).toHaveLength(2)
  })
  it('never shuts down in the middle of a run', async () => {
    runtime.setIdleLimit(20)
    await runtime.run('nb1', 'print(1)')
    const loop = runtime.run('nb1', 'while True: pass')
    await wait(60)
    expect(FakeWorker.all[0].terminated).toBe(false)
    runtime.stop(); await loop
  })
  it('release("leave") cancels what is running and frees the worker', async () => {
    const loop = runtime.run('nb1', 'while True: pass')
    runtime.release('leave')
    expect(await loop).toMatchObject({ stopped: true })
    expect(FakeWorker.all[0].terminated).toBe(true)
  })
  it('leaving the ML Lab frees lesson Python', async () => {
    const { unmount } = render(<MLLab />)
    await runtime.run('nb1', 'print(1)')
    unmount()
    expect(FakeWorker.all[0].terminated).toBe(true)
  })
  it('names what is running and offers Stop, but only once a run lasts', async () => {
    expect(describeJob('ladder:prediction:fill')).toBe('a practice check')
    expect(describeJob('l19-order', [{ id: 'l19-order', title: '19.1 · Order' }])).toBe('the notebook in “19.1 · Order”')
    render(<PythonStatus lessons={[]} />)
    const loop = runtime.run('ladder:x:y', 'while True: pass')
    await flush()
    expect(screen.queryByRole('status')).toBeNull()
    await wait(SHOW_AFTER_MS + 50)
    expect(screen.getByRole('status').textContent).toMatch(/Python is running a practice check/)
    fireEvent.click(screen.getByRole('button', { name: 'Stop Python' }))
    expect(await loop).toMatchObject({ stopped: true })
    await flush()
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('check time limits', () => {
  it('count from when the code starts running, not while packages download', async () => {
    let w
    runtime.setWorkerFactory(() => { w = new FakeWorker(); w.postMessage = msg => { w.sent.push(msg) }; return w })
    const res = runtime.run('ladder:x:y', 'import sklearn', { timeoutMs: 30 })
    w.onmessage({ data: { type: 'status', state: 'loading', text: 'Loading scikit-learn…', job: w.sent[0].job } })
    await wait(80)                                  // a slow download, longer than the limit
    expect(w.terminated).toBe(false)
    w.onmessage({ data: { type: 'status', state: 'running', text: 'Running…', job: w.sent[0].job } })
    await wait(80)                                  // now the code itself runs past the limit
    expect(w.terminated).toBe(true)
    expect(await res).toMatchObject({ stopped: true, timedOut: true })
  })
})

import { figureAlt } from './LessonNotebook.jsx'
describe('figure descriptions', () => {
  it('uses the worker’s description of the figure, and says when there is none', () => {
    const out = { figures: ['a', 'b'], figureAlts: ['Titled “Loss”; x axis “epoch”, y axis “loss”; 2 lines.', ''] }
    expect(figureAlt(out, 0, 2)).toBe('Figure 1 from cell 3: Titled “Loss”; x axis “epoch”, y axis “loss”; 2 lines.')
    expect(figureAlt(out, 1, 2)).toBe('Figure 2 from cell 3 (no description available)')
  })
  it('exports the description with the image in .ipynb', () => {
    const nb = JSON.parse(toIpynb({ title: 't', cells: [{ code: 'x' }] }, ['x'], { outputs: [{ text: '', figures: ['iVBORw0KGgo='], figureAlts: ['1 line.'] }], counts: [1], ranCode: ['x'] }))
    expect(nb.cells.find(c => c.cell_type === 'code').outputs[0].data['text/plain']).toEqual(['<Figure 1: 1 line.>'])
  })
})
