export default {
  order: 11,

  id: 'mg9-011',

  slug: 'capstone-your-own-learning-npc',

  title: 'Capstone: Your Own Learning NPC',

  subtitle: 'The whole recipe on a game built from scratch, a reward that teaches the wrong thing, and a team of two NPCs with different jobs, measured.',

  tags: [
    'game-studio',
    'machine-learning',
    'reinforcement-learning',
    'npc',
    'game-ai',
    'reward-design',
    'multi-agent',
    'capstone',
  ],

  aliases: 'capstone recipe checklist learning npc from scratch fetch reward design reward hacking specification gaming team multi agent roles ambusher chaser measure',

  timeToComplete: 75,

  coreConcept: 'Applying learning to any game is the same six decisions: when the NPC decides and what it may do (legal moves); what it sees (relative, few, scaled); what it earns (what you actually want, with a cost per step); when an episode ends; a practice partner for ai.training; and then train, measure against random play and a hand-written baseline on the same seeds, and ship the brain. The reward is the riskiest: an agent learns exactly what it is paid for, so paying for a step towards the goal instead of the goal gets you the step and not the goal. With several NPCs, each job needs its own observation and brain, and whether a team of different jobs beats copies of one must be measured, not assumed.',

  prerequisites: ['mg9-010'],

  nextLesson: 'mg10-001',

  hook: {
    question: 'You have seen a paddle, a walker, a ghost and a card player learn. Could you give a learning NPC to a game nobody has built yet, and know it works, and know when it has learned the wrong thing?',
    realWorldContext: 'Every learning system in games, robotics or recommendation is built from these decisions, and most failures are in the reward: agents that loop to collect a bonus, or find a scoring bug instead of the goal. Teams of agents with roles (attackers and defenders, scouts and hunters) are where game AI is heading, and where measuring matters most.',
  },

  intuition: {
    prose: [
      '**The recipe, from scratch.** Cell 1 builds a game nobody has made before, Fetch: a 7 × 7 field with two bushes, a ball thrown somewhere, and a dog that must bring it back to its kennel. Every decision is written out. (1) It decides every step, and its legal moves keep it on the field and out of the bushes. (2) It sees whether it has the ball, and which way its goal is: the ball, or the kennel once it has the ball (18 states). (3) It earns −1 a step and +10 when the ball is home. (4) An episode ends when the ball is home, or after 60 steps. (5) Q-learning with legal moves, 500 games. (6) Measure on the same 200 throws: a random dog gets the ball home 8 times in 200; the trained dog every time, 200 of 200.',
      '**What it sees changes with the task.** The dog\'s goal switches when it picks up the ball, so its observation does too: one of the 18 states is "has the ball" plus the direction home. A good observation is about what decides the next move now, not everything about the world.',
      '**A reward that teaches the wrong thing.** Pay the dog +10 for picking up the ball, and nothing else: no cost per step, nothing for bringing it home. It learns exactly that: fetch, then wander. It gets the ball home 14 times in 200, by accident (cell 2). Agents find the cheapest way to what they are paid for; if that is not what you want, it will not do what you want. Pay for the outcome (home), and charge for time.',
      '**Checks before training.** Before training, check random play scores badly (it did: −58.6), that the reward adds up to what you want over an episode, and that the episode can end. After training, watch it play, not just the number: a high score from the wrong behaviour shows up at once on screen.',
      '**A team.** Two ghosts can share one brain (lesson 9.9), or have different jobs, each with its own observation and brain: a chaser aims at the player; an ambusher aims four cells ahead of where the player is heading, to cut it off. In code the ambusher is the same class with a different observe() and brain field (the Try it does exactly that, as a subclass). Cell 3 measures it. Two chasers sharing one brain catch in 4.9 steps; the chaser with a trained ambusher takes 10.1 steps after 400 hunts and 6.7 after 1,500. The ambusher sounds cleverer and, in this small maze with nine coarse states, is not: a second chaser is better. Measure team designs on the same seeds before you believe them.',
      "**For your own games.** The pattern is the same everywhere: an enemy (sees the player relative to it, earns for reaching or hurting it, a scripted player to practise on); a teammate (sees the player and the enemies, earns for the team's outcome); a playtester (earns for reaching new places or breaking things). Write the hand-made version first, then learn where it falls short, and measure both.",
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: a learning NPC for any game',
        body: 'Step 1. When it decides; its legal moves. Step 2. What it sees: relative, few, scaled, what decides the move. Step 3. What it earns: the outcome you want, a cost per step, failure costly. Step 4. When an episode ends. Step 5. A scripted practice partner under ai.training. Step 6. Check random play scores badly. Step 7. Train; measure against random and a hand-written NPC on the same seeds; watch it play. Step 8. Save the brain; name it in every NPC that should use it.',
      },
      {
        type: 'warning',
        title: 'You get what you pay for',
        body: '+10 for the pickup made a dog that fetches and wanders: 14 of 200 home (cell 2). Reward the outcome itself, not a step on the way to it.',
      },
      {
        type: 'insight',
        title: 'Roles are a design choice to measure',
        body: "A chaser and an ambusher is a classic idea (Pac-Man's ghosts each have one). With these features in this maze it lost to two chasers (cell 3). Different jobs need observations good enough to do them, and enough training: measure.",
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: the recipe on a new game, and a team',
        caption: 'Fetch from scratch, a reward bug, and a chaser with an ambusher against two chasers.',
        props: {
          lesson: {
            title: 'Your own learning NPC',
            subtitle: 'Every decision, then measured.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. Fetch, from scratch\nPredict first: random against trained.',
                startCode: "const seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// Fetch, a new game: a 7 × 7 field with two bushes (#). A ball lands somewhere; the dog starts at its kennel (K) and\n// must bring the ball back. Every design choice of the recipe, from scratch:\nconst FIELD = ['K......', '.......', '..#....', '.......', '....#..', '.......', '.......']\nconst DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]\n// 1. When does it decide, and what may it do? Every step; the moves that stay on the field and off the bushes.\nconst legal = ([x, y]) => [0, 1, 2, 3].filter((a) => { const nx = x + DIRS[a][0], ny = y + DIRS[a][1]; return nx >= 0 && ny >= 0 && nx < 7 && ny < 7 && FIELD[ny][nx] !== '#' })\n// 2. What does it see? Whether it has the ball, and which way its goal is (the ball, or the kennel once it has it):\n//    left/level/right × up/level/down × has ball = 18 states.\nfunction state(dog, ball, has) { const goal = has ? [0, 0] : ball; return (has ? 9 : 0) + (Math.sign(goal[0] - dog[0]) + 1) * 3 + Math.sign(goal[1] - dog[1]) + 1 }\n// 3. What does it earn? reward(…) is a parameter, so cell 2 can try a wrong one.\n// 4. When is it over? The ball is home, or 60 steps pass.\nfunction play(choose, rand, reward, learn) {\n  let dog = [0, 0], has = false, total = 0, delivered = false\n  let ball; do { ball = [Math.floor(rand() * 7), Math.floor(rand() * 7)] } while (FIELD[ball[1]][ball[0]] !== '.' || (ball[0] < 2 && ball[1] < 2))\n  for (let t = 0; t < 60 && !delivered; t++) {\n    const s = state(dog, ball, has), a = choose(s, legal(dog))\n    dog = [dog[0] + DIRS[a][0], dog[1] + DIRS[a][1]]\n    const picked = !has && dog[0] === ball[0] && dog[1] === ball[1]\n    if (picked) has = true\n    delivered = has && dog[0] === 0 && dog[1] === 0\n    const r = reward(picked, delivered)\n    total += r\n    if (learn) learn(s, a, r, state(dog, ball, has), legal(dog), delivered)\n  }\n  return { total, delivered }\n}\n// 5. Train (Q-learning with legal moves), and 6. measure against random play on the same 200 games.\nfunction train(reward, episodes = 500) {\n  const rand = seeded(1), Q = Array.from({ length: 18 }, () => [0, 0, 0, 0])\n  const best = (s, l) => { const top = Math.max(...l.map((a) => Q[s][a])), ties = l.filter((a) => Q[s][a] === top); return ties[Math.floor(rand() * ties.length)] }\n  for (let e = 0; e < episodes; e++) { const eps = 0.3 - 0.28 * e / (episodes - 1); play((s, l) => (rand() < eps ? l[Math.floor(rand() * l.length)] : best(s, l)), rand, reward, (s, a, r, s2, l2, end) => { Q[s][a] += 0.2 * (r + (end ? 0 : 0.97 * Math.max(...l2.map((b) => Q[s2][b]))) - Q[s][a]) }) }\n  return (s, l) => l.reduce((b, a) => (Q[s][a] > Q[s][b] ? a : b))\n}\nfunction measure(choose, reward) { const rand = seeded(42); let steps = 0, home = 0; for (let k = 0; k < 200; k++) { const r = play(choose.length === 1 ? choose(rand) : choose, rand, reward); home += r.delivered ? 1 : 0; steps += r.total } return { home, avg: steps / 200 } }\n\n// The reward: −1 a step, +10 when the ball is home. Predict first: how often does a random dog get the ball home in\n// 60 steps, and how often the trained one?\nconst reward = (picked, delivered) => -1 + (delivered ? 10 : 0)\nconst random = measure((rand) => (s, l) => l[Math.floor(rand() * l.length)], reward), trained = measure(train(reward), reward)\nconsole.log('random dog: home ' + random.home + ' of 200, average return ' + random.avg.toFixed(1))\nconsole.log('trained dog: home ' + trained.home + ' of 200, average return ' + trained.avg.toFixed(1))",
              },
              {
                type: 'js',
                instruction: '### 2. A reward that teaches the wrong thing\nPredict first: how often it brings the ball home.',
                startCode: 'const seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\n// Fetch, a new game: a 7 × 7 field with two bushes (#). A ball lands somewhere; the dog starts at its kennel (K) and\n// must bring the ball back. Every design choice of the recipe, from scratch:\nconst FIELD = [\'K......\', \'.......\', \'..#....\', \'.......\', \'....#..\', \'.......\', \'.......\']\nconst DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]\n// 1. When does it decide, and what may it do? Every step; the moves that stay on the field and off the bushes.\nconst legal = ([x, y]) => [0, 1, 2, 3].filter((a) => { const nx = x + DIRS[a][0], ny = y + DIRS[a][1]; return nx >= 0 && ny >= 0 && nx < 7 && ny < 7 && FIELD[ny][nx] !== \'#\' })\n// 2. What does it see? Whether it has the ball, and which way its goal is (the ball, or the kennel once it has it):\n//    left/level/right × up/level/down × has ball = 18 states.\nfunction state(dog, ball, has) { const goal = has ? [0, 0] : ball; return (has ? 9 : 0) + (Math.sign(goal[0] - dog[0]) + 1) * 3 + Math.sign(goal[1] - dog[1]) + 1 }\n// 3. What does it earn? reward(…) is a parameter, so cell 2 can try a wrong one.\n// 4. When is it over? The ball is home, or 60 steps pass.\nfunction play(choose, rand, reward, learn) {\n  let dog = [0, 0], has = false, total = 0, delivered = false\n  let ball; do { ball = [Math.floor(rand() * 7), Math.floor(rand() * 7)] } while (FIELD[ball[1]][ball[0]] !== \'.\' || (ball[0] < 2 && ball[1] < 2))\n  for (let t = 0; t < 60 && !delivered; t++) {\n    const s = state(dog, ball, has), a = choose(s, legal(dog))\n    dog = [dog[0] + DIRS[a][0], dog[1] + DIRS[a][1]]\n    const picked = !has && dog[0] === ball[0] && dog[1] === ball[1]\n    if (picked) has = true\n    delivered = has && dog[0] === 0 && dog[1] === 0\n    const r = reward(picked, delivered)\n    total += r\n    if (learn) learn(s, a, r, state(dog, ball, has), legal(dog), delivered)\n  }\n  return { total, delivered }\n}\n// 5. Train (Q-learning with legal moves), and 6. measure against random play on the same 200 games.\nfunction train(reward, episodes = 500) {\n  const rand = seeded(1), Q = Array.from({ length: 18 }, () => [0, 0, 0, 0])\n  const best = (s, l) => { const top = Math.max(...l.map((a) => Q[s][a])), ties = l.filter((a) => Q[s][a] === top); return ties[Math.floor(rand() * ties.length)] }\n  for (let e = 0; e < episodes; e++) { const eps = 0.3 - 0.28 * e / (episodes - 1); play((s, l) => (rand() < eps ? l[Math.floor(rand() * l.length)] : best(s, l)), rand, reward, (s, a, r, s2, l2, end) => { Q[s][a] += 0.2 * (r + (end ? 0 : 0.97 * Math.max(...l2.map((b) => Q[s2][b]))) - Q[s][a]) }) }\n  return (s, l) => l.reduce((b, a) => (Q[s][a] > Q[s][b] ? a : b))\n}\nfunction measure(choose, reward) { const rand = seeded(42); let steps = 0, home = 0; for (let k = 0; k < 200; k++) { const r = play(choose.length === 1 ? choose(rand) : choose, rand, reward); home += r.delivered ? 1 : 0; steps += r.total } return { home, avg: steps / 200 } }\n\n// A reward bug. Reward picking up the ball (+10) and nothing else: no cost per step, nothing for bringing it home.\n// Predict first: how often does this dog bring the ball home?\nconst wrong = (picked, delivered) => (picked ? 10 : 0), right = (picked, delivered) => -1 + (delivered ? 10 : 0)\nconst dog = train(wrong)\nconsole.log(\'trained on "+10 for the pickup": home \' + measure(dog, right).home + \' of 200\')\nconsole.log(\'trained on "−1 a step, +10 home":  home \' + measure(train(right), right).home + \' of 200\')\nconsole.log(\'it learned exactly what it was paid for: fetch, then wander\')',
              },
              {
                type: 'js',
                instruction: '### 3. A team\nPredict first: two chasers or a chaser and an ambusher.',
                startCode: '// Ghost Lab on a grid: the maze as text (# a wall), a ghost and a player that move one cell a step. The ghost\n// never turns straight back unless it must (as in Pac-Man). The player wanders: at each cell a random open way,\n// not straight back, and it moves 6 steps in 7 (it is a little slower than the ghost).\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]   // up, right, down, left\nfunction mazeOf(rows) {\n  const at = (ch) => { const y = rows.findIndex((r) => r.includes(ch)); return [rows[y].indexOf(ch), y] }\n  return { rows, wall: (x, y) => rows[y][x] === \'#\', player: at(\'P\'), ghost: at(\'G\') }\n}\n/** The ways from a cell, not straight back (dir: the way it came) unless there is no other. */\nfunction ways(m, [x, y], dir) {\n  const open = [0, 1, 2, 3].filter((a) => !m.wall(x + DIRS[a][0], y + DIRS[a][1]))\n  const ahead = open.filter((a) => dir < 0 || a !== (dir + 2) % 4)\n  return ahead.length ? ahead : open\n}\n/** Steps from every cell to a goal: a breadth-first search outwards from the goal. */\nfunction distancesTo(m, [gx, gy]) {\n  const d = new Map([[gx + \',\' + gy, 0]]), q = [[gx, gy]]\n  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of DIRS) { const k = (x + dx) + \',\' + (y + dy); if (!d.has(k) && !m.wall(x + dx, y + dy)) { d.set(k, d.get(x + \',\' + y) + 1); q.push([x + dx, y + dy]) } } }\n  return ([x, y]) => d.get(x + \',\' + y) ?? Infinity\n}\n/** One hunt: the ghost chooses with choose(state, legal, ghost, player, maze) until it catches the player or 150 steps\n *  pass. Returns the return the agent gets: −1 a step, +20 for the catch. learn(s, a, r, s2, legal2, end) if given. */\nfunction hunt(m, choose, rand, { still = false, learn = null } = {}) {\n  let g = [...m.ghost], gd = -1, p = [...m.player], pd = -1, total = 0\n  const state = () => { const sx = Math.sign(p[0] - g[0]) + 1, sy = Math.sign(p[1] - g[1]) + 1; return sx * 3 + sy }   // 9 states\n  for (let t = 0; t < 150; t++) {\n    const s = state(), legal = ways(m, g, gd), a = choose(s, legal, g, p, m)\n    g = [g[0] + DIRS[a][0], g[1] + DIRS[a][1]]; gd = a\n    let r = -1, end = g[0] === p[0] && g[1] === p[1]\n    if (!end && !still && rand() < 6 / 7) { const w = ways(m, p, pd), b = w[Math.floor(rand() * w.length)]; p = [p[0] + DIRS[b][0], p[1] + DIRS[b][1]]; pd = b; end = g[0] === p[0] && g[1] === p[1] }\n    if (end) r += 20\n    total += r\n    if (learn) learn(s, a, r, state(), ways(m, g, gd), end)\n    if (end) break\n  }\n  return total\n}\nconst randomGhost = (rand) => (s, legal) => legal[Math.floor(rand() * legal.length)]\nconst planningGhost = (s, legal, g, p, m) => { const far = distancesTo(m, p); return legal.reduce((b, a) => (far([g[0] + DIRS[a][0], g[1] + DIRS[a][1]]) < far([g[0] + DIRS[b][0], g[1] + DIRS[b][1]]) ? a : b)) }\n/** Q-learning with legal moves: a table of 9 states × 4 directions. */\nfunction trainGhost(m, episodes, seed, opts = {}) {\n  const rand = seeded(seed), Q = Array.from({ length: 9 }, () => [0, 0, 0, 0])\n  const best = (s, legal) => { const top = Math.max(...legal.map((a) => Q[s][a])), ties = legal.filter((a) => Q[s][a] === top); return ties[Math.floor(rand() * ties.length)] }\n  for (let e = 0; e < episodes; e++) {\n    const eps = 0.3 + (0.02 - 0.3) * e / Math.max(1, episodes - 1)\n    hunt(m, (s, legal) => (rand() < eps ? legal[Math.floor(rand() * legal.length)] : best(s, legal)), rand, { ...opts, learn: (s, a, r, s2, legal2, end) => {\n      Q[s][a] += 0.2 * (r + (end ? 0 : 0.97 * Math.max(...legal2.map((b) => Q[s2][b]))) - Q[s][a])\n    } })\n  }\n  return Q\n}\nconst greedyGhost = (Q) => (s, legal) => legal.reduce((b, a) => (Q[s][a] > Q[s][b] ? a : b))\n/** The average return over the same 200 hunts. */\nfunction judge(m, choose, opts = {}) { const rand = seeded(99); let t = 0; for (let k = 0; k < 200; k++) t += hunt(m, typeof choose === \'function\' && choose.length === 1 ? choose(rand) : choose, rand, opts); return t / 200 }\nconst maze = mazeOf(["#####################","#.........#.........#","#.##.###..#..###.##.#","#...................#","#.##.#.###.###.#.##.#","#....#...#G#...#....#","####.###.....###.####","#........#G#........#","#.##.###.....###.##.#","#...#.....P.....#...#","###.#.###.#.###.#.###","#.........#.........#","#####################"])\n// A team: two ghosts, a chaser (aims at the player) and an ambusher (aims 4 cells ahead of where the player is\n// going), each with its own 9-state table. The player wanders.\nfunction huntTeam(m, policies, aims, rand, learn) {\n  const gs = [{ g: [...m.ghost], d: -1 }, { g: [m.ghost[0], m.ghost[1] + 2], d: -1 }]\n  let p = [...m.player], pd = -1, steps = 0\n  const goal = (k) => { if (aims[k] === \'chase\' || pd < 0) return p; let q = p; for (let i = 0; i < 4 && !m.wall(q[0] + DIRS[pd][0], q[1] + DIRS[pd][1]); i++) q = [q[0] + DIRS[pd][0], q[1] + DIRS[pd][1]]; return q }\n  const stateOf = (k) => { const t = goal(k), g = gs[k].g; return (Math.sign(t[0] - g[0]) + 1) * 3 + Math.sign(t[1] - g[1]) + 1 }\n  for (; steps < 150; steps++) {\n    const caught = () => gs.some((x) => x.g[0] === p[0] && x.g[1] === p[1])\n    for (let k = 0; k < 2; k++) {\n      const s = stateOf(k), legal = ways(m, gs[k].g, gs[k].d), a = policies[k](s, legal)\n      gs[k].g = [gs[k].g[0] + DIRS[a][0], gs[k].g[1] + DIRS[a][1]]; gs[k].d = a\n      if (learn) learn(k, s, a, caught() ? 19 : -1, stateOf(k), ways(m, gs[k].g, gs[k].d), caught())\n    }\n    if (caught()) return steps + 1\n    if (rand() < 6 / 7) { const w = ways(m, p, pd), b = w[Math.floor(rand() * w.length)]; p = [p[0] + DIRS[b][0], p[1] + DIRS[b][1]]; pd = b }\n    if (caught()) return steps + 1\n  }\n  return 150\n}\n// The chaser keeps the brain it learned alone (lesson 9.9); only the ambusher learns, with the chaser hunting too.\nconst chaserBrain = greedyGhost(trainGhost(maze, 300, 3))\nfunction trainAmbusher(episodes = 400) {\n  const rand = seeded(3), Q = Array.from({ length: 9 }, () => [0, 0, 0, 0])\n  for (let e = 0; e < episodes; e++) {\n    const eps = 0.3 - 0.28 * e / (episodes - 1)\n    const pick = (s, l) => { if (rand() < eps) return l[Math.floor(rand() * l.length)]; const top = Math.max(...l.map((a) => Q[s][a])), ties = l.filter((a) => Q[s][a] === top); return ties[Math.floor(rand() * ties.length)] }\n    huntTeam(maze, [chaserBrain, pick], [\'chase\', \'ambush\'], rand, (k, s, a, r, s2, l2, end) => { if (k === 1) Q[s][a] += 0.2 * (r + (end ? 0 : 0.97 * Math.max(...l2.map((b) => Q[s2][b]))) - Q[s][a]) })\n  }\n  return (s, l) => l.reduce((b, a) => (Q[s][a] > Q[s][b] ? a : b))\n}\nfunction teamSteps(policies, aims) { const rand = seeded(99); let t = 0; for (let k = 0; k < 200; k++) t += huntTeam(maze, policies, aims, rand); return t / 200 }\n\n// Predict first: two chasers sharing the chaser\'s brain, or the chaser and a trained ambusher: which team catches\n// the wandering player faster?\nconsole.log(\'two chasers, one brain:\'.padEnd(34) + \' \' + teamSteps([chaserBrain, chaserBrain], [\'chase\', \'chase\']).toFixed(1) + \' steps a catch\')\nfor (const n of [400, 1500]) console.log((\'chaser and ambusher (\' + n + \' hunts): \').padEnd(34) + teamSteps([chaserBrain, trainAmbusher(n)], [\'chase\', \'ambush\']).toFixed(1) + \' steps a catch\')',
              },
              {
                type: 'challenge',
                instruction: "### 4. Challenge: the ambusher's aim\nSix positions check it.",
                startCode: "// Challenge: the ambusher's aim. Given the player's cell, the way it is heading (0 up, 1 right, 2 down, 3 left, or −1\n// standing), and wall(x, y), return the cell up to 4 steps ahead in that direction, stopping before a wall (the player's\n// own cell if it is standing or facing a wall).\nconst DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]\nconst rows = ['#########', '#.......#', '#.#.###.#', '#.......#', '#########'], wall = (x, y) => rows[y][x] === '#'\nfunction aim(player, dir, wall) {\n  return player   // your code\n}\nconst cases = [[[1, 1], 1, [5, 1]], [[5, 1], 1, [7, 1]], [[3, 3], 3, [1, 3]], [[3, 1], 2, [3, 3]], [[4, 1], 2, [4, 1]], [[2, 3], -1, [2, 3]]]\nlet ok = 0\nfor (const [p, d, want] of cases) { const got = aim(p, d, wall); if (JSON.stringify(got) === JSON.stringify(want)) ok++; else console.log('aim(' + JSON.stringify(p) + ', ' + d + ') = ' + JSON.stringify(got) + ', should be ' + JSON.stringify(want)) }\nconsole.log(ok === cases.length ? '✓ All 6 aims right: that is the ambusher\\'s job.' : ok + ' of 6 right.')",
                solutionCode: "// Challenge: the ambusher's aim. Given the player's cell, the way it is heading (0 up, 1 right, 2 down, 3 left, or −1\n// standing), and wall(x, y), return the cell up to 4 steps ahead in that direction, stopping before a wall (the player's\n// own cell if it is standing or facing a wall).\nconst DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]\nconst rows = ['#########', '#.......#', '#.#.###.#', '#.......#', '#########'], wall = (x, y) => rows[y][x] === '#'\nfunction aim(player, dir, wall) {\n  if (dir < 0) return player\n  let q = player\n  for (let i = 0; i < 4 && !wall(q[0] + DIRS[dir][0], q[1] + DIRS[dir][1]); i++) q = [q[0] + DIRS[dir][0], q[1] + DIRS[dir][1]]\n  return q\n}\nconst cases = [[[1, 1], 1, [5, 1]], [[5, 1], 1, [7, 1]], [[3, 3], 3, [1, 3]], [[3, 1], 2, [3, 3]], [[4, 1], 2, [4, 1]], [[2, 3], -1, [2, 3]]]\nlet ok = 0\nfor (const [p, d, want] of cases) { const got = aim(p, d, wall); if (JSON.stringify(got) === JSON.stringify(want)) ok++; else console.log('aim(' + JSON.stringify(p) + ', ' + d + ') = ' + JSON.stringify(got) + ', should be ' + JSON.stringify(want)) }\nconsole.log(ok === cases.length ? '✓ All 6 aims right: that is the ambusher\\'s job.' : ok + ' of 6 right.')",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'A second NPC with its own job',
        props: {
          task: 'second-npc',
          lesson: 'mg9-011',
          checkpoint: 'cp-mg9-011-4',
        },
      },
    ],
  },

  math: {
    prose: [
      '**Under the hood (optional).** The agent maximises the expected sum of the rewards you wrote, $\\mathbb{E}[\\sum_t \\gamma^t r_t]$, and nothing else. If $r$ = +10 at the pickup and 0 otherwise, every policy that picks up the ball once is optimal, whatever it does after.',
      "Potential-based shaping, $r' = r + \\gamma\\Phi(s') - \\Phi(s)$, is the safe way to add hints (lesson 9.3): it never changes which policy is best. A pickup bonus is not of that form, which is why it changed the dog's behaviour.",
      "With two learners, each one's environment includes the other, which changes as it learns; training one at a time (the chaser fixed while the ambusher learns) keeps each learner's world still.",
    ],
    equations: [
      {
        label: 'What is maximised',
        latex: '\\mathbb{E}\\Big[\\sum_t \\gamma^t r_t\\Big]',
      },
      {
        label: 'Safe shaping',
        latex: "r' = r + \\gamma\\Phi(s') - \\Phi(s)",
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      'Checklist before shipping: random play scores badly; the trained agent beats random and a hand-written baseline on fresh seeds; it behaves sensibly when watched; it is tested on situations it did not train on (lesson 9.10); its brain is saved and named by every NPC that should use it.',
      'Where it goes: the Cribbage chapter applies all of this to a card game, with features instead of a table, and difficulty settings for players.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg9-011-ex1',
      title: 'A state of Fetch',
      difficulty: 'easy',
      problem: 'The dog has the ball and the kennel is up and to the left. Which state?',
      steps: [
        {
          expression: '9 + 0 \\cdot 3 + 0',
          annotation: 'Has ball (+9), goal left (0), up (0).',
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'State 9.',
    },
    {
      id: 'mg9-011-ex2',
      title: 'Fix a reward',
      difficulty: 'medium',
      problem: 'A racing NPC earns +1 for each checkpoint. It learns to drive in circles over one checkpoint. Fix it.',
      steps: [
        {
          expression: '\\text{pay for progress, once}',
          annotation: 'Each checkpoint only the first time, in order; a cost per second.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'Pay for each checkpoint once, in order, plus finishing; charge for time.',
    },
    {
      id: 'mg9-011-ex3',
      title: 'Design an NPC',
      difficulty: 'hard',
      problem: 'A shopkeeper NPC that should learn prices players will pay. When does it decide, what does it see, earn?',
      steps: [
        {
          expression: '\\text{decide: each offer}',
          annotation: 'Legal: prices in a range.',
          strategyTitle: 'Step 1',
        },
        {
          expression: '\\text{see: item, stock, how the player bought before}',
          annotation: 'Relative, few.',
          strategyTitle: 'Step 2',
        },
        {
          expression: '\\text{earn: profit, minus lost sales}',
          annotation: 'The outcome you want.',
          strategyTitle: 'Step 3',
        },
      ],
      answer: "Decides at each offer among a few prices; sees the item, stock and the player's history; earns profit, with a cost when the player walks away; practises against scripted buyers.",
    },
  ],

  challenges: [
    {
      id: 'mg9-011-ch1',
      title: 'Random first',
      difficulty: 'easy',
      problem: 'Why measure a random dog before training?',
      hint: 'A floor.',
      answer: 'To check the reward makes random play bad, so improvement means something.',
      walkthrough: [],
    },
    {
      id: 'mg9-011-ch2',
      title: 'A better ambusher',
      difficulty: 'medium',
      problem: 'How could the ambusher be given a fair chance?',
      hint: 'What it sees, how long it trains.',
      answer: 'More training (6.7 at 1,500 hunts against 10.1 at 400), a better aim (where the player can actually get to), or planning its path to the aim (lesson 9.10).',
      walkthrough: [],
    },
    {
      id: 'mg9-011-ch3',
      title: 'Your game',
      difficulty: 'hard',
      problem: "Pick a game you have built and write its NPC's six decisions, a practice partner, and how you will measure it.",
      hint: 'The procedure.',
      answer: 'Answers vary; check each against the procedure, and that the reward pays for the outcome.',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'the six decisions',
        meaning: 'Decide when, legal moves, see, earn, end, practice partner.',
      },
      {
        symbol: 'reward hacking',
        meaning: 'Learning what is paid for instead of what is wanted.',
      },
      {
        symbol: 'role',
        meaning: "An NPC's job: its own observation and brain.",
      },
      {
        symbol: 'measure',
        meaning: 'Same seeds, against random and a hand-written baseline.',
      },
    ],
    rulesOfThumb: [
      'Pay for outcomes, charge for time.',
      'Check random play first.',
      'Watch it play.',
      'Measure team designs.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'A reward for a step towards the goal helps it reach the goal.',
      whyStudentsThinkIt: 'It is encouragement.',
      correctionExample: 'The pickup bonus made a dog that fetches and wanders (cell 2).',
      contrastCase: 'Pay for the goal; charge for time.',
    },
    {
      falseBelief: 'NPCs with different roles always beat copies of one.',
      whyStudentsThinkIt: 'Teamwork.',
      correctionExample: 'Two chasers beat a chaser and an ambusher here (cell 3).',
      contrastCase: 'Roles need good enough observations and training; measure.',
    },
  ],

  transferPrompts: [
    {
      situation: 'An NPC companion that should help the player in fights.',
      competingTechniques: [
        'Reward its own kills',
        "Reward the team's outcome: the player alive, fights won",
      ],
      whyThisTechniqueWins: 'It learns to help, not to compete for kills.',
    },
    {
      situation: 'An automated playtester.',
      competingTechniques: ['Reward the score', 'Reward new places reached and errors found'],
      whyThisTechniqueWins: 'It explores, which is what a tester is for.',
    },
  ],

  debugging: [
    {
      commonError: 'A bonus for an intermediate step.',
      symptom: 'The NPC repeats the step and never finishes.',
      whyItHappened: 'It is paid for the step.',
      repairStrategy: 'Pay for the outcome only (or use potential-based shaping).',
    },
    {
      commonError: 'Training two NPCs at once from scratch.',
      symptom: 'Neither learns well; results jump about.',
      whyItHappened: "Each one's world changes as the other learns.",
      repairStrategy: 'Train one at a time, the others fixed.',
    },
    {
      commonError: 'No cost per step.',
      symptom: 'The NPC dawdles; episodes hit the time limit.',
      whyItHappened: 'Time is free to it.',
      repairStrategy: 'A small cost per step.',
    },
  ],

  mastery: {
    targetLevel: 4,
    solveIndependently: 'Give a new game a learning NPC, from the six decisions to a shipped brain.',
    explainVerbally: 'Explain each decision, reward hacking and why team designs must be measured.',
    detectIncorrectApplication: 'Spot intermediate-step rewards, missing step costs, unmeasured claims.',
    transferToUnfamiliar: 'Design learning NPCs for any game.',
  },

  assessment: {
    questions: [
      {
        id: 'mg9-011-assess-1',
        type: 'choice',
        text: 'Paid +10 for the pickup only, the dog brings the ball home',
        options: ['14 of 200 times', '200 of 200', '0 times', '100 of 200'],
        answer: '14 of 200 times',
        hint: 'Cell 2.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg9-011-quiz-1',
      type: 'choice',
      text: 'The trained dog brings the ball home',
      options: ['200 of 200 times', '8 of 200', '14 of 200', '100 of 200'],
      answer: '200 of 200 times',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg9-011-quiz-2',
      type: 'choice',
      text: "Fetch's observation has how many states?",
      options: ['18', '9', '49', '4'],
      answer: '18',
      hints: ['The recipe paragraph.'],
      reviewSection: 'Intuition — the recipe',
    },
    {
      id: 'mg9-011-quiz-3',
      type: 'choice',
      text: 'The pickup-only dog learned to',
      options: [
        'Fetch, then wander',
        'Bring it home',
        'Stay in the kennel',
        'Avoid the ball',
      ],
      answer: 'Fetch, then wander',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg9-011-quiz-4',
      type: 'choice',
      text: 'Two chasers sharing one brain catch in about',
      options: ['4.9 steps', '10.1 steps', '6.7 steps', '20 steps'],
      answer: '4.9 steps',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg9-011-quiz-5',
      type: 'choice',
      text: 'The ambusher, after 1,500 hunts, with the chaser',
      options: [
        '6.7 steps: still slower than two chasers',
        'Faster than two chasers',
        'Never catches',
        '1 step',
      ],
      answer: '6.7 steps: still slower than two chasers',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg9-011-quiz-6',
      type: 'choice',
      text: 'Before training, check that',
      options: [
        'Random play scores badly',
        'The brain exists',
        'γ is 1',
        'Training is fast',
      ],
      answer: 'Random play scores badly',
      hints: ['Checks before training.'],
      reviewSection: 'Intuition — checks',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg9-011-1',
      label: 'Read the recipe on Fetch',
      type: 'read',
    },
    {
      id: 'cp-mg9-011-2',
      label: 'Read the reward bug and the checks',
      type: 'read',
    },
    {
      id: 'cp-mg9-011-3',
      label: 'Run the notebook',
      type: 'read',
    },
    {
      id: 'cp-mg9-011-4',
      label: 'Complete "A second NPC with its own job" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg9-011-5',
      label: 'Read the team and your own games',
      type: 'read',
    },
    {
      id: 'cp-mg9-011-6',
      label: 'Work through fixing a reward',
      type: 'example',
    },
    {
      id: 'cp-mg9-011-7',
      label: 'Work through designing an NPC',
      type: 'example',
    },
    {
      id: 'cp-mg9-011-8',
      label: 'Pass the aim challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-9',
}
