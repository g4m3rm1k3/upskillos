// Figures placed between the paragraphs of Lab 12 (12.1–12.6).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Radio, Readout, Bars, MiniPlot, Path, Dots, VLine, curve, Table, ClassDots, r } from '../../kit/fig.jsx'
import { gini, entropy, splitScan, buildTree, predict, path, leaves, regions, toRows, accuracy } from './engine.js'
import { classification, split } from '../../kit/datasets.js'
import { random, normal, range, mean, shuffle } from '../../kit/math.js'

const MOONS = split(classification('moons', { n: 260, noise: 0.3, seed: 12 }), 0.7, 12)
const TR = toRows(MOONS.train), VA = toRows(MOONS.validation), BOX = { x0: -2.6, x1: 2.6, y0: -1.9, y1: 1.9 }
const NAMES = ['x₁', 'x₂']
function Regions({ tree, points, highlight, box = BOX, width = 460, height = 260 }) {
  const rs = regions(tree, box)
  return <MiniPlot width={width} height={height} x={[box.x0, box.x1]} y={[box.y0, box.y1]} xLabel="x₁" yLabel="x₂" label={`Tree with ${rs.length} leaves`}>{({ X, Y }) => <>
    {rs.map((g, i) => <rect key={i} x={X(g.x0)} y={Y(g.y1)} width={X(g.x1) - X(g.x0)} height={Y(g.y0) - Y(g.y1)} fill={g.value >= 0.5 ? 'var(--chart-val)' : 'var(--chart-train)'} opacity={0.08 + 0.3 * Math.abs(g.value - 0.5) * 2} stroke={highlight === g.node ? 'var(--text)' : 'var(--border)'} strokeWidth={highlight === g.node ? 2.5 : 0.5} />)}
    <ClassDots X={X} Y={Y} points={points} r={2.4} />
  </>}</MiniPlot>
}

// ---------- 12.1 ----------
export function TreePath() {
  const [depth, setDepth] = useState(3), [qx, setQx] = useState(0.2), [qy, setQy] = useState(0.1)
  const tree = useMemo(() => buildTree(TR, { maxDepth: depth }), [depth]), steps = path(tree, [qx, qy]), leaf = steps[steps.length - 1]
  return <div>
    <Controls><Slider label="max depth" value={depth} min={1} max={6} step={1} onChange={setDepth} digits={0} /><Slider label="point x₁" value={qx} min={-2.4} max={2.4} step={0.05} onChange={setQx} /><Slider label="point x₂" value={qy} min={-1.7} max={1.7} step={0.05} onChange={setQy} /></Controls>
    <Regions tree={tree} points={MOONS.train} highlight={leaf} />
    <Readout>{steps.slice(0, -1).map((n, i) => { const v = [qx, qy][n.split.feature], left = v <= n.split.threshold; return <span key={i}>{NAMES[n.split.feature]} = {r(v, 2)} {left ? '≤' : '>'} {r(n.split.threshold, 2)} → {left ? 'left' : 'right'}; </span> })}leaf: <strong>{r(leaf.value * 100, 0)}% class 1</strong> ({leaf.n} training points). {leaves(tree).length} leaves = rectangles.</Readout>
  </div>
}

// ---------- 12.2 ----------
export function ImpurityCurves() {
  const [p, setP] = useState(0.5)
  return <div>
    <Controls><Slider label="class-1 share p" value={p} min={0} max={1} step={0.01} onChange={setP} /></Controls>
    <MiniPlot x={[0, 1]} y={[0, 1.05]} xLabel="p" yLabel="impurity" label={`Gini ${r(2 * p * (1 - p), 3)}, entropy ${r(entropy([...Array(Math.round(p * 100)).fill(1), ...Array(100 - Math.round(p * 100)).fill(0)]), 3)}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(q => 2 * q * (1 - q), 0, 1)} />
      <Path X={X} Y={Y} points={curve(q => (q <= 0 || q >= 1 ? 0 : -q * Math.log2(q) - (1 - q) * Math.log2(1 - q)), 0, 1)} stroke="var(--chart-val)" />
      <VLine X={X} Y={Y} x={p} y0={0} y1={1.05} />
    </>}</MiniPlot>
    <Readout>Gini 2p(1 − p) = <strong>{r(2 * p * (1 - p), 4)}</strong> (purple); entropy = <strong>{r(p <= 0 || p >= 1 ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p), 4)} bits</strong> (orange). Both are 0 for a pure node and largest at 50/50.</Readout>
  </div>
}

export function SplitGain() {
  const [l0, setL0] = useState(4), [l1, setL1] = useState(1), total0 = 5, total1 = 5
  const parent = [...Array(total0).fill(0), ...Array(total1).fill(1)], left = [...Array(l0).fill(0), ...Array(l1).fill(1)], right = [...Array(total0 - l0).fill(0), ...Array(total1 - l1).fill(1)]
  const w = (left.length * gini(left) + right.length * gini(right)) / parent.length
  return <div>
    <Controls><Slider label="class-0 points sent left" value={l0} min={0} max={5} step={1} onChange={setL0} digits={0} /><Slider label="class-1 points sent left" value={l1} min={0} max={5} step={1} onChange={setL1} digits={0} /></Controls>
    <Table head={['node', 'labels', 'Gini']} rows={[['parent', '5 × 0, 5 × 1', r(gini(parent), 3)], [`left (${left.length})`, `${l0} × 0, ${l1} × 1`, r(gini(left), 3)], [`right (${right.length})`, `${total0 - l0} × 0, ${total1 - l1} × 1`, r(gini(right), 3)]]} label="Impurity of a split" />
    <Readout>weighted child impurity = ({left.length}·{r(gini(left), 3)} + {right.length}·{r(gini(right), 3)})/10 = {r(w, 4)}; gain = 0.5 − {r(w, 4)} = <strong>{r(0.5 - w, 4)}</strong>. Perfect separation (5/0 and 0/5) gives the maximum, 0.5.</Readout>
  </div>
}

// ---------- 12.3 ----------
export function ThresholdScan() {
  const [f, setF] = useState('0'), feature = Number(f), scan = useMemo(() => splitScan(TR, feature), [feature]), best = scan.candidates.reduce((a, b) => (b.gain > a.gain ? b : a))
  return <div>
    <Controls><Radio name="scanf" value={f} onChange={setF} options={[['0', 'feature x₁'], ['1', 'feature x₂']]} /></Controls>
    <MiniPlot x={feature ? [-1.9, 1.9] : [-2.6, 2.6]} y={[0, 0.55]} xLabel={`threshold on ${NAMES[feature]}`} yLabel="weighted Gini" label={`Best threshold ${r(best.threshold, 3)}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={scan.candidates.map(c => [c.threshold, c.weighted])} />
      <Dots X={X} Y={Y} points={[[best.threshold, best.weighted, 5]]} color="var(--chart-val)" />
      <Dots X={X} Y={Y} points={TR.map((row, i) => [row.x[feature], 0.02 + 0.03 * (i % 3), 2, row.y ? 'var(--chart-val)' : 'var(--chart-train)'])} opacity={0.5} />
    </>}</MiniPlot>
    <Readout>{scan.candidates.length} candidate thresholds (midpoints between sorted values; the dots along the bottom are the points). Parent Gini {r(scan.parent, 4)}; best split {NAMES[feature]} ≤ {r(best.threshold, 3)}: weighted Gini {r(best.weighted, 4)}, gain <strong>{r(best.gain, 4)}</strong>.</Readout>
  </div>
}

const XOR = toRows(classification('xor', { n: 300, seed: 3, noise: 0.2 }))
export function XorGreedy() {
  const [depth, setDepth] = useState(1), tree = useMemo(() => buildTree(XOR, { maxDepth: depth }), [depth])
  const gains = [0, 1].map(f => Math.max(...splitScan(XOR, f).candidates.map(c => c.gain)))
  const ideal = mean(XOR.map(q => (((q.x[0] > 0) !== (q.x[1] > 0) ? 1 : 0) === q.y ? 1 : 0)))
  return <div>
    <Controls><Slider label="max depth" value={depth} min={1} max={6} step={1} onChange={setDepth} digits={0} /></Controls>
    <Regions tree={tree} points={XOR.map(q => ({ x1: q.x[0], x2: q.x[1], label: q.y }))} box={{ x0: -2.3, x1: 2.3, y0: -2.3, y1: 2.3 }} width={330} height={300} />
    <Readout>Best possible root gain: x₁ {r(gains[0], 4)}, x₂ {r(gains[1], 4)} — near zero, because any single cut leaves both classes mixed on each side. Greedy picked <strong>{NAMES[tree.split.feature]} ≤ {r(tree.split.threshold, 2)}</strong>, an almost useless question. Depth {depth}: accuracy <strong>{r(accuracy(tree, XOR) * 100, 1)}%</strong>. A hand-built depth-2 tree (x₁ ≤ 0, then x₂ ≤ 0) scores {r(ideal * 100, 1)}%; greedy needs depth 5 to catch up.</Readout>
  </div>
}

// ---------- 12.4 ----------
export function DepthCurve() {
  const [depth, setDepth] = useState(3), [minLeaf, setMinLeaf] = useState(1)
  const trees = useMemo(() => range(12).map(d => buildTree(TR, { maxDepth: d + 1, minLeaf })), [minLeaf]), tree = trees[depth - 1]
  return <div>
    <Controls><Slider label="max depth" value={depth} min={1} max={12} step={1} onChange={setDepth} digits={0} /><Slider label="min points per leaf" value={minLeaf} min={1} max={30} step={1} onChange={setMinLeaf} digits={0} /></Controls>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <div style={{ flex: '1 1 240px' }}><Regions tree={tree} points={MOONS.train} width={300} height={250} /></div>
      <div style={{ flex: '1 1 240px' }}><MiniPlot width={300} height={250} x={[1, 12]} y={[0.7, 1]} xLabel="max depth" yLabel="accuracy" label="Accuracy by depth">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={trees.map((t, i) => [i + 1, accuracy(t, TR)])} stroke="var(--chart-train)" />
        <Path X={X} Y={Y} points={trees.map((t, i) => [i + 1, accuracy(t, VA)])} stroke="var(--chart-val)" />
        <Dots X={X} Y={Y} points={[[depth, accuracy(tree, VA)]]} color="var(--chart-val)" rad={5} />
      </>}</MiniPlot></div>
    </div>
    <Readout>Depth {depth}, min leaf {minLeaf}: {leaves(tree).length} leaves; training {r(accuracy(tree, TR) * 100, 1)}% (blue), validation <strong>{r(accuracy(tree, VA) * 100, 1)}%</strong> (orange). Raise the minimum leaf size to stop tiny islands of noise.</Readout>
  </div>
}

export function RootInstability() {
  const [seed, setSeed] = useState(1), rows = useMemo(() => { const rng = random(seed); return TR.map(row => ({ ...row, x: row.x.map(v => v + 0.08 * normal(rng)) })) }, [seed]), tree = buildTree(rows, { maxDepth: 4 })
  const describe = n => (n.split ? `${NAMES[n.split.feature]} ≤ ${r(n.split.threshold, 2)}` : 'leaf')
  return <div>
    <Controls><button onClick={() => setSeed(s => s + 1)}>Nudge every point slightly (seed {seed})</button></Controls>
    <Regions tree={tree} points={MOONS.train} />
    <Readout>Root: <strong>{describe(tree)}</strong>; left child: {describe(tree.left ?? tree)}; right child: {describe(tree.right ?? tree)}. Tiny changes to the data (±0.08) can change the questions and the regions below them.</Readout>
  </div>
}

// ---------- 12.5 ----------
const REG = (() => { const rng = random(5); return range(80).map(() => { const x = 6 * rng(); return { x: [x], y: Math.sin(x) + 0.3 * x + 0.2 * normal(rng) } }) })()
export function RegressionSteps() {
  const [depth, setDepth] = useState(3), tree = useMemo(() => buildTree(REG, { maxDepth: depth, criterion: 'mse' }), [depth])
  return <div>
    <Controls><Slider label="max depth" value={depth} min={1} max={8} step={1} onChange={setDepth} digits={0} /></Controls>
    <MiniPlot x={[-1, 9]} y={[-1.5, 3.5]} xLabel="x (training data only between 0 and 6)" yLabel="y" label={`Regression tree of depth ${depth}`}>{({ X, Y }) => <>
      <Dots X={X} Y={Y} points={REG.map(p => [p.x[0], p.y])} rad={2.5} />
      <Path X={X} Y={Y} points={curve(x => predict(tree, [x]), -1, 9, 600)} stroke="var(--chart-val)" />
      <VLine X={X} Y={Y} x={6} y0={-1.5} y1={3.5} />
    </>}</MiniPlot>
    <Readout>{leaves(tree).length} flat steps, each the mean of its training points. Beyond x = 6 (dashed) there is no data, and the tree predicts {r(predict(tree, [9]), 3)} forever — it cannot extend the upward trend.</Readout>
  </div>
}

export function ImportanceCompare() {
  // A continuous feature and a yes/no feature both matter; the labels are noisy; the ID is pure noise with a
  // different value on every row — the kind of feature impurity importance over-credits.
  const data = useMemo(() => { const rng = random(15), make = n => range(n).map(() => { const a = normal(rng), b = rng() < 0.5 ? 1 : 0, id = rng(); return { x: [a, b, id], y: a + (b - 0.5) + normal(rng) > 0 ? 1 : 0 } }); return { train: make(300), val: make(300) } }, [])
  const tree = useMemo(() => buildTree(data.train, { maxDepth: 10 }), [data])
  const impurity = [0, 0, 0]; const walk = n => { if (!n.split) return; impurity[n.split.feature] += n.n * n.split.gain; walk(n.left); walk(n.right) }; walk(tree)
  const totalI = impurity.reduce((a, b) => a + b, 0), base = accuracy(tree, data.val)
  const perm = [0, 1, 2].map(f => { const col = shuffle(data.val.map(r2 => r2.x[f]), random(20 + f)); return base - accuracy(tree, data.val.map((r2, i) => ({ ...r2, x: r2.x.map((v, j) => (j === f ? col[i] : v)) }))) })
  const names = ['x₁ (strong)', 'x₂ (yes/no)', 'random ID']
  return <div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <div style={{ flex: '1 1 220px' }}><p className="ml-caption">Impurity importance: share of the total (training data)</p>
        <Bars items={names.map((n, i) => ({ label: n, value: impurity[i] / totalI, color: 'var(--chart-train)' }))} digits={3} height={150} width={300} label={`Impurity importance: ${names.map((n, i) => `${n} ${r(impurity[i] / totalI, 3)}`).join(', ')}`} /></div>
      <div style={{ flex: '1 1 220px' }}><p className="ml-caption">Permutation importance: accuracy drop in points (validation data)</p>
        <Bars items={names.map((n, i) => ({ label: n, value: 100 * perm[i], color: 'var(--chart-val)' }))} digits={1} height={150} width={300} label={`Permutation importance: ${names.map((n, i) => `${n} ${r(100 * perm[i], 1)} points`).join(', ')}`} /></div>
    </div>
    <Readout>A depth-10 tree on noisy labels. Impurity importance (training data) gives the random ID <strong>{r(100 * impurity[2] / totalI, 1)}%</strong> of the credit — more than the yes/no feature that really matters ({r(100 * impurity[1] / totalI, 1)}%), because a deep tree can split an ID anywhere to carve up noise. Permutation importance on validation data ranks them correctly: shuffling x₂ costs {r(perm[1] * 100, 1)} accuracy points, shuffling the ID {r(perm[2] * 100, 1)}.</Readout>
  </div>
}

// ---------- 12.6 ----------
const DIAG = (() => { const rng = random(21); return range(300).map(() => { const a = 4 * rng() - 2, b = 4 * rng() - 2; return { x1: a, x2: b, label: a > b ? 1 : 0 } }) })()
export function DiagonalStaircase() {
  const [depth, setDepth] = useState(2), tree = useMemo(() => buildTree(toRows(DIAG), { maxDepth: depth }), [depth])
  return <div>
    <Controls><Slider label="max depth" value={depth} min={1} max={8} step={1} onChange={setDepth} digits={0} /></Controls>
    <Regions tree={tree} points={DIAG} box={{ x0: -2, x1: 2, y0: -2, y1: 2 }} width={330} height={300} />
    <Readout>The true boundary is the diagonal x₁ = x₂ — one line for a linear model. The tree approximates it with a staircase of {leaves(tree).length} rectangles; accuracy {r(accuracy(tree, toRows(DIAG)) * 100, 1)}%.</Readout>
  </div>
}
