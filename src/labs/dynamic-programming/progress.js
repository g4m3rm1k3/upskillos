// Progress for every DP lesson, in one localStorage key so the app's sign-in sync (SYNC_KEYS in
// src/context/AuthContext.jsx) backs it up to the user's account; mergeDpLab in
// src/context/progressMigration.ts merges two devices without ever un-solving a lesson.
// Shape: { [lessonId]: { revision, Python?, JavaScript?, quiz?, design? } }.
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
  if (data.design?.done === true) clean.design = { done: true, misses: Number.isInteger(data.design.misses) ? Math.max(0, data.design.misses) : 0, assisted: data.design.assisted === true }
  return clean
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
