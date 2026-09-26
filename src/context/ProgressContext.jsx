export const meta = {
  title: 'Progress Context',
  description: 'Tracks lesson completion across the entire app — quiz scores, per-question states, and checkpoints. Persists to localStorage and syncs to Firebase when signed in.',
  concept: 'React Context',
  conceptDetail: 'Context lets any component in the tree read or update progress without passing props through every layer. No drilling required — just call useProgress().',
}

import { createContext, useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useAuth } from './AuthContext.jsx'
import { getLessonIdLookup } from '../courses/courseLoader.js'
import LESSON_ID_REPAIRS from '../data/lessonIdRepairs.json'
import LESSON_ID_SPLITS from '../data/lessonIdSplits.json'
import { normalizeLessonProgress, copyProgressKeys } from './progressMigration.ts'
import { celebrate } from '../features/compass/montyNudge.ts'

const MIGRATION_FLAG = '_oc_progress_migrated_v2'
// Separate flag: learners who already ran the migration above still need the split copy.
const SPLIT_FLAG = '_oc_progress_split_v1'

export const ProgressContext = createContext(null)

export function ProgressProvider({ children }) {
  const [progress, setProgress] = useLocalStorage('oc-progress', {})
  const { pushNow } = useAuth() ?? {}

  // One-time progress migrations, run once on mount, in order, on one value, saved once:
  //
  // 1. (MIGRATION_FLAG) off the old route-derived progress key shape ("<courseId>/<slug>",
  //    which breaks the moment a lesson file gets renamed — confirmed real incident) onto a
  //    stable, content-derived one ("<courseId>::<lesson.id>"), plus repairs for ids the first
  //    generated id map got wrong. getLessonIdLookup() is a plain, pre-built synchronous map
  //    (see courseLoader.js), so there is no loading gap.
  // 2. (SPLIT_FLAG) copies for lessons split off a shared id (src/data/lessonIdSplits.json).
  //    Only progress is copied: current notes are not keyed by lesson
  //    (see src/components/ui/notesStore.js).
  //
  // Both steps work on the same value so the second cannot overwrite the first's result.
  const ranMigration = useRef(false)
  useEffect(() => {
    if (ranMigration.current) return
    ranMigration.current = true
    let current = progress
    let changed = false
    if (!localStorage.getItem(MIGRATION_FLAG)) {
      const step = normalizeLessonProgress(current, getLessonIdLookup(), LESSON_ID_REPAIRS)
      current = step.migrated
      changed = changed || step.changed
    }
    if (!localStorage.getItem(SPLIT_FLAG)) {
      const step = copyProgressKeys(current, LESSON_ID_SPLITS)
      current = step.migrated
      changed = changed || step.changed
    }
    if (changed) {
      setProgress(current)
      // Persist the recovered progress to Firestore right away — don't wait
      // for the next checkpoint/quiz/5-minute interval, since this IS the
      // recovery of previously-orphaned data.
      pushNow?.()
    }
    localStorage.setItem(MIGRATION_FLAG, '1')
    localStorage.setItem(SPLIT_FLAG, '1')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mirrors `progress` without being a dependency of markCheckpoint itself —
  // reading it via ref (instead of adding `progress` to the callback's deps)
  // keeps markCheckpoint referentially stable across unrelated progress
  // changes elsewhere in the app, which several effects key off of.
  const progressRef = useRef(progress)
  useEffect(() => { progressRef.current = progress }, [progress])

  const markCheckpoint = useCallback((lessonId, checkpoint) => {
    const existing = progressRef.current[lessonId]?.completedCheckpoints ?? []
    const isNew = !existing.includes(checkpoint)
    setProgress((prev) => {
      const existingPrev = prev[lessonId]?.completedCheckpoints ?? []
      if (existingPrev.includes(checkpoint)) return prev
      return {
        ...prev,
        [lessonId]: {
          ...prev[lessonId],
          completedCheckpoints: [...existingPrev, checkpoint],
        },
      }
    })
    // Monty's "nice work" nudge — only for genuinely new completions, not
    // a no-op re-mark of something already done.
    if (isNew) {
      celebrate(checkpoint === 'quiz-passed' ? 'Quiz passed — nice work! 🎉' : 'Checkpoint complete — nice work! 🎉')
    }
    // Immediately persist to Firestore so progress is never lost on a crash
    pushNow?.()
  }, [setProgress, pushNow])

  // Stamps when a lesson was last opened — powers "continue where you left
  // off" on the profile page. Not pushed immediately (unlike checkpoints/
  // quizzes): a page visit isn't a meaningful completion event worth a
  // dedicated Firestore write, it'll ride along on the next one of those or
  // the periodic sync.
  const markVisited = useCallback((lessonId) => {
    if (!lessonId) return
    setProgress((prev) => ({
      ...prev,
      [lessonId]: { ...prev[lessonId], lastVisitedAt: Date.now() },
    }))
  }, [setProgress])

  const setActiveTab = useCallback((lessonId, tab) => {
    setProgress((prev) => ({
      ...prev,
      [lessonId]: { ...prev[lessonId], activeTab: tab },
    }))
  }, [setProgress])

  const getLessonStatus = useCallback((lessonId, totalCheckpoints) => {
    const cp = progress[lessonId]?.completedCheckpoints?.length ?? 0
    if (cp === 0) return 'not-started'
    if (cp >= totalCheckpoints) return 'complete'
    return 'in-progress'
  }, [progress])

  const getActiveTab = useCallback((lessonId) => {
    return progress[lessonId]?.activeTab ?? 'intuition'
  }, [progress])

  const setReadingProgress = useCallback((lessonId, percent) => {
    setProgress((prev) => {
      const current = prev[lessonId]?.readingProgress ?? 0
      if (percent <= current) return prev
      return {
        ...prev,
        [lessonId]: { ...prev[lessonId], readingProgress: percent },
      }
    })
  }, [setProgress])

  const getReadingProgress = useCallback((lessonId) => {
    return progress[lessonId]?.readingProgress ?? 0
  }, [progress])

  // correct = right answers so far, attempted = questions answered, total = quiz length
  const setQuizScore = useCallback((lessonId, correct, attempted, total) => {
    setProgress((prev) => ({
      ...prev,
      [lessonId]: {
        ...prev[lessonId],
        quiz: { correct, attempted, total, attemptedAt: Date.now() },
      },
    }))
    pushNow?.()
  }, [setProgress, pushNow])

  const getQuizScore = useCallback((lessonId) => {
    return progress[lessonId]?.quiz ?? null
  }, [progress])

  // Seeds quiz.total the moment a lesson's quiz block mounts — before any
  // question is answered. getLessonProgress uses entry.quiz's presence to
  // decide "this lesson is graded by its quiz" vs "no quiz, fall back to
  // checkpoints"; without this seed, an unattempted quiz looked identical
  // to "no quiz at all" and a scroll-triggered reading checkpoint could
  // mark the lesson complete before the quiz was ever touched (real bug).
  // Local-only, no pushNow — losing this seed to a crash before any real
  // answer is harmless, it's just bookkeeping.
  const ensureQuizTotal = useCallback((lessonId, total) => {
    setProgress((prev) => {
      if (prev[lessonId]?.quiz) return prev // a real quiz record already exists — don't clobber it
      return {
        ...prev,
        [lessonId]: { ...prev[lessonId], quiz: { correct: 0, attempted: 0, total, attemptedAt: 0 } },
      }
    })
  }, [setProgress])

  const setQuizStates = useCallback((lessonId, states) => {
    setProgress((prev) => ({
      ...prev,
      [lessonId]: { ...prev[lessonId], quizStates: states },
    }))
    pushNow?.()
  }, [setProgress, pushNow])

  const getQuizStates = useCallback((lessonId) => {
    return progress[lessonId]?.quizStates ?? {}
  }, [progress])

  // Clears every progress entry belonging to one course — matches both the
  // current key scheme ("<courseId>::<lessonId>") and the legacy one
  // ("<courseId>/<slug>", for any entry that predates migrateOldProgressKeys
  // or that this course's migration couldn't resolve). Pushed immediately:
  // this is an explicit, deliberate action, not incidental bookkeeping.
  const resetCourseProgress = useCallback((courseId) => {
    setProgress((prev) => {
      const next = { ...prev }
      let changed = false
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${courseId}::`) || key.startsWith(`${courseId}/`)) {
          delete next[key]
          changed = true
        }
      }
      return changed ? next : prev
    })
    pushNow?.()
  }, [setProgress, pushNow])

  // Clears exactly one lesson's progress entry — unlike resetCourseProgress,
  // a single lesson's checkpoints all live under one flat key
  // ("<lab>::<lessonId>"), not a prefix shared by many keys, so a plain
  // delete is correct here instead of a startsWith scan.
  const resetLessonProgress = useCallback((lessonId) => {
    setProgress((prev) => {
      if (!(lessonId in prev)) return prev
      const next = { ...prev }
      delete next[lessonId]
      return next
    })
    pushNow?.()
  }, [setProgress, pushNow])

  // Quiz score is the canonical lesson progress metric.
  // Falls back to reading checkpoints for lessons that have no quiz.
  const getLessonProgress = useCallback((lessonId) => {
    const entry = progress[lessonId]
    if (!entry) return { percent: 0, status: 'not-started', correct: 0, total: 0 }

    if (entry.quiz && entry.quiz.total > 0) {
      const pct = Math.round((entry.quiz.correct / entry.quiz.total) * 100)
      return {
        percent: pct,
        status: pct >= 100 ? 'complete' : pct > 0 ? 'in-progress' : 'not-started',
        correct: entry.quiz.correct,
        total: entry.quiz.total,
      }
    }

    const cp = entry.completedCheckpoints?.length ?? 0
    return {
      percent: cp > 0 ? 100 : 0,
      status: cp > 0 ? 'complete' : 'not-started',
      correct: 0,
      total: 0,
    }
  }, [progress])

  const value = useMemo(() => ({
    progress, markCheckpoint, markVisited, setActiveTab, getLessonStatus, getLessonProgress,
    getActiveTab, setReadingProgress, getReadingProgress,
    setQuizScore, getQuizScore, setQuizStates, getQuizStates, ensureQuizTotal,
    resetCourseProgress, resetLessonProgress
  }), [
    progress, markCheckpoint, markVisited, setActiveTab, getLessonStatus, getLessonProgress,
    getActiveTab, setReadingProgress, getReadingProgress,
    setQuizScore, getQuizScore, setQuizStates, getQuizStates, ensureQuizTotal,
    resetCourseProgress, resetLessonProgress
  ])

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  )
}
