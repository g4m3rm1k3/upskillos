// Drawing parts shared by every playground experiment.
// Colours always mean the same thing: red = first column / e₁, green = second column / e₂,
// gold = the input vector, violet = the result, blue = a direction, pink = residual or error.
import { useId } from 'react'
import { CodeView } from '../code.jsx'

export const fmt = value => (Math.abs(value) < 0.005 ? 0 : value).toFixed(2)
export const W = 480, H = 360, S = 40, OX = W / 2, OY = H / 2
export const toSvg = ([x, y], scale = S) => [OX + scale * x, OY - scale * y]
export const snap = value => Math.round(value * 10) / 10
export const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value))
export const vec = v => `[${v.map(fmt).join('; ')}]`

export function Slider({ label, value, onChange, min = -3, max = 3, step = 0.1, tone }) {
  const id = useId()
  return <div className="la-slider" style={tone ? { '--tone': `var(--c-${tone})` } : undefined}>
    <span className="la-slider-heading"><label htmlFor={id}>{label}</label><output htmlFor={id}>{fmt(value)}</output></span>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} />
  </div>
}

// Labels sit past the tip (clear of its drag handle), or beside the middle of the arrow when two arrows share a tip.
function labelAt(x1, y1, x2, y2, angle, mid) {
  const [x, y] = mid ? [(x1 + x2) / 2 - 14 * Math.sin(angle), (y1 + y2) / 2 + 14 * Math.cos(angle)] : [x2 + 22 * Math.cos(angle), y2 + 22 * Math.sin(angle)]
  return { x, y: y + 4, textAnchor: Math.abs(Math.cos(angle)) < 0.35 ? 'middle' : (Math.cos(angle) > 0) !== mid ? 'start' : 'end' }
}

export function Arrow({ from = [0, 0], to, tone, label, dashed, width = 3, mid = false, scale = S }) {
  const [x1, y1] = toSvg(from, scale), [x2, y2] = toSvg(to, scale)
  return <ScreenArrow x1={x1} y1={y1} x2={x2} y2={y2} tone={tone} label={label} dashed={dashed} width={width} mid={mid} />
}

export function ScreenArrow({ x1, y1, x2, y2, tone, label, dashed, width = 3, mid = false }) {
  const length = Math.hypot(x2 - x1, y2 - y1)
  if (length < 1) return null
  const angle = Math.atan2(y2 - y1, x2 - x1), head = Math.min(11, length * 0.5)
  const wing = offset => `${x2 - head * Math.cos(angle + offset)},${y2 - head * Math.sin(angle + offset)}`
  return <g className="la-arrow" style={{ '--tone': `var(--c-${tone})` }}>
    <line x1={x1} y1={y1} x2={x2 - 4 * Math.cos(angle)} y2={y2 - 4 * Math.sin(angle)} strokeWidth={width} strokeDasharray={dashed ? '6 5' : undefined} />
    <polygon points={`${wing(0.42)} ${x2},${y2} ${wing(-0.42)}`} />
    {label && <text {...labelAt(x1, y1, x2, y2, angle, mid)} className="la-arrow-label">{label}</text>}
  </g>
}

// Converts a pointer event to plane coordinates.
export function planePoint(svg, event, scale = S) {
  if (!svg?.getScreenCTM) return null
  const point = svg.createSVGPoint()
  point.x = event.clientX; point.y = event.clientY
  const p = point.matrixTransform(svg.getScreenCTM().inverse())
  return [(p.x - OX) / scale, (OY - p.y) / scale]
}

// A draggable, keyboard-movable handle at a point of the plane.
export function Handle({ at, onMove, tone, name, plane, scale = S, limit = [5.5, 4.2], r = 9 }) {
  const move = p => onMove([clamp(snap(p[0]), limit[0]), clamp(snap(p[1]), limit[1])])
  const [cx, cy] = toSvg(at, scale)
  return <circle className="la-handle" style={{ '--tone': `var(--c-${tone})` }} cx={cx} cy={cy} r={r} tabIndex={0} role="slider"
    aria-label={`Drag ${name}`} aria-valuetext={`${name} = ${vec(at)}`}
    onPointerDown={event => { event.currentTarget.setPointerCapture?.(event.pointerId); event.preventDefault() }}
    onPointerMove={event => { if (event.currentTarget.hasPointerCapture?.(event.pointerId)) { const p = planePoint(plane.current, event, scale); if (p) move(p) } }}
    onKeyDown={event => {
      const step = event.shiftKey ? 1 : 0.1
      const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[event.key]
      if (!delta) return
      event.preventDefault(); move([at[0] + delta[0], at[1] + delta[1]])
    }} />
}

// The plane draws a grid; given a matrix it draws the grid's image too, so the warp is visible.
export function Plane({ label, matrix, children, plane, scale = S, grid = true }) {
  const n = Math.ceil(W / 2 / scale) + 1
  const ticks = Array.from({ length: 2 * n + 1 }, (_, i) => i - n)
  const image = matrix && (([x, y]) => [matrix[0][0] * x + matrix[0][1] * y, matrix[1][0] * x + matrix[1][1] * y])
  const line = (a, b, key, cls) => { const [x1, y1] = toSvg(a, scale), [x2, y2] = toSvg(b, scale); return <line key={key} className={cls} x1={x1} y1={y1} x2={x2} y2={y2} /> }
  const clip = useId().replace(/:/g, '')
  return <svg ref={plane} className="la-plane" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
    <defs><clipPath id={clip}><rect width={W} height={H} rx="14" /></clipPath></defs>
    <g clipPath={`url(#${clip})`}>
      <rect width={W} height={H} className="la-plane-bg" />
      {grid && ticks.map(k => <g key={k}>{line([k, -n], [k, n], 'v', 'la-grid')}{line([-n, k], [n, k], 'h', 'la-grid')}</g>)}
      {image && ticks.map(k => <g key={`w${k}`}>{line(image([k, -2 * n]), image([k, 2 * n]), 'v', k ? 'la-warp' : 'la-warp la-warp-axis')}{line(image([-2 * n, k]), image([2 * n, k]), 'h', k ? 'la-warp' : 'la-warp la-warp-axis')}</g>)}
      {line([-n, 0], [n, 0], 'x', 'la-axis')}{line([0, -n], [0, n], 'y', 'la-axis')}
      {children}
    </g>
  </svg>
}

export const quad = (points, scale = S) => points.map(p => toSvg(p, scale).join(',')).join(' ')

// The line a·x + b·y = c, clipped to a generous box, as two plane points (or null when a = b = 0).
export function lineThrough(a, b, c, reach = 12) {
  if (Math.abs(b) > 1e-9) return [[-reach, (c + a * reach) / b], [reach, (c - a * reach) / b]]
  if (Math.abs(a) > 1e-9) return [[c / a, -reach], [c / a, reach]]
  return null
}

export function Readout({ children }) { return <p className="la-readout" aria-live="polite">{children}</p> }

export function Notes({ try: attempt, truth, trap, code }) {
  return <>
    <div className="la-notes">
      <div style={{ '--tone': 'var(--c-v)' }}><span>Try this</span><p>{attempt}</p></div>
      <div style={{ '--tone': 'var(--c-j)' }}><span>What stays true</span><p>{truth}</p></div>
      <div style={{ '--tone': 'var(--c-err)' }}><span>Common trap</span><p>{trap}</p></div>
    </div>
    {code && <details className="la-details"><summary>The same experiment in OpenMAT</summary><CodeView code={code} copy /><p className="la-muted">Copy this into the worked-example editor and run it to inspect the same values.</p></details>}
  </>
}

export function MatrixTile({ label, rows, tones, rowTones }) {
  return <div className="la-matrix-tile"><span>{label} =</span><div className="la-matrix" style={{ gridTemplateColumns: `repeat(${rows[0].length}, auto)` }}>
    {rows.flatMap((row, r) => row.map((value, c) => <span key={`${r}-${c}`} style={tones?.[c] ? { color: `var(--c-${tones[c]})` } : rowTones?.[r] ? { color: `var(--c-${rowTones[r]})` } : undefined}>{fmt(value)}</span>))}
  </div></div>
}

export function Stat({ label, value, note, tone }) {
  return <div className="la-stat"><span>{label}</span><strong style={tone ? { color: `var(--c-${tone})` } : undefined}>{value}</strong>{note && <small>{note}</small>}</div>
}

// Eigen-decomposition of a real 2 × 2 matrix: real eigenvalues (largest first) with directions, or complex.
export function eigen2([[a, b], [c, d]]) {
  const tr = a + d, det = a * d - b * c, disc = tr * tr - 4 * det
  if (disc < -1e-9) return { complex: true, values: [], vectors: [], re: tr / 2, im: Math.sqrt(-disc) / 2 }
  const root = Math.sqrt(Math.max(0, disc)), values = [(tr + root) / 2, (tr - root) / 2]
  const vectors = values.map(l => Math.abs(b) > 1e-9 ? [b, l - a] : Math.abs(c) > 1e-9 ? [l - d, c] : null)
  if (!vectors[0]) return { complex: false, values, vectors: a >= d ? [[1, 0], [0, 1]] : [[0, 1], [1, 0]] }
  return { complex: false, values, vectors: root < 1e-9 ? [vectors[0]] : vectors }
}

// Singular values and directions of a 2 × 2 matrix, from the eigenvectors of AᵀA.
export function svd2(A) {
  const [[a, b], [c, d]] = A
  const AtA = [[a * a + c * c, a * b + c * d], [a * b + c * d, b * b + d * d]]
  const e = eigen2(AtA)
  const unit = v => { const n = Math.hypot(...v) || 1; return [v[0] / n, v[1] / n] }
  let v1 = unit(e.vectors[0] ?? [1, 0])
  const v2 = e.vectors[1] ? unit(e.vectors[1]) : [-v1[1], v1[0]]
  const sigma = e.values.map(l => Math.sqrt(Math.max(0, l)))
  const apply = v => [a * v[0] + b * v[1], c * v[0] + d * v[1]]
  return { sigma, v: [v1, v2], Av: [apply(v1), apply(v2)] }
}
