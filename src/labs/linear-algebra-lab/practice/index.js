import { foundationsPractice } from './foundations.js'
import { corePractice } from './core.js'
import { applicationsPractice } from './applications.js'
import { theoryPractice } from './theory.js'
import { seededRandom } from './helpers.js'

export const PROBLEM_SETS = { ...foundationsPractice, ...corePractice, ...applicationsPractice, ...theoryPractice }
export const PROBLEM_VERSION = 1
export const problemsFor = lesson => PROBLEM_SETS[typeof lesson === 'string' ? lesson : lesson.id] || []
export const familyKey = (lessonId, problemId) => `${lessonId}/${problemId}`
export const attemptKey = (lessonId, problemId, seed) => `${familyKey(lessonId, problemId)}@${seed}`

export function freshSeed() {
  if (globalThis.crypto?.getRandomValues) return String(globalThis.crypto.getRandomValues(new Uint32Array(1))[0])
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function instantiate(lessonId, problemId, seed) {
  const descriptor = problemsFor(lessonId).find(problem => problem.id === problemId)
  if (!descriptor) throw new Error(`Unknown practice problem ${lessonId}/${problemId}`)
  const generate = suffix => descriptor.generate(seededRandom(`${PROBLEM_VERSION}/${lessonId}/${problemId}/${seed}/${suffix}`))
  const exercise = generate('visible')
  return {
    ...exercise, id: descriptor.id, title: descriptor.title, difficulty: descriptor.difficulty,
    seed: String(seed), version: PROBLEM_VERSION,
    cases: [generate('transfer-1'), generate('transfer-2')].map(trial => ({
      setup: trial.setup, reference: trial.solution, outputs: trial.outputs,
    })),
  }
}

export function practiceStatus(lesson, store) {
  const problems = problemsFor(lesson)
  const passed = problems.filter(problem => store.problemPasses?.[lesson.id]?.[problem.id]?.version === PROBLEM_VERSION)
  return {
    total: problems.length, passed: passed.length,
    complete: problems.length > 0 && passed.length === problems.length,
    independent: problems.length > 0 && passed.length === problems.length && passed.every(problem => !store.problemPasses[lesson.id][problem.id].assisted),
  }
}
