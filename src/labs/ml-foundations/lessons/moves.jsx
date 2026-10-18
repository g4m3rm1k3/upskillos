import React, { useMemo, useState } from 'react'
import MazeView from '../MazeView.jsx'
import MapEditor from '../MapEditor.jsx'
import Stepper from '../Stepper.jsx'
import { TablePicture } from '../pictures.jsx'
import { traceBuildTable, pyOutcome, pyStr } from '../traces.js'
import { PIECES } from '../python/pieces.js'
import { ACTIONS, ARROW, STEP, BUMP, GOAL, TINY, SMALL, SEVEN, key, unkey, parseMap, buildTable, moveChances, openCells, tryParse } from '../world.js'
import { pyText, pyCellLit, normSortedTable, normOutcomes, randomMaps } from './cases.js'
import { norm } from '../runtime/checks.js'
import { Choice, Teach } from '../Blocks.jsx'

// ---------------------------------------------------------------- Try it first
export const ICY_TEXT = '.#..\n.S..\n...G'
const ICY = parseMap(ICY_TEXT)
const ME = key(1, 1)
const SLIP = 0.2
const outcomeOf = (action, where) => buildTable(ICY, SLIP)[ME][action].find(o => o[1] === where)?.[0] ?? 0
const PLACES = [
  { where: key(1, 2), label: 'ends up to the right, at (1, 2)' },
  { where: key(1, 0), label: 'ends up to the left, at (1, 0)' },
  { where: key(2, 1), label: 'ends up below, at (2, 1)' },
  { where: ME, label: 'stays put at (1, 1): it slid up, into the wall' },
]
const tidy = x => Number(x.toFixed(6))
export const ICY_RIGHT = PLACES.map(p => tidy(outcomeOf('right', p.where)))
export const ICY_UP_STAY = tidy(outcomeOf('up', ME))

function IcyChances({ onDone }) {
  const [values, setValues] = useState(['', '', '', ''])
  const [verdict, setVerdict] = useState(null)
  function check(e) {
    e.preventDefault()
    const n = values.map(v => Number(v))
    if (values.some(v => !v.trim() || Number.isNaN(Number(v)))) return setVerdict({ text: 'Fill in all four, as decimals (0.05, not 5%).' })
    const ok = n.every((x, i) => Math.abs(x - ICY_RIGHT[i]) < 1e-6)
    if (ok) { setVerdict({ ok: true }); onDone(); return }
    const sum = n.reduce((a, b) => a + b, 0)
    if (Math.abs(n[0] - (1 - SLIP)) < 1e-6) return setVerdict({ text: `Right isn't ${1 - SLIP}. When it slips, the random pick is one of all four directions, and one of those is right again. So right also gets a share of the slips.` })
    if (Math.abs(n[3]) < 1e-9) return setVerdict({ text: 'Staying put can happen: a slip can pick "up", and up is a wall, so the mouse bumps and stays where it is.' })
    if (Math.abs(sum - 1) > 1e-6) return setVerdict({ text: `Your chances add up to ${Number(sum.toFixed(6))}. These four are everything that can happen, so they must add up to exactly 1.` })
    return setVerdict({ text: 'Not quite. Split it in two: what happens with chance 0.8 (no slip), and how the other 0.2 is shared between four directions.' })
  }
  return (
    <div className="mlf-try-task">
      <p><strong>1.</strong> The floor is icy. When the mouse tries a move, with chance <strong>{1 - SLIP}</strong> it does that move. With chance <strong>{SLIP}</strong> it slips: the move is replaced by one of the four directions, <em>picked evenly</em>. The mouse at (1, 1) presses <strong>right {ARROW.right}</strong>. <strong>What is the chance of each result?</strong></p>
      <Teach>{`**A worked example first.** Say the mouse presses **down** on open floor, with no walls around it. There are two cases:
- **No slip** (chance ${1 - SLIP}): it goes down.
- **Slip** (chance ${SLIP}): the move is replaced by left, up, right or down, each picked with chance ${SLIP} ÷ 4 = ${SLIP / 4}. One of those four is **down** again.

So down = ${1 - SLIP} + ${SLIP / 4} = ${Number((1 - SLIP + SLIP / 4).toFixed(6))}, and left, up and right are ${SLIP / 4} each. All four add up to 1, because something always happens.

**One more rule:** a move into a wall doesn't move the mouse. It stays where it is.`}</Teach>
      <div className="mlf-two">
        <MazeView maze={ICY} size={50} rc agent={ME} arrows={{}} />
        <form onSubmit={check} className="mlf-chance-form">
          {PLACES.map((p, i) => (
            <label key={i}><span>The mouse {p.label}</span>
              <input value={values[i]} onChange={e => { const v = [...values]; v[i] = e.target.value; setValues(v); setVerdict(null) }} inputMode="decimal" aria-label={`Chance it ${p.label}`} disabled={verdict?.ok} />
            </label>
          ))}
          <button className="mlf-primary" disabled={verdict?.ok}>Check</button>
        </form>
      </div>
      {verdict && <p className={`mlf-feedback ${verdict.ok ? 'good' : 'bad'}`} role="status">{verdict.ok ? `✓ ${ICY_RIGHT[0]} right (0.8 for no slip, plus a quarter of the 0.2), and ${ICY_RIGHT[1]} each for the other three. They add up to 1.` : verdict.text}</p>}
    </div>
  )
}

export function TryMoves({ onDone }) {
  const [step, setStep] = useState(0)
  return (
    <div className="mlf-try">
      <p className="mlf-lead">Knowing which squares are next door isn't enough. Before anything can plan, it has to know what a move <strong>does</strong>: where you can end up, how likely each place is, and what it costs.</p>
      <IcyChances onDone={() => setStep(s => Math.max(s, 1))} />
      {step >= 1 && (
        <div className="mlf-try-task">
          <p><strong>2.</strong> Every move is paid for. A normal step pays <code>STEP = {STEP}</code>, reaching the cheese pays <code>GOAL = {GOAL}</code>, and walking into a wall pays <code>BUMP = {BUMP}</code>.</p>
          <Choice spec={{
            id: 'moves-try-why-step', teach: "**What the payments are for.** The mouse, and later the learner, tries to make the **total** of its payments over a whole game as large as possible. Whatever the payments reward, it will learn to do.",
            prompt: 'Why does an ordinary step cost a little (−0.04) instead of nothing?',
            options: [
              { text: 'So the numbers are never zero.', why: 'Zero is a perfectly good number. The cost changes what is *best*, not how it looks.' },
              { text: 'So that a short route to the cheese is better than a long one. If steps were free, wandering for 100 moves and then finding the cheese would be just as good as going straight there.', why: 'Yes. The small cost per step is how "get there quickly" is said in numbers. Change it and the best behaviour changes.' },
              { text: 'Because the mouse gets tired.', why: 'A nice story, but the program has no tiredness. The cost is a choice the designer makes to say what they want.' },
            ],
            answer: 1,
          }} onDone={() => setStep(s => Math.max(s, 2))} />
        </div>
      )}
      {step >= 2 && (
        <div className="mlf-try-task">
          <p><strong>3.</strong> Now the mouse presses <strong>up {ARROW.up}</strong>, straight into the wall.</p>
          <Choice spec={{
            id: 'moves-try-up', teach: "**The same rules as question 1.** With chance 0.8, nothing slips. With chance 0.2, a slip picks one of the four directions evenly (0.05 each). A move into a wall leaves the mouse where it is.",
            prompt: 'What is the chance it stays where it is?',
            options: [
              { text: `${1 - SLIP}`, why: `${1 - SLIP} is the no-slip share. A slip can also pick up (one time in four), and that bumps too: it stays put again.` },
              { text: `${ICY_UP_STAY}`, why: `Right: ${1 - SLIP} for doing what it pressed, plus ${SLIP} ÷ 4 = ${SLIP / 4} for slipping into "up" anyway. Two different events, one result, so the chances **add**.` },
              { text: '1', why: 'It can still slip left, right or down, and then it moves.' },
              { text: `${SLIP / 4}`, why: 'That is only the slip into "up". Most of the time (no slip) it also does "up".' },
            ],
            answer: 1,
          }} onDone={onDone} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Watch it run
function WatchBuild() {
  const [text, setText] = useState(ICY_TEXT)
  const maze = useMemo(() => tryParse(text).maze, [text])
  const [cell, setCell] = useState(ME)
  const [action, setAction] = useState('up')
  const [slip, setSlip] = useState(0.2)
  const open = openCells(maze).filter(c => c !== maze.goal)
  const at = open.includes(cell) ? cell : open[0]
  const { frames } = useMemo(() => traceBuildTable(maze, at, action, slip), [maze, at, action, slip])
  const Picture = useMemo(() => TablePicture({ maze }), [maze])
  return (
    <div className="mlf-watch">
      <h3>build_table, watched for one square and one move</h3>
      <p>The arrows show each result found so far: thicker means more likely, and a red curl means a bump (you stay put). It asks you for the chance of the intended move, and what happens when two slips end in the same place.</p>
      <div className="mlf-controls">
        <div className="mlf-picker"><span className="mlf-eyebrow">Square</span><MazeView maze={maze} size={24} compact onCell={c => open.includes(c) && setCell(c)} marks={{ [at]: 'focus' }} /></div>
        <div><span className="mlf-eyebrow">Move</span><div className="mlf-chips">{ACTIONS.map(a => <button key={a} type="button" className={`mlf-chip${a === action ? ' on' : ''}`} aria-pressed={a === action} onClick={() => setAction(a)}>{ARROW[a]} {a}</button>)}</div></div>
        <div><span className="mlf-eyebrow">slip</span><div className="mlf-chips">{[0, 0.2, 0.4].map(s => <button key={s} type="button" className={`mlf-chip${s === slip ? ' on' : ''}`} aria-pressed={s === slip} onClick={() => setSlip(s)}>{s}</button>)}</div></div>
      </div>
      <details className="mlf-change"><summary>Change the map</summary><MapEditor text={text} setText={setText} example={ICY_TEXT} size={30} needPath={false} /></details>
      <Stepper code={PIECES.build_table.code} frames={frames} Picture={Picture} title="Step through build_table" />
    </div>
  )
}

// Every square, every move: click around the finished table.
export function TableExplorer({ text = SMALL, initialSlip = 0.2 }) {
  const maze = parseMap(text)
  const [slip, setSlip] = useState(initialSlip)
  const [cell, setCell] = useState(maze.start)
  const [action, setAction] = useState('right')
  const table = useMemo(() => buildTable(maze, slip), [maze, slip])
  const outs = table[cell]?.[action] ?? []
  const DIR = { left: [-1, 0], up: [0, -1], right: [1, 0], down: [0, 1] }
  const flows = outs.map(([p, n]) => ({ from: cell, to: n, p, bump: n === cell, dir: DIR[action], label: Number(p.toFixed(3)).toString() }))
  const isGoal = cell === maze.goal
  return (
    <div className="mlf-explorer">
      <div className="mlf-controls">
        <div><span className="mlf-eyebrow">Move</span><div className="mlf-chips">{ACTIONS.map(a => <button key={a} type="button" className={`mlf-chip${a === action ? ' on' : ''}`} aria-pressed={a === action} onClick={() => setAction(a)}>{ARROW[a]} {a}</button>)}</div></div>
        <div><span className="mlf-eyebrow">slip</span><div className="mlf-chips">{[0, 0.2, 0.4, 1].map(s => <button key={s} type="button" className={`mlf-chip${s === slip ? ' on' : ''}`} aria-pressed={s === slip} onClick={() => setSlip(s)}>{s}</button>)}</div></div>
      </div>
      <div className="mlf-two">
        <MazeView maze={maze} size={56} rc onCell={c => maze.cells[c] !== '#' && setCell(c)} marks={{ [cell]: 'focus' }} flows={isGoal ? [] : flows} title="Click a square to see its row of the table" />
        <div className="mlf-table-print">
          <p className="mlf-eyebrow">table[{`(${unkey(cell).join(', ')})`}]</p>
          {isGoal ? <pre className="mlf-console">{'{}'}  # the goal: no moves, the game is over</pre> : (
            <pre className="mlf-console">{`{\n${ACTIONS.map(a => `  ${pyStr(a)}: [${table[cell][a].map(pyOutcome).join(', ')}]`).join(',\n')}\n}`}</pre>
          )}
          <p className="mlf-muted">Each tuple is (chance, where you end up, what you are paid).</p>
        </div>
      </div>
    </div>
  )
}

function WatchExplore() {
  return (
    <div className="mlf-watch">
      <h3>The whole table: click any square</h3>
      <p>Every open square has a row with four moves, and every move a list of outcomes. Try slip 1: then the move pressed makes no difference at all.</p>
      <TableExplorer />
    </div>
  )
}

export const WATCH_MOVES = [WatchBuild, WatchExplore]

// ---------------------------------------------------------------- Understand
const SEVEN_TABLE = buildTable(parseMap(SEVEN), 0.2)
const SEVEN_STATES = Object.keys(SEVEN_TABLE).length
const CORNER_OUTS = SEVEN_TABLE['0,0'].right.length
const TINY_UP = buildTable(parseMap(TINY), 0.2)['0,0'].up

export const UNDERSTAND_MOVES = [
  { h: 'A table of what every move does' },
  { md: `The whole world fits in one nested lookup: **\`table[state][action]\` is a list of outcomes**, and each outcome is a tuple \`(chance, next state, reward)\`. Read it left to right: *in this square*, *if I press this*, *these things can happen*.

For \`TINY\` with slip 0.2, \`table[(0, 0)]["up"]\` is
\`\`\`
[${TINY_UP.map(pyOutcome).join(', ')}]
\`\`\`
Up from the top-left corner is off the map, so most of the time the mouse bumps and stays; only a slip to the right moves it.` },
  { code: { piece: 'build_table', notes: [
    ['for cell, ch in maze["cells"].items():', '`.items()` gives `(key, value)` pairs: the address and the character.'],
    ['table[cell] = {}', 'Every open square gets a row, even the goal.'],
    ['if cell == maze["goal"]:', 'The goal\'s row stays **empty**: no moves. An empty row is how the table says "the game is over here" (a *terminal* state).'],
    ['moves = legal_moves(maze, cell)', 'Lesson 1\'s piece, reused: which directions are open from here.'],
    ['merged = {}', 'Collects results by `(where, reward)`. Different slips can end in the same place, and those must become **one** outcome.'],
    ['for executed, p in move_chances(action, slip).items():', 'What is pressed (`action`) and what actually happens (`executed`) are different things.'],
    ['nxt, reward = cell, BUMP', 'A blocked move leaves you where you were, and costs more than a step.'],
    ['merged[(nxt, reward)] = merged.get', '`.get(key, 0.0)` reads the chance collected so far (0 if none) and adds this one. Writing `= p` instead would forget the earlier slip.'],
    ['table[cell][action] = [', 'Turn the dict back into a list of `(p, nxt, reward)` tuples.'],
  ] } },
  { h: 'The maths: chances of everything that can happen add up to 1' },
  { md: `Write $P(s' \\mid s, a)$ for "the chance of ending up in $s'$ when you press $a$ in $s$" (read the bar as *given*). Two rules do all the work here:

1. **Addition rule.** If two events can't both happen (slipping left, and slipping up), the chance of "one or the other" is the sum. Two slips that end in the same square are one result: add their chances. That is the \`merged\` line.
2. **They add up to 1.** The outcomes listed are *everything* that can happen, so for every $s$ and $a$: $\\sum_{s'} P(s' \\mid s, a) = 1$. A table where that fails has a bug (you'll find one in Write it).` },
  { mathCode: [
    ['s', 'cell', 'the state (square) you are in'],
    ['a', 'action', 'the move you press'],
    ["s'", 'nxt', 'where you end up'],
    ["P(s' \\mid s, a)", 'p in table[s][a]', 'the chance of that outcome'],
    ["R(s, a, s')", 'reward', 'what that outcome pays'],
    ["\\sum_{s'} P(s' \\mid s, a) = 1", 'sum(p for p, _, _ in table[s][a])', 'all outcomes of one move, together'],
  ] },
  { predict: {
    id: 'moves-u-states', teach: "`build_table` gives a row to **every open square**: walls are skipped, and the goal gets a row too (an empty one). `SEVEN` has 31 open squares: you counted them in lesson 1.",
            prompt: '`table = build_table(parse_map(SEVEN), 0.2)`. How many keys (states) does `table` have?',
    answer: SEVEN_STATES, misconceptions: [{ answer: SEVEN_STATES - 1, feedback: 'The goal has a row too: an empty one. It is a state (you can be there), just one with no moves.' }, { answer: 49, feedback: 'Walls are skipped: you can never be inside a wall.' }],
    explain: `${SEVEN_STATES}: one per open square, the goal included (with an empty row).`,
  } },
  { predict: {
    id: 'moves-u-corner', teach: "The top-left corner of `SEVEN`:\n```\nS.#    row 0\n#.#    row 1\n```\nFrom (0, 0), left and up are off the map and down (1, 0) is a wall. Each of those three ends in the same result: stay at (0, 0) and pay \u22120.75. Results with the same place and payment are **merged into one outcome**.",
            prompt: 'On `SEVEN` with slip 0.2, how many outcomes are in `table[(0, 0)]["right"]`? (The top-left corner: off the map above and to the left, a wall below.)',
    answer: CORNER_OUTS,
    misconceptions: [{ answer: 4, feedback: 'Four executed directions, but three of them (left, up, down) all end with a bump at (0, 0). Merged, they are **one** outcome.' }],
    explain: `${CORNER_OUTS}: moving right, or bumping. The three blocked directions all end in "stay at (0, 0), pay ${BUMP}", which merge into one outcome with chance ${Number((3 * 0.05).toFixed(6))}.`,
  } },
  { choice: {
    id: 'moves-u-slip1', teach: "`move_chances(action, slip)` first gives **every** direction `slip / 4`. Then it adds `1 - slip` to the pressed one.",
            prompt: 'With `slip = 1.0`, what does `move_chances("right", 1.0)` return?',
    options: [
      { text: '`{"left": 0.25, "up": 0.25, "right": 0.25, "down": 0.25}`: the press makes no difference', why: 'Right: 1.0 / 4 everywhere, and the intended move gets 1 − 1.0 = 0 extra. Every move is a pure coin toss, so no plan can do better than any other.' },
      { text: '`{"right": 1.0}`', why: 'That is slip 0: always do what was pressed.' },
      { text: '`{"left": 0.0, "up": 0.0, "right": 0.0, "down": 0.0}`', why: 'Then the chances would add up to 0, but *something* always happens.' },
    ],
    answer: 0,
  } },
  { note: `What you built is a **Markov decision process (MDP)**: states, actions, the transition chances $P(s' \\mid s, a)$ and rewards $R$. "Markov" means the chances depend only on the square you are in now, not on how you got there. Lessons 4–7 *compute* the best behaviour from this table. Lessons 8–11 learn it **without ever seeing the table**, only by playing, which is what Q-learning does.`, kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const RANDOM = randomMaps(23, 2)
const tableCase = (text, name, slip, why) => ({ call: `sorted_table(build_table(parse_map(${name ?? pyText(text)}), ${slip}))`, expected: normSortedTable(buildTable(parseMap(text), slip)), why })
const chancesCase = (a, s) => ({ call: `move_chances("${a}", ${s})`, expected: norm(moveChances(a, s)) })

export const CHALLENGES_MOVES = [
  {
    id: 'moves-chances', piece: 'move_chances', title: 'Write move_chances', kind: 'write', uses: [],
    prompt: `\`move_chances(action, slip)\` returns a dict \`{direction: chance}\` for all four directions in \`ACTIONS\`: with chance \`slip\` the move is replaced by one of the four, picked evenly; otherwise it is \`action\`. For \`move_chances("right", 0.2)\` that is right 0.85 and 0.05 for each of the others.`,
    starter: `def move_chances(action, slip):
    chances = {}
    # every direction gets its share of the slips,
    # then the pressed one also gets the no-slip part
    return chances
`,
    solution: PIECES.move_chances.code,
    runCalls: ['move_chances("right", 0.2)', 'sum(move_chances("up", 0.3).values())'],
    cases: [chancesCase('right', 0), chancesCase('right', 0.2), chancesCase('up', 0.4), chancesCase('left', 1), chancesCase('down', 0.1)],
    hints: ['Start with `chances = {a: slip / 4 for a in ACTIONS}`: a dict comprehension, one entry per direction.', 'Then add the no-slip part to the pressed direction: `chances[action] += 1 - slip`.'],
  },
  {
    id: 'moves-table', piece: 'build_table', title: 'Write build_table', kind: 'write', uses: ['parse_map', 'legal_moves', 'move_chances'],
    prompt: `Write \`build_table(maze, slip=0.0)\`: \`table[cell][action]\` is a list of \`(chance, next cell, reward)\` for every open square and every action, with **results that end in the same place for the same reward merged into one** (their chances added). The goal's row is an empty dict. A move that is not legal leaves you where you are and pays \`BUMP\`; arriving at the goal pays \`GOAL\`; any other move pays \`STEP\`.

The checks sort each list of outcomes (\`sorted_table\`), so their order doesn't matter.`,
    starter: `def build_table(maze, slip=0.0):
    table = {}
    for cell, ch in maze["cells"].items():
        # skip walls; give every other square a row (the goal's stays empty)
        # for each action: add up the chance of each (where, reward) result
        pass
    return table
`,
    solution: PIECES.build_table.code,
    runCalls: ['build_table(parse_map(TINY))[(0, 0)]', 'build_table(parse_map(TINY), 0.2)[(0, 0)]["up"]', 'build_table(parse_map(TINY))[(2, 2)]'],
    cases: [
      tableCase(TINY, 'TINY', 0), tableCase(TINY, 'TINY', 0.2), tableCase(SMALL, 'SMALL', 0.2),
      { call: 'build_table(parse_map(TINY))[(2, 2)]', expected: {}, why: 'the goal has no moves' },
      { call: 'sorted(build_table(parse_map(TINY), 0.2)[(0, 0)]["up"], key=repr)', expected: normOutcomes([...TINY_UP].sort((x, y) => (pyOutcome(x) < pyOutcome(y) ? -1 : 1))), why: 'a corner, with merged bumps' },
      ...RANDOM.map((t, i) => tableCase(t, null, [0.1, 0.3][i], 'a random map')),
    ],
    hints: [
      '`if ch == "#": continue`, then `table[cell] = {}`, then `if cell == maze["goal"]: continue`.',
      '`moves = legal_moves(maze, cell)`, then for each `action` in `ACTIONS`, a fresh `merged = {}`.',
      'For each `executed, p` in `move_chances(action, slip).items()`: if `executed in moves`, `nxt = moves[executed]` and the reward is GOAL or STEP; otherwise `nxt, reward = cell, BUMP`.',
      '`merged[(nxt, reward)] = merged.get((nxt, reward), 0.0) + p`, and after the loop `table[cell][action] = [(p, nxt, reward) for (nxt, reward), p in merged.items()]`.',
    ],
  },
  {
    id: 'moves-fix-sum', piece: null, title: 'Bug hunt: the chances that don\'t add up', kind: 'fix', uses: ['parse_map', 'legal_moves', 'move_chances'],
    prompt: `This \`build_table\` looks almost right, and in the middle of the map it *is* right. But in a corner the chances of one move add up to less than 1. Run the second preset, which adds them up, and find the line.`,
    starter: PIECES.build_table.code.replace('merged[(nxt, reward)] = merged.get((nxt, reward), 0.0) + p', 'merged[(nxt, reward)] = p') + '\n',
    solution: PIECES.build_table.code,
    compare: '`merged[(nxt, reward)] = p` **replaces** the chance already collected for that result. In a corner, two or three different slips all end in "bump, stay here": each one overwrote the one before, so only the last slip\'s 0.05 survived. Reading the old value with `.get(..., 0.0)` and adding is the addition rule in code.',
    runCalls: ['build_table(parse_map(TINY), 0.2)[(0, 0)]["up"]', 'sum(p for p, _, _ in build_table(parse_map(TINY), 0.2)[(0, 0)]["up"])', 'sum(p for p, _, _ in build_table(parse_map(TINY), 0.2)[(1, 1)]["up"])'],
    cases: [tableCase(TINY, 'TINY', 0.2), tableCase(SMALL, 'SMALL', 0.4), tableCase(SEVEN, 'SEVEN', 0.2)],
    hints: ['Look at a corner square, where several directions are blocked. How many bumps are there, and how many survive in the list?', 'Which line writes into `merged`? Does it keep what was already there?'],
  },
]

export const KEEP_MOVES = {
  pieces: ['move_chances', 'build_table'],
  card: `**move_chances(action, slip)** → \`{direction: chance}\`: slip/4 each, plus 1 − slip for the pressed one.

**build_table(maze, slip)** → \`table[state][action] = [(chance, next, reward), ...]\`, results merged, chances adding up to 1. The goal's row is empty: the game ends there.`,
  remember: [
    'What you press and what happens are different: a move is a list of possible outcomes with chances.',
    'Two ways of reaching the same result are one outcome: add their chances (the addition rule).',
    'The chances of every outcome of one move add up to 1: a quick test that catches real bugs.',
    'Rewards say what you want: a small cost per step means "be quick".',
  ],
  ml: [['the table', 'transition model, $P(s\' \\mid s, a)$', 'how the world moves you'], ['STEP, BUMP, GOAL', 'reward function, $R$', 'what each outcome is worth'], ['the goal\'s empty row', 'terminal state', 'the episode ends there'], ['all of it together', 'MDP', 'a Markov decision process']],
  next: 'Lesson 3 plays the game: let chance pick an outcome, move, get paid, repeat until the cheese.',
}
