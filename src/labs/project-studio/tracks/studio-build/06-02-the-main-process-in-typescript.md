---
title: 6.2 — The Main Process, in TypeScript
track: Build Your Own Game Studio
runtime: none
concepts: processes, electron-main-process, git-branches, acceptance-tests, type-stripping, tsconfig-extends
problem: The studio's scene is baked into the page when it's built, so it can never change on disk. To save and open real files, the part of Electron that can touch your disk has to take part. What is that part, why is it kept apart from the page, and how does it join the TypeScript code?
---

Sprint 6 makes the studio work with real files: save the scene, open a project folder, export a zip. Before any of that can work, the studio has to *read* its scene from a folder on your disk while it runs. Today it doesn't:

- `src/main.tsx` imports `../scenes/main.json?raw` (lesson 2.5). Vite copies the file's text into the page's JavaScript when it builds the app.
- So the scene is part of the program, like a string typed into the code. Change `scenes/main.json` and the studio shows the old scene until you build it again. There's no file for it to write back to.

This lesson and the next two make the studio open a **project folder**: a folder on your disk holding a game's files, starting with `scenes/main.json`. You'll be able to start it with `npm start -- <folder>`. Saving (lessons 6.5 and 6.6) and choosing a folder from a dialog (6.7) build on that.

## Two processes

A **process** is a running program, with its own memory, that the operating system keeps apart from every other one. One program can be several processes: your browser runs one for each tab, so a tab that crashes doesn't take the others with it.

An Electron app is at least two processes:

- The **main process** runs `electron/main.js` (lesson 0.6). It's Node: it can read and write files, open windows and dialogs, and start other programs. There is one.
- A **renderer process** runs the page in each window: `index.html`, and everything `src/main.tsx` builds. It's a web page, in Chromium. Since lesson 0.6 every line of the studio's own code has run here.

The renderer can't touch your files, and that's on purpose:

- A page runs whatever code it's given. In Sprint 7, the studio runs game scripts; later, a game might load things from the internet. If any of that code could read your files, one bad script could read your documents, or delete them.
- So Electron gives the page what a website gets, and no more: no files, no programs. Only the main process has those powers, and it decides, one request at a time, what the page may ask for.
- This line between what may touch your files and what may not is a **security boundary**. Sprint 6 is about getting a request across it safely: "load the scene", "save this text".

Lesson 6.4 builds the bridge. This lesson gets the main process ready: in TypeScript, like the rest of the studio, and with a test that says what the whole change must do.

## A branch for the story

Getting the scene from a folder takes three lessons. In between, the test that describes it will fail, on purpose, until the last step of lesson 6.4. Committing a failing test to the line of history the app is built from breaks the definition of done (`npm run check` passes) for everyone who uses that line. Git's answer is a branch.

```powershell
git branch -m main
git switch -c project-folders
```

- A **branch** is a name for a line of commits. Every repository has one from the start. Each commit you make moves the current branch's name forward to it.
- `git branch -m main` renames the current branch to `main` (`-m` is for "move"). Depending on how Git was set up on your computer, the first branch was called `master` or `main`; this makes it `main` either way, so these lessons can name it. If it was already `main`, nothing changes.
- `git switch -c project-folders` creates (`-c`) a new branch called `project-folders`, starting at the commit you're on, and switches to it. Your files don't change: both branches point at the same commit, for now.
- From here, commits go onto `project-folders`. `main` stays where it is, with every test passing. When the story's slice works, lesson 6.4 **merges** the branch: it brings its commits into `main`.
- A branch per piece of work, merged when it's done, is how most teams work: `main` is always in a state you could ship, and unfinished work lives beside it.

```check
git-branch project-folders
```

## The example project

The scene the studio has always shown becomes an example project: a folder of its own, `example/`, which the studio opens when you don't name another. Move it with Git:

```powershell
mkdir example
git mv scenes example/scenes
```

- `mkdir example` makes the new folder (**m**a**k**e **dir**ectory; the same command in PowerShell and zsh). `git mv` only moves things into a folder that exists already.
- `git mv` moves a file or folder and tells Git about it in one go, so Git records a move, not a deletion and a new file. `git log --follow example/scenes/main.json` still shows the file's history from lesson 2.5.

Then change `src/main.tsx`, whose import must follow the file:

```tsx file=src/main.tsx
import { createRoot } from 'react-dom/client';
import mainScene from '../example/scenes/main.json?raw';
import { buildNode, ENGINE_MAKERS, type Maker } from './engine/build';
import { Game } from './engine/game';
import type { Node } from './engine/node';
import { parseScene } from './engine/parse';
import type { SceneData } from './engine/scene';
import { EditorStore } from './editor/store';
import { ENGINE_TYPES, type TypeDef } from './engine/registry';
import { addMoveActions, Player, PLAYER_TYPE } from './game/player';
import { App } from './ui/App';

const game = new Game();
addMoveActions(game.input);
const makers = new Map<string, Maker>(ENGINE_MAKERS);
makers.set('Player', (name) => new Player(name, game.input));
const types = new Map<string, TypeDef>(ENGINE_TYPES);
types.set('Player', PLAYER_TYPE);
let player: Player | null = null;

function findPlayer(node: Node): Player | null {
  if (node instanceof Player) return node;
  for (const child of node.children) {
    const found = findPlayer(child);
    if (found) return found;
  }
  return null;
}

function rebuild(scene: SceneData): void {
  const level = buildNode(scene.root, makers);
  for (const child of [...game.root.children]) game.root.removeChild(child);
  game.root.addChild(level);
  player = findPlayer(level);
}

function load(): SceneData {
  const scene = parseScene(mainScene);
  rebuild(scene);
  return scene;
}

function readout(): string {
  return player ? player.position.x.toFixed(0) : '';
}

let scene: SceneData = { formatVersion: 1, root: { type: 'Node', name: 'level', props: {}, children: [] } };
let loadProblem = '';
try {
  scene = load();
} catch (error) {
  loadProblem = `The scene didn't load. ${(error as Error).message}`;
}
const store = new EditorStore(scene, rebuild);
store.problem = loadProblem;

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ') {
    event.preventDefault();
    if (event.shiftKey) store.redo();
    else store.undo();
    return;
  }
  game.input.key(event.code, true);
});
window.addEventListener('keyup', (event) => game.input.key(event.code, false));

const root = document.querySelector('#root');
if (root) createRoot(root).render(<App store={store} game={game} readout={readout} types={types} />);
```

- Only the import changes: `'../example/scenes/main.json?raw'`. The scene is still baked in when the app is built; lesson 6.4 replaces this import.
- The type checker can't catch a wrong path here: `vite-env.d.ts` (lesson 2.5) tells it that *any* name ending in `?raw` is a string. Vite's build is what checks the file exists, so that's the check.

```check
run "npx vite build" label="Vite finds the scene at its new place"
```

## A project folder for a test

The story's test needs a project folder whose scene differs from the example, so a pass means the studio really read *that* folder. Tests shouldn't write into the repository, so the folder goes where the operating system keeps temporary files. Create `e2e/project.ts`:

```ts file=e2e/project.ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function makeProject(playerX: number): string {
  const scene = JSON.parse(fs.readFileSync(path.join('example', 'scenes', 'main.json'), 'utf8'));
  const player = scene.root.children.find((child: { name: string }) => child.name === 'player');
  player.props.position.x = playerX;
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-'));
  fs.mkdirSync(path.join(folder, 'scenes'));
  fs.writeFileSync(path.join(folder, 'scenes', 'main.json'), JSON.stringify(scene, null, 2));
  return folder;
}
```

- `makeProject(playerX)` makes a new project folder with the example's scene in it, except that the player's x is `playerX`, and returns the folder's path. It isn't a test, so its file name has no `.test.`: Vitest only runs files whose names do. Tests import it.
- `fs`, `os` and `path` are Node's own modules for files, the operating system, and file paths. `node:` in front marks them as built into Node, not packages from npm.
- `path.join('example', 'scenes', 'main.json')` joins names into a path with the right separator for the computer it runs on: `example/scenes/main.json` on macOS, `example\scenes\main.json` on Windows. Writing `/` by hand would break on Windows in some places, so paths are always joined.
- `fs.readFileSync(file, 'utf8')` reads the whole file and returns its text; `'utf8'` says how the bytes become characters. `Sync` means the program waits until it's done. In a test helper that's simplest; in the studio itself, lesson 6.3 uses the kind that doesn't wait.
- `JSON.parse` turns the text into objects. Its result has the type `any`: TypeScript doesn't know what's in a file, and `any` switches type checking off for that value. That's tolerable in a small test helper whose mistakes show up at once; the studio itself checks a scene properly, with `parseScene`.
- `scene.root.children.find(…)` returns the first child whose `name` is `'player'`. The parameter's type, `{ name: string }`, says only what the function uses.
- `player.props.position.x = playerX` changes the player's x in the parsed objects.
- `fs.mkdtempSync(path.join(os.tmpdir(), 'studio-'))` makes a new, empty folder. `os.tmpdir()` is the operating system's folder for temporary files. `mkdtemp` ("make temporary directory") adds six random characters to the name it's given, like `studio-a8Xk2p`, so two tests running at the same time never get the same folder.
- `fs.mkdirSync` makes the `scenes` folder inside it, and `fs.writeFileSync` writes the scene there as JSON. In `JSON.stringify(scene, null, 2)`, the `2` puts each key on its own line, indented two spaces per level, as a person would write it; the `null` fills a slot for a function that could change values on the way out, which isn't needed here.

```check
run "npx tsc" label="the helper type-checks"
```

## The acceptance test

The slice's acceptance criterion, as a test: started with a project folder, the studio shows that folder's scene. Create `e2e/files.test.ts`:

```ts file=e2e/files.test.ts
import fs from 'node:fs';
import { expect, test } from 'vitest';
import { _electron as electron } from 'playwright';
import { makeProject } from './project';

test('the studio opens the scene in the project folder it is started with', async () => {
  const folder = makeProject(123);
  const app = await electron.launch({ args: ['.', folder] });
  try {
    const page = await app.firstWindow();
    await expect.poll(() => page.textContent('#player-x')).toBe('123');
  } finally {
    await app.close();
    fs.rmSync(folder, { recursive: true });
  }
}, 30000);
```

- `makeProject(123)` makes a folder whose player is at x 123. The example's player is at 400, so `123` can only come from the folder.
- `electron.launch({ args: ['.', folder] })` starts the app as before, with a second argument: the folder. On the command line that's `electron . <folder>`.
- `expect.poll(…).toBe('123')` waits for the readout to say 123, as in earlier end-to-end tests.
- The `finally` closes the app and deletes the folder, pass or fail. `fs.rmSync(folder, { recursive: true })` deletes the folder and everything in it (`recursive`: the folders inside too). A test that leaves its files behind fills the disk over thousands of runs, and can confuse the next run.
- This is the outer loop of outside-in (lesson 4.4): the test that says the story works, written first. The inner loops, unit tests for each part, come in lessons 6.3 and 6.4.

```check
run "npm run e2e" timeout=180 exit=1 stderr="expected '400' to be '123'" label="the test fails: the studio ignores the folder and shows the built-in scene"
```

It fails on its check, quickly: the readout says 400, the example's player, because nothing reads the folder yet.

## Types for Node

The main process uses Node's modules, and TypeScript needs to know their types. They're in a package of their own:

```powershell
npm install --save-dev --save-exact @types/node@24.19.1
```

- `@types/node` describes Node's built-in modules (`fs`, `path`, …) for TypeScript: every function, with its parameters and return types. It holds no code; it's only types, like `@types/react` in lesson 4.1.
- Version 24 matches the Node inside Electron 44, which is what runs the main process. `--save-dev` because types are only needed while you write and check code.

```check
contains package.json "\"@types/node\": \"24.19.1\""
```

## main.js becomes main.ts

The main process has been one small JavaScript file since lesson 0.6. It's about to grow, so it moves into TypeScript, where the type checker can help with it:

```powershell
git mv electron/main.js electron/main.ts
```

- Nothing in the file has to change: every line of it is already valid TypeScript. TypeScript works out that `openWindow` returns nothing, and lesson 6.4 adds the types the new code needs.
- How does Electron run a `.ts` file? The Node inside Electron (version 24) can **strip types**: it removes the type annotations as it loads the file, leaving JavaScript, and runs that. No build step, no compiled copy.
- Stripping only removes; it never rewrites. So it only works on TypeScript whose extra syntax can simply be deleted. `: void`, `interface` and `type` can. A few TypeScript features can't, because they *generate* code: a constructor's `private readonly` parameter shorthand (lesson 4.2) creates fields and assignments that aren't in the text. Node refuses a file that uses one. The next step makes the type checker refuse it first.

```check
contains electron/main.ts "function openWindow()"
```

## A type check for the main process

The main process is a different place from the page: it has Node's modules and no `document`, and its TypeScript must be strippable. So it gets its own settings. Create `electron/tsconfig.json`:

```json file=electron/tsconfig.json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "types": ["node"],
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true
  },
  "include": ["."]
}
```

- `"extends": "../tsconfig.json"` starts from the project's settings (lesson 0.3): strict checking, no output files, and the rest. Only what's listed here is different.
- `"lib": ["ES2022"]` leaves out `"DOM"`: the main process has no page, so `document` or `window` here is a mistake the checker should catch.
- `"types": ["node"]` uses the `@types/node` just installed, so `import path from 'node:path'` has types.
- `"allowImportingTsExtensions": true` lets an import name a file as `./files.ts`. Node needs the real file name, `.ts` included, because nothing rewrites the imports; Vite and Vitest don't need it, which is why `src/` never writes one.
- `"erasableSyntaxOnly": true` is the rule from the last step: the checker refuses any TypeScript that can't simply be deleted. A mistake that would stop the app starting is caught by `npm run typecheck` instead.
- `"include": ["."]` checks every file in this folder (`.` is "here", the folder `tsconfig.json` is in).
- The project's own `tsconfig.json` includes only `src` and `e2e`, so `npx tsc` still checks those, and `npx tsc -p electron` checks this folder (`-p` names the folder of the settings to use).

```check
run "npx tsc -p electron" label="the main process type-checks"
```

## package.json: the new main file, and both checks

Change `package.json`:

```json file=package.json
{
  "name": "studio",
  "version": "0.6.0",
  "private": true,
  "type": "module",
  "main": "electron/main.ts",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "vite build && electron .",
    "typecheck": "tsc && tsc -p electron",
    "test": "vitest run src",
    "e2e": "vite build && vitest run e2e",
    "check": "npm run typecheck && npm test && npm run e2e"
  },
  "dependencies": {
    "phaser": "4.2.1",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@types/node": "24.19.1",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.1.2",
    "electron": "44.6.0",
    "playwright": "1.63.0",
    "typescript": "7.0.2",
    "vite": "8.3.3",
    "vitest": "5.0.3"
  }
}
```

- `"main": "electron/main.ts"`: the file Electron runs first, renamed.
- `"typecheck": "tsc && tsc -p electron"` runs both type checks. `&&` runs the second only if the first passed, as in lesson 0.7's `start`.
- `"@types/node": "24.19.1"` was added by `npm install`.

```check
run "npm run typecheck" label="both type checks pass"
run "npm run e2e" timeout=180 exit=1 stdout="1 failed | 12 passed" label="the app starts from main.ts: the old tests pass, and the new one still fails"
```

- 12 end-to-end tests pass, so the app starts and works with its main process in TypeScript: Electron stripped the types.
- The new test still fails, as it should: nothing reads the folder yet.

## Commit, on the branch

```powershell
git add .
git commit -m "The main process in TypeScript; the example project; a failing test for opening a project folder"
```

```check
git-branch project-folders
git-clean
```

- This commit is on `project-folders`. `main` is still the commit from lesson 6.1, where everything passes.
- `git log --oneline main..project-folders` lists the commits on the branch that `main` doesn't have: this one.

## Challenge: a branch you throw away

**Optional, ★.** Branches are cheap, so they're also for trying things. Make a branch from here, `git switch -c try-deleting`, delete `example/scenes/main.json`, commit, and run `npm start`. What does the studio show? Then switch back with `git switch project-folders`: the file is back. Delete the experiment with `git branch -D try-deleting` (capital `D`: delete even though it was never merged).

```hints
nudge: git switch changes your files to match the branch's last commit, so the deleted file comes back when you switch away.
concept: npm start runs vite build first, and the build stops with an error: the ?raw import names a file that isn't there. The scene is baked in from that file, so without it there's no studio to start.
```
