import React, { useMemo, useState } from 'react'
import { FAMILIES, makeData, standardizer, objective, newton, gradientDescent, optimum, gaps, threeClasses, trainSoftmax, probs, crossEntropy, lwrData, lwrFit, lwrLoo, TAUS } from './engine.js'
import { Plot, Path, Contour, Bars } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Caption, Legend, Table } from '../../kit/ui.jsx'
import { fmt, pct } from '../../kit/math.js'

const COLORS = ['var(--chart-train)', 'var(--chart-val)', '#10b981']
const tauLabel = t => Number.isFinite(t) ? String(t) : '∞ (ordinary least squares)'

function NewtonView() {
  const [family, setFamily] = useState('bernoulli'), [std, setStd] = useState(false), [k, setK] = useState(3)
  const data = useMemo(() => makeData(family), [family])
  const sd = useMemo(() => standardizer(data, std), [data, std])
  const obj = useMemo(() => objective(family, data, sd.f), [family, data, sd])
  const best = useMemo(() => optimum(obj), [obj])
  const nPath = useMemo(() => newton(obj, [0, 0], 30), [obj]), gPath = useMemo(() => gradientDescent(obj, [0, 0], 200), [obj])
  const nGap = gaps(obj, nPath, best), gGap = gaps(obj, gPath, best)
  const f0 = obj.nll(best), all = [...nPath.slice(0, 4), ...gPath, best, [0, 0]]
  const pad = (lo, hi) => { const d = (hi - lo) * 0.15 || 1; return [lo - d, hi + d] }
  const [a0, a1] = pad(Math.min(...all.map(t => t[0])), Math.max(...all.map(t => t[0]))), [b0, b1] = pad(Math.min(...all.map(t => t[1])), Math.max(...all.map(t => t[1])))
  const levels = [0.003, 0.01, 0.03, 0.1, 0.3, 1, 3].map(c => f0 + c * Math.max(1, Math.abs(f0)))
  const F = FAMILIES[family], at = (path, i) => path[Math.min(i, path.length - 1)]
  const reach = g => { const i = g.findIndex(v => v < 1e-8); return i < 0 ? `not within ${g.length - 1} steps` : `${i} steps` }
  const ymax = Math.max(...data.map(d => d.y)) * 1.1 + 0.5
  return <>
    <Controls>
      <Choice label="Model (exponential family)" value={family} onChange={setFamily} options={Object.entries(FAMILIES).map(([k2, f]) => [k2, f.name])} />
      <Toggle label="Standardize x before fitting" checked={std} onChange={setStd} />
      <Slider label="Iteration shown" value={k} min={0} max={30} onChange={setK} />
    </Controls>
    <Caption>{`Both methods minimize the same loss — the mean negative log-likelihood a(η) − yη with η = θ₀ + θ₁x and link ${F.link}. Gradient descent follows the slope (with a line search so it never diverges). Newton's method also uses the curvature (the Hessian) and jumps to the minimum of a local quadratic.`}</Caption>
    <Plot x={[a0, a1]} y={[b0, b1]} height={300} xLabel="θ₀ (intercept)" yLabel="θ₁ (slope)" tickFormat={v => v.toFixed(2)} label="Loss contours with both optimization paths">{({ X, Y }) => <>
      {levels.map((l, i) => <Contour key={i} X={X} Y={Y} x0={a0} x1={a1} y0={b0} y1={b1} f={(a, b) => obj.nll([a, b])} level={l} stroke="var(--muted)" width={1} cells={60} />)}
      <Path X={X} Y={Y} points={gPath.slice(0, Math.max(1, k * 4) + 1)} stroke="var(--chart-train)" width={2} />
      <Path X={X} Y={Y} points={nPath.slice(0, k + 1)} stroke="var(--chart-val)" width={2.5} />
      {nPath.slice(0, k + 1).map((t, i) => <circle key={i} cx={X(t[0])} cy={Y(t[1])} r="4" fill="var(--chart-val)" />)}
      <circle cx={X(best[0])} cy={Y(best[1])} r="6" fill="none" stroke="var(--text)" strokeWidth="2" />
    </>}</Plot>
    <Legend items={[['━', `gradient descent (first ${Math.max(1, k * 4)} steps: 4 per Newton step shown)`, 'var(--chart-train)'], ['●', `Newton (first ${k} steps)`, 'var(--chart-val)'], ['○', 'minimum', 'var(--text)'], ['─', 'loss contours', 'var(--muted)']]} />
    <Plot x={[0, 60]} y={[-16, 2]} height={200} xLabel="iteration" yLabel="log₁₀(loss − minimum)" label="Convergence of both methods">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={gGap.slice(0, 61).map((v, i) => [i, Math.log10(v)])} stroke="var(--chart-train)" />
      <Path X={X} Y={Y} points={nGap.slice(0, 31).map((v, i) => [i, Math.log10(v)])} stroke="var(--chart-val)" width={2.5} />
    </>}</Plot>
    <Metrics items={[['Newton reaches 10⁻⁸', reach(nGap)], ['Gradient descent reaches 10⁻⁸', reach(gGap)], ['θ at the minimum', `${fmt(best[0], 3)}, ${fmt(best[1], 3)}`], ['Newton after 2 steps: loss gap', nGap[2].toExponential(1)]]} />
    <Plot x={[0, 10]} y={[family === 'gaussian' ? Math.min(...data.map(d => d.y)) - 0.5 : -0.1, ymax]} height={220} xTicks={6} tickFormat={v => Number(v.toFixed(1)).toString()} xLabel="x" yLabel={family === 'bernoulli' ? 'y (0/1) and P(y = 1)' : family === 'poisson' ? 'count y and mean μ' : 'y and mean μ'} label="Data and fitted mean">{({ X, Y }) => <>
      {data.map((d, i) => <circle key={i} cx={X(d.x)} cy={Y(d.y)} r="3" fill="var(--text)" opacity="0.45" />)}
      {[[gPath, 'var(--chart-train)', Math.max(1, k * 4)], [nPath, 'var(--chart-val)', k]].map(([p, c, i]) => { const t = at(p, i); return <Path key={c} X={X} Y={Y} points={Array.from({ length: 81 }, (_, j) => { const x = j / 8; return [x, F.mean(t[0] + t[1] * sd.f(x))] })} stroke={c} width={2.5} /> })}
    </>}</Plot>
    <Insight title="What to notice">On raw x (0 to 10) the contours are long thin ellipses: gradient descent zig-zags across the valley and is still far from the minimum after 200 steps. Newton reaches machine precision in a handful — and for the Gaussian model in **one** step, because its loss is exactly quadratic. Turn on standardization: gradient descent speeds up dramatically, while Newton’s steps are unchanged. Newton’s method is invariant to rescaling the inputs; gradient descent is not. The price: each Newton step solves a d × d linear system, which is cheap for 2 parameters and impossible for millions.</Insight>
  </>
}

function SoftmaxView() {
  const data = useMemo(() => threeClasses(), []), snaps = useMemo(() => trainSoftmax(data), [data])
  const [step, setStep] = useState(40), [px, setPx] = useState(0), [py, setPy] = useState(0)
  const W = snaps[step], pr = probs(W, px, py)
  const acc = data.filter(d => { const p = probs(W, d.x1, d.x2); return p.indexOf(Math.max(...p)) === d.label }).length / data.length
  const cells = []
  for (let i = 0; i < 44; i++) for (let j = 0; j < 28; j++) { const x = -4.5 + 9 * (i + 0.5) / 44, y = -3.5 + 7.5 * (j + 0.5) / 28, p = probs(W, x, y), m = Math.max(...p); cells.push([x, y, p.indexOf(m), m]) }
  return <>
    <Controls>
      <Slider label="Gradient-descent step" value={step} min={0} max={snaps.length - 1} onChange={setStep} />
      <Slider label="Probe point x₁" value={px} min={-4} max={4} step={0.25} onChange={setPx} />
      <Slider label="Probe point x₂" value={py} min={-3} max={3.5} step={0.25} onChange={setPy} />
    </Controls>
    <Plot x={[-4.5, 4.5]} y={[-3.5, 4]} height={320} xLabel="x₁" yLabel="x₂" label="Softmax regression regions for three classes">{({ X, Y }) => <>
      {cells.map(([x, y, c, m], i) => <rect key={i} x={X(x - 9 / 88)} y={Y(y + 7.5 / 56)} width={X(9 / 44) - X(0) + 0.5} height={Y(0) - Y(7.5 / 28) + 0.5} fill={COLORS[c]} opacity={0.05 + 0.35 * (m - 1 / 3) * 1.5} />)}
      {data.map((d, i) => <circle key={i} cx={X(d.x1)} cy={Y(d.x2)} r="3.2" fill={COLORS[d.label]} stroke="var(--surface, white)" strokeWidth="0.6" />)}
      <circle cx={X(px)} cy={Y(py)} r="7" fill="none" stroke="var(--text)" strokeWidth="2.5" />
    </>}</Plot>
    <Legend items={[['●', 'class 0', COLORS[0]], ['●', 'class 1', COLORS[1]], ['●', 'class 2', COLORS[2]], ['○', 'probe point', 'var(--text)']]} />
    <Table head={['class k', 'score zₖ = wₖ·x + bₖ', 'softmax pₖ = exp(zₖ) / Σ exp(zⱼ)']} rows={W.map((w, c) => [c, fmt(w[0] + w[1] * px + w[2] * py, 3), pct(pr[c])])} caption="Each class has its own weight vector; softmax turns the three scores into probabilities that sum to 1. Adding the same number to every score changes nothing — one weight vector is redundant." />
    <Metrics items={[['Cross-entropy (training)', fmt(crossEntropy(W, data), 3)], ['Accuracy (training)', pct(acc)], ['Step', String(step)]]} />
    <Insight title="What to notice">At step 0 all scores are zero and every class gets probability 1/3. The gradient for class k is (pₖ − 1[y = k])·x: probability pushed toward the true class and away from the others. Boundaries between regions are straight lines, because each is where two linear scores are equal.</Insight>
  </>
}

function LwrView() {
  const data = useMemo(() => lwrData(), [])
  const [ti, setTi] = useState(3), [q, setQ] = useState(5)
  const tau = TAUS[ti], fit = lwrFit(data, q, tau)
  const curve = Array.from({ length: 101 }, (_, i) => { const x = i / 10; return [x, lwrFit(data, x, tau).predict(x)] })
  const loo = useMemo(() => TAUS.map(t => lwrLoo(data, t)), [data])
  const bestI = loo.indexOf(Math.min(...loo))
  const half = Number.isFinite(tau) ? Math.min(2 * tau, 5) : 5
  return <>
    <Controls>
      <Slider label="Bandwidth τ" value={ti} min={0} max={TAUS.length - 1} onChange={setTi} format={i => tauLabel(TAUS[i])} />
      <Slider label="Query point x" value={q} min={0} max={10} step={0.25} onChange={setQ} />
    </Controls>
    <Plot x={[0, 10]} y={[-1.5, 4.5]} height={280} xLabel="x" yLabel="y" label="Locally weighted regression">{({ X, Y }) => <>
      {data.map((d, i) => <circle key={i} cx={X(d.x)} cy={Y(d.y)} r={1.5 + 5 * fit.weights[i]} fill="var(--chart-train)" opacity={0.25 + 0.6 * fit.weights[i]} />)}
      <Path X={X} Y={Y} points={curve} stroke="var(--chart-val)" width={2.5} />
      <Path X={X} Y={Y} points={[[Math.max(0, q - half), fit.predict(Math.max(0, q - half))], [Math.min(10, q + half), fit.predict(Math.min(10, q + half))]]} stroke="var(--text)" width={2} dash="6 4" />
      <circle cx={X(q)} cy={Y(fit.predict(q))} r="6" fill="var(--text)" />
    </>}</Plot>
    <Legend items={[['●', 'data (size = weight for this query)', 'var(--chart-train)'], ['┄', 'the local line fitted for this query', 'var(--text)'], ['━', 'LWR prediction at every x', 'var(--chart-val)']]} />
    <Bars label="Leave-one-out error by bandwidth" format={v => v.toFixed(3)} items={TAUS.map((t, i) => ({ label: `τ = ${Number.isFinite(t) ? t : '∞'}${i === bestI ? ' ◀ best' : ''}`, value: loo[i] }))} />
    <Insight title="What to notice">Every query gets its own weighted least-squares line: nearby points count (weight exp(−(xᵢ − x)²/2τ²)), distant ones barely. Small τ follows noise (low bias, high variance); huge τ weights everything equally and becomes one straight line. The bandwidth is chosen by leave-one-out error, never training error. Because the “model” is the whole dataset, prediction costs a full fit per query — the price of a non-parametric method.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('newton')
  return <>
    <PanelHeading title="One recipe, three models — and a faster optimizer." pill="generalized linear models" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['newton', 'Newton’s method vs gradient descent'], ['softmax', 'Softmax regression (3 classes)'], ['lwr', 'Locally weighted regression']]} /></Controls>
    {view === 'newton' ? <NewtonView /> : view === 'softmax' ? <SoftmaxView /> : <LwrView />}
  </>
}
