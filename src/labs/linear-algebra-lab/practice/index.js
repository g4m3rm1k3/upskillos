import { foundationsPractice } from './foundations.js'
import { corePractice } from './core.js'
import { applicationsPractice } from './applications.js'
import { theoryPractice } from './theory.js'
import { stage1Practice } from './stage1.js'
import { stage2Practice } from './stage2.js'
import { calculusPractice } from './calculus.js'
import { eigenPractice } from './eigen.js'
import { svdPractice } from './svd.js'
import { bestFitPractice } from './bestfit.js'
import { graphicsPractice } from './graphics.js'
import { engineeringPractice } from './engineering.js'
import { circuitsPractice } from './circuits.js'
import { physicsPractice } from './physics.js'
import { seededRandom } from './helpers.js'

// Sets for the same lesson are concatenated, so later files can add families to an existing lesson.
function mergeSets(...sets) {
  const merged = {}
  for (const set of sets) for (const [id, families] of Object.entries(set)) merged[id] = [...(merged[id] ?? []), ...families]
  return merged
}
export const PROBLEM_SETS = mergeSets(foundationsPractice, corePractice, applicationsPractice, theoryPractice, stage1Practice, stage2Practice, calculusPractice, eigenPractice, svdPractice, bestFitPractice, graphicsPractice, engineeringPractice, circuitsPractice, physicsPractice)
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
