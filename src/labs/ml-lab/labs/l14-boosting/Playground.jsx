import React, { useMemo, useState } from 'react'
import { truth, makeData, boost, predictAt, stageErrors, bestStage } from './engine.js'
import { predict } from '../l12-trees/engine.js'
import { Plot, Path } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Legend, Actions } from '../../kit/ui.jsx'
import { fmt, linspace } from '../../kit/math.js'

export default function Playground() {
  const [stage, setStage] = useState(5), [rate, setRate] = useState(0.3), [depth, setDepth] = useState(1), [noise, setNoise] = useState(0.3), [seed, setSeed] = useState(1)
  const train = useMemo(() => makeData(80, noise, seed), [noise, seed]), val = useMemo(() => makeData(300, noise, seed + 500), [noise, seed])
  const model = useMemo(() => boost(train, { stages: 400, rate, depth }), [train, rate, depth])
  const errors = useMemo(() => stageErrors(model, train, val), [model, train, val])
  const best = bestStage(errors), grid = linspace(-3, 3, 240)
  const prev = stage > 0 ? stage - 1 : 0, tree = stage > 0 ? model.trees[stage - 1] : null
  const residuals = train.map(r => ({ x: r.x[0], r: r.y - predictAt(model, r.x, prev) }))
  const logE = v => Math.log10(Math.max(v, 1e-4))
  return <>
    <PanelHeading title="Fix the remaining mistakes, a little at a time." pill={`stage ${stage} · best ${best}`} />
    <Controls>
      <Slider label="Boosting stage m" value={stage} min={0} max={400} onChange={setStage} />
      <Choice label="Learning rate (shrinkage) ν" value={String(rate)} onChange={v => setRate(Number(v))} options={['0.03', '0.1', '0.3', '1']} />
      <Slider label="Depth of each tree" value={depth} min={1} max={4} onChange={setDepth} />
      <Slider label="Noise σ" value={noise} min={0.05} max={0.8} step={0.05} onChange={setNoise} format={v => v.toFixed(2)} />
      <label>Seed<input type="number" min="0" max="99999" value={seed} onChange={e => e.target.value !== '' && setSeed(Math.max(0, Math.min(99999, Math.trunc(+e.target.value))))} /></label>
    </Controls>
    <Actions>{[0, 1, 2, 5, 20, 100, best, 400].map((s, i) => <button key={i} onClick={() => setStage(s)}>{s === best ? `best (${s})` : `stage ${s}`}</button>)}</Actions>
    <Legend items={[['●', 'training data', 'var(--chart-train)'], ['━', `ensemble after ${stage} stages`, 'var(--chart-model)'], ['┄', 'true function', 'var(--muted)']]} />
    <Plot x={[-3, 3]} y={[-2.6, 3]} xLabel="x" yLabel="y" label="Boosted prediction on the training data">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={grid.map(x => [x, truth(x)])} stroke="var(--muted)" width={2} dash="6 5" />
      {train.map((r, i) => <circle key={i} cx={X(r.x[0])} cy={Y(r.y)} r="3.2" fill="var(--chart-train)" />)}
      <Path X={X} Y={Y} points={grid.map(x => [x, predictAt(model, [x], stage)])} />
    </>}</Plot>
    {tree && <>
      <Legend items={[['●', `residuals after stage ${prev}`, 'var(--chart-val)'], ['━', `tree ${stage} fitted to them (before × ν)`, 'var(--text)']]} />
      <Plot x={[-3, 3]} y={[-2, 2]} height={220} xLabel="x" yLabel="residual y − F(x)" label="Residuals and the tree fitted to them">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={[[-3, 0], [3, 0]]} stroke="var(--border)" width={1} />
        {residuals.map((r, i) => <circle key={i} cx={X(r.x)} cy={Y(r.r)} r="3" fill="var(--chart-val)" opacity="0.8" />)}
        <Path X={X} Y={Y} points={grid.map(x => [x, predict(tree, [x])])} stroke="var(--text)" />
      </>}</Plot>
    </>}
    <Legend items={[['━', 'training MSE', 'var(--chart-train)'], ['━', 'validation MSE', 'var(--chart-val)'], ['┆', 'early-stopping point', 'var(--muted)']]} />
    <Plot x={[0, 400]} y={[logE(Math.min(...errors.map(e => e.train)) * 0.8), logE(errors[0].val * 1.2)]} height={220} xLabel="stage" yLabel="MSE (log)" label="Training and validation error by stage" yFormat={v => (10 ** v).toPrecision(2)}>{({ X, Y, y0, y1 }) => <>
      <Path X={X} Y={Y} points={errors.map(e => [e.stage, logE(e.train)])} stroke="var(--chart-train)" />
      <Path X={X} Y={Y} points={errors.map(e => [e.stage, logE(e.val)])} stroke="var(--chart-val)" />
      <Path X={X} Y={Y} points={[[best, y0], [best, y1]]} stroke="var(--muted)" width={1} dash="3 3" />
      <circle cx={X(stage)} cy={Y(logE(errors[stage].val))} r="5" fill="var(--chart-val)" />
    </>}</Plot>
    <Metrics items={[['Train MSE', fmt(errors[stage].train, 4)], ['Validation MSE', fmt(errors[stage].val, 4)], ['Best validation (stage)', `${fmt(errors[best].val, 4)} (${best})`], ['Noise floor σ²', fmt(noise * noise, 4)]]} />
    <Insight title="Watch one stage at a time">Step through stages 0, 1, 2: the first tree is a single split of the residuals (depth 1 = a “stump”), scaled down by ν before it is added. Each new tree only has to fit what the ensemble still gets wrong. With ν = 1 the fit races ahead and overfits early; with ν = 0.03 it needs many more stages but reaches a lower validation error. Early stopping picks the stage from validation data, never from the test set.</Insight>
  </>
}
