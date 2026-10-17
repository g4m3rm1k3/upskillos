import { describe, expect, it } from 'vitest'
import { executeScript } from '../../engines/openmat/openmatEngine.js'
import { LESSONS, MODULES } from './curriculum.js'
import { gradeWorkspace, matchesNumeric } from './grading.js'

describe('OpenMAT linear algebra curriculum', () => {
  it('has durable unique ids, complete teaching sequences and progressively harder modules', () => {
    expect(new Set(LESSONS.map(lesson => lesson.id)).size).toBe(LESSONS.length)
    for (const module of MODULES) expect(LESSONS.filter(lesson => lesson.module === module).length).toBeGreaterThanOrEqual(4)
    for (const lesson of LESSONS) {
      expect(lesson.id).toMatch(/^laml-/)
      expect(lesson.prose.length).toBeGreaterThanOrEqual(4)
      expect(lesson.procedure.length).toBeGreaterThanOrEqual(3)
      expect(lesson.demo.explain.length).toBeGreaterThanOrEqual(3)
      expect(lesson.challenge.hints.length).toBeGreaterThanOrEqual(3)
      expect(lesson.prediction.question.length).toBeGreaterThan(15)
      expect(lesson.prediction.answer.length).toBeGreaterThan(15)
      expect(lesson.challenge.transfer.length).toBeGreaterThan(30)
      expect(lesson.challenge.checks.length).toBeGreaterThan(0)
    }
    expect(LESSONS[0].level).toBe('Beginner')
    expect(LESSONS.at(-1).level).toBe('Mastery')
  })

  for (const lesson of LESSONS) {
    it(`${lesson.id}: real engine demo plots, reference passes, starter fails`, () => {
      const demo = executeScript(lesson.demo.code)
      expect(demo.figureJson).toBeTruthy()
      const figure = JSON.parse(demo.figureJson)
      const panels = figure.type === 'opencalc_subplots' ? figure.panels.filter(Boolean) : [figure]
      expect(panels.length).toBeGreaterThan(0)
      for (const panel of panels) {
        expect(panel.title).toBeTruthy()
        // Figure format puts labels under axes; plotting itself must contain actual data.
        expect(JSON.stringify(panel)).not.toMatch(/NaN|Infinity/)
      }
      expect(demo.output).not.toBe('No output.')
      const solve = code => executeScript(`${lesson.challenge.setup}\n${code}`)
      const correct = gradeWorkspace(solve(lesson.challenge.solution).workspace, lesson.challenge.checks)
      expect(correct.filter(check => !check.pass)).toEqual([])
      expect(gradeWorkspace(solve(lesson.challenge.starter).workspace, lesson.challenge.checks).every(check => check.pass)).toBe(false)
      for (const variant of lesson.challenge.cases ?? []) {
        const trial = executeScript(`${variant.setup}\n${lesson.challenge.solution}`)
        expect(gradeWorkspace(trial.workspace, variant.checks).filter(check => !check.pass)).toEqual([])
      }
    })
  }
})

describe('numeric evidence', () => {
  it('rejects wrong shapes, missing values and nonfinite results', () => {
    expect(matchesNumeric([1, 2], [[1], [2]])).toBe(false)
    expect(matchesNumeric(['1', 2], [1, 2])).toBe(false)
    expect(matchesNumeric(NaN, 0)).toBe(false)
    expect(matchesNumeric(Infinity, 0)).toBe(false)
    expect(matchesNumeric([1 + 1e-8, 2], [1, 2])).toBe(true)
    expect(matchesNumeric([-1, -2], [1, 2], 1e-6, 'abs')).toBe(true)
    expect(gradeWorkspace([], [{ name: 'answer', expected: 0, message: 'Check the solve.' }])[0]).toMatchObject({ pass: false, message: 'Create a variable named answer. Check the solve.' })
  })
})
