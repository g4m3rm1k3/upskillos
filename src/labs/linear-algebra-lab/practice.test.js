// Generated practice problems: every family must be solvable by its reference on every draw,
// reject its starter, and (unless listed below) reject an answer hard-coded from one draw.
import { describe, expect, it } from 'vitest'
import { executeScript } from '../../engines/openmat/openmatEngine.js'
import { cloneable, evaluateRun } from './execution.js'
import { LESSONS } from './curriculum.js'
import { instantiate, problemsFor, PROBLEM_SETS } from './practice/index.js'

const SEEDS = ['a', 'b', 'c', 'd', 'e', 'f']

// Lessons without a problem set: the opening tour (motivation only).
const WITHOUT_PROBLEMS = ['laml-why-linear-algebra']

// Families whose answers are (nearly) the same on every draw, so typing the number passes. Empty since
// Phase 6d: each family now has an output that depends on the drawn numbers. Keep it that way.
const GUESSABLE = new Set([])

const literal = v => Array.isArray(v) ? (Array.isArray(v[0]) ? `[${v.map(r => r.join(' ')).join('; ')}]` : `[${v.join('; ')}]`) : String(v)
const run = (ex, code) => evaluateRun({ source: `${ex.setup}\n${code}`, setup: ex.setup, code, reference: ex.solution, outputs: ex.outputs, cases: ex.cases })
const allPass = result => result.checks.length > 0 && result.checks.every(check => check.pass)

describe('practice coverage', () => {
  it('every lesson but the listed ones has at least six problem families, and every set names a real lesson', () => {
    const ids = new Set(LESSONS.map(lesson => lesson.id))
    expect(Object.keys(PROBLEM_SETS).filter(id => !ids.has(id))).toEqual([])
    expect(LESSONS.filter(lesson => problemsFor(lesson).length === 0).map(lesson => lesson.id)).toEqual(WITHOUT_PROBLEMS)
    for (const lesson of LESSONS) {
      const families = problemsFor(lesson)
      if (WITHOUT_PROBLEMS.includes(lesson.id)) continue
      expect(families.length).toBeGreaterThanOrEqual(6)
      expect(new Set(families.map(p => p.id)).size).toBe(families.length)
    }
  })
})

describe('every problem family', () => {
  for (const lesson of LESSONS) for (const family of problemsFor(lesson)) {
    const key = `${lesson.id}/${family.id}`
    it(key, () => {
      let guessed = false
      for (const seed of SEEDS) {
        const ex = instantiate(lesson.id, family.id, seed)
        expect(ex.hints.length).toBeGreaterThanOrEqual(3)
        for (const output of ex.outputs) expect(ex.prompt).toContain(output.name)
        const reference = run(ex, ex.solution)
        if (seed === SEEDS[0]) expect(() => structuredClone(cloneable(reference))).not.toThrow()
        expect(reference.checks.filter(check => !check.pass)).toEqual([])
        expect(reference.checks.length).toBe(ex.outputs.length * 3)
        expect(allPass(run(ex, ex.starter))).toBe(false)
        const workspace = executeScript(`${ex.setup}\n${ex.solution}`).workspace
        const hardCoded = ex.outputs.map(o => `${o.name} = ${literal(workspace.find(w => w.name === o.name).value)};`).join('\n')
        if (allPass(run(ex, hardCoded))) guessed = true
      }
      expect(guessed).toBe(GUESSABLE.has(key))
    }, 120000)
  }
})

describe('grading runs', () => {
  const exercise = { setup: 'a = 2;', solution: 'b = a*3;', outputs: [{ name: 'b', message: 'Triple a.' }], cases: [{ setup: 'a = 5;', reference: 'b = a*3;', outputs: [{ name: 'b', message: 'Triple a.' }] }] }
  it('grades against the reference on this draw and on unseen draws', () => {
    expect(allPass(run(exercise, 'b = a*3;'))).toBe(true)
    const hardCoded = run(exercise, 'b = 6;')
    expect(hardCoded.checks.map(c => c.pass)).toEqual([true, false])
    expect(hardCoded.checks[1].name).toBe('Unseen inputs 1: b')
  })
  it('reports code that crashes only on changed data, and compares sign-free outputs by size', () => {
    const fragile = run(exercise, 'b = a*3;\nif a > 4\n  b = missingName;\nend')
    expect(fragile.checks.at(-1)).toMatchObject({ name: 'Unseen inputs 1', pass: false })
    const signFree = run({ setup: 'a = 2;', solution: 'b = -a;', outputs: [{ name: 'b', kind: 'abs', message: 'Either sign.' }], cases: [] }, 'b = a;')
    expect(allPass(signFree)).toBe(true)
  })
  it('refuses a reference that produces no finite answer', () => {
    expect(() => run({ setup: '', solution: 'b = 1/0;', outputs: [{ name: 'b', message: '' }], cases: [] }, 'b = 1;')).toThrow(/invalid reference output/)
  })
})
