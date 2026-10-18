import { runPythonCases, runPythonScratch } from './checks.js'
import { createPyodide } from '../../../utils/pyodideRuntime.js'

let ready = null
self.onmessage = async ({ data }) => {
  try {
    if (!ready) { self.postMessage({ type: 'loading', message: 'Loading Python…' }); ready = createPyodide() }
    const py = await ready
    self.postMessage({ type: 'running' })
    const result = data.mode === 'run' ? await runPythonScratch(py, data) : await runPythonCases(py, data)
    self.postMessage({ type: 'done', ...result })
  } catch (error) { self.postMessage({ type: 'done', passed: false, rows: [], error: String(error.message || error) }) }
}
