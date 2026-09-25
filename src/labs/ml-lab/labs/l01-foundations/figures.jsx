// Figures placed between the paragraphs of Lab 01 (lessons 00a–06). Each shows the one
// computation its paragraph describes, with the paragraph's own numbers.
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Choice, Check, Radio, Readout, Note, Bars, MiniPlot, Path, Dots, VLine, HLine, Label, curve, Table, useStepper, r } from '../../kit/fig.jsx'
import { generateData, splitData, mse, gradients, closedForm, mean, predict } from '../../engine.js'

// ---------- 00a ----------
export function ListVsArray() {
  const [op, setOp] = useState('times')
  const x = [2, 3, 4]
  const list = op === 'times' ? [...x, ...x] : op === 'plus' ? [...x, ...x] : null
  const arr = op === 'times' ? x.map(v => 2 * v) : x.map(v => v + v)
  return <div>
    <Controls><Radio name="listop" value={op} onChange={setOp} options={[['times', '2 * x'], ['plus', 'x + x']]} /></Controls>
    <Table head={['x is a…', 'value of x', op === 'times' ? '2 * x' : 'x + x', 'length']} rows={[
      ['Python list', '[2, 3, 4]', `[${list.join(', ')}]`, list.length],
      ['NumPy array', 'array([2, 3, 4])', `array([${arr.join(', ')}])`, arr.length],
    ]} label="Same expression on a list and an array" />
    <Readout>{op === 'times' ? 'The list is repeated (6 entries); the array has each value doubled (3 entries).' : 'For a list, + joins the two lists end to end; for an array, + adds matching entries.'} Same symbols, different operations.</Readout>
  </div>
}

export function ShapeBoxes() {
  const cell = (x, y, v) => <g key={`${x}${y}`}><rect x={x} y={y} width={34} height={28} rx="4" fill="var(--chart-train)" opacity="0.25" stroke="var(--chart-train)" /><text x={x + 17} y={y + 19} textAnchor="middle" style={{ fontSize: 13, fill: 'var(--text)' }}>{v}</text></g>
  return <div>
    <svg viewBox="0 0 420 130" role="img" aria-label="A vector of shape (3,) drawn as one row of three boxes, and a column of shape (3, 1) as three stacked boxes">
      <text x={10} y={16} style={{ fontSize: 12, fill: 'var(--text)' }}>np.array([2, 3, 4]) — shape (3,)</text>
      {[2, 3, 4].map((v, i) => cell(10 + i * 38, 26, v))}
      <text x={240} y={16} style={{ fontSize: 12, fill: 'var(--text)' }}>np.array([[2], [3], [4]]) — shape (3, 1)</text>
      {[2, 3, 4].map((v, i) => cell(240, 26 + i * 32, v))}
    </svg>
    <Readout>Left: one axis with 3 entries. Right: 3 rows and 1 column — two axes. They hold the same numbers but behave differently in arithmetic.</Readout>
  </div>
}

export function WeightedSum() {
  const [mb, setMb] = useState(2), [files, setFiles] = useState(3), [w1, setW1] = useState(4), [w2, setW2] = useState(5)
  const c1 = mb * w1, c2 = files * w2
  return <div>
    <Controls>
      <Slider label="size (MB)" value={mb} min={0} max={10} step={1} onChange={setMb} digits={0} />
      <Slider label="files" value={files} min={0} max={10} step={1} onChange={setFiles} digits={0} />
      <Slider label="seconds per MB" value={w1} min={0} max={10} step={0.5} onChange={setW1} digits={1} />
      <Slider label="seconds per file" value={w2} min={0} max={10} step={0.5} onChange={setW2} digits={1} />
    </Controls>
    <Bars items={[{ label: 'size × weight', value: c1 }, { label: 'files × weight', value: c2, color: 'var(--chart-val)' }, { label: 'sum = prediction', value: c1 + c2, highlight: true }]} digits={1} />
    <Readout>inputs = [{mb}, {files}], weights = [{w1}, {w2}] → {mb}×{w1} + {files}×{w2} = {r(c1, 1)} + {r(c2, 1)} = <strong>{r(c1 + c2, 1)} seconds</strong>.</Readout>
  </div>
}

export function ShapeTrap() {
  const [bad, setBad] = useState(true)
  const pred = [2, 4, 6], y = [1, 5, 6]
  const grid = pred.map(p => y.map(t => p - t))
  return <div>
    <Controls><Check label="predictions stored as a column, shape (3, 1)" checked={bad} onChange={setBad} /></Controls>
    {bad
      ? <Table head={['pred (3,1) − y (3,)', 'y=1', 'y=5', 'y=6']} rows={grid.map((row, i) => [`pred=${pred[i]}`, ...row])} label="Broadcast result, shape (3, 3)" />
      : <Table head={['pred', 'y', 'pred − y']} rows={pred.map((p, i) => [p, y[i], p - y[i]])} label="Elementwise result, shape (3,)" />}
    <Readout>{bad ? `Result shape (3, 3): every prediction minus every target. The mean of its squares is ${r(mean(grid.flat().map(v => v * v)), 3)} — a wrong MSE, with no error message.` : `Result shape (3,): errors [${pred.map((p, i) => p - y[i]).join(', ')}], MSE = ${r(mean(pred.map((p, i) => (p - y[i]) ** 2)), 3)}.`}</Readout>
  </div>
}

// ---------- 00b ----------
export function SecantToTangent() {
  const [h, setH] = useState(1), t = 2, f = x => x * x, slope = (f(t + h) - f(t)) / h
  return <div>
    <Controls><Slider label="h" value={h} min={0.01} max={1.5} step={0.01} onChange={setH} /></Controls>
    <MiniPlot x={[0, 4]} y={[-1, 12]} xLabel="t" yLabel="f(t) = t²" label={`Secant slope ${r(slope)} between t = 2 and t = ${r(t + h)}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(f, 0, 4)} />
      <Path X={X} Y={Y} points={[[0, f(t) - slope * t], [4, f(t) + slope * (4 - t)]]} stroke="var(--chart-val)" width={2} />
      <Path X={X} Y={Y} points={[[0, 4 - 8], [4, 4 + 8]]} stroke="var(--text)" width={1} dash="4 3" />
      <Dots X={X} Y={Y} points={[[t, f(t)], [t + h, f(t + h)]]} color="var(--chart-val)" rad={4.5} />
    </>}</MiniPlot>
    <Readout>average slope = (f(2 + h) − f(2)) / h = ({r(f(t + h))} − 4) / {r(h)} = <strong>{r(slope)}</strong> = 4 + h. As h shrinks the orange secant turns into the dashed tangent, slope 4.</Readout>
  </div>
}

export function ChainTracer() {
  const [t, setT] = useState(1), e = 3 * t - 1, L = e * e
  return <div>
    <Controls><Slider label="t" value={t} min={-1} max={3} step={0.1} onChange={setT} digits={1} /></Controls>
    <Table head={['quantity', 'value', 'local rate']} rows={[['e = 3t − 1', r(e), 'de/dt = 3'], ['L = e²', r(L), `dL/de = 2e = ${r(2 * e)}`], ['dL/dt', '', `2e × 3 = ${r(6 * e)}`]]} label="Chain rule values" />
    <Readout>Check with a small step: [L(t + 0.001) − L(t − 0.001)] / 0.002 = {r((((3 * (t + 0.001) - 1) ** 2) - ((3 * (t - 0.001) - 1) ** 2)) / 0.002)} — matches 6e = {r(6 * e)}.</Readout>
  </div>
}

export function PartialSlices() {
  const [w, setW] = useState(1), [b, setB] = useState(0), x = 2, y = 5
  const L = (ww, bb) => (ww * x + bb - y) ** 2, e = w * x + b - y
  return <div>
    <Controls><Slider label="w" value={w} min={-1} max={4} step={0.1} onChange={setW} digits={1} /><Slider label="b" value={b} min={-3} max={4} step={0.1} onChange={setB} digits={1} /></Controls>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <div style={{ flex: '1 1 220px' }}><MiniPlot width={300} x={[-1, 4]} y={[0, 40]} xLabel="w (b held fixed)" yLabel="L" label="L as w varies">{({ X, Y }) => <><Path X={X} Y={Y} points={curve(v => L(v, b), -1, 4)} /><Dots X={X} Y={Y} points={[[w, L(w, b)]]} color="var(--chart-val)" rad={5} /></>}</MiniPlot></div>
      <div style={{ flex: '1 1 220px' }}><MiniPlot width={300} x={[-3, 4]} y={[0, 40]} xLabel="b (w held fixed)" yLabel="L" label="L as b varies">{({ X, Y }) => <><Path X={X} Y={Y} points={curve(v => L(w, v), -3, 4)} /><Dots X={X} Y={Y} points={[[b, L(w, b)]]} color="var(--chart-val)" rad={5} /></>}</MiniPlot></div>
    </div>
    <Readout>L(w, b) = (2w + b − 5)² = {r(L(w, b))}. Slope along w: ∂L/∂w = 2e·x = <strong>{r(2 * e * x)}</strong>. Slope along b: ∂L/∂b = 2e = <strong>{r(2 * e)}</strong>. Gradient = [{r(2 * e * x)}, {r(2 * e)}].</Readout>
  </div>
}

// ---------- 01 ----------
export function LineClaim() {
  const [w, setW] = useState(2), [b, setB] = useState(1)
  return <div>
    <Controls><Slider label="w" value={w} min={-1} max={4} step={0.1} onChange={setW} digits={1} /><Slider label="b" value={b} min={-2} max={4} step={0.1} onChange={setB} digits={1} /></Controls>
    <MiniPlot x={[0, 4]} y={[-2, 14]} xLabel="size x" yLabel="time (s)" label={`Line ŷ = ${r(w)}x + ${r(b)}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={[[0, b], [4, b + 4 * w]]} />
      <Dots X={X} Y={Y} points={[[2, 5], [3, 7]]} color="var(--chart-val)" rad={5} />
      <Dots X={X} Y={Y} points={[[0, b]]} color="var(--text)" rad={3} />
    </>}</MiniPlot>
    <Readout>ŷ(2) = {r(w)}×2 + {r(b)} = <strong>{r(w * 2 + b)}</strong>; ŷ(3) = <strong>{r(w * 3 + b)}</strong>. The orange points are the claim’s examples (5 s and 7 s). b is where the line crosses x = 0; w is how much ŷ rises per unit of x.</Readout>
  </div>
}

const DATA = { linear: generateData(), curved: generateData({ shape: 'curved' }) }
export function SplitScatter({ shape = 'linear', fit = true }) {
  const [seed, setSeed] = useState(42)
  const { train, validation } = useMemo(() => splitData(DATA[shape], seed), [seed, shape])
  const m = closedForm(train), mt = mean(train.map(p => p.y))
  return <div>
    <Controls><button onClick={() => setSeed(s => s + 1)}>Reshuffle the split</button></Controls>
    <MiniPlot x={[-3, 3]} y={shape === 'curved' ? [-3, 10] : [-6, 7]} xLabel="x" yLabel="y" label="Training and validation points with the fitted line">{({ X, Y }) => <>
      <Dots X={X} Y={Y} points={train.map(p => [p.x, p.y])} />
      {validation.map((p, i) => <path key={i} d={`M ${X(p.x)} ${Y(p.y) - 5} l 5 5 l -5 5 l -5 -5 Z`} fill="var(--chart-val)" />)}
      {fit && <Path X={X} Y={Y} points={[[-3, m.b - 3 * m.w], [3, m.b + 3 * m.w]]} />}
      <HLine X={X} Y={Y} y={mt} x0={-3} x1={3} color="var(--muted)" />
    </>}</MiniPlot>
    <Readout>{train.length} training points (circles), {validation.length} validation (diamonds). Best line on training: ŷ = {r(m.w, 2)}x + {r(m.b, 2)}. Validation MSE: line {r(mse(validation, m.w, m.b), 2)}, mean baseline (grey, predicts {r(mt, 2)}) {r(mse(validation, 0, mt), 2)}.{shape === 'curved' ? ' The line misses the curve in the same way everywhere: underfitting.' : ''}</Readout>
  </div>
}

// ---------- 02 ----------
export function Residuals() {
  const pts = [[1, 1], [2, 6], [3, 4], [4, 7]]
  const [w, setW] = useState(1.5), [b, setB] = useState(0.5)
  const e = pts.map(([x, y]) => w * x + b - y)
  return <div>
    <Controls><Slider label="w" value={w} min={0} max={3} step={0.1} onChange={setW} digits={1} /><Slider label="b" value={b} min={-2} max={3} step={0.1} onChange={setB} digits={1} /></Controls>
    <MiniPlot x={[0, 5]} y={[-1, 10]} xLabel="x" yLabel="y" label="Residuals as vertical segments">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={[[0, b], [5, b + 5 * w]]} />
      {pts.map(([x, y], i) => <line key={i} x1={X(x)} x2={X(x)} y1={Y(y)} y2={Y(w * x + b)} stroke="#ef4444" strokeWidth="2" />)}
      <Dots X={X} Y={Y} points={pts} color="var(--chart-train)" rad={4.5} />
    </>}</MiniPlot>
    <Table head={['x', 'y', 'ŷ', 'e = ŷ − y', 'e²']} rows={pts.map(([x, y], i) => [x, y, r(w * x + b, 2), r(e[i], 2), r(e[i] ** 2, 2)])} label="Errors and squared errors" />
    <Readout>MSE = ({e.map(v => r(v * v, 2)).join(' + ')}) / 4 = <strong>{r(mean(e.map(v => v * v)), 3)}</strong>. Red segments are the errors — vertical, because we predict y from x.</Readout>
  </div>
}

export function OutlierPull() {
  const [out, setOut] = useState(10), errs = [1, -1, 0.5, out]
  return <div>
    <Controls><Slider label="error of the last point" value={out} min={0} max={12} step={0.5} onChange={setOut} digits={1} /></Controls>
    <Bars items={errs.map((e, i) => ({ label: `e=${e}`, value: e * e, highlight: i === 3 }))} digits={2} label="Squared error contributions" />
    <Readout>squared contributions sum to {r(errs.reduce((t, e) => t + e * e, 0), 2)}; the last point supplies {r(100 * out * out / errs.reduce((t, e) => t + e * e, 0), 0)}% of it. An error of 10 counts 100 times as much as an error of 1.</Readout>
  </div>
}

// ---------- 03 ----------
export function LossTangent() {
  const [w, setW] = useState(1), x = 2, y = 5, J = v => (v * x - y) ** 2, g = 2 * (w * x - y) * x
  return <div>
    <Controls><Slider label="w" value={w} min={0} max={4} step={0.05} onChange={setW} /></Controls>
    <MiniPlot x={[0, 4]} y={[0, 30]} xLabel="w (b = 0)" yLabel="loss (2w − 5)²" label={`Loss ${r(J(w))} with slope ${r(g)} at w = ${r(w)}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(J, 0, 4)} />
      <Path X={X} Y={Y} points={[[w - 0.8, J(w) - 0.8 * g], [w + 0.8, J(w) + 0.8 * g]]} stroke="var(--chart-val)" width={2} />
      <Dots X={X} Y={Y} points={[[w, J(w)]]} color="var(--chart-val)" rad={5} />
    </>}</MiniPlot>
    <Readout>e = 2·{r(w, 2)} − 5 = {r(w * x - y)}; ∂J/∂w = 2e·x = <strong>{r(g)}</strong>. {g < 0 ? 'Negative: increasing w lowers the loss.' : g > 0 ? 'Positive: decreasing w lowers the loss.' : 'Zero: the bottom, w = 2.5.'}</Readout>
  </div>
}

export function GradientTable() {
  const pts = [[1, 3], [2, 5], [3, 6]], [w, setW] = useState(1), [b, setB] = useState(0)
  const e = pts.map(([x, y]) => w * x + b - y), gw = 2 * mean(e.map((v, i) => v * pts[i][0])), gb = 2 * mean(e)
  return <div>
    <Controls><Slider label="w" value={w} min={0} max={3} step={0.1} onChange={setW} digits={1} /><Slider label="b" value={b} min={-2} max={3} step={0.1} onChange={setB} digits={1} /></Controls>
    <Table head={['x', 'y', 'e = wx + b − y', '2e·x', '2e']} rows={pts.map(([x, y], i) => [x, y, r(e[i], 2), r(2 * e[i] * x, 2), r(2 * e[i], 2)])} label="Per-observation gradient contributions" />
    <Readout>average of 2e·x = ∂J/∂w = <strong>{r(gw)}</strong>; average of 2e = ∂J/∂b = <strong>{r(gb)}</strong>. Both use the same (w, b) — compute them before changing either.</Readout>
  </div>
}

export function FiniteDiff() {
  const [p, setP] = useState(-5), eps = 10 ** p, pts = [{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 6 }], w = 1, b = 0
  const analytic = gradients(pts, w, b).w, numeric = (mse(pts, w + eps, b) - mse(pts, w - eps, b)) / (2 * eps)
  const rel = Math.abs(analytic - numeric) / Math.max(1, Math.abs(analytic))
  return <div>
    <Controls><Slider label="ε = 10^" value={p} min={-14} max={-1} step={1} onChange={setP} digits={0} /></Controls>
    <Table head={['', '∂J/∂w']} rows={[['formula (2/n)Σeᵢxᵢ', analytic.toPrecision(10)], [`centered difference, ε = ${eps}`, numeric.toPrecision(10)], ['relative error', rel.toExponential(2)]]} label="Gradient check" />
    <Readout>{rel < 1e-5 ? 'Pass: they agree.' : 'Too far apart.'} Very small ε (below about 1e-10) makes the error grow again: subtracting two nearly equal losses loses digits.</Readout>
  </div>
}

// ---------- 04 ----------
export function OneUpdate() {
  const [alpha, setAlpha] = useState(0.1), x = 2, y = 5, gw = -12, gb = -6
  const w1 = 1 - alpha * gw, b1 = 0 - alpha * gb, pred = w1 * x + b1
  return <div>
    <Controls><Slider label="α" value={alpha} min={0} max={0.3} step={0.01} onChange={setAlpha} /></Controls>
    <MiniPlot x={[0, 3]} y={[-1, 9]} xLabel="x" yLabel="y" label="Line before and after one update">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={[[0, 0], [3, 3]]} stroke="var(--muted)" dash="4 3" />
      <Path X={X} Y={Y} points={[[0, b1], [3, b1 + 3 * w1]]} />
      <Dots X={X} Y={Y} points={[[x, y]]} color="var(--chart-val)" rad={5} />
    </>}</MiniPlot>
    <Readout>w: 1 − {r(alpha)}×(−12) = <strong>{r(w1)}</strong>; b: 0 − {r(alpha)}×(−6) = <strong>{r(b1)}</strong>. New prediction at x = 2: {r(pred)} (target 5), loss {r((pred - y) ** 2)}. {alpha > 0.1 ? 'Past 0.1 it overshoots the target.' : ''}</Readout>
  </div>
}

export function ValleySteps() {
  const [alpha, setAlpha] = useState(0.1), [scale, setScale] = useState(1)
  const pts = [1, 2, 3].map(x => ({ x: x * scale, y: 2 * x + 1 })), b = 1
  const J = w => mse(pts, w, b), mx2 = mean(pts.map(p => p.x ** 2)), limit = 1 / mx2
  const path = [0.2 / scale]; for (let k = 0; k < 8; k++) { const w = path[path.length - 1]; path.push(w - alpha * gradients(pts, w, b).w) }
  const wStar = 2 / scale, lo = wStar - 2.5 / scale, hi = wStar + 2.5 / scale, top = J(lo) * 1.1
  return <div>
    <Controls><Slider label="α" value={alpha} min={0.01} max={0.3} step={0.01} onChange={setAlpha} /><Slider label="scale of x" value={scale} min={0.5} max={3} step={0.5} onChange={setScale} digits={1} /></Controls>
    <MiniPlot x={[lo, hi]} y={[0, top]} xLabel="w" yLabel="J(w)" label="Gradient descent steps on the loss valley">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(J, lo, hi)} />
      <Path X={X} Y={Y} points={path.map(w => [w, Math.min(J(w), top * 2)])} stroke="var(--chart-val)" width={1.5} />
      <Dots X={X} Y={Y} points={path.map((w, i) => [w, Math.min(J(w), top * 2), i === 0 ? 5 : 3.5])} color="var(--chart-val)" />
    </>}</MiniPlot>
    <Readout>mean(x²) = {r(mx2, 2)}; steps stay stable while α &lt; 1/mean(x²) = <strong>{r(limit, 3)}</strong>. With α = {r(alpha, 2)}: {alpha < limit / 2 ? 'smooth steps toward the bottom.' : alpha < limit ? 'the steps zig-zag across the valley but still settle.' : 'each step overshoots further — divergence.'} Scaling x by 2 makes the safe α four times smaller.</Readout>
  </div>
}

// ---------- 05 ----------
export function BaselineBars() {
  const [model, setModel] = useState(4), base = 3
  return <div>
    <Controls><Slider label="model validation MSE" value={model} min={0.5} max={6} step={0.5} onChange={setModel} digits={1} /></Controls>
    <Bars items={[{ label: 'mean baseline', value: base, color: 'var(--muted)' }, { label: 'your model', value: model, highlight: true }]} digits={2} />
    <Readout>{model < base ? `The model beats the baseline by ${r(base - model, 2)}.` : `The model is worse than always predicting the training mean, by ${r(model - base, 2)}.`} Lower is better.</Readout>
  </div>
}

export function SplitTimeline() {
  const [kind, setKind] = useState('random'), n = 20
  const isVal = i => kind === 'random' ? [2, 5, 11, 14].includes(i) : i >= 16
  return <div>
    <Controls><Radio name="splitkind" value={kind} onChange={setKind} options={[['random', 'random split'], ['time', 'split by time']]} /></Controls>
    <svg viewBox="0 0 460 60" role="img" aria-label={`${kind} split of 20 observations ordered in time`}>
      {Array.from({ length: n }, (_, i) => <rect key={i} x={10 + i * 22} y={10} width={18} height={24} rx="3" fill={isVal(i) ? 'var(--chart-val)' : 'var(--chart-train)'} opacity="0.8" />)}
      <text x={10} y={52} style={{ fontSize: 11, fill: 'var(--text)' }}>older →→→ newer</text>
    </svg>
    <Readout>{kind === 'random' ? 'Validation days (orange) sit between training days: the model has seen the future of each one. Fine for exchangeable data; optimistic for forecasting.' : 'Validation is the last 4 periods: the model is tested on a future it has not seen, as it will be in use.'}</Readout>
  </div>
}

// ---------- 06 ----------
export function OverheadPerItem() {
  const [n, setN] = useState(10), [w, setW] = useState(0.4), [b, setB] = useState(2)
  return <div>
    <Controls><Slider label="items" value={n} min={0} max={40} step={1} onChange={setN} digits={0} /><Slider label="w (s/item)" value={w} min={0} max={1} step={0.05} onChange={setW} /><Slider label="b (s)" value={b} min={0} max={5} step={0.5} onChange={setB} digits={1} /></Controls>
    <Bars items={[{ label: 'overhead b', value: b, color: 'var(--muted)' }, { label: 'items × w', value: n * w }, { label: 'predicted time', value: b + n * w, highlight: true }]} digits={2} />
    <Readout>{r(b, 2)} + {n}×{r(w, 2)} = <strong>{r(b + n * w, 2)} seconds</strong>.</Readout>
  </div>
}

export function ClosedFormSteps() {
  const pts = [{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 6 }, { x: 4, y: 9 }]
  const mx = mean(pts.map(p => p.x)), my = mean(pts.map(p => p.y)), sxy = pts.reduce((t, p) => t + (p.x - mx) * (p.y - my), 0), sxx = pts.reduce((t, p) => t + (p.x - mx) ** 2, 0)
  const [k, controls] = useStepper(3)
  return <div>
    <Controls>{controls}</Controls>
    <Table head={['x', 'y', 'x − x̄', 'y − ȳ', '(x − x̄)(y − ȳ)', '(x − x̄)²']} rows={pts.map(p => [p.x, p.y, k >= 1 ? r(p.x - mx, 2) : '?', k >= 1 ? r(p.y - my, 2) : '?', k >= 2 ? r((p.x - mx) * (p.y - my), 2) : '?', k >= 2 ? r((p.x - mx) ** 2, 2) : '?'])} label="Closed-form least squares" />
    <Readout>{k === 0 && `Step 1 computes the means: x̄ = ${mx}, ȳ = ${my}.`}{k === 1 && `x̄ = ${mx}, ȳ = ${my}. Next: products and squares of the deviations.`}{k === 2 && `Σ(x − x̄)(y − ȳ) = ${r(sxy, 2)}, Σ(x − x̄)² = ${r(sxx, 2)}.`}{k === 3 && <>w = {r(sxy, 2)} / {r(sxx, 2)} = <strong>{r(sxy / sxx, 3)}</strong>; b = ȳ − w·x̄ = {my} − {r(sxy / sxx, 3)}×{mx} = <strong>{r(my - (sxy / sxx) * mx, 3)}</strong>.</>}</Readout>
  </div>
}
