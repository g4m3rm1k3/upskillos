// Figures placed between the paragraphs of Lab 17 (17.1–17.5).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Check, Radio, Choice, Readout, Bars, MiniPlot, Path, Dots, Table, r } from '../../kit/fig.jsx'
import { kmeans, bestOf, silhouette, stability, dbscan, anomalyScores } from './engine.js'
import { clusterData, CLUSTER_SETS } from '../../kit/clusterData.js'
import { mean, range } from '../../kit/math.js'

const PALETTE = ['var(--chart-train)', 'var(--chart-val)', '#10b981', '#a855f7', '#eab308', '#ec4899', '#14b8a6', '#f97316']
const color = l => (l < 0 ? 'var(--muted)' : PALETTE[l % PALETTE.length])
function ClusterPlot({ points, labels, centres, trails, flagged, width = 460, height = 280, box = [-4, 4, -3.5, 3.5], label = 'Clustered points' }) {
  return <MiniPlot width={width} height={height} x={[box[0], box[1]]} y={[box[2], box[3]]} xLabel="x₁" yLabel="x₂" label={label}>{({ X, Y }) => <>
    <Dots X={X} Y={Y} points={points.map((p, i) => [p.x1, p.x2, 3, color(labels ? labels[i] : 0)])} opacity={0.75} />
    {flagged && points.map((p, i) => flagged.has(i) && <circle key={`f${i}`} cx={X(p.x1)} cy={Y(p.x2)} r={7} fill="none" stroke="#ef4444" strokeWidth="1.8" />)}
    {trails && trails.map((t, j) => <Path key={`t${j}`} X={X} Y={Y} points={t} stroke="var(--text)" width={1.2} dash="3 3" />)}
    {centres && centres.map((c, j) => <g key={`c${j}`}><circle cx={X(c[0])} cy={Y(c[1])} r={8} fill={color(j)} stroke="var(--text)" strokeWidth="2.5" /></g>)}
  </>}</MiniPlot>
}

// ---------- 17.1 ----------
const UNIFORM = clusterData('uniform', { n: 240, seed: 3 })
export function ClustersInNoise() {
  const [k, setK] = useState(4), [seed, setSeed] = useState(1), m = kmeans(UNIFORM, k, { seed })
  return <div>
    <Controls><Slider label="k" value={k} min={2} max={8} step={1} onChange={setK} digits={0} /><button onClick={() => setSeed(s => s + 1)}>Another seed</button></Controls>
    <ClusterPlot points={UNIFORM} labels={m.labels} centres={m.cs} label={`k-means with k = ${k} on uniform noise`} />
    <Readout>Uniformly random points — no groups exist — yet k-means returns {k} tidy clusters (silhouette {r(silhouette(UNIFORM, m.labels), 3)}). Change the seed: the boundaries move. An algorithm always answers; whether the answer is real is your job.</Readout>
  </div>
}

const BLOBS = clusterData('blobs', { n: 240, seed: 1 })
export function UnitsDecide() {
  const [scale, setScale] = useState('1'), s = Number(scale), pts = BLOBS.map(p => ({ x1: p.x1 * s, x2: p.x2 })), m = kmeans(pts, 3, { seed: 2 })
  return <div>
    <Controls><Radio name="clunits" value={scale} onChange={setScale} options={[['1', 'x₁ in its own units'], ['100', 'x₁ × 100 (e.g. bytes instead of KB)']]} /></Controls>
    <ClusterPlot points={BLOBS} labels={m.labels} label="k-means clusters, plotted in the original units" />
    <Readout>{s === 1 ? 'Three round groups, found correctly.' : 'With x₁ a hundred times larger, distance is almost pure x₁: the clusters become vertical bands, cutting through the real groups.'} Points are always plotted in the original units.</Readout>
  </div>
}

// ---------- 17.2 ----------
export function KmeansStepper() {
  const [kind, setKind] = useState('blobs'), [init, setInit] = useState('random'), [seed, setSeed] = useState(3), [step, setStep] = useState(0)
  const pts = useMemo(() => clusterData(kind, { n: 240, seed: 1 }), [kind]), run = useMemo(() => kmeans(pts, 3, { init, seed }), [pts, init, seed])
  const h = run.history[Math.min(step, run.history.length - 1)], trails = range(3).map(j => run.history.slice(0, Math.min(step, run.history.length - 1) + 1).map(x => x.cs[j]))
  const reset = f => v => { f(v); setStep(0) }
  return <div>
    <Controls>
      <Choice label="data" value={kind} onChange={reset(setKind)} options={CLUSTER_SETS.filter(c => c[0] !== 'uniform')} />
      <Radio name="kminit" value={init} onChange={reset(setInit)} options={[['random', 'random start'], ['plusplus', 'k-means++']]} />
      <button onClick={() => setStep(s => Math.min(run.history.length - 1, s + 1))}>Next half-step</button>
      <button onClick={() => { setSeed(s => s + 1); setStep(0) }}>New seed</button>
    </Controls>
    <ClusterPlot points={pts} labels={h.labels} centres={h.cs} trails={trails} label={`k-means ${h.phase} step`} />
    <Readout>Half-step {step} of {run.history.length - 1}: <strong>{h.phase === 'init' ? 'initial centres' : h.phase === 'update' ? 'update — each centre moves to the mean of its points' : 'assign — each point joins its nearest centre'}</strong>. Inertia {r(h.inertia, 2)}{step >= run.history.length - 1 ? ' — converged: no point changed cluster.' : '.'}</Readout>
  </div>
}

// ---------- 17.3 ----------
export function ElbowAndSilhouette() {
  const [kind, setKind] = useState('blobs'), pts = useMemo(() => clusterData(kind, { n: 180, seed: 1 }), [kind])
  const rows = useMemo(() => range(7).map(i => { const k = i + 2, m = bestOf(pts, k, 3, 'plusplus', 1); return { k, inertia: m.inertia, sil: silhouette(pts, m.labels) } }), [pts])
  const best = rows.reduce((b, x) => (x.sil > b.sil ? x : b))
  return <div>
    <Controls><Choice label="data" value={kind} onChange={setKind} options={CLUSTER_SETS} /></Controls>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <div style={{ flex: '1 1 220px' }}><MiniPlot width={300} height={220} x={[2, 8]} y={[0, Math.max(...rows.map(x => x.inertia)) * 1.1]} xLabel="k" yLabel="inertia" label="Elbow plot">{({ X, Y }) => <><Path X={X} Y={Y} points={rows.map(x => [x.k, x.inertia])} /><Dots X={X} Y={Y} points={rows.map(x => [x.k, x.inertia])} rad={3} /></>}</MiniPlot></div>
      <div style={{ flex: '1 1 220px' }}><MiniPlot width={300} height={220} x={[2, 8]} y={[0, 1]} xLabel="k" yLabel="mean silhouette" label="Silhouette by k">{({ X, Y }) => <><Path X={X} Y={Y} points={rows.map(x => [x.k, x.sil])} stroke="var(--chart-val)" /><Dots X={X} Y={Y} points={[[best.k, best.sil, 5]]} color="var(--chart-val)" /></>}</MiniPlot></div>
    </div>
    <Readout>Inertia only falls as k grows. The mean silhouette peaks at <strong>k = {best.k}</strong> ({r(best.sil, 3)}). {kind === 'uniform' ? 'On uniform noise every silhouette is mediocre and no k stands out.' : ''}</Readout>
  </div>
}

export function SilhouetteCalc() {
  const [a, setA] = useState(2), [b, setB] = useState(6), s = (b - a) / Math.max(a, b)
  return <div>
    <Controls><Slider label="a: mean distance to own cluster" value={a} min={0.1} max={10} step={0.1} onChange={setA} digits={1} /><Slider label="b: mean distance to nearest other cluster" value={b} min={0.1} max={10} step={0.1} onChange={setB} digits={1} /></Controls>
    <Readout>s = (b − a)/max(a, b) = ({r(b, 1)} − {r(a, 1)})/{r(Math.max(a, b), 1)} = <strong>{r(s, 3)}</strong>: {s > 0.5 ? 'well inside its cluster.' : s > 0 ? 'near a border.' : 'closer to another cluster — probably misassigned.'}</Readout>
  </div>
}

export function StabilityBars() {
  const [kind, setKind] = useState('blobs'), pts = useMemo(() => clusterData(kind, { n: 150, seed: 1 }), [kind]), vals = useMemo(() => range(5).map(i => [i + 2, stability(pts, i + 2, 'plusplus', 6)]), [pts])
  return <div>
    <Controls><Choice label="data" value={kind} onChange={setKind} options={CLUSTER_SETS} /></Controls>
    <Bars items={vals.map(([k, v]) => ({ label: `k=${k}`, value: v }))} min={0.5} max={1} digits={3} label="Agreement between runs with different seeds (Rand index)" />
    <Readout>Mean Rand index between 6 runs with different seeds. Values near 1: the same grouping every time. Lower: the split depends on luck.</Readout>
  </div>
}

// ---------- 17.4 ----------
export function KmeansVersusDbscan() {
  const [kind, setKind] = useState('moons'), [eps, setEps] = useState(0.35), [minPts, setMinPts] = useState(5)
  const pts = useMemo(() => clusterData(kind, { n: 240, seed: 1 }), [kind]), km = useMemo(() => bestOf(pts, kind === 'moons' ? 2 : 3, 3, 'plusplus', 1), [pts, kind]), db = dbscan(pts, eps, minPts)
  return <div>
    <Controls><Choice label="data" value={kind} onChange={setKind} options={CLUSTER_SETS.filter(c => c[0] !== 'uniform')} /><Slider label="ε" value={eps} min={0.1} max={1} step={0.05} onChange={setEps} /><Slider label="minPts" value={minPts} min={2} max={15} step={1} onChange={setMinPts} digits={0} /></Controls>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <div style={{ flex: '1 1 220px' }}><ClusterPlot width={300} height={240} points={pts} labels={km.labels} centres={km.cs} label="k-means" /><p className="ml-caption">k-means, k = {kind === 'moons' ? 2 : 3}</p></div>
      <div style={{ flex: '1 1 220px' }}><ClusterPlot width={300} height={240} points={pts} labels={db.labels} label="DBSCAN" /><p className="ml-caption">DBSCAN: {db.clusters} clusters, {db.noise} noise points (grey)</p></div>
    </div>
    <Readout>{kind === 'moons' ? 'k-means draws a straight boundary and cuts each moon in two; DBSCAN follows the dense crescents.' : 'Compare the two. Large ε merges clusters; small ε turns sparse members into noise.'}</Readout>
  </div>
}

// ---------- 17.5 ----------
const UNEQUAL = clusterData('unequal', { n: 240, seed: 1 })
export function AnomalyFlags() {
  const [top, setTop] = useState(5), [relative, setRelative] = useState(false), m = useMemo(() => bestOf(UNEQUAL, 3, 3, 'plusplus', 1), [])
  const raw = anomalyScores(UNEQUAL, m.labels, m.cs), typical = range(3).map(j => mean(raw.filter((_, i) => m.labels[i] === j))), score = relative ? raw.map((v, i) => v / typical[m.labels[i]]) : raw
  const cut = [...score].sort((a, b) => b - a)[Math.max(0, Math.round(UNEQUAL.length * top / 100) - 1)], flagged = new Set(score.map((v, i) => (v >= cut ? i : -1)).filter(i => i >= 0))
  const byCluster = range(3).map(j => [...flagged].filter(i => m.labels[i] === j).length)
  return <div>
    <Controls><Slider label="flag the top %" value={top} min={1} max={20} step={1} onChange={setTop} digits={0} /><Check label="divide by each cluster’s typical distance" checked={relative} onChange={setRelative} /></Controls>
    <ClusterPlot points={UNEQUAL} labels={m.labels} centres={m.cs} flagged={flagged} label="Flagged anomalies" />
    <Readout>{flagged.size} points flagged (red circles); per cluster: {byCluster.map((c, j) => `${c}`).join(', ')}. {relative ? 'Relative to each cluster’s spread, the flags spread across all clusters.' : 'Raw distance flags mostly members of the wide cluster — ordinary for it — and misses points that are unusual for a tight cluster.'}</Readout>
  </div>
}
