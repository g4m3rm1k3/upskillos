// A line chart: one or more series (a point per x = 1, 2, …), each with an optional moving average,
// reference lines, and what x counts (games, steps, updates …).
export default function Plot({ series, window = 20, refs = [], height = 170, label = 'chart', x = 'game', from = 1 }) {
  const W = 460, H = height, pad = { l: 42, r: 10, t: 10, b: 22 }
  const all = series.flatMap(s => s.values).concat(refs.map(r => r.value)).filter(Number.isFinite)
  if (!all.length) return <svg viewBox={`0 0 ${W} ${H}`} className="qm-plot"><text x={W / 2} y={H / 2} className="qm-tick" textAnchor="middle">Nothing yet</text></svg>
  let lo = Math.min(0, ...all), hi = Math.max(...all)
  if (hi - lo < 1e-9) { lo -= 1; hi += 1 }
  const n = Math.max(2, ...series.map(s => s.values.length))
  const X = i => pad.l + i / (n - 1) * (W - pad.l - pad.r), Y = v => pad.t + (hi - v) / (hi - lo) * (H - pad.t - pad.b)
  const avg = v => v.map((_, i) => { const a = v.slice(Math.max(0, i - window + 1), i + 1); return a.reduce((p, q) => p + q, 0) / a.length })
  const ticks = [lo, (lo + hi) / 2, hi]
  return <svg viewBox={`0 0 ${W} ${H}`} className="qm-plot" role="img" aria-label={label}>
    {ticks.map((t, i) => <g key={i}><line x1={pad.l} x2={W - pad.r} y1={Y(t)} y2={Y(t)} stroke="#eee5d6" /><text x={pad.l - 4} y={Y(t) + 3} className="qm-tick" textAnchor="end">{Math.abs(t) >= 10 ? t.toFixed(0) : t.toFixed(2)}</text></g>)}
    <text x={pad.l} y={H - 6} className="qm-tick">{x} {from}</text><text x={W - pad.r} y={H - 6} className="qm-tick" textAnchor="end">{n - 1 + from}</text>
    {refs.map((r, i) => <g key={`r${i}`}><line x1={pad.l} x2={W - pad.r} y1={Y(r.value)} y2={Y(r.value)} stroke={r.color ?? '#7a3fb0'} strokeDasharray="5 4" /><text x={W - pad.r - 2} y={Y(r.value) - 3} className="qm-tick" textAnchor="end" fill={r.color ?? '#7a3fb0'}>{r.label}</text></g>)}
    {series.map((s, k) => <g key={k}>
      {window > 1 && s.values.length < 600 && <polyline points={s.values.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} fill="none" stroke={s.color} strokeOpacity={0.25} strokeWidth={1} />}
      <polyline points={(window > 1 ? avg(s.values) : s.values).map((v, i) => `${X(i)},${Y(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2.2} />
      {s.label && <text x={X(s.values.length - 1) - 2} y={Y((window > 1 ? avg(s.values) : s.values).at(-1)) - 4} className="qm-tick" textAnchor="end" fill={s.color}>{s.label}</text>}
    </g>)}
  </svg>
}
