// Every line note written in a lab's lessons, indexed by file and line number, so the Python tab can
// explain whichever line is running with the same words the lessons use. One source of truth.
//
// A note is [has, bullets, extra?]: the text its line contains, what the line does (Markdown), and
// optionally { tex, calc, logic }: the line's maths in LaTeX; calc(v), its arithmetic with the
// paused program's values (v: the function's variables, the file's constants, `self` as a plain
// object of its attributes), giving [the sum written out, its result]; and logic, a condition
// translated into words.
//
// `lessons()` is called on first use, so a lab's lessons can import from the lab freely.
export function makeLineNotes(lessons, codeLines) {
  let index = null
  function lineNotes() {
    if (index) return index
    index = {}
    for (const lesson of lessons()) for (const block of lesson.blocks) {
      if (!block.code) continue
      const notes = [...(block.code.notes ?? [])]
      for (const { n, text } of codeLines(block.code)) {
        if (!notes.length || !text.includes(notes[0][0])) continue
        const [, bullets, extra = {}] = notes.shift()
        const file = (index[block.code.file] ??= {})
        ;(file[n] ??= []).push({ lesson, bullets, ...extra })
      }
    }
    return index
  }
  const notesFor = (file, line) => lineNotes()[file]?.[line] ?? []
  // The first note on a line that has maths, a calculation or logic, if any.
  const extrasFor = (file, line) => {
    const notes = notesFor(file, line)
    return { tex: notes.find(n => n.tex)?.tex, calc: notes.find(n => n.calc)?.calc, logic: notes.find(n => n.logic)?.logic }
  }
  return { lineNotes, notesFor, extrasFor }
}
