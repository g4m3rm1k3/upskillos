// Pictures of the running program's real data: the cart (from Gymnasium's observation), the Q-table
// (from the agent's NumPy array) and the network (from PyTorch's parameters and gradients).
import { useState } from 'react'
import { plain } from './analysis.js'

export const num = v => typeof v !== 'number' ? String(v) : Number.isInteger(v) ? String(v) : Math.abs(v) < 1e-3 && v !== 0 ? v.toExponential(2) : v.toFixed(3)

// ── The cart ─────────────────────────────────────────────────────────────────────────────────
export function Cart({ obs, ghost, label }) {
  const draw = (s, faint) => {
    const x = 300 + s[0] * 85, tipX = x + Math.sin(s[2]) * 110, tipY = 140 - Math.cos(s[2]) * 110
    return <g opacity={faint ? .28 : 1}>
      <rect x={x - 28} y="136" width="56" height="20" rx="6" fill={faint ? '#9fb5bf' : '#68dbd0'} />
      <line x1={x} y1="140" x2={tipX} y2={tipY} stroke={faint ? '#c8b3a5' : '#ffb28a'} strokeWidth="7" strokeLinecap="round" />
      <circle cx={x} cy="140" r="4" fill="#0c1d28" />
    </g>
  }
  return <svg viewBox="0 0 600 182" role="img" aria-label={obs ? `CartPole: cart at ${num(obs[0])} m, pole at ${num(obs[2])} rad` : 'CartPole: no game yet'}>
    <line x1="96" y1="16" x2="96" y2="166" stroke="#ffae7d" strokeDasharray="4 6" opacity=".4" />
    <line x1="504" y1="16" x2="504" y2="166" stroke="#ffae7d" strokeDasharray="4 6" opacity=".4" />
    <line x1="40" y1="164" x2="560" y2="164" stroke="#657887" strokeWidth="2" />
    <text x="96" y="179" textAnchor="middle" fill="#94a8b5" fontSize="11">−2.4 m</text><text x="504" y="179" textAnchor="middle" fill="#94a8b5" fontSize="11">+2.4 m</text>
    {ghost && draw(ghost, true)}
    {obs ? draw(obs, false) : draw([0, 0, 0, 0], true)}
    <text x="12" y="18" fill="#a8bfca" fontSize="12">{label}</text>
    {obs && <text x="588" y="18" textAnchor="end" fill="#a8bfca" fontSize="12">obs = [{obs.map(num).join(', ')}]</text>}
    {obs && ghost && <text x="12" y="36" fill="#e8ff9e" fontSize="11">moved since the faint copy: x {num(obs[0] - ghost[0])} m · θ {num(obs[2] - ghost[2])} rad</text>}
  </svg>
}

// The cart's 4 numbers from a watched observation (one world, or world 1 of several).
export function obsOf(view) {
  const o = plain(view?.watch?.obs?.value)
  if (!Array.isArray(o)) return null
  const first = Array.isArray(o[0]) ? o[0] : o
  return first.length === 4 && first.every(x => typeof x === 'number') ? first : null
}

// ── The Q-table ──────────────────────────────────────────────────────────────────────────────
// Chapter 2's bins: angle 6 slots across ±0.21 rad, spin 12 slots across ±3.5 rad/s, so
// row = angle slot × 12 + spin slot. Shown as angle (down) × spin (across), one grid per push.
const ANGLE_EDGES = [-0.14, -0.07, 0, 0.07, 0.14]
const SPIN_EDGES = Array.from({ length: 11 }, (_, i) => -3.5 + 7 * (i + 1) / 12)
const slot = (edges, i) => i === 0 ? `< ${num(edges[0])}` : i === edges.length ? `≥ ${num(edges.at(-1))}` : `${num(edges[i - 1])} … ${num(edges[i])}`

export function QTableView({ table, prev, here, writing }) {
  if (!table) return <p className="ap-hint">The table appears when the agent is created (step past <code>agent = QAgent(…)</code>).</p>
  const [rows, cols] = table.shape
  const v = table.v, before = prev?.v
  const max = Math.max(1e-9, ...v.map(Math.abs))
  const filled = v.filter(x => x !== 0).length
  const changed = before ? v.map((x, i) => x !== before[i]) : v.map(() => false)
  const cell = (s, a) => {
    const value = v[s * cols + a], k = s * cols + a
    const strength = Math.abs(value) / max
    const classes = ['ap-qcell', value === 0 && 'empty', s === here && 'here', writing && writing.state === s && writing.action === a && 'writing', changed[k] && 'changed'].filter(Boolean).join(' ')
    return <span key={k} className={classes} title={`Q[${s}, ${a}] = ${num(value)}`} style={value === 0 ? undefined : { background: `rgba(20, 121, 111, ${0.12 + 0.88 * strength})`, color: strength > .55 ? '#fff' : '#123' }}>{value === 0 ? '' : Math.abs(value) < 9.95 ? value.toFixed(1) : Math.round(value)}</span>
  }
  const best = s => { const l = v[s * cols], r = v[s * cols + 1]; return l === r ? '·' : l > r ? '←' : '→' }
  if (rows !== 72 || cols !== 2) {
    return <div className="ap-qlist">{Array.from({ length: rows }, (_, s) => <div key={s}><b>{s}</b>{Array.from({ length: cols }, (_, a) => cell(s, a))}</div>)}</div>
  }
  const grid = (title, render) => <div className="ap-qgrid-wrap"><b>{title}</b><div className="ap-qgrid">
    <span className="ap-qcorner">angle ↓ spin →</span>{Array.from({ length: 12 }, (_, j) => <span key={j} className="ap-qhead" title={`spin ${slot(SPIN_EDGES, j)} rad/s`}>{j}</span>)}
    {Array.from({ length: 6 }, (_, i) => [<span key={`h${i}`} className="ap-qhead" title={`angle ${slot(ANGLE_EDGES, i)} rad`}>{slot(ANGLE_EDGES, i)}</span>, ...Array.from({ length: 12 }, (_, j) => render(i * 12 + j))])}
  </div></div>
  return <div className="ap-qtable" aria-label="The Q-table">
    <div className="ap-qgrids">
      {grid('Q(s, push left)', s => cell(s, 0))}
      {grid('Q(s, push right)', s => cell(s, 1))}
      {grid('preferred push', s => <span key={s} className={`ap-qcell best${s === here ? ' here' : ''}`}>{best(s)}</span>)}
    </div>
    <p className="ap-hint"><b>{filled}</b> of {rows * cols} entries filled · largest {num(max)} · outlined: the current state{writing ? ' · thick border: the entry being written' : ''} · yellow: changed by the last step. Each entry is the agent's estimate of the discounted reward that follows that push in that state.</p>
  </div>
}

// ── The network ──────────────────────────────────────────────────────────────────────────────
const LAYERS = [
  ['body.0.weight', 'body: 4 inputs → 64 hidden (weights)', true], ['body.0.bias', 'body bias (64)'],
  ['actor.weight', 'actor: 64 hidden → 2 scores (weights)'], ['actor.bias', 'actor bias (2)'],
  ['critic.weight', 'critic: 64 hidden → V(s) (weights)'], ['critic.bias', 'critic bias (1)'],
]
const INPUTS = ['x', 'ẋ', 'θ', 'θ̇']

export function NetworkView({ net, prev, baseline }) {
  const [mode, setMode] = useState('change')
  if (!net?.params) return <p className="ap-hint">The network appears when it is created (step past <code>net = ActorCritic()</code>).</p>
  const params = net.params
  const values = name => {
    const p = params[name]
    if (!p) return null
    if (mode === 'weights') return p.v
    if (mode === 'gradient') return p.grad ?? null
    const start = baseline?.params?.[name]?.v
    return start ? p.v.map((x, i) => x - start[i]) : p.v.map(() => 0)
  }
  const stepChange = name => { const a = params[name]?.v, b = prev?.params?.[name]?.v; return a && b ? Math.max(...a.map((x, i) => Math.abs(x - b[i]))) : 0 }
  const total = Object.keys(params).reduce((n, k) => n + params[k].size, 0)
  // ActorCritic's layers by name; any other network (REINFORCE's policy, the one-step actor and
  // critic) shows every parameter, with tall matrices turned on their side.
  const known = LAYERS.filter(([name]) => params[name])
  const layers = known.length ? known : Object.keys(params).map(name => [name, name, params[name].shape.length === 2 && params[name].shape[1] < params[name].shape[0]])
  const widest = Math.max(...layers.map(([name, , t]) => { const sh = params[name].shape; return sh.length === 2 ? (t ? sh[0] : sh[1]) : sh[0] }))
  return <div className="ap-net" aria-label="The network">
    <div className="ap-net-modes" role="tablist" aria-label="What to show">
      {[['change', 'Change since start'], ['weights', 'Weights'], ['gradient', 'Gradient (after backward)']].map(([id, label]) =>
        <button key={id} role="tab" aria-selected={mode === id} onClick={() => setMode(id)}>{label}</button>)}
    </div>
    {layers.map(([name, label, transpose]) => {
      const p = params[name]; if (!p) return null
      const vals = values(name)
      const [r, c] = p.shape.length === 2 ? p.shape : [1, p.shape[0]]
      // Show the 64 × 4 body as 4 × 64, so every matrix is a wide strip with 64 columns.
      const [R, C] = transpose ? [c, r] : [r, c]
      const at = (i, j) => vals[transpose ? j * c + i : i * c + j]
      const maxAbs = vals ? Math.max(1e-12, ...vals.map(Math.abs)) : 1
      const moved = stepChange(name)
      return <div key={name} className="ap-layer">
        <div className="ap-layer-head"><b>{label}</b><span className="mono">{name} · {p.shape.join(' × ')}</span>
          <span>{!vals ? 'no gradient yet: run to loss.backward()' : maxAbs <= 1e-12 ? (mode === 'change' ? 'no change yet: optimiser.step() has not run' : 'all zero') : `largest |${mode === 'change' ? 'change' : mode === 'gradient' ? 'gradient' : 'weight'}| ${num(maxAbs)}`}{moved > 0 ? ` · moved by up to ${num(moved)} in the last step` : ''}</span></div>
        {/* Every weight is drawn the same size: a 2-number bias is a short strip, not a stretched one. */}
        {vals && <svg className="ap-heat" viewBox={`0 0 ${C * 8 + 26} ${R * 8}`} style={{ width: `${(C * 8 + 26) / (widest * 8 + 26) * 100}%` }} role="img" aria-label={`${name} ${mode}`}>
          {Array.from({ length: R }, (_, i) => <g key={i}>
            {transpose && R === 4 && <text x="0" y={i * 8 + 6.5} fontSize="6.5" fill="#5f7276">{INPUTS[i]}</text>}
            {Array.from({ length: C }, (_, j) => { const x = at(i, j) / maxAbs; return <rect key={j} x={26 + j * 8} y={i * 8} width="7.4" height="7.4" fill={x >= 0 ? `rgba(224, 112, 40, ${Math.abs(x)})` : `rgba(40, 104, 200, ${Math.abs(x)})`}><title>{`${name}[${transpose ? `${j}, ${i}` : r === 1 ? j : `${i}, ${j}`}] = ${num(at(i, j))}`}</title></rect> })}
          </g>)}
        </svg>}
      </div>
    })}
    <p className="ap-hint">{total} numbers in all. Orange is positive, blue negative; each strip is scaled to its own largest value. {mode === 'change' ? 'Change since start fills in as optimiser.step() moves the weights: this is the network learning.' : mode === 'gradient' ? 'The gradient is what loss.backward() works out: which way, and how strongly, each weight should move.' : 'The weights started random; that is why this view is never blank.'}</p>
  </div>
}

// ── Concept pictures ─────────────────────────────────────────────────────────────────────────
const watched = (view, key) => plain(view?.watch?.[key]?.value)

// The 5-cell corridor: where the agent is, the goal, and whatever the program knows about each
// cell: the policy's action, V(s) (and this sweep's new values), or the Q-table's two numbers.
export function CorridorView({ view, prev }) {
  const state = watched(view, 'state'), V = watched(view, 'V'), newV = watched(view, 'newV'), Q = watched(view, 'Q')
  const policy = watched(view, 'policy'), rewards = watched(view, 'rewards')
  const pV = watched(prev, 'V'), pQ = watched(prev, 'Q'), pNew = watched(prev, 'newV')
  const cell = i => {
    const changed = (V && pV && V[i] !== pV[i]) || (Q && pQ && (Q[i][0] !== pQ[i][0] || Q[i][1] !== pQ[i][1])) || (newV && pNew && newV[i] !== pNew[i])
    return <div key={i} className={`ap-cell${i === 4 ? ' goal' : ''}${state === i ? ' here' : ''}${changed ? ' changed' : ''}`}>
      <small>cell {i}{i === 4 ? ' · goal' : ''}</small>
      {state === i && <span className="ap-agent" aria-label="the agent">●</span>}
      {policy && i < 4 && policy[i] && <span className="ap-arrow">{policy[i] === 'right' ? '→' : '←'}</span>}
      {V && <span className="mono">V = {num(V[i])}</span>}
      {newV && <span className="mono ap-new">new {num(newV[i])}</span>}
      {Q && <span className="mono ap-q">← {num(Q[i][0])}<br />→ {num(Q[i][1])}</span>}
    </div>
  }
  return <div className="ap-corridor-wrap">
    <div className="ap-corridor" aria-label="The corridor">{[0, 1, 2, 3, 4].map(cell)}</div>
    {Array.isArray(rewards) && <p className="ap-hint">rewards so far: [{rewards.map(num).join(', ')}]</p>}
    <p className="ap-hint">{Q ? 'Each cell shows Q(s, left) and Q(s, right). ' : V ? 'Each cell shows its value V(s). ' : ''}Yellow: changed by the last step.</p>
  </div>
}

// Small arrays as bars, one row per entry (machine 0, machine 1 …), one bar per watched series.
export function BarsView({ view, prev, bars, item = 'item' }) {
  const rows = bars.map(([key, label]) => ({ key, label, values: watched(view, key), before: watched(prev, key) })).filter(r => Array.isArray(r.values))
  if (!rows.length) return <p className="ap-hint">Nothing to draw yet: step into the program.</p>
  const n = Math.max(...rows.map(r => r.values.length))
  const scalars = ['baseline', 'advantage'].map(k => [k, watched(view, k)]).filter(([, v]) => typeof v === 'number')
  return <div className="ap-bars">
    {Array.from({ length: n }, (_, i) => <div key={i} className="ap-bar-group"><b>{item} {i}</b>
      {rows.map(r => { const all = r.values.map(Math.abs), max = Math.max(1e-9, ...all, ...(r.key === 'chances' || r.key === 'probs' ? [1] : [])); const v = r.values[i]; const changed = r.before && r.before[i] !== v
        return <div key={r.key} className={`ap-bar-row${changed ? ' changed' : ''}`}><span>{r.label}</span><span className="ap-bar-track"><span className={`ap-bar${v < 0 ? ' neg' : ''}`} style={{ width: `${Math.abs(v ?? 0) / max * 100}%` }} /></span><span className="mono">{v === undefined ? '—' : num(v)}</span></div> })}
    </div>)}
    {scalars.length > 0 && <p className="ap-hint mono">{scalars.map(([k, v]) => `${k} = ${num(v)}`).join('   ')}</p>}
  </div>
}

// The neuron's line against the 4 points it is learning.
export function LineView({ view }) {
  const w = watched(view, 'w'), b = watched(view, 'b'), xs = watched(view, 'xs'), ys = watched(view, 'ys'), loss = watched(view, 'loss')
  if (!Array.isArray(xs)) return <p className="ap-hint">Step into the program to start.</p>
  const X = x => 30 + x * 100, Y = y => 190 - y * 22
  return <div><svg viewBox="0 0 420 200" className="ap-line-plot" role="img" aria-label={`The line y = ${num(w ?? 0)}x + ${num(b ?? 0)}`}>
    <line x1="30" y1="190" x2="410" y2="190" stroke="#ccd6d0" /><line x1="30" y1="10" x2="30" y2="190" stroke="#ccd6d0" />
    {xs.map((x, i) => <circle key={i} cx={X(x)} cy={Y(ys[i])} r="5" fill="#e07028"><title>{`(${x}, ${ys[i]})`}</title></circle>)}
    {typeof w === 'number' && <line x1={X(-0.2)} y1={Y(w * -0.2 + b)} x2={X(3.7)} y2={Y(w * 3.7 + b)} stroke="#14796f" strokeWidth="2.5" />}
  </svg>
  <p className="ap-hint mono">w = {num(w ?? 0)}   b = {num(b ?? 0)}{typeof loss === 'number' ? `   loss so far this step = ${num(loss)}` : ''}   (the truth: w = 2, b = 1)</p></div>
}

// A learning curve: one bar per game, its length.
export function LengthsView({ view }) {
  const lengths = watched(view, 'lengths')
  if (!Array.isArray(lengths) || !lengths.length) return null
  const max = Math.max(...lengths, 50)
  const last = lengths.slice(-50), avg = last.reduce((a, b) => a + b, 0) / last.length
  return <div className="ap-lengths"><b>Game lengths so far</b> <span className="ap-hint">({lengths.length} games · last {last.length} average {num(Math.round(avg * 10) / 10)})</span>
    <svg viewBox={`0 0 ${Math.max(lengths.length, 40)} 40`} preserveAspectRatio="none" role="img" aria-label="Learning curve">{lengths.map((n, i) => <rect key={i} x={i} y={40 - n / max * 40} width="0.85" height={n / max * 40} fill="#14796f" />)}</svg></div>
}
