import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import GridMap from '../GridMap.jsx'
import { GridWorld, ACTION_NAMES, ARROWS, MOVES } from '../engine/gridworld.js'
import { MAPS } from '../engine/maps.js'
import { PyRandom } from '../engine/mt.js'
import { CELL } from '../engine/look.js'
import { num, py, MapPicker, Slider } from './ui.jsx'
import { followPath } from '../engine/paths.js'

const useEnv = name => useMemo(() => new GridWorld(name), [name])

// 1.1: the map as text, and the two numberings of a cell.
export function MapExplorer({ map = 'cheese_and_cat', maps }) {
  const [name, setName] = useState(map), env = useEnv(name)
  const [picked, setS] = useState(env.start)
  const [labels, setLabels] = useState('state')
  const s = picked < env.nStates && !env.isWall(picked) ? picked : env.start   // a cell of the previous map falls back to the start
  const [r, c] = env.toCell(s), letter = env.letter(s)
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      {maps && <MapPicker value={name} onChange={setName} maps={maps} />}
      <label>Label cells with <select value={labels} onChange={e => setLabels(e.target.value)}><option value="state">state number</option><option value="cell">(row, col)</option></select></label>
    </div>
    <div className="qm-fig-row">
      <GridMap env={env} labels={labels} highlight={[s]} onCell={setS} size={env.nCols > 8 ? 40 : 56} />
      <div className="qm-fig-side">
        <p className="qm-hint">Click any cell.</p>
        <pre className="qm-mono-block">{env.rows.map((row, i) => <div key={i}>{'"'}{[...row].map((ch, j) => <span key={j} className={i === r && j === c ? 'qm-pick' : ''}>{ch}</span>)}{'",'}  <span className="qm-dim"># rows[{i}]</span></div>)}</pre>
        <table className="qm-kv"><tbody>
          <tr><td className="mono">(row, col)</td><td className="mono">({r}, {c})</td></tr>
          <tr><td className="mono">rows[{r}][{c}]</td><td className="mono">{py(letter)} <span className="qm-dim">({CELL[letter]?.name ?? 'floor'})</span></td></tr>
          <tr><td className="mono">to_state({r}, {c})</td><td className="mono">{r} * {env.nCols} + {c} = <b>{s}</b></td></tr>
          <tr><td className="mono">to_cell({s})</td><td className="mono">divmod({s}, {env.nCols}) = <b>({r}, {c})</b></td></tr>
        </tbody></table>
        <p className="qm-hint">{env.nRows} rows × {env.nCols} columns = <b>{env.nStates}</b> states (n_states), numbered 0 to {env.nStates - 1}.</p>
      </div>
    </div>
  </div>
}

// 1.2: one call of move(state, action), worked through.
export function MoveExplorer({ map = 'cheese_and_cat', maps }) {
  const [name, setName] = useState(map), env = useEnv(name)
  const [picked, setS] = useState(env.start), [a, setA] = useState(3)
  const s = picked < env.nStates && !env.isWall(picked) ? picked : env.start   // a cell of the previous map falls back to the start
  const [row, col] = env.toCell(s), [dr, dc] = MOVES[a], nr = row + dr, nc = col + dc
  const off = !(nr >= 0 && nr < env.nRows && nc >= 0 && nc < env.nCols)
  const wall = !off && env.rows[nr][nc] === '#'
  const [next, reward, ended] = env.move(s, a)
  const rule = !off && !wall ? env.cells[env.rows[nr][nc]] : undefined
  const blocked = env.isWall(s) || env.isEnd(s)
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      {maps && <MapPicker value={name} onChange={setName} maps={maps} />}
      <span className="qm-buttons">{ACTION_NAMES.map((n, i) => <button key={i} className={i === a ? 'active' : ''} onClick={() => setA(i)}>{ARROWS[i]} {i} {n}</button>)}</span>
    </div>
    <div className="qm-fig-row">
      <GridMap env={env} labels="state" agent={s} highlight={blocked ? [] : [next]} onCell={x => !env.isWall(x) && setS(x)} size={env.nCols > 8 ? 40 : 56} />
      <div className="qm-fig-side">
        <p className="qm-hint">Click a cell to put the agent there, choose a move.</p>
        {blocked ? <p>That cell is an ending: the game is over there, so <span className="mono">move</span> is never called from it.</p> : <ol className="qm-steps mono">
          <li>row, col = to_cell({s}) → ({row}, {col})</li>
          <li>d_row, d_col = MOVES[{a}] → ({dr}, {dc})</li>
          <li>new_row, new_col → ({nr}, {nc})</li>
          <li>off_grid → {py(off)}{!off && <>; rows[{nr}][{nc}] → {py(env.rows[nr][nc])}</>}</li>
          {off || wall ? <li>blocked: stay put, pay bump_reward → <b>return ({s}, {num(reward)}, False)</b></li> : <>
            <li>new_state = {nr} * {env.nCols} + {nc} → {env.toState(nr, nc)}</li>
            <li>rule = cells.get({py(env.rows[nr][nc])}) → {rule ? JSON.stringify(rule).replace(/"(\w+)":/g, '$1: ').replace(/true/g, 'True').replace(/false/g, 'False') : 'None'}</li>
            <li><b>return ({next}, {num(reward)}, {py(ended)})</b>{rule?.to_start ? ' (back to the start)' : ''}</li>
          </>}
        </ol>}
      </div>
    </div>
  </div>
}

// 1.3: play the loop yourself, or let a random agent play; every step's five return values logged.
export function LoopPlayer({ map = 'cheese_and_cat', maps, seed = 7 }) {
  const [name, setName] = useState(map), env = useEnv(name)
  // The game lives in a ref and is changed in event handlers, never inside a state updater (React
  // may run those twice, which would make two moves).
  const ref = useRef(null), [, redraw] = useReducer(x => x + 1, 0)
  const start = () => { const e = new GridWorld(name); const [s0] = e.reset(seed); ref.current = { map: name, e, rng: new PyRandom(seed), log: [], trail: [s0], state: s0, total: 0, over: false, first: s0 }; redraw() }
  // Before the screen paints: the new map must never be drawn with the old map's game on it.
  useLayoutEffect(start, [name])
  const move = (g, a) => {
    const [s2, r, te, tr] = g.e.step(a)
    g.log.push({ s: g.state, a, s2, r, te, tr }); g.trail.push(s2)
    g.state = s2; g.total += r; g.over = te || tr
  }
  const act = choose => { const g = ref.current; if (!g || g.over) return; move(g, choose === 'random' ? g.rng.randrange(4) : choose); redraw() }
  const randomGame = () => { const g = ref.current; for (let i = 0; i < 500 && g && !g.over; i++) move(g, g.rng.randrange(4)); redraw() }
  useEffect(() => {
    const keys = { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3 }
    const on = e => { if (e.key in keys && e.target.closest?.('.qm-loop')) { e.preventDefault(); act(keys[e.key]) } }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])
  const game = ref.current
  if (!game || game.map !== name) return null
  return <div className="qm-fig qm-loop" tabIndex={0}>
    <div className="qm-fig-controls">
      {maps && <MapPicker value={name} onChange={setName} maps={maps} />}
      <span className="qm-buttons">{ACTION_NAMES.map((n, i) => <button key={i} disabled={game.over} onClick={() => act(i)}>{ARROWS[i]} {n}</button>)}</span>
      <button disabled={game.over} onClick={() => act('random')}>🎲 one random move</button>
      <button disabled={game.over} onClick={randomGame}>🎲 random to the end</button>
      <button onClick={start}>↺ reset()</button>
    </div>
    <div className="qm-fig-row">
      <GridMap env={env} agent={game.state} trail={game.trail} labels="state" size={env.nCols > 8 ? 40 : 56} />
      <div className="qm-fig-side qm-scroll">
        <p className="mono qm-small">state, info = env.reset() → ({game.first}, {'{}'})</p>
        <table className="qm-log"><thead><tr><th>t</th><th>state</th><th>action</th><th colSpan={5} className="mono">env.step(action) returns</th></tr><tr><th /><th /><th /><th>next_state</th><th>reward</th><th>terminated</th><th>truncated</th><th>info</th></tr></thead>
          <tbody>{game.log.slice(-60).map((x, i, all) => <tr key={game.log.length - all.length + i}><td>{game.log.length - all.length + i}</td><td>{x.s}</td><td>{x.a} {ARROWS[x.a]}</td><td>{x.s2}</td><td>{num(x.r)}</td><td className={x.te ? 'qm-yes' : ''}>{py(x.te)}</td><td className={x.tr ? 'qm-yes' : ''}>{py(x.tr)}</td><td>{'{}'}</td></tr>)}</tbody></table>
        <p><b>Total reward: {num(game.total)}</b> after {game.log.length} step{game.log.length === 1 ? '' : 's'}.{game.over ? ` The episode is over (${game.log.at(-1).te ? `terminated: it reached ${CELL[env.letter(game.state)]?.name}` : `truncated: ${env.maxSteps} steps`}). Press reset() to play again.` : ' Use the buttons or the arrow keys (click the figure first).'}</p>
      </div>
    </div>
  </div>
}

const discounted = (rewards, gamma) => rewards.reduce((sum, r, k) => sum + gamma ** k * r, 0)
const parseActions = text => [...text].map(ch => 'LURD'.indexOf(ch)).filter(a => a >= 0)

// 1.4 and 1.5: the return of whole paths, term by term, with a γ slider.
export function ReturnPaths({ map = 'cheese_and_cat', paths, gamma: g0 = 1, slider = true, terms = true }) {
  const env = useEnv(map)
  const [gamma, setGamma] = useState(g0), [pick, setPick] = useState(0)
  const runs = paths.map(p => ({ ...p, ...followPath(env, parseActions(p.moves)) }))
  const chosen = runs[pick]
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      {slider && <Slider label="γ (gamma)" value={gamma} min={0} max={1} step={0.01} onChange={setGamma} />}
      <span className="qm-buttons">{runs.map((p, i) => <button key={i} className={i === pick ? 'active' : ''} onClick={() => setPick(i)}>{p.name}</button>)}</span>
    </div>
    <div className="qm-fig-row">
      <GridMap env={env} trail={chosen.states} agent={chosen.states.at(-1)} size={env.nCols > 8 ? 40 : 52} />
      <div className="qm-fig-side qm-scroll">
        <table className="qm-log"><thead><tr><th>path</th><th>moves</th><th>sum of rewards</th><th>discounted return G₀ (γ = {gamma.toFixed(2)})</th></tr></thead>
          <tbody>{runs.map((p, i) => <tr key={i} className={i === pick ? 'qm-row-pick' : ''} onClick={() => setPick(i)}><td>{p.name}</td><td>{p.rewards.length}</td><td>{num(p.rewards.reduce((x, y) => x + y, 0))}</td><td><b>{num(discounted(p.rewards, gamma))}</b></td></tr>)}</tbody></table>
        {terms && <><p className="qm-small">Term by term for <b>{chosen.name}</b>: G₀ = R₁ + γR₂ + γ²R₃ + …</p>
          <table className="qm-log qm-terms"><thead><tr><th>k</th><th>reward R<sub>k+1</sub></th><th>γ<sup>k</sup></th><th>γ<sup>k</sup> · R<sub>k+1</sub></th></tr></thead>
            <tbody>{chosen.rewards.map((r, k) => <tr key={k}><td>{k}</td><td>{num(r)}</td><td>{num(gamma ** k)}</td><td>{num(gamma ** k * r)}</td></tr>)}
              <tr className="qm-sum"><td colSpan={3}>G₀ = sum</td><td>{num(discounted(chosen.rewards, gamma))}</td></tr></tbody></table></>}
      </div>
    </div>
  </div>
}

// 1.5: the return of two paths as a function of γ, and where they cross.
export function GammaCurve({ map = 'cats_and_cheese', paths }) {
  const env = useEnv(map)
  const runs = paths.map(p => ({ ...p, ...followPath(env, parseActions(p.moves)) }))
  const [gamma, setGamma] = useState(0.85)
  const W = 420, H = 220, pad = 34, gs = Array.from({ length: 101 }, (_, i) => i / 100)
  const curves = runs.map(p => gs.map(g => discounted(p.rewards, g)))
  const lo = Math.min(0, ...curves.flat()), hi = Math.max(...curves.flat())
  const X = g => pad + g * (W - pad - 10), Y = v => H - pad - (v - lo) / (hi - lo) * (H - pad - 12)
  let cross = null
  for (let i = 1; i < gs.length; i++) if (Math.sign(curves[0][i] - curves[1][i]) !== Math.sign(curves[0][i - 1] - curves[1][i - 1])) { cross = gs[i]; break }
  const colors = ['#c27c0e', '#2f7d6b']
  const best = discounted(runs[0].rewards, gamma) >= discounted(runs[1].rewards, gamma) ? 0 : 1
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="γ (gamma)" value={gamma} min={0} max={1} step={0.01} onChange={setGamma} /></div>
    <div className="qm-fig-row">
      <GridMap env={env} trail={runs[best].states} agent={runs[best].states.at(-1)} size={44} />
      <div className="qm-fig-side">
        <svg viewBox={`0 0 ${W} ${H}`} className="qm-plot">
          <line x1={pad} y1={Y(0)} x2={W - 10} y2={Y(0)} className="qm-axis" />
          <line x1={pad} y1={12} x2={pad} y2={H - pad} className="qm-axis" />
          {[0, 0.25, 0.5, 0.75, 1].map(g => <text key={g} x={X(g)} y={H - pad + 14} className="qm-tick" textAnchor="middle">{g}</text>)}
          <text x={W / 2} y={H - 4} className="qm-tick" textAnchor="middle">γ</text>
          {curves.map((cv, i) => <polyline key={i} points={cv.map((v, k) => `${X(gs[k])},${Y(v)}`).join(' ')} fill="none" stroke={colors[i]} strokeWidth={2.5} />)}
          <line x1={X(gamma)} y1={12} x2={X(gamma)} y2={H - pad} stroke="#555" strokeDasharray="3 3" />
          {cross != null && <text x={X(cross)} y={20} className="qm-tick" textAnchor="middle">they cross near γ ≈ {cross.toFixed(2)}</text>}
        </svg>
        <ul className="qm-legend">{runs.map((p, i) => <li key={i} style={{ color: colors[i] }}><b>{p.name}</b> ({p.rewards.length} moves): G₀ = {num(discounted(p.rewards, gamma))}{i === best ? ' ← larger' : ''}</li>)}</ul>
      </div>
    </div>
  </div>
}
