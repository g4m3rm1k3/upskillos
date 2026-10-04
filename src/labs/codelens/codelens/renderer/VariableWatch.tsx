/**
 * VariableWatch — debugger-style variable inspector with optional per-variable
 * sparkline timelines showing how each value changes across all execution steps.
 *
 * Font sizes/padding here are deliberately larger than the rest of CodeLens's
 * side panels (13px values instead of 11px, more row padding) — this view was
 * reported as hard to read at the old sizes, since it's the panel students
 * stare at the longest while stepping through execution.
 */
import { useState, useMemo, useCallback, useRef, useEffect, type MouseEvent as ReactMouseEvent } from 'react'
import type { TraceEvent, StackFrame, HeapSnapshot } from '../types'
import { useCodeLensTheme } from '../ThemeContext'
import type { CodeLensUiPalette } from '../theme'
import { heapObjectLabel } from './heapSnapshot'

// ── Type helpers ──────────────────────────────────────────────────────────────

type VarType = 'number' | 'string' | 'boolean' | 'null' | 'undefined' | 'ref' | 'object'

function getType(v: unknown): VarType {
  if (v === null)      return 'null'
  if (v === undefined) return 'undefined'
  if (v !== null && typeof v === 'object' && '$ref' in v) return 'ref'
  return typeof v as VarType
}

function isRefValue(v: unknown): v is { $ref: number } {
  return v !== null && typeof v === 'object' && '$ref' in v
}

function fmtVal(v: unknown, heap: HeapSnapshot | null | undefined): string {
  if (v === null)      return 'null'
  if (v === undefined) return 'undefined'
  if (typeof v === 'boolean') return String(v)
  if (typeof v === 'number')  return String(v)
  if (typeof v === 'string') {
    const s = v.length > 28 ? v.slice(0, 28) + '…' : v
    return `"${s}"`
  }
  if (isRefValue(v)) {
    const obj  = heap?.objects?.get(v.$ref)
    const type = obj?.type ?? 'Object'
    if (obj?.names?.length) return `→ ${heapObjectLabel(obj)} (${type} #${v.$ref})`
    if (type === 'Array') {
      const len = obj?.properties?.get('length')
      return `→ Array[${len ?? '?'}] #${v.$ref}`
    }
    return `→ ${type} #${v.$ref}`
  }
  return JSON.stringify(v)
}

interface TypeMeta { label: string; color: string }

function typeMeta(t: VarType, ui: CodeLensUiPalette): TypeMeta {
  const TYPE_META: Record<string, TypeMeta> = {
    number:    { label: 'num',   color: ui.green },
    string:    { label: 'str',   color: ui.amber },
    boolean:   { label: 'bool',  color: ui.pink },
    null:      { label: 'null',  color: ui.textFaint },
    undefined: { label: 'undef', color: ui.borderStrong },
    ref:       { label: 'ref',   color: ui.accent },
  }
  return TYPE_META[t] ?? TYPE_META['undefined']
}

interface TimelinePoint { step: number; value: unknown }

// ── Timeline builder ──────────────────────────────────────────────────────────
// For each "frameName:varName" key, records the variable's value at every step
// where it exists — taking the innermost frame when the function is recursive.

function buildTimelines(events: TraceEvent[]): Map<string, TimelinePoint[]> {
  const map = new Map<string, TimelinePoint[]>()
  events.forEach((evt, i) => {
    const frames = [...(evt.stackSnapshot ?? [])].reverse() // innermost first
    const seenNames = new Set<string>()
    for (const frame of frames) {
      const fname = frame.name ?? '__global__'
      if (seenNames.has(fname)) continue   // only innermost instance per step
      seenNames.add(fname)
      for (const [vname, value] of Object.entries(frame.locals ?? {})) {
        const key = `${fname}:${vname}`
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push({ step: i, value })
      }
    }
  })
  return map
}

// ── Diff builder ──────────────────────────────────────────────────────────────

interface VarDiff { old: unknown; new: unknown }

function buildDiffs(frames: StackFrame[], prevFrames: StackFrame[]): Record<number, Record<string, VarDiff>> {
  const result: Record<number, Record<string, VarDiff>> = {}
  frames.forEach((frame, fi) => {
    const prev     = prevFrames[fi]
    const locals   = frame.locals ?? {}
    const prevLocs = prev?.locals ?? {}
    const changed: Record<string, VarDiff> = {}
    for (const [name, val] of Object.entries(locals)) {
      if (JSON.stringify(val) !== JSON.stringify(prevLocs[name])) {
        changed[name] = { old: prevLocs[name], new: val }
      }
    }
    if (Object.keys(changed).length) result[fi] = changed
  })
  return result
}

// ── VarTimeline ───────────────────────────────────────────────────────────────

const TL_H      = 18
const TL_PAD    = 3

function numericSparkline(points: TimelinePoint[], totalSteps: number, step: number, ui: CodeLensUiPalette) {
  const vals   = points.map(p => p.value as number)
  const minV   = Math.min(...vals)
  const maxV   = Math.max(...vals)
  const range  = maxV - minV || 1

  // Build polyline points in viewBox coordinates
  const ptStr = points
    .map(p => {
      const x = p.step + 0.5
      const y = TL_H - TL_PAD - (((p.value as number) - minV) / range) * (TL_H - TL_PAD * 2)
      return `${x},${y}`
    })
    .join(' ')

  // Find nearest point to current step for the cursor dot
  const nearest = points.reduce((best, p) =>
    Math.abs(p.step - step) < Math.abs(best.step - step) ? p : best
  , points[0])
  const dotY = nearest
    ? TL_H - TL_PAD - (((nearest.value as number) - minV) / range) * (TL_H - TL_PAD * 2)
    : TL_H / 2

  return (
    <>
      <polyline points={ptStr} fill="none" stroke={ui.accentSolid} strokeWidth={1} opacity={0.8} />
      {/* min/max baselines */}
      <line x1={0} y1={TL_H - TL_PAD} x2={totalSteps} y2={TL_H - TL_PAD}
        stroke={ui.border} strokeWidth={0.5} />
      {/* cursor */}
      <line x1={step + 0.5} y1={0} x2={step + 0.5} y2={TL_H}
        stroke="white" strokeWidth={0.8} opacity={0.45} />
      {/* active dot */}
      {nearest && (
        <circle cx={nearest.step + 0.5} cy={dotY} r={1.8} fill={ui.amber} />
      )}
    </>
  )
}

function booleanTimeline(points: TimelinePoint[], totalSteps: number, step: number, ui: CodeLensUiPalette) {
  const segments: { start: number; end: number; val: boolean }[] = []
  for (let i = 0; i < points.length; i++) {
    const start = points[i].step
    const end   = i + 1 < points.length ? points[i + 1].step : totalSteps
    segments.push({ start, end, val: points[i].value as boolean })
  }
  return (
    <>
      {segments.map((seg, i) => (
        <rect key={i}
          x={seg.start} y={TL_PAD}
          width={seg.end - seg.start} height={TL_H - TL_PAD * 2}
          fill={seg.val ? ui.greenBright + '44' : ui.red + '44'}
          stroke={seg.val ? ui.greenBright : ui.red}
          strokeWidth={0.4}
        />
      ))}
      <line x1={step + 0.5} y1={0} x2={step + 0.5} y2={TL_H}
        stroke="white" strokeWidth={0.8} opacity={0.45} />
    </>
  )
}

function stringTimeline(points: TimelinePoint[], totalSteps: number, step: number, ui: CodeLensUiPalette) {
  // Assign a stable color to each unique string value
  const unique = [...new Set(points.map(p => p.value))]
  const palette = [ui.accent, ui.greenBright, ui.amber, ui.pink, ui.cyan, ui.purple, ui.amberSoft]
  const colorOf = (v: unknown) => palette[unique.indexOf(v) % palette.length]

  const segments: { start: number; end: number; val: unknown }[] = []
  for (let i = 0; i < points.length; i++) {
    const start = points[i].step
    const end   = i + 1 < points.length ? points[i + 1].step : totalSteps
    segments.push({ start, end, val: points[i].value })
  }
  return (
    <>
      {segments.map((seg, i) => (
        <rect key={i}
          x={seg.start} y={TL_PAD}
          width={seg.end - seg.start} height={TL_H - TL_PAD * 2}
          fill={colorOf(seg.val) + '55'}
          stroke={colorOf(seg.val)}
          strokeWidth={0.4}
        />
      ))}
      <line x1={step + 0.5} y1={0} x2={step + 0.5} y2={TL_H}
        stroke="white" strokeWidth={0.8} opacity={0.45} />
    </>
  )
}

interface VarTimelineProps {
  points: TimelinePoint[] | undefined
  totalSteps: number
  step: number
  onSeek: (step: number) => void
  typeColor?: string
}

function VarTimeline({ points, totalSteps, step, onSeek, typeColor }: VarTimelineProps) {
  const { theme: { ui } } = useCodeLensTheme()
  const svgRef = useRef<SVGSVGElement>(null)

  const seekAt = useCallback((e: { clientX: number }) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || totalSteps === 0) return
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onSeek(Math.round(ratio * (totalSteps - 1)))
  }, [totalSteps, onSeek])

  const onMouseDown = useCallback((e: ReactMouseEvent) => {
    e.preventDefault()
    seekAt(e)
    const onMove = (ev: globalThis.MouseEvent) => seekAt(ev)
    const onUp   = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [seekAt])

  if (!points?.length || totalSteps === 0) return null

  const firstType = typeof points[0].value
  let content = null
  if (firstType === 'number') {
    content = numericSparkline(points, totalSteps, step, ui)
  } else if (firstType === 'boolean') {
    content = booleanTimeline(points, totalSteps, step, ui)
  } else if (firstType === 'string') {
    content = stringTimeline(points, totalSteps, step, ui)
  } else {
    // ref / null / etc — show activity blips
    content = (
      <>
        {points.map((p, i) => (
          <rect key={i} x={p.step} y={TL_PAD} width={1} height={TL_H - TL_PAD * 2}
            fill={typeColor ?? ui.accent} opacity={0.6} />
        ))}
        <line x1={step + 0.5} y1={0} x2={step + 0.5} y2={TL_H}
          stroke="white" strokeWidth={0.8} opacity={0.45} />
      </>
    )
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${totalSteps} ${TL_H}`}
      preserveAspectRatio="none"
      width="100%"
      height={TL_H}
      style={{ display: 'block', cursor: 'col-resize', background: ui.headerBg }}
      onMouseDown={onMouseDown}
    >
      {content}
    </svg>
  )
}

// ── Inline object/array expander ──────────────────────────────────────────────

interface InlineObjectViewProps {
  obj: NonNullable<ReturnType<HeapSnapshot['objects']['get']>>
  heap: HeapSnapshot | null | undefined
  indent: number
  mutatedProps: Set<string> | null
  ui: CodeLensUiPalette
}

function inlineValColor(v: unknown, ui: CodeLensUiPalette): string {
  return v === null || v === undefined ? ui.textFaint
    : typeof v === 'number' ? ui.green
    : typeof v === 'string' ? ui.amber
    : typeof v === 'boolean' ? ui.pink
    : ui.accent
}

function inlineValStr(v: unknown): string {
  return v === null ? 'null'
    : v === undefined ? 'undef'
    : isRefValue(v) ? `→ #${v.$ref}`
    : typeof v === 'string' ? `"${v}"` : String(v)
}

function InlineObjectView({ obj, indent, mutatedProps, ui }: InlineObjectViewProps) {
  if (!obj) return null

  if (obj.type === 'Array') {
    const len   = parseInt(String(obj.properties.get('length') ?? 0), 10)
    const elems: unknown[] = []
    for (const [k, v] of obj.properties) {
      const idx = parseInt(k, 10)
      if (!isNaN(idx) && idx < len) elems[idx] = v
    }
    return (
      <div>
        {elems.map((v, i) => {
          const hit = mutatedProps?.has(String(i))
          return (
            <div key={i} style={{
              display: 'flex', gap: 6, alignItems: 'baseline',
              padding: `1px ${indent + 6}px 1px ${indent}px`,
              background: hit ? 'rgba(245,158,11,0.1)' : 'transparent',
              borderLeft: `2px solid ${hit ? ui.amber : 'transparent'}`,
            }}>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                color: ui.textFaint, flexShrink: 0, minWidth: 32 }}>
                [{i}]
              </span>
              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                color: hit ? ui.amber : inlineValColor(v, ui), fontWeight: hit ? 700 : 400 }}>
                {inlineValStr(v)}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  // Generic object — show non-length properties
  const entries = [...obj.properties].filter(([k]) => k !== '__proto__')
  if (entries.length === 0) return (
    <div style={{ padding: `1px ${indent + 6}px 1px ${indent}px`,
      fontSize: 10, color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace',
      fontStyle: 'italic' }}>empty</div>
  )
  return (
    <div>
      {entries.map(([k, v]) => {
        const hit = mutatedProps?.has(k)
        return (
          <div key={k} style={{
            display: 'flex', gap: 6, alignItems: 'baseline',
            padding: `1px ${indent + 6}px 1px ${indent}px`,
            background: hit ? 'rgba(245,158,11,0.1)' : 'transparent',
            borderLeft: `2px solid ${hit ? ui.amber : 'transparent'}`,
          }}>
            <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
              color: ui.cyan, flexShrink: 0 }}>{k}:</span>
            <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
              color: hit ? ui.amber : inlineValColor(v, ui), fontWeight: hit ? 700 : 400 }}>
              {inlineValStr(v)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── VarRow ────────────────────────────────────────────────────────────────────

interface VarRowProps {
  name: string
  value: unknown
  diff?: VarDiff
  heap: HeapSnapshot | null | undefined
  indent?: number
  timeline: TimelinePoint[] | undefined
  step: number
  onSeek: (step: number) => void
  totalSteps: number
  showTimeline: boolean
  mutatedByObject: Map<number, Set<string>>
}

function VarRow({ name, value, diff, heap, indent = 20, timeline, step, onSeek, totalSteps, showTimeline, mutatedByObject }: VarRowProps) {
  const { theme: { ui } } = useCodeLensTheme()
  const [expanded, setExpanded] = useState(false)
  const type    = getType(value)
  const meta    = typeMeta(type, ui)
  const display = fmtVal(value, heap)
  const changed = !!diff
  const isRef   = type === 'ref'

  // Long strings (including the interpreter's own pre-rendered object/array
  // summaries, e.g. a memoization cache like "{ 2: 1, 3: 2, 4: 3 }") get
  // truncated at 28 chars by fmtVal — expandable here too, not just refs, so
  // the full value is always reachable instead of stuck behind "…".
  const isTruncatableString = typeof value === 'string' && value.length > 28
  const expandable = (isRef) || isTruncatableString

  // Auto-expand when the object this ref points to was mutated this step
  const refId = isRef && isRefValue(value) ? value.$ref : null
  const objMutatedProps = refId != null ? (mutatedByObject.get(refId) ?? null) : null
  const objWasMutated = !!objMutatedProps && objMutatedProps.size > 0

  useEffect(() => {
    if (objWasMutated) setExpanded(true)
  }, [objWasMutated])

  const obj = isRef && refId != null ? heap?.objects?.get(refId) : null

  return (
    <div>
      <div
        onClick={expandable ? () => setExpanded(e => !e) : undefined}
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        6,
          padding:    `4px ${indent + 6}px 4px ${indent}px`,
          background: changed ? 'rgba(245,158,11,0.07)' : 'transparent',
          borderLeft: `2px solid ${changed ? ui.amber : 'transparent'}`,
          transition: 'background 0.15s',
          minWidth:   0,
          cursor:     expandable ? 'pointer' : 'default',
        }}>
        {/* Expand toggle for refs and long strings */}
        {expandable && (
          <span style={{ fontSize: 9, color: ui.textFaint, flexShrink: 0, width: 10, userSelect: 'none' }}>
            {expanded ? '▼' : '▶'}
          </span>
        )}

        <span style={{
          fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
          color: ui.cyan, flexShrink: 0, minWidth: expandable ? 58 : 68,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </span>

        {changed ? (
          <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
            <span style={{ color: ui.textMuted, textDecoration: 'line-through', fontSize: 11, flexShrink: 0 }}>
              {fmtVal(diff!.old, heap)}
            </span>
            <span style={{ color: ui.textFaint, flexShrink: 0 }}>→</span>
            <span style={{ color: ui.amber, fontWeight: 600, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {display}
            </span>
          </span>
        ) : (
          <span style={{
            flex: 1, minWidth: 0, fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
            // Refs that were mutated this step get a warm highlight so they look "live"
            color: objWasMutated ? ui.amberSoft : meta.color,
            fontWeight: objWasMutated ? 600 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {display}
          </span>
        )}

        <span style={{
          fontSize: 9, padding: '1px 5px', borderRadius: 99, flexShrink: 0,
          background: meta.color + '18', color: meta.color, border: `1px solid ${meta.color}33`,
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {meta.label}
        </span>
      </div>

      {/* Inline expansion */}
      {isRef && expanded && obj && (
        <div style={{
          borderLeft: `2px solid ${objWasMutated ? ui.amber + '44' : ui.border}`,
          marginLeft: indent + 8, marginRight: 6, marginBottom: 2,
        }}>
          <InlineObjectView obj={obj} heap={heap} indent={8} mutatedProps={objMutatedProps} ui={ui} />
        </div>
      )}

      {/* Full untruncated string */}
      {isTruncatableString && expanded && (
        <div style={{
          borderLeft: `2px solid ${ui.border}`,
          marginLeft: indent + 8, marginRight: 6, marginBottom: 2,
          padding: '3px 8px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
          color: meta.color, wordBreak: 'break-all', whiteSpace: 'pre-wrap',
        }}>
          {value as string}
        </div>
      )}

      {/* Sparkline */}
      {showTimeline && timeline && timeline.length > 1 && (
        <div style={{ paddingLeft: indent, paddingRight: indent + 6, paddingBottom: 3 }}>
          <VarTimeline
            points={timeline}
            totalSteps={totalSteps}
            step={step}
            onSeek={onSeek}
            typeColor={meta.color}
          />
        </div>
      )}
    </div>
  )
}

// ── FrameHeader ───────────────────────────────────────────────────────────────

interface FrameHeaderProps {
  frame: StackFrame
  isActive: boolean
  isGlobal: boolean
  collapsed?: boolean
  onToggle?: () => void
  ui: CodeLensUiPalette
}

function FrameHeader({ frame, isActive, isGlobal, collapsed, onToggle, ui }: FrameHeaderProps) {
  return (
    <div
      onClick={isGlobal ? onToggle : undefined}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        6,
        padding:    '5px 10px',
        background: isActive ? ui.panelBg : 'transparent',
        borderLeft: `2px solid ${isActive ? ui.accentSolid : ui.border}`,
        marginTop:  isActive ? 0 : 4,
        cursor:     isGlobal ? 'pointer' : 'default',
      }}>
      {isGlobal && (
        <span style={{ fontSize: 9, color: ui.borderStrong, flexShrink: 0 }}>
          {collapsed ? '▶' : '▼'}
        </span>
      )}
      <span style={{
        fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
        color: isActive ? ui.accent : isGlobal ? ui.borderStrong : ui.textFaint,
        fontWeight: isActive ? 700 : 400,
      }}>
        {isGlobal ? 'global scope' : (frame.name ?? '(anonymous)')}
      </span>
      {isActive && (
        <span style={{
          fontSize: 9, padding: '1px 5px', borderRadius: 99,
          background: ui.accentBg, color: ui.accent,
          fontFamily: 'JetBrains Mono, monospace',
        }}>current</span>
      )}
      {frame.line && !isGlobal && (
        <span style={{
          marginLeft: 'auto', fontSize: 9, color: ui.borderStrong,
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          L{frame.line}
        </span>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface VariableWatchProps {
  currentEvent: TraceEvent | null
  prevEvent: TraceEvent | null
  heapSnapshot: HeapSnapshot | null
  events: TraceEvent[] | undefined
  step: number
  onSeek: (step: number) => void
  onShowEnvModel?: () => void
  heapDelta: TraceEvent['heapDelta']
}

export default function VariableWatch({
  currentEvent, prevEvent, heapSnapshot,
  events, step, onSeek,
  onShowEnvModel,
  heapDelta,
}: VariableWatchProps) {
  const { theme: { ui } } = useCodeLensTheme()
  const [flat,           setFlat]           = useState(false)
  const [showTimelines,  setShowTimelines]  = useState(false)
  const [globalExpanded, setGlobalExpanded] = useState(false)

  // Build per-objectId mutated-property sets from the current step's heap delta
  const mutatedByObject = useMemo(() => {
    const map = new Map<number, Set<string>>()
    for (const d of heapDelta ?? []) {
      if (d.op === 'mutate') {
        if (!map.has(d.objectId)) map.set(d.objectId, new Set())
        map.get(d.objectId)!.add(String(d.property))
      }
    }
    return map
  }, [heapDelta])

  // Pre-compute timelines for all variables across all steps
  const timelines = useMemo(
    () => events?.length ? buildTimelines(events) : new Map<string, TimelinePoint[]>(),
    [events],
  )

  const totalSteps = events?.length ?? 0

  if (!currentEvent) {
    return (
      <div style={{ padding: '16px 12px', color: ui.textFaint, fontSize: 12 }}>
        Run code to see live variables.
      </div>
    )
  }

  const frames     = [...(currentEvent.stackSnapshot ?? [])].reverse()
  const prevFrames = [...(prevEvent?.stackSnapshot   ?? [])].reverse()
  const diffs      = buildDiffs(frames, prevFrames)

  const changedNames = [...new Set(
    Object.values(diffs).flatMap(d => Object.keys(d))
  )]

  const flatVars = (() => {
    const seen   = new Set<string>()
    const result: { name: string; value: unknown; diff?: VarDiff; fname: string }[] = []
    frames.forEach((frame, fi) => {
      const isGlobal = frame.name === '__global__'
      for (const [name, value] of Object.entries(frame.locals ?? {})) {
        if (!seen.has(name)) {
          seen.add(name)
          // Exclude function-value bindings from the global frame in flat view
          if (isGlobal && typeof value === 'string' && value.startsWith('[Function')) continue
          const fname = frame.name ?? '__global__'
          result.push({ name, value, diff: diffs[fi]?.[name], fname })
        }
      }
    })
    return result
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 10px', borderBottom: `1px solid ${ui.border}`, flexShrink: 0,
      }}>
        <span style={{
          fontSize: 9, color: ui.borderStrong, letterSpacing: '.08em',
          fontFamily: 'JetBrains Mono, monospace',
        }}>VARIABLES</span>

        {changedNames.length > 0 && (
          <span style={{
            fontSize: 9, padding: '1px 7px', borderRadius: 99,
            background: ui.amberDeep + '22', color: ui.amber, border: `1px solid ${ui.amberDeep}44`,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {changedNames.length} changed
          </span>
        )}

        {/* Timeline toggle */}
        <button
          onClick={() => setShowTimelines(t => !t)}
          title="Toggle variable timelines"
          style={{
            background: showTimelines ? ui.border : 'transparent',
            border: `1px solid ${showTimelines ? ui.accentSolid : ui.border}`,
            borderRadius: 4, padding: '2px 6px', cursor: 'pointer',
            color: showTimelines ? ui.accentBright : ui.textFaint,
            fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          ∿ timeline
        </button>

        {/* Grouped / Flat toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, background: ui.panelBg,
          borderRadius: 4, padding: 2, border: `1px solid ${ui.border}` }}>
          {(['grouped', 'flat'] as const).map(mode => (
            <button key={mode} onClick={() => setFlat(mode === 'flat')} style={{
              padding: '2px 7px', borderRadius: 3, border: 'none', cursor: 'pointer',
              fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
              background: (flat ? mode === 'flat' : mode === 'grouped') ? ui.border : 'transparent',
              color:      (flat ? mode === 'flat' : mode === 'grouped') ? ui.accentBright  : ui.textFaint,
            }}>{mode}</button>
          ))}
        </div>
      </div>

      {/* ── Variable list ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {frames.length === 0 ? (
          <div style={{ padding: '12px 12px', fontSize: 12, color: ui.textFaint,
            fontFamily: 'JetBrains Mono, monospace' }}>
            Global scope — no function frames active.
          </div>
        ) : flat ? (
          flatVars.length === 0 ? (
            <div style={{ padding: '12px 12px', fontSize: 12, color: ui.textFaint,
              fontFamily: 'JetBrains Mono, monospace' }}>
              No local variables yet.
            </div>
          ) : (
            flatVars.map(({ name, value, diff, fname }) => (
              <VarRow key={name} name={name} value={value} diff={diff}
                heap={heapSnapshot} indent={12}
                timeline={timelines.get(`${fname}:${name}`)}
                step={step} onSeek={onSeek} totalSteps={totalSteps}
                showTimeline={showTimelines}
                mutatedByObject={mutatedByObject}
              />
            ))
          )
        ) : (
          frames.map((frame, fi) => {
            const fname    = frame.name ?? '__global__'
            const isGlobal = frame.name === '__global__'
            // Filter global frame: hide function-value bindings (they clutter the view)
            const rawLocals = Object.entries(frame.locals ?? {})
            const locals = isGlobal
              ? rawLocals.filter(([, v]) =>
                  typeof v !== 'string' || !v.startsWith('[Function'))
              : rawLocals
            const isActive = fi === 0 && !isGlobal

            if (isGlobal) {
              return (
                <div key={fi} style={{ marginTop: 8, borderTop: `1px solid ${ui.panelBg}` }}>
                  <FrameHeader
                    frame={frame} isActive={false} isGlobal
                    collapsed={!globalExpanded}
                    onToggle={() => setGlobalExpanded(e => !e)}
                    ui={ui}
                  />
                  {globalExpanded && (
                    locals.length === 0
                      ? <div style={{ padding: '3px 12px 3px 32px', fontSize: 11,
                          color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace',
                          fontStyle: 'italic' }}>no globals</div>
                      : locals.map(([name, value]) => (
                          <VarRow key={name} name={name} value={value}
                            diff={diffs[fi]?.[name]} heap={heapSnapshot} indent={28}
                            timeline={timelines.get(`${fname}:${name}`)}
                            step={step} onSeek={onSeek} totalSteps={totalSteps}
                            showTimeline={showTimelines}
                            mutatedByObject={mutatedByObject}
                          />
                        ))
                  )}
                </div>
              )
            }

            return (
              <div key={fi}>
                <FrameHeader frame={frame} isActive={isActive} isGlobal={false} ui={ui} />
                {locals.length === 0 ? (
                  <div style={{ padding: '3px 12px 3px 24px', fontSize: 11,
                    color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace',
                    fontStyle: 'italic' }}>
                    no locals
                  </div>
                ) : (
                  locals.map(([name, value]) => (
                    <VarRow key={name} name={name} value={value}
                      diff={diffs[fi]?.[name]} heap={heapSnapshot} indent={22}
                      timeline={timelines.get(`${fname}:${name}`)}
                      step={step} onSeek={onSeek} totalSteps={totalSteps}
                      showTimeline={showTimelines}
                      mutatedByObject={mutatedByObject}
                    />
                  ))
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ── Footer: env model link ── */}
      {onShowEnvModel && (
        <button onClick={onShowEnvModel} style={{
          background: 'none', border: 'none', borderTop: `1px solid ${ui.border}`,
          cursor: 'pointer', padding: '6px 10px', textAlign: 'left',
          color: ui.borderStrong, fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
          flexShrink: 0,
        }}>
          → Show environment model (scope chain)
        </button>
      )}
    </div>
  )
}
