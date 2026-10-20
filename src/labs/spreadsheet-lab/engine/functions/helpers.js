// Shared rules for the function library.
import { Matrix, err, fail, isError, isMatrix, raise, textToNumber, toNumber, toText } from '../values.js'
import { compare } from '../evaluate.js'

// Define a function with its documentation. Every function in the lab has
// learner-facing docs: they drive the help panel, autocomplete and the tests.
export function def(category, syntax, summary, fn, { min, max, args = [], example, learn, scalar, lazy, volatile, returnsArray, refs } = {}) {
  const required = (syntax.match(/\(([^)]*)\)/)?.[1] ?? '').split(',').map((s) => s.trim()).filter((s) => s && !s.startsWith('[') && s !== '…')
  return {
    category, syntax, summary, fn, args, example, learn, scalar, lazy, volatile, returnsArray, refs,
    min: min ?? required.length,
    max: max ?? (syntax.includes('…') ? Infinity : (syntax.match(/\(([^)]*)\)/)?.[1] ?? '').split(',').filter((s) => s.trim()).length),
  }
}

// ── Collecting numbers (SUM, AVERAGE, MAX…) ───────────────────────────────
// Excel treats values differently depending on where they come from:
//   typed straight into the call:  =SUM(1, "2", TRUE)  counts all three (=4)
//   inside a range or array:        text and TRUE/FALSE are skipped
// Errors always stop the calculation.
export function numbers(args, { includeLogicalInRanges = false, textAsZero = false } = {}) {
  const out = []
  for (const a of args) {
    if (a === undefined) continue
    if (isMatrix(a)) {
      for (const v of a.values()) {
        if (typeof v === 'number') out.push(v)
        else if (isError(v)) raise(v)
        else if (typeof v === 'boolean' && includeLogicalInRanges) out.push(v ? 1 : 0)
        else if (typeof v === 'string' && textAsZero) out.push(0)
      }
    } else if (a === null) continue
    else out.push(toNumber(a))
  }
  return out
}

// Every value, flattened in row order (blanks kept as null).
export function flat(args) {
  const out = []
  for (const a of args) {
    if (isMatrix(a)) out.push(...a.values())
    else out.push(a)
  }
  return out
}

export const toMatrix = Matrix.of
export const optNumber = (v, fallback) => (v === undefined || v === null ? fallback : toNumber(v))
export const optBool = (v, fallback) => (v === undefined || v === null ? fallback : (typeof v === 'boolean' ? v : toNumber(v) !== 0))
export const optText = (v, fallback) => (v === undefined ? fallback : toText(v))

export function integer(v, name = 'argument') {
  const n = Math.trunc(toNumber(v))
  if (!Number.isFinite(n)) fail('#NUM!', 'The ' + name + ' must be a finite number.')
  return n
}

// ── Criteria (COUNTIF, SUMIF, AVERAGEIFS…) ────────────────────────────────
// A criterion is a value or text such as ">5", "<>apple", "a*" (wildcards: *
// any text, ? one character, ~ to match a literal * or ?).
export function criterion(c) {
  if (typeof c === 'number' || typeof c === 'boolean') return (v) => v === c || (typeof v === 'string' && textToNumber(v) === c && typeof c === 'number')
  if (isError(c)) return (v) => isError(v) && v.code === c.code
  const s = toText(c)
  const m = /^(<=|>=|<>|<|>|=)?(.*)$/s.exec(s)
  const op = m[1] || '='
  const rhsText = m[2]
  const rhsNum = textToNumber(rhsText)
  const rhsBool = /^(TRUE|FALSE)$/i.test(rhsText) ? rhsText.toUpperCase() === 'TRUE' : null
  if (rhsNum !== null) {
    return (v) => {
      const x = typeof v === 'number' ? v : null
      if (x === null) return op === '<>'
      return { '=': x === rhsNum, '<>': x !== rhsNum, '<': x < rhsNum, '>': x > rhsNum, '<=': x <= rhsNum, '>=': x >= rhsNum }[op]
    }
  }
  if (rhsBool !== null && (op === '=' || op === '<>')) return (v) => (op === '=' ? v === rhsBool : v !== rhsBool)
  if (op === '=' || op === '<>') {
    if (rhsText === '') return (v) => (op === '=' ? v === null || v === '' : !(v === null || v === ''))
    const re = wildcard(rhsText)
    return (v) => {
      const hit = typeof v === 'string' && re.test(v)
      return op === '=' ? hit : !hit
    }
  }
  return (v) => {
    if (typeof v !== 'string') return false
    const c2 = compare(v, rhsText)
    return { '<': c2 < 0, '>': c2 > 0, '<=': c2 <= 0, '>=': c2 >= 0 }[op]
  }
}

export function wildcard(pattern) {
  let re = ''
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === '~' && i + 1 < pattern.length) { re += escapeRe(pattern[++i]); continue }
    re += ch === '*' ? '.*' : ch === '?' ? '.' : escapeRe(ch)
  }
  return new RegExp('^' + re + '$', 'is')
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Pairs a criteria range with a criterion, checking sizes match.
export function criteriaMask(pairs, h, w) {
  const mask = Array.from({ length: h * w }, () => true)
  for (const [range, crit] of pairs) {
    const R = toMatrix(range)
    if (R.height !== h || R.width !== w) fail('#VALUE!', 'Every criteria range must be the same size as the range being summed or counted.')
    const test = criterion(crit)
    let i = 0
    for (const v of R.values()) { if (!test(v)) mask[i] = false; i++ }
  }
  return mask
}

// ── Dates ─────────────────────────────────────────────────────────────────
// Spreadsheets store dates as serial numbers: days since 31 Dec 1899, so
// 1 = 1 Jan 1900 and 45658 = 1 Jan 2025. Times are fractions of a day.
// Excel (copying Lotus 1-2-3) wrongly treats 1900 as a leap year, so serial 60
// is the non-existent 29 Feb 1900. We match it so serials agree with Excel.
const DAY_MS = 86400000
const BASE = Date.UTC(1899, 11, 30) // serial 0 for dates after 1 Mar 1900

export function serialToDate(serial) {
  const s = serial < 60 ? serial + 1 : serial // before the phantom 29 Feb, shift by a day
  return new Date(BASE + Math.round(s * DAY_MS))
}

export function dateToSerial(d) {
  const s = (d.getTime() - BASE) / DAY_MS
  return s < 61 ? s - 1 : s
}

export function ymdToSerial(y, m, d) {
  // Months and days roll over: DATE(2025, 13, 1) is 1 Jan 2026, as in Excel.
  if (y >= 0 && y < 1900) y += 1900
  return dateToSerial(new Date(Date.UTC(y, m - 1, d)))
}

export function serialParts(serial) {
  const n = toNumber(serial)
  if (n < 0) fail('#NUM!', 'Dates before 1900 cannot be represented.')
  if (Math.floor(n) === 60) return { y: 1900, m: 2, d: 29, wd: 3, h: 0, mi: 0, s: 0 }
  const date = serialToDate(n)
  const frac = n - Math.floor(n)
  const secs = Math.round(frac * 86400)
  return {
    y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate(), wd: date.getUTCDay(),
    h: Math.floor(secs / 3600) % 24, mi: Math.floor(secs / 60) % 60, s: secs % 60,
  }
}

// Text such as "2025-03-14", "14/03/2025" or "14 Mar 2025" → serial, or null.
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
export function parseDateText(text) {
  const s = String(text).trim()
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s)
  if (m) return ymdToSerial(+m[1], +m[2], +m[3]) + timeFraction(m[4], m[5], m[6])
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (m) return ymdToSerial(+m[3], +m[2], +m[1]) // day/month/year
  m = /^(\d{1,2})[ -]([A-Za-z]{3,})[ -](\d{4})$/.exec(s)
  if (m && MONTHS.includes(m[2].slice(0, 3).toLowerCase())) return ymdToSerial(+m[3], MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1, +m[1])
  m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(s)
  if (m) {
    let h = +m[1]
    if (m[4]) h = (h % 12) + (m[4].toLowerCase() === 'pm' ? 12 : 0)
    return timeFraction(h, m[2], m[3])
  }
  return null
}
const timeFraction = (h, mi, s) => (h === undefined ? 0 : (+h * 3600 + +mi * 60 + +(s || 0)) / 86400)

export { err, fail, isError, isMatrix, raise, toNumber, toText, Matrix }
