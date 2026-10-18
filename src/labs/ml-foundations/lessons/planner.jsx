import React, { useMemo, useState } from 'react'
import MazeView from '../MazeView.jsx'
import MapEditor from '../MapEditor.jsx'
import { PIECES } from '../python/pieces.js'
import { SEVEN, SMALL, TINY, parseMap, buildTable, sweepValues, greedyPlanOf, planIteration, planMaze, followPlan, tryParse, sealIslands, makeRng, randomMaze, ACTIONS } from '../world.js'
import { pyText } from './cases.js'
import { norm } from '../runtime/checks.js'

const fmt = v => (Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2))
export const EDGE = ['.......', 'S#####G', '.......', '.......'].join('\n')

// Follow a plan with no slips: the route it intends.
export function intendedRoute(text, plan) {
  const maze = parseMap(text), table = buildTable(maze, 0)
  const q = Object.fromEntries(Object.entries(plan).map(([s, a]) => [s, Object.fromEntries(ACTIONS.map(b => [b, b === a ? 1 : 0]))]))
  q[maze.goal] = {}
  return followPlan(maze, table, q)
}
const routeOf = (slip, g = 0.9) => intendedRoute(EDGE, planMaze(EDGE, slip, g)[0])
export const EDGE_ROW = slip => Math.max(...routeOf(slip).slice(2, -2).map(c => Number(c.split(',')[0])))

// ---------------------------------------------------------------- the playground: your map, the best plan
export function Planner({ initial = EDGE, onPlanned }) {
  const [text, setText] = useState(initial)
  const [slip, setSlip] = useState(0)
  const [g, setG] = useState(0.9)
  const maze = useMemo(() => tryParse(text).maze, [text])
  const { plan, values, sweeps } = useMemo(() => {
    const table = buildTable(maze, slip)
    const [v, n] = sweepValues(table, g, 1e-9, 3000)
    return { plan: greedyPlanOf(table, v, g), values: v, sweeps: n }
  }, [maze, slip, g])
  const route = useMemo(() => intendedRoute(text, plan), [text, plan])
  const reaches = route.at(-1) === maze.goal
  return (
    <div className="mlf-trainer">
      <div className="mlf-trainer-grid">
        <div>
          <MazeView maze={maze} size={Math.min(54, Math.floor(430 / Math.max(maze.cols, maze.rows)))} arrows={plan} heat={values} heatRange={[-1, 1]} labels={Object.fromEntries(Object.entries(values).map(([s, v]) => [s, fmt(v)]))} path={reaches ? route : undefined} title="The best plan for your map" />
          <p className="mlf-muted">Arrows: the best plan. Numbers: the worth of each square under it. Purple: the route the plan intends from S (with no slips).</p>
        </div>
        <div className="mlf-trainer-side">
          <label className="mlf-knob"><span><code>slip</code> = <strong>{slip}</strong></span><input type="range" min={0} max={0.6} step={0.05} value={slip} onChange={e => { setSlip(Number(e.target.value)); onPlanned?.() }} aria-label="slip" /><small>how icy the floor is</small></label>
          <label className="mlf-knob"><span><code>g</code> = <strong>{g}</strong></span><input type="range" min={0.5} max={0.99} step={0.01} value={g} onChange={e => { setG(Number(e.target.value)); onPlanned?.() }} aria-label="g" /><small>how much the future counts</small></label>
          <p className="mlf-total">settled after <strong>{sweeps}</strong> sweeps · start worth <strong>{fmt(values[maze.start])}</strong> · {reaches ? <>route: <strong>{route.length - 1}</strong> moves</> : <strong className="mlf-bad-text">the plan doesn't reach the cheese</strong>}</p>
        </div>
      </div>
      <details className="mlf-change" open><summary>Draw your own map</summary><MapEditor text={text} setText={t => { setText(t); onPlanned?.() }} example={initial} size={30} /></details>
    </div>
  )
}

// Value iteration and policy iteration side by side, for several g.
export function CompareMethods({ text = sealIslands(SEVEN) }) {
  const rows = useMemo(() => [0.5, 0.9, 0.99].map(g => {
    const table = buildTable(parseMap(text), 0)
    const [v, sweeps] = sweepValues(table, g, 1e-9, 5000)
    const vi = greedyPlanOf(table, v, g)
    const pi = planIteration(table, g)
    const same = Object.keys(vi).every(s => vi[s] === pi.plan[s] || Math.abs(pi.values[s] - v[s]) < 1e-6)
    return { g, sweeps, rounds: pi.rounds, same }
  }), [text])
  return (
    <table className="mlf-table"><thead><tr><th>g</th><th>value iteration: sweeps</th><th>policy iteration: rounds (each one evaluates a plan: many sweeps)</th><th>same worths?</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.g}><td>{r.g}</td><td>{r.sweeps}</td><td>{r.rounds}</td><td>{r.same ? '✓ yes' : 'no'}</td></tr>)}</tbody></table>
  )
}

// ---------------------------------------------------------------- Try it first
function PlanTask({ onDone }) {
  const [changes, setChanges] = useState(0)
  return (
    <div className="mlf-stack">
      <Planner onPlanned={() => setChanges(c => { const n = c + 1; if (n === 3) onDone(); return n })} />
      <p className="mlf-muted">{changes < 3 ? `Change the ice, g or the map a few times (${changes} of 3).` : '✓ Keep experimenting as long as you like.'}</p>
    </div>
  )
}

export const TRY_PLANNER = {
  lead: 'Part 2 gave you every piece of a planner. This assembly wires them together: a map goes in, the best plan comes out. First, predict what the planner will do.',
  steps: [
    { choice: {
      id: 'planner-try-order',
      teach: 'The pieces, and what each needs: `parse_map(text)` → maze. `build_table(maze, slip)` → table. `sweep_values(table, g)` → (worths, sweeps). `greedy_plan(table, worths, g)` → plan. Each one needs what the one before it returns.',
      prompt: 'In which order must they run?',
      options: [
        { text: 'parse_map, build_table, sweep_values, greedy_plan', why: 'Each step uses the output of the one before: text → maze → table → worths → plan.' },
        { text: 'parse_map, greedy_plan, sweep_values, build_table', why: '`greedy_plan` needs the worths, and the worths need the table, so it can\'t come second.' },
        { text: 'Any order: they don\'t depend on each other', why: 'Look at the inputs: each piece needs something only the previous piece makes.' },
      ],
      answer: 0,
    } },
    { choice: {
      id: 'planner-try-edge',
      teach: `This map has two routes of exactly the same length: along the **top edge** (row 0, with the edge of the map above it) and along **row 2** (with open floor below it):\n\`\`\`\n${EDGE}\n\`\`\`\nOn ice, a slip can push the mouse sideways. Pushed off the top edge, it bumps: −0.75. Pushed down from row 2, it just lands on row 3: an ordinary −0.04 step.`,
      prompt: 'With slip 0.4, which route will the best plan take?',
      options: [
        { text: 'The top edge', why: `Same length, but every slip upwards costs a bump. That is the route with no ice (the tie goes to "up", first in ACTIONS), but with ice it is the worse one.` },
        { text: 'Row 2, away from the edge', why: `With ice, the route next to the edge pays for bumps the other route avoids, so the planner moves away from the edge. Below, check it yourself: slide the ice.` },
      ],
      answer: EDGE_ROW(0.4) === 2 ? 1 : 0,
    } },
    { md: 'Now play with the planner: change the ice and watch the route switch, change g, or draw a map of your own.' },
    { task: PlanTask },
  ],
}

// ---------------------------------------------------------------- Watch it run
function WatchPlanner() {
  return (
    <div className="mlf-watch">
      <h3>Your planner, on any map</h3>
      <p>Everything here is computed by the pieces you wrote in Part 2, in the order you chose. Try: the 7 × 7 maze (paste it from lesson 1), a map with a long corridor next to the edge, and high ice.</p>
      <Planner initial={EDGE} />
    </div>
  )
}

function WatchCompare() {
  return (
    <div className="mlf-watch">
      <h3>Two planners, one answer</h3>
      <p>Value iteration (lesson 5: sweep with the max) and policy iteration (lesson 7: evaluate a plan, improve it, repeat) on the 7 × 7 maze. Policy iteration needs very few rounds, but each round evaluates a whole plan, which is itself many sweeps.</p>
      <CompareMethods />
    </div>
  )
}

export const WATCH_PLANNER = [WatchPlanner, WatchCompare]

// ---------------------------------------------------------------- Understand
export const UNDERSTAND_PLANNER = [
  { h: 'The whole planner' },
  { code: { piece: 'plan_maze', notes: [
    ['maze = parse_map(text)', 'Lesson 1: text → squares by address.'],
    ['table = build_table(maze, slip)', 'Lesson 2: what every move does, with chances.'],
    ['values, sweeps = sweep_values(table, g)', 'Lessons 4–6: the worth of every square, by sweeping the Bellman equation with g < 1 so it settles.'],
    ['return greedy_plan(table, values, g), values', 'Lesson 7: the best move in every square, read off the worths.'],
  ] } },
  { md: 'Four lines, because each lesson built one solid piece with a clear contract. That is the point of building pieces: the assembly is short, and each part can be tested, swapped or improved on its own.' },
  { code: { piece: 'policy_iteration', notes: [
    ['plan = {s: start for s in table if table[s]}', 'Any starting plan works. Every arrow pointing right is a poor one, which shows the improvement clearly.'],
    ['values = evaluate_plan(table, plan, g)', 'How good is the current plan? (Lesson 7.)'],
    ['better[s] = plan[s] if row[plan[s]] >= best_value - 1e-12 else best_action', 'Switch only if another move is **strictly** better. If the current move is as good as the best (a tie, or a rounding hair), keep it. Without this, two equally good moves could keep swapping and the loop would never end.'],
    ['if better == plan:', 'No square wants to switch: no improvement is possible, so this plan is a best plan.'],
  ] } },
  { choice: {
    id: 'planner-u-limit',
    teach: 'Look at the planner\'s first two lines. It reads the map, and builds the complete table: for every square and every move, every outcome with its exact chance.',
    prompt: 'What does this planner need that a real mouse, or a robot, usually doesn\'t have?',
    options: [
      { text: 'A computer fast enough to sweep', why: 'Sweeping is fast here. The real problem is the input.' },
      { text: 'The table: the exact chances of every outcome of every move. In most real problems nobody hands you that. You can only try things and see what happens.', why: 'Planning needs a **model** of the world. Part 3 learns the same worths without one, just by playing, which is what Q-learning does.' },
      { text: 'A map with no ice', why: 'It handles ice fine: the chances are in the table. The trouble is knowing those chances in the first place.' },
    ],
    answer: 1,
  } },
  { note: 'Planning with a known model is **dynamic programming** for MDPs. Value iteration and policy iteration both find an **optimal policy** $\\pi^*$ and its values $V^*$. Algorithms that need the table are called **model-based**. Q-learning is **model-free**: it learns from experience alone, and Part 3 builds it.', kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const rng = makeRng(123)
const RANDOM = [randomMaze(rng, 5, 6), randomMaze(rng, 4, 7)]
const planCase = (text, name, slip, g, why) => ({ call: `plan_maze(${name ?? pyText(text)}, ${slip}, ${g})`, expected: norm(planMaze(text, slip, g)), why })
const piCase = (text, name, slip, g, why) => {
  const r = planIteration(buildTable(parseMap(text), slip), g)
  return { call: `policy_iteration(build_table(parse_map(${name ?? pyText(text)}), ${slip}), ${g})`, expected: norm([r.plan, r.values, r.rounds]), why }
}

export const CHALLENGES_PLANNER = [
  {
    id: 'planner-plan', piece: 'plan_maze', title: 'Write plan_maze', kind: 'write', uses: ['parse_map', 'legal_moves', 'move_chances', 'build_table', 'expected_value', 'option_values', 'best_option', 'sweep_values', 'greedy_plan'],
    prompt: '`plan_maze(text, slip=0.0, g=0.9)` takes a map as text and returns `(plan, values)`: the best plan and the worth of every square. Use your pieces: parse the map, build the table with the given slip, sweep the worths with g, and read off the greedy plan.',
    starter: `def plan_maze(text, slip=0.0, g=0.9):
    # parse_map -> build_table -> sweep_values -> greedy_plan
    return None, None
`,
    solution: PIECES.plan_maze.code,
    runCalls: ['plan_maze(TINY)', 'plan_maze(SMALL, 0.2)[0]'],
    cases: [planCase(TINY, 'TINY', 0, 0.9), planCase(SMALL, 'SMALL', 0.2, 0.9), planCase(SEVEN, 'SEVEN', 0, 0.9, 'with walled-off squares'), planCase(EDGE, null, 0.4, 0.9, 'the edge map, icy'), ...RANDOM.map(t => planCase(t, null, 0.2, 0.95, 'a random map'))],
    hints: ['`maze = parse_map(text)` and `table = build_table(maze, slip)`.', '`values, sweeps = sweep_values(table, g)` (it returns two things).', '`return greedy_plan(table, values, g), values`.'],
  },
  {
    id: 'planner-pi', piece: 'policy_iteration', title: 'Write policy_iteration', kind: 'write', uses: ['parse_map', 'legal_moves', 'move_chances', 'build_table', 'expected_value', 'option_values', 'best_option', 'evaluate_plan'],
    prompt: '`policy_iteration(table, g=0.9, start="right")` starts with `start` as the move in every square that has moves, then repeats: evaluate the plan, and give each square its best option, **keeping its current move whenever that is at least as good as the best** (within `1e-12`). Stop when no square changes, and return `(plan, values, rounds)`.',
    starter: `def policy_iteration(table, g=0.9, start="right"):
    plan = {s: start for s in table if table[s]}
    rounds = 0
    while True:
        rounds += 1
        values = evaluate_plan(table, plan, g)
        # improve every square; keep its move if it is as good as the best
        better = dict(plan)
        if better == plan:
            return plan, values, rounds
        plan = better
`,
    solution: PIECES.policy_iteration.code,
    runCalls: ['policy_iteration(build_table(parse_map(TINY)))', 'policy_iteration(build_table(parse_map(SMALL), 0.2))[2]'],
    cases: [piCase(TINY, 'TINY', 0, 0.9), piCase(SMALL, 'SMALL', 0, 0.9), piCase(SMALL, 'SMALL', 0.2, 0.9, 'with slips'), piCase(sealIslands(SEVEN), null, 0, 0.9, 'the big maze')],
    hints: ['For each `s` in the plan: `row = option_values(table, s, values, g)` and `best_action, best_value = best_option(row)`.', 'Keep the old move when `row[plan[s]] >= best_value - 1e-12`, otherwise take `best_action`.'],
  },
  {
    id: 'planner-fix-ice', piece: null, title: 'Bug hunt: the planner that forgot the ice', kind: 'fix', uses: ['parse_map', 'legal_moves', 'move_chances', 'build_table', 'expected_value', 'option_values', 'best_option', 'sweep_values', 'greedy_plan'],
    prompt: 'This `plan_maze` gives the same plan and worths whatever `slip` you pass. Run the two presets: the icy one should keep away from the edge. One argument never reaches the piece that needs it.',
    starter: PIECES.plan_maze.code.replace('table = build_table(maze, slip)', 'table = build_table(maze)') + '\n',
    solution: PIECES.plan_maze.code,
    compare: '`build_table(maze)` uses its default, `slip=0.0`, so the table describes a floor with no ice and every later piece plans for a world that isn\'t there. Defaults are convenient, and a forgotten argument raises no error: the only symptom is a wrong answer. A check against a case where the argument matters (here, ice) catches it.',
    runCalls: [`plan_maze(${pyText(EDGE)}, 0.0)[0][(0, 3)]`, `plan_maze(${pyText(EDGE)}, 0.4)[0][(0, 3)]`],
    cases: [planCase(EDGE, null, 0.4, 0.9), planCase(SMALL, 'SMALL', 0.3, 0.9), planCase(TINY, 'TINY', 0, 0.9)],
    hints: ['Which line uses `slip`? Does `slip` reach it?', 'Pass it on: `build_table(maze, slip)`.'],
  },
]

export const KEEP_PLANNER = {
  pieces: ['plan_maze', 'policy_iteration'],
  card: `**plan_maze(text, slip, g)** → \`(plan, values)\`: parse_map → build_table → sweep_values → greedy_plan. A complete planner for any map.

**policy_iteration(table, g)** → \`(plan, values, rounds)\`: evaluate, improve (keeping ties), repeat until nothing switches.`,
  remember: [
    'Well-made pieces make the assembly short: four lines for a complete planner.',
    'The best plan depends on the ice: near an edge, slips cost bumps, so the plan keeps away.',
    'Value iteration and policy iteration find the same worths; one sweeps with a max, the other alternates evaluating and improving.',
    'Both need the table. Part 3 learns without it.',
  ],
  ml: [['the planner', 'value iteration / policy iteration', 'dynamic programming for MDPs'], ['needing the table', 'model-based', 'plans with a model of the world'], ['the best plan', 'optimal policy, $\\pi^*$', 'no other plan does better from any square']],
  next: 'Part 3: no table. Lesson 8 starts with the simplest question: how do you find an average when you can only try it?',
}

export { TINY }
