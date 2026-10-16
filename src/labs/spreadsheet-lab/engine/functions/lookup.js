import { def, optNumber, optBool, integer, toMatrix, Matrix, err, fail, isError, isMatrix, raise, toNumber, toText, wildcard } from './helpers.js'
import { compare } from '../evaluate.js'
import { toBoolean } from '../values.js'
import { formatCell, quoteSheet } from '../address.js'

const C = 'Lookup'
const A = 'Arrays'

const equal = (a, b) => {
  if (typeof a === 'string' && typeof b === 'string') return a.toLowerCase() === b.toLowerCase()
  return a === b
}

// Exact match with wildcard support when the lookup value is text.
function exactIndex(list, value, wildcards = true) {
  if (typeof value === 'string' && wildcards && /[*?~]/.test(value)) {
    const re = wildcard(value)
    return list.findIndex((v) => typeof v === 'string' && re.test(v))
  }
  return list.findIndex((v) => equal(v, value))
}

// Approximate match on sorted data: the position of the largest value ≤ target
// (binary search, which is why the data must be sorted ascending).
function approxIndex(list, value) {
  let lo = 0, hi = list.length - 1, best = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const v = list[mid]
    if (v === null || typeof v !== typeof value) { // skip incomparable values like Excel does
      let k = mid
      while (k >= lo && (list[k] === null || typeof list[k] !== typeof value)) k--
      if (k < lo) { lo = mid + 1; continue }
      if (compare(list[k], value) <= 0) { best = k; lo = mid + 1 } else hi = k - 1
      continue
    }
    if (compare(v, value) <= 0) { best = mid; lo = mid + 1 } else hi = mid - 1
  }
  return best
}

const column = (M, c) => M.rows.map((row) => row[c] ?? null)
const vector = (M) => (M.height === 1 ? M.rows[0] : M.width === 1 ? column(M, 0) : fail('#VALUE!', 'Expected a single row or column.'))
const notFound = (value) => err('#N/A', 'The lookup value ' + JSON.stringify(value) + ' was not found.')

function xmatchIndex(list, value, mode = 0, search = 1) {
  if (isError(value)) raise(value)
  const order = search < 0 ? [...list.keys()].reverse() : [...list.keys()]
  if (search === 2 || search === -2) {
    const i = mode === 0 ? exactIndex(list, value, false) : approxIndex(list, value)
    return i
  }
  if (mode === 2) { const re = wildcard(toText(value)); return order.find((i) => typeof list[i] === 'string' && re.test(list[i])) ?? -1 }
  const exact = order.find((i) => equal(list[i], value))
  if (exact !== undefined || mode === 0) return exact ?? -1
  let best = -1
  for (const i of order) {
    const v = list[i]
    if (v === null || typeof v !== typeof value) continue
    const c = compare(v, value)
    if (mode === -1 && c < 0 && (best < 0 || compare(v, list[best]) > 0)) best = i
    if (mode === 1 && c > 0 && (best < 0 || compare(v, list[best]) < 0)) best = i
  }
  return best
}

function sortRows(M, keys) {
  const idx = M.rows.map((_, i) => i)
  idx.sort((a, b) => {
    for (const { values, asc } of keys) {
      const c = compareForSort(values[a], values[b])
      if (c) return asc ? c : -c
    }
    return a - b // stable: equal rows keep their order
  })
  return idx
}
// Blanks sort last, errors after everything.
function compareForSort(a, b) {
  if (a === b) return 0
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  if (isError(a)) return 1
  if (isError(b)) return -1
  return compare(a, b)
}

export default {
  VLOOKUP: def(C, 'VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])', 'Looks for a value in the first column of a table and returns a value from another column of the same row.', ([v, t, ci, rl]) => {
    const T = toMatrix(t), c = integer(ci, 'column number')
    if (isError(v)) raise(v)
    if (c < 1) fail('#VALUE!', 'The column number must be 1 or more.')
    if (c > T.width) fail('#REF!', 'The table has only ' + T.width + ' columns, but column ' + c + ' was requested.')
    const keys = column(T, 0)
    const i = optBool(rl, true) ? approxIndex(keys, v) : exactIndex(keys, v)
    if (i < 0) return notFound(v)
    return T.get(i, c - 1)
  }, {
    example: ['=VLOOKUP("Apple", A2:C20, 3, FALSE)', 'the third column for Apple'],
    learn: 'Always give FALSE as the last argument unless you mean it: the default (TRUE) is an approximate match on sorted data, which silently returns a wrong row when the data is not sorted. VLOOKUP can only look to the right of the first column; XLOOKUP or INDEX/MATCH can look anywhere.',
  }),
  HLOOKUP: def(C, 'HLOOKUP(lookup_value, table_array, row_index_num, [range_lookup])', 'Like VLOOKUP, but searches the first row and returns from another row.', ([v, t, ri, rl]) => {
    const T = toMatrix(t), r = integer(ri, 'row number')
    if (isError(v)) raise(v)
    if (r < 1) fail('#VALUE!')
    if (r > T.height) fail('#REF!', 'The table has only ' + T.height + ' rows.')
    const keys = T.rows[0]
    const i = optBool(rl, true) ? approxIndex(keys, v) : exactIndex(keys, v)
    if (i < 0) return notFound(v)
    return T.get(r - 1, i)
  }),
  XLOOKUP: def(C, 'XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])', 'Searches a range and returns the matching item from another range.', ([v, la, ra, nf, mm, sm]) => {
    const L = toMatrix(la), R = toMatrix(ra)
    const list = vector(L)
    const i = xmatchIndex(list, v, optNumber(mm, 0), optNumber(sm, 1))
    if (i < 0) return nf === undefined ? notFound(v) : nf
    if (L.width === 1 || L.height > 1) return R.width === 1 ? R.get(i, 0) : new Matrix([R.rows[i]])
    return R.height === 1 ? R.get(0, i) : new Matrix(R.rows.map((row) => [row[i]]))
  }, {
    // Given several lookup values (=XLOOKUP(D2:D403, …)), it looks each one up, as Excel does: one
    // result per value. With several values, only the first column of a multi-column return is kept.
    scalar: [0],
    example: ['=XLOOKUP(E2, A2:A50, C2:C50, "not found")', 'the C value for E2'],
    learn: 'XLOOKUP replaces VLOOKUP: it matches exactly by default, can return a value from any column (including to the left), and takes a value to show when nothing is found. match_mode: 0 exact, -1 exact or next smaller, 1 exact or next larger, 2 wildcard.',
  }),
  MATCH: def(C, 'MATCH(lookup_value, lookup_array, [match_type])', 'The position of a value in a row or column.', ([v, la, mt]) => {
    if (isError(v)) raise(v)
    const list = vector(toMatrix(la))
    const type = optNumber(mt, 1)
    let i
    if (type === 0) i = exactIndex(list, v)
    else if (type > 0) i = approxIndex(list, v)
    else { // descending data: smallest value ≥ target
      i = -1
      for (let k = 0; k < list.length; k++) if (list[k] !== null && compare(list[k], v) >= 0) i = k; else break
    }
    return i < 0 ? notFound(v) : i + 1
  }, { scalar: [0], example: ['=MATCH("Pear", A2:A20, 0)', 'the row number of Pear within A2:A20'], learn: 'MATCH returns a position, which INDEX turns back into a value: =INDEX(C2:C20, MATCH("Pear", A2:A20, 0)). Use 0 for an exact match.' }),
  XMATCH: def(C, 'XMATCH(lookup_value, lookup_array, [match_mode], [search_mode])', 'The position of a value, with XLOOKUP\'s matching options.', ([v, la, mm, sm]) => { const i = xmatchIndex(vector(toMatrix(la)), v, optNumber(mm, 0), optNumber(sm, 1)); return i < 0 ? notFound(v) : i + 1 }, {
    scalar: [0], example: ['=ISNA(XMATCH(A2:A20, D2:D50))', 'TRUE for each value of A2:A20 that is nowhere in D2:D50'],
    learn: 'Given a range of values, XMATCH gives a position for each one, or #N/A where it is missing: wrapped in ISNA and FILTER, that lists what failed to match (an anti-join). Like every lookup, it ignores capitals but not spaces: TRIM first.',
  }),
  INDEX: def(C, 'INDEX(array, row_num, [column_num])', 'The value at a given row and column of a range.', ([a, r, c]) => {
    const M = toMatrix(a)
    let row = optNumber(r, 0), col = optNumber(c, 0)
    if (M.height === 1 && c === undefined) { col = row; row = 1 } // a single row: the one number is a column
    if (row < 0 || col < 0 || row > M.height || col > M.width) fail('#REF!', 'Row ' + row + ', column ' + col + ' is outside the ' + M.height + '×' + M.width + ' range.')
    if (row === 0 && col === 0) return M
    if (row === 0) return new Matrix(M.rows.map((x) => [x[col - 1]]))
    if (col === 0) return M.width === 1 ? M.get(row - 1, 0) : new Matrix([M.rows[row - 1]])
    return M.get(row - 1, col - 1)
  }, { min: 2, example: ['=INDEX(A1:C10, 3, 2)', 'the value in the 3rd row, 2nd column'], learn: 'Row and column numbers count from the top-left of the range, not of the sheet. A 0 returns the whole column or row.' }),
  CHOOSE: def(C, 'CHOOSE(index_num, value1, [value2], …)', 'Picks one of the values by its position.', (args) => {
    const i = Math.trunc(toNumber(args[0]()))
    if (i < 1 || i >= args.nodes.length) fail('#VALUE!', 'The index must be between 1 and ' + (args.nodes.length - 1) + '.')
    return args[i]()
  }, { min: 2, lazy: true, example: ['=CHOOSE(2, "red", "green", "blue")', 'green'] }),
  ROW: def(C, 'ROW([reference])', 'The row number of a reference (or of this cell).', ([r], ctx) => (r instanceof Matrix && r.ref ? r.ref.r1 + 1 : r === undefined ? ctx.row + 1 : fail('#VALUE!', 'ROW needs a reference.')), { min: 0, max: 1 }),
  COLUMN: def(C, 'COLUMN([reference])', 'The column number of a reference (or of this cell).', ([r], ctx) => (r instanceof Matrix && r.ref ? r.ref.c1 + 1 : r === undefined ? ctx.col + 1 : fail('#VALUE!', 'COLUMN needs a reference.')), { min: 0, max: 1 }),
  ROWS: def(C, 'ROWS(array)', 'The number of rows.', ([a]) => toMatrix(a).height),
  COLUMNS: def(C, 'COLUMNS(array)', 'The number of columns.', ([a]) => toMatrix(a).width),
  ADDRESS: def(C, 'ADDRESS(row_num, column_num, [abs_num], [a1], [sheet_text])', 'A cell address as text.', ([r, c, ab, , sh]) => {
    const abs = optNumber(ab, 1)
    const text = formatCell({ row: integer(r) - 1, col: integer(c) - 1, absRow: abs === 1 || abs === 2, absCol: abs === 1 || abs === 3 })
    return (sh === undefined ? '' : quoteSheet(toText(sh)) + '!') + text
  }, { example: ['=ADDRESS(2, 3)', '$C$2'] }),
  INDIRECT: def(C, 'INDIRECT(ref_text)', 'The value at a reference given as text.', ([t], ctx) => ctx.resolveText(toText(t)), { volatile: true, example: ['=INDIRECT("B"&A1)', 'the cell in column B at row A1'], learn: 'INDIRECT builds references from text. It is powerful but hard to follow: the spreadsheet cannot tell which cells it depends on until it runs, so it recalculates every time.' }),
  OFFSET: def(C, 'OFFSET(reference, rows, cols, [height], [width])', 'A range shifted from a starting reference.', ([ref, r, c, h, w], ctx) => {
    if (!(ref instanceof Matrix) || !ref.ref) fail('#VALUE!', 'OFFSET needs a reference as its first argument.')
    const top = ref.ref.r1 + integer(r), left = ref.ref.c1 + integer(c)
    const height = optNumber(h, ref.height), width = optNumber(w, ref.width)
    if (top < 0 || left < 0 || height < 1 || width < 1) fail('#REF!', 'OFFSET moved off the edge of the sheet.')
    const M = ctx.getRange(ref.ref.sheet, top, left, top + height - 1, left + width - 1)
    return M.height === 1 && M.width === 1 ? M.get(0, 0) : M
  }, { volatile: true }),

  // ── Dynamic arrays ──────────────────────────────────────────────────────
  TRANSPOSE: def(A, 'TRANSPOSE(array)', 'Swaps rows and columns.', ([a]) => { const M = toMatrix(a); return Matrix.fill(M.width, M.height, (r, c) => M.get(c, r)) }, { returnsArray: true, example: ['=TRANSPOSE(A1:C2)', 'a 3×2 block'] }),
  FILTER: def(A, 'FILTER(array, include, [if_empty])', 'The rows (or columns) of an array where include is TRUE.', ([a, inc, ifEmpty]) => {
    const M = toMatrix(a), I = toMatrix(inc)
    let keep
    if (I.width === 1 && I.height === M.height) {
      keep = I.rows.map((r) => { if (isError(r[0])) raise(r[0]); return toBoolean(r[0] ?? false) })
      const rows = M.rows.filter((_, i) => keep[i])
      if (rows.length) return new Matrix(rows)
    } else if (I.height === 1 && I.width === M.width) {
      keep = I.rows[0].map((v) => toBoolean(v ?? false))
      const rows = M.rows.map((row) => row.filter((_, i) => keep[i]))
      if (rows[0].length) return new Matrix(rows)
    } else fail('#VALUE!', 'include must be one column as tall as the array, or one row as wide.')
    return ifEmpty === undefined ? err('#CALC!', 'No rows matched the condition. Add a third argument to show instead.') : ifEmpty
  }, { returnsArray: true, example: ['=FILTER(A2:C50, C2:C50>100, "none")', 'the rows with C over 100'], learn: 'Combine conditions with * for AND and + for OR: =FILTER(A2:C9, (B2:B9="North")*(C2:C9>100)).' }),
  SORT: def(A, 'SORT(array, [sort_index], [sort_order], [by_col])', 'Sorts the rows of an array.', ([a, si, so, bc]) => {
    let M = toMatrix(a)
    const byCol = optBool(bc, false)
    if (byCol) M = Matrix.fill(M.width, M.height, (r, c) => M.get(c, r))
    const k = optNumber(si, 1) - 1
    if (k < 0 || k >= M.width) fail('#VALUE!', 'sort_index is outside the array.')
    const order = sortRows(M, [{ values: column(M, k), asc: optNumber(so, 1) >= 0 }])
    let out = new Matrix(order.map((i) => M.rows[i]))
    if (byCol) out = Matrix.fill(out.width, out.height, (r, c) => out.get(c, r))
    return out
  }, { returnsArray: true, example: ['=SORT(A2:B20, 2, -1)', 'sorted by column 2, largest first'] }),
  SORTBY: def(A, 'SORTBY(array, by_array1, [sort_order1], …)', 'Sorts an array by the values in other ranges.', ([a, ...rest]) => {
    const M = toMatrix(a)
    const keys = []
    for (let i = 0; i < rest.length; i += 2) {
      const values = vector(toMatrix(rest[i]))
      if (values.length !== M.height) fail('#VALUE!', 'Each by_array must have one value per row.')
      keys.push({ values, asc: optNumber(rest[i + 1], 1) >= 0 })
    }
    return new Matrix(sortRows(M, keys).map((i) => M.rows[i]))
  }, { min: 2, returnsArray: true }),
  UNIQUE: def(A, 'UNIQUE(array, [by_col], [exactly_once])', 'The distinct rows of an array.', ([a, , once]) => {
    const M = toMatrix(a)
    const keyOf = (row) => JSON.stringify(row.map((v) => (typeof v === 'string' ? v.toLowerCase() : isError(v) ? v.code : v)))
    const counts = new Map()
    for (const row of M.rows) counts.set(keyOf(row), (counts.get(keyOf(row)) ?? 0) + 1)
    const seen = new Set()
    const rows = M.rows.filter((row) => {
      const k = keyOf(row)
      if (seen.has(k)) return false
      seen.add(k)
      return !optBool(once, false) || counts.get(k) === 1
    })
    return rows.length ? new Matrix(rows) : err('#CALC!', 'No values occur exactly once.')
  }, { min: 1, returnsArray: true, example: ['=UNIQUE(A2:A100)', 'each different value once'] }),
  TAKE: def(A, 'TAKE(array, rows, [columns])', 'The first (or, with negative numbers, last) rows and columns.', ([a, r, c]) => {
    const M = toMatrix(a)
    const pick = (list, n) => (n === undefined || n === null ? list : n >= 0 ? list.slice(0, n) : list.slice(n))
    const rows = pick(M.rows, r === undefined ? undefined : integer(r)).map((row) => pick(row, c === undefined ? undefined : integer(c)))
    if (!rows.length || !rows[0].length) fail('#CALC!', 'TAKE would return nothing.')
    return new Matrix(rows)
  }, { returnsArray: true }),
  DROP: def(A, 'DROP(array, rows, [columns])', 'The array without its first (or last) rows and columns.', ([a, r, c]) => {
    const M = toMatrix(a)
    const cut = (list, n) => (n === undefined || n === null ? list : n >= 0 ? list.slice(n) : list.slice(0, n))
    const rows = cut(M.rows, r === undefined ? undefined : integer(r)).map((row) => cut(row, c === undefined ? undefined : integer(c)))
    if (!rows.length || !rows[0].length) fail('#CALC!', 'DROP would remove everything.')
    return new Matrix(rows)
  }, { returnsArray: true }),
  VSTACK: def(A, 'VSTACK(array1, [array2], …)', 'Stacks arrays on top of each other.', (args) => {
    const ms = args.map(toMatrix), w = Math.max(...ms.map((m) => m.width))
    return new Matrix(ms.flatMap((m) => m.rows.map((row) => [...row, ...Array(w - row.length).fill(err('#N/A'))])))
  }, { min: 1, returnsArray: true }),
  HSTACK: def(A, 'HSTACK(array1, [array2], …)', 'Puts arrays side by side.', (args) => {
    const ms = args.map(toMatrix), h = Math.max(...ms.map((m) => m.height))
    return Matrix.fill(h, ms.reduce((s, m) => s + m.width, 0), (r, c) => {
      for (const m of ms) { if (c < m.width) return r < m.height ? m.get(r, c) : err('#N/A'); c -= m.width }
      return null
    })
  }, { min: 1, returnsArray: true }),
  TOCOL: def(A, 'TOCOL(array)', 'All the values of an array in one column.', ([a]) => new Matrix([...toMatrix(a).values()].map((v) => [v])), { returnsArray: true }),
  TOROW: def(A, 'TOROW(array)', 'All the values of an array in one row.', ([a]) => new Matrix([[...toMatrix(a).values()]]), { returnsArray: true }),
}

export { isMatrix }
