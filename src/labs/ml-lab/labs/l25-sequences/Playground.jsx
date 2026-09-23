import React, { useMemo, useState } from 'react'
import { VOCAB, MAXLEN, makeSequences, train, accuracy, rnnForward, pad, predict } from './engine.js'
import { pca, project } from '../l18-pca/engine.js'
import { Plot, Path, Heatmap, extent } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Actions, Caption, Warning } from '../../kit/ui.jsx'
import { pct, fmt } from '../../kit/math.js'

export default function Playground() {
  const [kind, setKind] = useState('rnn'), [masked, setMasked] = useState(true), [shortcut, setShortcut] = useState(false), [padTo, setPadTo] = useState(8)
  const [result, setResult] = useState(null), [busy, setBusy] = useState(false), [pick, setPick] = useState(0)
  const test = useMemo(() => makeSequences(300, 2), [])
  const run = () => { setBusy(true); setTimeout(() => { const data = makeSequences(300, 1, { shortcut }); const r = train(data, { kind, masked }); setResult({ ...r, data, kind, masked, shortcut }); setBusy(false) }, 20) }
  const stale = result && (result.kind !== kind || result.masked !== masked || result.shortcut !== shortcut)
  const ex = test[pick % test.length]
  const emb = result ? (() => { const m = pca(result.M.E); return result.M.E.map(e => project(e, m, 2)) })() : null
  const trace = result && result.kind === 'rnn' ? rnnForward(result.M, pad(ex.seq, padTo), result.masked) : null
  return <>
    <PanelHeading title="Order matters — can the model see it?" pill={result ? `${result.kind === 'rnn' ? 'RNN' : 'mean of embeddings'} · ${pct(accuracy(result.M, test, result.kind, result.masked, padTo))} test` : 'untrained'} />
    <Caption>Each example is a sequence of operations events. The label is 1 when an **error happens after a deploy**; “error … deploy” is label 0. Both contain the same tokens — only their order differs.</Caption>
    <Controls>
      <Choice label="Model" value={kind} onChange={setKind} options={[['pool', 'Mean of token embeddings → logistic'], ['rnn', 'Recurrent network (RNN, 8 hidden units)']]} />
      <Slider label="Pad test sequences to length" value={padTo} min={8} max={24} step={4} onChange={setPadTo} />
      <div className="ml-toggles"><Toggle label="Mask padding (skip <pad> steps)" checked={masked} onChange={setMasked} /><Toggle label="Add a shortcut token to the training data" checked={shortcut} onChange={setShortcut} /></div>
    </Controls>
    <Actions><button className="ml-primary" disabled={busy} onClick={run}>{busy ? 'Training (250 Adam steps)…' : 'Train'}</button></Actions>
    {stale && <Warning>Settings changed since training — press Train again.</Warning>}
    {result && <>
      <Metrics items={[['Training accuracy', pct(accuracy(result.M, result.data, result.kind, result.masked))], ['Test accuracy (padded to 8)', pct(accuracy(result.M, test, result.kind, result.masked, MAXLEN))], [`Test accuracy (padded to ${padTo})`, pct(accuracy(result.M, test, result.kind, result.masked, padTo))], ['Base rate (always 0)', pct(1 - test.filter(t => t.label).length / test.length)]]} />
      <Plot x={[0, 250]} y={[0, Math.max(0.8, ...result.curve.map(c => c[1]))]} height={160} xLabel="Adam step" yLabel="training loss" label="Training loss">{({ X, Y }) => <Path X={X} Y={Y} points={result.curve} />}</Plot>
      <div className="ml-grid-2">
        <div>
          <p className="ml-caption">Learned embedding table (4 numbers per token, shown by its first two principal components). Tokens that play similar roles move together.</p>
          <Plot x={extent(emb.map(e => e[0]), 0.25)} y={extent(emb.map(e => e[1]), 0.25)} width={320} height={260} label="Token embeddings">{({ X, Y }) => emb.map((e, i) => <g key={i}><circle cx={X(e[0])} cy={Y(e[1])} r="4" fill={i === 1 || i === 2 ? 'var(--chart-val)' : i === 9 ? 'var(--text)' : 'var(--chart-train)'} /><text x={X(e[0]) + 6} y={Y(e[1]) + 4} style={{ fill: 'var(--text)', fontSize: 11 }}>{VOCAB[i]}</text></g>)}</Plot>
        </div>
        <div>
          <p className="ml-caption">Inspect one test sequence</p>
          <Slider label="Example" value={pick} min={0} max={50} onChange={setPick} />
          <p className="ml-mono">{pad(ex.seq, padTo).map(t => VOCAB[t]).join(' → ')}</p>
          <Metrics items={[['True label', ex.label], ['P(label 1)', fmt(predict(result.M, ex.seq, result.kind, result.masked, padTo), 3)]]} />
        </div>
      </div>
      {trace && <>
        <p className="ml-caption">Hidden state after each step (rows = 8 hidden units, columns = time). With masking, padded steps copy the previous state; without it, every &lt;pad&gt; rewrites the memory.</p>
        <Heatmap label="RNN hidden state over time" matrix={trace.hs[0].map((_, j) => trace.hs.slice(1).map(h => h[j]))} colLabels={pad(ex.seq, padTo).map(t => VOCAB[t].replace(/[<>[\]]/g, '').slice(0, 4))} max={1} digits={1} cell={Math.max(22, Math.min(40, 560 / padTo))} />
      </>}
    </>}
    <Insight title="Three lessons in one experiment">
      <ul>
        <li>Averaging embeddings throws away order: “deploy … error” and “error … deploy” get the same representation, so the pooled model stays near the base rate.</li>
        <li>The RNN carries a hidden state through time and learns the rule. Trained without masking, it adapts to exactly 8-step padding — pad the test data to 16 and its memory is overwritten by pads. Masking makes it indifferent to padding length.</li>
        <li>With the shortcut token on, the pooled model “learns” the token instead of the rule: high training accuracy, poor clean-test accuracy. That is shortcut learning, and only evaluation on data without the artifact reveals it.</li>
      </ul>
    </Insight>
  </>
}
