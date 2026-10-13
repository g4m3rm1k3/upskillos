// The real Python, as text: what the lessons quote and what "Show me" reveals.
import { parsePython } from '../a-arcade-python/analysis.js'

const raw = import.meta.glob('./python/*.py', { query: '?raw', import: 'default', eager: true })
export const SOURCES = Object.fromEntries(Object.entries(raw).map(([p, src]) => [p.split('/').pop(), src.replace(/\r\n/g, '\n')]))

const parsed = {}
export const parse = file => (parsed[file] ??= parsePython(SOURCES[file]))

// A top-level assignment's lines: `NAME = …` to its closing bracket at the start of a line.
function assignment(lines, name) {
  const start = lines.findIndex(l => l.startsWith(`${name} = `))
  if (start < 0) return null
  if (!/[[{(]$/.test(lines[start].trimEnd())) return [start + 1, start + 1]
  const end = lines.findIndex((l, i) => i > start && /^[\]})]/.test(l))
  return [start + 1, end + 1]
}

// The lines a code block shows: a whole function (fn), a constant (assign), or from..to (1-based, inclusive).
export function codeLines({ file, fn, assign, from, to }) {
  const lines = SOURCES[file]?.split('\n') ?? [`# missing file ${file}`]
  if (fn) {
    const f = parse(file).functions.find(x => x.name === fn)
    if (!f) return [{ n: 0, text: `# no function ${fn} in ${file}` }]
    from = f.start; to = f.end
  }
  if (assign) {
    const span = assignment(lines, assign)
    if (!span) return [{ n: 0, text: `# no ${assign} = in ${file}` }]
    ;[from, to] = span
  }
  from ??= 1; to ??= lines.length
  return lines.slice(from - 1, to).map((text, i) => ({ n: from + i, text }))
}
export const functionSource = (file, fn) => codeLines({ file, fn }).map(l => l.text).join('\n')
export const assignSource = (file, name) => codeLines({ file, assign: name }).map(l => l.text).join('\n')

// For tests: the notes of a code block that never find their line (in order).
export function unmatchedNotes(spec) {
  const notes = [...(spec.notes ?? [])]
  for (const { text } of codeLines(spec)) if (notes.length && text.includes(notes[0][0])) notes.shift()
  return notes.map(([has]) => has)
}
