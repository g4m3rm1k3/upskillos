---
title: 3.6 — Running the Code: Scripts and Replay
track: Build Your Own Game Studio
runtime: none
concepts: new-function, facades, replay-testing, trust
problem: The log says scene.setProp("level/car", "position", { x: 1, y: 2 }). For that to be more than a description, there must be a scene object it can run against, and running the whole log must make exactly the scene the editor made. How do you run code that arrives as text, and how do you prove the log is right?
---

Two things finish GUI → code:

- **Running a line**: an object called `scene`, whose methods make changes through the same commands the editor uses. A change made by code is then undoable and logged like any other. GUI and code become two doors into one room.
- **Proving the log**: make some changes, take the log, run it against a fresh copy of the original scene, and check the result is identical. If that ever fails, the log is lying about what the editor did.

## Scripts: tests

Create `src/editor/script.test.ts`:

```ts file=src/editor/script.test.ts
import { expect, test } from 'vitest';
import type { SceneData } from '../engine/scene';
import { deleteNodeCommand, renameNodeCommand, setPropCommand } from './commands';
import { History } from './history';
import { findNode } from './scene-api';
import { runCode, sceneScript } from './script';

function scene(): SceneData {
  return {
    formatVersion: 1,
    root: {
      type: 'Node',
      name: 'level',
      props: {},
      children: [
        { type: 'Box', name: 'wall', props: { color: 9807270 }, children: [] },
        { type: 'Box', name: 'car', props: {}, children: [] },
      ],
    },
  };
}

test('code runs through the same commands, so it can be undone', () => {
  const data = scene();
  const history = new History();
  runCode('scene.setProp("level/wall", "color", 1);', sceneScript(data, history));
  expect(findNode(data, 'level/wall').props.color).toBe(1);
  history.undo();
  expect(findNode(data, 'level/wall').props.color).toBe(9807270);
});

test('replaying the log on the original scene makes exactly the same scene', () => {
  const edited = scene();
  const history = new History();
  history.run(setPropCommand(edited, 'level/car', 'position', { x: 0.1 + 0.2, y: -40 }));
  history.run(renameNodeCommand(edited, 'level/car', 'truck'));
  history.run(deleteNodeCommand(edited, 'level/wall'));

  const replayed = scene();
  runCode(history.code.join('\n'), sceneScript(replayed, new History()));
  expect(JSON.stringify(replayed)).toBe(JSON.stringify(edited));
});

test('code that is not valid JavaScript is a SyntaxError, and changes nothing', () => {
  const data = scene();
  expect(() => runCode('scene.setProp(', sceneScript(data, new History()))).toThrow(SyntaxError);
  expect(data).toEqual(scene());
});
```

- The replay test makes changes the way the editor will, with commands, then runs `history.code`, the log, against a fresh `scene()`.
- `history.code.join('\n')` joins the lines into one string, with `'\n'` (a **newline** character, the end of a line) between them: a script of three lines.
- It compares the two scenes as JSON text with `toBe`, character for character. That's stricter than `toEqual`: the order of children and of keys must match too.
- The position's x is `0.1 + 0.2`, the awkward number from lesson 3.5. If `lit` lost a digit, this test would catch it.
- `toThrow(SyntaxError)` passes if what's thrown is a `SyntaxError`, the kind of error JavaScript gives for code it can't read.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './script'"
```

## The scene object, and runCode

Create `src/editor/script.ts`:

```ts file=src/editor/script.ts
import type { PropValue, SceneData } from '../engine/scene';
import { deleteNodeCommand, renameNodeCommand, setPropCommand } from './commands';
import type { History } from './history';

export interface SceneScript {
  setProp(path: string, key: string, value: PropValue): void;
  deleteNode(path: string): void;
  renameNode(path: string, newName: string): void;
}

export function sceneScript(scene: SceneData, history: History): SceneScript {
  return {
    setProp: (path, key, value) => history.run(setPropCommand(scene, path, key, value)),
    deleteNode: (path) => history.run(deleteNodeCommand(scene, path)),
    renameNode: (path, newName) => history.run(renameNodeCommand(scene, path, newName)),
  };
}

export function runCode(code: string, script: SceneScript): void {
  const run = new Function('scene', code);
  run(script);
}
```

- `SceneScript` is the shape of the `scene` object that code sees: the Scene API's functions, without the `scene` data argument, because the object already knows which scene it changes.
- `sceneScript(scene, history)` makes that object. Each method makes the matching command and runs it through the history, exactly as the editor's buttons will. So a line of code is recorded, undoable and logged.
- An object that offers a simpler set of functions in front of more complicated machinery is called a **facade**. Code calls `scene.setProp(…)` and never sees commands, snapshots or histories.
- `new Function('scene', code)` builds a real function **from text**: a function with one parameter named `scene`, whose body is the text in `code`. If the text isn't valid JavaScript, this line throws a `SyntaxError` before anything has run, so nothing is changed.
- `run(script)` calls it, with `script` as its `scene`. Inside the code, `scene.setProp(…)` calls the facade's method.
- Turning text into running code is powerful and dangerous. The text can do anything JavaScript in that window can do, not just call `scene`'s methods. Here the code is typed by the game maker, into their own studio, so it's trusted. Code from anyone else, such as a game downloaded from the internet, must never run this way. Sprint 7 runs games' scripts in a **sandbox**, a separate page that can't touch the studio.

```check
run "npx vitest run src" stdout="71 passed"
run "npx tsc"
```

## Commit

```powershell
git add .
git commit -m "Scripts: a scene facade over the commands, runCode, and a replay test for the log"
```

```check
git-clean
git-tracked src/editor/script.ts
```

## Challenge: addNode in scripts

**Optional, ★★.** The Scene API has `addNode`, but there's no command or script method for it. Add `addNodeCommand` (with its code line: the node's data written with `JSON.stringify`, which is valid JavaScript for plain data) and `scene.addNode(parentPath, node)`. Extend the replay test with an added node.

```hints
nudge: The pattern is the other three commands: a label, a line of code, and an edit that calls the Scene API.
concept: The replay test is the safety net: if the code line and the edit don't match, the replayed scene differs and the test says so.
shape: snapshotCommand(scene, `Add ${node.name} to ${parentPath}`, `scene.addNode(${lit(parentPath)}, ${JSON.stringify(node)});`, (s) => addNode(s, parentPath, node))
```
