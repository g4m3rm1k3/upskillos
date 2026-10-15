// The spreadsheet lens: the Spreadsheet Lab's own formula engine, run without its grid. A lesson's
// "formula" block puts a table into a workbook, works out the learner's formula, and explains it
// with the same step-by-step explanation the Spreadsheet Lab shows.
import { Workbook } from '../../spreadsheet-lab/engine/workbook.js'
import { explainFormula } from '../../spreadsheet-lab/engine/explain.js'
import { parse } from '../../spreadsheet-lab/engine/parser.js'
import { isError, isMatrix, formatGeneral } from '../../spreadsheet-lab/engine/values.js'
import { indexToCol } from '../../spreadsheet-lab/engine/address.js'
import { HEADER, makeOrders } from './data.js'

const books = new Map()
// A workbook holding the table (an array of rows of text, header first), kept for the session.
export function bookFor(name, table) {
  if (!books.has(name)) {
    const wb = new Workbook(), sheet = wb.sheets[0]
    wb.setCells(table.flatMap((row, r) => row.map((input, c) => ({ sheetId: sheet.id, row: r, col: c, input }))), { record: false })
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

export const columnLetters = n => Array.from({ length: n }, (_, i) => indexToCol(i))
