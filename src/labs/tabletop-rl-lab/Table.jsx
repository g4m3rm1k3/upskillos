// The game table: three seats, each you or a player from the lab (Chaser, Planner, learned players,
// your Workshop players), real Yahtzee rules from engine/game.js, 3D dice, and the reasoning behind
// every model decision. Each turn draws its 15 dice in advance from the table's seed, exactly as
// play_turn does, so a seed replays the same dice for the same decisions.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { BOXES, HINTS, PyRandom, roll, sorted } from './engine/dice.js'
import { newCard, legalBoxes, points, write, total } from './engine/game.js'
import { makePlayer } from './players.js'

const DiceScene = lazy(() => import('./DiceScene.jsx'))
const freshTurn = () => ({ dice: [1, 2, 3, 4, 5], rolls: 0, held: 0, tape: null })
const complete = card => card.boxes.every(b => b !== null)
const tupleOf = xs => `(${xs.join(', ')})`
// The physical dice to keep for a kept multiset: the first matching die of each value.
function maskFor(dice, kept) {
  const left = [...kept]
  let mask = 0
  dice.forEach((d, i) => { const j = left.indexOf(d); if (j >= 0) { mask |= 1 << i; left.splice(j, 1) } })
  return mask
}

export default function Table({ players, visible = true }) {
  const [seats, setSeats] = useState(['human', 'boxes', 'planner']), [cards, setCards] = useState(() => [newCard(), newCard(), newCard()])
  const [active, setActive] = useState(0), [turn, setTurn] = useState(freshTurn)
  const [busy, setBusy] = useState(false), [rollId, setRollId] = useState(0), [lastHeld, setLastHeld] = useState(0), [auto, setAuto] = useState(false)
  const [seed, setSeed] = useState(1), [events, setEvents] = useState(['A fresh scorecard. Same seed, same dice: decisions make the difference.'])
  const [advice, setAdvice] = useState(false)
  const rng = useRef(new PyRandom(1)), timer = useRef(null)
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const started = turn.rolls > 0 || cards.some(c => c.boxes.some(b => b !== null))
  const spec = id => players.find(p => p.id === id)
  // One player object per seat: a Planner keeps this turn's solution inside it.
  const seated = useMemo(() => seats.map(id => id === 'human' || !spec(id) ? null : makePlayer(spec(id))), [seats.join(), players])
  const advisor = useMemo(() => makePlayer(spec('bonus') ?? players[players.length - 1]), [players])
  const names = seats.map(id => id === 'human' ? 'You' : spec(id)?.name ?? 'Player')
  const player = seated[active], human = seats[active] === 'human', done = cards.every(complete)
  const card = cards[active], hand = sorted(turn.dice)
  const options = turn.rolls ? legalBoxes(card, hand).map(box => ({ box, points: points(card, hand, box) })) : []
  const round = Math.min(13, card.boxes.filter(b => b !== null).length + 1)
  const thinker = human ? (advice ? advisor : null) : player
  const addEvent = text => setEvents(old => [text, ...old].slice(0, 6))
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { if (!visible) setAuto(false) }, [visible])
  useEffect(() => {
    const pause = () => setAuto(false)
    window.addEventListener('blur', pause); document.addEventListener('visibilitychange', pause)
    return () => { window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', pause) }
  }, [])

  function rolling(held = turn.held) {
    let next
    if (!turn.rolls) {
      const tape = roll(15, rng.current)
      next = { dice: tape.slice(0, 5), rolls: 1, held: 0, tape }
      ;(human ? (advice ? advisor : null) : player)?.startTurn(card)
    } else {
      const fresh = turn.tape.slice(5 * turn.rolls)
      let k = 0
      next = { ...turn, dice: turn.dice.map((d, i) => held & (1 << i) ? d : fresh[k++]), rolls: turn.rolls + 1, held: 0 }
      const kept = turn.dice.filter((_, i) => held & (1 << i))
      addEvent(`${names[active]} kept ${kept.length ? kept.join(', ') : 'nothing'} and rolled ${5 - kept.length}.`)
    }
    setLastHeld(turn.rolls ? held : 0); setTurn(next); setRollId(n => n + 1); setBusy(true)
    clearTimeout(timer.current); timer.current = setTimeout(() => setBusy(false), reduced ? 80 : 1050)
  }
  function scoring(box) {
    const option = options.find(o => o.box === box)
    if (!option || busy) return
    setCards(cards.map((c, i) => i === active ? write(c, hand, box) : c))
    addEvent(`${names[active]} wrote ${tupleOf(hand)} in ${BOXES[box]}: +${option.points}.`)
    setTurn(freshTurn()); setLastHeld(31); setRollId(n => n + 1)
    setActive((active + 1) % 3)
  }
  function modelStep() {
    if (!player || busy || done) return
    if (!turn.rolls) { rolling(0); return }
    if (turn.rolls === 3) { scoring(player.box(card, hand)); return }
    const kept = player.keep(card, hand, 3 - turn.rolls)
    rolling(maskFor(turn.dice, kept))
  }
  useEffect(() => {
    if (!visible || !auto || human || busy || done) return
    const id = setTimeout(modelStep, 700)
    return () => clearTimeout(id)
  })
  const toggle = i => { if (human && !busy && turn.rolls && turn.rolls < 3) setTurn(t => ({ ...t, held: t.held ^ (1 << i) })) }
  function reset() {
    clearTimeout(timer.current); setBusy(false); setAuto(false); setCards([newCard(), newCard(), newCard()]); setTurn(freshTurn()); setActive(0); setLastHeld(31); setRollId(n => n + 1); rng.current = new PyRandom(seed); setEvents(['Fresh paper. New possibilities.'])
  }
  const best = Math.max(...cards.map(total))
  const reasoning = () => {
    if (!thinker || !turn.rolls) return <p>{human ? 'Turn on the advisor to see what the Bonus learner would do.' : 'Watch a model\'s turn to see its reasoning.'}</p>
    if (!thinker.keepValues) return <p>The Chaser doesn't plan: it keeps its biggest group and writes the most points now.</p>
    if (turn.rolls < 3) return <>{thinker.keepValues(hand, 3 - turn.rolls).slice(0, 3).map(r => <div className="tt-q-row" key={r.kept.join('')}><span>Keep {r.kept.length ? r.kept.join(', ') : 'nothing'}{r.kept.length === 5 ? ' (stand)' : ''}</span><b>{r.value.toFixed(2)}<small> expected</small></b></div>)}
      <p className="tt-muted">Expected value of the turn's end: points now{thinker.value ? ' + the learned value of the card left' : ''}. Exact, from backward induction over the dice.</p></>
    return <>{legalBoxes(card, hand).map(b => ({ b, w: thinker.worth(card, hand, b) })).sort((a, b) => b.w - a.w).slice(0, 4).map(({ b, w }) => <div className="tt-q-row" key={b}><span>{BOXES[b]}: +{points(card, hand, b)}</span><b>{w.toFixed(2)}<small> {thinker.value ? 'points + future' : 'points'}</small></b></div>)}</>
  }
  return <section className="tt-table" aria-label="Yahtzee game table">
    <div className="tt-table-top"><div><span className="tt-eyebrow">THE TABLE · YAHTZEE</span><h2>A good roll is only<br />half the story.</h2><p>Play the lab's players, or watch them play each other.</p></div><div className="tt-game-info"><span>ROUND <b>{round} / 13</b></span><span>AT THE TABLE <b>3 players</b></span><button onClick={reset}>New table ↺</button></div></div>
    <div className="tt-table-grid"><div className="tt-play-side">
      <div className="tt-seats">{seats.map((id, i) => <label key={i} className={`${i === active && !done ? 'current' : ''} seat-${i}`}><span>{i === active && !done ? '● AT PLAY' : `PLAYER ${i + 1}`}</span><select aria-label={`Player ${i + 1}`} disabled={started || busy} value={id} onChange={e => setSeats(old => old.map((s, j) => j === i ? e.target.value : s))}>{(id === 'human' || !seats.includes('human')) && <option value="human">You</option>}{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><b>{total(cards[i])}<small> pts</small></b></label>)}</div>
      <div className="tt-tray"><div className="tt-tray-heading"><span>{done ? 'THE SCORES ARE IN' : human ? 'YOUR TURN' : `${names[active].toUpperCase()}’S TURN`}</span><span>{busy ? 'ROLLING…' : turn.rolls ? `ROLL ${turn.rolls} OF 3` : 'READY TO ROLL'}</span></div><div className="tt-dice-canvas"><Suspense fallback={<div className="tt-fallback">Setting the dice…</div>}>{visible && <DiceScene turn={turn} rollId={rollId} lastHeld={lastHeld} onHold={toggle} disabled={!human || busy || !turn.rolls || turn.rolls === 3 || done} reduced={reduced} />}</Suspense></div><div className="tt-tray-note">{turn.rolls ? 'Tap a die to keep it. Kept dice sit along the back rail.' : 'Five dice. Three rolls. Make them count.'}</div></div>
      <div className="tt-dice-controls" aria-label="Keep dice">{turn.dice.map((d, i) => <button key={i} aria-label={`Die ${i + 1}: ${turn.rolls ? d : 'not rolled'}`} aria-pressed={!!(turn.held & (1 << i))} disabled={!human || busy || !turn.rolls || turn.rolls === 3 || done} onClick={() => toggle(i)}><b>{turn.rolls ? '⚀⚁⚂⚃⚄⚅'[d - 1] : '·'}</b><span>{turn.held & (1 << i) ? 'KEPT' : 'KEEP'}</span></button>)}</div>
      {done ? <div className="tt-outcome" role="status"><span>FINAL SCORE</span><h3>{names.filter((_, i) => total(cards[i]) === best).join(' & ')} {cards.filter(c => total(c) === best).length > 1 ? 'tie' : 'wins'} · {best}</h3><p>One game is a story. Lesson 4.4 says how many games make evidence.</p></div> : <div className="tt-actions">{human ? <><button className="tt-primary" disabled={busy || turn.rolls === 3} onClick={() => rolling()}>{busy ? 'Rolling…' : !turn.rolls ? 'Roll the dice' : 'Reroll loose dice'}</button><p>{turn.rolls ? 'Or choose a pencilled score on your sheet →' : 'Your scorecard is waiting.'}</p></> : <><button className="tt-primary" disabled={busy} onClick={modelStep}>Next model decision →</button><button onClick={() => setAuto(v => !v)}>{auto ? 'Pause models' : 'Watch models play'}</button></>}</div>}
      {human && !done && <label className="tt-auto"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> Let models take their turns automatically</label>}
      <details className="tt-inspector" open><summary>Inside the decision <span>{human ? (advice ? 'Advisor: Bonus learner' : 'Your turn') : names[active]}</span></summary>
        {human && <label className="tt-auto"><input type="checkbox" checked={advice} onChange={e => { setAdvice(e.target.checked); if (e.target.checked && turn.rolls) advisor.startTurn(card) }} /> Show what the Bonus learner would do</label>}
        {reasoning()}</details>
      <div className="tt-events"><span className="tt-eyebrow">TABLE NOTES</span>{events.map((event, i) => <p key={`${i}-${event}`}>{event}</p>)}</div>
      <label className="tt-seed">Table seed <input type="number" min="0" max="999999" value={seed} onChange={e => setSeed(Math.max(0, Math.min(999999, Math.floor(Number(e.target.value) || 0))))} /> <span>Applied with New table. Every turn draws its 15 dice from it, in order.</span></label>
    </div><div className="tt-paper-wrap"><div className="tt-pencil" aria-hidden="true" /><section className="tt-paper" aria-label="Paper scorecard"><div className="tt-paper-heading"><span>THE TABLETOP CLUB</span><h2>Yahtzee</h2><p>a little luck, a little learning.</p><div className="tt-paper-rule" /></div><table><thead><tr><th>Score sheet <small>choose an empty box</small></th>{names.map((name, i) => <th key={i} className={active === i ? 'active-column' : ''}>{name}</th>)}</tr></thead><tbody>{BOXES.map((name, c) => <tr key={name} className={`${c === 6 ? 'section-start' : ''} ${c === 11 ? 'yahtzee-row' : ''}`}><th scope="row">{name}<small>{HINTS[c]}</small></th>{cards.map((sheet, i) => { const option = options.find(o => o.box === c); return <td key={i} className={active === i ? 'active-column' : ''}>{sheet.boxes[c] !== null ? <span className="tt-written" style={{ transform: `rotate(${(c * 7 + i * 3) % 7 - 3}deg)` }}>{sheet.boxes[c] === 0 ? '—' : sheet.boxes[c]}</span> : i === active && option && !done ? <button disabled={!human || busy} onClick={() => scoring(c)} aria-label={`Score ${option.points} in ${name}`} className="tt-score-option">{option.points}<span>+</span></button> : <span className="tt-empty">·</span>}</td> })}</tr>)}
      <tr className="section-start"><th>Upper bonus<small>35 if upper ≥ 63</small></th>{cards.map((c, i) => <td key={i}><span className="tt-written">{c.upper >= 63 ? 35 : `${c.upper}/63`}</span></td>)}</tr><tr><th>Extra Yahtzees<small>100 each · Joker rule</small></th>{cards.map((c, i) => <td key={i}><span className="tt-written">{c.extra ? 100 * c.extra : '—'}</span></td>)}</tr><tr className="tt-total"><th>Grand total</th>{cards.map((c, i) => <td key={i}><span className="tt-written">{total(c)}</span></td>)}</tr></tbody></table><p className="tt-paper-footer">Keep the dice. Learn the odds. Play again.</p></section></div></div>
  </section>
}
