// "Query it in SQL": the shop's six tables in real SQLite (sql.js: SQLite compiled to WebAssembly),
// the same tables the spreadsheet lessons have on their sheets, typed by database.js's columnType,
// blanks as NULL. The page loads sql.js the first time a query runs; tests pass their own.
import { HEADER, makeOrders, CATALOGUE_HEADER, makeCatalogue, RETURNS_HEADER, makeReturns, DAYS_HEADER, makeDays, DELIVERIES_HEADER, makeDeliveries, TRIAL_HEADER, makeTrial } from './data.js'
import { columnType, sqlValue, createSql } from './database.js'

export const SHOP_TABLES = () => {
  const orders = makeOrders(), days = makeDays()
  return {
    orders: [HEADER, ...orders], catalogue: [CATALOGUE_HEADER, ...makeCatalogue()], returns: [RETURNS_HEADER, ...makeReturns(orders)],
    days: [DAYS_HEADER, ...days], deliveries: [DELIVERIES_HEADER, ...makeDeliveries(orders)], trial: [TRIAL_HEADER, ...makeTrial(days)],
  }
}
// The tables as rows of typed values, keyed by column name: what the by-hand engine works on.
export function typedRows(table) {
  const [header, ...rows] = table, kinds = header.map((_, j) => columnType(rows.map(row => row[j])))
  return rows.map(row => Object.fromEntries(header.map((h, j) => [h, sqlValue(row[j], kinds[j])])))
}

export function loadShop(SQL, tables = SHOP_TABLES()) {
  const db = new SQL.Database()
  for (const [name, [header, ...rows]] of Object.entries(tables)) {
    db.run(createSql(name, header, rows))
    const kinds = header.map((_, j) => columnType(rows.map(row => row[j])))
    const insert = db.prepare(`INSERT INTO ${name} VALUES (${header.map(() => '?').join(', ')})`)
    for (const row of rows) insert.run(row.map((v, j) => sqlValue(v, kinds[j])))
    insert.free()
  }
  return db
}

// A query's result: { columns, rows }, or { error } in words. Only the last statement's rows are kept.
export function runQuery(db, text) {
  if (!text.trim()) return { error: 'Type a query, starting with SELECT.' }
  try {
    const results = db.exec(text)
    const last = results[results.length - 1]
    return last ? { columns: last.columns, rows: last.values } : { columns: [], rows: [] }
  } catch (e) { return { error: e.message } }
}

const close = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b)) : a === b)
const sameRow = (a, b) => a.length === b.length && a.every((v, k) => close(v, b[k]))
const sortKey = row => JSON.stringify(row.map(v => (typeof v === 'number' ? Number(v.toPrecision(12)) : v)))
// Whether two results hold the same rows: in the same order when the question asks for an order.
export function sameRows(got, want, ordered) {
  if (got.length !== want.length) return false
  if (ordered) return got.every((row, k) => sameRow(row, want[k]))
  const a = [...got].sort((x, y) => (sortKey(x) < sortKey(y) ? -1 : 1)), b = [...want].sort((x, y) => (sortKey(x) < sortKey(y) ? -1 : 1))
  return a.every((row, k) => sameRow(row, b[k]))
}
export const isOrdered = sql => /\border\s+by\b/i.test(sql.replace(/over\s*\([^)]*\)/gi, ''))
export const missingWords = (sql, must = []) => must.filter(word => !new RegExp(`\\b${word.replace(/\s+/g, '\\s+')}\\b`, 'i').test(sql))

// sql.js, loaded once, from the app's own copy (no network).
let loading = null
export function getSql() {
  loading ??= Promise.all([import('sql.js'), import('sql.js/dist/sql-wasm.wasm?url')])
    .then(([m, wasm]) => (m.default ?? m)({ locateFile: () => wasm.default }))
    .catch(e => { loading = null; throw e })   // try again next time, after a lost connection say
  return loading
}
// A fresh copy of the shop for every run: a query may CREATE an index, UPDATE a table or DROP one,
// and the next query still starts from the real tables. Building it takes a few milliseconds.
export const freshShop = () => getSql().then(SQL => loadShop(SQL))
