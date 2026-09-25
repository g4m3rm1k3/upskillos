// Figures placed between the paragraphs of Lab 11 (11.1–11.6).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Readout, Bars, Table, r } from '../../kit/fig.jsx'
import { CORPUS, tokenize, splitCorpus, fit, explain, accuracy } from './engine.js'

const SPLIT = splitCorpus(1)
function TextBox({ value, onChange, label }) {
  return <label style={{ flex: '1 1 100%' }}>{label} <input type="text" value={value} onChange={e => onChange(e.target.value)} aria-label={label} style={{ width: '100%', maxWidth: 460 }} /></label>
}
const Chip = ({ children, dim }) => <span style={{ display: 'inline-block', padding: '2px 8px', margin: 2, borderRadius: 10, background: dim ? 'transparent' : 'color-mix(in srgb, var(--accent) 18%, transparent)', border: '1px solid var(--border)', opacity: dim ? 0.55 : 1, fontSize: 13 }}>{children}</span>

// ---------- 11.1 ----------
export function Tokenizer() {
  const [text, setText] = useState('Disk FULL on agent-7!'), toks = tokenize(text)
  return <div>
    <Controls><TextBox label="message" value={text} onChange={setText} /></Controls>
    <p>{toks.length ? toks.map((t, i) => <Chip key={i}>{t}</Chip>) : <span className="ml-caption">no tokens</span>}</p>
    <Readout>{toks.length} tokens: lowercase, then runs of letters and digits. Punctuation and hyphens split words; “agent-7” became two tokens.</Readout>
  </div>
}

export function BagOfWords() {
  const [text, setText] = useState('error error timeout on the database'), model = useMemo(() => fit(SPLIT.train), [])
  const toks = tokenize(text), counts = new Map(); toks.forEach(t => counts.set(t, (counts.get(t) ?? 0) + 1))
  const known = [...counts].filter(([w]) => model.vocab.has(w)), unknown = [...counts].filter(([w]) => !model.vocab.has(w))
  return <div>
    <Controls><TextBox label="message" value={text} onChange={setText} /></Controls>
    <Table head={['word', 'column in the vocabulary', 'count']} rows={known.map(([w, c]) => [w, [...model.vocab].indexOf(w), c])} label="Non-zero entries of the bag-of-words vector" />
    <Readout>The vocabulary (from {SPLIT.train.length} training messages) has {model.V} words; this vector has {model.V} entries, only {known.length} of them non-zero. {unknown.length ? <>Not in the vocabulary, ignored: {unknown.map(([w]) => <Chip key={w} dim>{w}</Chip>)}</> : 'Every word was seen in training.'} Word order is gone.</Readout>
  </div>
}

// ---------- 11.2–11.3 ----------
const WORDS = ['error', 'timeout', 'deployed', 'critical', 'completed', 'database', 'backup', 'users']
export function WordLikelihoods() {
  const [alpha, setAlpha] = useState(1), model = useMemo(() => fit(SPLIT.train, alpha), [alpha])
  return <div>
    <Controls><Slider label="α (smoothing)" value={alpha} min={0.01} max={5} step={0.01} onChange={setAlpha} /></Controls>
    <Table head={['word', 'count in incidents', 'count in routine', 'P(w | incident)', 'P(w | routine)']} rows={WORDS.filter(w => model.vocab.has(w)).map(w => [w, model.counts[1].get(w) ?? 0, model.counts[0].get(w) ?? 0, r(Math.exp(model.logLik(1, w)), 4), r(Math.exp(model.logLik(0, w)), 4)])} label="Word counts and smoothed probabilities by class" />
    <Readout>Priors: P(incident) = {model.docs[1]}/{SPLIT.train.length} = {r(model.docs[1] / SPLIT.train.length, 3)}. Tokens per class: {model.totals[1]} incident, {model.totals[0]} routine; V = {model.V}. P(w | c) = (count + α)/(total + α·V) — a zero count still gets a small probability.</Readout>
  </div>
}

export function SmoothingBars() {
  const [alpha, setAlpha] = useState(1), model = useMemo(() => fit(SPLIT.train, alpha), [alpha]), ws = ['error', 'failed', 'completed', 'deployed', 'backup'].filter(w => model.vocab.has(w))
  return <div>
    <Controls><Slider label="α" value={alpha} min={0} max={10} step={0.05} onChange={setAlpha} /></Controls>
    <Bars items={ws.map(w => ({ label: `${w} (${model.counts[1].get(w) ?? 0})`, value: Math.exp(model.logLik(1, w)), highlight: !(model.counts[1].get(w) ?? 0) }))} digits={4} label="P(word | incident)" />
    <Readout>P(word | incident), with each word’s raw count in brackets. {alpha === 0 ? 'At α = 0 the zero-count words get probability exactly 0 — one of them would veto the incident class.' : `Zero-count words now get (0 + ${r(alpha, 2)})/(${model.totals[1]} + ${r(alpha, 2)}×${model.V}) = ${r(alpha / (model.totals[1] + alpha * model.V), 4)}. Larger α flattens everything toward uniform.`}</Readout>
  </div>
}

// ---------- 11.4 ----------
export function Underflow() {
  const [m, setM] = useState(50), product = Math.pow(0.001, m)
  return <div>
    <Controls><Slider label="words in the document" value={m} min={1} max={400} step={1} onChange={setM} digits={0} /></Controls>
    <Table head={['computation', 'value']} rows={[['product of 0.001 × … × 0.001', product === 0 ? '0 (underflow)' : product.toExponential(3)], ['sum of log 0.001', r(m * Math.log(0.001), 3)]]} label="Product versus sum of logs" />
    <Readout>{product === 0 ? 'The product rounded to exactly 0 — for every class, so they can no longer be compared.' : 'Still representable, but not for long: past about 100 words of probability 0.001 the product becomes 0.'} The log sum is an ordinary number however long the document.</Readout>
  </div>
}

export function LogOddsBars() {
  const [text, setText] = useState('database timeout error'), model = useMemo(() => fit(SPLIT.train), []), ex = explain(model, text)
  return <div>
    <Controls><TextBox label="message" value={text} onChange={setText} /></Controls>
    <Bars items={[{ label: 'prior', value: ex.prior, color: 'var(--muted)' }, ...ex.rows.map(row => ({ label: row.word, value: row.contribution, color: !row.known ? 'var(--border)' : row.contribution > 0 ? 'var(--chart-val)' : 'var(--chart-train)' }))]} min={-3} max={3} digits={2} label="Contribution of each word to the log-odds" />
    <Readout>log-odds = {r(ex.prior, 2)} {ex.rows.map(row => `${row.contribution >= 0 ? '+' : '−'} ${r(Math.abs(row.contribution), 2)}`).join(' ')} = <strong>{r(ex.logOdds, 3)}</strong>; P(incident) = σ({r(ex.logOdds, 2)}) = <strong>{r(ex.p, 3)}</strong>. Orange pushes toward incident, blue toward routine; grey words are unknown.</Readout>
  </div>
}

// ---------- 11.5 ----------
export function RepeatedEvidence() {
  const [n, setN] = useState(1), model = useMemo(() => fit(SPLIT.train), []), ex = explain(model, Array(n).fill('error').join(' ')), per = model.logLik(1, 'error') - model.logLik(0, 'error')
  return <div>
    <Controls><Slider label="copies of “error”" value={n} min={1} max={10} step={1} onChange={setN} digits={0} /></Controls>
    <Bars items={[{ label: 'log-odds', value: ex.logOdds, highlight: true }, { label: 'P(incident)', value: ex.p, color: 'var(--chart-val)' }]} min={0} max={Math.max(3, ex.logOdds)} digits={3} />
    <Readout>Each copy adds {r(per, 3)}: {n} copies → log-odds {r(ex.logOdds, 3)}, P = <strong>{r(ex.p, 4)}</strong>. Typing the same word again is not new evidence, but the model counts it as if it were.</Readout>
  </div>
}

// ---------- 11.6 ----------
export function HonestEvaluation() {
  const [seed, setSeed] = useState(1), [alpha, setAlpha] = useState(1), sp = useMemo(() => splitCorpus(seed), [seed]), model = useMemo(() => fit(sp.train, alpha), [sp, alpha])
  const majority = sp.train.filter(t => t.label === 1).length * 2 >= sp.train.length ? 1 : 0, acc = accuracy(model, sp.validation), base = sp.validation.filter(d => d.label === majority).length / sp.validation.length
  const wrong = sp.validation.filter(d => (explain(model, d.text).p >= 0.5 ? 1 : 0) !== d.label)
  return <div>
    <Controls><button onClick={() => setSeed(s => s + 1)}>New split (seed {seed})</button><Slider label="α" value={alpha} min={0.1} max={5} step={0.1} onChange={setAlpha} digits={1} /></Controls>
    <Table head={['misclassified validation message', 'true label', 'P(incident)']} rows={wrong.map(d => [d.text, d.label ? 'incident' : 'routine', r(explain(model, d.text).p, 3)])} label="Validation errors" />
    <Readout>{sp.train.length} training, {sp.validation.length} validation messages; vocabulary from training only. Accuracy <strong>{r(acc * 100, 1)}%</strong> vs majority-class baseline {r(base * 100, 1)}%. {wrong.length ? 'Read each error and ask which of its words misled the model — the word contributions in the previous lesson’s figure show exactly that.' : 'No errors on this split — try another seed before believing it.'}</Readout>
  </div>
}
