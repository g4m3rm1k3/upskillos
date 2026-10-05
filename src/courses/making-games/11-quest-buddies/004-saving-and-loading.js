export default {
  chapter: 'making-games-11',
  order: 4,
  id: 'mg11-004',
  nextLesson: 'mg11-005',
  slug: 'saving-and-loading',
  title: 'Saving and Loading',
  subtitle: 'Copy state into a save slot, put it back with Continue, and keep old saves working as the game changes.',
  tags: ['game-studio', 'rpg', 'save', 'load', 'json', 'serialization', 'migration'],
  aliases: 'save game load game continue save slot save point checkpoint autosave json serialize deserialize persistence local storage version migration upgrade old saves',
  timeToComplete: 50,
  coreConcept: 'A save is a copy of state, written as text (JSON) into a named slot that outlasts the game: save.write(\'slot1\'). save.load(\'slot1\') puts it back into the same state object, so every script sees it; then scene.change(state.map) goes there, and the hero stands on state.arriveAt. Only plain values survive JSON: numbers, text, true/false, lists, objects and null. As the game changes, old saves lack new keys, so a save carries a version number and a migration fills in what each older version lacks.',
  prerequisites: ['mg11-003'],
  hook: {
    question: 'You rest at the campfire, close the game, and open it tomorrow. Continue puts you at the campfire with the amulet in your bag. What was written down, where, and how does it come back?',
    realWorldContext: 'Every save system, from a console\'s memory card to a cloud save, does this: turn the game\'s state into bytes, keep them, and turn them back. The hard parts are the same everywhere: saving only what can be saved, and loading saves from older versions of the game.',
  },
  intuition: {
    prose: [
      '**Depth: build it.** The Try it task builds a campfire that saves, a title screen where the game now starts (N for a new game), and Continue (C), shown only when there is a save.',
      '**A title screen.** A game that can be continued needs somewhere to choose: scenes/title.scene, a Node2D with two Labels, the game\'s name and N: new game, becomes the main scene. Its script, title.js, waits for the new_game action (an input action you add, bound to N); then it calls newGame() from game.js, which fills state for a fresh game with state.map the town, and goes there with scene.change(state.map). Starting a new game is now one place, not something each map does.',
      '**A save is a copy.** save.write(\'slot1\') turns all of state into text, JSON, and keeps that text in a slot called slot1. It is a copy: change state afterwards, gold back to 0 and a rope in the bag, and slot1 still holds 60 gold and the amulet (cell 1). Slots have names, so a game can have several: slot1, slot2, an autosave, settings.',
      '**Loading.** save.load(\'slot1\') reads the text back, empties state and fills it with what was saved: the same object, refilled, so every script sees the loaded game (lesson 11.3: never replace state). It returns false if the slot is empty. Then the title screen calls scene.change(state.map), and the hero\'s ready() stands it on state.arriveAt. That is why the campfire sets state.arriveAt = \'Campfire\' just before saving: you wake where you rested.',
      '**A save point.** The campfire is an Area2D in the forest, with a picture (tile 29) and a shape, and beside it a spawn point Spawns/Campfire, a little above it so a loaded game does not wake standing in it. When the hero walks in it sets arriveAt and calls save.write (in lesson 11.6, once there are hit points, it heals you too). Output says Saved to slot "slot1". Saving only at campfires is a design choice; some games save anywhere from the pause menu, some autosave on every door.',
      '**Continue only when there is one.** save.has(\'slot1\') says whether the slot holds anything. The title screen shows Continue only then (in lesson 11.5, a disabled button). Run › Clear saved games empties every slot, to test a first-time player.',
      '**What survives.** JSON knows numbers, text, true and false, null, lists and objects. Cell 2 tries more: a Date comes back as text, a Map and a Set as empty objects, a function and undefined disappear, Infinity becomes null. So keep state plain: a list instead of a Set, a time as a number. A node cannot be saved at all (lesson 11.3).',
      '**Saves outlive versions.** You ship the game; players save; then you add hit points. Their saves have no hp, and your new code reads state.hp: NaN. So a save carries a version number, and loading runs a migration: from version 1, add hp and maxHp; from 2, add the bag; and so on, one step at a time until it is current (cell 3). A save from any older version reaches the newest, and a new save is left alone.',
      '**Where slots live.** In the editor the game runs in a sandboxed frame that cannot use the browser\'s storage, so the editor keeps the slots with the project and gives them to the game when it runs. An exported game keeps them in its own page\'s storage. Either way the game\'s code is the same: save.write, save.read, save.load, save.has, save.remove, save.slots.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: save and continue',
        body: 'Step 1. Decide when to save: a save point, a door, a menu. Step 2. Before saving, set what loading needs: state.map (the hero sets it) and state.arriveAt. Step 3. save.write(\'slot1\'). Step 4. On the title screen: if save.has(\'slot1\'), offer Continue: save.load(\'slot1\'), then scene.change(state.map). Step 5. Keep a version in state, and migrate old saves when you load them.',
      },
      {
        type: 'warning',
        title: 'Only plain data',
        body: 'Cell 2: Dates, Maps, Sets, functions and nodes do not survive a save. Keep state to numbers, text, true/false, lists and plain objects.',
      },
      {
        type: 'insight',
        title: 'Why a copy, not the object',
        body: 'If a slot held state itself, every later change would change the save too, and a save that changes is no save. Text is a snapshot.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Saves, copies and versions',
        caption: 'JSON is what the save slots hold.',
        props: {
          lesson: {
            title: 'Saves, copies and versions',
            subtitle: 'What save.write and save.load do, and old saves.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. A save is a copy\nPredict first: what slot1 holds.',
                startCode: '// A save is a copy: save.write turns state into text (JSON), so later changes do not touch it.\nconst state = { gold: 60, bag: [\'Amulet\'] }\nconst slot1 = JSON.stringify(state)   // what save.write(\'slot1\') keeps\nstate.gold = 0; state.bag.push(\'Rope\')\nconsole.log(\'state now:   \', JSON.stringify(state))\nconsole.log(\'slot1 holds: \', slot1)\n// Loading copies it back into the same state object (save.load), so every script sees it.\nconst loaded = JSON.parse(slot1)\nfor (const k of Object.keys(state)) delete state[k]\nObject.assign(state, loaded)\nconsole.log(\'after load:  \', JSON.stringify(state))',
              },
              {
                type: 'js',
                instruction: '### 2. What survives JSON\nPredict first: the Date and the Map.',
                startCode: '// Only plain values survive JSON. Predict first: what comes back for each?\nconst tests = {\n  number: 42, text: \'Amulet\', list: [1, 2], object: { hp: 7 }, nothing: null,\n  date: new Date(Date.UTC(2026, 9, 5)), map: new Map([[\'a\', 1]]), set: new Set([1, 2]),\n  fn: () => 1, missing: undefined, infinity: Infinity,\n}\nfor (const [name, value] of Object.entries(tests)) {\n  const back = JSON.parse(JSON.stringify({ v: value })).v\n  console.log(name.padEnd(9), \'→\', back === undefined ? \'(gone)\' : JSON.stringify(back))\n}',
              },
              {
                type: 'js',
                instruction: '### 3. Old saves and migrations\nPredict first: the migrated save.',
                startCode: '// Saves outlive versions of your game. A save from version 1 has no hp; version 2\'s code expects it. A migration\n// fills in what an old save lacks, by the save\'s version number, one step at a time.\nconst v1 = { version: 1, map: \'scenes/forest.scene\', gold: 60 }\nconst steps = {\n  1: (s) => ({ ...s, version: 2, hp: 10, maxHp: 10 }),            // version 2 added hit points\n  2: (s) => ({ ...s, version: 3, bag: s.bag ?? [] }),             // version 3 added the bag\n}\nfunction migrate(save) {\n  let s = save\n  while (steps[s.version]) s = steps[s.version](s)\n  return s\n}\nconsole.log(\'version 1 save:\', JSON.stringify(v1))\nconsole.log(\'migrated:      \', JSON.stringify(migrate(v1)))\nconsole.log(\'a new save is left alone:\', JSON.stringify(migrate({ version: 3, map: \'x\', gold: 1, hp: 4, maxHp: 10, bag: [] })))',
              },
              {
                type: 'challenge',
                instruction: '### 4. Challenge: the version 4 step\nThe check migrates two saves.',
                startCode: '// Challenge: version 4 of the game adds quests. Write the migration step from a version 3 save: it gets\n// quests: { amulet: \'not started\' } and version 4, keeping everything else. migrate() runs the steps.\nconst steps = {\n  1: (s) => ({ ...s, version: 2, hp: 10, maxHp: 10 }),\n  2: (s) => ({ ...s, version: 3, bag: s.bag ?? [] }),\n  // 3: your step\n}\nfunction migrate(save) { let s = save; while (steps[s.version]) s = steps[s.version](s); return s }\nconst a = migrate({ version: 1, map: \'scenes/town.scene\', gold: 5 })\nconst b = migrate({ version: 3, map: \'scenes/forest.scene\', gold: 60, hp: 4, maxHp: 10, bag: [\'Rope\'] })\nconst ok = a.version === 4 && a.quests?.amulet === \'not started\' && a.hp === 10 && b.version === 4 && b.gold === 60 && b.bag[0] === \'Rope\' && b.quests?.amulet === \'not started\'\nconsole.log(ok ? \'✓ Old saves of every version reach version 4, keeping what they had.\' : \'A version 1 save became \' + JSON.stringify(a) + \'; it should reach version 4 with quests added and everything else kept.\')',
                solutionCode: '// Challenge: version 4 of the game adds quests. Write the migration step from a version 3 save: it gets\n// quests: { amulet: \'not started\' } and version 4, keeping everything else. migrate() runs the steps.\nconst steps = {\n  1: (s) => ({ ...s, version: 2, hp: 10, maxHp: 10 }),\n  2: (s) => ({ ...s, version: 3, bag: s.bag ?? [] }),\n  3: (s) => ({ ...s, version: 4, quests: s.quests ?? { amulet: \'not started\' } }),\n}\nfunction migrate(save) { let s = save; while (steps[s.version]) s = steps[s.version](s); return s }\nconst a = migrate({ version: 1, map: \'scenes/town.scene\', gold: 5 })\nconst b = migrate({ version: 3, map: \'scenes/forest.scene\', gold: 60, hp: 4, maxHp: 10, bag: [\'Rope\'] })\nconst ok = a.version === 4 && a.quests?.amulet === \'not started\' && a.hp === 10 && b.version === 4 && b.gold === 60 && b.bag[0] === \'Rope\' && b.quests?.amulet === \'not started\'\nconsole.log(ok ? \'✓ Old saves of every version reach version 4, keeping what they had.\' : \'A version 1 save became \' + JSON.stringify(a) + \'; it should reach version 4 with quests added and everything else kept.\')',
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Saving and loading',
        props: {
          task: 'qb-save',
          lesson: 'mg11-004',
          checkpoint: 'cp-mg11-004-4',
        },
      },
    ],
  },
  math: {
    prose: [
      '**Under the hood (optional).** Saving is serialization, $\\text{serialize}: S \\to \\text{text}$, and loading is its inverse, $\\text{parse}: \\text{text} \\to S$. For plain data, $\\text{parse}(\\text{serialize}(s)) = s$: what comes back equals what went in. Cell 2 is the list of values for which that fails.',
      'Migration is composition: with steps $m_1: V_1 \\to V_2$, $m_2: V_2 \\to V_3$, a version 1 save becomes current by $m_2(m_1(s))$. Read it as: apply the first step, then the second. Each step is written once and never changed, because old saves of every version still exist.',
    ],
    equations: [
      {
        label: 'A round trip',
        latex: '\\text{parse}(\\text{serialize}(s)) = s \\quad\\text{for plain data } s',
      },
      {
        label: 'Migrating a version 1 save to version 3',
        latex: 's_3 = m_2(m_1(s_1))',
      },
    ],
    callouts: [],
    visualizations: [],
  },
  rigor: {
    prose: [
      'A save should be self-describing: its version says how to read it. Loading should never trust a save completely: a save from a newer version of the game, or a damaged one, needs a clear message, not a crash.',
      'Where it goes: 11.5 makes the title screen buttons; chapter 12 saves classes, stats and the buddy\'s training.',
    ],
    callouts: [],
    visualizations: [],
  },
  examples: [
    {
      id: 'mg11-004-ex1',
      title: 'Waking at the campfire',
      difficulty: 'easy',
      problem: 'Why does Continue put you at the campfire and not at the forest\'s door?',
      steps: [
        {
          expression: '\\text{arriveAt} = \\text{Campfire}',
          annotation: 'Set just before saving.',
          strategyTitle: 'Step 1: the save',
        },
        {
          expression: '\\text{Spawns/Campfire}',
          annotation: 'The hero stands on it in ready().',
          strategyTitle: 'Step 2: arriving',
        },
      ],
      answer: 'The campfire sets state.arriveAt before saving, and the forest has a spawn point of that name.',
    },
    {
      id: 'mg11-004-ex2',
      title: 'A Set in state',
      difficulty: 'medium',
      problem: 'state.taken is a Set. After a save and a load, what is it, and what breaks?',
      steps: [
        {
          expression: '\\text{Set} \\to \\{\\}',
          annotation: 'Cell 2.',
          strategyTitle: 'Step 1: JSON',
        },
      ],
      answer: 'An empty object: taken.has is not a function, and every coin comes back. Use a list.',
    },
    {
      id: 'mg11-004-ex3',
      title: 'Adding a quest after release',
      difficulty: 'hard',
      problem: 'Version 4 adds quests. A player loads a version 3 save. What happens with and without a migration?',
      steps: [
        {
          expression: '\\text{state.quests} = \\text{undefined}',
          annotation: 'Without: the ranger\'s talk() reads quests.amulet and fails.',
          strategyTitle: 'Step 1: without',
        },
        {
          expression: 'm_3: V_3 \\to V_4',
          annotation: 'With: quests added as not started.',
          strategyTitle: 'Step 2: with',
        },
      ],
      answer: 'Without it the game errors on the first talk; with it the old save gains quests and plays on.',
    },
  ],
  challenges: [
    {
      id: 'mg11-004-ch1',
      title: 'Three slots',
      difficulty: 'easy',
      problem: 'Let the player choose slot 1, 2 or 3.',
      hint: 'The slot name is a string.',
      answer: 'save.write(\'slot\' + n) and save.load(\'slot\' + n); save.slots() lists the ones in use.',
      walkthrough: [],
    },
    {
      id: 'mg11-004-ch2',
      title: 'An autosave',
      difficulty: 'medium',
      problem: 'Save automatically every time you go through a door, without overwriting the campfire save.',
      hint: 'Another slot.',
      answer: 'In Door\'s bodyEntered, after setting arriveAt: save.write(\'auto\'). Continue offers the newer of the two (keep a time in the save).',
      walkthrough: [],
    },
    {
      id: 'mg11-004-ch3',
      title: 'A save from the future',
      difficulty: 'hard',
      problem: 'A player loads a save made by a newer version of the game. What should happen?',
      hint: 'Compare versions.',
      answer: 'If save.version is greater than the game\'s version, do not load it: say so ("This save is from a newer version") instead of guessing.',
      walkthrough: [],
    },
  ],
  semantics: {
    core: [
      {
        symbol: 'save.write(\'slot1\')',
        meaning: 'A copy of all of state, kept in slot1.',
      },
      {
        symbol: 'save.load(\'slot1\')',
        meaning: 'Refill state from slot1; false if it is empty.',
      },
      {
        symbol: 'save.has(\'slot1\')',
        meaning: 'Whether slot1 holds a save.',
      },
      {
        symbol: 'JSON',
        meaning: 'Text that holds plain data: what a slot keeps.',
      },
      {
        symbol: 'migration',
        meaning: 'Steps that bring an old save up to the current version.',
      },
    ],
    rulesOfThumb: [
      'Set arriveAt before saving.',
      'Keep state plain.',
      'Version your saves from the first release.',
      'Never change an old migration step.',
    ],
  },
  misconceptions: [
    {
      falseBelief: 'A save keeps the objects themselves.',
      whyStudentsThinkIt: 'It "saves state".',
      correctionExample: 'Cell 1: a copy, as text; changing state afterwards does not change it.',
      contrastCase: 'state itself is the live object.',
    },
    {
      falseBelief: 'Anything in state can be saved.',
      whyStudentsThinkIt: 'It is all just data.',
      correctionExample: 'Cell 2: Dates, Maps, Sets and functions do not come back as they were.',
      contrastCase: 'Numbers, text, lists and plain objects do.',
    },
  ],
  transferPrompts: [
    {
      situation: 'Cloud saves on another device.',
      competingTechniques: [
        'Send the game\'s objects',
        'Send the JSON text and its version',
      ],
      whyThisTechniqueWins: 'Text travels anywhere; the version says how to read it.',
    },
    {
      situation: 'A web app\'s data changes shape.',
      competingTechniques: [
        'Break old data',
        'Database migrations, one step per version',
      ],
      whyThisTechniqueWins: 'The same idea: every old version can still be read.',
    },
  ],
  debugging: [
    {
      commonError: 'Continue loads the wrong map.',
      symptom: 'You wake in the town after saving in the forest.',
      whyItHappened: 'state.map was not kept up to date.',
      repairStrategy: 'Set state.map = scene.path in the hero\'s ready().',
    },
    {
      commonError: 'Every coin comes back after loading.',
      symptom: 'taken is empty or not a list.',
      whyItHappened: 'It was a Set, which JSON turns into {}.',
      repairStrategy: 'Keep a list.',
    },
    {
      commonError: 'NaN hit points after an update.',
      symptom: 'The bar is empty or wrong with an old save.',
      whyItHappened: 'The old save has no hp.',
      repairStrategy: 'A migration that adds it.',
    },
  ],
  mastery: {
    targetLevel: 3,
    solveIndependently: 'Add a save point and Continue.',
    explainVerbally: 'Explain why a save is a copy and what JSON keeps.',
    detectIncorrectApplication: 'Spot unsavable values in state and missing migrations.',
    transferToUnfamiliar: 'Design the save for another game, versions included.',
  },
  assessment: {
    questions: [
      {
        id: 'mg11-004-assess-1',
        type: 'choice',
        text: 'What does save.load do to state?',
        options: [
          'Empties it and refills the same object',
          'Replaces it with a new object',
          'Merges the save in',
          'Nothing until the scene changes',
        ],
        answer: 'Empties it and refills the same object',
        hint: 'Loading.',
      },
    ],
  },
  quiz: [
    {
      id: 'mg11-004-quiz-1',
      type: 'choice',
      text: 'In cell 1, after changing state, slot1 holds',
      options: [
        '{"gold":60,"bag":["Amulet"]}',
        '{"gold":0,"bag":["Amulet","Rope"]}',
        '{}',
        'Nothing',
      ],
      answer: '{"gold":60,"bag":["Amulet"]}',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg11-004-quiz-2',
      type: 'choice',
      text: 'A Map in state comes back from a save as',
      options: ['{}', 'A Map', 'null', 'A list'],
      answer: '{}',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg11-004-quiz-3',
      type: 'choice',
      text: 'A Date comes back as',
      options: ['Text', 'A Date', 'A number', 'Nothing'],
      answer: 'Text',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg11-004-quiz-4',
      type: 'choice',
      text: 'In cell 3, a version 1 save is migrated to version',
      options: ['3', '2', '1', '4'],
      answer: '3',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg11-004-quiz-5',
      type: 'choice',
      text: 'The campfire sets state.arriveAt before saving so that',
      options: [
        'Continue wakes you at the campfire',
        'The save is smaller',
        'The door works',
        'The HUD updates',
      ],
      answer: 'Continue wakes you at the campfire',
      hints: ['Loading.'],
      reviewSection: 'Intuition — loading',
    },
  ],
  checkpoints: [
    {
      id: 'cp-mg11-004-1',
      label: 'Read what a save is and how loading works',
      type: 'read',
    },
    {
      id: 'cp-mg11-004-2',
      label: 'Read what survives and why saves have versions',
      type: 'read',
    },
    {
      id: 'cp-mg11-004-3',
      label: 'Run the notebook: saves, copies and versions',
      type: 'read',
    },
    {
      id: 'cp-mg11-004-4',
      label: 'Complete "Saving and loading" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg11-004-5',
      label: 'Work through "Adding a quest after release"',
      type: 'example',
    },
    {
      id: 'cp-mg11-004-6',
      label: 'Pass the migration challenge',
      type: 'challenge',
    },
  ],
}
