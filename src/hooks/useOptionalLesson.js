import { useEffect, useState } from 'react'
import { buildOptionalBackendUrl, mergeLessonOverride } from '../utils/optionalBackend.js'

let devServerAvailable = null
async function probeDevServer(url) {
  if (import.meta.env.PROD) return false  // No override server in production
  if (devServerAvailable === false) return false
  if (devServerAvailable === true) return true
  try {
    await fetch(url, { signal: AbortSignal.timeout(800), method: 'HEAD' })
    devServerAvailable = true
    return true
  } catch {
    devServerAvailable = false
    return false
  }
}

export function useOptionalLesson(lessonKey, builtInLesson) {
  // State remembers the key and lesson it was computed for. The effect below only runs after a
  // render, so when the lesson changes the stored state belongs to the previous lesson for a
  // render; returning it then would show — and save progress for — the wrong lesson.
  const [state, setState] = useState({
    isLoadingOverride: false,
    lessonOverride: builtInLesson,
    lessonSource: 'built-in',
    forKey: lessonKey,
    forLesson: builtInLesson,
  })

  useEffect(() => {
    let cancelled = false
    const tag = { forKey: lessonKey, forLesson: builtInLesson }

    const fallback = () => {
      if (!cancelled) setState({ isLoadingOverride: false, lessonOverride: builtInLesson, lessonSource: 'built-in', ...tag })
    }

    if (!lessonKey || !builtInLesson) { fallback(); return () => { cancelled = true } }

    setState({ isLoadingOverride: true, lessonOverride: builtInLesson, lessonSource: 'built-in', ...tag })

    const url = buildOptionalBackendUrl('/api/lesson-override', { key: lessonKey })

    async function run() {
      const available = await probeDevServer(url)
      if (!available || cancelled) { fallback(); return }

      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Backend responded with ${response.status}`)
        const payload = await response.json()
        if (cancelled) return
        if (payload?.override) {
          setState({ isLoadingOverride: false, lessonOverride: mergeLessonOverride(builtInLesson, payload.override), lessonSource: 'override', ...tag })
        } else {
          fallback()
        }
      } catch {
        fallback()
      }
    }

    run()
    return () => { cancelled = true }
  }, [lessonKey, builtInLesson])

  if (state.forKey !== lessonKey || state.forLesson !== builtInLesson) {
    return { isLoadingOverride: !!builtInLesson, lessonOverride: builtInLesson, lessonSource: 'built-in' }
  }
  const { forKey, forLesson, ...current } = state
  return current
}
