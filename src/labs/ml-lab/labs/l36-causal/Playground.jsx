import React, { useMemo, useState } from 'react'
import { population, estimates, diffInMeans, experiments, summarize, sampleSize } from './engine.js'
import { Plot, Path, Bars } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Caption, Legend, Warning } from '../../kit/ui.jsx'
import { mean, pct, fmt } from '../../kit/math.js'

const SIZES = [50, 100, 200, 400, 700, 1100, 1600, 2500]
const NAMES = { naive: 'Naive difference', stratified: 'Stratified', regression: 'Regression adj.', ipw: 'Propensity (IPW)' }

export default function Playground() {
  const [view, setView] = useState('observe')
  const [effect, setEffect] = useState(1), [confounding, setConfounding] = useState(1.5), [noise, setNoise] = useState(0.5), [oracle, setOracle] = useState(false)
  const [sizeIdx, setSizeIdx] = useState(2), [xEffect, setXEffect] = useState(0.3), [peek, setPeek] = useState(false), [seed, setSeed] = useState(1)
  const rows = useMemo(() => population({ effect, confounding, proxyNoise: noise }), [effect, confounding, noise])
  const est = useMemo(() => estimates(rows, oracle ? 'motivation' : 'past'), [rows, oracle])
  const rct = useMemo(() => diffInMeans(population({ effect, randomized: true })), [effect])
  const treated = rows.filter(r => r.t)
  const perArm = SIZES[sizeIdx]
  const runs = useMemo(() => view === 'experiment' ? experiments({ perArm, effect: xEffect, peek, seed }) : [], [view, perArm, xEffect, peek, seed])
  const s = runs.length ? summarize(runs, xEffect) : null
  const shown = runs.slice(0, 50), span = Math.max(...shown.map(r => Math.abs(r.est) + 1.96 * r.se), 0.5)
  return <>
    <PanelHeading title="Does the reminder email cause more learning?" pill={view === 'observe' ? `true effect = ${fmt(effect, 2)}` : `${perArm} users per arm`} />
    <Caption>A platform can send learners a weekly study reminder. The question is causal: how many more lessons does a learner complete in 30 days **because** of the reminder? The simulator knows the true effect. Highly motivated learners both opt in more and complete more lessons anyway — motivation is a **confounder**.</Caption>
    <Controls><Choice label="View" value={view} onChange={setView} options={[['observe', 'Observational data (users opted in)'], ['experiment', 'Randomized experiment (A/B test)']]} /></Controls>
    {view === 'observe' && <>
      <Controls>
        <Slider label="True effect (lessons)" value={effect} min={0} max={2} step={0.25} onChange={setEffect} />
        <Slider label="Confounding: how much motivation drives opting in" value={confounding} min={0} max={3} step={0.25} onChange={setConfounding} />
        <Slider label="Measurement noise of past activity (proxy for motivation)" value={noise} min={0} max={2} step={0.25} onChange={setNoise} />
        <Toggle label="Adjust using true motivation (impossible in reality)" checked={oracle} onChange={setOracle} />
      </Controls>
      <Metrics items={[['Opted in', pct(treated.length / rows.length)], ['Mean motivation: opted in', fmt(mean(treated.map(r => r.motivation)), 2)], ['Mean motivation: not', fmt(mean(rows.filter(r => !r.t).map(r => r.motivation)), 2)], ['Randomized estimate', `${fmt(rct.est, 2)} ± ${fmt((rct.hi - rct.lo) / 2, 2)}`]]} />
      <Bars label="Estimated effect (lessons)" format={v => v.toFixed(2)} max={Math.max(4, ...Object.values(est))} items={[...Object.entries(est).map(([k, v]) => ({ label: NAMES[k], value: v })), { label: 'TRUE effect', value: effect }]} />
      {confounding > 0 && !oracle && noise > 0 && <Warning>{`Adjustment only removes the confounding it can see. Past activity measures motivation with noise, so adjusted estimates keep part of the bias (true effect: ${fmt(effect, 2)}).`}</Warning>}
      <Plot x={[-3.5, 3.5]} y={[-2, 13]} xTicks={8} yTicks={6} height={260} xLabel={oracle ? 'motivation' : 'past activity (recorded)'} yLabel="lessons completed" label="Outcome against the recorded covariate">{({ X, Y }) => <>
        {rows.slice(0, 400).map((r, i) => <circle key={i} cx={X(Math.max(-3.5, Math.min(3.5, oracle ? r.motivation : r.past)))} cy={Y(Math.max(-2, Math.min(13, r.y)))} r="2.6" fill={r.t ? 'var(--chart-val)' : 'var(--chart-train)'} opacity="0.6" />)}
      </>}</Plot>
      <Legend items={[['●', 'received reminders (opted in)', 'var(--chart-val)'], ['●', 'no reminders', 'var(--chart-train)']]} />
      <p className="ml-caption">Bars: each method’s estimate of the effect from the same observational data; the last bar is the truth, known only to the simulator. “Randomized estimate” is what a coin-flip experiment on 2,000 learners finds (± half its 95% interval).</p>
      <Insight title="What to notice">Set confounding to 0: every method finds the truth. Raise it: the naive difference mixes the reminder’s effect with motivation. Adjusting for past activity helps only as far as past activity measures motivation — set its noise to 0, or use the oracle toggle, and adjustment works. In real data you never see the oracle, and you cannot check whether an unmeasured confounder remains. A randomized experiment removes the problem by design.</Insight>
    </>}
    {view === 'experiment' && s && <>
      <Controls>
        <Slider label="Users per arm" value={sizeIdx} min={0} max={SIZES.length - 1} onChange={setSizeIdx} format={i => SIZES[i]} />
        <Slider label="True effect (lessons)" value={xEffect} min={0} max={1} step={0.1} onChange={setXEffect} />
        <Toggle label="Peek: test after every tenth of the data and stop at the first p < 0.05" checked={peek} onChange={setPeek} />
      </Controls>
      <Metrics items={[['Share of experiments “significant”', pct(s.significant), xEffect ? 'power' : 'false-positive rate'], ['95% intervals containing the truth', pct(s.coverage)], ['Mean estimate · all runs', fmt(s.meanEstimate, 3)], ['Mean estimate · significant runs only', fmt(s.meanSignificantEstimate, 3)]]} />
      <Plot x={[-span, span]} y={[0, shown.length + 1]} height={300} xLabel="estimated effect with 95% interval" yLabel="experiment" yFormat={() => ''} label="Fifty repeated experiments">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={[[0, 0], [0, shown.length + 1]]} stroke="var(--muted)" width={1} dash="5 4" />
        <Path X={X} Y={Y} points={[[xEffect, 0], [xEffect, shown.length + 1]]} stroke="var(--accent)" width={1.5} />
        {shown.map((r, i) => <g key={i}><line x1={X(r.est - 1.96 * r.se)} x2={X(r.est + 1.96 * r.se)} y1={Y(i + 1)} y2={Y(i + 1)} stroke={r.p < 0.05 ? 'var(--chart-val)' : 'var(--chart-train)'} strokeWidth="2" /><circle cx={X(r.est)} cy={Y(i + 1)} r="2.5" fill="var(--text)" /></g>)}
      </>}</Plot>
      <Legend items={[['━', 'interval excludes 0 (significant)', 'var(--chart-val)'], ['━', 'interval includes 0', 'var(--chart-train)'], ['│', 'true effect', 'var(--accent)'], ['┆', 'zero', 'var(--muted)']]} />
      <p className="ml-caption">{`Outcome standard deviation 2.5 lessons: to detect ${fmt(Math.max(xEffect, 0.1), 2)} lessons with 80% power at the 5% level you need about ${sampleSize(2.5, Math.max(xEffect, 0.1))} users per arm. Each run: ${runs.length} simulated experiments.`}</p>
      <button onClick={() => setSeed(v => v + 1)}>Run 300 new experiments</button>
      <Insight title="What to notice">Randomization makes the groups alike in motivation, so the plain difference is unbiased and about 95% of intervals contain the truth. Small experiments are underpowered: they usually miss a real effect, and the ones that reach significance **overestimate** it (the winner’s curse). With zero true effect and peeking, far more than 5% of experiments declare a win. Fix the sample size in advance — or use a sequential method designed for repeated looks.</Insight>
    </>}
  </>
}
