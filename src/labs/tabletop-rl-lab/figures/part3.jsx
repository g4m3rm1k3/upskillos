// Part 3 figures: ε-greedy choices, a real run's updates step by step, learning curves graded
// exactly against the optimum, and constant α against 1/n on one stream of noisy targets.
import { useMemo, useState } from 'react'
import Plot from '../../cartpole-lab/figures/Plot.jsx'
import { HANDS, BOXES, PyRandom, roll, handId } from '../engine/dice.js'
import { KEEPS, KEPT, solve, startValue } from '../engine/turn.js'
import { train, trainAfter, chooseIndex } from '../engine/learn.js'
import { BoxPicker, Bars, Slider, DiceRow, tuple, fmt } from './ui.jsx'

// 3.2: a row of values, and how often ε-greedy picks each keep.
export function EpsilonFig() {
  const [epsilon, setEpsilon] = useState(0.1)
  const h = handId([2, 2, 3, 3, 5]), row = solve(8).Q[1][h]
  const counts = useMemo(() => {
    const rng = new PyRandom(0), c = new Array(row.length).fill(0)
    for (let i = 0; i < 1000; i++) c[chooseIndex(row, epsilon, rng)]++
    return c
  }, [epsilon])
  const order = [...row.keys()].sort((a, b) => row[b] - row[a])
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="ε" value={epsilon} min={0} max={1} step={0.05} onChange={setEpsilon} show={v => v.toFixed(2)} /></div>
    <p>The row for <span className="mono">((2, 2, 3, 3, 5), 1)</span>, aiming for Full house, filled with the exact values. Bars: how many of 1,000 choices picked each keep.</p>
    <Bars digits={0} max={1000} rows={order.map(i => ({ label: `${tuple(KEPT[KEEPS[h][i]])} = ${fmt(row[i], 2)}`, value: counts[i], mark: i === order[0] }))} />
    <p className="qm-hint">Expected for the best keep: 1000 × ((1 − ε) + ε/{row.length}) = {fmt(1000 * ((1 - epsilon) + epsilon / row.length), 1)}.</p>
  </div>
}

// 3.3: the first updates of a real Q-learning run, with their arithmetic.
export function UpdateStepper() {
  const updates = useMemo(() => { const u = []; train(5, { episodes: 40, onUpdate: x => u.push(x) }); return u }, [])
  const [i, setI] = useState(0)
  const u = updates[i]
  const firstMoving = updates.findIndex(x => x.after !== x.before)
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <Slider label="update" value={i + 1} min={1} max={updates.length} step={1} onChange={v => setI(v - 1)} />
      <div className="qm-buttons"><button disabled={i === 0} onClick={() => setI(i - 1)}>← Previous</button><button disabled={i === updates.length - 1} onClick={() => setI(i + 1)}>Next →</button><button onClick={() => setI(firstMoving)}>First update that changes a value</button></div>
    </div>
    <div className="qm-fig-row">
      <div><p>Turn {u.episode + 1}, {u.rollsLeft} {u.rollsLeft === 1 ? 'roll' : 'rolls'} left. Hand:</p><DiceRow dice={HANDS[u.hand]} kept={keptPositions(HANDS[u.hand], KEPT[u.kept])} /><p>kept <span className="mono">{tuple(KEPT[u.kept])}</span> → new hand <span className="mono">{tuple(HANDS[u.next])}</span></p></div>
      <table className="qm-kv"><tbody>
        <tr><td>reward</td><td>{u.rollsLeft === 1 ? `${u.reward} (Sixes score of the final hand)` : '0 (a reroll)'}</td></tr>
        <tr><td>future</td><td>{u.rollsLeft === 1 ? '0.0 (the turn is over)' : `max of the next row = ${fmt(u.future)}`}</td></tr>
        <tr><td>target</td><td>{fmt(u.reward)} + 1 × {fmt(u.future)} = <b>{fmt(u.target)}</b></td></tr>
        <tr><td>update</td><td>{fmt(u.before)} + 0.1 × ({fmt(u.target)} − {fmt(u.before)}) = <b>{fmt(u.after)}</b></td></tr>
      </tbody></table>
    </div>
  </div>
}
function keptPositions(hand, kept) {
  const left = [...kept], out = []
  hand.forEach((d, i) => { const j = left.indexOf(d); if (j >= 0) { out.push(i); left.splice(j, 1) } })
  return out
}

const LEARNERS = { q: 'Q-learning (Q-table)', sarsa: 'SARSA (Q-table)', after: 'Afterstates' }
// 3.4 – 3.8: train in the browser, graded exactly.
export function LearnCurves({ learner: l0 = 'q', box: b0 = 5, avg: a0 = false, episodes: e0 = 50000 }) {
  const [learner, setLearner] = useState(l0), [box, setBox] = useState(b0), [avg, setAvg] = useState(a0), [episodes, setEpisodes] = useState(e0), [seed, setSeed] = useState(0), [epsilon, setEpsilon] = useState(0.1)
  const optimum = useMemo(() => startValue(solve(box).V[2]), [box])
  const curve = useMemo(() => {
    const options = { episodes, alpha: avg ? null : 0.1, epsilon, seed, every: episodes / 10 }
    return learner === 'after' ? trainAfter(box, options).curve : train(box, { ...options, method: learner }).curve
  }, [learner, box, avg, episodes, seed, epsilon])
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <BoxPicker value={box} onChange={setBox} label="Box" />
      <label>Learner <select value={learner} onChange={e => setLearner(e.target.value)}>{Object.entries(LEARNERS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label>Step <select value={avg ? 'avg' : 'const'} onChange={e => setAvg(e.target.value === 'avg')}><option value="const">α = 0.1</option><option value="avg">1/n (averages)</option></select></label>
      <label>Turns <select value={episodes} onChange={e => setEpisodes(Number(e.target.value))}>{[10000, 50000, 100000, 200000].map(n => <option key={n} value={n}>{n.toLocaleString()}</option>)}</select></label>
      <Slider label="ε" value={epsilon} min={0} max={0.5} step={0.05} onChange={setEpsilon} show={v => v.toFixed(2)} />
      <label>Seed <input type="number" min="0" value={seed} onChange={e => setSeed(Math.max(0, Math.floor(Number(e.target.value) || 0)))} /></label>
    </div>
    <Plot series={[{ label: LEARNERS[learner], color: '#1f6f68', values: curve }]} refs={[{ value: optimum, label: `optimum ${fmt(optimum, 3)}` }]} window={1} x="grade" label="Exact expected score of the greedy policy" />
    <p>One grade every {(episodes / 10).toLocaleString()} turns. After {episodes.toLocaleString()}: <b>{fmt(curve[curve.length - 1], 3)}</b>, {(100 * curve[curve.length - 1] / optimum).toFixed(1)}% of the optimum for {BOXES[box]}.</p>
  </div>
}

// 3.6: one stream of noisy targets, averaged two ways.
export function StepSizeFig() {
  const [alpha, setAlpha] = useState(0.1)
  const { avg, fixed, targets } = useMemo(() => {
    const rng = new PyRandom(0), targets = [], avg = [], fixed = []
    let a = 0, c = 0
    for (let n = 1; n <= 150; n++) {
      const x = 11 + roll(3, rng).reduce((s, d) => s + d, 0)
      targets.push(x); a += (x - a) / n; c += alpha * (x - c); avg.push(a); fixed.push(c)
    }
    return { avg, fixed, targets }
  }, [alpha])
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="constant α" value={alpha} min={0.02} max={0.5} step={0.02} onChange={setAlpha} show={v => v.toFixed(2)} /></div>
    <Plot series={[{ label: 'targets', color: '#bbb', values: targets }, { label: '1/n', color: '#1f6f68', values: avg }, { label: `α = ${alpha.toFixed(2)}`, color: '#c26a12', values: fixed }]} refs={[{ value: 21.5, label: 'true mean 21.5' }]} window={1} x="update" label="Two running estimates of one keep's value" />
    <p className="qm-hint">Chance, one roll left, keeping (5, 6): each target is 11 plus three fresh dice. After 5 updates: 1/n = {fmt(avg[4], 2)}, α = {fmt(fixed[4], 2)}. After 150: {fmt(avg[149], 2)} and {fmt(fixed[149], 2)}.</p>
  </div>
}
