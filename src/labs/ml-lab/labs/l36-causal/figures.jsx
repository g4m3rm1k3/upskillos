// Figures placed between the paragraphs of Lab 36 (36.2, 36.3, 36.4), built on the lab's own engine.
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Check, Readout, Bars, MiniPlot, Path, VLine, HLine, Label, r } from '../../kit/fig.jsx'
import { population, estimates, phi, sampleSize, experiments, summarize } from './engine.js'

// ---------- 36.2 ----------
export function ConfoundingDial() {
  const [conf, setConf] = useState(1.5), [noise, setNoise] = useState(0.5)
  const e = useMemo(() => estimates(population({ confounding: conf, proxyNoise: noise })), [conf, noise])
  return <div>
    <Controls>
      <Slider label="confounding (how strongly motivation drives opting in)" value={conf} min={0} max={3} step={0.25} onChange={setConf} digits={2} />
      <Slider label="proxy noise (how badly past activity measures motivation)" value={noise} min={0} max={2} step={0.25} onChange={setNoise} digits={2} />
    </Controls>
    <Bars items={[['naive', e.naive], ['stratified', e.stratified], ['regression', e.regression], ['IPW', e.ipw]].map(([l, v]) => ({ label: l, value: v, highlight: Math.abs(v - 1) < 0.15 }))} max={4} digits={2} label={`Estimates of an effect that is truly 1.00: naive ${r(e.naive, 2)}, stratified ${r(e.stratified, 2)}, regression ${r(e.regression, 2)}, IPW ${r(e.ipw, 2)}`} />
    <Readout>The true effect is 1.00 (estimates within 0.15 of it are highlighted). {conf === 0 ? 'Without confounding, even the naive difference is right.' : noise === 0 ? 'With a perfect measure of motivation, regression and IPW recover the effect; stratifying into only five groups leaves some confounding inside each group.' : `The adjustments remove only the part of motivation that past activity captures; the rest (proxy noise ${noise}) stays in every estimate — and nothing in the data reveals how much.`}</Readout>
  </div>
}

// ---------- 36.3 ----------
export function PowerCurve() {
  const [delta, setDelta] = useState(0.3), sd = 2.5
  const power = n => { const z = delta / Math.sqrt(2 * sd * sd / n); return phi(z - 1.959964) + phi(-z - 1.959964) }
  const need = sampleSize(sd, delta), xmax = 3000
  const pts = Array.from({ length: 121 }, (_, i) => { const n = 10 + i * (xmax - 10) / 120; return [n, power(n)] })
  return <div>
    <Controls><Slider label="smallest effect worth detecting δ (lessons; σ = 2.5)" value={delta} min={0.1} max={1} step={0.05} onChange={setDelta} digits={2} /></Controls>
    <MiniPlot x={[0, xmax]} y={[0, 1]} xLabel="users per arm" yLabel="power" label={`Power against users per arm for an effect of ${delta}: 80% needs ${need} per arm`}>{({ X, Y }) => <>
      <HLine X={X} Y={Y} y={0.8} x0={0} x1={xmax} color="var(--chart-val)" />
      <Path X={X} Y={Y} points={pts} stroke="var(--chart-model)" />
      {need <= xmax && <VLine X={X} Y={Y} x={need} y0={0} y1={0.8} />}
      <Label X={X} Y={Y} x={xmax * 0.62} y={0.72} color="var(--chart-val)">80% power</Label>
    </>}</MiniPlot>
    <Readout>{need <= xmax ? `80% power needs ${need.toLocaleString('en')} users per arm.` : `80% power needs ${need.toLocaleString('en')} users per arm — beyond this chart.`} Halving δ quadruples n: small effects are expensive to detect, so decide δ before starting.</Readout>
  </div>
}

// ---------- 36.4 ----------
export function PeekingSim() {
  const [peek, setPeek] = useState(true), [effect, setEffect] = useState(0), [perArm, setPerArm] = useState(200)
  const s = useMemo(() => summarize(experiments({ runs: 300, perArm, effect, peek }), effect), [peek, effect, perArm])
  return <div>
    <Controls>
      <Check label="peek after every tenth of the sample and stop at the first p < 0.05" checked={peek} onChange={setPeek} />
      <Slider label="true effect" value={effect} min={0} max={0.6} step={0.1} onChange={setEffect} digits={1} />
      <Slider label="users per arm" value={perArm} min={50} max={2500} step={50} onChange={setPerArm} digits={0} />
    </Controls>
    <Bars items={[{ label: 'significant share', value: s.significant, highlight: effect === 0 && s.significant > 0.07 }, { label: 'nominal 5%', value: 0.05 }]} max={1} digits={3} label={`Over 300 simulated experiments: ${r(100 * s.significant, 1)}% significant; mean significant estimate ${Number.isFinite(s.meanSignificantEstimate) ? r(s.meanSignificantEstimate, 2) : 'none'}`} />
    <Readout>{effect === 0 ? `No true effect, yet ${r(100 * s.significant, 1)}% of experiments “win”${peek ? ' — peeking inflates false wins, and more data does not fix it' : ', close to the 5% the test promises'}.` : `True effect ${effect}: ${r(100 * s.significant, 0)}% significant, and the significant ones estimate ${Number.isFinite(s.meanSignificantEstimate) ? r(s.meanSignificantEstimate, 2) : '—'} on average${s.significant < 0.6 && Number.isFinite(s.meanSignificantEstimate) && s.meanSignificantEstimate > effect * 1.3 ? ' — the winner’s curse: only the lucky, large estimates cross the line' : ''}.`}</Readout>
  </div>
}
