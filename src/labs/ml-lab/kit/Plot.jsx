import React from 'react'

// A tiny SVG coordinate system. Children receive the scale functions so every
// lab draws in data units: <Plot x={[0,1]} y={[0,1]}>{({X,Y}) => ...}</Plot>
export function Plot({ x, y, width = 560, height = 320, xLabel, yLabel, label, xTicks: xt = 5, yTicks: yt = 5, grid = true, children, tickFormat, xFormat, yFormat }) {
  const xTicks = Math.max(2, xt), yTicks = Math.max(2, yt)
  const left = 54, right = width - 22, top = 18, bottom = height - 42
  const [x0, x1] = x[0] === x[1] ? [x[0] - 1, x[1] + 1] : x
  const [y0, y1] = y[0] === y[1] ? [y[0] - 1, y[1] + 1] : y
  const X = v => left + (v - x0) / (x1 - x0) * (right - left)
  const Y = v => bottom - (v - y0) / (y1 - y0) * (bottom - top)
  const fx = xFormat || tickFormat || defaultTick, fy = yFormat || tickFormat || defaultTick
  const clip = React.useId().replace(/:/g, '')
  return <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
    <defs><clipPath id={clip}><rect x={left} y={top} width={right - left} height={bottom - top} /></clipPath></defs>
    {grid && Array.from({ length: yTicks }, (_, i) => { const v = y0 + (y1 - y0) * i / (yTicks - 1); return <g key={`y${i}`}><line x1={left} x2={right} y1={Y(v)} y2={Y(v)} stroke="var(--border)" /><text x={left - 7} y={Y(v) + 4} textAnchor="end">{fy(v)}</text></g> })}
    {grid && Array.from({ length: xTicks }, (_, i) => { const v = x0 + (x1 - x0) * i / (xTicks - 1); return <text key={`x${i}`} x={X(v)} y={bottom + 16} textAnchor="middle">{fx(v)}</text> })}
    <g clipPath={`url(#${clip})`}>{children({ X, Y, x0, x1, y0, y1, left, right, top, bottom })}</g>
    {xLabel && <text x={(left + right) / 2} y={height - 6} textAnchor="middle">{xLabel}</text>}
    {yLabel && <text x={14} y={(top + bottom) / 2} transform={`rotate(-90 14 ${(top + bottom) / 2})`} textAnchor="middle">{yLabel}</text>}
  </svg>
}

export function defaultTick(v) {
  const a = Math.abs(v)
  if (a >= 1e6) return v.toExponential(1)
  if (a >= 1000) return `${Number((v / 1000).toPrecision(3))}k`
  if (a > 0 && a < 1e-3) return v.toExponential(0)
  return Number(v.toPrecision(3)).toString()
}

export const extent = (values, pad = 0.1) => {
  const finite = values.filter(Number.isFinite)
  const lo = Math.min(...finite), hi = Math.max(...finite), d = Math.max(hi - lo, 1e-9) * pad
  return [lo - d, hi + d]
}

// Polyline through [x, y] pairs in data units.
export function Path({ X, Y, points, stroke = 'var(--chart-model)', width = 2.5, dash, opacity }) {
  const d = points.filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b)).map(([a, b], i) => `${i ? 'L' : 'M'} ${X(a).toFixed(2)} ${Y(b).toFixed(2)}`).join(' ')
  return <path d={d} fill="none" stroke={stroke} strokeWidth={width} strokeDasharray={dash} opacity={opacity} />
}

// Classification points: class 0 as circles (blue), class 1 as diamonds (orange).
export function ClassDots({ X, Y, points, highlight, r = 4 }) {
  return points.map((p, i) => {
    const cls = p.label ?? p.y, strong = highlight?.has?.(i)
    const stroke = strong ? 'var(--text)' : 'none'
    return cls ? <path key={i} d={`M ${X(p.x1)} ${Y(p.x2) - r - 1} l ${r + 1} ${r + 1} l ${-r - 1} ${r + 1} l ${-r - 1} ${-r - 1} Z`} fill="var(--chart-val)" stroke={stroke} strokeWidth="2"><title>{`class 1 · (${p.x1.toFixed(2)}, ${p.x2.toFixed(2)})`}</title></path>
      : <circle key={i} cx={X(p.x1)} cy={Y(p.x2)} r={r} fill="var(--chart-train)" stroke={stroke} strokeWidth="2"><title>{`class 0 · (${p.x1.toFixed(2)}, ${p.x2.toFixed(2)})`}</title></circle>
  })
}

// Shade a 2D region by a probability-of-class-1 function p(x1, x2).
export function ProbabilityField({ X, Y, x0, x1, y0, y1, p, cells = 36 }) {
  const rows = Math.round(cells * 0.6), out = []
  const w = (x1 - x0) / cells, h = (y1 - y0) / rows
  for (let i = 0; i < cells; i++) for (let j = 0; j < rows; j++) {
    const cx = x0 + (i + 0.5) * w, cy = y0 + (j + 0.5) * h, v = p(cx, cy)
    if (!Number.isFinite(v)) continue
    out.push(<rect key={`${i}-${j}`} x={X(x0 + i * w)} y={Y(y0 + (j + 1) * h)} width={X(x0 + w) - X(x0) + 0.6} height={Y(y0) - Y(y0 + h) + 0.6}
      fill={v >= 0.5 ? 'var(--chart-val)' : 'var(--chart-train)'} opacity={0.06 + 0.3 * Math.abs(v - 0.5) * 2} />)
  }
  return out
}

// A labeled grid of numbers (heatmap), e.g. confusion or attention matrices.
export function Heatmap({ matrix, rowLabels, colLabels, max, label, digits = 2, cell = 44 }) {
  const top = colLabels ? 28 : 6, left = rowLabels ? 70 : 6
  const m = max ?? Math.max(1e-9, ...matrix.flat().map(Math.abs))
  const width = left + cell * matrix[0].length + 6, height = top + cell * matrix.length + 6
  return <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} style={{ maxWidth: width * 1.4 }}>
    {colLabels?.map((c, j) => <text key={j} x={left + cell * j + cell / 2} y={top - 8} textAnchor="middle">{c}</text>)}
    {matrix.map((row, i) => <g key={i}>
      {rowLabels && <text x={left - 6} y={top + cell * i + cell / 2 + 4} textAnchor="end">{rowLabels[i]}</text>}
      {row.map((v, j) => <g key={j}>
        <rect x={left + cell * j} y={top + cell * i} width={cell - 2} height={cell - 2} rx="4" fill={v < 0 ? 'var(--chart-val)' : 'var(--accent)'} opacity={0.08 + 0.75 * Math.abs(v) / m} />
        <text x={left + cell * j + cell / 2 - 1} y={top + cell * i + cell / 2 + 3} textAnchor="middle" style={{ fill: 'var(--text)' }}>{Number.isInteger(v) ? v : v.toFixed(digits)}</text>
      </g>)}
    </g>)}
  </svg>
}

// Horizontal bars with labels, for contributions, importances and probabilities.
export function Bars({ items, label, max, format = v => v.toFixed(3), width = 560 }) {
  const m = max ?? Math.max(1e-9, ...items.map(i => Math.abs(i.value)))
  const row = 22, left = 150, right = width - 70, zero = items.some(i => i.value < 0) ? (left + right) / 2 : left
  const scale = (right - (zero === left ? left : zero)) / m
  return <svg viewBox={`0 0 ${width} ${items.length * row + 10}`} role="img" aria-label={label}>
    {zero !== left && <line x1={zero} x2={zero} y1="0" y2={items.length * row + 6} stroke="var(--border)" />}
    {items.map((item, i) => <g key={item.label + i}>
      <text x={left - 8} y={i * row + 17} textAnchor="end">{item.label}</text>
      <rect x={item.value < 0 ? zero + item.value * scale : zero} y={i * row + 5} width={Math.abs(item.value) * scale} height={row - 8} rx="3" fill={item.color || (item.value < 0 ? 'var(--chart-val)' : 'var(--accent)')} opacity="0.85" />
      <text x={right + 6} y={i * row + 17}>{format(item.value)}</text>
    </g>)}
  </svg>
}

// Expand ranges so one data unit has the same length on both axes. Needed
// whenever geometry (angles, circles, ellipses) must be read off the plot.
export function equalAspect(xr, yr, width = 560, height = 320) {
  const pw = width - 76, ph = height - 60
  const sx = (xr[1] - xr[0]) / pw, sy = (yr[1] - yr[0]) / ph, s = Math.max(sx, sy)
  const cx = (xr[0] + xr[1]) / 2, cy = (yr[0] + yr[1]) / 2
  return [[cx - s * pw / 2, cx + s * pw / 2], [cy - s * ph / 2, cy + s * ph / 2]]
}

// Level set f(x, y) = level via marching squares: straight segments across
// each grid cell whose corners straddle the level. Used for decision boundaries.
export function contourSegments(f, [x0, x1], [y0, y1], level = 0, cells = 70) {
  const rows = Math.round(cells * 0.6), dx = (x1 - x0) / cells, dy = (y1 - y0) / rows, segs = []
  const v = Array.from({ length: cells + 1 }, (_, i) => Array.from({ length: rows + 1 }, (_, j) => f(x0 + i * dx, y0 + j * dy) - level))
  const cross = (xa, ya, va, xb, yb, vb) => { const t = va / (va - vb); return [xa + t * (xb - xa), ya + t * (yb - ya)] }
  for (let i = 0; i < cells; i++) for (let j = 0; j < rows; j++) {
    const xa = x0 + i * dx, ya = y0 + j * dy, xb = xa + dx, yb = ya + dy
    const a = v[i][j], b = v[i + 1][j], c = v[i + 1][j + 1], d = v[i][j + 1], pts = []
    if (![a, b, c, d].every(Number.isFinite)) continue
    if ((a < 0) !== (b < 0)) pts.push(cross(xa, ya, a, xb, ya, b))
    if ((b < 0) !== (c < 0)) pts.push(cross(xb, ya, b, xb, yb, c))
    if ((c < 0) !== (d < 0)) pts.push(cross(xb, yb, c, xa, yb, d))
    if ((d < 0) !== (a < 0)) pts.push(cross(xa, yb, d, xa, ya, a))
    for (let k = 0; k + 1 < pts.length; k += 2) segs.push([pts[k], pts[k + 1]])
  }
  return segs
}
export function Contour({ X, Y, x0, x1, y0, y1, f, level = 0, stroke = 'var(--text)', width = 2, dash, cells }) {
  const segs = contourSegments(f, [x0, x1], [y0, y1], level, cells)
  return <path d={segs.map(([p, q]) => `M ${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)} L ${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join(' ')} stroke={stroke} strokeWidth={width} strokeDasharray={dash} fill="none" strokeLinecap="round" />
}
