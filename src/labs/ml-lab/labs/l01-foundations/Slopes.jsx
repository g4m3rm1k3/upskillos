import React, { useState } from 'react'
import { Plot, Path } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Table, Caption, Legend } from '../../kit/ui.jsx'

// Lesson 00b's experiment: secant slopes shrinking to a derivative, the local
// linear approximation, the chain rule, and one-parameter-at-a-time nudges.
const H = ['1', '0.5', '0.1', '0.01']
const f = t => t * t
const n = (v, d = 4) => Number(v.toFixed(d)).toString()

function Step({ number, title, children }) {
  return <section style={{ marginTop: 22 }}><h3 style={{ margin: '0 0 6px' }}><span className="ml-eyebrow" style={{ marginRight: 8 }}>Step {number}</span>{title}</h3>{children}</section>
}

export default function Slopes() {
  const [t, setT] = useState(2), [hs, setHs] = useState('1')
  const [ct, setCt] = useState(1)
  const [w, setW] = useState(1), [b, setB] = useState(0)
  const h = Number(hs), secant = (f(t + h) - f(t)) / h, tangent = 2 * t
  const line = (m, x0 = t) => [[-0.5, f(x0) + m * (-0.5 - x0)], [4.5, f(x0) + m * (4.5 - x0)]]
  const e = 3 * ct - 1, L = e * e, eps = 1e-3, measured = ((3 * (ct + eps) - 1) ** 2 - (3 * (ct - eps) - 1) ** 2) / (2 * eps)
  const err = 2 * w + b - 5, loss = err * err, dw = 2 * err * 2, db = 2 * err
  const nudged = (2 * (w + 0.01) + b - 5) ** 2 - loss, nudgedB = (2 * w + b + 0.01 - 5) ** 2 - loss
  return <>
    <PanelHeading eyebrow="Live experiment · lesson 00b" title="Watch an average slope become a derivative." pill="f(t) = t²" />
    <Caption>This workbench follows the lesson on the left. Every number here is computed from the formulas in the text, so you can check each claim yourself.</Caption>

    <Step number={1} title="From an average slope to the derivative">
      <Controls>
        <Slider label="Point t" value={t} min={0} max={3.5} step={0.5} onChange={setT} />
        <Choice label="Step h" value={hs} onChange={setHs} options={H.map(v => [v, `h = ${v}`])} />
      </Controls>
      <Plot x={[-0.5, 4.5]} y={[-5, 20]} xTicks={11} yTicks={6} height={260} xLabel="t" yLabel="f(t) = t²" label="The curve t², a secant line and the tangent">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={Array.from({ length: 101 }, (_, i) => { const x = -0.5 + 5 * i / 100; return [x, f(x)] })} stroke="var(--text)" width={2} />
        <Path X={X} Y={Y} points={line(tangent)} stroke="var(--muted)" width={1.5} dash="6 5" />
        <Path X={X} Y={Y} points={line(secant)} stroke="var(--chart-val)" width={2.5} />
        <circle cx={X(t)} cy={Y(f(t))} r="5" fill="var(--chart-train)" />
        <circle cx={X(t + h)} cy={Y(f(t + h))} r="5" fill="var(--chart-val)" />
      </>}</Plot>
      <Legend items={[['━', 'the curve t²', 'var(--text)'], ['━', `average slope from t to t + h: ${n(secant)}`, 'var(--chart-val)'], ['┄', `derivative 2t = ${n(tangent)} (the tangent)`, 'var(--muted)']]} />
      <Table head={['h', 'average slope [(t+h)² − t²] / h', 'algebra says 2t + h', 'gap to 2t']} rows={H.map(v => { const hh = Number(v), s = (f(t + hh) - f(t)) / hh; return [v === hs ? <strong key="h">{v} ◀</strong> : v, n(s), n(2 * t + hh), n(s - tangent)] })} caption="As h shrinks, the average slope approaches 2t — the derivative. The gap is exactly h." />
    </Step>

    <Step number={2} title="Check the approximation">
      <Metrics items={[['Derivative predicts a change of', `2t × h = ${n(tangent * h)}`], ['Actual change (t+h)² − t²', n(f(t + h) - f(t))], ['Difference', `${n(f(t + h) - f(t) - tangent * h)} (= h²)`]]} />
      <Caption>The derivative is a local rate: it predicts small changes well and large changes poorly. Choose h = 0.01 and the prediction is nearly exact.</Caption>
    </Step>

    <Step number={3} title="Follow the chain rule">
      <Controls><Slider label="t" value={ct} min={-1} max={3} step={0.25} onChange={setCt} /></Controls>
      <div className="ml-update">
        <code>t = {n(ct)}  →  e = 3t − 1 = {n(e)}  →  L = e² = {n(L)}</code>
        <code>rate of e per t: de/dt = 3</code>
        <code>rate of L per e: dL/de = 2e = {n(2 * e)}</code>
        <code><strong>chain rule: dL/dt = 2e × 3 = {n(6 * e)}</strong></code>
        <code>measured with a tiny nudge of t: {n(measured, 3)}</code>
      </div>
      <Caption>Multiply the rates along the chain. At t = 1, e = 2 and dL/dt = 12, matching the text. The measured value comes from nudging t by ±0.001 and never uses the rule.</Caption>
    </Step>

    <Step number={4} title="Change one parameter at a time">
      <Caption>A preview of lesson 03: one observation x = 2, y = 5 and the loss L(w, b) = (w·2 + b − 5)². It depends on **two** inputs, so it has two partial derivatives — one for each, holding the other fixed.</Caption>
      <Controls>
        <Slider label="Weight w" value={w} min={-1} max={4} step={0.1} onChange={setW} format={v => n(v, 1)} />
        <Slider label="Bias b" value={b} min={-2} max={3} step={0.1} onChange={setB} format={v => n(v, 1)} />
      </Controls>
      <Metrics items={[['error e = 2w + b − 5', n(err)], ['loss L = e²', n(loss)], ['∂L/∂w = 2e × 2', n(dw)], ['∂L/∂b = 2e', n(db)]]} />
      <Table head={['nudge', 'partial derivative predicts', 'actual change in L']} rows={[['w + 0.01 (b fixed)', n(dw * 0.01), n(nudged)], ['b + 0.01 (w fixed)', n(db * 0.01), n(nudgedB)]]} caption={`The gradient is the pair [${n(dw)}, ${n(db)}]. Negative means increasing that parameter lowers the loss.`} />
    </Step>

    <Insight title="Where this goes next">In lesson 03 the trainer computes exactly these two partial derivatives for the loss over all measurements, and its **Check gradients** button performs the nudge test from Step 4. In lesson 04, training moves w and b a little against the gradient — downhill — over and over.</Insight>
  </>
}
