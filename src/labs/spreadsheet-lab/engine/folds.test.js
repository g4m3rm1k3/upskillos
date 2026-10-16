import { describe, expect, it } from 'vitest'
import { PEEK_ROWS, addFold, expandForFolds, foldAt, foldHiddenRows, foldedSpan, nextFoldState } from './folds.js'
import { Workbook } from './workbook.js'

const table = (state) => ({ id: 'f1', source: 'A1:C21', state }) // a heading and 20 rows

describe('folds', () => {
  it('cycles open → peek → closed → open', () => {
    expect(nextFoldState('open')).toBe('peek')
    expect(nextFoldState('peek')).toBe('closed')
    expect(nextFoldState('closed')).toBe('open')
  })

  it('peek keeps the heading and the first rows; closed keeps the heading only', () => {
    expect(foldHiddenRows([table('open')]).size).toBe(0)
    const peek = foldHiddenRows([table('peek')])
    expect(peek.size).toBe(20 - PEEK_ROWS)
    expect(peek.has(PEEK_ROWS)).toBe(false) // row index 5 is the 5th data row
    expect(peek.has(PEEK_ROWS + 1)).toBe(true)
    const closed = foldHiddenRows([table('closed')])
    expect(closed.size).toBe(20)
    expect(closed.has(0)).toBe(false)
  })

  it('a short table in peek hides nothing', () => {
    expect(foldedSpan({ source: 'A1:B4', state: 'peek' })).toBeNull()
  })

  it('finds a fold by its heading row', () => {
    expect(foldAt([table('peek')], 0)?.id).toBe('f1')
    expect(foldAt([table('peek')], 1)).toBeNull()
  })

  it('a new fold replaces one it overlaps, and keeps one it does not', () => {
    const other = { id: 'f2', source: 'E1:F5', state: 'open' }
    const next = addFold([table('open'), other], { id: 'f3', source: 'A1:C30', state: 'peek' })
    expect(next.map((f) => f.id)).toEqual(['f2', 'f3'])
  })

  it('copying the heading row of a folded table takes every row of it', () => {
    expect(expandForFolds({ r1: 0, c1: 0, r2: 0, c2: 2 }, [table('closed')])).toEqual({ r1: 0, c1: 0, r2: 20, c2: 2 })
    expect(expandForFolds({ r1: 0, c1: 0, r2: 0, c2: 2 }, [table('open')]).r2).toBe(0)
    expect(expandForFolds({ r1: 1, c1: 0, r2: 3, c2: 2 }, [table('closed')]).r2).toBe(3)
  })
})

describe('folds in a workbook', () => {
  const book = () => {
    const wb = new Workbook()
    const s = wb.sheets[0]
    wb.setCells(Array.from({ length: 21 }, (_, r) => ({ sheetId: s.id, row: r, col: 0, input: r ? String(r) : 'n' })))
    return { wb, s }
  }

  it('formulas still read folded rows', () => {
    const { wb, s } = book()
    wb.setFolds(s.id, [table('closed')])
    wb.setCells([{ sheetId: s.id, row: 0, col: 4, input: '=SUM(A2:A21)' }])
    expect(wb.valueAt(s, 0, 4)).toBe(210)
  })

  it('undo puts the fold back as it was', () => {
    const { wb, s } = book()
    wb.setFolds(s.id, [table('peek')])
    wb.setFolds(s.id, [table('closed')])
    wb.undo()
    expect(s.folds[0].state).toBe('peek')
  })

  it('is saved and loaded with the workbook', () => {
    const { wb, s } = book()
    wb.setFolds(s.id, [table('peek')])
    const back = Workbook.fromJSON(JSON.parse(JSON.stringify(wb.toJSON())))
    expect(back.sheets[0].folds).toEqual([table('peek')])
  })

  it('moves with rows inserted above it, and goes when its rows are deleted', () => {
    const { wb, s } = book()
    wb.setFolds(s.id, [table('peek')])
    wb.insertRows(s.id, 0, 2)
    expect(s.folds[0].source).toBe('A3:C23')
    wb.deleteRows(s.id, 0, 30)
    expect(wb.sheets[0].folds).toEqual([])
  })
})
