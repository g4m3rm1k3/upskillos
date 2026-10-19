// What a bug hunt shows is computed from its data (lessons/bug-hunts.js): the buggy code is the
// correct code with the swap applied, and the bug's lines are wherever the swap landed.
import { BUG_HUNTS } from './lessons/bug-hunts.js'

export { BUG_HUNTS }

export function buggyCode(hunt, language) {
  const [right, wrong] = hunt.swap[language]
  return hunt.code[language].replace(right, wrong)
}

// The 1-based line numbers of the buggy lines in buggyCode.
export function bugLines(hunt, language) {
  const [right, wrong] = hunt.swap[language]
  const start = hunt.code[language].slice(0, hunt.code[language].indexOf(right)).split('\n').length
  return Array.from({ length: wrong.split('\n').length }, (_, i) => start + i)
}

// The note for a correct line the learner suspected, if the hunt has one.
export function decoyNote(hunt, language, lineText) {
  const index = language === 'Python' ? 0 : 1
  return hunt.decoys?.find(([match]) => lineText.includes(match[index]))?.[1] ?? null
}

// Values as the learner's language writes them: Python spells true and false True and False.
export const show = (value, language) => {
  const text = JSON.stringify(value)
  return language === 'Python' ? text.replace(/\btrue\b/g, 'True').replace(/\bfalse\b/g, 'False') : text
}
export const callText = (hunt, language) => `solve(${hunt.symptom.args.map(a => show(a, language)).join(', ')})`

// Fills {call}, {got} and {want} in a hunt's text.
export const fill = (hunt, text, language) => text
  .replaceAll('{call}', callText(hunt, language))
  .replaceAll('{got}', show(hunt.symptom.buggy, language))
  .replaceAll('{want}', show(hunt.symptom.expected, language))
