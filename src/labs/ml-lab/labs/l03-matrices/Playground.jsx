import React, { useMemo, useState } from 'react'
import { generate, prepare, curvature, leastSquares, descend, resampledFits, levelCurve } from './engine.js'
import { Plot, Path, extent, equalAspect } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Caption, Insight, Table, Legend, Warning } from '../../kit/ui.jsx'
import { fmt } from '../../kit/math.js'

const RATES = [0.0001, 0.001, 0.01, 0.05, 0.1, 0.2, 0.4, 0.6, 0.9, 1.2]

export default function Playground() {
  const [corr, setCorr] = useState(0.3), [scale, setScale] = useState(1), [standardize, setStandardize] = useState(false)
  const [rate, setRate] = useState(0.1), [steps, setSteps] = useState(40), [seed, setSeed] = useState(3), [showFits, setShowFits] = useState(true)
  const rows = useMemo(() => generate({ seed, corr, scale }), [seed, corr, scale])
  const { X, y, stats } = useMemo(() => prepare(rows, standardize), [rows, standardize])
  const curve = useMemo(() => curvature(X), [X])
  const ls = useMemo(() => leastSquares(X, y), [X, y])
  const gd = useMemo(() => descend(X, y, rate, steps), [X, y, rate, steps])
  const fits = useMemo(() => showFits ? resampledFits(rows, standardize) : [], [rows, standardize, showFits])
  const last = gd.path.at(-1), lmax = Math.max(curve.eigen.values[0], 1), maxRate = 1 / lmax
  const start = ls.w ? ls.w[0] * ls.w[0] * curve.A[0][0] + 2 * ls.w[0] * ls.w[1] * curve.A[0][1] + ls.w[1] * ls.w[1] * curve.A[1][1] : 0
  const curves = ls.w ? [0.03, 0.12, 0.3, 0.6, 1].map(f => levelCurve(ls.w, curve.eigen, Math.max(start * f, 1e-9))) : []
  const pts = [...curves.flat(), ...gd.path.map(p => p.w), ...fits, [0, 0], ...(ls.w ? [ls.w] : [])].filter(p => Math.abs(p[0]) < 1e6 && Math.abs(p[1]) < 1e6)
  const [xr, yr] = equalAspect(extent(pts.map(p => p[0]), 0.08), extent(pts.map(p => p[1]), 0.08))
  const orig = w => w && [w[0] / stats.s1, w[1] / stats.s2]
  const origB = (w, b) => w && b - (w[0] / stats.s1) * stats.m1 - (w[1] / stats.s2) * stats.m2
  return <>
    <PanelHeading title="Two inputs. One bowl. Watch its shape." pill={`κ = ${Number.isFinite(curve.condition) ? fmt(curve.condition, 1) : '∞'}`} />
    <Caption>Target: `y = 5 + 3·x1 + 2·x2 + noise`, where x2 may be correlated with x1 or recorded in larger units. The plot is **weight space**: each point is a pair (w1, w2). Ellipses are exact contours of training MSE; the dashed curve is gradient descent starting at (0, 0).</Caption>
    <Controls>
      <Slider label="Correlation of x1 and x2" value={corr} min={0} max={1} step={0.01} onChange={setCorr} format={v => v.toFixed(2)} />
      <Choice label="Units of x2 (scale)" value={String(scale)} onChange={v => setScale(Number(v))} options={[['1', '× 1 (MB)'], ['10', '× 10'], ['100', '× 100'], ['1000', '× 1000 (≈ KB)']]} />
      <Choice label="Learning rate α" value={String(rate)} onChange={v => setRate(Number(v))} options={RATES.map(r => [String(r), String(r)])} />
      <Slider label="Gradient steps" value={steps} min={0} max={400} step={5} onChange={setSteps} />
      <label>Seed<input type="number" min="0" max="9999" value={seed} onChange={e => e.target.value !== '' && setSeed(Math.max(0, Math.min(9999, Math.trunc(+e.target.value))))} /></label>
      <div className="ml-toggles"><Toggle label="Standardize features (training std)" checked={standardize} onChange={setStandardize} /><Toggle label="Show 30 refits on resampled data" checked={showFits} onChange={setShowFits} /></div>
    </Controls>
    {ls.rank < 2 && <Warning>Rank 1: x2 is an exact multiple of x1. XᵀX is singular, so infinitely many (w1, w2) pairs give the same minimal loss. There is no unique solution to draw — the bowl became a valley with a flat floor.</Warning>}
    {gd.diverged && <Warning>Gradient descent diverged: α exceeds the stable limit 1/λmax ≈ {fmt(maxRate, 5)} for this geometry.</Warning>}
    <Legend items={[['┄', 'gradient descent path', 'var(--chart-train)'], ['✕', 'least-squares solution', 'var(--text)'], ['●', 'refits on resampled data', 'var(--chart-val)'], ['◯', 'loss contours', 'var(--muted)']]} />
    <Plot x={xr} y={yr} xLabel={`w1 (weight on x1${standardize ? ', standardized' : ''})`} yLabel={`w2 (weight on x2${standardize ? ', standardized' : ''})`} label="Loss contours in weight space with gradient descent path">{({ X: SX, Y: SY }) => <>
      {curves.map((c, i) => <Path key={i} X={SX} Y={SY} points={c} stroke="var(--muted)" width={1} opacity={0.7} />)}
      {fits.map((w, i) => <circle key={i} cx={SX(w[0])} cy={SY(w[1])} r="2.3" fill="var(--chart-val)" opacity="0.7" />)}
      <Path X={SX} Y={SY} points={gd.path.map(p => p.w)} stroke="var(--chart-train)" width={2} dash="4 3" />
      {gd.path.map((p, i) => i % Math.max(1, Math.floor(gd.path.length / 25)) === 0 && <circle key={`p${i}`} cx={SX(p.w[0])} cy={SY(p.w[1])} r="2.2" fill="var(--chart-train)" />)}
      {ls.w && <path d={`M ${SX(ls.w[0]) - 6} ${SY(ls.w[1]) - 6} l 12 12 m -12 0 l 12 -12`} stroke="var(--text)" strokeWidth="2.5" />}
    </>}</Plot>
    <Metrics items={[['λmax · λmin of XᵀX/n', `${fmt(curve.eigen.values[0], 2)} · ${fmt(curve.eigen.values[1], 3)}`], ['Condition number κ', Number.isFinite(curve.condition) ? fmt(curve.condition, 1) : '∞ (rank 1)'], ['Stable α below', fmt(maxRate, 5)], [`MSE after ${steps} steps`, fmt(last.loss, 3)]]} />
    <Table head={['', 'w1 (per unit x1)', 'w2 (per unit x2)', 'intercept']} rows={[
      ['least squares', ls.w ? fmt(orig(ls.w)[0], 4) : 'not unique', ls.w ? fmt(orig(ls.w)[1], 5) : 'not unique', ls.w ? fmt(origB(ls.w, ls.b), 3) : '—'],
      [`gradient descent · ${steps} steps`, fmt(orig(last.w)[0], 4), fmt(orig(last.w)[1], 5), fmt(origB(last.w, last.b), 3)],
      ['data-generating truth', '3', fmt(2 / scale, 5), '5'],
    ]} caption="Weights converted back to the original units: divide by the training standard deviation used for scaling, and recover the intercept from the training means. Truth is shown for reference only — real data never tells you this." />
    <Insight title="Shapes, tracked">
      <p className="ml-mono">{`X      : (${X.length}, 2)    one row per observation, one column per feature
w      : (2,)
X @ w  : (${X.length},)      one prediction per row
e      : (${X.length},)      prediction − target
Xᵀ @ e : (2,)       one gradient entry per weight   ·   ∇ = (2/n) Xᵀ e`}</p>
      <ul>
        <li>Raise the correlation toward 0.95: contours stretch along a diagonal, and refits scatter along it. Predictions stay good; individual weights become unreliable.</li>
        <li>Set x2 units to × 1000 without standardizing: κ explodes, the stable α collapses, and 400 steps barely move w1. Standardize and compare.</li>
      </ul>
    </Insight>
  </>
}
