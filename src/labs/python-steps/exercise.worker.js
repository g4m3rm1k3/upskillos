// Runs one exercise attempt in Pyodide: the learner's code, then the checks, in a fresh namespace.
// A dedicated worker, so the page can terminate a runaway loop without freezing.
import { createPyodide } from '../../utils/pyodideRuntime.js'

let runtime
self.onmessage = async ({ data }) => {
  try {
    if (!runtime) { self.postMessage({ type: 'status', text: 'Starting Python…' }); runtime = await createPyodide() }
    if (data.packages?.length) await runtime.loadPackage(data.packages)
    let output = ''
    runtime.setStdout({ batched: text => { output += text + '\n' } })
    runtime.setStderr({ batched: text => { output += text + '\n' } })
    const scope = runtime.toPy({})
    let stage = 'code'
    try {
      await runtime.runPythonAsync(data.code, { globals: scope })
      stage = 'checks'
      if (data.checks) await runtime.runPythonAsync(data.checks, { globals: scope })
      self.postMessage({ type: 'done', output, passed: true })
    } catch (error) {
      self.postMessage({ type: 'done', output, passed: false, stage, error: friendly(String(error.message || error)) })
    } finally { scope.destroy() }
  } catch (error) { self.postMessage({ type: 'error', text: String(error.message || error) }) }
}

// Keep the last, useful part of a Python traceback: the line with the error type and message. A failed
// check's assert already says what was called, what came back and what was expected, so it stands alone.
function friendly(message) {
  const assertion = message.trim().split('\n').findLast(l => l.startsWith('AssertionError'))
  if (assertion) return assertion.replace(/^AssertionError:?\s*/, '') || 'A check failed.'
  const lines = message.trim().split('\n').filter(l => !l.includes('/lib/python') && !l.includes('_pyodide'))
  const last = lines.findLastIndex(l => /^\w*(Error|Exception)\b/.test(l))
  return last >= 0 ? lines.slice(Math.max(0, last - 2)).join('\n') : lines.slice(-4).join('\n')
}
