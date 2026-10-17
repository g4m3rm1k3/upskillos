// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { LESSONS, ALL_CHALLENGES as CHALLENGES } from './lessons/index.js'
import { CORE_CHALLENGES } from './lessons/core-challenges.js'
import { ORACLES } from './lessons/core-oracles.js'
import { SOLUTIONS } from './lessons/reference-solutions.js'
import { runJavaScriptCases } from './runtime/checks.js'
import { readProgress, saveProgress } from './progress.js'
import { CONCEPTS } from './curriculum.js'
import { parseLessonRows } from './lessons/parsed.js'
import expertRaw from './lessons/expert.js'
import specialistRaw from './lessons/specialist.js'

it('loads a lesson for every curriculum concept with complete pedagogical structure', () => {
  const list = Object.values(LESSONS)
  expect(Object.keys(LESSONS).sort()).toEqual(CONCEPTS.map(c => c.id).sort())

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

it('keeps specialist and expert lessons distinct, with explained traces and checkable practice', () => {
  const rows = [expertRaw, specialistRaw].flatMap(raw => raw.trim().split('\n'))
  for (const row of rows) expect(row.split('|'), row.split('|')[0]).toHaveLength(9)
  const lessons = [...parseLessonRows(expertRaw), ...parseLessonRows(specialistRaw)]
  expect(new Set(lessons.map(l => l.id)).size).toBe(lessons.length)
  for (const lesson of lessons) {
    expect(lesson.example.steps.length, lesson.id).toBeGreaterThanOrEqual(3)
    for (const [, state, explanation] of lesson.example.steps) {
      expect(state.length, lesson.id).toBeGreaterThan(5)
      expect(explanation.length, lesson.id).toBeGreaterThan(10)
      expect(explanation).not.toContain('Evaluate state transition')
    }
    expect(lesson.quiz.question.length, lesson.id).toBeGreaterThan(20)
    expect(lesson.quiz.answer.length, lesson.id).toBeGreaterThan(0)
    expect(lesson.quiz.hint.length, lesson.id).toBeGreaterThan(15)
  }
})

it('verifies all 69 JavaScript reference solutions pass their challenge suites', () => {
  const challengeIds = Object.keys(CHALLENGES)
  expect(challengeIds.length).toBe(69)

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

// The Python references, run in real Python (one process for all of them), compared exactly as the
// page's worker compares them: JSON with sorted keys and no spaces.
const PYTHON = ['python', 'python3'].find(cmd => { try { return spawnSync(cmd, ['-c', 'print(1)']).status === 0 } catch { return false } })
it.skipIf(!PYTHON)('verifies all 69 Python reference solutions pass their challenge suites, in real Python', () => {
  const jobs = Object.fromEntries(Object.entries(CHALLENGES).map(([id, c]) => [id, { code: SOLUTIONS[id]?.Python, cases: c.cases }]))
  for (const [id, job] of Object.entries(jobs)) expect(job.code, `Missing Python reference solution for ${id}`).toBeTruthy()
  const script = [
    'import json, sys',
    'jobs = json.load(sys.stdin)',
    'out = {}',
    'for name, job in jobs.items():',
    '    scope = {}',
    '    exec(job["code"], scope)',
    '    rows = []',
    '    for case in job["cases"]:',
    '        try:',
    '            got = json.dumps(scope["solve"](*case["args"]), sort_keys=True, separators=(",", ":"), allow_nan=False)',
    '            rows.append(got == json.dumps(case["expected"], sort_keys=True, separators=(",", ":")) or got)',
    '        except Exception as e:',
    '            rows.append(type(e).__name__ + ": " + str(e))',
    '    out[name] = rows',
    'print(json.dumps(out))',
  ].join(String.fromCharCode(10))
  const r = spawnSync(PYTHON, ['-c', script], { input: JSON.stringify(jobs), encoding: 'utf8', timeout: 120000, maxBuffer: 1 << 26 })
  expect(r.status, r.stderr).toBe(0)
  const results = JSON.parse(r.stdout)
  for (const [id, rows] of Object.entries(results)) expect(rows.filter(x => x !== true), `Python reference for ${id}`).toEqual([])
}, 120000)

it('checks every Core challenge’s expected values against an exhaustive answer key, not the DP', () => {
  expect(Object.keys(CORE_CHALLENGES).length).toBe(40)
  for (const [id, challenge] of Object.entries(CORE_CHALLENGES)) {
    const oracle = ORACLES[id]
    expect(oracle, `No oracle for ${id}`).toBeTruthy()
    let checked = 0
    for (const { args, expected } of challenge.cases) {
      const truth = oracle(structuredClone(args))
      if (truth === undefined) continue
      checked++
      expect(truth, `${id} ${JSON.stringify(args)}`).toEqual(expected)
    }
    expect(checked, `${id}: cases the oracle can check`).toBeGreaterThanOrEqual(3)
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
