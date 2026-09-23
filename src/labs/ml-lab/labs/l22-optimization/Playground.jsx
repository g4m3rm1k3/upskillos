import React, { useMemo, useState } from 'react'
import { SURFACES, OPTIMIZERS, run, loss, minibatch, SCENARIOS, runScenario } from './engine.js'
import { Plot, Path, Contour } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Legend, Actions } from '../../kit/ui.jsx'
import { fmt } from '../../kit/math.js'

const LRS = [0.001, 0.003, 0.01, 0.02, 0.035, 0.05, 0.1, 0.2, 0.3]

export default function Playground() {
  const [view, setView] = useState('race')
  const [surface, setSurface] = useState('valley'), [li, setLi] = useState(4), [steps, setSteps] = useState(120), [noise, setNoise] = useState(0), [kappa, setKappa] = useState(25)
  const [enabled, setEnabled] = useState({ sgd: true, momentum: true, rmsprop: false, adam: true })
  const [batch, setBatch] = useState(8), [mbLr, setMbLr] = useState(0.05), [schedule, setSchedule] = useState('constant')
  const [scenario, setScenario] = useState('healthy'), [revealed, setRevealed] = useState(false)
  const S = SURFACES[surface], lr = LRS[li]
  const runs = useMemo(() => view === 'race' ? Object.keys(OPTIMIZERS).filter(k => enabled[k]).map(k => ({ k, ...run(surface, k, { lr, steps, noise, kappa }) })) : [], [view, surface, lr, steps, noise, kappa, enabled])
  const mbs = useMemo(() => view === 'batch' ? [1, batch, 256].filter((v, i, a) => a.indexOf(v) === i).map(bs => ({ bs, ...minibatch({ batch: bs, lr: mbLr, schedule, epochs: 12 }) })) : [], [view, batch, mbLr, schedule])
  const curve = useMemo(() => view === 'diagnose' ? runScenario(scenario) : [], [view, scenario])
  const clampLog = v => Math.log10(Math.max(1e-6, Math.min(1e6, v)))
  return <>
    <PanelHeading title={{ race: 'Same gradients, different journeys.', batch: 'Noisy steps, fewer passes.', diagnose: 'Read the loss curve like a clinician.' }[view]} pill={view === 'race' ? `α = ${lr}` : view === 'batch' ? `batch ${batch}` : `case ${SCENARIOS[scenario].label}`} />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['race', 'Optimizer race on a loss surface'], ['batch', 'Mini-batches & schedules'], ['diagnose', 'Diagnose a training failure']]} /></Controls>
    {view === 'race' && <>
      <Controls>
        <Choice label="Loss surface" value={surface} onChange={setSurface} options={Object.entries(SURFACES).map(([k, v]) => [k, v.label])} />
        <Slider label="Learning rate α" value={li} min={0} max={LRS.length - 1} onChange={setLi} format={i => LRS[i]} />
        <Slider label="Steps" value={steps} min={10} max={400} step={10} onChange={setSteps} />
        <Slider label="Gradient noise (stochastic gradients)" value={noise} min={0} max={5} step={0.25} onChange={setNoise} format={v => v.toFixed(2)} />
        {surface === 'valley' && <Slider label="Valley steepness ratio κ" value={kappa} min={1} max={100} onChange={setKappa} />}
        <div className="ml-toggles">{Object.entries(OPTIMIZERS).map(([k, o]) => <Toggle key={k} label={o.label} checked={enabled[k]} onChange={v => setEnabled(e => ({ ...e, [k]: v }))} />)}</div>
      </Controls>
      <Legend items={Object.entries(OPTIMIZERS).filter(([k]) => enabled[k]).map(([k, o]) => ['━', o.label, o.color])} />
      <Plot x={S.range[0]} y={S.range[1]} xLabel="parameter 1" yLabel="parameter 2" label="Optimizer trajectories on loss contours">{({ X, Y, x0, x1, y0, y1 }) => <>
        {[0.01, 0.05, 0.2, 0.5, 1, 2, 4, 8, 16, 32].map(l => <Contour key={l} X={X} Y={Y} x0={x0} x1={x1} y0={y0} y1={y1} f={(a, b) => loss(surface, [a, b], kappa)} level={l} stroke="var(--border)" width={1} cells={60} />)}
        {runs.map(r => <g key={r.k}><Path X={X} Y={Y} points={r.path} stroke={OPTIMIZERS[r.k].color} width={2} /><circle cx={X(r.path.at(-1)[0])} cy={Y(r.path.at(-1)[1])} r="4" fill={OPTIMIZERS[r.k].color} /></g>)}
        <circle cx={X(S.start[0])} cy={Y(S.start[1])} r="5" fill="none" stroke="var(--text)" strokeWidth="2" />
      </>}</Plot>
      <Plot x={[0, steps]} y={[-6, Math.max(1, ...runs.map(r => clampLog(loss(surface, r.path[0], kappa)))) + 0.3]} height={190} xLabel="step" yLabel="loss (log₁₀)" label="Loss by step" yFormat={v => (10 ** v).toPrecision(1)}>{({ X, Y }) => runs.map(r => <Path key={r.k} X={X} Y={Y} points={r.path.map((p, i) => [i, clampLog(loss(surface, p, kappa))])} stroke={OPTIMIZERS[r.k].color} width={2} />)}</Plot>
      <Metrics items={runs.map(r => [OPTIMIZERS[r.k].label.split(' (')[0], r.diverged ? 'diverged' : fmt(loss(surface, r.path.at(-1), kappa), 5)])} />
      <Insight title="What the paths show">In the elongated valley, plain gradient descent zig-zags across the steep direction and crawls along the flat one; its learning rate is capped by the steep direction (Lab 03). Momentum accumulates velocity along the consistent direction and damps the zig-zag. RMSProp and Adam divide each coordinate by its recent gradient size, so steep and flat directions get similar step sizes. Add gradient noise to see stochastic training — Adam and momentum average it out.</Insight>
    </>}
    {view === 'batch' && <>
      <Controls>
        <Slider label="Mini-batch size" value={batch} min={1} max={128} onChange={setBatch} />
        <Choice label="Learning rate" value={String(mbLr)} onChange={v => setMbLr(Number(v))} options={['0.005', '0.02', '0.05', '0.1', '0.2']} />
        <Choice label="Schedule" value={schedule} onChange={setSchedule} options={[['constant', 'Constant'], ['step', 'Step: ÷10 halfway'], ['cosine', 'Cosine decay to 0']]} />
      </Controls>
      <Legend items={[['━', 'batch 1 (pure SGD)', 'var(--chart-val)'], ['━', `batch ${batch}`, 'var(--accent)'], ['━', 'full batch (256)', 'var(--chart-train)']]} />
      <Plot x={[0, 12]} y={[-0.6, 1.2]} xLabel="epochs (passes over the data)" yLabel="full-data MSE (log₁₀)" label="Loss against epochs for different batch sizes" yFormat={v => (10 ** v).toPrecision(2)}>{({ X, Y }) => mbs.map(m => <Path key={m.bs} X={X} Y={Y} points={m.curve.filter((_, i) => i % Math.max(1, Math.floor(m.curve.length / 400)) === 0).map(([e, l]) => [e, Math.log10(Math.max(l, 1e-3))])} stroke={m.bs === 1 ? 'var(--chart-val)' : m.bs === 256 ? 'var(--chart-train)' : 'var(--accent)'} width={1.5} />)}</Plot>
      <Metrics items={mbs.map(m => [`batch ${m.bs}: updates · final MSE`, `${m.updates} · ${fmt(m.final, 3)}`])} />
      <Insight title="The mini-batch trade-off">Each epoch sees every example once. Batch 1 makes 256 noisy updates per epoch and races ahead early but never settles — the noise floor comes from the gradient noise. Full batch makes one precise update per epoch and is slow. Mini-batches sit between and use hardware efficiently. A decaying schedule (step or cosine) shrinks the steps late in training, removing the noise floor. The irreducible noise σ² here is 0.36.</Insight>
    </>}
    {view === 'diagnose' && <>
      <Controls><Choice label="Training run" value={scenario} onChange={v => { setScenario(v); setRevealed(false) }} options={Object.entries(SCENARIOS).map(([k, s]) => [k, `Case ${s.label}`])} /></Controls>
      <Legend items={[['━', 'training loss', 'var(--chart-train)'], ['┅', 'validation loss', 'var(--chart-val)']]} />
      <Plot x={[0, curve.at(-1)?.[0] ?? 1]} y={[0, Math.min(3, Math.max(1, ...curve.flatMap(c => [c[1], c[2]]).filter(Number.isFinite)) * 1.05)]} height={260} xLabel="step" yLabel="cross-entropy (clipped at 3)" label="Loss curves of a training run">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={curve.map(c => [c[0], Math.min(3, c[1])])} stroke="var(--chart-train)" />
        <Path X={X} Y={Y} points={curve.map(c => [c[0], Math.min(3, c[2])])} stroke="var(--chart-val)" dash="5 3" />
        <Path X={X} Y={Y} points={[[0, Math.LN2], [curve.at(-1)?.[0] ?? 1, Math.LN2]]} stroke="var(--muted)" width={1} dash="2 4" />
      </>}</Plot>
      <p className="ml-caption">Dotted line: log 2 ≈ 0.693, the loss of a model that always says 50/50. First decide: is this a code bug, an optimization problem, or a generalization problem?</p>
      <Actions><button className="ml-primary" onClick={() => setRevealed(true)}>Reveal the cause</button></Actions>
      {revealed && <Insight title={SCENARIOS[scenario].truth}>{SCENARIOS[scenario].cause}</Insight>}
    </>}
  </>
}
