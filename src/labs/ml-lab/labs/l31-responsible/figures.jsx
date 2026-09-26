// Figures placed between the paragraphs of Lab 31 (31.2, 31.3), built on the lab's own engine.
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Readout, MiniPlot, Path, Dots, Label, r } from '../../kit/fig.jsx'
import { simulate, fitScorer, groupMetrics, calibration } from './engine.js'

// ---------- 31.2 ----------
export function GroupCalibration() {
  const [noiseB, setNoiseB] = useState(1.6)
  const { cal, m } = useMemo(() => {
    const rows = simulate({ noiseB }), score = fitScorer(rows)
    return { cal: { A: calibration(rows, score, 'A'), B: calibration(rows, score, 'B') }, m: groupMetrics(rows, score, 0.5) }
  }, [noiseB])
  const pts = g => cal[g].map(c => [c.predicted, c.observed])
  return <div>
    <Controls><Slider label="region B's input noise (A's is 0.8)" value={noiseB} min={0.8} max={2.4} step={0.2} onChange={setNoiseB} digits={1} /></Controls>
    <MiniPlot x={[0, 1]} y={[0, 1]} xLabel="score (bin mean)" yLabel="observed rate" label={`Calibration by region with B's noise ${noiseB}: A ${pts('A').map(p => `${r(p[0], 2)}→${r(p[1], 2)}`).join(', ')}; B ${pts('B').map(p => `${r(p[0], 2)}→${r(p[1], 2)}`).join(', ')}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={[[0, 0], [1, 1]]} stroke="var(--border)" dash="4 3" />
      <Path X={X} Y={Y} points={pts('A')} stroke="var(--chart-train)" />
      <Dots X={X} Y={Y} points={pts('A')} color="var(--chart-train)" />
      <Path X={X} Y={Y} points={pts('B')} stroke="var(--chart-val)" />
      <Dots X={X} Y={Y} points={pts('B')} color="var(--chart-val)" />
      <Label X={X} Y={Y} x={0.05} y={0.92} color="var(--chart-train)">region A</Label>
      <Label X={X} Y={Y} x={0.05} y={0.84} color="var(--chart-val)">region B</Label>
      <Label X={X} Y={Y} x={0.62} y={0.52} color="var(--muted)">perfect calibration</Label>
    </>}</MiniPlot>
    <Readout>Recall A {r(m.A.tpr, 3)} (n = {m.A.n}), B {r(m.B.tpr, 3)} (n = {m.B.n}): a gap of {r(100 * (m.A.tpr - m.B.tpr), 1)} points. {noiseB > 1 ? 'From a score of about 0.5 up, region A sits above the diagonal (the score is too cautious) and region B below it (too confident) — one pooled score, two meanings.' : 'With equal noise both curves sit close together: the remaining differences come from the base rates.'}</Readout>
  </div>
}

// ---------- 31.3 ----------
const ROWS = simulate(), SCORE = fitScorer(ROWS)
export function FairnessTradeoff() {
  const [tB, setTB] = useState(0.5)
  const a = useMemo(() => groupMetrics(ROWS, SCORE, 0.5).A, []), b = useMemo(() => groupMetrics(ROWS, SCORE, tB).B, [tB])
  const rows = [['selection rate', 'selection', 'demographic parity'], ['recall (TPR)', 'tpr', 'equal opportunity'], ['false-positive rate', 'fpr', 'equalized odds (with recall)'], ['precision (PPV)', 'ppv', 'predictive parity']]
  return <div>
    <Controls><Slider label="region B's threshold (A's stays at 0.50)" value={tB} min={0.1} max={0.7} step={0.05} onChange={setTB} digits={2} /></Controls>
    <table className="ml-fig-table">
      <caption>Each criterion compares one metric between the regions (A’s threshold 0.50, B’s {tB.toFixed(2)})</caption>
      <thead><tr><th scope="col">Metric</th><th scope="col">A</th><th scope="col">B</th><th scope="col">Gap (points)</th><th scope="col">Criterion</th></tr></thead>
      <tbody>{rows.map(([label, k, crit]) => <tr key={k}><th scope="row" style={{ textAlign: 'left' }}>{label}</th><td>{r(a[k], 3)}</td><td>{r(b[k], 3)}</td><td>{r(100 * (a[k] - b[k]), 1)}</td><td>{crit}</td></tr>)}</tbody>
    </table>
    <Readout>Lowering B’s threshold closes the recall gap but widens the false-positive and precision gaps; the selection-rate gap never closes because B’s base rate ({r(b.base, 3)}) is higher than A’s ({r(a.base, 3)}). No threshold satisfies every criterion at once.</Readout>
  </div>
}
