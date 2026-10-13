// Drives the real Python stepper (desktop/app/runtimes/aarcade_stepper.py, shared with A-Arcade
// Python) with this lab's programs, exactly as the Python tab sends them. Checks that each program
// loads, steps and finishes, and that every line's "with this step's numbers" arithmetic equals what
// Python then really computes. The programs need only the standard library, so any Python 3 will
// do: the app's environment, or KART_PYTHON. Run:
//   KART_PYTHON=python3 npx vitest run src/labs/kart-lab/stepper.desktop.test.js
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
import { train } from './engine/tabular.js'

const root = path.resolve(import.meta.dirname, '../../..')
const appData = process.platform === 'win32' ? process.env.APPDATA ?? '' : process.platform === 'darwin' ? path.join(homedir(), 'Library', 'Application Support') : path.join(homedir(), '.config')
const python = process.env.KART_PYTHON ?? path.join(appData, 'UpSkillOS', 'aarcade-python', 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
const available = existsSync(python) || spawnSync(python, ['--version']).status === 0

function startStepper() {
  const proc = spawn(python, ['-u', path.join(root, 'desktop/app/runtimes/aarcade_stepper.py')], {
    env: { ...process.env, AARCADE_PROGRAM_DIR: mkdtempSync(path.join(tmpdir(), 'kart-')), PYTHONIOENCODING: 'utf-8' },
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
      const small = { lap: { laps: 1 }, rules: { laps: 2 }, train: { config: { episodes: 20, seed: 19 } }, maxbias: { runs: 10, episodes: 30 }, linear: { episodes: 10 } }[id]
      let r = await load(s, id, small)
      expect(r.type, `${id}: ${s.stderr()}`).toBe('pause')
      expect(top(r).function, id).toBe(p.function)
      r = await finish(s, r)
      expect(r.type, `${id}: ${r.error}`).toBe('finished')
    }
  }, 600000)

  it('a lap\'s physics and the contact test\'s arithmetic are what Python computes', async () => {
    const r = await load(s, 'lap', { laps: 1 })
    expect(await checkArithmetic(s, r, 4000)).toBeGreaterThan(40)
    await finish(s, r)
  }, 600000)

  it('training: the TD target\'s arithmetic matches, and the practice rewards are the engine\'s', async () => {
    let r = await load(s, 'train', { config: { episodes: 12, seed: 19 } })
    r = await runTo(s, 'tabular.py', 'target = reward + gamma * future')
    expect(await checkArithmetic(s, r, 400)).toBeGreaterThan(3)
    r = await runTo(s, 'tabular.py', 'return tables, totals')
    expect(plain(r.watch.totals.value)).toEqual(train({ episodes: 12, seed: 19 }).totals)
    await finish(s, r)
  }, 600000)
})
