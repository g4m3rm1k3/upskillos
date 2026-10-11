import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import Cart, { fmt } from './Cart.jsx'
import Plot from './Plot.jsx'
import { QTableGrid } from './pictures.jsx'
import { Slider } from '../../qmaze-lab/figures/ui.jsx'
import { qLearning, sarsa, finish, greedyAction, linear } from '../../qmaze-lab/engine/tabular.js'
import { PyRandom } from '../../qmaze-lab/engine/mt.js'
import { BinnedCartPole, COUNTS, LIMITS, makeEdges, toSlots } from '../engine/bins.js'
import { ARROWS, ACTION_NAMES } from '../engine/cartpole.js'

export const TABLE_DEFAULTS = { algorithm: 'q', episodes: 500, alpha: 0.1, gamma: 0.99, epsilonStart: 1.0, epsilonEnd: 0.01, initialQ: 0, seed: 0, counts: COUNTS }
const ALGORITHMS = { q: { label: 'Q-learning', make: qLearning }, sarsa: { label: 'SARSA', make: sarsa } }

// evaluate.py's greedy_lengths, plus why each game ended.
export function greedyGames(Q, counts = COUNTS, games = 20, seed = 1000) {
  const env = new BinnedCartPole(counts), rng = new PyRandom(seed), out = []
  for (let g = 0; g < games; g++) {
    let [st] = env.reset(seed + g), n = 0, r
    const trail = [env.world.state]
    do { r = env.step(greedyAction(Q[st], rng)); st = r[0]; n++; trail.push(env.world.state) } while (!r[2] && !r[3])
    const [x] = env.world.state
    out.push({ length: n, why: r[3] ? 'lasted 500' : Math.abs(x) > 2.4 ? 'cart off the track' : 'pole fell', trail })
  }
  return out
}
export function trainTable(options) {
  const o = { ...TABLE_DEFAULTS, ...options }
  return finish(ALGORITHMS[o.algorithm].make(new BinnedCartPole(o.counts), o))
}
const mean = a => a.reduce((x, y) => x + y, 0) / a.length

// One row of the table and the greedy choice, ties settled at random.
export function QRowFig() {
  const [row, setRow] = useState([0.0, 0.0])
  const [picks, setPicks] = useState([])
  const rng = useRef(new PyRandom(0))
  const best = Math.max(...row), ties = row.map((q, a) => q === best ? a : -1).filter(a => a >= 0)
  return <div className="qm-fig">
    <div className="cp-row">
      {row.map((q, a) => <label key={a} className="qm-slider">Q[s, {a}] ({ACTION_NAMES[a]}) <input type="number" step="0.5" value={q} onChange={e => setRow(r => r.map((x, k) => k === a ? Number(e.target.value) : x))} style={{ width: 80 }} /></label>)}
    </div>
    <p>max = <b>{fmt(best)}</b>; actions tied for best: <span className="mono">[{ties.join(', ')}]</span> → greedy_action picks {ties.length > 1 ? 'one of them at random' : <b>{ACTION_NAMES[ties[0]]}</b>}.</p>
    <div className="qm-buttons"><button onClick={() => setPicks(p => [...p, greedyAction(row, rng.current)].slice(-30))}>greedy_action(q_row, rng)</button><span className="mono">{picks.map(a => ARROWS[a]).join(' ')}</span></div>
  </div>
}

// The ε schedule over training, and what ε means for one choice.
export function EpsilonFig({ episodes = 500 }) {
  const [start, setStart] = useState(1), [end, setEnd] = useState(0.01)
  const values = Array.from({ length: episodes }, (_, e) => linear(start, end, e / (0.8 * episodes)))
  const [at, setAt] = useState(100)
  const eps = values[at]
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="ε start" value={start} min={0} max={1} step={0.01} onChange={setStart} /><Slider label="ε end" value={end} min={0} max={1} step={0.01} onChange={setEnd} /><Slider label="game" value={at} min={0} max={episodes - 1} step={1} onChange={setAt} /></div>
    <Plot series={[{ values, color: '#1f6f68' }]} window={1} x="game" label="epsilon over training" />
    <p>In game {at + 1}, ε = <b className="mono">{fmt(eps, 4)}</b>. On a move, with probability ε the agent explores (a random push: each with ε/2 = {fmt(eps / 2, 4)}); otherwise it takes its best push. So the best push is taken with probability <span className="mono">1 − ε + ε/2 = {fmt(1 - eps / 2, 4)}</span>.</p>
  </div>
}

// One Q-learning update with numbers you choose.
export function TDUpdateFig() {
  const [q, setQ] = useState(20), [r, setR] = useState(1), [nextBest, setNextBest] = useState(30), [term, setTerm] = useState(false)
  const [alpha, setAlpha] = useState(0.1), [gamma, setGamma] = useState(0.99)
  const target = term ? r : r + gamma * nextBest, delta = target - q, updated = q + alpha * delta
  const num = (label, value, set, step = 1) => <label className="qm-slider">{label} <input type="number" step={step} value={value} onChange={e => set(Number(e.target.value))} style={{ width: 80 }} /></label>
  return <div className="qm-fig">
    <div className="qm-fig-controls">{num('Q[s, a] now', q, setQ)}{num('reward r', r, setR)}{num('max Q[s′]', nextBest, setNextBest)}<label><input type="checkbox" checked={term} onChange={e => setTerm(e.target.checked)} /> terminated (the pole fell)</label></div>
    <div className="qm-fig-controls"><Slider label="α" value={alpha} min={0} max={1} step={0.01} onChange={setAlpha} /><Slider label="γ" value={gamma} min={0} max={1} step={0.01} onChange={setGamma} /></div>
    <div className="cp-work">{`target   = ${term ? `r  (terminated: no future)  = ${fmt(r)}` : `r + γ · max Q[s′] = ${fmt(r)} + ${fmt(gamma)} × ${fmt(nextBest)} = ${fmt(target, 4)}`}
δ        = target − Q[s, a] = ${fmt(target, 4)} − ${fmt(q)} = `}<b>{fmt(delta, 4)}</b>{`
Q[s, a] ← Q[s, a] + α · δ = ${fmt(q)} + ${fmt(alpha)} × ${fmt(delta, 4)} = `}<b>{fmt(updated, 4)}</b></div>
    <p className="qm-hint">{delta > 0 ? 'The move turned out better than the table thought: its value goes up.' : delta < 0 ? 'Worse than the table thought: its value goes down.' : 'Exactly as expected: no change.'} α = {fmt(alpha)} moves it {fmt(alpha * 100)}% of the way to the target.</p>
  </div>
}

function UpdateCard({ u, algorithm, alpha, gamma }) {
  if (!u) return <p className="qm-hint">No moves yet. Press <b>One move</b> to see the first update written out.</p>
  const next = algorithm === 'q' ? u.nextBest : u.nextQ
  return <div className="qm-update">
    <p className="mono qm-small">game {u.episode + 1}, step {u.t + 1} · ε = {fmt(u.epsilon, 3)}</p>
    <p>In state <b>{u.state}</b> the agent {u.explored ? 'explored (a random push)' : 'exploited (its best push)'}: <b>{ARROWS[u.action]} {ACTION_NAMES[u.action]}</b>. The world moved to state <b>{u.next}</b>, reward <b>{fmt(u.reward)}</b>{u.terminated ? ', and the game was lost' : u.truncated ? ', and the 500 steps were up' : ''}.</p>
    <table className="cp-kv mono"><tbody>
      <tr><td>old Q[{u.state}, {u.action}]</td><td>{fmt(u.old, 4)}</td></tr>
      <tr><td>target</td><td>{u.terminated ? `r = ${fmt(u.reward)} (terminated: no future)` : `r + γ · ${algorithm === 'q' ? `max Q[${u.next}]` : `Q[${u.next}, ${u.nextAction}]`} = ${fmt(u.reward)} + ${fmt(gamma)} × ${fmt(next, 4)} = ${fmt(u.target, 4)}`}</td></tr>
      <tr><td>δ</td><td>{fmt(u.target, 4)} − {fmt(u.old, 4)} = <b>{fmt(u.tdError, 4)}</b></td></tr>
      <tr><td>new Q[{u.state}, {u.action}]</td><td>{fmt(u.old, 4)} + {fmt(alpha)} × {fmt(u.tdError, 4)} = <b>{fmt(u.updated, 4)}</b></td></tr>
    </tbody></table>
    {u.truncated && !u.terminated && <p className="qm-hint">Truncated, not terminated: the target still adds γ · (the next state's value), because the pole hadn't fallen; we only stopped watching.</p>}
  </div>
}

// Q-learning or SARSA on the binned CartPole, a move, a game or all of them at a time.
export function Trainer({ fixed = {}, show = ['algorithm', 'alpha', 'gamma', 'epsilon', 'episodes', 'seed', 'counts'] }) {
  const [settings, setSettings] = useState({ ...TABLE_DEFAULTS, ...fixed })
  const set = (k, v) => setSettings(o => ({ ...o, [k]: v }))
  const { algorithm, alpha, gamma, episodes, counts } = settings
  const run = useRef(null), [, redraw] = useReducer(x => x + 1, 0)
  const [playing, setPlaying] = useState(false)
  const key = JSON.stringify(settings)
  const fresh = () => {
    const env = new BinnedCartPole(counts)
    const gen = ALGORITHMS[algorithm].make(env, settings)
    return { key, env, gen, last: null, Q: Array.from({ length: env.nStates }, () => [settings.initialQ, settings.initialQ]), totals: [], done: false, moves: 0, cart: null, before: null }
  }
  if (!run.current || run.current.key !== key) run.current = fresh()
  useEffect(() => setPlaying(false), [key])
  const advance = until => {
    const r = run.current
    if (!r || r.done) return
    for (let i = 0; i < 5_000_000; i++) {
      const prevCart = r.env.world.state
      const step = r.gen.next()
      if (step.done) { r.done = true; r.totals = step.value.totals; break }
      const u = step.value
      r.last = u; r.Q = u.Q; r.moves++; r.before = prevCart; r.cart = r.env.world.state
      if (u.done) r.totals = [...u.totals, u.total]
      if (until === 'move' || (until === 'game' && u.done)) break
    }
    redraw()
  }
  useEffect(() => {
    if (!playing) return undefined
    const id = setInterval(() => { advance('move'); if (run.current?.done) setPlaying(false) }, 40)
    return () => clearInterval(id)
  }, [playing])
  const r = run.current
  const result = useMemo(() => r.done ? greedyGames(r.Q, counts) : null, [r.done, key])
  return <div className="qm-fig qm-trainer">
    <div className="qm-fig-controls">
      {show.includes('algorithm') && <label>Algorithm <select value={algorithm} onChange={e => set('algorithm', e.target.value)}>{Object.entries(ALGORITHMS).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}</select></label>}
      {show.includes('alpha') && <Slider label="α" value={alpha} min={0.01} max={1} step={0.01} onChange={v => set('alpha', v)} />}
      {show.includes('gamma') && <Slider label="γ" value={gamma} min={0.5} max={1} step={0.005} onChange={v => set('gamma', v)} />}
      {show.includes('epsilon') && <><Slider label="ε start" value={settings.epsilonStart} min={0} max={1} step={0.01} onChange={v => set('epsilonStart', v)} /><Slider label="ε end" value={settings.epsilonEnd} min={0} max={1} step={0.01} onChange={v => set('epsilonEnd', v)} /></>}
      {show.includes('episodes') && <label>Games <select value={episodes} onChange={e => set('episodes', Number(e.target.value))}>{[50, 100, 200, 500, 1000, 2000, 3000].map(n => <option key={n}>{n}</option>)}</select></label>}
      {show.includes('seed') && <label>Seed <input type="number" value={settings.seed} onChange={e => set('seed', Number(e.target.value) || 0)} style={{ width: 56 }} /></label>}
      {show.includes('counts') && <label>Slots (x, ẋ, θ, θ̇) <select value={counts.join(',')} onChange={e => set('counts', e.target.value.split(',').map(Number))}>{['1,1,6,12', '1,1,3,6', '1,1,12,24', '3,3,6,12'].map(c => <option key={c}>{c}</option>)}</select></label>}
    </div>
    <div className="qm-buttons qm-trainer-buttons">
      <button onClick={() => advance('move')} disabled={r.done}>One move</button>
      <button onClick={() => advance('game')} disabled={r.done}>One game</button>
      <button onClick={() => setPlaying(p => !p)} disabled={r.done}>{playing ? '⏸ Pause' : '▶ Play moves'}</button>
      <button className="qm-primary" onClick={() => advance('all')} disabled={r.done}>Train all {episodes} games</button>
      <button onClick={() => { run.current = fresh(); setPlaying(false); redraw() }}>↺ Start again</button>
      <span className="qm-hint">{r.totals.length} of {episodes} games · {r.moves.toLocaleString()} moves{r.last ? ` · ε now ${fmt(r.last.epsilon, 3)}` : ''}</span>
    </div>
    <div className="cp-row">
      <div>
        {r.cart && <Cart state={r.cart} ghost={r.before} action={r.last?.action} height={150} />}
        <QTableGrid Q={r.Q} counts={counts} here={r.last ? r.last.next : null} writing={r.last ? [r.last.state, r.last.action] : null} />
      </div>
      <div>
        <h4 className="qm-small-h">The last update</h4>
        <UpdateCard u={r.last} algorithm={algorithm} alpha={alpha} gamma={gamma} />
        <h4 className="qm-small-h">Game lengths while training</h4>
        <Plot series={[{ values: r.totals, color: '#b5650d' }]} x="game" label="game lengths" />
        {result && <GreedyResult games={result} />}
      </div>
    </div>
  </div>
}

// The trained table, judged: 20 new games with no exploring, why each ended, and one replayed.
export function GreedyResult({ games }) {
  const [k, setK] = useState(0), [t, setT] = useState(0), [playing, setPlaying] = useState(false)
  const game = games[k]
  useEffect(() => { setT(0) }, [k])
  useEffect(() => {
    if (!playing) return undefined
    const id = setInterval(() => setT(i => { if (i + 1 >= game.trail.length) { setPlaying(false); return i } return i + 1 }), 20)
    return () => clearInterval(id)
  }, [playing, game])
  const reasons = {}
  for (const g of games) reasons[g.why] = (reasons[g.why] ?? 0) + 1
  return <div className="qm-result">
    <p><b>Judged:</b> 20 new games, always the table's best push. Average length <b>{fmt(mean(games.map(g => g.length)), 1)}</b>. {Object.entries(reasons).map(([w, n]) => `${n} × ${w}`).join(', ')}.</p>
    <div className="qm-buttons"><label>Watch game <select value={k} onChange={e => setK(Number(e.target.value))}>{games.map((g, i) => <option key={i} value={i}>{i + 1}: {g.length} ({g.why})</option>)}</select></label><button onClick={() => setPlaying(p => !p)}>{playing ? '⏸' : '▶ Play'}</button></div>
    <Cart state={game.trail[t]} height={140} label={`step ${t}`} fallen={t === game.trail.length - 1 && game.why !== 'lasted 500'} />
  </div>
}

// Train with five seeds and judge each: how much luck is in one run.
export function SeedsFig({ counts = COUNTS }) {
  const [rows, setRows] = useState(null)
  const go = () => setRows(['q', 'sarsa'].map(algorithm => ({ algorithm, runs: [0, 1, 2, 3, 4].map(seed => { const { Q } = trainTable({ algorithm, seed, counts }); return greedyGames(Q, counts) }) })))
  return <div className="qm-fig">
    <div className="qm-buttons"><button className="qm-primary" onClick={go}>Train 5 seeds of each (500 games each)</button><span className="qm-hint">Slots {counts.join(', ')}. Takes a second or two.</span></div>
    {rows && <table className="qm-log"><thead><tr><th></th>{[0, 1, 2, 3, 4].map(s => <th key={s}>seed {s}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.algorithm}><th>{ALGORITHMS[row.algorithm].label}</th>{row.runs.map((games, i) => { const lost = games.filter(g => g.why !== 'lasted 500'); return <td key={i}><b>{fmt(mean(games.map(g => g.length)), 0)}</b>{lost.length ? <><br /><small>{lost.filter(g => g.why === 'cart off the track').length} cart, {lost.filter(g => g.why === 'pole fell').length} pole</small></> : null}</td> })}</tr>)}</tbody></table>}
    {rows && <p className="qm-hint">Average greedy game length over 20 new games, and how the lost games ended.</p>}
  </div>
}

// The learned table's preferred push in each row, against what "lean ahead" does at the row's centre.
export function TableVsRule() {
  const [seed, setSeed] = useState(0)
  const Q = useMemo(() => trainTable({ seed }).Q, [seed])
  const angleEdges = makeEdges(LIMITS[2], 6), spinEdges = makeEdges(LIMITS[3], 12)
  const centre = (edges, i, limit) => i === 0 ? edges[0] - (edges[1] - edges[0]) / 2 : i === edges.length ? edges.at(-1) + (edges[1] - edges[0]) / 2 : (edges[i - 1] + edges[i]) / 2
  let agree = 0, decided = 0
  const cells = []
  for (let i = 0; i < 6; i++) for (let j = 0; j < 12; j++) {
    const s = i * 12 + j, th = centre(angleEdges, i), sp = centre(spinEdges, j)
    const rule = th + 0.25 * sp > 0 ? 1 : 0
    const table = Q[s][0] === Q[s][1] ? null : Q[s][0] > Q[s][1] ? 0 : 1
    if (table !== null) { decided++; if (table === rule) agree++ }
    cells.push(<span key={s} className="cp-qcell best" title={`θ ≈ ${fmt(th, 3)}, θ̇ ≈ ${fmt(sp, 2)}`} style={{ background: table === null ? '#f8f3ea' : table === rule ? '#dcefe4' : '#f6d5c8' }}>{table === null ? '·' : ARROWS[table]}</span>)
  }
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Seed <input type="number" value={seed} onChange={e => setSeed(Number(e.target.value) || 0)} style={{ width: 56 }} /></label></div>
    <div className="cp-qgrid" style={{ gridTemplateColumns: 'auto repeat(12, 1fr)' }}>
      <span className="cp-qcorner">θ ↓ θ̇ →</span>{Array.from({ length: 12 }, (_, j) => <span key={j} className="cp-qhead">{j}</span>)}
      {Array.from({ length: 6 }, (_, i) => [<span key={`h${i}`} className="cp-qhead">{i}</span>, ...cells.slice(i * 12, i * 12 + 12)])}
    </div>
    <p>The table, trained for 500 games, has a preference in <b>{decided}</b> of 72 rows. In <b>{agree}</b> of them it pushes the way "lean ahead" would at the middle of the row (green); red where it disagrees; · where it never learned a difference (rows it rarely visited).</p>
  </div>
}

export { toSlots }
