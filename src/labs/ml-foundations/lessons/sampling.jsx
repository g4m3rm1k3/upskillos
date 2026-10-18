import React, { useMemo, useState } from 'react'
import MazeView from '../MazeView.jsx'
import Stepper from '../Stepper.jsx'
import { ValuePicture } from '../pictures.jsx'
import { traceEstimateOutcomes } from '../traces-part3.js'
import { PIECES } from '../python/pieces.js'
import { ACTIONS, ARROW, key, parseMap, buildTable, makeRng, dice } from '../world.js'
import { estimate, estimateOutcomes, blackBox } from '../world-part3.js'
import { pyCellLit } from './cases.js'
import { norm } from '../runtime/checks.js'

const r4 = x => Number(x.toFixed(4))
const ICY_TEXT = '.#..\n.S..\n...G'
const ICY = parseMap(ICY_TEXT)
const ICY_T = buildTable(ICY, 0.2)
const SIGMA = Math.sqrt(0.25 * 9 + 0.75 * 1)
const spin = rng => (rng.random() < 0.25 ? 3 : -1)
const spread = xs => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) }

// ---------------------------------------------------------------- a toy: many estimates, and their spread
export function EstimateSpread({ draw = spin, truth = 0, sigma = SIGMA, label = 'spins' }) {
  const [rng] = useState(() => makeRng(17))
  const [n, setN] = useState(10)
  const [ests, setEsts] = useState([])
  const run = () => setEsts(Array.from({ length: 30 }, () => estimate(draw, n, rng)))
  const W = 360, H = 70, lo = truth - 2.5, hi = truth + 2.5, x = v => 10 + ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (W - 20)
  return (
    <div className="mlf-toy">
      <div className="mlf-controls">
        <div><span className="mlf-eyebrow">{label} per estimate</span><div className="mlf-chips">{[10, 100, 1000].map(v => <button key={v} type="button" className={`mlf-chip${v === n ? ' on' : ''}`} aria-pressed={v === n} onClick={() => { setN(v); setEsts([]) }}>{v}</button>)}</div></div>
        <button type="button" className="mlf-primary" onClick={run}>Make 30 estimates</button>
      </div>
      <svg className="mlf-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`30 estimates, each from ${n} ${label}`}>
        <line x1={x(truth)} x2={x(truth)} y1={4} y2={H - 16} stroke="#fbbf24" strokeDasharray="3 3" />
        {ests.map((e, i) => <circle key={i} cx={x(e)} cy={18 + (i % 6) * 7} r={3.5} fill="#34d399" opacity={0.85} />)}
        <text x={x(lo)} y={H - 3} className="mlf-chart-label">{lo}</text><text x={x(truth)} y={H - 3} textAnchor="middle" className="mlf-chart-label">truth {truth}</text><text x={x(hi)} y={H - 3} textAnchor="end" className="mlf-chart-label">{hi}</text>
      </svg>
      {ests.length > 0 && <p className="mlf-total">30 estimates from {n} {label} each: they spread by about <strong>{r4(spread(ests))}</strong> (the rule σ/√n says <strong>{r4(sigma / Math.sqrt(n))}</strong>)</p>}
    </div>
  )
}

// ---------------------------------------------------------------- Try it first
export const TRY_SAMPLING = {
  lead: 'Everything in Part 2 needed the table: the exact chances of every outcome. A real mouse has no table. It can only **try** things and see what happens. Part 3 learns the same worths from trying alone. It starts with the simplest version: estimating an average you can only sample.',
  steps: [
    { predict: {
      id: 'sampling-try-four',
      teach: 'When you can\'t see the chances, the best you can do is try it several times and take the **plain average** of what you got: add up the results and divide by how many there were.',
      prompt: 'A spinner with hidden chances. You spin it 4 times and get **3, −1, −1, −1**. What is your estimate of its average pay-out?',
      answer: 0, tolerance: 1e-9,
      misconceptions: [{ answer: 1, feedback: '1 is the average of the two different values, 3 and −1. But −1 came up three times out of four, so it counts three times.' }],
      explain: '(3 − 1 − 1 − 1) / 4 = 0 / 4 = 0. It happens to equal the true average of this spinner (0, from lesson 4), but with only 4 spins that is luck.',
    } },
    { md: 'One estimate is one number. Make many estimates and see how much they disagree. The dashed line is the truth, which the estimates can\'t see.' },
    { figure: EstimateSpread },
    { choice: {
      id: 'sampling-try-more',
      teach: 'Each spin is random. In a short run, lucky and unlucky spins can easily fail to balance out. In a long run they mostly cancel.',
      prompt: 'Estimates from 10 spins each spread out a lot. What happens with 1000 spins each?',
      options: [
        { text: 'They spread just as much.', why: 'Try it above: with 1000 spins the dots bunch tightly around the truth.' },
        { text: 'They bunch much closer to the truth, but still not exactly on it.', why: 'More samples, less wobble, though never zero. The next question says exactly how much less.' },
        { text: 'Every estimate equals the truth exactly.', why: 'Only with infinitely many spins. Any finite run has some wobble.' },
      ],
      answer: 1,
    } },
    { predict: {
      id: 'sampling-try-sqrt',
      teach: '**The square-root rule.** The typical error of an average of n random samples shrinks like $1/\\sqrt{n}$. So 100 times more samples gives $\\sqrt{100} = 10$ times less wobble, and 4 times more gives 2 times less.',
      prompt: `With 10 spins, estimates typically miss by about ${r4(SIGMA / Math.sqrt(10))}. About how much with **1000** spins?`,
      answer: r4(SIGMA / Math.sqrt(1000)), tolerance: 0.02,
      misconceptions: [{ answer: r4(SIGMA / Math.sqrt(10) / 100), tolerance: 0.003, feedback: '100 times more samples does not make it 100 times better: only √100 = 10 times better.' }],
      explain: `${r4(SIGMA / Math.sqrt(10))} / √100 = ${r4(SIGMA / Math.sqrt(10))} / 10 ≈ ${r4(SIGMA / Math.sqrt(1000))}. Accuracy is expensive: each extra decimal place needs 100 times more samples.`,
    } },
    { choice: {
      id: 'sampling-try-table',
      teach: 'An entry of the table is a list of (chance, where you end up, payment), one per outcome of a move. Chances are long-run shares: how often each outcome happens.',
      prompt: 'The mouse can\'t see the table. How can it find the chances of pressing **up** at (1, 1)?',
      options: [
        { text: 'It can\'t: chances are hidden.', why: 'They are hidden, but they show up in what happens: frequent results come up often.' },
        { text: 'Press up at (1, 1) many times, count how often it ends up in each place, and divide each count by the number of tries.', why: 'Each count ÷ tries estimates a chance, with the same square-root wobble. That is `estimate_outcomes`.' },
        { text: 'Read the map: up from (1, 1) is a wall, so it stays put every time.', why: 'Mostly, but on ice it sometimes slips. The map alone doesn\'t give the chances.' },
      ],
      answer: 1,
    } },
  ],
}

// ---------------------------------------------------------------- Watch it run
function WatchOutcomes() {
  const [seed, setSeed] = useState(3)
  const [n, setN] = useState(20)
  const [action, setAction] = useState('up')
  const us = useMemo(() => { const rng = makeRng(seed); return Array.from({ length: n }, () => Math.floor(rng.random() * 100) / 100) }, [seed, n])
  const { frames } = useMemo(() => traceEstimateOutcomes(ICY_T, key(1, 1), action, us), [us, action])
  const Picture = useMemo(() => ValuePicture({ maze: ICY, size: 62 }), [])
  return (
    <div className="mlf-watch">
      <h3>estimate_outcomes: learn a move's chances by trying it</h3>
      <p>The world is a black box: <code>step(state, action, rng)</code> answers where you ended up and what you were paid, and nothing more. The arrows show each result, thicker the more often it has happened, with its count.</p>
      <div className="mlf-controls">
        <div><span className="mlf-eyebrow">move at (1, 1)</span><div className="mlf-chips">{ACTIONS.map(a => <button key={a} type="button" className={`mlf-chip${a === action ? ' on' : ''}`} aria-pressed={a === action} onClick={() => setAction(a)}>{ARROW[a]} {a}</button>)}</div></div>
        <div><span className="mlf-eyebrow">tries</span><div className="mlf-chips">{[10, 20, 50].map(v => <button key={v} type="button" className={`mlf-chip${v === n ? ' on' : ''}`} aria-pressed={v === n} onClick={() => setN(v)}>{v}</button>)}</div></div>
        <div><span className="mlf-eyebrow">seed</span><div className="mlf-chips">{[3, 8].map(v => <button key={v} type="button" className={`mlf-chip${v === seed ? ' on' : ''}`} aria-pressed={v === seed} onClick={() => setSeed(v)}>{v}</button>)}<button type="button" className="mlf-chip" onClick={() => setSeed(Math.floor(Math.random() * 1000))}>🎲</button></div></div>
      </div>
      <Stepper code={PIECES.estimate_outcomes.code} frames={frames} Picture={Picture} title="Step through estimate_outcomes" />
    </div>
  )
}

// The estimated chances against the hidden truth, for any number of tries.
export function TableFromTries() {
  const [n, setN] = useState(10)
  const [rng] = useState(() => makeRng(29))
  const [est, setEst] = useState(null)
  const truth = ICY_T['1,1'].up
  const run = () => setEst(estimateOutcomes(blackBox(ICY_T), '1,1', 'up', n, rng))
  return (
    <div className="mlf-explorer">
      <div className="mlf-controls"><div><span className="mlf-eyebrow">tries</span><div className="mlf-chips">{[10, 100, 1000, 10000].map(v => <button key={v} type="button" className={`mlf-chip${v === n ? ' on' : ''}`} aria-pressed={v === n} onClick={() => setN(v)}>{v}</button>)}</div></div><button type="button" className="mlf-primary" onClick={run}>Try it {n} times</button></div>
      <table className="mlf-table"><thead><tr><th>result of up at (1, 1)</th><th>hidden true chance</th><th>estimated from {n} tries</th></tr></thead>
        <tbody>{truth.map(([p, nn, r]) => { const e = est?.find(o => o[1] === nn && o[2] === r); return <tr key={nn}><td>({nn.replace(',', ', ')}), paid {r}</td><td>{r4(p)}</td><td>{est ? (e ? r4(e[0]) : '0 (never seen)') : '—'}</td></tr> })}</tbody></table>
    </div>
  )
}

function WatchTable() {
  return (
    <div className="mlf-watch">
      <h3>A table from tries</h3>
      <p>Each count ÷ tries is a chance, estimated. With 10 tries a rare result may never even show up; with 10 000 the estimates sit within about a hundredth of the truth.</p>
      <TableFromTries />
    </div>
  )
}

export const WATCH_SAMPLING = [WatchOutcomes, WatchTable]

// ---------------------------------------------------------------- Understand
const DRAWS = [3, -1, -1, 3, -1, -1, -1, -1]
export const UNDERSTAND_SAMPLING = [
  { h: 'The law of large numbers' },
  { md: `Take $n$ independent samples $x_1, \\dots, x_n$ of something whose true average is $\\mu$. Their plain average $\\bar x = \\frac{1}{n}\\sum_i x_i$ gets closer to $\\mu$ as $n$ grows. That is the **law of large numbers**, and it is why trying many times works at all.

**How close?** If one sample typically misses $\\mu$ by $\\sigma$ (its standard deviation), the average of $n$ misses by about

$$\\frac{\\sigma}{\\sqrt{n}}$$

the **standard error**. Why a square root: the misses of independent samples partly cancel. Their variances add up to $n\\sigma^2$, and dividing the sum by $n$ divides the variance by $n^2$, which leaves $\\sigma^2 / n$. The square root of that is $\\sigma/\\sqrt{n}$.` },
  { code: { piece: 'estimate', notes: [
    ['def estimate(draw, n, rng):', '`draw` is any function that makes one random sample from `rng`. `estimate` doesn\'t know what it samples: a spinner, a move\'s payment, a whole game.'],
    ['total += draw(rng)', 'Only the running total is kept, not the samples.'],
    ['return total / n', 'The plain average: every sample counts the same.'],
  ] } },
  { code: { piece: 'estimate_outcomes', notes: [
    ['result = step(state, action, rng)', 'The world, as a black box: `(next, reward)` and nothing else. Lesson 3\'s `sample_outcome` is hidden inside it.'],
    ['counts[result] = counts.get(result, 0) + 1', 'A tuple `(next, reward)` can be a dict key. Count each distinct result.'],
    ['return [(c / n, nxt, reward) for (nxt, reward), c in counts.items()]', 'Count ÷ tries = estimated chance, in the same `(p, next, reward)` shape as `build_table`, so every Part 2 piece could run on it.'],
  ] } },
  { mathCode: [
    ['\\bar x = \\frac{1}{n}\\sum_i x_i', 'estimate(draw, n, rng)', 'the sample average'],
    ['\\hat P(s\' \\mid s, a) = \\frac{c}{n}', 'c / n', 'an estimated chance: how often, out of how many tries'],
    ['\\sigma / \\sqrt{n}', 'sigma / n ** 0.5', 'the standard error: the typical miss of an average of n samples'],
  ] },
  { predict: {
    id: 'sampling-u-estimate',
    teach: `\`estimate\` adds up the draws and divides by n. Here the draws come out as ${DRAWS.join(', ')}.`,
    prompt: `What does \`estimate\` return for those ${DRAWS.length} draws?`,
    answer: r4(DRAWS.reduce((a, b) => a + b, 0) / DRAWS.length), tolerance: 1e-4,
    explain: `(${DRAWS.join(' + ')}) / ${DRAWS.length} = ${DRAWS.reduce((a, b) => a + b, 0)} / ${DRAWS.length} = ${r4(DRAWS.reduce((a, b) => a + b, 0) / DRAWS.length)}. Two wins in eight is "lucky" (the true rate is one in four), so the estimate is above the true 0.`,
  } },
  { predict: {
    id: 'sampling-u-se',
    teach: `The spinner's standard deviation is σ = √3 ≈ ${r4(SIGMA)}. The standard error of an average of n spins is σ / √n.`,
    prompt: 'What is the standard error of an estimate from **300** spins?',
    answer: r4(SIGMA / Math.sqrt(300)), tolerance: 2e-3,
    explain: `${r4(SIGMA)} / √300 = ${r4(SIGMA)} / ${r4(Math.sqrt(300))} = ${r4(SIGMA / Math.sqrt(300))}. Neat: √3 / √300 = √(1/100) = 0.1.`,
  } },
  { choice: {
    id: 'sampling-u-two-ways',
    teach: 'With an estimated table, every Part 2 piece works: `sweep_values` and `greedy_plan` would plan on it. But building it means trying **every move in every square many times**, before planning anything.',
    prompt: 'Lesson 0\'s learner never builds a table. What does it estimate instead?',
    options: [
      { text: 'Nothing: it guesses.', why: 'Its guesses are estimates, improved after every move.' },
      { text: 'The worth of each move directly, q[state][action], nudged toward what each try turned out to be worth.', why: 'It skips the table and estimates worths straight from experience. Lessons 9 and 10 build exactly that nudge.' },
      { text: 'The map', why: 'It never needs the map: just where each move led.' },
    ],
    answer: 1,
  } },
  { note: 'Learning the table from experience and then planning on it is **model-based** reinforcement learning. Estimating averages by sampling is the **Monte Carlo** method, named after the casino. The standard error $\\sigma/\\sqrt n$ is why RL needs so many episodes, and why noise never fully disappears from its estimates.', kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const rolls = (seed, n) => { const rng = makeRng(seed); return Array.from({ length: n }, () => Math.floor(rng.random() * 100) / 100) }
const estCase = (n, seed, why) => {
  const us = rolls(seed, n)
  return { call: `estimate(lambda rng: 3 if rng.random() < 0.25 else -1, ${n}, Dice(${JSON.stringify(us)}))`, expected: norm(estimate(spin, n, dice(us))), why }
}
const estTwoCase = (n, seed) => {
  const us = rolls(seed, 2 * n)
  return { call: `estimate(lambda rng: rng.random() + rng.random(), ${n}, Dice(${JSON.stringify(us)}))`, expected: norm(estimate(r => r.random() + r.random(), n, dice(us))), why: 'two numbers per draw' }
}
const outCase = (state, action, n, seed, slip = 0.2, why) => {
  const us = rolls(seed, n)
  const res = estimateOutcomes(blackBox(buildTable(ICY, slip)), state, action, n, dice(us))
  return { call: `estimate_outcomes(black_box(build_table(parse_map(ICY), ${slip})), ${pyCellLit(state)}, "${action}", ${n}, Dice(${JSON.stringify(us)}))`, expected: norm(res.map(([p, nn, r]) => [p, nn.split(',').map(Number), r])), why }
}
const OUT_USES = ['parse_map', 'legal_moves', 'move_chances', 'build_table', 'sample_outcome']

export const CHALLENGES_SAMPLING = [
  {
    id: 'sampling-estimate', piece: 'estimate', title: 'Write estimate', kind: 'write', uses: [],
    prompt: '`estimate(draw, n, rng)` calls `draw(rng)` n times and returns the plain average of the results. `draw` is a function: whatever it samples, `estimate` just averages it.',
    starter: `def estimate(draw, n, rng):
    total = 0.0
    # draw n samples and average them
    return total
`,
    solution: PIECES.estimate.code,
    runCalls: ['estimate(lambda rng: 3 if rng.random() < 0.25 else -1, 4, Dice([0.1, 0.5, 0.9, 0.3]))', 'estimate(lambda rng: 3 if rng.random() < 0.25 else -1, 10000, random.Random(1))'],
    cases: [estCase(4, 1), estCase(10, 2), estCase(25, 3), estTwoCase(6, 4), { call: 'estimate(lambda rng: 5, 3, Dice([]))', expected: 5, why: 'a draw that ignores the dice' }],
    hints: ['`for _ in range(n): total += draw(rng)` (`_` means "a loop variable I don\'t use").', 'Return `total / n`.'],
  },
  {
    id: 'sampling-outcomes', piece: 'estimate_outcomes', title: 'Write estimate_outcomes', kind: 'write', uses: OUT_USES,
    prompt: '`estimate_outcomes(step, state, action, n, rng)` calls `step(state, action, rng)` n times. Each call returns a result `(next, reward)`. Count each distinct result, and return a list of `(count / n, next, reward)`, in the order the results were **first seen**. The checks build `step` with `black_box(table)`, which hides the table.',
    starter: `def estimate_outcomes(step, state, action, n, rng):
    counts = {}
    # try the move n times; count each (next, reward) result
    return []
`,
    solution: PIECES.estimate_outcomes.code,
    runCalls: ['estimate_outcomes(black_box(build_table(parse_map(ICY), 0.2)), (1, 1), "up", 20, random.Random(3))', 'estimate_outcomes(black_box(build_table(parse_map(ICY), 0.2)), (1, 1), "up", 100000, random.Random(3))'],
    cases: [outCase('1,1', 'up', 10, 1), outCase('1,1', 'right', 20, 2), outCase('2,2', 'right', 30, 3), outCase('0,0', 'up', 12, 4, 0.4, 'a corner, more ice'), outCase('1,1', 'down', 8, 5, 0, 'no ice: one result')],
    hints: ['`result = step(state, action, rng)`, then `counts[result] = counts.get(result, 0) + 1`.', 'A dict keeps the order keys were first added. `for (nxt, reward), c in counts.items()` unpacks each one.'],
  },
  {
    id: 'sampling-fix-counts', piece: null, title: 'Bug hunt: chances that add up to 20', kind: 'fix', uses: OUT_USES,
    prompt: 'This `estimate_outcomes` returns "chances" like 14 and 3. Run the first preset, then add up the first item of each tuple with the second preset.',
    starter: PIECES.estimate_outcomes.code.replace('return [(c / n, nxt, reward)', 'return [(c, nxt, reward)') + '\n',
    solution: PIECES.estimate_outcomes.code,
    compare: 'A count is not a chance until it is divided by the number of tries: `c / n`. Counts add up to n, chances add up to 1, which is the same check that caught the bug in lesson 2.',
    runCalls: ['estimate_outcomes(black_box(build_table(parse_map(ICY), 0.2)), (1, 1), "up", 20, random.Random(3))', 'sum(p for p, _, _ in estimate_outcomes(black_box(build_table(parse_map(ICY), 0.2)), (1, 1), "up", 20, random.Random(3)))'],
    cases: [outCase('1,1', 'up', 10, 1), outCase('2,2', 'right', 30, 3), outCase('1,1', 'down', 8, 5, 0)],
    hints: ['What should the first numbers in the list add up to?', 'Turn each count into a share of the tries.'],
  },
]

export const KEEP_SAMPLING = {
  pieces: ['estimate', 'estimate_outcomes'],
  card: `**estimate(draw, n, rng)** → the average of n samples: an estimate that wobbles by about σ/√n.

**estimate_outcomes(step, state, action, n, rng)** → \`[(count / n, next, reward), ...]\`: a move's chances, learned by trying it in a world you can't see.`,
  remember: [
    'When you can only sample, average: the law of large numbers says it settles on the truth.',
    'The wobble shrinks like 1/√n: 100 times more samples for each extra decimal place.',
    'Chances can be estimated by counting: count ÷ tries.',
    'Lesson 0\'s learner skips the table and estimates worths directly, which is where Part 3 is going.',
  ],
  ml: [['averaging samples', 'Monte Carlo estimation', 'estimating by random trials'], ['σ/√n', 'standard error', 'how much an estimate wobbles'], ['a table learned from tries', 'a learned model', 'model-based RL plans on it']],
  next: 'Lesson 9: an estimate you can update one sample at a time, without storing the samples. It is the alpha line in lesson 0\'s program.',
}

export { MazeView, ICY_TEXT }
