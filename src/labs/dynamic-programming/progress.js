export const progressKey = id => `upskillos.dp.v1.${id}`
export function readProgress(id, revision) {
  try {
    const data = JSON.parse(localStorage.getItem(progressKey(id)))
    if (!data || typeof data !== 'object' || data.revision !== revision) return { revision }
    const clean = { revision }
    for (const language of ['Python', 'JavaScript']) {
      const entry = data[language]
      if (entry && typeof entry.code === 'string') clean[language] = { code: entry.code, passed: entry.passed === true, hints: Number.isInteger(entry.hints) ? Math.max(0, Math.min(3, entry.hints)) : 0 }
    }
    return clean
  } catch { return { revision } }
}
export function saveProgress(id, data) {
  try { localStorage.setItem(progressKey(id), JSON.stringify(data)); return true } catch { return false }
}
