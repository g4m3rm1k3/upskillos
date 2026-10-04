/**
 * CallTreeView — recursive call tree with pan, zoom, and seek-on-click.
 *
 * Mouse wheel = zoom · drag = pan · click node = seek to that call's first step
 * Amber = current call · Accent = call path · Depth selector caps visible depth
 */
import { useMemo, useState, useRef, useCallback, useEffect, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react'
import type { TraceEvent } from '../types'
import { useCodeLensTheme } from '../ThemeContext'
import type { CodeLensUiPalette } from '../theme'

const CALL = 'function_call'
const RET  = 'function_return'

const NODE_W  = 190
const NODE_H  = 42
const COL_GAP = 10
const ROW_H   = 76

const MIN_SCALE = 0.15
const MAX_SCALE = 2.5

interface TreeNode {
  id: string
  name: string
  args: string[]
  children: TreeNode[]
  returnValue: unknown
  stepStart: number
  stepEnd: number
  _w?: number
}

// ── Tree builder ──────────────────────────────────────────────────────────────

export function buildTree(events: TraceEvent[], step = events.length - 1): TreeNode {
  const root: TreeNode = { id: '__root__', name: '__root__', args: [], children: [],
    returnValue: undefined, stepStart: 0, stepEnd: events.length - 1 }
  const stack: TreeNode[] = [root]

  events.forEach((evt, i) => {
    if (i > step) return
    if (evt.type === CALL) {
      const node: TreeNode = {
        id:          `n${i}`,
        name:        (evt.functionName as string) ?? '?',
        args:        ((evt.args as unknown[]) ?? []).map(fmtArg),
        children:    [],
        returnValue: undefined,
        stepStart:   i,
        stepEnd:     -1,
      }
      stack[stack.length - 1].children.push(node)
      stack.push(node)
    } else if (evt.type === RET) {
      if (stack.length > 1) {
        const node = stack.pop()!
        node.returnValue = evt.returnValue
        node.stepEnd     = i
      }
    }
  })

  return root
}

function fmtArg(a: unknown): string {
  if (a === null)      return 'null'
  if (a === undefined) return '?'
  if (typeof a === 'object' && a !== null && '$ref' in a) return '…'
  const s = JSON.stringify(a)
  return s?.length > 6 ? s.slice(0, 5) + '…' : s
}

function fmtReturn(v: unknown): string | null {
  if (v === undefined) return null
  if (v === null)      return 'null'
  if (typeof v === 'object' && v !== null && '$ref' in v) return '{…}'
  const s = JSON.stringify(v)
  return s?.length > 10 ? s.slice(0, 9) + '…' : s
}

function countAll(node: TreeNode): number {
  return 1 + node.children.reduce((s, c) => s + countAll(c), 0)
}

// ── Layout ────────────────────────────────────────────────────────────────────

interface NodeEntry { node: TreeNode; x: number; y: number; cx: number; depth: number; hiddenKids: boolean; hiddenCount: number }
interface EdgeEntry { d: string; from: string; to: string }
interface TreeLayout { nodeList: NodeEntry[]; edgeList: EdgeEntry[]; svgW: number; svgH: number }

function computeLayout(tree: TreeNode, maxDepth: number): TreeLayout {
  const visRoots = tree.children
  if (visRoots.length === 0) return { nodeList: [], edgeList: [], svgW: 0, svgH: 0 }

  function calcW(node: TreeNode, depth: number) {
    if (depth >= maxDepth || node.children.length === 0) {
      node._w = NODE_W + COL_GAP
    } else {
      node.children.forEach(c => calcW(c, depth + 1))
      node._w = Math.max(NODE_W + COL_GAP, node.children.reduce((s, c) => s + (c._w ?? 0), 0))
    }
  }
  visRoots.forEach(r => calcW(r, 0))

  const totalW = visRoots.reduce((s, r) => s + (r._w ?? 0), 0)
  const nodeList: NodeEntry[] = []
  const edgeList: EdgeEntry[] = []

  function place(node: TreeNode, cx: number, depth: number) {
    const y           = depth * ROW_H
    const x           = cx - NODE_W / 2
    const hiddenKids  = depth === maxDepth && node.children.length > 0
    const hiddenCount = hiddenKids ? node.children.reduce((s, c) => s + countAll(c), 0) : 0

    nodeList.push({ node, x, y, cx, depth, hiddenKids, hiddenCount })

    if (depth < maxDepth && node.children.length > 0) {
      const totalChildW = node.children.reduce((s, c) => s + (c._w ?? 0), 0)
      let childLeft = cx - totalChildW / 2
      for (const child of node.children) {
        const childCx = childLeft + (child._w ?? 0) / 2
        const childY = (depth + 1) * ROW_H
        const midY   = (y + NODE_H + childY) / 2
        edgeList.push({
          d:    `M${cx},${y + NODE_H} C${cx},${midY} ${childCx},${midY} ${childCx},${childY}`,
          from: node.id,
          to:   child.id,
        })
        place(child, childCx, depth + 1)
        childLeft += child._w ?? 0
      }
    }
  }

  let cx = 0
  for (const r of visRoots) {
    place(r, cx + (r._w ?? 0) / 2, 0)
    cx += r._w ?? 0
  }

  const svgH = (Math.max(0, ...nodeList.map(entry => entry.depth)) + 1) * ROW_H + NODE_H + 40
  return { nodeList, edgeList, svgW: totalW, svgH }
}

// ── Pan / Zoom hook ───────────────────────────────────────────────────────────

interface DragState { startX: number; startY: number; origTx: number; origTy: number; moved: boolean }

function usePanZoom(svgW: number, svgH: number) {
  const [tx, setTx]    = useState(10)
  const [ty, setTy]    = useState(10)
  const [scale, setScale] = useState(1)
  const dragRef = useRef<DragState | null>(null)
  const svgRef  = useRef<HTMLDivElement>(null)

  // Center tree horizontally on first render
  useEffect(() => {
    if (!svgRef.current || svgW === 0) return
    const containerW = svgRef.current.clientWidth || 300
    setTx(Math.max(10, (containerW - svgW) / 2))
    setTy(10)
    setScale(1)
  }, [svgW])

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const rect   = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.12 : 0.9
    setScale(s => {
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s * factor))
      // Zoom toward mouse pointer
      setTx(x => mouseX - (mouseX - x) * (next / s))
      setTy(y => mouseY - (mouseY - y) * (next / s))
      return next
    })
  }, [])

  const onMouseDown = useCallback((e: ReactMouseEvent) => {
    if (e.button !== 0) return
    // Don't start pan if clicking a node (handled by node onClick)
    dragRef.current = { startX: e.clientX, startY: e.clientY, origTx: tx, origTy: ty, moved: false }
  }, [tx, ty])

  const onMouseMove = useCallback((e: ReactMouseEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true
    setTx(dragRef.current.origTx + dx)
    setTy(dragRef.current.origTy + dy)
  }, [])

  const onMouseUp = useCallback(() => {
    dragRef.current = null
  }, [])

  const isDragging = useCallback(() => dragRef.current?.moved ?? false, [])

  const resetView = useCallback(() => {
    if (!svgRef.current || svgW === 0) return
    const containerW = svgRef.current.clientWidth || 300
    setTx(Math.max(10, (containerW - svgW) / 2))
    setTy(10)
    setScale(1)
  }, [svgW])

  // Attach wheel listener (non-passive so we can preventDefault)
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  return { svgRef, tx, ty, scale, setScale, onMouseDown, onMouseMove, onMouseUp, isDragging, resetView }
}

// ── Component ─────────────────────────────────────────────────────────────────

const DEPTHS = [3, 4, 5, 6, 99]
const DEPTH_LABELS: Record<number, string> = { 3: '3', 4: '4', 5: '5', 6: '6', 99: '∞' }

interface CallTreeViewProps {
  events: TraceEvent[] | undefined
  step: number
  onSeek?: (step: number) => void
}

export default function CallTreeView({ events, step, onSeek }: CallTreeViewProps) {
  const { theme: { ui } } = useCodeLensTheme()
  const [maxDepth, setMaxDepth] = useState(4)

  const tree = useMemo(() => buildTree(events ?? [], step), [events, step])

  const { nodeList, edgeList, svgW, svgH } = useMemo(
    () => computeLayout(tree, maxDepth),
    [tree, maxDepth],
  )

  const { svgRef, tx, ty, scale, setScale, onMouseDown, onMouseMove, onMouseUp, isDragging, resetView }
    = usePanZoom(svgW, svgH)
  void svgH

  // Active path
  const { activePath, currentId } = useMemo(() => {
    const activePath = new Set<string>()
    let currentId: string | null = null, maxD = -1
    for (const { node, depth } of nodeList) {
      const inside = step >= node.stepStart && (node.stepEnd === -1 || step <= node.stepEnd)
      if (inside) {
        activePath.add(node.id)
        if (depth > maxD) { maxD = depth; currentId = node.id }
      }
    }
    return { activePath, currentId }
  }, [nodeList, step])

  const totalCalls = tree.children.reduce((s, r) => s + countAll(r), 0)

  const handleNodeClick = useCallback((node: TreeNode) => {
    if (isDragging()) return
    onSeek?.(node.stepStart)
  }, [onSeek, isDragging])

  if (!events?.length) {
    return <Empty ui={ui}>Run code to see the call tree.</Empty>
  }
  if (tree.children.length === 0) {
    return <Empty ui={ui}>No function calls yet at this step.</Empty>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        padding: '5px 10px', borderBottom: `1px solid ${ui.border}`,
      }}>
        <span style={{ fontSize: 9, color: ui.borderStrong, letterSpacing: '.08em',
          fontFamily: 'JetBrains Mono, monospace' }}>CALL TREE</span>
        <span style={{ fontSize: 9, color: ui.textFaint, fontFamily: 'JetBrains Mono, monospace' }}>
          {totalCalls} calls
        </span>

        {/* Zoom controls */}
        <div style={{ display: 'flex', gap: 2 }}>
          <ZoomBtn ui={ui} onClick={() => { resetView() }} title="Reset view">⊙</ZoomBtn>
          <ZoomBtn ui={ui} onClick={() => setScale(s => Math.min(MAX_SCALE, s * 1.25))}>+</ZoomBtn>
          <ZoomBtn ui={ui} onClick={() => setScale(s => Math.max(MIN_SCALE, s * 0.8))}>−</ZoomBtn>
        </div>

        <span style={{ fontSize: 9, color: ui.borderStrong, fontFamily: 'JetBrains Mono, monospace',
          marginLeft: 'auto', opacity: 0.6 }}>
          scroll=zoom · drag=pan · click=seek
        </span>

        {/* Depth */}
        <div style={{ display: 'flex', gap: 2, background: ui.panelBg,
          borderRadius: 4, padding: 2, border: `1px solid ${ui.border}` }}>
          {DEPTHS.map(d => (
            <button key={d} onClick={() => setMaxDepth(d)} style={{
              padding: '2px 6px', borderRadius: 3, border: 'none', cursor: 'pointer',
              fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
              background: maxDepth === d ? ui.border : 'transparent',
              color:      maxDepth === d ? ui.accentBright : ui.textFaint,
            }}>{DEPTH_LABELS[d]}</button>
          ))}
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: 10, padding: '4px 10px',
        borderBottom: `1px solid ${ui.panelBg}`, flexShrink: 0 }}>
        <Legend ui={ui} color={ui.amber} label="current call" />
        <Legend ui={ui} color={ui.accentSolid} label="call path" />
        <Legend ui={ui} color={ui.border} label="completed" />
      </div>

      {/* ── Canvas ── */}
      <div
        ref={svgRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ flex: 1, overflow: 'hidden', cursor: 'grab', userSelect: 'none',
          background: ui.bg, position: 'relative' }}
      >
        <svg
          width="100%"
          height="100%"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            {nodeList.map(({ node, x, y }) => (
              <clipPath key={`clip_${node.id}`} id={`clt_clip_${node.id}`}>
                <rect x={x + 4} y={y} width={NODE_W - 8} height={NODE_H} />
              </clipPath>
            ))}
          </defs>

          <g transform={`translate(${tx}, ${ty}) scale(${scale})`}>

            {/* Base edges */}
            {edgeList.map((e, i) => (
              <path key={i} d={e.d} fill="none" stroke={ui.border} strokeWidth={1.5} />
            ))}

            {/* Active path edges */}
            {nodeList.map(({ node, cx, y }) => {
              if (!activePath.has(node.id)) return null
              return node.children.map((child, ci) => {
                if (!activePath.has(child.id)) return null
                const childEntry = nodeList.find(n => n.node.id === child.id)
                if (!childEntry) return null
                const midY = (y + NODE_H + childEntry.y) / 2
                return (
                  <path key={`ap-${node.id}-${ci}`}
                    d={`M${cx},${y + NODE_H} C${cx},${midY} ${childEntry.cx},${midY} ${childEntry.cx},${childEntry.y}`}
                    fill="none" stroke={ui.accentSolid} strokeWidth={2} opacity={0.7}
                  />
                )
              })
            })}

            {/* Nodes */}
            {nodeList.map(({ node, x, y, cx, hiddenKids, hiddenCount }) => {
              const isCurrent = node.id === currentId
              const isInPath  = activePath.has(node.id)
              const retStr    = fmtReturn(node.returnValue)
              const hasReturn = node.stepEnd >= 0 && node.stepEnd <= step
              const argsStr   = node.args.slice(0, 3).join(', ')
              const nameStr   = node.name.length > 22 ? node.name.slice(0, 21) + '…' : node.name
              const callStr   = `${nameStr}(${argsStr})`
              const clipId    = `clt_clip_${node.id}`

              return (
                <g
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  style={{ cursor: 'pointer' }}
                >
                  <title>{node.name}({node.args.join(', ')}){hasReturn ? ` → ${retStr ?? 'undefined'}` : ' — in progress'}</title>
                  <rect
                    x={x} y={y} width={NODE_W} height={NODE_H} rx={6}
                    fill={isCurrent ? ui.accentBg : isInPath ? ui.panelBg : ui.panelBg2}
                    stroke={isCurrent ? ui.amber : isInPath ? ui.accentSolid : ui.border}
                    strokeWidth={isCurrent ? 2 : isInPath ? 1.5 : 1}
                    style={{ filter: isCurrent ? 'drop-shadow(0 0 6px rgba(251,191,36,.4))' : 'none' }}
                  />

                  <text x={cx} y={y + 16} textAnchor="middle"
                    fill={isCurrent ? ui.amber : isInPath ? ui.accentBright : ui.cyan}
                    fontSize={11} fontFamily="JetBrains Mono, monospace" fontWeight={700}
                    clipPath={`url(#${clipId})`}>
                    {callStr}
                  </text>

                  {hasReturn ? (
                    <text x={cx} y={y + 31} textAnchor="middle"
                      fill={isCurrent ? ui.amberSoft : ui.green}
                      fontSize={9} fontFamily="JetBrains Mono, monospace"
                      clipPath={`url(#${clipId})`}>
                      → {retStr ?? 'undefined'}
                    </text>
                  ) : !hasReturn ? (
                    <text x={cx} y={y + 31} textAnchor="middle"
                      fill={ui.borderStrong} fontSize={9} fontFamily="JetBrains Mono, monospace">
                      …
                    </text>
                  ) : null}

                  {hiddenKids && (
                    <text x={cx} y={y + NODE_H + 14} textAnchor="middle"
                      fill={ui.textFaint} fontSize={8} fontFamily="JetBrains Mono, monospace">
                      +{hiddenCount} hidden
                    </text>
                  )}
                </g>
              )
            })}

          </g>
        </svg>
      </div>
    </div>
  )
}

function ZoomBtn({ onClick, children, title, ui }: { onClick: () => void; children: ReactNode; title?: string; ui: CodeLensUiPalette }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 20, height: 20, borderRadius: 3, border: `1px solid ${ui.border}`,
      background: ui.panelBg, color: ui.textFaint, cursor: 'pointer',
      fontSize: 13, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'JetBrains Mono, monospace', padding: 0,
    }}>{children}</button>
  )
}

function Legend({ color, label, ui }: { color: string; label: string; ui: CodeLensUiPalette }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9,
      color: ui.textFaint, fontFamily: 'JetBrains Mono, monospace' }}>
      <span style={{ width: 8, height: 8, borderRadius: 2,
        border: `2px solid ${color}`, display: 'inline-block' }} />
      {label}
    </span>
  )
}

function Empty({ children, ui }: { children: ReactNode; ui: CodeLensUiPalette }) {
  return (
    <div style={{ padding: '16px 12px', color: ui.textFaint, fontSize: 12 }}>
      {children}
    </div>
  )
}
