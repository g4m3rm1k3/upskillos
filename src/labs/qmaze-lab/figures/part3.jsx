import { useMemo, useReducer, useRef, useState } from 'react'
import GridMap from '../GridMap.jsx'
import Curve from './Curve.jsx'
import { GridWorld, ACTION_NAMES, ARROWS } from '../engine/gridworld.js'
import { PyRandom } from '../engine/mt.js'
import { runningMean, constantStep, td0Evaluate } from '../engine/td.js'
import { evaluatePolicy, valueIteration } from '../engine/planning.js'
import { uniformPolicy, greedyProbs } from '../engine/policies.js'
import { qLearning, sarsa, finish, linear, zeros } from '../engine/tabular.js'
import { evaluateGreedy } from '../engine/evaluate.js'
import { num, MapPicker, Slider } from './ui.jsx'

// 3.1: estimating an average from samples: the running mean and constant steps of size α.
// The samples are rewards of one slippery move (frozen lake, state 14, RIGHT): 1 with probability 1/3.
export function RunningAverage({ n: n0 = 60 }) {
  const [n, setN] = useState(n0), [alpha, setAlpha] = useState(0.1), [seed, setSeed] = useState(3)
  const samples = useMemo(() => { const rng = new PyRandom(seed); return Array.from({ length: 2000 }, () => rng.random() < 1 / 3 ? 1 : 0) }, [seed])
  const shown = samples.slice(0, n)
  const mean = runningMean(shown), step = constantStep(shown, alpha)
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label>Samples <select value={n} onChange={e => setN(Number(e.target.value))}>{[10, 60, 300, 2000].map(k => <option key={k}>{k}</option>)}</select></label>
      <Slider label="α" value={alpha} min={0.01} max={1} step={0.01} onChange={setAlpha} />
      <button onClick={() => setSeed(s => s + 1)}>New random samples</button>
    </div>
    <div className="qm-fig-row">
      <div style={{ flex: 1, minWidth: 300 }}>
        <Curve series={[{ values: mean, color: '#2f7d6b' }, { values: step, color: '#b5650d' }]} window={1} refs={[{ value: 1 / 3, label: 'true average 1/3' }]} label="estimates" />
      </div>
      <div className="qm-fig-side">
        <ul className="qm-legend"><li style={{ color: '#2f7d6b' }}><b>running mean</b> (step 1/n): {num(mean.at(-1))}</li><li style={{ color: '#b5650d' }}><b>constant step α = {alpha}</b>: {num(step.at(-1))}</li></ul>
        <p className="qm-small">First samples: {shown.slice(0, 12).join(', ')}{n > 12 ? ', …' : ''}</p>
        <p className="qm-small">The running mean settles down and stays; the constant step keeps reacting to every new sample, more the larger α is. α = 1 just copies the last sample.</p>
      </div>
    </div>
  </div>
}

// 3.3: TD(0) learning the random policy's values from experience, beside the exact values.
export function TDEvaluation({ map = 'cheese_and_cat' }) {
  const env = useMemo(() => new GridWorld(map), [map])
  const exact = useMemo(() => evaluatePolicy(env.P, uniformPolicy(env.nStates), 0.95).V, [env])
  const [alpha, setAlpha] = useState(0.1)
  const run = useRef(null), [, redraw] = useReducer(x => x + 1, 0)
  if (!run.current || run.current.alpha !== alpha) run.current = { alpha, gen: td0Evaluate(new GridWorld(map), { episodes: 100000, alpha }), V: new Array(env.nStates).fill(0), last: null, episodes: 0 }
  const advance = until => {
    const r = run.current, goal = typeof until === 'number' ? r.episodes + until : null
    for (let i = 0; i < 5_000_000; i++) {
      const s = r.gen.next(); if (s.done) break
      r.V = s.value.V; r.last = s.value
      if (s.value.done) r.episodes++
      if (until === 'move' || (s.value.done && (until === 'episode' || r.episodes === goal))) break
    }
    redraw()
  }
  const r = run.current, u = r.last
  const worst = Math.max(...exact.map((v, s) => env.isWall(s) || env.isEnd(s) ? 0 : Math.abs(r.V[s] - v)))
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <Slider label="α" value={alpha} min={0.01} max={0.5} step={0.01} onChange={setAlpha} />
      <span className="qm-buttons"><button onClick={() => advance('move')}>One move</button><button onClick={() => advance('episode')}>One episode</button><button onClick={() => advance(100)}>100 episodes</button><button onClick={() => advance(1000)}>1,000 episodes</button></span>
      <span className="qm-hint">{r.episodes} episodes</span>
    </div>
    <div className="qm-fig-row">
      <div><p className="qm-small">TD(0) estimate, from experience</p><GridMap env={env} values={r.V} agent={u?.next} highlight={u ? [u.state] : []} size={52} /></div>
      <div><p className="qm-small">Exact V for the random policy (lesson 2.4)</p><GridMap env={env} values={exact} size={52} /></div>
      <div className="qm-fig-side">
        {u ? <table className="qm-kv mono"><tbody>
          <tr><td>move</td><td>{u.state} → {u.next}, reward {num(u.reward)}</td></tr>
          <tr><td>target</td><td>{u.terminated ? `r = ${num(u.reward)} (ended)` : `r + γ·V[${u.next}] = ${num(u.target)}`}</td></tr>
          <tr><td>V[{u.state}]</td><td>{num(u.old)} + {alpha}·({num(u.target)} − {num(u.old)}) = <b>{num(u.updated)}</b></td></tr>
        </tbody></table> : <p className="qm-hint">Press One move.</p>}
        <p className="qm-small">Largest difference from the exact values: <b>{num(worst)}</b>. It shrinks as episodes pile up, but with a constant α it never reaches 0: each estimate keeps jiggling with the latest samples.</p>
      </div>
    </div>
  </div>
}

// 3.5: the Q-table as what it is in Python, an array of n_states rows and 4 columns, beside the map.
export function QTableView({ map = 'cheese_and_cat', train = 60 }) {
  const env = useMemo(() => new GridWorld(map), [map])
  const Q = useMemo(() => train ? finish(qLearning(new GridWorld(map), { episodes: train, seed: 0 })).Q : zeros(env.nStates, 4), [map, train])
  const [s, setS] = useState(env.start)
  return <div className="qm-fig">
    <div className="qm-fig-row">
      <GridMap env={env} q={Q} highlight={[s]} onCell={x => !env.isWall(x) && setS(x)} labels="state" size={78} />
      <div className="qm-fig-side qm-scroll">
        <p className="qm-hint">The same numbers twice: on the map (four triangles per cell) and as the array <span className="mono">Q</span>, shape ({env.nStates}, 4). Click a cell; its row is highlighted.</p>
        <table className="qm-log qm-qtable"><thead><tr><th>Q[s]</th>{ACTION_NAMES.map((n, a) => <th key={a}>[:, {a}] {ARROWS[a]}</th>)}</tr></thead>
          <tbody>{Q.map((row, i) => <tr key={i} className={i === s ? 'qm-row-pick' : env.isWall(i) || env.isEnd(i) ? 'qm-row-dim' : ''} onClick={() => setS(i)}><td>{i}{env.isWall(i) ? ' wall' : env.isEnd(i) ? ' end' : ''}</td>{row.map((q, a) => <td key={a} className={q === Math.max(...row) && !env.isWall(i) && !env.isEnd(i) ? 'qm-best' : ''}>{num(q)}</td>)}</tr>)}</tbody></table>
        <p className="mono qm-small">Q[{s}] = [{Q[s].map(num).join(', ')}] · Q[{s}].max() = {num(Math.max(...Q[s]))} · best: {Q[s].map((q, a) => q === Math.max(...Q[s]) ? ARROWS[a] : null).filter(Boolean).join(' or ')}</p>
      </div>
    </div>
  </div>
}

// 3.6: ε over the episodes, and how often a random move is taken.
export function EpsilonSchedule({ episodes = 300 }) {
  const [start, setStart] = useState(1), [end, setEnd] = useState(0.05)
  const values = Array.from({ length: episodes }, (_, e) => linear(start, end, e / (0.8 * episodes)))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="epsilon_start" value={start} min={0} max={1} step={0.01} onChange={setStart} /><Slider label="epsilon_end" value={end} min={0} max={1} step={0.01} onChange={setEnd} /></div>
    <Curve series={[{ values, color: '#7a3fb0' }]} window={1} height={150} label="epsilon per episode" />
    <p className="qm-small">Episode 0: ε = {num(values[0])}. Episode {Math.round(0.4 * episodes)}: ε = {num(values[Math.round(0.4 * episodes)])}. From episode {Math.round(0.8 * episodes)} on: ε = {num(end)}.</p>
  </div>
}

// 3.11: Q-learning and SARSA trained side by side on the cliff, same settings and seed.
export function CliffCompare({ seed: s0 = 0 }) {
  const [seed, setSeed] = useState(s0)
  const env = useMemo(() => new GridWorld('cliff'), [])
  const opts = { episodes: 500, alpha: 0.5, gamma: 1.0, epsilonStart: 0.1, epsilonEnd: 0.1, seed }
  const runs = useMemo(() => [['Q-learning', qLearning, '#b5650d'], ['SARSA', sarsa, '#2f7d6b']].map(([name, make, color]) => {
    const { Q, totals } = finish(make(new GridWorld('cliff'), opts))
    const path = [env.start]
    let s = env.start
    for (let t = 0; t < 40 && !env.isEnd(s); t++) { const best = Math.max(...Q[s]); s = env.P[s][Q[s].indexOf(best)][0][1]; path.push(s) }
    return { name, color, Q, totals, path, greedy: evaluateGreedy('cliff', Q, { episodes: 1 }).mean }
  }), [seed])
  return <div className="qm-fig">
    <div className="qm-fig-controls"><span className="qm-hint">500 episodes each, α = 0.5, γ = 1, ε = 0.1 throughout, seed {seed}</span><button onClick={() => setSeed(x => x + 1)}>Try another seed</button></div>
    <div className="qm-fig-row">
      <div>{runs.map(r => <div key={r.name}><p className="qm-small" style={{ color: r.color }}><b>{r.name}</b>: greedy route returns <b>{r.greedy}</b></p><GridMap env={env} probs={greedyProbs(r.Q)} trail={r.path} size={34} showNumbers={false} /></div>)}</div>
      <div className="qm-fig-side">
        <p className="qm-small">Return of each training episode (exploring with ε = 0.1), averaged over 20:</p>
        <Curve series={runs.map(r => ({ values: r.totals, color: r.color }))} refs={[{ value: -13, label: 'shortest route −13' }]} />
        <ul className="qm-legend">{runs.map(r => <li key={r.name} style={{ color: r.color }}><b>{r.name}</b>: last 100 training episodes average {num(r.totals.slice(-100).reduce((x, y) => x + y, 0) / 100)}</li>)}</ul>
      </div>
    </div>
  </div>
}
