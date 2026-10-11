import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import GridMap from '../GridMap.jsx'
import Markdown from '../Markdown.jsx'
import Curve from './Curve.jsx'
import { GridWorld, ARROWS, ACTION_NAMES } from '../engine/gridworld.js'
import { qLearning, sarsa, zeros } from '../engine/tabular.js'
import { greedyProbs } from '../engine/policies.js'
import { evaluateGreedy, compareWithOptimal } from '../engine/evaluate.js'
import { num, MapPicker, Slider } from './ui.jsx'

// Q-learning or SARSA on a map, one move, one episode or all of them at a time: the same
// generators as engine/tabular.js, so a seeded run here is the Python program's run, number for
// number. Shows the latest update written out with its numbers, the table on the map, and the
// learning curve.
//   fixed: settings the lesson decides (not shown as controls); show: which controls appear
const ALGORITHMS = { q: { label: 'Q-learning', make: qLearning }, sarsa: { label: 'SARSA', make: sarsa } }
const DEFAULTS = { map: 'cheese_and_cat', algorithm: 'q', episodes: 300, alpha: 0.5, gamma: 0.95, epsilonStart: 1, epsilonEnd: 0.05, initialQ: 0, seed: 0 }

function UpdateCard({ u, algorithm, alpha, gamma }) {
  if (!u) return <p className="qm-hint">No moves yet. Press <b>One move</b> to see the first update written out.</p>
  const name = algorithm === 'q' ? 'Q-learning' : 'SARSA'
  const future = u.terminated ? 'terminated, so no future: target = r' : algorithm === 'q' ? `γ · max Q[${u.next}] = ${num(gamma)} × ${num(u.nextBest)}` : `γ · Q[${u.next}, ${u.nextAction}] = ${num(gamma)} × ${num(u.nextQ)}`
  return <div className="qm-update">
    <p className="mono qm-small">episode {u.episode + 1}, step {u.t} · ε = {num(u.epsilon)}</p>
    <p>In state <b>{u.state}</b> the agent {u.explored ? <>explored: a random move</> : <>exploited: its best move</>}, <b>{ARROWS[u.action]} {ACTION_NAMES[u.action]}</b>{u.slipped ? ', but slipped' : ''}. It landed in <b>{u.next}</b> and got reward <b>{num(u.reward)}</b>.</p>
    <table className="qm-kv mono"><tbody>
      <tr><td>old Q[{u.state}, {u.action}]</td><td>{num(u.old)}</td></tr>
      <tr><td>future</td><td>{future}</td></tr>
      <tr><td>target</td><td>{u.terminated ? num(u.reward) : `${num(u.reward)} + ${num(gamma * (algorithm === 'q' ? u.nextBest : u.nextQ))} = ${num(u.target)}`}</td></tr>
      <tr><td>TD error δ</td><td>target − old = {num(u.target)} − {num(u.old)} = <b>{num(u.tdError)}</b></td></tr>
      <tr><td>new Q[{u.state}, {u.action}]</td><td>old + α·δ = {num(u.old)} + {num(alpha)} × {num(u.tdError)} = <b>{num(u.updated)}</b></td></tr>
    </tbody></table>
    {algorithm === 'sarsa' && !u.terminated && <p className="qm-hint">SARSA chose its next move, {ARROWS[u.nextAction]}, before updating, and used that move's value. {name} will now take it.</p>}
  </div>
}

export default function Trainer({ fixed = {}, show = ['map', 'algorithm', 'alpha', 'gamma', 'epsilon', 'episodes', 'initialQ', 'seed'], maps, view: view0 = 'q', compare = true, note }) {
  const [settings, setSettings] = useState({ ...DEFAULTS, ...fixed })
  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }))
  const { map, algorithm, alpha, gamma, episodes } = settings
  const env = useMemo(() => new GridWorld(map), [map])
  const run = useRef(null), [, redraw] = useReducer(x => x + 1, 0)
  const [view, setView] = useState(view0)
  const [playing, setPlaying] = useState(false)
  // A new run whenever a setting changes, made during render so the map never shows a table that
  // belongs to the previous map (a different number of states).
  const key = JSON.stringify(settings)
  const fresh = () => {
    const e = new GridWorld(map)
    const gen = ALGORITHMS[algorithm].make(e, { episodes, alpha, gamma, epsilonStart: settings.epsilonStart, epsilonEnd: settings.epsilonEnd, initialQ: settings.initialQ, seed: settings.seed })
    return { key, gen, last: null, trail: [e.start], Q: zeros(e.nStates, 4, settings.initialQ), totals: [], done: false, moves: 0 }
  }
  if (!run.current || run.current.key !== key) run.current = fresh()
  const start = () => { run.current = fresh(); setPlaying(false); redraw() }
  useEffect(() => setPlaying(false), [key])
  const advance = (until) => {
    const r = run.current
    if (!r || r.done) return
    for (let i = 0; i < 2_000_000; i++) {
      const step = r.gen.next()
      if (step.done) { r.done = true; r.totals = step.value.totals; break }
      const u = step.value
      if (r.last?.done) r.trail = [u.state]
      r.last = u; r.Q = u.Q; r.moves++
      r.trail.push(u.next)
      if (u.done) r.totals = [...u.totals, u.total]
      if (until === 'move' || (until === 'episode' && u.done)) break
    }
    redraw()
  }
  useEffect(() => {
    if (!playing) return undefined
    const id = setInterval(() => { advance('move'); if (run.current?.done) setPlaying(false) }, 90)
    return () => clearInterval(id)
  }, [playing])
  const r = run.current
  const finished = !!r?.done
  const result = useMemo(() => finished && compare ? { greedy: evaluateGreedy(map, r.Q), optimal: compareWithOptimal(map, r.Q, gamma) } : null, [finished, r, compare])
  const optimalGreedy = useMemo(() => compare ? evaluateGreedy(map, compareWithOptimal(map, zeros(env.nStates, 4), gamma).Qstar) : null, [map, gamma, compare])
  if (!r) return null
  const values = r.Q.map(row => Math.max(...row))
  const overlay = view === 'q' ? { q: r.Q } : view === 'v' ? { values } : view === 'policy' ? { values, probs: greedyProbs(r.Q) } : {}
  const big = env.nCols > 8
  return <div className="qm-fig qm-trainer">
    <div className="qm-fig-controls">
      {show.includes('map') && <MapPicker value={map} onChange={v => set('map', v)} maps={maps} />}
      {show.includes('algorithm') && <label>Algorithm <select value={algorithm} onChange={e => set('algorithm', e.target.value)}>{Object.entries(ALGORITHMS).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}</select></label>}
      {show.includes('alpha') && <Slider label="α" value={alpha} min={0.01} max={1} step={0.01} onChange={v => set('alpha', v)} />}
      {show.includes('gamma') && <Slider label="γ" value={gamma} min={0} max={1} step={0.01} onChange={v => set('gamma', v)} />}
      {show.includes('epsilon') && <><Slider label="ε start" value={settings.epsilonStart} min={0} max={1} step={0.01} onChange={v => set('epsilonStart', v)} /><Slider label="ε end" value={settings.epsilonEnd} min={0} max={1} step={0.01} onChange={v => set('epsilonEnd', v)} /></>}
      {show.includes('episodes') && <label>Episodes <select value={episodes} onChange={e => set('episodes', Number(e.target.value))}>{[50, 100, 300, 500, 1000, 3000, 10000].map(n => <option key={n}>{n}</option>)}</select></label>}
      {show.includes('initialQ') && <label>Initial Q <select value={settings.initialQ} onChange={e => set('initialQ', Number(e.target.value))}>{[0, 1].map(n => <option key={n}>{n}</option>)}</select></label>}
      {show.includes('seed') && <label>Seed <input type="number" value={settings.seed} onChange={e => set('seed', Number(e.target.value) || 0)} style={{ width: 60 }} /></label>}
    </div>
    <div className="qm-buttons qm-trainer-buttons">
      <button onClick={() => advance('move')} disabled={finished}>One move</button>
      <button onClick={() => advance('episode')} disabled={finished}>One episode</button>
      <button onClick={() => setPlaying(p => !p)} disabled={finished}>{playing ? '⏸ Pause' : '▶ Play moves'}</button>
      <button className="qm-primary" onClick={() => advance('all')} disabled={finished}>Train all {episodes} episodes</button>
      <button onClick={start}>↺ Start again</button>
      <span className="qm-hint">{r.totals.length} of {episodes} episodes · {r.moves.toLocaleString()} moves{r.last ? ` · ε now ${num(r.last.epsilon)}` : ''}</span>
    </div>
    <div className="qm-fig-row">
      <div>
        <div className="qm-buttons qm-small">Show {[['q', 'Q-table'], ['v', 'max Q (value)'], ['policy', 'greedy policy'], ['none', 'map only']].map(([k, l]) => <button key={k} className={view === k ? 'active' : ''} onClick={() => setView(k)}>{l}</button>)}</div>
        <GridMap env={env} {...overlay} agent={r.last?.next ?? env.start} trail={r.trail.length < 300 ? r.trail : undefined} highlight={r.last ? [r.last.state] : []} size={big ? 40 : env.nCols > 6 ? 62 : 86} showNumbers={!big} />
      </div>
      <div className="qm-fig-side">
        <h4 className="qm-small-h">The last update</h4>
        <UpdateCard u={r.last} algorithm={algorithm} alpha={alpha} gamma={gamma} />
        <h4 className="qm-small-h">Learning curve</h4>
        <Curve series={[{ values: r.totals, color: '#b5650d' }]} refs={optimalGreedy ? [{ value: optimalGreedy.mean, label: 'best possible (greedy optimal policy)' }] : []} />
        {result && <div className="qm-result">
          <p><b>Trained.</b> Played greedily (no exploring) for 100 episodes, the learned table averages a return of <b>{num(result.greedy.mean)}</b>; the optimal policy averages <b>{num(optimalGreedy.mean)}</b>. Endings: {Object.entries(result.greedy.ends).map(([k, v]) => `${v} × ${k === 'time limit' ? 'time limit' : k}`).join(', ')}.</p>
          <p>Its best move is an optimal move in <b>{result.optimal.agree} of {result.optimal.of}</b> states; its largest difference from Q* is {num(result.optimal.maxDiff)}.</p>
        </div>}
        {note && <div className="qm-hint"><Markdown>{note}</Markdown></div>}
      </div>
    </div>
  </div>
}
