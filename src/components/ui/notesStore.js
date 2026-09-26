import DEFAULT_NOTES from './default-notes.json'

// Shared read/write logic for NotesListWindow.jsx + NoteEditorWindow.jsx.
// Same storage key and merge behavior as the earlier lesson-anchored notes (removed), so
// notes written before this refactor keep showing up unchanged. Older notes and
// default-notes.json are keyed "<lesson id>:<section>"; new notes are "manual:<id>".
export const STORAGE_KEY = 'oc-sticky-notes'

export function readUserNotes() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}

export function readMergedNotes() {
  const user = readUserNotes()
  const merged = {}
  for (const [id, note] of Object.entries(DEFAULT_NOTES)) {
    if (id === '__version') continue
    if (note?.text?.trim()) merged[id] = { ...note, _isDefault: true }
  }
  for (const [id, note] of Object.entries(user)) {
    if (note?.deleted) { delete merged[id]; continue }
    if (note?.text?.trim()) merged[id] = note
  }
  return merged
}

// Merge: user note wins; tombstone hides default; else fall back to default
export function getNote(id) {
  const user = readUserNotes()[id]
  if (user?.deleted) return null
  if (user?.text?.trim()) return user
  const def = DEFAULT_NOTES[id]
  if (def?.text?.trim()) return { ...def, _isDefault: true }
  return null
}

export function saveNote(id, data) {
  const all = readUserNotes()
  all[id] = { ...data, updatedAt: Date.now(), deleted: false }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  window.dispatchEvent(new Event('oc-note-change'))
}

export function removeNote(id) {
  const all = readUserNotes()
  const hasDefault = !!DEFAULT_NOTES[id]?.text?.trim()
  if (hasDefault) all[id] = { deleted: true } // tombstone so the default stays hidden
  else delete all[id]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  window.dispatchEvent(new Event('oc-note-change'))
}

export function newNoteId() {
  return `manual:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
