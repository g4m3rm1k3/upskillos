import React, { useMemo, useState } from 'react'
import MazeView from '../MazeView.jsx'
import MapEditor from '../MapEditor.jsx'
import Stepper from '../Stepper.jsx'
import { ValuePicture } from '../pictures.jsx'
import { traceStepsToGoal, traceSweepValues } from '../traces-part2.js'
import { PIECES } from '../python/pieces.js'
import { TINY, SMALL, SEVEN, key, unkey, parseMap, buildTable, openCells, tryParse, stepsToGoalPiece, sweepValues, sealIslands, makeRng, randomMaze } from '../world.js'
import { pyText, pyCellLit } from './cases.js'
import { norm } from '../runtime/checks.js'
import { Teach } from '../Blocks.jsx'

const r4 = x => Number(x.toFixed(4))
const ICY_TEXT = '.#..\n.S..\n...G'
const TINY_START_WORTH = r4(sweepValues(buildTable(parseMap(TINY), 0), 1)[0]['0,0'])

// ---------------------------------------------------------------- Try it: fill in the distances yourself
const FILL_TEXT = 'S...\n.##.\n....\n.#.G'
const FILL = parseMap(FILL_TEXT)
const FILL_DIST = stepsToGoalPiece(FILL)

function FillSteps({ onDone }) {
  const [typed, setTyped] = useState({})
  const [at, setAt] = useState(null)
  const [value, setValue] = useState('')
  const [note, setNote] = useState(null)
  const cells = openCells(FILL)
  const done = cells.every(c => typed[c] === FILL_DIST[c])
  function enter(e) {
    e.preventDefault()
    if (!at) return
    const n = Number(value)
    if (!value.trim() || !Number.isInteger(n)) return setNote({ text: 'Type a whole number of moves.' })
    const right = FILL_DIST[at]
    if (n === right) {
      const next = { ...typed, [at]: n }
      setTyped(next); setNote({ ok: true, text: `✓ (${unkey(at).join(', ')}) is ${n} moves from the cheese.` }); setValue('')
      const left = cells.filter(c => next[c] !== FILL_DIST[c])
      setAt(left.sort((a, b) => FILL_DIST[a] - FILL_DIST[b])[0] ?? null)
      if (!left.length) onDone()
      return
    }
    const [r, c] = unkey(at), [gr, gc] = unkey(FILL.goal)
    const straight = Math.abs(r - gr) + Math.abs(c - gc)
    const neighbourKnown = Object.values(FILL_DIST).length && cells.filter(x => typed[x] !== undefined && Math.abs(unkey(x)[0] - r) + Math.abs(unkey(x)[1] - c) === 1)
    let text = 'Not that. Find a neighbour whose distance you already know: this square is one more than its **smallest** known neighbour.'
    if (n === right + 1) text = 'One too many: count moves, not squares. The cheese square itself is 0, so a square right next to it is 1.'
    else if (n === straight && straight !== right) text = `${n} would be right if you could walk through walls (that is the distance "as the crow flies"). The mouse has to go around them.`
    else if (neighbourKnown.length && n > right) text = `Too many. Look at its neighbours: one of them is ${Math.min(...neighbourKnown.map(x => typed[x]))} moves away. Is there a shorter way round?`
    setNote({ text })
  }
  return (
    <div className="mlf-fill">
      <Teach>{'**How to work it out.** The cheese is 0 moves from itself. A square next to the cheese is 1. In general, a square is **one more than its nearest neighbour**, where "nearest" means the neighbour with the smallest number. Walls can\'t be crossed. So work outwards from the cheese: all the 1s, then the 2s, and so on.'}</Teach>
      <p><strong>Click a square, then type how many moves it is from the cheese.</strong> Fill every open square.</p>
      <div className="mlf-two">
        <MazeView maze={FILL} size={58} rc labels={Object.fromEntries(Object.entries(typed).map(([c, n]) => [c, String(n)]).concat([[FILL.goal, '0']]))} marks={{ ...Object.fromEntries(Object.keys(typed).map(c => [c, 'good'])), ...(at ? { [at]: 'focus' } : {}) }} onCell={c => { if (FILL.cells[c] !== '#' && c !== FILL.goal && typed[c] === undefined) { setAt(c); setNote(null) } }} title="Fill in the distances" />
        <form onSubmit={enter} className="mlf-ask-form" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <span>{at ? <>Moves from <strong>({unkey(at).join(', ')})</strong> to the cheese:</> : done ? 'All done.' : 'Click a square first.'}</span>
          <div className="mlf-ask-form"><input value={value} onChange={e => setValue(e.target.value)} aria-label="Moves to the cheese" inputMode="numeric" disabled={!at || done} /><button className="mlf-primary" disabled={!at || done}>Enter</button></div>
          <span className="mlf-muted">{cells.filter(c => typed[c] === FILL_DIST[c]).length} of {cells.length - 1} squares filled</span>
        </form>
      </div>
      {note && <p className={`mlf-feedback ${note.ok ? 'good' : 'bad'}`} role="status">{note.text}</p>}
      {done && <p className="mlf-feedback good" role="status">✓ That is exactly what <code>steps_to_goal</code> computes: you worked outwards from the cheese, one ring at a time. Each number came from a neighbour's number. That is backfilling.</p>}
    </div>
  )
}

export const TRY_BACKFILL = {
  lead: 'Lesson 4 handed you the worth of every square. This lesson works them out. The trick is to start from the one square whose worth you know for certain.',
  steps: [
    { choice: {
      id: 'backfill-try-start',
      teach: 'To work out the worth of a square, you need the worths of the squares its moves lead to (lesson 4). So you need some square whose worth is known **without** knowing any other.',
      prompt: 'Which square\'s worth is known for certain, before any other?',
      options: [
        { text: 'The start, S', why: 'Its worth depends on every square between it and the cheese: it is the last one you can know, not the first.' },
        { text: 'The cheese: the game is over there, so nothing more can be earned. Its worth is 0.', why: 'It is the anchor. Every other worth is built backwards from it, one neighbour at a time.' },
        { text: 'Any square next to a wall', why: 'Walls change what the moves do, but they don\'t tell you what a square is worth.' },
      ],
      answer: 1,
    } },
    { predict: {
      id: 'backfill-try-two-away',
      teach: '**No slips, for now.** Every move pays −0.04, except the move onto the cheese, which pays +1, and the game ends there. So a square right next to the cheese is worth **1**: one move, +1, done.',
      prompt: 'A square **two** moves from the cheese, playing well: what is it worth?',
      answer: 0.96, tolerance: 1e-6,
      misconceptions: [{ answer: 0.92, feedback: 'That counts two ordinary steps. The second move is the one onto the cheese: it pays +1, not −0.04.' }, { answer: 1, feedback: 'The first move only gets you next to the cheese, and it costs −0.04.' }],
      explain: 'One ordinary move (−0.04) to the square next to the cheese, which is worth 1: −0.04 + 1 = 0.96. Equivalently: the worth of the next square, minus the cost of getting there.',
    } },
    { predict: {
      id: 'backfill-try-tiny',
      teach: 'Each extra move away from the cheese adds one more −0.04 before the +1. A square $d$ moves away is worth $1 - 0.04\\,(d - 1)$.\n\n`TINY` is\n```\nS.#\n#..\n##G\n```\nand its start is 4 moves from the cheese (right, down, right, down).',
      prompt: 'What is the start of `TINY` worth?',
      answer: TINY_START_WORTH, tolerance: 1e-6,
      misconceptions: [{ answer: 0.84, feedback: 'That charges −0.04 for all 4 moves. The last move pays +1 *instead*, so only 3 moves cost 0.04.' }],
      explain: `1 − 0.04 × (4 − 1) = ${TINY_START_WORTH}. You just backfilled by hand: 1 next to the cheese, then 0.96, then 0.92, then 0.88.`,
    } },
    { task: FillSteps },
  ],
}

// ---------------------------------------------------------------- Watch it run
function WatchBfs() {
  const [text, setText] = useState(SMALL)
  const maze = useMemo(() => tryParse(text).maze, [text])
  const { frames } = useMemo(() => traceStepsToGoal(maze), [maze])
  const Picture = useMemo(() => ValuePicture({ maze, size: 54 }), [maze])
  return (
    <div className="mlf-watch">
      <h3>steps_to_goal: a ripple out from the cheese</h3>
      <p>The numbers spread out from the cheese one ring at a time, exactly as you filled them in. It asks which square leaves the queue next, and what distance a new square gets.</p>
      <details className="mlf-change"><summary>Change the map</summary><MapEditor text={text} setText={setText} example={SMALL} size={30} needPath={false} /></details>
      <Stepper code={PIECES.steps_to_goal.code} frames={frames} Picture={Picture} title="Step through steps_to_goal" />
    </div>
  )
}

function WatchSweeps() {
  const [text, setText] = useState(ICY_TEXT)
  const [slip, setSlip] = useState(0)
  const maze = useMemo(() => parseMap(sealIslands(tryParse(text).maze ? text : ICY_TEXT)), [text])
  const table = useMemo(() => buildTable(maze, slip), [maze, slip])
  const { frames } = useMemo(() => traceSweepValues(table, 1, 40), [table])
  const Picture = useMemo(() => ValuePicture({ maze, size: 58, heatRange: [-0.5, 1] }), [maze])
  return (
    <div className="mlf-watch">
      <h3>sweep_values: worth for any table, chances and all</h3>
      <p>Counting moves only works when every move costs the same and nothing slips. Sweeping works for any table: visit every square, set its worth to its best option (lesson 4), and repeat until nothing changes. Watch the worth spread from the cheese. With slip 0.2 it takes more sweeps, because the slips keep feeding small changes back.</p>
      <div className="mlf-controls"><div><span className="mlf-eyebrow">slip</span><div className="mlf-chips">{[0, 0.2].map(s => <button key={s} type="button" className={`mlf-chip${s === slip ? ' on' : ''}`} aria-pressed={s === slip} onClick={() => setSlip(s)}>{s}</button>)}</div></div></div>
      <details className="mlf-change"><summary>Change the map (squares that can't reach the cheese are walled up: lesson 6 shows why)</summary><MapEditor text={text} setText={setText} example={ICY_TEXT} size={30} /></details>
      <Stepper code={PIECES.sweep_values.code} frames={frames} Picture={Picture} title="Step through sweep_values" />
    </div>
  )
}

// Sweep by sweep on a bigger map, with the biggest change per sweep.
export function SweepMovie({ text = sealIslands(SEVEN) }) {
  const [slip, setSlip] = useState(0)
  const maze = useMemo(() => parseMap(text), [text])
  const shots = useMemo(() => {
    const out = [{ sweep: 0, values: Object.fromEntries(Object.keys(buildTable(maze, slip)).map(s => [s, 0])), biggest: null }]
    sweepValues(buildTable(maze, slip), 1, 1e-9, 1000, s => out.push(s))
    return out
  }, [maze, slip])
  const [k, setK] = useState(0)
  const at = Math.min(k, shots.length - 1)
  const shot = shots[at]
  return (
    <div className="mlf-explorer">
      <div className="mlf-controls">
        <div><span className="mlf-eyebrow">slip</span><div className="mlf-chips">{[0, 0.2].map(s => <button key={s} type="button" className={`mlf-chip${s === slip ? ' on' : ''}`} aria-pressed={s === slip} onClick={() => { setSlip(s); setK(0) }}>{s}</button>)}</div></div>
        <label className="mlf-scrub"><span>after sweep</span><input type="range" min={0} max={shots.length - 1} value={at} onChange={e => setK(Number(e.target.value))} aria-label="Sweep number" /><strong>{shot.sweep}</strong> of {shots.length - 1}</label>
      </div>
      <MazeView maze={maze} size={48} heat={shot.values} heatRange={[-0.5, 1]} labels={Object.fromEntries(Object.entries(shot.values).map(([s, v]) => [s, v ? r4(v).toFixed(2) : '0']))} />
      <p className="mlf-muted">{shot.biggest === null ? 'Before any sweep: every worth is 0.' : `Biggest change in this sweep: ${r4(shot.biggest)}.`} {at === shots.length - 1 && 'Settled: one more sweep would change nothing.'}</p>
    </div>
  )
}

function WatchMovie() {
  return (
    <div className="mlf-watch">
      <h3>The big maze, sweep by sweep</h3>
      <p>Drag the slider. Without slips, each sweep pushes correct worths a few squares further from the cheese (more in the direction the sweep travels, row by row, fewer against it). With slips, worths keep creeping by smaller and smaller amounts until the change is below the tolerance.</p>
      <SweepMovie />
    </div>
  )
}

export const WATCH_BACKFILL = [WatchBfs, WatchSweeps, WatchMovie]

// ---------------------------------------------------------------- Understand
const SEVEN_SEALED = parseMap(sealIslands(SEVEN))
const D7 = stepsToGoalPiece(parseMap(SEVEN))
const SMALL_SWEEPS = sweepValues(buildTable(parseMap(SMALL), 0), 1)[1]

export const UNDERSTAND_BACKFILL = [
  { h: 'Breadth-first search: a ripple from the cheese' },
  { md: 'When every move costs the same, the worth of a square depends only on **how many moves** it is from the cheese. `steps_to_goal` finds that for every square at once, by working outwards: the cheese, then everything 1 move away, then 2, and so on.' },
  { code: { piece: 'steps_to_goal', notes: [
    ['dist = {maze["goal"]: 0}', 'The anchor: the cheese is 0 moves from itself.'],
    ['queue = [maze["goal"]]', 'Squares whose distance is known but whose neighbours haven\'t been looked at yet.'],
    ['cell = queue.pop(0)', '**First in, first out.** Squares leave in the order they joined, so all of distance 1 are handled before any of distance 2. That order is what makes the *first* distance a square gets the *shortest* one.'],
    ['for nxt in legal_moves(maze, cell).values():', 'The moves are reversible here (if you can step from A to B you can step back), so "squares that can reach `cell`" are just its neighbours. Lesson 1\'s piece again.'],
    ['if nxt not in dist:', 'Already reached means already given its shortest distance: never overwrite it.'],
  ] } },
  { choice: {
    id: 'backfill-u-pop',
    teach: '`list.pop()` with no argument removes the **last** item: the newest one added. Then the search keeps following the newest square it found, going deep along one route before trying others.',
    prompt: 'What goes wrong if `queue.pop(0)` is replaced by `queue.pop()`?',
    options: [
      { text: 'Nothing: every square is still reached.', why: 'Every square is still reached, but not necessarily first by its shortest route. Since a square keeps the first distance it gets, some distances come out too big.' },
      { text: 'Squares can be reached first along a long way round. They keep that first, too-large distance, because `if nxt not in dist` never lets it be corrected.', why: 'On a map with two routes to the same square (like `SMALL`, which has a loop), the deep-first order can reach a square by the long route first. You will fix exactly this in Write it.' },
      { text: 'It crashes on an empty list.', why: 'The loop stops when the queue is empty, so `pop` is never called on an empty list.' },
    ],
    answer: 1,
  } },
  { predict: {
    id: 'backfill-u-seven',
    teach: '`SEVEN` (rows numbered from 0 at the top):\n```\nS.#....   0\n#.#.##.   1\n....#..   2\n.####.#   3\n....#..   4\n###...#   5\n...##.G   6\n```\nThe start (0, 0) can only leave by (0, 1), then down column 1 to row 2. Follow the open squares.',
    prompt: 'What is `steps_to_goal(parse_map(SEVEN))[(0, 0)]`, the shortest number of moves from the start to the cheese?',
    answer: D7['0,0'],
    explain: `${D7['0,0']} moves. A shortest route: right to (0, 1), down to (2, 1), left to (2, 0), down to (4, 0), right along row 4 to (4, 3), down to (5, 3), right to (5, 5), down to (6, 5), and right onto the cheese. The way round by the top right is 18 moves: longer, so breadth-first search never uses it for the start.`,
  } },
  { h: 'Sweeping: the same idea for any table' },
  { md: `With slips and different payments, counting moves isn't enough. But the idea survives: **a square's worth is its best option, computed from its neighbours' worths**:

$$V(s) = \\max_a \\sum_{s'} P(s' \\mid s, a)\\,\\big(R + g\\,V(s')\\big)$$

This is the **Bellman equation**. Every square has to satisfy it at the same time, so it can't be solved one square at a time in a single pass. \`sweep_values\` starts from all zeros and applies it to every square, over and over. Each sweep corrects the squares next to ones that are already right, so correct worths spread outwards from the cheese. When a whole sweep changes nothing (less than \`tol\`), every square satisfies the equation.` },
  { code: { piece: 'sweep_values', notes: [
    ['values = {s: 0.0 for s in table}', 'A starting guess. Any guess works here; 0 is simple. The cheese stays 0 because it is never updated.'],
    ['for sweep in range(1, max_sweeps + 1):', '`max_sweeps` is a safety net: on some maps the worths never settle (lesson 6 shows one).'],
    ['if not table[s]:', 'The cheese has no moves: skip it, and its worth stays 0.'],
    ['new = best_option(option_values(table, s, values, g))[1]', 'Lesson 4\'s two pieces: the worth of each move, then the best one. `[1]` takes the worth from the `(action, worth)` pair.'],
    ['biggest = max(biggest, abs(new - values[s]))', 'Track the largest change in this sweep: a measure of how far from settled the worths still are.'],
    ['values[s] = new', '**In place**: later squares in the same sweep already see this new worth. That makes it settle faster than waiting for a whole sweep to finish before using new values.'],
  ] } },
  { mathCode: [
    ['V(s)', 'values[s]', 'the worth of square s, playing well'],
    ['\\max_a', 'best_option(...)[1]', 'the best of the moves'],
    ["\\sum_{s'} P(s'\\mid s,a)(R + g V(s'))", 'option_values(...)[a]', 'the worth of one move (lesson 4)'],
    ['|V_{new} - V_{old}| < \\text{tol}', 'biggest < tol', 'settled: a full sweep barely changed anything'],
  ] },
  { choice: {
    id: 'backfill-u-order',
    teach: 'The sweep stops only when **every** square equals its best option, computed from the worths of its neighbours: the Bellman equation holds everywhere at once. On these maps there is exactly one set of worths that does that.',
    prompt: 'If the sweep visited the squares bottom row first instead of top row first, what would change?',
    options: [
      { text: 'The final worths.', why: 'Whatever the order, the sweep only stops at worths that satisfy the equation everywhere, and there is only one such set.' },
      { text: 'Only how many sweeps it takes. The final worths are the same.', why: `The order decides how fast good news travels. Here the cheese is in the bottom row, so a bottom-first sweep passes news upwards within one sweep. Top-first, as written, \`SMALL\` takes ${SMALL_SWEEPS} sweeps. Either way it stops at the same worths.` },
      { text: 'It would never settle.', why: 'It settles in any order on these maps. (Lesson 6 shows a map where it never settles, but for a different reason.)' },
    ],
    answer: 1,
  } },
  { note: 'This is **dynamic programming**: solve a big problem (the worth of the start) by combining the answers to smaller ones (the worths of its neighbours), each computed once and stored. Sweeping the Bellman equation until it settles is called **value iteration**. It is the planning algorithm at the heart of reinforcement learning, and the assembly after lesson 7 builds a full planner from it.', kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const rng = makeRng(77)
const RANDOM = [randomMaze(rng, 5, 6), randomMaze(rng, 4, 7), randomMaze(rng, 6, 5)].map(sealIslands)
const LOOPY = 'S....\n.#.#.\n.....\n.#.#.\n....G'
const distCase = (text, name, why) => ({ call: `steps_to_goal(parse_map(${name ?? pyText(text)}))`, expected: norm(stepsToGoalPiece(parseMap(text))), why })
const sweepCase = (text, name, slip, why) => {
  const [values, sweeps] = sweepValues(buildTable(parseMap(text), slip), 1)
  return { call: `sweep_values(build_table(parse_map(${name ?? pyText(text)}), ${slip}))`, expected: norm([values, sweeps]), why }
}

export const CHALLENGES_BACKFILL = [
  {
    id: 'backfill-steps', piece: 'steps_to_goal', title: 'Write steps_to_goal', kind: 'write', uses: ['parse_map', 'legal_moves'],
    prompt: '`steps_to_goal(maze)` returns a dict `{square: number of moves to the cheese}` for every square that can reach the cheese, by breadth-first search from the cheese: a queue, first in first out, and each new neighbour one more than the square it was found from.',
    starter: `def steps_to_goal(maze):
    dist = {maze["goal"]: 0}
    queue = [maze["goal"]]
    # while the queue is not empty: take the front square,
    # and give each neighbour that has no distance yet its distance + 1
    return dist
`,
    solution: PIECES.steps_to_goal.code,
    runCalls: ['steps_to_goal(parse_map(TINY))', 'steps_to_goal(parse_map(SMALL))[(0, 0)]'],
    cases: [distCase(TINY, 'TINY'), distCase(SMALL, 'SMALL', 'two routes round the wall'), distCase(SEVEN, 'SEVEN', 'with squares that can never reach it'), distCase(LOOPY, null, 'many loops'), ...RANDOM.map(t => distCase(t, null, 'a random map'))],
    hints: ['`while queue:` keeps going while the list is not empty.', '`cell = queue.pop(0)` takes the front; then `for nxt in legal_moves(maze, cell).values():`.', 'If `nxt not in dist`: `dist[nxt] = dist[cell] + 1` and `queue.append(nxt)`.'],
  },
  {
    id: 'backfill-sweep', piece: 'sweep_values', title: 'Write sweep_values', kind: 'write', uses: ['parse_map', 'legal_moves', 'move_chances', 'build_table', 'expected_value', 'option_values', 'best_option'],
    prompt: '`sweep_values(table, g=1.0, tol=1e-9, max_sweeps=1000)` starts every worth at 0 and sweeps: for every square with moves (in the order of `table`), set its worth, **in place**, to its best option. Stop after the first sweep whose biggest change is below `tol`, and return `(values, number of sweeps)`. If it never settles, return after `max_sweeps`.',
    starter: `def sweep_values(table, g=1.0, tol=1e-9, max_sweeps=1000):
    values = {s: 0.0 for s in table}
    for sweep in range(1, max_sweeps + 1):
        biggest = 0.0
        # for every square with moves: its new worth is its best option
        # (use option_values and best_option); track the biggest change
        if biggest < tol:
            return values, sweep
    return values, max_sweeps
`,
    solution: PIECES.sweep_values.code,
    runCalls: ['sweep_values(build_table(parse_map(TINY)))', 'sweep_values(build_table(parse_map(ICY), 0.2))[1]'],
    cases: [sweepCase(TINY, 'TINY', 0), sweepCase(SMALL, 'SMALL', 0), sweepCase(ICY_TEXT, 'ICY', 0.2, 'with slips'), sweepCase(SMALL, 'SMALL', 0.4), ...RANDOM.slice(0, 2).map(t => sweepCase(t, null, 0.1, 'a random map'))],
    hints: ['`for s in table:`, and `if not table[s]: continue` skips the cheese.', '`new = best_option(option_values(table, s, values, g))[1]`.', '`biggest = max(biggest, abs(new - values[s]))` **before** `values[s] = new`.'],
  },
  {
    id: 'backfill-fix-stack', piece: null, title: 'Bug hunt: the long way round', kind: 'fix', uses: ['parse_map', 'legal_moves'],
    prompt: 'This `steps_to_goal` is right on `TINY` (a single corridor) but wrong on `SMALL`, which has two routes round the wall. Run both presets and compare `(0, 0)` with the shortest route you can count by hand.',
    starter: PIECES.steps_to_goal.code.replace('cell = queue.pop(0)', 'cell = queue.pop()') + '\n',
    solution: PIECES.steps_to_goal.code,
    compare: '`queue.pop()` takes the **newest** square, so the search runs deep down one route before trying the others: a stack, not a queue. A square reached first by the long way round gets the long distance, and `if nxt not in dist` stops it ever being corrected. `pop(0)` keeps squares in order of distance, so the first route found is a shortest one.',
    runCalls: ['steps_to_goal(parse_map(TINY))', 'steps_to_goal(parse_map(SMALL))'],
    cases: [distCase(SMALL, 'SMALL'), distCase(LOOPY, null), distCase(SEVEN, 'SEVEN'), distCase(TINY, 'TINY')],
    hints: ['On `SMALL`, the start (0, 0) is 5 moves from the cheese. What does this version say?', 'Which end of the list does `pop()` take from? Which end did the oldest squares go in?'],
  },
]

export const KEEP_BACKFILL = {
  pieces: ['steps_to_goal', 'sweep_values'],
  card: `**steps_to_goal(maze)** → \`{square: moves to the cheese}\`: breadth-first from the cheese, a queue taken from the front.

**sweep_values(table, g, tol, max_sweeps)** → \`(values, sweeps)\`: every worth set to its best option, in place, sweep after sweep, until a sweep changes less than \`tol\`.`,
  remember: [
    'Start from what you know for sure (the cheese is worth 0) and work backwards: each worth comes from its neighbours\'.',
    'First in, first out makes the first route found a shortest one; first in, last out does not.',
    'The Bellman equation: a square\'s worth is its best move\'s average of payment + worth of where you land.',
    'Sweeping it until nothing changes solves it for any table. The order of the sweep changes the speed, never the answer.',
  ],
  ml: [['the worth equation', 'Bellman (optimality) equation', 'every value equals its best one-step look-ahead'], ['sweeping it until it settles', 'value iteration', 'iterate the equation to a fixed point'], ['steps_to_goal', 'breadth-first search', 'shortest paths when every step costs the same']],
  next: 'Lesson 6: on `SEVEN`, sweeping with g = 1 never settles. Why? And what does g have to do with it?',
}

export { key }
