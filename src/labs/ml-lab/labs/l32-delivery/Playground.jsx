import React, { useMemo, useState } from 'react'
import { recentDays, buildCandidates, evaluateGates, canary, DEFAULT_GATES } from './engine.js'
import { Plot, Path } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Actions, Table, Caption, Legend, Warning } from '../../kit/ui.jsx'
import { pct } from '../../kit/math.js'

const BUMP = { retrained: ['minor', 'Retrained on recent data; same features and contract.'], bugged: ['—', 'Must not ship: serving and training disagree.'], bigger: ['minor', 'New interaction features; same contract; higher latency.'], minutes: ['MAJOR', 'Output unit changed: every consumer must change — a breaking change.'], leaky: ['—', 'Must not ship: evaluation used information unavailable at prediction time.'] }

export default function Playground() {
  const [cand, setCand] = useState('retrained'), [minImp, setMinImp] = useState(0.05), [slice, setSlice] = useState(0.1), [latency, setLatency] = useState(25), [tol, setTol] = useState(0.1)
  const [roll, setRoll] = useState(null)
  const data = useMemo(() => ({ train: recentDays(0, 6), holdout: recentDays(10, 12), golden: recentDays(20, 21).slice(0, 60) }), [])
  const C = useMemo(() => buildCandidates(data.train), [data])
  const gates = useMemo(() => evaluateGates(cand, C, data.holdout, data.golden, { ...DEFAULT_GATES, minImprovement: minImp, maxSliceRegression: slice, latencyBudget: latency }), [cand, C, data, minImp, slice, latency])
  const [major, minor] = [1, 4], version = BUMP[cand][0] === 'MAJOR' ? `${major + 1}.0.0` : BUMP[cand][0] === 'minor' ? `${major}.${minor + 1}.0` : 'not releasable'
  const runCanary = () => setRoll({ cand, log: canary(cand, C, { tol }) })
  return <>
    <PanelHeading title="Ship an update you can trust — and undo." pill={gates.promote ? 'gates pass' : 'blocked'} />
    <Caption>The build system got a new cache, and production error has risen (Lab 30’s concept drift). Five candidate models were built from the last six days of traffic. Every candidate faces the same automated **promotion gates** before any user sees it, then a **canary** rollout with an automatic rollback rule.</Caption>
    <Controls>
      <Choice label="Candidate" value={cand} onChange={v => { setCand(v); setRoll(null) }} options={Object.entries(C).filter(([k]) => k !== 'production').map(([k, c]) => [k, c.label])} />
      <Slider label="Required improvement in holdout MAE" value={minImp} min={0} max={0.3} step={0.01} onChange={setMinImp} format={pct} />
      <Slider label="Allowed regression on any slice" value={slice} min={0} max={0.5} step={0.05} onChange={setSlice} format={pct} />
      <Slider label="Latency budget p95 (ms)" value={latency} min={10} max={50} onChange={setLatency} />
    </Controls>
    <Table head={['gate', 'result', 'evidence']} rows={gates.results.map(r => [r.gate, r.pass ? '✓ pass' : '✗ FAIL', r.detail])} caption="Holdout: two recent days never used for training. Golden set: 60 fixed requests replayed through both models and through the serving path." />
    <Metrics items={[['Production MAE (recent)', `${gates.prodMAE.toFixed(2)} s`], ['Candidate MAE (recent)', `${gates.candMAE.toFixed(2)} s`], ['Decision', gates.promote ? 'promote to canary' : 'block release'], ['Version if released', version]]} />
    <p className="ml-caption">Release note: {BUMP[cand][1]}</p>
    <Controls><Slider label="Canary rollback tolerance (worse than control by)" value={tol} min={0.05} max={0.5} step={0.05} onChange={setTol} format={pct} /></Controls>
    <Actions><button className="ml-primary" onClick={runCanary}>{gates.promote ? 'Start canary rollout' : 'Force a canary anyway (to see what the gates prevented)'}</button></Actions>
    {roll && roll.cand === cand && <>
      {roll.log.at(-1).rolledBack && <Warning>{`Automatic rollback on day ${roll.log.at(-1).day}: the canary’s error exceeded control by more than ${pct(tol)} on two consecutive days. Only ${pct(roll.log.at(-1).share)} of traffic was ever exposed.`}</Warning>}
      <Legend items={[['━', 'canary (new model) MAE', 'var(--chart-val)'], ['━', 'control (production) MAE', 'var(--chart-train)']]} />
      <Plot x={[1, 7]} y={[0, Math.min(80, Math.max(20, ...roll.log.map(l => Math.max(l.canary, l.control))) * 1.1)]} height={220} xLabel="rollout day" yLabel="MAE (s)" xTicks={7} label="Canary versus control error by day">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={roll.log.map(l => [l.day, Math.min(80, l.canary)])} stroke="var(--chart-val)" />
        <Path X={X} Y={Y} points={roll.log.map(l => [l.day, l.control])} stroke="var(--chart-train)" />
        {roll.log.map(l => <circle key={l.day} cx={X(l.day)} cy={Y(Math.min(80, l.canary))} r="4" fill={l.rolledBack ? 'var(--text)' : 'var(--chart-val)'} />)}
      </>}</Plot>
      <Table head={['day', 'traffic on new model', 'canary requests', 'canary MAE', 'control MAE']} rows={roll.log.map(l => [l.day, pct(l.share), l.nCanary, l.canary.toFixed(2), l.control.toFixed(2)])} caption="Small early canaries measure noisily — that is why the rule needs two consecutive bad days and why exposure grows only while the canary stays healthy." />
    </>}
    <Insight title="Gates catch different failures">The honest retrain improves overall but regresses on dedicated runners and cache misses: the world changed in a way the old features cannot express. The bigger model fixes that but breaks the latency budget — a product decision, not a technical one. The log10 rewrite fails **parity**; the minutes model breaks the **prediction contract**; the leaky model is **too good to be true**. No single metric would have caught all five.</Insight>
  </>
}
