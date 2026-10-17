// Spaced review (Leitner boxes) and the mastery stages, as plain functions of the saved progress.
// A quiz item's key is `<lesson id>#<index>`; its review entry is { box: 1–5, due: epoch ms }.
const DAY = 86400000
export const INTERVAL_DAYS = [0, 1, 3, 7, 21, 60]
export const RETRY_MS = 10 * 60000

export const itemKey = (lesson, index) => `${lesson.id}#${index}`

// A lesson enters review once the learner has done something with it.
export const studied = (lesson, store) => Boolean(store.ran?.[lesson.id] || store.done?.[lesson.id] || store.proved?.[lesson.id] || (lesson.quiz ?? []).some((_, i) => store.review?.[itemKey(lesson, i)]))

export function dueItems(lessons, store, now = Date.now()) {
  const due = []
  for (const lesson of lessons) {
    if (!studied(lesson, store)) continue
    ;(lesson.quiz ?? []).forEach((item, index) => {
      const entry = store.review?.[itemKey(lesson, index)]
      if (!entry || entry.due <= now) due.push({ lesson, item, index, key: itemKey(lesson, index), box: entry?.box ?? 0 })
    })
  }
  // Weakest first, then curriculum order.
  return due.sort((a, b) => a.box - b.box)
}

export function schedule(entry, correct, now = Date.now()) {
  if (!correct) return { box: 1, due: now + RETRY_MS }
  const box = Math.min(5, (entry?.box ?? 0) + 1)
  return { box, due: now + INTERVAL_DAYS[box] * DAY }
}

export const retained = (lesson, store) => (lesson.quiz ?? []).length > 0 && lesson.quiz.every((_, i) => (store.review?.[itemKey(lesson, i)]?.box ?? 0) >= 3)

// The four stages shown on the mastery map. `null` means the lesson has no such stage.
export function stages(lesson, store) {
  return {
    explored: Boolean(store.ran?.[lesson.id]),
    practiced: Boolean(store.done?.[lesson.id]),
    proved: lesson.proof ? Boolean(store.proved?.[lesson.id]) : null,
    retained: retained(lesson, store),
  }
}
