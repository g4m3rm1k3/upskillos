import React, { useMemo, useState } from 'react'
import Stepper from '../Stepper.jsx'
import { traceChoose } from '../traces-part3.js'
import { PIECES } from '../python/pieces.js'
import { ACTIONS, ARROW, makeRng, dice } from '../world.js'
import { runBandit, pullArm, choosePiece } from '../world-part3.js'
import { norm } from '../runtime/checks.js'

const r4 = x => Number(x.toFixed(4))
export const MEANS = { A: 1, B: 2, C: 4 }
const ARMS = ['A', 'B', 'C']

// Average pay per pull over many runs, for one eps (measured; explore.test re-checks the claims).
export function banditScore(eps, runs = 300, steps = 500) {
  let tot = 0, onBest = 0
  for (let r = 0; r < runs; r++) {
    const rng = makeRng(1000 + r)
    let got = 0
    const pull = (a, g) => { const x = pullArm(MEANS)(a, g); got += x; return x }
    const [, counts] = runBandit(pull, ARMS, steps, eps, rng)
    tot += got / steps
    if (counts.C > steps / 2) onBest++
  }
  return { avg: tot / runs, onBest, runs }
}

// ---------------------------------------------------------------- the slot machines (Try it)
function SlotMachines({ onDone }) {
  const [order] = useState(() => { const m = [1, 2, 4]; const rng = makeRng(Date.now() % 9973); for (let i = 2; i > 0; i--) { const j = Math.floor(rng.random() * (i + 1)); [m[i], m[j]] = [m[j], m[i]] } return m })
  const [rng] = useState(() => makeRng(Date.now() % 7919))
  const [pulls, setPulls] = useState([])
  const left = 20 - pulls.length
  const pull = i => {
    if (left <= 0) return
    const x = Math.round((order[i] + 2 * rng.random() - 1) * 100) / 100
    const next = [...pulls, { i, x }]
    setPulls(next)
    if (next.length === 20) onDone()
  }
  const total = pulls.reduce((s, p) => s + p.x, 0)
  return (
    <div className="mlf-play">
      <p>Three machines, each paying a different amount on average (plus some noise). You have <strong>20 pulls</strong>. Win as much as you can.</p>
      <div className="mlf-run-controls">{['Machine 1', 'Machine 2', 'Machine 3'].map((m, i) => <button key={m} type="button" className="mlf-secondary" onClick={() => pull(i)} disabled={left <= 0}>🎰 {m}</button>)}</div>
      <p className="mlf-total">pulls left: <strong>{left}</strong> · total won: <strong>{r4(total)}</strong></p>
      <table className="mlf-table"><thead><tr><th>machine</th><th>pulls</th><th>your average</th>{left <= 0 && <th>its true average</th>}</tr></thead>
        <tbody>{[0, 1, 2].map(i => { const mine = pulls.filter(p => p.i === i); return <tr key={i}><td>Machine {i + 1}</td><td>{mine.length}</td><td>{mine.length ? r4(mine.reduce((s, p) => s + p.x, 0) / mine.length) : '—'}</td>{left <= 0 && <td>{order[i]}</td>}</tr> })}</tbody></table>
      {left <= 0 && <p className="mlf-feedback good" role="status">Always pulling the best machine would have won about {20 * 4}. You won {r4(total)}. Did you spend pulls checking machines that looked worse, and did that pay off?</p>}
    </div>
  )
}

// ---------------------------------------------------------------- Try it first
export const TRY_EXPLORE = {
  lead: 'Lesson 10 ended with a problem: a guess that is never tried is never corrected. So a learner has to decide, again and again, between **repeating** what looks best and **trying** something else to find out. Play first.',
  steps: [
    { task: SlotMachines },
    { choice: {
      id: 'explore-try-greedy',
      teach: '**Greedy** means: always pull the machine whose average so far is highest. Machines you haven\'t pulled have a guess of 0.',
      prompt: 'Your first pull, on machine 1, paid 1.2. Machines 2 and 3 are untried (guess 0). What does a greedy player do from now on?',
      options: [
        { text: 'Tries machines 2 and 3 to compare', why: 'Greedy never tries a machine whose guess is lower. 0 is lower than 1.2.' },
        { text: 'Pulls machine 1 forever: 1.2 beats 0, and the other guesses never change because they are never tried.', why: 'One lucky first result locks it in. If machine 3 pays 4 on average, greedy never finds out. That is what happened in 300 out of 300 simulated runs with these machines.' },
        { text: 'Picks at random', why: 'That is the opposite of greedy: it ignores the guesses.' },
      ],
      answer: 1,
    } },
    { predict: {
      id: 'explore-try-eps',
      teach: '**Epsilon-greedy** fixes it with a coin: with chance eps (say 0.1), pull a machine at random; otherwise be greedy. So every machine keeps getting tried now and then, and its guess keeps being corrected.',
      prompt: 'With eps = 0.1, about how many of 1000 pulls are random?',
      answer: 100, tolerance: 0.5,
      misconceptions: [{ answer: 33, tolerance: 1, feedback: 'About 33 of the random pulls land on each machine, but the question is about all the random pulls: 10% of 1000.' }],
      explain: '0.1 × 1000 = 100 random pulls, about 33 per machine. The other 900 go to whichever machine looks best, which soon is the best one.',
    } },
    { choice: {
      id: 'explore-try-ties',
      teach: 'At the start of the maze every guess is 0, so all four moves are **tied** for best. Python\'s `max(row, key=row.get)` returns the **first** of a tie: always "left" here, because it comes first in ACTIONS.',
      prompt: 'Why does `choose` pick at random among tied moves, instead of taking the first?',
      options: [
        { text: 'Speed', why: 'Picking at random is no faster.' },
        { text: 'Always taking the first would make an untrained mouse press "left" every time, a fixed habit rather than a fair choice. Random tie-breaking treats moves that look equally good equally.', why: 'Early on almost everything is tied, so the tie-break decides almost every move. A biased one means some moves get tried far less than others.' },
        { text: 'It doesn\'t matter', why: 'Early on, nearly every choice is a tie, so it decides almost everything. Bug hunt below.' },
      ],
      answer: 1,
    } },
  ],
}

// ---------------------------------------------------------------- Watch it run
const ROWS = {
  tie: { left: 0, up: 0, right: 0, down: 0 },
  clear: { left: -0.3, up: -0.75, right: 0.6, down: 0.6 },
  learned: { left: -0.5, up: -0.8, right: 0.42, down: 0.1 },
}
function WatchChoose() {
  const [which, setWhich] = useState('clear')
  const [eps, setEps] = useState(0.1)
  const [seed, setSeed] = useState(4)
  const us = useMemo(() => { const rng = makeRng(seed); return [Math.floor(rng.random() * 100) / 100, Math.floor(rng.random() * 100) / 100] }, [seed])
  const { frames } = useMemo(() => traceChoose(ROWS[which], eps, us), [which, eps, us])
  return (
    <div className="mlf-watch">
      <h3>choose: explore, or repeat what looks best</h3>
      <div className="mlf-controls">
        <div><span className="mlf-eyebrow">guesses</span><div className="mlf-chips">{[['tie', 'all tied'], ['clear', 'two tied for best'], ['learned', 'one clear best']].map(([k, l]) => <button key={k} type="button" className={`mlf-chip${k === which ? ' on' : ''}`} aria-pressed={k === which} onClick={() => setWhich(k)}>{l}</button>)}</div></div>
        <div><span className="mlf-eyebrow">eps</span><div className="mlf-chips">{[0, 0.1, 0.5].map(v => <button key={v} type="button" className={`mlf-chip${v === eps ? ' on' : ''}`} aria-pressed={v === eps} onClick={() => setEps(v)}>{v}</button>)}</div></div>
        <div><span className="mlf-eyebrow">dice</span><div className="mlf-chips">{[4, 9, 2].map(v => <button key={v} type="button" className={`mlf-chip${v === seed ? ' on' : ''}`} aria-pressed={v === seed} onClick={() => setSeed(v)}>seed {v}</button>)}</div><span className="mlf-muted">numbers: {us.join(', ')}</span></div>
      </div>
      <Stepper code={PIECES.choose.code} frames={frames} Picture={RowPicture} title="Step through choose" />
    </div>
  )
}

function RowPicture({ frame }) {
  const { row, ties = [], picked } = frame.pic
  return (
    <table className="mlf-table"><thead><tr><th>move</th><th>guess</th><th /></tr></thead>
      <tbody>{ACTIONS.map(a => <tr key={a} className={a === picked ? 'changed' : ''}><td>{ARROW[a]} {a}</td><td>{r4(row[a])}</td><td>{a === picked ? '← chosen' : ties.includes(a) ? 'tied for best' : ''}</td></tr>)}</tbody></table>
  )
}

export function BanditLab() {
  const [eps, setEps] = useState(0.1)
  const score = useMemo(() => banditScore(eps, 120), [eps])
  return (
    <div className="mlf-explorer">
      <label className="mlf-knob"><span><code>eps</code> = <strong>{eps}</strong></span><input type="range" min={0} max={1} step={0.01} value={eps} onChange={e => setEps(Number(e.target.value))} aria-label="eps" /><small>machines pay 1, 2 and 4 on average; 500 pulls, 120 runs</small></label>
      <p className="mlf-total">average pay per pull: <strong>{r4(score.avg)}</strong> (always the best machine: 4; at random: {r4((1 + 2 + 4) / 3)}) · runs that settled on the best machine: <strong>{score.onBest}</strong> of {score.runs}</p>
      <p className="mlf-muted">Too little exploring and it gets stuck; too much and it wastes pulls on machines it already knows are worse. Somewhere in between is best.</p>
    </div>
  )
}

function WatchBandit() {
  return (
    <div className="mlf-watch">
      <h3>How much to explore</h3>
      <p>Slide eps from 0 to 1 and watch the average pay.</p>
      <BanditLab />
    </div>
  )
}

export const WATCH_EXPLORE = [WatchChoose, WatchBandit]

// ---------------------------------------------------------------- Understand
const S0 = banditScore(0), S1 = banditScore(0.1), S3 = banditScore(0.3), SR = banditScore(1)
const r2 = x => x.toFixed(2)
export const UNDERSTAND_EXPLORE = [
  { h: 'Exploration and exploitation' },
  { md: `**Exploiting** uses what you know: pick what looks best. **Exploring** improves what you know: try something whose guess might be wrong. Every learner that learns from its own choices has to balance the two, because a guess only improves when it is tried.

Measured on the three machines (means 1, 2 and 4; 500 pulls; 300 runs each):

| eps | average pay per pull | runs that settled on the best machine |
|---|---|---|
| 0 (greedy) | ${r2(S0.avg)} | ${S0.onBest} of ${S0.runs} |
| 0.1 | ${r2(S1.avg)} | ${S1.onBest} of ${S1.runs} |
| 0.3 | ${r2(S3.avg)} | ${S3.onBest} of ${S3.runs} |
| 1 (always random) | ${r2(SR.avg)} | ${SR.onBest} of ${SR.runs} |

The money given up compared with always pulling the best machine is called **regret**: with eps = 0.1 it is about ${r2(4 - S1.avg)} per pull.` },
  { code: { piece: 'choose', notes: [
    ['if rng.random() < eps:', 'A biased coin: True with chance eps.'],
    ['return rng.choice(ACTIONS)', 'Explore: any of the four, ignoring the guesses.'],
    ['top = best(row)', 'Exploit: what is the best guess? (Lesson 10\'s piece.)'],
    ['return rng.choice([a for a in ACTIONS if row[a] == top])', 'All moves tied for best, then one of them at random: no move is favoured just for coming first.'],
  ] } },
  { code: { piece: 'run_bandit', notes: [
    ['guesses = {a: 0.0 for a in arms}', 'Every machine starts with a guess of 0.'],
    ['arm = max(arms, key=lambda a: guesses[a])', '`max` with `key=` returns the **arm** whose guess is highest, not the guess. (On a tie, the first: harmless here, because the machines pay positive amounts and soon differ.)'],
    ['guesses[arm] = update_mean(guesses[arm], pull(arm, rng), 1 / counts[arm])', 'Lesson 9: the exact running average of that machine\'s pulls.'],
  ] } },
  { predict: {
    id: 'explore-u-regret',
    teach: 'A greedy player stuck on the machine that pays 1 on average, when the best pays 4, loses 4 − 1 per pull compared with always choosing the best.',
    prompt: 'Over 500 pulls, about how much does it give up in total?',
    answer: 1500, tolerance: 1,
    explain: '(4 − 1) × 500 = 1500. Regret grows with every pull for as long as the learner is stuck. Exploring costs a little on each random pull and saves this.',
  } },
  { choice: {
    id: 'explore-u-optimism',
    teach: 'In lesson 0, the maze learner with eps = 0 still found a good route. There, every move costs at least −0.04, so a move that has been tried ends up with a guess **below** 0, and untried moves (still 0) look better than tried ones.',
    prompt: 'Why does greedy get stuck on the machines but not in that maze?',
    options: [
      { text: 'The maze is smaller.', why: 'Size isn\'t it. It is how tried and untried guesses compare.' },
      { text: 'In the maze, trying a move makes its guess drop below the untried 0, so greedy keeps moving on to untried moves. On the machines, trying one makes its guess rise above 0, so greedy never leaves it.', why: 'Starting guesses that are *better* than the truth make greedy explore by itself: **optimism**. Here the machines pay more than 0, so a start of 0 is pessimistic and greedy freezes. Starting the guesses at 10 would fix it.' },
      { text: 'Luck', why: 'It happened in every run, both ways: it is a property of the starting guesses.' },
    ],
    answer: 1,
  } },
  { note: 'This is the **exploration–exploitation trade-off**, studied in its purest form as the **multi-armed bandit**. Epsilon-greedy is the simplest fix. Others are **optimistic initial values**, and **UCB** (try the arm with the highest guess plus a bonus that shrinks as it is tried). Q-learning normally uses epsilon-greedy, often with eps lowered as learning goes on.', kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const rowLit = row => `{${ACTIONS.map(a => `"${a}": ${row[a]}`).join(', ')}}`
const chooseCase = (row, eps, us, why) => ({ call: `choose(${rowLit(row)}, ${eps}, Dice(${JSON.stringify(us)}))`, expected: choosePiece(row, eps, dice([...us])), why })
const banditCase = (eps, steps, seed, why) => {
  const rng = makeRng(seed)
  const us = Array.from({ length: steps * 3 }, () => Math.floor(rng.random() * 1000) / 1000)
  const [g, c] = runBandit(pullArm(MEANS), ARMS, steps, eps, dice([...us]))
  return { call: `run_bandit(lambda arm, rng: {"A": 1, "B": 2, "C": 4}[arm] + 2 * rng.random() - 1, ["A", "B", "C"], ${steps}, ${eps}, Dice(${JSON.stringify(us)}))`, expected: norm([g, c]), why }
}

export const CHALLENGES_EXPLORE = [
  {
    id: 'explore-choose', piece: 'choose', title: 'Write choose', kind: 'write', uses: ['best'],
    prompt: '`choose(row, eps, rng)`: with chance eps (`rng.random() < eps`) return `rng.choice(ACTIONS)`. Otherwise return `rng.choice(...)` of the list of moves, in ACTIONS order, whose guess equals the best guess.',
    starter: `def choose(row, eps, rng):
    # explore with chance eps; otherwise a random one of the moves tied for best
    return "left"
`,
    solution: PIECES.choose.code,
    runCalls: [`choose(${rowLit(ROWS.clear)}, 0.1, Dice([0.5, 0.7]))`, `choose(${rowLit(ROWS.tie)}, 0.1, Dice([0.5, 0.7]))`],
    cases: [chooseCase(ROWS.clear, 0.1, [0.5, 0.7], 'a tie between right and down'), chooseCase(ROWS.clear, 0.1, [0.5, 0.2]), chooseCase(ROWS.learned, 0.1, [0.9, 0.3], 'one clear best'), chooseCase(ROWS.learned, 0.1, [0.05, 0.3], 'explore'), chooseCase(ROWS.tie, 0, [0.6, 0.6], 'all tied'), chooseCase(ROWS.tie, 1, [0.0, 0.99], 'always explore')],
    hints: ['`if rng.random() < eps: return rng.choice(ACTIONS)`.', '`top = best(row)`, then `rng.choice([a for a in ACTIONS if row[a] == top])`.'],
  },
  {
    id: 'explore-bandit', piece: 'run_bandit', title: 'Write run_bandit', kind: 'write', uses: ['update_mean'],
    prompt: '`run_bandit(pull, arms, steps, eps, rng)` keeps a guess (starting at 0) and a count for each arm. Each step: with chance eps pick `rng.choice(arms)`, otherwise the arm with the highest guess (`max(arms, key=...)`, the first on a tie). Pull it with `pull(arm, rng)`, add 1 to its count, and update its guess to the exact running average (`update_mean` with step `1 / count`). Return `(guesses, counts)`.',
    starter: `def run_bandit(pull, arms, steps, eps, rng):
    guesses = {a: 0.0 for a in arms}
    counts = {a: 0 for a in arms}
    for _ in range(steps):
        arm = arms[0]
        # pick (explore or exploit), pull, count, update the guess
    return guesses, counts
`,
    solution: PIECES.run_bandit.code,
    runCalls: ['run_bandit(lambda arm, rng: {"A": 1, "B": 2, "C": 4}[arm] + 2 * rng.random() - 1, ["A", "B", "C"], 500, 0.1, random.Random(1))', 'run_bandit(lambda arm, rng: {"A": 1, "B": 2, "C": 4}[arm] + 2 * rng.random() - 1, ["A", "B", "C"], 500, 0.0, random.Random(1))'],
    cases: [banditCase(0.1, 30, 1), banditCase(0, 20, 2, 'greedy: stuck on A'), banditCase(0.5, 25, 3), banditCase(1, 15, 4, 'always random')],
    hints: ['`if rng.random() < eps: arm = rng.choice(arms)` else `arm = max(arms, key=lambda a: guesses[a])`.', '`counts[arm] += 1` **before** the update, so the step is `1 / counts[arm]`.', '`guesses[arm] = update_mean(guesses[arm], pull(arm, rng), 1 / counts[arm])`.'],
  },
  {
    id: 'explore-fix-ties', piece: null, title: 'Bug hunt: the mouse that always goes left', kind: 'fix', uses: ['best'],
    prompt: 'This `choose` looks simpler, and it works whenever one move is clearly best. But an untrained mouse (every guess 0) always presses the same move. Run the presets.',
    starter: `def choose(row, eps, rng):
    if rng.random() < eps:
        return rng.choice(ACTIONS)
    return max(row, key=row.get)
`,
    solution: PIECES.choose.code,
    compare: '`max(row, key=row.get)` returns the **first** of tied moves: with every guess at 0, always "left". Early in learning nearly every choice is a tie, so a fixed tie-break gives the mouse a habit instead of a fair choice. Collecting all the tied moves and picking one with `rng.choice` treats them equally.',
    runCalls: [`choose(${rowLit(ROWS.tie)}, 0.0, Dice([0.5, 0.9]))`, `choose(${rowLit(ROWS.tie)}, 0.0, Dice([0.5, 0.1]))`],
    cases: [chooseCase(ROWS.tie, 0, [0.5, 0.9]), chooseCase(ROWS.clear, 0, [0.5, 0.7]), chooseCase(ROWS.learned, 0.1, [0.9, 0.3])],
    hints: ['With every guess at 0, which move does `max(row, key=row.get)` return?', 'Build the list of moves tied for the best guess, then `rng.choice` from it.'],
  },
]

export const KEEP_EXPLORE = {
  pieces: ['choose', 'run_bandit'],
  card: `**choose(row, eps, rng)** → explore with chance eps, otherwise a random one of the moves tied for best.

**run_bandit(pull, arms, steps, eps, rng)** → \`(guesses, counts)\`: epsilon-greedy on slot machines, with exact running averages.`,
  remember: [
    'A guess only improves when it is tried: never exploring can lock in a bad choice forever.',
    `A little exploring (eps ≈ 0.1 here) pays: ${r2(S1.avg)} per pull against ${r2(S0.avg)} for greedy. Too much wastes pulls.`,
    'Starting guesses better than the truth (optimism) make greedy explore by itself; worse ones make it freeze.',
    'Break ties at random: early on, nearly every choice is a tie.',
  ],
  ml: [['repeat vs try', 'exploitation vs exploration', 'the central trade-off of learning by doing'], ['the slot machines', 'multi-armed bandit', 'one state, many actions'], ['what greedy gives up', 'regret', 'compared with always choosing the best'], ['eps', 'ε-greedy', 'random with chance ε']],
  next: 'The assembly: put choose, q_update and your Part 1 pieces together. Your own Q-learner, the program from lesson 0, every line yours.',
}
