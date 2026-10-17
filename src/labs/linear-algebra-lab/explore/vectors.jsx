// Vectors and 2 × 2 matrices: combinations, dot products, a matrix as a map, and the SVD's circle-to-ellipse picture.
import { useRef, useState } from 'react'
import { Arrow, eigen2, fmt, Handle, MatrixTile, Notes, Plane, quad, Readout, ScreenArrow, Slider, Stat, svd2, toSvg, vec } from './parts.jsx'

export function Combine() {
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

export function DotProjection() {
  const plane = useRef(null)
  const [v, setV] = useState([2, 2.5]), [u, setU] = useState([3, 1])
  const uu = u[0] ** 2 + u[1] ** 2, dot = u[0] * v[0] + u[1] * v[1]
  const p = uu ? [u[0] * dot / uu, u[1] * dot / uu] : [0, 0]
  const cos = uu && (v[0] || v[1]) ? dot / Math.sqrt(uu) / Math.hypot(...v) : 0
  const angle = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI
  const meaning = `dot(u, v) = ${fmt(dot)}. Angle ${angle.toFixed(0)}°, cos θ = ${fmt(cos)}. Projection p = ${vec(p)}. Residual · u = ${fmt((v[0] - p[0]) * u[0] + (v[1] - p[1]) * u[1])}.`
  const k = 10 / (Math.hypot(...u) || 1), [gx1, gy1] = toSvg([-u[0] * k, -u[1] * k]), [gx2, gy2] = toSvg([u[0] * k, u[1] * k])
  return <>
    <Plane plane={plane} label={`Coordinate plane: v, the direction u, and the projection of v onto u. ${meaning}`}>
      <line className="la-guide" x1={gx1} y1={gy1} x2={gx2} y2={gy2} />
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
  Reflect: [[0, 1], [1, 0]], Collapse: [[1, 2], [0.5, 1]], Symmetric: [[2, 1], [1, 2]], Spiral: [[0.8, -0.6], [0.6, 0.8]],
}

export function useMatrix(initial) {
  const [A, setA] = useState(initial)
  const setCol = index => p => setA(M => index ? [[M[0][0], p[0]], [M[1][0], p[1]]] : [[p[0], M[0][1]], [p[1], M[1][1]]])
  return [A, setA, setCol]
}

function Presets({ A, setA, names = Object.keys(PRESETS) }) {
  return <div className="la-presets" role="group" aria-label="Matrix presets">{names.map(name => <button key={name} type="button" aria-pressed={JSON.stringify(PRESETS[name]) === JSON.stringify(A)} onClick={() => setA(PRESETS[name])}>{name}</button>)}</div>
}

export function Transform() {
  const plane = useRef(null)
  const [A, setA, setCol] = useMatrix(PRESETS.Shear)
  const [v, setV] = useState([1, 1.5]), [eig, setEig] = useState(false), [powers, setPowers] = useState(0)
  const col1 = [A[0][0], A[1][0]], col2 = [A[0][1], A[1][1]]
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0]
  const apply = p => [A[0][0] * p[0] + A[0][1] * p[1], A[1][0] * p[0] + A[1][1] * p[1]]
  const Av = apply(v)
  const orbit = [v]; for (let k = 0; k < powers; k++) orbit.push(apply(orbit.at(-1)))
  const e = eigen2(A)
  const meaning = `A = [${fmt(A[0][0])} ${fmt(A[0][1])}; ${fmt(A[1][0])} ${fmt(A[1][1])}]. A·v = ${vec(Av)}. det(A) = ${fmt(det)}.`
  return <>
    <Presets A={A} setA={setA} />
    <Plane plane={plane} matrix={A} label={`Coordinate plane: the grid transformed by A, with its columns and the image of v. ${meaning}`}>
      <polygon className={`la-fill ${det < 0 ? 'la-flipped' : ''}`} style={{ '--tone': det < 0 ? 'var(--c-err)' : 'var(--c-dir)' }} points={quad([[0, 0], col1, [col1[0] + col2[0], col1[1] + col2[1]], col2])} />
      {eig && e.vectors.map((d, i) => { const n = Math.hypot(...d) || 1, k = 10 / n, [x1, y1] = toSvg([-d[0] * k, -d[1] * k]), [x2, y2] = toSvg([d[0] * k, d[1] * k]); return <line key={i} className="la-eigen" x1={x1} y1={y1} x2={x2} y2={y2} /> })}
      {powers > 0 && <polyline className="la-orbit" points={orbit.map(p => toSvg(p).join(',')).join(' ')} />}
      {powers > 0 && orbit.map((p, i) => <circle key={i} className="la-orbit-dot" cx={toSvg(p)[0]} cy={toSvg(p)[1]} r={i ? 3.5 : 0} />)}
      <Arrow to={v} tone="v" label="v" dashed width={2} /><Arrow to={Av} tone="out" label="A·v" width={3.5} />
      <Arrow to={col1} tone="i" label="A·e₁" /><Arrow to={col2} tone="j" label="A·e₂" />
      <Handle plane={plane} at={col1} onMove={setCol(0)} tone="i" name="column 1" /><Handle plane={plane} at={col2} onMove={setCol(1)} tone="j" name="column 2" /><Handle plane={plane} at={v} onMove={setV} tone="v" name="v" />
    </Plane>
    <div className="la-matrix-row">
      <MatrixTile label="A" rows={A} tones={['i', 'j']} />
      <Stat label="det A" value={fmt(det)} tone={det < 0 ? 'err' : 'dir'} note={Math.abs(det) < 0.01 ? 'squashed flat: not invertible' : det < 0 ? 'orientation flipped' : 'area scale factor'} />
      <Stat label="eigenvalues" value={e.complex ? `${fmt(e.re)} ± ${fmt(e.im)}i` : e.values.map(fmt).join(', ')} note={e.complex ? `no real direction kept · size ${fmt(Math.hypot(e.re, e.im))}` : 'stretch along kept directions'} />
      <label className="la-toggle"><input type="checkbox" checked={eig} onChange={event => setEig(event.target.checked)} /> Show eigen-directions</label>
    </div>
    <div className="la-controls"><Slider label="Apply A repeatedly (Aᵏ·v)" tone="out" value={powers} onChange={setPowers} min={0} max={12} step={1} /></div>
    <Readout>{meaning}{powers > 0 ? ` After ${powers} steps, Aᵏ·v = ${vec(orbit.at(-1))}.` : ''}</Readout>
    <Notes try="Drag the red and green tips. The columns of A are where e₁ and e₂ land, and every grid square follows. Try Collapse, then Spiral with repeated application." truth="Grid lines stay straight, parallel and evenly spaced, and the origin stays put. The blue square's area is |det A|." trap="A·v is not entry-by-entry multiplication. It is v₁ times column 1 plus v₂ times column 2."
      code={`A = [${A[0].map(fmt).join(' ')}; ${A[1].map(fmt).join(' ')}];\nv = [${v}];\ndisp(A*v)\ndisp(det(A))\ndisp(eig(A))`} />
  </>
}

// SVD: the unit circle's image is an ellipse; its axes are σ₁u₁ and σ₂u₂, images of the right singular vectors.
export function SvdCircle() {
  const plane = useRef(null)
  const [A, setA, setCol] = useMatrix([[1.5, 1], [0.5, 1.5]])
  const [mode, setMode] = useState('both')
  const { sigma, v, Av } = svd2(A)
  const circle = Array.from({ length: 97 }, (_, i) => { const t = i / 96 * 2 * Math.PI; return [Math.cos(t), Math.sin(t)] })
  const image = circle.map(([x, y]) => [A[0][0] * x + A[0][1] * y, A[1][0] * x + A[1][1] * y])
  const Z = 70, path = pts => pts.map(p => toSvg(p, Z).join(',')).join(' ')
  const meaning = `σ₁ = ${fmt(sigma[0])}, σ₂ = ${fmt(sigma[1])}. |det A| = σ₁σ₂ = ${fmt(sigma[0] * sigma[1])}. Condition number σ₁/σ₂ = ${sigma[1] > 1e-6 ? fmt(sigma[0] / sigma[1]) : '∞'}.`
  return <>
    <div className="la-presets" role="group" aria-label="What to show">{[['both', 'Circle and ellipse'], ['input', 'Input side (V)'], ['output', 'Output side (UΣ)']].map(([id, name]) => <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}>{name}</button>)}</div>
    <Plane plane={plane} scale={Z} label={`Coordinate plane: the unit circle and its image under A, an ellipse. ${meaning}`}>
      {mode !== 'output' && <polyline className="la-circle" points={path(circle)} />}
      {mode !== 'input' && <polygon className="la-fill" style={{ '--tone': 'var(--c-out)' }} points={path(image)} />}
      {mode !== 'output' && <><Arrow scale={Z} to={v[0]} tone="dir" label="v₁" /><Arrow scale={Z} to={v[1]} tone="dir" label="v₂" dashed /></>}
      {mode !== 'input' && <><Arrow scale={Z} to={Av[0]} tone="out" label="σ₁u₁" width={3.5} /><Arrow scale={Z} to={Av[1]} tone="out" label="σ₂u₂" dashed width={3} /></>}
      <Arrow scale={Z} to={[A[0][0], A[1][0]]} tone="i" label="A·e₁" width={2} /><Arrow scale={Z} to={[A[0][1], A[1][1]]} tone="j" label="A·e₂" width={2} />
      <Handle plane={plane} scale={Z} limit={[3.2, 2.4]} at={[A[0][0], A[1][0]]} onMove={setCol(0)} tone="i" name="column 1" /><Handle plane={plane} scale={Z} limit={[3.2, 2.4]} at={[A[0][1], A[1][1]]} onMove={setCol(1)} tone="j" name="column 2" />
    </Plane>
    <div className="la-matrix-row">
      <MatrixTile label="A" rows={A} tones={['i', 'j']} />
      <Stat label="σ₁ (longest)" value={fmt(sigma[0])} tone="out" note="most stretch in any direction" />
      <Stat label="σ₂ (shortest)" value={fmt(sigma[1])} tone="out" note={sigma[1] < 0.05 ? 'nearly flat: nearly singular' : 'least stretch'} />
    </div>
    <Readout>{meaning} v₁ and v₂ are perpendicular, and so are their images.</Readout>
    <Notes try="Drag the columns until the ellipse is almost a line segment. Watch σ₂ approach 0 and the condition number blow up." truth="Every matrix sends some pair of perpendicular directions to perpendicular directions. Those are the singular vectors." trap="Singular vectors are not eigenvectors. v₁ is usually rotated by A; only its length changes predictably."
      code={`A = [${A[0].map(fmt).join(' ')}; ${A[1].map(fmt).join(' ')}];\n[U,S,V] = svd(A);\ndisp(S)\ndisp(A*V(:,1))\ndisp(S(1,1)*U(:,1))`} />
  </>
}

// The unit circle: an angle becomes the point (cos θ, sin θ); a radius scales it.
export function UnitCircle() {
  const [deg, setDeg] = useState(30), [r, setR] = useState(1)
  const Z = 90, th = deg * Math.PI / 180
  const p = [r * Math.cos(th), r * Math.sin(th)]
  const circle = Array.from({ length: 97 }, (_, i) => { const a = i / 96 * 2 * Math.PI; return toSvg([r * Math.cos(a), r * Math.sin(a)], Z).join(',') }).join(' ')
  const [px, py] = toSvg(p, Z), [ox, oy] = toSvg([0, 0], Z), [xx] = toSvg([p[0], 0], Z)
  const meaning = `Angle ${deg}° is ${fmt(th)} radians. cos = ${fmt(Math.cos(th))}, sin = ${fmt(Math.sin(th))}. With radius ${fmt(r)} the point is ${vec(p)}.`
  return <>
    <Plane label={`Coordinate plane: a circle of radius ${fmt(r)} and the point at ${deg} degrees. ${meaning}`} scale={Z}>
      <polyline className="la-circle" points={circle} />
      <line className="la-guide" x1={px} y1={py} x2={xx} y2={oy} />
      <ScreenArrow x1={ox} y1={oy} x2={xx} y2={oy} tone="i" label="r cos θ" width={3} />
      <ScreenArrow x1={xx} y1={oy} x2={px} y2={py} tone="j" label="r sin θ" width={3} mid />
      <ScreenArrow x1={ox} y1={oy} x2={px} y2={py} tone="v" label="point" width={3.5} />
    </Plane>
    <div className="la-controls">
      <Slider label="Angle (degrees)" tone="v" value={deg} onChange={setDeg} min={0} max={360} step={5} />
      <Slider label="Radius r" tone="out" value={r} onChange={setR} min={0.2} max={2} step={0.1} />
    </div>
    <Readout>{meaning}</Readout>
    <Notes try="Set the angle to 0°, 90°, 180° and 270° and read cos and sin each time. Then find an angle where cos and sin are equal." truth="The point is always at distance r from the centre, so (r cos θ)² + (r sin θ)² = r²." trap="cos and sin in code expect radians. cos(90) is not 0; cos(90*pi/180) is."
      code={`theta = ${deg}*pi/180;\nr = ${fmt(r)};\npoint = [r*cos(theta); r*sin(theta)];\ndisp(point)\ndisp(norm(point))`} />
  </>
}
