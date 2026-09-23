import React, { useState } from 'react'
import { CONFIGS, COMPONENTS, runConfig, summarize, confusion } from './engine.js'
import { Heatmap } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Actions, Table, Caption } from '../../kit/ui.jsx'
import { fmt, pct } from '../../kit/math.js'

function Img({ m }) {
  return <svg viewBox="0 0 10 10" style={{ width: 52, height: 52, border: '1px solid var(--border)', borderRadius: 4, margin: 2 }} role="img" aria-label="digit image">{m.map((row, i) => row.map((v, j) => <rect key={`${i}-${j}`} x={j} y={i} width="1.02" height="1.02" fill="var(--text)" opacity={Math.max(0, Math.min(1, v))} />))}</svg>
}

export default function Playground() {
  const [seeds, setSeeds] = useState(3), [results, setResults] = useState({}), [ablation, setAblation] = useState(null), [status, setStatus] = useState(''), [inspect, setInspect] = useState('full'), [busy, setBusy] = useState(false)
  const runQueue = (jobs, done) => {
    setBusy(true); const out = {}
    const next = i => {
      if (i >= jobs.length) { setBusy(false); setStatus(''); done(out); return }
      const [key, cfg, seed] = jobs[i]
      setStatus(`Training run ${i + 1} of ${jobs.length}: ${cfg.label}, seed ${seed}`)
      setTimeout(() => { (out[key] ??= { cfg, runs: [] }).runs.push(runConfig(cfg, seed)); next(i + 1) }, 10)
    }
    next(0)
  }
  const runAll = () => runQueue(Object.entries(CONFIGS).flatMap(([k, c]) => Array.from({ length: seeds }, (_, s) => [k, c, s + 1])), setResults)
  const runAblation = () => {
    const full = CONFIGS.full, variants = [['full', full], ...Object.keys(COMPONENTS).map(c => [`no-${c}`, { ...full, [c]: false, label: `without ${COMPONENTS[c]}` }])]
    runQueue(variants.flatMap(([k, c]) => Array.from({ length: seeds }, (_, s) => [k, c, s + 1])), setAblation)
  }
  const rows = Object.entries(results), base = results.linear ? summarize(results.linear.runs).mean : null
  const best = rows.length ? rows.reduce((b, r) => (summarize(r[1].runs).mean > summarize(b[1].runs).mean ? r : b)) : null
  const pick = results[inspect]?.runs[0]
  const wrong = pick ? pick.pred.map((p, i) => [p, i]).filter(([p, i]) => p !== pick.test[i].d).slice(0, 12) : []
  return <>
    <PanelHeading title="Which parts of the pipeline actually help?" pill={busy ? 'running…' : best ? `best: ${best[1].cfg.label.split(' (')[0]}` : 'not run yet'} />
    <Caption>The task: classify 10×10 digit images. Training images sit at horizontal shifts 0–3; the fixed test set uses shifts 0–5, so a third of test images are at positions never seen in training. Every pipeline standardizes its inputs with training statistics and trains for 250 steps; each is repeated over several seeds.</Caption>
    <Controls><Slider label="Seeds per configuration" value={seeds} min={1} max={5} onChange={setSeeds} /></Controls>
    <Actions><button className="ml-primary" disabled={busy} onClick={runAll}>Run all five pipelines</button><button disabled={busy} onClick={runAblation}>Run ablations of the full pipeline</button></Actions>
    {status && <p className="ml-caption" role="status">{status}</p>}
    {rows.length > 0 && <Table head={['pipeline', 'test accuracy (mean ± sd)', 'vs baseline', 'parameters', 'multiply-adds / image', 'train time']} rows={rows.map(([, r]) => { const s = summarize(r.runs); return [r.cfg.label, `${pct(s.mean)} ± ${pct(s.sd)}`, base !== null ? `${s.mean >= base ? '+' : ''}${fmt(100 * (s.mean - base), 1)} pts` : '—', s.params.toLocaleString(), s.macs.toLocaleString(), `${Math.round(s.ms)} ms`] })} caption={`Mean and standard deviation over ${results.linear?.runs.length ?? seeds} seed(s). A difference smaller than about two standard deviations is not convincing with this few seeds.`} />}
    {ablation && <>
      <Table head={['variant', 'test accuracy (mean ± sd)', 'change vs full']} rows={Object.entries(ablation).map(([k, r]) => { const s = summarize(r.runs), f = summarize(ablation.full.runs); return [k === 'full' ? 'full pipeline' : r.cfg.label, `${pct(s.mean)} ± ${pct(s.sd)}`, k === 'full' ? '—' : `${fmt(100 * (s.mean - f.mean), 1)} pts`] })} caption="Each row removes exactly one component. The drop measures that component’s contribution in the presence of the others — interactions mean contributions need not add up." />
      <Metrics items={Object.entries(ablation).filter(([k]) => k !== 'full').map(([k, r]) => { const diffs = r.runs.map((x, i) => ablation.full.runs[i].acc - x.acc); return [`paired gain of ${k.slice(3)}`, `${fmt(100 * Math.min(...diffs), 1)} to ${fmt(100 * Math.max(...diffs), 1)} pts`] })} />
    </>}
    {rows.length > 0 && <>
      <Controls><Choice label="Inspect errors of" value={inspect} onChange={setInspect} options={rows.map(([k, r]) => [k, r.cfg.label])} /></Controls>
      {pick && <>
        <Heatmap label="Confusion matrix (rows = true digit, columns = predicted)" matrix={confusion(pick.pred, pick.test)} rowLabels={[...Array(10).keys()].map(String)} colLabels={[...Array(10).keys()].map(String)} cell={30} digits={0} />
        <p className="ml-caption">Some misclassified test images (true → predicted):</p>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>{wrong.map(([p, i]) => <div key={i} style={{ textAlign: 'center', fontSize: 11 }}><Img m={pick.test[i].img} /><div>{pick.test[i].d} → {p}</div></div>)}</div>
      </>}
    </>}
    <Insight title="How to read this like a researcher">
      <ul>
        <li>More capacity alone (MLP on pixels) does not fix a representation problem: a model that has never seen a digit at column 5 has nothing to generalize from.</li>
        <li>Convolutional features give most of the gain at a fraction of the parameters, but with more multiply-adds per image — parameters and compute are different budgets.</li>
        <li>Report the spread across seeds, compare configurations on the same seeds (paired), and keep the failures in the table: they are what justify the final design.</li>
      </ul>
    </Insight>
  </>
}
