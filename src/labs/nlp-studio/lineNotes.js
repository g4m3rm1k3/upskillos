// Every line note written in the lessons, indexed by file and line number, so the Real Python tab
// explains whichever line is running with the same words the lessons use. One source of truth.
import { LESSONS } from './lessons/index.js'
import { codeLines } from './source.js'

let index = null
export function lineNotes() {
  if (index) return index
  index = {}
  for (const lesson of LESSONS) for (const block of lesson.blocks) {
    if (!block.code) continue
    const notes = [...(block.code.notes ?? [])]
    for (const { n, text } of codeLines(block.code)) {
      if (!notes.length || !text.includes(notes[0][0])) continue
      const [, bullets] = notes.shift()
      const file = (index[block.code.file] ??= {})
      ;(file[n] ??= []).push({ lesson, bullets })
    }
  }
  return index
}
export const notesFor = (file, line) => lineNotes()[file]?.[line] ?? []
