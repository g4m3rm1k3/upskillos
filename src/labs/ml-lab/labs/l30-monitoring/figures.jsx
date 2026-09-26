// Figures placed between the paragraphs of Lab 30 (30.2, 30.3), built on the lab's own engine.
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Radio, Readout, Bars, MiniPlot, Path, Dots, VLine, HLine, Label, r } from '../../kit/fig.jsx'
import { random, normal, range, quantile } from '../../kit/math.js'
import { simulate, alerts, psi } from './engine.js'

// ---------- 30.2 ----------
const REF = (() => { const g = random(3); return range(3000).map(() => normal(g)) })()
export function PsiNoise() {
  const [n, setN] = useState(80), [shift, setShift] = useState(0.5)
  const s = useMemo(() => {
    const g = random(7), quiet = range(300).map(() => psi(REF, range(n).map(() => normal(g)))).sort((a, b) => a - b)
    const moved = range(300).map(() => psi(REF, range(n).map(() => shift + normal(g)))).sort((a, b) => a - b)
    const p99 = quantile(quiet, 0.99)
    return { med: quantile(quiet, 0.5), p99, above: quiet.filter(v => v > 0.1).length / 300, movedMed: quantile(moved, 0.5), caught: moved.filter(v => v > p99).length / 300 }
  }, [n, shift])
  return <div>
    <Controls>
      <Slider label="values per day, n" value={n} min={40} max={1000} step={20} onChange={setN} digits={0} />
      <Slider label="real shift of the mean (standard deviations)" value={shift} min={0} max={1} step={0.05} onChange={setShift} digits={2} />
    </Controls>
    <Bars items={[{ label: 'no change: median', value: s.med }, { label: 'no change: 99th pct', value: s.p99 }, { label: 'shifted: median', value: s.movedMed, highlight: true }]} digits={3} label={`PSI of ${n} values against the reference over 300 simulated days: no change median ${r(s.med, 3)}, 99th percentile ${r(s.p99, 3)}; with a shift of ${shift} standard deviations, median ${r(s.movedMed, 3)}`} />
    <Readout>With nothing changed, {r(100 * s.above, 0)}% of days exceed the 0.1 rule of thumb. A threshold at the quiet 99th percentile ({r(s.p99, 3)}) catches the shift of {shift} on {r(100 * s.caught, 0)}% of days. Small daily samples make PSI noisy; fix the threshold from the noise, not from a rule of thumb.</Readout>
  </div>
}

// ---------- 30.3 ----------
const RUNS = Object.fromEntries(['none', 'covariate', 'concept', 'bug'].map(k => [k, simulate({ kind: k })]))
export function DriftMonitor() {
  const [kind, setKind] = useState('covariate'), [delay, setDelay] = useState(7), [persist, setPersist] = useState(2)
  const s = RUNS[kind]
  const input = s.log.map(d => Math.max(d.psiSize, d.psiRunner))
  const ratio = s.log.map(d => d.mae / s.refMAE)
  const known = ratio.map((_, t) => (t - delay >= 0 ? ratio[t - delay] : 0))   // the error of day t − delay, measurable on day t
  const inAlert = alerts(input, 0.25, persist)[0], errAlert = alerts(known, 1.25, persist)[0]
  const cap = (v, m) => Math.min(v, m)
  const say = d => (d === undefined ? 'never alerts' : `alerts on day ${d}`)
  return <div>
    <Controls>
      <Radio name="kind30" value={kind} onChange={setKind} options={[['none', 'nothing changes'], ['covariate', 'covariate shift'], ['concept', 'concept drift'], ['bug', 'pipeline bug']]} />
      <Slider label="label delay (days)" value={delay} min={0} max={20} step={1} onChange={setDelay} digits={0} />
      <Slider label="persistence N (days)" value={persist} min={1} max={4} step={1} onChange={setPersist} digits={0} />
    </Controls>
    <MiniPlot x={[0, 60]} y={[0, 2]} xLabel="day" yLabel="value (capped at 2)" label={`Input PSI and error ratio by day for ${kind}; the change starts on day 25; input PSI ${say(inAlert)}, error ratio ${say(errAlert)}`}>{({ X, Y }) => <>
      <HLine X={X} Y={Y} y={0.25} x0={0} x1={60} color="var(--chart-ref)" />
      <HLine X={X} Y={Y} y={1.25} x0={0} x1={60} color="var(--chart-val)" />
      <VLine X={X} Y={Y} x={25} y0={0} y1={2} />
      <Label X={X} Y={Y} x={25.5} y={1.9}>change</Label>
      <Label X={X} Y={Y} x={1} y={0.3} color="var(--chart-ref)">input PSI threshold</Label>
      <Label X={X} Y={Y} x={1} y={1.3} color="var(--chart-val)">error ratio threshold</Label>
      <Path X={X} Y={Y} points={input.map((v, i) => [i, cap(v, 2)])} stroke="var(--chart-ref)" />
      <Path X={X} Y={Y} points={known.map((v, i) => [i, cap(v, 2)]).slice(delay)} stroke="var(--chart-val)" />
      {inAlert !== undefined && <Dots X={X} Y={Y} points={[[inAlert, cap(input[inAlert], 2)]]} color="var(--chart-ref)" rad={5} />}
      {errAlert !== undefined && <Dots X={X} Y={Y} points={[[errAlert, cap(known[errAlert], 2)]]} color="var(--chart-val)" rad={5} />}
    </>}</MiniPlot>
    <Readout>Input PSI (grey, threshold 0.25) {say(inAlert)}; the error ratio MAE / reference MAE (orange, known {delay} days late, threshold 1.25) {say(errAlert)}. {kind === 'covariate' ? 'The inputs moved but the error did not rise: drift without proven harm.' : kind === 'concept' ? 'The inputs look unchanged — only the delayed labels reveal the harm.' : kind === 'bug' ? 'Inputs and predictions jump together on day 25: a pipeline bug, visible long before any label arrives.' : 'Quiet: both lines stay under their thresholds.'}</Readout>
  </div>
}
