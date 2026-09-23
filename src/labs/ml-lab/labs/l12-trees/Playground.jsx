import React, { useMemo, useState } from 'react'
import { buildTree, toRows, regions, path, accuracy, leaves, depthOf, splitScan } from './engine.js'
import TreeDiagram from './TreeDiagram.jsx'
import { classification, split, DATASETS, bounds } from '../../kit/datasets.js'
import { Plot, Path, ClassDots } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Caption, Insight, Legend } from '../../kit/ui.jsx'
import { fmt, pct } from '../../kit/math.js'

export default function Playground() {
  const [kind, setKind] = useState('moons'), [depth, setDepth] = useState(3), [minLeaf, setMinLeaf] = useState(1), [criterion, setCriterion] = useState('gini'), [seed, setSeed] = useState(1)
  const [query, setQuery] = useState([0.2, 0.1]), [scanFeature, setScanFeature] = useState(0)
  const data = useMemo(() => split(classification(kind, { seed, n: 220, noise: 0.3 }), 0.7, seed), [kind, seed])
  const train = useMemo(() => toRows(data.train), [data]), val = useMemo(() => toRows(data.validation), [data])
  const tree = useMemo(() => buildTree(train, { maxDepth: depth, minLeaf, criterion }), [train, depth, minLeaf, criterion])
  const curve = useMemo(() => [0, 1, 2, 3, 4, 5, 6, 8, 10, 14].map(d => { const t = buildTree(train, { maxDepth: d, minLeaf, criterion }); return [d, accuracy(t, train), accuracy(t, val)] }), [train, val, minLeaf, criterion])
  const scan = useMemo(() => splitScan(train, scanFeature, criterion), [train, scanFeature, criterion])
  const b = bounds([...data.train, ...data.validation])
  const box = { x0: b.x[0], x1: b.x[1], y0: b.y[0], y1: b.y[1] }
  const trail = path(tree, query), highlight = new Set(trail.map(n => n.id))
  const onClick = e => {
    const svg = e.currentTarget.querySelector('svg'); if (!svg) return
    const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * 560, py = (e.clientY - r.top) / r.height * 320
    if (px < 54 || px > 538 || py < 18 || py > 278) return
    setQuery([b.x[0] + (px - 54) / 484 * (b.x[1] - b.x[0]), b.y[0] + (278 - py) / 260 * (b.y[1] - b.y[0])])
  }
  const bestIdx = scan.candidates.reduce((bi, c, i, a) => c.weighted < a[bi].weighted ? i : bi, 0)
  return <>
    <PanelHeading title="Ask one question at a time." pill={`${leaves(tree).length} leaves · depth ${depthOf(tree)}`} />
    <Controls>
      <Choice label="Dataset" value={kind} onChange={setKind} options={DATASETS} />
      <Choice label="Impurity" value={criterion} onChange={setCriterion} options={[['gini', 'Gini 2p(1−p)'], ['entropy', 'Entropy −Σp log₂p']]} />
      <Slider label="Maximum depth" value={depth} min={0} max={14} onChange={setDepth} />
      <Slider label="Minimum samples per leaf" value={minLeaf} min={1} max={30} onChange={setMinLeaf} />
      <label>Seed<input type="number" min="0" max="99999" value={seed} onChange={e => e.target.value !== '' && setSeed(Math.max(0, Math.min(99999, Math.trunc(+e.target.value))))} /></label>
    </Controls>
    <Legend items={[['▭', 'leaf region (colour = class-1 share)', 'var(--muted)'], ['✚', 'query — click to move; its path is highlighted below', 'var(--text)']]} />
    <div onClick={onClick} style={{ cursor: 'crosshair' }}>
      <Plot x={b.x} y={b.y} xLabel="x1" yLabel="x2" label="Leaf regions of the decision tree over the training data">{({ X, Y }) => <>
        {regions(tree, box).map((r, i) => <rect key={i} x={X(r.x0)} y={Y(r.y1)} width={Math.max(0, X(r.x1) - X(r.x0))} height={Math.max(0, Y(r.y0) - Y(r.y1))} fill={r.value >= 0.5 ? 'var(--chart-val)' : 'var(--chart-train)'} opacity={0.08 + 0.3 * Math.abs(r.value - 0.5) * 2} stroke={highlight.has(r.node.id) ? 'var(--text)' : 'var(--surface)'} strokeWidth={highlight.has(r.node.id) ? 2 : 1} />)}
        <ClassDots X={X} Y={Y} points={data.train} r={3.2} />
        <path d={`M ${X(query[0]) - 8} ${Y(query[1])} h 16 M ${X(query[0])} ${Y(query[1]) - 8} v 16`} stroke="var(--text)" strokeWidth="3" />
      </>}</Plot>
    </div>
    <TreeDiagram tree={tree} highlight={highlight} />
    <p className="ml-mono">{trail.map((n, i) => n.split ? `${i + 1}. ${['x1', 'x2'][n.split.feature]} = ${query[n.split.feature].toFixed(2)} ${query[n.split.feature] <= n.split.threshold ? '≤' : '>'} ${n.split.threshold.toFixed(2)} → go ${query[n.split.feature] <= n.split.threshold ? 'left' : 'right'}` : `${i + 1}. leaf: ${n.n} training points, ${pct(n.value)} class 1 → predict ${n.value >= 0.5 ? 1 : 0}`).join('\n')}</p>
    <Metrics items={[['Training accuracy', pct(accuracy(tree, train))], ['Validation accuracy', pct(accuracy(tree, val))], ['Leaves', leaves(tree).length], ['Root impurity', fmt(tree.impurity, 3)]]} />
    <Legend items={[['━', 'training accuracy', 'var(--chart-train)'], ['━', 'validation accuracy', 'var(--chart-val)']]} />
    <Plot x={[0, 14]} y={[0.4, 1.02]} height={200} xLabel="maximum depth" yLabel="accuracy" label="Accuracy against tree depth" xTicks={8}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve.map(([d, t]) => [d, t])} stroke="var(--chart-train)" />
      <Path X={X} Y={Y} points={curve.map(([d, , v]) => [d, v])} stroke="var(--chart-val)" />
      <Path X={X} Y={Y} points={[[depth, 0.4], [depth, 1.02]]} stroke="var(--muted)" width={1} dash="4 3" />
    </>}</Plot>
    <Insight title="How the root split was chosen">
      <Controls><Choice label="Scan feature" value={String(scanFeature)} onChange={v => setScanFeature(Number(v))} options={[['0', 'x1'], ['1', 'x2']]} /></Controls>
      {scan.candidates.length > 0 && <Plot x={[scan.candidates[0].threshold, scan.candidates.at(-1).threshold]} y={[0, scan.parent * 1.05 || 1]} height={200} xLabel={`threshold on ${['x1', 'x2'][scanFeature]}`} yLabel="weighted child impurity" label="Weighted impurity of the two children for every threshold">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={scan.candidates.map(c => [c.threshold, scan.parent])} stroke="var(--muted)" width={1} dash="4 3" />
        <Path X={X} Y={Y} points={scan.candidates.map(c => [c.threshold, c.weighted])} stroke="var(--accent)" />
        <circle cx={X(scan.candidates[bestIdx].threshold)} cy={Y(scan.candidates[bestIdx].weighted)} r="5" fill="var(--chart-val)" />
      </>}</Plot>}
      <Caption>{scan.candidates.length ? `Dashed: parent impurity ${fmt(scan.parent, 3)}. Every candidate threshold (midpoints between sorted values) is scored by the size-weighted impurity of its two children. The best on this feature is ${fmt(scan.candidates[bestIdx].threshold, 3)}, with gain ${fmt(scan.parent - scan.candidates[bestIdx].weighted, 3)}. The tree compares the best of each feature and takes the larger gain.` : 'No valid thresholds.'}</Caption>
    </Insight>
    <Caption>Try “XOR quadrants” with depth 1 and 2: no single first split reduces impurity much, so a greedy tree may choose a poor root. Deeper trees recover — but only because later splits fix the greedy choice.</Caption>
  </>
}
