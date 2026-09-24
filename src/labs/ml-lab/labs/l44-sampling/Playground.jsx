import React, { useMemo, useState } from 'react'
import { TARGETS, metropolis, gibbs, ess, rhat, autocorr, importance, target1d, logNorm, fitReverseKL, fitForwardKL, meanFieldVariance, TRUE_MEAN, TRUE_P_POS, STEPS, STARTS } from './engine.js'
import { Plot, Path, Contour, equalAspect } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Caption, Legend } from '../../kit/ui.jsx'
import { fmt, pct, mean } from '../../kit/math.js'

const CH = ['var(--chart-model)', 'var(--chart-val)', '#10b981', '#a855f7']
const NS = [200, 500, 1000, 2000, 5000]

function McmcView() {
  const [target, setTarget] = useState('corr'), [sampler, setSampler] = useState('mh'), [si, setSi] = useState(2), [ni, setNi] = useState(2)
  const T = TARGETS[target], n = NS[ni], useGibbs = sampler === 'gibbs' && target === 'corr'
  const runs = useMemo(() => STARTS.map((s, j) => useGibbs ? gibbs(0.95, s, n, 20 + j) : metropolis(T.logp, s, STEPS[si], n, 20 + j)), [target, sampler, si, ni]) // eslint-disable-line react-hooks/exhaustive-deps
  const burn = Math.floor(n / 10), kept = runs.map(r => r.chain.slice(burn).map(p => p[0]))
  const R = rhat(kept), E = ess(kept[0]), ac = autocorr(kept[0], 40)
  const lp = T.logp([...T.mean]), levels = [1, 3, 6, 10].map(d => lp - d)
  return <>
    <Controls>
      <Choice label="Target distribution" value={target} onChange={setTarget} options={Object.entries(TARGETS).map(([k, v]) => [k, v.name])} />
      <Choice label="Sampler" value={sampler} onChange={setSampler} options={[['mh', 'Random-walk Metropolis–Hastings'], ['gibbs', 'Gibbs (correlated Gaussian only)']]} />
      {!useGibbs && <Slider label="Proposal step size" value={si} min={0} max={STEPS.length - 1} onChange={setSi} format={i => STEPS[i]} />}
      <Slider label="Iterations per chain" value={ni} min={0} max={NS.length - 1} onChange={setNi} format={i => NS[i]} />
    </Controls>
    <Plot x={[-4.5, 4.5]} y={[-4.5, 4.5]} height={320} xLabel="θ₁" yLabel="θ₂" label="Samples from four chains">{({ X, Y }) => <>
      {levels.map((l, i) => <Contour key={i} X={X} Y={Y} x0={-4.5} x1={4.5} y0={-4.5} y1={4.5} f={(a, b) => T.logp([a, b])} level={l} stroke="var(--muted)" width={1} cells={60} />)}
      {runs.map((r, j) => r.chain.slice(burn).filter((_, i) => i % Math.max(1, Math.floor(n / 600)) === 0).map((p, i) => <circle key={`${j}-${i}`} cx={X(p[0])} cy={Y(p[1])} r="1.8" fill={CH[j]} opacity="0.55" />))}
      <Path X={X} Y={Y} points={(useGibbs ? runs[0].path : runs[0].chain).slice(0, 80)} stroke="var(--text)" width={1.2} />
      {STARTS.map((s, j) => <circle key={j} cx={X(s[0])} cy={Y(s[1])} r="5" fill="none" stroke={CH[j]} strokeWidth="2" />)}
    </>}</Plot>
    <Legend items={[['●', 'four chains, different starts (circles)', 'var(--chart-model)'], ['━', 'first 80 moves of chain 1', 'var(--text)'], ['─', 'contours of the target', 'var(--muted)']]} />
    <Plot x={[0, n]} y={[-4.5, 4.5]} height={170} xLabel="iteration" yLabel="θ₁" label="Trace plots">{({ X, Y }) => <>
      <rect x={X(0)} y={Y(4.5)} width={X(burn) - X(0)} height={Y(-4.5) - Y(4.5)} fill="var(--muted)" opacity="0.12" />
      {runs.map((r, j) => <Path key={j} X={X} Y={Y} points={r.chain.filter((_, i) => i % Math.max(1, Math.floor(n / 400)) === 0).map((p, i) => [i * Math.max(1, Math.floor(n / 400)), p[0]])} stroke={CH[j]} width={1} />)}
    </>}</Plot>
    <Caption>Shaded: the first 10%, discarded as burn-in. Well-mixed chains overlap like a fuzzy caterpillar; separated traces mean the chains disagree.</Caption>
    <Metrics items={[['Acceptance rate', useGibbs ? '100% (Gibbs)' : pct(runs[0].acceptance)], ['Effective sample size (chain 1)', `${fmt(E, 0)} of ${n - burn}`], ['R̂ across 4 chains', fmt(R, 3)], ['Mean of θ₁ (all chains)', `${fmt(mean(kept.flat()), 2)} (true ${T.mean[0]})`]]} />
    <Plot x={[0, 40]} y={[-0.2, 1]} height={140} xLabel="lag" yLabel="autocorrelation" label="Autocorrelation of chain 1">{({ X, Y }) => <>
      {ac.map((v, k) => <line key={k} x1={X(k)} x2={X(k)} y1={Y(0)} y2={Y(v)} stroke="var(--chart-model)" strokeWidth="3" />)}
    </>}</Plot>
    <Insight title="What to notice">Tiny steps are almost always accepted but crawl: high autocorrelation, few effective samples. Huge steps are almost always rejected: the chain sits still. In between, the chain explores efficiently. On the two-mode target with small steps, each chain stays in its own mode — its own effective sample size looks fine, but the four chains disagree and **R̂ is far above 1.01**. Always run several chains from dispersed starts. Gibbs never rejects, yet on a strongly correlated target it still moves in tiny axis-aligned steps.</Insight>
  </>
}

function ImportanceView() {
  const [qm, setQm] = useState(0), [qs, setQs] = useState(3), [seed, setSeed] = useState(1)
  const r = useMemo(() => importance(qm, qs, 1000, seed), [qm, qs, seed])
  const xs = Array.from({ length: 321 }, (_, i) => -6 + 12 * i / 320)
  const bins = Array.from({ length: 48 }, (_, i) => -6 + i * 0.25), hist = bins.map(b0 => r.xs.reduce((s, x, i) => s + (x >= b0 && x < b0 + 0.25 ? r.weights[i] : 0), 0) / 0.25)
  const top = Math.max(0.6, ...hist, ...xs.map(x => Math.exp(logNorm(x, qm, qs))))
  return <>
    <Controls>
      <Slider label="Proposal mean" value={qm} min={-3} max={3} step={0.25} onChange={setQm} />
      <Slider label="Proposal standard deviation" value={qs} min={0.3} max={4} step={0.1} onChange={setQs} />
    </Controls>
    <Plot x={[-6, 6]} y={[0, top]} height={260} xLabel="θ" yLabel="density" yFormat={v => v.toFixed(2)} label="Importance sampling">{({ X, Y }) => <>
      {bins.map((b0, i) => <rect key={i} x={X(b0)} y={Y(hist[i])} width={X(0.25) - X(0) - 1} height={Y(0) - Y(hist[i])} fill="var(--chart-model)" opacity="0.35" />)}
      <Path X={X} Y={Y} points={xs.map(x => [x, Math.exp(target1d(x))])} stroke="var(--text)" width={2.5} />
      <Path X={X} Y={Y} points={xs.map(x => [x, Math.exp(logNorm(x, qm, qs))])} stroke="var(--chart-val)" width={2} dash="6 4" />
    </>}</Plot>
    <Legend items={[['━', 'target p(θ)', 'var(--text)'], ['┄', 'proposal q(θ)', 'var(--chart-val)'], ['■', 'weighted samples (histogram)', 'var(--chart-model)']]} />
    <Metrics items={[['Estimated mean', `${fmt(r.estimate, 3)} (true ${fmt(TRUE_MEAN, 2)})`], ['Estimated P(θ > 0)', `${fmt(r.probPositive, 3)} (true ${fmt(TRUE_P_POS, 3)})`], ['Effective sample size', `${fmt(r.ess, 0)} of 1000`], ['Largest single weight', pct(Math.max(...r.weights))]]} />
    <button onClick={() => setSeed(s => s + 1)}>Draw 1,000 new samples</button>
    <Insight title="What to notice">Samples from q are reweighted by p/q so the weighted histogram matches p. A wide proposal wastes samples but covers both modes. A narrow one centred on the left mode (mean −2, sd 0.6) reports a large effective sample size yet estimates the mean near −1.9 — it never sees the right mode, and nothing in the weights warns you. Proposals must have heavier tails than the target.</Insight>
  </>
}

function VIView() {
  const [rho, setRho] = useState(0.9)
  const rev = useMemo(() => fitReverseKL(), []), fwd = fitForwardKL()
  const xs = Array.from({ length: 321 }, (_, i) => -6 + 12 * i / 320), mf = Math.sqrt(meanFieldVariance(rho))
  const ell = (sx, sy, r) => Array.from({ length: 73 }, (_, i) => { const t = 2 * Math.PI * i / 72, a = Math.cos(t), b = Math.sin(t); return [2 * sx * a, 2 * sy * (r * a + Math.sqrt(1 - r * r) * b)] })
  return <>
    <Plot x={[-6, 6]} y={[0, 0.7]} height={240} xLabel="θ" yLabel="density" yFormat={v => v.toFixed(2)} label="Two Gaussian approximations of a two-mode posterior">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={xs.map(x => [x, Math.exp(target1d(x))])} stroke="var(--text)" width={2.5} />
      <Path X={X} Y={Y} points={xs.map(x => [x, Math.exp(logNorm(x, rev.m, rev.s))])} stroke="var(--chart-model)" width={2.2} />
      <Path X={X} Y={Y} points={xs.map(x => [x, Math.exp(logNorm(x, fwd.m, fwd.s))])} stroke="var(--chart-val)" width={2.2} dash="6 4" />
    </>}</Plot>
    <Legend items={[['━', 'target posterior p', 'var(--text)'], ['━', `variational fit, min KL(q‖p): mean ${fmt(rev.m, 2)}, sd ${fmt(rev.s, 2)}`, 'var(--chart-model)'], ['┄', `moment matching, min KL(p‖q): mean ${fmt(fwd.m, 2)}, sd ${fmt(fwd.s, 2)}`, 'var(--chart-val)']]} />
    <Controls><Slider label="Correlation ρ of a 2D Gaussian posterior" value={rho} min={0} max={0.99} step={0.01} onChange={setRho} /></Controls>
    <Plot {...(([x, y]) => ({ x, y }))(equalAspect([-3.2, 3.2], [-3.2, 3.2], 560, 300))} height={300} xLabel="θ₁" yLabel="θ₂" label="Mean-field approximation of a correlated Gaussian">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={ell(1, 1, rho)} stroke="var(--text)" width={2.5} />
      <Path X={X} Y={Y} points={ell(mf, mf, 0)} stroke="var(--chart-model)" width={2.2} />
    </>}</Plot>
    <Legend items={[['━', 'true posterior (2σ)', 'var(--text)'], ['━', `mean-field q (2σ): each sd = √(1 − ρ²) = ${fmt(mf, 3)} instead of 1`, 'var(--chart-model)']]} />
    <Insight title="What to notice">Variational inference picks the member of a simple family that minimizes KL(q ‖ p). That divergence punishes q for putting mass where p has none, so q hides inside one mode and ignores the other — mode-seeking. A factorized (mean-field) q cannot represent correlation, and the price is **underestimated variance**: at ρ = 0.9 each marginal sd shrinks to 0.44 of its true value. VI is fast and scales to huge models; MCMC is slower but, run long enough, exact.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('mcmc')
  return <>
    <PanelHeading title="When the posterior has no formula, sample it — or approximate it." pill="MCMC · importance sampling · VI" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['mcmc', 'Markov chain Monte Carlo and its diagnostics'], ['importance', 'Importance sampling'], ['vi', 'Variational inference and its biases']]} /></Controls>
    {view === 'mcmc' ? <McmcView /> : view === 'importance' ? <ImportanceView /> : <VIView />}
  </>
}
