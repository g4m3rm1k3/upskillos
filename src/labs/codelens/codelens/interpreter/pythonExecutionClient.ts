// Runs a Python program through the CodeLens tracer (python/codelens_tracer.py) and returns
// a CodeLens ExecutionResult. Two hosts, one tracer:
//   - desktop app: the learner's own CPython (full speed, the whole standard library);
//   - browser: Pyodide in a Web Worker (pythonExecution.worker.ts), reused between runs
//     and replaced when a run is stopped or overruns.
import type { ExecutionResult } from '../types'
import { annotateOutcomes } from '../traceOutcomes'
import TRACER_SOURCE from './python/codelens_tracer.py?raw'
import PYGAME_SOURCE from './python/codelens_pygame.py?raw'
import type { ScriptedInput } from '../scriptedInput'
import { codelensPythonStatus, runInCodeLensPython } from './codelensPythonEnv'

export const PYTHON_TRACE_LIMITS = Object.freeze({
  maxRuntimeMs: 5_000,
  maxSteps: 20_000,
  maxEvents: 20_000,
  maxOutputLines: 500,
  maxOutputChars: 100_000,
  maxRecursionDepth: 200,
  maxHeapObjects: 400,
  maxSnapshotItems: 60,
  maxSnapshotChars: 200,
})

// Loading Pyodide takes a few seconds the first time; the run itself is bounded by the
// tracer's own maxRuntimeMs, so this only catches a worker that has stopped responding.
const WORKER_STARTUP_TIMEOUT_MS = 60_000
const WORKER_RUN_GRACE_MS = 3_000
const RESULT_MARKER = '__CODELENS_RESULT__'

export interface PythonExecutionHandle {
  promise: Promise<ExecutionResult>
  stop: () => void
  /** Where the program ran, for the interface: "your Python 3.13.14" or "Python in the browser". */
  host: Promise<string>
}

let worker: Worker | null = null

function getWorker(): Worker {
  if (!worker) worker = new Worker(new URL('./pythonExecution.worker.ts', import.meta.url), { type: 'module' })
  return worker
}

function discardWorker() {
  worker?.terminate()
  worker = null
}

function failed(type: string, message: string): ExecutionResult {
  return { events: [], output: [], status: 'runtime-error', error: { type, message } }
}

// ── Desktop: the learner's own CPython ───────────────────────────────────────

async function desktopPython(): Promise<{ run: (lang: string, code: string) => Promise<any>; label: string } | null> {
  try {
    const { localToolchain, runOnDesktop } = await import('../../../../utils/desktopCodeRunner.js')
    const toolchain = await localToolchain('python')
    return toolchain ? { run: runOnDesktop, label: toolchain.label } : null
  } catch {
    return null
  }
}

/** What the tracer receives from the Input box: lines of standard input and game events. */
export type PythonInputs = Pick<ScriptedInput, 'stdin' | 'events'>

const NO_INPUT: PythonInputs = { stdin: [], events: [] }

// The pygame stand-in as an importable module (codelens_pygame), the tracer's source, then
// a call that prints the result as one marked line. The learner's program, the stand-in and
// the input are embedded as JSON strings, which are also valid Python string literals, so
// no quoting can break out of them.
export function desktopScript(source: string, inputs: PythonInputs = NO_INPUT): string {
  return `import sys as _codelens_sys, types as _codelens_types
_codelens_pygame = _codelens_types.ModuleType('codelens_pygame')
exec(compile(${JSON.stringify(PYGAME_SOURCE)}, 'codelens_pygame.py', 'exec'), _codelens_pygame.__dict__)
_codelens_sys.modules['codelens_pygame'] = _codelens_pygame

${TRACER_SOURCE}

_codelens_inputs = json.loads(${JSON.stringify(JSON.stringify({ stdin: inputs.stdin, events: inputs.events }))})
_codelens_sys.stdout.write(${JSON.stringify(RESULT_MARKER)} + run_to_json(${JSON.stringify(source)}, ${JSON.stringify(PYTHON_TRACE_LIMITS)}, _codelens_inputs) + "\\n")
`
}

export function parseDesktopResult(stdout: string): ExecutionResult | null {
  const line = stdout.split('\n').find(l => l.startsWith(RESULT_MARKER))
  if (!line) return null
  try {
    const result: ExecutionResult = JSON.parse(line.slice(RESULT_MARKER.length))
    annotateOutcomes(result.events)
    return result
  } catch {
    return null
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────

/** onProgress: what the desktop environment is doing first, e.g. "Installing pygame-ce…". */
export function startPythonExecution(source: string, inputs: PythonInputs = NO_INPUT, onProgress?: (line: string) => void): PythonExecutionHandle {
  let settled = false
  let stopDesktop: () => void = () => {}
  let resolvePromise: (result: ExecutionResult) => void = () => {}
  let resolveHost: (host: string) => void = () => {}
  let timer: ReturnType<typeof setTimeout> | undefined
  const promise = new Promise<ExecutionResult>(resolve => { resolvePromise = resolve })
  const host = new Promise<string>(resolve => { resolveHost = resolve })

  const finish = (result: ExecutionResult) => {
    if (settled) return
    settled = true
    if (timer) clearTimeout(timer)
    resolvePromise(result)
  }

  ;(async () => {
    // Desktop: CodeLens's own environment first, which installs the packages the program
    // imports (codelensPythonEnv.ts), then the learner's Python as it is.
    const env = await codelensPythonStatus()
    if (settled) return
    if (env) {
      resolveHost(`CodeLens's Python environment${env.base ? ` (Python ${env.base.version})` : ''}, on this computer`)
      const handle = runInCodeLensPython({ action: 'trace', script: desktopScript(source, inputs), source }, onProgress)
      stopDesktop = handle.stop
      const run = await handle.promise
      const parsed = run ? parseDesktopResult(run.stdout) : null
      const notes = run?.notices.length ? `\n\n${run.notices.join('\n')}` : ''
      if (parsed) {
        if (parsed.error && notes && parsed.error.type === 'ModuleNotFoundError') parsed.error.message += notes
        finish(parsed)
      } else {
        finish(failed('PythonError', (run?.stderr?.trim() || 'Python did not return a trace.') + notes))
      }
      return
    }

    const desktop = await desktopPython()
    if (settled) return
    if (desktop) {
      resolveHost(desktop.label)
      const run = await desktop.run('python', desktopScript(source, inputs))
      const parsed = run ? parseDesktopResult(run.stdout) : null
      if (parsed) finish(parsed)
      else finish(failed('PythonError', run?.stderr?.trim() || 'Python did not return a trace.'))
      return
    }

    resolveHost('Python in the browser (Pyodide)')
    const active = getWorker()
    timer = setTimeout(() => { discardWorker(); finish(failed('PythonStartupError', 'Python took too long to start. Check your connection and try again.')) }, WORKER_STARTUP_TIMEOUT_MS)
    active.onmessage = (message: MessageEvent<any>) => {
      if (message.data?.type === 'phase') {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          discardWorker()
          finish({ events: [], output: [], error: null, status: 'limit', limit: { kind: 'timeout', message: `Runtime limit (${PYTHON_TRACE_LIMITS.maxRuntimeMs} ms) reached` } })
        }, PYTHON_TRACE_LIMITS.maxRuntimeMs + WORKER_RUN_GRACE_MS)
      } else if (message.data?.type === 'result') {
        const result: ExecutionResult = message.data.result
        annotateOutcomes(result.events)
        finish(result)
      }
    }
    active.onerror = (event) => { discardWorker(); finish(failed('WorkerError', event.message || 'The Python worker failed')) }
    active.postMessage({ type: 'run', source, limits: PYTHON_TRACE_LIMITS, inputs: { stdin: inputs.stdin, events: inputs.events } })
  })().catch(error => finish(failed('PythonError', error instanceof Error ? error.message : String(error))))

  return {
    promise,
    host,
    stop: () => {
      // A browser run is ended by discarding its worker (the next run starts a fresh one);
      // a desktop run in CodeLens's environment may be installing packages, so it's stopped
      // too. A run on the learner's own Python is bounded by the tracer's runtime limit.
      discardWorker()
      stopDesktop()
      finish({ events: [], output: [], error: null, status: 'stopped' })
    },
  }
}
