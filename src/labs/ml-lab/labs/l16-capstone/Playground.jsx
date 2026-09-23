import React, { useMemo, useState } from 'react'
import { generateJobs, devTest, defaultFeatures, design, MODELS, crossValidate, finalTest, segmentErrors } from './engine.js'
import { Plot, Path, extent } from '../../kit/Plot.jsx'
import { PanelHeading, Choice, Toggle, Controls, Metrics, Caption, Insight, Table, Actions, Warning } from '../../kit/ui.jsx'
import { fmt } from '../../kit/math.js'

const FEATURE_LABELS = { oneHot: 'One-hot language', logSize: 'log(size)', interactions: 'Interactions: size×shared, size×cache-miss', busy: 'shared × busy hours (9–17)' }

export default function Playground() {
  const [features, setFeatures] = useState(defaultFeatures)
  const [results, setResults] = useState(null), [running, setRunning] = useState(false)
  const [chosen, setChosen] = useState('boosting'), [tests, setTests] = useState([]), [notes, setNotes] = useState('')
  const jobs = useMemo(() => generateJobs(), []), { dev, test } = useMemo(() => devTest(jobs), [jobs])
  const names = design(dev.slice(0, 1), features).names
  const run = () => { setRunning(true); setTimeout(() => { setResults({ features: { ...features }, rows: Object.keys(MODELS).map(k => ({ key: k, ...crossValidate(dev, features, k) })) }); setRunning(false) }, 30) }
  const stale = results && JSON.stringify(results.features) !== JSON.stringify(features)
  const base = results?.rows.find(r => r.key === 'baseline'), pick = results?.rows.find(r => r.key === chosen)
  const segs = pick ? segmentErrors(dev, pick.oof) : []
  const openTest = () => setTests(t => [...t, { at: t.length + 1, model: chosen, features: Object.keys(features).filter(k => features[k]).join(', ') || 'raw', ...finalTest(dev, test, features, chosen) }])
  const report = pick && `# Build-duration model — report

Target: CI build duration (seconds). Rows: ${dev.length} development, ${test.length} held-out test (split before any modelling).
Features (${names.length}): ${names.join(', ')}.
Model: ${MODELS[chosen].label}.

## Cross-validation on development data (5-fold, MAE in seconds)
${results.rows.map(r => `- ${MODELS[r.key].label}: ${fmt(r.mean, 2)} ± ${fmt(r.sd, 2)}`).join('\n')}

## Test set${tests.length ? ` (opened ${tests.length} time${tests.length > 1 ? 's — later results are NOT an unbiased estimate' : ''})` : ' — not yet opened'}
${tests.map(t => `- #${t.at} ${MODELS[t.model].label} [${t.features}]: MAE ${fmt(t.modelMAE, 2)} vs baseline ${fmt(t.baselineMAE, 2)}; improvement ${fmt(t.improvement, 2)} s (95% bootstrap CI ${fmt(t.ci[0], 1)} to ${fmt(t.ci[1], 1)})`).join('\n')}

## Error analysis (out-of-fold MAE by segment)
${segs.map(s => `- ${s.label} (n=${s.n}): ${fmt(s.mae, 2)}`).join('\n')}

## Decision and limits
${notes || '(write your decision: ship, iterate, or reject — and why)'}
`
  return <>
    <PanelHeading title="Predict build time. Then decide whether to ship." pill={`${dev.length} dev · ${test.length} test (locked)`} />
    <Caption>Synthetic CI log: job size, file count, cache hit, shared or dedicated runner, language and hour of day. Duration depends on them non-linearly, with interactions and noise that grows with job size. Twenty percent of jobs were set aside as a test set **before** anything else.</Caption>
    <Insight title="1 · Engineer features">
      <div className="ml-toggles">{Object.entries(FEATURE_LABELS).map(([k, label]) => <Toggle key={k} label={label} checked={features[k]} onChange={v => setFeatures(f => ({ ...f, [k]: v }))} />)}</div>
      <p className="ml-caption">Columns: {names.join(' · ')}</p>
    </Insight>
    <Actions><button className="ml-primary" disabled={running} onClick={run}>{running ? 'Running 5-fold CV for 5 models…' : 'Run cross-validated comparison'}</button></Actions>
    {stale && <Warning>Features changed since the last comparison — rerun it.</Warning>}
    {results && <>
      <Table head={['model', 'CV MAE (s)', '± sd across folds', 'skill vs baseline']} rows={results.rows.map(r => [MODELS[r.key].label, fmt(r.mean, 2), fmt(r.sd, 2), r.key === 'baseline' ? '—' : `${fmt(100 * (1 - r.mean / base.mean), 1)}%`])} caption="Mean absolute error in seconds, on the same five folds for every model. Every model's preprocessing and fitting happen inside each fold." />
      <Controls><Choice label="Model to investigate" value={chosen} onChange={setChosen} options={Object.entries(MODELS).map(([k, m]) => [k, m.label])} /></Controls>
      <Plot x={extent(dev.map(j => j.duration))} y={extent(dev.map(j => j.duration))} height={280} xLabel="actual duration (s)" yLabel="out-of-fold prediction (s)" label="Out-of-fold predictions against actual durations">{({ X, Y, x0, x1 }) => <>
        <Path X={X} Y={Y} points={[[x0, x0], [x1, x1]]} stroke="var(--muted)" width={1} dash="4 3" />
        {dev.map((j, i) => <circle key={i} cx={X(j.duration)} cy={Y(pick.oof[i])} r="2.4" fill={j.shared ? 'var(--chart-val)' : 'var(--chart-train)'} opacity="0.6" />)}
      </>}</Plot>
      <Caption>Orange: shared runner; blue: dedicated. Points on the dashed line are perfect predictions. Look for groups that systematically sit above or below it.</Caption>
      <Table head={['segment', 'rows', 'out-of-fold MAE (s)']} rows={segs.map(s => [s.label, s.n, fmt(s.mae, 2)])} />
      <Insight title="3 · Open the test set — once">
        <p>When you have chosen a model and features using cross-validation only, evaluate them on the untouched test rows. The result is an honest estimate only the first time.</p>
        <Actions><button className="ml-primary" onClick={openTest}>Evaluate {MODELS[chosen].label} on the test set</button></Actions>
        {tests.length > 1 && <Warning>{`The test set has now been opened ${tests.length} times. Choosing among these results turns the test set into a validation set; the best-looking number is optimistic (the winner's curse).`}</Warning>}
        {tests.length > 0 && <Table head={['#', 'model', 'features', 'test MAE', 'baseline MAE', 'improvement (95% CI)']} rows={tests.map(t => [t.at, MODELS[t.model].label, t.features, fmt(t.modelMAE, 2), fmt(t.baselineMAE, 2), `${fmt(t.improvement, 2)} (${fmt(t.ci[0], 1)} to ${fmt(t.ci[1], 1)})`])} />}
      </Insight>
      <Metrics items={[['Best CV model', MODELS[results.rows.reduce((b, r) => (r.mean < b.mean ? r : b)).key].label.split(' (')[0]], ['Best CV MAE', fmt(Math.min(...results.rows.map(r => r.mean)), 2)], ['Baseline CV MAE', fmt(base.mean, 2)], ['Test openings', tests.length]]} />
      <label className="ml-reflection">4 · Decision: ship, iterate or reject — and why?<textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="The model improves MAE by … s (CI …). It is weakest on … because … . I would ship / not ship because … ." /></label>
      <details><summary>Generated report (Markdown)</summary><pre className="ml-mono">{report}</pre></details>
      <Actions><button onClick={() => { const url = URL.createObjectURL(new Blob([report], { type: 'text/markdown' })), a = document.createElement('a'); a.href = url; a.download = 'build-duration-model-report.md'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }}>Download report</button></Actions>
    </>}
    {!results && <Caption>Run the comparison with the raw features first. Then turn on feature engineering and run it again. Which model benefits most?</Caption>}
  </>
}
