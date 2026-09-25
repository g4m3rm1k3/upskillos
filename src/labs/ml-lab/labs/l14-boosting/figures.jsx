// Figures placed between the paragraphs of Lab 14 (14.1–14.5).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Radio, Readout, MiniPlot, Path, Dots, VLine, HLine, curve, Table, r } from '../../kit/fig.jsx'
import { truth, makeData, boost, predictAt, mse, stageErrors, bestStage } from './engine.js'
import { buildTree, predict } from '../l12-trees/engine.js'
import { sigmoid } from '../../kit/math.js'

const TRAIN = makeData(60, 0.35, 14), VAL = makeData(300, 0.35, 114)

// ---------- 14.1 ----------
export function StageStepper() {
  const [k, setK] = useState(0), rate = 0.3, model = useMemo(() => boost(TRAIN, { stages: 60, rate, depth: 1 }), [])
  const F = x => predictAt(model, [x], k), next = model.trees[k], res = TRAIN.map(p => [p.x[0], p.y - F(p.x[0])])
  return <div>
    <Controls><Slider label="stages so far" value={k} min={0} max={59} step={1} onChange={setK} digits={0} /></Controls>
    <MiniPlot height={200} x={[-3, 3]} y={[-2.5, 3]} xLabel="x" yLabel="y" label={`Ensemble after ${k} stages`}>{({ X, Y }) => <>
      <Dots X={X} Y={Y} points={TRAIN.map(p => [p.x[0], p.y])} rad={2.5} color="var(--muted)" />
      <Path X={X} Y={Y} points={curve(F, -3, 3, 400)} />
    </>}</MiniPlot>
    <MiniPlot height={180} x={[-3, 3]} y={[-2.5, 2.5]} xLabel="x" yLabel="residual y − F(x)" label="Residuals and the next stump">{({ X, Y }) => <>
      <HLine X={X} Y={Y} y={0} x0={-3} x1={3} color="var(--muted)" dash="" />
      <Dots X={X} Y={Y} points={res} rad={2.5} color="var(--chart-val)" />
      <Path X={X} Y={Y} points={curve(x => predict(next, [x]), -3, 3, 400)} stroke="var(--text)" width={2} />
    </>}</MiniPlot>
    <Readout>Top: F after {k} stages (starting from the mean {r(model.base, 3)}), training MSE {r(mse(model, TRAIN, k), 4)}. Bottom: what it still misses (orange) and the next stump fitted to those residuals (black). Next update: F ← F + {rate} × stump.</Readout>
  </div>
}

// ---------- 14.2 ----------
export function GradientArrows() {
  const [k, setK] = useState(3), model = useMemo(() => boost(TRAIN, { stages: 30, rate: 0.3, depth: 1 }), []), F = x => predictAt(model, [x], k)
  const g = TRAIN.map(p => ({ x: p.x, y: p.y - F(p.x[0]) })), stump = buildTree(g, { maxDepth: 1, criterion: 'mse' })
  return <div>
    <Controls><Slider label="stages so far" value={k} min={0} max={29} step={1} onChange={setK} digits={0} /></Controls>
    <MiniPlot x={[-3, 3]} y={[-2.5, 3]} xLabel="x" yLabel="y" label="Negative gradients at the training points">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(F, -3, 3, 300)} width={1.5} />
      {TRAIN.map((p, i) => <line key={i} x1={X(p.x[0])} x2={X(p.x[0])} y1={Y(F(p.x[0]))} y2={Y(p.y)} stroke="var(--chart-val)" strokeWidth="1.5" />)}
      <Path X={X} Y={Y} points={curve(x => F(x) + predict(stump, [x]), -3, 3, 300)} stroke="var(--text)" dash="4 3" width={1.5} />
    </>}</MiniPlot>
    <Readout>Each orange segment is one point’s negative gradient y − F(x): the direction and size gradient descent would move that prediction. Moving training predictions directly would teach nothing about new x; a stump fitted to the arrows (dashed: F plus the full correction) turns them into a correction defined everywhere.</Readout>
  </div>
}

export function LossGradients() {
  const [loss, setLoss] = useState('squared')
  const g = { squared: e => e, absolute: e => Math.sign(e), logistic: e => e }[loss]
  return <div>
    <Controls><Radio name="glosss" value={loss} onChange={setLoss} options={[['squared', 'squared error ½(y − F)²'], ['absolute', 'absolute error |y − F|'], ['logistic', 'log loss (y ∈ {0, 1}, F = log-odds)']]} /></Controls>
    {loss === 'logistic'
      ? <MiniPlot x={[-6, 6]} y={[-1, 1]} xLabel="score F" yLabel="negative gradient y − σ(F)" label="Log-loss negative gradient">{({ X, Y }) => <><Path X={X} Y={Y} points={curve(F => 1 - sigmoid(F), -6, 6)} /><Path X={X} Y={Y} points={curve(F => 0 - sigmoid(F), -6, 6)} stroke="var(--chart-val)" /></>}</MiniPlot>
      : <MiniPlot x={[-5, 5]} y={[-5, 5]} xLabel="residual y − F" yLabel="negative gradient" label={`${loss} loss negative gradient`}>{({ X, Y }) => <Path X={X} Y={Y} points={curve(g, -5, 5, 400)} />}</MiniPlot>}
    <Readout>{loss === 'squared' ? 'The negative gradient is the residual itself: an outlier 5 units away pulls 5 times as hard as one 1 unit away.' : loss === 'absolute' ? 'The negative gradient is only the sign of the residual: every point pulls equally hard, so outliers cannot dominate.' : 'Purple: positives (y = 1), 1 − σ(F). Orange: negatives, −σ(F). Label minus probability — the same quantity as logistic regression’s gradient.'}</Readout>
  </div>
}

// ---------- 14.3–14.4 ----------
export function ShrinkageCurves({ patience: p0 = null }) {
  const [rate, setRate] = useState(0.1), [depth, setDepth] = useState(2), [patience, setPatience] = useState(p0 ?? 20)
  const errs = useMemo(() => stageErrors(boost(TRAIN, { stages: 300, rate, depth }), TRAIN, VAL), [rate, depth]), best = bestStage(errs)
  let stop = errs.length - 1, bestSoFar = Infinity, since = 0
  if (p0 !== null) for (const e of errs) { if (e.val < bestSoFar - 1e-12) { bestSoFar = e.val; since = 0 } else if (++since >= patience) { stop = e.stage; break } }
  const kept = p0 !== null ? errs.slice(0, stop + 1).reduce((b, e) => (e.val < b.val ? e : b)) : errs[best]
  return <div>
    <Controls>
      <Slider label="shrinkage ν" value={rate} min={0.01} max={1} step={0.01} onChange={setRate} />
      <Slider label="tree depth" value={depth} min={1} max={6} step={1} onChange={setDepth} digits={0} />
      {p0 !== null && <Slider label="patience (stages)" value={patience} min={1} max={100} step={1} onChange={setPatience} digits={0} />}
    </Controls>
    <MiniPlot x={[0, 300]} y={[0, 0.8]} xLabel="stage" yLabel="MSE" label={`Best validation stage ${best}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={errs.map(e => [e.stage, Math.min(0.8, e.train)])} stroke="var(--chart-train)" />
      <Path X={X} Y={Y} points={errs.map(e => [e.stage, Math.min(0.8, e.val)])} stroke="var(--chart-val)" />
      <HLine X={X} Y={Y} y={0.35 ** 2} x0={0} x1={300} color="var(--muted)" />
      <VLine X={X} Y={Y} x={best} y0={0} y1={0.8} />
      {p0 !== null && <VLine X={X} Y={Y} x={stop} y0={0} y1={0.8} color="#ef4444" />}
    </>}</MiniPlot>
    <Readout>Training MSE (blue) keeps falling; validation (orange) is lowest at stage <strong>{best}</strong> ({r(errs[best].val, 4)}; noise floor 0.1225 in grey). {p0 !== null ? <>Early stopping with patience {patience} halts at stage {stop} (red) and keeps stage <strong>{kept.stage}</strong> (validation {r(kept.val, 4)}).</> : `With ν = ${r(rate, 2)} and depth ${depth}, stage 300 has validation MSE ${r(errs[300].val, 4)}.`}</Readout>
  </div>
}

// ---------- 14.5 ----------
export function HistogramBins() {
  const [bins, setBins] = useState(16), xs = TRAIN.map(p => p.x[0]).sort((a, b) => a - b), lo = xs[0], hi = xs[xs.length - 1], edges = Array.from({ length: bins - 1 }, (_, i) => lo + (hi - lo) * (i + 1) / bins)
  return <div>
    <Controls><Slider label="bins" value={bins} min={2} max={64} step={1} onChange={setBins} digits={0} /></Controls>
    <MiniPlot height={130} x={[-3, 3]} y={[0, 1]} yTicks={2} grid={false} xLabel="feature value" label={`${bins - 1} bin boundaries`}>{({ X, Y }) => <>
      {edges.map((e, i) => <line key={i} x1={X(e)} x2={X(e)} y1={Y(0.1)} y2={Y(0.9)} stroke="var(--chart-val)" strokeWidth="1.2" />)}
      <Dots X={X} Y={Y} points={xs.map((v, i) => [v, 0.3 + 0.4 * ((i * 7) % 5) / 5])} rad={2.5} />
    </>}</MiniPlot>
    <Table head={['method', 'candidate thresholds']} rows={[['exact: midpoints between sorted distinct values', xs.length - 1], [`histogram with ${bins} bins`, bins - 1]]} label="Candidate thresholds" />
    <Readout>With millions of rows the exact scan tries millions of thresholds per node; the histogram scan tries at most {bins - 1}, whatever n is. The cost: thresholds can only fall on bin boundaries (orange lines).</Readout>
  </div>
}
