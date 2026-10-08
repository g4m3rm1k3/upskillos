---
title: 3.5 — Each Change as a Line of Code
track: Build Your Own Game Studio
runtime: none
concepts: code-generation, escaping, derived-state, type-driven-refactoring
problem: A game maker who drags a wall in the editor should be able to see how to make the same change in a script, so the editor teaches the code as it's used. How can every change produce a line of code that does exactly the same thing, and stay right through undo and redo?
---

In UpSkillOS's Game Studio, every change you make with the mouse shows up as a line of code: drag the wall, and `scene.setProp("level/wall", "position", { x: 300, y: 60 });` appears in a log. Read the log and you learn the Scene API by using the editor. The log runs too: a script made of those lines makes the same scene. This is called **GUI → code**.

To get there, each command needs one more property: `code`, the line that makes its change. And the log must follow undo and redo: undo a change and its line disappears; redo it and the line comes back.

## Numbers and vectors as code: a test

A line of code needs each value written the way you'd type it: a string in quotes, a number as digits, a vector as `{ x: 1, y: 2 }`. Turning a value into source code that produces it is called writing a **literal** (lesson 2.1's object literals were values written in code). Create `src/editor/code.test.ts`:

```ts file=src/editor/code.test.ts
import { expect, test } from 'vitest';
import { lit } from './code';

test('lit writes values as code that produces exactly the same value', () => {
  expect(lit(16766720)).toBe('16766720');
  expect(lit(-2.5)).toBe('-2.5');
  expect(lit(0.1 + 0.2)).toBe('0.30000000000000004');
  expect(lit({ x: 1, y: -2.5 })).toBe('{ x: 1, y: -2.5 }');
});
```

- `0.1 + 0.2` is `0.30000000000000004` (lesson 1.1). A log that wrote `0.3` would replay to a *different* number. Each value must be written with every digit it needs to read back exactly.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './code'"
```

## lit

Create `src/editor/code.ts`:

```ts file=src/editor/code.ts
import type { PropValue } from '../engine/scene';

export function lit(value: PropValue | string): string {
  if (typeof value === 'object') return `{ x: ${lit(value.x)}, y: ${lit(value.y)} }`;
  return String(value);
}
```

- `PropValue | string`: a value the Scene API takes, either a prop's value (a number or a vector) or a string (a path, a key, a name). The test only asks about numbers and vectors yet, but the type says what's coming.
- A vector is the one object kind, so `typeof value === 'object'` picks it out, and TypeScript narrows `value` to `Vec2Data`. It's written as an object literal, with each part written by `lit` itself, recursively.
- `String(value)` turns a number into text: the shortest digits that read back as exactly the same number, so `0.30000000000000004` keeps every digit.

```check
run "npx vitest run src" stdout="71 passed"
run "npx tsc"
```

## Strings as code: a test

Paths and names are strings, and a string written as code needs quotes. Add a test to `src/editor/code.test.ts`:

```ts file=src/editor/code.test.ts
import { expect, test } from 'vitest';
import { lit } from './code';

test('lit writes values as code that produces exactly the same value', () => {
  expect(lit(16766720)).toBe('16766720');
  expect(lit(-2.5)).toBe('-2.5');
  expect(lit(0.1 + 0.2)).toBe('0.30000000000000004');
  expect(lit({ x: 1, y: -2.5 })).toBe('{ x: 1, y: -2.5 }');
});

test('strings are quoted, and quotes inside them are escaped', () => {
  expect(lit('level/wall')).toBe('"level/wall"');
  expect(lit('say "hi"')).toBe('"say \\"hi\\""');
});
```

- `'"say \\"hi\\""'` in the test: inside a TypeScript string, `\\` is one backslash. So the expected text is `"say \"hi\""`: a quoted string in which each inner quote is escaped (lesson 3.2). Without the escapes, the string would end at the first inner quote and the line wouldn't run.

```check
run "npx vitest run src" exit=1 stderr="expected 'level/wall' to be '\"level/wall\"'"
```

`String` gives the text itself, with no quotes: as code, `level/wall` is `level` divided by `wall`.

## Quotes

Change `src/editor/code.ts`:

```ts file=src/editor/code.ts
import type { PropValue } from '../engine/scene';

export function lit(value: PropValue | string): string {
  if (typeof value === 'object') return `{ x: ${lit(value.x)}, y: ${lit(value.y)} }`;
  if (typeof value === 'string') return JSON.stringify(value);
  return String(value);
}
```

- `JSON.stringify` of a string gives it in double quotes, with every special character inside escaped: `"say \"hi\""`. JSON was designed as a subset of JavaScript's literal syntax, so JSON text for a string is also valid code.

```check
run "npx vitest run src" stdout="72 passed"
run "npx tsc"
```

## Refactor: one way to write a literal

Green, so look at the code. Strings go through `JSON.stringify`, numbers through `String`. What does `JSON.stringify` do to a number? Exactly what `String` does: the shortest digits that read back as the same number. So the two lines can be one. Change `src/editor/code.ts`:

```ts file=src/editor/code.ts
import type { PropValue } from '../engine/scene';

export function lit(value: PropValue | string): string {
  if (typeof value === 'object') return `{ x: ${lit(value.x)}, y: ${lit(value.y)} }`;
  return JSON.stringify(value);
}
```

- Numbers and strings both go through `JSON.stringify` now. One rule instead of two: anything that isn't a vector is written as JSON writes it.
- Is it really the same for every number? The tests say so for the cases that matter: a big whole number, a negative fraction, and a fraction with every digit. That's what the tests are for: a change like this is safe to make because they'd fail if it weren't.

```check
run "npx vitest run src" stdout="72 passed" label="the same tests pass with one rule for literals"
run "npx tsc"
```

## The log follows undo: a test

Now commands get a `code` line, and `History` gets the log. Change `src/editor/history.test.ts`: `logged` gives its commands a line of code, and a new test checks the log:

```ts file=src/editor/history.test.ts
import { expect, test } from 'vitest';
import { History, type Command } from './history';

function logged(log: string[], name: string): Command {
  return {
    label: name,
    code: `${name}();`,
    run: () => log.push(`run ${name}`),
    undo: () => log.push(`undo ${name}`),
  };
}

test('undo takes back the newest change first; redo makes it again', () => {
  const log: string[] = [];
  const history = new History();
  history.run(logged(log, 'a'));
  history.run(logged(log, 'b'));
  history.undo();
  history.undo();
  history.redo();
  expect(log).toEqual(['run a', 'run b', 'undo b', 'undo a', 'run a']);
});

test('undo and redo with nothing to do report false', () => {
  const history = new History();
  expect(history.undo()).toBe(false);
  expect(history.redo()).toBe(false);
});

test('a new change after an undo throws away what could have been redone', () => {
  const log: string[] = [];
  const history = new History();
  history.run(logged(log, 'a'));
  history.undo();
  history.run(logged(log, 'b'));
  expect(history.redo()).toBe(false);
});

test('the code log is the code of every change done, in order; undo takes its line out, redo puts it back', () => {
  const history = new History();
  history.run(logged([], 'a'));
  history.run(logged([], 'b'));
  expect(history.code).toEqual(['a();', 'b();']);
  history.undo();
  expect(history.code).toEqual(['a();']);
  history.redo();
  expect(history.code).toEqual(['a();', 'b();']);
});
```

- `logged([], 'a')`: the last test doesn't look at what's run, so it passes a new empty array it never reads.

```check
run "npx vitest run src" exit=1 stderr="expected undefined to deeply equal [ 'a();', 'b();' ]"
```

## The log is the done stack

```ts file=src/editor/history.ts
export interface Command {
  label: string;
  code: string;
  run(): void;
  undo(): void;
}

export class History {
  private readonly done: Command[] = [];
  private readonly undone: Command[] = [];

  get code(): string[] {
    return this.done.map((command) => command.code);
  }

  run(command: Command): void {
    command.run();
    this.done.push(command);
    this.undone.length = 0;
  }

  undo(): boolean {
    const command = this.done.pop();
    if (!command) return false;
    command.undo();
    this.undone.push(command);
    return true;
  }

  redo(): boolean {
    const command = this.undone.pop();
    if (!command) return false;
    command.run();
    this.done.push(command);
    return true;
  }
}
```

- `Command` gains `code: string`, the line that makes the command's change.
- `get code()` is a getter (lesson 1.3) that works the log out from the `done` stack each time it's read: the code of every command done, oldest first.
- The log isn't stored anywhere. It's **derived** from the stack, so it can't disagree with it: undo pops a command off `done`, and its line is gone from the next read of `code`. A separately stored log would need its own undo and redo handling, and one day someone would forget it.

```check
run "npx vitest run src" stdout="73 passed"
run "npx tsc" exit=1 stdout="Property 'code' is missing" label="tsc points at every command that has no code yet"
```

Run `npx tsc`:

```text
src/editor/commands.ts(8,3): error TS2741: Property 'code' is missing in type '{ label: string; run: () => void; undo: () => void; }' but required in type 'Command'.
```

- Adding a required field to an interface makes every object that claims to be that type an error until it has the field. The type checker lists the places the change affects, so none can be forgotten. Changing a type and following the errors is a common, safe way to make a change that touches many files.
- The tests still pass, because Vitest strips types without checking them (lesson 0.4). That's why `npm run check` runs both.

## Commands with code: tests

Each command's line calls the Scene API through an object named `scene`, as a game maker's script will (lesson 3.6). Change `src/editor/commands.test.ts`. The half-way test passes a line of code to `snapshotCommand` now, and a new test checks the lines:

```ts file=src/editor/commands.test.ts
import { expect, test } from 'vitest';
import type { SceneData } from '../engine/scene';
import { deleteNodeCommand, renameNodeCommand, setPropCommand, snapshotCommand } from './commands';
import { History } from './history';
import { findNode, renameNode, setProp } from './scene-api';

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

test('a setProp command can be undone and redone', () => {
  const data = scene();
  const history = new History();
  history.run(setPropCommand(data, 'level/wall', 'color', 16766720));
  history.run(setPropCommand(data, 'level/car', 'position', { x: 1, y: 2 }));
  history.undo();
  expect(findNode(data, 'level/car').props).toStrictEqual({});
  history.undo();
  expect(findNode(data, 'level/wall').props.color).toBe(9807270);
  history.redo();
  expect(findNode(data, 'level/wall').props.color).toBe(16766720);
});

test('undoing a delete puts the node back where it was', () => {
  const data = scene();
  const history = new History();
  history.run(deleteNodeCommand(data, 'level/wall'));
  expect(data.root.children.map((c) => c.name)).toEqual(['car']);
  history.undo();
  expect(data.root.children.map((c) => c.name)).toEqual(['wall', 'car']);
});

test('a rename is undone and redone the same way as everything else', () => {
  const data = scene();
  const history = new History();
  history.run(renameNodeCommand(data, 'level/car', 'truck'));
  history.undo();
  expect(findNode(data, 'level/car').name).toBe('car');
  history.redo();
  expect(findNode(data, 'level/truck').name).toBe('truck');
});

test('a change that fails half way leaves the scene as it was, and is not recorded', () => {
  const data = scene();
  const history = new History();
  const twoChanges = snapshotCommand(data, 'Recolour and rename', '// two changes', (s) => {
    setProp(s, 'level/wall', 'color', 1);
    renameNode(s, 'level/car', 'wall');
  });
  expect(() => history.run(twoChanges)).toThrow('"level" already has a child called "wall"');
  expect(findNode(data, 'level/wall').props.color).toBe(9807270);
  expect(history.undo()).toBe(false);
});

test('each command carries the line of code that makes the same change', () => {
  const data = scene();
  const history = new History();
  history.run(setPropCommand(data, 'level/car', 'position', { x: 1, y: 2 }));
  history.run(renameNodeCommand(data, 'level/car', 'truck'));
  history.run(deleteNodeCommand(data, 'level/wall'));
  expect(history.code).toEqual([
    'scene.setProp("level/car", "position", { x: 1, y: 2 });',
    'scene.renameNode("level/car", "truck");',
    'scene.deleteNode("level/wall");',
  ]);
});
```

- `'// two changes'` is a **comment**: in JavaScript, `//` and everything after it on the line is ignored when the code runs. It's here as the code line of a test-only command that has no single API call.

```check
run "npx vitest run src" exit=1 stderr="each command carries the line of code that makes the same change"
```

## Commands with code

```ts file=src/editor/commands.ts
import type { PropValue, SceneData } from '../engine/scene';
import { lit } from './code';
import type { Command } from './history';
import { deleteNode, renameNode, setProp } from './scene-api';

export function snapshotCommand(
  scene: SceneData,
  label: string,
  code: string,
  edit: (scene: SceneData) => void,
): Command {
  let before = '';
  let after = '';
  return {
    label,
    code,
    run: () => {
      if (after !== '') {
        scene.root = JSON.parse(after);
        return;
      }
      before = JSON.stringify(scene.root);
      try {
        edit(scene);
      } catch (error) {
        scene.root = JSON.parse(before);
        throw error;
      }
      after = JSON.stringify(scene.root);
    },
    undo: () => {
      scene.root = JSON.parse(before);
    },
  };
}

export function setPropCommand(scene: SceneData, path: string, key: string, value: PropValue): Command {
  return snapshotCommand(
    scene,
    `Set ${key} of ${path}`,
    `scene.setProp(${lit(path)}, ${lit(key)}, ${lit(value)});`,
    (s) => setProp(s, path, key, value),
  );
}

export function deleteNodeCommand(scene: SceneData, path: string): Command {
  return snapshotCommand(scene, `Delete ${path}`, `scene.deleteNode(${lit(path)});`, (s) => deleteNode(s, path));
}

export function renameNodeCommand(scene: SceneData, path: string, newName: string): Command {
  return snapshotCommand(
    scene,
    `Rename ${path} to ${newName}`,
    `scene.renameNode(${lit(path)}, ${lit(newName)});`,
    (s) => renameNode(s, path, newName),
  );
}
```

- `snapshotCommand` takes the line as a new parameter, `code`, and puts it on the command (shorthand property again).
- The parameter list is now too long for one line, so it's written one parameter per line. A comma after the last one (a **trailing comma**) is allowed, and means adding a parameter later changes only one line.
- Each command builds its line with a template literal and `lit`: `scene.setProp("level/car", "position", { x: 1, y: 2 });`. The line names the same function, with the same arguments, as the `edit` function beside it. That's the promise the next lesson tests: running the line makes the same change.
- `npx tsc` is clean again: every `Command` has its `code`.

```check
run "npx vitest run src" stdout="74 passed"
run "npx tsc" label="every command has its code now"
```

## Commit

```powershell
git add .
git commit -m "Each command carries its line of code; the history's log follows undo and redo"
```

```check
git-clean
git-tracked src/editor/code.ts
```

## Challenge: a label from the code

**Optional, ★.** Labels like *Set color of level/wall* are what an Edit menu shows: *Undo Set color of level/wall*. Add a `label` getter to `History`, named `undoLabel`, that gives the label of the change Undo would take back, or `null` if there's none. Test first.

```hints
nudge: The change Undo takes back is the last one in done.
concept: The last item of an array is at index length − 1; arrays also have at(-1), which counts from the end.
shape: get undoLabel(): string | null { return this.done.at(-1)?.label ?? null; } — ?? gives the right-hand value when the left is null or undefined.
```
