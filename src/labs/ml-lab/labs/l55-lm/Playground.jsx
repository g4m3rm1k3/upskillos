import React, { useMemo, useState } from 'react'
import { TRAIN_TEXT, TEST_TEXT, VOCAB, learnBPE, applyBPE, ngramModel, interpolatedModel, bitsPerChar, trainNeural, sample, perplexity } from './engine.js'
import { Plot, Path } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Caption, Legend, Table } from '../../kit/ui.jsx'
import { fmt } from '../../kit/math.js'

const cache = {}
const memo = (k, f) => cache[k] ?? (cache[k] = f())
const TEMPS = [0.3, 0.5, 0.8, 1, 1.3, 1.8]
const shown = t => t.replace(/\n/g, '⏎ ')

function Sampler({ model, label }) {
  const [ti, setTi] = useState(2), [topK, setTopK] = useState(0), [seed, setSeed] = useState(1)
  const text = useMemo(() => sample(model, 'the ', 160, { temperature: TEMPS[ti], topK, seed }), [model, ti, topK, seed])
  const copied = useMemo(() => { let best = 0; for (let i = 4; i < text.length; i++) for (let L = best + 1; i + L <= text.length; L++) { if (TRAIN_TEXT.includes(text.slice(i, i + L))) best = L; else break } return best }, [text])
  return <>
    <Controls>
      <Slider label="Temperature" value={ti} min={0} max={TEMPS.length - 1} onChange={setTi} format={i => TEMPS[i]} />
      <Slider label="Top-k (0 = off)" value={topK} min={0} max={10} onChange={setTopK} />
      <Slider label="Sampling seed" value={seed} min={1} max={9} onChange={setSeed} />
    </Controls>
    <p className="ml-mono" style={{ whiteSpace: 'pre-wrap', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>{shown(text)}</p>
    <Caption>{`${label}. Longest stretch copied verbatim from the training text: ${copied} characters.`}</Caption>
  </>
}

function TokenView() {
  const [merges, setMerges] = useState(40)
  const rules = useMemo(() => learnBPE(TRAIN_TEXT, merges), [merges]), toks = useMemo(() => applyBPE(TEST_TEXT, rules), [rules])
  return <>
    <Controls><Slider label="BPE merges learned from the training text" value={merges} min={0} max={200} step={5} onChange={setMerges} /></Controls>
    <div style={{ lineHeight: 2, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{toks.slice(0, 140).map((t, i) => /\s/.test(t) ? <span key={i}>{' '}</span> : <span key={i} style={{ background: i % 2 ? 'color-mix(in srgb, var(--chart-model) 22%, transparent)' : 'color-mix(in srgb, var(--chart-val) 22%, transparent)', borderRadius: 3, padding: '1px 2px', margin: '0 1px' }}>{t}</span>)}</div>
    <Metrics items={[['Vocabulary size', String(VOCAB.length + rules.length)], ['Held-out text: characters', String(TEST_TEXT.length)], ['… tokens', String(toks.length)], ['Characters per token', fmt(TEST_TEXT.length / toks.length, 2)]]} />
    <Caption>{`First merges: ${rules.slice(0, 12).map(r => `“${r.a}” + “${r.b}”`).join(', ') || 'none yet'}.`}</Caption>
    <Insight title="What to notice">Byte-pair encoding starts from characters and repeatedly merges the most frequent adjacent pair into a new token. Common words (“the”, “model”) become single tokens; rare words stay split into pieces, so nothing is ever out of vocabulary. More merges mean fewer tokens per text — shorter sequences for the model — at the cost of a bigger vocabulary. Real tokenizers do the same with tens of thousands of merges over bytes.</Insight>
  </>
}

function NgramView() {
  const [n, setN] = useState(4), [kind, setKind] = useState('interp')
  const model = useMemo(() => memo(`ng${n}${kind}`, () => kind === 'interp' ? interpolatedModel(TRAIN_TEXT, n) : ngramModel(TRAIN_TEXT, n, kind === 'none' ? 0 : 0.1)), [n, kind])
  const rows = useMemo(() => [1, 2, 3, 4, 5, 6].map(k => { const m = [ngramModel(TRAIN_TEXT, k, 0), ngramModel(TRAIN_TEXT, k, 0.1), interpolatedModel(TRAIN_TEXT, k)]; return [k, ...m.map(x => { const b = bitsPerChar(x, TEST_TEXT); return Number.isFinite(b) ? fmt(b, 2) : '∞' })] }), [])
  const tr = bitsPerChar(model, TRAIN_TEXT), te = bitsPerChar(model, TEST_TEXT)
  return <>
    <Controls>
      <Slider label="Order n (characters of context + 1)" value={n} min={1} max={6} onChange={setN} />
      <Choice label="Smoothing" value={kind} onChange={setKind} options={[['none', 'None (maximum likelihood)'], ['addk', 'Add-k (k = 0.1)'], ['interp', 'Interpolate with shorter contexts']]} />
    </Controls>
    <Metrics items={[['Training bits per character', fmt(tr, 3)], ['Held-out bits per character', Number.isFinite(te) ? fmt(te, 3) : '∞'], ['Held-out perplexity', Number.isFinite(te) ? fmt(perplexity(te), 2) : '∞'], ['Uniform guessing', `${fmt(Math.log2(VOCAB.length), 2)} bits`]]} />
    <Table head={['n', 'no smoothing', 'add-k 0.1', 'interpolated']} rows={rows} caption="Held-out bits per character for every order and smoothing method. Lower is better; ∞ means some held-out character had probability 0." />
    <Sampler model={model} label={`Sampled from the ${n}-gram model (${kind === 'interp' ? 'interpolated' : kind === 'addk' ? 'add-k' : 'unsmoothed'})`} />
    <Insight title="What to notice">Without smoothing, a single unseen character in the held-out text has probability 0 and the perplexity is infinite. Add-k gives unseen events a little mass, but longer contexts are mostly unseen, so they overfit: training bits keep falling while held-out bits rise. Interpolating with shorter contexts fixes that and is the best model here. Low temperature produces fluent text — largely copied from the training data; high temperature invents gibberish.</Insight>
  </>
}

function NeuralView() {
  const [ctx, setCtx] = useState('3')
  const run = useMemo(() => memo(`nn${ctx}`, () => trainNeural({ context: Number(ctx), epochs: 6 })), [ctx])
  const best = useMemo(() => bitsPerChar(interpolatedModel(TRAIN_TEXT, 5), TEST_TEXT), [])
  const bestEpoch = run.curve.reduce((b, c) => (c.test < b.test ? c : b))
  return <>
    <Controls><Choice label="Context length (previous characters)" value={ctx} onChange={setCtx} options={['2', '3', '5']} /></Controls>
    <Caption>{`A neural language model: the previous ${ctx} characters (one-hot) feed a 48-unit tanh layer and a softmax over ${VOCAB.length} characters. Trained with cross-entropy and Adam for 6 epochs.`}</Caption>
    <Plot x={[1, 6]} y={[1.4, 3.5]} height={220} xTicks={6} xFormat={v => Math.round(v)} xLabel="epoch" yLabel="bits per character" label="Neural language model training">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={[[1, best], [6, best]]} stroke="var(--muted)" width={1.5} dash="6 4" />
      <Path X={X} Y={Y} points={run.curve.map(c => [c.epoch, c.train])} stroke="var(--chart-train)" width={2.3} />
      <Path X={X} Y={Y} points={run.curve.map(c => [c.epoch, c.test])} stroke="var(--chart-val)" width={2.6} />
    </>}</Plot>
    <Legend items={[['━', 'training', 'var(--chart-train)'], ['━', 'held-out', 'var(--chart-val)'], ['┄', `best n-gram (interpolated 5-gram): ${fmt(best, 2)} bits`, 'var(--muted)']]} />
    <Metrics items={[['Best held-out bits per character', `${fmt(bestEpoch.test, 3)} (epoch ${bestEpoch.epoch})`], ['Perplexity', fmt(perplexity(bestEpoch.test), 2)], ['Parameters', String(Number(ctx) * VOCAB.length * 48 + 48 + 48 * VOCAB.length + VOCAB.length)]]} />
    <Sampler model={run.model} label="Sampled from the neural model" />
    <Insight title="What to notice">The neural model learns a representation shared across contexts, so it can generalize to character sequences it has not seen exactly. With a context of 5 it overfits this 2,000-character corpus after a few epochs (held-out bits rise) — early stopping again. On so little data a well-smoothed n-gram is still competitive; neural models win decisively with far more data, longer contexts and attention (Lab 26). Large language models are this same next-token objective at enormous scale.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('ngram')
  return <>
    <PanelHeading title="Predict the next character — and you have a language model." pill="language models" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['tokens', 'Tokenization with byte-pair encoding'], ['ngram', 'n-gram models, smoothing and sampling'], ['neural', 'A neural language model']]} /></Controls>
    {view === 'tokens' ? <TokenView /> : view === 'ngram' ? <NgramView /> : <NeuralView />}
  </>
}
