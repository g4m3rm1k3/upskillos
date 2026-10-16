// Part 2's figures: choosing a token (temperature and top-k), what sampling scores, earlier
// positions that never change, the cost of generating counted, the KV cache checked against the
// full forward pass, and the speed-up timed in this browser.
import { useState } from 'react'
import Plot from '../../cartpole-lab/figures/Plot.jsx'
import { exp, total, forward, nextLogits, newCache, forwardCached } from '../engine/gpt.js'
import { VOCAB, NEWLINE, QUESTIONS, encode, decode } from '../engine/arith.js'
import { generate, forwardCost, cachedCost, generationCost, timeBoth } from '../engine/generate.js'
import { baseModel } from '../engine/models.js'
import { f } from '../lessons/util.js'

const show = t => (t === '\n' ? '↵' : t)

// The probabilities sample() draws from: scores divided by the temperature, the top k kept,
// softmax over those. Temperature 0 puts everything on the highest score.
export function sampling(row, temperature, topK = null) {
  const order = [...row.keys()].sort((a, b) => row[b] - row[a]).slice(0, topK ?? row.length)
  const p = row.map(() => 0)
  if (temperature === 0) { p[order[0]] = 1; return p }
  const scaled = order.map(j => row[j] / temperature), e = scaled.map(s => exp(s - scaled[0])), z = total(e)
  order.forEach((j, i) => { p[j] = e[i] / z })
  return p
}

function Choices({ label, values, value, set, name = String }) {
  return <div className="llm-keys"><span className="qm-hint" style={{ alignSelf: 'center' }}>{label}</span>
    {values.map(v => <button key={String(v)} className={v === value ? 'qm-primary' : ''} aria-pressed={v === value} onClick={() => set(v)}>{name(v)}</button>)}
  </div>
}

// Next-token probabilities after 3+5= under a temperature and top-k, and 1,000 sampled answers.
export function SampleFig({ start = '3+5=' }) {
  const [temperature, setT] = useState(1), [topK, setK] = useState(null), [counts, setCounts] = useState(null)
  const [model] = baseModel()
  const p = sampling(nextLogits(model, encode(start)), temperature, topK)
  const order = p.map((x, j) => [x, j]).filter(([x]) => x > 0.0005).sort((a, b) => b[0] - a[0]).slice(0, 8)
  const draw = () => {
    const c = {}
    for (let seed = 0; seed < 1000; seed++) { const out = decode(generate(model, encode(start), NEWLINE, 3, temperature, topK, seed)); c[out] = (c[out] ?? 0) + 1 }
    setCounts({ temperature, topK, rows: Object.entries(c).sort((a, b) => b[1] - a[1]) })
  }
  const answer = /^(\d)\+(\d)=$/.exec(start), right = answer ? String(Number(answer[1]) + Number(answer[2])) : null
  return <div>
    <Choices label="temperature" values={[0, 0.5, 1, 2]} value={temperature} set={v => { setT(v); setCounts(null) }} />
    <Choices label="top-k" values={[null, 3, 2, 1]} value={topK} set={v => { setK(v); setCounts(null) }} name={v => (v === null ? 'all 17' : String(v))} />
    <div className="llm-out">{start}<span style={{ opacity: 0.4 }}> ▮ next?</span></div>
    <div className="llm-bars">{order.map(([x, j]) => [
      <span key={`t${j}`}>{show(VOCAB[j])}</span>,
      <span key={`b${j}`}><span className="llm-bar" style={{ display: 'block', width: `${Math.max(0.5, x * 100)}%` }} /></span>,
      <span key={`p${j}`}>{f(x, 4)}</span>,
    ])}</div>
    <p className="qm-hint">{temperature === 0 ? 'Temperature 0 is greedy: all the probability on the highest score.' : `Probabilities after dividing every score by ${temperature}${topK ? ` and keeping the top ${topK}` : ''}.`}</p>
    <button onClick={draw}>Sample 1,000 answers</button>
    {counts && <table className="qm-table"><thead><tr><th>answer</th><th>times out of 1,000</th></tr></thead>
      <tbody>{counts.rows.slice(0, 8).map(([out, n]) => <tr key={out}><td className={out === right ? 'good' : ''}><code>{out.replace(/\n/g, '↵') || '(nothing)'}</code>{out === right ? ' ✓' : ''}</td><td>{n}</td></tr>)}</tbody></table>}
    {counts && <p className="qm-hint">Seeds 0 to 999, temperature {counts.temperature}, top-k {counts.topK ?? 'all'}; {counts.rows.length} different answers in all.</p>}
  </div>
}

// Exact match over all 100 questions, 20 runs at each temperature (run s uses seed 1000 s + 10 a + b).
export function ScoreFig() {
  const [rows, setRows] = useState(null)
  const score = () => {
    const [model] = baseModel()
    setRows([0, 0.5, 1, 2].map(temperature => {
      const runs = Array.from({ length: 20 }, (_, s) => QUESTIONS.filter(([a, b]) => decode(generate(model, encode(`${a}+${b}=`), NEWLINE, 3, temperature, null, 1000 * s + 10 * a + b)) === String(a + b)).length)
      return { temperature, runs, mean: runs.reduce((x, y) => x + y, 0) / 20 }
    }))
  }
  return <div>
    <button onClick={score}>Score 20 runs at each temperature</button>
    {rows && <table className="qm-table"><thead><tr><th>temperature</th><th>average right (of 100)</th><th>lowest</th><th>highest</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.temperature}><td>{r.temperature}{r.temperature === 0 ? ' (greedy)' : ''}</td><td>{f(r.mean, 2)}</td><td>{Math.min(...r.runs)}</td><td>{Math.max(...r.runs)}</td></tr>)}</tbody></table>}
  </div>
}

// The full forward pass on a text and on the same text one token longer: the earlier rows agree.
export function ReuseFig({ text = '3+5=', next = '8' }) {
  const [model] = baseModel()
  const [short] = forward(model, encode(text)), [long] = forward(model, encode(text + next))
  const same = short.data.every((row, i) => row.every((x, j) => x === long.data[i][j]))
  return <div>
    <table className="qm-table"><thead><tr><th>position</th><th>token</th><th>first 4 logits, pass over <code>{text}</code></th><th>first 4 logits, pass over <code>{text + next}</code></th></tr></thead>
      <tbody>{encode(text + next).map((t, i) => <tr key={i}><td>{i}</td><td><code>{show(VOCAB[t])}</code></td>
        <td className="mono">{short.data[i] ? short.data[i].slice(0, 4).map(x => f(x, 4)).join(', ') : '(not in this pass)'}</td>
        <td className="mono">{long.data[i].slice(0, 4).map(x => f(x, 4)).join(', ')}</td></tr>)}</tbody></table>
    <p className="qm-hint">Every one of the {short.data.length} × {VOCAB.length} logits the two passes share is {same ? <b>identical</b> : <b>different</b>} (compared with <code>===</code>, all 17 digits). Only the last row is new.</p>
  </div>
}

// Multiplications per new token, without the cache (a whole forward pass) and with it.
export function CostFig({ cached = false }) {
  const [length, setLength] = useState(16)
  const positions = Array.from({ length: length - 1 }, (_, i) => i + 1)
  const series = [{ values: positions.map(n => forwardCost(n) / 1000), color: '#b4532a', label: 'without the cache' }]
  if (cached) series.push({ values: positions.map(n => cachedCost(n - 1) / 1000), color: '#1f6f68', label: 'with the cache' })
  const [without, withCache] = generationCost(1, length - 1)
  return <div>
    <label className="qm-hint">Write {length - 1} tokens after 1 (text of {length} tokens) <input type="range" min={4} max={64} value={length} onChange={e => setLength(Number(e.target.value))} aria-label="length" /></label>
    <h4>Thousands of multiplications for each new token</h4>
    <Plot series={series} window={1} x="new token" label="multiplications per token" height={160} />
    <p className="qm-hint">In all: <b>{without.toLocaleString('en')}</b> without the cache{cached ? <>, <b>{withCache.toLocaleString('en')}</b> with it: {f(without / withCache, 2)} times fewer</> : ''}.{length > 16 ? ' (Beyond 16 tokens this counts a model with more positions; ours has 16.)' : ''}</p>
  </div>
}

// The cache filled one token at a time, each position's scores compared with a full forward pass.
export function CacheFig({ text = '3+5=8\n1+1=' }) {
  const [model] = baseModel()
  const ids = encode(text), cache = newCache()
  const rows = ids.map((t, n) => {
    const a = forwardCached(model, cache, t), b = nextLogits(model, ids.slice(0, n + 1))
    return { t, n, keys: cache.k.length, diff: Math.max(...a.map((x, j) => Math.abs(x - b[j]))), same: a.every((x, j) => x === b[j]), next: a.indexOf(Math.max(...a)) }
  })
  return <div>
    <table className="qm-table"><thead><tr><th>position</th><th>token fed in</th><th>cache holds</th><th>most likely next</th><th>largest difference from the full pass</th><th>identical?</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.n}><td>{r.n}</td><td><code>{show(VOCAB[r.t])}</code></td><td>{r.keys} keys, {r.keys} values</td><td><code>{show(VOCAB[r.next])}</code></td><td>{r.diff}</td><td>{r.same ? '✓' : '✗'}</td></tr>)}</tbody></table>
    <p className="qm-hint">After the last token the cache holds {cache.k.length} keys and {cache.v.length} values of 16 numbers each: {2 * cache.k.length * 16} numbers.</p>
  </div>
}

// Python's times, measured with time_both() on 2026-10-16 (Apple M4, Python 3.13.2, medians of 3).
const PYTHON = { 16: [0.022, 0.0022, 10.1], 32: [0.092, 0.0047, 19.4], 64: [0.438, 0.0113, 38.8], 128: [2.327, 0.03, 77.7] }

export function SpeedFig() {
  const [rows, setRows] = useState(null)
  const measure = () => {
    timeBoth(16)
    setRows([16, 32, 64, 128].map(length => {
      const t = timeBoth(length), [without, withCache] = generationCost(1, length - 1)
      return { length, ...t, ratio: without / withCache }
    }))
  }
  return <div>
    <button onClick={measure}>Measure in this browser</button>
    <table className="qm-table"><thead><tr><th>text length</th><th>multiplications, without ÷ with</th><th>Python: without, with, speed-up</th>{rows && <th>this browser: without, with, speed-up</th>}</tr></thead>
      <tbody>{[16, 32, 64, 128].map((length, i) => { const [w, c, up] = PYTHON[length], r = rows?.[i], [m0, m1] = generationCost(1, length - 1); return <tr key={length}>
        <td>{length}</td><td>{f(m0 / m1, 1)}</td><td>{w} s, {c} s, <b>{up}×</b></td>
        {r && <td>{f(r.without, 1)} ms, {f(r.with, 2)} ms, <b>{f(r.without / r.with, 1)}×</b>{r.same ? '' : ' (different tokens!)'}</td>}
      </tr> })}</tbody></table>
    {rows && <p className="qm-hint">Both ways wrote the same tokens every time: {rows.every(r => r.same) ? 'yes' : 'no'}. Times vary from run to run and machine to machine; the multiplication counts don't.</p>}
  </div>
}
