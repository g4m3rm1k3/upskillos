import React, { useMemo, useState } from 'react'
import { WORLDS, sampleWorld, runEM, kmeans, agreement, hardLabels, bicCurve, mahal2 } from './engine.js'
import { Plot, Path, Contour } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Caption, Legend } from '../../kit/ui.jsx'
import { fmt, pct } from '../../kit/math.js'

const COLS = ['var(--chart-train)', 'var(--chart-val)', '#10b981', '#a855f7', '#eab308', '#ec4899']
const B = { x: [-6, 6], y: [-4, 4] }
const trueK = key => WORLDS[key].comps.length

function Scatter({ X, Y, pts, colors, opacities }) {
  return pts.map((p, i) => <circle key={i} cx={X(p[0])} cy={Y(p[1])} r="3" fill={colors[i]} opacity={opacities ? opacities[i] : 0.85} />)
}

function EMView() {
  const [world, setWorld] = useState('stretched'), [K, setK] = useState(2), [seed, setSeed] = useState(1), [t, setT] = useState(0), [floor, setFloor] = useState(true)
  const data = useMemo(() => sampleWorld(world), [world]), X = useMemo(() => data.map(p => p.x), [data])
  const runs = useMemo(() => [1, 2, 3, 4, 5].map(s => runEM(X, K, { seed: s, iters: 60, floor: floor ? 1e-3 : 0 })), [X, K, floor])
  const hist = runs[seed - 1], step = hist[Math.min(t, hist.length - 1)]
  const lls = runs.flatMap(h => h.map(s => s.ll)).filter(Number.isFinite), lo = Math.min(...lls), hi = Math.max(...lls)
  const acc = K === trueK(world) ? agreement(hardLabels(step.R), data.map(p => p.z), K) : null
  return <>
    <Controls>
      <Choice label="Data" value={world} onChange={w => { setWorld(w); setK(trueK(w)); setT(0) }} options={Object.entries(WORLDS).map(([k, v]) => [k, v.name])} />
      <Slider label="Components K" value={K} min={1} max={6} onChange={v => { setK(v); setT(0) }} />
      <Slider label="Starting point (seed)" value={seed} min={1} max={5} onChange={v => { setSeed(v); setT(0) }} />
      <Slider label="EM iteration" value={t} min={0} max={60} onChange={setT} />
      <Toggle label="Variance floor (prevents a component collapsing onto a point)" checked={floor} onChange={setFloor} />
    </Controls>
    <Plot x={B.x} y={B.y} height={320} xLabel="x₁" yLabel="x₂" label="Gaussian mixture fitted by EM">{({ X: PX, Y: PY }) => <>
      <Scatter X={PX} Y={PY} pts={X} colors={step.R.map(r => COLS[r.indexOf(Math.max(...r))])} opacities={step.R.map(r => 0.25 + 0.7 * Math.max(...r))} />
      {step.model.map((c, k) => [1, 4].map(l => <Contour key={`${k}-${l}`} X={PX} Y={PY} x0={B.x[0]} x1={B.x[1]} y0={B.y[0]} y1={B.y[1]} f={(a, b) => mahal2([a, b], c.m, c.S)} level={l} stroke={COLS[k]} width={l === 1 ? 2.2 : 1.2} dash={l === 1 ? undefined : '4 3'} cells={70} />))}
      {step.model.map((c, k) => <text key={k} x={PX(c.m[0])} y={PY(c.m[1]) + 5} textAnchor="middle" style={{ fontSize: 16, fontWeight: 700 }} fill="var(--text)">×</text>)}
    </>}</Plot>
    <Legend items={[['●', 'colour = most responsible component; faint = uncertain', 'var(--text)'], ['━', '1σ ellipse of each component', 'var(--muted)'], ['┄', '2σ ellipse', 'var(--muted)']]} />
    <Plot x={[0, 60]} y={[lo - 5, hi + 5]} height={200} xLabel="EM iteration" yLabel="log-likelihood" yFormat={v => v.toFixed(0)} label="Log-likelihood of five starting points">{({ X: PX, Y: PY }) => <>
      {runs.map((h, j) => <Path key={j} X={PX} Y={PY} points={h.filter(s => Number.isFinite(s.ll)).map((s, i) => [i, s.ll])} stroke={j === seed - 1 ? 'var(--chart-val)' : 'var(--muted)'} width={j === seed - 1 ? 2.8 : 1.2} />)}
      <circle cx={PX(Math.min(t, hist.length - 1))} cy={PY(step.ll)} r="5" fill="var(--chart-val)" />
    </>}</Plot>
    <Metrics items={[['Log-likelihood', Number.isFinite(step.ll) ? fmt(step.ll, 1) : '∞ (collapsed)'], ['Best of the five starts', fmt(Math.max(...runs.map(h => h.at(-1).ll)), 1)], ['Agreement with true clusters', acc === null ? `set K = ${trueK(world)}` : pct(acc)], ['Smallest component weight', pct(Math.min(...step.model.map(c => c.w)))]]} />
    <Insight title="What to notice">Every EM iteration raises the log-likelihood (or leaves it unchanged) — never lowers it, apart from dips too small to see caused by the variance floor. But different starting points climb to different peaks: on the parallel clusters, most starts split the data the wrong way and stay there. Run several starts and keep the best. Turn off the variance floor with K = 6 on the three-cluster data: some component can shrink onto one or two points, and the “likelihood” it earns is meaningless.</Insight>
  </>
}

function KMeansView() {
  const [world, setWorld] = useState('stretched')
  const data = useMemo(() => sampleWorld(world), [world]), X = data.map(p => p.x), K = trueK(world)
  const gmm = useMemo(() => [1, 2, 3, 4, 5].map(s => runEM(X, K, { seed: s, iters: 80, floor: 1e-3 }).at(-1)).reduce((b, h) => h.ll > b.ll ? h : b), [world]) // eslint-disable-line react-hooks/exhaustive-deps
  const km = useMemo(() => [1, 2, 3, 4, 5].map(s => kmeans(X, K, s)).map(r => ({ ...r, acc: agreement(r.labels, data.map(p => p.z), K) })).reduce((b, r) => r.acc > b.acc ? r : b), [world]) // eslint-disable-line react-hooks/exhaustive-deps
  const gl = hardLabels(gmm.R), truth = data.map(p => p.z)
  return <>
    <Controls><Choice label="Data" value={world} onChange={setWorld} options={Object.entries(WORLDS).map(([k, v]) => [k, v.name])} /></Controls>
    <div className="ml-grid-2">
      <div><p className="ml-caption"><strong>k-means</strong></p><Plot x={B.x} y={B.y} height={260} width={400} xLabel="x₁" yLabel="x₂" label="k-means partition">{({ X: PX, Y: PY }) => <Scatter X={PX} Y={PY} pts={X} colors={km.labels.map(l => COLS[l])} />}</Plot></div>
      <div><p className="ml-caption"><strong>Gaussian mixture (EM)</strong></p><Plot x={B.x} y={B.y} height={260} width={400} xLabel="x₁" yLabel="x₂" label="Gaussian mixture partition">{({ X: PX, Y: PY }) => <Scatter X={PX} Y={PY} pts={X} colors={gl.map(l => COLS[l])} />}</Plot></div>
    </div>
    <Metrics items={[['k-means agreement (best of 5)', pct(km.acc)], ['GMM agreement (highest likelihood of 5)', pct(agreement(gl, truth, K))], ['Clusters', String(K)]]} />
    <Insight title="What to notice">k-means assigns each point to the nearest centre, so it can only draw straight boundaries halfway between centres and implicitly assumes round clusters of similar size. A Gaussian mixture learns each cluster’s shape, size and weight. On the long parallel clusters, k-means cuts across them; with a big diffuse cluster beside a tight one, k-means steals points from the big cluster. On round, similar clusters the two agree — k-means is the limit of EM with equal spherical covariances shrinking to zero.</Insight>
  </>
}

function BicView() {
  const [world, setWorld] = useState('three')
  const X = useMemo(() => sampleWorld(world).map(p => p.x), [world]), rows = useMemo(() => bicCurve(X), [X])
  const best = rows.reduce((b, r) => r.bic < b.bic ? r : b), lo = Math.min(...rows.map(r => r.bic)), hi = Math.max(...rows.map(r => r.bic))
  return <>
    <Controls><Choice label="Data" value={world} onChange={setWorld} options={Object.entries(WORLDS).map(([k, v]) => [k, `${v.name} (true K = ${v.comps.length})`])} /></Controls>
    <Plot x={[1, 6]} y={[lo - 20, hi + 20]} height={230} xTicks={6} xFormat={v => Math.round(v)} yFormat={v => v.toFixed(0)} xLabel="number of components K" yLabel="BIC (lower is better)" label="BIC by number of components">{({ X: PX, Y: PY }) => <>
      <Path X={PX} Y={PY} points={rows.map(r => [r.K, r.bic])} stroke="var(--chart-model)" width={2.5} />
      {rows.map(r => <circle key={r.K} cx={PX(r.K)} cy={PY(r.bic)} r={r === best ? 7 : 4} fill={r === best ? 'var(--chart-val)' : 'var(--chart-model)'} />)}
    </>}</Plot>
    <Metrics items={[...rows.map(r => [`K = ${r.K}: log-likelihood`, fmt(r.ll, 1)]).slice(0, 4), ['Chosen K', String(best.K)]]} />
    <Caption>{`BIC = −2 × log-likelihood + (number of parameters) × log n. A full-covariance mixture in 2D has 6K − 1 parameters; n = ${X.length}. Each K uses the best of four EM starts.`}</Caption>
    <Insight title="What to notice">The log-likelihood keeps rising with K — extra components can always fit the data a little better. BIC charges for every parameter and turns the curve around at the true number of clusters in all three worlds. It is an approximation to the log evidence (Lab 41); held-out likelihood is the alternative when you have enough data.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('em')
  return <>
    <PanelHeading title="Hidden labels, soft guesses, steady climbs." pill="expectation–maximization" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['em', 'EM step by step'], ['kmeans', 'Mixture versus k-means'], ['bic', 'How many components? (BIC)']]} /></Controls>
    {view === 'em' ? <EMView /> : view === 'kmeans' ? <KMeansView /> : <BicView />}
  </>
}
