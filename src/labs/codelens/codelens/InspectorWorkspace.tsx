import { Fragment, useRef, useState, type ReactNode } from 'react'
import { useCodeLensTheme } from './ThemeContext'
import { activateInspector, defaultWorkspace, moveInspector, setPaneCount, type InspectorId, type InspectorWorkspace as Workspace } from './inspectorLayoutState'

const DRAG_TYPE = 'application/x-codelens-inspector'
export interface InspectorTab { id: InspectorId; label: string }

export default function InspectorWorkspace({ state, onChange, tabs, render }: {
  state: Workspace
  onChange: (state: Workspace) => void
  tabs: InspectorTab[]
  render: (id: InspectorId) => ReactNode
}) {
  const { theme: { ui } } = useCodeLensTheme()
  const [dragging, setDragging] = useState<InspectorId | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const resize = useRef<{ coordinate: number; sizes: number[]; extent: number } | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  const vertical = state.direction === 'column'
  const trackSizes = state.sizes.flatMap((size, i) => i ? ['8px', `minmax(0, ${size}fr)`] : [`minmax(0, ${size}fr)`]).join(' ')
  const control = { background: ui.panelBg, color: ui.text, border: `1px solid ${ui.border}`, borderRadius: 5, padding: '4px 6px', fontSize: 11 }
  const adjustSize = (index: number, delta: number, original = state.sizes) => {
    const sizes = [...original]
    const combined = sizes[index] + sizes[index + 1]
    sizes[index] = Math.max(combined * 0.15, Math.min(combined * 0.85, original[index] + delta))
    sizes[index + 1] = combined - sizes[index]
    onChange({ ...state, sizes })
  }

  return <div style={{ display: 'flex', flexDirection: 'column', flex: '2 1 0', minWidth: 260, minHeight: 0, gap: 6 }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      <label style={{ color: ui.textMuted, fontSize: 11 }}>Workspace{' '}
        <select aria-label="Number of inspector panes" value={state.panes.length} onChange={e => onChange(setPaneCount(state, Number(e.target.value)))} style={control}>
          {[1, 2, 3].map(n => <option key={n} value={n}>{n} {n === 1 ? 'pane' : 'panes'}</option>)}
        </select>
      </label>
      <select aria-label="Inspector pane arrangement" value={state.direction} onChange={e => onChange({ ...state, direction: e.target.value as Workspace['direction'] })} style={control}>
        <option value="row">Side by side</option><option value="column">Stacked</option>
      </select>
      <button style={control} onClick={() => onChange(defaultWorkspace())}>Reset layout</button>
      <span style={{ color: ui.textFaint, fontSize: 11 }}>Drag tabs between panes, or use Move tab.</span>
    </div>
    <div ref={grid} style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'grid', gridTemplateColumns: vertical ? 'minmax(0, 1fr)' : trackSizes, gridTemplateRows: vertical ? trackSizes : 'minmax(0, 1fr)' }}>
      {state.panes.map((pane, index) => {
        const visible = pane.tabs.flatMap(id => { const tab = tabs.find(t => t.id === id); return tab ? [tab] : [] })
        const active = visible.some(t => t.id === pane.active) ? pane.active : visible[0]?.id
        const activeLabel = tabs.find(t => t.id === active)?.label
        const drop = (e: React.DragEvent, before?: InspectorId) => {
          const id = e.dataTransfer.getData(DRAG_TYPE) as InspectorId
          if (!tabs.some(t => t.id === id)) return
          e.preventDefault(); e.stopPropagation()
          onChange(moveInspector(state, id, index, before))
          setDragging(null); setOver(null)
        }
        return <Fragment key={index}>
          {index > 0 && <div role="separator" tabIndex={0} aria-label={`Resize panes ${index} and ${index + 1}`} aria-orientation={vertical ? 'horizontal' : 'vertical'} aria-valuemin={15} aria-valuemax={85} aria-valuenow={Math.round(100 * state.sizes[index - 1] / (state.sizes[index - 1] + state.sizes[index]))}
            onKeyDown={e => {
              if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                e.preventDefault()
                adjustSize(index - 1, (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -0.1 : 0.1))
              }
            }}
            onPointerDown={e => {
              e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
              const rect = grid.current!.getBoundingClientRect()
              resize.current = { coordinate: vertical ? e.clientY : e.clientX, sizes: [...state.sizes], extent: vertical ? rect.height : rect.width }
            }}
            onPointerMove={e => {
              if (!resize.current) return
              const { coordinate, sizes, extent } = resize.current
              adjustSize(index - 1, ((vertical ? e.clientY : e.clientX) - coordinate) / Math.max(1, extent) * sizes.reduce((a, b) => a + b, 0), sizes)
            }}
            onPointerUp={() => { resize.current = null }} onPointerCancel={() => { resize.current = null }} onLostPointerCapture={() => { resize.current = null }}
            style={{ cursor: vertical ? 'row-resize' : 'col-resize', background: ui.border, margin: 2, borderRadius: 3, touchAction: 'none' }} />}
          <section aria-label={`Inspector pane ${index + 1}`} onDragOver={e => {
            if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(index) }
          }} onDrop={e => drop(e)} style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, border: `1px solid ${dragging && over === index ? ui.accent : ui.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <div role="tablist" aria-label={`Pane ${index + 1} tabs`} style={{ display: 'flex', overflowX: 'auto', flexShrink: 0, padding: 3, gap: 3, background: ui.panelBg }}>
              {visible.map(tab => <button key={tab.id} role="tab" id={`inspector-tab-${tab.id}`} aria-controls={`inspector-pane-${index}`} aria-selected={active === tab.id} tabIndex={active === tab.id ? 0 : -1}
                draggable onDragStart={e => { e.dataTransfer.setData(DRAG_TYPE, tab.id); e.dataTransfer.effectAllowed = 'move'; setDragging(tab.id) }} onDragEnd={() => { setDragging(null); setOver(null) }}
                onDrop={e => drop(e, tab.id)}
                onClick={() => onChange(activateInspector(state, tab.id))}
                onKeyDown={e => {
                  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
                  e.preventDefault()
                  const current = visible.findIndex(t => t.id === tab.id)
                  const next = e.key === 'Home' ? 0 : e.key === 'End' ? visible.length - 1 : (current + (e.key === 'ArrowLeft' ? -1 : 1) + visible.length) % visible.length
                  onChange(activateInspector(state, visible[next].id))
                  const buttons = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                  buttons?.[next]?.focus()
                }}
                title={`Drag ${tab.label} to any pane`}
                style={{ ...control, cursor: 'grab', whiteSpace: 'nowrap', color: active === tab.id ? ui.accent : ui.textMuted, background: active === tab.id ? ui.border : 'transparent' }}>{tab.label}</button>)}
            </div>
            <div style={{ display: 'flex', gap: 5, padding: 4, flexShrink: 0, borderBottom: `1px solid ${ui.border}` }}>
              <select aria-label={`Show tab in pane ${index + 1}`} value="" onChange={e => { if (e.target.value) onChange(moveInspector(state, e.target.value as InspectorId, index)) }} style={{ ...control, minWidth: 0, flex: 1 }}>
                <option value="">Show a tab…</option>{tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
              </select>
              {active && state.panes.length > 1 && <select aria-label={`Move ${activeLabel} to pane`} value="" onChange={e => { if (e.target.value !== '') onChange(moveInspector(state, active, Number(e.target.value))) }} style={{ ...control, minWidth: 0, flex: 1 }}>
                <option value="">Move tab…</option>{state.panes.map((_, target) => target !== index && <option key={target} value={target}>Pane {target + 1}</option>)}
              </select>}
            </div>
            <div role="tabpanel" id={`inspector-pane-${index}`} aria-labelledby={active ? `inspector-tab-${active}` : undefined} style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              {active ? render(active) : <p style={{ padding: 12, color: ui.textMuted }}>Drop a tab here or choose one above.</p>}
            </div>
          </section>
        </Fragment>
      })}
    </div>
  </div>
}
