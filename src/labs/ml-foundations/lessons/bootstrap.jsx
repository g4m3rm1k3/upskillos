import React, { useMemo, useState } from 'react'
import MazeView from '../MazeView.jsx'
import Stepper from '../Stepper.jsx'
import { ValuePicture } from '../pictures.jsx'
import { traceCorridor } from '../traces-part3.js'
import { PIECES } from '../python/pieces.js'
import { parseMap, buildTable, sweepValues, makeRng } from '../world.js'
import { bestOf, qUpdate, trainQ } from '../world-part3.js'
import { norm } from '../runtime/checks.js'

const r4 = x => Number(x.toFixed(4))
const ICY_TEXT = '.#..\n.S..\n...G'

// ---------------------------------------------------------------- Learning against planning
export function LearnVsPlan({ text = ICY_TEXT }) {
  const [eps, setEps] = useState(1)
  const [games, setGames] = useState(50)
  const maze = useMemo(() => parseMap(text), [text])
  const V = useMemo(() => sweepValues(buildTable(maze, 0), 0.9)[0], [maze])
  const q = useMemo(() => trainQ(text, { episodes: games, alpha: 0.5, g: 0.9, eps, rng: makeRng(2) }), [text, games, eps])
  const learned = Object.fromEntries(Object.keys(q).filter(s => s !== maze.goal).map(s => [s, bestOf(q[s])]))
  const worst = Math.max(...Object.keys(learned).map(s => Math.abs(learned[s] - V[s])))
  return (
    <div className="mlf-explorer">
      <div className="mlf-controls">
        <div><span className="mlf-eyebrow">eps (how often a random move)</span><div className="mlf-chips">{[1, 0.3, 0.1].map(v => <button key={v} type="button" className={`mlf-chip${v === eps ? ' on' : ''}`} aria-pressed={v === eps} onClick={() => setEps(v)}>{v}</button>)}</div></div>
        <div><span className="mlf-eyebrow">games</span><div className="mlf-chips">{[5, 50, 300].map(v => <button key={v} type="button" className={`mlf-chip${v === games ? ' on' : ''}`} aria-pressed={v === games} onClick={() => setGames(v)}>{v}</button>)}</div></div>
      </div>
      <div className="mlf-two">
        <div><p className="mlf-eyebrow">learned by playing: best(q[s])</p><MazeView maze={maze} size={56} heat={learned} heatRange={[-0.5, 1]} labels={Object.fromEntries(Object.entries(learned).map(([s, v]) => [s, v.toFixed(2)]))} /></div>
        <div><p className="mlf-eyebrow">planned with the table (lesson 5)</p><MazeView maze={maze} size={56} heat={V} heatRange={[-0.5, 1]} labels={Object.fromEntries(Object.entries(V).map(([s, v]) => [s, v.toFixed(2)]))} /></div>
      </div>
      <p className="mlf-total">biggest difference: <strong>{r4(worst)}</strong>{worst < 1e-3 ? ' · the learner found exactly the planner\'s worths, without the table' : ''}</p>
    </div>
  )
}

// ---------------------------------------------------------------- Try it first
const CORRIDOR = parseMap('S....G')
export const TRY_BOOTSTRAP = {
  lead: 'Lesson 9 nudges a guess toward each new sample. For the worth of a move, what *is* the sample? The game goes on after the move, and the learner can\'t wait for the end of every game to find out. Its trick: use **its own guess** for the rest.',
  steps: [
    { predict: {
      id: 'bootstrap-try-target',
      teach: '**The target.** After a move, the learner knows two things: what the move paid (`reward`), and where it landed (`nxt`). For the rest of the game it uses its current best guess at `nxt`: target = reward + g × best(q[nxt]). It is lesson 5\'s "payment + g × worth of where you land", with a guess in place of the true worth.',
      prompt: 'A move paid −0.04 and landed on a square whose best guess is 0.8. g = 0.9. What is the target?',
      answer: r4(-0.04 + 0.9 * 0.8), tolerance: 1e-6,
      misconceptions: [{ answer: 0.76, tolerance: 1e-6, feedback: 'That adds the whole guess. It is one move in the future, so it counts g times: 0.9 × 0.8.' }],
      explain: '−0.04 + 0.9 × 0.8 = 0.68. A real payment plus a discounted guess of everything after it.',
    } },
    { choice: {
      id: 'bootstrap-try-allowed',
      teach: 'Lesson 5\'s sweeps also started with wrong worths (all 0) and set each square from its **neighbours\' current** worths, wrong ones included. They still settled on the right answer, because the cheese anchored them: it really is worth 0, and correct worths spread out from there.',
      prompt: 'Is it all right to correct a guess using another guess?',
      options: [
        { text: 'No: the errors just pile up.', why: 'They would, without an anchor. But the target always includes a real payment, and the cheese\'s worth is known exactly (0, game over). Truth enters at every move and spreads back.' },
        { text: 'Yes: it is lesson 5\'s sweeping, with one tried outcome instead of the average over all outcomes. Real payments and the known worth of the cheese keep pulling the guesses toward the truth.', why: 'This is called **bootstrapping**. Each update is noisier than a sweep (one outcome, not all), so it takes many updates, averaged by alpha (lesson 9).' },
      ],
      answer: 1,
    } },
    { md: 'A corridor: the mouse always walks right, 5 moves from S to the cheese. Every guess starts at 0, and alpha = 1, so each update jumps straight to its target.' },
    { figure: MazeView, props: { maze: CORRIDOR, size: 56, rc: true } },
    { choice: {
      id: 'bootstrap-try-game1',
      teach: 'In game 1 the mouse walks left to right. Each square is updated once, **before** the square ahead of it has learned anything: its target uses the square ahead\'s guess, which is still 0. Only the last move is paid by the cheese (+1).',
      prompt: 'After game 1, which squares have a guess that "knows" about the cheese?',
      options: [
        { text: 'All of them', why: 'Every square except the last saw a 0 ahead of it when it was updated, so its target was −0.04 + 0.9 × 0.' },
        { text: 'Only the square right next to the cheese', why: 'Its move was paid +1. Every other square saw a still-zero guess ahead of it, so it learned only "−0.04".' },
        { text: 'None', why: 'The last move is paid +1 by the cheese, so the square before the cheese learns 1.' },
      ],
      answer: 1,
    } },
    { predict: {
      id: 'bootstrap-try-games',
      teach: 'In game 2, the second-to-last square sees the last square\'s new guess (1) and learns from it. In game 3 the square before that, and so on: **the news travels back one square per game**.',
      prompt: 'S is 5 moves from the cheese. In which game does S\'s guess first learn about the cheese?',
      answer: 5, tolerance: 1e-9,
      misconceptions: [{ answer: 1, feedback: 'In game 1 only the square next to the cheese learns. The news moves back one square per game.' }, { answer: 6, feedback: 'S is 5 squares from the cheese: game 1 reaches the square 1 away, so game 5 reaches the square 5 away.' }],
      explain: 'Game 1 teaches the square 1 move away, game 2 the square 2 away, ..., game 5 the square 5 away: S. Step through it in Watch it run. (Updating the moves in reverse order would carry the news back in one game, which is why some methods replay a game backwards.)',
    } },
  ],
}

// ---------------------------------------------------------------- Watch it run
function WatchCorridor() {
  const [games, setGames] = useState(3)
  const [alpha, setAlpha] = useState(1)
  const { frames } = useMemo(() => traceCorridor(6, games, alpha, 0.9), [games, alpha])
  const Picture = useMemo(() => ValuePicture({ maze: CORRIDOR, size: 64, heatRange: [-0.5, 1] }), [])
  return (
    <div className="mlf-watch">
      <h3>q_update on a corridor: the news travels back</h3>
      <p>Watch the guesses (the numbers) game by game. With alpha below 1 the news still travels back one square per game, but each guess also moves only part of the way, so it takes longer to settle.</p>
      <div className="mlf-controls">
        <div><span className="mlf-eyebrow">games</span><div className="mlf-chips">{[3, 5, 8].map(v => <button key={v} type="button" className={`mlf-chip${v === games ? ' on' : ''}`} aria-pressed={v === games} onClick={() => setGames(v)}>{v}</button>)}</div></div>
        <div><span className="mlf-eyebrow">alpha</span><div className="mlf-chips">{[1, 0.5].map(v => <button key={v} type="button" className={`mlf-chip${v === alpha ? ' on' : ''}`} aria-pressed={v === alpha} onClick={() => setAlpha(v)}>{v}</button>)}</div></div>
      </div>
      <Stepper code={`${PIECES.best.code}\n\n${PIECES.q_update.code}`} frames={frames} Picture={Picture} title="Step through q_update on a corridor" />
    </div>
  )
}

function WatchLearnPlan() {
  return (
    <div className="mlf-watch">
      <h3>Learning finds what planning finds</h3>
      <p>Left: the best guess in every square after playing, with q_update after every move (alpha 0.5, g 0.9). Right: the worths that lesson 5 computed with the table. The learner never sees the table. Try eps = 1 (moves always random), then eps = 0.1.</p>
      <LearnVsPlan />
      <p className="mlf-muted">With eps = 1 the guesses match exactly after about 50 games. With eps = 0.1 some squares are never visited, and a guess that is never updated stays at 0, however many games are played. Learning only knows what it has tried, which is lesson 11's problem.</p>
    </div>
  )
}

export const WATCH_BOOTSTRAP = [WatchCorridor, WatchLearnPlan]

// ---------------------------------------------------------------- Understand
export const UNDERSTAND_BOOTSTRAP = [
  { h: 'The Bellman equation, one sample at a time' },
  { md: `Lesson 5's equation for the worth of a move averages over **all** its outcomes, using the table:

$$Q(s, a) = \\sum_{s'} P(s' \\mid s, a)\\big(R + g \\max_{a'} Q(s', a')\\big)$$

The learner can't compute that sum: it has no $P$. But each time it tries $a$ in $s$, it sees **one** outcome $s'$ drawn with exactly those chances. So $R + g\\max_{a'} Q(s', a')$ is one *sample* of the sum, and averaging such samples with a running average (lesson 9) estimates it (lesson 8):

$$Q(s,a) \\leftarrow Q(s,a) + \\alpha\\big(\\underbrace{R + g\\max_{a'}Q(s',a')}_{\\text{target}} - Q(s,a)\\big)$$

The bracket is the **TD error** δ ("temporal difference": the difference between the guess now and the guess one step later).` },
  { code: { piece: 'best', notes: [
    ['return max(row.values(), default=0.0)', 'At the cheese, `q[goal]` is `{}`: no moves. `max` of nothing would raise `ValueError`; `default=0.0` says "the game is over: nothing more to come".'],
  ] } },
  { code: { piece: 'q_update', notes: [
    ['target = reward + g * best(q[nxt])', 'One real payment plus the discounted best guess at where the move landed. **best**, not the move the learner happens to make next: it learns the worth of playing *well* from there, whatever it does.'],
    ['surprise = target - q[state][action]', 'The TD error, δ: how much better or worse the move turned out than its guess said.'],
    ['q[state][action] += alpha * surprise', 'Lesson 9\'s `update_mean`, with the target as the sample.'],
    ['return surprise', 'Returned so the caller can watch the surprises shrink as learning settles.'],
  ] } },
  { mathCode: [
    ['Q(s,a)', 'q[state][action]', 'the guessed worth of a move'],
    ["\\max_{a'} Q(s',a')", 'best(q[nxt])', 'the best guess where the move landed'],
    ["R + g\\max_{a'}Q(s',a')", 'target', 'one sample of the Bellman right-hand side'],
    ['\\delta', 'surprise', 'the TD error'],
    ['\\alpha', 'alpha', 'the learning rate'],
  ] },
  { predict: {
    id: 'bootstrap-u-update',
    teach: 'q_update does three things in order: target = reward + g × best(q[nxt]); surprise = target − q[state][action]; then q[state][action] += alpha × surprise.',
    prompt: 'The guess q[state][action] is 0.5. The move pays −0.04 and lands where the best guess is 0.9. g = 0.9 and alpha = 0.5. **What is the new guess?**',
    answer: r4(0.5 + 0.5 * (-0.04 + 0.9 * 0.9 - 0.5)), tolerance: 1e-4,
    misconceptions: [{ answer: r4(-0.04 + 0.81), tolerance: 1e-4, feedback: 'That is the target. alpha = 0.5 moves the guess only half way to it.' }],
    explain: `target = −0.04 + 0.9 × 0.9 = 0.77; surprise = 0.77 − 0.5 = 0.27; new guess = 0.5 + 0.5 × 0.27 = ${r4(0.5 + 0.5 * 0.27)}.`,
  } },
  { choice: {
    id: 'bootstrap-u-offpolicy',
    teach: 'In Watch it run, the learner with eps = 1 moved completely at random, yet its guesses matched the worths of playing **well**.',
    prompt: 'How can random moves teach the worth of the best moves?',
    options: [
      { text: 'Luck', why: 'It matched exactly, every time: not luck.' },
      { text: 'The target uses best(q[nxt]), the best guess at the next square, not the move it will actually make next. So whatever it does, each update is about playing well from then on.', why: 'This is **off-policy** learning: how it behaves (random) is separate from what it learns about (the best plan). It is what lets the learner explore freely and still learn the best plan.' },
      { text: 'Random moves are the best moves in this maze.', why: 'They take far longer than the shortest route. Yet the learned worths describe the shortest route.' },
    ],
    answer: 1,
  } },
  { note: 'This is **TD learning** (temporal-difference learning), and with the max it is **Q-learning** (Watkins, 1989). Using your own estimates in your own targets is **bootstrapping**. Compared with Monte Carlo (wait for the end of the game and average the real total, lesson 8), TD learns after every move and has less noise, at the price of starting from biased guesses.', kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const lit = q => `{${Object.entries(q).map(([s, row]) => `(${s.replace(',', ', ')}): {${Object.entries(row).map(([a, v]) => `"${a}": ${v}`).join(', ')}}`).join(', ')}}`
const Q0 = { '0,0': { left: -0.2, up: -0.3, right: 0.5, down: 0.1 }, '0,1': { left: 0.2, up: 0.4, right: 0.9, down: 0.3 }, '0,2': {} }
const bestCase = row => ({ call: `best(${`{${Object.entries(row).map(([a, v]) => `"${a}": ${v}`).join(', ')}}`})`, expected: norm(bestOf(row)) })
const qCase = (q, s, a, r, n, alpha, g, why) => {
  const copy = JSON.parse(JSON.stringify(q))
  const surprise = qUpdate(copy, s, a, r, n, alpha, g)
  return { call: `(lambda q: (q_update(q, (${s.replace(',', ', ')}), "${a}", ${r}, (${n.replace(',', ', ')}), ${alpha}, ${g}), q))(${lit(q)})`, expected: norm([surprise, copy]), why }
}

export const CHALLENGES_BOOTSTRAP = [
  {
    id: 'bootstrap-best', piece: 'best', title: 'Write best', kind: 'write', uses: [],
    prompt: '`best(row)` returns the largest guess in a row of guesses `{move: guess}`, or `0.0` if the row is empty (the cheese, where the game is over).',
    starter: `def best(row):
    # the largest value in the row, or 0.0 if there is none
    return None
`,
    solution: PIECES.best.code,
    runCalls: ['best({"left": -0.2, "up": 0.4, "right": 0.1, "down": 0.0})', 'best({})'],
    cases: [bestCase({ left: -0.2, up: 0.4, right: 0.1, down: 0 }), bestCase({ left: -1, up: -0.5, right: -0.75, down: -2 }), bestCase({}), bestCase({ right: 0.3 })],
    hints: ['`max(row.values())` is the largest guess.', '`max` takes `default=` for an empty sequence.'],
  },
  {
    id: 'bootstrap-q', piece: 'q_update', title: 'Write q_update', kind: 'write', uses: ['best'],
    prompt: '`q_update(q, state, action, reward, nxt, alpha, g)` changes `q[state][action]` in place: target = reward + g × best(q[nxt]), surprise = target − the old guess, and the guess moves by alpha × surprise. Return the surprise. The checks call it on a small `q` and look at both the surprise and the changed `q`.',
    starter: `def q_update(q, state, action, reward, nxt, alpha, g):
    target = 0.0
    surprise = 0.0
    return surprise
`,
    solution: PIECES.q_update.code,
    runCalls: [`(lambda q: (q_update(q, (0, 0), "right", -0.04, (0, 1), 0.5, 0.9), q))(${lit(Q0)})`],
    cases: [qCase(Q0, '0,0', 'right', -0.04, '0,1', 0.5, 0.9), qCase(Q0, '0,1', 'right', 1, '0,2', 0.5, 0.9, 'onto the cheese'), qCase(Q0, '0,0', 'left', -0.75, '0,0', 1, 0.9, 'a bump, alpha 1'), qCase(Q0, '0,1', 'down', -0.04, '0,0', 0.1, 0.5)],
    hints: ['`target = reward + g * best(q[nxt])`.', '`surprise = target - q[state][action]`, then `q[state][action] += alpha * surprise`, and return the surprise.'],
  },
  {
    id: 'bootstrap-fix-empty', piece: null, title: 'Bug hunt: the crash at the cheese', kind: 'fix', uses: [],
    prompt: 'This `best` works everywhere except on the cheese square. Run both presets and read the error the second one gives.',
    starter: `def best(row):
    return max(row.values())
`,
    solution: PIECES.best.code,
    compare: '`max` of an empty sequence has no answer, so Python raises `ValueError: max() arg is an empty sequence`. The cheese has no moves, so its row is empty, and the learner would crash the first time it reached the cheese. `default=0.0` makes the end of the game worth 0, exactly like the cheese\'s worth in lesson 5.',
    runCalls: ['best({"left": -0.2, "right": 0.5})', 'best({})'],
    cases: [bestCase({}), bestCase({ left: -0.2, right: 0.5 }), bestCase({ up: -3 })],
    hints: ['What is the row of guesses at the cheese?', '`max(..., default=0.0)`.'],
  },
]

export const KEEP_BOOTSTRAP = {
  pieces: ['best', 'q_update'],
  card: `**best(row)** → the largest guess in a row, 0.0 at the cheese.

**q_update(q, state, action, reward, nxt, alpha, g)** → the surprise; moves q[state][action] toward reward + g × best(q[nxt]).`,
  remember: [
    'The target is a real payment plus the discounted best guess at where the move landed: one sample of the Bellman equation.',
    'Correcting guesses with guesses works, because real payments and the cheese anchor them.',
    'Good news travels back about one square per game when the moves are updated in order.',
    'Learning only improves what it tries: a square never visited keeps its starting guess.',
  ],
  ml: [['the target', 'TD target', 'reward + γ max Q(s′, ·)'], ['the surprise', 'TD error, δ', 'temporal difference'], ['using your own guesses', 'bootstrapping', 'estimates built on estimates'], ['learning the best plan while doing anything', 'off-policy', 'behaviour and target are separate']],
  next: 'Lesson 11: if learning only knows what it has tried, what should it try? Repeating what looks best, or exploring?',
}
