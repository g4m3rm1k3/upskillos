// Calculus playgrounds: zoom until a curve is straight, walk downhill on a hill map, and see a curved
// map behave like its Jacobian matrix up close.
import { useRef, useState } from 'react'
import { fmt, H, Handle, MatrixTile, Notes, Plane, Readout, ScreenArrow, Slider, Stat, toSvg, vec, W } from './parts.jsx'

const CURVES = {
  'x²': { f: x => x * x, df: x => 2 * x, code: 'x.^2' },
  'sin x': { f: Math.sin, df: Math.cos, code: 'sin(x)' },
  'x³ − 2x': { f: x => x ** 3 - 2 * x, df: x => 3 * x * x - 2, code: 'x.^3 - 2*x' },
}

export function Zoom() {
  const [name, setName] = useState('x²')
  const [a, setA] = useState(1), [zoom, setZoom] = useState(0)
  const { f, df, code } = CURVES[name]
  const half = 3 / 2 ** zoom, slope = df(a)
  const xs = Array.from({ length: 121 }, (_, i) => a - half + 2 * half * i / 120)
  const tangent = x => f(a) + slope * (x - a)
  const gap = Math.max(...xs.map(x => Math.abs(f(x) - tangent(x))))
  // The window keeps the same shape at every zoom level, so straightening is visible.
  const sx = x => 30 + (x - a + half) / (2 * half) * (W - 60), sy = y => H / 2 - (y - f(a)) / (2 * half) * (W - 60)
  const path = g => xs.map(x => `${sx(x)},${sy(g(x))}`).join(' ')
  const meaning = `At x = ${fmt(a)} the slope is ${fmt(slope)}. Window half-width ${half.toPrecision(3)}. Largest gap between curve and tangent: ${gap.toPrecision(3)}, which is ${(100 * gap / half).toPrecision(3)}% of the window.`
  return <>
    <div className="la-presets" role="group" aria-label="Choose a curve">{Object.keys(CURVES).map(key => <button key={key} type="button" aria-pressed={key === name} onClick={() => setName(key)}>{key}</button>)}</div>
    <svg className="la-plane" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`The curve ${name} near x = ${fmt(a)}, with its tangent line. ${meaning}`}>
      <rect width={W} height={H} className="la-plane-bg" />
      <polyline className="la-zoom-curve" points={path(f)} />
      <polyline className="la-zoom-tangent" points={path(tangent)} />
      <circle className="la-solution" cx={sx(a)} cy={sy(f(a))} r="6" />
    </svg>
    <div className="la-controls">
      <Slider label="Point x = a" tone="v" value={a} onChange={setA} min={-2} max={2} step={0.1} />
      <Slider label="Zoom level (each step doubles)" tone="dir" value={zoom} onChange={setZoom} min={0} max={8} step={1} />
    </div>
    <Readout>{meaning}</Readout>
    <Notes try="Zoom in step by step and watch the gap as a percentage of the window. Each zoom roughly halves it. Then pick sin x at a = 1.6, where the slope is almost 0." truth="Every smooth curve looks straight close enough, and the straight line it turns into is the tangent with slope f′(a)." trap="Zooming does not make the slope smaller; it makes the bending invisible. The slope at a point stays the same at every zoom."
      code={`f = @(x) ${code};\na = ${fmt(a)};\nh = 0.0001;\nslope = (f(a + h) - f(a - h)) / (2*h);\ndisp(slope)`} />
  </>
}

// Two hills and a valley; analytic height and gradient.
const BUMPS = [[1.6, 1.0, 3, 1.4], [-1.8, -1.0, 2.2, 1.1], [0.2, -2.0, -1.6, 0.9]]
export function hillHeight([x, y]) { return BUMPS.reduce((s, [cx, cy, a, w]) => s + a * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * w * w)), 0) }
export function hillGradient([x, y]) {
  return BUMPS.reduce(([gx, gy], [cx, cy, a, w]) => {
    const e = a * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * w * w)) / (w * w)
    return [gx - e * (x - cx), gy - e * (y - cy)]
  }, [0, 0])
}

export function Hill() {
  const plane = useRef(null)
  const [p, setP] = useState([0.4, 0.6]), [eta, setEta] = useState(0.4), [trail, setTrail] = useState([])
  const g = hillGradient(p), len = Math.hypot(...g)
  const cells = []
  for (let i = 0; i < 30; i++) for (let j = 0; j < 22; j++) {
    const x = -6 + (i + 0.5) * 0.4, y = -4.4 + (j + 0.5) * 0.4, z = hillHeight([x, y])
    const [sx, sy] = toSvg([x - 0.2, y + 0.2])
    cells.push(<rect key={`${i}-${j}`} x={sx} y={sy} width="16.5" height="16.5" className={z >= 0 ? 'la-hill-up' : 'la-hill-down'} style={{ opacity: Math.min(0.85, Math.abs(z) / 3) }} />)
  }
  const field = []
  for (let i = -5; i <= 5; i += 1.25) for (let j = -3.75; j <= 3.75; j += 1.25) {
    const gg = hillGradient([i, j]), n = Math.hypot(...gg)
    if (n < 0.05) continue
    const [x1, y1] = toSvg([i, j]), [x2, y2] = toSvg([i + 0.45 * gg[0] / n, j + 0.45 * gg[1] / n])
    field.push(<line key={`${i},${j}`} className="la-field" x1={x1} y1={y1} x2={x2} y2={y2} />)
  }
  const step = () => { setTrail(t => [...t, p]); setP(([x, y]) => [x - eta * g[0], y - eta * g[1]]) }
  const [px, py] = toSvg(p), up = toSvg([p[0] + g[0], p[1] + g[1]]), down = toSvg([p[0] - g[0], p[1] - g[1]])
  const meaning = `At ${vec(p)} the height is ${fmt(hillHeight(p))}. Gradient ${vec(g)} (steepness ${fmt(len)}). A step of ${fmt(eta)} × gradient goes downhill.`
  return <>
    <Plane plane={plane} grid={false} label={`Hill map: shading shows height, small lines point uphill. ${meaning}`}>
      {cells}{field}
      {trail.length > 0 && <polyline className="la-orbit" points={[...trail, p].map(q => toSvg(q).join(',')).join(' ')} />}
      <ScreenArrow x1={px} y1={py} x2={up[0]} y2={up[1]} tone="out" label="∇f (uphill)" width={3} />
      <ScreenArrow x1={px} y1={py} x2={down[0]} y2={down[1]} tone="dir" label="−∇f" width={2.5} />
      <Handle plane={plane} at={p} tone="v" name="the hiker" onMove={q => { setP(q); setTrail([]) }} />
    </Plane>
    <div className="la-matrix-row">
      <Stat label="Height" value={fmt(hillHeight(p))} tone="v" />
      <Stat label="Steepness ‖∇f‖" value={fmt(len)} tone="out" note={len < 0.02 ? 'flat: a top, a bottom or a pass' : 'longer arrow, steeper ground'} />
      <button type="button" className="la-primary" onClick={step}>Step downhill</button>
      <button type="button" className="la-ghost" onClick={() => setTrail([])}>Clear trail</button>
    </div>
    <div className="la-controls"><Slider label="Learning rate η" tone="dir" value={eta} onChange={setEta} min={0.05} max={3} step={0.05} /></div>
    <Readout>{meaning}</Readout>
    <Notes try="Drag the hiker onto a slope and press Step downhill repeatedly. Then raise the learning rate to 2.5 and watch the steps overshoot the valley." truth="The gradient is at right angles to the contours and points uphill. Stepping against it lowers the height, as long as the step is small enough." trap="Gradient descent finds the bottom of the valley it starts in, not necessarily the lowest point on the whole map."
      code={`f = @(x, y) 3*exp(-((x-1.6).^2 + (y-1).^2)/3.92) + 2.2*exp(-((x+1.8).^2 + (y+1).^2)/2.42) - 1.6*exp(-((x-0.2).^2 + (y+2).^2)/1.62);\np = [${fmt(p[0])}; ${fmt(p[1])}];\nh = 0.0001;\ngrad = [(f(p(1)+h, p(2)) - f(p(1)-h, p(2)))/(2*h); (f(p(1), p(2)+h) - f(p(1), p(2)-h))/(2*h)];\ndisp(grad)\np = p - ${fmt(eta)}*grad;\ndisp(p)`} />
  </>
}

// A gently curved map of the plane and its Jacobian.
export const curvedMap = ([x, y]) => [x + 0.25 * y * y, y + 0.6 * Math.sin(0.8 * x)]
// Undo the map by repeated substitution (it converges because the map is close to the identity).
const unmap = ([u, v]) => { let [x, y] = [u, v]; for (let k = 0; k < 30; k++) { y = v - 0.6 * Math.sin(0.8 * x); x = u - 0.25 * y * y } return [x, y] }
export const curvedJacobian = ([x, y]) => [[1, 0.5 * y], [0.48 * Math.cos(0.8 * x), 1]]

export function CurvedMap() {
  const plane = useRef(null)
  const [p, setP] = useState([0.5, 1]), [size, setSize] = useState(0.8)
  const J = curvedJacobian(p), F = curvedMap(p), det = J[0][0] * J[1][1] - J[0][1] * J[1][0]
  const line = pts => pts.map(q => toSvg(curvedMap(q)).join(',')).join(' ')
  const ks = Array.from({ length: 13 }, (_, i) => i - 6), ts = Array.from({ length: 41 }, (_, i) => -6 + i * 0.3)
  const corners = [[0, 0], [size, 0], [size, size], [0, size], [0, 0]]
  const trueImg = Array.from({ length: 41 }, (_, i) => { const s = i / 40 * 4, k = Math.floor(Math.min(s, 3.999)), f = s - k, [a, b] = [corners[k], corners[k + 1]]; return [p[0] + a[0] + f * (b[0] - a[0]), p[1] + a[1] + f * (b[1] - a[1])] })
  const linImg = corners.map(([u, v]) => [F[0] + J[0][0] * u + J[0][1] * v, F[1] + J[1][0] * u + J[1][1] * v])
  const [fx, fy] = toSvg(F), c1 = toSvg([F[0] + J[0][0], F[1] + J[1][0]]), c2 = toSvg([F[0] + J[0][1], F[1] + J[1][1]])
  const meaning = `Near ${vec(p)}, the map acts like J = [${fmt(J[0][0])} ${fmt(J[0][1])}; ${fmt(J[1][0])} ${fmt(J[1][1])}], with det J = ${fmt(det)}.`
  return <>
    <Plane plane={plane} grid={false} label={`A curved map: the bent grid is the image of the square grid. ${meaning}`}>
      {ks.map(k => <g key={k}><polyline className="la-warp" fill="none" points={line(ts.map(s => [k, s]))} /><polyline className="la-warp" fill="none" points={line(ts.map(s => [s, k]))} /></g>)}
      <polygon className="la-fill" style={{ '--tone': 'var(--c-v)' }} points={line(trueImg)} />
      <polygon className="la-jac-guess" points={linImg.map(q => toSvg(q).join(',')).join(' ')} />
      <ScreenArrow x1={fx} y1={fy} x2={c1[0]} y2={c1[1]} tone="i" label="J column 1" width={3} />
      <ScreenArrow x1={fx} y1={fy} x2={c2[0]} y2={c2[1]} tone="j" label="J column 2" width={3} />
      <Handle plane={plane} at={F} tone="v" name="the point" onMove={q => setP(unmap(q))} />
    </Plane>
    <div className="la-matrix-row">
      <MatrixTile label="J" rows={J} tones={['i', 'j']} />
      <Stat label="det J" value={fmt(det)} tone="dir" note="local area factor" />
    </div>
    <div className="la-controls"><Slider label="Size of the small square" tone="v" value={size} onChange={setSize} min={0.1} max={2} step={0.1} /></div>
    <Readout>{meaning} Gold: the true image of a small square. Outline: the Jacobian's prediction.</Readout>
    <Notes try="Shrink the square: the gold shape and the outline become indistinguishable. Grow it and they separate. Then drag the point and watch J change from place to place." truth="Up close, every smooth map is a matrix. That matrix changes from point to point; that is what makes the map curved." trap="The Jacobian is only trustworthy near its point. Far away, the true map bends away from the prediction."
      code={`F = @(x, y) [x + 0.25*y.^2; y + 0.6*sin(0.8*x)];\np = [${fmt(p[0])}; ${fmt(p[1])}];\nh = 0.0001;\nJ = zeros(2,2);\nJ(:,1) = (F(p(1)+h, p(2)) - F(p(1)-h, p(2)))/(2*h);\nJ(:,2) = (F(p(1), p(2)+h) - F(p(1), p(2)-h))/(2*h);\ndisp(J)\ndisp(det(J))`} />
  </>
}
