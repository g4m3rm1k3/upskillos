// Figures placed between the paragraphs of Lab 27 (27.1, 27.5), computed with the playground's own engine on its
// synthetic 10×10 digits. Nothing is trained until the learner asks, so the page stays fast.
import React, { useState } from 'react'
import { Controls, Choice, Readout, r } from '../../kit/fig.jsx'
import { CONFIGS, runConfig, summarize, confusion } from './engine.js'

// ---------- 27.1 / 27.3 ----------
export function PipelineBoard() {
  const [rows, setRows] = useState(null)
  const run = () => setRows(Object.entries(CONFIGS).map(([k, cfg]) => [k, cfg, summarize([1, 2, 3].map(s => runConfig(cfg, s)))]))
  const base = rows?.find(([k]) => k === 'linear')?.[2].mean
  return <div>
    <Controls><button onClick={run}>{rows ? 'Run again' : 'Train all five pipelines (3 seeds each)'}</button></Controls>
    {rows ? <table className="ml-fig-table">
      <caption>Synthetic digits: trained on shifts 0–3, tested on shifts 0–5 (a third of the test set at unseen positions)</caption>
      <thead><tr><th scope="col">Pipeline</th><th scope="col">Test accuracy (mean ± sd)</th><th scope="col">vs baseline</th><th scope="col">Parameters</th><th scope="col">Multiply-adds</th></tr></thead>
      <tbody>{rows.map(([k, cfg, S]) => <tr key={k}><th scope="row" style={{ textAlign: 'left' }}>{cfg.label}</th><td>{r(S.mean, 3)} ± {r(S.sd, 3)}</td><td>{k === 'linear' ? '—' : `${S.mean >= base ? '+' : ''}${r(100 * (S.mean - base), 1)} pts`}</td><td>{S.params}</td><td>{S.macs}</td></tr>)}</tbody>
    </table> : <Readout>Press the button to train every pipeline three times (a few seconds).</Readout>}
    {rows && <Readout>On these synthetic digits the representation matters most: convolution features lift a linear model from {r(base, 2)} to {r(rows.find(([k]) => k === 'conv')[2].mean, 2)}, with fewer parameters but more multiply-adds. The notebook repeats the investigation on real handwriting — with a different answer.</Readout>}
  </div>
}

// ---------- 27.5 ----------
export function ConfusionView() {
  const [key, setKey] = useState('linear'), [res, setRes] = useState(null)
  const run = k => { const out = runConfig(CONFIGS[k], 1); setRes({ key: k, m: confusion(out.pred, out.test), acc: out.acc }) }
  const m = res?.m, peak = m ? Math.max(...m.flat()) : 1
  const off = m ? m.flatMap((row, i) => row.map((v, j) => [v, i, j])).filter(([, i, j]) => i !== j).sort((a, b) => b[0] - a[0])[0] : null
  const cell = 26
  return <div>
    <Controls>
      <Choice label="pipeline" value={key} onChange={setKey} options={Object.entries(CONFIGS).map(([k, c]) => [k, c.label])} />
      <button onClick={() => run(key)}>Train and show errors</button>
    </Controls>
    {m ? <>
      <svg viewBox={`0 0 ${11 * cell + 4} ${11 * cell + 4}`} role="img" aria-label={`Confusion matrix of ${CONFIGS[res.key].label}; accuracy ${r(res.acc, 3)}; most common confusion: ${off[1]} read as ${off[2]} (${off[0]} times)`} style={{ width: 11 * cell + 4, maxWidth: '100%' }}>
        {m.map((row, i) => row.map((v, j) => <g key={`${i}-${j}`}>
          <rect x={cell + j * cell} y={cell + i * cell} width={cell - 1} height={cell - 1} fill={i === j ? `rgba(37, 99, 235, ${v / peak})` : `rgba(234, 88, 12, ${Math.min(1, (2 * v) / peak)})`} stroke="var(--border)" strokeWidth={0.5} />
          {v > 0 && <text x={cell + j * cell + cell / 2} y={cell + i * cell + cell / 2 + 4} textAnchor="middle" style={{ fontSize: 9 }}>{v}</text>}
        </g>))}
        {Array.from({ length: 10 }, (_, k) => <g key={k}><text x={cell + k * cell + cell / 2} y={cell - 6} textAnchor="middle" className="ml-axis">{k}</text><text x={cell - 8} y={cell + k * cell + cell / 2 + 4} textAnchor="end" className="ml-axis">{k}</text></g>)}
      </svg>
      <Readout>{CONFIGS[res.key].label}: accuracy {r(res.acc, 3)}. Rows are the true digit, columns the prediction; blue is correct, orange is an error. Most common confusion: {off[1]} read as {off[2]} ({off[0]} times) — a hypothesis for the next experiment.</Readout>
    </> : <Readout>Choose a pipeline and press the button to train it once and see its confusion matrix.</Readout>}
  </div>
}
