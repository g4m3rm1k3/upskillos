// Learner edits to lesson notebooks, saved on this device under a versioned key.
// A draft records a fingerprint of the original cells it was based on, so a course update is
// detected and reported instead of silently replacing (or silently keeping) someone's work.
export const DRAFT_KEY = 'upskillos.ml-lab.notebooks.v1'

export function fingerprint(codes) {
  let h = 2166136261
  for (const ch of codes.join('\u0000')) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0 }
  return h.toString(36)
}

function readAll() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {} } catch { return {} } }
function writeAll(all) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(all)); return true } catch { return false } }

// { codes, edited, outdated }: edited = the learner has changes; outdated = the lesson's
// original cells changed since the draft was made (the draft is kept and the learner decides).
export function loadDraft(id, originals) {
  const draft = readAll()[id]
  if (!draft || !Array.isArray(draft.cells)) return { codes: [...originals], edited: false, outdated: false }
  const codes = originals.map((code, i) => typeof draft.cells[i] === 'string' ? draft.cells[i] : code)
  return { codes, edited: true, outdated: draft.base !== fingerprint(originals) }
}

// Saves only when something differs from the original; returns false if storage failed.
export function saveDraft(id, originals, codes) {
  const all = readAll()
  if (codes.every((c, i) => c === originals[i]) && all[id]?.base === fingerprint(originals)) delete all[id]
  else all[id] = { base: all[id]?.base ?? fingerprint(originals), cells: codes, updatedAt: new Date().toISOString() }
  return writeAll(all)
}

// Accept the current lesson version as the new base, keeping the learner's code.
export function rebaseDraft(id, originals, codes) {
  const all = readAll()
  all[id] = { base: fingerprint(originals), cells: codes, updatedAt: new Date().toISOString() }
  return writeAll(all)
}

export function clearDraft(id) { const all = readAll(); delete all[id]; return writeAll(all) }

// Outputs are kept for the page session only, so hiding a notebook or visiting another lesson
// does not erase what the learner just ran. A reload starts with fresh outputs (and fresh Python).
const session = new Map()
export const getSession = id => session.get(id) ?? null
export const setSession = (id, value) => session.set(id, value)
