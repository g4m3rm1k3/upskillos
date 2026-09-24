import React, { useMemo, useState } from 'react'
import { normalize, entropy, crossEntropy, kl, huffman, codewords, avgLength, textStats, RELATIONS, sampleRelation, correlation, miBinned } from './engine.js'
import { Plot, Path, Bars } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Caption, Legend, Table } from '../../kit/ui.jsx'
import { fmt } from '../../kit/math.js'

const SYMS = ['build passed', 'build failed', 'flaky test', 'timeout']

function CodingView() {
  const [w, setW] = useState([8, 4, 2, 2]), [v, setV] = useState([3, 6, 3, 4])
  const p = normalize(w), q = normalize(v), L = huffman(p), Lq = huffman(q), cw = codewords(L)
  const setOne = (arr, set, i) => x => set(arr.map((a, j) => j === i ? x : a))
  return <>
    <Caption>A CI system reports one of four outcomes per build. How many bits does it take, on average, to transmit a long log of outcomes? Set how often each outcome really happens (p) and what a model believes (q).</Caption>
    <Controls>{SYMS.map((s, i) => <Slider key={s} label={`p: ${s} (${(100 * p[i]).toFixed(0)}%)`} value={w[i]} min={0.2} max={16} step={0.2} onChange={setOne(w, setW, i)} format={() => ''} />)}</Controls>
    <Table head={['outcome', 'probability p', 'surprise −log₂ p (bits)', 'Huffman codeword', 'length']} rows={SYMS.map((s, i) => [s, fmt(p[i], 3), fmt(-Math.log2(p[i]), 3), cw[i], L[i]])} />
    <Metrics items={[['Entropy H(p)', `${fmt(entropy(p), 3)} bits`], ['Huffman average length', `${fmt(avgLength(p, L), 3)} bits`], ['Maximum (uniform, 4 outcomes)', '2 bits']]} />
    <h3>Now use a code built for the wrong distribution</h3>
    <Controls>{SYMS.map((s, i) => <Slider key={s} label={`q: ${s} (${(100 * q[i]).toFixed(0)}%)`} value={v[i]} min={0.2} max={16} step={0.2} onChange={setOne(v, setV, i)} format={() => ''} />)}</Controls>
    <Bars label="Average bits per outcome when the data follow p" format={x => `${x.toFixed(3)} bits`} items={[{ label: 'H(p): best possible', value: entropy(p) }, { label: 'H(p, q): ideal q-code', value: crossEntropy(p, q) }, { label: 'Huffman code for q', value: avgLength(p, Lq) }]} />
    <Metrics items={[['KL(p ‖ q): extra bits per outcome', fmt(kl(p, q), 3)], ['KL(q ‖ p): the other direction', fmt(kl(q, p), 3)], ['Log-loss of q on data from p (nats)', fmt(crossEntropy(p, q) * Math.LN2, 3)]]} />
    <Insight title="What to notice">Entropy is the average surprise, and no code can beat it: Huffman gets within one bit, and exactly to it when probabilities are powers of ½. Coding with the wrong model q costs the **cross-entropy**, and the excess — **KL(p ‖ q)** — is never negative and zero only when q = p. That excess is exactly what training a classifier with log-loss minimizes. Note that KL is not symmetric.</Insight>
  </>
}

function TextView() {
  const s = useMemo(() => textStats(), [])
  const letters = 'abcdefghijklmnopqrstuvwxyz␣'.split('')
  return <>
    <Caption>{`A ${s.n}-character English passage (letters and spaces). How predictable is the next character under three models?`}</Caption>
    <Bars label="Bits per character" format={x => `${x.toFixed(2)} bits`} items={[{ label: 'uniform (27 symbols)', value: s.uniform }, { label: 'letter frequencies', value: s.unigram }, { label: 'given previous letter', value: s.bigram }]} />
    <Plot x={[0, 26]} y={[0, Math.max(...s.p) * 1.1]} height={180} xTicks={27} xFormat={v => letters[Math.round(v)] ?? ''} yFormat={v => `${(100 * v).toFixed(0)}%`} xLabel="character" yLabel="frequency" label="Character frequencies">{({ X, Y }) => s.p.map((v, i) => <rect key={i} x={X(i) - 6} y={Y(v)} width={12} height={Y(0) - Y(v)} fill="var(--chart-model)" />)}</Plot>
    <Metrics items={[['Perplexity, uniform', fmt(2 ** s.uniform, 1)], ['Perplexity, unigram', fmt(2 ** s.unigram, 1)], ['Perplexity, bigram', fmt(2 ** s.bigram, 1)]]} />
    <Insight title="What to notice">Each model that captures more structure needs fewer bits: letter frequencies save about 0.7 bits per character over guessing uniformly, and knowing the previous letter saves about another bit. **Perplexity** 2^H is the effective number of equally likely choices — the standard score for language models (Lab 55). Careful: the bigram estimate is measured on the same short text it was counted from, so it is optimistic — held-out text would score worse, just as with any model (Lab 06).</Insight>
  </>
}

function MIView() {
  const [rel, setRel] = useState('quadratic'), [bins, setBins] = useState(8)
  const pts = useMemo(() => sampleRelation(rel), [rel]), shuffled = useMemo(() => { const ys = sampleRelation(rel, 600, 99).map(p => p.y); return pts.map((p, i) => ({ x: p.x, y: ys[(i * 7919) % ys.length] })) }, [pts, rel])
  const table = useMemo(() => Object.entries(RELATIONS).map(([k, r]) => { const s = sampleRelation(k); return [r.name, fmt(correlation(s), 3), fmt(miBinned(s, bins), 3)] }), [bins])
  return <>
    <Controls>
      <Choice label="Relationship" value={rel} onChange={setRel} options={Object.entries(RELATIONS).map(([k, r]) => [k, r.name])} />
      <Slider label="Bins per axis for the MI estimate" value={bins} min={2} max={20} onChange={setBins} />
    </Controls>
    <Plot x={[-2.2, 2.2]} y={[-3, 5]} height={250} xLabel="x" yLabel="y" label="Samples">{({ X, Y }) => pts.map((p, i) => <circle key={i} cx={X(p.x)} cy={Y(Math.max(-3, Math.min(5, p.y)))} r="2" fill="var(--chart-model)" opacity="0.5" />)}</Plot>
    <Metrics items={[['Correlation', fmt(correlation(pts), 3)], ['Mutual information (binned)', `${fmt(miBinned(pts, bins), 3)} bits`], ['MI after shuffling y (should be 0)', `${fmt(miBinned(shuffled, bins), 3)} bits`]]} />
    <Table head={['relationship', 'correlation', `mutual information (${bins} bins)`]} rows={table} caption="600 samples each. Correlation only sees straight-line dependence; mutual information sees any dependence." />
    <Insight title="What to notice">For the U-shape, y is almost completely determined by x, yet the correlation is about 0 — while the mutual information is large. MI measures how much knowing x reduces uncertainty about y, whatever the shape. But estimating it from samples is biased upward: shuffle y (breaking any relation) and the estimate is still above 0, and more so with many bins. Always compare against a shuffled baseline.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('coding')
  return <>
    <PanelHeading title="Bits, surprise and the price of a wrong model." pill="information theory" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['coding', 'Entropy, codes, cross-entropy and KL'], ['text', 'How predictable is English?'], ['mi', 'Mutual information versus correlation']]} /></Controls>
    {view === 'coding' ? <CodingView /> : view === 'text' ? <TextView /> : <MIView />}
  </>
}
