// Figures placed between the paragraphs of Lab 23 (23.3, 23.5), drawn from the lab's own loop simulation.
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Check, Readout, MiniPlot, Path, r } from '../../kit/fig.jsx'
import { simulate } from './engine.js'

// ---------- 23.3 ----------
export function ZeroGradCurves() {
  const [lr, setLr] = useState(0.02)
  const on = useMemo(() => simulate({ lr }), [lr]), off = useMemo(() => simulate({ lr, zeroGrad: false }), [lr])
  const pts = log => log.map(l => [l.t, Math.log10(Math.max(l.train, 1e-6))])
  const last = log => log.at(-1).train
  return <div>
    <Controls><Slider label="learning rate" value={lr} min={0.005} max={0.03} step={0.005} onChange={setLr} digits={3} /></Controls>
    <MiniPlot x={[0, 80]} y={[-2, 6.5]} xLabel="training step" yLabel="log₁₀ training loss" label={`Training loss with zero_grad (ends at ${r(last(on.log), 3)}) and without it (ends at ${last(off.log) >= 1e6 ? 'over a million' : r(last(off.log), 3)})`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={pts(on.log)} stroke="var(--chart-train)" />
      <Path X={X} Y={Y} points={pts(off.log)} stroke="var(--chart-val)" dash="5 4" />
    </>}</MiniPlot>
    <Readout>With zero_grad (solid) the loss falls to {r(last(on.log), 3)}. Without it (dashed) every step uses the sum of all gradients so far, momentum amplifies that sum, and the loss {last(off.log) >= 1e6 ? 'passes a million (the plot is capped there)' : `ends at ${r(last(off.log), 3)}`}.</Readout>
  </div>
}

// ---------- 23.5 ----------
export function ResumeDrift() {
  const [save, setSave] = useState(false)
  const res = useMemo(() => simulate({ saveOptimizer: save }), [save])
  const drift = res.log.map((l, i) => [l.t, Math.max(...l.params.map((v, j) => Math.abs(v - res.reference[i].params[j])))])
  return <div>
    <Controls><Check label="save the optimizer’s state in the checkpoint" checked={save} onChange={setSave} /></Controls>
    <MiniPlot x={[0, 80]} y={[0, 0.5]} xLabel="training step (restart after step 40)" yLabel="largest weight difference" label={`Difference between the resumed run and the uninterrupted one; largest ${r(res.drift, 4)}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={drift} stroke="var(--chart-model)" />
    </>}</MiniPlot>
    <Readout>{save ? `With the optimizer’s state saved, the resumed run is identical to the uninterrupted one (largest difference ${r(res.drift, 6)}).` : `Without it, momentum restarts from zero at step 41 and the weights take a different path: the largest difference reaches ${r(res.drift, 3)}, although the loss curves look almost the same.`}</Readout>
  </div>
}
