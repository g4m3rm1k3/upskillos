// Shared data types for CodeLens — the trace-event contract produced by the JS
// interpreter (src/engines/js/interpreter/interpreter.js), the Python tracer
// (interpreter/pythonTracer.ts), and the native-language bridge
// (interpreter/nativeTracer.ts), plus the heap/AST/snippet shapes built on top
// of them. Kept intentionally loose in a few spots (AstNode, event payloads)
// since the interpreter/parser that produce them are untyped JS out of scope
// for this conversion — the goal is typing CodeLens's own consumption of these
// shapes, not modeling every interpreter internal.

// 'c', 'cpp' and 'cs' (C#) are traced by the desktop app only (interpreter/nativeExecutionClient.ts).
export type Lang = 'js' | 'ts' | 'py' | 'go' | 'c' | 'cpp' | 'cs'

export interface SourceLocation {
  file?: string
  line: number
  column?: number
  astNodeId?: string
}

export interface StackFrame {
  name: string
  line?: number
  locals?: Record<string, unknown>
}

export type HeapDelta =
  | { op: 'create'; objectId: number; objectType?: string; properties?: Record<string, unknown>; prototype?: unknown }
  | { op: 'mutate'; objectId: number; property: string; oldValue?: unknown; newValue?: unknown }
  | { op: 'delete'; objectId: number; property: string }
  | { op: 'free'; objectId: number }

// The envelope every trace event shares (see src/engines/js/eventStream.js
// `makeEvent`); specific event types add their own fields on top (functionName,
// args, name, value, condition, branch, iteration, objectId, errorType, ...) —
// those are read dynamically by EXPLAIN/narration templates, so left as an
// open index signature rather than a full discriminated union.
export interface TraceEvent {
  stepId: number
  type: string
  sourceLocation?: SourceLocation | null
  stackSnapshot?: StackFrame[]
  heapDelta?: HeapDelta[]
  timestamp?: number
  operationCount?: number
  error?: { type: string; message: string } | null
  /** Lines of standard input the program read since the previous event (scriptedInput.ts). */
  inputRead?: string[]
  /** pygame programs (python/codelens_pygame.py): the frame being drawn, the picture on
   *  screen (an index into ExecutionResult.frames) and events received since the previous event. */
  gameFrame?: number
  screen?: number
  gameEvents?: string[]
  // Per-event-type payload fields (functionName, args, name, value, oldValue,
  // newValue, condition, branch, result, iteration, loopType, objectType,
  // objectId, property, returnValue, errorType, message, scopeId, ...) vary by
  // `type` and are read dynamically by EXPLAIN/narration templates — modeling
  // a full discriminated union isn't worth it for what's ultimately debug/
  // display-only data, so this boundary is intentionally `any`, not `unknown`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export interface RuntimeError {
  type: string
  message: string
  line?: number | null
  limitKind?: ExecutionLimitKind
}

export interface CompilerDiagnostic {
  category: 'error' | 'warning' | 'message'
  code: number
  message: string
  line: number | null
  column: number | null
}

export type ExecutionStatus =
  | 'completed'
  | 'stopped'
  | 'limit'
  | 'unsupported'
  | 'syntax-error'
  | 'runtime-error'

export type ExecutionLimitKind =
  | 'timeout'
  | 'steps'
  | 'events'
  | 'trace-size'
  | 'output'
  | 'recursion'
  | 'memory'

export interface ExecutionLimits {
  maxRuntimeMs: number
  maxSteps: number
  maxEvents: number
  maxTraceChars: number
  maxOutputLines: number
  maxOutputChars: number
  maxRecursionDepth: number
  maxHeapObjects: number
  maxHeapProperties: number
  maxSnapshotItems: number
  maxSnapshotChars: number
}

export interface ExecutionResult {
  events: TraceEvent[]
  output: string[]
  error: RuntimeError | null
  diagnostics?: CompilerDiagnostic[]
  status?: ExecutionStatus
  limit?: { kind: ExecutionLimitKind; message: string }
  /** Pictures a pygame program drew, one per changed frame (python/codelens_pygame.py).
   *  An event's `screen` is the index of the picture on screen at that step. */
  frames?: ScreenFrame[]
  /** Python: every sub-expression the tracer records values for, by id. Events carry
   *  `expressions: [id, depth, value][]`, collected per line into `outcome.expressions`. */
  expressions?: ExpressionSpan[]
}

/** Where a sub-expression is in the source: lines from 1, columns in characters from 0. */
export interface ExpressionSpan {
  line: number
  col: number
  endLine: number
  endCol: number
  code: string
}

/** One picture of a pygame program's window, saved when it called display.flip(). */
export interface ScreenFrame {
  /** Which frame: 0 is the first picture shown. */
  frame: number
  /** The pretend clock (pygame.time.get_ticks()) when it was shown. */
  timeMs: number
  width: number
  height: number
  /** Base64 PNG. */
  png: string
}

export interface HeapObjectEntry {
  id: number
  type: string
  properties: Map<string, unknown>
  prototype: unknown
}

export interface HeapSnapshot {
  objects: Map<number, HeapObjectEntry>
  lastCreated: Set<number>
  lastMutated: Set<number>
}

export interface HeapGraphNode {
  id: number
  type: string
  props: [string, string][]
  isNew: boolean
  isMutated: boolean
}

export interface HeapGraphLink {
  id: string
  source: number
  target: number
  label: string
}

export interface HeapGraphData {
  nodes: HeapGraphNode[]
  links: HeapGraphLink[]
}

// Loose recursive AST node shape — the parser (src/engines/js/parser/jsParser.js)
// produces ESTree-like nodes but has no type declarations of its own.
export interface AstNode {
  type: string
  [key: string]: unknown
}

// Static call-graph shape produced by the JS parser's model builder
// (src/engines/js/parser/jsParser.js `buildProgramModel(...).callGraph`).
export interface CallGraphNode {
  id: string
  name: string
  kind: 'function' | 'arrow' | 'method' | 'constructor'
  params: string[]
  line?: number
  complexity?: string
}

export interface CallGraphEdge {
  from: string
  to: string
  recursive?: boolean
}

export interface CallGraph {
  nodes: CallGraphNode[]
  edges: CallGraphEdge[]
}

// Static-analysis model produced by the JS/TS parser's model builder
// (src/engines/js/parser/jsParser.js `buildProgramModel(source)`). That file
// is untyped JS with no formal contract, so these fields are optional/loose —
// derived from how StructureView/TokensView/AstView actually read them.
export interface TokenInfo {
  type: string
  value?: string
  start: number
  end: number
}

export interface ClassMethodInfo {
  name: string
  kind?: 'constructor' | 'method'
  static?: boolean
  line?: number
}

export interface ClassInfo {
  name: string
  superclass?: string | null
  line?: number
  methods: ClassMethodInfo[]
}

export interface VarInfo {
  name: string
  kind: 'const' | 'let' | 'var'
  initType?: string | null
  line?: number
}

export interface ImportInfo {
  source: string
  specifiers: string[]
}

export interface InterfaceMemberInfo {
  name: string
  kind: 'method' | 'property'
  optional?: boolean
}

export interface InterfaceInfo {
  name: string
  extends?: string[]
  line?: number
  members: InterfaceMemberInfo[]
}

export interface TypeInfo {
  name: string
  isUnion?: boolean
  line?: number
}

export interface EnumInfo {
  name: string
  line?: number
  members: string[]
}

export interface ProgramFile {
  ast?: AstNode
  tokens?: TokenInfo[]
}

export interface ProgramModel {
  error?: { line: number; message: string } | null
  files?: ProgramFile[]
  callGraph?: CallGraph
  classes?: ClassInfo[]
  variables?: VarInfo[]
  imports?: ImportInfo[]
  exports?: unknown[]
  interfaces?: InterfaceInfo[]
  types?: TypeInfo[]
  enums?: EnumInfo[]
  isTypeScript?: boolean
}

export interface Snippet {
  name: string
  code: string
}

export interface SnippetCategory {
  group: string
  items: Snippet[]
}
