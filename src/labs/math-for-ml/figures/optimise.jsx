// Figures for the optimisation part: chords and valleys, the descent lemma's parabola, Newton's
// parabolas, SGD's noise, momentum in a narrow valley, Lagrange's touching contour, KKT's wall, and
// the dual's rising lower bound.
import { useState } from 'react'
import { chordAbove, newton, sgd, fullGradient, cosineSchedule, kktBounded, projectedGd, dualValue } from '../engine/maths.js'
import { Graph, Slider, Working, C, fmt } from './ui.jsx'

const CURVES = { bowl: ['x²', x => x * x, [-3, 3], [-1, 9]], abs: ['|x| + x²/4', x => Math.abs(x) + x * x / 4, [-3, 3], [-0.5, 5.5]], wavy: ['x²/4 + sin(2x)', x => x * x / 4 + Math.sin(2 * x), [-3.5, 3.5], [-1.5, 4.5]], quartic: ['(x² − 2)²/2', x => (x * x - 2) ** 2 / 2, [-2.4, 2.4], [-0.5, 5]] }
export function ConvexityFig() {
  const [which, setWhich] = useState('wavy'), [a, setA] = useState(-1.8), [b, setB] = useState(0.8)
  const [name, fn, xr, yr] = CURVES[which], below = [0.25, 0.5, 0.75].some(t => !chordAbove(fn, a, b, t))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>f(x) = <select value={which} onChange={e => setWhich(e.target.value)}>{Object.entries(CURVES).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></label><Slider label="a" value={a} min={xr[0]} max={xr[1]} step={0.1} onChange={setA} /><Slider label="b" value={b} min={xr[0]} max={xr[1]} step={0.1} onChange={setB} /></div>
    <Graph x={xr} y={yr} height={240} fns={[{ f: fn, color: C.grey, label: name }]} segments={[{ x1: a, y1: fn(a), x2: b, y2: fn(b), color: below ? C.red : C.teal, width: 2.5 }]} points={[{ x: a, y: fn(a) }, { x: b, y: fn(b) }]} />
    <Working rows={[['the chord from a to b', below ? 'dips below the curve somewhere' : 'stays on or above the curve', below ? 'not convex' : 'consistent with convex']]} />
  </div>
}

export function DescentLemmaFig() {
  const [eta, setEta] = useState(0.3), L = 2, x0 = 2.5
  const fn = x => x * x / 2 + 0.3 * Math.sin(3 * x) / 3 + 0.4 * x, d = x => x + 0.3 * Math.cos(3 * x) + 0.4
  const g = d(x0), worst = s => fn(x0) - g * s + (L / 2) * s * s, x1 = x0 - eta * g
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="η" value={eta} min={0.05} max={1.2} step={0.05} onChange={setEta} /></div>
    <Graph x={[-2, 3.5]} y={[-1, 6]} height={250} fns={[{ f: fn, color: C.grey, label: 'f' }, { f: x => worst(x0 - x), color: C.orange, dash: true, label: 'worst case', labelAt: -1.3 }]} points={[{ x: x0, y: fn(x0), color: C.grey, label: 'x' }, { x: x1, y: fn(x1), color: C.teal, label: 'after one step' }, { x: x1, y: worst(eta * g), color: C.orange }]} />
    <p className="qm-hint">This f has curvature at most L = 2. The orange parabola, f(x) − g·s + (L/2)s², is the descent lemma's ceiling.</p>
    <Working rows={[['actual drop', 'f(x) − f(x − ηg)', fmt(fn(x0) - fn(x1), 4)], ['guaranteed drop', 'η(1 − Lη/2) g²', fmt(eta * (1 - L * eta / 2) * g * g, 4)], ['best η', '1/L', fmt(1 / L, 3)], ['limit', '2/L', fmt(2 / L, 3)]]} />
  </div>
}

const NEWTON_F = { quartic: ['(x − 2)⁴ + x²', x => (x - 2) ** 4 + x * x, x => 4 * (x - 2) ** 3 + 2 * x, x => 12 * (x - 2) ** 2 + 2, [-1, 4], [-1, 25]], wavy: ['x⁴/4 − x²', x => x ** 4 / 4 - x * x, x => x ** 3 - 2 * x, x => 3 * x * x - 2, [-2.5, 2.5], [-1.5, 3]] }
export function NewtonFig() {
  const [which, setWhich] = useState('quartic'), [x0, setX0] = useState(0), [k, setK] = useState(0)
  const [name, fn, f1, f2, xr, yr] = NEWTON_F[which], path = newton(f1, f2, x0, 6), x = path[k]
  const para = t => fn(x) + f1(x) * (t - x) + 0.5 * f2(x) * (t - x) ** 2, target = path.at(-1)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>f <select value={which} onChange={e => { setWhich(e.target.value); setK(0); setX0(which === 'quartic' ? 0.3 : 0) }}>{Object.entries(NEWTON_F).map(([key, [n]]) => <option key={key} value={key}>{n}</option>)}</select></label><Slider label="start" value={x0} min={xr[0]} max={xr[1]} step={0.1} onChange={v => { setX0(v); setK(0) }} />
      <div className="qm-buttons"><button disabled={k >= 6} onClick={() => setK(k + 1)}>Newton step →</button><button onClick={() => setK(0)}>Restart</button></div></div>
    <Graph x={xr} y={yr} height={250} fns={[{ f: fn, color: C.grey, label: name }, { f: para, color: C.orange, dash: true }]} points={path.slice(0, k + 1).map((p, i) => ({ x: p, y: fn(p), color: i === k ? C.teal : C.grey }))} />
    <Working rows={path.slice(0, k + 1).map((p, i) => [`step ${i}`, `x = ${fmt(p, 10)}`, `f′ = ${Math.abs(f1(p)) < 1e-12 ? '0' : f1(p).toExponential(2)}`]).concat(f2(x) < 0 ? [['warning', 'f″ < 0 here: the parabola opens downward', 'the step goes toward a maximum']] : [])} />
  </div>
}

const XS = [1, 2, 3, 4, 5], YS = [2.1, 3.9, 6.2, 7.8, 10.1]
export function SGDFig() {
  const [batch, setBatch] = useState(1), eta = 0.01
  const path = sgd(XS, YS, eta, batch, 12, 3)
  const full = [0]; for (let i = 0; i < 60; i++) full.push(full.at(-1) - eta * fullGradient(full.at(-1), XS, YS))
  const one = i => 2 * (XS[i] - YS[i]) * XS[i], idx = XS.map((_, i) => i)
  const batches = batch === 1 ? idx.map(i => [i]) : batch === 2 ? idx.flatMap(i => idx.filter(j => j > i).map(j => [i, j])) : [idx]
  const grads = batches.map(bt => bt.reduce((s, i) => s + one(i), 0) / bt.length)
  const spread = Math.sqrt(grads.reduce((s, g) => s + (g - fullGradient(1, XS, YS)) ** 2, 0) / grads.length)
  const steps = Math.max(path.length, full.length)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Batch size <select value={batch} onChange={e => setBatch(Number(e.target.value))}>{[1, 2, 5].map(b => <option key={b} value={b}>{b}</option>)}</select></label></div>
    <Graph x={[0, steps]} y={[0, 2.6]} height={230} segments={[...full.slice(1).map((w, i) => ({ x1: i, y1: full[i], x2: i + 1, y2: w, color: C.grey, width: 2 })), ...path.slice(1).map((w, i) => ({ x1: i, y1: path[i], x2: i + 1, y2: w, color: C.teal, width: 1.5 }))]} xlabel="step" ylabel="w" />
    <Working rows={[['full gradient at w = 1', '', fmt(fullGradient(1, XS, YS), 4)], ['batch gradients at w = 1', `all ${grads.length} possible batches of size ${batch}`, grads.slice(0, 6).map(g => fmt(g, 2)).join(', ') + (grads.length > 6 ? ', …' : '')], ['their average', 'equals the full gradient (unbiased)', fmt(grads.reduce((s, g) => s + g, 0) / grads.length, 4)], ['their spread', 'shrinks as the batch grows', fmt(spread, 3)], ['final w', `${path.length - 1} steps of batch ${batch}`, fmt(path.at(-1), 4)]]} />
  </div>
}

export function MomentumFig() {
  const [beta, setBeta] = useState(0.8), eta = 0.018, steps = 45
  const grad = ([x, y]) => [x, 40 * y]
  const run = b => { let p = [-9, 1], v = [0, 0]; const out = [p]; for (let i = 0; i < steps; i++) { const g = grad(p); v = [b * v[0] + g[0], b * v[1] + g[1]]; p = [p[0] - eta * v[0], p[1] - eta * v[1]]; out.push(p) } return out }
  const plain = run(0), mom = run(beta)
  const line = (pts, color) => pts.slice(1).map((p, i) => ({ x1: pts[i][0], y1: pts[i][1], x2: p[0], y2: p[1], color }))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="momentum β" value={beta} min={0} max={0.95} step={0.05} onChange={setBeta} /></div>
    <Graph x={[-10, 1]} y={[-1.4, 1.4]} height={200} segments={[...line(plain, C.grey), ...line(mom, C.teal)]} points={[{ x: 0, y: 0, color: C.orange }]} />
    <Graph x={[0, 100]} y={[0, 0.11]} height={140} fns={[{ f: t => cosineSchedule(t, 100, 0.1, 0.001, 10), color: C.violet, label: 'warm-up, then cosine', labelAt: 35 }]} xlabel="training step" />
    <Working rows={[['distance from the minimum after 45 steps', 'plain gradient descent', fmt(Math.hypot(...plain.at(-1)), 4)], ['', `momentum β = ${fmt(beta, 2)}`, fmt(Math.hypot(...mom.at(-1)), 4)]]} />
  </div>
}

export function LagrangeFig() {
  const [angle, setAngle] = useState(60)
  const t = angle * Math.PI / 180, p = [Math.cos(t), Math.sin(t)], c = [2, 1], f = q => (q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2
  const gf = [2 * (p[0] - c[0]), 2 * (p[1] - c[1])], gg = [2 * p[0], 2 * p[1]], cross = gf[0] * gg[1] - gf[1] * gg[0]
  const r = Math.sqrt(f(p))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="position on the circle" value={angle} min={0} max={359} step={1} onChange={setAngle} show={v => `${v}°`} /></div>
    <Graph x={[-2, 3.5]} y={[-1.6, 2.4]} equal height={260} fns={[{ f: x => Math.sqrt(Math.max(0, 1 - x * x)), from: -1, to: 1, color: C.grey }, { f: x => -Math.sqrt(Math.max(0, 1 - x * x)), from: -1, to: 1, color: C.grey }, { f: x => c[1] + Math.sqrt(Math.max(0, r * r - (x - c[0]) ** 2)), from: c[0] - r, to: c[0] + r, color: C.orange, dash: true }, { f: x => c[1] - Math.sqrt(Math.max(0, r * r - (x - c[0]) ** 2)), from: c[0] - r, to: c[0] + r, color: C.orange, dash: true }]}
      arrows={[{ x1: p[0], y1: p[1], x2: p[0] + 0.25 * gf[0], y2: p[1] + 0.25 * gf[1], color: C.orange, label: '∇f' }, { x1: p[0], y1: p[1], x2: p[0] + 0.4 * gg[0], y2: p[1] + 0.4 * gg[1], color: C.teal, label: '∇g' }]} points={[{ x: c[0], y: c[1], color: C.orange, label: '(2, 1)' }, { x: p[0], y: p[1] }]} />
    <Working rows={[['f here', 'squared distance to (2, 1)', fmt(f(p), 4)], ['∇f and ∇g parallel?', 'cross product ∇f × ∇g', fmt(cross, 4)], ['best possible', 'at (2, 1)/√5', fmt((Math.sqrt(5) - 1) ** 2, 4)]]} />
  </div>
}

export function KKTFig() {
  const [c, setC] = useState(3)
  const [x, lam] = kktBounded(c, 1), path = projectedGd(t => 2 * (t - c), t => Math.min(t, 1), -1.5, 0.2, 12)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="c (where the unconstrained best is)" value={c} min={-1} max={3.5} step={0.1} onChange={setC} /></div>
    <Graph x={[-2, 4]} y={[-0.5, 12]} height={240} fns={[{ f: t => (t - c) ** 2, color: C.grey, label: '(x − c)²' }]} rects={[{ x: 1, y: -0.5, w: 3, h: 12.5, color: C.red, opacity: 0.08 }]}
      segments={[{ x1: 1, y1: -0.5, x2: 1, y2: 12, color: C.red, width: 2 }]} points={[...path.map((p, i) => ({ x: p, y: (p - c) ** 2, r: 3, color: i === path.length - 1 ? C.teal : C.grey })), { x, y: (x - c) ** 2, color: C.teal, label: `x* = ${fmt(x, 2)}` }]} />
    <Working rows={[['constraint', 'x ≤ 1 (shaded: not allowed)', c <= 1 ? 'slack' : 'binding'], ['multiplier λ', c <= 1 ? 'slack, so 0' : '2(c − 1)', fmt(lam, 3)], ['λ · g(x*)', 'complementary slackness', fmt(lam * (x - 1), 6)]]} />
  </div>
}

export function DualityFig() {
  const [lam, setLam] = useState(1)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="λ" value={lam} min={0} max={4} step={0.1} onChange={setLam} /></div>
    <Graph x={[-1, 3]} y={[-1, 5]} height={220} fns={[{ f: x => x * x, color: C.grey, label: 'f = x²' }, { f: x => x * x + lam * (1 - x), color: C.orange, dash: true, label: 'f + λ(1 − x)' }, { f: () => 1, color: C.teal, dash: true, label: 'p* = 1', labelAt: -0.6 }]}
      rects={[{ x: -1, y: -1, w: 2, h: 6, color: C.red, opacity: 0.06 }]} points={[{ x: lam / 2, y: dualValue(lam), color: C.orange, label: `q(λ) = ${fmt(dualValue(lam), 3)}` }, { x: 1, y: 1, color: C.teal }]} />
    <Graph x={[0, 4]} y={[-1, 1.5]} height={150} fns={[{ f: dualValue, color: C.orange, label: 'q(λ)' }, { f: () => 1, color: C.teal, dash: true }]} points={[{ x: lam, y: dualValue(lam), color: C.orange }]} xlabel="λ" />
    <Working rows={[['q(λ)', 'λ − λ²/4', fmt(dualValue(lam), 4)], ['gap to p*', '1 − q(λ), never negative', fmt(1 - dualValue(lam), 4)]]} />
  </div>
}

