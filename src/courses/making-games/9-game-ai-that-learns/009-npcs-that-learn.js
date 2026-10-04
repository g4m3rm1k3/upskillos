export default {
  order: 9,

  id: 'mg9-009',

  slug: 'npcs-that-learn',

  title: 'NPCs That Learn',

  subtitle: 'A maze ghost made into a learning agent: turns at junctions as its legal moves, a scripted opponent to practise against, and one brain shared by every ghost.',

  tags: [
    'game-studio',
    'machine-learning',
    'reinforcement-learning',
    'npc',
    'game-ai',
    'multi-agent',
    'action-masking',
  ],

  aliases: 'npc enemy ghost learning agent maze chase legal moves junction no reverse scripted opponent practice partner shared brain one policy many agents ai.training resting',

  timeToComplete: 60,

  coreConcept: 'An NPC learns with the same recipe as the Breakout paddle, plus three things games need. Its decisions come at natural moments (a ghost chooses at each junction), so it is a turn-based agent whose legal moves are the open ways there, never straight back. It practises against a scripted opponent: while ai.training is true, the player script plays itself (it wanders), so the NPC can learn before anyone plays. And every copy of the NPC uses the same brain: train one ghost, and both ghosts in the game hunt with it.',

  prerequisites: ['mg9-008'],

  nextLesson: 'mg9-010',

  hook: {
    question: "Maze Chase's ghosts follow a search algorithm someone wrote. Could a ghost instead learn to hunt, by playing, and could the same brain run every ghost in the maze?",
    realWorldContext: 'Learned NPCs are used for opponents, teammates and testers (Unity ML-Agents, racing-game drivers, bots that playtest levels). The practical questions are the ones in this lesson: when does it decide, what can it do there, whom does it practise against before players exist, and how do many NPCs share what one learned?',
  },

  intuition: {
    prose: [
      "**Ghost Lab.** The Try it card opens Ghost Lab: Maze Chase's maze, player and art, with a ghost that can learn. This notebook runs the same game on a grid, one cell a step, so every number here takes a fraction of a second; the task trains the real one.",
      '**When it decides.** A ghost does not steer every frame: it travels from cell centre to cell centre, and only at a centre is there a choice to make. So it is a turn-based agent (lesson 10.9 covers turn-based agents in full): legalActions() is empty between cells, and at a centre it is the open directions. As in Pac-Man it may not turn straight back unless it must, which keeps it from dithering: at its start it may go up or down; once it has gone up, only up (cell 1).',
      '**What it sees, does and earns.** It sees where the player is from it: left, level or right, and above, level or below, 9 states (two readings, each cut at −0.5 and 0.5 cells). It does one of four directions. It earns −1 a step and +20 for the catch, so the fastest catch earns the most. An episode ends with the catch, or after 150 steps.',
      "**A scripted opponent.** Training needs someone to hunt before any player exists. While ai.training is true, Ghost Lab's player script plays itself: at each cell it takes a random open way (not straight back), a little slower than the ghost. This is the practice partner (cribbage's rules player is another). In the game, ai.training is false and you play.",
      '**It learns.** A random ghost earns −75.5 (it rarely catches within 150 steps). After 50 hunts of Q-learning with legal moves it earns 9.2 (about 11 steps a catch), after 300 hunts 10.0 (cell 2). The breadth-first search that Maze Chase uses scores 9.4; lesson 9.10 asks why learning can match a search.',
      '**What it learned.** Cell 3 prints each state\'s preferences: with the player left and level it prefers left (8.8); below, down; above and left, up first (5.2) then left. It has learned "go towards the player, the bigger gap first", in numbers. With the player in its own cell there is nothing to learn: the hunt is over.',
      "**Legal moves in the learning.** Q-learning here only ever chooses among the legal ways, and its target uses the best legal next way (max over legal a′). Game Studio's Table (TD) trainer does the same for any agent with legalActions().",
      '**One brain, many ghosts.** Both ghosts run the same script, whose brain field names brains/ghost.json, so one trained table drives both. In training only the first ghost hunts (the other rests: its script checks ai.training and its name); in the game both do. Two ghosts with the shared brain catch in 4.9 steps, against 10.0 for one (cell 4).',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: a learning NPC',
        body: 'Step 1. When does it decide? At natural moments (junctions, turns); make it turn-based with legalActions(). Step 2. What it may do there: the legal moves. Step 3. What it sees, relative to it; what it earns; when the episode ends. Step 4. A scripted opponent for ai.training. Step 5. Train; compare with random play and with a hand-written NPC. Step 6. Save the brain; every copy of the NPC that names it uses it.',
      },
      {
        type: 'warning',
        title: 'Train against someone like your players',
        body: 'The ghost learned to catch a random wanderer. A player who runs away cleverly is a different opponent; what it learned may not carry over (lesson 9.10 shows a case where it fails completely). Make the practice partner as close to real play as you can.',
      },
      {
        type: 'insight',
        title: 'Shared brains are free',
        body: 'A brain is just a file the engine reads; any number of NPCs can name it. One training run gives you a whole crowd, and an improvement to the brain improves them all.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: a ghost that learns',
        caption: 'Legal moves at junctions, learning to hunt, what it learned, and two ghosts sharing a brain.',
        props: {
          lesson: {
            title: 'NPCs that learn',
            subtitle: 'Ghost Lab on a grid.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. Its moves\nPredict first: the ways at its start.',
                startCode: '// Ghost Lab on a grid: the maze as text (# a wall), a ghost and a player that move one cell a step. The ghost\n// never turns straight back unless it must (as in Pac-Man). The player wanders: at each cell a random open way,\n// not straight back, and it moves 6 steps in 7 (it is a little slower than the ghost).\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]   // up, right, down, left\nfunction mazeOf(rows) {\n  const at = (ch) => { const y = rows.findIndex((r) => r.includes(ch)); return [rows[y].indexOf(ch), y] }\n  return { rows, wall: (x, y) => rows[y][x] === \'#\', player: at(\'P\'), ghost: at(\'G\') }\n}\n/** The ways from a cell, not straight back (dir: the way it came) unless there is no other. */\nfunction ways(m, [x, y], dir) {\n  const open = [0, 1, 2, 3].filter((a) => !m.wall(x + DIRS[a][0], y + DIRS[a][1]))\n  const ahead = open.filter((a) => dir < 0 || a !== (dir + 2) % 4)\n  return ahead.length ? ahead : open\n}\n/** Steps from every cell to a goal: a breadth-first search outwards from the goal. */\nfunction distancesTo(m, [gx, gy]) {\n  const d = new Map([[gx + \',\' + gy, 0]]), q = [[gx, gy]]\n  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of DIRS) { const k = (x + dx) + \',\' + (y + dy); if (!d.has(k) && !m.wall(x + dx, y + dy)) { d.set(k, d.get(x + \',\' + y) + 1); q.push([x + dx, y + dy]) } } }\n  return ([x, y]) => d.get(x + \',\' + y) ?? Infinity\n}\n/** One hunt: the ghost chooses with choose(state, legal, ghost, player, maze) until it catches the player or 150 steps\n *  pass. Returns the return the agent gets: −1 a step, +20 for the catch. learn(s, a, r, s2, legal2, end) if given. */\nfunction hunt(m, choose, rand, { still = false, learn = null } = {}) {\n  let g = [...m.ghost], gd = -1, p = [...m.player], pd = -1, total = 0\n  const state = () => { const sx = Math.sign(p[0] - g[0]) + 1, sy = Math.sign(p[1] - g[1]) + 1; return sx * 3 + sy }   // 9 states\n  for (let t = 0; t < 150; t++) {\n    const s = state(), legal = ways(m, g, gd), a = choose(s, legal, g, p, m)\n    g = [g[0] + DIRS[a][0], g[1] + DIRS[a][1]]; gd = a\n    let r = -1, end = g[0] === p[0] && g[1] === p[1]\n    if (!end && !still && rand() < 6 / 7) { const w = ways(m, p, pd), b = w[Math.floor(rand() * w.length)]; p = [p[0] + DIRS[b][0], p[1] + DIRS[b][1]]; pd = b; end = g[0] === p[0] && g[1] === p[1] }\n    if (end) r += 20\n    total += r\n    if (learn) learn(s, a, r, state(), ways(m, g, gd), end)\n    if (end) break\n  }\n  return total\n}\nconst randomGhost = (rand) => (s, legal) => legal[Math.floor(rand() * legal.length)]\nconst planningGhost = (s, legal, g, p, m) => { const far = distancesTo(m, p); return legal.reduce((b, a) => (far([g[0] + DIRS[a][0], g[1] + DIRS[a][1]]) < far([g[0] + DIRS[b][0], g[1] + DIRS[b][1]]) ? a : b)) }\n/** Q-learning with legal moves: a table of 9 states × 4 directions. */\nfunction trainGhost(m, episodes, seed, opts = {}) {\n  const rand = seeded(seed), Q = Array.from({ length: 9 }, () => [0, 0, 0, 0])\n  const best = (s, legal) => { const top = Math.max(...legal.map((a) => Q[s][a])), ties = legal.filter((a) => Q[s][a] === top); return ties[Math.floor(rand() * ties.length)] }\n  for (let e = 0; e < episodes; e++) {\n    const eps = 0.3 + (0.02 - 0.3) * e / Math.max(1, episodes - 1)\n    hunt(m, (s, legal) => (rand() < eps ? legal[Math.floor(rand() * legal.length)] : best(s, legal)), rand, { ...opts, learn: (s, a, r, s2, legal2, end) => {\n      Q[s][a] += 0.2 * (r + (end ? 0 : 0.97 * Math.max(...legal2.map((b) => Q[s2][b]))) - Q[s][a])\n    } })\n  }\n  return Q\n}\nconst greedyGhost = (Q) => (s, legal) => legal.reduce((b, a) => (Q[s][a] > Q[s][b] ? a : b))\n/** The average return over the same 200 hunts. */\nfunction judge(m, choose, opts = {}) { const rand = seeded(99); let t = 0; for (let k = 0; k < 200; k++) t += hunt(m, typeof choose === \'function\' && choose.length === 1 ? choose(rand) : choose, rand, opts); return t / 200 }\nconst maze = mazeOf(["#####################","#.........#.........#","#.##.###..#..###.##.#","#...................#","#.##.#.###.###.#.##.#","#....#...#G#...#....#","####.###.....###.####","#........#G#........#","#.##.###.....###.##.#","#...#.....P.....#...#","###.#.###.#.###.#.###","#.........#.........#","#####################"])\n\n// Its moves: at each cell the ghost may go any open way except straight back. Predict first: how many ways at its\n// starting cell, and after it has gone up once?\nconst NAMES = [\'up\', \'right\', \'down\', \'left\']\nlet g = maze.ghost, dir = -1\nconsole.log(\'at the start \' + JSON.stringify(g) + \': \' + ways(maze, g, dir).map((a) => NAMES[a]).join(\', \'))\nconst up = ways(maze, g, dir).includes(0) ? 0 : ways(maze, g, dir)[0]\ng = [g[0] + DIRS[up][0], g[1] + DIRS[up][1]]; dir = up\nconsole.log(\'after going \' + NAMES[up] + \', at \' + JSON.stringify(g) + \': \' + ways(maze, g, dir).map((a) => NAMES[a]).join(\', \') + \' (not \' + NAMES[(up + 2) % 4] + \', straight back)\')',
              },
              {
                type: 'js',
                instruction: '### 2. It learns\nPredict first: random, then 50, 100, 300 hunts.',
                startCode: '// Ghost Lab on a grid: the maze as text (# a wall), a ghost and a player that move one cell a step. The ghost\n// never turns straight back unless it must (as in Pac-Man). The player wanders: at each cell a random open way,\n// not straight back, and it moves 6 steps in 7 (it is a little slower than the ghost).\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]   // up, right, down, left\nfunction mazeOf(rows) {\n  const at = (ch) => { const y = rows.findIndex((r) => r.includes(ch)); return [rows[y].indexOf(ch), y] }\n  return { rows, wall: (x, y) => rows[y][x] === \'#\', player: at(\'P\'), ghost: at(\'G\') }\n}\n/** The ways from a cell, not straight back (dir: the way it came) unless there is no other. */\nfunction ways(m, [x, y], dir) {\n  const open = [0, 1, 2, 3].filter((a) => !m.wall(x + DIRS[a][0], y + DIRS[a][1]))\n  const ahead = open.filter((a) => dir < 0 || a !== (dir + 2) % 4)\n  return ahead.length ? ahead : open\n}\n/** Steps from every cell to a goal: a breadth-first search outwards from the goal. */\nfunction distancesTo(m, [gx, gy]) {\n  const d = new Map([[gx + \',\' + gy, 0]]), q = [[gx, gy]]\n  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of DIRS) { const k = (x + dx) + \',\' + (y + dy); if (!d.has(k) && !m.wall(x + dx, y + dy)) { d.set(k, d.get(x + \',\' + y) + 1); q.push([x + dx, y + dy]) } } }\n  return ([x, y]) => d.get(x + \',\' + y) ?? Infinity\n}\n/** One hunt: the ghost chooses with choose(state, legal, ghost, player, maze) until it catches the player or 150 steps\n *  pass. Returns the return the agent gets: −1 a step, +20 for the catch. learn(s, a, r, s2, legal2, end) if given. */\nfunction hunt(m, choose, rand, { still = false, learn = null } = {}) {\n  let g = [...m.ghost], gd = -1, p = [...m.player], pd = -1, total = 0\n  const state = () => { const sx = Math.sign(p[0] - g[0]) + 1, sy = Math.sign(p[1] - g[1]) + 1; return sx * 3 + sy }   // 9 states\n  for (let t = 0; t < 150; t++) {\n    const s = state(), legal = ways(m, g, gd), a = choose(s, legal, g, p, m)\n    g = [g[0] + DIRS[a][0], g[1] + DIRS[a][1]]; gd = a\n    let r = -1, end = g[0] === p[0] && g[1] === p[1]\n    if (!end && !still && rand() < 6 / 7) { const w = ways(m, p, pd), b = w[Math.floor(rand() * w.length)]; p = [p[0] + DIRS[b][0], p[1] + DIRS[b][1]]; pd = b; end = g[0] === p[0] && g[1] === p[1] }\n    if (end) r += 20\n    total += r\n    if (learn) learn(s, a, r, state(), ways(m, g, gd), end)\n    if (end) break\n  }\n  return total\n}\nconst randomGhost = (rand) => (s, legal) => legal[Math.floor(rand() * legal.length)]\nconst planningGhost = (s, legal, g, p, m) => { const far = distancesTo(m, p); return legal.reduce((b, a) => (far([g[0] + DIRS[a][0], g[1] + DIRS[a][1]]) < far([g[0] + DIRS[b][0], g[1] + DIRS[b][1]]) ? a : b)) }\n/** Q-learning with legal moves: a table of 9 states × 4 directions. */\nfunction trainGhost(m, episodes, seed, opts = {}) {\n  const rand = seeded(seed), Q = Array.from({ length: 9 }, () => [0, 0, 0, 0])\n  const best = (s, legal) => { const top = Math.max(...legal.map((a) => Q[s][a])), ties = legal.filter((a) => Q[s][a] === top); return ties[Math.floor(rand() * ties.length)] }\n  for (let e = 0; e < episodes; e++) {\n    const eps = 0.3 + (0.02 - 0.3) * e / Math.max(1, episodes - 1)\n    hunt(m, (s, legal) => (rand() < eps ? legal[Math.floor(rand() * legal.length)] : best(s, legal)), rand, { ...opts, learn: (s, a, r, s2, legal2, end) => {\n      Q[s][a] += 0.2 * (r + (end ? 0 : 0.97 * Math.max(...legal2.map((b) => Q[s2][b]))) - Q[s][a])\n    } })\n  }\n  return Q\n}\nconst greedyGhost = (Q) => (s, legal) => legal.reduce((b, a) => (Q[s][a] > Q[s][b] ? a : b))\n/** The average return over the same 200 hunts. */\nfunction judge(m, choose, opts = {}) { const rand = seeded(99); let t = 0; for (let k = 0; k < 200; k++) t += hunt(m, typeof choose === \'function\' && choose.length === 1 ? choose(rand) : choose, rand, opts); return t / 200 }\nconst maze = mazeOf(["#####################","#.........#.........#","#.##.###..#..###.##.#","#...................#","#.##.#.###.###.#.##.#","#....#...#G#...#....#","####.###.....###.####","#........#G#........#","#.##.###.....###.##.#","#...#.....P.....#...#","###.#.###.#.###.#.###","#.........#.........#","#####################"])\n\n// What it sees: 9 states, where the player is from it (left, level or right; above, level or below). What it earns:\n// −1 a step, +20 for the catch. Its opponent while it trains: the wandering player (a scripted opponent).\n// Predict first: random play, and after 50, 100 and 300 hunts of Q-learning, the average return over 200 hunts?\nconsole.log(\'random ghost:      \' + judge(maze, randomGhost).toFixed(1))\nfor (const n of [50, 100, 300]) console.log(\'after \' + String(n).padEnd(3) + \' hunts:   \' + judge(maze, greedyGhost(trainGhost(maze, n, 3))).toFixed(1) + \'  (\' + (20 - judge(maze, greedyGhost(trainGhost(maze, n, 3)))).toFixed(1) + \' steps a catch)\')\nconsole.log(\'planning (a breadth-first search, lesson 9.10): \' + judge(maze, planningGhost).toFixed(1))',
              },
              {
                type: 'js',
                instruction: '### 3. What it learned\nPredict first: the player below and left.',
                startCode: '// Ghost Lab on a grid: the maze as text (# a wall), a ghost and a player that move one cell a step. The ghost\n// never turns straight back unless it must (as in Pac-Man). The player wanders: at each cell a random open way,\n// not straight back, and it moves 6 steps in 7 (it is a little slower than the ghost).\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]   // up, right, down, left\nfunction mazeOf(rows) {\n  const at = (ch) => { const y = rows.findIndex((r) => r.includes(ch)); return [rows[y].indexOf(ch), y] }\n  return { rows, wall: (x, y) => rows[y][x] === \'#\', player: at(\'P\'), ghost: at(\'G\') }\n}\n/** The ways from a cell, not straight back (dir: the way it came) unless there is no other. */\nfunction ways(m, [x, y], dir) {\n  const open = [0, 1, 2, 3].filter((a) => !m.wall(x + DIRS[a][0], y + DIRS[a][1]))\n  const ahead = open.filter((a) => dir < 0 || a !== (dir + 2) % 4)\n  return ahead.length ? ahead : open\n}\n/** Steps from every cell to a goal: a breadth-first search outwards from the goal. */\nfunction distancesTo(m, [gx, gy]) {\n  const d = new Map([[gx + \',\' + gy, 0]]), q = [[gx, gy]]\n  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of DIRS) { const k = (x + dx) + \',\' + (y + dy); if (!d.has(k) && !m.wall(x + dx, y + dy)) { d.set(k, d.get(x + \',\' + y) + 1); q.push([x + dx, y + dy]) } } }\n  return ([x, y]) => d.get(x + \',\' + y) ?? Infinity\n}\n/** One hunt: the ghost chooses with choose(state, legal, ghost, player, maze) until it catches the player or 150 steps\n *  pass. Returns the return the agent gets: −1 a step, +20 for the catch. learn(s, a, r, s2, legal2, end) if given. */\nfunction hunt(m, choose, rand, { still = false, learn = null } = {}) {\n  let g = [...m.ghost], gd = -1, p = [...m.player], pd = -1, total = 0\n  const state = () => { const sx = Math.sign(p[0] - g[0]) + 1, sy = Math.sign(p[1] - g[1]) + 1; return sx * 3 + sy }   // 9 states\n  for (let t = 0; t < 150; t++) {\n    const s = state(), legal = ways(m, g, gd), a = choose(s, legal, g, p, m)\n    g = [g[0] + DIRS[a][0], g[1] + DIRS[a][1]]; gd = a\n    let r = -1, end = g[0] === p[0] && g[1] === p[1]\n    if (!end && !still && rand() < 6 / 7) { const w = ways(m, p, pd), b = w[Math.floor(rand() * w.length)]; p = [p[0] + DIRS[b][0], p[1] + DIRS[b][1]]; pd = b; end = g[0] === p[0] && g[1] === p[1] }\n    if (end) r += 20\n    total += r\n    if (learn) learn(s, a, r, state(), ways(m, g, gd), end)\n    if (end) break\n  }\n  return total\n}\nconst randomGhost = (rand) => (s, legal) => legal[Math.floor(rand() * legal.length)]\nconst planningGhost = (s, legal, g, p, m) => { const far = distancesTo(m, p); return legal.reduce((b, a) => (far([g[0] + DIRS[a][0], g[1] + DIRS[a][1]]) < far([g[0] + DIRS[b][0], g[1] + DIRS[b][1]]) ? a : b)) }\n/** Q-learning with legal moves: a table of 9 states × 4 directions. */\nfunction trainGhost(m, episodes, seed, opts = {}) {\n  const rand = seeded(seed), Q = Array.from({ length: 9 }, () => [0, 0, 0, 0])\n  const best = (s, legal) => { const top = Math.max(...legal.map((a) => Q[s][a])), ties = legal.filter((a) => Q[s][a] === top); return ties[Math.floor(rand() * ties.length)] }\n  for (let e = 0; e < episodes; e++) {\n    const eps = 0.3 + (0.02 - 0.3) * e / Math.max(1, episodes - 1)\n    hunt(m, (s, legal) => (rand() < eps ? legal[Math.floor(rand() * legal.length)] : best(s, legal)), rand, { ...opts, learn: (s, a, r, s2, legal2, end) => {\n      Q[s][a] += 0.2 * (r + (end ? 0 : 0.97 * Math.max(...legal2.map((b) => Q[s2][b]))) - Q[s][a])\n    } })\n  }\n  return Q\n}\nconst greedyGhost = (Q) => (s, legal) => legal.reduce((b, a) => (Q[s][a] > Q[s][b] ? a : b))\n/** The average return over the same 200 hunts. */\nfunction judge(m, choose, opts = {}) { const rand = seeded(99); let t = 0; for (let k = 0; k < 200; k++) t += hunt(m, typeof choose === \'function\' && choose.length === 1 ? choose(rand) : choose, rand, opts); return t / 200 }\nconst maze = mazeOf(["#####################","#.........#.........#","#.##.###..#..###.##.#","#...................#","#.##.#.###.###.#.##.#","#....#...#G#...#....#","####.###.....###.####","#........#G#........#","#.##.###.....###.##.#","#...#.....P.....#...#","###.#.###.#.###.#.###","#.........#.........#","#####################"])\n\n// What it learned: in each of the 9 states, the way it values most. Predict first: when the player is below and to\n// the left, which way?\nconst Q = trainGhost(maze, 300, 3), NAMES = [\'up\', \'right\', \'down\', \'left\']\nconst where = (s) => [\'left\', \'level\', \'right\'][Math.floor(s / 3)] + \', \' + [\'above\', \'level\', \'below\'][s % 3]\nfor (let s = 0; s < 9; s++) {\n  const order = [0, 1, 2, 3].sort((a, b) => Q[s][b] - Q[s][a])\n  console.log(\'player \' + where(s).padEnd(15) + \' prefers \' + order.map((a) => NAMES[a] + \' \' + Q[s][a].toFixed(1)).join(\', \'))\n}',
              },
              {
                type: 'js',
                instruction: '### 4. One brain, two ghosts\nPredict first: how much faster.',
                startCode: '// Ghost Lab on a grid: the maze as text (# a wall), a ghost and a player that move one cell a step. The ghost\n// never turns straight back unless it must (as in Pac-Man). The player wanders: at each cell a random open way,\n// not straight back, and it moves 6 steps in 7 (it is a little slower than the ghost).\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]   // up, right, down, left\nfunction mazeOf(rows) {\n  const at = (ch) => { const y = rows.findIndex((r) => r.includes(ch)); return [rows[y].indexOf(ch), y] }\n  return { rows, wall: (x, y) => rows[y][x] === \'#\', player: at(\'P\'), ghost: at(\'G\') }\n}\n/** The ways from a cell, not straight back (dir: the way it came) unless there is no other. */\nfunction ways(m, [x, y], dir) {\n  const open = [0, 1, 2, 3].filter((a) => !m.wall(x + DIRS[a][0], y + DIRS[a][1]))\n  const ahead = open.filter((a) => dir < 0 || a !== (dir + 2) % 4)\n  return ahead.length ? ahead : open\n}\n/** Steps from every cell to a goal: a breadth-first search outwards from the goal. */\nfunction distancesTo(m, [gx, gy]) {\n  const d = new Map([[gx + \',\' + gy, 0]]), q = [[gx, gy]]\n  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of DIRS) { const k = (x + dx) + \',\' + (y + dy); if (!d.has(k) && !m.wall(x + dx, y + dy)) { d.set(k, d.get(x + \',\' + y) + 1); q.push([x + dx, y + dy]) } } }\n  return ([x, y]) => d.get(x + \',\' + y) ?? Infinity\n}\n/** One hunt: the ghost chooses with choose(state, legal, ghost, player, maze) until it catches the player or 150 steps\n *  pass. Returns the return the agent gets: −1 a step, +20 for the catch. learn(s, a, r, s2, legal2, end) if given. */\nfunction hunt(m, choose, rand, { still = false, learn = null } = {}) {\n  let g = [...m.ghost], gd = -1, p = [...m.player], pd = -1, total = 0\n  const state = () => { const sx = Math.sign(p[0] - g[0]) + 1, sy = Math.sign(p[1] - g[1]) + 1; return sx * 3 + sy }   // 9 states\n  for (let t = 0; t < 150; t++) {\n    const s = state(), legal = ways(m, g, gd), a = choose(s, legal, g, p, m)\n    g = [g[0] + DIRS[a][0], g[1] + DIRS[a][1]]; gd = a\n    let r = -1, end = g[0] === p[0] && g[1] === p[1]\n    if (!end && !still && rand() < 6 / 7) { const w = ways(m, p, pd), b = w[Math.floor(rand() * w.length)]; p = [p[0] + DIRS[b][0], p[1] + DIRS[b][1]]; pd = b; end = g[0] === p[0] && g[1] === p[1] }\n    if (end) r += 20\n    total += r\n    if (learn) learn(s, a, r, state(), ways(m, g, gd), end)\n    if (end) break\n  }\n  return total\n}\nconst randomGhost = (rand) => (s, legal) => legal[Math.floor(rand() * legal.length)]\nconst planningGhost = (s, legal, g, p, m) => { const far = distancesTo(m, p); return legal.reduce((b, a) => (far([g[0] + DIRS[a][0], g[1] + DIRS[a][1]]) < far([g[0] + DIRS[b][0], g[1] + DIRS[b][1]]) ? a : b)) }\n/** Q-learning with legal moves: a table of 9 states × 4 directions. */\nfunction trainGhost(m, episodes, seed, opts = {}) {\n  const rand = seeded(seed), Q = Array.from({ length: 9 }, () => [0, 0, 0, 0])\n  const best = (s, legal) => { const top = Math.max(...legal.map((a) => Q[s][a])), ties = legal.filter((a) => Q[s][a] === top); return ties[Math.floor(rand() * ties.length)] }\n  for (let e = 0; e < episodes; e++) {\n    const eps = 0.3 + (0.02 - 0.3) * e / Math.max(1, episodes - 1)\n    hunt(m, (s, legal) => (rand() < eps ? legal[Math.floor(rand() * legal.length)] : best(s, legal)), rand, { ...opts, learn: (s, a, r, s2, legal2, end) => {\n      Q[s][a] += 0.2 * (r + (end ? 0 : 0.97 * Math.max(...legal2.map((b) => Q[s2][b]))) - Q[s][a])\n    } })\n  }\n  return Q\n}\nconst greedyGhost = (Q) => (s, legal) => legal.reduce((b, a) => (Q[s][a] > Q[s][b] ? a : b))\n/** The average return over the same 200 hunts. */\nfunction judge(m, choose, opts = {}) { const rand = seeded(99); let t = 0; for (let k = 0; k < 200; k++) t += hunt(m, typeof choose === \'function\' && choose.length === 1 ? choose(rand) : choose, rand, opts); return t / 200 }\nconst maze = mazeOf(["#####################","#.........#.........#","#.##.###..#..###.##.#","#...................#","#.##.#.###.###.#.##.#","#....#...#G#...#....#","####.###.....###.####","#........#G#........#","#.##.###.....###.##.#","#...#.....P.....#...#","###.#.###.#.###.#.###","#.........#.........#","#####################"])\n\n// One brain, many NPCs: two ghosts using the same table, both hunting. Predict first: how much faster do two catch\n// than one? (A hunt ends when either catches.)\nfunction huntTwo(m, choose, rand) {\n  const gs = [{ g: [...m.ghost], d: -1 }, { g: [m.ghost[0], m.ghost[1] + 2], d: -1 }]\n  let p = [...m.player], pd = -1\n  for (let t = 1; t <= 150; t++) {\n    for (const x of gs) { const s = (Math.sign(p[0] - x.g[0]) + 1) * 3 + Math.sign(p[1] - x.g[1]) + 1, a = choose(s, ways(m, x.g, x.d), x.g, p, m); x.g = [x.g[0] + DIRS[a][0], x.g[1] + DIRS[a][1]]; x.d = a }\n    if (gs.some((x) => x.g[0] === p[0] && x.g[1] === p[1])) return t\n    if (rand() < 6 / 7) { const w = ways(m, p, pd), b = w[Math.floor(rand() * w.length)]; p = [p[0] + DIRS[b][0], p[1] + DIRS[b][1]]; pd = b }\n    if (gs.some((x) => x.g[0] === p[0] && x.g[1] === p[1])) return t\n  }\n  return 150\n}\nconst Q = trainGhost(maze, 300, 3), rand = seeded(99)\nlet one = 0, two = 0\nfor (let k = 0; k < 200; k++) one += 20 - hunt(maze, greedyGhost(Q), rand)\nconst rand2 = seeded(99)\nfor (let k = 0; k < 200; k++) two += huntTwo(maze, greedyGhost(Q), rand2)\nconsole.log(\'one ghost: \' + (one / 200).toFixed(1) + \' steps a catch; two ghosts sharing its brain: \' + (two / 200).toFixed(1))',
              },
              {
                type: 'challenge',
                instruction: '### 5. Challenge: the ways\nSix cells check it.',
                startCode: "const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]\nconst rows = ['#####', '#...#', '#.#.#', '#...#', '#####'], m = { wall: (x, y) => rows[y][x] === '#' }\n// Challenge: write ways(m, cell, dir): the open directions from cell (0 up, 1 right, 2 down, 3 left), leaving out\n// straight back (the opposite of dir, which is −1 at the start) unless no other way is open.\nfunction ways(m, [x, y], dir) {\n  return [0, 1, 2, 3]   // your code\n}\nconst cases = [[[1, 1], -1, [1, 2]], [[1, 1], 3, [2]], [[2, 1], 1, [1]], [[2, 1], 3, [3]], [[1, 2], 2, [2]], [[3, 3], 1, [0]]]\nlet ok = 0\nfor (const [cell, dir, want] of cases) { const got = ways(m, cell, dir); if (JSON.stringify(got) === JSON.stringify(want)) ok++; else console.log('ways at ' + JSON.stringify(cell) + ' coming ' + dir + ': ' + JSON.stringify(got) + ', should be ' + JSON.stringify(want)) }\nconsole.log(ok === cases.length ? '✓ All 6 cells right.' : ok + ' of 6 right.')",
                solutionCode: "const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]\nconst rows = ['#####', '#...#', '#.#.#', '#...#', '#####'], m = { wall: (x, y) => rows[y][x] === '#' }\n// Challenge: write ways(m, cell, dir): the open directions from cell (0 up, 1 right, 2 down, 3 left), leaving out\n// straight back (the opposite of dir, which is −1 at the start) unless no other way is open.\nfunction ways(m, [x, y], dir) {\n  const open = [0, 1, 2, 3].filter((a) => !m.wall(x + DIRS[a][0], y + DIRS[a][1]))\n  const ahead = open.filter((a) => dir < 0 || a !== (dir + 2) % 4)\n  return ahead.length ? ahead : open\n}\nconst cases = [[[1, 1], -1, [1, 2]], [[1, 1], 3, [2]], [[2, 1], 1, [1]], [[2, 1], 3, [3]], [[1, 2], 2, [2]], [[3, 3], 1, [0]]]\nlet ok = 0\nfor (const [cell, dir, want] of cases) { const got = ways(m, cell, dir); if (JSON.stringify(got) === JSON.stringify(want)) ok++; else console.log('ways at ' + JSON.stringify(cell) + ' coming ' + dir + ': ' + JSON.stringify(got) + ', should be ' + JSON.stringify(want)) }\nconsole.log(ok === cases.length ? '✓ All 6 cells right.' : ok + ' of 6 right.')",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'A ghost that learns to hunt',
        props: {
          task: 'ghost-agent',
          lesson: 'mg9-009',
          checkpoint: 'cp-mg9-009-4',
        },
      },
    ],
  },

  math: {
    prose: [
      "**Under the hood (optional).** With legal moves $A(s)$, ε-greedy chooses uniformly among $A(s)$ with probability ε, and the target is $r + \\gamma \\max_{a' \\in A(s')} Q(s', a')$. Illegal moves are never tried and never valued.",
      'With −1 a step and +20 for the catch and $\\gamma$ near 1, the return of a hunt is about $20 - T$ for a catch after $T$ steps: maximising return is minimising time to catch.',
      "Many NPCs using one policy is parameter sharing: each one's experience, if used in training, would update the same table, which is how multi-agent systems learn from a crowd faster than from one.",
    ],
    equations: [
      {
        label: 'Return of a hunt',
        latex: 'G \\approx 20 - T',
      },
      {
        label: 'Masked target',
        latex: "r + \\gamma \\max_{a' \\in A(s')} Q(s', a')",
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      "From the ghost's side the wandering player is part of the environment; the learned policy is a good response to that environment, not to every player.",
      'Nine states are far from the Markov property: the ghost cannot see walls, so the same state needs different moves in different places. It learns the best move on average over the places each state covers.',
      'Where it goes: 9.10 compares learning with planning; 9.11 gives the second ghost a job of its own.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg9-009-ex1',
      title: 'A state',
      difficulty: 'easy',
      problem: 'The player is 3 cells left and 2 cells below the ghost. Which state?',
      steps: [
        {
          expression: '(\\text{left}, \\text{below})',
          annotation: 'Only the signs matter with these bins.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'Player left, below (state 2 of 0–8).',
    },
    {
      id: 'mg9-009-ex2',
      title: 'Legal ways',
      difficulty: 'medium',
      problem: 'At a T junction, open up, left and right, the ghost arrived going right. Its legal moves?',
      steps: [
        {
          expression: '\\{\\text{up}, \\text{left}, \\text{right}\\} \\setminus \\{\\text{left}\\}',
          annotation: 'Left is straight back.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'Up and right.',
    },
    {
      id: 'mg9-009-ex3',
      title: 'Two ghosts',
      difficulty: 'hard',
      problem: 'Why do two ghosts sharing a brain catch twice as fast, though neither is smarter?',
      steps: [
        {
          expression: 'T_{2} \\approx T_{1} / 2',
          annotation: 'Two hunters cover the maze from two places.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'Two hunters start from two places and close in from more sides: 4.9 steps against 10.0 (cell 4).',
    },
  ],

  challenges: [
    {
      id: 'mg9-009-ch1',
      title: 'Why no reversing',
      difficulty: 'easy',
      problem: 'What would happen without the no-reverse rule?',
      hint: 'Two equal moves.',
      answer: 'It could flip back and forth between two cells when two directions look equally good.',
      walkthrough: [],
    },
    {
      id: 'mg9-009-ch2',
      title: 'A smarter opponent',
      difficulty: 'medium',
      problem: 'Change the practice partner so it runs away from the ghost. What do you expect to happen to training?',
      hint: 'A harder opponent.',
      answer: 'Catches take longer and some hunts time out; the ghost learns to corner rather than chase, and needs more hunts.',
      walkthrough: [],
    },
    {
      id: 'mg9-009-ch3',
      title: 'Your own NPC',
      difficulty: 'hard',
      problem: 'A guard that should learn to patrol near treasure and intercept thieves. When does it decide, what are its legal moves, and what is its practice partner?',
      hint: 'The procedure.',
      answer: 'At each tile (legal: open neighbours), seeing thief and treasure relative to it; reward −1 a step, +big for an intercept, −big if the thief reaches the treasure; a scripted thief that heads for the treasure.',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'legalActions()',
        meaning: 'At a junction, the open ways, not back; between cells, none.',
      },
      {
        symbol: 'ai.training',
        meaning: 'True while it trains: the player script plays itself.',
      },
      {
        symbol: 'scripted opponent',
        meaning: 'The practice partner that plays the other side in training.',
      },
      {
        symbol: 'brain field',
        meaning: 'Every NPC naming the same brain uses it.',
      },
    ],
    rulesOfThumb: [
      'Decide at natural moments.',
      'Mask what cannot be done.',
      'Practise against something like real play.',
      'Train one, run many.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'Each NPC needs its own training.',
      whyStudentsThinkIt: 'Each acts on its own.',
      correctionExample: 'Both ghosts use one brain (cell 4).',
      contrastCase: 'An NPC with a different job needs its own (9.11).',
    },
    {
      falseBelief: 'A learned ghost knows the maze.',
      whyStudentsThinkIt: 'It catches the player.',
      correctionExample: 'It sees only the direction to the player; it learned which direction to try first.',
      contrastCase: 'The planner of 9.10 knows the maze exactly.',
    },
  ],

  transferPrompts: [
    {
      situation: "A racing game's opponents.",
      competingTechniques: ['A separate brain per car', 'One brain shared by every opponent car'],
      whyThisTechniqueWins: 'One training run, a full grid of drivers.',
    },
    {
      situation: 'Training an enemy before your game has players.',
      competingTechniques: ['Wait for players', 'A scripted player under ai.training'],
      whyThisTechniqueWins: 'It can learn today, and you control what it practises against.',
    },
  ],

  debugging: [
    {
      commonError: 'legalActions() returns ways between cells.',
      symptom: 'The ghost turns mid-corridor, or the engine acts every frame.',
      whyItHappened: 'It should only decide at cell centres.',
      repairStrategy: 'Return [] unless it is deciding at a centre.',
    },
    {
      commonError: 'Both ghosts hunt during training.',
      symptom: 'Rewards are noisy; the trainee sometimes gets no catch at all.',
      whyItHappened: 'The other ghost catches the player first.',
      repairStrategy: 'Rest the others under ai.training.',
    },
    {
      commonError: 'The player script reads keys in training.',
      symptom: 'The player never moves; the ghost learns to catch a statue.',
      whyItHappened: 'No keys are pressed in training.',
      repairStrategy: 'Under ai.training, the player script plays itself.',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Make an NPC a learning agent with legal moves and a practice partner.',
    explainVerbally: 'Explain turn-based NPC decisions, scripted opponents and shared brains.',
    detectIncorrectApplication: 'Spot decisions between cells, keys read in training, everyone hunting during training.',
    transferToUnfamiliar: 'Design a learning NPC for another game.',
  },

  assessment: {
    questions: [
      {
        id: 'mg9-009-assess-1',
        type: 'choice',
        text: "In training, Ghost Lab's player is",
        options: ['A scripted wanderer', 'You', 'Another ghost', 'Still'],
        answer: 'A scripted wanderer',
        hint: 'A scripted opponent.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg9-009-quiz-1',
      type: 'choice',
      text: 'After going up from its start, the ghost may go',
      options: ['Only up', 'Up or down', 'Any way', 'Down'],
      answer: 'Only up',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg9-009-quiz-2',
      type: 'choice',
      text: 'A random ghost earns about',
      options: ['−75', '10', '0', '−10'],
      answer: '−75',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg9-009-quiz-3',
      type: 'choice',
      text: 'After 300 hunts it catches in about',
      options: ['10 steps', '50 steps', '2 steps', '150 steps'],
      answer: '10 steps',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg9-009-quiz-4',
      type: 'choice',
      text: 'With the player left and level, it prefers',
      options: ['Left', 'Up', 'Right', 'Down'],
      answer: 'Left',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg9-009-quiz-5',
      type: 'choice',
      text: 'Two ghosts sharing its brain catch in about',
      options: ['4.9 steps', '10 steps', '20 steps', '1 step'],
      answer: '4.9 steps',
      hints: ['Cell 4.'],
      reviewSection: 'Cell 4',
    },
    {
      id: 'mg9-009-quiz-6',
      type: 'choice',
      text: 'Both ghosts use one brain because',
      options: [
        'They share a script whose brain field names it',
        'The engine copies it',
        'They train together',
        'Ghosts always share',
      ],
      answer: 'They share a script whose brain field names it',
      hints: ['One brain, many ghosts.'],
      reviewSection: 'Intuition — one brain',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg9-009-1',
      label: 'Read when it decides, and what it sees, does and earns',
      type: 'read',
    },
    {
      id: 'cp-mg9-009-2',
      label: 'Read the scripted opponent and shared brains',
      type: 'read',
    },
    {
      id: 'cp-mg9-009-3',
      label: 'Run the notebook',
      type: 'read',
    },
    {
      id: 'cp-mg9-009-4',
      label: 'Complete "A ghost that learns to hunt" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg9-009-5',
      label: 'Read what it learned',
      type: 'read',
    },
    {
      id: 'cp-mg9-009-6',
      label: 'Work through legal ways',
      type: 'example',
    },
    {
      id: 'cp-mg9-009-7',
      label: 'Work through two ghosts',
      type: 'example',
    },
    {
      id: 'cp-mg9-009-8',
      label: 'Pass the ways challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-9',
}
