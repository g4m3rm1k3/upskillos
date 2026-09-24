import React, { useMemo, useState } from 'react'
import { NODES, posteriors, independent, query, STATES, SYMBOLS, makeHMM, simulate, forward, smooth, viterbi, accuracy, argmaxRows, baumWelchStep, randomHMM } from './engine.js'
import { Plot, Path, Bars } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Caption, Legend, Table } from '../../kit/ui.jsx'
import { fmt, pct } from '../../kit/math.js'

const SC = ['#10b981', '#eab308', '#ef4444']
const POS = { bad: [90, 50], outage: [330, 50], fails: [150, 150], pager: [150, 250], status: [390, 150] }

function NetView() {
  const [ev, setEv] = useState({ fails: 1 })
  const post = posteriors(ev)
  const [qa, setQa] = useState('bad'), [qb, setQb] = useState('outage'), [given, setGiven] = useState('fails')
  const g = given === 'none' ? {} : { [given]: 1 }
  const indep = qa !== qb && given !== qa && given !== qb ? independent(qa, qb, g) : null
  const cycle = k => setEv(e => { const n = { ...e }; if (!(k in n)) n[k] = 1; else if (n[k] === 1) n[k] = 0; else delete n[k]; return n })
  return <>
    <Caption>Click a node to observe it as true, click again for false, and a third time to un-observe it. Numbers are exact posterior probabilities P(node is true | observations), computed by summing the joint distribution.</Caption>
    <svg viewBox="0 0 480 300" className="ml-plot" role="img" aria-label="Bayesian network of CI failures" style={{ maxWidth: 520 }}>
      <defs><marker id="arr" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--muted)" /></marker></defs>
      {NODES.flatMap(n => n.parents.map(p => { const [x1, y1] = POS[p], [x2, y2] = POS[n.key], d = Math.hypot(x2 - x1, y2 - y1); return <line key={p + n.key} x1={x1 + (x2 - x1) * 34 / d} y1={y1 + (y2 - y1) * 34 / d} x2={x2 - (x2 - x1) * 36 / d} y2={y2 - (y2 - y1) * 36 / d} stroke="var(--muted)" strokeWidth="2" markerEnd="url(#arr)" /> }))}
      {NODES.map(n => { const [x, y] = POS[n.key], o = ev[n.key]; return <g key={n.key} onClick={() => cycle(n.key)} style={{ cursor: 'pointer' }} role="button" aria-label={`Observe ${n.name}`}>
        <rect x={x - 70} y={y - 30} width={140} height={60} rx="12" fill={o === 1 ? 'var(--chart-val)' : o === 0 ? 'var(--chart-train)' : 'var(--surface, white)'} opacity={o === undefined ? 1 : 0.35} stroke="var(--text)" strokeWidth={o === undefined ? 1 : 2.5} />
        <text x={x} y={y - 8} textAnchor="middle" style={{ fontSize: 12, fontWeight: 700 }} fill="var(--text)">{n.name}</text>
        <text x={x} y={y + 14} textAnchor="middle" style={{ fontSize: 13 }} fill="var(--text)">{o === 1 ? 'observed: yes' : o === 0 ? 'observed: no' : `P = ${pct(post[n.key])}`}</text>
      </g> })}
    </svg>
    <div className="ml-actions">{[[{}, 'Clear'], [{ fails: 1 }, 'Build failed'], [{ fails: 1, outage: 1 }, 'Build failed + outage known'], [{ fails: 1, status: 1 }, 'Build failed + status page red'], [{ pager: 1 }, 'Only the pager fired']].map(([e, l]) => <button key={l} onClick={() => setEv(e)}>{l}</button>)}</div>
    <Metrics items={[['P(bad commit), no evidence', pct(query('bad'))], ['… given the build failed', pct(query('bad', { fails: 1 }))], ['… and an outage is known', pct(query('bad', { fails: 1, outage: 1 }))], ['… and the status page is red', pct(query('bad', { fails: 1, status: 1 }))]]} />
    <h3>Are two nodes independent?</h3>
    <Controls>
      <Choice label="Node A" value={qa} onChange={setQa} options={NODES.map(n => [n.key, n.name])} />
      <Choice label="Node B" value={qb} onChange={setQb} options={NODES.map(n => [n.key, n.name])} />
      <Choice label="Given" value={given} onChange={setGiven} options={[['none', 'nothing observed'], ...NODES.map(n => [n.key, `${n.name} observed`])]} />
    </Controls>
    <p className="ml-caption">{indep === null ? 'Choose two different nodes, neither of which is the observed one.' : indep ? `Independent: observing ${NODES.find(n => n.key === qb).name.toLowerCase()} never changes P(${NODES.find(n => n.key === qa).name.toLowerCase()}) here — every path between them is blocked.` : `Dependent: observing ${NODES.find(n => n.key === qb).name.toLowerCase()} changes P(${NODES.find(n => n.key === qa).name.toLowerCase()}) — some path between them is open.`}</p>
    <Insight title="Explaining away">Bad commits and outages are independent causes — until you observe their common effect. A failed build makes both more likely; learning there was an outage then **explains away** the failure, and P(bad commit) falls back from 63% to 12%. Even indirect evidence (a red status page) does part of the job. Check it with the independence tool: bad commit and outage are independent given nothing, but dependent given the build failure.</Insight>
  </>
}

function Strip({ values, colors, label, T }) {
  return <div><small className="ml-caption">{label}</small><svg viewBox={`0 0 ${T * 6} 14`} style={{ width: '100%', height: 16, display: 'block' }} preserveAspectRatio="none">{values.map((v, t) => <rect key={t} x={t * 6} y={0} width={6} height={14} fill={colors[v]} />)}</svg></div>
}

function HmmView() {
  const [stay, setStay] = useState(0.92), [clarity, setClarity] = useState(0.7), [seed, setSeed] = useState(4)
  const T = 100, hmm = makeHMM(stay, clarity), d = useMemo(() => simulate(hmm, T, seed), [stay, clarity, seed]) // eslint-disable-line react-hooks/exhaustive-deps
  const f = forward(hmm, d.obs), s = smooth(hmm, d.obs), v = viterbi(hmm, d.obs)
  return <>
    <Controls>
      <Slider label="Probability a state persists to the next minute" value={stay} min={0.4} max={0.98} step={0.02} onChange={setStay} />
      <Slider label="Probability the latency reading matches the state" value={clarity} min={0.4} max={0.95} step={0.05} onChange={setClarity} />
    </Controls>
    <Caption>A server is Healthy, Degraded or Down (hidden). Each minute we see only a latency reading: fast, slow or timeout. The model knows how states persist and how readings depend on the state.</Caption>
    <Strip label="True hidden state" values={d.states} colors={SC} T={T} />
    <Strip label="Observation (fast / slow / timeout, coloured as the matching state)" values={d.obs} colors={SC} T={T} />
    <Strip label="Viterbi: most probable whole sequence" values={v} colors={SC} T={T} />
    <Plot x={[0, T - 1]} y={[0, 1]} height={150} xFormat={v => Math.round(v)} xLabel="minute" yLabel="P(Down)" label="Filtered and smoothed probability of Down">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={f.filtered.map((p, t) => [t, p[2]])} stroke="var(--chart-val)" width={1.8} />
      <Path X={X} Y={Y} points={s.smoothed.map((p, t) => [t, p[2]])} stroke="var(--chart-model)" width={2.5} />
      {d.states.map((st, t) => st === 2 ? <rect key={t} x={X(t - 0.5)} y={Y(1)} width={X(1) - X(0)} height={Y(0) - Y(1)} fill="#ef4444" opacity="0.08" /> : null)}
    </>}</Plot>
    <Legend items={[...STATES.map((n, i) => ['■', n, SC[i]]), ['━', 'filtered P(Down | readings so far)', 'var(--chart-val)'], ['━', 'smoothed P(Down | all readings)', 'var(--chart-model)']]} />
    <Metrics items={[['Reading alone is right', pct(accuracy(d.obs, d.states))], ['Filtering (forward) is right', pct(accuracy(argmaxRows(f.filtered), d.states))], ['Smoothing (forward–backward)', pct(accuracy(argmaxRows(s.smoothed), d.states))], ['Viterbi path', pct(accuracy(v, d.states))]]} />
    <button onClick={() => setSeed(x => x + 1)}>Simulate another 100 minutes</button>
    <Insight title="What to notice">Because states persist, a single odd reading is probably noise: filtering combines the new reading with everything before it and beats the raw readings by a wide margin. Smoothing also uses later readings, so it can revise the past — it is the right tool for after-the-fact analysis, while filtering is what a live alert can use. Lower the persistence toward 0.4 and the history stops helping: with no memory in the states, there is nothing to exploit.</Insight>
  </>
}

function LearnView() {
  const hmm = makeHMM(0.92, 0.8), d = useMemo(() => simulate(hmm, 2000, 3), []) // eslint-disable-line react-hooks/exhaustive-deps
  const runs = useMemo(() => [1, 2, 3, 4, 5, 6].map(sd => { let m = randomHMM(3, 3, sd); const lls = []; for (let i = 0; i < 120; i++) { lls.push(forward(m, d.obs).loglik); m = baumWelchStep(m, d.obs) } return { m, lls } }), [d])
  const trueLL = forward(hmm, d.obs).loglik, best = runs.reduce((b, r) => r.lls.at(-1) > b.lls.at(-1) ? r : b)
  const lo = Math.min(...runs.map(r => r.lls[0]))
  return <>
    <Caption>2,000 minutes of readings, no hidden states. Baum–Welch (EM for HMMs) starts from six random models and learns transition and reading probabilities.</Caption>
    <Plot x={[0, 119]} y={[lo - 20, trueLL + 60]} height={240} xLabel="Baum–Welch iteration" yLabel="log-likelihood" yFormat={v => v.toFixed(0)} label="Baum–Welch log-likelihood">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={[[0, trueLL], [119, trueLL]]} stroke="var(--text)" width={1.5} dash="6 4" />
      {runs.map((r, j) => <Path key={j} X={X} Y={Y} points={r.lls.map((v, i) => [i, v])} stroke={r === best ? 'var(--chart-val)' : 'var(--chart-model)'} width={r === best ? 2.6 : 1.3} />)}
    </>}</Plot>
    <Legend items={[['┄', 'log-likelihood of the true model', 'var(--text)'], ['━', 'six random starts', 'var(--chart-model)'], ['━', 'best start', 'var(--chart-val)']]} />
    <Table head={['learned transitions (best start)', ...STATES.map((_, j) => `to state ${j + 1}`)]} rows={best.m.A.map((r, i) => [`from state ${i + 1}`, ...r.map(v => fmt(v, 2))])} caption="States come out in an arbitrary order (label switching) — match them to Healthy/Degraded/Down by their reading probabilities." />
    <Table head={['learned reading probabilities', ...SYMBOLS]} rows={best.m.B.map((r, i) => [`state ${i + 1}`, ...r.map(v => fmt(v, 2))])} />
    <Insight title="What to notice">Each iteration is an E-step (forward–backward gives the expected state occupancies and transitions) and an M-step (normalized expected counts) — EM from Lab 43. The log-likelihood never decreases. Most starts end slightly *above* the true model’s likelihood — maximum likelihood fits this particular sample — but one start stalls on a worse peak. Restarts again.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('net')
  return <>
    <PanelHeading title="Structure makes inference possible." pill="Bayesian networks · HMMs" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['net', 'Bayesian network: explaining away'], ['hmm', 'Hidden Markov model: tracking a hidden state'], ['learn', 'Learning an HMM with Baum–Welch']]} /></Controls>
    {view === 'net' ? <NetView /> : view === 'hmm' ? <HmmView /> : <LearnView />}
  </>
}
