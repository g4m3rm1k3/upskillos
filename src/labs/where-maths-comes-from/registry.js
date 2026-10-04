import { validateSequence } from './schema'
const modules = import.meta.glob('./lessons/*.js', { eager: true })
export const lessons = validateSequence(Object.values(modules).map(module => module.default)
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)))
// A course can reuse these standalone experiences in its own sequence.
export function sequenceByIds(ids) {
  return validateSequence(ids.map(id => {
    const lesson = lessons.find(item => item.id === id)
    if (!lesson) throw new Error(`Unknown intuition lesson: ${id}`)
    return lesson
  }))
}
