import React from 'react'
import LessonText from '../LessonText.jsx'

export function PanelHeading({ eyebrow = 'Live experiment', title, pill }) {
  return <div className="ml-panel-heading"><div><span className="ml-eyebrow">{eyebrow}</span><h2>{title}</h2></div>{pill && <span className="ml-pill">{pill}</span>}</div>
}
export function Slider({ label, value, min, max, step = 1, onChange, format = v => v }) {
  return <label>{label}: {format(value)}<input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>
}
export function Choice({ label, value, options, onChange }) {
  return <label>{label}<select value={value} onChange={e => onChange(e.target.value)}>{options.map(o => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>)}</select></label>
}
export function Toggle({ label, checked, onChange }) {
  return <label className="ml-toggle"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /> {label}</label>
}
export function Controls({ children, columns }) {
  return <div className="ml-controls" style={columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}>{children}</div>
}
export function Metrics({ items }) {
  return <div className="ml-metrics" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)` }}>{items.map(([label, value, hint]) => <div key={label} title={hint}><small>{label}</small><strong>{value}</strong></div>)}</div>
}
export function Actions({ children }) { return <div className="ml-actions">{children}</div> }
export function Caption({ children }) { const text = asText(children); return <p className="ml-caption">{text !== null ? <LessonText>{text}</LessonText> : children}</p> }
export function Legend({ items }) {
  return <div className="ml-legend ml-legend-custom">{items.map(([mark, text, color]) => <span key={text} style={{ color }}>{mark} {text}</span>)}</div>
}
// Plain text (including text mixed with interpolated numbers) is rendered as Markdown.
const asText = children => typeof children === 'string' ? children : Array.isArray(children) && children.every(c => typeof c === 'string' || typeof c === 'number') ? children.join('') : null
export function Insight({ title = 'What to notice', children }) {
  const text = asText(children)
  return <div className="ml-update"><h3>{title}</h3>{text !== null ? <p><LessonText>{text}</LessonText></p> : children}</div>
}
export function Warning({ children }) { return <p className="ml-warning" role="status">{children}</p> }
export function Table({ head, rows, caption }) {
  return <div className="ml-table-scroll"><table><thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>{caption && <p className="ml-caption">{caption}</p>}</div>
}
// Advance/animate an iterative algorithm at a fixed cadence.
export function useTicker(running, tick, ms = 80) {
  const ref = React.useRef(tick)
  ref.current = tick
  React.useEffect(() => {
    if (!running) return
    const id = setInterval(() => ref.current(), ms)
    return () => clearInterval(id)
  }, [running, ms])
}
