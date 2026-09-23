import React, { useMemo, useState } from 'react'
import { attention, sinusoidal, randomMatrix, matmul, entropy, SERVICES, LATENCY, lookup, dotSpread, blockShapes } from './engine.js'
import { Plot, Path, Heatmap, Bars } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Actions, Table, Caption } from '../../kit/ui.jsx'
import { fmt, linspace } from '../../kit/math.js'

const WORDS = ['the', 'deploy', 'on', 'friday', 'caused', 'an', 'error', 'in', 'checkout']

export default function Playground() {
  const [view, setView] = useState('lookup')
  const [angle, setAngle] = useState(150), [beta, setBeta] = useState(4)
  const [d, setD] = useState(16), [scale, setScale] = useState(true), [causal, setCausal] = useState(false), [usePE, setUsePE] = useState(false), [projected, setProjected] = useState(true), [perm, setPerm] = useState(false), [seed, setSeed] = useState(2)
  const [T, setT] = useState(128), [dm, setDm] = useState(256), [heads, setHeads] = useState(8)
  const lk = lookup(angle, beta)
  const order = perm ? [2, 0, 1, 3, 4, 5, 6, 7, 8] : range9()
  const att = useMemo(() => {
    const E = randomMatrix(WORDS.length, d, seed), X0 = order.map(i => E[i]), P = sinusoidal(WORDS.length, d)
    const X = usePE ? X0.map((r, t) => r.map((v, j) => v + P[t][j])) : X0
    const Wq = randomMatrix(d, d, seed + 1, 1 / Math.sqrt(d)), Wk = randomMatrix(d, d, seed + 2, 1 / Math.sqrt(d))
    const Q = projected ? matmul(X, Wq) : X, K = projected ? matmul(X, Wk) : X
    return attention(Q.map(r => r.map(v => v * 2)), K, X, { scale, causal })
  }, [d, scale, causal, usePE, projected, order.join(), seed]) // eslint-disable-line react-hooks/exhaustive-deps
  const labels = order.map(i => WORDS[i])
  const rows = blockShapes(T, dm, heads), params = rows.reduce((t, r) => t + r[2], 0)
  return <>
    <PanelHeading title={{ lookup: 'Attention is a soft dictionary lookup.', self: 'Every token looks at every other token.', block: 'Inside one transformer block.' }[view]} pill={view === 'block' ? `${params.toLocaleString()} parameters / block` : view === 'self' ? `d = ${d}` : `β = ${beta}`} />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['lookup', 'Soft lookup: query, keys, values'], ['self', 'Self-attention on a sentence'], ['block', 'Transformer block: shapes and parameters']]} /></Controls>
    {view === 'lookup' && <>
      <Caption>Six services, each with a **key** (a direction) and a **value** (its latency in ms). A **query** asks “which service?” as a direction too. Scores are dot products q·k scaled by β; softmax turns them into weights; the answer is the weighted average of values.</Caption>
      <Controls><Slider label="Query direction" value={angle} min={0} max={359} onChange={setAngle} format={v => `${v}°`} /><Slider label="Sharpness β (scale of the scores)" value={beta} min={0} max={30} step={0.5} onChange={setBeta} /></Controls>
      <div className="ml-grid-2">
        <Plot x={[-1.5, 1.5]} y={[-1.3, 1.3]} width={320} height={280} grid={false} label="Keys and query on the unit circle">{({ X, Y }) => <>
          <circle cx={X(0)} cy={Y(0)} r={X(1) - X(0)} fill="none" stroke="var(--border)" />
          {lk.keys.map((k, i) => <g key={i}><line x1={X(0)} y1={Y(0)} x2={X(k[0])} y2={Y(k[1])} stroke="var(--chart-train)" strokeWidth={1 + 6 * lk.w[i]} opacity={0.3 + 0.7 * lk.w[i]} /><text x={X(k[0] * 1.2)} y={Y(k[1] * 1.2) + 4} textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 11 }}>{SERVICES[i][0]}</text></g>)}
          <line x1={X(0)} y1={Y(0)} x2={X(lk.q[0])} y2={Y(lk.q[1])} stroke="var(--chart-val)" strokeWidth="3" />
        </>}</Plot>
        <Bars label="Attention weights" max={1} format={v => v.toFixed(3)} width={360} items={SERVICES.map(([n], i) => ({ label: `${n} (${LATENCY[i]} ms)`, value: lk.w[i] }))} />
      </div>
      <Metrics items={[['Attention output', `${fmt(lk.out, 1)} ms`], ['Nearest key’s value', `${LATENCY[lk.w.indexOf(Math.max(...lk.w))]} ms`], ['Weight on the best key', fmt(Math.max(...lk.w), 3)], ['Entropy of weights', `${fmt(entropy(lk.w), 3)} nats`]]} />
      <Insight title="Sharpness is everything">β = 0 gives every key the same weight: the output is the plain average of all latencies. Large β concentrates almost all weight on the most similar key: a hard lookup. Because the result is differentiable in the query, the keys and the values, a network can **learn** what to ask for — the core idea of attention.</Insight>
    </>}
    {view === 'self' && <>
      <Controls>
        <Slider label="Embedding size d" value={d} min={2} max={256} step={2} onChange={setD} />
        <label>Seed<input type="number" min="0" max="999" value={seed} onChange={e => e.target.value !== '' && setSeed(Math.max(0, Math.min(999, Math.trunc(+e.target.value))))} /></label>
        <div className="ml-toggles"><Toggle label="Divide scores by √d" checked={scale} onChange={setScale} /><Toggle label="Causal mask (no looking ahead)" checked={causal} onChange={setCausal} /></div>
        <div className="ml-toggles"><Toggle label="Add sinusoidal positional encodings" checked={usePE} onChange={setUsePE} /><Toggle label="Learned-style projections W_Q, W_K" checked={projected} onChange={setProjected} /></div>
      </Controls>
      <Actions><button onClick={() => setPerm(p => !p)}>{perm ? 'Restore original order' : 'Swap the first three words'}</button></Actions>
      <Heatmap label="Attention weights: row = query token, column = key token" matrix={att.weights} rowLabels={labels} colLabels={labels.map(w => w.slice(0, 5))} max={1} digits={2} cell={46} />
      <Metrics items={[['Mean row entropy', `${fmt(att.weights.reduce((t, w) => t + entropy(w), 0) / att.weights.length, 3)} nats`], ['Uniform would be', `${fmt(Math.log(WORDS.length), 3)} nats`], ['Largest single weight', fmt(Math.max(...att.weights.flat()), 3)], ['Typical |q·k| at this d', fmt(dotSpread(d), 1)]]} />
      <Insight title="Things to test">
        <ul>
          <li>Turn off “Divide by √d” and raise d to 256: raw dot products grow like √d, softmax saturates, and most rows become one-hot (entropy near 0) — tiny gradients for every other position.</li>
          <li>Causal mask: every row ignores later columns (zeros above the diagonal). That is how a language model is prevented from reading the word it must predict.</li>
          <li>Swap the first three words without positional encodings: the matrix rows and columns are simply permuted — self-attention has no idea of order. Add positional encodings and the weights genuinely change.</li>
          <li>Attention weights show where information flowed in this layer, not why the model decided anything; many different weight patterns can produce the same prediction.</li>
        </ul>
      </Insight>
    </>}
    {view === 'block' && <>
      <Controls>
        <Slider label="Sequence length T" value={T} min={8} max={2048} step={8} onChange={setT} />
        <Choice label="Model width d" value={String(dm)} onChange={v => setDm(Number(v))} options={['64', '128', '256', '512', '768', '1024']} />
        <Choice label="Heads" value={String(heads)} onChange={v => setHeads(Number(v))} options={['1', '2', '4', '8', '16']} />
      </Controls>
      <Table head={['step', 'shape', 'parameters']} rows={rows.map(([s, shape, p]) => [s, shape, p ? p.toLocaleString() : '—'])} caption={`Total ${params.toLocaleString()} parameters per block — about 12·d² — independent of T. The attention matrix has ${heads} × ${T} × ${T} = ${(heads * T * T).toLocaleString()} entries per sequence: memory and compute grow with T².`} />
      <Plot x={[8, 2048]} y={[0, Math.log10(16 * 2048 * 2048)]} height={200} xLabel="sequence length T" yLabel="attention entries (log₁₀)" label="Attention cost grows quadratically" yFormat={v => (10 ** v).toExponential(0)}>{({ X, Y }) => <>
        <Path X={X} Y={Y} points={linspace(8, 2048, 60).map(t => [t, Math.log10(heads * t * t)])} />
        <circle cx={X(T)} cy={Y(Math.log10(heads * T * T))} r="5" fill="var(--chart-val)" />
      </>}</Plot>
      <Insight title="The block, in words">Normalize each token’s vector (LayerNorm); let every token gather information from others (multi-head attention, each head with its own Q/K/V subspace); add the result back to the input (**residual** connection, a direct path for gradients); normalize again; transform each token independently with a two-layer MLP; add back again. Stack N such blocks, add an embedding layer below and a softmax head on top, and you have a transformer.</Insight>
    </>}
  </>
}
function range9() { return [0, 1, 2, 3, 4, 5, 6, 7, 8] }
