/// <reference lib="webworker" />

import { run } from '../../../../engines/js/interpreter/interpreter.js'
import type { CompilerDiagnostic, ExecutionLimits, ExecutionResult, TraceEvent } from '../types'
import { compileTypeScript, remapTraceEvent } from './typescriptCompiler'

interface RunRequest {
  type: 'run'
  source: string
  language: 'js' | 'ts'
  limits: ExecutionLimits
  stdin?: string[]
}

const EVENT_BATCH_SIZE = 100
const OUTPUT_BATCH_SIZE = 25

self.onmessage = (event: MessageEvent<RunRequest>) => {
  if (event.data?.type !== 'run') return

  const events: TraceEvent[] = []
  const output: string[] = []
  let code = event.data.source
  let diagnostics: CompilerDiagnostic[] = []
  let remap = (traceEvent: TraceEvent) => traceEvent

  if (event.data.language === 'ts') {
    const compilation = compileTypeScript(event.data.source)
    code = compilation.code
    diagnostics = compilation.diagnostics
    remap = traceEvent => remapTraceEvent(traceEvent, compilation.mapPosition)

    const firstError = diagnostics.find(diagnostic => diagnostic.category === 'error')
    if (firstError) {
      self.postMessage({
        type: 'result',
        result: {
          events: [],
          output: [],
          diagnostics,
          error: {
            type: 'TypeScriptError',
            message: firstError.message,
            line: firstError.line,
          },
        },
      })
      return
    }
  }

  self.postMessage({ type: 'phase', phase: 'executing' })

  const flush = () => {
    if (events.length === 0 && output.length === 0) return
    self.postMessage({ type: 'progress', events: events.splice(0), output: output.splice(0) })
  }

  // What console.log printed is attached to the next event, the way the Python tracer
  // does it, so each line's explanation can say what it printed (traceOutcomes.ts).
  let pendingPrinted = ''
  const raw = run(code, {
    limits: event.data.limits,
    stdin: event.data.stdin ?? [],
    onEvent: (traceEvent: TraceEvent) => {
      const mapped = remap(traceEvent)
      if (pendingPrinted) {
        mapped.printed = pendingPrinted
        pendingPrinted = ''
      }
      events.push(mapped)
      if (events.length >= EVENT_BATCH_SIZE) flush()
    },
    onOutput: (line: string) => {
      pendingPrinted += line + '\n'
      output.push(line)
      if (output.length >= OUTPUT_BATCH_SIZE) flush()
    },
  }) as ExecutionResult

  flush()
  self.postMessage({
    type: 'result',
    result: {
      ...raw,
      diagnostics,
      ...(raw.error?.line && event.data.language === 'ts'
        ? { error: { ...raw.error, line: remap({
          stepId: 0,
          type: 'error',
          sourceLocation: { line: raw.error.line, column: 0 },
        }).sourceLocation?.line ?? raw.error.line } }
        : {}),
      // Progress messages already transferred these potentially large arrays.
      events: [],
      output: [],
    },
  })
}

export {}
