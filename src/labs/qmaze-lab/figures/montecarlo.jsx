import { useMemo, useReducer, useRef, useState } from 'react'
import GridMap from '../GridMap.jsx'
import Curve from './Curve.jsx'
import { GridWorld, ARROWS } from '../engine/gridworld.js'
import { PyRandom } from '../engine/mt.js'
import { mcEvaluate, mcControl, playEpisode } from '../engine/montecarlo.js'
import { td0Evaluate } from '../engine/td.js'
import { finish, zeros } from '../engine/tabular.js'
import { evaluatePolicy } from '../engine/planning.js'
import { uniformPolicy, greedyProbs } from '../engine/policies.js'
import { evaluateGreedy, compareWithOptimal, choiceStates } from '../engine/evaluate.js'
import { num, MapPicker, Slider } from './ui.jsx'

// The backward pass of one episode, newest move first, as the code computes it.
function BackwardTable({ rows, label, firstVisit = true, limit = 14 }) {
  const shown = rows.slice(0, limit)
  return <div className="qm-scroll" style={{ maxHeight: 300 }}>
    <table className="qm-log mono"><thead><tr><th>t</th><th>{label}</th><th>r</th><th>G = r + γG</th><th>update</th></tr></thead>
      <tbody>{shown.map(row => <tr key={row.t} className={firstVisit && !row.first ? 'qm-row-dim' : ''}>
        <td>{row.t}</td><td>{label === 's' ? row.s : `${row.s}, ${ARROWS[row.a]}`}</td><td>{num(row.r)}</td><td>{num(row.G)}</td>
        <td>{row.updated === undefined ? 'skipped: not the first visit' : <>{num(row.old)} + {row.step === 1 / Math.round(1 / row.step) ? `1/${Math.round(1 / row.step)}` : num(row.step)}·({num(row.G)} − {num(row.old)}) = <b>{num(row.updated)}</b></>}</td>
      </tr>)}</tbody></table>
    {rows.length > limit && <p className="qm-hint">… and {rows.length - limit} earlier moves (the backward pass ends at t = 0).</p>}
  </div>
}

const exactRandom = env => evaluatePolicy(env.P, uniformPolicy(env.nStates), 0.95).V

// 3.2: Monte Carlo prediction, one whole episode at a time, beside the exact values.
export function MCEvaluation({ map: map0 = 'cheese_and_cat' }) {
  const [map, setMap] = useState(map0), [firstVisit, setFirstVisit] = useState(true), [rate, setRate] = useState('1/n')
  const env = useMemo(() => new GridWorld(map), [map])
  const exact = useMemo(() => exactRandom(env), [env])
  const key = `${map}|${firstVisit}|${rate}`
  const run = useRef(null), [, redraw] = useReducer(x => x + 1, 0)
  if (!run.current || run.current.key !== key) run.current = { key, gen: mcEvaluate(new GridWorld(map), { episodes: 1e6, firstVisit, alpha: rate === '1/n' ? null : Number(rate) }), V: new Array(env.nStates).fill(0), last: null, episodes: 0 }
  const advance = n => {
    const r = run.current
    for (let i = 0; i < n; i++) { const s = r.gen.next(); r.V = s.value.V; r.last = s.value; r.episodes++ }
    redraw()
  }
  const r = run.current, u = r.last
  const states = choiceStates(env)
  const rms = Math.sqrt(states.reduce((sum, s) => sum + (r.V[s] - exact[s]) ** 2, 0) / states.length)
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <MapPicker value={map} onChange={setMap} maps={['corridor', 'cheese_and_cat', 'frozen_lake']} />
      <label><input type="checkbox" checked={firstVisit} onChange={e => setFirstVisit(e.target.checked)} /> first visit only</label>
      <label>Step <select value={rate} onChange={e => setRate(e.target.value)}>{['1/n', '0.1', '0.02'].map(k => <option key={k}>{k}</option>)}</select></label>
      <span className="qm-buttons"><button onClick={() => advance(1)}>One episode</button><button onClick={() => advance(10)}>10 episodes</button><button onClick={() => advance(100)}>100</button><button onClick={() => advance(1000)}>1,000</button></span>
      <span className="qm-hint">{r.episodes} episodes</span>
    </div>
    <div className="qm-fig-row">
      <div><p className="qm-small">Monte Carlo estimate</p><GridMap env={env} values={r.V} trail={u && u.episode.length < 200 ? u.episode.map(([s]) => s) : undefined} size={env.nCols > 4 ? 46 : 52} /></div>
      <div><p className="qm-small">Exact V for the random policy (lesson 2.4)</p><GridMap env={env} values={exact} size={env.nCols > 4 ? 46 : 52} /></div>
      <div className="qm-fig-side">
        {u ? <><p className="qm-small">Episode {u.e + 1}: {u.episode.length} moves, ending with reward {num(u.episode.at(-1)[2])}. The backward pass, from the last move to the first:</p><BackwardTable rows={u.rows} label="s" firstVisit={firstVisit} /></> : <p className="qm-hint">Press One episode. Nothing is learned until the episode is over.</p>}
        <p className="qm-small">Root-mean-square difference from the exact values: <b>{num(rms)}</b>.</p>
      </div>
    </div>
  </div>
}

// A small histogram of samples, with the true mean marked.
function Histogram({ values, lo, hi, bins = 30, color, mean, width = 420, height = 110 }) {
  const counts = new Array(bins).fill(0)
  for (const v of values) counts[Math.min(bins - 1, Math.max(0, Math.floor((v - lo) / (hi - lo) * bins)))]++
  const top = Math.max(...counts), X = v => 10 + (v - lo) / (hi - lo) * (width - 20)
  return <svg viewBox={`0 0 ${width} ${height + 18}`} className="qm-plot">
    {counts.map((c, i) => <rect key={i} x={X(lo + i * (hi - lo) / bins)} width={(width - 20) / bins - 1} y={height - c / top * (height - 6)} height={c / top * (height - 6)} fill={color} opacity={0.8} />)}
    <line x1={X(mean)} x2={X(mean)} y1={0} y2={height} stroke="#7a3fb0" strokeDasharray="4 3" />
    <text x={10} y={height + 14} className="qm-tick">{num(lo)}</text><text x={width - 10} y={height + 14} className="qm-tick" textAnchor="end">{num(hi)}</text>
    <text x={X(mean) + 4} y={10} className="qm-tick" fill="#7a3fb0">true V = {num(mean)}</text>
  </svg>
}

const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length
const spread = xs => { const m = mean(xs); return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length) }

// 3.4, first half: what each method averages, sampled 2,000 times from the start.
export function SampleSpread({ map: map0 = 'cheese_and_cat' }) {
  const [map, setMap] = useState(map0)
  const env = useMemo(() => new GridWorld(map), [map])
  const exact = useMemo(() => exactRandom(env), [env])
  const { G, T } = useMemo(() => {
    const rng = new PyRandom(1), e = new GridWorld(map), G = [], T = []
    for (let i = 0; i < 2000; i++) {
      const { episode } = playEpisode(e, () => rng.randrange(4), i === 0 ? 1 : null)
      let g = 0
      for (let t = episode.length - 1; t >= 0; t--) g = episode[t][2] + 0.95 * g
      G.push(g)
      e.reset()
      const [next, r, terminated] = e.step(rng.randrange(4))
      T.push(terminated ? r : r + 0.95 * exact[next])
    }
    return { G, T }
  }, [map, exact])
  const lo = Math.min(...G, ...T), hi = Math.max(...G, ...T), v = exact[env.start]
  return <div className="qm-fig">
    <div className="qm-fig-controls"><MapPicker value={map} onChange={setMap} maps={['corridor', 'cheese_and_cat', 'frozen_lake']} /><span className="qm-hint">2,000 samples of each, all from the start, random policy</span></div>
    <div className="qm-fig-row">
      <div style={{ flex: 1, minWidth: 300 }}>
        <p className="qm-small" style={{ color: '#b5650d' }}><b>Monte Carlo's sample</b>, the whole return G: average {num(mean(G))}, spread (standard deviation) <b>{num(spread(G))}</b></p>
        <Histogram values={G} lo={lo} hi={hi} color="#b5650d" mean={v} />
        <p className="qm-small" style={{ color: '#2f7d6b' }}><b>TD's sample</b>, r + γ·V(s′) with the exact V: average {num(mean(T))}, spread <b>{num(spread(T))}</b></p>
        <Histogram values={T} lo={lo} hi={hi} color="#2f7d6b" mean={v} />
      </div>
      <div className="qm-fig-side">
        <p className="qm-small">Both averages land on the true value {num(v)}: both are honest samples of it. But G carries the luck of every move to the end of the episode, while TD's sample carries the luck of <b>one</b> move. Here its spread is {num(spread(G) / spread(T))} times smaller.</p>
        <p className="qm-small">The catch: this used the <b>exact</b> V(s′). A learning TD agent only has its own estimate, which starts at 0 and is wrong for a while. That error is TD's <b>bias</b>.</p>
      </div>
    </div>
  </div>
}

// 3.4, second half: estimation error against episodes, averaged over seeds, for both methods.
const METHODS = [
  { key: 'mc', label: 'Monte Carlo, step 1/n', color: '#b5650d', run: (map, n, seed) => mcEvaluate(new GridWorld(map), { episodes: n, seed }) },
  { key: 'mca', label: 'Monte Carlo, step α', color: '#e0a35a', run: (map, n, seed, alpha) => mcEvaluate(new GridWorld(map), { episodes: n, seed, alpha }) },
  { key: 'td', label: 'TD(0), step α', color: '#2f7d6b', run: (map, n, seed, alpha) => td0Evaluate(new GridWorld(map), { episodes: n, seed, alpha }) },
]
export function MCvsTD({ map: map0 = 'cheese_and_cat' }) {
  const [map, setMap] = useState(map0), [alpha, setAlpha] = useState(0.05), [episodes, setEpisodes] = useState(300)
  const [curves, setCurves] = useState(null)
  const env = useMemo(() => new GridWorld(map), [map])
  const exact = useMemo(() => exactRandom(env), [env])
  const runAll = () => {
    const states = choiceStates(env), seeds = 10
    const err = V => Math.sqrt(states.reduce((sum, s) => sum + (V[s] - exact[s]) ** 2, 0) / states.length)
    setCurves({ map, alpha, episodes, series: METHODS.map(m => {
      const total = new Array(episodes).fill(0)
      for (let seed = 0; seed < seeds; seed++) {
        const gen = m.run(map, episodes, seed, alpha)
        let e = 0
        for (let s = gen.next(); !s.done; s = gen.next()) {
          if (m.key === 'td' && !s.value.done) continue
          total[e++] += err(s.value.V) / seeds
        }
      }
      return { ...m, values: total }
    }) })
  }
  const stale = curves && (curves.map !== map || curves.alpha !== alpha || curves.episodes !== episodes)
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <MapPicker value={map} onChange={setMap} maps={['corridor', 'cheese_and_cat', 'frozen_lake']} />
      <Slider label="α" value={alpha} min={0.01} max={0.3} step={0.01} onChange={setAlpha} />
      <label>Episodes <select value={episodes} onChange={e => setEpisodes(Number(e.target.value))}>{[100, 300, 1000].map(n => <option key={n}>{n}</option>)}</select></label>
      <button className="qm-primary" onClick={runAll}>Run all three, 10 seeds each</button>
    </div>
    {curves ? <div className="qm-fig-row">
      <div style={{ flex: 1, minWidth: 300, opacity: stale ? 0.5 : 1 }}>
        <Curve series={curves.series} window={1} label="error after each episode" />
        <p className="qm-hint">Root-mean-square difference from the exact values after each episode, averaged over seeds 0–9.{stale ? ' Settings changed: run again.' : ''}</p>
      </div>
      <div className="qm-fig-side"><ul className="qm-legend">{curves.series.map(s => <li key={s.key} style={{ color: s.color }}><b>{s.label}</b>: after 10 episodes {num(s.values[9])}, after {curves.episodes}: {num(s.values.at(-1))}</li>)}</ul></div>
    </div> : <p className="qm-hint">Press Run. Each method learns the random policy's values from scratch ten times, and the curves are their average error.</p>}
  </div>
}

// 3.7: Monte Carlo control, one whole episode at a time.
export function MCControlTrainer({ map: map0 = 'cheese_and_cat', episodes: n0 = 300 }) {
  const [map, setMap] = useState(map0), [episodes, setEpisodes] = useState(n0), [seed, setSeed] = useState(0), [rate, setRate] = useState('1/n')
  const cliff = map === 'cliff'
  const opts = { episodes, seed, alpha: rate === '1/n' ? null : Number(rate), ...(cliff ? { gamma: 1, epsilonStart: 0.1, epsilonEnd: 0.1 } : map === 'frozen_lake' ? { gamma: 0.99 } : {}) }
  const env = useMemo(() => new GridWorld(map), [map])
  const key = JSON.stringify([map, opts])
  const run = useRef(null), [, redraw] = useReducer(x => x + 1, 0)
  if (!run.current || run.current.key !== key) run.current = { key, gen: mcControl(new GridWorld(map), opts), Q: zeros(env.nStates, 4), totals: [], last: null, done: false }
  const advance = n => {
    const r = run.current
    for (let i = 0; i < n && !r.done; i++) {
      const s = r.gen.next()
      if (s.done) { r.done = true; break }
      r.Q = s.value.Q; r.totals = s.value.totals; r.last = s.value
      if (r.totals.length === episodes) r.done = true
    }
    r.totals = [...r.totals]
    redraw()
  }
  const r = run.current, u = r.last
  const result = useMemo(() => r.done ? { greedy: evaluateGreedy(map, r.Q), optimal: compareWithOptimal(map, r.Q, opts.gamma ?? 0.95) } : null, [r.done, r])
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <MapPicker value={map} onChange={setMap} maps={['corridor', 'cheese_and_cat', 'cats_and_cheese', 'cliff', 'frozen_lake']} />
      <label>Episodes <select value={episodes} onChange={e => setEpisodes(Number(e.target.value))}>{[300, 500, 2000, 5000].map(n => <option key={n}>{n}</option>)}</select></label>
      <label>Step <select value={rate} onChange={e => setRate(e.target.value)}>{['1/n', '0.1', '0.5'].map(k => <option key={k}>{k}</option>)}</select></label>
      <label>Seed <input type="number" value={seed} onChange={e => setSeed(Number(e.target.value) || 0)} style={{ width: 60 }} /></label>
      {cliff && <span className="qm-hint">cliff: γ = 1, ε = 0.1 throughout, as in lesson 3.11</span>}
    </div>
    <div className="qm-buttons qm-trainer-buttons">
      <button onClick={() => advance(1)} disabled={r.done}>One episode</button>
      <button onClick={() => advance(50)} disabled={r.done}>50 episodes</button>
      <button className="qm-primary" onClick={() => advance(episodes)} disabled={r.done}>Train all {episodes}</button>
      <span className="qm-hint">{r.totals.length} of {episodes} episodes{u ? ` · ε now ${num(u.epsilon)}` : ''}</span>
    </div>
    <div className="qm-fig-row">
      <div><GridMap env={env} q={env.nCols > 8 ? undefined : r.Q} probs={env.nCols > 8 ? greedyProbs(r.Q) : undefined} trail={u && u.episode.length < 300 ? [...u.episode.map(([s]) => s)] : undefined} size={env.nCols > 8 ? 34 : env.nCols > 6 ? 62 : 80} showNumbers={env.nCols <= 8} /></div>
      <div className="qm-fig-side">
        {u ? <><p className="qm-small">Episode {u.e + 1}: {u.episode.length} moves, {u.terminated ? 'ended' : <b>stopped by the time limit</b>}, return {num(u.totals.at(-1))}. The backward pass:</p><BackwardTable rows={u.rows} label="s, a" limit={10} /></> : <p className="qm-hint">Press One episode: the agent plays a whole game ε-greedily, then the table changes, all at once.</p>}
        <h4 className="qm-small-h">Learning curve</h4>
        <Curve series={[{ values: r.totals, color: '#b5650d' }]} />
        {result && <div className="qm-result"><p><b>Trained.</b> Played greedily for 100 episodes, the table averages <b>{num(result.greedy.mean)}</b>. Endings: {Object.entries(result.greedy.ends).map(([k, v]) => `${v} × ${k}`).join(', ')}. Its best move is an optimal move in <b>{result.optimal.agree} of {result.optimal.of}</b> states.</p></div>}
      </div>
    </div>
  </div>
}
