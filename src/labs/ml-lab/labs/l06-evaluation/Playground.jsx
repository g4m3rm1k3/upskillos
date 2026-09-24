import React, { useMemo, useState, useEffect } from 'react'
import { selectionExperiment, groupExperiment, timeExperiment, winnersCurse, mean, std } from './engine.js'
import { Plot, Path, Bars, extent } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Caption, Insight, Legend } from '../../kit/ui.jsx'
import { fmt, pct } from '../../kit/math.js'

const COLORS = ['#3b82f6', '#f97316', '#10b981', '#a855f7', '#ef4444', '#eab308', '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#14b8a6', '#f43f5e']

// Opens the view each lesson's experiment uses; the learner can still switch.
const VIEW_FOR_LESSON = { 'l06-roles': 'curse', 'l06-cv': 'selection', 'l06-baselines': 'selection', 'l06-leakage': 'selection', 'l06-splits': 'groups', 'l06-discipline': 'curse' }

export default function Playground({ lesson }) {
  const [mode, setMode] = useState('selection'), [seed, setSeed] = useState(1)
  useEffect(() => { const view = VIEW_FOR_LESSON[lesson?.id]; if (view) setMode(view) }, [lesson?.id])
  const [p, setP] = useState(500), [k, setK] = useState(10), [models, setModels] = useState(20)
  const sel = useMemo(() => mode === 'selection' ? selectionExperiment({ p, k, seed }) : null, [mode, p, k, seed])
  const grp = useMemo(() => mode === 'groups' ? groupExperiment({ seed }) : null, [mode, seed])
  const time = useMemo(() => mode === 'time' ? timeExperiment({ seed }) : null, [mode, seed])
  const cur = useMemo(() => mode === 'curse' ? winnersCurse({ models, seed }) : null, [mode, models, seed])
  return <>
    <PanelHeading title={{ selection: 'A perfect score on pure noise.', groups: 'Same machine, both sides of the split.', time: 'Validating on the past’s future.', curse: 'The best of many is lucky, not good.' }[mode]} pill="audit → repair" />
    <Controls>
      <Choice label="Leak to investigate" value={mode} onChange={setMode} options={[['selection', '1 · Feature selection before CV'], ['groups', '2 · Grouped rows split randomly'], ['time', '3 · Time series split randomly'], ['curse', '4 · Choosing on the test set']]} />
      <label>Seed<input type="number" min="0" max="99999" value={seed} onChange={e => e.target.value !== '' && setSeed(Math.max(0, Math.min(99999, Math.trunc(+e.target.value))))} /></label>
    </Controls>
    {sel && <>
      <Caption>60 rows, balanced yes/no labels assigned **at random** — no feature can truly predict them. The expected honest accuracy is 50%. Leaky: pick the k features most correlated with the label using all 60 rows, then run 5-fold CV. Honest: pick features inside each training fold only.</Caption>
      <Controls><Slider label="Candidate noise features p" value={p} min={20} max={1000} step={20} onChange={setP} /><Slider label="Features kept k" value={k} min={1} max={40} onChange={setK} /></Controls>
      <Bars label="Fold accuracies, leaky versus honest" max={1} format={pct} items={[...sel.leaky.map((a, i) => ({ label: `leaky · fold ${i + 1}`, value: a, color: 'var(--chart-val)' })), ...sel.honest.map((a, i) => ({ label: `honest · fold ${i + 1}`, value: a, color: 'var(--chart-train)' }))]} />
      <Metrics items={[['Leaky CV accuracy', pct(mean(sel.leaky))], ['Honest CV accuracy', pct(mean(sel.honest))], ['Truth (random labels)', '50%'], ['Honest fold spread (sd)', pct(std(sel.honest))]]} />
      <Insight title="Why the leaky score is high">With {p} random features, a few correlate with the labels **by chance** across all 60 rows. Choosing them used the validation rows’ labels, so every fold is validated on rows that helped pick its features. The fix is a **pipeline**: every step that learns from data — selection, scaling, imputation — is fit inside each training fold. Increase p and watch the leaky score climb while the honest one stays near chance. (Honest scores below 50% are expected here too: removing a row shifts its own class’s training mean away from it.)</Insight>
    </>}
    {grp && <>
      <Caption>12 machines, 10 measurements each. Each machine has its own offset. The question that matters: how well do we predict a **new** machine? A 1-nearest-neighbour model memorizes; a straight line cannot.</Caption>
      <Plot x={extent(grp.rows.map(r => r.x))} y={extent(grp.rows.map(r => r.y))} xLabel="load (%)" yLabel="temperature" label="Measurements coloured by machine">{({ X, Y }) => grp.rows.map((r, i) => <circle key={i} cx={X(r.x)} cy={Y(r.y)} r="3.5" fill={COLORS[r.group % COLORS.length]} opacity="0.85" />)}</Plot>
      <Metrics items={[['1-NN · random rows', fmt(grp.rowSplit.nn, 1)], ['1-NN · held-out machines', fmt(grp.groupSplit.nn, 1)], ['Line · random rows', fmt(grp.rowSplit.line, 1)], ['Line · held-out machines', fmt(grp.groupSplit.line, 1)]]} />
      <Insight title="What the split measured">Random row splits put other measurements of the *same machine* in training, so the nearest neighbour is usually a sibling reading — the model looks excellent. Holding out whole machines (**group k-fold**) measures what deployment will face. Here the ranking of the two models can flip: the honest split may favor the simpler line. Split by the unit you will predict for.</Insight>
    </>}
    {time && <>
      <Caption>A metric with an upward trend and a cycle. 1-nearest-neighbour in time: predict the value at the closest known time. Random 5-fold vs forward chaining (train on the past, validate on the next block).</Caption>
      <Plot x={[0, 120]} y={extent(time.series.map(r => r.y))} xLabel="time step" yLabel="metric" label="Time series with forward-chaining validation blocks">{({ X, Y, y0, y1 }) => <>
        {time.forward.map((f, i) => <rect key={i} x={X(f.val[0])} y={Y(y1)} width={X(f.val.at(-1) + 1) - X(f.val[0])} height={Y(y0) - Y(y1)} fill="var(--chart-val)" opacity={0.08 + 0.05 * i} />)}
        <Path X={X} Y={Y} points={time.series.map(r => [r.t, r.y])} stroke="var(--chart-train)" width={1.8} />
      </>}</Plot>
      <Legend items={[['━', 'series', 'var(--chart-train)'], ['▮', 'forward-chaining validation blocks (each trained on everything to its left)', 'var(--chart-val)']]} />
      <Metrics items={[['MSE · random 5-fold', fmt(time.random, 2)], ['MSE · forward chaining', fmt(time.forwardMSE, 2)], ['Ratio', `${fmt(time.forwardMSE / time.random, 1)}×`]]} />
      <Insight title="Interpolation is not forecasting">In a random split, every validation point has training neighbours on both sides in time; the model interpolates. Deployment is always extrapolation into the future. Forward chaining reproduces that, so its error is the one to believe. Lab 19 builds proper forecasting models on this setup.</Insight>
    </>}
    {cur && <>
      <Caption>{models} candidate models, **each truly 70% accurate**. All are scored on the same 100-row test set, and the best one is “chosen”. Then the winner is re-scored on 100 fresh rows it has never influenced.</Caption>
      <Controls><Slider label="Models compared on the test set" value={models} min={1} max={200} onChange={setModels} /></Controls>
      <Plot x={[0.5, models + 0.5]} y={[0.5, 0.9]} xLabel="candidate model" yLabel="test accuracy" label="Test accuracies of equally good models" xTicks={Math.max(2, Math.min(models, 6))}>{({ X, Y }) => <>
        <Path X={X} Y={Y} points={[[0.5, 0.7], [models + 0.5, 0.7]]} stroke="var(--text)" width={1.2} dash="4 3" />
        {cur.test.map((a, i) => <circle key={i} cx={X(i + 1)} cy={Y(a)} r={i === cur.best ? 6 : 3.5} fill={i === cur.best ? 'var(--chart-val)' : 'var(--chart-train)'} />)}
      </>}</Plot>
      <Metrics items={[['Winner’s test accuracy', pct(cur.test[cur.best])], ['Winner on fresh data', pct(cur.fresh)], ['True accuracy (all models)', pct(cur.trueAccuracy)], ['Optimism', `+${fmt(100 * (cur.test[cur.best] - cur.trueAccuracy), 1)} pts`]]} />
      <Insight title="Test sets are single-use">The more models you compare on one test set, the more the maximum reflects luck. Use validation (or cross-validation) to choose; touch the test set **once**, at the end, for the chosen model. If you must compare many models on it, expect the winner’s score to shrink on new data.</Insight>
    </>}
  </>
}
