// Figures placed between the paragraphs of Lab 09 (09.1–09.6).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Check, Radio, Readout, Bars, MiniPlot, Path, Dots, VLine, HLine, curve, Table, r } from '../../kit/fig.jsx'
import { simulate, confusion, metrics, curves, expectedCost, costCurve, reliability, plattFit } from './engine.js'

const BASE = simulate({ n: 1000, prevalence: 0.1, separation: 2, seed: 1 })
const pct = v => (Number.isFinite(v) ? `${r(v * 100, 1)}%` : '—')

function Matrix({ c }) {
  const cell = (v, label, good) => <td style={{ background: good ? 'color-mix(in srgb, #10b981 18%, transparent)' : 'color-mix(in srgb, #ef4444 14%, transparent)', textAlign: 'center' }}><strong>{v}</strong><br /><span className="ml-caption">{label}</span></td>
  return <table className="ml-fig-table" aria-label={`Confusion matrix: TP ${c.tp}, FP ${c.fp}, FN ${c.fn}, TN ${c.tn}`}>
    <thead><tr><th></th><th>actually positive</th><th>actually negative</th></tr></thead>
    <tbody><tr><td>alert</td>{cell(c.tp, 'true positive', true)}{cell(c.fp, 'false positive', false)}</tr><tr><td>no alert</td>{cell(c.fn, 'false negative', false)}{cell(c.tn, 'true negative', true)}</tr></tbody>
  </table>
}

// ---------- 09.1 ----------
export function ConfusionAtThreshold() {
  const [t, setT] = useState(0.5), c = confusion(BASE, t), m = metrics(c), never = confusion(BASE, 1.01)
  return <div>
    <Controls><Slider label="threshold" value={t} min={0.01} max={0.99} step={0.01} onChange={setT} /></Controls>
    <Matrix c={c} />
    <Readout>accuracy = (TP + TN)/n = <strong>{pct(m.accuracy)}</strong> — “never alert” scores {pct(metrics(never).accuracy)}. Recall (TPR) = TP/(TP + FN) = <strong>{pct(m.recall)}</strong>; FPR = FP/(FP + TN) = <strong>{pct(m.fpr)}</strong>.</Readout>
  </div>
}

export function ScoreStrips() {
  const [t, setT] = useState(0.5), bins = 20, h = cls => { const v = Array(bins).fill(0); BASE.filter(x => x.y === cls).forEach(x => v[Math.min(bins - 1, Math.floor(x.p * bins))]++); return v }
  const pos = h(1), neg = h(0), top = Math.max(...pos, ...neg.map(v => v / 8)) * 1.1, c = confusion(BASE, t)
  return <div>
    <Controls><Slider label="threshold" value={t} min={0.01} max={0.99} step={0.01} onChange={setT} /></Controls>
    <MiniPlot x={[0, 1]} y={[0, top]} xLabel="model score" yLabel="count (negatives ÷ 8)" label="Score distributions of positives and negatives">{({ X, Y }) => <>
      {neg.map((v, i) => <rect key={`n${i}`} x={X(i / bins)} y={Y(v / 8)} width={X(1 / bins) - X(0) - 1} height={Y(0) - Y(v / 8)} fill="var(--chart-train)" opacity="0.45" />)}
      {pos.map((v, i) => <rect key={`p${i}`} x={X(i / bins) + 2} y={Y(v)} width={X(1 / bins) - X(0) - 5} height={Y(0) - Y(v)} fill="var(--chart-val)" opacity="0.75" />)}
      <VLine X={X} Y={Y} x={t} y0={0} y1={top} dash="" />
    </>}</MiniPlot>
    <Readout>Orange: incidents; blue: healthy services (shown ÷ 8 so both fit). Everything right of the line alerts: TP {c.tp}, FP {c.fp}, FN {c.fn}, TN {c.tn}. Move the line: TP and FP rise and fall together.</Readout>
  </div>
}

// ---------- 09.2 ----------
export function PrecisionRecallSlider() {
  const [t, setT] = useState(0.5), m = metrics(confusion(BASE, t)), ts = Array.from({ length: 97 }, (_, i) => (i + 2) / 100)
  const pts = ts.map(x => [x, metrics(confusion(BASE, x))])
  return <div>
    <Controls><Slider label="threshold" value={t} min={0.02} max={0.98} step={0.01} onChange={setT} /></Controls>
    <MiniPlot x={[0, 1]} y={[0, 1]} xLabel="threshold" yLabel="value" label="Precision and recall against the threshold">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={pts.map(([x, mm]) => [x, mm.precision])} stroke="var(--chart-val)" />
      <Path X={X} Y={Y} points={pts.map(([x, mm]) => [x, mm.recall])} stroke="var(--chart-train)" />
      <Path X={X} Y={Y} points={pts.map(([x, mm]) => [x, mm.f1])} stroke="var(--chart-model)" dash="4 3" width={1.5} />
      <VLine X={X} Y={Y} x={t} y0={0} y1={1} dash="" />
    </>}</MiniPlot>
    <Readout>At {r(t, 2)}: precision (orange) <strong>{pct(m.precision)}</strong>, recall (blue) <strong>{pct(m.recall)}</strong>, F1 (dashed) {pct(m.f1)}. Raising the threshold trades recall for precision.</Readout>
  </div>
}

export function F1VersusMean() {
  const [p, setP] = useState(0.9), [rc, setRc] = useState(0.1), f1 = 2 * p * rc / (p + rc)
  return <div>
    <Controls><Slider label="precision" value={p} min={0.01} max={1} step={0.01} onChange={setP} /><Slider label="recall" value={rc} min={0.01} max={1} step={0.01} onChange={setRc} /></Controls>
    <Bars items={[{ label: 'arithmetic mean', value: (p + rc) / 2, color: 'var(--muted)' }, { label: 'F1 (harmonic mean)', value: f1, highlight: true }]} min={0} max={1} digits={3} />
    <Readout>2PR/(P + R) = 2 × {r(p, 2)} × {r(rc, 2)} / {r(p + rc, 2)} = <strong>{r(f1, 3)}</strong>. The harmonic mean stays near the smaller of the two: a lopsided model cannot score well.</Readout>
  </div>
}

// ---------- 09.3 ----------
const TEN = [[0.95, 1], [0.85, 1], [0.8, 0], [0.7, 1], [0.6, 0], [0.55, 1], [0.4, 0], [0.3, 0], [0.2, 1], [0.1, 0]]
export function RocBuilder() {
  const [k, setK] = useState(0), P = TEN.filter(c => c[1]).length, N = TEN.length - P, pts = [[0, 0]]
  let tp = 0, fp = 0; TEN.slice(0, k).forEach(([, y]) => { y ? tp++ : fp++; pts.push([fp / N, tp / P]) })
  const full = curves(TEN.map(([p, y]) => ({ p, y })))
  return <div>
    <Controls><button onClick={() => setK(v => Math.min(10, v + 1))} disabled={k >= 10}>Lower the threshold past the next case</button><button onClick={() => setK(0)}>Reset</button></Controls>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
      <Table head={['score', 'label', '']} rows={TEN.map(([p, y], i) => [p, y ? 'positive' : 'negative', i < k ? 'alerted' : ''])} active={k - 1} label="Ten cases sorted by score" />
      <div style={{ flex: '1 1 240px' }}><MiniPlot width={300} height={280} x={[0, 1]} y={[0, 1]} xLabel="false-positive rate" yLabel="true-positive rate" label="ROC curve built step by step">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={[[0, 0], [1, 1]]} stroke="var(--muted)" dash="4 3" width={1} />
        <Path X={X} Y={Y} points={pts} />
        <Dots X={X} Y={Y} points={pts.slice(-1)} color="var(--chart-val)" rad={5} />
      </>}</MiniPlot></div>
    </div>
    <Readout>{k === 0 ? 'Start at (0, 0): nothing alerted.' : `Alerting the top ${k}: TPR ${tp}/${P}, FPR ${fp}/${N}. A positive moves the curve up, a negative moves it right.`} Full AUC = {r(full.auc, 3)}.</Readout>
  </div>
}

export function AucPairs() {
  const [p1, setP1] = useState(0.9), [p2, setP2] = useState(0.4), [n1, setN1] = useState(0.6), [n2, setN2] = useState(0.2)
  const pairs = [[p1, n1], [p1, n2], [p2, n1], [p2, n2]], score = ([a, b]) => (a > b ? 1 : a === b ? 0.5 : 0)
  return <div>
    <Controls><Slider label="positive 1" value={p1} min={0} max={1} step={0.05} onChange={setP1} /><Slider label="positive 2" value={p2} min={0} max={1} step={0.05} onChange={setP2} /><Slider label="negative 1" value={n1} min={0} max={1} step={0.05} onChange={setN1} /><Slider label="negative 2" value={n2} min={0} max={1} step={0.05} onChange={setN2} /></Controls>
    <Table head={['positive score', 'negative score', 'ranked correctly?']} rows={pairs.map(pq => [r(pq[0], 2), r(pq[1], 2), score(pq) === 1 ? '✓' : score(pq) === 0.5 ? 'tie (½)' : '✗'])} label="Every positive–negative pair" />
    <Readout>AUC = correctly ranked pairs / all pairs = {pairs.reduce((t, pq) => t + score(pq), 0)}/4 = <strong>{r(pairs.reduce((t, pq) => t + score(pq), 0) / 4, 3)}</strong>.</Readout>
  </div>
}

export function RankingOnly() {
  const [shrink, setShrink] = useState(false), rows = shrink ? BASE.map(x => ({ ...x, p: x.p * 0.1 })) : BASE
  const cv = curves(rows), rel = reliability(rows)
  return <div>
    <Controls><Check label="multiply every score by 0.1" checked={shrink} onChange={setShrink} /></Controls>
    <Table head={['', 'value']} rows={[['ROC AUC', r(cv.auc, 4)], ['mean predicted probability', r(rows.reduce((t, x) => t + x.p, 0) / rows.length, 4)], ['actual share of incidents', r(cv.prevalence, 4)], ['Brier score', r(rel.brier, 4)]]} label="Ranking versus probability quality" />
    <Readout>{shrink ? 'AUC is exactly unchanged — the order of the scores is the same — but the probabilities now claim incidents are about ten times rarer than they are.' : 'Tick the box: which numbers change?'}</Readout>
  </div>
}

// ---------- 09.4 ----------
export function PrevalencePrecision() {
  const [prev, setPrev] = useState(0.01), tpr = 0.9, fpr = 0.05, prec = tpr * prev / (tpr * prev + fpr * (1 - prev))
  return <div>
    <Controls><Slider label="prevalence" value={prev} min={0.001} max={0.5} step={0.001} onChange={setPrev} digits={3} /></Controls>
    <Bars items={[{ label: 'true alerts per 1,000', value: 1000 * tpr * prev, highlight: true }, { label: 'false alerts per 1,000', value: 1000 * fpr * (1 - prev), color: 'var(--chart-val)' }]} digits={1} />
    <Readout>Same model (TPR 0.9, FPR 0.05). Precision = {r(1000 * tpr * prev, 1)}/({r(1000 * tpr * prev, 1)} + {r(1000 * fpr * (1 - prev), 1)}) = <strong>{r(prec, 4)}</strong>.</Readout>
  </div>
}

export function RocVersusPr() {
  const [prev, setPrev] = useState(0.1), rows = useMemo(() => simulate({ n: 4000, prevalence: prev, separation: 2, seed: 2 }), [prev]), cv = curves(rows)
  return <div>
    <Controls><Slider label="prevalence" value={prev} min={0.005} max={0.5} step={0.005} onChange={setPrev} digits={3} /></Controls>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <div style={{ flex: '1 1 220px' }}><MiniPlot width={300} height={260} x={[0, 1]} y={[0, 1]} xLabel="FPR" yLabel="TPR" label={`ROC AUC ${r(cv.auc, 3)}`}>{({ X, Y }) => <><Path X={X} Y={Y} points={[[0, 0], [1, 1]]} stroke="var(--muted)" dash="4 3" width={1} /><Path X={X} Y={Y} points={cv.roc} /></>}</MiniPlot></div>
      <div style={{ flex: '1 1 220px' }}><MiniPlot width={300} height={260} x={[0, 1]} y={[0, 1]} xLabel="recall" yLabel="precision" label={`Average precision ${r(cv.ap, 3)}`}>{({ X, Y }) => <><HLine X={X} Y={Y} y={cv.prevalence} x0={0} x1={1} color="var(--muted)" /><Path X={X} Y={Y} points={cv.pr} stroke="var(--chart-val)" /></>}</MiniPlot></div>
    </div>
    <Readout>ROC AUC <strong>{r(cv.auc, 3)}</strong> barely moves with prevalence; average precision <strong>{r(cv.ap, 3)}</strong> (grey line: the random baseline {r(cv.prevalence, 3)}) falls as incidents get rare.</Readout>
  </div>
}

// ---------- 09.5 ----------
export function CostCurveFig() {
  const [cfp, setCfp] = useState(1), [cfn, setCfn] = useState(10), cc = costCurve(BASE, cfp, cfn), best = cc.reduce((a, b) => (b[1] < a[1] ? b : a)), theory = cfp / (cfp + cfn)
  const top = Math.max(...cc.map(c => c[1])) * 1.1
  return <div>
    <Controls><Slider label="cost of a false alarm" value={cfp} min={0.5} max={10} step={0.5} onChange={setCfp} digits={1} /><Slider label="cost of a miss" value={cfn} min={0.5} max={20} step={0.5} onChange={setCfn} digits={1} /></Controls>
    <MiniPlot x={[0, 1]} y={[0, top]} xLabel="threshold" yLabel="expected cost per case" label={`Lowest cost at ${best[0]}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={cc} />
      <VLine X={X} Y={Y} x={theory} y0={0} y1={top} />
      <Dots X={X} Y={Y} points={[best]} color="var(--chart-val)" rad={5} />
    </>}</MiniPlot>
    <Readout>Measured minimum at threshold {r(best[0], 2)} (cost {r(best[1], 3)} per case); the calibrated-probability rule C_FP/(C_FP + C_FN) = <strong>{r(theory, 3)}</strong> (dashed). At 0.5 the cost is {r(expectedCost(confusion(BASE, 0.5), cfp, cfn, BASE.length), 3)}.</Readout>
  </div>
}

export function PrecisionAtK() {
  const [k, setK] = useState(50), sorted = [...BASE].sort((a, b) => b.p - a.p), top = sorted.slice(0, k), hits = top.filter(x => x.y).length
  return <div>
    <Controls><Slider label="alerts the team can investigate (k)" value={k} min={5} max={300} step={5} onChange={setK} digits={0} /></Controls>
    <Readout>Alert on the top {k} scores (threshold {r(sorted[k - 1].p, 3)}): {hits} are real incidents — precision@{k} = <strong>{pct(hits / k)}</strong>; they catch {hits} of {BASE.filter(x => x.y).length} incidents ({pct(hits / BASE.filter(x => x.y).length)} recall).</Readout>
  </div>
}

// ---------- 09.6 ----------
function Reliability({ rows, label }) {
  const rel = reliability(rows)
  return <MiniPlot width={300} height={270} x={[0, 1]} y={[0, 1]} xLabel="mean predicted probability" yLabel="observed frequency" label={label}>{({ X, Y }) => <>
    <Path X={X} Y={Y} points={[[0, 0], [1, 1]]} stroke="var(--muted)" dash="4 3" width={1} />
    <Path X={X} Y={Y} points={rel.cells.filter(c => c.count > 5).map(c => [c.predicted, c.observed])} />
    <Dots X={X} Y={Y} points={rel.cells.filter(c => c.count > 5).map(c => [c.predicted, c.observed, 2 + Math.min(6, Math.sqrt(c.count) / 3)])} color="var(--chart-model)" />
  </>}</MiniPlot>
}
export function ReliabilityDiagram() {
  const [d, setD] = useState(2.5), rows = useMemo(() => simulate({ n: 4000, prevalence: 0.3, distortion: d, seed: 5 }), [d]), rel = reliability(rows)
  return <div>
    <Controls><Slider label="distortion (1 = calibrated)" value={d} min={0.3} max={3} step={0.1} onChange={setD} digits={1} /></Controls>
    <Reliability rows={rows} label="Reliability diagram" />
    <Readout>ECE = <strong>{r(rel.ece, 4)}</strong>, Brier = {r(rel.brier, 4)}. {d > 1.05 ? 'Overconfident: at high probabilities the curve falls below the diagonal.' : d < 0.95 ? 'Underconfident: probabilities crowd toward the middle; the curve is steeper than the diagonal.' : 'Close to the diagonal: calibrated.'}</Readout>
  </div>
}

export function PlattFix() {
  const [fixed, setFixed] = useState(false)
  const { train, test } = useMemo(() => ({ train: simulate({ n: 3000, prevalence: 0.3, distortion: 2.5, seed: 6 }), test: simulate({ n: 3000, prevalence: 0.3, distortion: 2.5, seed: 7 }) }), [])
  const platt = useMemo(() => plattFit(train), [train]), rows = fixed ? test.map(x => ({ ...x, p: platt.apply(x.p) })) : test, rel = reliability(rows)
  return <div>
    <Controls><Check label="apply Platt scaling fitted on separate held-out rows" checked={fixed} onChange={setFixed} /></Controls>
    <Reliability rows={rows} label="Reliability before and after Platt scaling" />
    <Readout>ECE {r(rel.ece, 4)}, Brier {r(rel.brier, 4)}, ROC AUC {r(curves(rows).auc, 4)}. {fixed ? `p′ = σ(${r(platt.a, 3)}·logit(p) + ${r(platt.b, 3)}): the probabilities move back to the diagonal, the AUC is unchanged.` : 'An overconfident model before recalibration.'}</Readout>
  </div>
}
