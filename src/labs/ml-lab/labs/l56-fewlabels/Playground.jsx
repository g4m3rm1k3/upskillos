import React, { useMemo, useState } from 'react'
import { POOL, TESTSET, pickLabels, fitLogistic, acc, labelPropagation, selfTraining, activeLearning, activeCurves, UNLABELED, DTEST, trainContrastive, linearProbe } from './engine.js'
import { pca, project } from '../l18-pca/engine.js'
import { Plot, Path, ProbabilityField } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Caption, Legend, Table, Actions } from '../../kit/ui.jsx'
import { pct, fmt } from '../../kit/math.js'

const B = { x: [-1.6, 2.6], y: [-1.1, 1.6] }
const DC = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899']
const cache = {}
const memo = (k, f) => cache[k] ?? (cache[k] = f())

function SemiView() {
  const [per, setPer] = useState(1), [seed, setSeed] = useState(1), [method, setMethod] = useState('prop')
  const L = useMemo(() => pickLabels(2 * per, seed), [per, seed])
  const models = useMemo(() => ({ sup: fitLogistic(L.map(i => POOL[i].x), L.map(i => POOL[i].y)), prop: labelPropagation(L).predict, self: selfTraining(L).at(-1).f }), [L])
  const names = { sup: 'Supervised only (the labelled points)', prop: 'Label propagation over a neighbour graph', self: 'Self-training with confident pseudo-labels' }
  return <>
    <Controls>
      <Slider label="Labels per class" value={per} min={1} max={10} onChange={setPer} />
      <Slider label="Which points get labels (seed)" value={seed} min={1} max={5} onChange={setSeed} />
      <Choice label="Show" value={method} onChange={setMethod} options={Object.entries(names)} />
    </Controls>
    <Plot x={B.x} y={B.y} height={290} xLabel="x₁" yLabel="x₂" label="Semi-supervised learning on two moons">{({ X, Y }) => <>
      <ProbabilityField X={X} Y={Y} x0={B.x[0]} x1={B.x[1]} y0={B.y[0]} y1={B.y[1]} p={(a, b) => models[method]([a, b])} cells={40} />
      {POOL.map((p, i) => <circle key={i} cx={X(p.x[0])} cy={Y(p.x[1])} r="2" fill="var(--muted)" opacity="0.6" />)}
      {L.map(i => <circle key={`l${i}`} cx={X(POOL[i].x[0])} cy={Y(POOL[i].x[1])} r="7" fill={POOL[i].y ? 'var(--chart-val)' : 'var(--chart-train)'} stroke="var(--text)" strokeWidth="2" />)}
    </>}</Plot>
    <Legend items={[['●', 'unlabelled point (400 in the pool)', 'var(--muted)'], ['●', 'labelled class 0', 'var(--chart-train)'], ['●', 'labelled class 1', 'var(--chart-val)']]} />
    <Metrics items={Object.entries(models).map(([k, f]) => [names[k].split(' (')[0].split(' over')[0].split(' with')[0], pct(acc(f, TESTSET))])} />
    <Insight title="What to notice">With one label per class, a supervised classifier can only draw a boundary between two points. The unlabelled points reveal the shape of the data: **label propagation** spreads each label along the dense moon it sits on, reaching high accuracy from two labels. **Self-training** labels its own confident predictions and retrains — useful when its first guesses are good, harmful when they are wrong, because it then trains on its own mistakes (confirmation bias). Try several seeds.</Insight>
  </>
}

function ActiveView() {
  const [strategy, setStrategy] = useState('uncertainty'), [q, setQ] = useState(8)
  const curves = useMemo(() => memo('active', () => activeCurves(4, 24)), [])
  const run = useMemo(() => memo(`run-${strategy}`, () => activeLearning(strategy, { seed: 1, budget: 24 })), [strategy])
  const L = run.labeled.slice(0, 4 + q), f = useMemo(() => fitLogistic(L.map(i => POOL[i].x), L.map(i => POOL[i].y), { steps: 200 }), [L.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  return <>
    <Controls>
      <Choice label="How to choose the next point to label" value={strategy} onChange={setStrategy} options={[['uncertainty', 'Uncertainty sampling (closest to the boundary)'], ['random', 'Random']]} />
      <Slider label="Labels bought after the first 4" value={q} min={0} max={24} onChange={setQ} />
    </Controls>
    <Plot x={B.x} y={B.y} height={280} xLabel="x₁" yLabel="x₂" label="Active learning">{({ X, Y }) => <>
      <ProbabilityField X={X} Y={Y} x0={B.x[0]} x1={B.x[1]} y0={B.y[0]} y1={B.y[1]} p={(a, b) => f([a, b])} cells={40} />
      {POOL.map((p, i) => <circle key={i} cx={X(p.x[0])} cy={Y(p.x[1])} r="2" fill="var(--muted)" opacity="0.5" />)}
      {L.map((i, k) => <g key={i}><circle cx={X(POOL[i].x[0])} cy={Y(POOL[i].x[1])} r="7" fill={POOL[i].y ? 'var(--chart-val)' : 'var(--chart-train)'} stroke="var(--text)" strokeWidth="1.5" />{k >= 4 && <text x={X(POOL[i].x[0])} y={Y(POOL[i].x[1]) + 3.5} textAnchor="middle" style={{ fontSize: 9, fill: 'white', fontWeight: 700 }}>{k - 3}</text>}</g>)}
    </>}</Plot>
    <Plot x={[4, 28]} y={[0.7, 1]} height={200} xLabel="labels" yLabel="test accuracy" yFormat={v => pct(v)} label="Learning curves">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curves.random.map(c => [c.labels, c.acc])} stroke="var(--chart-train)" width={2.3} />
      <Path X={X} Y={Y} points={curves.uncertainty.map(c => [c.labels, c.acc])} stroke="var(--chart-val)" width={2.6} />
    </>}</Plot>
    <Legend items={[['━', 'random (average of 4 runs)', 'var(--chart-train)'], ['━', 'uncertainty sampling (average of 4 runs)', 'var(--chart-val)'], ['①', 'numbers: the order in which points were queried', 'var(--text)']]} />
    <Metrics items={[['Accuracy with these labels', pct(acc(f, TESTSET))], ['Random, 12 labels (avg)', pct(curves.random[8].acc)], ['Uncertainty, 12 labels (avg)', pct(curves.uncertainty[8].acc)]]} />
    <Insight title="What to notice">Labels cost money; the pool of unlabelled points is free. **Active learning** lets the model choose which points to have labelled. Uncertainty sampling asks about points where the model is least sure — near its current boundary — so each label moves the boundary where it matters, and accuracy climbs much faster than with random labels. Its risks: it can ignore regions the model is confidently wrong about, and the labelled set is no longer a random sample, so evaluate on a separate random test set.</Insight>
  </>
}

function ContrastiveView() {
  const [m, setM] = useState(() => cache.contrastive ?? null)
  const run = () => { cache.contrastive = cache.contrastive ?? trainContrastive(); setM(cache.contrastive) }
  const probes = useMemo(() => m ? [1, 3, 10].map(pc => [pc, pct(linearProbe(x => Array.from(x), pc)), pct(linearProbe(m.embed, pc))]) : null, [m])
  const views = useMemo(() => { if (!m) return null; const sub = DTEST.slice(0, 200), raw = sub.map(t => Array.from(t.x)), emb = sub.map(t => m.embed(t.x)); const pr = pca(raw), pe = pca(emb); return { sub, raw: raw.map(x => project(x, pr, 2)), emb: emb.map(x => project(x, pe, 2)) } }, [m])
  const scatter = (pts, title) => { const b = Math.max(...pts.flat().map(Math.abs)) * 1.1; return <div><p className="ml-caption"><strong>{title}</strong></p><Plot x={[-b, b]} y={[-b, b]} height={230} width={400} xLabel="" yLabel="" xFormat={() => ''} yFormat={() => ''} label={title}>{({ X, Y }) => pts.map((p, i) => <text key={i} x={X(p[0])} y={Y(p[1]) + 4} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: DC[views.sub[i].d] }}>{views.sub[i].d}</text>)}</Plot></div> }
  return <>
    <Caption>{`${UNLABELED.length} unlabelled digit images (5×7 pixels, shifted and noisy). A small encoder learns, without any labels, to map two random augmentations of the same image close together and different images apart (an InfoNCE / SimCLR objective). Then a linear classifier is trained on only a few labels per digit.`}</Caption>
    <Actions><button onClick={run}>{m ? 'Pretrained ✓' : 'Pretrain the encoder (about 2 seconds)'}</button></Actions>
    {m && <>
      <Plot x={[1, m.losses.length]} y={[Math.min(...m.losses) - 0.1, Math.max(...m.losses) + 0.1]} height={170} xLabel="epoch" yLabel="contrastive loss" label="Contrastive loss">{({ X, Y }) => <Path X={X} Y={Y} points={m.losses.map((v, i) => [i + 1, v])} stroke="var(--chart-model)" width={2.4} />}</Plot>
      <div className="ml-grid-2">{scatter(views.raw, 'Raw pixels (PCA to 2D)')}{scatter(views.emb, 'Learned embedding (PCA to 2D)')}</div>
      <Table head={['labels per digit', 'linear probe on raw pixels', 'linear probe on the learned embedding']} rows={probes} caption="Same linear classifier, same few labels, tested on 300 new images." />
    </>}
    <Insight title="What to notice">The pretraining task needs no labels: “these two views come from the same image” is free supervision created by augmentation. To solve it, the encoder must ignore what augmentations change (a one-pixel shift, noise) and keep what identifies the image — which largely is the digit. A linear classifier on the embedding then needs far fewer labels than on raw pixels. This is the recipe behind modern pretrained encoders: learn from lots of unlabelled data, then adapt with a little labelled data.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('semi')
  return <>
    <PanelHeading title="When labels are scarce, use everything else." pill="semi-, self-supervised & active" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['semi', 'Semi-supervised: unlabelled points shape the boundary'], ['active', 'Active learning: choose what to label'], ['contrastive', 'Self-supervised: contrastive pretraining']]} /></Controls>
    {view === 'semi' ? <SemiView /> : view === 'active' ? <ActiveView /> : <ContrastiveView />}
  </>
}
