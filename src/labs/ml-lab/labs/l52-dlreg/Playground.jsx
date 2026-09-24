import React, { useMemo, useState } from 'react'
import { TRAIN, VAL, train, deepNet, layerGradNorms, trainDeep, ARCHS } from './engine.js'
import { Plot, Path, ProbabilityField, Bars } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Caption, Legend, Table, Actions } from '../../kit/ui.jsx'
import { fmt, pct } from '../../kit/math.js'

const DROPS = [0, 0.1, 0.2, 0.3, 0.5], WDS = [0, 0.1, 0.3, 1], JITS = [0, 0.05, 0.1, 0.15, 0.25]
const B = [-3.3, 3.3]
let baselineCache = null

function RegView() {
  const [di, setDi] = useState(0), [wi, setWi] = useState(0), [ji, setJi] = useState(0), [table, setTable] = useState(null)
  const cfg = { dropout: DROPS[di], weightDecay: WDS[wi], jitter: JITS[ji] }
  const run = useMemo(() => train(cfg), [di, wi, ji]) // eslint-disable-line react-hooks/exhaustive-deps
  const base = baselineCache ?? (baselineCache = train({}))
  const last = run.log.at(-1), top = Math.max(1.2, ...run.log.map(l => l.val), ...base.log.map(l => l.val).slice(0, 41))
  const prob = (a, b) => { const z = run.net.forward([[a, b]])[0]; return 1 / (1 + Math.exp(z[0] - z[1])) }
  const runTable = () => setTable([['Nothing', {}], ['Early stopping only', 'early'], ['Dropout 0.3', { dropout: 0.3 }], ['Weight decay 1', { weightDecay: 1 }], ['Input jitter 0.15', { jitter: 0.15 }], ['Dropout 0.2 + decay 0.3 + jitter 0.1', { dropout: 0.2, weightDecay: 0.3, jitter: 0.1 }]].map(([name, c]) => { const r = c === 'early' ? base : train(c), row = c === 'early' ? r.best : r.log.at(-1); return [name, pct(row.trainAcc), pct(row.valAcc), fmt(row.val, 3)] }))
  return <>
    <Controls>
      <Slider label="Dropout rate" value={di} min={0} max={DROPS.length - 1} onChange={setDi} format={i => DROPS[i]} />
      <Slider label="Weight decay (decoupled, AdamW)" value={wi} min={0} max={WDS.length - 1} onChange={setWi} format={i => WDS[i]} />
      <Slider label="Input jitter (augmentation) sd" value={ji} min={0} max={JITS.length - 1} onChange={setJi} format={i => JITS[i]} />
    </Controls>
    <Caption>{`A 2-48-48-2 ReLU network (${2 * 48 + 48 + 48 * 48 + 48 + 48 * 2 + 2} parameters) trained on only 80 noisy spiral points, 10% of them mislabelled; validated on 600 fresh points.`}</Caption>
    <Plot x={[0, 400]} y={[0, top]} height={220} xLabel="epoch" yLabel="cross-entropy" label="Training and validation loss">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={base.log.map(l => [l.epoch, Math.min(top, l.val)])} stroke="var(--muted)" width={1.5} dash="6 4" />
      <Path X={X} Y={Y} points={run.log.map(l => [l.epoch, l.train])} stroke="var(--chart-train)" width={2.2} />
      <Path X={X} Y={Y} points={run.log.map(l => [l.epoch, Math.min(top, l.val)])} stroke="var(--chart-val)" width={2.6} />
      <circle cx={X(run.best.epoch)} cy={Y(run.best.val)} r="5" fill="var(--chart-val)" />
    </>}</Plot>
    <Legend items={[['━', 'training loss', 'var(--chart-train)'], ['━', 'validation loss', 'var(--chart-val)'], ['●', `best validation loss (epoch ${run.best.epoch}) — early stopping would stop here`, 'var(--chart-val)'], ['┄', 'validation loss with no regularization', 'var(--muted)']]} />
    <Plot x={B} y={B} height={300} xLabel="x₁" yLabel="x₂" label="Decision regions after training">{({ X, Y }) => <>
      <ProbabilityField X={X} Y={Y} x0={B[0]} x1={B[1]} y0={B[0]} y1={B[1]} p={prob} cells={40} />
      {TRAIN.map((d, i) => <circle key={i} cx={X(d.x[0])} cy={Y(d.x[1])} r="4" fill={d.y ? 'var(--chart-val)' : 'var(--chart-train)'} stroke="var(--text)" strokeWidth="0.7" />)}
    </>}</Plot>
    <Metrics items={[['Training accuracy', pct(last.trainAcc)], ['Validation accuracy', pct(last.valAcc)], ['Validation loss at the end', fmt(last.val, 3)], ['Best validation loss', `${fmt(run.best.val, 3)} (epoch ${run.best.epoch})`]]} />
    <Actions><button onClick={runTable}>Run the comparison table (about 3 seconds)</button></Actions>
    {table && <Table head={['regularization', 'training accuracy', 'validation accuracy', 'validation loss']} rows={table} caption="Same network, data and 400 epochs; early stopping reports the epoch with the lowest validation loss." />}
    <Insight title="What to notice">Unregularized, the network memorizes all 80 points — including the mislabelled ones, which show up as islands in the decision regions — and its validation loss climbs after about 90 epochs. Each regularizer attacks memorization differently: **dropout** randomly silences units so no single path can memorize, **weight decay** shrinks weights toward simpler functions, **input jitter** turns each point into a small cloud, and **early stopping** halts before memorization. Training accuracy falls; validation accuracy rises.</Insight>
  </>
}

const DEPTHS = [2, 4, 8, 16]
function DepthView() {
  const [depthI, setDepthI] = useState(3), [arch, setArch] = useState('tanh'), [curves, setCurves] = useState(null)
  const depth = DEPTHS[depthI], g = useMemo(() => layerGradNorms(deepNet(depth, { ...ARCHS[arch].opts, width: 16 })), [depth, arch])
  const run = () => setCurves({ depth, data: Object.fromEntries(Object.entries(ARCHS).map(([k, a]) => [k, trainDeep(depth, { ...a.opts, width: 16 }, 100)])) })
  const cols = { tanh: 'var(--muted)', relu: 'var(--chart-train)', bn: '#10b981', res: 'var(--chart-val)', resln: '#a855f7' }
  return <>
    <Controls>
      <Slider label="Hidden blocks (depth)" value={depthI} min={0} max={DEPTHS.length - 1} onChange={v => { setDepthI(v); setCurves(null) }} format={i => DEPTHS[i]} />
      <Choice label="Architecture for the gradient plot" value={arch} onChange={setArch} options={Object.entries(ARCHS).map(([k, a]) => [k, a.name])} />
    </Controls>
    <Bars label="Gradient norm reaching each hidden block at initialization (first block at the top)" format={v => v.toExponential(1)} items={g.map((v, i) => ({ label: `block ${i + 1}`, value: v }))} />
    <Actions><button onClick={run}>{`Train all five architectures at depth ${depth} (100 Adam steps, gradients clipped)`}</button></Actions>
    {curves && <>
      <Plot x={[0, 99]} y={[0, 0.75]} height={220} xLabel="step" yLabel="training loss" label="Training curves by architecture">{({ X, Y }) => Object.entries(curves.data).map(([k, c]) => <Path key={k} X={X} Y={Y} points={c.map((v, i) => [i, Math.min(0.75, v)])} stroke={cols[k]} width={2.3} />)}</Plot>
      <Legend items={Object.entries(ARCHS).map(([k, a]) => ['━', `${a.name}: ${fmt(curves.data[k].at(-1), 3)}`, cols[k]])} />
    </>}
    <Insight title="What to notice">In a deep plain network, the signal and its gradient pass through many multiplications; they shrink or grow layer by layer, and training crawls. **Batch normalization** re-centres and rescales each layer’s inputs using batch statistics, keeping activations in a healthy range. **Residual connections** add an identity path, y = x + f(x), so the gradient reaches early layers unattenuated — the plain tanh network is still far from fitting after 100 steps at depth 16 while the residual one nearly fits the data. Transformers combine residuals with **layer normalization**, which does not depend on the batch.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('reg')
  return <>
    <PanelHeading title="Keeping big networks honest and trainable." pill="regularization · normalization" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['reg', 'Regularization on a tiny noisy dataset'], ['depth', 'Depth, normalization and residual connections']]} /></Controls>
    {view === 'reg' ? <RegView /> : <DepthView />}
  </>
}
