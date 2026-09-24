import React, { useMemo, useState } from 'react'
import { betaPdf, coinPosterior, flips, curveData, truth, polyFeatures, gaussFeatures, bayesLinReg, leastSquares, evalFeat, evidenceCurve } from './engine.js'
import { Plot, Path } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Caption, Legend, Actions } from '../../kit/ui.jsx'
import { random, fmt, pct } from '../../kit/math.js'

const PRIORS = [['1,1', 'Uniform · Beta(1, 1)'], ['2,2', 'Mild belief in fairness · Beta(2, 2)'], ['20,20', 'Strong belief in fairness · Beta(20, 20)'], ['0.5,0.5', 'Expect a biased coin · Beta(½, ½)'], ['8,2', 'Expect mostly heads · Beta(8, 2)']]
const ALPHAS = [1e-4, 1e-3, 0.01, 0.1, 1, 10, 100]
const grid = n => Array.from({ length: n + 1 }, (_, i) => i / n)

function Coin() {
  const [prior, setPrior] = useState('2,2'), [p, setP] = useState(0.7), [n, setN] = useState(10), [seed, setSeed] = useState(1)
  const [a, b] = prior.split(',').map(Number), seq = useMemo(() => flips(p, 200, seed), [p, seed])
  const h = seq.slice(0, n).reduce((s, v) => s + v, 0), t = n - h, post = coinPosterior(a, b, h, t)
  const xs = grid(300), priorD = xs.map(x => betaPdf(x, a, b)), postD = xs.map(x => betaPdf(x, post.A, post.B)), likeD = xs.map(x => betaPdf(x, h + 1, t + 1))
  const top = Math.min(Math.max(...postD, ...priorD.filter(Number.isFinite), ...likeD) * 1.1, 30)
  return <>
    <Controls>
      <Choice label="Prior belief about P(heads)" value={prior} onChange={setPrior} options={PRIORS} />
      <Slider label="True P(heads) — hidden from the learner" value={p} min={0.05} max={0.95} step={0.05} onChange={setP} />
      <Slider label="Flips observed" value={n} min={0} max={200} onChange={setN} />
    </Controls>
    <p className="ml-caption ml-mono">{seq.slice(0, Math.min(n, 60)).map(v => v ? 'H' : 'T').join('')}{n > 60 ? ` … (${n} flips)` : ''} → {h} heads, {t} tails</p>
    <Plot x={[0, 1]} y={[0, top]} height={260} yFormat={v => v.toFixed(1)} xLabel="P(heads)" yLabel="density" label="Prior, likelihood and posterior">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={xs.map((x, i) => [x, Math.min(priorD[i], top)])} stroke="var(--muted)" width={2} dash="6 4" />
      {n > 0 && <Path X={X} Y={Y} points={xs.map((x, i) => [x, Math.min(likeD[i], top)])} stroke="var(--chart-val)" width={1.8} />}
      <Path X={X} Y={Y} points={xs.map((x, i) => [x, Math.min(postD[i], top)])} stroke="var(--chart-model)" width={3} />
      <rect x={X(post.lo)} y={Y(top)} width={X(post.hi) - X(post.lo)} height={Y(0) - Y(top)} fill="var(--chart-model)" opacity="0.08" />
      <Path X={X} Y={Y} points={[[p, 0], [p, top]]} stroke="var(--text)" width={1.5} />
    </>}</Plot>
    <Legend items={[['┄', `prior Beta(${a}, ${b})`, 'var(--muted)'], ['━', 'likelihood of the flips (rescaled)', 'var(--chart-val)'], ['━', `posterior Beta(${fmt(post.A, 1)}, ${fmt(post.B, 1)})`, 'var(--chart-model)'], ['■', '95% credible interval', 'var(--chart-model)'], ['│', 'true value', 'var(--text)']]} />
    <Metrics items={[['Maximum likelihood h/n', n ? fmt(h / n, 3) : '—'], ['Posterior mean', fmt(post.mean, 3)], ['95% credible interval', `${fmt(post.lo, 3)} – ${fmt(post.hi, 3)}`], ['P(next flip is heads)', pct(post.predictive)]]} />
    <Actions><button onClick={() => setSeed(s => s + 1)}>Flip a new sequence</button></Actions>
    <Insight title="What to notice">The posterior is the prior times the likelihood, renormalized — and with a Beta prior it stays a Beta: add heads to the first number and tails to the second. With few flips the prior matters (compare uniform with the strong fairness prior); with many flips every sensible prior is overwhelmed by the data. After 0 flips, maximum likelihood cannot answer at all; after 3 heads in 3 flips, it claims heads is certain. The posterior never does either.</Insight>
  </>
}

function Regression() {
  const [n, setN] = useState(6), [ai, setAi] = useState(3), [basis, setBasis] = useState('gauss'), [samples, setSamples] = useState(true), [showMl, setShowMl] = useState(false)
  const all = useMemo(() => curveData(25, 7), []), data = all.slice(0, n), alpha = ALPHAS[ai], beta = 16
  const feat = basis === 'gauss' ? x => gaussFeatures(x) : x => polyFeatures(x, 9)
  const post = bayesLinReg(data, feat, alpha, beta), ml = n > 0 ? leastSquares(data, feat) : null
  const xs = grid(160), pred = xs.map(x => post.predict(x))
  const draws = useMemo(() => { const rng = random(3); return Array.from({ length: 6 }, () => post.sample(rng)) }, [post])
  const clip = v => Math.max(-2.5, Math.min(2.5, v))
  return <>
    <Controls>
      <Slider label="Observations" value={n} min={0} max={25} onChange={setN} />
      <Slider label="Prior precision α (how strongly weights are pulled to 0)" value={ai} min={0} max={ALPHAS.length - 1} onChange={setAi} format={i => ALPHAS[i]} />
      <Choice label="Features" value={basis} onChange={setBasis} options={[['gauss', '9 Gaussian bumps + constant'], ['poly', 'Polynomial of degree 9']]} />
      <Toggle label="Draw functions sampled from the posterior" checked={samples} onChange={setSamples} />
      <Toggle label="Show the maximum-likelihood fit (no prior)" checked={showMl} onChange={setShowMl} />
    </Controls>
    <Plot x={[0, 1]} y={[-2.5, 2.5]} height={300} xLabel="x" yLabel="y" label="Bayesian linear regression">{({ X, Y }) => <>
      <path d={`M ${xs.map((x, i) => `${X(x)} ${Y(clip(pred[i].mean + 2 * Math.sqrt(pred[i].variance)))}`).join(' L ')} L ${[...xs].reverse().map((x, i) => { const k = xs.length - 1 - i; return `${X(x)} ${Y(clip(pred[k].mean - 2 * Math.sqrt(pred[k].variance)))}` }).join(' L ')} Z`} fill="var(--chart-model)" opacity="0.12" />
      <Path X={X} Y={Y} points={xs.map(x => [x, truth(x)])} stroke="var(--text)" width={1.5} dash="6 4" />
      {samples && draws.map((w, j) => <Path key={j} X={X} Y={Y} points={xs.map(x => [x, clip(evalFeat(w, feat, x))])} stroke="var(--chart-model)" width={1} opacity={0.5} />)}
      <Path X={X} Y={Y} points={xs.map((x, i) => [x, clip(pred[i].mean)])} stroke="var(--chart-model)" width={3} />
      {showMl && ml && <Path X={X} Y={Y} points={xs.map(x => [x, clip(ml.predict(x).mean)])} stroke="var(--chart-val)" width={2} />}
      {data.map((d, i) => <circle key={i} cx={X(d.x)} cy={Y(d.y)} r="4.5" fill="var(--chart-train)" stroke="var(--text)" strokeWidth="0.6" />)}
    </>}</Plot>
    <Legend items={[['━', 'posterior mean = MAP = ridge fit', 'var(--chart-model)'], ['■', '±2 standard deviations of the predictive distribution', 'var(--chart-model)'], ...(samples ? [['─', 'functions drawn from the posterior', 'var(--chart-model)']] : []), ...(showMl ? [['━', 'maximum likelihood', 'var(--chart-val)']] : []), ['┄', 'true function', 'var(--text)']]} />
    <Metrics items={[['Predictive sd at x = 0.5', fmt(Math.sqrt(post.predict(0.5).variance), 3)], ['…of which from uncertain weights', fmt(Math.sqrt(post.predict(0.5).paramVariance), 3)], ['Noise sd (1/√β)', fmt(1 / Math.sqrt(beta), 3)], ['Equivalent ridge λ = α/β', fmt(alpha / beta, 5)]]} />
    <Insight title="What to notice">With no data, the band is the prior: any smooth-ish function is plausible. Each observation pins the functions down near it, and the band shrinks there but stays wide where there is no data — the model knows what it does not know. The band never shrinks below the noise level. Show the maximum-likelihood fit with few points and a degree-9 polynomial: it swings wildly. The posterior mean is exactly ridge regression with λ = α/β.</Insight>
  </>
}

function Evidence() {
  const [n, setN] = useState(10), [deg, setDeg] = useState(3)
  const rows = useMemo(() => evidenceCurve(n), [n]), best = rows.reduce((b, r) => r.logEvidence > b.logEvidence ? r : b)
  const data = useMemo(() => curveData(n, 41), [n]), feat = x => polyFeatures(x, deg), post = bayesLinReg(data, feat, 5e-3, 16), ml = leastSquares(data, feat)
  const xs = grid(160), clip = v => Math.max(-2.5, Math.min(2.5, v)), lo = Math.min(...rows.map(r => r.logEvidence))
  return <>
    <Controls>
      <Choice label="Observations" value={String(n)} onChange={v => setN(Number(v))} options={['10', '15', '30']} />
      <Slider label="Polynomial degree to display" value={deg} min={0} max={9} onChange={setDeg} />
    </Controls>
    <Plot x={[0, 9]} y={[lo - 2, best.logEvidence + 3]} height={220} xTicks={10} xLabel="polynomial degree" yLabel="log evidence" xFormat={v => Math.round(v)} yFormat={v => v.toFixed(0)} label="Model evidence by degree">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={rows.map(r => [r.degree, r.logEvidence])} stroke="var(--chart-model)" width={2.5} />
      {rows.map(r => <circle key={r.degree} cx={X(r.degree)} cy={Y(r.logEvidence)} r={r.degree === deg ? 6 : 4} fill={r === best ? 'var(--chart-val)' : 'var(--chart-model)'} />)}
    </>}</Plot>
    <Plot x={[0, 9]} y={[0, 1]} height={180} xTicks={10} xLabel="polynomial degree" yLabel="RMSE (clipped at 1)" xFormat={v => Math.round(v)} label="Training and test error of least squares">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={rows.map(r => [r.degree, Math.min(1, r.trainRmse)])} stroke="var(--chart-train)" width={2.5} />
      <Path X={X} Y={Y} points={rows.map(r => [r.degree, Math.min(1, r.testRmse)])} stroke="var(--chart-val)" width={2.5} />
    </>}</Plot>
    <Legend items={[['━', 'training error (least squares)', 'var(--chart-train)'], ['━', 'test error (least squares)', 'var(--chart-val)'], ['●', `highest evidence: degree ${best.degree}`, 'var(--chart-val)']]} />
    <Plot x={[0, 1]} y={[-2.5, 2.5]} height={220} xLabel="x" yLabel="y" label="The fit at the chosen degree">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={xs.map(x => [x, truth(x)])} stroke="var(--text)" width={1.5} dash="6 4" />
      <Path X={X} Y={Y} points={xs.map(x => [x, clip(ml.predict(x).mean)])} stroke="var(--chart-val)" width={2} />
      <Path X={X} Y={Y} points={xs.map(x => [x, clip(post.predict(x).mean)])} stroke="var(--chart-model)" width={2.5} />
      {data.map((d, i) => <circle key={i} cx={X(d.x)} cy={Y(d.y)} r="4" fill="var(--chart-train)" />)}
    </>}</Plot>
    <Legend items={[['━', 'Bayesian posterior mean', 'var(--chart-model)'], ['━', 'least squares', 'var(--chart-val)'], ['┄', 'true function', 'var(--text)']]} />
    <Caption>{`Evidence p(data | model) = ∫ p(data | w) p(w) dw, computed exactly for each degree with the same prior (α = 0.005) and noise (β = 16), using only the ${n} training points.`}</Caption>
    <Insight title="Occam’s razor, automatically">Training error can only fall as the degree grows, so it cannot choose the degree. The evidence rewards fitting the data but also penalizes models that spread their prior over many functions that were never needed: it rises, peaks at degree 3 — where test error is also lowest — and then falls. No validation set was used.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('coin')
  return <>
    <PanelHeading title="Treat unknown parameters as uncertain — and update them." pill="posterior = prior × likelihood / evidence" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['coin', 'Beta–binomial: learning a coin’s bias'], ['regression', 'Bayesian linear regression'], ['evidence', 'Model evidence: choosing complexity']]} /></Controls>
    {view === 'coin' ? <Coin /> : view === 'regression' ? <Regression /> : <Evidence />}
  </>
}
