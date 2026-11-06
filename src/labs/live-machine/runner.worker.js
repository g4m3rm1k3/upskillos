// runner.worker.js
// Holds the learner's compiled code and calls its entry function on request. Living in a
// worker means an infinite loop can't freeze the page: the client just terminates us.
let fn = null
let logs = []

const fmt = v => {
  if (typeof v === 'string') return v
  try { return JSON.stringify(v) } catch { return String(v) }
}
const sandboxConsole = {
  log: (...a) => { if (logs.length < 50) logs.push(a.map(fmt).join(' ')) },
}
sandboxConsole.info = sandboxConsole.log
sandboxConsole.warn = sandboxConsole.log
sandboxConsole.error = sandboxConsole.log

self.onmessage = event => {
  const { type, id } = event.data
  logs = []
  if (type === 'load') {
    const { code, entry } = event.data
    try {
      // eslint-disable-next-line no-new-func
      const factory = new Function('console', `"use strict";\n${code}\nreturn typeof ${entry} === 'function' ? ${entry} : null;`)
      const found = factory(sandboxConsole)
      if (!found) { self.postMessage({ id, ok: false, error: `There is no function named ${entry}. The ship calls ${entry}(...), so keep that name.`, logs }); return }
      fn = found
      self.postMessage({ id, ok: true, logs })
    } catch (e) {
      self.postMessage({ id, ok: false, error: e.message, logs })
    }
    return
  }
  if (type === 'call') {
    if (!fn) { self.postMessage({ id, ok: false, error: 'No code loaded yet.', logs }); return }
    const results = event.data.argsList.map(args => {
      try { return { ok: true, value: fn(...args) } } catch (e) { return { ok: false, error: e.message } }
    })
    let safe
    try { safe = structuredClone(results) } catch { safe = results.map(r => (r.ok ? { ok: true, value: String(r.value) } : r)) }
    self.postMessage({ id, ok: true, results: safe, logs })
  }
}

self.postMessage({ type: 'ready' })
