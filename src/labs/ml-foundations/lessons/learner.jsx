import React, { useMemo, useState } from 'react'
import Stepper from '../Stepper.jsx'
import { TrainPicture } from '../pictures.jsx'
import { traceTrainEpisode } from '../traces.js'
import { PIECES } from '../python/pieces.js'
import { SEVEN, TINY, SMALL, parseMap, makeRng, stepsToGoal } from '../world.js'
import { trainQ, greedyRoute } from '../world-part3.js'
import { Trainer } from './finish.jsx'
import { LearnVsPlan } from './bootstrap.jsx'
import { pyText } from './cases.js'
import { norm } from '../runtime/checks.js'

const SEVEN_MAZE = parseMap(SEVEN)
const SHORT7 = stepsToGoal(SEVEN_MAZE)[SEVEN_MAZE.start]
export const ROUTES = [1, 2, 3, 4, 5].map(s => greedyRoute(trainQ(SEVEN, { episodes: 300, rng: makeRng(s) }), SEVEN).length - 1)

// ---------------------------------------------------------------- Try it first
export const TRY_LEARNER = {
  lead: 'Every idea in lesson 0\'s program is now a piece you have written: the map (1), the table (2), a game (3), worth as average, backfilled and discounted (4–6), sampling and running averages (8–9), the target (10), and exploring (11). This assembly puts them together, and the learner becomes **yours**.',
  steps: [
    { choice: {
      id: 'learner-try-loop',
      teach: 'One move of the learner uses three pieces: `choose(q[state], eps, rng)` picks a move from the guesses; `sample_outcome(table[state][action], rng.random())` lets the world answer with `(next, reward)`; `q_update(q, state, action, reward, next, alpha, g)` corrects the guess using that answer.',
      prompt: 'In which order must they run, every move?',
      options: [
        { text: 'choose, then sample_outcome, then q_update', why: 'Pick a move, see what it did, learn from it. q_update needs the reward and next square that only the world can give.' },
        { text: 'q_update, then choose, then sample_outcome', why: 'q_update needs the reward and the next square of a move that hasn\'t been made yet.' },
        { text: 'sample_outcome, then choose, then q_update', why: 'The world can\'t answer a move before the move is chosen.' },
      ],
      answer: 0,
    } },
    { choice: {
      id: 'learner-try-vs-play',
      teach: 'Lesson 3\'s `play_episode` took `choose(state)` as a fixed plan, and nothing changed between games. The learner\'s loop is the same game loop with two differences.',
      prompt: 'What are they?',
      options: [
        { text: 'It uses a different map and different payments.', why: 'Same map, same table, same payments. The difference is in what it chooses with and what it changes.' },
        { text: 'It chooses from its **guesses** (with some exploring), and **after every move it updates a guess**. So the next game is played with better guesses than this one.', why: 'That is all learning adds to playing: choices driven by a model, and a model that changes with experience.' },
        { text: 'It reads the table to plan first.', why: 'It never plans with the table: the table is only used by `sample_outcome` to answer moves, playing the part of the world.' },
      ],
      answer: 1,
    } },
    { predict: {
      id: 'learner-try-route',
      teach: `Your learner, on \`SEVEN\`, with alpha 0.5, g 0.9 and eps 0.1, plays 300 games. Afterwards, follow the highest guess from S, with no slips. The shortest route is ${SHORT7} moves. Lesson 0 showed that a few dozen games is already enough to get close to it, and 300 is many more.`,
      prompt: 'How many moves does that route take?',
      answer: ROUTES[0], tolerance: 0.5,
      explain: `${ROUTES[0]} moves: the shortest route. With five different seeds the routes were ${ROUTES.join(', ')} moves. Learning from tries alone found what planning with the full table found.`,
    } },
  ],
}

// ---------------------------------------------------------------- Watch it run
function WatchYours() {
  const [warm, setWarm] = useState(25)
  const { frames } = useMemo(() => traceTrainEpisode(SEVEN_MAZE, { warm, seed: 3, code: PIECES.train.code }), [warm])
  const Picture = useMemo(() => TrainPicture({ maze: SEVEN_MAZE, size: 44 }), [])
  return (
    <div className="mlf-watch">
      <h3>Your train(), one game, line by line</h3>
      <p>The same step-through as lesson 0, now over <strong>your</strong> code: choose, sample_outcome and q_update are the pieces you wrote.</p>
      <div className="mlf-chips">{[0, 5, 25, 100].map(w => <button key={w} type="button" className={`mlf-chip${w === warm ? ' on' : ''}`} aria-pressed={w === warm} onClick={() => setWarm(w)}>game {w + 1}</button>)}</div>
      <Stepper code={PIECES.train.code} frames={frames} Picture={Picture} title="Step through train" />
    </div>
  )
}

function WatchTrain() {
  return (
    <div className="mlf-watch">
      <h3>Train it on your own maps</h3>
      <p>Lesson 0's trainer, which is now your program. Draw a maze, put ice on it, change the knobs.</p>
      <Trainer />
      <h3>Does it learn what the planner computes?</h3>
      <LearnVsPlan text={SMALL} />
    </div>
  )
}

export const WATCH_LEARNER = [WatchYours, WatchTrain]

// ---------------------------------------------------------------- Understand
export const UNDERSTAND_LEARNER = [
  { h: 'Your Q-learner' },
  { code: { piece: 'train', notes: [
    ['rng = rng or random.Random(0)', '`a or b` gives `b` when `a` is `None`: a default generator, unless one is passed in (the checks pass `Seeded(...)`).'],
    ['table = build_table(maze, slip)', 'The table plays the part of the **world**: only `sample_outcome` reads it, to answer moves. The learner itself never looks at it.'],
    ['q = {s: {a: 0.0 for a in table[s]} for s in table}', 'The model: a guess for every square and move, all 0. The cheese gets `{}`, so `best` of it is 0.'],
    ['state = maze["start"]', 'Every game starts on S. (Bug hunt below: what if this line moved up one level?)'],
    ['action = choose(q[state], eps, rng)', 'Lesson 11: mostly the best-looking move, sometimes a random one.'],
    ['nxt, reward = sample_outcome(table[state][action], rng.random())', 'Lesson 3: the world answers.'],
    ['q_update(q, state, action, reward, nxt, alpha, g)', 'Lesson 10: the only line that learns.'],
  ] } },
  { md: `**What each knob does, now that you have built every piece:**

| knob | lesson | too small | too big |
|---|---|---|---|
| \`alpha\` | 9 | learns very slowly | guesses jump around with every noisy outcome |
| \`g\` | 6 | short-sighted: far from the cheese every move looks the same | slow to settle; near 1, some squares never settle |
| \`eps\` | 11 | can get stuck on an early choice | wastes moves on random choices, even after learning |
| \`episodes\` | 8 | squares rarely visited keep wrong guesses | only costs time |` },
  { choice: {
    id: 'learner-u-limit',
    teach: 'The model is a table with one guess per square and move. `SEVEN` has 31 open squares, so 31 × 4 guesses. A guess changes only when that square and move are actually tried.',
    prompt: 'What happens on a maze with a million squares, or a game where the "square" is a whole screen of pixels?',
    options: [
      { text: 'It works the same, just more slowly.', why: 'It would need to visit every square many times before its guess there means anything, and most screens are never seen twice.' },
      { text: 'The table becomes far too big, and it learns nothing about a square it has never visited, even one that looks almost the same as a square it knows well.', why: 'A table can\'t **generalise**: each entry is learned on its own. Part 4 replaces the table with a formula that can, and that is the step to neural networks.' },
      { text: 'It needs a bigger g.', why: 'g changes how far ahead it looks, not how much it can remember or generalise.' },
    ],
    answer: 1,
  } },
  { note: 'You have built **tabular Q-learning**, the algorithm in QMaze and the first chapter of most reinforcement-learning courses, from parsing the map to the update rule. The same loop, with the table replaced by a neural network, plus a replay buffer and a target network, is **DQN**, the algorithm that learned Atari games from pixels. Part 4 builds those replacements one at a time.', kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const TRAIN_USES = ['parse_map', 'legal_moves', 'move_chances', 'build_table', 'sample_outcome', 'best', 'q_update', 'choose']
const trainCase = (text, name, episodes, seed, opts = {}, why) => {
  const q = trainQ(text, { episodes, rng: makeRng(seed), ...opts })
  const extra = Object.entries(opts).map(([k, v]) => `, ${k}=${v}`).join('')
  return { call: `train(${name ?? pyText(text)}, episodes=${episodes}${extra}, rng=Seeded(${seed}))`, expected: norm(q), why }
}
const routeCase = (text, name, episodes, seed, why) => ({ call: `len(greedy_route(train(${name ?? pyText(text)}, episodes=${episodes}, rng=Seeded(${seed})), ${name ?? pyText(text)})) - 1`, expected: greedyRoute(trainQ(text, { episodes, rng: makeRng(seed) }), text).length - 1, why })

export const CHALLENGES_LEARNER = [
  {
    id: 'learner-train', piece: 'train', title: 'Write train', kind: 'write', uses: TRAIN_USES,
    prompt: `\`train(text, episodes=200, alpha=0.5, g=0.9, eps=0.1, slip=0.0, rng=None)\` is your Q-learner. Use \`rng\`, or \`random.Random(0)\` if it is \`None\`. Parse the map, build the table, and start every guess at 0. Then, for each episode: start on S, and for at most 200 moves (stopping when the state has no moves), choose a move, let \`sample_outcome\` answer with \`rng.random()\`, and \`q_update\`. Return \`q\`.

The checks pass \`rng=Seeded(n)\`, which gives exactly the same numbers as the page, so every guess can be compared. Use the generator in exactly this order: \`choose\`, then \`rng.random()\` for the outcome.`,
    starter: `def train(text, episodes=200, alpha=0.5, g=0.9, eps=0.1, slip=0.0, rng=None):
    rng = rng or random.Random(0)
    maze = parse_map(text)
    table = build_table(maze, slip)
    q = {s: {a: 0.0 for a in table[s]} for s in table}
    # for each episode: start on S; up to 200 moves: choose, sample_outcome, q_update
    return q
`,
    solution: PIECES.train.code,
    runCalls: ['train(TINY, episodes=3, rng=Seeded(1))', 'greedy_route(train(SEVEN, episodes=300, rng=Seeded(1)), SEVEN)'],
    cases: [trainCase(TINY, 'TINY', 3, 1), trainCase(SMALL, 'SMALL', 5, 2, { slip: 0.2 }, 'with ice'), trainCase(TINY, 'TINY', 10, 3, { eps: 0.5, alpha: 0.1 }, 'other knobs'), routeCase(SEVEN, 'SEVEN', 300, 1, 'it learns the shortest route'), routeCase(SEVEN, 'SEVEN', 300, 4)],
    hints: ['`for episode in range(episodes):` then `state = maze["start"]` inside it.', '`for t in range(200):` with `if not table[state]: break` first.', '`action = choose(q[state], eps, rng)`; `nxt, reward = sample_outcome(table[state][action], rng.random())`; `q_update(q, state, action, reward, nxt, alpha, g)`; `state = nxt`.'],
  },
  {
    id: 'learner-fix-start', piece: null, title: 'Bug hunt: the learner that stopped after one game', kind: 'fix', uses: TRAIN_USES,
    prompt: 'This `train` learns a little and then stops improving, however many episodes you give it. Compare the routes after 10 and after 300 episodes, and print `state` at the start of each episode.',
    starter: PIECES.train.code.replace('    for episode in range(episodes):\n        state = maze["start"]', '    state = maze["start"]\n    for episode in range(episodes):') + '\n',
    solution: PIECES.train.code,
    compare: 'With `state = maze["start"]` outside the episode loop, only the first game starts on S. Every later "game" starts where the last one ended, on the cheese, where there are no moves, so it stops at once. One game\'s worth of learning, then nothing. Resetting the state is what makes an episode an episode.',
    runCalls: ['len(greedy_route(train(SEVEN, episodes=10, rng=Seeded(1)), SEVEN)) - 1', 'len(greedy_route(train(SEVEN, episodes=300, rng=Seeded(1)), SEVEN)) - 1'],
    cases: [routeCase(SEVEN, 'SEVEN', 300, 1), trainCase(TINY, 'TINY', 3, 1), trainCase(SMALL, 'SMALL', 5, 2, { slip: 0.2 })],
    hints: ['Where does the second episode start?', 'An episode must start on S every time: the reset belongs inside the episode loop.'],
  },
]

export const KEEP_LEARNER = {
  pieces: ['train'],
  card: `**train(text, episodes, alpha, g, eps, slip, rng)** → \`q\`, a guess for every square and move, learned only from playing: choose → sample_outcome → q_update, game after game.`,
  remember: [
    'Learning = playing + choosing from a model + updating the model after every move.',
    `On the 7 × 7 maze, 300 games are enough to learn the shortest route (${SHORT7} moves) from tries alone.`,
    'Every knob is a lesson: alpha (9), g (6), eps (11), episodes (8).',
    'A table can\'t generalise: each guess is learned on its own, which is what Part 4 fixes.',
  ],
  ml: [['your train()', 'tabular Q-learning', 'a table of action values, learned off-policy by TD'], ['the table used only to answer moves', 'environment', 'the learner is model-free'], ['the table of guesses', 'Q-table', 'one entry per state and action']],
  next: 'Part 4: replace the table with a formula, and see what a formula can do that a table can\'t.',
}

export { TINY }
