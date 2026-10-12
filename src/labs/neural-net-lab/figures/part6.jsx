import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { fmt } from '../../python-steps/format.js'
import { Slider } from '../../qmaze-lab/figures/ui.jsx'
import { loadMnistSmall, batches, trainEpoch, PyRandom, toMnistStages } from '../engine/part4.js'
import { KERNELS, convolve, reluMap, maxPool, makeCNN, cnnLossAndGradients, makeAdam, adamStep, cnnPredict, cnnForward } from '../engine/cnn.js'
import { makeMLP, makeOptimizer, predictOne } from '../engine/mlp.js'
import { softmax } from '../engine/part3.js'
import { Img28, Pad, usePad } from './part4.jsx'
import { ProbBars } from './part3.jsx'

const pct = x => `${fmt(100 * x, 1)}%`
const argmax = a => a.indexOf(Math.max(...a))
const DIGITS = Array.from({ length: 10 }, (_, d) => String(d))
function useMnist() {
  const [data, setData] = useState(null), [error, setError] = useState(null)
  useEffect(() => { let live = true; loadMnistSmall().then(d => live && setData(d)).catch(e => live && setError(String(e))); return () => { live = false } }, [])
  return { data, error }
}
const Loading = ({ error }) => <p className="qm-hint">{error ? `The MNIST sample didn't load: ${error}` : 'Loading 4,000 MNIST digits…'}</p>

// Any size of picture, as coloured squares: grey for 0–1 pictures, orange/teal for signed ones.
export function Grid({ rows, cell = 6, signed = false, mark = null, label }) {
  const h = rows.length, w = rows[0].length, max = signed ? Math.max(1e-9, ...rows.flat().map(Math.abs)) : 1
  return <svg viewBox={`0 0 ${w * cell} ${h * cell}`} width={w * cell} height={h * cell} className="nn-grid" role="img" aria-label={label ?? 'a picture'}>
    {rows.flatMap((row, r) => row.map((v, c) => {
      const k = Math.min(1, Math.abs(v) / max)
      const fill = signed ? (v >= 0 ? `rgba(194, 106, 18, ${k})` : `rgba(31, 111, 104, ${k})`) : `rgba(44, 36, 27, ${Math.min(1, v)})`
      return v ? <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill={fill} /> : null
    }))}
    {mark && <rect x={mark[1] * cell} y={mark[0] * cell} width={mark[2] * cell} height={mark[2] * cell} fill="none" stroke="#a8402f" strokeWidth={Math.max(1, cell / 3)} />}
  </svg>
}
const to2d = flat => Array.from({ length: 28 }, (_, r) => flat.slice(r * 28, r * 28 + 28))

// A filter slid over a digit: the whole result, and the arithmetic at one place.
export function ConvFig() {
  const { data, error } = useMnist()
  const [pick, setPick] = useState(0), [name, setName] = useState('vertical edges'), [kernel, setKernel] = useState(KERNELS['vertical edges'])
  const [at, setAt] = useState([10, 12])
  if (!data) return <div className="qm-fig"><Loading error={error} /></div>
  const img = to2d(data.test.X[pick]), out = convolve(img, kernel), [r, c] = at
  const terms = []
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) terms.push(`${fmt(img[r + i][c + j], 2)}×${fmt(kernel[i][j], 2)}`)
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label>digit <select value={pick} onChange={e => setPick(Number(e.target.value))}>{data.test.X.slice(0, 12).map((_, i) => <option key={i} value={i}>test digit {i} (a {data.test.labels[i]})</option>)}</select></label>
      <label>filter <select value={name} onChange={e => { setName(e.target.value); if (KERNELS[e.target.value]) setKernel(KERNELS[e.target.value]) }}>{Object.keys(KERNELS).map(k => <option key={k}>{k}</option>)}<option>your own</option></select></label>
    </div>
    <div className="nn-row">
      <div><p className="qm-hint">The digit (28 × 28). Click to move the 3 × 3 window.</p>
        <span onClick={e => { const b = e.currentTarget.getBoundingClientRect(); setAt([Math.min(25, Math.max(0, Math.floor((e.clientY - b.top) / b.height * 28) - 1)), Math.min(25, Math.max(0, Math.floor((e.clientX - b.left) / b.width * 28) - 1))]) }} style={{ cursor: 'crosshair', display: 'inline-block' }}><Grid rows={img} cell={7} mark={[r, c, 3]} /></span></div>
      <div><p className="qm-hint">The filter: {name === 'your own' ? 'type your own numbers' : 'edit any number'}.</p>
        <table className="nn-kernel"><tbody>{kernel.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j}><input type="number" step="0.5" value={Number(v.toFixed(3))} onChange={e => { setName('your own'); setKernel(k => k.map((rr, a) => rr.map((x, b) => a === i && b === j ? Number(e.target.value) : x))) }} aria-label={`filter ${i},${j}`} /></td>)}</tr>)}</tbody></table>
        <div className="nn-work">{`at row ${r}, column ${c}:\n${terms.slice(0, 3).join(' + ')}\n+ ${terms.slice(3, 6).join(' + ')}\n+ ${terms.slice(6).join(' + ')}\n= `}<b>{fmt(out[r][c], 3)}</b></div></div>
      <div><p className="qm-hint">The result (26 × 26): orange where the filter matches, teal where it matches the opposite.</p><Grid rows={out} cell={7} signed mark={[r, c, 1]} /></div>
    </div>
    <p className="qm-hint">The same 9 numbers are used at every place: one small pattern-detector swept over the whole picture. "Vertical edges" lights up where ink starts (orange) or stops (teal) going left to right.</p>
  </div>
}

// ReLU and pooling after a filter.
export function PoolFig() {
  const { data, error } = useMnist(), [pick, setPick] = useState(0), [name, setName] = useState('vertical edges')
  if (!data) return <div className="qm-fig"><Loading error={error} /></div>
  const img = to2d(data.test.X[pick]), conv = convolve(img, KERNELS[name]), relu = reluMap(conv), pooled = maxPool(relu)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>digit <select value={pick} onChange={e => setPick(Number(e.target.value))}>{data.test.X.slice(0, 12).map((_, i) => <option key={i} value={i}>test digit {i} (a {data.test.labels[i]})</option>)}</select></label>
      <label>filter <select value={name} onChange={e => setName(e.target.value)}>{Object.keys(KERNELS).map(k => <option key={k}>{k}</option>)}</select></label></div>
    <div className="nn-stages">
      <span><Grid rows={img} cell={4} /><small>the digit, 28 × 28</small></span>
      <span><Grid rows={conv} cell={4} signed /><small>filtered, 26 × 26</small></span>
      <span><Grid rows={relu} cell={4} signed /><small>ReLU: negatives to 0</small></span>
      <span><Grid rows={pooled} cell={8} signed /><small>2 × 2 max pooling: 13 × 13</small></span>
    </div>
    <p className="qm-hint">Pooling keeps only the strongest response in each 2 × 2 block: a quarter of the numbers, and the same result whether the edge was in one pixel of the block or its neighbour.</p>
  </div>
}

// One trained CNN and one plain network, shared by the figures on a page.
const store = { cnn: null, dense: null, progress: null, listeners: new Set() }
const notify = () => store.listeners.forEach(f => f())
function useModels() { const [, redraw] = useReducer(n => n + 1, 0); useEffect(() => { store.listeners.add(redraw); return () => store.listeners.delete(redraw) }, []); return store }
function trainBoth(data, epochs = 3) {
  const cnn = makeCNN(8, 0), opt = makeAdam(cnn, 0.002), rng = new PyRandom(0)
  const dense = makeMLP(784, [{ units: 128, activation: 'relu' }, { units: 10 }], 0), dOpt = makeOptimizer(dense, { kind: 'adam', rate: 0.002 }), dRng = new PyRandom(0)
  let epoch = 0
  store.progress = 'training the CNN, pass 1 of 3'; notify()
  const tick = () => {
    for (const b of batches(data.train.X.length, 32, rng)) adamStep(cnn, opt, cnnLossAndGradients(cnn, b.map(i => data.train.X[i]), b.map(i => data.train.labels[i])).grads)
    trainEpoch(dense, dOpt, data.train.X, data.train.Y, 32, dRng)
    epoch++
    if (epoch < epochs) { store.progress = `training, pass ${epoch + 1} of ${epochs}`; notify(); setTimeout(tick, 0); return }
    store.cnn = cnn; store.dense = dense; store.progress = null; notify()
  }
  setTimeout(tick, 0)
}
function TrainBoth({ data }) {
  const s = useModels()
  return <div className="qm-buttons"><button className="qm-primary" disabled={!!s.progress || !data} onClick={() => trainBoth(data)}>{s.cnn ? 'Train both again' : 'Train a CNN and a plain network on 3,000 digits (about 15 s)'}</button>{s.progress && <span className="qm-hint">{s.progress}…</span>}</div>
}

// What a trained CNN's 8 filters look like, and what each makes of a digit.
export function LearnedFilters() {
  const { data, error } = useMnist(), s = useModels(), [pick, setPick] = useState(0)
  if (!data) return <div className="qm-fig"><Loading error={error} /></div>
  if (!s.cnn) return <div className="qm-fig"><TrainBoth data={data} /></div>
  const x = data.test.X[pick], { conv } = cnnForward(s.cnn, x), probs = softmax(cnnPredict(s.cnn, x))
  const acc = data.test.X.filter((t, i) => argmax(cnnPredict(s.cnn, t)) === data.test.labels[i]).length / data.test.X.length
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>test digit <select value={pick} onChange={e => setPick(Number(e.target.value))}>{data.test.X.slice(0, 20).map((_, i) => <option key={i} value={i}>{i} (a {data.test.labels[i]})</option>)}</select></label><span className="qm-hint">This CNN gets {pct(acc)} of the 1,000 test digits right.</span></div>
    <div className="nn-gallery">{s.cnn.W.map((w, f) => <span key={f} className="nn-wimg nn-filter">
      <Grid rows={[w.slice(0, 3), w.slice(3, 6), w.slice(6)]} cell={12} signed label={`filter ${f}`} />
      <Grid rows={Array.from({ length: 26 }, (_, r) => Array.from(conv.subarray(f * 676 + r * 26, f * 676 + r * 26 + 26)))} cell={3} signed label={`filter ${f}'s map`} />
      <small>filter {f}</small></span>)}</div>
    <ProbBars probs={probs} names={DIGITS} highlight={argmax(probs)} />
    <p className="qm-hint">Top: each learned 3 × 3 filter. Below it: what that filter (after ReLU) finds in the digit. Nobody chose these filters; gradient descent did, because they help tell digits apart. Several look like edge detectors in different directions.</p>
  </div>
}

// Move every test digit sideways: which network copes better?
const roll = (x, s) => x.map((_, i) => { const r = Math.floor(i / 28), c = i % 28; return x[r * 28 + ((c - s + 28) % 28)] })
export function ShiftFig() {
  const { data, error } = useMnist(), s = useModels(), [shift, setShift] = useState(2)
  const scores = useMemo(() => s.cnn && data ? [0, 1, 2, 3, 4].map(k => ({
    cnn: data.test.X.filter((x, i) => argmax(cnnPredict(s.cnn, roll(x, k))) === data.test.labels[i]).length / 1000,
    dense: data.test.X.filter((x, i) => argmax(predictOne(s.dense, roll(x, k))) === data.test.labels[i]).length / 1000,
  })) : null, [s.cnn, data])
  if (!data) return <div className="qm-fig"><Loading error={error} /></div>
  if (!scores) return <div className="qm-fig"><TrainBoth data={data} /></div>
  return <div className="qm-fig">
    <Slider label="move every test digit right by (pixels)" value={shift} min={0} max={4} step={1} onChange={setShift} />
    <div className="nn-row"><div className="nn-gallery">{data.test.X.slice(0, 6).map((x, i) => <Img28 key={i} pixels={roll(x, shift)} size={56} />)}</div>
      <table className="qm-log"><thead><tr><th>moved by</th>{scores.map((_, k) => <th key={k} className={k === shift ? 'nn-on' : ''}>{k}</th>)}</tr></thead><tbody>
        <tr><th>plain network (101,770 weights)</th>{scores.map((v, k) => <td key={k} className={k === shift ? 'nn-on' : ''}>{pct(v.dense)}</td>)}</tr>
        <tr><th>CNN (13,610 weights)</th>{scores.map((v, k) => <td key={k} className={k === shift ? 'nn-on' : ''}>{pct(v.cnn)}</td>)}</tr>
      </tbody></table></div>
    <p className="qm-hint">The plain network learned "ink at pixel 300 means this", so a digit moved sideways looks like something new. The CNN's filters look for the same patterns everywhere, and pooling blurs exact positions, so it copes better, though one layer only goes so far: larger moves defeat both.</p>
  </div>
}

// Save your trained CNN as a file, and load one back.
export function SaveLoadFig() {
  const { data, error } = useMnist(), s = useModels(), pad = usePad(), [loaded, setLoaded] = useState(null), [message, setMessage] = useState('')
  const file = useRef(null)
  const model = loaded ?? s.cnn
  const prepared = useMemo(() => pad.empty ? null : toMnistStages(pad.image())?.out.flat(), [pad.grid])
  const probs = model && prepared ? softmax(cnnPredict(model, prepared)) : null
  const save = () => {
    const text = JSON.stringify({ kind: 'upskillos-digit-cnn', version: 1, ...s.cnn })
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a')
      a.href = url; a.download = 'digit-cnn.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage(`Saved digit-cnn.json (${Math.round(text.length / 1024)} KB): every weight, as numbers.`)
    } catch (e) { setMessage(`Saving didn't work here: ${e}`) }
  }
  const open = async e => {
    try {
      const m = JSON.parse(await e.target.files[0].text())
      if (m.kind !== 'upskillos-digit-cnn' || !Array.isArray(m.W) || m.D?.length !== 10) throw new Error('not a digit CNN saved by this lab')
      setLoaded({ filters: m.filters, W: m.W, b: m.b, D: m.D, c: m.c }); setMessage(`Loaded ${e.target.files[0].name}: the drawing below now uses it.`)
    } catch (err) { setMessage(`Couldn't load it: ${err.message}`) }
  }
  if (!data) return <div className="qm-fig"><Loading error={error} /></div>
  return <div className="qm-fig">
    {!s.cnn && !loaded && <TrainBoth data={data} />}
    <div className="qm-buttons">
      <button disabled={!s.cnn} onClick={save}>Save the trained CNN to a file</button>
      <button onClick={() => file.current?.click()}>Load a saved CNN…</button><input ref={file} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={open} />
      {message && <span className="qm-hint">{message}</span>}
    </div>
    <div className="nn-row"><div><Pad pad={pad} /><div className="qm-buttons"><button onClick={pad.clear}>Clear</button></div></div>
      <div>{probs ? <><p>{loaded ? 'The loaded' : 'The trained'} CNN says <b className="nn-big">{argmax(probs)}</b>.</p><ProbBars probs={probs} names={DIGITS} highlight={argmax(probs)} /></> : <p className="qm-hint">{model ? 'Draw a digit.' : 'Train or load a model, then draw.'}</p>}</div></div>
  </div>
}
