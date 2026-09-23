import React, { useMemo, useState } from 'react'
import { simulate, LOOP } from './engine.js'
import { Plot, Path } from '../../kit/Plot.jsx'
import { PanelHeading, Metrics, Insight, Legend, Table } from '../../kit/ui.jsx'
import { fmt } from '../../kit/math.js'

const MAP = [
  ['np.array(x)', 'torch.tensor(x)', 'same n-dimensional array idea; lives on a device (CPU/GPU)'],
  ['X @ W + b', 'X @ W + b  or  nn.Linear', 'identical operators and broadcasting rules'],
  ['hand-written backward()', 'loss.backward()', 'autograd records the graph and applies Lab 20’s rules'],
  ['w -= lr * dw', 'opt.step()', 'optimizers from Lab 22, with state'],
  ['dw = 0 each step', 'opt.zero_grad()', 'gradients accumulate unless cleared'],
  ['your own batching loop', 'DataLoader(dataset, batch_size, shuffle=True)', 'shuffling, batching, parallel loading'],
  ['np.save(params)', 'torch.save(model.state_dict())', 'parameters (and optimizer state) as a dict of tensors'],
  ['—', 'x.to("cuda"), model.to("cuda")', 'data and model must live on the same device'],
]

export default function Playground() {
  const [flags, setFlags] = useState({ zeroGrad: true, evalMode: true, noGrad: true, saveOptimizer: true })
  const { log, reference, drift } = useMemo(() => simulate(flags), [flags])
  const top = Math.min(40, Math.max(2, ...log.map(l => Math.max(l.train, l.val)).filter(Number.isFinite)))
  const allOn = Object.values(flags).every(Boolean)
  const diagnosis = !flags.zeroGrad ? 'Gradients accumulate across steps: each update uses the sum of every gradient so far, so the effective step keeps growing until training oscillates or diverges.'
    : !flags.evalMode ? 'Dropout is still active during validation: every evaluation randomly zeroes inputs, so the validation loss is noisy and pessimistic — you would pick the wrong checkpoint.'
      : !flags.noGrad ? 'Evaluation builds autograd graphs that are kept alive: the numbers are right, but memory grows with every evaluation (see the retained-nodes count) until the process runs out.'
        : !flags.saveOptimizer ? 'The checkpoint at step 40 kept the weights but not the momentum buffers. The restarted run silently follows a different path from the uninterrupted one — see the parameter drift. Here the loss barely changes; with Adam, learning-rate schedules or long runs, lost state can cost accuracy and always costs reproducibility.'
          : 'Every line is present: training matches the reference run exactly.'
  return <>
    <PanelHeading title="The training loop, one line at a time." pill={allOn ? 'correct loop' : 'a line is missing'} />
    <p className="ml-caption">A real PyTorch loop for a small model with dropout and momentum SGD. Untick a line to remove it — the simulation below runs the same computation with that mistake.</p>
    <div className="ml-mono" style={{ lineHeight: 1.9 }}>
      {LOOP.map(l => <div key={l.key} title={l.note} style={{ opacity: l.toggle && !flags[l.key] ? 0.35 : 1, textDecoration: l.toggle && !flags[l.key] ? 'line-through' : 'none' }}>
        {l.toggle ? <label style={{ cursor: 'pointer' }}><input type="checkbox" checked={flags[l.key]} onChange={e => setFlags(f => ({ ...f, [l.key]: e.target.checked }))} /> {l.code}</label> : <span style={{ paddingLeft: 22 }}>{l.code}</span>}
      </div>)}
    </div>
    <Legend items={[['━', 'training loss', 'var(--chart-train)'], ['━', 'validation loss as measured', 'var(--chart-val)'], ['┅', 'reference: the correct loop', 'var(--muted)']]} />
    <Plot x={[0, 80]} y={[0, top]} xLabel="step" yLabel="MSE (clipped)" label="Loss curves with and without each line">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={reference.map(l => [l.t, Math.min(top, l.val)])} stroke="var(--muted)" dash="5 4" width={1.5} />
      <Path X={X} Y={Y} points={log.map(l => [l.t, Math.min(top, l.train)])} stroke="var(--chart-train)" />
      <Path X={X} Y={Y} points={log.map(l => [l.t, Math.min(top, l.val)])} stroke="var(--chart-val)" />
      {!flags.saveOptimizer && <Path X={X} Y={Y} points={[[40, 0], [40, top]]} stroke="var(--text)" width={1} dash="2 3" />}
    </>}</Plot>
    <Metrics items={[['Final training MSE', fmt(log.at(-1).train, 3)], ['Final validation MSE (measured)', fmt(log.at(-1).val, 3)], ['Reference validation MSE', fmt(reference.at(-1).val, 3)], ['Retained graph nodes', log.at(-1).retained.toLocaleString()], ['Max parameter drift from the correct loop', fmt(Math.min(drift, 1e6), 4)]]} />
    <Insight title="What went wrong">{diagnosis}</Insight>
    <Table head={['NumPy (what you built)', 'PyTorch', 'what it does for you']} rows={MAP} caption="A framework does not change the mathematics of Labs 20–22. It automates the gradient bookkeeping, runs it on accelerators, and packages the conventions — and each convention is a line you can forget." />
  </>
}
