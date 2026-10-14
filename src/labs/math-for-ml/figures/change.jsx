// Figures for the calculus additions: the ε–δ game, the growing rectangle, inverse slopes, curvature,
// antiderivatives, stretching a curve, and Taylor polynomials with their error bound.
import { useState } from 'react'
import { deltaFor, derivative, secondDerivative, tanh, sigmoid, logit, area, taylor, factorial } from '../engine/maths.js'
import { Graph, Slider, Working, C, fmt } from './ui.jsx'

const LIMITS = {
  line: ['3x + 1 as x → 2', x => 3 * x + 1, 2, 7, [0.5, 3.5], [1, 13]],
  hole: ['(x² − 1)/(x − 1) as x → 1', x => (x * x - 1) / (x - 1), 1, 2, [-0.5, 2.5], [0, 4]],
  square: ['x² as x → 1.5', x => x * x, 1.5, 2.25, [0, 3], [-0.5, 7]],
  floor: ['⌊x⌋ as x → 1 (try L = 1)', Math.floor, 1, 1, [-0.5, 2.5], [-1.5, 3]],
}
export function EpsilonDeltaFig() {
  const [which, setWhich] = useState('line'), [eps, setEps] = useState(1)
  const [name, fn, a, L, xr, yr] = LIMITS[which]
  const delta = deltaFor(fn, a, L, eps)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Limit <select value={which} onChange={e => setWhich(e.target.value)}>{Object.entries(LIMITS).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></label><Slider label="ε" value={eps} min={0.05} max={2} step={0.05} onChange={setEps} /></div>
    <Graph x={xr} y={yr} height={260} fns={[{ f: fn, jumps: which === 'floor', label: name.split(' as')[0] }]}
      rects={[{ x: xr[0], y: L - eps, w: xr[1] - xr[0], h: 2 * eps, color: C.orange, opacity: 0.18 }, ...(delta ? [{ x: a - delta, y: yr[0], w: 2 * delta, h: yr[1] - yr[0], color: C.teal, opacity: 0.18 }] : [])]}
      points={[{ x: a, y: L, color: C.violet, label: `(${fmt(a)}, L = ${fmt(L)})` }]} />
    <Working rows={[['the challenge', `|f(x) − ${fmt(L)}| < ε`, `ε = ${fmt(eps, 2)}`], ['the answer', delta ? `0 < |x − ${fmt(a)}| < δ` : 'no δ works', delta ? `δ = ${fmt(delta, 4)}` : 'the limit is not L'],
      ...(which === 'line' ? [['the proof\'s δ', 'ε / 3', fmt(eps / 3, 4)]] : [])]} />
  </div>
}

export function ProductAreaFig() {
  const [x, setX] = useState(1.5), [h, setH] = useState(0.4)
  const F = t => t, G = t => 1 + t * t / 2
  const f0 = F(x), g0 = G(x), df = F(x + h) - f0, dg = G(x + h) - g0
  const S = 40, pad = 10, W = (f0 + df) * S + 2 * pad, H = (g0 + dg) * S + 2 * pad
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="x" value={x} min={0.5} max={2.5} step={0.1} onChange={setX} /><Slider label="nudge h" value={h} min={0.02} max={0.8} step={0.02} onChange={setH} /></div>
    <svg viewBox={`0 0 ${W} ${H}`} className="mm-graph" style={{ maxWidth: Math.min(560, W * 1.6) }} role="img" aria-label="a rectangle f by g growing by two strips and a corner">
      <rect x={pad} y={pad} width={f0 * S} height={g0 * S} fill={C.teal} opacity={0.25} stroke={C.teal} />
      <rect x={pad + f0 * S} y={pad} width={df * S} height={g0 * S} fill={C.orange} opacity={0.45} />
      <rect x={pad} y={pad + g0 * S} width={f0 * S} height={dg * S} fill={C.violet} opacity={0.4} />
      <rect x={pad + f0 * S} y={pad + g0 * S} width={df * S} height={dg * S} fill={C.red} opacity={0.6} />
      <text x={pad + f0 * S / 2} y={pad + g0 * S / 2} textAnchor="middle" className="mm-curvelabel">f·g</text>
    </svg>
    <p className="qm-hint">Here f(x) = x and g(x) = 1 + x²/2. Teal: f·g. Orange: g·Δf. Violet: f·Δg. Red: the corner Δf·Δg.</p>
    <Working rows={[['g·Δf / h', `${fmt(g0)} × ${fmt(df)} / ${fmt(h)}`, fmt(g0 * df / h, 4)], ['f·Δg / h', `${fmt(f0)} × ${fmt(dg, 4)} / ${fmt(h)}`, fmt(f0 * dg / h, 4)], ['corner Δf·Δg / h', 'shrinks with h', fmt(df * dg / h, 4)],
      ['product rule f′g + fg′', `1 × ${fmt(g0)} + ${fmt(f0)} × ${fmt(x)}`, fmt(g0 + f0 * x, 4)]]} />
  </div>
}

const INVERSES = {
  square: ['x² and √y', x => x * x, Math.sqrt, [0, 3]], exp: ['eˣ and ln y', Math.exp, Math.log, [-2, 2]], sigmoid: ['σ(z) and logit(p)', sigmoid, logit, [-4, 4]], cube: ['x³ and ∛y', x => x ** 3, y => Math.cbrt(y), [-1.5, 1.5]],
}
export function InverseFig() {
  const [which, setWhich] = useState('sigmoid'), [x, setX] = useState(1)
  const [name, fn, inv, [lo, hi]] = INVERSES[which]
  const xx = Math.min(hi, Math.max(lo, x)), y = fn(xx), s = derivative(fn, xx)
  const R = [Math.min(lo, fn(lo), -0.5) - 0.3, Math.max(hi, fn(hi)) + 0.3]
  const along = 0.6
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Pair <select value={which} onChange={e => { setWhich(e.target.value); setX(1) }}>{Object.entries(INVERSES).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></label><Slider label="x" value={xx} min={lo} max={hi} step={0.05} onChange={setX} /></div>
    <Graph x={R} y={R} equal height={300} fns={[{ f: fn, from: lo, to: hi, color: C.teal }, { f: inv, color: C.orange }, { f: t => t, dash: true, color: C.grey }]}
      segments={[{ x1: xx - along, y1: y - along * s, x2: xx + along, y2: y + along * s, color: C.teal, dash: true }, ...(Math.abs(s) > 1e-9 ? [{ x1: y - along, y1: xx - along / s, x2: y + along, y2: xx + along / s, color: C.orange, dash: true }] : [{ x1: y, y1: R[0], x2: y, y2: R[1], color: C.orange, dash: true }])]}
      points={[{ x: xx, y, color: C.teal }, { x: y, y: xx, color: C.orange }]} />
    <Working rows={[['f′ at x (teal)', `x = ${fmt(xx, 2)}`, fmt(s, 4)], ['(f⁻¹)′ at y = f(x) (orange)', `1 / ${fmt(s, 4)}`, Math.abs(s) > 1e-9 ? fmt(1 / s, 4) : '∞: f is flat here']]} />
  </div>
}

const CURVES = { cubic: ['x³ − 3x', x => x ** 3 - 3 * x, [-2.5, 2.5], [-4, 4]], quartic: ['x⁴', x => x ** 4, [-1.5, 1.5], [-0.5, 3]], tanh: ['tanh x', tanh, [-3, 3], [-1.3, 1.3]], bowl: ['20x²', x => 20 * x * x, [-1, 1], [-1, 20]] }
export function CurvatureFig() {
  const [which, setWhich] = useState('cubic'), [x, setX] = useState(1)
  const [name, fn, xr, yr] = CURVES[which]
  const xx = Math.min(xr[1], Math.max(xr[0], x)), s = derivative(fn, xx), c = secondDerivative(fn, xx), y = fn(xx)
  const bend = Math.abs(c) < 1e-3 ? 'no bend (f″ = 0)' : c > 0 ? 'bending up: a cup' : 'bending down: a cap'
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Curve <select value={which} onChange={e => { setWhich(e.target.value); setX(1) }}>{Object.entries(CURVES).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></label><Slider label="x" value={xx} min={xr[0]} max={xr[1]} step={0.05} onChange={setX} /></div>
    <Graph x={xr} y={yr} height={250} fns={[{ f: fn, label: name, color: C.grey }]} segments={[{ x1: xx - 0.6, y1: y - 0.6 * s, x2: xx + 0.6, y2: y + 0.6 * s, color: c > 1e-3 ? C.teal : c < -1e-3 ? C.orange : C.grey }]}
      points={[{ x: xx, y, color: c > 1e-3 ? C.teal : c < -1e-3 ? C.orange : C.grey }]} />
    <Working rows={[['f′(x)', 'slope', fmt(s, 3)], ['f″(x)', 'slope of the slope', fmt(c, 3)], ['shape here', bend, Math.abs(s) < 0.05 ? (c > 1e-3 ? 'flat + cup: minimum' : c < -1e-3 ? 'flat + cap: maximum' : 'flat: no verdict') : ''],
      ...(c > 1e-3 ? [['safe learning rate', '2 / f″', fmt(2 / c, 3)]] : [])]} />
  </div>
}

const INTEGRANDS = { line: ['x', x => x, x => x * x / 2], parabola: ['x² − 2x', x => x * x - 2 * x, x => x ** 3 / 3 - x * x], recip: ['1/x', x => 1 / x, Math.log], exp: ['eˣ', Math.exp, Math.exp] }
export function AntiderivativeFig() {
  const [which, setWhich] = useState('parabola'), [a, setA] = useState(0.5), [b, setB] = useState(3)
  const [name, fn, F] = INTEGRANDS[which]
  const lo = which === 'recip' ? 0.2 : -1, A = Math.max(lo, Math.min(a, b)), B = Math.max(a, b)
  const yr = which === 'exp' ? [-1, 22] : which === 'recip' ? [-2, 5] : [-2, 5]
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>f(x) = <select value={which} onChange={e => setWhich(e.target.value)}>{Object.entries(INTEGRANDS).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></label><Slider label="a" value={a} min={lo} max={3} step={0.1} onChange={setA} /><Slider label="b" value={b} min={lo} max={3} step={0.1} onChange={setB} /></div>
    <Graph x={[lo, 3.2]} y={yr} height={200} fns={[{ f: fn, label: `f = ${name}` }]} regions={[{ f: t => Math.max(0, fn(t)), from: A, to: B, color: C.teal, opacity: 0.35 }, { f: t => Math.min(0, fn(t)), from: A, to: B, color: C.orange, opacity: 0.45 }]} />
    <Graph x={[lo, 3.2]} y={[Math.min(F(lo), F(3.2), 0) - 1, Math.max(F(3.2), F(lo), 1) + 1]} height={180} fns={[{ f: F, color: C.violet, label: 'F' }]} segments={[{ x1: A, y1: F(A), x2: B, y2: F(A), dash: true, color: C.grey }, { x1: B, y1: F(A), x2: B, y2: F(B), color: C.violet }]} points={[{ x: A, y: F(A) }, { x: B, y: F(B) }]} />
    <Working rows={[['F(b) − F(a)', `F(${fmt(B, 2)}) − F(${fmt(A, 2)})`, fmt(F(B) - F(A), 4)], ['strips (signed)', '1000 midpoint strips', fmt(area(fn, A, B, 1000), 4)]]} />
  </div>
}

export function SubstitutionFig() {
  const [sigma, setSigma] = useState(2), [mu, setMu] = useState(1)
  const g = u => Math.exp(-u * u / 2)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="σ (stretch)" value={sigma} min={0.5} max={3} step={0.1} onChange={setSigma} /><Slider label="μ (shift)" value={mu} min={-2} max={2} step={0.5} onChange={setMu} /></div>
    <Graph x={[-8, 8]} y={[-0.05, 1.1]} height={220} fns={[{ f: g, color: C.grey, label: 'g(u) = e^(−u²/2)', labelAt: -2.6 }, { f: x => g((x - mu) / sigma), color: C.teal, label: 'g((x − μ)/σ)', labelAt: 5 }]} regions={[{ f: x => g((x - mu) / sigma), from: -8, to: 8, color: C.teal, opacity: 0.2 }]} />
    <Working rows={[['area of g(u)', 'strips', fmt(area(g, -10, 10, 2000), 4)], ['area of the stretched curve', 'strips', fmt(area(x => g((x - mu) / sigma), -30, 30, 4000), 4)], ['σ × area of g', `${fmt(sigma, 2)} × ${fmt(area(g, -10, 10, 2000), 4)}`, fmt(sigma * area(g, -10, 10, 2000), 4)]]} />
  </div>
}

const TAYLORS = {
  exp: ['eˣ at 0', Math.exp, 0, k => 1, [-3, 3], [-2, 12], (x, n) => Math.exp(Math.abs(x)) * Math.abs(x) ** (n + 1) / factorial(n + 1)],
  log: ['ln(1 + x) at 0', x => Math.log(1 + x), 0, k => (k === 0 ? 0 : (k % 2 ? 1 : -1) * factorial(k - 1)), [-0.9, 2], [-3, 2], null],
  sigmoid: ['σ(z) at 0', sigmoid, 0, k => [0.5, 0.25, 0, -0.125, 0, 0.25, 0, -1.0625, 0][k] ?? 0, [-5, 5], [-0.5, 1.5], null],
}
export function TaylorFig() {
  const [which, setWhich] = useState('exp'), [n, setN] = useState(2), [x, setX] = useState(1.5)
  const [name, fn, a, d, xr, yr, bound] = TAYLORS[which]
  const ders = Array.from({ length: n + 1 }, (_, k) => d(k)), p = t => taylor(ders, a, t)
  const xx = Math.min(xr[1], Math.max(xr[0], x))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Function <select value={which} onChange={e => setWhich(e.target.value)}>{Object.entries(TAYLORS).map(([k, [nm]]) => <option key={k} value={k}>{nm}</option>)}</select></label><Slider label="degree n" value={n} min={0} max={8} step={1} onChange={setN} show={v => String(v)} /><Slider label="x" value={xx} min={xr[0]} max={xr[1]} step={0.05} onChange={setX} /></div>
    <Graph x={xr} y={yr} height={250} fns={[{ f: fn, color: C.grey, label: name.split(' at')[0] }, { f: p, color: C.orange, label: `degree ${n}` }]} points={[{ x: xx, y: fn(xx), color: C.grey }, { x: xx, y: p(xx), color: C.orange }]} />
    <Working rows={[['true value', `at x = ${fmt(xx, 2)}`, fmt(fn(xx), 5)], [`degree-${n} polynomial`, ders.map((v, k) => `${fmt(v / factorial(k), 3)}x^${k}`).join(' + '), fmt(p(xx), 5)], ['error', '', fmt(Math.abs(fn(xx) - p(xx)), 5)],
      ...(bound ? [['proved bound', `e^|x| |x|^${n + 1}/${n + 1}!`, fmt(bound(xx, n), 5)]] : [])]} />
  </div>
}
