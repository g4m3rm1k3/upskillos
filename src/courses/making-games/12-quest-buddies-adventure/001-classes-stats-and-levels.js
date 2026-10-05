export default {
  chapter: 'making-games-12',
  order: 1,
  id: 'mg12-001',
  nextLesson: 'mg12-002',
  slug: 'classes-stats-and-levels',
  title: 'Classes, Stats and Levels',
  subtitle: 'Make classes a table of data, build a new game from the class chosen, and level up on a curve that grows.',
  tags: ['game-studio', 'rpg', 'classes', 'stats', 'levelling', 'data-driven-design', 'game-balance'],
  aliases: 'rpg classes warrior mage ranger stats hit points attack speed level up experience xp curve skill points data driven design balance table progression',
  timeToComplete: 50,
  coreConcept: 'A class is a row of numbers: hit points, attack, speed, and how much each grows per level. Keeping them in one table (classes.js) means a new class is a new row, the menu can be built from the table, and comparing classes is arithmetic. newGame(className) copies the row into state. Experience to the next level grows by half each level, xpToNext(level) = round(10 × 1.5^(level − 1)), so early levels come quickly and later ones take longer; each level raises hit points and attack by the class\'s amounts and gives a skill point.',
  prerequisites: ['mg11-008'],
  hook: {
    question: 'Warrior, Ranger, Mage: three ways to play the same game. Do they need three different heroes, three scripts, three sets of rules? Or is the difference just a few numbers?',
    realWorldContext: 'RPGs from Diablo to Final Fantasy keep classes, enemies and items as data in tables (spreadsheets, JSON), and designers balance the game by changing numbers, not code. Experience curves that grow geometrically are nearly universal: they keep early levels quick and later ones meaningful.',
  },
  intuition: {
    prose: [
      '**Depth: build it, and go deep.** This lesson opens Quest Buddies: Adventure, chapter 11\'s game with the systems of this chapter added. Its Try it task starts from the finished chapter 11 game.',
      '**A class is a row of data.** classes.js exports CLASSES: Warrior { hp 14, attack 3, speed 60, hpPerLevel 3, attackPerLevel 1 }, Ranger, Mage, each with a picture and a line about it. Everything that differs between classes is in the table. So comparing them is arithmetic (cell 1): a Mage beats a slime (4 hit points) in one hit but survives only 7 touches; a Warrior needs two hits and survives 13.',
      '**One table, many uses.** newGame(className) copies a row into state: hp and maxHp, attack, speed, level 1, xp 0, skill points 0. The hero moves at state.speed and shows the class\'s picture. The title screen\'s class menu is built from the table too: title.js makes a Button for each row. Add a fourth row and it is playable and on the menu, with no other change. That is data-driven design.',
      '**Experience on a curve.** Beating a slime gives 4 experience. The next level needs xpToNext(level) = round(10 × 1.5^(level − 1)): 10, 15, 23, 34, 51 and on, each half as much again as the last (cell 2). Level 2 takes 3 slimes; level 5, 21 slimes in all; level 9, 124. Early levels come quickly, so a new player feels progress; later ones take longer, so each still means something.',
      '**Levelling up.** gainXp(amount) adds to state.xp, and while it is at least what the next level needs: take that off, add a level, add the class\'s hpPerLevel to maxHp, heal fully, add attackPerLevel to attack, and add a skill point. While, not if: a big reward can raise several levels at once. Cell 3 shows the classes diverge: by level 10 a Mage hits for 22 with 17 hit points, a Warrior for 12 with 41.',
      '**Showing it.** The HUD\'s Status panel gets a Label Level and a thin ProgressBar Xp, set from state every frame (lesson 11.6): its maxValue is xpToNext(state.level), its value state.xp. Skill points are saved with everything else; lesson 12.4 spends them on the buddy.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: a stat-driven class system',
        body: 'Step 1. A table: one row per class, every stat a number. Step 2. newGame(className) copies the row into state. Step 3. Everything that uses a stat reads it from state (speed, attack, maxHp). Step 4. An experience curve, xpToNext(level), and gainXp that loops while there is enough. Step 5. Build menus from the table.',
      },
      {
        type: 'warning',
        title: 'while, not if',
        body: 'With if, a reward big enough for two levels raises only one, and leaves the experience bar over full.',
      },
      {
        type: 'insight',
        title: 'Balance is arithmetic',
        body: 'Hits to beat an enemy, touches survived, seconds to cross a map: all follow from the table. Work them out (cell 1) before playing, and you know what each change will do.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Classes, curves and levels',
        caption: 'Plain arithmetic on the game\'s own numbers.',
        props: {
          lesson: {
            title: 'Classes, curves and levels',
            subtitle: 'The table, the curve, and the classes as they grow.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. Classes as data\nPredict first: who beats a slime in one hit?',
                startCode: '// Classes are rows of data. Everything that differs between them is a number in the table, so comparing them is\n// arithmetic. Predict first: which class beats a slime (4 hit points) in one hit?\nconst CLASSES = {\n  Warrior: { hp: 14, attack: 3, speed: 60, hpPerLevel: 3, attackPerLevel: 1 },\n  Ranger:  { hp: 10, attack: 2, speed: 78, hpPerLevel: 2, attackPerLevel: 1 },\n  Mage:    { hp: 8,  attack: 4, speed: 66, hpPerLevel: 1, attackPerLevel: 2 },\n}\nfor (const [name, c] of Object.entries(CLASSES)) {\n  const hits = Math.ceil(4 / c.attack)                 // hits to beat a slime\n  const crossing = (320 / c.speed).toFixed(1)          // seconds to cross a map 320 pixels wide\n  console.log(name.padEnd(8), \'hp\', String(c.hp).padStart(2), \' hits to beat a slime\', hits, \' slime touches it survives\', c.hp - 1, \' crosses a map in\', crossing, \'s\')\n}',
              },
              {
                type: 'js',
                instruction: '### 2. The experience curve\nPredict first: slimes to reach level 5.',
                startCode: '// Experience to the next level: 10, then half as much again each level. Rounded, the needs grow, and so does the\n// total. Predict first: how many slimes (4 xp each) to reach level 5?\nconst xpToNext = (level) => Math.round(10 * Math.pow(1.5, level - 1))\nlet total = 0\nfor (let level = 1; level <= 8; level++) {\n  console.log(\'level\', level, \'→\', level + 1, \': needs\', String(xpToNext(level)).padStart(3), \' total so far\', String(total + xpToNext(level)).padStart(4), \' slimes\', Math.ceil((total + xpToNext(level)) / 4))\n  total += xpToNext(level)\n}\n// Adding 10 each level instead (10, 20, 30, …) needs more early on (20 against 15 for level 3) but far less later.\nconst linear = (level) => 10 * level\nconsole.log(\'to reach level 9: growing by half each time\', total, \', adding 10 each time\', [1, 2, 3, 4, 5, 6, 7, 8].reduce((t, l) => t + linear(l), 0))',
              },
              {
                type: 'js',
                instruction: '### 3. The classes as they level\nPredict first: the strongest hitter at level 5.',
                startCode: '// Stats at each level: hit points and attack grow by the class\'s per-level amounts. Predict first: at level 5, who\n// hits hardest, and who has the most hit points?\nconst CLASSES = {\n  Warrior: { hp: 14, attack: 3, hpPerLevel: 3, attackPerLevel: 1 },\n  Ranger:  { hp: 10, attack: 2, hpPerLevel: 2, attackPerLevel: 1 },\n  Mage:    { hp: 8,  attack: 4, hpPerLevel: 1, attackPerLevel: 2 },\n}\nfor (const level of [1, 5, 10]) {\n  const row = Object.entries(CLASSES).map(([n, c]) => n + \' \' + (c.hp + (level - 1) * c.hpPerLevel) + \' hp, attack \' + (c.attack + (level - 1) * c.attackPerLevel))\n  console.log(\'level\', String(level).padStart(2) + \':\', row.join(\'   \'))\n}',
              },
              {
                type: 'challenge',
                instruction: '### 4. Challenge: totalXp()\nThe check tries five levels.',
                startCode: '// Challenge: totalXp(level) is all the experience needed to reach a level from level 1: the sum of xpToNext for every\n// level before it. totalXp(1) is 0.\nconst xpToNext = (level) => Math.round(10 * Math.pow(1.5, level - 1))\nfunction totalXp(level) {\n  return 0   // your code\n}\nconst cases = [[1, 0], [2, 10], [3, 25], [5, 82], [9, 494]]\nconst bad = cases.find(([l, want]) => totalXp(l) !== want)\nconsole.log(bad ? \'totalXp(\' + bad[0] + \') should be \' + bad[1] + \', not \' + totalXp(bad[0]) + \'.\' : \'✓ The totals match: 494 experience, about 124 slimes, to reach level 9.\')',
                solutionCode: '// Challenge: totalXp(level) is all the experience needed to reach a level from level 1: the sum of xpToNext for every\n// level before it. totalXp(1) is 0.\nconst xpToNext = (level) => Math.round(10 * Math.pow(1.5, level - 1))\nfunction totalXp(level) {\n  let total = 0\n  for (let l = 1; l < level; l++) total += xpToNext(l)\n  return total\n}\nconst cases = [[1, 0], [2, 10], [3, 25], [5, 82], [9, 494]]\nconst bad = cases.find(([l, want]) => totalXp(l) !== want)\nconsole.log(bad ? \'totalXp(\' + bad[0] + \') should be \' + bad[1] + \', not \' + totalXp(bad[0]) + \'.\' : \'✓ The totals match: 494 experience, about 124 slimes, to reach level 9.\')',
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Classes, stats and levels',
        props: {
          task: 'qa-classes',
          lesson: 'mg12-001',
          checkpoint: 'cp-mg12-001-4',
        },
      },
    ],
  },
  math: {
    prose: [
      '**The curve, decoded.** $x(L) = \\operatorname{round}(10 \\cdot 1.5^{L-1})$, read "10, multiplied by 1.5 once for each level after the first, rounded". In code: xpToNext(level), with level for $L$.',
      '**The total is a geometric series.** Reaching level $L$ needs $\\sum_{k=1}^{L-1} 10 \\cdot 1.5^{k-1}$, read "add up what each level before it needs". Without the rounding this is $10 \\cdot \\frac{1.5^{L-1} - 1}{1.5 - 1} = 20(1.5^{L-1} - 1)$: about $20 \\cdot 1.5^{8} - 20 \\approx 493$ for level 9, and cell 2 counts 494 with the rounding.',
      '**Stats grow in straight lines.** $\\text{hp}(L) = \\text{hp}_1 + (L - 1)\\,\\Delta\\text{hp}$, read "the class\'s starting hit points plus its per-level amount for each level gained". A Warrior at level 10: $14 + 9 \\cdot 3 = 41$.',
    ],
    equations: [
      {
        label: 'Experience to the next level',
        latex: 'x(L) = \\operatorname{round}(10\\cdot 1.5^{L-1})',
      },
      {
        label: 'Experience to reach level L',
        latex: '\\sum_{k=1}^{L-1} 10\\cdot 1.5^{k-1} \\approx 20\\,(1.5^{L-1} - 1)',
      },
      {
        label: 'A stat at level L',
        latex: '\\text{hp}(L) = \\text{hp}_1 + (L-1)\\,\\Delta\\text{hp}',
      },
    ],
    callouts: [],
    visualizations: [],
  },
  rigor: {
    prose: [
      'Stats that grow in straight lines against needs that grow geometrically is a common shape: each level costs more, and gives the same. Many games balance it by making enemies grow too (lesson 12.6 matches them to the player).',
      'Where it goes: 12.2 adds items with bonuses on top of the stats; 12.3 uses attack and hit points in combat.',
    ],
    callouts: [],
    visualizations: [],
  },
  examples: [
    {
      id: 'mg12-001-ex1',
      title: 'A fourth class',
      difficulty: 'easy',
      problem: 'Add a Rogue: fast and fragile. What changes?',
      steps: [
        {
          expression: '\\text{one row in CLASSES}',
          annotation: 'For example hp 9, attack 3, speed 90.',
          strategyTitle: 'Step 1: data',
        },
      ],
      answer: 'One row. The menu, newGame and the hero all read the table, so nothing else changes.',
    },
    {
      id: 'mg12-001-ex2',
      title: 'Two levels at once',
      difficulty: 'medium',
      problem: 'At level 1 with 0 experience, a quest gives 30. What level does the hero reach, with how much left?',
      steps: [
        {
          expression: '30 - 10 = 20',
          annotation: 'Level 2.',
          strategyTitle: 'Step 1',
        },
        {
          expression: '20 - 15 = 5',
          annotation: 'Level 3; 23 more is needed for 4.',
          strategyTitle: 'Step 2',
        },
      ],
      answer: 'Level 3, with 5 experience.',
    },
    {
      id: 'mg12-001-ex3',
      title: 'A Mage at level 10',
      difficulty: 'hard',
      problem: 'How many hits does a level 10 Mage need for an enemy with 50 hit points?',
      steps: [
        {
          expression: '4 + 9\\cdot 2 = 22',
          annotation: 'Its attack.',
          strategyTitle: 'Step 1',
        },
        {
          expression: '\\lceil 50 / 22 \\rceil = 3',
          annotation: 'Round up.',
          strategyTitle: 'Step 2',
        },
      ],
      answer: '3 hits.',
    },
  ],
  challenges: [
    {
      id: 'mg12-001-ch1',
      title: 'A gentler curve',
      difficulty: 'easy',
      problem: 'Make each level need a quarter more than the last.',
      hint: 'The 1.5.',
      answer: 'Math.round(10 * Math.pow(1.25, level - 1)).',
      walkthrough: [],
    },
    {
      id: 'mg12-001-ch2',
      title: 'A level cap',
      difficulty: 'medium',
      problem: 'Stop levelling at 20.',
      hint: 'The while condition.',
      answer: 'while (state.level < 20 && state.xp >= xpToNext(state.level)) … and keep xp from growing past the bar at the cap.',
      walkthrough: [],
    },
    {
      id: 'mg12-001-ch3',
      title: 'Balance the classes',
      difficulty: 'hard',
      problem: 'Make each class need the same number of seconds to beat 10 slimes, roughly, by changing only their rows.',
      hint: 'Damage per second and the walk between slimes.',
      answer: 'Time is about 10 × (hits per slime × cooldown + distance / speed); set attack and speed so the three come out close, checking with a cell like cell 1.',
      walkthrough: [],
    },
  ],
  semantics: {
    core: [
      {
        symbol: 'CLASSES',
        meaning: 'The table: one row of stats per class.',
      },
      {
        symbol: 'newGame(className)',
        meaning: 'Copies a class\'s row into state.',
      },
      {
        symbol: 'xpToNext(level)',
        meaning: 'Experience the next level needs: round(10 × 1.5^(level − 1)).',
      },
      {
        symbol: 'gainXp(amount)',
        meaning: 'Adds experience and levels up while there is enough.',
      },
      {
        symbol: 'skill point',
        meaning: 'Earned each level; spent in lesson 12.4.',
      },
    ],
    rulesOfThumb: [
      'Differences between classes belong in data, not code.',
      'Build menus from the table.',
      'Level up with while.',
      'Work out balance before you play it.',
    ],
  },
  misconceptions: [
    {
      falseBelief: 'Each class needs its own hero script.',
      whyStudentsThinkIt: 'They play differently.',
      correctionExample: 'They differ only in numbers, which the one hero reads from state.',
      contrastCase: 'A class with a new ability (a spell) does need code, behind a flag in its row.',
    },
    {
      falseBelief: 'A curve that grows by half each level makes levelling impossible.',
      whyStudentsThinkIt: 'It grows fast.',
      correctionExample: 'Cell 2: level 9 in 124 slimes; and stronger heroes beat stronger enemies for more experience.',
      contrastCase: 'Without stronger enemies or bigger rewards it does slow to a crawl.',
    },
  ],
  transferPrompts: [
    {
      situation: 'Twenty enemy types.',
      competingTechniques: [
        'A script each',
        'One enemy script and a table of their stats',
      ],
      whyThisTechniqueWins: 'Balance them by editing numbers.',
    },
    {
      situation: 'Directing an AI agent to add a class.',
      competingTechniques: [
        '"Add a Rogue class"',
        '"Add a Rogue row to CLASSES in classes.js with these numbers"',
      ],
      whyThisTechniqueWins: 'It names where the data lives and that nothing else should change.',
    },
  ],
  debugging: [
    {
      commonError: 'A stat read from the class row instead of state.',
      symptom: 'Levelling up does not make the hero stronger.',
      whyItHappened: 'The row holds level 1; state holds now.',
      repairStrategy: 'Read stats from state.',
    },
    {
      commonError: 'if instead of while in gainXp.',
      symptom: 'The experience bar shows more than full.',
      whyItHappened: 'Only one level was taken.',
      repairStrategy: 'while (state.xp >= xpToNext(state.level)).',
    },
  ],
  mastery: {
    targetLevel: 3,
    solveIndependently: 'Build classes from a table and a levelling curve.',
    explainVerbally: 'Explain data-driven classes and the geometric curve.',
    detectIncorrectApplication: 'Spot stats read from the wrong place, and if in place of while.',
    transferToUnfamiliar: 'Design the stat table for another game.',
  },
  assessment: {
    questions: [
      {
        id: 'mg12-001-assess-1',
        type: 'choice',
        text: 'Adding a class to the game takes',
        options: ['A new row in CLASSES', 'A new hero scene', 'A new title screen', 'A new script per class'],
        answer: 'A new row in CLASSES',
        hint: 'One table, many uses.',
      },
    ],
  },
  quiz: [
    {
      id: 'mg12-001-quiz-1',
      type: 'choice',
      text: 'In cell 1, who beats a slime in one hit?',
      options: ['Mage', 'Warrior', 'Ranger', 'Nobody'],
      answer: 'Mage',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg12-001-quiz-2',
      type: 'choice',
      text: 'Level 4 → 5 needs',
      options: ['34', '23', '51', '40'],
      answer: '34',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg12-001-quiz-3',
      type: 'choice',
      text: 'Reaching level 9 takes about how many slimes?',
      options: ['124', '53', '81', '494'],
      answer: '124',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg12-001-quiz-4',
      type: 'choice',
      text: 'At level 10 a Mage\'s attack is',
      options: ['22', '12', '11', '13'],
      answer: '22',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg12-001-quiz-5',
      type: 'choice',
      text: 'gainXp uses while because',
      options: [
        'One reward can be enough for several levels',
        'It is faster',
        'if cannot compare numbers',
        'Levels are a loop',
      ],
      answer: 'One reward can be enough for several levels',
      hints: ['Levelling up.'],
      reviewSection: 'Intuition — levelling up',
    },
  ],
  checkpoints: [
    {
      id: 'cp-mg12-001-1',
      label: 'Read classes as data',
      type: 'read',
    },
    {
      id: 'cp-mg12-001-2',
      label: 'Read the experience curve and levelling',
      type: 'read',
    },
    {
      id: 'cp-mg12-001-3',
      label: 'Run the notebook: classes, curves and levels',
      type: 'read',
    },
    {
      id: 'cp-mg12-001-4',
      label: 'Complete "Classes, stats and levels" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg12-001-5',
      label: 'Work through "Two levels at once"',
      type: 'example',
    },
    {
      id: 'cp-mg12-001-6',
      label: 'Pass the totalXp() challenge',
      type: 'challenge',
    },
  ],
}
