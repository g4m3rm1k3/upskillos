// Works out what each line actually did, for the line-by-line explanations
// (explainTrace.ts explainStatement). Language-neutral: it only reads the trace events,
// so the Python tracer, the desktop C/C++ tracer and the JavaScript interpreter share it.
//
// A line about to run is a statement_enter event. Its outcome ends at the first later
// point where its own frame moves on:
//   - its statement_exit (the JavaScript interpreter marks where each statement ends);
//   - the frame's next statement_enter (another line, or the first line of a block);
//   - the frame ending (a return).
// Events in deeper frames on the way belong to functions the line called: their heap
// changes and printed text count as the line's, since a call can change a list or print.
// The variables the line changed are the event's `changes` when the tracer records them
// (Python, GDB), otherwise the difference between the frame's variables before and after.
import type { HeapDelta, StackFrame, TraceEvent } from './types'

export interface LineOutcome {
  changes?: VariableChange[]
  heap?: HeapDelta[]
  moreHeap?: number
  printed?: string
  /** Lines of standard input the line read (scriptedInput.ts). */
  inputRead?: string[]
  /** pygame events the line received (python/codelens_pygame.py). */
  gameEvents?: string[]
  /** The line's own sub-expressions in evaluation order, as [expression id, value]; the ids
   *  index ExecutionResult.expressions (Python: codelens_tracer.py _ExpressionRecorder). */
  expressions?: [number, unknown][]
  nextLine?: number
  returned?: boolean
  returnValue?: unknown
  calls?: string[]
}

export interface VariableChange { name: string; oldValue?: unknown; newValue: unknown; isNew: boolean }

export interface OutcomeOptions {
  /** The tracer emits function_return after popping the callee's frame, at the caller's
   *  depth (the JavaScript interpreter). Then a same-depth return is a call this line
   *  made returning, not this frame ending. */
  returnAfterPop?: boolean
  /** A loop's pass reports with its loop variable already holding the next item (the C#
   *  tracer reports a foreach pass inside the body). The binding then belongs to the pass,
   *  not to the line before it. */
  loopVariableBoundEarly?: boolean
}

const MAX_HEAP = 8
const MAX_CALLS = 5
// The JavaScript interpreter's marker for a `let`/`const` not yet initialised.
const UNINITIALISED = '<TDZ>'

// The JavaScript interpreter lists its global frame last, after the function frames
// (the Python and C/C++ tracers list the outermost frame first), so the innermost frame
// is the last one that isn't the JavaScript global frame.
export function innermostFrame(event: TraceEvent): StackFrame | undefined {
  const frames = event.stackSnapshot ?? []
  return frames.filter(frame => frame.name !== '__global__').at(-1) ?? frames.at(-1)
}

function topLocals(event: TraceEvent): Record<string, unknown> {
  return (innermostFrame(event)?.locals ?? {}) as Record<string, unknown>
}

/** Variables of the frame that are new or changed between two events of that frame. */
export function diffLocals(before: Record<string, unknown>, after: Record<string, unknown>): VariableChange[] {
  const out: VariableChange[] = []
  for (const [name, value] of Object.entries(after)) {
    const old = before[name]
    if (!(name in before) || old === UNINITIALISED) {
      if (value !== UNINITIALISED) out.push({ name, newValue: value, isNew: true })
    } else if (JSON.stringify(old) !== JSON.stringify(value)) {
      out.push({ name, oldValue: old, newValue: value, isNew: false })
    }
  }
  return out
}

export function annotateOutcomes(events: TraceEvent[], options: OutcomeOptions = {}): TraceEvent[] {
  const bound = new Map<TraceEvent, VariableChange[]>()
  if (options.loopVariableBoundEarly) {
    for (const event of events) {
      const targets = event.type === 'statement_enter' && event.statement?.kind === 'For' ? event.statement.targets as string[] : null
      if (!targets || !event.changes?.length) continue
      bound.set(event, event.changes.filter((c: VariableChange) => targets.includes(c.name)))
      event.changes = event.changes.filter((c: VariableChange) => !targets.includes(c.name))
    }
  }
  events.forEach((event, index) => {
    if (event.type !== 'statement_enter') return
    const depth = event.stackSnapshot?.length ?? 0
    const node = event.sourceLocation?.astNodeId
    const heap: HeapDelta[] = []
    const calls: string[] = []
    let printed = ''
    const inputRead: string[] = []
    const gameEvents: string[] = []
    const expressions: [number, unknown][] = []
    const outcome: LineOutcome = {}
    let ended = false   // the statement has finished; now only looking for the next line

    for (const later of events.slice(index + 1)) {
      const laterDepth = later.stackSnapshot?.length ?? 0
      if (!ended) {
        heap.push(...(later.heapDelta ?? []))
        printed += later.printed ?? ''
        inputRead.push(...(later.inputRead ?? []))
        gameEvents.push(...(later.gameEvents ?? []))
        // Recorded at this line's depth: its own; deeper ones belong to the lines of functions it called.
        for (const [id, at, value] of (later.expressions ?? []) as [number, number, unknown][]) {
          if (at === depth) expressions.push([id, value])
        }
        // Functions the line called directly (built-ins like console.log aren't frames).
        if (later.type === 'function_call' && !later.native && laterDepth === depth + 1 && calls.length < MAX_CALLS) {
          calls.push(later.functionName)
        }
      }

      const ownReturn = later.type === 'function_return' && !later.native &&
        (laterDepth < depth || (laterDepth === depth && !options.returnAfterPop))
      // Checked even after the statement's exit: JavaScript's `return x;` ends its statement
      // first, then the frame returns.
      if (ownReturn) {
        outcome.returned = true
        if ('returnValue' in later) outcome.returnValue = later.returnValue
        outcome.changes ??= []
        break
      }
      if (laterDepth > depth) continue
      // A JavaScript `{` is a statement of its own; the line that matters is the first one inside it.
      if (later.nodeType === 'BlockStatement' && !later.loopPass) continue
      // In C and C++, GDB stops on the function's closing brace between `return x;` and the
      // return itself; the returned value still belongs to the return line.
      if (event.statement?.kind === 'Return' && later.type === 'statement_enter' && later.statement?.kind === 'BlockEnd') {
        if (!ended) outcome.changes = later.changes ?? diffLocals(topLocals(event), topLocals(later))
        ended = true
        continue
      }

      if (!ended && later.type === 'statement_exit' && node != null && later.sourceLocation?.astNodeId === node) {
        // This statement is done; its effect is the difference across it.
        outcome.changes = later.changes ?? diffLocals(topLocals(event), topLocals(later))
        ended = true
        continue
      }
      if (later.type === 'statement_enter' || later.type === 'program_end' || later.type === 'error_thrown') {
        if (!ended) outcome.changes = later.changes ?? diffLocals(topLocals(event), topLocals(later))
        if (later.type !== 'error_thrown') outcome.nextLine = later.line ?? later.sourceLocation?.line
        break
      }
      if (laterDepth < depth) break   // the frame ended some other way
    }
    if (heap.length) {
      outcome.heap = heap.slice(0, MAX_HEAP)
      if (heap.length > MAX_HEAP) outcome.moreHeap = heap.length - MAX_HEAP
    }
    if (printed) outcome.printed = printed
    if (inputRead.length) outcome.inputRead = inputRead
    if (gameEvents.length) outcome.gameEvents = gameEvents
    if (expressions.length) outcome.expressions = expressions
    if (calls.length) outcome.calls = calls
    const binding = bound.get(event)
    if (binding?.length) outcome.changes = [...binding, ...(outcome.changes ?? []).filter(c => !binding.some(b => b.name === c.name))]
    event.outcome = outcome
  })
  return events
}
