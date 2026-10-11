import { useEffect, useMemo, useState } from 'react'
import GridMap from '../GridMap.jsx'
import { GridWorld, ACTION_NAMES, ARROWS } from '../engine/gridworld.js'
import { PyRandom } from '../engine/mt.js'
import { qFromV, valueIteration, evaluatePolicy } from '../engine/planning.js'
import { uniformPolicy, deterministicPolicy, greedyProbs } from '../engine/policies.js'
import { choiceStates } from '../engine/evaluate.js'
import { num, py, MapPicker, Slider } from './ui.jsx'

const useEnv = name => useMemo(() => new GridWorld(name), [name])
const sizeFor = env => env.nCols > 8 ? 40 : env.nCols > 5 ? 52 : 64
const tuple = ([p, s, r, t]) => `(${num(p)}, ${s}, ${num(r)}, ${py(t)})`

// 2.1: P[s][a] for any cell and action, drawn and written out, and sampled the way step() does.
export function TransitionExplorer({ map = 'frozen_lake', maps, state: s0, action: a0 = 2 }) {
  const [name, setName] = useState(map), env = useEnv(name)
  const [picked, setS] = useState(s0 ?? env.start), [a, setA] = useState(a0)
  const s = picked < env.nStates && !env.isWall(picked) ? picked : env.start   // a cell of the previous map falls back to the start
  const [counts, setCounts] = useState(null)
  useEffect(() => setCounts(null), [env])
  useEffect(() => setCounts(null), [s, a])
  const outcomes = env.P[s][a]
  const expected = outcomes.reduce((sum, [p, , r]) => sum + p * r, 0)
  const sample = () => {
    const rng = new PyRandom(42), c = new Array(outcomes.length).fill(0)
    for (let i = 0; i < 1000; i++) {
      let u = rng.random(), k = outcomes.length - 1
      for (let j = 0; j < outcomes.length; j++) { u -= outcomes[j][0]; if (u < 0) { k = j; break } }
      c[k]++
    }
    setCounts(c)
  }
  const blocked = env.isEnd(s)
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      {maps && <MapPicker value={name} onChange={setName} maps={maps} />}
      <span className="qm-buttons">{ACTION_NAMES.map((n, i) => <button key={i} className={i === a ? 'active' : ''} onClick={() => setA(i)}>{ARROWS[i]} {n}</button>)}</span>
    </div>
    <div className="qm-fig-row">
      <GridMap env={env} labels="state" agent={s} outcomes={blocked ? null : { state: s, action: a }} onCell={x => !env.isWall(x) && setS(x)} size={sizeFor(env)} />
      <div className="qm-fig-side">
        <p className="qm-hint">Click a cell, choose an action. Purple arrows: where the move can end up, with each probability.</p>
        <pre className="qm-mono-block">env.P[{s}][{a}] = [{'\n'}{outcomes.map((o, i) => `    ${tuple(o)},${outcomes.length > 1 ? `   # tried ${ACTION_NAMES[[(a + 3) % 4, a, (a + 1) % 4][i]]}` : ''}\n`).join('')}]</pre>
        {blocked ? <p>An ending: the game is over here, so every action "stays" with reward 0 and <span className="mono">terminated=True</span>. Learning never uses these rows.</p> : <>
          <p>Probabilities add up to <b>{num(outcomes.reduce((x, o) => x + o[0], 0))}</b>. Expected reward: Σ p · r = <b>{num(expected)}</b>.</p>
          <button onClick={sample}>Sample this move 1,000 times, as step() does</button>
          {counts && <table className="qm-log"><thead><tr><th>outcome</th><th>probability</th><th>times picked</th><th>fraction</th></tr></thead><tbody>
            {outcomes.map((o, i) => <tr key={i}><td className="mono">{tuple(o)}</td><td>{num(o[0])}</td><td>{counts[i]}</td><td>{num(counts[i] / 1000)}</td></tr>)}</tbody></table>}
        </>}
      </div>
    </div>
  </div>
}

// 2.2: two histories reach the same cell and make the same move; Classic QMaze pays them differently.
export function HistoryMatters({ histories = [{ name: 'A', moves: 'DRRL' }, { name: 'B', moves: 'DDRRUL' }] }) {
  const runs = histories.map(h => {
    const env = new GridWorld('qmaze'); env.reset(0)
    const steps = [...h.moves].map(ch => { const a = 'LURD'.indexOf(ch), from = env.state; const [next, r] = env.step(a); return { from, a, next, r } })
    return { ...h, env, steps, trail: [0, ...steps.map(x => x.next)] }
  })
  const [pick, setPick] = useState(0), run = runs[pick], last = run.steps.at(-1)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><span className="qm-buttons">{runs.map((h, i) => <button key={i} className={i === pick ? 'active' : ''} onClick={() => setPick(i)}>History {h.name}: {[...h.moves].map(ch => ARROWS['LURD'.indexOf(ch)]).join(' ')}</button>)}</span></div>
    <div className="qm-fig-row">
      <GridMap env={run.env} trail={run.trail} agent={last.next} highlight={[last.from]} labels="state" size={40} />
      <div className="qm-fig-side">
        <table className="qm-log"><thead><tr><th>history</th><th>last move</th><th>from → to</th><th>reward</th></tr></thead><tbody>
          {runs.map((h, i) => { const l = h.steps.at(-1); return <tr key={i} className={i === pick ? 'qm-row-pick' : ''}><td>{h.name}</td><td>{ARROWS[l.a]} {ACTION_NAMES[l.a]}</td><td>{l.from} → {l.next}</td><td><b>{num(l.r)}</b></td></tr> })}
        </tbody></table>
        <p>Same state ({last.from}), same action ({ACTION_NAMES[last.a]}), same next state ({last.next}): different rewards, because history {runs[0].name} had already been in {last.next}. <span className="mono">visited</span> at that moment: {'{'}{[...new Set(run.trail.slice(0, -1))].sort((x, y) => x - y).join(', ')}{'}'}.</p>
      </div>
    </div>
  </div>
}

// 2.3: a deterministic policy is one arrow per cell; click to turn an arrow, then follow it.
export function PolicyEditor({ map = 'cheese_and_cat', start: initial }) {
  const env = useEnv(map)
  const states = choiceStates(env)
  const [actions, setActions] = useState(() => initial ?? Array.from({ length: env.nStates }, () => 2))
  const [selected, setSelected] = useState(env.start)
  const turn = s => { if (!states.includes(s)) return; setSelected(s); setActions(a => a.map((x, i) => i === s ? (x + 1) % 4 : x)) }
  const trail = [env.start]
  let s = env.start, total = 0, how = 'still going after 30 moves (a loop?)'
  for (let t = 0; t < 30; t++) {
    const [[, next, r, end]] = env.P[s][actions[s]]
    total += r; trail.push(next); s = next
    if (end) { how = `ended on ${env.letter(s) === 'C' ? 'the cheese' : env.letter(s) === 'X' ? 'the cat' : 'an ending'} after ${t + 1} moves`; break }
  }
  return <div className="qm-fig">
    <div className="qm-fig-row">
      <GridMap env={env} policy={actions} trail={trail} labels="state" highlight={[selected]} onCell={turn} size={64} />
      <div className="qm-fig-side">
        <p className="qm-hint">Click a cell to turn its arrow a quarter turn. The orange line follows the policy from the start.</p>
        <p>Following it from the start: {how}, return (γ = 1) <b>{num(total)}</b>.</p>
        <pre className="qm-mono-block">policy = [{states.length < env.nStates ? '…' : ''}{'\n'}{Array.from({ length: env.nRows }, (_, r) => '    ' + Array.from({ length: env.nCols }, (_, c) => { const st = env.toState(r, c); return states.includes(st) ? `${actions[st]},` : '_,' }).join(' ')).join('\n')}{'\n'}]</pre>
        <p className="qm-small">As a table of probabilities, the row for state {selected} is <span className="mono">[{deterministicPolicy([actions[selected]])[0].map(num).join(', ')}]</span>: probability 1 on {ARROWS[actions[selected]]} {ACTION_NAMES[actions[selected]]}. (Walls and endings, <span className="mono">_</span>, are never asked.)</p>
      </div>
    </div>
  </div>
}

// 2.4 and 2.5: policy evaluation or value iteration, sweep by sweep, with any cell's backup shown.
export function Sweeps({ map = 'cheese_and_cat', maps, mode = 'evaluate', policy = 'random', gamma: g0 = 0.95, gammaSlider = false }) {
  const [name, setName] = useState(map), env = useEnv(name)
  const [gamma, setGamma] = useState(g0)
  const pi = useMemo(() => policy === 'random' ? uniformPolicy(env.nStates) : null, [env, policy])
  const history = useMemo(() => {
    const out = [new Array(env.nStates).fill(0)]
    const onSweep = V => out.push(V)
    if (mode === 'evaluate') evaluatePolicy(env.P, pi, gamma, { onSweep, maxSweeps: 2000 })
    else valueIteration(env.P, gamma, { onSweep })
    return out
  }, [env, gamma, mode, pi])
  const [k, setK] = useState(0)
  const [picked, setCell] = useState(env.start)
  useEffect(() => setK(0), [env, gamma])
  const V = history[Math.min(k, history.length - 1)]
  const states = choiceStates(env)
  const cell = states.includes(picked) ? picked : env.start   // a cell of the previous map falls back to the start
  const q = qFromV(env.P, V, cell, gamma)
  const policyArrows = mode === 'optimal' ? greedyProbs(V.map((_, s) => qFromV(env.P, V, s, gamma))) : null
  const last = history.length - 1
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      {maps && <MapPicker value={name} onChange={setName} maps={maps} />}
      {gammaSlider && <Slider label="γ" value={gamma} min={0} max={0.99} step={0.01} onChange={setGamma} />}
      <span className="qm-buttons">
        <button onClick={() => setK(0)}>↺ V = 0</button>
        <button disabled={k >= last} onClick={() => setK(x => x + 1)}>One sweep</button>
        <button disabled={k >= last} onClick={() => setK(x => Math.min(last, x + 10))}>10 sweeps</button>
        <button disabled={k >= last} onClick={() => setK(last)}>To convergence</button>
      </span>
      <span className="qm-hint">after {Math.min(k, last)} sweep{k === 1 ? '' : 's'}{k >= last ? ` (converged: no value changed by more than 10⁻¹⁰)` : ''}</span>
    </div>
    <div className="qm-fig-row">
      <GridMap env={env} values={V} probs={policyArrows ?? undefined} highlight={[cell]} onCell={x => states.includes(x) && setCell(x)} size={sizeFor(env)} />
      <div className="qm-fig-side">
        <p className="qm-hint">Click a cell to see its <b>backup</b> worked out from the values now on the map. (The code updates <span className="mono">V</span> in place, so during the next sweep the cells before this one will already have new values; the numbers can differ a little from these, and both ways end at the same V.)</p>
        <table className="qm-log qm-left"><thead><tr><th>action</th><th>Σ over outcomes of p · (r + γ · V(s′))</th><th>= Q(s, a)</th>{mode === 'evaluate' && <th>π(a|s)</th>}</tr></thead><tbody>
          {[0, 1, 2, 3].map(a => <tr key={a}><td>{ARROWS[a]} {ACTION_NAMES[a]}</td>
            <td className="mono">{env.P[cell][a].map(([p, s2, r, t]) => `${num(p)}·(${num(r)} + ${t ? '0' : `${num(gamma)}·${num(V[s2])}`})`).join(' + ')}</td>
            <td><b>{num(q[a])}</b></td>{mode === 'evaluate' && <td>{num(pi[cell][a])}</td>}</tr>)}
        </tbody></table>
        <p>{mode === 'evaluate'
          ? <>New V({cell}) = Σₐ π(a|s) · Q(s, a) = <b>{num(q.reduce((sum, x, a) => sum + pi[cell][a] * x, 0))}</b> (a weighted average: this policy picks each action a quarter of the time).</>
          : <>New V({cell}) = maxₐ Q(s, a) = <b>{num(Math.max(...q))}</b>: the best action's value. The arrows show the best action; when several tie, each gets a shorter arrow.</>}
          {' '}Now on the map: V({cell}) = {num(V[cell])}.</p>
      </div>
    </div>
  </div>
}
