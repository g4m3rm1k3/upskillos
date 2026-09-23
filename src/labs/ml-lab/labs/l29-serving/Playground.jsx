import React, { useMemo, useState } from 'react'
import { trainArtifact, SERVERS, requests, parity, simulateQueue, handle } from './engine.js'
import { Plot, Path, extent } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Caption, Warning } from '../../kit/ui.jsx'
import { fmt, pct } from '../../kit/math.js'

export default function Playground() {
  const [view, setView] = useState('parity'), [server, setServer] = useState('shared')
  const [rate, setRate] = useState(60), [maxBatch, setMaxBatch] = useState(1), [maxWait, setMaxWait] = useState(0), [perItem, setPerItem] = useState(2), [overhead, setOverhead] = useState(8)
  const A = useMemo(() => trainArtifact(), []), R = useMemo(() => requests(), [])
  const [body, setBody] = useState(() => JSON.stringify({ request_id: 'demo-1', size_mb: 42.5, files: 18, cache_hit: 0, runner: 'shared', language: 'java', hour: 14 }, null, 2))
  const par = useMemo(() => parity(A, server, R), [A, server, R])
  const q = useMemo(() => simulateQueue({ rate, maxBatch, maxWait, perItem, overhead }), [rate, maxBatch, maxWait, perItem, overhead])
  const capacity = maxBatch === 1 ? 1000 / (overhead + perItem) : 1000 * maxBatch / (overhead + perItem * maxBatch)
  const curve = useMemo(() => view === 'latency' ? [10, 20, 40, 60, 80, 100, 120, 160, 200, 260].map(r => [r, simulateQueue({ rate: r, maxBatch, maxWait, perItem, overhead }).p95]) : [], [view, maxBatch, maxWait, perItem, overhead])
  const response = handle(A, body)
  const all = [...par.off, ...par.srv]
  return <>
    <PanelHeading title={{ parity: 'Same model, different numbers?', latency: 'Fast enough under real traffic?', api: 'The prediction contract, as an API.' }[view]} pill={view === 'parity' ? (par.passed ? 'parity ✓' : 'parity ✗') : view === 'latency' ? `p95 ${fmt(q.p95, 0)} ms` : `HTTP ${response.status}`} />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['parity', 'Training–serving parity'], ['latency', 'Latency and throughput'], ['api', 'Request/response contract']]} /></Controls>
    {view === 'parity' && <>
      <Caption>The model was trained offline with engineered features and standardization. Four teams built the serving path. Every server loads the same saved weights; they differ only in how they turn a request into features.</Caption>
      <Controls><Choice label="Serving implementation" value={server} onChange={setServer} options={Object.entries(SERVERS).map(([k, s]) => [k, s.label])} /></Controls>
      <Plot x={extent(all)} y={extent(all)} height={280} xLabel="offline prediction (s)" yLabel="served prediction (s)" label="Served against offline predictions for the same requests">{({ X, Y, x0, x1 }) => <>
        <Path X={X} Y={Y} points={[[x0, x0], [x1, x1]]} stroke="var(--muted)" width={1} dash="4 3" />
        {par.off.map((o, i) => <circle key={i} cx={X(o)} cy={Y(par.srv[i])} r="3.5" fill={Math.abs(o - par.srv[i]) < 1e-6 ? 'var(--chart-train)' : 'var(--chart-val)'} />)}
      </>}</Plot>
      <Metrics items={[['Requests compared', R.length], ['Max |served − offline|', `${fmt(par.maxDiff, 4)} s`], ['Mean |difference|', `${fmt(par.meanDiff, 4)} s`], ['Parity test (tolerance 1e−6)', par.passed ? 'pass' : 'FAIL']]} />
      {!par.passed && <Warning>{{ log10: 'log10(x) = ln(x)/2.303: every log feature is 2.3× too small. Predictions are plausible — just wrong — and nothing crashes.', batchStats: 'Standardizing with the batch’s own mean and spread makes each prediction depend on which other requests arrived with it. A single request (spread 0) would even divide by the fallback 1.', onehot: 'Java jobs are scored with the Python weight and vice versa. The error only affects two languages, so aggregate metrics may hide it.' }[server]}</Warning>}
      <Insight title="Parity is tested, not assumed">Train–serving skew is one of the most common production ML failures because the serving code “looks right”. The cure: one feature implementation imported by both paths, preprocessing statistics saved inside the model artifact, and an automated **parity test** that replays logged requests through both paths and requires identical outputs.</Insight>
    </>}
    {view === 'latency' && <>
      <Caption>Requests arrive at random (Poisson). Each model call costs a fixed overhead (loading inputs, framework dispatch) plus a cost per item. Micro-batching waits briefly to process several requests in one call.</Caption>
      <Controls>
        <Slider label="Traffic (requests / second)" value={rate} min={10} max={260} step={10} onChange={setRate} />
        <Slider label="Max batch size" value={maxBatch} min={1} max={32} onChange={setMaxBatch} />
        <Slider label="Max wait for a batch (ms)" value={maxWait} min={0} max={30} onChange={setMaxWait} />
        <Slider label="Per-call overhead (ms)" value={overhead} min={1} max={30} onChange={setOverhead} />
        <Slider label="Cost per item (ms)" value={perItem} min={0.5} max={10} step={0.5} onChange={setPerItem} />
      </Controls>
      <Metrics items={[['p50 latency', `${fmt(q.p50, 1)} ms`], ['p95 latency', `${fmt(q.p95, 1)} ms`], ['Utilization', pct(Math.min(1, q.utilization))], ['Capacity at full batches', `${fmt(capacity, 0)} req/s`]]} />
      {q.backlog > 500 && <Warning>{`Overloaded: requests arrive faster than the server can process them, so the queue grows without bound (${fmt(q.backlog / 1000, 1)} s of backlog after 20 s). Latency is now determined by how long the test ran, not by the model.`}</Warning>}
      <Plot x={[10, 260]} y={[0, Math.log10(Math.max(100, ...curve.map(c => c[1])) * 1.2)]} height={220} xLabel="traffic (requests / second)" yLabel="p95 latency (ms, log scale)" label="p95 latency against traffic" yFormat={v => Math.round(10 ** v)}>{({ X, Y }) => <>
        <Path X={X} Y={Y} points={curve.map(([r, l]) => [r, Math.log10(Math.max(1, l))])} />
        <circle cx={X(rate)} cy={Y(Math.log10(Math.max(1, q.p95)))} r="5" fill="var(--chart-val)" />
      </>}</Plot>
      <Insight title="Queues, not models, decide tail latency">As utilization approaches 100%, waiting time explodes — long before the model itself gets slower. Batching amortizes the per-call overhead and raises capacity, at the cost of a small wait. Report p95/p99 latency, not averages, and leave headroom: plan for peak traffic, not typical traffic. For non-urgent predictions, a nightly **batch** job avoids the problem entirely.</Insight>
    </>}
    {view === 'api' && <>
      <Caption>An online prediction service exposes the model through a documented contract: required fields, types and ranges (the data contract from Lab 28), and a response that always names the model version. Edit the request.</Caption>
      <label className="ml-reflection">POST /v1/predict-duration<textarea aria-label="Request body" value={body} onChange={e => setBody(e.target.value)} style={{ minHeight: 180, fontFamily: 'ui-monospace, monospace', fontSize: 12 }} /></label>
      <p className="ml-mono">{`HTTP ${response.status}\n${JSON.stringify(response.body, null, 2)}`}</p>
      <Insight title="What the contract guarantees">Invalid requests are rejected with a 4xx status and a reason, never silently scored. Every response carries the model version, so predictions can be traced back to the run that produced them (Lab 28). Try removing a field, sending `"size_mb": "40"`, or an unknown language.</Insight>
    </>}
  </>
}
