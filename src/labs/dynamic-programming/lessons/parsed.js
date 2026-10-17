import foundationsRaw from './foundations.js'
import coreRaw from './core.js'
import structuredRaw from './structured.js'
import advancedRaw from './advanced.js'

export function parseLessonRows(rawString) {
  if (!rawString) return []
  const lines = rawString
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('//') && l.includes('|'))

  return lines.map(line => {
    const parts = line.split('|').map(p => p.trim())
    const id = parts[0]
    const intuition = parts[1] || ''
    const stateAndProc = parts[2] || ''
    const stepsRaw = (parts[3] || '').split('~').map(s => s.trim()).filter(Boolean)
    const question = parts[4] || ''
    const answer = parts[5] || ''
    const reasoning = parts[6] || ''
    const hint = parts[7] || ''
    const complexity = parts[8] || ''

    const procedureSteps = stateAndProc
      .split(/(?<=\.)\s+/)
      .map(s => s.trim())
      .filter(Boolean)

    const exampleSteps = stepsRaw.map((stepText, idx) => [
      `Step ${idx + 1}`,
      stepText,
      'Evaluate state transition and compute next table value.',
    ])

    return {
      id,
      objective: intuition,
      prerequisites: [],
      sections: [
        ['Core intuition', intuition],
        ['State & recurrence relation', stateAndProc],
        ['Why it works', reasoning],
        ['Time & space complexity', complexity],
      ],
      procedure: procedureSteps.length ? procedureSteps : [stateAndProc],
      example: {
        title: `Worked trace: ${id.replace(/-/g, ' ')}`,
        steps: exampleSteps.length
          ? exampleSteps
          : [['Evaluation', stateAndProc, 'Follow the recurrence from base cases forward.']],
      },
      proof: reasoning,
      complexity,
      pitfall: hint,
      quiz: question
        ? {
            question,
            answer,
            reasoning,
            hint,
          }
        : null,
    }
  })
}

export const PARSED_LESSONS = {
  ...Object.fromEntries(parseLessonRows(foundationsRaw).map(l => [l.id, l])),
  ...Object.fromEntries(parseLessonRows(coreRaw).map(l => [l.id, l])),
  ...Object.fromEntries(parseLessonRows(structuredRaw).map(l => [l.id, l])),
  ...Object.fromEntries(parseLessonRows(advancedRaw).map(l => [l.id, l])),
}
