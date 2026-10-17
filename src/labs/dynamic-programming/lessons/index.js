import prerequisites from './prerequisites.js'
import stateDesign from './state-design.js'
import implementation from './implementation.js'
import { CHALLENGES } from './challenges.js'
import { PARSED_LESSONS } from './parsed.js'

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
      challenge: CHALLENGES[lesson.id] || null,
    },
  ])
)
