export default {
  order: 7,

  id: 'mg9-007',

  slug: 'bigger-state-spaces',

  title: 'Bigger State Spaces',

  subtitle: 'How many states, and which. Too few blind the agent, too many starve it, and the right number can replace ten.',

  tags: [
    'game-studio',
    'machine-learning',
    'reinforcement-learning',
    'state-design',
    'aliasing',
    'markov-property',
    'discretization',
  ],

  aliases: 'state space discretization binning resolution aliasing perceptual aliasing markov property partial observability curse of dimensionality feature engineering',

  timeToComplete: 50,

  coreConcept: 'A table learns one value per state, so the states decide what the agent can tell apart. Too coarse, and two situations that need different actions share a state (aliasing): the agent can only learn their average, and may get worse with training. Too fine, and each state is visited rarely, so learning is slow: every number added multiplies the states. The cure for aliasing is the missing information, and the best cure is often one engineered number (where the ball will land) rather than more raw ones.',

  prerequisites: ['mg9-006'],

  nextLesson: 'mg9-008',

  hook: {
    question: 'You give the agent more detail about the game, and it plays worse. You give it less, and it plays perfectly. How can more information hurt, and how do you choose?',
    realWorldContext: 'Every table-based method faces this; it is why deep reinforcement learning replaced tables with networks that generalise between similar states (lesson 9.8), and why feature design still matters there. Sutton & Barto, chapter 9 (on-policy prediction with approximation), discusses state aggregation, the formal name for binning.',
  },

  intuition: {
    prose: [
      '**Resolution** (cell 1, the catch game of lesson 9.3, ball − paddle in different bins). With 2 bins (left, or right-or-under), "right under the paddle" shares a state with "to the right", so the agent cannot learn to stay; it gets worse the longer it trains (catches 0.45, then 0.10, then 0.00). With 3 or 7 bins it catches everything within 100 episodes. With 39 bins (one per possible difference) it is exact but slow: 0.79 after 100 episodes, 0.67 after 1000, 1.00 only by 5000. Before running it, predict which learns fastest.',
      '**Aliasing** (cell 2). Now each ball drifts sideways (−1, 0 or +1 columns a row). Seeing only ball − paddle, a drifting ball and a still one look the same but need different moves: catches 0.46. Adding the drift as a second number (21 states) gives 0.84. One engineered number, where the ball will land minus the paddle, gives 1.00 with only 7 states: it contains exactly what decides the move.',
      '**The Markov property.** A state is *Markov* if it holds everything about the past that matters for the future: $P(S_{t+1}, R_{t+1} \\mid S_t, A_t) = P(S_{t+1}, R_{t+1} \\mid S_t, A_t, S_{t-1}, \\ldots)$. Aliased states are not, which is why the drifting agent cannot do better than average. A common fix in games is to add velocity (the change since the last frame), as Breakout\'s "falling" bit does.',
      '**Cost** (cell 3). A budget of 10,000 updates gives 1,429 per state for 7 states but one per state for 10,000. Breakout measures it (100 episodes, 3 seeds): 3 bins across score 39, 21, 21; 7 bins 35, 48, 48; 13 bins 38, 46, 42; adding "ball going right" (28 states) 40, 44, 45. The extra number can help in principle, but not within this budget. Start with the fewest states that tell apart the situations needing different actions; add numbers when you can show a situation they fix.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: designing states',
        body: 'Step 1. List the situations that need different actions. Step 2. Find the fewest numbers that tell them apart; prefer one engineered number to several raw ones. Step 3. Bin each where the right action changes, finer where it matters (near the paddle), coarser elsewhere. Step 4. Count the states; estimate updates per state from your training budget. Step 5. Measure against a coarser and a finer design (Compare, or separate runs over seeds).',
      },
      {
        type: 'warning',
        title: 'An aliased agent can get worse with training',
        body: 'If one state covers situations needing opposite actions, the values chase whichever happened recently, and the greedy choice can settle on the wrong one (cell 1, 2 bins: 0.45, then 0.10, then 0.00).',
      },
      {
        type: 'warning',
        title: 'Raw numbers are rarely the best numbers',
        body: 'Positions and speeds are what the game stores; the agent needs what decides the action. A relative or predicted quantity (ball − paddle, where it will land) often replaces several raw ones.',
      },
      {
        type: 'insight',
        title: 'Why tables give way to networks',
        body: 'A table cannot share what it learns between neighbouring states: each of 39 bins is learned alone. Function approximation (lesson 9.8) lets nearby states share, which is how agents handle millions of states.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: how many states, and which',
        caption: 'Resolution, aliasing and its fixes, and what states cost.',
        props: {
          lesson: {
            title: 'Bigger state spaces',
            subtitle: 'Resolution, aliasing, cost.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. Resolution\nPredict first: which learns fastest, which ends best.',
                startCode: '// A wide catch game, as in lesson 9.3: 20 columns, the ball falls 10 rows, the paddle starts in the middle and\n// moves left, stays or moves right each row. +1 a catch, −1 a miss. This time the ball can drift: each episode it\n// is given a drift of −1, 0 or +1 columns per row (with "drift" on), so where it lands depends on more than where\n// it is. (Game Studio\'s random-number generator.)\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst COLS = 20, ROWS = 10\nconst bin = (v, cuts) => { let i = 0; while (i < cuts.length && v >= cuts[i]) i++; return i }\nfunction learn(observe, states, { episodes = 3000, drift = false, seed = 1 } = {}) {\n  const rand = seeded(seed), Q = Array.from({ length: states }, () => [0, 0, 0])\n  const pick = (row) => { const best = Math.max(...row), ties = [0, 1, 2].filter((a) => row[a] === best); return ties[Math.floor(rand() * ties.length)] }\n  const newGame = (r) => ({ ball: 4 + Math.floor(r() * 12), paddle: COLS / 2, row: 0, drift: drift ? Math.floor(r() * 3) - 1 : 0 })\n  const step = (g, a) => { g.paddle = Math.min(COLS - 1, Math.max(0, g.paddle + a - 1)); g.ball = Math.min(COLS - 1, Math.max(0, g.ball + g.drift)); g.row++ }\n  for (let ep = 0; ep < episodes; ep++) {\n    const g = newGame(rand)\n    let s = observe(g)\n    for (;;) {\n      const a = rand() < 0.1 ? Math.floor(rand() * 3) : pick(Q[s])\n      step(g, a)\n      const done = g.row === ROWS, r = done ? (g.ball === g.paddle ? 1 : -1) : 0, next = observe(g)\n      Q[s][a] += 0.2 * (r + (done ? 0 : 0.97 * Math.max(...Q[next])) - Q[s][a])\n      if (done) break\n      s = next\n    }\n  }\n  // The greedy catch rate over 300 fresh games.\n  const test = seeded(seed + 1000)\n  let caught = 0\n  for (let k = 0; k < 300; k++) {\n    const g = newGame(test)\n    while (g.row < ROWS) { const q = Q[observe(g)]; step(g, q.indexOf(Math.max(...q))) }\n    caught += g.ball === g.paddle ? 1 : 0\n  }\n  return caught / 300\n}\n\n// Resolution. The difference ball − paddle cut into 2, 3, 7 or 39 bins (39: one per possible difference, exact).\n// Predict first: which learns fastest, and which ends best?\nconst designs = [[\'2 bins\', [0]], [\'3 bins\', [-0.5, 0.5]], [\'7 bins\', [-6, -2, -0.5, 0.5, 2, 6]], [\'39 bins\', Array.from({ length: 38 }, (_, k) => k - 18.5)]]\nfor (const [name, cuts] of designs) {\n  const rates = [100, 1000, 5000].map((episodes) => learn((g) => bin(g.ball - g.paddle, cuts), cuts.length + 1, { episodes }))\n  console.log(name.padEnd(8) + \': catches after 100 episodes \' + rates[0].toFixed(2) + \', 1000 \' + rates[1].toFixed(2) + \', 5000 \' + rates[2].toFixed(2))\n}',
              },
              {
                type: 'js',
                instruction: '### 2. Aliasing\nPredict first: what does adding the drift do?',
                startCode: '// A wide catch game, as in lesson 9.3: 20 columns, the ball falls 10 rows, the paddle starts in the middle and\n// moves left, stays or moves right each row. +1 a catch, −1 a miss. This time the ball can drift: each episode it\n// is given a drift of −1, 0 or +1 columns per row (with "drift" on), so where it lands depends on more than where\n// it is. (Game Studio\'s random-number generator.)\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst COLS = 20, ROWS = 10\nconst bin = (v, cuts) => { let i = 0; while (i < cuts.length && v >= cuts[i]) i++; return i }\nfunction learn(observe, states, { episodes = 3000, drift = false, seed = 1 } = {}) {\n  const rand = seeded(seed), Q = Array.from({ length: states }, () => [0, 0, 0])\n  const pick = (row) => { const best = Math.max(...row), ties = [0, 1, 2].filter((a) => row[a] === best); return ties[Math.floor(rand() * ties.length)] }\n  const newGame = (r) => ({ ball: 4 + Math.floor(r() * 12), paddle: COLS / 2, row: 0, drift: drift ? Math.floor(r() * 3) - 1 : 0 })\n  const step = (g, a) => { g.paddle = Math.min(COLS - 1, Math.max(0, g.paddle + a - 1)); g.ball = Math.min(COLS - 1, Math.max(0, g.ball + g.drift)); g.row++ }\n  for (let ep = 0; ep < episodes; ep++) {\n    const g = newGame(rand)\n    let s = observe(g)\n    for (;;) {\n      const a = rand() < 0.1 ? Math.floor(rand() * 3) : pick(Q[s])\n      step(g, a)\n      const done = g.row === ROWS, r = done ? (g.ball === g.paddle ? 1 : -1) : 0, next = observe(g)\n      Q[s][a] += 0.2 * (r + (done ? 0 : 0.97 * Math.max(...Q[next])) - Q[s][a])\n      if (done) break\n      s = next\n    }\n  }\n  // The greedy catch rate over 300 fresh games.\n  const test = seeded(seed + 1000)\n  let caught = 0\n  for (let k = 0; k < 300; k++) {\n    const g = newGame(test)\n    while (g.row < ROWS) { const q = Q[observe(g)]; step(g, q.indexOf(Math.max(...q))) }\n    caught += g.ball === g.paddle ? 1 : 0\n  }\n  return caught / 300\n}\n\n// Aliasing. Now the ball drifts. Seeing only ball − paddle, a drifting ball and a still one in the same place are\n// the same state but need different moves. Predict first: what does adding the drift (one more number, 3 bins) do?\nconst cuts = [-6, -2, -0.5, 0.5, 2, 6]\nconst without = learn((g) => bin(g.ball - g.paddle, cuts), 7, { drift: true, episodes: 5000 })\nconst withDrift = learn((g) => bin(g.ball - g.paddle, cuts) * 3 + (g.drift + 1), 21, { drift: true, episodes: 5000 })\n// Where it will land (ball + drift × rows left) minus the paddle: one number that already contains the drift.\nconst landing = learn((g) => bin(g.ball + g.drift * (ROWS - g.row) - g.paddle, cuts), 7, { drift: true, episodes: 5000 })\nconsole.log(\'drifting, sees ball − paddle (7 states):               catches \' + without.toFixed(2))\nconsole.log(\'drifting, sees ball − paddle and drift (21 states):    catches \' + withDrift.toFixed(2))\nconsole.log(\'drifting, sees where it will land − paddle (7 states): catches \' + landing.toFixed(2))',
              },
              {
                type: 'js',
                instruction: '### 3. What states cost\nPredict first: updates per state for 4 numbers in 10 bins.',
                startCode: "// How many states each design needs, and how many episodes a fixed training budget gives each state. Suppose\n// 1000 episodes of 10 decisions: 10,000 updates. Predict first: with 4 numbers in 10 bins each, how many updates\n// does a state get on average?\nfor (const [name, bins] of [['1 number, 7 bins', [7]], ['2 numbers, 7 × 3', [7, 3]], ['3 numbers, 10 bins each', [10, 10, 10]], ['4 numbers, 10 bins each', [10, 10, 10, 10]]]) {\n  const states = bins.reduce((a, b) => a * b, 1)\n  console.log(name.padEnd(24) + ': ' + String(states).padStart(5) + ' states, about ' + (10000 / states).toFixed(1) + ' updates each')\n}",
              },
              {
                type: 'challenge',
                instruction: '### 4. Challenge: from bins to a state\nThe cases below check it.',
                startCode: "// Write the state number for binned readings, as Game Studio does: a reading's bin is how many cuts are below it, and\n// the readings combine like digits, the first most significant: state = ((b₁ × n₂ + b₂) × n₃ + b₃) …, where n is a\n// reading's number of bins (cuts + 1).\nfunction stateOf(values, bins) {\n  return 0\n}\n\n// ── The check (leave this part as it is) ──\nconst B = [[-0.25, -0.1, -0.03, 0.03, 0.1, 0.25], [0.5]]\nconst cases = [\n  { args: [[0, 1], B], want: 7, why: 'across 0 is bin 3 (three cuts below it); falling 1 is bin 1; 3 × 2 + 1' },\n  { args: [[-0.9, 1], B], want: 1, why: 'across is in its first bin (0); falling is bin 1: 0 × 2 + 1' },\n  { args: [[0.25, 0], B], want: 12, why: 'a value equal to a cut is in the bin above it: 0.25 is bin 6; 6 × 2 + 0' },\n  { args: [[5, 2, 7], [[3], [], [1, 5, 9]]], want: 6, why: 'a reading with no cuts is not part of the state: bins 1 and 2, with 4 bins in the last: 1 × 4 + 2' },\n]\nlet passed = 0\nfor (const [i, c] of cases.entries()) {\n  const got = stateOf(...c.args)\n  const ok = got === c.want\n  passed += ok\n  console.log((ok ? '✓' : '✗') + ' case ' + (i + 1) + ': got ' + got + (ok ? '' : ', want ' + c.want + ': ' + c.why))\n}\nconsole.log(passed === cases.length ? '✓ All 4 cases pass: that is how bins make states.' : passed + ' of 4 cases pass.')",
                solutionCode: "// Write the state number for binned readings, as Game Studio does: a reading's bin is how many cuts are below it, and\n// the readings combine like digits, the first most significant: state = ((b₁ × n₂ + b₂) × n₃ + b₃) …, where n is a\n// reading's number of bins (cuts + 1).\nfunction stateOf(values, bins) {\n  let s = 0\n  bins.forEach((cuts, i) => {\n    if (!cuts.length) return\n    let b = 0\n    while (b < cuts.length && values[i] >= cuts[b]) b++\n    s = s * (cuts.length + 1) + b\n  })\n  return s\n}\n\n// ── The check (leave this part as it is) ──\nconst B = [[-0.25, -0.1, -0.03, 0.03, 0.1, 0.25], [0.5]]\nconst cases = [\n  { args: [[0, 1], B], want: 7, why: 'across 0 is bin 3 (three cuts below it); falling 1 is bin 1; 3 × 2 + 1' },\n  { args: [[-0.9, 1], B], want: 1, why: 'across is in its first bin (0); falling is bin 1: 0 × 2 + 1' },\n  { args: [[0.25, 0], B], want: 12, why: 'a value equal to a cut is in the bin above it: 0.25 is bin 6; 6 × 2 + 0' },\n  { args: [[5, 2, 7], [[3], [], [1, 5, 9]]], want: 6, why: 'a reading with no cuts is not part of the state: bins 1 and 2, with 4 bins in the last: 1 × 4 + 2' },\n]\nlet passed = 0\nfor (const [i, c] of cases.entries()) {\n  const got = stateOf(...c.args)\n  const ok = got === c.want\n  passed += ok\n  console.log((ok ? '✓' : '✗') + ' case ' + (i + 1) + ': got ' + got + (ok ? '' : ', want ' + c.want + ': ' + c.why))\n}\nconsole.log(passed === cases.length ? '✓ All 4 cases pass: that is how bins make states.' : passed + ' of 4 cases pass.')",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'How many states?',
        props: {
          task: 'state-design',
          lesson: 'mg9-007',
          checkpoint: 'cp-mg9-007-4',
        },
      },
    ],
  },

  math: {
    prose: [
      "**Under the hood (optional).** Binning is *state aggregation*: a map $\\phi$ from situations to a finite set, with one value per group. Q-learning on aggregated states converges, but to values of a different (aggregated) problem; its greedy policy is optimal for the original only if each group's situations share their best action.",
      "The Markov property, formally: $P(S_{t+1} = s', R_{t+1} = r \\mid S_t, A_t) = P(S_{t+1} = s', R_{t+1} = r \\mid H_t, A_t)$ for the whole history $H_t$. When the observation is not Markov, the problem is a POMDP; remedies are adding history (velocity, the last few observations) or engineering a sufficient statistic (where the ball will land).",
      'With d numbers each in k bins there are $k^d$ states: the curse of dimensionality. A fixed budget of N updates gives about $N / k^d$ per state.',
    ],
    equations: [
      {
        label: 'Markov property',
        latex: 'P(S_{t+1}, R_{t+1} \\mid S_t, A_t) = P(S_{t+1}, R_{t+1} \\mid S_t, A_t, S_{t-1}, A_{t-1}, \\ldots)',
      },
      {
        label: 'State count',
        latex: '|\\mathcal{S}| = \\prod_{i=1}^{d} k_i = k^d',
      },
      {
        label: 'Updates per state',
        latex: '\\frac{N}{|\\mathcal{S}|}',
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      'Formal statement: an aggregation is $Q^*$-irrelevant if situations grouped together have equal optimal action values; Q-learning on such an aggregation finds an optimal policy (Li, Walsh & Littman, 2006).',
      'Invariant: refining bins never removes information, so the best achievable policy can only improve; what suffers is learning speed.',
      'Geometric picture: bins are a grid over the observation space; aliasing is a cell that straddles a boundary where the best action changes.',
      'Where it goes: 9.8 replaces the grid with features that let nearby situations share what they learn.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg9-007-ex1',
      title: 'A state number',
      difficulty: 'easy',
      problem: "Across 0.05 with Breakout's cuts, falling 0. Which state?",
      steps: [
        {
          expression: '0.05 \\to \\text{bin } 4',
          annotation: 'Four cuts (−0.25, −0.1, −0.03, 0.03) are below it.',
          strategyTitle: 'Step 1: across',
        },
        {
          expression: '4 \\times 2 + 0 = 8',
          annotation: 'Combine like digits.',
          strategyTitle: 'Step 2: combine',
        },
      ],
      answer: 'State 8.',
    },
    {
      id: 'mg9-007-ex2',
      title: 'Counting the cost',
      difficulty: 'medium',
      problem: '7 bins across, 2 falling, 2 sideways, 4 heights. States, and updates each from 20,000?',
      steps: [
        {
          expression: '7 \\times 2 \\times 2 \\times 4 = 112',
          annotation: 'The product.',
          strategyTitle: 'Step 1: count',
        },
        {
          expression: '20000 / 112 \\approx 179',
          annotation: 'Per state, on average.',
          strategyTitle: 'Step 2: budget',
        },
      ],
      answer: '112 states, about 179 updates each (and far fewer for rare states).',
    },
    {
      id: 'mg9-007-ex3',
      title: 'An engineered number',
      difficulty: 'hard',
      problem: 'The ball is at column 8, drifting +1 a row, 4 rows to go; the paddle at 10. What is "landing − paddle"?',
      steps: [
        {
          expression: '8 + 1 \\times 4 - 10 = 2',
          annotation: "Where it will be when it reaches the paddle's row.",
          strategyTitle: 'Step 1: predict',
        },
      ],
      answer: '2: move right, though the ball is now to the left.',
    },
  ],

  challenges: [
    {
      id: 'mg9-007-ch1',
      title: 'Why worse with training',
      difficulty: 'easy',
      problem: 'Why can an agent with 2 bins get worse the longer it trains?',
      hint: "What does one state's value average over?",
      answer: 'Its state mixes situations needing different moves; the values follow whichever happened lately and can settle the greedy choice on the wrong one.',
      walkthrough: [],
    },
    {
      id: 'mg9-007-ch2',
      title: 'Velocity',
      difficulty: 'medium',
      problem: 'Why does a game agent often need velocity, and how can it get it if the game only gives positions?',
      hint: 'The Markov property.',
      answer: "Position alone does not say where things are going; the difference between this frame's and the last frame's position gives velocity, making the state (closer to) Markov.",
      walkthrough: [],
    },
    {
      id: 'mg9-007-ch3',
      title: 'A budget',
      difficulty: 'hard',
      problem: 'You can afford 50,000 updates and want at least 100 per state. How many bins can each of 3 numbers have?',
      hint: 'k³ ≤ 500.',
      answer: 'k³ ≤ 500, so k ≤ 7 (7³ = 343).',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'aliasing',
        meaning: 'Situations needing different actions sharing one state.',
      },
      {
        symbol: 'Markov',
        meaning: 'The state holds everything about the past that matters.',
      },
      {
        symbol: 'k^d',
        meaning: 'States for d numbers in k bins each.',
      },
      {
        symbol: 'N/|S|',
        meaning: 'Updates per state from a budget of N.',
      },
    ],
    rulesOfThumb: [
      'Fewest states that separate the situations needing different actions.',
      'One engineered number beats several raw ones.',
      'Finer bins where the action changes.',
      'Count states against your training budget.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'More detail always helps.',
      whyStudentsThinkIt: 'It cannot hurt to know more.',
      correctionExample: '39 exact bins learn far slower than 7 (cell 1).',
      contrastCase: 'Missing detail hurts more (2 bins, cell 1).',
    },
    {
      falseBelief: 'A failing agent needs more training.',
      whyStudentsThinkIt: 'Learning takes time.',
      correctionExample: 'The 2-bin agent gets worse with training.',
      contrastCase: 'Fix the states first, then train.',
    },
  ],

  transferPrompts: [
    {
      situation: 'An NPC must dodge projectiles.',
      competingTechniques: [
        "Every projectile's position",
        'Time until the nearest projectile reaches it',
        'and from which side',
      ],
      whyThisTechniqueWins: 'The engineered numbers decide the dodge and keep the states few.',
    },
    {
      situation: 'A racing AI wobbles on straights.',
      competingTechniques: ['More bins everywhere', 'Finer bins near the centre line only'],
      whyThisTechniqueWins: 'Resolution where the action changes, without multiplying states elsewhere.',
    },
  ],

  debugging: [
    {
      commonError: 'A cut point exactly where the right action changes is missing.',
      symptom: 'The agent dithers or gets worse with training.',
      whyItHappened: 'A state straddles the change.',
      repairStrategy: 'Add a cut there.',
    },
    {
      commonError: 'Too many binned numbers.',
      symptom: 'Learning curve barely rises; many grey rows in the table.',
      whyItHappened: 'Each state is rarely visited.',
      repairStrategy: 'Remove numbers or bins; engineer one that combines them.',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Design and measure states for a game.',
    explainVerbally: 'Explain resolution, aliasing, the Markov property and cost.',
    detectIncorrectApplication: 'Spot aliased and overgrown state designs.',
    transferToUnfamiliar: 'Engineer a deciding number for a new game.',
  },

  assessment: {
    questions: [
      {
        id: 'mg9-007-assess-1',
        type: 'choice',
        text: '3 numbers in 10 bins each make',
        options: ['1000 states', '30 states', '300 states', '10 states'],
        answer: '1000 states',
        hint: '10 × 10 × 10.',
      },
    ],
  },

  quiz: [
    {
      id: 'mg9-007-quiz-1',
      type: 'choice',
      text: 'With 2 bins, the catch agent over more training',
      options: ['Gets worse', 'Gets better', 'Stays perfect', 'Cannot start'],
      answer: 'Gets worse',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg9-007-quiz-2',
      type: 'choice',
      text: 'The drifting ball is caught every time when the agent sees',
      options: [
        'Where it will land minus the paddle',
        'Only ball − paddle',
        'The drift alone',
        'Nothing',
      ],
      answer: 'Where it will land minus the paddle',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg9-007-quiz-3',
      type: 'choice',
      text: 'A state is Markov when',
      options: [
        'It holds everything about the past that matters for the future',
        'It has few bins',
        'Rewards are positive',
        'γ = 1',
      ],
      answer: 'It holds everything about the past that matters for the future',
      hints: ['Markov paragraph.'],
      reviewSection: 'Intuition — the Markov property',
    },
    {
      id: 'mg9-007-quiz-4',
      type: 'choice',
      text: 'On Breakout, the best of 3, 7 and 13 bins across was',
      options: ['7', '3', '13', 'All equal'],
      answer: '7',
      hints: ['Cost paragraph.'],
      reviewSection: 'Intuition — cost',
    },
    {
      id: 'mg9-007-quiz-5',
      type: 'choice',
      text: '10,000 updates over 10,000 states give each state about',
      options: ['1 update', '10,000 updates', '100 updates', '0 updates'],
      answer: '1 update',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg9-007-quiz-6',
      type: 'choice',
      text: 'Binning is formally called',
      options: ['State aggregation', 'Bootstrapping', 'Shaping', 'Replay'],
      answer: 'State aggregation',
      hints: ['Math.'],
      reviewSection: 'Math',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg9-007-1',
      label: 'Read resolution and aliasing',
      type: 'read',
    },
    {
      id: 'cp-mg9-007-2',
      label: 'Read the Markov property and cost',
      type: 'read',
    },
    {
      id: 'cp-mg9-007-3',
      label: 'Run the notebook: bins, drift, cost',
      type: 'read',
    },
    {
      id: 'cp-mg9-007-4',
      label: 'Complete "How many states?" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg9-007-5',
      label: "Add a number to the paddle's observe()",
      type: 'lab',
    },
    {
      id: 'cp-mg9-007-6',
      label: 'Work through the counting-the-cost example',
      type: 'example',
    },
    {
      id: 'cp-mg9-007-7',
      label: 'Work through the engineered-number example',
      type: 'example',
    },
    {
      id: 'cp-mg9-007-8',
      label: 'Pass the bins-to-state challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-9',
}
