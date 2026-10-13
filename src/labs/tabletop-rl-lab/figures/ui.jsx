// Small pieces shared by the figures: a die drawn with pips, a row of dice, a box picker, and a
// list of labelled bars.
import { BOXES } from '../engine/dice.js'

const PIPS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] }
export function Die({ value, size = 34, kept = false, dim = false, onClick, label }) {
  const pip = size / 9, at = i => size * (0.24 + i * 0.26)
  const body = <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className={`tt-die${kept ? ' kept' : ''}${dim ? ' dim' : ''}`}>
    <rect x="1.5" y="1.5" width={size - 3} height={size - 3} rx={size / 6} />
    {(PIPS[value] ?? []).map(([x, y], i) => <circle key={i} cx={at(x)} cy={at(y)} r={pip} />)}
  </svg>
  return onClick ? <button type="button" className="tt-die-button" aria-pressed={kept} aria-label={label ?? `Die showing ${value}${kept ? ', kept' : ''}`} onClick={onClick}>{body}</button> : <span className="tt-die-wrap" aria-label={label ?? `${value}`}>{body}</span>
}
export function DiceRow({ dice, kept = [], onDie, size }) {
  return <span className="tt-dice-row">{dice.map((d, i) => <Die key={i} value={d} size={size} kept={kept.includes(i)} onClick={onDie ? () => onDie(i) : undefined} />)}</span>
}
// Click a die to change its face (1 → 2 → … → 6 → 1).
export function HandEditor({ hand, onChange }) {
  return <span className="tt-dice-row">{hand.map((d, i) => <Die key={i} value={d} label={`Die ${i + 1}: ${d}. Click to change`} onClick={() => onChange(hand.map((x, j) => j === i ? x % 6 + 1 : x))} />)}</span>
}
export function BoxPicker({ value, onChange, boxes = BOXES.map((_, i) => i), label = 'Box' }) {
  return <label>{label} <select value={value} onChange={e => onChange(Number(e.target.value))}>{boxes.map(b => <option key={b} value={b}>{BOXES[b]}</option>)}</select></label>
}
export function Slider({ label, value, min, max, step, onChange, show = v => v }) {
  return <label className="qm-slider">{label} = <b>{show(value)}</b><input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>
}
// rows: [{ label, value, mark?, note? }]: horizontal bars scaled to the largest |value|.
export function Bars({ rows, digits = 3, max }) {
  const top = max ?? Math.max(1e-9, ...rows.map(r => Math.abs(r.value)))
  return <div className="tt-bars">{rows.map((r, i) => <div key={i} className={`tt-bar-row${r.mark ? ' mark' : ''}`}>
    <span className="tt-bar-label">{r.label}</span>
    <span className="tt-bar-track"><span className={`tt-bar-fill${r.value < 0 ? ' neg' : ''}`} style={{ width: `${Math.min(100, 100 * Math.abs(r.value) / top)}%`, background: r.color }} /></span>
    <span className="tt-bar-value">{Number.isFinite(r.value) ? r.value.toFixed(digits) : '—'}{r.note ? <small> {r.note}</small> : null}</span>
  </div>)}</div>
}
export const tuple = xs => `(${xs.join(', ')}${xs.length === 1 ? ',' : ''})`
export const fmt = (x, d = 4) => Number.isInteger(x) ? String(x) : x.toFixed(d)
