// Small figures placed between the paragraphs of Lessons 37.1–37.2. Each shows exactly the
// quantity its paragraph defines, in the same gridworld as the playground and notebooks,
// and states its numbers in text as well as in the picture.
import React, { useMemo, useRef, useState } from 'react'
import { W, H, GOAL, isDitch, ARROWS, stepEnv, startState, outcomes, isTerminal, epsilonGreedyProbs, policyEvaluation, valueIteration, edgeWalker, cell } from './engine.js'
import { random } from '../../kit/math.js'

const NAMES = ['up', 'right', 'down', 'left']
const r = (v, d = 3) => Number(v.toFixed(d)).toString()
const C = 44

function Grid({ values, agent, highlight = [], arrows, label }) {
  const finite = values ? values.filter((v, s) => !isTerminal(s)) : [], lo = Math.min(...finite, 0), hi = Math.max(...finite, 1)
  return <svg viewBox={`0 0 ${W * C} ${H * C}`} role="img" aria-label={label} style={{ maxWidth: W * C }}>
    {Array.from({ length: W * H }, (_, s) => {
      const [x, y] = cell(s), ditch = isDitch(x, y), goal = x === GOAL[0] && y === GOAL[1], t = values && !isTerminal(s) ? (values[s] - lo) / (hi - lo || 1) : 0
      return <g key={s}>
        <rect x={x * C + 1} y={y * C + 1} width={C - 2} height={C - 2} rx="5" fill={ditch ? '#ef4444' : goal ? '#10b981' : 'var(--accent)'} opacity={ditch || goal ? 0.7 : values ? 0.08 + 0.55 * t : 0.08} stroke={highlight.includes(s) ? 'var(--text)' : 'none'} strokeWidth="2.5" />
        {goal && <text x={x * C + C / 2} y={y * C + C / 2 + 6} textAnchor="middle" style={{ fontSize: 18, fill: 'var(--text)' }}>★</text>}
        {values && !isTerminal(s) && <text x={x * C + C / 2} y={y * C + C - 6} textAnchor="middle" style={{ fontSize: 9.5, fill: 'var(--text)' }}>{values[s].toFixed(2)}</text>}
        {arrows && !isTerminal(s) && <text x={x * C + C / 2} y={y * C + 18} textAnchor="middle" style={{ fontSize: 14, fill: 'var(--text)' }}>{ARROWS[arrows(s)]}</text>}
      </g>
    })}
    {agent != null && (() => { const [x, y] = cell(agent); return <circle cx={x * C + C / 2} cy={y * C + C / 2} r={11} fill="var(--text)" /> })()}
  </svg>
}

// 37.1 ¶2 — play the MDP yourself and read the log of (S_t, A_t, R_{t+1}, S_{t+1}).
export function PlayLoop() {
  const [slip, setSlip] = useState(0.2), [log, setLog] = useState([]), rngRef = useRef(random(7))
  const s = log.length ? log[log.length - 1].next : startState(), done = log.length > 0 && log[log.length - 1].done
  const act = a => { if (done || log.length >= 40) return; const res = stepEnv(s, a, rngRef.current, { slip }); setLog(l => [...l, { t: l.length, s, a, reward: res.reward, next: res.next, done: res.done, slipped: res.next !== stepEnv(s, a, () => 1, {}).next }]) }
  const onKey = e => { const k = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key]; if (k != null) { e.preventDefault(); act(k) } }
  const G = log.reduce((g, e, k) => g + 0.95 ** k * e.reward, 0)
  return <div onKeyDown={onKey}>
    <div className="ml-fig-controls">
      {NAMES.map((n, a) => <button key={n} onClick={() => act(a)} disabled={done} aria-label={`Move ${n}`}>{ARROWS[a]} {n}</button>)}
      <button onClick={() => { setLog([]); rngRef.current = random(7 + Math.floor(Math.random() * 1000)) }}>New episode</button>
      <label>slip <input type="range" min={0} max={0.5} step={0.05} value={slip} onChange={e => setSlip(Number(e.target.value))} aria-label="Slip probability" /> <strong>{slip.toFixed(2)}</strong></label>
    </div>
    <Grid agent={s} highlight={[s]} label={`Robot at state ${s}, time step ${log.length}${done ? ', episode over' : ''}`} />
    <table className="ml-fig-table" aria-label="Transition log">
      <thead><tr><th>t</th><th>S_t</th><th>A_t</th><th>R_(t+1)</th><th>S_(t+1)</th><th>note</th></tr></thead>
      <tbody>{log.slice(-6).map(e => <tr key={e.t}><td>{e.t}</td><td>{e.s}</td><td>{NAMES[e.a]}</td><td>{e.reward}</td><td>{e.next}</td><td>{e.done ? (e.reward > 0 ? 'goal: episode ends' : 'ditch: episode ends') : e.slipped ? 'slipped' : ''}</td></tr>)}</tbody>
    </table>
    <p className="ml-fig-sum">{log.length === 0 ? `t = 0: S₀ = ${s} (bottom-left). Choose A₀ with a button or the arrow keys.` : `t = ${log.length}: ${log.length} transitions so far. G₀ = Σ 0.95ᵏ R_(k+1) = ${r(G, 3)}${done ? ' — the episode has ended.' : '.'}${log.length > 6 ? ' The log shows the last 6 rows.' : ''}`}</p>
  </div>
}

// 37.1 ¶3 — p(s′ | s, a) with slip.
export function SlipBars() {
  const [slip, setSlip] = useState(0.2), [a, setA] = useState(1)
  const probs = [0, 1, 2, 3].map(b => (b === a ? 1 - slip : 0) + slip / 4)
  return <div>
    <div className="ml-fig-controls">
      <label>intended action <select value={a} onChange={e => setA(Number(e.target.value))} aria-label="Intended action">{NAMES.map((n, k) => <option key={n} value={k}>{ARROWS[k]} {n}</option>)}</select></label>
      <label>slip <input type="range" min={0} max={1} step={0.05} value={slip} onChange={e => setSlip(Number(e.target.value))} aria-label="Slip probability" /> <strong>{slip.toFixed(2)}</strong></label>
    </div>
    <svg viewBox="0 0 300 120" role="img" aria-label={`Move probabilities ${probs.map((p, k) => `${NAMES[k]} ${r(p, 3)}`).join(', ')}`}>
      {probs.map((p, k) => <g key={k}><rect x={20 + k * 70} y={100 - p * 90} width={46} height={p * 90} fill={k === a ? 'var(--chart-model)' : 'var(--muted)'} opacity="0.8" /><text x={43 + k * 70} y={96 - p * 90} textAnchor="middle" style={{ fontSize: 11, fill: 'var(--text)' }}>{r(p, 3)}</text><text x={43 + k * 70} y={115} textAnchor="middle" style={{ fontSize: 11, fill: 'var(--text)' }}>{ARROWS[k]} {NAMES[k]}</text></g>)}
    </svg>
    <p className="ml-fig-sum">intended: 1 − {slip.toFixed(2)} + {slip.toFixed(2)}/4 = <strong>{r(probs[a])}</strong>; each other direction: {slip.toFixed(2)}/4 = <strong>{r(slip / 4)}</strong>; total = {r(probs.reduce((x, y) => x + y, 0))}. At slip 1 every direction is equally likely.</p>
  </div>
}

// 37.1 ¶5–6 — the return of the hand-written route: rewards, discount weights, running sum.
export function ReturnWeights() {
  const [gamma, setGamma] = useState(0.95)
  const rewards = [...Array(7).fill(-0.1), 10], disc = rewards.map((x, k) => gamma ** k * x)
  const Gt = rewards.map((_, t) => rewards.slice(t).reduce((g, x, k) => g + gamma ** k * x, 0))
  return <div>
    <div className="ml-fig-controls"><label>γ <input type="range" min={0} max={0.99} step={0.01} value={gamma} onChange={e => setGamma(Number(e.target.value))} aria-label="Discount gamma" /> <strong>{gamma.toFixed(2)}</strong></label></div>
    <table className="ml-fig-table" aria-label="Rewards, discount weights and returns">
      <thead><tr><th>k</th>{rewards.map((_, k) => <th key={k}>{k}</th>)}</tr></thead>
      <tbody>
        <tr><td>R_(k+1)</td>{rewards.map((x, k) => <td key={k}>{x}</td>)}</tr>
        <tr><td>γᵏ</td>{rewards.map((_, k) => <td key={k}>{r(gamma ** k, 3)}</td>)}</tr>
        <tr><td>γᵏ R_(k+1)</td>{disc.map((x, k) => <td key={k}>{r(x, 3)}</td>)}</tr>
        <tr><td>G_k (backwards)</td>{Gt.map((x, k) => <td key={k} className={k === 0 ? 'active' : ''}>{r(x, 3)}</td>)}</tr>
      </tbody>
    </table>
    <p className="ml-fig-sum">G₀ = Σ γᵏ R_(k+1) = <strong>{r(Gt[0])}</strong>. Check the recursion on any column: G_k = R_(k+1) + γ·G_(k+1), e.g. G₆ = −0.1 + {gamma.toFixed(2)} × {r(Gt[7])} = {r(Gt[6])}.<br />Slide γ to 0: only the first reward counts. Slide it toward 1: the +10 at the end dominates.</p>
  </div>
}

// 37.2 ¶1–2 — an ε-greedy policy as an array of probabilities, in two variants.
export function PolicyBars() {
  const [eps, setEps] = useState(0.1), [variant, setVariant] = useState('all'), best = 0
  const probs = variant === 'all' ? epsilonGreedyProbs(best, eps) : [0, 1, 2, 3].map(a => (a === best ? 1 - eps : eps / 3))
  return <div>
    <div className="ml-fig-controls">
      <label>ε <input type="range" min={0} max={1} step={0.05} value={eps} onChange={e => setEps(Number(e.target.value))} aria-label="Exploration epsilon" /> <strong>{eps.toFixed(2)}</strong></label>
      <label><input type="radio" name="variant" checked={variant === 'all'} onChange={() => setVariant('all')} /> random draw from all 4 (this lab)</label>
      <label><input type="radio" name="variant" checked={variant === 'others'} onChange={() => setVariant('others')} /> random draw from the other 3</label>
    </div>
    <svg viewBox="0 0 300 120" role="img" aria-label={`π(· | s) = ${probs.map(p => r(p)).join(', ')}`}>
      {probs.map((p, k) => <g key={k}><rect x={20 + k * 70} y={100 - p * 90} width={46} height={p * 90} fill={k === best ? 'var(--chart-model)' : 'var(--muted)'} opacity="0.8" /><text x={43 + k * 70} y={96 - p * 90} textAnchor="middle" style={{ fontSize: 11, fill: 'var(--text)' }}>{r(p)}</text><text x={43 + k * 70} y={115} textAnchor="middle" style={{ fontSize: 11, fill: 'var(--text)' }}>{ARROWS[k]} {NAMES[k]}</text></g>)}
    </svg>
    <p className="ml-fig-sum">pi(s) = [{probs.map(p => r(p)).join(', ')}] — preferred action “up”. Sum = {r(probs.reduce((x, y) => x + y, 0))}. {variant === 'all' ? `Preferred: 1 − ε + ε/4 = ${r(probs[0])}.` : `Preferred: 1 − ε = ${r(probs[0])}; others ε/3.`} At ε = 0 the array is one-hot: a deterministic policy.</p>
  </div>
}

// 37.2 ¶4 — one Bellman expectation backup at the start state, every term written out.
export function BellmanBackup() {
  const [eps, setEps] = useState(0.1), [slip, setSlip] = useState(0)
  const pi = s => epsilonGreedyProbs(edgeWalker(s), eps)
  const { V } = useMemo(() => policyEvaluation(pi, { slip }), [eps, slip]) // eslint-disable-line react-hooks/exhaustive-deps
  const s = startState(), probs = pi(s)
  const rows = probs.flatMap((pa, a) => outcomes(s, a, { slip }).map(o => ({ a, pa, ...o, term: pa * o.p * (o.reward + (o.done ? 0 : 0.95 * V[o.next])) })))
  const total = rows.reduce((t, x) => t + x.term, 0)
  return <div>
    <div className="ml-fig-controls">
      <label>ε <input type="range" min={0} max={0.5} step={0.05} value={eps} onChange={e => setEps(Number(e.target.value))} aria-label="Exploration epsilon" /> <strong>{eps.toFixed(2)}</strong></label>
      <label>slip <input type="range" min={0} max={0.3} step={0.05} value={slip} onChange={e => setSlip(Number(e.target.value))} aria-label="Slip probability" /> <strong>{slip.toFixed(2)}</strong></label>
    </div>
    <table className="ml-fig-table" aria-label="Terms of the Bellman expectation equation at the start state">
      <thead><tr><th>action a</th><th>π(a|s)</th><th>p(s′|s,a)</th><th>s′</th><th>r</th><th>V(s′)</th><th>π·p·(r + γV(s′))</th></tr></thead>
      <tbody>{rows.map((x, k) => <tr key={k}><td>{ARROWS[x.a]} {NAMES[x.a]}</td><td>{r(x.pa)}</td><td>{r(x.p)}</td><td>{x.next}</td><td>{x.reward}</td><td>{x.done ? '0 (terminal)' : r(V[x.next])}</td><td>{r(x.term)}</td></tr>)}</tbody>
    </table>
    <p className="ml-fig-sum">Sum of the last column = <strong>{r(total)}</strong>; V^π(start) = <strong>{r(V[s])}</strong>. They agree: the value is a fixed point of the equation.<br />Outer Σ over a: the rows grouped by action. Inner Σ over s′, r: the rows within each action. {slip === 0 && eps === 0 ? '' : 'Rows with small π or p contribute little but are not ignored.'}</p>
  </div>
}

// 37.2 ¶5 — policy evaluation sweep by sweep.
export function Sweeps() {
  const [k, setK] = useState(0), eps = 0.1
  const pi = s => epsilonGreedyProbs(edgeWalker(s), eps)
  const history = useMemo(() => { const out = [Array(W * H).fill(0)]; for (let i = 0; i < 60; i++) out.push(policyEvaluation(pi, { sweeps: i + 1, tol: 0 }).V); return out }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const V = history[k], change = k ? Math.max(...V.map((v, s) => Math.abs(v - history[k - 1][s]))) : 0
  return <div>
    <div className="ml-fig-controls">
      <button onClick={() => setK(v => Math.min(60, v + 1))}>1 sweep</button>
      <button onClick={() => setK(v => Math.min(60, v + 10))}>10 sweeps</button>
      <button onClick={() => setK(0)}>Reset to V = 0</button>
    </div>
    <Grid values={V} arrows={edgeWalker} label={`Values after ${k} sweeps; start cell ${r(V[startState()])}`} />
    <p className="ml-fig-sum">After {k} sweep{k === 1 ? '' : 's'}: V(start) = {r(V[startState()])}{k ? `, largest change in this sweep = ${change.toExponential(2)}` : ''}. Value spreads backwards from the goal one cell per sweep; the change shrinks until nothing moves (V(start) → 3.951 at ε = 0.1).</p>
  </div>
}

// 37.2 ¶6 — the value of a policy you run versus the best possible.
export function VersusOptimal() {
  const [slip, setSlip] = useState(0.1)
  const Vpi = useMemo(() => policyEvaluation(s => epsilonGreedyProbs(edgeWalker(s), 0), { slip }).V, [slip])
  const vi = useMemo(() => valueIteration({ slip }), [slip]), s0 = startState()
  return <div>
    <div className="ml-fig-controls"><label>slip <input type="range" min={0} max={0.3} step={0.05} value={slip} onChange={e => setSlip(Number(e.target.value))} aria-label="Slip probability" /> <strong>{slip.toFixed(2)}</strong></label></div>
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <div><p className="ml-caption">V^π: the hand-written route</p><Grid values={Vpi} arrows={edgeWalker} label={`Hand-written policy values, start ${r(Vpi[s0])}`} /></div>
      <div><p className="ml-caption">V*: the best possible (value iteration)</p><Grid values={vi.V} arrows={s => Math.max(0, vi.policy[s])} label={`Optimal values, start ${r(vi.V[s0])}`} /></div>
    </div>
    <p className="ml-fig-sum">V^π(start) = {r(Vpi[s0])}, V*(start) = {r(vi.V[s0])}: a gap of {r(vi.V[s0] - Vpi[s0])}.{slip === 0 ? ' With no slip the route along the ditch is already optimal.' : ' The optimal arrows climb away from the ditch.'} Every cell of V* is at least its V^π.</p>
  </div>
}
