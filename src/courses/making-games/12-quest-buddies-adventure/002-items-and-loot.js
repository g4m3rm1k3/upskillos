export default {
  chapter: 'making-games-12',
  order: 2,
  id: 'mg12-002',
  nextLesson: 'mg12-003',
  slug: 'items-and-loot',
  title: 'Items and Loot',
  subtitle: 'Roll drops from a weighted table with a seeded random generator, generate weapons with affixes, and use them from the bag.',
  tags: ['game-studio', 'rpg', 'loot', 'items', 'random', 'probability', 'seeds'],
  aliases: 'loot table drop table weighted random choice rarity common rare legendary seed seeded random rng reproducible affix prefix suffix generated items procedural items potion weapon equip inventory use item',
  timeToComplete: 50,
  coreConcept: 'A loot table is a list of [item, weight]: an item\'s chance is its weight over the total. To choose, line the weights up end to end and roll a number from 0 to the total: it lands in one item\'s stretch. A seeded generator (math.rng(seed)) gives the same numbers for the same seed; keeping its state in state.lootSeed makes drops repeatable, testable and continuable after a save. Items can be generated: a weapon picked from one table plus an affix (" of Might") from another, their bonuses added. The bag\'s rows become Buttons that use or equip.',
  prerequisites: ['mg12-001'],
  hook: {
    question: 'A slime drops a Sword of the Hero, and you have never seen one before. How rare is it? How does the game decide, and how can a test check the odds without fighting ten thousand slimes?',
    realWorldContext: 'Loot tables with weights and rarities drive Diablo, Borderlands and every gacha game, and affix systems generate millions of items from a few short tables. Seeded random generators make procedural games repeatable: the same seed, the same world (Minecraft), the same daily run (Spelunky).',
  },
  intuition: {
    prose: [
      '**Depth: build it, and go deep.** The Try it task writes loot.js, gives newGame() a lootSeed and a weapon slot (weapon: null), and makes the bag usable.',
      '**A weighted table.** TABLE = [[\'nothing\', 40], [\'gold\', 30], [\'potion\', 20], [\'weapon\', 10]]. Each weight over the total (100) is that item\'s chance: a weapon is a tenth of drops. To choose, line the weights up end to end, nothing from 0 up to 40, gold up to 70, potion up to 90, weapon up to 100, roll a number in that range and see where it lands (cell 1). A roll of 75 is a potion. Weights need not add to 100; only their shares matter.',
      '**Seeded random numbers.** Math.random() gives different numbers every run, so a bug in the drops cannot be repeated. math.rng(seed) makes a generator of its own: the same seed always gives the same numbers (cell 2). rollLoot() makes one from state.lootSeed, rolls, and saves the generator\'s state back into state.lootSeed: the next drop carries on the sequence, a saved game carries on where it was, and a test sets the seed and knows exactly what will drop.',
      '**What to expect.** 10,000 rolls come out within a percent of the table (cell 3). On average a weapon takes 10 slimes, but "on average" hides the spread: some players get one in the first slime, some wait 30. That is worth knowing before a designer complains the drops are broken.',
      '**Items made from parts.** A weapon is two rolls: which weapon (Stick +1, Dagger +2, Sword +3, rarer as they get better) and which affix (none, " of Might" +1, " of the Hero" +3). Its name is both, its bonus their sum: three weapons and three affixes make nine items from six rows. A Sword of the Hero is 0.1 × 0.15 × 0.08 of drops, about one in 800; any weapon of the Hero, 0.8% of drops (cell 3).',
      '**A bag you can use.** In the HUD, each item in state.bag with a kind is a Button: pressed, a potion heals 5 (no higher than maxHp) and is gone; a weapon becomes state.weapon, the one held going back in the bag. The list is rebuilt after, and its first button gets the focus, so I then Enter drinks a potion without the mouse. The attack uses state.weapon\'s bonus (lesson 12.3).',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: a loot drop',
        body: 'Step 1. A table of [kind, weight]. Step 2. const r = math.rng(state.lootSeed). Step 3. kind = r.weighted(TABLE); for a weapon, roll its base and its affix the same way and combine. Step 4. state.lootSeed = r.state. Step 5. Return the item (or null), and put it in the bag or the gold.',
      },
      {
        type: 'warning',
        title: 'Save the generator\'s state',
        body: 'Forget state.lootSeed = r.state and every drop rolls from the same seed: the same item, forever.',
      },
      {
        type: 'insight',
        title: 'Tests that can check odds',
        body: 'Because the generator is seeded, a test can roll 2,000 drops from a fixed seed in a moment and check the shares are near the weights, and the Try it task does.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Weighted choice, seeds and odds',
        caption: 'The same generator as math.rng.',
        props: {
          lesson: {
            title: 'Weighted choice, seeds and odds',
            subtitle: 'How a drop is chosen, and what to expect.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. A weighted choice by hand\nPredict first: a roll of 75.',
                startCode: '// Weighted choice by hand: line the weights up end to end (cumulative sums), roll a number from 0 up to the total, and\n// see which stretch it lands in. Predict first: which item does a roll of 75 pick?\nconst TABLE = [[\'nothing\', 40], [\'gold\', 30], [\'potion\', 20], [\'weapon\', 10]]\nlet edge = 0\nconst stretches = TABLE.map(([item, w]) => { const s = [item, edge, edge + w]; edge += w; return s })\nfor (const [item, from, to] of stretches) console.log(item.padEnd(8), \'from\', String(from).padStart(3), \'up to\', to)\nconst pick = (roll) => stretches.find(([, from, to]) => roll >= from && roll < to)[0]\nfor (const roll of [0, 39.9, 40, 75, 89, 95]) console.log(\'roll\', String(roll).padStart(4), \'→\', pick(roll))',
              },
              {
                type: 'js',
                instruction: '### 2. Seeds\nPredict first: the second line.',
                startCode: '// A seeded generator: the same seed gives the same numbers, so a game\'s loot can be repeated (and tested, and saved\n// part-way). This is the generator math.rng uses (mulberry32).\nfunction rng(seed) {\n  let s = seed >>> 0\n  const next = () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296 }\n  return { next, get state() { return s } }\n}\nconst a = rng(42), b = rng(42), c = rng(43)\nconsole.log(\'seed 42:\', [a.next(), a.next(), a.next()].map((x) => x.toFixed(4)).join(\' \'))\nconsole.log(\'seed 42:\', [b.next(), b.next(), b.next()].map((x) => x.toFixed(4)).join(\' \'))\nconsole.log(\'seed 43:\', [c.next(), c.next(), c.next()].map((x) => x.toFixed(4)).join(\' \'))\n// Carrying on: save the state, and a new generator from it picks up where the first left off.\nconst d = rng(7); d.next(); const saved = d.state\nconsole.log(\'carry on: next from the original\', d.next().toFixed(4), \', from the saved state\', rng(saved).next().toFixed(4))',
              },
              {
                type: 'js',
                instruction: '### 3. 10,000 drops\nPredict first: how many of the Hero.',
                startCode: '// What to expect from the table. A weapon is a tenth of drops, so on average 10 slimes per weapon; a weapon "of the Hero"\n// is 8% of weapons: 0.1 × 0.08 = 0.008 of drops, about one in 125. Rolled 10,000 times to check.\nfunction rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296 } }\nconst weighted = (r, table) => { const total = table.reduce((t, [, w]) => t + w, 0); let roll = r() * total; for (const [item, w] of table) { roll -= w; if (roll < 0) return item } return table.at(-1)[0] }\nconst r = rng(1), counts = { nothing: 0, gold: 0, potion: 0, weapon: 0, hero: 0 }\nfor (let i = 0; i < 10000; i++) {\n  const kind = weighted(r, [[\'nothing\', 40], [\'gold\', 30], [\'potion\', 20], [\'weapon\', 10]])\n  counts[kind]++\n  if (kind === \'weapon\' && weighted(r, [[\'\', 70], [\' of Might\', 22], [\' of the Hero\', 8]]) === \' of the Hero\') counts.hero++\n}\nfor (const [k, n] of Object.entries(counts)) console.log(k.padEnd(8), n, \'(\' + (n / 100).toFixed(1) + \'%)\')',
              },
              {
                type: 'challenge',
                instruction: '### 4. Challenge: pick()\nThe check tries seven rolls.',
                startCode: '// Challenge: pick(table, roll) chooses from a table of [item, weight] for a roll from 0 up to the total weight: line the\n// weights up end to end and return the item whose stretch the roll lands in.\nfunction pick(table, roll) {\n  return table[0][0]   // your code\n}\nconst T = [[\'nothing\', 40], [\'gold\', 30], [\'potion\', 20], [\'weapon\', 10]]\nconst cases = [[0, \'nothing\'], [39.9, \'nothing\'], [40, \'gold\'], [69, \'gold\'], [70, \'potion\'], [90, \'weapon\'], [99.99, \'weapon\']]\nconst bad = cases.find(([r, want]) => pick(T, r) !== want)\nconsole.log(bad ? \'A roll of \' + bad[0] + \' should pick \' + bad[1] + \', not \' + pick(T, bad[0]) + \'.\' : \'✓ Every roll lands in the right stretch.\')',
                solutionCode: '// Challenge: pick(table, roll) chooses from a table of [item, weight] for a roll from 0 up to the total weight: line the\n// weights up end to end and return the item whose stretch the roll lands in.\nfunction pick(table, roll) {\n  for (const [item, weight] of table) {\n    if (roll < weight) return item\n    roll -= weight\n  }\n  return table[table.length - 1][0]\n}\nconst T = [[\'nothing\', 40], [\'gold\', 30], [\'potion\', 20], [\'weapon\', 10]]\nconst cases = [[0, \'nothing\'], [39.9, \'nothing\'], [40, \'gold\'], [69, \'gold\'], [70, \'potion\'], [90, \'weapon\'], [99.99, \'weapon\']]\nconst bad = cases.find(([r, want]) => pick(T, r) !== want)\nconsole.log(bad ? \'A roll of \' + bad[0] + \' should pick \' + bad[1] + \', not \' + pick(T, bad[0]) + \'.\' : \'✓ Every roll lands in the right stretch.\')',
              },
              {
                type: 'markdown',
                instruction: '### 5. The code you wrote, line by line\n\nIn the order of the task\'s three steps.\n\n**scripts/loot.js** (new)\n\n```js\nexport const TABLE = [[\'nothing\', 40], [\'gold\', 30], [\'potion\', 20], [\'weapon\', 10]];\nexport const WEAPONS = [[\'Stick\', 1, 50], [\'Dagger\', 2, 35], [\'Sword\', 3, 15]];          // name, bonus, weight\nexport const AFFIXES = [[\'\', 0, 100]];      // no affixes yet: every weapon is plain\n```\n\nTables as lists of rows. TABLE pairs each kind of drop with a weight: out of 100, nothing 40 times, gold 30, a potion 20, a weapon 10 (cell 1). WEAPONS rows are name, attack bonus and weight. AFFIXES, for now, has one row that adds nothing.\n\n```js\nexport function rollLoot() {\n  const r = math.rng(state.lootSeed);\n  const kind = r.weighted(TABLE);\n  let item = null;\n```\n\n`math.rng(seed)` makes a seeded random number generator: the same seed always gives the same sequence (cell 2). `r.weighted(table)` picks a row\'s first value with chances in proportion to the weights. `let` (not `const`) because `item` will be given a value below.\n\n```js\n  if (kind === \'gold\') item = { kind: \'gold\', amount: r.int(2, 6) };\n  if (kind === \'potion\') item = { kind: \'potion\', name: \'Potion\', note: \'heals 5\' };\n```\n\nGold: a whole number from 2 to 6 (`r.int`). A potion: an item for the bag, with a `kind` so the bag knows what it does.\n\n```js\n  if (kind === \'weapon\') {\n    const [name, bonus] = r.weighted(WEAPONS.map((w) => [w, w[2]]));\n    const [part, extra] = r.weighted(AFFIXES.map((a) => [a, a[2]]));\n    item = { kind: \'weapon\', name: name + part, bonus: bonus + extra, note: \'+\' + (bonus + extra) + \' attack\' };\n```\n\nA weapon is two rolls. `WEAPONS.map((w) => [w, w[2]])` turns each row into `[the whole row, its weight]` (`w[2]` is the third value), so `weighted` returns a whole row, which `[name, bonus]` takes apart. The same for the affix. The weapon\'s name is both names joined, and its bonus both bonuses added.\n\n```js\n  state.lootSeed = r.state;   // carry on from here next time\n  return item;\n```\n\nThe generator\'s position in its sequence goes back into `state`, so the next roll carries on instead of repeating, and a saved game carries on where it was. Then the item, or `null` for nothing.\n\n```js\n    lootSeed: Math.floor(Math.random() * 1e9),   // the loot generator\'s state: a fresh run of drops each game\n```\n\nIn `newGame()`: each new game starts the sequence somewhere new. `Math.random()` is a number from 0 to just under 1; times a billion (`1e9`), rounded down. Tests set `state.lootSeed` themselves and know exactly what will drop.\n\n```js\nexport const AFFIXES = [[\'\', 0, 70], [\' of Might\', 1, 22], [\' of the Hero\', 3, 8]];      // name part, extra bonus, weight\n```\n\nStep 2 fills the affix table: most weapons plain, 22 in 100 "of Might" (+1), 8 in 100 "of the Hero" (+3). A Sword of the Hero is +6.\n\n**A bag you can use**\n\n```js\n    bag: [],                    // items: { name, note }, and for things you can use, a kind\n    weapon: null,               // the weapon in your hand: { name, bonus }\n```\n\nIn `newGame()`: the bag\'s comment now says items may have a kind, and a new key for the weapon you hold.\n\n```js\n    this.get(\'Gold\').text = \'Gold: \' + state.gold + (state.weapon ? \'   \' + state.weapon.name : \'\');\n```\n\nThe gold label also names your weapon when you have one.\n\n```js\n  useRow(item) {\n    const b = new Button();\n    b.text = item.name + \': \' + item.note;\n    b.size = { x: 230, y: 30 };\n    b.fontSize = 14;\n    b.connect(\'pressed\', () => this.use(item));\n    return b;\n```\n\nA bag row as a button that uses its item when pressed.\n\n```js\n  use(item) {\n    state.bag = state.bag.filter((i) => i !== item);\n```\n\nTake it out of the bag: every item except this one (`!==` compares the very object).\n\n```js\n    if (item.kind === \'potion\') { state.hp = Math.min(state.maxHp, state.hp + 5); this.say(\'+5 hit points\'); }\n    if (item.kind === \'weapon\') { if (state.weapon) state.bag.push(state.weapon); state.weapon = item; this.say(\'Equipped: \' + item.name); }\n    this.toggleBag(); this.toggleBag();   // close and open again: the list is rebuilt\n```\n\nA potion heals 5, but not past the maximum (`Math.min` takes the smaller). A weapon goes in your hand, and the one you held goes back in the bag. Then close and open the bag, which rebuilds its rows from `state.bag`.\n\n```js\n    let first = null;   // the first button, to give it the focus\n    for (const item of state.bag) {\n      if (item.kind) {   // something you can use: a button\n        const button = this.useRow(item);\n        list.addChild(button);\n        first ??= button;\n        continue;\n```\n\nIn `toggleBag()`\'s loop: items with a kind become buttons. `first ??= button` sets `first` only if it is still null, so it keeps the first button. `continue` skips to the next item (the label code below is for items you cannot use, like the amulet).\n\n```js\n    if (first) first.grabFocus();   // Enter uses the first item; the arrow keys move between them\n```\n\nAfter the loop: with a button in the list, the keyboard works it at once.',
              },
              {
                type: 'markdown',
                instruction: '### 6. Questions you might have\n\n**Why not just use `Math.random()` for loot?** You could, but you could not repeat a run: not in a test, not after loading a save. A seeded generator gives the same drops from the same seed, and keeping its state in `state` makes them continue.\n\n**Do the weights have to add up to 100?** No. Each row\'s chance is its weight over the total, so [3, 1] is 75% and 25%. 100 just makes them read as percentages.\n\n**Why do items have a `kind` and a `name`?** The kind says what it does (the bag\'s buttons check it); the name is what the player sees. Two weapons have the same kind and different names.\n\n**What does `??=` do that `=` does not?** It only sets the variable if it is null or undefined. Here, only the first button sets it.\n\n**Why close and open the bag instead of removing one row?** The same reason as in lesson 11.6: rebuilding from `state.bag` cannot be wrong. Using a weapon also adds a row (the old weapon).',
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Items and loot',
        props: {
          task: 'qa-loot',
          lesson: 'mg12-002',
          checkpoint: 'cp-mg12-002-4',
        },
      },
    ],
  },
  math: {
    prose: [
      '**A chance, decoded.** $p_i = w_i / \\sum_j w_j$, read "an item\'s weight over all the weights added up". For the weapon, $10 / 100 = 0.1$.',
      '**Two rolls together.** The chance of both of two independent rolls is their product: $P(\\text{Sword of the Hero}) = 0.1 \\times 0.15 \\times 0.08 = 0.0012$, read "a weapon, then a Sword among weapons, then the Hero affix".',
      '**How long to wait.** The number of slimes until the first weapon follows a geometric distribution, with mean $1/p$, read "on average one over the chance": $1/0.1 = 10$. The chance of none in $n$ slimes is $(1-p)^n$: $0.9^{20} \\approx 0.12$, so about one player in eight beats 20 slimes and still has no weapon.',
    ],
    equations: [
      {
        label: 'An item\'s chance',
        latex: 'p_i = \\frac{w_i}{\\sum_j w_j}',
      },
      {
        label: 'Both of two rolls',
        latex: 'P(A\\text{ and }B) = P(A)\\,P(B)',
      },
      {
        label: 'Average tries to the first',
        latex: 'E[\\text{tries}] = \\frac{1}{p},\\qquad P(\\text{none in } n) = (1-p)^n',
      },
    ],
    callouts: [],
    visualizations: [],
  },
  rigor: {
    prose: [
      'mulberry32 is a small generator good enough for games, not for anything secret. A seed sets its 32-bit state; each call moves the state on by a fixed odd number and mixes it, so neighbouring seeds give unrelated numbers.',
      'Some games use "pity timers" that raise the chance after a run of bad luck, to cut the long waits of the geometric distribution; that is a change to the weights, kept in state.',
      'Where it goes: 12.3 drops the loot from slimes and uses the weapon\'s bonus.',
    ],
    callouts: [],
    visualizations: [],
  },
  examples: [
    {
      id: 'mg12-002-ex1',
      title: 'A rarer potion',
      difficulty: 'easy',
      problem: 'Make potions half as common, without changing the others\' shares between themselves.',
      steps: [
        {
          expression: '20 \\to 10',
          annotation: 'Its weight halves; the total becomes 90.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'Weight 10: potions become 10/90 ≈ 11% of drops; the others\' shares rise a little, keeping their ratios.',
    },
    {
      id: 'mg12-002-ex2',
      title: 'Where the roll lands',
      difficulty: 'medium',
      problem: 'With the table in cell 1, which item does a roll of 90 pick, and why?',
      steps: [
        {
          expression: '[90, 100)',
          annotation: 'Each stretch includes its start, not its end.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'A weapon: potion\'s stretch ends just before 90.',
    },
    {
      id: 'mg12-002-ex3',
      title: 'Unlucky players',
      difficulty: 'hard',
      problem: 'What share of players beat 30 slimes and see no weapon?',
      steps: [
        {
          expression: '0.9^{30} \\approx 0.042',
          annotation: 'No weapon, 30 times.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'About 4%: one player in 24.',
    },
  ],
  challenges: [
    {
      id: 'mg12-002-ch1',
      title: 'A legendary tier',
      difficulty: 'easy',
      problem: 'Add a legendary weapon at 1% of drops.',
      hint: 'One more row.',
      answer: 'A row [\'legendary\', 1] in TABLE and its branch in rollLoot; every share shifts slightly as the total becomes 101.',
      walkthrough: [],
    },
    {
      id: 'mg12-002-ch2',
      title: 'A daily seed',
      difficulty: 'medium',
      problem: 'Make everyone who starts a game on the same day get the same drops.',
      hint: 'The seed.',
      answer: 'lootSeed from the date: for example Number(new Date().toISOString().slice(0, 10).replaceAll(\'-\', \'\')).',
      walkthrough: [],
    },
    {
      id: 'mg12-002-ch3',
      title: 'A pity timer',
      difficulty: 'hard',
      problem: 'Raise the weapon\'s weight by 5 for every drop without one, back to 10 after a weapon.',
      hint: 'Keep a count in state.',
      answer: 'state.dry counts drops since a weapon; use [\'weapon\', 10 + 5 * state.dry] in the table; reset it on a weapon.',
      walkthrough: [],
    },
  ],
  semantics: {
    core: [
      {
        symbol: 'weight',
        meaning: 'An item\'s share of the table.',
      },
      {
        symbol: 'math.rng(seed)',
        meaning: 'A generator: the same seed, the same numbers.',
      },
      {
        symbol: 'r.weighted(table)',
        meaning: 'Choose an item by weight.',
      },
      {
        symbol: 'state.lootSeed',
        meaning: 'The generator\'s state, so drops carry on.',
      },
      {
        symbol: 'affix',
        meaning: 'A name part with a bonus, rolled separately.',
      },
    ],
    rulesOfThumb: [
      'Chances are weights over the total.',
      'Seed everything you may need to repeat.',
      'Save the generator\'s state.',
      'Know the spread, not just the average.',
    ],
  },
  misconceptions: [
    {
      falseBelief: 'A 10% drop arrives by the tenth try.',
      whyStudentsThinkIt: '10 × 10% = 100%.',
      correctionExample: '0.9^10 ≈ 35% of players have none after 10.',
      contrastCase: 'On average it takes 10.',
    },
    {
      falseBelief: 'Seeded random is less random.',
      whyStudentsThinkIt: 'It repeats.',
      correctionExample: 'It is as evenly spread (cell 3); it only repeats when you give it the same seed.',
      contrastCase: 'A fixed seed every new game would make every game the same: seed new games from the clock.',
    },
  ],
  transferPrompts: [
    {
      situation: 'Testing a procedural level generator.',
      competingTechniques: [
        'Math.random and hope',
        'A seeded generator and fixed seeds in tests',
      ],
      whyThisTechniqueWins: 'A failing level can be made again from its seed.',
    },
    {
      situation: 'A shop with random stock.',
      competingTechniques: [
        'Random every time the shop opens',
        'Rolled from a seed per day',
      ],
      whyThisTechniqueWins: 'Leaving and coming back cannot reroll the stock.',
    },
  ],
  debugging: [
    {
      commonError: 'Every drop is the same item.',
      symptom: 'Ten slimes, ten potions.',
      whyItHappened: 'state.lootSeed is never moved on.',
      repairStrategy: 'state.lootSeed = r.state after rolling.',
    },
    {
      commonError: 'Weights that do not add up the way you think.',
      symptom: 'Shares are off.',
      whyItHappened: 'Shares are weights over the total, whatever it is.',
      repairStrategy: 'Work out w / total for each, as in cell 1.',
    },
  ],
  mastery: {
    targetLevel: 3,
    solveIndependently: 'Write a weighted, seeded loot table with generated items.',
    explainVerbally: 'Explain weights, seeds and expected waits.',
    detectIncorrectApplication: 'Spot an unsaved seed and misread odds.',
    transferToUnfamiliar: 'Design the drops for another game.',
  },
  assessment: {
    questions: [
      {
        id: 'mg12-002-assess-1',
        type: 'choice',
        text: 'Why save state.lootSeed = r.state?',
        options: [
          'So the next roll carries on the sequence',
          'To make drops rarer',
          'To save memory',
          'It is not needed',
        ],
        answer: 'So the next roll carries on the sequence',
        hint: 'Seeds.',
      },
    ],
  },
  quiz: [
    {
      id: 'mg12-002-quiz-1',
      type: 'choice',
      text: 'In cell 1, a roll of 75 picks',
      options: ['potion', 'gold', 'weapon', 'nothing'],
      answer: 'potion',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg12-002-quiz-2',
      type: 'choice',
      text: 'In cell 2, seed 42 twice gives',
      options: ['The same three numbers', 'Different numbers', 'Zeros', 'An error'],
      answer: 'The same three numbers',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg12-002-quiz-3',
      type: 'choice',
      text: 'In cell 3, weapons of the Hero came',
      options: ['75 times in 10,000', '1025 times', 'Never', '800 times'],
      answer: '75 times in 10,000',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg12-002-quiz-4',
      type: 'choice',
      text: 'On average, slimes until the first weapon',
      options: ['10', '1', '100', '4'],
      answer: '10',
      hints: ['The math: 1/p.'],
      reviewSection: 'Math',
    },
    {
      id: 'mg12-002-quiz-5',
      type: 'choice',
      text: 'A Sword of Might\'s bonus',
      options: ['4', '3', '1', '5'],
      answer: '4',
      hints: ['Items made from parts.'],
      reviewSection: 'Intuition — items from parts',
    },
  ],
  checkpoints: [
    {
      id: 'cp-mg12-002-1',
      label: 'Read weighted tables and seeds',
      type: 'read',
    },
    {
      id: 'cp-mg12-002-2',
      label: 'Read generated items and the usable bag',
      type: 'read',
    },
    {
      id: 'cp-mg12-002-3',
      label: 'Run the notebook: choice, seeds and odds',
      type: 'read',
    },
    {
      id: 'cp-mg12-002-4',
      label: 'Complete "Items and loot" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg12-002-5',
      label: 'Work through "Unlucky players"',
      type: 'example',
    },
    {
      id: 'cp-mg12-002-6',
      label: 'Pass the pick() challenge',
      type: 'challenge',
    },
  ],
}
