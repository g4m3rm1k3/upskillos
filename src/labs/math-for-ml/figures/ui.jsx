// Pieces every figure uses: a graph with axes, curves, points you can drag, segments, arrows and
// shaded regions; sliders; bars; and number formatting.
import { useId, useRef } from 'react'

export const C = { teal: '#1f6f68', orange: '#c26a12', violet: '#5b4bb5', red: '#c0533a', grey: '#8a8577', gold: '#c9a227', blue: '#2f6db5' }
export const fmt = (x, d = 3) => !Number.isFinite(x) ? '—' : Number.isInteger(x) ? String(x) : String(Number(x.toFixed(d)))

// x, y: [min, max] of the visible region. fns: [{ f, color, dash, label, from, to }]. points: [{ x, y, color, label, drag }].
// segments: [{ x1, y1, x2, y2, color, dash }]. arrows: [{ x1, y1, x2, y2, color, label }]. regions: [{ f, from, to, color }] shaded under f.
// rects: [{ x, y, w, h, color }] in world units. background({ X, Y }) draws first, under everything; children last. onDrag(index, x, y) for points with drag: true.
export function Graph({ x = [-5, 5], y = [-5, 5], width = 460, height = 300, fns = [], points = [], segments = [], arrows = [], regions = [], rects = [], onDrag, grid = true, equal = false, yaxis = true, background, xlabel, ylabel, label = 'graph', children }) {
  const svg = useRef(null), dragging = useRef(null), clip = `clip${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const pad = { l: 34, r: 10, t: 10, b: 24 }
  let [x0, x1] = x, [y0, y1] = y
  if (equal) { const sx = (width - pad.l - pad.r) / (x1 - x0), sy = (height - pad.t - pad.b) / (y1 - y0); if (sx > sy) { const c = (x0 + x1) / 2, h = (width - pad.l - pad.r) / sy / 2; x0 = c - h; x1 = c + h } else { const c = (y0 + y1) / 2, h = (height - pad.t - pad.b) / sx / 2; y0 = c - h; y1 = c + h } }
  const X = v => pad.l + (v - x0) / (x1 - x0) * (width - pad.l - pad.r), Y = v => pad.t + (y1 - v) / (y1 - y0) * (height - pad.t - pad.b)
  const inv = (px, py) => [x0 + (px - pad.l) / (width - pad.l - pad.r) * (x1 - x0), y1 - (py - pad.t) / (height - pad.t - pad.b) * (y1 - y0)]
  // About 8 ticks across; down the side, as many as fit about 28 pixels apart, so short graphs stay readable.
  const step = (v, count = 8) => { const raw = v / count, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p; return (m < 2 ? 1 : m < 5 ? 2 : 5) * p }
  const ticks = (a, b, count) => { const s = step(b - a, count), out = []; for (let t = Math.ceil(a / s) * s; t <= b + 1e-9; t += s) out.push(Number(t.toFixed(10))); return out }
  const yCount = Math.max(3, Math.min(8, Math.floor((height - pad.t - pad.b) / 28)))
  // jumps: a step function (floor, mod, an indicator); the line breaks where the value jumps instead of drawing a riser.
  const path = ({ f, from = x0, to = x1, jumps }) => { const n = 240, pts = []; let prev = null, gap = false; for (let i = 0; i <= n; i++) { const t = from + (to - from) * i / n, v = f(t); if (Number.isFinite(v) && v > y0 - 50 * (y1 - y0) && v < y1 + 50 * (y1 - y0)) { const move = !pts.length || gap || (jumps && prev !== null && Math.abs(v - prev) > 0.5); pts.push(`${move ? 'M' : 'L'}${X(t).toFixed(1)},${Y(v).toFixed(1)}`); prev = v; gap = false } else if (pts.length) gap = true } return pts.join(' ') }
  const move = e => {
    if (dragging.current === null || !svg.current) return
    const r = svg.current.getBoundingClientRect(), [wx, wy] = inv((e.clientX - r.left) * width / r.width, (e.clientY - r.top) * height / r.height)
    onDrag?.(dragging.current, Math.max(x0, Math.min(x1, wx)), Math.max(y0, Math.min(y1, wy)))
  }
  const arrowHead = (a, color) => { const dx = X(a.x2) - X(a.x1), dy = Y(a.y2) - Y(a.y1), len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, hx = X(a.x2), hy = Y(a.y2); return <path d={`M${hx},${hy} L${hx - 9 * ux - 4 * uy},${hy - 9 * uy + 4 * ux} L${hx - 9 * ux + 4 * uy},${hy - 9 * uy - 4 * ux} Z`} fill={color} /> }
  return <svg ref={svg} viewBox={`0 0 ${width} ${height}`} className="mm-graph" role="img" aria-label={label}
    onPointerMove={move} onPointerUp={() => { dragging.current = null }} onPointerLeave={() => { dragging.current = null }}>
    <defs><clipPath id={clip}><rect x={pad.l} y={pad.t} width={width - pad.l - pad.r} height={height - pad.t - pad.b} /></clipPath></defs>
    {background?.({ X, Y })}
    {grid && ticks(x0, x1).map(t => <line key={`gx${t}`} x1={X(t)} x2={X(t)} y1={pad.t} y2={height - pad.b} className="mm-grid" />)}
    {grid && ticks(y0, y1, yCount).map(t => <line key={`gy${t}`} y1={Y(t)} y2={Y(t)} x1={pad.l} x2={width - pad.r} className="mm-grid" />)}
    {y0 <= 0 && y1 >= 0 && <line x1={pad.l} x2={width - pad.r} y1={Y(0)} y2={Y(0)} className="mm-axis" />}
    {x0 <= 0 && x1 >= 0 && <line y1={pad.t} y2={height - pad.b} x1={X(0)} x2={X(0)} className="mm-axis" />}
    {ticks(x0, x1).map(t => <text key={`tx${t}`} x={X(t)} y={height - 8} className="mm-tick" textAnchor="middle">{fmt(t, 2)}</text>)}
    {yaxis && ticks(y0, y1, yCount).map(t => <text key={`ty${t}`} x={pad.l - 4} y={Y(t) + 3} className="mm-tick" textAnchor="end">{fmt(t, 2)}</text>)}
    {xlabel && <text x={width - pad.r} y={height - pad.b - 4} className="mm-axislabel" textAnchor="end">{xlabel}</text>}
    {ylabel && <text x={pad.l + 4} y={pad.t + 10} className="mm-axislabel">{ylabel}</text>}
    {regions.map((r, i) => { const from = r.from ?? x0, to = r.to ?? x1, n = 120, pts = [`M${X(from)},${Y(0)}`]; for (let k = 0; k <= n; k++) { const t = from + (to - from) * k / n; pts.push(`L${X(t)},${Y(Math.max(y0, Math.min(y1, r.f(t))))}`) } pts.push(`L${X(to)},${Y(0)} Z`); return <path key={`r${i}`} d={pts.join(' ')} fill={r.color ?? C.teal} opacity={r.opacity ?? 0.18} /> })}
    {rects.map((r, i) => <rect key={`q${i}`} x={X(Math.min(r.x, r.x + r.w))} y={Y(Math.max(r.y, r.y + r.h))} width={Math.abs(X(r.x + r.w) - X(r.x))} height={Math.abs(Y(r.y) - Y(r.y + r.h))} fill={r.color ?? C.orange} opacity={r.opacity ?? 0.3} stroke={r.stroke ?? 'none'} />)}
    <g clipPath={`url(#${clip})`}>{fns.map((g, i) => <g key={`f${i}`}><path d={path(g)} fill="none" stroke={g.color ?? C.teal} strokeWidth={g.width ?? 2.2} strokeDasharray={g.dash ? '6 4' : undefined} />{g.label && <text x={X(g.labelAt ?? (x1 - (x1 - x0) * 0.08))} y={Y(g.f(g.labelAt ?? (x1 - (x1 - x0) * 0.08))) - 6} className="mm-curvelabel" fill={g.color ?? C.teal} textAnchor="end">{g.label}</text>}</g>)}</g>
    <g clipPath={`url(#${clip})`}>{segments.map((s, i) => <line key={`s${i}`} x1={X(s.x1)} y1={Y(s.y1)} x2={X(s.x2)} y2={Y(s.y2)} stroke={s.color ?? C.orange} strokeWidth={s.width ?? 2} strokeDasharray={s.dash ? '5 4' : undefined} />)}</g>
    {arrows.map((a, i) => <g key={`a${i}`}><line x1={X(a.x1)} y1={Y(a.y1)} x2={X(a.x2)} y2={Y(a.y2)} stroke={a.color ?? C.violet} strokeWidth={a.width ?? 2.6} />{arrowHead(a, a.color ?? C.violet)}{a.label && <text x={X(a.x2) + 6} y={Y(a.y2) - 6} className="mm-curvelabel" fill={a.color ?? C.violet}>{a.label}</text>}</g>)}
    {points.map((p, i) => <g key={`p${i}`} onPointerDown={p.drag ? e => { dragging.current = i; e.currentTarget.ownerSVGElement?.setPointerCapture?.(e.pointerId) } : undefined} style={p.drag ? { cursor: 'grab' } : undefined}>
      {p.drag && <circle cx={X(p.x)} cy={Y(p.y)} r="13" fill={p.color ?? C.orange} opacity="0.15" />}
      <circle cx={X(p.x)} cy={Y(p.y)} r={p.r ?? 5} fill={p.color ?? C.orange} stroke="#fff" strokeWidth="1.5" />
      {p.label && <text x={X(p.x) + 8} y={Y(p.y) - 8} className="mm-curvelabel" fill={p.color ?? C.orange}>{p.label}</text>}</g>)}
    {children?.({ X, Y })}
  </svg>
}

export function Slider({ label, value, min, max, step = 0.1, onChange, show = v => fmt(v, 2) }) {
  return <label className="qm-slider">{label} = <b>{show(value)}</b><input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>
}
export function Bars({ rows, digits = 3, max }) {
  const top = max ?? Math.max(1e-9, ...rows.map(r => Math.abs(r.value)))
  return <div className="mm-bars">{rows.map((r, i) => <div key={i} className={`mm-bar-row${r.mark ? ' mark' : ''}`}>
    <span className="mm-bar-label">{r.label}</span>
    <span className="mm-bar-track"><span className={`mm-bar-fill${r.value < 0 ? ' neg' : ''}`} style={{ width: `${Math.min(100, 100 * Math.abs(r.value) / top)}%`, background: r.color }} /></span>
    <span className="mm-bar-value">{fmt(r.value, digits)}</span>
  </div>)}</div>
}
// A worked calculation: rows of [what, how, result].
export function Working({ rows }) {
  return <table className="qm-kv mm-working"><tbody>{rows.map(([what, how, result], i) => <tr key={i}><td>{what}</td><td className="mono">{how}</td><td className="mono"><b>{result}</b></td></tr>)}</tbody></table>
}
