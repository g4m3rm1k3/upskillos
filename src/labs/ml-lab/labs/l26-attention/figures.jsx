// Figures placed between the paragraphs of Lab 26 (26.1–26.4), built on the lab's own engine.
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Check, Readout, Bars, r } from '../../kit/fig.jsx'
import { lookup, SERVICES, LATENCY, attention, randomMatrix, entropy, sinusoidal, blockShapes } from './engine.js'

// A matrix of weights in [0, 1] as shaded squares, rows = queries, columns = keys.
function WeightGrid({ W, label, cell = 30 }) {
  const T = W.length
  return <svg viewBox={`0 0 ${T * cell + 2} ${T * cell + 2}`} role="img" aria-label={label} style={{ width: T * cell + 2, maxWidth: '100%' }}>
    {W.map((row, i) => row.map((w, j) => <g key={`${i}-${j}`}>
      <rect x={1 + j * cell} y={1 + i * cell} width={cell - 1} height={cell - 1} fill={`rgba(234, 88, 12, ${Math.min(1, w * 1.2)})`} stroke="var(--border)" strokeWidth={0.5} />
      {cell >= 30 && <text x={1 + j * cell + cell / 2} y={1 + i * cell + cell / 2 + 4} textAnchor="middle" style={{ fontSize: 9.5 }}>{w < 0.005 ? '0' : r(w, 2)}</text>}
    </g>))}
  </svg>
}

// ---------- 26.1 ----------
export function SoftLookup() {
  const [angle, setAngle] = useState(150), [beta, setBeta] = useState(4)
  const L = lookup(angle, beta)
  return <div>
    <Controls>
      <Slider label="query direction (degrees)" value={angle} min={0} max={359} step={1} onChange={setAngle} digits={0} />
      <Slider label="sharpness β" value={beta} min={0} max={30} step={0.5} onChange={setBeta} digits={1} />
    </Controls>
    <Bars items={L.w.map((w, i) => ({ label: SERVICES[i][0], value: w, highlight: w === Math.max(...L.w) }))} max={1} label={`Attention weights over six services: ${L.w.map((w, i) => `${SERVICES[i][0]} ${r(w, 2)}`).join(', ')}`} />
    <Readout>Output latency Σ wᵢ vᵢ = {r(L.out, 1)} ms (values: {SERVICES.map(([s], i) => `${s} ${LATENCY[i]}`).join(', ')}). At β = 0 every weight is 1/6 and the output is the plain average, {r(LATENCY.reduce((a, b) => a + b, 0) / 6, 1)} ms; large β picks the service whose key points closest to the query.</Readout>
  </div>
}

// ---------- 26.2 ----------
export function ScaleEntropy() {
  const [logd, setLogd] = useState(6), [scaled, setScaled] = useState(true)
  const d = 2 ** logd, T = 6
  const { weights } = useMemo(() => { const X = randomMatrix(T, d, 5); return attention(X, randomMatrix(T, d, 6), X, { scale: scaled }) }, [d, scaled])
  const H = weights.reduce((s, w) => s + entropy(w), 0) / T
  return <div>
    <Controls>
      <Slider label="width d = 2^k, k" value={logd} min={1} max={8} step={1} onChange={setLogd} digits={0} />
      <Check label="divide by √d" checked={scaled} onChange={setScaled} />
    </Controls>
    <WeightGrid W={weights} label={`Attention weights for 6 tokens with d = ${d}${scaled ? ', scaled' : ', unscaled'}; mean row entropy ${r(H, 2)}`} />
    <Readout>d = {d}: mean row entropy {r(H, 2)} (uniform over 6 tokens: log 6 = {r(Math.log(6), 2)}). {scaled ? 'Scaled, the weights stay spread out as d grows.' : 'Unscaled, the scores grow like √d and each row collapses onto one token — its gradient to the others nearly vanishes.'}</Readout>
  </div>
}

// ---------- 26.3 ----------
export function MaskAndPositions() {
  const [causal, setCausal] = useState(true), [pos, setPos] = useState(false), [swap, setSwap] = useState(false)
  const T = 5, d = 8
  const base = useMemo(() => randomMatrix(T, d, 9), [])
  const X = (swap ? [base[1], base[0], ...base.slice(2)] : base).map((row, i) => (pos ? row.map((v, j) => v + sinusoidal(T, d)[i][j]) : row))
  const { weights } = attention(X, X, X, { causal })
  return <div>
    <Controls>
      <Check label="causal mask" checked={causal} onChange={setCausal} />
      <Check label="add positional encodings" checked={pos} onChange={setPos} />
      <Check label="swap the first two tokens" checked={swap} onChange={setSwap} />
    </Controls>
    <WeightGrid W={weights} label={`Self-attention weights for 5 tokens${causal ? ' with a causal mask' : ''}${pos ? ', with positions' : ''}${swap ? ', first two swapped' : ''}`} />
    <Readout>{causal ? `Everything above the diagonal is exactly 0: token i reads only tokens 0…i (${T * (T - 1) / 2} of ${T * T} entries masked). ` : 'Every token reads every token. '}{pos ? 'With positions added, swapping two tokens changes the weights themselves, not just their order.' : 'Without positions, swapping two tokens only swaps the matching rows and columns: attention sees a set.'}</Readout>
  </div>
}

// ---------- 26.4 ----------
export function BlockTable() {
  const [d, setD] = useState(256), [heads, setHeads] = useState(8), [T, setT] = useState(128)
  const valid = d % heads === 0
  const rows = valid ? blockShapes(T, d, heads) : []
  const total = rows.reduce((s, row) => s + row[2], 0)
  return <div>
    <Controls>
      <Slider label="width d" value={d} min={64} max={1024} step={64} onChange={setD} digits={0} />
      <Slider label="heads h" value={heads} min={1} max={16} step={1} onChange={setHeads} digits={0} />
      <Slider label="tokens T" value={T} min={16} max={1024} step={16} onChange={setT} digits={0} />
    </Controls>
    {valid ? <table className="ml-fig-table">
      <caption>One transformer block, d = {d}, {heads} heads of width {d / heads}, T = {T}</caption>
      <thead><tr><th scope="col">Step</th><th scope="col">Shape</th><th scope="col">Parameters</th></tr></thead>
      <tbody>{rows.map(([step, shape, p]) => <tr key={step}><th scope="row" style={{ textAlign: 'left' }}>{step}</th><td>{shape}</td><td>{p.toLocaleString('en')}</td></tr>)}</tbody>
    </table> : <Readout>d = {d} is not divisible by {heads} heads: each head needs a whole number of dimensions.</Readout>}
    {valid && <Readout>{total.toLocaleString('en')} parameters per block (12d² = {(12 * d * d).toLocaleString('en')}). The score arrays hold h·T² = {(heads * T * T).toLocaleString('en')} numbers per sequence: double T and they quadruple.</Readout>}
  </div>
}
