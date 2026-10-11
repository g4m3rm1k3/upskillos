// Drives the real Python stepper (desktop/app/runtimes/aarcade_stepper.py, shared with A-Arcade
// Python) with this lab's programs, exactly as the Python tab sends them, and checks what comes
// back against the JavaScript engine. Uses the app's environment, or QMAZE_PYTHON if set; skipped
// when neither exists. Run: QMAZE_PYTHON=/path/to/python npx vitest run src/labs/qmaze-lab/stepper.desktop.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { SOURCES } from './source.js'
import { PROGRAMS } from './programs.js'
import { GridWorld } from './engine/gridworld.js'
import { qLearning, finish } from './engine/tabular.js'
import { valueIteration } from './engine/planning.js'
import { followPath } from './engine/paths.js'

const root = path.resolve(import.meta.dirname, '../../..')
const appData = process.platform === 'win32' ? process.env.APPDATA ?? '' : process.platform === 'darwin' ? path.join(homedir(), 'Library', 'Application Support') : path.join(homedir(), '.config')
const python = process.env.QMAZE_PYTHON ?? path.join(appData, 'UpSkillOS', 'aarcade-python', 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')

function startStepper() {
  const proc = spawn(python, ['-u', path.join(root, 'desktop/app/runtimes/aarcade_stepper.py')], {
    env: { ...process.env, AARCADE_PROGRAM_DIR: mkdtempSync(path.join(tmpdir(), 'qmaze-')), OMP_NUM_THREADS: '1', PYTHONIOENCODING: 'utf-8' },
  })
  const waiting = []
  readline.createInterface({ input: proc.stdout }).on('line', line => waiting.shift()?.(JSON.parse(line)))
  let stderr = ''; proc.stderr.on('data', d => { stderr += d })
  let id = 0
  const next = () => new Promise(resolve => waiting.push(resolve))
  return { ready: next(), send: msg => { const reply = next(); proc.stdin.write(JSON.stringify({ ...msg, id: ++id }) + '\n'); return reply }, stop: () => proc.kill(), stderr: () => stderr }
}
const load = (s, id, map) => { const p = PROGRAMS[id]; return s.send({ cmd: 'load', files: SOURCES, entry: { module: p.module, function: p.function, kwargs: p.kwargs(map) }, watch: p.watch, actions: ['env.step('] }) }
const lineOf = (file, text) => SOURCES[file].split('\n').findIndex(l => l.includes(text)) + 1
const top = r => r.stack.at(-1)
const rows = a => Array.from({ length: a.shape[0] }, (_, i) => a.v.slice(i * a.shape[1], (i + 1) * a.shape[1]))

describe.skipIf(!existsSync(python))('the lab\'s programs in the real Python stepper', () => {
  let s
  beforeAll(async () => { s = startStepper(); expect((await s.ready).type).toBe('ready') }, 60000)
  afterAll(() => s?.stop())

  it('random play: pauses in play_random, Next move shows the world\'s answer, and it finishes as play.py does', async () => {
    let r = await load(s, 'play', 'cheese_and_cat')
    expect(r.type, s.stderr()).toBe('pause')
    expect(top(r)).toMatchObject({ file: 'play.py', function: 'play_random' })
    r = await s.send({ cmd: 'step', mode: 'action' })
    expect(r.type).toBe('pause')
    expect(top(r).locals.next_state.t).toBe('int')
    r = await s.send({ cmd: 'step', mode: 'out' })
    expect(r.type).toBe('finished')
    expect(r.result.items[0].v).toBeCloseTo(-0.8, 12)
    expect(r.result.items[1].len).toBe(47)
  }, 60000)

  it('Q-learning: Next episode stops after each episode with the live Q-table, and the final table matches the engine', async () => {
    let r = await load(s, 'q', 'cheese_and_cat')
    expect(top(r)).toMatchObject({ file: 'experiments.py', function: 'learn_q' })
    r = await s.send({ cmd: 'step', mode: 'lines', targets: PROGRAMS.q.episodeEnd() })
    expect(top(r)).toMatchObject({ file: 'qlearning.py', function: 'train_q_learning' })
    expect(r.watch.Q.value.shape).toEqual([16, 4])
    expect(r.watch.state.value.t).toBe('int')
    r = await s.send({ cmd: 'step', mode: 'line', file: 'experiments.py', line: lineOf('experiments.py', 'return Q, totals') })
    const { Q } = finish(qLearning(new GridWorld('cheese_and_cat'), { episodes: 300, seed: 0 }))
    expect(rows(r.watch.Q.value)).toEqual(Q)
  }, 120000)

  it('knobs: setting alpha while paused changes the running function\'s alpha', async () => {
    let r = await load(s, 'q', 'cheese_and_cat')
    r = await s.send({ cmd: 'step', mode: 'line', file: 'qlearning.py', line: lineOf('qlearning.py', 'rng = random.Random(seed)') })
    expect(top(r).function).toBe('train_q_learning')
    r = await s.send({ cmd: 'set', target: 'alpha', value: 0.25 })
    expect(top(r).locals.alpha.v).toBe(0.25)
  }, 60000)

  it('value iteration: the paused V is the engine\'s V when it returns', async () => {
    let r = await load(s, 'plan', 'frozen_lake')
    r = await s.send({ cmd: 'step', mode: 'line', file: 'experiments.py', line: lineOf('experiments.py', 'return V, Q, sweeps') })
    const { V } = valueIteration(new GridWorld('frozen_lake').P, 0.95)
    r.watch.V.value.v.forEach((v, i) => expect(v).toBeCloseTo(V[i], 12))
  }, 60000)

  it('A2C: after one update the network is watched, and its actor weights give a probability per action', async () => {
    let r = await load(s, 'a2c', 'cheese_and_cat')
    expect(top(r)).toMatchObject({ file: 'a2c.py', function: 'train_a2c' })
    r = await s.send({ cmd: 'step', mode: 'lines', targets: PROGRAMS.a2c.episodeEnd() })
    expect(r.watch.net.value.params['actor.weight'].shape).toEqual([4, 16])
    expect(r.watch.net.value.params['critic.weight'].shape).toEqual([1, 16])
    expect(r.watch.states.value.len).toBe(8)
  }, 120000)

  it('the Gymnasium check, the gradient check and A2C with a hidden layer all run to the end', async () => {
    let r = await load(s, 'gym', 'cheese_and_cat')
    r = await s.send({ cmd: 'step', mode: 'out' })
    expect(r.type, r.error).toBe('finished')
    expect(r.output).toMatch(/frozen_lake identical\nfrozen_lake_8x8 identical\ncliff identical/)
    r = await load(s, 'a2c_check', 'cheese_and_cat')
    r = await s.send({ cmd: 'step', mode: 'out' })
    expect(r.type, r.error).toBe('finished')
    expect(r.result.items[0].v).toBeLessThan(1e-6)
    r = await load(s, 'a2c_hidden', 'cheese_and_cat')
    r = await s.send({ cmd: 'step', mode: 'lines', targets: PROGRAMS.a2c_hidden.episodeEnd() })
    expect(r.watch.net.value.params['body.0.weight'].shape).toEqual([32, 16])
  }, 180000)

  it('the shortest Cheese and cat path the lessons use is a real path', () => {
    expect(followPath(new GridWorld('cheese_and_cat'), [2, 2, 3, 3, 3, 2]).states.at(-1)).toBe(15)
  })
})
