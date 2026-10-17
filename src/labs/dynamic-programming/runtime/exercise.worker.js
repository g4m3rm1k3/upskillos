import { runJavaScriptCases, runJavaScriptScratch, runPythonCases, runPythonScratch } from './checks.js'
import { createPyodide } from '../../../utils/pyodideRuntime.js'

self.onmessage = async ({ data }) => {
  try {
    let py
    if (data.language === 'Python') {
      self.postMessage({ type: 'loading', message: 'Loading Python for this attempt…' })
      py = await createPyodide()
    }
    self.postMessage({ type: 'running' })
    const result = data.mode === 'run'
      ? (py ? await runPythonScratch(py, data.code, data.args) : runJavaScriptScratch(data.code, data.args))
      : (py ? await runPythonCases(py, data.code, data.cases) : runJavaScriptCases(data.code, data.cases))
    self.postMessage({ type: 'done', ...result })
  } catch (error) { self.postMessage({ type: 'done', passed: false, rows: [], error: String(error.message || error) }) }
}
