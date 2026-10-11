// Pictures of the learners' data, shared by the lessons and the Python tab: the Q-table as grids
// (angle slot down, spin slot across, one grid per push), a linear policy's 8 weights, a network's
// parameters as heat strips, and the neuron's line against its points.
import { COUNTS, LIMITS, makeEdges, toSlots } from '../engine/bins.js'
import { NAMES, SYMBOLS } from '../engine/cartpole.js'
import { XS, YS } from '../engine/linear.js'
import { fmt } from './Cart.jsx'

const heat = (v, max) => {
  if (!v) return undefined
  const k = Math.min(1, Math.abs(v) / max)
  return v > 0 ? `rgba(181, 101, 13, ${0.1 + 0.85 * k})` : `rgba(31, 111, 104, ${0.1 + 0.85 * k})`
}
const range = (edges, i) => i === 0 ? `< ${fmt(edges[0], 2)}` : i === edges.length ? `≥ ${fmt(edges.at(-1), 2)}` : `${fmt(edges[i - 1], 2)} … ${fmt(edges[i], 2)}`

// Q as grids: the two quantities with more than one slot go down and across.
export function QTableGrid({ Q, counts = COUNTS, limits = LIMITS, here = null, writing = null, before = null }) {
  if (!Q?.length) return <p className="qm-hint">The table appears once it is made (step past <code>Q = np.full(…)</code>).</p>
  const dims = counts.map((c, i) => i).filter(i => counts[i] > 1)
  const max = Math.max(1e-9, ...Q.flat().map(Math.abs))
  if (dims.length !== 2) return <div className="cp-qlist">{Q.map((row, s) => <span key={s} className={s === here ? 'here' : ''}>{s}: {row.map(v => fmt(v, 1)).join(' / ')}</span>)}</div>
  const [down, across] = dims
  const edgesDown = makeEdges(limits[down], counts[down]), edgesAcross = makeEdges(limits[across], counts[across])
  const stateAt = (i, j) => { const slots = counts.map(() => 0); slots[down] = i; slots[across] = j; return slots.reduce((st, s, k) => st * counts[k] + s, 0) }
  const grid = (title, cell) => <div className="cp-qgrid-wrap"><b>{title}</b>
    <div className="cp-qgrid" style={{ gridTemplateColumns: `auto repeat(${counts[across]}, 1fr)` }}>
      <span className="cp-qcorner">{SYMBOLS[down]} ↓ {SYMBOLS[across]} →</span>
      {Array.from({ length: counts[across] }, (_, j) => <span key={j} className="cp-qhead" title={`${NAMES[across]} ${range(edgesAcross, j)}`}>{j}</span>)}
      {Array.from({ length: counts[down] }, (_, i) => [<span key={`h${i}`} className="cp-qhead" title={`${NAMES[down]} ${range(edgesDown, i)}`}>{range(edgesDown, i)}</span>,
        ...Array.from({ length: counts[across] }, (_, j) => cell(stateAt(i, j)))])}
    </div></div>
  const valueCell = a => s => {
    const v = Q[s][a], changed = before && before[s]?.[a] !== v
    return <span key={s} title={`Q[${s}, ${a}] = ${fmt(v)}`} className={`cp-qcell${s === here ? ' here' : ''}${writing && writing[0] === s && writing[1] === a ? ' writing' : ''}${changed ? ' changed' : ''}`} style={{ background: heat(v, max) }}>{v === 0 ? '' : Math.abs(v) < 9.95 ? v.toFixed(1) : Math.round(v)}</span>
  }
  return <div className="cp-qtable">
    <div className="cp-qgrids">
      {grid('Q(s, push left)', valueCell(0))}
      {grid('Q(s, push right)', valueCell(1))}
      {grid('preferred push', s => <span key={s} className={`cp-qcell best${s === here ? ' here' : ''}`}>{Q[s][0] === Q[s][1] ? '·' : Q[s][0] > Q[s][1] ? '←' : '→'}</span>)}
    </div>
    <p className="qm-hint">Rows: the pole's angle slot; columns: its spin slot{counts[0] * counts[1] > 1 ? ' (cart position and speed are ignored here)' : ' (cart position and speed have 1 slot each: the table ignores them)'}. Outlined: the state the agent is in. Hover a cell for its exact value.</p>
  </div>
}

// A linear policy: score(push) = weights[push] · state. What decides is the difference of the two
// rows: push right when (w_right − w_left) · state > 0.
export function WeightsView({ weights, before }) {
  if (!weights) return <p className="qm-hint">The weights appear when they are made.</p>
  const diff = weights[1].map((w, i) => w - weights[0][i])
  const max = Math.max(1e-9, ...weights.flat().map(Math.abs), ...diff.map(Math.abs))
  const row = (label, values, prev) => <tr><th>{label}</th>{values.map((v, i) => <td key={i} className={`mono${prev && prev[i] !== v ? ' cp-changed' : ''}`} style={{ background: heat(v, max) }}>{fmt(v)}</td>)}</tr>
  return <div className="cp-weights">
    <table className="qm-log"><thead><tr><th></th>{SYMBOLS.map(s => <th key={s}>× {s}</th>)}</tr></thead>
      <tbody>{row('left', weights[0], before?.[0])}{row('right', weights[1], before?.[1])}{row('right − left', diff)}</tbody></table>
    <p className="qm-hint">The policy pushes right more often when <span className="mono">{diff.map((d, i) => `${fmt(d, 2)}·${SYMBOLS[i]}`).join(' + ')}</span> is above 0. Compare the rule "lean ahead": θ + 0.25 θ̇ &gt; 0.</p>
  </div>
}

// A network's parameters, each a strip of coloured squares (orange +, teal −).
export function NetView({ net, start }) {
  if (!net?.params) return <p className="qm-hint">The network appears once it is made.</p>
  const entries = Object.entries(net.params)
  const total = entries.reduce((n, [, p]) => n + p.size, 0)
  return <div className="cp-net">
    {entries.map(([name, p]) => {
      const v = p.v ?? [], s0 = start?.params?.[name]?.v
      const shown = s0 ? v.map((x, i) => x - s0[i]) : v
      const max = Math.max(1e-12, ...shown.map(Math.abs))
      const cols = p.shape.length === 2 ? p.shape[1] : p.shape[0]
      return <div key={name} className="cp-layer"><span className="mono">{name} · {p.shape.join(' × ')}{p.grad ? ' · has a gradient' : ''}</span>
        <div className="cp-strip" style={{ gridTemplateColumns: `repeat(${Math.min(cols, 64)}, 8px)` }}>{shown.slice(0, 64 * 8).map((x, i) => <span key={i} title={`${fmt(v[i])}`} style={{ background: heat(x, max) ?? '#f1eadc' }} />)}</div></div>
    })}
    <p className="qm-hint">{total.toLocaleString()} numbers. {start ? 'Shown: how far each has moved since training began.' : 'Shown: the values.'}</p>
  </div>
}

export function LineView({ w, b }) {
  const X = x => 30 + x * 100, Y = y => 190 - y * 22
  return <svg viewBox="0 0 420 200" className="qm-plot" role="img" aria-label={`the line y = ${fmt(w ?? 0)}x + ${fmt(b ?? 0)}`}>
    <line x1="30" y1="190" x2="410" y2="190" stroke="#d9ceb9" /><line x1="30" y1="10" x2="30" y2="190" stroke="#d9ceb9" />
    {XS.map((x, i) => <circle key={i} cx={X(x)} cy={Y(YS[i])} r="5" fill="#b5650d"><title>{`(${x}, ${YS[i]})`}</title></circle>)}
    {typeof w === 'number' && <line x1={X(-0.2)} y1={Y(w * -0.2 + b)} x2={X(3.7)} y2={Y(w * 3.7 + b)} stroke="#1f6f68" strokeWidth="2.5" />}
    <text x="40" y="20" className="qm-tick">w = {fmt(w ?? 0)}, b = {fmt(b ?? 0)} (the truth: w = 2, b = 1)</text>
  </svg>
}

export function ReturnsView({ returns, gamma }) {
  if (!returns?.length) return null
  const max = Math.max(...returns)
  return <div className="cp-returns">
    <svg viewBox={`0 0 ${Math.max(returns.length * 6, 120)} 60`} preserveAspectRatio="none" className="qm-plot" role="img" aria-label="the return of every step">
      {returns.map((g, t) => <rect key={t} x={t * 6} y={60 - g / max * 58} width="5" height={g / max * 58} fill="#b5650d" />)}
    </svg>
    <p className="qm-hint">G at step 0 is {fmt(returns[0])}; the last step's is {fmt(returns.at(-1))}{gamma ? ` (γ = ${gamma})` : ''}. Steps near the end have little future left.</p>
  </div>
}

export { toSlots }
