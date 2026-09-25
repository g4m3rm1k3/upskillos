// Figures placed between the paragraphs of Lab 08 (08.1–08.6).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Check, Radio, Readout, Bars, MiniPlot, Path, Dots, HLine, VLine, curve, Table, ProbabilityField, ClassDots, r } from '../../kit/fig.jsx'
import { featureMaps, prob, evaluate, initial, step, bce } from './engine.js'
import { classification, split } from '../../kit/datasets.js'
import { sigmoid, random, mean } from '../../kit/math.js'

// ---------- 08.1 ----------
const ONE_D = [[-3, 0], [-2.5, 0], [-2, 0], [-1.5, 0], [-1, 0], [-0.5, 1], [0, 0], [0.5, 1], [1, 1], [1.5, 1], [2, 1], [2.5, 1]]
function fitLogistic1D(pts, steps = 3000, rate = 0.5) { let w = 0, b = 0; for (let k = 0; k < steps; k++) { let gw = 0, gb = 0; pts.forEach(([x, y]) => { const e = sigmoid(w * x + b) - y; gw += e * x; gb += e }); w -= rate * gw / pts.length; b -= rate * gb / pts.length } return { w, b } }
function fitLine1D(pts) { const mx = mean(pts.map(p => p[0])), my = mean(pts.map(p => p[1])); const w = pts.reduce((t, [x, y]) => t + (x - mx) * (y - my), 0) / pts.reduce((t, [x]) => t + (x - mx) ** 2, 0); return { w, b: my - w * mx } }
export function LineVsSigmoid() {
  const [far, setFar] = useState(false), pts = far ? [...ONE_D, [9, 1]] : ONE_D
  const line = fitLine1D(pts), lg = useMemo(() => fitLogistic1D(pts), [far]) // eslint-disable-line react-hooks/exhaustive-deps
  return <div>
    <Controls><Check label="add one far-away positive at x = 9" checked={far} onChange={setFar} /></Controls>
    <MiniPlot x={[-3.5, 9.5]} y={[-0.4, 1.4]} xLabel="x" yLabel="y (0 or 1)" label="Least-squares line versus logistic curve">{({ X, Y }) => <>
      <HLine X={X} Y={Y} y={0.5} x0={-3.5} x1={9.5} color="var(--muted)" />
      <Path X={X} Y={Y} points={[[-3.5, line.b - 3.5 * line.w], [9.5, line.b + 9.5 * line.w]]} stroke="var(--chart-val)" />
      <Path X={X} Y={Y} points={curve(x => sigmoid(lg.w * x + lg.b), -3.5, 9.5)} />
      <Dots X={X} Y={Y} points={pts.map(([x, y]) => [x, y, 4, y ? 'var(--chart-val)' : 'var(--chart-train)'])} />
    </>}</MiniPlot>
    <Readout>Orange line: least squares, crossing 0.5 at x = {r((0.5 - line.b) / line.w, 2)} and predicting {r(line.b + 9.5 * line.w, 2)} at the right edge — outside [0, 1]. Purple: σ(w·x + b), crossing 0.5 at x = {r(-lg.b / lg.w, 2)}, always between 0 and 1. {far ? 'The far point dragged the line’s crossing to the right; the logistic crossing barely moved.' : ''}</Readout>
  </div>
}

// ---------- 08.2 ----------
export function SigmoidExplorer() {
  const [z, setZ] = useState(2), p = sigmoid(z)
  return <div>
    <Controls><Slider label="score z" value={z} min={-6} max={6} step={0.1} onChange={setZ} digits={1} /></Controls>
    <MiniPlot x={[-6, 6]} y={[0, 1]} xLabel="z" yLabel="σ(z)" label={`σ(${z}) = ${r(p, 4)}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(sigmoid, -6, 6)} />
      <Path X={X} Y={Y} points={[[z - 1.5, p - 1.5 * p * (1 - p)], [z + 1.5, p + 1.5 * p * (1 - p)]]} stroke="var(--chart-val)" width={1.5} />
      <Dots X={X} Y={Y} points={[[z, p]]} color="var(--chart-val)" rad={5} />
    </>}</MiniPlot>
    <Table head={['p = σ(z)', 'odds p/(1 − p)', 'log-odds', 'slope σ(1 − σ)']} rows={[[r(p, 4), r(p / (1 - p), 3), r(Math.log(p / (1 - p)), 3), r(p * (1 - p), 4)]]} label="Probability, odds, log-odds and slope" />
    <Readout>The log-odds come back to z exactly: the sigmoid and the logit undo each other. The slope is steepest (0.25) at z = 0.</Readout>
  </div>
}

export function OddsMultiplier() {
  const [w, setW] = useState(0.7), [p0, setP0] = useState(0.5), odds0 = p0 / (1 - p0), odds1 = odds0 * Math.exp(w), p1 = odds1 / (1 + odds1)
  return <div>
    <Controls><Slider label="weight w" value={w} min={-2} max={2} step={0.05} onChange={setW} /><Slider label="starting probability" value={p0} min={0.01} max={0.99} step={0.01} onChange={setP0} /></Controls>
    <Table head={['', 'probability', 'odds']} rows={[['before', r(p0, 3), r(odds0, 3)], ['after +1 unit of the feature', r(p1, 3), r(odds1, 3)]]} label="Effect of one unit of a feature" />
    <Readout>Odds × e^w = × {r(Math.exp(w), 3)} whatever the start. The probability changes by <strong>{r(p1 - p0, 3)}</strong> — most near 0.5, least near 0 or 1.</Readout>
  </div>
}

export function StableSigmoid() {
  const [z, setZ] = useState(-800), naiveExp = Math.exp(-z), stable = z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z))
  return <div>
    <Controls><Slider label="z" value={z} min={-1000} max={1000} step={10} onChange={setZ} digits={0} /></Controls>
    <Table head={['form', 'intermediate', 'result']} rows={[['1 / (1 + e^(−z))', `e^(−z) = ${Number.isFinite(naiveExp) ? naiveExp.toExponential(2) : '∞ (overflow)'}`, r(1 / (1 + naiveExp), 6)], [z >= 0 ? '1 / (1 + e^(−z))' : 'e^z / (1 + e^z)', `largest exponent used: ${z >= 0 ? -z : z}`, stable.toExponential(3)]]} label="Naive versus stable sigmoid" />
    <Readout>{Number.isFinite(naiveExp) ? 'Both forms are fine here.' : 'The naive form computes e^(−z) = ∞ on the way (NumPy warns “overflow”). The stable form only exponentiates non-positive numbers.'}</Readout>
  </div>
}

// ---------- 08.3 ----------
export function LossCurves() {
  const [p, setP] = useState(0.5), [y, setY] = useState('1'), loss = y === '1' ? -Math.log(p) : -Math.log(1 - p)
  return <div>
    <Controls><Slider label="predicted p" value={p} min={0.01} max={0.99} step={0.01} onChange={setP} /><Radio name="lossy" value={y} onChange={setY} options={[['1', 'true label y = 1'], ['0', 'true label y = 0']]} /></Controls>
    <MiniPlot x={[0, 1]} y={[0, 5]} xLabel="predicted p" yLabel="loss" label={`Loss ${r(loss, 3)}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(q => Math.min(5, -Math.log(q)), 0.005, 0.995)} stroke={y === '1' ? 'var(--chart-model)' : 'var(--muted)'} />
      <Path X={X} Y={Y} points={curve(q => Math.min(5, -Math.log(1 - q)), 0.005, 0.995)} stroke={y === '0' ? 'var(--chart-model)' : 'var(--muted)'} />
      <Dots X={X} Y={Y} points={[[p, Math.min(5, loss)]]} color="var(--chart-val)" rad={5} />
    </>}</MiniPlot>
    <Readout>−log(probability given to the truth) = −log({r(y === '1' ? p : 1 - p, 2)}) = <strong>{r(loss, 4)}</strong>. Confidently wrong climbs toward infinity.</Readout>
  </div>
}

export function SquaredVersusCrossEntropy() {
  return <div>
    <MiniPlot x={[-6, 6]} y={[0, 3]} xLabel="score z for a positive example (y = 1)" yLabel="loss" label="Cross-entropy versus squared error through a sigmoid">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(z => Math.min(3, bce(z, 1)), -6, 6)} />
      <Path X={X} Y={Y} points={curve(z => (sigmoid(z) - 1) ** 2, -6, 6)} stroke="var(--chart-val)" />
    </>}</MiniPlot>
    <Readout>Purple: cross-entropy log(1 + e^(−z)), still steep when z is very wrong (large negative). Orange: squared error (σ(z) − 1)² flattens out at 1 — at z = −6 its slope is {r(2 * (sigmoid(-6) - 1) * sigmoid(-6) * (1 - sigmoid(-6)), 4)}, so gradient descent barely moves a badly wrong prediction.</Readout>
  </div>
}

// ---------- 08.4 ----------
export function PerExampleGradient() {
  const [x, setX] = useState(2), [y, setY] = useState('1'), [p, setP] = useState(0.7), e = p - Number(y)
  return <div>
    <Controls><Slider label="x" value={x} min={-3} max={3} step={0.5} onChange={setX} digits={1} /><Radio name="gy" value={y} onChange={setY} options={[['1', 'y = 1'], ['0', 'y = 0']]} /><Slider label="current p" value={p} min={0.01} max={0.99} step={0.01} onChange={setP} /></Controls>
    <Bars items={[{ label: 'p − y', value: e }, { label: '∂ℓ/∂w = (p − y)·x', value: e * x, highlight: true }, { label: '∂ℓ/∂b = p − y', value: e, color: 'var(--chart-val)' }]} min={-3} max={3} digits={3} />
    <Readout>Error {r(e, 2)} times input {x} = <strong>{r(e * x, 3)}</strong>. {e * x < 0 ? 'Negative: raising w increases p toward the label.' : e * x > 0 ? 'Positive: lowering w moves p toward the label.' : 'Zero: this example asks for no change.'}</Readout>
  </div>
}

const OVERLAP = split(classification('overlap', { n: 200, seed: 3 }), 0.7, 3)
export function TrainingLoop() {
  const [rate, setRate] = useState(0.5), [steps, setSteps] = useState(100)
  const hist = useMemo(() => { let m = initial('linear'); const out = [[0, evaluate(m, OVERLAP.train, 'linear').loss, evaluate(m, OVERLAP.validation, 'linear').loss]]; for (let k = 1; k <= 300; k++) { m = step(m, OVERLAP.train, 'linear', rate, 0); out.push([k, evaluate(m, OVERLAP.train, 'linear').loss, evaluate(m, OVERLAP.validation, 'linear').loss]) } return out }, [rate])
  const now = hist[steps]
  return <div>
    <Controls><Slider label="α" value={rate} min={0.05} max={3} step={0.05} onChange={setRate} /><Slider label="steps shown" value={steps} min={0} max={300} step={5} onChange={setSteps} digits={0} /></Controls>
    <MiniPlot x={[0, 300]} y={[0.2, 0.75]} xLabel="gradient step" yLabel="log loss" label="Training and validation log loss">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={hist.slice(0, steps + 1).map(h => [h[0], h[1]])} stroke="var(--chart-train)" />
      <Path X={X} Y={Y} points={hist.slice(0, steps + 1).map(h => [h[0], h[2]])} stroke="var(--chart-val)" />
      <HLine X={X} Y={Y} y={Math.log(2)} x0={0} x1={300} color="var(--muted)" />
    </>}</MiniPlot>
    <Readout>Step {steps}: training log loss {r(now[1], 4)} (blue), validation {r(now[2], 4)} (orange). Both start at log 2 = 0.693 — the loss of predicting 0.5 for everything (grey).</Readout>
  </div>
}

// ---------- 08.5 ----------
export function BoundaryLine() {
  const [w1, setW1] = useState(1), [w2, setW2] = useState(2), [b, setB] = useState(-4), [scale, setScale] = useState(1)
  const m = { w: [w1 * scale, w2 * scale], b: b * scale }
  return <div>
    <Controls><Slider label="w₁" value={w1} min={-3} max={3} step={0.5} onChange={setW1} digits={1} /><Slider label="w₂" value={w2} min={-3} max={3} step={0.5} onChange={setW2} digits={1} /><Slider label="b" value={b} min={-8} max={8} step={0.5} onChange={setB} digits={1} /><Slider label="scale w and b by" value={scale} min={0.2} max={10} step={0.2} onChange={setScale} digits={1} /></Controls>
    <MiniPlot x={[-1, 6]} y={[-1, 4]} xLabel="x₁" yLabel="x₂" label={`Boundary ${w1}x₁ + ${w2}x₂ + ${b} = 0`}>{({ X, Y }) => <>
      <ProbabilityField X={X} Y={Y} x0={-1} x1={6} y0={-1} y1={4} p={(a, c) => prob(m, [a, c])} />
      {w2 !== 0 && <Path X={X} Y={Y} points={[[-1, (-b - w1 * -1) / w2], [6, (-b - w1 * 6) / w2]]} stroke="var(--text)" width={2} />}
      {w2 === 0 && w1 !== 0 && <VLine X={X} Y={Y} x={-b / w1} y0={-1} y1={4} dash="" />}
    </>}</MiniPlot>
    <Readout>Boundary {w1}·x₁ + {w2}·x₂ = {-b}: crosses the x₂ axis at {w2 ? r(-b / w2, 2) : '—'} and the x₁ axis at {w1 ? r(-b / w1, 2) : '—'}. Orange side predicts class 1. Scaling by {scale} keeps the line; it only sharpens how fast p changes across it.</Readout>
  </div>
}

const RING = classification('circles', { n: 200, seed: 5 })
export function RingFeatures() {
  const [map, setMap] = useState('linear'), m = useMemo(() => { let mm = initial(map); for (let k = 0; k < 600; k++) mm = step(mm, RING, map, 0.5, 0); return mm }, [map])
  const ev = evaluate(m, RING, map), fm = featureMaps[map].map
  return <div>
    <Controls><Radio name="ringmap" value={map} onChange={setMap} options={[['linear', 'features x₁, x₂'], ['quadratic', '+ x₁², x₂², x₁x₂']]} /></Controls>
    <MiniPlot x={[-2.6, 2.6]} y={[-2.6, 2.6]} width={330} height={300} xLabel="x₁" yLabel="x₂" label={`Accuracy ${r(ev.accuracy, 3)}`}>{({ X, Y }) => <>
      <ProbabilityField X={X} Y={Y} x0={-2.6} x1={2.6} y0={-2.6} y1={2.6} p={(a, c) => prob(m, fm(a, c))} />
      <ClassDots X={X} Y={Y} points={RING} r={3} />
    </>}</MiniPlot>
    <Readout>After 600 steps: accuracy <strong>{r(ev.accuracy * 100, 1)}%</strong>, log loss {r(ev.loss, 3)}. {map === 'linear' ? 'No straight line separates a ring from its centre.' : 'With squared features the boundary becomes an ellipse around the inner class.'}</Readout>
  </div>
}

const BLOBS = classification('blobs', { n: 120, seed: 2 })
export function SeparableGrowth() {
  const [lambda, setLambda] = useState(0), hist = useMemo(() => { let m = initial('linear'); const out = []; for (let k = 0; k <= 2000; k++) { if (k % 20 === 0) out.push([k, Math.hypot(...m.w), evaluate(m, BLOBS, 'linear').loss]); m = step(m, BLOBS, 'linear', 1, lambda) } return out }, [lambda])
  const last = hist[hist.length - 1]
  return <div>
    <Controls><Slider label="L2 penalty λ" value={lambda} min={0} max={0.05} step={0.001} onChange={setLambda} digits={3} /></Controls>
    <MiniPlot x={[0, 2000]} y={[0, Math.max(6, last[1] * 1.1)]} xLabel="gradient step" yLabel="‖w‖" label="Weight size over training">{({ X, Y }) => <Path X={X} Y={Y} points={hist.map(h => [h[0], h[1]])} />}</MiniPlot>
    <Readout>Separable blobs. After 2,000 steps ‖w‖ = <strong>{r(last[1], 2)}</strong>, training log loss {r(last[2], 4)}. {lambda === 0 ? 'Without a penalty the norm keeps climbing: every step makes correct probabilities a little more extreme.' : 'The penalty stops the growth at a finite size.'}</Readout>
  </div>
}

// ---------- 08.6 ----------
const CASES = (() => { const rng = random(21); return Array.from({ length: 2000 }, () => { const p = rng() ** 2; return { p, y: rng() < p ? 1 : 0 } }) })()
export function CostThreshold() {
  const [cfp, setCfp] = useState(1), [cfn, setCfn] = useState(4), ts = Array.from({ length: 99 }, (_, i) => (i + 1) / 100)
  const cost = t => mean(CASES.map(c => (c.p >= t ? (c.y ? 0 : cfp) : (c.y ? cfn : 0)))), costs = ts.map(t => [t, cost(t)])
  const best = costs.reduce((a, b) => (b[1] < a[1] ? b : a)), theory = cfp / (cfp + cfn)
  return <div>
    <Controls><Slider label="cost of a false positive" value={cfp} min={0.5} max={10} step={0.5} onChange={setCfp} digits={1} /><Slider label="cost of a false negative" value={cfn} min={0.5} max={10} step={0.5} onChange={setCfn} digits={1} /></Controls>
    <MiniPlot x={[0, 1]} y={[0, Math.max(...costs.map(c => c[1])) * 1.1]} xLabel="threshold" yLabel="average cost per case" label={`Lowest cost at threshold ${best[0]}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={costs} />
      <VLine X={X} Y={Y} x={theory} y0={0} y1={Math.max(...costs.map(c => c[1])) * 1.1} />
      <Dots X={X} Y={Y} points={[[best[0], best[1]]]} color="var(--chart-val)" rad={5} />
    </>}</MiniPlot>
    <Readout>2,000 cases with calibrated probabilities. The measured cost is lowest at threshold {r(best[0], 2)}; the formula C_FP/(C_FP + C_FN) = {cfp}/{r(cfp + cfn, 1)} = <strong>{r(theory, 3)}</strong> (dashed).</Readout>
  </div>
}
