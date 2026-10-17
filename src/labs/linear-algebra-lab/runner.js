// A fresh worker isolates every run. Termination also stops accidental long loops.
export function startRun(payload, { timeout = 12000, createWorker = () => new Worker(new URL('./engine.worker.js', import.meta.url), { type: 'module' }) } = {}) {
  const worker = createWorker()
  let finish
  let settled = false
  const promise = new Promise(resolve => { finish = resolve })
  const complete = value => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    worker.terminate()
    finish(value)
  }
  const timer = setTimeout(() => complete({ error: 'Run stopped after 12 seconds. Reduce the loop count or check its stopping condition.' }), timeout)
  worker.onmessage = event => complete(event.data)
  worker.onerror = event => complete({ error: event.message || 'OpenMAT could not start. Try running again.' })
  try { worker.postMessage(payload) } catch (error) { complete({ error: error.message || String(error) }) }
  return { promise, cancel: () => complete({ error: 'Run stopped. Your code is saved.' }) }
}
