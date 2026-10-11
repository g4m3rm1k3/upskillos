import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import XYPlot from './figures/XYPlot.jsx'
import Plot from '../cartpole-lab/figures/Plot.jsx'
import { Slider } from '../qmaze-lab/figures/ui.jsx'
import { fmt } from '../python-steps/format.js'
import { makeLine, makeCurve, ACTIVATIONS } from './engine/part1.js'
import { makeMLP, makeOptimizer, trainSteps, predictOne, countWeights, codeFor, lossAndGradients } from './engine/mlp.js'
import { carData } from './engine/cars.js'

// Build a network layer by layer, like Keras' Sequential, and train it live on a data set; then try
// it on your own input, and read the PyTorch and Keras code that builds the same thing.
const DATASETS = {
  line: { label: 'Points near a line (20)', inputs: 1, rate: 0.01, make: () => { const [xs, ys] = makeLine(); return { X: xs.map(x => [x]), Y: ys.map(y => [y]), x: [0, 5], y: [-1, 13] } } },
  curve: { label: 'Points near sin(x) (40)', inputs: 1, rate: 0.05, make: () => { const [xs, ys] = makeCurve(); return { X: xs.map(x => [x]), Y: ys.map(y => [y]), x: [-3, 3], y: [-2, 2] } } },
  cars: { label: 'Fuel economy: 392 real cars', inputs: 2, rate: 0.01, make: () => { const d = carData(0); return { X: d.X, Y: d.Y, Xtest: d.Xtest, Ytest: d.Ytest, stats: d.stats } } },
}
const PRESETS = {
  'one neuron': [],
  '1 hidden layer of 8 (ReLU)': [{ units: 8, activation: 'relu' }],
  '2 hidden layers of 16 (ReLU)': [{ units: 16, activation: 'relu' }, { units: 16, activation: 'relu' }],
  '1 hidden layer of 8 (tanh)': [{ units: 8, activation: 'tanh' }],
}

function LayerEditor({ hidden, setHidden, inputs }) {
  const set = (i, k, v) => setHidden(h => h.map((l, j) => j === i ? { ...l, [k]: v } : l))
  return <div className="nn-layers">
    <span className="nn-chip in">input · {inputs}</span>
    {hidden.map((l, i) => <span key={i} className="nn-chip">
      <input type="number" min={1} max={64} value={l.units} onChange={e => set(i, 'units', Math.max(1, Math.min(64, Number(e.target.value) || 1)))} aria-label={`layer ${i + 1} neurons`} /> neurons
      <select value={l.activation} onChange={e => set(i, 'activation', e.target.value)} aria-label={`layer ${i + 1} activation`}>{Object.entries(ACTIVATIONS).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}</select>
      <button className="qm-quiet" onClick={() => setHidden(h => h.filter((_, j) => j !== i))} aria-label={`remove layer ${i + 1}`}>✕</button>
    </span>)}
    <button onClick={() => setHidden(h => [...h, { units: 8, activation: 'relu' }])}>+ add a layer</button>
    <span className="nn-chip out">output · 1</span>
  </div>
}

export default function ModelStudio() {
  const [dataset, setDataset] = useState('curve')
  const [hidden, setHidden] = useState([{ units: 8, activation: 'relu' }])
  const [opt, setOpt] = useState({ kind: 'sgd', rate: 0.05 })
  const [seed, setSeed] = useState(0)
  const D = DATASETS[dataset]
  const data = useMemo(() => D.make(), [dataset])
  const layers = [...hidden, { units: 1, activation: 'none' }]
  const key = JSON.stringify([dataset, hidden, opt, seed])
  const run = useRef(null), [, redraw] = useReducer(n => n + 1, 0)
  if (!run.current || run.current.key !== key) {
    const net = makeMLP(D.inputs, layers, seed)
    run.current = { key, net, opt: makeOptimizer(net, opt), steps: 0, train: [], test: [] }
  }
  const [playing, setPlaying] = useState(false)
  const advance = n => {
    const r = run.current
    for (let i = 0; i < n; i++) {
      const loss = trainSteps(r.net, r.opt, data.X, data.Y, 1)
      r.steps++
      if (r.steps % 5 === 0 || n === 1) { r.train.push(loss); if (data.Xtest) r.test.push(lossAndGradients(r.net, data.Xtest, data.Ytest).loss) }
    }
    redraw()
  }
  useEffect(() => { setPlaying(false) }, [key])
  useEffect(() => { if (!playing) return undefined; const id = setInterval(() => advance(dataset === 'cars' ? 10 : 20), 40); return () => clearInterval(id) }, [playing, key])
  const r = run.current
  const exploded = r.train.length && !Number.isFinite(r.train.at(-1))
  const [tryX, setTryX] = useState(1)
  const [car, setCar] = useState([3000, 100])
  const code = codeFor(D.inputs, layers, opt)
  const [lang, setLang] = useState('torch')
  return <div className="qm-playground nn-studio">
    <h2 className="qm-h0">Model Studio</h2>
    <p className="qm-hint">Build a network like Keras' <span className="mono">Sequential</span>: layers in order, each with its neurons and activation. Everything below is computed in your browser, with the same arithmetic as the lessons' Python (the lab's tests check it against PyTorch).</p>
    <div className="qm-fig">
      <div className="qm-fig-controls">
        <label>Data <select value={dataset} onChange={e => { setDataset(e.target.value); setOpt(o => ({ ...o, rate: DATASETS[e.target.value].rate })) }}>{Object.entries(DATASETS).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}</select></label>
        <label>Start from <select value="" onChange={e => e.target.value && setHidden(PRESETS[e.target.value])}><option value="">a preset…</option>{Object.keys(PRESETS).map(p => <option key={p}>{p}</option>)}</select></label>
        <label>Optimiser <select value={opt.kind} onChange={e => setOpt(o => ({ ...o, kind: e.target.value }))}><option value="sgd">SGD</option><option value="momentum">SGD with momentum</option><option value="adam">Adam</option></select></label>
        <Slider label="learning rate" value={opt.rate} min={0.001} max={0.3} step={0.001} onChange={v => setOpt(o => ({ ...o, rate: v }))} />
        <label>seed <input type="number" value={seed} onChange={e => setSeed(Number(e.target.value) || 0)} style={{ width: 52 }} /></label>
      </div>
      <LayerEditor hidden={hidden} setHidden={setHidden} inputs={D.inputs} />
      <p className="qm-hint">{countWeights(r.net).toLocaleString()} weights and biases. (Part 5 explains momentum and Adam; Part 2 adds outputs that are probabilities.)</p>
      <div className="qm-buttons">
        <button onClick={() => advance(1)}>One step</button><button onClick={() => advance(100)}>100 steps</button>
        <button className="qm-primary" onClick={() => setPlaying(p => !p)}>{playing ? '⏸ Pause' : '▶ Train'}</button>
        <button onClick={() => { run.current = null; setPlaying(false); redraw() }}>↺ New random weights</button>
        <span className="qm-hint">{r.steps} steps · training error {r.train.length ? fmt(r.train.at(-1), 4) : '—'}{data.Xtest && r.test.length ? ` · test error ${fmt(r.test.at(-1), 3)}` : ''}</span>
      </div>
      {exploded ? <p className="qm-py-error">The error became infinite: the learning rate is too big for this network. Lower it and start again.</p> : null}
      <div className="nn-row">
        {D.inputs === 1
          ? <div><XYPlot points={data.X.map((x, i) => [x[0], data.Y[i][0]])} x={data.x} y={data.y} curves={[{ f: x => predictOne(r.net, [x])[0], width: 2.6 }]} marks={[[tryX, predictOne(r.net, [tryX])[0], 'yours']]} />
            <Slider label="your x" value={tryX} min={data.x[0]} max={data.x[1]} step={0.01} onChange={setTryX} /><p>The network says <b>{fmt(predictOne(r.net, [tryX])[0], 3)}</b> for x = {fmt(tryX, 2)}.</p></div>
          : <div><XYPlot points={data.Xtest.map((x, i) => [data.Ytest[i][0], predictOne(r.net, x)[0]])} curves={[{ f: x => x, color: '#a8402f', dash: '4 4', width: 1 }]} x={[5, 48]} y={[5, 48]} xLabel="true mpg (test cars)" yLabel="predicted mpg" />
            <p className="qm-hint">Each dot is a test car the network never trained on; on the dashed line its prediction would be exact.</p>
            <Slider label="your car's weight (lb)" value={car[0]} min={1600} max={5000} step={10} onChange={w => setCar(c => [w, c[1]])} />
            <Slider label="its horsepower" value={car[1]} min={45} max={230} step={1} onChange={h => setCar(c => [c[0], h])} />
            <p>The network says <b>{fmt(predictOne(r.net, [(car[0] - data.stats[0][0]) / data.stats[0][1], (car[1] - data.stats[1][0]) / data.stats[1][1]])[0], 1)} mpg</b>.</p></div>}
        <div>
          <Plot series={[{ values: r.train.map(v => Math.min(v, 1e3)), color: '#1f6f68', label: 'training' }, ...(data.Xtest ? [{ values: r.test.map(v => Math.min(v, 1e3)), color: '#b5650d', label: 'test' }] : [])]} window={1} x="record" label="error while training" height={150} />
          <div className="qm-buttons qm-small">{[['torch', 'PyTorch'], ['keras', 'Keras']].map(([k, l]) => <button key={k} className={lang === k ? 'active' : ''} onClick={() => setLang(k)}>{l}</button>)}</div>
          <pre className="nn-code mono">{code[lang]}</pre>
        </div>
      </div>
    </div>
  </div>
}
