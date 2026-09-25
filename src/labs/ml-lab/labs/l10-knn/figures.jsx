// Figures placed between the paragraphs of Lab 10 (10.1–10.5).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Check, Radio, Readout, Bars, MiniPlot, Path, Dots, curve, Table, ProbabilityField, ClassDots, r } from '../../kit/fig.jsx'
import { distance, neighbours, knnProb, accuracy, inUnits, standardizer, distanceContrast } from './engine.js'
import { classification, split } from '../../kit/datasets.js'
import { random, normal, range, mean, shuffle } from '../../kit/math.js'

const MOONS = split(classification('moons', { n: 220, noise: 0.3, seed: 4 }), 0.7, 4)
const BOX = { x0: -2.6, x1: 2.6, y0: -1.9, y1: 1.9 }

// ---------- 10.1 ----------
export function QueryNeighbours() {
  const [qx, setQx] = useState(0.3), [qy, setQy] = useState(0.2), [k, setK] = useState(5)
  const nb = neighbours(MOONS.train, [qx, qy], k)
  return <div>
    <Controls><Slider label="query x₁" value={qx} min={-2.4} max={2.4} step={0.05} onChange={setQx} /><Slider label="query x₂" value={qy} min={-1.7} max={1.7} step={0.05} onChange={setQy} /><Slider label="k" value={k} min={1} max={25} step={1} onChange={setK} digits={0} /></Controls>
    <MiniPlot x={[BOX.x0, BOX.x1]} y={[BOX.y0, BOX.y1]} xLabel="x₁" yLabel="x₂" label={`Query with ${k} nearest neighbours; vote ${r(nb.vote, 2)}`}>{({ X, Y }) => <>
      <ClassDots X={X} Y={Y} points={MOONS.train} r={3} />
      {nb.near.map(n => <line key={n.i} x1={X(qx)} y1={Y(qy)} x2={X(MOONS.train[n.i].x1)} y2={Y(MOONS.train[n.i].x2)} stroke="var(--text)" strokeWidth="1.2" />)}
      <circle cx={X(qx)} cy={Y(qy)} r={7} fill="none" stroke="var(--text)" strokeWidth="2.5" />
    </>}</MiniPlot>
    <Readout>{k} nearest: {nb.near.filter(n => n.label).length} of class 1 (orange), {nb.near.filter(n => !n.label).length} of class 0. Class-1 share = <strong>{r(nb.vote, 3)}</strong> → predict class {nb.vote > 0.5 ? 1 : nb.vote < 0.5 ? 0 : '(tie)'}. Farthest neighbour used: distance {r(nb.near[nb.near.length - 1].d, 3)}.</Readout>
  </div>
}

// ---------- 10.2 ----------
export function DistanceShapes() {
  const [bx, setBx] = useState(4), [by, setBy] = useState(6), a = [1, 2], e = distance(a, [bx, by]), m = distance(a, [bx, by], 'manhattan')
  const circle = range(73).map(i => { const t = 2 * Math.PI * i / 72; return [a[0] + e * Math.cos(t), a[1] + e * Math.sin(t)] })
  const diamond = [[a[0] + m, a[1]], [a[0], a[1] + m], [a[0] - m, a[1]], [a[0], a[1] - m], [a[0] + m, a[1]]]
  return <div>
    <Controls><Slider label="b₁" value={bx} min={-4} max={8} step={0.5} onChange={setBx} digits={1} /><Slider label="b₂" value={by} min={-4} max={8} step={0.5} onChange={setBy} digits={1} /></Controls>
    <MiniPlot x={[-9, 11]} y={[-8, 12]} width={330} height={320} xLabel="x₁" yLabel="x₂" label="Points at equal Euclidean and Manhattan distance">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={circle} stroke="var(--chart-train)" width={1.5} />
      <Path X={X} Y={Y} points={diamond} stroke="var(--chart-val)" width={1.5} />
      <Path X={X} Y={Y} points={[a, [bx, by]]} stroke="var(--text)" dash="3 3" width={1} />
      <Dots X={X} Y={Y} points={[[a[0], a[1], 5, 'var(--text)'], [bx, by, 5, 'var(--chart-model)']]} />
    </>}</MiniPlot>
    <Readout>a = (1, 2), b = ({bx}, {by}). Euclidean √(({bx} − 1)² + ({by} − 2)²) = <strong>{r(e, 3)}</strong> (every point on the blue circle is this far); Manhattan |{bx} − 1| + |{by} − 2| = <strong>{r(m, 3)}</strong> (the orange diamond).</Readout>
  </div>
}

export function UnitsStripes() {
  const [factor, setFactor] = useState('1000'), [std, setStd] = useState(false), f = Number(factor)
  const train = useMemo(() => inUnits(MOONS.train, f), [f]), val = useMemo(() => inUnits(MOONS.validation, f), [f]), scale = std ? standardizer(train) : [1, 1]
  const p = knnProb(train, 7, 'euclidean', scale), acc = accuracy(train, val, 7, 'euclidean', scale)
  return <div>
    <Controls><Radio name="units" value={factor} onChange={setFactor} options={[['1', 'x₂ in its own units'], ['1000', 'x₂ × 1000']]} /><Check label="standardize with training statistics" checked={std} onChange={setStd} /></Controls>
    <MiniPlot x={[BOX.x0, BOX.x1]} y={[BOX.y0, BOX.y1]} xLabel="x₁" yLabel="x₂ (plotted in original units)" label={`7-NN regions, validation accuracy ${r(acc, 3)}`}>{({ X, Y }) => <>
      <ProbabilityField X={X} Y={Y} {...BOX} cells={34} p={(a, b) => p(a, b * f)} />
      <ClassDots X={X} Y={Y} points={MOONS.train} r={2.5} />
    </>}</MiniPlot>
    <Readout>7-NN validation accuracy <strong>{r(acc * 100, 1)}%</strong>. {f === 1000 && !std ? 'With x₂ a thousand times larger, distance is almost pure x₂ difference: the regions become horizontal stripes.' : std ? 'Standardized: each feature counts per standard deviation, whatever its units.' : 'Both features in comparable units.'}</Readout>
  </div>
}

// ---------- 10.3 ----------
export function ChooseK() {
  const [k, setK] = useState(1), p = knnProb(MOONS.train, k), trainAcc = accuracy(MOONS.train, MOONS.train, k), valAcc = accuracy(MOONS.train, MOONS.validation, k)
  const ks = [1, 3, 5, 7, 9, 13, 17, 25, 35, 51, 75, 101], vc = useMemo(() => ks.map(kk => [kk, accuracy(MOONS.train, MOONS.train, kk), accuracy(MOONS.train, MOONS.validation, kk)]), []) // eslint-disable-line react-hooks/exhaustive-deps
  return <div>
    <Controls><Slider label="k" value={k} min={1} max={101} step={2} onChange={setK} digits={0} /></Controls>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <div style={{ flex: '1 1 240px' }}><MiniPlot width={300} height={250} x={[BOX.x0, BOX.x1]} y={[BOX.y0, BOX.y1]} xLabel="x₁" yLabel="x₂" label={`Decision regions for k = ${k}`}>{({ X, Y }) => <><ProbabilityField X={X} Y={Y} {...BOX} cells={30} p={p} /><ClassDots X={X} Y={Y} points={MOONS.train} r={2.2} /></>}</MiniPlot></div>
      <div style={{ flex: '1 1 240px' }}><MiniPlot width={300} height={250} x={[1, 101]} y={[0.5, 1]} xLabel="k" yLabel="accuracy" label="Training and validation accuracy against k">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={vc.map(v => [v[0], v[1]])} stroke="var(--chart-train)" />
        <Path X={X} Y={Y} points={vc.map(v => [v[0], v[2]])} stroke="var(--chart-val)" />
        <Dots X={X} Y={Y} points={[[k, valAcc]]} color="var(--chart-val)" rad={5} />
      </>}</MiniPlot></div>
    </div>
    <Readout>k = {k}: training accuracy {r(trainAcc * 100, 1)}% (blue), validation {r(valAcc * 100, 1)}% (orange). k = 1 memorizes (100% training); very large k blurs the moons together.</Readout>
  </div>
}

// ---------- 10.4 ----------
export function DistanceConcentration() {
  const [d, setD] = useState(2), ds = [1, 2, 3, 5, 10, 20, 50, 100, 300], rows = useMemo(() => ds.map(dd => [dd, distanceContrast(dd).ratio]), []) // eslint-disable-line react-hooks/exhaustive-deps
  const now = distanceContrast(d)
  return <div>
    <Controls><Slider label="dimensions d" value={d} min={1} max={300} step={1} onChange={setD} digits={0} /></Controls>
    <MiniPlot x={[0, Math.log10(300)]} y={[0, Math.log10(Math.max(...rows.map(x => x[1])) + 1)]} xLabel="log₁₀ dimensions" yLabel="log₁₀ (farthest / nearest)" label="Distance contrast against dimension">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={rows.map(([dd, ratio]) => [Math.log10(dd), Math.log10(ratio)])} />
      <Dots X={X} Y={Y} points={[[Math.log10(d), Math.log10(now.ratio)]]} color="var(--chart-val)" rad={5} />
    </>}</MiniPlot>
    <Readout>400 uniform points in d = {d}: nearest {r(now.min, 3)}, farthest {r(now.max, 3)}, ratio <strong>{r(now.ratio, 3)}</strong>. In high dimensions every point is about equally far away.</Readout>
  </div>
}

export function NeighbourhoodSide() {
  const [frac, setFrac] = useState(0.1), ds = [1, 2, 3, 5, 10, 20, 50, 100]
  return <div>
    <Controls><Slider label="share of the data to capture" value={frac} min={0.001} max={0.5} step={0.001} onChange={setFrac} digits={3} /></Controls>
    <Bars items={ds.map(d => ({ label: `d=${d}`, value: frac ** (1 / d) }))} min={0} max={1} digits={2} label="Side length of a cube holding that share" />
    <Readout>side = share^(1/d). Capturing {r(frac * 100, 1)}% of uniform data needs {r(frac ** 0.1, 2)} of each feature’s range in 10D — hardly “local”.</Readout>
  </div>
}

function withNoise(m, seed = 3) {
  const rng = random(seed), make = n => range(n).map(i => { const y = i % 2, base = [(y ? 0.8 : -0.8) + 0.7 * normal(rng), (y ? 0.5 : -0.5) + 0.7 * normal(rng)]; return { x: [...base, ...range(m).map(() => 3 * (rng() - 0.5))], y } })
  return { train: make(200), test: make(200) }
}
export function IrrelevantFeatures() {
  const [m, setM] = useState(0), ms = [0, 2, 5, 10, 20, 50]
  const accFor = mm => { const { train, test } = withNoise(mm); return mean(test.map(q => { const d = train.map(p => [p.x.reduce((t, v, j) => t + (v - q.x[j]) ** 2, 0), p.y]).sort((a, b) => a[0] - b[0]).slice(0, 5); return (mean(d.map(v => v[1])) > 0.5 ? 1 : 0) === q.y ? 1 : 0 })) }
  const rows = useMemo(() => ms.map(mm => [mm, accFor(mm)]), []) // eslint-disable-line react-hooks/exhaustive-deps
  const cur = rows.find(x => x[0] === m)
  return <div>
    <Controls><Radio name="noisefeat" value={String(m)} onChange={v => setM(Number(v))} options={ms.map(mm => [String(mm), `${mm} noise`])} /></Controls>
    <Bars items={rows.map(([mm, a]) => ({ label: `+${mm}`, value: a, highlight: mm === m }))} min={0.4} max={1} digits={3} label="5-NN test accuracy with added noise features" />
    <Readout>Two useful features plus {m} uniform noise features: 5-NN test accuracy <strong>{r(cur[1] * 100, 1)}%</strong>. Every noise feature adds random amounts to every distance.</Readout>
  </div>
}

// ---------- 10.5 ----------
export function NeighbourTable() {
  const [qx, setQx] = useState(0.9), [qy, setQy] = useState(0.1), nb = neighbours(MOONS.train, [qx, qy], 7)
  return <div>
    <Controls><Slider label="query x₁" value={qx} min={-2.4} max={2.4} step={0.05} onChange={setQx} /><Slider label="query x₂" value={qy} min={-1.7} max={1.7} step={0.05} onChange={setQy} /></Controls>
    <Table head={['rank', 'training row', 'label', 'distance']} rows={nb.near.map((n, i) => [i + 1, n.i, n.label, r(n.d, 3)])} label="The evidence behind one prediction" />
    <Readout>Prediction: class-1 share {r(nb.vote, 3)}. Each row is a real training example you can open and check — the prediction’s full justification.</Readout>
  </div>
}

export function NearDuplicateLeak() {
  const [grouped, setGrouped] = useState(false)
  const data = useMemo(() => { const rng = random(8), base = range(60).map(g => ({ g, x: [normal(rng), normal(rng)], y: rng() < 0.5 ? 1 : 0 })); return base.flatMap(b => [0, 1, 2].map(() => ({ ...b, x: [b.x[0] + 0.02 * normal(rng), b.x[1] + 0.02 * normal(rng)] }))) }, [])
  const acc = useMemo(() => { const groups = shuffle(range(60), random(9)), testG = new Set(groups.slice(0, 20)), order = shuffle(range(data.length), random(10))
    const isTest = i => (grouped ? testG.has(data[i].g) : order.indexOf(i) < 60), train = data.filter((_, i) => !isTest(i)), test = data.filter((_, i) => isTest(i))
    return mean(test.map(q => { let best = train[0], bd = Infinity; train.forEach(p => { const d = (p.x[0] - q.x[0]) ** 2 + (p.x[1] - q.x[1]) ** 2; if (d < bd) { bd = d; best = p } }); return best.y === q.y ? 1 : 0 })) }, [grouped, data])
  return <div>
    <Controls><Radio name="dupsplit" value={grouped ? 'g' : 'r'} onChange={v => setGrouped(v === 'g')} options={[['r', 'random split of rows'], ['g', 'split by original item']]} /></Controls>
    <Readout>60 items with <strong>random</strong> labels, each recorded three times with tiny noise. 1-NN accuracy: <strong>{r(acc * 100, 1)}%</strong>. {grouped ? 'With whole items held out, the labels are unpredictable, as they should be.' : 'With rows shuffled, each test row’s twin is in training: near-perfect accuracy on labels that are pure noise.'}</Readout>
  </div>
}

export function PredictionCost() {
  const [n, setN] = useState(4), [d, setD] = useState(20), rows = 10 ** n, ops = rows * d
  return <div>
    <Controls><Slider label="stored rows = 10^" value={n} min={2} max={8} step={1} onChange={setN} digits={0} /><Slider label="features d" value={d} min={1} max={1000} step={1} onChange={setD} digits={0} /></Controls>
    <Readout>One query = {rows.toLocaleString()} × {d} = <strong>{ops.toLocaleString()}</strong> feature differences. At roughly 10⁹ simple operations per second, about {r(ops / 1e6, 3)} ms per query — before any index.</Readout>
  </div>
}
