#!/usr/bin/env node
// Verifies a notebook-driven course (default: data-science) against a real
// Pyodide interpreter, distinguishing the three kinds of cell a lesson has:
//
//   demonstration  — must run without error. Optional `expectOutput: [..]`
//                    lists substrings that must appear in its printed output
//                    (plus the repr of a trailing expression).
//   intended error — a demonstration with `expectError: "NameError"`; it must
//                    raise an exception whose last traceback line contains it.
//   challenge      — has `challengeType`. Its starter `code` must NOT pass
//                    `testCode`; its reference `solution` must pass; each
//                    `misconceptions: [{ code, feedback }]` entry must fail
//                    with a message containing `feedback`.
//
// Each notebook runs in its own fresh namespace (demonstrations in order);
// each challenge check gets its own fresh namespace, so challenges must be
// self-contained. The script also checks inline "check" answers, quiz answer
// indexes, prereq/unlock ids, ML-lab links into the course, and flags bare
// `$` in rendered prose (the lesson renderer treats `$...$` as LaTeX).
//
// Usage:
//   node scripts/check-data-science-course.mjs [courseId] [--only <substr>] [--show]
//   PYODIDE_PATH=/path/to/node_modules/pyodide node scripts/check-data-science-course.mjs
// PYODIDE_PATH lets you pin the exact Pyodide the browser loads (0.26.4 at the
// time of writing — see getPyodide() in PythonNotebook.jsx).

import { readdirSync, statSync, existsSync } from 'fs'
import { resolve, dirname, relative, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { OPENCALC_LIB_SOURCE } from '../src/components/notebooks/opencalcLibSource.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const args = process.argv.slice(2)
const courseId = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--only') ?? 'data-science'
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const show = args.includes('--show')
const courseDir = resolve(root, 'src/courses', courseId)
const PACKAGES = ['numpy', 'pandas', 'matplotlib', 'scikit-learn', 'scipy']

const failures = []
const warnings = []
const fail = (where, msg) => failures.push(`${where}\n    ${msg}`)
const warn = (where, msg) => warnings.push(`${where}\n    ${msg}`)

function lessonFiles() {
  const files = []
  for (const ch of readdirSync(courseDir).sort()) {
    const chPath = join(courseDir, ch)
    if (!/^\d/.test(ch) || !statSync(chPath).isDirectory()) continue
    for (const f of readdirSync(chPath).sort()) if (f.endsWith('.js')) files.push(join(chPath, f))
  }
  return files
}

// Every PythonNotebook in a lesson, wherever it is nested (legacy
// visualizations arrays or blocks-format { type: 'viz' } entries).
function notebooks(lesson) {
  const found = []
  const walk = (v, path) => {
    if (!v || typeof v !== 'object') return
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`))
    if ((v.id === 'PythonNotebook' || v.vizId === 'PythonNotebook') && (v.props ?? v.initialProps)?.initialCells) {
      found.push({ path, title: v.title, cells: (v.props ?? v.initialProps).initialCells })
      return
    }
    for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`)
  }
  walk(lesson, 'lesson')
  return found
}

function inlineChecks(lesson) {
  const found = []
  const walk = (v) => {
    if (!v || typeof v !== 'object') return
    if (Array.isArray(v)) return v.forEach(walk)
    if ((v.type === 'check' || (v.question && v.options && 'answer' in v)) && Array.isArray(v.options)) found.push(v)
    for (const x of Object.values(v)) walk(x)
  }
  walk(lesson.intuition)
  return found
}

// Strings the lesson renderer passes through Markdown+KaTeX.
function renderedStrings(lesson) {
  const out = []
  const push = (s) => typeof s === 'string' && out.push(s)
  const intu = lesson.intuition ?? {}
  ;(intu.prose ?? []).forEach(push)
  for (const b of intu.blocks ?? []) {
    if (b.type === 'prose') (b.paragraphs ?? []).forEach(push)
    if (b.type === 'callout') push(b.body)
    if (b.type === 'check') { push(b.question); (b.options ?? []).forEach(push); push(b.explanation) }
  }
  for (const c of intu.callouts ?? []) push(c.body)
  ;(lesson.mentalModel ?? []).forEach(push)
  return out
}

function bareDollar(s) {
  const withoutCode = s.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')
  return /(^|[^\\])\$/.test(withoutCode)
}

async function main() {
  const pyPath = process.env.PYODIDE_PATH
  const { loadPyodide } = await import(pyPath ? pathToFileURL(join(pyPath, 'pyodide.mjs')).href : 'pyodide')
  const py = await loadPyodide()
  py.FS.writeFile('/home/pyodide/opencalc.py', OPENCALC_LIB_SOURCE)
  await py.loadPackage(PACKAGES, { messageCallback: () => {} })
  await py.runPythonAsync("import matplotlib\nmatplotlib.use('Agg')\nimport warnings\nwarnings.filterwarnings('ignore', category=DeprecationWarning)")
  const version = py.runPython("import sys, numpy, pandas; f'Python {sys.version.split()[0]}, numpy {numpy.__version__}, pandas {pandas.__version__}'")
  console.log(`Pyodide ${py.version} (${version})\n`)

  let stdout = ''
  py.setStdout({ batched: (m) => { stdout += m + '\n' } })
  py.setStderr({ batched: (m) => { stdout += m + '\n' } })

  // Runs code in namespace; returns { ok, error, output }.
  async function run(code, ns) {
    stdout = ''
    try {
      const result = await py.runPythonAsync(code, { globals: ns })
      let repr = ''
      if (result !== undefined && result !== null) {
        repr = typeof result === 'object' && result.toString ? result.toString() : String(result)
        result.destroy?.()
      }
      return { ok: true, output: stdout + repr, value: repr }
    } catch (e) {
      const lines = String(e.message).trim().split('\n')
      return { ok: false, error: lines[lines.length - 1], output: stdout }
    }
  }
  const fresh = () => py.globals.get('dict')()
  const passed = (r) => r.ok && /SUCCESS|^true$/i.test(r.value)

  const files = lessonFiles()
  const ids = new Map()
  const lessons = []
  for (const file of files) {
    const label = relative(root, file)
    try {
      const lesson = (await import(pathToFileURL(file).href)).default
      lessons.push({ file, label, lesson })
      if (lesson.id) {
        if (ids.has(lesson.id)) fail(label, `duplicate lesson id ${lesson.id} (also ${ids.get(lesson.id)})`)
        ids.set(lesson.id, label)
      }
    } catch (e) {
      fail(label, `failed to import: ${e.message}`)
    }
  }

  let cellCount = 0, challengeCount = 0
  for (const { label, lesson } of lessons) {
    if (only && !label.includes(only)) continue
    const failuresBefore = failures.length

    for (const key of ['prereqs', 'unlocks']) {
      for (const id of lesson[key] ?? []) if (!ids.has(id)) fail(label, `${key} references unknown lesson id "${id}"`)
    }
    for (const q of lesson.quiz ?? []) {
      if (q.options && !(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length)) fail(label, `quiz ${q.id}: correct index ${q.correct} out of range`)
    }
    for (const c of inlineChecks(lesson)) {
      if (!c.options.includes(c.answer)) fail(label, `inline check "${String(c.question).slice(0, 60)}": answer is not one of the options`)
    }
    for (const s of renderedStrings(lesson)) {
      if (bareDollar(s)) warn(label, `bare $ in rendered prose (renders as LaTeX): "${s.slice(0, 80)}"`)
    }

    for (const nb of notebooks(lesson)) {
      const seen = new Set()
      const ns = fresh()
      for (const cell of nb.cells) {
        const where = `${label} — ${nb.title ?? 'notebook'} — cell ${cell.id} "${cell.cellTitle ?? cell.challengeTitle ?? ''}"`
        if (seen.has(cell.id)) fail(where, 'duplicate cell id within notebook')
        seen.add(cell.id)
        if (typeof cell.code !== 'string') continue
        cellCount++

        if (!cell.challengeType) {
          const r = await run(cell.code, ns)
          if (show) console.log(`---- ${where}\n${r.output}${r.error ? `!! ${r.error}\n` : ''}`)
          if (cell.expectError) {
            if (r.ok) fail(where, `expected ${cell.expectError}, but the cell ran without error`)
            else if (!r.error.includes(cell.expectError)) fail(where, `expected ${cell.expectError}, got: ${r.error}`)
          } else if (!r.ok) {
            fail(where, `unexpected error: ${r.error}`)
          }
          for (const want of cell.expectOutput ?? []) {
            if (!r.output.includes(want)) fail(where, `expected output to contain ${JSON.stringify(want)}; got:\n      ${r.output.trim().split('\n').join('\n      ')}`)
          }
          continue
        }

        challengeCount++
        if (!cell.testCode) { fail(where, 'challenge has no testCode'); continue }
        // Unfinished starter must not pass.
        {
          const cns = fresh()
          const r = await run(cell.code, cns)
          const t = r.ok ? await run(cell.testCode, cns) : r
          if (passed(t)) fail(where, 'starter code already passes the test')
          cns.destroy()
        }
        if (!cell.solution) { warn(where, 'challenge has no reference solution'); continue }
        {
          const cns = fresh()
          const r = await run(cell.solution, cns)
          const t = r.ok ? await run(cell.testCode, cns) : r
          if (!passed(t)) fail(where, `reference solution does not pass: ${t.error ?? t.value}`)
          if (show) console.log(`---- ${where} [solution]\n${r.output}${t.value}\n`)
          cns.destroy()
        }
        for (const m of cell.misconceptions ?? []) {
          const cns = fresh()
          const r = await run(m.code, cns)
          const t = r.ok ? await run(cell.testCode, cns) : r
          if (passed(t)) fail(where, `misconception passes the test: ${m.code.slice(0, 60)}`)
          else if (!String(t.error ?? t.value).includes(m.feedback)) fail(where, `misconception feedback mismatch: wanted "${m.feedback}", got "${t.error ?? t.value}"`)
          cns.destroy()
        }
      }
      ns.destroy()
    }
    console.log(`${failures.length === failuresBefore ? '✓' : '✗'} ${label}`)
  }

  // ML-lab prerequisite links into this course must resolve to a lesson file.
  const linksFile = resolve(root, 'src/labs/ml-lab/kit/mathLinks.js')
  if (existsSync(linksFile)) {
    const { MATH_LINKS } = await import(pathToFileURL(linksFile).href)
    for (const [key, link] of Object.entries(MATH_LINKS)) {
      if (link.course !== courseId) continue
      const ok = lessons.some(({ file }) => {
        const [ch, f] = relative(courseDir, file).split(/[\\/]/)
        return parseInt(ch, 10) === link.chapter && f.replace(/^\d+-/, '').replace(/\.js$/, '') === link.slug
      })
      if (!ok) fail('src/labs/ml-lab/kit/mathLinks.js', `${key} → ${link.href} does not match a lesson file`)
    }
  }

  console.log(`\n${lessons.length} lessons, ${cellCount} cells (${challengeCount} challenges) checked.`)
  if (warnings.length) console.log(`\n${warnings.length} warning(s):\n` + warnings.map((w) => '! ' + w).join('\n'))
  if (failures.length) console.log(`\n${failures.length} failure(s):\n` + failures.map((f) => '✗ ' + f).join('\n'))
  process.exit(failures.length ? 1 : 0)
}

main()
