// Figures placed between the paragraphs of Lab 28 (28.2, 28.3), built on the lab's own engine.
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Check, Radio, Readout, r } from '../../kit/fig.jsx'
import { incomingBatch, DEFAULT_CONTRACT, validate, REFERENCE } from './engine.js'
import { generateJobs } from '../l16-capstone/engine.js'

const BATCH = incomingBatch()

// ---------- 28.2 ----------
export function ContractBoard() {
  const [on, setOn] = useState(Object.fromEntries(Object.keys(DEFAULT_CONTRACT).map(k => [k, true])))
  const [policy, setPolicy] = useState('quarantine'), [limit, setLimit] = useState(0.25)
  const contract = Object.fromEntries(Object.entries(DEFAULT_CONTRACT).map(([k, v]) => [k, { ...v, on: on[k] }]))
  const { violations, badRows } = validate(BATCH, contract)
  const share = badRows.length / BATCH.length
  const decision = policy === 'reject' ? (badRows.length ? 'reject the whole batch' : `accept all ${BATCH.length} rows`) : share > limit ? `reject: ${(100 * share).toFixed(0)}% of rows failed (limit ${(100 * limit).toFixed(0)}%)` : `accept ${BATCH.length - badRows.length} rows, quarantine ${badRows.length}`
  return <div>
    <Controls>
      {Object.keys(DEFAULT_CONTRACT).map(k => <Check key={k} label={k} checked={on[k]} onChange={v => setOn(o => ({ ...o, [k]: v }))} />)}
    </Controls>
    <Controls>
      <Radio name="policy28" value={policy} onChange={setPolicy} options={[['reject', 'reject on any violation'], ['quarantine', 'quarantine bad rows']]} />
      {policy === 'quarantine' && <Slider label="bad-row limit" value={limit} min={0.05} max={0.5} step={0.05} onChange={setLimit} digits={2} />}
    </Controls>
    <table className="ml-fig-table">
      <caption>{violations.length} violation{violations.length === 1 ? '' : 's'} in {badRows.length} of {BATCH.length} rows</caption>
      <thead><tr><th scope="col">Row</th><th scope="col">Column</th><th scope="col">Rule broken</th><th scope="col">Value</th></tr></thead>
      <tbody>{violations.map((v, i) => <tr key={i}><td>{v.row}</td><td style={{ textAlign: 'left' }}>{v.column}</td><td style={{ textAlign: 'left' }}>{v.rule}</td><td>{JSON.stringify(v.value)}</td></tr>)}</tbody>
    </table>
    <Readout>Decision: {decision}. The twelve durations in minutes break no rule, whichever rules are on — 28.3 needs a batch-level check for them.</Readout>
  </div>
}

// ---------- 28.3 ----------
// Rows that pass the contract, with k of them converted to minutes; the training reference is the engine's.
const CLEAN = (() => { const { badRows } = validate(incomingBatch({ problems: false }), DEFAULT_CONTRACT); return incomingBatch({ problems: false }).filter((_, i) => !badRows.includes(i)).map(row => row.duration_s) })()
const TRAIN = generateJobs(600, 16).map(j => j.duration).sort((a, b) => a - b)
const Q01 = TRAIN[Math.floor(0.01 * TRAIN.length)]
export function UnitDrift() {
  const [k, setK] = useState(12)
  const x = useMemo(() => CLEAN.map((v, i) => (i >= CLEAN.length - k ? v / 60 : v)), [k])
  const m = x.reduce((a, b) => a + b, 0) / x.length, { mean: mu, sd } = REFERENCE.duration_s
  const z = (m - mu) / (sd / Math.sqrt(x.length))
  const share = x.filter(v => v < Q01).length / x.length, zq = (share - 0.01) / Math.sqrt((0.01 * 0.99) / x.length)
  return <div>
    <Controls><Slider label="rows arriving in minutes" value={k} min={0} max={30} step={1} onChange={setK} digits={0} /></Controls>
    <table className="ml-fig-table">
      <caption>{x.length} rows that pass every row rule, {k} of them in minutes</caption>
      <thead><tr><th scope="col">Check</th><th scope="col">Batch</th><th scope="col">Training</th><th scope="col">z</th><th scope="col">Flag (|z| &gt; 3)</th></tr></thead>
      <tbody>
        <tr><th scope="row" style={{ textAlign: 'left' }}>mean duration</th><td>{r(m, 1)} s</td><td>{r(mu, 1)} s</td><td>{r(z, 2)}</td><td>{Math.abs(z) > 3 ? 'yes' : 'no'}</td></tr>
        <tr><th scope="row" style={{ textAlign: 'left' }}>share below {r(Q01, 1)} s</th><td>{r(100 * share, 1)}%</td><td>1%</td><td>{r(zq, 1)}</td><td>{Math.abs(zq) > 3 ? 'yes' : 'no'}</td></tr>
      </tbody>
    </table>
    <Readout>The mean test needs many converted rows before it notices: durations vary so much that the batch mean is noisy. The quantile test notices a handful, because minute-sized values fall far below anything seen in training.</Readout>
  </div>
}
