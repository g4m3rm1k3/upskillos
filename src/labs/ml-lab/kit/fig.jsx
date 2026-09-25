// Building blocks for the small figures placed between lesson paragraphs (LessonFlow).
// Each figure shows one idea, uses the lesson's own numbers, and states its result in text.
import React from 'react'
import { Plot, Path, ProbabilityField, ClassDots, Contour } from './Plot.jsx'

export { Plot, Path, ProbabilityField, ClassDots, Contour }
export const r = (v, d = 3) => (Number.isFinite(v) ? Number(v.toFixed(d)).toString() : '—')

export function Controls({ children }) { return <div className="ml-fig-controls">{children}</div> }
export function Slider({ label, value, min, max, step = 0.01, onChange, digits = 2, unit = '' }) {
  return <label>{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} aria-label={label} /> <strong>{r(value, digits)}</strong>{unit}</label>
}
export function Choice({ label, value, options, onChange }) {
  return <label>{label} <select value={value} onChange={e => onChange(e.target.value)} aria-label={label}>{options.map(o => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>)}</select></label>
}
export function Check({ label, checked, onChange }) { return <label><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /> {label}</label> }
export function Radio({ name, value, options, onChange }) {
  return <>{options.map(([v, l]) => <label key={v}><input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} /> {l}</label>)}</>
}
export function Readout({ children }) { return <p className="ml-fig-sum">{children}</p> }
export function Note({ children }) { return <p className="ml-caption">{children}</p> }

// Vertical bars with value labels: items [{ label, value, color?, highlight? }].
export function Bars({ items, max, min = 0, height = 130, label, digits = 3, width = 460 }) {
  const hi = max ?? Math.max(...items.map(i => i.value), 1e-9), lo = Math.min(min, ...items.map(i => i.value))
  // 18 px above the tallest bar for its value label, 24 px below the axis for the category labels.
  const n = items.length, slot = (width - 20) / n, bw = Math.min(56, slot * 0.7), zero = 18 + (height - 42) * (hi / (hi - lo || 1))
  const scale = (height - 42) / (hi - lo || 1)
  return <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label ?? items.map(i => `${i.label} ${r(i.value, digits)}`).join(', ')}>
    <line x1={10} x2={width - 10} y1={zero} y2={zero} stroke="var(--border)" />
    {items.map((it, k) => { const x = 10 + k * slot + (slot - bw) / 2, h = Math.abs(it.value) * scale, y = it.value >= 0 ? zero - h : zero
      return <g key={k}>
        <rect x={x} y={y} width={bw} height={Math.max(0.5, h)} fill={it.color ?? (it.highlight ? 'var(--chart-model)' : 'var(--chart-train)')} opacity={it.dim ? 0.35 : 0.85} rx="2" />
        <text x={x + bw / 2} y={it.value >= 0 ? y - 3 : y + h + 11} textAnchor="middle" style={{ fontSize: 10.5, fill: 'var(--text)' }}>{r(it.value, digits)}</text>
        <text x={x + bw / 2} y={height - 6} textAnchor="middle" style={{ fontSize: 10.5, fill: 'var(--text)' }}>{it.label}</text>
      </g> })}
  </svg>
}

// A compact plot for inline figures.
export function MiniPlot(props) { return <Plot width={460} height={230} {...props} /> }
export const Dots = ({ X, Y, points, color = 'var(--chart-train)', rad = 3.5, opacity = 0.85 }) => points.map((p, i) => <circle key={i} cx={X(p[0])} cy={Y(p[1])} r={p[2] ?? rad} fill={p[3] ?? color} opacity={opacity} />)
export const VLine = ({ X, Y, x, y0, y1, color = 'var(--text)', dash = '4 3' }) => <line x1={X(x)} x2={X(x)} y1={Y(y0)} y2={Y(y1)} stroke={color} strokeDasharray={dash} />
export const HLine = ({ X, Y, y, x0, x1, color = 'var(--text)', dash = '4 3' }) => <line x1={X(x0)} x2={X(x1)} y1={Y(y)} y2={Y(y)} stroke={color} strokeDasharray={dash} />
export const Label = ({ X, Y, x, y, children, anchor = 'start', color = 'var(--text)', size = 11 }) => <text x={X(x)} y={Y(y)} textAnchor={anchor} style={{ fontSize: size, fill: color }}>{children}</text>
export const curve = (f, a, b, n = 160) => Array.from({ length: n + 1 }, (_, i) => { const x = a + (b - a) * i / n; return [x, f(x)] })

// A small table: head [..], rows [[..]], active row index.
export function Table({ head, rows, active, label }) {
  return <table className="ml-fig-table" aria-label={label}>
    {head && <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>}
    <tbody>{rows.map((row, i) => <tr key={i} className={i === active ? 'active' : ''}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
  </table>
}

// Step through a sequence: returns [k, controls].
export function useStepper(n, start = 0) {
  const [k, setK] = React.useState(start)
  const controls = <>
    <button onClick={() => setK(v => Math.min(n, v + 1))} disabled={k >= n}>Next step</button>
    <button onClick={() => setK(n)} disabled={k >= n}>All steps</button>
    <button onClick={() => setK(start)}>Reset</button>
  </>
  return [k, controls, setK]
}
