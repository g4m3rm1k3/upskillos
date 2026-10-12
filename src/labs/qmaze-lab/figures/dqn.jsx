import { useEffect, useMemo, useRef, useState } from 'react'
import GridMap from '../GridMap.jsx'
import Curve from './Curve.jsx'
import { GridWorld, ARROWS, ACTION_NAMES } from '../engine/gridworld.js'
import { PyRandom } from '../engine/mt.js'
import { picture, makeQNet, forward, argmax, trainDQN, greedyGame, DQN_DEFAULTS } from '../engine/dqn.js'
import { num, MapPicker } from './ui.jsx'

// One layer of the picture, drawn in the maze's shape: a number per cell.
function Layer({ env, values, title }) {
  return <div><p className="qm-small">{title}</p>
    <div className="dq-layer" style={{ gridTemplateColumns: `repeat(${env.nCols}, 1fr)` }}>
      {values.map((v, s) => <span key={s} className={v ? 'on' : env.isWall(s) ? 'wall' : ''}>{v}</span>)}
    </div></div>
}

// 5.1: what the network sees. Move the rat; the picture, and an untrained network's forward pass on it.
export function PictureView({ map: map0 = 'qmaze' }) {
  const [map, setMap] = useState(map0), [marks, setMarks] = useState(true)
  const [moves, setMoves] = useState([])
  const env = useMemo(() => { const e = new GridWorld(map); e.reset(0); for (const a of moves) e.step(a); return e }, [map, moves])
  const net = useMemo(() => makeQNet(2 * env.nStates, 64, new PyRandom(0)), [env.nStates])
  const x = picture(env, marks), f = forward(net, x)
  const n = env.nStates
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <MapPicker value={map} onChange={m => { setMap(m); setMoves([]) }} maps={['corridor', 'cheese_and_cat', 'qmaze']} />
      <label><input type="checkbox" checked={marks} onChange={e => setMarks(e.target.checked)} /> visited marks</label>
      <span className="qm-buttons">{ACTION_NAMES.map((name, a) => <button key={a} onClick={() => setMoves(m => [...m, a])} disabled={env.isEnd(env.state)}>{ARROWS[a]} {name}</button>)}<button onClick={() => setMoves([])}>↺ restart</button></span>
    </div>
    <div className="qm-fig-row">
      <GridMap env={env} agent={env.state} highlight={marks ? [...env.visited] : []} size={env.nCols > 6 ? 30 : 52} showNumbers={false} />
      <Layer env={env} values={x.slice(0, n)} title={`Numbers 0–${n - 1}: visited`} />
      <Layer env={env} values={x.slice(n)} title={`Numbers ${n}–${2 * n - 1}: the rat`} />
      <div className="qm-fig-side">
        <p className="qm-small">The network gets these <b>{2 * n}</b> numbers, of which <b>{f.idx.length}</b> are 1. Its first layer adds up the weights of those {f.idx.length} inputs for each of 64 hidden units; ReLU leaves <b>{f.h.filter(v => v > 0).length}</b> of them switched on; the last layer turns those into four numbers:</p>
        <table className="qm-kv mono"><tbody>{f.q.map((q, a) => <tr key={a} className={a === argmax(f.q) ? 'qm-row-pick' : ''}><td>Q(picture, {ARROWS[a]} {ACTION_NAMES[a]})</td><td>{num(q)}</td></tr>)}</tbody></table>
        <p className="qm-hint">This network is untrained (its starting weights, seed 0), so the numbers mean nothing yet. Move the rat: every move changes the picture, so all four numbers change.</p>
      </div>
    </div>
  </div>
}

// 5.3: DQN trained in the browser, a few hundred moves at a time so the page stays responsive.
const CHOICES = { corridor: 2000, cheese_and_cat: 3000, qmaze: 20000 }
export function DQNTrainer({ map: map0 = 'cheese_and_cat' }) {
  const [map, setMap] = useState(map0), [marks, setMarks] = useState(true), [seed, setSeed] = useState(0)
  const steps = CHOICES[map]
  const [run, setRun] = useState(null)
  const live = useRef(null)
  const env = useMemo(() => new GridWorld(map), [map])
  useEffect(() => () => { if (live.current) live.current.stop = true }, [])
  const start = () => {
    if (live.current) live.current.stop = true
    const gen = trainDQN(map, { steps, marks, seed }), job = { stop: false }
    live.current = job
    const losses = []
    const chunk = () => {
      if (job.stop) return
      let s, last
      for (let i = 0; i < 250; i++) {
        s = gen.next()
        if (s.done) break
        last = s.value
        if (last.loss !== null && last.step % 50 === 0) losses.push(last.loss)
      }
      if (s.done) { const g = greedyGame(s.value.net, map, { marks }); setRun({ map, marks, seed, done: true, step: steps, totals: [...s.value.totals], losses: [...losses], greedy: g }); live.current = null; return }
      setRun({ map, marks, seed, done: false, step: last.step + 1, epsilon: last.epsilon, totals: [...last.totals], losses: [...losses] })
      setTimeout(chunk, 0)
    }
    setRun({ map, marks, seed, done: false, step: 0, totals: [], losses: [] })
    setTimeout(chunk, 0)
  }
  const shown = run && run.map === map ? run : null
  return <div className="qm-fig qm-trainer">
    <div className="qm-fig-controls">
      <MapPicker value={map} onChange={setMap} maps={Object.keys(CHOICES)} />
      <label><input type="checkbox" checked={marks} onChange={e => setMarks(e.target.checked)} /> visited marks</label>
      <label>Seed <input type="number" value={seed} onChange={e => setSeed(Number(e.target.value) || 0)} style={{ width: 60 }} /></label>
      <button className="qm-primary" onClick={start} disabled={shown && !shown.done}>Train {steps.toLocaleString()} moves</button>
      {shown && <span className="qm-hint">{shown.done ? 'done' : `move ${shown.step.toLocaleString()} of ${steps.toLocaleString()}, ε ${num(shown.epsilon)}`} · {shown.totals.length} games</span>}
    </div>
    <p className="qm-hint">Settings as <span className="mono">train_dqn</span>'s defaults: 64 hidden units, batches of {DQN_DEFAULTS.batchSize}, γ = {DQN_DEFAULTS.gamma}, lr = {DQN_DEFAULTS.lr}, memory {DQN_DEFAULTS.bufferSize.toLocaleString()}, learning from move {DQN_DEFAULTS.startLearning}, target copied every {DQN_DEFAULTS.syncEvery}, ε from 1 to 0.05 over the first half. {map === 'qmaze' ? 'Classic QMaze takes about 20 seconds.' : ''}</p>
    <div className="qm-fig-row">
      <div>
        <GridMap env={env} trail={shown?.done ? shown.greedy.trail : undefined} agent={shown?.done ? shown.greedy.trail.at(-1) : env.start} size={env.nCols > 6 ? 34 : 70} showNumbers={false} />
        {shown?.done && <p className="qm-small">Greedy game (no exploring): return <b>{num(shown.greedy.total)}</b> in {shown.greedy.trail.length - 1} moves.</p>}
      </div>
      <div className="qm-fig-side">
        <h4 className="qm-small-h">Return of each training game</h4>
        <Curve series={[{ values: shown?.totals ?? [], color: '#b5650d' }]} />
        <h4 className="qm-small-h">Loss, every 50 moves</h4>
        <Curve series={[{ values: (shown?.losses ?? []).map(v => Math.min(v, 1)), color: '#7a3fb0' }]} window={5} height={110} label="loss" />
      </div>
    </div>
  </div>
}
