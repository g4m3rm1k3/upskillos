// @vitest-environment node
// Every lesson has a coding exercise, and each one is fair: the reference solution passes its checks in
// real Python (the same Pyodide the browser uses) and the starter code does not.
import { beforeAll, describe, expect, it } from 'vitest'
import { LESSONS } from './lessons/index.js'
import { exercisesOf, runExercise, startPython } from '../python-steps/exerciseRunner.js'

const EXERCISES = exercisesOf(LESSONS)

describe('coding exercises', () => {
  beforeAll(startPython, 60000)
  it('every lesson has one', () => {
    const have = new Set(EXERCISES.map(([l]) => l.id))
    expect(LESSONS.filter(l => !have.has(l.id)).map(l => l.id)).toEqual([])
  })
  for (const [lesson, , spec] of EXERCISES) {
    describe(`${lesson.number} ${lesson.id}`, () => {
      it('is complete', () => {
        for (const key of ['prompt', 'starter', 'solution', 'checks']) expect(typeof spec[key], key).toBe('string')
        expect(spec.hints?.length, 'hints').toBeGreaterThan(0)
        for (const text of [spec.prompt, ...spec.hints]) expect(text, 'an escaped backtick would show as a literal').not.toContain('\\`')
      })
      it('the solution passes', async () => {
        const r = await runExercise(spec.solution, spec.checks, spec.packages)
        expect(r.passed, `${r.stage}: ${r.error}\n${r.output}`).toBe(true)
      })
      it('the starter does not', async () => {
        const r = await runExercise(spec.starter, spec.checks, spec.packages)
        expect(r.passed).toBe(false)
        expect(r.stage === 'checks' || /NotImplementedError|SyntaxError/.test(r.error), r.error).toBe(true)
      })
    })
  }
})
