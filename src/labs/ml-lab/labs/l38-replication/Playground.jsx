import React, { useEffect, useMemo, useState } from 'react'
import { PAPER, EXPERIMENTS, BUDGET, CLAIMS, VERDICTS, runExperiment, suggest, report } from './engine.js'
import { Plot, Path } from '../../kit/Plot.jsx'
import { PanelHeading, Choice, Controls, Metrics, Insight, Actions, Table, Caption, Legend, Warning } from '../../kit/ui.jsx'
import { pct } from '../../kit/math.js'

const KEY = 'upskillos.ml-lab.replication.v1'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }
const pts = v => { const x = Math.abs(v) < 0.0005 ? 0 : v; return `${x >= 0 ? '+' : ''}${(100 * x).toFixed(1)} pts` }
const ci = r => `${pts(r.mean)} [${(100 * r.lo).toFixed(1)}, ${(100 * r.hi).toFixed(1)}]`

function PairedPlot({ r, claimed }) {
  const top = Math.max(0.1, ...r.diff.map(Math.abs), claimed ?? 0) * 1.15
  return <>
    <Plot x={[-top, top]} y={[0, r.diff.length + 1]} height={200} xLabel="method − comparison (accuracy points)" yLabel="seed" yFormat={() => ''} xFormat={v => (100 * v).toFixed(0)} label="Paired differences per seed">{({ X, Y }) => <>
      <rect x={X(r.lo)} y={Y(r.diff.length + 1)} width={X(r.hi) - X(r.lo)} height={Y(0) - Y(r.diff.length + 1)} fill="var(--accent)" opacity="0.15" />
      <Path X={X} Y={Y} points={[[0, 0], [0, r.diff.length + 1]]} stroke="var(--muted)" width={1} dash="5 4" />
      {claimed !== undefined && <Path X={X} Y={Y} points={[[claimed, 0], [claimed, r.diff.length + 1]]} stroke="var(--chart-val)" width={2} />}
      <Path X={X} Y={Y} points={[[r.mean, 0], [r.mean, r.diff.length + 1]]} stroke="var(--accent)" width={2} />
      {r.diff.map((d, i) => <circle key={i} cx={X(d)} cy={Y(i + 1)} r="4" fill="var(--text)" />)}
    </>}</Plot>
    <Legend items={[['●', 'one seed (same data for both)', 'var(--text)'], ['━', 'mean difference', 'var(--accent)'], ['■', '95% interval', 'var(--accent)'], ...(claimed !== undefined ? [['━', 'the paper’s claim', 'var(--chart-val)']] : [])]} />
  </>
}

export default function Playground() {
  const [state, setState] = useState(load)
  const ran = state.ran ?? [], verdicts = state.verdicts ?? {}, notes = state.notes ?? {}
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage unavailable */ } }, [state])
  const results = useMemo(() => Object.fromEntries(ran.map(id => [id, runExperiment(id)])), [ran.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const used = ran.reduce((s, id) => s + EXPERIMENTS.find(e => e.id === id).runs, 0)
  const [reveal, setReveal] = useState(false)
  const hints = suggest(results)
  const set = (field, k, v) => setState(s => ({ ...s, [field]: { ...(s[field] ?? {}), [k]: v } }))
  const download = () => { const url = URL.createObjectURL(new Blob([report(CLAIMS, verdicts, notes, results)], { type: 'text/markdown' })), a = document.createElement('a'); a.href = url; a.download = 'replication-report.md'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
  return <>
    <PanelHeading title="Replicate a paper — and say exactly what held up." pill={`${used} / ${BUDGET} training runs`} />
    <div className="ml-update">
      <h3>“JitterMix: simple augmentation for small-data classification” (a fictional paper)</h3>
      <p>We add jittered copies of each training point (JitterMix), cubic features and weight decay to logistic regression. On two-moons with 40 training points, our method reaches <strong>93.4%</strong> test accuracy versus <strong>84.8%</strong> for logistic regression. Results are from one run (seed 9).</p>
      <ol>{CLAIMS.map(c => <li key={c.id}>{c.text}</li>)}</ol>
    </div>
    <Caption>{`You have a compute budget of ${BUDGET} training runs — not enough for every experiment. Choose what would most change your conclusions. Every run uses the paper's code and a fixed 1,500-point test set; the seed decides the 40 training points and the initialization.`}</Caption>
    <Table head={['experiment', 'cost (runs)', '']} rows={EXPERIMENTS.map(e => [e.name, e.runs, ran.includes(e.id) ? '✓ done' : <button key={e.id} disabled={used + e.runs > BUDGET} onClick={() => setState(s => ({ ...s, ran: [...(s.ran ?? []), e.id] }))}>{used + e.runs > BUDGET ? 'Over budget' : 'Run'}</button>])} />
    {results.reproduce && <>
      <h3>Exact reproduction (seed 9)</h3>
      <Metrics items={[['Method', pct(results.reproduce.method)], ['Paper: method', pct(PAPER.method)], ['Baseline', pct(results.reproduce.baseline)], ['Paper: baseline', pct(PAPER.baseline)]]} />
      <Caption>Same code, same seed, same numbers: the result is **reproducible**. That shows the pipeline is deterministic — not that the result is typical.</Caption>
    </>}
    {results.seeds && <>
      <h3>Method versus baseline on 10 fresh seeds</h3>
      <Metrics items={[['Method: mean accuracy', pct(results.seeds.meanA)], ['Baseline: mean accuracy', pct(results.seeds.meanB)], ['Paired gain [95% CI]', ci(results.seeds)], ['Paper’s claimed gain', pts(PAPER.method - PAPER.baseline)]]} />
      <PairedPlot r={results.seeds} claimed={PAPER.method - PAPER.baseline} />
    </>}
    {results.ablation && <>
      <h3>Ablation: remove one component at a time</h3>
      <Table head={['variant', 'mean accuracy', 'full method minus variant [95% CI]']} rows={[['full method', pct(results.ablation.rows[0].meanA), '—'], ...results.ablation.rows.map(r => [r.name, pct(r.meanB), ci(r)])]} caption="A large positive number means the removed component matters. An interval containing 0 means removing it made no detectable difference." />
    </>}
    {results.tuned && <>
      <h3>A stronger baseline</h3>
      <Metrics items={[['λ chosen on tuning seeds', String(results.tuned.lambda)], ['Cubic baseline, tuned', pct(results.tuned.meanB)], ['Method', pct(results.tuned.meanA)], ['Method − tuned baseline', ci(results.tuned)]]} />
      <PairedPlot r={results.tuned} />
    </>}
    {results.noise && <>
      <h3>Robustness: 20% of training labels flipped</h3>
      <Metrics items={[['Method', pct(results.noise.meanA)], ['Baseline', pct(results.noise.meanB)], ['Paired gain [95% CI]', ci(results.noise)], ['Method: sd across seeds', pct(results.noise.sdA)]]} />
      <PairedPlot r={results.noise} />
    </>}
    <h3>Your replication report</h3>
    {CLAIMS.map((c, i) => <div key={c.id} className="ml-reflection">
      <Controls><Choice label={`Claim ${i + 1}: ${c.text}`} value={verdicts[c.id] ?? 'untested'} onChange={v => set('verdicts', c.id, v)} options={VERDICTS} /></Controls>
      <label>Evidence<textarea value={notes[c.id] ?? ''} onChange={e => set('notes', c.id, e.target.value)} placeholder="Which experiment, which numbers, and what they show." style={{ minHeight: 56 }} /></label>
      {reveal && (hints[c.id] ? <p className="ml-caption"><strong>Suggested: {VERDICTS.find(v => v[0] === hints[c.id].verdict)[1]}.</strong> {hints[c.id].why}</p> : <p className="ml-caption">No experiment you ran addresses this claim yet — the honest verdict is “Not tested”.</p>)}
    </div>)}
    <label className="ml-reflection">Deviations from the paper (anything you changed or could not match)<textarea value={notes.deviations ?? ''} onChange={e => set('notes', 'deviations', e.target.value)} style={{ minHeight: 56 }} /></label>
    <Actions>
      <button onClick={() => setReveal(v => !v)}>{reveal ? 'Hide' : 'Compare with'} evidence-based verdicts</button>
      <button onClick={download}>Download report (Markdown)</button>
      <button onClick={() => { setState({}); setReveal(false) }}>Start over</button>
    </Actions>
    {used > 0 && used + Math.min(...EXPERIMENTS.filter(e => !ran.includes(e.id)).map(e => e.runs), Infinity) > BUDGET && ran.length < EXPERIMENTS.length && <Warning>Budget exhausted for the remaining experiments. Report the untested claims as untested — never as replicated.</Warning>}
    <Insight title="What a replication should separate">**Reproduced**: same code and seed give the same number. **Replicated**: the effect holds on fresh seeds, with an interval. **Attributed**: ablations and a fairly tuned baseline show which component causes the gain. A single-seed 8.6-point gain can be real in direction, smaller in size, and caused by something other than the paper’s contribution — all at once.</Insight>
  </>
}
