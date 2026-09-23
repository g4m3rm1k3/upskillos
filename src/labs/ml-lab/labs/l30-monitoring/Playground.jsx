import React, { useMemo, useState } from 'react'
import { simulate, alerts } from './engine.js'
import { Plot, Path } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Actions, Legend, Warning } from '../../kit/ui.jsx'
import { fmt } from '../../kit/math.js'

const SCENARIOS = { none: 'Nothing changes (a quiet period)', covariate: 'Covariate shift: most jobs move to shared runners', concept: 'Concept drift: a new cache makes cache hits much faster', bug: 'Upstream bug: size starts arriving in KB' }
const TRUTH = {
  none: 'No real change. Any alert here is a false alarm — tune thresholds and persistence on quiet periods like this.',
  covariate: 'Inputs drifted (runner mix), but the model already handles shared runners, so error barely moves. Drift alone is not proof of harm: investigate, don’t roll back.',
  concept: 'The relationship between inputs and duration changed. Input monitors stay quiet; only error — available after the label delay — reveals it. Retrain on recent data.',
  bug: 'Inputs and predictions jump the same day: a pipeline bug, not a modelling problem. Roll back or block the bad feed immediately; retraining would learn the bug.',
}

export default function Playground() {
  const [kind, setKind] = useState('covariate'), [start, setStart] = useState(25), [delay, setDelay] = useState(7), [psiLimit, setPsiLimit] = useState(0.2), [persist, setPersist] = useState(2), [today, setToday] = useState(59)
  const [guess, setGuess] = useState(''), [revealed, setRevealed] = useState(false)
  const sim = useMemo(() => simulate({ kind, start, labelDelay: delay }), [kind, start, delay])
  const visible = sim.log.slice(0, today + 1), labelled = sim.log.slice(0, Math.max(0, today + 1 - delay))
  const maeLimit = sim.refMAE * 1.25
  const inputAlerts = alerts(visible.map(l => Math.max(l.psiSize, l.psiRunner)), psiLimit, persist), predAlerts = alerts(visible.map(l => l.psiPred), psiLimit, persist), maeAlerts = alerts(labelled.map(l => l.mae), maeLimit, persist)
  const psiTop = Math.min(2, Math.max(0.5, ...visible.map(l => Math.max(l.psiSize, l.psiRunner, l.psiPred))))
  const maeTop = Math.min(sim.refMAE * 4, Math.max(sim.refMAE * 2, ...labelled.map(l => l.mae)))
  const vline = (X, Y, x, top) => <Path X={X} Y={Y} points={[[x, 0], [x, top]]} stroke="var(--text)" width={1} dash="3 3" />
  return <>
    <PanelHeading title="Is the model still right — and how would you know?" pill={`day ${today} · ${inputAlerts.length + predAlerts.length + maeAlerts.length} alerts`} />
    <Controls>
      <Choice label="What happens in production" value={kind} onChange={v => { setKind(v); setRevealed(false); setGuess('') }} options={Object.entries(SCENARIOS)} />
      <Slider label="Change starts on day" value={start} min={10} max={50} onChange={setStart} />
      <Slider label="Label delay (days until true durations are known)" value={delay} min={0} max={20} onChange={setDelay} />
      <Slider label="Today" value={today} min={0} max={59} onChange={setToday} />
      <Choice label="PSI alert threshold" value={String(psiLimit)} onChange={v => setPsiLimit(Number(v))} options={['0.05', '0.1', '0.2', '0.25']} />
      <Slider label="Alert only after N consecutive days" value={persist} min={1} max={5} onChange={setPersist} />
    </Controls>
    <Legend items={[['━', 'input drift: size_mb PSI', 'var(--chart-train)'], ['━', 'input drift: runner-mix PSI', '#10b981'], ['━', 'prediction drift PSI', 'var(--chart-val)'], ['┄', 'alert threshold', 'var(--muted)']]} />
    <Plot x={[0, 59]} y={[0, psiTop]} height={220} xLabel="day" yLabel="PSI vs training (clipped)" label="Daily drift of inputs and predictions">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={[[0, psiLimit], [59, psiLimit]]} stroke="var(--muted)" width={1} dash="5 4" />
      <Path X={X} Y={Y} points={visible.map(l => [l.day, Math.min(psiTop, l.psiSize)])} stroke="var(--chart-train)" />
      <Path X={X} Y={Y} points={visible.map(l => [l.day, Math.min(psiTop, l.psiRunner)])} stroke="#10b981" />
      <Path X={X} Y={Y} points={visible.map(l => [l.day, Math.min(psiTop, l.psiPred)])} stroke="var(--chart-val)" />
      {[...inputAlerts, ...predAlerts].map((d, i) => <circle key={i} cx={X(d)} cy={Y(psiTop * 0.95)} r="4" fill="var(--text)" />)}
      {revealed && vline(X, Y, start, psiTop)}
    </>}</Plot>
    <Legend items={[['━', `daily MAE — known only ${delay} day(s) later`, 'var(--accent)'], ['┄', 'alert at 1.25 × training MAE', 'var(--muted)']]} />
    <Plot x={[0, 59]} y={[0, maeTop]} height={200} xLabel="day" yLabel="MAE (s, clipped)" label="Model error once labels arrive">{({ X, Y }) => <>
      <rect x={X(Math.max(0, today + 1 - delay))} y={Y(maeTop)} width={Math.max(0, X(today) - X(Math.max(0, today + 1 - delay)))} height={Y(0) - Y(maeTop)} fill="var(--muted)" opacity="0.12" />
      <Path X={X} Y={Y} points={[[0, maeLimit], [59, maeLimit]]} stroke="var(--muted)" width={1} dash="5 4" />
      <Path X={X} Y={Y} points={labelled.map(l => [l.day, Math.min(maeTop, l.mae)])} stroke="var(--accent)" />
      {maeAlerts.map((d, i) => <circle key={i} cx={X(d)} cy={Y(maeTop * 0.95)} r="4" fill="var(--text)" />)}
      {revealed && vline(X, Y, start, maeTop)}
    </>}</Plot>
    <Metrics items={[['First input-drift alert', inputAlerts.length ? `day ${inputAlerts[0]}` : 'none'], ['First prediction-drift alert', predAlerts.length ? `day ${predAlerts[0]}` : 'none'], ['First error alert (after labels)', maeAlerts.length ? `day ${maeAlerts[0]} (known day ${maeAlerts[0] + delay})` : 'none'], ['Training MAE', `${fmt(sim.refMAE, 1)} s`]]} />
    {kind === 'bug' && today >= start && <Warning>Predictions are now thousands of seconds: a guard on the prediction range would have blocked them before any user saw them.</Warning>}
    <Controls><Choice label="Your diagnosis" value={guess} onChange={setGuess} options={[['', 'Choose…'], ['none', 'No problem'], ['investigate', 'Input drift — investigate, keep serving'], ['retrain', 'Performance loss — retrain on recent data'], ['rollback', 'Pipeline bug — roll back / block the feed']]} /></Controls>
    <Actions><button className="ml-primary" disabled={!guess} onClick={() => setRevealed(true)}>Reveal what happened</button></Actions>
    {revealed && <Insight title={`${SCENARIOS[kind]} — starting day ${start}`}>{TRUTH[kind]}</Insight>}
    <Insight title="Monitor three layers">**Inputs** (drift of each feature against training) warn early but cannot prove harm. **Predictions** drift when inputs or the pipeline change and need no labels. **Outcomes** (error against true labels) prove performance loss but arrive late — shaded region. Healthy alerting combines all three, with thresholds tuned on quiet periods and a persistence rule to avoid paging on noise.</Insight>
  </>
}
