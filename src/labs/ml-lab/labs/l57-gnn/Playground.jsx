import React, { useMemo, useState } from 'react'
import { makeGraph, train, smoothing, layout, hops } from './engine.js'
import { Plot, Path } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Caption, Legend } from '../../kit/ui.jsx'
import { pct, fmt } from '../../kit/math.js'

const G = makeGraph(), POS = layout(G)
const CC = ['var(--chart-train)', 'var(--chart-val)', '#10b981']
const bx = [Math.min(...POS.map(p => p[0])) - 0.15, Math.max(...POS.map(p => p[0])) + 0.15], by = [Math.min(...POS.map(p => p[1])) - 0.15, Math.max(...POS.map(p => p[1])) + 0.15]

function GraphPlot({ fill, stroke, strokeW, label, onPick, height = 340 }) {
  return <Plot x={bx} y={by} height={height} grid={false} xLabel="" yLabel="" xFormat={() => ''} yFormat={() => ''} label={label}>{({ X, Y }) => <>
    {G.edges.map(([a, b], i) => <line key={i} x1={X(POS[a][0])} y1={Y(POS[a][1])} x2={X(POS[b][0])} y2={Y(POS[b][1])} stroke="var(--muted)" strokeWidth="0.8" opacity="0.5" />)}
    {POS.map((p, i) => <circle key={i} cx={X(p[0])} cy={Y(p[1])} r="6" fill={fill(i)} stroke={stroke(i)} strokeWidth={strokeW(i)} onClick={onPick ? () => onPick(i) : undefined} style={onPick ? { cursor: 'pointer' } : undefined} />)}
  </>}</Plot>
}

function ClassifyView() {
  const [kind, setKind] = useState('gcn'), [per, setPer] = useState(2), [layers, setLayers] = useState(2), [ls, setLs] = useState(1)
  const r = useMemo(() => train(G, kind, { perClass: per, layers, labelSeed: ls }), [kind, per, layers, ls])
  const other = useMemo(() => train(G, kind === 'gcn' ? 'mlp' : 'gcn', { perClass: per, layers, labelSeed: ls }), [kind, per, layers, ls])
  const lab = new Set(r.labeled)
  return <>
    <Controls>
      <Choice label="Model" value={kind} onChange={setKind} options={[['gcn', 'Graph convolutional network (uses edges)'], ['mlp', 'MLP on node features only']]} />
      <Slider label="Labelled nodes per community" value={per} min={1} max={10} onChange={setPer} />
      <Slider label="Layers (hops of message passing)" value={layers} min={1} max={6} onChange={setLayers} />
      <Slider label="Which nodes are labelled (seed)" value={ls} min={1} max={5} onChange={setLs} />
    </Controls>
    <Caption>{`${G.n} people in three communities, ${G.edges.length} friendships (edges are far denser inside communities). Each node has 8 noisy features that only weakly hint at its community. Only a few nodes are labelled; predict the rest.`}</Caption>
    <GraphPlot label="Graph with predicted communities" fill={i => CC[r.pred[i]]} stroke={i => (lab.has(i) ? 'var(--text)' : r.pred[i] === G.y[i] ? 'none' : '#ef4444')} strokeW={i => (lab.has(i) ? 3 : 2)} />
    <Legend items={[['●', 'predicted community (colour)', 'var(--chart-train)'], ['○', 'labelled node (black ring)', 'var(--text)'], ['○', 'mistake (red ring)', '#ef4444']]} />
    <Metrics items={[[kind === 'gcn' ? 'GCN accuracy (unlabelled nodes)' : 'MLP accuracy (unlabelled nodes)', pct(r.acc)], [kind === 'gcn' ? 'MLP, same labels' : 'GCN, same labels', pct(other.acc)], ['Labelled nodes', String(r.labeled.length)], ['Chance', '33%']]} />
    <Insight title="What to notice">The node features alone are too noisy: the MLP is close to chance. The GCN computes each node’s representation from its neighbours’ features too — H′ = σ(Â H W) — so noise averages out within a community and friends end up with similar predictions. Each layer adds one hop of neighbourhood. Mistakes cluster at nodes with many links across communities.</Insight>
  </>
}

function MessagesView() {
  const [src, setSrc] = useState(0), [maxHop, setMaxHop] = useState(2)
  const d = useMemo(() => hops(G, src, 4), [src])
  const shades = ['var(--text)', 'var(--chart-val)', 'var(--chart-model)', '#10b981', '#a855f7']
  const counts = [0, 1, 2, 3, 4].map(h => d.filter(x => x === h).length)
  return <>
    <Controls><Slider label="Layers of message passing" value={maxHop} min={0} max={4} onChange={setMaxHop} /></Controls>
    <Caption>Click any node. After L layers, its representation depends on every node within L hops — its receptive field.</Caption>
    <GraphPlot label="Receptive field of the selected node" onPick={setSrc} fill={i => (d[i] <= maxHop ? shades[d[i]] : 'var(--surface, white)')} stroke={() => 'var(--muted)'} strokeW={i => (i === src ? 3 : 0.8)} />
    <Legend items={[['●', 'selected node', shades[0]], ['●', '1 hop', shades[1]], ['●', '2 hops', shades[2]], ['●', '3 hops', shades[3]], ['●', '4 hops', shades[4]]]} />
    <Metrics items={[['Nodes influencing this node', `${counts.slice(0, maxHop + 1).reduce((a, b) => a + b, 0)} of ${G.n}`], ['Its degree', String(counts[1])], ['Same community within reach', pct(d.map((x, i) => [x, i]).filter(([x]) => x <= maxHop).filter(([, i]) => G.y[i] === G.y[src]).length / Math.max(1, counts.slice(0, maxHop + 1).reduce((a, b) => a + b, 0)))]]} />
    <Insight title="What to notice">A graph neural network layer is **message passing**: every node collects messages (transformed features) from its neighbours, aggregates them with a permutation-invariant operation (sum, mean, max), and updates its own state. Stack L layers and information travels L hops. In a small-world graph, a few hops reach most of the network — so the receptive field quickly spans other communities too.</Insight>
  </>
}

function SmoothView() {
  const rows = useMemo(() => smoothing(G), [])
  return <>
    <Caption>Repeatedly replace every node’s features by the weighted average of its neighbourhood (Â H), with no learned weights, and measure what is left.</Caption>
    <Plot x={[0, rows.length - 1]} y={[0, 1]} height={230} xTicks={rows.length} xFormat={v => rows[Math.round(v)]?.k} yFormat={v => pct(v)} xLabel="propagation steps" yLabel="accuracy" label="Accuracy of a nearest-centroid probe after propagation">{({ X, Y }) => <Path X={X} Y={Y} points={rows.map((r, i) => [i, r.acc])} stroke="var(--chart-val)" width={2.6} />}</Plot>
    <Plot x={[0, rows.length - 1]} y={[-2, 1.5]} height={200} xTicks={rows.length} xFormat={v => rows[Math.round(v)]?.k} yFormat={v => (10 ** v >= 1 ? String(Math.round(10 ** v)) : (10 ** v).toPrecision(1))} xLabel="propagation steps" yLabel="spread of node features (log)" label="Feature spread after propagation">{({ X, Y }) => <Path X={X} Y={Y} points={rows.map((r, i) => [i, Math.log10(r.spread)])} stroke="var(--chart-model)" width={2.6} />}</Plot>
    <Metrics items={rows.filter(r => [0, 4, 32].includes(r.k)).map(r => [`After ${r.k} steps: accuracy`, pct(r.acc)])} />
    <Insight title="Over-smoothing">A few rounds of averaging remove noise within communities, and accuracy jumps. Keep going and averaging crosses community boundaries: every node’s features converge toward the same global average, their spread shrinks toward zero, and the communities become indistinguishable. This is why most GNNs use only 2–4 layers, and why deeper ones need residual connections, normalization or attention to keep nodes distinct.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('classify')
  return <>
    <PanelHeading title="Learn from who is connected to whom." pill="graph neural networks" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['classify', 'Node classification: GCN versus features only'], ['messages', 'Message passing and receptive fields'], ['smooth', 'Over-smoothing with depth']]} /></Controls>
    {view === 'classify' ? <ClassifyView /> : view === 'messages' ? <MessagesView /> : <SmoothView />}
  </>
}
