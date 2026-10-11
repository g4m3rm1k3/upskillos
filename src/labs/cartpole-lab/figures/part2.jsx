import { useMemo, useState } from 'react'
import Cart, { fmt } from './Cart.jsx'
import { COUNTS, LIMITS, makeEdges, slot, toState, BinnedCartPole } from '../engine/bins.js'
import { NAMES, SYMBOLS, UNITS, CartPole } from '../engine/cartpole.js'
import { RULES, play } from '../engine/policies.js'

// One number on its line, the cut points, and the slot it falls in, counted out.
export function SlotsFig({ which = 2 }) {
  const [q, setQ] = useState(which)
  const [count, setCount] = useState(COUNTS[which] > 1 ? COUNTS[which] : 6)
  const [limit, setLimit] = useState(LIMITS[which])
  const [value, setValue] = useState(0.03)
  const edges = makeEdges(limit, count), n = slot(value, edges)
  const span = limit * 1.4, X = x => 20 + (x + span) / (2 * span) * 560
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label>Number <select value={q} onChange={e => { const k = Number(e.target.value); setQ(k); setLimit(LIMITS[k]); setValue(0); setCount(COUNTS[k] > 1 ? COUNTS[k] : 6) }}>{NAMES.map((name, i) => <option key={name} value={i}>{name} ({SYMBOLS[i]})</option>)}</select></label>
      <label>count <input type="number" min={1} max={30} value={count} onChange={e => setCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} style={{ width: 52 }} /></label>
      <label>limit <input type="number" step={0.01} value={limit} onChange={e => setLimit(Math.max(0.01, Number(e.target.value) || 0.01))} style={{ width: 64 }} /></label>
    </div>
    <svg viewBox="0 0 600 90" className="qm-plot" role="img" aria-label={`${NAMES[q]} = ${fmt(value)} is in slot ${n}`}>
      {Array.from({ length: count }, (_, i) => { const a = i === 0 ? -span : edges[i - 1], b = i === count - 1 ? span : edges[i]; return <g key={i}><rect x={X(a)} y="20" width={X(b) - X(a)} height="34" fill={i === n ? '#f2b45a' : i % 2 ? '#f1eadc' : '#f8f3ea'} /><text x={(X(a) + X(b)) / 2} y="42" textAnchor="middle" className="qm-tick">{i}</text></g> })}
      {edges.map((e, i) => <g key={i}><line x1={X(e)} x2={X(e)} y1="14" y2="60" stroke="#6f665a" /><text x={X(e)} y="74" textAnchor="middle" className="qm-tick">{fmt(e, 3)}</text></g>)}
      {[-limit, limit].map(l => <text key={l} x={X(l)} y="10" textAnchor="middle" className="qm-tick" fill="#a8402f">{l > 0 ? '+' : '−'}limit</text>)}
      <line x1={X(value)} x2={X(value)} y1="16" y2="58" stroke="#a8402f" strokeWidth="3" />
    </svg>
    <input type="range" min={-span} max={span} step={span / 500} value={value} onChange={e => setValue(Number(e.target.value))} aria-label="value" style={{ width: '100%' }} />
    <p className="mono">{NAMES[q]} = {fmt(value, 4)} {UNITS[q]} · edges = [{edges.map(e => fmt(e, 4)).join(', ')}]</p>
    <p>Cut points at or below it: {edges.length ? edges.map((e, i) => <span key={i} className="mono">{value >= e ? '✓' : '✗'} </span>) : '(none)'} → <b>slot({fmt(value, 4)}, edges) = {n}</b>. {count === 1 ? 'With one slot every value is in slot 0: the table ignores this number.' : n === 0 ? 'Everything below the first cut point is slot 0, however far.' : n === count - 1 ? 'Everything above the last cut point is the last slot, however far.' : ''}</p>
  </div>
}

// A game's states, one at a time: the 4 numbers → 4 slots → one state number.
export function StateNumberFig({ seed = 0 }) {
  const game = useMemo(() => play(RULES.lean_ahead.run, seed), [seed])
  const env = useMemo(() => new BinnedCartPole(), [])
  const [t, setT] = useState(0)
  const state = game.trail[t]
  const slots = env.slotsOf(state)
  const n = toState(slots, COUNTS)
  let work = '0', acc = 0
  slots.forEach((sl, i) => { acc = acc * COUNTS[i] + sl; work = i === 0 ? `0 × ${COUNTS[0]} + ${sl}` : `(${work}) × ${COUNTS[i]} + ${sl}` })
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Step <input type="range" min={0} max={Math.min(game.trail.length - 1, 120)} value={t} onChange={e => setT(Number(e.target.value))} /> <b className="mono">{t}</b></label></div>
    <div className="cp-row">
      <div><Cart state={state} height={150} />
        <table className="qm-log qm-left"><thead><tr><th>number</th><th>value</th><th>slots</th><th>slot</th></tr></thead>
          <tbody>{NAMES.map((name, i) => <tr key={name}><td className="mono">{name}</td><td className="mono">{fmt(state[i], 4)}</td><td>{COUNTS[i]}</td><td><b>{slots[i]}</b></td></tr>)}</tbody></table>
      </div>
      <div>
        <p className="mono">to_state({`[${slots.join(', ')}]`}, (1, 1, 6, 12))</p>
        <p className="mono">= {work}</p>
        <p className="cp-big">state {n}</p>
        <div className="cp-qgrid" style={{ gridTemplateColumns: 'auto repeat(12, 1fr)' }}>
          <span className="cp-qcorner">θ ↓ θ̇ →</span>{Array.from({ length: 12 }, (_, j) => <span key={j} className="cp-qhead">{j}</span>)}
          {Array.from({ length: 6 }, (_, i) => [<span key={`h${i}`} className="cp-qhead">{i}</span>, ...Array.from({ length: 12 }, (_, j) => <span key={`${i}-${j}`} className={`cp-qcell${i * 12 + j === n ? ' here' : ''}`} style={{ background: i * 12 + j === n ? '#f2b45a' : undefined }}>{i * 12 + j}</span>)])}
        </div>
        <p className="qm-hint">All 72 state numbers: angle slot × 12 + spin slot. Drag through the game and watch the agent move around this grid.</p>
      </div>
    </div>
  </div>
}

// Two real states in the same slots: one row of the table, but "lean ahead" pushes them opposite ways.
export function AliasFig() {
  const [a, setA] = useState([0, 0, -0.065, 0.5]), [b, setB] = useState([0, 0, -0.065, 0.05])
  const env = useMemo(() => new BinnedCartPole(), [])
  const decide = s => s[2] + 0.25 * s[3] > 0 ? '→ right' : '← left'
  const row = (s, set, label) => <div>
    <Cart state={s} height={140} label={label} />
    {[2, 3].map(i => <div key={i} className="cp-slider-row"><span className="mono">{NAMES[i]}</span><input type="range" min={i === 2 ? -0.2 : -3} max={i === 2 ? 0.2 : 3} step={i === 2 ? 0.001 : 0.01} value={s[i]} onChange={e => set(old => old.map((x, k) => k === i ? Number(e.target.value) : x))} aria-label={`${label} ${NAMES[i]}`} /><b className="mono">{fmt(s[i])}</b><span>slot {env.slotsOf(s)[i]}</span></div>)}
    <p>table state <b>{env.stateOf(s)}</b> · "lean ahead" says <b>{decide(s)}</b></p>
  </div>
  const same = env.stateOf(a) === env.stateOf(b)
  return <div className="qm-fig">
    <div className="cp-row">{row(a, setA, 'state A')}{row(b, setB, 'state B')}</div>
    <p>{same ? (decide(a) !== decide(b) ? <><b>Same row of the table, opposite right answers.</b> A table can store only one choice per row, so it must get one of them wrong.</> : 'Same row, and here the same right answer: no harm done.') : 'Different rows: the table can treat these two differently.'}</p>
  </div>
}

// How many rows a choice of slots makes, and how often a game visits each.
export function SlotCounts() {
  const [counts, setCounts] = useState([1, 1, 6, 12])
  const n = counts.reduce((x, y) => x * y, 1)
  const visits = useMemo(() => {
    const env = new BinnedCartPole(counts), seen = new Map()
    for (let seed = 0; seed < 20; seed++) {
      let [st] = env.reset(seed), done = false
      const world = env.world
      while (!done) { seen.set(st, (seen.get(st) ?? 0) + 1); const r = env.step(RULES.lean_ahead.run(world.state)); st = r[0]; done = r[2] || r[3] }
    }
    return seen
  }, [counts.join()])
  return <div className="qm-fig">
    <div className="qm-fig-controls">{NAMES.map((name, i) => <label key={name}>{name} <select value={counts[i]} onChange={e => setCounts(c => c.map((x, k) => k === i ? Number(e.target.value) : x))}>{[1, 2, 3, 4, 6, 8, 12, 20].map(k => <option key={k}>{k}</option>)}</select></label>)}</div>
    <p><b>{n.toLocaleString()}</b> rows ({counts.join(' × ')}), × 2 pushes = <b>{(2 * n).toLocaleString()}</b> numbers to learn. In 20 games of "lean ahead" (10,000 steps), <b>{visits.size}</b> rows were visited at all; the busiest {Math.max(...visits.values()).toLocaleString()} times.</p>
    <p className="qm-hint">Fine slots tell situations apart, but every row has to be learned from its own visits: double the slots in each number and the table is 16 times bigger. The default, (1, 1, 6, 12), ignores the cart and spends its rows on the pole.</p>
  </div>
}

export { CartPole }
