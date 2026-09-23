import React, { useEffect, useMemo, useState } from 'react'
import { parseTable, compare, SECTIONS, readiness, exportPlan } from './engine.js'
import { PanelHeading, Choice, Toggle, Controls, Metrics, Insight, Actions, Table, Caption, Warning } from '../../kit/ui.jsx'
import { fmt, pct } from '../../kit/math.js'

const KEY = 'upskillos.ml-lab.capstone.v1'
const SAMPLE = `size_mb,files,cache_hit,shared_runner,duration_s
42,15,1,0,38
120,41,0,1,215
18,6,1,1,31
75,22,0,0,94
33,12,0,1,82
240,80,1,1,112
55,20,1,0,41
9,3,0,0,29
150,49,0,0,160
64,18,1,1,58
28,9,0,1,70
97,30,1,0,52
310,95,0,1,520
47,17,0,0,66
12,5,1,1,26
188,60,1,0,79
71,25,0,1,150
36,14,1,0,33
130,44,0,0,140
22,8,0,1,61`

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }

export default function Playground() {
  const [view, setView] = useState('plan')
  const [state, setState] = useState(load)
  const plan = state.plan ?? {}, title = state.title ?? ''
  const [section, setSection] = useState('frame')
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage unavailable */ } }, [state])
  const setField = (k, v) => setState(s => ({ ...s, plan: { ...(s.plan ?? {}), [k]: v } }))
  const ready = readiness(plan)
  const [csv, setCsv] = useState(SAMPLE), [target, setTarget] = useState('duration_s'), [feats, setFeats] = useState(['size_mb', 'files', 'cache_hit', 'shared_runner']), [ordered, setOrdered] = useState(false)
  const table = useMemo(() => { try { return { ...parseTable(csv), error: '' } } catch (e) { return { error: e.message, numeric: [], rows: [], header: [] } } }, [csv])
  const result = useMemo(() => { if (table.error) return null; try { return compare(table.rows, target, feats.filter(f => f !== target && table.numeric.includes(f)), { ordered }) } catch (e) { return { error: e.message } } }, [table, target, feats, ordered])
  const download = (name, body) => { const url = URL.createObjectURL(new Blob([body], { type: 'text/markdown' })), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
  const current = SECTIONS.find(s => s[0] === section)
  return <>
    <PanelHeading title={view === 'plan' ? 'Plan one useful ML product, end to end.' : 'Does a model beat the baseline on your data?'} pill={view === 'plan' ? `readiness ${pct(ready.score)}` : result && !result.error ? `${result.n} rows` : 'paste data'} />
    <Controls><Choice label="Workspace" value={view} onChange={setView} options={[['plan', 'Project workbench'], ['data', 'Try it on your own data']]} /></Controls>
    {view === 'plan' && <>
      <Caption>Write each part of your project in your own words. Everything saves on this device. Each item points to the lab where you practised it; an item counts as drafted once it has at least a sentence.</Caption>
      <label className="ml-reflection">Project title<input value={title} onChange={e => setState(s => ({ ...s, title: e.target.value }))} placeholder="e.g. Estimated wait time for CI builds" /></label>
      <Controls><Choice label="Section" value={section} onChange={setSection} options={SECTIONS.map(([k, name]) => [k, name])} /></Controls>
      {current[2].map(([key, label, lab]) => <label key={key} className="ml-reflection">{label} <small>({lab})</small><textarea value={plan[key] ?? ''} onChange={e => setField(key, e.target.value)} style={{ minHeight: 70 }} /></label>)}
      <Table head={['item', 'practised in', 'status']} rows={ready.items.map(i => [i.label, i.lab, i.done ? '✓ drafted' : '—'])} />
      <Metrics items={[['Items drafted', `${ready.items.filter(i => i.done).length} / ${ready.items.length}`], ['Readiness', pct(ready.score)]]} />
      <Actions><button onClick={() => download('ml-project-plan.md', exportPlan(plan, title))}>Download project plan (Markdown)</button><button onClick={() => { if (window.confirm?.('Clear the whole plan on this device?') ?? true) setState({}) }}>Clear plan</button></Actions>
      <Insight title="What “done” means for the final capstone">A reproducible run from versioned data (Lab 28); an honest comparison with a baseline and uncertainty (Labs 05, 16); a tested serving path with parity and contract tests (Lab 29); a model card with evidence-based limitations (Lab 31); monitoring, alerts and a rollback plan (Labs 30, 32); and a maintenance owner. A plan that concludes “don’t deploy — the baseline is as good” is a successful capstone.</Insight>
    </>}
    {view === 'data' && <>
      <Caption>Paste a small CSV of your own measurements (header row, comma-separated, numbers for features). Nothing leaves your browser. The check compares a mean baseline with ridge linear regression using 5-fold cross-validation — or forward chaining if rows are in time order.</Caption>
      <label className="ml-reflection">CSV data<textarea aria-label="Your CSV" value={csv} onChange={e => setCsv(e.target.value)} style={{ minHeight: 160, fontFamily: 'ui-monospace, monospace', fontSize: 12 }} /></label>
      {table.error ? <Warning>{table.error}</Warning> : <>
        <Controls>
          <Choice label="Target (what to predict)" value={target} onChange={setTarget} options={table.numeric} />
          <Toggle label="Rows are in time order (use forward chaining)" checked={ordered} onChange={setOrdered} />
        </Controls>
        <div className="ml-chip-row">{table.numeric.filter(h => h !== target).map(h => <button key={h} className={`ml-chip ${feats.includes(h) ? 'on' : ''}`} onClick={() => setFeats(f => (f.includes(h) ? f.filter(x => x !== h) : [...f, h]))}>{feats.includes(h) ? '✓ ' : ''}{h}</button>)}</div>
        {table.header.filter(h => !table.numeric.includes(h)).length > 0 && <p className="ml-caption">Non-numeric columns ignored here: {table.header.filter(h => !table.numeric.includes(h)).join(', ')} (encode them first — Lab 16).</p>}
        {result?.error ? <Warning>{result.error}</Warning> : result && <>
          <Metrics items={[['Rows used', `${result.n}${result.dropped ? ` (${result.dropped} dropped: missing values)` : ''}`], ['Baseline MAE', `${fmt(result.baseline.mean, 3)} ± ${fmt(result.baseline.sd, 3)}`], ['Linear model MAE', `${fmt(result.model.mean, 3)} ± ${fmt(result.model.sd, 3)}`], ['Model better in', `${result.paired.filter(d => d > 0).length} of ${result.folds} folds`]]} />
          {result.n < 30 && <Warning>{`Only ${result.n} rows: fold-to-fold variation is large. Treat this as a feasibility check, collect more data, and keep a final test set aside before modelling for real.`}</Warning>}
          <Insight title="How to read this">{result.paired.every(d => d > 0) ? 'The linear model beat the baseline in every fold — a promising start. Next: error analysis, more candidates on the same folds, and a held-out test set.' : result.paired.some(d => d > 0) ? 'Mixed results across folds: the evidence is weak. More data, better features or a different split may change the picture.' : 'The baseline wins. That is useful evidence: the features may not carry the signal, or the relationship is not linear. Try better features before more complex models.'} This check uses every row for cross-validation, so its numbers are for exploration — not a final result.</Insight>
        </>}
      </>}
    </>}
  </>
}
