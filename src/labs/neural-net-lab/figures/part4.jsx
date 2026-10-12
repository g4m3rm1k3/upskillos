import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import Plot from '../../cartpole-lab/figures/Plot.jsx'
import { fmt } from '../../python-steps/format.js'
import { loadMnistSmall, trainEpoch, PyRandom, toMnistStages, shifted } from '../engine/part4.js'
import { softmax, oneHot, confusionMatrix } from '../engine/part3.js'
import { makeMLP, makeOptimizer, predictOne, lossAndGradients, optimizerStep } from '../engine/mlp.js'
import { ProbBars } from './part3.jsx'

const pct = x => `${fmt(100 * x, 1)}%`
const DIGITS = Array.from({ length: 10 }, (_, d) => String(d))
const argmax = a => a.indexOf(Math.max(...a))

// The browser's 4,000 MNIST digits, loaded once, when a figure first needs them.
function useMnist() {
  const [data, setData] = useState(null), [error, setError] = useState(null)
  useEffect(() => { let live = true; loadMnistSmall().then(d => live && setData(d)).catch(e => live && setError(String(e))); return () => { live = false } }, [])
  return { data, error }
}
const Loading = ({ error }) => <p className="qm-hint">{error ? `The MNIST sample didn't load: ${error}` : 'Loading 4,000 MNIST digits (640 KB)…'}</p>

// A 28 × 28 image drawn on a canvas (grey levels 0–1; weights in colour when signed).
export function Img28({ pixels, size = 56, signed = false, label }) {
  const ref = useRef(null)
  useEffect(() => {
    const ctx = ref.current?.getContext?.('2d')
    if (!ctx || !pixels) return
    const img = ctx.createImageData(28, 28), max = signed ? Math.max(1e-9, ...pixels.map(Math.abs)) : 1
    pixels.forEach((v, i) => {
      if (signed) { const k = Math.abs(v) / max; const [r, g, b] = v >= 0 ? [194, 106, 18] : [31, 111, 104]; img.data.set([255 - (255 - r) * k, 255 - (255 - g) * k, 255 - (255 - b) * k, 255], i * 4) }
      else { const g = 255 - Math.round(255 * Math.min(1, v)); img.data.set([g, g, g, 255], i * 4) }
    })
    ctx.putImageData(img, 0, 0)
  }, [pixels, signed])
  return <canvas ref={ref} width={28} height={28} className="nn-img28" style={{ width: size, height: size }} aria-label={label ?? 'a 28 × 28 image'} role="img" />
}

export function MnistGallery() {
  const { data, error } = useMnist()
  const [pick, setPick] = useState(0)
  const means = useMemo(() => data && DIGITS.map((_, d) => { const xs = data.train.X.filter((x, i) => data.train.labels[i] === d); return xs[0].map((_, j) => xs.reduce((s, x) => s + x[j], 0) / xs.length) }), [data])
  if (!data) return <div className="qm-fig"><Loading error={error} /></div>
  const img = data.train.X[pick]
  return <div className="qm-fig">
    <div className="nn-gallery">{data.train.X.slice(0, 48).map((x, i) => <button key={i} className={i === pick ? 'active' : ''} onClick={() => setPick(i)} aria-label={`digit ${data.train.labels[i]}`}><Img28 pixels={x} size={36} /></button>)}</div>
    <div className="nn-row">
      <div><Img28 pixels={img} size={168} label={`a ${data.train.labels[pick]}`} /><p>This is a <b>{data.train.labels[pick]}</b>: 784 numbers from 0 (paper) to 1 (ink). The grey edges are partly inked pixels: MNIST's digits were smoothed when they were shrunk.</p></div>
      <div><h4 className="qm-small-h">The average of every training {'digit'} of each kind</h4><div className="nn-gallery">{means.map((m, d) => <span key={d} className="nn-wimg"><Img28 pixels={m} size={52} /><b>{d}</b></span>)}</div>
        <p className="qm-hint">Every 0 laid on top of every other 0, and so on. They are blurry because people write differently, but each is clearly its digit: there is a typical shape for a model to find.</p></div>
    </div>
  </div>
}

// Full-batch against mini-batch training, for the same amount of work (images looked at).
export function BatchFig() {
  const { data, error } = useMnist()
  const [curves, setCurves] = useState(null), [busy, setBusy] = useState(false)
  const run = () => {
    setBusy(true)
    setTimeout(() => {
      const out = []
      for (const [label, size, color] of [['all 3,000 at once', 3000, '#7a3fb0'], ['batches of 256', 256, '#1f6f68'], ['batches of 32', 32, '#b5650d']]) {
        const net = makeMLP(784, [{ units: 32, activation: 'relu' }, { units: 10 }], 0), opt = makeOptimizer(net, { kind: 'sgd', rate: 0.1 }), rng = new PyRandom(0)
        const points = [], budget = 3 * 3000
        let seen = 0
        while (seen < budget) for (const l of trainEpoch(net, opt, data.train.X, data.train.Y, size, rng, 'ce', Math.ceil((budget - seen) / size))) { seen += size; points.push(l) }
        // one point per 300 images looked at, so the three lines share an x axis
        const per = Math.max(1, Math.round(300 / size)), thinned = []
        for (let i = 0; i < points.length; i += per) thinned.push(points[i])
        const acc = data.test.X.filter((x, i) => argmax(predictOne(net, x)) === data.test.labels[i]).length / data.test.X.length
        out.push({ label, color, values: size >= 300 ? points.flatMap(p => new Array(Math.round(size / 300)).fill(p)) : thinned, steps: points.length, acc })
      }
      setCurves(out); setBusy(false)
    }, 0)
  }
  if (!data) return <div className="qm-fig"><Loading error={error} /></div>
  return <div className="qm-fig">
    <div className="qm-buttons"><button className="qm-primary" onClick={run} disabled={busy || !!curves}>{busy ? 'Training three networks…' : 'Train three ways, each looking at 9,000 images'}</button></div>
    {curves && <><Plot series={curves.map(c => ({ values: c.values, color: c.color, label: c.label }))} window={1} x="300 images" label="loss against images looked at" height={170} />
      <table className="qm-log"><tbody>{curves.map(c => <tr key={c.label}><th style={{ textAlign: 'left', color: c.color }}>{c.label}</th><td>{c.steps} steps</td><td>test accuracy <b>{pct(c.acc)}</b></td></tr>)}</tbody></table></>}
    <p className="qm-hint">The same work (each network sees 9,000 images: three passes over the 3,000), split into few big steps or many small ones. Small batches take far more steps, each a little noisy, and get much further.</p>
  </div>
}

// One trained MNIST model, shared by the figures on a page.
const store = { model: null, report: null, listeners: new Set() }
const notify = () => store.listeners.forEach(f => f())
function useMnistModel() { const [, redraw] = useReducer(n => n + 1, 0); useEffect(() => { store.listeners.add(redraw); return () => store.listeners.delete(redraw) }, []); return store }
function trainMnistModel(data, { hidden = 64, epochs = 4 } = {}) {
  const net = makeMLP(784, hidden ? [{ units: hidden, activation: 'relu' }, { units: 10 }] : [{ units: 10 }], 0)
  const opt = makeOptimizer(net, { kind: 'adam', rate: 0.002 }), rng = new PyRandom(0), history = [], accs = []
  store.model = null; store.report = { progress: 0, hidden }; notify()
  let epoch = 0
  const tick = () => {
    history.push(...trainEpoch(net, opt, data.train.X, data.train.Y, 32, rng))
    const guesses = data.test.X.map(x => argmax(predictOne(net, x)))
    accs.push(guesses.filter((g, i) => g === data.test.labels[i]).length / guesses.length)
    epoch++
    if (epoch < epochs) { store.report = { progress: epoch / epochs, hidden, accs: [...accs] }; notify(); setTimeout(tick, 0); return }
    store.model = net
    store.report = { hidden, epochs, history, accs, table: confusionMatrix(guesses, data.test.labels, 10), wrong: guesses.map((g, i) => [g, i]).filter(([g, i]) => g !== data.test.labels[i]).slice(0, 40).map(([g, i]) => ({ pixels: data.test.X[i], truth: data.test.labels[i], guess: g })) }
    notify()
  }
  setTimeout(tick, 0)
}
function TrainButton({ data, hidden = 64, label }) {
  const s = useMnistModel(), busy = s.report && s.report.progress !== undefined
  return <><button className="qm-primary" disabled={busy || !data} onClick={() => trainMnistModel(data, { hidden })}>{label ?? `Train ${hidden ? `784 → ${hidden} → 10` : '784 → 10'} on 3,000 digits (4 passes, about 4 s)`}</button>{busy && <span className="qm-hint">training… pass {Math.round(s.report.progress * 4) + 1} of 4</span>}</>
}

export function MnistTrainer() {
  const { data, error } = useMnist(), s = useMnistModel(), [hidden, setHidden] = useState(64)
  if (!data) return <div className="qm-fig"><Loading error={error} /></div>
  const r = s.report
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Hidden neurons <select value={hidden} onChange={e => setHidden(Number(e.target.value))}><option value={0}>0 (784 → 10)</option><option value={32}>32</option><option value={64}>64</option><option value={128}>128</option></select></label><TrainButton data={data} hidden={hidden} /></div>
    {r?.table && <>
      <p>After {r.epochs} passes over the 3,000 training digits: <b>{pct(r.accs.at(-1))}</b> of the 1,000 test digits right (after each pass: {r.accs.map(pct).join(', ')}).</p>
      <div className="nn-row">
        <div><Plot series={[{ values: r.history, color: '#1f6f68' }]} window={20} x="batch" label="loss per batch" height={140} />
          <table className="qm-log nn-cm"><thead><tr><th>true ↓ guessed →</th>{DIGITS.map(d => <th key={d}>{d}</th>)}</tr></thead>
            <tbody>{r.table.map((row, t) => <tr key={t}><th>{t}</th>{row.map((n, g) => <td key={g} className={n ? (g === t ? 'good' : 'bad') : ''}>{n || ''}</td>)}</tr>)}</tbody></table></div>
        <div><h4 className="qm-small-h">Some it got wrong</h4><div className="nn-gallery">{r.wrong.map((w, i) => <span key={i} className="nn-wrong"><Img28 pixels={w.pixels} size={42} /><small>{w.truth} → <b>{w.guess}</b></small></span>)}</div></div>
      </div></>}
  </div>
}

// A drawing pad: a 112 × 112 grid of ink, drawn on with a round pen.
const N = 112
export function usePad() {
  const [grid, setGrid] = useState(() => new Float32Array(N * N))
  return { grid, clear: () => setGrid(new Float32Array(N * N)), setGrid, image: () => Array.from({ length: N }, (_, r) => Array.from(grid.subarray(r * N, r * N + N))), empty: !grid.some(v => v > 0) }
}
export function Pad({ pad, pen = 4.5, size = 252 }) {
  const ref = useRef(null), drawing = useRef(false), last = useRef(null)
  useEffect(() => {
    const ctx = ref.current?.getContext?.('2d')
    if (!ctx) return
    const img = ctx.createImageData(N, N)
    pad.grid.forEach((v, i) => { const g = v ? 30 : 253; img.data.set([g, g - 2, g - 6, 255], i * 4) })
    ctx.putImageData(img, 0, 0)
  }, [pad.grid])
  const dab = (x, y, g) => { for (let r = Math.max(0, Math.floor(y - pen)); r <= Math.min(N - 1, Math.ceil(y + pen)); r++) for (let c = Math.max(0, Math.floor(x - pen)); c <= Math.min(N - 1, Math.ceil(x + pen)); c++) if ((r - y) ** 2 + (c - x) ** 2 <= pen * pen) g[r * N + c] = 1 }
  const at = e => { const b = ref.current.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * N, (e.clientY - b.top) / b.height * N] }
  const stroke = e => {
    const [x, y] = at(e), g = new Float32Array(pad.grid), [px, py] = last.current ?? [x, y]
    const steps = Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / 1.5))
    for (let k = 0; k <= steps; k++) dab(px + (x - px) * k / steps, py + (y - py) * k / steps, g)
    last.current = [x, y]
    pad.setGrid(g)
  }
  return <canvas ref={ref} width={N} height={N} className="nn-pad" style={{ width: size, height: size }} role="img" aria-label="drawing pad"
    onPointerDown={e => { drawing.current = true; last.current = null; e.currentTarget.setPointerCapture?.(e.pointerId); stroke(e) }}
    onPointerMove={e => { if (drawing.current) stroke(e) }} onPointerUp={() => { drawing.current = false; last.current = null }} />
}

// The four stages of preparing a drawing, side by side.
function Stages({ stages, grid }) {
  if (!stages) return <p className="qm-hint">Draw a digit on the pad.</p>
  const { box: [t, b, l, r], small, centre, out } = stages
  const sm = small.length, sw = small[0].length
  const small28 = Array.from({ length: 28 * 28 }, (_, i) => { const rr = Math.floor(i / 28) - 4, cc = i % 28 - 4; return small[rr]?.[cc] ?? 0 })
  const g28 = Array.from({ length: 28 * 28 }, (_, i) => { const rr = Math.floor(i / 28) * 4, cc = (i % 28) * 4; let s = 0; for (let a = 0; a < 4; a++) for (let q = 0; q < 4; q++) s += grid[(rr + a) * N + cc + q]; return s / 16 })
  return <div className="nn-stages">
    <span><Img28 pixels={g28} size={84} /><small>1. your drawing (ink box rows {t}–{b}, columns {l}–{r})</small></span>
    <span><Img28 pixels={small28} size={84} /><small>2. cropped and shrunk to {sm} × {sw} (longest side 20)</small></span>
    <span><Img28 pixels={out.flat()} size={84} /><small>3. placed in 28 × 28, centre of mass ({fmt(centre[0], 1)}, {fmt(centre[1], 1)}) moved to the middle</small></span>
  </div>
}

export function PreprocessFig() {
  const pad = usePad()
  const stages = useMemo(() => pad.empty ? null : toMnistStages(pad.image()), [pad.grid])
  return <div className="qm-fig">
    <div className="nn-row"><div><Pad pad={pad} /><div className="qm-buttons"><button onClick={pad.clear}>Clear</button></div></div><Stages stages={stages} grid={pad.grid} /></div>
    <p className="qm-hint">Draw small, large, in a corner: step 3 comes out the same size and in the same place every time. That is what MNIST's digits went through, so it is what yours must go through.</p>
  </div>
}

// Draw a digit and ask the trained model, with or without MNIST's preparation.
export function DrawMnist() {
  const { data, error } = useMnist(), s = useMnistModel(), pad = usePad(), [prepare, setPrepare] = useState(true)
  const stages = useMemo(() => pad.empty ? null : toMnistStages(pad.image()), [pad.grid])
  const raw = useMemo(() => Array.from({ length: 784 }, (_, i) => { const rr = Math.floor(i / 28) * 4, cc = (i % 28) * 4; let v = 0; for (let a = 0; a < 4; a++) for (let q = 0; q < 4; q++) v += pad.grid[(rr + a) * N + cc + q]; return v / 16 }), [pad.grid])
  const input = stages ? (prepare ? stages.out.flat() : raw) : null
  const probs = s.model && input ? softmax(predictOne(s.model, input)) : null, best = probs ? argmax(probs) : null
  return <div className="qm-fig">
    {!s.model && (data ? <div className="qm-buttons"><TrainButton data={data} hidden={64} label="Train the model first (784 → 64 → 10, about 4 s)" /></div> : <Loading error={error} />)}
    <div className="nn-row">
      <div><Pad pad={pad} /><div className="qm-buttons"><button onClick={pad.clear}>Clear</button><label><input type="checkbox" checked={prepare} onChange={e => setPrepare(e.target.checked)} /> prepare it like MNIST</label></div></div>
      <div>{input && <><p className="qm-hint">What the model receives:</p><Img28 pixels={input} size={112} /></>}
        {probs ? <><p>The model says <b className="nn-big">{best}</b> ({pct(probs[best])} sure).</p><ProbBars probs={probs} names={DIGITS} highlight={best} /></> : input ? null : <p className="qm-hint">Draw a digit.</p>}</div>
    </div>
    <p className="qm-hint">Then draw something that isn't a digit at all: a heart, a letter, a scribble. The model still names a digit, often confidently. Softmax always shares out 100% among the ten classes it knows; it has no way to say "none of these".</p>
  </div>
}

// What the hidden neurons look for: their 784 weights as 28 × 28 pictures.
export function HiddenWeights() {
  const { data, error } = useMnist(), s = useMnistModel()
  if (!data) return <div className="qm-fig"><Loading error={error} /></div>
  if (!s.model) return <div className="qm-fig"><div className="qm-buttons"><TrainButton data={data} hidden={64} /></div></div>
  const W = s.model.layers[0].W
  return <div className="qm-fig">
    <div className="nn-gallery">{W.slice(0, 32).map((row, k) => <span key={k} className="nn-wimg"><Img28 pixels={row} size={56} signed label={`hidden neuron ${k}'s weights`} /><small>{k}</small></span>)}</div>
    <p className="qm-hint">Each picture is one hidden neuron's 784 weights{s.model.layers.length === 1 ? ' (here the ten output neurons: one template per digit)' : ''}. Orange: ink here turns the neuron on; teal: ink here turns it off. They are not whole digits but parts and strokes, which the next layer combines.</p>
  </div>
}

// Classes of your own: draw a few examples of each, train, and use it.
const STORE_KEY = 'upskillos.neural-net-lab.my-classes.v1'
export function YourClasses() {
  const [names, setNames] = useState(() => { try { return JSON.parse(localStorage.getItem(STORE_KEY))?.names ?? ['✓', '✗', '○'] } catch { return ['✓', '✗', '○'] } })
  const [examples, setExamples] = useState(() => { try { return JSON.parse(localStorage.getItem(STORE_KEY))?.examples ?? [] } catch { return [] } })
  const [target, setTarget] = useState(0), [model, setModel] = useState(null), [busy, setBusy] = useState(false), [mode, setMode] = useState('collect')
  const pad = usePad()
  useEffect(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify({ names, examples })) } catch { /* not kept in a private window */ } }, [names, examples])
  const prepared = useMemo(() => pad.empty ? null : toMnistStages(pad.image())?.out, [pad.grid])
  const add = () => { if (!prepared) return; setExamples(e => [...e, { label: target, pixels: prepared.flat().map(v => Math.round(v * 100) / 100) }]); pad.clear() }
  const counts = names.map((_, k) => examples.filter(e => e.label === k).length)
  const train = () => {
    setBusy(true)
    setTimeout(() => {
      // Each drawing, and the same drawing shifted by up to 2 pixels each way: 25 versions of each.
      const X = [], Y = []
      for (const e of examples) {
        const img = Array.from({ length: 28 }, (_, r) => e.pixels.slice(r * 28, r * 28 + 28))
        for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { X.push(shifted(img, dr, dc).flat()); Y.push(oneHot(e.label, names.length)) }
      }
      const net = makeMLP(784, [{ units: 32, activation: 'relu' }, { units: names.length }], 0), opt = makeOptimizer(net, { kind: 'adam', rate: 0.003 }), rng = new PyRandom(0)
      for (let epoch = 0; epoch < 8; epoch++) trainEpoch(net, opt, X, Y, 32, rng)
      setModel({ net, n: names.length, trainedOn: examples.length, images: X.length }); setBusy(false); setMode('test')
    }, 0)
  }
  const probs = model && prepared && model.n === names.length ? softmax(predictOne(model.net, prepared.flat())) : null
  const ready = counts.every(c => c >= 3)
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      {names.map((n, k) => <label key={k}>class {k + 1} <input value={n} maxLength={12} onChange={e => setNames(ns => ns.map((x, j) => j === k ? e.target.value : x))} style={{ width: 70 }} /> <small>({counts[k]})</small></label>)}
      {names.length < 5 && <button onClick={() => setNames(ns => [...ns, `class ${ns.length + 1}`])}>+ class</button>}
      {names.length > 2 && <button onClick={() => { setNames(ns => ns.slice(0, -1)); setExamples(e => e.filter(x => x.label < names.length - 1)) }}>− class</button>}
    </div>
    <div className="qm-buttons">
      <button className={mode === 'collect' ? 'active' : ''} onClick={() => setMode('collect')}>1. Draw examples</button>
      <button className="qm-primary" onClick={train} disabled={!ready || busy}>{busy ? 'Training…' : `2. Train on ${examples.length} drawings`}</button>
      <button className={mode === 'test' ? 'active' : ''} disabled={!model} onClick={() => setMode('test')}>3. Try it</button>
      {!ready && <span className="qm-hint">Draw at least 3 examples of every class (5 or more works better).</span>}
    </div>
    <div className="nn-row">
      <div><Pad pad={pad} /><div className="qm-buttons"><button onClick={pad.clear}>Clear</button>
        {mode === 'collect' && <>{names.map((n, k) => <button key={k} className={target === k ? 'active' : ''} onClick={() => setTarget(k)}>{n}</button>)}<button className="qm-primary" disabled={!prepared} onClick={add}>Add as a "{names[target]}"</button></>}</div></div>
      <div>
        {mode === 'collect' ? <>{names.map((n, k) => <div key={k}><b>{n}</b><div className="nn-gallery">{examples.map((e, i) => e.label === k && <button key={i} title="remove" onClick={() => setExamples(ex => ex.filter((_, j) => j !== i))}><Img28 pixels={e.pixels} size={36} /></button>)}</div></div>)}
          {examples.length > 0 && <button onClick={() => setExamples([])}>Remove all examples</button>}</>
          : probs ? <><p>It says <b className="nn-big">{names[argmax(probs)]}</b>.</p><ProbBars probs={probs} names={names} highlight={argmax(probs)} /><p className="qm-hint">Trained on {model.trainedOn} drawings, each also shifted up to 2 pixels each way: {model.images} images.</p></> : <p className="qm-hint">{model ? 'Draw something new and see what it calls it.' : 'Train first.'}</p>}
      </div>
    </div>
    <p className="qm-hint">Your drawings stay in this browser. Every drawing is prepared like MNIST (lesson 4.4) before it is stored.</p>
  </div>
}
