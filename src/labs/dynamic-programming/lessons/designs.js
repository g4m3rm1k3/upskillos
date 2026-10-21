// "Design it yourself": the learner builds a lesson's DP before it is explained (DesignIt.jsx).
//
// Each entry has:
//   problem   the problem in plain words
//   tryFirst  { prompt, args, answer, kind?: 'yesno', oracle?, misconceptions: [{ answer, feedback }], explain }:
//             solve a small case by hand first. args are the challenge's arguments, so the test can
//             check answer against the brute-force oracle: core-oracles.js, advanced-oracles.js or expert-oracles.js, or structured-oracles.js for
//             lessons with no challenge (oracle names another lesson's when the challenge asks a variant).
//   steps     six decisions, one per kind in KINDS order, each { kind, ask, options: [{ text, why, right? }] }.
//             Exactly one option is right; every option says why, and the wrong ones are real mistakes.
//   apply     { cell: [r, c], input?, misconceptions? }: compute one cell of the lesson's live trace (tables.js) by hand.
//             Or, for a lesson with no trace, { prompt, args, answer, misconceptions, explain } like tryFirst.
import { TRACES } from '../tables.js'
import { LINEAR_DESIGNS } from './design-linear.js'
import { GRID_DESIGNS } from './design-grids.js'
import { KNAPSACK_DESIGNS } from './design-knapsack.js'
import { COUNTING_DESIGNS } from './design-counting.js'
import { SEQUENCE_DESIGNS } from './design-sequences.js'
import { STRING_DESIGNS } from './design-strings.js'
import { INTERVAL_DESIGNS } from './design-intervals.js'
import { SCHEDULING_DESIGNS } from './design-scheduling.js'
import { DAG_DESIGNS } from './design-dag.js'
import { TREE_DESIGNS } from './design-tree.js'
import { SUBSET_DESIGNS } from './design-subset.js'
import { DIGIT_DESIGNS } from './design-digit.js'
import { SPACE_DESIGNS } from './design-space.js'
import { SPLIT_DESIGNS } from './design-split.js'
import { ALGEBRA_DESIGNS } from './design-algebra.js'
import { PROFILE_DESIGNS } from './design-profiles.js'

export const KINDS = [
  ['state', 'What a cell means'],
  ['split', 'The last choice'],
  ['recurrence', 'The recurrence'],
  ['base', 'Base cases'],
  ['order', 'Fill order'],
  ['answer', 'Where the answer is'],
]

export const DESIGNS = { ...LINEAR_DESIGNS, ...GRID_DESIGNS, ...KNAPSACK_DESIGNS, ...COUNTING_DESIGNS, ...SEQUENCE_DESIGNS, ...STRING_DESIGNS, ...INTERVAL_DESIGNS, ...SCHEDULING_DESIGNS, ...DAG_DESIGNS, ...TREE_DESIGNS, ...SUBSET_DESIGNS, ...DIGIT_DESIGNS, ...SPACE_DESIGNS, ...SPLIT_DESIGNS, ...ALGEBRA_DESIGNS, ...PROFILE_DESIGNS }

// The apply step on a live trace: the trace, the step that writes the cell, and every value known before it.
export function applyCell(id, apply) {
  const t = TRACES[id](apply.input)
  const index = t.table.steps.findIndex(s => s.at[0] === apply.cell[0] && s.at[1] === apply.cell[1])
  if (index < 0) return null
  const known = [...t.table.base, ...t.table.steps.slice(0, index)].map(s => [t.table.name(...s.at), s.value])
  return { trace: t, step: t.table.steps[index], known }
}

// The order a decision's options are shown in. Authors tend to write the right option first, so it is
// moved: to position (lesson offset + decision number) mod option count, the others keeping their order.
// That puts it in a different place from one decision to the next, and the same place on every visit.
export function displayOrder(id, k, options) {
  let h = 2166136261
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  const right = options.findIndex(o => o.right)
  const others = options.map((_, i) => i).filter(i => i !== right)
  const at = (h + k) % options.length
  return [...others.slice(0, at), right, ...others.slice(at)]
}
