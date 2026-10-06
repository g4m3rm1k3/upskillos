export default {
  chapter: 'making-games-11',
  order: 6,
  id: 'mg11-006',
  nextLesson: 'mg11-007',
  slug: 'health-bars-and-an-inventory-list',
  title: 'Health Bars and an Inventory List',
  subtitle: 'Show hit points as a bar and the bag as a list, both drawn from state, so they are never out of date.',
  tags: ['game-studio', 'rpg', 'ui', 'hud', 'progress-bar', 'inventory', 'lists'],
  aliases: 'health bar hp bar progress bar experience bar cooldown inventory bag list items hud label wrap rebuild list from data clamp fraction vboxcontainer',
  timeToComplete: 40,
  coreConcept: 'A ProgressBar fills value / maxValue of its width, clamped so it is never less than empty or more than full; the HUD sets value and maxValue from state every frame. The bag is a Panel with a VBoxContainer: each time it opens, its rows are thrown away and one Label is made for each item in state.bag, and the container places them. Both read state and keep nothing of their own, so they can never disagree with it.',
  prerequisites: ['mg11-005'],
  hook: {
    question: 'The hero is hit, drinks a potion, levels up and finds a rope. The health bar and the bag must show all of it, on every map, after loading a save. How do you make sure the screen never shows something that is not true?',
    realWorldContext: 'Health bars, mana bars, experience bars, cooldown rings and inventory grids are in nearly every game. The rule that keeps them honest is the one web apps use too: the screen is drawn from the data, never kept separately.',
  },
  intuition: {
    prose: [
      '**Depth: build it.** The Try it task adds a health bar and a bag to the HUD, and makes the campfire heal.',
      '**A bar is a fraction.** A ProgressBar draws its back, then a filled part value / maxValue of its width. The fraction is clamped to 0..1: an hp of 12 out of 10 fills it and no more, −2 empties it and no less, and a maxValue of 0 shows empty rather than dividing by zero (cell 1). showText writes "7 / 10" on it.',
      '**Read state every frame.** The HUD sets the bar\'s maxValue and value from state.maxHp and state.hp in update(). It does not count hits itself; whatever changes state.hp (a slime, a potion, the campfire, a loaded save) is shown on the next frame. This is the same idea as the gold label in lesson 11.3.',
      '**A list from data.** The bag is a Panel Bag with a VBoxContainer List. I (the inventory action) shows and hides it. Each time it opens, the HUD throws away the old rows (queueFree) and makes a new Label for each item in state.bag; the container places them one under another. Rebuilding is simple and never out of date (cell 2): there is no way for a row to show an item you no longer have.',
      '**How big is a row?** A container must know each child\'s size to place the next. Buttons, Panels and bars have a size; a Label\'s size depends on its text, which is not drawn yet, so the engine estimates it: 0.55 × fontSize per letter across and 1.2 × fontSize per line. With wrapWidth, a long line wraps into as many rows as it needs, so a two-row note pushes the next item down (cell 3).',
      '**The hero waits.** While the bag is open the hero stands still: the HUD\'s busy is true when Bag is showing, as for the pause menu.',
      '**Resting heals.** Now there are hit points, the campfire can do what campfires do: one line, state.hp = state.maxHp, before it saves. The bar shows it on the next frame, because the HUD reads state.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: show a value from state',
        body: 'Step 1. A node in the HUD to show it: a Label, a ProgressBar. Step 2. In the HUD\'s update(), set it from state. Step 3. For a list: on open, free the old rows, then a Label (or Button) per item, added to a container.',
      },
      {
        type: 'warning',
        title: 'Do not keep a second copy',
        body: 'A HUD that counts its own hit points will one day disagree with state, after a save, a potion or a bug. Read state; keep nothing.',
      },
      {
        type: 'insight',
        title: 'Rebuild or update?',
        body: 'Rebuilding a list of 10 rows is nothing; rebuilding 10,000 every frame would be slow. Rebuild when it opens (as here), or update only the rows that changed when lists get large.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Bars, lists and sizes',
        caption: 'The rules the HUD and the containers follow.',
        props: {
          lesson: {
            title: 'Bars, lists and sizes',
            subtitle: 'From state to the screen.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. How full is the bar?\nPredict first: 12 out of 10.',
                startCode: '// A ProgressBar fills value / maxValue of its width, never less than empty or more than full: the fraction is clamped\n// to 0..1. Predict first: what an hp of 12 out of 10 fills.\nconst width = 200\nconst fill = (value, max) => max > 0 ? width * Math.min(1, Math.max(0, value / max)) : 0\nfor (const [hp, max] of [[10, 10], [7, 10], [3, 10], [0, 10], [12, 10], [-2, 10], [5, 0]])\n  console.log(\'hp\', String(hp).padStart(3), \'of\', String(max).padStart(2), \'→ fill\', fill(hp, max), \'px\')',
              },
              {
                type: 'js',
                instruction: '### 2. A list rebuilt from the bag\nPredict first: the rows made in all.',
                startCode: '// The bag is a list rebuilt from state.bag every time it opens: throw the old rows away, make one per item. Simple, and\n// never out of date. Predict first: how many rows are made over the three openings?\nlet made = 0\nfunction open(bag) {\n  const rows = []\n  for (const item of bag) { rows.push(item.name + \': \' + item.note); made++ }\n  return rows.length ? rows : [\'(empty)\']\n}\nconst bag = []\nconsole.log(\'open 1:\', JSON.stringify(open(bag)))\nbag.push({ name: \'Amulet\', note: \'the ranger\\u2019s\' })\nconsole.log(\'open 2:\', JSON.stringify(open(bag)))\nbag.push({ name: \'Rope\', note: \'20 feet\' })\nconsole.log(\'open 3:\', JSON.stringify(open(bag)))\nconsole.log(\'rows made in all:\', made)',
              },
              {
                type: 'js',
                instruction: '### 3. How big is a Label?\nPredict first: the wrapped one\'s height.',
                startCode: '// How big is a Label? The engine cannot measure text before it is drawn, so containers estimate it: 0.55 × fontSize per\n// letter across, 1.2 × fontSize per line. With wrapWidth, a long line wraps into as many rows as it needs.\nconst size = (text, fontSize, wrap = 0) => {\n  const lines = text.split(\'\\n\'), w = (l) => l.length * fontSize * 0.55\n  if (wrap) { const rows = lines.reduce((n, l) => n + Math.max(1, Math.ceil(w(l) / wrap)), 0); return { w: wrap, h: rows * fontSize * 1.2 } }\n  return { w: Math.max(...lines.map(w)), h: lines.length * fontSize * 1.2 }\n}\nfor (const [text, fs, wrap] of [[\'Gold: 60\', 20, 0], [\'Amulet: the ranger\\u2019s, found in the forest\', 16, 0], [\'Amulet: the ranger\\u2019s, found in the forest\', 16, 230]]) {\n  const s = size(text, fs, wrap)\n  console.log(JSON.stringify(text).padEnd(48), \'font\', fs, wrap ? \'wrap \' + wrap : \'no wrap\', \'→\', Math.round(s.w) + \' × \' + Math.round(s.h * 10) / 10)\n}',
              },
              {
                type: 'challenge',
                instruction: '### 4. Challenge: fill()\nThe check tries six bars.',
                startCode: '// Challenge: fill(value, max, width) is how many pixels of a bar are filled: width × value / max, clamped between empty\n// and full, and empty when max is 0 or less.\nfunction fill(value, max, width) {\n  return width * value / max   // your code: clamp it\n}\nconst cases = [[5, 10, 200, 100], [10, 10, 200, 200], [15, 10, 200, 200], [-3, 10, 200, 0], [4, 0, 200, 0], [1, 4, 100, 25]]\nconst bad = cases.find(([v, m, w, want]) => fill(v, m, w) !== want)\nconsole.log(bad ? \'fill(\' + bad.slice(0, 3).join(\', \') + \') should be \' + bad[3] + \', not \' + fill(bad[0], bad[1], bad[2]) + \'.\' : \'✓ Every bar fills right, never past empty or full.\')',
                solutionCode: '// Challenge: fill(value, max, width) is how many pixels of a bar are filled: width × value / max, clamped between empty\n// and full, and empty when max is 0 or less.\nfunction fill(value, max, width) {\n  if (max <= 0) return 0\n  return width * Math.min(1, Math.max(0, value / max))\n}\nconst cases = [[5, 10, 200, 100], [10, 10, 200, 200], [15, 10, 200, 200], [-3, 10, 200, 0], [4, 0, 200, 0], [1, 4, 100, 25]]\nconst bad = cases.find(([v, m, w, want]) => fill(v, m, w) !== want)\nconsole.log(bad ? \'fill(\' + bad.slice(0, 3).join(\', \') + \') should be \' + bad[3] + \', not \' + fill(bad[0], bad[1], bad[2]) + \'.\' : \'✓ Every bar fills right, never past empty or full.\')',
              },
              {
                type: 'markdown',
                instruction: '### 5. The code you wrote, line by line\n\nIn the order of the task\'s three steps.\n\n**Hit points**\n\n```js\n    hp: 10, maxHp: 10,\n    bag: [],                    // items: { name, note }\n```\n\nIn `newGame()`: hit points and their maximum, and an empty bag. Each item will be an object with a name and a note.\n\n```js\nproject.scene(\'scenes/hud.scene\').add(\'ProgressBar\', { name: \'Hp\', position: { x: 16, y: 48 }, size: { x: 200, y: 20 }, value: 10, maxValue: 10, fillColor: \'#e03131\', showText: true })\n```\n\nA ProgressBar draws a back, then a filled part `value / maxValue` of its width (cell 1), in red, with "10 / 10" written on it (`showText`).\n\n```js\n    this.get(\'Hp\').maxValue = state.maxHp;\n    this.get(\'Hp\').value = state.hp;\n```\n\nIn the HUD\'s `update()`: the bar shows `state`, every frame, like the gold label.\n\n```js\n    state.hp = state.maxHp;   // a rest heals you\n```\n\nIn campfire.js, before it saves: resting heals you.\n\n**The bag**\n\n```js\nproject.addAction(\'inventory\', [\'KeyI\'])\nconst hud = project.scene(\'scenes/hud.scene\')\nhud.add(\'Panel\', { name: \'Bag\', position: { x: 680, y: 70 }, size: { x: 260, y: 280 } })\nhud.add(\'Label\', { name: \'Title\', parent: \'Bag\', position: { x: 16, y: 12 }, fontSize: 20, text: \'Bag (I to close)\' })\nhud.add(\'VBoxContainer\', { name: \'List\', parent: \'Bag\', position: { x: 16, y: 48 }, separation: 6 })\n```\n\nAn action on I, and a panel at the right of the screen with a title and an empty list.\n\n```js\n    this.get(\'Bag\').visible = false;\n    if (input.isJustPressed(\'inventory\') && !this.get(\'Pause\').visible) this.toggleBag();\n```\n\nHidden in `ready()`; in `update()`, I toggles it, but not while the pause menu is open (two menus at once would fight over the keys).\n\n```js\n  // The bag: a list rebuilt from state.bag each time it opens. The VBoxContainer places the rows.\n  toggleBag() {\n    const bag = this.get(\'Bag\');\n    bag.visible = !bag.visible;\n    if (!bag.visible) return;\n```\n\nFlip it: shown becomes hidden and hidden becomes shown. If it is now hidden, there is nothing more to do.\n\n```js\n    const list = this.get(\'Bag/List\');\n    for (const row of list.children) row.queueFree();\n```\n\nOpening: throw away the rows from last time. `children` is the list of nodes directly under a node.\n\n```js\n    for (const item of state.bag) {\n      const row = new Label();\n      row.text = item.name + \': \' + item.note;\n      row.fontSize = 16;\n      row.wrapWidth = 230;\n      list.addChild(row);\n```\n\nThen one new Label per item, made in code with `new Label()` (every node type is a class you can make), its text from the item, wrapped at 230 pixels so a long note breaks onto a second line (cell 3), and added to the list with `addChild`; the container places it under the one before (cell 2).\n\n**The hero waits**\n\n```js\n  get busy() { return this.get(\'Pause\').visible || this.get(\'Bag\').visible; }\n```\n\n`||` is "or": the HUD is busy if either menu is showing, and the hero, which already asks `busy`, stands still with no change of its own.',
              },
              {
                type: 'markdown',
                instruction: '### 6. Questions you might have\n\n**Why rebuild the whole list each time instead of adding a row when an item is picked up?** Rebuilding from `state.bag` can never be out of date: any change, from anywhere, shows the next time it opens. Keeping rows in step by hand means every place that changes the bag must also remember the rows.\n\n**Is rebuilding slow?** For tens of items, no. Games with hundreds of slots keep rows and only change their text, which is the same idea with less work each time.\n\n**Why is the bar\'s `maxValue` set every frame too?** Levels in chapter 12 raise `state.maxHp`; the bar keeps up without anyone telling it.\n\n**What if `hp` goes below 0 or above `maxHp`?** The bar clamps its fill to empty or full (cell 1). Keeping `hp` itself in range is the game\'s job: the campfire sets it to the maximum, and chapter 12\'s potion uses `Math.min`.\n\n**Why is the item a `{ name, note }` object and not just a string?** Room to grow: chapter 12 adds `kind` and `bonus` to items without changing what the bag shows.',
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'A health bar and a bag',
        props: {
          task: 'qb-bars',
          lesson: 'mg11-006',
          checkpoint: 'cp-mg11-006-4',
        },
      },
    ],
  },
  math: {
    prose: [
      '**The fill, decoded.** $\\text{fill} = w \\cdot \\operatorname{clamp}(v / m,\\ 0,\\ 1)$, read "the width times the fraction full, kept between empty and full". Here $w$ is the bar\'s width (size.x), $v$ its value and $m$ its maxValue; $\\operatorname{clamp}(x, 0, 1)$ is $\\min(1, \\max(0, x))$, which is exactly the code in cell 1.',
      'A wrapped Label\'s height: each line of $n$ letters is about $0.55 \\cdot f \\cdot n$ pixels wide at font size $f$, so it takes $\\lceil 0.55 f n / W \\rceil$ rows of width $W$, each $1.2 f$ tall. $\\lceil x \\rceil$, "the ceiling", rounds up: a line just over one row long needs two.',
    ],
    equations: [
      {
        label: 'How much of the bar is filled',
        latex: '\\text{fill} = w\\cdot\\min(1,\\ \\max(0,\\ v/m))',
      },
      {
        label: 'Rows a wrapped line takes',
        latex: '\\lceil 0.55\\, f\\, n / W \\rceil',
      },
    ],
    callouts: [],
    visualizations: [],
  },
  rigor: {
    prose: [
      'The estimate of a Label\'s width is close for ordinary text and wrong for very wide or narrow letters (W versus i). It is used only for laying out containers; the text itself is drawn and wrapped by the renderer, which measures it.',
      'Where it goes: 11.7 adds the dialogue box; chapter 12 puts items with stats in the bag.',
    ],
    callouts: [],
    visualizations: [],
  },
  examples: [
    {
      id: 'mg11-006-ex1',
      title: 'A bar',
      difficulty: 'easy',
      problem: 'A 160-pixel bar, value 3, maxValue 12. How many pixels are filled?',
      steps: [
        {
          expression: '160 \\cdot 3/12',
          annotation: 'A quarter.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: '40 pixels.',
    },
    {
      id: 'mg11-006-ex2',
      title: 'Overheal',
      difficulty: 'medium',
      problem: 'A potion sets hp to 14 when maxHp is 10. What does the bar show, and should hp be allowed above maxHp?',
      steps: [
        {
          expression: '\\operatorname{clamp}(1.4) = 1',
          annotation: 'The bar is full.',
          strategyTitle: 'Step 1: the bar',
        },
      ],
      answer: 'A full bar. The bar hides the overheal, so the game should clamp hp too (Math.min(state.maxHp, …)) unless overhealing is a feature.',
    },
    {
      id: 'mg11-006-ex3',
      title: 'A long note',
      difficulty: 'hard',
      problem: 'In cell 3 the wrapped row is 38.4 tall. Where does the next item start, with separation 6?',
      steps: [
        {
          expression: '38.4 + 6',
          annotation: 'Its height plus the gap.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: '44.4 pixels below the long one\'s top.',
    },
  ],
  challenges: [
    {
      id: 'mg11-006-ch1',
      title: 'An experience bar',
      difficulty: 'easy',
      problem: 'Add a blue bar for experience towards the next level.',
      hint: 'Another ProgressBar.',
      answer: 'A ProgressBar Xp in the HUD, fillColor blue, value state.xp and maxValue state.xpToNext, set in update().',
      walkthrough: [],
    },
    {
      id: 'mg11-006-ch2',
      title: 'Use an item',
      difficulty: 'medium',
      problem: 'Make each bag row a Button that uses the item.',
      hint: 'new Button(), connect pressed.',
      answer: 'Rows as Buttons; pressed removes the item from state.bag (and applies it), then rebuilds the list.',
      walkthrough: [],
    },
    {
      id: 'mg11-006-ch3',
      title: 'A bar that drains smoothly',
      difficulty: 'hard',
      problem: 'Make the bar slide down over half a second when hit, instead of jumping.',
      hint: 'Show a value that moves towards state.hp.',
      answer: 'Keep this.shown on the HUD; each frame move it towards state.hp by up to (maxHp × 2) × dt, and set the bar\'s value from it. state stays the truth; only the picture lags.',
      walkthrough: [],
    },
  ],
  semantics: {
    core: [
      {
        symbol: 'ProgressBar',
        meaning: 'Fills value / maxValue of its width.',
      },
      {
        symbol: 'clamp',
        meaning: 'Keep a number between two limits.',
      },
      {
        symbol: 'wrapWidth',
        meaning: 'Wrap a Label\'s text at this many pixels.',
      },
      {
        symbol: 'queueFree()',
        meaning: 'Remove a node (a row) at the end of the frame.',
      },
    ],
    rulesOfThumb: [
      'Draw the screen from state.',
      'Rebuild small lists; update large ones.',
      'Clamp what you show.',
    ],
  },
  misconceptions: [
    {
      falseBelief: 'The bar can go past full.',
      whyStudentsThinkIt: '14 out of 10 should show more.',
      correctionExample: 'Cell 1: it is clamped to full.',
      contrastCase: 'A bar with a bigger maxValue can show more.',
    },
    {
      falseBelief: 'The list must be updated whenever the bag changes.',
      whyStudentsThinkIt: 'It shows the bag.',
      correctionExample: 'It is rebuilt when it opens, from state.bag.',
      contrastCase: 'A list that stays open while things change needs rebuilding then too.',
    },
  ],
  transferPrompts: [
    {
      situation: 'A boss health bar.',
      competingTechniques: [
        'A bar that counts hits',
        'A bar that reads the boss\'s hp',
      ],
      whyThisTechniqueWins: 'It cannot disagree with the boss.',
    },
    {
      situation: 'A shop list.',
      competingTechniques: [
        'Buttons placed by hand',
        'A Button per item, made in a loop into a container',
      ],
      whyThisTechniqueWins: 'The stock can change; the layout follows.',
    },
  ],
  debugging: [
    {
      commonError: 'The bar shows the wrong value after loading.',
      symptom: 'It shows the old hit points.',
      whyItHappened: 'The HUD kept its own copy.',
      repairStrategy: 'Set it from state every frame.',
    },
    {
      commonError: 'Rows pile up.',
      symptom: 'Each opening adds the items again.',
      whyItHappened: 'The old rows were not freed.',
      repairStrategy: 'queueFree every row before adding new ones.',
    },
  ],
  mastery: {
    targetLevel: 3,
    solveIndependently: 'Add a bar and a list that read state.',
    explainVerbally: 'Explain why the HUD keeps nothing of its own.',
    detectIncorrectApplication: 'Spot a HUD with its own copy, or rows that pile up.',
    transferToUnfamiliar: 'Build a shop or a quest log the same way.',
  },
  assessment: {
    questions: [
      {
        id: 'mg11-006-assess-1',
        type: 'choice',
        text: 'A bar with value 12 and maxValue 10 fills',
        options: ['All of it', '120% of it', 'Nothing', '12 pixels'],
        answer: 'All of it',
        hint: 'Cell 1.',
      },
    ],
  },
  quiz: [
    {
      id: 'mg11-006-quiz-1',
      type: 'choice',
      text: 'In cell 1, hp 7 of 10 on a 200-pixel bar fills',
      options: ['140 px', '70 px', '200 px', '7 px'],
      answer: '140 px',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg11-006-quiz-2',
      type: 'choice',
      text: 'A maxValue of 0 fills',
      options: ['0 px', '200 px', 'It errors', 'Half'],
      answer: '0 px',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg11-006-quiz-3',
      type: 'choice',
      text: 'In cell 2, rows made over three openings',
      options: ['3', '6', '2', '1'],
      answer: '3',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg11-006-quiz-4',
      type: 'choice',
      text: 'In cell 3, the wrapped note is',
      options: ['230 × 38.4', '361 × 19.2', '230 × 19.2', '88 × 24'],
      answer: '230 × 38.4',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg11-006-quiz-5',
      type: 'choice',
      text: 'The HUD shows hit points by',
      options: [
        'Setting the bar from state every frame',
        'Counting hits',
        'Being told by the slime',
        'Reading the save',
      ],
      answer: 'Setting the bar from state every frame',
      hints: ['Read state every frame.'],
      reviewSection: 'Intuition — read state',
    },
  ],
  checkpoints: [
    {
      id: 'cp-mg11-006-1',
      label: 'Read how a bar fills',
      type: 'read',
    },
    {
      id: 'cp-mg11-006-2',
      label: 'Read lists from data and Label sizes',
      type: 'read',
    },
    {
      id: 'cp-mg11-006-3',
      label: 'Run the notebook: bars, lists and sizes',
      type: 'read',
    },
    {
      id: 'cp-mg11-006-4',
      label: 'Complete "A health bar and a bag" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg11-006-5',
      label: 'Work through "Overheal"',
      type: 'example',
    },
    {
      id: 'cp-mg11-006-6',
      label: 'Pass the fill() challenge',
      type: 'challenge',
    },
  ],
}
