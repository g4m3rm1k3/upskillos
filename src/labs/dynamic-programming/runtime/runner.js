// Separate startup and execution budgets: loading Python is not learner code.
// Terminate on every completion, cancellation, timeout, or worker error.
// mode 'check' runs the cases; mode 'run' just runs the code (and solve(...args) once), for print debugging.
export function startAttempt({ language, code, cases, mode = 'check', args, onStatus, onDone }) {
  let worker, timer, finished = false
  const finish = result => {
    if (finished) return
    finished = true; clearTimeout(timer); worker?.terminate(); onDone(result)
  }
  const deadline = (ms, message) => { clearTimeout(timer); timer = setTimeout(() => finish({ passed: false, rows: [], error: message }), ms) }
  try {
    worker = new Worker(new URL('./exercise.worker.js', import.meta.url), { type: 'module' })
    deadline(90000, 'The runtime could not start in time. Try again when it is available.')
    worker.onmessage = ({ data }) => {
      if (finished) return
      if (data.type === 'loading') onStatus(data.message)
      if (data.type === 'running') { onStatus(mode === 'run' ? 'Running your code…' : 'Running checks…'); deadline(5000, 'Stopped after 5 seconds of execution. Check for an endless loop or repeated work.') }
      if (data.type === 'done') finish(data)
    }
    worker.onerror = event => { event.preventDefault?.(); finish({ passed: false, rows: [], error: 'The code worker failed to start or stopped unexpectedly. Try again.' }) }
    worker.postMessage({ language, code, cases, mode, args })
  } catch (error) { finish({ passed: false, rows: [], error: `Could not start: ${error.message || error}` }) }
  return () => { finished = true; clearTimeout(timer); worker?.terminate() }
}
