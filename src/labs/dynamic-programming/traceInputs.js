// Turning what the learner types into a trace's input, and back. A field is described in INPUTS
// (tables.js). parseField returns { value } or { error }, the error written for the learner.

const numbers = text => text.split(/[\s,]+/).filter(Boolean)
const isInt = s => /^-?\d+$/.test(s)

function inRange(n, field, what = 'Each number') {
  if (n < field.min || n > field.max) return `${what} must be from ${field.min} to ${field.max}.`
  return null
}

function parseRows(text, field) {
  const rows = text.split(/[;\n/]+/).map(r => r.trim()).filter(Boolean)
  if (field.rows && (rows.length < field.rows[0] || rows.length > field.rows[1])) return { error: `Use ${field.rows[0]} to ${field.rows[1]} rows, separated by “;”.` }
  const out = []
  for (const row of rows) {
    // A 0/1 grid may be typed without spaces: "010".
    const cells = field.kind === 'grid' && /^[01]+$/.test(row) ? row.split('') : numbers(row)
    if (!cells.every(isInt)) return { error: `“${row}” has something that isn’t a whole number.` }
    out.push(cells.map(Number))
  }
  return { value: out }
}

export function parseField(field, raw) {
  const text = String(raw ?? '').trim()
  switch (field.kind) {
    case 'int': {
      if (!isInt(text)) return { error: `${field.label}: type a whole number.` }
      const n = Number(text), bad = inRange(n, field, field.label)
      return bad ? { error: bad } : { value: n }
    }
    case 'ints': {
      const parts = numbers(text)
      if (!parts.every(isInt)) return { error: `${field.label}: whole numbers separated by commas.` }
      const [lo, hi] = field.len
      if (parts.length < lo || parts.length > hi) return { error: `${field.label}: give ${lo === hi ? lo : `${lo} to ${hi}`} numbers.` }
      const ns = parts.map(Number)
      for (const n of ns) { const bad = inRange(n, field, `${field.label}: each number`); if (bad) return { error: bad } }
      return { value: ns }
    }
    case 'text': {
      const [lo, hi] = field.len
      if (text.length < lo || text.length > hi) return { error: `${field.label}: ${lo} to ${hi} characters.` }
      if (!new RegExp(`^[${field.chars.replace(/[()?]/g, '\\$&')}]+$`).test(text)) return { error: `${field.label}: use only ${field.chars === '()?' ? '“(”, “)” and “?”' : field.chars}.` }
      return { value: text }
    }
    case 'words': {
      const words = numbers(text.toLowerCase())
      const [lo, hi] = field.len
      if (words.length < lo || words.length > hi) return { error: `${field.label}: give ${lo} to ${hi} words, separated by commas.` }
      if (!words.every(w => /^[a-z]{1,8}$/.test(w))) return { error: `${field.label}: lowercase letters only, up to 8 each.` }
      return { value: [...new Set(words)] }
    }
    case 'groups': {
      const groups = text.split(/[;\n]+/).map(g => g.trim()).filter(Boolean)
      if (groups.length < field.len[0] || groups.length > field.len[1]) return { error: `${field.label}: give ${field.len[0]} to ${field.len[1]} groups, separated by “;”.` }
      const value = []
      for (const g of groups) {
        const options = g.split(',').map(o => numbers(o))
        if (!options.every(o => o.length === 2 && o.every(isInt))) return { error: `“${g}”: each option is two whole numbers, weight and value, and options are separated by commas.` }
        const nums = options.map(o => o.map(Number))
        for (const x of nums.flat()) { const bad = inRange(x, field); if (bad) return { error: bad } }
        value.push(nums)
      }
      return { value }
    }
    case 'edges': {
      // "0 1, 1 2" (from to), or "0 1 5, 1 2 -3" with a weight when field.weighted.
      const parts = text.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean)
      const [lo, hi] = field.len
      if (parts.length < lo || parts.length > hi) return { error: `${field.label}: give ${lo} to ${hi} edges, separated by commas.` }
      const size = field.weighted ? 3 : 2, value = []
      for (const p of parts) {
        const nums = p.split(/\s+/)
        if (nums.length !== size || !nums.every(isInt)) return { error: `“${p}”: an edge is ${field.weighted ? 'from, to and weight' : 'from and to'}, whole numbers separated by spaces.` }
        const e = nums.map(Number)
        if (e[0] < 0 || e[1] < 0) return { error: `“${p}”: vertices are numbered from 0.` }
        if (field.weighted) { const bad = inRange(e[2], field, 'Each weight'); if (bad) return { error: bad } }
        value.push(e)
      }
      return { value }
    }
    case 'grid':
    case 'matrix': {
      const { value, error } = parseRows(text, field)
      if (error) return { error }
      const width = value[0].length
      if (!value.every(r => r.length === width)) return { error: 'Every row needs the same number of cells.' }
      if (width < field.cols[0] || width > field.cols[1]) return { error: `Use ${field.cols[0]} to ${field.cols[1]} cells in each row.` }
      if (field.kind === 'grid' && !value.flat().every(x => x === 0 || x === 1)) return { error: 'A grid holds only 0s and 1s.' }
      if (field.kind === 'matrix') for (const n of value.flat()) { const bad = inRange(n, field); if (bad) return { error: bad } }
      return { value }
    }
    case 'triangle': {
      const { value, error } = parseRows(text, field)
      if (error) return { error }
      const wrong = value.findIndex((r, i) => r.length !== i + 1)
      if (wrong >= 0) return { error: `Row ${wrong} needs ${wrong + 1} number${wrong ? 's' : ''}: row r has r + 1.` }
      for (const n of value.flat()) { const bad = inRange(n, field); if (bad) return { error: bad } }
      return { value }
    }
    default:
      return { error: `Unknown field kind ${field.kind}.` }
  }
}

export function formatField(field, value) {
  switch (field.kind) {
    case 'ints':
    case 'words':
      return value.join(', ')
    case 'grid':
      return value.map(r => r.join('')).join('; ')
    case 'matrix':
    case 'triangle':
      return value.map(r => r.join(' ')).join('; ')
    case 'groups':
      return value.map(g => g.map(o => o.join(' ')).join(', ')).join('; ')
    case 'edges':
      return value.map(e => e.join(' ')).join(', ')
    default:
      return String(value)
  }
}

// Every field parsed, then the trace's own cross-field rule. { value: input } or { error }.
export function parseInput(spec, texts) {
  const input = {}
  for (const field of spec.fields) {
    const { value, error } = parseField(field, texts[field.key])
    if (error) return { error }
    input[field.key] = value
  }
  const bad = spec.rule?.(input)
  return bad ? { error: bad } : { value: input }
}

// A random input for a whole spec. A spec whose fields depend on each other (c interleaves a and b;
// an expression alternates symbols and operators) brings its own generator, `random(r)`, where r(a, b)
// is a whole number from a to b. Word lists are kept as they are.
export function randomInput(spec, rng = Math.random, current = {}) {
  if (spec.random) return spec.random((a, b) => a + Math.floor(rng() * (b - a + 1)))
  return Object.fromEntries(spec.fields.map(f => [f.key, f.kind === 'words' ? current[f.key] : randomField(f, rng)]))
}

// A random value inside a field's limits, kept small enough to draw ("Surprise me", and the tests).
// rng() returns a number in [0, 1).
export function randomField(f, rng = Math.random) {
  const r = (a, b) => a + Math.floor(rng() * (b - a + 1))
  switch (f.kind) {
    case 'int': return r(f.min, Math.min(f.max, f.min + 7))
    case 'ints': return Array.from({ length: r(Math.max(f.len[0], 2), Math.min(f.len[1], 7)) }, () => r(f.min, f.max))
    case 'text': {
      // Few distinct letters, so that words match and letters repeat; digits that often pair into letters.
      const alphabet = f.chars === '0-9' ? '12012633' : f.chars === '()?' ? '()??' : 'abc'
      return Array.from({ length: r(Math.max(f.len[0], 3), Math.min(f.len[1], 7)) }, () => alphabet[r(0, alphabet.length - 1)]).join('')
    }
    case 'grid': { const R = r(2, Math.min(5, f.rows[1])), C = r(2, Math.min(6, f.cols[1])); return Array.from({ length: R }, () => Array.from({ length: C }, () => (rng() < 0.25 ? 1 : 0))) }
    case 'matrix': { const R = r(2, Math.min(4, f.rows[1])), C = r(2, Math.min(5, f.cols[1])); return Array.from({ length: R }, () => Array.from({ length: C }, () => r(f.min, f.max))) }
    case 'triangle': return Array.from({ length: r(3, Math.min(5, f.rows[1])) }, (_, i) => Array.from({ length: i + 1 }, () => r(f.min, f.max)))
    default: return undefined
  }
}
