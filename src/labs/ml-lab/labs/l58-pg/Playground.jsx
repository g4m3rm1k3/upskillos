import React, { useEffect, useMemo, useState } from 'react'
import { METHODS, train, movingAverage, gradientSpread, rollout, pRight, MAX_STEPS } from './engine.js'
import { Plot, Path, Bars } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Caption, Legend, Actions, Table, useTicker } from '../../kit/ui.jsx'
import { fmt, mean } from '../../kit/math.js'

const COL = { reinforce: 'var(--chart-train)', baseline: 'var(--chart-val)', ac: '#10b981' }
const cache = {}
const runsFor = (m, episodes) => cache[`${m}-${episodes}`] ?? (cache[`${m}-${episodes}`] = [1, 2, 3].map(s => train(m, { ...METHODS[m].opts, episodes, seed: s })))

function CartPole({ states, t }) {
  const s = states[Math.min(t, states.length - 1)], X = x => 200 + x * 70, cartY = 110, len = 70
  return <svg viewBox="0 0 400 150" className="ml-plot" role="img" aria-label="Cart-pole animation" style={{ maxWidth: 480 }}>
    <line x1={X(-2.4)} x2={X(2.4)} y1={cartY + 14} y2={cartY + 14} stroke="var(--muted)" strokeWidth="2" />
    {[-2.4, 2.4].map(b => <line key={b} x1={X(b)} x2={X(b)} y1={cartY - 10} y2={cartY + 20} stroke="#ef4444" strokeWidth="2" />)}
    <rect x={X(s[0]) - 22} y={cartY - 8} width="44" height="20" rx="4" fill="var(--chart-model)" />
    <line x1={X(s[0])} y1={cartY - 8} x2={X(s[0]) + len * Math.sin(s[2])} y2={cartY - 8 - len * Math.cos(s[2])} stroke="var(--text)" strokeWidth="5" strokeLinecap="round" />
    <text x="10" y="18" style={{ fontSize: 12, fill: 'var(--text)' }}>{`step ${Math.min(t, states.length - 1) + 1} of ${states.length}`}</text>
  </svg>
}

function TrainView() {
  const [episodes, setEpisodes] = useState(400), [watch, setWatch] = useState('ac'), [t, setT] = useState(0), [running, setRunning] = useState(false)
  const runs = useMemo(() => Object.fromEntries(Object.keys(METHODS).map(m => [m, runsFor(m, episodes)])), [episodes])
  const states = useMemo(() => rollout(runs[watch][0].theta), [runs, watch])
  useTicker(running, () => setT(v => Math.min(v + 1, states.length - 1)), 30)
  useEffect(() => { if (running && t >= states.length - 1) setRunning(false) }, [running, t, states.length])
  return <>
    <Controls>
      <Slider label="Training episodes" value={episodes} min={100} max={400} step={100} onChange={v => { setEpisodes(v); setT(0) }} />
      <Choice label="Watch the policy learned by" value={watch} onChange={v => { setWatch(v); setT(0) }} options={Object.entries(METHODS).map(([k, m]) => [k, m.name])} />
    </Controls>
    <Caption>{`Push the cart left or right every 0.02 s to keep the pole upright (within 12°) and the cart on the track (±2.4). Reward: +1 per step survived, up to ${MAX_STEPS}. The policy is a logistic function of the four state variables; nothing tells it the physics.`}</Caption>
    <Plot x={[1, episodes]} y={[0, 205]} height={240} xLabel="episode" yLabel="steps balanced (20-episode average)" label="Learning curves">{({ X, Y }) => Object.entries(runs).map(([m, rs]) => <g key={m}>
      {rs.map((r, i) => <Path key={i} X={X} Y={Y} points={movingAverage(r.returns).map((v, e) => [e + 1, v])} stroke={COL[m]} width={1} opacity={0.35} />)}
      <Path X={X} Y={Y} points={movingAverage(rs[0].returns).map((_, e) => [e + 1, mean(rs.map(r => movingAverage(r.returns)[e]))])} stroke={COL[m]} width={2.8} />
    </g>)}</Plot>
    <Legend items={Object.entries(METHODS).map(([k, m]) => ['━', `${m.name} (thin: 3 seeds)`, COL[k]])} />
    <Metrics items={Object.entries(runs).map(([m, rs]) => [`${METHODS[m].name.split(' (')[0]}: last 20 episodes`, fmt(mean(rs.map(r => mean(r.returns.slice(-20)))), 0)])} />
    <CartPole states={states} t={t} />
    <Actions><button onClick={() => { if (t >= states.length - 1) setT(0); setRunning(r => !r) }}>{running ? 'Pause' : 'Play the learned policy'}</button><button onClick={() => { setRunning(false); setT(0) }}>Reset</button></Actions>
    <Caption>{`Current state: probability of pushing right = ${fmt(pRight(runs[watch][0].theta, states[Math.min(t, states.length - 1)]), 2)}.`}</Caption>
    <Insight title="What to notice">REINFORCE nudges the policy toward actions that preceded high returns. Without a baseline its updates are very noisy — some seeds learn, some stall. Subtracting a learned baseline (how good the state already was) keeps the direction but removes much of the noise, and learning becomes reliable. The actor–critic updates after every step using a learned value estimate (the critic), and learns fastest — but only because its critic can represent “how close to falling” with squared terms; a purely linear critic fails completely.</Insight>
  </>
}

function VarianceView() {
  const [comp, setComp] = useState(2)
  const g = useMemo(() => gradientSpread([0, 0, 0, 0, 0]), [])
  const names = ['cart position', 'cart velocity', 'pole angle', 'pole angular velocity', 'bias']
  const vals = g.plain.samples.map(s => s[comp]).concat(g.baseline.samples.map(s => s[comp])), lo = Math.min(...vals), hi = Math.max(...vals), bins = 24, w = (hi - lo) / bins
  const hist = S => Array.from({ length: bins }, (_, i) => S.filter(s => s[comp] >= lo + i * w && s[comp] < lo + (i + 1) * w + (i === bins - 1 ? 1e-9 : 0)).length / S.length)
  const hp = hist(g.plain.samples), hb = hist(g.baseline.samples), top = Math.max(...hp, ...hb) * 1.1
  return <>
    <Controls><Choice label="Gradient component (policy weight on …)" value={String(comp)} onChange={v => setComp(Number(v))} options={names.map((n, i) => [String(i), n])} /></Controls>
    <Caption>200 single-episode estimates of the policy gradient at the initial (random) policy, with and without subtracting a baseline b(t) — the average return from step t, estimated from a separate batch of episodes.</Caption>
    <Plot x={[lo, hi]} y={[0, top]} height={220} xLabel="gradient estimate" yLabel="share of episodes" yFormat={v => `${(100 * v).toFixed(0)}%`} label="Distribution of gradient estimates">{({ X, Y }) => <>
      {hp.map((h, i) => <rect key={`p${i}`} x={X(lo + i * w)} y={Y(h)} width={Math.max(1, X(w) - X(0) - 1)} height={Y(0) - Y(h)} fill="var(--chart-train)" opacity="0.45" />)}
      {hb.map((h, i) => <rect key={`b${i}`} x={X(lo + i * w)} y={Y(h)} width={Math.max(1, X(w) - X(0) - 1)} height={Y(0) - Y(h)} fill="var(--chart-val)" opacity="0.55" />)}
    </>}</Plot>
    <Legend items={[['■', 'no baseline', 'var(--chart-train)'], ['■', 'with baseline', 'var(--chart-val)']]} />
    <Table head={['component', 'mean (no baseline)', 'mean (baseline)', 'sd (no baseline)', 'sd (baseline)']} rows={names.map((n, i) => [n, fmt(g.plain.mean[i], 2), fmt(g.baseline.mean[i], 2), fmt(g.plain.sd[i], 2), fmt(g.baseline.sd[i], 2)])} caption="Means agree within sampling noise (the baseline does not change the expected gradient); standard deviations shrink." />
    <Insight title="What to notice">The policy gradient is estimated from whole episodes, and returns vary enormously between episodes, so single estimates are wildly noisy. Subtracting any baseline that does not depend on the action leaves the expected gradient unchanged — E[∇log π(a|s)·b(s)] = 0 — but removes the part of the return that has nothing to do with which action was chosen. Less noise means larger usable learning rates and more reliable learning.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('train')
  return <>
    <PanelHeading title="Learn the policy directly, by gradient ascent on reward." pill="policy gradients · actor–critic" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['train', 'Cart-pole: three policy-gradient methods'], ['variance', 'Why baselines matter: gradient variance']]} /></Controls>
    {view === 'train' ? <TrainView /> : <VarianceView />}
  </>
}
