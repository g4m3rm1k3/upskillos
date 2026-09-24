import React, { useMemo, useState } from 'react'
import { truth, noiseSd, GAP, TRAIN, CALIB, TEST, makeData, ensemble, trainQuantiles, pinball, scorers, conformalize, evaluate, coverageSpread, binnedCoverage, CTRAIN, CTEST, blobs, trainClassifier, classConformal, naiveSets, predictionSets } from './engine.js'
import { Plot, Path } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Caption, Legend, Table } from '../../kit/ui.jsx'
import { fmt, pct, linspace, mean, range } from '../../kit/math.js'

const memo = {}
const once = (key, fn) => memo[key] ?? (memo[key] = fn())
const ENS = () => once('ens', () => ensemble(8))
const QUANT = taus => once(`q-${taus}`, () => trainQuantiles(TRAIN, { taus }))
const S = () => once('scorers', () => scorers({ point: ENS().members[0], quant: QUANT([0.05, 0.95]) }))
const Z = 1.645
const GRID = linspace(-3, 3, 121)

function Band({ X, Y, xs, lo, hi, fill, opacity = 0.2 }) {
  const d = xs.map((x, i) => `${i ? 'L' : 'M'} ${X(x)} ${Y(hi[i])}`).join(' ') + ' ' + xs.map((_, k) => { const i = xs.length - 1 - k; return `L ${X(xs[i])} ${Y(lo[i])}` }).join(' ') + ' Z'
  return <path d={d} fill={fill} opacity={opacity} stroke="none" />
}
function Dots({ X, Y, rows, n = 300, color = 'var(--muted)' }) {
  return rows.slice(0, n).map((r, i) => <circle key={i} cx={X(r.x)} cy={Y(r.y)} r="2.2" fill={color} opacity="0.55" />)
}
function GapShade({ X, Y, lo, hi }) {
  return <rect x={X(GAP[0])} y={Y(hi)} width={X(GAP[1]) - X(GAP[0])} height={Y(lo) - Y(hi)} fill="var(--muted)" opacity="0.08" />
}

// ---------- 60.1 Aleatoric and epistemic ----------
function KindsView() {
  const [M, setM] = useState(5), [truthOn, setTruthOn] = useState(true)
  const xs = linspace(-4.5, 4.5, 181), ens = ENS()
  const P = useMemo(() => { const outs = ens.members.slice(0, M).map(m => m.predict(xs)); return xs.map((_, i) => { const mus = outs.map(o => o[i].mu), mu = mean(mus); return { mu, mus, alea: mean(outs.map(o => o[i].var)), epi: mean(mus.map(v => (v - mu) ** 2)) } }) }, [M]) // eslint-disable-line react-hooks/exhaustive-deps
  const at = x => P[Math.round((x + 4.5) / 0.05)]
  return <>
    <Controls>
      <Slider label="Ensemble members" value={M} min={1} max={8} onChange={setM} />
      <Toggle label="Show the true curve and true 90% band" checked={truthOn} onChange={setTruthOn} />
    </Controls>
    <Caption>Each member is a small ReLU network that outputs a mean μ(x) and a variance σ²(x), trained on the 300 grey points by Gaussian negative log-likelihood. There is no data between 0.4 and 1.8 (shaded) or beyond ±3.</Caption>
    <Plot x={[-4.5, 4.5]} y={[-5, 5]} height={300} xLabel="x" yLabel="y" label="Ensemble predictions">{({ X, Y }) => <>
      <GapShade X={X} Y={Y} lo={-5} hi={5} />
      <Band X={X} Y={Y} xs={xs} lo={P.map(p => p.mu - Z * Math.sqrt(p.alea + p.epi))} hi={P.map(p => p.mu + Z * Math.sqrt(p.alea + p.epi))} fill="var(--chart-val)" opacity={0.18} />
      <Band X={X} Y={Y} xs={xs} lo={P.map(p => p.mu - Z * Math.sqrt(p.alea))} hi={P.map(p => p.mu + Z * Math.sqrt(p.alea))} fill="var(--chart-train)" opacity={0.25} />
      <Dots X={X} Y={Y} rows={TRAIN} />
      {range(M).map(m => <Path key={m} X={X} Y={Y} points={xs.map((x, i) => [x, P[i].mus[m]])} stroke="var(--chart-model)" width={1} opacity={0.45} />)}
      <Path X={X} Y={Y} points={xs.map((x, i) => [x, P[i].mu])} stroke="var(--chart-model)" width={2.6} />
      {truthOn && <><Path X={X} Y={Y} points={xs.map(x => [x, truth(x)])} stroke="var(--text)" width={1.5} dash="5 4" />
        <Path X={X} Y={Y} points={xs.map(x => [x, truth(x) + Z * noiseSd(x)])} stroke="var(--text)" width={1} dash="2 4" />
        <Path X={X} Y={Y} points={xs.map(x => [x, truth(x) - Z * noiseSd(x)])} stroke="var(--text)" width={1} dash="2 4" /></>}
    </>}</Plot>
    <Legend items={[['━', 'ensemble mean (thin: members)', 'var(--chart-model)'], ['■', '90% band from aleatoric variance only', 'var(--chart-train)'], ['■', '90% band from total variance', 'var(--chart-val)'], ['┅', 'truth', 'var(--text)']]} />
    <Plot x={[-4.5, 4.5]} y={[0, 1.5]} height={200} xLabel="x" yLabel="standard deviation" label="Uncertainty decomposition">{({ X, Y }) => <>
      <GapShade X={X} Y={Y} lo={0} hi={1.5} />
      <Path X={X} Y={Y} points={xs.map((x, i) => [x, Math.sqrt(P[i].alea)])} stroke="var(--chart-train)" width={2.4} />
      <Path X={X} Y={Y} points={xs.map((x, i) => [x, Math.min(1.5, Math.sqrt(P[i].epi))])} stroke="var(--chart-val)" width={2.4} />
      {truthOn && <Path X={X} Y={Y} points={xs.map(x => [x, noiseSd(x)])} stroke="var(--text)" width={1.2} dash="5 4" />}
    </>}</Plot>
    <Legend items={[['━', 'aleatoric: √(mean of σ²)', 'var(--chart-train)'], ['━', 'epistemic: spread of the members’ means', 'var(--chart-val)'], ['┅', 'true noise', 'var(--text)']]} />
    <Metrics items={[['epistemic sd at x = −1 (data)', fmt(Math.sqrt(at(-1).epi), 3)], ['epistemic sd at x = 1.1 (gap)', fmt(Math.sqrt(at(1.1).epi), 3)], ['epistemic sd at x = 4.5 (beyond)', fmt(Math.sqrt(at(4.5).epi), 2)], ['error of the mean at x = 4.5', fmt(at(4.5).mu - truth(4.5), 2)]]} />
    <Insight title="What to notice">Aleatoric uncertainty tracks the noise in the data and does not shrink with more members. Epistemic uncertainty, the members’ disagreement, stays small where there is data and grows quickly beyond ±3, where each ReLU network extrapolates with its own slope. But look at the gap: every member bridges it with a similar smooth curve, so they agree — and are all wrong by about 0.3 near x = 1.1. And far out, the ensemble’s error is two to three times its spread. Ensemble disagreement is a useful signal of ignorance, not a guarantee.</Insight>
  </>
}

// ---------- 60.2 Quantile regression ----------
const PAIRS = { '0.05,0.95': [0.05, 0.95], '0.1,0.9': [0.1, 0.9], '0.25,0.75': [0.25, 0.75] }
function QuantileView() {
  const [pair, setPair] = useState('0.05,0.95'), [tau, setTau] = useState(0.9)
  const taus = PAIRS[pair], qm = QUANT(taus)
  const band = useMemo(() => qm.predict(GRID), [qm])
  const cov = rows => { const P = qm.predict(rows.map(r => r.x)); return mean(rows.map((r, i) => (r.y >= P[i][0] && r.y <= P[i][1] ? 1 : 0))) }
  const below = rows => taus.map((_, k) => { const P = qm.predict(rows.map(r => r.x)); return mean(rows.map((r, i) => (r.y <= P[i][k] ? 1 : 0))) })
  const qs = linspace(-2, 2, 81)
  return <>
    <Controls>
      <Choice label="Quantile pair" value={pair} onChange={setPair} options={Object.keys(PAIRS).map(k => [k, `τ = ${PAIRS[k][0]} and ${PAIRS[k][1]} (nominal ${pct(PAIRS[k][1] - PAIRS[k][0])})`])} />
      <Slider label="τ for the loss picture" value={tau} min={0.05} max={0.95} step={0.05} onChange={setTau} format={v => v.toFixed(2)} />
    </Controls>
    <Caption>One network with two outputs, each trained with the pinball loss for its τ. No distribution is assumed: each output is pushed until a fraction τ of the training points lie below it.</Caption>
    <Plot x={[-3, 3]} y={[-5, 5]} height={280} xLabel="x" yLabel="y" label="Quantile regression band">{({ X, Y }) => <>
      <GapShade X={X} Y={Y} lo={-5} hi={5} />
      <Band X={X} Y={Y} xs={GRID} lo={band.map(b => b[0])} hi={band.map(b => b[1])} fill="var(--chart-train)" opacity={0.25} />
      <Dots X={X} Y={Y} rows={TEST} n={400} />
      <Path X={X} Y={Y} points={GRID.map(x => [x, truth(x) + noiseSd(x) * (taus[1] === 0.95 ? Z : taus[1] === 0.9 ? 1.2816 : 0.6745)])} stroke="var(--text)" width={1} dash="4 4" />
      <Path X={X} Y={Y} points={GRID.map(x => [x, truth(x) - noiseSd(x) * (taus[1] === 0.95 ? Z : taus[1] === 0.9 ? 1.2816 : 0.6745)])} stroke="var(--text)" width={1} dash="4 4" />
    </>}</Plot>
    <Legend items={[['■', 'learned quantile band', 'var(--chart-train)'], ['┅', 'true quantiles', 'var(--text)'], ['●', 'test points', 'var(--muted)']]} />
    <Metrics items={[['nominal coverage', pct(taus[1] - taus[0])], ['training coverage', pct(cov(TRAIN))], ['test coverage', pct(cov(TEST))], ['test points below the lower · upper curve', below(TEST).map(v => pct(v)).join(' · ')]]} />
    <Plot x={[-2, 2]} y={[0, 2]} height={180} xLabel="residual y − q" yLabel="pinball loss" label="Pinball loss">{({ X, Y }) => <Path X={X} Y={Y} points={qs.map(r => [r, pinball(tau, r, 0)])} stroke="var(--chart-model)" />}</Plot>
    <Caption>{`With τ = ${tau.toFixed(2)}, a point above the curve costs ${tau.toFixed(2)} per unit and a point below costs ${(1 - tau).toFixed(2)}: the loss is minimized when a fraction τ of points lie below.`}</Caption>
    <Insight title="What to notice">The band widens where the noise grows, with no Gaussian assumption. But coverage falls short of nominal — a little on the training points, because the fit is imperfect, and more on new points, because the network partly fit the noise in its training sample. Nothing in the method promises the stated coverage. In the gap, the band misses the true quantiles entirely. Quantile regression gives the right shape; conformal calibration (next lesson) gives the guarantee.</Insight>
  </>
}

// ---------- 60.3 Split conformal ----------
function ConformalView() {
  const [alpha, setAlpha] = useState(0.1), [n, setN] = useState(100)
  const Sc = S(), calib = CALIB.slice(0, n)
  const c = conformalize(Sc, 'abs', calib, alpha), ev = evaluate(Sc, 'abs', c.q, TEST), cov = mean(ev.map(e => (e.covered ? 1 : 0)))
  const spread = useMemo(() => coverageSpread(Sc, 'abs', alpha, { nCal: n }), [alpha, n]) // eslint-disable-line react-hooks/exhaustive-deps
  const band = Sc.predictAll(GRID), sorted = [...c.scores].sort((a, b) => a - b), bins = 30
  const hist = range(bins).map(b => spread.filter(v => v >= 0.7 + (b * 0.3) / bins && v < 0.7 + ((b + 1) * 0.3) / bins + (b === bins - 1 ? 1e-9 : 0)).length / spread.length)
  const k = Math.ceil((n + 1) * (1 - alpha))
  return <>
    <Controls>
      <Slider label="Miscoverage α" value={alpha} min={0.05} max={0.3} step={0.05} onChange={setAlpha} format={v => `${v.toFixed(2)} (target coverage ${pct(1 - v)})`} />
      <Slider label="Calibration points n" value={n} min={20} max={300} step={10} onChange={setN} />
    </Controls>
    <Caption>{`Split conformal around one trained network’s mean μ(x). Score each calibration point by |y − μ(x)|, sort the ${n} scores, take the one at rank ⌈(n + 1)(1 − α)⌉ = ${k} (counting from the smallest) as q, and predict μ(x) ± q.`}</Caption>
    <Plot x={[-3, 3]} y={[-5, 5]} height={260} xLabel="x" yLabel="y" label="Conformal interval">{({ X, Y }) => <>
      <Band X={X} Y={Y} xs={GRID} lo={band.map(p => p.mu - c.q)} hi={band.map(p => p.mu + c.q)} fill="var(--chart-train)" opacity={0.25} />
      {ev.slice(0, 400).map((e, i) => <circle key={i} cx={X(e.x)} cy={Y(TEST[i].y)} r="2.2" fill={e.covered ? 'var(--muted)' : '#ef4444'} opacity="0.7" />)}
      <Path X={X} Y={Y} points={GRID.map((x, i) => [x, band[i].mu])} stroke="var(--chart-model)" width={2} />
    </>}</Plot>
    <Legend items={[['■', 'μ(x) ± q', 'var(--chart-train)'], ['●', 'test point outside the interval', '#ef4444']]} />
    <Plot x={[0, n]} y={[0, Math.max(3, sorted[n - 1] * 1.05)]} height={170} xLabel="rank of calibration score" yLabel="|y − μ(x)|" label="Sorted calibration scores">{({ X, Y }) => <>
      {sorted.map((v, i) => <circle key={i} cx={X(i + 1)} cy={Y(v)} r="2.2" fill={i + 1 === k ? '#ef4444' : 'var(--chart-model)'} />)}
      {Number.isFinite(c.q) && <line x1={X(0)} x2={X(n)} y1={Y(c.q)} y2={Y(c.q)} stroke="#ef4444" strokeDasharray="4 3" />}
    </>}</Plot>
    <Metrics items={[['q', Number.isFinite(c.q) ? fmt(c.q, 3) : '∞ (n too small)'], ['coverage on 2,000 test points', pct(cov)], ['guaranteed range of expected coverage', `${pct(1 - alpha)} to ${pct(Math.min(1, 1 - alpha + 1 / (n + 1)))}`], ['mean coverage over 300 re-splits', pct(mean(spread))]]} />
    <Plot x={[0.7, 1]} y={[0, Math.max(...hist) * 1.15 || 1]} height={170} xLabel="coverage of one calibration draw (200 test points each)" yLabel="share of draws" yFormat={v => `${(100 * v).toFixed(0)}%`} label="Coverage over re-splits">{({ X, Y }) => <>
      {hist.map((h, b) => <rect key={b} x={X(0.7 + (b * 0.3) / bins)} y={Y(h)} width={Math.max(1, X(0.3 / bins) - X(0) - 1)} height={Y(0) - Y(h)} fill="var(--chart-val)" opacity="0.7" />)}
      <line x1={X(1 - alpha)} x2={X(1 - alpha)} y1={Y(0)} y2={Y(Math.max(...hist) * 1.1 || 1)} stroke="var(--text)" strokeDasharray="4 3" />
    </>}</Plot>
    <Insight title="What to notice">With any model — even a poor one — the average coverage lands at or just above 1 − α: the guarantee holds on average over calibration draws, which the histogram shows by redrawing the calibration set 300 times. Any single draw can be above or below; more calibration points make the histogram narrower. With very few points and small α, q becomes infinite: the method honestly admits it cannot promise the coverage. The interval’s width is the same everywhere — look where the red misses cluster.</Insight>
  </>
}

// ---------- 60.4 Adaptive conformal ----------
function AdaptiveView() {
  const [kind, setKind] = useState('abs'), [shift, setShift] = useState(false)
  const Sc = S(), c = conformalize(Sc, kind, CALIB, 0.1)
  const test = shift ? once('shifted', () => makeData(2000, 70, { shift: 2 })) : TEST
  const ev = evaluate(Sc, kind, c.q, test), bins = binnedCoverage(ev), band = evaluate(Sc, kind, c.q, GRID.map(x => ({ x, y: 0 })))
  return <>
    <Controls>
      <Choice label="Conformity score" value={kind} onChange={setKind} options={['abs', 'norm', 'cqr'].map(k => [k, Sc[k].name])} />
      <Toggle label="Shift the test inputs toward the noisy edges" checked={shift} onChange={setShift} />
    </Controls>
    <Caption>All three are calibrated on the same 300 points for 90% coverage. The absolute score adds a constant; the normalized score scales by the network’s predicted σ(x); CQR widens or narrows the learned 5%–95% quantile band.</Caption>
    <Plot x={[-3, 3]} y={[-5, 5]} height={260} xLabel="x" yLabel="y" label="Adaptive intervals">{({ X, Y }) => <>
      <Band X={X} Y={Y} xs={GRID} lo={band.map(b => b.lo)} hi={band.map(b => b.hi)} fill="var(--chart-train)" opacity={0.25} />
      {ev.slice(0, 500).map((e, i) => <circle key={i} cx={X(e.x)} cy={Y(test[i].y)} r="2.2" fill={e.covered ? 'var(--muted)' : '#ef4444'} opacity="0.7" />)}
    </>}</Plot>
    <Legend items={[['■', 'conformal interval', 'var(--chart-train)'], ['●', 'test point outside', '#ef4444']]} />
    <Table head={['x from', 'to', 'test points', 'coverage', 'mean width']} rows={bins.map(b => [b.a, b.b, b.n, Number.isFinite(b.coverage) ? pct(b.coverage) : '—', Number.isFinite(b.width) ? fmt(b.width, 2) : '—'])} caption="Coverage within slices of x. Only the overall coverage is guaranteed." />
    <Metrics items={[['overall coverage', pct(mean(ev.map(e => (e.covered ? 1 : 0))))], ['mean width', fmt(mean(ev.map(e => e.hi - e.lo)), 2)], ['worst slice', pct(Math.min(...bins.filter(b => b.n).map(b => b.coverage)))]]} />
    <Insight title="What to notice">All three meet 90% overall, but the constant-width interval gets there by over-covering the quiet middle (100%) and under-covering the noisy edges (about 80%) — marginal coverage hides who pays. Scores that adapt to the input spread coverage more evenly and give narrower intervals on average. Now shift the test inputs: calibration and test are no longer exchangeable, and the constant-width interval drops to about 81%. The adaptive scores hold up better here only because their σ(x) or quantiles happen to be right — the guarantee itself is gone.</Insight>
  </>
}

// ---------- 60.5 Prediction sets ----------
const CLF = () => once('clf', () => trainClassifier(CTRAIN))
const CLASS_COL = ['var(--chart-train)', 'var(--chart-val)', '#10b981']
function SetsView() {
  const [alpha, setAlpha] = useState(0.1), [shift, setShift] = useState(false)
  const model = CLF(), test = shift ? once('ctest-wide', () => blobs(1500, 66, 1.1)) : CTEST
  const r = classConformal(model, alpha, { test }), naive = naiveSets(model, alpha, test)
  const cells = 40, x0 = -3.2, x1 = 3.2, y0 = -3.2, y1 = 3.2, w = (x1 - x0) / cells, h = (y1 - y0) / cells
  const grid = useMemo(() => { const pts = []; for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) pts.push([x0 + (i + 0.5) * w, y0 + (j + 0.5) * h]); return { pts, probs: model(pts) } }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const sets = predictionSets(grid.probs, r.q), shade = ['#9ca3af', 'transparent', 'var(--chart-model)', 'var(--text)']
  return <>
    <Controls>
      <Slider label="Miscoverage α" value={alpha} min={0.02} max={0.3} step={0.01} onChange={setAlpha} format={v => `${v.toFixed(2)} (target ${pct(1 - v)})`} />
      <Toggle label="Test data noisier than calibration data" checked={shift} onChange={setShift} />
    </Controls>
    <Caption>{`A small network classifies three overlapping clusters (test accuracy about 81%). Score each calibration point by 1 − p̂(true class); the set for a new point keeps every class with 1 − p̂ ≤ q = ${fmt(r.q, 3)}. Shading shows the set size.`}</Caption>
    <Plot x={[x0, x1]} y={[y0, y1]} height={320} xLabel="x₁" yLabel="x₂" label="Prediction set sizes">{({ X, Y }) => <>
      {grid.pts.map((p, k) => { const s = sets[k].length; return s === 1 ? null : <rect key={k} x={X(p[0] - w / 2)} y={Y(p[1] + h / 2)} width={X(x0 + w) - X(x0) + 0.5} height={Y(y0) - Y(y0 + h) + 0.5} fill={shade[s]} opacity={s === 0 ? 0.35 : s === 2 ? 0.18 : 0.35} /> })}
      {test.slice(0, 300).map((p, i) => <circle key={i} cx={X(p.x[0])} cy={Y(p.x[1])} r="2.6" fill={CLASS_COL[p.y]} opacity="0.8" />)}
    </>}</Plot>
    <Legend items={[['□', 'one class', 'var(--muted)'], ['■', 'two classes', 'var(--chart-model)'], ['■', 'all three', 'var(--text)'], ['■', 'empty set', '#9ca3af']]} />
    <Table head={['method', 'coverage', 'average set size']} rows={[['Conformal (calibrated)', pct(r.coverage), fmt(r.avgSize, 2)], ['Naive: add classes until p̂ sums to 1 − α', pct(naive.coverage), fmt(naive.avgSize, 2)]]} caption={`Target coverage ${pct(1 - alpha)}. Empty conformal sets: ${pct(r.empty)} of test points.`} />
    <Insight title="What to notice">The sets are single labels where the classifier is confident and grow to two or three labels where the clusters overlap — the size of the set is itself an uncertainty report. Conformal sets hit the target; the naive sets built from the network’s own probabilities miss it (here they are too large, because this network is underconfident; for an overconfident network they would under-cover). At large α some sets are empty: the method would rather say “none of these” than break its promise. Make the test data noisier and coverage falls well below the target — the guarantee assumed calibration and test data are exchangeable.</Insight>
  </>
}

const VIEWS = { 'l60-kinds': KindsView, 'l60-quantile': QuantileView, 'l60-conformal': ConformalView, 'l60-adaptive': AdaptiveView, 'l60-sets': SetsView }
const TITLES = { 'l60-kinds': 'Separate noise from ignorance with an ensemble.', 'l60-quantile': 'Learn a band directly with the pinball loss.', 'l60-conformal': 'Turn any model into intervals with guaranteed coverage.', 'l60-adaptive': 'Make intervals adapt to the input — and watch coverage by region.', 'l60-sets': 'Prediction sets for a classifier.' }
export default function Playground({ lesson }) {
  const id = VIEWS[lesson?.id] ? lesson.id : 'l60-kinds', View = VIEWS[id]
  return <>
    <PanelHeading title={TITLES[id]} pill="uncertainty · conformal" />
    <View />
  </>
}
