// Three dimensions, drawn as a rotatable SVG projection: the plane spanned by two vectors (and whether a
// third lies in it), or the parallelepiped a 3 × 3 matrix makes from the unit cube, whose volume is det A.
import { useRef, useState } from 'react'
import { fmt, Notes, Readout, ScreenArrow, Stat, vec } from './parts.jsx'

const W = 480, H = 380, S = 36, OX = W / 2, OY = H / 2 + 20
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const det3 = (a, b, c) => dot3(a, cross(b, c))
const add = (...vs) => vs.reduce((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0])
const scale = (k, v) => v.map(x => k * x)

function projector(yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch)
  return ([x, y, z]) => { const x1 = x * cy - y * sy, y1 = x * sy + y * cy; return [OX + S * x1, OY - S * (z * cp + y1 * sp)] }
}

const PRESETS = {
  span: { 'v on the plane': [[2, 0, 0.5], [0, 2, 1], [2, 2, 1.5]], 'v off the plane': [[2, 0, 0.5], [0, 2, 1], [1, 1, 3]], 'u and w parallel': [[1, 1, 1], [2, 2, 2], [1, -1, 2]] },
  volume: { 'Unit cube': [[1, 0, 0], [0, 1, 0], [0, 0, 1]], Stretch: [[2, 0, 0], [0, 1.5, 0], [0, 0, 1]], Shear: [[1, 0, 0], [0, 1, 0], [1, 1, 1]], 'Flat (det 0)': [[1, 0, 1], [0, 1, 1], [1, 1, 2]], Mirror: [[0, 1, 0], [1, 0, 0], [0, 0, 1]] },
}
const NAMES = { span: ['u', 'w', 'v'], volume: ['a₁', 'a₂', 'a₃'] }
const TONES = { span: ['i', 'j', 'v'], volume: ['i', 'j', 'dir'] }

export function Space3D() {
  const svg = useRef(null)
  const drag = useRef(null)
  const [mode, setMode] = useState('span')
  const [cols, setCols] = useState(PRESETS.span['v off the plane'])
  const [view, setView] = useState({ yaw: -0.6, pitch: 0.42 })
  const P = projector(view.yaw, view.pitch)
  const [a, b, c] = cols
  const n = cross(a, b), nn = Math.hypot(...n), d = det3(a, b, c)
  const seg = (p, q, cls, key) => { const [x1, y1] = P(p), [x2, y2] = P(q); return <line key={key} className={cls} x1={x1} y1={y1} x2={x2} y2={y2} /> }
  const arrow = (to, tone, label, extra = {}) => { const [x1, y1] = P([0, 0, 0]), [x2, y2] = P(to); return <ScreenArrow key={label} x1={x1} y1={y1} x2={x2} y2={y2} tone={tone} label={label} {...extra} /> }
  const rotate = (dYaw, dPitch) => setView(v => ({ yaw: v.yaw + dYaw, pitch: Math.max(-1.45, Math.min(1.45, v.pitch + dPitch)) }))

  let readout, picture
  if (mode === 'span') {
    const parallel = nn < 1e-9
    const dist = parallel ? null : dot3(n, c) / nn
    const foot = parallel ? null : add(c, scale(-dist, n.map(x => x / nn)))
    const inSpan = parallel ? false : Math.abs(dist) < 1e-6
    readout = parallel ? `u and w are parallel: together they span only a line, so the rank of [u w] is 1.` : `Normal to the plane n = u × w = ${vec(n)}. Distance from v to the plane: ${fmt(Math.abs(dist))}. ${inSpan ? 'v lies in span(u, w): det[u w v] = 0 and the rank of [u w v] is 2.' : `v is outside span(u, w): det[u w v] = ${fmt(d)}, so u, w, v are independent and span all of ℝ³.`}`
    const corner = (s, t) => P(add(scale(s, a), scale(t, b))).join(',')
    picture = <>
      {!parallel && <polygon className="la-fill la-plane3" style={{ '--tone': 'var(--c-dir)' }} points={[corner(-1.5, -1.5), corner(1.5, -1.5), corner(1.5, 1.5), corner(-1.5, 1.5)].join(' ')} />}
      {!parallel && [-1.5, -0.75, 0, 0.75, 1.5].map(k => <g key={k}>{seg(add(scale(k, a), scale(-1.5, b)), add(scale(k, a), scale(1.5, b)), 'la-plane3-grid', `a${k}`)}{seg(add(scale(-1.5, a), scale(k, b)), add(scale(1.5, a), scale(k, b)), 'la-plane3-grid', `b${k}`)}</g>)}
      {parallel && seg(scale(-3, a), scale(3, a), 'la-plane3-line', 'line')}
      {foot && !inSpan && <>{seg(c, foot, 'la-drop', 'drop')}<circle className="la-foot" cx={P(foot)[0]} cy={P(foot)[1]} r="4" /></>}
      {arrow(a, 'i', 'u')}{arrow(b, 'j', 'w')}{arrow(c, 'v', 'v', { width: 3.5 })}
    </>
  } else {
    const verts = [0, 1, 2, 3, 4, 5, 6, 7].map(m => add(...[a, b, c].filter((_, i) => m >> i & 1), [0, 0, 0]))
    const edges = []
    for (let m = 0; m < 8; m++) for (let i = 0; i < 3; i++) if (!(m >> i & 1)) edges.push([m, m | 1 << i])
    const cube = [0, 1, 2, 3, 4, 5, 6, 7].map(m => [m & 1, m >> 1 & 1, m >> 2 & 1])
    readout = `det A = ${fmt(d)}. The unit cube (volume 1) becomes a box of volume |det A| = ${fmt(Math.abs(d))}${Math.abs(d) < 1e-6 ? ': it is squashed flat, so A is not invertible' : d < 0 ? ', turned inside out (orientation reversed)' : ''}.`
    picture = <>
      {edges.map(([p, q], i) => seg(cube[p], cube[q], 'la-cube', `c${i}`))}
      {edges.map(([p, q], i) => seg(verts[p], verts[q], d < 0 ? 'la-box la-box-flip' : 'la-box', `e${i}`))}
      {arrow(a, 'i', 'a₁')}{arrow(b, 'j', 'a₂')}{arrow(c, 'dir', 'a₃')}
    </>
  }

  const setEntry = (col, row, value) => setCols(cs => cs.map((v, j) => j === col ? v.map((x, i) => i === row ? value : x) : v))
  return <>
    <div className="la-presets" role="group" aria-label="3D experiment">{[['span', 'Span and planes'], ['volume', 'Volume and det']].map(([id, name]) => <button key={id} type="button" aria-pressed={mode === id} onClick={() => { setMode(id); setCols(Object.values(PRESETS[id])[id === 'span' ? 1 : 2]) }}>{name}</button>)}</div>
    <div className="la-presets" role="group" aria-label="Presets">{Object.entries(PRESETS[mode]).map(([name, value]) => <button key={name} type="button" aria-pressed={JSON.stringify(value) === JSON.stringify(cols)} onClick={() => setCols(value)}>{name}</button>)}</div>
    <svg ref={svg} className="la-plane la-space" viewBox={`0 0 ${W} ${H}`} role="img" tabIndex={0} aria-label={`Three-dimensional view; drag or use arrow keys to rotate. ${readout}`}
      onPointerDown={event => { drag.current = [event.clientX, event.clientY]; event.currentTarget.setPointerCapture?.(event.pointerId) }}
      onPointerMove={event => { if (!drag.current) return; const [x, y] = drag.current; drag.current = [event.clientX, event.clientY]; rotate((event.clientX - x) * 0.01, (event.clientY - y) * 0.01) }}
      onPointerUp={() => { drag.current = null }}
      onKeyDown={event => { const r = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[event.key]; if (r) { event.preventDefault(); rotate(...r) } }}>
      <rect width={W} height={H} className="la-plane-bg" />
      {[-3, -2, -1, 1, 2, 3].map(k => <g key={k}>{seg([k, -3, 0], [k, 3, 0], 'la-floor', 'x')}{seg([-3, k, 0], [3, k, 0], 'la-floor', 'y')}</g>)}
      {[[[-4, 0, 0], [4, 0, 0], 'x'], [[0, -4, 0], [0, 4, 0], 'y'], [[0, 0, -3], [0, 0, 4], 'z']].map(([p, q, name]) => { const [tx, ty] = P(q); return <g key={name}>{seg(p, q, 'la-axis3', name)}<text className="la-axis3-label" x={tx + 6} y={ty - 4}>{name}</text></g> })}
      {picture}
    </svg>
    <div className="la-matrix-row">
      <div className="la-col-editor" role="group" aria-label="Column vectors">
        {cols.map((v, col) => <div key={col} style={{ '--tone': `var(--c-${TONES[mode][col]})` }}><span>{NAMES[mode][col]}</span>{v.map((x, row) => <input key={row} type="number" step="0.5" value={x} aria-label={`${NAMES[mode][col]} entry ${row + 1}`} onChange={event => setEntry(col, row, Number(event.target.value) || 0)} />)}</div>)}
      </div>
      <Stat label={mode === 'span' ? 'det [u w v]' : 'det A'} value={fmt(d)} tone={Math.abs(d) < 1e-6 ? 'err' : 'out'} note={Math.abs(d) < 1e-6 ? 'dependent columns' : 'independent columns'} />
      <button type="button" className="la-ghost" onClick={() => setView({ yaw: -0.6, pitch: 0.42 })}>Reset view</button>
    </div>
    <Readout>{readout}</Readout>
    {mode === 'span'
      ? <Notes try="Rotate the view until the blue plane is edge-on. Is v in it? Now edit v so the pink drop shrinks to zero." truth="Two independent vectors span a plane through the origin. A third vector adds a new direction exactly when it leaves that plane, which is when det[u w v] ≠ 0." trap="A flat picture can lie: v may look like it lies on the plane from one angle. Rotate, or check the determinant."
        code={`M = [${[0, 1, 2].map(r => cols.map(col => col[r]).join(' ')).join('; ')}];  % columns u, w, v\nu = M(:,1); w = M(:,2); v = M(:,3);\ndisp(rank(M))\ndisp(det(M))\ndisp(cross(u,w))`} />
      : <Notes try="Start from the unit cube and change one entry at a time. Find a matrix whose box is flat, then one that turns the cube inside out." truth="Volume scales by |det A| for every shape, not just the cube. A negative determinant reverses orientation, like a mirror." trap="A box can have a large volume while one column is tiny, and a small volume while every column is long. Only the determinant combines them correctly."
        code={`A = [${[0, 1, 2].map(r => cols.map(col => col[r]).join(' ')).join('; ')}];\ndisp(det(A))`} />}
  </>
}
