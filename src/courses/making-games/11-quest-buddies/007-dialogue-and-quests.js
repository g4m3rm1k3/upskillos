export default {
  chapter: 'making-games-11',
  order: 7,
  id: 'mg11-007',
  nextLesson: 'mg11-008',
  slug: 'dialogue-and-quests',
  title: 'Dialogue and Quests',
  subtitle: 'A dialogue box that types its lines out, a quest as a state machine, and branching conversations as a graph.',
  tags: ['game-studio', 'rpg', 'dialogue', 'quests', 'state-machine', 'typewriter', 'npc'],
  aliases: 'dialogue box conversation npc talk typewriter text visible characters quest log quest stages state machine branching dialogue tree choices story narrative interact press e',
  timeToComplete: 55,
  coreConcept: 'A conversation is a list of lines shown one at a time in a Panel: the HUD\'s talk(name, lines, done) shows the box and types each line out by raising the Label\'s visibleCharacters at 40 letters a second (−1 once it is all shown). E finishes a line that is still typing, then moves to the next, and after the last hides the box and calls done(). A quest is a state machine: a stage in state.quests and the arrows events move it along; the character\'s talk() says different things at each stage, and items appear only at the stages that need them. Branching dialogue is a graph of lines and choices.',
  prerequisites: ['mg11-006'],
  hook: {
    question: 'The ranger says one thing before you help, another while you search, and thanks you after. Her words type out letter by letter, and E skips ahead. What is the smallest set of parts that does all that, and could it grow into a story with choices?',
    realWorldContext: 'Dialogue systems in RPGs (Undertale, Stardew Valley, Mass Effect) are built from these parts: a text box with a typewriter, a list or graph of lines, and quest stages that decide which lines play. Tools like Ink and Yarn Spinner are this, with a script language on top.',
  },
  intuition: {
    prose: [
      '**Depth: build it.** The Try it task builds the dialogue box and writes talk() and the typewriter; then E; then the ranger, the amulet and the quest.',
      '**The box.** A Panel Dialogue in the HUD, with a Label Name (who is talking) and a Label Text (wrapWidth set so long lines wrap). It is hidden until someone talks. Two more Labels sit at the HUD\'s top level: Message, for news like New quest, and Hint, for what a key would do here, like E: talk. The HUD gets a method for each, say(text) and hint(text), so other scripts never need to know the labels\' paths. And a new input action, interact, on E and Space.',
      '**talk(name, lines, done).** The HUD keeps the lines still to say, shows the box, and starts the first. The HUD is busy while lines remain, so the hero stands still. Every frame it types: shown grows by 40 × dt, and Text.visibleCharacters is set to its whole part, or −1 once the whole line is there. A 78-letter line takes 1.95 s (cell 1).',
      '**E moves it on.** If the line is still typing, E shows it all at once (players read faster than 40 letters a second). If it is all shown, E goes to the next line. After the last line, the box hides and done() runs: that is where the quest moves on. One detail: the E that opened the conversation must not also skip its first line, so the HUD remembers the frame it opened on and ignores E that frame.',
      '**The words wrap as if all shown.** visibleCharacters shows the first letters of the text but wraps it as if all of it were there, so a word does not start on one line and jump to the next as it appears.',
      '**A quest is a state machine.** The amulet quest\'s stage, state.quests.amulet, is one of not started, started, found and done. Events move it along arrows: talk moves not started to started, picking up the amulet moves started to found, talk moves found to done (with 50 gold). Anything else changes nothing (cell 2). The ranger\'s talk() picks her lines by the stage; the amulet appears only while the quest is started (it frees itself in ready() otherwise). Because the stage is in state, it lasts across maps and saves.',
      '**Someone to talk to.** The ranger is an Area2D in the town at (168, 72), with her picture (tile 112) and a circle shape 40 pixels across, much bigger than she is, so you can talk from a step away. When the hero walks into the circle, her bodyEntered sets the hero\'s near to her and shows the hint E: talk; bodyExited clears both, but only if near is still her (you may already have walked up to someone else). The hero\'s update() does the rest: if someone is near, the HUD is not busy and interact was just pressed, call near.talk(). The hero does not know who the ranger is, only that whoever is near has a talk(); any character with a talk() works the same way.',
      '**A table instead of ifs.** Cell 2 writes the machine as a table, stage → event → next stage, and drives the ranger\'s words from another table. With many quests, tables are easier to read and check than chains of if.',
      '**Branching.** Choices make dialogue a graph: each line names the lines its choices lead to (cell 3). The same box shows it, with Buttons in a VBoxContainer for the choices (lesson 11.5); the choice made can set a quest stage or a flag in state, so the world remembers what you said.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: a character who talks',
        body: 'Step 1. An Area2D with a big shape around the character: bodyEntered sets player.near = this (and a hint), bodyExited clears it. Step 2. The player\'s update(): E with someone near, and not busy → near.talk(). Step 3. talk(): choose lines by the quest\'s stage in state; call the HUD\'s talk(name, lines, done), and in done move the stage on.',
      },
      {
        type: 'warning',
        title: 'One key, two meanings',
        body: 'E opens a conversation and E moves it on. Without remembering the frame it opened, the same press does both, and the first line is skipped.',
      },
      {
        type: 'insight',
        title: 'Content as data',
        body: 'Lines, stages and choices are data: lists and tables. Writers can change them without touching the code that shows them, and a quest log can read the same tables.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Dialogue and quests',
        caption: 'Plain JavaScript models of the HUD\'s typewriter and the quest.',
        props: {
          lesson: {
            title: 'Dialogue and quests',
            subtitle: 'The typewriter, the machine, and choices.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. The typewriter\nPredict first: the second line\'s time.',
                startCode: '// The typewriter: after t seconds at 40 letters a second, floor(40 t) letters show, never more than the line has.\n// Predict first: how long does the ranger\'s second line take to type?\nconst lines = [\'You there! I lost my amulet in the forest last night, running from the slimes.\', \'The forest is through the door to the east. Bring it back and I will pay you well.\']\nconst shown = (line, t) => Math.min(line.length, Math.floor(40 * t))\nfor (const t of [0.1, 0.5, 1, 2]) console.log(\'t =\', t, \'s: \', shown(lines[0], t), \'of\', lines[0].length, \'letters\')\nfor (const line of lines) console.log(line.length + \' letters take\', (line.length / 40).toFixed(2), \'s\')',
              },
              {
                type: 'js',
                instruction: '### 2. A quest as a table\nPredict first: which events change nothing.',
                startCode: '// A quest as a table: for each stage, which event leads where. Anything not in the table changes nothing. One table can\n// drive the ranger\'s words, the amulet\'s appearing and the quest log.\nconst QUEST = {\n  \'not started\': { talk: \'started\' },\n  \'started\':     { pickup: \'found\' },\n  \'found\':       { talk: \'done\' },\n  \'done\':        {},\n}\nconst SAYS = { \'not started\': \'I lost my amulet…\', \'started\': \'No luck yet?\', \'found\': \'My amulet! Here, take this.\', \'done\': \'The forest is quiet again.\' }\nlet stage = \'not started\'\nfor (const e of [\'pickup\', \'talk\', \'talk\', \'pickup\', \'pickup\', \'talk\', \'talk\']) {\n  const before = stage\n  stage = QUEST[stage][e] ?? stage\n  console.log(e.padEnd(7), before.padEnd(12), \'→\', stage.padEnd(12), before === stage ? \'(no arrow)\' : \'\', e === \'talk\' ? \'  she says: \' + SAYS[before] : \'\')\n}',
              },
              {
                type: 'js',
                instruction: '### 3. Branching dialogue\nPredict first: choose 2 then 2.',
                startCode: '// Branching dialogue is a graph too: each line names the choices that follow it. Choosing walks the graph.\nconst TREE = {\n  start: { text: \'You there! Can you help me?\', choices: [[\'Of course.\', \'agree\'], [\'What is in it for me?\', \'pay\']] },\n  pay:   { text: \'Fifty gold, if you find my amulet.\', choices: [[\'Deal.\', \'agree\'], [\'No thanks.\', \'leave\']] },\n  agree: { text: \'Thank you! It is in the forest, to the east.\', choices: [] },\n  leave: { text: \'Then good day.\', choices: [] },\n}\nfunction play(choices) {\n  let at = \'start\', out = []\n  for (;;) {\n    const node = TREE[at]\n    out.push(node.text)\n    if (!node.choices.length) return out.join(\' / \')\n    at = node.choices[choices.shift() ?? 0][1]\n  }\n}\nconsole.log(\'choose 1:      \', play([0]))\nconsole.log(\'choose 2 then 1:\', play([1, 0]))\nconsole.log(\'choose 2 then 2:\', play([1, 1]))',
              },
              {
                type: 'challenge',
                instruction: '### 4. Challenge: visible()\nThe check tries six moments.',
                startCode: '// Challenge: visible(line, t) is what the dialogue box sets visibleCharacters to, t seconds into a line at 40 letters a\n// second: −1 once the whole line is showing, otherwise how many letters show (whole letters only).\nfunction visible(line, t) {\n  return Math.floor(40 * t)   // your code\n}\nconst line = \'No luck yet? Look near the north side of the forest.\'   // 52 letters\nconst cases = [[0, 0], [0.1, 4], [0.33, 13], [1.3, -1], [1.29, 51], [5, -1]]\nconst bad = cases.find(([t, want]) => visible(line, t) !== want)\nconsole.log(bad ? \'At t = \' + bad[0] + \' s it should be \' + bad[1] + \', not \' + visible(line, bad[0]) + \'.\' : \'✓ The typewriter shows the right letters, and −1 once the line is all there.\')',
                solutionCode: '// Challenge: visible(line, t) is what the dialogue box sets visibleCharacters to, t seconds into a line at 40 letters a\n// second: −1 once the whole line is showing, otherwise how many letters show (whole letters only).\nfunction visible(line, t) {\n  const n = 40 * t\n  return n >= line.length ? -1 : Math.floor(n)\n}\nconst line = \'No luck yet? Look near the north side of the forest.\'   // 52 letters\nconst cases = [[0, 0], [0.1, 4], [0.33, 13], [1.3, -1], [1.29, 51], [5, -1]]\nconst bad = cases.find(([t, want]) => visible(line, t) !== want)\nconsole.log(bad ? \'At t = \' + bad[0] + \' s it should be \' + bad[1] + \', not \' + visible(line, bad[0]) + \'.\' : \'✓ The typewriter shows the right letters, and −1 once the line is all there.\')',
              },
              {
                type: 'markdown',
                instruction: '### 5. The code you wrote, line by line\n\nIn the order of the task\'s three steps.\n\n**The dialogue box**\n\n```js\nproject.addAction(\'interact\', [\'KeyE\', \'Space\'])\n```\n\nOne action, two keys: E or Space both talk and read on.\n\n```js\nconst hud = project.scene(\'scenes/hud.scene\')\nhud.add(\'Panel\', { name: \'Dialogue\', position: { x: 80, y: 370 }, size: { x: 800, y: 150 }, visible: false })\nhud.add(\'Label\', { name: \'Name\', parent: \'Dialogue\', position: { x: 20, y: 12 }, fontSize: 20, color: \'#ffd43b\', text: \'Name\' })\nhud.add(\'Label\', { name: \'Text\', parent: \'Dialogue\', position: { x: 20, y: 44 }, fontSize: 22, wrapWidth: 760, text: \'\' })\n```\n\nA wide box along the bottom of the screen, hidden until someone talks, with a label for who is talking and one for what they say, wrapped to the box\'s width (760 = 800 less 20 each side).\n\n```js\nhud.add(\'Label\', { name: \'Message\', position: { x: 360, y: 16 }, fontSize: 24, text: \'\' })\nhud.add(\'Label\', { name: \'Hint\', position: { x: 420, y: 330 }, fontSize: 18, color: \'#c5f6fa\', text: \'\' })\n```\n\nTwo labels outside the box: news at the top middle, and a hint just above the box.\n\n**scripts/hud.js**\n\n```js\n  lines = [];      // what is left to say\n  shown = 0;       // letters of the current line shown so far\n  done = null;     // what to run when the conversation ends\n```\n\nThree fields for a conversation. `null` means "nothing here yet".\n\n```js\n  get busy() { return this.lines.length > 0 || this.get(\'Pause\').visible || this.get(\'Bag\').visible; }\n```\n\nWhile there are lines left to say, the HUD is busy, so the hero stands still.\n\n```js\n    this.get(\'Dialogue\').visible = false;\n```\n\nIn `ready()`: hidden at the start (the node is already hidden; this makes sure, whatever the scene file says).\n\n```js\n    if (this.lines.length) { this.typewrite(dt); return; }\n```\n\nIn `update()`, after the bars: during a conversation, type and handle E, and skip the rest (no bag or pause while talking).\n\n```js\n  say(text) { this.get(\'Message\').text = text; }\n  hint(text) { this.get(\'Hint\').text = text; }\n```\n\nTwo small methods so other scripts can say "show this" without knowing the labels\' paths. If the HUD is rearranged, only these change.\n\n```js\n  talk(name, lines, done = null) {\n    this.get(\'Dialogue/Name\').text = name;\n    this.lines = [...lines];\n    this.done = done;\n    this.startLine();\n    this.get(\'Dialogue\').visible = true;\n    this.openedOn = time.frame;   // the key press that opened it must not also skip the first line\n```\n\nStarting a conversation. `done = null` gives the parameter a default, so `talk(name, lines)` works without one. `[...lines]` makes a copy of the list (the `...` spreads its items into a new list), because the HUD will remove lines as it goes and must not empty the caller\'s list. `time.frame` counts frames since the game started; the frame that opened the conversation is remembered.\n\n```js\n  startLine() {\n    this.get(\'Dialogue/Text\').text = this.lines[0];\n    this.shown = 0;\n    this.get(\'Dialogue/Text\').visibleCharacters = 0;\n```\n\nA line starts with none of its letters showing. `lines[0]` is the first line still to say.\n\n```js\n  typewrite(dt) {\n    const text = this.get(\'Dialogue/Text\');\n    this.shown = Math.min(text.totalCharacters, this.shown + 40 * dt);   // 40 letters a second\n    text.visibleCharacters = this.shown >= text.totalCharacters ? -1 : Math.floor(this.shown);\n```\n\nEach frame, 40 × dt more letters (two thirds of a letter at 60 frames a second), but never more than the line has (`Math.min`). `visibleCharacters` shows that many letters, as a whole number (`Math.floor`), or −1, meaning all of them, once the line is done. `a ? b : c` is "if a then b, else c".\n\n```js\n    if (!input.isJustPressed(\'interact\') || time.frame === this.openedOn) return;\n```\n\nStep 2 adds E. Nothing more happens unless E was just pressed, and not on the very frame the conversation opened.\n\n```js\n    if (this.shown < text.totalCharacters) { this.shown = text.totalCharacters; text.visibleCharacters = -1; return; }   // finish the line\n    this.lines.shift();\n    if (this.lines.length) { this.startLine(); return; }   // the next line\n```\n\nE while typing shows the whole line at once. E on a finished line removes it (`shift()` takes the first item off a list) and starts the next, if there is one.\n\n```js\n    this.get(\'Dialogue\').visible = false;                  // the end\n    const done = this.done;\n    this.done = null;\n    if (done) done();\n```\n\nAfter the last line: hide the box, and run `done` if one was given. It is cleared before it runs, so if `done` starts another conversation, that one\'s `done` is not wiped out.\n\n**The quest**\n\n```js\n    quests: { amulet: \'not started\' },   // not started → started → found → done\n```\n\nIn `newGame()`: one key per quest, holding its stage.\n\n```js\n  near = null;   // someone close enough to talk to (they set this when you walk up)\n  update(dt) {\n    if (this.near && !scene.get(\'HUD\').busy && input.isJustPressed(\'interact\')) this.near.talk();\n```\n\nThe hero: a field for whoever is near, and in `update()`, E with someone near and no menu open calls their `talk()`.\n\n```js\nconst town = project.scene(\'scenes/town.scene\')\ntown.add(\'Area2D\', { name: \'Ranger\', position: { x: 168, y: 72 }, script: \'scripts/ranger.js\' })\ntown.add(\'Sprite2D\', { name: \'Sprite\', parent: \'Ranger\', texture: \'assets/tiny-dungeon/tiles/tile_0112.png\' })\ntown.add(\'CollisionShape2D\', { name: \'Shape\', parent: \'Ranger\', shape: \'circle\', size: { x: 40, y: 40 } })\n```\n\nThe ranger: an area with a picture (tile 112) and a circle 40 pixels across, much bigger than she is, so "near" starts a step away.\n\n**scripts/ranger.js**\n\n```js\n// The ranger gives the quest. What she says depends on where the quest has got to: a state machine (lesson 11.7).\n//   not started --talk--> started --pick up the amulet--> found --talk--> done\nexport default class Ranger extends Area2D {\n  bodyEntered(body) {\n    if (body.name !== \'Player\') return;\n    body.near = this;\n    scene.get(\'HUD\').hint(\'E: talk\');\n```\n\nWalking into her circle: tell the hero she is near, and show the hint.\n\n```js\n  bodyExited(body) {\n    if (body.name !== \'Player\' || body.near !== this) return;\n    body.near = null;\n    scene.get(\'HUD\').hint(\'\');\n```\n\nWalking out: clear both, but only if the hero\'s `near` is still her; if you have already walked up to someone else, leave theirs alone.\n\n```js\n  talk() {\n    const hud = scene.get(\'HUD\'), quest = state.quests;\n    if (quest.amulet === \'not started\') {\n      hud.talk(\'Ranger\', [\n        \'You there! I lost my amulet in the forest last night, running from the slimes.\',\n        \'The forest is through the door to the east. Bring it back and I will pay you well.\',\n      ], () => { quest.amulet = \'started\'; hud.say(\'New quest: the lost amulet\'); });\n```\n\nHer words depend on the stage. Not started: two lines, and a `done` function written in place, `() => { … }` (an arrow function: a function with no name), that moves the quest on and shows the news when the conversation ends. `quest` is the same object as `state.quests`, so changing `quest.amulet` changes the state.\n\n```js\n    } else if (quest.amulet === \'started\') {\n      hud.talk(\'Ranger\', [\'No luck yet? Look near the north side of the forest.\']);\n    } else if (quest.amulet === \'found\') {\n      hud.talk(\'Ranger\', [\'My amulet! Thank you, friend. Here, take this.\'], () => {\n        quest.amulet = \'done\';\n        state.bag = state.bag.filter((item) => item.name !== \'Amulet\');\n        state.gold += 50;\n        hud.say(\'+50 gold\');\n      });\n    } else {\n      hud.talk(\'Ranger\', [\'The forest is quiet again. Rest by the campfire there if you are hurt.\']);\n```\n\nStarted: a reminder, and the stage stays. Found: thanks, then the amulet leaves the bag (`filter` makes a new list of the items for which the test is true, so every item not named Amulet), 50 gold, and done. Done: something to say forever after.\n\n```js\nconst forest = project.scene(\'scenes/forest.scene\')\nforest.add(\'Area2D\', { name: \'Amulet\', position: { x: 280, y: 40 }, script: \'scripts/amulet.js\' })\nforest.add(\'Sprite2D\', { name: \'Sprite\', parent: \'Amulet\', texture: \'assets/tiny-dungeon/tiles/tile_0101.png\' })\nforest.add(\'CollisionShape2D\', { name: \'Shape\', parent: \'Amulet\', size: { x: 10, y: 10 } })\n```\n\nThe amulet, in the forest\'s north-east corner.\n\n**scripts/amulet.js**\n\n```js\n// The quest\'s item. It is only in the forest while the quest is looking for it.\nexport default class Amulet extends Area2D {\n  ready() {\n    if (state.quests.amulet !== \'started\') this.queueFree();\n```\n\nBuilt with the forest every visit, it removes itself unless the quest is looking for it: before you have talked to her, and after you have found it.\n\n```js\n  bodyEntered(body) {\n    if (body.name !== \'Player\') return;\n    state.bag.push({ name: \'Amulet\', note: \'The ranger\\u2019s, found in the forest\' });\n    state.quests.amulet = \'found\';\n    scene.get(\'HUD\').say(\'Found the amulet!\');\n    this.queueFree();\n```\n\nPicked up: into the bag as an item (`\\u2019` is the curly apostrophe, written as a code so it cannot end the string), the quest moves to found, the news, and it is gone.',
              },
              {
                type: 'markdown',
                instruction: '### 6. Questions you might have\n\n**Why does the HUD own `talk()` instead of the ranger?** Every character will talk; the box, the typing and E belong in one place. Characters only decide what to say and what happens after.\n\n**What is the frame check (`openedOn`) for, really?** The E that starts the conversation is "just pressed" for the whole of that frame. The hero\'s `update` sees it and opens the box; without the check, the HUD\'s `update` would see the same press and skip the first line at once.\n\n**Why is `done` a function and not a quest name?** The HUD should not know about quests. A function lets each conversation decide what happens at its end: start a quest, pay you, open a shop.\n\n**What happens if I walk away mid-conversation?** You cannot: the HUD is busy, so the hero stands still until the last line.\n\n**How would a second quest look?** `quests: { amulet: \'not started\', wolf: \'not started\' }` in `newGame()`, and another character whose `talk()` reads `quest.wolf`. Each quest is a key and a set of stages.\n\n**Could the stages be numbers instead of words?** Yes, 0 to 3, but `\'found\'` says what it means in a save file or the Debug tab; `2` does not.',
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Dialogue and a quest',
        props: {
          task: 'qb-talk',
          lesson: 'mg11-007',
          checkpoint: 'cp-mg11-007-4',
        },
      },
    ],
  },
  math: {
    prose: [
      '**The typewriter, decoded.** $\\text{shown}(t) = \\min(n,\\ \\lfloor r t \\rfloor)$, read "the letters typed so far, but never more than the line has": $r$ is the rate (40 letters a second), $t$ the seconds since the line began, $n$ the line\'s length, and $\\lfloor x \\rfloor$ rounds down to whole letters. A line takes $n / r$ seconds.',
      'A quest is a finite state machine $(Q, E, \\delta, q_0)$: stages $Q$, events $E$, a transition function $\\delta$, and a start $q_0 = \\text{not started}$. A dialogue tree with choices is a directed graph, like the maps of lesson 11.2; a conversation is a path through it.',
    ],
    equations: [
      {
        label: 'Letters showing after t seconds',
        latex: '\\text{shown}(t) = \\min(n,\\ \\lfloor r\\,t \\rfloor)',
      },
      {
        label: 'Time to type a line',
        latex: 't_{\\text{line}} = \\frac{n}{r}',
      },
    ],
    callouts: [],
    visualizations: [],
  },
  rigor: {
    prose: [
      'Keeping each quest\'s stage as one value (not a handful of booleans like talkedToRanger, hasAmulet) makes impossible combinations impossible: the quest cannot be both done and not started. Every place that cares reads the one value.',
      'Where it goes: 11.8 adds sound effects (a blip as each letter types would be one more); chapter 12\'s buddy can be given things to say about the quest\'s stage.',
    ],
    callouts: [],
    visualizations: [],
  },
  examples: [
    {
      id: 'mg11-007-ex1',
      title: 'How long to type?',
      difficulty: 'easy',
      problem: 'A 120-letter line at 40 letters a second?',
      steps: [
        {
          expression: '120 / 40',
          annotation: 'n / r.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: '3 seconds.',
    },
    {
      id: 'mg11-007-ex2',
      title: 'Talking twice',
      difficulty: 'medium',
      problem: 'In cell 2, why does the second talk change nothing?',
      steps: [
        {
          expression: '\\delta(\\text{started}, \\text{talk}) = \\text{started}',
          annotation: 'No arrow for talk from started.',
          strategyTitle: 'Step 1: the table',
        },
      ],
      answer: 'From started only pickup leads anywhere; she just says "No luck yet?".',
    },
    {
      id: 'mg11-007-ex3',
      title: 'The skipped line',
      difficulty: 'hard',
      problem: 'A player says the first line of every conversation vanishes. What is wrong?',
      steps: [
        {
          expression: '\\text{E opens it and moves it on}',
          annotation: 'The same press, the same frame.',
          strategyTitle: 'Step 1',
        },
      ],
      answer: 'The press that opened the conversation was also read as "finish the line". Remember the frame it opened and ignore E on that frame.',
    },
  ],
  challenges: [
    {
      id: 'mg11-007-ch1',
      title: 'A faster talker',
      difficulty: 'easy',
      problem: 'Make the ranger talk at 60 letters a second.',
      hint: 'The rate in typewrite().',
      answer: 'this.shown + 60 * dt. A rate per speaker can be passed to talk().',
      walkthrough: [],
    },
    {
      id: 'mg11-007-ch2',
      title: 'A second quest',
      difficulty: 'medium',
      problem: 'Add a quest from a blacksmith: bring 3 iron.',
      hint: 'A new key in state.quests, counted in state.',
      answer: 'state.quests.iron = \'not started\' in newGame(); her talk() checks the stage and how many iron are in the bag; done gives a reward.',
      walkthrough: [],
    },
    {
      id: 'mg11-007-ch3',
      title: 'Choices',
      difficulty: 'hard',
      problem: 'Show cell 3\'s choices as Buttons and follow the one picked.',
      hint: 'A VBoxContainer in the box.',
      answer: 'For the current line, a Button per choice in a VBoxContainer, the first focused; pressed shows the line its choice leads to, or ends.',
      walkthrough: [],
    },
  ],
  semantics: {
    core: [
      {
        symbol: 'talk(name, lines, done)',
        meaning: 'Show lines one at a time; run done at the end.',
      },
      {
        symbol: 'visibleCharacters',
        meaning: 'How many letters show; −1 for all.',
      },
      {
        symbol: 'state.quests.amulet',
        meaning: 'The quest\'s stage.',
      },
      {
        symbol: 'transition',
        meaning: 'An arrow: from a stage, an event leads to a stage.',
      },
    ],
    rulesOfThumb: [
      'One value per quest.',
      'Lines are data.',
      'E finishes, then advances.',
      'Items appear only at the stages that need them.',
    ],
  },
  misconceptions: [
    {
      falseBelief: 'visibleCharacters wraps the visible part.',
      whyStudentsThinkIt: 'Only that part is drawn.',
      correctionExample: 'It wraps the whole text, so words do not jump lines.',
      contrastCase: 'Setting text to a slice would wrap the slice.',
    },
    {
      falseBelief: 'A quest needs a boolean per step.',
      whyStudentsThinkIt: 'Each step is yes or no.',
      correctionExample: 'One stage says it all, and rules out impossible mixes.',
      contrastCase: 'Counts (3 iron) are separate numbers.',
    },
  ],
  transferPrompts: [
    {
      situation: 'A tutorial that explains controls as you reach them.',
      competingTechniques: [
        'Pop-ups wired into each script',
        'A tutorial quest with stages',
      ],
      whyThisTechniqueWins: 'The stage says what to show next and lasts across saves.',
    },
    {
      situation: 'A story with hundreds of lines.',
      competingTechniques: [
        'Lines in code',
        'Lines in data (tables, a dialogue file)',
      ],
      whyThisTechniqueWins: 'Writers edit data; the code shows any of it.',
    },
  ],
  debugging: [
    {
      commonError: 'The conversation never ends.',
      symptom: 'The box stays and the hero cannot move.',
      whyItHappened: 'lines are never emptied, or done is never reached.',
      repairStrategy: 'Shift a line on each advance; hide the box when none remain.',
    },
    {
      commonError: 'The amulet is there before the quest.',
      symptom: 'You find it before talking to her.',
      whyItHappened: 'It does not check the stage.',
      repairStrategy: 'In ready(), free it unless the quest is started.',
    },
  ],
  mastery: {
    targetLevel: 3,
    solveIndependently: 'Write a typewriter dialogue box and a quest with stages.',
    explainVerbally: 'Explain the quest as a state machine.',
    detectIncorrectApplication: 'Spot skipped first lines and boolean-tangled quests.',
    transferToUnfamiliar: 'Model another quest or a tutorial as stages.',
  },
  assessment: {
    questions: [
      {
        id: 'mg11-007-assess-1',
        type: 'choice',
        text: 'E while a line is still typing',
        options: ['Shows the whole line', 'Goes to the next line', 'Closes the box', 'Nothing'],
        answer: 'Shows the whole line',
        hint: 'E moves it on.',
      },
    ],
  },
  quiz: [
    {
      id: 'mg11-007-quiz-1',
      type: 'choice',
      text: 'In cell 1, 1 second into the first line, how many letters show?',
      options: ['40', '78', '4', '20'],
      answer: '40',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg11-007-quiz-2',
      type: 'choice',
      text: 'The second line takes',
      options: ['2.05 s', '1.95 s', '2 s', '82 s'],
      answer: '2.05 s',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg11-007-quiz-3',
      type: 'choice',
      text: 'In cell 2, the first pickup',
      options: ['Changes nothing', 'Finds the amulet', 'Starts the quest', 'Ends it'],
      answer: 'Changes nothing',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg11-007-quiz-4',
      type: 'choice',
      text: 'In cell 3, choosing 2 then 2 ends with',
      options: ['"Then good day."', '"Thank you!…"', '"Fifty gold…"', 'Nothing'],
      answer: '"Then good day."',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg11-007-quiz-5',
      type: 'choice',
      text: 'visibleCharacters = −1 means',
      options: ['Show all of it', 'Show none', 'Show the last letter', 'Hide the Label'],
      answer: 'Show all of it',
      hints: ['talk().'],
      reviewSection: 'Intuition — talk',
    },
  ],
  checkpoints: [
    {
      id: 'cp-mg11-007-1',
      label: 'Read the dialogue box and the typewriter',
      type: 'read',
    },
    {
      id: 'cp-mg11-007-2',
      label: 'Read the quest as a state machine',
      type: 'read',
    },
    {
      id: 'cp-mg11-007-3',
      label: 'Run the notebook: dialogue and quests',
      type: 'read',
    },
    {
      id: 'cp-mg11-007-4',
      label: 'Complete "Dialogue and a quest" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg11-007-5',
      label: 'Work through "The skipped line"',
      type: 'example',
    },
    {
      id: 'cp-mg11-007-6',
      label: 'Pass the typewriter challenge',
      type: 'challenge',
    },
  ],
}
