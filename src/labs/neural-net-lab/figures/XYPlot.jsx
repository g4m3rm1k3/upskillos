// Points and curves on x–y axes. curves: [{ f: x => y, color, width, dash, opacity, label }];
// misses: draw each point's error (prediction − truth) as a line, or as a square whose area is the
// squared error, which is what the mean squared error averages.
export default function XYPlot({ points = [], curves = [], x: [x0, x1], y: [y0, y1], misses = null, squares = false, height = 260, width = 460, xLabel = 'x', yLabel = 'y', onClick, marks = [] }) {
  const pad = { l: 38, r: 10, t: 10, b: 26 }
  const X = x => pad.l + (x - x0) / (x1 - x0) * (width - pad.l - pad.r)
  const Y = y => pad.t + (y1 - y) / (y1 - y0) * (height - pad.t - pad.b)
  const ticks = (a, b) => { const step = Math.pow(10, Math.floor(Math.log10((b - a) / 2))); const out = []; for (let t = Math.ceil(a / step) * step; t <= b + 1e-9; t += step) out.push(Number(t.toFixed(6))); return out.length > 8 ? out.filter((_, i) => i % 2 === 0) : out }
  const sample = f => Array.from({ length: 161 }, (_, i) => { const x = x0 + (x1 - x0) * i / 160; return [x, f(x)] }).filter(([, y]) => Number.isFinite(y))
  const click = e => {
    if (!onClick) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width * width, py = (e.clientY - r.top) / r.height * height
    onClick(x0 + (px - pad.l) / (width - pad.l - pad.r) * (x1 - x0), y1 - (py - pad.t) / (height - pad.t - pad.b) * (y1 - y0))
  }
  return <svg viewBox={`0 0 ${width} ${height}`} className="qm-plot nn-xy" role="img" aria-label={`${yLabel} against ${xLabel}`} onClick={click} style={onClick ? { cursor: 'crosshair' } : undefined}>
    <defs><clipPath id="nn-xy-clip"><rect x={pad.l} y={pad.t} width={width - pad.l - pad.r} height={height - pad.t - pad.b} /></clipPath></defs>
    {ticks(x0, x1).map(t => <g key={`x${t}`}><line x1={X(t)} x2={X(t)} y1={pad.t} y2={height - pad.b} stroke="#efe7d8" /><text x={X(t)} y={height - 10} textAnchor="middle" className="qm-tick">{t}</text></g>)}
    {ticks(y0, y1).map(t => <g key={`y${t}`}><line x1={pad.l} x2={width - pad.r} y1={Y(t)} y2={Y(t)} stroke="#efe7d8" /><text x={pad.l - 4} y={Y(t) + 3} textAnchor="end" className="qm-tick">{t}</text></g>)}
    {x0 < 0 && x1 > 0 && <line x1={X(0)} x2={X(0)} y1={pad.t} y2={height - pad.b} stroke="#cfc3ae" />}
    {y0 < 0 && y1 > 0 && <line x1={pad.l} x2={width - pad.r} y1={Y(0)} y2={Y(0)} stroke="#cfc3ae" />}
    <text x={width - pad.r} y={height - 10} textAnchor="end" className="qm-tick" fontStyle="italic">{xLabel} →</text>
    <text x={pad.l + 4} y={pad.t + 10} className="qm-tick" fontStyle="italic">↑ {yLabel}</text>
    <g clipPath="url(#nn-xy-clip)">
      {misses && misses.map(([x, y, yh], i) => squares
        ? <rect key={i} x={Math.min(X(x), X(x) + (Y(y) - Y(yh)))} y={Math.min(Y(y), Y(yh))} width={Math.abs(Y(y) - Y(yh))} height={Math.abs(Y(y) - Y(yh))} fill="#a8402f" opacity=".12" stroke="#a8402f" strokeOpacity=".3" />
        : <line key={i} x1={X(x)} x2={X(x)} y1={Y(y)} y2={Y(yh)} stroke="#a8402f" strokeWidth="1.5" opacity=".7" />)}
      {curves.map((c, i) => <polyline key={i} points={(c.pts ?? sample(c.f)).map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')} fill="none" stroke={c.color ?? '#1f6f68'} strokeWidth={c.width ?? 2.2} strokeDasharray={c.dash} opacity={c.opacity ?? 1} />)}
      {points.map(([x, y, color], i) => <circle key={i} cx={X(x)} cy={Y(y)} r="3.6" fill={color ?? '#b5650d'} />)}
      {marks.map(([x, y, label], i) => <g key={i}><circle cx={X(x)} cy={Y(y)} r="6" fill="none" stroke="#2c241b" strokeWidth="2" />{label && <text x={X(x) + 8} y={Y(y) - 8} className="qm-tick">{label}</text>}</g>)}
    </g>
  </svg>
}
