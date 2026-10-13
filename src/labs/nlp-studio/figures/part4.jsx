import { useEffect, useMemo, useRef, useState } from 'react'
import * as V from '../engine/vectors.js'
import * as C from '../engine/counting.js'
import { SENTENCES } from '../engine/corpus.js'
import { INTENTS } from '../engine/data.js'

const f = (x, d = 3) => (Number.isInteger(x) ? String(x) : x.toFixed(d))
const BIKE = SENTENCES.map(C.words)
// Colours for the map only, so you can see whether the groups come out: the program never sees them.
const GROUPS = {
  repair: ['chain', 'chains', 'tyre', 'tyres', 'brake', 'brakes', 'gears', 'wheel', 'tube', 'repair', 'service', 'mechanic', 'fix', 'broke', 'broken', 'snapped', 'flat', 'squeak', 'squeaks', 'slip', 'bent', 'crash'],
  hours: ['open', 'opens', 'opening', 'close', 'closes', 'closed', 'monday', 'saturday', 'sunday', 'morning', 'evening', 'night', 'nine', 'six', 'ten', 'four', 'hours', 'time', 'today', 'week'],
  order: ['order', 'parcel', 'delivery', 'delivered', 'shipped', 'ships', 'arrived', 'arrives', 'track', 'tracking', 'link', 'email', 'number', 'late', 'days'],
  chat: ['hello', 'hi', 'welcome', 'good', 'thanks', 'thank', 'goodbye', 'bye', 'see', 'soon', 'nice', 'help'],
}
const COLOUR = { repair: '#b5452f', hours: '#1f6f68', order: '#3f5bb5', chat: '#7a3fb0' }
const groupOf = w => Object.keys(GROUPS).find(g => GROUPS[g].includes(w))
const Slider = ({ label, value, min, max, step, onChange }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{value}</b></label>

export function CooccurrenceExplorer() {
  const [span, setSpan] = useState(2)
  const [word, setWord] = useState('chain')
  const [vocab, counts] = useMemo(() => V.cooccurrence(BIKE, span), [span])
  const P = useMemo(() => V.ppmi(counts), [counts])
  const k = vocab.indexOf(word)
  const byCount = k < 0 ? [] : vocab.map((w, i) => [counts[k][i], w]).filter(([c]) => c > 0).sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1)).slice(0, 10)
  const byPmi = k < 0 ? [] : vocab.map((w, i) => [P[k][i], w]).filter(([c]) => c > 0).sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1)).slice(0, 10)
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label>Word <select value={word} onChange={e => setWord(e.target.value)}>{vocab.map(w => <option key={w}>{w}</option>)}</select></label>
      <Slider label="Window (words each side)" value={span} min={1} max={4} step={1} onChange={setSpan} />
    </div>
    <p className="qm-small">{SENTENCES.length} sentences · {vocab.length} different words, so each word’s row has {vocab.length} numbers. Its nearest by cosine: <b>{k < 0 ? '—' : V.nearest(vocab, counts, word, 4).map(([, w]) => w).join(', ')}</b> (counts) and <b>{k < 0 ? '—' : V.nearest(vocab, P, word, 4).map(([, w]) => w).join(', ')}</b> (PPMI).</p>
    <div className="qm-fig-row">
      <div className="qm-fig-side"><h4 className="qm-small-h">Most frequent company (raw counts)</h4>
        <div className="qm-bars">{byCount.map(([c, w]) => <div key={w} className="qm-bar nlp-bar"><span className="mono">{w}</span><div style={{ width: `${(c / byCount[0][0]) * 100}%` }} /><b>{c}</b></div>)}</div></div>
      <div className="qm-fig-side"><h4 className="qm-small-h">Most surprising company (PPMI)</h4>
        <div className="qm-bars">{byPmi.map(([c, w]) => <div key={w} className="qm-bar nlp-bar pick"><span className="mono">{w}</span><div style={{ width: `${(c / byPmi[0][0]) * 100}%` }} /><b>{f(c, 2)}</b></div>)}</div></div>
    </div>
  </div>
}

// Words on a 2-D map: their vectors projected onto the two directions they spread out most in.
export function MapPlot({ vocab, points, focus, onFocus, neighbours = [], height = 380 }) {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const W = 640, H = height, P = 28
  const X = x => P + (W - 2 * P) * (x - x0) / ((x1 - x0) || 1), Y = y => H - P - (H - 2 * P) * (y - y0) / ((y1 - y0) || 1)
  const k = vocab.indexOf(focus)
  const near = new Set(neighbours)
  return <svg className="nlp-map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A map of the words">
    {k >= 0 && neighbours.map(w => { const j = vocab.indexOf(w); return j >= 0 && <line key={w} x1={X(points[k][0])} y1={Y(points[k][1])} x2={X(points[j][0])} y2={Y(points[j][1])} className="nlp-map-link" /> })}
    {vocab.map((w, i) => { const g = groupOf(w); return <g key={w} className={`nlp-map-word${w === focus ? ' focus' : ''}${near.has(w) ? ' near' : ''}${g ? '' : ' plain'}`} onClick={() => onFocus?.(w)}>
      <circle cx={X(points[i][0])} cy={Y(points[i][1])} r={w === focus ? 4.5 : 2.6} fill={COLOUR[g] ?? '#9aa0b3'} />
      {(g || w === focus) && <text x={X(points[i][0]) + 4} y={Y(points[i][1]) - 3} fill={COLOUR[g] ?? '#646a7c'}>{w}</text>}
    </g> })}
  </svg>
}
const Legend = () => <p className="qm-hint">{Object.entries(COLOUR).map(([g, c]) => <span key={g} style={{ color: c, marginRight: 12, fontWeight: 700 }}>● {g} words</span>)} <span className="qm-dim">● other words (unlabelled). The colours are only for you: the program never sees them.</span></p>

export function WordMap({ source = 'ppmi' }) {
  const [vocab, vectors] = useMemo(() => { if (source === 'ppmi') { const [v, counts] = V.cooccurrence(BIKE); return [v, V.ppmi(counts)] } const [v, w] = V.trainBikeVectors(SENTENCES); return [v, w] }, [source])
  const points = useMemo(() => { const [mean, dirs] = V.topDirections(vectors); return V.project(vectors, mean, dirs) }, [vectors])
  const [focus, setFocus] = useState('chain')
  const near = vocab.includes(focus) ? V.nearest(vocab, vectors, focus, 5).map(([, w]) => w) : []
  return <div className="qm-fig">
    <MapPlot vocab={vocab} points={points} focus={focus} onFocus={setFocus} neighbours={near} />
    <Legend />
    <p className="qm-small">Click a word. Its 5 nearest by cosine <b>in all {vectors[0].length} dimensions</b>: {near.join(', ')}. Lines join them on the map; a neighbour far away on the map is close in a direction the map can’t show.</p>
  </div>
}

// One training step, with every number shown.
export function PairUpdate() {
  const [u, setU] = useState([0.5, -1, 2]), [v, setV] = useState([1, 0.25, -0.5])
  const [label, setLabel] = useState(1), [lr, setLr] = useState(0.5)
  const s = C.dot(u, v), p = V.sigmoid(s), g = label - p
  const [du, dv] = V.pairGradient(u, v, label)
  const u2 = u.map((a, d) => a + lr * du[d]), v2 = v.map((b, d) => b + lr * dv[d])
  const p2 = V.sigmoid(C.dot(u2, v2))
  const Vec = ({ value, onChange, name }) => <span className="nlp-vec">{name} = [{value.map((x, d) => <input key={d} aria-label={`${name}${d}`} type="number" step="0.25" value={x} onChange={e => onChange(value.map((y, k) => (k === d ? Number(e.target.value) : y)))} />)}]</span>
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <Vec name="u" value={u} onChange={setU} /> <Vec name="v" value={v} onChange={setV} />
      <label>pair <select value={label} onChange={e => setLabel(Number(e.target.value))}><option value={1}>real neighbours (label 1)</option><option value={0}>random word (label 0)</option></select></label>
      <Slider label="learning rate" value={lr} min={0.05} max={2} step={0.05} onChange={setLr} />
    </div>
    <table className="qm-log nlp-left"><tbody>
      <tr><td>u · v</td><td className="mono">{f(s)}</td><td>how alike the two vectors are now</td></tr>
      <tr><td>p = σ(u · v)</td><td className="mono">{f(p)}</td><td>the model’s probability that these are real neighbours</td></tr>
      <tr><td>g = label − p</td><td className="mono">{f(g)}</td><td>{label ? 'how far below 1 it is: push the vectors together' : 'how far above 0 it is: push them apart'}</td></tr>
      <tr><td>u + lr · g · v</td><td className="mono">[{u2.map(x => f(x)).join(', ')}]</td><td>u moves towards v (or away, if g &lt; 0)</td></tr>
      <tr><td>v + lr · g · u</td><td className="mono">[{v2.map(x => f(x)).join(', ')}]</td><td>and v towards u</td></tr>
      <tr className="qm-sum"><td>σ after the step</td><td className="mono">{f(p2)}</td><td>{label ? (p2 > p ? 'higher: closer to 1 ✓' : 'not higher: the learning rate is too big') : (p2 < p ? 'lower: closer to 0 ✓' : 'not lower: the learning rate is too big')}</td></tr>
    </tbody></table>
  </div>
}

export function Word2vecTrainer() {
  const [settings, setSettings] = useState({ dim: 16, window: 2, negatives: 3, epochs: 40, lr: 0.05, seed: 1 })
  const [state, setState] = useState(null)
  const [running, setRunning] = useState(false)
  const [focus, setFocus] = useState('chain')
  const gen = useRef(null), timer = useRef(null), history = useRef([])
  const stop = () => { clearTimeout(timer.current); setRunning(false) }
  useEffect(() => () => clearTimeout(timer.current), [])
  const start = () => {
    stop()
    gen.current = V.word2vecPasses(BIKE, settings); history.current = []
    const first = gen.current.next().value
    setState({ ...first, vectors: first.vectors.map(r => [...r]), losses: [] })
    setRunning(true)
    const tick = () => {
      const r = gen.current.next()
      if (r.done) { setRunning(false); return }
      history.current.push(r.value.loss)
      setState({ ...r.value, vectors: r.value.vectors.map(row => [...row]), losses: [...history.current] })
      timer.current = setTimeout(tick, 60)
    }
    timer.current = setTimeout(tick, 60)
  }
  const points = useMemo(() => { if (!state) return null; const [mean, dirs] = V.topDirections(state.vectors); return V.project(state.vectors, mean, dirs) }, [state])
  const near = state && state.vocab.includes(focus) ? V.nearest(state.vocab, state.vectors, focus, 5) : []
  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }))
  const losses = state?.losses ?? []
  const maxLoss = Math.max(1, ...losses)
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <button className="qm-primary" onClick={start}>{state ? '↺ Train again' : '▶ Train'}</button>
      {running && <button onClick={stop}>Pause</button>}
      <Slider label="Dimensions" value={settings.dim} min={2} max={32} step={1} onChange={v => set('dim', v)} />
      <Slider label="Passes" value={settings.epochs} min={1} max={80} step={1} onChange={v => set('epochs', v)} />
      <Slider label="Learning rate" value={settings.lr} min={0.005} max={0.2} step={0.005} onChange={v => set('lr', v)} />
      <Slider label="Seed" value={settings.seed} min={1} max={9} step={1} onChange={v => set('seed', v)} />
    </div>
    {!state ? <p className="qm-hint">Press Train. Every word starts as a small random vector, so the map starts as noise; each pass over the {SENTENCES.length} sentences nudges words that share neighbours towards each other.</p> : <>
      <p className="qm-small">Pass <b>{state.epoch}</b> of {settings.epochs}{state.loss !== null ? <> · loss <b>{f(state.loss, 0)}</b></> : ''}{running ? ' · training…' : ''}</p>
      <div className="qm-fig-row">
        <div style={{ flex: 2, minWidth: 320 }}><MapPlot vocab={state.vocab} points={points} focus={focus} onFocus={setFocus} neighbours={near.map(([, w]) => w)} height={340} /><Legend /></div>
        <div className="qm-fig-side">
          <h4 className="qm-small-h">Loss after each pass</h4>
          <svg className="qm-plot" viewBox="0 0 220 90" role="img" aria-label="Loss falling">{losses.length > 1 && <polyline fill="none" stroke="#3f5bb5" strokeWidth="2" points={losses.map((l, i) => `${5 + 210 * i / Math.max(1, settings.epochs - 1)},${85 - 80 * l / maxLoss}`).join(' ')} />}</svg>
          <h4 className="qm-small-h">Nearest to “{focus}” now</h4>
          <ol className="nlp-near">{near.map(([s, w]) => <li key={w}><span className="mono">{w}</span> <span className="qm-dim">{f(s, 2)}</span></li>)}</ol>
          <p className="qm-hint">Click any word on the map to follow it.</p>
        </div>
      </div>
    </>}
  </div>
}

export function AnalogyBox() {
  const [vocab, vectors] = useMemo(() => V.trainBikeVectors(SENTENCES), [])
  const [abc, setAbc] = useState(['morning', 'open', 'evening'])
  const ok = abc.every(w => vocab.includes(w))
  const result = ok ? V.analogy(vocab, vectors, ...abc) : null
  const presets = [['morning', 'open', 'evening'], ['chain', 'chains', 'tyre'], ['order', 'parcel', 'repair'], ['monday', 'open', 'sunday']]
  return <div className="qm-fig">
    <div className="qm-fig-controls nlp-analogy">
      {abc.map((w, i) => <select key={i} aria-label={['a', 'b', 'c'][i]} value={w} onChange={e => setAbc(x => x.map((y, k) => (k === i ? e.target.value : y)))}>{vocab.map(v => <option key={v}>{v}</option>)}</select>)}
    </div>
    <p className="nlp-analogy-line"><b>{abc[0]}</b> is to <b>{abc[1]}</b> as <b>{abc[2]}</b> is to <b className="nlp-answer">{result ? result[1] : '?'}</b> <span className="qm-dim">{result ? `(cosine ${f(result[0], 2)})` : ''}</span></p>
    <div className="qm-fig-controls">{presets.map(p => <button key={p.join()} className="qm-quiet" onClick={() => setAbc(p)}>{p[0]} : {p[1]} :: {p[2]} : ?</button>)}</div>
  </div>
}

export function MeaningBot() {
  const [vocab, vectors] = useMemo(() => V.trainBikeVectors(SENTENCES), [])
  const nb = useMemo(() => C.trainIntents(INTENTS), [])
  const [message, setMessage] = useState('my chain snapped')
  const content = V.contentWords(message)
  const unknown = content.filter(w => !vocab.includes(w))
  const byMeaning = V.semanticReply(INTENTS, vocab, vectors, message)
  const byCounts = C.intentReply(nb, INTENTS, message)
  const asks = ['my chain snapped', 'my tyre is flat', 'my wheel is bent', 'do you sell pizza', 'the delivery is late', 'is the shop open on saturday']
  const Answer = ({ title, r, value }) => <section className={r.intent ? '' : 'unsure'}><h4>{title}</h4><p><b>{r.intent ?? 'not sure'}</b> <span className="qm-dim">({value})</span></p><p className="qm-small">{r.reply}</p></section>
  return <div className="qm-fig">
    <label className="nlp-input"><span>Message</span><input value={message} onChange={e => setMessage(e.target.value)} /></label>
    <p className="qm-small">Content words (stop words removed): {content.length ? content.map(w => <code key={w} className={unknown.includes(w) ? 'nlp-unknown' : ''}>{w}{unknown.includes(w) ? ' (unknown)' : ''}</code>) : 'none'}</p>
    <div className="nlp-nb">
      <Answer title="Part 3: Naive Bayes on word counts" r={byCounts} value={`probability ${f(byCounts.confidence, 2)}`} />
      <Answer title="Part 4: nearest example by meaning" r={byMeaning} value={`cosine ${f(byMeaning.similarity, 2)}`} />
    </div>
    <div className="qm-bars">{Object.entries(byMeaning.scores).sort((a, b) => b[1] - a[1]).map(([l, s]) => <div key={l} className={`qm-bar nlp-bar${l === byMeaning.intent ? ' pick' : ''}`}><span className="mono">{l}</span><div style={{ width: `${Math.max(1, s * 100)}%` }} /><b>{f(s, 2)}</b></div>)}</div>
    <div className="qm-fig-controls">{asks.map(a => <button key={a} className="qm-quiet" onClick={() => setMessage(a)}>“{a}”</button>)}</div>
  </div>
}
