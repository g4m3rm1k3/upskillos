import type {
  ExecutionLimitKind,
  ExecutionResult,
  ExecutionStatus,
  RuntimeError,
  TraceEvent,
} from '../types'
import { JAVASCRIPT_EXECUTION_LIMITS } from './executionLimits'
import { jsStatementInfo, statementKey } from '../jsStatements'
import { annotateOutcomes, innermostFrame } from '../traceOutcomes'

// Tags each statement event with what kind of statement its line is and works out what
// each line did, for the line-by-line explanations (explainTrace.ts). `explainLanguage`
// marks them for that explainer; the interpreter's other events keep their own
// JavaScript-specific explanations.
export function annotateJavaScriptTrace(events: TraceEvent[], source: string, language: 'js' | 'ts'): TraceEvent[] {
  const statements = jsStatementInfo(source)
  for (const event of events) {
    if (event.type !== 'statement_enter' && event.type !== 'statement_exit') continue
    const statement = statements.get(statementKey(event.sourceLocation?.line ?? -1, event.nodeType))
    if (!statement) continue
    event.statement = statement
    event.explainLanguage = language === 'ts' ? 'typescript' : 'javascript'
    event.line ??= event.sourceLocation?.line
  }
  const passes = markLoopPasses(events)
  annotateOutcomes(events, { returnAfterPop: true })
  // A for...of pass binds its variable before the body's `{` is entered, so the binding
  // isn't a change across the pass; read it from the pass's own variables instead.
  for (const pass of passes) {
    if (pass.statement?.kind !== 'For' || !pass.outcome) continue
    const locals = (innermostFrame(pass)?.locals ?? {}) as Record<string, unknown>
    const bound = (pass.statement.targets ?? []).filter((name: string) => name in locals)
      .map((name: string) => ({ name, newValue: locals[name], isNew: true }))
    pass.outcome.changes = [...bound, ...(pass.outcome.changes ?? []).filter((c: { name: string }) => !bound.some((b: { name: string }) => b.name === c.name))]
  }
  return events
}

const LOOP_KINDS = new Set(['For', 'CFor', 'While'])

// The interpreter enters a loop statement once, then enters its body's `{` once per pass.
// Each body entry becomes a pass of the loop (the loop's statement, so it explains the
// check or the next item, as the Python and C/C++ tracers do on every visit to the loop
// line), and the loop's own entry becomes its start.
function markLoopPasses(events: TraceEvent[]): TraceEvent[] {
  const passes: TraceEvent[] = []
  events.forEach((event, index) => {
    if (event.type !== 'statement_enter' || event.loopPass || !LOOP_KINDS.has(event.statement?.kind)) return
    const depth = event.stackSnapshot?.length ?? 0
    const loopNode = event.sourceLocation?.astNodeId
    let bodyNode: unknown
    for (const later of events.slice(index + 1)) {
      const laterDepth = later.stackSnapshot?.length ?? 0
      if (laterDepth < depth) break
      if (laterDepth > depth) continue
      if (later.type === 'statement_exit' && later.sourceLocation?.astNodeId === loopNode) break
      if (later.type !== 'statement_enter') continue
      bodyNode ??= later.nodeType === 'BlockStatement' ? later.sourceLocation?.astNodeId : null
      if (bodyNode == null) break   // a body without braces: nothing marks its passes
      if (later.sourceLocation?.astNodeId !== bodyNode) continue
      later.statement = event.statement
      later.explainLanguage = event.explainLanguage
      later.line = event.line
      later.loopPass = true
      passes.push(later)
    }
    if (passes.length && passes.at(-1)?.statement === event.statement) event.loopStart = true
  })
  return passes
}

const WORKER_TIMEOUT_GRACE_MS = 500
const WORKER_STARTUP_TIMEOUT_MS = 15_000

interface PhaseMessage {
  type: 'phase'
  phase: 'executing'
}

interface ProgressMessage {
  type: 'progress'
  events: TraceEvent[]
  output: string[]
}

interface ResultMessage {
  type: 'result'
  result: ExecutionResult
}

type WorkerMessage = PhaseMessage | ProgressMessage | ResultMessage

export interface JavaScriptExecutionHandle {
  promise: Promise<ExecutionResult>
  stop: () => void
}

function statusFor(error: RuntimeError | null): ExecutionStatus {
  if (!error) return 'completed'
  if (error.type === 'ExecutionLimitError' || error.limitKind) return 'limit'
  if (error.type === 'UnsupportedFeatureError' || error.type === 'UnsupportedEnvironmentError') return 'unsupported'
  return error.line != null || error.type === 'SyntaxError' ? 'syntax-error' : 'runtime-error'
}

function stoppedResult(events: TraceEvent[], output: string[]): ExecutionResult {
  return {
    events,
    output,
    error: null,
    status: 'stopped',
  }
}

function timeoutResult(
  events: TraceEvent[],
  output: string[],
  message = `Runtime limit (${JAVASCRIPT_EXECUTION_LIMITS.maxRuntimeMs} ms) reached`,
): ExecutionResult {
  return {
    events,
    output,
    error: null,
    status: 'limit',
    limit: {
      kind: 'timeout',
      message,
    },
  }
}

export function startJavaScriptExecution(
  source: string,
  language: 'js' | 'ts' = 'js',
  /** prompt() answers, from the Input box (scriptedInput.ts). */
  stdin: string[] = [],
): JavaScriptExecutionHandle {
  const worker = new Worker(new URL('./jsExecution.worker.ts', import.meta.url), { type: 'module' })
  const events: TraceEvent[] = []
  const output: string[] = []
  let settled = false
  let resolvePromise: (result: ExecutionResult) => void = () => {}

  const finish = (result: ExecutionResult) => {
    if (settled) return
    settled = true
    window.clearTimeout(timeoutId)
    worker.terminate()
    resolvePromise(result)
  }

  let timeoutId = window.setTimeout(() => {
    finish(timeoutResult(events, output, 'The execution worker took too long to start'))
  }, WORKER_STARTUP_TIMEOUT_MS)

  const promise = new Promise<ExecutionResult>((resolve) => {
    resolvePromise = resolve
  })

  worker.onmessage = (message: MessageEvent<WorkerMessage>) => {
    if (settled) return
    if (message.data.type === 'phase') {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        finish(timeoutResult(events, output))
      }, JAVASCRIPT_EXECUTION_LIMITS.maxRuntimeMs + WORKER_TIMEOUT_GRACE_MS)
      return
    }
    if (message.data.type === 'progress') {
      events.push(...message.data.events)
      output.push(...message.data.output)
      return
    }

    annotateJavaScriptTrace(events, source, language)
    const error = message.data.result.error
    const status = statusFor(error)
    const limitKind = error?.limitKind as ExecutionLimitKind | undefined
    finish({
      ...message.data.result,
      events,
      output,
      status,
      ...(status === 'limit' ? {
        limit: {
          kind: limitKind ?? 'steps',
          message: error?.message ?? 'Execution limit reached',
        },
      } : {}),
    })
  }

  worker.onerror = (event) => {
    finish({
      events,
      output,
      status: 'runtime-error',
      error: { type: 'WorkerError', message: event.message || 'The execution worker failed' },
    })
  }

  worker.postMessage({
    type: 'run',
    source,
    language,
    limits: JAVASCRIPT_EXECUTION_LIMITS,
    stdin,
  })

  return {
    promise,
    stop: () => finish(stoppedResult(events, output)),
  }
}

export function withExecutionStatus(result: ExecutionResult): ExecutionResult {
  if (result.status) return result
  return { ...result, status: statusFor(result.error) }
}
