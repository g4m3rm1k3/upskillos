// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useOptionalLesson } from './useOptionalLesson.js'

// LessonPage builds the progress key from the route's course and this hook's lesson. If the hook
// returns the previous lesson for even one render after navigating, progress is saved under the
// new course with the old lesson's id (seen as "sql::geo-3-5").
describe('useOptionalLesson', () => {
  const geometry = { id: 'geo-3-5', title: 'Midpoint' }
  const sql = { id: 'sql-0-001', title: 'What Is a Database?' }

  it('never returns the previous lesson after the lesson changes', () => {
    const seen = []
    const { rerender } = renderHook(({ k, l }) => {
      const r = useOptionalLesson(k, l)
      seen.push({ key: k, id: r.lessonOverride?.id ?? null })
      return r
    }, { initialProps: { k: 'geometry-3/midpoint-section', l: geometry } })

    rerender({ k: 'sql-1/what-is-a-database', l: sql })
    const afterSwitch = seen.filter(s => s.key === 'sql-1/what-is-a-database')
    expect(afterSwitch.length).toBeGreaterThan(0)
    expect(afterSwitch.every(s => s.id === 'sql-0-001')).toBe(true)
  })

  it('returns nothing while the new route has no lesson yet, rather than the old one', () => {
    const { result, rerender } = renderHook(({ k, l }) => useOptionalLesson(k, l), {
      initialProps: { k: 'geometry-3/midpoint-section', l: geometry },
    })
    rerender({ k: 'sql-1/what-is-a-database', l: null })
    expect(result.current.lessonOverride).toBeNull()
  })
})
