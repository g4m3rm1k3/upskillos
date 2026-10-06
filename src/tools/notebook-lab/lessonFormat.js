// Parses a series lesson (Markdown with a few conventions) into notebook
// cells. Used by the app (series.js) and the checker
// (scripts/check_notebook_series.mjs), so both see exactly the same cells.
//
// Format (full description: docs/notebook-series-curriculum.md):
//
//   # Lesson title
//
//   Prose. Paragraphs are separated by blank lines. `## Heading` starts a
//   section. Lists use "- " or "1. ". Math: $inline$ and \[display\].
//
//   ```python
//   demo code: becomes a runnable cell, with the prose above it
//   ```
//
//   ```python error NameError
//   a demo that is meant to raise that error, to teach reading errors
//   ```
//
//   ::: challenge Title [easy|medium|hard]
//   Instructions.
//   ```python starter
//   ```
//   ```python solution
//   ```
//   ```python test
//   ```
//   Hint: one paragraph.
//   :::
//
//   ```python type
//   a type-along cell: this code is shown to read, the editor starts empty,
//   and the learner types it in and runs it
//   ```
//   ```output
//   optional: the output their run should print; the notebook compares the two
//   ```
//
//   ```openmat
//   an OpenMAT (MATLAB-style) demo cell, shown as an embedded OpenMAT notebook
//   ```
//
//   ::: math
//   \[ F_x = F\cos\theta \]
//   - $F$: the force (N)
//   In code: `F * math.cos(theta)`
//   :::
//   the concept's mathematics, drawn as a box in the prose before the code
//   (not allowed inside a challenge, whose ":::" would close it)
//
// Prose after the last cell becomes a text-only cell. A ```lang block that is
// not ```python or ```openmat (e.g. ```text) stays part of the prose and is
// shown as-is.

export class LessonFormatError extends Error {
  constructor(message, line) {
    super(line ? `line ${line}: ${message}` : message)
    this.line = line
  }
}

const CHALLENGE_OPEN = /^:::\s*challenge\s+(.+?)\s*(?:\[(easy|medium|hard)\])?\s*$/
const LIST_ITEM = /^(\s*[-*]\s|\s*\d+\.\s)/

// Prose lines -> the paragraph array PythonNotebook renders.
export function proseItems(lines) {
  const items = []
  let para = []
  const flush = () => {
    if (!para.length) return
    const isList = para.every(l => LIST_ITEM.test(l) || /^\s{2,}\S/.test(l))
    items.push(isList ? para.join('\n') : para.map(l => l.trim()).join(' '))
    para = []
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // ::: math ... ::: — the concept's mathematics, shown as a box before
    // the code. Kept as one string starting "::: math\n" so prose stays an
    // array of strings.
    if (line.trim() === '::: math') {
      flush()
      const block = []
      i++
      while (i < lines.length && lines[i].trim() !== ':::') block.push(lines[i++])
      items.push(['::: math', ...block].join('\n'))
      continue
    }
    if (line.trimStart().startsWith('```')) {
      flush()
      const block = [line]
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) block.push(lines[i++])
      block.push('```')
      items.push(block.join('\n'))
      continue
    }
    if (!line.trim()) { flush(); continue }
    if (line.startsWith('## ')) { flush(); items.push(line.trim()); continue }
    para.push(line)
  }
  flush()
  return items
}

export function parseLesson(source) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  let i = 0
  while (i < lines.length && !lines[i].trim()) i++
  if (!lines[i]?.startsWith('# ')) throw new LessonFormatError('lesson must start with "# Title"', i + 1)
  const title = lines[i].slice(2).trim()
  i++

  const cells = []
  let prose = []
  let challengeCount = 0
  const push = cell => cells.push({ id: cells.length + 1, output: '', status: 'idle', ...cell })

  // Reads a fenced block starting at lines[i]; returns [info, body, nextIndex].
  const readFence = (start) => {
    const info = lines[start].trim().slice(3).trim()
    const body = []
    let j = start + 1
    while (j < lines.length && lines[j].trim() !== '```') body.push(lines[j++])
    if (j >= lines.length) throw new LessonFormatError('code block is never closed', start + 1)
    return [info, body.join('\n'), j + 1]
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith('# ')) throw new LessonFormatError('only the first line may be a "# " title; use "## " for sections', i + 1)

    if (trimmed.startsWith('```')) {
      const [info, body, next] = readFence(i)
      const errorDemo = info.match(/^python error\s+(\w+)$/)
      if (info === 'python' || errorDemo) {
        if (!body.trim()) throw new LessonFormatError('empty python block', i + 1)
        const cell = { prose: proseItems(prose), code: body, cellTitle: '' }
        // A demo that is meant to fail, to teach reading an error. The
        // notebook labels the error as expected when its type matches.
        if (errorDemo) cell.expectError = errorDemo[1]
        push(cell)
        prose = []
      } else if (info === 'python type') {
        // A type-along cell: the code is shown to read, the editor starts
        // empty, and the learner types it in and runs it. An ```output block
        // right after it (blank lines between are fine) is the output the
        // learner's run is compared with.
        if (!body.trim()) throw new LessonFormatError('empty python type block', i + 1)
        const cell = { prose: proseItems(prose), code: '', typeIt: true, solution: body, cellTitle: '' }
        let k = next
        while (k < lines.length && !lines[k].trim()) k++
        if (lines[k]?.trim() === '```output') {
          const [, expected, after] = readFence(k)
          cell.expectedOutput = expected
          i = after
        } else {
          i = next
        }
        push(cell)
        prose = []
        continue
      } else if (info === 'output') {
        throw new LessonFormatError('an ```output block must come right after a ```python type block', i + 1)
      } else if (info === 'openmat') {
        // An OpenMAT (MATLAB-style) demo cell, run by the in-browser OpenMAT
        // engine instead of Python. Each OpenMAT cell runs on its own: it
        // shares no variables with Python cells or other OpenMAT cells.
        if (!body.trim()) throw new LessonFormatError('empty openmat block', i + 1)
        push({ prose: proseItems(prose), code: body, cellTitle: '', lang: 'openmat' })
        prose = []
      } else if (info.startsWith('python')) {
        throw new LessonFormatError(`"${info}" blocks belong inside a ::: challenge`, i + 1)
      } else {
        prose.push(...lines.slice(i, next))
      }
      i = next
      continue
    }

    const open = trimmed.match(CHALLENGE_OPEN)
    if (open) {
      if (prose.some(l => l.trim())) push({ prose: proseItems(prose), code: '', proseOnly: true })
      prose = []
      const startLine = i + 1
      const ch = { instructions: [], hint: [] }
      let inHint = false
      i++
      while (i < lines.length && lines[i].trim() !== ':::') {
        const l = lines[i]
        if (l.trim().startsWith('```')) {
          const [info, body, next] = readFence(i)
          const kind = info.replace(/^python\s*/, '')
          if (!info.startsWith('python') || !['starter', 'solution', 'test'].includes(kind)) {
            if (inHint) throw new LessonFormatError('a code block cannot follow the hint', i + 1)
            ch.instructions.push(...lines.slice(i, next))
          } else {
            if (ch[kind] !== undefined) throw new LessonFormatError(`second "${kind}" block`, i + 1)
            ch[kind] = body
            inHint = false
          }
          i = next
          continue
        }
        if (/^hint:/i.test(l.trim())) { inHint = true; ch.hint.push(l.trim().replace(/^hint:\s*/i, '')); i++; continue }
        if (inHint && !l.trim()) { inHint = false; i++; continue }
        if (inHint) ch.hint.push(l.trim())
        else ch.instructions.push(l)
        i++
      }
      if (i >= lines.length) throw new LessonFormatError('challenge is never closed with ":::"', startLine)
      for (const kind of ['starter', 'solution', 'test']) {
        if (ch[kind] === undefined) throw new LessonFormatError(`challenge "${open[1]}" has no python ${kind} block`, startLine)
      }
      if (!ch.hint.length) throw new LessonFormatError(`challenge "${open[1]}" has no "Hint:" line`, startLine)
      challengeCount++
      push({
        prose: proseItems(ch.instructions),
        code: ch.starter,
        challengeType: 'write',
        challengeTitle: open[1],
        challengeNumber: challengeCount,
        difficulty: open[2],
        testCode: ch.test,
        solution: ch.solution,
        hint: ch.hint.join(' '),
      })
      i++ // closing :::
      continue
    }

    prose.push(line)
    i++
  }
  if (prose.some(l => l.trim())) push({ prose: proseItems(prose), code: '', proseOnly: true })

  return { title, cells }
}
