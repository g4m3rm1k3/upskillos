// Spaced review (Leitner boxes) and the mastery marks, as plain functions of the saved progress.
// Ported from the Linear Algebra lab (src/labs/linear-algebra-lab/review.js). The review questions are
// each lesson's "Check yourself" checks; check k of a lesson is reviewed as `review[k]` in that
// lesson's synced record: { box: 1–5, due: epoch ms, at: when it was last scheduled }.
import { CHECKS } from './lessons/checks.js'
import { DESIGNS } from './lessons/designs.js'
import { BUG_HUNTS } from './hunt.js'
import { isSolved } from './progress.js'

const DAY = 86400000
export const INTERVAL_DAYS = [0, 1, 3, 7, 21, 60]
export const RETRY_MS = 10 * 60000

export function schedule(entry, correct, now = Date.now()) {
  if (!correct) return { box: 1, due: now + RETRY_MS, at: now }
  const box = Math.min(5, (entry?.box ?? 0) + 1)
  return { box, due: now + INTERVAL_DAYS[box] * DAY, at: now }
}

// Finishing a lesson's checks puts them into review, first due a day later (they were just answered).
export function enterReview(review, total, now = Date.now()) {
  const next = { ...(review ?? {}) }
  for (let k = 0; k < total; k++) if (!next[k]) next[k] = { box: 1, due: now + DAY, at: now }
  return next
}

// Every due check of every lesson whose checks are done, weakest first, then in curriculum order.
export function dueItems(progress, now = Date.now()) {
  const due = []
  for (const [id, checks] of Object.entries(CHECKS)) {
    const record = progress[id]
    if (!record?.checks?.done) continue
    checks.forEach((check, k) => {
      const entry = record.review?.[k]
      if (!entry || entry.due <= now) due.push({ id, k, check, box: entry?.box ?? 0 })
    })
  }
  return due.sort((a, b) => a.box - b.box)
}

export const retained = (id, record) => Boolean(CHECKS[id]?.length) && CHECKS[id].every((_, k) => (record?.review?.[k]?.box ?? 0) >= 3)

// The five marks on the mastery map. null means the lesson has no such stage.
export const MARKS = [['designed', 'Designed it'], ['solved', 'Solved it'], ['fixed', 'Fixed the bug'], ['checked', 'Checked yourself'], ['retained', 'Retained in review']]
export function marks(id, record) {
  return {
    designed: DESIGNS[id] ? Boolean(record?.design?.done) : null,
    solved: isSolved(record),
    fixed: BUG_HUNTS[id] ? Boolean(record?.hunt?.passed) : null,
    checked: Boolean(record?.checks?.done),
    retained: retained(id, record),
  }
}
