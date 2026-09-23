import React, { useMemo, useState } from 'react'
import { incomingBatch, DEFAULT_CONTRACT, validate, driftCheck, trainRun, dataVersion, runId, REFERENCE } from './engine.js'
import { PanelHeading, Choice, Toggle, Controls, Metrics, Insight, Actions, Table, Caption, Warning } from '../../kit/ui.jsx'
import { fmt } from '../../kit/math.js'


export default function Playground() {
  const [view, setView] = useState('contract')
  const [contract, setContract] = useState(DEFAULT_CONTRACT), [policy, setPolicy] = useState('quarantine'), [threshold, setThreshold] = useState(0.1)
  const batch = useMemo(() => incomingBatch(), [])
  const res = useMemo(() => validate(batch, contract), [batch, contract])
  const drift = driftCheck(batch.filter((_, i) => !res.badRows.includes(i)), 'duration_s', REFERENCE.duration_s)
  const badShare = res.badRows.length / batch.length
  const decision = policy === 'reject' ? (res.badRows.length ? 'Reject the whole batch' : 'Accept') : badShare > threshold ? `Reject: ${(100 * badShare).toFixed(0)}% of rows failed (limit ${(100 * threshold).toFixed(0)}%)` : `Accept ${batch.length - res.badRows.length} rows, quarantine ${res.badRows.length}`
  const [registry, setRegistry] = useState([]), [config, setConfig] = useState({ lr: 0.05, steps: 300, features: { logSize: true, interactions: true, busy: true, oneHot: true } }), [tamper, setTamper] = useState(false)
  const clean = useMemo(() => incomingBatch({ problems: false }), [])
  const data = useMemo(() => tamper ? clean.map((r, i) => (i === 5 ? { ...r, duration_s: r.duration_s + 0.1 } : r)) : clean, [clean, tamper])
  const code = 'train.py@3f2a9c1'
  const train = () => { const t = trainRun(data, config), dv = dataVersion(data); setRegistry(r => [...r, { id: runId(dv, config, code), data: dv, cfg: config, config: JSON.stringify({ lr: config.lr, steps: config.steps }), code, ...t }].slice(-6)) }
  const rebuild = run => { const t = trainRun(data, run.cfg); return { ok: dataVersion(data) === run.data && t.weightsHash === run.weightsHash, t } }
  return <>
    <PanelHeading title={view === 'contract' ? 'Stop bad data at the door.' : 'Can you rebuild this exact model?'} pill={view === 'contract' ? `${res.violations.length} violations` : `${registry.length} runs recorded`} />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['contract', 'Data contract for an incoming batch'], ['lineage', 'Lineage and reproducible training']]} /></Controls>
    {view === 'contract' && <>
      <Caption>A new batch of 60 build records arrives from an upstream team. Before it touches training or serving, it is checked against a **data contract** — explicit rules for every column. Toggle rules to see what each one catches.</Caption>
      <Table head={['column', 'rules', 'check on']} rows={Object.entries(contract).map(([col, r]) => [col, [r.type && `type ${r.type}`, r.required && 'required', r.min !== undefined && `min ${r.min}`, r.max !== undefined && `max ${r.max}`, r.allowed && `in {${r.allowed.join(', ')}}`, r.unique && 'unique'].filter(Boolean).join(' · '), <Toggle key={col} label="" checked={r.on} onChange={v => setContract(c => ({ ...c, [col]: { ...c[col], on: v } }))} />])} />
      <Controls>
        <Choice label="Batch policy" value={policy} onChange={setPolicy} options={[['quarantine', 'Quarantine bad rows, reject batch if too many'], ['reject', 'Reject the batch on any violation']]} />
        {policy === 'quarantine' && <Choice label="Maximum bad-row share" value={String(threshold)} onChange={v => setThreshold(Number(v))} options={[['0.05', '5%'], ['0.1', '10%'], ['0.25', '25%'], ['0.5', '50%']]} />}
      </Controls>
      <Metrics items={[['Rows', batch.length], ['Rows failing the contract', res.badRows.length], ['Decision', decision], ['duration_s drift (z-score of mean)', fmt(drift.z, 1)]]} />
      {Math.abs(drift.z) > 3 && <Warning>{`The rows that pass the contract have a mean duration of ${fmt(drift.mean, 1)} s against ${fmt(drift.reference, 1)} s in training. Twelve rows arrived in minutes instead of seconds: every value is positive and plausible, so no row rule fires. Only a distribution check against the training reference catches it.`}</Warning>}
      <Table head={['row', 'job_id', 'column', 'rule broken', 'value']} rows={res.violations.slice(0, 14).map(v => [v.row, batch[v.row].job_id, v.column, v.rule, JSON.stringify(v.value)])} caption={res.violations.length > 14 ? `…and ${res.violations.length - 14} more.` : undefined} />
      <Insight title="Contracts make failures loud and early">Without the contract, a string “37”, an hour of 25 or a missing duration would flow into feature code and either crash it or — worse — silently produce wrong features. Every rule encodes an assumption the model depends on. Turn a rule off and its violations disappear from the report but not from the data.</Insight>
    </>}
    {view === 'lineage' && <>
      <Caption>Every training run is recorded with the fingerprint of its **data**, its **configuration**, and the **code version**. Rebuilding a run means retraining from those three and getting identical weights.</Caption>
      <Controls>
        <Choice label="Learning rate" value={String(config.lr)} onChange={v => setConfig(c => ({ ...c, lr: Number(v) }))} options={['0.01', '0.05', '0.1']} />
        <Choice label="Steps" value={String(config.steps)} onChange={v => setConfig(c => ({ ...c, steps: Number(v) }))} options={['100', '300', '600']} />
        <Toggle label="Someone edits one duration by 0.1 s in the stored data" checked={tamper} onChange={setTamper} />
      </Controls>
      <Actions><button className="ml-primary" onClick={train}>Train and record a run</button></Actions>
      {registry.length > 0 && <Table head={['run id', 'data version', 'config', 'code', 'train MAE', 'weights hash', 'rebuild now']} rows={registry.map(r => { const rb = rebuild(r); return [r.id, r.data, r.config, r.code, fmt(r.mae, 3), r.weightsHash, rb.ok ? '✓ identical' : '✗ cannot reproduce'] })} caption="“Rebuild now” retrains from the stored data using each run’s recorded configuration and code, then compares fingerprints. Changing today’s settings does not matter — the run recorded its own. Editing the stored data does." />}
      <Insight title="Versioning is what makes a model auditable">A model is a function of data, code, configuration and environment. Record all four for every run (the data by content hash, not by filename), store the datasets immutably, and a months-old model can be rebuilt, compared and explained. Edit a stored dataset in place — even by 0.1 seconds — and that guarantee is gone.</Insight>
    </>}
  </>
}
