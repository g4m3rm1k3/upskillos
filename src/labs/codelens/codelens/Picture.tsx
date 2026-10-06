// The Picture tab: the program's data structures drawn as pictures, at the current step, with
// what the line that just ran did to them. Arrays are rows of boxes with the index variables
// (i, j, lo, hi) pointing at their positions and swaps drawn as arcs; grids (dynamic-programming
// tables, Q-tables) are coloured by value with the cell just written and the cells it was
// computed from marked; linked nodes (lists, trees) are boxes and arrows, labelled with the
// variables that point at them. The model, and how it avoids knowing any algorithm:
// pictureModel.ts.
import { useMemo } from 'react'
import { useCodeLensTheme } from './ThemeContext'
import { buildPicture, type ArrayPicture, type GridPicture, type MapPicture, type NodesPicture, type PictureCell, type Pointer } from './pictureModel'
import { objectPreview } from './renderer/valuePreview'
import type { HeapSnapshot, Lang, TraceEvent } from './types'
import type { CodeLensUiPalette } from './theme'

const MONO = 'JetBrains Mono, monospace'

function display(value: unknown, lang: Lang, snapshot: HeapSnapshot | null, max = 14): string {
  if (value === undefined) return ''
  if (value === null) return lang === 'py' ? 'None' : 'null'
  if (value === true || value === false) return lang === 'py' ? (value ? 'True' : 'False') : String(value)
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(3)))
  if (typeof value === 'string') {
    if (/^\[(Function|Class|Module):/.test(value) || /^-?inf$|^nan$/.test(value)) return value
    const text = lang === 'py' ? `'${value}'` : `"${value}"`
    return text.length > max ? text.slice(0, max - 1) + '…' : text
  }
  const ref = value as { $ref?: number; objectId?: number; preview?: string }
  if (ref.preview) return ref.preview.length > max ? ref.preview.slice(0, max - 1) + '…' : ref.preview
  const id = ref.$ref ?? ref.objectId
  if (id != null) return objectPreview(id, snapshot, max, lang) ?? `#${id}`
  return String(value)
}

function pointerColor(name: string, ui: CodeLensUiPalette): string {
  const colors = [ui.cyan, ui.pink, ui.greenBright, ui.purple, ui.amber, ui.accentBright]
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return colors[h % colors.length]
}

function Chip({ name, ui }: { name: string; ui: CodeLensUiPalette }) {
  const color = pointerColor(name, ui)
  return (
    <span style={{
      fontFamily: MONO, fontSize: 10.5, fontWeight: 700, padding: '0 5px', borderRadius: 4, lineHeight: '15px',
      color, border: `1px solid ${color}`, background: ui.panelBg, whiteSpace: 'nowrap',
    }}>{name}</span>
  )
}

function cellColors(cell: PictureCell, ui: CodeLensUiPalette, heat: number | null) {
  const background = cell.written ? ui.amberDeep + 'cc'
    : heat != null ? `color-mix(in srgb, ${ui.accentSolid} ${Math.round(8 + heat * 50)}%, ${ui.panelBg})`
    : ui.panelBg2
  return {
    background,
    color: cell.written ? ui.textBright : ui.text,
    boxShadow: cell.read ? `inset 0 0 0 2px ${ui.cyan}` : undefined,
    border: `1px solid ${cell.written ? ui.amber : ui.border}`,
  }
}

function Header({ title, detail, ui }: { title: string; detail: string; ui: CodeLensUiPalette }) {
  return (
    <div style={{ fontSize: 11, color: ui.textMuted, marginBottom: 6 }}>
      <code style={{ color: ui.textBright, fontSize: 12 }}>{title}</code> <span>{detail}</span>
    </div>
  )
}

// A cell holding a linked object (a node drawn below) shows as a short arrow to it, not its contents.
function cellText(value: unknown, lang: Lang, snapshot: HeapSnapshot | null): string {
  const ref = value as { $ref?: number; objectId?: number } | null
  const id = ref && typeof ref === 'object' ? ref.$ref ?? ref.objectId : undefined
  const type = id != null ? snapshot?.objects.get(id)?.type : undefined
  if (id != null && type && !['list', 'tuple', 'dict', 'set', 'deque', 'Array', 'Object', 'Map', 'Set', 'ndarray'].includes(type)) return `→ #${id}`
  return display(value, lang, snapshot)
}

function ArrayView({ a, lang, snapshot, ui }: { a: ArrayPicture; lang: Lang; snapshot: HeapSnapshot | null; ui: CodeLensUiPalette }) {
  const texts = a.cells.map(c => cellText(c.value, lang, snapshot))
  const width = Math.max(46, Math.min(120, Math.max(...texts.map(t => t.length), 1) * 8.5 + 18))
  const arcRoom = a.swaps.length || a.moves.length ? 30 : 0
  const byIndex = new Map<number, Pointer[]>()
  for (const p of a.pointers) byIndex.set(p.index, [...(byIndex.get(p.index) ?? []), p])
  const total = a.cells.length * width
  const center = (i: number) => i * width + width / 2
  return (
    <div>
      <Header title={a.name} detail={`a ${a.type}, ${a.cells.length} item${a.cells.length === 1 ? '' : 's'}`} ui={ui} />
      <div style={{ position: 'relative', width: Math.max(total, width), paddingTop: arcRoom }}>
        {arcRoom > 0 && (
          <svg width={total} height={arcRoom} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', maxWidth: 'none', height: arcRoom }} aria-hidden>
            <defs>
              <marker id={`swap-${a.objectId}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={ui.amber} />
              </marker>
            </defs>
            {a.swaps.map(([p, q]) => (
              <path key={`s${p}-${q}`} d={`M${center(p)},${arcRoom} C${center(p)},2 ${center(q)},2 ${center(q)},${arcRoom}`}
                fill="none" stroke={ui.amber} strokeWidth={2} markerStart={`url(#swap-${a.objectId})`} markerEnd={`url(#swap-${a.objectId})`} />
            ))}
            {a.moves.map(({ from, to }) => (
              <path key={`m${from}-${to}`} d={`M${center(from)},${arcRoom} C${center(from)},6 ${center(to)},6 ${center(to)},${arcRoom}`}
                fill="none" stroke={ui.amber} strokeWidth={2} strokeDasharray="4 3" markerEnd={`url(#swap-${a.objectId})`} />
            ))}
          </svg>
        )}
        <div style={{ display: 'flex' }}>
          {a.cells.map((cell, i) => (
            <div key={i} title={cell.written ? `was ${display(cell.written.old, lang, snapshot, 40)}` : undefined}
              style={{
                width, height: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                fontFamily: MONO, fontSize: 14, ...cellColors(cell, ui, null), marginRight: -1,
              }}>
              {cell.written && cell.written.old !== undefined && (
                <span style={{ fontSize: 10.5, color: ui.amberSoft, textDecoration: 'line-through', lineHeight: 1, opacity: 0.9 }}>{display(cell.written.old, lang, snapshot)}</span>
              )}
              <span>{texts[i]}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex' }}>
          {a.cells.map((_, i) => (
            <div key={i} style={{ width, textAlign: 'center', fontSize: 10, color: ui.textFaint, fontFamily: MONO, marginRight: -1 }}>{i}</div>
          ))}
        </div>
        <div style={{ display: 'flex', minHeight: byIndex.size ? 18 : 0 }}>
          {Array.from({ length: a.cells.length + 1 }, (_, i) => (
            <div key={i} style={{ width, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginRight: -1 }}>
              {(byIndex.get(i) ?? []).map(p => <span key={p.name}><span style={{ color: pointerColor(p.name, ui), fontSize: 10 }}>▲</span><Chip name={p.name} ui={ui} /></span>)}
            </div>
          ))}
        </div>
      </div>
      {a.more && <div style={{ fontSize: 11, color: ui.textFaint, marginTop: 4 }}>…and {a.more} not shown.</div>}
    </div>
  )
}

function GridView({ g, lang, snapshot, ui }: { g: GridPicture; lang: Lang; snapshot: HeapSnapshot | null; ui: CodeLensUiPalette }) {
  const range = g.numeric && g.numeric.max > g.numeric.min ? g.numeric : null
  const heat = (v: unknown) => (range && typeof v === 'number' ? (v - range.min) / (range.max - range.min) : null)
  const colPointers = (c: number) => g.columnPointers.filter(p => p.index === c)
  const rowPointers = (r: number) => g.rowPointers.filter(p => p.index === r)
  const cellStyle = { padding: '4px 7px', fontFamily: MONO, fontSize: 12, textAlign: 'right' as const, minWidth: 34, whiteSpace: 'nowrap' as const }
  return (
    <div>
      <Header title={g.name} detail={`a ${g.type}, ${g.rowKeys.length} × ${g.columns.length}${range ? ` · colour shows the value, from ${display(range.min, lang, snapshot)} to ${display(range.max, lang, snapshot)}` : ''}`} ui={ui} />
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          {g.columnPointers.length > 0 && (
            <tr>
              <th />
              {g.columns.map((_, c) => (
                <th key={c} style={{ padding: '0 2px', verticalAlign: 'bottom' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    {colPointers(c).map(p => <span key={p.name}><Chip name={p.name} ui={ui} /><div style={{ color: pointerColor(p.name, ui), fontSize: 9, lineHeight: 1 }}>▼</div></span>)}
                  </div>
                </th>
              ))}
            </tr>
          )}
          <tr>
            <th style={{ ...cellStyle, color: ui.textFaint, fontWeight: 500, textAlign: 'left' }}>{g.indexing === 'tuple' ? 'row, col' : 'row \\ col'}</th>
            {g.columns.map((c, i) => (
              <th key={c} style={{ ...cellStyle, color: ui.textFaint, fontWeight: 500, textAlign: 'center' }}>
                {g.columnLabels ? <>{g.columnLabels[i]}<div style={{ fontSize: 9 }}>{c}</div></> : c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {g.cells.map((row, r) => (
            <tr key={g.rowKeys[r]}>
              <th style={{ ...cellStyle, textAlign: 'left', color: g.rowsRead.includes(r) ? ui.cyan : ui.textFaint, fontWeight: 500 }}>
                <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
                  {rowPointers(r).map(p => <span key={p.name}><Chip name={p.name} ui={ui} /><span style={{ color: pointerColor(p.name, ui), fontSize: 9 }}>▶</span></span>)}
                  {g.rowKeys[r]}
                </span>
              </th>
              {row.map((cell, c) => (
                <td key={c} title={cell.written ? `was ${display(cell.written.old, lang, snapshot, 40)}` : undefined}
                  style={{ ...cellStyle, ...cellColors(cell, ui, heat(cell.value)), outline: g.rowsRead.includes(r) ? `1px dashed ${ui.cyan}` : undefined }}>
                  {display(cell.value, lang, snapshot)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {g.more && <div style={{ fontSize: 11, color: ui.textFaint, marginTop: 4 }}>…and {g.more} rows not shown.</div>}
    </div>
  )
}

function MapView({ m, lang, snapshot, ui }: { m: MapPicture; lang: Lang; snapshot: HeapSnapshot | null; ui: CodeLensUiPalette }) {
  const cellStyle = { padding: '3px 9px', fontFamily: MONO, fontSize: 12, whiteSpace: 'nowrap' as const }
  return (
    <div>
      <Header title={m.name} detail={`a ${m.type}, ${m.entries.length} ${m.entries.length === 1 ? 'entry' : 'entries'}`} ui={ui} />
      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {m.entries.map(({ key, cell }) => (
            <tr key={key}>
              <th style={{ ...cellStyle, textAlign: 'left', color: cell.read ? ui.cyan : ui.textMuted, fontWeight: 500, border: `1px solid ${ui.border}` }}>{key}</th>
              <td title={cell.written ? `was ${display(cell.written.old, lang, snapshot, 40)}` : undefined} style={{ ...cellStyle, ...cellColors(cell, ui, null) }}>
                {display(cell.value, lang, snapshot, 30)}
                {cell.written && cell.written.old !== undefined && <span style={{ marginLeft: 6, fontSize: 10, color: ui.amberSoft, textDecoration: 'line-through' }}>{display(cell.written.old, lang, snapshot)}</span>}
              </td>
            </tr>
          ))}
          {m.entries.length === 0 && <tr><td style={{ ...cellStyle, color: ui.textFaint }}>empty</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

const BOX_W = 116
const LINE_H = 16

function layoutNodes(n: NodesPicture): Map<number, { x: number; y: number }> {
  const at = new Map<number, { x: number; y: number }>()
  const children = new Map<number, number[]>()
  for (const e of n.edges) children.set(e.from, [...(children.get(e.from) ?? []), e.to])
  if (n.shape === 'chain') {
    let x = 0
    const placed = new Set<number>()
    for (const root of n.roots) {
      let id: number | undefined = root
      while (id != null && !placed.has(id)) {
        placed.add(id)
        at.set(id, { x: x++, y: 0 })
        id = children.get(id)?.[0]
      }
    }
    for (const node of n.nodes) if (!placed.has(node.id)) at.set(node.id, { x: x++, y: 0 })
    return at
  }
  if (n.shape === 'tree') {
    // A binary tree keeps left on the left and right on the right, even when one is missing:
    // the missing side still takes a slot, so a lone right child sits to the right.
    const sides = new Map<number, { left?: number; right?: number }>()
    for (const e of n.edges) {
      if (e.label === 'left' || e.label === 'right') sides.set(e.from, { ...sides.get(e.from), [e.label]: e.to })
    }
    const binary = n.nulls.some(x => x.label === 'left' || x.label === 'right') || sides.size > 0
    let slot = 0
    const place = (id: number | null, depth: number): number => {
      if (id == null) return slot++   // the empty side of a binary node
      at.set(id, { x: 0, y: depth })
      const side = sides.get(id)
      const kids: (number | null)[] = binary && (side?.left != null || side?.right != null)
        ? [side?.left ?? null, side?.right ?? null]
        : (children.get(id) ?? []).filter(k => !at.has(k))
      if (!kids.length) { at.set(id, { x: slot++, y: depth }); return at.get(id)!.x }
      const xs = kids.map(k => (k != null && at.has(k) ? at.get(k)!.x : place(k, depth + 1)))
      const x = (Math.min(...xs) + Math.max(...xs)) / 2
      at.set(id, { x, y: depth })
      return x
    }
    for (const root of n.roots) if (!at.has(root)) place(root, 0)
    for (const node of n.nodes) if (!at.has(node.id)) at.set(node.id, { x: slot++, y: 0 })
    const least = Math.min(...[...at.values()].map(p => p.x))
    for (const p of at.values()) p.x -= least
    return at
  }
  // A general graph: layers by distance from the roots.
  const depth = new Map<number, number>()
  const queue = n.roots.map(r => { depth.set(r, 0); return r })
  while (queue.length) {
    const id = queue.shift()!
    for (const k of children.get(id) ?? []) if (!depth.has(k)) { depth.set(k, depth.get(id)! + 1); queue.push(k) }
  }
  for (const node of n.nodes) if (!depth.has(node.id)) depth.set(node.id, 0)
  const perLayer = new Map<number, number>()
  for (const node of n.nodes) {
    const d = depth.get(node.id)!
    const x = perLayer.get(d) ?? 0
    perLayer.set(d, x + 1)
    at.set(node.id, { x, y: d })
  }
  return at
}

function NodesView({ n, lang, snapshot, ui }: { n: NodesPicture; lang: Lang; snapshot: HeapSnapshot | null; ui: CodeLensUiPalette }) {
  const at = layoutNodes(n)
  const nullsOf = (id: number) => n.nulls.filter(x => x.id === id)
  const height = (id: number) => 26 + LINE_H * (n.nodes.find(x => x.id === id)!.fields.length + nullsOf(id).length)
  const boxH = Math.max(...n.nodes.map(x => height(x.id)), 40)
  const gapX = n.shape === 'chain' ? 54 : 26
  const gapY = 64
  const top = 22
  const px = (id: number) => at.get(id)!.x * (BOX_W + gapX) + 4
  const py = (id: number) => top + at.get(id)!.y * (boxH + gapY)
  const width = Math.max(...n.nodes.map(x => px(x.id))) + BOX_W + 10
  // A link back along a row (a cycle) is drawn as a curve under the boxes: leave room for it.
  const backLinks = n.edges.some(e => at.get(e.from)!.y === at.get(e.to)!.y && at.get(e.to)!.x < at.get(e.from)!.x)
  const svgHeight = Math.max(...n.nodes.map(x => py(x.id))) + boxH + 10 + (backLinks ? boxH * 0.8 : 0)
  const none = lang === 'py' ? 'None' : 'null'
  return (
    <div>
      <Header title={n.name} detail={`${n.nodes.length} linked object${n.nodes.length === 1 ? '' : 's'} (${n.shape === 'chain' ? 'a chain' : n.shape === 'tree' ? 'a tree' : 'a graph'})`} ui={ui} />
      {/* maxWidth none: the app's stylesheet narrows wide SVGs to the pane, which would cut the
          drawing off; this one keeps its size and the box around it scrolls sideways instead. */}
      <svg width={width} height={svgHeight} style={{ overflow: 'visible', maxWidth: 'none', height: svgHeight }} role="img" aria-label={`${n.name}: linked objects`}>
        <defs>
          <marker id="node-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={ui.textMuted} /></marker>
          <marker id="node-arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={ui.amber} /></marker>
        </defs>
        {n.edges.map((e, i) => {
          const sameRow = at.get(e.from)!.y === at.get(e.to)!.y
          const forward = px(e.to) > px(e.from)
          const x1 = sameRow ? px(e.from) + (forward ? BOX_W : 0) : px(e.from) + BOX_W / 2
          const y1 = sameRow ? py(e.from) + boxH / 2 : py(e.from) + boxH
          const x2 = sameRow ? px(e.to) + (forward ? 0 : BOX_W) : px(e.to) + BOX_W / 2
          const y2 = sameRow ? py(e.to) + boxH / 2 : py(e.to)
          const bend = sameRow && !forward ? `M${x1},${y1} C${x1},${y1 + boxH} ${x2},${y2 + boxH} ${x2},${y2}` : `M${x1},${y1} L${x2},${y2}`
          const color = e.written ? ui.amber : ui.textMuted
          return (
            <g key={i}>
              <path d={bend} fill="none" stroke={color} strokeWidth={e.written ? 2.5 : 1.4} markerEnd={`url(#${e.written ? 'node-arrow-hot' : 'node-arrow'})`} />
              <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} textAnchor="middle" style={{ fontSize: 10, fill: color, fontFamily: MONO }}>{e.label}</text>
            </g>
          )
        })}
        {n.nodes.map(node => {
          const x = px(node.id), y = py(node.id)
          const hot = node.created || node.fields.some(f => f.written) || nullsOf(node.id).some(f => f.written)
          return (
            <g key={node.id}>
              <rect x={x} y={y} width={BOX_W} height={boxH} rx={6} fill={ui.panelBg2} stroke={hot ? ui.amber : ui.borderStrong} strokeWidth={hot ? 2 : 1} />
              <text x={x + 8} y={y + 15} style={{ fontSize: 10, fill: ui.textFaint, fontFamily: MONO }}>{node.type} #{node.id}</text>
              {node.fields.map((f, i) => (
                <text key={f.name} x={x + 8} y={y + 32 + i * LINE_H} style={{ fontSize: 12, fill: f.written ? ui.amberSoft : ui.text, fontFamily: MONO }}>
                  {f.name}: {display(f.value, lang, snapshot, 9)}
                </text>
              ))}
              {nullsOf(node.id).map((f, i) => (
                <text key={f.label} x={x + 8} y={y + 32 + (node.fields.length + i) * LINE_H} style={{ fontSize: 12, fill: f.written ? ui.amberSoft : ui.textFaint, fontFamily: MONO }}>
                  {f.label}: {none}
                </text>
              ))}
              {node.tags.map((tag, i) => {
                const color = pointerColor(tag, ui)
                const w = tag.length * 7 + 10
                const tx = x + 4 + node.tags.slice(0, i).reduce((s, t) => s + t.length * 7 + 14, 0)
                return (
                  <g key={tag}>
                    <rect x={tx} y={y - 19} width={w} height={15} rx={4} fill={ui.panelBg} stroke={color} />
                    <text x={tx + w / 2} y={y - 8} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 700, fill: color, fontFamily: MONO }}>{tag}</text>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function Picture({ events, step, snapshot, source, lang }: {
  events: TraceEvent[]; step: number; snapshot: HeapSnapshot | null; source: string; lang: Lang
}) {
  const { theme: { ui } } = useCodeLensTheme()
  const picture = useMemo(() => buildPicture(snapshot, events, step, source, lang), [snapshot, events, step, source, lang])
  if (!events.length) return <div style={{ padding: 12, fontSize: 12, color: ui.textFaint }}>Run code first.</div>
  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 12, color: ui.text, background: ui.panelBg2, border: `1px solid ${ui.border}`, borderRadius: 8, padding: '8px 10px', flexShrink: 0 }}>
        <div style={{ fontWeight: 600, marginBottom: picture.notes.length ? 4 : 0 }}>
          {picture.line != null ? <>Line {picture.line} just ran{picture.notes.length ? ':' : '. Nothing in these structures changed.'}</> : 'Before the first line runs.'}
        </div>
        {picture.notes.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18, fontFamily: MONO, fontSize: 11.5, color: ui.amberSoft }}>
            {picture.notes.slice(0, 6).map((note, i) => <li key={i}>{note}</li>)}
            {picture.notes.length > 6 && <li style={{ color: ui.textFaint }}>…and {picture.notes.length - 6} more changes.</li>}
          </ul>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 10.5, color: ui.textFaint, flexWrap: 'wrap' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: ui.amberDeep, border: `1px solid ${ui.amber}`, verticalAlign: -1 }} /> written by that line</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, boxShadow: `inset 0 0 0 2px ${ui.cyan}`, verticalAlign: -1 }} /> read by that line</span>
          <span><Chip name="i" ui={ui} /> a variable used as an index (from the code)</span>
        </div>
      </div>
      {picture.structures.length === 0 && (
        <div style={{ fontSize: 12, color: ui.textFaint }}>No lists, tables, dictionaries or linked objects yet. They appear here as soon as the program makes one.</div>
      )}
      {picture.structures.map(s => (
        // flexShrink 0: a scrolling box in a flex column would otherwise be squeezed to fit the pane.
        <div key={s.kind === 'nodes' ? `nodes-${s.name}` : `${s.kind}-${s.objectId}`} style={{ overflowX: 'auto', paddingBottom: 4, flexShrink: 0 }}>
          {s.kind === 'array' && <ArrayView a={s} lang={lang} snapshot={snapshot} ui={ui} />}
          {s.kind === 'grid' && <GridView g={s} lang={lang} snapshot={snapshot} ui={ui} />}
          {s.kind === 'map' && <MapView m={s} lang={lang} snapshot={snapshot} ui={ui} />}
          {s.kind === 'nodes' && <NodesView n={s} lang={lang} snapshot={snapshot} ui={ui} />}
        </div>
      ))}
    </div>
  )
}
