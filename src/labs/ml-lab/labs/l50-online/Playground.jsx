import React, { useMemo, useState } from 'react'
import { separableStream, perceptronOnline, expertLosses, adversarialLosses, hedge, followLeader, hedgeEta, hedgeBound, ARM_SETS, POLICIES, averageRegret } from './engine.js'
import { Plot, Path, Bars } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Caption, Legend } from '../../kit/ui.jsx'
import { fmt } from '../../kit/math.js'

const COL = { greedy: 'var(--muted)', eps: 'var(--chart-train)', ucb: 'var(--chart-model)', ts: 'var(--chart-val)' }
const HORIZONS = [1000, 5000, 20000]

function BanditView() {
  const [arms, setArms] = useState('easy'), [hi, setHi] = useState(1)
  const T = HORIZONS[hi], means = ARM_SETS[arms].means
  const res = useMemo(() => Object.fromEntries(Object.keys(POLICIES).map(p => [p, averageRegret(means, p, T, T > 5000 ? 12 : 30)])), [arms, T]) // eslint-disable-line react-hooks/exhaustive-deps
  const top = Math.max(...Object.values(res).map(r => r.curve.at(-1))) * 1.05
  const bestArm = means.indexOf(Math.max(...means))
  return <>
    <Controls>
      <Choice label="Arms (true success rates are hidden)" value={arms} onChange={setArms} options={Object.entries(ARM_SETS).map(([k, v]) => [k, `${v.name}: ${v.means.join(', ')}`])} />
      <Slider label="Rounds" value={hi} min={0} max={HORIZONS.length - 1} onChange={setHi} format={i => HORIZONS[i].toLocaleString()} />
    </Controls>
    <Caption>Each round, choose one variant to show and observe a success or failure. Regret = successes lost compared with always showing the best variant. Curves average many independent runs.</Caption>
    <Plot x={[0, T]} y={[0, top]} height={260} xLabel="round" yLabel="cumulative regret" xFormat={v => v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)} yFormat={v => v.toFixed(0)} label="Cumulative regret">{({ X, Y }) => Object.entries(res).map(([p, r]) => <Path key={p} X={X} Y={Y} points={r.curve.map((v, k) => [Math.min(T, k * r.step), v])} stroke={COL[p]} width={2.5} />)}</Plot>
    <Legend items={Object.entries(POLICIES).map(([p, v]) => ['━', v.name, COL[p]])} />
    <Metrics items={Object.entries(res).map(([p, r]) => [`${POLICIES[p].name.split(' (')[0]}: regret`, fmt(r.curve.at(-1), 1)])} />
    <Bars label={`Share of rounds spent on the best variant (${means[bestArm]})`} format={v => `${(100 * v).toFixed(1)}%`} max={1} items={Object.entries(res).map(([p, r]) => ({ label: POLICIES[p].name.split(' (')[0], value: r.pulls[bestArm] / T }))} />
    <Insight title="What to notice">Greedy locks onto whichever arm looked good early and sometimes never recovers: its average regret is high and wildly variable. ε-greedy never stops exploring blindly, so its regret keeps growing **linearly** — at 20,000 rounds it overtakes UCB1 in the clear-winner case. UCB1 explores in a principled way and its regret flattens (logarithmic growth), but its bonus assumes rewards anywhere in [0, 1], so with click rates around 5% it over-explores. Thompson sampling samples from Beta posteriors and is best or near-best everywhere.</Insight>
  </>
}

function ExpertsView() {
  const [scenario, setScenario] = useState('stochastic'), [etaMul, setEtaMul] = useState(1)
  const T = 2000, N = scenario === 'stochastic' ? 5 : 2
  const L = useMemo(() => scenario === 'stochastic' ? expertLosses(T) : adversarialLosses(T), [scenario])
  const eta = hedgeEta(T, N) * etaMul, h = useMemo(() => hedge(L, eta), [L, eta]), fl = useMemo(() => followLeader(L), [L])
  const top = Math.max(hedgeBound(T, N), ...h.curve, ...fl.curve) * 1.1
  return <>
    <Controls>
      <Choice label="Loss sequence" value={scenario} onChange={setScenario} options={[['stochastic', '5 forecasters; the best one changes halfway'], ['adversarial', '2 experts; losses alternate against the leader']]} />
      <Slider label="Learning rate η (× theoretical choice)" value={etaMul} min={0.1} max={5} step={0.1} onChange={setEtaMul} />
    </Controls>
    <Plot x={[0, T]} y={[Math.min(0, ...h.curve), top]} height={240} xLabel="round" yLabel="regret vs the best expert" yFormat={v => v.toFixed(0)} label="Regret of Hedge and follow-the-leader">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={[[0, 0], ...h.curve.map((v, t) => [t + 1, hedgeBound(t + 1, N)])]} stroke="var(--text)" width={1.5} dash="6 4" />
      <Path X={X} Y={Y} points={h.curve.map((v, t) => [t + 1, v])} stroke="var(--chart-val)" width={2.5} />
      <Path X={X} Y={Y} points={fl.curve.map((v, t) => [t + 1, v])} stroke="var(--chart-model)" width={2} />
    </>}</Plot>
    <Legend items={[['━', 'Hedge (multiplicative weights)', 'var(--chart-val)'], ['━', 'follow the leader', 'var(--chart-model)'], ['┄', 'Hedge’s guarantee √(T ln N / 2)', 'var(--text)']]} />
    {scenario === 'stochastic' && <Plot x={[0, T]} y={[0, 1]} height={160} xLabel="round" yLabel="Hedge weight" label="Hedge weights over time">{({ X, Y }) => [0, 1, 2, 3, 4].map(i => <Path key={i} X={X} Y={Y} points={h.weights.filter((_, t) => t % 10 === 0).map((w, k) => [k * 10, w[i]])} stroke={['var(--muted)', 'var(--chart-model)', 'var(--chart-train)', 'var(--chart-val)', '#a855f7'][i]} width={1.8} />)}</Plot>}
    <Metrics items={[['Hedge regret', fmt(h.regret, 1)], ['Guarantee (η at the theoretical value)', fmt(hedgeBound(T, N), 1)], ['Follow-the-leader regret', fmt(fl.regret, 1)], ['η used', fmt(eta, 4)]]} />
    <Insight title="What to notice">Hedge keeps a weight per expert and multiplies it by e^(−η·loss) every round, then predicts with the weighted mix. Its regret is guaranteed to stay below √(T ln N / 2) for **any** loss sequence — even one chosen by an adversary. Follow-the-leader works on friendly data but, on the alternating sequence, is wrong every single round: regret grows linearly. Randomizing (or averaging) over experts is what buys robustness. Too large an η behaves like follow-the-leader; too small learns too slowly.</Insight>
  </>
}

function PerceptronView() {
  const [margin, setMargin] = useState(0.3)
  const s = useMemo(() => separableStream(2000, margin), [margin]), p = perceptronOnline(s.data)
  const bound = (p.R / margin) ** 2
  return <>
    <Controls><Slider label="Margin γ of the data stream" value={margin} min={0.05} max={1.5} step={0.05} onChange={setMargin} /></Controls>
    <Plot x={[0, 2000]} y={[0, Math.max(5, p.mistakes * 1.2)]} height={200} xLabel="examples seen" yLabel="cumulative mistakes" yFormat={v => v.toFixed(0)} label="Perceptron mistakes">{({ X, Y }) => <Path X={X} Y={Y} points={p.curve.map((m, t) => [t + 1, m])} stroke="var(--chart-model)" width={2.5} />}</Plot>
    <Metrics items={[['Mistakes on 2,000 examples', String(p.mistakes)], ['Mistake bound (R/γ)²', fmt(bound, 0)], ['Radius R of the data', fmt(p.R, 2)], ['Angle error of final w', `${fmt(Math.abs(Math.atan2(p.w[1], p.w[0]) - Math.atan2(s.u[1], s.u[0])) * 180 / Math.PI, 2)}°`]]} />
    <Insight title="What to notice">The perceptron updates only when it makes a mistake. If some unit vector separates the data with margin γ and every example has norm at most R, it makes at most (R/γ)² mistakes — on any sequence, of any length. After that it never errs again. The bound is loose (far more than the actual count here), but it holds without any assumption about how examples are drawn.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('bandit')
  return <>
    <PanelHeading title="Learning one decision at a time." pill="online learning · bandits" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['bandit', 'Multi-armed bandits'], ['experts', 'Learning from expert advice'], ['perceptron', 'The perceptron’s mistake bound']]} /></Controls>
    {view === 'bandit' ? <BanditView /> : view === 'experts' ? <ExpertsView /> : <PerceptronView />}
  </>
}
