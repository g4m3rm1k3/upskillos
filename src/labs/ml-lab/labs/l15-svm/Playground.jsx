import React, { useMemo, useState } from 'react'
import { maps, rbfMap, trainSVM, score, analyse, hinge, logistic } from './engine.js'
import { initial, step, prob } from '../l08-logistic/engine.js'
import { classification, split, bounds } from '../../kit/datasets.js'
import { Plot, Path, ClassDots, Contour } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Legend } from '../../kit/ui.jsx'
import { fmt, pct, linspace, mean } from '../../kit/math.js'

const LAMBDAS = [0.0003, 0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1]

export default function Playground() {
  const [kind, setKind] = useState('blobs'), [mapName, setMap] = useState('linear'), [li, setLi] = useState(3), [gamma, setGamma] = useState(1)
  const [seed, setSeed] = useState(1), [showLogistic, setShowLogistic] = useState(true)
  const lambda = LAMBDAS[li]
  const data = useMemo(() => split(classification(kind, { seed, n: 180 }), 0.7, seed), [kind, seed])
  const fm = useMemo(() => mapName === 'rbf' ? rbfMap(gamma) : maps[mapName](), [mapName, gamma])
  const w = useMemo(() => trainSVM(data.train, fm, { lambda }), [data, fm, lambda])
  const a = analyse(w, fm, data.train, lambda), f = score(w, fm)
  const valAcc = mean(data.validation.map(p => ((f(p.x1, p.x2) > 0 ? 1 : 0) === p.label ? 1 : 0)))
  const logit = useMemo(() => { let m = initial('linear'); for (let i = 0; i < 1500; i++) m = step(m, data.train, 'linear', 0.5, 0.001); return m }, [data])
  const b = bounds([...data.train, ...data.validation])
  return <>
    <PanelHeading title="The widest street between the classes." pill={`${a.supportVectors.size} support vectors`} />
    <Controls>
      <Choice label="Dataset" value={kind} onChange={setKind} options={[['blobs', 'Two blobs (separable)'], ['overlap', 'Overlapping blobs'], ['circles', 'Circle inside ring'], ['moons', 'Two moons']]} />
      <Choice label="Feature map (kernel idea)" value={mapName} onChange={setMap} options={[['linear', 'Linear'], ['quadratic', 'Quadratic (polynomial kernel, degree 2)'], ['rbf', 'RBF kernel (120 random Fourier features)']]} />
      <Slider label="Regularization λ (C ∝ 1/λ)" value={li} min={0} max={LAMBDAS.length - 1} onChange={setLi} format={i => LAMBDAS[i]} />
      {mapName === 'rbf' && <Slider label="RBF width γ" value={gamma} min={0.1} max={8} step={0.1} onChange={setGamma} format={v => v.toFixed(1)} />}
      <div className="ml-toggles"><Toggle label="Show logistic-regression boundary (linear)" checked={showLogistic} onChange={setShowLogistic} /><label>Seed<input type="number" min="0" max="99999" value={seed} onChange={e => e.target.value !== '' && setSeed(Math.max(0, Math.min(99999, Math.trunc(+e.target.value))))} /></label></div>
    </Controls>
    <Legend items={[['━', 'SVM boundary f(x) = 0', 'var(--text)'], ['┄', 'margins f(x) = ±1', 'var(--muted)'], ['◯', 'support vectors (y·f ≤ 1)', 'var(--text)'], ['━', 'logistic regression, p = 0.5', 'var(--accent)']]} />
    <Plot x={b.x} y={b.y} xLabel="x1" yLabel="x2" label="SVM decision boundary, margins and support vectors">{({ X, Y, x0, x1, y0, y1 }) => <>
      <Contour X={X} Y={Y} x0={x0} x1={x1} y0={y0} y1={y1} f={f} level={1} stroke="var(--muted)" width={1.5} dash="5 4" />
      <Contour X={X} Y={Y} x0={x0} x1={x1} y0={y0} y1={y1} f={f} level={-1} stroke="var(--muted)" width={1.5} dash="5 4" />
      <Contour X={X} Y={Y} x0={x0} x1={x1} y0={y0} y1={y1} f={f} level={0} width={2.5} />
      {showLogistic && <Contour X={X} Y={Y} x0={x0} x1={x1} y0={y0} y1={y1} f={(p, q) => prob(logit, [p, q])} level={0.5} stroke="var(--accent)" width={2} />}
      <ClassDots X={X} Y={Y} points={data.train} r={3.3} />
      {data.train.map((p, i) => a.supportVectors.has(i) && <circle key={i} cx={X(p.x1)} cy={Y(p.x2)} r="7" fill="none" stroke="var(--text)" strokeWidth="1.5" />)}
    </>}</Plot>
    <Metrics items={[['Training accuracy', pct(a.accuracy)], ['Validation accuracy', pct(valAcc)], ['Support vectors', `${a.supportVectors.size} / ${data.train.length}`], [mapName === 'linear' ? 'Margin width 2/‖w‖' : 'Objective', mapName === 'linear' ? fmt(a.width, 3) : fmt(a.objective, 4)]]} />
    <Legend items={[['━', 'hinge max(0, 1 − m)', 'var(--text)'], ['━', 'logistic loss (bits)', 'var(--accent)']]} />
    <Plot x={[-2.5, 3]} y={[0, 3.6]} height={200} xLabel="margin m = y · f(x)" yLabel="loss" label="Hinge loss versus logistic loss">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={linspace(-2.5, 3, 100).map(m => [m, hinge(m)])} stroke="var(--text)" />
      <Path X={X} Y={Y} points={linspace(-2.5, 3, 100).map(m => [m, logistic(m)])} stroke="var(--accent)" />
      {a.margins.map((m, i) => <circle key={i} cx={X(Math.max(-2.5, Math.min(3, m)))} cy={Y(0.08)} r="2" fill={m < 1 ? 'var(--chart-val)' : 'var(--chart-train)'} opacity="0.6" />)}
    </>}</Plot>
    <Insight title="Only the points on or inside the margin matter">Dots under the loss plot are the training points’ margins. Every point with m ≥ 1 has zero hinge loss and zero gradient — move it anywhere outside the street and the SVM does not change. The boundary is determined entirely by the **support vectors** (m ≤ 1). Logistic loss never reaches zero, so every point pulls a little. Small λ (large C) narrows the street to fit training points; large λ widens it and lets more points inside.</Insight>
  </>
}
