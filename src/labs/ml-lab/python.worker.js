// Dedicated worker: a runaway exercise can be terminated without freezing the app.
let runtime
self.onmessage = async ({ data }) => {
  try {
    self.postMessage({ type: 'status', text: 'Loading Python and NumPy… First run needs an internet connection.' })
    if (!runtime) {
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js')
      runtime = await self.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' })
      await runtime.loadPackage('numpy')
    }
    self.postMessage({ type: 'status', text: 'Running Python…' })
    runtime.setStdout({ batched: text => self.postMessage({ type: 'output', text }) })
    runtime.setStderr({ batched: text => self.postMessage({ type: 'output', text }) })
    const scope = runtime.toPy({})
    try {
      await runtime.runPythonAsync(data.code, { globals: scope })
      if (data.checks) await runtime.runPythonAsync(data.checks, { globals: scope })
    } finally { scope.destroy() }
    self.postMessage({ type: 'done', checked: Boolean(data.checks) })
  } catch (error) { self.postMessage({ type: 'error', text: String(error.message || error) }) }
}
