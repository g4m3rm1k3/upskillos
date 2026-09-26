// Figures placed between the paragraphs of Lab 32 (32.2, 32.3), built on the lab's own engine.
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Radio, Readout, Bars, r } from '../../kit/fig.jsx'
import { recentDays, buildCandidates, evaluateGates, canary, DEFAULT_GATES } from './engine.js'

let cache = null
const setup = () => {
  if (!cache) { const data = { train: recentDays(0, 6), holdout: recentDays(10, 12), golden: recentDays(20, 21).slice(0, 60) }; cache = { data, C: buildCandidates(data.train) } }
  return cache
}
const NAMES = [['retrained', 'retrained'], ['bugged', 'log10 serving bug'], ['bigger', 'extra features'], ['minutes', 'minutes'], ['leaky', 'leaky feature']]

// ---------- 32.2 ----------
export function GateBoard() {
  const [cand, setCand] = useState('retrained'), [latency, setLatency] = useState(25)
  const { data, C } = setup()
  const g = useMemo(() => evaluateGates(cand, C, data.holdout, data.golden, { ...DEFAULT_GATES, latencyBudget: latency }), [cand, latency, C, data])
  return <div>
    <Controls>
      <Radio name="cand32" value={cand} onChange={setCand} options={NAMES} />
      <Slider label="latency budget (ms)" value={latency} min={10} max={40} step={1} onChange={setLatency} digits={0} />
    </Controls>
    <table className="ml-fig-table">
      <caption>{C[cand].label}: holdout MAE {r(g.candMAE, 2)} s against production {r(g.prodMAE, 2)} s</caption>
      <thead><tr><th scope="col">Gate</th><th scope="col">Result</th><th scope="col">Evidence</th></tr></thead>
      <tbody>{g.results.map(x => <tr key={x.gate}><th scope="row" style={{ textAlign: 'left' }}>{x.gate}</th><td>{x.pass ? 'passes' : 'FAILS'}</td><td style={{ textAlign: 'left' }}>{x.detail}</td></tr>)}</tbody>
    </table>
    <Readout>{g.promote ? `Every gate passes: ${NAMES.find(n => n[0] === cand)[1]} may go to a canary.${latency > 25 && cand === 'bigger' ? ' It passes only because the latency budget was raised — a product decision someone must approve and record.' : ''}` : `Blocked by ${g.results.filter(x => !x.pass).length} gate${g.results.filter(x => !x.pass).length > 1 ? 's' : ''}: ${g.results.filter(x => !x.pass).map(x => x.gate.split(':')[0].toLowerCase()).join('; ')}.`}</Readout>
  </div>
}

// ---------- 32.3 ----------
export function CanaryTimeline() {
  const [cand, setCand] = useState('bugged'), [tol, setTol] = useState(0.1)
  const { C } = setup()
  const log = useMemo(() => canary(cand, C, { tol }), [cand, tol, C])
  const last = log[log.length - 1], exposed = Math.max(...log.map(d => d.share))
  return <div>
    <Controls>
      <Radio name="canary32" value={cand} onChange={setCand} options={NAMES.filter(n => n[0] !== 'leaky')} />
      <Slider label="tolerance τ" value={tol} min={0} max={0.3} step={0.01} onChange={setTol} digits={2} />
    </Controls>
    <Bars items={log.map(d => ({ label: `day ${d.day} · ${Math.round(d.share * 100)}%`, value: Math.min(d.canary / d.control, 5), highlight: d.canary > d.control * (1 + tol) }))} max={Math.max(1.5, ...log.map(d => Math.min(d.canary / d.control, 5)))} digits={2} label={`Canary MAE divided by control MAE each day for ${cand}: ${log.map(d => `day ${d.day} ${r(d.canary / d.control, 2)}`).join(', ')}`} />
    <Readout>Bars above {r(1 + tol, 2)} are bad days (highlighted); two in a row roll back. {last.rolledBack ? `Rolled back at the end of day ${last.day}: at most ${Math.round(exposed * 100)}% of traffic ever used this model.` : 'The rollout completed: the candidate now serves all traffic.'} Day 3’s canary has only {log[2]?.nCanary ?? '—'} jobs, so its ratio is noisy.</Readout>
  </div>
}
