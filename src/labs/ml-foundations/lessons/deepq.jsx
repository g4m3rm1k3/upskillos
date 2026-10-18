import React, { useState } from 'react'
import MazeView from '../MazeView.jsx'
import { PIECES } from '../python/pieces.js'
import { SMALL, SEVEN, ACTIONS, parseMap, makeRng, stepsToGoal, openCells } from '../world.js'
import { trainFormula, formulaRoute, tableFeatures, coordFeatures, predict } from '../world-part4.js'
import { pyText } from './cases.js'
import { norm } from '../runtime/checks.js'

export const OPEN = ['.....', '.....', 'S...G', '.....'].join('\n')
const MAPS = { SMALL: { text: SMALL, episodes: 150 }, 'an open room': { text: OPEN, episodes: 60 }, SEVEN: { text: SEVEN, episodes: 300 } }
const FEATS = { table: { label: 'one-hot (a table)', make: tableFeatures }, coords: { label: 'row and column', make: coordFeatures } }
export function routes(mapName, featName, seeds = [1, 2, 3]) {
  const { text, episodes } = MAPS[mapName], f = FEATS[featName].make(text), m = parseMap(text)
  return seeds.map(s => { const r = formulaRoute(trainFormula(text, f, { episodes, rng: makeRng(s) }), f, text); return r.at(-1) === m.goal ? r.length - 1 : null })
}
export const RESULTS = Object.fromEntries(Object.keys(MAPS).map(m => [m, Object.fromEntries(Object.keys(FEATS).map(f => [f, routes(m, f)]))]))
const show = rs => rs.map(r => (r === null ? 'fails' : r)).join(', ')
const SHORT = Object.fromEntries(Object.entries(MAPS).map(([k, { text }]) => { const m = parseMap(text); return [k, stepsToGoal(m)[m.start]] }))

// ---------------------------------------------------------------- the formula trainer
export function FormulaTrainer() {
  const [map, setMap] = useState('an open room')
  const [feat, setFeat] = useState('coords')
  const [seed, setSeed] = useState(1)
  const [run, setRun] = useState(null)
  const { text, episodes } = MAPS[map]
  const maze = parseMap(text)
  function train() {
    const f = FEATS[feat].make(text)
    const lens = []
    const w = trainFormula(text, f, { episodes, rng: makeRng(seed), onEpisode: e => lens.push(e.steps) })
    const route = formulaRoute(w, f, text)
    const best = Object.fromEntries(openCells(maze).filter(s => s !== maze.goal).map(s => [s, Math.max(...ACTIONS.map(a => predict(w[a], f(s))))]))
    const arrows = Object.fromEntries(openCells(maze).filter(s => s !== maze.goal).map(s => [s, ACTIONS.reduce((b, a) => (predict(w[a], f(s)) > predict(w[b], f(s)) ? a : b), ACTIONS[0])]))
    setRun({ key: `${map}|${feat}|${seed}`, w, route, best, arrows, lens, size: f(maze.start).length })
  }
  const fresh = run && run.key === `${map}|${feat}|${seed}`
  return (
    <div className="mlf-explorer">
      <div className="mlf-controls">
        <div><span className="mlf-eyebrow">map</span><div className="mlf-chips">{Object.keys(MAPS).map(k => <button key={k} type="button" className={`mlf-chip${k === map ? ' on' : ''}`} aria-pressed={k === map} onClick={() => setMap(k)}>{k}</button>)}</div></div>
        <div><span className="mlf-eyebrow">features</span><div className="mlf-chips">{Object.entries(FEATS).map(([k, v]) => <button key={k} type="button" className={`mlf-chip${k === feat ? ' on' : ''}`} aria-pressed={k === feat} onClick={() => setFeat(k)}>{v.label}</button>)}</div></div>
        <div><span className="mlf-eyebrow">seed</span><div className="mlf-chips">{[1, 2, 3].map(v => <button key={v} type="button" className={`mlf-chip${v === seed ? ' on' : ''}`} aria-pressed={v === seed} onClick={() => setSeed(v)}>{v}</button>)}</div></div>
        <button type="button" className="mlf-primary" onClick={train}>Train {episodes} games</button>
      </div>
      {fresh ? (
        <>
          <MazeView maze={maze} size={Math.min(52, Math.floor(400 / Math.max(maze.cols, maze.rows)))} heat={run.best} heatRange={[-1, 1]} labels={Object.fromEntries(Object.entries(run.best).map(([s, v]) => [s, v.toFixed(2)]))} arrows={run.arrows} path={run.route.at(-1) === maze.goal ? run.route : undefined} />
          <p className="mlf-total">{run.size} weights per move · {run.route.at(-1) === maze.goal ? <>the learned route: <strong>{run.route.length - 1}</strong> moves (shortest {SHORT[map]})</> : <strong className="mlf-bad-text">the learned arrows never reach the cheese</strong>} · last games took {run.lens.slice(-5).join(', ')} moves</p>
        </>
      ) : <p className="mlf-muted">Pick a map, features and a seed, then train.</p>}
    </div>
  )
}

// ---------------------------------------------------------------- Try it first
export const TRY_DEEPQ = {
  lead: 'The last assembly. Your Q-learner (A2) kept a table of guesses. Here the table is replaced by a **formula** per move (12), corrected by gradient steps (13), learning from a **replay memory** in mini-batches (15). This is deep Q-learning, with a linear formula where DQN has a network (14).',
  steps: [
    { choice: {
      id: 'deepq-try-lines',
      teach: 'In A2, the guess for a move was `q[state][action]`, and `q_update` changed that one entry. With a formula, every move has a weight list `w[action]`, and the guess is `predict(w[action], features(state))`.',
      prompt: 'What replaces `q_update` in the formula learner?',
      options: [
        { text: 'Nothing: the formula doesn\'t learn.', why: 'Its weights are corrected after every move, just through the formula.' },
        { text: 'A nudge of `w[action]` toward the same target, reward + g × best guess at the next square, for a random batch of remembered moves.', why: 'Same target as lesson 10, same blame-by-feature correction as lesson 12, and replay batches from lesson 15.' },
        { text: 'build_table', why: 'The table only plays the world, as before. The learner never reads it.' },
      ],
      answer: 1,
    } },
    { choice: {
      id: 'deepq-try-table',
      teach: 'With **one-hot** features, each square has its own weight in `w[action]` (lesson 12): `predict` returns exactly that weight, and a nudge changes only that weight.',
      prompt: 'With one-hot features, what is this learner?',
      options: [
        { text: 'Something completely new', why: 'One-hot features make the formula a table: one weight per square and move.' },
        { text: 'A2\'s table learner, plus a replay memory: the weights are the Q-table.', why: `So it learns every map that A2 learns: with one-hot features it found the shortest route on all three maps (${show(RESULTS.SEVEN.table)} on SEVEN, shortest ${SHORT.SEVEN}).` },
      ],
      answer: 1,
    } },
    { choice: {
      id: 'deepq-try-coords',
      teach: `With **row and column** features, each move has only 3 weights for the whole map, so the guess for a move must be a flat slope across the map. Measured (3 seeds): in **an open room** the route was ${show(RESULTS['an open room'].coords)} moves after ${MAPS['an open room'].episodes} games (one-hot: ${show(RESULTS['an open room'].table)}; shortest ${SHORT['an open room']}). On **SEVEN**: ${show(RESULTS.SEVEN.coords)}.`,
      prompt: 'Why does the 3-weight formula win in the open room and fail on SEVEN?',
      options: [
        { text: 'It needs more games on SEVEN.', why: 'It fails at 300 games, and at many more: no setting of 3 weights per move describes the worths of a twisty maze.' },
        { text: 'In the open room, worth really does change smoothly across the map, so 3 shared weights learn it fast and generalise to squares rarely visited. In SEVEN, worth twists around the walls, and a flat slope of row and column can\'t follow it.', why: 'A formula is only as good as its features. A network learns its own features from the input, which is why DQN uses one, and why it can learn from raw pixels.' },
        { text: 'Row and column are wrong numbers for SEVEN.', why: 'They are right; they just aren\'t enough to describe its worths.' },
      ],
      answer: 1,
    } },
  ],
}

// ---------------------------------------------------------------- Watch it run
function WatchTrainer() {
  return (
    <div className="mlf-watch">
      <h3>Your formula learner, three maps, two kinds of features</h3>
      <p>Train each combination. The colours are the best predicted guess on each square, the arrows its best move, purple the route it learned.</p>
      <FormulaTrainer />
      <table className="mlf-table"><thead><tr><th>map (shortest)</th><th>games</th><th>one-hot (a table)</th><th>row and column (3 weights)</th></tr></thead>
        <tbody>{Object.keys(MAPS).map(k => <tr key={k}><td>{k} ({SHORT[k]})</td><td>{MAPS[k].episodes}</td><td>{show(RESULTS[k].table)}</td><td>{show(RESULTS[k].coords)}</td></tr>)}</tbody></table>
      <p className="mlf-muted">Learned route lengths for seeds 1, 2 and 3.</p>
    </div>
  )
}

export const WATCH_DEEPQ = [WatchTrainer]

// ---------------------------------------------------------------- Understand
export const UNDERSTAND_DEEPQ = [
  { h: 'The formula learner' },
  { code: { piece: 'train_formula', notes: [
    ['w = {a: [0.0] * len(features(maze["start"])) for a in ACTIONS}', 'One weight list per move, all 0: the model. With one-hot features this is the Q-table, laid out differently.'],
    ['memory = Replay(capacity)', 'Lesson 15: remember experience.'],
    ['def q_row(s):', 'A row of guesses like A2\'s `q[s]`, now computed by the formula, so `choose` and `best` work unchanged. The cheese still gives `{}`.'],
    ['memory.add((state, action, reward, nxt))', 'Store the move, rather than learning from it only once.'],
    ['sample = memory.sample(batch, rng)', 'A random mini-batch of remembered moves, old and new.'],
    ['items = [(features(s), r + g * best(q_row(n)))', 'Lesson 10\'s target for each remembered move: payment + g × best guess at where it landed.'],
    ['w[a] = batch_nudge(w[a], items, alpha)', 'Lessons 12, 13 and 15: one averaged gradient step on that move\'s weights.'],
  ] } },
  { md: `**The whole lab in one program:**

| line | built in |
|---|---|
| \`parse_map\`, \`build_table\` | Part 1: the world as data |
| the target: reward + g × best | Part 2: worth = payment + discounted worth of what follows |
| \`choose\`, \`sample_outcome\`, the running correction | Part 3: learning from tries |
| \`predict\`, \`batch_nudge\`, \`Replay\` | Part 4: a formula instead of a table, gradient steps, a memory |

**To get from here to DQN**, replace \`predict(w[a], features(s))\` with lesson 14's network (one output per move), and add a **target network** (a copy of the weights, updated only now and then, used inside the target, so that the target doesn't shift with every step). With pixels as the input, that is the algorithm that learned to play Atari games.` },
  { choice: {
    id: 'deepq-u-target',
    teach: 'Each target uses `best(q_row(n))`: the formula\'s **own** current guess at the next square. A nudge changes the weights, and with a formula that changes the guesses at the next square too, so the target itself moves.',
    prompt: 'Why does DQN compute targets with a slowly updated copy of the network?',
    options: [
      { text: 'To save memory', why: 'It uses more memory: a second copy of the weights.' },
      { text: 'With shared weights, every correction also moves the target it was aiming at, so learning can chase its own tail. A frozen copy keeps the target still for a while, which makes training stable.', why: 'With a table this barely matters, because a nudge at one square doesn\'t change the guess at another. With a formula or a network it does, which is why deep RL needs these extra tricks.' },
      { text: 'It doesn\'t matter', why: 'In deep RL it is often the difference between learning and diverging.' },
    ],
    answer: 1,
  } },
  { note: 'You have now built, from first principles: MDPs and transition tables, expected values, the Bellman equation, value and policy iteration, discounting, Monte Carlo estimation, running averages, TD learning and Q-learning, ε-greedy exploration, linear function approximation, gradient descent, a neural network with backpropagation, and experience replay. Next steps: **QMaze** (more RL: SARSA, A2C) and the **Q-Arcade** series (DQN on CartPole, in PyTorch and Keras).', kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const USES = ['parse_map', 'legal_moves', 'move_chances', 'build_table', 'sample_outcome', 'best', 'choose', 'one_hot', 'predict', 'Replay', 'batch_nudge']
const featLit = (name, text) => `${name === 'table' ? 'table_features' : 'coord_features'}(${text})`
const wCase = (mapText, mapName, feat, episodes, seed, why) => {
  const f = FEATS[feat].make(mapText)
  return { call: `train_formula(${mapName}, ${featLit(feat, mapName)}, episodes=${episodes}, rng=Seeded(${seed}))`, expected: norm(trainFormula(mapText, f, { episodes, rng: makeRng(seed) })), why }
}
const rCase = (mapText, mapName, feat, episodes, seed, why) => {
  const f = FEATS[feat].make(mapText)
  return { call: `len(formula_route(train_formula(${mapName}, ${featLit(feat, mapName)}, episodes=${episodes}, rng=Seeded(${seed})), ${featLit(feat, mapName)}, ${mapName})) - 1`, expected: formulaRoute(trainFormula(mapText, f, { episodes, rng: makeRng(seed) }), f, mapText).length - 1, why }
}
const OPEN_LIT = pyText(OPEN)

export const CHALLENGES_DEEPQ = [
  {
    id: 'deepq-train', piece: 'train_formula', title: 'Write train_formula', kind: 'write', uses: USES,
    prompt: `\`train_formula(text, features, episodes=300, alpha=0.1, g=0.9, eps=0.2, rng=None, batch=8, capacity=1000)\`: your Q-learner with a formula. One weight list per move, all 0. \`q_row(s)\` gives \`{move: predict(w[move], features(s))}\` (or \`{}\` at the cheese). Each move: \`choose(q_row(state), eps, rng)\`, \`sample_outcome(..., rng.random())\`, add \`(state, action, reward, nxt)\` to the memory, \`sample\` a batch, and for each move a, \`batch_nudge(w[a], items, alpha)\` with the items for a: \`(features(s), r + g * best(q_row(n)))\`. Return \`w\`.

The checks replay it with \`Seeded(n)\`: use the generator in exactly that order (choose, the outcome, the sample).`,
    starter: PIECES.train_formula.code.split('    for episode in range(episodes):')[0] + `    for episode in range(episodes):
        state = maze["start"]
        # up to 200 moves: choose, sample_outcome, remember, sample a batch, batch_nudge each move's weights
    return w
`,
    solution: PIECES.train_formula.code,
    runCalls: ['train_formula(SMALL, table_features(SMALL), episodes=3, rng=Seeded(1))', `len(formula_route(train_formula(${OPEN_LIT}, coord_features(${OPEN_LIT}), episodes=60, rng=Seeded(1)), coord_features(${OPEN_LIT}), ${OPEN_LIT})) - 1`],
    cases: [wCase(SMALL, 'SMALL', 'table', 3, 1, 'one-hot features'), wCase(SMALL, 'SMALL', 'coords', 4, 2, 'row and column'), wCase(OPEN, OPEN_LIT, 'coords', 5, 3, 'the open room'), rCase(OPEN, OPEN_LIT, 'coords', 60, 1, 'it learns the open room'), rCase(SMALL, 'SMALL', 'table', 150, 2, 'and SMALL')],
    hints: ['Inside each move: `action = choose(q_row(state), eps, rng)`, then `nxt, reward = sample_outcome(table[state][action], rng.random())`.', '`memory.add((state, action, reward, nxt))` and `sample = memory.sample(batch, rng)`.', '`for a in ACTIONS:` build `items` from the sampled moves whose action is a; if there are any, `w[a] = batch_nudge(w[a], items, alpha)`. Then `state = nxt`.'],
  },
  {
    id: 'deepq-fix-target', piece: null, title: 'Bug hunt: the target that looked backwards', kind: 'fix', uses: USES,
    prompt: 'This learner never learns the open room, however long it trains. Compare its target with lesson 10\'s: which square should the target look at?',
    starter: PIECES.train_formula.code.replace('r + g * best(q_row(n))', 'r + g * best(q_row(s))') + '\n',
    solution: PIECES.train_formula.code,
    compare: 'The target must be "what this move paid, plus the worth of where it **landed**": `q_row(n)`. With `q_row(s)` every square bootstraps from itself, so the worth of the cheese never flows back: each square learns only "my own guess, discounted, plus a step cost", which settles near −0.04 / (1 − g) everywhere. One letter, and the information stops moving.',
    runCalls: [`len(formula_route(train_formula(${OPEN_LIT}, coord_features(${OPEN_LIT}), episodes=60, rng=Seeded(1)), coord_features(${OPEN_LIT}), ${OPEN_LIT})) - 1`],
    cases: [rCase(OPEN, OPEN_LIT, 'coords', 60, 1), wCase(SMALL, 'SMALL', 'table', 3, 1), wCase(OPEN, OPEN_LIT, 'coords', 5, 3)],
    hints: ['In each remembered move `(s, a2, r, n)`, which is the square the move led to?', 'Lesson 10: the target uses the best guess at the **next** square.'],
  },
]

export const KEEP_DEEPQ = {
  pieces: ['train_formula'],
  card: `**train_formula(text, features, ...)** → \`w\`, one weight list per move: Q-learning with a formula, replay and mini-batch gradient steps. One-hot features make it A2's table learner; other features generalise, as well as they can describe the worths.`,
  remember: [
    'Replace the table with a formula and the learning loop stays the same: same target, same exploring, a nudge instead of an entry update.',
    'Good features generalise and learn faster (the open room); poor ones can\'t represent the worths at all (SEVEN).',
    'Networks learn their own features, which is why deep RL uses them.',
    'With shared weights the target moves as you learn: DQN freezes a copy to steady it.',
  ],
  ml: [['train_formula', 'Q-learning with function approximation', 'linear here; DQN uses a network'], ['the memory', 'experience replay', 'random mini-batches'], ['what the formula can describe', 'representational capacity', 'why features matter'], ['the frozen copy', 'target network', 'stabilises deep Q-learning']],
  next: 'That is the whole series. Go back to lesson 0 and read the program again: every line is now yours. Then take it further in QMaze and the Q-Arcade series.',
}
