import React, { useMemo, useState } from 'react'
import { KERNELS, priorSamples, gpPosterior, posteriorSamples, observations, target, ELLS, lmlCurve, grid } from './engine.js'
import { Plot, Path } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Caption, Legend, Table } from '../../kit/ui.jsx'
import { fmt, mean } from '../../kit/math.js'

const SAMPLE_COLORS = ['var(--chart-model)', 'var(--chart-val)', '#10b981', '#a855f7', 'var(--chart-train)']
const SNS = [0.01, 0.05, 0.1, 0.2, 0.4]
const G = grid()

function Band({ X, Y, xs, mean: m, variance, clip }) {
  const up = xs.map((x, i) => `${X(x)} ${Y(clip(m[i] + 2 * Math.sqrt(variance[i])))}`), dn = xs.map((x, i) => `${X(x)} ${Y(clip(m[i] - 2 * Math.sqrt(variance[i])))}`).reverse()
  return <path d={`M ${up.join(' L ')} L ${dn.join(' L ')} Z`} fill="var(--chart-model)" opacity="0.13" />
}

function Prior() {
  const [kernel, setKernel] = useState('rbf'), [ei, setEi] = useState(4), [sf, setSf] = useState(1), [seed, setSeed] = useState(1)
  const h = { ell: ELLS[ei], sf, sn: 0 }
  const samples = useMemo(() => priorSamples(kernel, h, G, 5, seed), [kernel, ei, sf, seed]) // eslint-disable-line react-hooks/exhaustive-deps
  const clip = v => Math.max(-3.5, Math.min(3.5, v))
  return <>
    <Controls>
      <Choice label="Kernel" value={kernel} onChange={setKernel} options={Object.entries(KERNELS).map(([k, v]) => [k, v.name])} />
      <Slider label="Length scale ℓ" value={ei} min={0} max={ELLS.length - 1} onChange={setEi} format={i => ELLS[i]} />
      <Slider label="Signal scale σf" value={sf} min={0.25} max={2} step={0.25} onChange={setSf} />
    </Controls>
    <Plot x={[-0.1, 1.1]} y={[-3.5, 3.5]} height={260} xLabel="x" yLabel="f(x)" label="Functions drawn from the GP prior">{({ X, Y }) => <>
      <Band X={X} Y={Y} xs={G} mean={G.map(() => 0)} variance={G.map(x => KERNELS[kernel].k(x, x, h))} clip={clip} />
      {samples.map((s, j) => <Path key={j} X={X} Y={Y} points={G.map((x, i) => [x, clip(s[i])])} stroke={SAMPLE_COLORS[j]} width={1.8} />)}
    </>}</Plot>
    <Plot x={[-0.1, 1.1]} y={[-0.2, Math.max(1.2, sf * sf * 1.1)]} height={160} xLabel="x" yLabel="k(0.5, x)" label="The kernel: covariance with the point x = 0.5">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={G.map(x => [x, KERNELS[kernel].k(0.5, x, h)])} stroke="var(--text)" width={2} />
    </>}</Plot>
    <button onClick={() => setSeed(s => s + 1)}>Draw five new functions</button>
    <Insight title="What to notice">A GP prior is a distribution over whole functions. The kernel says how strongly f(x) and f(x′) move together: the lower plot shows the covariance of every point with x = 0.5. A short length scale gives wiggly functions; a long one gives nearly straight ones. The shaded band is ±2σf everywhere — before seeing data, every x is equally uncertain.</Insight>
  </>
}

function Posterior() {
  const [kernel, setKernel] = useState('rbf'), [ei, setEi] = useState(6), [si, setSi] = useState(2), [n, setN] = useState(8), [showSamples, setShowSamples] = useState(true)
  const all = useMemo(() => observations(), []), data = all.slice(0, n), h = { ell: ELLS[ei], sf: 1, sn: SNS[si] }
  const post = useMemo(() => gpPosterior(data, kernel, h, G), [kernel, ei, si, n]) // eslint-disable-line react-hooks/exhaustive-deps
  const samples = useMemo(() => showSamples ? posteriorSamples(data, kernel, h, G, 4, 3) : [], [kernel, ei, si, n, showSamples]) // eslint-disable-line react-hooks/exhaustive-deps
  const clip = v => Math.max(-3, Math.min(3, v)), inside = G.map((x, i) => [x, i]).filter(([x]) => x >= 0 && x <= 1)
  const rmse = Math.sqrt(mean(inside.map(([x, i]) => (post.mean[i] - target(x)) ** 2)))
  return <>
    <Controls>
      <Choice label="Kernel" value={kernel} onChange={setKernel} options={Object.entries(KERNELS).map(([k, v]) => [k, v.name])} />
      <Slider label="Observations" value={n} min={0} max={all.length} onChange={setN} />
      <Slider label="Length scale ℓ" value={ei} min={0} max={ELLS.length - 1} onChange={setEi} format={i => ELLS[i]} />
      <Slider label="Noise σn" value={si} min={0} max={SNS.length - 1} onChange={setSi} format={i => SNS[i]} />
      <Toggle label="Draw functions from the posterior" checked={showSamples} onChange={setShowSamples} />
    </Controls>
    <Plot x={[-0.1, 1.1]} y={[-3, 3]} height={300} xLabel="x" yLabel="f(x)" label="GP posterior">{({ X, Y }) => <>
      <Band X={X} Y={Y} xs={G} mean={post.mean} variance={post.variance} clip={clip} />
      <Path X={X} Y={Y} points={G.map(x => [x, target(x)])} stroke="var(--text)" width={1.5} dash="6 4" />
      {samples.map((s, j) => <Path key={j} X={X} Y={Y} points={G.map((x, i) => [x, clip(s[i])])} stroke={SAMPLE_COLORS[j]} width={1} opacity={0.6} />)}
      <Path X={X} Y={Y} points={G.map((x, i) => [x, clip(post.mean[i])])} stroke="var(--chart-model)" width={3} />
      {data.map((d, i) => <circle key={i} cx={X(d.x)} cy={Y(d.y)} r="4.5" fill="var(--chart-train)" stroke="var(--text)" strokeWidth="0.6" />)}
    </>}</Plot>
    <Legend items={[['━', 'posterior mean', 'var(--chart-model)'], ['■', '±2 standard deviations of f', 'var(--chart-model)'], ['┄', 'true function', 'var(--text)'], ['●', 'observations (none between 0.45 and 0.7)', 'var(--chart-train)']]} />
    <Metrics items={[['Log marginal likelihood', n ? fmt(post.lml, 2) : '—'], ['Error of the mean vs truth (RMSE)', fmt(rmse, 3)], ['Posterior sd at x = 0.57 (in the gap)', fmt(Math.sqrt(post.variance[G.findIndex(x => x >= 0.57)]), 3)], ['Posterior sd at the first observation', n ? fmt(Math.sqrt(gpPosterior(data, kernel, h, [data[0].x]).variance[0]), 3) : '—']]} />
    <Insight title="What to notice">Conditioning on data pins every sampled function near the observations; in the gap they spread out again, and beyond the data the band returns to the prior. With tiny noise the mean passes through every point; with larger noise it smooths. Too short a length scale makes the mean fall back to zero between points; too long a scale cannot bend enough.</Insight>
  </>
}

function Hyper() {
  const [kernel, setKernel] = useState('rbf'), [si, setSi] = useState(2)
  const data = useMemo(() => observations(), []), sn = SNS[si]
  const curve = useMemo(() => lmlCurve(data, kernel, 1, sn), [data, kernel, sn])
  const best = curve.reduce((b, r) => r.lml > b.lml ? r : b)
  const table = useMemo(() => Object.entries(KERNELS).map(([k, v]) => { const c = lmlCurve(data, k, 1, sn), b = c.reduce((bb, r) => r.lml > bb.lml ? r : bb); return [v.name, k === 'linear' ? 'none (no length scale)' : b.ell, fmt(b.lml, 1)] }), [data, sn])
  const shown = [curve[1], best, curve.at(-2)], cols = ['var(--chart-val)', 'var(--chart-model)', '#10b981']
  const lo = Math.max(Math.min(...curve.map(r => r.lml)), best.lml - 60)
  return <>
    <Controls>
      <Choice label="Kernel" value={kernel} onChange={setKernel} options={Object.entries(KERNELS).map(([k, v]) => [k, v.name])} />
      <Slider label="Noise σn" value={si} min={0} max={SNS.length - 1} onChange={setSi} format={i => SNS[i]} />
    </Controls>
    <Plot x={[0, ELLS.length - 1]} y={[lo - 2, best.lml + 3]} height={220} xTicks={ELLS.length} xFormat={v => ELLS[Math.round(v)]} yFormat={v => v.toFixed(0)} xLabel="length scale ℓ" yLabel="log marginal likelihood" label="Marginal likelihood against length scale">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve.map((r, i) => [i, Math.max(r.lml, lo - 2)])} stroke="var(--chart-model)" width={2.5} />
      {curve.map((r, i) => <circle key={i} cx={X(i)} cy={Y(Math.max(r.lml, lo - 2))} r={r === best ? 6 : 3.5} fill={r === best ? 'var(--chart-val)' : 'var(--chart-model)'} />)}
    </>}</Plot>
    <Plot x={[-0.1, 1.1]} y={[-3, 3]} height={240} xLabel="x" yLabel="f(x)" label="Fits at three length scales">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={G.map(x => [x, target(x)])} stroke="var(--text)" width={1.5} dash="6 4" />
      {shown.map((r, j) => { const p = gpPosterior(data, kernel, { ell: r.ell, sf: 1, sn }, G); return <Path key={j} X={X} Y={Y} points={G.map((x, i) => [x, Math.max(-3, Math.min(3, p.mean[i]))])} stroke={cols[j]} width={2.2} /> })}
      {data.map((d, i) => <circle key={i} cx={X(d.x)} cy={Y(d.y)} r="4" fill="var(--chart-train)" />)}
    </>}</Plot>
    <Legend items={shown.map((r, j) => ['━', `ℓ = ${r.ell}${r === best ? ' (highest marginal likelihood)' : j === 0 ? ' (too short)' : ' (too long)'}`, cols[j]])} />
    <Table head={['kernel', 'best ℓ', 'best log marginal likelihood']} rows={table} caption="Comparing kernels by their best marginal likelihood is model selection with the evidence (Lab 41)." />
    <Insight title="What to notice">The marginal likelihood balances fit against complexity without a validation set: very short length scales can explain any data, so they spread probability thinly and score poorly; very long ones cannot explain the wiggles. The same score also compares kernels — the periodic kernel with the wrong period is rejected decisively.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('prior')
  return <>
    <PanelHeading title="A prior over functions, updated by data." pill="Gaussian processes" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['prior', 'Prior: what the kernel believes'], ['posterior', 'Posterior: regression with uncertainty'], ['hyper', 'Choosing the kernel and length scale']]} /></Controls>
    {view === 'prior' ? <Prior /> : view === 'posterior' ? <Posterior /> : <Hyper />}
    <Caption>All computations are exact: Cholesky factorizations of the kernel matrix, as in the Python challenge.</Caption>
  </>
}
