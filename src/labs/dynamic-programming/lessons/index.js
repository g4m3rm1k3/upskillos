import prerequisites from './prerequisites.js'
import stateDesign from './state-design.js'
import implementation from './implementation.js'
import { CHALLENGES } from './challenges.js'
import { CORE_CHALLENGES } from './core-challenges.js'
import { ADVANCED_CHALLENGES } from './advanced-challenges.js'
import { EXPERT_CHALLENGES } from './expert-challenges.js'
import { PARSED_LESSONS } from './parsed.js'

// Every coding challenge: the Foundations' (challenges.js), the Core patterns' (core-challenges.js) and
// the Advanced and Expert lessons' (advanced-challenges.js, expert-challenges.js).
export const ALL_CHALLENGES = { ...CHALLENGES, ...CORE_CHALLENGES, ...ADVANCED_CHALLENGES, ...EXPERT_CHALLENGES }

const handcrafted = [...prerequisites, ...stateDesign, ...implementation]
const handcraftedIds = new Set(handcrafted.map(l => l.id))

const merged = [
  ...handcrafted.map(lesson => ({
    ...lesson,
    quiz: lesson.quiz || PARSED_LESSONS[lesson.id]?.quiz || null,
  })),
  ...Object.values(PARSED_LESSONS).filter(lesson => !handcraftedIds.has(lesson.id)),
]

export const LESSONS = Object.fromEntries(
  merged.map(lesson => [
    lesson.id,
    {
      ...lesson,
      revision: 1,
      challenge: ALL_CHALLENGES[lesson.id] || null,
    },
  ])
)
