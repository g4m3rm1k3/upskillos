// Every spreadsheet exercise in the lessons, as the Spreadsheet Lab's "things to try" on the shop's
// orders: written once, in the lesson, and listed in the lab under "From the lessons" (its dataset
// 'shop-orders' loads this file when that sheet opens). A lesson's "Open in the Spreadsheet Lab"
// button names its exercise by id, the same `lesson id:block index` key its progress uses.
import { LESSONS } from './index.js'

// A prompt's first sentence, as plain text: the lab shows it under the exercise's name.
const firstSentence = md => md.replace(/[`*$]/g, '').split(/(?<=[.?!:])\s/)[0]

export const SHEET_EXERCISES = LESSONS.flatMap(lesson => lesson.blocks.flatMap((b, k) => (b.formula ? [{
  id: `${lesson.id}:${k}`,
  label: `Lesson ${lesson.number}: ${lesson.title}`,
  learn: firstSentence(b.formula.prompt),
  solution: b.formula.solution,
  steps: [{ kind: 'cells', at: 'I1', rows: [[`Lesson ${lesson.number}`], [b.formula.solution]] }],
}] : [])))

// The exercise to open, with the learner's own formula in place of the lesson's answer when given.
export function exerciseTry(id, formula = null) {
  const t = SHEET_EXERCISES.find(e => e.id === id)
  if (!t || !formula) return t ?? null
  return { ...t, label: `${t.label} (your formula)`, steps: [{ ...t.steps[0], rows: [[t.steps[0].rows[0][0]], [formula]] }] }
}

// The lessons that ask for each spreadsheet function (by its `must` list): the Spreadsheet Lab's help
// for COUNTIF, VAR.S, PIVOTBY… links to them, since the lesson derives what the function computes.
export const FUNCTION_LESSONS = {}
for (const lesson of LESSONS) {
  for (const b of lesson.blocks) {
    for (const fn of b.formula?.must ?? []) {
      const list = (FUNCTION_LESSONS[fn.toUpperCase()] ??= [])
      if (!list.some(l => l.id === lesson.id)) list.push({ id: lesson.id, label: `Lesson ${lesson.number}: ${lesson.title}` })
    }
  }
}
