// The lab's world engine, in JavaScript: the same pieces the learner writes in Python
// (python/pieces.js), so the page can draw, animate and grade them instantly.
// `pieces.test.js` runs the Python reference pieces on real Pyodide and checks they agree
// with these functions on the lesson maps and on random ones.
//
// A cell is the string "r,c" here (a JavaScript object key); in Python it is the tuple (r, c).

export const ACTIONS = ['left', 'up', 'right', 'down']
export const OFFSETS = { left: [0, -1], up: [-1, 0], right: [0, 1], down: [1, 0] }
export const ARROW = { left: '←', up: '↑', right: '→', down: '↓' }
export const STEP = -0.04, BUMP = -0.75, GOAL = 1.0

export const key = (r, c) => `${r},${c}`
export const unkey = k => k.split(',').map(Number)

export const TINY = 'S.#\n#..\n##G'
export const SEVEN = [
  'S.#....',
  '#.#.##.',
  '....#..',
  '.####.#',
  '....#..',
  '###...#',
  '...##.G',
].join('\n')
export const SMALL = ['S...', '.##.', '...G'].join('\n')

// Every way parse_map can refuse a map, with the same message the Python reference raises.
export function parseMap(text) {
  const lines = String(text).trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (!lines.length) throw new Error('the map is empty')
  const width = lines[0].length
  const cells = {}
  let start = null, goal = null
  lines.forEach((line, r) => {
    if (line.length !== width) throw new Error(`row ${r} has ${line.length} squares, expected ${width}`)
    ;[...line].forEach((ch, c) => {
      if (!'#.SG'.includes(ch)) throw new Error(`unknown square '${ch}' at row ${r}, column ${c}`)
      cells[key(r, c)] = ch
      if (ch === 'S') { if (start) throw new Error('more than one S'); start = key(r, c) }
      if (ch === 'G') { if (goal) throw new Error('more than one G'); goal = key(r, c) }
    })
  })
  if (!start || !goal) throw new Error('a map needs one S and one G')
  return { rows: lines.length, cols: width, cells, start, goal }
}

export function tryParse(text) {
  try { return { maze: parseMap(text) } } catch (e) { return { error: e.message } }
}

export const render = maze => Array.from({ length: maze.rows }, (_, r) =>
  Array.from({ length: maze.cols }, (_, c) => maze.cells[key(r, c)]).join('')).join('\n')

export function legalMoves(maze, cell) {
  const [r, c] = unkey(cell)
  const moves = {}
  for (const a of ACTIONS) {
    const [dr, dc] = OFFSETS[a]
    const nxt = key(r + dr, c + dc)
    if (nxt in maze.cells && maze.cells[nxt] !== '#') moves[a] = nxt
  }
  return moves
}

export const openCells = maze => Object.keys(maze.cells).filter(k => maze.cells[k] !== '#')

// With chance `slip` the move is replaced by one of the four, picked evenly (the intended one included).
export function moveChances(action, slip) {
  const chances = Object.fromEntries(ACTIONS.map(a => [a, slip / 4]))
  chances[action] += 1 - slip
  return chances
}

// table[cell][action] = [[p, next, reward], ...]; the goal has no actions (the game is over).
export function buildTable(maze, slip = 0) {
  const table = {}
  for (const cell of Object.keys(maze.cells)) {
    if (maze.cells[cell] === '#') continue
    table[cell] = {}
    if (cell === maze.goal) continue
    const moves = legalMoves(maze, cell)
    for (const action of ACTIONS) {
      const merged = new Map()
      for (const [executed, p] of Object.entries(moveChances(action, slip))) {
        if (p === 0) continue
        let nxt, reward
        if (executed in moves) { nxt = moves[executed]; reward = nxt === maze.goal ? GOAL : STEP }
        else { nxt = cell; reward = BUMP }
        const k = `${nxt}|${reward}`
        merged.set(k, [(merged.get(k)?.[0] ?? 0) + p, nxt, reward])
      }
      table[cell][action] = [...merged.values()]
    }
  }
  return table
}

// Walk along the chances until the running total passes u (a number in [0, 1)).
export function sampleOutcome(outcomes, u) {
  let running = 0
  for (const [p, nxt, reward] of outcomes) {
    running += p
    if (u < running) return [nxt, reward]
  }
  const [, nxt, reward] = outcomes[outcomes.length - 1]
  return [nxt, reward]
}

// A small seeded generator (mulberry32), so a "seed" gives the same run every time in the page.
export function makeRng(seed = 1) {
  let a = seed >>> 0
  const random = () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return { random, choice: xs => xs[Math.floor(random() * xs.length)] }
}

// A "loaded dice": hands out a fixed list of numbers, the way the checks test code that uses rng.random().
export function dice(values) {
  let i = 0
  const random = () => { if (i >= values.length) throw new Error('the dice ran out of numbers'); return values[i++] }
  return { random, choice: items => items[Math.floor(random() * items.length)] }
}

export function playEpisode(table, start, choose, rng, cap = 100) {
  let state = start, total = 0
  const path = [start]
  while (Object.keys(table[state]).length && path.length <= cap) {
    const action = choose(state)
    const [nxt, reward] = sampleOutcome(table[state][action], rng.random())
    state = nxt
    path.push(state)
    total += reward
  }
  return { path, total }
}

// Breadth-first steps-to-goal (an independent oracle: no tables, no values).
export function stepsToGoal(maze) {
  const dist = { [maze.goal]: 0 }, queue = [maze.goal]
  while (queue.length) {
    const s = queue.shift()
    for (const n of Object.values(legalMoves(maze, s))) if (!(n in dist)) { dist[n] = dist[s] + 1; queue.push(n) }
  }
  return dist
}

// A random map that can be solved: walls at a given density, S and G far apart, re-drawn until reachable.
export function randomMaze(rng, rows = 5, cols = 6, density = 0.28) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => (rng.random() < density ? '#' : '.')))
    const sr = Math.floor(rng.random() * rows), gr = Math.floor(rng.random() * rows)
    grid[sr][0] = 'S'; grid[gr][cols - 1] = 'G'
    const text = grid.map(row => row.join('')).join('\n')
    const maze = parseMap(text)
    if (maze.start in stepsToGoal(maze)) return text
  }
  return SMALL
}

// ---- The finished learner (lesson 0), the same steps as python/pieces.js train() ----
export const best = row => { const v = Object.values(row); return v.length ? Math.max(...v) : 0 }

export function choose(row, eps, rng) {
  if (rng.random() < eps) return rng.choice(ACTIONS)
  const top = best(row)
  return rng.choice(ACTIONS.filter(a => row[a] === top))
}

export function newQ(table) {
  return Object.fromEntries(Object.keys(table).map(s => [s, Object.fromEntries(Object.keys(table[s]).map(a => [a, 0]))]))
}

// One episode of Q-learning; calls onStep for every move so the page can animate it.
export function trainEpisode({ maze, table, q, alpha, g, eps, rng, cap = 200, onStep }) {
  let state = maze.start, steps = 0, total = 0
  while (Object.keys(table[state]).length && steps < cap) {
    const action = choose(q[state], eps, rng)
    const [nxt, reward] = sampleOutcome(table[state][action], rng.random())
    const before = q[state][action]
    const target = reward + g * best(q[nxt])
    q[state][action] = before + alpha * (target - before)
    onStep?.({ state, action, nxt, reward, before, target, after: q[state][action] })
    state = nxt; steps += 1; total += reward
  }
  return { steps, total, reached: state === maze.goal }
}

export const greedyPlan = q => Object.fromEntries(Object.entries(q).filter(([, row]) => Object.keys(row).length)
  .map(([s, row]) => {
    const top = best(row)
    return [s, top === 0 && Object.values(row).every(v => v === 0) ? null : ACTIONS.find(a => row[a] === top)]
  }))

// Follow the greedy plan from the start with no slips; returns the path (stops on a loop).
export function followPlan(maze, table, q, cap = 100) {
  const plan = greedyPlan(q), path = [maze.start], seen = new Set([maze.start])
  let s = maze.start
  while (Object.keys(table[s]).length && path.length <= cap) {
    const a = plan[s]
    if (!a) break
    const [, nxt] = table[s][a].reduce((m, o) => (o[0] > m[0] ? o : m))
    path.push(nxt)
    if (seen.has(nxt)) break
    seen.add(nxt); s = nxt
  }
  return path
}

// ---- Part 2: worth by computation (the same steps as the Python pieces of lessons 4–7) ----
// Python's built-in sum() of floats (3.12 and later) uses compensated summation (Neumaier's
// algorithm), so it can differ from plain left-to-right adding in the last bit. That bit decides
// ties between equally good moves, so the twins must add exactly the way CPython does.
export function pySum(xs) {
  let hi = 0, lo = 0
  for (const x of xs) {
    const t = hi + x
    if (Math.abs(hi) >= Math.abs(x)) lo += (hi - t) + x
    else lo += (x - t) + hi
    hi = t
  }
  return lo && Number.isFinite(lo) ? hi + lo : hi
}

export const expectedValue = pairs => pySum(pairs.map(([p, x]) => p * x))

export function optionValues(table, state, values, g = 1) {
  return Object.fromEntries(Object.entries(table[state]).map(([a, outs]) => [a, pySum(outs.map(([p, n, r]) => p * (r + g * values[n])))]))
}

// The highest value, the first one met winning a tie (the order of ACTIONS).
export function bestOption(row) {
  let ba = null, bv = null
  for (const [a, v] of Object.entries(row)) if (bv === null || v > bv) { ba = a; bv = v }
  return [ba, bv]
}

// Breadth-first from the goal: how many moves each square is from the cheese.
export function stepsToGoalPiece(maze) {
  const dist = { [maze.goal]: 0 }, queue = [maze.goal]
  while (queue.length) {
    const cell = queue.shift()
    for (const nxt of Object.values(legalMoves(maze, cell))) if (!(nxt in dist)) { dist[nxt] = dist[cell] + 1; queue.push(nxt) }
  }
  return dist
}

// Sweep every square, in place, setting its worth to its best option; stop when nothing moves.
export function sweepValues(table, g = 1, tol = 1e-9, maxSweeps = 1000, onSweep) {
  const values = Object.fromEntries(Object.keys(table).map(s => [s, 0]))
  for (let sweep = 1; sweep <= maxSweeps; sweep++) {
    let biggest = 0
    for (const s of Object.keys(table)) {
      if (!Object.keys(table[s]).length) continue
      const nv = bestOption(optionValues(table, s, values, g))[1]
      biggest = Math.max(biggest, Math.abs(nv - values[s]))
      values[s] = nv
    }
    onSweep?.({ sweep, values: { ...values }, biggest })
    if (biggest < tol) return [values, sweep]
  }
  return [values, maxSweeps]
}

export function discountedTotal(rewards, g) {
  let total = 0
  rewards.forEach((r, t) => { total += g ** t * r })
  return total
}

export function horizon(g, weight = 0.01) {
  let t = 0
  while (g ** t >= weight) t += 1
  return t
}

export const greedyPlanOf = (table, values, g = 1) => Object.fromEntries(Object.keys(table).filter(s => Object.keys(table[s]).length).map(s => [s, bestOption(optionValues(table, s, values, g))[0]]))

export function evaluatePlan(table, plan, g = 0.9, tol = 1e-9, maxSweeps = 10000) {
  const values = Object.fromEntries(Object.keys(table).map(s => [s, 0]))
  for (let k = 0; k < maxSweeps; k++) {
    let biggest = 0
    for (const [s, a] of Object.entries(plan)) {
      const nv = pySum(table[s][a].map(([p, n, r]) => p * (r + g * values[n])))
      biggest = Math.max(biggest, Math.abs(nv - values[s]))
      values[s] = nv
    }
    if (biggest < tol) break
  }
  return values
}

// Evaluate the plan, switch every square to its best move, repeat until nothing changes.
// A square keeps its move when that move is as good as the best (so ties don't flip-flop).
export function planIteration(table, g = 0.9, start = 'right', onRound) {
  let plan = Object.fromEntries(Object.keys(table).filter(s => Object.keys(table[s]).length).map(s => [s, start]))
  for (let round = 1; round <= 100; round++) {
    const values = evaluatePlan(table, plan, g)
    onRound?.({ round, plan: { ...plan }, values: { ...values } })
    const next = {}
    for (const s of Object.keys(plan)) {
      const row = optionValues(table, s, values, g)
      const [ba, bv] = bestOption(row)
      next[s] = row[plan[s]] >= bv - 1e-12 ? plan[s] : ba
    }
    if (Object.keys(plan).every(s => plan[s] === next[s])) return { plan, values, rounds: round }
    plan = next
  }
  return { plan, values: evaluatePlan(table, plan, g), rounds: 100 }
}

// Walls up every open square that can't reach the cheese, so worth-by-sweeping settles with g = 1.
export function sealIslands(text) {
  const maze = parseMap(text), dist = stepsToGoal(maze)
  return text.trim().split('\n').map((row, r) => [...row.trim()].map((ch, c) => (ch === '.' && !(key(r, c) in dist) ? '#' : ch)).join('')).join('\n')
}

// The assembly after lesson 7: text in, best plan and worths out.
export function planMaze(text, slip = 0, g = 0.9) {
  const table = buildTable(parseMap(text), slip)
  const [values] = sweepValues(table, g)
  return [greedyPlanOf(table, values, g), values]
}
