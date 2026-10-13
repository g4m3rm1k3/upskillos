// Part 4 figures: the scorecard's rules, a whole game replayed turn by turn, where each player's
// points come from, score distributions, a card's learned value, TD(0) live, the learned weights,
// and every player on one scale.
import { useEffect, useMemo, useRef, useState } from 'react'
import { BOXES, PyRandom, roll, sorted } from '../engine/dice.js'
import { newCard, legalBoxes, points, write, total, playTurn, value, features, FEATURE_NAMES, playGames, Planner, mean, standardError, isJoker } from '../engine/game.js'
import M from '../engine/measured.json'
import { SUPPLIED, makePlayer, supplied } from '../players.js'
import { DiceRow, HandEditor, Bars, Slider, tuple, fmt } from './ui.jsx'

const P = M.players
const PRESETS = {
  empty: { label: 'An empty card', card: newCard() },
  bonus: { label: 'Upper section at 48, Sixes open', card: { boxes: [3, 6, 9, 12, 18, null, 20, null, 25, null, null, null, null], upper: 48, extra: 0 } },
  joker: { label: 'Yahtzee holds 50, Fives holds 15', card: { boxes: [null, null, null, null, 15, null, null, null, null, null, null, 50, null], upper: 15, extra: 0 } },
}

// 4.1: legal boxes and the points each adds.
export function ScorecardFig() {
  const [preset, setPreset] = useState('bonus'), [hand, setHand] = useState([5, 5, 6, 6, 6])
  const card = PRESETS[preset].card, legal = legalBoxes(card, hand)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Card <select value={preset} onChange={e => setPreset(e.target.value)}>{Object.entries(PRESETS).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}</select></label><HandEditor hand={hand} onChange={x => setHand(sorted(x))} /></div>
    {isJoker(card, hand) && <p className="qm-feedback">An extra Yahtzee: the Joker rule applies.</p>}
    <table className="qm-mathcode"><thead><tr><th>Box</th><th>On the card</th><th>Legal now?</th><th>points(card, hand, box)</th></tr></thead>
      <tbody>{BOXES.map((name, b) => <tr key={b} className={legal.includes(b) ? '' : 'qm-row-dim'}><td>{name}</td><td>{card.boxes[b] ?? 'open'}</td><td>{legal.includes(b) ? 'yes' : '—'}</td><td>{legal.includes(b) ? <b>{points(card, hand, b)}</b> : ''}</td></tr>)}</tbody></table>
    <p className="qm-hint">Upper total {card.upper} of 63 · total so far {total(card)}.</p>
  </div>
}

// Records one game: every turn's dice, keeps, box and points.
function record(spec, seed) {
  const player = makePlayer(spec), rng = new PyRandom(seed), turns = []
  let card = newCard()
  for (let t = 0; t < 13; t++) {
    const dice = roll(15, rng), keeps = []
    const hand = playTurn(player, card, dice, k => keeps.push(k))
    const box = player.box(card, hand), gained = points(card, hand, box)
    turns.push({ dice, keeps, hand, box, gained, before: card })
    card = write(card, hand, box)
  }
  return { turns, card }
}
// 4.2, 4.3: a whole game, turn by turn.
export function GameReplay({ player: p0 = 'chaser' }) {
  const [id, setId] = useState(p0), [seed, setSeed] = useState(1000000), [t, setT] = useState(0)
  const game = useMemo(() => record(supplied(id), seed), [id, seed])
  const turn = game.turns[t]
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label>Player <select value={id} onChange={e => setId(e.target.value)}>{SUPPLIED.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>Game seed <input type="number" min="0" value={seed} onChange={e => setSeed(Math.max(0, Math.floor(Number(e.target.value) || 0)))} /></label>
      <Slider label="turn" value={t + 1} min={1} max={13} step={1} onChange={v => setT(v - 1)} />
    </div>
    <p className="qm-hint">This turn's 15 dice: <span className="mono">{turn.dice.slice(0, 5).join(' ')} | {turn.dice.slice(5, 10).join(' ')} | {turn.dice.slice(10).join(' ')}</span></p>
    <div className="tt-replay">{turn.keeps.map((k, i) => <div key={i}><DiceRow dice={k.hand} size={30} /><span>keeps <span className="mono">{tuple(k.kept)}</span></span></div>)}
      <div><DiceRow dice={turn.hand} size={30} /><span>→ <b>{BOXES[turn.box]}</b> for <b>{turn.gained}</b></span></div></div>
    <table className="qm-mathcode tt-card-mini"><tbody>{BOXES.map((name, b) => { const v = game.turns.findIndex(x => x.box === b); return <tr key={b} className={v === t ? 'tt-now' : v > t || v < 0 ? 'qm-row-dim' : ''}><td>{name}</td><td>{v >= 0 && v <= t ? write(game.turns[v].before, game.turns[v].hand, b).boxes[b] : ''}</td><td className="qm-hint">{v >= 0 && v <= t ? `turn ${v + 1}` : ''}</td></tr> })}</tbody></table>
    <p>Final score: <b>{total(game.card)}</b>{game.card.upper >= 63 ? ' (with the upper bonus)' : ` (upper ${game.card.upper}: no bonus)`}{game.card.extra ? ` + ${game.card.extra} extra Yahtzee${game.card.extra > 1 ? 's' : ''}` : ''}.</p>
  </div>
}

const COLORS = { chaser: '#9a8f7a', planner: '#c26a12', boxes: '#1f6f68', bonus: '#5b4bb5' }
// 4.3: average points per box, per player.
export function WherePoints() {
  return <div className="qm-fig">
    <table className="qm-mathcode tt-where"><thead><tr><th>Box</th>{SUPPLIED.map(p => <th key={p.id}>{p.name}</th>)}</tr></thead>
      <tbody>{BOXES.map((name, b) => <tr key={b}><td>{name}</td>{SUPPLIED.map(p => <td key={p.id}>{fmt(P[p.id].boxes[b], 2)}</td>)}</tr>)}
        <tr><td>Upper bonus reached</td>{SUPPLIED.map(p => <td key={p.id}>{(100 * P[p.id].bonusRate).toFixed(1)}%</td>)}</tr>
        <tr><td>Extra Yahtzees per game</td>{SUPPLIED.map(p => <td key={p.id}>{fmt(P[p.id].extra, 3)}</td>)}</tr>
        <tr><td><b>Average total</b></td>{SUPPLIED.map(p => <td key={p.id}><b>{fmt(P[p.id].mean, 1)}</b></td>)}</tr></tbody></table>
  </div>
}

// 4.4: the score distributions.
export function Histograms() {
  const W = 460, H = 180, n = 17, top = Math.max(...SUPPLIED.flatMap(p => P[p.id].histogram))
  return <div className="qm-fig">
    <svg viewBox={`0 0 ${W} ${H}`} className="qm-plot" role="img" aria-label="Score distributions">
      {SUPPLIED.map(p => <polyline key={p.id} fill="none" stroke={COLORS[p.id]} strokeWidth="2" points={P[p.id].histogram.map((c, i) => `${30 + (i + 0.5) * (W - 40) / n},${H - 24 - c / top * (H - 40)}`).join(' ')} />)}
      {[0, 100, 200, 300, 400].map(s => <text key={s} x={30 + s / 25 * (W - 40) / n} y={H - 6} className="qm-tick" textAnchor="middle">{s}</text>)}
    </svg>
    <p className="tt-legend">{SUPPLIED.map(p => <span key={p.id} style={{ color: COLORS[p.id] }}>■ {p.name}: {fmt(P[p.id].mean, 1)} ± {fmt(P[p.id].se, 2)} (SD {fmt(P[p.id].sd, 1)})</span>)}</p>
    <p className="qm-hint">How many of 2,000 games scored in each 25-point band.</p>
  </div>
}

// 4.6: a card's value under the learned weights.
export function CardValueFig() {
  const [which, setWhich] = useState('boxes'), [open, setOpen] = useState(() => Array(13).fill(true)), [upper, setUpper] = useState(0)
  const spec = P[which], card = { boxes: open.map(o => o ? null : 0), upper, extra: 0 }
  const x = features(card, spec.bonus)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Weights <select value={which} onChange={e => setWhich(e.target.value)}><option value="boxes">open boxes only</option><option value="bonus">with bonus bands</option></select></label>
      <Slider label="upper total" value={upper} min={0} max={80} step={1} onChange={setUpper} /></div>
    <div className="tt-toggles">{BOXES.map((name, b) => <label key={b}><input type="checkbox" checked={open[b]} onChange={() => setOpen(o => o.map((v, j) => j === b ? !v : v))} /> {name}</label>)}</div>
    <p>V̂(card) = Σ wᵢxᵢ = <b>{fmt(value(spec.weights, card, spec.bonus), 2)}</b> points still to come.</p>
    <p className="qm-hint">Features on: {x.map((v, i) => v ? FEATURE_NAMES[i] : null).filter(Boolean).join(', ') || 'none'}.</p>
  </div>
}

// 4.7: TD(0) in the browser, a few games at a time.
export function TDTrainer() {
  const [games, setGames] = useState(300), [alpha, setAlpha] = useState(0.01), [bonus, setBonus] = useState(false), [seed, setSeed] = useState(0)
  const [state, setState] = useState(null), [grade, setGrade] = useState(null), timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  function run() {
    clearTimeout(timer.current); setGrade(null)
    const weights = Array(features(newCard(), bonus).length).fill(0), planner = new Planner(card => value(weights, card, bonus)), rng = new PyRandom(seed)
    let g = 0
    const step = () => {
      for (let k = 0; k < 10 && g < games; k++, g++) {
        let card = newCard()
        for (let t = 0; t < 13; t++) {
          const hand = playTurn(planner, card, roll(15, rng)), box = planner.box(card, hand), reward = points(card, hand, box), next = write(card, hand, box)
          const error = reward + value(weights, next, bonus) - value(weights, card, bonus), x = features(card, bonus)
          for (let i = 0; i < weights.length; i++) weights[i] += alpha * error * x[i]
          card = next
        }
      }
      setState({ weights: [...weights], done: g, bonus })
      if (g < games) timer.current = setTimeout(step, 0)
    }
    step()
  }
  const graded = () => { const s = playGames(new Planner(card => value(state.weights, card, state.bonus)), 200, M.evalSeed); setGrade({ mean: mean(s), se: standardError(s) }) }
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label>Games <select value={games} onChange={e => setGames(Number(e.target.value))}>{[50, 100, 300, 1000, 3000].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      <label>α <select value={alpha} onChange={e => setAlpha(Number(e.target.value))}>{[0.003, 0.01, 0.03].map(a => <option key={a} value={a}>{a}</option>)}</select></label>
      <label><input type="checkbox" checked={bonus} onChange={e => setBonus(e.target.checked)} /> bonus bands</label>
      <label>Seed <input type="number" min="0" value={seed} onChange={e => setSeed(Math.max(0, Math.floor(Number(e.target.value) || 0)))} /></label>
      <button className="qm-primary" onClick={run}>Train</button>
      {state && state.done === games && <button onClick={graded}>Grade on 200 games</button>}
    </div>
    {state ? <>
      <p>{state.done} of {games} games played. Value of the empty card: <b>{fmt(value(state.weights, newCard(), state.bonus), 1)}</b>.</p>
      <Bars digits={1} rows={state.weights.map((w, i) => ({ label: FEATURE_NAMES[i], value: w }))} />
      {grade && <p role="status">Graded on 200 games (seeds from {M.evalSeed.toLocaleString()}): <b>{fmt(grade.mean, 1)}</b> ± {fmt(grade.se, 1)}.</p>}
    </> : <p className="qm-hint">Press Train. The weights start at 0 (the one-turn Planner) and update after every turn.</p>}
  </div>
}

// 4.7, 4.8: the supplied players' learned weights.
export function LearnedWeights({ which = 'boxes' }) {
  const spec = P[which]
  return <div className="qm-fig">
    <Bars digits={1} rows={spec.weights.map((w, i) => ({ label: FEATURE_NAMES[i], value: w, mark: i >= 13 }))} />
    <p className="qm-hint">Trained {spec.games.toLocaleString()} games, α = {spec.alpha}, seed {spec.seed}. Average over 2,000 evaluation games: {fmt(spec.mean, 2)} ± {fmt(spec.se, 2)}.</p>
  </div>
}

// 4.9, 5.1: every player on one scale.
export function Ladder() {
  const rows = [...SUPPLIED.map(p => ({ name: p.name, mean: P[p.id].mean, se: P[p.id].se, color: COLORS[p.id] })), { name: 'Optimal (published)', mean: 254.59, se: 0, color: '#222' }]
  const lo = 140, hi = 260, W = 460, X = v => 130 + (v - lo) / (hi - lo) * (W - 150)
  return <div className="qm-fig">
    <svg viewBox={`0 0 ${W} ${rows.length * 28 + 24}`} className="qm-plot" role="img" aria-label="Players on one scale">
      {rows.map((r, i) => <g key={r.name}><text x="4" y={i * 28 + 22} className="qm-tick">{r.name}</text>
        <line x1={X(r.mean - 2 * r.se)} x2={X(r.mean + 2 * r.se)} y1={i * 28 + 18} y2={i * 28 + 18} stroke={r.color} strokeWidth="2" />
        <circle cx={X(r.mean)} cy={i * 28 + 18} r="5" fill={r.color} /><text x={X(r.mean) + 8} y={i * 28 + 14} className="qm-tick">{fmt(r.mean, 1)}</text></g>)}
      {[150, 175, 200, 225, 250].map(t => <text key={t} x={X(t)} y={rows.length * 28 + 18} className="qm-tick" textAnchor="middle">{t}</text>)}
    </svg>
  </div>
}

