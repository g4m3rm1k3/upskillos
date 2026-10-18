// Frame generators for the step-through player. Each one walks the same steps as a Python
// function in python/pieces.js, line by line, and records which line ran, what it did (in words),
// every variable as Python would print it, and what the picture should show.
// traces.test.js checks each trace's final answer against the Python reference (on Pyodide)
// and that every line it points at exists in the code shown.
import { ACTIONS, OFFSETS, STEP, BUMP, GOAL, key, unkey, legalMoves, moveChances, sampleOutcome, best, makeRng, buildTable, parseMap, choose as chooseAction, bestOption, pySum } from './world.js'
import { PIECES, FINISH } from './python/pieces.js'

// ---- Python-style printing ----
export const pyNum = x => {
  if (typeof x !== 'number') return String(x)
  if (Number.isInteger(x)) return `${x}.0`
  return String(x)
}
export const pyInt = x => String(x)
export const pyStr = s => `'${s}'`
export const pyCell = k => { const [r, c] = unkey(k); return `(${r}, ${c})` }
export const pyList = xs => `[${xs.join(', ')}]`
export function pyDict(entries, max = 12) {
  const shown = entries.slice(0, max).map(([k, v]) => `${k}: ${v}`)
  return `{${shown.join(', ')}${entries.length > max ? `, … ${entries.length - max} more` : ''}}`
}
export const pyMoves = moves => pyDict(Object.entries(moves).map(([a, n]) => [pyStr(a), pyCell(n)]))
export const pyOutcome = ([p, n, r]) => `(${pyNum(p)}, ${pyCell(n)}, ${pyNum(r)})`

// Line numbers by the text they contain, so a trace never points at the wrong line when code changes.
export function lineFinder(code) {
  const lines = code.split('\n')
  return (text, after = 0) => {
    const k = lines.findIndex((l, i) => i + 1 > after && l.includes(text))
    if (k < 0) throw new Error(`no line containing ${JSON.stringify(text)}`)
    return k + 1
  }
}

// ---- parse_map ----
export function traceParseMap(text) {
  const L = lineFinder(PIECES.parse_map.code)
  const frames = []
  const lines = String(text).trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const cells = {}
  let start = null, goal = null
  const base = () => [['lines', pyList(lines.map(pyStr))]]
  const cellsRepr = () => pyDict(Object.entries(cells).map(([k, v]) => [pyCell(k), pyStr(v)]), 9)
  const state = extra => [...base(), ['width', pyInt(lines[0].length)], ['cells', cellsRepr()], ['start', start ? pyCell(start) : 'None'], ['goal', goal ? pyCell(goal) : 'None'], ...extra]
  const pic = (at, extra = {}) => ({ lines, cells: { ...cells }, at, ...extra })
  frames.push({ line: L('lines = ['), say: '`text.strip().splitlines()` cuts the text at every newline. Blank lines are dropped and each row is trimmed, so `lines` is a list of row strings.', vars: base(), pic: pic(null) })
  const width = lines[0].length
  frames.push({ line: L('width = len(lines[0])'), say: `Every row must be as long as the first: ${width} squares.`, vars: [...base(), ['width', pyInt(width)]], pic: pic(null) })
  frames.push({ line: L('cells, start, goal ='), say: '`cells` starts as an empty dict. It will map each square\'s address `(r, c)` to its character. `start` and `goal` are `None` until S and G are seen.', vars: state([]), pic: pic(null) })
  let askedKey = false
  lines.forEach((row, r) => {
    frames.push({ line: L('for r, line in enumerate'), say: `\`enumerate\` hands over the row number with the row: r = ${r}, line = '${row}'.`, vars: state([['r', pyInt(r)], ['line', pyStr(row)]]), pic: pic(null, { row: r }) })
    frames.push({ line: L('if len(line) != width'), say: `len('${row}') is ${row.length}, the same as width (${width}), so this row is fine.`, vars: state([['r', pyInt(r)], ['line', pyStr(row)]]), pic: pic(null, { row: r }) })
    ;[...row].forEach((ch, c) => {
      const at = key(r, c)
      const loopVars = () => state([['r', pyInt(r)], ['line', pyStr(row)], ['c', pyInt(c)], ['ch', pyStr(ch)]])
      frames.push({ line: L('for c, ch in enumerate(line)'), say: `Column ${c} of row ${r} holds '${ch}'.`, vars: loopVars(), pic: pic(at) })
      cells[at] = ch
      const ask = !askedKey && r >= 1 && c >= 1 && r !== c ? {
        kind: 'text', placeholder: '(row, column)',
        teach: 'The line is `cells[(r, c)] = ch`. The key is a **tuple** built from the two loop variables, in the order they are written: `r` first, then `c`. Python prints a tuple in round brackets with a comma: `(2, 5)`.',
        prompt: `The loop is at r = ${r}, c = ${c}. This line stores \`ch\` in \`cells\`. **Under which key?** Type it the way Python prints it.`,
        answer: `(${r}, ${c})`,
        misconceptions: [{ answer: `(${c}, ${r})`, feedback: `That is (column, row), the way x and y are written on a graph. Here the first number is the **row** (how far down) and the second is the **column** (how far across), because the outer loop is over rows: \`cells[(r, c)]\`.` }],
        explain: `Rows first, then columns: \`(r, c)\`. Grids, matrices and NumPy arrays in ML code all use this order.`,
      } : undefined
      if (ask) askedKey = true
      frames.push({ line: L('cells[(r, c)] = ch'), say: `Store it: cells[(${r}, ${c})] = '${ch}'. The tuple (${r}, ${c}) is the square's address.`, vars: loopVars(), pic: pic(at), ask })
      if (ch === 'S') { start = at; frames.push({ line: L('start = (r, c)'), say: `It's the start, so remember where: start = (${r}, ${c}).`, vars: loopVars(), pic: pic(at) }) }
      if (ch === 'G') { goal = at; frames.push({ line: L('goal = (r, c)'), say: `It's the goal (the cheese): goal = (${r}, ${c}).`, vars: loopVars(), pic: pic(at) }) }
    })
  })
  frames.push({ line: L('if start is None or goal is None'), say: `Both were found, so the map is accepted.`, vars: state([]), pic: pic(null) })
  frames.push({ line: L('return {"rows"'), say: `The answer is a plain dict: ${lines.length} rows, ${width} columns, every square by address, and where S and G are.`, vars: state([]), pic: pic(null, { done: true }) })
  return { frames, result: { rows: lines.length, cols: width, cells, start, goal } }
}

// ---- legal_moves ----
export function traceLegalMoves(maze, cell) {
  const L = lineFinder(PIECES.legal_moves.code)
  const frames = []
  const [r, c] = unkey(cell)
  const moves = {}
  const marks = { [cell]: 'focus' }
  const vars = extra => [['cell', pyCell(cell)], ['r', pyInt(r)], ['c', pyInt(c)], ['moves', pyMoves(moves)], ...extra]
  frames.push({ line: L('r, c = cell'), say: `Unpack the address: the square is in row ${r}, column ${c}.`, vars: vars([]), pic: { marks: { ...marks } } })
  frames.push({ line: L('moves = {}'), say: 'An empty dict that will collect `move name → square it leads to`.', vars: vars([]), pic: { marks: { ...marks } } })
  let askedCell = false, askedKeep = false
  for (const action of ACTIONS) {
    const [dr, dc] = OFFSETS[action]
    const nxtR = r + dr, nxtC = c + dc
    const nxt = key(nxtR, nxtC)
    const inMap = nxt in maze.cells
    const open = inMap && maze.cells[nxt] !== '#'
    const v = extra => vars([['action', pyStr(action)], ['dr', pyInt(dr)], ['dc', pyInt(dc)], ...extra])
    frames.push({ line: L('for action in ACTIONS'), say: `Try '${action}'.`, vars: vars([['action', pyStr(action)]]), pic: { marks: { ...marks } } })
    frames.push({ line: L('dr, dc = OFFSETS[action]'), say: `OFFSETS['${action}'] is (${dr}, ${dc}): ${dr ? `${dr > 0 ? 'one row down' : 'one row up'}` : 'same row'}, ${dc ? `${dc > 0 ? 'one column right' : 'one column left'}` : 'same column'}.`, vars: v([]), pic: { marks: { ...marks } } })
    const wrong = key(r - dr, c - dc)
    const cellAsk = !askedCell && action === 'up' && inMap ? {
      kind: 'cell',
      teach: 'Rows are numbered from 0 at the **top**, growing downwards. So a smaller row number is higher up the map. Add `dr` to the row and `dc` to the column.',
      prompt: `\`nxt = (r + dr, c + dc)\` with r = ${r}, c = ${c}, dr = ${dr}, dc = ${dc}. **Which square is nxt?** Click it.`,
      answer: nxt,
      misconceptions: [{ answer: wrong, feedback: `That's one row **down**. Row numbers grow downwards (row 0 is the top), so 'up' subtracts one: ${r} + (${dr}) = ${r + dr}.` }],
      explain: `Up means the row number gets smaller: row ${r} − 1 = row ${r - 1}.`,
    } : undefined
    if (cellAsk) askedCell = true
    const nm = { ...marks, ...(inMap ? { [nxt]: 'read' } : {}) }
    frames.push({ line: L('nxt = (r + dr, c + dc)'), say: `nxt = (${r} + ${dr}, ${c} + ${dc}) = (${nxtR}, ${nxtC})${inMap ? '' : ', which is off the map'}.`, vars: v([['nxt', `(${nxtR}, ${nxtC})`]]), pic: { marks: nm }, ask: cellAsk })
    const keepAsk = !askedKeep && !open && action !== 'up' ? {
      kind: 'choice',
      teach: 'A move is kept only if **both** tests are true: `nxt in maze["cells"]` (the square exists, so it is on the map) **and** `maze["cells"][nxt] != "#"` (it is not a wall). Find nxt on the map: off the edge, a dark wall, or open floor?',
      prompt: `Will '${action}' be added to \`moves\`? nxt = (${nxtR}, ${nxtC}).`,
      options: [
        { text: 'Yes', why: inMap ? `Look at what is at (${nxtR}, ${nxtC}): \`maze["cells"][nxt]\` is '#', a wall, so the second test fails.` : `(${nxtR}, ${nxtC}) is not a key of \`maze["cells"]\`: it is off the edge of the map, so the first test, \`nxt in maze["cells"]\`, is already False.` },
        { text: 'No' },
      ],
      answer: 1,
      explain: inMap ? 'Both tests must be true. The square is on the map but it is a wall.' : '`and` stops at the first False: off the map, so the wall test is never even looked at (which also means it can\'t crash on a missing key).',
    } : undefined
    if (keepAsk) askedKeep = true
    const why = !inMap ? `(${nxtR}, ${nxtC}) is not in maze["cells"]: off the map. Skip it.` : !open ? `(${nxtR}, ${nxtC}) is a wall ('#'). Skip it.` : `(${nxtR}, ${nxtC}) is on the map and not a wall.`
    if (inMap) marks[nxt] = open ? 'good' : 'bad'
    frames.push({ line: L('if nxt in maze["cells"]'), say: why, vars: v([['nxt', `(${nxtR}, ${nxtC})`]]), pic: { marks: { ...marks } }, ask: keepAsk })
    if (open) {
      moves[action] = nxt
      frames.push({ line: L('moves[action] = nxt'), say: `Keep it: moves['${action}'] = (${nxtR}, ${nxtC}).`, vars: v([['nxt', `(${nxtR}, ${nxtC})`]]), pic: { marks: { ...marks }, arrows: { ...Object.fromEntries(Object.entries(moves).map(([a]) => [cell, a])) } } })
    }
  }
  frames.push({ line: L('return moves'), say: `${Object.keys(moves).length} legal move${Object.keys(moves).length === 1 ? '' : 's'} from (${r}, ${c}).`, vars: vars([]), pic: { marks: { ...marks } } })
  return { frames, result: moves }
}

// ---- build_table, watched for one square and one move ----
const DIRS = { left: [-1, 0], up: [0, -1], right: [1, 0], down: [0, 1] }
export function traceBuildTable(maze, cell, action, slip) {
  const L = lineFinder(PIECES.build_table.code)
  const frames = []
  const moves = legalMoves(maze, cell)
  const chances = moveChances(action, slip)
  const merged = new Map()
  const mergedRepr = () => pyDict([...merged.values()].map(([p, n, r]) => [`(${pyCell(n)}, ${pyNum(r)})`, pyNum(p)]))
  const flows = () => [...merged.values()].map(([p, n, r], i) => ({ from: cell, to: n, p, bump: n === cell, dir: n === cell ? DIRS[[...merged.keys()][i].split('|')[2]] : undefined, label: Number(p.toFixed(3)).toString() }))
  const base = extra => [['cell', pyCell(cell)], ['action', pyStr(action)], ['slip', pyNum(slip)], ['moves', pyMoves(moves)], ...extra]
  frames.push({ line: L('for cell, ch in maze["cells"].items()'), say: `The loop visits every square; we watch it at ${pyCell(cell)}. (Every other open square is filled in exactly the same way. Click another square to watch that one.)`, vars: base([]), pic: { marks: { [cell]: 'focus' }, flows: [] } })
  frames.push({ line: L('moves = legal_moves(maze, cell)'), say: `The piece from lesson 1 says which neighbours are open: ${Object.keys(moves).join(', ') || 'none'}.`, vars: base([]), pic: { marks: { [cell]: 'focus', ...Object.fromEntries(Object.values(moves).map(n => [n, 'good'])) }, flows: [] } })
  frames.push({ line: L('for action in ACTIONS'), say: `Now the move '${action}'. (The other three moves get the same treatment.)`, vars: base([]), pic: { marks: { [cell]: 'focus' }, flows: [] } })
  frames.push({ line: L('merged = {}'), say: '`merged` will add up the chance of each different result, keyed by (where you end up, what you are paid).', vars: base([['merged', '{}']]), pic: { marks: { [cell]: 'focus' }, flows: [] } })
  const intended = 1 - slip + slip / 4
  let askedChance = false, askedMerge = false
  for (const [executed, p] of Object.entries(chances)) {
    const v = extra => base([['executed', pyStr(executed)], ['p', pyNum(p)], ['merged', mergedRepr()], ...extra])
    const chanceAsk = !askedChance && slip > 0 && executed === action ? {
      kind: 'number',
      teach: `\`move_chances\` builds the chances in two parts. First, **slips**: every direction, the pressed one included, gets slip ÷ 4 = ${slip / 4}. Then, **no slip**: the pressed direction also gets 1 − slip = ${Number((1 - slip).toFixed(6))}. Add the parts that apply.`,
      prompt: `slip = ${slip}. With chance ${slip} the move is replaced by one of the four, picked evenly. **What is p for the intended move '${action}'?**`,
      answer: intended, tolerance: 1e-6,
      misconceptions: [{ answer: 1 - slip, feedback: `${1 - slip} counts only the times nothing slips. But when it does slip, the random pick can land on '${action}' too, one time in four: add ${slip} ÷ 4 = ${slip / 4}.` }, { answer: slip / 4, feedback: `${slip / 4} is just the slipped share. The move also happens every time nothing slips (chance ${1 - slip}).` }],
      explain: `p = (1 − ${slip}) + ${slip} ÷ 4 = ${Number(intended.toFixed(6))}. This is what \`move_chances\` computes: every move gets slip/4, then the intended one gets 1 − slip more.`,
    } : undefined
    if (chanceAsk) askedChance = true
    frames.push({ line: L('for executed, p in move_chances(action, slip)'), say: `With chance ${pyNum(p)} the move actually carried out is '${executed}'.`, vars: v([]), pic: { marks: { [cell]: 'focus' }, flows: flows() }, ask: chanceAsk })
    if (p === 0) { frames.push({ line: L('if p == 0'), say: 'That can never happen (chance 0), so it adds nothing.', vars: v([]), pic: { marks: { [cell]: 'focus' }, flows: flows() } }); continue }
    let nxt, reward
    if (executed in moves) {
      nxt = moves[executed]; reward = nxt === maze.goal ? GOAL : STEP
      frames.push({ line: L('nxt = moves[executed]'), say: `'${executed}' is open, so you arrive at ${pyCell(nxt)}.`, vars: v([['nxt', pyCell(nxt)]]), pic: { marks: { [cell]: 'focus', [nxt]: 'read' }, flows: flows() } })
      frames.push({ line: L('reward = GOAL if'), say: nxt === maze.goal ? `That's the cheese: reward = GOAL = ${GOAL}.` : `An ordinary step costs a little: reward = STEP = ${STEP}.`, vars: v([['nxt', pyCell(nxt)], ['reward', pyNum(reward)]]), pic: { marks: { [cell]: 'focus', [nxt]: 'read' }, flows: flows() } })
    } else {
      nxt = cell; reward = BUMP
      frames.push({ line: L('nxt, reward = cell, BUMP'), say: `'${executed}' hits a wall or the edge: you stay where you are and pay BUMP = ${BUMP}.`, vars: v([['nxt', pyCell(nxt)], ['reward', pyNum(reward)]]), pic: { marks: { [cell]: 'focus' }, flows: flows() } })
    }
    const k = `${nxt}|${reward}|${executed}`
    const sameKey = [...merged.keys()].find(m => m.startsWith(`${nxt}|${reward}|`))
    const before = sameKey ? merged.get(sameKey)[0] : 0
    const mergeAsk = !askedMerge && sameKey ? {
      kind: 'number',
      teach: '`merged.get(key, 0.0)` reads the chance already stored under that key (0.0 if there is none yet). `+ p` adds the chance of this slip to it, and `=` stores the sum back. So the chances of different slips that end in the same place **accumulate**.',
      prompt: `\`merged\` already has the key (${pyCell(nxt)}, ${pyNum(reward)}) with ${pyNum(before)}. This line adds p = ${pyNum(p)}. **What will merged[(${pyCell(nxt)}, ${pyNum(reward)})] be?**`,
      answer: before + p, tolerance: 1e-6,
      misconceptions: [{ answer: p, feedback: `That would *replace* the old chance. \`merged.get(key, 0.0) + p\` reads what is there (${pyNum(before)}) and adds to it: two different slips that end in the same place are one result with their chances added.` }],
      explain: `${pyNum(before)} + ${pyNum(p)} = ${Number((before + p).toFixed(6))}. Two ways of ending up in the same place, paid the same, are **one** result whose chance is the sum.`,
    } : undefined
    if (mergeAsk) askedMerge = true
    if (sameKey) merged.set(sameKey, [before + p, nxt, reward]); else merged.set(k, [p, nxt, reward])
    frames.push({ line: L('merged[(nxt, reward)] ='), say: sameKey ? `This result is already in merged, so its chance grows: ${pyNum(before)} + ${pyNum(p)} = ${pyNum(before + p)}.` : `A new result: (${pyCell(nxt)}, ${pyNum(reward)}) with chance ${pyNum(p)}.`, vars: v([['nxt', pyCell(nxt)], ['reward', pyNum(reward)]]), pic: { marks: { [cell]: 'focus' }, flows: flows() }, ask: mergeAsk })
  }
  const outcomes = [...merged.values()]
  const total = outcomes.reduce((s, o) => s + o[0], 0)
  frames.push({ line: L('table[cell][action] = [(p, nxt, reward)'), say: `table[${pyCell(cell)}]['${action}'] is a list of ${outcomes.length} outcome${outcomes.length === 1 ? '' : 's'}: (chance, where, payment). The chances add up to ${Number(total.toFixed(9))}.`, vars: base([['merged', mergedRepr()], ['table[cell][action]', pyList(outcomes.map(pyOutcome))]]), pic: { marks: { [cell]: 'focus' }, flows: flows() } })
  return { frames, result: outcomes }
}

// ---- play_episode with a plan and a loaded dice ----
export function tracePlayEpisode(maze, plan, us, slip, cap = 30) {
  const table = buildTable(maze, slip)
  const L = lineFinder(PIECES.play_episode.code)
  const LS = lineFinder(PIECES.sample_outcome.code)
  const frames = []
  let state = maze.start, total = 0, k = 0
  const path = [state]
  const vars = extra => [['state', pyCell(state)], ['path', pyList(path.map(pyCell))], ['total', pyNum(Number(total.toFixed(10)))], ...extra]
  frames.push({ line: L('state, path, total = start'), say: `Start on S at ${pyCell(state)}, with nothing earned yet.`, vars: vars([]), pic: { agent: state, path: [...path] } })
  let askedWhere = false
  while (Object.keys(table[state]).length && path.length <= cap) {
    frames.push({ line: L('while table[state] and'), say: `${pyCell(state)} still has moves (it isn't the goal), so keep playing.`, vars: vars([]), pic: { agent: state, path: [...path] } })
    const action = plan[state] ?? 'right'
    frames.push({ line: L('action = choose(state)'), say: `\`choose\` is whatever function was passed in. Here it is a fixed plan, and it says '${action}'.`, vars: vars([['action', pyStr(action)]]), pic: { agent: state, path: [...path], arrow: action } })
    if (k >= us.length) break
    const u = us[k++]
    const outcomes = table[state][action]
    const [nxt, reward] = sampleOutcome(outcomes, u)
    const whereAsk = !askedWhere && outcomes.length > 1 ? {
      kind: 'cell',
      teach: 'Each outcome is a piece of the bar from 0 to 1, as wide as its chance, laid end to end in the order of the list. The legend under the bar gives the range of each piece: it starts where the previous piece ended. **u lands in exactly one piece**: the one whose range contains it. That outcome is what happens.',
      prompt: `The dice gives u = ${u}. The bar shows the outcomes of '${action}' laid end to end, each as wide as its chance. **Where does the mouse end up?** Click the square.`,
      answer: nxt,
      misconceptions: outcomes.filter(o => o[1] !== nxt).map(o => ({ answer: o[1], feedback: `Walk along the bar from 0, adding each chance, and stop at the first piece whose running total is bigger than u = ${u}. ${o[1] === state ? 'Staying put (a bump) is not where u lands.' : ''}` })),
      explain: `\`sample_outcome\` adds the chances one by one; the first running total above u = ${u} picks the outcome.`,
    } : undefined
    if (whereAsk) askedWhere = true
    frames.push({ line: L('state, reward = sample_outcome'), say: `rng.random() gave u = ${u}. Along the bar of chances, u falls in the piece for ${pyCell(nxt)}${nxt === state ? ' (a bump: you stay put)' : ''}, paid ${pyNum(reward)}.`, vars: vars([['action', pyStr(action)], ['u', String(u)]]), pic: { agent: state, path: [...path], bar: { outcomes, u, picked: nxt }, arrow: action }, ask: whereAsk })
    state = nxt
    path.push(state)
    frames.push({ line: L('path.append(state)'), say: `Move to ${pyCell(state)} and add it to the path.`, vars: vars([['action', pyStr(action)], ['reward', pyNum(reward)]]), pic: { agent: state, path: [...path], bar: { outcomes, u, picked: nxt } } })
    total += reward
    frames.push({ line: L('total += reward'), say: `Add the payment: total is now ${Number(total.toFixed(6))}.`, vars: vars([['action', pyStr(action)], ['reward', pyNum(reward)]]), pic: { agent: state, path: [...path] } })
  }
  const done = Object.keys(table[state]).length === 0
  frames.push({ line: L('return path, total'), say: done ? `The cheese! The game ended after ${path.length - 1} moves with total ${Number(total.toFixed(6))}.` : `Stopped after ${path.length - 1} moves without reaching the cheese.`, vars: vars([]), pic: { agent: state, path: [...path] } })
  void LS
  return { frames, result: { path, total } }
}

// ---- one game of the finished learner (lesson 0) ----
// `code` is lesson 0's program by default, or the A2 piece `train`, where the target and the nudge
// are both inside one q_update(...) line.
export function traceTrainEpisode(maze, { alpha = 0.5, g = 0.9, eps = 0.1, slip = 0, seed = 3, warm = 0, cap = 40, code = FINISH } = {}) {
  const find = lineFinder(code)
  const L = (text, fallback = 'q_update(q, state') => { try { return find(text) } catch { return find(fallback) } }
  const table = buildTable(maze, slip)
  const rng = makeRng(seed)
  const q = Object.fromEntries(Object.keys(table).map(s => [s, Object.fromEntries(Object.keys(table[s]).map(a => [a, 0]))]))
  // Optionally play some games first, without recording, so the watched one shows learning in progress.
  for (let e = 0; e < warm; e++) {
    let s = maze.start
    for (let t = 0; t < 200 && Object.keys(table[s]).length; t++) {
      const a = chooseAction(q[s], eps, rng)
      const [n, r] = sampleOutcome(table[s][a], rng.random())
      q[s][a] += alpha * (r + g * best(q[n]) - q[s][a])
      s = n
    }
  }
  const frames = []
  const heat = () => Object.fromEntries(Object.keys(q).filter(s => Object.keys(table[s]).length).map(s => [s, best(q[s])]))
  const labels = () => Object.fromEntries(Object.entries(heat()).map(([s, v]) => [s, v === 0 ? '0' : v.toFixed(2)]))
  const row = s => pyDict(Object.entries(q[s]).map(([a, v]) => [pyStr(a), pyNum(Number(v.toFixed(4)))]))
  let state = maze.start
  const pic = extra => ({ agent: state, heat: heat(), labels: labels(), ...extra })
  frames.push({ line: L('state = maze["start"]'), say: `A new game${warm ? ` (after ${warm} games of practice)` : ', the very first'}: the mouse is put on S. The numbers on the map are the best guess so far of what each square is worth.`, vars: [['state', pyCell(state)], ['q[state]', row(state)]], pic: pic({}) })
  let askedTarget = false, askedUpdate = false
  for (let t = 0; t < cap && Object.keys(table[state]).length; t++) {
    const before = q[state]
    const a = chooseAction(before, eps, rng)
    frames.push({ line: L('action = choose(q[state], eps, rng)'), say: `choose: usually the move with the highest guess (ties broken at random), sometimes (chance ${eps}) a random one. It picks '${a}'.`, vars: [['state', pyCell(state)], ['q[state]', row(state)], ['action', pyStr(a)]], pic: pic({ arrow: a }) })
    const u = rng.random()
    const [nxt, reward] = sampleOutcome(table[state][a], u)
    frames.push({ line: L('nxt, reward = sample_outcome'), say: nxt === state ? `Bump! '${a}' hits a wall: the mouse stays at ${pyCell(state)} and pays ${reward}.` : `The mouse moves to ${pyCell(nxt)} and is paid ${reward}${nxt === maze.goal ? ' (the cheese!)' : ''}.`, vars: [['state', pyCell(state)], ['action', pyStr(a)], ['nxt', pyCell(nxt)], ['reward', pyNum(reward)], ['q[nxt]', row(nxt)]], pic: pic({ arrow: a, next: nxt }) })
    const old = q[state][a]
    const bn = best(q[nxt])
    const target = reward + g * bn
    const tAsk = !askedTarget && bn !== 0 ? {
      kind: 'number',
      prompt: `target = reward + g × best(q[nxt]), with reward = ${reward}, g = ${g}, and the best guess in q[nxt] = ${Number(bn.toFixed(4))}. **What is target?** (4 decimal places is plenty.)`,
      answer: Number((reward + g * Number(bn.toFixed(4))).toFixed(4)), tolerance: 6e-4,
      misconceptions: [{ answer: Number((reward + Number(bn.toFixed(4))).toFixed(4)), tolerance: 6e-4, feedback: `That adds the whole next guess. It is multiplied by g = ${g} first: later rewards count for a bit less (lesson 6).` }, { answer: reward, tolerance: 1e-6, feedback: 'That is only what was paid now. The target also counts what the next square is worth (lesson 5).' }],
      explain: `${reward} + ${g} × ${Number(bn.toFixed(4))} = ${target.toFixed(4)}: what you got now, plus what the square you reached is worth.`,
    } : undefined
    if (tAsk) askedTarget = true
    frames.push({ line: L('target = reward + g * best(q[nxt])'), say: `What this move turned out to be worth: ${reward} now, plus ${g} × ${Number(bn.toFixed(4))} for where it led = ${Number(target.toFixed(4))}.`, vars: [['state', pyCell(state)], ['action', pyStr(a)], ['reward', pyNum(reward)], ['best(q[nxt])', pyNum(Number(bn.toFixed(4)))], ['target', pyNum(Number(target.toFixed(4)))]], pic: pic({ arrow: a, next: nxt }), ask: tAsk })
    q[state][a] = old + alpha * (target - old)
    const uAsk = !askedUpdate && tAsk === undefined && old !== 0 ? {
      kind: 'number',
      prompt: `The old guess q[state]['${a}'] is ${Number(old.toFixed(4))}, target is ${Number(target.toFixed(4))}, alpha = ${alpha}. \`q += alpha * (target - q)\`. **What is the new guess?**`,
      answer: Number((Number(old.toFixed(4)) + alpha * (Number(target.toFixed(4)) - Number(old.toFixed(4)))).toFixed(4)), tolerance: 6e-4,
      misconceptions: [{ answer: Number(target.toFixed(4)), tolerance: 6e-4, feedback: `That jumps all the way to the target. alpha = ${alpha} moves it only part of the way: one game's evidence is noisy (lesson 9).` }],
      explain: `${Number(old.toFixed(4))} + ${alpha} × (${Number(target.toFixed(4))} − ${Number(old.toFixed(4))}) = ${q[state][a].toFixed(4)}: halfway from the old guess to the new evidence.`,
    } : undefined
    if (uAsk) askedUpdate = true
    frames.push({ line: L('q[state][action] += alpha'), say: `Nudge the guess for '${a}' at ${pyCell(state)} from ${Number(old.toFixed(4))} toward ${Number(target.toFixed(4))} by alpha = ${alpha} of the gap: now ${Number(q[state][a].toFixed(4))}.`, vars: [['state', pyCell(state)], ['action', pyStr(a)], ['target', pyNum(Number(target.toFixed(4)))], ['q[state]', row(state)]], pic: pic({ arrow: a, next: nxt, glow: state }), ask: uAsk })
    state = nxt
    frames.push({ line: L('state = nxt'), say: `Carry on from ${pyCell(state)}.`, vars: [['state', pyCell(state)], ['q[state]', Object.keys(table[state]).length ? row(state) : '{}']], pic: pic({}) })
  }
  return { frames, q }
}

// For tests: run traceParseMap etc. and compare their `result` with the Python reference.
export const TRACE_CODE = { parseMap: PIECES.parse_map.code, legalMoves: PIECES.legal_moves.code, buildTable: PIECES.build_table.code, playEpisode: PIECES.play_episode.code, train: FINISH }
export { parseMap }

// ---- option_values + best_option (lesson 4) ----
const round4 = x => Number(x.toFixed(4))
export function traceOptionValues(table, state, values, g = 1) {
  const L = lineFinder(`${PIECES.option_values.code}\n\n${PIECES.best_option.code}`)
  const frames = []
  const DIR = { left: [-1, 0], up: [0, -1], right: [1, 0], down: [0, 1] }
  const labels = Object.fromEntries(Object.entries(values).map(([s, v]) => [s, v.toFixed(2)]))
  const row = {}
  const rowRepr = () => pyDict(Object.entries(row).map(([a, v]) => [pyStr(a), pyNum(round4(v))]))
  let askedPart = false, askedBest = false
  for (const [action, outs] of Object.entries(table[state])) {
    let sum = 0
    frames.push({ line: L('return {action: sum('), say: `The move '${action}': ${outs.length} possible outcome${outs.length > 1 ? 's' : ''}. Its worth is the sum, over them, of chance × (payment + worth of where you land).`, vars: [['state', pyCell(state)], ['g', pyNum(g)], ['action', pyStr(action)], ['row so far', rowRepr()]], pic: { marks: { [state]: 'focus' }, labels, flows: outs.map(([p, n]) => ({ from: state, to: n, p, bump: n === state, dir: DIR[action], label: String(round4(p)) })) } })
    outs.forEach(([p, n, r], k) => {
      const part = p * (r + g * values[n])
      const partAsk = !askedPart && outs.length > 1 && k === 0 && values[n] !== 0 ? {
        kind: 'number',
        teach: `One outcome adds **chance × (payment + g × worth of where you land)**. Do the bracket first: the payment plus g times the worth (the number on that square), then multiply by the chance.`,
        prompt: `This outcome has chance p = ${round4(p)}, pays r = ${r}, and lands on ${pyCell(n)}, whose worth is ${round4(values[n])}. g = ${g}. **What does it add?**`,
        answer: round4(p * (r + g * round4(values[n]))), tolerance: 6e-4,
        misconceptions: [{ answer: round4(p * r + g * round4(values[n])), tolerance: 6e-4, feedback: 'The chance multiplies the **whole** bracket, the worth of where you land included: that worth is only reached in this outcome, so it counts only in this share of the games.' }, { answer: round4(r + g * round4(values[n])), tolerance: 6e-4, feedback: `That is what this outcome is worth *if* it happens. It happens with chance ${round4(p)}, so it adds that share.` }],
        explain: `${round4(p)} × (${r} + ${g} × ${round4(values[n])}) = ${round4(part)}. Over many games this outcome happens in ${Math.round(p * 100)}% of them, so it contributes that share of its worth to the average.`,
      } : undefined
      if (partAsk) askedPart = true
      sum += part
      frames.push({ line: L('return {action: sum('), say: `Outcome ${k + 1}: chance ${round4(p)} × (${r} + ${g} × ${round4(values[n])}) = ${round4(part)}. Running sum: ${round4(sum)}.`, vars: [['state', pyCell(state)], ['action', pyStr(action)], ['p', pyNum(round4(p))], ['nxt', pyCell(n)], ['reward', pyNum(r)], ['values[nxt]', pyNum(round4(values[n]))], ['sum so far', pyNum(round4(sum))]], pic: { marks: { [state]: 'focus', [n]: 'read' }, labels, flows: [{ from: state, to: n, p, bump: n === state, dir: DIR[action], label: String(round4(p)) }] }, ask: partAsk })
    })
    // The row itself is added the way Python's sum() adds (compensated), so ties break the same way.
    row[action] = pySum(outs.map(([p, n, r]) => p * (r + g * values[n])))
    frames.push({ line: L('for action, outcomes in table[state].items()}'), say: `So '${action}' is worth ${round4(sum)} from ${pyCell(state)}.`, vars: [['state', pyCell(state)], ['row', rowRepr()]], pic: { marks: { [state]: 'focus' }, labels, arrows: { [state]: action } } })
  }
  const [ba, bv] = bestOption(row)
  const sorted = Object.entries(row).sort((a, b) => b[1] - a[1])
  const bestAsk = !askedBest && sorted.length > 1 ? {
    kind: 'choice',
    teach: '`best_option` walks through the row and keeps the move with the **highest** worth. Worths here are often negative: −0.1 is higher than −0.5. On a tie, the move met first (the order of ACTIONS) stays.',
    prompt: `The row is ${rowRepr()}. **Which move will \`best_option\` return?**`,
    options: Object.keys(row).map(a => ({ text: `'${a}'`, why: a === ba ? `${round4(row[a])} is the highest worth in the row.` : `'${a}' is worth ${round4(row[a])}, less than '${ba}' at ${round4(bv)}.` })),
    answer: Object.keys(row).indexOf(ba),
    explain: `The highest number is ${round4(bv)}, for '${ba}'.`,
  } : undefined
  if (bestAsk) askedBest = true
  frames.push({ line: L('return best_action, best_value'), say: `best_option picks the highest: '${ba}', worth ${round4(bv)}. That is the move to make from ${pyCell(state)}, and ${round4(bv)} is what the square itself is worth when you play well.`, vars: [['row', rowRepr()], ['best_action', pyStr(ba)], ['best_value', pyNum(round4(bv))]], pic: { marks: { [state]: 'good' }, labels, arrows: { [state]: ba } }, ask: bestAsk })
  return { frames, result: row }
}
