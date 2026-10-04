export const PANEL_KEYS = ['explore', 'scene', 'connections', 'explanation']
/** Version 1 of the standalone intuition lesson contract. */
export function defineLesson(lesson) {
  if (!lesson || !/^[a-z][\w-]*$/.test(lesson.id || '')) throw new Error('Lesson needs a stable letter-led id')
  if (lesson.schemaVersion !== undefined && lesson.schemaVersion !== 1) throw new Error(`${lesson.id}: unsupported schema version`)
  for (const key of ['title', 'chapter', 'prompt']) {
    if (typeof lesson[key] !== 'string' || !lesson[key].trim()) throw new Error(`${lesson.id}: ${key} must be nonempty text`)
  }
  if (!Number.isFinite(lesson.order)) throw new Error(`${lesson.id}: order must be a finite number`)
  for (const key of PANEL_KEYS) {
    if (typeof lesson.panels?.[key] !== 'string') throw new Error(`${lesson.id}: missing ${key} panel markup`)
  }
  if (!lesson.panels.scene.trim()) throw new Error(`${lesson.id}: scene must contain an interactive model`)
  if (typeof lesson.mount !== 'function') throw new Error(`${lesson.id}: mount must be a function`)
  for (const key of ['start', 'notice', 'question', 'transfer']) {
    if (typeof lesson.discovery?.[key] !== 'string' || !lesson.discovery[key].trim()) throw new Error(`${lesson.id}: discovery.${key} must be nonempty text`)
  }
  if (lesson.discovery.views !== undefined && !Array.isArray(lesson.discovery.views)) throw new Error(`${lesson.id}: discovery.views must be an array`)
  for (const view of lesson.discovery.views || []) {
    if (!/^[a-z][\w-]*$/.test(view.target || '') || typeof view.label !== 'string' || !view.label.trim()) throw new Error(`${lesson.id}: invalid optional discovery view`)
  }
  if (lesson.assessment) {
    const { kind, collections } = lesson.assessment
    if (kind !== 'counting' || !Array.isArray(collections) || !collections.includes(0) || !collections.some(n => n > 0 && n < 5) || !collections.some(n => n >= 5) || collections.some(n => !Number.isInteger(n) || n < 0 || n > 8)) throw new Error(`${lesson.id}: counting assessment needs empty, small, and scattered collections (0–8 rocks)`)
  }
  return Object.freeze({ ...lesson, schemaVersion: 1, panels: Object.freeze({ ...lesson.panels }) })
}
export function validateSequence(lessons) {
  const ids = new Set()
  for (const lesson of lessons) {
    defineLesson(lesson)
    if (ids.has(lesson.id)) throw new Error(`Duplicate lesson id: ${lesson.id}`)
    ids.add(lesson.id)
  }
  return lessons
}
