import React, { useMemo, useState } from 'react'
import { kmeans, bestOf, silhouette, stability, dbscan, anomalyScores } from './engine.js'
import { clusterData, CLUSTER_SETS } from '../../kit/clusterData.js'
import { Plot, Path, equalAspect, extent } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Legend, Actions, Caption } from '../../kit/ui.jsx'
import { fmt, pct, quantile } from '../../kit/math.js'

const COLORS = ['#3b82f6', '#f97316', '#10b981', '#a855f7', '#ef4444', '#eab308', '#06b6d4', '#ec4899']

export default function Playground() {
  const [mode, setMode] = useState('kmeans'), [kind, setKind] = useState('blobs'), [k, setK] = useState(3), [init, setInit] = useState('random'), [seed, setSeed] = useState(4)
  const [step, setStep] = useState(0), [eps, setEps] = useState(0.45), [minPts, setMinPts] = useState(5), [share, setShare] = useState(0.05)
  const points = useMemo(() => clusterData(kind, { seed: 1 }), [kind])
  const km = useMemo(() => kmeans(points, k, { init, seed }), [points, k, init, seed])
  const h = km.history[Math.min(step, km.history.length - 1)]
  const curve = useMemo(() => mode === 'choose' ? [1, 2, 3, 4, 5, 6, 7, 8].map(kk => { const m = bestOf(points, kk, 4, 'plusplus', 1); return { k: kk, inertia: m.inertia, sil: kk > 1 ? silhouette(points, m.labels) : NaN, stab: stability(points, kk, 'plusplus', 5) } }) : [], [mode, points])
  const db = useMemo(() => mode === 'dbscan' ? dbscan(points, eps, minPts) : null, [mode, points, eps, minPts])
  const best = useMemo(() => bestOf(points, k, 5, 'plusplus', 1), [points, k])
  const scores = useMemo(() => anomalyScores(points, best.labels, best.cs), [points, best])
  const cut = quantile(scores, 1 - share)
  const [xr, yr] = equalAspect(extent(points.map(p => p.x1)), extent(points.map(p => p.x2)))
  const labels = mode === 'kmeans' ? h.labels : mode === 'dbscan' ? db.labels : best.labels, cs = mode === 'kmeans' ? h.cs : best.cs
  const trails = mode === 'kmeans' ? km.history.slice(0, step + 1).map(s => s.cs) : []
  return <>
    <PanelHeading title={{ kmeans: 'Assign, move, repeat.', choose: 'How many clusters are there?', dbscan: 'Clusters as dense regions.', anomaly: 'Far from every centre = unusual?' }[mode]} pill={mode === 'dbscan' ? `${db.clusters} clusters · ${db.noise} noise` : `k = ${k}`} />
    <Controls>
      <Choice label="View" value={mode} onChange={m => { setMode(m); setStep(0) }} options={[['kmeans', 'k-means, step by step'], ['choose', 'Choosing k'], ['dbscan', 'DBSCAN'], ['anomaly', 'Anomaly scores']]} />
      <Choice label="Data" value={kind} onChange={v => { setKind(v); setStep(0) }} options={CLUSTER_SETS} />
      {mode !== 'dbscan' && mode !== 'choose' && <Slider label="Clusters k" value={k} min={1} max={8} onChange={v => { setK(v); setStep(0) }} />}
      {mode === 'kmeans' && <><Choice label="Initialization" value={init} onChange={v => { setInit(v); setStep(0) }} options={[['random', 'Random points'], ['plusplus', 'k-means++']]} /><label>Seed<input type="number" min="0" max="99999" value={seed} onChange={e => { if (e.target.value !== '') { setSeed(Math.max(0, Math.min(99999, Math.trunc(+e.target.value)))); setStep(0) } }} /></label></>}
      {mode === 'dbscan' && <><Slider label="Neighbourhood radius ε" value={eps} min={0.1} max={1.5} step={0.05} onChange={setEps} format={v => v.toFixed(2)} /><Slider label="Minimum points for a core" value={minPts} min={2} max={20} onChange={setMinPts} /></>}
      {mode === 'anomaly' && <Slider label="Flag the most distant share" value={share} min={0.01} max={0.2} step={0.01} onChange={setShare} format={pct} />}
    </Controls>
    {mode === 'kmeans' && <Actions>
      <button className="ml-primary" disabled={step >= km.history.length - 1} onClick={() => setStep(s => s + 1)}>{step >= km.history.length - 1 ? 'Converged' : km.history[step + 1].phase === 'update' ? 'Step: move centres to means' : 'Step: reassign points'}</button>
      <button onClick={() => setStep(km.history.length - 1)}>Run to convergence</button><button onClick={() => setStep(0)}>Restart</button>
    </Actions>}
    <Plot x={xr} y={yr} xLabel="x1" yLabel="x2" label="Points coloured by cluster">{({ X, Y }) => <>
      {points.map((p, i) => {
        const l = labels[i], flagged = mode === 'anomaly' && scores[i] >= cut
        return <circle key={i} cx={X(p.x1)} cy={Y(p.x2)} r={flagged ? 5 : 3.2} fill={l < 0 ? 'none' : COLORS[l % COLORS.length]} stroke={l < 0 ? 'var(--muted)' : flagged ? 'var(--text)' : 'none'} strokeWidth={flagged ? 2 : 1.2} opacity={mode === 'anomaly' && !flagged ? 0.45 : 0.85} />
      })}
      {mode === 'kmeans' && cs.map((_, j) => <Path key={`t${j}`} X={X} Y={Y} points={trails.map(c => c[j])} stroke="var(--text)" width={1.2} dash="3 3" />)}
      {mode !== 'dbscan' && cs.map((c, j) => <path key={j} d={`M ${X(c[0]) - 8} ${Y(c[1]) - 8} l 16 16 m -16 0 l 16 -16`} stroke={COLORS[j % COLORS.length]} strokeWidth="4" />)}
      {mode === 'dbscan' && <circle cx={X(xr[0] + (xr[1] - xr[0]) * 0.08)} cy={Y(yr[0] + (yr[1] - yr[0]) * 0.1)} r={X(xr[0] + eps) - X(xr[0])} fill="none" stroke="var(--text)" strokeDasharray="3 3" />}
    </>}</Plot>
    {mode === 'kmeans' && <>
      <Metrics items={[['Half-step', `${step} / ${km.history.length - 1}`], ['Phase', h.phase], ['Inertia (within-cluster SSE)', fmt(h.inertia, 2)], ['Final inertia', fmt(km.inertia, 2)]]} />
      <Plot x={[0, Math.max(1, km.history.length - 1)]} y={[0, km.history[0].inertia * 1.05]} height={180} xLabel="half-step" yLabel="inertia" label="Inertia after each half-step">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={km.history.map((s, i) => [i, s.inertia])} stroke="var(--accent)" />
        <circle cx={X(step)} cy={Y(h.inertia)} r="5" fill="var(--chart-val)" />
      </>}</Plot>
      <Caption>Both half-steps can only lower (or keep) the inertia: reassigning picks each point’s nearest centre, and moving a centre to its points’ mean minimizes their squared distances. So k-means always converges — but to a local minimum. Try random initialization on “Three round clusters” with seeds 4, 7 and 12.</Caption>
    </>}
    {mode === 'choose' && curve.length > 0 && <>
      <div className="ml-grid-2">
        <Plot x={[1, 8]} y={[0, curve[0].inertia * 1.05]} width={320} height={240} xTicks={8} xLabel="k" yLabel="inertia" label="Elbow plot">{({ X, Y }) => <><Path X={X} Y={Y} points={curve.map(c => [c.k, c.inertia])} />{curve.map(c => <circle key={c.k} cx={X(c.k)} cy={Y(c.inertia)} r="3.5" fill="var(--accent)" />)}</>}</Plot>
        <Plot x={[1, 8]} y={[0, 1]} width={320} height={240} xTicks={8} xLabel="k" yLabel="score" label="Silhouette and stability">{({ X, Y }) => <>
          <Path X={X} Y={Y} points={curve.filter(c => c.k > 1).map(c => [c.k, c.sil])} stroke="var(--chart-val)" />
          <Path X={X} Y={Y} points={curve.map(c => [c.k, c.stab])} stroke="var(--chart-train)" dash="5 3" />
        </>}</Plot>
      </div>
      <Legend items={[['━', 'inertia (always falls with k)', 'var(--accent)'], ['━', 'mean silhouette (higher = better separated)', 'var(--chart-val)'], ['┅', 'stability: agreement between runs (Rand index)', 'var(--chart-train)']]} />
      <Insight title="Three imperfect signals">Inertia always decreases as k grows — at k = n it is zero — so look for an “elbow” where gains flatten. The silhouette compares each point’s distance to its own cluster with the nearest other cluster. Stability asks whether different random starts agree. On “No clusters at all” every criterion still returns *some* best k: an algorithm will always partition data, even when no real groups exist.</Insight>
    </>}
    {mode === 'dbscan' && <>
      <Metrics items={[['Clusters found', db.clusters], ['Noise points (hollow)', db.noise], ['ε', eps.toFixed(2)], ['minPts', minPts]]} />
      <Insight title="Density, not distance to a centre">A point with at least minPts neighbours within ε (the dashed circle shows ε to scale) is a **core** point; clusters grow outward from cores; everything unreachable is noise. DBSCAN finds the two moons that k-means splits wrongly, needs no k — but one ε cannot suit clusters of very different density (try “unequal”).</Insight>
    </>}
    {mode === 'anomaly' && <>
      <Metrics items={[['Flagged points', points.filter((_, i) => scores[i] >= cut).length], ['Distance threshold', fmt(cut, 3)], ['Median distance', fmt(quantile(scores, 0.5), 3)], ['k', k]]} />
      <Insight title="An anomaly score is a modelling choice">Each point’s score is its distance to its assigned k-means centre; the top share is flagged. On “unequal” clusters the wide cluster’s ordinary members get flagged while tight clusters hide real outliers — distance to a centre ignores each cluster’s own spread. Scale-aware scores (divide by the cluster’s spread) or density-based ones behave better.</Insight>
    </>}
  </>
}
