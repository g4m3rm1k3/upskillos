import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import * as Ch from '../engine/chat.js'
import * as G from '../engine/tinygpt.js'
import { Rng } from '../engine/vectors.js'

const f = (x, d = 2) => (Number.isInteger(x) ? String(x) : x.toFixed(d))
const Slider = ({ label, value, min, max, step, onChange, format = v => v }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>

// Bot 3, shared between the lessons of Part 6: trained (or uploaded) in 6.4, used again in 6.5 and 6.6.
const store = { bot: null, listeners: new Set() }
export const setBot = bot => { store.bot = bot; store.listeners.forEach(l => l()) }
export const useBot = () => useSyncExternalStore(l => { store.listeners.add(l); return () => store.listeners.delete(l) }, () => store.bot)

const SPECIAL = { [Ch.USER]: 'user', [Ch.BOT]: 'bot', [Ch.END]: 'end', [Ch.UNKNOWN]: 'unk' }
function TokenRow({ tokens, roles }) {
  return <div className="nlp-chat-tokens">{tokens.map((t, i) => <span key={i} className={`${SPECIAL[t] ? 'special ' + SPECIAL[t] : ''}${roles ? (roles[i] ? ' counted' : ' ignored') : ''}`} title={roles ? (roles[i] ? 'the bot’s: predicting this counts in the loss' : 'not the bot’s: ignored by the loss') : undefined}>{t}</span>)}</div>
}

export function DialogueFormat({ showMask = false }) {
  const [turns, setTurns] = useState([['user', 'is the shop open on sunday'], ['bot', 'on sunday we are open ten to four.'], ['user', 'thanks'], ['bot', "you're welcome."]])
  const tokens = Ch.formatDialogue(turns)
  const roles = []
  for (const [role, words] of turns) { const n = Ch.chatTokens(words).length + 2; for (let i = 0; i < n; i++) roles.push(role === 'bot' && i > 0 ? 1 : 0) }
  return <div className="qm-fig">
    {turns.map(([role, words], i) => <label key={i} className="nlp-input nlp-turn"><span>{role === 'user' ? '« user' : '» bot'}</span>
      <input value={words} onChange={e => setTurns(ts => ts.map((t, k) => (k === i ? [t[0], e.target.value] : t)))} /></label>)}
    <p className="qm-small"><b>{tokens.length}</b> tokens: what the model actually reads, left to right.{showMask ? ' Green tokens are the bot’s: only predicting them counts in the loss.' : ''}</p>
    <TokenRow tokens={tokens} roles={showMask ? roles : null} />
    {showMask && <p className="qm-hint">Predicting a token means: given everything before it, how likely was it? The model still <i>reads</i> the user’s words (they are the context); it is just never graded on <i>writing</i> them.</p>}
  </div>
}

export function TemplateExplorer() {
  const [train, held] = useMemo(() => Ch.makeDialogues(), [])
  const [kind, setKind] = useState('repair')
  const t = Ch.TEMPLATES.find(([k]) => k === kind)
  // A conversation belongs to a template when its reply starts the way that template's reply does.
  const ofKind = ([, b]) => b.startsWith(t[2].split('{')[0])
  const examples = train.filter(ofKind)
  const heldHere = held.filter(ofKind)
  return <div className="qm-fig">
    <div className="qm-fig-controls">{Ch.TEMPLATES.map(([k]) => <button key={k} className={k === kind ? 'active' : ''} onClick={() => setKind(k)}>{k}</button>)}</div>
    <table className="qm-log nlp-left"><tbody>
      <tr><td>The user says</td><td className="mono">{t[1].map(q => <div key={q}>{q}</div>)}</td></tr>
      <tr><td>Bot 3 should answer</td><td className="mono">{t[2]}</td></tr>
    </tbody></table>
    <p className="qm-small">{examples.length} in training{heldHere.length ? `, ${heldHere.length} held out (never trained on)` : ''}. Some of them:</p>
    <ol className="nlp-dialogues">{examples.slice(0, 6).map(([u, b], i) => <li key={i}><span className="mono">« {u}</span> <span className="mono nlp-botline">» {b}</span></li>)}</ol>
    {heldHere.length > 0 && <><h4 className="qm-small-h">Held out</h4><ol className="nlp-dialogues held">{heldHere.slice(0, 6).map(([u, b], i) => <li key={i}><span className="mono">« {u}</span> <span className="mono nlp-botline">» {b}</span></li>)}</ol></>}
    <p className="qm-hint">In all: {train.length} conversations for training, {held.length} held out.</p>
  </div>
}

export function ChatPanel({ bot, compact = false }) {
  const [log, setLog] = useState([])
  const [draft, setDraft] = useState('')
  const [temperature, setTemperature] = useState(0)
  useEffect(() => setLog([]), [bot])
  const history = log.flatMap(m => (m.who === 'you' ? [Ch.USER, ...Ch.chatTokens(m.text), Ch.END] : [Ch.BOT, ...m.tokens, Ch.END]))
  const send = text => {
    if (!text.trim()) return
    const r = Ch.replyTrace(bot.vocab, bot.model, history, text, { temperature, k: temperature ? 5 : 0, rng: new Rng(Date.now() % 100000) })
    setLog(l => [...l, { who: 'you', text }, { who: 'bot', tokens: r.reply, unknown: r.unknown }]); setDraft('')
  }
  const asks = ['is the shop open on thursday', 'my wheel is bent', 'my chain is rusty', 'where is order 512', 'do you sell pizza', 'what is the meaning of life']
  return <div className="nlp-chat">
    <div className="nlp-chat-log" aria-live="polite">{log.map((m, i) => <div key={i} className={`nlp-msg ${m.who}`}>
      <p>{m.who === 'you' ? m.text : Ch.detokenize(m.tokens) || '…'}</p>
      {m.unknown?.length > 0 && <p className="qm-hint">Never seen in training, read as &lt;unk&gt;: {m.unknown.join(', ')}</p>}
    </div>)}</div>
    <form onSubmit={e => { e.preventDefault(); send(draft) }} className="nlp-chat-form">
      <input aria-label="Message to Bot 3" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Talk to Bot 3…" />
      <button className="qm-primary">Send</button>
      <button type="button" className="qm-quiet" onClick={() => setLog([])}>New conversation</button>
    </form>
    {!compact && <div className="qm-fig-controls">
      <Slider label="Temperature" value={temperature} min={0} max={1.5} step={0.1} onChange={setTemperature} format={v => (v === 0 ? '0 (greedy)' : v)} />
      {asks.map(a => <button key={a} className="qm-quiet" onClick={() => send(a)}>“{a}”</button>)}
    </div>}
  </div>
}

export function ChatTrainer() {
  const bot = useBot()
  const [train, held] = useMemo(() => Ch.makeDialogues(), [])
  const [steps, setSteps] = useState(10000)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(null)
  const [note, setNote] = useState('')
  const timer = useRef(null), trainer = useRef(null), file = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const stop = () => { clearTimeout(timer.current); setRunning(false) }
  const start = () => {
    stop(); setNote('')
    trainer.current = Ch.makeChatTrainer(train, { lr: 0.002 })
    setRunning(true)
    const tick = () => {
      const t = trainer.current
      t.step(Math.min(50, steps - t.attempts))
      const curve = []
      for (let i = 0; i + 100 <= t.losses.length; i += 100) curve.push(t.losses.slice(i, i + 100).reduce((s, x) => s + x, 0) / 100)
      const done = t.attempts >= steps
      const result = { done: t.attempts, total: steps, curve, avg: t.losses.slice(-200).reduce((s, x) => s + x, 0) / Math.min(200, t.losses.length || 1) }
      if (done) {
        const repair = held.filter(([u]) => !u.includes('order')), orders = held.filter(([u]) => u.includes('order'))
        result.exact = { train: Ch.exactMatch(t.vocab, t.model, train), repair: Ch.exactMatch(t.vocab, t.model, repair), orders: Ch.exactMatch(t.vocab, t.model, orders), nRepair: repair.length, nOrders: orders.length }
        setBot({ vocab: t.vocab, model: t.model, source: `trained here for ${steps.toLocaleString('en-GB')} steps` })
      }
      setProgress(result)
      if (!done) timer.current = setTimeout(tick, 0); else setRunning(false)
    }
    timer.current = setTimeout(tick, 0)
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([Ch.chatToSafetensors(bot.vocab, bot.model)], { type: 'application/octet-stream' }))
    const a = document.createElement('a'); a.href = url; a.download = 'bot3.safetensors'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNote('Downloaded bot3.safetensors.')
  }
  const upload = async e => {
    const chosen = e.target.files?.[0]; e.target.value = ''
    if (!chosen) return
    try { const { vocab, model } = Ch.chatFromSafetensors(new Uint8Array(await chosen.arrayBuffer())); stop(); setBot({ vocab, model, source: `loaded from ${chosen.name}` }); setNote(`Loaded ${chosen.name}: ${vocab.length} tokens.`) }
    catch (err) { setNote(`Not loaded: ${err.message}`) }
  }
  const curve = progress?.curve ?? [], max = Math.max(1, ...curve)
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <button className="qm-primary" onClick={start} disabled={running}>{progress ? '↺ Train again' : '▶ Train Bot 3'}</button>
      {running && <button onClick={stop}>Pause</button>}
      <Slider label="Steps" value={steps} min={1000} max={20000} step={1000} onChange={setSteps} />
      <button onClick={() => file.current?.click()}>Upload a saved Bot 3…</button>
      {bot && <button onClick={download}>Download .safetensors</button>}
      <input ref={file} type="file" accept=".safetensors" hidden onChange={upload} aria-label="Upload a Bot 3 model" />
    </div>
    <p className="qm-small">{train.length} conversations to learn from, {held.length} held out. Each step: a random window of 32 tokens, graded on the bot’s tokens only.</p>
    {progress && <div className="qm-fig-row">
      <div className="qm-fig-side">
        <p className="qm-small">Step <b>{progress.done}</b> of {progress.total} · loss <b>{f(progress.avg, 3)}</b>{running ? ' · training…' : ''}</p>
        {curve.length > 1 && <svg className="qm-plot" viewBox="0 0 300 100" role="img" aria-label="Loss falling"><polyline fill="none" stroke="#3f5bb5" strokeWidth="1.5" points={curve.map((l, i) => `${5 + 290 * (i + 1) * 100 / progress.total},${95 - 90 * l / max}`).join(' ')} /></svg>}
      </div>
      {progress.exact && <div className="qm-fig-side"><h4 className="qm-small-h">Replies exactly right</h4>
        <table className="qm-log nlp-left"><tbody>
          <tr><td>Training messages ({train.length})</td><td><b>{Math.round(progress.exact.train * 100)}%</b></td></tr>
          <tr><td>Held-out repairs ({progress.exact.nRepair}: part and problem never seen together)</td><td><b>{Math.round(progress.exact.repair * 100)}%</b></td></tr>
          <tr><td>Held-out orders ({progress.exact.nOrders}: numbers never seen)</td><td><b>{Math.round(progress.exact.orders * 100)}%</b></td></tr>
        </tbody></table></div>}
    </div>}
    {note && <p className="qm-hint" role="status">{note}</p>}
    {bot ? <><h4 className="qm-small-h">Talk to Bot 3 ({bot.source})</h4><ChatPanel bot={bot} /></> : <p className="qm-hint">Train it (about a minute or two), or upload a Bot 3 you saved, then talk to it here.</p>}
  </div>
}

export function DecodeTrace() {
  const bot = useBot()
  const [message, setMessage] = useState('is the shop open on thursday')
  const [temperature, setTemperature] = useState(0)
  const [k, setK] = useState(0)
  const [seed, setSeed] = useState(1)
  if (!bot) return <div className="qm-fig"><p className="qm-hint">This figure uses Bot 3. Train it in lesson 6.4 (or upload a saved one there), then come back.</p></div>
  const r = Ch.replyTrace(bot.vocab, bot.model, [], message, { temperature, k, rng: new Rng(seed) })
  return <div className="qm-fig">
    <label className="nlp-input"><span>Message</span><input value={message} onChange={e => setMessage(e.target.value)} /></label>
    <div className="qm-fig-controls">
      <Slider label="Temperature" value={temperature} min={0} max={2} step={0.1} onChange={setTemperature} format={v => (v === 0 ? '0 (greedy)' : v)} />
      <Slider label="Top-k" value={k} min={0} max={10} step={1} onChange={setK} format={v => (v === 0 ? 'off' : v)} />
      {temperature > 0 && <button onClick={() => setSeed(s => s + 1)}>Sample again</button>}
    </div>
    <p className="nlp-sampled"><b>» </b>{Ch.detokenize(r.reply)}</p>
    <table className="qm-log nlp-left"><thead><tr><th>#</th><th>Chose</th><th>Its probability</th><th>The 3 most likely (before temperature)</th></tr></thead>
      <tbody>{r.steps.map((s, i) => <tr key={i} className={s.token === Ch.END ? 'qm-row-pick' : ''}><td>{i + 1}</td><td className="mono">{s.token}</td><td>{f(s.p, 3)}</td><td className="mono">{s.top.map(([p, t]) => `${t} ${f(p, 2)}`).join(' · ')}</td></tr>)}</tbody></table>
    <p className="qm-hint">The highlighted row is ¶: the bot ending its turn. Without that token, it would keep writing until the 30-token limit.</p>
  </div>
}

export function ThreeBots() {
  const bot = useBot()
  return <div className="qm-fig">{bot ? <ChatPanel bot={bot} /> : <p className="qm-hint">Train Bot 3 in lesson 6.4 (or upload a saved one there) to try it here.</p>}</div>
}
