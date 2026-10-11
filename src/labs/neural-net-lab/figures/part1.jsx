import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import XYPlot from './XYPlot.jsx'
import Plot from '../../cartpole-lab/figures/Plot.jsx'
import { Slider } from '../../qmaze-lab/figures/ui.jsx'
import Markdown from '../../qmaze-lab/Markdown.jsx'
import { fmt } from '../../python-steps/format.js'
import { makeLine, makeCurve, mse, gradients, fitLine, ACTIVATIONS, initNet, forward, backward, trainStep } from '../engine/part1.js'
import { makeMLP, makeOptimizer, trainSteps, predictOne, lossAndGradients } from '../engine/mlp.js'
import { allCars, carData } from '../engine/cars.js'

const LINE = makeLine(20, 0), CURVE = makeCurve(40, 0)
const pts = ([xs, ys]) => xs.map((x, i) => [x, ys[i]])
// The best straight line, worked out exactly (least squares), to compare with.
function bestLine([xs, ys]) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n
  const w = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0)
  return [w, my - w * mx]
}

// Fit a line by hand: drag w and b, see every miss, and the mean squared error.
export function HandFit({ squares: startSquares = false }) {
  const [w, setW] = useState(0.5), [b, setB] = useState(3)
  const [squares, setSquares] = useState(startSquares)
  const [xs, ys] = LINE
  const [bw, bb] = bestLine(LINE)
  const loss = mse(w, b, xs, ys)
  return <div className="qm-fig">
    <div className="nn-row">
      <XYPlot points={pts(LINE)} curves={[{ f: x => w * x + b }]} misses={xs.map((x, i) => [x, ys[i], w * x + b])} squares={squares} x={[0, 5]} y={[-1, 13]} />
      <div>
        <Slider label="w (slope)" value={w} min={-1} max={4} step={0.01} onChange={setW} />
        <Slider label="b (height)" value={b} min={-3} max={6} step={0.01} onChange={setB} />
        <label><input type="checkbox" checked={squares} onChange={e => setSquares(e.target.checked)} /> show each miss squared</label>
        <p className="mono">ŷ = {fmt(w, 2)}·x + {fmt(b, 2)}</p>
        <p>mean squared error = <b className="nn-big">{fmt(loss, 3)}</b></p>
        <p className="qm-hint">The best any straight line can do here is {fmt(mse(bw, bb, xs, ys), 3)}, at w = {fmt(bw, 3)}, b = {fmt(bb, 3)}. {loss < mse(bw, bb, xs, ys) + 0.01 ? 'You found it.' : 'Can you get there?'}</p>
      </div>
    </div>
  </div>
}

// The error as a landscape over (w, b), and gradient descent walking down it.
export function LossLandscape() {
  const [xs, ys] = LINE
  const [start, setStart] = useState([0, 0]), [rate, setRate] = useState(0.02), [steps, setSteps] = useState(100)
  const run = useMemo(() => fitLine({ steps, rate, start }), [steps, rate, start[0], start[1]])
  const W = [-1, 4], B = [-3, 6], N = 50
  const grid = useMemo(() => {
    const cells = []
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const w = W[0] + (W[1] - W[0]) * (i + 0.5) / N, b = B[1] - (B[1] - B[0]) * (j + 0.5) / N
      cells.push([i, j, Math.log10(mse(w, b, xs, ys) + 1e-9)])
    }
    return cells
  }, [])
  const lo = Math.min(...grid.map(c => c[2])), hi = Math.max(...grid.map(c => c[2]))
  const S = 300, X = w => (w - W[0]) / (W[1] - W[0]) * S, Y = b => (B[1] - b) / (B[1] - B[0]) * S
  const path = run.path.filter(([w, b]) => Number.isFinite(w) && Math.abs(w) < 1e6 && Math.abs(b) < 1e6)
  const end = run.path.at(-1)
  const [gw, gb] = gradients(start[0], start[1], xs, ys)
  const blew = !Number.isFinite(end[0]) || Math.abs(end[0]) > 100
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="learning rate" value={rate} min={0.002} max={0.08} step={0.002} onChange={setRate} /><Slider label="steps" value={steps} min={1} max={500} step={1} onChange={setSteps} /></div>
    <div className="nn-row">
      <svg viewBox={`0 0 ${S + 40} ${S + 30}`} className="qm-plot nn-land" role="img" aria-label="the error over every w and b" onClick={e => {
        const r = e.currentTarget.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * (S + 40) - 30, py = (e.clientY - r.top) / r.height * (S + 30)
        if (px >= 0 && px <= S && py >= 0 && py <= S) setStart([W[0] + px / S * (W[1] - W[0]), B[1] - py / S * (B[1] - B[0])])
      }}>
        <g transform="translate(30,0)">
          {grid.map(([i, j, v]) => { const k = (v - lo) / (hi - lo); return <rect key={`${i}-${j}`} x={i * S / N} y={j * S / N} width={S / N + 0.5} height={S / N + 0.5} fill={`hsl(${30 + 170 * k}, 55%, ${88 - 50 * k}%)`} /> })}
          <polyline points={path.map(([w, b]) => `${X(w)},${Y(b)}`).join(' ')} fill="none" stroke="#2c241b" strokeWidth="1.6" />
          {path.slice(0, 40).map(([w, b], i) => <circle key={i} cx={X(w)} cy={Y(b)} r="2" fill="#2c241b" />)}
          <circle cx={X(start[0])} cy={Y(start[1])} r="5" fill="#a8402f" />
          {!blew && <circle cx={X(end[0])} cy={Y(end[1])} r="5" fill="#1f6f68" />}
          <text x={S / 2} y={S + 24} textAnchor="middle" className="qm-tick">w (slope) →</text>
        </g>
        <text x="4" y="14" className="qm-tick">b ↑</text>
      </svg>
      <div>
        <p>Darker is lower error. Click anywhere to start there (red). Each dot is one step: <span className="mono">w ← w − rate · ∂L/∂w</span>, <span className="mono">b ← b − rate · ∂L/∂b</span>.</p>
        <p className="mono">at the start: ∂L/∂w = {fmt(gw, 3)}, ∂L/∂b = {fmt(gb, 3)}</p>
        {blew ? <p><b>It blew up.</b> The steps are too big: each overshoots the valley further than the last. Lower the learning rate.</p>
          : <p>After {steps} steps: w = <b>{fmt(end[0], 3)}</b>, b = <b>{fmt(end[1], 3)}</b>, error {fmt(run.history.at(-1), 4)}.</p>}
        <Plot series={[{ values: run.history.map(h => Math.min(h, 60)), color: '#1f6f68' }]} window={1} x="step" label="error after each step" height={120} />
        <p className="qm-hint">Notice the path: it drops quickly across the steep direction, then crawls along the valley's floor. The valley is long and narrow because w and b affect the error very differently (x goes up to 5, the bias's "input" is always 1). Part 5 meets optimisers that cope with that.</p>
      </div>
    </div>
  </div>
}

// One input, three neurons: their sums and what each activation does with them.
export function LayerFig() {
  const [x, setX] = useState(2)
  const [neurons, setNeurons] = useState([[1.5, 0], [-0.5, 1], [0.8, -2]])
  const [act, setAct] = useState('relu')
  const set = (k, i, v) => setNeurons(ns => ns.map((n, j) => j === k ? n.map((q, m) => m === i ? v : q) : n))
  const colors = ['#b5650d', '#1f6f68', '#7a3fb0']
  const A = ACTIVATIONS[act]
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="input x" value={x} min={-3} max={3} step={0.05} onChange={setX} />
      <label>activation <select value={act} onChange={e => setAct(e.target.value)}>{Object.entries(ACTIVATIONS).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}</select></label></div>
    <div className="nn-row">
      <XYPlot x={[-3, 3]} y={[-3, 4]} curves={neurons.flatMap(([w, b], k) => [{ f: t => w * t + b, color: colors[k], width: 1, dash: '4 4', opacity: 0.6 }, { f: t => A.f(w * t + b), color: colors[k] }])} marks={neurons.map(([w, b]) => [x, A.f(w * x + b)])} xLabel="x" yLabel="output" />
      <table className="qm-log nn-layer-table"><thead><tr><th>neuron</th><th>weight</th><th>bias</th><th>z = w·x + b</th><th>{A.label}(z)</th></tr></thead>
        <tbody>{neurons.map(([w, b], k) => <tr key={k} style={{ color: colors[k] }}><td>{k}</td>
          <td><input type="number" step="0.1" value={w} onChange={e => set(k, 0, Number(e.target.value))} style={{ width: 56 }} /></td>
          <td><input type="number" step="0.1" value={b} onChange={e => set(k, 1, Number(e.target.value))} style={{ width: 56 }} /></td>
          <td className="mono">{fmt(w, 2)} × {fmt(x, 2)} + {fmt(b, 2)} = {fmt(w * x + b, 3)}</td><td className="mono"><b>{fmt(A.f(w * x + b), 3)}</b></td></tr>)}</tbody></table>
    </div>
    <p className="qm-hint">Dashed: each neuron's sum z, a straight line in x. Solid: after the activation. The circles are this x. The layer's output is the last column: three numbers from one.</p>
  </div>
}

// An activation and its slope.
export function ActivationFig() {
  const [act, setAct] = useState('relu'), [z, setZ] = useState(0.8)
  const A = ACTIVATIONS[act]
  return <div className="qm-fig">
    <div className="qm-fig-controls">{Object.entries(ACTIVATIONS).filter(([k]) => k !== 'none').map(([k, a]) => <button key={k} className={act === k ? 'active' : ''} onClick={() => setAct(k)}>{a.label}</button>)}<Slider label="z" value={z} min={-5} max={5} step={0.05} onChange={setZ} /></div>
    <div className="nn-row">
      <XYPlot x={[-5, 5]} y={[-1.5, 3]} curves={[{ f: A.f }, { f: A.d, color: '#a8402f', width: 1.4, dash: '5 4' }]} marks={[[z, A.f(z)]]} xLabel="z" yLabel="" />
      <div>
        <div className="qm-md"><Markdown>{`$$${A.label === 'ReLU' ? '\\text{ReLU}' : A.label === 'sigmoid' ? '\\sigma' : '\\tanh'}(z) = ${A.formula}$$`}</Markdown></div>
        <p className="mono">{A.label}({fmt(z, 2)}) = <b>{fmt(A.f(z), 4)}</b></p>
        <p className="mono">its slope there = <b>{fmt(A.d(z), 4)}</b> <span className="qm-hint">(dashed red)</span></p>
        <p className="qm-hint">{act === 'relu' ? 'Slope 1 for positive z, 0 for negative: a neuron that is "off" passes no gradient back. Cheap, and it doesn\'t flatten out for big z.' : act === 'sigmoid' ? 'Outputs between 0 and 1, handy for probabilities (Part 2). The slope is at most 0.25 and nearly 0 far from the middle: gradients shrink as they pass through.' : 'Like sigmoid but from −1 to 1, centred on 0. Slope at most 1, again nearly 0 far out.'}</p>
      </div>
    </div>
  </div>
}

// Build a curve out of ReLU hinges by hand: each hidden neuron adds one bend.
export function HingeBuilder() {
  const trained = useMemo(() => { const net = initNet(3, 0); for (let s = 0; s < 3000; s++) trainStep(net, CURVE[0], CURVE[1], 0.05); return net }, [])
  const [units, setUnits] = useState([[1, 1, -0.8], [1, -1, 0.9], [-1, 1, 0]])
  const [b2, setB2] = useState(0.3)
  const [act, setAct] = useState('relu')
  const A = ACTIVATIONS[act]
  const f = x => units.reduce((s, [w1, b1, w2]) => s + w2 * A.f(w1 * x + b1), b2)
  const colors = ['#b5650d', '#1f6f68', '#7a3fb0']
  const set = (k, i, v) => setUnits(us => us.map((u, j) => j === k ? u.map((q, m) => m === i ? v : q) : u))
  const [xs, ys] = CURVE
  const loss = xs.reduce((s, x, i) => s + (f(x) - ys[i]) ** 2, 0) / xs.length
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label>activation <select value={act} onChange={e => setAct(e.target.value)}><option value="relu">ReLU</option><option value="none">none (linear)</option></select></label>
      <button onClick={() => { setUnits(trained.w1.map((w, j) => [w, trained.b1[j], trained.w2[j]])); setB2(trained.b2); setAct('relu') }}>Use weights learned by gradient descent</button>
    </div>
    <div className="nn-row">
      <XYPlot points={pts(CURVE)} x={[-3, 3]} y={[-2, 2]} curves={[...units.map(([w1, b1, w2], k) => ({ f: x => w2 * A.f(w1 * x + b1), color: colors[k], width: 1.2, dash: '4 3' })), { f, color: '#2c241b', width: 2.6 }]} />
      <div>
        {units.map(([w1, b1, w2], k) => <div key={k} className="nn-unit" style={{ borderColor: colors[k] }}>
          <b style={{ color: colors[k] }}>hidden neuron {k}</b>
          <Slider label="w1" value={w1} min={-3} max={3} step={0.05} onChange={v => set(k, 0, v)} />
          <Slider label="b1" value={b1} min={-3} max={3} step={0.05} onChange={v => set(k, 1, v)} />
          <Slider label="w2" value={w2} min={-2} max={2} step={0.05} onChange={v => set(k, 2, v)} />
        </div>)}
        <Slider label="b2" value={b2} min={-2} max={2} step={0.05} onChange={setB2} />
        <p>error on the points: <b>{fmt(loss, 4)}</b></p>
      </div>
    </div>
    <p className="qm-hint">{act === 'relu' ? 'Each dashed line is one neuron: w2 · ReLU(w1·x + b1), flat on one side of x = −b1/w1 and straight on the other, a hinge. The black curve is their sum plus b2. Three hinges make three bends.' : 'With no activation each neuron is a straight line, and a sum of straight lines is a straight line: no setting of these sliders can bend it.'}</p>
  </div>
}

// Backpropagation on one point, every number written out: forward, then backward.
export function BackpropFig() {
  const [k, setK] = useState(0)
  const [phase, setPhase] = useState('forward')
  const net = useMemo(() => initNet(3, 0), [])
  const [xs, ys] = CURVE
  const x = xs[k], y = ys[k]
  const f = forward(net, x), g = backward(net, x, y, f)
  // A finite-difference check on one weight: nudge w1[0] and see the loss change.
  const h = 1e-6, nudged = { ...net, w1: net.w1.map((w, j) => j === 0 ? w + h : w) }
  const numeric = ((forward(nudged, x).yHat - y) ** 2 - (f.yHat - y) ** 2) / h
  const colors = ['#b5650d', '#1f6f68', '#7a3fb0']
  const back = phase === 'backward'
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label>point <select value={k} onChange={e => setK(Number(e.target.value))}>{xs.slice(0, 10).map((p, i) => <option key={i} value={i}>{i}: x = {fmt(p, 3)}, y = {fmt(ys[i], 3)}</option>)}</select></label>
      <button className={!back ? 'active' : ''} onClick={() => setPhase('forward')}>1. Forward</button>
      <button className={back ? 'active' : ''} onClick={() => setPhase('backward')}>2. Backward</button>
    </div>
    <svg viewBox="0 0 560 200" className="qm-plot" role="img" aria-label="the network, one point through it">
      <circle cx="60" cy="100" r="26" fill="#f1eadc" stroke="#8a7a66" /><text x="60" y="96" textAnchor="middle" className="qm-tick">x</text><text x="60" y="110" textAnchor="middle" className="mono" fontSize="11">{fmt(x, 3)}</text>
      {[0, 1, 2].map(j => { const cy = 40 + j * 60; return <g key={j}>
        <line x1="86" y1="100" x2="244" y2={cy} stroke={colors[j]} strokeWidth="2" />
        <text x="150" y={(100 + cy) / 2 - 4} className="mono" fontSize="10" fill={colors[j]}>{back ? `∂w1 = ${fmt(g.w1[j], 3)}` : `w1 = ${fmt(net.w1[j], 3)}`}</text>
        <rect x="244" y={cy - 22} width="92" height="44" rx="8" fill={f.z[j] > 0 ? '#fff7ea' : '#eee'} stroke={colors[j]} />
        <text x="290" y={cy - 6} textAnchor="middle" className="mono" fontSize="10">{back ? `∂z = ${fmt(g.dZ[j], 3)}` : `z = ${fmt(f.z[j], 3)}`}</text>
        <text x="290" y={cy + 10} textAnchor="middle" className="mono" fontSize="10">{back ? `∂h = ${fmt(g.dH[j], 3)}` : `h = ${fmt(f.h[j], 3)}`}</text>
        <line x1="336" y1={cy} x2="454" y2="100" stroke={colors[j]} strokeWidth="2" />
        <text x="372" y={(100 + cy) / 2 - 4} className="mono" fontSize="10" fill={colors[j]}>{back ? `∂w2 = ${fmt(g.w2[j], 3)}` : `w2 = ${fmt(net.w2[j], 3)}`}</text>
      </g> })}
      <circle cx="480" cy="100" r="26" fill="#f1eadc" stroke="#8a7a66" /><text x="480" y="96" textAnchor="middle" className="qm-tick">ŷ</text><text x="480" y="110" textAnchor="middle" className="mono" fontSize="11">{fmt(f.yHat, 3)}</text>
      <text x="480" y="150" textAnchor="middle" className="mono" fontSize="10">{back ? `∂L/∂ŷ = ${fmt(g.b2, 3)}` : `y = ${fmt(y, 3)}`}</text>
      <text x="480" y="166" textAnchor="middle" className="mono" fontSize="10">L = (ŷ − y)² = {fmt((f.yHat - y) ** 2, 4)}</text>
    </svg>
    {back ? <div className="nn-work">{`∂L/∂ŷ  = 2 (ŷ − y) = 2 × (${fmt(f.yHat, 4)} − ${fmt(y, 4)}) = ${fmt(g.b2, 4)}        (also ∂L/∂b2: ŷ = … + b2)
` + [0, 1, 2].map(j => `neuron ${j}:  ∂w2 = ∂L/∂ŷ · h = ${fmt(g.b2, 4)} × ${fmt(f.h[j], 4)} = ${fmt(g.w2[j], 4)}
            ∂h  = ∂L/∂ŷ · w2 = ${fmt(g.b2, 4)} × ${fmt(net.w2[j], 4)} = ${fmt(g.dH[j], 4)}
            ∂z  = ∂h · ReLU′(z) = ${fmt(g.dH[j], 4)} × ${f.z[j] > 0 ? 1 : 0} = ${fmt(g.dZ[j], 4)}${f.z[j] > 0 ? '' : '   (this neuron was off: no gradient gets through)'}
            ∂w1 = ∂z · x = ${fmt(g.dZ[j], 4)} × ${fmt(x, 4)} = ${fmt(g.w1[j], 4)};   ∂b1 = ∂z = ${fmt(g.b1[j], 4)}`).join('\n')}</div>
      : <div className="nn-work">{[0, 1, 2].map(j => `neuron ${j}:  z = w1·x + b1 = ${fmt(net.w1[j], 4)} × ${fmt(x, 4)} + ${fmt(net.b1[j], 4)} = ${fmt(f.z[j], 4)};   h = ReLU(z) = ${fmt(f.h[j], 4)}`).join('\n') + `
ŷ = b2 + Σ w2·h = ${fmt(net.b2, 4)} ${[0, 1, 2].map(j => `+ ${fmt(net.w2[j], 4)} × ${fmt(f.h[j], 4)}`).join(' ')} = ${fmt(f.yHat, 4)}`}</div>}
    {back && <p className="qm-hint">Check without calculus: nudge w1 of neuron 0 by 0.000001 and the loss changes by {fmt(numeric * h, 6)}, a slope of <b>{fmt(numeric, 4)}</b>; backpropagation said <b>{fmt(g.w1[0], 4)}</b>.</p>}
  </div>
}

// Train the hand-written network live on the curve.
export function CurveTrainer({ initialHidden = 8 }) {
  const [hidden, setHidden] = useState(initialHidden), [rate, setRate] = useState(0.05), [seed, setSeed] = useState(0)
  const key = `${hidden}-${seed}`
  const run = useRef(null), [, redraw] = useReducer(n => n + 1, 0)
  if (!run.current || run.current.key !== key) run.current = { key, net: initNet(hidden, seed), history: [] }
  const [playing, setPlaying] = useState(false)
  const steps = n => { const r = run.current; for (let i = 0; i < n; i++) r.history.push(trainStep(r.net, CURVE[0], CURVE[1], rate)); redraw() }
  useEffect(() => { if (!playing) return undefined; const id = setInterval(() => steps(10), 30); return () => clearInterval(id) }, [playing, rate])
  const { net, history } = run.current
  const predict = x => forward(net, x).yHat
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <Slider label="hidden neurons" value={hidden} min={1} max={32} step={1} onChange={setHidden} />
      <Slider label="learning rate" value={rate} min={0.005} max={0.3} step={0.005} onChange={setRate} />
      <label>seed <input type="number" value={seed} onChange={e => setSeed(Number(e.target.value) || 0)} style={{ width: 52 }} /></label>
    </div>
    <div className="qm-buttons"><button onClick={() => steps(1)}>One step</button><button onClick={() => steps(100)}>100 steps</button><button onClick={() => setPlaying(p => !p)}>{playing ? '⏸ Pause' : '▶ Train'}</button><button onClick={() => { run.current = null; setPlaying(false); redraw() }}>↺ New network</button><span className="qm-hint">{history.length} steps · error {history.length ? fmt(history.at(-1), 4) : '—'}</span></div>
    <div className="nn-row">
      <XYPlot points={pts(CURVE)} x={[-3, 3]} y={[-2, 2]} curves={[...net.w1.map((w, j) => ({ f: x => net.w2[j] * Math.max(0, w * x + net.b1[j]), color: '#7a3fb0', width: 1, opacity: 0.35 })), { f: Math.sin, color: '#b5650d', width: 1, dash: '3 3' }, { f: predict, color: '#1f6f68', width: 2.6 }]} />
      <Plot series={[{ values: history.map(h => Math.min(h, 2)), color: '#1f6f68' }]} window={1} x="step" label="error" height={150} />
    </div>
    <p className="qm-hint">Green: the network. Purple: each hidden neuron's hinge. Dashed: the true sin(x) the points came from. The points are off it by up to 0.1, so an error near 0.003 is as good as it gets.</p>
  </div>
}

// Fuel economy from weight and horsepower: train in the browser, then ask about your own car.
export function CarsFig() {
  const data = useMemo(() => carData(0), [])
  const cars = useMemo(() => allCars(), [])
  const [models, setModels] = useState(null), [progress, setProgress] = useState(null)
  const [weight, setWeight] = useState(3000), [hp, setHp] = useState(100)
  // Train both in chunks of 100 steps, so the page stays responsive (about 5 s in all).
  const train = () => {
    const jobs = [['straight line', [{ units: 1 }]], ['network 2 → 16 → 1', [{ units: 16, activation: 'relu' }, { units: 1 }]]]
      .map(([name, layers]) => { const net = makeMLP(2, layers, 0); return { name, net, opt: makeOptimizer(net, { rate: 0.01 }), done: 0 } })
    const tick = () => {
      const job = jobs.find(j => j.done < 3000)
      if (!job) {
        setProgress(null)
        setModels(Object.fromEntries(jobs.map(j => [j.name, { net: j.net, miss: data.Xtest.reduce((s, x, i) => s + Math.abs(predictOne(j.net, x)[0] - data.Ytest[i][0]), 0) / data.Xtest.length }])))
        return
      }
      trainSteps(job.net, job.opt, data.X, data.Y, 100); job.done += 100
      setProgress(`${job.name}: step ${job.done} of 3,000`)
      setTimeout(tick, 0)
    }
    tick()
  }
  const scaled = [(weight - data.stats[0][0]) / data.stats[0][1], (hp - data.stats[1][0]) / data.stats[1][1]]
  const near = cars.filter(c => c.horsepower).map(c => ({ ...c, d: Math.hypot((c.weight - weight) / 850, (c.horsepower - hp) / 38) })).sort((a, b) => a.d - b.d).slice(0, 3)
  return <div className="qm-fig">
    <div className="nn-row">
      <XYPlot x={[1500, 5200]} y={[5, 48]} points={cars.filter(c => c.horsepower).map(c => [c.weight, c.mpg, `hsl(${200 - Math.min(c.horsepower, 230) * 0.8}, 60%, 45%)`])} marks={[[weight, models ? predictOne(models['network 2 → 16 → 1'].net, scaled)[0] : 25, 'your car']]} xLabel="weight (lb)" yLabel="mpg" />
      <div>
        <p className="qm-hint">392 real cars from 1970–82 (UCI Auto MPG). Colour: horsepower, blue low, red high.</p>
        <div className="qm-buttons"><button className="qm-primary" onClick={train} disabled={!!models || !!progress}>Train both models (3,000 steps each)</button>{progress && <span className="qm-hint">{progress}</span>}</div>
        {models && <table className="qm-log qm-left"><tbody>{Object.entries(models).map(([name, m]) => <tr key={name}><td>{name}</td><td>misses by <b>{fmt(m.miss, 2)}</b> mpg on average, on the 78 test cars</td></tr>)}</tbody></table>}
        <h4 className="qm-small-h">Your car</h4>
        <Slider label="weight (lb)" value={weight} min={1600} max={5000} step={10} onChange={setWeight} />
        <Slider label="horsepower" value={hp} min={45} max={230} step={1} onChange={setHp} />
        {models ? Object.entries(models).map(([name, m]) => <p key={name}>{name}: <b>{fmt(predictOne(m.net, scaled)[0], 1)} mpg</b></p>) : <p className="qm-hint">Train first, then ask.</p>}
        <p className="qm-hint">Most similar real cars: {near.map(c => `${c.name} (${c.weight} lb, ${c.horsepower} hp): ${c.mpg} mpg`).join('; ')}.</p>
      </div>
    </div>
  </div>
}

export { lossAndGradients }
