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
  return <div className="ap-net" aria-label="The network">
    <div className="ap-net-modes" role="tablist" aria-label="What to show">
      {[['change', 'Change since start'], ['weights', 'Weights'], ['gradient', 'Gradient (after backward)']].map(([id, label]) =>
        <button key={id} role="tab" aria-selected={mode === id} onClick={() => setMode(id)}>{label}</button>)}
    </div>
    {LAYERS.map(([name, label, transpose]) => {
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
          <span>{vals ? `largest |${mode === 'change' ? 'change' : mode === 'gradient' ? 'gradient' : 'weight'}| ${num(maxAbs)}` : 'no gradient yet: run to loss.backward()'}{moved > 0 ? ` · moved by up to ${num(moved)} in the last step` : ''}</span></div>
        {/* Every weight is drawn the same size: a 2-number bias is a short strip, not a stretched one. */}
        {vals && <svg className="ap-heat" viewBox={`0 0 ${C * 8 + 26} ${R * 8}`} style={{ width: `${(C * 8 + 26) / (64 * 8 + 26) * 100}%` }} role="img" aria-label={`${name} ${mode}`}>
          {Array.from({ length: R }, (_, i) => <g key={i}>
            {transpose && <text x="0" y={i * 8 + 6.5} fontSize="6.5" fill="#5f7276">{INPUTS[i]}</text>}
            {Array.from({ length: C }, (_, j) => { const x = at(i, j) / maxAbs; return <rect key={j} x={26 + j * 8} y={i * 8} width="7.4" height="7.4" fill={x >= 0 ? `rgba(224, 112, 40, ${Math.abs(x)})` : `rgba(40, 104, 200, ${Math.abs(x)})`}><title>{`${name}[${transpose ? `${j}, ${i}` : r === 1 ? j : `${i}, ${j}`}] = ${num(at(i, j))}`}</title></rect> })}
          </g>)}
        </svg>}
      </div>
    })}
    <p className="ap-hint">{total} numbers in all. Orange is positive, blue negative; each strip is scaled to its own largest value. {mode === 'change' ? 'Change since start fills in as optimiser.step() moves the weights: this is the network learning.' : mode === 'gradient' ? 'The gradient is what loss.backward() works out: which way, and how strongly, each weight should move.' : 'The weights started random; that is why this view is never blank.'}</p>
  </div>
}
