// Drives the real Python stepper (desktop/app/runtimes/aarcade_stepper.py, shared with A-Arcade
// Python) with this lab's programs, exactly as the Real Python tab sends them, and checks what comes
// back against the JavaScript engine. Uses the app's environment, or DS_PYTHON if set; skipped when
// neither exists.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { SOURCES } from './source.js'
import { PROGRAMS } from './programs.js'
import * as T from './engine/tables.js'
import * as S from './engine/summary.js'
import { ORDERS_CSV } from './engine/data.js'

const root = path.resolve(import.meta.dirname, '../../..')
const appData = process.platform === 'win32' ? process.env.APPDATA ?? '' : process.platform === 'darwin' ? path.join(homedir(), 'Library', 'Application Support') : path.join(homedir(), '.config')
const python = process.env.DS_PYTHON ?? path.join(appData, 'UpSkillOS', 'aarcade-python', 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')

function startStepper() {
  const proc = spawn(python, ['-u', path.join(root, 'desktop/app/runtimes/aarcade_stepper.py')], {
    env: { ...process.env, AARCADE_PROGRAM_DIR: mkdtempSync(path.join(tmpdir(), 'dss-')), OMP_NUM_THREADS: '1', PYTHONIOENCODING: 'utf-8' },
  })
  const waiting = []
  readline.createInterface({ input: proc.stdout }).on('line', line => waiting.shift()?.(JSON.parse(line)))
  let stderr = ''; proc.stderr.on('data', d => { stderr += d })
  let id = 0
  const next = () => new Promise(resolve => waiting.push(resolve))
  return { ready: next(), send: msg => { const reply = next(); proc.stdin.write(JSON.stringify({ ...msg, id: ++id }) + '\n'); return reply }, stop: () => proc.kill(), stderr: () => stderr }
}
const load = (s, id, input = PROGRAMS[id].input.value) => { const p = PROGRAMS[id]; return s.send({ cmd: 'load', files: SOURCES, entry: { module: p.module, function: p.function, kwargs: p.kwargs(input) }, watch: p.watch, actions: [] }) }
const jump = (s, id) => s.send({ cmd: 'step', mode: 'lines', targets: PROGRAMS[id].jump.targets() })
const top = r => r.stack.at(-1)
const plain = v => (!v ? null : v.items ? (Array.isArray(v.items) ? v.items.map(plain) : Object.fromEntries(Object.entries(v.items).map(([k, x]) => [k, plain(x)]))) : v.v)
const jumps = async (s, id, max) => { let r, n = 0; for (; n < max; n++) { r = await jump(s, id); if (r.type !== 'pause') break } return [r, n] }
const priced = T.priced(T.readCsv(ORDERS_CSV()))

describe.skipIf(!existsSync(python))('the lab’s programs in the real Python stepper', () => {
  let s
  beforeAll(async () => { s = startStepper(); expect((await s.ready).type).toBe('ready') }, 60000)
  afterAll(() => s?.stop())

  it('every program loads and pauses in its own function', async () => {
    for (const [id, p] of Object.entries(PROGRAMS)) {
      const r = await load(s, id)
      expect(r.type, `${id}: ${s.stderr()}`).toBe('pause')
      expect(top(r), id).toMatchObject({ file: p.file, function: p.function })
    }
  }, 60000)

  it('split_csv_line stops once per comma outside quotes and returns the engine’s fields', async () => {
    await load(s, 'split_csv_line')
    const [r, n] = await jumps(s, 'split_csv_line', 20)
    expect(r.type, s.stderr()).toBe('finished')
    expect(plain(r.result)).toEqual(T.splitCsvLine(PROGRAMS.split_csv_line.input.value))
    expect(n).toBe(6)
  }, 60000)

  it('mean_of, insertion sort and merge sort give the engine’s answers', async () => {
    let r = await load(s, 'mean_of')
    r = await s.send({ cmd: 'step', mode: 'out' })
    expect(plain(r.result)).toEqual(T.meanOf([49.05, 409.5, null, 30.6, 25, null, 36.8]))
    await load(s, 'sort_by')
    let n;[r, n] = await jumps(s, 'sort_by', 20)
    expect(n).toBe(12)
    expect(plain(r.result).map(x => x.order_id)).toEqual(T.sortBy(priced.slice(0, 12), 'price').map(x => x.order_id))
    await load(s, 'merge_sort');[r, n] = await jumps(s, 'merge_sort', 20)
    expect(n).toBe(7)   // 8 rows: 4 + 2 + 1 merges
    expect(plain(r.result).map(x => x.order_id)).toEqual(T.mergeSort(priced.slice(0, 8), 'price').map(x => x.order_id))
  }, 60000)

  it('quickselect, Welford and group-by match the engine, Welford exactly 30 on the billion-sized values', async () => {
    const values = PROGRAMS.quickselect.input.value.split(' ').map(Number)
    await load(s, 'quickselect')
    let [r, n] = await jumps(s, 'quickselect', 20)
    expect(r.result.v).toBe(S.quickselect(values, Math.floor(values.length / 2)))
    expect(n).toBe(S.quickselectTrace(values, Math.floor(values.length / 2)).rounds.length)
    await load(s, 'welford');[r, n] = await jumps(s, 'welford', 10)
    expect(n).toBe(4)
    expect(plain(r.result)).toEqual([1000000010, 30])
    await load(s, 'group_by');[r, n] = await jumps(s, 'group_by', 30)
    expect(n).toBe(20)
    expect(Object.fromEntries(Object.entries(plain(r.result)).map(([k, v]) => [k, v.length]))).toEqual(Object.fromEntries([...S.groupBy(priced.slice(0, 20), 'item')].map(([k, v]) => [k, v.length])))
  }, 60000)
})
