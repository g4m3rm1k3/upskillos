import { def, flat, optNumber, optBool, integer, toMatrix, Matrix, fail, isError, raise, toNumber, toText, wildcard } from './helpers.js'
import { textToNumber } from '../values.js'
import { formatText } from '../format.js'
import { parseDateText } from './helpers.js'

const C = 'Text'
const text1 = (f) => ([s]) => f(toText(s))

function textJoin(delim, ignoreEmpty, values) {
  const parts = []
  for (const v of values) {
    if (isError(v)) raise(v)
    const s = toText(v)
    if (ignoreEmpty && s === '') continue
    parts.push(s)
  }
  return parts.join(delim)
}

// Levenshtein distance by dynamic programming, one row of the table at a time: prev[j] is the
// distance between the first i - 1 characters of a and the first j of b.
function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row.push(Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)))
    }
    prev = row
  }
  return prev[b.length]
}

export default {
  CONCAT: def(C, 'CONCAT(text1, [text2], …)', 'Joins text together.', (args) => textJoin('', false, flat(args)), { min: 1, example: ['=CONCAT("Hello", " ", "world")', 'Hello world'], learn: 'The & operator does the same for two values: =A1&" "&B1.' }),
  CONCATENATE: def(C, 'CONCATENATE(text1, [text2], …)', 'Joins text together (older version of CONCAT; does not accept ranges).', (args) => args.map(toText).join(''), { min: 1 }),
  TEXTJOIN: def(C, 'TEXTJOIN(delimiter, ignore_empty, text1, [text2], …)', 'Joins text with a delimiter between each item.', ([d, ig, ...rest]) => textJoin(toText(d), optBool(ig, true), flat(rest)), { min: 3, example: ['=TEXTJOIN(", ", TRUE, A1:A5)', 'a comma-separated list'] }),
  LEFT: def(C, 'LEFT(text, [num_chars])', 'The first characters of text.', ([s, n]) => { const k = optNumber(n, 1); if (k < 0) fail('#VALUE!'); return toText(s).slice(0, k) }, { scalar: true, example: ['=LEFT("Spreadsheet", 6)', 'Spread'] }),
  RIGHT: def(C, 'RIGHT(text, [num_chars])', 'The last characters of text.', ([s, n]) => { const k = optNumber(n, 1); if (k < 0) fail('#VALUE!'); const t = toText(s); return k === 0 ? '' : t.slice(-k) }, { scalar: true, example: ['=RIGHT("Spreadsheet", 5)', 'sheet'] }),
  MID: def(C, 'MID(text, start_num, num_chars)', 'Characters from the middle of text. Positions start at 1.', ([s, a, n]) => { const st = integer(a), k = integer(n); if (st < 1 || k < 0) fail('#VALUE!', 'start_num must be ≥ 1 and num_chars ≥ 0.'); return toText(s).substr(st - 1, k) }, { scalar: true, example: ['=MID("ABCDEF", 2, 3)', 'BCD'], learn: 'Spreadsheets count characters from 1. Most programming languages count from 0: in Python the same slice is "ABCDEF"[1:4].' }),
  LEN: def(C, 'LEN(text)', 'The number of characters.', text1((s) => s.length), { scalar: true, example: ['=LEN("hello")', '5'] }),
  UPPER: def(C, 'UPPER(text)', 'Converts to upper case.', text1((s) => s.toUpperCase()), { scalar: true }),
  LOWER: def(C, 'LOWER(text)', 'Converts to lower case.', text1((s) => s.toLowerCase()), { scalar: true }),
  PROPER: def(C, 'PROPER(text)', 'Capitalises the first letter of each word.', text1((s) => s.toLowerCase().replace(/(^|[^a-z])([a-z])/g, (_, a, b) => a + b.toUpperCase())), { scalar: true, example: ['=PROPER("ada lovelace")', 'Ada Lovelace'] }),
  TRIM: def(C, 'TRIM(text)', 'Removes extra spaces: from both ends, and repeats between words.', text1((s) => s.replace(/ +/g, ' ').trim()), { scalar: true, learn: 'Stray spaces are the most common reason a lookup cannot find a value that looks identical.' }),
  CLEAN: def(C, 'CLEAN(text)', 'Removes non-printable characters.', text1((s) => s.replace(/[\x00-\x1f]/g, '')), { scalar: true }),
  SUBSTITUTE: def(C, 'SUBSTITUTE(text, old_text, new_text, [instance_num])', 'Replaces occurrences of some text.', ([s, o, n, i]) => {
    const t = toText(s), old = toText(o), rep = toText(n)
    if (old === '') return t
    if (i === undefined) return t.split(old).join(rep)
    const k = integer(i)
    if (k < 1) fail('#VALUE!')
    let idx = -1
    for (let c = 0; c < k; c++) { idx = t.indexOf(old, idx + 1); if (idx < 0) return t }
    return t.slice(0, idx) + rep + t.slice(idx + old.length)
  }, { scalar: [0, 1, 2], example: ['=SUBSTITUTE("2025-01-31", "-", "/")', '2025/01/31'] }),
  REPLACE: def(C, 'REPLACE(old_text, start_num, num_chars, new_text)', 'Replaces characters at a position.', ([s, a, n, r]) => { const t = toText(s), st = integer(a); return t.slice(0, st - 1) + toText(r) + t.slice(st - 1 + integer(n)) }, { scalar: true }),
  FIND: def(C, 'FIND(find_text, within_text, [start_num])', 'The position of text inside other text (case-sensitive).', ([f, w, st]) => { const i = toText(w).indexOf(toText(f), optNumber(st, 1) - 1); if (i < 0) fail('#VALUE!', 'The text was not found.'); return i + 1 }, { scalar: true, example: ['=FIND("@", "ada@example.com")', '4'] }),
  SEARCH: def(C, 'SEARCH(find_text, within_text, [start_num])', 'Like FIND, but ignores case and allows wildcards.', ([f, w, st]) => {
    const hay = toText(w), from = optNumber(st, 1) - 1
    const re = wildcard(toText(f))
    const pattern = new RegExp(re.source.slice(1, -1), 'is')
    const m = pattern.exec(hay.slice(from))
    if (!m) fail('#VALUE!', 'The text was not found.')
    return m.index + from + 1
  }, { scalar: true }),
  REPT: def(C, 'REPT(text, number_times)', 'Repeats text.', ([s, n]) => { const k = integer(n); if (k < 0) fail('#VALUE!'); if (k * toText(s).length > 32767) fail('#VALUE!', 'The result would be longer than a cell can hold.'); return toText(s).repeat(k) }, { scalar: true, example: ['=REPT("★", 4)', '★★★★'], learn: 'REPT makes quick in-cell bar charts: =REPT("|", B2/10).' }),
  EXACT: def(C, 'EXACT(text1, text2)', 'TRUE if two texts are identical, including case.', ([a, b]) => toText(a) === toText(b), { scalar: true }),
  LEVENSHTEIN: def(C, 'LEVENSHTEIN(text1, text2, [ignore_case])', 'The edit distance: how many single characters must be added, removed or changed to turn one text into the other.', ([a, b, ic]) => {
    const fold = optBool(ic, false) ? (s) => s.toLowerCase() : (s) => s
    return editDistance([...fold(toText(a))], [...fold(toText(b))])
  }, {
    scalar: [0, 1], example: ['=LEVENSHTEIN("Helmit", "Helmet")', '1'],
    learn: 'Use it to find typing mistakes: =LEVENSHTEIN(A2, "Harrogate") is small for "Harogate" and large for "York". Given a range, it gives one distance per cell, so =XMATCH(MIN(LEVENSHTEIN(A2, list)), LEVENSHTEIN(A2, list)) finds the closest entry in a list. Swapping two letters counts 2 (two changes). This function is not in Excel or Google Sheets: a file using it shows #NAME? there.',
  }),
  CHAR: def(C, 'CHAR(number)', 'The character with a given code.', ([n]) => { const k = integer(n); if (k < 1 || k > 65535) fail('#VALUE!'); return String.fromCharCode(k) }, { scalar: true, example: ['=CHAR(65)', 'A'] }),
  CODE: def(C, 'CODE(text)', 'The code of the first character.', ([s]) => { const t = toText(s); if (!t) fail('#VALUE!'); return t.charCodeAt(0) }, { scalar: true, example: ['=CODE("A")', '65'] }),
  UNICHAR: def(C, 'UNICHAR(number)', 'The Unicode character with a code point.', ([n]) => String.fromCodePoint(integer(n)), { scalar: true }),
  UNICODE: def(C, 'UNICODE(text)', 'The Unicode code point of the first character.', ([s]) => toText(s).codePointAt(0) ?? fail('#VALUE!'), { scalar: true }),
  TEXT: def(C, 'TEXT(value, format_text)', 'Formats a number as text using a format code.', ([v, f]) => (typeof v === 'number' || typeof v === 'boolean' ? formatText(toNumber(v), toText(f)) : toText(v)), {
    scalar: true, example: ['=TEXT(0.256, "0.0%")', '25.6%'],
    learn: 'The result is text, so it can no longer be used in arithmetic. To change only how a cell looks, use the number format instead. Codes: 0 digit, # optional digit, , thousands, % percent, yyyy mm dd for dates.',
  }),
  VALUE: def(C, 'VALUE(text)', 'Converts text that looks like a number (or date) into a number.', ([s]) => {
    if (typeof s === 'number') return s
    const t = toText(s)
    const n = textToNumber(t.replace(/,/g, '').replace(/^[$£€]/, ''))
    if (n !== null) return n
    const d = parseDateText(t)
    if (d !== null) return d
    return fail('#VALUE!', '"' + t + '" does not look like a number.')
  }, { scalar: true, example: ['=VALUE("1,234.5")', '1234.5'] }),
  NUMBERVALUE: def(C, 'NUMBERVALUE(text, [decimal_separator], [group_separator])', 'Converts text to a number with chosen separators.', ([s, d, g]) => {
    const dec = d === undefined ? '.' : toText(d), grp = g === undefined ? ',' : toText(g)
    const t = toText(s).split(grp).join('').replace(dec, '.')
    const n = textToNumber(t)
    if (n === null) fail('#VALUE!')
    return n
  }, { scalar: true, example: ['=NUMBERVALUE("1.234,5", ",", ".")', '1234.5 (European style)'] }),
  T: def(C, 'T(value)', 'The value if it is text, otherwise "".', ([v]) => (typeof v === 'string' ? v : ''), { scalar: true }),
  TEXTBEFORE: def(C, 'TEXTBEFORE(text, delimiter, [instance_num])', 'The text before a delimiter.', ([s, d, i]) => {
    const t = toText(s), del = toText(d), k = optNumber(i, 1)
    const parts = t.split(del)
    if (parts.length - 1 < Math.abs(k)) fail('#N/A', 'The delimiter does not appear that many times.')
    return k > 0 ? parts.slice(0, k).join(del) : parts.slice(0, parts.length + k).join(del)
  }, { scalar: [0], example: ['=TEXTBEFORE("ada@example.com", "@")', 'ada'] }),
  TEXTAFTER: def(C, 'TEXTAFTER(text, delimiter, [instance_num])', 'The text after a delimiter.', ([s, d, i]) => {
    const t = toText(s), del = toText(d), k = optNumber(i, 1)
    const parts = t.split(del)
    if (parts.length - 1 < Math.abs(k)) fail('#N/A', 'The delimiter does not appear that many times.')
    return k > 0 ? parts.slice(k).join(del) : parts.slice(parts.length + k).join(del)
  }, { scalar: [0], example: ['=TEXTAFTER("ada@example.com", "@")', 'example.com'] }),
  TEXTSPLIT: def(C, 'TEXTSPLIT(text, col_delimiter, [row_delimiter])', 'Splits text into an array.', ([s, cd, rd]) => {
    const t = toText(s), cdel = toText(cd)
    const rows = rd === undefined || rd === null ? [t] : t.split(toText(rd))
    const cells = rows.map((r) => (cdel === '' ? [r] : r.split(cdel)))
    const w = Math.max(...cells.map((r) => r.length))
    return new Matrix(cells.map((r) => [...r, ...Array(w - r.length).fill(null)].map((v) => v ?? null)))
  }, { returnsArray: true, example: ['=TEXTSPLIT("a,b,c", ",")', 'a | b | c across three cells'] }),
  REGEXTEST: def(C, 'REGEXTEST(text, pattern, [case_sensitivity])', 'TRUE if text matches a regular expression.', ([s, p, cs]) => {
    let re
    try { re = new RegExp(toText(p), optNumber(cs, 0) ? 'i' : '') } catch (e) { fail('#VALUE!', 'Invalid regular expression: ' + e.message) }
    return re.test(toText(s))
  }, { scalar: [0], example: ['=REGEXTEST(A2, "^[0-9]{5}$")', 'TRUE for a five-digit code'] }),
  REGEXEXTRACT: def(C, 'REGEXEXTRACT(text, pattern)', 'The first part of text that matches a regular expression.', ([s, p]) => {
    let re
    try { re = new RegExp(toText(p)) } catch (e) { fail('#VALUE!', 'Invalid regular expression: ' + e.message) }
    const m = re.exec(toText(s))
    if (!m) fail('#N/A', 'No match.')
    return m[0]
  }, { scalar: [0] }),
}

export { toMatrix }
