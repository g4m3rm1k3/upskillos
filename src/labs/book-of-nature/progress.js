// Per-viewer progress: which moments are done. Browser storage can be missing or
// blocked, so every access is guarded and the lab works without it.
const KEY = 'book-of-nature:progress'

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

export function markDone(momentId) {
  const progress = loadProgress()
  progress[momentId] = { done: true, at: new Date().toISOString() }
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    // Progress is a convenience; ignore storage failures.
  }
  return progress
}
