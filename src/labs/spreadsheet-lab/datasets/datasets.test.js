// Every dataset loads, and every "thing to try" works on it: formulas give
// no errors, charts find numbers, and the Python really runs (on Pyodide)
// and gives sensible answers.
import { beforeAll, describe, expect, it } from 'vitest'
import { loadPyodide } from 'pyodide'
import { DATASETS } from './index.js'
import { Workbook } from '../engine/workbook.js'
import { parseCell } from '../engine/address.js'
import { readSeries } from '../engine/chart.js'
import { codeReferences, plainValue, shapeForCode } from '../engine/code.js'
import { isError, isMatrix } from '../engine/values.js'

let py
beforeAll(async () => { py = await loadPyodide() }, 120000)

async function sheetFor(ds) {
  const wb = new Workbook()
  const s = wb.sheets[0]
  const rows = await ds.rows()
  wb.setCells(rows.flatMap((r, i) => r.map((v, c) => ({ sheetId: s.id, row: i, col: c, input: String(v) }))))
  for (const extra of (await ds.sheets?.()) ?? []) {
    const other = wb.addSheet(extra.name)
    wb.setCells(extra.rows.flatMap((r, i) => r.map((v, c) => ({ sheetId: other.id, row: i, col: c, input: String(v) }))))
  }
  return { wb, s, rows }
}

function runPython(wb, s, source) {
  const inputs = {}
  for (const ref of codeReferences(source, 'py')) {
    const v = wb.rangeValues(s, ref)
    inputs[ref] = shapeForCode(v.map((r) => r.map(plainValue)))
  }
  py.runPython('import json\n_inputs = json.loads(' + JSON.stringify(JSON.stringify(inputs)) + ')\ndef xl(ref): return _inputs[ref]')
  const ns = py.globals.get('dict')()
  const out = py.runPython(source, { globals: py.globals })
  ns.destroy()
  return out.toJs ? out.toJs() : out
}

const find = (table, label) => table.find((r) => r[0] === label)?.[1]

describe.each(DATASETS)('dataset: $title', (ds) => {
  it.skipIf(!ds.sheets)('brings the sheets its formulas join to, each with a heading row', async () => {
    const extras = await ds.sheets()
    expect(new Set(extras.map((x) => x.name)).size).toBe(extras.length)
    expect(ds.otherSheets.map(([name]) => name)).toEqual(extras.map((x) => x.name))
    for (const x of extras) {
      expect(x.rows[0].every((h) => typeof h === 'string'), x.name).toBe(true)
      expect(x.rows.length, x.name).toBeGreaterThan(2)
    }
    const { wb, s } = await sheetFor(ds)
    expect(wb.previewFormula(s, '=XLOOKUP(D2, catalogue!A2:A8, catalogue!B2:B8)')).toBe('kit')
    // Part 5's sheets: a whole year of days, and the deliveries whose town is looked up in the orders.
    expect(wb.previewFormula(s, '=ROWS(days!A2:A366)')).toBe(365)
    expect(wb.previewFormula(s, '=CORREL(days!B2:B366, days!D2:D366)')).toBeCloseTo(0.8697, 4)
    expect(wb.previewFormula(s, '=COUNTIF(deliveries!B2:B163, "Northern")')).toBe(81)
  })

  it('loads with a heading row and the documented columns', async () => {
    const { rows } = await sheetFor(ds)
    expect(rows.length).toBeGreaterThan(40)
    expect(rows[0].every((h) => typeof h === 'string')).toBe(true)
    expect(ds.origin).toBeTruthy()
  })

  it.each(ds.tries.map((t) => [t.label, t]))('try: %s', async (_, t) => {
    const { wb, s } = await sheetFor(ds)
    for (const step of t.steps) {
      if (step.kind === 'cells') {
        const at = parseCell(step.at)
        wb.setCells(step.rows.flatMap((r, i) => r.map((input, c) => ({ sheetId: s.id, row: at.row + i, col: at.col + c, input }))))
        for (const [i, r] of step.rows.entries()) r.forEach((input, c) => {
          if (!input.startsWith('=')) return
          const v = wb.getCell(s.id, at.row + i, at.col + c).value
          expect(isError(v), step.at + ': ' + input + ' gave ' + (v?.code ?? '') + ' ' + (v?.detail ?? '')).toBe(false)
          if (isMatrix(v)) expect(v.rows.flat().some(isError)).toBe(false)
        })
      } else if (step.kind === 'chart') {
        const values = wb.rangeValues(s, step.source)
        expect(values).not.toBeNull()
        const data = readSeries(values, step.type)
        expect(data.series.some((x) => x.values.some(Number.isFinite))).toBe(true)
        expect(data.notes).toEqual([])
      } else if (step.kind === 'code') {
        const out = runPython(wb, s, step.source)
        expect(Array.isArray(out)).toBe(true)
        step.result = out
      }
    }
    // What the Python versions should find.
    const result = t.steps.find((x) => x.kind === 'code')?.result
    if (t.label.startsWith('Classify with k-nearest')) expect(find(result, 'Accuracy')).toBeGreaterThan(0.9)
    if (t.label.startsWith('Find groups')) expect(result).toHaveLength(4)
    if (t.label.startsWith('k-nearest neighbours, with and without')) expect(find(result, 'Standardised')).toBeGreaterThan(find(result, 'As measured') + 0.1)
    if (t.label.startsWith('Learn the line')) {
      const slope = wb.previewFormula(s, '=SLOPE(B2:B51, A2:A51)')
      expect(find(result, 'Slope m')).toBeCloseTo(slope, 2)
      expect(Math.abs(slope - 5.5)).toBeLessThan(0.6)
    }
    // The shop's A/B test and its model of riders: what Data Science Studio's lessons 7.10 and 8.3 find by hand.
    const cell = (a) => { const p = parseCell(a); return wb.getCell(s.id, p.row, p.col).value }
    if (t.label.startsWith('The website’s A/B test')) {
      expect(cell('J5')).toBeCloseTo(2.957, 3)
      expect(cell('J7')).toBeCloseTo(cell('J6'), 10)
    }
    if (t.label.startsWith('Riders from temperature')) {
      expect(cell('I2').rows[0].map((x) => Math.round(x))).toEqual([94, -12, 22, 291])
      expect(cell('I4').rows.map((r) => r[0])).toEqual(cell('I2').rows[0].slice().reverse().map((x) => expect.closeTo(x, 8)))
    }
    if (t.label.startsWith('Fit and test')) {
      expect(find(result, 'Per m² of floor area')).toBeGreaterThan(1.7)
      expect(find(result, 'Per m² of floor area')).toBeLessThan(2.5)
      expect(find(result, 'Per km from the centre')).toBeLessThan(-3.5)
    }
  }, 60000)
})

// Data Science Studio's spreadsheet exercises, listed under "From the lessons": each works on the
// dataset, and opening one with the learner's own formula puts that formula in its place.
describe.each(DATASETS.filter((d) => d.lessons))('lesson exercises on $title', (ds) => {
  it('each one works out without an error', async () => {
    const { SHEET_EXERCISES } = await ds.lessons()
    expect(SHEET_EXERCISES.length).toBeGreaterThan(5)
    for (const t of SHEET_EXERCISES) {
      const { wb, s } = await sheetFor(ds)
      const step = t.steps[0], at = parseCell(step.at)
      wb.setCells(step.rows.flatMap((r, i) => r.map((input, c) => ({ sheetId: s.id, row: at.row + i, col: at.col + c, input }))))
      const v = wb.getCell(s.id, at.row + 1, at.col).value
      expect(isError(v), t.id + ': ' + t.solution).toBe(false)
    }
  }, 60000)

  it('opens an exercise with the learner’s own formula', async () => {
    const { SHEET_EXERCISES, exerciseTry } = await ds.lessons()
    const t = exerciseTry(SHEET_EXERCISES[0].id, '=COUNTA(A2:A403)')
    expect(t.steps[0].rows[1]).toEqual(['=COUNTA(A2:A403)'])
    expect(exerciseTry('no-such-lesson:0')).toBeNull()
  })
})
