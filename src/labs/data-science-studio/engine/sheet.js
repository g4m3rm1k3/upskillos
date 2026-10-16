// The spreadsheet lens: the Spreadsheet Lab's own formula engine, run without its grid. A lesson's
// "formula" block puts a table into a workbook, works out the learner's formula, and explains it
// with the same step-by-step explanation the Spreadsheet Lab shows.
import { Workbook } from '../../spreadsheet-lab/engine/workbook.js'
import { explainFormula } from '../../spreadsheet-lab/engine/explain.js'
import { parse } from '../../spreadsheet-lab/engine/parser.js'
import { isError, isMatrix, formatGeneral } from '../../spreadsheet-lab/engine/values.js'
import { indexToCol } from '../../spreadsheet-lab/engine/address.js'
import { makeFold } from '../../spreadsheet-lab/engine/folds.js'
import { HEADER, makeOrders, CATALOGUE_HEADER, makeCatalogue, RETURNS_HEADER, makeReturns } from './data.js'

// The tables that join the orders, on sheets of their own as the Spreadsheet Lab's shop dataset has
// them, so a formula such as =XLOOKUP(D2, catalogue!A2:A8, catalogue!B2:B8) works the same in both.
export const OTHER_SHEETS = () => [['catalogue', [CATALOGUE_HEADER, ...makeCatalogue()]], ['returns', [RETURNS_HEADER, ...makeReturns(makeOrders())]]]
function addOtherSheets(wb) {
  for (const [name, rows] of OTHER_SHEETS()) {
    const other = wb.addSheet(name, { record: false })
    wb.setCells(rows.flatMap((row, r) => row.map((input, c) => ({ sheetId: other.id, row: r, col: c, input, ...(r === 0 ? { style: { bold: true } } : {}) }))), { record: false })
  }
}

const books = new Map()
// A workbook holding the table (an array of rows of text, header first), kept for the session.
export function bookFor(name, table) {
  if (!books.has(name)) {
    const wb = new Workbook(), sheet = wb.sheets[0]
    wb.setCells(table.flatMap((row, r) => row.map((input, c) => ({ sheetId: sheet.id, row: r, col: c, input }))), { record: false })
    addOtherSheets(wb)
    books.set(name, { wb, sheet, rows: table.length, cols: table[0].length })
  }
  return books.get(name)
}

// The tables a formula block can name.
export const TABLES = {
  orders: () => [HEADER, ...makeOrders()],
  small: () => [HEADER, ...makeOrders().slice(0, 12)],
}
export const tableBook = name => bookFor(name, TABLES[name]())

// A cell's value as plain JSON: a number, text, true/false, or { error } for #DIV/0! and the rest.
export function plain(v) {
  if (isError(v)) return { error: v.code ?? String(v) }
  if (isMatrix(v)) return v.rows.map(r => r.map(plain))
  return v
}
export const show = v => (isError(v) ? v.code : typeof v === 'number' ? formatGeneral(v) : isMatrix(v) ? `${v.rows.length} × ${v.rows[0]?.length ?? 0} values` : typeof v === 'boolean' ? String(v).toUpperCase() : `“${v}”`)

// Work out a formula ("=AVERAGE(E2:E403)") on a table: { value, steps, error }.
export function evaluateFormula(name, formula) {
  const { wb, sheet, cols } = tableBook(name)
  const text = formula.trim().replace(/^=/, '')
  if (!text) return { error: 'Type a formula, starting with =.' }
  let tree
  try { tree = parse(text) } catch (e) { return { error: `The spreadsheet can’t read that formula: ${e.message}` } }
  try {
    const { steps, value } = explainFormula(text, tree, wb.context(sheet, 0, cols + 2))
    return { value, steps: steps.map(s => ({ text: s.segments.map(g => g.text).join(''), marked: s.segments.filter(g => g.highlight).map(g => g.text), note: s.note })) }
  } catch (e) { return { error: String(e.message ?? e) } }
}

// ── A lesson's own spreadsheet ───────────────────────────────────────
// The table in a fresh workbook, folded to its first rows, with the answer cell under the data, one
// row clear of it, like a total row (beside the data, the grid would scroll the data out of view to
// show it). The lesson shows it in the real Spreadsheet Lab (FormulaIt.jsx); these check the answer.
export function lessonBook(spec, done = false) {
  const table = TABLES[spec.table]()
  const wb = new Workbook(), sheet = wb.sheets[0], width = table[0].length
  const at = { row: table.length + 1, col: 1 }
  wb.setCells([
    ...table.flatMap((row, r) => row.map((input, c) => ({ sheetId: sheet.id, row: r, col: c, input, ...(r === 0 ? { style: { bold: true } } : {}) }))),
    { sheetId: sheet.id, row: at.row, col: 0, input: 'Your formula →', style: { bold: true } },
    ...(done ? [{ sheetId: sheet.id, row: at.row, col: at.col, input: spec.solution }] : []),
  ], { record: false })
  wb.setFolds(sheet.id, [makeFold({ r1: 0, c1: 0, r2: table.length - 1, c2: width - 1 }, 'peek')], { record: false })
  addOtherSheets(wb)
  return { wb, sheet, at }
}
export const answerCell = at => indexToCol(at.col) + (at.row + 1)

export const same = (a, b, tolerance = 1e-9) => {
  a = plain(a); b = plain(b)
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(b))
  return JSON.stringify(a) === JSON.stringify(b)
}
const expected = new Map()
export const expectedOf = spec => (expected.has(spec.solution + spec.table) ? expected : expected.set(spec.solution + spec.table, evaluateFormula(spec.table, spec.solution).value)).get(spec.solution + spec.table)

// The answer cell checked: null until it holds a formula, then { value, solved, missing }.
export function checkAnswer(spec, { wb, sheet, at }) {
  const input = wb.getCell(sheet.id, at.row, at.col)?.input ?? ''
  if (!input) return null
  if (!input.startsWith('=')) return { error: `${answerCell(at)} holds text, not a formula: start it with =.` }
  const value = wb.valueAt(sheet, at.row, at.col)
  const missing = (spec.must ?? []).filter(fn => !input.toUpperCase().includes(fn.toUpperCase() + '('))
  return { value, missing, solved: !missing.length && !isError(value) && same(value, expectedOf(spec), spec.tolerance) }
}
