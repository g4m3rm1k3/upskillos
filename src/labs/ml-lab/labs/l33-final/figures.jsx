// Figures placed between the paragraphs of Lab 33 (33.2), built on the lab's own engine.
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Radio, Readout, MiniPlot, Dots, HLine, Label, Bars, r } from '../../kit/fig.jsx'
import { random, normal, range, mean, std } from '../../kit/math.js'
import { compare } from './engine.js'

// ---------- 33.2: paired fold differences ----------
const SETS = {
  lesson: { label: 'the lesson’s five folds', d: [4.1, 3.8, 5.0, -0.4, -0.6] },
  steady: { label: 'same mean, steady', d: [2.3, 2.5, 2.4, 2.3, 2.4] },
  one: { label: 'one big fold', d: [11.2, 0.3, 0.2, 0.1, 0.1] },
}
export function PairedFolds() {
  const [set, setSet] = useState('lesson'), [thr, setThr] = useState(2)
  const d = SETS[set].d, m = mean(d), sd = std(d, 1), wins = d.filter(v => v > 0).length
  return <div>
    <Controls>
      <Radio name="set33" value={set} onChange={setSet} options={Object.entries(SETS).map(([k, v]) => [k, v.label])} />
      <Slider label="success threshold (s), set before modelling" value={thr} min={0} max={4} step={0.25} onChange={setThr} digits={2} />
    </Controls>
    <MiniPlot x={[1, 5]} y={[-4, 12]} xLabel="fold" yLabel="baseline MAE − model MAE (s)" xTicks={5} xFormat={v => String(Math.round(v))} label={`Paired differences ${d.join(', ')}; mean ${r(m, 2)} s; threshold ${thr} s`}>{({ X, Y }) => <>
      <HLine X={X} Y={Y} y={0} x0={1} x1={5} color="var(--border)" dash="" />
      <HLine X={X} Y={Y} y={thr} x0={1} x1={5} color="var(--chart-val)" />
      <HLine X={X} Y={Y} y={m} x0={1} x1={5} color="var(--chart-model)" dash="" />
      <Dots X={X} Y={Y} points={d.map((v, i) => [i + 1, v])} color="var(--chart-train)" rad={5} />
      <Label X={X} Y={Y} x={1.1} y={thr + 0.5} color="var(--chart-val)">threshold</Label>
      <Label X={X} Y={Y} x={4.2} y={m + 0.5} color="var(--chart-model)">mean {r(m, 2)}</Label>
    </>}</MiniPlot>
    <Readout>Mean difference {r(m, 2)} s, standard deviation {r(sd, 2)} s, {wins} of 5 folds won. {set === 'one' ? 'A single fold carries the whole average: the model helps in one period and does nothing in the others — read that fold’s rows before believing the mean.' : set === 'steady' ? 'The same mean as the lesson’s folds, but every fold agrees: far more convincing, although it is barely above a 2 s threshold.' : 'Three large wins and two small losses: the win count (3 of 5) hides how large the wins are, and the spread shows how much one fold can move the picture.'} The folds share most of their training rows, so none of this is independent evidence — the single test evaluation is.</Readout>
  </div>
}

// ---------- 33.2: random folds against forward chaining ----------
function driftingLog(n = 240, seed = 3) {
  const g = random(seed)
  return range(n).map(i => {
    const size = Math.exp(Math.log(40) + 0.8 * normal(g)), files = Math.round(size / 3 + 20 * g()), cache = g() < 0.5 ? 1 : 0, shared = g() < 0.5 ? 1 : 0
    const queue = 10 + 60 * (i / n)                      // shared runners get busier over time: their queue grows from 10 s to 70 s
    return { size_mb: size, files, cache_hit: cache, shared_runner: shared, duration_s: 20 + 0.8 * size + (cache ? 0 : 30) + (shared ? queue : 0) + 5 * normal(g) }
  })
}
const LOG = driftingLog()
export function FoldDesign() {
  const [ordered, setOrdered] = useState('random')
  const res = useMemo(() => compare(LOG, 'duration_s', ['size_mb', 'files', 'cache_hit', 'shared_runner'], { ordered: ordered === 'forward' }), [ordered])
  const other = useMemo(() => compare(LOG, 'duration_s', ['size_mb', 'files', 'cache_hit', 'shared_runner'], { ordered: ordered !== 'forward' }), [ordered])
  return <div>
    <Controls><Radio name="folds33" value={ordered} onChange={setOrdered} options={[['random', 'random folds'], ['forward', 'forward chaining (time order)']]} /></Controls>
    <Bars items={[{ label: 'baseline', value: res.baseline.mean }, { label: 'linear model', value: res.model.mean, highlight: true }]} digits={1} label={`${ordered} folds on 240 time-ordered builds: baseline MAE ${r(res.baseline.mean, 1)} s, model ${r(res.model.mean, 1)} s over ${res.folds} folds`} />
    <Readout>{ordered === 'forward' ? `Forward chaining trains only on the past: the model’s MAE is ${r(res.model.mean, 1)} s over ${res.folds} folds, against ${r(other.model.mean, 1)} s with random folds. Shared runners keep getting busier, so a model always meets a future a little unlike its past — as it will after deployment.` : `Random folds mix future builds into training: the model’s MAE is ${r(res.model.mean, 1)} s, against ${r(other.model.mean, 1)} s with forward chaining. With data that changes over time, random folds promise more than deployment will deliver.`}</Readout>
  </div>
}
