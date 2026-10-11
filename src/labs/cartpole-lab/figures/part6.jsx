import { useMemo, useState } from 'react'
import Cart, { fmt } from './Cart.jsx'
import Plot from './Plot.jsx'
import { Slider } from '../../qmaze-lab/figures/ui.jsx'
import { PyRandom } from '../../qmaze-lab/engine/mt.js'
import { finish } from '../../qmaze-lab/engine/tabular.js'
import { CartPole } from '../engine/cartpole.js'
import { RULES, averageLength } from '../engine/policies.js'
import { trainLinear, softmax, scoresOf } from '../engine/linear.js'
import { greedyGames, trainTable } from './part3.jsx'
import measured from '../engine/measured.json'

const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN

// Why replay: 64 consecutive moves are nearly the same situation; 64 drawn from a big memory aren't.
export function ReplayFig() {
  const [size, setSize] = useState(5000)
  const data = useMemo(() => {
    const env = new CartPole(), rng = new PyRandom(3), memory = []
    let [st] = env.reset(3)
    while (memory.length < 10000) {
      const a = rng.random() < 0.3 ? rng.randrange(2) : RULES.lean_ahead.run(st)
      const [next, , term, trunc] = env.step(a)
      memory.push(st)
      st = term || trunc ? env.reset()[0] : next
    }
    return memory
  }, [])
  const recent = data.slice(-64)
  const pool = data.slice(-size), rng = new PyRandom(7)
  const sample = Array.from({ length: 64 }, () => pool[rng.randrange(pool.length)])
  const X = th => 20 + (th + 0.25) / 0.5 * 260, Y = td => 110 - (td + 1.5) / 3 * 100
  const dots = (pts, color) => pts.map((p, i) => <circle key={i} cx={X(p[2])} cy={Y(p[3])} r="3" fill={color} opacity=".75" />)
  const spread = pts => { const m = mean(pts.map(p => p[2])); return Math.sqrt(mean(pts.map(p => (p[2] - m) ** 2))) }
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>memory size <select value={size} onChange={e => setSize(Number(e.target.value))}>{[64, 500, 5000, 10000].map(n => <option key={n}>{n}</option>)}</select></label></div>
    <div className="cp-row">
      {[['the last 64 moves', recent, '#a8402f'], [`64 drawn at random from the last ${size.toLocaleString()}`, sample, '#1f6f68']].map(([title, pts, color]) => <div key={title}>
        <b className="qm-small">{title}</b>
        <svg viewBox="0 0 300 120" className="qm-plot" role="img" aria-label={title}><line x1={X(0)} x2={X(0)} y1="5" y2="115" stroke="#e2dacb" /><line x1="15" x2="290" y1={Y(0)} y2={Y(0)} stroke="#e2dacb" />{dots(pts, color)}<text x="290" y="115" textAnchor="end" className="qm-tick">θ →</text><text x="22" y="12" className="qm-tick">θ̇ ↑</text></svg>
        <p className="qm-hint">spread of θ: {fmt(spread(pts), 4)} rad</p>
      </div>)}
    </div>
    <p className="qm-hint">Each dot is a remembered state (pole angle across, spin up). Consecutive moves crowd into one corner of the picture: a batch of them teaches the network about one situation and makes it forget the rest. A random draw from a big memory covers many situations at once.</p>
  </div>
}

// Every method side by side: the table learners computed here (same numbers as Python), the
// PyTorch ones from tools/measure.py.
export function CompareAll() {
  const [tables, setTables] = useState(null)
  const go = () => {
    const out = {}
    for (const algorithm of ['q', 'sarsa']) out[algorithm] = [0, 1, 2].map(seed => { const r = trainTable({ algorithm, seed }); return { lengths: r.totals, greedy: greedyGames(r.Q).map(g => g.length) } })
    out.linear = [0, 1, 2].map(seed => { const r = finish(trainLinear({ episodes: 300, seed })); const env = new CartPole(), games = []
      for (let g = 0; g < 20; g++) { let [st] = env.reset(1000 + g), res, n = 0; do { const p = softmax(scoresOf(r.weights, st)); res = env.step(p[1] > p[0] ? 1 : 0); st = res[0]; n++ } while (!res[2] && !res[3]); games.push(n) }
      return { lengths: r.lengths, greedy: games } })
    setTables(out)
  }
  const rows = [
    ['q', 'Q-learning, table of 72', 'value table', '1 per move', 'r + γ max Q(s′)'],
    ['sarsa', 'SARSA, table of 72', 'value table', '1 per move', 'r + γ Q(s′, a′)'],
    ['linear', 'REINFORCE, 8 weights', 'policy', '1 per game', 'G_t − mean G'],
    ['reinforce', 'REINFORCE, network', 'policy', '1 per game', '(G_t − mean) / spread'],
    ['a2c', 'A2C', 'policy + critic', '1 per 40 moves', 'R⁽⁵⁾ − V(s)'],
    ['dqn', 'DQN', 'value network', '1 per move (batch of 64)', 'r + γ max Q_target(s′)'],
  ]
  const data = { ...measured, ...(tables ?? {}) }
  return <div className="qm-fig">
    <div className="qm-buttons"><button className="qm-primary" onClick={go} disabled={!!tables}>Train the browser methods (3 seeds each)</button><span className="qm-hint">The PyTorch rows were measured in Python by <span className="mono">tools/measure.py</span>.</span></div>
    <table className="qm-log"><thead><tr><th style={{ textAlign: 'left' }}>Method</th><th>Learns</th><th>Updates</th><th>Multiplies ∇ / target</th><th>Moves of training</th><th>Greedy, 20 new games (seeds 0, 1, 2)</th></tr></thead>
      <tbody>{rows.map(([key, label, learns, updates, signal]) => {
        const runs = data[key]
        return <tr key={key}><th style={{ textAlign: 'left' }}>{label}</th><td>{learns}</td><td>{updates}</td><td className="mono">{signal}</td>
          <td>{runs?.length ? fmt(mean(runs.map(r => r.lengths.reduce((a, b) => a + b, 0))), 0) : '—'}</td>
          <td className="mono">{runs?.length ? runs.map(r => fmt(mean(r.greedy), 0)).join(', ') : 'press the button'}</td></tr>
      })}</tbody></table>
    {data.a2c?.length > 0 && <Plot series={[['reinforce', '#7a3fb0'], ['a2c', '#1f6f68'], ['dqn', '#b5650d']].filter(([k]) => data[k]?.length).map(([k, color]) => ({ values: data[k][0].lengths.slice(0, 600), color, label: k }))} window={30} x="game" label="first 600 games of each, seed 0" />}
  </div>
}

// Change the world's physics and see what still works.
export function WorldChanger() {
  const [physics, setPhysics] = useState({ force: 10, poleMass: 0.1, halfLength: 0.5 })
  const [result, setResult] = useState(null)
  const set = (k, v) => { setPhysics(p => ({ ...p, [k]: v })); setResult(null) }
  const rule = useMemo(() => {
    const lengths = []
    for (let seed = 0; seed < 50; seed++) { const env = new CartPole(physics), rng = new PyRandom(seed); let [st] = env.reset(seed), r, n = 0; do { r = env.step(RULES.lean_ahead.run(st, rng)); st = r[0]; n++ } while (!r[2] && !r[3]); lengths.push(n) }
    return mean(lengths)
  }, [JSON.stringify(physics)])
  const train = () => {
    const out = finish(trainLinear({ episodes: 300, seed: 0, physics }))
    setResult(out)
  }
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <Slider label="push force (N)" value={physics.force} min={2} max={30} step={1} onChange={v => set('force', v)} />
      <Slider label="pole half-length (m)" value={physics.halfLength} min={0.1} max={2} step={0.05} onChange={v => set('halfLength', v)} />
      <Slider label="pole mass (kg)" value={physics.poleMass} min={0.02} max={1} step={0.01} onChange={v => set('poleMass', v)} />
    </div>
    <Cart state={[0, 0, 0.05, 0]} halfLength={physics.halfLength} height={Math.max(190, 80 + physics.halfLength * 200)} label={`CartPole(force=${physics.force}, pole_mass=${physics.poleMass}, half_length=${physics.halfLength})`} />
    <p>"Lean ahead" (θ + 0.25 θ̇ &gt; 0), unchanged, averages <b>{fmt(rule, 1)}</b> steps over 50 games in this world.</p>
    <div className="qm-buttons"><button className="qm-primary" onClick={train}>Train linear REINFORCE here (300 games)</button></div>
    {result && <><Plot series={[{ values: result.lengths, color: '#b5650d' }]} x="game" label="learning curve in the changed world" />
      <p>Last 50 games average <b>{fmt(mean(result.lengths.slice(-50)), 1)}</b>. Learned rule: push right when <span className="mono">{result.weights[1].map((w, i) => `${fmt(w - result.weights[0][i], 2)}·${['x', 'ẋ', 'θ', 'θ̇'][i]}`).join(' + ')} &gt; 0</span>.</p></>}
  </div>
}
