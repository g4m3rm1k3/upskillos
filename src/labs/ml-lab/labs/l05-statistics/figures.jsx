// Figures placed between the paragraphs of Lab 05 (05.1–05.6).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Check, Radio, Readout, Bars, MiniPlot, Path, Dots, VLine, HLine, Label, curve, Table, r } from '../../kit/fig.jsx'
import { POP, trueMean, sample, samplingDistribution, bootstrap, percentileInterval, coverage, bernoulliLogLik, normalLogLik, pearson, confounded, mean, std } from './engine.js'
import { random, quantile } from '../../kit/math.js'

const popMedian = Math.exp(POP.mu), popSd = Math.sqrt((Math.exp(POP.sigma ** 2) - 1) * Math.exp(2 * POP.mu + POP.sigma ** 2))
function Histogram({ values, lo, hi, bins = 30, xLabel, marks = [], overlay, label }) {
  const w = (hi - lo) / bins, counts = Array(bins).fill(0)
  values.forEach(v => { const k = Math.floor((v - lo) / w); if (k >= 0 && k < bins) counts[k]++ })
  const dens = counts.map(c => c / (values.length * w)), top = Math.max(...dens, ...(overlay ? curve(overlay, lo, hi, 60).map(p => p[1]) : [0])) * 1.12
  return <MiniPlot x={[lo, hi]} y={[0, top]} xLabel={xLabel} yLabel="density" label={label}>{({ X, Y }) => <>
    {dens.map((d, k) => <rect key={k} x={X(lo + k * w)} y={Y(d)} width={Math.max(0.5, X(w) - X(0) - 1)} height={Y(0) - Y(d)} fill="var(--chart-train)" opacity="0.6" />)}
    {overlay && <Path X={X} Y={Y} points={curve(overlay, lo, hi)} stroke="var(--chart-val)" />}
    {marks.map(([x, color, text], i) => <g key={i}><VLine X={X} Y={Y} x={x} y0={0} y1={top} color={color} dash="" /><Label X={X} Y={Y} x={x} y={top * (0.93 - 0.09 * i)} color={color} anchor="middle">{text}</Label></g>)}
  </>}</MiniPlot>
}

// ---------- 05.1 ----------
export function OneStudy() {
  const [seed, setSeed] = useState(1), [n, setN] = useState(20), x = useMemo(() => sample(n, random(seed)), [n, seed])
  return <div>
    <Controls><Slider label="sample size n" value={n} min={5} max={200} step={5} onChange={setN} digits={0} /><button onClick={() => setSeed(s => s + 1)}>Run another study</button></Controls>
    <MiniPlot x={[0, 110]} y={[0, 1]} height={140} yTicks={2} grid={false} xLabel="build duration (s)" label={`Sample mean ${r(mean(x), 2)} against the true mean ${r(trueMean, 2)}`}>{({ X, Y }) => <>
      <Dots X={X} Y={Y} points={x.map((v, i) => [v, 0.2 + 0.5 * ((i * 37) % 11) / 11])} rad={3} />
      <VLine X={X} Y={Y} x={mean(x)} y0={0} y1={1} color="var(--chart-val)" dash="" /><VLine X={X} Y={Y} x={trueMean} y0={0} y1={1} />
    </>}</MiniPlot>
    <Readout>This study’s estimate (orange): x̄ = <strong>{r(mean(x), 2)} s</strong>. The hidden parameter μ (dashed) = {r(trueMean, 2)} s. Run another study: the estimate moves; μ does not.</Readout>
  </div>
}

export function SamplingDistribution() {
  const [n, setN] = useState(20), [stat, setStat] = useState('mean'), vals = useMemo(() => samplingDistribution({ n, stat }), [n, stat])
  return <div>
    <Controls><Slider label="n per study" value={n} min={5} max={100} step={5} onChange={setN} digits={0} /><Radio name="sdstat" value={stat} onChange={setStat} options={[['mean', 'sample mean'], ['median', 'sample median']]} /></Controls>
    <Histogram values={vals} lo={15} hi={55} xLabel={`${stat} of one study`} marks={[[trueMean, 'var(--text)', 'population mean'], [popMedian, 'var(--chart-val)', 'population median']]} label={`1000 study ${stat}s`} />
    <Readout>1,000 studies of n = {n}: their {stat}s average {r(mean(vals), 2)} with standard deviation {r(std(vals), 2)}{stat === 'mean' ? ` (theory σ/√n = ${r(popSd / Math.sqrt(n), 2)})` : ''}. The {stat} estimates the population {stat === 'mean' ? `mean, ${r(trueMean, 2)}` : `median, ${r(popMedian, 2)} — a different parameter`}.</Readout>
  </div>
}

// ---------- 05.2 ----------
export function CltHistogram() {
  const [n, setN] = useState(1), vals = useMemo(() => samplingDistribution({ n, reps: 3000, seed: 8 }), [n]), se = popSd / Math.sqrt(n)
  const normal = x => Math.exp(-0.5 * ((x - trueMean) / se) ** 2) / (se * Math.sqrt(2 * Math.PI))
  return <div>
    <Controls><Slider label="n averaged" value={n} min={1} max={60} step={1} onChange={setN} digits={0} /></Controls>
    <Histogram values={vals} lo={0} hi={90} bins={45} xLabel={n === 1 ? 'one build duration (s)' : `mean of ${n} durations (s)`} overlay={n > 1 ? normal : null} label={`Distribution of the mean of ${n}`} />
    <Readout>n = 1 shows the skewed population itself. As n grows the histogram becomes symmetric and hugs the normal curve N(μ, σ/√n) with σ/√n = <strong>{r(se, 2)} s</strong>.</Readout>
  </div>
}

export function IntervalWidth() {
  const [s, setS] = useState(10), ns = [20, 80, 320, 1280]
  return <div>
    <Controls><Slider label="sample standard deviation s" value={s} min={2} max={30} step={1} onChange={setS} digits={0} /></Controls>
    <Bars items={ns.map(n => ({ label: `n=${n}`, value: 1.96 * s / Math.sqrt(n) }))} digits={2} label="Half-width of the 95% interval" />
    <Readout>Half-width 1.96·s/√n. Each ×4 in n halves it: {ns.map(n => r(1.96 * s / Math.sqrt(n), 2)).join(' → ')} s.</Readout>
  </div>
}

// ---------- 05.3 ----------
const OBS = sample(20, random(11))
export function OneResample() {
  const [k, setK] = useState(0), rng = random(100 + k), idx = OBS.map(() => Math.floor(rng() * OBS.length)), counts = OBS.map((_, i) => idx.filter(j => j === i).length)
  return <div>
    <Controls><button onClick={() => setK(v => v + 1)}>Draw another resample</button></Controls>
    <MiniPlot x={[0, 90]} y={[0, 4.5]} height={170} yTicks={5} xLabel="duration (s)" yLabel="times drawn" label="How often each observation appears in this resample">{({ X, Y }) => <>
      {OBS.map((v, i) => <line key={i} x1={X(v)} x2={X(v)} y1={Y(0)} y2={Y(counts[i])} stroke={counts[i] ? 'var(--chart-train)' : 'var(--muted)'} strokeWidth="3" />)}
      <Dots X={X} Y={Y} points={OBS.map((v, i) => [v, counts[i], 3.5, counts[i] ? 'var(--chart-train)' : '#ef4444'])} />
    </>}</MiniPlot>
    <Readout>Resample {k + 1}: {counts.filter(c => c === 0).length} of the 20 observations were not drawn (red), {counts.filter(c => c > 1).length} were drawn more than once. Its mean is <strong>{r(mean(idx.map(i => OBS[i])), 2)} s</strong>; the original sample mean is {r(mean(OBS), 2)} s.</Readout>
  </div>
}

export function BootstrapInterval() {
  const [B, setB] = useState(1000), [stat, setStat] = useState('mean'), f = stat === 'median' ? v => quantile(v, 0.5) : mean
  const boots = useMemo(() => bootstrap(OBS, { B, stat: f }), [B, stat]), [lo, hi] = percentileInterval(boots) // eslint-disable-line react-hooks/exhaustive-deps
  return <div>
    <Controls><Slider label="resamples B" value={B} min={100} max={4000} step={100} onChange={setB} digits={0} /><Radio name="bstat" value={stat} onChange={setStat} options={[['mean', 'mean'], ['median', 'median']]} /></Controls>
    <Histogram values={boots} lo={15} hi={55} xLabel={`bootstrap ${stat}s`} marks={[[lo, 'var(--chart-val)', '2.5%'], [hi, 'var(--chart-val)', '97.5%']]} label={`Bootstrap distribution of the ${stat}`} />
    <Readout>{B} resamples: standard error ≈ {r(std(boots), 2)} s; 95% percentile interval <strong>{r(lo, 1)}–{r(hi, 1)} s</strong>. {stat === 'mean' ? `The interval is lopsided around ${r(mean(OBS), 1)}, like the skewed data.` : 'The median’s bootstrap distribution is lumpy: it can only take values near the 20 observations.'}</Readout>
  </div>
}

// ---------- 05.4 ----------
export function CoverageStrips() {
  const [n, setN] = useState(20), [seed, setSeed] = useState(3), res = useMemo(() => coverage({ n, seed, studies: 100, B: 300 }), [n, seed])
  return <div>
    <Controls><Slider label="n per study" value={n} min={5} max={80} step={5} onChange={setN} digits={0} /><button onClick={() => setSeed(s => s + 1)}>100 new studies</button></Controls>
    <MiniPlot x={[10, 70]} y={[0, 101]} height={300} yTicks={2} xLabel="95% bootstrap interval for the mean (s)" label={`${Math.round(res.rate * 100)} of 100 intervals contain the true mean`}>{({ X, Y }) => <>
      {res.intervals.map((iv, k) => <line key={k} x1={X(iv.lo)} x2={X(iv.hi)} y1={Y(k + 0.5)} y2={Y(k + 0.5)} stroke={iv.hit ? 'var(--chart-train)' : '#ef4444'} strokeWidth="2" />)}
      <VLine X={X} Y={Y} x={trueMean} y0={0} y1={101} dash="" />
    </>}</MiniPlot>
    <Readout><strong>{Math.round(res.rate * 100)} of 100</strong> intervals contain μ = {r(trueMean, 1)} (black line); red ones miss. Nominal 95%. {n <= 10 ? 'With small skewed samples the bootstrap is too narrow: coverage falls short.' : 'Change n and rerun: small n under-covers.'}</Readout>
  </div>
}

// ---------- 05.5 ----------
export function LikelihoodCurve() {
  const [k, setK] = useState(7), [n, setN] = useState(10), [compare, setCompare] = useState(false), kk = Math.min(k, n)
  const ll = (p, a, b) => bernoulliLogLik(p, a, b) - bernoulliLogLik(Math.min(0.999, Math.max(0.001, a / b)), a, b)
  return <div>
    <Controls><Slider label="successes k" value={kk} min={0} max={n} step={1} onChange={setK} digits={0} /><Slider label="trials n" value={n} min={1} max={100} step={1} onChange={setN} digits={0} /><Check label="also show 10× the data at the same ratio" checked={compare} onChange={setCompare} /></Controls>
    <MiniPlot x={[0, 1]} y={[-8, 0.5]} xLabel="success probability p" yLabel="log L(p) − max" label={`Log-likelihood peaks at ${r(kk / n, 3)}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(p => Math.max(-8, ll(p, kk, n)), 0.001, 0.999)} />
      {compare && <Path X={X} Y={Y} points={curve(p => Math.max(-8, ll(p, 10 * kk, 10 * n)), 0.001, 0.999)} stroke="var(--chart-val)" />}
      <VLine X={X} Y={Y} x={kk / n} y0={-8} y1={0.5} />
    </>}</MiniPlot>
    <Readout>log L(p) = {kk}·log p + {n - kk}·log(1 − p), peaking at p̂ = k/n = <strong>{r(kk / n, 3)}</strong>. How much worse is p = 0.5? {r(-ll(0.5, kk, n), 2)} log units{compare ? `; with ${10 * kk} of ${10 * n}: ${r(-ll(0.5, 10 * kk, 10 * n), 1)} — the orange curve is much narrower` : ''}.</Readout>
  </div>
}

export function NormalNoiseLoss() {
  const x = [3.1, 4.2, 2.8, 3.9, 3.5], [mu, setMu] = useState(3), sigma = 1, sse = x.reduce((t, v) => t + (v - mu) ** 2, 0)
  return <div>
    <Controls><Slider label="candidate μ" value={mu} min={2} max={5} step={0.05} onChange={setMu} /></Controls>
    <MiniPlot x={[2, 5]} y={[-6, 0.2]} xLabel="μ" yLabel="log-likelihood" label="Normal log-likelihood of the mean">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(m => normalLogLik(m, x, sigma), 2, 5)} />
      <Dots X={X} Y={Y} points={[[mu, normalLogLik(mu, x, sigma)]]} color="var(--chart-val)" rad={5} />
      <VLine X={X} Y={Y} x={mean(x)} y0={-6} y1={0.2} />
    </>}</MiniPlot>
    <Readout>data [{x.join(', ')}]. At μ = {r(mu, 2)}: Σ(xᵢ − μ)² = {r(sse, 3)}, log-likelihood = −{r(sse, 3)}/(2σ²) = <strong>{r(-sse / 2, 3)}</strong>. The peak is at the sample mean {r(mean(x), 2)} — the same μ that minimizes squared error.</Readout>
  </div>
}

// ---------- 05.6 ----------
export function PearsonByHand() {
  const x = [1, 2, 3], [y3, setY3] = useState(2), y = [1, 3, y3]
  const mx = mean(x), my = mean(y), dx = x.map(v => v - mx), dy = y.map(v => v - my), sxy = dx.reduce((t, v, i) => t + v * dy[i], 0), sxx = dx.reduce((t, v) => t + v * v, 0), syy = dy.reduce((t, v) => t + v * v, 0)
  return <div>
    <Controls><Slider label="third y value" value={y3} min={-3} max={6} step={0.5} onChange={setY3} digits={1} /></Controls>
    <Table head={['x', 'y', 'x − x̄', 'y − ȳ', 'product']} rows={x.map((v, i) => [v, y[i], r(dx[i], 2), r(dy[i], 2), r(dx[i] * dy[i], 3)])} label="Deviations and cross-products" />
    <Readout>r = Σ products / √(Σ(x−x̄)² · Σ(y−ȳ)²) = {r(sxy, 3)} / √({r(sxx, 2)} × {r(syy, 3)}) = <strong>{r(pearson(x, y), 3)}</strong>. At y₃ = 2 this is the lesson’s 0.5.</Readout>
  </div>
}

function slope(pts) { const mx = mean(pts.map(p => p.tests)), my = mean(pts.map(p => p.bugs)); return pts.reduce((t, p) => t + (p.tests - mx) * (p.bugs - my), 0) / pts.reduce((t, p) => t + (p.tests - mx) ** 2, 0) }
export function ConfounderScatter() {
  const [effect, setEffect] = useState(0), [strata, setStrata] = useState(true), data = useMemo(() => confounded({ effect }), [effect])
  const pooled = slope(data), groups = [0, 1].map(s => data.filter(d => d.size === s)), within = groups.map(slope)
  const line = (pts, b) => { const mx = mean(pts.map(p => p.tests)), my = mean(pts.map(p => p.bugs)), x0 = Math.min(...pts.map(p => p.tests)), x1 = Math.max(...pts.map(p => p.tests)); return [[x0, my + b * (x0 - mx)], [x1, my + b * (x1 - mx)]] }
  return <div>
    <Controls><Slider label="true effect of one test on bugs" value={effect} min={-0.3} max={0.3} step={0.01} onChange={setEffect} /><Check label="show within-size lines" checked={strata} onChange={setStrata} /></Controls>
    <MiniPlot x={[-10, 120]} y={[-20, 70]} xLabel="tests written" yLabel="bugs reported" label="Tests against bugs, coloured by project size">{({ X, Y }) => <>
      <Dots X={X} Y={Y} points={data.map(d => [d.tests, d.bugs, 3, d.size ? 'var(--chart-val)' : 'var(--chart-train)'])} opacity={0.6} />
      <Path X={X} Y={Y} points={line(data, pooled)} stroke="var(--text)" dash="5 4" />
      {strata && groups.map((g, i) => <Path key={i} X={X} Y={Y} points={line(g, within[i])} stroke={i ? 'var(--chart-val)' : 'var(--chart-train)'} width={3} />)}
    </>}</MiniPlot>
    <Readout>Pooled slope (dashed) = <strong>{r(pooled, 3)}</strong> bugs per test; within small projects {r(within[0], 3)}, within large {r(within[1], 3)}; true effect {r(effect, 2)}. Project size (blue small, orange large) drives both, so the pooled slope is badly biased{effect < 0 && pooled > 0 ? ' — here it even has the wrong sign (Simpson’s paradox)' : ''}.</Readout>
  </div>
}
