import React, { useMemo, useState } from 'react'
import { SOURCE_SETS, makeSignals, whiten, fastICA, recovery, excessKurtosis, swissRoll, geodesic, classicalMDS, pca2, rankCorr, tsneData, tsne, centroid, spread } from './engine.js'
import { Plot, Path } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Caption, Legend } from '../../kit/ui.jsx'
import { fmt, pct } from '../../kit/math.js'

const C3 = ['var(--chart-train)', 'var(--chart-val)', '#10b981']
const hue = (t, lo, hi) => `hsl(${Math.round(260 * (t - lo) / (hi - lo))}, 70%, 50%)`

function Signals({ title, rows, n = 200 }) {
  const top = Math.max(3, ...rows.slice(0, n).flat().map(Math.abs))
  return <div><p className="ml-caption"><strong>{title}</strong></p>
    <Plot x={[0, n]} y={[-top, top]} height={120} xLabel="time" yLabel="" yFormat={() => ''} label={title}>{({ X, Y }) => [0, 1].map(j => <Path key={j} X={X} Y={Y} points={rows.slice(0, n).map((r, t) => [t, r[j] + (j ? -top / 2 : top / 2)])} stroke={C3[j]} width={1.4} />)}</Plot></div>
}

function IcaView() {
  const [key, setKey] = useState('signals'), [seed, setSeed] = useState(3)
  const d = useMemo(() => makeSignals(key), [key]), w = useMemo(() => whiten(d.X), [d]), ica = useMemo(() => fastICA(w.Z, 200, seed), [w, seed])
  const starts = useMemo(() => [1, 2, 3, 4, 5, 6].map(s => recovery(fastICA(w.Z, 200, s).Y, d.S)), [w, d])
  return <>
    <Controls>
      <Choice label="Sources" value={key} onChange={setKey} options={Object.entries(SOURCE_SETS).map(([k, v]) => [k, v.name])} />
      <Slider label="ICA random start" value={seed} min={1} max={6} onChange={setSeed} />
    </Controls>
    <Caption>Two microphones each record a different mix of two sources: x = A·s with an unknown mixing matrix A. Can we recover the sources from the mixtures alone?</Caption>
    <Signals title="True sources (hidden)" rows={d.S} />
    <Signals title="Observed mixtures" rows={d.X} />
    <Signals title="PCA components (decorrelated, still mixed)" rows={w.Z} />
    <Signals title="ICA components (recovered up to order, sign and scale)" rows={ica.Y} />
    <Metrics items={[['Match to sources · mixtures', pct(recovery(d.X, d.S))], ['· PCA', pct(recovery(w.Z, d.S))], ['· ICA', pct(recovery(ica.Y, d.S))], ['ICA over 6 random starts', `${pct(Math.min(...starts))} – ${pct(Math.max(...starts))}`]]} />
    <Caption>{`Excess kurtosis of the sources: ${[0, 1].map(j => fmt(excessKurtosis(d.S.map(s => s[j])), 2)).join(' and ')} (0 for a Gaussian).`}</Caption>
    <Insight title="What to notice">PCA makes the components uncorrelated, but uncorrelated is not independent: its outputs are still mixtures. ICA looks for directions whose projections are as **non-Gaussian** as possible — because, by the central limit theorem, mixing makes signals more Gaussian — and recovers the sources almost perfectly. With Gaussian sources there is nothing to find: every rotation of whitened Gaussian data looks the same, and different random starts return different, arbitrary answers.</Insight>
  </>
}

function IsomapView() {
  const [k, setK] = useState(8)
  const R = useMemo(() => swissRoll(), []), X = R.map(p => p.x)
  const iso = useMemo(() => classicalMDS(geodesic(X, k)), [k]) // eslint-disable-line react-hooks/exhaustive-deps
  const pc = useMemo(() => pca2(X), []) // eslint-disable-line react-hooks/exhaustive-deps
  const ts = R.map(p => p.t), lo = Math.min(...ts), hi = Math.max(...ts)
  const scatter = (pts, title) => { const bx = Math.max(...pts.map(p => Math.abs(p[0]))) * 1.1, by = Math.max(...pts.map(p => Math.abs(p[1]))) * 1.1
    return <div><p className="ml-caption"><strong>{title}</strong></p><Plot x={[-bx, bx]} y={[-by, by]} height={230} width={400} xLabel="" yLabel="" xFormat={() => ''} yFormat={() => ''} label={title}>{({ X: PX, Y: PY }) => pts.map((p, i) => <circle key={i} cx={PX(p[0])} cy={PY(p[1])} r="2.8" fill={hue(ts[i], lo, hi)} />)}</Plot></div> }
  return <>
    <Controls><Slider label="Neighbours per point in the graph (k)" value={k} min={4} max={30} onChange={setK} /></Controls>
    <Caption>300 points on a rolled-up sheet in 3D (a “swiss roll”). Colour shows position along the roll — the one coordinate that matters.</Caption>
    <div className="ml-grid-2">
      {scatter(R.map(p => [p.x[0], p.x[2]]), 'The roll seen from the side (x vs z)')}
      {scatter(pc, 'PCA (linear projection)')}
      {scatter(iso, `Isomap (k = ${k})`)}
    </div>
    <Metrics items={[['PCA axis 1 tracks position along the roll', fmt(Math.abs(rankCorr(pc.map(p => p[0]), ts)), 3)], ['Isomap axis 1 tracks it', fmt(Math.abs(rankCorr(iso.map(p => p[0]), ts)), 3)], ['Isomap axis 2 tracks the width', fmt(Math.abs(rankCorr(iso.map(p => p[1]), R.map(p => p.h))), 3)]]} />
    <Insight title="What to notice">Straight-line distance across the roll is misleading: two points on neighbouring layers are close in 3D but far apart along the sheet. Isomap connects each point to its k nearest neighbours, measures **geodesic** distance as the shortest path through that graph, and embeds those distances with classical MDS — unrolling the sheet so colour runs smoothly along one axis. PCA can only project, so the layers stay folded on top of each other. Raise k too far and the graph grows “short-circuit” edges between layers: the unrolling breaks.</Insight>
  </>
}

function TsneView() {
  const [px, setPx] = useState(20), [seed, setSeed] = useState(1)
  const T = useMemo(() => tsneData(), []), X = T.map(p => p.x)
  const Y = useMemo(() => tsne(X, { perplexity: px, seed }), [px, seed]) // eslint-disable-line react-hooks/exhaustive-deps
  const P = useMemo(() => pca2(X), []) // eslint-disable-line react-hooks/exhaustive-deps
  const stats = pts => { const g = [0, 1, 2].map(c => pts.filter((_, i) => T[i].c === c)), cs = g.map(centroid); return { sp: g.map(spread), d01: Math.hypot(cs[0][0] - cs[1][0], cs[0][1] - cs[1][1]), d02: Math.hypot(cs[0][0] - cs[2][0], cs[0][1] - cs[2][1]) } }
  const st = stats(Y), sp = stats(P)
  const scatter = (pts, title) => { const bx = Math.max(...pts.map(p => Math.abs(p[0]))) * 1.1, by = Math.max(...pts.map(p => Math.abs(p[1]))) * 1.1
    return <div><p className="ml-caption"><strong>{title}</strong></p><Plot x={[-bx, bx]} y={[-by, by]} height={240} width={400} xLabel="" yLabel="" xFormat={() => ''} yFormat={() => ''} label={title}>{({ X: PX, Y: PY }) => pts.map((p, i) => <circle key={i} cx={PX(p[0])} cy={PY(p[1])} r="3" fill={C3[T[i].c]} />)}</Plot></div> }
  return <>
    <Controls>
      <Choice label="Perplexity (effective number of neighbours)" value={String(px)} onChange={v => setPx(Number(v))} options={['5', '20', '50']} />
      <Slider label="Random start" value={seed} min={1} max={5} onChange={setSeed} />
    </Controls>
    <Caption>Three clusters in 10 dimensions: blue is tight, orange is 4× wider, green is tight and 4× farther from blue than orange is.</Caption>
    <div className="ml-grid-2">{scatter(P, 'PCA')}{scatter(Y, `t-SNE (perplexity ${px})`)}</div>
    <Metrics items={[['True spread ratio orange : blue', '4 : 1'], ['t-SNE spread ratio', `${fmt(st.sp[1] / st.sp[0], 1)} : 1`], ['True distance ratio green : orange (from blue)', '4.2 : 1'], ['t-SNE distance ratio', `${fmt(st.d02 / st.d01, 1)} : 1`]]} />
    <Caption>{`PCA keeps those ratios roughly: spread ${fmt(sp.sp[1] / sp.sp[0], 1)} : 1, distance ${fmt(sp.d02 / sp.d01, 1)} : 1.`}</Caption>
    <Insight title="How to read a t-SNE plot">t-SNE keeps each point’s **neighbours** together and pushes non-neighbours apart, with heavy-tailed similarities in 2D so clusters do not crowd. It does not preserve sizes or distances: at low perplexity all three clusters come out the same size and roughly equally far apart. Cluster sizes, gaps between clusters, and axes mean little; clusters you see might be real — or produced by the perplexity and seed. Compare several perplexities and seeds before believing a structure, and never use t-SNE coordinates as features for evidence.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('ica')
  return <>
    <PanelHeading title="Structure that straight lines cannot see." pill="ICA · Isomap · t-SNE" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['ica', 'ICA: unmixing signals'], ['isomap', 'Isomap: unrolling a swiss roll'], ['tsne', 't-SNE: what the picture does and does not show']]} /></Controls>
    {view === 'ica' ? <IcaView /> : view === 'isomap' ? <IsomapView /> : <TsneView />}
  </>
}
