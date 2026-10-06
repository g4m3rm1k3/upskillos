import { useState, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode, type CSSProperties } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import { buildProgramModel } from '../../../engines/js/parser/jsParser.js'
import { startPythonExecution } from './interpreter/pythonExecutionClient'
import { explainTraceEvent, eventLabel } from './explainTrace'
import { startNativeExecution, nativeToolchains, type NativeLang } from './interpreter/nativeExecutionClient'
import { checkBackendTools } from './interpreter/nativeTracer'
import { runNative } from './interpreter/nativeTracer'
import {
  startJavaScriptExecution,
  withExecutionStatus,
  type JavaScriptExecutionHandle,
} from './interpreter/jsExecutionClient'
import { EXPLAIN, CONCEPT_GLOSSARY } from '../../../engines/js/eventStream.js'
import { buildHeapSnapshot } from './renderer/heapSnapshot'
import HeapGraph from './renderer/HeapGraph'
import InspectorWorkspace from './InspectorWorkspace'
import Picture from './Picture'
import { readWorkspace, activateInspector, WORKSPACE_KEY, type InspectorId } from './inspectorLayoutState'
import { outputAtStep } from './tracePresentation'
import CallGraphView from './renderer/CallGraphView'
import VariableWatch from './renderer/VariableWatch'
import CallTreeView from './renderer/CallTreeView'
import StackDepthMeter from './renderer/StackDepthMeter'
import WatchWindow from './renderer/WatchWindow'
import LibraryBrowser from './LibraryBrowser'
import InputPanel, { readsInput } from './InputPanel'
import DataDock from './DataDock'
import { HeapPreviewContext, referenceText } from './renderer/valuePreview'
import ScreenPanel from './ScreenPanel'
import PackagesDialog from './PackagesDialog'
import ExpressionSteps from './ExpressionSteps'
import { codelensPythonStatus, type CodeLensPythonStatus } from './interpreter/codelensPythonEnv'
import { parseScriptedInput, stdinText } from './scriptedInput'
import { LANGUAGE_LABELS, type LibraryExample } from './library'
import { setupOpenCalcMonaco } from '../../../utils/monacoThemes.js'
import { CodeLensThemeProvider, useCodeLensTheme } from './ThemeContext'
import { CODELENS_THEMES } from './theme'
import { CODE_SPEEDS, usePlaybackTicker } from '../../../utils/playback'
import type { CodeLensUiPalette } from './theme'
import type {
  Lang, TraceEvent, StackFrame, ExecutionResult, HeapObjectEntry, HeapSnapshot,
  CallGraph, CallGraphNode, AstNode, ProgramModel, TokenInfo, Snippet, ExecutionLimitKind,
} from './types'
import {
  ChevronRight, ChevronDown, Code2, Boxes, Braces, ArrowLeft,
  Zap, Play, Pause, StepForward, StepBack, SkipForward, Terminal,
  Palette, Info, Network, Layers, GitBranch, X, Eye, Square, BookOpen, RotateCcw, Package,
  type LucideIcon,
} from 'lucide-react'

// Playback speeds are shared with MeshLab's algorithm traces (utils/playback).
const SPEED_CONFIG = CODE_SPEEDS

function limitGuidance(kind: ExecutionLimitKind): string {
  if (kind === 'steps' || kind === 'events' || kind === 'timeout') {
    return 'This often means a loop never finishes or its condition is not being updated. Check the loop condition and the variables changed inside it.'
  }
  if (kind === 'trace-size') {
    return 'The program produced more visual history than the learner interface can safely retain. Try a smaller input or fewer iterations.'
  }
  if (kind === 'output') {
    return 'The program printed too much text. Reduce logging or test with a smaller input.'
  }
  if (kind === 'recursion') {
    return 'The call stack grew too deep. Check the base case and confirm every recursive call moves toward it.'
  }
  return 'The program created more objects or properties than the visualizer can safely display. Try a smaller input or reuse existing data.'
}

// ── Theme config ──────────────────────────────────────────────────────────────
// The full CODELENS_THEMES list (theme.ts) now drives both the Monaco editor
// theme AND every panel's UI palette via CodeLensThemeProvider/useCodeLensTheme
// — previously `THEMES` only ever fed the editor's `theme` prop.

const STARTER_TS = `interface Animal {
  name: string
  sound(): string
}

type Point = { x: number; y: number }

enum Direction { Up, Down, Left, Right }

class Dog implements Animal {
  constructor(public name: string) {}

  sound(): string {
    return 'woof'
  }

  fetch(item: string): string {
    return \`\${this.name} fetches \${item}!\`
  }
}

function greet(animal: Animal): string {
  return \`\${animal.name} says \${animal.sound()}\`
}

const dog = new Dog('Rex')
console.log(greet(dog))
console.log(dog.fetch('ball'))

const pos: Point = { x: 3, y: 4 }
const dir: Direction = Direction.Up
console.log('Position:', pos.x, pos.y)
console.log('Direction:', dir)
`

const STARTER_PY = `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)


class Stack:
    def __init__(self):
        self.items = []

    def push(self, item):
        self.items.append(item)

    def pop(self):
        return self.items.pop()

    def size(self):
        return len(self.items)


print('fib(6):', fibonacci(6))

s = Stack()
s.push(10)
s.push(20)
s.push(30)
print('Stack size:', s.size())
print('Popped:', s.pop())
`

// C# runs on the desktop app only, with the learner's own .NET SDK.
const STARTER_CS = `// A class, a list of objects, and a method that changes them.
var cart = new List<Item>
{
    new Item("Pen", 1.50m, 2),
    new Item("Notebook", 3.25m, 1),
};
decimal total = 0;
foreach (var item in cart)
{
    total += Subtotal(item);
}
cart[0].Quantity++;
Console.WriteLine($"Total: {total}");

decimal Subtotal(Item item)
{
    var price = item.Price * item.Quantity;
    return price;
}

class Item
{
    public string Name { get; }
    public decimal Price { get; }
    public int Quantity { get; set; }

    public Item(string name, decimal price, int quantity)
    {
        Name = name;
        Price = price;
        Quantity = quantity;
    }
}
`

// C and C++ run on the desktop app only, compiled and stepped through under GDB.
const STARTER_CPP = `#include <iostream>
#include <vector>

struct Node {
    int value;
    Node* next;
};

int sumList(Node* node) {
    if (node == nullptr) {
        return 0;
    }
    return node->value + sumList(node->next);
}

int main() {
    std::vector<int> values = {3, 1, 4};
    Node* head = nullptr;
    for (int value : values) {
        head = new Node{value, head};
    }
    int total = sumList(head);
    std::cout << "total: " << total << std::endl;
    return 0;
}
`

const STARTER_C = `#include <stdio.h>

struct Point {
    int x;
    int y;
};

void moveRight(struct Point *point, int steps) {
    point->x += steps;
}

int main(void) {
    int scores[4] = {7, 3, 9, 4};
    int best = scores[0];
    for (int i = 1; i < 4; i++) {
        if (scores[i] > best) {
            best = scores[i];
        }
    }
    struct Point p = {0, 0};
    moveRight(&p, best);
    printf("best %d, p.x %d\\n", best, p.x);
    return 0;
}
`

const STARTER_GO = `package main

import "fmt"

func fibonacci(n int) int {
\tif n <= 1 {
\t\treturn n
\t}
\treturn fibonacci(n-1) + fibonacci(n-2)
}

func main() {
\tnums := []int{1, 2, 3, 4, 5}
\tsum := 0
\tfor _, n := range nums {
\t\tsum += n
\t}
\tfmt.Println("Sum:", sum)
\tfmt.Println("fib(6):", fibonacci(6))
}
`

const STARTER = `function fibonacci(n) {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

class Node {
  constructor(value) {
    this.value = value
    this.next = null
  }
}

class LinkedList {
  constructor() {
    this.head = null
    this.size = 0
  }

  push(value) {
    const node = new Node(value)
    node.next = this.head
    this.head = node
    this.size++
  }
}

console.log('fib(5):', fibonacci(5))

const list = new LinkedList()
list.push(1)
list.push(2)
list.push(3)
console.log('List size:', list.size)

const nums = [3, 1, 4, 1, 5, 9, 2, 6]
const result = nums.filter(x => x > 3).map(x => x * 2)
console.log('Result:', result)
`

// ── Helpers ───────────────────────────────────────────────────────────────────

interface PanelProps {
  title: string
  icon?: LucideIcon
  children: ReactNode
  badge?: string | number
  style?: CSSProperties
  accent?: string
}

function Panel({ title, icon: Icon, children, badge, style, accent }: PanelProps) {
  const { theme: { ui } } = useCodeLensTheme()
  return (
    <div style={{
      background: ui.panelBg, border: `1px solid ${ui.border}`, borderRadius: 10,
      display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0,
      borderTop: `2px solid ${accent ?? ui.border}`,
      ...style,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 12px', borderBottom: `1px solid ${ui.border}`,
        background: ui.headerBg, flexShrink: 0,
      }}>
        {Icon && <Icon size={13} color={ui.accent} />}
        <span style={{ fontSize: 11, fontWeight: 600, color: ui.text, letterSpacing: '.02em' }}>{title}</span>
        {badge != null && (
          <span style={{
            marginLeft: 'auto', fontSize: 10,
            background: ui.border, color: ui.cyan,
            padding: '1px 6px', borderRadius: 99,
          }}>{badge}</span>
        )}
      </div>
      <div style={{ overflow: 'auto', flex: 1, padding: 10 }}>
        {children}
      </div>
    </div>
  )
}

interface BtnProps {
  onClick: () => void
  disabled?: boolean
  title?: string
  children: ReactNode
  active?: boolean
}

function Btn({ onClick, disabled = false, title, children, active = false }: BtnProps) {
  const { theme: { ui } } = useCodeLensTheme()
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active || undefined}
      style={{
        background: active ? ui.accentBgSolid : ui.border,
        border: `1px solid ${active ? ui.accentSolid : ui.borderStrong}`,
        color: disabled ? ui.textFaint : active ? ui.accentBright : ui.textSoft,
        borderRadius: 6, padding: '4px 10px',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 12, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 5,
        transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  )
}

interface PrimaryRunBtnProps {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}

function PrimaryRunBtn({ onClick, disabled = false, children }: PrimaryRunBtnProps) {
  const { theme: { ui } } = useCodeLensTheme()
  const [hover, setHover] = useState(false)
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      disabled={disabled}
      title="Run code (⌘↵)"
      style={{
        background: disabled ? ui.border : 'linear-gradient(135deg, #4f46e5, #9333ea)',
        border: `1px solid ${disabled ? ui.borderStrong : 'transparent'}`,
        color: disabled ? ui.textFaint : '#ffffff',
        boxShadow: disabled ? 'none' : (hover ? '0 0 15px rgba(147, 51, 234, 0.6)' : '0 0 8px rgba(79, 70, 229, 0.4)'),
        borderRadius: 6, padding: '5px 14px',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 13, fontWeight: 700,
        display: 'flex', alignItems: 'center', gap: 6,
        transform: hover && !disabled ? 'scale(1.03)' : 'scale(1)',
        transition: 'all 0.15s ease-out',
        textShadow: disabled ? 'none' : '0 1px 2px rgba(0,0,0,0.4)',
      }}
    >
      {children}
    </button>
  )
}

function ComplexityBadge({ complexity }: { complexity?: string }) {
  const { theme: { ui } } = useCodeLensTheme()
  const color =
    complexity === 'O(1)'           ? ui.green :
    complexity?.includes('log')     ? ui.cyan :
    complexity === 'O(n)'           ? ui.amber :
    complexity?.includes('recursive') ? ui.pink :
    ui.red
  return (
    <span style={{
      fontSize: 10, padding: '1px 7px', borderRadius: 99,
      background: `${color}18`, color, border: `1px solid ${color}44`,
      fontFamily: 'JetBrains Mono, monospace',
    }}>{complexity}</span>
  )
}
function tokenColor(type: string, ui: CodeLensUiPalette): string {
  const TOKEN_COLORS: Record<string, string> = {
    keyword: ui.accent, name: ui.cyan, num: ui.green,
    string: ui.amber, punctuation: ui.textDim,
  }
  for (const [k, v] of Object.entries(TOKEN_COLORS)) if (type.includes(k)) return v
  return ui.textSoft
}

// ── Concept badge with glossary popover ───────────────────────────────────────

interface ConceptEntry { tldr: string; detail: string; analogy?: string; sicp?: string }
const CONCEPT_MAP = CONCEPT_GLOSSARY as Record<string, ConceptEntry>

interface Explanation { summary: string; why?: string; concept?: string }
const EXPLAIN_MAP = EXPLAIN as Record<string, ((event: TraceEvent) => Explanation) | undefined>
function explainEvent(event: TraceEvent): Explanation {
  // Python and the desktop languages tag their events with `language`; their
  // explanations come from explainTrace.ts. The JavaScript interpreter's don't, and use
  // its own JavaScript-specific explanations.
  if (event.language || ((event.type === 'statement_enter' || event.type === 'statement_exit') && event.statement)) {
    return explainTraceEvent(event)
  }
  return EXPLAIN_MAP[event.type]?.(event) ?? { summary: event.type, why: '', concept: '' }
}

function ConceptBadge({ concept, style: extraStyle }: { concept?: string; style?: CSSProperties }) {
  const { theme: { ui } } = useCodeLensTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const entry = concept ? CONCEPT_MAP[concept] : undefined

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!concept) return null

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onClick={() => setOpen(o => !o)}
        title={entry ? 'Click to learn more' : undefined}
        style={{
          fontSize: 10, padding: '2px 7px', borderRadius: 99,
          background: ui.accentBg, color: open ? ui.accentBright : ui.accentSolid,
          border: `1px solid ${open ? ui.accentSolid : ui.accentSolid + '33'}`,
          fontFamily: 'JetBrains Mono, monospace',
          cursor: entry ? 'pointer' : 'default',
          userSelect: 'none',
          transition: 'all 0.1s',
          ...extraStyle,
        }}
      >
        {entry ? '✦ ' : ''}{concept}
      </span>

      {open && entry && (
        <div style={{
          position: 'fixed',
          zIndex: 9999,
          transform: 'translateX(-50%)',
          left: ref.current ? ref.current.getBoundingClientRect().left + ref.current.offsetWidth / 2 : 0,
          top: ref.current ? ref.current.getBoundingClientRect().bottom + 8 : 0,
          background: ui.panelBg2,
          border: `1px solid ${ui.accentSolid}44`,
          borderRadius: 12,
          padding: '14px 16px',
          maxWidth: 320,
          boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
          pointerEvents: 'auto',
        }}>
          {/* Glow strip */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, ${ui.accentSolid}, ${ui.accent}, transparent)`,
            borderRadius: '12px 12px 0 0',
          }} />

          <div style={{ fontSize: 10, color: ui.accentSolid, fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700, letterSpacing: '.06em', marginBottom: 6 }}>
            {concept.toUpperCase()}
          </div>

          {/* TL;DR */}
          <div style={{ fontSize: 12, fontWeight: 600, color: ui.text, lineHeight: 1.5, marginBottom: 8 }}>
            {entry.tldr}
          </div>

          {/* Detail */}
          <div style={{ fontSize: 11, color: ui.textMuted, lineHeight: 1.65, marginBottom: entry.analogy ? 8 : 0 }}>
            {entry.detail}
          </div>

          {/* Analogy */}
          {entry.analogy && (
            <div style={{
              borderLeft: `2px solid ${ui.amber}`, paddingLeft: 8,
              fontSize: 11, color: ui.textMuted, lineHeight: 1.6, marginBottom: 6,
              fontStyle: 'italic',
            }}>
              {entry.analogy}
            </div>
          )}

          {/* SICP ref */}
          {entry.sicp && (
            <div style={{ fontSize: 10, color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace' }}>
              ↗ {entry.sicp}
            </div>
          )}
        </div>
      )}
    </span>
  )
}

// ── Narration bar ─────────────────────────────────────────────────────────────
// Synthesises the current event into a plain-English tutor sentence.

function buildNarration(event: TraceEvent | null, prevEvent: TraceEvent | null): string | null {
  if (!event) return null
  const t  = event.type
  const pt = prevEvent?.type

  if (t === 'function_call') {
    const argc = event.args?.length ?? 0
    const argPart = argc === 0 ? '' : ` with ${event.args?.map(formatValue).join(', ')}`
    const wasReturn = pt === 'function_return'
    return wasReturn
      ? `\`${prevEvent!.functionName}\` just returned — now calling \`${event.functionName}\`${argPart}. A new stack frame is being pushed.`
      : `Calling \`${event.functionName}\`${argPart}. The engine pushes a new frame onto the call stack — watch the stack depth increase.`
  }

  if (t === 'function_return') {
    const retStr = formatValue(event.returnValue)
    const isBase = event.args?.length === 1 && (event.returnValue === event.args?.[0])
    return isBase
      ? `\`${event.functionName}\` hits its base case and returns ${retStr}. This frame is popped — the result travels back up the call stack.`
      : `\`${event.functionName}\` is done and returns ${retStr}. Its frame is destroyed and execution resumes at the call site.`
  }

  if (t === 'variable_declare') {
    return `\`${event.name}\` is declared and set to ${formatValue(event.value)}. This binding lives in the current scope frame until the block closes.`
  }

  if (t === 'variable_assign') {
    return `\`${event.name}\` just changed: ${formatValue(event.oldValue)} → ${formatValue(event.newValue)}. JavaScript found the binding in the scope chain and updated it there.`
  }

  if (t === 'conditional_branch') {
    const taken = event.branch === 'then' ? 'if' : 'else'
    return `The condition \`${event.condition}\` evaluated to ${event.result}. The ${taken} branch runs — the other branch is skipped entirely.`
  }

  if (t === 'loop_iteration') {
    return `Iteration ${event.iteration} of the ${event.loopType} loop. The condition was re-evaluated and was truthy. Each iteration here adds to the total work done.`
  }

  if (t === 'object_create') {
    return `A new ${event.objectType} was created on the heap (id #${event.objectId}). Variables that reference it hold an arrow to this object — not a copy.`
  }

  if (t === 'object_mutate') {
    return `Heap object #${event.objectId} was mutated: \`.${event.property}\` changed. Every variable pointing to this object sees the update immediately.`
  }

  if (t === 'program_start') {
    return 'The program starts. The global scope is set up and `var` declarations are hoisted. Step forward to trace execution line by line.'
  }

  if (t === 'program_end') {
    return event.error
      ? `Program ended with an uncaught ${event.error.type}. The error propagated all the way up the call stack without being caught.`
      : 'All code has finished executing. Step back to review any moment in the trace.'
  }

  return null
}

// `buildNarration`'s plain-English sentence now renders inside ExplainHero
// (see below) as a "In plain terms" line, instead of a separately-pinned
// bottom bar — that used to be a second permanently-visible strip repeating
// information the Explain panel already showed, adding to the "too much
// shown at once" problem.

// ── AST viewer ────────────────────────────────────────────────────────────────

// A tiny glossary mapping common node types to plain English for the hover tooltip
const NODE_GLOSSARY: Record<string, string> = {
  Identifier: "A named reference (variable, property, or function name).",
  CallExpression: "A function being invoked.",
  BinaryExpression: "Two values combined with an operator (like + or ===).",
  Literal: "A hardcoded value (string, number, boolean).",
  BlockStatement: "A block of code wrapped in { } braces.",
  FunctionDeclaration: "Defining a new named function.",
  VariableDeclaration: "Declaring one or more variables using let, const, or var.",
  ExpressionStatement: "A statement consisting of a single expression (like a function call on its own line).",
  ReturnStatement: "Exiting a function and returning a value to the caller.",
  IfStatement: "Conditional branch control flow.",
  MemberExpression: "Accessing a property on an object (like console.log)."
}

// Category-color the AST tree by node kind instead of one flat gray tone, so
// nesting reads as structure (declarations vs control-flow vs expressions vs
// literals) rather than a wall of identically-styled text.
const DECLARATION_NODES = new Set(['FunctionDeclaration', 'VariableDeclaration', 'VariableDeclarator', 'ClassDeclaration', 'ImportDeclaration', 'ExportNamedDeclaration', 'ExportDefaultDeclaration', 'MethodDefinition', 'PropertyDefinition', 'TSInterfaceDeclaration', 'TSTypeAliasDeclaration', 'TSEnumDeclaration'])
const CONTROL_FLOW_NODES = new Set(['IfStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement', 'DoWhileStatement', 'SwitchStatement', 'SwitchCase', 'TryStatement', 'CatchClause', 'ConditionalExpression', 'BreakStatement', 'ContinueStatement', 'ReturnStatement', 'ThrowStatement'])
const EXPRESSION_NODES = new Set(['CallExpression', 'BinaryExpression', 'LogicalExpression', 'UnaryExpression', 'UpdateExpression', 'AssignmentExpression', 'MemberExpression', 'NewExpression', 'ArrayExpression', 'ObjectExpression', 'ArrowFunctionExpression', 'FunctionExpression', 'SpreadElement', 'TemplateLiteral'])

function astNodeColor(type: string, ui: CodeLensUiPalette): string {
  if (DECLARATION_NODES.has(type))  return ui.accent
  if (CONTROL_FLOW_NODES.has(type)) return ui.pink
  if (EXPRESSION_NODES.has(type))   return ui.cyan
  if (type === 'Literal')           return ui.amber
  if (type === 'Identifier')        return ui.green
  return ui.textDim
}

interface ASTNodeProps {
  node: AstNode | null | undefined
  depth?: number
  startOpen?: boolean
  interactive?: boolean
}

function ASTNode({ node, depth = 0, startOpen = false, interactive = false }: ASTNodeProps) {
  const { theme: { ui } } = useCodeLensTheme()
  const [open, setOpen] = useState(startOpen || depth < 2)
  const [hover, setHover] = useState(false)
  if (!node || typeof node !== 'object') return null

  const children = Object.entries(node).filter(([k, v]) => {
    if (['type','start','end','loc','sourceType'].includes(k)) return false
    if (Array.isArray(v)) return v.some(c => c && typeof c.type === 'string')
    return v && typeof (v as { type?: unknown }).type === 'string'
  }) as [string, AstNode | AstNode[]][]

  const label = [
    node.type,
    node.name ? ` ${node.name}` : '',
    (node.id as AstNode | undefined)?.name ? ` ${(node.id as AstNode).name}` : '',
    node.operator ? ` ${node.operator}` : '',
    node.kind ? ` (${node.kind})` : '',
    node.raw != null ? ` = ${node.raw}` : '',
  ].join('')

  const hasChildren = children.length > 0
  const color = astNodeColor(node.type, ui)

  return (
    <div style={{
      marginLeft: depth * 14, paddingLeft: depth > 0 ? 8 : 0,
      borderLeft: depth > 0 ? `1px solid ${ui.border}` : 'none',
      fontFamily: 'JetBrains Mono, monospace', fontSize: interactive ? 12 : 11,
    }}>
      <div
        onClick={() => hasChildren && setOpen(o => !o)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          cursor: hasChildren ? 'pointer' : 'default',
          padding: '2px 4px', borderRadius: 4,
          background: hover && interactive ? 'rgba(255,255,255,0.05)' : 'transparent',
          color,
          position: 'relative',
        }}
      >
        {hasChildren ? (open ? <ChevronDown size={10} /> : <ChevronRight size={10} />) : <span style={{ width: 10 }} />}
        <span>{label}</span>

        {/* Hover Tooltip (only when interactive) */}
        {hover && interactive && NODE_GLOSSARY[node.type] && (
          <div style={{
            position: 'absolute', left: '100%', top: '50%', transform: 'translate(10px, -50%)',
            background: ui.border, border: `1px solid ${ui.borderStrong}`, color: ui.text,
            padding: '4px 8px', borderRadius: 4, fontSize: 10, whiteSpace: 'nowrap',
            zIndex: 10, pointerEvents: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            display: 'flex', gap: 6, alignItems: 'center',
          }}>
            <div style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderRight: `4px solid ${ui.border}`, position: 'absolute', left: -4 }} />
            <span style={{ color, fontWeight: 600 }}>{node.type}</span>
            <span style={{ color: ui.textDim }}>{NODE_GLOSSARY[node.type]}</span>
          </div>
        )}
      </div>

      {open && hasChildren && children.map(([key, val]) => {
        const items = (Array.isArray(val) ? val.filter(c => c?.type) : [val]) as AstNode[]
        return (
          <div key={key}>
            <div style={{ marginLeft: (depth+1)*14+13, fontSize: interactive ? 11 : 10, color: ui.textFaint, padding: '2px 0' }}>{key}</div>
            {items.map((child, i) => <ASTNode key={i} node={child} depth={depth + 2} startOpen={startOpen} interactive={interactive} />)}
          </div>
        )
      })}
    </div>
  )
}

// ── Event explanation card ────────────────────────────────────────────────────

function EventCard({ event, active }: { event: TraceEvent; active: boolean }) {
  const { theme: { ui } } = useCodeLensTheme()
  const explain = explainEvent(event)
  return (
    <div style={{
      padding: '7px 10px', borderRadius: 7, marginBottom: 4,
      background: active ? ui.accentBg : ui.panelBg,
      border: `1px solid ${active ? ui.accentDeep : ui.border}`,
      cursor: 'default',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: explain.why ? 4 : 0 }}>
        <span style={{
          fontSize: 10, padding: '1px 6px', borderRadius: 99,
          background: ui.border, color: ui.accent,
          fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
        }}>{eventLabel(event)}</span>
        {event.sourceLocation?.line && (
          <span style={{ fontSize: 10, color: ui.textFaint }}>L{event.sourceLocation.line}</span>
        )}
        {explain.concept && (
          <span style={{ marginLeft: 'auto' }}>
            <ConceptBadge concept={explain.concept} />
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: ui.text, fontFamily: 'JetBrains Mono, monospace', marginBottom: explain.why ? 3 : 0 }}>
        {explain.summary}
      </div>
      {explain.why && (
        <div style={{ fontSize: 11, color: ui.textMuted, lineHeight: 1.5 }}>
          {explain.why}
        </div>
      )}
    </div>
  )
}

// ── Stack frame display ───────────────────────────────────────────────────────

// A variable's value as the Call Stack shows it: an object with what it holds,
// "[0, 0, -0.5, 0] (ndarray #39)", and Python's own spelling of None, True and strings.
function localText(value: unknown, snapshot: HeapSnapshot | null, language: string | undefined, maxChars = 48): string {
  const reference = referenceText(value, snapshot, maxChars, language)
  if (reference) return reference
  if (language === 'py') {
    if (value === null || value === undefined) return 'None'
    if (value === true || value === false) return value ? 'True' : 'False'
    if (typeof value === 'string' && !/^\[(Function|Class|Module): /.test(value) && !/^-?inf$|^nan$/.test(value)) return `'${value}'`
  }
  return formatValue(value)
}

function StackFrame({ frame, depth }: { frame: StackFrame; depth: number }) {
  const { theme: { ui } } = useCodeLensTheme()
  const heap = useContext(HeapPreviewContext)
  const [open, setOpen] = useState(depth === 0)
  const locals = Object.entries(frame.locals ?? {})
  return (
    <div style={{
      marginBottom: 4, borderRadius: 6, overflow: 'hidden',
      border: `1px solid ${depth === 0 ? ui.accentDeep : ui.border}`,
    }}>
      <div
        onClick={() => locals.length > 0 && setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 8px',
          background: depth === 0 ? ui.accentBg : ui.panelBg,
          cursor: locals.length > 0 ? 'pointer' : 'default',
        }}
      >
        {locals.length > 0 ? (open ? <ChevronDown size={11} /> : <ChevronRight size={11} />) : <span style={{ width: 11 }} />}
        <span style={{ fontSize: 12, color: ui.accentBright, fontFamily: 'JetBrains Mono, monospace' }}>
          {frame.name}
        </span>
        {frame.line && <span style={{ fontSize: 10, color: ui.textFaint }}>L{frame.line}</span>}
        {depth === 0 && <span style={{ marginLeft: 'auto', fontSize: 10, color: ui.accentSolid }}>← current</span>}
      </div>
      {open && locals.length > 0 && (
        <div style={{ padding: '5px 8px', background: ui.bg }}>
          {locals.map(([name, value]) => (
            <div key={name} style={{
              display: 'flex', gap: 8, fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace', marginBottom: 2,
            }}>
              <span style={{ color: ui.cyan, minWidth: 80 }}>{name}</span>
              <span style={{ color: ui.green, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={localText(value, heap.snapshot, heap.language, 400)}>
                {localText(value, heap.snapshot, heap.language)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type CodeTab = 'structure' | 'tokens' | 'ast'

interface FnModalState { node: CallGraphNode; callGraph: CallGraph | undefined }

interface CodeLensProps {
  onBack: () => void
  initialCode?: string
  initialLang?: string
  backLabel?: string
}

function CodeLensInner({ onBack, initialCode, initialLang, backLabel }: CodeLensProps) {
  const { themeId, setThemeId, theme: activeTheme } = useCodeLensTheme()
  const ui = activeTheme.ui
  const [lang, setLang]             = useState<Lang>(() => {
    if (initialLang === 'ts') return 'ts'
    if (initialLang === 'py') return 'py'
    if (initialLang === 'go') return 'go'
    if (initialLang === 'c') return 'c'
    if (initialLang === 'cpp') return 'cpp'
    if (initialLang === 'cs' || initialLang === 'csharp') return 'cs'
    return 'js'
  })
  const [source, setSource]         = useState(() => {
    if (initialCode) return initialCode
    if (initialLang === 'ts') return STARTER_TS
    if (initialLang === 'py') return STARTER_PY
    if (initialLang === 'go') return STARTER_GO
    if (initialLang === 'c') return STARTER_C
    if (initialLang === 'cpp') return STARTER_CPP
    if (initialLang === 'cs' || initialLang === 'csharp') return STARTER_CS
    return STARTER
  })
  const [model, setModel]           = useState<ProgramModel | null>(null)
  const [execution, setExecution]   = useState<ExecutionResult | null>(null)
  const [step, setStep]             = useState(0)
  const [running, setRunning]       = useState(false)
  const [workspace, setWorkspace] = useState(readWorkspace)
  useEffect(() => {
    try { localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace)) } catch { /* storage may be unavailable */ }
  }, [workspace])
  const openInspector = useCallback((id: InspectorId) => setWorkspace(current => activateInspector(current, id)), [])
  const [codeModalTab, setCodeModalTab] = useState<CodeTab | null>(null)
  const [showThemes, setShowThemes] = useState(false)
  const [showSandboxGuide, setShowSandboxGuide] = useState(false)
  // The learning library: open or closed (and on which example), and the example loaded
  // into the editor, so it can be reset and its notes shown beside the code.
  const [libraryOpen, setLibraryOpen] = useState<string | true | null>(null)
  const [loadedExample, setLoadedExample] = useState<{ example: LibraryExample; lang: Lang } | null>(null)
  const [showWatch, setShowWatch]   = useState(false)
  const [playing, setPlaying]       = useState(false)
  const [playSpeed, setPlaySpeed]   = useState('1x')
  const [fnModal, setFnModal]       = useState<FnModalState | null>(null)
  const [editorW, setEditorW]       = useState<number | null>(null)  // null = auto flex-grow
  const [breakpoints, setBreakpoints] = useState<Set<number>>(() => new Set())
  // The Input box: what the program reads while it's traced (scriptedInput.ts).
  const [inputText, setInputText]   = useState('')
  const [inputOpen, setInputOpen]   = useState(false)
  const scriptedInput = useMemo(() => parseScriptedInput(inputText), [inputText])
  // Opens by itself once the program reads input; only the learner closes it.
  const programReadsInput = readsInput(source, lang)
  useEffect(() => { if (programReadsInput) setInputOpen(true) }, [programReadsInput])
  const eventListRef                = useRef<HTMLDivElement>(null)
  const editorRef                   = useRef<Parameters<NonNullable<Parameters<typeof Editor>[0]['onMount']>>[0] | null>(null)
  const decorRef                    = useRef<string[]>([])
  const bpDecorRef                  = useRef<string[]>([])
  const shadowDecorRef              = useRef<string[]>([])
  const editorColRef                = useRef<HTMLDivElement>(null)
  const activeExecutionRef         = useRef<Pick<JavaScriptExecutionHandle, 'stop'> | null>(null)
  // Where the last run happened, e.g. "your Python 3.13.14" on the desktop app.
  const [runHost, setRunHost]       = useState<string | null>(null)
  // What the desktop Python environment is doing before the trace, e.g. "Installing pygame-ce…".
  const [runProgress, setRunProgress] = useState<string | null>(null)
  // Languages beyond JS/TS/Python, offered only where they can actually run: C and C++
  // need the desktop app with GDB; Go needs the CodeLens backend with go and dlv.
  const [extraLangs, setExtraLangs] = useState<Lang[]>([])
  // The desktop app's CodeLens Python environment, for the Packages menu; null elsewhere.
  const [pythonEnv, setPythonEnv]   = useState<CodeLensPythonStatus | null>(null)
  const [showPackages, setShowPackages] = useState(false)
  useEffect(() => { codelensPythonStatus().then(setPythonEnv) }, [])
  useEffect(() => {
    let alive = true
    nativeToolchains().then(toolchains => {
      if (!alive || !toolchains) return
      const native = (['c', 'cpp', 'cs'] as NativeLang[]).filter(l => toolchains.languages[l])
      setExtraLangs(current => [...new Set([...current, ...native])])
    })
    checkBackendTools().then((tools: any) => {
      if (alive && tools?.go?.ok && tools?.dlv?.ok) setExtraLangs(current => [...new Set([...current, 'go' as Lang])])
    })
    return () => { alive = false }
  }, [])
  const runGenerationRef           = useRef(0)
  // Tracks the source that produced `execution` — editing the code without
  // re-running previously left the OLD run's current-line highlight/shadow
  // decorations sitting on the NEW, unrelated text (looked broken/stuck, so
  // users had to copy their edit out, force a reset, and paste it back in).
  const lastRunSourceRef            = useRef<string | null>(null)
  const monaco                      = useMonaco()

  const totalSteps   = execution?.events?.length ?? 0
  const currentEvent: TraceEvent | null = execution?.events?.[step]      ?? null
  const prevEvent: TraceEvent | null    = execution?.events?.[step - 1]  ?? null
  // Python: the current line's sub-expressions in evaluation order (ExpressionSteps.tsx),
  // and which one is highlighted in the editor. A new step starts with none highlighted.
  const expressionSteps: [number, unknown][] = currentEvent?.type === 'statement_enter'
    ? ((currentEvent.outcome as { expressions?: [number, unknown][] } | undefined)?.expressions ?? [])
    : []
  const [expressionPart, setExpressionPart] = useState<number | null>(null)
  useEffect(() => { setExpressionPart(null) }, [step, execution])
  const expressionDecorRef = useRef<string[]>([])
  useEffect(() => {
    const ed = editorRef.current
    if (!ed || !monaco) return
    const span = expressionPart !== null ? execution?.expressions?.[expressionSteps[expressionPart]?.[0]] : undefined
    const stale = source !== lastRunSourceRef.current
    expressionDecorRef.current = ed.deltaDecorations(expressionDecorRef.current, span && !stale ? [{
      // The tracer's columns count from 0; Monaco's from 1.
      range: new monaco.Range(span.line, span.col + 1, span.endLine, span.endCol + 1),
      options: { className: 'cl-expression-part', hoverMessage: { value: `\`${span.code}\`` } },
    }] : [])
  }, [expressionPart, step, execution, monaco, source]) // eslint-disable-line react-hooks/exhaustive-deps
  const compilerDiagnostics = source === lastRunSourceRef.current
    ? execution?.diagnostics ?? []
    : []

  // Playback from the keyboard: ← → step, Home/End jump, Space plays or pauses. Not while
  // typing in the editor or a field, where those keys edit text.
  // Also called for keys pressed in the pop-out screen window (DataDock / ScreenPopOut).
  const stepFromKey = useCallback((e: KeyboardEvent) => {
    if (!totalSteps) return
    const target = e.target as HTMLElement | null
    if (e.altKey || e.ctrlKey || e.metaKey || !target) return
    if (target.closest?.('input, textarea, select, [contenteditable="true"], .monaco-editor, [role="dialog"]')) return
    const go = (to: number) => { e.preventDefault(); setPlaying(false); setStep(Math.max(0, Math.min(totalSteps - 1, to))) }
    if (e.key === 'ArrowRight') go(step + 1)
    else if (e.key === 'ArrowLeft') go(step - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(totalSteps - 1)
    else if (e.key === ' ' && target.tagName !== 'BUTTON') { e.preventDefault(); setPlaying(p => !p) }
  }, [step, totalSteps])
  useEffect(() => {
    window.addEventListener('keydown', stepFromKey)
    return () => window.removeEventListener('keydown', stepFromKey)
  }, [stepFromKey])

  useEffect(() => () => {
    runGenerationRef.current += 1
    activeExecutionRef.current?.stop()
    activeExecutionRef.current = null
  }, [])

  // Parse live as we type (JS + TS only: the model comes from the JavaScript parser)
  useEffect(() => { if (lang === 'js' || lang === 'ts') setModel(buildProgramModel(source) as ProgramModel) }, [])
  useEffect(() => {
    if (lang !== 'js' && lang !== 'ts') { setModel(null); return }
    const id = setTimeout(() => setModel(buildProgramModel(source) as ProgramModel), 400)
    return () => clearTimeout(id)
  }, [source, lang])

  // Source line highlighting — update Monaco decoration on every step.
  // Guarded on lastRunSourceRef: if the editor no longer matches the source
  // that produced `execution`, the highlight/hint would land on unrelated
  // freshly-edited text (see lastRunSourceRef's comment) — show nothing
  // instead of a stale, misleading decoration.
  useEffect(() => {
    const ed = editorRef.current
    if (!ed || !monaco) return
    const stale = source !== lastRunSourceRef.current
    const line = stale ? undefined : currentEvent?.sourceLocation?.line
    if (!line) {
      decorRef.current = ed.deltaDecorations(decorRef.current, [])
      return
    }
    const explain = currentEvent ? explainEvent(currentEvent) : undefined
    const hintText = explain?.summary ? '   ⟵ ' + explain.summary.slice(0, 72) : ''
    // The `after` widget anchors to the RANGE's end column, not to the end
    // of the line's actual content — anchoring at column 1 (as this used to)
    // rendered the hint before any code on the line, where it was invisible.
    const endCol = ed.getModel()?.getLineMaxColumn(line) ?? 1
    decorRef.current = ed.deltaDecorations(decorRef.current, [{
      range: new monaco.Range(line, 1, line, endCol),
      options: {
        isWholeLine: true,
        className: 'cl-exec-line',
        overviewRuler: { color: '#6366f1', position: monaco.editor.OverviewRulerLane.Full },
        ...(hintText ? {
          after: {
            content: hintText,
            inlineClassName: 'cl-inline-hint',
          }
        } : {}),
      }
    }])
    ed.revealLineInCenterIfOutsideViewport(line)
  })

  // Auto-play
  usePlaybackTicker(playing && !!execution, SPEED_CONFIG[playSpeed] ?? SPEED_CONFIG['1x'], totalSteps, setStep, setPlaying)

  // Breakpoint gutter decorations
  useEffect(() => {
    const ed = editorRef.current
    if (!ed || !monaco) return
    bpDecorRef.current = ed.deltaDecorations(bpDecorRef.current,
      [...breakpoints].map(line => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: 'cl-bp-line',
          glyphMarginClassName: 'cl-bp-glyph',
          overviewRuler: { color: '#ef4444cc', position: monaco.editor.OverviewRulerLane.Right },
        }
      }))
    )
  }, [breakpoints, monaco])

  // Code shadow — faint tint + a dim inline hint on previously-visited
  // lines, each showing the last thing that happened there (up to the
  // current step) so scrolling back through visited code still reads as an
  // explanation trail, not just an unlabeled tint. Same staleness guard as
  // the current-line highlight above.
  useEffect(() => {
    const ed = editorRef.current
    const stale = source !== lastRunSourceRef.current
    if (!ed || !monaco || !execution || stale) {
      if (ed && monaco) shadowDecorRef.current = ed.deltaDecorations(shadowDecorRef.current, [])
      return
    }
    // Each earlier line keeps the explanation of the last time it ran (its statement_enter
    // with statement info), not a later bookkeeping event on that line such as its
    // statement's end or a block scope opening.
    const lastEventPerLine = new Map<number, TraceEvent>()
    const explainedLines = new Set<number>()
    for (let i = 0; i <= step; i++) {
      const evt = execution.events[i]
      const ln = evt?.sourceLocation?.line
      if (!ln) continue
      const explained = evt.type === 'statement_enter' && !!evt.statement
      if (explained) explainedLines.add(ln)
      if (explained || !explainedLines.has(ln)) lastEventPerLine.set(ln, evt)
    }
    const currentLine = execution.events[step]?.sourceLocation?.line
    if (currentLine) lastEventPerLine.delete(currentLine)
    const model = ed.getModel()
    shadowDecorRef.current = ed.deltaDecorations(shadowDecorRef.current,
      [...lastEventPerLine.entries()].map(([line, evt]) => {
        const summary = explainEvent(evt).summary
        const hintText = summary ? '   ⟵ ' + summary.slice(0, 60) : ''
        const endCol = model?.getLineMaxColumn(line) ?? 1
        return {
          range: new monaco.Range(line, 1, line, endCol),
          options: {
            isWholeLine: true,
            className: 'cl-shadow-line',
            ...(hintText ? {
              after: { content: hintText, inlineClassName: 'cl-inline-hint-dim' },
            } : {}),
          },
        }
      })
    )
  }, [step, execution, monaco, source])

  // Auto-scroll event list to current step
  useEffect(() => {
    if (!eventListRef.current) return
    const active = eventListRef.current.querySelector('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [step])

  const startEditorResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = editorColRef.current?.getBoundingClientRect().width ?? 400
    const onMove = (ev: MouseEvent) => {
      const w = Math.max(160, Math.min(startW + (ev.clientX - startX), window.innerWidth - 700))
      setEditorW(w)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  const handleRun = useCallback(async () => {
    const generation = ++runGenerationRef.current
    setRunning(true)
    setRunHost(null)
    setExecution(null)
    setStep(0)
    setPlaying(false)
    lastRunSourceRef.current = source
    try {
      let result: ExecutionResult
      if (lang === 'py') {
        setRunProgress(null)
        const handle = startPythonExecution(source, scriptedInput, line => {
          if (generation === runGenerationRef.current) setRunProgress(line.length > 90 ? `${line.slice(0, 89)}…` : line)
        })
        activeExecutionRef.current = handle
        handle.host.then(host => { if (generation === runGenerationRef.current) setRunHost(host) })
        result = withExecutionStatus(await handle.promise)
      } else if (lang === 'c' || lang === 'cpp' || lang === 'cs') {
        const handle = startNativeExecution(lang, source, stdinText(scriptedInput))
        activeExecutionRef.current = handle
        handle.host.then(host => { if (generation === runGenerationRef.current) setRunHost(host) })
        result = withExecutionStatus(await handle.promise)
      } else if (lang === 'go') {
        result = withExecutionStatus(await runNative(source, 'go'))
      } else {
        const handle = startJavaScriptExecution(source, lang, scriptedInput.stdin)
        activeExecutionRef.current = handle
        result = await handle.promise
      }
      if (generation !== runGenerationRef.current) return
      setExecution(result)
      setStep(0)
      setPlaying(false)
      openInspector('explain')
    } catch (error) {
      if (generation !== runGenerationRef.current) return
      setExecution({
        events: [],
        output: [],
        status: 'runtime-error',
        error: {
          type: error instanceof Error ? error.name : 'Error',
          message: error instanceof Error ? error.message : String(error),
        },
      })
      setStep(0)
      setPlaying(false)
      openInspector('explain')
    } finally {
      if (generation === runGenerationRef.current) {
        activeExecutionRef.current = null
        setRunning(false)
      }
    }
  }, [source, lang, scriptedInput])

  const handleStop = useCallback(() => {
    activeExecutionRef.current?.stop()
  }, [])

  const abandonActiveRun = useCallback(() => {
    runGenerationRef.current += 1
    activeExecutionRef.current?.stop()
    activeExecutionRef.current = null
    setRunning(false)
  }, [])

  const handleContinue = useCallback(() => {
    if (!execution) return
    setPlaying(false)
    const events = execution.events
    for (let i = step + 1; i < events.length; i++) {
      const line = events[i]?.sourceLocation?.line
      if (line && breakpoints.has(line)) { setStep(i); return }
    }
    setStep(events.length - 1)
  }, [step, execution, breakpoints])

  // The heap ("Structures") view needs heap events. The JavaScript interpreter always
  // produces them; other languages do when their tracer records objects (Python does).
  const hasHeapView = lang === 'js' || lang === 'ts' || !!execution?.events.some(e => (e.heapDelta?.length ?? 0) > 0)

  const CODE_TABS: { id: CodeTab; label: string; icon: LucideIcon }[] = (lang === 'c' || lang === 'cpp' || lang === 'cs')
    ? []   // no structure view for compiled languages yet
    : (lang === 'py' || lang === 'go')
    ? [{ id: 'structure', label: 'Structure', icon: Boxes }]
    : [
        { id: 'structure', label: 'Structure', icon: Boxes },
        { id: 'tokens',    label: 'Tokens',    icon: Zap },
        { id: 'ast',       label: 'AST',       icon: Braces },
      ]

  const heapSnapshot = (hasHeapView && execution)
    ? buildHeapSnapshot(execution.events, step)
    : null
  // The Data dock under the editor (DataDock.tsx) shows tables whenever the tracer recorded objects.
  const dockSnapshot = heapSnapshot ?? (execution ? buildHeapSnapshot(execution.events, step) : null)
  // For panels that show what objects hold (Call Stack, Values): renderer/valuePreview.ts.
  const heapPreview = useMemo(() => ({ snapshot: dockSnapshot, language: lang }), [dockSnapshot, lang])

  // Variable/function names pulled from the parsed AST/model, offered as
  // autocomplete suggestions in the floating Watch window instead of relying
  // on the user to remember and retype exact names from the source.
  const knownWatchNames = useMemo(() => {
    if (!model) return []
    const names = new Set<string>()
    model.variables?.forEach(v => names.add(v.name))
    model.callGraph?.nodes?.forEach(n => {
      names.add(n.name)
      n.params.forEach(p => names.add(p))
    })
    model.classes?.forEach(c => {
      c.methods.forEach(m => names.add(m.name))
    })
    return [...names].sort()
  }, [model])

  const inspectorTabs = [
    { id: 'explain' as const, label: 'Explain' }, { id: 'events' as const, label: 'Events' },
    { id: 'picture' as const, label: 'Picture' },
    { id: 'output' as const, label: 'Output' }, { id: 'variables' as const, label: 'Values' },
    { id: 'heap' as const, label: 'Structures' }, { id: 'calltree' as const, label: 'Calls' },
    { id: 'scope' as const, label: 'Scope' }, ...CODE_TABS,
    // A pygame program's window (python/codelens_pygame.py); also in the Data dock and a pop-out.
    ...((execution?.frames?.length ?? 0) > 0 ? [{ id: 'screen' as const, label: 'Screen' }] : []),
  ]
  const visibleOutput = useMemo(() => outputAtStep(execution, step), [execution, step])
  const renderInspector = (tabId: InspectorId) => (
    <div ref={tabId === 'events' ? eventListRef : undefined} style={{ height: '100%', overflow: 'auto', minWidth: 0 }}>
            {tabId === 'explain' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {currentEvent
                  ? <>
                      <ExplainHero event={currentEvent} prevEvent={prevEvent} step={step} total={totalSteps} />
                      {expressionSteps.length > 0 && execution?.expressions && (
                        <ExpressionSteps spans={execution.expressions} steps={expressionSteps} selected={expressionPart} onSelect={setExpressionPart} />
                      )}
                    </>
                  : <IdleHero />
                }
                {(currentEvent?.heapDelta?.length ?? 0) > 0 && (
                  <Panel title="Heap Changes" icon={Boxes} badge={currentEvent!.heapDelta!.length}>
                    {currentEvent!.heapDelta!.map((d, i) => (
                      <div key={i} style={{
                        padding: '5px 8px', borderRadius: 6, marginBottom: 4,
                        background: d.op === 'create' ? ui.greenDeep + '22' : ui.amberDeep + '22',
                        border: `1px solid ${d.op === 'create' ? ui.greenDeep : ui.amberDeep}`,
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                      }}>
                        <span style={{ color: d.op === 'create' ? ui.green : ui.amberSoft }}>
                          {d.op === 'create' ? `+ ${d.objectType} #${d.objectId}` : `~ #${d.objectId}.${(d as { property?: string }).property}`}
                        </span>
                        {d.op === 'mutate' && (
                          <span style={{ color: ui.textDim }}>
                            {' '}{formatValue((d as { oldValue?: unknown }).oldValue)} → {formatValue((d as { newValue?: unknown }).newValue)}
                          </span>
                        )}
                      </div>
                    ))}
                  </Panel>
                )}
                {currentEvent && (
                  <Panel title="Call Stack" icon={Code2} badge={currentEvent.stackSnapshot?.length ?? 0}>
                    {(currentEvent.stackSnapshot?.length ?? 0) > 0 ? (
                      // Innermost first; the JavaScript interpreter lists its global frame last,
                      // so put any global frame at the bottom.
                      [...currentEvent.stackSnapshot!].reverse()
                        .sort((a, b) => Number(a.name === '__global__') - Number(b.name === '__global__'))
                        .map((frame, i) => (
                        <StackFrame key={i} frame={frame} depth={i} />
                      ))
                    ) : (
                      <span style={{ color: ui.textFaint, fontSize: 12 }}>Global scope</span>
                    )}
                  </Panel>
                )}
              </div>
            )}
            {tabId === 'events' && (
              execution ? (
                execution.events.length === 0
                  ? <span style={{ color: ui.textFaint, fontSize: 12 }}>No events.</span>
                  : execution.events.map((evt, i) => (
                      <div
                        key={i}
                        data-active={i === step ? 'true' : 'false'}
                        onClick={() => setStep(i)}
                        style={{ opacity: i > step ? 0.35 : 1, cursor: 'pointer' }}
                      >
                        {i <= step ? <EventCard event={evt} active={i === step} /> : (
                          <div style={{ padding: 8, color: ui.textFaint, fontSize: 11 }}>Step {i + 1}: {eventLabel(evt)} — select to advance</div>
                        )}
                      </div>
                    ))
              ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%', gap: 10,
                }}>
                  <Play size={28} color={ui.accentDeep} />
                  <span style={{ fontSize: 13, color: ui.textMuted, textAlign: 'center' }}>
                    Press Run to execute the code<br />and see the event stream here.
                  </span>
                </div>
              )
            )}
            {tabId === 'screen' && execution?.frames && <ScreenPanel frames={execution.frames} event={currentEvent} fit="column" />}
            {tabId === 'output' && (
              visibleOutput.length > 0 ? (
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                  {visibleOutput.map((line, i) => (
                    <div key={i} style={{
                      padding: '3px 8px', borderRadius: 4, marginBottom: 2,
                      background: line.startsWith('[error]') ? '#7f1d1d22'
                        : line.startsWith('[warn]') ? ui.amberDeep + '22' : ui.panelBg,
                      color: line.startsWith('[error]') ? ui.redSoft
                        : line.startsWith('[warn]') ? ui.amberSoft : ui.green,
                    }}>
                      {line}
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ color: ui.textFaint, fontSize: 12 }}>
                  {execution ? 'No output at this step.' : 'Run code first.'}
                </span>
              )
            )}
            {tabId === 'variables' && (
              <VariableWatch
                currentEvent={currentEvent}
                prevEvent={prevEvent}
                heapSnapshot={dockSnapshot}
                heapDelta={currentEvent?.heapDelta}
                events={execution?.events}
                step={step}
                onSeek={(s) => { setPlaying(false); setStep(s) }}
                onShowEnvModel={() => openInspector('scope')}
              />
            )}
            {tabId === 'scope' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <button
                  onClick={() => openInspector('variables')}
                  style={{ background: 'none', border: 'none', borderBottom: `1px solid ${ui.border}`,
                    cursor: 'pointer', padding: '6px 10px', textAlign: 'left',
                    color: ui.borderStrong, fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                    flexShrink: 0 }}
                >
                  ← Back to Variables
                </button>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <ScopeChainView event={currentEvent} />
                </div>
              </div>
            )}
            {tabId === 'calltree' && (
              <CallTreeView
                events={execution?.events ?? []}
                step={step}
                onSeek={(s) => { setPlaying(false); setStep(s) }}
              />
            )}
            {tabId === 'heap' && (
              <HeapPanel snapshot={heapSnapshot} heapDelta={currentEvent?.heapDelta} />
            )}
            {tabId === 'picture' && (
              <Picture events={execution?.events ?? []} step={step} snapshot={dockSnapshot}
                source={lastRunSourceRef.current ?? source} lang={lang} />
            )}
      {tabId === 'structure' && (lang === 'py'
        ? <PyStructureView source={source} execution={execution} />
        : <StructureView model={model} currentEvent={currentEvent} onNodeClick={node => setFnModal({ node, callGraph: model?.callGraph })} />)}
      {tabId === 'tokens' && <TokensView model={model} source={source} />}
      {tabId === 'ast' && <AstView model={model} />}
    </div>
  )

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: ui.bg, color: ui.text,
    }}>
      <style>{`
        .cl-exec-line {
          background: rgba(99,102,241,0.14) !important;
          border-left: 3px solid #6366f1 !important;
        }
        .cl-inline-hint {
          color: #fbbf24 !important;
          opacity: 0.9 !important;
          font-style: italic !important;
          font-size: 11.5px !important;
          font-family: JetBrains Mono, monospace !important;
          letter-spacing: 0 !important;
          user-select: none !important;
          pointer-events: none !important;
        }
        .cl-shadow-line {
          background: rgba(99,102,241,0.05) !important;
        }
        .cl-expression-part {
          background: rgba(251,191,36,0.28) !important;
          outline: 1px solid rgba(251,191,36,0.8);
          border-radius: 2px;
        }
        .cl-inline-hint-dim {
          color: #64748b !important;
          opacity: 0.65 !important;
          font-style: italic !important;
          font-size: 11px !important;
          font-family: JetBrains Mono, monospace !important;
          letter-spacing: 0 !important;
          user-select: none !important;
          pointer-events: none !important;
        }
        .cl-bp-line {
          background: rgba(239,68,68,0.08) !important;
        }
        .cl-bp-glyph::after {
          content: '' !important;
          display: block !important;
          width: 10px !important;
          height: 10px !important;
          border-radius: 50% !important;
          background: radial-gradient(circle at 38% 38%, #f87171, #dc2626) !important;
          box-shadow: 0 0 5px #ef4444aa !important;
          margin: 3px auto !important;
        }
      `}</style>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', borderBottom: `1px solid ${ui.border}`,
        background: ui.headerBg, flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: ui.textFaint, display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 12, fontWeight: 500,
        }}>
          <ArrowLeft size={14} />
          {backLabel || 'UpSkillOS'}
        </button>
        <Code2 size={17} color={ui.accent} />
        <span style={{ fontWeight: 700, fontSize: 14 }}>CodeLens</span>
        <span style={{ fontSize: 12, color: ui.textFaint }}>· Execution Visualizer</span>
        {runHost && <span style={{ fontSize: 11, color: ui.textFaint }} title="Where the last run happened">· ran on {runHost}</span>}
        {running && runProgress && <span style={{ fontSize: 11, color: ui.amberSoft }} role="status">· {runProgress}</span>}

        {/* Language toggle */}
        <div style={{ display: 'flex', gap: 2, background: ui.panelBg,
          borderRadius: 6, padding: 2, border: `1px solid ${ui.border}` }}>
          {(
            [
              { id: 'js',  label: 'JS' },
              { id: 'ts',  label: 'TS' },
              { id: 'py',  label: 'Python' },
              ...extraLangs.filter(l => l === 'c').map(() => ({ id: 'c' as Lang, label: 'C' })),
              ...extraLangs.filter(l => l === 'cpp').map(() => ({ id: 'cpp' as Lang, label: 'C++' })),
              ...extraLangs.filter(l => l === 'cs').map(() => ({ id: 'cs' as Lang, label: 'C#' })),
              ...extraLangs.filter(l => l === 'go').map(() => ({ id: 'go' as Lang, label: 'Go' })),
            ] as { id: Lang; label: string }[]
          ).map(l => (
            <button key={l.id} onClick={() => {
              if (l.id === lang) return
              abandonActiveRun()
              setLang(l.id)
              const starters: Record<string, string> = { py: STARTER_PY, ts: STARTER_TS, go: STARTER_GO, c: STARTER_C, cpp: STARTER_CPP, cs: STARTER_CS }
              setSource(starters[l.id] ?? STARTER)
              setExecution(null)
              setStep(0)
              setModel(null)
              openInspector('variables')
              setBreakpoints(new Set())
            }} style={{
              padding: '3px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
              fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
              background: lang === l.id ? ui.accentBgSolid : 'transparent',
              color:      lang === l.id ? ui.accentBright  : ui.textFaint,
            }}>{l.label}</button>
          ))}
        </div>

        {(lang === 'js' || lang === 'ts') && (
          <Btn onClick={() => setShowSandboxGuide(true)} title="See supported JavaScript and TypeScript features">
            <Info size={12} /> Sandbox
          </Btn>
        )}

        {/* The learning library (library.ts) */}
        <Btn onClick={() => setLibraryOpen(true)} title="Browse examples with notes, in every language">
          <BookOpen size={12} /> Library
        </Btn>

        {/* Desktop app: CodeLens's Python environment and its packages (PackagesDialog.tsx) */}
        {lang === 'py' && pythonEnv && (
          <Btn onClick={() => setShowPackages(true)} title="The Python packages CodeLens's environment has: install, change version, remove">
            <Package size={12} /> Packages
          </Btn>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Structure/Tokens/AST — buttons along the header, not a body
              column: these are on-demand detail views, not something that
              should permanently claim width from Run/Data's visualizations. */}
          {CODE_TABS.map(({ id, label, icon: Icon }) => (
            <Btn key={id} onClick={() => setCodeModalTab(id)} title={`View ${label}`}>
              <Icon size={12} />
              {label}
            </Btn>
          ))}

          {/* Watch window toggle */}
          <Btn
            onClick={() => setShowWatch(v => !v)}
            active={showWatch}
            title="Open floating watch window"
          >
            <Eye size={12} />
            Watch
          </Btn>

          {/* Theme picker — now recolors the whole UI, not just the editor */}
          <div style={{ position: 'relative' }}>
            <Btn onClick={() => setShowThemes(v => !v)} active={showThemes} title="Theme">
              <Palette size={12} />
              {activeTheme.label}
            </Btn>
            {showThemes && (
              <div style={{
                position: 'absolute', top: '110%', right: 0, zIndex: 100,
                background: ui.panelBg, border: `1px solid ${ui.borderStrong}`, borderRadius: 8,
                padding: 4, minWidth: 140,
              }}>
                {CODELENS_THEMES.map(t => (
                  <div
                    key={t.id}
                    onClick={() => { setThemeId(t.id); setShowThemes(false) }}
                    style={{
                      padding: '6px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 12,
                      background: themeId === t.id ? ui.border : 'transparent',
                      color: themeId === t.id ? ui.accentBright : ui.textSoft,
                    }}
                  >
                    {t.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Run button */}
          {running ? (
            <Btn onClick={handleStop} title="Stop this run and keep the trace collected so far">
              <Square size={12} fill="currentColor" /> Stop
            </Btn>
          ) : (
            <PrimaryRunBtn onClick={handleRun} disabled={running}>
              <Play size={14} fill="currentColor" />
              {running
                ? (lang === 'py' ? 'Running Python…' : lang === 'c' || lang === 'cpp' || lang === 'cs' ? 'Compiling and tracing…' : 'Building Go…')
                : execution && source === lastRunSourceRef.current ? 'Run again' : 'Run'}
            </PrimaryRunBtn>
          )}
        </div>

        {model?.error && (
          <span style={{
            fontSize: 11, background: '#7f1d1d', color: ui.redSoft,
            padding: '2px 8px', borderRadius: 5,
          }}>
            L{model.error.line}: {model.error.message}
          </span>
        )}
        {compilerDiagnostics.length > 0 && (
          <span
            title={compilerDiagnostics.map(diagnostic => (
              `TS${diagnostic.code}${diagnostic.line ? ` L${diagnostic.line}` : ''}: ${diagnostic.message}`
            )).join('\n')}
            style={{
              fontSize: 11,
              background: compilerDiagnostics.some(diagnostic => diagnostic.category === 'error')
                ? '#7f1d1d'
                : '#78350f',
              color: compilerDiagnostics.some(diagnostic => diagnostic.category === 'error')
                ? ui.redSoft
                : ui.amberSoft,
              padding: '2px 8px',
              borderRadius: 5,
              maxWidth: 420,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            TypeScript · {compilerDiagnostics[0].line ? `L${compilerDiagnostics[0].line} · ` : ''}
            TS{compilerDiagnostics[0].code}: {compilerDiagnostics[0].message}
            {compilerDiagnostics.length > 1 ? ` (+${compilerDiagnostics.length - 1})` : ''}
          </span>
        )}
      </div>

      {/* ── Video-style playback controls ── */}
      {execution && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderBottom: `1px solid ${ui.border}`,
          background: ui.bg, flexShrink: 0, flexWrap: 'wrap',
        }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 99,
            padding: '2px 7px',
            color: execution.status === 'completed' ? ui.green
              : execution.status === 'limit' || execution.status === 'unsupported' ? ui.amber
                : execution.status === 'stopped' ? ui.textSoft
                  : ui.red,
            border: `1px solid ${execution.status === 'completed' ? ui.green
              : execution.status === 'limit' || execution.status === 'unsupported' ? ui.amber
                : execution.status === 'stopped' ? ui.borderStrong
                  : ui.red}66`,
          }}>
            {execution.status === 'completed' ? 'Completed'
              : execution.status === 'limit' ? 'Limit reached'
                : execution.status === 'unsupported' ? 'Unsupported feature'
                : execution.status === 'stopped' ? 'Stopped'
                  : execution.status === 'syntax-error' ? 'Syntax error'
                    : 'Runtime error'}
          </span>
          {/* Step controls */}
          <Btn onClick={() => { setPlaying(false); setStep(0) }} disabled={step === 0} title="Jump to start">
            <SkipForward size={11} style={{ transform: 'scaleX(-1)' }} />
          </Btn>
          <Btn onClick={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)) }} disabled={step === 0} title="Step back">
            <StepBack size={11} /> Back
          </Btn>
          <Btn onClick={() => { setPlaying(false); setStep(s => Math.min(totalSteps - 1, s + 1)) }} disabled={step >= totalSteps - 1} title="Step forward">
            <StepForward size={11} /> Step
          </Btn>
          <Btn onClick={() => { setPlaying(false); setStep(totalSteps - 1) }} disabled={step >= totalSteps - 1} title="Jump to end">
            <SkipForward size={11} />
          </Btn>

          {/* Continue to breakpoint */}
          {breakpoints.size > 0 && (
            <>
              <div style={{ width: 1, height: 16, background: ui.border, margin: '0 2px' }} />
              <Btn
                onClick={handleContinue}
                disabled={!execution || step >= totalSteps - 1}
                title="Continue to next breakpoint (F8)"
              >
                <span style={{ fontSize: 10 }}>⬤</span> Continue
              </Btn>
            </>
          )}

          {/* Play / pause */}
          <div style={{ width: 1, height: 16, background: ui.border, margin: '0 2px' }} />
          <Btn
            onClick={() => setPlaying(p => !p)}
            disabled={step >= totalSteps - 1 && !playing}
            active={playing}
            title={playing ? 'Pause' : 'Play through'}
          >
            {playing ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Play</>}
          </Btn>

          {/* Scrubber */}
          <input
            type="range" min={0} max={Math.max(0, totalSteps - 1)} value={step}
            onChange={e => { setPlaying(false); setStep(Number(e.target.value)) }}
            disabled={totalSteps === 0}
            style={{ flex: 1, minWidth: 80, accentColor: ui.accentSolid }}
          />
          <span style={{ fontSize: 10, color: ui.textFaint, whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace' }}>
            {totalSteps === 0 ? '0/0' : `${step + 1}/${totalSteps}`}
          </span>

          {/* Speed */}
          <div style={{ display: 'flex', gap: 2, borderLeft: `1px solid ${ui.border}`, paddingLeft: 6 }}>
            {Object.keys(SPEED_CONFIG).map(sp => (
              <button key={sp} onClick={() => setPlaySpeed(sp)} style={{
                background: playSpeed === sp ? ui.accentBgSolid : 'transparent',
                border: `1px solid ${playSpeed === sp ? ui.accentSolid : ui.border}`,
                color: playSpeed === sp ? ui.accentBright : ui.textFaint,
                borderRadius: 4, padding: '2px 5px', cursor: 'pointer',
                fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
              }}>{sp}</button>
            ))}
          </div>

          {execution.error && !execution.limit && (
            <span style={{ fontSize: 10, color: execution.status === 'unsupported' ? ui.amber : ui.red }}>
              {execution.error.type}: {execution.error.message}
            </span>
          )}
        </div>
      )}

      {execution?.limit && (
        <div role="alert" style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '9px 14px', borderBottom: `1px solid ${ui.amberDeep}`,
          background: ui.amberDeep + '22', color: ui.amberSoft, flexShrink: 0,
        }}>
          <Info size={16} style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            <strong>CodeLens stopped this run to stay responsive.</strong>{' '}
            {`${execution.limit.message}. ${limitGuidance(execution.limit.kind)}`}
          </div>
        </div>
      )}

      {execution?.status === 'unsupported' && execution.error && (
        <div role="alert" style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '9px 14px', borderBottom: `1px solid ${ui.amberDeep}`,
          background: ui.amberDeep + '22', color: ui.amberSoft, flexShrink: 0,
        }}>
          <Info size={16} style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            <strong>This code uses a feature outside the CodeLens sandbox.</strong>{' '}
            {execution.error.message}
          </div>
        </div>
      )}

      {/* ── Stack depth meter ── */}
      {execution && (
        <StackDepthMeter
          events={execution.events}
          step={step}
          onSeek={(s) => { setPlaying(false); setStep(s) }}
        />
      )}

      {/* Each step's explanation, read out by screen readers as the step changes. */}
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
        {currentEvent ? `Step ${step + 1} of ${totalSteps}, line ${currentEvent.sourceLocation?.line ?? ''}: ${explainEvent(currentEvent).summary}` : ''}
      </div>

      {/* ── The loaded library example: what to watch, reset, notes ── */}
      {loadedExample && (
        <div role="note" aria-label="Example notes" style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', flexWrap: 'wrap',
          borderBottom: `1px solid ${ui.border}`, background: ui.headerBg, fontSize: 12, color: ui.textSoft,
        }}>
          <BookOpen size={13} color={ui.accent} />
          <strong style={{ color: ui.text }}>{loadedExample.example.title}</strong>
          <span style={{ color: ui.textMuted }}>{LANGUAGE_LABELS[loadedExample.lang]}</span>
          <span style={{ flex: 1, minWidth: 200, color: ui.textMuted }}>Watch: {loadedExample.example.watch[0].replace(/`/g, '')}</span>
          <Btn
            onClick={() => {
              abandonActiveRun()
              setSource(loadedExample.example.variants[loadedExample.lang]!.code)
              setExecution(null); setStep(0)
            }}
            disabled={source === loadedExample.example.variants[loadedExample.lang]!.code}
            title="Put the example back the way it was"
          >
            <RotateCcw size={12} /> Reset
          </Btn>
          <Btn onClick={() => setLibraryOpen(loadedExample.example.id)} title="Concept, what to watch, exercises">
            <Info size={12} /> Notes
          </Btn>
          <button onClick={() => setLoadedExample(null)} aria-label="Hide the example notes" style={{ background: 'none', border: 'none', color: ui.textMuted, cursor: 'pointer' }}><X size={14} /></button>
        </div>
      )}

      {/* ── Body ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'stretch',
        gap: 0, padding: 10, minHeight: 0, overflow: 'hidden',
      }}>
        {/* Left: editor — flex-grow unless manually resized */}
        <div
          ref={editorColRef}
          style={{
            flex: editorW ? `0 0 ${editorW}px` : '1 1 0',
            minWidth: 160, display: 'flex', flexDirection: 'column', minHeight: 0,
          }}
        >
          <div style={{
            flex: 1, background: ui.panelBg, border: `1px solid ${ui.border}`,
            // The Input box and the Data dock sit below; the editor keeps room to read code.
            borderRadius: 10, overflow: 'hidden', minHeight: 160,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 12px', borderBottom: `1px solid ${ui.border}`,
              background: ui.headerBg,
            }}>
              <Code2 size={13} color={ui.accent} />
              <span style={{ fontSize: 11, fontWeight: 600, color: ui.text }}>Source</span>
              <span style={{ fontSize: 10, color: ui.textFaint, marginLeft: 'auto' }}>
                {lang === 'ts' ? 'TypeScript' : lang === 'py' ? 'Python' : lang === 'go' ? 'Go' : lang === 'c' ? 'C' : lang === 'cpp' ? 'C++' : lang === 'cs' ? 'C#' : 'JavaScript'}
              </span>
            </div>
            <div style={{ height: 'calc(100% - 33px)' }}>
              <Editor
                height="100%"
                // One editor model per language. With a single shared model, the JavaScript
                // checker's error squiggles stayed on it after switching to C++ or Python,
                // underlining valid code that the JavaScript checker couldn't parse.
                path={`codelens/program.${lang}`}
                language={lang === 'py' ? 'python' : lang === 'ts' ? 'typescript' : lang === 'go' ? 'go' : lang === 'c' ? 'c' : lang === 'cpp' ? 'cpp' : lang === 'cs' ? 'csharp' : 'javascript'}
                value={source}
                onChange={v => setSource(v ?? '')}
                theme={activeTheme.monaco}
                beforeMount={setupOpenCalcMonaco}
                onMount={(ed, mo) => {
                  editorRef.current = ed
                  ed.onMouseDown((e) => {
                    const T = mo.editor.MouseTargetType
                    if (
                      e.target.type === T.GUTTER_LINE_NUMBERS ||
                      e.target.type === T.GUTTER_GLYPH_MARGIN
                    ) {
                      const line = e.target.position?.lineNumber
                      if (!line) return
                      setBreakpoints(prev => {
                        const next = new Set(prev)
                        if (next.has(line)) next.delete(line)
                        else next.add(line)
                        return next
                      })
                    }
                  })
                }}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  glyphMargin: true,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  fontFamily: 'JetBrains Mono, monospace',
                  padding: { top: 10 },
                }}
              />
            </div>
          </div>
          <InputPanel
            lang={lang}
            value={inputText}
            onChange={setInputText}
            parsed={scriptedInput}
            open={inputOpen}
            onToggle={() => setInputOpen(open => !open)}
          />
          {/* Tables and the pygame screen, at a fixed height so nothing moves while stepping. */}
          {execution && <DataDock lang={lang} snapshot={dockSnapshot} event={currentEvent} frames={execution.frames} onStepKey={stepFromKey} />}
        </div>

        {/* ── Drag handle ── */}
        <div
          onMouseDown={startEditorResize}
          title="Drag to resize editor"
          style={{
            width: 9, flexShrink: 0, cursor: 'col-resize', alignSelf: 'stretch',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 2px',
          }}
        >
          <div style={{
            width: 2, height: 36, borderRadius: 1,
            background: ui.border, pointerEvents: 'none',
          }} />
        </div>

        <HeapPreviewContext.Provider value={heapPreview}>
          <InspectorWorkspace state={workspace} onChange={setWorkspace} tabs={inspectorTabs} render={renderInspector} />
        </HeapPreviewContext.Provider>

      </div>

      {/* ── Code detail modal (Structure / Tokens / AST) ── */}
      {/* Triggered from header buttons, not a body column — these are
          on-demand full-size overlays (a call graph, a two-pane annotated-
          source-plus-inspector split, a deep tree) that need real width and
          shouldn't permanently take space away from Run/Data's charts. */}
      {codeModalTab && (
        <CodeDetailModal
          title={CODE_TABS.find(t => t.id === codeModalTab)?.label ?? ''}
          icon={CODE_TABS.find(t => t.id === codeModalTab)?.icon}
          onClose={() => setCodeModalTab(null)}
        >
          {codeModalTab === 'structure' && (lang === 'py'
            ? <PyStructureView source={source} execution={execution} />
            : <StructureView model={model} currentEvent={currentEvent} onNodeClick={node => setFnModal({ node, callGraph: model?.callGraph })} />
          )}
          {codeModalTab === 'tokens' && <TokensView model={model} source={source} />}
          {codeModalTab === 'ast'    && <AstView model={model} />}
        </CodeDetailModal>
      )}

      {libraryOpen !== null && (
        <LibraryBrowser
          available={['js', 'ts', 'py', ...extraLangs]}
          preferredLang={lang}
          initialExampleId={typeof libraryOpen === 'string' ? libraryOpen : loadedExample?.example.id}
          onClose={() => setLibraryOpen(null)}
          onLoad={(example, exampleLang) => {
            abandonActiveRun()
            setLang(exampleLang)
            setSource(example.variants[exampleLang]!.code)
            // The input belongs to the program: load the example's, or empty the box.
            setInputText(example.variants[exampleLang]!.input ?? '')
            if (example.variants[exampleLang]!.input) setInputOpen(true)
            setExecution(null)
            setStep(0)
            setModel(null)
            setLoadedExample({ example, lang: exampleLang })
            setLibraryOpen(null)
          }}
        />
      )}

      {showPackages && pythonEnv && <PackagesDialog status={pythonEnv} onClose={() => setShowPackages(false)} />}

      {showSandboxGuide && (
        <CodeDetailModal title="JavaScript and TypeScript sandbox" icon={Info} onClose={() => setShowSandboxGuide(false)}>
          <SandboxGuide />
        </CodeDetailModal>
      )}

      {/* ── Function detail modal ── */}
      {fnModal && (
        <FunctionModal
          node={fnModal.node}
          callGraph={fnModal.callGraph}
          onClose={() => setFnModal(null)}
        />
      )}

      {/* ── Floating watch window ── */}
      {showWatch && (
        <WatchWindow
          snapshot={heapSnapshot}
          currentEvent={currentEvent}
          onClose={() => setShowWatch(false)}
          knownNames={knownWatchNames}
        />
      )}
    </div>
  )
}

export default function CodeLens(props: CodeLensProps) {
  return (
    <CodeLensThemeProvider>
      <CodeLensInner {...props} />
    </CodeLensThemeProvider>
  )
}

// ── Inline code renderer ─────────────────────────────────────────────────────
// Converts `backtick-wrapped` segments in explanation strings to styled <code>.

function InlineText({ text }: { text?: string }) {
  if (!text) return null
  const parts = String(text).split(/(`[^`\n]+`)/)
  return parts.map((part, i) =>
    part.startsWith('`') && part.endsWith('`') ? (
      <code key={i} style={{
        background: '#1e293b', color: '#7dd3fc',
        padding: '1px 5px', borderRadius: 3,
        fontSize: '0.88em', fontFamily: 'JetBrains Mono, monospace',
      }}>{part.slice(1, -1)}</code>
    ) : part
  )
}

// ── Explain hero ─────────────────────────────────────────────────────────────

function eventColor(type: string, ui: CodeLensUiPalette): string {
  const EVENT_COLOR: Record<string, string> = {
    CALL: ui.accent, RETURN: ui.green, DECLARE: ui.cyan, ASSIGN: ui.amber,
    BRANCH: ui.pink, LOOP: ui.amberSoft, OBJECT_CREATE: ui.purple,
    OBJECT_MUTATE: ui.amberDeep, THROW: ui.red, CATCH: ui.greenBright, BUILTIN: ui.textDim,
  }
  for (const [k, v] of Object.entries(EVENT_COLOR)) {
    if (type.toUpperCase().startsWith(k)) return v
  }
  return ui.textDim
}

function ExplainHero({ event, prevEvent, step, total }: { event: TraceEvent; prevEvent: TraceEvent | null; step: number; total: number }) {
  const { theme: { ui } } = useCodeLensTheme()
  const explain = explainEvent(event)
  const color   = eventColor(event.type, ui)
  const loc     = event.sourceLocation
  const narration = buildNarration(event, prevEvent)

  return (
    <div style={{
      background: ui.headerBg,
      border: `1px solid ${color}33`,
      borderRadius: 12,
      padding: '16px 16px 14px',
      flexShrink: 0,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle glow band at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${color}88, ${color}22)`,
        borderRadius: '12px 12px 0 0',
      }} />

      {/* Type + concept row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <span style={{
          fontSize: 10, padding: '2px 7px', borderRadius: 99,
          background: `${color}22`, color, border: `1px solid ${color}55`,
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '.04em',
        }}>{eventLabel(event)}</span>
        {explain.concept && <ConceptBadge concept={explain.concept} />}
        {loc && (
          <span style={{
            marginLeft: 'auto', fontSize: 10,
            color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace',
          }}>L{loc.line}</span>
        )}
      </div>

      {/* Summary — the hero text */}
      <div style={{
        fontSize: 14, fontWeight: 600, color: ui.textBright,
        lineHeight: 1.5, marginBottom: explain.why ? 12 : 0,
      }}>
        <InlineText text={explain.summary} />
      </div>

      {/* Why — the explanation */}
      {explain.why && (
        <div style={{
          fontSize: 12, color: ui.textMuted, lineHeight: 1.7,
          borderTop: `1px solid ${ui.border}`, paddingTop: 10,
        }}>
          <InlineText text={explain.why} />
        </div>
      )}

      {/* In plain terms — folded in from the old standalone bottom narration
          bar, which duplicated this same information as a second
          permanently-visible strip. */}
      {narration && (
        <div style={{
          marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 8,
          fontSize: 12, color: ui.textMuted, lineHeight: 1.6,
          borderTop: `1px solid ${ui.border}`, paddingTop: 10,
        }}>
          <span style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 4, flexShrink: 0,
            background: ui.accentBg, color: ui.accent,
            fontFamily: 'JetBrains Mono, monospace', marginTop: 1,
          }}>plain terms</span>
          <span style={{ flex: 1 }}><InlineText text={narration} /></span>
        </div>
      )}

      {/* Step counter */}
      <div style={{
        marginTop: 12, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          flex: 1, height: 2, background: ui.border, borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${((step + 1) / total) * 100}%`,
            background: color, borderRadius: 2,
            transition: 'width 0.15s',
          }} />
        </div>
        <span style={{
          fontSize: 10, color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace',
          whiteSpace: 'nowrap',
        }}>{step + 1} / {total}</span>
      </div>
    </div>
  )
}

const IDLE_CARDS: { icon: string; colorKey: 'accent' | 'amber' | 'green'; title: string; desc: string }[] = [
  {
    icon: '📚',
    colorKey: 'accent',
    title: 'Call Stack',
    desc: 'See every function call open and close in real time. Understand how recursion builds frames — and how they unwind.',
  },
  {
    icon: '🔍',
    colorKey: 'amber',
    title: 'Variable Watch',
    desc: 'Track how variables change as each line runs. Spot mutations, scope boundaries, and value flow instantly.',
  },
  {
    icon: '🧠',
    colorKey: 'green',
    title: 'Heap & Objects',
    desc: 'Watch objects get created and linked. Learn why two variables can point to the same object — and what that means.',
  },
]

function IdleHero() {
  const { theme: { ui } } = useCodeLensTheme()
  const [card, setCard] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setCard(c => (c + 1) % IDLE_CARDS.length), 3000)
    return () => clearInterval(id)
  }, [])

  const c = IDLE_CARDS[card]
  const color = ui[c.colorKey]

  return (
    <div style={{
      background: ui.headerBg, border: `1px solid ${color}33`, borderRadius: 12,
      padding: '20px 16px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 10, flexShrink: 0,
      transition: 'border-color 0.4s',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Top glow accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${color}99, ${color}22)`,
        borderRadius: '12px 12px 0 0',
        transition: 'background 0.4s',
      }} />

      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%', fontSize: 22,
        background: `${color}18`, border: `1px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {c.icon}
      </div>

      {/* Content */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 5, transition: 'color 0.3s' }}>
          {c.title}
        </div>
        <div style={{ fontSize: 11, color: ui.textMuted, lineHeight: 1.65, maxWidth: 220 }}>
          {c.desc}
        </div>
      </div>

      {/* Dot indicators */}
      <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
        {IDLE_CARDS.map((_, i) => (
          <div
            key={i}
            onClick={() => setCard(i)}
            style={{
              width: i === card ? 16 : 5, height: 5, borderRadius: 99,
              background: i === card ? color : ui.border,
              cursor: 'pointer', transition: 'all 0.25s',
            }}
          />
        ))}
      </div>

      {/* CTA */}
      <div style={{ fontSize: 11, color: ui.borderStrong, marginTop: 2 }}>
        Press <span style={{ color: ui.accent, fontFamily: 'JetBrains Mono, monospace' }}>Run</span> to begin
      </div>
    </div>
  )
}


// ── Heap panel ────────────────────────────────────────────────────────────────

function HeapPanel({ snapshot, heapDelta }: { snapshot: HeapSnapshot | null; heapDelta?: TraceEvent['heapDelta'] }) {
  const { theme: { ui } } = useCodeLensTheme()
  const [open, setOpen] = useState(false)
  const IC: CSSProperties = {
    background: ui.border, color: ui.cyan,
    padding: '1px 5px', borderRadius: 3,
    fontSize: '0.9em', fontFamily: 'JetBrains Mono, monospace',
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Legend bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
        borderBottom: `1px solid ${ui.border}`, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 9, color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '.08em' }}>HEAP</span>
        <HeapDot color={ui.green} label="new object" />
        <HeapDot color={ui.amberDeep} label="mutated" />
        <HeapDot color={ui.accent} label="existing" />
        <button onClick={() => setOpen(v => !v)} style={{
          marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
          color: open ? ui.accent : ui.borderStrong, fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace', padding: 0,
        }}>
          {open ? '▲ hide' : '? what is this'}
        </button>
      </div>

      {/* Collapsible explanation */}
      {open && (
        <div style={{
          padding: '12px 14px', background: ui.bg, borderBottom: `1px solid ${ui.border}`,
          fontSize: 12, color: ui.textMuted, lineHeight: 1.7, flexShrink: 0,
        }}>
          <div style={{ fontWeight: 700, color: ui.accent, marginBottom: 6 }}>The Heap — long-term memory</div>
          When you write <code style={IC}>new Node()</code>, <code style={IC}>[]</code>, or <code style={IC}>{'{}'}</code>,
          JavaScript allocates memory on the <em>heap</em> and gives your variable a <strong style={{ color: ui.textBright }}>reference</strong> — an arrow pointing to that memory, not a copy of the value.
          <br /><br />
          Unlike the <strong style={{ color: ui.textBright }}>call stack</strong> — which is destroyed when a function returns — heap objects
          persist until nothing holds a reference to them. At that point the garbage collector reclaims the memory.
          <br /><br />
          <strong>This is why mutation is powerful and dangerous.</strong> Multiple variables can hold references to the same object.
          Changing the object through any one of them changes it for all — there is only one copy.
          <br /><br />
          <em style={{ color: ui.textFaint }}>SICP Chapter 3.3: "Modeling with Mutable Data" — the environment model depends on understanding this distinction.</em>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <HeapGraph snapshot={snapshot} heapDelta={heapDelta} />
      </div>
    </div>
  )
}

function HeapDot({ color, label }: { color: string; label: string }) {
  const { theme: { ui } } = useCodeLensTheme()
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9,
      color: ui.textFaint, fontFamily: 'JetBrains Mono, monospace' }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, border: `2px solid ${color}`,
        display: 'inline-block', flexShrink: 0 }} />
      {label}
    </span>
  )
}

// ── Function detail modal ─────────────────────────────────────────────────────

function kColor(k: CallGraphNode['kind'], ui: CodeLensUiPalette): string {
  const KIND_COLOR_MAP: Record<string, string> = {
    function: ui.cyan, arrow: ui.green, method: ui.accent, constructor: ui.purple,
  }
  return KIND_COLOR_MAP[k] ?? ui.textDim
}

interface SicpNote { pattern?: string; body: string; practice?: string; sicp?: string | null }

function FunctionModal({ node, callGraph, onClose }: { node: CallGraphNode; callGraph: CallGraph | undefined; onClose: () => void }) {
  const { theme: { ui } } = useCodeLensTheme()
  const { nodes, edges } = callGraph ?? { nodes: [], edges: [] }

  const callsEdges   = edges.filter(e => e.from === node.id && !e.recursive)
  const calledByEdges = edges.filter(e => e.to === node.id && !e.recursive)
  const isRecursive  = edges.some(e => e.recursive && e.from === node.id)

  const callsNames    = callsEdges.map(e => nodes.find(n => n.id === e.to)?.name).filter((n): n is string => !!n)
  const calledByNames = calledByEdges.map(e => nodes.find(n => n.id === e.from)?.name).filter((n): n is string => !!n)
  const isEntryPoint  = calledByNames.length === 0
  const isLeaf        = callsNames.length === 0 && !isRecursive
  const color         = kColor(node.kind, ui)

  const sicp = getSICPNote(node, isRecursive, callsNames, isLeaf, calledByNames)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: ui.panelBg2, border: `1px solid ${ui.border}`, borderRadius: 14,
          padding: '24px 26px', maxWidth: 500, width: '100%', maxHeight: '82vh',
          overflow: 'auto', boxShadow: '0 30px 70px rgba(0,0,0,.7)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99,
                background: color + '22', color, border: `1px solid ${color}44`,
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                {node.kind}
              </span>
              {isRecursive && (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99,
                  background: ui.amberDeep + '22', color: ui.amber, border: `1px solid ${ui.amberDeep}44`,
                  fontFamily: 'JetBrains Mono, monospace' }}>
                  ↺ recursive
                </span>
              )}
              {isEntryPoint && (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99,
                  background: ui.accentBg, color: ui.cyan, border: `1px solid ${ui.accentBg}`,
                  fontFamily: 'JetBrains Mono, monospace' }}>
                  entry point
                </span>
              )}
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color }}>
              {node.name}
            </div>
            <div style={{ fontSize: 12, color: ui.textMuted, fontFamily: 'JetBrains Mono, monospace', marginTop: 3 }}>
              ({node.params.join(', ')})
              {node.line && <span style={{ marginLeft: 10, color: ui.borderStrong }}>line {node.line}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: ui.textFaint, fontSize: 22, lineHeight: 1, padding: 0,
          }}>×</button>
        </div>

        {/* ── What it does ── */}
        <ModalSection title="What this does">
          <p style={{ margin: 0, fontSize: 13, color: ui.textDim, lineHeight: 1.7 }}>
            <InlineText text={describeFn(node, callsNames, calledByNames, isRecursive, isLeaf, isEntryPoint)} />
          </p>
        </ModalSection>

        {/* ── Complexity ── */}
        {node.complexity && (
          <ModalSection title="Complexity">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <ComplexityBadge complexity={node.complexity} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: ui.textDim, lineHeight: 1.7 }}>
              <InlineText text={explainComplexity(node.complexity)} />
            </p>
          </ModalSection>
        )}

        {/* ── Relationships ── */}
        <ModalSection title="Relationships">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace' }}>
            {callsNames.length > 0 && (
              <RelRow icon="→" label="Calls" names={callsNames} color={ui.cyan} />
            )}
            {calledByNames.length > 0 && (
              <RelRow icon="←" label="Called by" names={calledByNames} color={ui.purple} />
            )}
            {isRecursive && (
              <RelRow icon="↺" label="Recursive" names={[node.name]} color={ui.amber} />
            )}
            {isLeaf && (
              <div style={{ color: ui.textFaint }}>Leaf function — calls nothing in this program.</div>
            )}
            {isEntryPoint && !isRecursive && (
              <div style={{ color: ui.textFaint }}>Not called by any other function — this is an entry point.</div>
            )}
          </div>
        </ModalSection>

        {/* ── Concepts ── */}
        {sicp && (
          <ModalSection title="Concepts">
            {sicp.pattern && (
              <span style={{
                display: 'inline-block', marginBottom: 10,
                fontSize: 10, padding: '2px 9px', borderRadius: 99,
                background: ui.border, color: ui.accentBright,
                border: `1px solid ${ui.accentSolid}55`,
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {sicp.pattern}
              </span>
            )}
            <p style={{ margin: '0 0 10px', fontSize: 13, color: ui.textDim, lineHeight: 1.7 }}>
              <InlineText text={sicp.body} />
            </p>
            {sicp.practice && (
              <div style={{
                borderLeft: `2px solid ${ui.amber}`, paddingLeft: 10,
                fontSize: 12, color: ui.textMuted, lineHeight: 1.65, marginBottom: 10,
              }}>
                <span style={{ color: ui.amber, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10 }}>IN PRACTICE  </span>
                <InlineText text={sicp.practice} />
              </div>
            )}
            {sicp.sicp && (
              <div style={{ fontSize: 11, color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace' }}>
                ↗ <InlineText text={sicp.sicp} />
              </div>
            )}
          </ModalSection>
        )}
      </div>
    </div>
  )
}

// ── Code detail modal — shared full-size overlay for Structure/Tokens/AST ──
// so those views get real width to render call graphs / annotated source /
// deep trees instead of squeezing into a permanent narrow column.

function CodeDetailModal({ title, icon: Icon, onClose, children }: { title: string; icon?: LucideIcon; onClose: () => void; children: ReactNode }) {
  const { theme: { ui } } = useCodeLensTheme()
  // Escape closes it; focus goes to its close button while open and back where it was after.
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const returnFocus = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); returnFocus?.focus?.() }
  }, [])
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: ui.panelBg, border: `1px solid ${ui.border}`, borderRadius: 12,
          width: '100%', maxWidth: 1100, height: '100%', display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div style={{
          padding: '12px 20px', borderBottom: `1px solid ${ui.border}`, background: ui.headerBg,
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          {Icon && <Icon size={16} color={ui.accent} />}
          <span style={{ fontWeight: 600, color: ui.text }}>{title}</span>
          <button ref={closeRef} onClick={onClose} aria-label={`Close ${title}`} style={{
            marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: ui.textMuted,
          }}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 16, minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function SandboxGuide() {
  const { theme: { ui } } = useCodeLensTheme()
  const supported = [
    'Synchronous variables, expressions, conditions, loops, and switch statements',
    'Functions, closures, recursion, callbacks, and error handling',
    'Arrays, objects, Map, Set, destructuring, spread, and for...of',
    'Classes, inheritance, instance fields, private fields, and common OOP patterns',
    'Single-file TypeScript including interfaces, enums, generics, unions, and access modifiers',
  ]
  const unsupported = [
    'Browser APIs: the DOM, fetch, timers, storage, workers, and browser events',
    'Node.js APIs: require, process, Buffer, filesystem access, and Node modules',
    'Async/await, Promises, the event loop, generators, and yield',
    'Imports, multi-file projects, package resolution, and project-wide TypeScript type checking',
  ]

  const FeatureList = ({ items, color }: { items: string[]; color: string }) => (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map(item => (
        <div key={item} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', color: ui.textDim, fontSize: 13, lineHeight: 1.55 }}>
          <span style={{ color, fontWeight: 800, flexShrink: 0 }}>●</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '8px 6px 24px' }}>
      <div style={{
        padding: 14, marginBottom: 20, borderRadius: 10,
        background: ui.accentBg, border: `1px solid ${ui.accentSolid}55`,
        color: ui.textSoft, fontSize: 13, lineHeight: 1.65,
      }}>
        CodeLens is a visual execution sandbox for learning how code moves through scopes, the call stack, and the heap. It intentionally runs self-contained, synchronous programs so every supported operation can be traced clearly.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 24 }}>
        <div>
          <h3 style={{ margin: '0 0 12px', color: ui.green, fontSize: 14 }}>Supported</h3>
          <FeatureList items={supported} color={ui.green} />
        </div>
        <div>
          <h3 style={{ margin: '0 0 12px', color: ui.amber, fontSize: 14 }}>Not supported yet</h3>
          <FeatureList items={unsupported} color={ui.amber} />
        </div>
      </div>
      <div style={{
        marginTop: 22, padding: 12, borderRadius: 8,
        background: ui.panelBg2, border: `1px solid ${ui.border}`,
        color: ui.textMuted, fontSize: 12, lineHeight: 1.6,
      }}>
        When CodeLens recognizes unsupported syntax or an unavailable API, it stops before producing a misleading trace and explains the boundary. Regular JavaScript mistakes still appear as syntax or runtime errors.
      </div>
    </div>
  )
}

function ModalSection({ title, children }: { title: string; children: ReactNode }) {
  const { theme: { ui } } = useCodeLensTheme()
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 9, letterSpacing: '.1em', color: ui.borderStrong,
        fontFamily: 'JetBrains Mono, monospace', marginBottom: 8, textTransform: 'uppercase' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function RelRow({ icon, label, names, color }: { icon: string; label: string; names: string[]; color: string }) {
  const { theme: { ui } } = useCodeLensTheme()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: ui.textFaint, minWidth: 16 }}>{icon}</span>
      <span style={{ color: ui.textFaint, minWidth: 60 }}>{label}</span>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {names.map(n => (
          <span key={n} style={{ color, background: color + '18',
            padding: '1px 7px', borderRadius: 4, border: `1px solid ${color}33` }}>
            {n}
          </span>
        ))}
      </div>
    </div>
  )
}

function describeFn(
  node: CallGraphNode,
  callsNames: string[],
  calledByNames: string[],
  isRecursive: boolean,
  isLeaf: boolean,
  isEntryPoint: boolean,
): string {
  const name = node.name
  if (isRecursive) {
    const others = callsNames.filter(n => n !== name)
    const also   = others.length ? ` It also calls ${others.join(', ')}.` : ''
    return `\`${name}\` is a recursive function — it calls itself with a smaller input until it reaches a base case. Each call creates a new frame on the call stack.${also} Once the base case is reached, the frames unwind and results are assembled on the way back up.`
  }
  if (isLeaf) {
    return `\`${name}\` is a leaf function — it performs a focused task without calling other named functions in this program. Leaf functions are the atomic units that everything else is built from.`
  }
  if (isEntryPoint && callsNames.length > 0) {
    return `\`${name}\` is an entry point that orchestrates the overall flow. It delegates to: ${callsNames.map(n => `\`${n}\``).join(', ')}.`
  }
  if (calledByNames.length > 0 && callsNames.length > 0) {
    return `\`${name}\` sits in the middle of the call graph — called by ${calledByNames.map(n => `\`${n}\``).join(', ')} and in turn calls ${callsNames.map(n => `\`${n}\``).join(', ')}.`
  }
  return `\`${name}\` — a ${node.kind} function${node.params.length > 0 ? ` taking ${node.params.join(', ')}` : ' with no parameters'}.`
}

function explainComplexity(c: string): string {
  const map: Record<string, string> = {
    'O(1)':           'Constant time — the same amount of work is done regardless of input size. This is the gold standard. Adding one more element changes nothing.',
    'O(n)':           'Linear time — work grows proportionally with n. Double the input, double the work. A single loop over n elements is typically O(n).',
    'O(n) recursive': 'Linear recursion — proportional to n but uses the call stack. Each recursive call adds a frame. For very large n this can cause a stack overflow. An iterative version with an explicit loop avoids this entirely.',
    'O(n²)':          'Quadratic time — double the input, 4× the work. Common in naive sorts (bubble, selection) and nested loops. Fine for small n, expensive for large n.',
    'O(n log n)?':    'Near-linear time — the sweet spot for comparison-based sorting (merge sort, quicksort on average). Much better than O(n²) for large inputs.',
  }
  return map[c] ?? `Work grows as ${c} with respect to input size.`
}

function getSICPNote(
  node: CallGraphNode,
  isRecursive: boolean,
  callsNames: string[],
  isLeaf: boolean,
  calledByNames: string[],
): SicpNote | null {
  const isEntryPoint = calledByNames.length === 0
  const name = node.name
  const nameLower = name.toLowerCase()

  if (isRecursive) {
    const isBranching = callsNames.filter(n => n === name).length > 1
      || nameLower.includes('fib') || nameLower.includes('tree')
    return {
      pattern: isBranching ? 'Tree Recursion' : 'Divide & Conquer',
      body: `\`${name}\` breaks the problem into a smaller version of itself, solving the simplest case directly (the base case) and combining sub-results on the way back up. This pattern underlies merge sort, binary search, and tree traversal.`,
      practice: isBranching
        ? 'Tree recursion re-computes the same sub-problems exponentially — `fib(50)` makes billions of calls. The fix is memoization: cache results by input so each sub-problem is solved only once. This turns O(2ⁿ) → O(n).'
        : 'Deep recursion can hit the JS call stack limit (~10k frames). For large inputs, consider memoization to cache repeated sub-problems, or rewrite iteratively using an explicit stack.',
      sicp: 'SICP §1.2.1 (linear recursion) and §1.2.2 (tree recursion, fibonacci)',
    }
  }

  if (node.kind === 'constructor') {
    return {
      pattern: 'Encapsulation',
      body: `A constructor bundles state and behavior into a single unit. Callers interact through the public interface — they don't need to know how \`${name}\` stores or manages its data. This is the core OOP principle: hide what changes, expose what's stable.`,
      practice: 'Favor immutable objects when possible — it eliminates a whole class of bugs. When state must be mutable, minimize the surface area (Law of Demeter: only talk to your immediate neighbors). Consider factory functions over `new` when you need flexible initialization.',
      sicp: 'SICP §3.1 — local state, message-passing objects, and the environment model',
    }
  }

  if (node.kind === 'method') {
    return {
      pattern: 'Behavioral Abstraction',
      body: `A method defines how an object responds to a message. The caller doesn't know *how* it works — only *what* it does. This separation (interface vs implementation) lets you change the internals without breaking callers, as long as the contract is preserved.`,
      practice: 'Keep methods focused — a method that does multiple things is a signal to decompose (Single Responsibility Principle). Methods under ~10 lines are almost always easier to test and reason about than longer ones.',
      sicp: 'SICP §3.1.2 — objects as procedures with local state',
    }
  }

  if (node.kind === 'arrow') {
    return {
      pattern: 'First-Class Functions',
      body: 'Arrow functions are values — they can be passed as arguments, returned from other functions, and stored in variables. This enables higher-order patterns: `map`, `filter`, `reduce`, event handlers, and middleware chains.',
      practice: 'Arrow functions capture `this` lexically — unlike regular functions, they inherit the `this` of their surrounding scope. This makes them safe for callbacks but wrong for methods that need their own `this`.',
      sicp: 'SICP §1.3 — higher-order procedures; functions as first-class values',
    }
  }

  if (nameLower.includes('sort') || nameLower.includes('compare')) {
    return {
      pattern: 'Algorithmic Complexity',
      body: 'All comparison-based sorts have a theoretical lower bound of O(n log n) — a mathematical proof from information theory. Algorithms faster than this must avoid comparisons entirely (radix sort, counting sort). The practical choice between quicksort, merge sort, and timsort depends on memory constraints, stability requirements, and cache behavior.',
      practice: 'JavaScript\'s built-in `Array.sort()` uses timsort — O(n log n) worst-case, stable, and fast in practice for nearly-sorted arrays. Implementing your own sort is rarely necessary unless you need a custom comparator.',
      sicp: 'SICP §2.2.3 — sequences as conventional interfaces; §2.3.3 — sets and sorting',
    }
  }

  if (isLeaf) {
    return {
      pattern: 'Single Responsibility',
      body: `\`${name}\` does one thing and delegates nothing — the ideal unit of code. Small, focused functions are easy to test (no mocks needed), easy to name, and easy to compose into larger behavior.`,
      practice: node.params.length === 0
        ? 'A function with no parameters that changes behavior must depend on external state or closures. If this is intentional (a thunk or effect), make it explicit. If not, consider accepting the data it needs as a parameter.'
        : 'If this function can compute the same output from the same inputs with no side effects, it\'s a *pure function* — safe to memoize, safe to parallelize, and trivial to unit test.',
      sicp: 'SICP §1.1.4 — compound procedures as black-box abstractions',
    }
  }

  if (isEntryPoint && callsNames.length > 1) {
    return {
      pattern: 'Orchestration / Facade',
      body: `\`${name}\` coordinates the overall flow — it knows the steps but delegates the work to ${callsNames.map(n => `\`${n}\``).join(', ')}. This separation keeps the entry point readable and the helpers independently reusable and testable.`,
      practice: 'Keep orchestrators thin. If this function grows beyond ~20 lines, the steps should probably be named and extracted. The ideal orchestrator reads like a series of English sentences: "get the data, validate it, transform it, save it."',
      sicp: 'SICP §1.3 — abstraction with higher-order procedures',
    }
  }

  if (callsNames.length > 0 && calledByNames.length > 0) {
    return {
      pattern: 'Layered Architecture',
      body: `\`${name}\` sits in the middle of the call graph — it translates between levels of abstraction. Called by higher-level code (${calledByNames.map(n => `\`${n}\``).join(', ')}), it handles details that the caller shouldn't need to know about.`,
      practice: `Middle-layer functions are where abstraction leaks most often. If a caller has to know what \`${name}\` does internally to use it correctly, the interface needs work.`,
      sicp: null,
    }
  }

  return null
}

// ── Python structure view (regex-based, no Pyodide needed) ───────────────────

interface PyFn { name: string; params: string[]; line: number }
interface PyClass { name: string; superclass: string | null; line: number; methods: PyFn[] }
interface PyVar { name: string; initType: string | null; line: number }
interface PyStructure { fns: PyFn[]; classes: PyClass[]; vars: PyVar[] }

function parsePyStructure(source: string): PyStructure {
  const lines   = source.split('\n')
  const fns: PyFn[]         = []
  const classes: PyClass[]  = []
  const vars: PyVar[]       = []

  let currentClass: string | null = null
  let classBodyIndent: number | null = null

  lines.forEach((raw, i) => {
    const line   = i + 1
    const indent = raw.length - raw.trimStart().length
    const t      = raw.trim()

    // Class declaration at column 0
    const clsM = t.match(/^class\s+(\w+)(?:\(([^)]*)\))?\s*:/)
    if (clsM && indent === 0) {
      currentClass     = clsM[1]
      classBodyIndent  = null          // reset — will be set by first body line
      classes.push({ name: clsM[1], superclass: clsM[2]?.trim() || null, line, methods: [] })
      return
    }

    // Track class body indent
    if (currentClass && classBodyIndent === null && t && !t.startsWith('#')) {
      classBodyIndent = indent
    }
    // Exited class body
    if (currentClass && t && !t.startsWith('#') && indent === 0 && !clsM) {
      currentClass    = null
      classBodyIndent = null
    }

    // def — could be top-level or method
    const fnM = t.match(/^def\s+(\w+)\s*\(([^)]*)\)\s*:/)
    if (fnM) {
      const params = fnM[2]
        .split(',')
        .map(p => p.trim().replace(/=.*$/, '').replace(/^\*+/, '').trim())
        .filter(Boolean)
        .filter(p => p !== 'self' && p !== 'cls')
      if (currentClass && indent > 0) {
        const cls = classes.find(c => c.name === currentClass)
        if (cls) cls.methods.push({ name: fnM[1], params, line })
      } else {
        fns.push({ name: fnM[1], params, line })
      }
      return
    }

    // Top-level variable assignment
    const varM = t.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/)
    if (varM && indent === 0 && !t.startsWith('#')) {
      const initStr = varM[2].trim()
      let initType: string | null = null
      if (initStr.startsWith('['))  initType = 'list'
      else if (initStr.startsWith('{')) initType = initStr.includes(':') ? 'dict' : 'set'
      else if (initStr.startsWith('('))  initType = 'tuple'
      else if (/^\d/.test(initStr) || initStr.startsWith('-')) initType = 'number'
      else if (initStr.startsWith('"') || initStr.startsWith("'")) initType = 'string'
      else if (initStr.startsWith('True') || initStr.startsWith('False')) initType = 'bool'
      else { const nm = initStr.match(/^(\w+)\s*\(/); if (nm) initType = `${nm[1]}()` }
      vars.push({ name: varM[1], initType, line })
    }
  })

  return { fns, classes, vars }
}

function PyStructureView({ source, execution }: { source: string; execution: ExecutionResult | null }) {
  const { theme: { ui } } = useCodeLensTheme()
  const { fns, classes, vars } = parsePyStructure(source)

  // Build call set from execution events for live highlighting
  const activeFns = new Set(
    (execution?.events ?? [])
      .filter(e => e.type === 'function_call')
      .map(e => e.functionName)
  )

  const hasRun = !!execution

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Functions */}
      {fns.length > 0 && (
        <>
          <SectionLabel>FUNCTIONS</SectionLabel>
          {fns.map((fn, i) => {
            const wasCalled = hasRun && activeFns.has(fn.name)
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '4px 9px', background: ui.panelBg2,
                borderRadius: 6, border: `1px solid ${wasCalled ? ui.accentSolid + '55' : ui.border}`,
              }}>
                <span style={{ width: 3, height: 20, borderRadius: 2, flexShrink: 0,
                  background: wasCalled ? ui.accent : ui.borderStrong }} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                  color: wasCalled ? ui.accent : ui.cyan, fontWeight: 700 }}>
                  {fn.name}
                </span>
                <span style={{ fontSize: 10, color: ui.textFaint,
                  fontFamily: 'JetBrains Mono, monospace' }}>
                  ({fn.params.join(', ')})
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 8, color: ui.borderStrong,
                  fontFamily: 'JetBrains Mono, monospace' }}>L{fn.line}</span>
              </div>
            )
          })}
        </>
      )}

      {/* Classes */}
      {classes.length > 0 && (
        <>
          <SectionLabel>CLASSES</SectionLabel>
          {classes.map((cls, i) => (
            <div key={i} style={{ padding: '7px 9px', background: ui.border, borderRadius: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: cls.methods.length ? 5 : 0 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: ui.accent }}>
                  {cls.name}
                </span>
                {cls.superclass && (
                  <span style={{ fontSize: 10, color: ui.textMuted }}>({cls.superclass})</span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 8, color: ui.borderStrong,
                  fontFamily: 'JetBrains Mono, monospace' }}>L{cls.line}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {cls.methods.map((m, j) => (
                  <span key={j} style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 99,
                    background: m.name === '__init__' ? ui.accentBgSolid : ui.accentBg,
                    color: m.name === '__init__' ? ui.accentBright : ui.cyan,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>{m.name}</span>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Variables */}
      {vars.length > 0 && (
        <>
          <SectionLabel>VARIABLES</SectionLabel>
          {vars.map((v, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '3px 8px', borderRadius: 5,
              background: ui.panelBg2, border: `1px solid ${ui.border}`,
            }}>
              <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                background: ui.green + '18', color: ui.green, border: `1px solid ${ui.green}33`,
                fontFamily: 'JetBrains Mono, monospace' }}>var</span>
              <span style={{ flex: 1, fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                color: ui.text }}>{v.name}</span>
              {v.initType && (
                <span style={{ fontSize: 9, color: ui.textFaint,
                  fontFamily: 'JetBrains Mono, monospace' }}>{v.initType}</span>
              )}
              <span style={{ fontSize: 8, color: ui.borderStrong,
                fontFamily: 'JetBrains Mono, monospace' }}>L{v.line}</span>
            </div>
          ))}
        </>
      )}

      {fns.length === 0 && classes.length === 0 && vars.length === 0 && (
        <span style={{ color: ui.textFaint, fontSize: 12 }}>No definitions detected.</span>
      )}

      {!hasRun && (fns.length > 0 || classes.length > 0) && (
        <div style={{ fontSize: 10, color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace',
          borderTop: `1px solid ${ui.border}`, paddingTop: 6, marginTop: 2 }}>
          Run to see which functions are called (highlighted in indigo)
        </div>
      )}
    </div>
  )
}

// ── Static analysis views ─────────────────────────────────────────────────────

function initColor(t: string | null | undefined, ui: CodeLensUiPalette): string {
  const INIT_TYPE_COLOR: Record<string, string> = {
    number: ui.green, string: ui.amber, boolean: ui.pink,
    array: ui.cyan, object: ui.accent, function: ui.purple, expr: ui.textDim,
  }
  if (!t) return ui.borderStrong
  if (t.startsWith('new ')) return ui.purple
  if (t.endsWith('()'))     return ui.cyan
  return INIT_TYPE_COLOR[t] ?? ui.textFaint
}

function StructureView({ model, currentEvent, onNodeClick }: { model: ProgramModel | null; currentEvent: TraceEvent | null; onNodeClick: (node: CallGraphNode) => void }) {
  const { theme: { ui } } = useCodeLensTheme()
  const VAR_KIND_COLOR: Record<string, string> = { const: ui.green, let: ui.amber, var: ui.pink }

  if (model?.error) return <span style={{ color: ui.redSolid, fontSize: 12 }}>Parse error: {model.error.message}</span>
  if (!model) return <span style={{ color: ui.textFaint, fontSize: 12 }}>Parsing…</span>

  const hasGraph      = (model.callGraph?.nodes?.length ?? 0) > 0
  const hasClasses    = (model.classes?.length ?? 0) > 0
  const hasVars       = (model.variables?.length ?? 0) > 0
  const hasImports    = (model.imports?.length ?? 0) > 0
  const hasInterfaces = (model.interfaces?.length ?? 0) > 0
  const hasTypes      = (model.types?.length ?? 0) > 0
  const hasEnums      = (model.enums?.length ?? 0) > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* ── Call graph ── */}
      {hasGraph
        ? <CallGraphView callGraph={model.callGraph} currentEvent={currentEvent} onNodeClick={onNodeClick} />
        : <span style={{ color: ui.textFaint, fontSize: 12 }}>No functions detected.</span>
      }

      {/* ── Variables ── */}
      {hasVars && (
        <>
          <SectionLabel>VARIABLES</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {model.variables!.map((v, i) => {
              const kindColor = VAR_KIND_COLOR[v.kind] ?? ui.textDim
              const iColor    = initColor(v.initType, ui)
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '3px 8px', borderRadius: 5, background: ui.panelBg2,
                  border: `1px solid ${ui.border}`,
                }}>
                  {/* kind badge */}
                  <span style={{
                    fontSize: 8, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                    background: kindColor + '18', color: kindColor,
                    border: `1px solid ${kindColor}33`,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>{v.kind}</span>

                  {/* name */}
                  <span style={{
                    flex: 1, fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                    color: ui.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{v.name}</span>

                  {/* init type */}
                  {v.initType && (
                    <span style={{
                      fontSize: 9, color: iColor, fontFamily: 'JetBrains Mono, monospace',
                      flexShrink: 0, opacity: 0.8,
                    }}>{v.initType}</span>
                  )}

                  {/* line */}
                  {v.line && (
                    <span style={{
                      fontSize: 8, color: ui.borderStrong, flexShrink: 0,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>L{v.line}</span>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Classes ── */}
      {hasClasses && (
        <>
          <SectionLabel>CLASSES</SectionLabel>
          {model.classes!.map((cls, i) => (
            <div key={i} style={{ padding: '7px 9px', background: ui.border, borderRadius: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: ui.accent }}>{cls.name}</span>
                {cls.superclass && <span style={{ fontSize: 10, color: ui.textMuted }}>extends {cls.superclass}</span>}
                {cls.line && <span style={{ marginLeft: 'auto', fontSize: 8, color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace' }}>L{cls.line}</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {cls.methods.map((m, j) => (
                  <span key={j} style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 99,
                    background: m.kind === 'constructor' ? ui.accentBgSolid : ui.accentBg,
                    color: m.kind === 'constructor' ? ui.accentBright : ui.cyan,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>{m.static ? 'static ' : ''}{m.name}</span>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Interfaces ── */}
      {hasInterfaces && (
        <>
          <SectionLabel>INTERFACES</SectionLabel>
          {model.interfaces!.map((iface, i) => (
            <div key={i} style={{ padding: '7px 9px', background: ui.panelBg2, borderRadius: 6, border: `1px solid ${ui.accentSolid}33` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: iface.members.length ? 5 : 0 }}>
                <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                  background: ui.accentSolid + '18', color: ui.accent, border: `1px solid ${ui.accentSolid}33`,
                  fontFamily: 'JetBrains Mono, monospace' }}>interface</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: ui.accentBright }}>{iface.name}</span>
                {(iface.extends?.length ?? 0) > 0 && (
                  <span style={{ fontSize: 10, color: ui.textFaint }}>extends {iface.extends!.join(', ')}</span>
                )}
                {iface.line && <span style={{ marginLeft: 'auto', fontSize: 8, color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace' }}>L{iface.line}</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {iface.members.map((m, j) => (
                  <span key={j} style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 99,
                    background: m.kind === 'method' ? ui.accentBg : ui.border,
                    color: m.kind === 'method' ? ui.cyan : ui.textDim,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>{m.name}{m.optional ? '?' : ''}{m.kind === 'method' ? '()' : ''}</span>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Types ── */}
      {hasTypes && (
        <>
          <SectionLabel>TYPES</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {model.types!.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '3px 8px', borderRadius: 5,
                background: ui.panelBg2, border: `1px solid ${ui.purple}33`,
              }}>
                <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3,
                  background: ui.purple + '18', color: ui.purple, border: `1px solid ${ui.purple}33`,
                  fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>type</span>
                <span style={{ flex: 1, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: ui.accentBright }}>{t.name}</span>
                {t.isUnion && <span style={{ fontSize: 9, color: ui.textFaint, fontFamily: 'JetBrains Mono, monospace' }}>union</span>}
                {t.line && <span style={{ fontSize: 8, color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace' }}>L{t.line}</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Enums ── */}
      {hasEnums && (
        <>
          <SectionLabel>ENUMS</SectionLabel>
          {model.enums!.map((e, i) => (
            <div key={i} style={{ padding: '7px 9px', background: ui.panelBg2, borderRadius: 6, border: `1px solid ${ui.greenBright}33` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: e.members.length ? 5 : 0 }}>
                <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3,
                  background: ui.greenBright + '18', color: ui.greenBright, border: `1px solid ${ui.greenBright}33`,
                  fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>enum</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: ui.greenBright }}>{e.name}</span>
                {e.line && <span style={{ marginLeft: 'auto', fontSize: 8, color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace' }}>L{e.line}</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {e.members.map((m, j) => (
                  <span key={j} style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 99,
                    background: ui.greenDeep, color: ui.greenBright,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>{m}</span>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Imports ── */}
      {hasImports && (
        <>
          <SectionLabel>IMPORTS</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {model.imports!.map((imp, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '3px 8px', borderRadius: 5,
                background: ui.panelBg2, border: `1px solid ${ui.border}`,
              }}>
                <span style={{ fontSize: 9, color: ui.textFaint, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                  from
                </span>
                <span style={{ flex: 1, fontSize: 10, color: ui.amber, fontFamily: 'JetBrains Mono, monospace',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {imp.source}
                </span>
                <span style={{ fontSize: 9, color: ui.textFaint, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                  {imp.specifiers.join(', ')}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  const { theme: { ui } } = useCodeLensTheme()
  return (
    <div style={{
      fontSize: 9, letterSpacing: '.08em', color: ui.borderStrong,
      fontFamily: 'JetBrains Mono, monospace',
      paddingTop: 4, borderTop: `1px solid ${ui.border}`,
    }}>
      {children}
    </div>
  )
}

interface TokenGlossaryEntry { desc: string; bg: string }

function TokensView({ model, source }: { model: ProgramModel | null; source: string }) {
  const { theme: { ui } } = useCodeLensTheme()
  const [selected, setSelected] = useState<TokenInfo | null>(null)
  const tokens = model?.files?.[0]?.tokens ?? []

  // Lexer explanation mapping
  const TOKEN_GLOSSARY: Record<string, TokenGlossaryEntry> = {
    keyword: { desc: 'A reserved word built into the language (e.g., if, function, let).', bg: ui.pink },
    name: { desc: 'An identifier chosen by the programmer for a variable, function, or property.', bg: ui.cyan },
    number: { desc: 'A numeric literal value.', bg: ui.amber },
    string: { desc: 'A text literal value enclosed in quotes.', bg: ui.green },
    punctuation: { desc: 'Symbols that structure the code or represent operators (+, -, {, }, etc).', bg: ui.textDim },
  }
  const selectedGlossary = selected ? TOKEN_GLOSSARY[selected.type] : undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Educational intro */}
      <div style={{ padding: '8px 10px', background: ui.headerBg, borderBottom: `1px solid ${ui.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: ui.accent, marginBottom: 4 }}>
          Lexical Analysis (Tokenization)
        </div>
        <div style={{ fontSize: 11, color: ui.textMuted, lineHeight: 1.5 }}>
          Before the computer can understand your code, the <strong>Lexer</strong> reads the raw text character-by-character and groups them into <strong>Tokens</strong> — the smallest meaningful words of a programming language.
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left: Annotated Source */}
        <div style={{ flex: 1, overflow: 'auto', padding: 10, borderRight: `1px solid ${ui.border}` }}>
          <div style={{ fontSize: 10, color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace', marginBottom: 8, letterSpacing: '.08em' }}>
            ANNOTATED SOURCE
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {source ? (
              <AnnotatedSource source={source} tokens={tokens} selected={selected} onSelect={setSelected} />
            ) : (
              <span style={{ color: ui.textFaint }}>No source available.</span>
            )}
          </div>
        </div>

        {/* Right: Inspector */}
        <div style={{ width: 180, background: ui.headerBg, padding: 10, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace', marginBottom: 12, letterSpacing: '.08em' }}>
            INSPECTOR
          </div>
          {selected ? (
            <div>
              <div style={{
                fontSize: 11, padding: '2px 6px', borderRadius: 4, display: 'inline-block',
                background: `${selectedGlossary?.bg ?? ui.textDim}22`,
                color: selectedGlossary?.bg ?? ui.textDim,
                border: `1px solid ${selectedGlossary?.bg ?? ui.textDim}44`,
                fontFamily: 'JetBrains Mono, monospace', marginBottom: 10,
              }}>
                {selected.type}
              </div>
              <div style={{
                fontSize: 14, color: ui.text, fontFamily: 'JetBrains Mono, monospace',
                background: ui.panelBg, padding: '6px 8px', borderRadius: 4, border: `1px solid ${ui.border}`,
                marginBottom: 12, wordBreak: 'break-all'
              }}>
                {selected.value ?? selected.type}
              </div>
              <div style={{ fontSize: 11, color: ui.textMuted, lineHeight: 1.5 }}>
                {selectedGlossary?.desc ?? 'A grammatical token.'}
                <br /><br />
                <span style={{ color: ui.textFaint }}>Offsets: {selected.start} – {selected.end}</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: ui.textFaint, fontStyle: 'italic', textAlign: 'center', marginTop: 20 }}>
              Click any highlighted token in the source code to inspect it.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AnnotatedSource({ source, tokens, selected, onSelect }: {
  source: string
  tokens: TokenInfo[]
  selected: TokenInfo | null
  onSelect: (tok: TokenInfo) => void
}) {
  const { theme: { ui } } = useCodeLensTheme()
  if (!tokens || tokens.length === 0) return source

  const elements: ReactNode[] = []
  let lastPos = 0

  tokens.forEach((tok, i) => {
    // Add plain text before token
    if (tok.start > lastPos) {
      elements.push(<span key={`text-${i}`}>{source.slice(lastPos, tok.start)}</span>)
    }
    // Add token
    const isSel = selected === tok
    const color = tokenColor(tok.type, ui)
    elements.push(
      <span
        key={`tok-${i}`}
        onClick={() => onSelect(tok)}
        style={{
          cursor: 'pointer',
          borderRadius: 3,
          padding: '0 1px',
          background: isSel ? `${color}33` : 'transparent',
          color: color,
          borderBottom: `1px solid ${isSel ? color : `${color}44`}`,
          transition: 'all 0.1s',
        }}
        onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = `${color}18` }}
        onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
      >
        {source.slice(tok.start, tok.end)}
      </span>
    )
    lastPos = tok.end
  })
  // Add remaining plain text
  if (lastPos < source.length) {
    elements.push(<span key="text-end">{source.slice(lastPos)}</span>)
  }
  return elements
}

function AstView({ model }: { model: ProgramModel | null }) {
  // Rendered inside CodeDetailModal, which already provides a full-size
  // overlay — no need for its own nested preview-then-modal escalation.
  const { theme: { ui } } = useCodeLensTheme()
  const [openIntro, setOpenIntro] = useState(false)
  const ast = model?.files?.[0]?.ast

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Collapsible intro */}
      <div style={{ borderBottom: `1px solid ${ui.border}`, paddingBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
          <span style={{ fontSize: 9, color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.08em' }}>AST</span>
          <button onClick={() => setOpenIntro(v => !v)} style={{
            marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
            color: openIntro ? ui.accent : ui.borderStrong, fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace', padding: 0,
          }}>
            {openIntro ? '▲ hide' : '? what is this'}
          </button>
        </div>
        {openIntro && (
          <div style={{ padding: '10px 0', fontSize: 11, color: ui.textMuted, lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, color: ui.accent, marginBottom: 5 }}>
              Abstract Syntax Tree — how the computer reads your code
            </div>
            The parser reads the token stream and converts it into a <strong style={{ color: ui.textBright }}>tree of nodes</strong> — one node per grammatical unit (a function declaration, a variable, an expression). Node color hints at its category:{' '}
            <strong style={{ color: ui.accent }}>declarations</strong>,{' '}
            <strong style={{ color: ui.pink }}>control flow</strong>,{' '}
            <strong style={{ color: ui.cyan }}>expressions</strong>,{' '}
            <strong style={{ color: ui.amber }}>literals</strong>, and{' '}
            <strong style={{ color: ui.green }}>identifiers</strong>.
            <br /><br />
            The interpreter then <strong style={{ color: ui.textBright }}>walks this tree</strong>, executing what each node means. That walk produces the event stream you see in the Run tab.
          </div>
        )}
      </div>

      <div style={{ minWidth: 'max-content', paddingRight: 40 }}>
        {ast ? <ASTNode node={ast} depth={0} startOpen interactive /> : <span style={{ color: ui.textFaint, fontSize: 12 }}>No AST.</span>}
      </div>
    </div>
  )
}


// ── Scope chain view ──────────────────────────────────────────────────────────

function ScopeChainView({ event }: { event: TraceEvent | null }) {
  const { theme: { ui } } = useCodeLensTheme()
  if (!event) {
    return (
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 12, color: ui.textFaint }}>Run code first.</div>
      </div>
    )
  }

  const frames   = event.stackSnapshot ?? []
  // Frames are ordered innermost-first; reverse so top = current
  const ordered  = [...frames].reverse()
  const hasFrames = ordered.length > 0

  return (
    <div style={{ padding: '0 2px' }}>
      {/* Concept label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        padding: '6px 10px', borderRadius: 7,
        background: ui.panelBg, border: `1px solid ${ui.border}`,
      }}>
        <Layers size={12} color={ui.accent} />
        <span style={{ fontSize: 10, color: ui.accent, fontWeight: 700, letterSpacing: '.04em' }}>
          SCOPE CHAIN
        </span>
        <span style={{ fontSize: 10, color: ui.borderStrong, marginLeft: 'auto' }}>
          {hasFrames ? `${ordered.length} frame${ordered.length > 1 ? 's' : ''}` : 'global only'}
        </span>
      </div>

      {/* Concept explanation */}
      <div style={{
        fontSize: 11, color: ui.textFaint, lineHeight: 1.6,
        padding: '0 2px', marginBottom: 12,
      }}>
        Every time a function is called, JavaScript creates a new <span style={{ color: ui.accent }}>scope frame</span> to
        hold its variables. When the function returns, the frame is destroyed.
        Inner frames can read variables from outer frames — that's how <span style={{ color: ui.purple }}>closures</span> work.
      </div>

      {/* Stack frames as scope levels */}
      {ordered.map((frame, i) => (
        <ScopeFrame key={i} frame={frame} isCurrent={i === 0} />
      ))}

      {/* Global scope always at the bottom */}
      <div style={{ position: 'relative', marginTop: ordered.length > 0 ? 0 : 4 }}>
        {ordered.length > 0 && (
          <div style={{
            width: 1, height: 12, background: ui.border,
            margin: '0 auto 0 19px',
          }} />
        )}
        <GlobalScope event={event} />
      </div>
    </div>
  )
}

function ScopeFrame({ frame, isCurrent }: { frame: StackFrame; isCurrent: boolean }) {
  const { theme: { ui } } = useCodeLensTheme()
  const [open, setOpen] = useState(isCurrent)
  const locals = Object.entries(frame.locals ?? {})

  return (
    <div style={{ position: 'relative', marginBottom: 0 }}>
      {/* Connector line */}
      <div style={{
        position: 'absolute', left: 19, top: 0, bottom: 0,
        width: 1, background: isCurrent ? ui.accentDeep : ui.border,
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, marginBottom: 4 }}>
        {/* Frame header */}
        <div
          onClick={() => locals.length > 0 && setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px 6px 8px', borderRadius: 7,
            background: isCurrent ? ui.accentBg : ui.panelBg,
            border: `1px solid ${isCurrent ? ui.accentDeep : ui.border}`,
            cursor: locals.length > 0 ? 'pointer' : 'default',
            marginLeft: 0,
          }}
        >
          <div style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
            background: isCurrent ? ui.accentDeep : ui.border,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isCurrent
              ? <span style={{ fontSize: 8, color: ui.accentBright, fontWeight: 700 }}>NOW</span>
              : <span style={{ fontSize: 9, color: ui.textFaint }}>fn</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
              color: isCurrent ? ui.accentBright : ui.cyan,
            }}>
              {frame.name ?? '(anonymous)'}
              {isCurrent && <span style={{ fontSize: 10, color: ui.accentSolid, marginLeft: 6 }}>← running</span>}
            </div>
            <div style={{ fontSize: 10, color: ui.borderStrong }}>
              {locals.length} variable{locals.length !== 1 ? 's' : ''}
              {frame.line ? ` · L${frame.line}` : ''}
            </div>
          </div>
          {locals.length > 0 && (
            <span style={{ fontSize: 10, color: ui.borderStrong }}>
              {open ? '▲' : '▼'}
            </span>
          )}
        </div>

        {/* Variables */}
        {open && locals.length > 0 && (
          <div style={{
            marginLeft: 30, marginTop: 2, marginBottom: 4,
            padding: '6px 8px', borderRadius: 6,
            background: ui.bg, border: `1px solid ${ui.border}`,
          }}>
            {locals.map(([name, val]) => (
              <div key={name} style={{
                display: 'flex', gap: 8, fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
                padding: '2px 0', alignItems: 'baseline',
              }}>
                <span style={{ color: ui.cyan, minWidth: 80, flexShrink: 0 }}>{name}</span>
                <span style={{ color: ui.borderStrong, flexShrink: 0 }}>=</span>
                <span style={{ color: valueColor(val, ui), wordBreak: 'break-all' }}>
                  {formatValue(val)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GlobalScope({ event }: { event: TraceEvent }) {
  const { theme: { ui } } = useCodeLensTheme()
  const [open, setOpen] = useState(false)
  // Collect globals from the first (oldest) stack frame if available
  const frames  = event.stackSnapshot ?? []
  const globals = frames.length > 0 ? Object.entries(frames[0]?.locals ?? {}) : []

  return (
    <div style={{
      padding: '6px 10px 6px 8px', borderRadius: 7,
      background: ui.bg, border: `1px solid ${ui.border}`,
      cursor: globals.length > 0 ? 'pointer' : 'default',
    }} onClick={() => globals.length > 0 && setOpen(o => !o)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: ui.panelBg, border: `1px solid ${ui.borderStrong}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, color: ui.textFaint, fontWeight: 700,
        }}>GBL</div>
        <div>
          <div style={{ fontSize: 12, color: ui.textFaint, fontFamily: 'JetBrains Mono, monospace' }}>
            global scope
          </div>
          <div style={{ fontSize: 10, color: ui.borderStrong }}>
            top-level declarations · always visible
          </div>
        </div>
        {globals.length > 0 && (
          <span style={{ fontSize: 10, color: ui.borderStrong, marginLeft: 'auto' }}>
            {open ? '▲' : '▼'}
          </span>
        )}
      </div>
      {open && globals.length > 0 && (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${ui.border}` }}>
          {globals.map(([name, val]) => (
            <div key={name} style={{
              display: 'flex', gap: 8, fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace', padding: '2px 0',
            }}>
              <span style={{ color: ui.textMuted, minWidth: 80 }}>{name}</span>
              <span style={{ color: ui.borderStrong }}>=</span>
              <span style={{ color: valueColor(val, ui) }}>{formatValue(val)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function valueColor(v: unknown, ui: CodeLensUiPalette): string {
  if (v === null || v === undefined) return ui.textFaint
  if (typeof v === 'number') return ui.green
  if (typeof v === 'string') return ui.amber
  if (typeof v === 'boolean') return ui.pink
  if (isDisplayedReference(v)) return ui.accent
  if (typeof v === 'function' || (typeof v === 'object' && v !== null && (v as { type?: string }).type === 'function')) return ui.purple
  return ui.textDim
}

function formatValue(v: unknown): string {
  if (v === null)      return 'null'
  if (v === undefined) return 'undefined'
  if (typeof v === 'function') return '[Function]'
  if (isDisplayedReference(v)) {
    // Python's tracer adds what the object holds, e.g. "(0, 1)" for a returned tuple.
    const preview = (v as { preview?: string }).preview
    return preview ? `${preview.length > 28 ? preview.slice(0, 27) + '…' : preview} #${referenceId(v)}` : `Object #${referenceId(v)}`
  }
  if (typeof v === 'object' && v !== null && (v as { type?: string }).type === 'function') return `[Function ${(v as { name?: string }).name ?? ''}]`
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 30)
  if (typeof v === 'string') return `"${v.length > 20 ? v.slice(0, 20) + '…' : v}"`
  return String(v)
}

function isDisplayedReference(v: unknown): v is { $ref?: number; __kind?: string; objectId?: number } {
  return typeof v === 'object' && v !== null && (
    '$ref' in v || (v as { __kind?: string }).__kind === 'reference'
  )
}

function referenceId(v: { $ref?: number; objectId?: number }): number | '?' {
  return v.$ref ?? v.objectId ?? '?'
}
