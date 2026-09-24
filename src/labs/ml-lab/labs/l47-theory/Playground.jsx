import React, { useMemo, useState } from 'react'
import { thresholdClass, trueError, sampleData, empError, hoeffdingEps, uniformExperiment, quantile, POINT_SETS, shatter, doubleDescent, PS } from './engine.js'
import { Plot, Path } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Caption, Legend } from '../../kit/ui.jsx'
import { random, fmt, pct } from '../../kit/math.js'

const NS = [25, 50, 100, 200, 400, 800], KS = [1, 10, 50, 200, 1000]

function UniformView() {
  const [ni, setNi] = useState(2), [ki, setKi] = useState(2), [noise, setNoise] = useState(0.1), [seed, setSeed] = useState(1)
  const n = NS[ni], K = KS[ki], H = thresholdClass(K)
  const d = useMemo(() => sampleData(n, noise, random(seed)), [n, noise, seed])
  const trials = useMemo(() => uniformExperiment({ n, K, noise, trials: 300 }), [n, K, noise])
  const q95 = quantile(trials.map(t => t.maxGap), 0.95), bound = hoeffdingEps(n, 0.05, K), single = hoeffdingEps(n, 0.05)
  const erm = H.reduce((b, t) => empError(t, d) < empError(b, d) ? t : b, H[0])
  const hist = Array.from({ length: 25 }, (_, i) => trials.filter(t => t.maxGap >= i * 0.012 && t.maxGap < (i + 1) * 0.012).length / trials.length)
  return <>
    <Controls>
      <Slider label="Training examples n" value={ni} min={0} max={NS.length - 1} onChange={setNi} format={i => NS[i]} />
      <Slider label="Hypotheses in the class |H|" value={ki} min={0} max={KS.length - 1} onChange={setKi} format={i => KS[i]} />
      <Slider label="Label noise" value={noise} min={0} max={0.3} step={0.05} onChange={setNoise} format={pct} />
    </Controls>
    <Caption>{`Hypotheses are thresholds h_t(x) = 1[x > t] at ${K} evenly spaced values of t. The truth is x > 0.6 with ${pct(noise)} of labels flipped, so every hypothesis's true error is known exactly.`}</Caption>
    <Plot x={[0, 1]} y={[0, 0.7]} height={220} xLabel="threshold t" yLabel="error" label="True and empirical error of every hypothesis">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={Array.from({ length: 101 }, (_, i) => [i / 100, trueError(i / 100, noise)])} stroke="var(--text)" width={2} dash="6 4" />
      {H.length > 1 ? <Path X={X} Y={Y} points={H.map(t => [t, empError(t, d)])} stroke="var(--chart-model)" width={2} /> : <circle cx={X(H[0])} cy={Y(empError(H[0], d))} r="5" fill="var(--chart-model)" />}
      <circle cx={X(erm)} cy={Y(empError(erm, d))} r="6" fill="var(--chart-val)" />
    </>}</Plot>
    <Legend items={[['┄', 'true error', 'var(--text)'], ['━', 'training (empirical) error on one sample', 'var(--chart-model)'], ['●', 'ERM: the hypothesis with lowest training error', 'var(--chart-val)']]} />
    <button onClick={() => setSeed(s => s + 1)}>Draw a new training sample</button>
    <Plot x={[0, 0.3]} y={[0, Math.max(...hist) * 1.15 || 1]} height={180} xLabel="largest |training − true| error over the whole class" yLabel="share of 300 samples" yFormat={v => pct(v)} label="Distribution of the worst-case gap">{({ X, Y }) => <>
      {hist.map((h, i) => <rect key={i} x={X(i * 0.012)} y={Y(h)} width={X(0.012) - X(0) - 1} height={Y(0) - Y(h)} fill="var(--chart-model)" opacity="0.6" />)}
      <Path X={X} Y={Y} points={[[bound, 0], [bound, Math.max(...hist) * 1.1]]} stroke="var(--chart-val)" width={2.5} />
      <Path X={X} Y={Y} points={[[q95, 0], [q95, Math.max(...hist) * 1.1]]} stroke="var(--text)" width={1.5} dash="5 4" />
    </>}</Plot>
    <Legend items={[['━', `union bound: holds with 95% probability (ε = ${fmt(bound, 3)})`, 'var(--chart-val)'], ['┄', `actual 95th percentile (${fmt(q95, 3)})`, 'var(--text)']]} />
    <Metrics items={[['Bound for one fixed hypothesis', fmt(single, 3)], ['Union bound for the whole class', fmt(bound, 3)], ['Actual 95% worst-case gap', fmt(q95, 3)], ['ERM’s average excess error', fmt(trials.reduce((s, t) => s + t.excess, 0) / trials.length, 4)]]} />
    <Insight title="What to notice">For one fixed hypothesis, training error is within ε of the truth with high probability — Hoeffding. But ERM picks the hypothesis that looks best, so we need every gap small at once: the union bound pays log |H|. The bound always holds, and shrinks like 1/√n. Now compare |H| = 50 with 1,000: the actual worst gap barely moves, because neighbouring thresholds make nearly the same predictions. The union bound over-counts them — which is why capacity is better measured by VC dimension than by |H|.</Insight>
  </>
}

function ShatterView() {
  const [set, setSet] = useState('three'), pts = POINT_SETS[set].pts, s = useMemo(() => shatter(pts), [pts])
  return <>
    <Controls><Choice label="Point set" value={set} onChange={setSet} options={Object.entries(POINT_SETS).map(([k, v]) => [k, v.name])} /></Controls>
    <p className="ml-caption">{`${s.realizable} of ${s.results.length} labellings can be produced by a straight line (half-plane). ${s.shattered ? 'All of them: the set is shattered.' : 'Not all: the set is not shattered.'}`}</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
      {s.results.map((r, k) => { const X = v => 48 + v * 30, Y = v => 48 - v * 30, [a, b, c] = r.w
        const line = Math.abs(b) > 1e-9 ? [[-1.6, -(a * -1.6 + c) / b], [1.6, -(a * 1.6 + c) / b]] : Math.abs(a) > 1e-9 ? [[-c / a, -1.6], [-c / a, 1.6]] : null
        return <svg key={k} viewBox="0 0 96 112" style={{ border: `2px solid ${r.ok ? 'var(--chart-model)' : '#ef4444'}`, borderRadius: 8 }} role="img" aria-label={`labelling ${k + 1}: ${r.ok ? 'realizable' : 'not realizable'}`}>
          {r.ok && line && !r.labels.every(l => l === r.labels[0]) && <line x1={X(line[0][0])} y1={Y(line[0][1])} x2={X(line[1][0])} y2={Y(line[1][1])} stroke="var(--muted)" strokeWidth="1.5" />}
          {pts.map((p, i) => <circle key={i} cx={X(p[0])} cy={Y(p[1])} r="6" fill={r.labels[i] ? 'var(--chart-val)' : 'var(--chart-train)'} stroke="var(--text)" strokeWidth="0.8" />)}
          <text x="48" y="106" textAnchor="middle" style={{ fontSize: 12, fontWeight: 700 }} fill={r.ok ? 'var(--chart-model)' : '#ef4444'}>{r.ok ? '✓ realizable' : '✗ impossible'}</text>
        </svg> })}
    </div>
    <Insight title="What to notice">Three points in general position can be split every one of the 8 ways, so half-planes in 2D have VC dimension at least 3. No set of four points can be shattered: the square fails on the two diagonal (XOR) labellings, and a point inside a triangle cannot be separated from the three around it. So the VC dimension is exactly 3 = d + 1. Note that three points on a line are not shattered — VC dimension asks whether **some** set of that size can be shattered, not every set.</Insight>
  </>
}

function DoubleView() {
  const [ridge, setRidge] = useState(false)
  const rows = useMemo(() => doubleDescent({ ridge: ridge ? 0.1 : 1e-8 }), [ridge])
  const ly = v => Math.log10(Math.max(v, 1e-3)), iN = PS.indexOf(40)
  const best = rows.slice(0, iN).reduce((b, r) => r.test < b.test ? r : b)
  return <>
    <Controls><Toggle label="Add a small ridge penalty (λ = 0.1)" checked={ridge} onChange={setRidge} /></Controls>
    <Caption>40 training examples of a noisy linear function in 10 dimensions. Features are p random ReLU units; the fit is the minimum-norm least-squares solution, which interpolates the training data exactly once p ≥ 40.</Caption>
    <Plot x={[0, PS.length - 1]} y={[-3, 2]} height={260} xTicks={PS.length} xFormat={v => PS[Math.round(v)]} yFormat={v => 10 ** v >= 1 ? String(Math.round(10 ** v)) : (10 ** v).toPrecision(1)} xLabel="number of features p (log-like spacing)" yLabel="mean squared error (log scale)" label="Double descent">{({ X, Y }) => <>
      <rect x={X(iN) - 3} y={Y(2)} width={6} height={Y(-3) - Y(2)} fill="var(--chart-val)" opacity="0.2" />
      <Path X={X} Y={Y} points={rows.map((r, i) => [i, ly(r.train)])} stroke="var(--chart-train)" width={2.2} />
      <Path X={X} Y={Y} points={rows.map((r, i) => [i, ly(r.test)])} stroke="var(--chart-val)" width={2.8} />
    </>}</Plot>
    <Legend items={[['━', 'training error', 'var(--chart-train)'], ['━', 'test error', 'var(--chart-val)'], ['▮', 'interpolation threshold p = n = 40', 'var(--chart-val)']]} />
    <Metrics items={[['Best test error with p < 40', `${fmt(best.test, 2)} (p = ${best.p})`], ['Test error at p = 40', fmt(rows[iN].test, 2)], ['Test error at p = 400', fmt(rows.at(-1).test, 2)], ['Weight norm at p = 40 vs 400', `${fmt(rows[iN].norm, 1)} vs ${fmt(rows.at(-1).norm, 1)}`]]} />
    <Insight title="What to notice">Classical theory predicts a U: more features, more overfitting. That is true up to the **interpolation threshold** p = n, where the model can just barely fit every point — including the noise — and needs enormous weights to do so: test error explodes. Past it, many interpolating solutions exist and the minimum-norm one gets smoother as p grows, so test error falls again, here below the best smaller model. This **double descent** helps explain why huge networks generalize. A little ridge regularization removes the spike.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('uniform')
  return <>
    <PanelHeading title="Why does training error say anything about the future?" pill="learning theory" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['uniform', 'Generalization bounds for a finite class'], ['shatter', 'VC dimension: shattering points'], ['double', 'Double descent']]} /></Controls>
    {view === 'uniform' ? <UniformView /> : view === 'shatter' ? <ShatterView /> : <DoubleView />}
  </>
}
