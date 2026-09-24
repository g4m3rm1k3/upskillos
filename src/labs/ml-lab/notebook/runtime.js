// The page side of the lesson-notebook runtime: one worker shared by every lesson notebook,
// runs executed one at a time in submission order, and a Stop that always works because it
// terminates the worker. `generation` increases on every stop, so a notebook can tell whether
// the variables from its earlier runs still exist.
let createWorker = () => new Worker(new URL('./notebook.worker.js', import.meta.url))
export function setWorkerFactory(factory) { createWorker = factory }   // tests use a fake worker

let worker = null, generation = 0, jobCounter = 0, current = null
const queue = [], listeners = new Set()
let status = { state: 'idle', text: 'Python starts the first time you run a cell.' }

const snapshot = () => ({ ...status, generation, busy: Boolean(current), running: current?.ns ?? null, queued: queue.length })
const emit = () => { const s = snapshot(); listeners.forEach(fn => fn(s)) }
export function subscribe(fn) { listeners.add(fn); fn(snapshot()); return () => listeners.delete(fn) }
export const getGeneration = () => generation

function finish(result) {
  const job = current
  current = null
  job?.resolve({ ...result, generation })
  startNext()
  emit()
}

function onMessage({ data }) {
  if (data.type === 'status') { status = { state: data.state, text: data.text }; emit(); return }
  if (!current || data.job !== current.job) return
  if (data.type === 'stream') current.onStream?.(data.name, data.text)
  if (data.type === 'done') { status = { state: 'ready', text: 'Python ready.' }; finish(data) }
}

function ensureWorker() {
  if (worker) return
  worker = createWorker()
  worker.onmessage = onMessage
  worker.onerror = event => {
    // The worker script itself failed (for example, no network for the first download).
    worker?.terminate(); worker = null
    status = { state: 'error', text: 'Python could not start. Check your connection, then run the cell again.' }
    finish({ ok: false, runtimeError: true, ename: 'RuntimeError', evalue: event?.message || 'Python could not start.', traceback: event?.message || '' })
  }
}

function startNext() {
  if (current || !queue.length) return
  current = queue.shift()
  ensureWorker()
  worker.postMessage({ type: 'run', job: current.job, ns: current.ns, code: current.code })
}

// Resolves with { ok, value?, ename?, evalue?, traceback?, figures?, stopped?, generation }.
export function run(ns, code, { onStream } = {}) {
  return new Promise(resolve => {
    queue.push({ job: ++jobCounter, ns, code, onStream, resolve })
    startNext()
    emit()
  })
}

// Terminates Python: the running cell and everything queued are cancelled, and every
// notebook's variables are gone. Code and drafts live on the page and are not affected.
export function stop() {
  worker?.terminate(); worker = null
  generation++
  const cancelled = [current, ...queue].filter(Boolean)
  current = null; queue.length = 0
  status = { state: 'stopped', text: 'Python was stopped and will restart on the next run. Variables from earlier runs are gone in every notebook; your code is kept.' }
  cancelled.forEach(job => job.resolve({ ok: false, stopped: true, generation }))
  emit()
}

// Forget one notebook's variables without affecting other notebooks.
export function resetNamespace(ns) { worker?.postMessage({ type: 'reset', ns }) }
