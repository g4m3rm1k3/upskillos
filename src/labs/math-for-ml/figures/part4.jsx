// Part 4 figures: the 36 dice outcomes with events and conditions, a distribution and its balance
// point, spread as squares, Bayes with 1,000 people, area under a density, the normal curve in four
// steps, sample means bunching up, the likelihood of coin flips, covariance as rectangles, and PCA.
import { useState } from 'react'
import { twoDice, distribution, expectation, variance, bayes, normalPdf, sampleMeans, likelihood, logLikelihood, covariance, correlation, pca2, mean, area } from '../engine/maths.js'
import { Graph, Slider, Working, C, fmt } from './ui.jsx'

const EVENTS = { seven: ['total is 7', (a, b) => a + b === 7], ten: ['total is at least 10', (a, b) => a + b >= 10], double: ['a double', (a, b) => a === b], firstsix: ['first die is 6', a => a === 6], even: ['total is even', (a, b) => (a + b) % 2 === 0], small: ['total is 6 or less', (a, b) => a + b <= 6] }
export function DiceGrid({ conditional = false }) {
  const [ev, setEv] = useState(conditional ? 'small' : 'seven'), [given, setGiven] = useState(conditional ? 'even' : 'none')
  const A = EVENTS[ev][1], B = given === 'none' ? () => true : EVENTS[given][1]
  let inB = 0, both = 0
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (B(a, b)) { inB++; if (A(a, b)) both++ }
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Event A <select value={ev} onChange={e => setEv(e.target.value)}>{Object.entries(EVENTS).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></label>
      {conditional && <label>Given B <select value={given} onChange={e => setGiven(e.target.value)}><option value="none">nothing</option>{Object.entries(EVENTS).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></label>}</div>
    <table className="mm-dice"><thead><tr><th />{[1, 2, 3, 4, 5, 6].map(b => <th key={b}>{b}</th>)}</tr></thead><tbody>{[1, 2, 3, 4, 5, 6].map(a => <tr key={a}><th>{a}</th>{[1, 2, 3, 4, 5, 6].map(b => <td key={b} className={`${B(a, b) ? '' : 'mm-out'} ${A(a, b) && B(a, b) ? 'mm-hit' : ''}`}>{a + b}</td>)}</tr>)}</tbody></table>
    <Working rows={conditional && given !== 'none' ? [['outcomes in B', 'count', String(inB)], ['of those, also in A', 'count', String(both)], ['P(A | B)', `${both} / ${inB}`, fmt(both / inB, 4)]] : [['outcomes in A', 'count', String(both)], ['P(A)', `${both} / 36`, fmt(both / 36, 4)]]} />
  </div>
}

export function DistributionFig({ showMean = false }) {
  const [weights, setWeights] = useState([1, 1, 1, 1, 1, 1])
  const total = weights.reduce((a, b) => a + b, 0)
  const die = new Map()
  weights.forEach((w, i) => die.set(i + 1, w / total))
  const p = showMean ? die : distribution(twoDice())
  const mu = expectation(p), top = Math.max(...p.values())
  return <div className="qm-fig">
    {showMean && <div className="qm-fig-controls">{weights.map((w, i) => <Slider key={i} label={`face ${i + 1}`} value={w} min={0} max={5} step={1} onChange={v => setWeights(ws => { const n = ws.map((q, k) => k === i ? v : q); return n.some(q => q > 0) ? n : ws })} />)}</div>}
    <Graph x={showMean ? [0.3, 6.7] : [1.3, 12.7]} y={[0, top * 1.2]} height={240} rects={[...p].map(([x, px]) => ({ x: x - 0.35, y: 0, w: 0.7, h: px, color: C.teal, opacity: 0.55 }))}>
      {({ X, Y }) => showMean ? <polygon points={`${X(mu)},${Y(0)} ${X(mu) - 9},${Y(0) + 16} ${X(mu) + 9},${Y(0) + 16}`} fill={C.orange} transform={`translate(0,-16)`} /> : null}
    </Graph>
    <Working rows={[['Σ p(x)', 'all bars together', fmt([...p.values()].reduce((a, b) => a + b, 0), 4)], ['E[X]', 'Σ x p(x)', fmt(mu, 4)], ...(showMean ? [['Var(X)', 'Σ (x − μ)² p(x)', fmt(variance(p), 4)]] : [])]} />
  </div>
}

export function SpreadFig() {
  const [set, setSet] = useState('wide')
  const data = set === 'wide' ? [20, 40, 60, 80, 100] : [52, 56, 60, 64, 68], m = mean(data), v = mean(data.map(x => (x - m) ** 2))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Class <select value={set} onChange={e => setSet(e.target.value)}><option value="wide">spread out</option><option value="tight">close together</option></select></label></div>
    <Graph x={[10, 110]} y={[-45, 45]} height={220} equal grid={false} points={data.map(x => ({ x, y: 0, color: C.teal }))} segments={[{ x1: m, y1: -45, x2: m, y2: 45, dash: true, color: C.grey }]} rects={data.map(x => ({ x: m, y: 0, w: x - m, h: Math.abs(x - m) * (x < m ? -1 : 1), color: C.orange, opacity: 0.15 }))} />
    <Working rows={[['mean', '', fmt(m)], ['variance', 'average of the squared deviations', fmt(v, 2)], ['standard deviation σ', '√variance', fmt(Math.sqrt(v), 3)]]} />
  </div>
}

export function BayesFig() {
  const [prior, setPrior] = useState(0.01), [hit, setHit] = useState(0.9), [fa, setFa] = useState(0.05)
  const ill = Math.round(1000 * prior), tp = Math.round(ill * hit), fp = Math.round((1000 - ill) * fa)
  const cells = Array.from({ length: 1000 }, (_, i) => i < ill ? (i < tp ? 'tp' : 'fn') : (i - ill < fp ? 'fp' : 'tn'))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="prevalence P(ill)" value={prior} min={0.001} max={0.5} step={0.001} onChange={setPrior} show={v => fmt(v, 3)} /><Slider label="P(+ | ill)" value={hit} min={0.5} max={1} step={0.01} onChange={setHit} /><Slider label="P(+ | healthy)" value={fa} min={0} max={0.3} step={0.01} onChange={setFa} /></div>
    <div className="mm-people">{cells.map((c, i) => <span key={i} className={`mm-person ${c}`} />)}</div>
    <p className="tt-legend mm-legend"><span className="tp">■ ill, positive ({tp})</span> <span className="fn">■ ill, negative ({ill - tp})</span> <span className="fp">■ healthy, positive ({fp})</span> <span>□ healthy, negative</span></p>
    <Working rows={[['positives', `${tp} + ${fp}`, String(tp + fp)], ['ill among positives (counting)', `${tp} / ${tp + fp}`, fmt(tp / Math.max(1, tp + fp), 3)], ['Bayes\' rule', 'P(+|ill)P(ill) / P(+)', fmt(bayes(prior, hit, fa), 3)]]} />
  </div>
}

const DENSITIES = { uniform: ['uniform on [0, 1]', x => (x >= 0 && x <= 1 ? 1 : 0), [-0.5, 2.5]], ramp: ['p(x) = x/2 on [0, 2]', x => (x >= 0 && x <= 2 ? x / 2 : 0), [-0.5, 2.5]], normal: ['standard normal', x => normalPdf(x), [-4, 4]] }
export function DensityFig() {
  const [which, setWhich] = useState('ramp'), [a, setA] = useState(0), [b, setB] = useState(1)
  const [name, p, xr] = DENSITIES[which], lo = Math.min(a, b), hi = Math.max(a, b)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Density <select value={which} onChange={e => setWhich(e.target.value)}>{Object.entries(DENSITIES).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></label><Slider label="a" value={a} min={xr[0]} max={xr[1]} step={0.1} onChange={setA} /><Slider label="b" value={b} min={xr[0]} max={xr[1]} step={0.1} onChange={setB} /></div>
    <Graph x={xr} y={[-0.05, 1.2]} height={240} fns={[{ f: p, label: name }]} regions={[{ f: p, from: lo, to: hi, color: C.orange, opacity: 0.35 }]} />
    <Working rows={[[`P(${fmt(lo, 2)} ≤ X ≤ ${fmt(hi, 2)})`, '∫ p(x) dx: the orange area', fmt(area(p, lo, hi, 2000), 4)], ['total area', '∫ over everything', fmt(area(p, xr[0], xr[1], 4000), 3)]]} />
  </div>
}

export function NormalBuilder() {
  const [mu, setMu] = useState(0), [sigma, setSigma] = useState(1), [stepN, setStep] = useState(4)
  const fns = [x => Math.exp(-x * x), x => Math.exp(-((x - mu) ** 2)), x => Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)), x => normalPdf(x, mu, sigma)]
  const names = ['1. e^(−x²)', '2. e^(−(x − μ)²)', '3. e^(−(x − μ)²/(2σ²))', '4. ÷ σ√(2π): area 1']
  const g = fns[stepN - 1]
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="step" value={stepN} min={1} max={4} step={1} onChange={setStep} show={v => names[v - 1]} /><Slider label="μ" value={mu} min={-3} max={3} step={0.5} onChange={setMu} /><Slider label="σ" value={sigma} min={0.3} max={2.5} step={0.1} onChange={setSigma} /></div>
    <Graph x={[-6, 6]} y={[-0.05, stepN === 4 ? Math.max(0.5, normalPdf(mu, mu, sigma) * 1.25) : 1.15]} height={240} fns={[{ f: g, label: names[stepN - 1], labelAt: 5.5 }]} regions={stepN === 4 ? [{ f: g, from: mu - sigma, to: mu + sigma, color: C.orange, opacity: 0.3 }] : []} />
    <Working rows={[['area under this curve', '', fmt(area(g, -12, 12, 4000), 4)], ...(stepN === 4 ? [['area within ±1σ (shaded)', '', fmt(area(g, mu - sigma, mu + sigma, 2000), 4)], ['within ±2σ', '', fmt(area(g, mu - 2 * sigma, mu + 2 * sigma, 2000), 4)]] : [])]} />
  </div>
}

export function SamplingFig() {
  const [n, setN] = useState(1)
  const means = sampleMeans(n, 300, 7), m = mean(means), se = Math.sqrt(mean(means.map(x => (x - m) ** 2)))
  const bins = Array(25).fill(0)
  for (const x of means) bins[Math.min(24, Math.floor((x - 1) / 5 * 25))]++
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Dice per average n <select value={n} onChange={e => setN(Number(e.target.value))}>{[1, 2, 4, 9, 16, 36, 100].map(k => <option key={k} value={k}>{k}</option>)}</select></label></div>
    <Graph x={[1, 6]} y={[0, Math.max(...bins) * 1.15]} height={220} rects={bins.map((c, i) => ({ x: 1 + i * 0.2, y: 0, w: 0.2, h: c, color: C.teal, opacity: 0.6 }))} />
    <Working rows={[['spread of the 300 averages', 'measured', fmt(se, 3)], ['σ / √n', `1.708 / √${n}`, fmt(Math.sqrt(35 / 12) / Math.sqrt(n), 3)]]} />
  </div>
}

export function LikelihoodFig({ showSlope = false }) {
  const [flips, setFlips] = useState([1, 1, 0, 1, 0, 1, 1, 0, 1, 1]), [p, setP] = useState(0.5)
  const heads = flips.filter(x => x === 1).length, n = flips.length, phat = heads / n
  const dl = heads / p - (n - heads) / (1 - p)
  return <div className="qm-fig">
    <div className="mm-flips">{flips.map((x, i) => <button key={i} className={x ? 'mm-heads' : 'mm-tails'} onClick={() => setFlips(fs => fs.map((q, k) => k === i ? 1 - q : q))}>{x ? 'H' : 'T'}</button>)}<button onClick={() => setFlips(fs => fs.length < 20 ? [...fs, 1] : fs)}>+</button><button onClick={() => setFlips(fs => fs.length > 1 ? fs.slice(0, -1) : fs)}>−</button></div>
    <div className="qm-fig-controls"><Slider label="bias p" value={p} min={0.02} max={0.98} step={0.01} onChange={setP} /></div>
    {!showSlope && <Graph x={[0, 1]} y={[0, likelihood(phat, flips) * 1.2]} height={200} fns={[{ f: q => likelihood(q, flips), label: 'L(p)' }]} points={[{ x: p, y: likelihood(p, flips) }, { x: phat, y: likelihood(phat, flips), color: C.violet, label: 'peak' }]} />}
    <Graph x={[0, 1]} y={[Math.max(-30, logLikelihood(0.05, flips), logLikelihood(0.95, flips)) - 2, 0.5]} height={200} fns={[{ f: q => logLikelihood(q, flips), label: 'log L(p)', color: C.orange }, ...(showSlope ? [{ f: q => logLikelihood(p, flips) + dl * (q - p), color: C.grey, dash: true }] : [])]} points={[{ x: p, y: logLikelihood(p, flips), color: C.orange }, { x: phat, y: logLikelihood(phat, flips), color: C.violet }]} />
    <Working rows={[['heads / flips', `${heads} / ${n}`, fmt(phat, 3)], ['L(p)', `p^${heads} (1 − p)^${n - heads}`, fmt(likelihood(p, flips), 6)], ['log L(p)', `${heads} log p + ${n - heads} log(1 − p)`, fmt(logLikelihood(p, flips), 4)], ...(showSlope ? [['slope of log L', `${heads}/p − ${n - heads}/(1 − p)`, fmt(dl, 3)]] : [])]} />
  </div>
}

export function ScatterFig() {
  const [pts, setPts] = useState([[1, 2], [2, 3], [3, 5], [4, 4], [5, 6]])
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), mx = mean(xs), my = mean(ys)
  return <div className="qm-fig">
    <Graph x={[-1, 8]} y={[-1, 8]} equal onDrag={(i, x, y) => setPts(p => p.map((q, k) => k === i ? [Math.round(x * 2) / 2, Math.round(y * 2) / 2] : q))}
      rects={pts.map(([x, y]) => ({ x: mx, y: my, w: x - mx, h: y - my, color: (x - mx) * (y - my) >= 0 ? C.teal : C.orange, opacity: 0.2 }))} segments={[{ x1: mx, y1: -1, x2: mx, y2: 8, dash: true, color: C.grey }, { x1: -1, y1: my, x2: 8, y2: my, dash: true, color: C.grey }]} points={pts.map(([x, y]) => ({ x, y, drag: true }))} />
    <Working rows={[['Cov(X, Y)', 'average of (x − x̄)(y − ȳ)', fmt(covariance(xs, ys), 3)], ['ρ', 'Cov / (σₓ σᵧ)', fmt(correlation(xs, ys), 3)]]} />
  </div>
}

export function PCAFig() {
  const [pts, setPts] = useState([[1, 2], [2, 3], [3, 5], [4, 4], [5, 6], [2.5, 2], [4, 6]])
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), mx = mean(xs), my = mean(ys)
  const [v, big, small] = pca2(xs, ys), w = [-v[1], v[0]]
  const k1 = 2 * Math.sqrt(big), k2 = 2 * Math.sqrt(Math.max(0, small))
  return <div className="qm-fig">
    <Graph x={[-1, 8]} y={[-1, 8]} equal onDrag={(i, x, y) => setPts(p => p.map((q, k) => k === i ? [x, y] : q))} points={pts.map(([x, y]) => ({ x, y, drag: true, color: C.teal }))}
      arrows={[{ x1: mx, y1: my, x2: mx + k1 * v[0], y2: my + k1 * v[1], label: 'PC 1', color: C.violet }, { x1: mx, y1: my, x2: mx + k2 * w[0], y2: my + k2 * w[1], label: 'PC 2', color: C.orange }]} />
    <Working rows={[['variance along PC 1', 'larger eigenvalue', fmt(big, 3)], ['variance along PC 2', 'smaller eigenvalue', fmt(small, 3)], ['share kept by PC 1 alone', 'λ₁ / (λ₁ + λ₂)', fmt(big / (big + small), 3)]]} />
  </div>
}
