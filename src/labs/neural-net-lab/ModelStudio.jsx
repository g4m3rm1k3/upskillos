import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import XYPlot from './figures/XYPlot.jsx'
import PlanePlot, { COLORS } from './figures/PlanePlot.jsx'
import Plot from '../cartpole-lab/figures/Plot.jsx'
import { Slider } from '../qmaze-lab/figures/ui.jsx'
import { fmt } from '../python-steps/format.js'
import { makeLine, makeCurve, ACTIVATIONS } from './engine/part1.js'
import { makeBlobs, makeMoons, sigmoid, confusion, scores, tumourData } from './engine/part2.js'
import { makeMLP, makeOptimizer, trainSteps, predictOne, countWeights, codeFor, lossAndGradients } from './engine/mlp.js'
import { carData } from './engine/cars.js'
import { makeXor, makeRing } from './figures/part2.jsx'
import { SPECIES, IRIS_COLUMNS, loadIris, oneHot, digitData, confusionMatrix } from './engine/part3.js'

// Build a network layer by layer, like Keras' Sequential, and train it live on a data set; then try
// it on your own input, and read the PyTorch and Keras code that builds the same thing.
//   loss 'mse': predict a number; loss 'bce': yes or no (the output is a logit; sigmoid gives p).
//   view: 'curve' (one input), 'cars', 'plane' (two inputs; click to add points), 'confusion'.
const plane = ([pts, labels], range) => ({ X: pts.map(p => [...p]), Y: labels.map(l => [l]), range })
const DATASETS = {
  line: { group: 'Predict a number', label: 'Points near a line (20)', inputs: 1, loss: 'mse', view: 'curve', rate: 0.01, make: () => { const [xs, ys] = makeLine(); return { X: xs.map(x => [x]), Y: ys.map(y => [y]), x: [0, 5], y: [-1, 13] } } },
  curve: { group: 'Predict a number', label: 'Points near sin(x) (40)', inputs: 1, loss: 'mse', view: 'curve', rate: 0.05, make: () => { const [xs, ys] = makeCurve(); return { X: xs.map(x => [x]), Y: ys.map(y => [y]), x: [-3, 3], y: [-2, 2] } } },
  cars: { group: 'Predict a number', label: 'Fuel economy: 392 real cars', inputs: 2, loss: 'mse', view: 'cars', rate: 0.01, make: () => { const d = carData(0); return { X: d.X, Y: d.Y, Xtest: d.Xtest, Ytest: d.Ytest, stats: d.stats } } },
  blobs: { group: 'Yes or no', label: 'Two clouds (40)', inputs: 2, loss: 'bce', view: 'plane', rate: 0.5, make: () => plane(makeBlobs(), [[-3, 3], [-3, 3]]) },
  moons: { group: 'Yes or no', label: 'Two moons (100)', inputs: 2, loss: 'bce', view: 'plane', rate: 0.5, make: () => plane(makeMoons(), [[-1.5, 2.5], [-1.2, 1.7]]) },
  xor: { group: 'Yes or no', label: 'Four corners, XOR (80)', inputs: 2, loss: 'bce', view: 'plane', rate: 0.5, make: () => plane(makeXor(), [[-3, 3], [-3, 3]]) },
  ring: { group: 'Yes or no', label: 'A ring around a dot (80)', inputs: 2, loss: 'bce', view: 'plane', rate: 0.5, make: () => plane(makeRing(), [[-3, 3], [-3, 3]]) },
  draw: { group: 'Yes or no', label: 'Your own points (click to draw)', inputs: 2, loss: 'bce', view: 'plane', rate: 0.5, make: () => plane([[], []], [[-3, 3], [-3, 3]]) },
  tumours: { group: 'Yes or no', label: 'Tumours: 569 real, 30 measurements', inputs: 30, loss: 'bce', view: 'confusion', rate: 0.1, make: () => { const d = tumourData(null, 0); return { X: d.X, Y: d.Y, Xtest: d.Xtest, Ytest: d.Ytest } } },
  iris: { group: 'One of several', label: 'Iris flowers: 150 real, 4 measurements', inputs: 4, classes: 3, names: SPECIES, loss: 'ce', view: 'classes', rate: 0.1, make: () => {
    const [rows, labels] = loadIris(IRIS_COLUMNS), stats = rows[0].map((_, j) => { const col = rows.map(r => r[j]), m = col.reduce((a, b) => a + b, 0) / col.length; return [m, Math.sqrt(col.reduce((s, v) => s + (v - m) ** 2, 0) / col.length)] })
    return { X: rows.map(r => r.map((v, j) => (v - stats[j][0]) / stats[j][1])), Y: labels.map(l => oneHot(l, 3)) }
  } },
  digits: { group: 'One of several', label: 'Handwritten digits: 1,797, 8 × 8', inputs: 64, classes: 10, names: Array.from({ length: 10 }, (_, d) => String(d)), loss: 'ce', view: 'classes', rate: 0.01, kind: 'adam', make: () => { const d = digitData(0); return { X: d.X, Y: d.Y, Xtest: d.Xtest, Ytest: d.Ytest } } },
}
const PRESETS = {
  'one neuron': [],
  '1 hidden layer of 8 (ReLU)': [{ units: 8, activation: 'relu' }],
  '2 hidden layers of 16 (ReLU)': [{ units: 16, activation: 'relu' }, { units: 16, activation: 'relu' }],
  '1 hidden layer of 8 (tanh)': [{ units: 8, activation: 'tanh' }],
}

function LayerEditor({ hidden, setHidden, inputs, loss }) {
  const set = (i, k, v) => setHidden(h => h.map((l, j) => j === i ? { ...l, [k]: v } : l))
  return <div className="nn-layers">
    <span className="nn-chip in">input · {inputs}</span>
    {hidden.map((l, i) => <span key={i} className="nn-chip">
      <input type="number" min={1} max={64} value={l.units} onChange={e => set(i, 'units', Math.max(1, Math.min(64, Number(e.target.value) || 1)))} aria-label={`layer ${i + 1} neurons`} /> neurons
      <select value={l.activation} onChange={e => set(i, 'activation', e.target.value)} aria-label={`layer ${i + 1} activation`}>{Object.entries(ACTIVATIONS).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}</select>
      <button className="qm-quiet" onClick={() => setHidden(h => h.filter((_, j) => j !== i))} aria-label={`remove layer ${i + 1}`}>✕</button>
    </span>)}
    <button onClick={() => setHidden(h => [...h, { units: 8, activation: 'relu' }])}>+ add a layer</button>
    <span className="nn-chip out">output · 1 {loss === 'bce' ? '→ sigmoid → probability' : '(a number)'}</span>
  </div>
}

export default function ModelStudio() {
  const [dataset, setDataset] = useState('curve')
  const [hidden, setHidden] = useState([{ units: 8, activation: 'relu' }])
  const [opt, setOpt] = useState({ kind: 'sgd', rate: 0.05 })
  const [seed, setSeed] = useState(0)
  const [added, setAdded] = useState({ pts: [], labels: [] }), [colour, setColour] = useState(1)
  const D = DATASETS[dataset]
  const base = useMemo(() => D.make(), [dataset])
  const data = D.view === 'plane' ? { ...base, X: [...base.X, ...added.pts], Y: [...base.Y, ...added.labels.map(l => [l])] } : base
  const layers = [...hidden, { units: D.classes ?? 1, activation: 'none' }]
  const key = JSON.stringify([dataset, hidden, opt, seed])
  const run = useRef(null), [, redraw] = useReducer(n => n + 1, 0)
  if (!run.current || run.current.key !== key) {
    const net = makeMLP(D.inputs, layers, seed)
    run.current = { key, net, opt: makeOptimizer(net, opt), steps: 0, train: [], test: [] }
  }
  const [playing, setPlaying] = useState(false)
  const advance = n => {
    const r = run.current
    if (!data.X.length) return
    for (let i = 0; i < n; i++) {
      const loss = trainSteps(r.net, r.opt, data.X, data.Y, 1, D.loss)
      r.steps++
      if (r.steps % 5 === 0 || n === 1) { r.train.push(loss); if (data.Xtest) r.test.push(lossAndGradients(r.net, data.Xtest, data.Ytest, D.loss).loss) }
    }
    redraw()
  }
  useEffect(() => { setPlaying(false) }, [key])
  useEffect(() => { if (!playing) return undefined; const id = setInterval(() => advance(['cars', 'tumours'].includes(dataset) ? 5 : 20), 40); return () => clearInterval(id) }, [playing, key, added])
  const r = run.current
  const exploded = r.train.length && !Number.isFinite(r.train.at(-1))
  const [tryX, setTryX] = useState(1), [car, setCar] = useState([3000, 100]), [threshold, setThreshold] = useState(0.5)
  const code = codeFor(D.inputs, layers, opt, D.loss)
  const [lang, setLang] = useState('torch')
  const prob = x => sigmoid(predictOne(r.net, x)[0])
  const trainedAcc = D.loss === 'bce' && r.steps && data.X.length ? data.X.filter((x, i) => (prob(x) >= 0.5 ? 1 : 0) === data.Y[i][0]).length / data.X.length : null
  const groups = [...new Set(Object.values(DATASETS).map(d => d.group))]
  return <div className="qm-playground nn-studio">
    <h2 className="qm-h0">Model Studio</h2>
    <p className="qm-hint">Build a network like Keras' <span className="mono">Sequential</span>: layers in order, each with its neurons and activation. Everything below is computed in your browser, with the same arithmetic as the lessons' Python (the lab's tests check it against PyTorch).</p>
    <div className="qm-fig">
      <div className="qm-fig-controls">
        <label>Data <select value={dataset} onChange={e => { setDataset(e.target.value); setOpt(o => ({ ...o, rate: DATASETS[e.target.value].rate, kind: DATASETS[e.target.value].kind ?? o.kind })); setAdded({ pts: [], labels: [] }) }}>{groups.map(g => <optgroup key={g} label={g}>{Object.entries(DATASETS).filter(([, d]) => d.group === g).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}</optgroup>)}</select></label>
        <label>Start from <select value="" onChange={e => e.target.value && setHidden(PRESETS[e.target.value])}><option value="">a preset…</option>{Object.keys(PRESETS).map(p => <option key={p}>{p}</option>)}</select></label>
        <label>Optimiser <select value={opt.kind} onChange={e => setOpt(o => ({ ...o, kind: e.target.value }))}><option value="sgd">SGD</option><option value="momentum">SGD with momentum</option><option value="adam">Adam</option></select></label>
        <Slider label="learning rate" value={opt.rate} min={0.001} max={1} step={0.001} onChange={v => setOpt(o => ({ ...o, rate: v }))} />
        <label>seed <input type="number" value={seed} onChange={e => setSeed(Number(e.target.value) || 0)} style={{ width: 52 }} /></label>
      </div>
      <LayerEditor hidden={hidden} setHidden={setHidden} inputs={D.inputs} loss={D.loss} />
      <p className="qm-hint">{countWeights(r.net).toLocaleString()} weights and biases · loss: {D.loss === 'bce' ? 'binary cross-entropy (Part 2)' : 'mean squared error (Part 1)'}. Part 5 explains momentum and Adam.</p>
      <div className="qm-buttons">
        <button onClick={() => advance(1)}>One step</button><button onClick={() => advance(100)}>100 steps</button>
        <button className="qm-primary" onClick={() => setPlaying(p => !p)}>{playing ? '⏸ Pause' : '▶ Train'}</button>
        <button onClick={() => { run.current = null; setPlaying(false); redraw() }}>↺ New random weights</button>
        <span className="qm-hint">{r.steps} steps · training loss {r.train.length ? fmt(r.train.at(-1), 4) : '—'}{data.Xtest && r.test.length ? ` · test loss ${fmt(r.test.at(-1), 3)}` : ''}{trainedAcc !== null ? ` · ${fmt(100 * trainedAcc, 1)}% of the points right` : ''}</span>
      </div>
      {exploded ? <p className="qm-py-error">The loss became infinite: the learning rate is too big for this network. Lower it and start again.</p> : null}
      <div className="nn-row">
        {D.view === 'curve' && <div><XYPlot points={data.X.map((x, i) => [x[0], data.Y[i][0]])} x={data.x} y={data.y} curves={[{ f: x => predictOne(r.net, [x])[0], width: 2.6 }]} marks={[[tryX, predictOne(r.net, [tryX])[0], 'yours']]} />
          <Slider label="your x" value={tryX} min={data.x[0]} max={data.x[1]} step={0.01} onChange={setTryX} /><p>The network says <b>{fmt(predictOne(r.net, [tryX])[0], 3)}</b> for x = {fmt(tryX, 2)}.</p></div>}
        {D.view === 'cars' && <div><XYPlot points={data.Xtest.map((x, i) => [data.Ytest[i][0], predictOne(r.net, x)[0]])} curves={[{ f: x => x, color: '#a8402f', dash: '4 4', width: 1 }]} x={[5, 48]} y={[5, 48]} xLabel="true mpg (test cars)" yLabel="predicted mpg" />
          <p className="qm-hint">Each dot is a test car the network never trained on; on the dashed line its prediction would be exact.</p>
          <Slider label="your car's weight (lb)" value={car[0]} min={1600} max={5000} step={10} onChange={w => setCar(c => [w, c[1]])} />
          <Slider label="its horsepower" value={car[1]} min={45} max={230} step={1} onChange={h => setCar(c => [c[0], h])} />
          <p>The network says <b>{fmt(predictOne(r.net, [(car[0] - data.stats[0][0]) / data.stats[0][1], (car[1] - data.stats[1][0]) / data.stats[1][1]])[0], 1)} mpg</b>.</p></div>}
        {D.view === 'plane' && <div>
          <PlanePlot points={data.X} labels={data.Y.map(y => y[0])} prob={r.steps ? prob : null} x={data.range[0]} y={data.range[1]} size={360} onClick={(x, y) => setAdded(a => ({ pts: [...a.pts, [x, y]], labels: [...a.labels, colour] }))} />
          <div className="qm-buttons qm-small"><label>Click adds <select value={colour} onChange={e => setColour(Number(e.target.value))}><option value={1}>orange (1)</option><option value={0}>teal (0)</option></select></label>{added.pts.length > 0 && <button onClick={() => setAdded({ pts: [], labels: [] })}>Remove the {added.pts.length} points you added</button>}</div>
          <p className="qm-hint">The shading is the network's probability of <b style={{ color: COLORS[1] }}>orange</b>; the black edge, 50%. Click to add points of your own, even while it trains.</p></div>}
        {D.view === 'classes' && (() => {
          const X = data.Xtest ?? data.X, labels = (data.Ytest ?? data.Y).map(y => y.indexOf(1))
          if (!r.steps) return <div><p className="qm-hint">Train, then see which {D.classes === 3 ? 'species' : 'digits'} it gets right and which it confuses{data.Xtest ? ', on examples it never saw' : ' (all 150 flowers: there is no test set)'}.</p></div>
          const guesses = X.map(x => { const o = predictOne(r.net, x); return o.indexOf(Math.max(...o)) }), table = confusionMatrix(guesses, labels, D.classes)
          const right = guesses.filter((g, i) => g === labels[i]).length
          return <div><p><b>{right}</b> of {labels.length} right ({fmt(100 * right / labels.length, 1)}%){data.Xtest ? ' on the test examples' : ''}.</p>
            <table className="qm-log nn-cm"><thead><tr><th>true ↓ guessed →</th>{D.names.map(n => <th key={n}>{n}</th>)}</tr></thead>
              <tbody>{table.map((row, t) => <tr key={t}><th>{D.names[t]}</th>{row.map((n, g) => <td key={g} className={n ? (g === t ? 'good' : 'bad') : ''}>{n || ''}</td>)}</tr>)}</tbody></table></div>
        })()}
        {D.view === 'confusion' && (() => {
          const probs = r.steps ? data.Xtest.map(prob) : null, labels = data.Ytest.map(y => y[0])
          const c = probs ? confusion(probs, labels, threshold) : null, sc = c ? scores(...c) : null
          return <div>{c ? <>
            <Slider label="threshold" value={threshold} min={0.01} max={0.99} step={0.01} onChange={setThreshold} />
            <table className="qm-log nn-confusion"><thead><tr><th>113 test tumours</th><th>really malignant</th><th>really benign</th></tr></thead>
              <tbody><tr><th>called malignant</th><td className="good">{c[0]}</td><td className="bad">{c[1]}</td></tr><tr><th>called benign</th><td className="bad">{c[3]}</td><td className="good">{c[2]}</td></tr></tbody></table>
            <p className="mono">accuracy {fmt(sc[0], 3)} · precision {fmt(sc[1], 3)} · recall {fmt(sc[2], 3)}</p></> : <p className="qm-hint">Train, then judge on the 113 test tumours.</p>}</div>
        })()}
        <div>
          <Plot series={[{ values: r.train.map(v => Math.min(v, 1e3)), color: '#1f6f68', label: 'training' }, ...(data.Xtest ? [{ values: r.test.map(v => Math.min(v, 1e3)), color: '#b5650d', label: 'test' }] : [])]} window={1} x="record" label="loss while training" height={150} />
          <div className="qm-buttons qm-small">{[['torch', 'PyTorch'], ['keras', 'Keras']].map(([k, l]) => <button key={k} className={lang === k ? 'active' : ''} onClick={() => setLang(k)}>{l}</button>)}</div>
          <pre className="nn-code mono">{code[lang]}</pre>
        </div>
      </div>
    </div>
  </div>
}
