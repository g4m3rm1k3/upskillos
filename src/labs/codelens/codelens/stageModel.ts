// The Stage tab: a picture of the program's world (a grid, a maze, a line of positions)
// drawn from the program's own variables at the current step, by a stage spec written
// as data: which variable is the grid, which is the agent's position, what colours the
// cells. The spec can come with a library example, or be written by the learner.
// This file is the pure part: it reads variables and turns a spec into things to draw.
// StagePanel.tsx draws them with Phaser.
import type { HeapSnapshot, TraceEvent } from './types'
import { refId, visibleVariables } from './tableModel'

/** A number in the spec, or the name of a variable holding one (a variable holding a list
 *  gives that list's length: "cols": "cards"). */
export type NumberRef = number | string
/** A cell: an index (row by row), a [row, column] pair of numbers or variable names, or a
 *  variable holding either. */
export type CellRef = number | string | [NumberRef, NumberRef]

export interface StageSpec {
  /** The grid's size. */
  grid: { rows: NumberRef; cols: NumberRef }
  /** Colours each cell from a variable holding one value per cell, as a flat list (row by row)
   *  or a list of rows. Numbers are shaded (green above zero, red below); a list per cell is
   *  reduced to one number. With a palette, each exact value gets its own colour instead. */
  heat?: {
    var: string
    reduce?: 'max' | 'min' | 'sum' | 'first'
    /** Write the number in the cell (default true). */
    label?: boolean
    /** A colour for each value, e.g. { "0": "#ef4444", "1": "#f5f5f5" }. */
    palette?: Record<string, string>
    /** Values that mean "nothing here yet" (BFS's -1): left blank. */
    empty?: (number | string)[]
  }
  /** Writes each cell's value, whatever it is ("A", "Q"), from a variable shaped like heat's. */
  text?: { var: string; empty?: (number | string)[] }
  /** Cells drawn as walls where this variable (flat or rows) holds a truthy value. */
  walls?: { var: string }
  /** Goals and pointers: an index variable like i, lo or hi is drawn where it points, and
   *  simply not drawn while it doesn't exist or points off the grid (j = -1). */
  markers?: { at: CellRef; color?: string; label?: string }[]
  /** The moving thing: drawn on top, and slides from cell to cell as the step changes. */
  agent?: { at: CellRef; color?: string; label?: string }
  /** Variables shown under the grid, as "name = value". */
  caption?: string[]
}

export interface StageCell {
  row: number
  col: number
  heat: number | null
  /** A palette colour, when the heat has a palette. */
  color: string | null
  wall: boolean
  text: string | null
}
export interface StageMark { key: string; row: number; col: number; color: string; label: string | null; index: number }
export interface Stage {
  rows: number
  cols: number
  cells: StageCell[]
  /** The smallest and largest heat values, for the colour scale. */
  range: [number, number] | null
  markers: StageMark[]
  agent: StageMark | null
  caption: string
  /** Why something in the spec could not be drawn at this step. */
  problems: string[]
}

const MAX_DEPTH = 4
const MAX_CELLS = 400

/** A heap value as plain JavaScript: lists become arrays, dictionaries and objects become objects. */
export function plainValue(value: unknown, snapshot: HeapSnapshot | null, depth = 0): unknown {
  const id = refId(value)
  if (id == null) return value
  const obj = snapshot?.objects.get(id)
  if (!obj || depth > MAX_DEPTH) return undefined
  const entries = [...obj.properties].filter(([key]) => key !== '__mapData__' && key !== 'length' && key !== '…')
  if (entries.length && entries.every(([key]) => /^\d+$/.test(key))) {
    const out: unknown[] = []
    for (const [key, v] of entries) out[Number(key)] = plainValue(v, snapshot, depth + 1)
    return out
  }
  return Object.fromEntries(entries.map(([key, v]) => [key, plainValue(v, snapshot, depth + 1)]))
}

/** The variables visible at this step (innermost frame first), as plain values. */
export function stageVariables(event: TraceEvent | null, snapshot: HeapSnapshot | null): Record<string, unknown> {
  // The JavaScript interpreter shows objects in its stack as text, and keeps which object each
  // name refers to in heapBindings.
  const bindings = (event?.heapBindings ?? {}) as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [name, value] of visibleVariables(event)) out[name] = plainValue(bindings[name] ?? value, snapshot)
  return out
}

function num(ref: NumberRef, vars: Record<string, unknown>): number | null {
  const v = typeof ref === 'string' ? vars[ref] : ref
  if (Array.isArray(v)) return v.length   // "cols": "cards" — as many columns as cards has items
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function cell(ref: CellRef, vars: Record<string, unknown>, cols: number): [number, number] | null {
  // A pair of variable names (or numbers): ["r", "c"].
  if (Array.isArray(ref)) {
    const r = num(ref[0], vars)
    const c = num(ref[1], vars)
    return r != null && c != null && Number.isInteger(r) && Number.isInteger(c) ? [r, c] : null
  }
  const v = typeof ref === 'string' ? vars[ref] : ref
  if (typeof v === 'number' && Number.isInteger(v)) return v < 0 ? null : [Math.floor(v / cols), v % cols]
  if (Array.isArray(v) && v.length === 2 && v.every(n => typeof n === 'number')) return [v[0] as number, v[1] as number]
  return null
}

const refText = (ref: CellRef) => (typeof ref === 'string' ? ref : JSON.stringify(ref))

function reduce(v: unknown, how: NonNullable<StageSpec['heat']>['reduce']): number | null {
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  if (!Array.isArray(v)) return null
  const nums = v.filter((n): n is number => typeof n === 'number')
  if (!nums.length) return null
  if (how === 'min') return Math.min(...nums)
  if (how === 'sum') return nums.reduce((a, b) => a + b, 0)
  if (how === 'first') return nums[0]
  return Math.max(...nums)
}

// A variable for the grid is a list of rows when it has one list per row, each as long as a row;
// otherwise it is one entry per cell, row by row (Q[state] holding a pair of action values is that).
function rowsOf(value: unknown, rows: number, cols: number): 'rows' | 'flat' | null {
  if (!Array.isArray(value)) return null
  if (rows > 1 && value.length === rows && value.every(r => Array.isArray(r) && r.length === cols)) return 'rows'
  return 'flat'
}

function valueAt(value: unknown, layout: 'rows' | 'flat' | null, row: number, col: number, cols: number): unknown {
  if (!layout || !Array.isArray(value)) return undefined
  if (layout === 'rows') return (value[row] as unknown[])[col]
  return value[row * cols + col]
}

function shortNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(Math.abs(n) >= 10 ? 1 : 2)
}

function display(v: unknown): string {
  if (typeof v === 'number') return shortNumber(v)
  if (typeof v === 'string') return JSON.stringify(v)
  if (v === null || v === undefined) return String(v)
  const text = JSON.stringify(v)
  return text.length > 40 ? text.slice(0, 39) + '…' : text
}

const isEmpty = (v: unknown, empty?: (number | string)[]) => v === undefined || v === null || (empty ?? []).some(e => e === v)

/** A cell's own value as text: numbers short, strings as they are. */
function cellText(v: unknown): string {
  if (typeof v === 'number') return shortNumber(v)
  if (typeof v === 'string') return v
  if (typeof v === 'boolean') return v ? 'T' : 'F'
  return display(v)
}

export function buildStage(spec: StageSpec, vars: Record<string, unknown>): Stage {
  const problems: string[] = []
  const rows = num(spec.grid.rows, vars)
  const cols = num(spec.grid.cols, vars)
  const empty: Stage = { rows: 0, cols: 0, cells: [], range: null, markers: [], agent: null, caption: '', problems }
  if (rows == null || cols == null || rows < 1 || cols < 1) {
    problems.push(`The grid size (${spec.grid.rows} × ${spec.grid.cols}) has no value yet.`)
    return empty
  }
  if (rows * cols > MAX_CELLS) {
    problems.push(`A ${rows} × ${cols} grid is too big to draw (at most ${MAX_CELLS} cells).`)
    return empty
  }

  const source = (part?: { var: string }) => {
    const value = part ? vars[part.var] : undefined
    if (part && value === undefined) problems.push(`${part.var} has no value yet.`)
    return { value, layout: rowsOf(value, rows, cols) }
  }
  const heatSrc = source(spec.heat)
  const textSrc = source(spec.text)
  const wallSrc = source(spec.walls)

  const cells: StageCell[] = []
  let lo = Infinity
  let hi = -Infinity
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let heat: number | null = null
      let color: string | null = null
      let text: string | null = null
      if (spec.heat) {
        const raw = valueAt(heatSrc.value, heatSrc.layout, r, c, cols)
        if (!isEmpty(raw, spec.heat.empty)) {
          if (spec.heat.palette) color = spec.heat.palette[String(raw)] ?? null
          else {
            heat = reduce(raw, spec.heat.reduce)
            if (heat != null) { lo = Math.min(lo, heat); hi = Math.max(hi, heat) }
          }
          if (spec.heat.label !== false && !spec.text) text = heat != null ? shortNumber(heat) : raw === undefined ? null : cellText(raw)
        }
      }
      if (spec.text) {
        const raw = valueAt(textSrc.value, textSrc.layout, r, c, cols)
        text = isEmpty(raw, spec.text.empty) ? null : cellText(raw)
      }
      const wall = !!valueAt(wallSrc.value, wallSrc.layout, r, c, cols)
      cells.push({ row: r, col: c, heat, color, wall, text })
    }
  }

  const onGrid = (p: [number, number] | null) => p && p[0] >= 0 && p[0] < rows && p[1] >= 0 && p[1] < cols ? p : null
  // Markers are pointers as often as goals: one whose variable doesn't exist yet, or points off
  // the grid (j = -1), is simply not drawn.
  const markers = (spec.markers ?? []).flatMap((m, i) => {
    const p = onGrid(cell(m.at, vars, cols))
    return p ? [{ key: `marker-${i}`, row: p[0], col: p[1], color: m.color ?? MARKER_COLORS[i % MARKER_COLORS.length], label: m.label ?? null, index: i }] : []
  })
  let agent: StageMark | null = null
  if (spec.agent) {
    const raw = cell(spec.agent.at, vars, cols)
    const p = onGrid(raw)
    if (!raw) problems.push(`${refText(spec.agent.at)} is not a cell yet.`)
    else if (!p) problems.push(`${refText(spec.agent.at)} = (${raw[0]}, ${raw[1]}) is off the grid.`)
    else agent = { key: 'agent', row: p[0], col: p[1], color: spec.agent.color ?? '#38bdf8', label: spec.agent.label ?? null, index: 0 }
  }
  const caption = (spec.caption ?? []).filter(name => vars[name] !== undefined).map(name => `${name} = ${display(vars[name])}`).join('   ')

  return { rows, cols, cells, range: lo <= hi ? [lo, hi] : null, markers, agent, caption, problems }
}

/** Marker colours when the spec gives none: distinct, so i and j are told apart. */
export const MARKER_COLORS = ['#f5b301', '#f472b6', '#a78bfa', '#38bdf8', '#34d399']

/** A heat value as a colour: red below zero, green above, fading to the background at zero. */
export function heatColor(value: number, range: [number, number]): { color: number; alpha: number } {
  const span = Math.max(Math.abs(range[0]), Math.abs(range[1])) || 1
  const t = Math.min(1, Math.abs(value) / span)
  return { color: value < 0 ? 0xef4444 : 0x22c55e, alpha: 0.12 + 0.68 * t }
}

/** Reads a spec written as JSON by the learner. */
export function parseStageSpec(text: string): { spec: StageSpec | null; error: string | null } {
  let data: unknown
  try { data = JSON.parse(text) } catch (err) { return { spec: null, error: `Not valid JSON: ${(err as Error).message}` } }
  const s = data as StageSpec
  if (!s || typeof s !== 'object' || !s.grid || s.grid.rows === undefined || s.grid.cols === undefined) {
    return { spec: null, error: 'A stage needs "grid": { "rows": …, "cols": … }.' }
  }
  return { spec: s, error: null }
}
