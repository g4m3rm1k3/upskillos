// The dock under the editor: the program's tables and, for pygame, its screen, at the
// current step. Its height is fixed (drag the bottom edge to change it), so it stays put
// while the explanations beside it grow and shrink. Tables: tableModel.ts.
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Monitor, Table2 } from 'lucide-react'
import { useCodeLensTheme } from './ThemeContext'
import { buildTables, type Cell, type Table } from './tableModel'
import ScreenPanel from './ScreenPanel'
import type { HeapSnapshot, Lang, ScreenFrame, TraceEvent } from './types'

function show(value: unknown, lang: Lang): string {
  if (value === undefined) return ''
  if (value === null) return lang === 'py' ? 'None' : 'null'
  if (value === true || value === false) return lang === 'py' ? (value ? 'True' : 'False') : String(value)
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)))
  if (typeof value === 'string') {
    if (/^-?inf$|^nan$/.test(value)) return value   // Python's float('inf'), sent as text
    return /^\[(Function|Class|Module):/.test(value) ? value : `'${value.length > 24 ? value.slice(0, 23) + '…' : value}'`
  }
  if (typeof value === 'object') {
    const ref = value as { $ref?: number; preview?: string; objectId?: number }
    if (ref.preview) return ref.preview
    if (ref.$ref != null || ref.objectId != null) return `#${ref.$ref ?? ref.objectId}`
  }
  return String(value)
}

function TableView({ table, lang }: { table: Table; lang: Lang }) {
  const { theme: { ui } } = useCodeLensTheme()
  const cellStyle = (cell: Cell | { changed: boolean }) => ({
    padding: '3px 8px', borderBottom: `1px solid ${ui.border}`, whiteSpace: 'nowrap' as const, textAlign: 'right' as const,
    fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5,
    background: cell.changed ? ui.amberDeep + '55' : 'transparent',
    color: cell.changed ? ui.amberSoft : ui.text,
    transition: 'background 0.3s',
  })
  const head = { ...cellStyle({ changed: false }), color: ui.textMuted, fontWeight: 600, position: 'sticky' as const, top: 0, background: ui.headerBg }
  return (
    <div>
      <div style={{ fontSize: 11, color: ui.textMuted, margin: '0 0 6px' }}>
        <code style={{ color: ui.text }}>{table.name}</code>: a {table.type} (#{table.objectId}), {table.shape}
        {table.columnSource && <> · column names from <code style={{ color: ui.text }}>{table.columnSource}</code></>}
        {table.kind === 'grid' && ' · each row is one item, each column one position inside it'}
      </div>
      <table style={{ borderCollapse: 'collapse' }}>
        {table.kind !== 'pairs' && table.columns.length > 0 && (
          <thead>
            <tr>
              <th style={{ ...head, textAlign: 'left' }}>{table.kind === 'grid' ? 'row' : ''}</th>
              {table.columns.map(col => <th key={col} style={head}>{col}</th>)}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows.map(row => (
            <tr key={row.key}>
              <th style={{ ...head, position: 'static', textAlign: 'left', background: row.changed ? ui.amberDeep + '33' : 'transparent' }}>
                {table.kind === 'row' ? 'value' : row.key}
              </th>
              {row.cells.map((cell, i) => <td key={i} style={cellStyle(cell)} title={JSON.stringify(cell.value)}>{show(cell.value, lang)}</td>)}
            </tr>
          ))}
          {table.rows.length === 0 && <tr><td style={{ ...cellStyle({ changed: false }), color: ui.textFaint }}>empty</td></tr>}
        </tbody>
      </table>
      {table.more && <div style={{ fontSize: 11, color: ui.textFaint, marginTop: 4 }}>…and {table.more} not recorded (CodeLens keeps the first few dozen items of each object).</div>}
    </div>
  )
}

interface DataDockProps {
  lang: Lang
  snapshot: HeapSnapshot | null
  event: TraceEvent | null
  frames?: ScreenFrame[]
}

const HEIGHT_KEY = 'codelens.dataDock.height'

export default function DataDock({ lang, snapshot, event, frames }: DataDockProps) {
  const { theme: { ui } } = useCodeLensTheme()
  const tables = useMemo(() => buildTables(snapshot, event), [snapshot, event])
  const hasScreen = (frames?.length ?? 0) > 0
  const tabs = [...(hasScreen ? [{ id: 'screen', label: 'Screen', detail: '' }] : []), ...tables.map(t => ({ id: `t:${t.name}`, label: t.name, detail: t.shape }))]
  const [chosen, setChosen] = useState<string | null>(null)
  const [open, setOpen] = useState(true)
  // Keep the learner's choice while stepping; fall back to the first tab only when it vanishes.
  const active = tabs.some(t => t.id === chosen) ? chosen! : tabs[0]?.id
  const [height, setHeight] = useState(() => {
    try { return Number(localStorage.getItem(HEIGHT_KEY)) || 240 } catch { return 240 }
  })
  useEffect(() => { try { localStorage.setItem(HEIGHT_KEY, String(height)) } catch { /* private window */ } }, [height])

  if (!tabs.length) return null
  const table = tables.find(t => `t:${t.name}` === active)

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startHeight = height
    const move = (ev: MouseEvent) => setHeight(Math.max(120, Math.min(700, startHeight + ev.clientY - startY)))
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  return (
    <div style={{ marginTop: 8, background: ui.panelBg, border: `1px solid ${ui.border}`, borderRadius: 10, flexShrink: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: ui.headerBg, borderBottom: open ? `1px solid ${ui.border}` : 'none', overflowX: 'auto' }}>
        <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: ui.text, cursor: 'pointer', padding: 0, flexShrink: 0 }}>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <Table2 size={13} color={ui.accent} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>Data</span>
        </button>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => { setChosen(tab.id); setOpen(true) }} aria-pressed={tab.id === active}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '2px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',
              fontSize: 11, fontFamily: tab.id === 'screen' ? undefined : 'JetBrains Mono, monospace',
              background: tab.id === active ? ui.border : 'transparent', color: tab.id === active ? ui.accent : ui.textMuted,
            }}>
            {tab.id === 'screen' && <Monitor size={11} />}{tab.label}
            {tab.detail && <span style={{ color: ui.textFaint, fontSize: 10 }}>{tab.detail}</span>}
          </button>
        ))}
      </div>
      {open && (
        <>
          <div style={{ height, overflow: 'auto', padding: 8 }}>
            {active === 'screen' && frames ? <ScreenPanel frames={frames} event={event} /> : table ? <TableView table={table} lang={lang} /> : null}
          </div>
          <div onMouseDown={startResize} title="Drag to resize" style={{ height: 6, cursor: 'row-resize', background: ui.border, opacity: 0.6 }} />
        </>
      )}
    </div>
  )
}
