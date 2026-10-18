import React, { useMemo, useState } from 'react'
import MazeView from '../MazeView.jsx'
import MapEditor from '../MapEditor.jsx'
import Stepper, { Text } from '../Stepper.jsx'
import { ParsePicture, MovesPicture } from '../pictures.jsx'
import { traceParseMap, traceLegalMoves } from '../traces.js'
import { PIECES } from '../python/pieces.js'
import { TINY, SMALL, SEVEN, key, parseMap, legalMoves, openCells, tryParse } from '../world.js'
import { pyText, pyCellLit, normMaze, normMoves, randomMaps, someOpenCells } from './cases.js'
import { Choice, Predict } from '../Blocks.jsx'

// ---------------------------------------------------------------- Try it first
export const TRY_TEXT = 'S..#.\n.#...\n...#G\n.#...'
const TRY = parseMap(TRY_TEXT)
const MOUSE = key(2, 1)
const NEIGHBOURS = Object.values(legalMoves(TRY, MOUSE))
// Index of row 1, column 0 inside the one long string: each row is width + 1 characters (the newline).
const WIDTH = TRY.cols
export const INDEX_R1C0 = 1 * (WIDTH + 1) + 0

function FindSquare({ onDone }) {
  const [picked, setPicked] = useState(null)
  const right = picked === key(1, 3)
  const swapped = picked === key(3, 1)
  return (
    <div className="mlf-try-task">
      <p><strong>1.</strong> Rows are numbered down the left, columns along the top, both from 0. <strong>Click the square at row 1, column 3.</strong></p>
      <MazeView maze={TRY} size={46} rc onCell={c => { setPicked(c); if (c === key(1, 3)) onDone() }} marks={picked ? { [picked]: right ? 'good' : 'bad' } : {}} />
      {picked && !right && <p className="mlf-feedback bad" role="status">{swapped ? 'That is row 3, column 1: the two numbers swapped. On a graph you write (x, y), across then up. In a grid it is (row, column): first how far down, then how far across.' : 'Not that one. Find row 1 on the left (the second row, since counting starts at 0), then move across to column 3.'}</p>}
      {right && <p className="mlf-feedback good" role="status">✓ Row 1, column 3. Programs write this as the pair <code>(1, 3)</code>: row first.</p>}
    </div>
  )
}

function Neighbours({ onDone }) {
  const [chosen, setChosen] = useState(() => new Set())
  const [verdict, setVerdict] = useState(null)
  const toggle = c => { if (c === MOUSE || verdict?.ok) return; const s = new Set(chosen); s.has(c) ? s.delete(c) : s.add(c); setChosen(s); setVerdict(null) }
  function check() {
    const picked = [...chosen]
    const walls = picked.filter(c => TRY.cells[c] === '#')
    const diagonal = picked.filter(c => { const [r, cc] = c.split(',').map(Number); return Math.abs(r - 2) === 1 && Math.abs(cc - 1) === 1 })
    const missing = NEIGHBOURS.filter(c => !chosen.has(c))
    if (walls.length) return setVerdict({ text: 'One of those is a wall (dark). The mouse can\'t step into a wall.' })
    if (diagonal.length) return setVerdict({ text: 'A diagonal square is two moves away: the only moves are left, up, right and down.' })
    if (picked.some(c => !NEIGHBOURS.includes(c))) return setVerdict({ text: 'Only squares right next to the mouse (sharing a side) are one move away.' })
    if (missing.length) return setVerdict({ text: `There ${missing.length === 1 ? 'is one more' : `are ${missing.length} more`}.` })
    setVerdict({ ok: true }); onDone()
  }
  const marks = Object.fromEntries([...chosen].map(c => [c, verdict?.ok ? 'good' : 'focus']))
  return (
    <div className="mlf-try-task">
      <p><strong>2.</strong> The mouse moves one square at a time: left, up, right or down, never through a wall. <strong>Click every square it can reach in one move</strong>, then check.</p>
      <MazeView maze={TRY} size={46} rc agent={MOUSE} onCell={toggle} marks={marks} />
      <button type="button" className="mlf-primary" onClick={check} disabled={!chosen.size || verdict?.ok}>Check</button>
      {verdict && <p className={`mlf-feedback ${verdict.ok ? 'good' : 'bad'}`} role="status">{verdict.ok ? `✓ Just ${NEIGHBOURS.length}: walls above and below, and diagonals don't count. This is the question legal_moves answers.` : verdict.text}</p>}
    </div>
  )
}

export function TryMaps({ onDone }) {
  const [done, setDone] = useState([false, false, false, false])
  const mark = i => setDone(d => { const n = [...d]; n[i] = true; if (n.every(Boolean)) onDone(); return n })
  return (
    <div className="mlf-try">
      <p className="mlf-lead">A person writes a maze as text, one character per square: <code>#</code> a wall, <code>.</code> floor, <code>S</code> the start, <code>G</code> the cheese. A program has to turn that text into something it can ask questions of. First, answer those questions yourself.</p>
      <pre className="mlf-console mlf-map-text">{TRY_TEXT}</pre>
      <FindSquare onDone={() => mark(0)} />
      {done[0] && <Neighbours onDone={() => mark(1)} />}
      {done[1] && (
        <div className="mlf-try-task">
          <p><strong>3.</strong> To Python, the map above is <em>one</em> string: <code>text = "S..#.\n.#...\n..."</code>, where <code>\n</code> is the newline character that ends each row. Strings are indexed from 0.</p>
          <Choice spec={{
            id: 'maps-try-index', teach: "**How Python numbers a string's characters:** from 0. `text[0]` is the first character, `text[1]` the second, and so on.\n\nThe line break at the end of each row is a character too. It is written `\n` and sits right after the row's last square. So row 0 uses positions 0 to 4 for its five squares, and then one more for its newline.",
            prompt: 'What is `text[5]`?',
            options: [
              { text: '`"."`, the first square of row 1', why: 'Count again from 0: S is 0, then 1, 2, 3, 4 are the rest of row 0. Index 5 is the character *after* the last square of row 0.' },
              { text: '`"S"`', why: '`"S"` is `text[0]`, the very first character.' },
              { text: 'the newline character `"\\n"`', why: 'Right: indexes 0–4 are row 0, and 5 is the newline that ends it. Rows are separated by an invisible character, which is why counting into the string is error-prone.' },
              { text: '`"#"`', why: '`"#"` is at index 3, the fourth square of row 0.' },
            ],
            answer: 2,
          }} onDone={() => mark(2)} />
        </div>
      )}
      {done[2] && (
        <div className="mlf-try-task">
          <p><strong>4.</strong> So reaching a square inside the string takes arithmetic.</p>
          <Predict spec={{
            id: 'maps-try-formula', teach: `Row 0 takes up positions 0 to ${WIDTH}: ${WIDTH} squares, then its newline. Every row takes ${WIDTH} + 1 = ${WIDTH + 1} positions, so each new row starts ${WIDTH + 1} positions after the one before.`,
            prompt: `Every row is ${WIDTH} squares plus one newline. **At which index of \`text\` is row 1, column 0?**`,
            answer: INDEX_R1C0,
            misconceptions: [{ answer: WIDTH, feedback: `Index ${WIDTH} is the newline at the end of row 0. Row 1 starts one later.` }, { answer: 1, feedback: 'That counts rows, not characters. Every row before it uses up its squares *and* its newline.' }],
            explain: `row × (width + 1) + column = 1 × (${WIDTH} + 1) + 0 = ${INDEX_R1C0}. This works, but one slip (forgetting the + 1) points at the wrong square. A parser does that work once, carefully, and afterwards every square is simply \`cells[(r, c)]\`.`,
          }} onDone={() => mark(3)} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Watch it run
function WatchParse() {
  const [text, setText] = useState(TINY)
  const { frames } = useMemo(() => traceParseMap(text), [text])
  return (
    <div className="mlf-watch">
      <h3>parse_map, one line at a time</h3>
      <p>Watch the text on the left become the dict of squares on the right. It stops once to ask you where a character will be stored. Change the map (keep it small: every square is several steps) and the run starts again on yours.</p>
      <details className="mlf-change"><summary>Change the input</summary><MapEditor text={text} setText={setText} example={TINY} size={34} needPath={false} /></details>
      <Stepper code={PIECES.parse_map.code} frames={frames} Picture={ParsePicture} title="Step through parse_map" />
    </div>
  )
}

function WatchMoves() {
  const [text, setText] = useState(SEVEN)
  const maze = useMemo(() => tryParse(text).maze, [text])
  const [cell, setCell] = useState(key(2, 1))
  const at = maze && maze.cells[cell] && maze.cells[cell] !== '#' ? cell : openCells(maze)[0]
  const { frames } = useMemo(() => traceLegalMoves(maze, at), [maze, at])
  const Picture = useMemo(() => MovesPicture({ maze }), [maze])
  return (
    <div className="mlf-watch">
      <h3>legal_moves: which squares can I step to?</h3>
      <p>Pick a square to test, then step. It asks you where "up" leads, and whether a blocked move is kept.</p>
      <div className="mlf-picker">
        <span className="mlf-eyebrow">Square to test (click one)</span>
        <MazeView maze={maze} size={26} onCell={c => maze.cells[c] !== '#' && setCell(c)} marks={{ [at]: 'focus' }} compact />
      </div>
      <details className="mlf-change"><summary>Change the map</summary><MapEditor text={text} setText={setText} example={SEVEN} size={30} needPath={false} /></details>
      <Stepper code={PIECES.legal_moves.code} frames={frames} Picture={Picture} title="Step through legal_moves" />
    </div>
  )
}

export const WATCH_MAPS = [WatchParse, WatchMoves]

// ---------------------------------------------------------------- Understand
const SEVEN_MAZE = parseMap(SEVEN)
const SEVEN_OPEN = openCells(SEVEN_MAZE).length
const SEVEN_MOVES_21 = Object.keys(legalMoves(SEVEN_MAZE, key(2, 1))).length

export const UNDERSTAND_MAPS = [
  { h: 'The problem a parser solves' },
  { md: `Text is easy for a person to write and read, but a program can only *search* it. To answer "what is at row 2, column 3?" it would have to count characters, newlines included (you did that sum in Try it). **A parser reads the text once, carefully, and builds data that answers questions directly.**` },
  { code: { piece: 'parse_map', notes: [
    ['lines = [', '`text.strip()` removes the blank line a triple-quoted string starts and ends with. `.splitlines()` cuts at every newline. The `if line.strip()` part drops blank lines, and `line.strip()` removes stray spaces, so `"  S.#  "` and `"S.#"` read the same.'],
    ['width = len(lines[0])', 'The first row sets the width. Every other row is compared with it.'],
    ['for r, line in enumerate(lines):', '`enumerate` hands over **pairs**: the position and the item. `for r, line in ...` unpacks each pair into two names, so `r` is the row number without a separate counter.'],
    ['raise ValueError(f"row', '**Fail loudly, early, and say where.** A ragged map would give wrong answers much later, far from the cause. Raising here names the row.'],
    ['for c, ch in enumerate(line):', 'A string is a sequence of characters, so `enumerate` works on it too: `c` is the column, `ch` the character.'],
    ['cells[(r, c)] = ch', 'The **key** is the tuple `(r, c)`: an address. A dict finds a key in one step, however big the map (it turns the key into a number, a *hash*, that says where to look), so `cells[(r, c)]` is instant.'],
    ['if start is not None:', 'A second S would make "where does the game start?" ambiguous, so it is refused.'],
    ['return {"rows"', 'Plain dicts and tuples, no classes. Any later code can read them with ordinary indexing: `maze["cells"][(1, 2)]`.'],
  ] } },
  { choice: {
    id: 'maps-u-why-dict', teach: "**How a Python list treats a negative index:** `xs[-1]` is not an error. It means *the last item*, and `xs[-2]` is the one before it.\n\nA **dict**, on the other hand, only has the keys that were put in it. Asking whether a key is there, `key in d`, is a plain True or False.",
            prompt: 'Why does `cells` use the tuple `(r, c)` as its key, instead of keeping the rows as a list of strings and writing `rows[r][c]`?',
    options: [
      { text: 'A list of strings can\'t be indexed twice.', why: '`rows[r][c]` works fine in Python: `rows[r]` is a string, and `[c]` indexes into it.' },
      { text: '`rows[-1][c]` is legal Python: a negative index silently reads the *last* row. With a dict, `(-1, c)` is simply not a key, so "off the map" is a plain `in` test.', why: 'Yes. Lists wrap around at negative indexes (`[-1]` is the last item), so a move off the top edge lands on the bottom row with no error. The dict has exactly the squares that exist. You will fix exactly this bug in Write it.' },
      { text: 'Dicts use less memory than strings.', why: 'They use more. The dict is chosen for what it makes easy and safe, not for size.' },
    ],
    answer: 1,
  } },
  { h: 'legal_moves: four candidates, two tests' },
  { code: { piece: 'legal_moves', notes: [
    ['r, c = cell', 'Unpack the address into its two numbers.'],
    ['for action in ACTIONS:', '`ACTIONS = ["left", "up", "right", "down"]`: a fixed order, so the answer always lists moves in the same order.'],
    ['dr, dc = OFFSETS[action]', '`OFFSETS["up"]` is `(-1, 0)`: one row **less** (rows count downwards), same column. The moves are data, not four copies of an `if`.'],
    ['nxt = (r + dr, c + dc)', 'The square this move would reach.'],
    ['if nxt in maze["cells"] and', '`and` checks left to right and stops at the first False. Off the map, the first test fails, so `maze["cells"][nxt]` (which would raise KeyError) never runs.'],
  ] } },
  { mathCode: [
    ['(r, c)', 'cell', 'a square: row r (down), column c (across)'],
    ['(\\Delta r, \\Delta c)', 'dr, dc', 'how a move changes the address'],
    ['(r + \\Delta r,\\; c + \\Delta c)', 'nxt', 'where the move would go'],
    ['A(s)', 'legal_moves(maze, cell)', 'the moves allowed in square s'],
  ] },
  { predict: {
    id: 'maps-u-seven-open', teach: "`SEVEN` is this text (`#` is a wall; `.`, `S` and `G` are open):\n```\nS.#....\n#.#.##.\n....#..\n.####.#\n....#..\n###...#\n...##.G\n```\nCount the walls in each row and subtract from 49, or count the open squares directly.",
            prompt: `The 7 × 7 map \`SEVEN\` has 49 squares. After \`maze = parse_map(SEVEN)\`, how many squares are **not** walls? (Count the dots, S and G, or use the map in Watch it run.)`,
    answer: SEVEN_OPEN, misconceptions: [{ answer: 49, feedback: '49 is every square. Walls are stored in `cells` too, but the question asks for open ones.' }],
    explain: `${SEVEN_OPEN}. In code: \`len([c for c, ch in maze["cells"].items() if ch != "#"])\`. Each open square is a place the mouse can be: later lessons give each one a number.`,
  } },
  { predict: {
    id: 'maps-u-moves-21', teach: "Square `(2, 1)` is row 2, column 1 of `SEVEN` (rows and columns start at 0):\n```\nS.#....   row 0\n#.#.##.   row 1\n....#..   row 2\n.####.#   row 3\n```\n`legal_moves` tries its four neighbours: left (2, 0), up (1, 1), right (2, 2) and down (3, 1). It keeps the ones that are on the map and not `#`.",
            prompt: 'On `SEVEN`, how many moves does `legal_moves(maze, (2, 1))` return?',
    answer: SEVEN_MOVES_21,
    explain: `${SEVEN_MOVES_21}: ${Object.keys(legalMoves(SEVEN_MAZE, key(2, 1))).join(', ')}. Work it as the code does: the four offsets, then the two tests for each.`,
  } },
  { h: 'One map, three shapes' },
  { md: `The same map can be held in different shapes, chosen by the question asked most:
- **dict** \`cells[(r, c)]\` → the character: keeps everything, safe at the edges.
- **grid** of 0s and 1s, \`grid[r][c] == 1\` means open: compact, and the shape ML libraries (NumPy) work with. QMaze's maze is exactly this grid.
- **set** of wall addresses: "is it a wall?" is \`cell in walls\`.

All three must give the same answers. That idea, *a piece is defined by what it returns, not how it stores things*, is what lets later lessons swap one piece for another.` },
  { note: 'In reinforcement learning, a square is a **state** (everything the agent needs to know about where it is), the four moves are **actions**, and `legal_moves` is part of the **environment**: the rules of the world, which the learner does not control.', kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const RANDOM = randomMaps(11, 3)
const parseCase = (text, call = `parse_map(${pyText(text)})`) => ({ call, expected: normMaze(parseMap(text)) })
const movesCase = (text, cell, name) => ({ call: `legal_moves(parse_map(${name ?? pyText(text)}), ${pyCellLit(cell)})`, expected: normMoves(legalMoves(parseMap(text), cell)) })
const gridCase = (text, name, cell) => ({ call: `legal_moves_grid(${name}.split(), ${pyCellLit(cell)})`, expected: normMoves(legalMoves(parseMap(text), cell)) })

export const CHALLENGES_MAPS = [
  {
    id: 'maps-parse', piece: 'parse_map', title: 'Write parse_map', kind: 'write', uses: [],
    prompt: `Finish \`parse_map(text)\`. It must return the dict with \`"rows"\`, \`"cols"\`, \`"cells"\` (every square: \`(r, c)\` → its character), \`"start"\` and \`"goal"\` (the addresses of S and G), and **raise \`ValueError\`** when a row has the wrong length, a character isn't one of \`#.SG\`, or there is no S or no G.

Try \`parse_map(TINY)\` with ▶ Run first, and \`print\` inside the loop to watch it.`,
    starter: `def parse_map(text):
    lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
    width = len(lines[0])
    cells, start, goal = {}, None, None
    for r, line in enumerate(lines):
        # 1. if this row is not \`width\` long, raise ValueError
        # 2. for each character: refuse anything not in "#.SG",
        #    store it in cells under (r, c), and remember where S and G are
        pass
    # 3. no S or no G: raise ValueError
    return {"rows": len(lines), "cols": width, "cells": cells, "start": start, "goal": goal}
`,
    solution: PIECES.parse_map.code,
    runCalls: ['parse_map(TINY)', 'parse_map(SMALL)["cells"]', 'parse_map("S.#\\n#.\\n##G")'],
    cases: [
      parseCase(TINY, 'parse_map(TINY)'),
      parseCase(SMALL, 'parse_map(SMALL)'),
      { ...parseCase(RANDOM[0]), why: 'a random map' },
      { call: 'error_of(lambda: parse_map("S.#\\n#.\\n##G"))', expected: 'ValueError', why: 'a row too short' },
      { call: 'error_of(lambda: parse_map("S.#\\n#?.\\n##G"))', expected: 'ValueError', why: 'an unknown character' },
      { call: 'error_of(lambda: parse_map("S.#\\n#..\\n###"))', expected: 'ValueError', why: 'no G' },
      { call: 'error_of(lambda: parse_map("..#\\n#..\\n##G"))', expected: 'ValueError', why: 'no S' },
    ],
    hints: [
      'Inside the row loop, the first thing is `if len(line) != width: raise ValueError(...)`.',
      'Then a second loop, `for c, ch in enumerate(line):`, visits each character with its column.',
      '`if ch not in "#.SG": raise ValueError(...)`, then `cells[(r, c)] = ch`, then `if ch == "S": start = (r, c)` (the same for G).',
      'After both loops: `if start is None or goal is None: raise ValueError("a map needs one S and one G")`.',
    ],
  },
  {
    id: 'maps-moves', piece: 'legal_moves', title: 'Write legal_moves', kind: 'write', uses: ['parse_map'],
    prompt: `Write \`legal_moves(maze, cell)\`: a dict from move name to the square it reaches, for every move that **stays on the map** and **doesn't enter a wall**, in the order of \`ACTIONS\`. From \`(0, 0)\` in \`TINY\` that is \`{"right": (0, 1)}\`.

\`maze\` is what \`parse_map\` returns (yours, if you passed it).`,
    starter: `def legal_moves(maze, cell):
    r, c = cell
    moves = {}
    # for each action in ACTIONS: find the square it reaches with OFFSETS,
    # and keep it only if it is on the map and is not a wall ("#")
    return moves
`,
    solution: PIECES.legal_moves.code,
    runCalls: ['legal_moves(parse_map(TINY), (0, 0))', 'legal_moves(parse_map(TINY), (1, 1))', 'legal_moves(parse_map(SEVEN), (2, 1))'],
    cases: [
      movesCase(TINY, '0,0', 'TINY'), movesCase(TINY, '1,1', 'TINY'), movesCase(TINY, '2,2', 'TINY'),
      movesCase(SEVEN, '2,1', 'SEVEN'), movesCase(SEVEN, '0,1', 'SEVEN'), movesCase(SEVEN, '6,6', 'SEVEN'),
      ...RANDOM.slice(1).flatMap((t, i) => someOpenCells(t, 30 + i, 2).map(c => ({ ...movesCase(t, c), why: 'a random map' }))),
    ],
    hints: [
      '`for action in ACTIONS:` then `dr, dc = OFFSETS[action]` gives how that move changes the row and column.',
      'The new square is `nxt = (r + dr, c + dc)`.',
      'Keep it when `nxt in maze["cells"] and maze["cells"][nxt] != "#"`. The order of the two tests matters: why?',
    ],
  },
  {
    id: 'maps-fix-grid', piece: null, title: 'Bug hunt: the mouse that walks through the edge', kind: 'fix', uses: [],
    prompt: `Someone wrote legal moves for the **list of strings** shape (\`rows[r][c]\`). It passes on the middle squares but is wrong on some edges. Run \`legal_moves_grid(SMALL.split(), (0, 0))\`: the mouse is in the top-left corner. Which moves come back, and why are two of them impossible?

Fix the function so it returns the same answers as \`legal_moves\`.`,
    starter: `def legal_moves_grid(rows, cell):
    r, c = cell
    moves = {}
    for action in ACTIONS:
        dr, dc = OFFSETS[action]
        nr, nc = r + dr, c + dc
        if nr < len(rows) and nc < len(rows[0]) and rows[nr][nc] != "#":
            moves[action] = (nr, nc)
    return moves
`,
    solution: `def legal_moves_grid(rows, cell):
    r, c = cell
    moves = {}
    for action in ACTIONS:
        dr, dc = OFFSETS[action]
        nr, nc = r + dr, c + dc
        if 0 <= nr < len(rows) and 0 <= nc < len(rows[0]) and rows[nr][nc] != "#":
            moves[action] = (nr, nc)
    return moves`,
    compare: 'The bug: `rows[-1]` is not an error in Python, it is the **last** row. Going up from row 0 gives row −1, which silently wraps to the bottom. Checking `0 <= nr` (and `0 <= nc`) closes both edges. The dict version never had this problem, because `(-1, 0)` is simply not a key.',
    runCalls: ['legal_moves_grid(SMALL.split(), (0, 0))', 'legal_moves_grid(SMALL.split(), (1, 0))', 'SMALL.split()[-1]'],
    cases: [
      gridCase(SMALL, 'SMALL', '0,0'), gridCase(SMALL, 'SMALL', '1,0'), gridCase(SMALL, 'SMALL', '2,3'),
      gridCase(TINY, 'TINY', '1,1'), gridCase(SEVEN, 'SEVEN', '0,1'), gridCase(SEVEN, 'SEVEN', '4,0'), gridCase(SEVEN, 'SEVEN', '6,6'),
    ],
    hints: [
      'Run it on `(0, 0)` and look at the "up" entry: which row does it claim?',
      'Try `SMALL.split()[-1]` in the Run box. What does index −1 mean for a Python list?',
      'A row number is on the map only when `0 <= nr < len(rows)`. The same goes for columns.',
    ],
  },
]

export const KEEP_MAPS = {
  pieces: ['parse_map', 'legal_moves'],
  card: `**parse_map(text)** → \`{"rows", "cols", "cells", "start", "goal"}\`: every square by its address \`(r, c)\`, row first. Refuses ragged rows, unknown characters and a missing S or G, and says where.

**legal_moves(maze, cell)** → \`{move: next square}\` for moves that stay on the map and avoid walls, in the order of \`ACTIONS\`.`,
  remember: [
    'A parser does the error-prone work (counting into a string) once; afterwards every question is a lookup.',
    'Addresses are (row, column): down first, then across. Row numbers grow downwards, so "up" subtracts.',
    'Python lists accept negative indexes and wrap around: always check `0 <=` at the edges, or use a dict.',
    '`and` stops at the first False, which is what makes "on the map, and not a wall" safe.',
  ],
  ml: [['a square `(r, c)`', 'state', 'all the agent needs to know about where it is'], ['left, up, right, down', 'actions', 'what the agent can choose to do'], ['`legal_moves`, the map', 'environment', 'the rules of the world, which the learner cannot change']],
  next: 'Lesson 2 asks what a move **does**: the floor can be icy, walls bump, and the cheese pays. All of it goes into one table.',
}

export { Text }
