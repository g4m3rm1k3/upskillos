// Pieces shared by the figures: a top-down view of the road around the kart, a slider, labelled bars
// and a lap stepper.
import { SUNLIT, barriers, sweepers, ACTIONS } from '../engine/kart.js'

export const COLORS = { you: '#1f6f68', kart: '#5b4bb5', barrier: '#d9822b', sweeper: '#e3b505', race: ['#159a87', '#e86e55', '#9675d0'] }

// The road from sector `from` for `span` sectors: lanes top (0) to bottom (2). `karts` are extra
// karts to draw ({ p, lane, color, label }); `planned` an arrow for the planned move.
export function RoadView({ track = SUNLIT, state, cars = [], karts = [], tick = state?.ticks ?? 0, from, span = 16, planned, width = 460, label = 'The road ahead' }) {
  const start = from ?? Math.max(0, (state?.p ?? 0) - 2), cell = width / span, lane = 22, H = lane * 3 + 18
  const X = p => ((((p - start) % track.length) + track.length) % track.length) * cell, Y = l => 9 + l * lane + lane / 2
  const visible = p => ((((p - start) % track.length) + track.length) % track.length) < span
  return <svg viewBox={`0 0 ${width} ${H}`} className="kl-road-svg" role="img" aria-label={label}>
    {[0, 1, 2].map(l => <rect key={l} x="0" y={9 + l * lane} width={width} height={lane} className={`kl-lane-${l % 2}`} />)}
    {Array.from({ length: span + 1 }, (_, i) => <g key={i}><line x1={i * cell} x2={i * cell} y1="9" y2={9 + 3 * lane} className="kl-tickline" />{(start + i) % 4 === 0 && <text x={i * cell + 2} y="7" className="qm-tick">{(start + i) % track.length}</text>}</g>)}
    {barriers(track).filter(b => visible(b.p)).map((b, i) => <rect key={`b${i}`} x={X(b.p) + 1} y={Y(b.lane) - 8} width={cell - 2} height="16" rx="3" fill={COLORS.barrier}><title>barrier at sector {b.p}, lane {b.lane}</title></rect>)}
    {sweepers(tick, track).filter(s => visible(s.p)).map((s, i) => <g key={`s${i}`}><rect x={X(s.p) + 1} y={Y(s.lane) - 9} width={cell - 2} height="18" rx="3" fill={COLORS.sweeper} stroke="#7a5d00" strokeDasharray="3 2" /><title>sweeper at sector {s.p}, lane {s.lane.toFixed(2)}</title></g>)}
    {cars.filter(c => visible(c.p)).map((c, i) => <rect key={`c${i}`} x={X(c.p) + 2} y={Y(c.lane) - 6} width={cell - 4} height="12" rx="4" fill={COLORS.kart} opacity="0.85"><title>kart at sector {c.p}</title></rect>)}
    {karts.filter(k => visible(k.p)).map((k, i) => <g key={`k${i}`}><rect x={X(k.p) + 2} y={Y(k.lane) - 7} width={cell - 4} height="14" rx="4" fill={k.color} /><text x={X(k.p) + cell / 2} y={Y(k.lane) + 4} textAnchor="middle" className="kl-kart-label">{k.label}</text></g>)}
    {planned && <line x1={X(planned.p) + cell / 2} y1={Y(planned.lane)} x2={X(planned.nextP) + cell / 2} y2={Y(planned.nextLane)} stroke="#222" strokeWidth="2" markerEnd="url(#kl-arrow)" />}
    {state && visible(state.p) && <g><rect x={X(state.p) + 2} y={Y(state.lane) - 7} width={cell - 4} height="14" rx="4" fill={COLORS.you} /><text x={X(state.p) + cell / 2} y={Y(state.lane) + 4} textAnchor="middle" className="kl-kart-label">▶</text></g>}
    <defs><marker id="kl-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#222" /></marker></defs>
  </svg>
}

export function Slider({ label, value, min, max, step = 1, onChange, show = v => v }) {
  return <label className="qm-slider">{label} = <b>{show(value)}</b><input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>
}
export function Bars({ rows, digits = 2, max }) {
  const top = max ?? Math.max(1e-9, ...rows.map(r => Math.abs(r.value)))
  return <div className="kl-bars">{rows.map((r, i) => <div key={i} className={`kl-bar-row${r.mark ? ' mark' : ''}`}>
    <span className="kl-bar-label">{r.label}</span>
    <span className="kl-bar-track"><span className={`kl-bar-fill${r.value < 0 ? ' neg' : ''}`} style={{ width: `${Math.min(100, 100 * Math.abs(r.value) / top)}%` }} /></span>
    <span className="kl-bar-value">{Number.isFinite(r.value) ? r.value.toFixed(digits) : '—'}</span>
  </div>)}</div>
}
export const ActionBars = ({ values, chosen }) => <Bars rows={ACTIONS.map((a, i) => ({ label: a, value: values[i], mark: i === chosen }))} />
export const pct = x => `${(100 * x).toFixed(1)}%`
export const fmt = (x, d = 3) => Number.isInteger(x) ? String(x) : Number(x).toFixed(d)
