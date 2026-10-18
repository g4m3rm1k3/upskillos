import React, { useMemo, useState } from 'react'
import MazeView from '../MazeView.jsx'
import Stepper from '../Stepper.jsx'
import { ValuePicture } from '../pictures.jsx'
import { traceEvaluatePlan } from '../traces-part2.js'
import { PIECES } from '../python/pieces.js'
import { ACTIONS, ARROW, TINY, SMALL, SEVEN, key, unkey, parseMap, buildTable, sweepValues, greedyPlanOf, evaluatePlan, planIteration, optionValues, bestOption, sealIslands, makeRng, randomMaze } from '../world.js'
import { pyText, pyCellLit } from './cases.js'
import { norm } from '../runtime/checks.js'
import { Teach } from '../Blocks.jsx'

const r4 = x => Number(x.toFixed(4))
const fmt = v => (Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2))
const G = 0.9

// ---------------------------------------------------------------- the plan editor (Try it, and Watch)
const ED_TEXT = SMALL
const ED = parseMap(ED_TEXT)
const ED_TABLE = buildTable(ED, 0)
const BEST = sweepValues(ED_TABLE, G)[0]
const ALL_RIGHT = Object.fromEntries(Object.keys(ED_TABLE).filter(s => Object.keys(ED_TABLE[s]).length).map(s => [s, 'right']))

export function PlanEditor({ onDone, table = ED_TABLE, maze = ED, start = ALL_RIGHT }) {
  const [plan, setPlan] = useState(start)
  const [won, setWon] = useState(false)
  const best = useMemo(() => sweepValues(table, G)[0], [table])
  const values = useMemo(() => evaluatePlan(table, plan, G), [table, plan])
  const turn = cell => {
    if (!plan[cell]) return
    const next = { ...plan, [cell]: ACTIONS[(ACTIONS.indexOf(plan[cell]) + 1) % 4] }
    setPlan(next)
    const v = evaluatePlan(table, next, G)
    if (!won && v[maze.start] >= best[maze.start] - 1e-9) { setWon(true); onDone?.() }
  }
  return (
    <div className="mlf-explorer">
      <p><strong>Click a square to turn its arrow.</strong> The numbers are the worth of every square <em>if the mouse follows your arrows</em> (g = {G}, no slips), recomputed at once.</p>
      <MazeView maze={maze} size={62} rc arrows={plan} labels={Object.fromEntries(Object.entries(values).map(([s, v]) => [s, fmt(v)]))} heat={values} heatRange={[-1, 1]} onCell={turn} marks={{ [maze.start]: won ? 'good' : 'focus' }} title="Your plan: click a square to turn its arrow" />
      <p className="mlf-total">your start is worth <strong>{r4(values[maze.start])}</strong> · the best possible: <strong>{r4(best[maze.start])}</strong>{won && <strong className="mlf-good-text"> · ✓ you found a best plan</strong>}</p>
    </div>
  )
}

// ---------------------------------------------------------------- Try it first
const BUMP_FOREVER = r4(-0.75 / (1 - G))

export const TRY_PLANS = {
  lead: 'The arrows you have seen on the maps (one move per square) are a **plan**. Any plan can be followed, good or bad. This lesson asks two questions: how good is a given plan, and how do you make it better?',
  steps: [
    { predict: {
      id: 'plans-try-bump',
      teach: `A plan says "in this square, always do this". Suppose the plan in the top-right corner of \`SMALL\` says **right**, off the edge of the map. The mouse bumps (−0.75), stays in the same square, and the plan says right again, forever. With g = ${G}: a payment c on every move, forever, is worth c / (1 − g) (lesson 6).`,
      prompt: 'Following that plan from that corner, what is the square worth?',
      answer: BUMP_FOREVER, tolerance: 1e-3,
      misconceptions: [{ answer: -0.75, tolerance: 1e-6, feedback: 'That is just the first bump. The plan never changes, so it bumps on every move after that too.' }],
      explain: `−0.75 / (1 − ${G}) = ${BUMP_FOREVER}. One bad arrow can make a square terrible, and every square whose arrows lead into it inherits some of that.`,
    } },
    { md: 'Now build a plan yourself. Every arrow starts pointing right, which is a poor plan. Turn arrows until the start is worth as much as it can be.' },
    { task: PlanEditor },
    { choice: {
      id: 'plans-try-improve',
      teach: 'Suppose you know the worth of every square **under your current plan**. Lesson 4 gives the worth of each of the four moves from a square: the average of payment + g × worth of where you land, using those worths.',
      prompt: 'To improve the plan at one square, which move should its arrow point to?',
      options: [
        { text: 'The move towards the square with the highest worth on the map', why: 'Close, but a move can slip, bump, or cost more. The fair comparison is each move\'s average of payment + worth of where it lands.' },
        { text: 'The move with the highest option value, computed from the current plan\'s worths', why: 'This is **plan improvement**: switch every square to its best option given the current worths. The new plan is never worse, and if nothing switches, the plan is already the best.' },
        { text: 'A random different move', why: 'That might help or hurt. The worths tell you which move helps, so there is no need to guess.' },
      ],
      answer: 1,
    } },
  ],
}

// ---------------------------------------------------------------- Watch it run
function WatchEvaluate() {
  const [which, setWhich] = useState('right')
  const plans = { right: ALL_RIGHT, best: greedyPlanOf(ED_TABLE, BEST, G) }
  const { frames } = useMemo(() => traceEvaluatePlan(ED_TABLE, plans[which], G), [which]) // eslint-disable-line react-hooks/exhaustive-deps
  const Picture = useMemo(() => ValuePicture({ maze: ED, size: 58, heatRange: [-1, 1] }), [])
  return (
    <div className="mlf-watch">
      <h3>evaluate_plan: what a fixed plan is worth</h3>
      <p>The same sweeping as lesson 5, with one difference: each square uses <strong>its plan's move</strong> instead of the best move. It asks what a square that bumps forever settles at.</p>
      <div className="mlf-chips">{[['right', 'every arrow right'], ['best', 'the best plan']].map(([k, l]) => <button key={k} type="button" className={`mlf-chip${k === which ? ' on' : ''}`} aria-pressed={k === which} onClick={() => setWhich(k)}>{l}</button>)}</div>
      <Stepper code={PIECES.evaluate_plan.code} frames={frames} Picture={Picture} title="Step through evaluate_plan" />
    </div>
  )
}

// Plan iteration, round by round: evaluate, improve, repeat.
export function PlanRounds({ text = sealIslands(SEVEN) }) {
  const [slip, setSlip] = useState(0)
  const maze = useMemo(() => parseMap(text), [text])
  const rounds = useMemo(() => { const out = []; planIteration(buildTable(maze, slip), G, 'right', r => out.push(r)); return out }, [maze, slip])
  const [k, setK] = useState(0)
  const at = Math.min(k, rounds.length - 1)
  const r = rounds[at]
  const changed = at > 0 ? Object.keys(r.plan).filter(s => r.plan[s] !== rounds[at - 1].plan[s]) : []
  return (
    <div className="mlf-explorer">
      <div className="mlf-controls">
        <div><span className="mlf-eyebrow">slip</span><div className="mlf-chips">{[0, 0.2].map(s => <button key={s} type="button" className={`mlf-chip${s === slip ? ' on' : ''}`} aria-pressed={s === slip} onClick={() => { setSlip(s); setK(0) }}>{s}</button>)}</div></div>
        <label className="mlf-scrub"><span>round</span><input type="range" min={0} max={rounds.length - 1} value={at} onChange={e => setK(Number(e.target.value))} aria-label="Round" /><strong>{r.round}</strong> of {rounds.length}</label>
      </div>
      <MazeView maze={maze} size={48} arrows={r.plan} heat={r.values} heatRange={[-1, 1]} labels={Object.fromEntries(Object.entries(r.values).map(([s, v]) => [s, fmt(v)]))} marks={Object.fromEntries(changed.map(s => [s, 'focus']))} />
      <p className="mlf-muted">Round {r.round}: the arrows are evaluated (the numbers), then every square switches to its best option. {at > 0 ? `${changed.length} arrow${changed.length === 1 ? '' : 's'} changed since the last round (outlined).` : 'It starts with every arrow pointing right.'} {at === rounds.length - 1 && 'Nothing changes any more: this plan is the best one.'}</p>
    </div>
  )
}

function WatchRounds() {
  return (
    <div className="mlf-watch">
      <h3>Plan iteration on the 7 × 7 maze</h3>
      <p>Start from a bad plan (every arrow right), then repeat: <em>evaluate</em> it, and <em>improve</em> every square to its best option. Drag through the rounds: good arrows spread back from the cheese, a few squares per round.</p>
      <PlanRounds />
    </div>
  )
}

export const WATCH_PLANS = [WatchEvaluate, WatchRounds]

// ---------------------------------------------------------------- Understand
const R_SEVEN = planIteration(buildTable(parseMap(sealIslands(SEVEN)), 0), G).rounds
const RIGHT_VALS = evaluatePlan(ED_TABLE, ALL_RIGHT, G)
const C = key(1, 0)
const C_ROW = optionValues(ED_TABLE, C, RIGHT_VALS, G)
const [C_BEST] = bestOption(C_ROW)

export const UNDERSTAND_PLANS = [
  { h: 'Two different questions' },
  { md: `**How good is this plan?** Follow the plan's move in every square: $V^\\pi(s) = \\sum_{s'} P(s' \\mid s, \\pi(s))\\,\\big(R + g\\,V^\\pi(s')\\big)$. There is no max: the plan has already chosen. That is \`evaluate_plan\`.

**What is the best move, given these worths?** For every square take the best option using the plan's worths: $\\pi'(s) = \\arg\\max_a Q(s, a)$. That is \`greedy_plan\`. "arg max" means *the move that gives* the maximum, not the maximum itself.` },
  { code: { piece: 'evaluate_plan', notes: [
    ['for s, action in plan.items():', 'Only squares the plan covers: the cheese has no move, so its worth stays 0.'],
    ['new = sum(p * (r + g * values[n]) for p, n, r in table[s][action])', 'The plan\'s move only. Compare `sweep_values`, which takes the best of all four.'],
    ['def evaluate_plan(table, plan, g=0.9', 'g must be below 1 here. A plan that bumps forever, or walks in circles, never reaches the cheese, and with g = 1 its worth would be infinitely negative (lesson 6).'],
  ] } },
  { code: { piece: 'greedy_plan', notes: [
    ['return {s: best_option(option_values(table, s, values, g))[0] for s in table if table[s]}', 'Lesson 4\'s two pieces, for every square that has moves. `[0]` takes the move from the `(move, worth)` pair: the arg max.'],
  ] } },
  { mathCode: [
    ['\\pi(s)', 'plan[s]', 'the plan: a move for every square'],
    ['V^\\pi(s)', 'evaluate_plan(table, plan, g)[s]', 'the worth of following the plan from s'],
    ['\\arg\\max_a Q(s, a)', 'best_option(option_values(...))[0]', 'the best move, given the worths'],
    ['\\pi\'', 'greedy_plan(table, values, g)', 'the improved plan'],
  ] },
  { choice: {
    id: 'plans-u-improve',
    teach: `Under the every-arrow-right plan on \`SMALL\` (g = ${G}), the four option values at (1, 0) are:
${ACTIONS.map(a => `- ${a}: ${r4(C_ROW[a])}`).join('\n')}

\`greedy_plan\` picks the move with the highest one.`,
    prompt: 'Which move will the improved plan give (1, 0)?',
    options: ACTIONS.map(a => ({ text: `${ARROW[a]} ${a}`, why: a === C_BEST ? `It has the highest option value, ${r4(C_ROW[a])}. The old arrow, right, walks into the wall at (1, 1) forever.` : `${a} is worth ${r4(C_ROW[a])}, less than ${C_BEST} at ${r4(C_ROW[C_BEST])}.` })),
    answer: ACTIONS.indexOf(C_BEST),
  } },
  { choice: {
    id: 'plans-u-why-converge',
    teach: 'Two facts about plan improvement. (1) The improved plan is **never worse** than the old one, in any square: each square switches only to a move at least as good. (2) The maze has only finitely many plans: 4 choices per square.',
    prompt: 'Why must repeating "evaluate, improve" eventually stop?',
    options: [
      { text: 'Because g < 1', why: 'g < 1 makes each evaluation finite, but the stopping argument is about the plans themselves.' },
      { text: 'Each round is at least as good and usually better, there are only finitely many plans, and it can\'t cycle back to a worse one. So it reaches a plan that no switch improves: a best plan.', why: `In practice it takes very few rounds: ${R_SEVEN} on the 7 × 7 maze. Each round fixes the arrows a few squares further from the cheese.` },
      { text: 'It doesn\'t always stop.', why: 'With ties handled carefully (keep the old move when it is as good as the best), it always stops.' },
    ],
    answer: 1,
  } },
  { note: 'In reinforcement learning a plan is a **policy**, $\\pi$. `evaluate_plan` is **policy evaluation** (the Bellman *expectation* equation: no max), `greedy_plan` is **policy improvement**, and alternating them is **policy iteration**. Lesson 5\'s sweeping, with its max, is **value iteration**. Both find the same best plan. Q-learning (Part 3) does both at once, without ever seeing the table.', kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const rng = makeRng(91)
const RANDOM = [randomMaze(rng, 5, 6), randomMaze(rng, 4, 6)].map(sealIslands)
const lit = obj => `{${Object.entries(obj).map(([s, v]) => `${pyCellLit(s)}: ${typeof v === 'string' ? `"${v}"` : v}`).join(', ')}}`
const greedyCase = (text, name, slip, why) => {
  const table = buildTable(parseMap(text), slip)
  const values = Object.fromEntries(Object.entries(sweepValues(table, G)[0]).map(([s, v]) => [s, r4(v)]))
  return { call: `greedy_plan(build_table(parse_map(${name ?? pyText(text)}), ${slip}), ${lit(values)}, ${G})`, expected: norm(greedyPlanOf(table, values, G)), why }
}
const evalCase = (text, name, slip, plan, why) => {
  const table = buildTable(parseMap(text), slip)
  const p = plan ?? greedyPlanOf(table, sweepValues(table, G)[0], G)
  return { call: `evaluate_plan(build_table(parse_map(${name ?? pyText(text)}), ${slip}), ${lit(p)}, ${G})`, expected: norm(evaluatePlan(table, p, G)), why }
}
const allOf = (text, a) => Object.fromEntries(Object.keys(buildTable(parseMap(text), 0)).filter(s => s !== parseMap(text).goal).map(s => [s, a]))

export const CHALLENGES_PLANS = [
  {
    id: 'plans-greedy', piece: 'greedy_plan', title: 'Write greedy_plan', kind: 'write', uses: ['parse_map', 'legal_moves', 'move_chances', 'build_table', 'expected_value', 'option_values', 'best_option'],
    prompt: '`greedy_plan(table, values, g=1.0)` returns a plan: a dict `{square: best move}` for every square that has moves, each move chosen by `best_option(option_values(table, square, values, g))`.',
    starter: `def greedy_plan(table, values, g=1.0):
    plan = {}
    # for every square with moves: its best move given these worths
    return plan
`,
    solution: PIECES.greedy_plan.code,
    runCalls: ['greedy_plan(build_table(parse_map(TINY)), {(0, 0): 0.88, (0, 1): 0.92, (1, 1): 0.96, (1, 2): 1.0, (2, 2): 0.0})'],
    cases: [
      { call: 'greedy_plan(build_table(parse_map(TINY)), {(0, 0): 0.88, (0, 1): 0.92, (1, 1): 0.96, (1, 2): 1.0, (2, 2): 0.0})', expected: norm(greedyPlanOf(buildTable(parseMap('S.#\n#..\n##G'), 0), { '0,0': 0.88, '0,1': 0.92, '1,1': 0.96, '1,2': 1, '2,2': 0 }, 1)) },
      greedyCase(SMALL, 'SMALL', 0), greedyCase('.#..\n.S..\n...G', 'ICY', 0.2, 'with slips'), ...RANDOM.map(t => greedyCase(t, null, 0.1, 'a random map')),
    ],
    hints: ['`for s in table:` and skip squares with no moves (`if table[s]`).', '`plan[s] = best_option(option_values(table, s, values, g))[0]`. (Or one dict comprehension.)'],
  },
  {
    id: 'plans-evaluate', piece: 'evaluate_plan', title: 'Write evaluate_plan', kind: 'write', uses: ['parse_map', 'legal_moves', 'move_chances', 'build_table'],
    prompt: '`evaluate_plan(table, plan, g=0.9, tol=1e-9, max_sweeps=10000)` starts every worth at 0 and sweeps, in place: every square in `plan` gets the average of `p * (r + g * values[n])` over the outcomes of **its plan\'s move**. Stop after the first sweep whose biggest change is below `tol`. Return the worths.',
    starter: `def evaluate_plan(table, plan, g=0.9, tol=1e-9, max_sweeps=10000):
    values = {s: 0.0 for s in table}
    for sweep in range(max_sweeps):
        biggest = 0.0
        # every square in the plan: the average outcome of its plan's move
        if biggest < tol:
            break
    return values
`,
    solution: PIECES.evaluate_plan.code,
    runCalls: ['evaluate_plan(build_table(parse_map(TINY)), {(0, 0): "right", (0, 1): "down", (1, 1): "right", (1, 2): "down"})', 'evaluate_plan(build_table(parse_map(TINY)), {(0, 0): "up", (0, 1): "down", (1, 1): "right", (1, 2): "down"})[(0, 0)]'],
    cases: [evalCase(TINY, 'TINY', 0), evalCase(SMALL, 'SMALL', 0, allOf(SMALL, 'right'), 'a bad plan'), evalCase(SMALL, 'SMALL', 0.2), evalCase('.#..\n.S..\n...G', 'ICY', 0.2, allOf('.#..\n.S..\n...G', 'down'), 'everything down'), ...RANDOM.map(t => evalCase(t, null, 0.1, undefined, 'a random map'))],
    hints: ['`for s, action in plan.items():`', '`new = sum(p * (r + g * values[n]) for p, n, r in table[s][action])`, track `biggest`, then `values[s] = new`.'],
  },
  {
    id: 'plans-fix-max', piece: null, title: 'Bug hunt: the plan that was ignored', kind: 'fix', uses: ['parse_map', 'legal_moves', 'move_chances', 'build_table'],
    prompt: 'This `evaluate_plan` says a terrible plan (every arrow pointing up, into the edge) is worth exactly as much as the best plan. Run both presets. Which line ignores the plan?',
    starter: `def evaluate_plan(table, plan, g=0.9, tol=1e-9, max_sweeps=10000):
    values = {s: 0.0 for s in table}
    for sweep in range(max_sweeps):
        biggest = 0.0
        for s, action in plan.items():
            new = max(sum(p * (r + g * values[n]) for p, n, r in outcomes) for outcomes in table[s].values())
            biggest = max(biggest, abs(new - values[s]))
            values[s] = new
        if biggest < tol:
            break
    return values
`,
    solution: PIECES.evaluate_plan.code,
    compare: 'Taking the `max` over all four moves turns policy evaluation into value iteration: it computes the worth of the **best** plan, whatever plan you pass in. `action` is unpacked and then never used, which is the clue. Evaluating a plan means using only `table[s][action]`.',
    runCalls: [`evaluate_plan(build_table(parse_map(SMALL)), ${lit(allOf(SMALL, 'up'))})[(0, 0)]`, `evaluate_plan(build_table(parse_map(SMALL)), ${lit(greedyPlanOf(buildTable(parseMap(SMALL), 0), sweepValues(buildTable(parseMap(SMALL), 0), G)[0], G))})[(0, 0)]`],
    cases: [evalCase(SMALL, 'SMALL', 0, allOf(SMALL, 'up')), evalCase(TINY, 'TINY', 0, allOf(TINY, 'left')), evalCase('.#..\n.S..\n...G', 'ICY', 0.2, allOf('.#..\n.S..\n...G', 'right'))],
    hints: ['Is the variable `action` used anywhere after the `for` line?', 'The worth of following the plan uses only the outcomes of `table[s][action]`.'],
  },
]

export const KEEP_PLANS = {
  pieces: ['greedy_plan', 'evaluate_plan'],
  card: `**greedy_plan(table, values, g)** → \`{square: best move}\`: the arg max of the option values, square by square.

**evaluate_plan(table, plan, g)** → the worth of following \`plan\` from every square: sweeping with the plan's move, no max.`,
  remember: [
    'A plan is a move for every square. Any plan can be evaluated: sweep with its moves, no max.',
    'Improving a plan: give every square its best option, using the current plan\'s worths. It is never worse.',
    'Evaluate, improve, repeat: it stops at a best plan, usually in very few rounds.',
    'One bad arrow (bumping forever) is worth c / (1 − g), and drags down every square that leads into it.',
  ],
  ml: [['a plan', 'policy, $\\pi$', 'what to do in each state'], ['evaluate_plan', 'policy evaluation', 'Bellman expectation equation'], ['greedy_plan', 'policy improvement', 'arg max of Q'], ['evaluate, improve, repeat', 'policy iteration', 'one of the two classic planning algorithms']],
  next: 'Next, the assembly: wire your pieces into a complete planner that takes any map you draw and returns the best plan.',
}

export { Teach, ARROW, unkey }
