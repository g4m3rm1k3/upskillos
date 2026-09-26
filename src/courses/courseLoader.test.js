import { describe, it, expect } from 'vitest'
import { getAllChapters, getLessonIdLookup, loadLesson } from './courseLoader.js'
import LESSON_IDS from '../data/lessonIds.json'
import LESSON_ID_REPAIRS from '../data/lessonIdRepairs.json'

// The course tree's lesson ids come from src/data/lessonIds.json (scripts/build-lesson-ids.mjs).
// Course cards count completed lessons with these ids, so a wrong or missing id shows the wrong
// progress even when the lesson page saves it correctly.
describe('lesson ids in the course tree', () => {
  const lessons = getAllChapters().flatMap(ch => ch.lessons.map(l => ({ ...l, chapter: ch.number })))

  it('gives every lesson an id', () => {
    const missing = lessons.filter(l => !l.id).map(l => `${l.chapter}/${l.slug}`)
    expect(missing).toEqual([])
  })

  it('keeps lessons that share a slug in different chapters apart', () => {
    // geometry-2 and geometry-5 both have a "similarity" lesson, with different ids.
    expect(LESSON_IDS['geometry-2/similarity']).toBeTruthy()
    expect(LESSON_IDS['geometry-5/similarity']).toBeTruthy()
    expect(LESSON_IDS['geometry-2/similarity']).not.toBe(LESSON_IDS['geometry-5/similarity'])
  })

  it('matches the id on the lesson object the lesson page loads', async () => {
    const wrong = []
    for (const l of lessons) {
      const lesson = await loadLesson(l.chapter, l.slug)
      if (lesson?.id !== l.id) wrong.push(`${l.chapter}/${l.slug}: map ${l.id}, lesson ${lesson?.id}`)
    }
    expect(wrong).toEqual([])
  }, 180_000)

  it('never takes a nested id (a notebook, quiz or code sample) for the lesson id', () => {
    const nested = lessons.filter(l => ['ScienceNotebook', 'PythonNotebook'].includes(l.id) || /[\s,;()+]/.test(l.id ?? ''))
    expect(nested.map(l => `${l.chapter}/${l.slug}: ${l.id}`)).toEqual([])
  })
})

describe('getLessonIdLookup (old "<course>/<slug>" progress keys)', () => {
  const lookup = getLessonIdLookup()

  it('maps an unambiguous old key to the lesson id', () => {
    expect(lookup['geometry/midpoint-section']).toBe(LESSON_IDS['geometry-3/midpoint-section'])
  })

  it('leaves out an old key that two chapters share, instead of guessing', () => {
    expect(lookup).not.toHaveProperty('geometry/similarity')
    expect(lookup).not.toHaveProperty('sql/what-is-a-database')
  })
})

describe('one-time repairs for ids produced by the old generator', () => {
  it('points every repair at a current lesson in the same course', () => {
    const missing = []
    for (const [oldKey, newKey] of Object.entries(LESSON_ID_REPAIRS)) {
      const separator = newKey.indexOf('::')
      const course = newKey.slice(0, separator)
      const id = newKey.slice(separator + 2)
      const exists = Object.entries(LESSON_IDS).some(([route, lessonId]) => (
        route.startsWith(`${course}-`) && lessonId === id
      ))
      if (!exists) missing.push(`${oldKey} -> ${newKey}`)
    }
    expect(missing).toEqual([])
  })
})
