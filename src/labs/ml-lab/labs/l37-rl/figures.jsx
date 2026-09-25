// Small figures placed between the paragraphs of Lessons 37.1–37.5. Each shows exactly the
// quantity its paragraph defines, in the same gridworld as the playground and notebooks,
// and states its numbers in text as well as in the picture.
import React, { useMemo, useRef, useState } from 'react'
import { W, H, GOAL, isDitch, ARROWS, stepEnv, startState, outcomes, isTerminal, epsilonGreedyProbs, policyEvaluation, valueIteration, edgeWalker, cell } from './engine.js'
import { random, range, mean } from '../../kit/math.js'
import { N_STATES, CHECKPOINT, backup, qLearning, evaluatePolicy, fromQ, fromTable, movingAverage } from './engine.js'
import { MiniPlot, Path, Dots } from '../../kit/fig.jsx'

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

// ---------- 37.3 ----------
const lookahead = (s, V, opts) => range(4).map(a => backup(s, a, V, opts))
// The cells visited by following a deterministic policy from the start with no slip (stops at a
// terminal cell, or after `limit` moves if the policy circles).
function greedyPath(policy, limit = 20) {
  let s = startState(); const path = [s]
  for (let t = 0; t < limit && !isTerminal(s); t++) { s = stepEnv(s, policy(s), () => 1, {}).next; path.push(s) }
  return path
}
const cellName = s => { const [x, y] = cell(s); return `(${x}, ${y})` }

// 37.3 ¶1 — the optimality equation at one cell: each action's lookahead, and the max.
export function OptimalityBackup() {
  const [x, setX] = useState(0), [y, setY] = useState(4), [slip, setSlip] = useState(0.1)
  const vi = useMemo(() => valueIteration({ slip }), [slip]), s = y * W + x, q = isTerminal(s) ? null : lookahead(s, vi.V, { slip })
  const best = q ? q.indexOf(Math.max(...q)) : -1
  return <div>
    <div className="ml-fig-controls">
      <label>cell x <select value={x} onChange={e => setX(Number(e.target.value))} aria-label="Cell column">{range(W).map(i => <option key={i} value={i}>{i}</option>)}</select></label>
      <label>cell y <select value={y} onChange={e => setY(Number(e.target.value))} aria-label="Cell row">{range(H).map(i => <option key={i} value={i}>{i}</option>)}</select></label>
      <label>slip <input type="range" min={0} max={0.3} step={0.05} value={slip} onChange={e => setSlip(Number(e.target.value))} aria-label="Slip probability" /> <strong>{slip.toFixed(2)}</strong></label>
    </div>
    <Grid values={vi.V} highlight={[s]} label={`Optimal values; selected cell ${cellName(s)}`} />
    {q ? <>
      <table className="ml-fig-table" aria-label={`Lookahead of each action at cell ${cellName(s)}`}>
        <thead><tr><th>action a</th><th>Σ p(s′, r | s, a)[r + γV*(s′)]</th></tr></thead>
        <tbody>{q.map((v, a) => <tr key={a} className={a === best ? 'active' : ''}><td>{ARROWS[a]} {NAMES[a]}</td><td>{r(v)}</td></tr>)}</tbody>
      </table>
      <p className="ml-fig-sum">The largest lookahead is {NAMES[best]}, {r(q[best])}, and V*{cellName(s)} = <strong>{r(vi.V[s])}</strong>: the same number. The value of a cell is the value of its best action.</p>
    </> : <p className="ml-fig-sum">{cellName(s)} is terminal (the star or the ditch): its value is 0 and nothing is chosen there.</p>}
  </div>
}

// 37.3 ¶2 — value iteration sweep by sweep, with the greedy arrows at each stage.
export function ValueIterationSweeps() {
  const [k, setK] = useState(0), slip = 0.1
  const history = useMemo(() => { const out = [Array(N_STATES).fill(0)]; for (let i = 0; i < 60; i++) { const V = out[i]; out.push(V.map((_, s) => isTerminal(s) ? 0 : Math.max(...lookahead(s, V, { slip })))) } return out }, [])
  const V = history[k], change = k ? Math.max(...V.map((v, s) => Math.abs(v - history[k - 1][s]))) : 0
  const arrows = s => { const q = lookahead(s, V, { slip }); return q.indexOf(Math.max(...q)) }
  return <div>
    <div className="ml-fig-controls">
      <button onClick={() => setK(v => Math.min(60, v + 1))}>1 sweep</button>
      <button onClick={() => setK(v => Math.min(60, v + 10))}>10 sweeps</button>
      <button onClick={() => setK(0)}>Reset to V = 0</button>
    </div>
    <Grid values={V} arrows={k ? arrows : undefined} label={`Value iteration after ${k} sweeps at 10% slip; start cell ${r(V[startState()])}`} />
    <p className="ml-fig-sum">After {k} sweep{k === 1 ? '' : 's'} at 10% slip: V(start) = {r(V[startState()])}{k ? `, largest change in this sweep = ${change.toExponential(2)}` : ''}. {k === 0 ? 'Every cell starts at 0, so no action looks better than another yet.' : 'The arrows are the greedy actions for the current V; cells far from the star settle last.'}</p>
  </div>
}

// 37.3 ¶3 — the largest change per sweep against the contraction bound γᵏ × (first change).
export function ContractionPlot() {
  const [gamma, setGamma] = useState(0.95), slip = 0.1
  const changes = useMemo(() => { let V = Array(N_STATES).fill(0); const out = []; for (let i = 0; i < 80; i++) { const n = V.map((_, s) => isTerminal(s) ? 0 : Math.max(...lookahead(s, V, { gamma, slip }))); out.push(Math.max(...n.map((v, s) => Math.abs(v - V[s])))); V = n } return out }, [gamma])
  const pts = changes.map((c, k) => [k + 1, c > 0 ? Math.log10(c) : null]).filter(p => p[1] != null), bound = changes.map((_, k) => [k + 1, Math.log10(changes[0] * gamma ** k)])
  const zero = changes.findIndex(c => c === 0), ratios = changes.slice(1).map((c, k) => changes[k] > 0 ? c / changes[k] : 0), worst = Math.max(...ratios)
  return <div>
    <div className="ml-fig-controls"><label>γ <input type="range" min={0.5} max={0.99} step={0.01} value={gamma} onChange={e => setGamma(Number(e.target.value))} aria-label="Discount gamma" /> <strong>{gamma.toFixed(2)}</strong></label></div>
    <MiniPlot x={[1, 80]} y={[-6, 2]} xLabel="sweep k" yLabel="log₁₀ change" yFormat={v => r(v, 0)} label="Largest change per sweep against the contraction bound">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={bound} stroke="var(--muted)" dash="5 3" />
      <Path X={X} Y={Y} points={pts} stroke="var(--chart-val)" />
      <Dots X={X} Y={Y} points={pts.map(p => [p[0], p[1], 2.5, 'var(--chart-val)'])} />
    </>}</MiniPlot>
    <p className="ml-fig-sum">Orange: the largest change in each sweep. Grey dashed: the guarantee γᵏ × (first change). The largest ratio of one change to the previous is <strong>{r(worst, 3)}</strong>, never above γ = {gamma.toFixed(2)}. {zero >= 0 ? `The change reaches exactly 0 at sweep ${zero + 1}: every path here ends at the star or the ditch, so values stop moving sooner than the bound promises.` : 'Within 80 sweeps the change has not reached 0.'} Raise γ and convergence slows.</p>
  </div>
}

// 37.3 ¶4 — the optimal route with and without slip.
export function RouteBySlip() {
  const [slip, setSlip] = useState(0.1)
  const vi = useMemo(() => valueIteration({ slip }), [slip]), pol = fromTable(vi.policy), path = greedyPath(pol)
  const hand = useMemo(() => policyEvaluation(s => epsilonGreedyProbs(edgeWalker(s), 0), { slip }).V[startState()], [slip])
  return <div>
    <div className="ml-fig-controls"><label>slip <input type="range" min={0} max={0.3} step={0.05} value={slip} onChange={e => setSlip(Number(e.target.value))} aria-label="Slip probability" /> <strong>{slip.toFixed(2)}</strong></label></div>
    <Grid values={vi.V} arrows={pol} highlight={path} label={`Optimal route at slip ${slip}: ${path.length - 1} moves`} />
    <p className="ml-fig-sum">Outlined: the route the optimal arrows take when no slip happens, <strong>{path.length - 1} moves</strong>{Math.min(...path.slice(1, -1).map(s => cell(s)[1])) < 3 ? ', climbing away from the ditch' : ', along the ditch'}. V*(start) = {r(vi.V[startState()])}; the hand-written edge route is worth {r(hand)}.{slip === 0 ? ' Without slip they are the same.' : ''}</p>
  </div>
}

// 37.3 ¶6 — simple policies against the optimal one, by simulation.
export function BaselineTable() {
  const [slip, setSlip] = useState(0.1)
  const rows = useMemo(() => {
    const vi = valueIteration({ slip }), rng = random(5)
    return [['random moves', s => Math.floor(rng() * 4)], ['hand-written edge route', edgeWalker], ['optimal (value iteration)', fromTable(vi.policy)]].map(([name, pol]) => [name, evaluatePolicy(pol, { slip, episodes: 400 })])
  }, [slip])
  const pct = v => `${Math.round(100 * v)}%`
  return <div>
    <div className="ml-fig-controls"><label>slip <input type="range" min={0} max={0.3} step={0.05} value={slip} onChange={e => setSlip(Number(e.target.value))} aria-label="Slip probability" /> <strong>{slip.toFixed(2)}</strong></label></div>
    <table className="ml-fig-table" aria-label="Three policies compared over 400 episodes">
      <thead><tr><th>policy</th><th>reaches ★</th><th>falls in ditch</th><th>runs out of time</th><th>mean reward</th><th>moves when it arrives</th></tr></thead>
      <tbody>{rows.map(([name, e]) => <tr key={name}><td>{name}</td><td>{pct(e.goal)}</td><td>{pct(e.ditch)}</td><td>{pct(e.timeout)}</td><td>{r(e.ret, 2)}</td><td>{Number.isFinite(e.steps) ? r(e.steps, 1) : '—'}</td></tr>)}</tbody>
    </table>
    <p className="ml-fig-sum">Each row is 400 simulated episodes. {slip === 0 ? 'Without slip the hand-written route is already optimal: a learner would add nothing here.' : `At ${Math.round(slip * 100)}% slip the optimal policy reaches the star ${pct(rows[2][1].goal)} of the time against ${pct(rows[1][1].goal)} for the hand-written route.`} The random policy shows what “no skill” looks like.</p>
  </div>
}

// ---------- 37.4 ----------
// 37.4 ¶2 — one TD update on a number line.
export function TDStep() {
  const [q, setQ] = useState(2), [rw, setRw] = useState(-0.1), [m, setM] = useState(5), [gamma, setGamma] = useState(0.9), [alpha, setAlpha] = useState(0.5), [done, setDone] = useState(false)
  const target = done ? rw : rw + gamma * m, delta = target - q, next = q + alpha * delta
  const lo = Math.min(q, target, next, -1) - 1, hi = Math.max(q, target, next, 1) + 1, X = v => 20 + (v - lo) / (hi - lo) * 420
  return <div>
    <div className="ml-fig-controls">
      <label>Q(S_t, A_t) <input type="range" min={-5} max={10} step={0.5} value={q} onChange={e => setQ(Number(e.target.value))} aria-label="Current estimate Q" /> <strong>{q}</strong></label>
      <label>R_(t+1) <select value={rw} onChange={e => setRw(Number(e.target.value))} aria-label="Reward">{[-0.1, 10, -10].map(v => <option key={v} value={v}>{v}</option>)}</select></label>
      <label>max Q(S_(t+1), ·) <input type="range" min={-5} max={10} step={0.5} value={m} onChange={e => setM(Number(e.target.value))} aria-label="Best next-state estimate" /> <strong>{m}</strong></label>
      <label>γ <input type="range" min={0} max={0.99} step={0.01} value={gamma} onChange={e => setGamma(Number(e.target.value))} aria-label="Discount gamma" /> <strong>{gamma.toFixed(2)}</strong></label>
      <label>α <input type="range" min={0} max={1} step={0.05} value={alpha} onChange={e => setAlpha(Number(e.target.value))} aria-label="Learning rate alpha" /> <strong>{alpha.toFixed(2)}</strong></label>
      <label><input type="checkbox" checked={done} onChange={e => setDone(e.target.checked)} /> S_(t+1) is terminal</label>
    </div>
    <svg viewBox="0 0 460 70" role="img" aria-label={`Estimate ${r(q)} moves to ${r(next)}, a fraction ${alpha} of the way to the target ${r(target)}`}>
      <line x1={20} x2={440} y1={40} y2={40} stroke="var(--border)" />
      <line x1={X(q)} x2={X(next)} y1={40} y2={40} stroke="var(--chart-model)" strokeWidth="4" />
      {[[q, 'Q', 'var(--muted)'], [target, 'target', 'var(--chart-val)'], [next, 'new Q', 'var(--chart-model)']].map(([v, l, c], k) => <g key={l}><circle cx={X(v)} cy={40} r={6} fill={c} /><text x={X(v)} y={k === 2 ? 64 : 22} textAnchor="middle" style={{ fontSize: 11, fill: 'var(--text)' }}>{l} {r(v, 2)}</text></g>)}
    </svg>
    <p className="ml-fig-sum">target = {done ? `R = ${rw}` : `R + γ·max = ${rw} + ${gamma.toFixed(2)} × ${m} = ${r(target)}`}; δ = target − Q = <strong>{r(delta)}</strong>; new Q = {q} + {alpha.toFixed(2)} × {r(delta)} = <strong>{r(next)}</strong>. α = 1 jumps to the target; α = 0 never moves.</p>
  </div>
}

// 37.4 ¶2 (running average) and ¶4 (step size) — estimating a mean from noisy targets.
export function RunningAverage() {
  const [alpha, setAlpha] = useState(0.5)
  const targets = useMemo(() => { const g = random(11); return range(60).map(() => 5 + 4 * (g() + g() + g() - 1.5)) }, [])
  const trace = rule => { let q = 0; return targets.map((t, i) => (q += rule(i + 1) * (t - q))) }
  const avg = trace(n => 1 / n), fixed = trace(() => alpha)
  return <div>
    <div className="ml-fig-controls"><label>constant α <input type="range" min={0.02} max={1} step={0.02} value={alpha} onChange={e => setAlpha(Number(e.target.value))} aria-label="Constant learning rate" /> <strong>{alpha.toFixed(2)}</strong></label></div>
    <MiniPlot x={[1, 60]} y={[-1, 11]} xLabel="update n" yLabel="estimate" label="Estimates from α = 1/n and from a constant α">{({ X, Y }) => <>
      <Dots X={X} Y={Y} points={targets.map((t, i) => [i + 1, t, 2.2, 'var(--muted)'])} opacity={0.6} />
      <Path X={X} Y={Y} points={avg.map((v, i) => [i + 1, v])} stroke="var(--chart-train)" />
      <Path X={X} Y={Y} points={fixed.map((v, i) => [i + 1, v])} stroke="var(--chart-val)" />
    </>}</MiniPlot>
    <p className="ml-fig-sum">Grey dots: noisy targets, true mean 5. Blue: α = 1/n, which after 60 updates equals the plain average of all 60 targets, {r(avg[59], 3)} (mean of the dots: {r(mean(targets), 3)}). Orange: α = {alpha.toFixed(2)}, ending at {r(fixed[59], 3)}. {alpha >= 0.5 ? 'A large constant α chases the latest target.' : 'A small constant α is steady but slow to start.'}</p>
  </div>
}

// SARSA, written here only to compare with the engine's Q-learning on the same world.
function sarsa({ episodes = 500, alpha = 0.5, gamma = 0.95, epsilon = 0.1, seed = 37 } = {}) {
  const rng = random(seed), Q = range(N_STATES).map(() => [0, 0, 0, 0]), log = []
  const pick = s => { if (rng() < epsilon) return Math.floor(rng() * 4); const b = Math.max(...Q[s]), ties = range(4).filter(a => Q[s][a] === b); return ties[Math.floor(rng() * ties.length)] }
  for (let ep = 0; ep < episodes; ep++) {
    let s = startState(), a = pick(s), ret = 0
    for (let t = 0; t < 60; t++) {
      const res = stepEnv(s, a, rng, {}), a2 = res.done ? 0 : pick(res.next)
      Q[s][a] += alpha * (res.reward + (res.done ? 0 : gamma * Q[res.next][a2]) - Q[s][a])
      ret += res.reward; s = res.next; a = a2
      if (res.done) break
    }
    log.push({ ret })
  }
  return { Q, log }
}
// 37.4 ¶3 — off-policy Q-learning against on-policy SARSA while exploring.
export function QversusSarsa() {
  const [eps, setEps] = useState(0.1), [seed, setSeed] = useState(37)
  const res = useMemo(() => ({ q: qLearning({ episodes: 500, epsilon: eps, seed }), s: sarsa({ epsilon: eps, seed }) }), [eps, seed])
  const pq = greedyPath(fromQ(res.q.Q)), ps = greedyPath(fromQ(res.s.Q)), online = x => mean(x.log.slice(-100).map(l => l.ret))
  const top = p => Math.min(...p.slice(1, -1).map(s => cell(s)[1]))
  return <div>
    <div className="ml-fig-controls">
      <label>ε while training <input type="range" min={0.05} max={0.3} step={0.05} value={eps} onChange={e => setEps(Number(e.target.value))} aria-label="Exploration epsilon" /> <strong>{eps.toFixed(2)}</strong></label>
      <label>seed <select value={seed} onChange={e => setSeed(Number(e.target.value))} aria-label="Seed">{[37, 38, 39, 40].map(v => <option key={v} value={v}>{v}</option>)}</select></label>
    </div>
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <div><p className="ml-caption">Q-learning (off-policy): greedy route</p><Grid highlight={pq} arrows={fromQ(res.q.Q)} label={`Q-learning route, ${pq.length - 1} moves`} /></div>
      <div><p className="ml-caption">SARSA (on-policy): greedy route</p><Grid highlight={ps} arrows={fromQ(res.s.Q)} label={`SARSA route, ${ps.length - 1} moves`} /></div>
    </div>
    <p className="ml-fig-sum">500 episodes each, no slip. Q-learning’s route: {pq.length - 1} moves, highest row {top(pq)}. SARSA’s: {ps.length - 1} moves, highest row {top(ps)} (row 4 is the ditch row; smaller is further away). Mean reward over the last 100 training episodes, exploration included: Q-learning {r(online(res.q), 2)}, SARSA {r(online(res.s), 2)}. Q-learning learns the best route for a greedy robot; SARSA learns the best route for the robot that still explores.</p>
  </div>
}

// 37.4 ¶4 — maximization bias: the max of noisy estimates, and the double estimator.
export function MaxBias() {
  const [noise, setNoise] = useState(1), [k, setK] = useState(4)
  const res = useMemo(() => {
    const g = random(3), gauss = () => { let s = 0; for (let i = 0; i < 12; i++) s += g(); return s - 6 }
    let single = 0, double = 0
    for (let t = 0; t < 4000; t++) {
      const A = range(k).map(() => noise * gauss()), B = range(k).map(() => noise * gauss())
      single += Math.max(...A); double += B[A.indexOf(Math.max(...A))]
    }
    return { single: single / 4000, double: double / 4000 }
  }, [noise, k])
  return <div>
    <div className="ml-fig-controls">
      <label>noise in each estimate <input type="range" min={0} max={3} step={0.25} value={noise} onChange={e => setNoise(Number(e.target.value))} aria-label="Noise" /> <strong>{noise}</strong></label>
      <label>actions <input type="range" min={2} max={10} step={1} value={k} onChange={e => setK(Number(e.target.value))} aria-label="Number of actions" /> <strong>{k}</strong></label>
    </div>
    <table className="ml-fig-table" aria-label="Average of the estimated best value over 4000 trials">
      <thead><tr><th></th><th>average estimate of the best value</th></tr></thead>
      <tbody><tr><td>true best value</td><td>0</td></tr><tr><td>max of one set of estimates</td><td>{r(res.single, 3)}</td></tr><tr><td>choose with one set, evaluate with another (double)</td><td>{r(res.double, 3)}</td></tr></tbody>
    </table>
    <p className="ml-fig-sum">Every action is truly worth 0, and each estimate is off by random noise. Taking the max picks whichever estimate got lucky, so its average is <strong>{r(res.single, 2)}</strong>, above 0, and grows with the noise and the number of actions. Choosing with one set and reading the value from an independent set averages near 0.</p>
  </div>
}

// 37.4 ¶5 — how much experience: greedy success after n training episodes, over several seeds.
export function TrainingLength() {
  const [slip, setSlip] = useState(0.1), lengths = [25, 50, 100, 200, 400], seeds = [37, 38, 39, 40, 41]
  const table = useMemo(() => seeds.map(seed => lengths.map(n => evaluatePolicy(fromQ(qLearning({ episodes: n, seed, slip }).Q), { slip, episodes: 200 }).goal)), [slip]) // eslint-disable-line react-hooks/exhaustive-deps
  const pct = v => `${Math.round(100 * v)}%`
  return <div>
    <div className="ml-fig-controls"><label>slip <input type="range" min={0} max={0.2} step={0.1} value={slip} onChange={e => setSlip(Number(e.target.value))} aria-label="Slip probability" /> <strong>{slip.toFixed(2)}</strong></label></div>
    <table className="ml-fig-table" aria-label="Share of 200 test episodes that reach the star, by training length and seed">
      <thead><tr><th>seed</th>{lengths.map(n => <th key={n}>{n} episodes</th>)}</tr></thead>
      <tbody>{table.map((row, i) => <tr key={i}><td>{seeds[i]}</td>{row.map((v, j) => <td key={j}>{pct(v)}</td>)}</tr>)}</tbody>
    </table>
    <p className="ml-fig-sum">Each cell: train Q-learning for that many episodes, then run its greedy policy for 200 test episodes and count how often it reaches the star. {slip === 0 ? 'Without slip a few dozen episodes are enough.' : 'With slip the rows disagree and are not even steadily increasing: one seed’s result is not a result. Report several.'}</p>
  </div>
}

// ---------- 37.5 ----------
// 37.5 ¶2 — the route the optimal policy takes under each reward design.
export function LoopPath() {
  const [design, setDesign] = useState('checkpoint')
  const vi = useMemo(() => valueIteration({ design }), [design]), path = greedyPath(fromTable(vi.policy), 20), ends = isTerminal(path[path.length - 1])
  return <div>
    <div className="ml-fig-controls">
      <label><input type="radio" name="design375" checked={design === 'task'} onChange={() => setDesign('task')} /> task reward only</label>
      <label><input type="radio" name="design375" checked={design === 'checkpoint'} onChange={() => setDesign('checkpoint')} /> with the +2 checkpoint bonus</label>
    </div>
    <Grid arrows={fromTable(vi.policy)} highlight={path} label={`Optimal route with ${design} reward: ${ends ? `reaches the star in ${path.length - 1} moves` : 'circles without finishing'}`} />
    <p className="ml-fig-sum">{ends ? <>Value iteration’s route reaches the star in <strong>{path.length - 1}</strong> moves.</> : <>Value iteration’s route goes to the checkpoint ({CHECKPOINT.join(', ')}) and then moves {path.slice(-4).map(cellName).join(' → ')} … for ever: it <strong>never reaches the star</strong>. The planner knows the rules exactly, so the fault is in the reward.</>}</p>
  </div>
}

// 37.5 ¶3 — training reward against the task outcome while learning.
export function HackingCurves() {
  const [design, setDesign] = useState('checkpoint')
  const log = useMemo(() => qLearning({ episodes: 400, design }).log, [design])
  const ret = movingAverage(log.map(l => l.ret), 25), task = movingAverage(log.map(l => l.task), 25), goal = mean(log.slice(-50).map(l => l.outcome === 'goal' ? 1 : 0))
  return <div>
    <div className="ml-fig-controls">
      <label><input type="radio" name="design375b" checked={design === 'task'} onChange={() => setDesign('task')} /> task reward only</label>
      <label><input type="radio" name="design375b" checked={design === 'checkpoint'} onChange={() => setDesign('checkpoint')} /> with the +2 checkpoint bonus</label>
    </div>
    <MiniPlot x={[0, 400]} y={[-15, 45]} xLabel="training episode (25-episode average)" yLabel="reward per episode" yFormat={v => r(v, 0)} label="Reward the agent optimizes against the task reward">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={ret.map((v, i) => [i, v])} stroke="var(--chart-val)" />
      <Path X={X} Y={Y} points={task.map((v, i) => [i, v])} stroke="var(--chart-train)" dash={design === 'task' ? '5 3' : undefined} />
    </>}</MiniPlot>
    <p className="ml-fig-sum">Orange: the reward the agent is trained on. Blue: the task reward (−0.1 per move, ±10 at the end). Over the last 50 episodes the robot reaches the star <strong>{Math.round(100 * goal)}%</strong> of the time. {design === 'checkpoint' ? 'The orange curve is high and the blue one stays low: the agent is maximizing the bonus, not doing the task.' : 'With no bonus the two curves are the same.'}</p>
  </div>
}

// 37.5 ¶4 — potential-based shaping telescopes along any path.
const PHI = s => isTerminal(s) ? 0 : -(Math.abs(cell(s)[0] - GOAL[0]) + Math.abs(cell(s)[1] - GOAL[1]))
const PATHS = {
  loop: { label: 'loop at the checkpoint', cells: [[3, 2], [3, 1], [3, 2], [3, 1], [3, 2], [3, 1], [3, 2]] },
  route: { label: 'route to the star', cells: [[0, 4], [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [6, 4]] },
  wander: { label: 'wander, stop midway', cells: [[0, 4], [0, 3], [0, 2], [1, 2], [1, 1], [2, 1], [2, 2], [3, 2]] },
}
export function Telescoping() {
  const [which, setWhich] = useState('loop'), [gamma, setGamma] = useState(1)
  const path = PATHS[which].cells.map(([x, y]) => y * W + x), T = path.length - 1
  const terms = range(T).map(k => ({ k, s: path[k], s2: path[k + 1], F: gamma * PHI(path[k + 1]) - PHI(path[k]) }))
  const total = terms.reduce((t, x) => t + gamma ** x.k * x.F, 0), closed = gamma ** T * PHI(path[T]) - PHI(path[0])
  return <div>
    <div className="ml-fig-controls">
      <label>path <select value={which} onChange={e => setWhich(e.target.value)} aria-label="Path">{Object.entries(PATHS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
      <label>γ <input type="range" min={0.5} max={1} step={0.05} value={gamma} onChange={e => setGamma(Number(e.target.value))} aria-label="Discount gamma" /> <strong>{gamma.toFixed(2)}</strong></label>
    </div>
    <table className="ml-fig-table" aria-label="Shaping terms along the path">
      <thead><tr><th>k</th><th>S_k → S_(k+1)</th><th>Φ(S_k)</th><th>Φ(S_(k+1))</th><th>F = γΦ(S_(k+1)) − Φ(S_k)</th><th>γᵏF</th></tr></thead>
      <tbody>{terms.map(x => <tr key={x.k}><td>{x.k}</td><td style={{ whiteSpace: 'nowrap' }}>{cellName(x.s)} → {cellName(x.s2)}</td><td>{PHI(x.s)}</td><td>{PHI(x.s2)}</td><td>{r(x.F)}</td><td>{r(gamma ** x.k * x.F)}</td></tr>)}</tbody>
    </table>
    <p className="ml-fig-sum">Φ(s) = −(moves to the star), and 0 at terminal cells. Sum of the last column = <strong>{r(total)}</strong>; γ<sup>T</sup>Φ(S_T) − Φ(S₀) = {gamma.toFixed(2)}<sup>{T}</sup> × {PHI(path[T])} − ({PHI(path[0])}) = <strong>{r(closed)}</strong>. Only the two ends matter.{which === 'loop' ? (gamma === 1 ? ' The loop ends where it started, so at γ = 1 it earns exactly nothing.' : ' With γ < 1 the loop’s own terms do not cancel, but the robot must still carry on from the same cell afterwards, and over the whole episode to a terminal cell the shaping adds exactly −Φ(S₀) whatever it did, so the loop gains nothing overall.') : ''}</p>
  </div>
}

// 37.5 ¶5 — which bonuses change the optimal policy.
function viWith(bonus, { gamma = 0.95, sweeps = 200 } = {}) {
  const q = (s, a, V) => outcomes(s, a, {}).reduce((t, o) => t + o.p * (o.reward + bonus(s, o.next, o.done) + (o.done ? 0 : gamma * V[o.next])), 0)
  let V = Array(N_STATES).fill(0)
  for (let i = 0; i < sweeps; i++) V = V.map((_, s) => isTerminal(s) ? 0 : Math.max(...range(4).map(a => q(s, a, V))))
  return { V, policy: s => { const v = range(4).map(a => q(s, a, V)); return v.indexOf(Math.max(...v)) } }
}
export function ShapingKeepsPolicy() {
  const [kind, setKind] = useState('potential'), gamma = 0.95
  const CHECK = CHECKPOINT[1] * W + CHECKPOINT[0]
  const bonuses = { none: () => 0, potential: (s, s2) => gamma * PHI(s2) - PHI(s), repeat: (s, s2) => (s2 === CHECK ? 2 : 0) }
  const task = useMemo(() => viWith(bonuses.none), []), shaped = useMemo(() => viWith(bonuses[kind]), [kind]) // eslint-disable-line react-hooks/exhaustive-deps
  // An action counts as optimal for the task if its task lookahead equals the task maximum (ties allowed).
  const taskQ = s => range(4).map(a => backup(s, a, task.V))
  const wrong = range(N_STATES).filter(s => !isTerminal(s) && (() => { const q = taskQ(s); return q[shaped.policy(s)] < Math.max(...q) - 1e-9 })())
  const path = greedyPath(shaped.policy, 20)
  return <div>
    <div className="ml-fig-controls"><label>added reward <select value={kind} onChange={e => setKind(e.target.value)} aria-label="Added reward">{[['potential', 'potential-based: γΦ(s′) − Φ(s)'], ['repeat', 're-collectable +2 at the checkpoint'], ['none', 'nothing added']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label></div>
    <Grid arrows={shaped.policy} highlight={wrong.length ? wrong : path} label={`Optimal policy with the added reward; ${wrong.length} cells choose an action that is not optimal for the task`} />
    <p className="ml-fig-sum">Arrows: the optimal policy for task reward plus the added term. Cells whose action is <strong>not</strong> optimal for the task: <strong>{wrong.length}</strong>{wrong.length ? ' (outlined)' : ' (the outline shows the route from the start instead)'}. {kind === 'repeat' ? 'The re-collectable bonus changes the plan.' : 'A potential-based bonus changes values but not which actions are best.'}</p>
  </div>
}
