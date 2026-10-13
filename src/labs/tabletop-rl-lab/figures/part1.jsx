// Part 1 figures: dice rolled by Python's generator, scoring, the 252 hands and their chances,
// reroll outcomes, simulation spread, and the Markov chain for chasing a Yahtzee.
import { useMemo, useState } from 'react'
import Plot from '../../cartpole-lab/figures/Plot.jsx'
import { HANDS, BOXES, PyRandom, roll, countsOf, score, sorted } from '../engine/dice.js'
import { ways, handProbability, outcomes, chaseMatrix, chaseSteps, spread } from '../engine/probability.js'
import { DiceRow, HandEditor, Bars, tuple, fmt } from './ui.jsx'

// 1.1: the rolls Python makes from a seed.
export function DiceRoller() {
  const [seed, setSeed] = useState(0), [count, setCount] = useState(1)
  const rolls = useMemo(() => { const rng = new PyRandom(seed); return Array.from({ length: count }, () => roll(5, rng)) }, [seed, count])
  const last = rolls[rolls.length - 1], hand = sorted(last), counts = countsOf(hand)
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label>Seed <input type="number" min="0" value={seed} onChange={e => { setSeed(Math.max(0, Math.floor(Number(e.target.value) || 0))); setCount(1) }} /></label>
      <div className="qm-buttons"><button onClick={() => setCount(c => Math.min(12, c + 1))} disabled={count >= 12}>Roll again</button><button onClick={() => setCount(1)}>Start over</button></div>
    </div>
    <div className="qm-fig-row">
      <DiceRow dice={last} size={44} />
      <table className="qm-kv"><tbody>
        <tr><td className="mono">dice</td><td className="mono">{JSON.stringify(last).replaceAll(',', ', ')}</td></tr>
        <tr><td className="mono">hand</td><td className="mono">{tuple(hand)}</td></tr>
        <tr><td className="mono">counts_of(hand)[1:]</td><td className="mono">[{counts.slice(1).join(', ')}]</td></tr>
      </tbody></table>
    </div>
    <pre className="qm-mono-block">{rolls.map((r, i) => <div key={i}>roll {i + 1}: [{r.join(', ')}]</div>)}</pre>
    <p className="qm-hint">random.Random({seed}): roll {count} of this seed. Python prints exactly these numbers.</p>
  </div>
}

// 1.2: every box's score for a hand you set.
export function ScorePad() {
  const [hand, setHand] = useState([2, 2, 3, 3, 3])
  return <div className="qm-fig">
    <div className="qm-fig-row"><HandEditor hand={hand} onChange={setHand} /><span className="qm-hint">counts: [{countsOf(hand).slice(1).join(', ')}] · sum {hand.reduce((a, b) => a + b, 0)}</span></div>
    <Bars digits={0} max={50} rows={BOXES.map((name, b) => ({ label: name, value: score(hand, b), mark: score(hand, b) > 0 }))} />
  </div>
}

const patternOf = h => countsOf(h).slice(1).filter(Boolean).sort((a, b) => b - a)
const PATTERNS = [[5], [4, 1], [3, 2], [3, 1, 1], [2, 2, 1], [2, 1, 1, 1], [1, 1, 1, 1, 1]]
const PATTERN_NAMES = ['five alike', 'four + one', 'three + two', 'three + one + one', 'two pairs + one', 'one pair', 'all different']
const groups = PATTERNS.map(p => HANDS.filter(h => patternOf(h).join() === p.join()))

// 1.3: all 252 hands, grouped by pattern.
export function HandGallery() {
  const [picked, setPicked] = useState([1, 2, 3, 4, 5])
  const counts = countsOf(picked)
  return <div className="qm-fig">
    <div className="tt-gallery">{groups.map((hands, g) => <section key={g}>
      <h4>{PATTERN_NAMES[g]} <small>({hands.length} hands)</small></h4>
      <div className="tt-chips">{hands.map(h => <button key={h.join('')} className={h.join('') === picked.join('') ? 'active' : ''} onClick={() => setPicked(h)}>{h.join('')}</button>)}</div>
    </section>)}</div>
    <div className="qm-fig-row"><DiceRow dice={picked} />
      <p>ways{tuple(picked)} = 5! / ({[1, 2, 3, 4, 5, 6].filter(f => counts[f]).map(f => `${counts[f]}!`).join(' × ')}) = <b>{ways(picked)}</b> of 7,776 ordered rolls · chance <b>{fmt(handProbability(picked), 5)}</b></p>
    </div>
  </div>
}

// 1.4: the seven patterns, their counts and chances.
export function PatternTable() {
  let total = 0
  return <div className="qm-fig">
    <table className="qm-mathcode"><thead><tr><th>Pattern</th><th>Hands</th><th>Ways for one hand</th><th>Chance of the pattern</th></tr></thead>
      <tbody>{groups.map((hands, g) => { const p = hands.reduce((s, h) => s + handProbability(h), 0); total += p; return <tr key={g}><td>{PATTERN_NAMES[g]}</td><td>{hands.length}</td><td>{ways(hands[0])}</td><td>{fmt(p, 5)} <small>({(100 * p).toFixed(2)}%)</small></td></tr> })}
        <tr><td><b>All</b></td><td><b>{HANDS.length}</b></td><td /><td><b>{fmt(total, 5)}</b></td></tr></tbody></table>
    <p className="qm-hint">Hands × ways, added over all patterns, is 7,776. "One pair" is the commonest pattern: almost half of all rolls.</p>
  </div>
}

// 1.5: keep some dice; every outcome of the reroll with its chance.
export function RerollOutcomes() {
  const [hand, setHand] = useState([1, 3, 6, 6, 6]), [kept, setKept] = useState([2, 3, 4])
  const keptDice = sorted(kept.map(i => hand[i]))
  const list = useMemo(() => outcomes(keptDice).sort((a, b) => b.chance - a.chance), [keptDice.join('')])
  const sum = list.reduce((s, o) => s + o.chance, 0)
  const yahtzee = list.filter(o => new Set(o.hand).size === 1).reduce((s, o) => s + o.chance, 0)
  return <div className="qm-fig">
    <div className="qm-fig-row">
      <DiceRow dice={hand} kept={kept} onDie={i => setKept(k => k.includes(i) ? k.filter(x => x !== i) : [...k, i])} size={40} />
      <div className="qm-buttons"><button onClick={() => { const rng = new PyRandom(Date.now() % 100000); setHand(sorted(roll(5, rng))); setKept([]) }}>New hand</button></div>
    </div>
    <p>Keep <span className="mono">{tuple(keptDice)}</span>, reroll {5 - keptDice.length} {5 - keptDice.length === 1 ? 'die' : 'dice'}: <b>{list.length}</b> possible hands. Chances add up to <b>{fmt(sum, 6)}</b>. Chance of a Yahtzee: <b>{fmt(yahtzee, 4)}</b>.</p>
    <div className="tt-out-list">{list.slice(0, 24).map(o => <span key={o.hand.join('')} className="tt-out-chip"><span className="mono">{o.hand.join('')}</span><b>{fmt(o.chance, 4)}</b></span>)}{list.length > 24 && <span className="qm-hint">… and {list.length - 24} more</span>}</div>
  </div>
}

// 1.6: twenty estimates of the chasing chance, against the exact value ± 2 SE.
export function SimulateFig() {
  const [turns, setTurns] = useState(2000)
  const p = chaseSteps()[2][5], se = Math.sqrt(p * (1 - p) / turns)
  const estimates = useMemo(() => spread(turns, 20), [turns])
  const lo = 0.02, hi = 0.075, W = 460, X = v => 20 + (v - lo) / (hi - lo) * (W - 40)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Turns per estimate <select value={turns} onChange={e => setTurns(Number(e.target.value))}>{[100, 500, 2000, 10000, 40000].map(n => <option key={n} value={n}>{n.toLocaleString()}</option>)}</select></label></div>
    <svg viewBox={`0 0 ${W} 110`} className="qm-plot" role="img" aria-label="Estimates">
      <rect x={X(Math.max(lo, p - 2 * se))} width={X(Math.min(hi, p + 2 * se)) - X(Math.max(lo, p - 2 * se))} y="20" height="60" fill="#1f6f6822" />
      <line x1={X(p)} x2={X(p)} y1="12" y2="88" stroke="#1f6f68" strokeWidth="2" />
      {estimates.map((e, i) => <circle key={i} cx={X(Math.min(hi, Math.max(lo, e)))} cy={28 + (i % 5) * 11} r="4.5" fill="#c26a12" opacity="0.85" />)}
      {[0.02, 0.03, 0.04, 0.05, 0.06, 0.07].map(t => <text key={t} x={X(t)} y="104" className="qm-tick" textAnchor="middle">{(100 * t).toFixed(0)}%</text>)}
    </svg>
    <p>Exact: <b>{(100 * p).toFixed(3)}%</b>. Standard error for {turns.toLocaleString()} turns: <b>{(100 * se).toFixed(3)}</b> percentage points. Estimates: {(100 * Math.min(...estimates)).toFixed(2)}% to {(100 * Math.max(...estimates)).toFixed(2)}%.</p>
  </div>
}

// 1.7: the chase's transition matrix and the distribution after each roll.
export function ChaseChain() {
  const P = chaseMatrix(), steps = chaseSteps()
  return <div className="qm-fig">
    <table className="qm-mathcode tt-matrix"><thead><tr><th>from k \ to j</th>{[1, 2, 3, 4, 5].map(j => <th key={j}>{j}</th>)}<th>row sum</th></tr></thead>
      <tbody>{[1, 2, 3, 4, 5].map(k => <tr key={k}><th>{k}</th>{[1, 2, 3, 4, 5].map(j => <td key={j} className={P[k][j] ? '' : 'qm-dim'}>{P[k][j] ? fmt(P[k][j], 4) : '0'}</td>)}<td>{fmt(P[k].reduce((a, b) => a + b, 0), 4)}</td></tr>)}</tbody></table>
    <div className="tt-chain">{steps.map((dist, r) => <div key={r}><h4>After roll {r + 1}</h4><Bars max={0.6} rows={[1, 2, 3, 4, 5].map(k => ({ label: `k = ${k}`, value: dist[k], mark: k === 5 }))} digits={4} /></div>)}</div>
    <Plot series={[{ label: 'P(Yahtzee)', color: '#c26a12', values: steps.map(d => d[5]) }]} window={1} x="roll" label="Chance of a Yahtzee after each roll" height={120} />
  </div>
}

