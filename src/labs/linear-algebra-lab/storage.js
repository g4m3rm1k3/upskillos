export const STORE_KEY = 'upskillos.linear-algebra-lab.v1'
export function readProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(STORE_KEY))
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return {
      current: typeof value.current === 'string' ? value.current : undefined,
      drafts: dictionary(value.drafts),
      demos: dictionary(value.demos),
      done: dictionary(value.done),
      viewed: dictionary(value.viewed),
      ran: dictionary(value.ran),
      proved: dictionary(value.proved),
      review: dictionary(value.review),
      problemSeeds: dictionary(value.problemSeeds),
      problemCurrent: dictionary(value.problemCurrent),
      problemDrafts: dictionary(value.problemDrafts),
      problemPasses: dictionary(value.problemPasses),
      problemViewed: dictionary(value.problemViewed),
      problemReflections: dictionary(value.problemReflections),
    }
  } catch { return {} }
}
function dictionary(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}
export function saveProgress(value) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(value)); return true } catch { return false }
}
