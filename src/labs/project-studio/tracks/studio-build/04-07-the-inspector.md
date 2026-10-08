---
title: 4.7 — The Inspector
track: Build Your Own Game Studio
runtime: none
concepts: data-driven-ui, forms, draft-state, keys-reset-state, colour-formats
problem: Select a node, see its properties, change one, and the game changes, the change is logged as code, and Undo takes it back. How is that built from the registry, and how do you stop typing "100" from becoming three changes?
---

The **inspector** is the panel that shows the selected node's properties and lets you change them. Every engine has one. This lesson builds it from the registry (lesson 4.6): for each property of the selected node's type, one field of the right kind.

Every change the inspector makes goes through the store, as a command (Sprint 3). So an inspector edit can be undone, and appears in the log as the line of code that does the same thing: `scene.setProp("level/player", "position", { x: 100, y: 225 });`. The editor teaches its own API as you click.

## The story's acceptance test

Sprint 4's third story: *see and change the selected node's properties*. Its acceptance test first, as in lessons 4.4 and 4.5. Change `e2e/editor.test.ts`:

```ts file=e2e/editor.test.ts
import { expect, test } from 'vitest';
import { _electron as electron } from 'playwright';

test('the editor shows its panels, with the game drawn in the centre one', async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const page = await app.firstWindow();
    await expect.poll(() => page.locator('.centre #game canvas').count()).toBe(1);
    expect(await page.textContent('.left h2')).toBe('Scene');
    expect(await page.textContent('.right h2')).toBe('Inspector');
  } finally {
    await app.close();
  }
}, 30000);

test('clicking a node in the scene tree selects it', async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const page = await app.firstWindow();
    await expect.poll(() => page.locator('[data-path="level/player"]').count()).toBe(1);
    await page.click('[data-path="level/player"]');
    await expect.poll(() => page.getAttribute('[data-path="level/player"]', 'class')).toBe('selected');
    expect(await page.getAttribute('[data-path="level/wall"]', 'class')).toBe('');
  } finally {
    await app.close();
  }
}, 30000);

test('changing a property in the inspector changes the game, is logged as code, and can be undone', async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const page = await app.firstWindow();
    await page.click('[data-path="level/player"]');
    await expect.poll(() => page.locator('#prop-position-x').count()).toBe(1);
    await page.fill('#prop-position-x', '100');
    await page.press('#prop-position-x', 'Enter');
    await expect.poll(() => page.textContent('#player-x')).toBe('100');
    expect(await page.inputValue('#prop-position-x')).toBe('100');
    expect(await page.textContent('#log')).toBe('scene.setProp("level/player", "position", { x: 100, y: 225 });');
    await page.click('#undo');
    await expect.poll(() => page.textContent('#player-x')).toBe('400');
    expect(await page.inputValue('#prop-position-x')).toBe('400');
  } finally {
    await app.close();
  }
}, 30000);
```

- The new test is the whole story in one go: select the player in the tree, type 100 in the x box, press Enter.
- `expect.poll(…count()).toBe(1)` before typing: as in lesson 4.5, the test first checks the box is there, so that it fails at once, and says why, while there's no inspector.
- Then the player's x in the game must become 100, the box must show 100, and the log must hold the line of code. `page.inputValue` reads what an input holds.
- Then Undo: the player goes back to 400, and so does the box.

```check
run "npm run e2e" exit=1 stderr="expected +0 to be 1" label="the acceptance test fails: there is no inspector yet"
```

## Colours as text: a test

A colour picker, `<input type="color">`, gives and takes colours as text: `#ffd700`, the **hex** form CSS uses (lesson 3.7). The scene stores a colour as a number, `16766720`. The inspector needs to turn one into the other, both ways. Create `src/editor/color.test.ts`:

```ts file=src/editor/color.test.ts
import { expect, test } from 'vitest';
import { toHex } from './color';

test('a colour number is written as #rrggbb, with every digit', () => {
  expect(toHex(0x4fc3f7)).toBe('#4fc3f7');
});
```

- `toHex(0x4fc3f7)` must give `'#4fc3f7'`: `#`, then two hex digits each for red, green and blue.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './color'"
```

## toHex

Create `src/editor/color.ts`:

```ts file=src/editor/color.ts
export function toHex(color: number): string {
  return '#' + color.toString(16);
}
```

- `color.toString(16)` writes a number in **base 16** (hexadecimal) instead of base 10: `(255).toString(16)` is `'ff'`.
- `'#' + …` puts the `#` in front.
- That's all the test asks for, and it passes. But is it right? One example can't tell you.

```check
run "npx vitest run src" stdout="95 passed"
```

## A second example

Add a second example to the same test in `src/editor/color.test.ts`:

```ts file=src/editor/color.test.ts
import { expect, test } from 'vitest';
import { toHex } from './color';

test('a colour number is written as #rrggbb, with every digit', () => {
  expect(toHex(0x4fc3f7)).toBe('#4fc3f7');
  expect(toHex(255)).toBe('#0000ff');
});
```

- `toHex(255)` is pure blue: red and green are zero. It must still be six digits, `'#0000ff'`; the colour picker rejects `'#ff'`.
- Choosing a second example that the simple code would get wrong, to force the general code, is called **triangulation**: as a surveyor fixes a point from two directions. A colour with a zero at the front is also an edge case: `toString` writes no leading zeros.

```check
run "npx vitest run src" exit=1 stderr="expected '#ff' to be '#0000ff'"
```

## Six digits, always

Change `src/editor/color.ts`:

```ts file=src/editor/color.ts
export function toHex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}
```

- `.padStart(6, '0')` adds `'0'`s at the start of a string until it's 6 characters long: `'ff'` becomes `'0000ff'`. A string that's already 6 long is left as it is, so the first example still passes.

```check
run "npx vitest run src" stdout="95 passed"
```

## Reading a colour back: a test

Add a test to `src/editor/color.test.ts`:

```ts file=src/editor/color.test.ts
import { expect, test } from 'vitest';
import { fromHex, toHex } from './color';

test('a colour number is written as #rrggbb, with every digit', () => {
  expect(toHex(0x4fc3f7)).toBe('#4fc3f7');
  expect(toHex(255)).toBe('#0000ff');
});

test('#rrggbb is read back as the same number', () => {
  expect(fromHex('#ffd700')).toBe(16766720);
  expect(fromHex(toHex(9807270))).toBe(9807270);
});
```

- `fromHex` goes back, from text to a number.
- The last line is a **round trip**: a number turned into text and back must be the same number. A round trip tests two functions against each other, without working out the answer by hand.

```check
run "npx vitest run src" exit=1 stderr="fromHex is not a function"
```

## fromHex

Change `src/editor/color.ts`:

```ts file=src/editor/color.ts
export function toHex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

export function fromHex(hex: string): number {
  return parseInt(hex.slice(1), 16);
}
```

- `hex.slice(1)` is the text from position 1 to the end, without the `#` (`slice`, lesson 3.2).
- `parseInt(text, 16)` reads text as a whole number in base 16: `parseInt('ffd700', 16)` is `16766720`. The second argument is the base; without it, `parseInt` reads base 10.

```check
run "npx vitest run src" stdout="96 passed"
```

## setProp in the store: a test

The console changes the scene by running code. The inspector knows exactly which property to set, so the store gets a method for it. Change `src/editor/store.test.ts`:

```ts file=src/editor/store.test.ts
import { expect, test } from 'vitest';
import type { SceneData } from '../engine/scene';
import { findNode } from './scene-api';
import { EditorStore } from './store';

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

function refuseColor2(data: SceneData): void {
  if (findNode(data, 'level/wall').props.color === 2) throw new Error('2 is not a colour');
}

test('a line of code changes the scene, is logged, and tells every listener', () => {
  const store = new EditorStore(scene(), refuseColor2);
  let calls = 0;
  store.subscribe(() => calls++);
  store.run('scene.setProp("level/wall", "color", 1);');
  expect(findNode(store.scene, 'level/wall').props.color).toBe(1);
  expect(store.history.code).toEqual(['scene.setProp("level/wall", "color", 1);']);
  expect(calls).toBe(1);
});

test('a line that fails changes nothing, and the problem says why', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.run('scene.setProp("level/truck", "color", 1);');
  expect(store.problem).toBe('There is no node at "level/truck"');
  expect(store.history.code).toEqual([]);
});

test('a change the check refuses is undone, with the reason', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.run('scene.setProp("level/wall", "color", 2);');
  expect(store.problem).toBe('That change was undone: 2 is not a colour');
  expect(findNode(store.scene, 'level/wall').props.color).toBe(9807270);
  expect(store.history.code).toEqual([]);
});

test('a line that fails part way keeps its earlier changes, and they are checked too', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.run('scene.setProp("level/wall", "color", 1); scene.deleteNode("level/truck");');
  expect(store.problem).toBe('There is no node at "level/truck"');
  expect(store.history.code).toEqual(['scene.setProp("level/wall", "color", 1);']);
  store.run('scene.setProp("level/wall", "color", 2); scene.deleteNode("level/truck");');
  expect(store.problem).toBe('That change was undone: 2 is not a colour');
  expect(findNode(store.scene, 'level/wall').props.color).toBe(1);
});

test('undo and redo, and a message when there is nothing to do', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.undo();
  expect(store.problem).toBe('Nothing to undo');
  store.run('scene.setProp("level/wall", "color", 1);');
  expect(store.problem).toBe('');
  store.undo();
  expect(findNode(store.scene, 'level/wall').props.color).toBe(9807270);
  store.redo();
  expect(findNode(store.scene, 'level/wall').props.color).toBe(1);
});

test('selecting a node tells listeners; a listener that unsubscribes hears nothing more', () => {
  const store = new EditorStore(scene(), refuseColor2);
  let calls = 0;
  const unsubscribe = store.subscribe(() => calls++);
  store.select('level/car');
  expect(store.selected).toBe('level/car');
  unsubscribe();
  store.select(null);
  expect(calls).toBe(1);
});

test('a selected node that stops existing is no longer selected', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.select('level/car');
  store.run('scene.deleteNode("level/car");');
  expect(store.selected).toBe(null);
  store.undo();
  expect(store.selected).toBe(null);
});

test('setProp changes one property through a command, logged as the code that does the same', () => {
  const store = new EditorStore(scene(), refuseColor2);
  store.setProp('level/car', 'position', { x: 10, y: 20 });
  expect(findNode(store.scene, 'level/car').props.position).toEqual({ x: 10, y: 20 });
  expect(store.history.code).toEqual(['scene.setProp("level/car", "position", { x: 10, y: 20 });']);
  store.setProp('level/wall', 'color', 2);
  expect(store.problem).toBe('That change was undone: 2 is not a colour');
});
```

- The new last test calls `store.setProp(path, key, value)`, like the Scene API's `setProp`, and checks the scene, and that the log holds the same line of code the console would have run.
- Then it sets a colour the check refuses: an inspector edit must be undone with a reason, like a console line.

```check
run "npx vitest run src" exit=1 stderr="store.setProp is not a function"
```

## store.setProp

Change `src/editor/store.ts`:

```ts file=src/editor/store.ts
import type { PropValue, SceneData } from '../engine/scene';
import { History } from './history';
import { findNode } from './scene-api';
import { runCode, sceneScript, type SceneScript } from './script';

export type Check = (scene: SceneData) => void;

export class EditorStore {
  readonly history = new History();
  readonly script: SceneScript;
  problem = '';
  selected: string | null = null;
  private version = 0;
  private readonly listeners = new Set<() => void>();

  constructor(
    readonly scene: SceneData,
    private readonly check: Check,
  ) {
    this.script = sceneScript(scene, this.history);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = (): number => this.version;

  run(code: string): void {
    this.change(() => runCode(code, this.script));
  }

  setProp(path: string, key: string, value: PropValue): void {
    this.change(() => this.script.setProp(path, key, value));
  }

  undo(): void {
    this.change(() => {
      if (!this.history.undo()) this.problem = 'Nothing to undo';
    });
  }

  redo(): void {
    this.change(() => {
      if (!this.history.redo()) this.problem = 'Nothing to redo';
    });
  }

  select(path: string | null): void {
    this.selected = path;
    this.changed();
  }

  private change(action: () => void): void {
    this.problem = '';
    try {
      action();
    } catch (error) {
      this.problem = (error as Error).message;
    }
    this.checkOrUndo();
    if (this.selected !== null && !this.exists(this.selected)) this.selected = null;
    this.changed();
  }

  private checkOrUndo(): void {
    try {
      this.check(this.scene);
    } catch (error) {
      this.history.undo();
      this.check(this.scene);
      this.problem = `That change was undone: ${(error as Error).message}`;
    }
  }

  private exists(path: string): boolean {
    try {
      findNode(this.scene, path);
      return true;
    } catch {
      return false;
    }
  }

  private changed(): void {
    this.version++;
    for (const listener of this.listeners) listener();
  }
}
```

- `setProp` runs `this.script.setProp(…)` through `change`: the same `scene` facade the console's code calls (lesson 3.6). So the inspector and the console make exactly the same command, with the same label, line of code and undo.
- Because it goes through `change`, it gets everything a change gets: the check, the undo of a refused change, the problem message, and the listeners.
- `PropValue` is now imported, for `value`'s type.

```check
run "npx vitest run src" stdout="97 passed"
run "npx tsc"
```

## The inspector's test

Create `src/ui/Inspector.test.tsx`:

```tsx file=src/ui/Inspector.test.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import type { SceneData } from '../engine/scene';
import { ENGINE_TYPES } from '../engine/registry';
import { EditorStore } from '../editor/store';
import { Inspector } from './Inspector';

function store(): EditorStore {
  const scene: SceneData = {
    formatVersion: 1,
    root: {
      type: 'Node',
      name: 'level',
      props: {},
      children: [{ type: 'Box', name: 'wall', props: { position: { x: 400, y: 60 }, color: 9807270 }, children: [] }],
    },
  };
  return new EditorStore(scene, () => {});
}

test('with nothing selected, the inspector says what to do', () => {
  expect(renderToStaticMarkup(<Inspector store={store()} types={ENGINE_TYPES} />)).toBe(
    '<p>Select a node in the scene tree.</p>',
  );
});
```

- `types={ENGINE_TYPES}`: the inspector is given the registry as a prop, so a test can give it the engine's alone, and the app the engine's and the game's.
- With nothing selected, it says what to do.

```check
run "npx vitest run src" exit=1 stderr="Cannot find module './Inspector'"
```

## An empty inspector

Create `src/ui/Inspector.tsx`:

```tsx file=src/ui/Inspector.tsx
import type { EditorStore } from '../editor/store';
import type { TypeDef } from '../engine/registry';
import { useStore } from './useStore';

export function Inspector({ store, types }: { store: EditorStore; types: ReadonlyMap<string, TypeDef> }) {
  useStore(store);
  return <p>Select a node in the scene tree.</p>;
}
```

- `Inspector` takes the store and the registry (`types`), reads the store with `useStore`, and, for now, always says what to do. `types` isn't used yet; the test passes it because the next test needs it.

```check
run "npx vitest run src" stdout="98 passed"
run "npx tsc"
```

## The selected node's properties: a test

Add a test to `src/ui/Inspector.test.tsx`:

```tsx file=src/ui/Inspector.test.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import type { SceneData } from '../engine/scene';
import { ENGINE_TYPES } from '../engine/registry';
import { EditorStore } from '../editor/store';
import { Inspector } from './Inspector';

function store(): EditorStore {
  const scene: SceneData = {
    formatVersion: 1,
    root: {
      type: 'Node',
      name: 'level',
      props: {},
      children: [{ type: 'Box', name: 'wall', props: { position: { x: 400, y: 60 }, color: 9807270 }, children: [] }],
    },
  };
  return new EditorStore(scene, () => {});
}

test('with nothing selected, the inspector says what to do', () => {
  expect(renderToStaticMarkup(<Inspector store={store()} types={ENGINE_TYPES} />)).toBe(
    '<p>Select a node in the scene tree.</p>',
  );
});

test("the selected node's properties are shown, from the scene or else the defaults", () => {
  const s = store();
  s.select('level/wall');
  const html = renderToStaticMarkup(<Inspector store={s} types={ENGINE_TYPES} />);
  expect(html).toContain('<p>wall <small>Box</small></p>');
  expect(html).toContain('<input id="prop-position-x" type="number" value="400"/>');
  expect(html).toContain('<input id="prop-position-y" type="number" value="60"/>');
  expect(html).toContain('<input id="prop-size-x" type="number" value="32"/>');
  expect(html).toContain('<input id="prop-color" type="color" value="#95a5a6"/>');
});
```

- With the wall selected: its name and type, then a field for each property of a `Box`, in `propsOf`'s order. A vector is two number boxes, `-x` and `-y`; a colour is a colour picker.
- `position` and `color` are the file's values. `size` isn't in the file, so its fields show the default, 32.
- `value="#95a5a6"` is the wall's colour, `9807270`, in hex.
- `<input … />`: React writes an element that can't have contents, like `<input>`, as one tag ending in `/>`.
- Each check uses `toContain` for one field, not the whole HTML (lesson 4.1): the test says which fields must be there with which values, and leaves the rest of the markup free to change.

```check
run "npx vitest run src" exit=1 stderr="the selected node's properties are shown"
```

## The Inspector component

Change `src/ui/Inspector.tsx`:

```tsx file=src/ui/Inspector.tsx
import { useState } from 'react';
import { fromHex, toHex } from '../editor/color';
import { findNode } from '../editor/scene-api';
import type { EditorStore } from '../editor/store';
import { propsOf, propValue, type PropDef, type TypeDef } from '../engine/registry';
import type { PropValue } from '../engine/scene';
import { useStore } from './useStore';

export function Inspector({ store, types }: { store: EditorStore; types: ReadonlyMap<string, TypeDef> }) {
  useStore(store);
  const path = store.selected;
  if (path === null) return <p>Select a node in the scene tree.</p>;
  const node = findNode(store.scene, path);
  return (
    <div>
      <p>
        {node.name} <small>{node.type}</small>
      </p>
      {propsOf(types, node.type).map((prop) => (
        <PropField
          key={`${path}.${prop.name}`}
          prop={prop}
          value={propValue(node, prop)}
          onChange={(value) => store.setProp(path, prop.name, value)}
        />
      ))}
    </div>
  );
}

function PropField({ prop, value, onChange }: { prop: PropDef; value: PropValue; onChange: (value: PropValue) => void }) {
  const id = `prop-${prop.name}`;
  if (typeof value === 'object') {
    return (
      <div className="field">
        <span>{prop.name}</span>
        <NumberInput id={`${id}-x`} value={value.x} onChange={(x) => onChange({ x, y: value.y })} />
        <NumberInput id={`${id}-y`} value={value.y} onChange={(y) => onChange({ x: value.x, y })} />
      </div>
    );
  }
  return (
    <div className="field">
      <label htmlFor={id}>{prop.name}</label>
      {prop.kind === 'color' ? (
        <Draft key={value} id={id} type="color" text={toHex(value)} onCommit={(text) => onChange(fromHex(text))} />
      ) : (
        <NumberInput id={id} value={value} onChange={onChange} />
      )}
    </div>
  );
}

function NumberInput({ id, value, onChange }: { id: string; value: number; onChange: (value: number) => void }) {
  return (
    <Draft
      key={value}
      id={id}
      type="number"
      text={String(value)}
      onCommit={(text) => {
        const number = Number(text);
        if (text.trim() !== '' && Number.isFinite(number)) onChange(number);
      }}
    />
  );
}

function Draft({ id, type, text, onCommit }: { id: string; type: string; text: string; onCommit: (text: string) => void }) {
  const [draft, setDraft] = useState(text);

  function commit(): void {
    if (draft !== text) onCommit(draft);
    setDraft(text);
  }

  return (
    <input
      id={id}
      type={type}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit();
      }}
    />
  );
}
```

There are four components here, from the outside in.

**`Inspector`** draws the whole panel:

- With no selection, it still returns the message. Otherwise it draws the node. A component can return different JSX in different cases, like any function.
- `findNode(store.scene, path)` gets the selected node's data. The store makes sure a selected node exists (lesson 4.2).
- `propsOf(types, node.type).map(…)` makes one `PropField` per property, with the value from `propValue`: the file's value or the default.
- Each field's `key` is the node's path and the property's name, so selecting another node gives every field a new key. That matters for drafts, below.
- `onChange={(value) => store.setProp(path, prop.name, value)}`: each field is given a function to call with a new value. The field doesn't know about the store or the scene; it only knows its value and whom to tell.

**`PropField`** picks the control for one property:

- `typeof value === 'object'` means a vector (lesson 2.3's test): two `NumberInput`s. Changing x calls `onChange({ x, y: value.y })`: a **new** vector with the new x and the old y. `{ x, … }` is shorthand for `{ x: x, … }`.
- A vector has two boxes, so its name is a `<span>` (a piece of text with no meaning of its own), not a label for one of them.
- Otherwise the value is a number: a colour picker if the registry says `color`, a number box if not.
- `<label htmlFor={id}>` is the property's name, joined to the input with that `id`. Clicking a label puts the cursor in its input, and screen readers read the label with the input. In JSX it's `htmlFor`, not `for`, because `for` is a TypeScript keyword, as `class` was.
- `id` is `prop-` and the property's name, so tests can find each field, and the label its input.

**`NumberInput`** turns a number box's text into a number:

- `Number(text)` (lesson 0.2) reads the text as a number. `text.trim() !== ''` rejects an empty box, which `Number` would read as 0. `Number.isFinite(number)` is `true` only for an ordinary number: not `NaN` (what `Number('abc')` gives) and not infinity.
- Only a real number is passed on; anything else is ignored, and the box goes back to the value it had.

**`Draft`** is the input itself, and the answer to "typing 100 must be one change":

- React's `onChange` fires on every key typed (lesson 4.3). If each one made a change to the scene, typing `100` would make three changes, `1`, `10` and `100`: three lines in the log and three Undos to take it back. And on the way to `-5` the box holds `-`, which isn't a number at all.
- So the input keeps a **draft**: `useState(text)`, the text being typed, which is the component's own state (lesson 4.3), and touches nothing else.
- The draft is **committed**, passed on as a change, when you press Enter (`onKeyDown`, with `event.key === 'Enter'`) or leave the box (`onBlur`: an element is **blurred** when it loses the keyboard's focus, by a click elsewhere or Tab).
- `commit()` passes the draft on only if it's different from the value, so leaving a box you didn't change makes no change. Then it sets the draft back to `text`, the value the box was given.
- The colour picker uses the same `Draft`: picking a colour updates the swatch, and the change is made when you press Enter or click away. Without that, dragging around the colour picker would make a change for every colour you passed.

**Why `key={value}` on each `Draft`.** `useState(text)` uses `text` only the first time the component is drawn; later draws keep the state. So when the value changes for any other reason (your own Enter, an Undo, the console), the draft would still hold the old text. A `key` fixes it: when a component's key changes, React throws the old one away and makes a new one, whose state starts again from the new `text`. A new value is a new key, so the box always starts from the current value.

```predict
question: Take key={value} off the Draft in NumberInput. You select the player, type 100 in the x box and press Enter. The player moves to x = 100. What does the x box show?
choice: 100
choice: 400
choice: 1
answer: 400
explain: commit() passes 100 on, then sets the draft back to text, which in that call is still the old value, '400'. The store changes and React draws the field again with text '100', but useState only used text the first time, so the draft stays '400'. The box disagrees with the game. With key={value}, the new value makes a new Draft, which starts from '100'.
```

```check
run "npx vitest run src" stdout="99 passed"
run "npx tsc"
```

## The inspector in its panel

Change `src/ui/App.tsx`:

```tsx file=src/ui/App.tsx
import type { EditorStore } from '../editor/store';
import type { Game } from '../engine/game';
import type { TypeDef } from '../engine/registry';
import { Console } from './Console';
import { GameView } from './GameView';
import { Inspector } from './Inspector';
import { SceneTree } from './SceneTree';
import { Title } from './Title';

export function App(props: {
  store: EditorStore;
  game: Game;
  readout: () => string;
  types: ReadonlyMap<string, TypeDef>;
}) {
  const { store, game, readout, types } = props;
  return (
    <div className="editor">
      <header className="top">
        <Title name="Studio" />
      </header>
      <aside className="left panel">
        <h2>Scene</h2>
        <SceneTree store={store} />
      </aside>
      <div className="centre">
        <GameView game={game} readout={readout} />
      </div>
      <aside className="right panel">
        <h2>Inspector</h2>
        <Inspector store={store} types={types} />
      </aside>
      <div className="bottom">
        <Console store={store} />
      </div>
    </div>
  );
}
```

- `App` gets a fourth prop, `types`, and passes it to `Inspector`, which goes under the Inspector heading.
- With four props, the parameter is written as one object, `props`, typed over several lines, and destructured on the first line of the function. It's the same as destructuring in the parameter list; it's only easier to read when the props don't fit on one line.

```check
run "npx tsc" exit=1 stdout="Property 'types' is missing"
```

- The check expects `tsc` to **fail**, because `main.tsx` doesn't pass `types` yet. TypeScript names the missing prop. The next step passes it.

## The game's registry

Change `src/main.tsx`:

```tsx file=src/main.tsx
import { createRoot } from 'react-dom/client';
import mainScene from '../scenes/main.json?raw';
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

- `types` is the game's registry: a copy of the engine's, with the player added. It's made the same way, and in the same place, as `makers`, so the two stay side by side.
- `types={types}` passes it to `App`.

```check
run "npx tsc"
run "npx vite build" stdout="built in"
```

## Fields in rows

Change `src/style.css`:

```css file=src/style.css
body {
  font-family: system-ui, sans-serif;
  margin: 0;
}

.editor {
  display: grid;
  grid-template-columns: 240px 1fr 300px;
  grid-template-rows: auto auto 1fr;
  grid-template-areas:
    'top top top'
    'left centre right'
    'left bottom right';
  gap: 8px;
  height: 100vh;
  padding: 8px;
  box-sizing: border-box;
}

.top {
  grid-area: top;
}

.left {
  grid-area: left;
}

.centre {
  grid-area: centre;
}

.right {
  grid-area: right;
}

.bottom {
  grid-area: bottom;
  overflow: auto;
}

.panel {
  border: 1px solid #ccc;
  padding: 8px;
  overflow: auto;
}

h1,
h2 {
  margin: 0;
}

h2 {
  font-size: 14px;
}

.tree,
.tree ul {
  list-style: none;
  margin: 0;
  padding-left: 16px;
}

.tree button {
  border: none;
  background: none;
  padding: 2px 4px;
  font: inherit;
  cursor: pointer;
}

.tree button.selected {
  background: #cfe3ff;
}

.tree small {
  color: #777;
}

.field {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 4px;
}

.field label,
.field span {
  width: 64px;
}

.field input[type='number'] {
  width: 72px;
}

#problem {
  color: #c0392b;
}

#code {
  width: 600px;
  font-family: monospace;
}

#log {
  font-family: monospace;
}
```

- `.field` is one property's row. `display: flex` makes it a **flex box**: its children are laid out in a line, side by side, instead of one under another.
- `gap: 4px` puts 4 pixels between them, and `align-items: center` lines them up through their middles, so a label sits level with its box.
- `margin-bottom: 4px` puts a little space under each row.
- `.field label, .field span` gives every property name the same width, 64 pixels, so the boxes line up in a column.
- `.field input[type='number']` is an attribute selector (lesson 4.5) for number inputs only: they're 72 pixels wide, enough for a coordinate. The colour picker keeps its own size.

Run `npm start`. Select the wall, make it 300 wide, and change its colour; select the player and move it. Watch the log write the code for each change, and take them back with Ctrl+Z (click somewhere outside a box first).

```check
contains src/style.css "display: flex;"
contains src/style.css ".field input[type='number'] {"
run "npm run e2e" stdout="7 passed" label="the acceptance test passes: an inspector edit changes the game, is logged, and can be undone"
```

## Commit, and tick the third story

You can see and change the selected node's properties without typing code: tick the last Sprint 4 story in `BACKLOG.md`, then:

```powershell
git add .
git commit -m "The inspector: fields from the registry, drafts committed as commands"
```

```check
run "npm run check"
contains BACKLOG.md "- [x] As a game maker, I want to see and change the selected node's properties"
git-clean
git-tracked src/ui/Inspector.tsx
```

## Challenge: dragging a number

**Optional, ★★★.** In many editors you can drag a number field's label left or right to change the value. Make the x label draggable: on `onPointerDown`, remember where the pointer was; on `pointermove` (listened for on `window`), show the value plus the distance moved; on `pointerup`, commit **one** change. How do you make sure a whole drag is one undo step?

```hints
nudge: While dragging, keep the moving value in component state; only call onChange once, at the end.
concept: Same idea as the draft: a value that changes many times while you work is committed once.
shape: const [drag, setDrag] = useState<{ startX: number; startValue: number } | null>(null); and on pointerup: onChange(drag.startValue + (event.clientX - drag.startX));
```
