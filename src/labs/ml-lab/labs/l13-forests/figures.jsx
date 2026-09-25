// Figures placed between the paragraphs of Lab 13 (13.1–13.5).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Radio, Readout, Bars, MiniPlot, Path, Dots, HLine, VLine, curve, Table, ProbabilityField, ClassDots, r } from '../../kit/fig.jsx'
import { bootstrapIndices, fitForest, forestProb, accuracy, oobAccuracy, growthCurve, treeCorrelation, averageVariance } from './engine.js'
import { buildTree, predict, toRows } from '../l12-trees/engine.js'
import { classification, split } from '../../kit/datasets.js'
import { random, normal, range, mean } from '../../kit/math.js'

const MOONS = split(classification('moons', { n: 260, noise: 0.35, seed: 13 }), 0.7, 13)
const TR = toRows(MOONS.train), VA = toRows(MOONS.validation), BOX = { x0: -2.6, x1: 2.6, y0: -1.9, y1: 1.9 }
const FOREST = fitForest(TR, { trees: 100, maxDepth: 10, seed: 1 })
function Field({ p, width = 300, height = 230, label }) {
  return <MiniPlot width={width} height={height} x={[BOX.x0, BOX.x1]} y={[BOX.y0, BOX.y1]} xLabel="x₁" yLabel="x₂" label={label}>{({ X, Y }) => <><ProbabilityField X={X} Y={Y} {...BOX} cells={30} p={p} /><ClassDots X={X} Y={Y} points={MOONS.train} r={2} /></>}</MiniPlot>
}

// ---------- 13.1 ----------
export function AverageVarianceFig() {
  const [rho, setRho] = useState(0.3), [s2, setS2] = useState(1), [T, setT] = useState(10)
  return <div>
    <Controls><Slider label="correlation ρ" value={rho} min={0} max={1} step={0.05} onChange={setRho} /><Slider label="σ² of one tree" value={s2} min={0.2} max={2} step={0.1} onChange={setS2} digits={1} /><Slider label="trees T" value={T} min={1} max={100} step={1} onChange={setT} digits={0} /></Controls>
    <MiniPlot x={[1, 100]} y={[0, s2 * 1.05]} xLabel="number of trees T" yLabel="variance of the average" label={`Variance ${r(averageVariance(s2, rho, T), 3)} at T = ${T}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(t => averageVariance(s2, rho, t), 1, 100)} />
      <HLine X={X} Y={Y} y={rho * s2} x0={1} x1={100} />
      <Dots X={X} Y={Y} points={[[T, averageVariance(s2, rho, T)]]} color="var(--chart-val)" rad={5} />
    </>}</MiniPlot>
    <Readout>ρσ² + (1 − ρ)σ²/T = {r(rho * s2, 3)} + {r((1 - rho) * s2 / T, 3)} = <strong>{r(averageVariance(s2, rho, T), 3)}</strong>. However many trees, the variance never drops below ρσ² = {r(rho * s2, 3)} (dashed): the shared part of their errors.</Readout>
  </div>
}

export function TreesVersusAverage() {
  const [T, setT] = useState(30)
  return <div>
    <Controls><Slider label="trees averaged" value={T} min={1} max={100} step={1} onChange={setT} digits={0} /></Controls>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {[0, 1].map(k => <div key={k} style={{ flex: '1 1 200px' }}><Field width={260} height={210} p={(a, b) => predict(FOREST[k].tree, [a, b])} label={`Bootstrap tree ${k + 1}`} /><p className="ml-caption">one deep tree ({r(accuracy([FOREST[k]], VA) * 100, 1)}% validation)</p></div>)}
      <div style={{ flex: '1 1 200px' }}><Field width={260} height={210} p={(a, b) => forestProb(FOREST, [a, b], T)} label={`Average of ${T} trees`} /><p className="ml-caption">average of {T} ({r(accuracy(FOREST, VA, T) * 100, 1)}% validation)</p></div>
    </div>
    <Readout>Each deep tree carves jagged islands in different places; their average keeps what they agree on and smooths the rest.</Readout>
  </div>
}

// ---------- 13.2 ----------
export function BootstrapDraw() {
  const [seed, setSeed] = useState(1), n = 12, idx = bootstrapIndices(n, random(seed)), counts = range(n).map(i => idx.filter(j => j === i).length)
  return <div>
    <Controls><button onClick={() => setSeed(s => s + 1)}>Draw another bootstrap sample</button></Controls>
    <Bars items={counts.map((c, i) => ({ label: `row ${i}`, value: c, color: c ? undefined : '#ef4444' }))} min={0} max={4} digits={0} height={120} label="Times each row was drawn" />
    <Readout>{counts.filter(c => !c).length} of {n} rows were never drawn (red): this tree’s out-of-bag rows. Theory: (1 − 1/n)ⁿ = {r((1 - 1 / n) ** n, 4)} of rows on average, approaching e⁻¹ ≈ 0.368 for large n.</Readout>
  </div>
}

const REG = (() => { const rng = random(5); return range(60).map(() => { const x = 6 * rng(); return { x: [x], y: Math.sin(x) + 0.3 * x + 0.3 * normal(rng) } }) })()
export function BaggedLinesVersusTrees() {
  const [kind, setKind] = useState('tree'), fits = useMemo(() => range(6).map(k => { const rng = random(40 + k), sample = bootstrapIndices(REG.length, rng).map(i => REG[i])
    if (kind === 'tree') { const t = buildTree(sample, { maxDepth: 8, criterion: 'mse' }); return x => predict(t, [x]) }
    const mx = mean(sample.map(p => p.x[0])), my = mean(sample.map(p => p.y)), w = sample.reduce((s, p) => s + (p.x[0] - mx) * (p.y - my), 0) / sample.reduce((s, p) => s + (p.x[0] - mx) ** 2, 0); return x => my + w * (x - mx) }), [kind])
  const spread = mean(range(30).map(i => { const x = 0.1 + i * 0.2, v = fits.map(f => f(x)), m = mean(v); return mean(v.map(u => (u - m) ** 2)) }))
  return <div>
    <Controls><Radio name="bagkind" value={kind} onChange={setKind} options={[['tree', 'deep regression trees'], ['line', 'straight lines']]} /></Controls>
    <MiniPlot x={[0, 6]} y={[-1.5, 3.5]} xLabel="x" yLabel="y" label="Six bootstrap fits">{({ X, Y }) => <>
      <Dots X={X} Y={Y} points={REG.map(p => [p.x[0], p.y])} rad={2.2} color="var(--muted)" />
      {fits.map((f, i) => <Path key={i} X={X} Y={Y} points={curve(f, 0, 6, 300)} width={1.2} opacity={0.7} stroke={`hsl(${i * 55}, 65%, 50%)`} />)}
    </>}</MiniPlot>
    <Readout>Six fits on six bootstrap samples; average variance between them = <strong>{r(spread, 4)}</strong>. {kind === 'tree' ? 'Deep trees disagree a lot: plenty of variance for averaging to remove.' : 'The lines barely differ — averaging them changes almost nothing.'}</Readout>
  </div>
}

export function BaggedGrowth() {
  const [T, setT] = useState(1), single = accuracy([FOREST[0]], VA)
  return <div>
    <Controls><Slider label="trees in the bag" value={T} min={1} max={100} step={1} onChange={setT} digits={0} /></Controls>
    <Field width={460} height={250} p={(a, b) => forestProb(FOREST, [a, b], T)} label={`Bagged forest of ${T} trees`} />
    <Readout>{T} bagged deep trees: validation accuracy <strong>{r(accuracy(FOREST, VA, T) * 100, 1)}%</strong> (a single tree: {r(single * 100, 1)}%).</Readout>
  </div>
}

// ---------- 13.3 ----------
const SIX = (() => { const rng = random(31), make = n => range(n).map(() => { const x = range(6).map(() => normal(rng)); return { x, y: 1.5 * x[0] + 0.6 * x[1] + 0.6 * x[2] + 0.4 * x[3] + 0.8 * normal(rng) > 0 ? 1 : 0 } }); return { train: make(300), val: make(400) } })()
export function DecorrelateTrees() {
  const [mf, setMf] = useState('6'), m = Number(mf)
  const res = useMemo(() => { const f = fitForest(SIX.train, { trees: 60, maxDepth: 8, maxFeatures: m === 6 ? undefined : m, seed: 3 }); return { corr: treeCorrelation(f, SIX.val, 15), acc: accuracy(f, SIX.val), single: mean(f.slice(0, 15).map(t => accuracy([t], SIX.val))) } }, [m])
  return <div>
    <Controls><Radio name="maxfeat" value={mf} onChange={setMf} options={[['6', 'all 6 features (bagging)'], ['2', '2 random features per split'], ['1', '1 random feature per split']]} /></Controls>
    <Bars items={[{ label: 'mean tree correlation ρ', value: res.corr, color: 'var(--chart-val)' }, { label: 'one tree’s accuracy', value: res.single, color: 'var(--muted)' }, { label: 'forest of 60 accuracy', value: res.acc, highlight: true }]} min={0} max={1} digits={3} />
    <Readout>Six features, one of them strong. Mean correlation between trees: <strong>{r(res.corr, 3)}</strong>; one tree {r(res.single * 100, 1)}%, the forest of 60 <strong>{r(res.acc * 100, 1)}%</strong>. Compare the three settings: fewer features per split → less correlated, individually weaker trees → a better average.</Readout>
  </div>
}

// ---------- 13.4 ----------
export function OobShare() {
  const [n, setN] = useState(4)
  return <div>
    <Controls><Slider label="rows n" value={n} min={1} max={200} step={1} onChange={setN} digits={0} /></Controls>
    <MiniPlot x={[1, 200]} y={[0, 0.45]} xLabel="n" yLabel="P(row never drawn)" label={`(1 − 1/n)^n = ${r((1 - 1 / n) ** n, 4)}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={range(200).map(i => [i + 1, (1 - 1 / (i + 1)) ** (i + 1)])} />
      <HLine X={X} Y={Y} y={Math.exp(-1)} x0={1} x1={200} />
      <Dots X={X} Y={Y} points={[[n, (1 - 1 / n) ** n]]} color="var(--chart-val)" rad={5} />
    </>}</MiniPlot>
    <Readout>(1 − 1/{n})^{n} = <strong>{r((1 - 1 / n) ** n, 4)}</strong>; the dashed line is e⁻¹ ≈ 0.3679.</Readout>
  </div>
}

export function OobVersusValidation() {
  const g = useMemo(() => growthCurve(FOREST, TR, VA), [])
  return <div>
    <MiniPlot x={[1, 100]} y={[0.75, 1]} xLabel="trees" yLabel="accuracy" label="Out-of-bag and validation accuracy as trees are added">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={g.map(p => [p.trees, p.val])} stroke="var(--chart-val)" />
      <Path X={X} Y={Y} points={g.filter(p => Number.isFinite(p.oob)).map(p => [p.trees, p.oob])} stroke="var(--chart-train)" />
    </>}</MiniPlot>
    <Readout>Blue: out-of-bag accuracy, computed from training rows only. Orange: true validation accuracy. With 100 trees: OOB {r(g[g.length - 1].oob * 100, 1)}%, validation {r(g[g.length - 1].val * 100, 1)}%. Both rise and flatten; more trees stop helping but do not hurt.</Readout>
  </div>
}

// ---------- 13.5 ----------
export function ForestExtrapolation() {
  const forest = useMemo(() => fitForest(REG, { trees: 40, maxDepth: 6, criterion: 'mse', seed: 2 }), [])
  return <div>
    <MiniPlot x={[-2, 9]} y={[-1.5, 4]} xLabel="x (training data only between 0 and 6)" yLabel="y" label="Regression forest beyond the data">{({ X, Y }) => <>
      <Dots X={X} Y={Y} points={REG.map(p => [p.x[0], p.y])} rad={2.2} />
      <Path X={X} Y={Y} points={curve(x => forestProb(forest, [x]), -2, 9, 400)} stroke="var(--chart-val)" />
      <Path X={X} Y={Y} points={curve(x => Math.sin(x) + 0.3 * x, -2, 9)} stroke="var(--muted)" dash="4 3" width={1.2} />
      <VLine X={X} Y={Y} x={6} y0={-1.5} y1={4} /><VLine X={X} Y={Y} x={0} y0={-1.5} y1={4} />
    </>}</MiniPlot>
    <Readout>Inside the data the forest (orange) follows the curve. Outside it predicts a constant: {r(forestProb(forest, [9]), 3)} at x = 9, where the true trend (grey) is {r(Math.sin(9) + 2.7, 3)}. Every leaf is an average of training targets.</Readout>
  </div>
}
