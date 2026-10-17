// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { LESSONS } from './lessons/index.js'
import { CHALLENGES } from './lessons/challenges.js'
import { SOLUTIONS } from './lessons/reference-solutions.js'
import { runJavaScriptCases } from './runtime/checks.js'
import { readProgress, saveProgress } from './progress.js'

it('loads all 160 authored lessons with complete pedagogical structure', () => {
  const list = Object.values(LESSONS)
  expect(list.length).toBe(160)

  for (const lesson of list) {
    expect(lesson.id).toBeTruthy()
    expect(lesson.objective.length).toBeGreaterThan(10)
    expect(lesson.sections.length).toBeGreaterThanOrEqual(3)
    expect(lesson.procedure.length).toBeGreaterThanOrEqual(1)
    expect(lesson.example.steps.length).toBeGreaterThanOrEqual(1)
    expect(lesson.proof.length).toBeGreaterThan(5)
    expect(lesson.complexity.length).toBeGreaterThan(5)
  }
})

it('verifies all 29 JavaScript reference solutions pass their challenge suites', () => {
  const challengeIds = Object.keys(CHALLENGES)
  expect(challengeIds.length).toBe(29)

  for (const id of challengeIds) {
    const challenge = CHALLENGES[id]
    const solution = SOLUTIONS[id]?.JavaScript
    expect(solution, `Missing JS reference solution for ${id}`).toBeTruthy()

    const result = runJavaScriptCases(solution, challenge.cases)
    if (!result.passed) {
      console.error(`Challenge failure on ${id}:`, result.error, result.rows.filter(r => !r.passed))
    }
    expect(result.passed, `Challenge '${id}' failed on reference solution: ${result.error}`).toBe(true)
    expect(result.rows.length).toBe(challenge.cases.length)
  }
})

it('ensures every challenge has Python and JavaScript starter templates with solve', () => {
  for (const [id, challenge] of Object.entries(CHALLENGES)) {
    expect(challenge.starters.Python).toContain('def solve(')
    expect(challenge.starters.JavaScript).toContain('function solve(')
    expect(challenge.hints.length).toBeGreaterThanOrEqual(2)
    expect(challenge.cases.length).toBeGreaterThanOrEqual(3)
  }
})

it('reads and saves learner progress safely with memory fallback', () => {
  const testId = 'test-concept'
  const record = {
    revision: 1,
    Python: { code: 'def solve(): pass', passed: true, hints: 1 },
    JavaScript: { code: 'function solve() {}', passed: false, hints: 0 },
  }
  const saved = saveProgress(testId, record)
  expect(typeof saved).toBe('boolean')

  const retrieved = readProgress(testId, 1)
  expect(retrieved.Python.passed).toBe(true)
  expect(retrieved.Python.hints).toBe(1)
  expect(retrieved.JavaScript.passed).toBe(false)
})
