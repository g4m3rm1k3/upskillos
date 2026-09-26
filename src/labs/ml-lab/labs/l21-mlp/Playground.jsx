import React, { useMemo, useState } from 'react'
import { DATA, init, forward, loss, trainSteps, gradCheck, predictProbs, accuracy, countParams, ACT } from './engine.js'
import { bounds, split } from '../../kit/datasets.js'
import { Plot, Path } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Legend, Actions, Table, useTicker } from '../../kit/ui.jsx'
import { fmt, pct } from '../../kit/math.js'

const CLASS = ['var(--chart-train)', 'var(--chart-val)', '#10b981']

function Field({ X, Y, x0, x1, y0, y1, f, cells = 34 }) {
  const rows = Math.round(cells * 0.6), w = (x1 - x0) / cells, h = (y1 - y0) / rows, out = []
  for (let i = 0; i < cells; i++) for (let j = 0; j < rows; j++) {
    const p = f(x0 + (i + 0.5) * w, y0 + (j + 0.5) * h), c = p.indexOf(Math.max(...p))
    out.push(<rect key={`${i}-${j}`} x={X(x0 + i * w)} y={Y(y0 + (j + 1) * h)} width={X(x0 + w) - X(x0) + 0.6} height={Y(y0) - Y(y0 + h) + 0.6} fill={CLASS[c]} opacity={0.05 + 0.4 * (Math.max(...p) - 1 / p.length) * p.length / (p.length - 1)} />)
  }
  return out
}

export default function Playground() {
  const [key, setKey] = useState('xor'), [width, setWidth] = useState(8), [depth, setDepth] = useState(1), [act, setAct] = useState('tanh')
  const [rate, setRate] = useState(0.5), [scheme, setScheme] = useState('he'), [seed, setSeed] = useState(1)
  const data = useMemo(() => split(DATA[key][1](seed), 0.75, seed), [key, seed])
  const Xtr = data.train.map(p => [p.x1, p.x2]), ytr = data.train.map(p => p.label), Xva = data.validation.map(p => [p.x1, p.x2]), yva = data.validation.map(p => p.label)
  const k = Math.max(...ytr, ...yva) + 1, sizes = [2, ...Array(depth).fill(width), k]
  const fresh = () => init(sizes, scheme, seed)
  const [layers, setLayers] = useState(fresh), [history, setHistory] = useState([]), [steps, setSteps] = useState(0), [running, setRunning] = useState(false), [check, setCheck] = useState(null)
  const reset = () => { setRunning(false); setLayers(fresh()); setHistory([]); setSteps(0); setCheck(null) }
  React.useEffect(reset, [key, width, depth, act, scheme, seed]) // eslint-disable-line react-hooks/exhaustive-deps
  const safeLayers = layers.length === sizes.length - 1 && layers[0].W[0].length === width && layers.at(-1).W[0].length === k ? layers : fresh()
  const advance = n => {
    const next = trainSteps(safeLayers, Xtr, ytr, { act, rate, steps: n }), s = steps + n
    setLayers(next); setSteps(s); setHistory(h => [...h, { s, train: loss(forward(next, Xtr, act).at(-1).a, ytr), val: loss(forward(next, Xva, act).at(-1).a, yva) }].slice(-300))
  }
  useTicker(running && steps < 5000, () => advance(10), 50)
  const b = bounds([...data.train, ...data.validation])
  const hidden = forward(safeLayers, [[0, 0]], act)[1].a[0].length
  const unitMap = unit => (a, c) => forward(safeLayers, [[a, c]], act)[1].a[0][unit]
  const diverged = history.length && !Number.isFinite(history.at(-1).train)
  return <>
    <PanelHeading title="Layers of simple units learn complex boundaries." pill={`${countParams(safeLayers)} parameters · step ${steps}`} />
    <Controls>
      <Choice label="Dataset" value={key} onChange={setKey} options={Object.entries(DATA).map(([k2, v]) => [k2, v[0]])} />
      <Choice label="Hidden activation" value={act} onChange={setAct} options={Object.keys(ACT)} />
      <Slider label="Units per hidden layer" value={width} min={1} max={32} onChange={setWidth} />
      <Slider label="Hidden layers" value={depth} min={1} max={3} onChange={setDepth} />
      <Choice label="Learning rate" value={String(rate)} onChange={v => setRate(Number(v))} options={['0.03', '0.1', '0.5', '1', '3']} />
      <Choice label="Weight initialization" value={scheme} onChange={setScheme} options={[['he', 'He: N(0, 2/fan_in)'], ['xavier', 'LeCun: N(0, 1/fan_in)'], ['zero', 'All zeros'], ['large', 'Too large: N(0, 9)']]} />
    </Controls>
    <Actions>
      <button className="ml-primary" onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Train'}</button>
      <button disabled={running} onClick={() => advance(1)}>Step once</button><button disabled={running} onClick={() => advance(200)}>200 steps</button>
      <button onClick={reset}>Reset weights</button><button disabled={running} onClick={() => setCheck(gradCheck(safeLayers, Xtr, ytr, act))}>Check gradients</button>
      <label style={{ fontSize: 11, color: 'var(--muted)' }}>Seed <input type="number" min="0" max="999" value={seed} style={{ width: 60 }} onChange={e => e.target.value !== '' && setSeed(Math.max(0, Math.min(999, Math.trunc(+e.target.value))))} /></label>
    </Actions>
    {check && <Table head={['layer', 'weight', 'backprop', 'finite difference', 'rel. error']} rows={check.map(c => [c.layer, `W[${c.k}][${c.j}]`, fmt(c.analytic, 7), fmt(c.numeric, 7), (Math.abs(c.analytic - c.numeric) / Math.max(1e-8, Math.abs(c.analytic) + Math.abs(c.numeric))).toExponential(1)])} />}
    <Legend items={[['■', 'predicted class (shade = confidence)', 'var(--muted)'], ['●', 'training points, coloured by class', 'var(--text)']]} />
    <Plot x={b.x} y={b.y} xLabel="x1" yLabel="x2" label="Network decision regions">{({ X, Y, x0, x1, y0, y1 }) => <>
      <Field X={X} Y={Y} x0={x0} x1={x1} y0={y0} y1={y1} f={(a, c) => predictProbs(safeLayers, [a, c], act)} />
      {data.train.map((p, i) => <circle key={i} cx={X(p.x1)} cy={Y(p.x2)} r="3.3" fill={CLASS[p.label]} stroke="var(--surface)" strokeWidth="0.8" />)}
    </>}</Plot>
    <Metrics items={[['Training loss', history.length ? fmt(history.at(-1).train, 4) : fmt(loss(forward(safeLayers, Xtr, act).at(-1).a, ytr), 4)], ['Validation loss', history.length ? fmt(history.at(-1).val, 4) : '—'], ['Training accuracy', pct(accuracy(safeLayers, Xtr, ytr, act))], ['Validation accuracy', pct(accuracy(safeLayers, Xva, yva, act))]]} />
    {diverged ? <p className="ml-warning">Training diverged — lower the learning rate and reset.</p> : history.length > 1 && <Plot x={[0, history.at(-1).s]} y={[0, Math.max(1.2, ...history.map(h => Math.max(h.train, h.val)).filter(Number.isFinite))]} height={170} xLabel="step" yLabel="cross-entropy" label="Loss curves">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={history.map(h => [h.s, h.train])} stroke="var(--chart-train)" />
      <Path X={X} Y={Y} points={history.map(h => [h.s, h.val])} stroke="var(--chart-val)" dash="5 3" />
    </>}</Plot>}
    <p className="ml-caption">What the first hidden layer computes — each map is one unit’s activation over the input plane (brighter = larger). The output layer combines these features linearly.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
      {Array.from({ length: Math.min(8, hidden) }, (_, u) => <Plot key={u} x={b.x} y={b.y} width={200} height={150} grid={false} label={`Hidden unit ${u + 1}`}>{({ X, Y, x0, x1, y0, y1 }) => {
        const cells = 18, rows = 11, w = (x1 - x0) / cells, h = (y1 - y0) / rows, f = unitMap(u), vals = []
        for (let i = 0; i < cells; i++) for (let j = 0; j < rows; j++) vals.push([i, j, f(x0 + (i + 0.5) * w, y0 + (j + 0.5) * h)])
        const lo = Math.min(...vals.map(v => v[2])), hi = Math.max(...vals.map(v => v[2])) || 1
        return vals.map(([i, j, v]) => <rect key={`${i}-${j}`} x={X(x0 + i * w)} y={Y(y0 + (j + 1) * h)} width={X(x0 + w) - X(x0) + 0.5} height={Y(y0) - Y(y0 + h) + 0.5} fill="var(--accent)" opacity={hi > lo ? 0.05 + 0.85 * (v - lo) / (hi - lo) : 0.05} />)
      }}</Plot>)}
    </div>
    <Insight title="Experiments worth running">
      <ul>
        <li>XOR with 1 hidden unit cannot work; 2–4 units can. Each unit draws one soft line; the output combines them.</li>
        <li>Initialize with <strong>all zeros</strong>: every hidden unit computes the same thing and receives the same gradient, forever. Accuracy stays at chance — symmetry is never broken.</li>
        <li>“Too large” initialization with tanh saturates units (flat maps, tiny gradients); ReLU with rate 3 can blow up.</li>
        <li>The 3-arm spiral needs width and depth — watch the hidden maps become more intricate in the second layer’s inputs.</li>
      </ul>
    </Insight>
  </>
}
