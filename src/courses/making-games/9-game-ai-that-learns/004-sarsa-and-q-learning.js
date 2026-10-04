export default {
  order: 4,

  id: 'mg9-004',

  slug: 'sarsa-and-q-learning',

  title: 'SARSA and Q-learning',

  subtitle: 'On-policy and off-policy learning, and why one walks the cliff edge while the other keeps away from it.',

  tags: [
    'game-studio',
    'machine-learning',
    'reinforcement-learning',
    'sarsa',
    'q-learning',
    'on-policy',
    'off-policy',
  ],

  aliases: 'sarsa q-learning on-policy off-policy behaviour policy target policy cliff walking expected sarsa glie td control',

  timeToComplete: 55,

  coreConcept: 'SARSA and Q-learning make the same TD update with different targets. SARSA uses the value of the action it will actually take next, R + γ Q(S′, A′), so it learns the value of the policy it follows, exploration included (on-policy). Q-learning uses the best next action, R + γ max Q(S′, ·), so it learns the value of acting greedily while it explores (off-policy). On the cliff that difference is visible: SARSA learns a safe walk away from the edge, because its own random steps make the edge dangerous; Q-learning learns the shortest walk along the edge, and pays for it while it explores.',

  prerequisites: ['mg9-003'],

  nextLesson: 'mg9-005',

  hook: {
    question: 'Two agents learn the same cliff with the same exploration. One ends up walking right along the edge, the other takes the long way round. Neither is wrong: they are answering different questions. Which questions?',
    realWorldContext: "The on-policy/off-policy distinction runs through all of reinforcement learning: SARSA and policy-gradient methods are on-policy; Q-learning, DQN and learning from recorded data are off-policy. Sutton & Barto, section 6.4–6.5 and Example 6.6, is the source of this lesson's cliff.",
  },

  intuition: {
    prose: [
      '**One step, two targets.** After S, A, R, S′, both learners move Q(S, A) towards a target. SARSA\'s is $R + \\gamma Q(S\', A\')$, where A′ is the action it has already chosen for S′ (with its ε-greedy policy) and will take next: S, A, R, S′, A′, hence the name. Q-learning\'s is $R + \\gamma \\max_{a\'} Q(S\', a\')$, whatever it does next. Before running cell 1, predict both for a step next to the spikes where the exploring policy picked "down" for A′: Q-learning\'s target is −9, SARSA\'s −41.',
      "**What each learns.** SARSA estimates $Q^\\pi$ for the policy it follows, random steps and all: **on-policy**. Q-learning estimates $Q^*$, the greedy policy's values, while following an exploring one: **off-policy** (the policy it learns about, the *target* policy, is not the one it acts with, the *behaviour* policy).",
      "**On the cliff** (cell 2, 10 seeds, α 0.5, ε 0.1, 500 episodes): Q-learning's greedy walk is the shortest, 13 moves, on every seed, but it earns −50.4 per episode while learning, because its walk is next to the spikes and ε sends it over. SARSA earns −27.2 while learning, and its greedy walk is the long way round along the top, 17 moves on most seeds. In Game Studio's Cliff Walk you see the two sets of arrows on the grid.",
      "**Why** (cell 3): along the edge, SARSA's Q(edge, right) is lower than Q-learning's (−20.4 against −11.0 at column 1), because SARSA's values include the falls its own ε-greedy steps cause there. Moving away from the edge is the best policy *for an agent that keeps exploring*. Q-learning's values assume it will act greedily, so the edge looks as good as it is for a greedy walker.",
      '**When exploration stops.** Theory says SARSA reaches the optimal policy if exploration fades but never stops (GLIE). Cell 4 stops it: ε falling in a straight line to exactly 0. Even with 5000 episodes SARSA keeps its 17-move walk: once it no longer explores, it never tries the edge again, so it never learns the edge is better. Stopping exploration freezes what was learned.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: choosing SARSA or Q-learning',
        body: "Step 1. Will the agent keep exploring while it acts (training in the real world, a live game)? SARSA learns values that account for that. Step 2. Do you want the best policy for when exploring stops, or to learn from another policy's experience (recorded play)? Q-learning. Step 3. Compare both over seeds, on the learning return and the greedy score (lesson 9.2's two questions).",
      },
      {
        type: 'warning',
        title: 'SARSA chooses A′ before the update, and then takes it',
        body: 'The commonest SARSA bug is to choose the next action again after updating. Choose A′, use Q(S′, A′) in the target, then take that same A′. Otherwise it is neither SARSA nor Q-learning.',
      },
      {
        type: 'warning',
        title: 'Greedy tables can loop',
        body: "In cell 2 two SARSA seeds' greedy walks never reach the chest (60 moves, the limit): two cells point at each other. A table read greedily is only a policy where it was learned well; judge it by playing it, and keep the best table seen (Game Studio's greedy checks do).",
      },
      {
        type: 'insight',
        title: 'What the picture shows (cell 5)',
        body: 'Misconception it contradicts: "the shortest path is always what an agent should learn". Green (Q-learning) hugs the spikes; blue (SARSA) keeps a row away. Each is right for the question it answers.',
      },
      {
        type: 'insight',
        title: 'In the ML Lab',
        body: 'ML Lab lesson 37.4 contrasts Q-learning with SARSA on its own gridworld with a ditch. [Open the ML Lab](#/lab/ml-lab).',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: SARSA against Q-learning',
        caption: 'The two targets, both learners on the cliff over 10 seeds, the values along the edge, stopping exploration, the two walks.',
        props: {
          lesson: {
            title: 'SARSA and Q-learning',
            subtitle: 'On-policy and off-policy.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. One step, two targets\nPredict first: both targets.',
                startCode: "// One step, two targets. The Walker is next to the spikes at (column 4, row 2), moves right (R = −1) to\n// (column 5, row 2). There Q(S′, ·) = [−9, −8, −40, −10] (up, right, down, left). Exploring with ε = 0.1, the\n// action it will take next turned out to be A′ = down (a random step, into the spikes). γ = 1.\n// Predict first: the two targets.\nconst r = -1, nextRow = [-9, -8, -40, -10], aNext = 2, gamma = 1\nconsole.log('Q-learning target: R + γ max Q(S′, ·) = ' + (r + gamma * Math.max(...nextRow)))\nconsole.log('SARSA target:      R + γ Q(S′, A′)    = ' + (r + gamma * nextRow[aNext]))\n// Expected SARSA (lesson 9.4) averages over the policy instead: ε/4 for each action, plus 1 − ε for the best.\nconst probs = nextRow.map((q) => 0.1 / 4 + (q === Math.max(...nextRow) ? 0.9 : 0))\nconsole.log('Expected SARSA:    R + γ Σ π Q(S′, ·) = ' + +(r + gamma * nextRow.reduce((s, q, i) => s + probs[i] * q, 0)).toFixed(3))",
              },
              {
                type: 'js',
                instruction: '### 2. Both on the cliff\nPredict first: which earns more while learning, and whose walk is shorter.',
                startCode: "// The cliff, as in Game Studio's Cliff Walk: 12 × 4 cells, start bottom-left, chest bottom-right, spikes between.\n// Every move costs 1; the spikes cost 100 and send you back to the start. A state is column × 4 + row.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst MOVES = [[0, -1], [1, 0], [0, 1], [-1, 0]], ARROWS = ['↑', '→', '↓', '←'], START = 0 * 4 + 3, CHEST = 11 * 4 + 3\nfunction move(s, a) {\n  const x = Math.min(11, Math.max(0, Math.floor(s / 4) + MOVES[a][0])), y = Math.min(3, Math.max(0, (s % 4) + MOVES[a][1]))\n  if (y === 3 && x > 0 && x < 11) return { next: START, reward: -100, done: false }\n  const next = x * 4 + y\n  return { next, reward: -1, done: next === CHEST }\n}\nconst greedyOf = (row, rand) => { const best = Math.max(...row), ties = []; row.forEach((q, a) => { if (q === best) ties.push(a) }); return ties[Math.floor(rand() * ties.length)] }\n// One learner, either update. SARSA chooses A′ before updating and then takes it; Q-learning uses the max.\nfunction train(method, { episodes = 500, alpha = 0.5, gamma = 1, eps0 = 0.1, eps1 = 0.1, seed = 1 } = {}) {\n  const rand = seeded(seed), Q = Array.from({ length: 48 }, () => [0, 0, 0, 0]), returns = []\n  const choose = (s, eps) => (rand() < eps ? Math.floor(rand() * 4) : greedyOf(Q[s], rand))\n  for (let ep = 0; ep < episodes; ep++) {\n    const eps = eps0 + (eps1 - eps0) * (ep / Math.max(1, episodes - 1))\n    let s = START, a = choose(s, eps), total = 0\n    for (let t = 0; t < 1000; t++) {\n      const r = move(s, a)\n      total += r.reward\n      const a2 = choose(r.next, eps)\n      const future = r.done ? 0 : method === 'sarsa' ? Q[r.next][a2] : Math.max(...Q[r.next])\n      Q[s][a] += alpha * (r.reward + gamma * future - Q[s][a])\n      if (r.done) break\n      s = r.next\n      a = method === 'sarsa' ? a2 : choose(s, eps)\n    }\n    returns.push(total)\n  }\n  return { Q, returns }\n}\n// The greedy walk: the cells it passes and its length.\nfunction walk(Q) {\n  let s = START, moves = 0\n  const cells = new Set([s])\n  while (s !== CHEST && moves < 60) { const a = Q[s].indexOf(Math.max(...Q[s])); s = move(s, a).next; cells.add(s); moves++ }\n  return { moves, cells }\n}\nconst mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length\n\n// Both learners, 500 episodes, α 0.5, ε 0.1 constant, γ 1, over 10 seeds. Predict first: which earns more per\n// episode while learning, and whose greedy walk is shorter?\nfor (const method of ['q', 'sarsa']) {\n  const runs = Array.from({ length: 10 }, (_, k) => train(method, { seed: k + 1 }))\n  const late = mean(runs.map((r) => mean(r.returns.slice(-100))))\n  const lengths = runs.map((r) => walk(r.Q).moves)\n  console.log((method === 'q' ? 'Q-learning' : 'SARSA     ') + ': return per episode (last 100) ' + late.toFixed(1) + ', greedy walk ' + lengths.join(', ') + ' moves')\n}",
              },
              {
                type: 'js',
                instruction: '### 3. Why: the values along the edge\nPredict first: whose Q(edge, right) is lower.',
                startCode: "// The cliff, as in Game Studio's Cliff Walk: 12 × 4 cells, start bottom-left, chest bottom-right, spikes between.\n// Every move costs 1; the spikes cost 100 and send you back to the start. A state is column × 4 + row.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst MOVES = [[0, -1], [1, 0], [0, 1], [-1, 0]], ARROWS = ['↑', '→', '↓', '←'], START = 0 * 4 + 3, CHEST = 11 * 4 + 3\nfunction move(s, a) {\n  const x = Math.min(11, Math.max(0, Math.floor(s / 4) + MOVES[a][0])), y = Math.min(3, Math.max(0, (s % 4) + MOVES[a][1]))\n  if (y === 3 && x > 0 && x < 11) return { next: START, reward: -100, done: false }\n  const next = x * 4 + y\n  return { next, reward: -1, done: next === CHEST }\n}\nconst greedyOf = (row, rand) => { const best = Math.max(...row), ties = []; row.forEach((q, a) => { if (q === best) ties.push(a) }); return ties[Math.floor(rand() * ties.length)] }\n// One learner, either update. SARSA chooses A′ before updating and then takes it; Q-learning uses the max.\nfunction train(method, { episodes = 500, alpha = 0.5, gamma = 1, eps0 = 0.1, eps1 = 0.1, seed = 1 } = {}) {\n  const rand = seeded(seed), Q = Array.from({ length: 48 }, () => [0, 0, 0, 0]), returns = []\n  const choose = (s, eps) => (rand() < eps ? Math.floor(rand() * 4) : greedyOf(Q[s], rand))\n  for (let ep = 0; ep < episodes; ep++) {\n    const eps = eps0 + (eps1 - eps0) * (ep / Math.max(1, episodes - 1))\n    let s = START, a = choose(s, eps), total = 0\n    for (let t = 0; t < 1000; t++) {\n      const r = move(s, a)\n      total += r.reward\n      const a2 = choose(r.next, eps)\n      const future = r.done ? 0 : method === 'sarsa' ? Q[r.next][a2] : Math.max(...Q[r.next])\n      Q[s][a] += alpha * (r.reward + gamma * future - Q[s][a])\n      if (r.done) break\n      s = r.next\n      a = method === 'sarsa' ? a2 : choose(s, eps)\n    }\n    returns.push(total)\n  }\n  return { Q, returns }\n}\n// The greedy walk: the cells it passes and its length.\nfunction walk(Q) {\n  let s = START, moves = 0\n  const cells = new Set([s])\n  while (s !== CHEST && moves < 60) { const a = Q[s].indexOf(Math.max(...Q[s])); s = move(s, a).next; cells.add(s); moves++ }\n  return { moves, cells }\n}\nconst mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length\n\n// Why. Along the edge (row 2), how much is moving right worth? Q-learning values the greedy walk: −1 a move to the\n// chest. SARSA values the walk it actually takes, with ε-random steps, some into the spikes. Predict first: whose\n// Q(edge, right) is lower?\nconst q = train('q', { seed: 1 }).Q, sarsa = train('sarsa', { seed: 1 }).Q\nfor (const col of [1, 5, 10]) {\n  const s = col * 4 + 2\n  console.log('column ' + col + ', row 2, right: Q-learning ' + q[s][1].toFixed(1) + ', SARSA ' + sarsa[s][1].toFixed(1))\n}",
              },
              {
                type: 'js',
                instruction: '### 4. When exploration stops\nPredict first: does SARSA switch to the 13-move walk?',
                startCode: "// The cliff, as in Game Studio's Cliff Walk: 12 × 4 cells, start bottom-left, chest bottom-right, spikes between.\n// Every move costs 1; the spikes cost 100 and send you back to the start. A state is column × 4 + row.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst MOVES = [[0, -1], [1, 0], [0, 1], [-1, 0]], ARROWS = ['↑', '→', '↓', '←'], START = 0 * 4 + 3, CHEST = 11 * 4 + 3\nfunction move(s, a) {\n  const x = Math.min(11, Math.max(0, Math.floor(s / 4) + MOVES[a][0])), y = Math.min(3, Math.max(0, (s % 4) + MOVES[a][1]))\n  if (y === 3 && x > 0 && x < 11) return { next: START, reward: -100, done: false }\n  const next = x * 4 + y\n  return { next, reward: -1, done: next === CHEST }\n}\nconst greedyOf = (row, rand) => { const best = Math.max(...row), ties = []; row.forEach((q, a) => { if (q === best) ties.push(a) }); return ties[Math.floor(rand() * ties.length)] }\n// One learner, either update. SARSA chooses A′ before updating and then takes it; Q-learning uses the max.\nfunction train(method, { episodes = 500, alpha = 0.5, gamma = 1, eps0 = 0.1, eps1 = 0.1, seed = 1 } = {}) {\n  const rand = seeded(seed), Q = Array.from({ length: 48 }, () => [0, 0, 0, 0]), returns = []\n  const choose = (s, eps) => (rand() < eps ? Math.floor(rand() * 4) : greedyOf(Q[s], rand))\n  for (let ep = 0; ep < episodes; ep++) {\n    const eps = eps0 + (eps1 - eps0) * (ep / Math.max(1, episodes - 1))\n    let s = START, a = choose(s, eps), total = 0\n    for (let t = 0; t < 1000; t++) {\n      const r = move(s, a)\n      total += r.reward\n      const a2 = choose(r.next, eps)\n      const future = r.done ? 0 : method === 'sarsa' ? Q[r.next][a2] : Math.max(...Q[r.next])\n      Q[s][a] += alpha * (r.reward + gamma * future - Q[s][a])\n      if (r.done) break\n      s = r.next\n      a = method === 'sarsa' ? a2 : choose(s, eps)\n    }\n    returns.push(total)\n  }\n  return { Q, returns }\n}\n// The greedy walk: the cells it passes and its length.\nfunction walk(Q) {\n  let s = START, moves = 0\n  const cells = new Set([s])\n  while (s !== CHEST && moves < 60) { const a = Q[s].indexOf(Math.max(...Q[s])); s = move(s, a).next; cells.add(s); moves++ }\n  return { moves, cells }\n}\nconst mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length\n\n// Theory says SARSA reaches the optimal policy if exploration fades towards zero but never stops (GLIE). Here ε\n// falls in a straight line from 0.1 to exactly 0, so in the last episodes it explores nothing.\n// Predict first: given 500, 2000 or 5000 episodes, does SARSA switch to the 13-move walk?\nfor (const episodes of [500, 2000, 5000]) {\n  const runs = Array.from({ length: 10 }, (_, k) => train('sarsa', { seed: k + 1, episodes, eps0: 0.1, eps1: 0 }))\n  console.log('SARSA, ε 0.1 → 0 over ' + episodes + ' episodes: greedy walk ' + runs.map((r) => walk(r.Q).moves).join(', ') + ' moves')\n}",
              },
              {
                type: 'js',
                instruction: '### 5. See it\nThe two greedy walks.',
                startCode: "// The cliff, as in Game Studio's Cliff Walk: 12 × 4 cells, start bottom-left, chest bottom-right, spikes between.\n// Every move costs 1; the spikes cost 100 and send you back to the start. A state is column × 4 + row.\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst MOVES = [[0, -1], [1, 0], [0, 1], [-1, 0]], ARROWS = ['↑', '→', '↓', '←'], START = 0 * 4 + 3, CHEST = 11 * 4 + 3\nfunction move(s, a) {\n  const x = Math.min(11, Math.max(0, Math.floor(s / 4) + MOVES[a][0])), y = Math.min(3, Math.max(0, (s % 4) + MOVES[a][1]))\n  if (y === 3 && x > 0 && x < 11) return { next: START, reward: -100, done: false }\n  const next = x * 4 + y\n  return { next, reward: -1, done: next === CHEST }\n}\nconst greedyOf = (row, rand) => { const best = Math.max(...row), ties = []; row.forEach((q, a) => { if (q === best) ties.push(a) }); return ties[Math.floor(rand() * ties.length)] }\n// One learner, either update. SARSA chooses A′ before updating and then takes it; Q-learning uses the max.\nfunction train(method, { episodes = 500, alpha = 0.5, gamma = 1, eps0 = 0.1, eps1 = 0.1, seed = 1 } = {}) {\n  const rand = seeded(seed), Q = Array.from({ length: 48 }, () => [0, 0, 0, 0]), returns = []\n  const choose = (s, eps) => (rand() < eps ? Math.floor(rand() * 4) : greedyOf(Q[s], rand))\n  for (let ep = 0; ep < episodes; ep++) {\n    const eps = eps0 + (eps1 - eps0) * (ep / Math.max(1, episodes - 1))\n    let s = START, a = choose(s, eps), total = 0\n    for (let t = 0; t < 1000; t++) {\n      const r = move(s, a)\n      total += r.reward\n      const a2 = choose(r.next, eps)\n      const future = r.done ? 0 : method === 'sarsa' ? Q[r.next][a2] : Math.max(...Q[r.next])\n      Q[s][a] += alpha * (r.reward + gamma * future - Q[s][a])\n      if (r.done) break\n      s = r.next\n      a = method === 'sarsa' ? a2 : choose(s, eps)\n    }\n    returns.push(total)\n  }\n  return { Q, returns }\n}\n// The greedy walk: the cells it passes and its length.\nfunction walk(Q) {\n  let s = START, moves = 0\n  const cells = new Set([s])\n  while (s !== CHEST && moves < 60) { const a = Q[s].indexOf(Math.max(...Q[s])); s = move(s, a).next; cells.add(s); moves++ }\n  return { moves, cells }\n}\nconst mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length\n\n// The two greedy walks on the grid (seed 1): Q-learning in green along the spikes, SARSA in blue along the top.\nconst paths = [[walk(train('q', { seed: 1 }).Q).cells, '#34d399'], [walk(train('sarsa', { seed: 1 }).Q).cells, '#60a5fa']]\nconst canvas = document.createElement('canvas'), W = 420, H = 180, C = 32\ncanvas.width = W * 2; canvas.height = H * 2; canvas.style.cssText = 'width: ' + W + 'px; height: ' + H + 'px; display: block; margin: 0 auto'\ndocument.body.appendChild(canvas)\nconst g = canvas.getContext('2d'); g.scale(2, 2); g.fillStyle = '#0f1923'; g.fillRect(0, 0, W, H)\nconst ox = 18, oy = 26\nfor (let x = 0; x < 12; x++) for (let y = 0; y < 4; y++) {\n  g.fillStyle = y === 3 && x > 0 && x < 11 ? '#7f1d1d' : x === 11 && y === 3 ? '#a16207' : '#1e293b'\n  g.fillRect(ox + x * C + 1, oy + y * C + 1, C - 2, C - 2)\n}\nfor (const [cells, color] of paths) {\n  g.fillStyle = color\n  for (const s of cells) { const x = Math.floor(s / 4), y = s % 4; g.beginPath(); g.arc(ox + x * C + C / 2, oy + y * C + C / 2, 6, 0, 2 * Math.PI); g.fill() }\n}\ng.fillStyle = '#cbd5e1'; g.font = '11px sans-serif'; g.fillText('green: Q-learning · blue: SARSA · red: spikes · gold: chest', ox, 16)\nconsole.log('cells: Q-learning ' + paths[0][0].size + ', SARSA ' + paths[1][0].size)",
                showPreviewByDefault: true,
                outputHeight: 230,
              },
              {
                type: 'challenge',
                instruction: "### 6. Challenge: SARSA's target\nThe cases below check it.",
                startCode: "// Write the SARSA target: given the reward, the next state's row of Q values, the action A′ that will be taken\n// there, whether the step ended the episode, and γ.\nfunction sarsaTarget(reward, nextRow, aNext, done, gamma) {\n  return 0\n}\n\n// ── The check (leave this part as it is) ──\nconst cases = [\n  { args: [-1, [-9, -8, -40, -10], 2, false, 1], want: -41, why: 'SARSA uses Q(S′, A′), the action it will take: −1 + (−40)' },\n  { args: [-1, [-9, -8, -40, -10], 1, false, 0.9], want: -8.2, why: 'γ discounts it: −1 + 0.9 × (−8)' },\n  { args: [10, [5, 5], 0, true, 1], want: 10, why: 'the step ended the episode: the target is R alone' },\n  { args: [0, [2, 7, 1], 0, false, 1], want: 2, why: 'not the max (7): the value of A′ = 0, which is 2' },\n]\nlet passed = 0\nfor (const [i, c] of cases.entries()) {\n  const got = sarsaTarget(...c.args)\n  const ok = typeof got === 'number' && Math.abs(got - c.want) < 1e-9\n  passed += ok\n  console.log((ok ? '✓' : '✗') + ' case ' + (i + 1) + ': got ' + (typeof got === 'number' ? +got.toFixed(6) : got) + (ok ? '' : ', want ' + c.want + ': ' + c.why))\n}\nconsole.log(passed === cases.length ? '✓ All 4 cases pass: that is SARSA.' : passed + ' of 4 cases pass.')",
                solutionCode: "// Write the SARSA target: given the reward, the next state's row of Q values, the action A′ that will be taken\n// there, whether the step ended the episode, and γ.\nfunction sarsaTarget(reward, nextRow, aNext, done, gamma) {\n  return reward + (done ? 0 : gamma * nextRow[aNext])\n}\n\n// ── The check (leave this part as it is) ──\nconst cases = [\n  { args: [-1, [-9, -8, -40, -10], 2, false, 1], want: -41, why: 'SARSA uses Q(S′, A′), the action it will take: −1 + (−40)' },\n  { args: [-1, [-9, -8, -40, -10], 1, false, 0.9], want: -8.2, why: 'γ discounts it: −1 + 0.9 × (−8)' },\n  { args: [10, [5, 5], 0, true, 1], want: 10, why: 'the step ended the episode: the target is R alone' },\n  { args: [0, [2, 7, 1], 0, false, 1], want: 2, why: 'not the max (7): the value of A′ = 0, which is 2' },\n]\nlet passed = 0\nfor (const [i, c] of cases.entries()) {\n  const got = sarsaTarget(...c.args)\n  const ok = typeof got === 'number' && Math.abs(got - c.want) < 1e-9\n  passed += ok\n  console.log((ok ? '✓' : '✗') + ' case ' + (i + 1) + ': got ' + (typeof got === 'number' ? +got.toFixed(6) : got) + (ok ? '' : ', want ' + c.want + ': ' + c.why))\n}\nconsole.log(passed === cases.length ? '✓ All 4 cases pass: that is SARSA.' : passed + ' of 4 cases pass.')",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'SARSA against Q-learning',
        props: {
          task: 'sarsa-vs-q',
          lesson: 'mg9-004',
          checkpoint: 'cp-mg9-004-4',
        },
      },
    ],
  },

  math: {
    prose: [
      "**Under the hood (optional).** SARSA's target is a sample of the Bellman expectation equation for the policy π it follows, $Q^\\pi(s, a) = \\mathbb{E}[R + \\gamma Q^\\pi(S', A') \\mid s, a]$ with $A' \\sim \\pi(\\cdot \\mid S')$. Q-learning's is a sample of the Bellman optimality equation, $Q^*(s, a) = \\mathbb{E}[R + \\gamma \\max_{a'} Q^*(S', a')]$.",
      'Convergence: tabular SARSA converges to $Q^*$ with probability 1 if every pair is visited infinitely often, the step sizes satisfy the usual conditions, and the policy is GLIE (Singh et al., 2000). Q-learning converges to $Q^*$ with any behaviour policy that visits every pair infinitely often.',
      "Expected SARSA, $R + \\gamma \\sum_{a'} \\pi(a' \\mid S') Q(S', a')$, removes the randomness of A′ from SARSA's target; with a greedy π it is exactly Q-learning. Lesson 9.5 compares it with the others.",
    ],
    equations: [
      {
        label: 'SARSA',
        latex: "Q(S, A) \\leftarrow Q(S, A) + \\alpha\\,[R + \\gamma\\,Q(S', A') - Q(S, A)]",
      },
      {
        label: 'Q-learning',
        latex: "Q(S, A) \\leftarrow Q(S, A) + \\alpha\\,[R + \\gamma \\max_{a'} Q(S', a') - Q(S, A)]",
      },
      {
        label: 'Expected SARSA',
        latex: "Q(S, A) \\leftarrow Q(S, A) + \\alpha\\,[R + \\gamma \\textstyle\\sum_{a'} \\pi(a' \\mid S')\\,Q(S', a') - Q(S, A)]",
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      "Formal statement: for a fixed ε > 0, SARSA converges to the optimal ε-greedy policy's values (the best policy among ε-soft ones), not to $Q^*$; Q-learning's greedy policy converges to an optimal one while its behaviour stays ε-greedy.",
      "Invariant: if ε = 0 throughout and ties are broken the same way, SARSA's and Q-learning's updates are identical, because A′ is then the greedy action.",
      "Geometric picture: on the cliff, the ε-soft optimal policy trades path length for distance from danger; as ε shrinks, the safe path's advantage shrinks with it.",
      "Where it goes: 9.5, Expected SARSA and Double Q-learning, and the bias hidden in Q-learning's max.",
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg9-004-ex1',
      title: 'The two targets',
      difficulty: 'easy',
      problem: "R = −1, Q(S′, ·) = [−5, −3, −7], A′ = 0 (chosen), γ = 1. Q-learning's and SARSA's targets?",
      steps: [
        {
          expression: '-1 + \\max(-5, -3, -7) = -4',
          annotation: 'Q-learning uses the best.',
          strategyTitle: 'Step 1: Q-learning',
        },
        {
          expression: "-1 + Q(S', 0) = -6",
          annotation: 'SARSA uses the chosen A′.',
          strategyTitle: 'Step 2: SARSA',
        },
      ],
      answer: '−4 and −6.',
    },
    {
      id: 'mg9-004-ex2',
      title: 'When they agree',
      difficulty: 'medium',
      problem: "Show that with ε = 0 SARSA's target equals Q-learning's.",
      steps: [
        {
          expression: "A' = \\arg\\max_{a'} Q(S', a')",
          annotation: 'A greedy policy picks the best action.',
          strategyTitle: 'Step 1: A′',
        },
        {
          expression: "Q(S', A') = \\max_{a'} Q(S', a')",
          annotation: 'So the targets match.',
          strategyTitle: 'Step 2: equal',
        },
      ],
      answer: 'With no exploration the action taken is the best one, so the two targets coincide.',
    },
    {
      id: 'mg9-004-ex3',
      title: 'A SARSA update',
      difficulty: 'hard',
      problem: 'Q(S, A) = −10, R = −1, A′ chosen with Q(S′, A′) = −12, γ = 1, α = 0.5. New Q(S, A)?',
      steps: [
        {
          expression: '\\text{target} = -1 + (-12) = -13',
          annotation: "SARSA's target.",
          strategyTitle: 'Step 1: target',
        },
        {
          expression: '-10 + 0.5 \\times (-3) = -11.5',
          annotation: 'δ = −3.',
          strategyTitle: 'Step 2: update',
        },
      ],
      answer: '−11.5.',
    },
  ],

  challenges: [
    {
      id: 'mg9-004-ch1',
      title: 'Name the policies',
      difficulty: 'easy',
      problem: 'In Q-learning, which is the behaviour policy and which the target policy?',
      hint: 'One acts, one is learned about.',
      answer: 'The behaviour policy is ε-greedy (it acts); the target policy is greedy (its values are learned).',
      walkthrough: [],
    },
    {
      id: 'mg9-004-ch2',
      title: 'A live game',
      difficulty: 'medium',
      problem: 'An NPC learns while players watch, and its random moves cost it lives. SARSA or Q-learning, and why?',
      hint: 'It keeps exploring in front of players.',
      answer: 'SARSA learns values that include its own exploration, so it avoids risky places while exploring; Q-learning would learn the risky optimal path and keep falling while it explores.',
      walkthrough: [],
    },
    {
      id: 'mg9-004-ch3',
      title: 'Why the freeze',
      difficulty: 'hard',
      problem: 'Explain cell 4. Why does ε reaching exactly 0 keep SARSA on the 17-move walk even after 5000 episodes?',
      hint: 'Which state-action pairs get updated after ε is 0?',
      answer: 'With ε = 0, SARSA only takes greedy actions along its learned walk, so the edge cells are never visited and their values are never corrected; nothing tells it the edge is shorter. GLIE needs ε to shrink but stay above 0 so that every pair keeps being tried.',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'A′',
        meaning: 'The next action, chosen before the update (SARSA).',
      },
      {
        symbol: 'on-policy',
        meaning: 'Learns the values of the policy it follows.',
      },
      {
        symbol: 'off-policy',
        meaning: "Learns another policy's values (Q-learning: the greedy one).",
      },
      {
        symbol: 'behaviour policy',
        meaning: 'The policy that acts.',
      },
      {
        symbol: 'target policy',
        meaning: 'The policy whose values are learned.',
      },
    ],
    rulesOfThumb: [
      'SARSA if exploration keeps costing; Q-learning for the best policy once exploring stops.',
      'Choose A′, use it in the target, then take it.',
      'Fade exploration; do not stop it before learning is done.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'SARSA is a worse Q-learning.',
      whyStudentsThinkIt: 'Its greedy walk is longer.',
      correctionExample: 'It earns more while learning on the cliff (cell 2).',
      contrastCase: "Once exploring stops, Q-learning's walk is better.",
    },
    {
      falseBelief: "Decaying ε to 0 makes SARSA converge to Q-learning's answer.",
      whyStudentsThinkIt: 'With ε = 0 the targets coincide.',
      correctionExample: 'Cell 4 keeps 17 moves after 5000 episodes.',
      contrastCase: 'With ε fading but never 0 (GLIE), it eventually does.',
    },
  ],

  transferPrompts: [
    {
      situation: 'Learning from recordings of human play.',
      competingTechniques: ['SARSA', 'Q-learning'],
      whyThisTechniqueWins: "Off-policy learning can learn the greedy policy's values from another policy's actions.",
    },
    {
      situation: 'A robot learning on real hardware where falls break it.',
      competingTechniques: ['Q-learning', 'SARSA'],
      whyThisTechniqueWins: "SARSA's values account for its own exploration, steering it away from danger while it learns.",
    },
  ],

  debugging: [
    {
      commonError: 'Choosing A′ again after the update.',
      symptom: "Results between SARSA's and Q-learning's.",
      whyItHappened: 'The action taken is not the one in the target.',
      repairStrategy: 'Keep the chosen A′ and take it next step.',
    },
    {
      commonError: 'Judging SARSA by its greedy walk only.',
      symptom: 'SARSA looks worse than it is.',
      whyItHappened: "Its job is the exploring policy's values.",
      repairStrategy: 'Report the learning return too.',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Implement SARSA and Q-learning and reproduce the cliff result.',
    explainVerbally: 'Explain on-policy and off-policy, and why the cliff walks differ.',
    detectIncorrectApplication: 'Spot a SARSA that re-chooses A′, and exploration stopped too soon.',
    transferToUnfamiliar: 'Choose between them for a new problem.',
  },

  assessment: {
    questions: [
      {
        id: 'mg9-004-assess-1',
        type: 'choice',
        text: "R = 0, Q(S′, ·) = [2, 5], A′ = 0, γ = 1. SARSA's target?",
        options: ['2', '5', '0', '7'],
        answer: '2',
        hint: 'The chosen A′.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg9-004-quiz-1',
      type: 'choice',
      text: "SARSA's target uses",
      options: [
        'Q(S′, A′), the next action it will take',
        'max Q(S′, ·)',
        "The episode's return",
        'V(S′)',
      ],
      answer: 'Q(S′, A′), the next action it will take',
      hints: ['Cell 1.'],
      reviewSection: 'Intuition — one step, two targets',
    },
    {
      id: 'mg9-004-quiz-2',
      type: 'choice',
      text: 'Q-learning is off-policy because',
      options: [
        'It learns the greedy policy while acting ε-greedily',
        'It never explores',
        'It uses episodes',
        'It uses two tables',
      ],
      answer: 'It learns the greedy policy while acting ε-greedily',
      hints: ['What each learns.'],
      reviewSection: 'Intuition — what each learns',
    },
    {
      id: 'mg9-004-quiz-3',
      type: 'choice',
      text: 'On the cliff, while exploring, which earns more per episode?',
      options: ['SARSA', 'Q-learning', 'They are equal', 'Neither learns'],
      answer: 'SARSA',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg9-004-quiz-4',
      type: 'choice',
      text: "SARSA's Q(edge, right) is lower than Q-learning's because",
      options: [
        'It includes the falls its own random steps cause',
        'SARSA uses a smaller γ',
        'SARSA trained less',
        'It is a bug',
      ],
      answer: 'It includes the falls its own random steps cause',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg9-004-quiz-5',
      type: 'choice',
      text: 'With ε falling to exactly 0, SARSA after 5000 episodes walks',
      options: [
        '17 moves, still the safe way',
        '13 moves',
        'It cannot finish',
        '11 moves',
      ],
      answer: '17 moves, still the safe way',
      hints: ['Cell 4.'],
      reviewSection: 'Cell 4',
    },
    {
      id: 'mg9-004-quiz-6',
      type: 'choice',
      text: "With ε = 0 throughout, SARSA's update is",
      options: [
        "The same as Q-learning's",
        'Always smaller',
        'Undefined',
        'Monte Carlo',
      ],
      answer: "The same as Q-learning's",
      hints: ['Example 2.'],
      reviewSection: 'Examples',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg9-004-1',
      label: 'Read the two targets',
      type: 'read',
    },
    {
      id: 'cp-mg9-004-2',
      label: 'Read on-policy and off-policy',
      type: 'read',
    },
    {
      id: 'cp-mg9-004-3',
      label: 'Run the notebook: both on the cliff',
      type: 'read',
    },
    {
      id: 'cp-mg9-004-4',
      label: 'Complete "SARSA against Q-learning" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg9-004-5',
      label: 'Compare them over seeds',
      type: 'lab',
    },
    {
      id: 'cp-mg9-004-6',
      label: 'Work through the two targets example',
      type: 'example',
    },
    {
      id: 'cp-mg9-004-7',
      label: 'Work through the SARSA update example',
      type: 'example',
    },
    {
      id: 'cp-mg9-004-8',
      label: 'Pass the SARSA target challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-9',
}
