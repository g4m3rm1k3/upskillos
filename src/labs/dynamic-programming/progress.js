// Progress for every DP lesson, in one localStorage key so the app's sign-in sync (SYNC_KEYS in
// src/context/AuthContext.jsx) backs it up to the user's account; mergeDpLab in
// src/context/progressMigration.ts merges two devices without ever un-solving a lesson.
// Shape: { [lessonId]: { revision, Python?, JavaScript?, quiz?, design?, hunt?, checks?, review? } }.
export const STORE = 'oc-dp-lab'
// Before 2026-10-17 each lesson had its own key; those are moved into STORE the first time they are read.
export const progressKey = id => `upskillos.dp.v1.${id}`

function readAll() {
  try { const all = JSON.parse(localStorage.getItem(STORE)); return all && typeof all === 'object' && !Array.isArray(all) ? all : {} } catch { return {} }
}

export function cleanRecord(data, revision) {
  if (!data || typeof data !== 'object' || data.revision !== revision) return { revision }
  const clean = { revision }
  for (const language of ['Python', 'JavaScript']) {
    const entry = data[language]
    if (entry && typeof entry.code === 'string') clean[language] = { code: entry.code, passed: entry.passed === true, hints: Number.isInteger(entry.hints) ? Math.max(0, Math.min(3, entry.hints)) : 0 }
  }
  if (data.quiz && typeof data.quiz.answer === 'string') clean.quiz = { answer: data.quiz.answer, passed: data.quiz.passed === true }
  if (data.hunt && typeof data.hunt === 'object') clean.hunt = cleanHunt(data.hunt)
  if (data.checks?.done === true) clean.checks = { done: true, total: Number.isInteger(data.checks.total) ? Math.max(0, data.checks.total) : 0, firstTry: Number.isInteger(data.checks.firstTry) ? Math.max(0, data.checks.firstTry) : 0 }
  if (data.review && typeof data.review === 'object') { const review = cleanReview(data.review); if (Object.keys(review).length) clean.review = review }
  if (data.design?.done === true) clean.design = { done: true, misses: Number.isInteger(data.design.misses) ? Math.max(0, data.design.misses) : 0, assisted: data.design.assisted === true }
  return clean
}

// Spaced review of the lesson's checks (review.js): { [check index]: { box: 1–5, due, at } }.
export function cleanReview(data) {
  const review = {}
  for (const [k, e] of Object.entries(data)) {
    if (/^\d+$/.test(k) && e && Number.isInteger(e.box) && e.box >= 1 && e.box <= 5 && Number.isFinite(e.due)) review[k] = { box: e.box, due: e.due, at: Number.isFinite(e.at) ? e.at : 0 }
  }
  return review
}

// A bug hunt (Hunt.jsx): whether the line was found and the fix passed, the clues used, whether the
// answer was shown (an assisted pass), and the learner's edited code in each language.
const count = (n, top) => Number.isInteger(n) ? Math.max(0, Math.min(top, n)) : 0
export function cleanHunt(data) {
  const hunt = { found: data.found === true, passed: data.passed === true, shown: data.shown === true, misses: count(data.misses, 1e6), clues: count(data.clues, 3) }
  for (const language of ['Python', 'JavaScript']) if (typeof data[language] === 'string') hunt[language] = data[language]
  return hunt
}

export function readProgress(id, revision) {
  try {
    const all = readAll()
    if (all[id]) return cleanRecord(all[id], revision)
    const legacy = JSON.parse(localStorage.getItem(progressKey(id)))
    if (!legacy) return { revision }
    const record = cleanRecord(legacy, revision)
    localStorage.setItem(STORE, JSON.stringify({ ...all, [id]: record }))
    localStorage.removeItem(progressKey(id))
    return record
  } catch { return { revision } }
}

export function saveProgress(id, data) {
  try {
    localStorage.setItem(STORE, JSON.stringify({ ...readAll(), [id]: data }))
    localStorage.removeItem(progressKey(id))
    return true
  } catch { return false }
}

// What counts as solving a lesson: its challenge passed in either language, or its quiz passed.
export const isSolved = record => Boolean(record?.Python?.passed || record?.JavaScript?.passed || record?.quiz?.passed)
