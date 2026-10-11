// Drives the real Python stepper (desktop/app/runtimes/aarcade_stepper.py) with the lab's real
// programs, in the venv the app sets up (%APPDATA%/UpSkillOS/aarcade-python/venv).
// Skipped when that venv doesn't exist. Run: npx vitest run src/labs/a-arcade-python/stepper.desktop.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { PROGRAMS } from './programs/index.js'
import { analyseProgram, plain } from './analysis.js'

const root = path.resolve(import.meta.dirname, '../../..')
const python = path.join(process.env.APPDATA ?? '', 'UpSkillOS', 'aarcade-python', 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
const files = dir => Object.fromEntries(readdirSync(path.join(import.meta.dirname, 'programs', dir)).filter(f => f.endsWith('.py')).map(f => [f, readFileSync(path.join(import.meta.dirname, 'programs', dir, f), 'utf8')]))

function startStepper() {
  const proc = spawn(python, ['-u', path.join(root, 'desktop/app/runtimes/aarcade_stepper.py')], {
    env: { ...process.env, AARCADE_PROGRAM_DIR: mkdtempSync(path.join(tmpdir(), 'aarcade-')), OMP_NUM_THREADS: '1', PYTHONIOENCODING: 'utf-8' },
  })
  const waiting = []
  readline.createInterface({ input: proc.stdout }).on('line', line => waiting.shift()?.(JSON.parse(line)))
  let stderr = ''; proc.stderr.on('data', d => { stderr += d })
  let id = 0
  const next = () => new Promise(resolve => waiting.push(resolve))
  return {
    ready: next(),
    send: msg => { const reply = next(); proc.stdin.write(JSON.stringify({ ...msg, id: ++id }) + '\n'); return reply },
    stop: () => proc.kill(),
    stderr: () => stderr,
  }
}

const top = r => r.stack.at(-1)
const Q_ENTRY = { module: 'cartpole_table', function: 'train_cartpole', kwargs: { episodes: 500, seed: 0 } }
const Q_WATCH = { table: ['agent.Q', 'self.Q', 'Q'], obs: ['env.obs', 'self.obs'] }

describe.skipIf(!existsSync(python))('the Python stepper', () => {
  let s
  beforeAll(async () => { s = startStepper(); expect((await s.ready).type).toBe('ready') }, 60000)
  afterAll(() => s?.stop())

  it('Q-learning: pauses at train_cartpole\'s first line, then steps into, over and out', async () => {
    let r = await s.send({ cmd: 'load', files: files('q'), entry: Q_ENTRY, watch: Q_WATCH, actions: PROGRAMS.q.actions })
    expect(r.type, s.stderr()).toBe('pause')
    expect(top(r)).toMatchObject({ file: 'cartpole_table.py', function: 'train_cartpole' })
    r = await s.send({ cmd: 'step', mode: 'into' })
    expect(top(r).function).toBe('__init__')          // into TableCartPole(counts)
    r = await s.send({ cmd: 'step', mode: 'out' })
    expect(top(r).function).toBe('train_cartpole')
    r = await s.send({ cmd: 'step', mode: 'over' })
    expect(top(r).function).toBe('train_cartpole')
    expect(r.watch.table.value).toMatchObject({ t: 'ndarray', shape: [72, 2] })
    expect(r.watch.table.value.v.every(x => x === 0)).toBe(true)
  }, 60000)

  it('Q-learning: Next action stops just after env.step has answered, and the table fills', async () => {
    let r = await s.send({ cmd: 'load', files: files('q'), entry: Q_ENTRY, watch: Q_WATCH, actions: PROGRAMS.q.actions })
    r = await s.send({ cmd: 'step', mode: 'action' })
    expect(r.type).toBe('pause')
    expect(r.watch.obs.value.shape).toEqual([4])
    // Run to the line that writes the table, then over it: exactly one entry changes.
    r = await s.send({ cmd: 'step', mode: 'line', file: 'qlearning.py', line: 13 })
    expect(top(r)).toMatchObject({ file: 'qlearning.py', function: 'q_update', line: 13 })
    const before = r.watch.table.value.v
    r = await s.send({ cmd: 'step', mode: 'over' })
    const after = r.watch.table.value.v
    expect(after.filter((x, i) => x !== before[i]).length).toBe(1)
    // Many actions later, many entries have values.
    for (let i = 0; i < 300; i++) r = await s.send({ cmd: 'step', mode: 'action' })
    expect(r.watch.table.value.v.filter(x => x !== 0).length).toBeGreaterThan(20)
  }, 120000)

  it('changes a value in the paused program', async () => {
    let r = await s.send({ cmd: 'load', files: files('q'), entry: Q_ENTRY, watch: Q_WATCH, actions: PROGRAMS.q.actions })
    r = await s.send({ cmd: 'step', mode: 'line', file: 'train.py', line: 188 - 184 + 1 })   // action = agent.act(state)
    r = await s.send({ cmd: 'set', target: 'agent.epsilon', value: 0 })
    expect(r.type).toBe('pause')
    const agent = r.stack.find(f => f.locals.agent)?.locals.agent
    expect(agent.attrs.epsilon.v).toBe(0)
  }, 60000)

  it('reports an error in the learner\'s code with its file and line', async () => {
    const broken = { ...files('q'), 'qlearning.py': files('q')['qlearning.py'].replace('return reward + gamma', 'return reward + gamma_typo') }
    let r = await s.send({ cmd: 'load', files: broken, entry: Q_ENTRY, watch: Q_WATCH, actions: PROGRAMS.q.actions })
    for (let i = 0; i < 400 && r.type === 'pause'; i++) r = await s.send({ cmd: 'step', mode: 'action' })
    expect(r).toMatchObject({ type: 'error', file: 'qlearning.py' })
    expect(r.error).toMatch(/NameError/)
  }, 120000)

  // At every line with "this line will work out", work it out from the paused values, run the line in
  // real Python, and compare with what Python produced: a variable, an attribute, a table entry,
  // a return value, or (for an if) which way it went.
  async function verifyCalcs(id, entry, watch, actions, pauses) {
    const program = PROGRAMS[id], info = analyseProgram(program.files, program.explain)
    let r = await s.send({ cmd: 'load', files: program.files, entry, watch, actions }), checked = 0
    for (let i = 0; i < pauses && r.type === 'pause'; i++) {
      const top = r.stack.at(-1), note = info[top.file].notes[top.line]
      if (!note?.calc) { r = await s.send({ cmd: 'step', mode: 'into' }); continue }
      const before = Object.fromEntries(Object.entries(top.locals).map(([k, v]) => [k, plain(v)]))
      const [, expected] = note.calc(before)
      const text = info[top.file].lines[top.line - 1].trim(), depth = r.stack.length
      r = await s.send({ cmd: 'step', mode: 'over' })
      let actual
      if (/^if /.test(text)) actual = r.stack.length === depth && r.stack.at(-1).line === top.line + 1
      else if (/^return /.test(text)) actual = plain(r.returned?.value)
      else {
        const after = Object.fromEntries(Object.entries(r.stack[depth - 1]?.locals ?? {}).map(([k, v]) => [k, plain(v)]))
        const lhs = text.split(/\s(?:=|\+=)\s/)[0]
        const element = /^(\w+)\[(\w+), (\w+)\]$/.exec(lhs), attr = /^(\w+)\.(\w+)$/.exec(lhs)
        // A function's last line: it has returned by the next pause, so read the table from the watch.
        const table = element && (after[element[1]] ?? plain(r.watch.table?.value))
        actual = element ? table[before[element[2]]][before[element[3]]] : attr ? r.stack[depth - 1].locals[attr[1]].attrs[attr[2]].v : after[lhs]
      }
      if (typeof expected === 'number') expect(actual, `${top.file}:${top.line} ${text}`).toBeCloseTo(expected, 9)
      else if (Array.isArray(expected) && typeof expected[0] === 'number') expected.forEach((x, k) => expect(actual[k], `${top.file}:${top.line} ${text} [${k}]`).toBeCloseTo(x, 9))
      else expect(actual, `${top.file}:${top.line} ${text}`).toEqual(expected)
      checked++
    }
    return checked
  }
  it('Q-learning: every "this line will work out" matches what Python then does', async () => {
    expect(await verifyCalcs('q', Q_ENTRY, Q_WATCH, PROGRAMS.q.actions, 3000)).toBeGreaterThan(300)
  }, 300000)
  it('A2C: every "this line will work out" matches what Python then does', async () => {
    expect(await verifyCalcs('a2c', { module: 'a2c', function: 'train_a2c', kwargs: { total_steps: 400, quiet: true, report_every: 100000 } }, PROGRAMS.a2c.watch, PROGRAMS.a2c.actions, 1500)).toBeGreaterThan(20)
  }, 300000)

  it('A2C: the network\'s weights are watched, and backward() fills in the gradients', async () => {
    let r = await s.send({ cmd: 'load', files: files('a2c'), entry: { module: 'a2c', function: 'train_a2c', kwargs: { total_steps: 2000, quiet: true, report_every: 1000 } }, watch: { network: ['net'], obs: ['obs'] } })
    expect(r.type, s.stderr()).toBe('pause')
    const backward = readFileSync(path.join(import.meta.dirname, 'programs/a2c/a2c.py'), 'utf8').split('\n').findIndex(l => l.includes('loss.backward()')) + 1
    r = await s.send({ cmd: 'step', mode: 'line', file: 'a2c.py', line: backward })
    const params = r.watch.network.value.params
    expect(params['body.0.weight'].shape).toEqual([64, 4])
    expect(params['body.0.weight'].grad).toBeUndefined()
    r = await s.send({ cmd: 'step', mode: 'over' })
    expect(r.watch.network.value.params['body.0.weight'].grad.length).toBe(256)
  }, 120000)
})
