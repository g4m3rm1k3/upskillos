import { executeScript } from '../../engines/openmat/openmatEngine.js'
import { gradeWorkspace } from './grading.js'

self.onmessage = ({ data }) => {
  try {
    const result = executeScript(data.source)
    const checks = data.checks ? gradeWorkspace(result.workspace, data.checks) : []
    // Each transfer case gets a fresh engine, with the SAME learner program.
    for (const [i, variant] of (data.cases ?? []).entries()) {
      const trial = executeScript(`${variant.setup}\n${data.code}`)
      checks.push(...gradeWorkspace(trial.workspace, variant.checks).map(check => ({
        ...check, name: `Transfer ${i + 1}: ${check.name}`,
      })))
    }
    self.postMessage({ result, checks })
  } catch (error) {
    self.postMessage({ error: error?.message || String(error) })
  }
}
