import React, { useMemo, useState } from 'react'
import { simulate, confusion, metrics, curves, expectedCost, costCurve, reliability, plattFit } from './engine.js'
import { Plot, Path, Heatmap } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Caption, Insight, Legend } from '../../kit/ui.jsx'
import { fmt, pct, argmin } from '../../kit/math.js'

const PREV = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5]

function Histograms({ rows, t }) {
  const bins = 40, pos = Array(bins).fill(0), neg = Array(bins).fill(0)
  rows.forEach(r => (r.y ? pos : neg)[Math.min(bins - 1, Math.floor(r.p * bins))]++)
  const top = Math.max(...pos, ...neg.map(v => v)), sqrt = v => Math.sqrt(v)
  return <Plot x={[0, 1]} y={[0, sqrt(top) * 1.05]} height={230} xLabel="model score p" yLabel="count (√ scale)" yFormat={v => Math.round(v * v)} label="Score distributions of positives and negatives">{({ X, Y }) => <>
    {neg.map((c, i) => <rect key={`n${i}`} x={X(i / bins)} y={Y(sqrt(c))} width={X(1 / bins) - X(0) - 1} height={Y(0) - Y(sqrt(c))} fill="var(--chart-train)" opacity="0.5" />)}
    {pos.map((c, i) => <rect key={`p${i}`} x={X(i / bins)} y={Y(sqrt(c))} width={X(1 / bins) - X(0) - 1} height={Y(0) - Y(sqrt(c))} fill="var(--chart-val)" opacity="0.65" />)}
    <Path X={X} Y={Y} points={[[t, 0], [t, sqrt(top) * 1.05]]} stroke="var(--text)" width={2} />
  </>}</Plot>
}

export default function Playground() {
  const [view, setView] = useState('threshold')
  const [pi, setPi] = useState(4), [sep, setSep] = useState(2), [distortion, setDistortion] = useState(1), [shift, setShift] = useState(0)
  const [t, setT] = useState(0.5), [cfp, setCfp] = useState(1), [cfn, setCfn] = useState(10), [seed, setSeed] = useState(1), [recal, setRecal] = useState(false)
  const prevalence = PREV[pi]
  const calib = useMemo(() => simulate({ prevalence, separation: sep, distortion, shift, seed: seed + 1 }), [prevalence, sep, distortion, shift, seed])
  const platt = useMemo(() => plattFit(calib), [calib])
  const raw = useMemo(() => simulate({ prevalence, separation: sep, distortion, shift, seed }), [prevalence, sep, distortion, shift, seed])
  const rows = useMemo(() => recal ? raw.map(r => ({ ...r, p: platt.apply(r.p) })) : raw, [raw, recal, platt])
  const c = confusion(rows, t), m = metrics(c), cur = useMemo(() => curves(rows), [rows])
  const cost = useMemo(() => costCurve(rows, cfp, cfn), [rows, cfp, cfn]), best = cost[argmin(cost.map(p => p[1]))]
  const rel = useMemo(() => reliability(rows), [rows])
  const theory = cfp / (cfp + cfn)
  return <>
    <PanelHeading title={{ threshold: 'Where should the alarm trigger?', curves: 'Every threshold at once.', calibration: 'Does 0.8 really mean 80%?' }[view]} pill={`AUC ${fmt(cur.auc, 3)}`} />
    <Controls>
      <Choice label="View" value={view} onChange={setView} options={[['threshold', 'Threshold, confusion & cost'], ['curves', 'ROC and precision–recall'], ['calibration', 'Calibration']]} />
      <Slider label="Prevalence of real incidents" value={pi} min={0} max={PREV.length - 1} onChange={setPi} format={i => pct(PREV[i])} />
      <Slider label="Model separation d′" value={sep} min={0.2} max={4} step={0.1} onChange={setSep} format={v => v.toFixed(1)} />
      <Slider label="Decision threshold t" value={t} min={0.01} max={0.99} step={0.01} onChange={setT} format={v => v.toFixed(2)} />
      {view === 'threshold' && <><Slider label="Cost of a false alarm" value={cfp} min={1} max={20} onChange={setCfp} /><Slider label="Cost of a missed incident" value={cfn} min={1} max={100} onChange={setCfn} /></>}
      {view === 'calibration' && <><Slider label="Confidence distortion (1 = calibrated)" value={distortion} min={0.3} max={3} step={0.1} onChange={setDistortion} format={v => v.toFixed(1)} /><Slider label="Score shift" value={shift} min={-2} max={2} step={0.1} onChange={setShift} format={v => v.toFixed(1)} /></>}
      <label>Seed<input type="number" min="0" max="99999" value={seed} onChange={e => e.target.value !== '' && setSeed(Math.max(0, Math.min(99999, Math.trunc(+e.target.value))))} /></label>
    </Controls>
    {view === 'threshold' && <>
      <Legend items={[['▮', 'negatives (no incident)', 'var(--chart-train)'], ['▮', 'positives (real incident)', 'var(--chart-val)'], ['│', 'threshold', 'var(--text)']]} />
      <Histograms rows={rows} t={t} />
      <div className="ml-grid-2">
        <Heatmap label="Confusion matrix" matrix={[[c.tn, c.fp], [c.fn, c.tp]]} rowLabels={['actual 0', 'actual 1']} colLabels={['predict 0', 'predict 1']} cell={58} />
        <Metrics items={[['Accuracy', pct(m.accuracy)], ['Precision', pct(m.precision)], ['Recall (TPR)', pct(m.recall)], ['False-positive rate', pct(m.fpr)]]} />
      </div>
      <Plot x={[0, 1]} y={[0, Math.max(...cost.map(p => p[1])) * 1.05]} height={220} xLabel="threshold" yLabel="expected cost per case" label="Expected cost as a function of threshold">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={cost} stroke="var(--accent)" />
        <Path X={X} Y={Y} points={[[t, 0], [t, Math.max(...cost.map(p => p[1]))]]} stroke="var(--text)" width={1.5} />
        <Path X={X} Y={Y} points={[[theory, 0], [theory, Math.max(...cost.map(p => p[1]))]]} stroke="var(--chart-val)" width={1.5} dash="4 3" />
        <circle cx={X(best[0])} cy={Y(best[1])} r="5" fill="var(--accent)" />
      </>}</Plot>
      <Metrics items={[['Cost at your threshold', fmt(expectedCost(c, cfp, cfn, rows.length), 4)], ['Lowest cost (●)', `${fmt(best[1], 4)} at t = ${best[0].toFixed(2)}`], ['Theory: C_FP/(C_FP+C_FN)', fmt(theory, 3)], ['F1', fmt(m.f1, 3)]]} />
      <Caption>The dashed orange line is the cost-optimal threshold from theory. It matches the empirical minimum only when the scores are calibrated — distort them in the Calibration view and come back.</Caption>
    </>}
    {view === 'curves' && <>
      <div className="ml-grid-2">
        <Plot x={[0, 1]} y={[0, 1]} width={320} height={300} xLabel="false-positive rate" yLabel="true-positive rate" label="ROC curve">{({ X, Y }) => <>
          <Path X={X} Y={Y} points={[[0, 0], [1, 1]]} stroke="var(--muted)" width={1} dash="4 3" />
          <Path X={X} Y={Y} points={cur.roc} stroke="var(--accent)" />
          <circle cx={X(m.fpr)} cy={Y(m.recall)} r="5" fill="var(--chart-val)" />
        </>}</Plot>
        <Plot x={[0, 1]} y={[0, 1]} width={320} height={300} xLabel="recall" yLabel="precision" label="Precision–recall curve">{({ X, Y }) => <>
          <Path X={X} Y={Y} points={[[0, cur.prevalence], [1, cur.prevalence]]} stroke="var(--muted)" width={1} dash="4 3" />
          <Path X={X} Y={Y} points={cur.pr} stroke="var(--accent)" />
          {Number.isFinite(m.precision) && <circle cx={X(m.recall)} cy={Y(m.precision)} r="5" fill="var(--chart-val)" />}
        </>}</Plot>
      </div>
      <Metrics items={[['ROC AUC', fmt(cur.auc, 3)], ['Average precision', fmt(cur.ap, 3)], ['PR baseline = prevalence', pct(cur.prevalence)], ['Precision @ t', pct(m.precision)]]} />
      <Insight title="Change only the prevalence">The ROC curve and its AUC barely move: TPR and FPR are each computed within one class. The precision–recall curve collapses as incidents become rare, because precision divides by **all** alerts, which fill up with false alarms from the huge negative class. For rare events, look at precision–recall.</Insight>
    </>}
    {view === 'calibration' && <>
      <Controls><label className="ml-toggle"><input type="checkbox" checked={recal} onChange={e => setRecal(e.target.checked)} /> Apply Platt scaling fitted on a separate calibration set (a = {fmt(platt.a, 3)}, b = {fmt(platt.b, 3)})</label></Controls>
      <Plot x={[0, 1]} y={[0, 1]} height={320} xLabel="mean predicted probability in bin" yLabel="observed fraction of positives" label="Reliability diagram">{({ X, Y }) => <>
        <Path X={X} Y={Y} points={[[0, 0], [1, 1]]} stroke="var(--muted)" width={1} dash="4 3" />
        <Path X={X} Y={Y} points={rel.cells.filter(b => b.count >= 5).map(b => [b.predicted, b.observed])} stroke="var(--accent)" />
        {rel.cells.filter(b => b.count >= 5).map(b => <circle key={b.bin} cx={X(b.predicted)} cy={Y(b.observed)} r={Math.min(9, 2.5 + Math.sqrt(b.count) / 4)} fill="var(--accent)" opacity="0.8" />)}
      </>}</Plot>
      <Metrics items={[['Expected calibration error', fmt(rel.ece, 4)], ['Brier score', fmt(rel.brier, 4)], ['ROC AUC (ranking)', fmt(cur.auc, 3)], ['Cost-optimal t (theory)', fmt(theory, 3)]]} />
      <Insight title="Ranking versus probability">Distortion &gt; 1 makes scores overconfident (points below the diagonal at the high end); a shift biases every probability. **AUC does not change**, because the ordering of cases is untouched — yet any decision rule computed from the probabilities is now wrong. Platt scaling, learned on separate data, restores the diagonal without changing the ranking.</Insight>
    </>}
  </>
}
