import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import PlanePlot, { COLORS } from './PlanePlot.jsx'
import XYPlot from './XYPlot.jsx'
import Plot from '../../cartpole-lab/figures/Plot.jsx'
import { Slider } from '../../qmaze-lab/figures/ui.jsx'
import { fmt } from '../../python-steps/format.js'
import { makeBlobs, makeMoons, predictProb, bce, trainLogistic, accuracy, confusion, scores, tumourData, sigmoid } from '../engine/part2.js'
import { makeMLP, makeOptimizer, trainSteps, predictOne, lossAndGradients } from '../engine/mlp.js'
import { PyRandom } from '../../qmaze-lab/engine/mt.js'

const BLOBS = makeBlobs(), MOONS = makeMoons()
const pct = x => `${fmt(100 * x, 1)}%`

// Extra shapes for drawing on: two made-up patterns no single line can split.
export function makeXor(n = 80, seed = 1) {
  const rng = new PyRandom(seed), u = (a, b) => a + (b - a) * rng.random(), pts = [], lab = []
  for (let i = 0; i < n; i++) { const x = u(-2.5, 2.5), y = u(-2.5, 2.5); pts.push([x, y]); lab.push(x * y > 0 ? 1 : 0) }
  return [pts, lab]
}
export function makeRing(n = 80, seed = 2) {
  const rng = new PyRandom(seed), u = (a, b) => a + (b - a) * rng.random(), pts = [], lab = []
  for (let i = 0; i < n; i++) { const label = i % 2, r = label ? u(0, 1.1) : u(1.7, 2.6), t = u(0, 2 * Math.PI); pts.push([r * Math.cos(t), r * Math.sin(t)]); lab.push(label) }
  return [pts, lab]
}

// One neuron with two inputs and a sigmoid: drag its weights and watch the boundary and the shading.
export function SigmoidNeuronFig() {
  const [w1, setW1] = useState(1), [w2, setW2] = useState(1), [b, setB] = useState(0)
  const [pick, setPick] = useState(0)
  const [points, labels] = BLOBS
  const p = predictProb([w1, w2], b, points[pick]), z = w1 * points[pick][0] + w2 * points[pick][1] + b
  return <div className="qm-fig">
    <div className="nn-row">
      <PlanePlot points={points} labels={labels} prob={pt => predictProb([w1, w2], b, pt)} x={[-3, 3]} y={[-3, 3]} highlight={pick} onClick={(x, y) => {
        let best = 0; points.forEach((q, i) => { if (Math.hypot(q[0] - x, q[1] - y) < Math.hypot(points[best][0] - x, points[best][1] - y)) best = i }); setPick(best)
      }} />
      <div>
        <Slider label="w₁" value={w1} min={-4} max={4} step={0.05} onChange={setW1} />
        <Slider label="w₂" value={w2} min={-4} max={4} step={0.05} onChange={setW2} />
        <Slider label="b" value={b} min={-4} max={4} step={0.05} onChange={setB} />
        <p className="qm-hint">Click a point. Point {pick} is <b style={{ color: COLORS[labels[pick]] }}>{labels[pick] ? 'orange (1)' : 'teal (0)'}</b>:</p>
        <div className="nn-work">{`z = w₁·x₁ + w₂·x₂ + b = ${fmt(w1, 2)}×${fmt(points[pick][0], 3)} + ${fmt(w2, 2)}×${fmt(points[pick][1], 3)} + ${fmt(b, 2)} = ${fmt(z, 3)}
p = sigmoid(z) = 1 / (1 + e^${fmt(-z, 3)}) = ${fmt(p, 4)}`}</div>
        <p>The model says {pct(p)} orange. Points right on the black boundary get exactly 50%; the further away, the surer the model.</p>
        <p className="qm-hint">Accuracy with these weights: {pct(accuracy([w1, w2], b, points, labels))} of the 40 points on the right side.</p>
      </div>
    </div>
  </div>
}

// How the cross-entropy punishes a wrong probability, against the squared error.
export function BceFig() {
  const [p, setP] = useState(0.3), [label, setLabel] = useState(1)
  const target = label
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="probability given to orange, p" value={p} min={0.001} max={0.999} step={0.001} onChange={setP} />
      <label>true answer <select value={label} onChange={e => setLabel(Number(e.target.value))}><option value={1}>orange (1)</option><option value={0}>teal (0)</option></select></label></div>
    <div className="nn-row">
      <XYPlot x={[0, 1]} y={[0, 5]} curves={[{ f: q => bce(q, target), color: '#a8402f' }, { f: q => (q - target) ** 2, color: '#6f665a', dash: '5 4', width: 1.5 }]} marks={[[p, Math.min(bce(p, target), 5)]]} xLabel="p" yLabel="loss" />
      <div>
        <p className="mono">cross-entropy = −log({label ? 'p' : '1 − p'}) = −log({fmt(label ? p : 1 - p, 3)}) = <b>{fmt(bce(p, target), 3)}</b></p>
        <p className="mono">squared error = (p − y)² = <b>{fmt((p - target) ** 2, 3)}</b> <span className="qm-hint">(dashed)</span></p>
        <p className="qm-hint">A confident wrong answer (p near {label ? 0 : 1}) costs the squared error at most 1, but the cross-entropy without limit: being sure and wrong is punished hard, which is what we want from a probability.</p>
      </div>
    </div>
  </div>
}

// Logistic regression trained step by step: the boundary moving into place.
export function LogisticTrainer() {
  const [rate, setRate] = useState(0.5)
  const run = useRef(null), [, redraw] = useReducer(n => n + 1, 0)
  if (!run.current || run.current.rate !== rate) run.current = { rate, gen: trainLogistic({ steps: 100000, rate }), last: null }
  const [playing, setPlaying] = useState(false)
  const steps = n => { for (let i = 0; i < n; i++) run.current.last = run.current.gen.next().value; redraw() }
  useEffect(() => { if (!playing) return undefined; const id = setInterval(() => steps(2), 50); return () => clearInterval(id) }, [playing, rate])
  const u = run.current.last, w = u?.w ?? [0, 0], b = u?.b ?? 0
  const [points, labels] = BLOBS
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="learning rate" value={rate} min={0.05} max={3} step={0.05} onChange={setRate} />
      <button onClick={() => steps(1)}>One step</button><button onClick={() => steps(50)}>50 steps</button><button onClick={() => setPlaying(x => !x)}>{playing ? '⏸ Pause' : '▶ Train'}</button><button onClick={() => { run.current = null; setPlaying(false); redraw() }}>↺ Start again</button></div>
    <div className="nn-row">
      <PlanePlot points={points} labels={labels} prob={u ? pt => predictProb(w, b, pt) : null} x={[-3, 3]} y={[-3, 3]} />
      <div>
        {u ? <div className="nn-work">{`step ${u.step + 1}
gradient:  ∂L/∂w₁ = mean((p − y)·x₁) = ${fmt(u.grad[0], 4)}
           ∂L/∂w₂ = mean((p − y)·x₂) = ${fmt(u.grad[1], 4)}
           ∂L/∂b  = mean(p − y)      = ${fmt(u.grad[2], 4)}
now:       w = (${fmt(w[0], 3)}, ${fmt(w[1], 3)}), b = ${fmt(b, 3)}
loss ${fmt(u.history.at(-1), 4)} · accuracy ${pct(accuracy(w, b, points, labels))}`}</div> : <p className="qm-hint">w = (0, 0), b = 0: every point gets 50%. Press <b>One step</b>.</p>}
        {u && <Plot series={[{ values: u.history.slice(-400), color: '#1f6f68' }]} window={1} x="step" label="cross-entropy" height={120} />}
      </div>
    </div>
  </div>
}

// Train a small network on points: drawn by you, or one of several shapes.
const SHAPES = { blobs: ['two clouds', () => BLOBS], moons: ['two moons', () => MOONS], xor: ['four corners (XOR)', () => makeXor()], ring: ['a ring around a dot', () => makeRing()], empty: ['nothing: draw your own', () => [[], []]] }
export function DrawYourOwn({ initial = 'moons', initialHidden = 8 }) {
  const [data, setData] = useState(() => SHAPES[initial][1]().map(a => [...a]))
  const [colour, setColour] = useState(1), [hidden, setHidden] = useState(initialHidden), [showLines, setShowLines] = useState(false)
  const [points, labels] = data
  const box = initial === 'moons' ? [[-1.5, 2.5], [-1.2, 1.7]] : [[-3, 3], [-3, 3]]
  const [range, setRange] = useState(box)
  const net = useRef(null), [, redraw] = useReducer(n => n + 1, 0)
  const [playing, setPlaying] = useState(false), [steps, setSteps] = useState(0), [loss, setLoss] = useState(null)
  const fresh = () => { const m = makeMLP(2, hidden ? [{ units: hidden, activation: 'relu' }, { units: 1 }] : [{ units: 1 }], 0); net.current = { m, opt: makeOptimizer(m, { kind: 'adam', rate: 0.03 }) }; setSteps(0); setLoss(null) }
  useEffect(fresh, [hidden])
  const train = n => { if (!points.length || !net.current) return; setLoss(trainSteps(net.current.m, net.current.opt, points, labels.map(l => [l]), n, 'bce')); setSteps(s => s + n) }
  useEffect(() => { if (!playing) return undefined; const id = setInterval(() => train(10), 40); return () => clearInterval(id) }, [playing, points, labels])
  const m = net.current?.m
  const prob = m && steps ? pt => sigmoid(predictOne(m, pt)[0]) : null
  const acc = prob && points.length ? points.filter((pt, i) => (prob(pt) >= 0.5 ? 1 : 0) === labels[i]).length / points.length : null
  const lines = showLines && m && hidden ? m.layers[0].W.map(([a, b], k) => [a, b, m.layers[0].b[k]]) : []
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label>Start from <select onChange={e => { const k = e.target.value; setData(SHAPES[k][1]().map(a => [...a])); setRange(k === 'moons' ? [[-1.5, 2.5], [-1.2, 1.7]] : [[-3, 3], [-3, 3]]); fresh() }} defaultValue={initial}>{Object.entries(SHAPES).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label>Click adds <select value={colour} onChange={e => setColour(Number(e.target.value))}><option value={1}>orange (1)</option><option value={0}>teal (0)</option></select></label>
      <label>Hidden neurons <select value={hidden} onChange={e => setHidden(Number(e.target.value))}>{[0, 2, 3, 4, 8, 16, 32].map(h => <option key={h} value={h}>{h === 0 ? '0 (one neuron)' : h}</option>)}</select></label>
      {hidden > 0 && <label><input type="checkbox" checked={showLines} onChange={e => setShowLines(e.target.checked)} /> show each hidden neuron's line</label>}
    </div>
    <div className="qm-buttons"><button onClick={() => train(100)}>100 steps</button><button className="qm-primary" onClick={() => setPlaying(x => !x)}>{playing ? '⏸ Pause' : '▶ Train'}</button><button onClick={fresh}>↺ New network</button><button onClick={() => { setData([[], []]); fresh() }}>Clear points</button>
      <span className="qm-hint">{points.length} points · {steps} steps{loss !== null ? ` · loss ${fmt(loss, 4)} · ${pct(acc)} right` : ''}</span></div>
    <PlanePlot points={points} labels={labels} prob={prob} lines={lines} x={range[0]} y={range[1]} size={380} onClick={(x, y) => setData(([p, l]) => [[...p, [x, y]], [...l, colour]])} />
    <p className="qm-hint">Click to add points; train; the shading is the network's probability of orange everywhere, and the black edge its 50% boundary. With 0 hidden neurons the boundary is always a straight line. {hidden > 0 && 'Each dashed line is where one hidden neuron switches on: the output combines those straight lines into a bent boundary.'}</p>
  </div>
}

// Two real measurements of 569 tumours, and a straight boundary learned between them.
const TWO = ['radius_mean', 'concave_points_mean']
export function TumourScatter() {
  const data = useMemo(() => tumourData(TWO, 0), [])
  const [model, setModel] = useState(null)
  const [radius, setRadius] = useState(14), [cp, setCp] = useState(0.05)
  const train = () => { const m = makeMLP(2, [{ units: 1 }], 0), opt = makeOptimizer(m, { rate: 0.1 }); trainSteps(m, opt, data.X, data.Y, 1000, 'bce'); setModel(m) }
  const scaledMe = [(radius - data.stats[0][0]) / data.stats[0][1], (cp - data.stats[1][0]) / data.stats[1][1]]
  const prob = model ? pt => sigmoid(predictOne(model, pt)[0]) : null
  const testProbs = model ? data.Xtest.map(x => prob(x)) : null
  const counts = testProbs ? confusion(testProbs, data.testLabels) : null
  return <div className="qm-fig">
    <div className="nn-row">
      <PlanePlot points={[...data.X, scaledMe]} labels={[...data.trainLabels, 2]} prob={prob} x={[-2.5, 4]} y={[-2, 4.5]} xLabel="radius (scaled)" yLabel="concave points (scaled)" highlight={data.X.length} />
      <div>
        <p className="qm-hint">456 training tumours: <b style={{ color: COLORS[1] }}>orange malignant</b>, <b style={{ color: COLORS[0] }}>teal benign</b>, by two measurements scaled as in lesson 1.9.</p>
        <div className="qm-buttons"><button className="qm-primary" onClick={train} disabled={!!model}>Train one neuron (1,000 steps)</button></div>
        {counts && <p>On the 113 test tumours: <b>{pct(scores(...counts)[0])}</b> right; {counts[3]} malignant tumours missed, {counts[1]} benign ones flagged.</p>}
        <h4 className="qm-small-h">A tumour you describe (the outlined dot)</h4>
        <Slider label="mean radius" value={radius} min={6} max={28} step={0.1} onChange={setRadius} />
        <Slider label="mean concave points" value={cp} min={0} max={0.2} step={0.001} onChange={setCp} />
        {prob && <p>The model says <b>{pct(prob(scaledMe))}</b> malignant.</p>}
      </div>
    </div>
  </div>
}

// The trained 30-measurement model's test probabilities, and what choosing a threshold does.
export function ThresholdFig() {
  const data = useMemo(() => tumourData(null, 0), [])
  const [probs, setProbs] = useState(null), [threshold, setThreshold] = useState(0.5)
  const train = () => { const m = makeMLP(30, [{ units: 1 }], 0), opt = makeOptimizer(m, { rate: 0.1 }); trainSteps(m, opt, data.X, data.Y, 1000, 'bce'); setProbs(data.Xtest.map(x => sigmoid(predictOne(m, x)[0]))) }
  const counts = probs ? confusion(probs, data.testLabels, threshold) : null
  const [acc, prec, rec] = counts ? scores(...counts) : []
  return <div className="qm-fig">
    <div className="qm-buttons"><button className="qm-primary" onClick={train} disabled={!!probs}>Train on all 30 measurements (1,000 steps)</button></div>
    {probs && <>
      <Slider label="threshold: call it malignant when p ≥" value={threshold} min={0.01} max={0.99} step={0.01} onChange={setThreshold} />
      <svg viewBox="0 0 460 70" className="qm-plot" role="img" aria-label="each test tumour placed by its probability">
        <line x1="10" x2="450" y1="35" y2="35" stroke="#d9ceb9" />
        <line x1={10 + threshold * 440} x2={10 + threshold * 440} y1="5" y2="65" stroke="#2c241b" strokeWidth="2" />
        {probs.map((p, i) => <circle key={i} cx={10 + p * 440} cy={data.testLabels[i] ? 22 : 48} r="3.5" fill={COLORS[data.testLabels[i]]} opacity=".8" />)}
        <text x="10" y="66" className="qm-tick">p = 0</text><text x="450" y="66" textAnchor="end" className="qm-tick">p = 1</text>
      </svg>
      <div className="nn-row">
        <table className="qm-log nn-confusion"><thead><tr><th></th><th>really malignant</th><th>really benign</th></tr></thead>
          <tbody><tr><th>called malignant</th><td className="good">{counts[0]} <small>true positive</small></td><td className="bad">{counts[1]} <small>false positive</small></td></tr>
            <tr><th>called benign</th><td className="bad">{counts[3]} <small>false negative</small></td><td className="good">{counts[2]} <small>true negative</small></td></tr></tbody></table>
        <div className="nn-work">{`accuracy  = (TP + TN) / all = ${fmt(acc, 3)}
precision = TP / (TP + FP)  = ${fmt(prec, 3)}   of those called malignant, how many are
recall    = TP / (TP + FN)  = ${fmt(rec, 3)}   of the malignant ones, how many were caught`}</div>
      </div>
      <p className="qm-hint">Top row of dots: really malignant; bottom: really benign. Everything right of the black line is called malignant. Lower the threshold to miss fewer cancers, and see what it costs in false alarms.</p>
    </>}
  </div>
}

export { lossAndGradients }
