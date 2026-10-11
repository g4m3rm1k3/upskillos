import { MAPS } from '../engine/maps.js'

// Numbers as Python would print them, short: integers plain, others to at most 4 decimals.
export const num = x => x == null ? '—' : typeof x !== 'number' ? String(x) : Number.isInteger(x) ? String(x) : String(Number(x.toFixed(4)))
// A JS value written the way Python writes it.
export const py = v => v === true ? 'True' : v === false ? 'False' : v == null ? 'None' : typeof v === 'string' ? `'${v}'` : num(v)

export function MapPicker({ value, onChange, maps = Object.keys(MAPS) }) {
  return <label>Map <select value={value} onChange={e => onChange(e.target.value)}>{maps.map(m => <option key={m} value={m}>{MAPS[m].title}</option>)}</select></label>
}

export function Slider({ label, value, min, max, step, onChange, format = v => v }) {
  return <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>
}
