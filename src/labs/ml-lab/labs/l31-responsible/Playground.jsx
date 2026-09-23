import React, { useMemo, useState } from 'react'
import { simulate, fitScorer, groupMetrics, calibration, deferral, modelCard } from './engine.js'
import { Plot, Path } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Actions, Table, Caption, Legend } from '../../kit/ui.jsx'
import { pct, fmt } from '../../kit/math.js'

export default function Playground() {
  const [view, setView] = useState('audit')
  const [baseB, setBaseB] = useState(0.35), [noiseB, setNoiseB] = useState(1.6), [t, setT] = useState(0.5), [split, setSplit] = useState(false), [tB, setTB] = useState(0.5), [width, setWidth] = useState(0.15)
  const rows = useMemo(() => simulate({ baseB, noiseB }), [baseB, noiseB]), score = useMemo(() => fitScorer(rows), [rows])
  const mA = groupMetrics(rows.filter(r => r.group === 'A'), score, t).A, mB = groupMetrics(rows.filter(r => r.group === 'B'), score, split ? tB : t).B, mAll = groupMetrics(rows, score, t).all
  const metrics = { A: mA, B: mB, all: mAll }
  const calA = calibration(rows, score, 'A'), calB = calibration(rows, score, 'B')
  const def = deferral(rows, score, width), defCurve = useMemo(() => [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4].map(w => [w, deferral(rows, score, w)]), [rows, score])
  const [card, setCard] = useState({ name: 'Ticket escalation classifier', version: '1.3.0', owner: 'Support platform team', intended: 'Suggest which incoming support tickets an on-call engineer should review first. A human makes every escalation decision.', outOfScope: 'Automatic closing of tickets; evaluating staff performance; any use outside support triage.', data: 'Tickets from 2025-01 to 2026-06 in regions A and B, used under the support-data agreement. Region B tickets are recorded with less structured severity information.', limitations: '', oversight: 'Scores in the uncertain band are always routed to a human. Weekly review of missed escalations by region.', ethics: '' })
  const md = modelCard({ ...card, threshold: split ? `A: ${t}, B: ${tB}` : t }, metrics)
  const gap = (k) => Math.abs(mA[k] - mB[k])
  return <>
    <PanelHeading title={{ audit: 'One model, two regions, different errors.', review: 'Where should a human decide?', card: 'Write down what the model is — and is not — for.' }[view]} pill={view === 'audit' ? `recall gap ${fmt(100 * gap('tpr'), 1)} pts` : view === 'review' ? `${pct(def.coverage)} automated` : 'model card'} />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['audit', 'Subgroup audit'], ['review', 'Human review band'], ['card', 'Model card']]} /></Controls>
    {view === 'audit' && <>
      <Caption>A model scores support tickets for escalation. One scoring function is fitted on all tickets; it never sees the region. In region B, severity is recorded less consistently, so the model’s input is noisier there. Region A has a 20% escalation rate.</Caption>
      <Controls>
        <Slider label="Region B escalation rate" value={baseB} min={0.1} max={0.5} step={0.05} onChange={setBaseB} format={pct} />
        <Slider label="Region B measurement noise (A = 0.8)" value={noiseB} min={0.8} max={2.5} step={0.1} onChange={setNoiseB} format={v => v.toFixed(1)} />
        <Slider label={split ? 'Threshold for region A' : 'Decision threshold (both regions)'} value={t} min={0.1} max={0.9} step={0.05} onChange={setT} format={v => v.toFixed(2)} />
        <div className="ml-toggles"><Toggle label="Use a separate threshold for region B" checked={split} onChange={setSplit} />{split && <Slider label="Threshold for region B" value={tB} min={0.1} max={0.9} step={0.05} onChange={setTB} format={v => v.toFixed(2)} />}</div>
      </Controls>
      <Table head={['metric', 'region A', 'region B', 'gap', 'what equal values would mean']} rows={[
        ['escalation rate (base)', pct(mA.base), pct(mB.base), fmt(100 * gap('base'), 1), 'a fact about the world, not the model'],
        ['flagged (selection rate)', pct(mA.selection), pct(mB.selection), fmt(100 * gap('selection'), 1), 'demographic parity'],
        ['recall / true-positive rate', pct(mA.tpr), pct(mB.tpr), fmt(100 * gap('tpr'), 1), 'equal opportunity'],
        ['false-positive rate', pct(mA.fpr), pct(mB.fpr), fmt(100 * gap('fpr'), 1), 'with equal TPR: equalized odds'],
        ['precision (PPV)', pct(mA.ppv), pct(mB.ppv), fmt(100 * gap('ppv'), 1), 'predictive parity'],
      ]} caption="Differences in points. With different base rates, an imperfect model cannot make selection rates, error rates and precision all equal at once; choosing which to prioritize is a decision about harms, not a technical detail." />
      <Legend items={[['●', 'region A', 'var(--chart-train)'], ['●', 'region B', 'var(--chart-val)'], ['┄', 'perfect calibration', 'var(--muted)']]} />
      <Plot x={[0, 1]} y={[0, 1]} height={260} xLabel="predicted probability" yLabel="observed escalation rate" label="Calibration by region">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={[[0, 0], [1, 1]]} stroke="var(--muted)" width={1} dash="4 3" />
        <Path X={X} Y={Y} points={calA.map(c => [c.predicted, c.observed])} stroke="var(--chart-train)" />
        <Path X={X} Y={Y} points={calB.map(c => [c.predicted, c.observed])} stroke="var(--chart-val)" />
        {calA.map((c, i) => <circle key={`a${i}`} cx={X(c.predicted)} cy={Y(c.observed)} r="4" fill="var(--chart-train)" />)}
        {calB.map((c, i) => <circle key={`b${i}`} cx={X(c.predicted)} cy={Y(c.observed)} r="4" fill="var(--chart-val)" />)}
      </>}</Plot>
      <Insight title="What the audit shows — and what it does not">The same score means different things in the two regions: a pooled model is calibrated **on average** but not **per group**. Region B’s noisier input costs it recall and precision; a separate threshold can equalize one metric but moves the others. The audit establishes **that** errors differ by region; it does not establish **why** (data quality? different ticket mix?) — that needs investigation, not assumption. Measure subgroups only where you are permitted to hold the group attribute, and report sample sizes: small groups give noisy metrics.</Insight>
    </>}
    {view === 'review' && <>
      <Caption>Tickets whose score is close to 0.5 are uncertain. Route those to a person and let the model decide the rest.</Caption>
      <Controls><Slider label="Review band ±w around 0.5" value={width} min={0} max={0.4} step={0.05} onChange={setWidth} format={v => v.toFixed(2)} /></Controls>
      <Metrics items={[['Automated share', pct(def.coverage)], ['Accuracy on automated tickets', pct(def.autoAccuracy)], ['Tickets for human review', def.reviewed], ['Accuracy with no review', pct(defCurve[0][1].autoAccuracy)]]} />
      <Plot x={[0.8, 1]} y={[0.9, 0.98]} height={240} xLabel="share automated" yLabel="accuracy of automated decisions" label="Automation versus accuracy">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={defCurve.map(([, d]) => [d.coverage, d.autoAccuracy]).sort((a, b) => a[0] - b[0])} />
        <circle cx={X(def.coverage)} cy={Y(def.autoAccuracy)} r="5" fill="var(--chart-val)" />
      </>}</Plot>
      <Insight title="Human review is a design decision">Deferring uncertain cases raises the accuracy of automated decisions at the cost of human time. Reviewers need context, authority to override, and feedback that improves the model — a rubber stamp adds cost without oversight. Check that the review load is not concentrated in one group without a plan for it.</Insight>
    </>}
    {view === 'card' && <>
      <Caption>A model card documents intended use, limits and measured behaviour for everyone who will build on or be affected by the model. The evaluation table is filled from the audit above.</Caption>
      {[['intended', 'Intended use'], ['outOfScope', 'Out of scope'], ['data', 'Data'], ['limitations', 'Limitations (write these from the audit)'], ['oversight', 'Human oversight'], ['ethics', 'Ethical considerations']].map(([k, label]) => <label key={k} className="ml-reflection">{label}<textarea value={card[k]} onChange={e => setCard(c => ({ ...c, [k]: e.target.value }))} style={{ minHeight: 60 }} /></label>)}
      <details open><summary>Rendered model card (Markdown)</summary><pre className="ml-mono">{md}</pre></details>
      <Actions><button onClick={() => { const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })), a = document.createElement('a'); a.href = url; a.download = 'model-card.md'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }}>Download model card</button></Actions>
    </>}
  </>
}
