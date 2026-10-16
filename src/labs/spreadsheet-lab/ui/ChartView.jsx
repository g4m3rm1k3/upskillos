// Draws one chart as SVG from series read out of the sheet (engine/chart.js).
// Colours come from CSS variables, so the chart follows light and dark mode;
// the series colours are a colour-blind-checked palette in a fixed order.
// Hovering shows the values: a crosshair on line charts, the bar itself on
// bar charts, the nearest point on a scatter chart.
import { useMemo, useState } from 'react'
import { histogramBins, linearFit, niceTicks, readSeries } from '../engine/chart.js'

export const MAX_SERIES = 8
const PIE_SLICES = 7
const FONT = 11
const color = (i) => `var(--ss-series-${(i % MAX_SERIES) + 1})`

export function formatNumber(v, step) {
  if (!Number.isFinite(v)) return ''
  const abs = Math.abs(v)
  if (abs >= 1e9) return trim(v / 1e9) + 'B'
  if (abs >= 1e6) return trim(v / 1e6) + 'M'
  if (abs >= 1e4 && (step === undefined || step >= 1000)) return trim(v / 1e3) + 'K'
  const decimals = step ? Math.max(0, Math.min(6, -Math.floor(Math.log10(step) + 1e-9))) : (Number.isInteger(v) ? 0 : 2)
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: Math.max(decimals, step ? decimals : 4) })
}
const trim = (x) => String(Number(x.toPrecision(3)))
const textWidth = (s) => String(s).length * FONT * 0.6

function label(v) {
  if (typeof v === 'number') return formatNumber(v)
  return String(v ?? '')
}

// The plotted pieces for each chart type, in plot coordinates.
function useLayout(chart, data, width, height) {
  return useMemo(() => {
    const { type } = chart
    const series = data.series.slice(0, MAX_SERIES)
    const title = chart.title ?? (series.length === 1 && type !== 'histogram' ? series[0].name : '')
    const legend = type === 'pie' || (series.length > 1 && type !== 'histogram')
    const top = 10 + (title ? 20 : 0) + (legend ? 20 : 0)
    const base = { type, title, legend, top, series }
    if (type === 'pie') return { ...base, ...pieLayout(data, series, width, height, top) }

    // The value axis.
    const horizontal = type === 'bar'
    let values, xDomain = null, bins = null
    if (type === 'histogram') {
      bins = histogramBins(data.series.flatMap((s) => s.values), chart.bins || null, chart.binRule)
      values = [0, ...bins.bins.map((b) => b.count)]
      xDomain = bins.bins.length ? [bins.bins[0].from, bins.bins.at(-1).to] : [0, 1]
    } else {
      values = series.flatMap((s) => s.values).filter(Number.isFinite)
      if (type !== 'line' && type !== 'scatter') values.push(0) // bars start at zero
      if (type === 'scatter') {
        const xs = data.categories.filter(Number.isFinite)
        xDomain = xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 1]
      }
    }
    const lo = values.length ? Math.min(...values) : 0
    const hi = values.length ? Math.max(...values) : 1
    const ticks = niceTicks(lo, hi, horizontal ? Math.max(2, Math.floor(width / 90)) : Math.max(2, Math.floor(height / 50)))
    const step = ticks[1] - ticks[0]
    const tickText = ticks.map((t) => formatNumber(t, step))
    const xTicks = xDomain ? niceTicks(xDomain[0], xDomain[1], Math.max(2, Math.floor(width / 80))) : null
    const xStep = xTicks ? xTicks[1] - xTicks[0] : undefined

    const yTitle = chart.yTitle ? 16 : 0
    const xTitle = chart.xTitle ? 16 : 0
    const categoryText = data.categories.map(label)
    const left = 10 + yTitle + (horizontal ? Math.min(width * 0.35, Math.max(...categoryText.map(textWidth), 10) + 4) : Math.max(...tickText.map(textWidth))) + 6
    const plot = { left, top, right: width - 14, bottom: height - 10 - xTitle - 18 }
    plot.w = Math.max(10, plot.right - plot.left)
    plot.h = Math.max(10, plot.bottom - plot.top)

    const vmin = ticks[0], vmax = ticks.at(-1)
    const scale = (v) => (horizontal ? plot.left + ((v - vmin) / (vmax - vmin)) * plot.w : plot.bottom - ((v - vmin) / (vmax - vmin)) * plot.h)
    const xScale = xTicks ? (v) => plot.left + ((v - xTicks[0]) / (xTicks.at(-1) - xTicks[0])) * plot.w : null
    return { ...base, plot, ticks, step, tickText, scale, xTicks, xStep, xScale, bins, horizontal, categoryText, xTitle, yTitle }
  }, [chart, data, width, height])
}

function pieLayout(data, series, width, height, top) {
  const s = series[0]
  let slices = (s?.values ?? []).map((v, i) => ({ name: label(data.categories[i]), value: v, index: i })).filter((x) => Number.isFinite(x.value) && x.value > 0)
  // Past a handful of slices, angles cannot be compared: the rest become "Other".
  if (slices.length > PIE_SLICES) {
    const sorted = [...slices].sort((a, b) => b.value - a.value)
    const keep = new Set(sorted.slice(0, PIE_SLICES - 1).map((x) => x.index))
    const other = slices.filter((x) => !keep.has(x.index)).reduce((t, x) => t + x.value, 0)
    slices = [...slices.filter((x) => keep.has(x.index)), { name: 'Other', value: other, index: -1 }]
  }
  const total = slices.reduce((t, x) => t + x.value, 0)
  const negatives = (s?.values ?? []).some((v) => Number.isFinite(v) && v < 0)
  const r = Math.max(10, Math.min(width - 40, height - top - 30) / 2 - 18)
  const cx = width / 2, cy = top + 10 + r + 8
  let angle = -Math.PI / 2
  const arcs = slices.map((x, i) => {
    const a0 = angle, a1 = angle + (x.value / total) * Math.PI * 2
    angle = a1
    return { ...x, a0, a1, share: x.value / total, color: x.index === -1 ? 'var(--ss-chart-muted)' : color(i) }
  })
  return { pie: { arcs, total, cx, cy, r, negatives } }
}

function arcPath(cx, cy, r, a0, a1) {
  if (a1 - a0 >= Math.PI * 2 - 1e-9) return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`
  const p = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  const [x0, y0] = p(a0), [x1, y1] = p(a1)
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1} Z`
}

// A bar with a 4px rounded data end and a square end at the baseline.
function barPath(x, y, w, h, end) {
  const r = Math.min(4, w / 2, h / 2)
  if (h <= 0 || w <= 0) return ''
  switch (end) {
    case 'top': return `M ${x} ${y + h} V ${y + r} Q ${x} ${y} ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h} Z`
    case 'bottom': return `M ${x} ${y} V ${y + h - r} Q ${x} ${y + h} ${x + r} ${y + h} H ${x + w - r} Q ${x + w} ${y + h} ${x + w} ${y + h - r} V ${y} Z`
    case 'right': return `M ${x} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x} Z`
    default: return `M ${x + w} ${y} H ${x + r} Q ${x} ${y} ${x} ${y + r} V ${y + h - r} Q ${x} ${y + h} ${x + r} ${y + h} H ${x + w} Z`
  }
}

// Category labels that fit: every k-th one when they would overlap.
function everyNth(texts, room) {
  const widest = Math.max(...texts.map(textWidth), 1) + 8
  return Math.max(1, Math.ceil((widest * texts.length) / Math.max(room, 1)))
}

const fit = (s, px) => { const t = String(s); const n = Math.max(1, Math.floor(px / (FONT * 0.6))); return t.length > n ? t.slice(0, Math.max(1, n - 1)) + '…' : t }

export default function ChartView({ chart, values, width, height }) {
  const data = useMemo(() => readSeries(values, chart.type), [values, chart.type])
  const L = useLayout(chart, data, width, height)
  const [hover, setHover] = useState(null) // { x, y, title, rows: [[color, name, value]] }
  const { plot } = L

  const tip = (e, title, rows) => {
    const box = e.currentTarget.ownerSVGElement?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect()
    setHover({ x: e.clientX - box.left, y: e.clientY - box.top, title, rows })
  }

  const marks = []
  const overlays = []
  const nothing = !data.series.length || data.series.every((s) => s.values.every((v) => v === null))

  if (!nothing && (L.type === 'column' || L.type === 'bar')) {
    const n = data.categories.length
    const band = (L.horizontal ? plot.h : plot.w) / Math.max(1, n)
    const count = L.series.length
    const thick = Math.max(2, Math.min(24, (band * 0.75 - 2 * (count - 1)) / count))
    const group = count * thick + 2 * (count - 1)
    const zero = L.scale(Math.max(L.ticks[0], Math.min(0, L.ticks.at(-1))))
    data.categories.forEach((cat, i) => {
      const start = (L.horizontal ? plot.top : plot.left) + band * i + (band - group) / 2
      L.series.forEach((s, j) => {
        const v = s.values[i]
        if (!Number.isFinite(v)) return
        const pos = start + j * (thick + 2)
        const end = L.scale(v)
        const d = L.horizontal
          ? barPath(Math.min(zero, end), pos, Math.abs(end - zero), thick, v >= 0 ? 'right' : 'left')
          : barPath(pos, Math.min(zero, end), thick, Math.abs(end - zero), v >= 0 ? 'top' : 'bottom')
        marks.push(
          <path key={i + '-' + j} d={d} fill={color(j)} className="ss-chart-mark"
            onPointerMove={(e) => tip(e, label(cat), [[color(j), s.name, formatNumber(v)]])} onPointerLeave={() => setHover(null)} />,
        )
      })
    })
  }

  if (!nothing && L.type === 'histogram') {
    const { bins } = L.bins
    bins.forEach((b, i) => {
      const x0 = L.xScale(b.from), x1 = L.xScale(b.to)
      const y = L.scale(b.count)
      marks.push(
        <path key={i} d={barPath(x0 + 1, y, Math.max(1, x1 - x0 - 2), L.scale(0) - y, 'top')} fill={color(0)} className="ss-chart-mark"
          onPointerMove={(e) => tip(e, formatNumber(b.from, L.bins.width) + ' to ' + formatNumber(b.to, L.bins.width), [[color(0), 'Count', String(b.count)]])}
          onPointerLeave={() => setHover(null)} />,
      )
    })
  }

  let lineX = null
  if (!nothing && L.type === 'line') {
    const n = data.categories.length
    // Each point sits in the middle of its category, as in Excel.
    lineX = (i) => plot.left + (plot.w / Math.max(1, n)) * (i + 0.5)
    L.series.forEach((s, j) => {
      // A gap in the data is a gap in the line, not a drop to zero.
      let d = '', pen = false
      s.values.forEach((v, i) => {
        if (!Number.isFinite(v)) { pen = false; return }
        d += (pen ? ' L ' : ' M ') + lineX(i) + ' ' + L.scale(v)
        pen = true
      })
      marks.push(<path key={'l' + j} d={d} fill="none" stroke={color(j)} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />)
      if (n <= 40) s.values.forEach((v, i) => Number.isFinite(v) && marks.push(<circle key={j + '-' + i} cx={lineX(i)} cy={L.scale(v)} r="4" fill={color(j)} className="ss-chart-dot" />))
    })
    if (chart.trendline) L.series.forEach((s, j) => overlays.push(trend(s.values.map((_, i) => i), s.values, j, lineX, L, plot, 'idx')))
  }

  if (!nothing && L.type === 'scatter') {
    L.series.forEach((s, j) => {
      s.values.forEach((v, i) => {
        const x = data.categories[i]
        if (!Number.isFinite(v) || !Number.isFinite(x)) return
        marks.push(<circle key={j + '-' + i} cx={L.xScale(x)} cy={L.scale(v)} r="4" fill={color(j)} className="ss-chart-dot" />)
      })
    })
    if (chart.trendline) L.series.forEach((s, j) => overlays.push(trend(data.categories, s.values, j, L.xScale, L, plot, 'x')))
  }

  if (!nothing && L.pie) {
    const { arcs, cx, cy, r } = L.pie
    arcs.forEach((a, i) => {
      marks.push(
        <path key={i} d={arcPath(cx, cy, r, a.a0, a.a1)} fill={a.color} stroke="var(--ss-chart-surface)" strokeWidth="2" className="ss-chart-mark"
          onPointerMove={(e) => tip(e, a.name, [[a.color, L.series[0]?.name ?? '', formatNumber(a.value) + ' (' + Math.round(a.share * 100) + '%)']])}
          onPointerLeave={() => setHover(null)} />,
      )
      // Direct labels on slices big enough to hold them.
      if (a.share >= 0.06) {
        const mid = (a.a0 + a.a1) / 2
        overlays.push(<text key={'t' + i} x={cx + r * 0.65 * Math.cos(mid)} y={cy + r * 0.65 * Math.sin(mid)} textAnchor="middle" dominantBaseline="middle" className="ss-chart-onfill" fill={a.index === -1 || [2, 3, 4].includes(i % MAX_SERIES) ? '#0b0b0b' : '#ffffff'}>{Math.round(a.share * 100)}%</text>)
      }
    })
  }

  // Crosshair readout for line charts: every series at the nearest category.
  const lineHover = (e) => {
    if (L.type !== 'line' || !lineX) return
    const box = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - box.left) / box.width) * width
    const n = data.categories.length
    const i = Math.max(0, Math.min(n - 1, Math.floor(((x - plot.left) / plot.w) * n)))
    setHover({ x: e.clientX - box.left, y: e.clientY - box.top, title: label(data.categories[i]), rows: L.series.map((s, j) => [color(j), s.name, Number.isFinite(s.values[i]) ? formatNumber(s.values[i]) : '(blank)']), cross: lineX(i) })
  }
  // Nearest point for scatter charts, so a small dot need not be hit exactly.
  const scatterHover = (e) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * width, py = ((e.clientY - box.top) / box.height) * height
    let best = null
    L.series.forEach((s, j) => s.values.forEach((v, i) => {
      const x = data.categories[i]
      if (!Number.isFinite(v) || !Number.isFinite(x)) return
      const d = Math.hypot(L.xScale(x) - px, L.scale(v) - py)
      if (d < 24 && (!best || d < best.d)) best = { d, j, i, x, v }
    }))
    if (!best) { setHover(null); return }
    setHover({ x: e.clientX - box.left, y: e.clientY - box.top, title: L.series[best.j].name, rows: [[color(best.j), 'x', formatNumber(best.x)], [color(best.j), 'y', formatNumber(best.v)]] })
  }

  const legendItems = L.type === 'pie' ? (L.pie?.arcs ?? []).map((a) => [a.color, a.name]) : L.series.map((s, j) => [color(j), s.name])
  const description = (L.title ? L.title + ': ' : '') + (chart.type) + ' chart of ' + data.series.map((s) => s.name).join(', ')

  return (
    <div className="ss-chart" style={{ width, height }}>
      <svg width={width} height={height} role="img" aria-label={description}
        onPointerMove={L.type === 'line' ? lineHover : L.type === 'scatter' ? scatterHover : undefined}
        onPointerLeave={() => setHover(null)}>
        {L.title && <text x={width / 2} y={20} textAnchor="middle" className="ss-chart-title">{fit(L.title, width - 20)}</text>}
        {L.legend && <Legend items={legendItems} y={L.title ? 40 : 20} width={width} line={L.type === 'line' || L.type === 'scatter'} />}
        {nothing && <text x={width / 2} y={height / 2} textAnchor="middle" className="ss-chart-muted">No numbers to plot in {chart.source}.</text>}
        {!nothing && plot && <Axes L={L} data={data} chart={chart} lineX={lineX} width={width} height={height} />}
        {marks}
        {overlays}
        {hover?.cross !== undefined && <line x1={hover.cross} x2={hover.cross} y1={plot.top} y2={plot.bottom} className="ss-chart-cross" />}
      </svg>
      {hover && (
        <div className="ss-chart-tip" style={{ left: Math.min(hover.x + 12, width - 150), top: Math.max(4, hover.y - 10 - 18 * hover.rows.length) }}>
          <div className="ss-chart-tip-title">{hover.title}</div>
          {hover.rows.map(([c, name, v], i) => (
            <div key={i} className="ss-chart-tip-row"><span className="ss-chart-key" style={{ background: c }} /><b>{v}</b><span>{name}</span></div>
          ))}
        </div>
      )}
    </div>
  )
}

function trend(xs, ys, j, xScale, L, plot, mode) {
  const f = linearFit(xs, ys)
  if (!f) return null
  const valid = xs.filter((x, i) => Number.isFinite(x) && Number.isFinite(ys[i]))
  const x0 = Math.min(...valid), x1 = Math.max(...valid)
  const clamp = (y) => Math.max(plot.top, Math.min(plot.bottom, y))
  const eq = 'y = ' + formatNumber(f.slope) + (mode === 'idx' ? 'n' : 'x') + (f.intercept < 0 ? ' − ' : ' + ') + formatNumber(Math.abs(f.intercept)) + '   R² = ' + f.r2.toFixed(3)
  return (
    <g key={'trend' + j}>
      <line x1={xScale(x0)} y1={clamp(L.scale(f.slope * x0 + f.intercept))} x2={xScale(x1)} y2={clamp(L.scale(f.slope * x1 + f.intercept))} stroke={color(j)} strokeWidth="1.5" opacity="0.8" />
      <text x={plot.right - 4} y={plot.top + 12 + j * 14} textAnchor="end" className="ss-chart-label">
        <tspan fill={color(j)}>━ </tspan>{eq}
      </text>
    </g>
  )
}

function Legend({ items, y, width, line }) {
  // One centred row; items that do not fit are summarised.
  let x = 0
  const placed = []
  for (const [c, name] of items) {
    const w = 16 + Math.min(textWidth(name), 110) + 14
    if (x + w > width - 20) { placed.push({ more: items.length - placed.length, x }); break }
    placed.push({ c, name, x })
    x += w
  }
  const offset = (width - x) / 2
  return (
    <g transform={`translate(${offset}, ${y - 4})`} className="ss-chart-label">
      {placed.map((p, i) => (p.more
        ? <text key={i} x={p.x} y={4}>+{p.more} more</text>
        : (
          <g key={i} transform={`translate(${p.x}, 0)`}>
            {line ? <line x1="0" x2="12" y1="0" y2="0" stroke={p.c} strokeWidth="2" strokeLinecap="round" /> : <rect x="0" y="-5" width="10" height="10" rx="2" fill={p.c} />}
            <text x="16" y="4">{fit(p.name, 110)}</text>
          </g>
        )))}
    </g>
  )
}

function Axes({ L, data, chart, lineX, width, height }) {
  const { plot } = L
  const out = []
  // Value gridlines and labels.
  L.ticks.forEach((t, i) => {
    const p = L.scale(t)
    if (L.horizontal) {
      out.push(<line key={'g' + i} x1={p} x2={p} y1={plot.top} y2={plot.bottom} className={t === 0 ? 'ss-chart-axis' : 'ss-chart-grid'} />)
      out.push(<text key={'t' + i} x={p} y={plot.bottom + 14} textAnchor="middle" className="ss-chart-tick">{L.tickText[i]}</text>)
    } else {
      out.push(<line key={'g' + i} x1={plot.left} x2={plot.right} y1={p} y2={p} className={t === 0 ? 'ss-chart-axis' : 'ss-chart-grid'} />)
      out.push(<text key={'t' + i} x={plot.left - 6} y={p + 4} textAnchor="end" className="ss-chart-tick">{L.tickText[i]}</text>)
    }
  })
  // The category or x axis.
  if (L.xTicks) {
    L.xTicks.forEach((t, i) => out.push(<text key={'x' + i} x={L.xScale(t)} y={plot.bottom + 14} textAnchor="middle" className="ss-chart-tick">{formatNumber(t, L.xStep)}</text>))
    out.push(<line key="xa" x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} className="ss-chart-axis" />)
  } else {
    const n = data.categories.length
    if (L.horizontal) {
      const band = plot.h / Math.max(1, n)
      const k = Math.max(1, Math.ceil((FONT + 4) / band))
      data.categories.forEach((c, i) => i % k === 0 && out.push(<text key={'c' + i} x={plot.left - 6} y={plot.top + band * (i + 0.5) + 4} textAnchor="end" className="ss-chart-tick">{fit(L.categoryText[i], plot.left - 12 - L.yTitle)}</text>))
    } else {
      const band = plot.w / Math.max(1, n)
      const k = everyNth(L.categoryText, plot.w)
      const at = (i) => (lineX ? lineX(i) : plot.left + band * (i + 0.5))
      data.categories.forEach((c, i) => i % k === 0 && out.push(<text key={'c' + i} x={at(i)} y={plot.bottom + 14} textAnchor="middle" className="ss-chart-tick">{fit(L.categoryText[i], Math.max(band * k - 4, 24))}</text>))
      if (lineX) out.push(<line key="xa" x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} className="ss-chart-axis" />)
    }
  }
  if (chart.xTitle) out.push(<text key="xt" x={plot.left + plot.w / 2} y={height - 8} textAnchor="middle" className="ss-chart-label">{fit(chart.xTitle, plot.w)}</text>)
  if (chart.yTitle) out.push(<text key="yt" transform={`translate(14, ${plot.top + plot.h / 2}) rotate(-90)`} textAnchor="middle" className="ss-chart-label">{fit(chart.yTitle, plot.h)}</text>)
  return <g>{out}</g>
}
