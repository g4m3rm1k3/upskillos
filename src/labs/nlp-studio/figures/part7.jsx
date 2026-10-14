import { useEffect, useMemo, useState } from 'react'
import * as P from '../engine/pretrained.js'
import * as Ch from '../engine/chat.js'
import * as L from '../engine/lm.js'
import * as C from '../engine/counting.js'
import * as V from '../engine/vectors.js'
import { count } from '../engine/text.js'
import { SENTENCES } from '../engine/corpus.js'
import { INTENTS } from '../engine/data.js'
import { useBot, ChatPanel } from './part6.jsx'

const f = (x, d = 2) => (Number.isInteger(x) ? String(x) : x.toFixed(d))
const Slider = ({ label, value, min, max, step, onChange, format = v => v }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>

// A model behind a button: nothing is downloaded until it is pressed. Shows progress and errors.
export function useModel(kind) {
  const [state, setState] = useState(() => ({ status: 'idle', model: null, progress: 0, error: null }))
  const start = () => {
    setState(s => ({ ...s, status: 'loading', error: null }))
    P.load(kind, frac => setState(s => ({ ...s, progress: frac })))
      .then(model => setState({ status: 'ready', model, progress: 1, error: null }))
      .catch(err => setState({ status: 'error', model: null, progress: 0, error: String(err?.message ?? err) }))
  }
  useEffect(() => { if (P.isLoaded(kind)) start() }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  return [state, start]
}
export function LoadButton({ kind, state, start }) {
  const m = P.MODELS[kind]
  if (state.status === 'ready') return <p className="qm-hint">✓ {m.label} is loaded ({m.size}, from Hugging Face: <span className="mono">{m.id}</span>).</p>
  return <div className="nlp-load">
    <button className="qm-primary" disabled={state.status === 'loading'} onClick={start}>{state.status === 'loading' ? `Downloading… ${Math.round(state.progress * 100)}%` : `Download ${m.label} (${m.size})`}</button>
    <span className="qm-hint">From Hugging Face (<span className="mono">{m.id}</span>). Downloaded once, then kept in this browser’s cache.</span>
    {state.status === 'loading' && <div className="nlp-progress"><div style={{ width: `${Math.round(state.progress * 100)}%` }} /></div>}
    {state.error && <p className="qm-feedback" role="status">It couldn’t be loaded: {state.error}. Check the internet connection and try again.</p>}
  </div>
}

const OUR_MERGES = (() => { let m = null; return () => (m ??= L.trainBpe(count(C.words(SENTENCES.join(' '))), 120)) })()

export function GptTokenizer() {
  const [state, start] = useModel('tokenizer')
  const [text, setText] = useState('The mechanic repaired 512 bikes. café 🙂')
  const ours = C.words(text).flatMap(w => L.bpeEncode(w, OUR_MERGES()))
  const ids = state.model ? state.model.encode(text) : []
  const pieces = state.model ? state.model.model.convert_ids_to_tokens(ids) : []
  return <div className="qm-fig">
    <LoadButton kind="tokenizer" state={state} start={start} />
    <label className="nlp-input"><span>Text</span><input value={text} onChange={e => setText(e.target.value)} /></label>
    <p className="qm-small">UTF-8 bytes as GPT-2’s symbols (lesson 1.1’s bytes, one printable character each): <code>{P.byteSymbols(text)}</code></p>
    {state.model && <><h4 className="qm-small-h">GPT-2: {ids.length} tokens, from a vocabulary of {state.model.model.vocab.length.toLocaleString('en-GB')}</h4>
      <div className="nlp-chips nlp-tokens">{pieces.map((t, i) => <span key={i} title={`id ${ids[i]}`}>{t}<sub className="qm-dim"> {ids[i]}</sub></span>)}</div></>}
    <h4 className="qm-small-h">Your BPE from lesson 5.3 (120 merges, lower-case words): {ours.length} tokens</h4>
    <div className="nlp-chips">{ours.map((t, i) => <span key={i}>{t}</span>)}</div>
  </div>
}

const EXAMPLES = Object.entries(INTENTS).flatMap(([name, it]) => it.examples.map(e => [name, e]))

export function EmbeddingExplorer() {
  const [state, start] = useModel('embedder')
  const [sentences, setSentences] = useState(['my chain snapped', 'my bicycle chain broke', 'my wheel is bent', 'are you open on sunday', 'what time do you close', 'do you sell pizza'])
  const [vectors, setVectors] = useState(null)
  const [examples, setExamples] = useState(null)
  const [message, setMessage] = useState('my bicycle chain broke')
  const [threshold, setThreshold] = useState(0.35)
  const [answer, setAnswer] = useState(null)
  useEffect(() => { if (state.model) P.embed(state.model, sentences).then(setVectors) }, [state.model, sentences])
  useEffect(() => { if (state.model && !examples) P.embed(state.model, EXAMPLES.map(([, e]) => e)).then(setExamples) }, [state.model, examples])
  useEffect(() => {
    if (!state.model || !examples) return
    P.embed(state.model, [message]).then(([q]) => {
      const scores = examples.map(v => v.reduce((s, a, d) => s + a * q[d], 0))
      const best = scores.indexOf(Math.max(...scores))
      setAnswer({ intent: EXAMPLES[best][0], example: EXAMPLES[best][1], score: scores[best] })
    })
  }, [state.model, examples, message])
  const [v4, w4] = useMemo(() => V.trainBikeVectors(SENTENCES), [])
  const part4 = V.semanticReply(INTENTS, v4, w4, message)
  return <div className="qm-fig">
    <LoadButton kind="embedder" state={state} start={start} />
    {state.model && vectors && <>
      <h4 className="qm-small-h">Cosine similarity of {vectors[0].length}-number sentence vectors</h4>
      <div className="qm-scroll"><table className="nlp-att nlp-sim"><thead><tr><th />{sentences.map((_, j) => <th key={j}>{j + 1}</th>)}</tr></thead>
        <tbody>{sentences.map((s, i) => <tr key={i}><th className="nlp-sim-label"><input aria-label={`Sentence ${i + 1}`} value={s} onChange={e => setSentences(ss => ss.map((x, k) => (k === i ? e.target.value : x)))} /> {i + 1}</th>
          {vectors.map((_, j) => { const c = vectors[i].reduce((t, a, d) => t + a * vectors[j][d], 0); return <td key={j} style={{ background: `rgba(63,91,181,${Math.max(0, c).toFixed(2)})`, color: c > 0.55 ? '#fff' : undefined }}>{f(c)}</td> })}</tr>)}</tbody></table></div>
    </>}
    <h4 className="qm-small-h">Bot 2, with MiniLM’s meanings</h4>
    <label className="nlp-input"><span>Message</span><input value={message} onChange={e => setMessage(e.target.value)} /></label>
    <Slider label="Similarity needed" value={threshold} min={0} max={0.9} step={0.05} onChange={setThreshold} />
    <div className="nlp-nb">
      <section className={part4.intent ? '' : 'unsure'}><h4>Part 4: word2vec on 63 sentences</h4><p><b>{part4.intent ?? 'not sure'}</b> <span className="qm-dim">(cosine {f(part4.similarity)})</span></p></section>
      <section className={answer && answer.score >= threshold ? 'best' : 'unsure'}><h4>Part 7: MiniLM, pre-trained</h4>{answer ? <p><b>{answer.score >= threshold ? answer.intent : 'not sure'}</b> <span className="qm-dim">(closest example “{answer.example}”, {f(answer.score)})</span></p> : <p className="qm-hint">Load MiniLM above.</p>}</section>
    </div>
  </div>
}

export function SmolChat() {
  const [state, start] = useModel('chat')
  const [system, setSystem] = useState('You are the help desk of a bike shop.')
  const [log, setLog] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [temperature, setTemperature] = useState(0)
  const messages = [...(system.trim() ? [{ role: 'system', content: system }] : []), ...log.map(m => ({ role: m.who === 'you' ? 'user' : 'assistant', content: m.text }))]
  const send = async text => {
    if (!text.trim() || !state.model || busy) return
    setBusy(true); setDraft('')
    const next = [...messages, { role: 'user', content: text }]
    setLog(l => [...l, { who: 'you', text }])
    const t0 = performance.now()
    try { const reply = await P.chat(state.model, next, { temperature }); setLog(l => [...l, { who: 'bot', text: reply, seconds: (performance.now() - t0) / 1000 }]) }
    catch (err) { setLog(l => [...l, { who: 'bot', text: `(error: ${err.message})` }]) }
    finally { setBusy(false) }
  }
  return <div className="qm-fig">
    <LoadButton kind="chat" state={state} start={start} />
    <label className="nlp-input"><span>System message (instructions the model sees before the conversation)</span><textarea rows={2} value={system} onChange={e => setSystem(e.target.value)} /></label>
    <div className="nlp-chat">
      <div className="nlp-chat-log" aria-live="polite">{log.map((m, i) => <div key={i} className={`nlp-msg ${m.who}`}><p>{m.text}</p>{m.seconds && <p className="qm-hint">{f(m.seconds, 1)} s</p>}</div>)}{busy && <p className="qm-hint">Writing…</p>}</div>
      <form onSubmit={e => { e.preventDefault(); send(draft) }} className="nlp-chat-form">
        <input aria-label="Message to SmolLM2" value={draft} onChange={e => setDraft(e.target.value)} placeholder={state.model ? 'Ask it anything…' : 'Download the model first'} disabled={!state.model} />
        <button className="qm-primary" disabled={!state.model || busy}>Send</button>
        <button type="button" className="qm-quiet" onClick={() => setLog([])}>New conversation</button>
      </form>
      <div className="qm-fig-controls">
        <Slider label="Temperature" value={temperature} min={0} max={1.5} step={0.1} onChange={setTemperature} format={v => (v === 0 ? '0 (greedy)' : v)} />
        {['What is the capital of France?', 'Are you open on Sunday?', 'Do you sell pizza?', 'my wheel is bent'].map(q => <button key={q} className="qm-quiet" disabled={!state.model || busy} onClick={() => send(q)}>“{q}”</button>)}
      </div>
    </div>
    <details className="nlp-template"><summary>What the model actually reads (its chat template)</summary><pre>{P.chatTemplate(messages.length ? messages : [{ role: 'user', content: '…' }])}</pre></details>
  </div>
}

export function GroundedBot() {
  const [emb, startEmb] = useModel('embedder')
  const [gen, startGen] = useModel('chat')
  const [question, setQuestion] = useState('do you sell pizza?')
  const [threshold, setThreshold] = useState(0.3)
  const [factVectors, setFactVectors] = useState(null)
  const [run, setRun] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (emb.model && !factVectors) P.embed(emb.model, P.FACTS).then(setFactVectors) }, [emb.model, factVectors])
  const go = async () => {
    if (!emb.model || !gen.model || !factVectors || busy) return
    setBusy(true)
    try {
      const [q] = await P.embed(emb.model, [question])
      const top = P.topFacts(q, factVectors, 2)
      const routed = top[0][0] < threshold
      const messages = P.groundedMessages(top.map(([, i]) => P.FACTS[i]), question)
      const grounded = routed ? null : await P.chat(gen.model, messages)
      const plain = await P.chat(gen.model, [{ role: 'user', content: question }])
      setRun({ question, top, routed, messages, grounded, plain })
    } finally { setBusy(false) }
  }
  return <div className="qm-fig">
    <LoadButton kind="embedder" state={emb} start={startEmb} />
    <LoadButton kind="chat" state={gen} start={startGen} />
    <label className="nlp-input"><span>Question</span><input value={question} onChange={e => setQuestion(e.target.value)} /></label>
    <div className="qm-fig-controls">
      <Slider label="Route away below" value={threshold} min={0} max={0.8} step={0.05} onChange={setThreshold} />
      <button className="qm-primary" onClick={go} disabled={!emb.model || !gen.model || !factVectors || busy}>{busy ? 'Working…' : 'Ask'}</button>
      {['do you sell pizza?', 'are you open on saturday?', 'how much is a service?', 'what is the meaning of life?'].map(q => <button key={q} className="qm-quiet" onClick={() => setQuestion(q)}>“{q}”</button>)}
    </div>
    {run && <ol className="nlp-stages">
      <li><b>Retrieve:</b> MiniLM compares the question with the shop’s {P.FACTS.length} facts. Best: {run.top.map(([s, i]) => <span key={i} className="nlp-fact">“{P.FACTS[i]}” <span className="qm-dim">{f(s)}</span></span>)}</li>
      <li><b>Route:</b> {run.routed ? <>best match {f(run.top[0][0])} is below {threshold}: answered without the language model — <i>“Sorry, I can only help with questions about the bike shop.”</i></> : <>best match {f(run.top[0][0])} ≥ {threshold}: go on.</>}</li>
      {!run.routed && <li><b>Generate</b> with the facts in the system message: <span className="nlp-answer-text">“{run.grounded}”</span></li>}
      <li className="qm-dim"><b>For comparison</b>, the same model with no facts and no routing: “{run.plain}”</li>
    </ol>}
  </div>
}

export function LoraLab() {
  const bot = useBot()
  const [method, setMethod] = useState('lora-all')
  const [rank, setRank] = useState(2)
  const [replay, setReplay] = useState(true)
  const [steps, setSteps] = useState(300)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  if (!bot) return <div className="qm-fig"><p className="qm-hint">This uses Bot 3. Train it in lesson 6.4 (or upload a saved one there), then come back.</p></div>
  const [train] = Ch.makeDialogues()
  const newSunday = Ch.sundayUpdate()
  const otherDays = train.filter(([u, b]) => b.startsWith('on ') && !u.includes('sunday'))
  const rest = train.filter(([, b]) => !b.startsWith('on ')).filter((_, i) => i % 4 === 0)
  const measure = model => ({ sunday: Ch.exactMatch(bot.vocab, model, newSunday), days: Ch.exactMatch(bot.vocab, model, otherDays), rest: Ch.exactMatch(bot.vocab, model, rest) })
  const run = () => {
    setBusy(true)
    setTimeout(() => {
      const data = replay ? [...train.filter(([u]) => !u.includes('sunday')), ...newSunday, ...newSunday, ...newSunday] : newSunday
      let tuned, trained
      if (method === 'full') {
        tuned = Ch.cloneModel(bot.model)
        Ch.finetuneChat(bot.vocab, tuned, data, steps, { lr: 0.002 })
        trained = Object.values(tuned).reduce((s, m) => s + m.length * m[0].length, 0)
      } else {
        const lora = Ch.initLora(bot.model, method === 'lora-all' ? ['wq', 'wk', 'wv', 'wo', 'w1', 'w2'] : ['w1', 'w2'], rank)
        Ch.finetuneChat(bot.vocab, bot.model, data, steps, { lora, lr: 0.005 })
        tuned = Ch.mergeLora(bot.model, lora)
        trained = Ch.loraSize(lora)
      }
      setResult({ before: measure(bot.model), after: measure(tuned), trained, total: Object.values(bot.model).reduce((s, m) => s + m.length * m[0].length, 0), tuned: { vocab: bot.vocab, model: tuned }, label: `${method === 'full' ? 'full fine-tuning' : `LoRA rank ${rank} on ${method === 'lora-all' ? 'all six matrices' : 'the MLP'}`}, ${replay ? 'with' : 'without'} replay, ${steps} steps` })
      setBusy(false)
    }, 20)
  }
  const pct = x => `${Math.round(x * 100)}%`
  return <div className="qm-fig">
    <p className="qm-small">The shop changes its Sunday hours to <b>nine to five</b>. Teach Bot 3 ({bot.source}) the new hours.</p>
    <div className="qm-fig-controls">
      <label>Method <select value={method} onChange={e => setMethod(e.target.value)}><option value="lora-all">LoRA on all six matrices</option><option value="lora-mlp">LoRA on the MLP only</option><option value="full">Full fine-tuning (every weight)</option></select></label>
      {method !== 'full' && <Slider label="Rank" value={rank} min={1} max={8} step={1} onChange={setRank} />}
      <label><input type="checkbox" checked={replay} onChange={e => setReplay(e.target.checked)} /> Replay the old conversations too</label>
      <Slider label="Steps" value={steps} min={50} max={800} step={50} onChange={setSteps} />
      <button className="qm-primary" onClick={run} disabled={busy}>{busy ? 'Fine-tuning…' : 'Fine-tune'}</button>
    </div>
    {result && <>
      <p className="qm-small">{result.label}: trained <b>{result.trained.toLocaleString('en-GB')}</b> numbers of {result.total.toLocaleString('en-GB')} ({Math.round(result.trained / result.total * 100)}%).</p>
      <table className="qm-log nlp-left"><thead><tr><th>Exactly right</th><th>Before</th><th>After</th></tr></thead><tbody>
        <tr><td>The new Sunday hours ({newSunday.length} questions)</td><td>{pct(result.before.sunday)}</td><td><b>{pct(result.after.sunday)}</b></td></tr>
        <tr><td>The other six days ({otherDays.length})</td><td>{pct(result.before.days)}</td><td><b>{pct(result.after.days)}</b></td></tr>
        <tr><td>Everything else (a quarter of the rest, {rest.length})</td><td>{pct(result.before.rest)}</td><td><b>{pct(result.after.rest)}</b></td></tr>
      </tbody></table>
      <h4 className="qm-small-h">Talk to the fine-tuned Bot 3</h4>
      <ChatPanel bot={{ ...result.tuned, source: result.label }} compact />
    </>}
  </div>
}
