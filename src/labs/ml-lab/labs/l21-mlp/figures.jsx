// Figures placed between the paragraphs of Lab 21 (21.1–21.4).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Check, Radio, Readout, MiniPlot, Path, Dots, VLine, Bars, r, curve } from '../../kit/fig.jsx'
import { random, normal, range, std, sigmoid } from '../../kit/math.js'
import { softmax } from './engine.js'

// ---------- 21.1 ----------
export function LayerShapes() {
  const [n, setN] = useState(32), [d, setD] = useState(2), [h1, setH1] = useState(8), [two, setTwo] = useState(false), [h2, setH2] = useState(8), [k, setK] = useState(2)
  const widths = [d, h1, ...(two ? [h2] : []), k]
  const layers = widths.slice(1).map((m, l) => ({ din: widths[l], m }))
  const total = layers.reduce((s, L) => s + L.din * L.m + L.m, 0)
  return <div>
    <Controls>
      <Slider label="batch n" value={n} min={1} max={256} step={1} onChange={setN} digits={0} />
      <Slider label="inputs d" value={d} min={1} max={20} step={1} onChange={setD} digits={0} />
      <Slider label="hidden units" value={h1} min={1} max={64} step={1} onChange={setH1} digits={0} />
      <Check label="second hidden layer" checked={two} onChange={setTwo} />
      {two && <Slider label="second layer units" value={h2} min={1} max={64} step={1} onChange={setH2} digits={0} />}
      <Slider label="classes k" value={k} min={2} max={10} step={1} onChange={setK} digits={0} />
    </Controls>
    <table className="ml-fig-table">
      <caption>Shapes through a {widths.join(' → ')} network</caption>
      <thead><tr><th scope="col">Layer</th><th scope="col">Input A</th><th scope="col">W</th><th scope="col">b</th><th scope="col">Z and A</th><th scope="col">Parameters</th></tr></thead>
      <tbody>{layers.map((L, l) => <tr key={l}><th scope="row">{l + 1}</th><td>({n}, {L.din})</td><td>({L.din}, {L.m})</td><td>({L.m},)</td><td>({n}, {L.m})</td><td>{L.din} × {L.m} + {L.m} = {L.din * L.m + L.m}</td></tr>)}</tbody>
    </table>
    <Readout>{total} parameters. The batch size n appears in every activation’s shape and in no parameter’s: the same weights serve every example.</Readout>
  </div>
}

// ---------- 21.2 ----------
const ACTS = {
  sigmoid: { f: sigmoid, d: z => sigmoid(z) * (1 - sigmoid(z)), max: 0.25, range: [-0.1, 1.1] },
  tanh: { f: Math.tanh, d: z => 1 - Math.tanh(z) ** 2, max: 1, range: [-1.1, 1.1] },
  relu: { f: z => Math.max(0, z), d: z => (z > 0 ? 1 : 0), max: 1, range: [-0.5, 4] },
}
export function ActivationSlopes() {
  const [act, setAct] = useState('sigmoid'), [depth, setDepth] = useState(10)
  const A = ACTS[act]
  return <div>
    <Controls>
      <Radio name="act21" value={act} onChange={setAct} options={[['sigmoid', 'sigmoid'], ['tanh', 'tanh'], ['relu', 'ReLU']]} />
      <Slider label="layers L" value={depth} min={1} max={20} step={1} onChange={setDepth} digits={0} />
    </Controls>
    <MiniPlot x={[-4, 4]} y={A.range} xLabel="z" yLabel="value" label={`${act} (solid) and its slope (dashed); the slope is at most ${A.max}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(A.f, -4, 4, 200)} stroke="var(--chart-model)" />
      <Path X={X} Y={Y} points={curve(A.d, -4, 4, 200)} stroke="var(--chart-val)" dash="5 4" />
    </>}</MiniPlot>
    <Readout>The largest slope of {act} is {A.max}. Backprop multiplies one such factor per layer, so through {depth} layers the gradient is at best multiplied by {A.max}^{depth} = {A.max === 1 ? '1' : (A.max ** depth).toExponential(2)}{act === 'relu' ? ' — for units whose input is positive; a unit with negative input passes nothing' : ''}.</Readout>
  </div>
}

// ---------- 21.3 ----------
export function SoftmaxBars() {
  const [z, setZ] = useState([2, 1, 0]), [y, setY] = useState(0)
  const p = softmax(z), loss = -Math.log(p[y])
  const set = (i, v) => setZ(zz => zz.map((x, j) => (j === i ? v : x)))
  return <div>
    <Controls>
      {z.map((v, i) => <Slider key={i} label={`score z${i}`} value={v} min={-5} max={5} step={0.1} onChange={x => set(i, x)} digits={1} />)}
      <Radio name="y21" value={String(y)} onChange={v => setY(Number(v))} options={[['0', 'true class 0'], ['1', 'true class 1'], ['2', 'true class 2']]} />
    </Controls>
    <Bars items={p.map((v, i) => ({ label: `p${i}`, value: v, highlight: i === y }))} max={1} digits={3} label={`Softmax probabilities ${p.map(v => r(v, 3)).join(', ')}; the true class is ${y}`} />
    <Bars items={p.map((v, i) => ({ label: `∂L/∂z${i}`, value: v - (i === y ? 1 : 0), highlight: i === y }))} max={1} min={-1} digits={3} label={`Gradient p − one-hot: ${p.map((v, i) => r(v - (i === y ? 1 : 0), 3)).join(', ')}`} />
    <Readout>Loss −log p{y} = {r(loss, 3)}. The gradient is p minus the one-hot truth: negative only for the true class (raise its score), positive for the others (lower theirs), and the entries sum to 0.</Readout>
  </div>
}

// ---------- 21.4 ----------
// Activation spread through 10 ReLU layers of width 60 for three weight scales (seeded, recomputed in the browser).
function spreads(scale, seed = 3) {
  const rng = random(seed), width = 60, n = 120
  let a = range(n).map(() => range(width).map(() => normal(rng)))
  const out = []
  for (let l = 0; l < 10; l++) {
    const sd = scale === 'he' ? Math.sqrt(2 / width) : scale === 'tiny' ? 0.01 : 1
    const W = range(width).map(() => range(width).map(() => sd * normal(rng)))
    a = a.map(row => W[0].map((_, j) => Math.max(0, row.reduce((t, v, k) => t + v * W[k][j], 0))))
    out.push(std(a.flat()))
  }
  return out
}
export function InitSpread() {
  const [scale, setScale] = useState('he')
  const s = useMemo(() => spreads(scale), [scale])
  const pts = s.map((v, l) => [l + 1, Math.log10(Math.max(v, 1e-30))])
  return <div>
    <Controls><Radio name="init21" value={scale} onChange={setScale} options={[['tiny', 'tiny: 0.01'], ['he', 'He: √(2/fan_in)'], ['large', 'large: 1.0']]} /></Controls>
    <MiniPlot x={[1, 10]} y={[-14, 10]} xTicks={10} yTicks={7} xLabel="layer" yLabel="log₁₀ spread" label={`Spread of the activations layer by layer with ${scale} initialization: ${s.map(v => v.toExponential(1)).join(', ')}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={pts} stroke="var(--chart-model)" />
      <Dots X={X} Y={Y} points={pts} rad={3.5} />
    </>}</MiniPlot>
    <Readout>After 10 layers the activations’ spread is {s[9].toExponential(1)} (it was {s[0].toExponential(1)} after the first). Only He’s √(2/fan_in) keeps it near 1: the gradients flowing back shrink or grow by the same factors.</Readout>
  </div>
}
