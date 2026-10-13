// Part 2 figures: slope as rise over run, secants turning into a tangent, a function beside its
// derivative, the derivative rules, e^x's slope, the chain rule, minima, gradient descent in one and
// two dimensions on the bowl's contour map, and Riemann sums.
import { useState } from 'react'
import { height, averageRate, derivative, sigmoid, sigmoidSlope, descend, bowl, bowlGradient, area } from '../engine/maths.js'
import { Graph, Slider, Working, C, fmt } from './ui.jsx'

export function SlopeFig() {
  const [pts, setPts] = useState([[1, 3], [4, 12]])
  const [[x1, y1], [x2, y2]] = pts, m = (y2 - y1) / (x2 - x1 || 1e-9), c = y1 - m * x1
  return <div className="qm-fig">
    <Graph x={[-1, 8]} y={[-4, 16]} onDrag={(i, x, y) => setPts(p => p.map((q, j) => j === i ? [Math.round(x * 2) / 2, Math.round(y * 2) / 2] : q))}
      fns={Math.abs(x2 - x1) > 1e-9 ? [{ f: x => m * x + c }] : []} segments={[{ x1, y1, x2, y2: y1, color: C.orange }, { x1: x2, y1, x2, y2, color: C.violet }]}
      points={[{ x: x1, y: y1, drag: true, label: '(x₁, y₁)' }, { x: x2, y: y2, drag: true, label: '(x₂, y₂)' }]} />
    <Working rows={[['run Δx', `${fmt(x2)} − ${fmt(x1)}`, fmt(x2 - x1)], ['rise Δy', `${fmt(y2)} − ${fmt(y1)}`, fmt(y2 - y1)], ['slope m', 'Δy / Δx', x2 === x1 ? 'undefined (no run)' : fmt(m)], ['the line', 'y = m x + c', x2 === x1 ? '—' : `y = ${fmt(m)}x + ${fmt(c)}`]]} />
  </div>
}

export function ZoomFig() {
  const [k, setK] = useState(0), hs = [1, 0.5, 0.2, 0.1, 0.01, 0.001], h = hs[k]
  const rate = averageRate(height, 1, 1 + h)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="h" value={k} min={0} max={hs.length - 1} step={1} onChange={setK} show={i => String(hs[i])} /></div>
    <Graph x={[0, 2]} y={[-2, 22]} fns={[{ f: height, label: 'h(t)' }, { f: t => height(1) + rate * (t - 1), color: C.orange, label: 'secant' }, { f: t => height(1) - 10 * (t - 1), color: C.grey, dash: true }]} points={[{ x: 1, y: height(1), label: 't = 1' }, { x: 1 + h, y: height(1 + h), color: C.violet }]} xlabel="t (s)" ylabel="height (m)" />
    <Working rows={[['average velocity on [1, 1 + h]', `(h(${fmt(1 + h, 4)}) − h(1)) / ${h}`, `${fmt(rate, 5)} m/s`], ['the tangent (dashed)', 'the limit as h → 0', '−10 m/s']]} />
  </div>
}

const FUNCS = {
  square: ['x²', x => x * x, x => 2 * x, [-3, 3], [-1, 9]],
  cube: ['x³ − 4x', x => x ** 3 - 4 * x, x => 3 * x * x - 4, [-3, 3], [-10, 10]],
  sigmoid: ['σ(x)', sigmoid, sigmoidSlope, [-6, 6], [-0.1, 1.1]],
  exp: ['eˣ', Math.exp, Math.exp, [-2, 2.2], [-0.5, 9]],
}
export function DerivativeFig() {
  const [which, setWhich] = useState('square'), [x, setX] = useState(1)
  const [name, fn, d, xr, yr] = FUNCS[which], s = d(x)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>f(x) = <select value={which} onChange={e => { setWhich(e.target.value); setX(1) }}>{Object.entries(FUNCS).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></label><Slider label="x" value={x} min={xr[0]} max={xr[1]} step={0.1} onChange={setX} /></div>
    <Graph x={xr} y={yr} height={220} fns={[{ f: fn, label: `f(x) = ${name}` }, { f: t => fn(x) + s * (t - x), color: C.orange, dash: true }]} points={[{ x, y: fn(x) }]} />
    <Graph x={xr} y={[Math.min(...[-1, ...Array.from({ length: 41 }, (_, i) => d(xr[0] + (xr[1] - xr[0]) * i / 40))]), Math.max(...[1, ...Array.from({ length: 41 }, (_, i) => d(xr[0] + (xr[1] - xr[0]) * i / 40))])]} height={170} fns={[{ f: d, color: C.violet, label: "f′(x)" }]} points={[{ x, y: s, color: C.violet, label: `slope ${fmt(s, 3)}` }]} />
    <Working rows={[['slope of the tangent', `f′(${fmt(x, 2)})`, fmt(s, 4)], ['numerical check', '(f(x+h) − f(x−h)) / 2h', fmt(derivative(fn, x), 4)]]} />
  </div>
}

export function RulesFig() {
  const [a, setA] = useState(4), [b, setB] = useState(0), [c, setC] = useState(-2), [d0, setD] = useState(7)
  const fn = x => a * x ** 3 + b * x ** 2 + c * x + d0, d = x => 3 * a * x * x + 2 * b * x + c
  const term = (k, p) => k ? `${fmt(k)}x${p > 1 ? (p === 2 ? '²' : '³') : ''}` : null
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="x³ ×" value={a} min={-3} max={5} step={1} onChange={setA} /><Slider label="x² ×" value={b} min={-5} max={5} step={1} onChange={setB} /><Slider label="x ×" value={c} min={-5} max={5} step={1} onChange={setC} /><Slider label="constant" value={d0} min={-5} max={10} step={1} onChange={setD} /></div>
    <Working rows={[['f(x)', [term(a, 3), term(b, 2), term(c, 1), d0 ? fmt(d0) : null].filter(Boolean).join(' + ') || '0', ''], ["f′(x)", [term(3 * a, 2), term(2 * b, 1), c ? fmt(c) : null].filter(Boolean).join(' + ') || '0', 'power rule, term by term'], ['constant', `${fmt(d0)} → 0`, 'a flat line has no slope']]} />
    <Graph x={[-2.5, 2.5]} y={[-30, 30]} fns={[{ f: fn, label: 'f' }, { f: d, color: C.violet, label: "f′" }]} />
  </div>
}

export function ExpSlopeFig() {
  const [x, setX] = useState(1)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="x" value={x} min={-2} max={2} step={0.1} onChange={setX} /></div>
    <Graph x={[-3, 3]} y={[-1, 8]} fns={[{ f: Math.exp, label: 'eˣ' }, { f: t => Math.exp(x) + Math.exp(x) * (t - x), color: C.orange, dash: true }, { f: t => t > 0 ? Math.log(t) : NaN, color: C.violet, label: 'ln x', labelAt: 2.8 }]} points={[{ x, y: Math.exp(x), label: `height ${fmt(Math.exp(x), 3)}` }]} />
    <Working rows={[['height eˣ', `e^${fmt(x, 2)}`, fmt(Math.exp(x), 4)], ['slope there', 'measured numerically', fmt(derivative(Math.exp, x), 4)], ['slope of ln at eˣ', `1 / ${fmt(Math.exp(x), 3)}`, fmt(1 / Math.exp(x), 4)]]} />
  </div>
}

export function ChainFig() {
  const [z, setZ] = useState(0.5)
  const u = 1 + Math.exp(-z), du = -Math.exp(-z), ds = -1 / (u * u)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="z" value={z} min={-5} max={5} step={0.25} onChange={setZ} /></div>
    <Working rows={[['link 1: u = 1 + e^(−z)', `du/dz = −e^(−z)`, fmt(du, 4)], ['link 2: σ = 1/u', `dσ/du = −1/u²`, fmt(ds, 4)], ['chain: multiply', `${fmt(ds, 4)} × ${fmt(du, 4)}`, fmt(ds * du, 4)], ['shortcut σ(1 − σ)', `${fmt(sigmoid(z), 4)} × ${fmt(1 - sigmoid(z), 4)}`, fmt(sigmoidSlope(z), 4)], ['measured slope', 'numerical derivative', fmt(derivative(sigmoid, z), 4)]]} />
    <Graph x={[-6, 6]} y={[-0.05, 1.05]} height={200} fns={[{ f: sigmoid, label: 'σ' }, { f: sigmoidSlope, color: C.violet, label: "σ′", labelAt: 2.5 }]} points={[{ x: z, y: sigmoid(z) }, { x: z, y: sigmoidSlope(z), color: C.violet }]} />
  </div>
}

export function MinimumFig() {
  const [x, setX] = useState(1)
  const L = w => (w - 2) ** 2 + (w - 4) ** 2 + (w - 9) ** 2, dL = w => 2 * (3 * w - 15)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="w" value={x} min={0} max={10} step={0.25} onChange={setX} /></div>
    <Graph x={[0, 10]} y={[0, 110]} fns={[{ f: L, from: 0, to: 5, color: C.orange }, { f: L, from: 5, to: 10, color: C.teal }, { f: w => L(x) + dL(x) * (w - x), color: C.grey, dash: true }]} points={[{ x, y: L(x), label: `slope ${fmt(dL(x))}` }, { x: 5, y: L(5), color: C.violet, label: 'slope 0' }]} xlabel="w" ylabel="L(w)" />
    <p className="qm-hint">{dL(x) < 0 ? 'Slope negative: downhill is to the right.' : dL(x) > 0 ? 'Slope positive: downhill is to the left.' : 'Slope zero: the bottom.'}</p>
  </div>
}

export function Descent1D() {
  const [rate, setRate] = useState(0.1), [steps, setSteps] = useState(10)
  const path = descend(x => 2 * (x - 3), 0, rate, steps), fn = x => (x - 3) ** 2
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="learning rate η" value={rate} min={0.02} max={1.1} step={0.02} onChange={setRate} /><Slider label="steps" value={steps} min={1} max={30} step={1} onChange={setSteps} /></div>
    <Graph x={[-3, 9]} y={[-1, 20]} fns={[{ f: fn, label: '(x − 3)²' }]} segments={path.slice(1).map((x, i) => ({ x1: path[i], y1: fn(path[i]), x2: x, y2: fn(x), color: C.orange }))} points={path.map((x, i) => ({ x, y: fn(x), r: i === path.length - 1 ? 6 : 3, color: i === path.length - 1 ? C.violet : C.orange }))} />
    <p>After {steps} steps: x = <b>{fmt(path.at(-1), 4)}</b>. {rate >= 1 ? 'η ≥ 1: every step overshoots by at least as much as it started away. It never settles.' : rate > 0.5 ? 'η > 0.5: each step jumps past the bottom, zig-zagging in.' : rate < 0.05 ? 'Tiny steps: safe, but slow.' : ''}</p>
  </div>
}

// Contour ellipses of the bowl (x − 3)² + 2(y + 1)² = c.
const contours = ({ X, Y }) => [0.5, 2, 5, 10, 18, 30, 45].map(c => { const pts = Array.from({ length: 73 }, (_, i) => { const t = i / 72 * 2 * Math.PI; return `${i ? 'L' : 'M'}${X(3 + Math.sqrt(c) * Math.cos(t)).toFixed(1)},${Y(-1 + Math.sqrt(c / 2) * Math.sin(t)).toFixed(1)}` }); return <path key={c} d={pts.join(' ')} fill="none" stroke="#c9b28a" strokeWidth="1" /> })
export function SurfaceFig() {
  const [p, setP] = useState([1, 0.5])
  const [x, y] = p, [gx, gy] = bowlGradient(x, y)
  return <div className="qm-fig">
    <Graph x={[-2, 8]} y={[-4, 3]} equal onDrag={(i, a, b) => setP([a, b])} points={[{ x, y, drag: true, label: `f = ${fmt(bowl(x, y), 2)}` }]} segments={[{ x1: -2, y1: y, x2: 8, y2: y, dash: true, color: C.orange }, { x1: x, y1: -4, x2: x, y2: 3, dash: true, color: C.violet }]}>{contours}</Graph>
    <div className="mm-row">
      <Graph x={[-2, 8]} y={[0, 50]} width={225} height={150} fns={[{ f: t => bowl(t, y), color: C.orange }]} points={[{ x, y: bowl(x, y), color: C.orange }]} label="east–west slice" />
      <Graph x={[-4, 3]} y={[0, 50]} width={225} height={150} fns={[{ f: t => bowl(x, t), color: C.violet }]} points={[{ x: y, y: bowl(x, y), color: C.violet }]} label="north–south slice" />
    </div>
    <Working rows={[['∂f/∂x (orange slice\'s slope)', `2(${fmt(x, 2)} − 3)`, fmt(gx, 3)], ['∂f/∂y (violet slice\'s slope)', `4(${fmt(y, 2)} + 1)`, fmt(gy, 3)]]} />
  </div>
}

export function GradientFig() {
  const [p, setP] = useState([0, 0])
  const [x, y] = p, [gx, gy] = bowlGradient(x, y), s = 0.12
  const field = []
  for (let a = -1; a <= 7; a += 1.5) for (let b = -3.5; b <= 2.5; b += 1.2) { const [u, v] = bowlGradient(a, b); field.push({ x1: a, y1: b, x2: a + 0.06 * u, y2: b + 0.06 * v, color: '#9db8b4', width: 1.4 }) }
  return <div className="qm-fig">
    <Graph x={[-2, 8]} y={[-4, 3]} equal onDrag={(i, a, b) => setP([a, b])} arrows={[...field, { x1: x, y1: y, x2: x + s * gx, y2: y + s * gy, label: '∇f', color: C.violet }, { x1: x, y1: y, x2: x - s * gx, y2: y - s * gy, label: '−∇f', color: C.orange }]} points={[{ x, y, drag: true }]}>{contours}</Graph>
    <Working rows={[['∇f', `(2(x − 3), 4(y + 1))`, `(${fmt(gx, 2)}, ${fmt(gy, 2)})`], ['steepness ‖∇f‖', '√(gₓ² + g_y²)', fmt(Math.hypot(gx, gy), 3)]]} />
  </div>
}

export function Descent2D() {
  const [start, setStart] = useState([0, 2]), [rate, setRate] = useState(0.1), [steps, setSteps] = useState(15)
  const path = [start]
  for (let i = 0; i < steps; i++) { const [x, y] = path.at(-1), [gx, gy] = bowlGradient(x, y); path.push([x - rate * gx, y - rate * gy]) }
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="η" value={rate} min={0.02} max={0.52} step={0.02} onChange={setRate} /><Slider label="steps" value={steps} min={1} max={40} step={1} onChange={setSteps} /></div>
    <Graph x={[-2, 8]} y={[-4, 3]} equal onDrag={(i, a, b) => { if (i === 0) setStart([a, b]) }} segments={path.slice(1).map((q, i) => ({ x1: path[i][0], y1: path[i][1], x2: q[0], y2: q[1], color: C.orange }))} points={[{ x: start[0], y: start[1], drag: true, label: 'start (drag)' }, ...path.slice(1).map((q, i) => ({ x: q[0], y: q[1], r: i === steps - 1 ? 5 : 2.5, color: i === steps - 1 ? C.violet : C.orange }))]}>{contours}</Graph>
    <p>After {steps} steps: ({fmt(path.at(-1)[0], 3)}, {fmt(path.at(-1)[1], 3)}), loss {fmt(bowl(...path.at(-1)), 4)}. The bottom is (3, −1). {rate > 0.5 ? 'η > 0.5 is too big for the steep north–south direction: it diverges.' : rate > 0.3 ? 'The steep direction zig-zags; the shallow one crawls.' : ''}</p>
  </div>
}

export function AreaFig() {
  const [n, setN] = useState(4)
  const width = 1 / n, rects = Array.from({ length: n }, (_, i) => ({ x: i * width, y: 0, w: width, h: ((i + 0.5) * width) ** 2, color: C.orange, opacity: 0.35, stroke: '#a85a0e' }))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="strips n" value={n} min={1} max={60} step={1} onChange={setN} /></div>
    <Graph x={[-0.05, 1.1]} y={[-0.05, 1.1]} rects={rects} fns={[{ f: x => x * x, label: 'x²' }]} />
    <Working rows={[['Σ f(xᵢ) Δx', `${n} strips of width ${fmt(width, 4)}`, fmt(area(x => x * x, 0, 1, n), 6)], ['∫₀¹ x² dx', 'the limit', '0.333333']]} />
  </div>
}
