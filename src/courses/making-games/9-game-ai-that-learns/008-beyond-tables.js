export default {
  order: 8,

  id: 'mg9-008',

  slug: 'beyond-tables',

  title: 'Beyond Tables',

  subtitle: 'Features instead of a cell per state, the semi-gradient update, and the two ideas that made deep Q-learning work.',

  tags: [
    'game-studio',
    'machine-learning',
    'reinforcement-learning',
    'function-approximation',
    'tile-coding',
    'dqn',
    'experience-replay',
  ],

  aliases: 'function approximation linear q-learning features tile coding semi-gradient generalisation dqn deep q network experience replay target network deadly triad',

  timeToComplete: 55,

  coreConcept: 'A table learns each state on its own. Function approximation writes Q(s, a) as a function of features of the state, here linear, Q(s, a) = w_a · x(s), and updates the weights: w_a ← w_a + α δ x(s), the semi-gradient TD update. States that share features share what they learn, so learning generalises and needs fewer visits, but only if the features can express where the best action changes. Deep Q-learning (DQN) replaces the linear function with a neural network and adds experience replay (learning again from stored transitions) and a target network (a slowly updated copy for the targets) to keep it stable.',

  prerequisites: ['mg9-007'],

  nextLesson: null,

  hook: {
    question: 'A table needs to visit every state many times. An Atari screen has more possible states than there are atoms in the universe. How did an agent learn to play from it?',
    realWorldContext: 'DQN (Mnih et al., 2015) learned 49 Atari games from pixels with a neural network as its Q function, experience replay and a target network; the same structure runs game agents and robots today. Sutton & Barto, chapters 9–11, cover function approximation, including why it can diverge.',
  },

  intuition: {
    prose: [
      '**Features.** Instead of one value per state, describe a state by features, x(s): numbers such as "which tile the ball − paddle difference falls in". **Tile coding** uses several overlapping grids (tilings), each a little shifted; a value switches on one tile in each, so close values share most of their features. Then $Q(s, a) = w_a \\cdot x(s)$, a sum of weights.',
      "**The update.** Semi-gradient Q-learning: $\\delta = R + \\gamma \\max_{a'} Q(S', a') - Q(S, A)$, then $w_A \\leftarrow w_A + \\alpha\\,\\delta\\,x(S)$, the step shared among the active features (cell 3 works one by hand). It is called semi-gradient because the target also depends on w, but is treated as fixed.",
      '**Generalisation** (cells 1 and 2, the catch game). One update at d = 5 changes the table\'s value only at 5, but moves the tiled values from d = 1 to 9 (0.06 up to 0.30). Averaged over 5 seeds, tiles plus a feature for which side of the paddle the ball is on catch 0.90 of balls after 30 episodes, the 39-value table 0.62. Tiles alone, 6 wide, catch only 0.40 even after 300: their tiles straddle d = 0, where "stay" must win, so no weights can express the right policy. Before running cell 1, predict which learns fastest.',
      '**When it goes wrong.** Function approximation, bootstrapping and off-policy learning together (the "deadly triad") can make weights diverge: an update meant for one state pushes a shared feature that another state\'s target depends on, and errors feed back. Linear on-policy TD is safe; the triad is why DQN needs its two tricks.',
      "**DQN's tricks.** *Experience replay* stores transitions and learns again from random old ones each step: reused experience, and updates that are less correlated with each other. Cell 4: with 4 replayed updates a step the table catches 0.91 after 30 episodes instead of 0.62. *A target network* computes targets from a copy of the weights updated only every few thousand steps, so the target does not move with every update. With a neural network as the function, these let one agent learn many Atari games from pixels.",
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: from a table to features',
        body: 'Step 1. Keep the deciding numbers from your state design (lesson 9.7). Step 2. Make features: tiles over each number, plus exact features for boundaries where the action flips. Step 3. Q(s, a) = w_a · x(s); update w_A += (α / number of active features) δ x(S). Step 4. Check learning speed against the table over seeds; watch for weights growing without bound. Step 5. For pixels or many numbers, a neural network replaces the linear function; add replay and a target network.',
      },
      {
        type: 'warning',
        title: 'Generalising across a decision boundary',
        body: 'Features that lump together states needing different actions (tiles across d = 0) make the right policy impossible to express, no matter how long you train (cell 1: 0.40). Give the boundary its own feature.',
      },
      {
        type: 'warning',
        title: 'Divide the step by the number of active features',
        body: 'With k features on, an unshared α moves Q by k α δ, k times too far. Tile coding uses α / k.',
      },
      {
        type: 'insight',
        title: 'In Game Studio',
        body: "Game Studio's trainers use tables today (bins). Linear Q-learning with tiles is planned for it; the notebook's code is exactly what it will run.",
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: features and replay',
        caption: 'Tables against tiles, what one update touches, a semi-gradient step by hand, and experience replay.',
        props: {
          lesson: {
            title: 'Beyond tables',
            subtitle: 'Features, generalisation, replay.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. Generalisation\nPredict first: which learns fastest.',
                startCode: "// The catch game again (lesson 9.7): 20 columns, 10 rows, the paddle moves left, stays or moves right. The state is\n// the difference d = ball − paddle, from −19 to 19. (Game Studio's random-number generator.)\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst COLS = 20, ROWS = 10\n// Features: tile coding. Several tilings, each cutting −19…19 into tiles of a width, each tiling shifted a little. A\n// value lies in one tile of each tiling, so it switches on that many features; neighbouring values share most of them.\n// Optionally one more feature says which side of the paddle the ball is (d < 0, d = 0, d > 0).\nfunction tiler(tilings, width, shift, sign) {\n  const per = Math.ceil(40 / width) + 1\n  return {\n    size: tilings * per + (sign ? 3 : 0),\n    of: (d) => [...Array.from({ length: tilings }, (_, t) => t * per + Math.floor((d + 19 + t * shift) / width)), ...(sign ? [tilings * per + Math.sign(d) + 1] : [])],\n  }\n}\nconst TILES = tiler(3, 6, 2, false), TILES_SIGN = tiler(4, 4, 1, true)\n// Q(s, a) = the sum of the weights of the active features for action a.\nconst qOf = (w, d, F) => [0, 1, 2].map((a) => F.of(d).reduce((s, f) => s + w[a][f], 0))\nfunction newGame(r) { return { ball: 4 + Math.floor(r() * 12), paddle: COLS / 2, row: 0 } }\nfunction step(g, a) { g.paddle = Math.min(COLS - 1, Math.max(0, g.paddle + a - 1)); g.row++ }\nfunction catchRate(policy, seed) {\n  const r = seeded(seed + 1000)\n  let c = 0\n  for (let k = 0; k < 300; k++) { const g = newGame(r); while (g.row < ROWS) step(g, policy(g.ball - g.paddle)); c += g.ball === g.paddle ? 1 : 0 }\n  return c / 300\n}\nconst greedyOf = (q, rand) => { const best = Math.max(...q), ties = [0, 1, 2].filter((a) => q[a] === best); return ties[Math.floor(rand() * ties.length)] }\n// Linear Q-learning (semi-gradient): w_a ← w_a + α δ x(s), the step shared between the active features.\nfunction linear(F, episodes, seed = 1, alpha = 0.2) {\n  const rand = seeded(seed), w = [0, 1, 2].map(() => new Array(F.size).fill(0))\n  for (let ep = 0; ep < episodes; ep++) {\n    const g = newGame(rand)\n    for (;;) {\n      const d = g.ball - g.paddle, q = qOf(w, d, F), a = rand() < 0.1 ? Math.floor(rand() * 3) : greedyOf(q, rand)\n      step(g, a)\n      const done = g.row === ROWS, r = done ? (g.ball === g.paddle ? 1 : -1) : 0\n      const delta = r + (done ? 0 : 0.97 * Math.max(...qOf(w, g.ball - g.paddle, F))) - q[a]\n      const on = F.of(d)\n      for (const f of on) w[a][f] += (alpha / on.length) * delta\n      if (done) break\n    }\n  }\n  return w\n}\n// The table: one value per exact difference (39 states).\nfunction table(episodes, seed = 1) {\n  const rand = seeded(seed), Q = Array.from({ length: 39 }, () => [0, 0, 0])\n  for (let ep = 0; ep < episodes; ep++) {\n    const g = newGame(rand)\n    for (;;) {\n      const s = g.ball - g.paddle + 19, a = rand() < 0.1 ? Math.floor(rand() * 3) : greedyOf(Q[s], rand)\n      step(g, a)\n      const done = g.row === ROWS, r = done ? (g.ball === g.paddle ? 1 : -1) : 0, n = g.ball - g.paddle + 19\n      Q[s][a] += 0.2 * (r + (done ? 0 : 0.97 * Math.max(...Q[n])) - Q[s][a])\n      if (done) break\n    }\n  }\n  return Q\n}\n\n// Generalisation. Catch rate after 30, 100 and 300 episodes, averaged over 5 seeds, for three designs:\n// a table of 39 values; tiles alone (3 tilings, 6 wide); tiles (4 tilings, 4 wide) plus the side-of-the-paddle feature.\n// Predict first: which learns fastest?\nconst avg = (fn) => [1, 2, 3, 4, 5].reduce((s, seed) => s + fn(seed), 0) / 5\nconst greedy = (q) => q.indexOf(Math.max(...q))\nconst tab = [30, 100, 300].map((e) => avg((seed) => { const Q = table(e, seed); return catchRate((d) => greedy(Q[d + 19]), seed) }))\nconst lin = (F) => [30, 100, 300].map((e) => avg((seed) => { const w = linear(F, e, seed); return catchRate((d) => greedy(qOf(w, d, F)), seed) }))\nconsole.log('table, 39 values:                ' + tab.map((x) => x.toFixed(2)).join(', '))\nconsole.log('tiles alone, ' + TILES.size + ' weights:          ' + lin(TILES).map((x) => x.toFixed(2)).join(', '))\nconsole.log('tiles + side, ' + TILES_SIGN.size + ' weights:         ' + lin(TILES_SIGN).map((x) => x.toFixed(2)).join(', '))",
              },
              {
                type: 'js',
                instruction: '### 2. What one update touches\nPredict first: which values change.',
                startCode: '// The catch game again (lesson 9.7): 20 columns, 10 rows, the paddle moves left, stays or moves right. The state is\n// the difference d = ball − paddle, from −19 to 19. (Game Studio\'s random-number generator.)\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst COLS = 20, ROWS = 10\n// Features: tile coding. Several tilings, each cutting −19…19 into tiles of a width, each tiling shifted a little. A\n// value lies in one tile of each tiling, so it switches on that many features; neighbouring values share most of them.\n// Optionally one more feature says which side of the paddle the ball is (d < 0, d = 0, d > 0).\nfunction tiler(tilings, width, shift, sign) {\n  const per = Math.ceil(40 / width) + 1\n  return {\n    size: tilings * per + (sign ? 3 : 0),\n    of: (d) => [...Array.from({ length: tilings }, (_, t) => t * per + Math.floor((d + 19 + t * shift) / width)), ...(sign ? [tilings * per + Math.sign(d) + 1] : [])],\n  }\n}\nconst TILES = tiler(3, 6, 2, false), TILES_SIGN = tiler(4, 4, 1, true)\n// Q(s, a) = the sum of the weights of the active features for action a.\nconst qOf = (w, d, F) => [0, 1, 2].map((a) => F.of(d).reduce((s, f) => s + w[a][f], 0))\nfunction newGame(r) { return { ball: 4 + Math.floor(r() * 12), paddle: COLS / 2, row: 0 } }\nfunction step(g, a) { g.paddle = Math.min(COLS - 1, Math.max(0, g.paddle + a - 1)); g.row++ }\nfunction catchRate(policy, seed) {\n  const r = seeded(seed + 1000)\n  let c = 0\n  for (let k = 0; k < 300; k++) { const g = newGame(r); while (g.row < ROWS) step(g, policy(g.ball - g.paddle)); c += g.ball === g.paddle ? 1 : 0 }\n  return c / 300\n}\nconst greedyOf = (q, rand) => { const best = Math.max(...q), ties = [0, 1, 2].filter((a) => q[a] === best); return ties[Math.floor(rand() * ties.length)] }\n// Linear Q-learning (semi-gradient): w_a ← w_a + α δ x(s), the step shared between the active features.\nfunction linear(F, episodes, seed = 1, alpha = 0.2) {\n  const rand = seeded(seed), w = [0, 1, 2].map(() => new Array(F.size).fill(0))\n  for (let ep = 0; ep < episodes; ep++) {\n    const g = newGame(rand)\n    for (;;) {\n      const d = g.ball - g.paddle, q = qOf(w, d, F), a = rand() < 0.1 ? Math.floor(rand() * 3) : greedyOf(q, rand)\n      step(g, a)\n      const done = g.row === ROWS, r = done ? (g.ball === g.paddle ? 1 : -1) : 0\n      const delta = r + (done ? 0 : 0.97 * Math.max(...qOf(w, g.ball - g.paddle, F))) - q[a]\n      const on = F.of(d)\n      for (const f of on) w[a][f] += (alpha / on.length) * delta\n      if (done) break\n    }\n  }\n  return w\n}\n// The table: one value per exact difference (39 states).\nfunction table(episodes, seed = 1) {\n  const rand = seeded(seed), Q = Array.from({ length: 39 }, () => [0, 0, 0])\n  for (let ep = 0; ep < episodes; ep++) {\n    const g = newGame(rand)\n    for (;;) {\n      const s = g.ball - g.paddle + 19, a = rand() < 0.1 ? Math.floor(rand() * 3) : greedyOf(Q[s], rand)\n      step(g, a)\n      const done = g.row === ROWS, r = done ? (g.ball === g.paddle ? 1 : -1) : 0, n = g.ball - g.paddle + 19\n      Q[s][a] += 0.2 * (r + (done ? 0 : 0.97 * Math.max(...Q[n])) - Q[s][a])\n      if (done) break\n    }\n  }\n  return Q\n}\n\n// What one update touches. Start from all zeros; make one update for d = 5, action "right", with δ = 1, α = 0.3.\n// Predict first: which differences\' Q(·, right) change, under each method?\nconst F = TILES_SIGN, w = [0, 1, 2].map(() => new Array(F.size).fill(0)), Q = Array.from({ length: 39 }, () => [0, 0, 0])\nconst on = F.of(5)\nfor (const f of on) w[2][f] += (0.3 / on.length) * 1\nQ[5 + 19][2] += 0.3 * 1\nconst show = (get) => [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => d + \': \' + +get(d).toFixed(2)).join(\'  \')\nconsole.log(\'table: \' + show((d) => Q[d + 19][2]))\nconsole.log(\'tiles: \' + show((d) => qOf(w, d, F)[2]))',
              },
              {
                type: 'js',
                instruction: '### 3. A semi-gradient step\nPredict first: the new weights.',
                startCode: "// The semi-gradient update by hand. Q(s, a) = w · x(s), with x a vector of features. Here three features are on:\n// x = [1, 0, 1, 0, 1] for this state, w(right) = [0.2, 0.5, −0.1, 0.4, 0.3]. R = 1, the next state's best Q is 0.6,\n// γ = 0.9, α = 0.3, shared between the 3 active features (0.1 each). Predict first: the new weights.\nconst x = [1, 0, 1, 0, 1], w = [0.2, 0.5, -0.1, 0.4, 0.3]\nconst q = w.reduce((s, wi, i) => s + wi * x[i], 0)\nconst delta = 1 + 0.9 * 0.6 - q\nconst step = 0.3 / x.reduce((a, b) => a + b, 0)\nconst w2 = w.map((wi, i) => +(wi + step * delta * x[i]).toFixed(4))\nconsole.log('Q(s, right) = w · x = ' + +q.toFixed(4) + ', δ = ' + +delta.toFixed(4) + ', new w = [' + w2.join(', ') + ']')\nconsole.log('new Q(s, right) = ' + +w2.reduce((s, wi, i) => s + wi * x[i], 0).toFixed(4))",
              },
              {
                type: 'js',
                instruction: '### 4. Experience replay\nPredict first: how much replay helps.',
                startCode: "// The catch game again (lesson 9.7): 20 columns, 10 rows, the paddle moves left, stays or moves right. The state is\n// the difference d = ball − paddle, from −19 to 19. (Game Studio's random-number generator.)\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst COLS = 20, ROWS = 10\n// Features: tile coding. Several tilings, each cutting −19…19 into tiles of a width, each tiling shifted a little. A\n// value lies in one tile of each tiling, so it switches on that many features; neighbouring values share most of them.\n// Optionally one more feature says which side of the paddle the ball is (d < 0, d = 0, d > 0).\nfunction tiler(tilings, width, shift, sign) {\n  const per = Math.ceil(40 / width) + 1\n  return {\n    size: tilings * per + (sign ? 3 : 0),\n    of: (d) => [...Array.from({ length: tilings }, (_, t) => t * per + Math.floor((d + 19 + t * shift) / width)), ...(sign ? [tilings * per + Math.sign(d) + 1] : [])],\n  }\n}\nconst TILES = tiler(3, 6, 2, false), TILES_SIGN = tiler(4, 4, 1, true)\n// Q(s, a) = the sum of the weights of the active features for action a.\nconst qOf = (w, d, F) => [0, 1, 2].map((a) => F.of(d).reduce((s, f) => s + w[a][f], 0))\nfunction newGame(r) { return { ball: 4 + Math.floor(r() * 12), paddle: COLS / 2, row: 0 } }\nfunction step(g, a) { g.paddle = Math.min(COLS - 1, Math.max(0, g.paddle + a - 1)); g.row++ }\nfunction catchRate(policy, seed) {\n  const r = seeded(seed + 1000)\n  let c = 0\n  for (let k = 0; k < 300; k++) { const g = newGame(r); while (g.row < ROWS) step(g, policy(g.ball - g.paddle)); c += g.ball === g.paddle ? 1 : 0 }\n  return c / 300\n}\nconst greedyOf = (q, rand) => { const best = Math.max(...q), ties = [0, 1, 2].filter((a) => q[a] === best); return ties[Math.floor(rand() * ties.length)] }\n// Linear Q-learning (semi-gradient): w_a ← w_a + α δ x(s), the step shared between the active features.\nfunction linear(F, episodes, seed = 1, alpha = 0.2) {\n  const rand = seeded(seed), w = [0, 1, 2].map(() => new Array(F.size).fill(0))\n  for (let ep = 0; ep < episodes; ep++) {\n    const g = newGame(rand)\n    for (;;) {\n      const d = g.ball - g.paddle, q = qOf(w, d, F), a = rand() < 0.1 ? Math.floor(rand() * 3) : greedyOf(q, rand)\n      step(g, a)\n      const done = g.row === ROWS, r = done ? (g.ball === g.paddle ? 1 : -1) : 0\n      const delta = r + (done ? 0 : 0.97 * Math.max(...qOf(w, g.ball - g.paddle, F))) - q[a]\n      const on = F.of(d)\n      for (const f of on) w[a][f] += (alpha / on.length) * delta\n      if (done) break\n    }\n  }\n  return w\n}\n// The table: one value per exact difference (39 states).\nfunction table(episodes, seed = 1) {\n  const rand = seeded(seed), Q = Array.from({ length: 39 }, () => [0, 0, 0])\n  for (let ep = 0; ep < episodes; ep++) {\n    const g = newGame(rand)\n    for (;;) {\n      const s = g.ball - g.paddle + 19, a = rand() < 0.1 ? Math.floor(rand() * 3) : greedyOf(Q[s], rand)\n      step(g, a)\n      const done = g.row === ROWS, r = done ? (g.ball === g.paddle ? 1 : -1) : 0, n = g.ball - g.paddle + 19\n      Q[s][a] += 0.2 * (r + (done ? 0 : 0.97 * Math.max(...Q[n])) - Q[s][a])\n      if (done) break\n    }\n  }\n  return Q\n}\n\n// Experience replay, DQN's first idea: keep every transition in a buffer and, each step, also learn from a few old\n// ones drawn at random. The same experience is used many times. Predict first: with 4 replayed updates a step,\n// how many episodes does the table need?\nfunction tableReplay(episodes, k, seed = 1) {\n  const rand = seeded(seed), Q = Array.from({ length: 39 }, () => [0, 0, 0]), buffer = []\n  const learn = ([s, a, r, n, done]) => { Q[s][a] += 0.2 * (r + (done ? 0 : 0.97 * Math.max(...Q[n])) - Q[s][a]) }\n  for (let ep = 0; ep < episodes; ep++) {\n    const g = newGame(rand)\n    for (;;) {\n      const s = g.ball - g.paddle + 19, a = rand() < 0.1 ? Math.floor(rand() * 3) : greedyOf(Q[s], rand)\n      step(g, a)\n      const done = g.row === ROWS, t = [s, a, done ? (g.ball === g.paddle ? 1 : -1) : 0, g.ball - g.paddle + 19, done]\n      learn(t); buffer.push(t)\n      for (let j = 0; j < k; j++) learn(buffer[Math.floor(rand() * buffer.length)])\n      if (done) break\n    }\n  }\n  return Q\n}\nfor (const k of [0, 4]) {\n  const rates = [30, 100, 300].map((episodes) => { const Q = tableReplay(episodes, k); return catchRate((d) => { const q = Q[d + 19]; return q.indexOf(Math.max(...q)) }, 1).toFixed(2) })\n  console.log((k ? 'replay, 4 extra updates a step' : 'no replay                     ') + ': catches after 30, 100, 300 episodes: ' + rates.join(', '))\n}",
              },
              {
                type: 'challenge',
                instruction: "### 5. Challenge: linear Q-learning's update\nThe cases below check it.",
                startCode: "// Write linear Q-learning's update for one action's weights. Q(s, a) = w · x; the target is R + γ maxNext (R alone if\n// done); δ = target − Q; then w ← w + α δ x. (Here α is the whole step: not shared.)\nfunction linearUpdate(w, x, reward, maxNext, done, alpha, gamma) {\n  return w\n}\n\n// ── The check (leave this part as it is) ──\nconst near = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9)\nconst cases = [\n  { args: [[0, 0, 0], [1, 0, 1], 1, 0, true, 0.5], want: [0.5, 0, 0.5], why: 'Q = 0, target 1 (done), δ = 1: each active weight moves α δ = 0.5' },\n  { args: [[1, 2], [1, 1], 0, 4, false, 0.1, 0.5], want: [0.9, 1.9], why: 'Q = 3, target 0 + 0.5 × 4 = 2, δ = −1: each moves −0.1' },\n  { args: [[0.5, 0.5], [2, 0], -1, 0, true, 0.25], want: [-0.5, 0.5], why: 'Q = 0.5 × 2 = 1, target −1, δ = −2: w₀ moves 0.25 × −2 × 2 = −1, to −0.5; w₁ has x = 0' },\n]\nlet passed = 0\nfor (const [i, c] of cases.entries()) {\n  const got = linearUpdate([...c.args[0]], ...c.args.slice(1))\n  const ok = Array.isArray(got) && near(got, c.want)\n  passed += ok\n  console.log((ok ? '✓' : '✗') + ' case ' + (i + 1) + ': got [' + (Array.isArray(got) ? got.map((v) => +v.toFixed(6)).join(', ') : got) + ']' + (ok ? '' : ', want [' + c.want.join(', ') + ']: ' + c.why))\n}\nconsole.log(passed === cases.length ? '✓ All 3 cases pass: that is semi-gradient Q-learning.' : passed + ' of 3 cases pass.')",
                solutionCode: "// Write linear Q-learning's update for one action's weights. Q(s, a) = w · x; the target is R + γ maxNext (R alone if\n// done); δ = target − Q; then w ← w + α δ x. (Here α is the whole step: not shared.)\nfunction linearUpdate(w, x, reward, maxNext, done, alpha, gamma) {\n  const q = w.reduce((s, wi, i) => s + wi * x[i], 0)\n  const delta = reward + (done ? 0 : gamma * maxNext) - q\n  return w.map((wi, i) => wi + alpha * delta * x[i])\n}\n\n// ── The check (leave this part as it is) ──\nconst near = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9)\nconst cases = [\n  { args: [[0, 0, 0], [1, 0, 1], 1, 0, true, 0.5], want: [0.5, 0, 0.5], why: 'Q = 0, target 1 (done), δ = 1: each active weight moves α δ = 0.5' },\n  { args: [[1, 2], [1, 1], 0, 4, false, 0.1, 0.5], want: [0.9, 1.9], why: 'Q = 3, target 0 + 0.5 × 4 = 2, δ = −1: each moves −0.1' },\n  { args: [[0.5, 0.5], [2, 0], -1, 0, true, 0.25], want: [-0.5, 0.5], why: 'Q = 0.5 × 2 = 1, target −1, δ = −2: w₀ moves 0.25 × −2 × 2 = −1, to −0.5; w₁ has x = 0' },\n]\nlet passed = 0\nfor (const [i, c] of cases.entries()) {\n  const got = linearUpdate([...c.args[0]], ...c.args.slice(1))\n  const ok = Array.isArray(got) && near(got, c.want)\n  passed += ok\n  console.log((ok ? '✓' : '✗') + ' case ' + (i + 1) + ': got [' + (Array.isArray(got) ? got.map((v) => +v.toFixed(6)).join(', ') : got) + ']' + (ok ? '' : ', want [' + c.want.join(', ') + ']: ' + c.why))\n}\nconsole.log(passed === cases.length ? '✓ All 3 cases pass: that is semi-gradient Q-learning.' : passed + ' of 3 cases pass.')",
              },
            ],
          },
        },
      },
    ],
  },

  math: {
    prose: [
      '**Under the hood (optional).** With $\\hat{q}(s, a, \\mathbf{w}) = \\mathbf{w}_a^{\\mathsf T}\\mathbf{x}(s)$, the gradient with respect to $\\mathbf{w}_a$ is $\\mathbf{x}(s)$, so stochastic gradient descent on $\\tfrac12[\\text{target} - \\hat{q}]^2$, holding the target fixed, gives $\\mathbf{w}_a \\leftarrow \\mathbf{w}_a + \\alpha\\,\\delta\\,\\mathbf{x}(s)$. The target depends on w too; ignoring that is what makes it a *semi*-gradient method.',
      "Linear TD(0) prediction on-policy converges to the TD fixed point, whose error is within $\\frac{1}{1-\\gamma}$ of the best linear approximation's (Tsitsiklis & Van Roy, 1997). Off-policy with bootstrapping and approximation, there are counterexamples where weights diverge (Baird, 1995).",
      "DQN minimises $\\mathbb{E}[(R + \\gamma \\max_{a'} \\hat{q}(S', a', \\mathbf{w}^-) - \\hat{q}(S, A, \\mathbf{w}))^2]$ over minibatches drawn from a replay buffer, with $\\mathbf{w}^-$ the target network's weights, copied from w every C steps.",
    ],
    equations: [
      {
        label: 'Linear Q',
        latex: '\\hat{q}(s, a, \\mathbf{w}) = \\mathbf{w}_a^{\\mathsf T}\\,\\mathbf{x}(s)',
      },
      {
        label: 'Semi-gradient update',
        latex: "\\mathbf{w}_A \\leftarrow \\mathbf{w}_A + \\alpha\\,[R + \\gamma \\max_{a'} \\hat{q}(S', a', \\mathbf{w}) - \\hat{q}(S, A, \\mathbf{w})]\\,\\mathbf{x}(S)",
      },
      {
        label: 'DQN loss',
        latex: "L(\\mathbf{w}) = \\mathbb{E}[(R + \\gamma \\max_{a'} \\hat{q}(S', a', \\mathbf{w}^-) - \\hat{q}(S, A, \\mathbf{w}))^2]",
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      'Formal statement: a table is the special case of linear approximation with one-hot features, one per state; everything here reduces to the earlier lessons when x(s) is one-hot.',
      "Invariant: with tile coding, the change to $\\hat{q}(s')$ from an update at s is proportional to the number of tiles s and s′ share (cell 2's tent shape).",
      'Geometric picture: the weights define a surface over the state; an update raises it in a bump the shape of the active features, not a single spike.',
      'Where it goes: 9.9 puts learned agents into your own games as NPCs.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg9-008-ex1',
      title: 'A linear Q value',
      difficulty: 'easy',
      problem: 'x(s) = [1, 0, 1], w_right = [0.2, 0.9, 0.3]. Q(s, right)?',
      steps: [
        {
          expression: '0.2 \\times 1 + 0.9 \\times 0 + 0.3 \\times 1 = 0.5',
          annotation: 'The weights of the active features.',
          strategyTitle: 'Step 1: sum',
        },
      ],
      answer: '0.5.',
    },
    {
      id: 'mg9-008-ex2',
      title: 'A semi-gradient step',
      difficulty: 'medium',
      problem: 'In example 1, R = 1, done, α = 0.2 shared over the 2 active features. New weights?',
      steps: [
        {
          expression: '\\delta = 1 - 0.5 = 0.5',
          annotation: 'The TD error.',
          strategyTitle: 'Step 1: δ',
        },
        {
          expression: '0.1 \\times 0.5 = 0.05',
          annotation: 'Each active weight moves α/2 × δ.',
          strategyTitle: 'Step 2: step',
        },
      ],
      answer: '[0.25, 0.9, 0.35]: Q becomes 0.6.',
    },
    {
      id: 'mg9-008-ex3',
      title: 'Shared tiles',
      difficulty: 'hard',
      problem: 'With 4 tilings of width 4 shifted by 1, how many tiles do d = 5 and d = 7 share?',
      steps: [
        {
          expression: '|5 - 7| = 2 < 4',
          annotation: 'In each tiling they share a tile unless a tile edge falls between them.',
          strategyTitle: 'Step 1: per tiling',
        },
        {
          expression: '4 - 2 = 2',
          annotation: 'Of 4 shifted tilings, 2 have an edge between them.',
          strategyTitle: 'Step 2: count',
        },
      ],
      answer: '2 of 4, so an update at one moves the other about half as much.',
    },
  ],

  challenges: [
    {
      id: 'mg9-008-ch1',
      title: 'A table is linear',
      difficulty: 'easy',
      problem: 'Show a Q table is a linear function of features.',
      hint: 'One feature per state.',
      answer: 'With one-hot features (1 for this state, 0 for others), w_a · x(s) picks out one weight, which is Q(s, a).',
      walkthrough: [],
    },
    {
      id: 'mg9-008-ch2',
      title: 'Why tiles alone fail',
      difficulty: 'medium',
      problem: 'Why can tiles 6 wide not learn to stay under the ball?',
      hint: 'What does d = 0 share with d = 2?',
      answer: 'd = 0 shares tiles with nearby d > 0 and d < 0, where the best action is to move; no weights can make "stay" best at 0 and "move" best one step away.',
      walkthrough: [],
    },
    {
      id: 'mg9-008-ch3',
      title: 'Why replay helps',
      difficulty: 'hard',
      problem: 'Give two reasons experience replay helps learning.',
      hint: 'Reuse, and correlation.',
      answer: 'Each transition is learned from many times (data efficiency), and random old transitions break the correlation of consecutive steps, which otherwise drags shared weights back and forth.',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'x(s)',
        meaning: "The state's features.",
      },
      {
        symbol: 'w_a',
        meaning: 'The weights for action a.',
      },
      {
        symbol: 'w_a · x(s)',
        meaning: 'Linear Q(s, a).',
      },
      {
        symbol: 'tile coding',
        meaning: 'Overlapping shifted grids as features.',
      },
      {
        symbol: 'replay buffer',
        meaning: 'Stored transitions learned from again.',
      },
      {
        symbol: 'target network',
        meaning: 'A slow copy of the weights for computing targets.',
      },
    ],
    rulesOfThumb: [
      'Give decision boundaries their own features.',
      'Share the step among active features.',
      'Watch weights for divergence off-policy.',
      'Replay reuses data; a target network steadies targets.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'Function approximation is always better than a table.',
      whyStudentsThinkIt: 'It generalises.',
      correctionExample: 'Tiles alone learn worse than the table (cell 1).',
      contrastCase: 'With the right features they learn faster.',
    },
    {
      falseBelief: 'DQN is just Q-learning with a network.',
      whyStudentsThinkIt: 'That is the core.',
      correctionExample: 'Without replay and a target network it is often unstable.',
      contrastCase: 'With them, it learned Atari.',
    },
  ],

  transferPrompts: [
    {
      situation: 'A game state with 8 numbers.',
      competingTechniques: [
        'A table with 10 bins each (10⁸ states)',
        'Tile coding per number',
        'or a small network',
      ],
      whyThisTechniqueWins: 'Features or a network generalise; the table cannot be filled.',
    },
    {
      situation: 'Learning from a fixed log of past play.',
      competingTechniques: ['Online SARSA', 'Off-policy Q-learning with replay over the log'],
      whyThisTechniqueWins: 'Replay over the log is exactly what off-policy learning can use; watch for divergence.',
    },
  ],

  debugging: [
    {
      commonError: 'The full α applied to every active feature.',
      symptom: 'Values overshoot and oscillate.',
      whyItHappened: 'k features each move α δ.',
      repairStrategy: 'Use α / k.',
    },
    {
      commonError: 'Weights grow without bound.',
      symptom: 'Q values in the millions.',
      whyItHappened: 'The deadly triad.',
      repairStrategy: 'Smaller α, a target network, on-policy updates, or better features.',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Implement linear Q-learning with tile coding and compare it with a table.',
    explainVerbally: "Explain features, the semi-gradient update, generalisation and DQN's two tricks.",
    detectIncorrectApplication: 'Spot unshared steps, boundary-straddling features and divergence.',
    transferToUnfamiliar: 'Choose features for a new game.',
  },

  assessment: {
    questions: [
      {
        id: 'mg9-008-assess-1',
        type: 'choice',
        text: 'In linear Q-learning, an update changes',
        options: [
          'The weights of the active features',
          'Only one table cell',
          'All weights equally',
          'The features',
        ],
        answer: 'The weights of the active features',
        hint: 'x(S) multiplies the step.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg9-008-quiz-1',
      type: 'choice',
      text: 'After 30 episodes, averaged over 5 seeds, which catches most?',
      options: [
        'Tiles plus the side feature',
        'The table',
        'Tiles alone',
        'They are equal',
      ],
      answer: 'Tiles plus the side feature',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg9-008-quiz-2',
      type: 'choice',
      text: 'One update at d = 5 with tiles changes Q at',
      options: [
        'Nearby differences, less with distance',
        'd = 5 only',
        'Every d',
        'No d',
      ],
      answer: 'Nearby differences, less with distance',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg9-008-quiz-3',
      type: 'choice',
      text: 'The update is semi-gradient because',
      options: [
        "The target's dependence on w is ignored",
        'Only half the weights move',
        'α is halved',
        'It uses two tables',
      ],
      answer: "The target's dependence on w is ignored",
      hints: ['The update paragraph.'],
      reviewSection: 'Intuition — the update',
    },
    {
      id: 'mg9-008-quiz-4',
      type: 'choice',
      text: 'The deadly triad is',
      options: [
        'Function approximation, bootstrapping and off-policy learning',
        'α, γ and ε',
        'Replay, target network and DQN',
        'Tiles, bins and tables',
      ],
      answer: 'Function approximation, bootstrapping and off-policy learning',
      hints: ['When it goes wrong.'],
      reviewSection: 'Intuition — when it goes wrong',
    },
    {
      id: 'mg9-008-quiz-5',
      type: 'choice',
      text: 'Experience replay helped the table after 30 episodes from 0.62 to',
      options: ['0.91', '0.62', '1.00', '0.40'],
      answer: '0.91',
      hints: ['Cell 4.'],
      reviewSection: 'Cell 4',
    },
    {
      id: 'mg9-008-quiz-6',
      type: 'choice',
      text: 'A target network',
      options: [
        'Computes targets from a slowly updated copy of the weights',
        'Picks actions',
        'Stores transitions',
        'Replaces γ',
      ],
      answer: 'Computes targets from a slowly updated copy of the weights',
      hints: ["DQN's tricks."],
      reviewSection: "Intuition — DQN's tricks",
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg9-008-1',
      label: 'Read features and the semi-gradient update',
      type: 'read',
    },
    {
      id: 'cp-mg9-008-2',
      label: 'Read generalisation and the deadly triad',
      type: 'read',
    },
    {
      id: 'cp-mg9-008-3',
      label: 'Run the notebook: tables against tiles',
      type: 'read',
    },
    {
      id: 'cp-mg9-008-4',
      label: "Read DQN's replay and target network",
      type: 'read',
    },
    {
      id: 'cp-mg9-008-5',
      label: 'Run the replay cell',
      type: 'read',
    },
    {
      id: 'cp-mg9-008-6',
      label: 'Work through the semi-gradient example',
      type: 'example',
    },
    {
      id: 'cp-mg9-008-7',
      label: 'Work through the shared-tiles example',
      type: 'example',
    },
    {
      id: 'cp-mg9-008-8',
      label: 'Pass the linear Q-learning challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-9',
}
