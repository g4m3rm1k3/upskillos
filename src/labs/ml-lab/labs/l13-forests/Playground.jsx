import React, { useMemo, useState } from 'react'
import { fitForest, forestProb, accuracy, oobAccuracy, growthCurve, treeCorrelation, averageVariance } from './engine.js'
import { toRows, regions } from '../l12-trees/engine.js'
import { classification, split, DATASETS, bounds } from '../../kit/datasets.js'
import { Plot, Path, ClassDots, ProbabilityField, Contour } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Legend } from '../../kit/ui.jsx'
import { fmt, pct } from '../../kit/math.js'

export default function Playground() {
  const [kind, setKind] = useState('moons'), [trees, setTrees] = useState(30), [depth, setDepth] = useState(10), [maxFeatures, setMaxFeatures] = useState('all')
  const [bootstrap, setBootstrap] = useState(true), [seed, setSeed] = useState(1)
  const data = useMemo(() => split(classification(kind, { seed, n: 240, noise: 0.35 }), 0.7, seed), [kind, seed])
  const train = useMemo(() => toRows(data.train), [data]), val = useMemo(() => toRows(data.validation), [data])
  const forest = useMemo(() => fitForest(train, { trees: 100, maxDepth: depth, maxFeatures: maxFeatures === 'one' ? 1 : undefined, bootstrap, seed }), [train, depth, maxFeatures, bootstrap, seed])
  const curve = useMemo(() => growthCurve(forest, train, val), [forest, train, val])
  const rho = useMemo(() => treeCorrelation(forest, val), [forest, val])
  const b = bounds([...data.train, ...data.validation]), box = { x0: b.x[0], x1: b.x[1], y0: b.y[0], y1: b.y[1] }
  const single = forest.slice(0, 1)
  const fp = (a, c) => forestProb(forest, [a, c], trees)
  return <>
    <PanelHeading title="Many unstable trees, one stable vote." pill={`${trees} trees`} />
    <Controls>
      <Choice label="Dataset" value={kind} onChange={setKind} options={DATASETS} />
      <Slider label="Trees in the ensemble" value={trees} min={1} max={100} onChange={setTrees} />
      <Slider label="Maximum depth of each tree" value={depth} min={1} max={14} onChange={setDepth} />
      <Choice label="Features tried at each split" value={maxFeatures} onChange={setMaxFeatures} options={[['all', 'Both (bagging)'], ['one', 'One random feature (random forest)']]} />
      <div className="ml-toggles"><Toggle label="Bootstrap samples" checked={bootstrap} onChange={setBootstrap} /><label>Seed<input type="number" min="0" max="99999" value={seed} onChange={e => e.target.value !== '' && setSeed(Math.max(0, Math.min(99999, Math.trunc(+e.target.value))))} /></label></div>
    </Controls>
    <Legend items={[['▒', 'forest probability (average of trees)', 'var(--muted)'], ['━', 'forest boundary', 'var(--text)']]} />
    <Plot x={b.x} y={b.y} xLabel="x1" yLabel="x2" label="Random forest probability field">{({ X, Y, x0, x1, y0, y1 }) => <>
      <ProbabilityField X={X} Y={Y} x0={x0} x1={x1} y0={y0} y1={y1} cells={34} p={fp} />
      <Contour X={X} Y={Y} x0={x0} x1={x1} y0={y0} y1={y1} cells={50} f={fp} level={0.5} />
      <ClassDots X={X} Y={Y} points={data.train} r={3} />
    </>}</Plot>
    <p className="ml-caption">Three of the individual trees — each grown on a different bootstrap sample:</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
      {forest.slice(0, 3).map((f, i) => <Plot key={i} x={b.x} y={b.y} width={300} height={220} grid={false} label={`Tree ${i + 1} regions`}>{({ X, Y }) => regions(f.tree, box).map((r, k) => <rect key={k} x={X(r.x0)} y={Y(r.y1)} width={Math.max(0, X(r.x1) - X(r.x0))} height={Math.max(0, Y(r.y0) - Y(r.y1))} fill={r.value >= 0.5 ? 'var(--chart-val)' : 'var(--chart-train)'} opacity={0.12 + 0.35 * Math.abs(r.value - 0.5) * 2} />)}</Plot>)}
    </div>
    <Metrics items={[['Forest validation accuracy', pct(accuracy(forest, val, trees))], ['One tree’s validation accuracy', pct(accuracy(single, val, 1))], ['Out-of-bag accuracy', bootstrap ? pct(oobAccuracy(forest, train, trees)) : 'n/a (no bootstrap)'], ['Mean tree correlation ρ', fmt(rho, 3)]]} />
    <Legend items={[['━', 'validation accuracy', 'var(--chart-val)'], ['┅', 'out-of-bag accuracy (training data only)', 'var(--chart-train)']]} />
    <Plot x={[0, Math.log(100)]} y={[Math.min(0.6, ...curve.map(c => Math.min(c.val, c.oob || 1))) - 0.02, 1]} height={210} xLabel="number of trees (log scale)" yLabel="accuracy" label="Accuracy as trees are added" xFormat={v => String(Math.round(Math.exp(v)))}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve.map(c => [Math.log(c.trees), c.val])} stroke="var(--chart-val)" />
      {bootstrap && <Path X={X} Y={Y} points={curve.filter(c => Number.isFinite(c.oob)).map(c => [Math.log(c.trees), c.oob])} stroke="var(--chart-train)" dash="6 3" />}
      <Path X={X} Y={Y} points={[[Math.log(trees), 0], [Math.log(trees), 1]]} stroke="var(--muted)" width={1} dash="3 3" />
    </>}</Plot>
    <Insight title="Why averaging helps — and where it stops">{`Averaging T predictors that each have variance σ² and pairwise correlation ρ leaves variance ρσ² + (1−ρ)σ²/T. With ρ = ${fmt(rho, 2)}, even infinitely many trees keep ${pct(rho)} of a single tree’s variance (${fmt(averageVariance(1, rho, 1000), 3)}σ² at 1,000 trees). Bootstrap samples and random feature choices lower ρ; that is the whole point of the “random” in random forest. Turn bootstrap off with both features: every tree is identical, ρ = 1, and adding trees does nothing.`}</Insight>
  </>
}
