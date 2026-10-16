// Every lesson's content checked against the code it teaches: predicted numbers and derivation
// steps against the engine, code notes against the real Python lines, figures against what
// exists. The "write it yourself" checks are run in real Python against the lab's own answer
// (it must pass) and against the starter code (it must not: an exercise that passes before you
// write anything teaches nothing).
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { LESSONS, lessonById } from './index.js'
import { KINDS } from '../Blocks.jsx'
import { programBefore } from '../WriteIt.jsx'
import { SOURCES, parse, unmatchedNotes, functionSource } from '../source.js'
import { FIGURES } from '../figures/index.js'
import { checkScript, readResults, forbiddenIn } from '../checks.js'
import { PROGRAMS } from '../programs.js'
import { evaluateFormula, plain } from '../engine/sheet.js'

// A Python with pandas, which the lab's programs use (the browser loads it into Pyodide).
const PYTHON = ['python3', 'python'].find(cmd => { try { return spawnSync(cmd, ['-c', 'import pandas']).status === 0 } catch { return false } })

// What the browser runs: the code before yours, your code, then the checks.
function runChecks(spec, code) {
  const program = `${programBefore(spec)}\n\n${code}\n\n${checkScript(spec)}`
  const r = spawnSync(PYTHON, ['-'], { input: program, encoding: 'utf8', timeout: 30000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
  return { ok: r.status === 0, results: readResults(r.stdout ?? ''), stderr: r.stderr }
}

describe('lessons', () => {
  it('have unique ids', () => {
    const ids = LESSONS.map(l => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('quote every function of the Python they teach', () => {
    // A write block counts too: its "Show me" reveals the lab's version of the function.
    const quoted = new Set(LESSONS.flatMap(l => l.blocks.flatMap(b => (b.code?.fn ? [`${b.code.file}:${b.code.fn}`] : b.write ? [`${b.write.file}:${b.write.fn}`] : []))))
    // The generator's helpers (the random-number generator, dates, picking an item, writing the
    // whole file) are setup, described in lesson 1.1's notes on make_orders.
    const shownElsewhere = ['data.py:__init__', 'data.py:random', 'data.py:below', 'data.py:date_of', 'data.py:pick', 'data.py:to_csv',
      // Writing a number to one decimal for the days' CSV: formatting, like pounds.
      'data.py:tenths',
      // The two errors of a centre are what lesson 2.1–2.2's figure plots; their formulas are derived in the lessons.
      'summary.py:squared_error', 'summary.py:absolute_error']
    const all = Object.keys(SOURCES).flatMap(file => parse(file).functions.map(f => `${file}:${f.name}`))
    expect(all.filter(fn => !quoted.has(fn) && !shownElsewhere.includes(fn))).toEqual([])
  })

  for (const lesson of LESSONS) {
    describe(`${lesson.number} ${lesson.title}`, () => {
      it('links only to earlier lessons that exist', () => {
        for (const id of lesson.builds) {
          expect(lessonById(id), id).toBeTruthy()
          expect(LESSONS.indexOf(lessonById(id))).toBeLessThan(LESSONS.findIndex(l => l.id === lesson.id))
        }
      })
      it('uses only known block kinds and figures', () => {
        for (const b of lesson.blocks) {
          expect(KINDS.filter(k => k in b).length, JSON.stringify(b).slice(0, 80)).toBe(1)
          if (b.figure) expect(FIGURES[b.figure], b.figure).toBeTruthy()
          if (b.python) expect(PROGRAMS[b.python.program], b.python.program).toBeTruthy()
        }
      })
      it('quotes real code, and every note finds its line', () => {
        for (const b of lesson.blocks.filter(x => x.code)) {
          expect(SOURCES[b.code.file], b.code.file).toBeTruthy()
          expect(unmatchedNotes(b.code), `${b.code.file} ${b.code.fn}`).toEqual([])
        }
      })
      it('asks for numbers the engine really gives', () => {
        for (const b of lesson.blocks.filter(x => x.predict)) {
          expect(typeof b.predict.compute, b.predict.prompt).toBe('function')
          expect(Math.abs(b.predict.compute() - b.predict.answer), b.predict.prompt).toBeLessThanOrEqual(b.predict.tolerance ?? 1e-9)
          for (const m of b.predict.misconceptions ?? []) expect(m.answer, `${b.predict.prompt}: a misconception equal to the answer`).not.toBe(b.predict.answer)
        }
      })
      it('derives numbers the engine really gives', () => {
        for (const b of lesson.blocks.filter(x => x.derive)) for (const step of b.derive.steps) {
          if (step.number === undefined) { expect(step.answer && step.vars, step.prompt).toBeTruthy(); continue }
          expect(typeof step.compute, step.prompt).toBe('function')
          expect(Math.abs(step.compute() - step.number), step.prompt).toBeLessThanOrEqual(step.tolerance ?? 0)
        }
      })
      it('has a right answer for every choice', () => {
        for (const b of lesson.blocks.filter(x => x.choice)) {
          expect(b.choice.options[b.choice.answer], b.choice.prompt).toBeTruthy()
          if (b.choice.verify) expect(b.choice.verify(), `${b.choice.prompt}: the claim behind the answer`).toBe(true)
        }
      })
      it('has spreadsheet formulas the Spreadsheet Lab’s engine works out, using the functions they ask for', () => {
        for (const b of lesson.blocks.filter(x => x.formula)) {
          const r = evaluateFormula(b.formula.table, b.formula.solution)
          expect(r.error, b.formula.solution).toBeUndefined()
          expect(plain(r.value)?.error, b.formula.solution).toBeUndefined()
          for (const fn of b.formula.must ?? []) expect(b.formula.solution.toUpperCase(), fn).toContain(fn.toUpperCase() + '(')
        }
      })
      for (const b of lesson.blocks.filter(x => x.write)) {
        const spec = b.write
        it(`write ${spec.fn}: the lab's own answer passes and does not use what it forbids`, () => {
          expect(SOURCES[spec.file], spec.file).toBeTruthy()
          const answer = functionSource(spec.file, spec.fn)
          expect(forbiddenIn(answer, spec.forbid)).toEqual([])
          expect(spec.cases.length).toBeGreaterThan(1)
          if (!PYTHON) return
          const run = runChecks(spec, answer)
          expect(run.results.filter(r => !r.pass), run.stderr).toEqual([])
          expect(run.results.length).toBe(spec.cases.length)
          expect(run.ok, run.stderr).toBe(true)
        })
        it.skipIf(!PYTHON)(`write ${spec.fn}: the starter code does not pass yet`, () => {
          const run = runChecks(spec, spec.starter)
          expect(run.ok).toBe(false)
          expect(run.results.some(r => !r.pass), run.stderr).toBe(true)
        })
      }
    })
  }
})
