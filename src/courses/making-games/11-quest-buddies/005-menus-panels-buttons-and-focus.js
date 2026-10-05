export default {
  chapter: 'making-games-11',
  order: 5,
  id: 'mg11-005',
  nextLesson: 'mg11-006',
  slug: 'menus-panels-buttons-and-focus',
  title: 'Menus: Panels, Buttons and Focus',
  subtitle: 'Build a title screen and a pause menu from Panels, Buttons and a VBoxContainer, wired with signals, that work with the mouse or the keys.',
  tags: ['game-studio', 'rpg', 'ui', 'menus', 'buttons', 'signals', 'focus', 'layout'],
  aliases: 'menu title screen pause menu button panel vboxcontainer hboxcontainer container layout focus keyboard navigation gamepad arrow keys enter pressed signal connect grab focus disabled ui gui',
  timeToComplete: 50,
  coreConcept: 'A menu is a Panel (a box) holding a VBoxContainer, which places its Buttons in a column for you. A Button emits pressed when it is clicked (the mouse goes down and up on it) or when Enter or Space is pressed while it has the keyboard focus; connect pressed to a method. grabFocus() gives a button the focus, and the arrow keys move it to the nearest button in that direction. disabled greys a button out and skips it. A pause menu is the same, hidden until Esc, and the game asks the HUD whether a menu is open before moving the hero.',
  prerequisites: ['mg11-004'],
  hook: {
    question: 'A title screen with three options: you could draw three pictures and check where the mouse is. But it must also work with the arrow keys, grey out Continue when there is no save, and look right when an option is hidden. What does a real button need?',
    realWorldContext: 'Every engine has the same toolkit: panels, buttons, containers that lay them out, signals or events for presses, and a focus that keys and gamepads move. Godot\'s Control nodes, Unity\'s UI and HTML forms all work this way, so learning it once carries over.',
  },
  intuition: {
    prose: [
      '**Depth: build it.** The Try it task turns the title screen\'s key labels into buttons and adds a pause menu.',
      '**Panel, Button, VBoxContainer.** A Panel is a box with a colour and an edge: the background of a menu. Its position is its top-left corner, and size is its width and height. A Button is a box with words that can be pressed. A VBoxContainer places its children in a column, each separation pixels below the last (cell 1); an HBoxContainer places them in a row. Put a Panel under a CanvasLayer and it stays on the screen while the camera moves.',
      '**Containers place things for you.** Add, remove or hide a child of a container and the others close up: hide Continue and How to play moves up to y 62 (cell 1). The container sets its children\'s positions every frame, so you cannot move a child inside one by hand: move the container. That is what makes a menu built from data easy: add a Button per save slot, and the column lays itself out.',
      '**Pressing.** A click is the mouse going down on a button and coming up on the same button; down on it and up elsewhere does nothing, so you can change your mind. To know whether the pointer is on a button, the engine takes the pointer into the button\'s own coordinates, undoing the panel\'s and the column\'s placement, and checks it is inside 0 to width and 0 to height (cell 2). Pressing calls the button\'s pressed() and emits the pressed signal. Connect that signal to a method of the menu: buttons.get(\'New game\').connect(\'pressed\', this, \'newGame\'). The button does not need its own script.',
      '**Focus: the keys and gamepads.** Mice are optional; keys are not. One button at a time has the focus, drawn with a white edge. grabFocus() gives it to a button; Enter or Space presses the focused one; the arrow keys move the focus to the nearest button in that direction. "Nearest" counts how far ahead a button is and twice how far off to the side, and ignores buttons behind (cell 3), so ↓ from Continue goes to Quit, not to Options beside it. Give the first button the focus when a menu opens, and the keys work at once.',
      '**Disabled.** disabled = true greys a button, and it cannot be pressed or take the focus; the arrow keys skip it. The title screen sets Continue.disabled = !save.has(\'slot1\'): offered only when there is a game to continue.',
      '**A pause menu.** In the HUD, a Panel Pause with Resume and Title screen, hidden at the start. Esc (an input action, menu) shows it and gives Resume the focus; Esc again, or Resume, hides it and releaseFocus() gives the keys back to the game. While it is open the hero must not walk: the HUD has a busy getter (is Pause showing?), and the hero\'s physicsUpdate stops when scene.get(\'HUD\').busy. Pausing is a question every moving thing asks, not a switch on the engine.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: a menu',
        body: 'Step 1. Under a CanvasLayer, a Panel. Step 2. In it, a VBoxContainer, and Buttons in that with their text and size. Step 3. In a script on the menu\'s root: connect each Button\'s pressed to a method; set disabled on any that are not available; grabFocus() on the first. Step 4. To hide the menu: visible = false, and releaseFocus().',
      },
      {
        type: 'warning',
        title: 'Space presses the focused button',
        body: 'Enter and Space press the button with the focus, and Space may also be one of your game\'s actions. Release the focus when a menu closes, so Space goes back to the game alone.',
      },
      {
        type: 'insight',
        title: 'Signals keep the button simple',
        body: 'A button knows nothing about new games or saves. It says "I was pressed"; the menu decides what that means. The same Button node works in every menu.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Layout, clicks and focus',
        caption: 'The same rules the engine uses (core/widgets.ts and engine/game.ts).',
        props: {
          lesson: {
            title: 'Layout, clicks and focus',
            subtitle: 'How a container, a click and the arrow keys are worked out.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. A column of buttons\nPredict first: where the third button starts.',
                startCode: '// A VBoxContainer places its children one under another: each starts where the last ended, plus the separation.\n// Predict first: where does the third button start?\nconst separation = 14\nconst children = [{ name: \'New game\', h: 48 }, { name: \'Continue\', h: 48 }, { name: \'How to play\', h: 48 }]\nlet y = 0\nfor (const c of children) { console.log(c.name.padEnd(12), \'y =\', y); y += c.h + separation }\nconsole.log(\'the column is\', y - separation, \'pixels tall\')\n// Hide Continue (no saved game): the container skips hidden children, and the rest close up.\ny = 0\nfor (const c of children.filter((c) => c.name !== \'Continue\')) { console.log(\'hidden Continue:\', c.name.padEnd(12), \'y =\', y); y += c.h + separation }',
              },
              {
                type: 'js',
                instruction: '### 2. Is the pointer on the button?\nPredict first: which pointers are on Continue.',
                startCode: '// Is the pointer on a button? Undo the button\'s placement: take the pointer into the button\'s own coordinates, then\n// check it is inside 0..width and 0..height. Here the button is inside a panel, so its place is the panel\'s plus its own.\nconst panel = { x: 290, y: 60 }, column = { x: 40, y: 110 }, button = { x: 0, y: 62, w: 300, h: 48 }   // Continue\nconst origin = { x: panel.x + column.x + button.x, y: panel.y + column.y + button.y }\nfor (const p of [{ x: 480, y: 250 }, { x: 480, y: 290 }, { x: 320, y: 250 }, { x: 640, y: 231 }]) {\n  const local = { x: p.x - origin.x, y: p.y - origin.y }\n  const inside = local.x >= 0 && local.y >= 0 && local.x <= button.w && local.y <= button.h\n  console.log(\'pointer (\' + p.x + \', \' + p.y + \') → in the button at (\' + local.x + \', \' + local.y + \')\', inside ? \'on it\' : \'not on it\')\n}',
              },
              {
                type: 'js',
                instruction: '### 3. The nearest button that way\nPredict first: ↓ from Continue.',
                startCode: '// The arrow keys move the focus to the nearest button that way. For each candidate: how far it is ahead in that\n// direction, and how far off to the side. Ahead counts once, sideways twice; behind does not count at all.\nconst buttons = { \'New game\': { x: 480, y: 194 }, \'Continue\': { x: 480, y: 256 }, \'Options\': { x: 640, y: 256 }, \'Quit\': { x: 480, y: 318 } }\nfunction nearest(from, dir) {\n  const c = buttons[from]\n  let best = null, bestScore = Infinity\n  for (const [name, b] of Object.entries(buttons)) {\n    if (name === from) continue\n    const dx = b.x - c.x, dy = b.y - c.y\n    const ahead = dx * dir.x + dy * dir.y, side = Math.abs(dx * dir.y - dy * dir.x)\n    if (ahead <= 0) continue\n    const score = ahead + 2 * side\n    if (score < bestScore) { bestScore = score; best = name }\n  }\n  return best\n}\nconst DOWN = { x: 0, y: 1 }, RIGHT = { x: 1, y: 0 }, UP = { x: 0, y: -1 }\nfor (const [from, dir, key] of [[\'New game\', DOWN, \'↓\'], [\'Continue\', DOWN, \'↓\'], [\'Continue\', RIGHT, \'→\'], [\'Options\', DOWN, \'↓\'], [\'Quit\', UP, \'↑\'], [\'Quit\', DOWN, \'↓\']])\n  console.log(from.padEnd(9), key, \'→\', nearest(from, dir) ?? \'(stays: nothing that way)\')',
              },
              {
                type: 'challenge',
                instruction: '### 4. Challenge: nearest()\nThe check tries seven moves.',
                startCode: '// Challenge: nearest(from, dir, buttons) picks the button the arrow key moves the focus to: of those ahead of \'from\'\n// in direction dir (ahead > 0), the one with the smallest ahead + 2 × sideways. null if none is ahead.\n// ahead = dx·dir.x + dy·dir.y, sideways = |dx·dir.y − dy·dir.x|, where (dx, dy) is from \'from\' to the candidate.\nfunction nearest(from, dir, buttons) {\n  return null   // your code\n}\nconst B = { A: { x: 0, y: 0 }, B: { x: 0, y: 60 }, C: { x: 100, y: 60 }, D: { x: 10, y: 200 }, E: { x: 300, y: 10 } }\nconst cases = [[\'A\', { x: 0, y: 1 }, \'B\'], [\'B\', { x: 1, y: 0 }, \'C\'], [\'B\', { x: 0, y: 1 }, \'D\'], [\'A\', { x: 1, y: 0 }, \'C\'], [\'E\', { x: -1, y: 0 }, \'C\'], [\'D\', { x: 0, y: 1 }, null], [\'C\', { x: -1, y: 0 }, \'B\']]\nconst bad = cases.find(([f, d, want]) => nearest(f, d, B) !== want)\nconsole.log(bad ? \'From \' + bad[0] + \' going (\' + bad[1].x + \', \' + bad[1].y + \') should reach \' + bad[2] + \', not \' + nearest(bad[0], bad[1], B) + \'.\' : \'✓ The focus goes to the right button every time, and stays when nothing is that way.\')',
                solutionCode: '// Challenge: nearest(from, dir, buttons) picks the button the arrow key moves the focus to: of those ahead of \'from\'\n// in direction dir (ahead > 0), the one with the smallest ahead + 2 × sideways. null if none is ahead.\n// ahead = dx·dir.x + dy·dir.y, sideways = |dx·dir.y − dy·dir.x|, where (dx, dy) is from \'from\' to the candidate.\nfunction nearest(from, dir, buttons) {\n  const c = buttons[from]\n  let best = null, bestScore = Infinity\n  for (const [name, b] of Object.entries(buttons)) {\n    if (name === from) continue\n    const dx = b.x - c.x, dy = b.y - c.y\n    const ahead = dx * dir.x + dy * dir.y, side = Math.abs(dx * dir.y - dy * dir.x)\n    if (ahead <= 0) continue\n    if (ahead + 2 * side < bestScore) { bestScore = ahead + 2 * side; best = name }\n  }\n  return best\n}\nconst B = { A: { x: 0, y: 0 }, B: { x: 0, y: 60 }, C: { x: 100, y: 60 }, D: { x: 10, y: 200 }, E: { x: 300, y: 10 } }\nconst cases = [[\'A\', { x: 0, y: 1 }, \'B\'], [\'B\', { x: 1, y: 0 }, \'C\'], [\'B\', { x: 0, y: 1 }, \'D\'], [\'A\', { x: 1, y: 0 }, \'C\'], [\'E\', { x: -1, y: 0 }, \'C\'], [\'D\', { x: 0, y: 1 }, null], [\'C\', { x: -1, y: 0 }, \'B\']]\nconst bad = cases.find(([f, d, want]) => nearest(f, d, B) !== want)\nconsole.log(bad ? \'From \' + bad[0] + \' going (\' + bad[1].x + \', \' + bad[1].y + \') should reach \' + bad[2] + \', not \' + nearest(bad[0], bad[1], B) + \'.\' : \'✓ The focus goes to the right button every time, and stays when nothing is that way.\')',
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Menus with buttons',
        props: {
          task: 'qb-menus',
          lesson: 'mg11-005',
          checkpoint: 'cp-mg11-005-4',
        },
      },
    ],
  },
  math: {
    prose: [
      '**The focus rule, decoded.** For the focused button at $c$ and a candidate at $b$, let $d = b - c$ be the step from one to the other, and $u$ the arrow\'s direction (a unit vector: $(0, 1)$ for ↓). Then $\\text{ahead} = d \\cdot u$, read "how far $b$ is in the arrow\'s direction", the dot product $d_x u_x + d_y u_y$. And $\\text{side} = |d_x u_y - d_y u_x|$, read "how far $b$ is off that line", the size of the 2D cross product. A candidate counts only if ahead $> 0$, and the focus goes to the smallest $\\text{ahead} + 2\\,\\text{side}$. In code: dx, dy, dir.x, dir.y and score in cell 3.',
      '**The click, decoded.** The button\'s place on the screen is a transform $T$ (its position, its column\'s and its panel\'s, added up here). The pointer $p$ in the button\'s own coordinates is $T^{-1}p$, "undo the placement". It is on the button when $0 \\le x \\le w$ and $0 \\le y \\le h$.',
    ],
    equations: [
      {
        label: 'How far ahead, and how far aside',
        latex: '\\text{ahead} = d\\cdot u,\\qquad \\text{side} = |d_x u_y - d_y u_x|',
      },
      {
        label: 'The button the focus goes to',
        latex: '\\arg\\min_{b:\\ \\text{ahead} > 0}\\ (\\text{ahead} + 2\\,\\text{side})',
      },
      {
        label: 'The pointer in the button\'s coordinates',
        latex: 'p\' = T^{-1}\\,p',
      },
    ],
    callouts: [],
    visualizations: [],
  },
  rigor: {
    prose: [
      'Counting sideways distance double makes the focus prefer buttons in line with the arrow: ↓ goes to the button below even when one beside it is closer in a straight line. Any weight above 1 does this; 2 is a common choice.',
      'Where it goes: 11.6 puts a health bar and a list in the HUD; 11.7 a dialogue box.',
    ],
    callouts: [],
    visualizations: [],
  },
  examples: [
    {
      id: 'mg11-005-ex1',
      title: 'Where does it go?',
      difficulty: 'easy',
      problem: 'A VBoxContainer with separation 10 holds buttons 40, 40 and 30 tall. Where does each start?',
      steps: [
        {
          expression: '0,\\ 40 + 10,\\ 50 + 40 + 10',
          annotation: 'Each starts where the last ended, plus the gap.',
          strategyTitle: 'Step 1: add up',
        },
      ],
      answer: 'y 0, 50 and 100.',
    },
    {
      id: 'mg11-005-ex2',
      title: 'Down from Continue',
      difficulty: 'medium',
      problem: 'In cell 3, why does ↓ from Continue go to Quit and not Options?',
      steps: [
        {
          expression: '\\text{Options: ahead } 0',
          annotation: 'It is beside, not below: not ahead.',
          strategyTitle: 'Step 1: ahead',
        },
        {
          expression: '\\text{Quit: } 62 + 2\\cdot 0',
          annotation: 'Straight below.',
          strategyTitle: 'Step 2: score',
        },
      ],
      answer: 'Options is level with Continue, so it is not ahead at all; Quit is straight below.',
    },
    {
      id: 'mg11-005-ex3',
      title: 'A click that is not',
      difficulty: 'hard',
      problem: 'The mouse goes down on New game, the player changes their mind and releases over the panel. What happens?',
      steps: [
        {
          expression: '\\text{down on it, up off it}',
          annotation: 'Not a click.',
          strategyTitle: 'Step 1: the rule',
        },
      ],
      answer: 'Nothing: a click is down and up on the same button.',
    },
  ],
  challenges: [
    {
      id: 'mg11-005-ch1',
      title: 'How to play',
      difficulty: 'easy',
      problem: 'Add a How to play button that shows and hides a Label of instructions.',
      hint: 'Connect pressed to a method that flips visible.',
      answer: 'A third Button in the column; its pressed connected to howToPlay(), which sets help.visible = !help.visible.',
      walkthrough: [],
    },
    {
      id: 'mg11-005-ch2',
      title: 'A slot per save',
      difficulty: 'medium',
      problem: 'Make the title screen list one Continue button per saved slot.',
      hint: 'save.slots(), new Button(), addChild.',
      answer: 'For each name in save.slots(): const b = new Button(); b.text = name; b.size = { x: 300, y: 48 }; b.connect(\'pressed\', () => { save.load(name); scene.change(state.map); }); buttons.addChild(b). The container lays them out.',
      walkthrough: [],
    },
    {
      id: 'mg11-005-ch3',
      title: 'A row of buttons',
      difficulty: 'hard',
      problem: 'Put Yes and No side by side in an HBoxContainer. Which arrow keys move between them?',
      hint: 'Cell 3\'s rule.',
      answer: '← and →: they are level, so each is ahead of the other only left or right; ↑ and ↓ find nothing and the focus stays.',
      walkthrough: [],
    },
  ],
  semantics: {
    core: [
      {
        symbol: 'Panel',
        meaning: 'A box with an edge: a menu\'s background.',
      },
      {
        symbol: 'Button',
        meaning: 'Pressed by a click, or by Enter/Space while focused; emits pressed.',
      },
      {
        symbol: 'VBoxContainer',
        meaning: 'Places its visible children in a column, separation apart.',
      },
      {
        symbol: 'grabFocus()',
        meaning: 'Give this button the keyboard focus.',
      },
      {
        symbol: 'disabled',
        meaning: 'Greyed out: cannot be pressed or focused.',
      },
    ],
    rulesOfThumb: [
      'Every menu works with the keys: focus its first button.',
      'Let containers place buttons.',
      'Buttons emit; the menu decides.',
      'A menu that opens over the game makes the HUD busy.',
    ],
  },
  misconceptions: [
    {
      falseBelief: 'A button needs its own script.',
      whyStudentsThinkIt: 'It has to do something.',
      correctionExample: 'Connect its pressed signal to a method of the menu.',
      contrastCase: 'A button that does something special everywhere it is used can have one.',
    },
    {
      falseBelief: 'The arrow keys go to the closest button.',
      whyStudentsThinkIt: 'Nearest sounds like closest.',
      correctionExample: 'Cell 3: buttons behind do not count, and sideways counts double.',
      contrastCase: 'For buttons in a straight column, the closest ahead is the one chosen.',
    },
  ],
  transferPrompts: [
    {
      situation: 'A gamepad-only game (a console).',
      competingTechniques: [
        'Mouse-only menus',
        'Focus on open, arrow/stick moves it, A presses',
      ],
      whyThisTechniqueWins: 'Without a pointer, focus is the only way.',
    },
    {
      situation: 'A list of 30 items.',
      competingTechniques: [
        'Place 30 buttons by hand',
        'Make them in a loop inside a container',
      ],
      whyThisTechniqueWins: 'The container lays them out, and the list can change.',
    },
  ],
  debugging: [
    {
      commonError: 'No button has the focus.',
      symptom: 'The arrow keys and Enter do nothing until you click.',
      whyItHappened: 'grabFocus() was never called.',
      repairStrategy: 'Call grabFocus() on the first button when the menu opens.',
    },
    {
      commonError: 'Moving a button inside a container.',
      symptom: 'It snaps back.',
      whyItHappened: 'The container sets its children\'s positions every frame.',
      repairStrategy: 'Move the container, or take the button out of it.',
    },
    {
      commonError: 'The hero walks while paused.',
      symptom: 'Arrow keys move the focus and the hero.',
      whyItHappened: 'The hero does not ask whether a menu is open.',
      repairStrategy: 'Stop in physicsUpdate when scene.get(\'HUD\').busy.',
    },
  ],
  mastery: {
    targetLevel: 3,
    solveIndependently: 'Build a menu that works with the mouse and the keys.',
    explainVerbally: 'Explain signals, focus and how the arrow keys choose.',
    detectIncorrectApplication: 'Spot a menu without focus, or a hero that walks while paused.',
    transferToUnfamiliar: 'Build a settings menu from data.',
  },
  assessment: {
    questions: [
      {
        id: 'mg11-005-assess-1',
        type: 'choice',
        text: 'Which makes the keys work as soon as a menu opens?',
        options: [
          'grabFocus() on its first button',
          'disabled = false',
          'A VBoxContainer',
          'A CanvasLayer',
        ],
        answer: 'grabFocus() on its first button',
        hint: 'Focus.',
      },
    ],
  },
  quiz: [
    {
      id: 'mg11-005-quiz-1',
      type: 'choice',
      text: 'In cell 1, the third button starts at y',
      options: ['124', '96', '62', '172'],
      answer: '124',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg11-005-quiz-2',
      type: 'choice',
      text: 'With Continue hidden, How to play starts at y',
      options: ['62', '124', '0', '48'],
      answer: '62',
      hints: ['Cell 1.'],
      reviewSection: 'Cell 1',
    },
    {
      id: 'mg11-005-quiz-3',
      type: 'choice',
      text: 'In cell 2, the pointer at (480, 290) is',
      options: [
        'Not on Continue: 58 down is past its 48',
        'On it',
        'On New game',
        'On the panel\'s edge',
      ],
      answer: 'Not on Continue: 58 down is past its 48',
      hints: ['Cell 2.'],
      reviewSection: 'Cell 2',
    },
    {
      id: 'mg11-005-quiz-4',
      type: 'choice',
      text: 'In cell 3, ↓ from Continue goes to',
      options: ['Quit', 'Options', 'New game', 'Nowhere'],
      answer: 'Quit',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg11-005-quiz-5',
      type: 'choice',
      text: 'A click is',
      options: [
        'Down and up on the same button',
        'Down on the button',
        'Up on the button',
        'The pointer over it',
      ],
      answer: 'Down and up on the same button',
      hints: ['Pressing.'],
      reviewSection: 'Intuition — pressing',
    },
    {
      id: 'mg11-005-quiz-6',
      type: 'choice',
      text: 'The hero stands still while paused because',
      options: [
        'It asks whether the HUD is busy',
        'The engine pauses',
        'The scene changes',
        'The button has the focus',
      ],
      answer: 'It asks whether the HUD is busy',
      hints: ['A pause menu.'],
      reviewSection: 'Intuition — a pause menu',
    },
  ],
  checkpoints: [
    {
      id: 'cp-mg11-005-1',
      label: 'Read Panel, Button and containers',
      type: 'read',
    },
    {
      id: 'cp-mg11-005-2',
      label: 'Read pressing, focus and disabled',
      type: 'read',
    },
    {
      id: 'cp-mg11-005-3',
      label: 'Run the notebook: layout, clicks and focus',
      type: 'read',
    },
    {
      id: 'cp-mg11-005-4',
      label: 'Complete "Menus with buttons" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg11-005-5',
      label: 'Work through "Down from Continue"',
      type: 'example',
    },
    {
      id: 'cp-mg11-005-6',
      label: 'Pass the nearest() challenge',
      type: 'challenge',
    },
  ],
}
