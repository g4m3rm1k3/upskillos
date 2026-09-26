// Figures placed between the paragraphs of Lab 25 (25.2–25.4).
import React, { useState } from 'react'
import { Controls, Slider, Check, Radio, Readout, MiniPlot, Path, Dots, Label, r, curve } from '../../kit/fig.jsx'

// Fixed two-dimensional embeddings, so means can be drawn.
const E = { '<pad>': [0, 0], deploy: [1, 0], error: [0, 1], restart: [0.3, 0.2], login: [0.2, 0.35] }
const mean2 = pts => pts.length ? [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length] : [0, 0]

// ---------- 25.2 ----------
const ORDERS = { a: ['login', 'deploy', 'restart', 'error'], b: ['login', 'error', 'restart', 'deploy'] }
export function OrderMean() {
  const [o, setO] = useState('a')
  const seq = ORDERS[o], m = mean2(seq.map(t => E[t]))
  return <div>
    <Controls><Radio name="order25" value={o} onChange={setO} options={[['a', 'login, deploy, restart, error (label 1)'], ['b', 'login, error, restart, deploy (label 0)']]} /></Controls>
    <MiniPlot x={[-0.1, 1.1]} y={[-0.1, 1.1]} xLabel="embedding coordinate 1" yLabel="coordinate 2" label={`The four token embeddings and their mean (${r(m[0], 3)}, ${r(m[1], 3)}) for the order ${seq.join(', ')}`}>{({ X, Y }) => <>
      <Dots X={X} Y={Y} points={seq.map(t => E[t])} />
      {seq.map((t, i) => { const right = E[t][0] > 0.7; return <Label key={t} X={X} Y={Y} x={E[t][0] + (right ? -0.03 : 0.03)} y={E[t][1] + 0.04} anchor={right ? 'end' : 'start'}>{i + 1}. {t}</Label> })}
      <Dots X={X} Y={Y} points={[m]} color="var(--accent)" rad={6} />
      <Label X={X} Y={Y} x={m[0] + 0.03} y={m[1] - 0.06} color="var(--accent)">mean</Label>
    </>}</MiniPlot>
    <Readout>Mean embedding ({r(m[0], 3)}, {r(m[1], 3)}) for both orders: the numbers next to the tokens change, the mean does not. The labels differ, so no classifier on the mean can tell these two apart.</Readout>
  </div>
}

// ---------- 25.3 ----------
export function GradThroughTime() {
  const [scale, setScale] = useState(0.9), [slope, setSlope] = useState(1), [k, setK] = useState(25)
  const f = scale * slope
  return <div>
    <Controls>
      <Slider label="scale of W_h" value={scale} min={0.5} max={1.5} step={0.05} onChange={setScale} />
      <Slider label="tanh slope per step" value={slope} min={0.3} max={1} step={0.05} onChange={setSlope} />
      <Slider label="steps back k" value={k} min={1} max={50} step={1} onChange={setK} digits={0} />
    </Controls>
    <MiniPlot x={[0, 50]} y={[-16, 10]} xLabel="steps back k" yLabel="log₁₀ gradient size" label={`Gradient size after k steps back, factor ${r(f, 3)} per step; at k = ${k} it is ${(f ** k).toExponential(1)}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(t => Math.max(-16, Math.min(10, t * Math.log10(f))), 0, 50, 100)} stroke="var(--chart-model)" />
      <Dots X={X} Y={Y} points={[[k, Math.max(-16, Math.min(10, k * Math.log10(f)))]]} color="var(--accent)" rad={6} />
    </>}</MiniPlot>
    <Readout>Each step back multiplies the gradient by about {r(scale, 2)} × {r(slope, 2)} = {r(f, 3)} (for an orthogonal W_h times a scale). After {k} steps: {(f ** k).toExponential(1)}. Below 1 it vanishes; above 1 it explodes — clip it (Lab 22).</Readout>
  </div>
}

// ---------- 25.4 ----------
export function PadDilution() {
  const [len, setLen] = useState(8), [masked, setMasked] = useState(false)
  const seq = ['deploy', 'restart', 'error'], ids = [...seq, ...Array(len - seq.length).fill('<pad>')]
  const use = masked ? seq : ids, m = mean2(use.map(t => E[t]))
  const path = [3, 4, 6, 8, 12, 16, 24].map(L => mean2([...seq, ...Array(L - 3).fill('<pad>')].map(t => E[t])))
  return <div>
    <Controls>
      <Slider label="padded to length" value={len} min={3} max={24} step={1} onChange={setLen} digits={0} />
      <Check label="mask the padding" checked={masked} onChange={setMasked} />
    </Controls>
    <MiniPlot x={[-0.05, 0.5]} y={[-0.05, 0.5]} xLabel="coordinate 1" yLabel="coordinate 2" label={`Mean embedding of deploy, restart, error padded to ${len}${masked ? ' with a mask' : ''}: (${r(m[0], 3)}, ${r(m[1], 3)})`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={path} stroke="var(--border)" dash="4 3" />
      <Dots X={X} Y={Y} points={[m]} color="var(--accent)" rad={6} />
    </>}</MiniPlot>
    <Readout>Padded to {len}: the mean is ({r(m[0], 3)}, {r(m[1], 3)}). {masked ? 'With the mask the pads are left out, so padding changes nothing.' : `Unmasked, the ${len - 3} zero pads drag it toward the origin along the dashed path — the same sequence looks different depending on its batch.`}</Readout>
  </div>
}
