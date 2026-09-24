import React, { useMemo, useState, useEffect } from 'react'
import { posterior, simulateAlarms, naturalFrequencies, standardError, diceExact, rollDice } from './engine.js'
import { Plot, Path } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Caption, Insight, Legend } from '../../kit/ui.jsx'
import { pct, fmt } from '../../kit/math.js'

const PRIORS = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5]

function Population({ f }) {
  const cells = []
  const order = [['tp', 'var(--chart-val)', 1], ['fn', 'none', 1], ['fp', 'var(--chart-train)', 1], ['tn', 'var(--border)', 0.55]]
  let k = 0
  for (const [key, fill, opacity] of order) {
    const count = Math.round(f[key])
    for (let i = 0; i < count && k < 1000; i++, k++) {
      const x = 10 + (k % 50) * 10.8, y = 8 + Math.floor(k / 50) * 10.8
      cells.push(<rect key={k} x={x} y={y} width="8.4" height="8.4" rx="1.6" fill={fill} opacity={opacity} stroke={key === 'fn' ? 'var(--chart-val)' : 'none'} strokeWidth="1.4" />)
    }
  }
  return <svg viewBox="0 0 560 228" role="img" aria-label="1000 machines coloured by true state and alarm">{cells}</svg>
}

// Opens the view each lesson's experiment uses; the learner can still switch.
const VIEW_FOR_LESSON = { 'l04-frequency': 'dice', 'l04-distributions': 'dice', 'l04-expectation': 'dice', 'l04-conditional': 'bayes', 'l04-bayes': 'bayes', 'l04-verify': 'bayes' }

export default function Playground({ lesson }) {
  const [mode, setMode] = useState('bayes')
  useEffect(() => { const view = VIEW_FOR_LESSON[lesson?.id]; if (view) setMode(view) }, [lesson?.id])
  const [pi, setPi] = useState(4), [sens, setSens] = useState(0.9), [fa, setFa] = useState(0.05)
  const [n, setN] = useState(10000), [seed, setSeed] = useState(1)
  const [rolls, setRolls] = useState(1000)
  const prior = PRIORS[pi], exact = posterior(prior, sens, fa), f = naturalFrequencies(1000, prior, sens, fa)
  const sim = useMemo(() => simulateAlarms({ n, prior, sensitivity: sens, falseAlarm: fa, seed }), [n, prior, sens, fa, seed])
  const dice = useMemo(() => rollDice(rolls, seed), [rolls, seed])
  const est = sim.trace.at(-1)
  return <>
    <PanelHeading title={mode === 'bayes' ? 'An alarm went off. Is it a real fault?' : 'Long-run frequency, made visible.'} pill={mode === 'bayes' ? `P(fault | alarm) = ${pct(exact)}` : `mean → 7`} />
    <Controls><Choice label="Experiment" value={mode} onChange={setMode} options={[['bayes', 'Fault alarm · Bayes’ rule'], ['dice', 'Two dice · law of large numbers']]} />
      <label>Seed<input type="number" min="0" max="99999" value={seed} onChange={e => e.target.value !== '' && setSeed(Math.max(0, Math.min(99999, Math.trunc(+e.target.value))))} /></label></Controls>
    {mode === 'bayes' ? <>
      <Controls>
        <Slider label="Base rate P(fault)" value={pi} min={0} max={PRIORS.length - 1} onChange={setPi} format={i => pct(PRIORS[i])} />
        <Slider label="Sensitivity P(alarm | fault)" value={sens} min={0.5} max={1} step={0.01} onChange={setSens} format={pct} />
        <Slider label="False-alarm rate P(alarm | healthy)" value={fa} min={0} max={0.3} step={0.005} onChange={setFa} format={pct} />
        <Choice label="Simulated machines" value={String(n)} onChange={v => setN(Number(v))} options={['100', '1000', '10000', '100000']} />
      </Controls>
      <Legend items={[['■', 'faulty · alarm', 'var(--chart-val)'], ['□', 'faulty · missed', 'var(--chart-val)'], ['■', 'healthy · false alarm', 'var(--chart-train)'], ['■', 'healthy · quiet', 'var(--muted)']]} />
      <Population f={f} />
      <Insight title="Count, then divide">
        <p>Of 1,000 machines, about <strong>{fmt(f.faulty, 1)}</strong> are faulty; {fmt(f.tp, 1)} of those alarm. Of the {fmt(f.healthy, 1)} healthy machines, {fmt(f.fp, 1)} alarm anyway. Alarms: {fmt(f.tp + f.fp, 1)}. Faulty among them: {fmt(f.tp, 1)} / {fmt(f.tp + f.fp, 1)} = <strong>{pct(exact)}</strong>.</p>
        <p>P(alarm | fault) = {pct(sens)} is a property of the detector. P(fault | alarm) = {pct(exact)} also depends on how rare faults are. Confusing the two is the <strong>base-rate fallacy</strong>.</p>
      </Insight>
      <Metrics items={[['Exact P(fault | alarm)', pct(exact)], [`Simulated · ${n} machines`, pct(est.estimate)], ['Alarms simulated', est.alarms], ['≈ 2 standard errors', Number.isFinite(est.estimate) && est.alarms ? `± ${pct(2 * standardError(est.estimate, est.alarms))}` : '—']]} />
      <Plot x={[0, n]} y={[0, 1]} xLabel="machines simulated" yLabel="estimated P(fault | alarm)" label="Running simulated posterior against the exact value">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={sim.trace.filter(t => t.alarms > 0).flatMap(t => [[t.n, Math.min(1, exact + 2 * standardError(exact, t.alarms))]])} stroke="var(--muted)" width={1} dash="3 3" />
        <Path X={X} Y={Y} points={sim.trace.filter(t => t.alarms > 0).map(t => [t.n, Math.max(0, exact - 2 * standardError(exact, t.alarms))])} stroke="var(--muted)" width={1} dash="3 3" />
        <Path X={X} Y={Y} points={[[0, exact], [n, exact]]} stroke="var(--text)" width={1.5} />
        <Path X={X} Y={Y} points={sim.trace.filter(t => Number.isFinite(t.estimate)).map(t => [t.n, t.estimate])} stroke="var(--chart-val)" width={2} />
      </>}</Plot>
      <Caption>Solid line: exact value from Bayes’ rule. Orange: simulated fraction of alarms that were real faults. Dashed: about two standard errors, `2·√(p(1−p)/alarms)`. The estimate wanders early and settles as alarms accumulate — change the seed to see a different path to the same value.</Caption>
    </> : <>
      <Controls><Choice label="Rolls of two dice" value={String(rolls)} onChange={v => setRolls(Number(v))} options={['10', '100', '1000', '10000', '100000']} /></Controls>
      <Legend items={[['■', 'simulated relative frequency', 'var(--accent)'], ['●', 'exact probability', 'var(--chart-val)']]} />
      <Plot x={[1.4, 12.6]} y={[0, Math.max(0.2, ...dice.counts.map(c => c / rolls))]} xTicks={12} xLabel="sum of two dice" yLabel="probability" label="Distribution of the sum of two dice" tickFormat={v => Number(v.toFixed(2)).toString()}>{({ X, Y }) => <>
        {diceExact.map(d => <rect key={d.sum} x={X(d.sum - 0.35)} y={Y(dice.counts[d.sum] / rolls)} width={X(0.7) - X(0)} height={Y(0) - Y(dice.counts[d.sum] / rolls)} fill="var(--accent)" opacity="0.55" />)}
        {diceExact.map(d => <circle key={`e${d.sum}`} cx={X(d.sum)} cy={Y(d.p)} r="4" fill="var(--chart-val)" />)}
      </>}</Plot>
      <Plot x={[0, rolls]} y={[2, 12]} height={220} xLabel="rolls so far" yLabel="running mean" label="Running mean of the dice sum">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={[[0, 7], [rolls, 7]]} stroke="var(--text)" width={1.2} dash="4 3" />
        <Path X={X} Y={Y} points={dice.running} stroke="var(--accent)" />
      </>}</Plot>
      <Metrics items={[['Sample mean', fmt(dice.mean, 3)], ['E[sum] exact', '7'], ['Sample variance', fmt(dice.variance, 3)], ['Var[sum] exact', '35/6 ≈ 5.833']]} />
      <Caption>With 10 rolls the histogram is lumpy and the mean can miss 7 by more than 1. Each ×100 in rolls shrinks the typical error of the mean by about ×10: the standard error is `σ/√n`.</Caption>
    </>}
  </>
}
