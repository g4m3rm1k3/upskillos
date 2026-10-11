import { useMemo, useReducer, useRef, useState } from 'react'
import GridMap, { tint } from '../GridMap.jsx'
import Curve from './Curve.jsx'
import { GridWorld, ACTION_NAMES, ARROWS } from '../engine/gridworld.js'
import { PyRandom } from '../engine/mt.js'
import { softmax, makeNet, trainA2C, policyTable, logitsOf } from '../engine/a2c.js'
import { qLearning, sarsa, finish } from '../engine/tabular.js'
import { evaluateGreedy } from '../engine/evaluate.js'
import { valueIteration } from '../engine/planning.js'
import { num, MapPicker, Slider } from './ui.jsx'

const entropyOf = p => -p.reduce((s, x) => s + (x > 0 ? x * Math.log(x) : 0), 0)
const Bars = ({ p, highlight, labels = ARROWS }) => <div className="qm-bars">{p.map((x, i) => <div key={i} className={`qm-bar${i === highlight ? ' pick' : ''}`}><span>{labels[i]}</span><div style={{ width: `${Math.max(1, x * 100)}%` }} /><b>{num(x)}</b></div>)}</div>

// 4.1: a one-hot vector times the weight matrix picks out one column: a linear layer is a table.
export function OneHotLinear({ map = 'cheese_and_cat' }) {
  const env = useMemo(() => new GridWorld(map), [map])
  const net = useMemo(() => makeNet(env.nStates, 4, new PyRandom(5)), [env])
  const [s, setS] = useState(env.start)
  const z = logitsOf(net, s)
  const scale = Math.max(...net.W.flat().map(Math.abs))
  return <div className="qm-fig">
    <div className="qm-fig-row">
      <GridMap env={env} labels="state" highlight={[s]} onCell={x => !env.isWall(x) && setS(x)} size={48} />
      <div className="qm-fig-side qm-scroll">
        <p className="qm-hint">Click a cell. Its state number becomes a one-hot vector; multiplying by the weights picks out one column.</p>
        <p className="mono qm-small">x = one_hot({s}, {env.nStates}) = [{Array.from({ length: env.nStates }, (_, i) => i === s ? <b key={i} className="qm-pick">1</b> : <span key={i}>0</span>).reduce((acc, el, i) => i ? [...acc, ', ', el] : [el], [])}]</p>
        <div className="qm-matrix">
          <div className="qm-matrix-row"><span className="mono">W</span>{Array.from({ length: env.nStates }, (_, i) => <span key={i} className={`qm-matrix-head${i === s ? ' pick' : ''}`}>{i}</span>)}</div>
          {net.W.map((row, a) => <div key={a} className="qm-matrix-row"><span>{ARROWS[a]}</span>{row.map((w, i) => <span key={i} className={i === s ? 'pick' : ''} style={{ background: tint(w, scale) }} title={num(w)}>{i === s ? num(w) : ''}</span>)}</div>)}
        </div>
        <p className="mono qm-small">logits = W @ x = column {s} of W = [{z.map(num).join(', ')}]</p>
        <p className="qm-small">Every other column is multiplied by 0. So <span className="mono">nn.Linear({env.nStates}, 4, bias=False)</span> applied to a one-hot state <b>is</b> a table with one column of 4 numbers per state, just stored the other way round from the Q-table.</p>
      </div>
    </div>
  </div>
}

// 4.2: logits to probabilities.
export function SoftmaxFigure({ logits: z0 = [0.5, -1, 1.5, 0] }) {
  const [z, setZ] = useState(z0)
  const p = softmax(z)
  const [counts, setCounts] = useState(null)
  const sample = () => { const rng = new PyRandom(7), c = [0, 0, 0, 0]; for (let i = 0; i < 1000; i++) { let u = rng.random(), k = 3; for (let j = 0; j < 4; j++) { u -= p[j]; if (u < 0) { k = j; break } } c[k]++ } setCounts(c) }
  return <div className="qm-fig">
    <div className="qm-fig-row">
      <div className="qm-fig-side">
        {z.map((v, i) => <Slider key={i} label={`z for ${ARROWS[i]} ${ACTION_NAMES[i]}`} value={v} min={-4} max={4} step={0.1} onChange={x => { setCounts(null); setZ(zz => zz.map((y, k) => k === i ? x : y)) }} />)}
        <p className="qm-buttons"><button onClick={() => setZ(zz => zz.map(x => Math.round((x + 1) * 10) / 10))}>Add 1 to every logit</button><button onClick={() => setZ([0, 0, 0, 0])}>All equal</button><button onClick={sample}>Sample 1,000 actions</button></p>
      </div>
      <div className="qm-fig-side">
        <p className="mono qm-small">exp(z) = [{z.map(x => num(Math.exp(x))).join(', ')}], sum = {num(z.reduce((s, x) => s + Math.exp(x), 0))}</p>
        <Bars p={p} />
        <p className="qm-small">Entropy H = −Σ π log π = <b>{num(entropyOf(p))}</b> (largest possible with 4 actions: log 4 = {num(Math.log(4))})</p>
        {counts && <p className="qm-small">Sampled: {counts.map((c, i) => `${ARROWS[i]} ${c}`).join(', ')}</p>}
      </div>
    </div>
  </div>
}

// 4.3: one policy-gradient step on one state's logits: z ← z + lr · A · (onehot(a) − π).
export function GradientStep({ logits: z0 = [0, 0, 0, 0] }) {
  const [z, setZ] = useState(z0), [a, setA] = useState(2), [A, setAdv] = useState(1), [lr, setLr] = useState(0.5)
  const p = softmax(z), grad = p.map((x, j) => (j === a ? 1 : 0) - x)
  const next = z.map((x, j) => x + lr * A * grad[j]), p2 = softmax(next)
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <span className="qm-buttons">Action taken {ARROWS.map((x, i) => <button key={i} className={i === a ? 'active' : ''} onClick={() => setA(i)}>{x}</button>)}</span>
      <Slider label="advantage A" value={A} min={-2} max={2} step={0.1} onChange={setAdv} />
      <Slider label="learning rate" value={lr} min={0.05} max={2} step={0.05} onChange={setLr} />
    </div>
    <div className="qm-fig-row">
      <div className="qm-fig-side"><p className="qm-small">Before: logits [{z.map(num).join(', ')}]</p><Bars p={p} highlight={a} /></div>
      <div className="qm-fig-side">
        <p className="mono qm-small">∇z log π(a) = onehot(a) − π = [{grad.map(num).join(', ')}]</p>
        <p className="mono qm-small">z + lr·A·(onehot − π) = [{next.map(num).join(', ')}]</p>
      </div>
      <div className="qm-fig-side"><p className="qm-small">After one step</p><Bars p={p2} highlight={a} /><p className="qm-small">π({ARROWS[a]}) went from {num(p[a])} to <b>{num(p2[a])}</b>.</p></div>
    </div>
    <p className="qm-buttons"><button onClick={() => setZ(next)}>Take this step (and keep it)</button><button onClick={() => setZ(z0)}>↺ Reset</button></p>
  </div>
}

// 4.4 and 4.5: A2C in the browser, 8 copies of the map played in step.
export function A2CTrainer({ map: map0 = 'cheese_and_cat', maps, updates = 1500 }) {
  const [map, setMap] = useState(map0), [lr, setLr] = useState(0.05), [entropyCoef, setEntropy] = useState(0.01), [seed, setSeed] = useState(0)
  const gamma = map === 'cliff' || map.startsWith('frozen') ? 0.99 : 0.95
  const env = useMemo(() => new GridWorld(map), [map])
  const run = useRef(null), [, redraw] = useReducer(x => x + 1, 0)
  const key = `${map}|${lr}|${entropyCoef}|${seed}`
  if (!run.current || run.current.key !== key) run.current = { key, gen: trainA2C(map, { updates, lr, entropyCoef, seed, gamma }), last: null, done: false }
  const advance = n => { const r = run.current; for (let i = 0; i < n; i++) { const s = r.gen.next(); if (s.done) { r.done = true; break } r.last = s.value } redraw() }
  const r = run.current, u = r.last
  const table = u ? policyTable(u.net) : null
  const optimal = useMemo(() => evaluateGreedy(map, valueIteration(env.P, gamma).Q).mean, [map])
  const greedy = r.done && table ? evaluateGreedy(map, table.probs) : null
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      {maps && <MapPicker value={map} onChange={setMap} maps={maps} />}
      <Slider label="learning rate" value={lr} min={0.005} max={0.2} step={0.005} onChange={setLr} />
      <Slider label="entropy_coef" value={entropyCoef} min={0} max={0.2} step={0.005} onChange={setEntropy} />
      <label>Seed <input type="number" value={seed} onChange={e => setSeed(Number(e.target.value) || 0)} style={{ width: 56 }} /></label>
      <span className="qm-hint">γ = {gamma}, 8 copies × 5 moves per update</span>
    </div>
    <div className="qm-buttons qm-trainer-buttons">
      <button disabled={r.done} onClick={() => advance(1)}>One update</button><button disabled={r.done} onClick={() => advance(50)}>50 updates</button><button className="qm-primary" disabled={r.done} onClick={() => advance(updates)}>All {updates} updates</button>
      <span className="qm-hint">{u ? u.update + 1 : 0} of {updates} updates · {u ? u.totals.length : 0} episodes finished</span>
    </div>
    <div className="qm-fig-row">
      <GridMap env={env} probs={table?.probs} values={table?.values} agents={u?.states} size={env.nCols > 8 ? 38 : 64} showNumbers={env.nCols <= 6} />
      <div className="qm-fig-side">
        {u ? <>
          <p className="qm-small">Arrows: the actor's π(a|s), length = probability. Colour: the critic's V(s). Mice: the 8 copies, where each is now.</p>
          <table className="qm-kv mono"><tbody>
            <tr><td>actor loss</td><td>{num(u.parts.actorLoss)}</td></tr><tr><td>critic loss (mean A²)</td><td>{num(u.parts.criticLoss)}</td></tr>
            <tr><td>entropy (mean)</td><td>{num(u.parts.entropy)}</td></tr><tr><td>total loss</td><td>{num(u.parts.loss)}</td></tr>
          </tbody></table>
          <h4 className="qm-small-h">Return per finished episode</h4>
          <Curve series={[{ values: u.totals, color: '#7a3fb0' }]} refs={[{ value: optimal, label: 'optimal greedy policy' }]} window={50} />
          {greedy && <p className="qm-result">Playing the most likely action in every state, 100 episodes average <b>{num(greedy.mean)}</b> (optimal {num(optimal)}).</p>}
        </> : <p className="qm-hint">Press One update: 8 copies each make 5 moves with the current policy, then one gradient step.</p>}
      </div>
    </div>
  </div>
}

// 4.6: the three methods on every map, trained here and judged by greedy play.
const SETTINGS = {
  corridor: { q: {}, a2c: {} }, cheese_and_cat: { q: {}, a2c: {} }, qmaze: { q: {}, a2c: {} },
  cliff: { q: { alpha: 0.5, gamma: 1, epsilonStart: 0.1, epsilonEnd: 0.1, episodes: 500 }, a2c: { gamma: 0.99 } },
  frozen_lake: { q: { episodes: 3000, alpha: 0.1, gamma: 0.99 }, a2c: { gamma: 0.99 } },
  cats_and_cheese: { q: {}, a2c: {} },
}
export function MethodsCompare() {
  const [rows, setRows] = useState(null)
  const runAll = () => {
    const out = Object.entries(SETTINGS).map(([map, s]) => {
      const gamma = s.q.gamma ?? 0.95
      const optimal = evaluateGreedy(map, valueIteration(new GridWorld(map).P, gamma).Q).mean
      const q = evaluateGreedy(map, finish(qLearning(new GridWorld(map), s.q)).Q).mean
      const sa = evaluateGreedy(map, finish(sarsa(new GridWorld(map), s.q)).Q).mean
      const a2c = evaluateGreedy(map, policyTable(finish(trainA2C(map, s.a2c)).net).probs).mean
      return { map, optimal, q, sa, a2c }
    })
    setRows(out)
  }
  return <div className="qm-fig">
    <p className="qm-buttons"><button className="qm-primary" onClick={runAll}>{rows ? 'Run again' : 'Train all three on every map (a few seconds)'}</button><span className="qm-hint">Seed 0; average return of 100 greedy episodes after training.</span></p>
    {rows && <table className="qm-log"><thead><tr><th>map</th><th>optimal</th><th>Q-learning</th><th>SARSA</th><th>A2C</th></tr></thead><tbody>
      {rows.map(r => <tr key={r.map}><td>{new GridWorld(r.map).title}</td><td>{num(r.optimal)}</td>{[r.q, r.sa, r.a2c].map((v, i) => <td key={i} className={Math.abs(v - r.optimal) < 0.02 ? 'qm-best' : ''}>{num(v)}</td>)}</tr>)}
    </tbody></table>}
  </div>
}
