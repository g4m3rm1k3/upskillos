// The grid. Only the cells in view are drawn (virtualised), so a sheet can be
// as large as the workbook allows. Headers sit outside the scrolling area and
// follow it, the way Excel's frozen headers do.
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cellKey, indexToCol, parseRange } from '../engine/address.js'
import { foldedSpan } from '../engine/folds.js'
import { displayCell, FORMAT_COLORS, textOn } from './display.js'
import { MAX_GRID_COLS, MAX_GRID_ROWS, selectionRange } from './selection.js'
import ChartView from './ChartView.jsx'

export const DEFAULT_COL_W = 96
export const DEFAULT_ROW_H = 24
export const HEAD_W = 46
export const HEAD_H = 24
const OVERSCAN = 3
const CODE_BADGE = { py: 'PY', js: 'JS', matlab: 'M' }

// starts[i] is where row/column i begins; starts[count] is the total size.
function prefixSums(count, sizes, fallback) {
  const starts = new Float64Array(count + 1)
  for (let i = 0; i < count; i++) starts[i + 1] = starts[i] + (sizes[i] ?? fallback)
  return starts
}

// The row/column at a pixel position (binary search over the starts).
function indexAt(starts, pos) {
  let lo = 0, hi = starts.length - 2
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (starts[mid] <= pos) lo = mid
    else hi = mid - 1
  }
  return Math.max(0, lo)
}

export default function Grid({
  wb, sheet, version, sel, onSelect, editing, renderEditor, pointMode, onPoint,
  refHighlights = [], traces = null, conditional = null, hiddenRows = null, filter = null, onFilterButton, folds = [], onFoldToggle, charts = [], chartValues, selectedChart = null, onSelectChart, onChangeChart, onDeleteChart, onStartEdit, onFill, onContextMenu, onKeyDown, gridRef,
}) {
  const scrollerRef = useRef(null)
  const [scroll, setScroll] = useState({ top: 0, left: 0 })
  const [viewport, setViewport] = useState({ w: 800, h: 500 })
  const [liveSize, setLiveSize] = useState(null) // { axis, index, size } while dragging a header edge
  const [fillTarget, setFillTarget] = useState(null)
  const [chartDrag, setChartDrag] = useState(null) // { id, x, y, w, h } while moving or resizing

  // How much of the sheet the scroll area covers: what is used plus room to
  // grow, extended as the learner scrolls towards the edge.
  const bounds = useMemo(() => sheet.bounds(), [sheet, version])
  const rowCount = Math.min(MAX_GRID_ROWS, Math.max(200, bounds.rows + 100, Math.ceil((scroll.top + viewport.h * 2) / DEFAULT_ROW_H)))
  const colCount = Math.min(MAX_GRID_COLS, Math.max(30, bounds.cols + 10, Math.ceil((scroll.left + viewport.w * 2) / DEFAULT_COL_W)))

  const colSizes = liveSize?.axis === 'col' ? { ...sheet.colWidths, [liveSize.index]: liveSize.size } : sheet.colWidths
  let rowSizes = liveSize?.axis === 'row' ? { ...sheet.rowHeights, [liveSize.index]: liveSize.size } : sheet.rowHeights
  // Rows hidden by a filter take no space.
  if (hiddenRows?.size) { rowSizes = { ...rowSizes }; for (const r of hiddenRows) rowSizes[r] = 0 }
  const cols = useMemo(() => prefixSums(colCount, colSizes, DEFAULT_COL_W), [colCount, colSizes, version])
  const rows = useMemo(() => prefixSums(rowCount, rowSizes, DEFAULT_ROW_H), [rowCount, rowSizes, version, hiddenRows])

  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return undefined
    const measure = () => setViewport({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Keep the active cell in view when the keyboard moves it.
  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const { row, col } = sel.focus
    if (row >= rowCount || col >= colCount) return
    const top = rows[row], bottom = rows[row + 1], left = cols[col], right = cols[col + 1]
    if (top < el.scrollTop) el.scrollTop = top
    else if (bottom > el.scrollTop + el.clientHeight) el.scrollTop = bottom - el.clientHeight
    if (left < el.scrollLeft) el.scrollLeft = left
    else if (right > el.scrollLeft + el.clientWidth) el.scrollLeft = right - el.clientWidth
  }, [sel.focus.row, sel.focus.col]) // eslint-disable-line react-hooks/exhaustive-deps

  // Bring a chart into view when it is selected (a new chart may be placed
  // beyond the visible part of the sheet).
  useLayoutEffect(() => {
    const el = scrollerRef.current
    const chart = charts.find((c) => c.id === selectedChart)
    if (!el || !chart) return
    if (chart.x + chart.w > el.scrollLeft + el.clientWidth) el.scrollLeft = Math.max(0, chart.x + chart.w - el.clientWidth + 16)
    if (chart.x < el.scrollLeft) el.scrollLeft = Math.max(0, chart.x - 16)
    if (chart.y + chart.h > el.scrollTop + el.clientHeight) el.scrollTop = Math.max(0, chart.y + chart.h - el.clientHeight + 16)
    if (chart.y < el.scrollTop) el.scrollTop = Math.max(0, chart.y - 16)
  }, [selectedChart]) // eslint-disable-line react-hooks/exhaustive-deps

  const frame = useRef(0)
  const handleScroll = (e) => {
    const { scrollTop, scrollLeft } = e.currentTarget
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => setScroll({ top: scrollTop, left: scrollLeft }))
  }

  const r0 = Math.max(0, indexAt(rows, scroll.top) - OVERSCAN)
  const r1 = Math.min(rowCount - 1, indexAt(rows, scroll.top + viewport.h) + OVERSCAN)
  const c0 = Math.max(0, indexAt(cols, scroll.left) - OVERSCAN)
  const c1 = Math.min(colCount - 1, indexAt(cols, scroll.left + viewport.w) + OVERSCAN)

  const cellAt = (clientX, clientY) => {
    const rect = scrollerRef.current.getBoundingClientRect()
    const x = clientX - rect.left + scrollerRef.current.scrollLeft
    const y = clientY - rect.top + scrollerRef.current.scrollTop
    return { row: indexAt(rows, y), col: indexAt(cols, x) }
  }

  // Dragging past the edge scrolls the sheet.
  const edgeScroll = (clientX, clientY) => {
    const el = scrollerRef.current
    const rect = el.getBoundingClientRect()
    if (clientY > rect.bottom - 12) el.scrollTop += 24
    else if (clientY < rect.top + 12) el.scrollTop -= 24
    if (clientX > rect.right - 12) el.scrollLeft += 48
    else if (clientX < rect.left + 12) el.scrollLeft -= 48
  }

  const drag = (onMove, onUp) => (down) => {
    const target = down.currentTarget
    target.setPointerCapture?.(down.pointerId)
    const move = (e) => { edgeScroll(e.clientX, e.clientY); onMove(e) }
    const up = (e) => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
      onUp?.(e)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
  }

  const handleCellsDown = (e) => {
    if (e.button !== 0) return
    const start = cellAt(e.clientX, e.clientY)
    if (pointMode) {
      // Pointing at cells while writing a formula: the formula keeps the focus.
      e.preventDefault()
      onPoint({ r1: start.row, c1: start.col, r2: start.row, c2: start.col })
      drag((m) => {
        const p = cellAt(m.clientX, m.clientY)
        onPoint({ r1: Math.min(start.row, p.row), c1: Math.min(start.col, p.col), r2: Math.max(start.row, p.row), c2: Math.max(start.col, p.col) })
      })(e)
      return
    }
    gridRef?.current?.focus({ preventScroll: true })
    const anchor = e.shiftKey ? sel.anchor : start
    onSelect({ active: e.shiftKey ? sel.active : start, anchor, focus: start })
    drag((m) => onSelect({ active: e.shiftKey ? sel.active : start, anchor, focus: cellAt(m.clientX, m.clientY) }))(e)
  }

  const range = selectionRange(sel)

  const handleFillDown = (e) => {
    e.stopPropagation()
    e.preventDefault()
    let target = null
    drag((m) => {
      const p = cellAt(m.clientX, m.clientY)
      // Extend along whichever direction the pointer has moved further.
      const down = p.row > range.r2 ? p.row - range.r2 : p.row < range.r1 ? p.row - range.r1 : 0
      const right = p.col > range.c2 ? p.col - range.c2 : p.col < range.c1 ? p.col - range.c1 : 0
      if (!down && !right) target = null
      else if (Math.abs(down) >= Math.abs(right)) target = down > 0 ? { ...range, r2: p.row } : { ...range, r1: p.row }
      else target = right > 0 ? { ...range, c2: p.col } : { ...range, c1: p.col }
      setFillTarget(target)
    }, () => {
      setFillTarget(null)
      if (target) onFill(range, target)
    })(e)
  }

  const headerDown = (axis, index) => (e) => {
    if (e.button !== 0) return
    gridRef?.current?.focus({ preventScroll: true })
    const whole = (i, j) => (axis === 'col'
      ? { active: { row: 0, col: Math.min(i, j) }, anchor: { row: 0, col: i }, focus: { row: MAX_GRID_ROWS - 1, col: j } }
      : { active: { row: Math.min(i, j), col: 0 }, anchor: { row: i, col: 0 }, focus: { row: j, col: MAX_GRID_COLS - 1 } })
    const from = e.shiftKey ? (axis === 'col' ? sel.anchor.col : sel.anchor.row) : index
    onSelect(whole(from, index))
    drag((m) => {
      const p = cellAt(m.clientX, m.clientY)
      onSelect(whole(from, axis === 'col' ? p.col : p.row))
    })(e)
  }

  const resizeDown = (axis, index) => (e) => {
    e.stopPropagation()
    e.preventDefault()
    const startPos = axis === 'col' ? e.clientX : e.clientY
    const startSize = axis === 'col' ? cols[index + 1] - cols[index] : rows[index + 1] - rows[index]
    let size = startSize
    drag((m) => {
      size = Math.max(axis === 'col' ? 24 : 16, startSize + (axis === 'col' ? m.clientX : m.clientY) - startPos)
      setLiveSize({ axis, index, size })
    }, () => {
      setLiveSize(null)
      wb.setSize(sheet.id, axis, index, size)
    })(e)
  }

  // Double-clicking a column's edge fits it to its widest value.
  const autofit = (col) => {
    let widest = 0
    const canvas = autofit.canvas ?? (autofit.canvas = document.createElement('canvas'))
    const ctx = canvas.getContext('2d')
    ctx.font = '13px system-ui, sans-serif'
    for (let r = 0; r < bounds.rows; r++) {
      const cell = wb.getCell(sheet.id, r, col)
      const { text } = displayCell(wb.valueAt(sheet, r, col), cell?.format)
      if (text) widest = Math.max(widest, ctx.measureText(text).width)
    }
    wb.setSize(sheet.id, 'col', col, widest ? widest + 14 : null)
  }

  // ── Cells ────────────────────────────────────────────────────────────
  const cells = []
  for (let r = r0; r <= r1; r++) {
    if (rows[r + 1] === rows[r]) continue // hidden
    for (let c = c0; c <= c1; c++) {
      const key = cellKey(r, c)
      const cell = sheet.cells.get(key)
      const value = wb.valueAt(sheet, r, c)
      if (value === null && !cell?.style?.fill && cell?.kind !== 'code') continue
      const shown = displayCell(value, cell?.format)
      const style = cell?.style ?? {}
      const align = style.align ?? shown.align
      const ownWidth = cols[c + 1] - cols[c]
      let width = ownWidth
      let overflow = false
      // Text spills over empty cells to its right, as in Excel.
      if (shown.kind === 'text' && align === 'left') {
        let k = c + 1
        while (k < colCount && k <= c1 + 10 && wb.valueAt(sheet, r, k) === null && !sheet.cells.get(cellKey(r, k))?.style?.fill) k++
        if (k > c + 1) { width = cols[k] - cols[c]; overflow = true }
      }
      const spilled = sheet.spillOwner.has(key) && sheet.spillOwner.get(key) !== key
      const fx = conditional?.(r, c)
      cells.push(
        <div
          key={key}
          className={'ss-cell' + (shown.kind === 'error' ? ' is-error' : '') + (overflow ? ' is-overflow' : '') + (spilled ? ' is-spilled' : '') + (cell?.kind === 'code' ? ' is-code' : '')}
          style={{
            left: cols[c], top: rows[r], width, height: rows[r + 1] - rows[r],
            textAlign: align,
            fontWeight: style.bold || fx?.bold ? 700 : undefined,
            fontStyle: style.italic ? 'italic' : undefined,
            textDecoration: style.underline ? 'underline' : undefined,
            color: fx?.color ?? style.color ?? (shown.color ? FORMAT_COLORS[shown.color] : textOn(style.fill)),
            // A fill covers the cell itself, even when its text runs on into the next cells.
            background: (fx?.fill ?? style.fill) && (overflow ? `linear-gradient(${fx?.fill ?? style.fill}, ${fx?.fill ?? style.fill}) 0 0 / ${ownWidth}px 100% no-repeat, var(--ss-bg)` : fx?.fill ?? style.fill),
          }}
          title={shown.kind === 'error' ? value.detail || value.code : undefined}
        >
          {fx?.bar !== undefined && <span className="ss-data-bar" style={{ width: Math.max(0, (ownWidth - 6) * fx.bar) }} />}
          <span className="ss-cell-text">{shown.text}</span>
          {cell?.kind === 'code' && <span className="ss-code-badge">{CODE_BADGE[cell.code.lang]}</span>}
        </div>,
      )
    }
  }

  const rect = (rg) => {
    const rr2 = Math.min(rg.r2, rowCount - 1), cc2 = Math.min(rg.c2, colCount - 1)
    return { left: cols[rg.c1], top: rows[rg.r1], width: cols[cc2 + 1] - cols[rg.c1], height: rows[rr2 + 1] - rows[rg.r1] }
  }

  const activeKey = cellKey(sel.active.row, sel.active.col)
  const spillAnchor = sheet.spills.has(activeKey) ? activeKey : sheet.spillOwner.get(activeKey)
  const spillRegion = spillAnchor ? sheet.spills.get(spillAnchor) : null

  const headCols = []
  for (let c = c0; c <= c1; c++) {
    const active = c >= range.c1 && c <= range.c2
    headCols.push(
      <div key={c} className={'ss-head' + (active ? ' is-active' : '')} style={{ left: cols[c], top: 0, width: cols[c + 1] - cols[c], height: HEAD_H }}
        onPointerDown={headerDown('col', c)} onContextMenu={(e) => onContextMenu(e, { kind: 'col', index: c })}>
        {indexToCol(c)}
        <div className="ss-resize" onPointerDown={resizeDown('col', c)} onDoubleClick={() => autofit(c)} title="Drag to resize, double-click to fit" />
      </div>,
    )
  }
  // Folded tables: a button on each heading row, and a bar where rows are folded away.
  const foldByRow = new Map(folds.map((f) => [parseRange(f.source)?.r1, f]))
  const FOLD_ICON = { open: '⊟', peek: '◫', closed: '⊞' }
  const FOLD_NEXT = { open: 'Fold this table down to its first rows', peek: 'Fold this table to its heading only', closed: 'Show every row of this table' }
  const headRows = []
  for (let r = r0; r <= r1; r++) {
    if (rows[r + 1] === rows[r]) continue // hidden
    const active = r >= range.r1 && r <= range.r2
    headRows.push(
      <div key={r} className={'ss-head' + (active ? ' is-active' : '')} style={{ left: 0, top: rows[r], width: HEAD_W, height: rows[r + 1] - rows[r] }}
        onPointerDown={headerDown('row', r)} onContextMenu={(e) => onContextMenu(e, { kind: 'row', index: r })}>
        {foldByRow.has(r) && (
          <button type="button" className={'ss-fold-button is-' + foldByRow.get(r).state} title={FOLD_NEXT[foldByRow.get(r).state] + '. Copying this row copies the whole table.'}
            aria-label={FOLD_NEXT[foldByRow.get(r).state]}
            onPointerDown={(e) => e.stopPropagation()} onClick={() => onFoldToggle(foldByRow.get(r))}>{FOLD_ICON[foldByRow.get(r).state]}</button>
        )}
        <span className={hiddenRows?.size && filter && r > filter.r1 && r <= filter.r2 ? 'ss-row-filtered' : undefined}>{r + 1}</span>
        <div className="ss-resize-row" onPointerDown={resizeDown('row', r)} />
      </div>,
    )
  }

  // Trace arrows: from each range the active cell reads into it (blue), and
  // from it to each cell that reads it (green), as Excel draws them.
  const MAX_ARROWS = 60
  const traceLayer = traces && (() => {
    const centre = (b) => [b.left + b.width / 2, b.top + b.height / 2]
    const activeBox = rect({ r1: sel.active.row, c1: sel.active.col, r2: sel.active.row, c2: sel.active.col })
    const [ax, ay] = centre(activeBox)
    const inView = (r) => r.r1 < rowCount && r.c1 < colCount
    const arrow = (from, to, kind, key) => (
      <g key={key} className={'ss-trace is-' + kind}>
        <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} markerEnd={'url(#ss-arrow-' + kind + ')'} />
        <circle cx={from[0]} cy={from[1]} r="3" />
      </g>
    )
    const items = []
    traces.precedents.filter(inView).slice(0, MAX_ARROWS).forEach((r, i) => {
      const b = rect(r)
      if (!r.single) items.push(<rect key={'box' + i} className="ss-trace-box" x={b.left + 1} y={b.top + 1} width={b.width - 2} height={b.height - 2} />)
      // From the range's first cell, as Excel does, so overlapping ranges stay apart.
      const start = r.single ? centre(b) : centre(rect({ r1: r.r1, c1: r.c1, r2: r.r1, c2: r.c1 }))
      items.push(arrow(start, [ax, ay], 'reads', 'p' + i))
    })
    traces.dependents.filter((d) => d.row < rowCount && d.col < colCount).slice(0, MAX_ARROWS).forEach((d, i) => {
      items.push(arrow([ax, ay], centre(rect({ r1: d.row, c1: d.col, r2: d.row, c2: d.col })), 'readby', 'd' + i))
    })
    return (
      <svg className="ss-traces" width={cols[colCount]} height={rows[rowCount]} aria-hidden="true">
        <defs>
          {['reads', 'readby'].map((k) => (
            <marker key={k} id={'ss-arrow-' + k} className={'ss-trace is-' + k} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" />
            </marker>
          ))}
        </defs>
        {items}
      </svg>
    )
  })()

  // Charts float over the cells; dragging one moves it, its corner resizes it.
  const chartDown = (chart, mode) => (e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    onSelectChart(chart.id)
    e.currentTarget.closest('.ss-chart-box')?.focus({ preventScroll: true })
    const sx = e.clientX, sy = e.clientY
    let next = null
    drag((m) => {
      const dx = m.clientX - sx, dy = m.clientY - sy
      if (!next && Math.hypot(dx, dy) < 3) return // a click, not a drag
      next = mode === 'move'
        ? { id: chart.id, x: Math.max(0, chart.x + dx), y: Math.max(0, chart.y + dy), w: chart.w, h: chart.h }
        : { id: chart.id, x: chart.x, y: chart.y, w: Math.max(220, chart.w + dx), h: Math.max(160, chart.h + dy) }
      setChartDrag(next)
    }, () => {
      setChartDrag(null)
      if (next) onChangeChart(chart.id, { x: Math.round(next.x), y: Math.round(next.y), w: Math.round(next.w), h: Math.round(next.h) })
    })(e)
  }
  const chartKeyDown = (chart) => (e) => {
    const ctrl = e.ctrlKey || e.metaKey
    if (ctrl && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
      e.preventDefault()
      if (e.key.toLowerCase() === 'y' || e.shiftKey) wb.redo()
      else wb.undo()
    } else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onDeleteChart(chart.id) }
    else if (e.key === 'Escape') { e.preventDefault(); onSelectChart(null); gridRef?.current?.focus({ preventScroll: true }) }
    else if (e.key.startsWith('Arrow')) {
      // Nudge: 8px, or 1px with Alt.
      e.preventDefault()
      const d = e.altKey ? 1 : 8
      const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0
      const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0
      onChangeChart(chart.id, { x: Math.max(0, chart.x + dx), y: Math.max(0, chart.y + dy) })
    }
    e.stopPropagation()
  }
  const chartBoxes = charts.map((chart) => {
    const live = chartDrag?.id === chart.id ? { ...chart, ...chartDrag } : chart
    const selected = selectedChart === chart.id
    return (
      <div key={chart.id} className={'ss-chart-box' + (selected ? ' is-selected' : '')} tabIndex={0}
        style={{ left: live.x, top: live.y, width: live.w, height: live.h }}
        role="group" aria-label={(chart.title || chart.type + ' chart') + ' of ' + chart.source + '. Drag to move; Delete removes it.'}
        onPointerDown={chartDown(chart, 'move')} onKeyDown={chartKeyDown(chart)}
        onDoubleClick={(e) => e.stopPropagation()} onContextMenu={(e) => e.stopPropagation()}>
        <ChartView chart={chart} values={chartValues(chart)} width={live.w - 2} height={live.h - 2} />
        {selected && <div className="ss-chart-resize" onPointerDown={chartDown(chart, 'resize')} title="Drag to resize" />}
      </div>
    )
  })

  const editorBox = editing?.where === 'cell' ? rect({ r1: sel.active.row, c1: sel.active.col, r2: sel.active.row, c2: sel.active.col }) : null

  return (
    <div ref={gridRef} className="ss-grid h-full w-full" tabIndex={0} onKeyDown={onKeyDown}
      // A stray text selection elsewhere on the page would receive Ctrl+C.
      onFocus={(e) => { if (e.target === e.currentTarget) window.getSelection()?.removeAllRanges() }}
      role="grid" aria-label={'Sheet ' + sheet.name + '. Selected ' + indexToCol(sel.active.col) + (sel.active.row + 1)}>
      <div className="ss-corner" style={{ width: HEAD_W, height: HEAD_H }} title="Select all"
        onPointerDown={() => onSelect({ active: { row: 0, col: 0 }, anchor: { row: 0, col: 0 }, focus: { row: MAX_GRID_ROWS - 1, col: MAX_GRID_COLS - 1 } })} />
      <div className="ss-headers" style={{ left: HEAD_W, top: 0, right: 0, height: HEAD_H }}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translateX(${-scroll.left}px)` }}>{headCols}</div>
      </div>
      <div className="ss-headers" style={{ left: 0, top: HEAD_H, width: HEAD_W, bottom: 0 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translateY(${-scroll.top}px)` }}>{headRows}</div>
      </div>
      <div ref={scrollerRef} className="ss-scroller" style={{ left: HEAD_W, top: HEAD_H, right: 0, bottom: 0 }} onScroll={handleScroll}>
        <div style={{ position: 'relative', width: cols[colCount], height: rows[rowCount] }}
          onPointerDown={handleCellsDown}
          onDoubleClick={(e) => { const p = cellAt(e.clientX, e.clientY); onStartEdit(p.row, p.col, null, 'edit') }}
          onContextMenu={(e) => onContextMenu(e, { kind: 'cell', ...cellAt(e.clientX, e.clientY) })}>
          {cells}
          {spillRegion && <div className="ss-spill-outline" style={rect(spillRegion)} />}
          {refHighlights.map((h, i) => <div key={i} className="ss-ref-outline" style={{ ...rect(h.range), borderColor: h.color }} />)}
          <div className="ss-selection" style={rect(range)} />
          <div className="ss-active" style={rect({ r1: sel.active.row, c1: sel.active.col, r2: sel.active.row, c2: sel.active.col })} />
          {!editing && (() => {
            const b = rect(range)
            return <div className="ss-fill-handle" style={{ left: b.left + b.width - 4, top: b.top + b.height - 4 }} onPointerDown={handleFillDown} title="Drag to fill: copies formulas, continues series such as 1, 2, 3 or Jan, Feb" />
          })()}
          {fillTarget && <div className="ss-fill-preview" style={rect(fillTarget)} />}
          {filter && Array.from({ length: filter.c2 - filter.c1 + 1 }, (_, i) => filter.c1 + i).filter((c) => c >= c0 && c <= c1).map((c) => {
            const active = (filter.hidden?.[c - filter.c1] ?? []).length > 0
            return (
              <button key={'f' + c} type="button" className={'ss-filter-button' + (active ? ' is-active' : '')}
                style={{ left: cols[c + 1] - 20, top: rows[filter.r1] + (rows[filter.r1 + 1] - rows[filter.r1] - 18) / 2 }}
                aria-label={'Filter and sort column ' + indexToCol(c) + (active ? ' (filtered)' : '')} title={active ? 'Filtered: click to change' : 'Filter or sort by this column'}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => onFilterButton(c, e.currentTarget.getBoundingClientRect())}>
                {active ? '⏷' : '▾'}
              </button>
            )
          })}
          {folds.map((f) => {
            const span = foldedSpan(f), rg = parseRange(f.source)
            if (!span || span.from > rowCount) return null
            const n = span.to - span.from + 1
            return (
              <div key={'fold' + f.id} className="ss-fold-bar" style={{ left: cols[rg.c1], top: rows[span.from] - 1, width: cols[Math.min(rg.c2 + 1, colCount)] - cols[rg.c1] }}>
                <button type="button" className="ss-fold-label" title="Show every row of this table"
                  onPointerDown={(e) => e.stopPropagation()} onClick={() => onFoldToggle(f, 'open')}>
                  ⋯ {n} more row{n === 1 ? '' : 's'} folded (rows {span.from + 1}–{span.to + 1}): show
                </button>
              </div>
            )
          })}
          {traceLayer}
          {chartBoxes}
          {editorBox && renderEditor({ ...editorBox, width: Math.max(editorBox.width, 180) })}
        </div>
      </div>
    </div>
  )
}
