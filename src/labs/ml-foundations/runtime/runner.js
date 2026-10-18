// Runs the learner's Python in a worker. The worker (and the Python inside it) is kept between
// attempts, so the second Run is fast; it is thrown away on Stop, on a timeout or on a crash,
// so an endless loop can never hang the page. Loading Python has its own long budget; the
// learner's code gets 5 seconds.
let shared = null

function worker() {
  if (!shared) {
    shared = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
  }
  return shared
}

function discard() {
  shared?.terminate()
  shared = null
}

export function startAttempt({ mode = 'check', prelude, code, cases, call, onStatus, onDone }) {
  let timer, finished = false, w
  const finish = (result, kill = false) => {
    if (finished) return
    finished = true; clearTimeout(timer)
    if (w) { w.onmessage = null; w.onerror = null }
    if (kill) discard()
    onDone(result)
  }
  const deadline = (ms, message) => { clearTimeout(timer); timer = setTimeout(() => finish({ passed: false, rows: [], error: message }, true), ms) }
  try {
    w = worker()
    deadline(90000, 'Python could not start in time. Try again.')
    w.onmessage = ({ data }) => {
      if (finished) return
      if (data.type === 'loading') onStatus?.(data.message)
      if (data.type === 'running') { onStatus?.(mode === 'run' ? 'Running your code…' : 'Running the checks…'); deadline(5000, 'Stopped after 5 seconds. Look for a loop that never ends (a while whose condition never becomes false).') }
      if (data.type === 'done') finish(data)
    }
    w.onerror = event => { event.preventDefault?.(); finish({ passed: false, rows: [], error: 'The Python worker stopped unexpectedly. Try again.' }, true) }
    w.postMessage({ mode, prelude, code, cases, call })
  } catch (error) { finish({ passed: false, rows: [], error: `Could not start: ${error.message || error}` }, true) }
  return () => finish({ passed: false, rows: [], error: 'Stopped. Your code is unchanged.', stopped: true }, true)
}
