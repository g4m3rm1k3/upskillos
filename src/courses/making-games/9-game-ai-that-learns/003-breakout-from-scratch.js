export default {
  order: 3,

  id: 'mg9-003',

  slug: 'breakout-from-scratch',

  title: 'Breakout from Scratch',

  subtitle: 'The recipe for giving any game a learning agent, done by hand on Breakout, and then a new wall to see it learn again.',

  tags: [
    'game-studio',
    'machine-learning',
    'reinforcement-learning',
    'environment-design',
    'state-design',
    'reward-design',
    'agents',
  ],

  aliases: 'environment design state design observation reward design agent script observe act reward done brain breakout apply reinforcement learning to a game',

  timeToComplete: 75,

  coreConcept: "To give a game a learning agent you answer four questions in its script: what can it do (actions, and act()), what does it see (observe(): the few numbers that decide the right action, relative and scaled), what does it earn (reward(): what you actually want, with failure costly), and when is it over (done()). Then you choose the states (bins), train, check the result against random play, and ship the brain. The answers decide what it can ever learn: the same Breakout paddle learns nothing from the ball's and the paddle's positions, and clears the wall from their difference.",

  prerequisites: ['mg9-002'],

  nextLesson: 'mg9-004',

  hook: {
    question: "Every game you build could have an agent that learns to play it: an enemy, a teammate, a tester that finds your level's exploits. What do you actually have to write to make that happen, starting from a game that has none?",
    realWorldContext: "Game studios use learning agents for testing levels, tuning difficulty and building opponents; robotics and recommendation systems face the same design questions. Gymnasium environments, Unity ML-Agents and Game Studio's script agents all ask for the same four answers: actions, observations, rewards, and the end of an episode.",
  },

  intuition: {
    prose: [
      '**The recipe.** Open Breakout Lab (Project › Projects and examples…): Breakout with a plain, key-driven paddle, and a wall built from a text map. The Try it card takes you through it in Game Studio, one step at a time, each step checked by running your own script. This lesson explains every choice.',
      "**1. Actions: what can it do?** The same things a player can, at the rate a player decides. The paddle gets actions = ['left', 'stay', 'right'] and act(action), which sets this.move = action − 1 until the next decision (decideEvery = 4 frames: 15 decisions a second), and launches the ball when it is resting, the job the Space key did. In physicsUpdate the paddle steers with this.move while ai.training, and with the keys otherwise, so you can still play it.",
      "**2. Observations: what decides the move?** Ask what a good player looks at. Not the ball's position and the paddle's position, but how far the ball is from the paddle, and whether it is coming down. Cell 1 shows why on a small catch game: with ball and paddle each cut into 5 bins (25 states) the agent catches 10% of balls; with their difference in 6 bins (6 states) it catches every one. In Breakout itself the same mistake (ball x and paddle x, 4 bins each, 50 states) leaves the trained agent no better than random. Use relative numbers, scale them to about −1 to 1, and give only what decides the action.",
      '**3. Reward: what do you want?** +1 for a brick and −3 for a lost ball (cell 2 reads them from the score and lives each decision). Make failure cost something: in the bonus lesson, with no penalty for losing a ball, three training runs scored 43, 1 and 48. Then check that random play scores badly (−5 here); if random play already scores well, the reward is not rewarding what you want.',
      "**4. The end: done().** The balls are gone or the wall is cleared. A run that hits the step limit (maxSteps) is cut short, not ended, and learning treats it that way (lesson 9.1's warning).",
      '**5. States.** Q-learning needs a table, so the numbers are cut into bins: 7 across (the middle one "over the paddle", ±0.03 of 480 pixels) × falling or not = 14 states. Every number you add multiplies the count (cell 3), and each state is then visited less often. Start small.',
      "**6. Train, judge, ship.** Train (100 episodes, about 15 seconds): random play −5, the trained agent clears all 48 bricks. Save as brain, give the paddle brain = 'brains/paddle.json', and the game plays itself, also in an exported game. If it fails: Step through updates (9.1), check what observe() returns while the game runs, and try one change at a time with Compare (9.2).",
      '**A new wall.** Edit the map in scripts/wall.js (# a brick, . a gap) and train again. The agent sees the ball, not the bricks, so it learns the same skill, keeping the ball in play, on any wall: trained on the pyramid (20 bricks) it clears all 20; on two columns at the sides (16) it clears 16 on every seed. The wall changes how much that skill earns per step, and so how quickly learning pays off. To aim at bricks it would need to see them: an observation for "which side has more bricks left", which is the next design step to try.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: a learning agent for any game',
        body: "Step 1. Actions: the player's choices, held for decideEvery frames, set in act(action). Step 2. Observations: the few numbers that decide the action, relative and scaled, from observe(). Step 3. Reward: what you want, with failure costly; check random play scores badly. Step 4. done(): when the episode is over. Step 5. Bins: as few states as tell apart the situations that need different actions. Step 6. Train; compare against random; Step through updates if it fails. Step 7. Save as brain and set the script's brain field.",
      },
      {
        type: 'warning',
        title: 'Absolute positions hide the relationship',
        body: '"Ball at 300 and paddle at 500" and "ball at 600 and paddle at 800" need the same move, but are different states, each learned separately; worse, binning them coarsely mixes "ball left of paddle" with "ball right of paddle" in one state. The difference is one number that means the same thing everywhere.',
      },
      {
        type: 'warning',
        title: 'Training and play must see the same thing',
        body: 'The engine drives the agent through the same observe() and act() in training and in play. A script that reads input while ai.training is true, or acts differently when a brain is set, trains one agent and ships another.',
      },
      {
        type: 'insight',
        title: 'For your own games',
        body: "An enemy is the same recipe: its moves as actions, the player's position relative to it as observations, reward for what you want it to do (reach the player, survive, guard a spot), and a scripted player to train against (ai.training lets the player script play itself). Lessons 9.9 and 9.11 build exactly that.",
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: designing what an agent sees and earns',
        caption: 'Relative against absolute states on a catch game, rewards read from the score, and how states multiply.',
        props: {
          lesson: {
            title: 'Breakout from scratch',
            subtitle: 'The design choices, measured.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. What decides the move?\nPredict first: which design catches every ball.',
                startCode: '// A wide catch game: a ball falls 10 rows in one of 20 columns, starting anywhere; the paddle (one column wide)\n// starts in the middle and moves left, stays or moves right each row. +1 for a catch, −1 for a miss.\n// The question is what the agent should see. (Game Studio\'s random-number generator.)\nconst seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }\nconst COLS = 20, ROWS = 10\nconst bin = (v, cuts) => { let i = 0; while (i < cuts.length && v >= cuts[i]) i++; return i }\n// Q-learning with a given observe(game) → state number, then the greedy catch rate over every start column.\nfunction learn(observe, states, episodes = 3000, seed = 1) {\n  const rand = seeded(seed), Q = Array.from({ length: states }, () => [0, 0, 0])\n  const pick = (row) => { const best = Math.max(...row), ties = [0, 1, 2].filter((a) => row[a] === best); return ties[Math.floor(rand() * ties.length)] }\n  for (let ep = 0; ep < episodes; ep++) {\n    const g = { ball: Math.floor(rand() * COLS), paddle: COLS / 2, row: 0 }\n    let s = observe(g)\n    for (;;) {\n      const a = rand() < 0.1 ? Math.floor(rand() * 3) : pick(Q[s])\n      g.paddle = Math.min(COLS - 1, Math.max(0, g.paddle + a - 1)); g.row++\n      const done = g.row === ROWS, r = done ? (g.ball === g.paddle ? 1 : -1) : 0, next = observe(g)\n      Q[s][a] += 0.2 * (r + (done ? 0 : 0.97 * Math.max(...Q[next])) - Q[s][a])\n      if (done) break\n      s = next\n    }\n  }\n  let caught = 0\n  for (let b = 0; b < COLS; b++) {\n    const g = { ball: b, paddle: COLS / 2, row: 0 }\n    while (g.row < ROWS) { const q = Q[observe(g)], a = q.indexOf(Math.max(...q)); g.paddle = Math.min(COLS - 1, Math.max(0, g.paddle + a - 1)); g.row++ }\n    caught += g.ball === g.paddle ? 1 : 0\n  }\n  return caught / COLS\n}\n\n// Two designs, each 25 or so states. Predict first: which catches every ball?\n// A: where the ball is and where the paddle is, each cut into 5 bins of 4 columns (25 states).\nconst absolute = (g) => bin(g.ball, [4, 8, 12, 16]) * 5 + bin(g.paddle, [4, 8, 12, 16])\n// B: how far the ball is across from the paddle, cut at −3, −1, 0, 1, 3 (6 bins; "under it" is its own bin).\nconst relative = (g) => bin(g.ball - g.paddle, [-3, -1, 0, 1, 3])\nconsole.log(\'A, ball and paddle in 5 bins each (25 states): catches \' + learn(absolute, 25))\nconsole.log(\'B, ball minus paddle in 6 bins (6 states):     catches \' + learn(relative, 6))',
              },
              {
                type: 'js',
                instruction: '### 2. Reward from the score\nPredict first: the four rewards.',
                startCode: "// What it earns, read from the game: Breakout's ball keeps score (10 a brick) and lives. Each decision the agent's\n// reward() reports the change since the last one: +1 a brick, −3 a lost ball. Predict first: the rewards for these\n// four decisions.\nconst seen = [{ score: 0, lives: 3 }, { score: 20, lives: 3 }, { score: 20, lives: 2 }, { score: 30, lives: 2 }, { score: 30, lives: 2 }]\nfor (let k = 1; k < seen.length; k++) {\n  const r = (seen[k].score - seen[k - 1].score) / 10 - 3 * (seen[k - 1].lives - seen[k].lives)\n  console.log('decision ' + k + ': score ' + seen[k - 1].score + ' → ' + seen[k].score + ', lives ' + seen[k - 1].lives + ' → ' + seen[k].lives + ': reward ' + r)\n}",
              },
              {
                type: 'js',
                instruction: '### 3. How states multiply\nPredict first: the counts.',
                startCode: "// How many states a design makes: the product of each binned number's bin count (cuts + 1). Predict first:\n// Breakout's 7 across × 2 falling; then with the ball's sideways direction added (2 more); then with the ball's\n// height in 4 bins too.\nconst count = (cuts) => cuts.reduce((n, c) => n * (c.length + 1), 1)\nconst across = [-0.25, -0.1, -0.03, 0.03, 0.1, 0.25], falling = [0.5], sideways = [0], height = [0.25, 0.5, 0.75]\nconsole.log('across × falling: ' + count([across, falling]) + ' states, ' + count([across, falling]) * 3 + ' Q values')\nconsole.log('+ sideways: ' + count([across, falling, sideways]) + ' states')\nconsole.log('+ height: ' + count([across, falling, sideways, height]) + ' states: each visited about ' + (count([across, falling]) / count([across, falling, sideways, height])).toFixed(3) + ' as often')",
              },
              {
                type: 'challenge',
                instruction: "### 4. Challenge: the paddle's observe()\nThe cases below check it.",
                startCode: "// Write observe() for Breakout's paddle, given the game's state as plain numbers: return\n// [(ball x − paddle x) / 480, 1 if the ball is falling (velocity y > 0) else 0].\nfunction observe(game) {\n  return [0, 0]\n}\n\n// ── The check (leave this part as it is) ──\nconst cases = [\n  { game: { ball: { x: 480, y: 300, vx: 0, vy: 0 }, paddle: { x: 480 } }, want: [0, 0], why: 'resting on the paddle: no difference, not falling' },\n  { game: { ball: { x: 720, y: 300, vx: 200, vy: 300 }, paddle: { x: 480 } }, want: [0.5, 1], why: '(720 − 480) / 480 = 0.5, and velocity y > 0 is falling' },\n  { game: { ball: { x: 100, y: 300, vx: -200, vy: -300 }, paddle: { x: 340 } }, want: [-0.5, 0], why: 'the ball is left of the paddle: (100 − 340) / 480 = −0.5; going up is not falling' },\n  { game: { ball: { x: 500, y: 300, vx: 0, vy: 1 }, paddle: { x: 500 } }, want: [0, 1], why: 'any downward speed is falling' },\n]\nlet passed = 0\nfor (const [i, c] of cases.entries()) {\n  const got = observe(c.game)\n  const ok = Array.isArray(got) && got.length === 2 && got.every((x, k) => Math.abs(x - c.want[k]) < 1e-9)\n  passed += ok\n  console.log((ok ? '✓' : '✗') + ' case ' + (i + 1) + ': got ' + JSON.stringify(got) + (ok ? '' : ', want ' + JSON.stringify(c.want) + ': ' + c.why))\n}\nconsole.log(passed === cases.length ? '✓ All 4 cases pass: that is what the paddle should see.' : passed + ' of 4 cases pass.')",
                solutionCode: "// Write observe() for Breakout's paddle, given the game's state as plain numbers: return\n// [(ball x − paddle x) / 480, 1 if the ball is falling (velocity y > 0) else 0].\nfunction observe(game) {\n  return [(game.ball.x - game.paddle.x) / 480, game.ball.vy > 0 ? 1 : 0]\n}\n\n// ── The check (leave this part as it is) ──\nconst cases = [\n  { game: { ball: { x: 480, y: 300, vx: 0, vy: 0 }, paddle: { x: 480 } }, want: [0, 0], why: 'resting on the paddle: no difference, not falling' },\n  { game: { ball: { x: 720, y: 300, vx: 200, vy: 300 }, paddle: { x: 480 } }, want: [0.5, 1], why: '(720 − 480) / 480 = 0.5, and velocity y > 0 is falling' },\n  { game: { ball: { x: 100, y: 300, vx: -200, vy: -300 }, paddle: { x: 340 } }, want: [-0.5, 0], why: 'the ball is left of the paddle: (100 − 340) / 480 = −0.5; going up is not falling' },\n  { game: { ball: { x: 500, y: 300, vx: 0, vy: 1 }, paddle: { x: 500 } }, want: [0, 1], why: 'any downward speed is falling' },\n]\nlet passed = 0\nfor (const [i, c] of cases.entries()) {\n  const got = observe(c.game)\n  const ok = Array.isArray(got) && got.length === 2 && got.every((x, k) => Math.abs(x - c.want[k]) < 1e-9)\n  passed += ok\n  console.log((ok ? '✓' : '✗') + ' case ' + (i + 1) + ': got ' + JSON.stringify(got) + (ok ? '' : ', want ' + JSON.stringify(c.want) + ': ' + c.why))\n}\nconsole.log(passed === cases.length ? '✓ All 4 cases pass: that is what the paddle should see.' : passed + ' of 4 cases pass.')",
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Breakout learns, from scratch',
        props: {
          task: 'breakout-scratch',
          lesson: 'mg9-003',
          checkpoint: 'cp-mg9-003-4',
        },
      },
    ],
  },

  math: {
    prose: [
      "**Under the hood (optional).** An environment is a Markov decision process only if the observation carries everything that matters for what happens next. Breakout's 14 states do not (they leave out the ball's sideways direction and the bricks), so it is partially observable: the table learns the best action *on average* over the situations each state lumps together.",
      'Binning is a feature map $\\phi(s)$ that is one-hot over bins. The Markov condition fails exactly where two situations that need different actions share a bin; that is what the absolute design does when ball and paddle fall on either side of each other inside one coarse bin.',
      "Reward shaping: adding $F(s, s') = \\gamma\\Phi(s') - \\Phi(s)$ to every reward, for any function $\\Phi$ of the state, never changes which policy is optimal (Ng, Harada & Russell, 1999); other added rewards can. That is the safe way to give hints, such as rewarding the paddle for being under a falling ball.",
    ],
    equations: [
      {
        label: 'Relative observation',
        latex: 'o_1 = \\frac{x_{\\text{ball}} - x_{\\text{paddle}}}{480}',
      },
      {
        label: 'Reward per decision',
        latex: 'r = \\frac{\\Delta\\,\\text{score}}{10} - 3\\,\\Delta\\,\\text{lives lost}',
      },
      {
        label: 'State count',
        latex: '|\\mathcal{S}| = \\prod_i (k_i + 1)',
      },
      {
        label: 'Potential-based shaping',
        latex: "r' = r + \\gamma\\,\\Phi(s') - \\Phi(s)",
      },
    ],
    callouts: [],
    visualizations: [],
  },

  rigor: {
    prose: [
      'Formal statement: a state abstraction that maps together only states with the same optimal action values ($Q^*$-irrelevance) keeps the optimal policy; coarser abstractions may not (Li, Walsh & Littman, 2006).',
      'Invariant: translating the whole game sideways does not change the relative observation, so a policy learned on it is translation-invariant; the absolute observation is not.',
      'Geometric picture: the relative design folds the 2D space of (ball, paddle) positions onto one line, the diagonal direction that matters; bins on that line separate "left of" from "right of" exactly.',
      'Where it goes: 9.4 compares SARSA and Q-learning; 9.8 replaces bins with features when a table is too coarse.',
    ],
    callouts: [],
    visualizations: [],
  },

  examples: [
    {
      id: 'mg9-003-ex1',
      title: 'A reward from score and lives',
      difficulty: 'easy',
      problem: 'Between two decisions the score goes from 40 to 60 and the lives from 2 to 1. The reward?',
      steps: [
        {
          expression: '20/10 - 3 \\times 1 = -1',
          annotation: 'Two bricks, one lost ball.',
          strategyTitle: 'Step 1: add',
        },
      ],
      answer: '−1.',
    },
    {
      id: 'mg9-003-ex2',
      title: 'An observation',
      difficulty: 'medium',
      problem: 'The ball is at x 300, falling; the paddle at x 420. What does observe() return, and which bin across is it in?',
      steps: [
        {
          expression: '(300 - 420)/480 = -0.25',
          annotation: 'The difference, scaled.',
          strategyTitle: 'Step 1: across',
        },
        {
          expression: '-0.25 \\in [-0.25, -0.1)',
          annotation: 'Cuts −0.25, −0.1, …, so bin 1 (the second).',
          strategyTitle: 'Step 2: bin',
        },
      ],
      answer: '[−0.25, 1], in bin 1 across and bin 1 falling: state 1 × 2 + 1 = 3.',
    },
    {
      id: 'mg9-003-ex3',
      title: 'Designing an enemy',
      difficulty: 'hard',
      problem: 'A turret that should learn to lead its shots at a moving player. What should it see?',
      steps: [
        {
          expression: '\\Delta x,\\ \\Delta y,\\ v_x,\\ v_y',
          annotation: "The player's position relative to the turret, and the player's velocity.",
          strategyTitle: 'Step 1: what decides it',
        },
      ],
      answer: "The relative position and the player's velocity (to lead), scaled; reward for hits, a small cost per shot.",
    },
  ],

  challenges: [
    {
      id: 'mg9-003-ch1',
      title: 'Why random play first',
      difficulty: 'easy',
      problem: 'Why measure random play before training?',
      hint: 'What if random play already scores well?',
      answer: 'If random play scores as well as anything, the reward does not reward the behaviour you want, and training cannot help.',
      walkthrough: [],
    },
    {
      id: 'mg9-003-ch2',
      title: 'Aiming',
      difficulty: 'medium',
      problem: 'The agent cannot aim at the last few bricks. What would it need to see, and what does that cost?',
      hint: 'It sees only the ball.',
      answer: 'Something about the bricks, such as which side has more left, as another binned number; it doubles (or more) the states, so it needs more training.',
      walkthrough: [],
    },
    {
      id: 'mg9-003-ch3',
      title: 'Your own game',
      difficulty: 'hard',
      problem: 'Choose a game you have built or played and write its actions, observations, reward and done() for a learning agent.',
      hint: 'Follow the procedure; relative numbers; failure costly.',
      answer: 'Answers vary; check each against the procedure and against random play.',
      walkthrough: [],
    },
  ],

  semantics: {
    core: [
      {
        symbol: 'act(action)',
        meaning: 'Do the action until the next decision.',
      },
      {
        symbol: 'observe()',
        meaning: 'The numbers the agent sees: relative, scaled, deciding.',
      },
      {
        symbol: 'reward()',
        meaning: 'What it earned since the last decision.',
      },
      {
        symbol: 'done()',
        meaning: 'The episode is over.',
      },
      {
        symbol: 'brain',
        meaning: 'The saved table the game uses to drive the agent.',
      },
      {
        symbol: 'ai.training',
        meaning: 'True while it trains: steer with act(), not the keys.',
      },
    ],
    rulesOfThumb: [
      'Give the numbers that decide the action, relative and scaled.',
      'Make failure cost something, and check random play.',
      'Start with few states.',
      'Training and play must call the same methods.',
    ],
  },

  misconceptions: [
    {
      falseBelief: 'More information always helps the agent.',
      whyStudentsThinkIt: 'It can ignore what it does not need.',
      correctionExample: 'Every binned number multiplies the states; each is then learned more slowly (cell 3).',
      contrastCase: 'Missing the deciding number hurts far more (cell 1).',
    },
    {
      falseBelief: 'The agent learns about the bricks.',
      whyStudentsThinkIt: 'It clears the wall.',
      correctionExample: 'It sees only the ball; it clears walls by keeping the ball in play.',
      contrastCase: 'Add a brick observation and it could learn to aim.',
    },
  ],

  transferPrompts: [
    {
      situation: 'An NPC guard that should chase the player.',
      competingTechniques: [
        "The guard's and player's absolute positions",
        "The player's position relative to the guard",
      ],
      whyThisTechniqueWins: 'The relative position means the same thing everywhere on the map.',
    },
    {
      situation: "A racing game's AI driver.",
      competingTechniques: [
        "The car's x and y on the track",
        "The distance and angle to the track's centre line ahead",
      ],
      whyThisTechniqueWins: 'The track-relative numbers decide the steering.',
    },
  ],

  debugging: [
    {
      commonError: 'observe() returns absolute positions.',
      symptom: 'Training barely beats random play.',
      whyItHappened: 'The deciding relationship is split across states.',
      repairStrategy: 'Return differences, scaled.',
    },
    {
      commonError: 'The script reads the keys while training.',
      symptom: 'Training changes nothing; the paddle sits still.',
      whyItHappened: 'No keys are pressed in training.',
      repairStrategy: 'Steer with this.move when ai.training.',
    },
    {
      commonError: 'reward() returns the total score instead of the change.',
      symptom: 'Rewards grow every step; values explode.',
      whyItHappened: 'The reward must be what was earned since the last decision.',
      repairStrategy: 'Keep the last score and lives; return the difference.',
    },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Give a game a learning agent from scratch and train it.',
    explainVerbally: 'Explain each design choice and how it was checked.',
    detectIncorrectApplication: 'Spot absolute observations, reward totals and input read while training.',
    transferToUnfamiliar: 'Design an agent for a game of your own.',
  },

  assessment: {
    questions: [
      {
        id: 'mg9-003-assess-1',
        type: 'choice',
        text: "The paddle's best first observation is",
        options: [
          "The ball's x minus the paddle's x",
          "The ball's x",
          "The paddle's x",
          'The score',
        ],
        answer: "The ball's x minus the paddle's x",
        hint: 'What decides left or right?',
      },
    ],
  },

  quiz: [
    {
      id: 'mg9-003-quiz-1',
      type: 'choice',
      text: 'In cell 1, the design that catches every ball uses',
      options: [
        "The ball's column minus the paddle's",
        'Both columns, binned',
        'The row only',
        'Nothing: random',
      ],
      answer: "The ball's column minus the paddle's",
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg9-003-quiz-2',
      type: 'choice',
      text: 'reward() should return',
      options: [
        'What was earned since the last decision',
        'The total score',
        'The lives left',
        '1 every step',
      ],
      answer: 'What was earned since the last decision',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg9-003-quiz-3',
      type: 'choice',
      text: 'While training, the paddle should steer with',
      options: ['this.move, set by act()', 'The keys', 'The mouse', 'Random numbers'],
      answer: 'this.move, set by act()',
      hints: ['Actions paragraph.'],
      reviewSection: 'Intuition — actions',
    },
    {
      id: 'mg9-003-quiz-4',
      type: 'choice',
      text: "Adding the ball's height in 4 bins to 28 states makes",
      options: ['112 states', '32 states', '28 states', '56 states'],
      answer: '112 states',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg9-003-quiz-5',
      type: 'choice',
      text: 'On a new wall the agent learns',
      options: [
        'The same skill, keeping the ball in play',
        'Where the bricks are',
        'Nothing new',
        'To aim',
      ],
      answer: 'The same skill, keeping the ball in play',
      hints: ['A new wall paragraph.'],
      reviewSection: 'Intuition — a new wall',
    },
    {
      id: 'mg9-003-quiz-6',
      type: 'choice',
      text: 'Before trusting a reward, check that',
      options: [
        'Random play scores badly',
        'Training is fast',
        'The states are many',
        'γ is 1',
      ],
      answer: 'Random play scores badly',
      hints: ['Reward paragraph.'],
      reviewSection: 'Intuition — reward',
    },
  ],

  checkpoints: [
    {
      id: 'cp-mg9-003-1',
      label: 'Read the recipe: actions, observations, reward, done',
      type: 'read',
    },
    {
      id: 'cp-mg9-003-2',
      label: 'Read states, training and shipping',
      type: 'read',
    },
    {
      id: 'cp-mg9-003-3',
      label: 'Run the notebook: relative against absolute',
      type: 'read',
    },
    {
      id: 'cp-mg9-003-4',
      label: 'Complete "Breakout learns, from scratch" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg9-003-5',
      label: 'Train on a wall of your own design',
      type: 'lab',
    },
    {
      id: 'cp-mg9-003-6',
      label: 'Work through the observation example',
      type: 'example',
    },
    {
      id: 'cp-mg9-003-7',
      label: 'Work through the enemy design example',
      type: 'example',
    },
    {
      id: 'cp-mg9-003-8',
      label: 'Pass the observe() challenge',
      type: 'challenge',
    },
  ],

  chapter: 'making-games-9',
}
