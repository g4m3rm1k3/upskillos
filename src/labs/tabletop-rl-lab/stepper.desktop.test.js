// Drives the real Python stepper (desktop/app/runtimes/aarcade_stepper.py, shared with A-Arcade
// Python) with this lab's programs, exactly as the Python tab sends them. Checks that each program
// loads, steps and finishes, that the pictures get their values, and that every line's "with this
// step's numbers" arithmetic equals what Python then really computes. The programs need only the
// standard library, so any Python 3 will do: the app's environment, or TABLETOP_PYTHON. Run:
//   TABLETOP_PYTHON=python3 npx vitest run src/labs/tabletop-rl-lab/stepper.desktop.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { plain } from '../a-arcade-python/analysis.js'
import { SOURCES, fnAt, midStatement } from './source.js'
import { PROGRAMS } from './programs.js'
import { extrasFor } from './lineNotes.js'
import { train, trainAfter } from './engine/learn.js'
import { trainValue } from './engine/game.js'

const root = path.resolve(import.meta.dirname, '../../..')
const appData = process.platform === 'win32' ? process.env.APPDATA ?? '' : process.platform === 'darwin' ? path.join(homedir(), 'Library', 'Application Support') : path.join(homedir(), '.config')
const python = process.env.TABLETOP_PYTHON ?? path.join(appData, 'UpSkillOS', 'aarcade-python', 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
const available = existsSync(python) || spawnSync(python, ['--version']).status === 0

function startStepper() {
  const proc = spawn(python, ['-u', path.join(root, 'desktop/app/runtimes/aarcade_stepper.py')], {
    env: { ...process.env, AARCADE_PROGRAM_DIR: mkdtempSync(path.join(tmpdir(), 'tabletop-')), PYTHONIOENCODING: 'utf-8' },
  })
  const waiting = []
  readline.createInterface({ input: proc.stdout }).on('line', line => waiting.shift()?.(JSON.parse(line)))
  let stderr = ''; proc.stderr.on('data', d => { stderr += d })
  let id = 0
  const next = () => new Promise(resolve => waiting.push(resolve))
  return { ready: next(), send: msg => { const reply = next(); proc.stdin.write(JSON.stringify({ ...msg, id: ++id }) + '\n'); return reply }, stop: () => proc.kill(), stderr: () => stderr }
}
const load = (s, id, kwargs) => { const p = PROGRAMS[id]; return s.send({ cmd: 'load', files: SOURCES, entry: { module: p.module, function: p.function, kwargs: { ...p.kwargs(), ...kwargs } }, watch: p.watch, actions: p.actions }) }
const top = r => r.stack.at(-1)
const valuesOf = frame => {
  const deep = s => s?.t === 'object' && s.attrs ? Object.fromEntries(Object.entries(s.attrs).map(([k, v]) => [k, deep(v)])) : plain(s)
  return Object.fromEntries([...Object.entries(frame.consts ?? {}), ...Object.entries(frame.locals)].map(([k, v]) => [k, deep(v)]))
}

// Step into every line; wherever a note has arithmetic for an assignment to a plain name, work it
// out, step over, and compare with the value Python stored.
async function checkArithmetic(s, r, pauses) {
  let checked = 0
  for (let i = 0; i < pauses && r.type === 'pause'; i++) {
    const t = top(r), text = SOURCES[t.file].split('\n')[t.line - 1].trim()
    const { calc } = extrasFor(t.file, t.line)
    const name = /^(\w+)\s*(=|\+=)\s/.exec(text)?.[1]
    let expected
    try { expected = calc && name ? calc(valuesOf(t))[1] : undefined } catch { expected = undefined }
    if (typeof expected === 'number') {
      const fn = fnAt(t.file, t.line)?.key, depth = r.stack.length
      r = await s.send({ cmd: 'step', mode: 'over' })
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
// Run to the first line containing `text`, going on past the stepper's 2,000,000-line budget.
async function runTo(s, file, text) {
  const line = SOURCES[file].split('\n').findIndex(l => l.includes(text)) + 1
  let r = await s.send({ cmd: 'step', mode: 'line', file, line })
  while (r.type === 'pause' && r.hitLimit) r = await s.send({ cmd: 'step', mode: 'line', file, line })
  return r
}
async function finish(s, r) {
  while (r.type === 'pause') r = await s.send({ cmd: 'step', mode: 'out' })
  return r
}

describe.skipIf(!available)('the lab\'s programs in the real Python stepper', () => {
  let s
  beforeAll(async () => { s = startStepper(); expect((await s.ready).type).toBe('ready') }, 60000)
  afterAll(() => s?.stop())

  it('every program loads, pauses in its entry function and runs to the end', async () => {
    for (const [id, p] of Object.entries(PROGRAMS)) {
      const small = { learn: { episodes: 600 }, after: { episodes: 600 }, td: { games: 2 }, stats: { games: 6 }, match: { games: 1 }, simulate: { turns: 200 } }[id]
      let r = await load(s, id, small)
      expect(r.type, `${id}: ${s.stderr()}`).toBe('pause')
      expect(top(r).function, id).toBe(p.function)
      r = await finish(s, r)
      expect(r.type, `${id}: ${r.error}`).toBe('finished')
    }
  }, 300000)

  it('the dice, scoring, chance and planning lines\' arithmetic is what Python computes', async () => {
    let checked = 0
    for (const id of ['dice', 'scores', 'chase', 'simulate', 'exact']) {
      const r = await load(s, id, id === 'simulate' ? { turns: 20 } : undefined)
      checked += await checkArithmetic(s, r, 1500)
      await finish(s, r.type === 'pause' ? await s.send({ cmd: 'step', mode: 'out' }) : r)
    }
    expect(checked).toBeGreaterThan(30)
  }, 300000)

  it('Q-learning: the TD target\'s arithmetic matches, and the run\'s exact grades are the engine\'s', async () => {
    let r = await load(s, 'learn', { episodes: 1000 })
    r = await s.send({ cmd: 'step', mode: 'line', file: 'learn.py', line: SOURCES['learn.py'].split('\n').findIndex(l => l.includes('target = reward + gamma * future')) + 1 })
    expect(await checkArithmetic(s, r, 300)).toBeGreaterThan(3)
    r = await s.send({ cmd: 'step', mode: 'lines', targets: PROGRAMS.learn.episodeEnd() })
    r = await runTo(s, 'learn.py', 'return Q, curve')
    expect(plain(r.watch.curve.value)).toEqual(train(5, { episodes: 1000, every: 500, seed: 0 }).curve)
    await finish(s, r)
  }, 300000)

  it('afterstates and TD(0): the pictures\' values are the engine\'s', async () => {
    let r = await load(s, 'after', { episodes: 1000 })
    r = await runTo(s, 'learn.py', 'return W, curve')
    expect(plain(r.watch.curve.value)).toEqual(trainAfter(5, { episodes: 1000, every: 500, seed: 0 }).curve)
    await finish(s, r)
    r = await load(s, 'td', { games: 3 })
    r = await runTo(s, 'afterstate.py', 'return weights, history')
    expect(plain(r.watch.weights.value)).toEqual(trainValue({ games: 3, seed: 0 }).weights)
    await finish(s, r)
  }, 300000)
})
