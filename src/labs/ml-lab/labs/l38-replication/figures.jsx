// Figures placed between the paragraphs of Lab 38 (38.2, 38.3), built on the lab's own engine.
import React, { useMemo, useState } from 'react'
import { Controls, Radio, Readout, Bars, r } from '../../kit/fig.jsx'
import { run, runExperiment, METHOD, BASELINE, PAPER } from './engine.js'

// ---------- 38.2 ----------
export function SeedSpread() {
  const gains = useMemo(() => Array.from({ length: 20 }, (_, s) => run(METHOD, s) - run(BASELINE, s)), [])
  const mean = gains.reduce((a, b) => a + b, 0) / gains.length, best = gains.indexOf(Math.max(...gains))
  return <div>
    <Bars items={gains.map((g, s) => ({ label: String(s), value: 100 * g, highlight: s === PAPER.seed }))} digits={1} label={`Gain of the method over the baseline on seeds 0 to 19, in points: ${gains.map(g => r(100 * g, 1)).join(', ')}`} />
    <Readout>Each bar is one seed: the same method and baseline, a different draw of 40 training points. The paper’s seed {PAPER.seed} (highlighted) gives {r(100 * gains[PAPER.seed], 1)} points{best === PAPER.seed ? ' — the most favourable of all twenty' : ''}; the average over the twenty is {r(100 * mean, 1)}.</Readout>
  </div>
}

// ---------- 38.3 ----------
export function AblationBars() {
  const [view, setView] = useState('ablation')
  const res = useMemo(() => ({ ablation: runExperiment('ablation'), tuned: runExperiment('tuned'), seeds: runExperiment('seeds') }), [])
  const rows = res.ablation.rows.map(x => ({ label: x.name.replace('without ', '').replace(' (augmentation)', ''), value: 100 * x.mean, lo: 100 * x.lo, hi: 100 * x.hi }))
  return <div>
    <Controls><Radio name="abl38" value={view} onChange={setView} options={[['ablation', 'ablation'], ['baseline', 'against a tuned baseline']]} /></Controls>
    {view === 'ablation'
      ? <>
        <Bars items={rows.map(x => ({ label: x.label, value: x.value, highlight: x.lo > 0 }))} min={-3} max={5} digits={1} label={`Points each component contributes (full minus without it, 10 paired seeds): ${rows.map(x => `${x.label} ${r(x.value, 1)} [${r(x.lo, 1)}, ${r(x.hi, 1)}]`).join('; ')}`} />
        <Readout>Contribution, full method minus the method without each component (95% intervals): {rows.map(x => `${x.label} ${r(x.value, 1)} [${r(x.lo, 1)}, ${r(x.hi, 1)}]`).join('; ')}. Only the cubic features carry the gain; removing weight decay helps.</Readout>
      </>
      : <>
        <Bars items={[{ label: 'method', value: 100 * res.tuned.meanA }, { label: `cubic baseline, λ ${res.tuned.lambda}`, value: 100 * res.tuned.meanB, highlight: true }, { label: 'paper’s baseline', value: 100 * res.seeds.meanB }]} min={80} max={95} digits={1} label={`Accuracy on 10 fresh seeds: method ${r(100 * res.tuned.meanA, 1)}%, tuned cubic baseline ${r(100 * res.tuned.meanB, 1)}%`} />
        <Readout>With the same cubic features and λ tuned on separate seeds, the baseline scores {r(100 * res.tuned.meanB, 1)}% against the method’s {r(100 * res.tuned.meanA, 1)}% — the claimed contribution adds nothing a fairly tuned baseline lacks.</Readout>
      </>}
  </div>
}
