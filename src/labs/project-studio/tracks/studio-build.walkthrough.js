// What a learner does at each step of "Build Your Own Game Studio", for the walkthrough test
// (studioBuild.desktop.test.js). Keyed "<lesson file name>#<step title>". A step's file (its ```lang file=... block)
// is typed in for the learner; an entry adds what else they do:
//   run:       commands typed in the terminal (they must work in PowerShell and in zsh)
//   editFiles: { file: [[from, to], ...] } edits made by hand to a file the step does not show whole
//   wrong:     wrong answers, tried on a copy of the project before the step; each lists the indexes of the step's
//              checks that must fail ("fails")
export const WALKTHROUGH = {
  '00-01-the-plan-and-a-repository#A repository': { run: ['git init'] },
  '00-01-the-plan-and-a-repository#Line endings, the same everywhere': {
    wrong: [{ name: 'no eol rule', files: { '.gitattributes': '* text=auto\n' }, fails: [1] }],
  },
  '00-01-the-plan-and-a-repository#The first commit': {
    run: ['git add .', 'git commit -m "Start the studio: backlog, line endings, ignored folders"'],
    wrong: [{ name: 'staged, not committed', run: ['git add .'], fails: [0, 1] }],
  },
  '00-01-the-plan-and-a-repository#Tick the story': {
    run: ['git commit -am "Sprint 0: changes are recorded"'],
    wrong: [{ name: 'ticked, not committed', editFiles: { 'BACKLOG.md': [['- [ ] As a developer, I want every change recorded', '- [x] As a developer, I want every change recorded']] }, fails: [0, 1] }],
  },
  '00-02-node-and-package-json#Splitting a program into modules': {
    wrong: [{ name: 'not exported', files: { 'src/greet.js': "function greet(name) {\n  return 'Hello, ' + name + '!';\n}\n" }, fails: [0] }],
  },
  '00-02-node-and-package-json#Commit': { run: ['git add .', 'git commit -m "A first Node program, package.json, and a module"'] },
  '00-03-typescript#Installing a tool': { run: ['npm install --save-dev --save-exact typescript@7.0.2'] },
  '00-03-typescript#Rename greet.js': { run: ['git mv src/greet.js src/greet.ts'] },
  '00-03-typescript#What the checker catches': {},
  '00-03-typescript#Delete the mistake': { run: ['node -e "require(\'fs\').rmSync(\'src/oops.ts\')"'] },
  '00-03-typescript#A script for the checker, and goodbye to hello.js': { run: ['git rm -q hello.js'] },
  '00-03-typescript#Commit, and tick the story': {
    editFiles: { 'BACKLOG.md': [['- [ ] As a developer, I want my code type-checked', '- [x] As a developer, I want my code type-checked']] },
    run: ['git add .', 'git commit -m "TypeScript: greet is typed and checked"'],
  },
  '00-04-tests-first#Install Vitest': { run: ['npm install --save-dev --save-exact vitest@5.0.3'] },
  '00-04-tests-first#Green: make it pass': {
    wrong: [{ name: 'only the empty case', files: { 'src/greet.ts': "export function greet(name: string): string {\n  return 'Hello!';\n}\n" }, fails: [0] }],
  },
  '00-04-tests-first#Commit, and tick the story': {
    editFiles: { 'BACKLOG.md': [['- [ ] As a developer, I want automated tests', '- [x] As a developer, I want automated tests']] },
    run: ['git add .', 'git commit -m "Vitest: greet\'s tests, and greeting nobody"'],
  },
  '00-05-a-page-with-vite#Install Vite': { run: ['npm install --save-dev --save-exact vite@8.3.3'] },
  '00-05-a-page-with-vite#Code for the page': {
    wrong: [{ name: 'no null check', files: { 'src/main.ts': "import { greet } from './greet';\n\ndocument.querySelector('#title').textContent = greet('Studio');\n" }, fails: [0] }],
  },
  '00-05-a-page-with-vite#The dev server': {
    wrong: [{ name: 'misspelled selector', files: { 'src/main.ts': "import { greet } from './greet';\n\nconst title = document.querySelector('#titel');\nif (title) title.textContent = greet('Studio');\n" }, fails: [0] }],
  },
  '00-05-a-page-with-vite#Scripts, and commit': { run: ['git add .', 'git commit -m "Vite: a page that greets the studio"'] },
  '00-06-an-electron-window#Install Electron': { run: ['npm install --save-dev --save-exact electron@44.6.0'] },
  '00-06-an-electron-window#The main process': {
    wrong: [{ name: 'missing bracket', files: { 'electron/main.js': "import { app, BrowserWindow } from 'electron';\n\nfunction openWindow() {\n  const win = new BrowserWindow({ width: 1000, height: 700 });\n\napp.whenReady().then(openWindow);\n" }, fails: [1] }],
  },
  '00-06-an-electron-window#Relative paths: vite.config.ts': {
    wrong: [{ name: 'base left as /', files: { 'vite.config.ts': "import { defineConfig } from 'vite';\n\nexport default defineConfig({});\n" }, fails: [1] }],
  },
  '00-06-an-electron-window#Commit': { run: ['git add .', 'git commit -m "Electron: the page in a window of its own"'] },
  '00-07-testing-the-window#Install Playwright': { run: ['npm install --save-dev --save-exact playwright@1.63.0'] },
  '00-07-testing-the-window#A script that builds first': {
    wrong: [{ name: 'tests the old build', files: { 'src/main.ts': "import { greet } from './greet';\n\nconst title = document.querySelector('#title');\nif (title) title.textContent = greet('Studio!');\n" }, fails: [0] }],
  },
  '00-07-testing-the-window#Commit, and tick the story': {
    editFiles: { 'BACKLOG.md': [['- [ ] As a user, I want the studio to open in its own window', '- [x] As a user, I want the studio to open in its own window']] },
    run: ['git add .', 'git commit -m "An end-to-end test: the window greets the studio"'],
  },
  '00-08-sprint-review#One command for "done"': {
    wrong: [{ name: 'broken greeting', files: { 'src/greet.ts': "export function greet(name: string): string {\n  return `Hello, ${name}`;\n}\n" }, fails: [0] }],
  },
  '00-08-sprint-review#Commit, and tag the release': {
    run: ['git add .', 'git commit -m "Sprint 0 review: decision record, retrospective, Sprint 1 stories"', 'git tag -a v0.1.0 -m "Sprint 0: the tools, and a window"'],
    wrong: [{ name: 'committed, not tagged', run: ['git add .', 'git commit -m "Sprint 0 review"'], fails: [1] }],
  },
  '01-01-vectors#Commit': { run: ['git add .', 'git commit -m "Vec2: positions and velocities, with add, scale, length and normalized"'] },
  '01-02-the-scene-tree#Removing a child': {
    wrong: [{ name: 'only one link undone', files: { 'src/engine/node.ts': "export class Node {\n  name: string;\n  parent: Node | null = null;\n  children: Node[] = [];\n\n  constructor(name: string) {\n    this.name = name;\n  }\n\n  addChild(child: Node): void {\n    if (child.parent) throw new Error(`\"${child.name}\" already has a parent`);\n    child.parent = this;\n    this.children.push(child);\n  }\n\n  removeChild(child: Node): void {\n    this.children.splice(this.children.indexOf(child), 1);\n  }\n}\n" }, fails: [0] }],
  },
  '01-02-the-scene-tree#Commit': { run: ['git add .', 'git commit -m "Node: the scene tree, with addChild, removeChild and get"'] },
  '01-03-positions-in-the-tree#Commit': { run: ['git add .', 'git commit -m "Node2D: local positions, and global positions worked out up the tree"'] },
  '01-04-update-and-delta-time#Commit': { run: ['git add .', 'git commit -m "update and updateTree: every node moves each frame, by delta time"'] },
  '01-05-the-game-loop#Commit': { run: ['git add .', 'git commit -m "FixedLoop: fixed time steps from an accumulator, at most a quarter second per frame"'] },
  '01-06-input#The moment of a press': {
    wrong: [{ name: 'repeats count as presses', files: { 'src/engine/input.ts': "export class Input {\n  private readonly actions = new Map<string, string[]>();\n  private readonly held = new Set<string>();\n  private readonly pressedThisStep = new Set<string>();\n\n  addAction(name: string, keys: string[]): void {\n    this.actions.set(name, keys);\n  }\n\n  key(code: string, down: boolean): void {\n    if (down) this.pressedThisStep.add(code);\n    if (down) this.held.add(code);\n    else this.held.delete(code);\n  }\n\n  isPressed(action: string): boolean {\n    return this.keysOf(action).some((code) => this.held.has(code));\n  }\n\n  isJustPressed(action: string): boolean {\n    return this.keysOf(action).some((code) => this.pressedThisStep.has(code));\n  }\n\n  endStep(): void {\n    this.pressedThisStep.clear();\n  }\n\n  private keysOf(action: string): string[] {\n    const keys = this.actions.get(action);\n    if (!keys) throw new Error(`There is no input action \"${action}\"`);\n    return keys;\n  }\n}\n" }, fails: [0] }],
  },
  '01-06-input#Commit': { run: ['git add .', 'git commit -m "Input: actions, held keys, presses counted once per step, axes and directions"'] },
  '01-07-the-game#Commit': { run: ['git add .', 'git commit -m "Game: one frame runs the fixed steps, updates the tree, and ends each step\'s input"'] },
  '01-08-drawing-the-tree#drawTree': {
    wrong: [{ name: 'drawn from the corner, not the centre', files: { 'src/engine/draw.ts': "import { Box } from './box';\nimport type { Node } from './node';\n\nexport interface Painter {\n  fillStyle(color: number): unknown;\n  fillRect(x: number, y: number, width: number, height: number): unknown;\n}\n\nexport function drawTree(node: Node, painter: Painter): void {\n  if (node instanceof Box) {\n    const corner = node.globalPosition;\n    painter.fillStyle(node.color);\n    painter.fillRect(corner.x, corner.y, node.size.x, node.size.y);\n  }\n  for (const child of node.children) drawTree(child, painter);\n}\n" }, fails: [0] }],
  },
  '01-08-drawing-the-tree#Commit': { run: ['git add .', 'git commit -m "drawTree draws boxes through a Painter; a Player the arrow keys move"'] },
  '01-09-phaser-draws-it#Install Phaser': { run: ['npm install --save-exact phaser@4.2.1'] },
  '01-09-phaser-draws-it#Commit, and tick the stories': {
    editFiles: { 'BACKLOG.md': [
      ['- [ ] As a game maker, I want to see my scene drawn', '- [x] As a game maker, I want to see my scene drawn'],
      ['- [ ] As a game maker, I want a scene made of objects', '- [x] As a game maker, I want a scene made of objects'],
      ['- [ ] As a player, I want things to move at the same speed', '- [x] As a player, I want things to move at the same speed'],
      ['- [ ] As a player, I want the keyboard to control the game', '- [x] As a player, I want the keyboard to control the game']
    ] },
    run: ['git add .', 'git commit -m "Phaser draws the tree; the arrow keys move the player"'],
  },
  '01-10-sprint-1-review#Commit, and tag 0.2.0': {
    run: ['git add .', 'git commit -m "Sprint 1 review: version 0.2.0, ADR 2, retrospective, Sprint 2 stories"', 'git tag -a v0.2.0 -m "Sprint 1: an engine, drawn by Phaser"', 'git log --oneline v0.1.0..v0.2.0', 'git diff --stat v0.1.0 v0.2.0'],
  },
  '02-01-scenes-as-data#Commit': { run: ['git add .', 'git commit -m "A data model for scenes: NodeData and SceneData, as JSON"'] },
  '02-02-building-nodes-from-data#Makers, and buildNode': {
    wrong: [{ name: 'a plain object of makers', files: { 'src/engine/build.ts': "import { Box } from './box';\nimport { Node } from './node';\nimport { Node2D } from './node2d';\nimport type { NodeData } from './scene';\n\nexport type Maker = (name: string) => Node;\n\nexport const ENGINE_MAKERS: Record<string, Maker> = {\n  Node: (name) => new Node(name),\n  Node2D: (name) => new Node2D(name),\n  Box: (name) => new Box(name),\n};\n\nexport function buildNode(data: NodeData, makers: Record<string, Maker>): Node {\n  const make = makers[data.type];\n  const node = make(data.name);\n  for (const child of data.children) node.addChild(buildNode(child, makers));\n  return node;\n}\n" }, fails: [0] }],
  },
  '02-02-building-nodes-from-data#Commit': { run: ['git add .', 'git commit -m "buildNode: live nodes from scene data, with makers games can extend"'] },
  '02-03-properties#Commit': { run: ['git add .', 'git commit -m "Props from scene data onto nodes, with an allow list and errors that give the path"'] },
  '02-04-checking-a-scene-file#Commit': { run: ['git add .', 'git commit -m "parseScene: scene files are checked at the border, with paths in every error"'] },
  '02-05-the-game-starts-from-a-file#Commit, and tick the stories': {
    editFiles: { 'BACKLOG.md': [
      ['- [ ] As a game maker, I want my scene stored as plain text', '- [x] As a game maker, I want my scene stored as plain text'],
      ['- [ ] As a game maker, I want the game to start from the scene file', '- [x] As a game maker, I want the game to start from the scene file'],
      ['- [ ] As a game maker, I want a clear message when a scene file is wrong', '- [x] As a game maker, I want a clear message when a scene file is wrong']
    ] },
    run: ['git add .', 'git commit -m "The game starts from scenes/main.json; a broken scene shows what\'s wrong"'],
  },
  '02-06-sprint-2-review#Commit, and tag 0.3.0': {
    run: ['git add .', 'git commit -m "Sprint 2 review: version 0.3.0, ADR 3, retrospective, Sprint 3 stories"', 'git tag -a v0.3.0 -m "Sprint 2: scenes as data"'],
  },
};
