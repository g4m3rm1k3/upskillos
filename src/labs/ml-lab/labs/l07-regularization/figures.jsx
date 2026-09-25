// Figures placed between the paragraphs of Lab 07 (07.1–07.6).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Radio, Readout, Bars, MiniPlot, Path, Dots, HLine, curve, Table, r } from '../../kit/fig.jsx'
import { truth, makeData, fit, predict, mse, validationCurve, biasVariance, learningCurve, softThreshold } from './engine.js'

const TRAIN = makeData(20, 0.25, 7), VAL = makeData(400, 0.25, 1007)
const lamOf = p => (p <= -8 ? 0 : 10 ** p)

// ---------- 07.1 ----------
export function PolyFit({ degree: d0 = 1 }) {
  const [d, setD] = useState(d0), m = fit(TRAIN, d, 1e-10, 'l2')
  return <div>
    <Controls><Slider label="degree" value={d} min={0} max={15} step={1} onChange={setD} digits={0} /></Controls>
    <MiniPlot x={[-1, 1]} y={[-2, 2]} xLabel="x (rescaled to [−1, 1])" yLabel="y" label={`Degree ${d} polynomial fit to 20 points`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(truth, -1, 1)} stroke="var(--muted)" dash="5 4" width={1.5} />
      <Path X={X} Y={Y} points={curve(x => Math.max(-3, Math.min(3, predict(m, x))), -1, 1, 300)} />
      <Dots X={X} Y={Y} points={TRAIN.map(p => [p.x, p.y])} color="var(--chart-val)" />
    </>}</MiniPlot>
    <Readout>Degree {d}: {d + 1} weights including the intercept. Training MSE <strong>{r(mse(m, TRAIN), 4)}</strong>, validation MSE <strong>{r(mse(m, VAL), 4)}</strong> (noise floor 0.0625). The dashed curve is the truth.</Readout>
  </div>
}

export function PowerScale() {
  const [xmax, setXmax] = useState(10), ks = [1, 2, 3, 5, 8, 10]
  return <div>
    <Controls><Slider label="largest x" value={xmax} min={1} max={20} step={1} onChange={setXmax} digits={0} /></Controls>
    <Table head={['column', ...ks.map(k => `x^${k}`)]} rows={[['largest value', ...ks.map(k => (xmax ** k).toExponential(1))]]} label="Size of each power column" />
    <Readout>The largest column is {(xmax ** 10).toExponential(1)} times the size of a column near 1{xmax === 1 ? ' — rescaled to [−1, 1], every power stays within ±1' : ''}. Such unequal columns make the loss bowl a canyon (Lab 03’s condition number).</Readout>
  </div>
}

// ---------- 07.2 ----------
export function ValidationU() {
  const [n, setN] = useState(20), curveData = useMemo(() => validationCurve({ n, noise: 0.25, seed: 7, lambda: 1e-10, penalty: 'l2', maxDegree: 12 }), [n])
  const best = curveData.reduce((b, c) => (c.val < b.val ? c : b))
  return <div>
    <Controls><Slider label="training points n" value={n} min={10} max={200} step={10} onChange={setN} digits={0} /></Controls>
    <MiniPlot x={[0, 12]} y={[0, 0.6]} xLabel="polynomial degree" yLabel="MSE" label={`Training and validation error by degree; best degree ${best.degree}`}>{({ X, Y }) => <>
      <HLine X={X} Y={Y} y={0.0625} x0={0} x1={12} />
      <Path X={X} Y={Y} points={curveData.map(c => [c.degree, Math.min(0.6, c.train)])} stroke="var(--chart-train)" />
      <Path X={X} Y={Y} points={curveData.map(c => [c.degree, Math.min(0.6, c.val)])} stroke="var(--chart-val)" />
      <Dots X={X} Y={Y} points={[[best.degree, best.val]]} color="var(--chart-val)" rad={5} />
    </>}</MiniPlot>
    <Readout>Blue: training MSE, which only falls. Orange: validation MSE, lowest at degree <strong>{best.degree}</strong> ({r(best.val, 4)}). Dashed: the noise floor σ² = 0.0625 that no model can beat. More data pushes the bottom of the U toward higher degrees.</Readout>
  </div>
}

// ---------- 07.3 ----------
export function ManyFits() {
  const [d, setD] = useState(3), bv = useMemo(() => biasVariance({ n: 20, noise: 0.25, degree: d, lambda: 1e-10, penalty: 'l2', reps: 40 }), [d])
  return <div>
    <Controls><Slider label="degree" value={d} min={0} max={15} step={1} onChange={setD} digits={0} /></Controls>
    <MiniPlot x={[-1, 1]} y={[-2.2, 2.2]} xLabel="x" yLabel="prediction" label={`40 fits of degree ${d}`}>{({ X, Y }) => <>
      {bv.preds.map((p, i) => <Path key={i} X={X} Y={Y} points={bv.grid.map((x, k) => [x, Math.max(-3, Math.min(3, p[k]))])} stroke="var(--chart-train)" width={1} opacity={0.3} />)}
      <Path X={X} Y={Y} points={bv.grid.map((x, k) => [x, bv.avg[k]])} stroke="var(--chart-model)" width={3} />
      <Path X={X} Y={Y} points={curve(truth, -1, 1)} stroke="var(--text)" dash="5 4" width={1.5} />
    </>}</MiniPlot>
    <Readout>40 training sets of 20 points each. Thin blue: each fit. Thick: their average; dashed: the truth. bias² = <strong>{r(bv.bias2, 4)}</strong> (average vs truth), variance = <strong>{r(bv.variance, 4)}</strong> (spread), noise = 0.0625; expected error ≈ {r(bv.bias2 + bv.variance + 0.0625, 4)}.</Readout>
  </div>
}

export function BiasVarianceBars() {
  const rows = useMemo(() => [0, 1, 2, 3, 5, 7, 9, 11].map(d => ({ d, ...biasVariance({ n: 20, noise: 0.25, degree: d, lambda: 1e-10, penalty: 'l2', reps: 30 }) })), [])
  const H = 0.6
  return <div>
    <MiniPlot x={[-0.5, rows.length - 0.5]} y={[0, H]} xTicks={2} xFormat={() => ''} xLabel="degree" yLabel="error" label="Bias squared, variance and noise by degree">{({ X, Y }) => rows.map((row, i) => { const parts = [[row.bias2, 'var(--chart-train)'], [row.variance, 'var(--chart-val)'], [0.0625, 'var(--muted)']]; let y0 = 0; return <g key={i}>{parts.map(([v, c], k) => { const top = Math.min(H, y0 + v), el = <rect key={k} x={X(i - 0.3)} y={Y(top)} width={X(0.6) - X(0)} height={Math.max(0, Y(y0) - Y(top))} fill={c} opacity="0.85" />; y0 = top; return el })}<text x={X(i)} y={Y(0) + 14} textAnchor="middle" style={{ fontSize: 11, fill: 'var(--text)' }}>{row.d}</text></g> })}</MiniPlot>
    <Readout>Stacked: bias² (blue), variance (orange), noise (grey). Bias falls and variance rises with degree; the total is smallest around degree {rows.reduce((b, row) => (row.bias2 + row.variance < b.bias2 + b.variance ? row : b)).d}. Bars above {H} are clipped.</Readout>
  </div>
}

// ---------- 07.4 ----------
export function RidgeShrink({ penalty = 'l2' }) {
  const [p, setP] = useState(-8), lambda = lamOf(p), m = fit(TRAIN, penalty === 'l1' ? 10 : 15, lambda, penalty)
  const zeros = m.w.filter(v => v === 0).length
  return <div>
    <Controls><Slider label="log₁₀ λ" value={p} min={-8} max={0} step={0.25} onChange={setP} /></Controls>
    <MiniPlot x={[-1, 1]} y={[-2, 2]} xLabel="x" yLabel="y" label={`Degree ${m.degree} ${penalty === 'l1' ? 'lasso' : 'ridge'} fit, λ = ${lambda}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(truth, -1, 1)} stroke="var(--muted)" dash="5 4" width={1.5} />
      <Path X={X} Y={Y} points={curve(x => Math.max(-3, Math.min(3, predict(m, x))), -1, 1, 300)} />
      <Dots X={X} Y={Y} points={TRAIN.map(q => [q.x, q.y])} color="var(--chart-val)" />
    </>}</MiniPlot>
    <Bars items={m.w.map((w, j) => ({ label: `w${j + 1}`, value: Math.max(-3, Math.min(3, w)), color: w === 0 ? 'var(--muted)' : undefined }))} min={-3} max={3} digits={2} height={120} label="Weights" />
    <Readout>λ = {lambda === 0 ? '0 (least squares)' : lambda.toExponential(1)}: validation MSE <strong>{r(mse(m, VAL), 4)}</strong>; largest |w| = {r(Math.max(...m.w.map(Math.abs)), 2)}{penalty === 'l1' ? `; ${zeros} of ${m.w.length} weights are exactly zero (grey)` : ''}. Weights beyond ±3 are clipped in the bars.</Readout>
  </div>
}

export function OneFeatureRidge() {
  const [sxy, setSxy] = useState(10), [sxx, setSxx] = useState(4), [n, setN] = useState(2), [lambda, setLambda] = useState(0.5)
  return <div>
    <Controls><Slider label="Σxy" value={sxy} min={0} max={20} step={1} onChange={setSxy} digits={0} /><Slider label="Σx²" value={sxx} min={1} max={20} step={1} onChange={setSxx} digits={0} /><Slider label="n" value={n} min={1} max={20} step={1} onChange={setN} digits={0} /><Slider label="λ" value={lambda} min={0} max={5} step={0.1} onChange={setLambda} digits={1} /></Controls>
    <Bars items={[{ label: 'least squares Σxy/Σx²', value: sxy / sxx, color: 'var(--muted)' }, { label: 'ridge Σxy/(Σx² + nλ)', value: sxy / (sxx + n * lambda), highlight: true }]} digits={3} />
    <Readout>{sxy}/({sxx} + {n}×{r(lambda, 1)}) = <strong>{r(sxy / (sxx + n * lambda), 3)}</strong>: the least-squares weight shrunk by the factor Σx²/(Σx² + nλ) = {r(sxx / (sxx + n * lambda), 3)}.</Readout>
  </div>
}

// ---------- 07.5 ----------
export function SoftThresholdPlot() {
  const [t, setT] = useState(1), [z, setZ] = useState(3)
  return <div>
    <Controls><Slider label="threshold t" value={t} min={0} max={2} step={0.1} onChange={setT} digits={1} /><Slider label="least-squares value z" value={z} min={-3} max={3} step={0.1} onChange={setZ} digits={1} /></Controls>
    <MiniPlot x={[-3, 3]} y={[-3, 3]} xLabel="z" yLabel="new weight" label={`S(${z}, ${t}) = ${r(softThreshold(z, t), 2)}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={[[-3, -3], [3, 3]]} stroke="var(--muted)" dash="4 3" width={1} />
      <Path X={X} Y={Y} points={curve(v => softThreshold(v, t), -3, 3)} />
      <Path X={X} Y={Y} points={curve(v => v / (1 + t), -3, 3)} stroke="var(--chart-val)" width={1.5} />
      <Dots X={X} Y={Y} points={[[z, softThreshold(z, t)]]} color="var(--chart-model)" rad={5} />
    </>}</MiniPlot>
    <Readout>Lasso (purple): S(z, t) = sign(z)·max(|z| − t, 0) = <strong>{r(softThreshold(z, t), 2)}</strong> — flat at exactly 0 for |z| ≤ t. Ridge-style shrinkage (orange) z/(1 + t) = {r(z / (1 + t), 2)} is never exactly zero.</Readout>
  </div>
}

// ---------- 07.6 ----------
export function LearningCurveFig() {
  const [d, setD] = useState('12'), [p, setP] = useState(-8), degree = Number(d)
  const lc = useMemo(() => learningCurve({ degree, lambda: lamOf(p), penalty: 'l2', noise: 0.25 }), [degree, p])
  const last = lc[lc.length - 1]
  return <div>
    <Controls><Radio name="lcdeg" value={d} onChange={setD} options={[['1', 'degree 1 (a line)'], ['5', 'degree 5'], ['12', 'degree 12']]} /><Slider label="log₁₀ λ" value={p} min={-8} max={0} step={0.5} onChange={setP} digits={1} /></Controls>
    <MiniPlot x={[10, 220]} y={[0, 0.5]} xLabel="training-set size n" yLabel="MSE" label="Learning curve">{({ X, Y }) => <>
      <HLine X={X} Y={Y} y={0.0625} x0={10} x1={220} />
      <Path X={X} Y={Y} points={lc.map(c => [c.n, Math.min(0.5, c.train)])} stroke="var(--chart-train)" />
      <Path X={X} Y={Y} points={lc.map(c => [c.n, Math.min(0.5, c.val)])} stroke="var(--chart-val)" />
    </>}</MiniPlot>
    <Readout>At n = 220: training {r(last.train, 4)}, validation {r(last.val, 4)}, gap {r(last.val - last.train, 4)}. {degree === 1 ? 'Both curves settle well above the noise floor: high bias — more data will not help; add flexibility.' : last.val - last.train > 0.02 ? 'Still a sizeable gap: variance — more data or a larger λ helps.' : 'Small gap near the noise floor: close to what these inputs can predict.'}</Readout>
  </div>
}
