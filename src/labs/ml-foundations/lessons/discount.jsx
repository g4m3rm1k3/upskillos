import React, { useMemo, useState } from 'react'
import MazeView from '../MazeView.jsx'
import Stepper from '../Stepper.jsx'
import { traceDiscountedTotal } from '../traces-part2.js'
import { PIECES } from '../python/pieces.js'
import { SEVEN, SMALL, parseMap, buildTable, sweepValues, greedyPlanOf, discountedTotal, horizon, stepsToGoal } from '../world.js'
import { norm } from '../runtime/checks.js'

const r4 = x => Number(x.toFixed(4))
const SEVEN_MAZE = parseMap(SEVEN)
const SEVEN_TABLE = buildTable(SEVEN_MAZE, 0)
const ISLAND = '6,0'
export const ISLAND_AT = n => sweepValues(SEVEN_TABLE, 1, 1e-9, n)[0][ISLAND]
const I10 = r4(ISLAND_AT(10)), I20 = r4(ISLAND_AT(20)), I100 = r4(ISLAND_AT(100))
const ROUTE = [-0.04, -0.04, 1]
const FOREVER = r4(-0.04 / (1 - 0.9))
const FLIP = r4(0.5 ** (1 / 3))

// ---------------------------------------------------------------- pictures
export function DiscountBars({ rewards, g, upto = rewards.length - 1 }) {
  const W = Math.max(260, rewards.length * 56), H = 150, mid = 80
  const max = Math.max(...rewards.map(Math.abs), 0.1)
  const bar = v => (Math.abs(v) / max) * 60
  return (
    <svg className="mlf-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Each reward, and what it counts for after discounting">
      <line x1={0} x2={W} y1={mid} y2={mid} stroke="#4e6670" />
      {rewards.map((r, t) => {
        const x = 20 + t * 52, w = g ** t, on = t <= upto
        return (
          <g key={t} opacity={on ? 1 : 0.35}>
            <rect x={x} y={r >= 0 ? mid - bar(r) : mid} width={18} height={bar(r)} fill="#35505e" />
            <rect x={x + 20} y={r >= 0 ? mid - bar(r * w) : mid} width={18} height={bar(r * w)} fill={on ? '#34d399' : '#35505e'} />
            <text x={x + 19} y={H - 22} textAnchor="middle" className="mlf-chart-label">t={t}</text>
            <text x={x + 19} y={H - 8} textAnchor="middle" className="mlf-chart-label">×{r4(w)}</text>
          </g>
        )
      })}
      <text x={W - 4} y={12} textAnchor="end" className="mlf-chart-label">grey: the reward · green: what it counts for</text>
    </svg>
  )
}

const BarsPicture = ({ frame }) => <DiscountBars rewards={frame.pic.rewards} g={frame.pic.g} upto={frame.pic.upto} />

// The 7 × 7 maze, worth by sweeping with any g, walled-off squares included.
export function GMaze() {
  const [g, setG] = useState(0.9)
  const [vals, sweeps] = useMemo(() => sweepValues(SEVEN_TABLE, g, 1e-9, 3000), [g])
  const plan = useMemo(() => greedyPlanOf(SEVEN_TABLE, vals, g), [vals, g])
  const settled = sweeps < 3000
  return (
    <div className="mlf-explorer">
      <label className="mlf-knob"><span><code>g</code> = <strong>{g}</strong></span><input type="range" min={0} max={1} step={0.01} value={g} onChange={e => setG(Number(e.target.value))} aria-label="g" /><small>how much a reward one move later counts, compared with one now</small></label>
      <MazeView maze={SEVEN_MAZE} size={50} heat={vals} heatRange={[-1, 1]} labels={Object.fromEntries(Object.entries(vals).map(([s, v]) => [s, Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2)]))} arrows={plan} title="Worth of every square for this g" />
      <p className="mlf-total">{settled ? <>settled after <strong>{sweeps}</strong> sweeps</> : <strong className="mlf-bad-text">still not settled after 3000 sweeps</strong>} · start worth <strong>{r4(vals[SEVEN_MAZE.start])}</strong> · the three walled-off squares bottom left: <strong>{r4(vals[ISLAND])}</strong>{g < 1 && <> · −0.04 / (1 − g) = <strong>{r4(-0.04 / (1 - g))}</strong></>} · horizon (weight below 0.01): <strong>{g > 0 && g < 1 ? horizon(g) : g === 0 ? 1 : '∞'}</strong> moves</p>
      <p className="mlf-muted">Try g = 1 (never settles), 0.99 (settles, slowly), 0.9, and 0.5 (the start barely sees the cheese: look at the arrows far from it).</p>
    </div>
  )
}

// A crumb (0.5) one move away, or the cheese (1) four moves away: which is worth more, for each g?
export function FlipChart() {
  const [g, setG] = useState(0.9)
  const W = 360, H = 150, x = v => 30 + v * (W - 50), y = v => 10 + (1 - v) * (H - 40)
  const pts = n => Array.from({ length: 51 }, (_, i) => i / 50).map(v => `${x(v)},${y(n(v))}`).join(' ')
  const crumb = 0.5, cheese = r4(g ** 3)
  return (
    <div className="mlf-explorer">
      <label className="mlf-knob"><span><code>g</code> = <strong>{g}</strong></span><input type="range" min={0} max={1} step={0.01} value={g} onChange={e => setG(Number(e.target.value))} aria-label="g for the two routes" /><small>route A: a crumb worth 0.5 on the first move · route B: the cheese worth 1 on the fourth move</small></label>
      <svg className="mlf-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Worth of each route as g changes">
        <polyline points={pts(() => 0.5)} fill="none" stroke="#fbbf24" strokeWidth="2" />
        <polyline points={pts(v => v ** 3)} fill="none" stroke="#34d399" strokeWidth="2" />
        <line x1={x(g)} x2={x(g)} y1={5} y2={H - 30} stroke="#7dd3fc" strokeDasharray="3 3" />
        <line x1={x(FLIP)} x2={x(FLIP)} y1={y(0.5) - 6} y2={y(0.5) + 6} stroke="#fff" />
        <text x={x(0)} y={H - 14} className="mlf-chart-label">g = 0</text><text x={x(1)} y={H - 14} textAnchor="end" className="mlf-chart-label">g = 1</text>
        <text x={x(0.02)} y={y(0.5) - 6} className="mlf-chart-label">A: 0.5</text><text x={x(0.98)} y={y(1) + 12} textAnchor="end" className="mlf-chart-label">B: g³</text>
      </svg>
      <p className="mlf-total">A = <strong>{crumb}</strong> · B = 1 × g³ = <strong>{cheese}</strong> → {cheese > crumb ? 'B, the cheese, is worth more' : cheese < crumb ? 'A, the crumb, is worth more' : 'they are worth the same'} · they swap at g = 0.5^(1/3) ≈ {FLIP}</p>
    </div>
  )
}

// ---------------------------------------------------------------- Try it first
export const TRY_DISCOUNT = {
  lead: 'Lesson 5 ended with a puzzle. On `SEVEN`, the three squares in the bottom-left corner are walled off from the cheese. With g = 1, sweeping never settles. This lesson finds out why, and what g is for.',
  steps: [
    { predict: {
      id: 'discount-try-island',
      teach: `Those three squares can never reach the cheese. Their best move is always a step to one of the other two, which costs −0.04, so each sweep pushes their worth down again. The computer's numbers for the corner square (6, 0): after 10 sweeps **${I10}**, after 20 sweeps **${I20}**. It drops by about the same amount every sweep.`,
      prompt: 'About what is its worth after **100** sweeps?',
      answer: I100, tolerance: 0.5,
      explain: `${I100}. It falls by about ${r4((I10 - I20) / 10)} per sweep (two squares take turns pushing each other down) and never stops: after 1000 sweeps it is ${r4(ISLAND_AT(1000))}. The sweep stops only when nothing changes, and these squares change every time, so with g = 1 it never stops.`,
    } },
    { choice: {
      id: 'discount-try-infinite',
      teach: 'A square that can never reach the cheese pays −0.04 on every move, forever. Its worth is the **total** of everything still to come.',
      prompt: 'With g = 1, what is the true worth of such a square?',
      options: [
        { text: '−0.04', why: 'That is only the next move. It keeps paying −0.04 on every move after that, forever.' },
        { text: 'There is no finite answer: −0.04 + (−0.04) + ... forever keeps getting more negative, without end.', why: 'An infinite sum of the same negative amount has no finite total. Sweeping is chasing a number that doesn\'t exist.' },
        { text: '0, because it never reaches the cheese', why: 'Never reaching the cheese means never being paid +1. It still pays for every move it makes.' },
      ],
      answer: 1,
    } },
    { predict: {
      id: 'discount-try-total',
      teach: '**Discounting.** A reward t moves in the future counts for $g^t$ of its value, with g a number just below 1. Worked example with g = 0.5 and rewards [1, 1, 1]: 1 × 1 + 1 × 0.5 + 1 × 0.25 = **1.75**. The first reward (t = 0) counts in full.',
      prompt: 'With g = 0.9, what is the discounted total of the rewards [−0.04, −0.04, 1]?',
      answer: r4(discountedTotal(ROUTE, 0.9)), tolerance: 6e-4,
      misconceptions: [{ answer: 0.92, tolerance: 1e-6, feedback: 'That is the plain total. Each reward is first multiplied by g to the power of its position: 1, 0.9, 0.81.' }],
      explain: `−0.04 × 1 + (−0.04) × 0.9 + 1 × 0.81 = −0.04 − 0.036 + 0.81 = ${r4(discountedTotal(ROUTE, 0.9))}. The cheese, two moves away, counts for 0.81.`,
    } },
    { predict: {
      id: 'discount-try-forever',
      teach: '**A sum that goes on forever can have a finite total.** Worked example with g = 0.5: 1 + 0.5 + 0.25 + 0.125 + ... = 2. The general rule, for any g below 1: $1 + g + g^2 + \\dots = \\dfrac{1}{1 - g}$. A constant payment c on every move, forever, is worth $\\dfrac{c}{1 - g}$.',
      prompt: 'With g = 0.9, a square that pays −0.04 on every move, forever. What is it worth?',
      answer: FOREVER, tolerance: 1e-6,
      misconceptions: [{ answer: -0.04, tolerance: 1e-6, feedback: 'That counts only the first move. The other moves still count, just less: 1 + 0.9 + 0.81 + ... = 10 moves\' worth in all.' }],
      explain: `−0.04 / (1 − 0.9) = −0.04 / 0.1 = ${FOREVER}. That is a real, finite number, and it is exactly where the walled-off squares settle when you sweep with g = 0.9.`,
    } },
    { choice: {
      id: 'discount-try-flip',
      teach: `Discounting also changes **what is best**. Ignore step costs here. Route A gives a crumb worth 0.5 on the very first move (t = 0, so it counts in full). Route B gives the cheese, worth 1, on the fourth move (t = 3, so it counts $g^3$). With g = 0.9: $0.9^3$ = 0.729.`,
      prompt: 'With g = 0.9, which route is worth more?',
      options: [
        { text: 'A, the crumb now', why: 'A is worth 0.5 and B is worth 0.729, so B is worth more. But lower g and the answer flips (see Watch it run).' },
        { text: 'B, the cheese later', why: `1 × 0.9³ = 0.729 > 0.5. With a smaller g, say 0.5, B is worth 1 × 0.125 = 0.125 and the crumb wins. The two are equal at g = 0.5^(1/3) ≈ ${FLIP}.` },
      ],
      answer: 1,
    } },
  ],
}

// ---------------------------------------------------------------- Watch it run
function WatchTotal() {
  const [g, setG] = useState(0.9)
  const [which, setWhich] = useState('route')
  const lists = { route: [-0.04, -0.04, -0.04, -0.04, 1], bump: [-0.75, -0.04, -0.04, 1], forever: Array(8).fill(-0.04) }
  const { frames } = useMemo(() => traceDiscountedTotal(lists[which], g), [which, g]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="mlf-watch">
      <h3>discounted_total: each reward times g to the power of its position</h3>
      <div className="mlf-controls">
        <div><span className="mlf-eyebrow">rewards</span><div className="mlf-chips">{[['route', 'the shortest route on SMALL'], ['bump', 'a bump first'], ['forever', '−0.04, eight times']].map(([k, l]) => <button key={k} type="button" className={`mlf-chip${k === which ? ' on' : ''}`} aria-pressed={k === which} onClick={() => setWhich(k)}>{l}</button>)}</div></div>
        <div><span className="mlf-eyebrow">g</span><div className="mlf-chips">{[1, 0.9, 0.5].map(v => <button key={v} type="button" className={`mlf-chip${v === g ? ' on' : ''}`} aria-pressed={v === g} onClick={() => setG(v)}>{v}</button>)}</div></div>
      </div>
      <Stepper code={PIECES.discounted_total.code} frames={frames} Picture={BarsPicture} title="Step through discounted_total" />
    </div>
  )
}

function WatchMaze() {
  return (
    <div className="mlf-watch">
      <h3>g on the 7 × 7 maze</h3>
      <p>Worth by sweeping (lesson 5) on all of <code>SEVEN</code>, walled-off squares included, for any g. Watch three things as you move the slider: whether it settles, the worth of the walled-off squares, and how far from the cheese the arrows still point the right way.</p>
      <GMaze />
    </div>
  )
}

function WatchFlip() {
  return (
    <div className="mlf-watch">
      <h3>Crumb now, or cheese later?</h3>
      <p>The best choice depends on g. Slide it and watch the two worths cross.</p>
      <FlipChart />
    </div>
  )
}

export const WATCH_DISCOUNT = [WatchTotal, WatchMaze, WatchFlip]

// ---------------------------------------------------------------- Understand
const H5 = horizon(0.5)
const SMALL_DIST = stepsToGoal(parseMap(SMALL))['0,0']
const SMALL_ROUTE = [...Array(SMALL_DIST - 1).fill(-0.04), 1]
const SMALL_G9 = r4(discountedTotal(SMALL_ROUTE, 0.9))

export const UNDERSTAND_DISCOUNT = [
  { h: 'Why discount at all' },
  { md: `Three reasons, from the most technical to the most human:

1. **Totals that go on forever need to be finite.** A game that might never end (a mouse that can't reach the cheese, a robot that runs forever) has an infinite undiscounted total. With $g < 1$ the weights $1, g, g^2, \\dots$ shrink fast enough that the total is finite, and sweeping settles.
2. **Sooner is better.** A reward now is worth more than the same reward later, because later is less certain. The world might change, the game might end early, the plan might fail.
3. **It sets a horizon.** Weights below about 1% barely matter, so g decides how far ahead the mouse effectively looks.` },
  { h: 'The maths: a geometric series' },
  { md: `Call the sum $S = 1 + g + g^2 + g^3 + \\dots$ Multiply it by $g$: $gS = g + g^2 + g^3 + \\dots$, which is everything in $S$ except the first 1. So

$$S = 1 + gS \\quad\\Longrightarrow\\quad S(1 - g) = 1 \\quad\\Longrightarrow\\quad S = \\frac{1}{1 - g}$$

This only works when $g < 1$. With $g = 1$, $S = 1 + S$ has no solution, which is the never-settling sweep again. A payment $c$ on every move is worth $c \\cdot S = \\dfrac{c}{1 - g}$: with $g = 0.9$ that is $10c$, as if the future lasted about 10 moves.` },
  { code: { piece: 'discounted_total', notes: [
    ['for t, r in enumerate(rewards):', '`enumerate` hands over the position `t` (0 for the first reward) with each reward `r`.'],
    ['total += g ** t * r', '`g ** t` is g to the power t. Python applies `**` before `*`, so this is `(g ** t) * r`. The first reward has `t = 0` and `g ** 0 = 1`: counted in full.'],
  ] } },
  { code: { piece: 'horizon', notes: [
    ['while g ** t >= weight:', 'Count how many moves pass before a reward\'s weight drops below `weight` (1% by default). After that, rewards barely change the total.'],
  ] } },
  { mathCode: [
    ['G = \\sum_t g^t r_t', 'discounted_total(rewards, g)', 'the discounted return of one game'],
    ['g^t', 'g ** t', 'what a reward t moves away counts for'],
    ['\\frac{1}{1-g}', '1 / (1 - g)', 'the total weight of all moves: the "effective length" of the future'],
    ['\\min\\{t : g^t < 0.01\\}', 'horizon(g)', 'how many moves until rewards stop mattering'],
  ] },
  { predict: {
    id: 'discount-u-horizon',
    teach: 'With g = 0.5, the weights are 1, 0.5, 0.25, 0.125, 0.0625, 0.03125, 0.015625, 0.0078125, ... `horizon(0.5)` counts up t = 0, 1, 2, ... while `g ** t >= 0.01`, and returns the first t where the weight is below 0.01.',
    prompt: 'What is `horizon(0.5)`?',
    answer: H5,
    misconceptions: [{ answer: H5 - 1, feedback: `0.5 ** ${H5 - 1} = ${0.5 ** (H5 - 1)} is still above 0.01, so the loop keeps going one more time.` }],
    explain: `0.5 ** 6 = 0.015625 is still at least 0.01, and 0.5 ** 7 = 0.0078125 is not, so the answer is ${H5}. With g = 0.9 it is ${horizon(0.9)}, and with g = 0.99 it is ${horizon(0.99)}.`,
  } },
  { predict: {
    id: 'discount-u-small',
    teach: `The shortest route on \`SMALL\` is ${SMALL_DIST} moves: ${SMALL_DIST - 1} ordinary moves paying −0.04, then +1 for the cheese, so the rewards are [${SMALL_ROUTE.join(', ')}]. Weights with g = 0.9: 1, 0.9, 0.81, 0.729, 0.6561.`,
    prompt: 'What is `discounted_total` of that route with g = 0.9?',
    answer: SMALL_G9, tolerance: 6e-4,
    misconceptions: [{ answer: 0.84, tolerance: 1e-6, feedback: 'That is the undiscounted total. With g = 0.9 the cheese, four moves later, counts for only 0.6561.' }],
    explain: `${SMALL_ROUTE.map((r, t) => `${r} × ${r4(0.9 ** t)}`).join(' + ')} = ${SMALL_G9}. Discounting shrinks the far-away cheese more than the nearby step costs.`,
  } },
  { choice: {
    id: 'discount-u-g0',
    teach: 'With g = 0, every weight after the first is $0^t = 0$: only the reward of the very next move counts. Lesson 0\'s experiment 1 set g = 0 on the learner.',
    prompt: 'With g = 0, what does `sweep_values` make each square worth?',
    options: [
      { text: 'Its distance from the cheese', why: 'Distance only matters through rewards that come later, and with g = 0 later rewards count for nothing.' },
      { text: 'Just the best payment of its next move: 1 next to the cheese, −0.04 almost everywhere else.', why: 'So far from the cheese all non-bumping moves look the same, and the plan has no idea which way to go. That is why lesson 0\'s learner never found a route with g = 0.' },
      { text: '0 everywhere', why: 'The next move\'s payment still counts in full ($0^0 = 1$).' },
    ],
    answer: 1,
  } },
  { note: 'The discounted total $G = \\sum_t \\gamma^t r_t$ is the **return**. $g$ is usually written $\\gamma$ (gamma) and called the **discount factor**. Typical values are 0.9 to 0.99. With $\\gamma < 1$, each sweep of the Bellman equation shrinks every error by at least a factor $\\gamma$ (it is a **contraction**), which is the mathematical reason value iteration always settles.', kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const totalCase = (rs, g, why) => ({ call: `discounted_total([${rs.join(', ')}], ${g})`, expected: norm(discountedTotal(rs, g)), why })
const horizonCase = (g, w) => ({ call: w === undefined ? `horizon(${g})` : `horizon(${g}, ${w})`, expected: w === undefined ? horizon(g) : horizon(g, w) })

export const CHALLENGES_DISCOUNT = [
  {
    id: 'discount-total', piece: 'discounted_total', title: 'Write discounted_total', kind: 'write', uses: [],
    prompt: '`discounted_total(rewards, g)` returns $r_0 + g\\,r_1 + g^2 r_2 + \\dots$: each reward times g to the power of its position (counting from 0), added up.',
    starter: `def discounted_total(rewards, g):
    total = 0.0
    # each reward, times g to the power of its position
    return total
`,
    solution: PIECES.discounted_total.code,
    runCalls: ['discounted_total([-0.04, -0.04, 1], 0.9)', 'discounted_total([1, 1, 1], 0.5)'],
    cases: [totalCase(ROUTE, 0.9), totalCase([1, 1, 1], 0.5), totalCase(SMALL_ROUTE, 0.9, 'the route on SMALL'), totalCase([-0.75, -0.04, 1], 1, 'g = 1: no discount'), totalCase(Array(30).fill(-0.04), 0.9, 'a long run'), totalCase([5], 0.3, 'one reward'), totalCase([], 0.9, 'no rewards')],
    hints: ['`for t, r in enumerate(rewards):` gives each position and reward.', '`total += g ** t * r`.'],
  },
  {
    id: 'discount-horizon', piece: 'horizon', title: 'Write horizon', kind: 'write', uses: [],
    prompt: '`horizon(g, weight=0.01)` returns the first whole number t with `g ** t < weight`: how many moves until a reward counts for less than `weight` of its value.',
    starter: `def horizon(g, weight=0.01):
    t = 0
    # count up while g ** t is still at least weight
    return t
`,
    solution: PIECES.horizon.code,
    runCalls: ['horizon(0.5)', 'horizon(0.9)', '[0.5 ** t for t in range(8)]'],
    cases: [horizonCase(0.5), horizonCase(0.9), horizonCase(0.99), horizonCase(0.9, 0.5), horizonCase(0, undefined), horizonCase(0.8, 0.001)],
    hints: ['`while g ** t >= weight: t += 1`.', 'With g = 0: `0 ** 0` is 1 (at least 0.01), and `0 ** 1` is 0, so the answer is 1.'],
  },
  {
    id: 'discount-fix-offby1', piece: null, title: 'Bug hunt: the first reward that was discounted', kind: 'fix', uses: [],
    prompt: 'This `discounted_total` gives 0.9 for `discounted_total([1], 0.9)`. A single reward, received right now, should count in full. Find the off-by-one.',
    starter: `def discounted_total(rewards, g):
    total = 0.0
    for t, r in enumerate(rewards):
        total += g ** (t + 1) * r
    return total
`,
    solution: PIECES.discounted_total.code,
    compare: '`enumerate` already counts from 0, so the first reward has `t = 0` and weight `g ** 0 = 1`. Adding 1 to the exponent discounts every reward one move too many, so the whole total shrinks by a factor of g. The plan it leads to might not even change (every option is shrunk the same way), which is exactly why this bug can hide for a long time.',
    runCalls: ['discounted_total([1], 0.9)', 'discounted_total([-0.04, -0.04, 1], 0.9)'],
    cases: [totalCase([1], 0.9), totalCase(ROUTE, 0.9), totalCase([1, 1, 1], 0.5), totalCase([2, -1], 1)],
    hints: ['What weight should the very first reward get?', 'What is the first value of `t` that `enumerate` gives?'],
  },
]

export const KEEP_DISCOUNT = {
  pieces: ['discounted_total', 'horizon'],
  card: `**discounted_total(rewards, g)** → $\\sum_t g^t r_t$: rewards later in the game count for less.

**horizon(g, weight)** → the first t with $g^t$ < \`weight\`: how far ahead g effectively looks.`,
  remember: [
    'With g = 1, a game that can go on forever can have an infinite total, and sweeping never settles.',
    `$1 + g + g^2 + \\dots = 1/(1-g)$ when g < 1: a cost c on every move forever is worth c/(1−g) (with g = 0.9, −0.04 → ${FOREVER}).`,
    `g changes what is best: a small reward soon can beat a big one later (the crumb wins below g ≈ ${FLIP}).`,
    'Too small a g makes the mouse short-sighted: far from the cheese, every move looks the same.',
  ],
  ml: [['g', 'discount factor, $\\gamma$', 'how much the future counts'], ['the discounted total', 'return, $G_t$', 'what one game is worth'], ['each sweep shrinking errors by g', 'contraction', 'why value iteration settles']],
  next: 'Lesson 7: the arrows on the maps are a plan. How good is a plan, and how do you make a better one?',
}
