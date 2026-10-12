import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import Plot from '../../cartpole-lab/figures/Plot.jsx'
import { Slider } from '../../qmaze-lab/figures/ui.jsx'
import { fmt } from '../../python-steps/format.js'
import { softmax, crossEntropy, oneHot, SPECIES, loadIris, trainSoftmax, predictSpecies, confusionMatrix, digitData, loadDigits, padToPixels } from '../engine/part3.js'
import { makeMLP, makeOptimizer, trainSteps, predictOne } from '../engine/mlp.js'

export const CLASS_COLORS = ['#1f6f68', '#c26a12', '#7a3fb0', '#a8402f', '#2f6db5', '#6b8e23', '#b03a7a', '#4a4a4a', '#c79a00', '#0f8f8f']
const pct = x => `${fmt(100 * x, 1)}%`

// Probability bars, one per class.
export function ProbBars({ probs, names, highlight }) {
  return <div className="cp-bars nn-probbars">{probs.map((p, i) => [
    <span key={`l${i}`} style={{ fontWeight: i === highlight ? 700 : 400 }}>{names[i]}</span>,
    <span key={`b${i}`}><span className="cp-bar" style={{ display: 'block', width: `${p * 100}%`, background: CLASS_COLORS[i % 10] }} /></span>,
    <b key={`v${i}`} className="mono">{pct(p)}</b>])}</div>
}

// Three scores into three probabilities.
export function Softmax3Fig() {
  const [z, setZ] = useState([2, 1, 0.1])
  const p = softmax(z), powers = z.map(Math.exp), total = powers.reduce((a, b) => a + b, 0)
  return <div className="qm-fig">
    <div className="nn-row">
      <div>{z.map((v, i) => <Slider key={i} label={`score of ${SPECIES[i]}`} value={v} min={-5} max={5} step={0.05} onChange={x => setZ(o => o.map((q, k) => k === i ? x : q))} />)}
        <div className="qm-buttons"><button onClick={() => setZ(o => o.map(q => q + 1))}>add 1 to every score</button><button onClick={() => setZ(o => o.map(q => q * 2))}>double every score</button></div></div>
      <div><ProbBars probs={p} names={SPECIES} highlight={p.indexOf(Math.max(...p))} />
        <div className="nn-work">{z.map((v, i) => `e^${fmt(v, 2)} = ${fmt(powers[i], 3)}`).join('\n')}{`\ntotal = ${fmt(total, 3)}\n`}{z.map((v, i) => `p(${SPECIES[i]}) = ${fmt(powers[i], 3)} / ${fmt(total, 3)} = ${fmt(p[i], 4)}`).join('\n')}</div></div>
    </div>
    <p className="qm-hint">Adding the same number to every score changes nothing; doubling every score makes the winner surer. The probabilities always add up to 1.</p>
  </div>
}

// The cross-entropy of one answer, and its gradient: probabilities minus the one-hot target.
export function CeGradientFig() {
  const [z, setZ] = useState([0.5, 1.5, -0.5]), [label, setLabel] = useState(0)
  const p = softmax(z), t = oneHot(label, 3)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>true species <select value={label} onChange={e => setLabel(Number(e.target.value))}>{SPECIES.map((s, i) => <option key={s} value={i}>{s}</option>)}</select></label>
      {z.map((v, i) => <Slider key={i} label={`score ${i}`} value={v} min={-4} max={4} step={0.05} onChange={x => setZ(o => o.map((q, k) => k === i ? x : q))} />)}</div>
    <table className="qm-log"><thead><tr><th></th>{SPECIES.map(s => <th key={s}>{s}</th>)}</tr></thead><tbody>
      <tr><th>probability p</th>{p.map((x, i) => <td key={i} className="mono">{fmt(x, 3)}</td>)}</tr>
      <tr><th>target (one-hot)</th>{t.map((x, i) => <td key={i} className="mono">{x}</td>)}</tr>
      <tr><th>slope p − target</th>{p.map((x, i) => <td key={i} className="mono"><b>{fmt(x - t[i], 3)}</b></td>)}</tr>
    </tbody></table>
    <p>loss = −log p({SPECIES[label]}) = −log {fmt(p[label], 3)} = <b>{fmt(crossEntropy(p, label), 3)}</b>. Gradient descent moves each score against its slope: the true species' score up (its slope is negative), every other score down, each by how much probability it wrongly holds.</p>
  </div>
}

// Iris: petal length and width, three species, and the regions softmax regression learns.
export function IrisFig() {
  const [rows, labels] = useMemo(() => loadIris(), [])
  const run = useRef(null), [, redraw] = useReducer(n => n + 1, 0)
  if (!run.current) run.current = { gen: trainSoftmax({ steps: 100000 }), last: null }
  const [playing, setPlaying] = useState(false), [mine, setMine] = useState([4.5, 1.5])
  const steps = n => { for (let i = 0; i < n; i++) run.current.last = run.current.gen.next().value; redraw() }
  useEffect(() => { if (!playing) return undefined; const id = setInterval(() => steps(10), 40); return () => clearInterval(id) }, [playing])
  const u = run.current.last
  const S = 340, pad = 26, X = v => pad + (v - 0.5) / 7 * S, Y = v => pad + (2.8 - v) / 2.8 * S
  const cells = []
  if (u) for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) {
    const x = [0.5 + 7 * (i + 0.5) / 40, 2.8 - 2.8 * (j + 0.5) / 40], [c, probs] = predictSpecies(u.weights, u.biases, x)
    cells.push(<rect key={`${i}-${j}`} x={pad + i * S / 40} y={pad + j * S / 40} width={S / 40 + 0.4} height={S / 40 + 0.4} fill={CLASS_COLORS[c]} opacity={0.08 + 0.35 * probs[c]} />)
  }
  const acc = u ? rows.filter((x, i) => predictSpecies(u.weights, u.biases, x)[0] === labels[i]).length / rows.length : null
  const [best, probs] = u ? predictSpecies(u.weights, u.biases, mine) : [null, [1 / 3, 1 / 3, 1 / 3]]
  return <div className="qm-fig">
    <div className="qm-buttons"><button onClick={() => steps(1)}>One step</button><button onClick={() => steps(50)}>50 steps</button><button className="qm-primary" onClick={() => setPlaying(x => !x)}>{playing ? '⏸ Pause' : '▶ Train'}</button><button onClick={() => { run.current = null; setPlaying(false); redraw() }}>↺ Start again</button>
      <span className="qm-hint">{u ? `${u.step + 1} steps · loss ${fmt(u.history.at(-1), 4)} · ${pct(acc)} of the 150 flowers right` : 'all weights 0: every species ⅓'}</span></div>
    <div className="nn-row">
      <svg viewBox={`0 0 ${S + 2 * pad} ${S + 2 * pad}`} className="qm-plot nn-plane" role="img" aria-label="iris flowers by petal length and width" onClick={e => {
        const r = e.currentTarget.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * (S + 2 * pad), py = (e.clientY - r.top) / r.height * (S + 2 * pad)
        setMine([0.5 + (px - pad) / S * 7, 2.8 - (py - pad) / S * 2.8])
      }}>
        <rect x={pad} y={pad} width={S} height={S} fill="#fffdf8" stroke="#d9ceb9" />{cells}
        {rows.map(([x, y], i) => <circle key={i} cx={X(x)} cy={Y(y)} r="3.6" fill={CLASS_COLORS[labels[i]]} stroke="#fff" />)}
        <circle cx={X(mine[0])} cy={Y(mine[1])} r="7" fill="none" stroke="#2c241b" strokeWidth="2" />
        <text x={pad + S} y={S + 2 * pad - 6} textAnchor="end" className="qm-tick">petal length (cm) →</text><text x={pad} y={pad - 8} className="qm-tick">↑ petal width (cm)</text>
      </svg>
      <div>
        <p className="qm-hint">{SPECIES.map((s, i) => <b key={s} style={{ color: CLASS_COLORS[i], marginRight: 8 }}>● {s}</b>)} Click anywhere to describe your own flower (the ringed dot).</p>
        <p>Your flower: petals {fmt(mine[0], 2)} cm long, {fmt(mine[1], 2)} cm wide.{u ? <> The model says <b style={{ color: CLASS_COLORS[best] }}>{SPECIES[best]}</b>:</> : ''}</p>
        <ProbBars probs={probs} names={SPECIES} highlight={best} />
        {u && <Plot series={[{ values: u.history.slice(-500), color: '#1f6f68' }]} window={1} x="step" label="loss" height={110} />}
      </div>
    </div>
  </div>
}

// An 8 × 8 digit as a picture.
export function DigitImage({ pixels, size = 48, label, scale = 1 }) {
  const c = size / 8
  return <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="nn-digit" role="img" aria-label={label ?? 'a digit'}>
    {pixels.map((v, i) => <rect key={i} x={(i % 8) * c} y={Math.floor(i / 8) * c} width={c} height={c} fill={`rgba(44, 36, 27, ${Math.min(1, v * scale)})`} />)}
  </svg>
}

export function DigitGallery() {
  const [images, labels] = useMemo(() => loadDigits(), [])
  const [pick, setPick] = useState(0)
  return <div className="qm-fig">
    <div className="nn-gallery">{images.slice(0, 40).map((img, i) => <button key={i} className={i === pick ? 'active' : ''} onClick={() => setPick(i)} aria-label={`digit ${labels[i]}`}><DigitImage pixels={img} size={36} /></button>)}</div>
    <div className="nn-row">
      <DigitImage pixels={images[pick]} size={160} label={`a ${labels[pick]}`} />
      <div><p>This is a <b>{labels[pick]}</b>. To the network it is 64 numbers, the ink in each square, row by row (shown here out of 16):</p>
        <pre className="nn-work">{Array.from({ length: 8 }, (_, r) => images[pick].slice(r * 8, r * 8 + 8).map(v => String(Math.round(v * 16)).padStart(3)).join('')).join('\n')}</pre></div>
    </div>
  </div>
}

// One trained digit model, shared by the figures on a page: train it once, use it in several.
const store = { model: null, report: null, listeners: new Set() }
const notify = () => store.listeners.forEach(f => f())
export function useDigitModel() {
  const [, redraw] = useReducer(n => n + 1, 0)
  useEffect(() => { store.listeners.add(redraw); return () => store.listeners.delete(redraw) }, [])
  return store
}
export function trainDigitModel({ hidden = 32, steps = 150 } = {}, onProgress) {
  const d = digitData(0), net = makeMLP(64, hidden ? [{ units: hidden, activation: 'relu' }, { units: 10 }] : [{ units: 10 }], 0)
  const opt = makeOptimizer(net, { kind: 'adam', rate: 0.01 })
  let done = 0
  store.model = null; store.report = { progress: 0, hidden }; notify()
  const tick = () => {
    trainSteps(net, opt, d.X, d.Y, 5, 'ce'); done += 5
    if (done < steps) { store.report = { progress: done / steps, hidden }; notify(); setTimeout(tick, 0); return }
    const guesses = d.Xtest.map(x => { const o = predictOne(net, x); return o.indexOf(Math.max(...o)) })
    const table = confusionMatrix(guesses, d.testLabels, 10)
    const wrong = guesses.map((g, i) => [g, i]).filter(([g, i]) => g !== d.testLabels[i]).map(([g, i]) => ({ pixels: d.Xtest[i], truth: d.testLabels[i], guess: g }))
    store.model = net
    store.report = { hidden, steps, accuracy: (guesses.length - wrong.length) / guesses.length, table, wrong, n: guesses.length }
    notify(); onProgress?.()
  }
  setTimeout(tick, 0)
}

export function DigitTrainer() {
  const s = useDigitModel(), [hidden, setHidden] = useState(32)
  const r = s.report
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Hidden neurons <select value={hidden} onChange={e => setHidden(Number(e.target.value))}><option value={0}>0 (one layer: 64 → 10)</option><option value={16}>16</option><option value={32}>32</option></select></label>
      <button className="qm-primary" onClick={() => trainDigitModel({ hidden })} disabled={r && r.progress !== undefined}>Train on 1,438 digits (150 steps, about 3 s)</button>
      {r?.progress !== undefined && <span className="qm-hint">training… {Math.round(100 * r.progress)}%</span>}</div>
    {r?.table && <>
      <p>Tested on <b>{r.n}</b> digits it never saw: <b>{pct(r.accuracy)}</b> right ({r.hidden ? `64 → ${r.hidden} → 10` : '64 → 10'}).</p>
      <div className="nn-row">
        <table className="qm-log nn-cm"><thead><tr><th>true ↓ guessed →</th>{Array.from({ length: 10 }, (_, d) => <th key={d}>{d}</th>)}</tr></thead>
          <tbody>{r.table.map((row, t) => <tr key={t}><th>{t}</th>{row.map((n, g) => <td key={g} className={n ? (g === t ? 'good' : 'bad') : ''}>{n || ''}</td>)}</tr>)}</tbody></table>
        <div><h4 className="qm-small-h">The {r.wrong.length} it got wrong</h4><div className="nn-gallery">{r.wrong.map((w, i) => <span key={i} className="nn-wrong"><DigitImage pixels={w.pixels} size={40} /><small>{w.truth} → <b>{w.guess}</b></small></span>)}</div></div>
      </div>
      <p className="qm-hint">Row = the true digit, column = the guess. The diagonal is right; anything off it is a mistake, and which ones it confuses (a 9 for a 3? an 8 for a 1?) says something about how the digits look.</p></>}
  </div>
}

// Draw a digit: 32 × 32 cells, made into 64 block counts the way the data set was, then the model's guess.
export function DrawDigit() {
  const s = useDigitModel()
  const [grid, setGrid] = useState(() => Array.from({ length: 32 }, () => new Array(32).fill(0)))
  const [fit, setFit] = useState(true), [pen, setPen] = useState(2)
  const drawing = useRef(false)
  const paint = (e, svg) => {
    const r = svg.getBoundingClientRect(), c = Math.floor((e.clientX - r.left) / r.width * 32), rr = Math.floor((e.clientY - r.top) / r.height * 32)
    setGrid(g => g.map((row, y) => row.map((v, x) => v || (Math.hypot(x - c, y - rr) < pen ? 1 : 0))))
  }
  const pixels = padToPixels(grid, fit)
  const out = s.model ? predictOne(s.model, pixels.map(p => p / 16)) : null
  const probs = out ? softmax(out) : null, best = probs ? probs.indexOf(Math.max(...probs)) : null
  const empty = !grid.some(row => row.some(Boolean))
  return <div className="qm-fig">
    {!s.model && <div className="qm-buttons"><button className="qm-primary" onClick={() => trainDigitModel({ hidden: 32 })} disabled={s.report?.progress !== undefined}>Train the digit model first (about 3 s)</button>{s.report?.progress !== undefined && <span className="qm-hint">training… {Math.round(100 * s.report.progress)}%</span>}</div>}
    <div className="nn-row">
      <div>
        <svg viewBox="0 0 32 32" className="nn-pad" role="img" aria-label="drawing pad: draw a digit"
          onPointerDown={e => { drawing.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); paint(e, e.currentTarget) }}
          onPointerMove={e => drawing.current && paint(e, e.currentTarget)} onPointerUp={() => { drawing.current = false }}>
          <rect width="32" height="32" fill="#fffdf8" />
          {grid.flatMap((row, y) => row.map((v, x) => v ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#2c241b" /> : null))}
          {Array.from({ length: 7 }, (_, i) => <g key={i}><line x1={(i + 1) * 4} x2={(i + 1) * 4} y1="0" y2="32" stroke="#efe7d8" strokeWidth="0.08" /><line y1={(i + 1) * 4} y2={(i + 1) * 4} x1="0" x2="32" stroke="#efe7d8" strokeWidth="0.08" /></g>)}
        </svg>
        <div className="qm-buttons"><button onClick={() => setGrid(Array.from({ length: 32 }, () => new Array(32).fill(0)))}>Clear</button>
          <label>pen <select value={pen} onChange={e => setPen(Number(e.target.value))}><option value={1.5}>thin</option><option value={2}>medium</option><option value={2.8}>thick</option></select></label>
          <label><input type="checkbox" checked={fit} onChange={e => setFit(e.target.checked)} /> fit to the box, as the data set's digits do</label></div>
      </div>
      <div>
        <p className="qm-hint">What the network is given: 64 counts (0–16), one per 4 × 4 block of your drawing.</p>
        <DigitImage pixels={pixels.map(p => p / 16)} size={112} />
        {empty ? <p className="qm-hint">Draw a digit, 0 to 9, filling most of the box.</p> : probs ? <><p>The model says <b className="nn-big">{best}</b> ({pct(probs[best])} sure).</p><ProbBars probs={probs} names={Array.from({ length: 10 }, (_, d) => String(d))} highlight={best} /></> : null}
      </div>
    </div>
    <p className="qm-hint">Untick "fit to the box" and draw small in a corner: the 64 numbers look nothing like the training digits, and the guesses fall apart. A model only knows the kind of input it was trained on, which is why handwriting is preprocessed exactly as the training data was.</p>
  </div>
}

// One layer, 64 → 10: each digit's 64 weights drawn as a picture. Orange: ink here raises that digit's score.
export function DigitWeights() {
  const [net, setNet] = useState(null)
  const train = () => { const d = digitData(0), m = makeMLP(64, [{ units: 10 }], 0), opt = makeOptimizer(m, { kind: 'adam', rate: 0.01 }); trainSteps(m, opt, d.X, d.Y, 150, 'ce'); setNet(m) }
  return <div className="qm-fig">
    <div className="qm-buttons"><button className="qm-primary" onClick={train} disabled={!!net}>Train a one-layer model (64 → 10, about 1 s)</button></div>
    {net && <div className="nn-gallery">{net.layers[0].W.map((row, d) => {
      const max = Math.max(...row.map(Math.abs))
      return <span key={d} className="nn-wimg"><svg viewBox="0 0 8 8" width="72" height="72" role="img" aria-label={`weights for ${d}`}>{row.map((w, i) => <rect key={i} x={i % 8} y={Math.floor(i / 8)} width="1" height="1" fill={w >= 0 ? `rgba(194, 106, 18, ${w / max})` : `rgba(31, 111, 104, ${-w / max})`} />)}</svg><b>{d}</b></span>
    })}</div>}
    <p className="qm-hint">Each square is one weight of that digit's neuron. Orange: ink there is evidence <i>for</i> the digit; teal: evidence <i>against</i>. The 0 wants a ring and no ink in the middle; the 1 wants a stroke down the centre.</p>
  </div>
}
