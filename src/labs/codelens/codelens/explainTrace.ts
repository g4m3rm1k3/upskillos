// Plain-English explanations for trace events from the language tracers that aren't the
// JavaScript interpreter: Python (interpreter/python/codelens_tracer.py) and the desktop
// native tracers. Those tracers tag each event with `language` and record what changed
// (`changes`: variables, `heapDelta`: objects), so one explainer serves them all; the
// JavaScript interpreter keeps its own, JavaScript-specific explanations
// (src/engines/js/eventStream.js EXPLAIN).
import type { HeapDelta, TraceEvent } from './types'

export interface Explanation { summary: string; why?: string; concept?: string }

interface Change { name: string; oldValue?: unknown; newValue: unknown; isNew: boolean }

const LANGUAGE_NAMES: Record<string, string> = { python: 'Python', c: 'C', cpp: 'C++', rust: 'Rust', javascript: 'JavaScript', typescript: 'TypeScript', csharp: 'C#' }

// How each language talks about a few things.
// Python marks a block by indentation and spells else-if `elif`; the brace languages don't.
const BRACES = { block: 'block', body: 'body', elif: '`else if`', def: 'function definition' }
const PYTHON_TERMS = { block: 'indented block', body: 'indented body', elif: '`elif`', def: '`def` line' }
const terms = (language: string) => language === 'python' ? PYTHON_TERMS : BRACES

const WORDING: Record<string, { none: string; frame: string }> = {
  python: { none: 'None', frame: 'Python creates a new frame for this call, holding its parameters and the variables it assigns; when the function returns, the frame is discarded.' },
  c: { none: 'NULL', frame: 'A new stack frame is pushed for this call, holding its parameters and local variables; it is popped when the function returns, and its locals stop existing.' },
  cpp: { none: 'nullptr', frame: 'A new stack frame is pushed for this call, holding its parameters and local variables; it is popped when the function returns, which also runs the destructors of its local objects.' },
  csharp: { none: 'null', frame: 'A new stack frame is pushed for this call, holding its parameters and local variables; it is popped when the method returns. Objects it created live on in the heap as long as something still refers to them.' },
  rust: { none: '()', frame: 'A new stack frame is pushed for this call; when it returns, values it owns are dropped.' },
  javascript: { none: 'null', frame: 'A new frame is pushed onto the call stack for this call, holding its parameters and local variables; when the function returns, the frame is popped.' },
  typescript: { none: 'null', frame: 'A new frame is pushed onto the call stack for this call, holding its parameters and local variables; when the function returns, the frame is popped.' },
}

export function format(value: unknown, language: string): string {
  if (value === null || value === undefined) return WORDING[language]?.none ?? 'nothing'
  if (typeof value === 'string') {
    // Tracers describe things that aren't data as "[Function: f]", "[Class: C]", like the
    // JavaScript interpreter; show those as they are, not as quoted strings.
    if (/^\[(Function|Class|Module): [^\]]*\]$/.test(value)) return value
    // The JavaScript interpreter shows an object in a variable as a preview: "[ 1, 2 ]".
    if ((language === 'javascript' || language === 'typescript') && /^[[{][\s\S]*[\]}]$/.test(value)) return value
    return JSON.stringify(value)
  }
  if (typeof value === 'object' && '$ref' in (value as object)) {
    // Tracers that can (Python) add what the object holds: (0, 1) (tuple #4). The number is
    // the one the Structures view shows; without a preview it is all there is.
    const ref = value as { $ref: number; preview?: string; objectType?: string }
    return ref.preview ? `${ref.preview} (${ref.objectType ?? 'object'} #${ref.$ref})` : `object #${ref.$ref}`
  }
  if (typeof value === 'boolean' && language === 'python') return value ? 'True' : 'False'
  return String(value)
}

function describeChange(change: Change, language: string): string {
  if (change.isNew) return `\`${change.name}\` is created: ${format(change.newValue, language)}`
  return `\`${change.name}\` changes from ${format(change.oldValue, language)} to ${format(change.newValue, language)}`
}

// Tracers put the object's type on every heap change, so each event explains itself.
function describeHeap(deltas: HeapDelta[], language: string): string[] {
  const out: string[] = []
  for (const delta of deltas) {
    if (delta.op === 'create') {
      out.push(`A new ${delta.objectType ?? 'object'} (#${delta.objectId}) is created`)
    } else if (delta.op === 'mutate') {
      const type = (delta as { objectType?: string }).objectType ?? 'object'
      const target = /^\d+$/.test(delta.property) ? `#${delta.objectId}[${delta.property}]` : `#${delta.objectId}.${delta.property}`
      // Tracers leave out oldValue for a property that didn't exist before.
      out.push('oldValue' in delta
        ? `${type} ${target} changes from ${format(delta.oldValue, language)} to ${format(delta.newValue, language)}`
        : `${type} ${target} is set to ${format(delta.newValue, language)}`)
    } else if (delta.op === 'delete') {
      out.push(`#${delta.objectId}: \`${delta.property}\` is removed`)
    } else if (delta.op === 'free') {
      out.push(`#${delta.objectId} is no longer reachable from any variable`)
    }
  }
  return out
}

// ── What a line does ─────────────────────────────────────────────────────────
// The Python tracer gives each line about to run its `statement` (the kind of statement,
// from the program's syntax tree) and its `outcome` (what running it actually did). The
// summary says what the line does, with real values; the explanation says why, then
// lists every effect.

interface Statement {
  kind: string; code: string
  body?: [number, number]; orelse?: [number, number]
  targets?: string[]; iterable?: string; condition?: string; operator?: string
  name?: string; call?: string; expression?: string; isElif?: boolean; update?: string; prints?: boolean
}
interface Outcome {
  changes?: Change[]; heap?: HeapDelta[]; moreHeap?: number; printed?: string; inputRead?: string[]; gameEvents?: string[]
  nextLine?: number; returned?: boolean; returnValue?: unknown; calls?: string[]
}

const within = (line: number | undefined, span?: [number, number]) =>
  line !== undefined && !!span && line >= span[0] && line <= span[1]

const OPERATOR_WORDS: Record<string, string> = {
  Add: 'adds the right-hand side to', Sub: 'subtracts the right-hand side from', Mult: 'multiplies',
  Div: 'divides', FloorDiv: 'floor-divides', Mod: 'takes the remainder of', Pow: 'raises', BitOr: 'combines into',
  Increment: 'adds 1 to', Decrement: 'subtracts 1 from',
}

// How an assignment works differs: a Python name refers to a value somewhere else; a C or
// C++ variable is its own piece of memory, and assigning copies the value into it.
function assignmentWhy(language: string, targets: string, plural: boolean): string {
  if (language === 'javascript' || language === 'typescript') {
    return `An assignment works right to left: the expression on the right is evaluated first, then the result is stored in ${targets}. If the result is an object or array, the variable holds a reference to it, not a copy, so another variable can point at the same object.`
  }
  if (language === 'csharp') {
    return `An assignment works right to left: the expression on the right is evaluated first, then the result is stored in ${targets}. For a value type (int, double, bool, a struct) the variable holds the value itself, so it gets its own copy; for a reference type (a class, an array, a List) it holds a reference, so two variables can point at the same object.`
  }
  if (language === 'python') {
    return `An assignment works right to left: Python first evaluates the expression on the right, then makes the name${plural ? 's' : ''} on the left (${targets}) refer to the result. A name refers to a value; it doesn't contain a copy of it.`
  }
  return `An assignment works right to left: the expression on the right is evaluated first, then the result is stored in ${targets}, which is ${plural ? "each variable's" : "the variable's"} own piece of memory. A variable declared on this line gets that memory here.`
}

// Names objects the line itself created ("a new list (#1)") rather than "object #1".
function namedValue(value: unknown, language: string, created: Map<number, string>): string {
  if (value && typeof value === 'object' && '$ref' in (value as object)) {
    const id = (value as { $ref: number }).$ref
    const type = created.get(id)
    const preview = (value as { preview?: string }).preview
    if (type) return `a new ${type} (#${id})${preview ? ` holding ${preview}` : ''}`
  }
  return format(value, language)
}

function changeSummary(changes: Change[], language: string, created = new Map<number, string>()): string {
  return changes.map(c => c.isNew
    ? `\`${c.name}\` = ${namedValue(c.newValue, language, created)}`
    : `\`${c.name}\`: ${format(c.oldValue, language)} → ${namedValue(c.newValue, language, created)}`).join(', ')
}

// An assignment to an object's property (`p.x = 1`, `self.name = n`, `a[0] = 2`, or a bare
// property name inside a C# class) changes no variable; find the change on the heap instead.
function propertyChanges(targets: string[], heap: HeapDelta[]): Change[] {
  const out: Change[] = []
  for (const target of targets) {
    const property = target.match(/\[\s*([^\]]+?)\s*\]$/)?.[1]?.replace(/^["']|["']$/g, '') ?? target.split(/\.|->/).pop()
    const delta = heap.find(d => d.op === 'mutate' && d.property === property) as { oldValue?: unknown; newValue?: unknown } | undefined
    if (!delta) continue
    out.push('oldValue' in delta
      ? { name: target, oldValue: delta.oldValue, newValue: delta.newValue, isNew: false }
      : { name: target, newValue: delta.newValue, isNew: true })
  }
  return out
}

function printedText(printed: string): string {
  const text = printed.replace(/\n$/, '')
  return text.length > 80 ? text.slice(0, 79) + '…' : text
}

export function explainStatement(event: TraceEvent, language: string): Explanation {
  const statement = event.statement as Statement
  const t = terms(language)
  const outcome = (event.outcome ?? {}) as Outcome
  const changes = outcome.changes ?? []
  const created = new Map((outcome.heap ?? []).filter(d => d.op === 'create').map(d => [d.objectId, (d as { objectType?: string }).objectType ?? 'object'] as [number, string]))
  const heap = describeHeap(outcome.heap ?? [], language)
  if (outcome.moreHeap) heap.push(`${outcome.moreHeap} more object changes`)
  const effectList = [
    ...changes.map(change => describeChange(change, language)),
    ...heap,
    ...(outcome.inputRead?.length ? [`reads ${outcome.inputRead.map(line => `"${printedText(line)}"`).join(', ')} from the input`] : []),
    ...(outcome.gameEvents?.length ? [`receives ${outcome.gameEvents.join(', ')}`] : []),
    ...(outcome.printed ? [`prints "${printedText(outcome.printed)}"`] : []),
  ]
  const effects = effectList.length ? ` What it did: ${effectList.join('; ')}.` : ''
  const calls = outcome.calls?.length ? ` It calls ${outcome.calls.map(c => `\`${c}\``).join(', ')} along the way; step into those calls to watch them run.` : ''
  const code = `\`${statement.code}\``
  const next = outcome.nextLine

  // The JavaScript interpreter enters a loop once and then its body once per pass; the
  // passes carry the checks (jsExecutionClient.ts markLoopPasses), this is the start.
  if (event.loopStart) {
    const s = statement as { init?: string; condition?: string; iterable?: string }
    return {
      summary: statement.kind === 'CFor' && s.init ? `Starts the loop: \`${s.init}\``
        : statement.kind === 'For' ? `Starts looping over \`${s.iterable}\``
        : `Starts the loop`,
      why: statement.kind === 'CFor'
        ? `A \`for (start; condition; update)\` loop runs its start part once, before anything else. Then, before every pass, it checks \`${s.condition}\`.${effects}`
        : statement.kind === 'For'
          ? `The loop asks \`${s.iterable}\` for its items one at a time, binding each to ${(statement.targets ?? []).map(n => `\`${n}\``).join(', ')} for one pass of the ${t.body}.${effects}`
          : `A \`while\` loop checks \`${s.condition}\` before every pass and runs the ${t.body} while it is true.${effects}`,
      concept: 'Control Flow',
    }
  }

  switch (statement.kind) {
    case 'Assign':
    case 'AnnAssign': {
      const targets = (statement.targets ?? []).map(t => `\`${t}\``).join(', ')
      const shown = changes.length ? changes : propertyChanges(statement.targets ?? [], outcome.heap ?? [])
      return {
        summary: shown.length ? `Assigns ${changeSummary(shown, language, created)}` : `Assigns ${targets || 'a value'}`,
        why: `${assignmentWhy(language, targets, (statement.targets?.length ?? 0) > 1)}${calls}${effects}`,
        concept: heap.length ? 'Heap / References' : 'Scope / Mutation',
      }
    }
    case 'AugAssign': {
      const target = statement.targets?.[0] ?? 'the variable'
      const verb = OPERATOR_WORDS[statement.operator ?? ''] ?? 'updates'
      const shown = changes.length ? changes : propertyChanges(statement.targets ?? [], outcome.heap ?? [])
      return {
        summary: shown.length ? `Updates ${changeSummary(shown, language)}` : `Updates \`${target}\``,
        why: `${code} reads \`${target}\`, ${verb} it, and stores the result back in \`${target}\`. It's shorthand for \`${statement.operator === 'Increment' || statement.operator === 'Decrement'
          ? `${target} = ${target} ${statement.operator === 'Increment' ? '+' : '-'} 1`
          : statement.code.replace(/\s*([+\-*/%|&^@]|\/\/|\*\*)=\s*/, ` = ${target} $1 `).replace(/;$/, '')}\`.${calls}${effects}`,
        concept: 'Scope / Mutation',
      }
    }
    case 'For':
    case 'AsyncFor': {
      const targets = statement.targets ?? []
      if (within(next, statement.body)) {
        const bound = changes.filter(c => targets.includes(c.name))
        return {
          summary: bound.length ? `Next item: ${changeSummary(bound, language)}` : `Next item from \`${statement.iterable}\``,
          why: `A \`for\` loop takes the next item from \`${statement.iterable}\`, binds it to ${targets.map(t => `\`${t}\``).join(', ')}, then runs the ${t.body} with that value.${effects}`,
          concept: 'Control Flow',
        }
      }
      return {
        summary: 'The loop is finished',
        why: `\`${statement.iterable}\` has no more items, so the \`for\` loop ends${statement.orelse && within(next, statement.orelse) ? ' and its `else` block runs' : ''} and execution continues at line ${next ?? 'after the loop'}.`,
        concept: 'Control Flow',
      }
    }
    case 'CFor':
      // A C-style loop: for (start; condition; update). Its header line is visited before
      // every pass: the first time it runs the start part, then the update, then the check.
      // GDB stops on it twice before the first pass: once for the start part (execution
      // stays on this line), once for the check.
      if (next === event.line && (statement as { init?: string }).init) {
        return {
          summary: `Starts the loop: \`${(statement as { init?: string }).init}\``,
          why: `A \`for (start; condition; update)\` loop runs its start part once, before anything else. Next it checks \`${statement.condition}\`.${effects}`,
          concept: 'Control Flow',
        }
      }
      return within(next, statement.body)
        ? {
            summary: `\`${statement.condition}\` is true, so the loop body runs`,
            why: `A \`for (start; condition; update)\` loop runs its start part once, then before every pass checks \`${statement.condition}\`. It is true, so the body runs; after the body, \`${(statement as { update?: string }).update ?? 'the update part'}\` runs and the condition is checked again.${effects}`,
            concept: 'Control Flow',
          }
        : {
            summary: `\`${statement.condition}\` is false, so the loop ends`,
            why: `The loop stops as soon as its condition is false. Execution continues at line ${next ?? 'after the loop'}.${effects}`,
            concept: 'Control Flow',
          }
    case 'While':
      return within(next, statement.body)
        ? {
            summary: `\`${statement.condition}\` is true, so the loop body runs`,
            why: `A \`while\` loop checks its condition before every pass. \`${statement.condition}\` is true right now, so the ${t.body} runs, then execution comes back here to check again.${calls}${effects}`,
            concept: 'Control Flow',
          }
        : {
            summary: `\`${statement.condition}\` is false, so the loop ends`,
            why: `A \`while\` loop stops as soon as its condition is false. Execution continues at line ${next ?? 'after the loop'}.${calls}`,
            concept: 'Control Flow',
          }
    case 'If': {
      const word = statement.isElif ? t.elif : '`if`'
      if (within(next, statement.body)) {
        return {
          summary: `\`${statement.condition}\` is true, so the ${t.block} runs`,
          why: `An ${word} runs its block only when its condition is true. \`${statement.condition}\` is true with the current values, so line ${next} runs next.${calls}${effects}`,
          concept: 'Control Flow',
        }
      }
      const elseRuns = within(next, statement.orelse)
      return {
        summary: `\`${statement.condition}\` is false, so ${elseRuns ? 'the `else` part runs' : 'the block is skipped'}`,
        why: `An ${word} runs its block only when its condition is true. \`${statement.condition}\` is false with the current values, so ${elseRuns ? `execution moves to the ${t.elif}/\`else\` part at line ${next}` : `the ${t.block} is skipped and execution continues at line ${next ?? 'after it'}`}.${calls}`,
        concept: 'Control Flow',
      }
    }
    case 'Return':
      return {
        // The C/C++ tracer can't capture the value itself; name the expression instead.
        summary: outcome.returned && 'returnValue' in outcome
          ? `Returns ${format(outcome.returnValue, language)}`
          : statement.expression ? `Returns \`${statement.expression}\`` : 'Returns',
        why: `\`return\` evaluates ${statement.expression ? `\`${statement.expression}\`` : `nothing (so the result is ${(WORDING[language] ?? WORDING.python).none})`}, ends this call, and hands the result back to the line that called the function.${calls}${effects}`,
        concept: 'Call Stack',
      }
    case 'FunctionDef':
    case 'AsyncFunctionDef':
      return {
        summary: `Defines the function \`${statement.name}\``,
        why: `Running a ${t.def} does not run the function. It creates a function object and names it \`${statement.name}\`; the ${t.body} runs each time \`${statement.name}(...)\` is called.`,
        concept: 'Scope',
      }
    case 'ClassDef':
      return {
        summary: `Defines the class \`${statement.name}\``,
        why: `A \`class\` statement creates the class \`${statement.name}\`: a blueprint whose methods run when you call them on an object made from it, such as \`${statement.name}()\`.`,
        concept: 'Scope',
      }
    case 'Expr':
      if ((statement as { prints?: boolean }).prints && !outcome.printed) {
        // C/C++ output is read when the program ends, so the text can't be shown per line.
        return {
          summary: `Writes output with \`${statement.call}\``,
          why: `This line sends text to the program's output (standard output). It appears in the Output tab once the program has finished.${calls}${effects}`,
          concept: 'Control Flow',
        }
      }
      return {
        summary: outcome.printed ? `Prints "${printedText(outcome.printed)}"` : statement.call ? `Calls \`${statement.call}(...)\`` : 'Evaluates an expression',
        why: `${statement.call ? `This line calls \`${statement.call}\` for what it does, not for a value to keep: whatever it returns is discarded.` : 'This line evaluates an expression and discards the result.'}${calls}${effects}`,
        concept: heap.length ? 'Heap / References' : 'Control Flow',
      }
    case 'BlockEnd': {
      // A C/C++ closing brace. At the end of a function, this is where its local variables
      // stop existing (and C++ runs their destructors) before it returns.
      const frame = event.stackSnapshot?.at(-1)?.name
      if (frame === 'main' && (event.stackSnapshot?.length ?? 0) === 1) {
        return {
          summary: 'Reaches the end of `main`, so the program finishes',
          why: `When \`main\` ends, the program ends: its local variables stop existing${language === 'cpp' ? ' (with their destructors run)' : ''} and control returns to the operating system.${effects}`,
          concept: 'Control Flow',
        }
      }
      return outcome.returned
        ? {
            summary: `Reaches the end of \`${frame}\`, which returns`,
            why: `The closing brace ends \`${frame}\`: its local variables stop existing${language === 'cpp' ? ' (objects among them have their destructors run)' : ''}, and execution goes back to the line that called it.${effects}`,
            concept: 'Call Stack',
          }
        : {
            summary: 'Reaches the end of the block',
            why: `Variables declared inside this block stop existing here.${effects}`,
            concept: 'Scope',
          }
    }
    case 'Import':
    case 'ImportFrom':
      return { summary: 'Imports a module', why: `${code} loads a module (once per program) and makes its names available here.${effects}`, concept: 'Scope' }
    case 'Pass':
      return { summary: 'Does nothing', why: '`pass` is a placeholder for where Python requires a statement but there is nothing to do.', concept: 'Control Flow' }
    case 'Break':
      return { summary: 'Leaves the loop', why: `\`break\` ends the innermost loop immediately; execution continues at line ${next ?? 'after the loop'}.`, concept: 'Control Flow' }
    case 'Continue':
      return { summary: 'Skips to the next pass of the loop', why: '`continue` skips the rest of the loop body and goes straight to the loop\'s next iteration.', concept: 'Control Flow' }
    case 'Raise': {
      const verb = language === 'python' ? 'raise' : 'throw'
      const handler = language === 'python' ? '`except`' : '`catch`'
      return {
        summary: `${verb === 'raise' ? 'Raises' : 'Throws'} ${statement.expression ? `\`${statement.expression}\`` : 'the current error again'}`,
        why: `\`${verb}\` stops this line's normal flow. Execution jumps to the nearest enclosing ${handler} that matches the error, leaving every function on the way without returning; if nothing catches it, the program stops with this error.${calls}`,
        concept: 'Control Flow',
      }
    }
    case 'Yield':
      return {
        summary: `Hands out \`${statement.expression}\` and pauses`,
        why: `\`yield\` gives one value to the loop that is asking for items, then pauses this function with all its variables kept. When the loop asks for the next item, the function carries on from the line after this one.${calls}${effects}`,
        concept: 'Control Flow',
      }
    case 'Switch':
      return {
        summary: `Checks \`${statement.expression}\` against the cases`,
        why: `A \`switch\` compares \`${statement.expression}\` with each \`case\` in order and jumps to the first that matches (or to \`default\` when none does)${next ? `: line ${next}` : ''}.${calls}${effects}`,
        concept: 'Control Flow',
      }
    default:
      return {
        summary: `Runs ${code}`,
        why: `${calls.trim()}${effects}`.trim() || 'Nothing visible changed: no variable got a new value and no object changed.',
        concept: heap.length ? 'Heap / References' : 'Control Flow',
      }
  }
}

export function explainTraceEvent(event: TraceEvent): Explanation {
  const statementLanguage = String(event.language ?? event.explainLanguage ?? 'python')
  if (event.type === 'statement_enter' && event.statement) {
    return explainStatement(event, statementLanguage)
  }
  if (event.type === 'statement_exit' && event.statement) {
    // The JavaScript interpreter also marks where each statement ends.
    const kind = (event.statement as { kind?: string }).kind
    const what = kind === 'If' ? 'Leaves the `if` statement'
      : kind === 'For' || kind === 'CFor' || kind === 'While' || kind === 'DoWhile' ? 'Leaves the loop'
      : kind === 'FunctionDef' || kind === 'ClassDef' ? `Line ${event.line ?? event.sourceLocation?.line} is done`
      : `Line ${event.line ?? event.sourceLocation?.line} is done`
    return { summary: what, why: 'This statement has finished running; the highlighted line shows where execution continues.', concept: 'Control Flow' }
  }
  const language = String(event.language ?? 'python')
  const name = LANGUAGE_NAMES[language] ?? language
  const words = WORDING[language] ?? WORDING.python

  const changes = ((event.changes ?? []) as Change[]).map(change => describeChange(change, language))
  const heap = describeHeap(event.heapDelta ?? [], language)
  const effects = [...changes, ...heap]
  const effectText = effects.length ? `The previous step's effect: ${effects.join('; ')}.` : ''

  switch (event.type) {
    case 'statement_enter': {
      // A line whose kind of statement the tracer couldn't tell: describe it by what it did.
      const outcome = (event.outcome ?? {}) as Outcome
      const did = changeSummary((outcome.changes ?? []) as Change[], language)
      return {
        summary: did ? `Runs line ${event.line}: ${did}` : `Runs line ${event.line}`,
        why: explainStatement({ ...event, statement: { kind: '', code: `line ${event.line}` } }, language).why,
        concept: (outcome.heap?.length ?? 0) ? 'Heap / References' : did ? 'Scope / Mutation' : 'Control Flow',
      }
    }
    case 'function_call': {
      const argNames: string[] = event.argNames ?? []
      const args = (event.args ?? []).map((value: unknown, i: number) => argNames[i] ? `${argNames[i]}=${format(value, language)}` : format(value, language))
      return {
        summary: `Calling \`${event.functionName}(${args.join(', ')})\``,
        why: `${words.frame}${effectText ? ' ' + effectText : ''}`,
        concept: 'Call Stack',
      }
    }
    case 'function_return':
      return {
        // The GDB tracer doesn't capture return values; say only what is known.
        summary: 'returnValue' in event
          ? `\`${event.functionName}\` returns ${format(event.returnValue, language)}`
          : `\`${event.functionName}\` finishes and returns to its caller`,
        why: `Its frame is removed from the call stack, and the returned value becomes the result of the call that was waiting for it.${effectText ? ' ' + effectText : ''}`,
        concept: 'Call Stack',
      }
    case 'program_end':
      return {
        summary: 'The program finished',
        why: effectText || 'Every line has run.',
        concept: 'Control Flow',
      }
    case 'error_thrown':
      return {
        summary: `${event.errorType}: ${event.message}${event.line ? ` (line ${event.line})` : ''}`,
        why: String(event.errorType).startsWith('SIG')
          // A crash in C or C++ is the operating system stopping the program, not an error the program raised.
          ? `The operating system stopped the program with the signal ${event.errorType}. The call stack shows the line it was on when it crashed.`
          : `${name} raised an error that nothing caught, so the program stopped here. The call stack shows where it was.`,
        concept: 'Control Flow',
      }
    default:
      return { summary: event.type, why: effectText, concept: '' }
  }
}

// A short, readable label for an event's badge: the kind of statement a line is, when
// the tracer knows it, otherwise the event type in plain words ("function call").
const STATEMENT_LABELS: Record<string, string> = {
  Assign: 'assignment', AnnAssign: 'assignment', AugAssign: 'update', For: 'for loop', AsyncFor: 'for loop',
  While: 'while loop', CFor: 'for loop', If: 'if', Return: 'return', FunctionDef: 'function definition',
  AsyncFunctionDef: 'function definition', ClassDef: 'class definition', Expr: 'expression',
  Import: 'import', ImportFrom: 'import', Pass: 'pass', Break: 'break', Continue: 'continue',
  Try: 'try', With: 'with', Raise: 'raise', Assert: 'assert', Delete: 'del',
}

export function eventLabel(event: TraceEvent): string {
  const statement = event.statement as { kind?: string; code?: string; isElif?: boolean } | undefined
  if (event.type === 'statement_enter' && statement?.kind) {
    if (statement.kind === 'If' && statement.isElif) return 'elif'
    if (statement.kind === 'Expr' && (event.outcome as { printed?: string } | undefined)?.printed) return 'print'
    return STATEMENT_LABELS[statement.kind] ?? statement.kind.toLowerCase()
  }
  return event.type.replace(/_/g, ' ')
}
