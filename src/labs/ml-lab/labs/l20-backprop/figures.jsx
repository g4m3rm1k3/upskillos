// Figures placed between the paragraphs of Lab 20 (20.1–20.5). Graphs come from the lab's own engine,
// so every value and gradient shown here is the one the playground computes.
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Readout, Note, MiniPlot, Path, Dots, VLine, useStepper, r, curve } from '../../kit/fig.jsx'
import { evaluate, layout, PRESETS } from './engine.js'

const NODE_W = 96, NODE_H = 42, COL_W = 130, ROW_H = 58
const nameOf = v => v.label || v.op

// A computation graph: one box per node, arrows from inputs to the nodes that use them.
function GraphView({ order, showGrad = () => false, highlight, label }) {
  const { depth, cols, maxDepth } = layout(order)
  const rows = Math.max(...[...cols.values()].map(c => c.length))
  const pos = new Map()
  cols.forEach((vs, d) => vs.forEach((v, i) => pos.set(v, [12 + d * COL_W, 14 + (i + (rows - vs.length) / 2) * ROW_H])))
  const W = 24 + maxDepth * COL_W + NODE_W, H = 20 + rows * ROW_H
  return <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ maxWidth: W, width: '100%' }}>
    {order.map(v => v.parents.map((p, j) => { const [x1, y1] = pos.get(p), [x2, y2] = pos.get(v); return <line key={`${v.id}-${j}`} x1={x1 + NODE_W} y1={y1 + NODE_H / 2} x2={x2} y2={y2 + NODE_H / 2} stroke="var(--border)" strokeWidth={1.4} /> }))}
    {order.map(v => { const [x, y] = pos.get(v), on = highlight === v; return <g key={v.id}>
      <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={7} fill="var(--surface)" stroke={on ? 'var(--accent)' : 'var(--border)'} strokeWidth={on ? 2.5 : 1.2} />
      <text x={x + 8} y={y + 16} style={{ fontWeight: 600 }}>{nameOf(v)}{v.parents.length ? '' : ' (input)'}</text>
      <text x={x + 8} y={y + 33}>{r(v.data, 3)}{showGrad(v) ? <tspan className="ml-axis" dx={6}>grad {r(v.grad, 3)}</tspan> : null}</text>
    </g> })}
  </svg>
}

// ---------- 20.1 ----------
export function ForwardGraph() {
  const [a, setA] = useState(2), [b, setB] = useState(-3), [c, setC] = useState(10)
  const { order, out } = useMemo(() => evaluate('chain', { a, b, c }), [a, b, c])
  return <div>
    <Controls>
      <Slider label="a" value={a} min={-5} max={5} step={1} onChange={setA} digits={0} />
      <Slider label="b" value={b} min={-5} max={5} step={1} onChange={setB} digits={0} />
      <Slider label="c" value={c} min={-10} max={10} step={1} onChange={setC} digits={0} />
    </Controls>
    <GraphView order={order} label={`The graph of L = (a·b + c)² with a = ${a}, b = ${b}, c = ${c}; L = ${r(out.data)}`} />
    <Readout>a·b = {r(a * b)}, then e = a·b + c = {r(a * b + c)}, then L = e² = {r(out.data)}. Each node needs only the stored values of its inputs.</Readout>
  </div>
}

// ---------- 20.2 and 20.3 ----------
const RULES = {
  '+': 'a sum passes its gradient unchanged to both inputs',
  '×': 'a product passes each input the gradient times the other input',
  '^2': 'a square passes 2 × its input times the gradient',
  tanh: 'tanh passes (1 − y²) times the gradient',
}
export function BackwardSteps({ preset = 'chain' }) {
  const { order, out } = useMemo(() => evaluate(preset, PRESETS[preset].inputs), [preset])
  const back = [...order].reverse().filter(v => v.parents.length)     // nodes that push gradients, output first
  const [step, stepControls] = useStepper(back.length)
  const done = new Set([out, ...back.slice(0, step).flatMap(v => [v, ...v.parents])])
  const cur = step > 0 ? back[step - 1] : null
  const inputs = Object.entries(PRESETS[preset].inputs).map(([k, x]) => `${k} = ${x}`).join(', ')
  return <div>
    <Controls>{stepControls}</Controls>
    <GraphView order={order} showGrad={v => done.has(v)} highlight={cur} label={`${PRESETS[preset].label} with ${inputs}: backward step ${step} of ${back.length}`} />
    <Readout>{step === 0
      ? `The output starts with gradient 1 (∂${nameOf(out)}/∂${nameOf(out)} = 1). Press Next step: each step takes one node, output first, and pushes its gradient to its inputs.`
      : `Step ${step}: node ${nameOf(cur)} has gradient ${r(cur.grad, 3)}; ${RULES[cur.op] ?? 'it applies its local derivative'}. ${cur.parents.map(p => `${nameOf(p)} now holds ${r(p.grad, 3)}`).join('; ')}.`}</Readout>
    {preset === 'shared' && step >= back.length && <Note>x received two contributions, 4 through the product and 1 through the sum. They add: ∂f/∂x = 5.</Note>}
  </div>
}

// ---------- 20.4 ----------
export function Saturation() {
  const [z, setZ] = useState(0.88)
  const y = Math.tanh(z), slope = 1 - y * y
  return <div>
    <Controls><Slider label="z = w·x + b" value={z} min={-5} max={5} step={0.01} onChange={setZ} /></Controls>
    <MiniPlot x={[-5, 5]} y={[-1.1, 1.1]} xLabel="z" yLabel="value" label={`tanh(z) and its slope 1 − tanh²(z); at z = ${r(z, 2)} the slope is ${r(slope, 3)}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(Math.tanh, -5, 5)} stroke="var(--chart-model)" />
      <Path X={X} Y={Y} points={curve(t => 1 - Math.tanh(t) ** 2, -5, 5)} stroke="var(--chart-val)" dash="5 4" />
      <VLine X={X} Y={Y} x={z} y0={-1.1} y1={1.1} />
      <Dots X={X} Y={Y} points={[[z, y], [z, slope]]} color="var(--accent)" rad={5} />
    </>}</MiniPlot>
    <Readout>y = tanh({r(z, 2)}) = {r(y, 4)}. Slope 1 − y² = {r(slope, 4)}: {r(100 * slope, 2)}% of the gradient arriving at y passes back to z and on to the weights. Solid: tanh; dashed: its slope.</Readout>
  </div>
}

// ---------- 20.5 ----------
// Central differences of tanh at x = 0.5 in double precision: truncation error falls as ε², rounding error grows as 1/ε.
const EXACT = 1 - Math.tanh(0.5) ** 2
export const SWEEP = Array.from({ length: 25 }, (_, i) => {
  const eps = 10 ** (-1 - i * 0.5), n = (Math.tanh(0.5 + eps) - Math.tanh(0.5 - eps)) / (2 * eps)
  return [Math.log10(eps), Math.log10(Math.max(1e-17, Math.abs(n - EXACT) / Math.max(1, Math.abs(n), EXACT)))]
})
const sci = log10 => (10 ** log10).toExponential(0).replace('e-', 'e−')
export function EpsilonSweep() {
  const [k, setK] = useState(8)
  const [le, lr] = SWEEP[k]
  const best = SWEEP.reduce((b, p) => (p[1] < b[1] ? p : b))
  return <div>
    <Controls><Slider label="log₁₀ ε" value={le} min={SWEEP[SWEEP.length - 1][0]} max={-1} step={0.5} onChange={v => setK(SWEEP.findIndex(p => Math.abs(p[0] - v) < 1e-9))} digits={1} /></Controls>
    <MiniPlot x={[-13, -1]} y={[-12, -2]} xTicks={7} yTicks={6} xLabel="log₁₀ ε" yLabel="log₁₀ relative error" label={`Finite-difference error of tanh’s slope at 0.5 against step size; at ε = ${sci(le)} it is ${sci(lr)}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={SWEEP} stroke="var(--chart-train)" />
      <Dots X={X} Y={Y} points={SWEEP} rad={2.5} />
      <Dots X={X} Y={Y} points={[[le, lr]]} color="var(--accent)" rad={6} />
    </>}</MiniPlot>
    <Readout>At ε = {sci(le)} the relative error is about {sci(lr)}. Too large an ε measures curvature (the error falls as ε²); too small an ε loses digits to rounding (it grows as 1/ε). The lowest error in this browser is at ε = {sci(best[0])}.</Readout>
  </div>
}
