// Figures placed between the paragraphs of Lab 22 (22.1–22.4). Paths come from the lab's own engine.
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Check, Readout, MiniPlot, Path, Dots, Contour, r, curve } from '../../kit/fig.jsx'
import { random, normal, range, mean, std } from '../../kit/math.js'
import { run, SURFACES } from './engine.js'

// ---------- 22.1 ----------
// The playground's regression data; gradient of the MSE in w at w = b = 0, over many random mini-batches.
const DATA = (() => { const rng = random(3), X = range(256).map(() => -2 + 4 * rng()), Y = X.map(x => 3 * x - 1 + 0.6 * normal(rng)); return { X, Y } })()
const gradW = idx => 2 * mean(idx.map(i => (0 - DATA.Y[i]) * DATA.X[i]))
const SIZES = [1, 2, 4, 8, 16, 32, 64, 128]
const SPREADS = (() => {
  const rng = random(11)
  return SIZES.map(B => std(range(400).map(() => gradW(range(B).map(() => Math.floor(rng() * 256))))))
})()
export function BatchSpread() {
  const [k, setK] = useState(3)
  const B = SIZES[k], ref = s => SPREADS[0] / Math.sqrt(s)
  const pts = SIZES.map((s, i) => [Math.log2(s), SPREADS[i]])
  return <div>
    <Controls><Slider label="batch size: k in B = 2ᵏ" value={k} min={0} max={SIZES.length - 1} step={1} onChange={setK} digits={0} /></Controls>
    <MiniPlot x={[0, 7]} y={[0, SPREADS[0] * 1.1]} xTicks={8} xFormat={v => String(2 ** Math.round(v))} xLabel="batch size B" yLabel="spread of the estimate" label={`Spread of the mini-batch gradient against batch size; at B = ${B} it is ${r(SPREADS[k], 2)}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(t => ref(2 ** t), 0, 7)} stroke="var(--chart-ref)" dash="5 4" />
      <Dots X={X} Y={Y} points={pts} />
      <Dots X={X} Y={Y} points={[pts[k]]} color="var(--accent)" rad={6} />
    </>}</MiniPlot>
    <Readout>Batch {B}: the gradient estimate varies by about {r(SPREADS[k], 2)} from batch to batch (dots, 400 batches each), against {r(SPREADS[0], 2)} for a single example. The dashed line is 1/√B: to halve the noise you need four times the batch.</Readout>
  </div>
}

// ---------- 22.2 ----------
export function ValleyPaths() {
  const [lr, setLr] = useState(0.035), [kappa, setKappa] = useState(25)
  const gd = useMemo(() => run('valley', 'sgd', { lr, steps: 150, kappa }), [lr, kappa])
  const mo = useMemo(() => run('valley', 'momentum', { lr, steps: 150, kappa }), [lr, kappa])
  const f = p => SURFACES.valley.f(p, kappa), end = res => (res.diverged ? Infinity : f(res.path.at(-1)))
  const clip = path => path.map(([x, y]) => [Math.max(-5, Math.min(5, x)), Math.max(-3, Math.min(3, y))])
  return <div>
    <Controls>
      <Slider label="step size α" value={lr} min={0.005} max={0.08} step={0.005} onChange={setLr} digits={3} />
      <Slider label="κ (how elongated)" value={kappa} min={1} max={100} step={1} onChange={setKappa} digits={0} />
    </Controls>
    <MiniPlot x={[-5, 5]} y={[-3, 3]} xLabel="x" yLabel="y" label={`Gradient descent and momentum on the valley with α = ${lr}, κ = ${kappa}`}>{({ X, Y }) => <>
      {[0.5, 2, 6, 15, 40].map(level => <Contour key={level} X={X} Y={Y} x0={-5} x1={5} y0={-3} y1={3} f={(x, y) => f([x, y]) - level} stroke="var(--border)" width={1} />)}
      <Path X={X} Y={Y} points={clip(gd.path)} stroke="var(--muted)" width={1.6} />
      <Path X={X} Y={Y} points={clip(mo.path)} stroke="var(--chart-train)" width={1.8} />
    </>}</MiniPlot>
    <Readout>After 150 steps: gradient descent (grey) {gd.diverged ? 'diverged' : `reached f = ${end(gd).toExponential(1)}`}; momentum (blue) {mo.diverged ? 'diverged' : `reached f = ${end(mo).toExponential(1)}`}. Gradient descent is stable only while α is below 2/κ = {r(2 / kappa, 3)}.</Readout>
  </div>
}

// ---------- 22.3 ----------
export function AdamScale() {
  const [lg, setLg] = useState(0), alpha = 0.01
  const g = 10 ** lg
  const adam = alpha * ((0.1 * g) / 0.1) / (Math.sqrt((0.001 * g * g) / 0.001) + 1e-8)
  return <div>
    <Controls><Slider label="log₁₀ of the gradient g" value={lg} min={-3} max={3} step={0.5} onChange={setLg} digits={1} /></Controls>
    <table className="ml-fig-table">
      <caption>The first update for a gradient of {g.toExponential(0)}, α = {alpha}</caption>
      <thead><tr><th scope="col">Optimizer</th><th scope="col">Step</th></tr></thead>
      <tbody>
        <tr><th scope="row">Gradient descent: α·g</th><td>{(alpha * g).toExponential(2)}</td></tr>
        <tr><th scope="row">Adam, bias-corrected: α·m̂/√v̂</th><td>{adam.toExponential(2)}</td></tr>
      </tbody>
    </table>
    <Readout>Gradient descent’s step grows with the gradient; Adam’s first step is α whatever the gradient’s size, because m̂/√v̂ = g/|g|. Parameters with tiny gradients and parameters with huge ones move at comparable speeds.</Readout>
  </div>
}

// ---------- 22.4 ----------
const T = 1000, A0 = 0.1
const SCHED = {
  constant: { label: 'constant', f: () => A0, color: 'var(--muted)' },
  step: { label: 'step: ÷10 at the halfway point', f: t => (t < T / 2 ? A0 : A0 / 10), color: 'var(--chart-train)' },
  cosine: { label: 'cosine decay', f: t => A0 * 0.5 * (1 + Math.cos(Math.PI * t / T)), color: 'var(--chart-val)' },
  warm: { label: 'warm-up 100 steps, then cosine', f: t => (t < 100 ? A0 * (t + 1) / 100 : A0 * 0.5 * (1 + Math.cos(Math.PI * (t - 100) / (T - 100)))), color: 'var(--chart-model)' },
}
export function ScheduleCurves() {
  const [on, setOn] = useState({ constant: true, step: true, cosine: true, warm: true }), [t, setT] = useState(500)
  return <div>
    <Controls>
      {Object.entries(SCHED).map(([k, s]) => <Check key={k} label={s.label} checked={on[k]} onChange={v => setOn(o => ({ ...o, [k]: v }))} />)}
      <Slider label="step t" value={t} min={0} max={T - 1} step={1} onChange={setT} digits={0} />
    </Controls>
    <MiniPlot x={[0, T]} y={[0, 0.11]} xLabel="training step" yLabel="learning rate" label={`Learning-rate schedules over ${T} steps; at step ${t}: ${Object.entries(SCHED).filter(([k]) => on[k]).map(([, s]) => `${s.label} ${r(s.f(t), 4)}`).join('; ')}`}>{({ X, Y }) => <>
      {Object.entries(SCHED).filter(([k]) => on[k]).map(([k, s]) => <Path key={k} X={X} Y={Y} points={curve(s.f, 0, T - 1, 400)} stroke={s.color} width={2} />)}
      <Dots X={X} Y={Y} points={Object.entries(SCHED).filter(([k]) => on[k]).map(([, s]) => [t, s.f(t)])} color="var(--accent)" rad={4} />
    </>}</MiniPlot>
    <Readout>At step {t}: {Object.entries(SCHED).filter(([k]) => on[k]).map(([, s]) => `${s.label} ${r(s.f(t), 4)}`).join(' · ') || 'nothing selected'}.</Readout>
  </div>
}
