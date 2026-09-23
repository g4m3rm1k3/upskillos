import React, { useMemo, useState } from 'react'
import { cloud, pca, project, reconstruct, reconstructionError, projectedVariance, digits, meanVec } from './engine.js'
import { Plot, Path, equalAspect, extent } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Legend, Caption } from '../../kit/ui.jsx'
import { fmt, pct, linspace } from '../../kit/math.js'

function Img({ pixels, signed = false, size = 64, label }) {
  const m = signed ? Math.max(1e-9, ...pixels.map(Math.abs)) : 1
  return <svg viewBox="0 0 8 8" width={size} height={size} role="img" aria-label={label} style={{ width: size, height: size, display: 'inline-block', margin: 2, border: '1px solid var(--border)', borderRadius: 4 }}>
    {pixels.map((v, i) => <rect key={i} x={i % 8} y={Math.floor(i / 8)} width="1.02" height="1.02" fill={signed ? (v >= 0 ? 'var(--chart-val)' : 'var(--chart-train)') : 'var(--text)'} opacity={signed ? Math.abs(v) / m : Math.max(0, Math.min(1, v))} />)}
  </svg>
}

export default function Playground() {
  const [mode, setMode] = useState('2d'), [angle, setAngle] = useState(35), [ratio, setRatio] = useState(4), [center, setCenter] = useState(true), [k, setK] = useState(1)
  const [theta, setTheta] = useState(0), [kImg, setKImg] = useState(5)
  const X = useMemo(() => cloud({ angle, ratio }), [angle, ratio])
  const model = useMemo(() => pca(X, { center }), [X, center])
  const [xr, yr] = equalAspect(extent([...X.map(p => p[0]), 0]), extent([...X.map(p => p[1]), 0]))
  const imgs = useMemo(() => digits(), []), imgModel = useMemo(() => mode === 'images' ? pca(imgs.map(d => d.pixels)) : null, [mode, imgs])
  const varCurve = useMemo(() => linspace(0, 180, 91).map(t => [t, projectedVariance(X, t)]), [X])
  const m = meanVec(X), total = varCurve[0][1] + projectedVariance(X, 90)
  const cum = imgModel ? imgModel.ratio.reduce((acc, r) => [...acc, (acc.at(-1) ?? 0) + r], []) : []
  return <>
    <PanelHeading title={{ '2d': 'Find the directions that matter.', direction: 'Which direction keeps the most variance?', images: 'Compress images into a few numbers.' }[mode]} pill={mode === 'images' ? `${kImg} of 64 components` : `PC1 explains ${pct(model.ratio[0])}`} />
    <Controls>
      <Choice label="View" value={mode} onChange={setMode} options={[['2d', 'Principal axes in 2D'], ['direction', 'Search for the best direction'], ['images', '8×8 digit images']]} />
      {mode !== 'images' && <><Slider label="Cloud orientation" value={angle} min={0} max={180} onChange={setAngle} format={v => `${v}°`} /><Slider label="Elongation (variance ratio)" value={ratio} min={1} max={20} step={0.5} onChange={setRatio} /></>}
      {mode === '2d' && <><Slider label="Components kept k" value={k} min={1} max={2} onChange={setK} /><Toggle label="Center the data first" checked={center} onChange={setCenter} /></>}
      {mode === 'direction' && <Slider label="Candidate direction θ" value={theta} min={0} max={180} onChange={setTheta} format={v => `${v}°`} />}
      {mode === 'images' && <Slider label="Components kept k" value={kImg} min={1} max={40} onChange={setKImg} />}
    </Controls>
    {mode === '2d' && <>
      <Legend items={[['●', 'data', 'var(--chart-train)'], ['→', 'principal directions (length 2√λ)', 'var(--chart-val)'], ['◆', 'reconstruction from k components', 'var(--accent)']]} />
      <Plot x={xr} y={yr} xLabel="x1" yLabel="x2" label="Data cloud with principal axes and projections">{({ X: SX, Y: SY }) => <>
        {X.map((p, i) => { const r = reconstruct(project(p, model, k), model); return <g key={i}>
          {k === 1 && <line x1={SX(p[0])} y1={SY(p[1])} x2={SX(r[0])} y2={SY(r[1])} stroke="var(--muted)" opacity="0.35" />}
          <circle cx={SX(p[0])} cy={SY(p[1])} r="2.6" fill="var(--chart-train)" opacity="0.7" />
          {k === 1 && <circle cx={SX(r[0])} cy={SY(r[1])} r="1.8" fill="var(--accent)" />}
        </g> })}
        {model.components.map((c, j) => { const L = 2 * Math.sqrt(Math.max(0, model.variances[j])); return <Path key={j} X={SX} Y={SY} points={[model.mean, [model.mean[0] + L * c[0], model.mean[1] + L * c[1]]]} stroke="var(--chart-val)" width={j ? 2 : 3.5} /> })}
        <circle cx={SX(0)} cy={SY(0)} r="3" fill="var(--text)" />
      </>}</Plot>
      <Metrics items={[['λ₁ (variance along PC1)', fmt(model.variances[0], 3)], ['λ₂', fmt(model.variances[1], 3)], ['Explained by k components', pct(model.ratio.slice(0, k).reduce((a, b) => a + b, 0))], ['Mean squared reconstruction error', fmt(reconstructionError(X, model, k), 3)]]} />
      <Caption>{center ? 'Centered: the axes start at the data mean. With k = 1 the reconstruction error equals λ₂ exactly — the variance in the direction you dropped.' : 'Not centered: PCA now measures spread around the origin (black dot), so PC1 points toward the data’s mean instead of along its shape. The reconstruction error grows. Always center before PCA.'}</Caption>
    </>}
    {mode === 'direction' && <>
      <Plot x={xr} y={yr} xLabel="x1" yLabel="x2" label="Projection of the data onto a candidate direction">{({ X: SX, Y: SY }) => {
        const u = [Math.cos(theta * Math.PI / 180), Math.sin(theta * Math.PI / 180)]
        return <>
          <Path X={SX} Y={SY} points={[[m[0] - 10 * u[0], m[1] - 10 * u[1]], [m[0] + 10 * u[0], m[1] + 10 * u[1]]]} stroke="var(--chart-val)" width={2} />
          {X.map((p, i) => { const t = (p[0] - m[0]) * u[0] + (p[1] - m[1]) * u[1], q = [m[0] + t * u[0], m[1] + t * u[1]]; return <g key={i}><line x1={SX(p[0])} y1={SY(p[1])} x2={SX(q[0])} y2={SY(q[1])} stroke="var(--muted)" opacity="0.3" /><circle cx={SX(p[0])} cy={SY(p[1])} r="2.4" fill="var(--chart-train)" opacity="0.7" /><circle cx={SX(q[0])} cy={SY(q[1])} r="1.8" fill="var(--chart-val)" /></g> })}
        </>
      }}</Plot>
      <Plot x={[0, 180]} y={[0, Math.max(...varCurve.map(v => v[1])) * 1.1]} height={200} xLabel="direction θ (degrees)" yLabel="variance of projection" label="Projected variance as a function of direction">{({ X: SX, Y: SY }) => <>
        <Path X={SX} Y={SY} points={varCurve} stroke="var(--accent)" />
        <circle cx={SX(theta)} cy={SY(projectedVariance(X, theta))} r="5" fill="var(--chart-val)" />
      </>}</Plot>
      <Metrics items={[['Variance kept at θ', fmt(projectedVariance(X, theta), 3)], ['Variance lost (squared distances)', fmt(total - projectedVariance(X, theta), 3)], ['Best: λ₁', fmt(model.variances[0], 3)], ['PC1 direction', `${fmt(((Math.atan2(model.components[0][1], model.components[0][0]) * 180 / Math.PI) + 180) % 180, 1)}°`]]} />
      <Insight title="Two views of the same optimum">Kept variance plus lost variance is constant (the total variance), so the direction that **maximizes** the spread of the projections is the direction that **minimizes** the squared distances from points to the line. Drag θ to the peak of the curve: it lands on the eigenvector of the covariance matrix with the largest eigenvalue.</Insight>
    </>}
    {mode === 'images' && imgModel && <>
      <Caption>{`300 noisy 8×8 digit images: 64 numbers each. Each is projected onto the first ${kImg} principal components and rebuilt from those ${kImg} numbers.`}</Caption>
      <div>{imgs.slice(0, 8).map((d, i) => <Img key={i} pixels={d.pixels} label={`original ${d.digit}`} />)}</div>
      <div>{imgs.slice(0, 8).map((d, i) => <Img key={i} pixels={reconstruct(project(d.pixels, imgModel, kImg), imgModel)} label={`reconstruction ${d.digit}`} />)}</div>
      <Caption>Top: originals. Bottom: reconstructions from k numbers each.</Caption>
      <Plot x={[1, 40]} y={[0, 1]} height={200} xLabel="components kept" yLabel="cumulative explained variance" label="Cumulative explained variance">{({ X: SX, Y: SY }) => <>
        <Path X={SX} Y={SY} points={cum.slice(0, 40).map((c, i) => [i + 1, c])} stroke="var(--accent)" />
        <circle cx={SX(kImg)} cy={SY(cum[kImg - 1])} r="5" fill="var(--chart-val)" />
      </>}</Plot>
      <Metrics items={[['Explained variance', pct(cum[kImg - 1])], ['Numbers per image', `${kImg} instead of 64`], ['Compression', `${fmt(64 / kImg, 1)}×`], ['Mean squared error / image', fmt(reconstructionError(imgs.map(d => d.pixels), imgModel, kImg), 3)]]} />
      <p className="ml-caption">The first eight principal components (orange = positive weight, blue = negative) — every reconstruction is the mean image plus a weighted sum of these patterns:</p>
      <div>{imgModel.components.slice(0, 8).map((c, i) => <Img key={i} pixels={c} signed label={`component ${i + 1}`} />)}</div>
    </>}
  </>
}
