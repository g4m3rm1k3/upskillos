import React, { useMemo, useState, useEffect } from 'react'
import { truth, makeData, fit, predict, mse, validationCurve, biasVariance, learningCurve } from './engine.js'
import { Plot, Path, Bars } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Caption, Insight, Legend } from '../../kit/ui.jsx'
import { fmt, linspace, argmin } from '../../kit/math.js'

const LAMBDAS = [0, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 0.03, 0.1, 0.3, 1]
const lamLabel = l => l === 0 ? '0 (none)' : l >= 0.01 ? String(l) : l.toExponential(0)

// Opens the view each lesson's experiment uses; the learner can still switch.
const VIEW_FOR_LESSON = { 'l07-poly': 'fit', 'l07-fit': 'curves', 'l07-bias-variance': 'curves', 'l07-ridge': 'fit', 'l07-lasso': 'fit', 'l07-learning': 'learning' }

export default function Playground({ lesson }) {
  const [mode, setMode] = useState('fit')
  useEffect(() => { const view = VIEW_FOR_LESSON[lesson?.id]; if (view) setMode(view) }, [lesson?.id])
  const [degree, setDegree] = useState(9), [li, setLi] = useState(0), [penalty, setPenalty] = useState('l2')
  const [n, setN] = useState(20), [noise, setNoise] = useState(0.25), [seed, setSeed] = useState(1)
  const lambda = LAMBDAS[li]
  const train = useMemo(() => makeData(n, noise, seed), [n, noise, seed])
  const val = useMemo(() => makeData(400, noise, seed + 1000), [noise, seed])
  const model = useMemo(() => fit(train, degree, lambda, penalty), [train, degree, lambda, penalty])
  const curve = useMemo(() => mode === 'curves' ? validationCurve({ n, noise, seed, lambda, penalty }) : null, [mode, n, noise, seed, lambda, penalty])
  const bv = useMemo(() => mode === 'curves' ? biasVariance({ n, noise, degree, lambda, penalty, seed }) : null, [mode, n, noise, degree, lambda, penalty, seed])
  const lc = useMemo(() => mode === 'learning' ? learningCurve({ degree, lambda, penalty, noise, seed }) : null, [mode, degree, lambda, penalty, noise, seed])
  const grid = linspace(-1, 1, 200)
  const logY = v => Math.log10(Math.max(v, 1e-4))
  return <>
    <PanelHeading title={{ fit: 'Flexible enough — but not too flexible.', curves: 'Where does the error come from?', learning: 'More data, or a different model?' }[mode]} pill={`degree ${degree} · λ ${lamLabel(lambda)}`} />
    <Controls>
      <Choice label="View" value={mode} onChange={setMode} options={[['fit', 'Fit one model'], ['curves', 'Validation curve & bias–variance'], ['learning', 'Learning curve']]} />
      <Choice label="Penalty" value={penalty} onChange={setPenalty} options={[['l2', 'Ridge (L2): λ·Σw²'], ['l1', 'Lasso (L1): λ·Σ|w|']]} />
      <Slider label="Polynomial degree" value={degree} min={0} max={15} onChange={setDegree} />
      <Slider label="Regularization strength λ" value={li} min={0} max={LAMBDAS.length - 1} onChange={setLi} format={i => lamLabel(LAMBDAS[i])} />
      {mode !== 'learning' && <Slider label="Training points n" value={n} min={8} max={200} onChange={setN} />}
      <Slider label="Noise σ" value={noise} min={0.05} max={0.6} step={0.05} onChange={setNoise} format={v => v.toFixed(2)} />
      <label>Seed<input type="number" min="0" max="99999" value={seed} onChange={e => e.target.value !== '' && setSeed(Math.max(0, Math.min(99999, Math.trunc(+e.target.value))))} /></label>
    </Controls>
    {mode === 'fit' && <>
      <Legend items={[['●', 'training points', 'var(--chart-train)'], ['━', 'fitted model', 'var(--chart-model)'], ['┄', 'true function (unknown in practice)', 'var(--muted)']]} />
      <Plot x={[-1, 1]} y={[-2.2, 2.2]} xLabel="x" yLabel="y" label="Training data, fitted polynomial and the true curve">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={grid.map(x => [x, truth(x)])} stroke="var(--muted)" width={2} dash="6 5" />
        <Path X={X} Y={Y} points={grid.map(x => [x, predict(model, x)])} />
        {train.map((d, i) => <circle key={i} cx={X(d.x)} cy={Y(d.y)} r="3.5" fill="var(--chart-train)" />)}
      </>}</Plot>
      <Metrics items={[['Train MSE', fmt(mse(model, train), 4)], ['Validation MSE (400 fresh points)', fmt(mse(model, val), 4)], ['Noise floor σ²', fmt(noise * noise, 4)], ['Nonzero weights', `${model.w.filter(w => Math.abs(w) > 1e-8).length} / ${degree}`]]} />
      {degree > 0 && <Bars label="Fitted weights on polynomial features" format={v => fmt(v, 3)} items={model.w.map((w, j) => ({ label: `degree-${j + 1} term`, value: w }))} />}
      <Caption>Features are Legendre polynomials — the same space of curves as x, x², …, x^d but numerically stable. The intercept is never penalized. With lasso, watch weights become **exactly** zero; ridge only shrinks them.</Caption>
    </>}
    {mode === 'curves' && curve && bv && <>
      <Legend items={[['━', 'training MSE', 'var(--chart-train)'], ['━', 'validation MSE', 'var(--chart-val)'], ['┄', 'noise floor σ²', 'var(--muted)']]} />
      <Plot x={[0, 15]} y={[logY(Math.min(...curve.map(c => c.train), noise * noise) * 0.5), logY(Math.max(...curve.map(c => c.val)) * 1.5)]} xTicks={16} xLabel="polynomial degree" yLabel="MSE (log scale)" label="Validation curve" xFormat={v => String(Math.round(v))} yFormat={v => (10 ** v).toPrecision(2)}>{({ X, Y }) => <>
        <Path X={X} Y={Y} points={[[0, logY(noise * noise)], [15, logY(noise * noise)]]} stroke="var(--muted)" width={1} dash="4 3" />
        <Path X={X} Y={Y} points={curve.map(c => [c.degree, logY(c.train)])} stroke="var(--chart-train)" />
        <Path X={X} Y={Y} points={curve.map(c => [c.degree, logY(c.val)])} stroke="var(--chart-val)" />
        <circle cx={X(argmin(curve.map(c => c.val)))} cy={Y(logY(Math.min(...curve.map(c => c.val))))} r="5" fill="var(--chart-val)" />
      </>}</Plot>
      <Caption>{`Lowest validation error at degree ${argmin(curve.map(c => c.val))}. Training error only falls as the degree rises; validation error falls, then rises once the model starts fitting noise.`}</Caption>
      <Plot x={[-1, 1]} y={[-2.2, 2.2]} height={260} xLabel="x" yLabel="y" label="Forty fits on forty different training sets">{({ X, Y }) => <>
        {bv.preds.map((p, r) => <Path key={r} X={X} Y={Y} points={bv.grid.map((x, i) => [x, p[i]])} stroke="var(--chart-train)" width={1} opacity={0.25} />)}
        <Path X={X} Y={Y} points={bv.grid.map((x, i) => [x, bv.avg[i]])} stroke="var(--chart-model)" width={3} />
        <Path X={X} Y={Y} points={bv.grid.map(x => [x, truth(x)])} stroke="var(--muted)" width={2} dash="6 5" />
      </>}</Plot>
      <Metrics items={[['Bias²', fmt(bv.bias2, 4)], ['Variance', fmt(bv.variance, 4)], ['Noise σ²', fmt(bv.noise, 4)], ['Expected error ≈ sum', fmt(bv.bias2 + bv.variance + bv.noise, 4)]]} />
      <Insight title="Reading the forty curves">Each faint curve is the degree-{degree} model fit to a **different** random training set of {n} points. Their average (thick) missing the true curve is **bias**; their spread around that average is **variance**. Low degree: consistent but wrong. High degree: right on average but wildly different each time. Regularization trades a little bias for a large drop in variance. (Bias² is estimated without its finite-sample inflation: the average of 40 fits still carries variance/40, which is subtracted.)</Insight>
    </>}
    {mode === 'learning' && lc && <>
      <Legend items={[['━', 'training MSE', 'var(--chart-train)'], ['━', 'validation MSE', 'var(--chart-val)'], ['┄', 'noise floor σ²', 'var(--muted)']]} />
      <Plot x={[0, 230]} y={[logY(Math.min(...lc.map(c => c.train), noise * noise) * 0.5), logY(Math.max(...lc.map(c => c.val)) * 1.5)]} xLabel="training set size n" yLabel="MSE (log scale)" label="Learning curve" xFormat={v => String(Math.round(v))} yFormat={v => (10 ** v).toPrecision(2)}>{({ X, Y }) => <>
        <Path X={X} Y={Y} points={[[0, logY(noise * noise)], [230, logY(noise * noise)]]} stroke="var(--muted)" width={1} dash="4 3" />
        <Path X={X} Y={Y} points={lc.map(c => [c.n, logY(c.train)])} stroke="var(--chart-train)" />
        <Path X={X} Y={Y} points={lc.map(c => [c.n, logY(c.val)])} stroke="var(--chart-val)" />
        {lc.map(c => <circle key={c.n} cx={X(c.n)} cy={Y(logY(c.val))} r="3" fill="var(--chart-val)" />)}
      </>}</Plot>
      <Metrics items={[['Gap at n = 20', fmt(lc[2].val - lc[2].train, 4)], ['Gap at n = 220', fmt(lc.at(-1).val - lc.at(-1).train, 4)], ['Validation at n = 220', fmt(lc.at(-1).val, 4)], ['Noise floor', fmt(noise * noise, 4)]]} />
      <Insight title="Diagnose from the shape">A large, shrinking gap between the curves means **high variance**: more data or more regularization will help. Both curves flat and high above the noise floor means **high bias**: more data will not help — use a more flexible model or better features. Try degree 1, then degree 12 with λ = 0.</Insight>
    </>}
  </>
}
