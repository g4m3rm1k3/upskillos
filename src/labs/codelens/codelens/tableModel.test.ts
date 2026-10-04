// The Data dock's tables, built from a real Python trace of a Q-table.
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { buildTables } from './tableModel'
import { buildHeapSnapshot } from './renderer/heapSnapshot'
import { desktopScript, parseDesktopResult } from './interpreter/pythonExecutionClient'

const python = ['python', 'python3'].find(cmd => spawnSync(cmd, ['--version']).status === 0)

const PROGRAM = [
  'names = ["Up", "Down", "Left", "Right"]',
  'Q = {(r, c): [0.0, 0.0, 0.0, 0.0] for r in range(2) for c in range(2)}',
  'Q[(0, 1)][3] = -1.5',
  'row = Q[(0, 1)]',
  'settings = {"gamma": 0.9}',
  'done = True',
].join('\n') + '\n'

describe.skipIf(!python)('Data dock tables', () => {
  const run = spawnSync(python!, ['-'], { input: desktopScript(PROGRAM), encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } })
  const result = parseDesktopResult(run.stdout.replace(/\r\n/g, '\n'))!
  const tablesAt = (index: number) => buildTables(buildHeapSnapshot(result.events, index), result.events[index])
  const last = result.events.length - 1

  it('shows a dict of lists as a grid, with column names from a list of strings', () => {
    const q = tablesAt(last).find(t => t.name === 'Q')!
    expect(q.kind).toBe('grid')
    expect(q.shape).toBe('4 × 4')
    expect(q.columns).toEqual(['Up', 'Down', 'Left', 'Right'])
    expect(q.columnSource).toBe('names')
    expect(q.rows.map(r => r.key)).toEqual(['(0, 0)', '(0, 1)', '(1, 0)', '(1, 1)'])
    expect(q.rows[1].cells.map(c => c.value)).toEqual([0, 0, 0, -1.5])
  })

  it('highlights the cell the step changed', () => {
    // The event after line 3 carries line 3's change.
    const after = result.events.findIndex(e => e.type === 'statement_enter' && e.line === 4)
    const q = tablesAt(after).find(t => t.name === 'Q')!
    expect(q.rows[1].cells.map(c => c.changed)).toEqual([false, false, false, true])
    expect(q.rows[0].changed).toBe(false)
  })

  it('shows a list once, under the first name that refers to it, and a dict as pairs', () => {
    const tables = tablesAt(last)
    // `row` is the same list as Q[(0, 1)], which already shows inside the grid; it gets its own row view.
    expect(tables.find(t => t.name === 'row')?.kind).toBe('row')
    expect(tables.find(t => t.name === 'names')?.kind).toBe('row')
    const settings = tables.find(t => t.name === 'settings')!
    expect(settings.kind).toBe('pairs')
    expect(settings.rows.map(r => [r.key, r.cells[0].value])).toEqual([['gamma', 0.9]])
    expect(tables.find(t => t.name === 'done')).toBeUndefined()   // plain values are in Values, not here
    expect(tables[0].kind).toBe('grid')                          // grids first
  })
})
