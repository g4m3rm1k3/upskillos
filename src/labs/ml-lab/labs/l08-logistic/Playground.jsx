import React, { useMemo, useState } from 'react'
import { featureMaps, score, prob, bce, evaluate, initial, step, gradientCheck } from './engine.js'
import { classification, split, DATASETS, bounds } from '../../kit/datasets.js'
import { Plot, Path, ClassDots, ProbabilityField, Contour } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Actions, Caption, Insight, Legend, Table, useTicker } from '../../kit/ui.jsx'
import { fmt, pct } from '../../kit/math.js'

export default function Playground() {
  const [kind, setKind] = useState('overlap'), [mapName, setMap] = useState('linear'), [seed, setSeed] = useState(1)
  const [rate, setRate] = useState(0.5), [lambda, setLambda] = useState(0), [threshold, setThreshold] = useState(0.5)
  const data = useMemo(() => split(classification(kind, { seed }), 0.7, seed), [kind, seed])
  const [model, setModel] = useState(() => initial('linear')), [history, setHistory] = useState([]), [running, setRunning] = useState(false), [check, setCheck] = useState(null)
  const reset = (m = mapName) => { setRunning(false); setModel(initial(m)); setHistory([]); setCheck(null) }
  React.useEffect(() => { reset() }, [data, mapName]) // eslint-disable-line react-hooks/exhaustive-deps
  const advance = k => {
    let next = model; const h = []
    for (let i = 0; i < k; i++) { next = step(next, data.train, mapName, rate, lambda); if (next.step % 5 === 0) h.push({ step: next.step, train: evaluate(next, data.train, mapName).loss, val: evaluate(next, data.validation, mapName).loss }) }
    setModel(next); setHistory(x => [...x, ...h].slice(-400))
  }
  useTicker(running && model.step < 3000, () => advance(10), 60)
  const fm = featureMaps[mapName].map, b = bounds([...data.train, ...data.validation])
  const tr = evaluate(model, data.train, mapName), va = evaluate(model, data.validation, mapName)
  const decide = rows => rows.filter(r => (prob(model, fm(r.x1, r.x2)) >= threshold ? 1 : 0) === r.label).length / rows.length
  const counts = data.validation.reduce((c, r) => { const pred = prob(model, fm(r.x1, r.x2)) >= threshold ? 1 : 0; c[`${r.label}${pred}`]++; return c }, { '00': 0, '01': 0, '10': 0, '11': 0 })
  const lossMax = Math.max(0.8, ...history.map(h => Math.max(h.train, h.val)))
  return <>
    <PanelHeading title="Scores become probabilities." pill={`step ${model.step}`} />
    <Controls>
      <Choice label="Dataset" value={kind} onChange={setKind} options={DATASETS.filter(d => d[0] !== 'spiral')} />
      <Choice label="Features" value={mapName} onChange={setMap} options={Object.entries(featureMaps).map(([k, v]) => [k, v.label])} />
      <Choice label="Learning rate α" value={String(rate)} onChange={v => setRate(Number(v))} options={['0.05', '0.1', '0.5', '1', '3']} />
      <Choice label="L2 penalty λ" value={String(lambda)} onChange={v => setLambda(Number(v))} options={['0', '0.001', '0.01', '0.1']} />
      <Slider label="Decision threshold t" value={threshold} min={0.05} max={0.95} step={0.05} onChange={setThreshold} format={v => v.toFixed(2)} />
      <label>Seed<input type="number" min="0" max="99999" value={seed} onChange={e => e.target.value !== '' && setSeed(Math.max(0, Math.min(99999, Math.trunc(+e.target.value))))} /></label>
    </Controls>
    <Legend items={[['●', 'class 0', 'var(--chart-train)'], ['◆', 'class 1', 'var(--chart-val)'], ['━', 'p = threshold', 'var(--text)'], ['▒', 'shading = predicted P(class 1)', 'var(--muted)']]} />
    <Plot x={b.x} y={b.y} xLabel="x1" yLabel="x2" label="Training points over the model’s probability field">{({ X, Y, x0, x1, y0, y1 }) => <>
      <ProbabilityField X={X} Y={Y} x0={x0} x1={x1} y0={y0} y1={y1} p={(a, c) => prob(model, fm(a, c))} />
      {model.step > 0 && <Contour X={X} Y={Y} x0={x0} x1={x1} y0={y0} y1={y1} f={(a, c) => prob(model, fm(a, c))} level={threshold} />}
      <ClassDots X={X} Y={Y} points={data.train} />
    </>}</Plot>
    <Actions>
      <button className="ml-primary" onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Train'}</button>
      <button disabled={running} onClick={() => advance(1)}>Step once</button>
      <button disabled={running} onClick={() => advance(200)}>200 steps</button>
      <button onClick={() => reset()}>Reset</button>
      <button disabled={running} onClick={() => setCheck(gradientCheck(model, data.train, mapName, lambda))}>Check gradients</button>
    </Actions>
    {check && <p className="ml-check-result" role="status">{check.passed ? '✓ Match' : 'Mismatch'}: largest |analytic − finite difference| = {check.error.toExponential(2)} across {check.analytic.length} parameters.</p>}
    <Metrics items={[['Train log loss', fmt(tr.loss, 4)], ['Validation log loss', fmt(va.loss, 4)], [`Validation accuracy @ t=${threshold.toFixed(2)}`, pct(decide(data.validation))], ['‖w‖', fmt(Math.hypot(...model.w), 3)]]} />
    {history.length > 1 && <Plot x={[0, history.at(-1).step]} y={[0, lossMax]} height={180} xLabel="step" yLabel="log loss" label="Training and validation log loss">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={history.map(h => [h.step, h.train])} stroke="var(--chart-train)" />
      <Path X={X} Y={Y} points={history.map(h => [h.step, h.val])} stroke="var(--chart-val)" dash="6 3" />
    </>}</Plot>}
    <Table head={['validation', 'predicted 0', 'predicted 1']} rows={[['actual 0', counts['00'], counts['01']], ['actual 1', counts['10'], counts['11']]]} caption="Moving the threshold changes decisions — and this table — without changing a single probability. Lab 09 is about choosing it." />
    <details><summary>Inside the model: score → probability → loss, first 8 training points</summary>
      <Table head={['x1', 'x2', 'label y', 'score z = w·x + b', 'p = σ(z)', 'loss −log p(y)']} rows={data.train.slice(0, 8).map(r => { const z = score(model, fm(r.x1, r.x2)); return [fmt(r.x1, 2), fmt(r.x2, 2), r.label, fmt(z, 3), fmt(prob(model, fm(r.x1, r.x2)), 3), fmt(bce(z, r.label), 3)] })} />
      <p className="ml-mono">{`weights: ${featureMaps[mapName].names.map((nm, j) => `${nm}=${fmt(model.w[j], 3)}`).join('  ')}  b=${fmt(model.b, 3)}`}</p>
    </details>
    <Insight title="Things to try">
      <ul>
        <li>“Two blobs” with λ = 0: training loss keeps falling and ‖w‖ keeps growing. On separable data the maximum-likelihood weights are infinite. Add λ = 0.01 and watch ‖w‖ settle.</li>
        <li>“Circle inside ring” with linear features cannot beat roughly 50–60%. Switch to quadratic features: the boundary becomes an ellipse.</li>
        <li>Move the threshold: the probability field does not change, only which side of the black contour each point falls.</li>
      </ul>
    </Insight>
  </>
}
