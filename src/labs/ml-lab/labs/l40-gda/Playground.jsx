import React, { useMemo, useState } from 'react'
import { SCENARIOS, makeSet, fitGDA, fitLogistic, bayes, errorRate, mahal2, learningCurves, learningCurvesD, SIZES } from './engine.js'
import { Plot, Path, Contour, ProbabilityField } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Caption, Legend } from '../../kit/ui.jsx'
import { pct } from '../../kit/math.js'

const NS = [10, 20, 40, 80, 160, 400]
const X0 = -4.5, X1 = 8.5, Y0 = -4, Y1 = 6.5
const COL = { lda: 'var(--chart-model)', qda: '#10b981', logistic: 'var(--chart-val)', naiveBayes: '#a855f7' }
const NAME = { lda: 'LDA (shared covariance)', qda: 'QDA (one covariance per class)', logistic: 'Logistic regression', naiveBayes: 'Gaussian naive Bayes (diagonal)' }

function Boundaries() {
  const [key, setKey] = useState('shared'), [ni, setNi] = useState(2), [shade, setShade] = useState('qda'), [ellipses, setEllipses] = useState(true)
  const n = NS[ni], train = useMemo(() => makeSet(key, n, 40 + ni), [key, n, ni]), test = useMemo(() => makeSet(key, 3000, 999), [key])
  const models = useMemo(() => ({ lda: fitGDA(train, true), qda: fitGDA(train, false), logistic: fitLogistic(train) }), [train])
  const b = bayes(key), shaded = models[shade]
  const errs = Object.fromEntries(Object.entries(models).map(([k, m]) => [k, errorRate(m.prob, test)]))
  return <>
    <Controls>
      <Choice label="True world" value={key} onChange={setKey} options={Object.entries(SCENARIOS).map(([k, s]) => [k, s.name])} />
      <Slider label="Training examples" value={ni} min={0} max={NS.length - 1} onChange={setNi} format={i => NS[i]} />
      <Choice label="Shade probabilities of" value={shade} onChange={setShade} options={Object.keys(models).map(k => [k, NAME[k]])} />
      <Toggle label="Show the fitted Gaussians (1σ and 2σ ellipses)" checked={ellipses} onChange={setEllipses} />
    </Controls>
    <Plot x={[X0, X1]} y={[Y0, Y1]} height={340} tickFormat={v => v.toFixed(1)} xLabel="x₁" yLabel="x₂" label="Decision boundaries of three classifiers">{({ X, Y }) => <>
      <ProbabilityField X={X} Y={Y} x0={X0} x1={X1} y0={Y0} y1={Y1} p={shaded.prob} cells={40} />
      {ellipses && shade !== 'logistic' && [[shaded.m0, shaded.S0, 'var(--chart-train)'], [shaded.m1, shaded.S1, 'var(--chart-val)']].map(([m, S, c], i) => [1, 4].map(l => <Contour key={`${i}-${l}`} X={X} Y={Y} x0={X0} x1={X1} y0={Y0} y1={Y1} f={(a, bb) => mahal2([a, bb], m, S)} level={l} stroke={c} width={1.2} dash="3 3" cells={60} />))}
      {b && <Contour X={X} Y={Y} x0={X0} x1={X1} y0={Y0} y1={Y1} f={b} level={0.5} stroke="var(--text)" width={1.5} dash="7 5" />}
      {Object.entries(models).map(([k, m]) => <Contour key={k} X={X} Y={Y} x0={X0} x1={X1} y0={Y0} y1={Y1} f={m.prob} level={0.5} stroke={COL[k]} width={2.5} />)}
      {train.map((p, i) => <circle key={i} cx={X(p.x1)} cy={Y(p.x2)} r="3.6" fill={p.label ? 'var(--chart-val)' : 'var(--chart-train)'} stroke="var(--text)" strokeWidth="0.5" />)}
    </>}</Plot>
    <Legend items={[...Object.keys(models).map(k => ['━', NAME[k], COL[k]]), ...(b ? [['┄', 'Bayes-optimal boundary (true distributions)', 'var(--text)']] : []), ['●', 'class 0', 'var(--chart-train)'], ['●', 'class 1', 'var(--chart-val)']]} />
    <Metrics items={[...Object.keys(models).map(k => [`${NAME[k].split(' (')[0]} · test error`, pct(errs[k])]), ['Best possible (Bayes) error', b ? pct(errorRate(b, test)) : 'unknown here']]} />
    <Insight title="What to notice">LDA fits one Gaussian per class with a **shared** covariance, so its log-odds is linear: a straight boundary, like logistic regression. QDA gives each class its own covariance and the boundary curves — around the tight class in the “different covariances” world. In the far-subgroup world, the distant points are easy to classify but drag LDA’s mean and covariance; logistic regression, which only models the boundary, barely notices them.</Insight>
  </>
}

function Curves() {
  const [mode, setMode] = useState('shared')
  const r = useMemo(() => mode.startsWith('d') ? learningCurvesD(Number(mode.slice(1))) : { sizes: SIZES, ...learningCurves(mode) }, [mode])
  const all = Object.values(r.curves).flat(), top = Math.min(0.55, Math.max(...all) + 0.03), bottom = Math.max(0, Math.min(...all, r.bayes ?? 1) - 0.03)
  const lx = n => r.sizes.indexOf(n)
  return <>
    <Controls><Choice label="Setting" value={mode} onChange={setMode} options={[...Object.entries(SCENARIOS).map(([k, s]) => [k, `2 features · ${s.name}`]), ['d10', '10 features · Gaussian classes, shared covariance'], ['d20', '20 features · Gaussian classes, shared covariance']]} /></Controls>
    <Plot x={[0, r.sizes.length - 1]} y={[bottom, top]} height={280} xTicks={r.sizes.length} xLabel="training examples (roughly doubling)" yLabel="test error" xFormat={v => r.sizes[Math.round(v)]} yFormat={v => `${(100 * v).toFixed(0)}%`} label="Learning curves">{({ X, Y }) => <>
      {r.bayes !== null && <Path X={X} Y={Y} points={[[lx(r.sizes[0]), r.bayes], [lx(r.sizes.at(-1)), r.bayes]]} stroke="var(--text)" width={1.5} dash="7 5" />}
      {Object.entries(r.curves).map(([k, c]) => <g key={k}><Path X={X} Y={Y} points={c.map((v, i) => [lx(r.sizes[i]), v])} stroke={COL[k]} width={2.5} />{c.map((v, i) => <circle key={i} cx={X(lx(r.sizes[i]))} cy={Y(v)} r="3.5" fill={COL[k]} />)}</g>)}
    </>}</Plot>
    <Legend items={[...Object.keys(r.curves).map(k => ['━', NAME[k], COL[k]]), ...(r.bayes !== null ? [['┄', 'Bayes error (best possible)', 'var(--text)']] : [])]} />
    <Caption>Each point averages many independently drawn training sets, all scored on the same large test set.</Caption>
    <Insight title="The generative–discriminative trade-off">When the Gaussian assumption holds, generative models use it to learn from fewer examples — most visibly **naive Bayes with 20 features**, which estimates only per-feature means and variances. Full LDA must estimate every covariance entry and is unstable when examples barely outnumber features. With enough data all correct models meet at the Bayes error. When the assumption is wrong (the far-subgroup world), the generative models level off at a higher error, while logistic regression keeps improving: it assumed less.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('boundaries')
  return <>
    <PanelHeading title="Model how each class looks — then classify with Bayes’ rule." pill="LDA · QDA · logistic" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['boundaries', 'Decision boundaries'], ['curves', 'Learning curves: who wins with little data?']]} /></Controls>
    {view === 'boundaries' ? <Boundaries /> : <Curves />}
  </>
}
