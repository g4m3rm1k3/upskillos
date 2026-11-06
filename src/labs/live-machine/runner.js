// runner.js
// The page's side of runner.worker.js. load() installs code; call() asks for answers. A call
// that takes too long (an infinite loop, usually) kills the worker and starts a fresh one,
// so the ship keeps running on nothing until the code is fixed.
const TIMEOUT_MS = 400

export function createRunner({ onLogs } = {}) {
  let worker = null
  let ready = null // resolves once the worker has booted; the timeout clock starts after that
  let seq = 0
  const pending = new Map()

  function start() {
    worker = new Worker(new URL('./runner.worker.js', import.meta.url), { type: 'module' })
    let booted
    ready = new Promise(resolve => { booted = resolve })
    worker.onmessage = e => {
      if (e.data?.type === 'ready') { booted(); return }
      const p = pending.get(e.data.id)
      if (!p) return
      pending.delete(e.data.id)
      clearTimeout(p.timer)
      if (e.data.logs?.length) onLogs?.(e.data.logs)
      p.resolve(e.data)
    }
  }

  async function send(msg) {
    if (!worker) start()
    await ready
    const id = ++seq
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        pending.delete(id)
        worker.terminate()
        worker = null
        for (const p of pending.values()) { clearTimeout(p.timer); p.resolve({ ok: false, error: 'stopped' }) }
        pending.clear()
        resolve({ ok: false, timeout: true, error: `Your code took longer than ${TIMEOUT_MS} ms and was stopped. Is there a loop that never ends?` })
      }, TIMEOUT_MS)
      pending.set(id, { resolve, timer })
      worker.postMessage({ ...msg, id })
    })
  }

  return {
    load: (code, entry) => send({ type: 'load', code, entry }),
    // Resolves to one { ok, value } | { ok: false, error } per args array.
    async call(argsList) {
      const r = await send({ type: 'call', argsList })
      if (!r.ok) return argsList.map(() => ({ ok: false, error: r.error, timeout: r.timeout }))
      return r.results
    },
    dispose() { worker?.terminate(); worker = null },
  }
}
