// Drives the real Python stepper (desktop/app/runtimes/aarcade_stepper.py, shared with A-Arcade
// Python) with this lab's programs, exactly as the Python tab sends them. Checks that each program
// loads and steps, that the pictures get their values, and that every line's "with this step's
// numbers" arithmetic equals what Python then really computes. Uses the app's environment, or
// CARTPOLE_PYTHON if set; skipped when neither exists. Run:
//   CARTPOLE_PYTHON=/path/to/python npx vitest run src/labs/cartpole-lab/stepper.desktop.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { plain } from '../a-arcade-python/analysis.js'
import { SOURCES, fnAt, midStatement } from './source.js'
import { PROGRAMS } from './programs.js'
import { extrasFor } from './lineNotes.js'
import { BinnedCartPole } from './engine/bins.js'
import { finish, qLearning } from '../qmaze-lab/engine/tabular.js'
import { mcControl, finishMC } from '../qmaze-lab/engine/montecarlo.js'

const root = path.resolve(import.meta.dirname, '../../..')
const appData = process.platform === 'win32' ? process.env.APPDATA ?? '' : process.platform === 'darwin' ? path.join(homedir(), 'Library', 'Application Support') : path.join(homedir(), '.config')
const python = process.env.CARTPOLE_PYTHON ?? path.join(appData, 'UpSkillOS', 'aarcade-python', 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')

function startStepper() {
  const proc = spawn(python, ['-u', path.join(root, 'desktop/app/runtimes/aarcade_stepper.py')], {
    env: { ...process.env, AARCADE_PROGRAM_DIR: mkdtempSync(path.join(tmpdir(), 'cartpole-')), OMP_NUM_THREADS: '1', PYTHONIOENCODING: 'utf-8' },
  })
  const waiting = []
  readline.createInterface({ input: proc.stdout }).on('line', line => waiting.shift()?.(JSON.parse(line)))
  let stderr = ''; proc.stderr.on('data', d => { stderr += d })
  let id = 0
  const next = () => new Promise(resolve => waiting.push(resolve))
  return { ready: next(), send: msg => { const reply = next(); proc.stdin.write(JSON.stringify({ ...msg, id: ++id }) + '\n'); return reply }, stop: () => proc.kill(), stderr: () => stderr }
}
const load = (s, id, kwargs) => { const p = PROGRAMS[id]; return s.send({ cmd: 'load', files: SOURCES, entry: { module: p.module, function: p.function, kwargs: { ...p.kwargs(), ...kwargs } }, watch: p.watch, actions: p.actions }) }
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

  it('a game with a rule: pauses in play_rule, the cart is drawn from Python\'s state, and every line\'s arithmetic is what Python computes', async () => {
    let r = await load(s, 'rule')
    expect(r.type, s.stderr()).toBe('pause')
    expect(top(r)).toMatchObject({ file: 'experiments.py', function: 'play_rule' })
    r = await s.send({ cmd: 'step', mode: 'action' })
    expect(plain(r.watch.cart.value)).toHaveLength(4)
    const checked = await checkArithmetic(s, r, 500)
    expect(checked).toBeGreaterThan(40)
  }, 180000)

  it('returns: the backwards walk\'s arithmetic matches', async () => {
    let r = await load(s, 'returns')
    r = await s.send({ cmd: 'step', mode: 'line', file: 'returns.py', line: lineOf('returns.py', 'G = reward + gamma * G') })
    expect(await checkArithmetic(s, r, 60)).toBeGreaterThan(5)
  }, 120000)

  it('Q-learning: Next game stops after each game with the live 72 × 2 table; the arithmetic matches; the final table is the engine\'s', async () => {
    let r = await load(s, 'q', { episodes: 30 })
    r = await s.send({ cmd: 'step', mode: 'lines', targets: PROGRAMS.q.episodeEnd() })
    expect(top(r)).toMatchObject({ file: 'qlearning.py', function: 'train_q_learning' })
    expect(r.watch.Q.value.shape).toEqual([72, 2])
    expect(await checkArithmetic(s, r, 300)).toBeGreaterThan(10)
    r = await s.send({ cmd: 'step', mode: 'line', file: 'experiments.py', line: lineOf('experiments.py', 'return Q, totals, greedy_lengths(Q, env)') })
    const { Q } = finish(qLearning(new BinnedCartPole(), { episodes: 30, alpha: 0.1, gamma: 0.99, epsilonStart: 1, epsilonEnd: 0.01, initialQ: 0, seed: 0 }))
    plain(r.watch.Q.value).forEach((row, i) => row.forEach((q, a) => expect(q).toBeCloseTo(Q[i][a], 4)))
  }, 180000)

  it('linear REINFORCE: the weights are watched, and the update\'s arithmetic matches', async () => {
    let r = await load(s, 'linear', { episodes: 3 })
    r = await s.send({ cmd: 'step', mode: 'line', file: 'linear_policy.py', line: lineOf('linear_policy.py', 'baseline = sum(returns)') })
    expect(plain(r.watch.weights.value)).toEqual([[0, 0, 0, 0], [0, 0, 0, 0]])
    expect(await checkArithmetic(s, r, 200)).toBeGreaterThan(10)
  }, 120000)

  it('Monte Carlo control: Next game stops after each game; the backward pass\'s arithmetic matches; the final table is the engine\'s', async () => {
    let r = await load(s, 'mc', { episodes: 30 })
    r = await s.send({ cmd: 'step', mode: 'lines', targets: PROGRAMS.mc.episodeEnd() })
    expect(top(r)).toMatchObject({ file: 'montecarlo.py', function: 'train_mc_control' })
    expect(r.watch.Q.value.shape).toEqual([72, 2])
    expect(await checkArithmetic(s, r, 400)).toBeGreaterThan(10)
    r = await s.send({ cmd: 'step', mode: 'line', file: 'experiments.py', line: SOURCES['experiments.py'].split('\n').findLastIndex(l => l.includes('return Q, totals, greedy_lengths(Q, env)')) + 1 })
    const { Q } = finishMC(mcControl(new BinnedCartPole(), { episodes: 30, gamma: 0.99, epsilonStart: 1, epsilonEnd: 0.01, seed: 0 }))
    plain(r.watch.Q.value).forEach((row, i) => row.forEach((q, a) => expect(q).toBeCloseTo(Q[i][a], 4)))
  }, 180000)

  it('one game, one gradient: the slope arithmetic matches, and compare_baselines prints both baselines', async () => {
    let r = await load(s, 'gradient', { games: 20 })
    r = await s.send({ cmd: 'step', mode: 'line', file: 'gradient_noise.py', line: lineOf('gradient_noise.py', 'gradient = [0.0, 0.0, 0.0, 0.0]') })
    expect(await checkArithmetic(s, r, 150)).toBeGreaterThan(5)
    r = await s.send({ cmd: 'step', mode: 'out' })
    while (r.type === 'pause') r = await s.send({ cmd: 'step', mode: 'out' })
    expect(r.type, r.error).toBe('finished')
    expect(r.output).toMatch(/baseline   0\.0: .*\nbaseline  25\.0: /)
  }, 180000)

  for (const id of ['neuron', 'autograd', 'a2c_check']) {
    it(`${id}: runs to the end`, async () => {
      await load(s, id)
      const r = await s.send({ cmd: 'step', mode: 'out' })
      expect(r.type, r.error).toBe('finished')
    }, 120000)
  }

  it('REINFORCE, A2C and DQN: the first update runs and the network is watched', async () => {
    for (const [id, kwargs] of [['reinforce', { episodes: 2 }], ['a2c', { updates: 2 }], ['dqn', { steps: 1100 }]]) {
      let r = await load(s, id, kwargs)
      expect(r.type, `${id} ${s.stderr()}`).toBe('pause')
      r = await s.send({ cmd: 'step', mode: 'lines', targets: PROGRAMS[id].episodeEnd() })
      expect(r.type, `${id}: ${r.error}`).toBe('pause')
      expect(r.watch.net.value.t, id).toBe('module')
      if (id === 'a2c') expect(plain(r.watch.states.value)).toHaveLength(8)
      r = await s.send({ cmd: 'step', mode: 'out' })
    }
  }, 300000)
})
