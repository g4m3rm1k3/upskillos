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
  '03-01-the-scene-api#Commit': { run: ['git add .', 'git commit -m "The Scene API begins: findNode and setProp, on scene data"'] },
  '03-02-add-delete-rename#addNode': {
    wrong: [{ name: 'stores the caller\'s object', files: { 'src/editor/scene-api.ts': "import type { NodeData, PropValue, SceneData } from '../engine/scene';\n\nexport function findNode(scene: SceneData, path: string): NodeData {\n  const [rootName, ...names] = path.split('/');\n  if (rootName !== scene.root.name) throw new Error(`There is no node at \"${path}\"`);\n  let node = scene.root;\n  for (const name of names) {\n    const child = node.children.find((c) => c.name === name);\n    if (!child) throw new Error(`There is no node at \"${path}\"`);\n    node = child;\n  }\n  return node;\n}\n\nexport function setProp(scene: SceneData, path: string, key: string, value: PropValue): void {\n  findNode(scene, path).props[key] = value;\n}\n\nexport function addNode(scene: SceneData, parentPath: string, node: NodeData): void {\n  const parent = findNode(scene, parentPath);\n  if (parent.children.some((c) => c.name === node.name)) {\n    throw new Error(`\"${parentPath}\" already has a child called \"${node.name}\"`);\n  }\n  parent.children.push(node);\n}\n" }, fails: [0] }],
  },
  '03-02-add-delete-rename#Commit': { run: ['git add .', 'git commit -m "Scene API: addNode, deleteNode and renameNode, keeping sibling names unique"'] },
  '03-03-undo-with-commands#Commit': { run: ['git add .', 'git commit -m "History with undo and redo stacks; commands for setProp and deleteNode"'] },
  '03-04-undo-with-snapshots#Snapshots': {
    wrong: [{ name: 'no rollback when an edit fails', files: { 'src/editor/commands.ts': "import type { PropValue, SceneData } from '../engine/scene';\nimport type { Command } from './history';\nimport { deleteNode, renameNode, setProp } from './scene-api';\n\nexport function snapshotCommand(scene: SceneData, label: string, edit: (scene: SceneData) => void): Command {\n  let before = '';\n  let after = '';\n  return {\n    label,\n    run: () => {\n      if (after !== '') {\n        scene.root = JSON.parse(after);\n        return;\n      }\n      before = JSON.stringify(scene.root);\n      edit(scene);\n      after = JSON.stringify(scene.root);\n    },\n    undo: () => {\n      scene.root = JSON.parse(before);\n    },\n  };\n}\n\nexport function setPropCommand(scene: SceneData, path: string, key: string, value: PropValue): Command {\n  return snapshotCommand(scene, `Set ${key} of ${path}`, (s) => setProp(s, path, key, value));\n}\n\nexport function deleteNodeCommand(scene: SceneData, path: string): Command {\n  return snapshotCommand(scene, `Delete ${path}`, (s) => deleteNode(s, path));\n}\n\nexport function renameNodeCommand(scene: SceneData, path: string, newName: string): Command {\n  return snapshotCommand(scene, `Rename ${path} to ${newName}`, (s) => renameNode(s, path, newName));\n}\n" }, fails: [0] }],
  },
  '03-04-undo-with-snapshots#Commit': { run: ['git add .', 'git commit -m "Undo by snapshots: one undo for every command, and failed changes roll back"'] },
  '03-05-each-change-as-code#Commit': { run: ['git add .', 'git commit -m "Each command carries its line of code; the history\'s log follows undo and redo"'] },
  '03-06-running-the-code#Commit': { run: ['git add .', 'git commit -m "Scripts: a scene facade over the commands, runCode, and a replay test for the log"'] },
  '03-07-a-console-in-the-app#Commit, and tick the stories': {
    editFiles: { 'BACKLOG.md': [
      ['- [ ] As a game maker, I want to undo any change to my scene', '- [x] As a game maker, I want to undo any change to my scene'],
      ['- [ ] As a game maker, I want to redo what I undid', '- [x] As a game maker, I want to redo what I undid'],
      ['- [ ] As a game maker, I want to see each change I make as a line of code', '- [x] As a game maker, I want to see each change I make as a line of code']
    ] },
    run: ['git add .', 'git commit -m "A console in the app: Scene API lines, a code log, undo and redo"'],
  },
  '03-08-sprint-3-review#Commit, and tag 0.4.0': {
    run: ['git add .', 'git commit -m "Sprint 3 review: version 0.4.0, ADR 4, retrospective, Sprint 4 stories"', 'git tag -a v0.4.0 -m "Sprint 3: changes that can be undone"'],
  },
  '04-01-react-and-a-first-component#Install React': {
    run: ['npm install --save-exact react@19.3.0 react-dom@19.3.0', 'npm install --save-dev --save-exact @types/react@19.3.0 @types/react-dom@19.3.0 @vitejs/plugin-react@6.1.2'],
  },
  '04-01-react-and-a-first-component#main.ts becomes main.tsx': { run: ['git mv src/main.ts src/main.tsx'] },
  '04-01-react-and-a-first-component#Commit': { run: ['git add .', 'git commit -m "React: the title is a component, tested by its HTML"'] },
  '04-02-the-editor-store#The store': {
    wrong: [{ name: 'stops at the error, as lesson 3.7 did', files: { 'src/editor/store.ts': "import type { SceneData } from '../engine/scene';\nimport { History } from './history';\nimport { runCode, sceneScript, type SceneScript } from './script';\n\nexport type Check = (scene: SceneData) => void;\n\nexport class EditorStore {\n  readonly history = new History();\n  readonly script: SceneScript;\n  problem = '';\n\n  constructor(\n    readonly scene: SceneData,\n    private readonly check: Check,\n  ) {\n    this.script = sceneScript(scene, this.history);\n  }\n\n  run(code: string): void {\n    this.change(() => runCode(code, this.script));\n  }\n\n  undo(): void {\n    this.change(() => {\n      if (!this.history.undo()) this.problem = 'Nothing to undo';\n    });\n  }\n\n  redo(): void {\n    this.change(() => {\n      if (!this.history.redo()) this.problem = 'Nothing to redo';\n    });\n  }\n\n  private change(action: () => void): void {\n    this.problem = '';\n    try {\n      action();\n    } catch (error) {\n      this.problem = (error as Error).message;\n      return;\n    }\n    this.checkOrUndo();\n  }\n\n  private checkOrUndo(): void {\n    try {\n      this.check(this.scene);\n    } catch (error) {\n      this.history.undo();\n      this.check(this.scene);\n      this.problem = `That change was undone: ${(error as Error).message}`;\n    }\n  }\n}\n" }, fails: [0] }],
  },
  '04-02-the-editor-store#Commit': { run: ['git add .', 'git commit -m "The editor\'s store: changes, undo, the problem, the selection, and listeners"'] },
  '04-03-the-console-as-a-component#Commit': { run: ['git add .', 'git commit -m "The console is a React component that reads the store"'] },
  '04-04-panels-around-the-game#A test for the layout': {
    wrong: [{ name: 'Phaser started while drawing, not in an effect', files: { 'e2e/editor.test.ts': "import { expect, test } from 'vitest';\nimport { _electron as electron } from 'playwright';\n\ntest('the editor shows its panels, with the game drawn in the centre one', async () => {\n  const app = await electron.launch({ args: ['.'] });\n  try {\n    const page = await app.firstWindow();\n    await expect.poll(() => page.locator('.centre #game canvas').count()).toBe(1);\n    expect(await page.textContent('.left h2')).toBe('Scene');\n    expect(await page.textContent('.right h2')).toBe('Inspector');\n  } finally {\n    await app.close();\n  }\n}, 30000);\n", 'src/ui/GameView.tsx': "import Phaser from 'phaser';\nimport { useRef } from 'react';\nimport { drawTree } from '../engine/draw';\nimport type { Game } from '../engine/game';\n\nexport function GameView({ game, readout }: { game: Game; readout: () => string }) {\n  const holder = useRef<HTMLDivElement>(null);\n  const shown = useRef<HTMLSpanElement>(null);\n\n  {\n    class Play extends Phaser.Scene {\n      private graphics!: Phaser.GameObjects.Graphics;\n\n      create(): void {\n        this.graphics = this.add.graphics();\n      }\n\n      override update(_time: number, delta: number): void {\n        game.frame(delta / 1000);\n        this.graphics.clear();\n        drawTree(game.root, this.graphics);\n        if (shown.current) shown.current.textContent = readout();\n      }\n    }\n\n    const phaser = new Phaser.Game({\n      type: Phaser.AUTO,\n      width: 800,\n      height: 450,\n      parent: holder.current,\n      backgroundColor: '#1d2330',\n      scene: Play,\n    });\n  }\n\n  return (\n    <div>\n      <div id=\"game\" ref={holder}></div>\n      <p>\n        Player x: <span id=\"player-x\" ref={shown}></span>\n      </p>\n    </div>\n  );\n}\n" }, fails: [0] }],
  },
  '04-04-panels-around-the-game#Commit, and tick the first story': {
    editFiles: { 'BACKLOG.md': [['- [ ] As a game maker, I want the editor laid out in panels', '- [x] As a game maker, I want the editor laid out in panels']] },
    run: ['git add .', 'git commit -m "The editor\'s layout: App, a game view with an effect, and a CSS grid"'],
  },
  '04-05-the-scene-tree-panel#Commit, and tick the second story': {
    editFiles: { 'BACKLOG.md': [['- [ ] As a game maker, I want to see my scene\'s tree', '- [x] As a game maker, I want to see my scene\'s tree']] },
    run: ['git add .', 'git commit -m "The scene tree panel: the scene as an outline, click to select"'],
  },
  '04-06-a-registry-of-node-types#The player in the registry': {
    wrong: [{ name: 'the player inherits Box\'s colour default', files: { 'src/game/player.ts': "import { Box } from '../engine/box';\nimport type { Input } from '../engine/input';\nimport type { TypeDef } from '../engine/registry';\n\nconst SPEED = 200;\n\nexport const PLAYER_TYPE: TypeDef = {\n  base: 'Box',\n  props: [],\n};\n\nexport function addMoveActions(input: Input): void {\n  input.addAction('left', ['ArrowLeft', 'KeyA']);\n  input.addAction('right', ['ArrowRight', 'KeyD']);\n  input.addAction('up', ['ArrowUp', 'KeyW']);\n  input.addAction('down', ['ArrowDown', 'KeyS']);\n}\n\nexport class Player extends Box {\n  input: Input;\n\n  constructor(name: string, input: Input) {\n    super(name);\n    this.input = input;\n    this.color = 0x4fc3f7;\n  }\n\n  override update(dt: number): void {\n    const direction = this.input.vector('left', 'right', 'up', 'down');\n    this.position = this.position.add(direction.scale(SPEED * dt));\n  }\n}\n" }, fails: [0] }],
  },
  '04-06-a-registry-of-node-types#Commit': { run: ['git add .', 'git commit -m "A registry of node types and their properties, held to the engine by a test"'] },
  '04-07-the-inspector#Editing end to end': {
    wrong: [{ name: 'no key on the number box\'s draft', files: { 'e2e/editor.test.ts': "import { expect, test } from 'vitest';\nimport { _electron as electron } from 'playwright';\n\ntest('the editor shows its panels, with the game drawn in the centre one', async () => {\n  const app = await electron.launch({ args: ['.'] });\n  try {\n    const page = await app.firstWindow();\n    await expect.poll(() => page.locator('.centre #game canvas').count()).toBe(1);\n    expect(await page.textContent('.left h2')).toBe('Scene');\n    expect(await page.textContent('.right h2')).toBe('Inspector');\n  } finally {\n    await app.close();\n  }\n}, 30000);\n\ntest('clicking a node in the scene tree selects it', async () => {\n  const app = await electron.launch({ args: ['.'] });\n  try {\n    const page = await app.firstWindow();\n    await page.click('[data-path=\"level/player\"]');\n    await expect.poll(() => page.getAttribute('[data-path=\"level/player\"]', 'class')).toBe('selected');\n    expect(await page.getAttribute('[data-path=\"level/wall\"]', 'class')).toBe('');\n  } finally {\n    await app.close();\n  }\n}, 30000);\n\ntest('changing a property in the inspector changes the game, is logged as code, and can be undone', async () => {\n  const app = await electron.launch({ args: ['.'] });\n  try {\n    const page = await app.firstWindow();\n    await page.click('[data-path=\"level/player\"]');\n    await page.fill('#prop-position-x', '100');\n    await page.press('#prop-position-x', 'Enter');\n    await expect.poll(() => page.textContent('#player-x')).toBe('100');\n    expect(await page.inputValue('#prop-position-x')).toBe('100');\n    expect(await page.textContent('#log')).toBe('scene.setProp(\"level/player\", \"position\", { x: 100, y: 225 });');\n    await page.click('#undo');\n    await expect.poll(() => page.textContent('#player-x')).toBe('400');\n    expect(await page.inputValue('#prop-position-x')).toBe('400');\n  } finally {\n    await app.close();\n  }\n}, 30000);\n", 'src/ui/Inspector.tsx': "import { useState } from 'react';\nimport { fromHex, toHex } from '../editor/color';\nimport { findNode } from '../editor/scene-api';\nimport type { EditorStore } from '../editor/store';\nimport { propsOf, propValue, type PropDef, type TypeDef } from '../engine/registry';\nimport type { PropValue } from '../engine/scene';\nimport { useStore } from './useStore';\n\nexport function Inspector({ store, types }: { store: EditorStore; types: ReadonlyMap<string, TypeDef> }) {\n  useStore(store);\n  const path = store.selected;\n  if (path === null) return <p>Select a node in the scene tree.</p>;\n  const node = findNode(store.scene, path);\n  return (\n    <div>\n      <p>\n        {node.name} <small>{node.type}</small>\n      </p>\n      {propsOf(types, node.type).map((prop) => (\n        <PropField\n          key={`${path}.${prop.name}`}\n          prop={prop}\n          value={propValue(node, prop)}\n          onChange={(value) => store.setProp(path, prop.name, value)}\n        />\n      ))}\n    </div>\n  );\n}\n\nfunction PropField({ prop, value, onChange }: { prop: PropDef; value: PropValue; onChange: (value: PropValue) => void }) {\n  const id = `prop-${prop.name}`;\n  if (typeof value === 'object') {\n    return (\n      <div className=\"field\">\n        <span>{prop.name}</span>\n        <NumberInput id={`${id}-x`} value={value.x} onChange={(x) => onChange({ x, y: value.y })} />\n        <NumberInput id={`${id}-y`} value={value.y} onChange={(y) => onChange({ x: value.x, y })} />\n      </div>\n    );\n  }\n  return (\n    <div className=\"field\">\n      <label htmlFor={id}>{prop.name}</label>\n      {prop.kind === 'color' ? (\n        <Draft key={value} id={id} type=\"color\" text={toHex(value)} onCommit={(text) => onChange(fromHex(text))} />\n      ) : (\n        <NumberInput id={id} value={value} onChange={onChange} />\n      )}\n    </div>\n  );\n}\n\nfunction NumberInput({ id, value, onChange }: { id: string; value: number; onChange: (value: number) => void }) {\n  return (\n    <Draft\n      id={id}\n      type=\"number\"\n      text={String(value)}\n      onCommit={(text) => {\n        const number = Number(text);\n        if (text.trim() !== '' && Number.isFinite(number)) onChange(number);\n      }}\n    />\n  );\n}\n\nfunction Draft({ id, type, text, onCommit }: { id: string; type: string; text: string; onCommit: (text: string) => void }) {\n  const [draft, setDraft] = useState(text);\n\n  function commit(): void {\n    if (draft !== text) onCommit(draft);\n    setDraft(text);\n  }\n\n  return (\n    <input\n      id={id}\n      type={type}\n      value={draft}\n      onChange={(event) => setDraft(event.target.value)}\n      onBlur={commit}\n      onKeyDown={(event) => {\n        if (event.key === 'Enter') commit();\n      }}\n    />\n  );\n}\n" }, fails: [0] }],
  },
  '04-07-the-inspector#Commit, and tick the third story': {
    editFiles: { 'BACKLOG.md': [['- [ ] As a game maker, I want to see and change the selected node\'s properties', '- [x] As a game maker, I want to see and change the selected node\'s properties']] },
    run: ['git add .', 'git commit -m "The inspector: fields from the registry, drafts committed as commands"'],
  },
  '04-08-sprint-4-review#Commit, and tag 0.5.0': {
    run: ['git add .', 'git commit -m "Sprint 4 review: version 0.5.0, ADR 5, retrospective, Sprint 5 stories"', 'git tag -a v0.5.0 -m "Sprint 4: an editor"'],
  },
};
