// Figures for the probability additions. Randomness comes from PyRandom with fixed seeds, so every
// picture matches what the Python programs would draw.
import { useMemo, useState } from 'react'
import { PyRandom, independent, poissonPmf, binomialPmf, sampleExponential, sampleCategorical, standardizedSums, normalPdf, mvnPdf, cholesky, symmetricEigen, transformedDensity, permutationPValue, mean, entropyBits, markovStep, stationary } from '../engine/maths.js'
import { Graph, Slider, Bars, Working, C, fmt } from './ui.jsx'

const DICE = []
for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) DICE.push([a, b])
const DiceGrid = ({ cell }) => <table className="mm-dice"><tbody>{[1, 2, 3, 4, 5, 6].map(b => <tr key={b}>{[1, 2, 3, 4, 5, 6].map(a => cell([a, b]))}</tr>)}</tbody></table>

const IE_EVENTS = [['A: first is 6', o => o[0] === 6], ['B: second is 6', o => o[1] === 6], ['C: total is 7', o => o[0] + o[1] === 7]]
export function InclusionExclusionFig() {
  const count = o => IE_EVENTS.filter(([, e]) => e(o)).length
  const tally = m => [m, -(m * (m - 1)) / 2, (m * (m - 1) * (m - 2)) / 6]
  return <div className="qm-fig">
    <p className="qm-hint">Each cell: the first die across, the second down. The number is how many of A, B, C it belongs to.</p>
    <DiceGrid cell={o => { const m = count(o); return <td key={o.join()} className={m ? 'mm-pick' : 'mm-out'}>{m || ''}</td> }} />
    <Working rows={[1, 2].map(m => [`an outcome in ${m} event${m > 1 ? 's' : ''}`, `singles ${tally(m)[0]}, pairs ${tally(m)[1]}, triple ${tally(m)[2]}`, `counted ${tally(m).reduce((s, v) => s + v, 0)} time`]).concat([['P(A or B or C)', '(18 − 3 + 0) / 36', fmt(15 / 36, 4)]])} />
  </div>
}

const IND_EVENTS = { even: ['first die even', o => o[0] % 2 === 0], seven: ['total is 7', o => o[0] + o[1] === 7], six: ['first die is 6', o => o[0] === 6], twelve: ['total is 12', o => o[0] + o[1] === 12], big: ['total ≥ 10', o => o[0] + o[1] >= 10], double: ['a double', o => o[0] === o[1]] }
export function IndependenceFig() {
  const [a, setA] = useState('even'), [b, setB] = useState('seven')
  const [na, A] = IND_EVENTS[a], [nb, B] = IND_EVENTS[b]
  const pa = DICE.filter(A).length, pb = DICE.filter(B).length, pab = DICE.filter(o => A(o) && B(o)).length
  const pick = (v, set) => <select value={v} onChange={e => set(e.target.value)}>{Object.entries(IND_EVENTS).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select>
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>A {pick(a, setA)}</label><label>B {pick(b, setB)}</label></div>
    <DiceGrid cell={o => <td key={o.join()} className="mm-chipcell" style={{ background: A(o) && B(o) ? '#5b4bb555' : A(o) ? '#1f6f6833' : B(o) ? '#c26a1233' : undefined }}>{A(o) && B(o) ? 'A∩B' : A(o) ? 'A' : B(o) ? 'B' : ''}</td>} />
    <Working rows={[['P(A)', `${pa}/36`, fmt(pa / 36, 4)], ['P(B)', `${pb}/36`, fmt(pb / 36, 4)], ['P(A and B)', `${pab}/36`, fmt(pab / 36, 4)], ['P(A) P(B)', '', fmt(pa * pb / 1296, 4)], [`${na} and ${nb}`, '', independent(A, B, DICE) ? 'independent' : 'dependent']]} />
  </div>
}

const GALLERY = {
  bernoulli: ['Bernoulli(p)', true, ({ p }) => [1 - p, p], ({ p }) => p, (prm, r) => (r.random() < prm.p ? 1 : 0)],
  binomial: ['Binomial(10, p)', true, ({ p }) => Array.from({ length: 11 }, (_, k) => binomialPmf(k, 10, p)), ({ p }) => 10 * p, (prm, r) => { let s = 0; for (let i = 0; i < 10; i++) s += r.random() < prm.p ? 1 : 0; return s }],
  poisson: ['Poisson(λ)', true, ({ lam }) => Array.from({ length: 16 }, (_, k) => poissonPmf(k, lam)), ({ lam }) => lam, (prm, r) => { let k = 0, t = sampleExponential(prm.lam, r); while (t < 1) { k++; t += sampleExponential(prm.lam, r) } return k }],
  categorical: ['Categorical(0.2, 0.5, 0.3)', true, () => [0.2, 0.5, 0.3], () => 1.1, (prm, r) => sampleCategorical([0.2, 0.5, 0.3], r)],
  uniform: ['Uniform(0, 2)', false, () => x => (x >= 0 && x <= 2 ? 0.5 : 0), () => 1, (prm, r) => 2 * r.random()],
  exponential: ['Exponential(λ)', false, ({ lam }) => x => (x >= 0 ? lam * Math.exp(-lam * x) : 0), ({ lam }) => 1 / lam, (prm, r) => sampleExponential(prm.lam, r)],
}
export function DistributionGalleryFig() {
  const [which, setWhich] = useState('poisson'), [p, setP] = useState(0.3), [lam, setLam] = useState(3), [n, setN] = useState(500)
  const [name, discrete, shape, meanOf, draw] = GALLERY[which], prm = { p, lam }
  const draws = useMemo(() => { const r = new PyRandom(11); return Array.from({ length: n }, () => draw(prm, r)) }, [which, p, lam, n])
  const sampleMean = mean(draws)
  let picture
  if (discrete) {
    const probs = shape(prm), counts = probs.map((_, k) => draws.filter(d => d === k).length / n)
    picture = <Graph x={[-0.7, probs.length - 0.3]} y={[0, Math.max(...probs, ...counts) * 1.2]} height={220} rects={[...probs.map((q, k) => ({ x: k - 0.35, y: 0, w: 0.35, h: q, color: C.teal, opacity: 0.85 })), ...counts.map((q, k) => ({ x: k, y: 0, w: 0.35, h: q, color: C.orange, opacity: 0.7 }))]} xlabel="value" />
  } else {
    const dens = shape(prm), hi = which === 'uniform' ? 2.5 : 5 / lam + 0.5, bins = 25, w = hi / bins
    const hist = Array.from({ length: bins }, (_, i) => draws.filter(d => d >= i * w && d < (i + 1) * w).length / (n * w))
    picture = <Graph x={[-0.2, hi]} y={[0, Math.max(dens(0.0001), ...hist) * 1.2]} height={220} fns={[{ f: dens, color: C.teal }]} rects={hist.map((h, i) => ({ x: i * w, y: 0, w, h, color: C.orange, opacity: 0.35 }))} xlabel="value" />
  }
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Distribution <select value={which} onChange={e => setWhich(e.target.value)}>{Object.entries(GALLERY).map(([k, [nm]]) => <option key={k} value={k}>{nm}</option>)}</select></label>
      {(which === 'bernoulli' || which === 'binomial') && <Slider label="p" value={p} min={0.05} max={0.95} step={0.05} onChange={setP} />}
      {(which === 'poisson' || which === 'exponential') && <Slider label="λ" value={lam} min={0.5} max={6} step={0.5} onChange={setLam} />}
      <Slider label="draws" value={n} min={20} max={4000} step={20} onChange={setN} show={v => String(v)} /></div>
    {picture}
    <p className="qm-hint">Teal: the exact probabilities or density. Orange: the {n} draws{which === 'poisson' ? ' (each made by adding exponential waiting times until one unit of time has passed)' : ''}.</p>
    <Working rows={[['mean', 'exact', fmt(meanOf(prm), 4)], ['mean', `of the ${n} draws`, fmt(sampleMean, 4)]]} />
  </div>
}

export function JointTableFig() {
  const [cells, setCells] = useState([4, 1, 1, 4]), [row, setRow] = useState(1)
  const total = cells.reduce((s, v) => s + v, 0), p = cells.map(v => v / total)
  const px = [p[0] + p[1], p[2] + p[3]], py = [p[0] + p[2], p[1] + p[3]], X = ['sun', 'rain'], Y = ['walk', 'bus']
  const set = i => v => setCells(c => c.map((x, j) => (j === i ? v : x)))
  return <div className="qm-fig">
    <div className="qm-fig-controls">{X.flatMap((x, i) => Y.map((y, j) => <Slider key={`${x}${y}`} label={`${x}, ${y}`} value={cells[2 * i + j]} min={0} max={10} step={1} onChange={set(2 * i + j)} show={v => String(v)} />))}</div>
    <table className="mm-dice mm-truth"><thead><tr><th></th>{Y.map(y => <th key={y}>{y}</th>)}<th>p(x)</th></tr></thead><tbody>
      {X.map((x, i) => <tr key={x} className={row === i ? 'mm-pick' : ''} onClick={() => setRow(i)}><th>{x}</th>{Y.map((y, j) => <td key={y}>{fmt(p[2 * i + j], 3)}</td>)}<td>{fmt(px[i], 3)}</td></tr>)}
      <tr><th>p(y)</th>{py.map((v, j) => <td key={j}>{fmt(v, 3)}</td>)}<td>1</td></tr></tbody></table>
    <p className="qm-hint">Click a row to condition on it.</p>
    <Working rows={[[`p(y | ${X[row]})`, 'the row, divided by its total', Y.map((y, j) => `${y} ${fmt(p[2 * row + j] / px[row], 3)}`).join(', ')], ['if independent', 'p(x) p(y) for the top-left cell', `${fmt(px[0] * py[0], 3)} vs ${fmt(p[0], 3)}`],
      ['independent?', '', Math.abs(px[0] * py[0] - p[0]) < 1e-9 && Math.abs(px[1] * py[1] - p[3]) < 1e-9 ? 'yes' : 'no']]} />
  </div>
}

const convolve = (a, b) => { const out = Array(a.length + b.length - 1).fill(0); a.forEach((x, i) => b.forEach((y, j) => { out[i + j] += x * y })); return out }
export function ConvolutionFig() {
  const [n, setN] = useState(2), die = Array(6).fill(1 / 6)
  let dist = die; for (let i = 1; i < n; i++) dist = convolve(dist, die)
  const values = dist.map((_, k) => k + n), mu = 3.5 * n, sd = Math.sqrt(n * 35 / 12)
  return <div className="qm-fig">
    <div className="qm-buttons"><button disabled={n <= 1} onClick={() => setN(n - 1)}>− a die</button><button disabled={n >= 12} onClick={() => setN(n + 1)}>+ a die (convolve)</button></div>
    <Graph x={[n - 1, 6 * n + 1]} y={[0, Math.max(...dist) * 1.25]} height={220} rects={dist.map((q, k) => ({ x: values[k] - 0.4, y: 0, w: 0.8, h: q, color: C.teal, opacity: 0.8 }))} fns={n >= 3 ? [{ f: x => normalPdf(x, mu, sd), color: C.orange, dash: true }] : []} xlabel={`total of ${n} dice`} />
    <Working rows={[['dice', '', String(n)], ['mean', '3.5 × n', fmt(mu, 3)], ['standard deviation', '√(n × 35/12)', fmt(sd, 3)]]} />
  </div>
}

export function LargeNumbersFig() {
  const [n, setN] = useState(400)
  const runs = useMemo(() => [0, 1, 2, 3, 4].map(seed => { const r = new PyRandom(seed); let t = 0; return Array.from({ length: 2000 }, (_, i) => { t += 1 + r.randrange(6); return t / (i + 1) }) }), [])
  const sigma = Math.sqrt(35 / 12), band = k => sigma / Math.sqrt(k * 0.05)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="rolls shown" value={n} min={20} max={2000} step={20} onChange={setN} show={v => String(v)} /></div>
    <Graph x={[0, n]} y={[1.5, 5.5]} height={240} fns={[{ f: () => 3.5, dash: true, color: C.grey }, { f: k => 3.5 + band(Math.max(k, 1)), color: C.orange, dash: true, from: 5 }, { f: k => 3.5 - band(Math.max(k, 1)), color: C.orange, dash: true, from: 5 }]}
      segments={runs.flatMap((run, s) => run.slice(1, n).map((v, i) => ({ x1: i + 1, y1: run[i], x2: i + 2, y2: v, color: [C.teal, C.violet, C.blue, C.red, C.gold][s], width: 1.2 })))} xlabel="number of rolls n" />
    <p className="qm-hint">Orange: Chebyshev's band, outside which an average lands at most 5% of the time: σ/√(0.05 n).</p>
    <Working rows={runs.map((run, s) => [`run ${s + 1}`, `average after ${n}`, fmt(run[n - 1], 4)])} />
  </div>
}

const CLT_SOURCES = { uniform: ['uniform(0, 1)', (r) => r.random(), 0.5, Math.sqrt(1 / 12)], exponential: ['exponential(1): lopsided', (r) => sampleExponential(1, r), 1, 1], coin: ['a 90/10 coin', (r) => (r.random() < 0.1 ? 1 : 0), 0.1, Math.sqrt(0.09)] }
export function CLTFig() {
  const [which, setWhich] = useState('exponential'), [n, setN] = useState(1)
  const [name, draw, mu, sd] = CLT_SOURCES[which]
  const z = useMemo(() => { const r = new PyRandom(3); return Array.from({ length: 4000 }, () => { let s = 0; for (let i = 0; i < n; i++) s += draw(r); return (s - n * mu) / (sd * Math.sqrt(n)) }) }, [which, n])
  const bins = 40, lo = -4, w = 8 / bins, hist = Array.from({ length: bins }, (_, i) => z.filter(v => v >= lo + i * w && v < lo + (i + 1) * w).length / (z.length * w))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Draw from <select value={which} onChange={e => setWhich(e.target.value)}>{Object.entries(CLT_SOURCES).map(([k, [nm]]) => <option key={k} value={k}>{nm}</option>)}</select></label><Slider label="n per sum" value={n} min={1} max={60} step={1} onChange={setN} show={v => String(v)} /></div>
    <Graph x={[-4, 4]} y={[0, Math.max(0.6, ...hist) * 1.1]} height={230} rects={hist.map((h, i) => ({ x: lo + i * w, y: 0, w, h, color: C.teal, opacity: 0.45 }))} fns={[{ f: x => normalPdf(x), color: C.orange, label: 'standard normal', labelAt: -2.6 }]} xlabel="standardised sum Z" />
    <Working rows={[['within ±1', 'normal: 0.683', fmt(z.filter(v => Math.abs(v) <= 1).length / z.length, 3)], ['within ±2', 'normal: 0.954', fmt(z.filter(v => Math.abs(v) <= 2).length / z.length, 3)]]} />
  </div>
}

export function ChangeOfVariablesFig() {
  const [k, setK] = useState(4)
  const draws = useMemo(() => { const r = new PyRandom(2); return Array.from({ length: 6000 }, () => { let s = 0; for (let i = 0; i < 12; i++) s += r.random(); return Math.exp(s - 6) }) }, [])
  const p = y => transformedDensity(x => normalPdf(x), Math.log, t => 1 / t, y), naive = y => normalPdf(Math.log(y))
  const hi = 6, bins = 40, w = hi / bins, hist = Array.from({ length: bins }, (_, i) => draws.filter(d => d >= i * w && d < (i + 1) * w).length / (draws.length * w))
  const strips = Array.from({ length: k }, (_, i) => -1.5 + 3 * i / k)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="strips" value={k} min={2} max={8} step={1} onChange={setK} show={v => String(v)} /></div>
    <Graph x={[0.001, hi]} y={[0, 0.75]} height={240} rects={hist.map((h, i) => ({ x: i * w, y: 0, w, h, color: C.grey, opacity: 0.3 }))}
      fns={[{ f: y => (y > 0 ? p(y) : NaN), color: C.teal, label: 'φ(ln y)/y' }, { f: y => (y > 0 ? naive(y) : NaN), color: C.red, dash: true, label: 'φ(ln y): wrong', labelAt: 4.3 }]}
      segments={strips.map(x => ({ x1: Math.exp(x), y1: 0, x2: Math.exp(x), y2: 0.75, color: C.violet, dash: true }))} xlabel="y = eˣ" />
    <p className="qm-hint">Grey: 6000 samples of Y = eˣ with X ≈ normal. Violet lines: images of equally spaced x values; strips of equal width in x become wider strips in y, so the density thins out to the right.</p>
  </div>
}

export function MultivariateGaussianFig() {
  const [s1, setS1] = useState(1.5), [s2, setS2] = useState(0.8), [rho, setRho] = useState(0.6)
  const S = [[s1 * s1, rho * s1 * s2], [rho * s1 * s2, s2 * s2]], L = cholesky(S), [vals, vecs] = symmetricEigen(S)
  const samples = useMemo(() => { const r = new PyRandom(9), pts = []; for (let i = 0; i < 300; i++) { const z = [gauss(r), gauss(r)]; pts.push([L[0][0] * z[0], L[1][0] * z[0] + L[1][1] * z[1]]) } return pts }, [s1, s2, rho])
  const peak = mvnPdf([0, 0], [0, 0], S)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="σ₁" value={s1} min={0.4} max={2.5} step={0.1} onChange={setS1} /><Slider label="σ₂" value={s2} min={0.4} max={2.5} step={0.1} onChange={setS2} /><Slider label="correlation ρ" value={rho} min={-0.9} max={0.9} step={0.05} onChange={setRho} /></div>
    <Graph x={[-5, 5]} y={[-4, 4]} equal height={280}
      arrows={vecs.map((v, i) => ({ x1: 0, y1: 0, x2: 2 * Math.sqrt(vals[i]) * v[0], y2: 2 * Math.sqrt(vals[i]) * v[1], color: i ? C.violet : C.orange, label: `2√λ${i + 1}` }))}
      background={({ X, Y }) => <g>{[0.1, 0.3, 0.6].map(level => { const pts = []; for (let i = 0; i <= 96; i++) { const t = 2 * Math.PI * i / 96, r = Math.sqrt(-2 * Math.log(level)), z = [r * Math.cos(t), r * Math.sin(t)]; pts.push(`${i ? 'L' : 'M'}${X(L[0][0] * z[0]).toFixed(1)},${Y(L[1][0] * z[0] + L[1][1] * z[1]).toFixed(1)}`) } return <path key={level} d={pts.join(' ')} fill={C.teal} fillOpacity={0.12} stroke={C.teal} /> })}{samples.map(([x, y], i) => <circle key={`s${i}`} cx={X(x)} cy={Y(y)} r={1.6} fill={C.grey} />)}</g>} />
    <Working rows={[['Σ', `[[${fmt(S[0][0], 3)}, ${fmt(S[0][1], 3)}], [${fmt(S[1][0], 3)}, ${fmt(S[1][1], 3)}]]`, ''], ['eigenvalues of Σ', 'squared half-axes (in σ units)', vals.map(v => fmt(v, 3)).join(', ')], ['peak density', '1/(2π√det Σ)', fmt(peak, 4)]]} />
  </div>
}
function gauss(r) { const u = 1 - r.random(), v = r.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }

export function BetaPosteriorFig() {
  const [a, setA] = useState(2), [b, setB] = useState(2), [h, setH] = useState(7), [t, setT] = useState(3)
  const shape = (aa, bb) => x => (x > 0 && x < 1 ? x ** (aa - 1) * (1 - x) ** (bb - 1) : 0)
  const normalise = g => { let s = 0; for (let i = 0; i < 2000; i++) s += g((i + 0.5) / 2000) / 2000; return x => g(x) / s }
  const prior = normalise(shape(a, b)), like = normalise(shape(h + 1, t + 1)), post = normalise(shape(a + h, b + t))
  let pm = 0; for (let i = 0; i < 2000; i++) { const x = (i + 0.5) / 2000; pm += x * post(x) / 2000 }
  const top = Math.max(...[0.02, 0.5, 0.98].concat(Array.from({ length: 50 }, (_, i) => (i + 0.5) / 50)).map(x => Math.max(prior(x), like(x), post(x))))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="prior a" value={a} min={1} max={20} step={1} onChange={setA} show={v => String(v)} /><Slider label="prior b" value={b} min={1} max={20} step={1} onChange={setB} show={v => String(v)} /><Slider label="heads" value={h} min={0} max={50} step={1} onChange={setH} show={v => String(v)} /><Slider label="tails" value={t} min={0} max={50} step={1} onChange={setT} show={v => String(v)} /></div>
    <Graph x={[0, 1]} y={[0, top * 1.1]} height={230} fns={[{ f: prior, color: C.grey, label: 'prior' }, { f: like, color: C.orange, dash: true, label: 'likelihood' }, { f: post, color: C.teal, label: 'posterior' }]} xlabel="p" />
    <Working rows={[['posterior', `Beta(${a} + ${h}, ${b} + ${t})`, `Beta(${a + h}, ${b + t})`], ['MAP', '(a′ − 1)/(a′ + b′ − 2)', a + h + b + t > 2 ? fmt((a + h - 1) / (a + h + b + t - 2), 4) : '—'], ['mean', 'a′/(a′ + b′)', fmt((a + h) / (a + h + b + t), 4)], ['mean, measured', 'area under p × posterior', fmt(pm, 4)], ['MLE', 'heads/(heads + tails)', h + t ? fmt(h / (h + t), 4) : '—']]} />
  </div>
}

export function BiasVarianceFig() {
  const [shrink, setShrink] = useState(1), n = 5
  const sets = useMemo(() => { const r = new PyRandom(21); return Array.from({ length: 400 }, () => Array.from({ length: n }, () => 10 + 2 * gauss(r))) }, [])
  const est = sets.map(xs => { const m = mean(xs), ss = xs.reduce((s, x) => s + (x - m) ** 2, 0); return { byN: ss / n, byN1: ss / (n - 1), shrunk: shrink * m } })
  const summary = key => { const v = est.map(e => e[key]), m = mean(v); return [m, mean(v.map(x => (x - m) ** 2))] }
  const [mN, vN] = summary('byN'), [mN1, vN1] = summary('byN1'), [mS, vS] = summary('shrunk')
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="shrink the mean by" value={shrink} min={0.5} max={1.1} step={0.05} onChange={setShrink} /></div>
    <Graph x={[0, 14]} y={[-0.5, 2.5]} height={170} yaxis={false} points={[...est.slice(0, 120).map(e => ({ x: e.byN, y: 2, r: 2, color: C.orange })), ...est.slice(0, 120).map(e => ({ x: e.byN1, y: 1, r: 2, color: C.teal }))]} segments={[{ x1: 4, y1: -0.5, x2: 4, y2: 2.5, color: C.grey, dash: true }]} xlabel="variance estimates from 5 samples (true variance 4: dashed)" />
    <Working rows={[['÷ n (orange)', `average ${fmt(mN, 3)}`, `bias ${fmt(mN - 4, 3)}`], ['÷ (n − 1) (teal)', `average ${fmt(mN1, 3)}`, `bias ${fmt(mN1 - 4, 3)}`],
      [`mean × ${fmt(shrink, 2)} (true mean 10)`, `bias² ${fmt((mS - 10) ** 2, 3)} + variance ${fmt(vS, 3)}`, `= error ${fmt((mS - 10) ** 2 + vS, 3)}`]]} />
  </div>
}

export function PermutationTestFig() {
  const [shift, setShift] = useState(2)
  const a = [1, 2, 3, 4, 2, 3], b = [1, 2, 3, 4, 2, 3].map(x => x + shift)
  const gaps = useMemo(() => { const r = new PyRandom(4), pooled = [...a, ...b], out = []; for (let t = 0; t < 1500; t++) { for (let i = pooled.length - 1; i > 0; i--) { const j = r.randrange(i + 1); [pooled[i], pooled[j]] = [pooled[j], pooled[i]] } out.push(Math.abs(mean(pooled.slice(0, a.length)) - mean(pooled.slice(a.length)))) } return out }, [shift])
  const observed = Math.abs(mean(a) - mean(b)), p = gaps.filter(g => g >= observed - 1e-12).length / gaps.length
  const bins = 24, hi = 4, w = hi / bins, hist = Array.from({ length: bins }, (_, i) => gaps.filter(g => g >= i * w && g < (i + 1) * w).length / gaps.length)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="real difference between the groups" value={shift} min={0} max={3} step={0.25} onChange={setShift} /></div>
    <Graph x={[0, hi]} y={[0, Math.max(...hist) * 1.2]} height={200} rects={hist.map((h, i) => ({ x: i * w, y: 0, w, h, color: i * w >= observed - 1e-12 ? C.orange : C.grey, opacity: 0.6 }))} segments={[{ x1: observed, y1: 0, x2: observed, y2: Math.max(...hist) * 1.2, color: C.orange, width: 2.5 }]} xlabel="gap in means after shuffling the labels" />
    <Working rows={[['group A', a.join(', '), `mean ${fmt(mean(a), 3)}`], ['group B', b.map(x => fmt(x, 2)).join(', '), `mean ${fmt(mean(b), 3)}`], ['p-value', 'shuffles with a gap ≥ the real one', fmt(p, 4)]]} />
  </div>
}

export function MonteCarloFig() {
  const [n, setN] = useState(500)
  const pts = useMemo(() => { const r = new PyRandom(8); return Array.from({ length: 5000 }, () => [r.random(), r.random()]) }, [])
  const inside = pts.slice(0, n).filter(([x, y]) => x * x + y * y <= 1).length, est = 4 * inside / n, se = 4 * Math.sqrt((Math.PI / 4) * (1 - Math.PI / 4) / n)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="points n" value={n} min={10} max={5000} step={10} onChange={setN} show={v => String(v)} /></div>
    <Graph x={[0, 1]} y={[0, 1]} equal height={260} fns={[{ f: x => Math.sqrt(Math.max(0, 1 - x * x)), color: C.grey }]} points={pts.slice(0, Math.min(n, 1500)).map(([x, y]) => ({ x, y, r: 1.5, color: x * x + y * y <= 1 ? C.teal : C.orange }))} />
    <Working rows={[['inside the quarter circle', `${inside} of ${n}`, fmt(inside / n, 4)], ['π ≈ 4 × that', '', fmt(est, 4)], ['typical error', '4 σ/√n', `±${fmt(se, 4)}`], ['true π', '', fmt(Math.PI, 4)]]} />
  </div>
}

const JENSEN_F = { square: ['x²', x => x * x, x => 2 * x], exp: ['eˣ', Math.exp, Math.exp], neglog: ['−ln x', x => -Math.log(x), x => -1 / x] }
export function JensenFig() {
  const [which, setWhich] = useState('square'), [x1, setX1] = useState(0.5), [x2, setX2] = useState(2.5)
  const [name, fn, d] = JENSEN_F[which], m = (x1 + x2) / 2, avgF = (fn(x1) + fn(x2)) / 2
  const lo = which === 'neglog' ? 0.2 : -0.5, hi = 3.2, ys = [fn(lo), fn(hi), fn(x1), fn(x2)].filter(Number.isFinite)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>f <select value={which} onChange={e => setWhich(e.target.value)}>{Object.entries(JENSEN_F).map(([k, [nm]]) => <option key={k} value={k}>{nm}</option>)}</select></label><Slider label="x₁" value={x1} min={0.3} max={3} step={0.1} onChange={setX1} /><Slider label="x₂" value={x2} min={0.3} max={3} step={0.1} onChange={setX2} /></div>
    <Graph x={[lo, hi]} y={[Math.min(...ys) - 0.5, Math.max(...ys) + 0.5]} height={240} fns={[{ f: fn, color: C.grey, label: name }, { f: x => fn(m) + d(m) * (x - m), color: C.violet, dash: true, label: 'tangent at the mean', labelAt: lo + 0.4 }]}
      segments={[{ x1, y1: fn(x1), x2, y2: fn(x2), color: C.orange, dash: true }]} points={[{ x: x1, y: fn(x1), color: C.grey }, { x: x2, y: fn(x2), color: C.grey }, { x: m, y: avgF, color: C.orange, label: 'E[f(X)]' }, { x: m, y: fn(m), color: C.teal, label: 'f(E[X])' }]} />
    <Working rows={[['E[f(X)]', `(f(${fmt(x1)}) + f(${fmt(x2)}))/2`, fmt(avgF, 4)], ['f(E[X])', `f(${fmt(m, 3)})`, fmt(fn(m), 4)], ['Jensen gap', 'never negative for convex f', fmt(avgF - fn(m), 4)]]} />
  </div>
}

export function EntropyBitsFig() {
  const [w, setW] = useState([8, 4, 2, 1, 1, 1, 1, 1])
  const total = w.reduce((s, v) => s + v, 0), p = w.map(v => v / total)
  return <div className="qm-fig">
    <div className="qm-buttons"><button onClick={() => setW(Array(8).fill(1))}>Flat</button><button onClick={() => setW([30, 1, 1, 1, 1, 1, 1, 1])}>One dominates</button><button onClick={() => setW([8, 4, 2, 1, 1, 1, 1, 1])}>Halving</button></div>
    <div className="qm-fig-controls">{w.map((v, i) => <Slider key={i} label={`w${i + 1}`} value={v} min={0} max={30} step={1} onChange={x => setW(ws => ws.map((y, j) => (j === i ? x : y)))} show={x => String(x)} />)}</div>
    <Bars rows={p.map((q, i) => ({ label: `${i + 1}: ${q > 0 ? fmt(-Math.log2(q), 2) + ' bits' : 'never'}`, value: q, color: C.teal }))} digits={3} max={1} />
    <Working rows={[['entropy', 'Σ p × (−log₂ p)', `${fmt(entropyBits(p), 4)} bits`], ['maximum', 'log₂ 8 (all equal)', '3 bits']]} />
  </div>
}

const CHAIN = [[0.6, 0.3, 0.1], [0.2, 0.6, 0.2], [0.3, 0.3, 0.4]], NAMES = ['A', 'B', 'C']
export function MarkovChainFig() {
  const [start, setStart] = useState(0), [steps, setSteps] = useState(0), [walkLen, setWalkLen] = useState(200)
  let dist = NAMES.map((_, i) => (i === start ? 1 : 0)); for (let s = 0; s < steps; s++) dist = markovStep(CHAIN, dist)
  const pi = stationary(CHAIN)
  const walk = useMemo(() => { const r = new PyRandom(5), out = [0]; for (let t = 1; t < 2000; t++) out.push(sampleCategorical(CHAIN[out[t - 1]], r)); return out }, [])
  const share = NAMES.map((_, i) => walk.slice(0, walkLen).filter(s => s === i).length / walkLen)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Start in <select value={start} onChange={e => { setStart(Number(e.target.value)); setSteps(0) }}>{NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}</select></label>
      <div className="qm-buttons"><button onClick={() => setSteps(s => s + 1)}>Step π ← π P</button><button onClick={() => setSteps(0)}>Reset</button></div></div>
    <table className="mm-dice mm-truth"><thead><tr><th>P</th>{NAMES.map(n => <th key={n}>→{n}</th>)}</tr></thead><tbody>{CHAIN.map((row, i) => <tr key={i}><th>{NAMES[i]}</th>{row.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table>
    <Bars rows={NAMES.map((n, i) => ({ label: `${n} after ${steps} steps`, value: dist[i], color: C.teal }))} digits={4} max={1} />
    <Bars rows={NAMES.map((n, i) => ({ label: `${n} stationary`, value: pi[i], color: C.orange }))} digits={4} max={1} />
    <div className="qm-fig-controls"><Slider label="random walk length" value={walkLen} min={10} max={2000} step={10} onChange={setWalkLen} show={v => String(v)} /></div>
    <Working rows={NAMES.map((n, i) => [`time in ${n}`, `of ${walkLen} steps`, fmt(share[i], 3)])} />
  </div>
}
