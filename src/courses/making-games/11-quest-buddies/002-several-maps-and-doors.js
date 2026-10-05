export default {
  chapter: 'making-games-11',
  order: 2,
  id: 'mg11-002',
  nextLesson: 'mg11-003',
  slug: 'several-maps-and-doors',
  title: 'Several Maps and Doors',
  subtitle: 'Build two maps from tiles and a hero who walks in both, then join them with doors that say where they lead, and arrive standing in the right place.',
  tags: ['game-studio', 'rpg', 'scenes', 'scene-change', 'spawn-points', 'inheritance'],
  aliases: 'tilemap tileset tiles solid tiles setCell fill camera zoom smoothing camera limits multi map multiple maps levels rooms doors portals warp teleport scene change spawn point arrive entrance exit world map graph breadth first search inheritance extends class door',
  timeToComplete: 60,
  coreConcept: 'A map is a scene of tiles: a TileMapLayer for the floor and one for the walls, both cut from one tileset, with wall tiles marked solid so bodies stop at them. The hero is a scene of its own, put into each map as an instance, with a camera that follows it. Each map is its own scene. A door is an Area2D that, when the hero walks in, writes where to stand next (state.arriveAt) and calls scene.change(path). The engine finishes the frame, throws the old scene away and builds the new one; the hero\'s ready() looks for a Node2D under Spawns with that name and stands on it. Write the door once as a class Door with target and arriveAt, and each real door is a tiny class that extends it. Maps and doors form a graph: maps are points, doors are arrows.',
  prerequisites: ['mg11-001'],
  hook: {
    question: 'A world too big for one screen is split into maps. When you walk through the forest gate you arrive at the forest\'s edge, facing in, not wherever the hero happened to be in the town. How does the new map know where you came from?',
    realWorldContext: 'Zelda\'s rooms, Pokémon\'s routes and towns, and every dungeon crawler join maps with doors, warps and edges. The pattern is the same everywhere: the door says where to go and where to arrive, and the new map places you there.',
  },
  intuition: {
    prose: [
      '**Depth: build it.** This lesson has two Try it tasks. The first starts from an empty project and builds the two maps and the hero; the second adds the doors. Together they are the start of Quest Buddies: every later lesson\'s task begins where these end.',
      '**A tileset is a sheet cut into tiles.** The Tiny Dungeon picture is 192 × 176 pixels: 12 columns and 11 rows of 16 × 16 tiles, numbered left to right, top to bottom, from 0. project.createTileset names that sheet, the tile size, and which tiles are solid: solid: [40] says tile 40, a stone wall, stops bodies. Solid is a property of the tile, not of the map, so every wall drawn with tile 40, on any map, blocks the hero.',
      '**A map is two layers of tiles.** A TileMapLayer is a grid of cells, each holding a tile number or nothing (−1). The town has two: Floor, filled with tile 48 (sand) by fill(0, 0, 20, 12, 48), which reads "from column 0, row 0, 20 columns wide and 12 rows tall, tile 48"; and Walls, drawn on top. Cell 1 builds the walls with the task\'s two loops and draws them as text: the first loop does the top row (row 0) and the bottom row (row 11) across all 20 columns; the second does the two sides (columns 0 and 19) for rows 1 to 10, skipping one cell, the gap where the door will go. 20 × 12 cells of 16 pixels is 320 × 192 pixels, and cell (col, row) covers x from col × 16 to col × 16 + 16: the gap at (19, 5) has its middle at (312, 88), which is where the door goes in the next task.',
      '**The forest is the same with two numbers changed.** Floor tile 0 (darker ground) and the gap at (0, 5), on the west. Writing it out again is the honest way to see that; in your own game you would make the two loops a function with the floor tile and the gap as its inputs.',
      '**The hero is its own scene.** scenes/player.scene is a CharacterBody2D Player with a Sprite2D (tile 98), a 10 × 10 CollisionShape2D (a little smaller than a tile, so it fits through a one-tile gap) and a Camera2D. Its script, player.js, sets velocity from input.vector(\'move_left\', \'move_right\', \'move_up\', \'move_down\'), scaled by speed 70 (pixels a second), and calls moveAndSlide(), which moves it and stops it at solid tiles. Then instance() puts that scene into each map, at (56, 96) in the town and (32, 88) in the forest. An instance is a use of the scene, not a copy: change player.scene and both maps change.',
      '**The camera.** zoom: 3 makes every world pixel three screen pixels, so the 960 × 540 screen shows 320 × 180 world pixels: the whole width of the map and all but 12 pixels of its height. limitTopLeft (0, 0) and limitBottomRight (320, 192) stop it showing anything outside the map. smoothing: 8 makes it ease after the hero instead of jumping: every frame it closes the fraction f = 1 − e^(−8 × dt) of the gap, about 12.5% at 60 frames a second. Cell 2 runs it: a 100-pixel gap is 13.5 pixels after a quarter of a second.',
      '**One map, one scene.** The town and the forest are separate scenes. Only one runs at a time, so a game can have hundreds of maps without them all being in memory.',
      '**A door is an area.** An Area2D notices bodies coming in (bodyEntered). The door checks it is the hero, then calls scene.change(\'scenes/forest.scene\'). scene.change does not switch at once: it notes the scene, and the engine switches at the end of the frame, after every script has had its turn (cell 5). If two doors are touched in the same frame, the last call wins.',
      '**Arriving in the right place.** The forest scene puts its hero somewhere; that is not where someone coming from the town should stand. So the door writes where to arrive before changing: state.arriveAt = \'FromTown\'. state is kept across scene changes (lesson 11.3). The forest has a Node2D Spawns with named Node2Ds under it, FromTown at the west door and Campfire by the fire. The hero\'s ready() finds Spawns/FromTown and stands on it. With no spawn of that name, the hero stays where the scene put it (cell 4).',
      '**Write the door once.** Every door does the same thing with different places. So door.js is a class Door with two fields, target and arriveAt, and the bodyEntered that uses them. Each real door is a tiny script, door_to_forest.js: import Door from \'./door.js\'; export default class extends Door { target = \'scenes/forest.scene\'; arriveAt = \'FromTown\'; }. That is inheritance: the small class gets all of Door\'s behaviour and changes only the fields. A new door is three lines.',
      '**Maps form a graph.** Draw each map as a point and each door as an arrow to another map: that is a graph, and questions about the world are graph questions. Cell 3 adds a cave and a castle and finds the fewest doors from one map to another with breadth-first search, the same search the Maze Chase ghosts use: look at every map one door away, then two, and so on. A map with no arrow back is a one-way trip (the castle).',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: a map from tiles',
        body: 'Step 1. A tileset from the sheet, with the wall tiles solid. Step 2. A scene with a TileMapLayer Floor, filled. Step 3. A TileMapLayer Walls on top: the edge, with a gap for each door. Step 4. The hero\'s scene, instanced into the map. Step 5. Run, and walk into a wall to check it stops you.',
      },
      {
        type: 'procedure',
        title: 'Procedure: joining two maps',
        body: 'Step 1. Leave a gap in each map\'s wall. Step 2. In each map, a Node2D Spawns with a named Node2D where an arriving hero should stand. Step 3. A door: an Area2D with a shape in the gap, and a script extending Door with target (the other scene) and arriveAt (the spawn point there). Step 4. The hero\'s ready(): stand on Spawns/ + state.arriveAt if it exists. Step 5. Run: walk through and back.',
      },
      {
        type: 'warning',
        title: 'Do not arrive on a door',
        body: 'Put each spawn point a little away from the door you arrive by. Arriving inside a door\'s area would send you straight back.',
      },
      {
        type: 'insight',
        title: 'Why the switch waits for the end of the frame',
        body: 'Scripts later in the same frame may still use the old scene\'s nodes. Throwing them away in the middle of a frame would break those scripts; waiting means every script sees one whole scene.',
      },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Maps, doors and arriving',
        caption: 'Plain JavaScript models of what the engine and the scripts do.',
        props: {
          lesson: {
            title: 'Maps, doors and arriving',
            subtitle: 'Walls from two loops, the camera, the world as a graph, spawn points, and the end of the frame.',
            cells: [
              {
                type: 'js',
                instruction: '### 1. The walls, from two loops\nPredict first: how many wall cells?',
                startCode: '// The town\'s walls, built with the same two loops as the task, then drawn as text: # a wall, . no wall.\n// Predict first: how many wall cells are there?\nconst cols = 20, rows = 12, gap = [19, 5]\nconst walls = new Set()\nconst setCell = (col, row) => walls.add(col + \',\' + row)\nfor (let col = 0; col < cols; col++) { setCell(col, 0); setCell(col, rows - 1) }   // the top and bottom rows\nfor (let row = 1; row < rows - 1; row++) for (const col of [0, cols - 1]) if (!(col === gap[0] && row === gap[1])) setCell(col, row)   // the sides\nfor (let row = 0; row < rows; row++) {\n  let line = \'\'\n  for (let col = 0; col < cols; col++) line += walls.has(col + \',\' + row) ? \'#\' : \'.\'\n  console.log(String(row).padStart(2), line)\n}\nconsole.log(\'wall cells:\', walls.size, \' (top and bottom \' + 2 * cols + \', sides \' + 2 * (rows - 2) + \', minus the gap 1)\')\n// A cell\'s place in pixels: column × 16 to column × 16 + 16. The gap\'s middle:\nconsole.log(\'the gap is at x\', gap[0] * 16, \'to\', gap[0] * 16 + 16, \', y\', gap[1] * 16, \'to\', gap[1] * 16 + 16, \'; its middle\', gap[0] * 16 + 8, gap[1] * 16 + 8)',
              },
              {
                type: 'js',
                instruction: '### 2. The camera eases in\nPredict first: the gap after a quarter of a second.',
                startCode: '// The camera with smoothing k: each frame it closes the fraction f = 1 - e^(-k·dt) of the gap to the hero.\n// Predict first: with k = 8, how much of a 100-pixel gap is left after 0.25 seconds?\nconst k = 8, dt = 1 / 60\nconst f = 1 - Math.exp(-k * dt)\nconsole.log(\'f per frame:\', f.toFixed(4))\nlet view = 0\nconst hero = 100\nfor (let frame = 1; frame <= 30; frame++) {\n  view += (hero - view) * f\n  if (frame % 5 === 0) console.log(\'after\', String(frame).padStart(2), \'frames (\' + (frame * dt).toFixed(3) + \' s): view at\', view.toFixed(1), \' gap\', (hero - view).toFixed(1))\n}\nconsole.log(\'the formula, gap × e^(-k·t), at t = 0.25:\', (100 * Math.exp(-k * 0.25)).toFixed(1))\n// Zoom 3 on a 960 × 540 screen shows 960 / 3 by 540 / 3 world pixels:\nconsole.log(\'the camera sees\', 960 / 3, \'×\', 540 / 3, \'pixels of a 320 × 192 map\')',
              },
              {
                type: 'js',
                instruction: '### 3. Maps and doors are a graph\nPredict first: town to cave in how many doors?',
                startCode: '// Maps joined by doors are a graph: each map is a point, each door an arrow to another map, with the spawn point\n// to stand on there. Breadth-first search finds the fewest doors from one map to another.\nconst doors = [\n  { from: \'town\', to: \'forest\', arriveAt: \'FromTown\' },\n  { from: \'forest\', to: \'town\', arriveAt: \'FromForest\' },\n  { from: \'forest\', to: \'cave\', arriveAt: \'Entrance\' },\n  { from: \'cave\', to: \'forest\', arriveAt: \'FromCave\' },\n  { from: \'town\', to: \'castle\', arriveAt: \'Gate\' },\n]\nfunction route(start, goal) {\n  const came = new Map([[start, null]]), queue = [start]\n  while (queue.length) {\n    const map = queue.shift()\n    if (map === goal) break\n    for (const d of doors) if (d.from === map && !came.has(d.to)) { came.set(d.to, d); queue.push(d.to) }\n  }\n  if (!came.has(goal)) return null\n  const path = []\n  for (let d = came.get(goal); d; d = came.get(d.from)) path.unshift(d)\n  return path\n}\nfor (const [a, b] of [[\'town\', \'cave\'], [\'cave\', \'castle\'], [\'castle\', \'forest\']]) {\n  const p = route(a, b)\n  console.log(a + \' → \' + b + \':\', p ? p.map((d) => d.to + \' (at \' + d.arriveAt + \')\').join(\', \') + \'  — \' + p.length + \' doors\' : \'no way through\')\n}',
              },
              {
                type: 'js',
                instruction: '### 4. Arriving on a spawn point\nPredict first: FromCave in the forest.',
                startCode: '// Arriving: the door writes where to stand (state.arriveAt); the new map\'s hero looks for a spawn point by that name.\n// If the map has none, the hero stays where the scene put it. Predict first: where does each arrival stand?\nconst spawns = { forest: { FromTown: { x: 32, y: 88 }, Campfire: { x: 160, y: 132 } } }\nconst scenePosition = { x: 56, y: 96 }   // where the hero is placed in the forest scene itself\nfunction arrive(map, arriveAt) {\n  const spawn = arriveAt && spawns[map]?.[arriveAt]\n  return spawn ?? scenePosition\n}\nfor (const a of [\'FromTown\', \'Campfire\', \'FromCave\', undefined]) {\n  const p = arrive(\'forest\', a)\n  console.log(String(a).padEnd(10), \'→ (\' + p.x + \', \' + p.y + \')\')\n}',
              },
              {
                type: 'js',
                instruction: '### 5. scene.change waits for the end of the frame\nPredict first: which door wins?',
                startCode: '// scene.change does not switch at once: it notes the scene, and the engine switches at the end of the frame, after\n// every script has had its turn. Two doors touched in the same frame: which one wins?\nlet next = null\nconst change = (path) => { next = path }\n// One frame: every node\'s turn, in tree order.\nconst frame = [\n  () => change(\'scenes/forest.scene\'),   // the east door\n  () => change(\'scenes/cave.scene\'),     // a trapdoor the hero also stands on\n  () => console.log(\'the HUD still runs this frame; the scene is still the town\'),\n]\nfor (const turn of frame) turn()\nconsole.log(\'end of the frame: switch to\', next)',
              },
              {
                type: 'challenge',
                instruction: '### 6. Challenge: arrive()\nThe check tries five arrivals.',
                startCode: '// Challenge: arrive(spawns, arriveAt, fallback) returns where the hero stands: the spawn point named arriveAt if the\n// map has one, otherwise fallback (where the scene put the hero). spawns is { name: { x, y } }.\nfunction arrive(spawns, arriveAt, fallback) {\n  return fallback   // your code\n}\nconst spawns = { FromTown: { x: 32, y: 88 }, Campfire: { x: 160, y: 132 } }, here = { x: 56, y: 96 }\nconst cases = [[\'FromTown\', spawns.FromTown], [\'Campfire\', spawns.Campfire], [\'Nowhere\', here], [undefined, here], [\'\', here]]\nconst bad = cases.find(([a, want]) => JSON.stringify(arrive(spawns, a, here)) !== JSON.stringify(want))\nconsole.log(bad ? \'Arriving at \' + JSON.stringify(bad[0]) + \' should stand at \' + JSON.stringify(bad[1]) + \', not \' + JSON.stringify(arrive(spawns, bad[0], here)) + \'.\' : \'✓ Every arrival stands in the right place.\')',
                solutionCode: '// Challenge: arrive(spawns, arriveAt, fallback) returns where the hero stands: the spawn point named arriveAt if the\n// map has one, otherwise fallback (where the scene put the hero). spawns is { name: { x, y } }.\nfunction arrive(spawns, arriveAt, fallback) {\n  return (arriveAt && spawns[arriveAt]) || fallback\n}\nconst spawns = { FromTown: { x: 32, y: 88 }, Campfire: { x: 160, y: 132 } }, here = { x: 56, y: 96 }\nconst cases = [[\'FromTown\', spawns.FromTown], [\'Campfire\', spawns.Campfire], [\'Nowhere\', here], [undefined, here], [\'\', here]]\nconst bad = cases.find(([a, want]) => JSON.stringify(arrive(spawns, a, here)) !== JSON.stringify(want))\nconsole.log(bad ? \'Arriving at \' + JSON.stringify(bad[0]) + \' should stand at \' + JSON.stringify(bad[1]) + \', not \' + JSON.stringify(arrive(spawns, bad[0], here)) + \'.\' : \'✓ Every arrival stands in the right place.\')',
              },
            ],
          },
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Two maps and a hero',
        props: {
          task: 'qb-maps',
          lesson: 'mg11-002',
          checkpoint: 'cp-mg11-002-7',
        },
      },
      {
        id: 'GameStudioTask',
        title: 'Two maps and the doors between them',
        props: {
          task: 'qb-doors',
          lesson: 'mg11-002',
          checkpoint: 'cp-mg11-002-4',
        },
      },
    ],
  },
  math: {
    prose: [
      '**Under the hood (optional).** The camera\'s easing: each frame the gap $g$ to the hero shrinks by the factor $e^{-k\\,\\Delta t}$, so after $t$ seconds it is $g_0 e^{-k t}$. Read it as: the gap left is the starting gap times $e$ to the power minus smoothing times time. With $k = 8$ and $t = 0.25$, $e^{-2} \\approx 0.135$, so a 100-pixel gap is 13.5 pixels (cell 2). Writing it with $\\Delta t$ makes it the same at any frame rate: two frames of $\\Delta t$ shrink the gap as much as one of $2\\Delta t$.',
      'The world is a directed graph $G = (M, D)$: $M$ the maps, $D$ the doors, each an arrow $(m_1 \\to m_2)$. Directed because a door one way need not have one back. Breadth-first search visits maps in order of how many doors away they are, so the first time it reaches the goal it has found a shortest route. It looks at each map and each door once: $O(|M| + |D|)$, which reads as "the time grows with the number of maps plus the number of doors".',
    ],
    equations: [
      {
        label: 'The camera\'s gap after t seconds',
        latex: 'g(t) = g_0\\, e^{-k t}',
      },
      {
        label: 'The world as a graph',
        latex: 'G = (M, D),\\quad D \\subseteq M \\times M',
      },
      {
        label: 'Breadth-first search\'s cost',
        latex: 'O(|M| + |D|)',
      },
    ],
    callouts: [],
    visualizations: [],
  },
  rigor: {
    prose: [
      'Spawn points are data in the map, not numbers in the door. Moving the forest\'s entrance means moving one Node2D in the forest; every door into it still works. The door knows only a name.',
      'The order of a frame matters: physics (where bodyEntered runs), then update, then freeing nodes, then the scene switch. State written by the door during physics is there when the new scene\'s ready() runs.',
      'Where it goes: 11.3 makes state last; 11.4 saves which map you are on.',
    ],
    callouts: [],
    visualizations: [],
  },
  examples: [
    {
      id: 'mg11-002-ex1',
      title: 'A third map',
      difficulty: 'easy',
      problem: 'Add a cave north of the forest. What do you add?',
      steps: [
        {
          expression: '\\text{cave.scene with Spawns/FromForest}',
          annotation: 'Where you arrive in the cave.',
          strategyTitle: 'Step 1: the map',
        },
        {
          expression: '\\text{two door scripts}',
          annotation: 'door_to_cave.js and door_to_forest_from_cave.js, each extending Door.',
          strategyTitle: 'Step 2: two doors',
        },
      ],
      answer: 'A cave scene with a spawn point, a door in the forest to the cave, a door in the cave back, and a forest spawn point for arriving from the cave.',
    },
    {
      id: 'mg11-002-ex2',
      title: 'Fewest doors',
      difficulty: 'medium',
      problem: 'In cell 3, why is cave → castle 3 doors?',
      steps: [
        {
          expression: '\\text{cave} \\to \\text{forest} \\to \\text{town} \\to \\text{castle}',
          annotation: 'The castle is reached only from the town.',
          strategyTitle: 'Step 1: follow the arrows',
        },
      ],
      answer: 'There is no shorter way: the castle\'s only door in is from the town.',
    },
    {
      id: 'mg11-002-ex3',
      title: 'Two doors at once',
      difficulty: 'hard',
      problem: 'The hero stands on two doors at once. Which scene loads, and why is that safe?',
      steps: [
        {
          expression: '\\text{last call to change wins}',
          annotation: 'Cell 5.',
          strategyTitle: 'Step 1: the end of the frame',
        },
      ],
      answer: 'The last door\'s scene, at the end of the frame; nothing switches in the middle of a frame, so no script sees half a scene.',
    },
  ],
  challenges: [
    {
      id: 'mg11-002-ch1',
      title: 'A one-way drop',
      difficulty: 'easy',
      problem: 'Make a hole in the forest floor that drops you into the cave, with no way back up through it.',
      hint: 'A door with no door back.',
      answer: 'An Area2D with a script extending Door (target the cave, arriveAt a spawn there), and no matching door in the cave.',
      walkthrough: [],
    },
    {
      id: 'mg11-002-ch2',
      title: 'A door that needs a key',
      difficulty: 'medium',
      problem: 'The cave door only opens when the bag has a key.',
      hint: 'Override bodyEntered.',
      answer: 'In door_to_cave.js: bodyEntered(body) { if (!state.bag.some((i) => i.name === \'Key\')) { scene.get(\'HUD\').say(\'Locked.\'); return; } super.bodyEntered(body); }',
      walkthrough: [],
    },
    {
      id: 'mg11-002-ch3',
      title: 'A world map',
      difficulty: 'hard',
      problem: 'Use the route function from cell 3 to show "3 doors to the castle" in the HUD.',
      hint: 'The doors as data.',
      answer: 'Keep the list of doors in a module; call route(state.map, goal) and show the length.',
      walkthrough: [],
    },
  ],
  semantics: {
    core: [
      {
        symbol: 'scene.change(path)',
        meaning: 'Switch to another scene at the end of this frame.',
      },
      {
        symbol: 'state.arriveAt',
        meaning: 'The spawn point to stand on in the next map.',
      },
      {
        symbol: 'Spawns/Name',
        meaning: 'A Node2D marking where an arriving hero stands.',
      },
      {
        symbol: 'class … extends Door',
        meaning: 'A door that is a Door with its own target and arriveAt.',
      },
    ],
    rulesOfThumb: [
      'One map, one scene.',
      'Doors name places; maps say where those places are.',
      'Arrive a little away from the door.',
      'Write a behaviour once; extend it for each use.',
    ],
  },
  misconceptions: [
    {
      falseBelief: 'scene.change switches immediately.',
      whyStudentsThinkIt: 'It is a function call.',
      correctionExample: 'Cell 3: the rest of the frame still runs in the old scene.',
      contrastCase: 'The switch is at the end of the frame.',
    },
    {
      falseBelief: 'The door should put the hero at x, y.',
      whyStudentsThinkIt: 'It knows where it leads.',
      correctionExample: 'The hero is a new node in the new scene; the door cannot reach it. It names a spawn point instead.',
      contrastCase: 'Within one map, a teleporter can move the hero directly.',
    },
  ],
  transferPrompts: [
    {
      situation: 'Twenty doors between ten maps.',
      competingTechniques: [
        'Twenty copies of the door code',
        'One Door class and twenty three-line scripts',
      ],
      whyThisTechniqueWins: 'A fix to Door fixes every door.',
    },
    {
      situation: 'A fast-travel menu.',
      competingTechniques: [
        'A door for every pair of maps',
        'Set state.arriveAt and call scene.change from the menu',
      ],
      whyThisTechniqueWins: 'A door is just those two lines; anything can do them.',
    },
  ],
  debugging: [
    {
      commonError: 'Arriving on the door\'s area.',
      symptom: 'The hero flickers between two maps.',
      whyItHappened: 'The spawn point is inside the door you arrive by.',
      repairStrategy: 'Move the spawn point away from the door.',
    },
    {
      commonError: 'A spawn point name that does not match.',
      symptom: 'The hero arrives where the scene put it.',
      whyItHappened: 'arriveAt says FromTown, the node is called FromTown2.',
      repairStrategy: 'Match the names exactly; scene.find returns null otherwise.',
    },
    {
      commonError: 'Forgetting to make the wall tile solid.',
      symptom: 'The hero walks straight through the walls.',
      whyItHappened: 'Solid is set on the tileset, per tile; without solid: [40] tile 40 is only a picture.',
      repairStrategy: 'Add the tile number to the tileset\'s solid list.',
    },
    {
      commonError: 'Forgetting the gap in the wall.',
      symptom: 'The hero cannot reach the door.',
      whyItHappened: 'A solid wall tile is in the doorway.',
      repairStrategy: 'Erase that wall cell in the TileMap panel.',
    },
  ],
  mastery: {
    targetLevel: 3,
    solveIndependently: 'Build two maps from tiles and join them with doors and spawn points.',
    explainVerbally: 'Explain why the door writes a name and the map holds the place.',
    detectIncorrectApplication: 'Spot a spawn point on a door, or copied door code.',
    transferToUnfamiliar: 'Lay out a five-map world as a graph and find routes in it.',
  },
  assessment: {
    questions: [
      {
        id: 'mg11-002-assess-1',
        type: 'choice',
        text: 'What does a door write before changing scene?',
        options: ['state.arriveAt', 'The hero\'s x and y', 'The save', 'Nothing'],
        answer: 'state.arriveAt',
        hint: 'Arriving in the right place.',
      },
    ],
  },
  quiz: [
    {
      id: 'mg11-002-quiz-1',
      type: 'choice',
      text: 'In cell 3, town to cave takes',
      options: ['2 doors', '1 door', '3 doors', 'No way through'],
      answer: '2 doors',
      hints: ['Cell 3.'],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg11-002-quiz-2',
      type: 'choice',
      text: 'Castle to forest is',
      options: ['No way through', '1 door', '2 doors', '3 doors'],
      answer: 'No way through',
      hints: [
        'Cell 3: the castle has no door out.',
      ],
      reviewSection: 'Cell 3',
    },
    {
      id: 'mg11-002-quiz-3',
      type: 'choice',
      text: 'Arriving in the forest at FromCave (no such spawn) stands the hero at',
      options: [
        'Where the scene put it, (56, 96)',
        '(32, 88)',
        '(160, 132)',
        '(0, 0)',
      ],
      answer: 'Where the scene put it, (56, 96)',
      hints: ['Cell 4.'],
      reviewSection: 'Cell 4',
    },
    {
      id: 'mg11-002-quiz-4',
      type: 'choice',
      text: 'Two doors touched in one frame: which scene loads?',
      options: ['The last one changed to', 'The first', 'Neither', 'Both'],
      answer: 'The last one changed to',
      hints: ['Cell 5.'],
      reviewSection: 'Cell 5',
    },
    {
      id: 'mg11-002-quiz-5',
      type: 'choice',
      text: 'class extends Door gives a door',
      options: [
        'Door\'s behaviour, with its own target and arriveAt',
        'A copy of the code',
        'A new kind of node',
        'Nothing until it is registered',
      ],
      answer: 'Door\'s behaviour, with its own target and arriveAt',
      hints: ['Write the door once.'],
      reviewSection: 'Intuition — write the door once',
    },
  ],
  checkpoints: [
    {
      id: 'cp-mg11-002-1',
      label: 'Read maps as scenes and doors as areas',
      type: 'read',
    },
    {
      id: 'cp-mg11-002-2',
      label: 'Read spawn points and the Door class',
      type: 'read',
    },
    {
      id: 'cp-mg11-002-3',
      label: 'Run the notebook: the world as a graph',
      type: 'read',
    },
    {
      id: 'cp-mg11-002-4',
      label: 'Complete "Two maps and the doors between them" in Game Studio',
      type: 'lab',
    },
    {
      id: 'cp-mg11-002-5',
      label: 'Work through "Two doors at once"',
      type: 'example',
    },
    {
      id: 'cp-mg11-002-6',
      label: 'Pass the arrive() challenge',
      type: 'challenge',
    },
    {
      id: 'cp-mg11-002-7',
      label: 'Complete "Two maps and a hero" in Game Studio',
      type: 'lab',
    },
  ],
}
