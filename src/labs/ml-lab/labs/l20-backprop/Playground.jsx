import React, { useMemo, useState } from 'react'
import { PRESETS, evaluate, numericGrad, layout } from './engine.js'
import { PanelHeading, Choice, Controls, Metrics, Insight, Actions, Table } from '../../kit/ui.jsx'
import { fmt } from '../../kit/math.js'

function Graph({ order, revealed, current }) {
  const { depth, cols, maxDepth } = layout(order)
  const W = 560, colW = (W - 40) / Math.max(1, maxDepth), rowH = 74, rows = Math.max(...[...cols.values()].map(c => c.length))
  const H = rows * rowH + 20, pos = new Map()
  cols.forEach((vs, d) => vs.forEach((v, i) => pos.set(v, [20 + d * colW + (maxDepth === 0 ? W / 2 : 0), 10 + (i + 0.5) * (H - 20) / vs.length])))
  const nodeW = Math.min(104, colW - 14)
  return <svg viewBox={`0 0 ${W + 90} ${H}`} role="img" aria-label="Computation graph with values and gradients">
    {order.map(v => v.parents.map((p, j) => { const [x1, y1] = pos.get(p), [x2, y2] = pos.get(v); return <line key={`${v.id}-${j}-${p.id}`} x1={x1 + nodeW} y1={y1} x2={x2} y2={y2} stroke={revealed.has(v) ? 'var(--accent)' : 'var(--border)'} strokeWidth={revealed.has(v) ? 2 : 1.3} /> }))}
    {order.map(v => { const [x, y] = pos.get(v), on = revealed.has(v), cur = v === current; return <g key={v.id}>
      <rect x={x} y={y - 26} width={nodeW} height={52} rx="8" fill="var(--surface)" stroke={cur ? 'var(--chart-val)' : on ? 'var(--accent)' : 'var(--border)'} strokeWidth={cur ? 3 : 1.5} />
      <text x={x + nodeW / 2} y={y - 11} textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 11, fontWeight: 600 }}>{v.label || v.op}{v.op && v.op !== 'input' && v.op !== 'const' && v.label ? `  (${v.op})` : ''}</text>
      <text x={x + nodeW / 2} y={y + 5} textAnchor="middle" style={{ fontSize: 10 }}>value {fmt(v.data, 4)}</text>
      <text x={x + nodeW / 2} y={y + 19} textAnchor="middle" style={{ fontSize: 10, fill: on ? 'var(--chart-val)' : 'var(--muted)' }}>{on ? `grad ${fmt(v.grad, 4)}` : 'grad ?'}</text>
    </g> })}
  </svg>
}

export default function Playground() {
  const [preset, setPreset] = useState('chain'), [inputs, setInputs] = useState(PRESETS.chain.inputs), [steps, setSteps] = useState(0)
  const { out, leaves, order } = useMemo(() => evaluate(preset, inputs), [preset, inputs])
  const reverse = [...order].reverse(), revealed = new Set(reverse.slice(0, steps)), current = reverse[steps - 1]
  const pick = k => { setPreset(k); setInputs(PRESETS[k].inputs); setSteps(0) }
  const localRule = v => {
    if (!v || !v.parents.length) return v ? `${v.label || v.op} is a leaf: its gradient is complete once every node that uses it has passed its share back.` : ''
    const [a, b] = v.parents, name = x => x.label || fmt(x.data, 3)
    const rules = { '+': `+ passes its gradient ${fmt(v.grad, 3)} unchanged to both inputs (∂(a+b)/∂a = 1).`, '×': `× sends grad × the other input: ${name(a)} gets ${fmt(v.grad, 3)} × ${fmt(b.data, 3)}, ${name(b)} gets ${fmt(v.grad, 3)} × ${fmt(a.data, 3)}.`, tanh: `tanh sends grad × (1 − y²) = ${fmt(v.grad, 3)} × ${fmt(1 - v.data ** 2, 4)}.`, relu: 'relu passes the gradient if its input was positive, otherwise 0.', exp: 'exp sends grad × e^x (its own value).' }
    return rules[v.op] ?? (v.op.startsWith('^') ? `x^k sends grad × k·x^(k−1) = ${fmt(v.grad, 3)} × ${fmt(Number(v.op.slice(1)) * a.data ** (Number(v.op.slice(1)) - 1), 4)}.` : '')
  }
  return <>
    <PanelHeading title="Values flow forward. Gradients flow back." pill={`${PRESETS[preset].label}`} />
    <Controls>
      <Choice label="Expression" value={preset} onChange={pick} options={Object.entries(PRESETS).map(([k, p]) => [k, p.label])} />
      <div>{Object.entries(inputs).map(([k, v]) => <label key={k} style={{ display: 'inline-flex', flexDirection: 'column', width: 70, marginRight: 6, fontSize: 11, color: 'var(--muted)' }}>{k}<input type="number" step="0.1" value={v} onChange={e => { if (e.target.value !== '' && Number.isFinite(+e.target.value)) { setInputs(x => ({ ...x, [k]: +e.target.value })); setSteps(0) } }} /></label>)}</div>
    </Controls>
    <Graph order={order} revealed={revealed} current={current} />
    <Actions>
      <button className="ml-primary" disabled={steps >= order.length} onClick={() => setSteps(s => s + 1)}>{steps === 0 ? 'Start backward: set ∂L/∂L = 1' : steps >= order.length ? 'Backward pass complete' : `Backward step ${steps + 1} of ${order.length}`}</button>
      <button onClick={() => setSteps(order.length)}>Run the whole backward pass</button><button onClick={() => setSteps(0)}>Reset gradients</button>
    </Actions>
    <p className="ml-caption" role="status">{current ? `Now at “${current.label || current.op}”: ${localRule(current)}` : 'The forward pass has computed every value. Press the button to propagate gradients from the output back to the inputs.'}</p>
    <Metrics items={[['Output value', fmt(out.data, 5)], ['Nodes', order.length], ['Backward steps done', `${steps} / ${order.length}`]]} />
    <Table head={['input', 'value', 'backprop gradient', 'finite difference', 'match']} rows={Object.entries(leaves).map(([k, v]) => { const n = numericGrad(preset, inputs, k); return [k, fmt(v.data, 4), fmt(v.grad, 6), fmt(n, 6), Math.abs(n - v.grad) < 1e-4 * Math.max(1, Math.abs(n)) ? '✓' : '✗'] })} caption="Finite differences rebuild and rerun the whole graph twice per input: (f(x+ε) − f(x−ε)) / 2ε. Backpropagation gets every gradient from one backward pass." />
    <Insight title="What to notice">In “f = x·y + x”, x feeds two nodes, so it receives two gradient contributions — y from the product and 1 from the sum — and they **add**: ∂f/∂x = y + 1. That accumulation (`grad +=`, never `=`) is the single most common bug in hand-written backprop. In the neuron, set the inputs so the sum is large: tanh saturates, 1 − y² approaches 0, and every gradient upstream nearly vanishes.</Insight>
  </>
}
