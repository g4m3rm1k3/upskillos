export default {
  chapter: 'making-games-11',
  order: 1,
  id: 'mg11-001',
  nextLesson: 'mg11-002',
  slug: 'quest-buddies-the-game-you-will-build',
  title: 'Quest Buddies: the Game You Will Build',
  subtitle: 'Play the finished RPG starter, see what it is made of, and plan building it yourself, one feature a lesson.',
  tags: ['game-studio', 'rpg', 'quest-buddies', 'game-design', 'state'],
  aliases: 'rpg role playing game starter template quest buddies maps doors save load menu hud dialogue quest sound how is an rpg built',
  timeToComplete: 30,
  coreConcept: 'A role-playing game is a few systems sharing one record of the game: maps joined by doors, state that remembers (where you are, your hit points, gold, bag and quests), saving that copies the state, menus and a HUD that show it, dialogue that tells the story, quests that move through stages, and sounds. Quest Buddies has one small working example of each. This chapter builds them one at a time; the chapter after adds classes, combat, loot and a buddy that learns.',
  prerequisites: ['mg6-005'],
  hook: {
    question: 'Every RPG you have played, from Pokémon to Skyrim, remembers where you are, what you carry and who you have helped, across dozens of maps and hours of play. What is the smallest game that has all of those parts, and how do they fit together?',
    realWorldContext: 'Studios build RPGs from the same systems this chapter builds: a world split into maps, a game state that a save copies, menus and a HUD, dialogue and quest trackers. Learning them on a small game is how you learn to build, or direct an AI agent to build, a large one.',
  },
  intuition: {
    prose: [
      '**Depth: play and tweak.** This lesson is for playing the starter and changing it. Lessons 11.2 to 11.8 build it; their notebooks and the math sections go as deep as you want.',
      '**Play it first.** The Try it card opens Quest Buddies. Press ▶ Run. The title screen has New game and Continue (greyed out until there is a saved game); the arrow keys and Enter work it, or the mouse. In the town, pick up the coin (10 gold), then walk to the ranger: E: talk appears. Press E: she types out what she says, and asks you to find her amulet. The door in the east wall leads to the forest. The amulet is in the north of the forest; the campfire there heals you and saves the game. Bring the amulet back for 50 gold. Esc pauses; I opens your bag.',
      '**What it is made of.** Two maps (scenes/town.scene and scenes/forest.scene), each a floor and a ring of wall with a gap for a door. A hero (scenes/player.scene) and a HUD (scenes/hud.scene), each its own scene, put into both maps as instances, so both maps have the same ones. A title screen (scenes/title.scene). Scripts: game.js (what a new game starts with), door.js and the two small door scripts, player.js, coin.js, ranger.js, amulet.js, campfire.js, hud.js and title.js. Two sound effects under assets/sounds/, a coin and a whoosh as you arrive on a map, each made from a few numbers.',
      '**State is the spine.** Everything the game must remember, from map to map and in a saved game, is in one object, state: the map you are on, which spawn point to stand on, hit points, gold, the bag and each quest\'s stage. Cell 1 plays the quest as a list of events with no pictures at all: each event changes state, and state is all the game remembers. The scripts do exactly this, with pictures.',
      '**A quest is a state machine.** The amulet quest has four stages, not started, started, found and done, and moves only along its arrows: talking to the ranger starts it, picking up the amulet finds it, talking again finishes it. Cell 2 plays the events in another order: going to the forest first, the amulet is not there to pick up (it only appears while the quest is started), so nothing happens until you have talked to her.',
      '**The plan.** Each lesson adds one feature, and its Try it task starts exactly where the last one ended, so working through 11.2 to 11.8 builds the whole game from an empty project: the maps and the hero, then doors (11.2), state (11.3), saving (11.4), menus (11.5), a health bar and a bag (11.6), dialogue and the quest (11.7), sound (11.8). Nothing is handed to you ready-made: every node and every line of every script is one of the steps, and the finished starter you just played is exactly those steps, in order (a test checks that). Or open the finished starter and read each feature in it. Chapter 12 adds classes and stats, items and loot, combat, a buddy that learns from you, and enemies matched to your skill.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: reading a game you did not write',
        body: 'Step 1. Play it, and note what it remembers (gold, quests, where you are). Step 2. Find the record of that: here, state, filled in by game.js. Step 3. Find the scenes: Files › scenes/. The main scene (★) is where it starts. Step 4. For each thing that happens (a door, a pickup), find the node and its script: what makes it happen, and what it changes in state. Step 5. Change one number and run, to check you understood.',
      },
      {
        type: 'insight',
        title: 'Small and extendable',
        body: 'A starter is the working core of a kind of game, not a finished game: one door, one quest, one save point. Every part is written to be copied: a new door is a three-line script, a new quest is a new key in state.quests and a new branch in a character\'s talk().',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'An RPG as events and state',
        caption: 'Each line is one event and what it changed.',
        props: {
          lesson: {
            title: 'An RPG as events and state',
            subtitle: 'The quest, played without pictures.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. A playthrough as events\nPredict first: the gold at the end.',
                startCode: '// A role-playing game is state, changed by events. This is Quest Buddies\' quest, played as a list of events, with\n// no pictures: each event changes state, and state is all the game remembers.\nconst state = { map: \'town\', gold: 0, bag: [], quest: \'not started\' }\nconst events = [\'talk to the ranger\', \'go through the east door\', \'pick up the amulet\', \'rest at the campfire\', \'go through the west door\', \'talk to the ranger\']\nfunction happen(event) {\n  if (event === \'talk to the ranger\' && state.quest === \'not started\') state.quest = \'started\'\n  else if (event === \'talk to the ranger\' && state.quest === \'found\') { state.quest = \'done\'; state.gold += 50; state.bag = state.bag.filter((i) => i !== \'amulet\') }\n  else if (event === \'go through the east door\') state.map = \'forest\'\n  else if (event === \'go through the west door\') state.map = \'town\'\n  else if (event === \'pick up the amulet\' && state.quest === \'started\') { state.bag.push(\'amulet\'); state.quest = \'found\' }\n  else if (event === \'rest at the campfire\') state.saved = JSON.stringify(state)\n}\nfor (const e of events) {\n  happen(e)\n  console.log(e.padEnd(26), \'→ map\', state.map.padEnd(6), \'quest\', state.quest.padEnd(11), \'gold\', state.gold, \'bag\', JSON.stringify(state.bag))\n}',
              },
              {
                type: 'js',
                instruction: '### 2. The same events, another order\nPredict first: what the amulet does.',
                startCode: '// The same events in another order. Predict first: what happens to the amulet if you go to the forest before\n// talking to the ranger?\nconst state = { map: \'town\', gold: 0, bag: [], quest: \'not started\' }\nconst events = [\'go through the east door\', \'pick up the amulet\', \'go through the west door\', \'talk to the ranger\', \'go through the east door\', \'pick up the amulet\']\nfunction happen(event) {\n  if (event === \'talk to the ranger\' && state.quest === \'not started\') state.quest = \'started\'\n  else if (event === \'talk to the ranger\' && state.quest === \'found\') { state.quest = \'done\'; state.gold += 50 }\n  else if (event === \'go through the east door\') state.map = \'forest\'\n  else if (event === \'go through the west door\') state.map = \'town\'\n  else if (event === \'pick up the amulet\' && state.quest === \'started\') { state.bag.push(\'amulet\'); state.quest = \'found\' }\n  else return \'nothing happens\'\n  return \'ok\'\n}\nfor (const e of events) console.log(e.padEnd(26), \'→\', happen(e).padEnd(15), \'quest\', state.quest, \'bag\', JSON.stringify(state.bag))',
              },
              {
                type: 'challenge',
                instruction: '### 3. Challenge: the quest as a function\nThe check tries six cases.',
                startCode: '// Challenge: the quest as a function. Given the stage it is at and what just happened, return the next stage.\n//   not started --\'talk\'--> started --\'pickup\'--> found --\'talk\'--> done; anything else leaves it where it is.\nfunction quest(stage, event) {\n  return stage   // your code\n}\nconst cases = [[\'not started\', \'talk\', \'started\'], [\'started\', \'pickup\', \'found\'], [\'found\', \'talk\', \'done\'], [\'not started\', \'pickup\', \'not started\'], [\'started\', \'talk\', \'started\'], [\'done\', \'talk\', \'done\']]\nconst wrong = cases.find(([s, e, want]) => quest(s, e) !== want)\nconsole.log(wrong ? \'From "\' + wrong[0] + \'", \' + wrong[1] + \' should give "\' + wrong[2] + \'" but gives "\' + quest(wrong[0], wrong[1]) + \'".\' : \'✓ All six cases right: the quest moves only along its arrows.\')',
                solutionCode: '// Challenge: the quest as a function. Given the stage it is at and what just happened, return the next stage.\n//   not started --\'talk\'--> started --\'pickup\'--> found --\'talk\'--> done; anything else leaves it where it is.\nfunction quest(stage, event) {\n  if (stage === \'not started\' && event === \'talk\') return \'started\'\n  if (stage === \'started\' && event === \'pickup\') return \'found\'\n  if (stage === \'found\' && event === \'talk\') return \'done\'\n  return stage\n}\nconst cases = [[\'not started\', \'talk\', \'started\'], [\'started\', \'pickup\', \'found\'], [\'found\', \'talk\', \'done\'], [\'not started\', \'pickup\', \'not started\'], [\'started\', \'talk\', \'started\'], [\'done\', \'talk\', \'done\']]\nconst wrong = cases.find(([s, e, want]) => quest(s, e) !== want)\nconsole.log(wrong ? \'From "\' + wrong[0] + \'", \' + wrong[1] + \' should give "\' + wrong[2] + \'" but gives "\' + quest(wrong[0], wrong[1]) + \'".\' : \'✓ All six cases right: the quest moves only along its arrows.\')',
              },
              {
                type: 'markdown',
                instruction: '### 4. The code you wrote, line by line\n\nThe tour task changed two lines of the finished game. Each is a value, not code that does something, which is why changing it was safe.\n\n**scripts/game.js**, inside `newGame()`:\n\n```js\n    gold: 25,\n```\n\n`newGame()` empties `state` and fills it with a fresh game\'s values, written as an object: `name: value` pairs separated by commas. `gold: 0` became `gold: 25`. Nothing else in the game needed to change, because everything that shows or spends gold reads `state.gold`: the HUD\'s label every frame, the ranger\'s reward, the coin. One place where a value starts, many places that read it.\n\n**scripts/ranger.js**, inside `talk()`, in the `\'not started\'` branch:\n\n```js\n        \'Hello, traveller. Slimes chased me through the forest, and I dropped my amulet.\',\n```\n\nThe ranger\'s lines are a list (an array) of strings: `[\'first line\', \'second line\']`. `hud.talk(\'Ranger\', lines, done)` shows them one at a time. You replaced the first string. The quotes mark where the text starts and ends; the comma after it separates it from the next line in the list. If your line has an apostrophe in it, like `I\'m`, write it as `I\\\'m` or use the curly `’`, because a plain `\'` would end the string early.',
              },
              {
                type: 'markdown',
                instruction: '### 5. Questions you might have\n\n**Why did changing `gold: 0` to `gold: 25` not change a game I had already saved?** A save is a copy of `state` from when you saved (lesson 11.4). `newGame()` only runs for a new game; Continue loads the copy instead.\n\n**Why is the ranger\'s speech in her script and not in a data file?** For a starter it keeps everything about her in one place. With many characters you would move the lines into a table keyed by quest stage (lesson 11.7\'s cell 2 does exactly that), or into a dialogue tool like Ink or Yarn Spinner.\n\n**Where do I find which script does something?** Click the node in the scene tree (the ranger, the campfire): the Inspector\'s Script section names its script. Or search Files › scripts/ for a word you saw on screen.\n\n**What does "state" mean here: is it the same as a state in Q-learning?** Both mean "the situation, written down". Here it is everything the game remembers; in Q-learning it is what the agent notices. Chapter 12\'s buddy uses both, and they are different objects.',
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Play Quest Buddies, then change it',
        props: {
          task: 'qb-tour',
          lesson: 'mg11-001',
          checkpoint: 'cp-mg11-001-3',
        },
      },
    ],
  },
  math: {
    prose: [
      '**Under the hood (optional).** A game like this is a function from the old state and an event to a new state: $s_{t+1} = f(s_t, e_t)$. Read it as: the state after this moment is what you get by applying what just happened to the state before it. Every script that changes state is a piece of $f$; saving writes down $s_t$; loading puts it back.',
      'A quest is a finite state machine: a set of stages $Q$, a set of events $E$, and a transition function $\\delta: Q \\times E \\to Q$, "from this stage, this event leads to that stage". Most pairs lead nowhere new: $\\delta(q, e) = q$.',
    ],
    equations: [
      {
        label: 'The game, one moment at a time',
        latex: 's_{t+1} = f(s_t,\\ e_t)',
      },
      {
        label: 'A quest\'s transitions',
        latex: '\\delta(\\text{started},\\ \\text{pickup}) = \\text{found}',
      },
    ],
    callouts: [],
    visualizations: [],
  },
  rigor: {
    prose: [
      'Keeping all memory in state makes the game easy to save (copy one object), easy to test (set state, run, read state) and easy to reason about (nothing remembers anything elsewhere). Scenes and nodes are the view of that state; they are built again on every map.',
      'Where it goes: 11.2 builds the maps and doors; 11.3 the state; 11.4 the save.',
    ],
    callouts: [],
    visualizations: [],
  },
  examples: [
    {
      id: 'mg11-001-ex1',
      title: 'What does it remember?',
      difficulty: 'easy',
      problem: 'You take the amulet, leave the forest and come back. Why is the amulet not there again?',
      steps: [
        {
          expression: '\\text{quest} = \\text{found}',
          annotation: 'Taking it moved the quest on.',
          strategyTitle: 'Step 1: state',
        },
        {
          expression: '\\text{ready(): free it unless started}',
          annotation: 'The amulet removes itself unless the quest is looking for it.',
          strategyTitle: 'Step 2: the node reads state',
        },
      ],
      answer: 'The amulet node is made again, reads state.quests.amulet, sees "found" and removes itself.',
    },
    {
      id: 'mg11-001-ex2',
      title: 'Order matters',
      difficulty: 'medium',
      problem: 'In cell 2, why does "pick up the amulet" do nothing the first time?',
      steps: [
        {
          expression: '\\delta(\\text{not started}, \\text{pickup}) = \\text{not started}',
          annotation: 'There is no arrow for it from not started.',
          strategyTitle: 'Step 1: the machine',
        },
      ],
      answer: 'The quest has not started, so the amulet is not there; the event leads nowhere.',
    },
    {
      id: 'mg11-001-ex3',
      title: 'A change in one place',
      difficulty: 'hard',
      problem: 'You want every new game to start with 25 gold. Where do you change it, and why only there?',
      steps: [
        {
          expression: '\\text{newGame()}',
          annotation: 'game.js fills state for a new game.',
          strategyTitle: 'Step 1: where state starts',
        },
      ],
      answer: 'In newGame() in scripts/game.js: it is the one place a new game\'s state is made; everything else reads state.',
    },
  ],
  challenges: [
    {
      id: 'mg11-001-ch1',
      title: 'More gold',
      difficulty: 'easy',
      problem: 'Make the ranger pay 100 gold.',
      hint: 'ranger.js, the found branch.',
      answer: 'state.gold += 100 in the found branch of talk().',
      walkthrough: [],
    },
    {
      id: 'mg11-001-ch2',
      title: 'A second quest stage',
      difficulty: 'medium',
      problem: 'Add a stage "returned" between found and done, where she says thank you before paying. What changes?',
      hint: 'One more arrow.',
      answer: 'found --talk--> returned --talk--> done: one more branch in talk(), and the amulet stays gone in both.',
      walkthrough: [],
    },
    {
      id: 'mg11-001-ch3',
      title: 'Read a feature end to end',
      difficulty: 'hard',
      problem: 'Follow the campfire: which node, which script, what it changes in state, and what reads that later.',
      hint: 'campfire.js, then title.js.',
      answer: 'Forest › Campfire (Area2D), campfire.js: hp to maxHp, arriveAt to Campfire, save.write(\'slot1\'). The title\'s Continue reads it with save.load and goes to state.map, and player.js stands the hero on Spawns/Campfire.',
      walkthrough: [],
    },
  ],
  semantics: {
    core: [
      {
        symbol: 'state',
        meaning: 'Everything the game remembers between maps and in a save.',
      },
      {
        symbol: 'newGame()',
        meaning: 'Fills state for a new game (scripts/game.js).',
      },
      {
        symbol: 'a quest stage',
        meaning: 'Where a quest has got to: not started, started, found, done.',
      },
      {
        symbol: 'an instance',
        meaning: 'A scene used inside another: the hero and the HUD in each map.',
      },
    ],
    rulesOfThumb: [
      'If the game must remember it, it goes in state.',
      'One quest, one key in state.quests.',
      'Read a game by following one thing that happens.',
    ],
  },
  misconceptions: [
    {
      falseBelief: 'Each map remembers what happened on it.',
      whyStudentsThinkIt: 'The amulet stays gone, so the forest must remember.',
      correctionExample: 'The forest is built fresh every time; the amulet reads state and removes itself.',
      contrastCase: 'Within one visit, a node does keep its own values.',
    },
    {
      falseBelief: 'A quest is a list of things to do.',
      whyStudentsThinkIt: 'Quest logs show lists.',
      correctionExample: 'It is a stage that events move along arrows; the log is just how a stage is shown.',
      contrastCase: 'A checklist has no order; a quest\'s stages do.',
    },
  ],
  transferPrompts: [
    {
      situation: 'Adding a second quest.',
      competingTechniques: [
        'A new boolean per step',
        'A new key in state.quests with its own stages',
      ],
      whyThisTechniqueWins: 'One stage per quest says exactly where it is, and saves with everything else.',
    },
    {
      situation: 'Directing an AI agent to add a feature.',
      competingTechniques: [
        '"Make it remember X"',
        '"Add X to state in newGame(), change it in Y\'s script, show it in the HUD"',
      ],
      whyThisTechniqueWins: 'Naming where state starts, changes and is shown leaves nothing to guess.',
    },
  ],
  debugging: [
    {
      commonError: 'Changing a value in a node instead of state.',
      symptom: 'It resets when you change map.',
      whyItHappened: 'Nodes are built again on every map.',
      repairStrategy: 'Keep it in state; have the node read it.',
    },
    {
      commonError: 'Editing the wrong copy of a scene.',
      symptom: 'A change to the HUD shows on one map only.',
      whyItHappened: 'You changed the instance, not hud.scene.',
      repairStrategy: 'Open scenes/hud.scene and change it there.',
    },
  ],
  mastery: {
    targetLevel: 2,
    solveIndependently: 'Play the starter and change a number in it.',
    explainVerbally: 'Explain what state holds and why.',
    detectIncorrectApplication: 'Spot a value kept in a node that should be in state.',
    transferToUnfamiliar: 'Sketch the parts of another RPG as maps, state and events.',
  },
  assessment: {
    questions: [
      {
        id: 'mg11-001-assess-1',
        type: 'choice',
        text: 'Where does a new game\'s state come from?',
        options: ['newGame() in game.js', 'The town scene', 'The save', 'The HUD'],
        answer: 'newGame() in game.js',
        hint: 'What it is made of.',
      },
    ],
  },
  quiz: [
    {
      id: 'mg11-001-quiz-1',
      type: 'choice',
      text: 'In cell 1, how much gold is there at the end?',
      options: ['50', '0', '60', '10'],
      answer: '50',
      hints: ['Cell 1: the ranger pays 50.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg11-001-quiz-2',
      type: 'choice',
      text: 'In cell 2, the first "pick up the amulet"',
      options: [
        'Does nothing: the quest has not started',
        'Finds the amulet',
        'Starts the quest',
        'Saves the game',
      ],
      answer: 'Does nothing: the quest has not started',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg11-001-quiz-3',
      type: 'choice',
      text: 'The hero and the HUD are in both maps because',
      options: [
        'Each is its own scene, put into both as an instance',
        'They are copied by hand',
        'The engine adds them',
        'They are in the title scene',
      ],
      answer: 'Each is its own scene, put into both as an instance',
      hints: ['What it is made of.'],
      reviewSection: 'Intuition — what it is made of',
    },
    {
      id: 'mg11-001-quiz-4',
      type: 'choice',
      text: 'The amulet quest\'s stages, in order',
      options: [
        'not started, started, found, done',
        'started, found, done',
        'found, started, done',
        'not started, found, done',
      ],
      answer: 'not started, started, found, done',
      hints: ['A quest is a state machine.'],
      reviewSection: 'Intuition — a quest',
    },
    {
      id: 'mg11-001-quiz-5',
      type: 'choice',
      text: 'The campfire',
      options: ['Heals you and saves the game', 'Starts the quest', 'Leads to the town', 'Opens the bag'],
      answer: 'Heals you and saves the game',
      hints: ['Play it first.'],
      reviewSection: 'Intuition — play it first',
    },
  ],
  checkpoints: [
    {
      id: 'cp-mg11-001-1',
      label: 'Read what Quest Buddies is made of',
      type: 'read',
    },
    {
      id: 'cp-mg11-001-2',
      label: 'Run the notebook: the quest as events',
      type: 'read',
    },
    {
      id: 'cp-mg11-001-3',
      label: 'Complete "Play Quest Buddies, then change it" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg11-001-4',
      label: 'Work through "What does it remember?"',
      type: 'example',
    },
    {
      id: 'cp-mg11-001-5',
      label: 'Pass the quest-function challenge',
      type: 'challenge',
    },
  ],
}
