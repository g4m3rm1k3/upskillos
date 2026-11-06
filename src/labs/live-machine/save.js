// save.js
// One save for the whole game: per-level code and progress, the current level, and when you
// were last on board. Saved on every change; exportable as a file for backup or moving machines.
const KEY = 'live-machine-save-v1'

export const emptySave = () => ({ version: 1, current: null, lastVisit: null, levels: {} })

export function readSave(storage = globalThis.localStorage) {
  try {
    const v = JSON.parse(storage?.getItem(KEY) || 'null')
    return v && v.version === 1 ? { ...emptySave(), ...v } : emptySave()
  } catch {
    return emptySave()
  }
}

export function writeSave(save, storage = globalThis.localStorage) {
  try { storage?.setItem(KEY, JSON.stringify(save)) } catch { /* storage full or blocked: keep playing */ }
}

export function levelSave(save, id) {
  return save.levels[id] ?? { code: null, step: 0, predictions: {}, stepsDone: [], complete: false, hintsShown: {} }
}

export function withLevel(save, id, patch) {
  return { ...save, current: id, levels: { ...save.levels, [id]: { ...levelSave(save, id), ...patch } } }
}

export function exportSave(save) {
  return new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' })
}

export function importSave(text) {
  const v = JSON.parse(text)
  if (!v || v.version !== 1 || typeof v.levels !== 'object') throw new Error('That file is not a Live Machine save.')
  return { ...emptySave(), ...v }
}

export function ago(iso, now = Date.now()) {
  if (!iso) return null
  const mins = Math.round((now - new Date(iso).getTime()) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
