// Figures for calculus in many variables and for volumes: a path across a contour map, a curved map
// and its Jacobian, the Hessian's bowl or saddle, columns under a surface, and the Gaussian's rings.
import { useState } from 'react'
import { totalDerivative, jacobian, eigen2, doubleIntegral, ringSum, area } from '../engine/maths.js'
import { Graph, Slider, Working, C, fmt } from './ui.jsx'

// A surface seen from above: cells shaded by height, in bands, so the band edges are contour lines.
// signed: teal above zero, orange below.
// Colours are mixed with the page's background rather than drawn translucent, so neighbouring cells
// can overlap by a hair (hiding seams) without darkening where they overlap.
const PAPER = [255, 253, 247]
const mix = (hex, t) => { const c = [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16)); return `rgb(${c.map((v, k) => Math.round(PAPER[k] + (v - PAPER[k]) * t)).join(',')})` }
function Heat({ X, Y, f, x, y, n = 44, band = 1, signed = false }) {
  const cells = [], dx = (x[1] - x[0]) / n, dy = (y[1] - y[0]) / n
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const cx = x[0] + (i + 0.5) * dx, cy = y[0] + (j + 0.5) * dy, v = f(cx, cy)
    const fill = signed ? mix(v >= 0 ? C.teal : C.orange, Math.min(0.6, Math.abs(v) / (band * 6))) : mix(C.teal, Math.abs(Math.floor(v / band)) % 2 ? 0.28 : 0.1)
    cells.push(<rect key={`${i}-${j}`} x={X(cx - dx / 2)} y={Y(cy + dy / 2)} width={X(cx + dx / 2) - X(cx - dx / 2) + 0.6} height={Y(cy - dy / 2) - Y(cy + dy / 2) + 0.6} fill={fill} />)
  }
  return <g>{cells}</g>
}

const PATH = { pos: t => [t * t, 3 * t], vel: t => [2 * t, 3] }
const F = (x, y) => x * x + y * y, GRAD = p => [2 * p[0], 2 * p[1]]
export function PathFig() {
  const [t, setT] = useState(-0.8)
  const [px, py] = PATH.pos(t), [vx, vy] = PATH.vel(t), [gx, gy] = GRAD([px, py]), rate = totalDerivative(GRAD, PATH.pos, PATH.vel, t)
  const curve = Array.from({ length: 61 }, (_, i) => PATH.pos(-2 + 4 * i / 60))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="t" value={t} min={-1.6} max={1.6} step={0.05} onChange={setT} /></div>
    <Graph x={[-1, 5]} y={[-5, 5]} equal height={300} segments={curve.slice(1).map((p, i) => ({ x1: curve[i][0], y1: curve[i][1], x2: p[0], y2: p[1], color: C.grey }))}
      arrows={[{ x1: px, y1: py, x2: px + 0.3 * gx, y2: py + 0.3 * gy, color: C.orange, label: '∇f' }, { x1: px, y1: py, x2: px + 0.6 * vx, y2: py + 0.6 * vy, color: C.teal, label: "x′(t)" }]} points={[{ x: px, y: py }]} background={({ X, Y }) => <Heat X={X} Y={Y} f={(x, y) => Math.sqrt(F(x, y))} x={[-5.5, 9.5]} y={[-5.5, 5.5]} n={60} band={1} />} />
    <p className="qm-hint">f(x, y) = x² + y² (bands are contours, one per unit of distance from the origin); the path is x = t², y = 3t.</p>
    <Working rows={[['∇f at the point', `(2x, 2y)`, `(${fmt(gx, 2)}, ${fmt(gy, 2)})`], ['velocity', '(2t, 3)', `(${fmt(vx, 2)}, ${fmt(vy, 2)})`], ['df/dt = ∇f · x′', `${fmt(gx, 2)}×${fmt(vx, 2)} + ${fmt(gy, 2)}×${fmt(vy, 2)}`, fmt(rate, 3)]]} />
  </div>
}

const MAP = v => [v[0] + 0.25 * v[1] * v[1], v[1] - 0.2 * v[0] * v[0]]
export function JacobianFig() {
  const [px, setPx] = useState(1), [py, setPy] = useState(1), [size, setSize] = useState(0.8)
  const J = jacobian(MAP, [px, py]), [fx, fy] = MAP([px, py])
  const sq = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([a, b]) => [px + (a - 0.5) * size, py + (b - 0.5) * size])
  const edge = (pts, color) => pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; return { x1: p[0], y1: p[1], x2: q[0], y2: q[1], color } })
  const curved = []
  for (let k = 0; k < 4; k++) { const a = sq[k], b = sq[(k + 1) % 4]; for (let s = 0; s < 8; s++) { const u = MAP([a[0] + (b[0] - a[0]) * s / 8, a[1] + (b[1] - a[1]) * s / 8]), w = MAP([a[0] + (b[0] - a[0]) * (s + 1) / 8, a[1] + (b[1] - a[1]) * (s + 1) / 8]); curved.push({ x1: u[0], y1: u[1], x2: w[0], y2: w[1], color: C.orange }) } }
  const lin = sq.map(([x, y]) => [fx + J[0][0] * (x - px) + J[0][1] * (y - py), fy + J[1][0] * (x - px) + J[1][1] * (y - py)])
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="point x" value={px} min={-2} max={2} step={0.1} onChange={setPx} /><Slider label="point y" value={py} min={-2} max={2} step={0.1} onChange={setPy} /><Slider label="square size" value={size} min={0.05} max={1.5} step={0.05} onChange={setSize} /></div>
    <Graph x={[-3, 4]} y={[-3, 3]} equal height={300} segments={[...edge(sq, C.teal), ...curved, ...edge(lin, C.violet).map(s => ({ ...s, dash: true }))]} points={[{ x: px, y: py, color: C.teal }, { x: fx, y: fy, color: C.orange }]} />
    <p className="qm-hint">The map: (x, y) → (x + y²/4, y − x²/5).</p>
    <Working rows={[['J', '[[1, y/2], [−2x/5, 1]]', `[[${fmt(J[0][0], 3)}, ${fmt(J[0][1], 3)}], [${fmt(J[1][0], 3)}, ${fmt(J[1][1], 3)}]]`], ['det J: area scaling', 'ad − bc', fmt(J[0][0] * J[1][1] - J[0][1] * J[1][0], 3)]]} />
  </div>
}

export function HessianFig() {
  const [a, setA] = useState(1), [b, setB] = useState(2), [c, setC] = useState(1)
  const [big, small] = eigen2([[a, b], [b, c]])
  const kind = small > 1e-9 ? 'bowl: a minimum' : big < -1e-9 ? 'cap: a maximum' : big > 1e-9 && small < -1e-9 ? 'saddle' : 'flat in one direction'
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="a" value={a} min={-3} max={3} step={0.25} onChange={setA} /><Slider label="b" value={b} min={-3} max={3} step={0.25} onChange={setB} /><Slider label="c" value={c} min={-3} max={3} step={0.25} onChange={setC} /></div>
    <Graph x={[-3, 3]} y={[-3, 3]} equal height={280}>
      {({ X, Y }) => <Heat X={X} Y={Y} f={(x, y) => 0.5 * (a * x * x + 2 * b * x * y + c * y * y)} x={[-3, 3]} y={[-3, 3]} band={0.8} signed />}
    </Graph>
    <p className="qm-hint">Teal: above the flat point's height; orange: below.</p>
    <Working rows={[['H', `[[${fmt(a)}, ${fmt(b)}], [${fmt(b)}, ${fmt(c)}]]`, ''], ['eigenvalues', 'from det(H − λI) = 0', `${fmt(big, 3)}, ${fmt(small, 3)}`], ['the flat point is', '', kind]]} />
  </div>
}

const SURFACES = { tilt: ['xy + 1 on [0, 1] × [0, 2]', (x, y) => x * y + 1, [0, 1], [0, 2], 3], bell: ['e^(−(x² + y²)/2) on [−4, 4]²', (x, y) => Math.exp(-(x * x + y * y) / 2), [-4, 4], [-4, 4], 2 * Math.PI] }
export function DoubleIntegralFig() {
  const [which, setWhich] = useState('tilt'), [n, setN] = useState(4)
  const [name, fn, xr, yr, exact] = SURFACES[which]
  const value = doubleIntegral(fn, xr[0], xr[1], yr[0], yr[1], n)
  const rings = which === 'bell' ? ringSum(r => Math.exp(-r * r / 2), 4 * Math.SQRT2, n) : null
  const top = which === 'tilt' ? 3 : 1, dx = (xr[1] - xr[0]) / n, dy = (yr[1] - yr[0]) / n
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Surface <select value={which} onChange={e => setWhich(e.target.value)}>{Object.entries(SURFACES).map(([k, [nm]]) => <option key={k} value={k}>{nm}</option>)}</select></label><Slider label="grid n" value={n} min={1} max={40} step={1} onChange={setN} show={v => `${v} × ${v}`} /></div>
    <Graph x={[xr[0] - 0.2, xr[1] + 0.2]} y={[yr[0] - 0.2, yr[1] + 0.2]} equal height={260}>
      {({ X, Y }) => <g>{Array.from({ length: n * n }, (_, k) => { const i = k % n, j = Math.floor(k / n), cx = xr[0] + (i + 0.5) * dx, cy = yr[0] + (j + 0.5) * dy; return <rect key={k} x={X(xr[0] + i * dx)} y={Y(yr[0] + (j + 1) * dy)} width={X(xr[0] + dx) - X(xr[0])} height={Y(yr[0]) - Y(yr[0] + dy)} fill={C.teal} opacity={0.1 + 0.8 * fn(cx, cy) / top} stroke="#fff" strokeWidth={n > 20 ? 0 : 0.6} /> })}</g>}
    </Graph>
    <Working rows={[['columns', `${n * n} columns, height at each centre`, fmt(value, 5)], ['exact', which === 'tilt' ? '∫₀¹ (2x + 2) dx' : '2π (out to the edge: nearly all of it)', fmt(exact, 5)],
      ...(rings !== null ? [['in rings instead', `${n} rings of area 2πr dr`, fmt(rings, 5)]] : [])]} />
  </div>
}

export function GaussianFig() {
  const [R, setR] = useState(3)
  const ring = r => 2 * Math.PI * r * Math.exp(-r * r / 2), I = area(x => Math.exp(-x * x / 2), -R, R, 2000)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="out to r (and x)" value={R} min={0.5} max={6} step={0.1} onChange={setR} /></div>
    <Graph x={[0, 6]} y={[0, 4.2]} height={220} fns={[{ f: ring, label: '2πr e^(−r²/2)', labelAt: 2.2 }]} regions={[{ f: ring, from: 0, to: R, color: C.teal, opacity: 0.3 }]} xlabel="r" />
    <Working rows={[['volume in rings to r', `2π(1 − e^(−${fmt(R, 2)}²/2))`, fmt(ringSum(r => Math.exp(-r * r / 2), R), 5)], ['I: strips from −r to r', '∫ e^(−x²/2) dx', fmt(I, 5)], ['I²', `${fmt(I, 5)}²`, fmt(I * I, 5)], ['2π', '', fmt(2 * Math.PI, 5)]]} />
    <p className="qm-hint">Out to r the square of the strip area and the ring volume differ (a square isn't a disc), but both close in on 2π.</p>
  </div>
}
