// Part 2 figures: a turn as an MDP, every keep's exact value, backward induction for one hand, the
// value of each box, and the Chaser's rule evaluated exactly against the optimum.
import { useMemo, useState } from 'react'
import { HANDS, BOXES, PyRandom, roll, countsOf, score, sorted, handId } from '../engine/dice.js'
import { KEEPS, KEPT, keptId, solve, startValue, evaluate, OUTCOMES } from '../engine/turn.js'
import { DiceRow, HandEditor, BoxPicker, Bars, tuple, fmt } from './ui.jsx'

const solved = new Map()
export const solution = box => { if (!solved.has(box)) solved.set(box, solve(box)); return solved.get(box) }

// 2.1: play a turn aimed at one box; the state, the actions and the reward.
export function TurnExplorer() {
  const [box, setBox] = useState(5), [seed, setSeed] = useState(1)
  const [turn, setTurn] = useState(() => start(1))
  function start(s) { const rng = new PyRandom(s); return { rng, hand: sorted(roll(5, rng)), rollsLeft: 2, kept: [], log: [] } }
  const { hand, rollsLeft, kept, log } = turn
  const keptDice = sorted(kept.map(i => hand[i]))
  const reroll = () => setTurn(t => { const next = sorted([...keptDice, ...roll(5 - keptDice.length, t.rng)]); return { ...t, hand: next, rollsLeft: t.rollsLeft - 1, kept: [], log: [...t.log, `s = (${hand.join('')}, ${rollsLeft}) · kept ${tuple(keptDice)} → ${next.join('')}`] } })
  const stop = () => setTurn(t => ({ ...t, rollsLeft: 0, log: [...t.log, `s = (${hand.join('')}, ${rollsLeft}) · kept all five: stop`] }))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><BoxPicker value={box} onChange={setBox} label="Aiming for" />
      <label>Seed <input type="number" min="0" value={seed} onChange={e => setSeed(Math.max(0, Math.floor(Number(e.target.value) || 0)))} /></label>
      <button onClick={() => setTurn(start(seed))}>New turn</button></div>
    <div className="qm-fig-row"><DiceRow dice={hand} kept={kept} size={44} onDie={rollsLeft ? i => setTurn(t => ({ ...t, kept: t.kept.includes(i) ? t.kept.filter(x => x !== i) : [...t.kept, i] })) : undefined} />
      <table className="qm-kv"><tbody>
        <tr><td>state s = (h, r)</td><td className="mono">({tuple(hand)}, {rollsLeft})</td></tr>
        <tr><td>actions available</td><td>{rollsLeft ? <><b>{KEEPS[handId(hand)].length}</b> different keeps</> : 'none: the turn is over'}</td></tr>
        <tr><td>reward</td><td>{rollsLeft ? '0 so far' : <b>{score(hand, box)} points in {BOXES[box]}</b>}</td></tr>
      </tbody></table></div>
    {rollsLeft > 0 && <div className="qm-buttons"><button className="qm-primary" onClick={reroll}>Keep {tuple(keptDice)}, reroll {5 - keptDice.length}</button><button onClick={stop}>Stop here</button></div>}
    {log.length > 0 && <pre className="qm-mono-block">{log.map((l, i) => <div key={i}>{l}</div>)}</pre>}
  </div>
}

// 2.2, 2.5: every keep of a hand, valued exactly.
export function KeepValues({ rollsLeft: r0 = 1, hand: h0 = [1, 2, 6, 6, 6], box: b0 = 5 }) {
  const [hand, setHand] = useState(h0), [box, setBox] = useState(b0), [r, setR] = useState(r0)
  const h = handId(hand), { Q, V } = solution(box), row = Q[r][h]
  const rows = KEEPS[h].map((k, i) => ({ label: tuple(KEPT[k]), value: row[i] })).sort((a, b) => b.value - a.value)
  rows[0].mark = true
  return <div className="qm-fig">
    <div className="qm-fig-controls"><BoxPicker value={box} onChange={setBox} label="Aiming for" />
      <label>Rolls left <select value={r} onChange={e => setR(Number(e.target.value))}><option value={2}>2 (after the first roll)</option><option value={1}>1 (after the second)</option></select></label></div>
    <div className="qm-fig-row"><HandEditor hand={hand} onChange={x => setHand(sorted(x))} /><span>Best: keep <b className="mono">{rows[0].label}</b>, worth <b>{fmt(V[r][h])}</b> · stopping now scores {score(hand, box)}</span></div>
    <Bars rows={rows.slice(0, 14)} digits={4} />
    {rows.length > 14 && <p className="qm-hint">… and {rows.length - 14} worse keeps.</p>}
  </div>
}

// 2.3: V0 → Q1 → V1 → Q2 → V2 for one hand.
export function BackupFig() {
  const [hand, setHand] = useState([1, 3, 4, 5, 6]), [box, setBox] = useState(12)
  const h = handId(hand), { Q, V } = solution(box)
  const top = r => KEEPS[h].map((k, i) => ({ k, value: Q[r][h][i] })).sort((a, b) => b.value - a.value).slice(0, 4)
  const best1 = top(1)[0], terms = OUTCOMES[best1.k].slice(0, 6)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><BoxPicker value={box} onChange={setBox} label="Aiming for" /><HandEditor hand={hand} onChange={x => setHand(sorted(x))} /></div>
    <div className="tt-backup">
      <div><h4>r = 0: the score</h4><p className="mono">V₀{tuple(hand)} = {fmt(V[0][h])}</p></div>
      {[1, 2].map(r => <div key={r}><h4>r = {r}: the best keeps</h4>{top(r).map((t, i) => <p key={i} className={`mono${i === 0 ? ' tt-best' : ''}`}>Q{r === 1 ? '₁' : '₂'}{tuple(KEPT[t.k])} = {fmt(t.value)}</p>)}<p className="mono">V{r === 1 ? '₁' : '₂'} = <b>{fmt(V[r][h])}</b></p></div>)}
    </div>
    <p className="qm-hint">Q₁{tuple(KEPT[best1.k])} = {terms.map(o => `${fmt(o.chance, 3)}×${fmt(V[0][o.id], 1)}`).join(' + ')}{OUTCOMES[best1.k].length > 6 ? ` + … (${OUTCOMES[best1.k].length} terms)` : ''}</p>
  </div>
}

// 2.4: the exact value of a perfect turn for each box.
export function BoxValues() {
  const values = useMemo(() => BOXES.map((_, b) => startValue(solution(b).V[2])), [])
  return <div className="qm-fig"><Bars rows={BOXES.map((name, b) => ({ label: name, value: values[b] }))} digits={4} /><p className="qm-hint">Sum of all 13: {fmt(values.reduce((a, b) => a + b, 0), 2)}. (A real game can’t aim every turn at a fresh box with a fresh roll, and has bonuses: Part 4.)</p></div>
}

const chaserKeep = h => { const c = countsOf(HANDS[h]), face = c.indexOf(Math.max(...c)); return keptId(Array(c[face]).fill(face)) }
// 2.6: the Chaser against the optimum, both evaluated exactly.
export function PolicyCompare() {
  const rows = useMemo(() => BOXES.map((name, b) => ({ name, best: startValue(solution(b).V[2]), chaser: evaluate(h => chaserKeep(h), b) })), [])
  return <div className="qm-fig">
    <table className="qm-mathcode"><thead><tr><th>Box</th><th>Optimal policy</th><th>Chaser's rule</th><th>Lost</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.name}><td>{r.name}</td><td>{fmt(r.best)}</td><td>{fmt(r.chaser)}</td><td>{r.best - r.chaser < 1e-9 ? <b>nothing</b> : `${(100 * (1 - r.chaser / r.best)).toFixed(0)}%`}</td></tr>)}</tbody></table>
  </div>
}
