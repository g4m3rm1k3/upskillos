export default {
  chapter: 'making-games-11',
  order: 3,
  id: 'mg11-003',
  nextLesson: 'mg11-004',
  slug: 'game-state-that-lasts',
  title: 'Game State That Lasts',
  subtitle: 'Keep what the game must remember in one object that outlives every scene, and let the scenes read it.',
  tags: ['game-studio', 'rpg', 'state', 'global-state', 'autoload', 'references'],
  aliases: 'state global variables autoload singleton remember between scenes persist gold inventory carry over scene change data model reference object mutation world state taken items',
  timeToComplete: 45,
  coreConcept: 'Nodes are thrown away when the scene changes, and everything they hold goes with them. state is one object that lives as long as the game runs: every script sees the same object, and it survives scene.change. Put in it what the game must remember on another map or after loading: the map, hit points, gold, the bag, quests, and what has been taken. Keep out what only matters for a moment, and never put a node in it. Change its fields; never replace the object. Things in a map that must stay changed (a coin taken) write it into state and read it in ready().',
  prerequisites: ['mg11-002'],
  hook: {
    question: 'You pick up a coin in the town, walk to the forest, and the gold counter says 0. The coin is back in the town too. Where did the gold go, and why did the coin come back?',
    realWorldContext: 'Godot calls this an autoload, Unity a persistent object or a ScriptableObject, web apps a store: one place for the data that outlives screens. Every game that has more than one screen needs it.',
  },
  intuition: {
    prose: [
      '**Depth: build it.** The Try it task adds a coin, a gold counter on every map, and a coin that stays taken.',
      '**Nodes do not last.** scene.change throws every node away and builds the new scene\'s nodes fresh, from the scene file. A value kept in a node, this.gold on the hero, is gone with it. Cell 1 shows it: 10 gold on the town\'s hero, 0 on the forest\'s, because they are two different objects.',
      '**state lasts.** state is a global every script can use, an ordinary object that the engine keeps for the whole run. It is not part of any scene, so changing scene does not touch it: with state.gold, the forest sees the 10 gold the town gave. Restarting the game starts it empty again.',
      '**Fill it once.** state starts empty, so a game needs its starting values put in once: newGame() in game.js clears it and fills in gold 0, taken [], the map and where to arrive. The title screen calls it; until there is one, the hero\'s ready() calls it if state.gold is undefined, so running a single map (F6) still works.',
      '**Change its fields, never replace it.** Every script holds the same object. state.gold = 25 changes the one object, and the HUD sees 25. state = { gold: 99 } makes a new object that only that script sees, and the HUD still shows 25 (cell 2). save.load (lesson 11.4) is careful to refill the same object for this reason.',
      '**What belongs in state.** Ask: must the game remember it on another map, or in a saved game? The map, hit points, gold, the bag, each quest\'s stage, what has been taken: yes. Whether the pause menu is open, how many letters of a line have been typed: no, those last a moment and belong on the node. A node itself: never. It is gone when the scene changes, and it points at its parent, which points back at it, so it cannot even be written down (cell 3).',
      '**A world that stays changed.** The coin comes back because the town is built fresh from its scene file, coin and all. So the coin writes into state that it was taken (its name into state.taken) and, in ready(), removes itself if its name is there. The scene file describes the world as it starts; state records what has changed since.',
      '**One HUD for every map.** The gold counter is a Label in hud.scene, whose script sets its text from state.gold every frame. Put hud.scene into each map as an instance, and every map shows the same, current gold.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: something the game remembers',
        body: 'Step 1. Give it a key in state, and its starting value in newGame(). Step 2. Change it where it happens (state.gold += 10). Step 3. Show it by reading state (the HUD, every frame). Step 4. For a thing in a map that must stay changed, record it in state and check it in ready().',
      },
      {
        type: 'warning',
        title: 'state = … breaks it',
        body: 'Assigning a new object to state disconnects the script that did it from everyone else. Change fields: state.gold = 0, not state = { gold: 0 }.',
      },
      {
        type: 'insight',
        title: 'The scene is the start; state is the story',
        body: 'A scene file says how a map looks when nobody has touched it. Everything the player has done since is in state. Loading a map is "build it from the file, then apply state".',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'State that lasts',
        caption: 'Plain JavaScript models of nodes, scene changes and state.',
        props: {
          lesson: {
            title: 'State that lasts',
            subtitle: 'Nodes go; state stays.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. Nodes do not last\nPredict first: the forest\'s gold.',
                startCode: '// Why state? A scene\'s nodes are thrown away when the scene changes, and everything they held goes with them.\n// Here a "node" keeps its own gold; then the scene changes and new nodes are made.\nfunction buildTown() { return { player: { gold: 0 } } }\nfunction buildForest() { return { player: { gold: 0 } } }\nlet nodes = buildTown()\nnodes.player.gold += 10                 // the hero takes a coin\nconsole.log(\'in town, the player node has\', nodes.player.gold, \'gold\')\nnodes = buildForest()                   // scene.change: new nodes\nconsole.log(\'in the forest, the player node has\', nodes.player.gold, \'gold\')\n// Now the same with state: one object that lives as long as the game.\nconst state = { gold: 0 }\nnodes = buildTown(); state.gold += 10\nnodes = buildForest()\nconsole.log(\'with state: in the forest, state.gold is\', state.gold)',
              },
              {
                type: 'js',
                instruction: '### 2. Change fields, never replace\nPredict first: what the HUD sees.',
                startCode: '// Change state\'s fields; never replace state itself. Every script holds the same object; a new object is seen by\n// nobody else. Predict first: what does the HUD show in each case?\nlet state = { gold: 0 }\nconst hudSees = state                  // what another script holds: the same object\nstate.gold = 25\nconsole.log(\'change a field:     HUD sees\', hudSees.gold)\nstate = { gold: 99 }                   // a new object: only this script sees it\nconsole.log(\'replace the object: HUD sees\', hudSees.gold, \' (this script sees\', state.gold + \')\')',
              },
              {
                type: 'js',
                instruction: '### 3. What belongs in state\nPredict first: which ones cannot even be saved.',
                startCode: '// What belongs in state: what the game must remember on another map or after loading. Not what lasts a moment\n// (is a menu open?) and never a node (it is gone when the scene changes, and cannot be saved).\nconst candidates = {\n  map: \'scenes/forest.scene\', hp: 7, gold: 60, bag: [{ name: \'Amulet\' }], quests: { amulet: \'found\' },\n  pauseMenuOpen: true, lettersTyped: 12,\n}\nconst hero = { name: \'Player\' }; hero.parent = { name: \'Forest\', children: [hero] }   // a node points at its parent, and back\ncandidates.heroNode = hero\nconst belongs = (key) => ![\'pauseMenuOpen\', \'lettersTyped\', \'heroNode\'].includes(key)\nfor (const [key, value] of Object.entries(candidates)) {\n  let saveable = true\n  try { JSON.stringify(value) } catch { saveable = false }\n  console.log(key.padEnd(14), belongs(key) ? \'state   \' : \'the node\', saveable ? \'\' : \'(cannot even be saved: it points back at itself)\')\n}',
              },
              {
                type: 'challenge',
                instruction: '### 4. Challenge: a coin pays once\nThe check walks past twice.',
                startCode: '// Challenge: collect(state, name) is a coin being taken: 10 gold and its name written into state.taken, but only the\n// first time. A coin already taken (its name in state.taken) gives nothing. Return true if it was taken now.\nfunction collect(state, name) {\n  state.gold += 10   // your code: only the first time\n  return true\n}\nconst state = { gold: 0, taken: [] }\nconst first = collect(state, \'Coin\'), again = collect(state, \'Coin\'), other = collect(state, \'Coin2\')\nconsole.log(first === true && again === false && other === true && state.gold === 20 && state.taken.join() === \'Coin,Coin2\'\n  ? \'✓ Each coin pays once: 20 gold from two coins, however often you walk past.\'\n  : \'Got gold \' + state.gold + \', taken \' + JSON.stringify(state.taken) + \', returns \' + [first, again, other].join(\', \') + \': each coin should pay 10 once (true, false, true; 20 gold).\')',
                solutionCode: '// Challenge: collect(state, name) is a coin being taken: 10 gold and its name written into state.taken, but only the\n// first time. A coin already taken (its name in state.taken) gives nothing. Return true if it was taken now.\nfunction collect(state, name) {\n  if (state.taken.includes(name)) return false\n  state.gold += 10\n  state.taken.push(name)\n  return true\n}\nconst state = { gold: 0, taken: [] }\nconst first = collect(state, \'Coin\'), again = collect(state, \'Coin\'), other = collect(state, \'Coin2\')\nconsole.log(first === true && again === false && other === true && state.gold === 20 && state.taken.join() === \'Coin,Coin2\'\n  ? \'✓ Each coin pays once: 20 gold from two coins, however often you walk past.\'\n  : \'Got gold \' + state.gold + \', taken \' + JSON.stringify(state.taken) + \', returns \' + [first, again, other].join(\', \') + \': each coin should pay 10 once (true, false, true; 20 gold).\')',
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Game state that lasts',
        props: {
          task: 'qb-state',
          lesson: 'mg11-003',
          checkpoint: 'cp-mg11-003-4',
        },
      },
    ],
  },
  math: {
    prose: [
      '**Under the hood (optional).** In JavaScript an object is reached by a reference: a variable holds the way to the object, not the object. $a = b$ copies the reference, so both reach one object; changing $a.\\text{gold}$ is seen through $b$. Assigning $a = \\{\\ldots\\}$ points $a$ at a new object and leaves $b$ where it was. That is all of cell 2.',
      'A map as you see it is a function of its file and the state: $\\text{map} = \\text{build}(\\text{file}) \\text{ then } \\text{apply}(s)$. The file never changes while you play.',
    ],
    equations: [
      {
        label: 'What you see on a map',
        latex: '\\text{view} = \\text{apply}(\\text{build}(\\text{scene file}),\\ s)',
      },
    ],
    callouts: [],
    visualizations: [],
  },
  rigor: {
    prose: [
      'A single shared state is simple, and its cost is that any script can change anything. Keep it plain data, change it in few places (the coin, the door, the campfire), and read it everywhere. Lesson 11.4 depends on it being plain data: a save is a copy of it.',
      'Where it goes: 11.4 saves it; 11.6 shows it with a bar and a list.',
    ],
    callouts: [],
    visualizations: [],
  },
  examples: [
    {
      id: 'mg11-003-ex1',
      title: 'Where does it go?',
      difficulty: 'easy',
      problem: 'Hit points, the pause menu being open, the ranger\'s quest stage, the hero node. Which go in state?',
      steps: [
        {
          expression: '\\text{remembered on another map?}',
          annotation: 'The test.',
          strategyTitle: 'Step 1: ask',
        },
      ],
      answer: 'Hit points and the quest stage. The pause menu lasts a moment (the HUD node); the hero node never goes in state.',
    },
    {
      id: 'mg11-003-ex2',
      title: 'The coin that came back',
      difficulty: 'medium',
      problem: 'Why does the coin come back, and what fixes it?',
      steps: [
        {
          expression: '\\text{build(town.scene)}',
          annotation: 'The file still has the coin.',
          strategyTitle: 'Step 1: the file',
        },
        {
          expression: '\\text{taken.includes(name)} \\Rightarrow \\text{free}',
          annotation: 'Apply state in ready().',
          strategyTitle: 'Step 2: apply state',
        },
      ],
      answer: 'The town is rebuilt from its file; record the coin in state.taken and remove it in ready() if it is there.',
    },
    {
      id: 'mg11-003-ex3',
      title: 'Replacing state',
      difficulty: 'hard',
      problem: 'A script does state = { gold: 0 } to reset. What goes wrong?',
      steps: [
        {
          expression: '\\text{a new object}',
          annotation: 'Only this script sees it.',
          strategyTitle: 'Step 1: references',
        },
      ],
      answer: 'Every other script keeps the old object: the HUD shows the old gold, the save saves the old state. Clear and refill the same object, as newGame() does.',
    },
  ],
  challenges: [
    {
      id: 'mg11-003-ch1',
      title: 'Gems',
      difficulty: 'easy',
      problem: 'Add gems: a second counter that lasts between maps.',
      hint: 'newGame(), the pickup, the HUD.',
      answer: 'gems: 0 in newGame(), state.gems += 1 in the gem\'s script, a Label in hud.scene set from state.gems.',
      walkthrough: [],
    },
    {
      id: 'mg11-003-ch2',
      title: 'A lever that stays pulled',
      difficulty: 'medium',
      problem: 'A lever in the forest opens a gate in the town.',
      hint: 'One key, read in two places.',
      answer: 'The lever sets state.gateOpen = true; the town\'s gate reads it in ready() and removes its wall.',
      walkthrough: [],
    },
    {
      id: 'mg11-003-ch3',
      title: 'Names that clash',
      difficulty: 'hard',
      problem: 'Two maps each have a node called Coin. What breaks with state.taken, and what fixes it?',
      hint: 'Make the name unique.',
      answer: 'Taking one removes both. Record the map too: state.taken.push(scene.path + \':\' + this.name).',
      walkthrough: [],
    },
  ],
  semantics: {
    core: [
      {
        symbol: 'state',
        meaning: 'The game\'s own data: one object, kept across scene changes.',
      },
      {
        symbol: 'newGame()',
        meaning: 'Clears state and fills it with a new game\'s values.',
      },
      {
        symbol: 'state.taken',
        meaning: 'What has been picked up, so it does not come back.',
      },
      {
        symbol: 'reference',
        meaning: 'What a variable holds for an object: the way to it, not a copy.',
      },
    ],
    rulesOfThumb: [
      'Remembered on another map or in a save: state.',
      'A moment or a node: not state.',
      'Change fields; never replace state.',
      'The scene file is the start; state is what changed.',
    ],
  },
  misconceptions: [
    {
      falseBelief: 'A variable on the hero keeps its value between maps.',
      whyStudentsThinkIt: 'It is the same hero.',
      correctionExample: 'Cell 1: each map builds its own hero.',
      contrastCase: 'state is not part of any scene.',
    },
    {
      falseBelief: 'state = {…} resets the game.',
      whyStudentsThinkIt: 'It looks like a reset.',
      correctionExample: 'Cell 2: other scripts keep the old object.',
      contrastCase: 'newGame() clears and refills the same object.',
    },
  ],
  transferPrompts: [
    {
      situation: 'A settings screen (volume, controls).',
      competingTechniques: [
        'Keep them on the menu node',
        'Keep them in state (or their own save slot)',
      ],
      whyThisTechniqueWins: 'Every scene can read them, and they can be saved.',
    },
    {
      situation: 'An open-world game with thousands of changes.',
      competingTechniques: [
        'A boolean per thing',
        'A set of changed things by id, per map',
      ],
      whyThisTechniqueWins: 'Only what changed is stored; the files hold the rest.',
    },
  ],
  debugging: [
    {
      commonError: 'state.gold is undefined.',
      symptom: 'The HUD shows "Gold: undefined"; adding gives NaN.',
      whyItHappened: 'Nothing filled state: the map was run on its own.',
      repairStrategy: 'Call newGame() when state is empty (the hero\'s ready()).',
    },
    {
      commonError: 'A node stored in state.',
      symptom: 'Errors after a scene change; the save fails.',
      whyItHappened: 'The node was freed, and nodes cannot be written as JSON.',
      repairStrategy: 'Store its name or its data, never the node.',
    },
  ],
  mastery: {
    targetLevel: 3,
    solveIndependently: 'Add a value that lasts between maps and show it on every map.',
    explainVerbally: 'Explain why nodes forget and state does not.',
    detectIncorrectApplication: 'Spot state being replaced, or a node in state.',
    transferToUnfamiliar: 'Decide what goes in state for a new game.',
  },
  assessment: {
    questions: [
      {
        id: 'mg11-003-assess-1',
        type: 'choice',
        text: 'Why does a coin come back when you return?',
        options: [
          'The map is rebuilt from its file',
          'state forgets',
          'The coin respawns on a timer',
          'The save reloads',
        ],
        answer: 'The map is rebuilt from its file',
        hint: 'A world that stays changed.',
      },
    ],
  },
  quiz: [
    {
      id: 'mg11-003-quiz-1',
      type: 'choice',
      text: 'In cell 1, the forest\'s player node has',
      options: ['0 gold', '10 gold', 'undefined', '20 gold'],
      answer: '0 gold',
      hints: ['Cell 1: a new node.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg11-003-quiz-2',
      type: 'choice',
      text: 'In cell 2, after state = { gold: 99 }, the HUD sees',
      options: ['25', '99', '0', 'undefined'],
      answer: '25',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg11-003-quiz-3',
      type: 'choice',
      text: 'Which cannot even be written as JSON?',
      options: ['heroNode', 'bag', 'quests', 'gold'],
      answer: 'heroNode',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg11-003-quiz-4',
      type: 'choice',
      text: 'pauseMenuOpen belongs',
      options: ['On the node', 'In state', 'In the save', 'In the scene file'],
      answer: 'On the node',
      hints: ['What belongs in state.'],
      reviewSection: 'Intuition — what belongs',
    },
    {
      id: 'mg11-003-quiz-5',
      type: 'choice',
      text: 'A coin stays taken because',
      options: [
        'Its name is in state.taken and ready() checks it',
        'The scene file is changed',
        'It is hidden',
        'The engine remembers',
      ],
      answer: 'Its name is in state.taken and ready() checks it',
      hints: ['A world that stays changed.'],
      reviewSection: 'Intuition — a world that stays changed',
    },
  ],
  checkpoints: [
    {
      id: 'cp-mg11-003-1',
      label: 'Read why nodes forget and state does not',
      type: 'read',
    },
    {
      id: 'cp-mg11-003-2',
      label: 'Read what belongs in state',
      type: 'read',
    },
    {
      id: 'cp-mg11-003-3',
      label: 'Run the notebook: state that lasts',
      type: 'read',
    },
    {
      id: 'cp-mg11-003-4',
      label: 'Complete "Game state that lasts" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg11-003-5',
      label: 'Work through "Replacing state"',
      type: 'example',
    },
    {
      id: 'cp-mg11-003-6',
      label: 'Pass the coin challenge',
      type: 'challenge',
    },
  ],
}
