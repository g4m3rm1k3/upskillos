import React, { useMemo, useState } from 'react'
import MazeView from '../MazeView.jsx'
import MapEditor from '../MapEditor.jsx'
import Stepper from '../Stepper.jsx'
import { ValuePicture } from '../pictures.jsx'
import { traceOptionValues, pyNum } from '../traces.js'
import { PIECES } from '../python/pieces.js'
import { ACTIONS, ARROW, SMALL, key, unkey, parseMap, buildTable, makeRng, tryParse, openCells, expectedValue, optionValues, bestOption, sweepValues, sealIslands, greedyPlanOf } from '../world.js'
import { pyCellLit, randomMaps } from './cases.js'
import { norm } from '../runtime/checks.js'

const r4 = x => Number(x.toFixed(4))
export const ICY_TEXT = '.#..\n.S..\n...G'

// ---------------------------------------------------------------- a toy: play a chance game many times
export function AverageToy({ outcomes, label = 'one play', seed = 11 }) {
  const [rng] = useState(() => makeRng(seed))
  const [plays, setPlays] = useState([])
  const play = n => setPlays(ps => {
    const add = []
    for (let k = 0; k < n; k++) {
      let u = rng.random(), run = 0
      add.push(outcomes.find(([p]) => (run += p) > u)?.[1] ?? outcomes.at(-1)[1])
    }
    return [...ps, ...add]
  })
  const total = plays.reduce((a, b) => a + b, 0)
  const exact = expectedValue(outcomes)
  return (
    <div className="mlf-toy">
      <p className="mlf-muted">{outcomes.map(([p, x]) => `${x > 0 ? '+' : ''}${x} with chance ${p}`).join(' · ')}</p>
      <div className="mlf-run-controls">
        {[1, 10, 100, 1000].map(n => <button key={n} type="button" className="mlf-secondary" onClick={() => play(n)}>Play {n === 1 ? label : `${n} times`}</button>)}
        <button type="button" className="mlf-quiet" onClick={() => setPlays([])}>Start again</button>
      </div>
      <p className="mlf-total">plays: <strong>{plays.length}</strong> · total: <strong>{r4(total)}</strong> · average per play: <strong>{plays.length ? r4(total / plays.length) : '—'}</strong>{plays.length >= 100 && <> · the formula says <strong>{r4(exact)}</strong></>}</p>
      {plays.length > 0 && <p className="mlf-muted">last plays: {plays.slice(-12).join(', ')}</p>}
    </div>
  )
}

// ---------------------------------------------------------------- numbers the lesson quotes (computed)
const ICY = parseMap(ICY_TEXT)
const ICY_T2 = buildTable(ICY, 0.2)
const NEAR = key(2, 2)
export const NEAR_OUTS = ICY_T2[NEAR].right
export const NEAR_PAY = r4(expectedValue(NEAR_OUTS.map(([p, , r]) => [p, r])))
const SPIN = [[0.25, 3], [0.75, -1]]
export const SPIN_AVG = expectedValue(SPIN)
const outcomeText = ([p, n, r]) => `- chance ${r4(p)}: ${n === NEAR ? 'bump, stay at (2, 2)' : `move to (${unkey(n).join(', ')})`}, paid ${r}`

export const TRY_AVERAGES = {
  lead: 'You know what every move can do, and how likely each result is (lessons 2 and 3). Now the mouse has to **choose**. But a move doesn\'t have one result: it has several, each with a chance. To compare moves, each move needs **one number**: what it is worth *on average*.',
  steps: [
    { predict: {
      id: 'averages-try-spinner',
      teach: '**A worked example.** A coin pays +2 on heads and 0 on tails. Play it 100 times: about 50 heads and 50 tails, so a total of about 50 × 2 + 50 × 0 = 100, which is **1 per play**. The shortcut: multiply each payment by its chance and add them up: 0.5 × 2 + 0.5 × 0 = 1. This is the **weighted average**, or **expected value**.',
      prompt: 'A spinner pays **+3** with chance **0.25** and **−1** with chance **0.75**. On average, what does one spin pay?',
      answer: SPIN_AVG,
      misconceptions: [{ answer: 1, feedback: '1 is the plain average of +3 and −1, as if both were equally likely. But −1 happens three times as often as +3, so it must count three times as much.' }, { answer: 2, feedback: 'That adds the payments (3 + (−1)) without the chances. Each payment has to be multiplied by how often it happens.' }],
      explain: `0.25 × 3 + 0.75 × (−1) = 0.75 − 0.75 = ${SPIN_AVG}. In 100 spins, about 25 pay +3 (75 in all) and about 75 pay −1 (−75 in all): no gain on average. A game that pays +3 sometimes can still be worth nothing.`,
    } },
    { md: 'Check it by playing: the average per play should settle near the formula.' },
    { figure: AverageToy, props: { outcomes: SPIN, label: 'once' } },
    { choice: {
      id: 'averages-try-wobble',
      teach: 'Each play is random. A short run can easily have more wins than its fair share, or fewer. The longer the run, the more those lucky and unlucky stretches cancel out.',
      prompt: 'After 1000 plays the average is close to 0, but usually not exactly 0. Why?',
      options: [
        { text: 'The formula is slightly wrong.', why: 'The formula is exact: it is what the average settles to over a very long run. Any finite run wobbles around it.' },
        { text: 'Any number of plays is a random sample: its average wobbles around the true average, and the wobble shrinks as the plays grow.', why: 'With 10 plays it can be far off, with 1000 it is close, with a million closer still. Lesson 8 measures how big the wobble is.' },
        { text: 'The computer\'s random numbers are biased.', why: 'They are fair enough for this. A real fair coin wobbles in exactly the same way.' },
      ],
      answer: 1,
    } },
    { predict: {
      id: 'averages-try-icy-pay',
      teach: `**Back to the mouse.** On the icy map (slip 0.2), the mouse at (2, 2), right next to the cheese, presses **right**. Its outcomes, from \`build_table\`:\n${NEAR_OUTS.map(outcomeText).join('\n')}\n\nThe average payment is a weighted average, exactly like the spinner: each payment times its chance, added up.`,
      prompt: 'What does pressing right from (2, 2) **pay** on average? (Just this one move. Ignore what happens after.)',
      answer: NEAR_PAY, tolerance: 6e-4,
      misconceptions: [{ answer: 1, feedback: 'That is what the move pays when it works. It slips 15% of the time and then pays a little less, or even −0.75 for a bump.' }],
      explain: `${NEAR_OUTS.map(([p, , r]) => `${r4(p)} × ${r}`).join(' + ')} = ${NEAR_PAY}. Mostly it reaches the cheese, and the slips pull the average down a little.`,
    } },
    { choice: {
      id: 'averages-try-needs-worth',
      teach: 'Payments only cover the move itself. After the move, the game carries on from wherever the mouse landed, and some squares are much better places to carry on from than others.',
      prompt: 'Move A pays −0.04 and lands **next to the cheese**. Move B pays −0.04 and lands in a **dead end** far from it. They pay the same now. What else must the worth of a move include?',
      options: [
        { text: 'Nothing: they are worth the same.', why: 'Then the mouse would have no reason to prefer A, and would wander into dead ends just as happily.' },
        { text: 'How good the square it lands on is: the worth of carrying on from there.', why: 'So the worth of a move is **payment + worth of where you land**, averaged over the outcomes. That is the formula this lesson builds.' },
        { text: 'How many walls are next to the square it lands on.', why: 'Walls matter only through what they do to later moves, and that is already part of the worth of the square.' },
      ],
      answer: 1,
    } },
  ],
}

// ---------------------------------------------------------------- Watch it run
// The worths each square is given: "worth by sweeping" (lesson 5), here just handed over. Squares
// that can't reach the cheese are walled up first (lesson 6 explains why they have to be).
export function worthsFor(text, slip) {
  const sealed = sealIslands(text)
  const maze = parseMap(sealed)
  const table = buildTable(maze, slip)
  return { maze, table, values: sweepValues(table, 1)[0] }
}

function WatchOptions() {
  const [text, setText] = useState(ICY_TEXT)
  const [slip, setSlip] = useState(0.2)
  const { maze, table, values } = useMemo(() => worthsFor(text, slip), [text, slip])
  const [cell, setCell] = useState(key(1, 1))
  const open = openCells(maze).filter(c => c !== maze.goal)
  const at = open.includes(cell) ? cell : open[0]
  const { frames } = useMemo(() => traceOptionValues(table, at, values, 1), [table, at, values])
  const Picture = useMemo(() => ValuePicture({ maze, size: 56 }), [maze])
  return (
    <div className="mlf-watch">
      <h3>option_values: every move, as a weighted average</h3>
      <p>The number on each square is its <strong>worth</strong>: what the rest of the game is worth from there, playing well. Take these as given for now; lesson 5 works them out. Pick a square and step through how each of its four moves is valued, and which one wins.</p>
      <div className="mlf-controls">
        <div className="mlf-picker"><span className="mlf-eyebrow">Square</span><MazeView maze={maze} size={24} compact onCell={c => open.includes(c) && setCell(c)} marks={{ [at]: 'focus' }} /></div>
        <div><span className="mlf-eyebrow">slip</span><div className="mlf-chips">{[0, 0.2, 0.4].map(s => <button key={s} type="button" className={`mlf-chip${s === slip ? ' on' : ''}`} aria-pressed={s === slip} onClick={() => setSlip(s)}>{s}</button>)}</div></div>
      </div>
      <details className="mlf-change"><summary>Change the map (squares that can't reach the cheese are walled up)</summary><MapEditor text={text} setText={setText} example={ICY_TEXT} size={30} /></details>
      <Stepper code={`${PIECES.option_values.code}\n\n${PIECES.best_option.code}`} frames={frames} Picture={Picture} title="Step through option_values and best_option" />
    </div>
  )
}

// Click any square: its four option values, each outcome's share, and the best move everywhere.
export function OptionExplorer({ text = SMALL }) {
  const [slip, setSlip] = useState(0.2)
  const { maze, table, values } = useMemo(() => worthsFor(text, slip), [text, slip])
  const [cell, setCell] = useState(maze.start)
  const row = table[cell] && Object.keys(table[cell]).length ? optionValues(table, cell, values, 1) : null
  const [ba] = row ? bestOption(row) : [null]
  const plan = greedyPlanOf(table, values, 1)
  return (
    <div className="mlf-explorer">
      <div><span className="mlf-eyebrow">slip</span><div className="mlf-chips">{[0, 0.2, 0.4].map(s => <button key={s} type="button" className={`mlf-chip${s === slip ? ' on' : ''}`} aria-pressed={s === slip} onClick={() => setSlip(s)}>{s}</button>)}</div></div>
      <div className="mlf-two">
        <MazeView maze={maze} size={58} rc labels={Object.fromEntries(Object.entries(values).map(([s, v]) => [s, String(r4(v))]))} arrows={plan} marks={{ [cell]: 'focus' }} onCell={c => maze.cells[c] !== '#' && setCell(c)} title="Click a square to see its four moves valued" />
        <div className="mlf-table-print">
          <p className="mlf-eyebrow">option_values(table, ({unkey(cell).join(', ')}), values)</p>
          {row ? (
            <table className="mlf-table"><thead><tr><th>move</th><th>outcomes: chance × (paid + worth there)</th><th>worth</th></tr></thead>
              <tbody>{ACTIONS.map(a => (
                <tr key={a} className={a === ba ? 'changed' : ''}><td>{ARROW[a]} {a}</td>
                  <td><code>{table[cell][a].map(([p, n, r]) => `${r4(p)}×(${r}+${r4(values[n])})`).join(' + ')}</code></td>
                  <td><strong>{r4(row[a])}</strong>{a === ba ? ' ← best' : ''}</td></tr>))}</tbody></table>
          ) : <p>The cheese: the game is over here, worth 0 from now on.</p>}
          <p className="mlf-muted">The arrows on every square show its best move. Together they are a <strong>plan</strong> (lesson 7).</p>
        </div>
      </div>
    </div>
  )
}

function WatchExplorer() {
  return (
    <div className="mlf-watch">
      <h3>Every square, every move</h3>
      <p>Click around. Then try slip 0.4: near the walls, the best move sometimes changes, because a slip into a wall is expensive.</p>
      <OptionExplorer />
    </div>
  )
}

export const WATCH_AVERAGES = [WatchOptions, WatchExplorer]

// ---------------------------------------------------------------- Understand
const EX_PAIRS = [[0.5, 4], [0.3, -2], [0.2, 10]]
const W = worthsFor(ICY_TEXT, 0.2)
const ONE = W.table[key(1, 1)].down
export const ONE_DOWN = r4(ONE.reduce((s, [p, n, r]) => s + p * (r + r4(W.values[n])), 0))

export const UNDERSTAND_AVERAGES = [
  { h: 'The weighted average: what something is worth in the long run' },
  { md: `If a result $x_k$ happens with chance $p_k$, then over $N$ plays it happens about $p_k N$ times. The total is about $\\sum_k p_k N x_k$, so the **average per play** is

$$\\mathbb{E}[X] = \\sum_k p_k \\, x_k$$

This is the **expected value**: "expected" as in *the long-run average*, not "the result you expect next time" (the spinner never pays 0). It is the single number that summarises a chancy result.` },
  { code: { piece: 'expected_value', notes: [
    ['return sum(p * x for p, x in pairs)', '`pairs` is a list of `(chance, amount)` tuples. `for p, x in pairs` unpacks each one. `p * x for ...` is a **generator**: it produces the products one at a time, and `sum` adds them as they come, without building a list first.'],
  ] } },
  { predict: {
    id: 'averages-u-ev',
    teach: 'Multiply each amount by its chance, then add. Watch the signs: a negative amount times a chance stays negative.',
    prompt: 'What is `expected_value([(0.5, 4), (0.3, -2), (0.2, 10)])`?',
    answer: r4(expectedValue(EX_PAIRS)),
    misconceptions: [{ answer: r4((4 - 2 + 10) / 3), tolerance: 1e-3, feedback: 'That is the plain average of 4, −2 and 10. The chances are not equal (0.5, 0.3, 0.2), so each amount must be weighted by its own chance.' }],
    explain: `0.5 × 4 + 0.3 × (−2) + 0.2 × 10 = 2 − 0.6 + 2 = ${r4(expectedValue(EX_PAIRS))}.`,
  } },
  { h: 'The worth of a move' },
  { md: `A move's outcomes are not just payments: each one also *lands somewhere*, and the game carries on from there. Write $V(s')$ for the worth of square $s'$: the average total still to come from there, playing well. Then the worth of pressing $a$ in $s$ is the weighted average of **payment + worth of where you land**:

$$Q(s, a) = \\sum_{s'} P(s' \\mid s, a)\\,\\big(R + g\\,V(s')\\big)$$

\`g\` is 1 in this lesson: later rewards count fully. Lesson 6 explains why you'd ever want it smaller. The cheese square has worth 0, because the game is over there: nothing more can happen.` },
  { mathCode: [
    ['Q(s, a)', 'option_values(...)[action]', 'the worth of pressing a in s: an average over outcomes'],
    ["P(s' \\mid s, a)", 'p', 'the chance of one outcome (from build_table)'],
    ['R', 'reward', 'what that outcome pays now'],
    ["V(s')", 'values[nxt]', 'the worth of carrying on from where you land'],
    ['g', 'g', 'how much later rewards count (1 here)'],
  ] },
  { code: { piece: 'option_values', notes: [
    ['return {action: sum(', 'A **dict comprehension**: `{key: value for ... in ...}` builds the whole row in one expression, one entry per action.'],
    ['for action, outcomes in table[state].items()}', 'For each move from this square, its list of outcomes (lesson 2).'],
  ] } },
  { predict: {
    id: 'averages-u-one-option',
    teach: `On the icy map with slip 0.2, the outcomes of pressing **down** at (1, 1), with the worths of where they land:\n${ONE.map(([p, n, r]) => `- chance ${r4(p)}, paid ${r}, lands on (${unkey(n).join(', ')}), worth ${r4(W.values[n])}`).join('\n')}\n\nFor each one, work out chance × (paid + worth), then add them up.`,
    prompt: 'What is `option_values(table, (1, 1), values)["down"]`?',
    answer: ONE_DOWN, tolerance: 2e-3,
    explain: `${ONE.map(([p, n, r]) => `${r4(p)} × (${r} + ${r4(W.values[n])})`).join(' + ')} = ${ONE_DOWN}.`,
  } },
  { code: { piece: 'best_option', notes: [
    ['best_action, best_value = None, None', '`None` means "nothing seen yet". The first move always becomes the best so far, whatever its value, even a negative one.'],
    ['if best_value is None or value > best_value:', 'Strictly greater: on a tie, the move seen first stays. So ties are broken by the order of `ACTIONS`, the same way every time.'],
  ] } },
  { choice: {
    id: 'averages-u-why-none',
    teach: 'In this maze almost every worth is **negative**: steps cost −0.04, so a square far from the cheese can be worth −0.3 or less.',
    prompt: 'What would go wrong if `best_option` started with `best_value = 0.0` instead of `None`?',
    options: [
      { text: 'Nothing: 0 is smaller than any worth.', why: 'Only if every worth is positive. Here they are often negative.' },
      { text: 'When every move is worth less than 0, no move ever beats the starting 0, so it would return `(None, 0.0)`: no move at all, and a made-up worth of 0.', why: 'A starting value is a claim that a move this good exists. `None` makes no claim. You will fix exactly this bug in Write it.' },
      { text: 'It would return the worst move instead of the best.', why: 'The comparison is still "greater than", so it still looks for the highest. The trouble is only when nothing beats 0.' },
    ],
    answer: 1,
  } },
  { note: 'In reinforcement learning, $Q(s, a)$ is the **action value** (the "Q" in Q-learning), and the worth of a square when you play well, $V(s) = \\max_a Q(s, a)$, is its **state value**. The formula above is half of the **Bellman equation**, which lesson 5 completes.', kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const pyValues = values => `{${Object.entries(values).map(([s, v]) => `${pyCellLit(s)}: ${r4(v)}`).join(', ')}}`
const optionCase = (text, name, slip, state, why) => {
  const { maze, table, values } = worthsFor(text, slip)
  const rounded = Object.fromEntries(Object.entries(values).map(([s, v]) => [s, r4(v)]))
  void maze
  return { call: `option_values(build_table(parse_map(${name ?? `"""\n${sealIslands(text)}\n"""`}), ${slip}), ${pyCellLit(state)}, ${pyValues(values)})`, expected: norm(optionValues(table, state, rounded, 1)), why }
}
const evCase = pairs => ({ call: `expected_value(${pairs.length ? `[${pairs.map(([p, x]) => `(${p}, ${x})`).join(', ')}]` : '[]'})`, expected: norm(expectedValue(pairs)) })
const RANDOM = randomMaps(41, 2).map(sealIslands)
const bestCase = row => ({ call: `best_option(${`{${Object.entries(row).map(([a, v]) => `"${a}": ${v}`).join(', ')}}`})`, expected: norm(bestOption(row)) })

export const CHALLENGES_AVERAGES = [
  {
    id: 'averages-ev', piece: 'expected_value', title: 'Write expected_value', kind: 'write', uses: [],
    prompt: '`expected_value(pairs)` takes a list of `(chance, amount)` pairs and returns the weighted average: each amount times its chance, added up. An empty list is worth 0.',
    starter: `def expected_value(pairs):
    total = 0.0
    # add chance * amount for every pair
    return None
`,
    solution: PIECES.expected_value.code,
    runCalls: ['expected_value([(0.25, 3), (0.75, -1)])', 'expected_value([(0.5, 4), (0.3, -2), (0.2, 10)])'],
    cases: [evCase(SPIN), evCase(EX_PAIRS), evCase(NEAR_OUTS.map(([p, , r]) => [p, r])), evCase([[1, -0.75]]), evCase([])],
    hints: ['`for p, x in pairs:` unpacks each pair.', 'Inside: `total += p * x`, and return `total` after the loop. (Or the one-line `sum(p * x for p, x in pairs)`.)'],
  },
  {
    id: 'averages-options', piece: 'option_values', title: 'Write option_values', kind: 'write', uses: ['parse_map', 'legal_moves', 'move_chances', 'build_table'],
    prompt: '`option_values(table, state, values, g=1.0)` returns a dict `{action: worth}` for every move in `table[state]`. A move\'s worth is the sum, over its outcomes `(p, nxt, reward)`, of `p * (reward + g * values[nxt])`.',
    starter: `def option_values(table, state, values, g=1.0):
    row = {}
    for action, outcomes in table[state].items():
        # add up p * (reward + g * values[nxt]) over the outcomes
        pass
    return row
`,
    solution: PIECES.option_values.code,
    runCalls: ['option_values(build_table(parse_map(TINY)), (1, 2), {(0, 0): 0.88, (0, 1): 0.92, (1, 1): 0.96, (1, 2): 1.0, (2, 2): 0.0})', 'build_table(parse_map(TINY))[(1, 2)]'],
    cases: [
      { call: 'option_values(build_table(parse_map(TINY)), (1, 2), {(0, 0): 0.88, (0, 1): 0.92, (1, 1): 0.96, (1, 2): 1.0, (2, 2): 0.0})', expected: norm(optionValues(buildTable(parseMap('S.#\n#..\n##G'), 0), '1,2', { '0,0': 0.88, '0,1': 0.92, '1,1': 0.96, '1,2': 1, '2,2': 0 }, 1)), why: 'no slips' },
      optionCase(ICY_TEXT, 'ICY', 0.2, '1,1', 'with slips'),
      optionCase(ICY_TEXT, 'ICY', 0.2, '2,2', 'next to the cheese'),
      optionCase(SMALL, 'SMALL', 0.4, '0,0', 'a corner'),
      ...RANDOM.map((t, i) => optionCase(t, null, 0.2, openCells(parseMap(t)).find(c => c !== parseMap(t).start && c !== parseMap(t).goal), 'a random map')),
    ],
    hints: ['Inside the loop: `total = 0.0`, then `for p, nxt, reward in outcomes: total += p * (reward + g * values[nxt])`.', 'Then `row[action] = total`.'],
  },
  {
    id: 'averages-fix-best', piece: null, title: 'Bug hunt: the best of nothing', kind: 'fix', uses: [],
    prompt: 'This `best_option` works on the first preset but returns `(None, 0.0)` on the second. Run both, compare the rows, and fix it.',
    starter: `def best_option(row):
    best_action, best_value = None, 0.0
    for action, value in row.items():
        if value > best_value:
            best_action, best_value = action, value
    return best_action, best_value
`,
    solution: PIECES.best_option.code,
    compare: 'Starting at `0.0` claims "there is already a move worth 0". When every move is worth less (and in this maze most are), nothing beats it, and the function returns no move at all. Starting at `None` and taking the first move unconditionally makes no such claim.',
    runCalls: ['best_option({"left": 0.2, "up": 0.5, "right": 0.1, "down": -0.3})', 'best_option({"left": -0.2, "up": -0.5, "right": -0.1, "down": -0.3})'],
    cases: [bestCase({ left: 0.2, up: 0.5, right: 0.1, down: -0.3 }), bestCase({ left: -0.2, up: -0.5, right: -0.1, down: -0.3 }), bestCase({ left: -1, up: -1, right: -1, down: -1 }), bestCase({ right: -0.75 }), bestCase({ left: 0.4, up: 0.4, right: 0.1, down: 0.4 })],
    hints: ['Look at the starting value. Can a row of negative numbers ever beat it?', 'Start with `None` and take the first move whatever its value: `if best_value is None or value > best_value:`.'],
  },
]

export const KEEP_AVERAGES = {
  pieces: ['expected_value', 'option_values', 'best_option'],
  card: `**expected_value(pairs)** → $\\sum p \\cdot x$: the long-run average of a chancy amount.

**option_values(table, state, values, g)** → \`{action: worth}\`, each one $\\sum p\\,(R + g\\,V(s'))$ over the move's outcomes.

**best_option(row)** → \`(action, worth)\` with the highest worth; the first one wins a tie.`,
  remember: [
    'A chancy result is summarised by its weighted average: each amount times its chance, added up.',
    'The average is what a long run settles to; any finite run wobbles around it.',
    'A move is worth what it pays **plus** what the square it lands on is worth, averaged over its outcomes.',
    'Never start a "best so far" at 0 when values can be negative.',
  ],
  ml: [['the weighted average', 'expected value, $\\mathbb{E}$', 'the long-run average'], ['the worth of a move', 'action value, $Q(s,a)$', 'Q for quality'], ['the worth of a square', 'state value, $V(s)$', 'the best Q in that square']],
  next: 'Lesson 5: where do the worths come from? From the cheese, backwards.',
}
