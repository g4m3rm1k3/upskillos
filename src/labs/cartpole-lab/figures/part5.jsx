import { useState } from 'react'
import { fmt } from './Cart.jsx'
import { Slider } from '../../qmaze-lab/figures/ui.jsx'

// A2C's targets for one world over 5 steps, worked out backwards exactly as train_a2c does:
// R = r_t + γ · (end_value_t if the game ended at t, else R). Choose where a game ends and how.
export function NStepFig() {
  const [gamma, setGamma] = useState(0.99)
  const [values, setValues] = useState([40, 42, 41, 39, 38])
  const [last, setLast] = useState(37)
  const [end, setEnd] = useState({ at: -1, kind: 'terminated', value: 45 })
  const ended = values.map((_, t) => t === end.at)
  const endValues = values.map((_, t) => t === end.at && end.kind === 'truncated' ? end.value : 0)
  const rows = []
  let R = last
  for (let t = 4; t >= 0; t--) {
    const future = ended[t] ? endValues[t] : R
    const newR = 1 + gamma * future
    rows.unshift({ t, future, R: newR, from: ended[t] ? (end.kind === 'terminated' ? 'game lost here: 0' : `cut off here: V(final) = ${fmt(end.value, 2)}`) : t === 4 ? `V(s₅) = ${fmt(last, 2)} (bootstrap)` : `R from step ${t + 1}` })
    R = newR
  }
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <Slider label="γ" value={gamma} min={0.5} max={1} step={0.01} onChange={setGamma} />
      <label>A game ends at step <select value={end.at} onChange={e => setEnd(o => ({ ...o, at: Number(e.target.value) }))}><option value={-1}>none</option>{[0, 1, 2, 3, 4].map(t => <option key={t} value={t}>{t}</option>)}</select></label>
      <label>by <select value={end.kind} onChange={e => setEnd(o => ({ ...o, kind: e.target.value }))}><option>terminated</option><option>truncated</option></select></label>
      <label>V(s₅) = <input type="number" value={last} onChange={e => setLast(Number(e.target.value))} style={{ width: 60 }} /></label>
    </div>
    <table className="qm-log"><thead><tr><th>step t</th><th>reward</th><th>ended?</th><th>future used</th><th>R = r + γ · future</th><th>V(s_t), critic</th><th>advantage R − V</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.t}><td>{r.t}</td><td>1</td><td>{ended[r.t] ? end.kind : ''}</td><td className="mono" style={{ textAlign: 'left' }}>{fmt(r.future, 3)} <small>({r.from})</small></td><td className="mono"><b>{fmt(r.R, 3)}</b></td>
        <td><input type="number" value={values[r.t]} onChange={e => setValues(vs => vs.map((x, k) => k === r.t ? Number(e.target.value) : x))} style={{ width: 56 }} /></td><td className="mono"><b>{fmt(r.R - values[r.t], 3)}</b></td></tr>)}</tbody></table>
    <p className="qm-hint">Worked from the bottom up, as <span className="mono">for t in reversed(range(n_steps))</span> does. A positive advantage means the 5 steps went better than the critic expected, so the actor makes that push likelier.</p>
  </div>
}

// The shapes of one A2C update: 8 worlds × 5 steps, and what each tensor holds.
export function BatchShapes() {
  const [hover, setHover] = useState(null)
  const cells = []
  for (let t = 0; t < 5; t++) for (let i = 0; i < 8; i++) cells.push(<rect key={`${t}-${i}`} x={60 + i * 34} y={20 + t * 28} width="30" height="24" rx="3" fill={hover && (hover.t === t || hover.i === i) ? '#f2b45a' : '#f1eadc'} stroke="#d9ceb9" onMouseEnter={() => setHover({ t, i })} onMouseLeave={() => setHover(null)} />)
  return <div className="qm-fig">
    <svg viewBox="0 0 420 175" className="qm-plot" role="img" aria-label="A batch of 5 steps by 8 worlds">
      {Array.from({ length: 8 }, (_, i) => <text key={i} x={75 + i * 34} y="14" textAnchor="middle" className="qm-tick">world {i}</text>)}
      {Array.from({ length: 5 }, (_, t) => <text key={t} x="52" y={36 + t * 28} textAnchor="end" className="qm-tick">step {t}</text>)}
      {cells}
    </svg>
    <table className="qm-log qm-left"><tbody>
      <tr><td className="mono">net(torch.tensor(states))</td><td>states (8, 4) → logits (8, 2), values (8,)</td><td>one row of the grid at a time</td></tr>
      <tr><td className="mono">torch.stack(log_probs)</td><td>(5, 8)</td><td>log π(a|s) for every cell</td></tr>
      <tr><td className="mono">torch.stack(values)</td><td>(5, 8)</td><td>V(s) for every cell, still connected to the weights</td></tr>
      <tr><td className="mono">returns</td><td>(5, 8)</td><td>R for every cell, worked out backwards down each column</td></tr>
      <tr><td className="mono">advantages = returns − values</td><td>(5, 8)</td><td>40 advantages, averaged into one loss</td></tr>
    </tbody></table>
    <p className="qm-hint">{hover ? `Cell: world ${hover.i}, step ${hover.t}. Its return uses the cells below it in the same column (later steps of the same world).` : 'Hover a cell. One update learns from all 40 moves at once.'}</p>
  </div>
}
