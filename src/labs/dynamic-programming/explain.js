// The explained reference code (lessons/explained.js) as lines with their notes. A note goes under the
// first line, at or after the previous note's line, that contains that language's text (several notes
// may share a line). `missing` lists notes whose text was not found, so a test can catch them.
import { EXPLAINED } from './lessons/explained.js'

export { EXPLAINED }

export function explainLines(entry, language) {
  const lines = entry.code[language].trimEnd().split('\n').map((text, i) => ({ n: i + 1, text, notes: [] }))
  const index = language === 'Python' ? 0 : 1
  const missing = []
  let from = 0
  for (const note of entry.notes) {
    const at = lines.findIndex((line, i) => i >= from && line.text.includes(note[index]))
    if (at < 0) { missing.push(note[index]); continue }
    lines[at].notes.push(note[2])
    from = at
  }
  return { lines, missing }
}
