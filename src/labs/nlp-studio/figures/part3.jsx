import { useMemo, useRef, useState } from 'react'
import * as C from '../engine/counting.js'
import { MESSAGES, INTENTS } from '../engine/data.js'
import { LESSONS } from '../lessons/index.js'
import { TextInput } from './part1.jsx'

const f = (x, d = 3) => (x === -Infinity ? '−∞' : Number.isInteger(x) ? String(x) : x.toFixed(d))
const shade = (x, max) => `rgba(63, 91, 181, ${max ? (0.08 + 0.6 * x / max).toFixed(3) : 0})`
const Slider = ({ label, value, min, max, step, onChange, format = v => v }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>

export function BagOfWords({ docs: initial = ['the cat sat on the mat', 'the dog sat on the log', 'a cat and a dog'] }) {
  const [docs, setDocs] = useState(initial)
  const tokens = docs.map(C.words), vocab = C.buildVocab(tokens), columns = Object.keys(vocab)
  const vectors = tokens.map(t => C.vectorize(t, vocab))
  const max = Math.max(1, ...vectors.flat())
  return <div className="qm-fig">
    {docs.map((d, k) => <TextInput key={k} rows={1} label={`Document ${k + 1}`} value={d} onChange={v => setDocs(ds => ds.map((x, j) => (j === k ? v : x)))} />)}
    <div className="qm-scroll"><table className="qm-log nlp-bow">
      <thead><tr><th></th>{columns.map(w => <th key={w} className="mono">{w}</th>)}</tr></thead>
      <tbody>{vectors.map((v, k) => <tr key={k}><th>doc {k + 1}</th>{v.map((c, j) => <td key={j} style={{ background: shade(c, max) }}>{c || ''}</td>)}</tr>)}</tbody>
    </table></div>
    <p className="qm-small">Vocabulary: <b>{columns.length}</b> words, so each document is a list of {columns.length} numbers, one per column.</p>
    <table className="qm-log"><thead><tr><th>cosine</th>{docs.map((_, k) => <th key={k}>doc {k + 1}</th>)}</tr></thead>
      <tbody>{vectors.map((u, a) => <tr key={a}><th>doc {a + 1}</th>{vectors.map((v, b) => <td key={b}>{C.cosine(u, v).toFixed(3)}<span className="qm-dim"> (dot {C.dot(u, v)})</span></td>)}</tr>)}</tbody></table>
  </div>
}

const MESSAGE_TEXT = MESSAGES.map(([t]) => t).join(' ')

export function BigramExplorer() {
  const [text, setText] = useState(MESSAGE_TEXT)
  const corpus = useMemo(() => C.words(text), [text])
  const model = useMemo(() => C.bigramModel(corpus), [corpus])
  const V = new Set(corpus).size
  const [word, setWord] = useState('claim')
  const [k, setK] = useState(0)
  const [sentence, setSentence] = useState('claim your free prize')
  const after = model[word] ?? {}
  const total = Object.values(after).reduce((s, x) => s + x, 0)
  const ranked = Object.entries(after).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 10)
  const sw = C.words(sentence), pairs = C.ngrams(sw, 2)
  const logp = C.sentenceLogProb(model, sw, k, V)
  return <div className="qm-fig">
    <TextInput rows={2} label="Text to count (to start with: the 40 messages of lesson 3.4; paste your own)" value={text} onChange={setText} />
    <p className="qm-small"><b>{corpus.length}</b> words, <b>{V}</b> different (V), <b>{Math.max(0, corpus.length - 1)}</b> bigrams.</p>
    <div className="qm-fig-controls">
      <label>After the word <input className="nlp-small-input" value={word} onChange={e => setWord(e.target.value.toLowerCase().trim())} /></label>
      <Slider label="Smoothing k" value={k} min={0} max={1} step={0.05} onChange={setK} />
    </div>
    <p className="qm-small">“{word}” is followed by something <b>{total}</b> times. P(next | {word}) = (count + k) / ({total} + k × {V}){k ? `; every unseen word gets ${f(k / (total + k * V), 4)}` : ''}.</p>
    <div className="qm-bars">{ranked.map(([w, c]) => { const p = C.nextWordProb(model, word, w, k, V); return <div key={w} className="qm-bar nlp-bar"><span className="mono">{w}</span><div style={{ width: `${Math.max(1, p * 100)}%` }} /><b>{f(p)}</b></div> })}
      {!ranked.length && <p className="qm-feedback">“{word}” is never followed by anything in this text: with k = 0 every next word has probability 0.</p>}</div>
    <p className="qm-small">Always taking the most likely next word: <b className="mono">{C.greedyContinue(model, word, 12).join(' ')}</b></p>
    <TextInput rows={1} label="A sentence to score" value={sentence} onChange={setSentence} />
    <table className="qm-log"><thead><tr><th>Bigram</th><th>P(next | previous)</th><th>log P</th></tr></thead>
      <tbody>{pairs.map(([a, b], i) => { const p = C.nextWordProb(model, a, b, k, V); return <tr key={i}><td className="mono" style={{ textAlign: 'left' }}>{a} → {b}</td><td>{f(p, 4)}</td><td>{p ? f(Math.log(p)) : '−∞'}</td></tr> })}
        <tr className="qm-sum"><td style={{ textAlign: 'left' }}>Sentence</td><td>{f(Math.exp(logp), 6)}</td><td>{f(logp)}</td></tr></tbody></table>
  </div>
}

const LESSON_DOCS = () => LESSONS.map(l => ({ title: `${l.number} ${l.title}`, tokens: C.words(l.blocks.map(b => b.md ?? b.note ?? '').join(' ')) }))

export function LessonSearch() {
  const docs = useMemo(LESSON_DOCS, [])
  const tokens = useMemo(() => docs.map(d => d.tokens), [docs])
  const weights = useMemo(() => C.idf(tokens), [tokens])
  const [query, setQuery] = useState('probability of the next word')
  const q = C.words(query)
  const ranked = useMemo(() => C.search(q, tokens).slice(0, 6), [query, tokens])  // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="qm-fig">
    <label className="nlp-input"><span>Search this lab’s lessons</span><input value={query} onChange={e => setQuery(e.target.value)} /></label>
    <p className="qm-small">{docs.length} documents (one per lesson). Query word weights, idf = log(N / df): {q.map(w => <code key={w}>{w}: {weights[w] === undefined ? 'not in any lesson' : f(weights[w])}</code>)}</p>
    <ol className="nlp-results-list">{ranked.map(([score, i]) => <li key={i}><b>{docs[i].title}</b> <span className="qm-dim">cosine {f(score)}</span>
      <div className="bar" style={{ width: `${score * 100}%` }} /></li>)}</ol>
  </div>
}

export function SpamTrainer() {
  const [n, setN] = useState(30)
  const [k, setK] = useState(1)
  const [extra, setExtra] = useState([])
  const [message, setMessage] = useState('claim your free prize now')
  const [draft, setDraft] = useState(''), [draftLabel, setDraftLabel] = useState('spam')
  const train = [...MESSAGES.slice(0, n), ...extra]
  const model = useMemo(() => C.trainNB(train.map(([t, l]) => [C.words(t), l]), k), [n, k, extra])  // eslint-disable-line react-hooks/exhaustive-deps
  const tokens = C.words(message)
  const labels = Object.keys(model.docs).sort()
  const parts = Object.fromEntries(labels.map(l => [l, C.logScoreParts(model, tokens, l)]))
  const [best, probs] = labels.length ? C.classify(model, tokens) : [null, {}]
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <Slider label="Train on the first" value={n} min={2} max={30} step={1} onChange={setN} format={v => `${v} messages`} />
      <Slider label="Smoothing k" value={k} min={0.05} max={2} step={0.05} onChange={setK} />
    </div>
    <p className="qm-small">{labels.map(l => `${model.docs[l]} ${l}`).join(', ')}{extra.length ? ` (${extra.length} of yours)` : ''} · vocabulary V = {model.vocab.length} words</p>
    <TextInput rows={1} label="Message to classify" value={message} onChange={setMessage} />
    <div className="nlp-nb">{labels.map(l => <section key={l} className={l === best ? 'best' : ''}>
      <h4>{l}{l === best ? ' ← the guess' : ''}</h4>
      <table className="qm-log"><tbody>
        <tr><td style={{ textAlign: 'left' }}>prior: log({parts[l].docs} / {parts[l].nDocs})</td><td>{f(parts[l].prior)}</td></tr>
        {parts[l].terms.map((t, i) => t.unknown
          ? <tr key={i} className="qm-row-dim"><td style={{ textAlign: 'left' }} className="mono">{t.word}</td><td>skipped: not in the vocabulary</td></tr>
          : <tr key={i}><td style={{ textAlign: 'left' }}><span className="mono">{t.word}</span>: log(({t.count} + {t.k}) / ({t.total} + {t.k} × {t.V}))</td><td>{f(t.log)}</td></tr>)}
        <tr className="qm-sum"><td style={{ textAlign: 'left' }}>log score</td><td>{f(parts[l].score)}</td></tr>
        <tr><td style={{ textAlign: 'left' }}>probability</td><td><b>{f(probs[l] ?? 0)}</b></td></tr>
      </tbody></table>
    </section>)}</div>
    <form className="nlp-chat-form" onSubmit={e => { e.preventDefault(); if (draft.trim()) { setExtra(x => [...x, [draft, draftLabel]]); setDraft('') } }}>
      <input aria-label="A training example of your own" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add a training example of your own…" />
      <select aria-label="Its label" value={draftLabel} onChange={e => setDraftLabel(e.target.value)}><option>spam</option><option>ham</option></select>
      <button>Add and retrain</button>
      {extra.length > 0 && <button type="button" className="qm-quiet" onClick={() => setExtra([])}>Remove mine</button>}
    </form>
  </div>
}

export function LearningCurve() {
  const test = MESSAGES.slice(-C.TEST_SIZE), pool = MESSAGES.slice(0, -C.TEST_SIZE)
  const curve = useMemo(() => Array.from({ length: pool.length - 1 }, (_, i) => [i + 2, C.evaluate(pool.slice(0, i + 2), test, 'spam').accuracy]), [])  // eslint-disable-line react-hooks/exhaustive-deps
  const [n, setN] = useState(6)
  const detail = C.evaluateDetail(pool.slice(0, n), test, 'spam')
  const W = 420, H = 180, P = 30
  const x = m => P + (W - P - 10) * (m - 2) / (pool.length - 2), y = a => H - P - (H - P - 10) * a
  return <div className="qm-fig">
    <Slider label="Train on the first" value={n} min={2} max={pool.length} step={1} onChange={setN} format={v => `${v} messages`} />
    <div className="qm-fig-row">
      <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Accuracy on the test set against training size">
        <line className="qm-axis" x1={P} y1={H - P} x2={W - 5} y2={H - P} /><line className="qm-axis" x1={P} y1={10} x2={P} y2={H - P} />
        <text className="qm-tick" x={W / 2 - 40} y={H - 8}>training messages</text><text className="qm-tick" x={2} y={14}>1.0</text><text className="qm-tick" x={2} y={H - P}>0</text>
        <polyline fill="none" stroke="#3f5bb5" strokeWidth="2" points={curve.map(([m, a]) => `${x(m)},${y(a)}`).join(' ')} />
        <circle cx={x(n)} cy={y(detail.accuracy)} r="5" fill="#b5452f" />
      </svg>
      <div className="qm-fig-side">
        <table className="nlp-confusion"><thead><tr><th></th><th>guessed spam</th><th>guessed ham</th></tr></thead>
          <tbody><tr><th>really spam</th><td className="good">TP {detail.confusion.tp}</td><td className="bad">FN {detail.confusion.fn}</td></tr>
            <tr><th>really ham</th><td className="bad">FP {detail.confusion.fp}</td><td className="good">TN {detail.confusion.tn}</td></tr></tbody></table>
        <p className="qm-small">accuracy <b>{f(detail.accuracy, 2)}</b> · precision <b>{f(detail.precision, 2)}</b> · recall <b>{f(detail.recall, 2)}</b> · F1 <b>{f(detail.f1, 2)}</b></p>
      </div>
    </div>
    <table className="qm-log nlp-left"><thead><tr><th>Test message (never trained on)</th><th>Truth</th><th>Guess</th></tr></thead>
      <tbody>{detail.rows.map((r, i) => <tr key={i} className={r.truth === r.guess ? '' : 'qm-row-pick'}><td>{r.text}</td><td>{r.truth}</td><td>{r.guess}{r.truth === r.guess ? ' ✓' : ' ✗'}</td></tr>)}</tbody></table>
  </div>
}

// Bot 2: intents you edit, a chat, and the bot saved on this device, downloaded, or uploaded.
const STORE = 'upskillos.nlp-studio.bot2'
const loadBot = () => { try { return JSON.parse(localStorage.getItem(STORE)) ?? null } catch { return null } }
function validBot(bot) {
  if (!bot || typeof bot !== 'object' || !bot.intents || typeof bot.intents !== 'object') return 'The file has no "intents".'
  for (const [name, intent] of Object.entries(bot.intents)) {
    if (!Array.isArray(intent?.examples) || !intent.examples.every(e => typeof e === 'string')) return `Intent “${name}” needs a list of example strings.`
    if (typeof intent.reply !== 'string') return `Intent “${name}” needs a reply.`
  }
  return Object.keys(bot.intents).length ? null : 'The file has no intents in it.'
}

export function IntentBot() {
  const saved = loadBot()
  const [intents, setIntents] = useState(saved?.intents ?? INTENTS)
  const [k, setK] = useState(saved?.k ?? 0.1), [threshold, setThreshold] = useState(saved?.threshold ?? 0.5)
  const [log, setLog] = useState([])
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(Object.keys(intents)[0])
  const file = useRef(null)
  // Blank lines in the editor are not examples.
  const cleaned = useMemo(() => Object.fromEntries(Object.entries(intents).map(([n, i]) => [n, { ...i, examples: i.examples.filter(e => e.trim()) }])), [intents])
  const model = useMemo(() => C.trainIntents(cleaned, k), [cleaned, k])
  const send = text => {
    if (!text.trim()) return
    if (!Object.keys(model.docs).length) { setNote('Give at least one intent an example first.'); return }
    const [, probs] = C.classify(model, C.words(text))
    setLog(l => [...l, { who: 'you', text }, { who: 'bot', ...C.intentReply(model, intents, text, threshold), probs }]); setDraft('')
  }
  const bot = () => ({ format: 'upskillos-intent-bot', version: 1, k, threshold, intents })
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(bot())); setNote('Saved in this browser.') } catch { setNote('This browser won’t store it (a private window?). Download it instead.') } }
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(bot(), null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = 'intent-bot.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNote('Downloaded intent-bot.json.')
  }
  const upload = async e => {
    const chosen = e.target.files?.[0]; e.target.value = ''
    if (!chosen) return
    try {
      const data = JSON.parse(await chosen.text()), problem = validBot(data)
      if (problem) { setNote(`Not loaded: ${problem}`); return }
      setIntents(data.intents); setK(data.k ?? 0.1); setThreshold(data.threshold ?? 0.5); setEditing(Object.keys(data.intents)[0]); setLog([])
      setNote(`Loaded ${Object.keys(data.intents).length} intents from ${chosen.name}.`)
    } catch { setNote('Not loaded: that file isn’t valid JSON.') }
  }
  const intent = intents[editing]
  const update = change => setIntents(all => ({ ...all, [editing]: { ...all[editing], ...change } }))
  return <div className="qm-fig nlp-bot2">
    <div className="qm-fig-row">
      <section className="nlp-bot2-edit">
        <h4>The intents (the training data)</h4>
        <div className="qm-fig-controls">{Object.keys(intents).map(name => <button key={name} className={name === editing ? 'active' : ''} onClick={() => setEditing(name)}>{name} <span className="qm-dim">{intents[name].examples.length}</span></button>)}
          <button className="qm-quiet" onClick={() => { const name = window.prompt?.('Name of the new intent (one word):')?.trim().toLowerCase(); if (name && !intents[name]) { setIntents(a => ({ ...a, [name]: { examples: [], reply: '' } })); setEditing(name) } }}>+ intent</button></div>
        {intent && <>
          <label className="nlp-input"><span>Example phrases for “{editing}”, one per line</span>
            <textarea rows={6} value={intent.examples.join('\n')} onChange={e => update({ examples: e.target.value.split('\n') })} /></label>
          <label className="nlp-input"><span>Its reply</span><textarea rows={2} value={intent.reply} onChange={e => update({ reply: e.target.value })} /></label>
          {Object.keys(intents).length > 1 && <button className="qm-quiet" onClick={() => { const { [editing]: _, ...rest } = intents; setIntents(rest); setEditing(Object.keys(rest)[0]) }}>Delete “{editing}”</button>}
        </>}
        <div className="qm-fig-controls">
          <Slider label="Smoothing k" value={k} min={0.01} max={1} step={0.01} onChange={setK} />
          <Slider label="Confidence needed" value={threshold} min={0} max={0.95} step={0.05} onChange={setThreshold} />
        </div>
        <div className="qm-buttons">
          <button onClick={save}>Save in this browser</button>
          <button onClick={download}>Download</button>
          <button onClick={() => file.current?.click()}>Upload…</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={upload} aria-label="Upload a bot" />
          <button className="qm-quiet" onClick={() => { setIntents(INTENTS); setK(0.1); setThreshold(0.5); setEditing('greeting'); setLog([]); setNote('Back to the bike shop.') }}>Reset to the bike shop</button>
        </div>
        {note && <p className="qm-hint" role="status">{note}</p>}
      </section>
      <section className="nlp-chat nlp-bot2-chat">
        <h4>Chat</h4>
        <div className="nlp-chat-log" aria-live="polite">{log.map((m, i) => <div key={i} className={`nlp-msg ${m.who}`}>
          <p>{m.text ?? m.reply}</p>
          {m.who === 'bot' && <div className="nlp-probs">{Object.entries(m.probs).sort((a, b) => b[1] - a[1]).map(([l, p]) => <div key={l} className={`qm-bar nlp-bar${l === m.intent ? ' pick' : ''}`}><span className="mono">{l}</span><div style={{ width: `${Math.max(1, p * 100)}%` }} /><b>{f(p, 2)}</b></div>)}
            <p className="qm-hint">{m.intent ? `“${m.intent}”, ${f(m.confidence, 2)} ≥ ${threshold}` : `Best guess only ${f(m.confidence, 2)}, below ${threshold}: it says it isn’t sure.`}</p></div>}
        </div>)}</div>
        <form onSubmit={e => { e.preventDefault(); send(draft) }} className="nlp-chat-form">
          <input aria-label="Message to Bot 2" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Ask the help desk…" />
          <button className="qm-primary">Send</button>
        </form>
        <div className="qm-fig-controls">{['is the shop open on saturday', 'my chain broke', 'do you sell pizza', 'thanks so much'].map(s => <button key={s} className="qm-quiet" onClick={() => send(s)}>“{s}”</button>)}</div>
      </section>
    </div>
  </div>
}
