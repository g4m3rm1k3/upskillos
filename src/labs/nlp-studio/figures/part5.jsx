import { useEffect, useMemo, useRef, useState } from 'react'
import * as L from '../engine/lm.js'
import * as G from '../engine/tinygpt.js'
import * as C from '../engine/counting.js'
import { Rng } from '../engine/vectors.js'
import { count } from '../engine/text.js'
import { SENTENCES } from '../engine/corpus.js'
import { MESSAGES } from '../engine/data.js'
import { TextInput } from './part1.jsx'

const f = (x, d = 3) => (x === Infinity ? '∞' : Number.isInteger(x) ? String(x) : x.toFixed(d))
const Slider = ({ label, value, min, max, step, onChange, format = v => v }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>

import { heldOut, SPLIT } from '../engine/heldout.js'

export function PerplexityDemo() {
  const [k, setK] = useState(0.1)
  const r = useMemo(() => heldOut(k), [k])
  const worst = [...r.rows].sort((x, y) => x.p - y.p).slice(0, 6)
  return <div className="qm-fig">
    <Slider label="Smoothing k" value={k} min={0} max={1} step={0.01} onChange={setK} />
    <p className="qm-small">Trained on {SPLIT} sentences, scored on the other {SENTENCES.length - SPLIT} ({r.rows.length} word pairs it must predict). Vocabulary V = {r.V}.</p>
    <div className="nlp-nb">
      <section><h4>Guessing uniformly</h4><p className="nlp-big">{r.V}</p><p className="qm-small">Every word equally likely: perplexity is exactly V.</p></section>
      <section className="best"><h4>Bigram model, k = {k}</h4><p className="nlp-big">{f(r.perplexity, 1)}</p><p className="qm-small">{r.perplexity === Infinity ? 'Some pair in the test text was never seen, and with k = 0 its probability is 0: log 0 makes the perplexity infinite.' : `As unsure as choosing among about ${Math.round(r.perplexity)} equally likely words at each step.`}</p></section>
    </div>
    <h4 className="qm-small-h">The pairs it found hardest</h4>
    <table className="qm-log nlp-left"><thead><tr><th>Previous word → next word</th><th>P</th><th>−log P</th></tr></thead>
      <tbody>{worst.map((w, i) => <tr key={i}><td className="mono">{w.a} → {w.b}</td><td>{f(w.p, 4)}</td><td>{w.p ? f(-Math.log(w.p), 2) : '∞'}</td></tr>)}</tbody></table>
  </div>
}

const MESSAGE_BIGRAMS = C.bigramModel(C.words(MESSAGES.map(([t]) => t).join(' ')))

export function TemperatureSampler() {
  const [word, setWord] = useState('claim')
  const [t, setT] = useState(1)
  const [seed, setSeed] = useState(9)
  const after = MESSAGE_BIGRAMS[word] ?? {}
  const options = Object.keys(after).sort()
  const probs = options.length ? L.softmax(options.map(w => Math.log(after[w])), t) : []
  const text = L.generateBigram(MESSAGE_BIGRAMS, word, 14, t, new Rng(seed))
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label>After <select value={word} onChange={e => setWord(e.target.value)}>{Object.keys(MESSAGE_BIGRAMS).sort().map(w => <option key={w}>{w}</option>)}</select></label>
      <Slider label="Temperature" value={t} min={0.1} max={5} step={0.1} onChange={setT} />
      <button onClick={() => setSeed(s => s + 1)}>Sample again</button>
    </div>
    <div className="qm-bars">{options.map((w, i) => <div key={w} className="qm-bar nlp-bar"><span className="mono">{w}</span><div style={{ width: `${Math.max(1, probs[i] * 100)}%` }} /><b>{f(probs[i])}</b></div>)}</div>
    <p className="qm-small">Counts: {options.map(w => `${w} ${after[w]}`).join(', ')}. At T = 1 the probabilities are the counts’ shares; lower T sharpens them towards the top word, higher T flattens them towards equal.</p>
    <p className="nlp-sampled"><b>Sampled:</b> {text.join(' ')}</p>
  </div>
}

export function BpeBuilder() {
  const counts = useMemo(() => count(C.words(SENTENCES.join(' '))), [])
  const [merges, setMerges] = useState(10)
  const [word, setWord] = useState('repaired')
  const { learned, steps } = useMemo(() => { const st = []; const l = L.trainBpe(counts, merges, s => st.push(s)); return { learned: l, steps: st } }, [counts, merges])
  const last = steps.at(-1)
  const tokens = L.bpeEncode(word.toLowerCase(), learned)
  const symbols = new Set(Object.keys(counts).flatMap(w => [...w])).size + 1 + learned.length
  return <div className="qm-fig">
    <Slider label="Merges" value={merges} min={0} max={120} step={1} onChange={setMerges} />
    <p className="qm-small">Vocabulary: {symbols - learned.length} single characters (with the end marker _) + {learned.length} merged tokens = <b>{symbols}</b>.{last ? <> Latest merge: <code>{last.pair[0]}</code> + <code>{last.pair[1]}</code> → <code>{last.pair.join('')}</code>, seen {last.count} times.</> : ''}</p>
    <div className="nlp-chips qm-scroll" style={{ maxHeight: 110 }}>{learned.map((p, i) => <span key={i} title={`merge ${i + 1}`}>{p.join('')}</span>)}</div>
    <label className="nlp-input"><span>Encode a word (try one that isn’t in the text)</span><input value={word} onChange={e => setWord(e.target.value)} /></label>
    <div className="nlp-chips nlp-tokens">{tokens.map((t, i) => <span key={i}>{t}</span>)}</div>
    <p className="qm-small"><b>{tokens.length}</b> token{tokens.length === 1 ? '' : 's'} for {[...word].length} characters. Common words become one token; rare and unknown words break into pieces that are known, so nothing is ever “out of vocabulary”.</p>
  </div>
}

export function SoftmaxGrad() {
  const [logits, setLogits] = useState([1, 2, 0.5])
  const [target, setTarget] = useState(1)
  const probs = L.softmax(logits), grad = L.crossEntropyGrad(logits, target)
  return <div className="qm-fig">
    <table className="qm-log"><thead><tr><th>Token</th><th>Logit (score)</th><th>Softmax p</th><th>Right answer?</th><th>Gradient p − y</th></tr></thead>
      <tbody>{logits.map((x, i) => <tr key={i} className={i === target ? 'qm-row-pick' : ''}>
        <td>{['a', 'b', 'c'][i]}</td>
        <td><input type="range" aria-label={`logit ${i}`} min={-3} max={3} step={0.1} value={x} onChange={e => setLogits(l => l.map((y, k) => (k === i ? Number(e.target.value) : y)))} /> <span className="mono">{f(x, 1)}</span></td>
        <td className="mono">{f(probs[i])}</td>
        <td><input type="radio" name="target" aria-label={`target ${i}`} checked={i === target} onChange={() => setTarget(i)} /></td>
        <td className="mono" style={{ color: grad[i] < 0 ? '#2f7d4f' : '#b5452f' }}>{f(grad[i])}</td>
      </tr>)}</tbody></table>
    <p className="qm-small">Loss −log p<sub>right</sub> = <b>{f(-Math.log(probs[target]))}</b>. Gradient descent subtracts the gradient: the right token’s logit goes <b>up</b> (its gradient is negative), every other goes <b>down</b>, each in proportion to the probability it wrongly took. The gradients always add up to 0.</p>
  </div>
}

export function AttentionCalc() {
  const [q, setQ] = useState([[1, 0], [0, 1], [1, 1]])
  const [k, setK] = useState([[1, 0], [0, 1], [1, -1]])
  const v = [[1, 2], [3, 4], [5, 6]]
  const d = 2
  const scores = q.map((qi, i) => k.map((kj, j) => (j <= i ? (qi[0] * kj[0] + qi[1] * kj[1]) / Math.sqrt(d) : null)))
  const weights = scores.map(row => { const vis = row.filter(x => x !== null); const p = L.softmax(vis); return row.map((x, j) => (x === null ? null : p[j])) })
  const out = L.attention(q, k, v)
  const Vecs = ({ name, value, onChange }) => <div className="nlp-vecs"><b>{name}</b>{value.map((row, i) => <span key={i} className="nlp-vec">{name.toLowerCase()}<sub>{i}</sub> [{row.map((x, c) => <input key={c} type="number" step="0.5" aria-label={`${name}${i}${c}`} value={x} onChange={e => onChange(value.map((r, a) => (a === i ? r.map((y, b) => (b === c ? Number(e.target.value) : y)) : r)))} />)}]</span>)}</div>
  const Grid = ({ title, m, digits = 2 }) => <table className="nlp-att"><caption>{title}</caption><tbody>{m.map((row, i) => <tr key={i}><th>{i}</th>{row.map((x, j) => <td key={j} className={x === null ? 'masked' : ''} style={x !== null && title.startsWith('Weights') ? { background: `rgba(63,91,181,${(0.1 + 0.8 * x).toFixed(2)})`, color: x > 0.5 ? '#fff' : undefined } : undefined}>{x === null ? '—' : f(x, digits)}</td>)}</tr>)}</tbody></table>
  return <div className="qm-fig">
    <div className="qm-fig-row"><Vecs name="Q" value={q} onChange={setQ} /><Vecs name="K" value={k} onChange={setK} /><div className="nlp-vecs"><b>V</b>{v.map((row, i) => <span key={i} className="mono">v<sub>{i}</sub> [{row.join(', ')}]</span>)}</div></div>
    <div className="qm-fig-row">
      <Grid title="Scores q·k / √2 (— : the future, masked)" m={scores} />
      <Grid title="Weights: softmax of each row" m={weights} />
      <Grid title="Output: weighted mix of the values" m={out} />
    </div>
    <p className="qm-small">Row i is position i. It may look only at positions 0..i (the mask), turns its scores into weights that add up to 1, and outputs that mix of the value vectors. Position 0 can only look at itself, so its output is exactly v<sub>0</sub>.</p>
  </div>
}

// The tiny GPT, trained in the page. With useAttention false it is the neural bigram model of lesson 5.4.
const BIKE_TEXT = SENTENCES.join('. ') + '.'
export function GptTrainer({ useAttention = true, defaultSteps = 8000 }) {
  const [text, setText] = useState(BIKE_TEXT)
  const [steps, setSteps] = useState(defaultSteps)
  const [temperature, setTemperature] = useState(0.6)
  const [prompt, setPrompt] = useState('where is my')
  const [run, setRun] = useState(null)
  const [running, setRunning] = useState(false)
  const [note, setNote] = useState('')
  const [lookAt, setLookAt] = useState('the shop is open on sunday')
  const trainer = useRef(null), timer = useRef(null), file = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const stop = () => { clearTimeout(timer.current); setRunning(false) }
  const snapshot = (t, total, held) => {
    const avg = t.losses.slice(-200).reduce((s, x) => s + x, 0) / Math.min(200, t.losses.length || 1)
    // The training curve, smoothed: the average of each block of 50 steps.
    const curve = []
    for (let i = 0; i + 50 <= t.losses.length; i += 50) curve.push(t.losses.slice(i, i + 50).reduce((s, x) => s + x, 0) / 50)
    return { done: t.losses.length, total, avg, curve, held: [...held], sample: G.generate(t.vocab, t.model, prompt, 70, temperature, new Rng(5), useAttention), vocab: t.vocab, model: t.model }
  }
  const start = () => {
    stop(); setNote('')
    if ([...new Set([...text])].length < 2 || [...text].length < 40) { setNote('Give it at least 40 characters of text.'); return }
    // Train on the first 80% of the text; the last 20% is never trained on, and measures what it learned.
    const [trainPart, heldPart] = G.splitText(text)
    trainer.current = G.makeTrainer(trainPart, { dim: 32, hidden: 128, context: 24, lr: 0.005, useAttention, vocab: G.vocabOf(text) })
    const samples = [], held = []
    setRunning(true)
    const tick = () => {
      const t = trainer.current
      t.step(Math.min(50, steps - t.losses.length))
      if (t.losses.length % 250 === 0 || t.losses.length >= steps) held.push([t.losses.length, G.averageLoss(t.vocab, t.model, heldPart, useAttention)])
      if (t.losses.length % 1000 === 0 || t.losses.length >= steps) samples.push([t.losses.length, G.generate(t.vocab, t.model, prompt, 60, temperature, new Rng(5), useAttention)])
      setRun({ ...snapshot(t, steps, held), samples: [...samples] })
      if (t.losses.length < steps) timer.current = setTimeout(tick, 0); else setRunning(false)
    }
    timer.current = setTimeout(tick, 0)
  }
  const resample = () => run && setRun(r => ({ ...r, sample: G.generate(r.vocab, r.model, prompt, 70, temperature, new Rng(Math.floor(Math.random() * 1e6)), useAttention) }))
  const download = () => {
    const url = URL.createObjectURL(new Blob([G.toSafetensors(run.vocab, run.model)], { type: 'application/octet-stream' }))
    const a = document.createElement('a'); a.href = url; a.download = 'tiny-gpt.safetensors'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNote('Downloaded tiny-gpt.safetensors. In Python: tinygpt.load_safetensors("tiny-gpt.safetensors").')
  }
  const upload = async e => {
    const chosen = e.target.files?.[0]; e.target.value = ''
    if (!chosen) return
    try {
      const { vocab, model } = G.fromSafetensors(new Uint8Array(await chosen.arrayBuffer()))
      stop()
      setRun({ done: 0, total: 0, avg: null, curve: [], samples: [], sample: G.generate(vocab, model, prompt, 70, temperature, new Rng(5)), vocab, model, loaded: chosen.name })
      setNote(`Loaded ${chosen.name}: ${vocab.length} characters, ${G.PARAMS.reduce((s, n) => s + model[n].length * model[n][0].length, 0)} weights.`)
    } catch (err) { setNote(`Not loaded: ${err.message}`) }
  }
  const curve = run?.curve ?? [], held = run?.held ?? []
  const maxLoss = Math.max(1, ...curve, ...held.map(([, l]) => l))
  const best = held.length ? held.reduce((b, h) => (h[1] < b[1] ? h : b)) : null
  const X = n => 5 + 290 * n / Math.max(1, run?.total || steps), Y = l => 105 - 100 * l / maxLoss
  const att = useAttention && run ? G.attentionOf(run.vocab, run.model, lookAt) : null
  const nWeights = run ? G.PARAMS.reduce((s, n) => s + run.model[n].length * run.model[n][0].length, 0) : null
  return <div className="qm-fig">
    <TextInput rows={2} label="Training text (the bike-shop sentences to start with; paste your own)" value={text} onChange={setText} />
    <div className="qm-fig-controls">
      <button className="qm-primary" onClick={start} disabled={running}>{run && !run.loaded ? '↺ Train again' : '▶ Train'}</button>
      {running && <button onClick={stop}>Pause</button>}
      <Slider label="Steps" value={steps} min={500} max={20000} step={500} onChange={setSteps} />
      <Slider label="Temperature" value={temperature} min={0.1} max={2} step={0.1} onChange={setTemperature} />
      <label>Prompt <input className="nlp-small-input" value={prompt} onChange={e => setPrompt(e.target.value)} /></label>
      {run && <button onClick={resample}>Sample again</button>}
    </div>
    {!run ? <p className="qm-hint">Press Train. Each step picks a random stretch of 24 characters and nudges every weight to make each next character more likely. {useAttention ? 'It takes about a minute on a typical laptop; the page stays usable while it trains.' : 'Without attention each character sees only itself.'}</p> : <>
      <p className="qm-small">{run.loaded ? `Model loaded from ${run.loaded}.` : <>Step <b>{run.done}</b> of {run.total} · loss (average of the last 200) <b>{f(run.avg, 2)}</b>{running ? ' · training…' : ''}</>} · {nWeights} weights</p>
      <div className="qm-fig-row">
        <div className="qm-fig-side">
          {curve.length > 1 && <svg className="qm-plot" viewBox="0 0 300 110" role="img" aria-label="Training loss and held-out loss as it trains">
            <polyline fill="none" stroke="#3f5bb5" strokeWidth="1.5" points={curve.map((l, i) => `${X((i + 1) * 50)},${Y(l)}`).join(' ')} />
            {held.length > 1 && <polyline fill="none" stroke="#b5452f" strokeWidth="2" points={held.map(([n, l]) => `${X(n)},${Y(l)}`).join(' ')} />}
            {best && <circle cx={X(best[0])} cy={Y(best[1])} r="3.5" fill="#b5452f" />}
          </svg>}
          {held.length > 0 && <p className="qm-hint"><span style={{ color: '#3f5bb5', fontWeight: 700 }}>— loss on the training text</span> · <span style={{ color: '#b5452f', fontWeight: 700 }}>— loss on the last 20%, never trained on</span>. Held-out loss now <b>{f(held.at(-1)[1], 2)}</b>; lowest <b>{f(best[1], 2)}</b> at step {best[0]}.{held.at(-1)[1] > best[1] + 0.2 ? ' Since then it has been memorising its training text: overfitting.' : ''}</p>}
          <p className="nlp-sampled"><b>{prompt}</b>{run.sample.slice([...prompt].filter(c => run.vocab.includes(c)).length)}</p>
        </div>
        <div className="qm-fig-side"><h4 className="qm-small-h">Samples as it learned</h4>
          <ol className="nlp-samples">{(run.samples ?? []).map(([n, s]) => <li key={n}><span className="qm-dim">{n}</span> {s}</li>)}</ol></div>
      </div>
      {att && <div className="nlp-attmap"><label className="nlp-input"><span>Where does each character look? (the last 24 characters)</span><input value={lookAt} onChange={e => setLookAt(e.target.value)} /></label>
        <table className="nlp-att"><tbody>{att.weights.map((row, i) => <tr key={i}><th>{att.chars[i] === ' ' ? '␣' : att.chars[i]}</th>{row.map((w, j) => <td key={j} title={`${att.chars[i]} → ${att.chars[j]}: ${f(w)}`} className={j > i ? 'masked' : ''} style={j <= i ? { background: `rgba(63,91,181,${Math.min(0.95, 0.05 + w).toFixed(2)})` } : undefined} />)}</tr>)}
          <tr><th />{att.chars.map((c, j) => <th key={j}>{c === ' ' ? '␣' : c}</th>)}</tr></tbody></table></div>}
      {useAttention && <div className="qm-buttons"><button onClick={download}>Download .safetensors</button><button onClick={() => file.current?.click()}>Upload…</button></div>}
    </>}
    {useAttention && !run && <div className="qm-buttons"><button onClick={() => file.current?.click()}>Upload a saved model…</button></div>}
    <input ref={file} type="file" accept=".safetensors" hidden onChange={upload} aria-label="Upload a model" />
    {note && <p className="qm-hint" role="status">{note}</p>}
  </div>
}
