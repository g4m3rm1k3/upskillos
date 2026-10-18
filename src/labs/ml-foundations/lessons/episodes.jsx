import React, { useEffect, useMemo, useState } from 'react'
import MazeView from '../MazeView.jsx'
import MapEditor from '../MapEditor.jsx'
import Stepper from '../Stepper.jsx'
import { EpisodePicture, ChanceBar } from '../pictures.jsx'
import { tracePlayEpisode } from '../traces.js'
import { PIECES } from '../python/pieces.js'
import { ACTIONS, ARROW, BUMP, STEP, GOAL, TINY, SMALL, key, unkey, parseMap, buildTable, sampleOutcome, makeRng, dice, playEpisode, legalMoves, stepsToGoal, openCells, tryParse } from '../world.js'
import { pyText, pyCellLit } from './cases.js'
import { norm } from '../runtime/checks.js'
import { Choice } from '../Blocks.jsx'

// A plan that walks a shortest route: in every square, a move that gets one step closer to the cheese.
export function shortestPlan(maze) {
  const dist = stepsToGoal(maze)
  const plan = {}
  for (const s of openCells(maze)) {
    if (s === maze.goal) continue
    const moves = legalMoves(maze, s)
    plan[s] = ACTIONS.find(a => moves[a] && dist[moves[a]] === dist[s] - 1) ?? 'right'
  }
  return plan
}
// Dice numbers rounded to two places, so they are easy to read on the bar.
export const diceRolls = (seed, n = 80) => { const rng = makeRng(seed); return Array.from({ length: n }, () => Math.floor(rng.random() * 100) / 100) }
const pyPlan = plan => `{${Object.entries(plan).map(([s, a]) => `${pyCellLit(s)}: "${a}"`).join(', ')}}`

// ---------------------------------------------------------------- Try it first
const PLAY = parseMap(SMALL)
const PLAY_SLIP = 0.25
const PLAY_TABLE = buildTable(PLAY, PLAY_SLIP)

function BeTheMouse({ onGames }) {
  const [rng] = useState(() => makeRng(Date.now() % 1000003))
  const [state, setState] = useState(PLAY.start)
  const [path, setPath] = useState([PLAY.start])
  const [total, setTotal] = useState(0)
  const [last, setLast] = useState(null)
  const [games, setGames] = useState([])
  const over = state === PLAY.goal
  function press(action) {
    if (over) return
    const u = Math.floor(rng.random() * 100) / 100
    const outcomes = PLAY_TABLE[state][action]
    const [nxt, reward] = sampleOutcome(outcomes, u)
    setLast({ action, u, outcomes, nxt, reward, from: state })
    setState(nxt); setPath(p => [...p, nxt]); setTotal(t => t + reward)
    if (nxt === PLAY.goal) {
      const g = [...games, { moves: path.length, total: total + reward, keys: [...(last?.keys ?? []), action] }]
      setGames(g); onGames(g)
    }
  }
  useEffect(() => {
    const onKey = e => {
      const map = { ArrowLeft: 'left', ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down' }
      if (map[e.key] && e.target.closest?.('.mlf-play')) { e.preventDefault(); press(map[e.key]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  const again = () => { setState(PLAY.start); setPath([PLAY.start]); setTotal(0); setLast(null) }
  return (
    <div className="mlf-play" tabIndex={0} aria-label="Play the icy maze: arrow keys or the buttons">
      <div className="mlf-two">
        <MazeView maze={PLAY} size={58} rc agent={state} path={path} />
        <div className="mlf-play-side">
          <div className="mlf-pad" role="group" aria-label="Moves">
            <span /><button type="button" onClick={() => press('up')} disabled={over} aria-label="up">↑</button><span />
            <button type="button" onClick={() => press('left')} disabled={over} aria-label="left">←</button>
            <button type="button" onClick={() => press('down')} disabled={over} aria-label="down">↓</button>
            <button type="button" onClick={() => press('right')} disabled={over} aria-label="right">→</button>
          </div>
          <p className="mlf-total">moves: <strong>{path.length - 1}</strong> · total paid: <strong>{Number(total.toFixed(2))}</strong></p>
          {last && <div className="mlf-last">
            <p>You pressed <strong>{ARROW[last.action]} {last.action}</strong>. The dice rolled <code>u = {last.u}</code>. {last.nxt === last.from ? <>You <strong>bumped</strong> and stayed ({last.reward}).</> : <>You moved to ({unkey(last.nxt).join(', ')}) ({last.reward}).</>}</p>
            <ChanceBar outcomes={last.outcomes} u={last.u} picked={last.nxt} />
          </div>}
          {over && <div className="mlf-feedback good" role="status">🧀 Cheese in {path.length - 1} moves, total {Number(total.toFixed(2))}. <button type="button" className="mlf-primary" onClick={again}>Play again</button></div>}
        </div>
      </div>
      {games.length > 0 && <p className="mlf-muted">Games so far: {games.map((g, i) => `#${i + 1}: ${g.moves} moves, total ${Number(g.total.toFixed(2))}`).join(' · ')}</p>}
    </div>
  )
}

export function TryEpisodes({ onDone }) {
  const [games, setGames] = useState([])
  const [step, setStep] = useState(0)
  return (
    <div className="mlf-try">
      <p className="mlf-lead">You have a table of what every move does. Now <strong>play</strong>: you are the mouse on an icy floor (slip {PLAY_SLIP}). Each press rolls a dice, a number <code>u</code> between 0 and 1, and the bar under the map shows how that number picks what happens. Reach the cheese twice.</p>
      <BeTheMouse onGames={g => { setGames(g); if (g.length >= 2) setStep(s => Math.max(s, 1)) }} />
      {step >= 1 && (
        <div className="mlf-try-task">
          <Choice spec={{
            id: 'episodes-try-why-differ', teach: "**What happens on each press:** you choose the move, then the dice rolls a fresh number `u`, and `u` decides whether the move slips and where to. The dice doesn't know or care what you pressed last game.",
            prompt: `Your two games took ${games[0]?.moves} and ${games[1]?.moves} moves. Suppose you had pressed exactly the same keys both times. Could the totals still be different?`,
            options: [
              { text: 'No: the same keys always give the same game.', why: 'Only on a floor with no slips. Here every press is followed by a dice roll you don\'t control.' },
              { text: 'Yes: the dice numbers are different each game, so the same keys can slip differently.', why: 'Right. The outcome of one game depends on your choices **and** on chance. That is why later lessons judge a way of playing by its **average** over many games, never by one game.' },
            ],
            answer: 1,
          }} onDone={() => setStep(s => Math.max(s, 2))} />
        </div>
      )}
      {step >= 2 && (
        <div className="mlf-try-task">
          <Choice spec={{
            id: 'episodes-try-seed', teach: "**A computer can't roll a real dice.** It runs a formula instead: each \"random\" number is computed from the one before it. The very first one is computed from a number you can choose, called the **seed**. The numbers look random, but the formula never changes.",
            prompt: 'A computer\'s "random" numbers come from a formula started from a number called the **seed**. If two games use the same seed and the same keys, what happens?',
            options: [
              { text: 'The same dice numbers, so exactly the same game.', why: 'Right. Same seed, same sequence of numbers, same slips. That is how an experiment can be repeated exactly, and how the checks in this lab test code that uses chance.' },
              { text: 'Different games, because the numbers are random.', why: 'They only *look* random. The formula is fixed: started from the same seed, it gives the same numbers every time.' },
            ],
            answer: 0,
          }} onDone={onDone} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Watch it run
function WatchPlay() {
  const [text, setText] = useState(SMALL)
  const maze = useMemo(() => tryParse(text).maze, [text])
  const [slip, setSlip] = useState(0.2)
  const [seed, setSeed] = useState(4)
  const reachable = maze.start in stepsToGoal(maze)
  const plan = useMemo(() => shortestPlan(maze), [maze])
  const us = useMemo(() => diceRolls(seed), [seed])
  const { frames } = useMemo(() => tracePlayEpisode(maze, plan, us, slip, 30), [maze, plan, us, slip])
  const Picture = useMemo(() => EpisodePicture({ maze }), [maze])
  return (
    <div className="mlf-watch">
      <h3>play_episode: choose, let chance decide, get paid, repeat</h3>
      <p><code>choose</code> here is a fixed plan that always takes a shortest route (the arrows below). On ice the mouse still slips. The dice rolls come from a seed: change it for a different game, or keep it to replay the same one.</p>
      <div className="mlf-controls">
        <div><span className="mlf-eyebrow">The plan (choose)</span><MazeView maze={maze} size={24} compact arrows={plan} /></div>
        <div><span className="mlf-eyebrow">slip</span><div className="mlf-chips">{[0, 0.2, 0.4].map(s => <button key={s} type="button" className={`mlf-chip${s === slip ? ' on' : ''}`} aria-pressed={s === slip} onClick={() => setSlip(s)}>{s}</button>)}</div></div>
        <div><span className="mlf-eyebrow">seed</span><div className="mlf-chips">{[1, 4, 9].map(s => <button key={s} type="button" className={`mlf-chip${s === seed ? ' on' : ''}`} aria-pressed={s === seed} onClick={() => setSeed(s)}>{s}</button>)}<button type="button" className="mlf-chip" onClick={() => setSeed(Math.floor(Math.random() * 1000))}>🎲</button></div></div>
      </div>
      <p className="mlf-muted">The first dice rolls: {us.slice(0, 8).join(', ')} …</p>
      <details className="mlf-change"><summary>Change the map</summary><MapEditor text={text} setText={setText} example={SMALL} size={30} /></details>
      {reachable ? <Stepper code={PIECES.play_episode.code} frames={frames} Picture={Picture} title="Step through play_episode" /> : <p className="mlf-feedback bad">The cheese can't be reached on this map, so there is no route to follow.</p>}
    </div>
  )
}

// Drag u along the bar: which outcome does sample_outcome return?
export function DartBoard() {
  const outcomes = buildTable(parseMap('.#..\n.S..\n...G'), 0.2)['1,1'].right
  const [u, setU] = useState(0.5)
  const [nxt, reward] = sampleOutcome(outcomes, u)
  let running = 0
  return (
    <div className="mlf-dart">
      <ChanceBar outcomes={outcomes} u={u} picked={nxt} />
      <label className="mlf-scrub"><span>u</span><input type="range" min={0} max={0.999} step={0.001} value={u} onChange={e => setU(Number(e.target.value))} aria-label="The dice number u" /><code>{u.toFixed(3)}</code></label>
      <table className="mlf-table"><thead><tr><th>outcome</th><th>p</th><th>running total</th><th>u &lt; running?</th></tr></thead><tbody>
        {outcomes.map(([p, n, r], i) => { running += p; const hit = n === nxt && u < running && u >= running - p; return <tr key={i} className={hit ? 'changed' : ''}><td><code>({unkey(n).join(', ')}), {r}</code></td><td>{p}</td><td>{Number(running.toFixed(6))}</td><td>{u < running ? (hit ? '✓ first one: picked' : 'yes (but an earlier one was picked)') : 'no, keep walking'}</td></tr> })}
      </tbody></table>
      <p>sample_outcome returns <code>(({unkey(nxt).join(', ')}), {reward})</code>.</p>
    </div>
  )
}

export const WATCH_EPISODES = [WatchPlay]

// ---------------------------------------------------------------- Understand
const SMALL_MAZE = parseMap(SMALL)
const SMALL_TABLE0 = buildTable(SMALL_MAZE, 0)
const STRAIGHT = playEpisode(SMALL_TABLE0, SMALL_MAZE.start, s => shortestPlan(SMALL_MAZE)[s], dice(Array(50).fill(0.5)))
const STUCK = playEpisode(SMALL_TABLE0, SMALL_MAZE.start, () => 'up', dice(Array(200).fill(0.5)), 100)

export const UNDERSTAND_EPISODES = [
  { h: 'The loop at the heart of reinforcement learning' },
  { md: `Every game of every reinforcement-learning program is this loop:

1. **Look** at the state you are in.
2. **Choose** an action (\`choose(state)\`).
3. **The world answers**: chance picks an outcome from the table, giving the next state and a reward.
4. **Add up** the reward, move to the new state, and go back to 1, until a state with no moves (the cheese) or a step limit.

\`play_episode\` is that loop, and nothing else. Who chooses is a parameter: today a fixed plan, in Lesson 0's program a learner.` },
  { code: { piece: 'play_episode', notes: [
    ['state, path, total = start, [start], 0.0', 'Three things change during a game: where you are, where you have been, what you have earned. They are **local variables**: each call has its own, so two games never mix.'],
    ['while table[state] and len(path) <= cap:', 'An empty row (the goal) is falsy, so the loop ends there. `cap` is a safety net: a plan that bumps into a wall forever would otherwise never stop.'],
    ['action = choose(state)', '`choose` is a **function passed in**. `play_episode` doesn\'t know or care whether it is a fixed plan, a random choice or a learning agent: any function from a state to an action works.'],
    ['sample_outcome(table[state][action], rng.random())', '`rng.random()` gives a number u in [0, 1). The world (the table + chance) decides what happens; `choose` only picks what to *try*.'],
    ['total += reward', 'The sum of rewards over one game. In reinforcement learning this is called the **return**.'],
  ] } },
  { h: 'How one number in [0, 1) picks an outcome' },
  { md: `Lay the outcomes end to end along a line from 0 to 1, each piece as long as its chance. Throw a dart that lands evenly anywhere on the line (that is what \`rng.random()\` does): **the chance it lands in a piece is the piece's length**. \`sample_outcome\` finds the piece by walking along and adding up lengths until the running total passes u. Drag u:` },
  { figure: DartBoard },
  { code: { piece: 'sample_outcome', notes: [
    ['running += p', 'The running total is where the current piece *ends*.'],
    ['if u < running:', 'Strictly less: each piece includes its start and not its end, so a u exactly on a boundary belongs to the next piece, and every u belongs to exactly one piece.'],
    ['p, nxt, reward = outcomes[-1]', 'A safety net for rounding: in floating point, 0.7 + 0.2 + 0.1 is 0.9999999999999999, not 1. A u above that would fall off the end; it belongs to the last piece.'],
  ] } },
  { mathCode: [
    ['u \\sim \\mathrm{Uniform}[0, 1)', 'rng.random()', 'a number equally likely to be anywhere from 0 up to (not including) 1'],
    ['F_k = p_1 + \\dots + p_k', 'running', 'the running total: where piece k ends (the *cumulative* chance)'],
    ['\\text{first } k \\text{ with } u < F_k', 'if u < running: return', 'the outcome picked'],
    ['G = r_1 + r_2 + \\dots + r_T', 'total', 'the return: everything earned in one game'],
  ] },
  { predict: {
    id: 'episodes-u-straight', teach: `\`total\` adds up every payment. Each ordinary move pays ${STEP}. The final move, onto the cheese, pays ${GOAL} **instead of** ${STEP}. The route has ${STRAIGHT.path.length - 1} moves, so it has ${STRAIGHT.path.length - 2} ordinary moves and one move onto the cheese.`,
            prompt: `On \`SMALL\` with no slips, a plan that takes a shortest route reaches the cheese in ${STRAIGHT.path.length - 1} moves. Each ordinary step pays ${STEP} and the last one pays ${GOAL}. **What is \`total\`?**`,
    answer: Number(STRAIGHT.total.toFixed(6)), tolerance: 1e-6,
    misconceptions: [{ answer: Number(((STRAIGHT.path.length - 1) * STEP + GOAL).toFixed(6)), feedback: `The last move pays ${GOAL} *instead of* ${STEP}, not as well: there are only ${STRAIGHT.path.length - 2} ordinary steps.` }],
    explain: `The loop adds one reward per move. The first ${STRAIGHT.path.length - 2} moves each land on ordinary floor and pay ${STEP}, and the last one lands on the cheese and pays ${GOAL}. So the total is ${STRAIGHT.path.length - 2} × (${STEP}) + ${GOAL} = ${Number(STRAIGHT.total.toFixed(6))}. A longer route would subtract another 0.04 for every extra move, which is how the step cost makes short routes worth more.`,
  } },
  { predict: {
    id: 'episodes-u-stuck', teach: "Three facts from the code:\n- The loop runs while `len(path) <= cap`.\n- `path` starts with one entry, the start square.\n- Every move adds one entry to `path`, even a bump that stays put.\n\nSo with `cap=100` the loop runs until `path` has 101 entries: 100 moves. Each bump pays \u22120.75.",
            prompt: 'Now `choose` always says `"up"` from the start square (0, 0) of `SMALL`, which is off the top of the map. With `cap=100` and no slips, **what does `total` come to?**',
    answer: Number(STUCK.total.toFixed(6)), tolerance: 1e-6,
    explain: `The mouse bumps every time and never moves: the loop runs until \`len(path)\` passes the cap, ${STUCK.path.length - 1} bumps of ${BUMP} each = ${Number(STUCK.total.toFixed(6))}. Without \`cap\` the program would never stop.`,
  } },
  { choice: {
    id: 'episodes-u-rng', teach: "`Dice([0.3, 0.9])` is an object whose `.random()` returns 0.3, then 0.9. `random.Random(7)` is an object whose `.random()` returns the same pseudo-random numbers every time for seed 7. `play_episode` only ever calls `rng.random()`, so **any** object with a `.random()` method can be passed in.",
            prompt: 'Why is `rng` passed in as a parameter, instead of calling `random.random()` inside `play_episode`?',
    options: [
      { text: 'It runs faster.', why: 'Speed is the same. The reason is control.' },
      { text: 'Whoever calls it decides where the numbers come from: `random.Random(7)` to replay a game exactly, or a loaded dice (`Dice([0.3, 0.9])`) to test it with known numbers.', why: 'Right. The checks in this lab pass `Dice([...])`, so they know exactly which outcomes your code should pick. Hidden global randomness can\'t be tested or repeated.' },
      { text: 'Python requires it.', why: 'Python is happy either way; it is a design choice.' },
    ],
    answer: 1,
  } },
  { note: '`choose` is a **policy**: a rule from state to action. One game is an **episode**, its total reward the **return**, the goal a **terminal state**. Separating the policy (passed in) from the environment (the table) is exactly how Gymnasium, the standard RL library, is built: `env.step(action)` returns the next state and reward, and the agent decides the action.', kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const OUTS = buildTable(parseMap('.#..\n.S..\n...G'), 0.2)['1,1'].right
const pyOuts = `[${OUTS.map(([p, n, r]) => `(${p}, ${pyCellLit(n)}, ${r})`).join(', ')}]`
const sampleCase = (u, why) => ({ call: `sample_outcome(${pyOuts}, ${u})`, expected: norm([unkey(sampleOutcome(OUTS, u)[0]), sampleOutcome(OUTS, u)[1]]), why })
const SMALL_PLAN = shortestPlan(SMALL_MAZE)
const episodeCase = (text, name, slip, plan, rolls, cap, why) => {
  const maze = parseMap(text)
  const r = playEpisode(buildTable(maze, slip), maze.start, s => plan[s] ?? plan, dice(rolls), cap)
  const choose = typeof plan === 'string' ? `lambda s: "${plan}"` : `lambda s: ${pyPlan(plan)}[s]`
  return { call: `play_episode(build_table(parse_map(${name ?? pyText(text)}), ${slip}), ${pyCellLit(maze.start)}, ${choose}, Dice(${JSON.stringify(rolls)})${cap === 100 ? '' : `, cap=${cap}`})`, expected: norm([r.path.map(unkey), r.total]), why }
}
const ROLLS = diceRolls(5, 60)

export const CHALLENGES_EPISODES = [
  {
    id: 'episodes-sample', piece: 'sample_outcome', title: 'Write sample_outcome', kind: 'write', uses: [],
    prompt: `\`sample_outcome(outcomes, u)\` takes a list of \`(chance, next, reward)\` and a number \`u\` in [0, 1), and returns \`(next, reward)\` of the outcome whose piece of the line u falls in: walk along adding up chances, and pick the **first** outcome whose running total is **greater than** u. If rounding leaves u past the end, return the last outcome.`,
    starter: `def sample_outcome(outcomes, u):
    running = 0.0
    # walk along the outcomes, adding each chance to running;
    # the first one with u < running is the one that happens
    return None
`,
    solution: PIECES.sample_outcome.code,
    runCalls: [`sample_outcome(${pyOuts}, 0.5)`, `sample_outcome(${pyOuts}, 0.86)`, '0.7 + 0.2 + 0.1'],
    cases: [sampleCase(0), sampleCase(0.5), sampleCase(0.1, 'exactly on a boundary: 0.05 + 0.05'), sampleCase(0.8501), sampleCase(0.93), sampleCase(0.999),
      { call: 'sample_outcome([(0.7, (0, 0), 0.0), (0.2, (0, 1), 0.0), (0.1, (0, 2), 0.0)], 0.9999999999999999)', expected: [[0, 2], 0], why: 'rounding: these chances add up to 0.9999999999999999' }],
    hints: ['`for p, nxt, reward in outcomes:` unpacks each tuple.', 'Add first, then compare: `running += p`, then `if u < running: return nxt, reward`.', 'After the loop: `p, nxt, reward = outcomes[-1]` and return the last one.'],
  },
  {
    id: 'episodes-play', piece: 'play_episode', title: 'Write play_episode', kind: 'write', uses: ['parse_map', 'legal_moves', 'move_chances', 'build_table', 'sample_outcome'],
    prompt: `Write \`play_episode(table, start, choose, rng, cap=100)\`: start at \`start\`; while the current state has moves and the path has at most \`cap\` states, ask \`choose(state)\` for an action, let \`sample_outcome(table[state][action], rng.random())\` decide what happens, move there, record it in the path and add the reward. Return \`(path, total)\`.

The checks pass a loaded dice, \`Dice([...])\`, as \`rng\`: its \`.random()\` hands out those numbers in order.`,
    starter: `def play_episode(table, start, choose, rng, cap=100):
    state, path, total = start, [start], 0.0
    # loop: while the state has moves and len(path) <= cap
    #   choose an action, sample what happens, move, record, add the reward
    return path, total
`,
    solution: PIECES.play_episode.code,
    runCalls: [`play_episode(build_table(parse_map(SMALL)), (0, 0), lambda s: ${pyPlan(SMALL_PLAN)}[s], Dice([0.5] * 50))`, 'play_episode(build_table(parse_map(TINY), 0.2), (0, 0), lambda s: "right", Dice([0.1, 0.95, 0.3, 0.6, 0.2] * 10), cap=10)'],
    cases: [
      episodeCase(SMALL, 'SMALL', 0, SMALL_PLAN, Array(50).fill(0.5), 100, 'no slips, a shortest plan'),
      episodeCase(SMALL, 'SMALL', 0.2, SMALL_PLAN, ROLLS, 100, 'slips decided by the dice'),
      episodeCase(TINY, 'TINY', 0.3, 'right', [0.1, 0.95, 0.3, 0.6, 0.2, 0.99, 0.5, 0.1, 0.4, 0.8, 0.7, 0.05], 10, 'always right, with a cap of 10'),
      episodeCase(SMALL, 'SMALL', 0, 'up', Array(30).fill(0.5), 20, 'stuck bumping: the cap ends it'),
    ],
    hints: ['`while table[state] and len(path) <= cap:` (an empty dict is falsy).', 'Inside: `action = choose(state)`, then `state, reward = sample_outcome(table[state][action], rng.random())`.', 'Then `path.append(state)` and `total += reward`.'],
  },
  {
    id: 'episodes-fix-goal', piece: null, title: 'Bug hunt: the game that won\'t end', kind: 'fix', uses: ['parse_map', 'legal_moves', 'move_chances', 'build_table', 'sample_outcome'],
    prompt: `This version crashes with a \`KeyError\` the moment the mouse reaches the cheese. Run the first preset and read the error: which key is missing, and from which dict? Fix the loop.`,
    starter: PIECES.play_episode.code.replace('while table[state] and len(path) <= cap:', 'while len(path) <= cap:') + '\n',
    solution: PIECES.play_episode.code,
    compare: 'At the goal, `table[state]` is `{}`: there are no moves, so `table[state][action]` has no key `"right"` and Python raises `KeyError: \'right\'`. The loop must stop when the state has no moves: `while table[state] and ...`. An empty dict counts as False, which is what makes that short test work.',
    runCalls: [`play_episode(build_table(parse_map(SMALL)), (0, 0), lambda s: ${pyPlan(SMALL_PLAN)}[s], Dice([0.5] * 50))`, 'build_table(parse_map(SMALL))[(2, 3)]'],
    cases: [
      episodeCase(SMALL, 'SMALL', 0, SMALL_PLAN, Array(50).fill(0.5), 100),
      episodeCase(SMALL, 'SMALL', 0.2, SMALL_PLAN, ROLLS, 100),
      episodeCase(TINY, 'TINY', 0, { '0,0': 'right', '0,1': 'down', '1,1': 'right', '1,2': 'down' }, Array(10).fill(0.5), 100),
    ],
    hints: ['Which state is the mouse in when it crashes? What is `table` at that state?', 'The loop needs a second condition: keep going only while the state still has moves.'],
  },
]

export const KEEP_EPISODES = {
  pieces: ['sample_outcome', 'play_episode'],
  card: `**sample_outcome(outcomes, u)** → \`(next, reward)\`: lay the chances end to end on [0, 1); the first running total above u wins.

**play_episode(table, start, choose, rng, cap)** → \`(path, total)\`: choose, sample, move, add up, until a state with no moves or the cap.`,
  remember: [
    'One number u in [0, 1) picks an outcome with exactly the right chances: walk the running total.',
    'One game mixes your choices with chance, so a way of playing is judged by its average over many games.',
    'Pass functions and random generators in: then any policy plugs in, and a seed or a loaded dice makes a game repeatable and testable.',
    'Always have a way out of a loop (`cap`): some policies never reach the goal.',
  ],
  ml: [['`choose`', 'policy, $\\pi(s)$', 'the rule that picks an action in each state'], ['one game', 'episode', 'from the start to a terminal state'], ['`total`', 'return, $G$', 'all the reward of one episode'], ['the seed', 'reproducibility', 'the same numbers, the same experiment']],
  next: 'Part 2 starts: how much is each square *worth*? Lesson 4 turns a list of chances and payments into one number, the average.',
}

export { TINY }
