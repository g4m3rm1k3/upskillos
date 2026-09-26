// Learner edits to lesson notebooks, saved on this device.
//
// Each edit is stored with the original code of the cell it was made in (its `base`), and only
// cells the learner actually changed are stored. On load an edit returns to the cell whose
// original code equals its base — wherever that cell now is — so adding, removing or reordering
// cells in a lesson never moves someone's code into the wrong cell.
//
// When the lesson changed the very cell an edit was based on, the edit goes to the most similar
// current cell and the notebook reports the update; the learner decides (keep mine / use the
// updated version). An edit that resembles no current cell is kept aside as an "orphan" and
// shown to the learner rather than dropped or forced into a cell.
export const DRAFT_KEY = 'upskillos.ml-lab.notebooks.v1'

export function fingerprint(codes) {
  let h = 2166136261
  for (const ch of codes.join('\u0000')) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0 }
  return h.toString(36)
}

function readAll() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {} } catch { return {} } }
function writeAll(all) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(all)); return true } catch { return false } }

// Share of distinct non-blank lines two pieces of code have in common (0..1).
export function similarity(a, b) {
  const lines = s => new Set(s.split('\n').map(l => l.trim()).filter(Boolean))
  const A = lines(a), B = lines(b)
  if (!A.size && !B.size) return 1
  let shared = 0
  for (const l of A) if (B.has(l)) shared++
  return shared / (A.size + B.size - shared)
}
const MATCH = 0.5

// Place edits ({ base, code }) onto the current cells. Exact base matches first, then the most
// similar unclaimed cell (compared by the edit's base, the code the lesson used to have).
function place(edits, originals) {
  const codes = [...originals], bases = originals.map(() => null), orphans = []
  const loose = []
  for (const e of edits) {
    const i = originals.findIndex((o, k) => o === e.base && bases[k] === null)
    if (i >= 0) { codes[i] = e.code; bases[i] = e.base } else loose.push(e)
  }
  const pairs = []
  loose.forEach((e, j) => originals.forEach((o, i) => { const s = similarity(e.base, o); if (s >= MATCH) pairs.push({ s, i, j }) }))
  pairs.sort((x, y) => y.s - x.s)
  const used = new Set()
  for (const { i, j } of pairs) {
    if (bases[i] !== null || used.has(j)) continue
    codes[i] = loose[j].code; bases[i] = loose[j].base; used.add(j)
  }
  loose.forEach((e, j) => { if (!used.has(j)) orphans.push(e) })
  return { codes, bases, orphans }
}

// { codes, bases, orphans, edited, outdated } for the current cells.
//   bases[i]: the original code cell i's edit was made from (null = not edited)
//   edited:   the learner has changes;  outdated: an edit was made against code the lesson has
//             since changed, or an edit no longer matches any cell (orphans)
export function summarizeDraft(codes, bases, orphans, originals) {
  return {
    codes, bases, orphans,
    edited: codes.some((c, i) => c !== originals[i]) || orphans.length > 0,
    outdated: bases.some((b, i) => b !== null && b !== originals[i] && codes[i] !== originals[i]) || orphans.length > 0,
  }
}

export function loadDraft(id, originals) {
  const entry = readAll()[id]
  let edits = []
  if (entry && Array.isArray(entry.edits)) edits = entry.edits
  else if (entry && Array.isArray(entry.cells)) {
    // Older drafts stored every cell by position, with a fingerprint of the cells at the time.
    // Positions are trustworthy only if the lesson has not changed since.
    if (entry.base === fingerprint(originals)) edits = entry.cells.map((code, i) => ({ base: originals[i], code })).filter((e, i) => i < originals.length && e.code !== originals[i])
    // Otherwise the old originals are unknown: an unedited cell is recognised by being identical
    // to a current cell; anything else is placed by similarity to the current cells.
    else edits = entry.cells.filter(code => typeof code === 'string' && !originals.includes(code)).map(code => ({ base: code, code }))
  }
  const { codes, bases, orphans } = place(edits, originals)
  return summarizeDraft(codes, bases, orphans, originals)
}

// Saves the edited cells (and any orphans); removes the entry when nothing differs.
// Returns false if storage failed.
export function saveDraft(id, originals, codes, { bases = [], orphans = [] } = {}) {
  const all = readAll()
  const edits = codes.map((code, i) => ({ base: bases[i] ?? originals[i], code })).filter((e, i) => e.code !== originals[i])
  if (!edits.length && !orphans.length) delete all[id]
  else all[id] = { edits: [...edits, ...orphans], updatedAt: new Date().toISOString() }
  return writeAll(all)
}

// Accept the current lesson version as the base of every placed edit, keeping the learner's code.
export function rebaseDraft(id, originals, codes, { orphans = [] } = {}) {
  return saveDraft(id, originals, codes, { bases: originals, orphans })
}

export function clearDraft(id) { const all = readAll(); delete all[id]; return writeAll(all) }

// Outputs are kept for the page session only, so hiding a notebook or visiting another lesson
// does not erase what the learner just ran. A reload starts with fresh outputs (and fresh Python).
const session = new Map()
export const getSession = id => session.get(id) ?? null
export const setSession = (id, value) => session.set(id, value)
