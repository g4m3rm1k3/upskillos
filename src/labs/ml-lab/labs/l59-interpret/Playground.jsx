import React, { useMemo, useState } from 'react'
import { FEATURES, TRAIN, TEST, f, mse, permutationImportance, gainImportance, dropColumn, iceCurves, pdp, offManifold, shapley, BACKGROUND, lime, counterfactual } from './engine.js'
import { Plot, Path, Bars } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Caption, Legend, Table } from '../../kit/ui.jsx'
import { fmt, linspace, range } from '../../kit/math.js'

const NAMES = FEATURES.map(F => F.name)
const show = (k, v) => (FEATURES[k].binary ? (v ? 'yes' : 'no') : k === 5 ? fmt(v, 2) : fmt(v, 1))
const memo = {}
const once = (key, fn) => memo[key] ?? (memo[key] = fn())

function Row({ i }) {
  const x = TEST[i].x
  return <Table head={['feature', ...FEATURES.map(F => F.key)]} rows={[['value', ...x.map((v, k) => show(k, v))]]} caption={`Test build ${i + 1}: the model predicts ${fmt(f(x), 1)} min; it actually took ${fmt(TEST[i].y, 1)} min.`} />
}

// ---------- 59.1 Global importance ----------
function ImportanceView() {
  const [on, setOn] = useState('test'), [variant, setVariant] = useState('full')
  const models = { full: { name: 'All six features', g: f }, noLines: { name: 'Refit without lines changed', drop: 1 }, noSize: { name: 'Refit without change size', drop: 0 } }
  const m = variant === 'full' ? { g: f, testMse: mse(TEST) } : once(`drop${models[variant].drop}`, () => dropColumn(models[variant].drop))
  const imp = once(`perm-${on}-${variant}`, () => permutationImportance(on === 'test' ? TEST : TRAIN, { g: m.g }))
  const gain = once('gain', () => gainImportance())
  return <>
    <Controls>
      <Choice label="Model" value={variant} onChange={setVariant} options={Object.entries(models).map(([k, v]) => [k, v.name])} />
      <Choice label="Measure permutation importance on" value={on} onChange={setOn} options={[['test', 'Held-out test builds'], ['train', 'Training builds']]} />
    </Controls>
    <Caption>A boosted-tree model (150 depth-4 trees) predicts build minutes from six features. **Lines changed** is nearly a copy of change size but plays no part in the true process; **build id** is random noise.</Caption>
    <Metrics items={[['training MSE', fmt(mse(TRAIN, m.g), 2)], ['test MSE', fmt(m.testMse, 2)]]} />
    <h3>Permutation importance: rise in squared error when one column is shuffled</h3>
    <Bars label="Permutation importance" items={imp.map(o => ({ label: FEATURES[o.feature].key, value: o.rise }))} format={v => fmt(v, 2)} />
    <h3>Gain importance: share of all split improvement (training data, full model)</h3>
    <Bars label="Gain importance" items={gain.map((v, k) => ({ label: FEATURES[k].key, value: v, color: 'var(--chart-val)' }))} format={v => `${(100 * v).toFixed(1)}%`} />
    <Insight title="What to notice">On training builds the random build id seems to matter — the model memorized it — while on test builds its importance is essentially zero; measure on held-out data. Gain importance rates build id about as highly as hour of day, which has a real 4-minute effect, because a feature with many distinct values offers many chances to split noise. Most striking: shuffling change size raises error by over 100, yet refitting without it raises test MSE only from about 7.4 to 9.7 — lines changed and files touched carry nearly the same information. Permutation importance measures what this model relies on, not what the outcome needs.</Insight>
  </>
}

// ---------- 59.2 Partial dependence and ICE ----------
function PdpView() {
  const [j, setJ] = useState(0), [center, setCenter] = useState(false), [mark, setMark] = useState(true)
  const F = FEATURES[j], grid = F.binary ? [0, 1] : linspace(F.lo, F.hi, 21), rows = TEST.slice(0, 40)
  const curves = useMemo(() => iceCurves(j, rows, grid), [j]) // eslint-disable-line react-hooks/exhaustive-deps
  const shown = center ? curves.map(c => c.map(v => v - c[0])) : curves, avg = pdp(shown)
  const far = useMemo(() => rows.map(r => grid.map(v => { const x = [...r.x]; x[j] = v; return offManifold(x) > 1 })), [j]) // eslint-disable-line react-hooks/exhaustive-deps
  const flat = shown.flat(), lo = 5 * Math.floor(Math.min(...flat) / 5), hi = 5 * Math.ceil(Math.max(...flat) / 5), share = far.flat().filter(Boolean).length / far.flat().length
  return <>
    <Controls>
      <Choice label="Feature" value={String(j)} onChange={v => setJ(Number(v))} options={[0, 1, 2, 3, 4].map(k => [String(k), NAMES[k]])} />
      <Toggle label="Centre each curve at its left end (c-ICE)" checked={center} onChange={setCenter} />
      <Toggle label="Mark points far from any real build" checked={mark} onChange={setMark} />
    </Controls>
    <Caption>{`Each thin line is one test build with only ${F.name} changed across its range (an ICE curve); the thick line is their average, the partial dependence. A red dot marks a changed build more than one standard deviation (in standardized units) from every training build.`}</Caption>
    <Plot x={[F.lo, F.hi]} y={[lo, hi]} height={280} xLabel={F.name} yLabel={center ? 'change in predicted minutes' : 'predicted minutes'} label="ICE and partial dependence">{({ X, Y }) => <>
      {shown.map((c, i) => <Path key={i} X={X} Y={Y} points={grid.map((v, k) => [v, c[k]])} stroke="var(--chart-train)" width={1} opacity={0.35} />)}
      {mark && shown.map((c, i) => grid.map((v, k) => far[i][k] && <circle key={`${i}-${k}`} cx={X(v)} cy={Y(c[k])} r="2.4" fill="#ef4444" opacity="0.7" />))}
      <Path X={X} Y={Y} points={grid.map((v, k) => [v, avg[k]])} stroke="var(--chart-model)" width={3.5} />
    </>}</Plot>
    <Legend items={[['━', 'ICE: one build', 'var(--chart-train)'], ['━', 'partial dependence (average)', 'var(--chart-model)'], ['●', 'far from real data', '#ef4444']]} />
    <Metrics items={[['points far from real builds', `${(100 * share).toFixed(0)}%`], ['PDP range', `${fmt(avg[0], 1)} → ${fmt(avg[avg.length - 1], 1)}`]]} />
    <Insight title="What to notice">For change size, the ICE curves are not parallel: with centring on, builds with a cache miss rise more steeply than builds with a cache hit — an interaction the single average line hides. Setting a small change to 100 MB while keeping its lines changed at a few thousand creates builds that never occur (red dots), so the curve there reports the model’s extrapolation, not a pattern in the data. Lines changed looks almost flat: the model chose change size, so the partial dependence of its near-copy says little about the world.</Insight>
  </>
}

// ---------- 59.3 Shapley values ----------
function ShapleyView() {
  const [i, setI] = useState(3), [dep, setDep] = useState(false)
  const s = useMemo(() => shapley(TEST[i].x, BACKGROUND), [i])
  const all = dep ? once('shap-all', () => range(40).map(k => ({ x: TEST[k].x, phi: shapley(TEST[k].x, BACKGROUND).phi }))) : null
  let run = s.base
  const steps = s.phi.map((p, k) => { const from = run; run += p; return { k, from, to: run } })
  const vals = [s.base, ...steps.map(t => t.to)], lo = Math.floor(Math.min(...vals) - 4), hi = lo + 4 * Math.ceil((Math.max(...vals) + 1 - lo) / 4)
  return <>
    <Controls>
      <Slider label="Test build" value={i + 1} min={1} max={40} onChange={v => setI(v - 1)} />
      <Toggle label="Show the cache-hit contribution across 40 builds" checked={dep} onChange={setDep} />
    </Controls>
    <Row i={i} />
    <Caption>{`Exact Shapley values: all 2⁶ = 64 coalitions of features, each valued by averaging the model over ${BACKGROUND.length} background builds with the missing features taken from them. The bars walk from the average prediction to this build’s prediction.`}</Caption>
    <Plot x={[0, 7]} y={[lo, hi]} height={260} xLabel="average, then each feature’s contribution" yLabel="predicted minutes" xFormat={() => ''} label="Shapley waterfall">{({ X, Y }) => <>
      <rect x={X(0.15)} y={Y(s.base) - 2} width={X(0.85) - X(0.15)} height="4" fill="var(--muted)" />
      {steps.map(t => <rect key={t.k} x={X(t.k + 1.15)} y={Y(Math.max(t.from, t.to))} width={X(0.7) - X(0)} height={Math.max(1, Math.abs(Y(t.from) - Y(t.to)))} fill={t.to >= t.from ? '#ef4444' : '#10b981'} opacity="0.85" />)}
      {['average', ...FEATURES.map(F => F.key)].map((n, k) => <text key={n} x={X(k + 0.5)} y={Y(lo) - 6} textAnchor="middle" style={{ fontSize: 11, fill: 'var(--text)' }}>{n}</text>)}
      <line x1={X(0)} x2={X(7)} y1={Y(s.full)} y2={Y(s.full)} stroke="var(--text)" strokeDasharray="4 3" />
    </>}</Plot>
    <Legend items={[['■', 'pushes the prediction up', '#ef4444'], ['■', 'pushes it down', '#10b981'], ['┅', 'this build’s prediction', 'var(--text)']]} />
    <Metrics items={[['average prediction (base)', fmt(s.base, 2)], ['sum of Shapley values', fmt(s.phi.reduce((a, b) => a + b, 0), 2)], ['base + sum', fmt(s.base + s.phi.reduce((a, b) => a + b, 0), 2)], ['model prediction', fmt(f(TEST[i].x), 2)]]} />
    {all && <>
      <Plot x={[0, 100]} y={[Math.min(...all.map(a => a.phi[3])) - 1, Math.max(...all.map(a => a.phi[3])) + 1]} height={220} xLabel="change size (MB)" yLabel="Shapley value of cache hit" label="Dependence plot">{({ X, Y }) => all.map((a, k) => <circle key={k} cx={X(a.x[0])} cy={Y(a.phi[3])} r="4" fill={a.x[3] ? '#10b981' : '#ef4444'} opacity="0.8" />)}</Plot>
      <Legend items={[['●', 'cache hit', '#10b981'], ['●', 'cache miss', '#ef4444']]} />
    </>}
    <Insight title="What to notice">The contributions always add up exactly to the prediction minus the average — the efficiency property. The dependence plot shows the cache interaction: a cache hit is credited with saving more time on bigger changes, and a miss is charged more. Build id and lines changed get small but non-zero values: Shapley values explain the model, including what it memorized. Swap the background set and the values change, because “feature missing” is defined by that set.</Insight>
  </>
}

// ---------- 59.4 Local surrogates ----------
function LimeView() {
  const [i, setI] = useState(3), [width, setWidth] = useState(0.75), [n, setN] = useState(400)
  const x = TEST[i].x, fits = useMemo(() => [1, 2, 3].map(seed => lime(x, { width, n, seed })), [i, width, n]) // eslint-disable-line react-hooks/exhaustive-deps
  const shap = useMemo(() => shapley(x, BACKGROUND), [i]) // eslint-disable-line react-hooks/exhaustive-deps
  return <>
    <Controls>
      <Slider label="Test build" value={i + 1} min={1} max={40} onChange={v => setI(v - 1)} />
      <Slider label="Kernel width (standard deviations)" value={width} min={0.2} max={2} step={0.05} onChange={setWidth} format={v => v.toFixed(2)} />
      <Slider label="Perturbed samples" value={n} min={50} max={800} step={50} onChange={setN} />
    </Controls>
    <Row i={i} />
    <Caption>A local surrogate: sample builds near this one, ask the model about each, weight each by closeness, and fit a weighted linear regression. Coefficients are minutes per standard deviation of the feature. Three runs differ only in the random perturbations.</Caption>
    <Bars label="Surrogate coefficients, run 1" items={fits[0].coef.map(c => ({ label: FEATURES[c.feature].key, value: c.perSd }))} format={v => fmt(v, 2)} />
    <Table head={['feature', 'run 1', 'run 2', 'run 3', 'Shapley value (minutes)']} rows={fits[0].coef.map((c, k) => [NAMES[c.feature], ...fits.map(r => fmt(r.coef[k].perSd, 2)), fmt(shap.phi[c.feature], 2)])} caption="Surrogate coefficients (per standard deviation) and, for comparison, Shapley values. They answer different questions, so they need not match — but a stable explanation should at least agree with itself across runs." />
    <Metrics items={[['local fidelity (weighted R²), run 1', fmt(fits[0].fidelity, 2)], ['effective sample size, run 1', fmt(fits[0].effectiveN, 0)], ['size coefficient range over runs', `${fmt(Math.min(...fits.map(r => r.coef[0].perSd)), 2)} to ${fmt(Math.max(...fits.map(r => r.coef[0].perSd)), 2)}`]]} />
    <Insight title="What to notice">The explanation depends on choices you make, not only on the model. A narrow kernel describes a tiny neighbourhood but rests on few effective samples, so the three runs disagree; a wide kernel is stable but describes a larger region, where the model is less linear. The tree model is piecewise constant, so very close to a point its true local slope is zero — a “local linear” story is always an approximation at some chosen scale. Report the kernel width and check stability before trusting a surrogate.</Insight>
  </>
}

// ---------- 59.5 Counterfactuals ----------
const ALLOWED = { act: { name: 'Actionable: size, files, cache', allowed: [0, 2, 3] }, sizeOnly: { name: 'Change size only', allowed: [0] }, any: { name: 'Anything except build id (includes hour)', allowed: [0, 1, 2, 3, 4] } }
function CounterfactualView() {
  const [i, setI] = useState(32), [cut, setCut] = useState(12), [set, setSet] = useState('act')
  const x = TEST[i].x, target = f(x) - cut
  const cf = useMemo(() => counterfactual(x, target, { allowed: ALLOWED[set].allowed }), [i, cut, set]) // eslint-disable-line react-hooks/exhaustive-deps
  return <>
    <Controls>
      <Slider label="Test build" value={i + 1} min={1} max={40} onChange={v => setI(v - 1)} />
      <Slider label="Required reduction (minutes)" value={cut} min={2} max={20} onChange={setCut} />
      <Choice label="Features the explanation may change" value={set} onChange={setSet} options={Object.entries(ALLOWED).map(([k, v]) => [k, v.name])} />
    </Controls>
    <Row i={i} />
    <Caption>{`A counterfactual explanation answers “what is the smallest change that would have made the prediction at most ${fmt(target, 1)} minutes?” Distance adds each numeric change in standard deviations, plus 1 for each yes/no feature flipped.`}</Caption>
    {cf ? <>
      <Table head={['feature', 'actual', 'counterfactual']} rows={cf.changes.map(c => [NAMES[c.feature], show(c.feature, c.from), show(c.feature, c.to)])} caption={`New prediction ${fmt(cf.pred, 1)} min (target ≤ ${fmt(target, 1)}); distance ${fmt(cf.dist, 2)}. Unlisted features are unchanged.`} />
      <Metrics items={[['features changed', cf.changes.length], ['distance', fmt(cf.dist, 2)], ['new prediction', fmt(cf.pred, 1)], ['plausibility: distance to nearest real build', fmt(offManifold(cf.x), 2)]]} />
    </> : <Caption>No change to these features reaches the target. That is itself an explanation: the prediction cannot be moved this far by what you are allowed to change.</Caption>}
    <Insight title="What to notice">The answer depends on what you allow and how you measure distance. For build 33 with a 12-minute cut, the cheapest actionable change is simply turning the cache on. Restricted to change size, size must fall to about a third — and because lines changed stays where it was, the result is a build unlike any real one (the plausibility distance jumps). Allowing hour of day can add “start it after 17:00”, which is valid for the model but only useful if you control when builds run. Weigh the distance differently and the “smallest” change changes. And a counterfactual describes the model: it says what the model would predict, not what the build would do — that is a causal question (Lab 36).</Insight>
  </>
}

const VIEWS = { 'l59-importance': ImportanceView, 'l59-pdp': PdpView, 'l59-shapley': ShapleyView, 'l59-lime': LimeView, 'l59-counterfactual': CounterfactualView }
const TITLES = { 'l59-importance': 'Which features does the model rely on?', 'l59-pdp': 'How does the prediction change along one feature?', 'l59-shapley': 'Share one prediction fairly among the features.', 'l59-lime': 'Fit a simple model around one prediction.', 'l59-counterfactual': 'What would have to change to get a different answer?' }
export default function Playground({ lesson }) {
  const id = VIEWS[lesson?.id] ? lesson.id : 'l59-importance', View = VIEWS[id]
  return <>
    <PanelHeading title={TITLES[id]} pill="interpretability" />
    <View />
  </>
}
