// Figures placed between the paragraphs of Lab 29 (29.2, 29.4), built on the lab's own engine.
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Radio, Readout, Bars, r } from '../../kit/fig.jsx'
import { trainArtifact, SERVERS, requests, parity, simulateQueue } from './engine.js'

const A = trainArtifact(), REQS = requests()

// ---------- 29.2 ----------
export function ParityServers() {
  const results = useMemo(() => Object.keys(SERVERS).map(k => [k, parity(A, k, REQS)]), [])
  return <div>
    <Bars items={results.map(([k, p]) => ({ label: k, value: p.maxDiff, highlight: !p.passed }))} digits={1} label={`Largest difference from the offline pipeline over 60 requests: ${results.map(([k, p]) => `${k} ${r(p.maxDiff, 1)} s`).join(', ')}`} />
    <table className="ml-fig-table">
      <caption>Parity test: 60 logged requests through the offline pipeline and each server</caption>
      <thead><tr><th scope="col">Server</th><th scope="col">Largest difference</th><th scope="col">Mean difference</th><th scope="col">Parity</th></tr></thead>
      <tbody>{results.map(([k, p]) => <tr key={k}><th scope="row" style={{ textAlign: 'left' }}>{SERVERS[k].label}</th><td>{r(p.maxDiff, 2)} s</td><td>{r(p.meanDiff, 2)} s</td><td>{p.passed ? 'passes' : 'fails'}</td></tr>)}</tbody>
    </table>
    <Readout>All four servers load the same weights. Only the one that imports the training code passes; the others are off by seconds on typical requests — plausible numbers that no error message reveals.</Readout>
  </div>
}

// ---------- 29.4 ----------
export function QueueLatency() {
  const [rate, setRate] = useState(80), [batch, setBatch] = useState('1')
  const q = useMemo(() => simulateQueue({ rate, maxBatch: Number(batch), maxWait: Number(batch) > 1 ? 2 : 0 }), [rate, batch])
  const cap = (1000 * Number(batch)) / (8 + 2 * Number(batch))
  return <div>
    <Controls>
      <Slider label="traffic (requests per second)" value={rate} min={10} max={300} step={5} onChange={setRate} digits={0} />
      <Radio name="batch29" value={batch} onChange={setBatch} options={[['1', 'one request at a time'], ['8', 'micro-batches of up to 8']]} />
    </Controls>
    <Bars items={[['p50', q.p50], ['p95', q.p95], ['p99', q.p99]].map(([l, v]) => ({ label: l, value: Math.min(v, 1000), highlight: l === 'p95' }))} max={Math.max(60, Math.min(1000, q.p99))} digits={0} label={`Latency percentiles at ${rate} requests per second: p50 ${r(q.p50, 0)} ms, p95 ${r(q.p95, 0)} ms, p99 ${r(q.p99, 0)} ms`} />
    <Readout>Capacity {r(cap, 0)} requests per second (8 ms per call + 2 ms per request); utilization {r(100 * Math.min(1, q.utilization), 0)}%. p95 = {r(q.p95, 0)} ms{q.p95 > 1000 ? ' (bars capped at 1,000 ms: the queue is growing without bound)' : ''}. Latency explodes as traffic approaches capacity.</Readout>
  </div>
}
