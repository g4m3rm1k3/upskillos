// The real Python programs, as text: what the lessons quote and what the Python tab runs.
import { parsePython } from '../a-arcade-python/analysis.js'

const raw = import.meta.glob('./python/*.py', { query: '?raw', import: 'default', eager: true })
export const SOURCES = Object.fromEntries(Object.entries(raw).map(([p, src]) => [p.split('/').pop(), src.replace(/\r\n/g, '\n')]))

const parsed = {}
export const parse = file => (parsed[file] ??= parsePython(SOURCES[file]))

// The lines a code block shows: a whole function (fn), or from..to (1-based, inclusive).
export function codeLines({ file, fn, from, to }) {
  const lines = SOURCES[file]?.split('\n') ?? [`# missing file ${file}`]
  if (fn) {
    const f = parse(file).functions.find(x => x.name === fn)
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
