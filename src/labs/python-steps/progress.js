// Saved progress for the lesson labs (QMaze, KartLab, Tabletop RL, Neural Net, Math for ML,
// CartPole, NLP Studio): which checks a learner has answered, and their drafts.
//
// Each interactive block is remembered by its prompt (a derivation by its title), not by its
// position, so adding a block to a lesson never moves a learner's answers onto other questions.
// Progress saved before this used block positions. A block added to a lesson after that carries
// `added: true`; leaving those out gives back the layout the old positions referred to, so every
// old position converts to the right block.

export const interactive = b => b.predict ?? b.choice ?? b.exercise ?? b.write ?? b.derive

export const checkKey = b => { const spec = interactive(b ?? {}); return spec ? (spec.prompt ?? spec.title) : undefined }

// Where block k sat before blocks were added: its index among the blocks that are not `added`.
export const legacyIndex = (lesson, k) => k - lesson.blocks.slice(0, k).filter(b => b.added).length

// The block an old saved position referred to.
export const legacyBlock = (lesson, index) => lesson.blocks.filter(b => !b.added)[index]

// One lesson's saved state with every old position turned into its block's key: `solved`
// (a list), and any of `derive` and `code` (objects keyed by block).
export function upgradeSaved(lesson, saved) {
  if (!lesson || !saved || typeof saved !== 'object') return saved
  const key = k => (typeof k === 'number' || /^\d+$/.test(k) ? checkKey(legacyBlock(lesson, Number(k))) : k)
  const out = { ...saved }
  if (Array.isArray(saved.solved)) out.solved = [...new Set(saved.solved.map(key).filter(Boolean))]
  for (const field of ['derive', 'code']) {
    if (saved[field] && typeof saved[field] === 'object') {
      out[field] = Object.fromEntries(Object.entries(saved[field]).map(([k, v]) => [key(k), v]).filter(([k]) => k))
    }
  }
  return out
}

// A whole progress object ({ lessons: { [id]: saved } }) upgraded lesson by lesson.
export function upgradeProgress(progress, lessonById) {
  if (!progress?.lessons) return progress
  return { ...progress, lessons: Object.fromEntries(Object.entries(progress.lessons).map(([id, s]) => [id, upgradeSaved(lessonById(id), s)])) }
}

// How many of a lesson's checks are answered (`isCheck` picks which blocks count).
export function countSolved(lesson, saved, isCheck = b => b.predict || b.choice) {
  const keys = lesson.blocks.filter(isCheck).map(checkKey).filter(Boolean)
  return { checks: keys.length, solved: keys.filter(k => saved?.solved?.includes(k)).length }
}
