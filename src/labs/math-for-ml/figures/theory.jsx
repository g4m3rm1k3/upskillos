// Figures for the learning-theory lessons.
import { useMemo, useState } from 'react'
import { trainAndTest, polyValue, simulatedTail, hoeffdingTail, chebyshevTail, finiteClassGap, ermThresholds, thresholdPatterns, intervalPatterns, halfplanePatterns, sauerBound, doubleDescent, doubleDescentBeta, fitFirstP, excessRisk, PyRandom, pyGauss } from '../engine/maths.js'
import { Graph, Slider, Working, C, fmt } from './ui.jsx'

const log10 = v => Math.log10(Math.max(v, 1e-6))

export function GeneralisationFig() {
  const [degree, setDegree] = useState(3)
  const runs = useMemo(() => Array.from({ length: 15 }, (_, d) => trainAndTest(d)), [])
  const [train, test, coeffs, xs, ys] = runs[degree]
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="polynomial degree" value={degree} min={0} max={14} step={1} onChange={setDegree} show={v => String(v)} /></div>
    <Graph x={[-1, 1]} y={[-1.8, 1.8]} height={220} fns={[{ f: x => Math.sin(3 * x), color: C.grey, dash: true, label: 'truth sin 3x', labelAt: -0.55 }, { f: x => polyValue(coeffs, x), color: C.violet }]}
      points={xs.map((x, i) => ({ x, y: ys[i], color: C.teal, r: 3.5 }))} />
    <Graph x={[-0.5, 14.5]} y={[-3, 4]} height={200} ylabel="log₁₀ error" xlabel="degree"
      points={runs.flatMap(([tr, te], d) => [{ x: d, y: log10(tr), color: C.teal, r: d === degree ? 5 : 3 }, { x: d, y: Math.min(4, log10(te)), color: C.orange, r: d === degree ? 5 : 3 }])}
      segments={[{ x1: -0.5, y1: log10(0.04), x2: 14.5, y2: log10(0.04), color: C.grey, dash: true }]} />
    <Working rows={[['training error', `degree ${degree}`, fmt(train, 4)], ['test error', '200 fresh points', fmt(test, 4)], ['noise level', 'σ² = 0.2² (dashed line)', '0.04']]} />
  </div>
}

const TAIL_NS = Array.from({ length: 24 }, (_, i) => 10 + 20 * i)
export function HoeffdingFig() {
  const [eps, setEps] = useState(0.1), [n, setN] = useState(150)
  const sims = useMemo(() => TAIL_NS.map(m => simulatedTail(m, eps, 0.5, 400, 1)), [eps])
  const here = simulatedTail(n, eps, 0.5, 400, 1)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="distance ε" value={eps} min={0.04} max={0.25} step={0.01} onChange={setEps} /><Slider label="samples n" value={n} min={10} max={470} step={20} onChange={setN} show={v => String(v)} /></div>
    <Graph x={[0, 480]} y={[-4, 0.2]} height={240} ylabel="log₁₀ probability" xlabel="n"
      fns={[{ f: m => log10(hoeffdingTail(m, eps)), color: C.orange, label: 'Hoeffding', labelAt: 380 }, { f: m => log10(chebyshevTail(m, eps)), color: C.grey, label: 'Chebyshev', labelAt: 300 }]}
      points={TAIL_NS.flatMap((m, i) => (sims[i] > 0 ? [{ x: m, y: log10(sims[i]), color: C.teal, r: m === n ? 5 : 3 }] : []))}
      segments={[{ x1: n, y1: -4, x2: n, y2: 0.2, color: C.violet, dash: true }]} />
    <Working rows={[['measured', '400 runs of n flips', fmt(here, 4)], ['Hoeffding', '2e^(−2nε²)', fmt(hoeffdingTail(n, eps), 4)], ['Chebyshev', '1/(4nε²)', fmt(chebyshevTail(n, eps), 4)]]} />
  </div>
}

export function UnionBoundFig() {
  const [n, setN] = useState(60), [size, setSize] = useState(21)
  const [train, trueErr, bad] = useMemo(() => ermThresholds(n, size, 100, 2), [n, size])
  const eps = finiteClassGap(size, n, 0.05)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="training examples n" value={n} min={20} max={400} step={20} onChange={setN} show={v => String(v)} /><Slider label="thresholds in the class |H|" value={size} min={2} max={101} step={1} onChange={setSize} show={v => String(v)} /></div>
    <Graph x={[0, 400]} y={[0, 0.6]} height={200} xlabel="n" ylabel="ε"
      fns={[1, 21, 1000, 1e6].map((k, i) => ({ f: m => finiteClassGap(k, m, 0.05), color: [C.teal, C.violet, C.orange, C.red][i], label: `|H| = ${k >= 1000 ? k.toExponential(0) : k}`, labelAt: 60 + 90 * i }))}
      points={[{ x: n, y: eps, color: C.grey, r: 5 }]} />
    <Working rows={[
      ['chosen threshold\'s training error', 'average over 100 training sets', fmt(train, 4)],
      ['its true error', '0.1 + 0.8 |t − 0.3|', fmt(trueErr, 4)],
      ['best possible true error', 't = 0.3', '0.1'],
      ['union bound ε', `|H| = ${size}, δ = 0.05`, fmt(eps, 4)],
      ['training sets where some gap exceeded ε', 'the bound allows 5%', `${fmt(100 * bad, 1)}%`],
    ]} />
  </div>
}

const LINE_PTS = [1, 2, 3, 4, 5], PLANE_PTS = [[0, 0], [2, 0], [1, 1.7], [1, 0.6], [2.4, 1.6]]
const FAMILIES = {
  thresholds: ['thresholds on a line (x > t)', 1, k => thresholdPatterns(LINE_PTS.slice(0, k))],
  intervals: ['intervals on a line (l < x < u)', 2, k => intervalPatterns(LINE_PTS.slice(0, k))],
  halfplanes: ['half-planes in the plane', 3, k => halfplanePatterns(PLANE_PTS.slice(0, k), 360)],
}
export function ShatterFig() {
  const [family, setFamily] = useState('halfplanes'), [k, setK] = useState(4)
  const [name, d, make] = FAMILIES[family], found = make(k)
  const all = Array.from({ length: 2 ** k }, (_, m) => Array.from({ length: k }, (_, i) => (m >> (k - 1 - i)) & 1).join(''))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Family <select value={family} onChange={e => setFamily(e.target.value)}>{Object.entries(FAMILIES).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}</select></label><Slider label="points" value={k} min={1} max={5} step={1} onChange={setK} show={v => String(v)} /></div>
    {family === 'halfplanes'
      ? <Graph x={[-0.5, 3]} y={[-0.4, 2]} equal height={160} points={PLANE_PTS.slice(0, k).map(([x, y], i) => ({ x, y, color: C.teal, r: 5, label: `p${i + 1}` }))} />
      : <Graph x={[0, 6]} y={[-0.5, 0.5]} height={70} yaxis={false} points={LINE_PTS.slice(0, k).map((x, i) => ({ x, y: 0, color: C.teal, r: 5, label: `x${i + 1}` }))} />}
    <div className="mm-chips">{all.map(p => <span key={p} className={`mm-chip mm-key${found.has(p) ? ' mm-chosen' : ''}`}>{p}</span>)}</div>
    <Working rows={[['labellings produced', name, String(found.size)], ['all labellings', '2ⁿ', String(2 ** k)], ['Sauer\'s bound', `VC dimension ${d}`, String(sauerBound(k, d))], ['shattered?', '', found.size === 2 ** k ? 'yes' : 'no']]} />
    {family === 'halfplanes' && k === 4 && <p className="qm-hint">p4 lies inside the triangle p1 p2 p3: no half-plane holds the corners without it (case (b) of the proof).</p>}
  </div>
}

const DD_N = 20, DD_D = 60
export function DoubleDescentFig() {
  const [p, setP] = useState(40)
  const curve = useMemo(() => doubleDescent(DD_D, DD_N, 0.2, 12, 0), [])
  const one = useMemo(() => { const beta = doubleDescentBeta(DD_D), rng = new PyRandom(11), X = Array.from({ length: DD_N }, () => Array.from({ length: DD_D }, () => pyGauss(rng))), ys = X.map(row => row.reduce((s, a, i) => s + a * beta[i], 0) + pyGauss(rng, 0, 0.2)); return { X, ys, beta } }, [])
  const w = fitFirstP(one.X, one.ys, p), length = Math.sqrt(w.reduce((s, a) => s + a * a, 0))
  const best = curve.slice(0, DD_N - 1).reduce((b, r, i) => (r < curve[b] ? i : b), 0)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="features used p" value={p} min={1} max={DD_D} step={1} onChange={setP} show={v => String(v)} /></div>
    <Graph x={[0, 61]} y={[-0.6, 2.4]} height={240} xlabel="p" ylabel="log₁₀ excess risk"
      points={curve.map((r, i) => ({ x: i + 1, y: Math.min(2.4, log10(r)), color: i + 1 === p ? C.violet : i + 1 < DD_N ? C.teal : i + 1 === DD_N ? C.red : C.orange, r: i + 1 === p ? 5 : 3 }))}
      segments={[{ x1: DD_N, y1: -0.6, x2: DD_N, y2: 2.4, color: C.red, dash: true }, { x1: 0, y1: log10(curve[best]), x2: 61, y2: log10(curve[best]), color: C.grey, dash: true }]} />
    <Working rows={[
      ['regime', p < DD_N ? 'p < n' : p === DD_N ? 'p = n' : 'p > n', p < DD_N ? 'least squares' : p === DD_N ? 'interpolation threshold' : 'minimum-norm exact fit'],
      ['average excess risk', `p = ${p}`, fmt(curve[p - 1], 4)],
      ['best with p < n (dashed)', `p = ${best + 1}`, fmt(curve[best], 4)],
      ['one training set: ‖w‖', 'length of the fitted weights', fmt(length, 3)],
      ['one training set: excess risk', '', fmt(excessRisk(w, one.beta), 4)],
    ]} />
  </div>
}
