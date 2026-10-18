import React, { useEffect, useMemo, useRef, useState } from 'react'
import MazeView from '../MazeView.jsx'
import MapEditor from '../MapEditor.jsx'
import Stepper from '../Stepper.jsx'
import { TrainPicture } from '../pictures.jsx'
import { traceTrainEpisode } from '../traces.js'
import { FINISH, FINISH_TAGS } from '../python/pieces.js'
import { SEVEN, parseMap, buildTable, newQ, trainEpisode, greedyPlan, followPlan, makeRng, stepsToGoal, best, tryParse } from '../world.js'
import { tokenizePython } from '../../a-arcade-python/analysis.js'
import { Choice } from '../Blocks.jsx'
import Markdown from '../../qmaze-lab/Markdown.jsx'

// ---------------------------------------------------------------- measured facts (finish.test.js re-checks them)
const MAZE7 = parseMap(SEVEN)
export const SHORTEST = stepsToGoal(MAZE7)[MAZE7.start]
export function learn(maze, { alpha = 0.5, g = 0.9, eps = 0.1, slip = 0 } = {}, games, seed) {
  const table = buildTable(maze, slip), q = newQ(table), rng = makeRng(seed), lens = []
  for (let e = 0; e < games; e++) lens.push(trainEpisode({ maze, table, q, alpha, g, eps, rng }).steps)
  const path = followPlan(maze, table, q)
  return { lens, q, table, reached: path.at(-1) === maze.goal, path }
}
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
export const FIRST_GAME = median(Array.from({ length: 200 }, (_, i) => learn(MAZE7, {}, 1, i + 1).lens[0]))
export const FIRST_RANGES = [[0, 20, 'fewer than 20'], [20, 100, '20 to 100'], [100, 200, '100 to 200'], [200, Infinity, 'it never gets there: the 200-move limit stops it']]
export const FIRST_RANGE = FIRST_RANGES.findIndex(([lo, hi]) => FIRST_GAME >= lo && FIRST_GAME < hi)

// ---------------------------------------------------------------- Try it first
export function TryFinish({ onDone }) {
  const [step, setStep] = useState(0)
  return (
    <div className="mlf-try">
      <p className="mlf-lead">This is where the lab is going. Below is a mouse that <strong>learns</strong> to find the cheese in a maze, written in about 25 lines of Python. Every idea in those lines is one lesson of this lab, and by the end you will have written all of it yourself. First, some predictions, before you see anything run.</p>
      <MazeView maze={MAZE7} size={40} agent={MAZE7.start} title="The 7 by 7 maze" />
      <p>The mouse starts on the top-left square, the cheese is bottom right, dark squares are walls. The mouse is given <strong>no map and no directions</strong>. All it can do is try moves, see where it ends up, and keep a guess of how good each move is in each square. Every guess starts at 0.</p>
      <div className="mlf-try-task">
        <Choice spec={{
          id: 'finish-try-first', teach: "**How the mouse picks a move.** In each square it looks at its four guesses (one per move) and takes the highest. If several are tied for highest, it picks one of the tied moves at random.\n\nAt the start every guess is 0, so all four moves are always tied.",
            prompt: 'How do you expect its **first** game to look?',
          options: [
            { text: 'It goes more or less straight to the cheese.', why: 'It can\'t: all its guesses are 0, so every move looks equally good. It has no way to know which way the cheese is.' },
            { text: 'It wanders around, bumping into walls and going back and forth, until it stumbles on the cheese.', why: 'Right. With every guess equal it is essentially moving at random. Learning is what turns that wandering into a route.' },
            { text: 'It doesn\'t move, because it knows nothing.', why: 'It always moves: each turn it must pick one of the four moves. Knowing nothing only means the pick is a coin toss.' },
          ],
          answer: 1,
        }} onDone={() => setStep(s => Math.max(s, 1))} />
      </div>
      {step >= 1 && <div className="mlf-try-task">
        <Choice spec={{
          id: 'finish-try-length', teach: `**A rule of thumb for wandering.** Something that moves in random directions keeps undoing its own progress: it steps back about as often as forward. On average, getting about $d$ squares away by random steps takes roughly $d \times d$ moves (this is called a *random walk*). Walls make it a little worse, because bumps waste moves. Learning during the game helps a little: a move it has just tried looks slightly worse than one it hasn't.

Here the cheese is ${SHORTEST} moves away by the shortest route: ${SHORTEST} × ${SHORTEST} = ${SHORTEST * SHORTEST}.`,
            prompt: `The shortest route is ${SHORTEST} moves. **About how many moves does the first game take?** (The program stops a game at 200 moves.)`,
          options: FIRST_RANGES.map(([, , text], i) => ({ text, why: i === FIRST_RANGE
            ? `A typical first game takes about ${FIRST_GAME} moves (measured over 200 first games), roughly ${Math.round(FIRST_GAME / SHORTEST)} times the shortest route. That is the size the rule of thumb predicts: ${SHORTEST} × ${SHORTEST} = ${SHORTEST * SHORTEST}. It comes out a bit lower because the mouse learns a little during the game: a move it has just tried gets a slightly negative guess, so it tends to try something else next time, which pushes it into new places.`
            : i < FIRST_RANGE
              ? `That is about what someone who *knew the way* would take. Random steps keep undoing each other: the rule of thumb says roughly ${SHORTEST} × ${SHORTEST} = ${SHORTEST * SHORTEST} moves to get ${SHORTEST} squares away.`
              : `The limit is there for safety, but it is rarely needed: ${SHORTEST} × ${SHORTEST} = ${SHORTEST * SHORTEST} is the rough size, and the mouse's small amount of learning during the game brings it below 200 most of the time.` })),
          answer: FIRST_RANGE,
        }} onDone={() => setStep(s => Math.max(s, 2))} />
      </div>}
      {step >= 2 && <div className="mlf-try-task">
        <Choice spec={{
          id: 'finish-try-learn', teach: "**What the mouse is paid.** Every ordinary move pays \u22120.04, walking into a wall pays \u22120.75, and the move onto the cheese pays +1.\n\nSo, far from the cheese, a move *towards* the cheese and a move *away* from it both pay exactly \u22120.04. The payment alone can't tell them apart.",
            prompt: 'After each move, the mouse updates one guess: "how good was pressing *that* in *this* square?". What do you think it can use to judge that?',
          options: [
            { text: 'Only what it was paid for that move.', why: 'That is part of it. But a move that pays little now can lead somewhere good. The mouse also needs to know how good the square it arrived in is.' },
            { text: 'What it was paid, **plus** its current guess of how good the square it arrived in is.', why: 'Right, and that is the whole trick. Squares next to the cheese learn first; squares next to those learn from them; good news flows back along the route, game after game. Watch it happen in the next stage.' },
            { text: 'The map, which it reads at the start.', why: 'It never sees the map. It only sees where each move took it.' },
          ],
          answer: 1,
        }} onDone={onDone} />
      </div>}
    </div>
  )
}

// ---------------------------------------------------------------- Watch it learn
function Knob({ name, value, set, min, max, step, what }) {
  return (
    <label className="mlf-knob">
      <span><code>{name}</code> = <strong>{value}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => set(Number(e.target.value))} aria-label={name} />
      <small>{what}</small>
    </label>
  )
}

function LengthChart({ lens, shortest }) {
  const W = 360, H = 120
  if (!lens.length) return <p className="mlf-muted">No games yet.</p>
  const shown = lens.slice(-150)
  const max = Math.max(...shown, shortest + 1)
  const x = i => 30 + (i / Math.max(1, shown.length - 1)) * (W - 40)
  const y = v => 10 + (1 - v / max) * (H - 30)
  return (
    <svg className="mlf-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Moves per game: the last game took ${lens.at(-1)} moves; the shortest route is ${shortest}`}>
      <line x1={30} x2={W - 10} y1={y(shortest)} y2={y(shortest)} className="mlf-chart-best" />
      <text x={W - 10} y={y(shortest) - 4} textAnchor="end" className="mlf-chart-label">shortest: {shortest}</text>
      <polyline points={shown.map((v, i) => `${x(i)},${y(v)}`).join(' ')} className="mlf-chart-line" />
      <text x={4} y={y(max) + 4} className="mlf-chart-label">{max}</text>
      <text x={4} y={y(0)} className="mlf-chart-label">0</text>
      <text x={W / 2} y={H - 2} textAnchor="middle" className="mlf-chart-label">game {Math.max(1, lens.length - shown.length + 1)} → {lens.length} · moves per game</text>
    </svg>
  )
}

export function Trainer({ initial = SEVEN }) {
  const [text, setText] = useState(initial)
  const maze = useMemo(() => tryParse(text).maze, [text])
  const [alpha, setAlpha] = useState(0.5)
  const [g, setG] = useState(0.9)
  const [eps, setEps] = useState(0.1)
  const [slip, setSlip] = useState(0)
  const [, force] = useState(0)
  const brain = useRef(null)
  const [lens, setLens] = useState([])
  const [mouse, setMouse] = useState(null)
  const [trail, setTrail] = useState([])
  const [showPlan, setShowPlan] = useState(true)
  const timer = useRef(null)

  function reset() {
    clearInterval(timer.current); timer.current = null
    const table = buildTable(maze, slip)
    brain.current = { table, q: newQ(table), rng: makeRng(Date.now() % 100000) }
    setLens([]); setMouse(null); setTrail([]); force(n => n + 1)
  }
  useEffect(reset, [text, slip]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearInterval(timer.current), [])
  if (!brain.current) { const table = buildTable(maze, slip); brain.current = { table, q: newQ(table), rng: makeRng(7) } }

  const train = n => {
    clearInterval(timer.current); timer.current = null
    const { table, q, rng } = brain.current
    const add = []
    for (let k = 0; k < n; k++) add.push(trainEpisode({ maze, table, q, alpha, g, eps, rng }).steps)
    setLens(l => [...l, ...add]); setMouse(null); setTrail([]); force(x => x + 1)
  }
  const watchOne = () => {
    clearInterval(timer.current)
    const { table, q, rng } = brain.current
    const moves = []
    const before = JSON.parse(JSON.stringify(q))
    const result = trainEpisode({ maze, table, q, alpha, g, eps, rng, onStep: s => moves.push({ ...s, snapshot: null }) })
    // Replay it: the guesses are put back and re-applied one move at a time, so the colours change as it walks.
    const live = before
    let k = 0
    setMouse(maze.start); setTrail([maze.start])
    brain.current.view = live
    timer.current = setInterval(() => {
      if (k >= moves.length) { clearInterval(timer.current); timer.current = null; brain.current.view = null; setLens(l => [...l, result.steps]); force(x => x + 1); return }
      const m = moves[k++]
      live[m.state][m.action] = m.after
      setMouse(m.nxt); setTrail(t => [...t.slice(-30), m.nxt]); force(x => x + 1)
    }, moves.length > 120 ? 25 : 80)
  }

  const q = brain.current.view ?? brain.current.q
  const heat = Object.fromEntries(Object.entries(q).filter(([, row]) => Object.keys(row).length).map(([s, row]) => [s, best(row)]))
  const labels = Object.fromEntries(Object.entries(heat).map(([s, v]) => [s, v === 0 ? '' : v.toFixed(2)]))
  const plan = showPlan ? Object.fromEntries(Object.entries(greedyPlan(q)).filter(([, a]) => a)) : {}
  const shortest = stepsToGoal(maze)[maze.start]
  const route = followPlan(maze, brain.current.table, q)
  const works = route.at(-1) === maze.goal
  const busy = timer.current !== null

  return (
    <div className="mlf-trainer">
      <div className="mlf-trainer-grid">
        <div>
          <MazeView maze={maze} size={Math.min(54, Math.floor(420 / Math.max(maze.cols, maze.rows)))} heat={heat} heatRange={[-0.6, 1]} labels={labels} arrows={plan} agent={mouse ?? undefined} path={mouse ? trail : works && showPlan ? route : undefined} title="What the mouse has learned: colour and number = best guess for each square; arrows = the move it thinks is best" />
          <p className="mlf-muted">Colour and number: the best guess for each square (red low, green high). Arrows: the move it currently thinks is best. {lens.length > 0 && (works ? <strong className="mlf-good-text">Following the arrows reaches the cheese in {route.length - 1} moves.</strong> : 'Following the arrows does not reach the cheese yet.')}</p>
        </div>
        <div className="mlf-trainer-side">
          <div className="mlf-run-controls">
            <button type="button" className="mlf-primary" onClick={watchOne} disabled={busy}>▶ Watch one game</button>
            <button type="button" className="mlf-secondary" onClick={() => train(10)} disabled={busy}>⏩ Learn from 10 games</button>
            <button type="button" className="mlf-secondary" onClick={() => train(100)} disabled={busy}>⏩ 100 games</button>
            <button type="button" className="mlf-quiet" onClick={reset}>↺ Forget everything</button>
          </div>
          <p className="mlf-total">games played: <strong>{lens.length}</strong>{lens.length > 0 && <> · last game: <strong>{lens.at(-1)}</strong> moves</>} · shortest route: {shortest ?? '—'}</p>
          <LengthChart lens={lens} shortest={shortest ?? 0} />
          <Knob name="alpha" value={alpha} set={setAlpha} min={0.05} max={1} step={0.05} what="how far each guess moves toward new evidence (lesson 9)" />
          <Knob name="g" value={g} set={setG} min={0} max={0.99} step={0.01} what="how much the future counts (lesson 6)" />
          <Knob name="eps" value={eps} set={setEps} min={0} max={1} step={0.05} what="chance of trying a random move (lesson 11)" />
          <Knob name="slip" value={slip} set={setSlip} min={0} max={0.6} step={0.05} what="how icy the floor is (lesson 2); changing it starts over" />
          <label className="mlf-toggle"><input type="checkbox" checked={showPlan} onChange={e => setShowPlan(e.target.checked)} /> show the arrows</label>
        </div>
      </div>
      <details className="mlf-change"><summary>Change the maze (learning starts over)</summary><MapEditor text={text} setText={setText} example={initial} size={30} /></details>
    </div>
  )
}

// The experiments: each one a prediction about a knob, answered by trying it. finish.test.js
// measures every claim made in the explanations over 40 seeds.
export const EXPERIMENTS = [
  {
    id: 'finish-x-g0', title: 'What if the future doesn\'t count?',
    task: 'Press **Forget everything**, set `g` to **0**, and learn from 100 games (or 300). Then look at the arrows.',
    choice: {
      teach: "Each move nudges its guess toward **target = reward + g \u00d7 (best guess of the square it reached)**. `g` says how much the second part counts: with `g = 0.9` it counts 90%, and with `g = 0` it doesn't count at all.",
      prompt: 'With `g = 0`, does the mouse learn a route to the cheese?',
      options: [
        { text: 'Yes, just more slowly.', why: 'Look at the arrows far from the cheese: they point anywhere. More games don\'t help.' },
        { text: 'Only the square right next to the cheese learns anything useful. Everywhere else, every move that does not bump looks the same (−0.04), so there is no route.', why: 'Right. The target is `reward + g * best(q[nxt])`; with `g = 0` it is just the reward of this one move. Only the move onto the cheese pays more than a step, so no square can learn that it is *on the way* to the cheese. Good news can only flow back through `g`.' },
      ],
      answer: 1,
    },
  },
  {
    id: 'finish-x-eps0', title: 'What if it never explores on purpose?',
    task: 'Forget everything, set `g` back to 0.9 and `eps` to **0**: it always picks the move with the best guess. Learn from 100 games.',
    choice: {
      teach: "With `eps = 0`, the mouse **always** picks its highest guess (a random one among ties). Every guess starts at 0. A move that has been tried and only cost steps ends up with a negative guess: \u22120.04 or lower.",
      prompt: 'Does it still find a good route?',
      options: [
        { text: 'No: with no random moves it keeps repeating its first route.', why: 'Try it: it finds the cheese and gets close to the shortest route. Something else is making it explore.' },
        { text: 'Yes. Every move it has tried costs at least −0.04, so it now looks *worse* than the moves it hasn\'t tried, which are still 0. Picking "the best guess" therefore keeps picking moves it hasn\'t tried yet.', why: 'Right: the step cost makes untried moves look attractive, so even `eps = 0` explores here. That trick is called **optimism**: starting guesses above what moves really earn. It works on this maze; lesson 11 shows worlds where it fails and `eps` is needed.' },
      ],
      answer: 1,
    },
  },
  {
    id: 'finish-x-slip', title: 'What if the floor is icy?',
    task: 'Set `slip` to **0.3** (learning starts over) and learn from 300 games. Watch one game.',
    choice: {
      teach: "With `slip = 0.3`, every move has a 0.3 chance of being replaced by a random direction, whatever the mouse has learned. The guesses become the **average** worth of each move, slips included.",
      prompt: 'Why do its games stay much longer than the shortest route, even after hundreds of games?',
      options: [
        { text: 'It hasn\'t learned anything.', why: 'Look at the arrows and colours: it has. The trouble is the floor.' },
        { text: 'Even with a good plan, about one move in three slips somewhere random, so every game wanders. The guesses learn the *average* worth of a move, slips included.', why: 'Right. A good plan cannot remove chance; it can only make the best of it. That is why everything from lesson 4 on is about **averages**.' },
      ],
      answer: 1,
    },
  },
]

function Experiment({ x, done, onDone }) {
  return (
    <div className="mlf-experiment">
      <p className="mlf-eyebrow">Experiment</p>
      <h4>{x.title}</h4>
      <Markdown>{x.task}</Markdown>
      <Choice spec={{ id: x.id, ...x.choice }} done={done} onDone={onDone} />
    </div>
  )
}

function WatchTrainer({ solved = [], onSolved }) {
  return (
    <div className="mlf-watch">
      <h3>Watch it learn</h3>
      <p>Start with <strong>▶ Watch one game</strong>: the first game wanders. Watch a few more, then let it learn from 10 games at a time and see the moves per game drop toward the shortest route, and the colours spread back from the cheese.</p>
      <Trainer />
      <h3>Experiments: change one knob, predict, try</h3>
      {EXPERIMENTS.map(x => <Experiment key={x.id} x={x} done={solved.includes(x.id)} onDone={() => onSolved?.(x.id)} />)}
    </div>
  )
}

function WatchInside() {
  const [warm, setWarm] = useState(25)
  const { frames } = useMemo(() => traceTrainEpisode(MAZE7, { warm, seed: 3 }), [warm])
  const Picture = useMemo(() => TrainPicture({ maze: MAZE7, size: 44 }), [])
  return (
    <div className="mlf-watch">
      <h3>Inside one game, line by line</h3>
      <p>The same program, one line at a time, on game number {warm + 1}. It stops twice for you to work out a number with the values on the right. Every line you see here is one of the lessons; you don't need to follow all of it yet.</p>
      <div className="mlf-chips">{[0, 5, 25, 100].map(w => <button key={w} type="button" className={`mlf-chip${w === warm ? ' on' : ''}`} aria-pressed={w === warm} onClick={() => setWarm(w)}>game {w + 1}</button>)}</div>
      <Stepper code={FINISH} frames={frames} Picture={Picture} title="Step through one game of the learner" />
    </div>
  )
}

export const WATCH_FINISH = [WatchTrainer, WatchInside]

// ---------------------------------------------------------------- Understand: the whole program, each line tagged with its lesson
export function TaggedProgram({ onOpen, titles = {}, pieces = [] }) {
  const lines = FINISH.split('\n')
  return (
    <figure className="mlf-annotated mlf-tagged">
      {lines.map((line, k) => {
        const tag = FINISH_TAGS.find(([has]) => line.includes(has))
        return (
          <div key={k} className={`mlf-annotated-row${tag ? ' noted' : ''}`}>
            <pre><span className="mlf-ln">{k + 1}</span><code>{tokenizePython(line).map((t, i) => <span key={i} className={`tk-${t.kind}`}>{t.text}</span>)}{line === '' ? ' ' : ''}</code></pre>
            {tag && <div className="mlf-annotated-note"><button type="button" className="mlf-tag" onClick={() => onOpen?.(tag[1])}>{titles[tag[1]] ?? tag[1]}</button> {tag[2]}</div>}
          </div>
        )
      })}
      {pieces.length > 0 && <figcaption>Used but not shown: {pieces.map(p => <code key={p}>{p}</code>).reduce((a, b) => [a, ', ', b])}, the pieces you write in Part 1.</figcaption>}
    </figure>
  )
}

export const UNDERSTAND_FINISH = [
  { h: 'What "learning" means here' },
  { md: `The mouse keeps a **table of guesses**, \`q[state][action]\`: for every square and every move, a number saying how good that move is from there. All of them start at 0. After every move it compares its guess with what actually happened (what it was paid, plus how good the square it reached looks) and moves the guess a little toward that. Nothing else. No map, no route-finding, no rules about cheese.

That is machine learning in miniature: **a model** (the table), **experience** (games), and **a rule for improving the model from experience** (one line). Everything in this lab, and later neural networks too, is a richer version of those three.` },
  { h: 'The program, and the lesson that builds each idea' },
  { md: 'Click a lesson name to jump there. The pieces from Part 1 (`parse_map`, `build_table`, `sample_outcome`) are used here exactly as you will write them.' },
  { custom: 'tagged-program' },
  { choice: {
    id: 'finish-u-which-line', teach: "The mouse's **model** is the table `q`: one guess per square and move. Learning means *changing the model because of experience*. Every other line plays the game: it reads `q`, picks a move, or asks the world what happened.",
            prompt: 'Which **one** line of the program is the learning? (Everything else plays the game.)',
    options: [
      { text: '`action = choose(q[state], eps, rng)`', why: 'That uses what has been learned, to pick a move. It doesn\'t change any guess.' },
      { text: '`q[state][action] += alpha * (target - q[state][action])`', why: 'Right: the only line that changes the table. `target - q[state][action]` is the surprise (how wrong the guess was), and `alpha` says how much of it to correct. Lessons 9 and 10 take this line apart.' },
      { text: '`nxt, reward = sample_outcome(table[state][action], rng.random())`', why: 'That is the world answering: where the move led and what it paid. The mouse learns *from* this, but this line doesn\'t change the guesses.' },
    ],
    answer: 1,
  } },
  { note: 'This program is **tabular Q-learning**, the algorithm in QMaze and in the first chapter of most reinforcement-learning courses. The lab builds it from the bottom: Part 1 the world, Part 2 how to work out what squares are worth when you know the table, Part 3 how to learn it by playing. Part 4 replaces the table of guesses with a formula, which is the step to neural networks and deep Q-learning.', kind: 'ml' },
]

export const KEEP_FINISH = {
  pieces: [],
  card: `**The goal of the lab:** write this learner yourself, understanding every line: the world as data (Part 1), worth by computation (Part 2), learning from samples (Part 3), and tables replaced by formulas (Part 4).`,
  remember: [
    'Learning = a model (here a table of guesses) + experience (games) + a rule that improves the model from experience.',
    `At first the mouse wanders (about ${FIRST_GAME} moves); after a few dozen games it takes close to the shortest route (${SHORTEST}).`,
    'The target is "what I got now, plus what the place I reached is worth": good news flows back from the cheese.',
    'Knobs change behaviour: g = 0 kills the flow of good news; ice keeps games long however well it has learned.',
  ],
  ml: [['the table of guesses `q`', 'Q-table, action values', 'Q for the *quality* of an action in a state'], ['one line that changes `q`', 'update rule', 'how experience changes the model'], ['`eps`', 'exploration rate, ε', 'how often to try something new']],
  next: 'Lesson 1 starts at the very beginning: the maze is text, and the program has to read it.',
}
