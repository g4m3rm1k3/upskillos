export default {
  chapter: 'making-games-12',
  order: 6,
  id: 'mg12-006',
  nextLesson: null,
  slug: 'enemies-matched-to-the-player',
  title: 'Enemies Matched to the Player',
  subtitle: 'Rate the player like a chess player, rate each kind of enemy, and send enemies just above the player: dynamic difficulty from Elo ratings.',
  tags: ['game-studio', 'rpg', 'dynamic-difficulty', 'elo', 'ratings', 'game-balance', 'probability'],
  aliases: 'dynamic difficulty adjustment dda elo rating chess rating expected score matchmaking skill rating mmr enemy tiers adaptive difficulty rubber banding k factor',
  timeToComplete: 50,
  coreConcept: 'An Elo rating says how strong a player is: two ratings a and b give an expected score, 1 / (1 + 10^((b − a)/400)), the chance a beats b (400 points apart is 10 to 1). After each fight the rating moves by K × (result − expected): more after a surprise, less after the expected. Each kind of slime has a rating; each new slime is the kind closest to 50 above the player, so fights stay a little hard. A clean win counts 1, a costly win 0.75 or 0.5, being beaten 0. The rating settles near how strong the player really is, and the slimes follow it.',
  prerequisites: ['mg12-005'],
  hook: {
    question: 'A new player struggles with the slimes; an expert gets bored by them. Could the game notice how well you fight, and send the enemies you need, without a difficulty menu?',
    realWorldContext: 'Elo ratings rank chess players, and the same idea (MMR, TrueSkill, Glicko) matches players in online games. Dynamic difficulty adjustment uses it to change enemies and items to fit the player: Left 4 Dead\'s AI Director and Resident Evil 4\'s hidden difficulty are famous examples.',
  },
  intuition: {
    prose: [
      '**Depth: build it, and go deep.** The Try it task writes tiers.js and rates every fight.',
      '**A rating.** state.rating starts at 1000. Each kind of slime has one too: Green 850, Slime 1000, Red 1150, Dark 1300, with more hit points, speed, damage and experience as they rise (TIERS in tiers.js).',
      '**Expected score.** expected(a, b) = 1 / (1 + 10^((b − a) / 400)) is how likely a rating a is to beat b (cell 1): an equal match is 0.5, 200 points better 0.76, 400 better 0.91 (10 to 1).',
      '**Updating.** After a fight, rate(result, enemy) moves the rating by 32 × (result − expected). Beating an equal enemy adds 16; beating a much stronger one (400 above) adds 29; beating a much weaker one adds only 8. Losses work the same way downwards. Surprises move the rating most.',
      '**What a fight\'s result is.** A slime beaten without hurting the hero is a clean win, 1; with less than 3 damage taken, 0.75; with more, 0.5. When the hero is beaten, the slime that landed the last hit records it as a loss, 0: the slime sets state.lastHitBy before hurting, and the hero\'s die() calls rate(0, state.lastHitBy).',
      '**Matching.** Each new slime, in its ready(), takes tierFor(state.rating): the kind whose rating is closest to 50 above the hero\'s. Cell 3: at 1000 the hero meets ordinary slimes and expects to win half; at 1100, red slimes, expecting 0.43; at 700, green ones. The fights stay a little hard, whatever the player\'s skill.',
      '**It finds the player.** Cell 2 plays a player who is really about 1200 strong, starting at 1000. The rating climbs towards 1200 (1118 after 40 fights) and then wanders round it (1125, 1165, 1291, 1190 every 40 fights after), because each fight moves it by up to 32: K sets how fast it adapts and how much it wobbles. The enemies follow it.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: enemies matched to the player',
        body: 'Step 1. A rating for the player in state (1000), and one for each kind of enemy. Step 2. After each fight, a result from 0 to 1 and rate(result, enemy). Step 3. When an enemy is made, choose its kind from the rating. Step 4. Watch the rating (debug.watch) while you tune K and the tiers.',
      },
      {
        type: 'warning',
        title: 'Do not punish skill',
        body: 'If better play only brings harder enemies, skilled players gain nothing. Give harder enemies better rewards (here, more experience), so climbing is worth it.',
      },
      {
        type: 'insight',
        title: 'No menu needed',
        body: 'A rating replaces Easy, Normal and Hard: it measures what difficulty the player needs, and keeps measuring as they improve.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Ratings and matching',
        caption: 'Elo, as tiers.js does it.',
        props: {
          lesson: {
            title: 'Ratings and matching',
            subtitle: 'Expected scores, updates, and a rating finding a player.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. Expected score\nPredict first: 200 points better.',
                startCode: '// Elo\'s expected score: how likely a rating a is to beat a rating b. 400 points apart is 10 to 1.\n// Predict first: an equal match, and 200 points better.\nconst expected = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400))\nfor (const gap of [-400, -200, -100, 0, 100, 200, 400]) console.log(\'rated\', String(gap).padStart(4), \'above the enemy: expected score\', expected(1000 + gap, 1000).toFixed(3))',
              },
              {
                type: 'js',
                instruction: '### 2. A rating finds a player\nPredict first: where it settles.',
                startCode: '// A rating that finds the player. This player really is about 1200 strong: they beat an enemy rated b with chance\n// expected(1200, b). Starting at 1000, after each fight the rating moves by K (result − expected). Enemies are chosen\n// just above the rating. Predict first: where does the rating settle?\nfunction rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296 } }\nconst random = rng(3)\nconst expected = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400))\nconst TIERS = [850, 1000, 1150, 1300]\nconst tierFor = (r) => TIERS.reduce((best, t) => (Math.abs(t - (r + 50)) < Math.abs(best - (r + 50)) ? t : best))\nlet rating = 1000\nfor (let fight = 1; fight <= 200; fight++) {\n  const enemy = tierFor(rating)\n  const won = random() < expected(1200, enemy) ? 1 : 0\n  rating += 32 * (won - expected(rating, enemy))\n  if (fight % 40 === 0) console.log(\'after\', String(fight).padStart(3), \'fights: rating\', Math.round(rating), \' enemies now rated\', tierFor(rating))\n}',
              },
              {
                type: 'js',
                instruction: '### 3. Which slime for which rating\nPredict first: at 1100.',
                startCode: '// Which kind of slime for each rating: the one closest to 50 above it, so fights are a little harder than even.\nconst TIERS = [[\'Green slime\', 850], [\'Slime\', 1000], [\'Red slime\', 1150], [\'Dark slime\', 1300]]\nconst tierFor = (r) => TIERS.reduce((best, t) => (Math.abs(t[1] - (r + 50)) < Math.abs(best[1] - (r + 50)) ? t : best))\nconst expected = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400))\nfor (const r of [700, 900, 1000, 1100, 1200, 1400]) { const [name, rating] = tierFor(r); console.log(\'rating\', r, \'→\', name.padEnd(11), \' the hero\\\'s expected score\', expected(r, rating).toFixed(2)) }',
              },
              {
                type: 'challenge',
                instruction: '### 4. Challenge: rate()\nThe check tries five fights.',
                startCode: '// Challenge: rate(rating, result, enemy) is the hero\\u2019s new rating after a fight: rating + 32 × (result − expected),\n// where expected = 1 / (1 + 10^((enemy − rating) / 400)) and result is 1 (won), 0.5 or 0 (lost).\nfunction rate(rating, result, enemy) {\n  return rating   // your code\n}\nconst close = (a, b) => Math.abs(a - b) < 0.01\nconst cases = [[1000, 1, 1000, 1016], [1000, 0, 1000, 984], [1000, 0.5, 1000, 1000], [1200, 1, 1000, 1207.69], [1000, 1, 1400, 1029.09]]\nconst bad = cases.find(([r, s, e, want]) => !close(rate(r, s, e), want))\nconsole.log(bad ? \'rate(\' + bad.slice(0, 3).join(\', \') + \') should be about \' + bad[3] + \', not \' + rate(bad[0], bad[1], bad[2]).toFixed(2) + \'.\' : \'✓ A surprise moves the rating most: beating a much stronger enemy is worth 29, a much weaker one 8.\')',
                solutionCode: '// Challenge: rate(rating, result, enemy) is the hero\\u2019s new rating after a fight: rating + 32 × (result − expected),\n// where expected = 1 / (1 + 10^((enemy − rating) / 400)) and result is 1 (won), 0.5 or 0 (lost).\nfunction rate(rating, result, enemy) {\n  const expected = 1 / (1 + Math.pow(10, (enemy - rating) / 400))\n  return rating + 32 * (result - expected)\n}\nconst close = (a, b) => Math.abs(a - b) < 0.01\nconst cases = [[1000, 1, 1000, 1016], [1000, 0, 1000, 984], [1000, 0.5, 1000, 1000], [1200, 1, 1000, 1207.69], [1000, 1, 1400, 1029.09]]\nconst bad = cases.find(([r, s, e, want]) => !close(rate(r, s, e), want))\nconsole.log(bad ? \'rate(\' + bad.slice(0, 3).join(\', \') + \') should be about \' + bad[3] + \', not \' + rate(bad[0], bad[1], bad[2]).toFixed(2) + \'.\' : \'✓ A surprise moves the rating most: beating a much stronger enemy is worth 29, a much weaker one 8.\')',
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Enemies matched to the player',
        props: {
          task: 'qa-match',
          lesson: 'mg12-006',
          checkpoint: 'cp-mg12-006-4',
        },
      },
    ],
  },
  math: {
    prose: [
      '**Expected score, decoded.** $E = \\frac{1}{1 + 10^{(b-a)/400}}$, read "one over one plus ten to the power of how much stronger the enemy is, in units of 400 points". When $a = b$ the power is $10^0 = 1$ and $E = 1/2$. When the hero is 400 above, $10^{-1} = 0.1$ and $E = 1/1.1 \\approx 0.909$.',
      '**The update, decoded.** $a \\leftarrow a + K\\,(S - E)$, read "move the rating by K times how much better the result $S$ was than expected $E$". In tiers.js: state.rating, k = 32, result and expected(…).',
      '**Why it settles.** On average the rating stops moving when the results equal what is expected: $E[S] = E$. That happens when the rating says how strong the player really is: the rating is an estimate that corrects itself.',
    ],
    equations: [
      {
        label: 'Expected score',
        latex: 'E = \\frac{1}{1 + 10^{(b-a)/400}}',
      },
      {
        label: 'The rating after a fight',
        latex: 'a \\leftarrow a + K\\,(S - E)',
      },
      {
        label: 'Settled',
        latex: '\\mathbb{E}[S] = E',
      },
    ],
    callouts: [],
    visualizations: [],
  },
  rigor: {
    prose: [
      'K trades speed for steadiness: a big K finds a new player\'s level quickly but wobbles; a small one is steady but slow. Systems like Glicko keep an uncertainty with the rating and use a big K while it is uncertain, a small one once it is known.',
      'Where it goes: this ends the Quest Buddies starter. The plan continues with other kinds of game (driving, a metroidvania, play over a network), each with its own learning agents.',
    ],
    callouts: [],
    visualizations: [],
  },
  examples: [
    {
      id: 'mg12-006-ex1',
      title: 'An even fight',
      difficulty: 'easy',
      problem: 'Rated 1000, the hero beats an ordinary slime (1000). The new rating?',
      steps: [
        {
          expression: '1000 + 32\\,(1 - 0.5)',
          annotation: 'Expected 0.5.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: '1016.',
    },
    {
      id: 'mg12-006-ex2',
      title: 'A costly win',
      difficulty: 'medium',
      problem: 'Rated 1100, the hero beats a red slime (1150) but loses 3 hit points. The new rating?',
      steps: [
        {
          expression: 'E = 1/(1+10^{50/400}) \\approx 0.43',
          annotation: 'Slightly worse than even.',
          strategyTitle: 'Step 1',
        },
        {
          expression: '1100 + 32\\,(0.5 - 0.43)',
          annotation: 'Result 0.5: 3 damage taken.',
          strategyTitle: 'Step 2',
        },
      ],
      answer: 'About 1102: barely up, because the win was costly.',
    },
    {
      id: 'mg12-006-ex3',
      title: 'A beaten expert',
      difficulty: 'hard',
      problem: 'Rated 1300, the hero is beaten by a green slime (850). How far does the rating fall?',
      steps: [
        {
          expression: 'E = 1/(1+10^{-450/400}) \\approx 0.93',
          annotation: 'It was expected to win.',
          strategyTitle: 'Step 1',
        },
        {
          expression: '32\\,(0 - 0.93)',
          annotation: 'A big surprise.',
          strategyTitle: 'Step 2',
        },
      ],
      answer: 'About 30 points: the biggest move a single fight can make is 32.',
    },
  ],
  challenges: [
    {
      id: 'mg12-006-ch1',
      title: 'A faster finder',
      difficulty: 'easy',
      problem: 'Make the rating find a new player faster.',
      hint: 'K.',
      answer: 'k = 64: twice as fast, twice the wobble.',
      walkthrough: [],
    },
    {
      id: 'mg12-006-ch2',
      title: 'Loot that matches',
      difficulty: 'medium',
      problem: 'Make harder slimes drop better loot.',
      hint: 'The tier, in rollLoot.',
      answer: 'Pass the tier to rollLoot and add its index to weapon weights, or the affix chance: harder fights pay more.',
      walkthrough: [],
    },
    {
      id: 'mg12-006-ch3',
      title: 'Uncertainty',
      difficulty: 'hard',
      problem: 'Use a big K for a new player\'s first 20 fights, then a small one.',
      hint: 'Count fights in state.',
      answer: 'state.fights counts rated fights; k = state.fights < 20 ? 64 : 24: quick to find the player, steady after.',
      walkthrough: [],
    },
  ],
  semantics: {
    core: [
      {
        symbol: 'state.rating',
        meaning: 'How strong the player is, as a number (1000 to start).',
      },
      {
        symbol: 'expected(a, b)',
        meaning: 'How likely a beats b.',
      },
      {
        symbol: 'rate(result, b)',
        meaning: 'Move the rating by 32 × (result − expected).',
      },
      {
        symbol: 'tierFor(rating)',
        meaning: 'The kind of slime closest to 50 above.',
      },
      {
        symbol: 'K',
        meaning: 'How far one fight moves the rating.',
      },
    ],
    rulesOfThumb: [
      'Surprises move ratings most.',
      'Match a little above the player.',
      'Reward the harder fights.',
      'K: fast or steady, choose.',
    ],
  },
  misconceptions: [
    {
      falseBelief: 'Winning always raises the rating a lot.',
      whyStudentsThinkIt: 'A win is a win.',
      correctionExample: 'Beating a much weaker slime adds only 8.',
      contrastCase: 'Beating a much stronger one adds 29.',
    },
    {
      falseBelief: 'Dynamic difficulty is cheating the player.',
      whyStudentsThinkIt: 'The game changes behind their back.',
      correctionExample: 'It keeps fights close, which is what difficulty settings try to do; hiding it or punishing skill is the problem.',
      contrastCase: 'Rubber-banding a racing rival (instantly faster when you lead) feels like cheating.',
    },
  ],
  transferPrompts: [
    {
      situation: 'Matching players online.',
      competingTechniques: [
        'Random opponents',
        'Opponents with ratings near yours',
      ],
      whyThisTechniqueWins: 'Close matches are fun for both sides.',
    },
    {
      situation: 'A puzzle game\'s next level.',
      competingTechniques: [
        'Fixed order',
        'Rate the player and each puzzle, and pick the next near their rating',
      ],
      whyThisTechniqueWins: 'Each player gets puzzles at their level.',
    },
  ],
  debugging: [
    {
      commonError: 'The rating never moves.',
      symptom: 'Always 1000.',
      whyItHappened: 'rate() is never called, or state.rating is not saved.',
      repairStrategy: 'Call rate() when a slime is beaten and when the hero is.',
    },
    {
      commonError: 'Slimes do not change.',
      symptom: 'Always ordinary slimes.',
      whyItHappened: 'The kind is chosen once, in the scene file.',
      repairStrategy: 'Choose it in ready() from state.rating.',
    },
  ],
  mastery: {
    targetLevel: 3,
    solveIndependently: 'Rate the player and match enemies to the rating.',
    explainVerbally: 'Explain expected score, the update, K and why it settles.',
    detectIncorrectApplication: 'Spot unrated fights and fixed enemy kinds.',
    transferToUnfamiliar: 'Use ratings to match levels, puzzles or opponents.',
  },
  assessment: {
    questions: [
      {
        id: 'mg12-006-assess-1',
        type: 'choice',
        text: 'Rated 400 above an enemy, the expected score is about',
        options: ['0.91', '0.5', '0.76', '1'],
        answer: '0.91',
        hint: 'Cell 1.',
      },
    ],
  },
  quiz: [
    {
      id: 'mg12-006-quiz-1',
      type: 'choice',
      text: 'In cell 1, 200 points better gives an expected score of',
      options: ['0.760', '0.640', '0.909', '0.500'],
      answer: '0.760',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg12-006-quiz-2',
      type: 'choice',
      text: 'In cell 2, the rating settles around',
      options: [
        '1200, the player\'s real strength',
        '1000',
        '1300',
        'it never settles',
      ],
      answer: '1200, the player\'s real strength',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg12-006-quiz-3',
      type: 'choice',
      text: 'In cell 3, rated 1100, the hero meets',
      options: ['Red slimes', 'Slimes', 'Dark slimes', 'Green slimes'],
      answer: 'Red slimes',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg12-006-quiz-4',
      type: 'choice',
      text: 'Beating an equal enemy with K 32 adds',
      options: ['16', '32', '8', '29'],
      answer: '16',
      hints: ['Updating.'],
      reviewSection: 'Intuition — updating',
    },
    {
      id: 'mg12-006-quiz-5',
      type: 'choice',
      text: 'When the hero is beaten, which slime records the loss?',
      options: ['The one that hit it last', 'The first slime', 'All of them', 'None'],
      answer: 'The one that hit it last',
      hints: ['What a fight\'s result is.'],
      reviewSection: 'Intuition — results',
    },
  ],
  checkpoints: [
    {
      id: 'cp-mg12-006-1',
      label: 'Read ratings and expected scores',
      type: 'read',
    },
    {
      id: 'cp-mg12-006-2',
      label: 'Read updating, results and matching',
      type: 'read',
    },
    {
      id: 'cp-mg12-006-3',
      label: 'Run the notebook: ratings and matching',
      type: 'read',
    },
    {
      id: 'cp-mg12-006-4',
      label: 'Complete "Enemies matched to the player" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg12-006-5',
      label: 'Work through "A costly win"',
      type: 'example',
    },
    {
      id: 'cp-mg12-006-6',
      label: 'Pass the rate() challenge',
      type: 'challenge',
    },
  ],
}
