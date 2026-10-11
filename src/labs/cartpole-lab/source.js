// The real Python programs, as text: what the lessons quote and what the Python tab runs.
import { parsePython } from '../a-arcade-python/analysis.js'

const raw = import.meta.glob('./python/*.py', { query: '?raw', import: 'default', eager: true })
export const SOURCES = Object.fromEntries(Object.entries(raw).map(([p, src]) => [p.split('/').pop(), src.replace(/\r\n/g, '\n')]))

const parsed = {}
export const parse = file => (parsed[file] ??= parsePython(SOURCES[file]))

// Every function of a file with its qualified name: `train_dqn`, or `QNet.__init__` for a method,
// because two classes in one file can both have an __init__.
const quals = {}
export function functionsOf(file) {
  if (quals[file]) return quals[file]
  const p = parse(file)
  const classes = []
  p.lines.forEach((text, i) => { const m = /^(\s*)class\s+(\w+)/.exec(text); if (m) classes.push({ name: m[2], line: i + 1, indent: m[1].length }) })
  return (quals[file] = p.functions.map(fn => {
    const owner = classes.filter(c => c.line < fn.start && c.indent < fn.indent).at(-1)
    // The shared parser keeps the stars of a `**name` that follows a space; the name is what Python binds.
    return { ...fn, params: fn.params.map(n => n.replace(/^\*+/, '')), className: owner?.name ?? null, qual: owner ? `${owner.name}.${fn.name}` : fn.name, key: `${file}:${owner ? `${owner.name}.${fn.name}` : fn.name}` }
  }))
}
// The function a line belongs to (the innermost one); a `def` line belongs to the function it starts.
export const fnAt = (file, line) => {
  const p = parse(file), f = p.functions.find(x => line >= x.start && line <= x.header) ?? p.lineFn[line]
  return f ? functionsOf(file).find(x => x.start === f.start) : null
}

// The lines a code block shows: a whole function (fn, plain or qualified), or from..to (1-based).
export function codeLines({ file, fn, from, to }) {
  const lines = SOURCES[file]?.split('\n') ?? [`# missing file ${file}`]
  if (fn) {
    const f = functionsOf(file).find(x => x.qual === fn) ?? functionsOf(file).find(x => x.name === fn)
    if (!f) return [{ n: 0, text: `# no function ${fn} in ${file}` }]
    from = f.start; to = f.end
  }
  from ??= 1; to ??= lines.length
  return lines.slice(from - 1, to).map((text, i) => ({ n: from + i, text }))
}

// For tests: the notes of a code block that never find their line (in order).
export function unmatchedNotes(spec) {
  const notes = [...(spec.notes ?? [])]
  for (const { text } of codeLines(spec)) if (notes.length && text.includes(notes[0][0])) notes.shift()
  return notes.map(([has]) => has)
}

// The lines, in any file, that call a function by its name: `name(` or `.name(`, or `Class(` for
// an __init__. Read statically, so a method name shared by two classes (reset, step) lists the
// calls of both; while the program runs, the Python tab shows the real caller from the stack.
const sites = {}
export function callSitesOf(key) {
  if (sites[key]) return sites[key]
  const [file, qual] = key.split(':')
  const fn = functionsOf(file).find(f => f.qual === qual)
  if (!fn) return []
  const name = fn.name === '__init__' ? fn.className : fn.name
  const pattern = new RegExp(`(^|[^\\w])${name}\\(`)
  const found = []
  for (const other of Object.keys(SOURCES)) {
    const p = parse(other)
    const imports = p.lines.filter(l => /^\s*(from|import)\s/.test(l)).join('\n')
    p.lines.forEach((text, i) => {
      const code = text.split('#')[0]
      if (!pattern.test(code) || /^\s*(def|class)\s/.test(code)) return
      const method = code.includes(`.${name}(`)
      if (!method && other !== file && !new RegExp(`\\b${name}\\b`).test(imports)) return
      found.push({ file: other, line: i + 1, text: text.trim(), caller: fnAt(other, i + 1)?.qual ?? null })
    })
  }
  return (sites[key] = found)
}

// The program's own files: its module and every file of the lab it imports, directly or not.
export function filesFor(module) {
  const seen = new Set(), stack = [`${module}.py`]
  while (stack.length) {
    const file = stack.pop()
    if (seen.has(file) || !SOURCES[file]) continue
    seen.add(file)
    for (const line of parse(file).lines) { const m = /^\s*(?:from\s+(\w+)\s+import|import\s+(\w+))/.exec(line); if (m) stack.push(`${m[1] ?? m[2]}.py`) }
  }
  return seen
}

// The first line of the statement a line belongs to (a statement can go on over several lines).
export function statementStart(file, line) {
  const c = parse(file).continuation
  let n = line
  while (n > 1 && c[n]) n--
  return n
}
// Python's tracer pauses on every line of a statement written over several lines, and can come back
// to its first line (44 → 45 → 44 → 46). For a learner one statement is one step: true when a pause
// is still inside the statement the step started from, or on a continuation line.
export function midStatement(before, after, depthBefore, depthAfter) {
  if (!after) return false
  if (parse(after.file).continuation[after.line]) return true
  return !!before && depthBefore === depthAfter && before.file === after.file && before.function === after.function
    && statementStart(before.file, before.line) === statementStart(after.file, after.line) && parse(before.file).continuation[before.line + 1] === true
}
