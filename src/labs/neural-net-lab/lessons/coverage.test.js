// Every statement in the lab's Python programs is explained by a note in some lesson, so the Python
// tab never stops on a line nobody explains. Lines that explain themselves (docstrings, `else:`,
// `break`, `continue`, `pass`) get a general explanation in the tab instead.
import { describe, expect, it } from 'vitest'
import { SOURCES, parse } from '../source.js'
import { notesFor } from '../lineNotes.js'
import { statementLines } from '../../a-arcade-python/analysis.js'

export const SELF_EXPLAINED = /^(else:|break|continue|pass)$/
export function docstringLines(lines) {
  const out = new Set()
  let open = false
  lines.forEach((text, i) => {
    const t = text.trim(), quotes = (t.match(/"""/g) ?? []).length
    if (open || t.startsWith('"""')) out.add(i + 1)
    if (quotes % 2 === 1) open = !open
  })
  return out
}

describe('every Python statement is explained in a lesson', () => {
  for (const file of Object.keys(SOURCES)) {
    it(file, () => {
      const p = parse(file), docs = docstringLines(p.lines)
      const missing = statementLines(p).filter(n => !docs.has(n) && !SELF_EXPLAINED.test(p.lines[n - 1].trim()) && !notesFor(file, n).length)
      expect(missing.map(n => `${n}: ${p.lines[n - 1].trim()}`)).toEqual([])
    })
  }
})
