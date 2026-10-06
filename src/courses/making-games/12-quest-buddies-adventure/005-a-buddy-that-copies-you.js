export default {
  chapter: 'making-games-12',
  order: 5,
  id: 'mg12-005',
  nextLesson: 'mg12-006',
  slug: 'a-buddy-that-copies-you',
  title: 'A Buddy That Copies You',
  subtitle: 'Imitation learning: show the buddy what to do, and it copies you; and Q-learning learns from your choices too, because it is off-policy.',
  tags: ['game-studio', 'rpg', 'imitation-learning', 'behaviour-cloning', 'q-learning', 'off-policy', 'npc'],
  aliases: 'imitation learning behaviour cloning behavior cloning learning from demonstration teach mode copy the player off policy on policy q learning learns from any choices bad teacher trust counts',
  timeToComplete: 55,
  coreConcept: 'In teach mode (T) you choose the buddy\'s moves with keys 1 to 4, and it counts what you chose in each situation. On its own it then copies your most shown move there, with a chance n / (n + 10) that grows with how many times you showed it: behaviour cloning, the simplest imitation learning. Because Q-learning\'s update uses the best next value rather than the move made next, it is off-policy: it learns how good moves are from your choices as well as its own. So a buddy can learn faster from a teacher, and Q-learning can even see that a bad teacher\'s moves are worse.',
  prerequisites: ['mg12-004'],
  hook: {
    question: 'The buddy learns slowly by trying things. You already know what it should do. Can you just show it? And if you show it something silly, will it copy that too?',
    realWorldContext: 'Imitation learning trains self-driving cars from human drivers, robots from demonstrations, and game bots from replays (AlphaStar began by copying human StarCraft games before learning on its own). The pattern, copy first, then improve by reinforcement, is everywhere.',
  },
  intuition: {
    prose: [
      '**Depth: build it, and go deep.** The Try it task adds the input actions teach (T) and buddy_1 to buddy_4 (keys 1 to 4), then teach mode and copying to the buddy.',
      '**Showing it.** T turns teach mode on (state.buddy.teaching). Keys 1 to 4 choose its move: follow, fight, guard, rest. While teaching, decide() does your move instead of its own, and counts it: state.buddy.shown[situation][move] += 1. Four decisions a second, so a minute of teaching is 240 examples.',
      '**Copying: behaviour cloning.** On its own again, in a situation you showed it, it does what you did most there. How often depends on how much you showed: with n examples it copies with chance n / (n + 10) (cell 1). After 5 examples it copies a third of the time; after 50, 83%; after 300, 97%. Otherwise it makes its own ε-greedy choice. Few examples are not trusted much; many are.',
      '**Learning from you: off-policy.** Your moves are decisions like its own, so decide() runs the same Q-learning update on them. The update uses max Q(s′, ·), the best value of the next situation, not the move that will actually be made next. So Q-learning learns how good each move is whoever chooses: it is off-policy. Cell 2 chooses completely at random, the buddy never chooses at all, and it still learns that fighting is better near a slime.',
      '**A bad teacher.** Show it to follow near slimes 90% of the time (cell 3). Copying obeys: with 2,779 examples it follows almost always. But Q-learning, learning from the same moves, still values fight (5.91) above follow (5.56). The two disagree: copying does what you did, Q-learning knows what works. Many real systems copy first, then let reinforcement learning improve on the teacher.',
      '**The Try it task\'s last step** teaches it to rest while you walk away. Resting far from you costs −0.5 each time, and its value for resting there settles near −0.5 + 0.9 × 0 = −0.5 (follow, never tried there, is still worth 0). Copying will still rest, because you showed it 300 times: imitation follows the teacher, even against its own values.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: teaching a learning agent',
        body: 'Step 1. A way for you to choose its actions (teach mode). Step 2. While teaching, do your action, count it per state, and still run the learning update. Step 3. On its own: copy the most shown action with a trust that grows with the count; otherwise its own choice. Step 4. Let its own learning take over as it gets better.',
      },
      {
        type: 'warning',
        title: 'Copying copies mistakes',
        body: 'Behaviour cloning does what you did, good or bad, and only in situations you showed it. Where you never went, it knows nothing.',
      },
      {
        type: 'insight',
        title: 'Off-policy is a superpower',
        body: 'Because Q-learning learns from any choices, it can learn from teachers, from replays of old games, and from random play. SARSA, which uses the move actually made next, cannot do this as easily.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Copying and learning from you',
        caption: 'The same world as lesson 12.4\'s notebook.',
        props: {
          lesson: {
            title: 'Copying and learning from you',
            subtitle: 'Behaviour cloning, and why Q-learning learns from anyone.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. Behaviour cloning and trust\nPredict first: after 5 lessons.',
                startCode: '// Copying (behaviour cloning): count what you chose in each situation, and do what you did most. How much to trust\n// the counts grows with how many there are: n / (n + 10). Predict first: after 5 lessons, how often does it copy you?\nconst shown = { \'slime near\': [2, 15, 0, 0], \'no slime\': [6, 0, 0, 1] }   // follow, fight, guard, rest\nconst MOVES = [\'follow\', \'fight\', \'guard\', \'rest\']\nfor (const [situation, counts] of Object.entries(shown)) {\n  const n = counts.reduce((t, c) => t + c, 0)\n  console.log(situation.padEnd(11), \'you chose\', counts.map((c, i) => MOVES[i] + \' \' + c).join(\', \'), \'→ it copies:\', MOVES[counts.indexOf(Math.max(...counts))], \'with chance\', (n / (n + 10)).toFixed(2))\n}\nfor (const n of [0, 5, 10, 50, 300]) console.log(\'shown\', String(n).padStart(3), \'times: copies you\', Math.round(100 * n / (n + 10)) + \'% of the time\')',
              },
              {
                type: 'js',
                instruction: '### 2. Learning from random choices\nPredict first: does it still learn fight?',
                startCode: '// A small model of the buddy\'s world, so learning can be watched quickly. Two situations: a slime near, or none.\n// Fighting a near slime: 60% a hit (+1), 20% the slime is beaten (+3, and then no slime), 20% the buddy is hurt (−1).\n// Following: nothing happens (0). With no slime, a slime turns up 30% of the time.\nfunction rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296 } }\nconst random = rng(1)\nfunction step(s, a) {   // s: \'slime near\' or \'no slime\'; a: 0 follow, 1 fight. Returns [reward, next situation].\n  if (s === \'no slime\') return [0, random() < 0.3 ? \'slime near\' : \'no slime\']\n  if (a === 0) return [0, \'slime near\']\n  const roll = random()\n  return roll < 0.6 ? [1, \'slime near\'] : roll < 0.8 ? [3, \'no slime\'] : [-1, \'slime near\']\n}\n// Off-policy: Q-learning\'s update uses the best value of the next situation, not the move actually made next, so it\n// learns how good each move is whoever chooses the moves. Here you choose completely at random, and it never chooses\n// at all. Predict first: does it still learn that fighting is better near a slime?\nconst Q = { \'slime near\': [0, 0], \'no slime\': [0, 0] }\nlet s = \'no slime\'\nfor (let t = 1; t <= 3000; t++) {\n  const a = Math.floor(random() * 2)             // your move, not its own\n  const [r, next] = step(s, a)\n  Q[s][a] += 0.2 * (r + 0.9 * Math.max(...Q[next]) - Q[s][a])\n  s = next\n}\nconsole.log(\'learned from your random moves: slime near  follow\', Q[\'slime near\'][0].toFixed(2), \' fight\', Q[\'slime near\'][1].toFixed(2))\nconsole.log(\'so on its own it would choose:\', Q[\'slime near\'][1] > Q[\'slime near\'][0] ? \'fight\' : \'follow\')',
              },
              {
                type: 'js',
                instruction: '### 3. A bad teacher\nPredict first: copying against Q-learning.',
                startCode: '// A small model of the buddy\'s world, so learning can be watched quickly. Two situations: a slime near, or none.\n// Fighting a near slime: 60% a hit (+1), 20% the slime is beaten (+3, and then no slime), 20% the buddy is hurt (−1).\n// Following: nothing happens (0). With no slime, a slime turns up 30% of the time.\nfunction rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296 } }\nconst random = rng(1)\nfunction step(s, a) {   // s: \'slime near\' or \'no slime\'; a: 0 follow, 1 fight. Returns [reward, next situation].\n  if (s === \'no slime\') return [0, random() < 0.3 ? \'slime near\' : \'no slime\']\n  if (a === 0) return [0, \'slime near\']\n  const roll = random()\n  return roll < 0.6 ? [1, \'slime near\'] : roll < 0.8 ? [3, \'no slime\'] : [-1, \'slime near\']\n}\n// A bad teacher: you show it to follow near slimes. Copying does what you showed; Q-learning, learning from the same\n// moves, still finds out fighting would earn more, because each update looks at the best next value.\nconst Q = { \'slime near\': [0, 0], \'no slime\': [0, 0] }\nlet s = \'no slime\', copied = 0\nconst shown = { \'slime near\': [0, 0] }\nfor (let t = 1; t <= 3000; t++) {\n  const a = s === \'slime near\' ? (random() < 0.9 ? 0 : 1) : 0     // you follow 90% of the time near a slime\n  if (s === \'slime near\') shown[\'slime near\'][a]++\n  const [r, next] = step(s, a)\n  Q[s][a] += 0.2 * (r + 0.9 * Math.max(...Q[next]) - Q[s][a])\n  s = next\n}\nconst n = shown[\'slime near\'][0] + shown[\'slime near\'][1]\nconsole.log(\'you showed near a slime: follow\', shown[\'slime near\'][0], \' fight\', shown[\'slime near\'][1])\nconsole.log(\'copying would follow\', Math.round(100 * n / (n + 10)) + \'% of the time; Q-learning values: follow\', Q[\'slime near\'][0].toFixed(2), \' fight\', Q[\'slime near\'][1].toFixed(2))',
              },
              {
                type: 'challenge',
                instruction: '### 4. Challenge: copy()\nThe check tries six.',
                startCode: '// Challenge: copy(counts, roll) is the buddy\\u2019s choice in a situation where you showed it counts[move] times: with\n// chance n / (n + 10) (n the total) it copies your most shown move; otherwise it returns null (its own choice).\n// roll is a random number from 0 to 1: copy when roll < n / (n + 10).\nfunction copy(counts, roll) {\n  return null   // your code\n}\nconst cases = [[[0, 0, 0, 0], 0, null], [[2, 15, 0, 0], 0.5, 1], [[2, 15, 0, 0], 0.7, null], [[6, 0, 0, 1], 0.4, 0], [[6, 0, 0, 1], 0.42, null], [[0, 0, 0, 300], 0.96, 3]]\nconst bad = cases.find(([c, r, want]) => copy(c, r) !== want)\nconsole.log(bad ? \'copy(\' + JSON.stringify(bad[0]) + \', \' + bad[1] + \') should be \' + bad[2] + \', not \' + copy(bad[0], bad[1]) + \'.\' : \'✓ It copies your favourite move, trusting it more the more you showed it.\')',
                solutionCode: '// Challenge: copy(counts, roll) is the buddy\\u2019s choice in a situation where you showed it counts[move] times: with\n// chance n / (n + 10) (n the total) it copies your most shown move; otherwise it returns null (its own choice).\n// roll is a random number from 0 to 1: copy when roll < n / (n + 10).\nfunction copy(counts, roll) {\n  const n = counts.reduce((t, c) => t + c, 0)\n  if (n > 0 && roll < n / (n + 10)) return counts.indexOf(Math.max(...counts))\n  return null\n}\nconst cases = [[[0, 0, 0, 0], 0, null], [[2, 15, 0, 0], 0.5, 1], [[2, 15, 0, 0], 0.7, null], [[6, 0, 0, 1], 0.4, 0], [[6, 0, 0, 1], 0.42, null], [[0, 0, 0, 300], 0.96, 3]]\nconst bad = cases.find(([c, r, want]) => copy(c, r) !== want)\nconsole.log(bad ? \'copy(\' + JSON.stringify(bad[0]) + \', \' + bad[1] + \') should be \' + bad[2] + \', not \' + copy(bad[0], bad[1]) + \'.\' : \'✓ It copies your favourite move, trusting it more the more you showed it.\')',
              },
              {
                type: 'markdown',
                instruction: '### 5. The code you wrote, line by line\n\nIn the order of the task\'s three steps (the third writes no code: it watches what the second already does).\n\n```js\nproject.addAction(\'teach\', [\'KeyT\'])\nfor (let k = 1; k <= 4; k++) project.addAction(\'buddy_\' + k, [\'Digit\' + k])\n```\n\nT, and four actions buddy_1 to buddy_4 on the number keys (Digit1 is the 1 above the letters).\n\n**scripts/buddy.js**\n\n```js\n// And it copies you (lesson 12.5): in teach mode (T) keys 1 to 4 choose its move, and it counts what you chose.\n  taught = 0;       // the move you chose for it, in teach mode\n    state.buddy.shown ??= {};       // your choices: shown[situation][move] = how many times\n    state.buddy.teaching ??= false;\n```\n\nA field for your choice, and in `ready()` two more keys in its mind: the counts of what you showed it, by situation and move, and whether teach mode is on. `??=` adds them to a mind saved before this lesson, too.\n\n```js\n    const action = this.mind.teaching ? this.learnFromYou(key) : this.choose(key, now);\n```\n\nIn `decide()`, in place of the ε-greedy line: in teach mode, your move; otherwise its own choice. The Q update above it is unchanged, so it learns from your moves exactly as from its own.\n\n```js\n  learnFromYou(key) {\n    const action = Math.min(this.taught, this.mind.moves - 1);\n    const row = this.mind.shown[key] ?? (this.mind.shown[key] = []);\n    while (row.length < MOVES.length) row.push(0);\n    row[action] += 1;\n    return action;\n```\n\nYour move, but not one it does not have yet (with 2 moves, choosing rest gives fight). Count it in this situation\'s row, and do it.\n\n```js\n  choose(key, now) {\n    return Math.random() < this.epsilon ? Math.floor(Math.random() * this.mind.moves) : now.indexOf(Math.max(...now));\n```\n\nStep 1\'s `choose`: its own ε-greedy choice, moved here from `decide()`.\n\n```js\n  update(dt) {\n    if (input.isJustPressed(\'teach\')) {\n      this.mind.teaching = !this.mind.teaching;\n      scene.get(\'HUD\').say(this.mind.teaching ? \'Teaching your buddy: 1 follow, 2 fight, 3 guard, 4 rest\' : \'Your buddy is on its own again\');\n    for (let k = 0; k < MOVES.length; k++) if (input.isJustPressed(\'buddy_\' + (k + 1))) this.taught = k;\n```\n\nT turns teach mode on or off, and says which. Keys 1 to 4 set `taught` to move 0 to 3.\n\n```js\n    const shown = (this.mind.shown[key] ?? []).slice(0, this.mind.moves), n = shown.reduce((t, c) => t + c, 0);\n    if (n > 0 && Math.random() < n / (n + 10)) return shown.indexOf(Math.max(...shown));\n```\n\nStep 2, at the top of `choose`: your counts in this situation (only for moves it has: `slice(0, moves)`), and their total `n` (`reduce` adds them up, starting from 0). With chance n / (n + 10), do what you did most here: after 10 showings, half the time; after 90, nine times in ten (cell 1). Otherwise, its own choice as before.',
              },
              {
                type: 'markdown',
                instruction: '### 6. Questions you might have\n\n**Why trust you more the more you showed it, instead of always copying?** One showing might be a slip; many are a habit. n / (n + 10) starts low and approaches 1, so it copies a habit almost always and a slip rarely.\n\n**If I teach it something silly, is it stuck?** No: its Q-learning still runs on everything it does, so the value of the silly move falls when it earns badly, and when it is on its own the ε-greedy choice can win out. Step 3 shows the value of resting far from you falling while you teach it to rest.\n\n**What does "off-policy" mean here?** The Q update learns how good a move is whoever chose it. So your choices teach its values as well as its habits.\n\n**Why are the counts per situation?** "Fight" is right with a slime near and wrong with none. Counting per situation copies what you do where.',
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'A buddy that copies you',
        props: {
          task: 'qa-copy',
          lesson: 'mg12-005',
          checkpoint: 'cp-mg12-005-4',
        },
      },
    ],
  },
  math: {
    prose: [
      '**Behaviour cloning, decoded.** $\\pi(s) = \\arg\\max_a N(s, a)$, read "in situation $s$, the move you showed most", where $N(s,a)$ counts how often you chose $a$ in $s$. In code: shown[key] and indexOf(Math.max(...)).',
      '**Trust, decoded.** $P(\\text{copy}) = \\frac{n}{n + 10}$ with $n = \\sum_a N(s,a)$: "the examples so far, over the examples plus 10". It is 0 with none, a half at 10, and close to 1 with many: like adding 10 imaginary "I don\'t know" examples to your real ones.',
      '**Off-policy, decoded.** The Q-learning target is $r + \\gamma \\max_{a\'} Q(s\', a\')$: the best next value, whatever move is actually made next. SARSA\'s target is $r + \\gamma\\, Q(s\', a_{\\text{next}})$, the move actually made. Q-learning\'s therefore estimates the best moves\' values from anyone\'s choices; SARSA\'s estimates the values of whoever chooses.',
    ],
    equations: [
      {
        label: 'Behaviour cloning',
        latex: '\\pi(s) = \\arg\\max_a N(s,a)',
      },
      {
        label: 'How much to trust the examples',
        latex: 'P(\\text{copy}) = \\frac{n}{n+10}',
      },
      {
        label: 'Q-learning\'s target and SARSA\'s',
        latex: 'r + \\gamma \\max_{a\'} Q(s\',a\') \\quad\\text{vs}\\quad r + \\gamma\\, Q(s\',a_{\\text{next}})',
      },
    ],
    callouts: [],
    visualizations: [],
  },
  rigor: {
    prose: [
      'Behaviour cloning suffers from compounding errors: a copier that drifts into a situation the teacher never showed has no example there, and may drift further. Methods like DAgger fix this by asking the teacher what to do in the situations the copier reaches; in a game, that is teaching again where the buddy goes wrong.',
      'Where it goes: 12.6 matches the enemies to you; Project Studio\'s learning projects use imitation from recorded play at a larger scale.',
    ],
    callouts: [],
    visualizations: [],
  },
  examples: [
    {
      id: 'mg12-005-ex1',
      title: 'How much trust?',
      difficulty: 'easy',
      problem: 'You showed it 30 times in a situation. How often does it copy you?',
      steps: [
        {
          expression: '30 / 40',
          annotation: 'n / (n + 10).',
          strategyTitle: 'Step 1',
        },
      ],
      answer: '75% of the time.',
    },
    {
      id: 'mg12-005-ex2',
      title: 'Never shown',
      difficulty: 'medium',
      problem: 'You only taught it with no slime about. A slime appears. What does it do?',
      steps: [
        {
          expression: 'N(\\text{slime near}, \\cdot) = 0',
          annotation: 'No examples there.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'Its own ε-greedy choice from what Q-learning has learned, including from your examples elsewhere.',
    },
    {
      id: 'mg12-005-ex3',
      title: 'Why Q-learning sees through the teacher',
      difficulty: 'hard',
      problem: 'In cell 3 you mostly follow. How does Q-learning learn fight\'s value at all?',
      steps: [
        {
          expression: '\\text{10\\% of your moves are fight}',
          annotation: 'Each still gets an update.',
          strategyTitle: 'Step 1',
        },
        {
          expression: '\\max_{a\'}Q(s\',a\')',
          annotation: 'Targets use the best next value, not your next move.',
          strategyTitle: 'Step 2',
        },
      ],
      answer: 'Your occasional fights give it fight\'s rewards, and every target uses the best next value, so the values are of good play, not of your play.',
    },
  ],
  challenges: [
    {
      id: 'mg12-005-ch1',
      title: 'A quicker learner',
      difficulty: 'easy',
      problem: 'Make it trust examples sooner.',
      hint: 'The 10.',
      answer: 'n / (n + 3): a half at 3 examples.',
      walkthrough: [],
    },
    {
      id: 'mg12-005-ch2',
      title: 'Forget old lessons',
      difficulty: 'medium',
      problem: 'Make old examples count less as it learns on its own.',
      hint: 'Shrink the counts.',
      answer: 'In decide(), when not teaching, multiply shown[key] by 0.999 each time: trust fades unless you teach again.',
      walkthrough: [],
    },
    {
      id: 'mg12-005-ch3',
      title: 'Copy, then improve',
      difficulty: 'hard',
      problem: 'Make it copy you only while its own best value is not clearly better than the move you showed.',
      hint: 'Compare the values.',
      answer: 'Copy only if Q[key][shownBest] ≥ max(Q[key]) − 0.5: once Q-learning finds something clearly better, it stops copying.',
      walkthrough: [],
    },
  ],
  semantics: {
    core: [
      {
        symbol: 'teach mode',
        meaning: 'You choose its moves (T, then 1 to 4).',
      },
      {
        symbol: 'shown[s][a]',
        meaning: 'How many times you chose a in s.',
      },
      {
        symbol: 'n / (n + 10)',
        meaning: 'How much it trusts your examples.',
      },
      {
        symbol: 'behaviour cloning',
        meaning: 'Doing what the teacher did most.',
      },
      {
        symbol: 'off-policy',
        meaning: 'Learning best values from anyone\'s choices.',
      },
    ],
    rulesOfThumb: [
      'Copy first, improve after.',
      'Trust grows with examples.',
      'Copying copies mistakes.',
      'Q-learning learns from anyone.',
    ],
  },
  misconceptions: [
    {
      falseBelief: 'A copier is only as good as its teacher, so learning from a teacher is too.',
      whyStudentsThinkIt: 'It learns from the teacher.',
      correctionExample: 'Cell 3: Q-learning values fight above follow from a teacher who mostly follows.',
      contrastCase: 'Pure behaviour cloning is only as good as the teacher.',
    },
    {
      falseBelief: 'Off-policy means it ignores the teacher.',
      whyStudentsThinkIt: 'It learns best values, not the teacher\'s.',
      correctionExample: 'It learns from every move the teacher makes; it just values each move by the best that follows.',
      contrastCase: 'SARSA values each move by what the chooser does next.',
    },
  ],
  transferPrompts: [
    {
      situation: 'A racing game AI.',
      competingTechniques: [
        'Learn from scratch by crashing',
        'Copy recorded laps, then improve by reinforcement',
      ],
      whyThisTechniqueWins: 'Copying skips the thousands of early crashes.',
    },
    {
      situation: 'A bot that plays like a particular player.',
      competingTechniques: [
        'Q-learning for winning',
        'Behaviour cloning from their games',
      ],
      whyThisTechniqueWins: 'Cloning reproduces their style, mistakes and all, which is the point.',
    },
  ],
  debugging: [
    {
      commonError: 'Teaching does nothing.',
      symptom: 'It ignores your 1 to 4.',
      whyItHappened: 'decide() still chooses its own move while teaching.',
      repairStrategy: 'While teaching, the move is yours.',
    },
    {
      commonError: 'It copies after one example.',
      symptom: 'A single accident is repeated.',
      whyItHappened: 'No trust: it copies whenever there is a count.',
      repairStrategy: 'Copy with chance n / (n + 10).',
    },
  ],
  mastery: {
    targetLevel: 3,
    solveIndependently: 'Add teaching and copying to a learning agent.',
    explainVerbally: 'Explain behaviour cloning, trust and off-policy learning.',
    detectIncorrectApplication: 'Spot copying without trust, and a teacher\'s moves left out of learning.',
    transferToUnfamiliar: 'Design imitation for another game\'s AI.',
  },
  assessment: {
    questions: [
      {
        id: 'mg12-005-assess-1',
        type: 'choice',
        text: 'Q-learning can learn from your choices because',
        options: [
          'Its target uses the best next value, whoever chooses',
          'It copies you',
          'It ignores rewards',
          'It uses SARSA',
        ],
        answer: 'Its target uses the best next value, whoever chooses',
        hint: 'Off-policy.',
      },
    ],
  },
  quiz: [
    {
      id: 'mg12-005-quiz-1',
      type: 'choice',
      text: 'In cell 1, with 50 examples it copies you',
      options: ['83% of the time', '50%', '97%', '100%'],
      answer: '83% of the time',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg12-005-quiz-2',
      type: 'choice',
      text: 'In cell 2, from random choices alone it learns to',
      options: ['fight near a slime', 'follow', 'nothing', 'rest'],
      answer: 'fight near a slime',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg12-005-quiz-3',
      type: 'choice',
      text: 'In cell 3, the teacher mostly follows; Q-learning values',
      options: ['fight above follow', 'follow above fight', 'both 0', 'neither'],
      answer: 'fight above follow',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg12-005-quiz-4',
      type: 'choice',
      text: 'Copying is called',
      options: ['behaviour cloning', 'SARSA', 'ε-greedy', 'Elo'],
      answer: 'behaviour cloning',
      hints: ['Copying.'],
      reviewSection: 'Intuition — copying',
    },
    {
      id: 'mg12-005-quiz-5',
      type: 'choice',
      text: 'Taught to rest far from you, its value for resting there is about',
      options: ['−0.5', '0', '+3', '−10'],
      answer: '−0.5',
      hints: ['The Try it task\'s last step.'],
      reviewSection: 'Intuition — the last step',
    },
  ],
  checkpoints: [
    {
      id: 'cp-mg12-005-1',
      label: 'Read teach mode and behaviour cloning',
      type: 'read',
    },
    {
      id: 'cp-mg12-005-2',
      label: 'Read off-policy learning and the bad teacher',
      type: 'read',
    },
    {
      id: 'cp-mg12-005-3',
      label: 'Run the notebook: copying and learning from you',
      type: 'read',
    },
    {
      id: 'cp-mg12-005-4',
      label: 'Complete "A buddy that copies you" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg12-005-5',
      label: 'Work through "Why Q-learning sees through the teacher"',
      type: 'example',
    },
    {
      id: 'cp-mg12-005-6',
      label: 'Pass the copy() challenge',
      type: 'challenge',
    },
  ],
}
