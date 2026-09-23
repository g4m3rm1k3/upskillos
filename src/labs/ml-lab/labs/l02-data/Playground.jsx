import React, { useMemo, useState } from 'react'
import { generateLog, runPipeline, defaultDecisions, broadcastShape } from './engine.js'
import { Plot, Path, extent } from '../../kit/Plot.jsx'
import { PanelHeading, Choice, Toggle, Controls, Metrics, Actions, Caption, Insight, Table, Legend } from '../../kit/ui.jsx'
import { fmt } from '../../kit/math.js'

const parseShape = text => { const parts = text.replace(/[()\s]/g, '').split(',').filter(Boolean).map(Number); return parts.length && parts.every(n => Number.isInteger(n) && n >= 1 && n <= 9999) ? parts : null }
const showShape = s => `(${s.join(', ')}${s.length === 1 ? ',' : ''})`

export default function Playground() {
  const [d, setD] = useState(defaultDecisions)
  const [runs, setRuns] = useState([])
  const [shapes, setShapes] = useState(['5, 1', '5'])
  const raw = useMemo(() => generateLog({ seed: d.seed }), [d.seed])
  const out = useMemo(() => runPipeline(raw, d), [raw, d])
  const set = (k, v) => setD(x => ({ ...x, [k]: v }))
  const all = [...out.train, ...out.validation]
  const xr = extent(all.map(r => r.size_mb)), yr = extent(all.map(r => r.duration_s))
  const a = parseShape(shapes[0]), b = parseShape(shapes[1]), broadcast = a && b ? broadcastShape(a, b) : null
  const reproduce = () => {
    const fresh = runPipeline(generateLog({ seed: d.seed }), { ...d })
    setRuns(r => [...r.slice(-4), { decisions: { ...d }, fingerprint: fresh.fingerprint, val: fresh.result.validationMSE, same: fresh.fingerprint === out.fingerprint }])
  }
  return <>
    <PanelHeading title="Clean it. Record it. Reproduce it." pill={`fingerprint ${out.fingerprint}`} />
    <Caption>A synthetic build log: `size_mb` and `files` are known before a build, `duration_s` is measured after it. The log contains missing sizes, a `-1` timeout sentinel, a few sizes logged in KB, and rows ingested twice. Every decision below is written to the cleaning log.</Caption>
    <Controls>
      <label>Seed<input type="number" min="0" max="99999" value={d.seed} onChange={e => e.target.value !== '' && set('seed', Math.max(0, Math.min(99999, Math.trunc(+e.target.value))))} /></label>
      <Choice label="Missing sizes" value={d.strategy} onChange={v => set('strategy', v)} options={[['median', 'Impute median'], ['mean', 'Impute mean'], ['drop', 'Drop rows']]} />
      <Choice label="Learn fill value from" value={d.fitOn} onChange={v => set('fitOn', v)} options={[['train', 'Training rows only'], ['all', 'All rows (leaky)']]} />
      <div className="ml-toggles">
        <Toggle label="Remove duplicates" checked={d.dedupe} onChange={v => set('dedupe', v)} />
        <Toggle label="Drop -1 sentinel targets" checked={d.sentinel} onChange={v => set('sentinel', v)} />
        <Toggle label="Repair KB → MB" checked={d.units} onChange={v => set('units', v)} />
      </div>
    </Controls>
    <Legend items={[['●', 'training', 'var(--chart-train)'], ['◆', 'validation', 'var(--chart-val)'], ['◯', 'imputed or repaired value', 'var(--text)'], ['━', 'least-squares line (training only)', 'var(--chart-model)']]} />
    <Plot x={xr} y={yr} xLabel="size_mb (input)" yLabel="duration_s (target)" label="Cleaned builds: size against duration, with fitted line">{({ X, Y, x0, x1 }) => <>
      <Path X={X} Y={Y} points={[[x0, out.result.w * x0 + out.result.b], [x1, out.result.w * x1 + out.result.b]]} />
      {out.train.map((r, i) => <g key={`t${i}`}><circle cx={X(r.size_mb)} cy={Y(r.duration_s)} r="3.5" fill="var(--chart-train)" />{r.flags.length > 0 && <circle cx={X(r.size_mb)} cy={Y(r.duration_s)} r="7" fill="none" stroke="var(--text)" />}</g>)}
      {out.validation.map((r, i) => <g key={`v${i}`}><path d={`M ${X(r.size_mb)} ${Y(r.duration_s) - 4} l 4 4 l -4 4 l -4 -4 Z`} fill="var(--chart-val)" />{r.flags.length > 0 && <circle cx={X(r.size_mb)} cy={Y(r.duration_s)} r="7" fill="none" stroke="var(--text)" />}</g>)}
    </>}</Plot>
    <Metrics items={[['Train MSE', fmt(out.result.trainMSE, 2)], ['Validation MSE', fmt(out.result.validationMSE, 2)], ['Mean baseline · val', fmt(out.result.baselineMSE, 2)], ['Slope s/MB', fmt(out.result.w, 3)]]} />
    <Insight title="Cleaning log — every decision, in order">
      <ol className="ml-log">{out.log.map((s, i) => <li key={i}><strong>{s.step}.</strong> {s.detail}</li>)}</ol>
    </Insight>
    <Actions><button className="ml-primary" onClick={reproduce}>Reproduce from a clean run</button><button onClick={() => { setD(defaultDecisions); setRuns([]) }}>Reset decisions</button></Actions>
    {runs.length > 0 && <Table head={['seed', 'strategy', 'fit on', 'dedupe', 'sentinel', 'units', 'fingerprint', 'val MSE', 'matches view?']} rows={runs.map(r => [r.decisions.seed, r.decisions.strategy, r.decisions.fitOn, r.decisions.dedupe ? 'yes' : 'no', r.decisions.sentinel ? 'yes' : 'no', r.decisions.units ? 'yes' : 'no', r.fingerprint, fmt(r.val, 2), r.same ? '✓ identical' : 'different'])} caption="Each rerun regenerates the log from its seed and replays the recorded decisions. Same inputs + same decisions → same fingerprint. Change any decision and the fingerprint changes." />}
    <details><summary>Raw log — the first 12 rows exactly as ingested</summary>
      <Table head={['id', 'files', 'size_mb', 'duration_s', 'problem']} rows={raw.slice(0, 12).map(r => [r.id, r.files, r.size_mb ?? 'NaN', r.duration_s, r.size_mb === null ? 'missing input' : r.duration_s === -1 ? 'sentinel target' : r.size_mb > 1000 ? 'KB not MB' : raw.filter(q => q.id === r.id).length > 1 ? 'duplicate' : ''])} />
    </details>
    <Insight title="Broadcasting explorer">
      <p>NumPy aligns shapes from the right. Each aligned pair must be equal, or one of them must be 1 (which is stretched). Try the classic mistake: predictions of shape <code>(5, 1)</code> minus targets of shape <code>(5,)</code>.</p>
      <Controls><label>Shape A<input value={shapes[0]} onChange={e => setShapes(s => [e.target.value, s[1]])} /></label><label>Shape B<input value={shapes[1]} onChange={e => setShapes(s => [s[0], e.target.value])} /></label></Controls>
      <p role="status">{!a || !b ? 'Enter shapes such as 5, 1 or 3, 4.' : broadcast ? <>A {showShape(a)} op B {showShape(b)} → <strong>{showShape(broadcast)}</strong>{broadcast.reduce((t, v) => t * v, 1) > Math.max(a.reduce((t, v) => t * v, 1), b.reduce((t, v) => t * v, 1)) ? ' — the result is larger than either input. If you expected elementwise errors, this is a silent bug.' : ''}</> : <>A {showShape(a)} and B {showShape(b)} are <strong>incompatible</strong>: NumPy raises a ValueError.</>}</p>
    </Insight>
  </>
}
