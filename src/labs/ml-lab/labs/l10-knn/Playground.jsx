import React, { useMemo, useState } from 'react'
import { neighbours, knnProb, accuracy, inUnits, standardizer, distanceContrast } from './engine.js'
import { classification, split, DATASETS, bounds } from '../../kit/datasets.js'
import { Plot, Path, ClassDots, ProbabilityField, Contour } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Caption, Insight, Legend } from '../../kit/ui.jsx'
import { fmt, pct } from '../../kit/math.js'

export default function Playground() {
  const [view, setView] = useState('neighbours')
  const [kind, setKind] = useState('moons'), [k, setK] = useState(5), [metric, setMetric] = useState('euclidean'), [seed, setSeed] = useState(1)
  const [units, setUnits] = useState(1), [standardize, setStandardize] = useState(false), [query, setQuery] = useState([0.3, 0.2])
  const base = useMemo(() => split(classification(kind, { seed, n: 200, noise: 0.3 }), 0.7, seed), [kind, seed])
  const data = useMemo(() => ({ train: inUnits(base.train, units), validation: inUnits(base.validation, units) }), [base, units])
  const scale = useMemo(() => standardize ? standardizer(data.train) : [1, 1], [data, standardize])
  const q = [query[0], query[1] * units]
  const nb = neighbours(data.train, q, k, metric, scale)
  const b = bounds([...data.train, ...data.validation])
  const valAcc = useMemo(() => accuracy(data.train, data.validation, k, metric, scale), [data, k, metric, scale])
  const trainAcc = useMemo(() => accuracy(data.train, data.train, k, metric, scale), [data, k, metric, scale])
  const curve = useMemo(() => view === 'k' ? [1, 3, 5, 9, 15, 25, 41, 71, 139].filter(v => v <= data.train.length).map(kk => [kk, accuracy(data.train, data.train, kk, metric, scale), accuracy(data.train, data.validation, kk, metric, scale)]) : [], [view, data, metric, scale])
  const dims = useMemo(() => view === 'curse' ? [1, 2, 5, 10, 20, 50, 100, 300].map(d => [d, distanceContrast(d, 400, seed)]) : [], [view, seed])
  const highlight = new Set(nb.near.map(n => n.i))
  const onClick = e => {
    const svg = e.currentTarget.querySelector('svg'); if (!svg) return
    const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * 560, py = (e.clientY - r.top) / r.height * 320
    if (px < 54 || px > 538 || py < 18 || py > 278) return
    const x = b.x[0] + (px - 54) / 484 * (b.x[1] - b.x[0]), y = b.y[0] + (278 - py) / 260 * (b.y[1] - b.y[0])
    setQuery([x, y / units])
  }
  return <>
    <PanelHeading title={{ neighbours: 'Predict by asking the neighbours.', k: 'How many neighbours should vote?', curse: 'When everything is far away.' }[view]} pill={`k = ${k}`} />
    <Controls>
      <Choice label="View" value={view} onChange={setView} options={[['neighbours', 'Query & decision regions'], ['k', 'Choosing k'], ['curse', 'Curse of dimensionality']]} />
      <Choice label="Dataset" value={kind} onChange={setKind} options={DATASETS.filter(d => d[0] !== 'spiral')} />
      <Slider label="Neighbours k" value={k} min={1} max={51} step={2} onChange={setK} />
      <Choice label="Distance" value={metric} onChange={setMetric} options={[['euclidean', 'Euclidean √(Σ d²)'], ['manhattan', 'Manhattan Σ|d|']]} />
      <Choice label="Units of x2" value={String(units)} onChange={v => setUnits(Number(v))} options={[['1', '× 1'], ['100', '× 100 (e.g. cm instead of m)'], ['1000', '× 1000']]} />
      <div className="ml-toggles"><Toggle label="Standardize with training std" checked={standardize} onChange={setStandardize} /><label>Seed<input type="number" min="0" max="99999" value={seed} onChange={e => e.target.value !== '' && setSeed(Math.max(0, Math.min(99999, Math.trunc(+e.target.value))))} /></label></div>
    </Controls>
    {view === 'neighbours' && <>
      <Legend items={[['●◆', 'training points', 'var(--chart-train)'], ['◯', `the ${k} nearest to the query`, 'var(--text)'], ['✚', 'query (click the plot to move it)', 'var(--text)'], ['━', 'decision boundary', 'var(--text)']]} />
      <div onClick={onClick} style={{ cursor: 'crosshair' }}>
        <Plot x={b.x} y={b.y} xLabel="x1" yLabel={`x2${units > 1 ? ` (× ${units})` : ''}`} label="k-NN decision regions with the neighbours of a query point">{({ X, Y, x0, x1, y0, y1 }) => <>
          <ProbabilityField X={X} Y={Y} x0={x0} x1={x1} y0={y0} y1={y1} cells={32} p={knnProb(data.train, k, metric, scale)} />
          <Contour X={X} Y={Y} x0={x0} x1={x1} y0={y0} y1={y1} cells={48} f={knnProb(data.train, k, metric, scale)} level={0.5} width={1.5} />
          {nb.near.map(n => <line key={n.i} x1={X(q[0])} y1={Y(q[1])} x2={X(data.train[n.i].x1)} y2={Y(data.train[n.i].x2)} stroke="var(--text)" strokeWidth="1" opacity="0.45" />)}
          <ClassDots X={X} Y={Y} points={data.train} highlight={highlight} />
          <path d={`M ${X(q[0]) - 8} ${Y(q[1])} h 16 M ${X(q[0])} ${Y(q[1]) - 8} v 16`} stroke="var(--text)" strokeWidth="3" />
        </>}</Plot>
      </div>
      <Metrics items={[['Class-1 votes among neighbours', `${nb.near.filter(n => n.label).length} / ${k}`], ['Prediction', nb.vote > 0.5 ? 'class 1' : 'class 0'], ['Validation accuracy', pct(valAcc)], ['Training accuracy', pct(trainAcc)]]} />
      <Caption>{`The query's nearest neighbour is ${fmt(nb.near[0].d, 3)} away and its ${k}th is ${fmt(nb.near.at(-1).d, 3)} away (in the ${standardize ? 'standardized' : 'raw'} units). Set x2 units to × 1000 without standardizing: distances are now almost entirely x2, the neighbours line up vertically, and the boundary turns into horizontal stripes.`}</Caption>
    </>}
    {view === 'k' && <>
      <Legend items={[['━', 'training accuracy', 'var(--chart-train)'], ['━', 'validation accuracy', 'var(--chart-val)']]} />
      <Plot x={[0, Math.log(150)]} y={[0.4, 1.02]} xLabel="k (log scale)" yLabel="accuracy" label="Accuracy against k" xFormat={v => String(Math.round(Math.exp(v)))}>{({ X, Y }) => <>
        <Path X={X} Y={Y} points={curve.map(([kk, tr]) => [Math.log(kk), tr])} stroke="var(--chart-train)" />
        <Path X={X} Y={Y} points={curve.map(([kk, , va]) => [Math.log(kk), va])} stroke="var(--chart-val)" />
        {curve.map(([kk, , va]) => <circle key={kk} cx={X(Math.log(kk))} cy={Y(va)} r="3.5" fill="var(--chart-val)" />)}
      </>}</Plot>
      <Insight title="Small k versus large k">k = 1 reproduces every training label (training accuracy 100%) and draws a jagged boundary around individual points — high variance. Large k averages over big regions and eventually predicts the majority class everywhere — high bias. Choose k by validation, as with polynomial degree in Lab 07. Odd k avoids ties for two classes.</Insight>
    </>}
    {view === 'curse' && <>
      <Plot x={[0, Math.log(300)]} y={[0, Math.log10(Math.max(...dims.map(([, c]) => c.ratio)) * 1.2)]} xLabel="number of features d (log scale)" yLabel="farthest / nearest distance (log)" label="Distance contrast against dimension" xFormat={v => String(Math.round(Math.exp(v)))} yFormat={v => (10 ** v).toPrecision(2)}>{({ X, Y }) => <>
        <Path X={X} Y={Y} points={dims.map(([d, c]) => [Math.log(d), Math.log10(c.ratio)])} />
        {dims.map(([d, c]) => <circle key={d} cx={X(Math.log(d))} cy={Y(Math.log10(c.ratio))} r="4" fill="var(--chart-model)" />)}
      </>}</Plot>
      <Metrics items={dims.filter(([d]) => [1, 10, 100, 300].includes(d)).map(([d, c]) => [`d = ${d}`, `${fmt(c.ratio, 2)}×`])} />
      <Insight title="Nearest stops meaning near">400 random points in a unit cube, one random query. In 1–2 dimensions the farthest point is hundreds of times farther than the nearest. By 100 dimensions the ratio is barely above 1: every point is about equally far away, so “nearest” carries little information. Distance-based methods need few, relevant, well-scaled features — or learned representations (Lab 25).</Insight>
    </>}
  </>
}
