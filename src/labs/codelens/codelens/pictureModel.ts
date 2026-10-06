// What the Picture tab (Picture.tsx) draws at one step: the program's data structures, with
// what the line that just ran did to them. Nothing here knows any particular algorithm; it
// works from three things every tracer can provide:
//
//   1. the heap (renderer/heapSnapshot.ts): which objects exist and what they hold;
//   2. the step's heap changes (writes) and, where the tracer records them, `reads`: the items
//      a line looked at (Python: codelens_tracer.py record_read; JavaScript: the interpreter's
//      member reads), as [object id, key] or, for a 2-D array, [object id, row, column];
//   3. the source, for which variables index which container (`a[i]`, `dp[i][j]`, `Q[s, a]`):
//      those become pointer badges under the cells they point at.
//
// From these it builds arrays (with swaps and moves), grids (dynamic-programming tables,
// Q-tables), maps (dicts) and linked nodes (lists and trees), plus one line per change saying
// what happened, in the program's own names.
import type { HeapObjectEntry, HeapSnapshot, Lang, TraceEvent } from './types'
import { refId, visibleVariables } from './tableModel'

export interface PictureCell {
  value: unknown
  /** Written by the line that just ran; `old` is what it held before. */
  written?: { old: unknown }
  read?: boolean
  /** The object itself was created by the line that just ran. */
  created?: boolean
}

export interface Pointer { name: string; index: number }

export interface ArrayPicture {
  kind: 'array'
  name: string
  objectId: number
  type: string
  cells: PictureCell[]
  pointers: Pointer[]
  /** Pairs of positions whose values were exchanged by the line that just ran. */
  swaps: [number, number][]
  /** A value copied from one position to another (insertion sort's shift), not a swap. */
  moves: { from: number; to: number }[]
  more?: string
}

export interface GridPicture {
  kind: 'grid'
  name: string
  objectId: number
  type: string
  rowKeys: string[]
  columns: string[]
  /** Names for the columns, from a list of strings the same length (ACTIONS = ['up', 'down', ...]). */
  columnLabels?: string[]
  columnSource?: string
  cells: PictureCell[][]
  /** Rows read as a whole (`Q[s].max()`). */
  rowsRead: number[]
  rowPointers: Pointer[]
  columnPointers: Pointer[]
  /** The range of the numbers in it, for colouring a table of values (a Q-table). */
  numeric: { min: number; max: number } | null
  /** How it's indexed in the source: 'chained' (dp[i][j]) or 'tuple' (Q[s, a]). */
  indexing: 'chained' | 'tuple'
  more?: string
}

export interface MapPicture {
  kind: 'map'
  name: string
  objectId: number
  type: string
  entries: { key: string; cell: PictureCell }[]
  more?: string
}

export interface NodeBox {
  id: number
  type: string
  /** Scalar fields, shown inside the box. */
  fields: { name: string; value: unknown; written?: { old: unknown } }[]
  /** Variables that refer to this node right now (head, cur, prev). */
  tags: string[]
  created: boolean
}

export interface NodeEdge { from: number; to: number; label: string; written: boolean }

export interface NodesPicture {
  kind: 'nodes'
  name: string
  nodes: NodeBox[]
  edges: NodeEdge[]
  /** Fields that point nowhere (next = None), drawn as a stub inside the box. */
  nulls: { id: number; label: string; written: boolean }[]
  shape: 'chain' | 'tree' | 'graph'
  roots: number[]
}

export type Structure = ArrayPicture | GridPicture | MapPicture | NodesPicture

export interface Picture {
  /** The line whose effects are shown (the line that just ran), when known. */
  line: number | null
  /** One sentence per change: "cards[2] and cards[4] swapped". */
  notes: string[]
  structures: Structure[]
}

const MORE_KEY = '…'
const HIDDEN = new Set(['__mapData__', 'length'])
const SEQUENCE_TYPES = new Set(['list', 'tuple', 'deque', 'ndarray', 'ndarray view', 'Array', 'set', 'frozenset', 'Set'])
const MAP_TYPES = new Set(['dict', 'Map', 'defaultdict', 'OrderedDict', 'Counter'])
const MAX_CELLS = 64
const MAX_NODES = 40
const KEYWORDS = new Set(['and', 'or', 'not', 'in', 'is', 'if', 'else', 'for', 'None', 'True', 'False', 'len', 'range',
  'int', 'float', 'str', 'abs', 'min', 'max', 'sum', 'true', 'false', 'null', 'undefined', 'length', 'Math', 'self', 'this'])

const isIndex = (key: string) => /^\d+$/.test(key)

function items(obj: HeapObjectEntry): [string, unknown][] {
  return [...obj.properties].filter(([key]) => !HIDDEN.has(key) && key !== MORE_KEY)
}

function moreText(obj: HeapObjectEntry): string | undefined {
  const more = obj.properties.get(MORE_KEY)
  return typeof more === 'string' ? more : undefined
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  const ra = refId(a), rb = refId(b)
  if (ra != null || rb != null) return ra === rb
  return typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)
}

// ── which variables index which container, read from the source ─────────────────────────

/** For each name used as `name[...]`, the identifiers inside each bracket, by axis:
 *  `dp[i - 1][j]` gives dp → [[i], [j]], `Q[s, a]` gives Q → [[s], [a]] (tuple indexing). */
export function indexVariables(source: string): Map<string, { axes: string[][]; tuple: boolean }> {
  const found = new Map<string, { axes: Set<string>[]; tuple: boolean }>()
  const text = source.replace(/#.*$/gm, '').replace(/\/\/.*$/gm, '')
  const start = /\b([A-Za-z_]\w*)\s*\[/g
  let match: RegExpExecArray | null
  while ((match = start.exec(text))) {
    const name = match[1]
    let at = match.index + match[0].length
    const brackets: string[] = []
    // Read this bracket, then any directly following ones (dp[i][j]).
    for (;;) {
      let depth = 1, end = at
      while (end < text.length && depth > 0) {
        if (text[end] === '[') depth++
        else if (text[end] === ']') depth--
        end++
      }
      if (depth !== 0) break
      brackets.push(text.slice(at, end - 1))
      let next = end
      while (next < text.length && text[next] === ' ') next++
      if (text[next] !== '[') break
      at = next + 1
    }
    if (!brackets.length) continue
    // A comma at the top level of a single bracket is numpy's Q[s, a]; slices (a[1:]) aren't indexes.
    let axes = brackets
    let tuple = false
    if (brackets.length === 1) {
      const parts = splitTopLevel(brackets[0])
      if (parts.length > 1) { axes = parts; tuple = true }
    }
    const entry = found.get(name) ?? { axes: [], tuple }
    entry.tuple ||= tuple
    axes.forEach((axis, i) => {
      entry.axes[i] ??= new Set()
      // Only an index that is one variable, perhaps plus or minus a number (i, i - 1, mid), is a
      // pointer. In grid[r + dr] the offset dr isn't a position, and a badge for it would mislead.
      const single = axis.match(/^\s*([A-Za-z_]\w*)\s*(?:[+-]\s*\d+\s*)?$/)
      if (single && !KEYWORDS.has(single[1]) && single[1] !== name) entry.axes[i].add(single[1])
    })
    found.set(name, entry)
  }
  const out = new Map<string, { axes: string[][]; tuple: boolean }>()
  for (const [name, { axes, tuple }] of found) out.set(name, { axes: axes.map(a => [...(a ?? [])]), tuple })
  return out
}

function splitTopLevel(text: string): string[] {
  const parts: string[] = []
  let depth = 0, current = ''
  for (const ch of text) {
    if ('([{'.includes(ch)) depth++
    if (')]}'.includes(ch)) depth--
    if (ch === ',' && depth === 0) { parts.push(current); current = '' } else current += ch
  }
  parts.push(current)
  return parts.map(p => p.trim()).filter(Boolean)
}

// ── the step's changes ────────────────────────────────────────────────────────────────────

interface StepChanges {
  writes: Map<string, { old: unknown; value: unknown }>   // "objectId:key" -> change
  rowWrites: Map<string, { old: unknown[] | null; value: unknown[] }>   // numpy rows
  created: Set<number>
  reads: Set<string>         // "objectId:key" or "objectId:row:column"
}

function stepChanges(group: TraceEvent[]): StepChanges {
  const writes = new Map<string, { old: unknown; value: unknown }>()
  const rowWrites = new Map<string, { old: unknown[] | null; value: unknown[] }>()
  const created = new Set<number>()
  for (const delta of group.flatMap(e => e.heapDelta ?? [])) {
    if (delta.op === 'create') created.add(delta.objectId)
    if (delta.op === 'mutate') {
      const key = `${delta.objectId}:${delta.property}`
      if (Array.isArray(delta.newValue)) {
        rowWrites.set(key, { old: Array.isArray(delta.oldValue) ? delta.oldValue : null, value: delta.newValue })
      } else {
        const previous = writes.get(key)
        writes.set(key, { old: previous ? previous.old : delta.oldValue, value: delta.newValue })
      }
    }
  }
  const reads = new Set<string>()
  for (const read of group.flatMap(e => (e.reads ?? []) as unknown[][])) {
    if (!Array.isArray(read) || typeof read[0] !== 'number') continue
    reads.add(read.length >= 3 ? `${read[0]}:${read[1]}:${read[2]}` : `${read[0]}:${read[1]}`)
  }
  return { writes, rowWrites, created, reads }
}

/** The line whose effects this step shows. Python and native tracers report a step when the
 *  next line is about to run, so its changes were made by the previous step's line; the
 *  JavaScript interpreter reports a write as it happens, at its own line. */
export function effectLine(events: TraceEvent[], step: number, lang?: Lang): number | null {
  const event = events[step]
  if (!event) return null
  const own = event.sourceLocation?.line ?? null
  if (lang === 'js' || lang === 'ts' || event.type === 'object_mutate') return own
  const previous = events[step - 1]
  return previous?.sourceLocation?.line ?? null
}

/** The events whose changes this step shows. Usually just the step itself; the JavaScript
 *  interpreter reports each write as its own event, so a statement that writes twice (a swap,
 *  [a[i], a[j]] = [a[j], a[i]]) is gathered back to where that statement began. */
function stepGroup(events: TraceEvent[], step: number, lang?: Lang): TraceEvent[] {
  const event = events[step]
  if (!event || !(lang === 'js' || lang === 'ts')) return event ? [event] : []
  const line = event.sourceLocation?.line
  const group = [event]
  for (let k = step - 1; k >= 0 && event.type !== 'statement_enter'; k--) {
    const earlier = events[k]
    if (earlier.sourceLocation?.line !== line) break
    group.unshift(earlier)
    if (earlier.type === 'statement_enter') break
  }
  return group
}

// ── building the picture ──────────────────────────────────────────────────────────────────

function integerValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null
}

function pointersFor(names: string[] | undefined, vars: Map<string, unknown>, limit: number): Pointer[] {
  const out: Pointer[] = []
  for (const name of names ?? []) {
    const value = integerValue(vars.get(name))
    if (value != null && value >= 0 && value <= limit) out.push({ name, index: value })
  }
  return out
}

function isNodeObject(obj: HeapObjectEntry | undefined): boolean {
  if (!obj) return false
  if (SEQUENCE_TYPES.has(obj.type) || MAP_TYPES.has(obj.type)) return false
  if (/^\[|function|module/i.test(obj.type)) return false
  return true
}

export function buildPicture(
  snapshot: HeapSnapshot | null, events: TraceEvent[], step: number, source: string, lang?: Lang,
): Picture {
  const event = events[step] ?? null
  const picture: Picture = { line: effectLine(events, step, lang), notes: [], structures: [] }
  if (!snapshot || !event) return picture
  const changes = stepChanges(stepGroup(events, step, lang))
  // The JavaScript interpreter shows objects in its stack as text, and keeps which object each
  // name refers to in heapBindings.
  const bindings = (event.heapBindings ?? {}) as Record<string, unknown>
  const variables = visibleVariables(event).map(([name, value]): [string, unknown] => [name, bindings[name] ?? value])
  const vars = new Map(variables)
  const indexing = indexVariables(source)
  const shown = new Set<number>()
  const nodeIds = new Set<number>()
  const tagsById = new Map<number, string[]>()

  for (const [name, value] of variables) {
    const id = refId(value)
    const obj = id != null ? snapshot.objects.get(id) : undefined
    if (!obj) continue
    // A plain JavaScript object that links to nothing is a lookup table (const memo = {}), not a node.
    const linksOut = items(obj).some(([, v]) => { const r = refId(v); return r != null && isNodeObject(snapshot.objects.get(r)) })
    if (isNodeObject(obj) && (obj.type !== 'Object' || linksOut)) {
      nodeIds.add(obj.id)
      tagsById.set(obj.id, [...(tagsById.get(obj.id) ?? []), name])
      continue
    }
    if (shown.has(obj.id)) continue
    shown.add(obj.id)
    const structure = describeContainer(name, obj, snapshot, changes, indexing.get(name), vars, picture.notes)
    if (structure) {
      picture.structures.push(structure)
      if (structure.kind === 'grid') for (const row of rowObjects(obj, snapshot)) shown.add(row.id)
      // Nodes held in a list (a tree's children, a graph's nodes) are drawn as nodes too.
      if (structure.kind === 'array') {
        for (const cell of structure.cells) {
          const child = refId(cell.value)
          if (child != null && isNodeObject(snapshot.objects.get(child))) nodeIds.add(child)
        }
      }
    }
  }

  if (nodeIds.size) {
    const nodes = describeNodes(nodeIds, tagsById, snapshot, changes, picture.notes)
    if (nodes) picture.structures.push(nodes)
  }

  // What changed first: a structure the line just wrote to or read from is what to look at.
  const busy = (s: Structure) => {
    if (s.kind === 'array') return s.cells.some(c => c.written || c.read)
    if (s.kind === 'grid') return s.cells.some(row => row.some(c => c.written || c.read)) || s.rowsRead.length > 0
    if (s.kind === 'map') return s.entries.some(e => e.cell.written || e.cell.read)
    return s.nodes.some(n => n.created || n.fields.some(f => f.written)) || s.edges.some(e => e.written) || s.nulls.some(n => n.written)
  }
  picture.structures.sort((a, b) => Number(busy(b)) - Number(busy(a)))
  return picture
}

function rowObjects(obj: HeapObjectEntry, snapshot: HeapSnapshot): HeapObjectEntry[] {
  return items(obj).flatMap(([, v]) => {
    const id = refId(v)
    const child = id != null ? snapshot.objects.get(id) : undefined
    return child ? [child] : []
  })
}

function show(value: unknown): string {
  if (value === null || value === undefined) return String(value)
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(4)))
  if (typeof value === 'string') return JSON.stringify(value)
  const ref = value as { preview?: string; $ref?: number }
  if (ref.preview) return ref.preview
  if (ref.$ref != null) return `#${ref.$ref}`
  return String(value)
}

function describeContainer(
  name: string, obj: HeapObjectEntry, snapshot: HeapSnapshot, changes: StepChanges,
  index: { axes: string[][]; tuple: boolean } | undefined, vars: Map<string, unknown>, notes: string[],
): Structure | null {
  const entries = items(obj)
  const keys = entries.map(([k]) => k)
  const created = changes.created.has(obj.id)
  const isSequence = SEQUENCE_TYPES.has(obj.type) || (keys.length > 0 && keys.every(isIndex) && !MAP_TYPES.has(obj.type) && obj.type !== 'Object')

  // A grid: rows of numbers (a 2-D numpy array) or rows that are lists themselves (dp tables).
  const rows = entries.map(([, v]) => v)
  const numpyRows = rows.length > 0 && rows.every(Array.isArray)
  const children = rowObjects(obj, snapshot)
  const listRows = rows.length > 0 && children.length === rows.length
    && children.every(child => SEQUENCE_TYPES.has(child.type) && items(child).every(([k, v]) => isIndex(k) && refId(v) == null))
  if ((numpyRows || listRows) && (isSequence || MAP_TYPES.has(obj.type))) {
    return describeGrid(name, obj, entries, numpyRows, children, changes, index, vars, notes, snapshot)
  }

  if (isSequence) {
    const sorted = [...entries].sort(([a], [b]) => Number(a) - Number(b)).slice(0, MAX_CELLS)
    const cells: PictureCell[] = sorted.map(([key, value]) => {
      const write = changes.writes.get(`${obj.id}:${key}`)
      return { value, written: write ? { old: write.old } : undefined, read: changes.reads.has(`${obj.id}:${key}`), created }
    })
    // Exchanged values: position a got what b held and b got what a held.
    const swaps: [number, number][] = []
    const moves: { from: number; to: number }[] = []
    const writtenAt = cells.map((c, i) => (c.written ? i : -1)).filter(i => i >= 0)
    const paired = new Set<number>()
    for (const a of writtenAt) {
      for (const b of writtenAt) {
        if (a < b && !paired.has(a) && !paired.has(b)
            && sameValue(cells[a].value, cells[b].written!.old) && sameValue(cells[b].value, cells[a].written!.old)
            && !sameValue(cells[a].value, cells[b].value)) {
          swaps.push([a, b]); paired.add(a); paired.add(b)
        }
      }
    }
    for (const to of writtenAt) {
      if (paired.has(to)) continue
      // Copied from a neighbour (a[j + 1] = a[j]): the source still holds the value.
      const candidates = [to - 1, to + 1].filter(from => from >= 0 && from < cells.length && sameValue(cells[from].value, cells[to].value))
      if (candidates.length === 1) moves.push({ from: candidates[0], to })
    }
    const label = (i: number) => `${name}[${sorted[i][0]}]`
    for (const [a, b] of swaps) notes.push(`${label(a)} and ${label(b)} swapped: ${show(cells[b].value)} and ${show(cells[a].value)} changed places.`)
    for (const { from, to } of moves) notes.push(`${label(from)} copied into ${label(to)}: ${show(cells[to].value)} (it held ${show(cells[to].written!.old)}).`)
    for (const i of writtenAt) {
      if (paired.has(i) || moves.some(m => m.to === i)) continue
      notes.push(`${label(i)} = ${show(cells[i].value)}${cells[i].written!.old === undefined ? ' (new item)' : ` (was ${show(cells[i].written!.old)})`}.`)
    }
    return {
      kind: 'array', name, objectId: obj.id, type: obj.type, cells,
      pointers: pointersFor(index?.axes[0], vars, cells.length), swaps, moves, more: moreText(obj),
    }
  }

  // Keys and values: a dict (memo tables, visited sets keyed by state).
  const shownEntries = entries.slice(0, MAX_CELLS).map(([key, value]) => {
    const write = changes.writes.get(`${obj.id}:${key}`)
    return { key, cell: { value, written: write ? { old: write.old } : undefined, read: changes.reads.has(`${obj.id}:${key}`), created } }
  })
  for (const { key, cell } of shownEntries) {
    if (cell.written) notes.push(`${name}[${key}] = ${show(cell.value)}${cell.written.old === undefined ? ' (new key)' : ` (was ${show(cell.written.old)})`}.`)
  }
  return { kind: 'map', name, objectId: obj.id, type: obj.type, entries: shownEntries, more: moreText(obj) }
}

function describeGrid(
  name: string, obj: HeapObjectEntry, entries: [string, unknown][], numpyRows: boolean, children: HeapObjectEntry[],
  changes: StepChanges, index: { axes: string[][]; tuple: boolean } | undefined, vars: Map<string, unknown>, notes: string[],
  snapshotOf: HeapSnapshot,
): GridPicture {
  const created = changes.created.has(obj.id)
  const shownRows = entries.slice(0, MAX_CELLS)
  const width = Math.max(0, ...shownRows.map(([, v], i) => (numpyRows ? (v as unknown[]).length : items(children[i]).length)))
  const columns = Array.from({ length: Math.min(width, MAX_CELLS) }, (_, i) => String(i))
  const rowsRead: number[] = []
  const cells = shownRows.map(([rowKey, v], r) => {
    if (changes.reads.has(`${obj.id}:${rowKey}`)) rowsRead.push(r)
    if (numpyRows) {
      const values = v as unknown[]
      const write = changes.rowWrites.get(`${obj.id}:${rowKey}`)
      return columns.map((col, c) => {
        const differs = write && (!write.old || !sameValue(write.old[c], values[c]))
        return {
          value: values[c],
          written: differs ? { old: write!.old ? write!.old[c] : undefined } : undefined,
          read: changes.reads.has(`${obj.id}:${rowKey}:${c}`),
          created,
        }
      })
    }
    const child = children[r]
    return columns.map(col => {
      const write = changes.writes.get(`${child.id}:${col}`)
      return {
        value: child.properties.get(col),
        written: write ? { old: write.old } : undefined,
        read: changes.reads.has(`${child.id}:${col}`),
        created: created || changes.created.has(child.id),
      }
    })
  })
  // A row read as a whole is only interesting when none of its cells were read one by one.
  const rowsReadWhole = rowsRead.filter(r => !cells[r].some(c => c.read))
  const numbers = cells.flat().map(c => c.value).filter((v): v is number => typeof v === 'number')
  const numeric = numbers.length ? { min: Math.min(...numbers), max: Math.max(...numbers) } : null
  const tupleIndexing = numpyRows || !!index?.tuple
  const at = (r: number, c: number) => (tupleIndexing ? `${name}[${shownRows[r][0]}, ${c}]` : `${name}[${shownRows[r][0]}][${c}]`)
  const readCells: string[] = []
  cells.forEach((row, r) => row.forEach((cell, c) => { if (cell.read && !cell.written) readCells.push(at(r, c)) }))
  cells.forEach((row, r) => row.forEach((cell, c) => {
    if (!cell.written || created) return
    const from = readCells.length ? `, from ${readCells.slice(0, 4).join(', ')}${readCells.length > 4 ? '…' : ''}` : ''
    notes.push(`${at(r, c)} = ${show(cell.value)}${cell.written.old === undefined ? '' : ` (was ${show(cell.written.old)})`}${from}.`)
  }))
  return {
    kind: 'grid', name, objectId: obj.id, type: obj.type,
    rowKeys: shownRows.map(([k]) => k), columns, cells, rowsRead: rowsReadWhole,
    rowPointers: pointersFor(index?.axes[0], vars, shownRows.length),
    columnPointers: pointersFor(index?.axes[1], vars, columns.length),
    numeric, indexing: tupleIndexing ? 'tuple' : 'chained',
    ...columnNames(name, columns.length, vars, snapshotOf),
    more: moreText(obj),
  }
}

/** A list of strings as long as the grid is wide, such as ACTIONS = ['left', 'right'], names its columns. */
function columnNames(grid: string, width: number, vars: Map<string, unknown>, snapshot: HeapSnapshot): { columnLabels?: string[]; columnSource?: string } {
  for (const [name, value] of vars) {
    if (name === grid) continue
    const id = refId(value)
    const obj = id != null ? snapshot.objects.get(id) : undefined
    if (!obj || !SEQUENCE_TYPES.has(obj.type)) continue
    const list = items(obj)
    if (list.length === width && list.every(([, v]) => typeof v === 'string')) {
      return { columnLabels: list.sort(([a], [b]) => Number(a) - Number(b)).map(([, v]) => String(v)), columnSource: name }
    }
  }
  return {}
}

function describeNodes(
  start: Set<number>, tagsById: Map<number, string[]>, snapshot: HeapSnapshot, changes: StepChanges, notes: string[],
): NodesPicture | null {
  // Everything reachable from the nodes the program can see, through node fields and lists of nodes.
  const ids: number[] = []
  const queue = [...start]
  const seen = new Set<number>()
  while (queue.length && ids.length < MAX_NODES) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    const obj = snapshot.objects.get(id)
    if (!isNodeObject(obj)) continue
    ids.push(id)
    for (const [, value] of items(obj!)) {
      const child = refId(value)
      const target = child != null ? snapshot.objects.get(child) : undefined
      if (!target) continue
      if (isNodeObject(target)) queue.push(target.id)
      else if (SEQUENCE_TYPES.has(target.type)) {
        for (const [, item] of items(target)) { const r = refId(item); if (r != null) queue.push(r) }
      }
    }
  }
  if (!ids.length) return null
  const inPicture = new Set(ids)
  const nodes: NodeBox[] = []
  const edges: NodeEdge[] = []
  const nulls: NodesPicture['nulls'] = []
  const tagName = (id: number) => tagsById.get(id)?.[0] ?? `#${id}`
  for (const id of ids) {
    const obj = snapshot.objects.get(id)!
    const fields: NodeBox['fields'] = []
    for (const [key, value] of items(obj)) {
      const write = changes.writes.get(`${id}:${key}`)
      const child = refId(value)
      const target = child != null ? snapshot.objects.get(child) : undefined
      if (target && inPicture.has(target.id)) {
        edges.push({ from: id, to: target.id, label: key, written: !!write })
        if (write) notes.push(`${tagName(id)}.${key} now points to ${tagName(target.id)}${refId(write.old) != null ? ` (it pointed to ${tagName(refId(write.old)!)})` : write.old === null || write.old === undefined ? ' (it was empty)' : ''}.`)
      } else if (target && SEQUENCE_TYPES.has(target.type)) {
        items(target).forEach(([index, item]) => {
          const r = refId(item)
          if (r != null && inPicture.has(r)) edges.push({ from: id, to: r, label: `${key}[${index}]`, written: changes.writes.has(`${target.id}:${index}`) })
        })
      } else if (value === null || value === undefined) {
        nulls.push({ id, label: key, written: !!write })
        if (write && refId(write.old) != null) notes.push(`${tagName(id)}.${key} now points to nothing (it pointed to ${tagName(refId(write.old)!)}).`)
      } else if (child == null) {
        fields.push({ name: key, value, written: write ? { old: write.old } : undefined })
        if (write) notes.push(`${tagName(id)}.${key} = ${show(value)} (was ${show(write.old)}).`)
      }
    }
    nodes.push({ id, type: obj.type, fields, tags: tagsById.get(id) ?? [], created: changes.created.has(id) })
  }
  const incoming = new Map<number, number>()
  for (const e of edges) incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1)
  const outgoing = new Map<number, number>()
  for (const e of edges) outgoing.set(e.from, (outgoing.get(e.from) ?? 0) + 1)
  const forest = ids.every(id => (incoming.get(id) ?? 0) <= 1)
  // One link out of every node (next) is a chain, even when the last link points back into it
  // (a cycle): drawn left to right, with the link that goes back as a curve.
  const chain = ids.every(id => (outgoing.get(id) ?? 0) <= 1)
  let roots = ids.filter(id => !(incoming.get(id)))
  if (!roots.length) roots = [ids[0]]
  const named = [...start].find(id => inPicture.has(id))
  return {
    kind: 'nodes', name: named != null ? tagName(named) : 'nodes', nodes, edges, nulls,
    shape: chain ? 'chain' : forest ? 'tree' : 'graph', roots,
  }
}
