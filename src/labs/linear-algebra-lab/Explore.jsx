// Visual playground. Every colour means one thing everywhere in the lab:
// red = first column / e₁, green = second column / e₂, gold = the input vector v,
// violet = the result, blue = a chosen direction, pink = residual or error.
// Vector tips are draggable with a pointer and movable with arrow keys (Shift for bigger steps).
import { useId, useRef, useState } from 'react'
import { CodeView } from './code.jsx'

const fmt = value => (Math.abs(value) < 0.005 ? 0 : value).toFixed(2)
const W = 480, H = 360, S = 40, OX = W / 2, OY = H / 2
const toSvg = ([x, y]) => [OX + S * x, OY - S * y]
const snap = value => Math.round(value * 10) / 10
const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value))
const vec = v => `[${fmt(v[0])}; ${fmt(v[1])}]`

function Slider({ label, value, onChange, min = -3, max = 3, step = 0.1, tone }) {
  const id = useId()
  return <div className="la-slider" style={tone ? { '--tone': `var(--c-${tone})` } : undefined}>
    <span className="la-slider-heading"><label htmlFor={id}>{label}</label><output htmlFor={id}>{fmt(value)}</output></span>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} />
  </div>
}

function Arrow({ from = [0, 0], to, tone, label, dashed, width = 3, mid = false }) {
  const [x1, y1] = toSvg(from), [x2, y2] = toSvg(to)
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

// Labels sit past the tip (clear of its drag handle), or beside the middle of the arrow when two arrows share a tip.
function labelAt(x1, y1, x2, y2, angle, mid) {
  const [x, y] = mid ? [(x1 + x2) / 2 - 14 * Math.sin(angle), (y1 + y2) / 2 + 14 * Math.cos(angle)] : [x2 + 22 * Math.cos(angle), y2 + 22 * Math.sin(angle)]
  return { x, y: y + 4, textAnchor: Math.abs(Math.cos(angle)) < 0.35 ? 'middle' : (Math.cos(angle) > 0) !== mid ? 'start' : 'end' }
}

// A draggable, keyboard-movable handle at a vector's tip.
function Handle({ at, onMove, tone, name, plane }) {
  const drag = event => {
    const svg = plane.current
    if (!svg?.getScreenCTM) return
    const point = svg.createSVGPoint()
    point.x = event.clientX; point.y = event.clientY
    const p = point.matrixTransform(svg.getScreenCTM().inverse())
    onMove([clamp(snap((p.x - OX) / S), 5.5), clamp(snap((OY - p.y) / S), 4.2)])
  }
  const [cx, cy] = toSvg(at)
  return <circle className="la-handle" style={{ '--tone': `var(--c-${tone})` }} cx={cx} cy={cy} r="9" tabIndex={0} role="slider"
    aria-label={`Drag ${name}`} aria-valuetext={`${name} = ${vec(at)}`}
    onPointerDown={event => { event.currentTarget.setPointerCapture?.(event.pointerId); event.preventDefault() }}
    onPointerMove={event => { if (event.currentTarget.hasPointerCapture?.(event.pointerId)) drag(event) }}
    onKeyDown={event => {
      const step = event.shiftKey ? 1 : 0.1
      const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[event.key]
      if (!delta) return
      event.preventDefault(); onMove([clamp(snap(at[0] + delta[0]), 5.5), clamp(snap(at[1] + delta[1]), 4.2)])
    }} />
}

// The plane draws a grid; given a matrix it draws the grid's image too, so the warp is visible.
function Plane({ label, matrix, children, plane }) {
  const ticks = Array.from({ length: 17 }, (_, i) => i - 8)
  const image = matrix && (([x, y]) => [matrix[0][0] * x + matrix[0][1] * y, matrix[1][0] * x + matrix[1][1] * y])
  const line = (a, b, key, cls) => { const [x1, y1] = toSvg(a), [x2, y2] = toSvg(b); return <line key={key} className={cls} x1={x1} y1={y1} x2={x2} y2={y2} /> }
  const clip = useId().replace(/:/g, '')
  return <svg ref={plane} className="la-plane" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
    <defs><clipPath id={clip}><rect width={W} height={H} rx="14" /></clipPath></defs>
    <g clipPath={`url(#${clip})`}>
      <rect width={W} height={H} className="la-plane-bg" />
      {ticks.map(k => <g key={k}>{line([k, -6], [k, 6], 'v', 'la-grid')}{line([-8, k], [8, k], 'h', 'la-grid')}</g>)}
      {image && ticks.map(k => <g key={`w${k}`}>{line(image([k, -8]), image([k, 8]), 'v', k ? 'la-warp' : 'la-warp la-warp-axis')}{line(image([-8, k]), image([8, k]), 'h', k ? 'la-warp' : 'la-warp la-warp-axis')}</g>)}
      {line([-8, 0], [8, 0], 'x', 'la-axis')}{line([0, -6], [0, 6], 'y', 'la-axis')}
      {children}
    </g>
  </svg>
}

const quad = points => points.map(p => toSvg(p).join(',')).join(' ')

function Combine() {
  const plane = useRef(null)
  const [u, setU] = useState([2, 0.5]), [w, setW] = useState([-0.5, 1.5]), [v, setV] = useState([3.5, 2.5])
  const [a, setA] = useState(1), [b, setB] = useState(1)
  const au = [a * u[0], a * u[1]], out = [au[0] + b * w[0], au[1] + b * w[1]]
  const meaning = `v has length ${fmt(Math.hypot(...v))}. ${fmt(a)}·u + ${fmt(b)}·w = ${vec(out)}.`
  return <>
    <Plane plane={plane} label={`Coordinate plane: weighted combination of u and w. ${meaning}`}>
      <polygon className="la-fill" style={{ '--tone': 'var(--c-out)' }} points={quad([[0, 0], au, out, [b * w[0], b * w[1]]])} />
      <Arrow to={au} tone="i" label="a·u" dashed width={2} />
      <Arrow from={au} to={out} tone="j" label="b·w" dashed width={2} mid />
      <Arrow to={v} tone="v" label="v" />
      <Arrow to={out} tone="out" label="a·u + b·w" width={3.5} />
      <Arrow to={u} tone="i" label="u" /><Arrow to={w} tone="j" label="w" />
      <Handle plane={plane} at={u} onMove={setU} tone="i" name="u" /><Handle plane={plane} at={w} onMove={setW} tone="j" name="w" /><Handle plane={plane} at={v} onMove={setV} tone="v" name="v" />
    </Plane>
    <div className="la-controls">
      <Slider label="Weight a" tone="i" value={a} onChange={setA} />
      <Slider label="Weight b" tone="j" value={b} onChange={setB} />
      <Slider label="Vector x" tone="v" value={v[0]} onChange={x => setV([x, v[1]])} min={-4} max={4} />
      <Slider label="Vector y" tone="v" value={v[1]} onChange={y => setV([v[0], y])} min={-4} max={4} />
    </div>
    <Readout>{meaning} {Math.abs(u[0] * w[1] - u[1] * w[0]) < 0.01 ? 'u and w are parallel: their combinations only reach one line.' : 'u and w point in different directions, so some weights reach every point of the plane.'}</Readout>
    <Notes try="Can you choose a and b so that a·u + b·w lands exactly on the gold v? Then drag w until it is parallel to u, and try again." truth="Every combination of two non-parallel vectors stays in the plane, and every point of the plane is some combination of them. Parallel vectors only reach a line." trap="A weight does more than stretch a vector. A negative weight reverses its direction."
      code={`u = [${u}];\nw = [${w}];\na = ${a}; b = ${b};\nresult = a*u + b*w;\ndisp(result)`} />
  </>
}

function DotProjection() {
  const plane = useRef(null)
  const [v, setV] = useState([2, 2.5]), [u, setU] = useState([3, 1])
  const uu = u[0] ** 2 + u[1] ** 2, dot = u[0] * v[0] + u[1] * v[1]
  const p = uu ? [u[0] * dot / uu, u[1] * dot / uu] : [0, 0]
  const cos = uu && (v[0] || v[1]) ? dot / Math.sqrt(uu) / Math.hypot(...v) : 0
  const angle = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI
  const meaning = `dot(u, v) = ${fmt(dot)}. Angle ${angle.toFixed(0)}°, cos θ = ${fmt(cos)}. Projection p = ${vec(p)}. Residual · u = ${fmt((v[0] - p[0]) * u[0] + (v[1] - p[1]) * u[1])}.`
  return <>
    <Plane plane={plane} label={`Coordinate plane: v, the direction u, and the projection of v onto u. ${meaning}`}>
      {(() => { const k = 10 / (Math.hypot(...u) || 1), [x1, y1] = toSvg([-u[0] * k, -u[1] * k]), [x2, y2] = toSvg([u[0] * k, u[1] * k]); return <line className="la-guide" x1={x1} y1={y1} x2={x2} y2={y2} /> })()}
      <Arrow from={p} to={v} tone="err" label="residual" dashed width={2.5} mid />
      <Arrow to={u} tone="dir" label="u" /><Arrow to={v} tone="v" label="v" /><Arrow to={p} tone="out" label="p" width={4} />
      <Handle plane={plane} at={v} onMove={setV} tone="v" name="v" /><Handle plane={plane} at={u} onMove={setU} tone="dir" name="u" />
    </Plane>
    <div className="la-meter" aria-hidden="true"><span>opposite</span><div><i style={{ left: `${(cos + 1) * 50}%` }} /></div><span>same direction</span></div>
    <Readout>{meaning}</Readout>
    <Notes try="Drag v until the dot product is exactly zero. Where does p go? Then make u twice as long: p stays the same." truth="The residual v − p is always perpendicular to u. p depends on the direction of u, not on its length." trap="A projection is not a rotation of v. It discards the perpendicular part, so it usually shortens v."
      code={`v = [${v}];\nu = [${u}];\np = u * (dot(u,v) / dot(u,u));\nr = v - p;\ndisp(p); disp(dot(r,u))`} />
  </>
}

const PRESETS = {
  Identity: [[1, 0], [0, 1]], Shear: [[1, 1], [0, 1]], Rotate: [[0.71, -0.71], [0.71, 0.71]], Stretch: [[2, 0], [0, 0.5]],
  Reflect: [[0, 1], [1, 0]], Collapse: [[1, 2], [0.5, 1]], Symmetric: [[2, 1], [1, 2]],
}

export function eigen2([[a, b], [c, d]]) {
  const tr = a + d, det = a * d - b * c, disc = tr * tr - 4 * det
  if (disc < -1e-9) return { complex: true, values: [], vectors: [] }
  const root = Math.sqrt(Math.max(0, disc)), values = [(tr + root) / 2, (tr - root) / 2]
  const vectors = values.map(l => Math.abs(b) > 1e-9 ? [b, l - a] : Math.abs(c) > 1e-9 ? [l - d, c] : null)
  if (!vectors[0]) return { complex: false, values, vectors: [[1, 0], [0, 1]] }
  return { complex: false, values, vectors: root < 1e-9 ? [vectors[0]] : vectors }
}

function Transform() {
  const plane = useRef(null)
  const [A, setA] = useState(PRESETS.Shear), [v, setV] = useState([1, 1.5]), [eig, setEig] = useState(false)
  const col1 = [A[0][0], A[1][0]], col2 = [A[0][1], A[1][1]]
  const setCol = index => p => setA(index ? [[A[0][0], p[0]], [A[1][0], p[1]]] : [[p[0], A[0][1]], [p[1], A[1][1]]])
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0]
  const Av = [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]]
  const e = eigen2(A)
  const meaning = `A = [${fmt(A[0][0])} ${fmt(A[0][1])}; ${fmt(A[1][0])} ${fmt(A[1][1])}]. A·v = ${vec(Av)}. det(A) = ${fmt(det)}.`
  return <>
    <div className="la-presets" role="group" aria-label="Matrix presets">{Object.entries(PRESETS).map(([name, M]) => <button key={name} type="button" aria-pressed={JSON.stringify(M) === JSON.stringify(A)} onClick={() => setA(M)}>{name}</button>)}</div>
    <Plane plane={plane} matrix={A} label={`Coordinate plane: the grid transformed by A, with its columns and the image of v. ${meaning}`}>
      <polygon className={`la-fill ${det < 0 ? 'la-flipped' : ''}`} style={{ '--tone': det < 0 ? 'var(--c-err)' : 'var(--c-dir)' }} points={quad([[0, 0], col1, [col1[0] + col2[0], col1[1] + col2[1]], col2])} />
      {eig && e.vectors.map((d, i) => { const n = Math.hypot(...d) || 1, k = 10 / n, [x1, y1] = toSvg([-d[0] * k, -d[1] * k]), [x2, y2] = toSvg([d[0] * k, d[1] * k]); return <line key={i} className="la-eigen" x1={x1} y1={y1} x2={x2} y2={y2} /> })}
      <Arrow to={v} tone="v" label="v" dashed width={2} /><Arrow to={Av} tone="out" label="A·v" width={3.5} />
      <Arrow to={col1} tone="i" label="A·e₁" /><Arrow to={col2} tone="j" label="A·e₂" />
      <Handle plane={plane} at={col1} onMove={setCol(0)} tone="i" name="column 1" /><Handle plane={plane} at={col2} onMove={setCol(1)} tone="j" name="column 2" /><Handle plane={plane} at={v} onMove={setV} tone="v" name="v" />
    </Plane>
    <div className="la-matrix-row">
      <MatrixTile label="A" rows={A} tones={['i', 'j']} />
      <div className="la-stat"><span>det A</span><strong style={{ color: `var(--c-${det < 0 ? 'err' : 'dir'})` }}>{fmt(det)}</strong><small>{Math.abs(det) < 0.01 ? 'squashed flat: not invertible' : det < 0 ? 'orientation flipped' : 'area scale factor'}</small></div>
      <div className="la-stat"><span>eigenvalues</span><strong>{e.complex ? 'complex' : e.values.map(fmt).join(', ')}</strong><small>{e.complex ? 'no real direction is kept' : 'stretch along kept directions'}</small></div>
      <label className="la-toggle"><input type="checkbox" checked={eig} onChange={event => setEig(event.target.checked)} /> Show eigen-directions</label>
    </div>
    <Readout>{meaning}</Readout>
    <Notes try="Drag the red and green tips. The columns of A are where e₁ and e₂ land, and every grid square follows. Try Collapse: where does the plane go?" truth="Grid lines stay straight, parallel and evenly spaced, and the origin stays put. The blue square's area is |det A|." trap="A·v is not entry-by-entry multiplication. It is v₁ times column 1 plus v₂ times column 2."
      code={`A = [${A[0].map(fmt).join(' ')}; ${A[1].map(fmt).join(' ')}];\nv = [${v}];\ndisp(A*v)\ndisp(det(A))\ndisp(eig(A))`} />
  </>
}

export function descentTrace(rate, iterations = 12) {
  let weight = -1
  const trace = [weight]
  for (let k = 0; k < iterations; k++) { weight -= rate * 2 * (weight - 2); trace.push(weight) }
  return trace
}

function Descent() {
  const [rate, setRate] = useState(0.2)
  const trace = descentTrace(rate)
  const losses = trace.map(w => (w - 2) ** 2)
  const curve = Array.from({ length: 61 }, (_, i) => -4 + i * 0.2)
  const px = w => 40 + (w + 4) * 33.3, py = l => 250 - Math.min(l, 40) * 5.5
  return <>
    <p>The loss <code>L(w) = (w − 2)²</code> is a bowl with its lowest point at w = 2. Its slope is <code>2(w − 2)</code>. Start at w = −1, and each step subtracts the learning rate times the slope.</p>
    <svg className="la-chart" viewBox="0 0 480 280" role="img" aria-label={`Gradient descent steps on a bowl at learning rate ${fmt(rate)}. Final loss ${fmt(losses.at(-1))}.`}>
      <polyline className="la-curve" points={curve.map(w => `${px(w)},${py((w - 2) ** 2)}`).join(' ')} />
      <polyline className="la-trail" points={trace.map(w => `${px(clamp(w, 4))},${py((w - 2) ** 2)}`).join(' ')} />
      {trace.map((w, i) => <circle key={i} cx={px(clamp(w, 4))} cy={py((w - 2) ** 2)} r={i ? 4 : 6} className="la-step" style={{ opacity: 0.35 + 0.65 * (i / trace.length) }} />)}
      <line x1={px(2)} x2={px(2)} y1="30" y2="252" className="la-guide" /><text x={px(2) + 6} y="42">minimum w = 2</text>
    </svg>
    <div className="la-controls"><Slider label="Learning rate" tone="out" value={rate} onChange={setRate} min={0.05} max={1.1} step={0.05} /></div>
    <Readout>Final w = {fmt(trace.at(-1))}; loss = {fmt(losses.at(-1))}. {rate < 1 ? 'The error shrinks.' : rate === 1 ? 'The error oscillates without shrinking.' : 'The error grows.'}</Readout>
    <Notes try="Compare rates 0.2, 0.5, 1.0 and 1.1. At 0.5 one step lands exactly on the minimum. Why?" truth="The minimum stays at w = 2 whatever the rate. For this bowl, steps converge only when 0 < rate < 1." trap="A bigger step is not always faster. Past the limit, each step overshoots further than the last." />
  </>
}

export function bellmanTrace(gamma, steps) {
  let values = [0, 0, 0]
  const history = [values]
  for (let k = 0; k < steps; k++) {
    values = [Math.max(1 + gamma * values[0], gamma * values[1]), Math.max(2, gamma * values[0]), 0]
    history.push(values)
  }
  return history
}

function Bellman() {
  const [gamma, setGamma] = useState(0.8), [steps, setSteps] = useState(5)
  const history = bellmanTrace(gamma, steps), values = history.at(-1)
  const scale = Math.max(...values, 2)
  const next = bellmanTrace(gamma, steps + 1).at(-1)
  const residual = Math.max(...values.map((v, i) => Math.abs(v - next[i])))
  return <>
    <p>State A: stay for reward 1, or move to B for reward 0. State B: finish for reward 2, or return to A for reward 0. Terminal state T has value 0. All moves are deterministic.</p>
    <svg className="la-chart" viewBox="0 0 480 280" role="img" aria-label={`State values after ${steps} Bellman updates: A ${fmt(values[0])}, B ${fmt(values[1])}, terminal zero.`}>
      {values.map((v, i) => <g key={i} style={{ '--tone': `var(--c-${['dir', 'out', 'muted'][i]})` }}><rect className="la-bar" x={65 + i * 135} y={225 - 170 * v / scale} width="75" height={Math.max(2, 170 * v / scale)} rx="6" /><text x={95 + i * 135} y="250">{['A', 'B', 'T'][i]}</text><text x={80 + i * 135} y={214 - 170 * v / scale}>{fmt(v)}</text></g>)}
    </svg>
    <div className="la-controls"><Slider label="Discount γ" tone="dir" value={gamma} onChange={setGamma} min={0} max={0.95} step={0.05} /><Slider label="Bellman updates" tone="out" value={steps} onChange={setSteps} min={0} max={40} step={1} /></div>
    <Readout>Bellman residual = {fmt(residual)}. Greedy action at A: {1 + gamma * values[0] >= gamma * values[1] ? 'stay' : 'move to B'}; at B: {2 >= gamma * values[0] ? 'finish' : 'return to A'}.</Readout>
    <Notes try="Start with γ = 0, then use 0.8 and increase the updates. Larger discounts make distant rewards matter more." truth="T stays at zero. Each sweep uses the previous vector for every state." trap="Mixing old and new entries within one sweep gives a different iteration."
      code={`V = [0; 0; 0];\ngamma = ${gamma};\nfor k = 1:${steps}\n  old = V;\n  V(1) = max(1 + gamma*old(1), gamma*old(2));\n  V(2) = max(2, gamma*old(1));\n  V(3) = 0;\nend\ndisp(V);`} />
  </>
}

function Readout({ children }) { return <p className="la-readout" aria-live="polite">{children}</p> }

function Notes({ try: attempt, truth, trap, code }) {
  return <>
    <div className="la-notes">
      <div style={{ '--tone': 'var(--c-v)' }}><span>Try this</span><p>{attempt}</p></div>
      <div style={{ '--tone': 'var(--c-j)' }}><span>What stays true</span><p>{truth}</p></div>
      <div style={{ '--tone': 'var(--c-err)' }}><span>Common trap</span><p>{trap}</p></div>
    </div>
    {code && <details className="la-details"><summary>The same experiment in OpenMAT</summary><CodeView code={code} copy /><p className="la-muted">Copy this into the worked-example editor and run it to inspect the same values.</p></details>}
  </>
}

export function MatrixTile({ label, rows, tones }) {
  return <div className="la-matrix-tile"><span>{label} =</span><div className="la-matrix" style={{ gridTemplateColumns: `repeat(${rows[0].length}, auto)` }}>
    {rows.flatMap((row, r) => row.map((value, c) => <span key={`${r}-${c}`} style={tones?.[c] ? { color: `var(--c-${tones[c]})` } : undefined}>{fmt(value)}</span>))}
  </div></div>
}

export const EXPERIMENTS = [
  ['combine', 'Combine vectors', Combine], ['dot', 'Dot & projection', DotProjection], ['transform', 'Matrix as a map', Transform],
  ['descent', 'Gradient descent', Descent], ['bellman', 'Bellman updates', Bellman],
]

const BY_LESSON = {
  'laml-dot-product': 'dot', 'laml-length-distance-cosine': 'dot', 'laml-projection': 'dot', 'laml-orthogonal-qr': 'dot', 'laml-least-squares': 'dot', 'laml-regression-validation': 'dot',
  'laml-two-multiplications': 'transform', 'laml-markov-state-vectors': 'transform',
}
const BY_MODULE = { 'First steps': 'combine', 'Vector geometry': 'combine', 'Matrices as maps': 'transform', 'Systems and subspaces': 'transform', 'Least squares and data': 'dot', 'Spectral thinking': 'transform', 'Math for machine learning': 'descent', 'Dynamic programming': 'bellman', 'Mastery studio': 'bellman' }
export const experimentFor = lesson => BY_LESSON[lesson.id] || BY_MODULE[lesson.module] || 'combine'

export default function Explore({ lesson }) {
  const [mode, setMode] = useState(() => experimentFor(lesson))
  const [, title, Body] = EXPERIMENTS.find(([id]) => id === mode)
  return <section className="la-card la-experiment">
    <div className="la-section-title"><div><div className="la-eyebrow">Visual playground</div><h2>{title}</h2></div></div>
    <p className="la-muted">Predict first, then move one thing at a time. Drag the coloured tips, or focus one and use the arrow keys.</p>
    <div className="la-segmented" role="group" aria-label="Choose an experiment">{EXPERIMENTS.map(([id, name]) => <button key={id} type="button" aria-pressed={id === mode} onClick={() => setMode(id)}>{name}</button>)}</div>
    <div className="la-legend" aria-hidden="true">{[['i', 'e₁ / column 1'], ['j', 'e₂ / column 2'], ['v', 'input v'], ['out', 'result'], ['dir', 'direction'], ['err', 'residual']].map(([tone, name]) => <span key={tone} style={{ '--tone': `var(--c-${tone})` }}>{name}</span>)}</div>
    <Body key={mode} />
  </section>
}
