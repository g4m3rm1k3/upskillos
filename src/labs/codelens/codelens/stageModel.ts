// The Stage tab: a picture of the program's world (a grid, a maze, a line of positions)
// drawn from the program's own variables at the current step, by a stage spec written
// as data: which variable is the grid, which is the agent's position, what colours the
// cells. The spec can come with a library example, or be written by the learner.
// This file is the pure part: it reads variables and turns a spec into things to draw.
// StagePanel.tsx draws them with Phaser.
import type { HeapSnapshot, TraceEvent } from './types'
import { refId, visibleVariables } from './tableModel'

/** A number in the spec, or the name of a variable holding one. */
export type NumberRef = number | string
/** A cell: an index (row by row), a [row, column] pair, or a variable holding either. */
export type CellRef = number | [number, number] | string

export interface StageSpec {
  /** The grid's size. */
  grid: { rows: NumberRef; cols: NumberRef }
  /** Colours each cell by a number: a variable holding one number (or one list to reduce) per
   *  cell, as a flat list (row by row) or a list of rows. */
  heat?: { var: string; reduce?: 'max' | 'min' | 'sum' | 'first'; label?: boolean }
  /** Cells drawn as walls where this variable (flat or rows) holds a truthy value. */
  walls?: { var: string }
  /** Fixed things: a goal, a start. */
  markers?: { at: CellRef; color?: string; label?: string }[]
  /** The moving thing: drawn on top, and slides from cell to cell as the step changes. */
  agent?: { at: CellRef; color?: string; label?: string }
  /** Variables shown under the grid, as "name = value". */
  caption?: string[]
}

export interface StageCell { row: number; col: number; heat: number | null; wall: boolean; text: string | null }
export interface StageMark { key: string; row: number; col: number; color: string; label: string | null }
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
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function cell(ref: CellRef, vars: Record<string, unknown>, cols: number): [number, number] | null {
  const v = typeof ref === 'string' ? vars[ref] : ref
  if (typeof v === 'number' && Number.isInteger(v)) return [Math.floor(v / cols), v % cols]
  if (Array.isArray(v) && v.length === 2 && v.every(n => typeof n === 'number')) return [v[0] as number, v[1] as number]
  return null
}

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

  const heatValue = spec.heat ? vars[spec.heat.var] : undefined
  if (spec.heat && heatValue === undefined) problems.push(`${spec.heat.var} has no value yet.`)
  const heatLayout = rowsOf(heatValue, rows, cols)
  const wallValue = spec.walls ? vars[spec.walls.var] : undefined
  if (spec.walls && wallValue === undefined) problems.push(`${spec.walls.var} has no value yet.`)
  const wallLayout = rowsOf(wallValue, rows, cols)

  const cells: StageCell[] = []
  let lo = Infinity
  let hi = -Infinity
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const heat = spec.heat ? reduce(valueAt(heatValue, heatLayout, r, c, cols), spec.heat.reduce) : null
      if (heat != null) { lo = Math.min(lo, heat); hi = Math.max(hi, heat) }
      const wall = !!valueAt(wallValue, wallLayout, r, c, cols)
      cells.push({ row: r, col: c, heat, wall, text: heat != null && spec.heat?.label !== false ? shortNumber(heat) : null })
    }
  }

  const place = (key: string, ref: CellRef, color: string, label: string | undefined): StageMark | null => {
    const p = cell(ref, vars, cols)
    if (!p) { problems.push(`${typeof ref === 'string' ? ref : JSON.stringify(ref)} is not a cell yet.`); return null }
    const [row, col] = p
    if (row < 0 || row >= rows || col < 0 || col >= cols) { problems.push(`${typeof ref === 'string' ? ref : JSON.stringify(ref)} = (${row}, ${col}) is off the grid.`); return null }
    return { key, row, col, color, label: label ?? null }
  }
  const markers = (spec.markers ?? []).flatMap((m, i) => {
    const mark = place(`marker-${i}`, m.at, m.color ?? '#f5b301', m.label)
    return mark ? [mark] : []
  })
  const agent = spec.agent ? place('agent', spec.agent.at, spec.agent.color ?? '#38bdf8', spec.agent.label) : null
  const caption = (spec.caption ?? []).filter(name => vars[name] !== undefined).map(name => `${name} = ${display(vars[name])}`).join('   ')

  return { rows, cols, cells, range: lo <= hi ? [lo, hi] : null, markers, agent, caption, problems }
}

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
