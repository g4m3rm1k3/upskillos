export default {
  order: 10,

  id: 'mg9-010',

  slug: 'learn-or-plan',

  title: 'Learn or Plan?',

  subtitle: 'A ghost that searches the maze against one that learned habits, on an open maze and on a trap: when learning is the wrong tool, and when it beats the obvious algorithm.',

  tags: [
    'game-studio',
    'machine-learning',
    'planning',
    'breadth-first-search',
    'pathfinding',
    'game-ai',
    'evaluation',
  ],

  aliases: 'when not to use machine learning planning search breadth first search pathfinding a star shortest path learned policy generalisation brittleness moving target still target cost of training',

  timeToComplete: 50,

  coreConcept: 'If the problem is fully known, plan: a breadth-first search over the maze gives the shortest path to a still target exactly, on any maze, with no training. Learning only matches it after training on that maze, and a ghost trained on something else can fail completely: one trained against a wanderer never caught a player standing still in the trap. Learning earns its place when the problem is not fully known, such as an opponent\'s habits, where "the shortest path to where the player is now" solves the wrong problem; there the learned ghost matched or beat the planner. Measure both before choosing, and remember planning costs nothing to train.',

  prerequisites: ['mg9-009'],

  nextLesson: 'mg9-011',

  hook: {
    question: "A ghost that learned to hunt sounds impressive. But Maze Chase's ghost already finds you with twenty lines of breadth-first search, and never needed training. When is learning worth it, and when is it the wrong tool?",
    realWorldContext: 'Shipped game AI is mostly planning and rules: pathfinding (A*), behaviour trees, utility scores. Learning is used where those struggle: unknown or changing opponents, too many interacting rules, or behaviour that should feel human. Knowing which you face is the engineering judgement this lesson measures.',
  },

  intuition: {
    prose: [
      '**The planner.** A breadth-first search from the player outwards gives every open cell its distance by the maze (cell 1). The planning ghost steps to its legal neighbour with the smallest distance. In the trap, the ghost is 4 rows from the player but 30 steps by the maze: no sense of direction helps, only knowing the walls does.',
      '**A wandering player.** On the open maze the learned ghost catches in 10.0 steps against the planner\'s 10.6 (returns 10.0 and 9.4); on the trap they are close, −26.1 learned against −27.3 planning (cell 2). Why can nine states of "which way is the player" keep up with a search that knows every wall? Because the planner solves the wrong problem: the shortest path to where the player is *now*, though the player keeps moving. The learned ghost learned what tends to work against this particular wanderer. In Game Studio\'s Ghost Lab (the Try it), the gap on the trap was larger: −23.7 learned against −36.0 planning.',
      "**A still player.** Make the problem fully known: the player does not move. Now the planner is exactly right, the shortest path: 16.0 on the open maze (4 steps) and −10.0 on the trap (30 steps), with no training. The ghost trained against the wanderer scores −150.0 on the trap: it never catches the player at all, circling where its habits lead (cell 3). (In Game Studio's Ghost Lab, where movement is smoother, it did catch, but in 42 steps against the planner's 30.) A ghost trained against the still player does match the planner, −10.0, after 300 hunts on that maze.",
      '**Brittleness.** What a learner knows is what its training showed it. Change the opponent, or the map, and its habits may no longer fit, sometimes catastrophically, as on the trap. The planner reads the walls fresh at every decision, so a new maze costs it nothing.',
      '**The costs** (cell 4). Planning: one search per decision, visiting 124 cells, and no training. Learning: 17,226 updates of training before it is any good, then a lookup of 4 numbers per decision. For a ghost, 124 cells is nothing; for a game with millions of positions (Go, or a card game with hidden cards), exact planning is impossible, and that is where learning comes in.',
      "**How to choose.** Plan when the goal and the world are known and searchable: pathfinding, puzzles, following rules. Learn when they are not: an opponent's habits, many interacting factors with no simple rule, or behaviour that should adapt. Often combine them: plan the path, learn where to go (lesson 9.11's ambusher aims at where the player will be, and the same idea works with a planner).",
      '**Measure, do not assume.** Every claim here is a measurement on the same 200 hunts for each ghost. "Learning is smarter" and "search is always better" were both wrong somewhere.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: learn or plan?',
        body: 'Step 1. Is the goal fully known and the world searchable? Write the planner first. Step 2. Measure it on the real situations, opponents included. Step 3. If it solves the wrong problem (a moving target, unknown habits), try learning against a realistic practice partner. Step 4. Measure both on the same seeds, including situations neither trained on. Step 5. Choose, or combine.',
      },
      {
        type: 'warning',
        title: 'A learned NPC can fail where it never trained',
        body: 'The wanderer-trained ghost never caught a still player in the trap (−150.0). Test learned behaviour on situations unlike its training before shipping it.',
      },
      {
        type: 'insight',
        title: 'The best planner can be beaten',
        body: 'Breadth-first search is optimal for the problem it solves. Against a moving target that is not the real problem, and a learner that saw the real problem caught up with it (cell 2).',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: learn or plan',
        caption: 'A distance map, a wandering player, a still one, and the costs.',
        props: {
          lesson: {
            title: 'Learn or plan?',
            subtitle: 'Measured on the same hunts.',
            cells: [
              {
                type: 'js',
                instruction: "### 1. Planning: distances by the maze\nPredict first: the ghost's distance.",
                startCode: '// Ghost Lab on a grid: the maze as text (# a wall), a ghost and a player that move one cell a step. The ghost\n// never turns straight back unless it must (as in Pac-Man). The player wanders: at each cell a random open way,\n// not straight back, and it moves 6 steps in 7 (it is a little slower than the ghost).\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]   // up, right, down, left\nfunction mazeOf(rows) {\n  const at = (ch) => { const y = rows.findIndex((r) => r.includes(ch)); return [rows[y].indexOf(ch), y] }\n  return { rows, wall: (x, y) => rows[y][x] === \'#\', player: at(\'P\'), ghost: at(\'G\') }\n}\n/** The ways from a cell, not straight back (dir: the way it came) unless there is no other. */\nfunction ways(m, [x, y], dir) {\n  const open = [0, 1, 2, 3].filter((a) => !m.wall(x + DIRS[a][0], y + DIRS[a][1]))\n  const ahead = open.filter((a) => dir < 0 || a !== (dir + 2) % 4)\n  return ahead.length ? ahead : open\n}\n/** Steps from every cell to a goal: a breadth-first search outwards from the goal. */\nfunction distancesTo(m, [gx, gy]) {\n  const d = new Map([[gx + \',\' + gy, 0]]), q = [[gx, gy]]\n  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of DIRS) { const k = (x + dx) + \',\' + (y + dy); if (!d.has(k) && !m.wall(x + dx, y + dy)) { d.set(k, d.get(x + \',\' + y) + 1); q.push([x + dx, y + dy]) } } }\n  return ([x, y]) => d.get(x + \',\' + y) ?? Infinity\n}\n/** One hunt: the ghost chooses with choose(state, legal, ghost, player, maze) until it catches the player or 150 steps\n *  pass. Returns the return the agent gets: −1 a step, +20 for the catch. learn(s, a, r, s2, legal2, end) if given. */\nfunction hunt(m, choose, rand, { still = false, learn = null } = {}) {\n  let g = [...m.ghost], gd = -1, p = [...m.player], pd = -1, total = 0\n  const state = () => { const sx = Math.sign(p[0] - g[0]) + 1, sy = Math.sign(p[1] - g[1]) + 1; return sx * 3 + sy }   // 9 states\n  for (let t = 0; t < 150; t++) {\n    const s = state(), legal = ways(m, g, gd), a = choose(s, legal, g, p, m)\n    g = [g[0] + DIRS[a][0], g[1] + DIRS[a][1]]; gd = a\n    let r = -1, end = g[0] === p[0] && g[1] === p[1]\n    if (!end && !still && rand() < 6 / 7) { const w = ways(m, p, pd), b = w[Math.floor(rand() * w.length)]; p = [p[0] + DIRS[b][0], p[1] + DIRS[b][1]]; pd = b; end = g[0] === p[0] && g[1] === p[1] }\n    if (end) r += 20\n    total += r\n    if (learn) learn(s, a, r, state(), ways(m, g, gd), end)\n    if (end) break\n  }\n  return total\n}\nconst randomGhost = (rand) => (s, legal) => legal[Math.floor(rand() * legal.length)]\nconst planningGhost = (s, legal, g, p, m) => { const far = distancesTo(m, p); return legal.reduce((b, a) => (far([g[0] + DIRS[a][0], g[1] + DIRS[a][1]]) < far([g[0] + DIRS[b][0], g[1] + DIRS[b][1]]) ? a : b)) }\n/** Q-learning with legal moves: a table of 9 states × 4 directions. */\nfunction trainGhost(m, episodes, seed, opts = {}) {\n  const rand = seeded(seed), Q = Array.from({ length: 9 }, () => [0, 0, 0, 0])\n  const best = (s, legal) => { const top = Math.max(...legal.map((a) => Q[s][a])), ties = legal.filter((a) => Q[s][a] === top); return ties[Math.floor(rand() * ties.length)] }\n  for (let e = 0; e < episodes; e++) {\n    const eps = 0.3 + (0.02 - 0.3) * e / Math.max(1, episodes - 1)\n    hunt(m, (s, legal) => (rand() < eps ? legal[Math.floor(rand() * legal.length)] : best(s, legal)), rand, { ...opts, learn: (s, a, r, s2, legal2, end) => {\n      Q[s][a] += 0.2 * (r + (end ? 0 : 0.97 * Math.max(...legal2.map((b) => Q[s2][b]))) - Q[s][a])\n    } })\n  }\n  return Q\n}\nconst greedyGhost = (Q) => (s, legal) => legal.reduce((b, a) => (Q[s][a] > Q[s][b] ? a : b))\n/** The average return over the same 200 hunts. */\nfunction judge(m, choose, opts = {}) { const rand = seeded(99); let t = 0; for (let k = 0; k < 200; k++) t += hunt(m, typeof choose === \'function\' && choose.length === 1 ? choose(rand) : choose, rand, opts); return t / 200 }\nconst maze = mazeOf(["#####################","#.........#.........#","#.##.###..#..###.##.#","#...................#","#.##.#.###.###.#.##.#","#....#...#G#...#....#","####.###.....###.####","#........#G#........#","#.##.###.....###.##.#","#...#.....P.....#...#","###.#.###.#.###.#.###","#.........#.........#","#####################"]), trap = mazeOf(["#####################","#.........#.........#","#.#######.#.#######.#","#.#.....#...#.....#.#","#.#.###.#####.###.#.#","#...#.#...G...#.#...#","###.#.#########.#.###","#...#.....G.....#...#","#.#####.#####.#####.#","#.......#.P.#.......#","#.#####.#.#.#.#####.#","#.........#.........#","#####################"])\n\n// Planning: a breadth-first search outwards from the player gives every cell its distance by the maze. The planner\n// steps to the neighbour with the smallest. Predict first: how far is the ghost (G) from the player (P) in the trap?\nconst far = distancesTo(trap, trap.player)\nfor (let y = 0; y < trap.rows.length; y++)\n  console.log(trap.rows[y].split(\'\').map((ch, x) => (ch === \'#\' ? \'##\' : x === trap.ghost[0] && y === trap.ghost[1] ? \' G\' : x === trap.player[0] && y === trap.player[1] ? \' P\' : String(far([x, y])).padStart(2))).join(\'\'))\nconsole.log(\'the ghost is \' + far(trap.ghost) + \' steps from the player by the maze, \' + Math.abs(trap.ghost[1] - trap.player[1]) + \' as the crow flies\')',
              },
              {
                type: 'js',
                instruction: '### 2. A wandering player\nPredict first: which catches faster.',
                startCode: '// Ghost Lab on a grid: the maze as text (# a wall), a ghost and a player that move one cell a step. The ghost\n// never turns straight back unless it must (as in Pac-Man). The player wanders: at each cell a random open way,\n// not straight back, and it moves 6 steps in 7 (it is a little slower than the ghost).\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]   // up, right, down, left\nfunction mazeOf(rows) {\n  const at = (ch) => { const y = rows.findIndex((r) => r.includes(ch)); return [rows[y].indexOf(ch), y] }\n  return { rows, wall: (x, y) => rows[y][x] === \'#\', player: at(\'P\'), ghost: at(\'G\') }\n}\n/** The ways from a cell, not straight back (dir: the way it came) unless there is no other. */\nfunction ways(m, [x, y], dir) {\n  const open = [0, 1, 2, 3].filter((a) => !m.wall(x + DIRS[a][0], y + DIRS[a][1]))\n  const ahead = open.filter((a) => dir < 0 || a !== (dir + 2) % 4)\n  return ahead.length ? ahead : open\n}\n/** Steps from every cell to a goal: a breadth-first search outwards from the goal. */\nfunction distancesTo(m, [gx, gy]) {\n  const d = new Map([[gx + \',\' + gy, 0]]), q = [[gx, gy]]\n  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of DIRS) { const k = (x + dx) + \',\' + (y + dy); if (!d.has(k) && !m.wall(x + dx, y + dy)) { d.set(k, d.get(x + \',\' + y) + 1); q.push([x + dx, y + dy]) } } }\n  return ([x, y]) => d.get(x + \',\' + y) ?? Infinity\n}\n/** One hunt: the ghost chooses with choose(state, legal, ghost, player, maze) until it catches the player or 150 steps\n *  pass. Returns the return the agent gets: −1 a step, +20 for the catch. learn(s, a, r, s2, legal2, end) if given. */\nfunction hunt(m, choose, rand, { still = false, learn = null } = {}) {\n  let g = [...m.ghost], gd = -1, p = [...m.player], pd = -1, total = 0\n  const state = () => { const sx = Math.sign(p[0] - g[0]) + 1, sy = Math.sign(p[1] - g[1]) + 1; return sx * 3 + sy }   // 9 states\n  for (let t = 0; t < 150; t++) {\n    const s = state(), legal = ways(m, g, gd), a = choose(s, legal, g, p, m)\n    g = [g[0] + DIRS[a][0], g[1] + DIRS[a][1]]; gd = a\n    let r = -1, end = g[0] === p[0] && g[1] === p[1]\n    if (!end && !still && rand() < 6 / 7) { const w = ways(m, p, pd), b = w[Math.floor(rand() * w.length)]; p = [p[0] + DIRS[b][0], p[1] + DIRS[b][1]]; pd = b; end = g[0] === p[0] && g[1] === p[1] }\n    if (end) r += 20\n    total += r\n    if (learn) learn(s, a, r, state(), ways(m, g, gd), end)\n    if (end) break\n  }\n  return total\n}\nconst randomGhost = (rand) => (s, legal) => legal[Math.floor(rand() * legal.length)]\nconst planningGhost = (s, legal, g, p, m) => { const far = distancesTo(m, p); return legal.reduce((b, a) => (far([g[0] + DIRS[a][0], g[1] + DIRS[a][1]]) < far([g[0] + DIRS[b][0], g[1] + DIRS[b][1]]) ? a : b)) }\n/** Q-learning with legal moves: a table of 9 states × 4 directions. */\nfunction trainGhost(m, episodes, seed, opts = {}) {\n  const rand = seeded(seed), Q = Array.from({ length: 9 }, () => [0, 0, 0, 0])\n  const best = (s, legal) => { const top = Math.max(...legal.map((a) => Q[s][a])), ties = legal.filter((a) => Q[s][a] === top); return ties[Math.floor(rand() * ties.length)] }\n  for (let e = 0; e < episodes; e++) {\n    const eps = 0.3 + (0.02 - 0.3) * e / Math.max(1, episodes - 1)\n    hunt(m, (s, legal) => (rand() < eps ? legal[Math.floor(rand() * legal.length)] : best(s, legal)), rand, { ...opts, learn: (s, a, r, s2, legal2, end) => {\n      Q[s][a] += 0.2 * (r + (end ? 0 : 0.97 * Math.max(...legal2.map((b) => Q[s2][b]))) - Q[s][a])\n    } })\n  }\n  return Q\n}\nconst greedyGhost = (Q) => (s, legal) => legal.reduce((b, a) => (Q[s][a] > Q[s][b] ? a : b))\n/** The average return over the same 200 hunts. */\nfunction judge(m, choose, opts = {}) { const rand = seeded(99); let t = 0; for (let k = 0; k < 200; k++) t += hunt(m, typeof choose === \'function\' && choose.length === 1 ? choose(rand) : choose, rand, opts); return t / 200 }\nconst maze = mazeOf(["#####################","#.........#.........#","#.##.###..#..###.##.#","#...................#","#.##.#.###.###.#.##.#","#....#...#G#...#....#","####.###.....###.####","#........#G#........#","#.##.###.....###.##.#","#...#.....P.....#...#","###.#.###.#.###.#.###","#.........#.........#","#####################"]), trap = mazeOf(["#####################","#.........#.........#","#.#######.#.#######.#","#.#.....#...#.....#.#","#.#.###.#####.###.#.#","#...#.#...G...#.#...#","###.#.#########.#.###","#...#.....G.....#...#","#.#####.#####.#####.#","#.......#.P.#.......#","#.#####.#.#.#.#####.#","#.........#.........#","#####################"])\n\n// A wandering player. Predict first: on the open maze and on the trap, does planning or learning (300 hunts on that\n// maze) catch faster? (Average return over the same 200 hunts: 20 − steps.)\nfor (const [name, m] of [[\'open maze\', maze], [\'trap\', trap]])\n  console.log(name.padEnd(10) + \' planning \' + judge(m, planningGhost).toFixed(1) + \'   learned \' + judge(m, greedyGhost(trainGhost(m, 300, 3))).toFixed(1) + \'   random \' + judge(m, randomGhost).toFixed(1))',
              },
              {
                type: 'js',
                instruction: '### 3. A still player\nPredict first: the trap.',
                startCode: '// Ghost Lab on a grid: the maze as text (# a wall), a ghost and a player that move one cell a step. The ghost\n// never turns straight back unless it must (as in Pac-Man). The player wanders: at each cell a random open way,\n// not straight back, and it moves 6 steps in 7 (it is a little slower than the ghost).\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]   // up, right, down, left\nfunction mazeOf(rows) {\n  const at = (ch) => { const y = rows.findIndex((r) => r.includes(ch)); return [rows[y].indexOf(ch), y] }\n  return { rows, wall: (x, y) => rows[y][x] === \'#\', player: at(\'P\'), ghost: at(\'G\') }\n}\n/** The ways from a cell, not straight back (dir: the way it came) unless there is no other. */\nfunction ways(m, [x, y], dir) {\n  const open = [0, 1, 2, 3].filter((a) => !m.wall(x + DIRS[a][0], y + DIRS[a][1]))\n  const ahead = open.filter((a) => dir < 0 || a !== (dir + 2) % 4)\n  return ahead.length ? ahead : open\n}\n/** Steps from every cell to a goal: a breadth-first search outwards from the goal. */\nfunction distancesTo(m, [gx, gy]) {\n  const d = new Map([[gx + \',\' + gy, 0]]), q = [[gx, gy]]\n  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of DIRS) { const k = (x + dx) + \',\' + (y + dy); if (!d.has(k) && !m.wall(x + dx, y + dy)) { d.set(k, d.get(x + \',\' + y) + 1); q.push([x + dx, y + dy]) } } }\n  return ([x, y]) => d.get(x + \',\' + y) ?? Infinity\n}\n/** One hunt: the ghost chooses with choose(state, legal, ghost, player, maze) until it catches the player or 150 steps\n *  pass. Returns the return the agent gets: −1 a step, +20 for the catch. learn(s, a, r, s2, legal2, end) if given. */\nfunction hunt(m, choose, rand, { still = false, learn = null } = {}) {\n  let g = [...m.ghost], gd = -1, p = [...m.player], pd = -1, total = 0\n  const state = () => { const sx = Math.sign(p[0] - g[0]) + 1, sy = Math.sign(p[1] - g[1]) + 1; return sx * 3 + sy }   // 9 states\n  for (let t = 0; t < 150; t++) {\n    const s = state(), legal = ways(m, g, gd), a = choose(s, legal, g, p, m)\n    g = [g[0] + DIRS[a][0], g[1] + DIRS[a][1]]; gd = a\n    let r = -1, end = g[0] === p[0] && g[1] === p[1]\n    if (!end && !still && rand() < 6 / 7) { const w = ways(m, p, pd), b = w[Math.floor(rand() * w.length)]; p = [p[0] + DIRS[b][0], p[1] + DIRS[b][1]]; pd = b; end = g[0] === p[0] && g[1] === p[1] }\n    if (end) r += 20\n    total += r\n    if (learn) learn(s, a, r, state(), ways(m, g, gd), end)\n    if (end) break\n  }\n  return total\n}\nconst randomGhost = (rand) => (s, legal) => legal[Math.floor(rand() * legal.length)]\nconst planningGhost = (s, legal, g, p, m) => { const far = distancesTo(m, p); return legal.reduce((b, a) => (far([g[0] + DIRS[a][0], g[1] + DIRS[a][1]]) < far([g[0] + DIRS[b][0], g[1] + DIRS[b][1]]) ? a : b)) }\n/** Q-learning with legal moves: a table of 9 states × 4 directions. */\nfunction trainGhost(m, episodes, seed, opts = {}) {\n  const rand = seeded(seed), Q = Array.from({ length: 9 }, () => [0, 0, 0, 0])\n  const best = (s, legal) => { const top = Math.max(...legal.map((a) => Q[s][a])), ties = legal.filter((a) => Q[s][a] === top); return ties[Math.floor(rand() * ties.length)] }\n  for (let e = 0; e < episodes; e++) {\n    const eps = 0.3 + (0.02 - 0.3) * e / Math.max(1, episodes - 1)\n    hunt(m, (s, legal) => (rand() < eps ? legal[Math.floor(rand() * legal.length)] : best(s, legal)), rand, { ...opts, learn: (s, a, r, s2, legal2, end) => {\n      Q[s][a] += 0.2 * (r + (end ? 0 : 0.97 * Math.max(...legal2.map((b) => Q[s2][b]))) - Q[s][a])\n    } })\n  }\n  return Q\n}\nconst greedyGhost = (Q) => (s, legal) => legal.reduce((b, a) => (Q[s][a] > Q[s][b] ? a : b))\n/** The average return over the same 200 hunts. */\nfunction judge(m, choose, opts = {}) { const rand = seeded(99); let t = 0; for (let k = 0; k < 200; k++) t += hunt(m, typeof choose === \'function\' && choose.length === 1 ? choose(rand) : choose, rand, opts); return t / 200 }\nconst maze = mazeOf(["#####################","#.........#.........#","#.##.###..#..###.##.#","#...................#","#.##.#.###.###.#.##.#","#....#...#G#...#....#","####.###.....###.####","#........#G#........#","#.##.###.....###.##.#","#...#.....P.....#...#","###.#.###.#.###.#.###","#.........#.........#","#####################"]), trap = mazeOf(["#####################","#.........#.........#","#.#######.#.#######.#","#.#.....#...#.....#.#","#.#.###.#####.###.#.#","#...#.#...G...#.#...#","###.#.#########.#.###","#...#.....G.....#...#","#.#####.#####.#####.#","#.......#.P.#.......#","#.#####.#.#.#.#####.#","#.........#.........#","#####################"])\n\n// A player standing still: the problem is now fully known. Predict first: planning, the ghost trained against the\n// wanderer, and a ghost trained against the still player, on the trap.\nconst still = { still: true }\nfor (const [name, m] of [[\'open maze\', maze], [\'trap\', trap]]) {\n  const fromWanderer = greedyGhost(trainGhost(m, 300, 3)), fromStill = greedyGhost(trainGhost(m, 300, 3, still))\n  console.log(name.padEnd(10) + \' planning \' + judge(m, planningGhost, still).toFixed(1) + \'   learned against the wanderer \' + judge(m, fromWanderer, still).toFixed(1) + \'   learned against it standing still \' + judge(m, fromStill, still).toFixed(1))\n}\nconsole.log(\'−150.0 means it never caught the player in 150 steps\')',
              },
              {
                type: 'js',
                instruction: '### 4. What each costs\nPredict first: cells visited, updates made.',
                startCode: '// Ghost Lab on a grid: the maze as text (# a wall), a ghost and a player that move one cell a step. The ghost\n// never turns straight back unless it must (as in Pac-Man). The player wanders: at each cell a random open way,\n// not straight back, and it moves 6 steps in 7 (it is a little slower than the ghost).\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]   // up, right, down, left\nfunction mazeOf(rows) {\n  const at = (ch) => { const y = rows.findIndex((r) => r.includes(ch)); return [rows[y].indexOf(ch), y] }\n  return { rows, wall: (x, y) => rows[y][x] === \'#\', player: at(\'P\'), ghost: at(\'G\') }\n}\n/** The ways from a cell, not straight back (dir: the way it came) unless there is no other. */\nfunction ways(m, [x, y], dir) {\n  const open = [0, 1, 2, 3].filter((a) => !m.wall(x + DIRS[a][0], y + DIRS[a][1]))\n  const ahead = open.filter((a) => dir < 0 || a !== (dir + 2) % 4)\n  return ahead.length ? ahead : open\n}\n/** Steps from every cell to a goal: a breadth-first search outwards from the goal. */\nfunction distancesTo(m, [gx, gy]) {\n  const d = new Map([[gx + \',\' + gy, 0]]), q = [[gx, gy]]\n  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of DIRS) { const k = (x + dx) + \',\' + (y + dy); if (!d.has(k) && !m.wall(x + dx, y + dy)) { d.set(k, d.get(x + \',\' + y) + 1); q.push([x + dx, y + dy]) } } }\n  return ([x, y]) => d.get(x + \',\' + y) ?? Infinity\n}\n/** One hunt: the ghost chooses with choose(state, legal, ghost, player, maze) until it catches the player or 150 steps\n *  pass. Returns the return the agent gets: −1 a step, +20 for the catch. learn(s, a, r, s2, legal2, end) if given. */\nfunction hunt(m, choose, rand, { still = false, learn = null } = {}) {\n  let g = [...m.ghost], gd = -1, p = [...m.player], pd = -1, total = 0\n  const state = () => { const sx = Math.sign(p[0] - g[0]) + 1, sy = Math.sign(p[1] - g[1]) + 1; return sx * 3 + sy }   // 9 states\n  for (let t = 0; t < 150; t++) {\n    const s = state(), legal = ways(m, g, gd), a = choose(s, legal, g, p, m)\n    g = [g[0] + DIRS[a][0], g[1] + DIRS[a][1]]; gd = a\n    let r = -1, end = g[0] === p[0] && g[1] === p[1]\n    if (!end && !still && rand() < 6 / 7) { const w = ways(m, p, pd), b = w[Math.floor(rand() * w.length)]; p = [p[0] + DIRS[b][0], p[1] + DIRS[b][1]]; pd = b; end = g[0] === p[0] && g[1] === p[1] }\n    if (end) r += 20\n    total += r\n    if (learn) learn(s, a, r, state(), ways(m, g, gd), end)\n    if (end) break\n  }\n  return total\n}\nconst randomGhost = (rand) => (s, legal) => legal[Math.floor(rand() * legal.length)]\nconst planningGhost = (s, legal, g, p, m) => { const far = distancesTo(m, p); return legal.reduce((b, a) => (far([g[0] + DIRS[a][0], g[1] + DIRS[a][1]]) < far([g[0] + DIRS[b][0], g[1] + DIRS[b][1]]) ? a : b)) }\n/** Q-learning with legal moves: a table of 9 states × 4 directions. */\nfunction trainGhost(m, episodes, seed, opts = {}) {\n  const rand = seeded(seed), Q = Array.from({ length: 9 }, () => [0, 0, 0, 0])\n  const best = (s, legal) => { const top = Math.max(...legal.map((a) => Q[s][a])), ties = legal.filter((a) => Q[s][a] === top); return ties[Math.floor(rand() * ties.length)] }\n  for (let e = 0; e < episodes; e++) {\n    const eps = 0.3 + (0.02 - 0.3) * e / Math.max(1, episodes - 1)\n    hunt(m, (s, legal) => (rand() < eps ? legal[Math.floor(rand() * legal.length)] : best(s, legal)), rand, { ...opts, learn: (s, a, r, s2, legal2, end) => {\n      Q[s][a] += 0.2 * (r + (end ? 0 : 0.97 * Math.max(...legal2.map((b) => Q[s2][b]))) - Q[s][a])\n    } })\n  }\n  return Q\n}\nconst greedyGhost = (Q) => (s, legal) => legal.reduce((b, a) => (Q[s][a] > Q[s][b] ? a : b))\n/** The average return over the same 200 hunts. */\nfunction judge(m, choose, opts = {}) { const rand = seeded(99); let t = 0; for (let k = 0; k < 200; k++) t += hunt(m, typeof choose === \'function\' && choose.length === 1 ? choose(rand) : choose, rand, opts); return t / 200 }\nconst maze = mazeOf(["#####################","#.........#.........#","#.##.###..#..###.##.#","#...................#","#.##.#.###.###.#.##.#","#....#...#G#...#....#","####.###.....###.####","#........#G#........#","#.##.###.....###.##.#","#...#.....P.....#...#","###.#.###.#.###.#.###","#.........#.........#","#####################"]), trap = mazeOf(["#####################","#.........#.........#","#.#######.#.#######.#","#.#.....#...#.....#.#","#.#.###.#####.###.#.#","#...#.#...G...#.#...#","###.#.#########.#.###","#...#.....G.....#...#","#.#####.#####.#####.#","#.......#.P.#.......#","#.#####.#.#.#.#####.#","#.........#.........#","#####################"])\n\n// What each costs. Planning: a breadth-first search at every decision, no training. Learning: training first, then\n// a table lookup per decision. Predict first: how many cells does one plan visit, and how many updates does\n// training make?\nlet visits = 0\nconst countingDistances = (m, goal) => { const d = distancesTo(m, goal); visits = 0; for (let y = 0; y < m.rows.length; y++) for (let x = 0; x < m.rows[0].length; x++) if (d([x, y]) < Infinity) visits++; return d }\ncountingDistances(trap, trap.player)\n// The training of cell 2, counting its updates (one per step of every hunt).\nlet updates = 0\nconst rand = seeded(3), Q = Array.from({ length: 9 }, () => [0, 0, 0, 0])\nconst best = (s, legal) => { const top = Math.max(...legal.map((a) => Q[s][a])), ties = legal.filter((a) => Q[s][a] === top); return ties[Math.floor(rand() * ties.length)] }\nfor (let e = 0; e < 300; e++) {\n  const eps = 0.3 + (0.02 - 0.3) * e / 299\n  hunt(trap, (s, legal) => (rand() < eps ? legal[Math.floor(rand() * legal.length)] : best(s, legal)), rand, { learn: (s, a, r, s2, legal2, end) => { updates++; Q[s][a] += 0.2 * (r + (end ? 0 : 0.97 * Math.max(...legal2.map((b) => Q[s2][b]))) - Q[s][a]) } })\n}\nconsole.log(\'one plan visits \' + visits + \' cells; a learned decision reads 4 numbers\')\nconsole.log(\'300 hunts of training make \' + updates + \' updates; planning needs no training at all\')',
              },
              {
                type: 'challenge',
                instruction: '### 5. Challenge: the planner\nSix distances check it.',
                startCode: "const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]\nconst rows = ['#######', '#.....#', '#.###.#', '#.#...#', '#######'], m = { wall: (x, y) => rows[y][x] === '#' }\n// Challenge: write distancesTo(m, goal): a breadth-first search outwards from goal over the open cells. Return a\n// function giving any cell's distance in steps (Infinity for a wall or a cell it cannot reach).\nfunction distancesTo(m, [gx, gy]) {\n  return () => 0   // your code\n}\nconst far = distancesTo(m, [1, 3])\nconst cases = [[[1, 3], 0], [[1, 1], 2], [[5, 1], 6], [[5, 3], 8], [[3, 3], 10], [[2, 2], Infinity]]\nlet ok = 0\nfor (const [cell, want] of cases) { const got = far(cell); if (got === want) ok++; else console.log(JSON.stringify(cell) + ': ' + got + ', should be ' + want) }\nconsole.log(ok === cases.length ? '✓ All 6 distances right: that is the planner.' : ok + ' of 6 right.')",
                solutionCode: "const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]\nconst rows = ['#######', '#.....#', '#.###.#', '#.#...#', '#######'], m = { wall: (x, y) => rows[y][x] === '#' }\n// Challenge: write distancesTo(m, goal): a breadth-first search outwards from goal over the open cells. Return a\n// function giving any cell's distance in steps (Infinity for a wall or a cell it cannot reach).\nfunction distancesTo(m, [gx, gy]) {\n  const d = new Map([[gx + ',' + gy, 0]]), q = [[gx, gy]]\n  while (q.length) {\n    const [x, y] = q.shift()\n    for (const [dx, dy] of DIRS) { const k = (x + dx) + ',' + (y + dy); if (!d.has(k) && !m.wall(x + dx, y + dy)) { d.set(k, d.get(x + ',' + y) + 1); q.push([x + dx, y + dy]) } }\n  }\n  return ([x, y]) => d.get(x + ',' + y) ?? Infinity\n}\nconst far = distancesTo(m, [1, 3])\nconst cases = [[[1, 3], 0], [[1, 1], 2], [[5, 1], 6], [[5, 3], 8], [[3, 3], 10], [[2, 2], Infinity]]\nlet ok = 0\nfor (const [cell, want] of cases) { const got = far(cell); if (got === want) ok++; else console.log(JSON.stringify(cell) + ': ' + got + ', should be ' + want) }\nconsole.log(ok === cases.length ? '✓ All 6 distances right: that is the planner.' : ok + ' of 6 right.')",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Learn or plan?',
        props: {
          task: 'learn-or-plan',
          lesson: 'mg9-010',
          checkpoint: 'cp-mg9-010-4',
        },
      },
    ],
  },

  math: {
    prose: [
      '**Under the hood (optional).** Breadth-first search visits each reachable cell once and each passage twice: $O(V + E)$ for $V$ cells and $E$ connections, here 124 cells. A* adds a guess of the distance left to search the promising cells first.',
      "Against a moving target the right plan depends on where the target will go, a game against an opponent; pursuit (always heading to the target's current cell) is not optimal in general, which is why a learned policy can do better against a known opponent.",
    ],
    equations: [
      {
        label: 'Breadth-first search',
        latex: 'O(V + E)',
      },
      {
        label: "A planner's choice",
        latex: 'a^* = \\arg\\min_{a \\in A(s)} d(\\text{next}(s, a), \\text{goal})',
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      'Planning is exact relative to its model: if the model (a still goal) is wrong, its exactness does not help. Learning optimises against the experience it had: if the experience is unrepresentative, neither does it.',
      'A fair comparison holds everything else equal: the same rules (no reversing for both), the same hunts, and the planner given its best version (the shortest legal step, not an illegal one replaced at random).',
      'Where it goes: 9.11 brings it together in a team of two NPCs with different jobs.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg9-010-ex1',
      title: 'A distance',
      difficulty: 'easy',
      problem: "In cell 1's map, why is the ghost 30 steps from the player though only 4 rows apart?",
      steps: [
        {
          expression: 'd_{\\text{maze}} \\ne d_{\\text{straight}}',
          annotation: 'The walls force the way round.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'The direct way is walled off; the shortest open way runs round the outside.',
    },
    {
      id: 'mg9-010-ex2',
      title: 'Choose',
      difficulty: 'medium',
      problem: 'An enemy must reach a fixed alarm button by the shortest route on a map that changes every level. Learn or plan?',
      steps: [
        {
          expression: '\\text{goal known, map searchable}',
          annotation: "Exactly the planner's problem.",
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'Plan (breadth-first search or A*): exact on every new map, no training.',
    },
    {
      id: 'mg9-010-ex3',
      title: 'Choose again',
      difficulty: 'hard',
      problem: 'A poker opponent should exploit how a particular player bluffs. Learn or plan?',
      steps: [
        {
          expression: '\\text{the opponent is unknown}',
          annotation: 'No map to search: habits to learn.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: "Learn (or combine with planning over the cards): what matters is the opponent's habits.",
    },
  ],

  challenges: [
    {
      id: 'mg9-010-ch1',
      title: 'A new map',
      difficulty: 'easy',
      problem: 'You ship ten new mazes. Which ghost needs work?',
      hint: 'Which reads the walls each time?',
      answer: 'The learned one may need retraining on each; the planner works on all at once.',
      walkthrough: [],
    },
    {
      id: 'mg9-010-ch2',
      title: 'Intercept',
      difficulty: 'medium',
      problem: 'Improve the planner against a moving player without learning.',
      hint: 'Plan to where it is going.',
      answer: 'Plan to a cell a few steps ahead of the player along its direction: interception, as the ambusher does.',
      walkthrough: [],
    },
    {
      id: 'mg9-010-ch3',
      title: 'Combine',
      difficulty: 'hard',
      problem: 'Describe a ghost that plans and learns.',
      hint: 'Learn the target, plan the path.',
      answer: 'Learn which cell to aim for (current, ahead, cut-off) from the situation; plan the path to it with a search.',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'distancesTo',
        meaning: "A breadth-first search: every cell's distance by the maze.",
      },
      {
        symbol: 'plan()',
        meaning: 'Step to the legal neighbour closest by the maze.',
      },
      {
        symbol: 'pursuit',
        meaning: 'Planning to where the target is now.',
      },
      {
        symbol: 'brittleness',
        meaning: 'A learned policy failing outside its training.',
      },
    ],
    rulesOfThumb: [
      'Known and searchable: plan.',
      'Unknown opponent: learn, against a realistic partner.',
      'Measure both on the same seeds.',
      'Test where neither trained.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'Machine learning is always the smarter choice.',
      whyStudentsThinkIt: 'It learns.',
      correctionExample: 'The wanderer-trained ghost never caught a still player in the trap (cell 3).',
      contrastCase: 'The planner was exact there with no training.',
    },
    {
      falseBelief: 'The optimal algorithm cannot be beaten.',
      whyStudentsThinkIt: 'It is optimal.',
      correctionExample: 'It is optimal for its model; against a moving target the learner caught up (cell 2).',
      contrastCase: 'On the still target it was unbeatable.',
    },
  ],

  transferPrompts: [
    {
      situation: 'Enemies that patrol and chase in a stealth game.',
      competingTechniques: [
        'Learn the whole behaviour',
        'Plan paths with A*, script or learn the decisions (patrol, search, chase)',
      ],
      whyThisTechniqueWins: 'Paths are a known problem; the decisions are where variety helps.',
    },
    {
      situation: "A puzzle game's hint system.",
      competingTechniques: ['Train a model to suggest moves', 'Search the puzzle'],
      whyThisTechniqueWins: 'The puzzle is fully known and searchable: exact hints.',
    },
  ],

  debugging: [
    {
      commonError: 'Comparing a learner with a handicapped planner.',
      symptom: 'Learning looks far better than it is.',
      whyItHappened: 'The planner broke a rule (an illegal step replaced at random) the learner did not.',
      repairStrategy: 'Give each its best legal version.',
    },
    {
      commonError: 'Testing only on the training map and opponent.',
      symptom: 'A ghost that "works" fails for players.',
      whyItHappened: 'It learned habits that fit its training.',
      repairStrategy: 'Test on new maps and other opponents.',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Write a planner and measure it against a learned agent.',
    explainVerbally: 'Explain when to plan, when to learn, and why.',
    detectIncorrectApplication: 'Spot unfair comparisons and untested generalisation.',
    transferToUnfamiliar: 'Choose the right tool for a new game AI problem.',
  },

  assessment: {
    questions: [
      {
        id: 'mg9-010-assess-1',
        type: 'choice',
        text: 'With the player still, on the trap, the planner scores',
        options: ['−10.0 (30 steps)', '−150.0', '16.0', '−27.3'],
        answer: '−10.0 (30 steps)',
        hint: 'Cell 3.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg9-010-quiz-1',
      type: 'choice',
      text: 'In the trap the ghost is how far from the player by the maze?',
      options: ['30 steps', '4 steps', '10 steps', '124 steps'],
      answer: '30 steps',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg9-010-quiz-2',
      type: 'choice',
      text: 'Against the wanderer on the trap, learning and planning score',
      options: [
        'About the same (−26.1, −27.3)',
        'Learning far worse',
        'Planning far worse',
        'Both −150',
      ],
      answer: 'About the same (−26.1, −27.3)',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg9-010-quiz-3',
      type: 'choice',
      text: 'The wanderer-trained ghost against a still player on the trap',
      options: [
        'Never catches it',
        'Matches the planner',
        'Beats the planner',
        'Catches in 4 steps',
      ],
      answer: 'Never catches it',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg9-010-quiz-4',
      type: 'choice',
      text: 'One plan visits about',
      options: ['124 cells', '4 cells', '17,226 cells', '9 cells'],
      answer: '124 cells',
      hints: ['Cell 4.'],
      reviewSection: 'Cell 4',
    },
    {
      id: 'mg9-010-quiz-5',
      type: 'choice',
      text: 'Pursuit planning is not optimal against a moving target because',
      options: [
        'It plans to where the target is now',
        'BFS is wrong',
        'Mazes have loops',
        'It is too slow',
      ],
      answer: 'It plans to where the target is now',
      hints: ['A wandering player.'],
      reviewSection: 'Intuition — wandering',
    },
    {
      id: 'mg9-010-quiz-6',
      type: 'choice',
      text: 'For a fixed goal on a new map, choose',
      options: ['Planning', 'Learning', 'Random', 'Neither'],
      answer: 'Planning',
      hints: ['How to choose.'],
      reviewSection: 'Intuition — choose',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg9-010-1',
      label: 'Read the planner and the wandering player',
      type: 'read',
    },
    {
      id: 'cp-mg9-010-2',
      label: 'Read the still player and brittleness',
      type: 'read',
    },
    {
      id: 'cp-mg9-010-3',
      label: 'Run the notebook',
      type: 'read',
    },
    {
      id: 'cp-mg9-010-4',
      label: 'Complete "Learn or plan?" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg9-010-5',
      label: 'Read the costs and how to choose',
      type: 'read',
    },
    {
      id: 'cp-mg9-010-6',
      label: 'Work through choosing to plan',
      type: 'example',
    },
    {
      id: 'cp-mg9-010-7',
      label: 'Work through choosing to learn',
      type: 'example',
    },
    {
      id: 'cp-mg9-010-8',
      label: 'Pass the planner challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-9',
}
