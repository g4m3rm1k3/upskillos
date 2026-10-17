import { executeScript } from '../../engines/openmat/openmatEngine.js'
import { gradeWorkspace } from './grading.js'

const finite = value => Array.isArray(value) ? value.length > 0 && value.every(finite) : typeof value === 'number' && Number.isFinite(value)
const absolute = value => Array.isArray(value) ? value.map(absolute) : Math.abs(value)

function referenceChecks(reference, outputs) {
  return outputs.map(output => {
    let expected = reference.workspace.find(entry => entry.name === output.name)?.value
    if (!finite(expected)) throw new Error(`This exercise has an invalid reference output: ${output.name}.`)
    if (output.kind === 'abs') expected = absolute(expected)
    return { ...output, expected }
  })
}

// Both paths run in separate engine instances. Reference workspaces never become
// learner inputs or visible output. Transfer runs execute the SAME learner code.
export function evaluateRun(data) {
  const result = executeScript(data.source)
  const checks = data.reference
    ? gradeWorkspace(result.workspace, referenceChecks(executeScript(`${data.setup}\n${data.reference}`), data.outputs))
    : data.checks ? gradeWorkspace(result.workspace, data.checks) : []
  for (const [i, variant] of (data.cases ?? []).entries()) {
    const label = `Unseen inputs ${i + 1}`
    const expected = variant.reference
      ? referenceChecks(executeScript(`${variant.setup}\n${variant.reference}`), variant.outputs)
      : variant.checks
    try {
      const trial = executeScript(`${variant.setup}\n${data.code}`)
      checks.push(...gradeWorkspace(trial.workspace, expected).map(check => ({ ...check, name: `${label}: ${check.name}` })))
    } catch (error) {
      checks.push({ name: label, pass: false, message: `Your code did not run on changed data. ${error.message}` })
    }
  }
  return { result, checks }
}
