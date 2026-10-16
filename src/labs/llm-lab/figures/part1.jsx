// Part 1's figures: the vocabulary, next-token probabilities, why exp is our own, the shapes of
// one forward pass, pretraining live, the base model's answers, and asking it a question.
import { useEffect, useRef, useState } from 'react'
import Plot from '../../cartpole-lab/figures/Plot.jsx'
import { exp, forward, nextLogits, greedy, total } from '../engine/gpt.js'
import { VOCAB, INDEX, NEWLINE, encode, decode, complete, exactMatch, makePretrainer, QUESTIONS } from '../engine/arith.js'
import { baseModel } from '../engine/models.js'
import { f } from '../lessons/util.js'

const show = t => (t === '\n' ? '↵' : t)
export const probabilities = row => { const top = Math.max(...row), e = row.map(x => exp(x - top)), z = total(e); return e.map(x => x / z) }

function TokenRow({ ids }) {
  return <div className="llm-tokens">{ids.map((t, i) => <span key={i} className={`llm-token ${VOCAB[t].length > 1 ? 'special' : ''}`}>{show(VOCAB[t])}<small>{t}</small></span>)}</div>
}

// Type with the vocabulary's keys; see the token ids.
function Keys({ text, setText, specials = false }) {
  const keys = VOCAB.filter(t => specials || t.length === 1)
  return <div className="llm-keys">
    {keys.map(t => <button key={t} onClick={() => setText(text + t)}>{show(t)}</button>)}
    <button onClick={() => setText(text.slice(0, -1))}>⌫</button><button onClick={() => setText('')}>Clear</button>
  </div>
}

export function VocabFig() {
  const [text, setText] = useState('3+5=8\n')
  return <div>
    <p className="qm-hint">The whole vocabulary: 17 tokens, each with its id.</p>
    <TokenRow ids={VOCAB.map((_, k) => k)} />
    <p className="qm-hint">Type a text with these keys and see the ids the model receives.</p>
    <Keys text={text} setText={setText} />
    <div className="llm-out">{text.replace(/\n/g, '↵') || ' '}</div>
    <TokenRow ids={encode(text)} />
  </div>
}

function Bars({ probs, right }) {
  const order = probs.map((p, k) => [p, k]).sort((a, b) => b[0] - a[0]).slice(0, 6)
  return <div className="llm-bars">{order.map(([p, k]) => [
    <span key={`t${k}`}>{show(VOCAB[k])}</span>,
    <span key={`b${k}`}><span className={`llm-bar ${k === right ? 'right' : ''}`} style={{ display: 'block', width: `${Math.max(0.5, p * 100)}%` }} /></span>,
    <span key={`p${k}`}>{f(p, 3)}</span>,
  ])}</div>
}

export function NextTokenFig({ start = '3+5=' }) {
  const [text, setText] = useState(start)
  const [model] = baseModel()
  const ids = encode(text)
  const probs = ids.length ? probabilities(nextLogits(model, ids)) : null
  const m = /^(\d)\+(\d)=$/.exec(text.split('\n').at(-1))
  const right = m ? INDEX[String(Number(m[1]) + Number(m[2]))[0]] : -1
  return <div>
    <Keys text={text} setText={setText} />
    <div className="llm-out">{text.replace(/\n/g, '↵') || ' '}<span style={{ opacity: 0.4 }}> ▮ next?</span></div>
    {probs ? <Bars probs={probs} right={right} /> : <p className="qm-hint">Type at least one token.</p>}
    {m && <p className="qm-hint">Green: the first digit of the right answer, {Number(m[1]) + Number(m[2])}.</p>}
  </div>
}

// Our exp against the browser's own Math.exp, bit for bit.
export function BitsFig() {
  const xs = [-0.1, -0.7, -1.3, -2.9, -5.5, -11.2]
  const bits = x => { const b = new DataView(new ArrayBuffer(8)); b.setFloat64(0, x); return b.getBigUint64(0) }
  return <table className="qm-table"><thead><tr><th>x</th><th>Math.exp(x)</th><th>our exp(x)</th><th>apart (in last-bit steps)</th></tr></thead>
    <tbody>{xs.map(x => { const a = Math.exp(x), b = exp(x); return <tr key={x}><td>{x}</td><td>{a.toPrecision(17)}</td><td>{b.toPrecision(17)}</td><td>{String(bits(a) > bits(b) ? bits(a) - bits(b) : bits(b) - bits(a))}</td></tr> })}</tbody></table>
}

// The shapes of one forward pass, from the base model on a short text.
export function ForwardFig({ text = '3+5=' }) {
  const [model] = baseModel()
  const ids = encode(text)
  const [logits, , weights] = forward(model, ids)
  const n = ids.length, d = model.wq.length, h = model.w1[0].length, V = VOCAB.length
  const rows = [
    ['ids', `${n} token ids`, `[${ids.join(', ')}]`],
    ['embed(tok) + embed(pos) = x', `${n} × ${d}`, 'one row of 16 numbers per position'],
    ['q, k, v', `${n} × ${d} each`, 'what each position looks for, offers, and passes on'],
    ['weights (attention)', `${n} × ${n}`, 'how much each position looks at each earlier one'],
    ['after the MLP', `${n} × ${h} then back to ${n} × ${d}`, 'each position on its own'],
    ['logits', `${n} × ${V}`, 'a score for every token, at every position'],
  ]
  return <div>
    <table className="qm-table"><thead><tr><th>Step</th><th>Shape</th><th>One row is</th></tr></thead><tbody>{rows.map(r => <tr key={r[0]}><td><code>{r[0]}</code></td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody></table>
    <p className="qm-hint">The last position's attention weights (row {n - 1}): {weights.data[n - 1].slice(0, n).map(x => f(x, 3)).join(', ')}. Its logits become the next-token probabilities of lesson 1.1.</p>
    <p className="qm-hint">Last row of the logits: {logits.data[n - 1].map(x => f(x, 2)).join(', ')}</p>
  </div>
}

// Pretraining live, a slice of steps at a time, with the loss and the exact-match score.
export function PretrainFig({ steps = 1500 }) {
  const [run, setRun] = useState(null)
  const [, redraw] = useState(0)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const start = () => {
    const t = makePretrainer()
    setRun({ t, done: false, score: null })
    const slice = () => {
      t.step(50)
      if (t.losses.length < steps) { redraw(x => x + 1); timer.current = setTimeout(slice, 0) } else setRun({ t, done: true, score: exactMatch(t.model) })
    }
    timer.current = setTimeout(slice, 0)
  }
  const losses = run?.t.losses ?? []
  return <div>
    <button onClick={start} disabled={run && !run.done}>{run ? (run.done ? 'Pretrain again' : `Pretraining… ${losses.length} / ${steps}`) : `Pretrain ${steps} steps`}</button>
    <Plot series={[{ values: losses, color: '#1f6f68' }]} window={50} x="step" label="loss" height={150} />
    {losses.length > 0 && <p className="qm-hint">Loss at step 1: {f(losses[0], 3)}; average of the last 100 steps: {f(losses.slice(-100).reduce((s, x) => s + x, 0) / Math.min(100, losses.length), 3)}.</p>}
    {run?.done && <p className="qm-hint">Exact match on all 100 questions: <b>{run.score} / 100</b>, the same run as <code>python3 pretrain.py</code>.</p>}
  </div>
}

// The base model's answer to every question: rows a, columns b.
export function AnswerGrid() {
  const [model] = baseModel()
  const answers = QUESTIONS.map(([a, b]) => complete(model, a, b))
  return <div>
    <table className="llm-grid"><thead><tr><th>a \ b</th>{[...Array(10).keys()].map(b => <th key={b}>{b}</th>)}</tr></thead>
      <tbody>{[...Array(10).keys()].map(a => <tr key={a}><th>{a}</th>{[...Array(10).keys()].map(b => { const out = answers[a * 10 + b]; return <td key={b} className={out === String(a + b) ? 'good' : 'bad'} title={`${a}+${b}=${out || '(nothing)'}`}>{out || '·'}</td> })}</tr>)}</tbody></table>
    <p className="qm-hint">Green: right. {answers.filter((x, k) => x === String(QUESTIONS[k][0] + QUESTIONS[k][1])).length} of 100; "10" is written {answers.filter(x => x === '10').length} times.</p>
  </div>
}

// The same question as a notebook line and in a chat format the base model never saw.
export function AskFig() {
  const [model] = baseModel()
  const user = INDEX['<user>'], bot = INDEX['<bot>'], end = INDEX['<end>']
  const asNote = decode(greedy(model, encode('3+5='), NEWLINE, 3))
  const chatIds = [user, ...encode('3+5?'), bot]
  const asChat = decode(greedy(model, chatIds, end, 6))
  return <div className="llm-row">
    <div><h4>As a notebook line</h4><TokenRow ids={encode('3+5=')} /><div className="llm-out">{'3+5='}<b>{asNote}</b></div></div>
    <div><h4>As a question</h4><TokenRow ids={chatIds} /><div className="llm-out">{'<user>3+5?<bot>'}<b>{asChat.replace(/\n/g, '↵')}</b></div></div>
  </div>
}
