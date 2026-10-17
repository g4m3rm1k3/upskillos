// "Design it yourself": the learner builds a lesson's DP before it is explained (DesignIt.jsx).
//
// Each entry has:
//   problem   the problem in plain words
//   tryFirst  { prompt, args, answer, kind?: 'yesno', misconceptions: [{ answer, feedback }], explain }:
//             solve a small case by hand first. args are the challenge's arguments, so the test can
//             check answer against the brute-force oracle.
//   steps     six decisions, one per kind in KINDS order, each { kind, ask, options: [{ text, why, right? }] }.
//             Exactly one option is right; every option says why, and the wrong ones are real mistakes.
//   apply     { cell: [r, c], input? }: compute one cell of the lesson's live trace (tables.js) by hand.
//             Or, for a lesson with no trace, { prompt, args, answer, misconceptions, explain } like tryFirst.
import { TRACES } from '../tables.js'
import { LINEAR_DESIGNS } from './design-linear.js'

export const KINDS = [
  ['state', 'What a cell means'],
  ['split', 'The last choice'],
  ['recurrence', 'The recurrence'],
  ['base', 'Base cases'],
  ['order', 'Fill order'],
  ['answer', 'Where the answer is'],
]

export const DESIGNS = { ...LINEAR_DESIGNS }

// The apply step on a live trace: the trace, the step that writes the cell, and every value known before it.
export function applyCell(id, apply) {
  const t = TRACES[id](apply.input)
  const index = t.table.steps.findIndex(s => s.at[0] === apply.cell[0] && s.at[1] === apply.cell[1])
  if (index < 0) return null
  const known = [...t.table.base, ...t.table.steps.slice(0, index)].map(s => [t.table.name(...s.at), s.value])
  return { trace: t, step: t.table.steps[index], known }
}
