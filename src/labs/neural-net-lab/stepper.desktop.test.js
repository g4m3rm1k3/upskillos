// Drives the real Python stepper (desktop/app/runtimes/aarcade_stepper.py, shared with A-Arcade
// Python) with this lab's programs, exactly as the Python tab sends them. Checks that each program
// loads and steps, that the pictures get their values, and that every line's "with this step's
// numbers" arithmetic equals what Python then really computes. Uses the app's environment, or
// NNLAB_PYTHON if set; skipped when neither exists. Run:
//   NNLAB_PYTHON=/path/to/python npx vitest run src/labs/neural-net-lab/stepper.desktop.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { plain } from '../a-arcade-python/analysis.js'
import { SOURCES, DATA_FILES, fnAt, midStatement } from './source.js'
import { PROGRAMS } from './programs.js'
import { extrasFor } from './lineNotes.js'
import { fitLine, trainNet } from './engine/part1.js'

const root = path.resolve(import.meta.dirname, '../../..')
const appData = process.platform === 'win32' ? process.env.APPDATA ?? '' : process.platform === 'darwin' ? path.join(homedir(), 'Library', 'Application Support') : path.join(homedir(), '.config')
const python = process.env.NNLAB_PYTHON ?? path.join(appData, 'UpSkillOS', 'aarcade-python', 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')

function startStepper() {
  const proc = spawn(python, ['-u', path.join(root, 'desktop/app/runtimes/aarcade_stepper.py')], {
    env: { ...process.env, AARCADE_PROGRAM_DIR: mkdtempSync(path.join(tmpdir(), 'nnlab-')), OMP_NUM_THREADS: '1', PYTHONIOENCODING: 'utf-8' },
  })
  const waiting = []
  readline.createInterface({ input: proc.stdout }).on('line', line => waiting.shift()?.(JSON.parse(line)))
  let stderr = ''; proc.stderr.on('data', d => { stderr += d })
  let id = 0
  const next = () => new Promise(resolve => waiting.push(resolve))
  return { ready: next(), send: msg => { const reply = next(); proc.stdin.write(JSON.stringify({ ...msg, id: ++id }) + '\n'); return reply }, stop: () => proc.kill(), stderr: () => stderr }
}
const load = (s, id, kwargs) => { const p = PROGRAMS[id]; return s.send({ cmd: 'load', files: { ...SOURCES, ...DATA_FILES }, entry: { module: p.module, function: p.function, kwargs: { ...p.kwargs(), ...kwargs } }, watch: p.watch, actions: p.actions }) }
const lineOf = (file, text) => SOURCES[file].split('\n').findIndex(l => l.includes(text)) + 1
const top = r => r.stack.at(-1)
const valuesOf = frame => {
  const deep = s => s?.t === 'object' && s.attrs ? Object.fromEntries(Object.entries(s.attrs).map(([k, v]) => [k, deep(v)])) : plain(s)
  return Object.fromEntries([...Object.entries(frame.consts ?? {}), ...Object.entries(frame.locals)].map(([k, v]) => [k, deep(v)]))
}

// Step through a program with Step into; wherever a note has arithmetic for an assignment to a
// plain name, work it out, Step over, and compare with the value Python stored.
async function checkArithmetic(s, r, pauses) {
  let checked = 0
  for (let i = 0; i < pauses && r.type === 'pause'; i++) {
    const t = top(r), text = SOURCES[t.file].split('\n')[t.line - 1].trim()
    const { calc } = extrasFor(t.file, t.line)
    const name = /^(\w+)\s*(=|\+=)\s/.exec(text)?.[1]
    if (calc && name && typeof calc(valuesOf(t))[1] === 'number') {
      const expected = calc(valuesOf(t))[1]
      const fn = fnAt(t.file, t.line)?.key
      const depth = r.stack.length
      r = await s.send({ cmd: 'step', mode: 'over' })
      // As the Python tab does: one statement is one step, however many lines it is written on.
      while (r.type === 'pause' && midStatement(t, top(r), depth, r.stack.length)) r = await s.send({ cmd: 'step', mode: 'over' })
      const after = top(r)
      if (r.type === 'pause' && fnAt(after.file, after.line)?.key === fn) {
        expect(plain(after.locals[name]), `${t.file}:${t.line} ${text}`).toBeCloseTo(expected, 9)
        checked++
      }
      continue
    }
    r = await s.send({ cmd: 'step', mode: 'into' })
  }
  return checked
}

describe.skipIf(!existsSync(python))('the lab\'s programs in the real Python stepper', () => {
  let s
  beforeAll(async () => { s = startStepper(); expect((await s.ready).type).toBe('ready') }, 60000)
  afterAll(() => s?.stop())

  it('gradient descent: Next step moves w and b, every line\'s arithmetic is what Python computes, and it ends where the engine ends', async () => {
    let r = await load(s, 'line')
    expect(r.type, s.stderr()).toBe('pause')
    expect(top(r)).toMatchObject({ file: 'neuron.py', function: 'fit_line' })
    r = await s.send({ cmd: 'step', mode: 'action' })
    expect(plain(r.watch.xs.value)).toHaveLength(20)
    expect(await checkArithmetic(s, r, 400)).toBeGreaterThan(30)
    do { r = await s.send({ cmd: 'step', mode: 'out' }) } while (r.type === 'pause')
    expect(r.type).toBe('finished')
    const { w, b } = fitLine()
    expect(r.result.items[0].v).toBeCloseTo(w, 12)
    expect(r.result.items[1].v).toBeCloseTo(b, 12)
  }, 180000)

  it('the network by hand: forward and backward arithmetic matches, Next step stops after each step, and the loss is the engine\'s', async () => {
    let r = await load(s, 'net', { steps: 3 })
    r = await s.send({ cmd: 'step', mode: 'action' })
    expect(await checkArithmetic(s, r, 400)).toBeGreaterThan(40)
    r = await load(s, 'net', { steps: 3 })
    r = await s.send({ cmd: 'step', mode: 'lines', targets: PROGRAMS.net.episodeEnd() })
    expect(top(r)).toMatchObject({ file: 'tinynet.py', function: 'train_net' })
    expect(plain(r.watch.net.value).w1).toHaveLength(8)
    expect(plain(top(r).locals.loss)).toBeCloseTo(trainNet({ steps: 1 }).history[0], 12)
  }, 180000)

  it('logistic regression: the gradient\'s arithmetic matches line by line, and Next step moves the weights', async () => {
    let r = await load(s, 'logistic', { steps: 2 })
    expect(r.type, s.stderr()).toBe('pause')
    r = await s.send({ cmd: 'step', mode: 'action' })
    expect(plain(r.watch.points.value)).toHaveLength(40)
    expect(plain(r.watch.points.value)[39]).toHaveLength(2)
    expect(await checkArithmetic(s, r, 300)).toBeGreaterThan(30)
  }, 180000)

  it('softmax regression by hand: softmax, the slope p − one-hot and the gradient match line by line', async () => {
    let r = await load(s, 'iris_hand', { steps: 2 })
    expect(r.type, s.stderr()).toBe('pause')
    r = await s.send({ cmd: 'step', mode: 'line', file: 'iris.py', line: lineOf('iris.py', 'probs = softmax(scores_for(weights, biases, x))') })
    expect(await checkArithmetic(s, r, 400)).toBeGreaterThan(40)
  }, 180000)

  for (const id of ['layer', 'torch', 'cars', 'moons', 'tumours', 'iris', 'digits']) {
    it(`${id}: runs to the end`, async () => {
      let r = await load(s, id)
      expect(r.type, s.stderr()).toBe('pause')
      r = await s.send({ cmd: 'step', mode: 'out' })
      expect(r.type, `${r.error} ${r.output ?? ''}`).toBe('finished')
      if (id === 'torch') expect(r.result.v).toBeLessThan(1e-6)
      if (id === 'cars') expect(r.result.items[2].v).toBeLessThan(4)
      if (id === 'moons') expect(r.result.items[2].v).toBeGreaterThan(0.95)
      if (id === 'tumours') expect(r.output).toMatch(/accuracy 0\.9/)
      if (id === 'iris') expect(r.output).toMatch(/\[\[50, 0, 0\]/)
      if (id === 'digits') expect(r.output).toMatch(/right: 3[45]\d/)
    }, 300000)
  }
})
