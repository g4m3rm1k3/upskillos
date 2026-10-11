// Facts read from Python source: each function's lines and inputs, which lines continue a
// statement from the line above, and which explanation note belongs to which line.

// A line's open brackets, ignoring anything inside strings or after a comment.
function bracketChange(text) {
  let depth = 0, quote = null
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue }
    if (c === '#') break
    if (c === '"' || c === "'") quote = c
    else if ('([{'.includes(c)) depth++
    else if (')]}'.includes(c)) depth--
  }
  return depth
}

function params(signature) {
  const inside = signature.slice(signature.indexOf('(') + 1, signature.lastIndexOf(')'))
  const out = []; let depth = 0, current = ''
  for (const c of inside) {
    if ('([{'.includes(c)) depth++
    if (')]}'.includes(c)) depth--
    if (c === ',' && depth === 0) { out.push(current); current = '' } else current += c
  }
  out.push(current)
  return out.map(p => p.split('=')[0].split(':')[0].replace(/^\*+/, '').trim()).filter(Boolean)
}

export function parsePython(source) {
  const lines = source.split('\n')
  const continuation = [], functions = [], lineFn = []
  let depth = 0
  lines.forEach((text, i) => { continuation[i + 1] = depth > 0; depth += bracketChange(text) })
  const indentOf = t => t.match(/^ */)[0].length
  lines.forEach((text, i) => {
    const m = /^(\s*)def (\w+)\(/.exec(text)
    if (!m || continuation[i + 1]) return
    const indent = m[1].length
    let header = i, signature = text
    while (!/\)\s*(->[^:]*)?:\s*(#.*)?$/.test(signature) && header + 1 < lines.length) { header++; signature += ' ' + lines[header].trim() }
    let end = header + 1
    for (let j = header + 1; j < lines.length; j++) {
      const t = lines[j]
      if (!t.trim() || continuation[j + 1]) continue
      if (indentOf(t) <= indent) break
      end = j + 1
    }
    functions.push({ name: m[2], start: i + 1, header: header + 1, end, indent, params: params(signature) })
  })
  // Each line belongs to the innermost function whose body contains it.
  for (const fn of [...functions].sort((a, b) => a.indent - b.indent)) for (let n = fn.header + 1; n <= fn.end; n++) lineFn[n] = fn
  return { lines, continuation, functions, lineFn }
}

// Which lines are statements a note should explain: inside a function, not blank, not a comment,
// not the continuation of a statement begun on the line above.
export function statementLines(parsed) {
  const out = []
  parsed.lines.forEach((text, i) => {
    const n = i + 1, t = text.trim()
    if (parsed.lineFn[n] && t && !t.startsWith('#') && !parsed.continuation[n]) out.push(n)
  })
  return out
}

// Match each function's notes to its lines, in order, by text the line contains.
export function matchNotes(parsed, fileNotes = {}) {
  const notes = [], unmatched = []
  for (const fn of parsed.functions) {
    const queue = [...(fileNotes[fn.name] ?? [])]
    for (let n = fn.header + 1; n <= fn.end; n++) {
      if (parsed.lineFn[n] !== fn) continue
      const k = queue.findIndex(note => parsed.lines[n - 1].includes(note.has))
      if (k >= 0) notes[n] = queue.splice(k, 1)[0]
    }
    unmatched.push(...queue.map(note => `${fn.name}: ${note.has}`))
  }
  for (const name of Object.keys(fileNotes)) if (!parsed.functions.some(fn => fn.name === name)) unmatched.push(`${name}: no such function`)
  return { notes, unmatched }
}

// Everything the lab needs about a program's files.
export function analyseProgram(files, explain) {
  return Object.fromEntries(Object.entries(files).map(([file, source]) => {
    const parsed = parsePython(source)
    const { notes, unmatched } = matchNotes(parsed, explain.LINES[file])
    return [file, { ...parsed, notes, unmatched, statements: statementLines(parsed) }]
  }))
}

// A live value from the stepper ({t, v, shape, ...}) as a plain JavaScript value, for the
// arithmetic in the notes: numbers stay numbers, arrays become nested arrays of their shape.
export function plain(summary) {
  if (!summary) return undefined
  const { t } = summary
  if (['int', 'float', 'bool', 'str', 'none'].includes(t)) return summary.v
  if (t === 'ndarray' || t === 'tensor') {
    const shape = summary.shape, flat = summary.v ?? []
    if (shape.length === 0) return flat[0]
    const build = (dims, offset) => dims.length === 1 ? flat.slice(offset, offset + dims[0]) : Array.from({ length: dims[0] }, (_, i) => build(dims.slice(1), offset + i * dims.slice(1).reduce((a, b) => a * b, 1)))
    return build(shape, 0)
  }
  if (t === 'list' || t === 'tuple') return summary.items?.map(plain)
  if (t === 'dict') return summary.items && Object.fromEntries(Object.entries(summary.items).map(([k, v]) => [k, plain(v)]))
  return summary
}

// Split a Python line into tokens, for colouring and clicks.
const KEYWORDS = new Set(['def', 'return', 'for', 'in', 'if', 'else', 'elif', 'while', 'with', 'import', 'from', 'as', 'class', 'and', 'or', 'not', 'is', 'None', 'True', 'False', 'lambda', 'break', 'continue', 'pass'])
export function tokenizePython(text) {
  const out = [], pattern = /(\s+)|(#.*$)|(f?"[^"]*"|f?'[^']*')|([A-Za-z_][\w]*)|(\d[\d_]*(?:\.\d+)?(?:e-?\d+)?)|(\*\*|\/\/|==|!=|>=|<=|\+=|-=|->|[-+*/%<>=!@|&~^:.,;()[\]{}])/g
  let m
  while ((m = pattern.exec(text))) {
    const [token, space, comment, string, name, number] = m
    if (space) out.push({ text: token, kind: 'space' })
    else if (comment) out.push({ text: token, kind: 'comment' })
    else if (string) out.push({ text: token, kind: 'string' })
    else if (name) out.push({ text: token, kind: KEYWORDS.has(token) ? 'keyword' : 'name' })
    else if (number) out.push({ text: token, kind: 'number' })
    else out.push({ text: token, kind: 'op' })
  }
  out.forEach((t, i) => { if (t.kind === 'name' && out[i - 1]?.text === '.') { t.property = true; t.object = out[i - 2]?.text } })
  return out
}
