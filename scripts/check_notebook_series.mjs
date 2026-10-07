#!/usr/bin/env node
// Checks Notebook Lab series lessons (src/tools/notebook-lab/series/) by
// parsing them with the app's own parser and running them in Pyodide, the
// same Python the browser uses.
//
// For every written lesson:
//   - it parses (lessonFormat.js), and its title matches the manifest;
//   - it has enough prose to teach (not a summary) and at least two challenges
//     (a type-along lesson, made of "python type" cells, needs none);
//   - every type-along cell's code runs and prints exactly its "output" block;
//   - every demo cell runs, in order, in a fresh namespace, and shows something
//     (prints, returns a value or draws a figure);
//   - every challenge: the starter FAILS the test (so the test tests something)
//     and the reference solution PASSES it. Each runs on a copy of the
//     namespace the demo cells built, exactly like the notebook, and tests see
//     `_stdout` and `_source` as they do in the app;
//   - Python from Zero only: code uses no Python feature before the lesson
//     that teaches it.
//
// Usage:
//   node scripts/check_notebook_series.mjs                 # every written lesson
//   node scripts/check_notebook_series.mjs python          # one series
//   node scripts/check_notebook_series.mjs py-running-code # one lesson id
//   node scripts/check_notebook_series.mjs <file.md>...    # these lesson files (used by PR checks)

import { existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createNotebookRunner } from './lib/notebookPyodide.mjs'
import { SERIES_MANIFEST } from '../src/tools/notebook-lab/series/manifest.js'
import { parseLesson } from '../src/tools/notebook-lab/lessonFormat.js'
import { compareOutput } from '../src/components/notebooks/compareOutput.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const seriesDir = resolve(root, 'src/tools/notebook-lab/series')

const MIN_PROSE_WORDS = 700
const MIN_CHALLENGES = 2

// Python from Zero: the lesson number that first teaches each feature.
const PYTHON_FEATURE_LESSONS = `
FEATURES = {
    'Assign': (2, 'assignment (=)'), 'AugAssign': (2, 'augmented assignment (+=)'),
    'JoinedStr': (3, 'f-strings'), 'Subscript': (3, 'indexing [ ]'), 'Attribute': (3, 'methods / attributes (x.y)'),
    'If': (4, 'if statements'), 'IfExp': (4, 'conditional expressions'), 'Compare': (4, 'comparisons'),
    'BoolOp': (4, 'and / or'), 'Not': (4, 'not'),
    'List': (5, 'lists'), 'For': (6, 'for loops'),
    'While': (7, 'while loops'), 'Break': (7, 'break'), 'Continue': (7, 'continue'),
    'FunctionDef': (8, 'def'), 'Return': (8, 'return'),
    'Global': (9, 'global'), 'Nonlocal': (9, 'nonlocal'), 'Tuple': (9, 'tuples'), 'Default': (9, 'default arguments'),
    'Dict': (10, 'dictionaries'), 'Set': (11, 'sets'),
    'ListComp': (13, 'comprehensions'), 'SetComp': (13, 'comprehensions'), 'DictComp': (13, 'comprehensions'),
    'GeneratorExp': (13, 'generator expressions'),
    'Try': (14, 'try / except'), 'Raise': (14, 'raise'), 'Assert': (15, 'assert'),
    'Import': (16, 'import'), 'ImportFrom': (16, 'import'), 'With': (17, 'with'),
    'ClassDef': (18, 'classes'), 'Yield': (21, 'yield'), 'YieldFrom': (21, 'yield'), 'Lambda': (22, 'lambda'),
    'Decorator': (23, 'decorators'), 'Annotation': (23, 'type hints'), 'AnnAssign': (23, 'type hints'),
}

def _features_used(src):
    import ast
    found = {}
    def note(key, node):
        if key in FEATURES and key not in found:
            found[key] = getattr(node, 'lineno', 0)
    for node in ast.walk(ast.parse(src)):
        name = type(node).__name__
        note(name, node)
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
            note('Not', node)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if node.decorator_list: note('Decorator', node)
            if node.returns is not None: note('Annotation', node)
            if node.args.defaults or node.args.kw_defaults and any(node.args.kw_defaults): note('Default', node)
        if isinstance(node, ast.arg) and node.annotation is not None:
            note('Annotation', node)
    return [(FEATURES[k][0], FEATURES[k][1], line) for k, line in found.items()]
`

function words(items) {
  return items.join(' ').replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length
}

function lastLine(err) {
  const lines = String(err?.message ?? err).trim().split('\n')
  return lines[lines.length - 1]
}

// Each argument is a series id, a lesson id or a lesson file path; a lesson matching any is checked.
const filters = process.argv.slice(2)
const filter = filters.join(' ')
const wanted = (series, lesson, file) =>
  !filters.length || filters.some(f => f === series.id || f === lesson.id || resolve(root, f) === file)
const lessons = []
for (const series of SERIES_MANIFEST) {
  for (const lesson of series.lessons) {
    const file = resolve(seriesDir, series.dir, `${lesson.slug}.md`)
    if (!existsSync(file)) continue
    if (!wanted(series, lesson, file)) continue
    lessons.push({ series, lesson, file })
  }
}
if (!lessons.length) {
  console.log(filter ? `No written lessons match "${filter}".` : 'No lessons written yet.')
  process.exit(0)
}

const { py, run, figuresOpen } = await createNotebookRunner()
await py.runPythonAsync(PYTHON_FEATURE_LESSONS)
const featuresUsed = py.globals.get('_features_used')

// OpenMAT cells run in the app's OpenMAT engine. The app imports its
// TypeScript source through a Vite alias; here it is bundled once with esbuild
// (which Vite already depends on) and imported, the first time a lesson needs it.
let openMat = null
async function runOpenMat(code) {
  if (!openMat) {
    const { build } = await import('esbuild')
    const out = resolve(root, 'node_modules/.cache/openmat-check/engine.mjs')
    await build({ entryPoints: [resolve(root, 'packages/openmat/src/index.ts')], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error' })
    openMat = await import(pathToFileURL(out).href)
  }
  return openMat.runOpenMatScript(code)
}

async function runTest(cell, code, ns) {
  let stdout = ''
  try {
    ;({ stdout } = await run(code, ns))
  } catch (err) {
    return { passed: false, why: `code raised ${lastLine(err)}` }
  }
  ns.set('_stdout', stdout)
  ns.set('_source', code)
  try {
    const result = await py.runPythonAsync(cell.testCode, { globals: ns })
    const passed = result === true || (typeof result === 'string' && result.includes('SUCCESS'))
    return { passed, why: passed ? '' : `test returned ${JSON.stringify(result)}` }
  } catch (err) {
    return { passed: false, why: lastLine(err) }
  }
}

let failures = 0
for (const { series, lesson, file } of lessons) {
  const problems = []
  let parsed
  try {
    parsed = parseLesson(readFileSync(file, 'utf8'))
  } catch (err) {
    problems.push(`format: ${err.message}`)
  }

  if (parsed) {
    const { title, cells } = parsed
    if (title !== lesson.title) problems.push(`title "${title}" does not match manifest "${lesson.title}"`)

    const prose = cells.flatMap(c => c.prose ?? [])
    const n = words(prose)
    if (n < MIN_PROSE_WORDS) problems.push(`only ${n} words of prose (minimum ${MIN_PROSE_WORDS}): teach, don't summarise`)
    if (prose.some(p => p.includes('$$'))) problems.push('uses $$…$$ math, which does not render; use \\[…\\]')

    // A type-along lesson checks every cell against its expected output, so
    // its practice is the typing itself; it needs no separate challenges.
    const typeAlong = cells.some(c => c.typeIt)
    const challenges = cells.filter(c => c.challengeType)
    if (!typeAlong && challenges.length < MIN_CHALLENGES) problems.push(`${challenges.length} challenge(s) (minimum ${MIN_CHALLENGES})`)

    const ns = py.globals.get('dict')()
    for (const cell of cells) {
      if (cell.proseOnly) continue
      const where = cell.challengeType ? `challenge "${cell.challengeTitle}"` : `cell ${cell.id}`

      // Math series: every demo cell opens with a "The math" box, so the
      // mathematics can be read before (and without) the code.
      if (series.id === 'math' && !cell.challengeType) {
        const box = (cell.prose || []).find(p => typeof p === 'string' && p.startsWith('::: math'))
        if (!box) problems.push(`${where}: no "::: math" box before the code`)
        else {
          if (!/\$|\\\[/.test(box)) problems.push(`${where}: the math box has no LaTeX ($…$ or \\[…\\])`)
          if (!/^in code:/im.test(box)) problems.push(`${where}: the math box has no "In code:" line`)
        }
      }

      if (series.id === 'python') {
        const codes = cell.challengeType ? [['starter', cell.code], ['solution', cell.solution]] : [['code', cell.typeIt ? cell.solution : cell.code]]
        for (const [part, code] of codes) {
          try {
            const used = featuresUsed(code).toJs()
            for (const [taught, feature, line] of used) {
              if (taught > lesson.number) problems.push(`${where} ${part} line ${line}: uses ${feature}, taught in lesson ${taught}`)
            }
          } catch (err) {
            // Error demos and fix-the-bug starters are broken on purpose.
            if (!(cell.expectError || part === 'starter')) problems.push(`${where} ${part}: does not parse: ${lastLine(err)}`)
          }
        }
      }

      if (cell.lang === 'openmat') {
        if (!cell.prose?.length) problems.push(`${where}: no prose before the code; say what it shows`)
        try {
          const result = await runOpenMat(cell.code)
          if (!result.logs.join('').trim() && !result.figureJson) problems.push(`${where} (OpenMAT): runs but shows nothing`)
        } catch (err) {
          problems.push(`${where} (OpenMAT): ${lastLine(err)}`)
        }
        continue
      }

      if (cell.typeIt) {
        // Type-along: run the code the learner will type, and check that the
        // expected output shown to them is what it really prints.
        if (!cell.prose?.length) problems.push(`${where}: no prose before the code; say what it shows`)
        try {
          const { stdout, shown, output } = await run(cell.solution, ns)
          const figures = await figuresOpen(ns)
          if (!stdout.trim() && !shown && !figures) problems.push(`${where}: runs but shows nothing`)
          // No expected output is allowed: make_type_along.mjs leaves it out
          // when the output changes from run to run.
          if (cell.expectedOutput != null) {
            const diff = compareOutput(output, cell.expectedOutput)
            if (!diff.matches) problems.push(`${where}: expected output differs at line ${diff.line}: printed ${JSON.stringify(diff.yours)}, expected ${JSON.stringify(diff.expected)}`)
          }
        } catch (err) {
          problems.push(`${where}: ${lastLine(err)}`)
        }
        continue
      }

      if (!cell.challengeType) {
        if (!cell.prose?.length) problems.push(`${where}: no prose before the code; say what it shows`)
        try {
          const { stdout, shown } = await run(cell.code, ns)
          const figures = await figuresOpen(ns)
          if (cell.expectError) problems.push(`${where}: should raise ${cell.expectError} but raised nothing`)
          else if (!stdout.trim() && !shown && !figures) problems.push(`${where}: runs but shows nothing`)
          const warning = stdout.match(/\w*Warning: .*/)
          if (warning) problems.push(`${where}: prints a warning, which clutters the lesson: ${warning[0].slice(0, 120)}`)
        } catch (err) {
          if (!cell.expectError) problems.push(`${where}: ${lastLine(err)}`)
          else if (!lastLine(err).startsWith(cell.expectError)) problems.push(`${where}: should raise ${cell.expectError} but raised ${lastLine(err)}`)
        }
        continue
      }

      const starter = await runTest(cell, cell.code, ns.copy())
      if (starter.passed) problems.push(`${where}: the starter already passes the test`)
      await figuresOpen(ns)
      const solution = await runTest(cell, cell.solution, ns.copy())
      if (!solution.passed) problems.push(`${where}: reference solution fails: ${solution.why}`)
      await figuresOpen(ns)
    }
    ns.destroy()
  }

  const label = `${lesson.id} (${series.title} ${lesson.number})`
  if (problems.length) {
    failures++
    console.log(`FAIL ${label}`)
    for (const p of problems) console.log(`  - ${p}`)
  } else {
    console.log(`ok   ${label}`)
  }
}

console.log(`\n${lessons.length - failures}/${lessons.length} lessons passed`)
process.exit(failures ? 1 : 0)
