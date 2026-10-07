#!/usr/bin/env node
// Turns Notebook Lab series lessons into type-along lessons: every demo cell
// (```python) becomes ```python type, so the learner reads the code and types
// it into an empty editor, followed by an ```output block holding what that
// code prints, which the notebook compares the learner's run with.
//
// The output comes from running the lesson in Pyodide, the same way the
// notebook and the checker do (scripts/lib/notebookPyodide.mjs). Each lesson
// runs three times, in three separate Pyodide instances; a cell that measures time or memory, or whose output differs between the
// runs (unseeded randomness, times, memory addresses) gets no ```output block,
// since the learner could never match it. Error demos (```python error X),
// challenges and OpenMAT cells are left as they are. Running it again on a
// converted lesson refreshes its output blocks.
//
// Usage:
//   node scripts/make_type_along.mjs python                  # report only
//   node scripts/make_type_along.mjs python --write          # rewrite the files
//   node scripts/make_type_along.mjs py-running-code --write # one lesson
// Then check: node scripts/check_notebook_series.mjs <same filters>

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { SERIES_MANIFEST } from '../src/tools/notebook-lab/series/manifest.js'
import { createNotebookRunner } from './lib/notebookPyodide.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const seriesDir = resolve(root, 'src/tools/notebook-lab/series')

const args = process.argv.slice(2)
const write = args.includes('--write')
const filters = args.filter(a => a !== '--write')
if (!filters.length) {
  console.log('Name the series or lessons to convert, e.g. "python" or "py-running-code" (add --write to change files).')
  process.exit(1)
}

const lessons = []
for (const series of SERIES_MANIFEST) {
  for (const lesson of series.lessons) {
    const file = resolve(seriesDir, series.dir, `${lesson.slug}.md`)
    if (!existsSync(file)) continue
    if (filters.some(f => f === series.id || f === lesson.id || resolve(root, f) === file)) lessons.push({ lesson, file })
  }
}

// The lesson as blocks: a top-level code fence { info, body, start, end }, or
// verbatim lines. ::: challenge and ::: math blocks stay verbatim, fences and all.
function blocks(lines) {
  const out = []
  let i = 0
  while (i < lines.length) {
    const t = lines[i].trim()
    if (/^:::\s*(challenge|math)\b/.test(t)) {
      const start = i
      i++
      while (i < lines.length && lines[i].trim() !== ':::') i++
      out.push({ lines: lines.slice(start, i + 1) })
      i++
      continue
    }
    if (t.startsWith('```')) {
      const start = i
      const info = t.slice(3).trim()
      i++
      while (i < lines.length && lines[i].trim() !== '```') i++
      out.push({ info, body: lines.slice(start + 1, i).join('\n'), start })
      i++
      continue
    }
    out.push({ lines: [lines[i]] })
    i++
  }
  return out
}

const MEASURED = /\b(perf_counter|process_time|monotonic|timeit|time\.time|datetime\.now|tracemalloc)\b/

const isDemo = b => b.info === 'python' || b.info === 'python type'

// Three separate Pyodide instances, like three page loads: Python scrambles
// string hashes differently in each process, so set order and hash() can
// differ between them even though two runs in one process agree.
const runners = [await createNotebookRunner(), await createNotebookRunner(), await createNotebookRunner()]

// Runs the lesson's cells in order in a fresh namespace; returns each demo cell's output (or an Error).
async function runLesson(parts, runner) {
  const ns = runner.newNamespace()
  const outputs = new Map()
  for (const b of parts) {
    if (!(isDemo(b) || /^python error\s/.test(b.info ?? ''))) continue
    try {
      const { output } = await runner.run(b.body, ns)
      if (isDemo(b)) outputs.set(b, output)
    } catch (err) {
      if (isDemo(b)) outputs.set(b, new Error(String(err?.message ?? err).trim().split('\n').pop()))
    }
    await runner.figuresOpen(ns)
  }
  ns.destroy()
  return outputs
}

let changedFiles = 0
for (const { lesson, file } of lessons) {
  const source = readFileSync(file, 'utf8')
  const crlf = source.includes('\r\n')
  const parts = blocks(source.replace(/\r\n?/g, '\n').split('\n'))
  const first = await runLesson(parts, runners[0])
  const second = await runLesson(parts, runners[1])
  const third = await runLesson(parts, runners[2])

  const out = []
  let converted = 0
  const unstable = []
  const failed = []
  for (let k = 0; k < parts.length; k++) {
    const b = parts[k]
    if (b.lines) { out.push(...b.lines); continue }
    if (b.info === 'output') {
      // An old expected output: dropped (with the blank lines before it) and regenerated.
      while (out.length && !out[out.length - 1].trim()) out.pop()
      continue
    }
    if (!isDemo(b)) { out.push('```' + b.info, ...(b.body ? b.body.split('\n') : []), '```'); continue }

    converted++
    out.push('```python type', ...b.body.split('\n'), '```')
    const a = first.get(b)
    const c = second.get(b)
    const d = third.get(b)
    const line = b.start + 1
    if (a instanceof Error) { failed.push(`line ${line}: ${a.message}`); continue }
    // Timings and memory use depend on the learner's computer, so they can
    // never be matched, even when three runs here happen to agree.
    if (a !== c || a !== d || MEASURED.test(b.body)) { unstable.push(line); continue }
    const text = a.split('\n').map(l => l.replace(/\s+$/, ''))
    if (!a.trim() || text.some(l => l.trim().startsWith('```'))) continue
    out.push('', '```output', ...text, '```')
  }

  let result = out.join('\n')
  if (crlf) result = result.replace(/\n/g, '\r\n')
  const changed = result !== source
  console.log(`${changed ? 'convert' : 'same   '} ${lesson.id}: ${converted} cells` +
    (unstable.length ? `, no expected output (changes each run) at line ${unstable.join(', ')}` : '') +
    (failed.length ? `; FAILED ${failed.join('; ')}` : ''))
  if (changed && write) { writeFileSync(file, result); changedFiles++ }
}
console.log(write ? `\n${changedFiles} file(s) rewritten.` : '\nReport only; add --write to change the files.')
process.exit(0)
