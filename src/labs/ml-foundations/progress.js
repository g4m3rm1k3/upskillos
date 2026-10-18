// All progress for this lab in one localStorage key, which is in SYNC_KEYS
// (src/context/AuthContext.jsx), so it follows a signed-in learner to other devices.
// mergeMlFoundations (src/context/progressMigration.ts) merges two devices without ever
// un-doing anything. Shape:
//   { [lessonId]: { stages: { try?, watch?, understand?, write?, keep? },
//                   checks: [check ids solved],
//                   code: { [challengeId]: { code, passed, hints, shown } } } }
export const STORE = 'oc-ml-foundations'
export const PLACE = 'upskillos.ml-foundations.place'

export function readAll() {
  try { const all = JSON.parse(localStorage.getItem(STORE)); return all && typeof all === 'object' && !Array.isArray(all) ? all : {} } catch { return {} }
}

export function clean(record) {
  const r = record && typeof record === 'object' ? record : {}
  const stages = {}
  for (const s of ['try', 'watch', 'understand', 'write', 'keep']) if (r.stages?.[s] === true) stages[s] = true
  const checks = Array.isArray(r.checks) ? [...new Set(r.checks.filter(c => typeof c === 'string'))] : []
  const code = {}
  for (const [id, e] of Object.entries(r.code ?? {})) {
    if (e && typeof e.code === 'string') code[id] = { code: e.code, passed: e.passed === true, hints: Number.isInteger(e.hints) ? Math.max(0, Math.min(5, e.hints)) : 0, shown: e.shown === true }
  }
  return { stages, checks, code }
}

export const readLesson = id => clean(readAll()[id])

export function writeLesson(id, record) {
  try { localStorage.setItem(STORE, JSON.stringify({ ...readAll(), [id]: clean(record) })); return true } catch { return false }
}

// The learner's own passed code for each piece, keyed by the piece's function name, so later
// lessons run on what the learner wrote. `challenges` maps challenge id -> its piece name.
export function myPieces(all, pieceOf) {
  const mine = {}
  for (const record of Object.values(all)) {
    for (const [id, e] of Object.entries(record?.code ?? {})) {
      const piece = pieceOf[id]
      if (piece && e?.passed && typeof e.code === 'string') mine[piece] = e.code
    }
  }
  return mine
}

// A lesson counts as done when every challenge in it passed (or, with none, its last stage is kept).
export function lessonDone(lesson, record) {
  if (!record) return false
  const challenges = lesson.challenges ?? []
  if (challenges.length) return challenges.every(c => record.code?.[c.id]?.passed)
  return record.stages?.keep === true
}

export const readPlace = () => { try { return localStorage.getItem(PLACE) } catch { return null } }
export const writePlace = place => { try { localStorage.setItem(PLACE, place) } catch { /* private window */ } }
