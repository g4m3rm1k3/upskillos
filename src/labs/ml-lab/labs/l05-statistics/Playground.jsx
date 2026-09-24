import React, { useMemo, useState, useEffect } from 'react'
import { trueMean, sample, samplingDistribution, bootstrap, percentileInterval, coverage, bernoulliLogLik, pearson, confounded, mean, std } from './engine.js'
import { Plot, Path, extent } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Caption, Insight, Legend } from '../../kit/ui.jsx'
import { random, fmt, pct, linspace, quantile } from '../../kit/math.js'
import { fitLine } from '../l02-data/engine.js'

function bins(values, lo, hi, count = 30) {
  const out = Array(count).fill(0), w = (hi - lo) / count
  for (const v of values) { const k = Math.floor((v - lo) / w); if (k >= 0 && k < count) out[k]++ }
  return out.map((c, k) => ({ x: lo + (k + 0.5) * w, w, c }))
}
function Histogram({ values, lo, hi, color, label, marks = [], xLabel }) {
  const h = bins(values, lo, hi), top = Math.max(1, ...h.map(b => b.c))
  return <Plot x={[lo, hi]} y={[0, top * 1.1]} height={210} xLabel={xLabel} label={label} yTicks={3}>{({ X, Y }) => <>
    {h.map((b, i) => <rect key={i} x={X(b.x - b.w / 2) + 0.5} y={Y(b.c)} width={Math.max(0, X(b.w) - X(0) - 1)} height={Y(0) - Y(b.c)} fill={color} opacity="0.6" />)}
    {marks.map(([v, stroke, dash], i) => <Path key={i} X={X} Y={Y} points={[[v, 0], [v, top * 1.1]]} stroke={stroke} width={2} dash={dash} />)}
  </>}</Plot>
}

// Opens the view each lesson's experiment uses; the learner can still switch.
const VIEW_FOR_LESSON = { 'l05-sample': 'sampling', 'l05-clt': 'sampling', 'l05-bootstrap': 'sampling', 'l05-interval': 'coverage', 'l05-likelihood': 'likelihood', 'l05-causation': 'confounding' }

export default function Playground({ lesson }) {
  const [mode, setMode] = useState('sampling')
  useEffect(() => { const view = VIEW_FOR_LESSON[lesson?.id]; if (view) setMode(view) }, [lesson?.id])
  const [n, setN] = useState(20), [seed, setSeed] = useState(1), [stat, setStat] = useState('mean'), [level, setLevel] = useState(0.95)
  const [k, setK] = useState(7), [trials, setTrials] = useState(10), [effect, setEffect] = useState(0)
  const one = useMemo(() => sample(n, random(seed * 7 + 1)), [n, seed])
  const sd = useMemo(() => samplingDistribution({ n, seed, stat }), [n, seed, stat])
  const statFn = stat === 'median' ? v => quantile(v, 0.5) : mean
  const boot = useMemo(() => bootstrap(one, { seed, stat: statFn }), [one, seed, stat])
  const ci = percentileInterval(boot, level)
  const cov = useMemo(() => mode === 'coverage' ? coverage({ n, level, seed }) : null, [mode, n, level, seed])
  const conf = useMemo(() => confounded({ seed, effect }), [seed, effect])
  const range = [0, 90]
  return <>
    <PanelHeading title={{ sampling: 'One sample, many possible samples.', coverage: 'What “95% confident” actually promises.', likelihood: 'Which parameter makes the data most likely?', confounding: 'Correlated — but is it causal?' }[mode]} pill={`true mean ${fmt(trueMean, 2)} s`} />
    <Controls>
      <Choice label="Experiment" value={mode} onChange={setMode} options={[['sampling', 'Sampling & bootstrap'], ['coverage', 'Interval coverage · 100 studies'], ['likelihood', 'Likelihood'], ['confounding', 'Correlation vs causation']]} />
      <label>Seed<input type="number" min="0" max="99999" value={seed} onChange={e => e.target.value !== '' && setSeed(Math.max(0, Math.min(99999, Math.trunc(+e.target.value))))} /></label>
      {(mode === 'sampling' || mode === 'coverage') && <Choice label="Sample size n" value={String(n)} onChange={v => setN(Number(v))} options={['5', '10', '20', '50', '200']} />}
      {mode === 'sampling' && <Choice label="Statistic" value={stat} onChange={setStat} options={[['mean', 'Mean'], ['median', 'Median']]} />}
      {(mode === 'sampling' || mode === 'coverage') && <Choice label="Interval level" value={String(level)} onChange={v => setLevel(Number(v))} options={[['0.8', '80%'], ['0.9', '90%'], ['0.95', '95%'], ['0.99', '99%']]} />}
    </Controls>
    {mode === 'sampling' && <>
      <Caption>The population: build durations with a long right tail (lognormal), true mean ≈ {fmt(trueMean, 2)} s. In real work you never see this — only the one sample you collected.</Caption>
      <Histogram values={one} lo={range[0]} hi={range[1]} color="var(--chart-train)" xLabel={`your one sample · n = ${n} · build seconds`} label="Histogram of one sample" marks={[[trueMean, 'var(--text)', '4 3'], [statFn(one), 'var(--chart-train)']]} />
      <Histogram values={sd} lo={range[0] + 10} hi={range[1] - 30} color="var(--accent)" xLabel={`sampling distribution: the ${stat} of 1,000 fresh samples (needs the population)`} label="Sampling distribution" marks={[[trueMean, 'var(--text)', '4 3']]} />
      <Histogram values={boot} lo={range[0] + 10} hi={range[1] - 30} color="var(--chart-val)" xLabel={`bootstrap: the ${stat} of 1,000 resamples of your one sample`} label="Bootstrap distribution" marks={[[ci[0], 'var(--chart-val)', '5 3'], [ci[1], 'var(--chart-val)', '5 3'], [trueMean, 'var(--text)', '4 3']]} />
      <Legend items={[['┆', 'true population mean', 'var(--text)'], ['┆', `${pct(level)} bootstrap interval`, 'var(--chart-val)']]} />
      <Metrics items={[[`Sample ${stat}`, fmt(statFn(one), 2)], ['True spread of estimate', fmt(std(sd), 2)], ['Bootstrap estimate of it', fmt(std(boot), 2)], [`${pct(level)} interval`, `${fmt(ci[0], 1)} – ${fmt(ci[1], 1)}`]]} />
      <Caption>The blue-violet histogram needs the population, so real studies cannot draw it. The orange bootstrap histogram uses only your sample — and its spread approximates the true one. That is the whole trick. At n = 5 the approximation is rough; at n = 200 it is close.</Caption>
    </>}
    {mode === 'coverage' && cov && <>
      <Plot x={extent(cov.intervals.flatMap(i => [i.lo, i.hi]), 0.05)} y={[0, 101]} height={430} xLabel="build seconds" yLabel="study #" yTicks={3} label="One hundred bootstrap intervals and the true mean">{({ X, Y }) => <>
        {cov.intervals.map((iv, i) => <line key={i} x1={X(iv.lo)} x2={X(iv.hi)} y1={Y(i + 1)} y2={Y(i + 1)} stroke={iv.hit ? 'var(--chart-train)' : 'var(--chart-val)'} strokeWidth={iv.hit ? 1.6 : 3} />)}
        <Path X={X} Y={Y} points={[[trueMean, 0], [trueMean, 101]]} stroke="var(--text)" width={1.5} />
      </>}</Plot>
      <Legend items={[['━', 'interval contains the truth', 'var(--chart-train)'], ['━', 'interval misses', 'var(--chart-val)'], ['│', 'true mean', 'var(--text)']]} />
      <Metrics items={[['Nominal level', pct(level)], ['Observed coverage', pct(cov.rate)], ['Misses', 100 - Math.round(cov.rate * 100)], ['Sample size n', n]]} />
      <Caption>Each line is a different study: a new sample of size n and its own percentile-bootstrap interval. “95%” describes the **procedure**: over many studies, about 95 of 100 intervals capture the fixed truth. With small, skewed samples the bootstrap under-covers — try n = 5 and compare with n = 200.</Caption>
    </>}
    {mode === 'likelihood' && <>
      <Controls><Slider label="Successes k" value={Math.min(k, trials)} min={0} max={trials} onChange={setK} /><Slider label="Trials n" value={trials} min={1} max={100} onChange={v => { setTrials(v); setK(x => Math.min(x, v)) }} /></Controls>
      <Plot x={[0, 1]} y={[-12, 0.5]} xLabel="candidate success probability p" yLabel="log-likelihood − max" label="Bernoulli log-likelihood curve">{({ X, Y }) => {
        const kk = Math.min(k, trials), best = bernoulliLogLik(kk / trials, kk, trials)
        return <>
          <Path X={X} Y={Y} points={linspace(0.001, 0.999, 300).map(p => [p, Math.max(-13, bernoulliLogLik(p, kk, trials) - best)])} />
          <Path X={X} Y={Y} points={[[kk / trials, -12], [kk / trials, 0.5]]} stroke="var(--chart-val)" width={1.5} dash="4 3" />
          <Path X={X} Y={Y} points={[[0, -1.92], [1, -1.92]]} stroke="var(--muted)" width={1} dash="2 3" />
        </>
      }}</Plot>
      <Metrics items={[['Maximum-likelihood p̂ = k/n', fmt(Math.min(k, trials) / trials, 3)], ['log L at p = 0.5', fmt(bernoulliLogLik(0.5, Math.min(k, trials), trials), 3)], ['log L at p̂', fmt(bernoulliLogLik(Math.min(k, trials) / trials, Math.min(k, trials), trials), 3)]]} />
      <Caption>The curve is `k·log p + (n−k)·log(1−p)`, shifted so its peak is 0. Its maximum sits exactly at k/n. Keep the ratio fixed (7 of 10, then 70 of 100): the peak stays put but the curve narrows — more data, sharper evidence. Values of p above the dotted line (−1.92) form an approximate 95% likelihood interval.</Caption>
    </>}
    {mode === 'confounding' && (() => {
      const fits = [0, 1].map(s => fitLine(conf.filter(r => r.size === s).map(r => ({ size_mb: r.tests, duration_s: r.bugs }))))
      const all = fitLine(conf.map(r => ({ size_mb: r.tests, duration_s: r.bugs })))
      const xr = extent(conf.map(r => r.tests)), yr = extent(conf.map(r => r.bugs))
      return <>
        <Controls><Slider label="True causal effect of one test on bugs" value={effect} min={-0.4} max={0.4} step={0.05} onChange={setEffect} format={v => v.toFixed(2)} /></Controls>
        <Plot x={xr} y={yr} xLabel="tests written" yLabel="bugs found" label="Tests against bugs, coloured by project size">{({ X, Y, x0, x1 }) => <>
          {conf.map((r, i) => <circle key={i} cx={X(r.tests)} cy={Y(r.bugs)} r="3.2" fill={r.size ? 'var(--chart-val)' : 'var(--chart-train)'} opacity="0.75" />)}
          <Path X={X} Y={Y} points={[[x0, all.w * x0 + all.b], [x1, all.w * x1 + all.b]]} stroke="var(--text)" width={2} dash="6 4" />
          {fits.map((f, s) => <Path key={s} X={X} Y={Y} points={[[x0, f.w * x0 + f.b], [x1, f.w * x1 + f.b]]} stroke={s ? 'var(--chart-val)' : 'var(--chart-train)'} width={2} />)}
        </>}</Plot>
        <Legend items={[['●', 'small projects', 'var(--chart-train)'], ['●', 'large projects', 'var(--chart-val)'], ['┅', 'fit ignoring size', 'var(--text)']]} />
        <Metrics items={[['r, all projects', fmt(pearson(conf.map(r => r.tests), conf.map(r => r.bugs)), 2)], ['slope ignoring size', fmt(all.w, 3)], ['slope within small', fmt(fits[0].w, 3)], ['slope within large', fmt(fits[1].w, 3)]]} />
        <Insight title="What is going on">Project size causes both more tests and more bugs. Ignoring it, tests look strongly “associated with” bugs. Within each size group, the slope is close to the true causal effect you set. The overall correlation is real — as a description. It is not evidence that writing tests creates bugs. Set the true effect to −0.3: tests genuinely prevent bugs, yet the pooled slope can still be positive.</Insight>
      </>
    })()}
  </>
}
