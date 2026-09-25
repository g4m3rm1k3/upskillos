// Figures placed between the paragraphs of Lab 18 (18.1–18.5).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Check, Radio, Readout, Bars, MiniPlot, Path, Dots, curve, Table, r } from '../../kit/fig.jsx'
import { cloud, meanVec, covariance, pca, project, reconstruct, reconstructionError, projectedVariance, digits } from './engine.js'
import { random, normal, range, mean } from '../../kit/math.js'

// Square plotting area (inner 254 × 240 px at 330 × 300) so right angles look right.
const SQ = { width: 330, height: 300 }

// ---------- 18.1 ----------
export function ProjectPoint() {
  const [x1, setX1] = useState(3), [x2, setX2] = useState(4), [deg, setDeg] = useState(0)
  const u = [Math.cos(deg * Math.PI / 180), Math.sin(deg * Math.PI / 180)], c = u[0] * x1 + u[1] * x2, p = [c * u[0], c * u[1]], res = [x1 - p[0], x2 - p[1]]
  return <div>
    <Controls><Slider label="x₁" value={x1} min={-4} max={5} step={0.5} onChange={setX1} digits={1} /><Slider label="x₂" value={x2} min={-4} max={5} step={0.5} onChange={setX2} digits={1} /><Slider label="direction of u (degrees)" value={deg} min={0} max={180} step={1} onChange={setDeg} digits={0} /></Controls>
    <MiniPlot {...SQ} x={[-5, 6]} y={[-5, 5.4]} xLabel="x₁" yLabel="x₂" label="Projection of x onto u">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={[[-8 * u[0], -8 * u[1]], [8 * u[0], 8 * u[1]]]} stroke="var(--muted)" width={1.2} />
      <Path X={X} Y={Y} points={[[0, 0], [x1, x2]]} stroke="var(--chart-train)" />
      <Path X={X} Y={Y} points={[[0, 0], p]} stroke="var(--chart-model)" width={3.5} />
      <Path X={X} Y={Y} points={[p, [x1, x2]]} stroke="#ef4444" dash="4 3" />
      <Dots X={X} Y={Y} points={[[x1, x2, 5, 'var(--chart-train)'], [p[0], p[1], 5, 'var(--chart-model)']]} />
    </>}</MiniPlot>
    <Readout>u = ({r(u[0], 3)}, {r(u[1], 3)}); coordinate u·x = <strong>{r(c, 3)}</strong>; projection ({r(p[0], 2)}, {r(p[1], 2)}); residual ({r(res[0], 2)}, {r(res[1], 2)}) in red. ‖x‖² = {r(x1 * x1 + x2 * x2, 3)} = {r(c * c, 3)} kept + {r(res[0] ** 2 + res[1] ** 2, 3)} lost.</Readout>
  </div>
}

// ---------- 18.2 ----------
const CLOUD = cloud()
export function VarianceByDirection() {
  const [deg, setDeg] = useState(0), model = useMemo(() => pca(CLOUD), []), m = meanVec(CLOUD), S = covariance(CLOUD)
  const pc1deg = ((Math.atan2(model.components[0][1], model.components[0][0]) * 180 / Math.PI) + 180) % 180, u = [Math.cos(deg * Math.PI / 180), Math.sin(deg * Math.PI / 180)]
  return <div>
    <Controls><Slider label="direction (degrees)" value={deg} min={0} max={180} step={1} onChange={setDeg} digits={0} /></Controls>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <div style={{ flex: '1 1 240px' }}><MiniPlot {...SQ} x={[-3, 9]} y={[-3.5, 7.8]} xLabel="x₁" yLabel="x₂" label="Cloud with a direction">{({ X, Y }) => <>
        <Dots X={X} Y={Y} points={CLOUD.map(p => [p[0], p[1], 2.2])} opacity={0.5} />
        <Path X={X} Y={Y} points={[[m[0] - 7 * u[0], m[1] - 7 * u[1]], [m[0] + 7 * u[0], m[1] + 7 * u[1]]]} stroke="var(--chart-val)" width={2.5} />
      </>}</MiniPlot></div>
      <div style={{ flex: '1 1 240px' }}><MiniPlot width={300} height={300} x={[0, 180]} y={[0, model.variances[0] * 1.1]} xLabel="direction (degrees)" yLabel="variance of the projections" label="Variance against direction">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={curve(d => projectedVariance(CLOUD, d), 0, 180)} />
        <Dots X={X} Y={Y} points={[[deg, projectedVariance(CLOUD, deg), 5, 'var(--chart-val)'], [pc1deg, model.variances[0], 4, 'var(--text)']]} />
      </>}</MiniPlot></div>
    </div>
    <Table head={['Σ', 'x₁', 'x₂']} rows={[['x₁', r(S[0][0], 3), r(S[0][1], 3)], ['x₂', r(S[1][0], 3), r(S[1][1], 3)]]} label="Covariance matrix" />
    <Readout>At {deg}°, variance uᵀΣu = <strong>{r(projectedVariance(CLOUD, deg), 3)}</strong>. The peak is at {r(pc1deg, 1)}° — the top eigenvector of Σ — with height λ₁ = {r(model.variances[0], 3)}. The minimum, 90° away, is λ₂ = {r(model.variances[1], 3)}.</Readout>
  </div>
}

// ---------- 18.3 ----------
// Centred away from its own long axis, so the uncentred PC1 visibly points at the mean instead.
const OFFSET_CLOUD = cloud({ offset: [4, -3] })
export function CenteringEffect() {
  const [center, setCenter] = useState(true), model = pca(OFFSET_CLOUD, { center }), c = model.components[0], m = model.mean
  return <div>
    <Controls><Check label="subtract the mean first" checked={center} onChange={setCenter} /></Controls>
    <MiniPlot {...SQ} x={[-3, 9]} y={[-9, 3]} xLabel="x₁" yLabel="x₂" label="First component with and without centering">{({ X, Y }) => <>
      <Dots X={X} Y={Y} points={OFFSET_CLOUD.map(p => [p[0], p[1], 2.2])} opacity={0.5} />
      <Path X={X} Y={Y} points={[[m[0] - 8 * c[0], m[1] - 8 * c[1]], [m[0] + 8 * c[0], m[1] + 8 * c[1]]]} stroke="var(--chart-val)" width={2.5} />
      <Dots X={X} Y={Y} points={[[0, 0, 5, 'var(--text)']]} />
    </>}</MiniPlot>
    <Readout>{center ? 'Centred: PC1 runs along the long axis of the cloud.' : 'Not centred: “variance” is measured around the origin (black dot), so PC1 points from the origin toward the cloud.'} Reconstruction error with one component: <strong>{r(reconstructionError(OFFSET_CLOUD, model, 1), 3)}</strong>.</Readout>
  </div>
}

export function ScalingEffect() {
  const [std, setStd] = useState(false), raw = useMemo(() => { const rng = random(9); return range(150).map(() => { const a = normal(rng), b = 0.6 * a + 0.8 * normal(rng); return [1000 * a + 5000, b + 30] }) }, [])
  const sd = [0, 1].map(j => Math.sqrt(mean(raw.map(x => (x[j] - mean(raw.map(y => y[j]))) ** 2)))), X = std ? raw.map(x => [x[0] / sd[0], x[1] / sd[1]]) : raw, model = pca(X)
  return <div>
    <Controls><Check label="standardize each feature" checked={std} onChange={setStd} /></Controls>
    <Table head={['', 'size (bytes)', 'duration (s)']} rows={[['PC1 weights', r(model.components[0][0], 3), r(model.components[0][1], 3)], ['share of variance on PC1', r(model.ratio[0], 4), '']]} label="First component loadings" />
    <Readout>{std ? 'Standardized: both features contribute to PC1, which now reflects their correlation.' : 'Raw units: size varies by thousands and duration by about 1, so PC1 is almost exactly “size”, explaining over 99.99% of the variance.'}</Readout>
  </div>
}

// ---------- 18.4–18.5 ----------
const DIGITS = digits(300), DX = DIGITS.map(d => d.pixels), DMODEL = pca(DX)
function Pixels({ img, size = 5, signed = false, label }) {
  const m = signed ? Math.max(...img.map(Math.abs)) || 1 : 1
  return <svg viewBox="0 0 8 8" width={8 * size} height={8 * size} role="img" aria-label={label} style={{ width: 8 * size, height: 8 * size, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface, white)' }}>
    {img.map((v, i) => <rect key={i} x={i % 8} y={Math.floor(i / 8)} width="1.02" height="1.02" fill={signed ? (v > 0 ? '#ef4444' : 'var(--chart-train)') : 'var(--text)'} opacity={signed ? Math.abs(v) / m : Math.max(0, Math.min(1, v))} />)}
  </svg>
}
export function ScreePlot() {
  const [k, setK] = useState(8), ratios = DMODEL.ratio.slice(0, 20), cum = ratios.reduce((a, v) => [...a, (a[a.length - 1] ?? 0) + v], [])
  return <div>
    <Controls><Slider label="components kept k" value={k} min={1} max={20} step={1} onChange={setK} digits={0} /></Controls>
    <MiniPlot x={[0.5, 20.5]} y={[0, 1]} xLabel="component" yLabel="share of variance" label={`${k} components explain ${r(cum[k - 1] * 100, 1)}%`}>{({ X, Y }) => <>
      {ratios.map((v, i) => <rect key={i} x={X(i + 0.65)} y={Y(v)} width={X(0.7) - X(0)} height={Y(0) - Y(v)} fill={i < k ? 'var(--chart-model)' : 'var(--muted)'} opacity="0.8" />)}
      <Path X={X} Y={Y} points={cum.map((v, i) => [i + 1, v])} stroke="var(--chart-val)" />
    </>}</MiniPlot>
    <Readout>300 digit images, 64 pixels each. The first {k} components explain <strong>{r(cum[k - 1] * 100, 1)}%</strong> of the pixel variance (orange: running total). Reconstruction MSE per image = sum of the dropped eigenvalues = {r(DMODEL.variances.slice(k).reduce((a, b) => a + Math.max(0, b), 0), 4)}.</Readout>
  </div>
}

export function ReconstructDigits() {
  const [k, setK] = useState(8), shown = [0, 1, 2, 3, 5, 7]
  return <div>
    <Controls><Slider label="components kept k" value={k} min={1} max={40} step={1} onChange={setK} digits={0} /></Controls>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{shown.map(i => <div key={i} style={{ textAlign: 'center' }}><Pixels img={DX[i]} label={`original ${DIGITS[i].digit}`} /><br /><Pixels img={reconstruct(project(DX[i], DMODEL, k), DMODEL)} label={`reconstruction of ${DIGITS[i].digit}`} /></div>)}</div>
    <Readout>Top row: the noisy originals (64 numbers each). Bottom: rebuilt from {k} numbers each. Mean squared error {r(reconstructionError(DX.slice(0, 100), DMODEL, k), 4)}. At moderate k the speckle in the originals largely disappears: the dropped directions carried mostly noise.</Readout>
  </div>
}

export function EigenDigits() {
  return <div>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{range(8).map(j => <div key={j} style={{ textAlign: 'center' }}><Pixels img={DMODEL.components[j]} signed size={6} label={`component ${j + 1}`} /><div className="ml-caption">PC{j + 1}: {r(DMODEL.ratio[j] * 100, 1)}%</div></div>)}</div>
    <Readout>Each component is a pattern of pixel weights (red positive, blue negative; the overall sign is arbitrary). Every image is approximated as the mean image plus a weighted sum of these patterns.</Readout>
  </div>
}

export function VarianceIsNotSignal() {
  const data = useMemo(() => { const rng = random(4); return range(200).map(i => { const y = i % 2; return { x: [3 * normal(rng), (y ? 0.5 : -0.5) + 0.3 * normal(rng)], y } }) }, []), model = pca(data.map(d => d.x))
  const [pc, setPc] = useState('0'), j = Number(pc), z = data.map(d => project(d.x, model, 2)[j]), lo = Math.min(...z), hi = Math.max(...z), bins = 24, w = (hi - lo) / bins
  const hist = c => range(bins).map(b => data.filter((d, i) => d.y === c && z[i] >= lo + b * w && z[i] < lo + (b + 1) * w + (b === bins - 1 ? 1e-9 : 0)).length)
  const h0 = hist(0), h1 = hist(1), top = Math.max(...h0, ...h1) * 1.1
  return <div>
    <Controls><Radio name="vnspc" value={pc} onChange={setPc} options={[['0', `PC1 (${r(model.ratio[0] * 100, 1)}% of variance)`], ['1', `PC2 (${r(model.ratio[1] * 100, 1)}%)`]]} /></Controls>
    <MiniPlot x={[lo, hi]} y={[0, top]} xLabel={`coordinate on PC${j + 1}`} yLabel="count" label={`Classes along PC${j + 1}`}>{({ X, Y }) => <>
      {h0.map((c, b) => <rect key={`a${b}`} x={X(lo + b * w)} y={Y(c)} width={X(w) - X(0) - 1} height={Y(0) - Y(c)} fill="var(--chart-train)" opacity="0.5" />)}
      {h1.map((c, b) => <rect key={`b${b}`} x={X(lo + b * w)} y={Y(c)} width={X(w) - X(0) - 1} height={Y(0) - Y(c)} fill="var(--chart-val)" opacity="0.5" />)}
    </>}</MiniPlot>
    <Readout>{j === 0 ? 'Along PC1 — nearly all the variance — the two classes overlap completely. Keeping only PC1 would throw the signal away.' : 'Along PC2 — a small share of the variance — the classes separate cleanly.'} Variance is not the same thing as usefulness for prediction.</Readout>
  </div>
}
