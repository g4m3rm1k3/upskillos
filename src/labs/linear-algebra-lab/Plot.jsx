// The lab's plot: draws an OpenMAT figure description as SVG.
// Margins are laid out from the real tick and axis-label text, so labels are never clipped; the plot
// follows the lab's light/dark tokens, shows a legend, reads out the nearest data point on hover,
// and can be saved as an SVG file. Figures with element types this file does not draw fall back
// to the shared canvas renderer.
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import FigureRenderer from '../../components/notebooks/FigureRenderer.jsx'

const SUPPORTED = new Set(['grid', 'axes', 'curve', 'scatter', 'line', 'arrow', 'point', 'text', 'polygon', 'region', 'transformed_grid', 'tangent', 'riemann', 'bars', 'histogram'])
const TEX = { surd: '√', pi: 'π', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', theta: 'θ', lambda: 'λ', mu: 'μ', sigma: 'σ', phi: 'φ', omega: 'ω', Delta: 'Δ', Gamma: 'Γ', Lambda: 'Λ', Sigma: 'Σ', Phi: 'Φ', Omega: 'Ω', leq: '≤', geq: '≥', neq: '≠', times: '×', pm: '±', infty: '∞' }
const TEX_NAMES = Object.keys(TEX).sort((a, b) => b.length - a.length)
export const texText = value => String(value ?? '').replace(/\\([A-Za-z]+)/g, (match, name) => { const hit = TEX_NAMES.find(n => name.startsWith(n)); return hit ? TEX[hit] + name.slice(hit.length) : match })

// Named colours become lab tokens (each has a light and a dark value in lab.css); anything else passes through.
const NAMED = { teal: 'p-teal', blue: 'p-blue', amber: 'p-amber', purple: 'p-purple', red: 'p-red', green: 'p-green', gray: 'muted', hint: 'muted', muted: 'muted', text: 'ink', border: 'line-strong' }
const paint = name => NAMED[name] ? `var(--${NAMED[name]})` : (name || 'var(--p-blue)')

export function niceTicks(min, max, count) {
  const span = Math.abs(max - min) || 1
  const raw = span / Math.max(count, 2), mag = 10 ** Math.floor(Math.log10(raw)), n = raw / mag
  const step = (n > 5 ? 10 : n > 2 ? 5 : n > 1 ? 2 : 1) * mag
  const ticks = []
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-9; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toPrecision(12)))
  return ticks
}
const label = v => { const a = Math.abs(v); return a !== 0 && (a >= 1e5 || a < 1e-3) ? v.toExponential(1) : String(Number(v.toPrecision(6))) }
const textWidth = (text, size = 11) => String(text).length * size * 0.6

function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(640)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => { const w = Math.round(entry.contentRect.width); if (w > 0) setWidth(w) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

function layout(fig, width) {
  const els = fig.elements || []
  const categorical = els.find(e => e.type === 'bars')
  const histogram = els.find(e => e.type === 'histogram')
  let { xmin, xmax, ymin, ymax } = fig
  if (categorical) { xmin = -0.6; xmax = categorical.values.length - 0.4; ymin = Math.min(0, ...categorical.values) * 1.1; ymax = Math.max(0, ...categorical.values) * 1.15 || 1 }
  if (histogram) { xmin = histogram.xmin; xmax = histogram.xmax; ymin = 0; ymax = Math.max(...histogram.counts, 1) * 1.1 }
  const height = fig.square ? width : Math.round(Math.max(220, Math.min(fig.height || 340, width * 0.72)))
  const yTicksDraft = niceTicks(ymin, ymax, Math.max(3, Math.round(height / 60)))
  const xlabel = fig.xlabel ?? els.find(e => e.role === 'xlabel')?.content
  const ylabel = fig.ylabel ?? els.find(e => e.role === 'ylabel')?.content
  const left = 14 + Math.max(...yTicksDraft.map(t => textWidth(label(t))), 10) + (ylabel ? 22 : 0)
  const top = fig.title ? 38 : 14, bottom = 26 + (xlabel ? 22 : 0), right = 18
  let iw = Math.max(40, width - left - right), ih = Math.max(40, height - top - bottom)
  if (fig.axisMode === 'equal' && !categorical && !histogram) {
    const xr = xmax - xmin || 1, yr = ymax - ymin || 1, cx = (xmin + xmax) / 2, cy = (ymin + ymax) / 2
    if (xr / yr > iw / ih) { const r = xr * ih / iw; ymin = cy - r / 2; ymax = cy + r / 2 } else { const r = yr * iw / ih; xmin = cx - r / 2; xmax = cx + r / 2 }
  }
  const sx = x => left + (x - xmin) / (xmax - xmin || 1) * iw
  const sy = y => top + ih - (y - ymin) / (ymax - ymin || 1) * ih
  const xTicks = categorical ? [] : niceTicks(xmin, xmax, Math.max(3, Math.round(iw / 80)))
  const yTicks = niceTicks(ymin, ymax, Math.max(3, Math.round(ih / 50)))
  return { width, height, left, top, iw, ih, xmin, xmax, ymin, ymax, sx, sy, xTicks, yTicks, xlabel, ylabel, categorical, histogram }
}

// Clamp far-off coordinates (xline/yline use ±1e9) so path strings stay sane; the clip path hides the rest.
const c = v => Math.max(-1e5, Math.min(1e5, v))
function pathFor(xs, ys, L) {
  let d = '', pen = false
  for (let i = 0; i < xs.length; i++) {
    const y = ys[i]
    if (y == null || !Number.isFinite(y) || !Number.isFinite(xs[i])) { pen = false; continue }
    d += `${pen ? 'L' : 'M'}${c(L.sx(xs[i])).toFixed(1)},${c(L.sy(y)).toFixed(1)}`
    pen = true
  }
  return d
}

function arrowHead(x1, y1, x2, y2, size = 9) {
  const a = Math.atan2(y2 - y1, x2 - x1), w = o => `${x2 - size * Math.cos(a + o)},${y2 - size * Math.sin(a + o)}`
  return `${w(0.42)} ${x2},${y2} ${w(-0.42)}`
}

function Element({ el, L, clip }) {
  const color = paint(el.color)
  const style = { opacity: el.alpha ?? undefined }
  switch (el.type) {
    case 'curve': {
      const d = pathFor(el.xs, el.ys, L)
      const fill = el.fill && `${d}L${c(L.sx(el.xs.at(-1)))},${L.sy(Math.max(L.ymin, Math.min(L.ymax, 0)))}L${c(L.sx(el.xs[0]))},${L.sy(Math.max(L.ymin, Math.min(L.ymax, 0)))}Z`
      return <g clipPath={clip}>{fill && <path d={fill} fill={color} opacity={el.fill_alpha || 0.16} />}<path d={d} fill="none" stroke={color} strokeWidth={el.width || 2.5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={el.dashed ? '8 5' : undefined} style={style} /></g>
    }
    case 'scatter': return <g clipPath={clip} fill={color} style={style}>{el.xs.map((x, i) => <circle key={i} cx={L.sx(x)} cy={L.sy(el.ys[i])} r={el.radius || 4} stroke="var(--paper)" strokeWidth="1.2" />)}
      {el.labels?.map((t, i) => t && <text key={`t${i}`} x={L.sx(el.xs[i])} y={L.sy(el.ys[i]) - 9} textAnchor="middle" className="la-plot-note">{t}</text>)}</g>
    case 'line': return <line clipPath={clip} x1={c(L.sx(el.start[0]))} y1={c(L.sy(el.start[1]))} x2={c(L.sx(el.end[0]))} y2={c(L.sy(el.end[1]))} stroke={paint(el.color || 'muted')} strokeWidth={el.width || 1.5} strokeDasharray={el.dashed ? '5 4' : undefined} style={style} />
    case 'arrow': {
      const [x1, y1, x2, y2] = [L.sx(el.start[0]), L.sy(el.start[1]), L.sx(el.end[0]), L.sy(el.end[1])]
      return <g clipPath={clip} style={style}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={el.width || 2.5} strokeDasharray={el.dashed ? '5 4' : undefined} strokeLinecap="round" /><polygon points={arrowHead(x1, y1, x2, y2)} fill={color} />{el.label && <text x={x2 + 8} y={y2 - 8} fill={color} className="la-plot-note">{texText(el.label)}</text>}</g>
    }
    case 'point': return <g clipPath={clip}><circle cx={L.sx(el.pos[0])} cy={L.sy(el.pos[1])} r={el.radius || 6} fill={paint(el.color || 'amber')} />{el.label && <text x={L.sx(el.pos[0])} y={L.sy(el.pos[1]) - 11} textAnchor="middle" fill={paint(el.color || 'amber')} className="la-plot-note">{texText(el.label)}</text>}</g>
    case 'text': return el.role ? null : <text x={L.sx(el.pos[0])} y={L.sy(el.pos[1])} textAnchor={el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'middle'} fill={paint(el.color || 'text')} fontSize={el.size || 12} fontWeight={el.bold ? 650 : undefined} className="la-plot-note">{texText(el.content)}</text>
    case 'polygon': return el.points?.length > 1 ? <polygon clipPath={clip} points={el.points.map(([x, y]) => `${L.sx(x)},${L.sy(y)}`).join(' ')} fill={el.fill ? color : 'none'} fillOpacity={el.fill ? el.alpha || 0.2 : undefined} stroke={el.stroke === false ? 'none' : color} strokeWidth={el.stroke_width || 1.5} /> : null
    case 'region': {
      const top = el.xs.map((x, i) => el.tops[i] == null ? null : `${L.sx(x)},${L.sy(el.tops[i])}`).filter(Boolean)
      const bottom = el.xs.map((x, i) => el.bottoms[i] == null ? null : `${L.sx(x)},${L.sy(el.bottoms[i])}`).filter(Boolean).reverse()
      return <polygon clipPath={clip} points={[...top, ...bottom].join(' ')} fill={color} opacity={el.alpha || 0.2} />
    }
    case 'transformed_grid': {
      const { a, b, c: cc, d, range: r = 5 } = el, T = (x, y) => [L.sx(a * x + b * y), L.sy(cc * x + d * y)]
      return <g clipPath={clip} opacity={el.alpha ?? 0.7}>{Array.from({ length: 2 * r + 1 }, (_, k) => k - r).map(i => { const [p, q] = [T(i, -r), T(i, r)], [s, t] = [T(-r, i), T(r, i)]
        return <g key={i}><line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={paint(el.color_v || 'green')} strokeWidth={i ? 1 : 2} strokeOpacity={i ? 0.4 : 1} /><line x1={s[0]} y1={s[1]} x2={t[0]} y2={t[1]} stroke={paint(el.color_h || 'blue')} strokeWidth={i ? 1 : 2} strokeOpacity={i ? 0.4 : 1} /></g> })}</g>
    }
    case 'tangent': return <g clipPath={clip}><line x1={L.sx(el.x1)} y1={L.sy(el.y0 + el.slope * (el.x1 - el.x0))} x2={L.sx(el.x2)} y2={L.sy(el.y0 + el.slope * (el.x2 - el.x0))} stroke={paint(el.color || 'amber')} strokeWidth={el.width || 2} /><circle cx={L.sx(el.x0)} cy={L.sy(el.y0)} r="5" fill={paint(el.color || 'amber')} /></g>
    case 'riemann': return <g clipPath={clip} fill={color} stroke={color} strokeWidth=".5">{el.rects.map((r, i) => <rect key={i} x={L.sx(r.x)} y={L.sy(Math.max(0, r.h))} width={Math.abs(L.sx(r.x + r.w) - L.sx(r.x))} height={Math.abs(L.sy(r.h) - L.sy(0))} fillOpacity={el.alpha || 0.3} />)}</g>
    case 'bars': {
      const w = Math.min(64, L.iw / el.values.length * 0.62)
      return <g>{el.values.map((v, i) => { const x = L.sx(i), y0 = L.sy(0), y1 = L.sy(v); return <g key={i}><rect x={x - w / 2} y={Math.min(y0, y1)} width={w} height={Math.abs(y1 - y0)} rx="3" fill={color} opacity={el.alpha || 0.85} /><text x={x} y={Math.min(y0, y1) - 5} textAnchor="middle" className="la-plot-note">{label(v)}</text><text x={x} y={L.top + L.ih + 16} textAnchor="middle" className="la-plot-tick">{el.labels?.[i] ?? i + 1}</text></g> })}</g>
    }
    case 'histogram': return <g fill={color}>{el.counts.map((n, i) => <rect key={i} x={L.sx(el.edges[i]) + 0.5} y={L.sy(n)} width={Math.max(1, L.sx(el.edges[i + 1]) - L.sx(el.edges[i]) - 1)} height={L.sy(0) - L.sy(n)} opacity={el.alpha || 0.75} />)}</g>
    default: return null
  }
}

// Series that can be hovered: their data points in figure coordinates.
const seriesOf = fig => (fig.elements || []).filter(e => (e.type === 'curve' || e.type === 'scatter') && e.xs?.length).map((e, i) => ({ name: e.label || `series ${i + 1}`, color: paint(e.color), xs: e.xs, ys: e.ys }))

export default function Plot({ figure, colors }) {
  const [box, width] = useWidth()
  const svg = useRef(null)
  const [hover, setHover] = useState(null)
  const clipId = useId().replace(/:/g, '')
  const L = useMemo(() => layout(figure, width), [figure, width])
  const series = useMemo(() => seriesOf(figure), [figure])
  const legend = series.filter(s => !s.name.startsWith('series ') || figure.legend)
  const clip = `url(#${clipId})`

  if ((figure.elements || []).some(e => !SUPPORTED.has(e.type))) return <div className="la-plot"><FigureRenderer figureJson={figure} C={colors} /></div>

  const move = event => {
    if (!series.length || !svg.current?.getScreenCTM) return
    const p = svg.current.createSVGPoint(); p.x = event.clientX; p.y = event.clientY
    const { x, y } = p.matrixTransform(svg.current.getScreenCTM().inverse())
    let best = null
    for (const s of series) s.xs.forEach((xv, i) => {
      const yv = s.ys[i]
      if (!Number.isFinite(yv) || yv < L.ymin || yv > L.ymax || xv < L.xmin || xv > L.xmax) return
      const d = Math.hypot(L.sx(xv) - x, L.sy(yv) - y)
      if (!best || d < best.d) best = { d, x: xv, y: yv, s }
    })
    setHover(best && best.d < 40 ? best : null)
  }
  const save = () => {
    const source = new XMLSerializer().serializeToString(svg.current)
    const styles = getComputedStyle(svg.current)
    const resolved = source.replace(/var\(--([\w-]+)\)/g, (m, name) => styles.getPropertyValue(`--${name}`).trim() || m)
    const url = URL.createObjectURL(new Blob([resolved], { type: 'image/svg+xml' }))
    const a = document.createElement('a'); a.href = url; a.download = `${(figure.title || 'openmat-plot').replace(/[^\w-]+/g, '-').toLowerCase()}.svg`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const { sx, sy, left, top, iw, ih } = L
  const zeroX = L.xmin < 0 && L.xmax > 0, zeroY = L.ymin < 0 && L.ymax > 0
  const hasGrid = (figure.elements || []).some(e => e.type === 'grid')
  return <figure className="la-plot" ref={box}>
    <svg ref={svg} width={L.width} height={L.height} viewBox={`0 0 ${L.width} ${L.height}`} xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label={`${texText(figure.title || 'Plot')}${L.xlabel ? `; horizontal axis ${texText(L.xlabel)}` : ''}${L.ylabel ? `; vertical axis ${texText(L.ylabel)}` : ''}`}
      onPointerMove={move} onPointerLeave={() => setHover(null)}>
      <defs><clipPath id={clipId}><rect x={left} y={top} width={iw} height={ih} /></clipPath></defs>
      <rect x="0" y="0" width={L.width} height={L.height} fill="var(--paper)" />
      {figure.title && <text x={left + iw / 2} y="24" textAnchor="middle" className="la-plot-title">{texText(figure.title)}</text>}
      {hasGrid && <g className="la-plot-grid">{L.xTicks.map(t => <line key={`x${t}`} x1={sx(t)} x2={sx(t)} y1={top} y2={top + ih} />)}{L.yTicks.map(t => <line key={`y${t}`} x1={left} x2={left + iw} y1={sy(t)} y2={sy(t)} />)}</g>}
      {zeroY && <line className="la-plot-zero" x1={left} x2={left + iw} y1={sy(0)} y2={sy(0)} />}
      {zeroX && !L.categorical && <line className="la-plot-zero" x1={sx(0)} x2={sx(0)} y1={top} y2={top + ih} />}
      {(figure.elements || []).map((el, i) => <Element key={i} el={el} L={L} clip={clip} />)}
      <rect className="la-plot-frame" x={left} y={top} width={iw} height={ih} />
      <g className="la-plot-tick">
        {L.xTicks.map(t => <text key={`x${t}`} x={sx(t)} y={top + ih + 16} textAnchor="middle">{label(t)}</text>)}
        {L.yTicks.map(t => <text key={`y${t}`} x={left - 7} y={sy(t) + 4} textAnchor="end">{label(t)}</text>)}
      </g>
      {L.xlabel && <text className="la-plot-axis" x={left + iw / 2} y={L.height - 8} textAnchor="middle">{texText(L.xlabel)}</text>}
      {L.ylabel && <text className="la-plot-axis" transform={`translate(15 ${top + ih / 2}) rotate(-90)`} textAnchor="middle">{texText(L.ylabel)}</text>}
      {hover && <g pointerEvents="none"><line className="la-plot-cross" x1={sx(hover.x)} x2={sx(hover.x)} y1={top} y2={top + ih} /><circle cx={sx(hover.x)} cy={sy(hover.y)} r="6" fill="var(--paper)" stroke={hover.s.color} strokeWidth="3" /></g>}
    </svg>
    <figcaption>
      {legend.length > 0 && <span className="la-plot-legend">{legend.map(s => <span key={s.name} style={{ '--tone': s.color }}>{texText(s.name)}</span>)}</span>}
      <span className="la-plot-readout" aria-live="polite">{hover ? `${hover.s.name}: x = ${label(hover.x)}, y = ${label(hover.y)}` : series.length ? 'Hover a line to read values' : ''}</span>
      <button type="button" className="la-ghost la-plot-save" onClick={save}>Save SVG</button>
    </figcaption>
  </figure>
}
